---
name: feedback-docs-only-skips-verification
description: "Docs-only work (OpenSpec proposals and archives, plans, docs/, .claude/ rules, memory/, root Markdown) runs no tests, typecheck, lint or verify"
metadata:
  type: feedback
---

For a change that touches only proposals, plans, docs, `.claude/`, `memory/` or root Markdown: do not run tests, typecheck, lint or `pnpm verify`, and do not wait on or report them. Validate proposals with `openspec validate <change> --strict`. The pre-push hook and CI skip their checks for such a push.

**Why:** the user saw minutes of test runs spent on Markdown-only PRs and asked for them to stop.

**How to apply:** any code file in the diff makes it a code change again, and the normal gates apply.
