---
name: reference-uiverse-galaxy
description: "github.com/uiverse-io/galaxy: MIT collection of ~3,800 HTML/CSS UI snippets, a source of effect ideas to rebuild in our own tokens"
metadata:
  type: reference
---

Buttons, cards, loaders, toggles, inputs, checkboxes, forms, patterns, tooltips, notifications; one file per snippet (`<author>_<slug>.html`). The user keeps it as a source for making pages livelier.

Borrow ideas, never paste code. Measured 2026-10-14: only 7 snippets respect `prefers-reduced-motion`, about 95 use ARIA, about 1,145 loop animations forever, many style bare `button {}` selectors, and some split text into one span per letter, which breaks screen readers. Rebuild an effect in this repo's tokens with reduced motion and accessibility handled (the impeccable skill's `animate` and `delight`).

To scan it, clone shallowly into the scratchpad; on Windows use a Node script, since a per-file shell loop times out.
