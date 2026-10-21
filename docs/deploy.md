# Deploying Sift (web app)

Owner: **Abdullah (Lane A)**. Linear: [SFT-9](https://linear.app/swe444sift/issue/SFT-9).

This covers the public web app (`apps/web`) and its Postgres database. The ingest worker (`apps/ingest`) is **not** deployed here: it needs long-running crawls and a scheduler, and its host is decided in SFT-52. The web app never crawls; the worker never serves a page.

## Decisions

### Web host: Vercel

Next.js is Vercel's own framework, so App Router, the `proxy.ts` locale redirect, static generation and preview URLs work without adapters. The free Hobby plan is enough for a course project. The repo is a pnpm monorepo, so the Vercel project uses **Root Directory `apps/web`** and `apps/web/vercel.json` builds the web app together with the workspace packages it imports (`pnpm --filter @sift/web... run build` builds `@sift/schema` first, then `next build`).

### How "deploy when CI passes" works

Vercel normally deploys on every push, whether or not CI passed. We want the opposite, so:

- `apps/web/vercel.json` sets `git.deploymentEnabled: false`, which turns off Vercel's own Git auto-deploy.
- `.github/workflows/deploy.yml` runs `pnpm check` first. Only if it passes does it build and deploy with the Vercel CLI: a **Preview** deployment for every pull request, and a **Production** deployment for every push (merge) to `main`.

Why not the simpler options:

- **GitHub required status checks** would block merging until CI passes, but they need branch protection or rulesets, which GitHub does not offer on a free plan for private repos. They also gate the merge, not the deploy.
- **Vercel's "Ignored Build Step"** can skip a build, but it runs before or alongside CI and can't wait for the result.
- **Vercel Hobby and private repos:** Hobby has no team collaboration on private repos, so Vercel can block deployments of commits written by people other than the account owner, and on this team that means most merges. With the CLI deploy, the deployment runs under Abdullah's token no matter who wrote the commit.

If the team would rather use Vercel's Git integration (for example after making the repo public), delete the `git` block from `vercel.json`, set the env var `ENABLE_EXPERIMENTAL_COREPACK=1` in Vercel so it uses the pinned pnpm, and remove the deploy jobs from the workflow. With that setup Vercel deploys even when CI is red.

### Database: Neon (recommended) or Supabase

|                                             | **Neon** (recommended)                                                                                                 | Supabase                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| What it is                                  | Serverless Postgres only                                                                                               | Postgres plus auth, storage, realtime                                                                            |
| Free tier (check at sign-up; limits change) | ~0.5 GB per project; compute sleeps after ~5 min idle and wakes on the next query (a short delay on the first request) | ~500 MB; the whole project is **paused after about a week with no activity** and must be resumed by hand         |
| Pooled URL for the app                      | Same host with `-pooler` in the name                                                                                   | Supavisor transaction pooler, port `6543`                                                                        |
| Direct URL for migrations                   | Host without `-pooler`                                                                                                 | Port `5432` (the direct host may be IPv6-only; use the session pooler from IPv4 networks such as GitHub Actions) |
| Region near Saudi users                     | AWS Frankfurt (`eu-central-1`)                                                                                         | AWS Frankfurt (`eu-central-1`)                                                                                   |
| Vercel fit                                  | Official Vercel integration; can create a database branch per Preview                                                  | Works fine, without per-preview branches                                                                         |

**Recommendation: Neon.** We only need Postgres (Prisma handles the schema, and auth is our own), and a database that pauses after a quiet week would take the public site down between Sprints. Neon's sleep-on-idle only adds a short delay to the first request.

**Region:** create the database in **Frankfurt (`eu-central-1`)** unless the provider lists a Gulf region at creation time. `vercel.json` pins the web functions to `fra1` (Frankfurt) so they run next to the database. If you choose a different database region, change `regions` in `apps/web/vercel.json` to the matching Vercel region. What matters most is keeping the function and the database in the same region.

## Environment variables

Never commit real values. They go in Vercel (Project → Settings → Environment Variables) and, for migrations, in GitHub secrets. `apps/web/.env.example` lists them with placeholders.

| Variable               | Preview                                    | Production                                | Secret?                  | Notes                                                                    |
| ---------------------- | ------------------------------------------ | ----------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL` | optional (preview URL)                     | `https://<production-domain>`             | No (shipped to browsers) | No trailing slash. Inlined at build time, so redeploy after changing it. |
| `DATABASE_URL`         | pooled URL of the **preview/dev** database | pooled URL of the **production** database | Yes                      | Needed once SFT-6 (Prisma) lands. Keep `?sslmode=require`.               |
| `DIRECT_URL`           | direct URL, preview DB                     | direct URL, production DB                 | Yes                      | Only Prisma migrations use it. Must not be the pooled URL.               |
| `AUTH_SECRET`          | random, preview-only                       | random, different from preview            | Yes                      | Needed once accounts land. `openssl rand -base64 32`.                    |

GitHub repository settings (Settings → Secrets and variables → Actions):

| Name                | Kind     | Value                                                                                      |
| ------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `VERCEL_TOKEN`      | Secret   | A token from Vercel Account Settings → Tokens (Abdullah's account)                         |
| `VERCEL_ORG_ID`     | Secret   | `orgId` from `.vercel/project.json` after `vercel link`                                    |
| `VERCEL_PROJECT_ID` | Secret   | `projectId` from the same file                                                             |
| `PROD_DIRECT_URL`   | Secret   | Production direct DB URL, for the migration step (after SFT-6)                             |
| `VERCEL_DEPLOY`     | Variable | `true`. This turns the deploy jobs on. Until it is set they are skipped and CI still runs. |

## Checklist (Abdullah, Lane A)

Tick each step in the SFT-9 PR or Linear issue as you go.

1. **Create the Vercel account** with "Continue with GitHub" as `sweabdullah` (Hobby plan).
2. **Give Vercel access to the private repo:** when importing, install the Vercel GitHub App and choose _Only select repositories → SWE-444-Sift_.
3. **Import the project:** Add New → Project → `SWE-444-Sift`.
   - Framework preset: **Next.js**.
   - Root Directory: **`apps/web`**. Leave "Include files outside the root directory" **on**, because the app imports `packages/*`.
   - Leave the build and install commands on their defaults. `apps/web/vercel.json` overrides them.
   - The first deploy from the import screen may run even though Git deploys are off. That's fine.
4. **Set Node.js 22:** Project → Settings → Build and Deployment → Node.js Version → **22.x** (matches `.nvmrc`; `engines` says `>=22`, which could otherwise pick a newer major).
5. **Create the database** (Neon): new project `sift`, Postgres 17 or the current default, region **AWS Frankfurt**. Create two databases or branches: `production` and `preview`. Copy, for each:
   - the **pooled** connection string (Connection pooling **on**) → `DATABASE_URL`
   - the **direct** connection string (pooling off) → `DIRECT_URL`
6. **Add the env vars in Vercel** from the table above, setting Preview and Production values separately (untick the other environment when adding each one). Leave Development empty, since local work uses `.env.local`.
7. **Link the repo locally** to get the IDs: in the repo root run `npx vercel@latest link`, pick the project, and copy `orgId` and `projectId` from `.vercel/project.json`. `.vercel/` is git-ignored, so don't commit it.
8. **Add the GitHub secrets and variable** from the second table. Set `VERCEL_DEPLOY=true` last.
9. **Preview deployments per PR:** open or update any PR. The _Deploy_ workflow runs `pnpm check`, then _Preview deployment_, and the job summary shows the preview URL. A red check means no deploy.
10. **Production deploys on merge:** merge a PR to `main`. The workflow runs `check` then _Production deployment_, and the summary says `Production is now commit <sha> (<url>)`.
11. **Migrations on deploy** (after SFT-6 merges): uncomment the _Apply database migrations_ step in `.github/workflows/deploy.yml` and add the `PROD_DIRECT_URL` secret. It runs `prisma migrate deploy` against the production DB **after** checks pass and **before** the new code goes live, so code never runs against a schema it doesn't expect. Write migrations to be backward-compatible (add first, remove in a later release) so the old deployment keeps working during the switch and after a rollback. Preview builds don't migrate. Run `prisma migrate deploy` against the preview DB by hand when a PR needs a new schema.
12. **Find which commit is live:** use any of
    - Vercel → Project → Deployments: the deployment marked **Production / Current** shows its commit
    - GitHub → Actions → latest _Deploy_ run on `main` → summary line `Production is now commit <sha>`
    - `npx vercel@latest inspect <production-url>` prints the deployment's metadata, including the `commit` meta field
13. **Rollback:** in Vercel → Deployments, open the last good production deployment → **Instant Rollback** (on Hobby you may only be able to roll back to the immediately previous one). After a rollback, Vercel stops moving the production domain automatically, so once the fix ships use **Promote** (or undo the rollback) on the new deployment. For anything older, `git revert` the bad commit on a branch, open a PR and merge it. That deploys through the normal path. Rolling back code doesn't roll back the database, so see step 11.
14. **Verify from outside the team network:** on a phone using mobile data (not campus or home Wi-Fi), open `https://<production-domain>/ar`.
    - The page loads, and the Arabic text reads right-to-left.
    - From any terminal: `curl -s https://<production-domain>/ar | grep -o '<html[^>]*>'` should show `lang="ar"` and `dir="rtl"`. `/en` should show `lang="en"` and `dir="ltr"`.
    - Paste the production URL, the commit SHA from step 12 and the curl output into the SFT-9 Linear issue. These are the evidence for its acceptance criteria.
