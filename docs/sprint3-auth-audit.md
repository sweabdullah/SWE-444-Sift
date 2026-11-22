# Sprint 3 authentication audit — 22 November 2026

## Executive summary and readiness

Reviewed branch `codex/sprint-3-auth-finalization` at `f7c1ac6`, including preceding commits `6e0bf96` and `561cc08`. The four original branches remain preserved.

**Ready for a code-review PR with disclosed limitations; not verified for production release or full Linear completion.** Registration, persistent sign-in, server revocation and server role checks have substantial implementation and local test evidence. No critical authentication bypass was identified in this review. This is not a penetration-test assurance.

I retrieved the complete descriptions, relations and all returned comments directly from Linear for all four issues. All remain Backlog. This audit inspected code, translations, test definitions and existing verification records; it did not rerun lengthy suites or launch a new browser session. Visual conclusions also use screenshots inspected during the preceding finalization pass, not a fresh visual certification.

## Requirements coverage

### [SFT-41](https://linear.app/swe444sift/issue/SFT-41) — partially complete

- Providers, Prisma adapter, callbacks, password hashing and server authorization: implemented and documented.
- Proposed credentials demo creating a Session row, server-component session read and direct anonymous/non-admin denial: implemented, with existing test evidence.
- Credentials uses JWT transport plus a mandatory existing Prisma Session row. This is custom callback wiring, not Auth.js native database-session strategy.
- **Human learning outcome remains unverified:** automated tests cannot establish that every developer can protect a route and explain the check.
- **Summary linked on Linear is missing:** intentionally not published without permission.
- **Proposed-comment discrepancy:** its hashing criterion names “argon2id or bcrypt.” The final implementation writes scrypt and reads legacy bcrypt. Scrypt is a deliberate documented design, not inherently a defect, but claiming literal compliance with that proposed wording would be inaccurate. Obtain team agreement or clarify the criterion before declaring completion.
- No blocking dependency; related to SFT-6. Blocks SFT-38.

### [SFT-38](https://linear.app/swe444sift/issue/SFT-38) — locally complete; release unverified

All four formal criteria have implementation/test evidence: valid registration creates an account and automatically signs in; duplicate email produces localized feedback; weak passwords are rejected with guidance; stored passwords use salted irreversible hashing.

Email is trimmed/lowercased and validated server-side. The database unique constraint handles races. Explicit account fields prevent submitted role/verification preferences from being trusted. New accounts remain ordinary, unverified and opted out of digest email.

Linear specifies **no numeric password minimum**. The owner's 8-character choice therefore does not contradict SFT-38. Actual policy is 8–128 Unicode code points, no composition requirement, local common/repetition rejection, and support for Arabic/long passphrases. Code points are not necessarily user-perceived grapheme clusters.

New passwords use versioned scrypt (N=32768, r=8, p=3), random salt and constant-time derived-key comparison. Legacy bcrypt retains a strict 72-byte verification boundary; new passwords avoid that limit. A finite blocklist is not comprehensive breach detection.

Depends on SFT-41, SFT-6/7/10/11. Blocks SFT-39 and SFT-86. The comment explicitly anticipates later email-verification work; sending verification emails is not missing work within these four issues.

### [SFT-39](https://linear.app/swe444sift/issue/SFT-39) — locally complete; hosted behavior unverified

All four criteria have existing evidence:

- Valid login returns to the intended internal page, including legitimate query values.
- Actual Chromium close/reopen preserves the session.
- Confirmed logout deletes the server Session row; copied cookies subsequently fail.
- Missing-email and wrong-password cases share localized credential errors.

Every session read checks the DB row, owner, absolute expiry and current user. The 30-day row deadline is not extended by cookie rotation. Confirmation GET/cancel do not revoke. Revocation failures do not intentionally report successful logout.

The redirect resolver bounds nested auth wrappers/encoding, rejects unsafe destinations and retains final query/fragment values. Excessive or malformed input falls back to account. No open redirect was identified in the reviewed resolver. Browser coverage demonstrates query preservation; fragment-specific and unusual URL cases rely on unit coverage/code review rather than every case being browser-tested.

Depends on SFT-38 and SFT-6/7/10/11. Blocks SFT-40 and SFT-42.

### [SFT-40](https://linear.app/swe444sift/issue/SFT-40) — locally complete for current protected entry points

All three formal criteria have evidence: direct anonymous user-resource requests are rejected; ordinary-user admin requests return 403; protected handlers check the server session/role.

`requireUser`, `requireAdmin` and `withRole` re-read validated authentication. Account page and logout action enforce their checks; account/admin probe APIs deny before business work. Current DB role reload prevents an old cookie from retaining privileges after demotion. Existing tests cover deletion and forged identity inputs.

Visitors appropriately have no User row; the schema's user/admin enum need not acquire a visitor value. Admin APIs return 403 for all non-admin callers, consistent with the documented downstream contract.

This does not automatically secure future teammate routes. Each new handler/action still needs a guard and ownership filter.

Depends on SFT-39 and SFT-6/7/11. Blocks SFT-44's separate admin entry; that UI is outside this scope.

## Critical issues before a PR

**No confirmed critical code defect was found that requires blocking a review PR.** Do not equate this with release approval.

Before representing the work as fully requirements-complete, resolve the SFT-41 hashing-wording discrepancy and disclose unfinished human learning/publication. Existing dependency advisories must be visible in the PR, with an agreed remediation owner and release decision.

## UX/UI review and recommended simplification

The existing brand palette/fonts, bounded cards, responsive columns, separated actions, input labels, focus styles and RTL-aware layout are consistent. Prior AR/EN screenshots and viewport journeys support this assessment. No concrete clipping or horizontal-overflow defect remains established by that evidence. A new manual screen-reader or exhaustive contrast audit was not performed.

