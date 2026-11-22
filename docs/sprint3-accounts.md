# Sprint 3 accounts: local branch stack

No branch is pushed, deployed, or merged by this work. Linear records stay unchanged.

**Current finalization:** review `codex/sprint-3-auth-finalization` and [auth-finalization.md](auth-finalization.md). The four preserved worktrees below remain historical review baselines; the finalization branch contains the current policy and polished UI.

| Issue  | Branch                     | Parent                     | Worktree                                          |
| ------ | -------------------------- | -------------------------- | ------------------------------------------------- |
| SFT-41 | codex/sft-41-auth-learning | origin/main at 673f488     | C:/Users/fkbr1/Documents/Sift-sft41-auth-learning |
| SFT-38 | codex/sft-38-registration  | codex/sft-41-auth-learning | C:/Users/fkbr1/Documents/Sift-sft38-registration  |
| SFT-39 | codex/sft-39-sessions      | codex/sft-38-registration  | C:/Users/fkbr1/Documents/Sift-sft39-sessions      |
| SFT-40 | codex/sft-40-server-roles  | codex/sft-39-sessions      | C:/Users/fkbr1/Documents/Sift-sft40-server-roles  |

Review and eventually merge in this order: **41 → 38 → 39 → 40**. Before each parent
merges, review the child against its parent branch so its diff contains only that issue.
If the team preserves merge commits, the ancestry remains intact. If a parent is squash
merged, the owner must explicitly reconcile the child onto the new main before its PR;
do not merge a child with duplicated parent changes. No such rebase is performed here.

Inspect a worktree using Codex's folder picker, or use `git -C <worktree> diff <parent>...HEAD`
and `git -C <worktree> log --oneline <parent>..HEAD`. Commit hashes are reported in the final
handoff; branch names in this document avoid self-referential commit hashes.

SFT-41's technical demonstration and learning exercise are in [auth-learning.md](auth-learning.md).
The team learning outcome and linking a published summary to Linear require human follow-through.
The repository Definition of Done also requires CI, PR merge and deployment; those actions are
outside the authorized local-only work. Local implementation readiness is reported separately.

## SFT-38 registration

`/[locale]/register` validates email and password on the server, creates a normal unverified
user, and signs it in to `/:locale/account`. Emails are trimmed/lowercased. Passwords are not
trimmed or normalized: 8–128 Unicode code points, with common/repeated passwords rejected. New accounts use versioned scrypt (N=32768, r=8, p=3); legacy bcrypt verification keeps its strict 72-byte safety boundary.
Existing bcrypt seed hashes continue to verify. The DB unique constraint handles duplicate races;
no user-submitted role, verification or notification preference is accepted. `emailVerified=null`
and `digestOptIn=false` preserve SFT-86's boundary. A failure to sign in after creation is reported
as account-created/sign-in-failed; the user must not retry registration expecting a second account.

SFT-38 extracts the tested SFT-41 configuration into `lib/auth/config.ts`. The spike remains an
opt-in wrapper with its own cookie and 24-hour expiry. Account sessions use a separate cookie,
30-day absolute server expiry, and `/api/auth`; they never trust a JWT without its Session row.
No Prisma schema, migrations, or shared package exports change. The public session access API is
`auth()` from `lib/auth/server.ts`; forthcoming SFT-40 guards build on that validated identity.

## SFT-39 sessions

`/[locale]/login` accepts a validated internal `returnTo` path. Navigation captures the current
page and query, including a card detail page; auth pages cannot redirect back into themselves.
Locale switches rewrite an internal return path to the chosen locale. External URLs, protocol
relative URLs, backslashes, control characters and encoded path separators are rejected.

A persistent encrypted HttpOnly cookie identifies a mandatory DB Session row with a 30-day
absolute expiry. Reads check the current user/role and row every time. `/[locale]/logout` is a
confirmation screen; GET never revokes. Its server action first revokes the decoded cookie's
matching user/session row, then clears cookies with Auth.js. If revocation fails, it returns a
localized retry error and retains the cookie. The raw Auth.js POST endpoint validates CSRF and
returns 503 if its sign-out event fails; it does not forward a misleading successful response.
Use `auth()` for identity, never the revocation decoder. Wrong passwords and missing emails use
the same localized credential error. No recovery, verification-email or admin-entry UI is added.

