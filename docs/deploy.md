# Production deploy

The app deploys from `main` on Vercel, with Neon Postgres from the Vercel Marketplace. This is the
app project. The roadmap is a different Vercel project whose root directory is `roadmap/`; do not
reuse it here.

Migrations run only when `VERCEL_ENV` is `production` (`scripts/vercel-build.mjs`). Preview
deployments stay off: there is no pre-prod database, and a preview build must never migrate
production. Rollback is Promote of the previous production deployment. Migrations in this repo are
additive, so Promote does not need a down migration.

Do these steps in order. The first import deploy is not a good deploy: it will use Vercel's
default build and will not run migrations.

## 1. Create the Vercel project

1. Open [New Project](https://vercel.com/new) and import
   `namnhatpham1995/hackathon-stuttgart-2026`.
2. Framework Preset: **Next.js**.
3. Root Directory: the repository root. Leave it empty. Do not set `roadmap/`.
4. Expand Build and Output Settings and set **Build Command** to `node scripts/vercel-build.mjs`
   before you click Deploy. Install Command and Output Directory stay on their defaults.
5. If a deployment starts with any other build command, cancel it. Settings → Git: Production
   Branch is `main`.

## 2. Build settings

Project → Settings → Build and Deployment:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | repository root (empty) |
| Node.js Version | 22.x (`package.json` requires `>=22.12`) |
| Install Command | default (Vercel uses pnpm from the `packageManager` field) |
| Build Command | Override: `node scripts/vercel-build.mjs` |
| Output Directory | default. Do not set one |

Build Command must be the override. `pnpm build` and `next build` alone skip migrations.

## 3. Turn previews off

Settings → Build and Deployment → **Ignored Build Step** → **Only build production**.

That skips the build unless `VERCEL_ENV` is `production`. A skipped preview is canceled before
`scripts/vercel-build.mjs` runs.

Settings → Git: if a **Preview Deployments** toggle is shown, turn it off. Production Branch stays
`main`.

## 4. Neon from the Marketplace

Use the Vercel-managed Neon integration (billing inside Vercel). Leave Neon's optional products
off: this app has its own Better Auth, and preview branches would be a second database.

1. Open the [Neon integration](https://vercel.com/marketplace/neon) and click **Install**.
2. Choose **Create New Neon Account** if this team has none, then Continue.
3. Under Configuration, pick a region close to the demo (Frankfurt / `eu-central-1` when it is
   listed). Leave **Auth** off and **Realtime** off. Accept the terms, name the database, and
   create it.
4. Storage → that database → **Connect Project**. Choose this app project. Environments:
   **Production** only. Do not select Preview or Development.
5. **Create database branch for deployment**: leave Preview unchecked, and leave Production
   unchecked. No custom environment-variable prefix.
6. Click **Connect**.

The integration writes `DATABASE_URL` (pooled, hostname contains `-pooler`) and
`DATABASE_URL_UNPOOLED` (direct). This app cannot use the pooled URL. `src/db/client.ts` and
`pnpm db:migrate` both use `postgres.js` prepared statements, and the migrator also needs a
session connection. The production build exits before migrating when `DATABASE_URL` contains
`-pooler` or `pgbouncer=true`.

7. Settings → Environment Variables. For the **Production** `DATABASE_URL`, replace the value with
   the Production value of `DATABASE_URL_UNPOOLED`. The host must not contain `-pooler`. Keep
   `sslmode=require`. Leave `DATABASE_URL_UNPOOLED` in place so you can copy it again: a reconnect
   can reset `DATABASE_URL` to the pooled string.
8. If a later build fails with an error that names `channel_binding`, delete only
   `channel_binding=require` from `DATABASE_URL` and keep `sslmode=require`.

## 5. Environment variables

Set every variable below on **Production** only. Do not copy them to Preview. Do not commit the
values. Vercel sets `VERCEL_ENV` itself; do not add it.

`BETTER_AUTH_URL` and `APP_BASE_URL` are the same origin: `https://<project-name>.vercel.app`,
with `https://`, no path, and no trailing slash. The project name from step 1 fixes that origin
before the first good deploy. After the smoke test (task 12.4), change both if the live URL
differs.

| Variable | Required | Value |
|---|---|---|
| `DATABASE_URL` | yes | Direct Neon URL, copied from `DATABASE_URL_UNPOOLED`. Not the pooler. |
| `BETTER_AUTH_SECRET` | yes | At least 32 characters. Generate with `node -e "console.log(crypto.randomBytes(32).toString('base64url'))"` and paste the output into Vercel. |
| `BETTER_AUTH_URL` | yes | Production origin. Same value as `APP_BASE_URL`. |
| `APP_BASE_URL` | yes | Same origin as `BETTER_AUTH_URL`. Assessment emails link here. |
| `GEMINI_API_KEY` | yes | Key from [Google AI Studio](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | yes | The model id those credits fund. No default in code. Use the same id as local `.env` once it is chosen at check-in. |
| `BREVO_API_KEY` | yes | Key from [Brevo SMTP & API](https://app.brevo.com/settings/keys/api). |
| `BREVO_SENDER_EMAIL` | yes | A sender address already verified in Brevo. A non-empty value must be an email address. |
| `ELEVENLABS_API_KEY` | no | Spoken replies only. Leave unset until that feature is used. Text still works. |

Leave these unset on Vercel: `SEED_USER_EMAIL`, `SEED_USER_PASSWORD`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`. Social sign-in stays off until
both values of a provider are set. Do not enable Neon Auth, so `NEON_AUTH_BASE_URL` is unused.

Empty is fine for an optional variable. A blank `BREVO_SENDER_EMAIL` or `APP_BASE_URL` is treated
as unset; a wrong shape (not an email, not a URL) fails the build.

## 6. Deploy

Save the settings, then Deployments → the production deployment → **Redeploy**. The build log
must contain, in order:

```text
vercel-build: VERCEL_ENV=production, running pnpm db:migrate
Migrated <database name>
vercel-build: running next build
```

`Migrated` is printed by `pnpm db:migrate`. If the log says
`vercel-build: VERCEL_ENV=unset, skipping pnpm db:migrate` or `VERCEL_ENV=preview`, that
deployment is not production. Fix the production branch and the Ignored Build Step, then redeploy.
Do not point `DATABASE_URL` at a database you are not willing to migrate.

## 7. Rollback

Deployments → filter **Production** → the previous deployment whose status is Ready → **⋯** →
**Promote to Production**.

Promote switches traffic to that deployment. It does not run the build and it does not undo
schema changes. That is safe here because migrations are additive only. Do not add a down
migration to roll back.

## When something fails

- The log stops on `DATABASE_URL is a pooled Neon URL`: paste `DATABASE_URL_UNPOOLED` into
  Production `DATABASE_URL` again and redeploy.
- `DATABASE_URL is not set` or `Invalid environment`: a required variable from the table is
  missing, or `BETTER_AUTH_SECRET` is shorter than 32 characters.
- The migrate step cannot connect to a database named `postgres`: `pnpm db:migrate` opens that
  maintenance database, then migrates the database named in `DATABASE_URL`. Use the direct Neon
  URL. The app database (often `neondb`) already exists; the integration created it.
