# Brief template

The invoking session copies this into `<audit folder>/brief.md`, fills every `<...>`, and passes the filled
text as the prompt of one `ux-reviewer` agent (`SKILL.md`, step 4). Keep the headings: the auditor looks for
"Sign-in", "Tally" and "Deletes". Add nothing else: not your opinion of the code, not what you expect to
find. Never write the run's password into the brief; it names only the file that holds it.

```text
# Brief: <scope>

Mode <pr <number> | routes | full> | Commit <sha> | Run <run id>
Routes <paths, at most 5> | Personas <...> | Languages <the app's default, or the ones the owner named>
Origin <webOrigin> | Run folder <run folder> | Audit folder <audit folder>
Intent <for a pull request: its title and description, and the change's proposal and specs it names; otherwise "none">
Impeccable files <the changed .tsx and .css files, or none> | IMPECCABLE_BIN <path, or "none: skip Impeccable">
Accessibility scan <the one line from step 3.1, or "not run: no browser suite", or "not run: the target was started elsewhere">
Friction probe <scripts/ux-review/friction-probe.js | none: the project has no probe>
Caps <30 minutes, 250 tool calls, 40 screenshots, 300k tokens (tokens are measured afterwards, not enforced)>
Mail <omit when the app sends no mail or the target was started by this session | with --origin: pnpm -C <worktreeRoot> ux-review:mail <to> [subject]>
Browser <omit for the built-in pane | chrome: <why the pane cannot open or operate the target>>
Third-party buttons <name any button of a provider that the pull request adds: checked, not clicked | omit>

## Sign-in
- Sign in as the persona the route needs, with its address from `<run folder>/target.json` and the password
  in `<run folder>/password`. Read the file, type the value into the sign-in form, and nothing else.
- Never echo the password: not in your output, not in your report, not in a command line (`echo`, `printf`,
  `cat` to the terminal, `curl --data`), not in any file you write. If you must tell the form what to type,
  pass the value only to the browser tool that types it, once.
- The form is the only way in. There is no other, and you do not look for one: no cookie, no token, no
  route, no helper, no flag.

## Tally
- Tally file: `<audit folder>/clock.txt`. Its first line is the start time (`date +%s`).
- Add one line to it every ten tool calls: `<calls> calls, <minutes> min, <screenshots> screenshots`.
- Stop at 200 tool calls by your tally, although the cap is 250: your count runs low (a measured run that said
  "about 248" had made 284 calls). Write what you did not cover (routes, widths, states) in the report, and stop.
- The report states the number of tool calls you counted (its "Budget used" line).

## Deletes
Delete, remove, un-save, withdraw, cancel, leave, disconnect and any other control that undoes a row the seeded
data holds are deletes, together with delete-account, erasure and bulk admin actions. Look at each only up to
its confirmation, and cancel; where there is no confirmation, do not press it. A seeded saved item is opened
to its "Remove" control or its confirmation, cancelled, and left saved.
Rows you may delete, made by the invoking session for this audit (name each one; omit when none):
<each row, and how many times the page lets you repeat the action, e.g. "thirty items of <persona>, one by one: 30">
A throwaway user you register yourself on a `ux-new-...@example.com` address may be deleted.
```
