# Accepted security risks

Risks this project knows about and has chosen to leave open, each with its reason and the point at
which it is looked at again. Nothing is dropped silently: at its revisit point an item is closed by
a change or renewed here with a new date. How to use it: `docs/security-guide.md` §7.

Last reviewed: 2026-11-07. The first two rows are still the template examples. The magic-link and `request_connection` rows are real accepted risks.

| Item | Reason accepted | Revisit |
|---|---|---|
| No per-recipient cap on sign-up and password-reset emails | Sign-up and reset are rate limited per visitor address; a cap needs real traffic to tune | When traffic is real, or a user reports repeated mails |
| The repository's gitleaks scan is run by hand, not in CI | The repository is private; the scan runs before it could become public and after code is imported | Before the repository is made public |
| Magic-link sends share one bucket of 5 per 60 seconds per process when `x-forwarded-for` is missing, has more than one address, or is a single shared proxy address | Better Auth keys the limit from that header and `trustedProxies` is unset until a real production header is captured. Guessing the Vercel or Railway hops would trust a spoofed address. Verify clicks are a second bucket of 5. Password sign-in uses another rule. The limit is in memory and resets on restart. | When a production `/api/auth` request shows the forwarded header |
| `request_connection` relies on `src/lib/connections/service.ts`, not PostgreSQL, to reject a supplier connecting their own product to their own request and to keep a shared result on the connected product | Every write to `request_connection` goes through `respondToRequest`, `requestEvidence` or `shareResult`, which check both and are covered by `connections.test.ts`. The schema change needs its own migration PR, and the owner chose to merge group 17 before submission on 2026-11-07 | After submission: task 17.9 adds the composite foreign key and the trigger |
