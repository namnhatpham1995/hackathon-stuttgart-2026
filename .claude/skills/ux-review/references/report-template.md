# `UX_AUDIT.md`: format

The auditor writes it to `<audit folder>/UX_AUDIT.md`, with screenshots and raw output beside it. It is not
committed to the repository. Only the summary table travels, pasted into a pull request description or the
owner's report. The ids (`UX-001`) exist only inside this file: never in code, tests, commit messages or
branch names.

```text
# UX audit: <scope>
Run <run id> | commit <sha> | target local | build production | <date>
Browser <built-in pane | Chrome, and why> | Personas <...> | viewports <...> | languages <...> | themes <...>
Budget used <minutes>, tool calls <n by the tally> (harness <n, added by the invoking session>), <screenshots> of <caps> | Not covered: <list, and why>
Accessibility scan: <the one line from the brief> | Impeccable audit: <what `detect` returned (count, exit code; on .tsx regex rules only, so an undercount) and P0/P1 items, or not run and why. No score: `detect` prints none>
Links checked: <n pages, n links, n bad> | Hosts seen in the network captures: <all allowed | list the exception>

## Summary
| ID | Label | Sev | Where | One line | Test |

## Confirmed bugs        (BUG)
## Recommendations       (UX)
## Hypotheses            (HYPOTHESIS)
## Friction signals      (HYPOTHESIS until reproduced; "no probe" when the project has none)
## Checked and fine      (a few lines, so the owner knows what was looked at)
## Larger ideas          (at most three, one line each, never in the severity list)
```

When the run confirms a P0 or P1 bug, the first lines under the title say so, with its steps, before the
summary table.

## Friction signals

Filled from `node scripts/ux-review/friction-rules.mjs <audit folder>/friction` (checklist.md, section 11),
when the project has the probe. One line per route of the brief, then the signals themselves:

```text
<route> | dead <n> | slow <n> | focus lost <n> | layout shift <n> | rage <n>
<route> | probe not loaded
- <route>: <signal> on `<selector>` "<label>" (slow: the delay in ms; layout shift: the sum)
```

A route with no `friction/<route-slug>.json`, or with no install event in it, is "probe not loaded", never zero
counts. A signal stays a HYPOTHESIS until you reproduce it by repeating its steps; a reproduced one moves to
"Confirmed bugs" or "Recommendations" as a finding with its own id, and its line here keeps that id. Without a
probe, the section holds the one line "no probe".

## Fields of every finding

| Field | Content |
|---|---|
| **ID** | `UX-001`, counting up in the order of the summary |
| **Label** | BUG, UX or HYPOTHESIS (taxonomy.md) |
| **Severity** | P0 to P3 (taxonomy.md) |
| **Where** | persona, URL, viewport, language, theme (and the category) |
| **Steps** | numbered, so someone else can repeat them from a fresh page |
| **Expected** / **Actual** | what a reasonable person expects, and what happened |
| **Evidence** | a console or network excerpt when there is one, the file name of one screenshot when the problem is visual or the state is hard to describe, and "n of m" for an intermittent bug |
| **Source** | for a UX finding: the WCAG criterion, Nielsen heuristic or `PRODUCT.md` / `DESIGN.md` rule |
| **Fix** | specific: the component or text and the change, inside the existing components and tokens |
| **Why it helps** | what the user gains, in the user's words |
| **Cost** | S, M or L |
| **Test** | `journey`, `look`, `unit` or `none`, and why (finding-to-test.md). A confirmed P0 or P1 bug needs one |

## Summary table

`| UX-001 | BUG | P1 | Returning user, /dashboard, 1440, en, light | Saving the form shows the old value after a reload | journey |`

One line per finding, ordered as in taxonomy.md. "Checked and fine" is a short bullet list of what you
looked at and found fine, so an empty report is distinguishable from an unfinished one.

## Evidence rules

Per finding: persona, URL, viewport, language, theme, the numbered steps, expected against actual. One
screenshot when the problem is visual, half scale by default, full scale only for a visual defect. Screenshots
show synthetic data only. Screenshots cited by a finding that goes into a change or a fix PR are the only ones
that are published (the way the repository publishes pull request images); the rest stay in the run folder.
