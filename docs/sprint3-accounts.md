# Sprint 3 accounts: local branch stack

No branch is pushed, deployed, or merged by this work. Linear records stay unchanged.

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
trimmed or normalized: at least 15 Unicode characters and at most 72 UTF-8 bytes, bcrypt cost 12.
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