Browser regression tests are in `apps/web/e2e/auth`. With a disposable localhost database named
`*_auth_spike_test`, set `SIFT_AUTH_TEST_DATABASE_URL` for assertions and set the web server's
`DATABASE_URL` to the same database. Apply existing migrations and use only the non-destructive
catalogue seed. Start the app on 127.0.0.1:3144 with a fresh AUTH_SECRET, set
`SIFT_AUTH_E2E_URL=http://127.0.0.1:3144`, install Chromium with
`corepack pnpm --filter @sift/web exec playwright install chromium`, then run
`corepack pnpm --filter @sift/web test:auth:e2e`. Tests use their own browser profiles and create
unique disposable users. They check real Chromium process close/reopen, cookie replay, return
to a card detail URL with its query string, duplicate feedback, and both phone-width locales.
The default Vitest run does not start a browser or silently use an app database.

## SFT-40 server authorization contract

`lib/auth/guards.ts` is server-only. `requireUser()` permits user/admin and rejects visitors;
`requireAdmin()` permits only admin. Each call reads `auth()` anew, so the DB session and current
role are checked inside the handler/action. `Identity` returns only id, email and role.
`withRole(role, handler)` guards a route handler before executing its business logic and marks
responses private/no-store. User APIs return 401 for visitors; admin APIs return 403 for any
non-admin session, matching SFT-44's explicit contract. Clients cannot supply an identity/role
argument. Future shortlist queries must use the returned identity.id for ownership.

Protected entry-point inventory:

| Entry point                    | Check                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| /[locale]/account              | requireUser inside the server component; anonymous redirects to localized login         |
| /[locale]/logout server action | requireUser inside the action, then revokes its own cookie's session                    |
| /api/account GET/HEAD          | withRole(user); returns only the current user's identity regardless of query/header IDs |
| /api/admin/access GET/HEAD     | withRole(admin); read-only role probe, no admin dashboard or provisioning               |
| Development-only spike probes  | existing isolated spike auth plus server role check; still disabled in production       |

Registration/login/credential callbacks are public authentication entry points, protected by
server validation and Auth.js/Next.js CSRF controls rather than requiring an existing session.
Catalogue/card pages remain public. SFT-44 owns the separate admin entry; SFT-42/86 retain
shortlists/email verification. No visitor rows, migrations, or shared package contracts change.

## Run and visually inspect the complete stack

Open `C:/Users/fkbr1/Documents/Sift-sft40-server-roles` as a folder in Codex to inspect all
four issues together. Open the corresponding worktree in the table for an individual issue.
Each parent worktree stays at its own commit; no switching or rebasing is needed.

