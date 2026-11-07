# Design

## Context

Better Auth is configured in `src/lib/auth.ts` (`emailAndPassword` on, `nextCookies()` last).
The browser client is `src/lib/auth-client.ts`. Sign-in UI is `src/app/(auth)/auth-form.tsx`,
shown by `sign-in/page.tsx`. `sendBrevoEmail` in `src/lib/notify/brevo.ts` calls
`requireEnv("BREVO_API_KEY")` and `requireEnv("BREVO_SENDER_EMAIL")` and posts plain text.
`src/db/schema/auth.ts` already has Better Auth's `verification` table (`identifier`, `value`,
`expires_at`, timestamps). `BETTER_AUTH_URL` is the Vercel origin; `/api/*` is proxied to Railway.

## Goals / Non-Goals

**Goals:**

- Passwordless sign-in that also creates the account on the first successful verify.
- Keep email-and-password sign-in working.
- Send the link only on the server, through Brevo, and fail clearly when the key is missing.
- Land the person on `/workspace`.

**Non-Goals:**

- Turning off password sign-up, requiring email verification for passwords, or a custom expiry.
- A new mail provider, a queue, or a database-backed rate limiter.
- A magic-link form on the sign-up page.

## Decisions

### 1. Use the plugin as shipped

`magicLink({ sendMagicLink })` from `better-auth/plugins`, with `magicLinkClient()` on
`createAuthClient`. Do not set `disableSignUp` (default false: unknown emails become users on
verify, with `emailVerified: true`). Do not set `expiresIn` (plugin default 300 seconds).
`storeToken` stays `"plain"`. `nextCookies()` stays the last plugin.

The verify URL is built by the plugin from `baseURL` (`BETTER_AUTH_URL`) plus the auth base path,
so it is `BETTER_AUTH_URL/api/auth/magic-link/verify?...&callbackURL=/workspace`.

### 2. Send through the existing helper

`sendMagicLink` calls a small server function that calls `sendBrevoEmail({ to, subject, text })`.
Subject is `Your ExportReady sign-in link`. The body is plain text and contains the verify URL.
The function is imported only from `src/lib/auth.ts`. Client components import `auth-client` only.
No `NEXT_PUBLIC_` variable is added. A thrown `requireEnv` error is rethrown as a Better Auth
`APIError` with that same message and status 500, so the form can show it. No request is made
to Brevo when the key is missing.

The display name sent with the request is the part of the email before `@`, because the plugin
stores `name` only for a brand-new user and the `user.name` column is required.

### 3. No schema change

The plugin writes a `verification` row whose `identifier` is `magic-link:<token>` and whose
`value` is JSON `{ type, email, name }`. Those columns already exist. Better Auth rate limits
with in-memory storage unless secondary storage is configured (it is not). The limiter turns on
in production; the plugin allows 5 magic-link requests per 60 seconds per IP. Nothing new is
migrated.

### 4. Sign-in page only

Below the password form, sign-in mode shows an email field and "Email me a sign-in link".
Success replaces that form with "Check your inbox". `callbackURL` is `/workspace` for both new
and existing users. Password sign-in still follows `?next=`. Styles reuse `.field` and
`.btn-secondary`.

## Risks / Trade-offs

- A failed send still leaves a verification row, because the plugin inserts it before
  `sendMagicLink`. The row expires with the token and is never emailed.
- Opening a link for a password account whose email is not verified deletes that password
  and its sessions (`revokeUnprovenAccountAccess`). Password sign-in is unchanged until then.
  The demo account's password stops working if that address opens a magic link.
- In-memory rate limits reset on process restart and are not shared across instances. Accepted:
  no extra infrastructure.
- Live delivery cannot be checked in this run: there is no `BREVO_API_KEY`.

## Migration Plan

No migration. Deploy is the auth config plus the sign-in form. Rollback is reverting the commit.
Existing password users are untouched.

## Open Questions

None. The controller already chose the plugin, Brevo, first-click sign-up, `/workspace`, and
Better Auth's own rate limit.
