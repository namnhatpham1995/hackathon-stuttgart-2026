# Accepted security risks

Risks this project knows about and has chosen to leave open, each with its reason and the point at
which it is looked at again. Nothing is dropped silently: at its revisit point an item is closed by
a change or renewed here with a new date. How to use it: `docs/security-guide.md` §7.

Last reviewed: <date>. The two rows below are examples of the format: replace them with your own.

| Item | Reason accepted | Revisit |
|---|---|---|
| No per-recipient cap on sign-up and password-reset emails | Sign-up and reset are rate limited per visitor address; a cap needs real traffic to tune | When traffic is real, or a user reports repeated mails |
| The repository's gitleaks scan is run by hand, not in CI | The repository is private; the scan runs before it could become public and after code is imported | Before the repository is made public |
