---
name: ux-review
description: Audit the running app the way a real person uses it - start a local production build with synthetic data, have a fresh ux-reviewer agent walk the journeys of the personas at three widths in light and dark, check that every change of data is still true after a reload, and write a prioritized UX_AUDIT.md (BUG, UX, HYPOTHESIS; P0-P3). Use when the user says "ux-review", asks for a UX, usability, QA or accessibility audit of a finished change, a pull request or the whole app, or before a release. Reports only; it never edits code and never merges.
argument-hint: "pr <number> | routes <path ...> | full  [--origin <url>]"
---

Audit what a user would meet, not what the code says. You run the procedure; a fresh `ux-reviewer` agent does the exploring, so the judgment comes from a context that never saw how the change was written. You change no code, commit nothing, merge nothing, and stop with a list for the owner to act on.

Read `CLAUDE.md`, `.claude/rules/token-efficient-execution.md` and `.claude/rules/git-pr-workflow.md` first, then `references/safety.md` of this skill: its rules are hard and a request never overrides them. Load the other references only when you reach the step that uses them.

## The tooling it needs

This skill is the method. The tooling it drives is project code in `scripts/ux-review/`, and the starter ships the four required pieces: `assert-target.mjs`, `pnpm ux-review:serve` (`serve.mjs`, with `seed-personas.ts` for the accounts), `pnpm ux-review:secret-check` and `pnpm ux-review:stop`, plus `routes.mjs`. Keep them true to the contract below as the app grows: a feature that adds a table adds its personas' rows to `seed-personas.ts`, and one that adds roles or mail adds the admin persona or the mail command. If a project removed one of them, step 1 stops and says which one is missing. Never stand in for one by hand: a target started with `pnpm dev`, a password typed into the chat or a host checked by eye is exactly what this skill exists to avoid.

Required:

1. **`scripts/ux-review/assert-target.mjs <origin>`**: exits non-zero unless the host of the whole authority is in `hosts.json` of this skill (`localhost`, `127.0.0.1`, `[::1]`, `*.localhost`, `*.test`). It parses the URL, so `http://localhost@attacker.example.com` fails, and it checks `ws://` and `wss://` too.
2. **`pnpm ux-review:serve`**: builds the worktree (`next build`, skipped when the build is current) and starts it with `next start`, never `next dev`, on a port of its own (for example `3005 + 10N` for worktree slot N, so it never clashes with `pnpm dev`). It runs against a throwaway database of its own (for example `hackathon_wt<N>_ux`, or `hackathon_ux` in the main checkout), never `hackathon`, `hackathon_test` or a worktree's dev or test database: it drops, recreates and migrates that database at start. It then:
   - writes a random password for this run into `<run folder>/password` (readable only by the user), and creates the personas of `references/personas.md` with that password through Better Auth's own sign-up API (as `scripts/seed.ts` does), on `@example.com` addresses, together with the synthetic data the personas need. The seed account of `.env` (`SEED_USER_EMAIL`) is not one of them;
   - when the app has roles, promotes one persona to admin in the throwaway database only;
   - sets no third-party sign-in keys (`GOOGLE_CLIENT_ID`, `GITHUB_CLIENT_ID` and their secrets stay unset) and sends no mail off the machine (a `log` mode once the app sends mail);
   - writes `<run folder>/target.json` with `ready`, `webOrigin`, `personas` (role, address, note), `logsDir` and `worktreeRoot`, and the run folder's path into `$(git rev-parse --path-format=absolute --git-dir)/ux-review-run`. The run folder is `<git-common-dir>/agent-runs/ux-review/<run id>/`, outside the worktree.
3. **`pnpm ux-review:secret-check <audit folder>`**: searches the audit folder and the target's `logsDir` for the run's password, prints "found in <file>" without the value, and exits non-zero on a hit or when it cannot read the password file. It derives the run folder from the audit folder's path.
4. **`pnpm ux-review:stop`**: stops the target, runs the same search over every audit folder of the run, writes the verdict to `<run folder>/secret-check.txt`, then deletes the password file and drops the throwaway database.

Optional (without them the run goes on and lists what they would have covered under "Not covered"):