From the SFT-40 worktree, run:

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build
corepack pnpm --filter @sift/web auth:preview
```

The preview binds only to 127.0.0.1:3144 and creates a fresh PostgreSQL/WASM database on
127.0.0.1:55442. It applies the existing migrations to memory, inserts the non-destructive
catalogue fixtures, and creates two local users. It does not use .env database values or an
existing auth secret. It never truncates tables or drops databases, and never connects to a shared database. Ports must
be free; do not stop an unrelated process to free them. Ctrl+C stops the preview and discards
the memory database. This is test tooling, not the production database/deployment architecture.

The existing Next.js security reminder may stop the first build or dev invocation. Its normal
retry can complete the local check; do not treat a successful retry as fixing that advisory.
Resolve the dependency findings separately before deployment. No upgrade or security setting
change is performed by this launcher.

1. Visit http://127.0.0.1:3144/en/register and create a unique account using 8–128 Unicode
   characters. Prefer a long unique passphrase. You should reach My account already signed in.
2. Open /en/logout, cancel once to verify no revocation, then confirm. Try registering the
   same email again to see duplicate feedback. Repeat /ar/register at phone width.
3. Browse /en/cards/card_riyad_titanium?from=preview while signed out, click Sign in, and use
   the account you created. Verify the same detail URL/query returns after successful login.
4. Close and reopen the browser, then open /en/account. The persistent cookie should still
   work until the 30-day DB expiry. Stopping this disposable preview intentionally destroys
   its database and secret, so browser restart must leave the preview running.
5. Use the fixture `user@sift.local`, password `sift-dev-password`: /api/account is 200 and
   /api/admin/access is 403. With `admin@sift.local` (same local-only password), the admin
   probe is 200. Signed out, those endpoints return 401 and 403 respectively. These JSON
   endpoints are permission probes; SFT-44's separate admin sign-in/dashboard is not included.
6. Use DevTools Network to observe confirmation POST and session reads. Do not share cookies,
   passwords, or tokens. The automated tests replay saved cookies after logout and prove denial.

In another PowerShell terminal, browser tests against the preview can be run with:

```powershell
$env:SIFT_AUTH_TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55442/sift_auth_spike_test?schema=public&connection_limit=1&pgbouncer=true'
$env:SIFT_AUTH_SPIKE_TEST_DATABASE_URL=$env:SIFT_AUTH_TEST_DATABASE_URL
$env:SIFT_AUTH_E2E_URL='http://127.0.0.1:3144'
corepack pnpm --filter @sift/web exec playwright install chromium
corepack pnpm --filter @sift/web test:auth:e2e
corepack pnpm test
```

Tests create and remove only uniquely named fixture users in that disposable database. The
spike demo stays disabled unless SIFT_AUTH_SPIKE=1 is explicitly set for development.

## Security and release limits

All account/server routes run on Node, with server-side DB session/role revalidation. Cookie
transport requires HTTPS in production; never use this HTTP preview as a deployment recipe.
Set distinct strong AUTH_SECRET values and trusted host/proxy settings per environment.
`AUTH_SECRET` is currently the single configured key; plan/test rotation before changing keys.

The existing dependency audit findings (Next.js, effect and deepmerge-ts) are release risks,
not repaired by these issue branches. Auth.js v5 remains a pinned beta. The test database is
PostgreSQL/WASM with a socket multiplexer, not evidence of native PostgreSQL 16 concurrency
or hosted Vercel behavior. Validate those environments before deployment. Production ingress
must limit authentication request sizes/rates and monitor abuse; no distributed rate-limit
service, password recovery, verification mail, or expired-row cleanup job is provisioned here.
Those deployment policies should be reviewed with the platform owner. Expired rows are denied
immediately even before cleanup. The team learning exercise and Linear summary link remain
human follow-through; issue status, PRs, CI, merge and deployment are deliberately untouched.

## Verification record

| Worktree stage        | Automated result                                                                                  | Repository gates                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| SFT-41 finalization   | 333 passed, 1 optional DB test skipped at this stage; that DB test passed later in the full stack | format, lint, build, package typechecks, whitespace passed |
| SFT-38                | 352 passed, including registration unique-constraint race checks on disposable PostgreSQL/WASM    | same gates passed                                          |
| SFT-39                | 375 passed; 3 Chromium browser scenarios passed, including actual process restart                 | same gates passed                                          |
| SFT-40 complete stack | 383 passed against the documented preview DB; all 4 browser scenarios passed                      | same gates passed                                          |

The browser scenarios cover localized registration/duplicate feedback and phone layout, confirmed
logout and copied-cookie rejection, real browser close/reopen persistence, return to the same
card detail URL/query, direct visitor/user/admin requests, ignored forged role/user-ID inputs,
and denial after an admin is demoted or deleted. Screenshots were inspected for both locales.
Unit/HTTP tests cover weak passwords, hashing, generic credential errors, CSRF, expiry, database
failure handling and protected handler/action rechecks. The default test command skips explicit
DB tests unless their localhost-only environment variables are supplied.

No hosted CI or deployment was run. Native PostgreSQL 16 concurrency, hosted HTTPS behavior,
production rate/body limits, and team learning sign-off remain unverified. Password policy
uses the documented Unicode bounds and local common-password blocklist; no external breached-password service is configured.
The build emits the existing framework security reminder and a Prisma CommonJS-export warning;
local checks pass after the framework's reminder retry, without any dependency security fix.
All four branches are ready for separate local code review in dependency order; this does not
claim the repository's remote Definition of Done or that every teammate completed the learning
exercise. The owner must publish/link the summary and collect that learning outcome.
