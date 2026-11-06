---
name: test-fidelity-review
description: Review the tests a diff or pull request adds or changes and find the ones that would still pass if the code were wrong - tautological tests, expected values taken from the code under test, mocks asserted against what the test configured, rejection tests that do not say which rejection, assertions that do not reach what the test name claims. Reports only; never deletes, rewrites or commits tests. Use when the user says "test-fidelity-review", asks whether new tests can fail. When full-feature-develop reviews a PR that touches test files, its `independent-pr-reviewer` agent (Opus) follows this procedure.
argument-hint: "[PR number | branch | path]"
---

One question for every test in scope: **if the code were wrong in the way this test's name claims,
would the test fail?** The rules, the examples and the list of patterns that look weak but are not
live in `docs/code-standards.md`, "Test quality". Read that section first; this file only holds the
procedure. A result of "these tests hold" is valid and common: do not invent findings.

The review of a PR runs on Opus, not on the model that wrote the tests: in `full-feature-develop` the
`independent-pr-reviewer` agent (`.claude/agents/independent-pr-reviewer.md`, `model: opus`) follows
this file as part of its review. Run directly, as `/test-fidelity-review`, it runs on the session's
model; when that is not Opus and the input is a PR, start a `general-purpose` agent with
`model: "opus"` that follows this file instead.

## Scope

The input is a PR number, a branch or a path. With none, use the current branch against
`origin/main` and list the tests the diff adds or changes:

```bash
git diff --name-only origin/main...HEAD | grep -E '\.(test|spec)\.(ts|tsx|mjs)$|(^|/)test/|vitest\.setup\.|test-(fixtures|helpers)\.tsx?$'
```

- A PR: pipe `gh pr diff <n> --name-only` through the same `grep`, and work in that PR's branch.
- A branch: work in it, then list as with no input.
- A path (a file or a folder): pipe `git ls-files <path>` through the same `grep` and judge every
  case in the files it keeps, not only changed ones.

`pnpm worktree <branch>` checks a branch out into a worktree of its own; never work in a checkout on
another branch. If no test file is in scope, say so and stop. Read only those tests and the
production code each one names, never the whole suite.

Test support files (`test/`, `vitest.setup.ts`, `*test-fixtures.ts`, `*test-helpers.ts`) count:
when a helper or fixture changes, ask which tests now take their expected value from it. To find
the added or changed cases in a test file, read `git diff -U0 origin/main...HEAD -- <file>` and judge those, not the whole file.

## 1. State each claim

For each added or changed test, write down the one behaviour its name claims. Judge by the assertions,
not the name: a test whose name and assertions disagree is a finding by itself.

## 2. Read for the rules

Check each test against the rules in "Test quality". The probes that find most problems:

- Where does the expected value come from? Trace it. A literal or a restated spec rule is fine; the
  function under test, a helper it calls, or a value configured on a mock or fixture is not.
- What is mocked? A boundary is fine. The module the test names, or a mock that does the work being
  asserted, is not. Does the test only read back what it configured?
- Does a "must reject" test assert the code, constraint or field, so a different guard cannot make it
  pass?
- Does the fixture put the code in a state its real callers never produce (a row the database or an
  earlier guard would refuse)? Does a limit's test straddle its edge?
- If the diff deletes a test, is there a named keeper test, and does it fail when the code is broken?

## 3. Prove the doubtful ones

When reading cannot decide, break the code under test on purpose and run that one test file. Do this
for the few tests that look most doubtful, not for all of them, and never for a test that is clearly
sound or clearly empty. One test command at a time in this checkout; tests that touch the database
need PostgreSQL (`docker compose up -d`).

1. Note whether the production file has uncommitted changes. If it does, copy it aside first.
2. Make the smallest edit that makes the claimed behaviour wrong (invert the condition, return the
   wrong value, drop the guard).
3. Run only that test file: `pnpm exec vitest run <path>`.
4. Restore the file straight away (`git checkout -- <file>` when it was clean, the copy otherwise) and
   confirm `git diff -- <file>` shows only what it showed before step 2. Do this before writing the
   report, even if the run failed or was interrupted.

Read the result before judging it. A pass proves the test tautological only if the edit sits on a
line the test runs; if you cannot show that, nothing is proven. A failure shows the test is sound only
if it is an assertion about the claimed behaviour, not a load, import or syntax error caused by the
edit: fix the edit and run again.

## 4. Report

Report to the caller; change no test and commit nothing. Group findings:

- **Blocking**: the test passes with the code wrong on exactly what it claims. Say how it is known:
  a break-the-code run showed it, the code shows it (the test has no assertion on the claimed
  behaviour at all), or reading only makes it doubtful.
- **Strengthen**: a cheap, reachable improvement (name the assertion to add).
- **Holds**: tests checked and sound, in one line.

For each finding give the test file and line, the claim, the wrong code it would let through, and the
cheapest fix. Do not flag the patterns "Test quality" lists as not weak, a terse test that is sound, or
a style choice.
