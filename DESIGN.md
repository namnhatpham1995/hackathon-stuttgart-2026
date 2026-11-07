# Design

ExportReady's workspace. The visual direction was agreed for the hackathon: Vanta and Drata, in a calm Atlassian-like enterprise style. Drata is the model for the assistant panel.

This is an Operate surface. People scan a product, add documents, and read an evidence report. Precision and familiar patterns matter more than display.

## Principles

- Light and airy. White cards on an off-white background. A left sidebar. Deep navy for text and for the navigation. One calm blue accent.
- One sans-serif for the whole product (Inter), with tabular numbers. Monospace only for part numbers, revisions, and quoted evidence. No display face.
- Medium density. Lists and tables. No KPI tiles, charts, gauges, or progress rings.
- Status is a chip: a soft tint, dark text, an icon, and a label. Counts read "1 documented · 0 open".
- Hard rule: no score, percentage, readiness rating, "verified" badge, or "Compliant" badge. The report is not a certification.

## Colour

Tokens live in `src/app/globals.css` as OKLCH, each chrome colour with a light and a dark value. Components use the token utilities (`bg-paper`, `text-ink`) and never a raw hex.

Light is the default scene: a desk, a long reading session, paper behind the work. Dark follows the system until the reader chooses, then a `theme` cookie is rendered on the server so the first paint matches.

| Token | Role |
|---|---|
| `paper` | Page background, off-white |
| `card` | Cards, inputs, the assistant panel |
| `ink` | Text and the navy used for body copy |
| `muted` | Secondary text, still 4.5:1 on paper and on card |
| `line` | Hairline borders and dividers |
| `accent` / `accent-ink` | The one accent, used for primary actions and links' focus |
| `navy` | Sidebar background in both themes |
| `danger` | Form errors |
| `documented`, `missing`, `mismatch`, `expired`, `review` | Chip fills, each with an `-ink` text colour |
| `banner` | Amber fill for the expired-certificate and processing-incomplete banners |

Status chips keep the same light tint and dark text in both themes, so a status does not change colour when the page theme changes.

The expired and processing-incomplete banners use an amber left border. That border is reserved for those banners.

## Type

- Sans: Inter, loaded with `next/font`, `font-display: swap`. Fallback: `ui-sans-serif, system-ui, sans-serif`.
- Mono: IBM Plex Mono, only on part numbers, revisions, and citation quotes.
- Body 14px, titles 24px semibold, section headings 18px semibold. Tracking on titles stays tighter than -0.04em (`tracking-tight`).
- Numbers use `tabular-nums`.

## Space and depth

- 4px base. Related items sit 8–12px apart. Sections sit 40px apart. A heading has more space above it than below it.
- Cards use a 1px `line` border, an 8px radius, and a soft shadow with a 1px vertical offset. No glow, no hard offset shadow.
- The sidebar is 240px from 768px up. The assistant column is 320px from 1280px up. Below that the assistant stacks under the work. Below 768px the sidebar becomes a menu.
- Report and form copy stay in a column of about 65–75 characters.

## Components

Shared primitives are `Button`, `Field`, and `NavItem` in `src/components/ui/`.

- Buttons show a pressed state (a slight shrink, removed when reduced motion is requested) and cannot be activated twice while a submit is pending. Primary actions are at least 44px tall.
- Links that navigate show "Opening…" from `useLinkStatus` until the next page is ready.
- `NavItem` marks the current page with `aria-current="page"`.
- Every field has a visible label. Errors sit under the field and focus moves to the first invalid one.

Workspace components:

- Status chip for `DOCUMENTED`, `MISSING`, `MISMATCH`, `EXPIRED`, `NEEDS_REVIEW`.
- Amber banner for an expired certificate and for processing that did not finish.
- Evidence list grouped by readiness dimension.
- Action plan: one numbered step per unresolved finding.
- Document-request draft with a copy button. The app does not send it.
- Assistant panel: a quiet column with a composer that stays disabled until the text assistant is connected. The workspace works without it.
- Origin badges on draft fields: You, Assistant, From document.

## Layout

```text
+----------+---------------------------+------------------+
| Sidebar  | Product, upload, report   | Assistant        |
| Products |                           |                  |
| Report   |                           |                  |
| Connections (slot)                  |                  |
+----------+---------------------------+------------------+
```

At 375px the three regions stack and the sidebar is a menu. At 768px the sidebar sits beside the work and the assistant moves below. At 1280px and 1440px all three columns show.

## Voice

Plain sentences. Buttons name the action ("Upload and assess", "Copy request", "Create product"). One name for each thing: evidence report, not passport score. "Declared by supplier" is the label for profile values, which are never evidence.

## Motion

Pressed controls shrink slightly. Nothing else moves. `prefers-reduced-motion` removes the shrink. Nothing autoplays.

## Out of bounds

Do not add a readiness score, a percentage, a gauge, a chart, a "verified" or "Compliant" badge, or a second accent colour. Do not restyle status as white text on a saturated pill. Do not use a display serif or a second sans.
