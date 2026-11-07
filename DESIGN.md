# Design

TradeReady's workspace. The visual direction was agreed for the hackathon: Vanta and Drata, in a calm Atlassian-like enterprise style. Drata is the model for the assistant panel.

This is an Operate surface. People scan a product, add documents, and read an evidence report. Precision and familiar patterns matter more than display.

## Principles

- Vanta and Drata page structure, TradeReady colours. White cards, a 1px border, a 4–6px radius. No decorative shadow.
- One sans-serif (Inter). Body 14px, meta and labels 13px, page title 26px semibold. Weights 400, 500 and 600. Letter-spacing stays at 0. Near-black text, grey secondary text. Monospace only for part numbers, revisions, and quoted evidence.
- Medium density, progressive disclosure. A page shows a header and one working list. Requirement rows and findings are one line until opened. The report uses tabs for Findings, the action plan, and the request draft. The assistant stays closed until asked for. No KPI tiles, charts, gauges, or progress rings.
- Status is a chip: a soft tint, dark text, an icon, and a label. Counts read "1 documented · 0 open".
- Hard rule: no score, percentage, readiness rating, "verified" badge, or "Compliant" badge. The report is not a certification.
- Forbidden as decoration: gradients, glass, glow or coloured shadows, radii above 8px, emoji, sparkles, blobs, illustrations, purple-to-blue accents, icon-in-a-coloured-circle tiles, hero headings inside the app, marketing slogans, centred layouts, KPI tiles, and badges that are not a status lozenge.

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
| `control-border` | Input boundaries with at least 3:1 contrast |
| `selected` / `selected-ink` | Current navigation and SDK selection roles |
| `accent` / `accent-ink` | The one accent, used for primary actions and links' focus |
| `navy` | Sidebar background in both themes |
| `danger` | Form errors |
| `documented`, `missing`, `mismatch`, `expired`, `review` | Chip fills, each with an `-ink` text colour |
| `banner` | Amber fill for the expired-certificate and processing-incomplete banners |

Status hues preserve meaning across themes. Dark status backgrounds and text use Atlassian’s paired palette.

Expired certificates and incomplete processing use an amber section message: the existing amber fill and dark text, with a 1px border. No thick side stripe.

## Type

- Sans: Inter, loaded with `next/font`, `font-display: swap`. Fallback: `ui-sans-serif, system-ui, sans-serif`.
- Mono: IBM Plex Mono, only on part numbers, revisions, and citation quotes.
- Body 14px / 400. Meta and labels 13px / 400 or 500. Section titles 16px / 600. Page title 26px / 600. Letter-spacing is 0.
- Numbers use `tabular-nums`.

## Space and depth

- 4px base. Related items sit 8–12px apart. Sections sit 40px apart. A heading has more space above it than below it.
- Cards use a 1px `line` border and a 6px radius. No shadow.
- The assistant is closed by default. It opens as a right-side dialog up to 400px wide, with native focus containment and Escape dismissal. The workspace has a 208px navigation sidebar and a left-aligned content area capped at 1280px including its padding. At 1100px the sidebar becomes 184px. Below 768px navigation moves to the top bar. Hairline dividers separate rows. Radius stays at 6px or below.
- Report and form copy stay in a column of about 65–75 characters.

## Components

