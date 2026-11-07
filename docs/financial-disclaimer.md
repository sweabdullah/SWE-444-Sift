# SFT-23: financial disclaimer

The shared locale layout renders `SiteFooter` after page content. The footer uses
`FinancialDisclaimer`, which selects the existing typed Arabic/English messages,
sets the text language and direction, and uses the site's body typography and colours.
The notice explains that Sift provides information only and asks visitors to verify
figures and terms directly with the bank before applying.

## Detail-page placement

S-2 / SFT-19 ([PR #20](https://github.com/sweabdullah/SWE-444-Sift/pull/20)) is merged
into main. `CardDetail` now renders the same `FinancialDisclaimer` as the first child
of its fees section, in a bordered panel before the heading and first fee figure.
The notice stays in normal document flow and wraps on narrow screens, so visitors
encounter it before scrolling through the figures. The shared footer remains in
the locale root layout, including on detail pages.

Tests cover the full copy, language/direction, shared footer placement and locale
layout inclusion in both languages. Detail component tests verify the notice
precedes the first fee figure, including a published zero fee. Route integration
tests compose the actual detail page, detail layout and locale layout with mocked
database reads, verifying both placements in Arabic and English.

Run `pnpm test`, `pnpm lint`, `pnpm format:check` and `pnpm typecheck` (which also
runs the production build). These component/server-rendering tests do not replace
a live browser check of Arabic at phone width with seeded data.
