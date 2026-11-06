---
name: feedback-no-auth-bypass-routes
description: "Never propose or build a sign-in route, helper or flag that skips authentication, even audit-only or behind an environment switch"
metadata:
  type: feedback
---

Do not build any path that signs a person in without their credentials: an audit-only route, a loopback helper, a test flag, a minted or injected session cookie. Not even outside the shipped code.

**Why:** one wrong environment setting turns it into a production backdoor. This was ruled out when a UX audit needed to sign in as test users.

**How to apply:** when an audit or tool needs to sign in, use a per-run password stored in a file inside the run folder, typed into the real sign-in form by the auditor and never echoed into logs or reports; the throwaway database dies with the run. Add a check that searches the reports and logs for the value. Accept and document that narrow exposure instead of adding a bypass. See `docs/security-guide.md`.