Shared primitives are `Button`, `Field`, and `NavItem` in `src/components/ui/`. Button actions use Atlaskit Button. Status labels use Atlaskit Lozenge with the supplied semantic colours, and report navigation uses Atlaskit Tabs. The existing Next.js link adapter preserves client navigation and pending feedback.

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
Sidebar · TradeReady, Products, account, sign out
Top bar · Supplier workspace, Assistant, theme
Page header · breadcrumb, title, supplier and part metadata, next action
Product navigation · Documents, Evidence report
Working list · aligned requirement, status, document and action columns
Report sections · Findings, Action plan, Request draft
```

The assistant is closed until Assistant is pressed. At 375px each row wraps into a requirement line, status and action line, then a filename line. Filenames remain proportional text. Exact evidence quotations use monospace.

## Voice

Plain sentences. Buttons name the action ("Upload and assess", "Copy request", "Create product"). One name for each thing: evidence report, not passport score. "Declared by supplier" is the label for profile values, which are never evidence.

## Motion

Pressed controls shrink slightly. The theme button uses a 240ms sun-to-moon mask transition to confirm the light or dark state. Sun rays fade and rotate as a crescent forms. Theme geometry follows the server-rendered theme to avoid a wrong first icon. Reduced motion removes the transforms and uses the final icon immediately. Nothing autoplays.

## Out of bounds

Do not add a readiness score, a percentage, a gauge, a chart, a "verified" or "Compliant" badge, or a second accent colour. Do not restyle status as white text on a saturated pill. Do not use a display serif or a second sans.


## Atlassian foundations

Use the 8px spacing foundation with 4px subdivisions. Main page padding is 40px on desktop, 24px on tablets, and 16px on phones. Keep semantic state, selection, focus, and primary-action colours separate. Selected navigation has both a background and a current-page attribute. Selected tabs have an underline. Focus adds a distinct outline. The supplied Inter family and TradeReady status colours remain the product identity. [Atlassian foundations](https://atlassian.design/foundations/)

| Component | Dimensions and behaviour |
|---|---|
| Page title | 1.625rem, 600 weight, 1.2 line height. 1.5rem on small phones |
| Body and metadata | 14px body, 13px metadata, 12px supporting table details |
| Button | 44px default, 32px compact, 6px corners, visible focus and pending state |
| Status lozenge | 22px approximate height, 4px corners, icon plus label, restrained semantic fill |
| Requirement row | 76px minimum on desktop. Requirement, 132px status, document, 92px action. Tablet filenames move below the title |
| Expanded evidence | 20–24px vertical padding, 75-character reading measure, requirement, finding, all cited quotes, next action |
| Report tabs | Atlaskit Tabs handles selection, arrow keys, Home/End, linked panels and focus |
| Section message | 1px semantic border, 12px padding, icon, explicit problem and recovery |
| Empty report | One document icon, a short explanation, one Add documents action |
| Assistant | 400px maximum width, 64px header, fixed composer. Unavailable state disables composition until the service is connected |

The report uses the repository’s answer key. R2 is the expired ISO certificate, R3 is the revision mismatch, and R4 is the missing traceability record. The corrected demo resolves only R3. Demo products are labelled explicitly.


Atlassian’s Figma library guide describes its employee-only libraries and their alignment with React components. The implementation uses the publicly available component specifications and Atlaskit Tabs. Stable SDK feature variants are selected through the package’s supported resolver because this application has no Atlassian feature-gate service. [Figma library guidance](https://atlassian.design/get-started/design/figma-libraries/atlassians)


## Paired colour values

The current values come from the installed Atlassian token package, converted to OKLCH in `globals.css`. Neutral surfaces carry most of the interface. Semantic colour appears on status and feedback. [Atlassian colour foundations](https://atlassian.design/foundations/color)

| Role | Light | Dark |
|---|---|---|
| Main surface | #FFFFFF | #1F1F21 |
| Navigation surface | #F8F8F8 | #18191A |
| Text | #292A2E | #CECFD2 |
| Secondary text | #505258 | #A9ABAF |
| Primary action | #1868DB | #669DF1 |
| Selection | #E9F2FE | #1C2B42 |
| Documented background | #BAF3DB | #164B35 |
| Missing background | #FCE4A6 | #693200 |
| Mismatch background | #FFD5D2 | #5D1F1A |
| Expired background | #F5E989 | #533F04 |

The single theme control lives in the shared top bar at every width. Its accessible name updates with the selected theme and system preference.
