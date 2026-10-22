# Schema notes

The database schema lives in [`prisma/schema.prisma`](prisma/schema.prisma); migrations are in [`prisma/migrations`](prisma/migrations). This file explains the rules behind it. Update it in the same pull request whenever the data shape changes (Definition of Done, item 8).

Prisma models are PascalCase (`CardTranslation`); Postgres tables and columns are snake_case (`card_translation.fee_waiver_condition`). Every table maps with `@@map` / `@map`, so raw SQL and the Prisma client both read naturally.

## Four rules

1. **NULL is not zero.** A figure the bank has not published is `NULL`. `0` means the bank published "free" / "zero". Figure columns (fees, income, caps, Sharia flag) are nullable and have **no default**, so nothing can silently become `0` or `false`. The UI must show `NULL` as "not published", never as "free".
2. **Never inferred.** `card.sharia_compliant` is set only when the bank states it. `NULL` = unknown, `false` = the bank says it isn't.
3. **Prose once per language.** Card and reward prose lives in a `*_translation` table with a `locale` (`ar` | `en`) and a unique `(parent_id, locale)` pair. The `card` and `reward_tier` tables hold only language-neutral facts. One exception: a bank's name is a short, fixed pair stored as two columns, `bank.name_ar` and `bank.name_en`, not in a translation table.
4. **Filterable values are enums.** Anything a visitor can filter or sort by is a Postgres enum or a typed numeric column, never free text. Enum labels are translated once in the UI.

## Card identity

A card is identified by **`(bank_id, canonical_url)`** — unique constraint on `card`. When a bank moves a page, the pipeline falls back to **`(bank_id, normalised_name)`** (indexed, not unique) to recognise the same card (S-47). `normalised_name` is the English name lower-cased with punctuation and whitespace collapsed; the normalising function belongs to the pipeline, not the database.

## Tables

