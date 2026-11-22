# Sprint 3 authentication finalization

Branch: `codex/sprint-3-auth-finalization`, isolated at
`C:/Users/fkbr1/Documents/Sift-sprint3-auth-finalization`, based on SFT-40 `6a7b053`.
The original four branches remain unchanged. Linear was reread directly; it specifies no higher
minimum password length. No remote records, production data, or shared package versions change.

## Password decision

The product policy is 8–128 Unicode code points, with Arabic/English/symbols/passphrases allowed,
no composition rule, and a small local common/repetition blocklist. Nothing is sent to an external
password service. The UI/server share the same policy. Actual passwords are never normalized or
trimmed. The 8-character password-only minimum is the owner's explicit product decision; it is
weaker against guessing than a longer minimum. Encourage unique long passphrases, reject known
weak values, and provision production abuse protection before release. The small blocklist is
not a comprehensive breached-password database or an assurance of password entropy.

New rows use Node 22's built-in scrypt: N=32768, r=8, p=3, 16 random salt bytes, 32-byte key,
64 MiB maxmem, constant-time key comparison, and a versioned self-describing string. This is one
of [OWASP's scrypt profiles](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).
[Node crypto](https://nodejs.org/docs/latest-v22.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
provides the implementation without a new native dependency or a Node-version upgrade.
At most two expensive hash operations and sixteen queued operations run per module/worker;
excess work fails safely. This is a resource bound, not a distributed brute-force limiter.

Existing bcrypt hashes remain readable, including the development fixtures. Their input still
has a strict 72-byte limit, so aliases caused by truncation never authenticate. New scrypt
passwords safely exceed that byte limit without exposing byte jargon in the form. No schema
migration or bulk password rewrite is performed. Do not roll back to readers that understand
only bcrypt after new accounts have been created; include the versioned verifier in any rollback.

## Redirect repair

Navigation must carry a canonical destination. The resolver unwraps bounded legacy auth-page
wrappers and whole-value percent encodings, rewrites the locale, and preserves the final page's
query and fragment without decoding their values. External/protocol-relative destinations,
control characters, encoded path separators, invalid locales and excessive nesting fall back
to the account page. `authHref()` creates one encoding layer; the UI must use it consistently.

## UI and journey audit

All four account pages now use the existing Sift lockups, IBM Plex Sans Arabic UI font,
Markazi display font, graphite/mist/platinum/ice palette, and brand spacing/radius tokens.
Public catalogue and card components, Prisma schema/migrations, dependencies and shared exports
are unchanged. Auth navigation alone changes on public pages.

| Surface                  | Defect addressed and final behavior                                                                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration             | Replaced loose fields with a bounded card, explicit labels, shared localized guidance, separated footer links, password visibility, field-linked feedback, retained values, focus recovery and duplicate-submit prevention.                          |
| Login                    | Same visual hierarchy; generic credential feedback, safe retry, sign-out success and session-required notices. No account-existence distinction in login errors.                                                                                     |
| Logout                   | Explicit confirmation, separate full-size cancel/confirm controls, explanation that the current browser session is affected, pending/retry behavior. GET and cancel never revoke.                                                                    |
| Account                  | Clear identity, current role/session status, wrapped LTR email inside RTL content, catalogue and sign-out actions; no unrelated admin features.                                                                                                      |
| Navigation               | No duplicate account navigation on auth screens; canonical original destination across public/auth/locale links. Public sign-in/register remain present before JS.                                                                                   |
| Responsive/accessibility | Desktop two-column brand/story layout; single bounded card at tablet/mobile widths; visible keyboard focus, skip link, labels, live feedback, 48px inputs/buttons, password-toggle keyboard support, no horizontal overflow.                         |
| Failure/loading          | Submission spinner, disabled/read-only controls and live pending label. Safe localized route error boundary with retry/catalogue. Full-page streaming loading shells were removed after no-JS testing revealed that they obstruct progressive forms. |

Browser tests wait for hydration before exercising enhanced controls; the forms also read actual
input values at submit so browser autofill is validated. Server validation remains authoritative.
No authentication/role decision relies on navigation visibility. Fault-injection browser tests
abort a server-action request deliberately; their expected browser error is not a production-data
failure. The default journeys separately assert no unexpected page errors.

## Acceptance criteria and team boundaries

| Issue  | Local coverage                                                                                                                                                           | Remaining owner/team step                                                                          |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| SFT-41 | Credentials/adapter/callback/session-row spike; server component reads; anonymous/admin denial; hashing and guard notes; practical learning exercise below.              | Every developer must demonstrate the exercise; owner must publish/link approved summary to Linear. |
| SFT-38 | Valid account + automatic login, normalized email, normal role, localized duplicate/weak feedback, salted irreversible hash, safe database errors and unique-race tests. | Hosted review/CI and release controls.                                                             |
| SFT-39 | Generic wrong credentials, actual Chromium restart, original query-bearing destination, confirmation/cancel, DB expiry, revocation and old-cookie denial.                | Hosted HTTPS/proxy/cookie verification.                                                            |
| SFT-40 | Direct visitor/user/admin requests, 401 user / 403 non-admin admin contract, fresh DB role per guard, demotion/deletion with old cookie, spoofed identity ignored.       | Each future teammate handler/action must apply the guard and ownership checks.                     |

SFT-42 shortlist ownership and SFT-86 verification/email notification rules remain teammates'
work. Registration still creates `role=user`, `emailVerified=null`, `digestOptIn=false`; unverified
users can browse and later save cards. SFT-44 retains separate guarded admin entry ownership.
Visitors have no database role row. Never add client-supplied role, user ID, or verification status.

## SFT-41 practical team summary

Credentials requires Auth.js JWT strategy. The Prisma adapter alone does not create a Session
for Credentials. Our JWT transports a random session identifier whose existing DB Session row
must be valid on every read; this preserves supported Auth.js cookie/CSRF handling while adding
server revocation. This is custom tested callback wiring, not native Auth.js database strategy.
The public session has only safe identity/role/expiry; the DB role is refreshed, not trusted from
an old cookie. The absolute 30-day row deadline cannot be extended by cookie rotation.
Logout revokes the matching row before clearing the cookie; a DB failure must report failure,
never claim that copied cookies were invalidated. Do not authorize with a bare JWT decoder.

Add protection where server work executes:

```ts
import { withRole } from "@/lib/auth/guards";
export const GET = withRole("user", async (_request, identity) => {
  // Future ownership query must filter by identity.id, never a client userId.
  return Response.json({ userId: identity.id });
});
```

For a server component/action, call `requireUser()` or `requireAdmin()` inside that entry point
before protected work. Redirect page visitors deliberately; route handlers use `withRole` to
return the required 401/403 and private/no-store response. Hiding a button is presentation only.

Each developer should: trace sign-in → JWT callback → Session row → session callback; add a
throwaway guarded handler; call it anonymously/user/admin; demote the admin and retry its old
cookie; sign out and replay the user cookie; explain the password/expiry/failure boundaries.
Use only the disposable preview. Remove throwaway routes after learning; no production fixture
or actual teammate learning completion is claimed by these automated checks.

## Local review and incorporation

The preserved commits are SFT-41 `cd81b81`, SFT-38 `9a0b822`, SFT-39 `82dcf58`, SFT-40 `6a7b053`.
Finalization starts at `6a7b053`; its commits should be reviewed against that exact base.
No original branch/worktree is rewritten. `origin/main` remained `673f488` when fetched.

Recommended future PR order: **41 → 38 → 39 → 40 → finalization**. The finalization diff contains
cross-cutting UI plus password/redirect regressions; keep it as a clearly named fifth review
rather than silently altering already-reviewed commits. Do not deploy interim password readers
and later blindly roll back: new scrypt rows require the version-aware reader.

If parents merge with ancestry preserved, the fifth diff naturally contains only finalization.
If parents are squash-merged, their original commit IDs will not be ancestors of main. After
approval, create fresh review branches from updated main and replay only each branch's own
changes (or the finalization commits after the four features are present), resolve reviewed
conflicts, and rerun all checks. Do not cherry-pick the whole historical stack again or include
parent changes in child PRs. Any alternative redistribution into the four issues needs a new
explicit plan; it has not been performed here.

## Launch and verification

From `C:/Users/fkbr1/Documents/Sift-sprint3-auth-finalization`:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm --filter @sift/web auth:preview
```

The preview owns only localhost 3144 and 55442, creates a fresh in-memory PostgreSQL/WASM DB,
applies existing migrations and non-destructive catalogue fixtures, and generates its own secret.
It ignores production DB/secret values and loses all test data on shutdown. Leave it running to
test browser restart. Local fixtures `user@sift.local` and `admin@sift.local` use the deliberately
public development password `sift-dev-password` (blocked for new registration).

In another terminal:

```powershell
$env:SIFT_AUTH_TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55442/sift_auth_spike_test?schema=public&connection_limit=1&pgbouncer=true'
$env:SIFT_AUTH_SPIKE_TEST_DATABASE_URL=$env:SIFT_AUTH_TEST_DATABASE_URL
$env:SIFT_AUTH_E2E_URL='http://127.0.0.1:3144'
corepack pnpm --filter @sift/web test:auth:e2e
corepack pnpm test
```

Screenshots remain ignored local test artifacts under `apps/web/test-results`; they contain only
random test accounts. Browser matrix: AR/EN at 390×844, 820×1180 and 1440×1000. The important
register/login/logout/account, weak/wrong/pending/retry states are captured and visually inspected.
The preview's Next development indicator is tooling, not part of the shipped interface.

Remaining release limits: native PostgreSQL/hosted HTTPS and distributed abuse protection are
unverified. The local hash queue is not rate limiting; common-password coverage is finite.
Eight-character password-only accounts remain more guessable than longer unique passphrases.
Auth.js is pinned beta and its hybrid callback integration must retain regression tests.
Existing dependency advisories require a separately approved upgrade, not a successful build
retry. No framework/package upgrade, schema change, production access, push, PR, deployment,
Linear mutation or team learning sign-off occurs here.

## Final verification record

- 415/415 automated tests passed, including all three opt-in disposable DB integrations.
- 19/19 Chromium scenarios passed, with AR/EN desktop/tablet/mobile journeys, real browser
  restart, role changes/deletion, expiry, replay denial, long Unicode passwords, no-JS registration,
  generic credential feedback, duplicate prevention, and safe localized failure/retry.
- Repository formatting, lint/logical CSS, production build and all workspace typechecks passed.
  The first build stopped for the existing Next security reminder; its documented retry passed.
- Screenshot inspection covered auth layouts, feedback and public catalogue/card pages. It found
  capture timing issues; final screenshot assertions now wait for login/detail content. The last
  tiny UI correction suppresses duplicated password hint/error text. Those final two adjustments
  passed the production build/typechecks; the successful browser suite was not repeated afterward,
  following the owner's request to conserve usage.
- Production dependency audit: 2 high and 7 moderate findings (deepmerge-ts, effect, Next).
  No packages were upgraded. This remains a release follow-up, not a clean security audit.
- No unresolved authentication failure remains from the executed tests. Native PostgreSQL,
  hosted infrastructure, manual assistive-technology testing, team learning sign-off and release
  abuse controls remain outside this local verification. The disposable preview was shut down.
