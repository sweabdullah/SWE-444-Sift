import { isOfficialSourceUrl, normalizeSourceUrl, type Locale } from "@sift/schema";
import { formatDate } from "@/lib/format";
import { getTranslator } from "@/lib/i18n";

/** Stored provenance only. Never infer a date from publication, fetching, or today's clock. */
export function CardProvenance({
  sourceUrl,
  registeredSiteUrls,
  verifiedAt,
  locale,
}: {
  sourceUrl: string;
  registeredSiteUrls: readonly string[];
  verifiedAt: Date | null;
  locale: Locale;
}) {
  const t = getTranslator(locale);
  const normalized = normalizeSourceUrl(sourceUrl);
  const validDate = verifiedAt !== null && Number.isFinite(verifiedAt.getTime());
  return (
    <dl className="flex min-w-0 flex-col gap-3 text-label text-start">
      <div>
        <dt className="text-platinum-deep">{t("provenance.source")}</dt>
        <dd className="mt-1">
          {normalized && isOfficialSourceUrl(normalized, registeredSiteUrls) ? (
            <a href={normalized} className="underline underline-offset-4 [overflow-wrap:anywhere]">
              <bdi dir="ltr">{normalized}</bdi>
            </a>
          ) : (
            t("provenance.sourceUnavailable")
          )}
        </dd>
      </div>
      <div>
        <dt className="text-platinum-deep">{t("provenance.verified")}</dt>
        <dd className="mt-1">
          {validDate ? (
            <time dateTime={verifiedAt.toISOString()}>{formatDate(verifiedAt, locale)}</time>
          ) : (
            t("provenance.dateUnavailable")
          )}
        </dd>
      </div>
    </dl>
  );
}
