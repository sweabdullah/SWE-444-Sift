# Development seed

`pnpm db:seed` loads a fixed data set that every lane builds against. The script is [`prisma/seed.ts`](prisma/seed.ts) and the records are in [`prisma/seed-data.ts`](prisma/seed-data.ts). Run `pnpm --filter @sift/db db:seed:check` afterwards to print the counts and check the contract below.

```bash
cp packages/db/.env.example packages/db/.env   # set DATABASE_URL to a local database
pnpm db:deploy                                 # apply migrations
pnpm db:seed                                   # safe to run again
pnpm --filter @sift/db db:seed:check
```

**It wipes the database.** The seed runs in one transaction that `TRUNCATE`s every Sift table and then inserts the records below, so running it twice gives the same rows. It refuses to run when `NODE_ENV=production`. All IDs are fixed, so tests and pages can refer to them.

## Where the figures come from

Every card figure was read from the bank's official page or fee schedule on **2026-10-21** (`card.verified_at`, `source.fetched_at`). Each published figure has a `card_field_source` row pointing at the document it came from (71 rows). A figure the bank does not state is `NULL`, never `0`, and nothing is inferred.

Not from a bank: the users, the crawl-run counters, the archived status of the archived card, and the **old** value (`250.00`) of the approved annual-fee change, which is **synthetic** (banks do not publish their previous fees).

## Banks

| ID              | Slug               | English                   | Arabic                                             | Homepage                        |
| --------------- | ------------------ | ------------------------- | -------------------------------------------------- | ------------------------------- |
| `bank_snb`      | `snb`              | Saudi National Bank (SNB) | البنك الأهلي السعودي                               | https://www.alahli.com/         |
| `bank_riyad`    | `riyad-bank`       | Riyad Bank                | بنك الرياض                                         | https://www.riyadbank.com/      |
| `bank_sab`      | `sab`              | Saudi Awwal Bank (SAB)    | البنك السعودي الأول                                | https://www.sab.com/            |
| `bank_enbd_ksa` | `emirates-nbd-ksa` | Emirates NBD KSA          | بنك الإمارات دبي الوطني - المملكة العربية السعودية | https://www.emiratesnbd.com.sa/ |

Each bank has two entry URLs (`<bank id>_entry_0` English and `_entry_1` Arabic credit-card listing pages).

## Cards

Fees are SAR; FX is %. `—` = `NULL` (not published). Cash-advance fees are `NULL` everywhere because every bank publishes them as "3%, up to SAR 75", which does not fit the flat-SAR column.

| ID                              | Status    | Card (EN)                                   | Reward   | Network    | Sharia | Min income | Annual | Issuance | Supp. | FX  | Late | Tiers |
| ------------------------------- | --------- | ------------------------------------------- | -------- | ---------- | ------ | ---------- | ------ | -------- | ----- | --- | ---- | ----- |
| `card_snb_cashback`             | published | AlAhli Cashback Credit Card                 | cashback | mastercard | —      | —          | **0**  | —        | 0     | 2   | —    | 3     |
| `card_snb_cashback_premium`     | published | AlAhli Cashback Premium Credit Card         | cashback | —          | —      | —          | 200    | —        | —     | 2   | —    | 6     |
| `card_snb_alfursan_platinum`    | published | Al Fursan Credit Card - Platinum            | miles    | visa       | —      | —          | 350    | —        | —     | 2   | —    | 1     |
| `card_riyad_cashback_signature` | published | Cashback Visa Signature Islamic Credit Card | cashback | visa       | true   | —          | 500    | —        | 0     | 2   | 50   | 15    |
| `card_riyad_titanium`           | published | Titanium Islamic Credit Card                | points   | mastercard | true   | —          | 290    | —        | 0     | 2   | 50   | 0     |
| `card_sab_cashback`             | published | SAB Visa Cashback Credit Card               | cashback | visa       | —      | —          | **0**  | **0**    | 0     | 2   | 50   | 11    |
| `card_sab_my_card`              | published | SAB Visa "My Card" Credit Card              | none     | visa       | true   | **0**      | **—**  | 50       | 0     | —   | —    | 0     |
| `card_enbd_infinite`            | published | Infinite Credit Card                        | points   | visa       | —      | 20,000     | 700    | —        | 0     | 2   | 50   | 1     |
| `card_snb_titanium_archived`    | archived  | AlAhli Credit Card - Titanium               | points   | mastercard | —      | —          | 400    | —        | 0     | 2   | —    | 0     |

Things to build against:

- **NULL vs 0**: `card_sab_my_card` has annual fee `NULL` (not published); `card_snb_cashback` and `card_sab_cashback` have annual fee `0` (free). `card_sab_my_card` has `min_monthly_income = 0` ("No minimum income required").
- **Tiered rewards**: `card_snb_cashback` (spend bands with `min_spend`), `card_snb_cashback_premium` (categories with monthly caps), `card_riyad_cashback_signature` (3 spend bands × 5 categories), `card_sab_cashback` (3 bands × 3 categories + domestic + international).
- **Sharia-compliant** (stated by the bank): `card_riyad_titanium` ("Shari'a compliant card"), `card_sab_my_card` ("Shariah compliant"), `card_riyad_cashback_signature` (product named "Islamic Credit Card").
- **Minimum income**: `card_enbd_infinite` (SAR 20,000).
- **Fee waiver prose** (7th fee field) is set on `card_snb_cashback`, `card_sab_cashback` and `card_enbd_infinite`.
- **Archived**: `card_snb_titanium_archived` must never appear in public queries.

### Source documents

