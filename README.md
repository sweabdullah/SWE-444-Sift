# Sift

A bilingual (Arabic / English) public catalogue of credit cards from Saudi banks, in which every figure on the page traces back to the bank that published it.

SWE 444 — Software Construction Laboratory · King Saud University · 2026/2027 Semester 1
Backlog and Sprint plan: **Linear → Sift** (issues `SFT-…`).

---

## Getting started

Requirements: **Node 22** (see `.nvmrc`) and **pnpm 10**. If you don't have pnpm, `corepack enable` installs the version pinned in `package.json`.

```bash
git clone https://github.com/sweabdullah/SWE-444-Sift.git
cd SWE-444-Sift
pnpm install
pnpm build
```

That's the whole setup. If `pnpm build` passes on a fresh clone, your environment is right.

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `pnpm build`        | Builds every package, in dependency order       |
| `pnpm lint`         | ESLint over the whole repo                      |
| `pnpm format`       | Rewrites files with Prettier                    |
| `pnpm format:check` | Fails if any file isn't Prettier-formatted      |
| `pnpm typecheck`    | Strict TypeScript check of every package        |
| `pnpm check`        | Everything CI runs: format check → lint → build |

Run `pnpm check` before you open a pull request.

## Repository layout

```
apps/
  web/        Public web app (Next.js) — catalogue, comparison, accounts, admin
  ingest/     Ingestion worker — crawl, extract, diff, schedule
packages/
  db/         Prisma schema, migrations and seed — shared by web and ingest
  schema/     Shared domain types and validation, defined once
```

**The web app never crawls. The worker never serves a page.** They share the database and the `packages/*` code, nothing else. The worker is a separate long-running service because a bank crawl takes minutes and serverless request timeouts would kill it mid-run.

A package depends on another with `"@sift/schema": "workspace:*"` in its `package.json`.

## How we work

**Branches.** Never commit to `main` — it is protected and only changes through reviewed pull requests. Name branches after the Linear issue:

```
sft-7-nextjs-tailwind
sft-6-postgres-prisma
```

**Pull requests.** Put the Linear ID in the title (`SFT-7: Configure Next.js with TypeScript and Tailwind`) so Linear links the PR to the issue. One approving review is required to merge; pipeline work (S-41, S-44, S-50) needs two. The PR template carries the Definition of Done — tick it honestly.

**Secrets.** Database URLs, AI keys and email keys go in `.env` (git-ignored) and in the hosting platform's environment settings. Never commit them. When a package needs a new variable, add it with a dummy value to that package's `.env.example`.

**Bilingual and RTL from day one.** Every user-facing string exists in Arabic and English. Use logical CSS properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`) — never `left` / `right` — and check every screen in Arabic at phone width before asking for review.

## Definition of Done

A backlog item is Done only when **all** of these hold:

1. Every acceptance criterion is demonstrated, not asserted.
2. The work is on a pull request, reviewed and approved by one teammate.
3. CI is green — build, lint and tests all pass.
4. It is merged to `main` and automatically deployed to the **public URL**.
5. Both locales render, and the Arabic view has been checked in RTL at phone width.
6. Any protected route re-checks authorisation **on the server**, not only in the UI.
7. No new console errors or unhandled promise rejections.
8. This README or the schema notes are updated if setup or data shape changed.

## Team

| Member     | Role                      |
| ---------- | ------------------------- |
| Abdullah   | Product Owner · Developer |
| Ammar      | Developer                 |
| Nofal      | Developer                 |
| Faisal TWJ | Developer                 |
| Faisal RSN | Developer                 |

The Scrum Master rotates every Sprint, so each member holds it twice.
