# Ingest fixtures

Saved bank pages so the crawler (SFT-49/50/51/59) and the extractor (SFT-56/57) can be built and tested with **no live site and no AI key**.

> **Local testing only.** These are copies of public pages owned by the banks named below. They are kept here only as test inputs for a university project (KSU SWE-444). They are not republished, served, or used in the product. If a bank objects, or before the repo is made public, delete `banks/<bank>/`. The banks' own terms and copyright apply to every file under `banks/`.
>
> **Risk:** if the repo is made public (for example to get branch protection on a free plan), these copies become public too. The team should decide first: keep the repo private, or move `banks/` out of git (a private artifact or LFS) before going public.

## Layout

```
fixtures/
  manifest.json            # one entry per file; the golden set (see below)
  banks/
    alrajhi/               # Al Rajhi Bank (www.alrajhibank.com.sa)
    snb/                   # Saudi National Bank (www.alahli.com)
    riyad/                 # Riyad Bank (www.riyadbank.com)
    sab/                   # SAB: blocked, only the WAF response is kept
  synthetic/               # hand-written edge cases (fictional bank)
```

## What was captured

Retrieved **2026-10-21, 09:43–09:50 UTC**. Each HTML file starts with a comment giving its source URL and fetch time.

| Bank     | Kind                    | File                                                   | Source URL                                                                                |
| -------- | ----------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Al Rajhi | robots                  | `banks/alrajhi/robots.txt`                             | https://www.alrajhibank.com.sa/robots.txt                                                 |
| Al Rajhi | sitemap (excerpt)       | `banks/alrajhi/sitemap.excerpt.xml`                    | https://www.alrajhibank.com.sa/sitemap.xml                                                |
| Al Rajhi | listing, raw            | `banks/alrajhi/listing.en.raw.html`                    | https://www.alrajhibank.com.sa/en/Personal/Cards                                          |
| Al Rajhi | listing, rendered       | `banks/alrajhi/listing.en.rendered.html`               | same                                                                                      |
| Al Rajhi | detail (EN)             | `banks/alrajhi/detail.platinum-credit-card.en.html`    | https://www.alrajhibank.com.sa/en/Personal/Cards/Credit-Cards/Platinum-Credit-Card        |
| Al Rajhi | detail (AR)             | `banks/alrajhi/detail.signature-credit-card.ar.html`   | https://www.alrajhibank.com.sa/Personal/Cards/Credit-Cards/Signature-Credit-Card          |
| SNB      | robots                  | `banks/snb/robots.txt`                                 | https://www.alahli.com/robots.txt                                                         |
| SNB      | sitemap (excerpt)       | `banks/snb/sitemap.excerpt.xml`                        | https://www.alahli.com/sitemap.xml                                                        |
| SNB      | listing                 | `banks/snb/listing.en.html`                            | https://www.alahli.com/en/pages/personal-banking/credit-cards                             |
| SNB      | detail (EN)             | `banks/snb/detail.alahli-cashback-credit-card.en.html` | https://www.alahli.com/en/pages/personal-banking/credit-cards/alahli-cashback-credit-card |
| SNB      | detail (AR)             | `banks/snb/detail.alahli-credit-card-platinum.ar.html` | https://www.alahli.com/ar/pages/personal-banking/credit-cards/alahli-credit-card-platinum |
| Riyad    | robots                  | `banks/riyad/robots.txt`                               | https://www.riyadbank.com/robots.txt                                                      |
| Riyad    | sitemap index (excerpt) | `banks/riyad/sitemap-index.excerpt.xml`                | https://www.riyadbank.com/sitemap.xml                                                     |
| Riyad    | listing                 | `banks/riyad/listing.en.html`                          | https://www.riyadbank.com/en/personal-banking/credit-cards                                |
| Riyad    | detail (EN)             | `banks/riyad/detail.cashback-visa-signature.en.html`   | https://www.riyadbank.com/en/personal-banking/credit-cards/cashback-visa-signature        |
| Riyad    | detail (AR)             | `banks/riyad/detail.titanium-credit-card.ar.html`      | https://www.riyadbank.com/ar/personal-banking/credit-cards/titanium-credit-card           |
| SAB      | robots (blocked)        | `banks/sab/robots.blocked.html`                        | https://www.sab.com/robots.txt                                                            |

**Blocked:** SAB's firewall returned a "Request Rejected" HTML page (HTTP 200) for `robots.txt`. We did not retry, change the user agent or use a browser to get round it, and made no other SAB requests.

## How it was fetched (politeness)

- User agent: `SiftFixtureBot/0.1 (+https://github.com/sweabdullah/SWE-444-Sift; KSU SWE-444 student project; one-off test fixture capture)`.
- `robots.txt` was read first for each bank. Every page fetched is allowed by it.
- At least 2 s between requests (3 s for pages): 17 direct requests in total, counting the SAB attempt and the one Playwright render.
- Only the Al Rajhi listing needed JavaScript, so it is the only page saved twice (`raw` + `rendered`). The render used Playwright Chromium (`waitUntil: networkidle` + 3 s) with images, fonts, media and known trackers blocked. The other pages already contain their content in the server HTML.
- SNB's `/…/cards/<slug>` URLs redirect to `/…/pages/personal-banking/credit-cards/<slug>`. The manifest records the final URL as `url` and the requested one as `requestedUrl`.

