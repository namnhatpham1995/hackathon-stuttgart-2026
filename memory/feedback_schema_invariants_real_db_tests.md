---
name: feedback-schema-invariants-real-db-tests
description: "Business invariants live in the schema as real constraints/triggers/indexes, and persistence tests run against real PostgreSQL, not mocks"
metadata:
  type: feedback
---

Two rules carried over from a production project, kept in this repo's `CLAUDE.md` (rules 2 and 4):

1. **Invariants live in the schema.** Every rule that must always hold ("unique per…", "must reference…", "immutable once written") is a real constraint, trigger or index in `src/db/schema/` and its migration, not only an application check. Code still validates early for good error messages, but the database must reject a bad write even when every code path skips validation.
2. **Persistence tests use the real database** (the Docker PostgreSQL from `pnpm db:up`; the test database is recreated each run), never mocks.

**Why:** "a constraint is the one rule an AI-generated code path cannot forget or bypass." Agents write many code paths quickly; an application check has to be remembered in each. Mocked persistence tests pass while the real migration or constraint is broken.

**How to apply:** put a stated data rule in the schema first, run `pnpm db:generate`, then test it by attempting the bad write and asserting the constraint name (`cause.constraint_name`), as `src/lib/auth.test.ts` does for `user_email_unique`.
