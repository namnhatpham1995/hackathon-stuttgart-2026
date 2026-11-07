# Accepted security risks

Risks this project knows about and has chosen to leave open, each with its reason and the point at
which it is looked at again. Nothing is dropped silently: at its revisit point an item is closed by
a change or renewed here with a new date. How to use it: `docs/security-guide.md` §7.

Last reviewed: 2026-11-07. The first two rows are still the template examples. The magic-link row is a real accepted risk.

| Item | Reason accepted | Revisit |
|---|---|---|
| No per-recipient cap on sign-up and password-reset emails | Sign-up and reset are rate limited per visitor address; a cap needs real traffic to tune | When traffic is real, or a user reports repeated mails |
| The repository's gitleaks scan is run by hand, not in CI | The repository is private; the scan runs before it could become public and after code is imported | Before the repository is made public |
| Magic-link sends share one bucket of 5 per 60 seconds when the client IP is not a single `x-forwarded-for` value | Better Auth's limiter is on in production and the magic-link plugin allows 5 requests per minute. `trustedProxies` is unset until a real production header is captured; guessing the Vercel or Railway hops would trust a spoofed address. Verify clicks have a second bucket of 5. Password sign-in is a different rule. The limit is in memory and resets on restart. | When a production `/api/auth` request shows the forwarded header |
