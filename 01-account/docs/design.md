# 01 – Account · Design specification

How the Account section is built visually: layout, type, components, icons, motion and accessibility, as it stands in the app on 2026-10-23. Everything here is read from the running UI and the stylesheet / component source (`src/index.css`, `src/components/ui/*`, `src/pages/profile/*`, `src/pages/assets/*`, `src/pages/account/*`). Screenshot links point into [`../screenshots/`](../screenshots/index.md).

Stack for the visuals: **Tailwind CSS v4** utilities (no custom `@theme`; the default v4 palette), **Inter** from Google Fonts, **lucide-react** icons, the `cn()` helper (`clsx` + `tailwind-merge`).

---

## 1. Layout

### 1.1 Page frame

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Sidebar      │ Top bar (64 px): page title · carrier switcher ·     │
│ 260 px       │ search · help · chat · bell · user menu              │
│ (drawer      ├──────────────────────────────────────────────────────┤
│  below md)   │ Page header (white, condenses on scroll)             │
│              │   icon · title · subtitle · actions                  │
│              │   section tabs  (Fleet Overview · Yard · Assets · …) │
│              ├──────────────────────────────────────────────────────┤
│              │ Body — the ONLY scroller (overflow-y-auto)           │
│              │   padding 16 px (sm: 24 px); content max-width none  │
└──────────────┴──────────────────────────────────────────────────────┘
```

- The body scrolls inside its own container; the sidebar, top bar and page header stay put. Scrolling down past 140 px folds the header (see §5); scrolling up unfolds it. Screenshots: [fleet-overview-default](../screenshots/desktop/fleet-overview/fleet-overview-default-desktop.png) vs [fleet-overview-condensed-header](../screenshots/desktop/fleet-overview/fleet-overview-condensed-header-desktop.png).
- Full-page sub-screens (Add/Edit Asset wizard, Add/Edit Driver form, asset detail, driver profile) replace the header and body with their own shell: a back strip, their own header band and their own scroller. Screenshots: [assets-wizard-add-asset-top](../screenshots/desktop/assets/assets-wizard-add-asset-top-desktop.png), [assets-detail-overview](../screenshots/desktop/assets/assets-detail-overview-desktop.png), [drivers-profile-overview](../screenshots/desktop/drivers/drivers-profile-overview-desktop.png).

### 1.2 Grids used inside Account

| Where | Grid | Notes |
|---|---|---|
| Fleet Overview cards | 1 column, `lg:` 2 columns (`grid-cols-1 lg:grid-cols-2 gap-6`); Office Locations and Directors span both (`lg:col-span-2`) | [fleet-overview-default-mobile](../screenshots/mobile/fleet-overview/fleet-overview-default-mobile.png) shows the single column |
| Modal field grids | 2 columns (`grid-cols-2 gap-4`), full-width textareas | [modal-edit-director](../screenshots/desktop/fleet-overview/fleet-overview-modal-edit-director-desktop.png) |
| KPI tile rows (Assets, Drivers) | **Container query**, not viewport: `grid-cols-2`, `@xl:grid-cols-3`, `@3xl:grid-cols-5/6`; each tile is itself a `@container` and grows its number from `text-lg` to `text-2xl` at 240 px | [assets-default](../screenshots/desktop/assets/assets-default-desktop.png) |
| Asset detail metadata | `grid-cols-2 … lg:grid-cols-5` with 16 px gaps | [assets-detail-overview](../screenshots/desktop/assets/assets-detail-overview-desktop.png) |
| Wizard (Add Asset) | left rail 288 px (`w-72`, hidden below `md`) + scrolling column; section cards `max-w-4xl` centred | [assets-wizard-registration-plate](../screenshots/desktop/assets/assets-wizard-registration-plate-desktop.png) |
| Add Driver form | same shell as the wizard; sections are `h2`-headed cards, 2-column field grids | [drivers-form-license-details](../screenshots/desktop/drivers/drivers-form-license-details-desktop.png) |
| Driver profile Profile tab | content `flex-1` + sticky "Jump to section" rail 260 px on the right (`lg:` only) | [drivers-profile-tab-profile](../screenshots/desktop/drivers/drivers-profile-tab-profile-desktop.png) |

### 1.3 Spacing scale

Tailwind's default 4 px scale. The values that actually occur in Account:

| Token | px | Typical use |
|---|---|---|
| `0.5` | 2 | chip padding-y, hairline gaps |
| `1` / `1.5` | 4 / 6 | icon–label gaps, tight stacks |
| `2` / `2.5` | 8 / 10 | row-action gaps, KPI tile gap (`gap-2.5`) |
| `3` / `3.5` | 12 / 14 | table cell padding-y, button padding-x |
| `4` | 16 | table cell padding-x, body padding on phones, field grid gap |
| `5` / `6` | 20 / 24 | card padding (`p-6`), body padding ≥ sm, card grid gap |
| `8` | 32 | header padding-x on wide screens (`sm:px-8`) |

Component heights are fixed, not derived: inputs/buttons **36 px** (`h-9`, the standard), **40 px** for primary CTAs and shadcn inputs (`h-10`), **32 px** when the header is condensed (`h-8`), **24 px** status pills (`h-6`), **28 px** row kebab buttons.

### 1.4 Breakpoints

Tailwind defaults: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 px. What changes:

| Width | Account behaviour |
|---|---|
| < 640 (`sm`) | Sidebar becomes a drawer behind the ☰ button; button labels drop to icons or short words ("Add", "Edit"); the breadcrumb strip hides its trail; header title `text-lg`. The Columns picker is not rendered. |
| < 768 (`md`) | Wizard rail hidden (sections are reached by scrolling); Assets table replaced by cards. |
| < 1024 (`lg`) | Fleet Overview single column; Drivers table replaced by cards (no row ⋮ menu — the card opens the driver); driver Profile jump-rail hidden. |
| ≥ 1024 | Full tables, pinned Actions column (`sticky right-0`), two-column cards. |

Mobile captures: [`../screenshots/mobile/`](../screenshots/index.md#mobile-390-px).

---

## 2. Typography

**Family:** Inter (Google Fonts, weights 400 / 500 / 600 loaded), fallback `sans-serif`. Numbers use `tabular-nums` wherever they sit in columns (dates, counts, fines). `font-mono` (system monospace) is used for identifiers only: VIN, plate, licence number, record IDs.

> **TO CONFIRM:** the UI sets `font-bold` (700) on most labels and headings, but only weights 400–600 are loaded, so browsers synthesise the bold. Either load Inter 700 or map `font-bold` to 600.

**Base:** body 14 px / 400 / `line-height: normal`; stylesheet hierarchy `h1` 20 px 600 (−0.02 em), `h2` 16 px 500, `h3/h4` 14 px 500, `label` 13 px 400 — the components then override with utilities, so the effective scale is the one below.

| Role | Size / weight / tracking | Where |
|---|---|---|
| Page title | 24 px bold, `tracking-tight` (`text-2xl`; 20 px `lg` and below, 16 px when condensed) | "Carrier Fleet Profile", asset and driver names |
| Card / modal title | 18 px bold (`text-lg`) · modal `h3` 20 px bold (`text-xl`) | "Legal / Main Address", "Edit Director" |
| Section title in wizards | 16 px bold (`text-base`) + 12 px slate-500 subtitle | "Registration & Plate" |
| Body / table cell | 13–14 px (`text-[13px]`, `text-sm`), 400–500 | rows, descriptions |
| Primary cell value | 14 px semibold slate-900 | unit numbers, names |
| Secondary line | 11–12 px slate-500 | "DE · exp 2030-03-07", dates under names |
| Field label | 11 px bold uppercase `tracking-wider` slate-500 (`text-[11px]`) | all form and fact labels |
| Micro label | 10 px bold uppercase `tracking-wide/wider` slate-400 | KPI tile labels, pill text, counts |
| Chip / pill | 10–11 px bold uppercase | status pills, "Required" badge |
| Button | 14 px semibold (`text-sm font-semibold`); 13 px in toolbars | |
| Line heights | `leading-tight` for stacked label/value pairs, `leading-snug` for 13 px copy, `leading-relaxed` for help text | |

> **Note for the rebuild:** 10 px text is used on 300+ elements (tile labels, pills). It passes contrast but sits below the 12 px floor most accessibility guidance recommends; see §6.

---

## 3. Components

All components below are the shared ones under `src/components/ui/` unless noted. Variants are listed with the Tailwind classes that define them so they can be reproduced exactly.

### 3.1 Buttons

| Variant | Classes (key parts) | Example |
|---|---|---|
| **Primary** | `h-9 px-3.5 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700` (some CTAs `h-10`) | Add Driver, Add Asset, Edit Vehicle, Save Changes |
| **Secondary / outline** | `h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-[13px] font-semibold hover:bg-slate-50` | Export, Import, Cancel, Print |
| **Share to chat** (`ShareButton`) | outline variant with `text-slate-700 shadow-sm hover:border-slate-300 active:scale-[0.98]`, icon + label (label hidden below `sm`) | asset detail, driver profile |
| **Ghost / text** | `text-xs text-slate-500 hover:text-blue-600` | "← Back to assets" |
| **Danger** | `bg-rose-600 hover:bg-rose-700 text-white` (confirm dialogs) and `text-rose-500` menu items | Delete / Remove |
| **Icon button** | `p-2 rounded-full text-slate-400 hover:text-blue-600 hover:bg-slate-50` (Fleet Overview pencils); `p-1.5 rounded-md` kebab | Edit Section, ⋮ |
| **shadcn `Button`** (`button.tsx`) | `rounded-md text-sm font-medium`, sizes default `h-10 px-4`, `sm` `h-9 px-3`, `lg` `h-11 px-8`, `icon` `h-10 w-10`; variants default/outline/ghost/destructive/secondary/link; `focus-visible:ring-2 ring-ring ring-offset-2`; `disabled:opacity-50` | Add Driver form header (Cancel / Fill sample data / Save Driver), asset wizard |
| **Disabled primary** | `bg-blue-300 cursor-not-allowed` (wizard save until valid) or `bg-slate-300` (Add Vendor) | |

States: hover darkens by one Tailwind step; active scales to 0.98 on the newer buttons; focus uses the browser ring unless the shadcn button is used (then a 2 px blue ring with 2 px offset).

### 3.2 Inputs and selects

| Control | Classes | Notes |
|---|---|---|
| Text / number / date input (page forms) | `h-9 w-full px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400` | Roadside/asset style; placeholders `text-slate-300/400` |
| shadcn `Input` | `h-10 rounded-md border-slate-200 focus-visible:ring-2 ring-slate-950 ring-offset-2` | Add Asset wizard fields |
| Modal inputs (Fleet Overview, Locations) | `px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500` | |
| Select | same box as inputs, native `<select>`; filter selects `h-9 rounded-lg border-slate-200 text-[13px] font-medium` | |
| Search box | `h-9 pl-9 rounded-lg border-slate-200 bg-slate-50 focus:bg-white` with a 14 px search icon at left; some have a clear × (`aria-label="Clear search"`) | |
| Date picker | native `<input type="date">` (`mm/dd/yyyy`) everywhere | |
| Textarea | `rounded-lg border-slate-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20`, 3–5 rows | Notes, Primary Responsibility |
| Yes / No | two-button segmented control `rounded-lg border bg-slate-50 p-0.5`; selected = `bg-blue-600 text-white` (or `bg-rose-600` for danger questions) | Add Driver, wizard |
| Toggle | 20 × 36 px pill `bg-slate-200 → bg-blue-600` with a white knob translating 16 px (`transition-transform`) | monitoring on/off, security features |
| Checkbox | native, `rounded text-blue-600 focus:ring-blue-500 border-slate-300` | reminders, channels, columns |
| Radio | native | Monitor based on |
| Status pill select (`AssetStatusSelect`, `DriverStatusSelect`) | native `<select>` styled as a pill: `h-6 rounded-full border pl-2.5 pr-6 text-[10px] font-bold uppercase appearance-none` + chevron; tone per status (emerald Active, amber Maintenance/On Leave, rose Out of Service, sky Draft, slate Deactivated/Inactive, red Terminated) | tables and headers |
| Upload zone (`UploadZone`) | `card` variant: dashed `border-slate-300 rounded-xl` panel, blue circle icon, "Click to upload or drag & drop" + hint; `inline` variant: slim strip | bill of sale, pink slip, licence images |
| Search-select (licence class) | input with a `datalist`-style dropdown of matches | Add Driver › License class |

Validation: inline red (`text-red-500`) messages under the field, required asterisk `text-red-500` or a "Required" pill (`bg-blue-50 text-blue-600 text-[9px] uppercase`) next to the label. [assets-wizard-validation-errors](../screenshots/desktop/assets/assets-wizard-validation-errors-desktop.png).

### 3.3 Cards

| Card | Classes | Example |
|---|---|---|
| Section card (Fleet Overview `Card`) | `bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden`; header `p-6 pb-2` with a 40 px `bg-blue-50 text-blue-600 rounded-lg` icon tile, `text-lg font-bold` title and an optional Edit Section pencil; body `p-6 pt-4` | [fleet-overview-default](../screenshots/desktop/fleet-overview/fleet-overview-default-desktop.png) |
| Wizard section (`WizardSection`) | `rounded-xl border border-slate-200 bg-white shadow-sm`; header `bg-slate-50/60 px-6 py-4` with icon tile, `text-base font-bold` + `text-xs` subtitle; body `p-6`; `allowOverflow` variant drops `overflow-hidden` for dropdowns | wizard, Add Driver |
| KPI tile (`KpiStatCard`) | `rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm`, label 10/11 px uppercase slate-400, value `text-lg → text-2xl` bold, accent icon square (`bg-<accent>-50 text-<accent>-600`) shown from 240 px; selected tile gets a `ring-1` in the accent colour (`aria-pressed`) | Assets / Drivers tiles |
| Legacy KPI card (`KPICard` on Assets, old style) | left colour bar `w-1` + label/value/subtitle | superseded in most places by `KpiStatCard` |
| Stat tile on detail pages | `rounded-xl border bg-white px-4 py-3` with a 36 px icon square at left | Odometer / Risk / Health / Plate expiry; Status / Tenure / CDL / Terminal |
| Fact block | one bordered block with internal rules (`divide-y`, per-cell `border-r`), cells `px-4 py-3` with 10 px label + 14 px value | asset metadata, driver Profile tab |
| Info banner | `rounded-xl border px-4 py-3` tinted: blue (view-only, info), amber (warning / missing), rose (out of service), emerald (clean) | view-only strip, OOS notice |

### 3.4 Tabs

| Kind | Look | Where |
|---|---|---|
| Section tabs (`ListPageHeader` → `SubTabs`) | underline tabs: `px-4 py-3 text-sm font-medium border-b-2`, active `border-blue-600 text-blue-600`, inactive `text-slate-500 hover:text-slate-800 border-transparent`; 15 px icon; count badge `rounded-full px-1.5 text-[10px] font-bold` (blue when active); whole strip rides a `TabScroller` with fade + chevron paging arrows when it overflows | Fleet Overview · Yard Terminals · Assets · Drivers |
| Sub-tabs with counts | same component, smaller | All Assets / Trucks / Trailers |
| Detail-page tabs (`ProfileTabs`) | same underline style, grouped with hairline separators between groups (`identity · compliance · operations · safety`) | asset detail (11), driver profile (13) |
| Segmented | `rounded-lg bg-slate-100 p-0.5` with a white active segment | Records | roster switches |
| Wizard rail (`WizardStepNav`) | vertical list: numbered circle (`h-6 w-6 rounded-full`), icon, label, count badge; active row `bg-blue-50 text-blue-700`; completed circle turns into a ✓ | Add Asset, Add Driver |

Keyboard: every tab is a real `<button>`; the active one carries `aria-current`. Arrow-key navigation between tabs is **not** implemented (TO CONFIRM whether wanted).

### 3.5 Tables and lists

- Table: `table-fixed` with `min-w-[…]` so columns never collapse; header `bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500`, sortable headers (`SortTh`) show ↕ / ↑ / ↓ chevrons; cells `px-4 py-3`, one line each with `truncate` + `title` tooltips; rows `hover:bg-slate-50`, `cursor-pointer` where the row opens a record; the **Actions** column is `sticky right-0` with a left hairline and its own background so it never scrolls away. [drivers-default](../screenshots/desktop/drivers/drivers-default-desktop.png)
- Column picker (`ColumnPicker`): outline button "Columns" opening a `rounded-lg shadow-lg` popover of checkboxes. [assets-columns-picker-open](../screenshots/desktop/assets/assets-columns-picker-open-desktop.png)
- Group band (`TableGroupBand`): a full-width `bg-slate-50` row with the group label and count. [yard-terminals-default](../screenshots/desktop/yard-terminals/yard-terminals-default-desktop.png)
- Pager (`TablePager` / `PaginationBar`): "1–15 of 41 · Rows [select]" at left, ‹ 1 2 3 › buttons at right (`h-8 rounded-lg border`), disabled arrows `opacity-40`.
- Mobile cards: `divide-y` list; each card is a full-width `<button>` with avatar/initials, name, chips, 2-column facts. [drivers-default-mobile](../screenshots/mobile/drivers/drivers-default-mobile.png)
- Empty states: centred icon in a `bg-slate-100` circle, bold title, one-line hint, optional clear-filters button. [assets-empty-kpi-filter](../screenshots/desktop/assets/assets-empty-kpi-filter-desktop.png), [yard-terminals-empty-no-match](../screenshots/desktop/yard-terminals/yard-terminals-empty-no-match-desktop.png)

### 3.6 Menus

- Row ⋮ menu (`KebabMenu` via `RowActions`): trigger `MoreVertical` 16 px in a `p-1.5 rounded-md` button (`title="Actions for <name>"`); menu rendered in a portal, `fixed`, 200 px wide, `rounded-xl border shadow-xl py-1`; items `px-3 py-2 text-[13px] font-medium hover:bg-slate-50` with a 16 px slate-400 icon; the Delete item is last and `text-rose-600` with a rose icon; a full-screen transparent backdrop closes it on click. Order is always Open · Edit · Share to chat · (extras) · Delete. [assets-row-menu-open](../screenshots/desktop/assets/assets-row-menu-open-desktop.png)
- Header ⋮ (`HeaderMenu`) on detail pages uses the same menu.

### 3.7 Modals and dialogs

| Dialog | Shell | Footer |
|---|---|---|
| Generic edit modal (Fleet Overview cards) | `fixed inset-0 bg-black/50 z-50` backdrop, centred panel `max-w-2xl rounded-2xl bg-white shadow-xl`, header with title + × button, scrolling body `px-6 py-5`, 2-column field grid | Cancel (outline) · Save Changes (primary) — sticky; only the middle scrolls |
| Director Details (view) | same shell, read-only sections "Contact information" / "Role & compliance" with icons | Edit (primary) |
| Add New Location / Add Office Location | same shell, `max-w-xl`; the yard editor has a 5-row toggle list for security features | Cancel · Save |
| Location view | same shell with a score ring and feature list | Close |
| Import Drivers | same shell; drop zone + columns table + preview | Cancel · Import |
| Share to chat (`ShareToChat`) | same shell, `max-w-xl`; compose/preview views; "Send via" picker (3 cards), recipient, subject, message, attachments | Cancel · Send |
| Delete confirmation | **native `window.confirm()`** — unstyled | OK / Cancel |

Screenshots: [modal-edit-corporate-identity](../screenshots/desktop/fleet-overview/fleet-overview-modal-edit-corporate-identity-desktop.png), [modal-add-new-location](../screenshots/desktop/yard-terminals/yard-terminals-modal-add-new-location-desktop.png), [modal-import-drivers](../screenshots/desktop/drivers/drivers-modal-import-drivers-desktop.png), [modal-share-to-chat](../screenshots/desktop/assets/assets-modal-share-to-chat-desktop.png). On phones every modal is full-width with 16 px gutters and its footer stays in view: [modal-add-new-location-mobile](../screenshots/mobile/yard-terminals/yard-terminals-modal-add-new-location-mobile.png).

### 3.8 Toasts

`role="status"` box, `fixed bottom-6 right-6 z-[60]`, `rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-3 shadow-xl`, check icon at left; auto-dismisses after **3 s**; one at a time. Texts are listed in [page-overview.md §7](page-overview.md#7-shared-behaviours).

### 3.9 Chips, pills and badges

- Status pill (read-only): `rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider` with a 6 px dot; tones as in §3.2.
- Count badge: `rounded-full bg-slate-100 text-slate-600 px-1.5 text-[10px] font-bold tabular-nums` (blue variant when active).
- Compliance chip: `bg-red-50 text-red-700` "9 missing"; progress bar `h-1.5 rounded-full bg-slate-100` with a `bg-blue-600` fill (DQ File column).
- Type chips (cargo, authority): `rounded-lg bg-slate-900 text-white px-4 py-2` (cargo) or tinted outline chips `border-emerald-200 bg-emerald-50` (authority types).
- Filter chip (`DriverFilterChip`): `rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold` with an × to clear.
- Avatar: initials in a `h-9 w-9 rounded-full border bg-slate-100 text-xs font-bold`; 72 px on detail headers with a status dot `h-4 w-4 border-2 border-white` at the corner.

---

## 4. Icons

**Library:** lucide-react 0.562 (stroke icons, 1.5–2 px stroke). Sizes: 20 px in header icon tiles, 16 px in buttons and menus, 15 px in tabs, 14 px in toolbars, 12–13 px inside labels, 10–11 px inside chips. Colour follows the text (`text-slate-400` idle, `text-blue-600` active/brand, `text-rose-500` danger).

Icons used in the Account section and its shared chrome (122):

`Activity, AlertCircle, AlertOctagon, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, BadgeCheck, Bell, BellRing, Boxes, Briefcase, Building2, Calendar, CalendarClock, CalendarDays, CalendarPlus, CalendarX, Camera, Car, Check, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, CircleAlert, CircleDashed, ClipboardCheck, ClipboardList, Clock, Columns, Copy, DollarSign, DoorClosed, Download, Edit, Edit2, Edit3, ExternalLink, Eye, FileCheck, FileDown, FileKey, FileSignature, FileSpreadsheet, FileText, FileUp, FileWarning, Filter, FolderOpen, Gauge, Globe, GraduationCap, Grid, Hash, HelpCircle, History, IdCard, Image, Info, KeyRound, Layers, LayoutDashboard, LayoutGrid, Link2, ListChecks, Lock, LogOut, Mail, Map, MapPin, Menu, MessageSquare, MoreVertical, Package, PanelLeftClose, PanelLeftOpen, Paperclip, Pencil, Phone, Plus, Printer, RefreshCw, RotateCcw, Save, Scale, Search, Send, Settings, Share2, Shield, ShieldCheck, Sliders, SlidersHorizontal, Smartphone, Sparkles, StickyNote, Tag, Ticket, Trash, Trash2, Truck, Upload, UploadCloud, User, UserCheck, UserCircle, UserMinus, UserPlus, UserX, Users, Video, Warehouse, Wrench, X, XCircle, Zap`

Meaning conventions worth keeping: `Building2` = Account/carrier, `MapPin` = yard/location, `Truck` = asset (`Container` for trailers elsewhere), `Users`/`User` = drivers, `Pencil`/`Edit3` = edit, `Trash2` = delete, `Share2` = share to chat, `MoreVertical` = row menu, `ShieldCheck` = compliance/monitoring, `BellRing` = alerts, `Eye` = open/view-only, `Check` = done/active.

---

## 5. Interactions and micro-animations

| Interaction | Behaviour | Implementation |
|---|---|---|
| **Condensing header** | After 140 px of scroll and 40 px of travel in one direction, the page header folds: padding 20→8 px, icon 40→32 px, title 24→16 px, subtitle/KPI chips collapse (`max-h-0 opacity-0`); unfolds on scroll-up, with a guard so layout shifts cannot flip it back | `useCondensingHeader`; transition on `[height,max-height,width,max-width,padding,margin,gap,opacity,font-size,border-width]`, **700 ms**, `cubic-bezier(0.65,0,0.35,1)` |
| Tab underline | colour change only, `transition-colors` (150 ms default) | `SubTabs` |
| Tab strip overflow | left/right chevrons fade in only when there is more to reveal; clicking pages the strip by 75 % of its width, smooth-scroll; the active tab is scrolled into view when it changes | `TabScroller` |
| Hover on rows / buttons | background one step darker (`hover:bg-slate-50`), `transition-colors` | everywhere |
| Press | `active:scale-[0.98]` on Share / header buttons | |
| Toggle | knob slides 16 px, `transition-transform` | |
| Modal / panel entry | `animate-in fade-in` (+ `slide-in-from-bottom-2` on tab bodies), 200–300 ms | tab content, dialogs |
| KPI tile select | ring appears, `transition-all` | `KpiStatCard` |
| Inline status | native select; the pill recolours instantly and a toast confirms | |
| Wizard rail | clicking a section smooth-scrolls the column; scroll-spy highlights the section in view (`IntersectionObserver`, rootMargin `-12px 0px -55% 0px`) | `WizardStepNav` |
| Lookup dropdowns (licence class, cargo search) | open on focus/typing, close on blur after 120 ms so a click can land, rendered above everything (`z-30` / portal) | |
| Toast | appears bottom-right, disappears after 3 s (no animation) | |
| Scrollbars | thin, translucent slate thumbs app-wide (`scrollbar-width: thin`, WebKit 6 px); tab strips hide theirs (`no-scrollbar`) | `index.css` |

No motion is reduced for `prefers-reduced-motion` (TO CONFIRM: add a media query that shortens the header transition).

---

## 6. Accessibility

### 6.1 Contrast (WCAG 2.1, normal text ≥ 4.5 : 1, large text / UI ≥ 3 : 1)

| Pair | Ratio | Result | Used for |
|---|---|---|---|
| slate-900 on white | 17.8 | AA/AAA | headings, primary values |
| slate-700 on white | 10.4 | AA/AAA | body |
| slate-600 on white | 7.6 | AA/AAA | secondary text, outline buttons |
| slate-500 on white | 4.8 | AA | subtitles, field labels |
| slate-500 on slate-50 | 4.6 | AA | labels in tinted headers |
| **slate-400 on white** | **2.6** | **fails** for text; passes only as a large/decorative element | KPI tile labels (10 px uppercase), micro labels, idle icons |
| white on blue-600 | 5.3 | AA | primary buttons |
| blue-600 on white | 5.3 | AA | links, active tab |
| blue-700 on blue-50 / blue-100 | 6.3 / 5.6 | AA | filter chips, info banner |
| emerald-700 on emerald-50 | 5.1 | AA | Active pills |
| amber-700 on amber-50 | 4.9 | AA | Maintenance / On Leave pills |
| rose-700 on rose-50 | 5.5 | AA | Out of service pills |
| red-700 on red-50 | 5.9 | AA | "n missing" chips |
| white on slate-900 | 17.8 | AA/AAA | toast |

Action for the rebuild: move 10–11 px labels from `slate-400` to `slate-500` (4.8 : 1) — a one-token change that fixes every failing pair.

### 6.2 Focus

- shadcn `Button`/`Input`: visible 2 px ring with 2 px offset (`focus-visible:ring-2 … ring-offset-2`).
- Page-form inputs: `focus:ring-2 focus:ring-blue-500/30` + blue border.
- Many plain `<button>`s (tabs, pencils, KPI tiles, row kebabs) rely on the **browser default outline**, which Chromium draws only on keyboard focus — acceptable but inconsistent. TO CONFIRM: adopt one `focus-visible` ring utility for all custom buttons.

### 6.3 Keyboard

- Every control is a native `<button>`, `<input>`, `<select>` or `<a>`, so Tab order follows the DOM: sidebar → top bar → header actions → tabs → body.
- Yard-location rows are focusable (`tabIndex=0`, `role="link"`) and open on **Enter**. Asset and driver rows are not focusable; their ⋮ menu is (Open driver / Open asset are the keyboard path).
- Menus and modals: close on backdrop click; **Escape** closes the generic modals and dropdowns; the row ⋮ menu and the Columns picker close on backdrop click only (TO CONFIRM: add Escape).
- Native selects (status pills, filters) are fully keyboard-operable.
- Focus is **not** trapped inside modals and does not return to the trigger on close (TO CONFIRM for the rebuild).

### 6.4 ARIA and semantics

- Landmarks: `<header>` (top bar), `<aside>` sidebar, `<main>` for page content, `<nav aria-label="…">` for every tab strip (e.g. "Carrier fleet profile sections", "Inspection sections").
- Tabs: `aria-current` on the active tab; TabScroller arrows have `aria-label="Scroll tabs left/right"` and are `aria-hidden` + unfocusable while hidden.
- KPI tiles are buttons with `aria-pressed` when they act as filters.
- Row ⋮ buttons carry `title="Actions for <name>"`; icon-only buttons in Fleet Overview carry `title` ("Edit Section", "Edit Location", "Remove Location"); search clear buttons `aria-label="Clear search"`; status pills `aria-label="Asset status"` / `"Driver status"`.
- Toast uses `role="status"`; the view-only strip uses `role="note"`.
- Column headers that are icons only (Fenced/Gated/CCTV…) use `title`; the sticky Actions header uses `sr-only` text on some tables.
- Gaps to close in the rebuild: modals have no `role="dialog"` / `aria-modal` / `aria-labelledby`; several Fleet Overview pencils have no accessible name at all (the two at the top of the identity card); table sort buttons do not expose `aria-sort`.

### 6.5 Other

- Text truncation always pairs with a `title` tooltip, so nothing is lost on narrow columns.
- Colour is never the only signal: status pills carry a word, compliance chips a count, the view-only strip a sentence.
- Minimum touch target on phones: 36–40 px for buttons and pills; the 28 px kebab and 24 px status pill are below the 44 px recommendation (TO CONFIRM).

---

## 7. Screenshot map

Every state referenced above is in [`../screenshots/index.md`](../screenshots/index.md): 67 desktop and 65 mobile images named `[tab]-[state]-[device].png`, grouped by tab folder (`fleet-overview/`, `yard-terminals/`, `assets/`, `drivers/`).