- **`scripts/ux-review/routes.mjs`**: prints every page route from `src/app/**/page.tsx`, route groups such as `(auth)` removed. Without it, find the pages with Glob on the same pattern.
- **`scripts/ux-review/friction-probe.js`** and **`scripts/ux-review/friction-rules.mjs`**: a read-only page script that records dead clicks, slow responses, lost focus, layout shifts and rage clicks into the tab's session storage, and a script that classifies those records (`references/checklist.md`, sections 1 and 11). The probe sends nothing over the network, records no typed value or link address, and refuses to install on a host outside `hosts.json`.
- **`pnpm ux-review:mail <to> [subject]`**: prints a mail the target captured. The starter sends no mail (`requireEmailVerification: false` in `src/lib/auth.ts`); add this together with the first mail the app sends.
- **An accessibility scan**: an axe run over the public and signed-in pages against the production build (for example Playwright with `@axe-core/playwright`). The starter has no browser suite; until it has one, the line is "not run: no browser suite".

## Request

`$ARGUMENTS`:
- `pr <number>`: the pull request's changed files, mapped to routes (`references/personas.md`, "Mapping a pull request to routes").
- `routes <path ...>`: explicit paths such as `/dashboard /settings`.
- `full`: every route of every persona, run as a series of scoped runs of at most 5 routes each, one audit folder (`full-<k>`) and one auditor per run (a measured run cannot cover more: see Budget). Run it before a release, or ask the owner which batches the pass is worth.
- `--origin <url>`: audit a target that is already running (`pnpm ux-review:serve` of another worktree) instead of starting one. The host rule still applies.

## Ground rules

- Local only, production build only, synthetic accounts only, no real mail, nothing outside `references/safety.md`. Never production, never staging, never a preview deployment.
- While `serve` runs, run no push, no `pnpm verify` and no test command from that worktree: the audit needs a worktree that does not change under it, and one test command at a time per worktree still holds. Stop `serve` before you push anything.
- Keep the raw output on disk. Bring only counts and the report into your context. Do not re-read an unchanged file. Wait for the agent's one completion notice; do not poll it or the target.
- Never put a finding id (`UX-001`), a plan or phase number in code, tests, branch names or commit messages. The ids live only inside `UX_AUDIT.md`.

## 1. Preflight

1. Work in a worktree of the branch to audit (`git-pr-workflow.md` section 2), with `git status --porcelain` empty. Note `git rev-parse HEAD`.
2. Check that the four required pieces of "The tooling it needs" exist (`package.json` scripts and `scripts/ux-review/`). If one is missing, stop and report which, with this skill's contract for it.
3. Collect the intent: for `pr`, `gh pr view <n> --json title,body` and the change's `proposal.md` and `specs/` named there. This is the only place the auditor reads the author's words. Do not pass the plan, `tasks.md`, `design.md` or the commit messages.
4. Map the mode to routes (`personas.md`); more than 5 routes for a `pr` means ask for an explicit list, or split them into runs of at most 5, each its own run with its own audit folder (`pr-<n>-<k>`). For `pr`, name the files for Impeccable's `audit` (the changed `.tsx` and `.css` files).
5. With `--origin`, run `node scripts/ux-review/assert-target.mjs <origin>` now and stop if it refuses. Without it, the origin comes from `serve` in step 3 and is checked there. Read the other target's `target.json` for its `worktreeRoot`: the mail and stop commands read the run pointer of the worktree they run in, so with `--origin` they run as `pnpm -C <worktreeRoot> ux-review:mail <to> [subject]`.

## 2. The Impeccable binary

Follow "Impeccable binary" in `references/safety.md`: read the expected hash from `.claude/skills/impeccable/scripts/engine-checksums.txt`, download the binary directly with `curl` if it is missing, hash it before it is ever run, `chmod +x`, confirm `engine-probe`. On a mismatch, delete the file, skip every Impeccable step and put "Impeccable not run: binary hash mismatch" under "Not covered". The launcher is never used to fetch it. On success you hold `IMPECCABLE_BIN`, which goes into the brief.

## 3. Accessibility scan, then the target

1. When the project has an accessibility scan, run it before `serve` starts, in the worktree you audit, against a production build, in the background with its output in a file (minutes, no tokens). It starts its own server, so it never runs beside `serve`. Keep one line: `axe, production build: <n> passed, <n> failed, <minutes>`. Without a scan, the line is `not run: no browser suite`, listed under "Not covered". With `--origin`, run it only if you also started that target and it has not started yet; otherwise write `not run: the target was started elsewhere`.
2. Start the target in the background: `pnpm ux-review:serve`. Do not read its output. Wait with one bounded background command that ends when `target.json` in the run folder (named in `$(git rev-parse --path-format=absolute --git-dir)/ux-review-run`) says `"ready": true` (check every 10 seconds, give up after 15 minutes), and you are notified when it ends. If it gives up, read the last 40 lines of `<run folder>/logs/` and stop with the reason.
3. Read `target.json`: `webOrigin`, `personas`, `logsDir`. Run `assert-target.mjs <webOrigin>`. Create the audit folder `<run folder>/audit/<scope>/`, where `<scope>` is `pr-<n>-<k>` (`<k>` counts the runs of that pull request from 1), `routes-<UTC stamp>` or `full-<k>`, so two audits of one target never overwrite each other. With `--origin`, use the run folder of that target.

