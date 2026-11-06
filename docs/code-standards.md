# Code standards

## Test quality

One question decides whether a test is worth keeping: **if the code were wrong in the way this
test's name claims, would the test fail?** A test that still passes is tautological, however much
coverage it adds. Coding agents write most of the tests here, so the rules below are checked for
every test a pull request adds or changes when the pull request is reviewed (the
`test-fidelity-review` skill in `.claude/skills/`, run by `.claude/rules/review-audit-self-decision.md`
for every review).

1. **The expected value comes from the requirement.** Write the literal the specification gives, or
   restate a one-line rule from it. Never take it from the function under test, a helper that
   function calls, or a value the test itself set on a mock or fixture.

   ```ts
   // Wrong: the function is compared with itself, so any price passes.
   expect(calculateFinalPrice(100, 0.2)).toBe(calculateFinalPrice(100, 0.2));
   // Right: a 20% discount on 100 is 80.
   expect(calculateFinalPrice(100, 0.2)).toBe(80);
   ```

2. **A mock stands in for a boundary, never for the thing the test names.** Mail, the network, the
   clock and `next/navigation` are boundaries. Do not assert only what you configured (a mock that
   resolves to `2`, then `expect(count).toBe(2)`). Persistence is tested against real PostgreSQL,
   so the database is never mocked. Mock an application module only to inject a failure, or to
   switch off one function so the database rule is what rejects the write.

3. **Check the state that changed; check a call only when the call is the behaviour.** A written row
   is read back, as [`auth.test.ts`](../src/lib/auth.test.ts) reads the stored user and its hashed
   password. A call is asserted when it is the observable result, such as a mail leaving the system.

4. **A rejection test asserts which rejection.** Check the HTTP status or error code (`statusCode:
   401` for a wrong password in [`auth.test.ts`](../src/lib/auth.test.ts)) or the database
   constraint name (`violates unique constraint "user_email_unique"`). A bare `rejects.toThrow()`
   also passes when a different guard fires.

5. **A limit is tested on both sides of its edge.** 200 characters accepted and 201 rejected.

6. **The assertion reaches what the name claims.** A test named "only an English template is
   registered" that asserts the subject is not empty passes for any language. Judge a test by what
   it asserts, not by its title.

7. **A test name states the behaviour.** Plan, decision, change and task identifiers (`design D8`,
   `task 1.3`) do not belong in names; if the reason is not obvious from the code, say it in a
   comment next to the test.

### Not weak: do not flag these

- **Two outputs of one function, when the claim is the relation** (the same seed gives the same
  output).
- **"The write does not throw", when acceptance is the claim** (a constraint lets a valid row
  through).
- **A one-line rule from the specification restated as the oracle**, without importing or copying
  the production code.
- **A test that reads a source file when that is the cheapest independent guard.**
- **`expect(getByText(...)).toBeTruthy()`.** `getBy*` already throws when nothing matches; it is
  odd style, not a weak test.

### Proving a doubtful test, and deleting one

When reading cannot tell whether a test can fail, break the code under test on purpose, run that one
test file (`pnpm exec vitest run <path>`), and see it fail. Read the result before trusting it: a
pass proves something only if the edit sits on a line the test runs, and a failure only if it is an
assertion about the behaviour, not a load or syntax error from the edit. Restore the file and
confirm `git diff` on it is empty before anything else. Run one test command at a time per checkout.

Delete a test only when it adds no unique protection, and say which: the failure it detects, the
remaining test that covers the same behaviour, and that the remaining test fails when the code is
broken. Unchanged line coverage is not that proof. Never delete tests to reach a target number.

## Checks before pushing

`.githooks/pre-push` runs `pnpm verify` (typecheck, Biome lint, Vitest against real PostgreSQL)
unless the push changes only docs, plans, OpenSpec proposals, `memory/` or `.claude/`. `pnpm install`
points git at `.githooks/` (`scripts/prepare-git-hooks.mjs`). PostgreSQL must be running
(`pnpm db:up`).

## CI for pull requests

`.github/workflows/ci.yml` runs on every PR into `main`: the production dependency audit, then
`pnpm verify` against a PostgreSQL service container. A docs-only PR skips the verify job.
