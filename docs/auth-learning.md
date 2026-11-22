# SFT-41 — Auth.js learning spike

Review branch: `codex/sft-41-auth-learning`. Based on `origin/main` at `673f488`.
Issue: [SFT-41](https://linear.app/swe444sift/issue/SFT-41).
This is a local, opt-in demonstration, not the account feature or a shared auth contract.

## What to learn and demonstrate

The issue requires understanding providers, the database adapter, sessions, callbacks,
password hashing, and server-side role protection. Its outcome is that every developer
can add a protected route and explain where its checks run.

The issue's October 21 comment proposes a credentials/Prisma session-row demo, a server
component reading that session, direct anonymous/user/admin requests, hashing notes,
and a summary linked from Linear. This document and the demo cover the technical parts.
The team still needs to walk through the exercise below. Link this document from the
issue once the owner approves publishing a reviewable branch; no remote link is claimed
while the work remains local.

## Decision: JWT transport with a mandatory database session

Pinned versions: `next-auth@5.0.0-beta.32`, `@auth/prisma-adapter@2.11.3`.
The App Router integration is the Auth.js v5 API; the npm stable tag is still v4.
Do not silently upgrade these versions while reviewing the spike.

The [Credentials restriction](https://authjs.dev/reference/core/errors#unsupportedstrategy)
requires `session.strategy = "jwt"`. Configuring a Prisma adapter alone does **not** make
Credentials create users or database sessions. Native `strategy = "database"` with a
Credentials provider raises `UnsupportedStrategy`.

A standalone JWT cookie is unsuitable for SFT-39: clearing it on logout does not invalidate
a previously copied cookie. Auth.js describes that limitation in its
[session strategies](https://authjs.dev/concepts/session-strategies).

The spike therefore uses supported JWT callbacks plus the existing `Session` model as
a server-side allowlist:

1. `Credentials.authorize` looks up an existing user and compares the password hash.
   It returns only safe identity fields; it does not register anyone.
2. The first `jwt` callback creates a cryptographically random 256-bit session identifier
   and a `Session` row through `PrismaAdapter.createSession`. The row belongs to that
   user and expires after 24 hours.
3. Auth.js encrypts the identifier inside its JWT session cookie. This uses Auth.js's
   existing encoding, CSRF, and cookie handling; no custom encoder or cookie forgery.
4. On **every** session read, `jwt` looks up the row and its current user. Missing,
   expired, wrong-owner, or deleted-user records return `null`. Database failures fail
   closed in Auth.js. Current role and public identity fields are reloaded from the DB.
5. The `session` callback exposes identity, role, and the database expiry. It never exposes
   the session identifier, password hash, or unsubscribe token in browser-readable JSON.
6. Sign-out deletes the row using the `signOut` event. Replaying the old encrypted cookie
   now fails the mandatory lookup. Expiry is **absolute**, not sliding: JWT rotation never
   extends the row's deadline.

This is a hybrid strategy, not Auth.js's native database strategy. Its cost is one database
lookup per session read and custom callback wiring that must remain tested. Never replace
`auth()` with a bare JWT decoder or cache its result across requests: either would bypass
revocation and fresh role checks. This is a demonstrated option for SFT-38/39, not permission
to replace the team's auth architecture or schema.

Auth.js [sign-out implementation](https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/lib/actions/signout.ts)
logs event failures and still clears cookies. The installed beta was inspected as well.
`createSpikeSignOutAttempt` captures those failures per request. The HTTP wrapper returns
503 without forwarding a success response; the server action throws rather than redirecting
to success. A database outage cannot guarantee revocation: treat that logout as failed,
retry it, and never tell the user that clearing a cookie invalidated the server session.

## Provider, adapter, callbacks, and schema boundaries

- **Provider**: verifies credentials; Auth.js does not hash passwords or implement registration.
- **Adapter**: connects Auth.js to the existing Prisma models. Its session creator is called
  explicitly by our JWT callback because Credentials does not do so automatically.
- **JWT callback**: issues and validates the server session; ignores client session-update data.
- **Session callback**: filters the validated identity for callers.
- **Sign-out event**: revokes that specific server row, with failure detection in callers.

The Prisma schema, migrations, catalogue exports, seeds, and `packages/schema` are unchanged.
Visitors have no `User` row; `UserRole` correctly remains `user | admin`. `emailVerified`
already exists and remains available to Ammar's SFT-86. Login is not conditional on email
verification; that issue explicitly permits unverified users to browse and shortlist.
No production admin provisioning or seed reset is performed by this demo.

Spike files live under `lib/auth-spike`, `/[locale]/auth-spike`, `/api/auth-spike`, and
`/api/auth-spike-demo`. A separate cookie name avoids colliding with future public auth.
The spike's Session type augmentation is local scaffolding to revisit when the team agrees
on the SFT-38/39 interface; consumers should not import spike modules as production contracts.

## Password hashing

Existing development users use **bcrypt**, via `bcryptjs`, at cost 10. The spike verifies
those hashes unchanged; tests use the same algorithm. The missing-account dummy hash uses
cost 12. It avoids the obvious no-hash fast path, but does not promise constant-time account
privacy across different hash costs or database timing.

Bcrypt is a salted, one-way password hash, not reversible encryption. Its work factor makes
guessing expensive, and its encoded hash stores the salt/cost for verification. Registration
in SFT-38 should choose and benchmark its production policy (proposed bcrypt cost 12, with
compatible verification of older hashes), enforce it on the server, and state the password
rules in both locales. Argon2id is another option if the team chooses it and verifies deployment
support; it is not required merely to read existing bcrypt seeds.

Bcrypt truncates beyond **72 UTF-8 bytes**, so this spike rejects oversized passwords before
comparison, including multibyte passwords. Do not trim or normalize a password. Email lookup
is trimmed/lowercased to match the existing seed convention; SFT-38 owns the final email
normalization and duplicate policy. Null `passwordHash` accounts cannot sign in with credentials.
Errors remain generic. No passwords or hashes are returned to the browser or put in JWTs.

## Where authorization happens

`app/api/auth-spike-demo/[role]/route.ts` reads `auth()` **inside the handler**, then calls
`spikeAccessStatus`. A visitor receives 401; an ordinary user on an admin probe receives
403; the appropriate signed-in role receives 200. Responses are not cached. The server
component similarly reads the validated session on the server.

Client navigation and proxy checks can improve usability but cannot protect a mutation.
SFT-40 must apply guards in every protected route handler and server action, with ownership
checks for user data. The probe helper is a teaching example, not that comprehensive rollout.
SFT-44 later requires 403 for any non-admin session on admin APIs; keep its explicit status
contract when implementing that separate admin entry.

## Run the local demonstration

Use Node >=22 and the repository's pinned **pnpm 10.28.0**. If the host `pnpm` wrapper uses
a different version, `corepack pnpm` selects the repository version.

1. Run `corepack pnpm install --frozen-lockfile` and `corepack pnpm build`.
2. Provision a **disposable local** PostgreSQL database. Apply existing migrations with
   `corepack pnpm --filter @sift/db db:deploy` using its `DATABASE_URL`.
3. If needed, run the existing development seed **only against that disposable database**.
   `db:seed` truncates all Sift tables. Never use a teammate/shared/production database.
4. In `apps/web/.env.local`, set that database URL, a fresh random `AUTH_SECRET` of at least
   32 bytes, and `SIFT_AUTH_SPIKE=1`. Example placeholders are in `.env.example`.
5. Run `corepack pnpm --filter @sift/web dev`. Visit `/ar/auth-spike` or `/en/auth-spike`.
   Existing development credentials are listed in `packages/db/SEED.md`.

The gate requires both `NODE_ENV=development` and the opt-in. Production and ordinary test
runs return 404 from the demo endpoints/page, even if the flag is set. Do not expose this dev
server publicly: rate limits, account recovery, registration, and production abuse controls
are outside this spike. Auth.js supplies HttpOnly/SameSite cookie defaults and Secure on HTTPS;
localhost HTTP is only for this development demo.

Walkthrough for each developer:

1. Sign in as the seeded ordinary user. Observe one new `session` row (Prisma Studio or SQL)
   and the identity rendered by the server component. Never copy tokens into learning notes.
2. Save the session cookie locally, confirm sign-out, then replay the saved cookie against
   the session endpoint. It must no longer authenticate.
3. Use direct requests, with no UI dependency:

   ```bash
   curl -i http://localhost:3000/api/auth-spike-demo/user
   curl -i --cookie cookies.txt http://localhost:3000/api/auth-spike-demo/admin
   ```

   The first is 401. Export a valid ordinary-user cookie to `cookies.txt` for the second:
   it is 403. The same admin probe with an administrator cookie is 200.

4. Change a local admin's DB role to `user` and repeat with its old cookie: 403 immediately.
5. Explain why neither hidden links nor JWT claims alone authorize a request. Add a disposable
   probe calling `auth()` and the guard inside its handler, then demonstrate denial directly.
6. Inspect Arabic at phone width and switch locales. Explain provider vs adapter vs callbacks,
   the 72-byte bcrypt limit, and which database operation invalidates the session.

## Verification and remaining work

The production dependency audit reports 2 high and 7 moderate advisories in the existing
`deepmerge-ts@7.1.5`, `effect@3.21.0`, and `next@16.4.2` dependencies (all present in the base
lockfile). Next.js also interrupts a first build attempt with its security reminder. These
updates are outside SFT-41; no framework/Prisma upgrade was attempted. Review the audit before
production authentication work.

Validated locally: the full suite passed 334 tests (including the optional Prisma test),
and the running Next.js app passed direct-request and cookie-replay smoke checks. The real
browser demo signed in and out through its server actions, switched locale while signed in,
and rendered cleanly at 390 × 844 in Arabic and English with no browser console errors.
A saved-cookie/new-client test covers persistence; a real process-level browser restart has
not been demonstrated.

`corepack pnpm test` exercises real Auth.js HTTP handlers with a memory-backed Prisma test
boundary: successful credentials, persistent cookie reuse, CSRF, generic errors, expiry,
revocation/replay, role changes, client tampering, database failures, and protected handlers.
Server-rendered tests cover both locales and the root direction/language attributes.

An optional test uses a real Prisma client against a disposable localhost PostgreSQL:
set `SIFT_AUTH_SPIKE_TEST_DATABASE_URL` to a database whose name ends in `_auth_spike_test`,
apply migrations, then run:

```bash
corepack pnpm --filter @sift/web exec vitest run lib/auth-spike/auth.test.ts
```

It creates one unique test user, verifies the session row, checks login/read/logout/replay,
and removes that user (cascading sessions) afterward. It never falls back to `DATABASE_URL`.
During this spike it was also run against temporary PGlite PostgreSQL/WASM over its PostgreSQL
wire socket, with both existing SQL migrations applied and no application schema changes.
That exercises Prisma queries and constraints, but is not evidence about native PostgreSQL 16
concurrency or deployed Vercel behavior.

Before production account work: agree session interfaces with SFT-42/44/86 owners; select
session duration/cleanup policy; implement registration validation and abuse controls; test
native PostgreSQL and hosted HTTPS/secret configuration; demonstrate real browser restart and
session isolation; resolve the framework's reported security advisory.
Full return-to-origin UX, registration, comprehensive guards, and email verification belong
to SFT-38/39/40/86 respectively. A team walkthrough and publishing/linking this summary are
still owner review steps; this branch does not mark Linear Done.
