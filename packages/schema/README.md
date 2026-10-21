# @sift/schema — the shared contracts

Every lane codes against the shapes in this package and the typed data-access functions in
[`@sift/db`](../db/src/index.ts). They are defined once so the web app, the ingestion worker and
the database cannot disagree.

| Contract                                                                                                  | File                                       | Owner (evolves it)         | Lanes that must review a change |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------- | ------------------------------- |
| Enums (`CARD_STATUSES`, `REWARD_TYPES`, …) — mirror the Prisma enums                                      | `src/enums.ts` + `db/prisma/schema.prisma` | A                          | A, B, C, D, E                   |
| Domain read models (`Bank`, `Card`, `CardTranslation`, `Fees`, `RewardTier`, `Source`, `CardView`)        | `src/domain.ts`                            | A                          | A, B, C, D                      |
| `Shortlist`, `ShortlistItem`                                                                              | `src/domain.ts`                            | C                          | A, B, C                         |
| `PendingRequest`, `ValidationIssue`, `CrawlRun`, `CardChange`                                             | `src/domain.ts`                            | D (queue), E (run, change) | A, C, D, E                      |
| `CardFilters` (reward types, fee range, income, Sharia, search, sort, locale, pagination)                 | `src/filters.ts`                           | D                          | A, B, D                         |
| Extraction (`ExtractedCard`, `WithdrawalPayload`) — what the AI extractor outputs and what S-45 validates | `src/extraction.ts`                        | D                          | A, C, D, E                      |
| Data access: `listPublishedCards`, `getCard`, `getCardsForComparison`, `listBanks`                        | `db/src/catalogue.ts`                      | B (D for filters)          | A, B, D                         |
| Data access: `getShortlist`, `addToShortlist`, `removeFromShortlist`                                      | `db/src/shortlist.ts`                      | C                          | A, B, C                         |
| Data access: `listPendingRequests`, `getPendingRequest`, `listCardChanges`                                | `db/src/admin.ts`                          | C, D, E                    | A, C, D, E                      |
| Data access: `recordCrawlRun`, `finishCrawlRun`, `createPendingRequest`                                   | `db/src/ingest.ts`                         | E, D                       | A, D, E                         |

Lane A owns the package as a whole and reviews every change. The JSDoc on each data-access
function names the lane that owns its evolution.

## Contract rules

1. **A change to a shared contract is its own small PR.** Do not bury a contract change inside a
   feature PR. Title it `SFT-<n>: Contract — <what changed>`, keep it to the contract (and the
   minimum call-site fixes needed for `pnpm check` to pass), and request review from **every lane
   listed for that contract** in the table above. Merge only when each of them has approved.
2. **Semver-ish.** The packages are private (`0.0.0`, workspace-linked), so there is no published
   version, but think in semver when you describe the PR:
   - _Additive_ (new optional field, new function, new enum value): say so in the PR; consumers
     keep compiling. A new enum value still needs a Prisma migration in the same PR, and every
     `switch` over that enum gets reviewed.
   - _Breaking_ (rename, removal, a field becoming required or changing type, a changed
     signature): say **BREAKING** in the PR title, list every call site you changed, and give the
     owners of untouched branches a heads-up in the team channel.
3. **Null is not zero.** A figure the bank has not published is `null`. `0` means the bank
   published "free" / zero. Never default one to the other, never use `?? 0` on a fee, rate,
   income or cap, and never coerce an unparseable value to `0` — reject it.
4. **Enums have one source.** Each enum is a `const` array plus a `z.enum` built from it, and it
   must equal the Prisma enum. `@sift/db` checks this at build time (`src/enum-guard.ts`) and in a
   test (`test/enums.test.ts`), so changing only one side fails CI.
5. **Public reads filter `status = published` in the query**, never in the UI. Any new public
   function in `@sift/db/catalogue.ts` must AND in `PUBLISHED_ONLY`.
6. **Extraction output is strict.** Unknown keys are rejected, every key is required (absent =
   `null`), every published figure carries its `sourceUrl`, and Arabic text goes in the `ar` slot
   without being translated.

## Using it

```ts
import { CardFiltersSchema, ExtractedCardSchema, type CardView } from "@sift/schema";
import { listPublishedCards } from "@sift/db";

const page = await listPublishedCards(CardFiltersSchema.parse(searchParams));
```

Tests: `pnpm --filter @sift/schema test` (pure, no database).
