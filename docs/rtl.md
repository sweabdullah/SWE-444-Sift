# Building for right-to-left (Arabic) and left-to-right (English)

Notes from K-6 ([SFT-25](https://linear.app/swe444sift/issue/SFT-25)). Sift is Arabic-first, so a component is only correct if it is correct in both directions. This page covers what to use, what goes wrong, and how to check. The examples are from this repository.

## 1. Direction comes from the page, not from the component

- `app/[locale]/layout.tsx` sets `<html lang dir>` from the locale (`directionOf` in `@sift/schema`). Every component inherits it.
- Never hard-code `dir="rtl"` on a component to make Arabic work. If you need it, the layout is wrong.
- Never pick styles with `locale === "ar" ? … : …`. Use logical properties, which follow `dir` on their own.

## 2. Logical properties, never left and right

| Instead of            | Use                       | Meaning                    |
| --------------------- | ------------------------- | -------------------------- |
| `ml-4` / `mr-4`       | `ms-4` / `me-4`           | margin at the start / end  |
| `pl-4` / `pr-4`       | `ps-4` / `pe-4`           | padding at the start / end |
| `left-0` / `right-0`  | `start-0` / `end-0`       | position                   |
| `text-left` / `right` | `text-start` / `text-end` | alignment                  |
| `rounded-l-md`        | `rounded-s-md`            | corners on the start side  |
| `border-l`            | `border-s`                | border on the start side   |

"Start" is the right edge in Arabic and the left edge in English. Flexbox and grid already follow `dir`, so `justify-between`, `gap-*` and `flex-row` need no changes.

`pnpm lint` enforces this: `scripts/check-logical.mjs` and the ESLint rule `sift/no-physical-classes` share one list of banned patterns (`scripts/logical-patterns.mjs`). One known gap: asymmetric shorthands such as `margin: 0 0 0 8px` still encode a side, so check those by eye.

## 3. Icons: some mirror, some never do

| Mirror in RTL                                          | Never mirror                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Arrows and chevrons for previous/next, back/forward    | The riyal symbol (`components/Riyal.tsx`), logos                    |
| Icons that show reading progress (e.g. a progress bar) | Checkmarks, clocks, media "play" (it shows time, not reading order) |
|                                                        | Anything with text or numbers inside it                             |

To mirror an icon, draw it for LTR and add `rtl:-scale-x-100`, as the chevrons in `components/CataloguePagination.tsx` do. In Tailwind v4 this sets the CSS `scale` property, not `transform`. "Previous" points toward the start of the line, which is on the right in Arabic.

## 4. Numbers and mixed Arabic/Latin text (the bidi traps)

The browser lays out text with the Unicode bidirectional algorithm. Digits and Latin words form left-to-right runs inside an Arabic line, and **neutral characters** (spaces, `%`, `-`, `–`, `/`, `·`) take the direction of whatever surrounds them. That is where things break:

- **A figure at the edge of a sentence can flip.** On the catalogue, "حتى 11% · الأساسية 0.7%" rendered the last figure as `%0.7`. The fix is to put each figure in its own `<bdi>`, which isolates it and lets it take its own direction. See `components/RewardRateValue.tsx`. When a figure sits inside a translated sentence, fill the placeholder with a node using `fillTemplate` (`lib/template.ts`), not a string.
- **Don't force `dir="ltr"` on a figure that has Arabic words in it.** `0.33 ميل / ريال` inside `dir="ltr"` reads backwards. `<bdi>` (direction auto) gets both "0.7%" and "0.33 ميل / ريال" right. Use `dir="ltr"` only when the content has no Arabic in it, for example the riyal amount in `<Riyal>` and the number inputs in `CatalogueFilters.tsx`.
- **Never join two numbers with a dash or slash in a message.** In Arabic, `{start}–{end}` with 1 and 6 renders as "6–1". Write it with words: "البطاقات {start} إلى {end} من {total}". `lib/i18n.test.ts` fails on any message that joins two placeholders with `-`, `–`, `—` or `/`.
- **Don't let a figure wrap in the middle.** Give each figure `whitespace-nowrap`, so a narrow screen breaks between figures, never inside one.
- **Digits are Western (0–9) in both languages.** Format every number through `lib/format.ts` (`ar-SA-u-nu-latn`). Never use `toLocaleString()`, which would give Arabic-Indic digits.

## 5. No English left in the Arabic UI

- Every string lives in `messages/ar.json` and `messages/en.json`. `lib/i18n.test.ts` checks they have the same keys, no empty strings and the same placeholders. A missing Arabic string fails the build: it is never replaced with English.
- The only Latin text on an Arabic page is the language switch label "English". That is deliberate: it is the name of the other language, marked `lang="en"`.
- Card and bank names come from the database in each language. A card with no Arabic name is left out of the Arabic list (`toCardList`), never shown in English.

## 6. How to check a screen before opening a pull request

1. Open the page in `/ar` at 375 px wide (phone) and 1280 px (desktop).
2. Look for:
   - every row starts on the right
   - arrows point the right way
   - no figure is reversed or split across lines
   - no English text
   - no horizontal scroll
3. For horizontal scroll, run this in the console; it must be `true`:
   ```js
   document.documentElement.scrollWidth <= document.documentElement.clientWidth;
   ```
4. Do the same in `/en`.