| Screen                  | Assessment and recommendation                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account                 | Email and browse/sign-out actions are useful. The description, “Signed in” notice and “Session status / Signed in on this browser” repeat the same fact. Remove the session-status row and simplify the description. “Account type / Registered user” offers little value to ordinary users; omit unless a real user decision needs it. No raw token, session ID or hash is displayed. |
| Logout                  | Confirmation and cancel are appropriate. Title, description and security notice repeat current-browser scope, with Arabic wording especially long. Prefer a short “Sign out?” title and one plain sentence that other devices remain signed in. Preserve confirmation and failure feedback.                                                                                            |
| Registration            | Labels, password visibility, localized guidance and duplicate feedback are useful. No byte-encoding jargon appears. The short guidance need not enumerate every blocked pattern; rejection feedback explains it. No confirmed need for extra fields or a second password input.                                                                                                        |
| Login                   | Generic errors and original-destination behavior are appropriate. Retained email and retry feedback help recovery. Password reset is not required by these four issues; its absence is a separate product decision.                                                                                                                                                                    |
| Shared shell/navigation | Desktop marketing panel is optional branding, not a correctness defect. Repeating it on account/logout adds visual weight but is not a PR blocker. Catalogue navigation appears both as a primary account action and shell footer link; consider retaining only one there.                                                                                                             |

Affected files: `apps/web/app/[locale]/{account,logout,register,login}/page.tsx`, `apps/web/components/auth/AuthShell.tsx`, `CredentialsForm.tsx`, `apps/web/components/LogoutForm.tsx`, and `apps/web/messages/{ar,en}.json`.

Unused-looking translation keys such as pageLoading/registrationNote should be checked before cleanup; they are maintenance clutter, not user-visible defects by themselves. Avoid broad cosmetic redesign.

## Security and testing gaps

**Existing results, not rerun for this audit:** 415 automated tests passed, including three disposable DB integrations; 19 Chromium scenarios passed; formatting, lint, production build and workspace typechecks passed. Final minor hint-display/screenshot-wait adjustments passed build/typechecks but were not browser-rerun. Earlier screenshot timing captured public content under some login screenshot names; updated waits address capture timing, but final replacement captures were not verified. Therefore do not claim the final exact revision has freshly verified screenshots of every login viewport.

Coverage includes AR/EN mobile/tablet/desktop journeys, minimum-length and long Unicode passwords, duplicate/invalid feedback, no-JS registration, pending duplicate prevention, generic credentials, real browser restart, expiry, role demotion/deletion, replay denial and safe failed-request recovery. Unit/HTTP tests additionally exercise CSRF, DB failure and redirect boundaries.

Outstanding:

1. Recorded production dependency audit has **2 high and 7 moderate findings**, involving deepmerge-ts, effect and Next. This is prior audit evidence, not a new registry scan. Exploitability of each dependency path was not established here. A successful framework-reminder retry does not fix vulnerabilities.
2. No distributed login/registration abuse limiter is implemented by the local hash queue. Two active/16 queued operations bound per-worker work, not attackers across instances. Eight-character password-only authentication and a small blocklist increase the importance of deployment abuse controls.
3. Native PostgreSQL concurrency, hosted HTTPS cookies/proxy behavior, deployment secret configuration, multi-instance behavior and production load remain unverified. WASM PostgreSQL is useful local evidence, not equivalent infrastructure certification.
4. Generic login wording does not guarantee timing-resistant account enumeration: legacy bcrypt and scrypt have different costs. Explicit registration duplicate feedback reveals registration status by design and is required by Linear.
5. Scrypt rollback compatibility matters: older bcrypt-only readers cannot authenticate newly created scrypt accounts. Retain the versioned verifier in any rollback.
6. Manual assistive-technology testing, browser engines other than Chromium and exhaustive accessibility conformance remain unverified. Keyboard/labels/touch-size tests are useful but narrower.
7. The Auth.js beta and custom Session allowlist need regression coverage on future upgrades. Expired-row cleanup is an operational consideration, not evidence that expired sessions authorize successfully.

Primary implementation files: `apps/web/lib/auth/{config,password,policy,register,return-to,server,revoke,guards}.ts`; route wrappers under `apps/web/app/api/auth`; tests under `apps/web/lib/auth`, `lib/auth-spike` and `e2e/auth`.

## Integration considerations

Prisma schema/migrations and shared package contracts were preserved. SFT-42 should filter ownership using the server guard's identity.id. SFT-86 can use existing emailVerified and digestOptIn boundaries. SFT-44 owns its separate admin entry and must guard each admin API independently.

Recommended review order remains **41 → 38 → 39 → 40 → finalization**. Review finalization against SFT-40 commit `6a7b053`. If parents are squash-merged, reconcile fresh child review branches against updated main; do not replay the entire historical stack and duplicate parent changes. No such Git operations were performed in this audit. Upstream integration freshness was not re-fetched or certified today.

## Prioritized action plan

1. **Before claiming completion:** agree how SFT-41's proposed algorithm wording maps to scrypt; arrange developer learning demonstration and eventual approved summary link.
2. **Before release:** triage dependency advisories, agree upgrades separately, configure abuse protection and verify native PostgreSQL/hosted HTTPS/proxy/secrets.
3. **Recommended UX follow-up:** simplify account status/role content and logout explanations in both locales. These are usability improvements, not demonstrated security defects.
4. **Targeted verification after approved fixes:** test the changed copy/layout and final login screenshot waits; avoid repeating unchanged broad suites without cause.
5. **Prepare review PRs:** disclose exact test scope, remaining risks and stacked ancestry; require guards/ownership checks in downstream teammate work.

No implementation code, commits, remote records or Linear statuses were changed. Only this requested audit document was added.
