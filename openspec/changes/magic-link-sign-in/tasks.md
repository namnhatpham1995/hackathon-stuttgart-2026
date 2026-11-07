# Tasks

## 1. Magic-link sign-in · branch feat/magic-link-sign-in

- [ ] 1.1 Wire Better Auth `magicLink` in `src/lib/auth.ts` (plugin before `nextCookies()`) and `magicLinkClient` in `src/lib/auth-client.ts`. Add `sendMagicLinkEmail` that calls `sendBrevoEmail` with subject `Your ExportReady sign-in link`, plain text containing the verify URL, and rethrows a missing `BREVO_API_KEY` as an API error with that message. Do not set `disableSignUp`. Verify `src/lib/auth/magic-link-email.test.ts`: the mocked send receives that subject, the submitted address and the URL; with no key the real helper throws the `BREVO_API_KEY is not set` message and `fetch` is not called
- [ ] 1.2 Add the sign-in-only form (email, `Email me a sign-in link`, check-your-inbox state, `callbackURL` `/workspace`) using the existing field and button styles. Verify the sign-in render includes the button and the sign-up render does not, and the form source sets `callbackURL` to `/workspace` and does not import `brevo.ts`
- [ ] 1.3 Add a real-PostgreSQL flow test with `sendBrevoEmail` mocked: a new email's verify creates one verified user and redirects to `BETTER_AUTH_URL/workspace`; the same token does not create a second user; an existing password user stays one row and can still sign in with the password. Verify the test fails if the redirect target is not `/workspace`
- [ ] 1.4 One independent review, fix blocking findings in one round; verify the report says PASS