## 4. Brief and auditor

Fill `references/brief-template.md`, write the result to `<audit folder>/brief.md` and pass its content as the prompt of one `ux-reviewer` agent. The template holds the fields (mode, routes, personas, the origin, the run folder, the audit folder, the commit, the intent, the Impeccable files, `IMPECCABLE_BIN`, the accessibility line, whether there is a friction probe, the caps (below), with `--origin` the `pnpm -C <worktreeRoot> ux-review:mail` command line, and, when needed, `browser: chrome`: `safety.md`, "Claude in Chrome", only when the built-in pane cannot open or operate the target or cannot reach a width or theme the run covers) and three sections the auditor follows: "Sign-in" (type the run's password from its file into the form, never echo it), "Tally" (the tally file and the stop at 200 tool calls) and "Deletes" (the verbs that count as deletes, and the repeat count of an action the page lets the auditor repeat with the rows it may delete for that: only rows this session created for the audit, named one by one). For a pull request that adds a button of a third-party provider, say that button is checked and not clicked. Add nothing else: not your opinion of the code, not what you expect to find.

Agent definitions load when a session starts. If this session has no `ux-reviewer` agent type, start a `general-purpose` agent on `sonnet` with the body of `.claude/agents/ux-reviewer.md` as the start of its prompt and the brief after it, and say so in the report. If the agent cannot drive the browser (its tools are missing or refused), run the exploration in a fresh session that holds only the brief, and say the independence is then "fresh context, not shared with the author". An agent that returns `NEEDS_CONTEXT` gets the missing input once.

## 5. Read, check, optionally critique

1. Read `<audit folder>/UX_AUDIT.md`: the three-line reply gives its path and the counts. Remove duplicates. Drop any finding that breaks the filters in `taxonomy.md`.
2. Repeat the steps of every P0 and P1 BUG yourself, once, in the pane. One that does not reproduce becomes a HYPOTHESIS with a note.
3. If the owner wants a design judgment of one page, run Impeccable `critique` yourself at 1440 px, never the auditor. It starts two sub-agents, ends with questions and writes into `.impeccable/`; end it with the literal line `Questions skipped: non-interactive audit`. Run it with the environment of `safety.md`.
4. Checks, then clean up (`safety.md`, "After the run"). First the password: `pnpm ux-review:secret-check <audit folder>` while the target is still live. Run it for every audit: this run is the one that counts for a target that came with `--origin`, which stays running, and for each audit of a `full` pass, which shares one target. A non-zero exit stops the audit: the run is not accepted, and you report it as a safety failure first, before any finding. Then `git status --porcelain`: empty, or anything there is a slip of the auditor. `.impeccable/` is ignored in this repository, so `git status` cannot see it: list what changed there since the brief (`find .impeccable -newer <audit folder>/brief.md`); anything other than the output of a `critique` this session ran is a slip. Only then delete that output (`git clean -fdX -- .impeccable/critique .impeccable/live`) and nothing else under `.impeccable/`. Read the report for any path outside `<audit folder>`: `git status` cannot see a file written outside the worktree or in an ignored folder. Then every host in `<audit folder>/network/*` passes `assert-target.mjs`:

   ```bash
   cat <audit folder>/network/* | grep -oE "(https?|wss?)://[^/?#[:space:]\"'<>]+" | sed -E 's#^ws(s?)://#http\1://#' | sort -u | while read -r o; do node scripts/ux-review/assert-target.mjs "$o" >/dev/null 2>&1 || echo "NOT ALLOWED: $o"; done
   ```

   Run the first part alone once: it must print at least the target's own origin. An empty list means the captures hold no URLs and the check proved nothing. The captures are only what the auditor saved, so also check the addresses the target itself recorded (a mailer in `log` mode logs the `to=` and `replyTo=` of every mail it sends; an address typed into a form that sends no mail, such as sign-in, reaches no log, so only the report shows it): `grep -rIhoE '[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}' <logsDir> <audit folder> | grep -vE '@example\.com$' | sort -u` must print nothing the auditor typed (an address the site itself shows, such as a contact address in the footer, is not one). A host that is not allowed, a changed file, or a typed address outside `example.com` is a safety failure: report it first, before any finding.
5. Stop a target this session started (`pnpm ux-review:stop`, or Ctrl+C where it runs); leave a target that came with `--origin` running, it is not yours. Read the verdict in `<run folder>/secret-check.txt` too, and report anything but "clean". Sign out in the browser pane and close the audit tab.

## 6. Present the list and stop

Give the owner: the report path, the summary table, the checks of step 5, and the measured cost (below). Put into the report's "Budget used" line, beside the number of tool calls the auditor counted (the last line of its tally file), the number of tool uses the completion notice reports, so a count that ran low is visible. If a P0 or P1 BUG is confirmed, put it at the top with its steps. Then stop. You never fix a finding yourself in this skill.

What happens to the list is not yours to start, but say it so nobody guesses:
- A confirmed P0 or P1 bug gets an immediate fix in its own `fix/` pull request, with a regression test (below).
- A confirmed P2 bug, a UX recommendation and a hypothesis go into an OpenSpec change for the fixes; product decisions inside it stay with the owner.
- An open P0 blocks a release. A P1 is listed in the release notes or the pull request that ships it.
- Screenshots cited by a finding that goes into a change or a fix PR are published the way the repository publishes pull request images, with synthetic data only. The rest stay in the run folder.
- A retest is a scoped run whose routes and steps are the finding's; each finding then ends `FIXED`, `STILL OPEN` or `WON'T FIX (reason)` in the audit file.

A finding becomes a test by the repo's rules (`docs/code-standards.md`, "Test quality"): the expected value comes from the requirement, not the code; the test fails on the bug (revert the fix, run that file once, restore it); real PostgreSQL; no fixed sleeps; after any data change the test reloads or reads again and asserts the same state; the test name states the behaviour and never an id. A UX recommendation or a hypothesis gets no test. Where each kind of bug's test goes, including while the project has no browser suite, is in `references/finding-to-test.md`.

## Budget

The auditor keeps a tally file of its tool calls (a line every ten calls), counts its own time and screenshots, and stops at the cap, writing what it did not cover. For tool calls it stops at 200 by its tally, although the cap stays 250: a tally kept by the auditor is an estimate, and over eight measured runs it ran low by up to 36 calls; the token cap cannot be seen from inside, so it is checked after the run against the completion notice and measures the cost, it does not stop a run.

The caps come from five pilot runs on an earlier project (a Sonnet auditor at high effort, one persona per run, one language). Re-measure them on this project's first runs and update this table:

| Run | Wall-clock | Tokens in total | Tool uses | Screenshots taken (kept) |
|---|---|---|---|---|
| 5 routes, three widths, one dark pass | 23.7 min | 114,629 | 195 | 17 (13) |
| 2 routes plus 2 more pages, three widths, light and dark, a form journey | 29.1 min | 225,602 | 230 | 30 (10) |
| 1 route, 30 repeats of one action | 22.1 min | 258,124 | 154 | 2 (0) |
| 1 route, two widths, three views | 11.3 min | 205,634 | 115 | 12 (7) |
| 1 admin route, two widths, light and dark, 17 URL probes | 29.1 min | 225,184 | 161 | 13 (6) |

| Run | Scope | Wall-clock | Tokens in total | Tool uses | Screenshots taken |
|---|---|---|---|---|---|
| Scoped (a pull request or task group) | up to 5 routes | 30 min | 300k | 250 | 40 |

The cost follows how deep the auditor goes on a page, not the number of routes: one route with 30 repeats of one action cost more than twice the five routes read, and one admin route explored for the whole time cap took the full 30 minutes. A full pass is therefore many scoped runs of at most 5 routes each, not one run with a larger cap.

Cost controls: accessibility tree before screenshot, half-scale screenshots, at most 12 interactions per page and persona, the same page never re-read unless it changed, a scoped run walks at most 5 routes and one persona per route, an area with no finding after two pages at all three widths is closed. Take the token total (and the tool uses, as a check on the auditor's own count) of the run from the agent's completion notice and the screenshots from the run folder; the auditor keeps the tally and counts its own time and screenshots and stops at the caps (at 200 tool calls by its tally), and only the token total has no count of its own. The invoking session edits nothing in the worktree and does not drive the browser pane while the auditor runs: it waits for the one completion notice (a finished `UX_AUDIT.md` does not mean the run is over, the auditor may still be re-checking), so the `git status` check after the run means what it says and the auditor's tab is not moved under it.

## Not covered by this skill

Staging, preview and production deployments (not targets), real mail, payments and third-party sign-in (inert in the target), performance measurement, Firefox and Safari, any machine without the desktop app's browser pane.