| Table                     | What it holds                                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bank`                    | A bank: `slug`, `name_ar`, `name_en`, `homepage_url`, `active`.                                                                                                                                                                                                                                                                                        |
| `bank_entry_url`          | The bank's registered official URLs (S-28). The crawler starts only from these. Unique `(bank_id, url)`.                                                                                                                                                                                                                                               |
| `source`                  | One fetched official document: `url`, `source_type` (`html` \| `pdf`), `fetched_at`, optional `content_hash` (for the deferred S-49 pre-check).                                                                                                                                                                                                        |
| `card`                    | Language-neutral card facts: bank, identity (`canonical_url`, `normalised_name`), `status`, `reward_type`, `network`, `sharia_compliant`, `min_monthly_income` (SAR / month), the official `source_id`, `verified_at`, and absence tracking (`consecutive_absences`, `last_seen_at`).                                                                  |
| `fee`                     | One row per card (`card_id` is the primary key) with the six numeric fee fields — see below.                                                                                                                                                                                                                                                           |
| `card_translation`        | Per locale: `name`, `benefits_description`, `reward_conditions`, `eligibility`, `fee_waiver_condition`.                                                                                                                                                                                                                                                |
| `card_field_source`       | Which `source` each individual figure came from, so a PDF-only figure can be marked. `field_name` is a dotted path, e.g. `fee.annual_fee`, `card.sharia_compliant`, `reward_tier.0.rate`, `card_translation.ar.eligibility`. A figure without a row here falls back to `card.source_id`.                                                               |
| `reward_tier`             | One row per tier (never a JSON blob): `reward_type`, `spending_category`, `rate` + `rate_unit`, `cap` + `cap_period`, `min_spend`, `sort_order`. Unique `(card_id, sort_order)` keeps tier order deterministic. `rate` is `DECIMAL(10,4)`, so `1.5` and `1.50` are equal.                                                                              |
| `reward_tier_translation` | The prose `condition` that unlocks a tier, per locale.                                                                                                                                                                                                                                                                                                 |
| `user`                    | Auth.js user plus Sift fields: `password_hash` (email + password, S-21), `role` (`user` \| `admin`, default `user`), `locale` preference, `digest_opt_in` (default `false`), `unsubscribe_token` (unique, for one-click unsubscribe, S-55). Visitors have no row.                                                                                      |
| `account`                 | Auth.js OAuth accounts (adapter-shaped).                                                                                                                                                                                                                                                                                                               |
| `session`                 | Auth.js database sessions.                                                                                                                                                                                                                                                                                                                             |
| `verification_token`      | Auth.js email-verification tokens (S-53).                                                                                                                                                                                                                                                                                                              |
| `shortlist`               | A user's saved cards. Unique `(user_id, card_id)`.                                                                                                                                                                                                                                                                                                     |
| `crawl_run`               | One crawl of one bank: `trigger`, `status`, timings, `pages_fetched`, `cards_found`, `error` (S-29). `aborted_guard` = the run-level collapse guard stopped it (S-51).                                                                                                                                                                                 |
| `pending_request`         | Everything the pipeline proposes, held out of the catalogue until an admin decides (S-30, S-32, S-37, S-46): `kind`, `status`, `bank_id`, optional `card_id` / `crawl_run_id`, `source_id`, the extracted draft in `payload` (JSON, shape owned by `@sift/schema`), `validation_errors`, and the review (`reviewed_by`, `reviewed_at`, `review_note`). |
| `card_change`             | Field-level diff written on approval (S-50): `field_name` (same dotted path as `card_field_source`), `locale` for prose fields, `old_value`, `new_value` (JSON), `approved_at`. The daily digest (S-54) sends rows where `notified_at IS NULL`, then stamps them — notifications fire on approval, not on detection.                                   |

`payload` and `card_change.old_value / new_value` are the only JSON columns. They hold drafts and audit history, never anything the catalogue filters on.

## The seven fee fields

| #   | Field              | Where                                   | Type / unit          |
| --- | ------------------ | --------------------------------------- | -------------------- |
| 1   | Annual fee         | `fee.annual_fee`                        | `DECIMAL(12,2)`, SAR |
| 2   | Issuance fee       | `fee.issuance_fee`                      | `DECIMAL(12,2)`, SAR |
| 3   | Supplementary card | `fee.supplementary_card_fee`            | `DECIMAL(12,2)`, SAR |
| 4   | FX markup          | `fee.fx_markup_pct`                     | `DECIMAL(6,3)`, %    |
| 5   | Cash advance       | `fee.cash_advance_fee`                  | `DECIMAL(12,2)`, SAR |
| 6   | Late payment       | `fee.late_payment_fee`                  | `DECIMAL(12,2)`, SAR |
| 7   | Annual-fee waiver  | `card_translation.fee_waiver_condition` | text, per locale     |

Each is its own nullable column with no default. The waiver condition is prose, so rule 3 puts it in `card_translation`. Fees live in their own `fee` table because the plan names it as one of the core tables. Filter on them from the card with a relation filter, backed by an index on `fee.annual_fee`:

```ts
prisma.card.findMany({ where: { status: "published", fee: { annualFee: { lte: 0 } } } });
```

**"Unknown fee" has two shapes.** A fee is unpublished if the card has no `fee` row at all, or if it has a `fee` row whose column is `NULL`. A query for unknown fees must match both, e.g. `OR: [{ fee: null }, { fee: { annualFee: null } }]`. To keep this simple, **always create the `fee` row together with the card** (in the seed and in the approval code), even when every amount is `NULL`; then "unknown" is always just `NULL`.

Money is `Decimal`, never `Float`. In TypeScript the client returns `Prisma.Decimal`; convert at the edge, not in storage.

## Enums

| Enum                     | Values                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `locale`                 | `ar`, `en`                                                                                                                                                                                        |
| `card_status`            | `draft`, `published`, `archived` — public queries must filter `status = published` in the query itself                                                                                            |
| `reward_type`            | `cashback`, `points`, `miles`, `none`                                                                                                                                                             |
| `card_network`           | `visa`, `mastercard`, `amex`, `mada`, `unionpay` (nullable on `card`)                                                                                                                             |
| `spending_category`      | `general` (all purchases), `dining`, `groceries`, `fuel`, `travel`, `airlines`, `hotels`, `online`, `international`, `entertainment`, `shopping`, `utilities`, `education`, `healthcare`, `other` |
| `rate_unit`              | `percent`, `points_per_sar`, `miles_per_sar`                                                                                                                                                      |
| `cap_period`             | `per_transaction`, `monthly`, `quarterly`, `yearly`                                                                                                                                               |
| `source_type`            | `html`, `pdf`                                                                                                                                                                                     |
| `user_role`              | `user`, `admin`                                                                                                                                                                                   |
| `pending_request_kind`   | `new_card`, `field_change`, `withdrawal`                                                                                                                                                          |
| `pending_request_status` | `pending`, `approved`, `rejected`, `failed_validation`                                                                                                                                            |
| `crawl_run_status`       | `running`, `succeeded`, `failed`, `aborted_guard`                                                                                                                                                 |
| `crawl_trigger`          | `manual`, `scheduled`                                                                                                                                                                             |

The plan names reward type and spending category as enums but does not list their values; the values above are a first cut. Adding a value is a one-line migration (`ALTER TYPE ... ADD VALUE`); removing one is not, so add carefully.

## Withdrawal (three consecutive absences)

Each crawl run that does not find a published card increments `card.consecutive_absences`; finding it resets the counter to `0` and sets `last_seen_at`. When the counter reaches **3**, the pipeline opens a `pending_request` with `kind = withdrawal`. The card stays published until an admin approves; approval sets `status = archived` and `archived_at` (S-36, S-51). A run stopped by the collapse guard (`aborted_guard`) must not touch the counters.

## Indexes for the catalogue filters

`card`: `status`, `(status, reward_type)`, `(status, bank_id)`, `(status, sharia_compliant)`, `(status, min_monthly_income)`, `network`, plus the identity indexes. `fee`: `annual_fee`. `reward_tier`: `(spending_category, rate)` and `(reward_type, rate)` for "sort by reward rate".

## Working with the schema

```bash
cp packages/db/.env.example packages/db/.env   # then set DATABASE_URL
pnpm db:deploy                                 # apply existing migrations (prisma migrate deploy) — use this to set up a database
pnpm db:generate                               # regenerate the client (pnpm build does this too)
pnpm db:studio                                 # browse the data
pnpm db:seed                                   # load the dev seed (wipes the database; see SEED.md)

# Only when you change schema.prisma:
pnpm db:migrate --name <change>                # prisma migrate dev: creates a new migration and applies it;
                                               # it may ask to reset the database if it detects drift
```

Never edit a migration that has been merged; add a new one.
