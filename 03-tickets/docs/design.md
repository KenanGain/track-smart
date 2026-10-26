# 03 – Tickets · Design specification

How the Tickets section is built visually — layout, type, components, icons, motion and accessibility — as it stands in the app on 2026-10-23. Read from the running UI and the component source (`src/pages/tickets/*`, `src/components/ui/ReviewResolution.tsx`, `src/components/share/ResolutionSendDialog.tsx`, the shared list and wizard components). Screenshot links point into [`../screenshots/`](../screenshots/index.md).

Stack for the visuals: **Tailwind CSS v4** utilities (default palette), **Inter**, **lucide-react** icons, `cn()` (clsx + tailwind-merge). The app shell (sidebar, top bar, carrier switcher) is the same as in [01 – Account](../../01-account/docs/design.md).

---

## 1. Layout

### 1.1 Page frame

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Sidebar      │ Top bar (64 px)                                      │
│ 260 px       ├──────────────────────────────────────────────────────┤
│ (drawer      │ List header (condenses on scroll)                    │
│  below md)   │   icon · Tickets & Offenses · count · description    │
│              │   · Export · Add Ticket   [KPI chips when condensed] │
│              │   category tabs (never scroll away)                  │
│              ├──────────────────────────────────────────────────────┤
│              │ Body (the only scroller, p-4)                        │
│              │   KPI cards → missing-references banner →            │
│              │   one card: sub-category cards · filters · table     │
│              │   (≥ md) or phone cards (< md) · pager               │
└──────────────┴──────────────────────────────────────────────────────┘
```

- **One route, three views.** The list, the ticket detail page and the add / edit form replace each other inside `/tickets`; the sidebar and top bar stay. [list-default](../screenshots/desktop/list/list-default-desktop.png) · [detail-overview](../screenshots/desktop/detail/detail-overview-desktop.png) · [form-add-default](../screenshots/desktop/form/form-add-default-desktop.png).
- **Header fold:** after 140 px of scroll and 40 px of travel the title shrinks, the description folds and a KPI chip strip appears; the category tabs stay. [list-condensed-header](../screenshots/desktop/list/list-condensed-header-desktop.png).
- **Detail page:** fixed header band (breadcrumb strip, identity block, actions, four tiles, tabs) over its own scroller; Overview has a 224 px sticky **Jump to section** rail on the right (`lg`+) or a floating **Sections** button (phones). [detail-sections-menu (mobile)](../screenshots/mobile/detail/detail-sections-menu-mobile.png).
- **Form:** Wizard chrome — `WizardHeader`, a 288 px **Progress** rail (`md`+) with six steps and scroll-spy, `WizardSection` cards in one scroller. [form-add-violations](../screenshots/desktop/form/form-add-violations-desktop.png).

### 1.2 Grids

| Where | Grid | Screenshot |
|---|---|---|
| KPI cards | 2 → 3 (`sm`) → 6 (`xl`), gap 12 | [list-default-mobile](../screenshots/mobile/list/list-default-mobile.png) |
| Sub-category cards | 2 / 3 / 4 / 6 (`sm` / `md` / `lg`) | [list-subcategory-selected](../screenshots/desktop/list/list-subcategory-selected-desktop.png) |
| Filters | phones: 2-column grid (date range spans 2); `sm`+: wrapping row | [list-filter-date-range](../screenshots/desktop/list/list-filter-date-range-desktop.png) |
| Table | `min-w-[1400px] table-fixed`, first + last columns sticky | [list-default](../screenshots/desktop/list/list-default-desktop.png) |
| Phone card | 2-column `dl` (Driver, Vehicle, Date, Location) | [list-default-mobile](../screenshots/mobile/list/list-default-mobile.png) |
| Detail tiles | 2 → 4 (`lg`) | [detail-overview](../screenshots/desktop/detail/detail-overview-desktop.png) |
| Detail field grids | 2 → 3 (`sm`); vehicle cards 1 → 2 (`md`) | [detail-overview-full](../screenshots/desktop/detail/detail-overview-full-desktop.png) |
| Form fields | 1 → 2 (`sm` / `md`); Identifiers fixed 2 columns | [form-add-location](../screenshots/desktop/form/form-add-location-desktop.png) |

### 1.3 Spacing and heights
Tailwind's 4 px scale: 4–6 px icon gaps, 8–12 px control gaps and card padding-y, 16 px body padding (`p-4`) and cell padding-x, 20–24 px card padding. Heights: list toolbar inputs and selects **32 px** (`h-8`), header buttons **36 px** (`h-9`, 32 when condensed), form inputs 36–40 px, status pills ~22 px, kebab 28–32 px.

### 1.4 Breakpoints

| Width | Behaviour |
|---|---|
| < 640 (`sm`) | Drawer sidebar; header description hidden; **Export** icon-only; **Add Ticket → "Add"**; filters in a 2-column grid; detail **Share** icon-only and **Edit Ticket → "Edit"** |
| < 768 (`md`) | **Phone cards instead of the table**; form Progress rail hidden |
| < 1024 (`lg`) | Detail tiles 2-up; **Sections** button instead of the Jump-to-section rail; identity block and actions stack |
| < 1280 (`xl`) | KPI cards 3-up |
| ≥ 768 | Table, 1400 px minimum, horizontal scroll with pinned citation and actions columns |

---

## 2. Typography

**Inter** (400 / 500 / 600 loaded; `font-bold` is synthesised — TO CONFIRM, as in Account). `tabular-nums` on dates, money and counts; `font-mono` for citation numbers in the detail, codes, licence, VIN, plate and identifier values.

| Role | Size / weight | Where |
|---|---|---|
| List title | 24 px bold (20 px `sm`–`lg`, 14–16 px condensed) | "Tickets & Offenses" |
| Detail title | 24 px bold | "Ticket OFF-84729" |
| Wizard title | 24 px bold + 14 px subtitle | "Add Driver Ticket" |
| KPI value | 24 px bold, tone colour | Outstanding "$8,124" |
| Card / section title | 14–16 px semibold + 12 px subtitle | "Driver & Vehicles", "Review & resolution" |
| Table header | 11 px bold uppercase slate-500 | "TICKET CITATION #" |
| Cell | 13–14 px; citation 14 px semibold blue | |
| Field label | 10–11 px bold uppercase `tracking-wider` | "DRIVER LICENCE" |
| Pill / badge | 9–11 px bold uppercase | DUE, PAPER, eTicket, OOS |
| Button | 14 px semibold (13 px in toolbars) | |

Frequency in the section's source: `text-[11px]` 46 × · `text-[10px]` 43 × · `text-sm` 34 × · `text-[13px]` 23 × · `text-xs` 21 × · `text-[12px]` 19 × · `text-[9px]` 5 ×.

---

## 3. Components

### 3.1 Buttons
| Variant | Look | Examples |
|---|---|---|
| Primary | blue-600, white 14 px semibold, `h-9`, radius 8 | Add Ticket, Edit Ticket, Save Ticket, Sync feeds, Send & close review |
| Secondary | white, slate-200 border | Export, Share to chat, Show missing, Cancel, Add note |
| Danger | rose-600 | Remove ticket; "Terminate driver" (red outline) |
| Resolution tiles | outline buttons tinted per action — training violet, warning amber, safety alert orange, notice blue, terminate red, dismiss slate | [detail-review](../screenshots/desktop/detail/detail-review-desktop.png) |
| Ghost / link | blue text | Clear sub-filter ✕, Reset filters, "+ Add" in the missing table |
| Icon | 28–32 px | ⋮ kebab, × dismiss, × close |

### 3.2 Inputs and controls
- Search / date / select inputs `h-8` in the list toolbar; form inputs taller with labels above. Focus ring blue (`ring-2 ring-blue-500/30`).
- **Status pill** — a native `<select>` styled as a rounded uppercase pill with a dot and chevron: Due amber, In Court blue, Paid emerald, Closed slate. Used on rows, cards, the detail header, the Status tile and the money card.
- **Yes / No segmented control** (commercial vehicle, out of service) — click the active side to clear; Yes red for "Out of Service?".
- **Charge chips** (violation picker) — toggles with a check; **code combobox** with search and "[code] description · group · SMS" rows.
- **Penalty chips** — multi-select.
- **Switch** per document type; **file drop zone** "Drag & drop files, or click to browse".
- **Monitoring & Notifications** block (shared): switch, basis radios, date chip / input, reminder checkboxes, channel checkboxes, projected schedule.
- **Monitored-date card** — click-to-edit tile with "Monitoring on / off" pill; edit state has a blue ring and an "Editing" tag.

### 3.3 Cards
White, slate-200 border, radius 12, `shadow-sm`. **KPI card**: 1.5 px coloured bar on the left, label, big value, sub-line, tinted icon square. **Sub-category card**: palette bar on top (sky, violet, emerald, amber, rose, indigo, teal, fuchsia in rotation), group name, count, % chip, progress bar; selected = slate-900 border and ring. **Banner**: left accent bar amber (work to do) / emerald (reconciled). **Detail info card**: blue icon + title row, uppercase label / value grid, "—" for empty.

### 3.4 Tabs
- Category tabs (`SubTabs`): underline, count badge, zero counts shown, chevrons on overflow.
- Detail tabs: underline with count pills (Documents, Activity).
- Form steps: numbered rail with counts and green checks.

### 3.5 Table and phone cards
Header 11 px uppercase on slate-50; rows hover slate-50; pinned first and last columns with soft shadows; no sort. Violation type badges: Speeding red, Overweight orange, Logbook violation purple, Equipment defect slate, Insurance lapse pink, Red Light red, Parking slate; **OOS** red chip; kind badge **PAPER** blue / **eTicket** violet; three doc icons (emerald when on file). Phone card: citation + badges + ⋮, violation line, 2-column facts, fine, doc icons, status pill. [list-row-menu-mobile](../screenshots/mobile/list/list-row-menu-mobile.png).

### 3.6 Menus
`KebabMenu` 184 px, portal, closes on scroll / resize: Open ticket · Edit ticket · Share to chat · **Delete ticket** (red, last). Detail header menu: Edit ticket · Delete ticket.

### 3.7 Dialogs
| Dialog | Size / behaviour | Screenshot |
|---|---|---|
| Remove this ticket? | small, blurred backdrop (click = cancel) | [list-delete-confirm](../screenshots/desktop/list/list-delete-confirm-desktop.png) |
| Share Ticket … (list) / Share ticket (detail) | `max-w-4xl`, 640 px high, compose + attachments panes | [detail-share-dialog](../screenshots/desktop/detail/detail-share-dialog-desktop.png) |
| Resolution dialog | `max-w-xl`, max 90 vh, **fixed header and footer, middle scrolls** | [detail-resolution-dialog](../screenshots/desktop/detail/detail-resolution-dialog-desktop.png) |
| Resolution sent | same modal, green check, Done / Open in Messages | [detail-resolution-sent](../screenshots/desktop/detail/detail-resolution-sent-desktop.png) |

### 3.8 Toasts
None. Saving returns to the list; status and review changes show in place.

### 3.9 Pills and chips
Status pill (above) · kind badge · type badge · OOS chip · severity chips in the missing table (OOS red, Critical rose, Serious amber, others slate) · source chips (SMS blue, CVOR Conv. rose, Contrav. fuchsia, Violation Log slate) · review status (In Review amber, Closed emerald) · resolution chip · "Primary" tag on the first violation · "Monitoring on / off" · Yes / No pills in the money card.

---

## 4. Icons

lucide-react, 12–20 px, stroke 2. 50 distinct icons in the section's files:

AlertOctagon · AlertTriangle · Ban · Bell · BellOff · BellRing · Calendar · CalendarClock · Check · CheckCircle · CheckCircle2 · ChevronDown · ChevronLeft · ChevronRight · ChevronUp · ClipboardCheck · Clock · Container · DollarSign · Download · Eye · FileCheck · FileText · FileWarning · Globe · GraduationCap · Hash · LayoutGrid · List · MapPin · MessageSquare · MoreVertical · Paperclip · Pencil · Plus · RefreshCw · RotateCcw · Save · Scale · Search · Send · Share2 · ShieldCheck · StickyNote · Ticket · Trash2 · Truck · User · UserX · X

Key mappings: **Ticket** = the section (sidebar, header, detail tile) · **Truck / Container** = vehicle 1 / vehicle 2 · **Scale** = In Court and "Notice of trial" · **FileText / FileCheck** = ticket file / receipt · **BellRing** = missing references · **RefreshCw** = Sync feeds · **GraduationCap / FileWarning / AlertTriangle / Send / UserX / Ban** = the six resolutions.

---

## 5. Interactions and micro-animations

| Interaction | Behaviour |
|---|---|
| Header fold | ~700 ms ease; 140 px threshold, 40 px travel, 840 ms lock after each flip |
| Category tab | resets sub-filter and pager, closes any open ticket |
| Sub-category card | toggles the filter; dark selected state |
| Filters | every change resets the pager; Reset filters appears when something is set |
| Status pill | saves immediately on change |
| Row | hover tint; click opens the detail; Enter / Space on the missing table rows opens the pre-filled form |
| Missing table | header checkbox selects the page (indeterminate on partial); bulk bar slides in |
| Monitored date | click → edit state with ring; Cancel / Save |
| Review | verify → tick; resolution → dialog → success screen → closed state; reopen restores |
| Form | picking a driver fills licence and Vehicle 1; picking a vehicle shows the fleet info box; the first violation becomes Primary; Total recomputes live |
| Jump to section | scroll-spy highlights the visible card |

---

## 6. Accessibility

### 6.1 Contrast (WCAG 2.1)
| Pair | Ratio | Result |
|---|---|---|
| slate-900 text on white | 17.8 : 1 | pass |
| slate-500 labels on white | 4.8 : 1 | pass |
| **slate-400** sub-lines on white (KPI sub-lines, "—") | 2.6 : 1 | **fail** |
| white on blue-600 | 5.2 : 1 | pass |
| amber-700 on amber-50 (Due) | 4.9 : 1 | pass |
| emerald-700 on emerald-50 (Paid) | 5.1 : 1 | pass |
| blue-700 on blue-50 (In Court, PAPER) | 6.3 : 1 | pass |
| rose-600 KPI value (Outstanding) on white | 4.5 : 1 | pass (just) |

All values: [design/color-palette.md](../design/color-palette.md).

### 6.2 Focus and keyboard
- Inputs show a blue focus ring; custom buttons rely on the browser outline (TO CONFIRM a shared `focus-visible` style).
- Table rows open on **click only** — they are not focusable (no `tabIndex`), so keyboard users reach a ticket through the ⋮ menu (TO CONFIRM). Missing-table rows are focusable (Enter / Space).
- Monitored-date cards are `role="button"` with Enter / Space.
- Status pills are native selects — fully keyboard accessible.
- Browser Back closes the detail page.

### 6.3 ARIA
"Ticket categories" (tabs) · "Ticket status" (pills, title "Change status") · "Actions for {citation}" · "More actions" · "From date" / "To date" · "Filter by regulator source" (title) · "Rows per page" · "Select all on page" · "Documents on file" · "Dismiss" · "Remove". The status and type filter selects have **no label** (TO CONFIRM). Dialogs other than the resolution dialog do not set `role="dialog"` (TO CONFIRM).

### 6.4 Other
- Status is shown by colour **and** text.
- 9–11 px text is common (pills, labels, table headers).
- The Export button looks active but does nothing.
- Touch targets: ⋮ (28 px) and the doc icons are below 44 px on phones.

---

## 7. Screenshot map

| Topic | Desktop | Mobile |
|---|---|---|
| List frame | [list-default](../screenshots/desktop/list/list-default-desktop.png) | [list-default](../screenshots/mobile/list/list-default-mobile.png) |
| Condensed header | [list-condensed-header](../screenshots/desktop/list/list-condensed-header-desktop.png) | [list-condensed-header](../screenshots/mobile/list/list-condensed-header-mobile.png) |
| Category tab + sub-filter | [list-subcategory-selected](../screenshots/desktop/list/list-subcategory-selected-desktop.png) | [list-subcategory-selected](../screenshots/mobile/list/list-subcategory-selected-mobile.png) |
| Missing references | [list-missing-selected](../screenshots/desktop/list/list-missing-selected-desktop.png) | [list-missing-selected](../screenshots/mobile/list/list-missing-selected-mobile.png) |
| Row menu | [list-row-menu](../screenshots/desktop/list/list-row-menu-desktop.png) | [list-row-menu](../screenshots/mobile/list/list-row-menu-mobile.png) |
| Detail header + tiles | [detail-overview](../screenshots/desktop/detail/detail-overview-desktop.png) | [detail-overview](../screenshots/mobile/detail/detail-overview-mobile.png) |
| Monitored date edit | [detail-monitored-date-edit](../screenshots/desktop/detail/detail-monitored-date-edit-desktop.png) | [detail-monitored-date-edit](../screenshots/mobile/detail/detail-monitored-date-edit-mobile.png) |
| Review | [detail-review](../screenshots/desktop/detail/detail-review-desktop.png) | [detail-review](../screenshots/mobile/detail/detail-review-mobile.png) |
| Resolution dialog | [detail-resolution-dialog](../screenshots/desktop/detail/detail-resolution-dialog-desktop.png) | [detail-resolution-dialog](../screenshots/mobile/detail/detail-resolution-dialog-mobile.png) |
| Activity | [detail-activity](../screenshots/desktop/detail/detail-activity-desktop.png) | [detail-activity](../screenshots/mobile/detail/detail-activity-mobile.png) |
| Form + rail | [form-add-violations](../screenshots/desktop/form/form-add-violations-desktop.png) | [form-add-violations](../screenshots/mobile/form/form-add-violations-mobile.png) |
| Code search | [form-add-code-search](../screenshots/desktop/form/form-add-code-search-desktop.png) | [form-add-code-search](../screenshots/mobile/form/form-add-code-search-mobile.png) |
| Dates & monitoring | [form-add-dates-monitoring](../screenshots/desktop/form/form-add-dates-monitoring-desktop.png) | [form-add-dates-monitoring](../screenshots/mobile/form/form-add-dates-monitoring-mobile.png) |
| View-only strip | [list-view-only](../screenshots/desktop/list/list-view-only-desktop.png) | [list-view-only](../screenshots/mobile/list/list-view-only-mobile.png) |

All images: [screenshots/index.md](../screenshots/index.md).
