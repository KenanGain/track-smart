# 01 – Account · Figma

## Link

**TO CONFIRM — no Figma file exists yet.** This documentation was produced in a session with no Figma account, connector or API token, so a Figma file and its share link could not be created from here. Everything needed to build the file is in this folder; once it is built, paste its URL on the line below and in the README.

```
Figma file: <paste the "01 – Account" page link here>
```

## What is ready to import

| File | What it becomes in Figma | How to bring it in |
|---|---|---|
| [figma/tokens.json](figma/tokens.json) | **Variables**: a `Color` collection with two modes, *Light* (the app today) and *Dark* (proposed), 28 tokens each; **Text styles**: 15 typography tokens (Inter, size / weight / line height / tracking / case) | Tokens Studio for Figma ▸ Load from file ▸ *Create variables* and *Create styles*. The file is W3C design-token (DTCG) JSON, so any DTCG importer works. |
| [figma/components.html](figma/components.html) | **Components**: 13 component sets (one per `data-frame`): Buttons, Status pills, Inputs, Choice controls, Tabs, Page header, KPI tiles, Cards, Chips and badges, Table, Row menu and toast, Modal, Typography | Open the file in a browser and import it with the *html.to.design* plugin (paste the file's URL or upload it); each `section` arrives as a frame — select a frame ▸ *Create component set*. The CSS uses the same hex values as the tokens, so swap fills to variables with *Selection colors*. |
| [exports/components/*.png](exports/components/) | Reference renders of each component set | Drag onto the page beside the components for review. |
| [exports/components-sheet.png](exports/components-sheet.png) | The whole component sheet in one image | Cover image / overview. |
| [exports/color-tokens.svg](exports/color-tokens.svg) | Vector swatch board: every token, light and dark, with HEX and Tailwind name | Drag in — it stays vector and editable. |
| [exports/frames/*.png](exports/frames/) | 16 key frames, each the desktop (1440 × 900) and mobile (390 × 844) capture side by side, labelled `01 – Account / <Tab> / <State>` | Place as reference frames; rebuild each with the components above. |
| [../screenshots/](../screenshots/index.md) | All 132 states (67 desktop, 65 mobile) | One Figma frame per screenshot for the complete state inventory. |

## Page structure to build

Page **"01 – Account"**, four sections left to right, one per tab. Inside each section, one frame per state and device, named `tab/state/device` exactly like the screenshot files:

| Section | Frames (desktop 1440 × 900 and mobile 390 × 844 each) |
|---|---|
| Fleet Overview | default · condensed-header · view-only · modal-edit-corporate-identity · modal-operations-authority · modal-edit-legal-main-address · modal-edit-mailing-address · modal-edit-cargo-carried · modal-add-office-location · modal-director-details · modal-edit-director · modal-add-director |
| Yard Terminals | default · modal-add-new-location · modal-location-view · row-menu-open · empty-no-match |
| Assets | default · empty-kpi-filter · subtab-trucks · columns-picker-open · row-menu-open · modal-share-to-chat · wizard-add-asset-top · wizard-registration-plate · wizard-driver-assignment · wizard-ownership-financial · wizard-insurance-status · wizard-validation-errors · detail-overview · detail-monitoring · detail-compliances · detail-activity · detail-maintenance · detail-inventory · detail-expenses · detail-inspections · detail-violations · detail-accidents · detail-notifications · detail-condensed-header · detail-modal-share-to-chat |
| Drivers | default · filter-status-on-leave · empty-no-match · row-menu-open · modal-import-drivers · form-add-driver-top · form-license-details · form-travel-documents · form-hours-of-service · form-signature · profile-overview · profile-tab-profile · profile-tab-monitoring · profile-tab-activity · profile-tab-records · profile-tab-consent-forms · profile-tab-training · profile-tab-hours-of-service · profile-tab-inspections · profile-tab-violations · profile-tab-accidents · profile-tab-tickets · profile-tab-inventory · profile-condensed-header · profile-modal-share-to-chat |

Frame setup: 1440 × 900 desktop with a 260 px sidebar + 64 px top bar; 390 × 844 mobile with the drawer closed; Auto Layout on the body, 24 px padding (16 px on mobile), 24 px gap between cards. Grid: 12 columns, 24 px gutter, 24 px margin (desktop); 4 columns, 16 px gutter/margin (mobile).

## Components and variants to define

| Component | Variants (properties) | Spec |
|---|---|---|
| Button | type = primary / outline / share / danger / ghost / icon / kebab · state = default / hover / disabled / focus · size = md (36) / sm (32) | design.md §3.1 |
| Input | kind = text / select / date / search / textarea · state = default / placeholder / focus / error / disabled · label + required pill | §3.2 |
| Yes/No, Toggle, Checkbox | value = yes / no · tone = primary / danger; on / off | §3.2 |
| Status pill | entity = asset / driver · status = Active / Maintenance / Out of Service / Draft / Deactivated / On Leave / Inactive / Terminated · interactive = true / false | §3.2, §3.9 |
| Tab | style = underline / segmented / rail · state = active / idle · count = on / off | §3.4 |
| KPI tile | accent = blue / emerald / rose / amber / sky / slate · selected = true / false · width = narrow (< 240) / wide | §3.3 |
| Card | kind = section / wizard-section / stat-tile / fact-block · editable = true / false | §3.3 |
| Table row | state = default / hover · has-actions = true | §3.5 |
| Row menu | items 3–5 · last item danger | §3.6 |
| Modal | size = md (560) / lg (672) · footer = 1 / 2 buttons | §3.7 |
| Toast, Banner, Chip, Avatar | banner tone = info / warning / out-of-service; chip = count / missing / filter / cargo / type | §3.8–3.9 |

Bind every fill and stroke to the `Color` variables and every text layer to the text styles, so switching the collection's mode to *Dark* previews the proposed dark theme.
