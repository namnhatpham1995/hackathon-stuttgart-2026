# Production deploy

Two deployments of this repo, both from `main`.

- **Railway** runs the full Next.js server (Node 22, `pnpm build`, pre-deploy `pnpm db:migrate`, `pnpm start` on `$PORT`) and a Railway PostgreSQL service. Every `/api/*` route (auth, uploads, jobs, assistant) is served here. The job runner lives here: Railway has no 4.5 MB body limit and no function timeout.
- **Vercel** serves pages and the UI. When `BACKEND_URL` is set, `next.config.ts` rewrites `/api/:path*` to `${BACKEND_URL}/api/:path*` before the app's own API routes, so the browser stays on the Vercel origin and Better Auth cookies still work. Vercel never migrates. Its server components and server actions read the same Railway Postgres through `DATABASE_URL` (the public connection URL).
- Local dev leaves `BACKEND_URL` unset, so nothing is proxied.

`BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are identical on Railway and Vercel. `BETTER_AUTH_URL` and `APP_BASE_URL` are the Vercel origin (`https://<project>.vercel.app`, no path, no trailing slash). Do not set `BACKEND_URL` on Railway. Production `GEMINI_MODEL` is `gemini-3.6-flash`.

`railway.json` records the Railpack builder, `pnpm build`, pre-deploy `pnpm db:migrate`, `pnpm start`, and healthcheck `GET /api/health` (`{ "ok": true }`, no database). A Railway project created now does not read that file: Config as Code is closed to new services, and existing files stop being read on 2026-12-01. Copy the same four settings onto the service. `next start` listens on `$PORT` (hostname `0.0.0.0` by default).

The roadmap is a different Vercel project whose root directory is `roadmap/`. Do not reuse it here.

Migrations are additive. Rollback does not need a down migration.

## 1. Railway project and Postgres

Install the CLI if needed: `npm install -g @railway/cli`.

```bash
railway login
railway init --name exportready
railway add --database postgres --json
railway add --repo namnhatpham1995/hackathon-stuttgart-2026 --service exportready --json
```

`railway add --json` prints `serviceName`. The Postgres plugin's default name is `Postgres`. If the printed name differs, use that name in the `${{...}}` references below.

In the Railway dashboard, open the **exportready** service → Settings:

| Setting | Value |
|---|---|
| Builder | Railpack |
| Build command | `pnpm build` |
| Pre-deploy command | `pnpm db:migrate` |
| Start command | `pnpm start` |
| Healthcheck path | `/api/health` |
| Healthcheck timeout | 300 seconds |
| Branch | `main` |
| Root directory | repository root |

Region: Frankfurt (`europe-west4`) when the dashboard offers it.

Generate one secret and reuse it on Vercel:

```bash
node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

Set variables on **exportready**. `--skip-deploys` avoids a deploy before the build settings and the Vercel URL exist. Replace the placeholders. Do not commit the values.

```bash
railway variable set \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  RAILPACK_NODE_VERSION=22 \
  GEMINI_MODEL=gemini-3.6-flash \
  'BETTER_AUTH_URL=https://<project>.vercel.app' \
  'APP_BASE_URL=https://<project>.vercel.app' \
  --service exportready \
  --skip-deploys

printf '%s' '<paste-secret>' | railway variable set BETTER_AUTH_SECRET --stdin --service exportready --skip-deploys
printf '%s' '<paste-gemini-key>' | railway variable set GEMINI_API_KEY --stdin --service exportready --skip-deploys
printf '%s' '<paste-brevo-key>' | railway variable set BREVO_API_KEY --stdin --service exportready --skip-deploys
printf '%s' '<verified-sender@example.com>' | railway variable set BREVO_SENDER_EMAIL --stdin --service exportready --skip-deploys
```

`DATABASE_URL=${{Postgres.DATABASE_URL}}` is the private URL. The Railway service uses that. Leave `BACKEND_URL` unset here.

`RAILPACK_NODE_VERSION=22` pins Node 22. Railpack otherwise reads `package.json` `engines` (`>=22.12`), which can resolve to a newer major.

After the first successful deploy, Settings → Networking → Generate Domain. That hostname is `BACKEND_URL` on Vercel (`https://<domain>`, no path, no trailing slash).

## 2. Vercel project

Install the CLI if needed: `npm install -g vercel`.

```bash
vercel login
vercel link
```

In the dashboard, Project → Settings → Build and Deployment:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | repository root (empty). Do not set `roadmap/`. |
| Node.js Version | 22.x |
| Install Command | default (pnpm from `packageManager`) |
| Build Command | Override: `node scripts/vercel-build.mjs` |
| Output Directory | default. Do not set one |
| Ignored Build Step | **Only build production** |
| Production Branch | `main` |

If a Preview Deployments toggle is shown, turn it off. The build script only runs `next build`. It never migrates.

`BACKEND_URL` is read when Vercel builds, so set it before the first good deploy. Production only. Do not copy these to Preview.

```bash
printf '%s' 'https://<railway-domain>' | vercel env add BACKEND_URL production
printf '%s' '<railway-public-postgres-url>' | vercel env add DATABASE_URL production
printf '%s' '<same-secret-as-railway>' | vercel env add BETTER_AUTH_SECRET production
printf '%s' 'https://<project>.vercel.app' | vercel env add BETTER_AUTH_URL production
printf '%s' 'https://<project>.vercel.app' | vercel env add APP_BASE_URL production
```

Vercel's `DATABASE_URL` is Railway's **public** Postgres URL (`DATABASE_PUBLIC_URL` on the Postgres service, or the Connect tab string whose host is public). Keep `sslmode=require`. It is not `${{Postgres.DATABASE_URL}}`: that host is private to Railway.

Leave these unset on Vercel: `GEMINI_API_KEY`, `GEMINI_MODEL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, and the Google and GitHub client variables. Gemini and Brevo run on Railway, with the API routes.

## 3. Deploy

Save both sides, then:

```bash
railway up --service exportready --detach
vercel --prod
```

Git deploys from `main` after the projects are connected. Railway's deploy log must show `pnpm db:migrate` before `pnpm start`, and `GET /api/health` must return `{"ok":true}`. Vercel's build log must show `vercel-build: running next build` and must not run `pnpm db:migrate`.

`Migrated` is printed by `pnpm db:migrate`. Do not point either `DATABASE_URL` at a database you are not willing to migrate. Only Railway migrates.

## 4. Rollback

- Railway: Deployments → the previous deployment whose status is Success → Redeploy. Redeploy does not run a down migration.
- Vercel: Deployments → filter **Production** → the previous deployment whose status is Ready → **⋯** → **Promote to Production**. Promote does not rebuild and does not migrate.

## When something fails

- Railway healthcheck never goes green: the service must listen on `$PORT`, the healthcheck path is `/api/health`, and `BACKEND_URL` is unset on Railway (a value there proxies `/api` away from this service).
- `Invalid environment` or `BETTER_AUTH_SECRET must be at least 32 characters`: a required variable is missing or the secret is short. The secret and `BETTER_AUTH_URL` must match Vercel.
- Vercel still answers `/api/*` itself: `BACKEND_URL` was empty at build time. Set it and redeploy.
- Vercel cannot connect to Postgres: `DATABASE_URL` is the private Railway host. Use the public URL.
