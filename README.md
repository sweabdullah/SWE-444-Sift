# Sift

A bilingual (Arabic / English) public catalogue of credit cards from Saudi banks, in which every figure on the page traces back to the bank that published it.

SWE 444 — Software Construction Laboratory · King Saud University · 2026/2027 Semester 1
Backlog and Sprint plan: **Linear** workspace `swe444sift`, team **Sift** (issues `SFT-…`).

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

| Command                  | What it does                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `pnpm build`             | Builds every package, in dependency order                                               |
| `pnpm lint`              | ESLint over the whole repo, then `lint:logical` (bans left/right utilities in apps/web) |
| `pnpm format`            | Rewrites files with Prettier                                                            |
| `pnpm format:check`      | Fails if any file isn't Prettier-formatted                                              |
| `pnpm typecheck`         | Strict TypeScript check of every package                                                |
| `pnpm check`             | Format check → lint → build (CI also runs tests and migrations)                         |
| `pnpm --filter web dev`  | Runs the web app at http://localhost:3000 (`/` redirects to `/ar`)                      |
| `pnpm --filter web test` | Vitest unit tests for apps/web                                                          |

Run `pnpm check` before you open a pull request.

**Deployment.** Pull requests get a Vercel preview, and merges to `main` deploy to production, in both cases only after the `ci` workflow passes in GitHub Actions. Setup, environment variables, rollback and verification: [`docs/deploy.md`](docs/deploy.md).

## Repository layout

**Internationalisation.** How to add a translated string and format amounts, percentages and dates: [`docs/i18n.md`](docs/i18n.md).

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

**Branches.** Never commit to `main` — it only changes through pull requests (see [Branch protection](#branch-protection)). Name branches after the Linear issue:

```
sft-7-nextjs-tailwind
sft-6-postgres-prisma
```

**Pull requests.** Put the Linear ID in the title (`SFT-7: Configure Next.js with TypeScript and Tailwind`) so Linear links the PR to the issue. Merge once CI is green; no approving review is required. The PR template carries the Definition of Done — tick it honestly.

**AI-drafted PRs.** A pull request drafted by an AI agent is a draft for the lane owner, nothing more. The lane owner must read and understand every line and modify it as needed. Academic integrity requires this.

**Secrets.** Database URLs, AI keys and email keys go in `.env` (git-ignored) and in the hosting platform's environment settings. Never commit them. When a package needs a new variable, add it with a dummy value to that package's `.env.example`.

**Bilingual and RTL from day one.** Every user-facing string exists in Arabic and English. Use logical CSS properties (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`) — never `left` / `right` — and check every screen in Arabic at phone width before opening a pull request. What mirrors, the bidi traps with numbers and mixed text, and how to check a screen: [`docs/rtl.md`](docs/rtl.md).

## Lanes and contracts

Each member owns a **lane** — a vertical slice of the product, from database to screen (see [Team](#team)).

- Shared contracts live in two places: `packages/schema` (Zod schemas and the types derived from them) and `packages/db` (the Prisma schema and typed data-access functions). Lanes build on these instead of inventing their own shapes.
- A change to a shared contract is its own small pull request, announced to every lane it touches. Don't bury a contract change inside a feature PR.
- Seed data and `apps/ingest/fixtures` let each lane work against realistic data without waiting for another lane to finish.

## Branch protection

The repository is private on a free GitHub plan, so GitHub does **not** enforce protection or required checks on `main`. Until the repo is made public or the plan is upgraded, the team rule stands in for it: **never push to `main`; merge only through a pull request with green CI.**

## Definition of Done

A backlog item is Done only when **all** of these hold:

1. Every acceptance criterion is demonstrated, not asserted.
2. CI is green — build, lint and tests all pass.
3. It is merged to `main` through a pull request and automatically deployed to the **public URL**.
4. Both locales render, and the Arabic view has been checked in RTL at phone width.
5. Any protected route re-checks authorisation **on the server**, not only in the UI.
6. No new console errors or unhandled promise rejections.
7. This README or the schema notes are updated if setup or data shape changed.

## Team

| Member                 | Role                      | Lane                                              |
| ---------------------- | ------------------------- | ------------------------------------------------- |
| Abdullah Alammar       | Product Owner · Developer | A — Platform, data & release                      |
| Ammar                  | Developer                 | B — Visitor catalogue, comparison & notifications |
| Faisal Alrusayni (RSN) | Developer                 | C — Accounts, roles & administration              |
| Faisal TWJ             | Developer                 | D — Find & narrow + AI extraction                 |
| Nofal Almubarak        | Developer                 | E — Crawl, discovery & change detection           |

The Scrum Master rotates every Sprint, so each member holds it twice.
