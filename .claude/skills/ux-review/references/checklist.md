# Checklist for each page

A fixed list, so a run costs a bounded number of tool calls. Text before pictures: read the accessibility tree
(`read_page`), take a screenshot only where the picture is the evidence, and at half scale (`scale: 0.5`)
unless the defect is visual detail. Keep raw output in the run folder and bring only the finding back into your
context. Never re-read a page that has not changed. At most 12 interactions per page and persona. An area
that produced no finding after two pages at all three widths is closed.

The scripts below run through `javascript_tool` (the last expression is the result). The source in
parentheses is what a finding of that check cites.

## 1. Load and read

Navigate, then `read_page`, `read_console_messages` and `read_network_requests`. A thrown exception, or a 4xx or
5xx on a normal action, is a BUG candidate at once. Save the request list of the page to
`<audit folder>/network/<page>.txt` (the invoking session checks every host in it against the allowlist).
Hosts to expect: the target's own origins only; any other host is a safety failure, not a finding.

When the browser pane is hidden it draws nothing and makes no request after a hard load until the page gets an
input event: the page may stay on a loading state. Press Shift once (or take a screenshot) after each hard
load and before reading the page. This is the pane, not the app, and is not a finding.

When the brief names a friction probe: after every load (a navigation, a reload, a back or forward that
reloads, a redirect after sign-in), paste `scripts/ux-review/friction-probe.js` through `javascript_tool`,
unchanged. It must return "friction probe installed" or "already installed"; "not installed: ... is not an
audit target" means the origin is not a target, which is a safety stop (safety.md). Section 11 says what to
do with what it records. When the brief says the project has no probe, skip this and section 11.

## 2. First-time lens (WCAG 3.3.2 labels; Nielsen: match with the real world)

Without reading code: is the purpose of the page clear within five seconds, is the next step obvious, is the
primary action visible without scrolling at 375 px, do labels and buttons say what will happen? A first-time
newcomer is the standard, not an expert user.

## 3. Operate

Use every primary control once. For each form: an empty submit, one invalid value, a boundary value, a very
long value (200 characters), accents and emoji, a double click on submit, then the back button. For each
list: the empty state, one item, many items. (Nielsen: error prevention, help users recover.)

Send the action under test as a real pointer click (the `computer` click on a `ref` from `find` or
`read_page`), not `element.click()` from `javascript_tool`: a scripted click skips the events a person sends, so
a stale-UI result obtained with it cannot be told from a quirk of the pane. If a script click is the only way,
say so under Evidence. Check a control by keyboard, its focus ring, its size and its forced failure the first
time you use it, and run any repeat loop (the same action many times, as section 4 allows) last: a loop on a
destructive action uses up the data the other checks need.

## 4. Stale-UI probe: after every action that changes data

1. Note what the page shows (a count, a list, a badge, a button state).
2. Reload. Compare.
3. Open the same page in a second tab (`tabs_create`). Compare. Close it.
4. Go back and forward in history. Compare.

Any difference between what the page showed after the action and what it shows after the reload is a BUG
candidate: the page told the user something that was not (or no longer) true. Repeat the action to see whether
it is deterministic. An intermittent difference is reported as BUG only with "n of m" and the steps; seen once
it stays HYPOTHESIS (taxonomy.md). Repeat up to 10 times an action the page lets you repeat without side
effects, or the number of times the brief sets (and, for an action that uses up data, only on the rows the
brief authorises: safety.md). A one-in-ten race can still slip through a pass of 10; the repeated test of the
fix is what guards it.

## 5. Keyboard and focus (WCAG 2.1.1, 2.4.3, 2.4.7)

Tab through the page with the `key` action. Count the stops to the primary action. Is the focus ring visible
on every stop? Does Escape close dialogs and return focus to the opener? Is there a keyboard trap? A control
that cannot be reached or operated by keyboard is a P1 accessibility blocker.

## 6. Visual, at 1440, 768 and 375 px, light and dark

Switch the width with `resize_window`. Switch the theme the way a user does: with the app's own theme
control when it has one (and the cookie or storage it sets), otherwise with the browser's colour-scheme
emulation (`resize_window` with `colorScheme`), which is what an app that follows `prefers-color-scheme`
answers to. Look for overlap,
clipping, horizontal overflow, heading hierarchy, spacing and alignment against the design tokens, and text
contrast on the page's own backgrounds in dark mode. Scripts:

```js
// horizontal overflow: BUG when scrollWidth > clientWidth
JSON.stringify({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth,
  wide: [...document.querySelectorAll("body *")].filter((e) => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
    .slice(0, 5).map((e) => e.tagName.toLowerCase() + "." + String(e.className).slice(0, 40)) })
```

```js
// touch targets under 24 px (WCAG 2.5.8 AA: BUG), under 44 px is a UX note. Ignore links inside a sentence.
JSON.stringify([...document.querySelectorAll("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch],[role=menuitem]")]
  .filter((e) => !(e.tagName === "A" && e.closest("p,li,td,dd") && getComputedStyle(e).display === "inline"))
  .map((e) => { const r = e.getBoundingClientRect(); return { t: e.tagName.toLowerCase(), n: (e.getAttribute("aria-label") || e.textContent || e.name || "").trim().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
  .filter((x) => x.w > 0 && x.h > 0 && (x.w < 44 || x.h < 44)))
```

