## What this does

<!-- One or two sentences. Title format: "BRO-123: short description" so Linear links this PR. -->

Linear: BRO-

## How to verify

<!-- Steps a reviewer can follow to see each acceptance criterion working. -->

1.

## Definition of Done

- [ ] Every acceptance criterion on the Linear issue is demonstrated (steps above), not just claimed
- [ ] CI is green — build, lint, tests
- [ ] Both locales render; the Arabic view is checked in RTL at phone width _(or: no UI in this PR)_
- [ ] Only logical CSS properties (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`) — no `left`/`right`
- [ ] Protected routes re-check authorisation on the server _(or: no protected routes touched)_
- [ ] No new console errors or unhandled promise rejections
- [ ] README / schema notes updated if setup or data shape changed
- [ ] No secrets committed — new env vars added to `.env.example`

<!-- After merge: confirm it deployed to the public URL, then move the Linear issue to Done. -->
