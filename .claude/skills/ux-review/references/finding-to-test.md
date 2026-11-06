# From a finding to a test

How a confirmed finding becomes a test that guards its fix. The fixer reads this page; the invoking session
uses it when it triages the `Test` field of a finding (the auditor fills that field from
`report-template.md`). The rules of `docs/code-standards.md` ("Test quality") and the `test-fidelity-review`
skill apply to the test like to any other. This page adds which finding gets a test, where it goes, and how
to write the states an audit finds.

## Which finding gets a test

| Finding | Test? | Where |
|---|---|---|
| Confirmed P0 or P1 BUG | **Required** | A `journey` test when it is about behaviour or data, a `look` test when it is about layout, width, contrast, motion or how focus looks. While the project has no browser suite, a `unit` test instead (below) |
| Confirmed P2 BUG | When cheap: one more case in an existing test | Same places |
| Accessibility BUG on a page the accessibility scan does not cover | One more path in the scan, once the project has one | The scan's list of pages |
| UX recommendation, HYPOTHESIS | No | The owner decides whether it becomes an OpenSpec change |

Prefer a case in an existing test file to a new file.

## While the project has no browser suite

The starter tests with Vitest against real PostgreSQL and has no browser tests yet. Until a browser suite
exists:

- A behaviour or data bug is guarded where the behaviour lives: a Vitest test of the server action, route
  handler, query or helper the page calls, against real PostgreSQL. It asserts what was saved by reading it
  back from the database, not the value the action returned.
- A layout, width, contrast or motion bug has no automated guard. Say so in the fix pull request, give the
  retest steps (route, persona, width, theme), and run a scoped `/ux-review routes <path>` on the fix as the
  check.
- When the same kind of bug appears twice, propose adding the browser suite (for example Playwright) as an
  OpenSpec change, and use the recipes below from then on.

## Journey recipe (behaviour and data, once there is a browser suite)

1. Start from the person the finding names. A first-time user is a freshly created user, signed in through
   the suite's own helper; it owns nothing, so it is also the **empty state**. A page full of rows needs a
   seeded user or rows the test creates in the test database.
2. Wait for the page to be usable before the first click (the hydrated page, the link that arrived), never
   for a fixed time.
3. Act the way the audit steps did, with locators by role and accessible name, and assert what the person sees.
4. **Reload and assert the same state.** After any change of data, `await page.reload()` and expect the same
   result. The page's own state alone proves nothing about what was saved.
5. Wait on the visible result (`expect(...)`, which retries, or `expect.poll`), never on a fixed sleep.

## Look recipe (layout, width, contrast, motion, focus appearance)

1. Set the viewport and theme of the finding (the widths of its `Where` line; the colour scheme with
   `page.emulateMedia({ colorScheme })` or the app's own theme control).
2. Assert **the measurement the finding used**, not a screenshot: sideways overflow
   (`scrollWidth - innerWidth`), a box against the window (compare it with `window.innerWidth` and
   `innerHeight`), the computed colours for contrast, the computed `animationName` for motion.
3. What `clip`, `clip-path` or `opacity` can hide is measured by computed style. `toBeVisible()` and the
   bounding box do not see a `clip`: they only fail for an empty box or `visibility: hidden`.

## Slow and failing requests

The browser pane cannot hold or fail a request. Playwright's `page.route` can: register the route before the
action, and assert the loading, error and recovery UI a person sees.

- **Hold**: a promise the test releases holds the route; assert the loading state while it is held, release
  it, assert the arrival. No timer.
- **Fail**: `route.abort("failed")` for a lost request, or `route.fulfill({ status: 500, ... })` for a refusal
  with a body the server can really send, so the page's own error handling runs and not a parse error.
  Assert the message and that the button or form is usable again; then `await page.unroute(...)`, repeat the
  action, and assert it works and survives a reload.
- **Empty and many**: see step 1 of the journey recipe.
- **Limit**: `page.route` sees only what the browser requests. What a server component or server action does
  on the server is not visible to it; guard that state with a Vitest test over the server code, or with a real
  database state in a journey.

## The test must be able to fail

1. Write the test against the fixed code and see it pass.
2. Undo the fix only, not the test. Run that one file. It must fail on the assertion that names the bug, not on
   a setup error. Restore the fix and run it again. Put both results in the pull request.
3. A bug that appeared only in a production build is proven against a production build (`next build` and
   `next start`); a run against `next dev` proves nothing about it.
4. An intermittent bug (`n of m` in the report): repeat the test at least three times the runs one failure
   takes on average (`3 * m / n`). The old code must fail at least once and the fix must pass every repeat. If
   the race cannot be forced in a browser, make its cause deterministic in a unit test and keep the journey as
   the guard of the whole flow.
5. Have the tests reviewed on Opus with `test-fidelity-review` (a `general-purpose` agent on Opus that follows
   the skill, or the `independent-pr-reviewer` when `full-feature-develop` runs the fix), and fix what blocks.
6. Never run any of this in a worktree where `pnpm ux-review:serve` runs: stop the target first.

## Names

The test name states the behaviour in words ("a removed item leaves the list and stays gone after a
reload"). The audit's finding id (`UX-001`), a plan, phase, change or task id never appears in a test name,
a comment, a commit message or a branch name. If the reason is not obvious from the code, a comment says what
the person would see. The fix and the test are separate commits (`fix(...)`, `test(...)`).
