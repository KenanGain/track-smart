# 03 – Tickets · Figma

## Link

**TO CONFIRM — no Figma file exists yet.** As for 01 – Account, this documentation was produced in a session with no Figma account, connector or API token, so the file and its share link could not be created from here. Everything needed to build it is in this folder; once it is built, paste its URL on the line below and in the README.

```
Figma file: <paste the "03 – Tickets" page link here>
```

## What is ready to import

| File | What it becomes in Figma | How to bring it in |
|---|---|---|
| [figma/tokens.json](figma/tokens.json) | **Variables**: a `Color` collection with two modes, *Light* (the app today) and *Dark* (proposed), 31 tokens each; **Text styles**: 15 typography tokens | Tokens Studio for Figma ▸ Load from file ▸ *Create variables* and *Create styles* (W3C DTCG JSON, so any DTCG importer works). |
| [figma/components.html](figma/components.html) | **Components**: 15 component sets (one per `data-frame`): Buttons, Status pills and badges, Inputs, Choice controls, Header and tabs, KPI cards, Missing banner, Sub-category cards, Ticket table, Phone card, Row menu, Detail tiles, Review and resolution, Resolution dialog, Typography | Open it in a browser and import with the *html.to.design* plugin; each `section` arrives as a frame — select it ▸ *Create component set*. The CSS uses the token hex values, so swap fills to variables with *Selection colors*. |
| [exports/components/*.png](exports/components/) | 15 reference renders, one per component set | Drag beside the components for review. |
| [exports/components-sheet.png](exports/components-sheet.png) | The whole sheet in one image | Cover / overview. |
| [exports/color-tokens.svg](exports/color-tokens.svg) | Vector swatch board: every token, light and dark, with HEX and Tailwind name | Drag in — it stays vector and editable. |
| [exports/frames/*.png](exports/frames/) | 18 key frames, desktop (1440 × 900) beside mobile (390 × 844), labelled `03 – Tickets / <Tab> / <State>` | Reference frames; rebuild each with the components. |
| [../screenshots/](../screenshots/index.md) | All 109 states (desktop + mobile) | One Figma frame per screenshot for the complete state inventory. |

## Page structure to build

Page **"03 – Tickets"**, four sections left to right, one per tab. Inside each, one frame per state and device, named `tab/state/device` exactly like the screenshot files:

| Section | Frames (desktop 1440 × 900 and mobile 390 × 844 each) |
|---|---|
| List (incl. dialogs, missing references, view-only) | condensed-header · default · default-full · delete-confirm · filter-date-range · filter-document-electronic · filter-source-cvor · filter-status-in-court · filter-type-speeding · missing-expanded · missing-selected · missing-synced · pager-page-2 · row-menu · search-driver · search-no-results · share-dialog · share-dialog-external · subcategory-selected · tab-controlled-substances · tab-hours-of-service · tab-other-empty · tab-unsafe-driving · view-only |
| Ticket detail (Overview, Documents, Review, Activity, dialogs) | activity · delete-confirm · documents · documents-empty · header-menu · monitored-date-edit · overview · overview-eticket · overview-full · resolution-dialog · resolution-dialog-email · resolution-dialog-training · resolution-sent · review · review-closed · review-note-editor · review-verified · share-dialog |
| Add / Edit ticket | add-code-search · add-dates-monitoring · add-default · add-documents · add-driver-picked · add-fine-total · add-location · add-native-validation · add-vehicle-2 · add-violations · edit-default · edit-saved |

Frame setup: 1440 × 900 desktop with the 260 px sidebar + 64 px top bar; 390 × 844 mobile with the drawer closed. Body padding 16 / 24 / 32 px (phone / tablet / desktop), 16 px gap between the KPI row and the list card. Grid: 12 columns, 24 px gutter, 32 px margin (desktop); 4 columns, 16 px gutter / margin (mobile).

## Components and variants to define

| Component | Variants (properties) | Spec |
|---|---|---|
| Button | type = primary / outline / danger / link / kebab · state = default / hover / disabled · label = full / icon-only (phones) | design.md §3.1 |
| Status pill | status = Due / In Court / Paid / Closed · size = sm / md · editable = true | §3.2 |
| Badge | kind = Paper / eTicket · type = Speeding / Overweight / Logbook violation / Equipment defect / Insurance lapse / Red Light / Parking · OOS · severity = OOS / Critical / Serious / Moderate / Minor · source = SMS / CVOR / NSC / Violation Log | §3.9 |
| Input | kind = search / date / select / text / number / read-only total · state = default / focus | §3.2 |
| Charge chip, penalty chip | selected = true / false | §3.2 |
| Yes / No control | value = yes / no / unset · tone = primary / danger | §3.2 |
| Category tab | state = active / idle · count | §3.4 |
| KPI card | metric = total / outstanding / open / in court / paid / electronic | §3.3 |
| Sub-category card | palette = 8 hues · selected = true / false | §3.3 |
| Missing banner | state = work to do / reconciled · expanded = true / false | page-overview §2.3 |
| Table row / phone card | state = default / hover · kind = paper / eTicket · oos = true / false | §3.5 |
| Detail tile | kind = status / fine / due date / final date · tone = rose / amber / slate | §1.2 |
| Monitored date card | state = rest / edit · monitoring = on / off | §3.2 |
| Resolution button | action = training / warning / alert / notice / terminate / dismiss | §3.1 |
| Dialog | kind = remove / share / resolution / resolution-sent | §3.7 |

Bind every fill and stroke to the `Color` variables and every text layer to the text styles, so switching the collection's mode to *Dark* previews the proposed dark theme.
