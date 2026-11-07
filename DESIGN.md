# Design

ExportReady's workspace. The visual direction was agreed for the hackathon: Vanta and Drata, in a calm Atlassian-like enterprise style. Drata is the model for the assistant panel.

This is an Operate surface. People scan a product, add documents, and read an evidence report. Precision and familiar patterns matter more than display.

## Principles

- Vanta and Drata page structure, ExportReady colours. White cards, a 1px border, a 4–6px radius. No decorative shadow.
- One sans-serif (Inter). Body 14px, meta and labels 13px, page title 26px semibold. Weights 400, 500 and 600. Letter-spacing stays at 0. Near-black text, grey secondary text. Monospace only for part numbers, revisions, and quoted evidence.
- Medium density. Breadcrumbs, a metadata strip, a summary panel beside an evidence card, checklist rows, a right-hand info sidebar, and the assistant docked on the left. No KPI tiles, charts, gauges, or progress rings.
- Status is a chip: a soft tint, dark text, an icon, and a label. Counts read "1 documented · 0 open".
- Hard rule: no score, percentage, readiness rating, "verified" badge, or "Compliant" badge. The report is not a certification.

## Colour

Tokens live in `src/app/globals.css` as OKLCH, each chrome colour with a light and a dark value. Components use the token utilities (`bg-paper`, `text-ink`) and never a raw hex.

Light is the default scene: a desk, a long reading session, paper behind the work. Dark follows the system until the reader chooses, then a `theme` cookie is rendered on the server so the first paint matches.

| Token | Role |
|---|---|
| `paper` | Page background, off-white |
| `card` | Cards, inputs, the assistant panel |
| `ink` | Near-black body text |
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
- Body 14px / 400. Meta and labels 13px / 400 or 500. Section titles 16px / 600. Page title 26px / 600. Letter-spacing is 0.
- Numbers use `tabular-nums`.

## Space and depth

- 4px base. Related items sit 8–12px apart. Sections sit 40px apart. A heading has more space above it than below it.
- Cards use a 1px `line` border and a 6px radius. No shadow.
- From 1280px the assistant is a 300px column on the left of the work. The product and report pages add a 240px info sidebar on the right. Below that, both stack. The top bar holds Products, the current product, and Report.
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
Top bar: ExportReady · Products · Product · Report          Assistant · theme · account
Connections strip
+------------------+----------------------------------+------------------+
| Assistant        | Breadcrumb                       | Requested by     |
| (Drata panel)    | Title, metadata, actions         | Date             |
|                  | Summary        | Evidence        | 2 of 5 documented|
|                  | Requirement checklist R1–R5      |                  |
+------------------+----------------------------------+------------------+
```

At 375px the assistant is closed until Assistant is pressed, and the info sidebar sits under the work. At 1280px and 1440px the three regions show.

## Voice

Plain sentences. Buttons name the action ("Upload and assess", "Copy request", "Create product"). One name for each thing: evidence report, not passport score. "Declared by supplier" is the label for profile values, which are never evidence.

## Motion

Pressed controls shrink slightly. Nothing else moves. `prefers-reduced-motion` removes the shrink. Nothing autoplays.

## Out of bounds

Do not add a readiness score, a percentage, a gauge, a chart, a "verified" or "Compliant" badge, or a second accent colour. Do not restyle status as white text on a saturated pill. Do not use a display serif or a second sans.
