# SFT-23: financial disclaimer

The shared locale layout renders `SiteFooter` after page content. The footer uses
`FinancialDisclaimer`, which selects the existing typed Arabic/English messages,
sets the text language and direction, and uses the site's body typography and colours.
The notice explains that Sift provides information only and asks visitors to verify
figures and terms directly with the bank before applying.

## Blocked detail-page placement (S-2 / SFT-19)

At implementation time, `origin/main` is `13db63a`. It has no card detail route or
`CardDetail` component. [Draft PR #20](https://github.com/sweabdullah/SWE-444-Sift/pull/20)
on `sft-19-card-detail-page` implements S-2 but is unmerged and conflicts with main.
This change does not copy or merge that work. Acceptance criterion 1 remains blocked;
the footer alone does not satisfy the notice-near-figures requirement.

After S-2 is integrated, import `FinancialDisclaimer` into
`apps/web/components/CardDetail.tsx` and render it as the first child of the fees
section, before its heading and figures:

```tsx
import { FinancialDisclaimer } from "@/components/FinancialDisclaimer";

// Inside CardDetail, with its validated locale:
<section aria-labelledby="fees-heading">
  <div className="mb-4 rounded-md border border-line bg-white p-4">
    <FinancialDisclaimer locale={locale} />
  </div>
  {/* Existing fees heading and figures follow. */}
</section>;
```

This puts the notice before the first figure even on narrow screens, rather than
requiring visitors to scroll through the fee list. Keep it in normal document flow.
Add integration tests against the real detail component in both languages that
assert the full notice precedes the first fee figure; also render the real route
inside the locale layout and assert the notice occurs in both the figures section
and footer. Check Arabic at phone width with seeded data. Those placement checks
cannot run against this branch because the detail implementation is absent.

Current tests cover the full copy, language/direction, shared footer placement and
locale-layout inclusion in both languages. They do not claim detail-page coverage.