## What was changed in the saved pages

- Every executable `<script>` (inline or `src`) is replaced with `<!-- sift-fixture: script removed -->`. This removes analytics and tag managers (Google Analytics, GTM, gtag) and Liferay's per-session `authToken`.
- JSON data islands (`application/json`, `application/ld+json`, e.g. `__NEXT_DATA__`, `__JSS_STATE__`) are kept, because an extractor may want them. Inside them, the SNB Google Maps API key and GTM container ID are replaced with `REDACTED_…` placeholders.
- `<noscript>` tracking iframes are removed.
- Every reCAPTCHA site key is redacted: the `data-sitekey` attribute becomes `REDACTED`, and both the `?k=` parameter of Riyad's fallback iframe and the `RecaptchaSiteKey` field in SNB's JSON become `REDACTED_RECAPTCHA_SITEKEY`. Al Rajhi's `ahrefs-site-verification` meta token is redacted too.
- Inline event handlers are disabled: `on<event>="…"` attributes become `data-sift-removed-on<event>=""` (17, all in Riyad pages). `javascript:` attribute URLs become `#sift-removed-javascript` (4, Riyad AR). Two inert `javascript:` strings remain on purpose in the Al Rajhi files:
  - `href="/en/javascript:;return%20false;"` is a relative path, not executable. It is a real CMS bug and a good "don't follow this link" case for the crawler.
  - `"href":"javascript:;return false;"` sits inside the `__NEXT_DATA__` JSON, so it is data, not code.
- Everything else (markup, classes, text, tables, links) is unchanged.
- Sitemaps are **excerpts**, to keep the folder small (the full files are 2.4 MB, 0.86 MB and 0.18 MB). Each one keeps the first few entries plus every card URL, and a comment at the top gives the original entry count and the filter used.

## `manifest.json`

One entry per file:

```jsonc
{
  "bank": "riyad",
  "url": "https://…",          // final URL; null for synthetic files
  "requestedUrl": "https://…",  // only when there was a redirect
  "locale": "ar" | "en" | null,
  "kind": "robots" | "sitemap" | "listing" | "detail",
  "file": "banks/riyad/…",      // relative to this folder
  "rendered": false,            // true = Playwright DOM snapshot
  "fetchedAt": "2026-10-21T…Z", // null for synthetic files
  "expected": { … }             // see below
}
```

Extra flags appear where they apply: `excerpt`, `blocked`, `synthetic`, `badCrawl`.

For **detail** pages, `expected` is the golden set for the extractor. Every value was read off the page by hand:

- Money is a plain number in SAR (`500`, not `"SAR 500"`). Rates are percentages as numbers (`2.5` means 2.5%).
- **`null` means the page does not state it. `0` means the page says it is free or zero.** They are not the same thing. For example, Al Rajhi shows only a time-limited fee waiver, so its `annualFee` is `null` and the waiver is kept in `annualFeeText` and `annualFeeWaiver`.
- `…Text` fields are copied character-for-character from the page (including odd spacing and typos), so a test can look for them with `includes()`.
- `notes` lists any quirk worth a test.

For **listing / robots / sitemap** entries, `expected` holds things the crawler should find, such as `cardDetailLinksInclude`, `sitemaps`, `disallow` and `containsLoc`.

## Real-world quirks these files cover

- Al Rajhi's card grid is client-side: even rendered, the listing has only one card detail link, so discover its cards from the sitemap. In the rendered DOM the word "SAR" is swapped for a riyal icon.
- Riyad Bank writes the currency as the literal text `S..R` and `ر..س`. Its robots.txt points to a sitemap on `http://…:8080` and has a full URL as a `Disallow` rule.
- Al Rajhi mixes `SAR` and `ريال` on one Arabic page and writes percentages as `%5`.
- SNB's Arabic Platinum page has no fee figures at all, which tests that the extractor returns `null` rather than guessing.
- SAB's `robots.txt` is really an HTML WAF page.

## Synthetic files

Both describe a fictional bank ("بنك المثال") and are not copies of any real page.

- `synthetic/detail.arabic-indic-digits.ar.html`: a full fee table in Arabic-Indic digits (`٥٠٠`, `٢٫٥٪`, `١٠٬٠٠٠`) using the Arabic decimal, thousands and percent signs.
- `synthetic/bad-crawl.maintenance.html`: an HTTP-200 "under maintenance" shell with no card content, for the SFT-51 bad-crawl guard.

## Refreshing

Don't refresh these in CI or on a schedule. If a page has to be re-captured, follow the same rules (robots first, same UA, ≤1 request per 2 s, strip scripts, redact keys) and update `fetchedAt` and `expected` in the manifest by reading the new page.