| Source ID                      | Type | URL                                                                                                                |
| ------------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------ |
| `src_snb_cashback`             | html | https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-credit-card                          |
| `src_snb_cashback_premium`     | html | https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-premium-credit-card                  |
| `src_snb_alfursan_platinum`    | html | https://www.alahli.com/en/pages/personal-banking/credit-cards/alfursan-credit-card-platinum                        |
| `src_snb_titanium`             | html | https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-credit-card-titanium                          |
| `src_snb_fees_pdf`             | pdf  | https://www.alahli.com/-/jssmedia/project/snb/snb-web/documents/2026/banking-fees-and-charges-06-may-26.pdf?view=1 |
| `src_riyad_cashback_signature` | html | https://www.riyadbank.com/personal-banking/credit-cards/cashback-visa-signature                                    |
| `src_riyad_titanium`           | html | https://www.riyadbank.com/personal-banking/credit-cards/titanium-credit-card                                       |
| `src_sab_cashback`             | html | https://www.sab.com/en/personal/compare-credit-cards/cashback-visa-credit-card/                                    |
| `src_sab_cashback_fees`        | html | https://www.sab.com/en/personal/compare-credit-cards/cashback-visa-credit-card/fees-services/                      |
| `src_sab_my_card`              | html | https://www.sab.com/en/personal/compare-credit-cards/low-limit-credit-cards/sab-my-card-credit-card/               |
| `src_enbd_infinite`            | html | https://www.emiratesnbd.com.sa/en/cards/credit-cards/infinite-credit-card                                          |
| `src_enbd_fees`                | html | https://www.emiratesnbd.com.sa/en/cards/credit-cards-fees                                                          |
| `src_enbd_platinum`            | html | https://www.emiratesnbd.com.sa/en/cards/credit-cards/platinum-credit-card                                          |
| `src_enbd_mazeed`              | html | https://www.emiratesnbd.com.sa/en/cards/credit-cards/mazeed-platinum-credit-card                                   |

SNB fee figures read from the PDF (`src_snb_fees_pdf`) are marked in `card_field_source`, so the UI can flag them as PDF-only.

## Users (DEV-ONLY)

| ID                | Email              | Role  | Locale | Digest opt-in | Unsubscribe token        |
| ----------------- | ------------------ | ----- | ------ | ------------- | ------------------------ |
| `user_admin`      | `admin@sift.local` | admin | en     | false         | `seed-unsubscribe-admin` |
| `user_registered` | `user@sift.local`  | user  | ar     | true          | `seed-unsubscribe-user`  |

Both have `email_verified` set and the password **`sift-dev-password`**, stored as a bcrypt hash (cost 10, via `bcryptjs`). **This password is for local development only.** Never seed it into a shared or production database.

`user_registered` has shortlisted `card_riyad_titanium` and `card_sab_cashback`.

## Pipeline fixtures

| ID                                    | Kind         | Status            | Card                         | Notes                                                                                                      |
| ------------------------------------- | ------------ | ----------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pr_new_card_enbd_platinum`           | new_card     | pending           | —                            | Valid draft: a full extracted card (Emirates NBD Platinum, real figures) in `payload`. Crawl run below.    |
| `pr_failed_enbd_mazeed`               | new_card     | failed_validation | —                            | Annual fee extracted as `"SAR 299"`, Arabic translation missing; see `validation_errors`. Crawl run below. |
| `pr_field_change_riyad_titanium`      | field_change | approved          | `card_riyad_titanium`        | Reviewed by `user_admin` at 2026-10-20 10:00 UTC.                                                          |
| `pr_withdrawal_snb_alfursan_platinum` | withdrawal   | pending           | `card_snb_alfursan_platinum` | The card has `consecutive_absences = 3`, still published until approved.                                   |

- **Crawl run** `crawl_enbd_seed`: Emirates NBD KSA, manual, `succeeded`, 6 pages, 2 cards found; linked to the two `new_card` requests (a crawl run belongs to one bank, so the SNB and Riyad requests have no crawl run).
- **Card change** `change_riyad_titanium_annual_fee`: `fee.annual_fee` `"250.00"` → `"290.00"` (old value synthetic), `approved_at` 2026-10-20 10:00 UTC, `notified_at` `NULL`. The card is in `user_registered`'s shortlist and that user has opted in to the digest, so the daily digest (S-54) should pick it up.

The `payload` shape mirrors the database columns (`fees`, `translations.{ar,en}`, `rewardTiers`, `figureSources`). The authoritative shape is `@sift/schema`'s extraction schema; update `newCardPayload` in `seed-data.ts` when that lands.

## Figures left NULL

- Cash-advance fee on every card (published only as a percentage with a cap).
- Late-payment fee on the SNB cards (not in the fee schedule or card pages).
- Issuance fee on every card except SAB Cashback (`0`) and SAB My Card (`50`).
- Supplementary-card fee on SNB Cashback Premium and AlFursan Platinum (their blocks in the fee schedule don't list one).
- Network on SNB Cashback Premium (the page doesn't name it).
- Sharia flag on SNB, SAB Cashback and Emirates NBD cards (the pages don't say).
- Minimum income on every card except Emirates NBD Infinite and SAB My Card.
- SAB My Card annual fee and FX markup (only the one-time SAR 50 processing fee is published).
- Reward earn rate for Riyad Titanium (Hassad points) and SNB Titanium (Lak points), so those cards have no tier rows.

Caveats a reviewer should check:

- Emirates NBD's Infinite card page says the minimum income is **SAR 20,000**, but its credit-card listing page says **SAR 30,000**. The seed uses the card page.
- The SAB Cashback category caps are stated without a period. The seed uses `monthly` because the same table says amounts are per billing month.
- Emirates NBD KSA is the Saudi branch of a UAE bank, licensed by SAMA. It is included because it is the only bank checked that publishes a positive minimum income.