```js
// contrast candidates: text blocks, colour against the first opaque ancestor background (WCAG 1.4.3: 4.5:1, large text 3:1)
// the canvas turns any CSS colour (oklch() and other modern tokens included) into sRGB; parsing the computed string reads oklch() as black
(() => {
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (c) => { cv.clearRect(0, 0, 1, 1); cv.fillStyle = c; cv.fillRect(0, 0, 1, 1); return cv.getImageData(0, 0, 1, 1).data; };
  const lum = (d) => { const [r, g, b] = [d[0], d[1], d[2]].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bgOf = (e) => { for (; e; e = e.parentElement) { const d = rgba(getComputedStyle(e).backgroundColor); if (d[3] > 0) return d; } return [255, 255, 255, 255]; };
  return JSON.stringify([...document.querySelectorAll("p,li,a,button,label,h1,h2,h3,span")].filter((e) => e.childElementCount === 0 && e.textContent.trim().length > 3 && e.offsetParent)
    .map((e) => { const s = getComputedStyle(e), f = lum(rgba(s.color)), b = lum(bgOf(e)), r = (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05); return { n: e.textContent.trim().slice(0, 30), px: parseFloat(s.fontSize), r: Math.round(r * 10) / 10 }; })
    .filter((x) => x.r < (x.px >= 24 ? 3 : 4.5)).slice(0, 15));
})()
```

The contrast result is a list of candidates: confirm one by looking at it before it becomes a finding (a
gradient or an image behind the text defeats the script, and a colour with transparency is measured as if
opaque).

## 7. Consistency (Nielsen: consistency and standards; the repo's `PRODUCT.md`)

The same word for the same thing across pages (the glossary, when the product has one, is in `PRODUCT.md`);
the same pattern for the same task (confirmations, empty states, errors), as `DESIGN.md` defines them. Copy
that breaks one of the product's tone rules (safety.md, "Product rules the audit keeps") everywhere is a known
defect, listed once.

## 8. Loading, empty, success and error states

Empty states come from data you control: a brand-new user has nothing, a seeded user has plenty. Success
is seen by completing the action. The pane cannot slow or fail a request by itself. Through `javascript_tool`
wrap the browser's `fetch` for the next call:

```js
// hold the next browser-side request forever (a loading state); restore with window.fetch = window.__realFetch
window.__realFetch ??= window.fetch; window.fetch = () => new Promise(() => {});
```

```js
// fail every browser-side request after 2 s (an error state)
window.__realFetch ??= window.fetch; window.fetch = () => new Promise((_, rej) => setTimeout(() => rej(new TypeError("forced failure")), 2000));
```

This does not reach errors raised while the server renders a page. Anything you could not force goes into
"Not covered".

## 9. Links

On each visited page, request every same-origin link once with a GET, skipping any whose path names an action
(sign-out, delete, unsubscribe, disconnect):

```js
// (window.__realFetch ?? fetch) is the browser's own fetch even after section 8 replaced it
await (async () => {
  const get = window.__realFetch ?? fetch;
  const hrefs = [...new Set([...document.querySelectorAll("a[href]")].map((a) => a.href).filter((h) => h.startsWith(location.origin)).map((h) => h.split("#")[0])
    .filter((h) => !/sign-?out|log-?out|delete|erase|unsubscribe|disconnect|\/dev\//i.test(h)))];
  const bad = [];
  for (const h of hrefs) { try { const r = await get(h, { redirect: "manual" }); if (r.status >= 400) bad.push(h + " " + r.status); } catch { bad.push(h + " failed"); } }
  return JSON.stringify({ checked: hrefs.length, bad });
})()
```

A 404 or 5xx is a BUG candidate (a link to nowhere). List off-site, `mailto:` and `tel:` links in the report and
do not follow them.

## 10. Technical audits that need no eyes

Once per run, one line each in the report: the accessibility line from the brief (copy it, do not rerun it), and
Impeccable `audit` on the files the brief names: read the code, run `detect` as safety.md says, write nothing,
and put what `detect` returned (the count, the exit code, and that on `.tsx` it runs regex rules only) and any
P0/P1 item into one report line. Never a score: `detect` prints none, and the `??/20` table of Impeccable's
own `audit` playbook is not yours to fill in. A detector finding is a candidate: verify it in the page or in
context before it becomes a finding.

## 11. Friction record: before leaving each route

Only when the brief names a friction probe. The probe of section 1 keeps its records in the tab's session storage, under one key that survives a page load
in the same tab. Before you leave a route of the brief, read and clear it:

```js
(() => { const k = "ux-review.friction"; const v = sessionStorage.getItem(k); sessionStorage.removeItem(k); return v ?? "null"; })()
```

Write the text it returns, unchanged, to `<audit folder>/friction/<route-slug>.json`. The slug is the path in
lowercase with every run of other characters than letters and digits replaced by one `-`: `/dashboard/settings`
is `dashboard-settings`, `/` is `root`. If you visit the route again, merge the new `events` into the file. The
file holds the raw events: the classifying is done by a script, not by you. Once at the end, run
`node scripts/ux-review/friction-rules.mjs <audit folder>/friction` and copy its counts into the report's
"Friction signals" section (report-template.md).

- A route whose file is missing, or holds no `install` event, is "probe not loaded" in the report, never "no
  friction".
- The record belongs to the tab you walked. The second tab of section 4 is not probed.
- A viewport resize you make shifts the layout. The probe records the resize, and `friction-rules.mjs` leaves
  out the shifts of the following second, so resizing between widths needs no extra step.
- Paste the probe again after you cleared the record, even when the page did not reload: it then writes a fresh
  install marker, so the next route does not read as "probe not loaded".
- Only real pointer clicks are recorded. A click sent with `element.click()` is not, which is one more reason
  to use the `computer` click of section 3.
- A signal is a HYPOTHESIS (taxonomy.md) until you reproduce it by repeating its steps. Once reproduced it is
  a finding like any other, with a label and a severity.
