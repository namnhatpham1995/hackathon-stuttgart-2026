# UI and UX guide

What made the interfaces of our earlier projects look designed instead of generated, and what kept
breaking them. The tools do most of the work: **impeccable** for design and critique,
**ui-ux-pro-max** for searchable style, palette, font and UX data, and **ux-review** for auditing the
running app like real users. This page is the order to use them in and the rules they check.

## Design direction (ExportReady)

Agreed for the hackathon workspace. Tokens and component rules are in `DESIGN.md` and `src/app/globals.css`.

The workspace uses Vanta and Drata page structure with ExportReady’s own colours. Inter at compact sizes: 14px body, 13px meta, a 26px semibold page title, weights 400/500/600, normal letter-spacing. Layout is a top bar, a docked assistant on the left, a summary beside an evidence card, requirement checklist rows, and a right-hand info sidebar. Status chips stay the existing soft tints (`DOCUMENTED`, `MISSING`, `MISMATCH`, `EXPIRED`, `NEEDS_REVIEW`). Expired certificates and incomplete processing use an amber left-border banner. There is no score, percentage, gauge, "verified" badge, or "Compliant" badge. Counts read “1 documented · 0 open” and “2 of 5 documented”.

## 1. Before the first screen

1. `/impeccable init` writes `PRODUCT.md` (who uses it, what they come to do, the voice) and
   `DESIGN.md` (tokens, type, spacing, components). Every UI task reads both, so keep them current.
2. Shape before building: ask impeccable for two or three directions for the key screen, pick one,
   and write the choice into `DESIGN.md`. A generic first draft scored 20/40 in critique on an
   earlier project; the second pass, with a named direction, was the one people remembered.
3. Look things up instead of guessing: `ui-ux-pro-max` has product palettes, font pairings, UX
   guidelines and stack notes (`python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>"`).
4. For effects, mine [Uiverse](https://github.com/uiverse-io/galaxy) (MIT) for ideas, then rebuild
   them in our tokens. Never paste a snippet: most lack focus states, reduced motion and contrast.

## 2. Tokens and colour

- Colour is a deliverable, not a detail. Give every design PR its own colour and contrast task;
  "close enough" or a framework default is a defect.
- Define every colour as a token in `src/app/globals.css` (OKLCH), each as a **light and dark pair**.
  No raw hex in components.
- Dark mode: store the reader's choice in a cookie and render it on the server, so the page never
  flashes the wrong theme. No cookie means follow the system.
- Contrast: text 4.5:1 (large text 3:1) on every background it can sit on, in both themes. Hover
  and pressed backgrounds count: the darkest hover tint must still keep muted, danger, success and
  warning text at 4.5:1.

## 3. Controls carry their own feedback

Build controls from shared primitives in `src/components/ui/` (the starter has none yet: create
`Button`, `NavItem` and `Field` there on the first UI task), never from a bare `<button>` or a
styled link, so every new page gets the feedback for free:

- **Pressed:** a touch screen has no hover. Give every control an `active:` state (a step darker,
  a slight shrink unless reduced motion), or a tap shows no sign it was taken.
- **Current:** style the current navigation entry from `aria-current="page"`, so what a screen
  reader hears and what the eye sees cannot differ.
- **Pending:** a link to a slow page shows a pending state from the tap until the page arrives
  (`useLinkStatus` in Next.js); a submit button shows it while the request runs and cannot be
  pressed twice.
- **Menus** close on an outside press and on a link to the page already shown; focus returns to the
  menu button.

## 4. Every state, not just the happy one

Each component is designed and checked in six kinds of state: **typical, empty, loading, error,
long values, limit reached**. Long values means a 60-character name, a German compound word, a URL
without spaces. Most real defects we shipped were here:

- A long word or URL pushed a card past 375 px. Use `overflow-wrap: anywhere` / `min-w-0` on flex
  children, and let tables scroll inside their own box.
- An empty list with no next step. Every empty state says what to do and has the button for it.
- An error that only said "Something went wrong". Say what failed and what the person can do.

A cheap way to keep it honest: a dev-only route (404 in production) that renders each component in
each state at its own URL, plus one test that renders them all and fails on a thrown error or a
React warning.

## 5. Layout and responsiveness

- Check **1440, 768 and 375 px, light and dark**, for every page you change. No horizontal scroll
  at any width. This snippet lists the offenders:

  ```js
  JSON.stringify({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
    wide: [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
      .slice(0, 5).map((e) => e.tagName.toLowerCase() + "." + String(e.className).slice(0, 40)) })
  ```

- Reserve space for images and late content, so nothing jumps (layout shift under 0.1).
- After sign-in, sign-up or onboarding, navigate in a way that rebuilds the layout: a client-side
  push can keep the signed-out frame, and a new user then sees no menu.

## 6. Forms

- A visible label on every field; a placeholder is not a label.
- Errors next to the field, in words, and focus moves to the first invalid field. Keep what was typed.
- In a multi-step form, move focus to the new step's heading, show which steps are done, and say
  plainly when something is not saved yet.
- Validate on the server with the same Zod schema; the client check is only for speed.

## 7. Accessibility floor

- Keyboard: everything reachable and operable, focus always visible, logical order, no trap.
- Touch targets at least 24 × 24 px (WCAG 2.5.8); 44 × 44 for primary actions.
- Headings in order, one `h1` per page, landmarks (`header`, `nav`, `main`).
- Images have alt text, icon-only buttons have an `aria-label`.
- `prefers-reduced-motion`: no movement that carries no meaning; nothing autoplays with motion.

## 8. Truth after every change

After every action that changes data, the page must tell the truth: **reload, open it in a second
tab, go back and forward**, and the page must show the same thing as right after the action. A
count, badge or button state that only the reload corrects is a bug. In Next.js, revalidate or
`router.refresh()` after a server action instead of patching client state by hand.

## 9. Words

- Plain words, short sentences, the reader's vocabulary. One name for one thing across the app.
- Buttons say what happens ("Send request", not "Submit").
- If the app has more than one language, decide the register per language once (for example the
  formal "Sie" in German) and treat the other register as a defect.

## 10. Review loop

| When | What |
|---|---|
| While building | impeccable's hooks check every UI edit; `/impeccable critique` on the screen you changed |
| Before the PR | `/impeccable audit` and `/impeccable polish` on the changed screens; the three widths in both themes |
| Before a demo or release | `/ux-review` on a local production build with synthetic data: personas, journeys, three widths, both themes, the stale-UI probe. P0 blocks the demo; P1s are listed. Its tooling is in `scripts/ux-review/` (`pnpm ux-review:serve`, `ux-review:secret-check`, `ux-review:stop`); add each new table's synthetic rows to `seed-personas.ts` |
| After an audit | every confirmed finding larger than a one-line fix becomes a task in the right change's `tasks.md`, not only a line in the audit file |

For a hackathon: one design pass on day one (init, shape, tokens), then build; a short review of
the demo journey on the last afternoon, and fix only what blocks the demo.

**Manual pass** (a quick look without `/ux-review`): run `pnpm build && pnpm start` with
the seeded demo account; walk the demo journey as a first-time user and as a returning user; at 1440,
768 and 375 px in light and dark run the overflow snippet (§5) and look at every state you can reach;
after every action that changes data, reload and open a second tab (§8); then `/impeccable audit` on
the screens you walked. Write each finding as BUG (wrong), UX (works but hurts) or HYPOTHESIS (seen
once), with P0 (blocks the demo) to P3.
