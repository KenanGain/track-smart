# 02 – Inventory · Figma

## Link

**TO CONFIRM — no Figma file exists yet.** As for 01 – Account, this documentation was produced in a session with no Figma account, connector or API token, so the file and its share link could not be created from here. Everything needed to build it is in this folder; once it is built, paste its URL on the line below and in the README.

```
Figma file: <paste the "02 – Inventory" page link here>
```

## What is ready to import

| File | What it becomes in Figma | How to bring it in |
|---|---|---|
| [figma/tokens.json](figma/tokens.json) | **Variables**: a `Color` collection with two modes, *Light* (the app today) and *Dark* (proposed), 31 tokens each — including the violet *accent* family this section adds for signing; **Text styles**: 15 typography tokens | Tokens Studio for Figma ▸ Load from file ▸ *Create variables* and *Create styles* (W3C DTCG JSON, so any DTCG importer works). |
| [figma/components.html](figma/components.html) | **Components**: 15 component sets (one per `data-frame`): Buttons, Status and kind pills, Inputs, Choice controls, Tabs and rails, List header, KPI tiles, Filter row, Item table, Pick list rows, Row menu, Assign dialog, Collection card, Sign form, Typography | Open it in a browser and import with the *html.to.design* plugin; each `section` arrives as a frame — select it ▸ *Create component set*. The CSS uses the token hex values, so swap fills to variables with *Selection colors*. |
| [exports/components/*.png](exports/components/) | 15 reference renders, one per component set | Drag beside the components for review. |
| [exports/components-sheet.png](exports/components-sheet.png) | The whole sheet in one image | Cover / overview. |
| [exports/color-tokens.svg](exports/color-tokens.svg) | Vector swatch board: every token, light and dark, with HEX and Tailwind name | Drag in — it stays vector and editable. |
| [exports/frames/*.png](exports/frames/) | 18 key frames, desktop (1440 × 900) beside mobile (390 × 844), labelled `02 – Inventory / <Tab> / <State>` | Reference frames; rebuild each with the components. |
| [../screenshots/](../screenshots/index.md) | All 238 states (desktop + mobile) | One Figma frame per screenshot for the complete state inventory. |

## Page structure to build

Page **"02 – Inventory"**, four sections left to right, one per tab. Inside each, one frame per state and device, named `tab/state/device` exactly like the screenshot files:

| Section | Frames (desktop 1440 × 900 and mobile 390 × 844 each) |
|---|---|
| List (incl. item page, add / edit item, dialogs) | add-item-alert-custom · add-item-alert-issue-basis · add-item-alert-no-expiry-warning · add-item-assigned-both · add-item-default · add-item-saved · add-item-valid · assign-dialog-both · assign-dialog-driver-only · assign-dialog-picker-open · assign-dialog-unassigned · assign-dialog-unit-only · categories-add-form · categories-delete-blocked · categories-delete-confirm · categories-edit · categories-error-duplicate · categories-error-required · categories-modal · category-keys · columns-picker · condensed-header · default · edit-item · edit-item-saved-activity · filter-assigned · filter-available · group-assignment · group-status · group-vendor · item-detail-activity · item-detail-information · item-detail-information-notes · item-detail-information-unassigned · item-detail-menu · item-detail-monitoring-no-expiry · item-detail-monitoring-off · item-detail-monitoring-on · no-results · pager-rows-8 · row-menu · search · share-dialog · share-dialog-email · sort-expires · view-only |
| Drivers (incl. holder page, Manage inventory, Messages, driver side) | chip-cross-border · columns-picker · condensed-header · default · driver-app-home · filter-expiring · filter-holding-nothing · group-jurisdiction · handback-confirmed · holder-activity · holder-empty-not-found · holder-inventory · holder-inventory-expiring · holder-inventory-grouped · holder-monitoring · holder-overview · manage-confirm · manage-default · manage-forms-picker · manage-grouped · manage-notify · manage-notify-full · manage-notify-somebody-else · manage-read-form · manage-saved · manage-ticked · manage-untick · messages-collection-office · no-results · row-menu · search-item · share-dialog · sign-card-driver · sign-done-card · sign-form · sign-form-nothing-ticked · sign-form-signed |
| Assets (incl. holder page, Manage inventory) | default · filter-expired · group-holdings · holder-inventory · holder-inventory-expired · holder-monitoring · holder-overview · manage-confirm · manage-default · manage-ticked · row-menu |
| Vendors (incl. profile, Add Vendor, sidebar menu) | add-canada · add-default · add-filled · add-saved · columns-picker · company-issued-rows · condensed-header · default · delete-confirm · edit-dialog · filter-inactive-empty · group-jurisdiction · no-results · profile-activity · profile-company-issued · profile-inventory · profile-overview · profile-repair-bills · profile-work-orders · row-menu · search · share-dialog · sort-vendor · standalone-menu · view-only |

Frame setup: 1440 × 900 desktop with the 260 px sidebar + 64 px top bar; 390 × 844 mobile with the drawer closed. Body padding 16 / 24 / 32 px (phone / tablet / desktop), 16 px gap between the KPI row and the list card. Grid: 12 columns, 24 px gutter, 32 px margin (desktop); 4 columns, 16 px gutter / margin (mobile).

## Components and variants to define

| Component | Variants (properties) | Spec |
|---|---|---|
| Button | type = primary / dark / violet / outline / danger / ghost / kebab · state = default / hover / disabled · size = md (36) / sm (32) | design.md §3.1 |
| Input | kind = text / mono / select / date / search · state = default / placeholder / focus · select on = true / false (grouping set) | §3.2 |
| Tick card | checked = true / false · option = Driver / Asset | §3.2 |
| Switch, Radio tile, Checkbox | on / off · tone = primary / violet (switch) | §3.2 |
| Status pill | status = Active / Expiring Soon / Expired | §3.9 |
| Chip | kind = CMV / Non-CMV / Driver / Both / Asset / Unassigned / Assigned / driver type / count | §3.9 |
| Tab | style = section / category rail / step · state = active / idle / done · count = on / off | §3.4 |
| List header | condensed = true / false | §1.1, §5 |
| KPI tile | accent = blue / emerald / amber / red / slate · selected = true / false · clickable = true / false | §1.2 |
| Filter chip | state = active / idle / disabled | §3.9 |
| Table row | kind = item / holder / vendor / pick-list · state = default / zebra / hover / ticked / coming-off · band = true / false | §3.5 |
| Row menu | items 2–3 · last item danger | §3.6 |
| Dialog | kind = assign / category / confirm / delete / edit vendor · footer = 1–3 buttons | §3.7 |
| Collection card | direction = collect / return · state = pending / settled · forms = 0 / 1+ | page-overview §7 |
| Sign-form card | state = unsigned / signed / nothing ticked | page-overview §7 |
| Category tile | category = the 12 categories (icon + palette, design.md §3.10) | §3.10 |

Bind every fill and stroke to the `Color` variables and every text layer to the text styles, so switching the collection's mode to *Dark* previews the proposed dark theme.
