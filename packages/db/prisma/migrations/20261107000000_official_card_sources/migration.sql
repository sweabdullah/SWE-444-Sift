-- Unapplied SFT-21 migration. No existing data/dates are rewritten or invented.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
LOCK TABLE "bank", "bank_entry_url", "source", "card" IN SHARE ROW EXCLUSIVE MODE;

-- Persisted URLs use ASCII DNS authorities and encoded paths. The application uses
-- WHATWG URL normalization first; IDN/A-label authorities are deliberately unsupported.
CREATE FUNCTION public.sift_http_origin(candidate text) RETURNS text
LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE
SET search_path = pg_catalog, public AS $$
DECLARE parts text[]; authority text[]; host text; port integer;
BEGIN
  IF candidate ~ '[^!-~]' OR strpos(candidate, chr(92)) > 0
     OR candidate ~ '%(?![[:xdigit:]]{2})' THEN RETURN NULL; END IF;
  parts := regexp_match(candidate, '^(https?)://([^/?#]+)([/?#].*)?$', 'i');
  IF parts IS NULL THEN RETURN NULL; END IF;
  authority := regexp_match(parts[2], '^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?)(?::([0-9]{1,5}))?$', 'i');
  IF authority IS NULL THEN RETURN NULL; END IF;
  host := lower(authority[1]);
  IF length(host) > 253 OR host ~ '(^|\.)xn--' THEN RETURN NULL; END IF;
  port := authority[2]::integer;
  IF port IS NOT NULL AND port NOT BETWEEN 1 AND 65535 THEN RETURN NULL; END IF;
  RETURN lower(parts[1]) || '://' || host || CASE
    WHEN port IS NULL OR (lower(parts[1]) = 'http' AND port = 80)
      OR (lower(parts[1]) = 'https' AND port = 443) THEN ''
    ELSE ':' || port::text END;
END;
$$;

-- Private coordination state, not bank authority. Source writers need no bank UPDATE.
CREATE TABLE public.bank_source_guard (
  bank_id text PRIMARY KEY REFERENCES public.bank(id) ON DELETE CASCADE ON UPDATE CASCADE,
  revision bigint NOT NULL DEFAULT 0
);
REVOKE ALL ON public.bank_source_guard FROM PUBLIC;

CREATE FUNCTION public.sift_source_write_lock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE old_bank text; new_bank text; target text;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_bank := OLD.bank_id; END IF;
  IF TG_OP <> 'DELETE' THEN new_bank := NEW.bank_id; END IF;
  FOR target IN SELECT DISTINCT v FROM unnest(ARRAY[old_bank, new_bank]) AS ids(v)
    WHERE v IS NOT NULL ORDER BY v LOOP
    INSERT INTO public.bank_source_guard(bank_id) SELECT id FROM public.bank WHERE id = target
      ON CONFLICT (bank_id) DO UPDATE SET revision = bank_source_guard.revision + 1;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sift_source_write_lock() FROM PUBLIC;

CREATE FUNCTION public.sift_assert_published_sources(target text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.card c JOIN public.source s ON s.id = c.source_id
    WHERE c.bank_id = target AND c.status = 'published' AND (
      s.bank_id <> c.bank_id OR c.verified_at IS NULL OR NOT isfinite(c.verified_at)
      OR public.sift_http_origin(s.url) IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.bank_entry_url e WHERE e.bank_id = c.bank_id
        AND public.sift_http_origin(e.url) = public.sift_http_origin(s.url)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Published cards require a same-bank registered HTTP(S) source and a genuine verification date'
      USING ERRCODE = '23514', CONSTRAINT = 'published_card_provenance';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.sift_assert_published_sources(text) FROM PUBLIC;

CREATE FUNCTION public.sift_check_published_sources() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN PERFORM public.sift_assert_published_sources(OLD.bank_id); END IF;
  IF TG_OP <> 'DELETE' THEN PERFORM public.sift_assert_published_sources(NEW.bank_id); END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.sift_check_published_sources() FROM PUBLIC;

CREATE TRIGGER card_source_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.card
  FOR EACH ROW EXECUTE FUNCTION public.sift_source_write_lock();
CREATE TRIGGER source_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.source
  FOR EACH ROW EXECUTE FUNCTION public.sift_source_write_lock();
CREATE TRIGGER registered_source_write_lock BEFORE INSERT OR UPDATE OR DELETE ON public.bank_entry_url
  FOR EACH ROW EXECUTE FUNCTION public.sift_source_write_lock();

-- Final-state validation permits draft edits, unpublish/edit, and atomic domain moves.
CREATE CONSTRAINT TRIGGER card_published_provenance AFTER INSERT OR UPDATE OR DELETE ON public.card
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sift_check_published_sources();
CREATE CONSTRAINT TRIGGER source_published_provenance AFTER INSERT OR UPDATE OR DELETE ON public.source
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sift_check_published_sources();
CREATE CONSTRAINT TRIGGER registered_published_provenance AFTER INSERT OR UPDATE OR DELETE ON public.bank_entry_url
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.sift_check_published_sources();

CREATE UNIQUE INDEX "source_id_bank_id_key" ON public.source(id, bank_id);
ALTER TABLE public.card ADD CONSTRAINT "card_source_id_bank_id_fkey"
  FOREIGN KEY (source_id, bank_id) REFERENCES public.source(id, bank_id)
  ON DELETE RESTRICT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE public.card DROP CONSTRAINT "card_source_id_fkey";

-- Invalid unpublished records remain available for correction; published ones abort.
DO $$ DECLARE target text;
BEGIN
  FOR target IN SELECT DISTINCT bank_id FROM public.card WHERE status = 'published' LOOP
    PERFORM public.sift_assert_published_sources(target);
  END LOOP;
END; $$;
COMMIT;
