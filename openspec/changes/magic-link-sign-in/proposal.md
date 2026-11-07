# Proposal

## Why

Suppliers need a way into ExportReady without choosing and remembering a password. A magic link
sent to their email creates the account on the first verified click and signs them in, while the
existing email-and-password form stays available.

## What Changes

- Better Auth's built-in `magicLink` plugin on the server, and `magicLinkClient` on the browser client.
- The link is sent with the existing server-only `sendBrevoEmail` (plain text, sender
  `BREVO_SENDER_EMAIL`, subject "Your ExportReady sign-in link"). The Brevo key stays on the server.
- New users are created when they open the link. `disableSignUp` is not set. Email and password
  sign-in is unchanged.
- After verification the browser goes to `/workspace`. The link origin is `BETTER_AUTH_URL`.
- When `BREVO_API_KEY` is missing, the send fails with the existing clear env error and no email
  is sent. Tests mock the send.
- The sign-in page gains a small "Email me a sign-in link" form with a "check your inbox" state.
- Rate limiting stays on Better Auth's built-in limiter. No new infrastructure.

## Capabilities

### New Capabilities

- `magic-link-sign-in`: passwordless sign-in and first-click account creation by email link.

### Modified Capabilities

- None. Main specs are still empty; this change only adds a delta.

## Impact

- `src/lib/auth.ts`, `src/lib/auth-client.ts`, the sign-in form, and a small send helper next to auth.
- The existing `verification` table stores the token. No new table or column.
- No new environment variables. `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` and `BETTER_AUTH_URL` already exist.
