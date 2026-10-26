# 02 – Inventory · Design specification

How the Inventory section is built visually — layout, type, components, icons, motion and accessibility — as it stands in the app on 2026-10-23. Read from the running UI and the component source (`src/pages/inventory/*`, `src/components/ui/*`, `src/pages/messages/InventoryCollectionCard.tsx`). Screenshot links point into [`../screenshots/`](../screenshots/index.md).

Stack for the visuals: **Tailwind CSS v4** utilities (default v4 palette, no custom `@theme`), **Inter** from Google Fonts, **lucide-react** icons, the `cn()` helper (`clsx` + `tailwind-merge`). The app shell (sidebar, top bar, carrier switcher) is the same as in [01 – Account](../../01-account/docs/design.md) and is not repeated in full here.

---

## 1. Layout

### 1.1 Page frame

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Sidebar      │ Top bar (64 px): page title · carrier switcher ·     │
│ 260 px       │ search · help · chat · bell · user menu              │
│ (drawer      ├──────────────────────────────────────────────────────┤
│  below md)   │ List header (white band, condenses on scroll)        │
│              │   icon · title · count pill · one-line description   │
│              │   · actions          [KPI chip strip when condensed] │
│              │   section tabs  List · Drivers · Assets · Vendors    │
│              ├──────────────────────────────────────────────────────┤
│              │ Body — the ONLY scroller (overflow-y-auto)           │
│              │   padding 16 / 24 / 32 px (PAGE_PAD px-4 sm:6 lg:8)  │
│              │   KPI tiles → list card (rail · toolbar · table ·    │
│              │   pager)                                             │
└──────────────┴──────────────────────────────────────────────────────┘
```

- Every **tab** uses the app's standard list header (`ListPageHeader`): Inventory, Inventory by Driver, Inventory by Asset, Vendors. Scrolling the body past ~140 px folds it (title steps down, description hides, the KPI figures appear as a chip strip); scrolling up 40 px unfolds it. The tab row never scrolls away. [list-default](../screenshots/desktop/list/list-default-desktop.png) vs [list-condensed-header](../screenshots/desktop/list/list-condensed-header-desktop.png).
- **Record pages** (item, holder, vendor profile) use a fixed header band — back link, icon tile, title + status, sub-line, actions, tabs — over their own scroller. [list-item-detail-information](../screenshots/desktop/list/list-item-detail-information-desktop.png), [drivers-holder-overview](../screenshots/desktop/drivers/drivers-holder-overview-desktop.png), [vendors-profile-overview](../screenshots/desktop/vendors/vendors-profile-overview-desktop.png).
- **Full-page forms** use the Wizard chrome (`WizardHeader` + `WizardStepNav` rail or `WizardStepBar` + `WizardSection` cards): Add / Edit item and Manage inventory. Add Vendor is a plain full page with numbered section cards. [list-add-item-default](../screenshots/desktop/list/list-add-item-default-desktop.png), [drivers-manage-default](../screenshots/desktop/drivers/drivers-manage-default-desktop.png), [vendors-add-default](../screenshots/desktop/vendors/vendors-add-default-desktop.png).
- The **driver's sign-form** is a narrow page (`max-w-3xl`) with one violet form card. [drivers-sign-form](../screenshots/desktop/drivers/drivers-sign-form-desktop.png).

### 1.2 Grids used inside Inventory

| Where | Grid | Screenshot |
|---|---|---|
| KPI tiles (List, Drivers, Assets) | `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`, gap 10 px | [list-default-mobile](../screenshots/mobile/list/list-default-mobile.png) shows 2-up |
| KPI tiles (Vendors) | `grid-cols-1 sm:grid-cols-3` | [vendors-default](../screenshots/desktop/vendors/vendors-default-desktop.png) |
| Item page cards | 1 column, `lg:` 2 (Item + Assignment; Alert + Next date), `max-w-5xl` | [list-item-detail-monitoring-on](../screenshots/desktop/list/list-item-detail-monitoring-on-desktop.png) |
| Holder Overview figures | `grid-cols-2 sm:grid-cols-4` | [assets-holder-overview](../screenshots/desktop/assets/assets-holder-overview-desktop.png) |
| Vendor profile figures | 2 columns, `lg:` 5 | [vendors-profile-overview](../screenshots/desktop/vendors/vendors-profile-overview-desktop.png) |
| Item form fields | 1 column, `sm:` 2; "Assigned to" spans 2; rail 288 px (`w-72`) hidden below `md`; cards `max-w-4xl` | [list-add-item-assigned-both](../screenshots/desktop/list/list-add-item-assigned-both-desktop.png) |
| Manage — where / when | `sm:grid-cols-2` | [drivers-manage-notify](../screenshots/desktop/drivers/drivers-manage-notify-desktop.png) |
| Add Vendor fields | 1 column, `md:` 2; ZIP max 200 px | [vendors-add-canada](../screenshots/desktop/vendors/vendors-add-canada-desktop.png) |
| Tables | auto layout in `overflow-x-auto`; holder table `min-w-[980px]`; vendors `table-fixed min-w-[920px]` | [drivers-holder-inventory](../screenshots/desktop/drivers/drivers-holder-inventory-desktop.png) |

### 1.3 Spacing scale

Tailwind's 4 px scale. Values that occur: 2 (`0.5`, chip padding-y), 4–6 (`1`/`1.5`, icon–label gaps), 8–10 (`2`/`2.5`, row actions, KPI gap), 12–14 (`3`/`3.5`, cell padding-y, button padding-x), 16 (`4`, cell padding-x, phone gutter), 20–24 (`5`/`6`, card padding, body padding ≥ sm), 32 (`8`, body padding ≥ lg).

Fixed heights: buttons and inputs **36 px** (`h-9`), **32 px** when the header is condensed and in toolbars (`h-8`), status pills ~20 px, row kebab 28 px, the alert switch 20 × 36 px.

### 1.4 Breakpoints

Tailwind defaults (`sm` 640, `md` 768, `lg` 1024). What changes in Inventory:

| Width | Behaviour |
|---|---|
| < 640 (`sm`) | Sidebar becomes a drawer (☰); header descriptions hidden; section tabs scroll with a › chevron; KPI tiles 2-up (Vendors 1-up); button labels shorten. |
| < 768 (`md`) | Item-form Progress rail hidden; fields single column. |
| < 1024 (`lg`) | KPI tiles 3-up; item page cards single column. |
| all widths | **Tables stay tables** — there is no card view; they scroll sideways inside their card with the Actions column pinned right (`sticky right-0`). Holder and vendor tables have a minimum width (980 / 920 px). |

Mobile captures: [`../screenshots/mobile/`](../screenshots/index.md#mobile-390-px) — e.g. [drivers-manage-ticked-mobile](../screenshots/mobile/drivers/drivers-manage-ticked-mobile.png).

---

## 2. Typography

**Family:** Inter (weights 400 / 500 / 600 loaded), fallback `sans-serif`. `tabular-nums` on counts, dates and money; `font-mono` for item numbers, PINs and serials ("FC-415483", "PIN 7028").

> **TO CONFIRM:** `font-bold` (700) is used on titles and labels but Inter 700 is not loaded — browsers synthesise it (same finding as Account).

| Role | Size / weight | Where |
|---|---|---|
| List page title | 24 px bold `tracking-tight` (20 px below `lg`, 14–16 px condensed) | "Inventory", "Inventory by Driver", "Vendors" |
| Record title | 20–24 px bold | item name, "DRV-001-0001", "Wilmington Truck Service" |
| Wizard title | 24 px bold + 14 px subtitle | "Add Inventory", "Manage inventory — Jason Cooper" |
| Section / card title | 14–16 px semibold + 12 px slate-500 subtitle | "Item", "Assignment", "Dates being watched" |
| Table cell | 13–14 px; primary value 14 px semibold slate-900; secondary line 11–12 px slate-500 | item name over vendor |
| Field / fact label | 11 px bold uppercase `tracking-wider` slate-500 | "RECORD NAME *", "ISSUE DATE" |
| Micro label | 10 px bold uppercase slate-400/500 | KPI labels, table headers (`TH_CLS`), pills |
| Pill / chip | 10–11 px bold, uppercase for statuses | ACTIVE, EXPIRING SOON, CMV |
| Button | 14 px semibold; 13 px in toolbars | |

Frequency in the Inventory source: `text-sm` 106 × · `text-[11px]` 84 × · `text-xs` 67 × · `text-[12px]` 47 × · `text-[10px]` 44 × · `text-[13px]` 43 ×.

---

## 3. Components

### 3.1 Buttons
| Variant | Look | Examples |
|---|---|---|
| Primary | blue-600 fill, white 14 px semibold, `h-9`, radius 8, `hover:bg-blue-700` | Save Inventory, Save assignment, Edit, Save & send, + Add Vendor |
| Primary — dark | slate-900 fill | "Driver Notification ›" (until the notify step has been read) |
| Primary — violet | violet-600 | Sign & confirm (driver) |
| Secondary | white, slate-200 border, slate-700 text | Categories, Columns, Cancel, Manage inventory (outline variant) |
| Danger | red-600 fill / rose text in menus | Delete category, Delete vendor |
| Ghost / icon | 28–32 px square, slate-400 → slate-700 | ✎ Edit, ⋮ More actions, × Close |
| Disabled | slate-200/300 fill, slate-400 text, `cursor-not-allowed`, tooltip says why | Save Inventory before it is valid, Save assignment ("Pick a unit or a driver first") |

### 3.2 Inputs, selects, toggles
- Text / date inputs: `h-9`, slate-200 border, radius 8, 14 px; focus ring `ring-2 ring-blue-500/30` + `border-blue-400`. Search inputs carry a 14 px search icon inside the left edge.
- Native `<select>` for Group by, Rows, Status, Country and the item form's Vendor / Category / Status; turns **blue-tinted** when a grouping is active.
- **Tick cards** (item form "Assigned to"): bordered cards with a checkbox, title and one-line hint; ticked = blue border + blue-50 tint; the last ticked card cannot be unticked.
- **Switch** (alert on/off, collect, forms): 36 × 20 px pill, blue-600 on / slate-300 off, white knob; `aria-pressed`.
- **Radio tiles** (Monitor based on) and **checkbox lists** (reminders, channels) in the Monitoring block.
- **Signature pad** (`SignaturePad`): Draw / Type / Clear, 150 px canvas.

### 3.3 Cards
White, slate-200 border, radius 12 (`rounded-xl`), `shadow-sm`. List card = rail + toolbar + table + pager in one card with `overflow-hidden` (that is why menus render in a portal). Record cards have a 14 px title row and 16–24 px padding. The violet form card (sign-form) and amber / blue notes use tinted 50-backgrounds with matching 200 borders.

### 3.4 Tabs
- **Section tabs** (`SubTabs`): icon + label, 2 px blue underline when active, count badge. Horizontal scroll with ‹ › chevrons when they overflow.
- **Category rail** (`CardTabs` in `TabScroller`): "All 41 · Fuel Card 1 · …", blue underline + blue badge for the active tab.
- **Step bar** (Manage inventory): numbered pills, check mark once a step has content.
- **Record tabs** (item / holder / vendor): same underline style, counts on the right.

### 3.5 Tables
Header row slate-50, 10 px bold uppercase slate-500 labels (`TH_CLS`), sortable headers with ChevronsUpDown → Chevron Up / Down in blue. Rows 52–64 px, zebra (`even:bg-slate-50/40`), hover blue-50/40, focusable (`role="link"`, Enter / Space). Group bands (`TableGroupBand`): a full-width row with an uppercase label and a count, tinted by meaning (Expired rose, Expiring Soon amber, Active emerald, else slate). Pager: "Showing 1–15 of 41 items", Rows select, Prev / Next, windowed page numbers. [list-group-status](../screenshots/desktop/list/list-group-status-desktop.png).

### 3.6 Menus
`KebabMenu` — portal panel 184 px wide, 13 px items with a leading icon, red item last ("Delete"). Opened from a 28 px ⋮ button titled "More actions" / "Actions for {name}". [list-row-menu](../screenshots/desktop/list/list-row-menu-desktop.png), [vendors-row-menu](../screenshots/desktop/vendors/vendors-row-menu-desktop.png).

### 3.7 Modals and dialogs
| Dialog | Size | Closes with | Screenshot |
|---|---|---|---|
| Assign {item} | `max-w-lg`, z-60 | × / Cancel only | [list-assign-dialog-both](../screenshots/desktop/list/list-assign-dialog-both-desktop.png) |
| Item Category | `max-w-2xl`, `max-h-88vh`, header + footer fixed, body scrolls | Esc, backdrop, ×, Done | [list-categories-modal](../screenshots/desktop/list/list-categories-modal-desktop.png) |
| Delete category (alertdialog over the modal) | small | Cancel / Close | [list-categories-delete-blocked](../screenshots/desktop/list/list-categories-delete-blocked-desktop.png) |
| Share to chat | `max-w-4xl`, z-80 | ×, Cancel | [list-share-dialog](../screenshots/desktop/list/list-share-dialog-desktop.png) |
| Confirm these changes | `max-w-lg`, `max-h-85vh`, body scrolls | Go back | [drivers-manage-confirm](../screenshots/desktop/drivers/drivers-manage-confirm-desktop.png) |
| Read it (form preview) | full screen, white | Close | [drivers-manage-read-form](../screenshots/desktop/drivers/drivers-manage-read-form-desktop.png) |
| Delete vendor | 420 px | Cancel | [vendors-delete-confirm](../screenshots/desktop/vendors/vendors-delete-confirm-desktop.png) |
| Edit Vendor | 600 px, **whole sheet scrolls** (header / footer scroll away) | ×, Cancel | [vendors-edit-dialog](../screenshots/desktop/vendors/vendors-edit-dialog-desktop.png) |

### 3.8 Toasts
None in Inventory — a save navigates to the page where the change is visible.

### 3.9 Chips, pills and badges
| Element | Look |
|---|---|
| Status pill | dot + text: Active emerald-50 / emerald-700, Expiring Soon amber-50 / amber-700, Expired red-50 / red-700 |
| Asset kind | CMV indigo, Non-CMV orange, with a truck icon |
| Driver chip | emerald "Driver" with an ID-card icon |
| Assigned to | Both violet, Driver blue, Asset slate, Unassigned grey |
| Driver type | Cross Border violet, US Only blue, Canada Only rose |
| Filter chip | text + count; active = blue-600 fill white text; disabled at 0 |
| Route chip (collection card) | "ASSIGNED" blue outline |
| Count pill | slate-100 rounded-full, 10–11 px bold |

### 3.10 Category visuals (`inventory-visuals.ts`)
Each category has one icon and one palette, used for the item tile and the category bar:

| Category | Icon | Palette |
|---|---|---|
| Fuel Card | Fuel | amber |
| Transponder | Radio | violet |
| ELD Provider | Activity | blue |
| GPS Tracking | Map | emerald |
| Dashcam | Camera | cyan |
| Repair and Maintenance | Wrench | slate |
| Keys & Access | KeyRound | amber |
| Safety & PPE | ShieldCheck | rose |
| Equipment & Supplies | Package | teal |
| Devices & Electronics | Cpu | sky |
| Cards & Documents | CreditCard | violet |
| Others / unknown | Layers | slate |

---

## 4. Icons

lucide-react, 12–20 px, stroke 2, colour inherited (slate-400 in rows, blue-600 when active). 65 distinct icons in the section's files, plus the 12 category icons above:

Activity · AlertCircle · AlertTriangle · ArrowLeft · BadgeCheck · Ban · Bell · BellOff · BellRing · Boxes · Briefcase · Building2 · Calendar · CalendarClock · Check · CheckCircle2 · ChevronDown · ChevronLeft · ChevronRight · CircleCheck · CircleSlash · ClipboardList · Clock · Download · Edit2 · ExternalLink · Eye · FileCheck2 · FileSignature · FileText · Hash · History · IdCard · Info · Layers · LayoutGrid · List · Lock · Mail · MapPin · MessageSquare · Package · PackageCheck · PenLine · Pencil · Phone · Plus · Printer · Receipt · Search · Send · Share2 · ShieldAlert · Smartphone · StickyNote · Store · Table2 · Tag · Trash2 · Truck · Undo2 · UserRound · UserRoundPlus · Wrench · X

Key mappings: **Boxes** = Inventory (sidebar, header, record tiles) · **UserRound / IdCard** = driver · **Truck** = asset · **Store** = vendor · **Tag** = categories · **Bell / BellOff** = alert set / not set · **FileSignature** = receipt to sign · **ClipboardList** = Manage inventory.

---

## 5. Interactions and micro-animations

| Interaction | Behaviour |
|---|---|
| Header fold | 500–700 ms ease (`HEADER_TRANSITION`) on height, padding, font size and opacity; triggered after 140 px of scroll and 40 px of travel in one direction |
| Row hover / focus | blue tint, item name turns blue |
| Sort | 3-state cycle (asc → desc → off) |
| Filters | any change resets the pager to page 1; chips at 0 disable instead of hiding |
| Grouping | bands appear instantly; never split across pages |
| Tick list (Manage) | free row tinted blue when ticked; held row turns rose with a struck-through name when unticked; the action bar recounts live |
| Primary button states | grey (nothing to save) → dark "Driver Notification ›" (read the messages first) → blue "Save & send" |
| Draft message | regenerated as the list changes until the user types in it ("Your wording — it will not be rewritten…"); **Reset to draft** returns to the generated text |
| Item form | picking a vendor re-fills the category and an auto-named record name; the alert block expands / collapses; the projected schedule sentence updates live |
| Collection card | every line starts ticked; Select all / Clear all; the confirm button text counts ("Collected 1 of 2") |
| Switch knob | 150 ms slide |
| Menus / pickers | close on outside click; pickers also on Esc |

---

## 6. Accessibility

### 6.1 Contrast (WCAG 2.1; normal text ≥ 4.5 : 1, large text / UI ≥ 3 : 1)
| Pair | Ratio | Result |
|---|---|---|
| slate-900 text on white | 17.8 : 1 | pass |
| slate-500 secondary text on white | 4.8 : 1 | pass |
| **slate-400** micro text on white ("no expiry", empty "—", some 10 px labels) | 2.6 : 1 | **fail** |
| white on blue-600 (primary buttons) | 5.2 : 1 | pass |
| emerald-700 on emerald-50 (Active) | 5.1 : 1 | pass |
| amber-700 on amber-50 (Expiring Soon) | 4.9 : 1 | pass |
| red-700 on red-50 (Expired) | 5.9 : 1 | pass |
| white on violet-600 (Sign & confirm) | 5.9 : 1 | pass |
| slate-400 disabled button text on slate-200 | 2.1 : 1 | fail (disabled controls are exempt, but the reason lives only in a tooltip) |

Exact values for every token are computed in Step 8 (`design/color-palette.md`).

### 6.2 Focus
Inputs and selects show a 2 px blue ring. Custom buttons rely on the browser's default outline; there is no shared `focus-visible` style (TO CONFIRM, as in Account). Table rows are focusable (`tabIndex=0`) and show the hover tint on focus.

### 6.3 Keyboard
- Rows: Tab to a row, Enter / Space opens it.
- Pickers in the Assign dialog: Esc closes; typing filters.
- Item Category modal: Esc closes; the delete dialog is a `role="alertdialog"`.
- **Assign dialog does not close on Esc** and does not trap focus (TO CONFIRM).
- Kebab menus close on outside click; Esc support depends on the shared `KebabMenu` (TO CONFIRM).
- Signature pad needs a pointer; the **Type** option is the keyboard alternative.

### 6.4 ARIA and semantics
Named regions and controls in the code: "Inventory sections" (tab strip), "Inventory categories" / "Categories held" (rails), "Inventory item sections", "Driver inventory sections" / "Asset inventory sections", "Vendor sections", "Scroll tabs left / right", "More actions", "Actions for {name}", "Edit", "Close", "Clear assignment", "Clear search", "Previous page" / "Next page", "Send these messages when you save", "Take a signature for this", "Do not send {form}", "Close the form". Custom switches use `aria-pressed`. Dialogs other than the category alertdialog do not set `role="dialog"` / `aria-modal` (TO CONFIRM).

### 6.5 Other
- Disabled Save buttons explain themselves only in a tooltip (not reachable by touch or screen reader) — the item form shows no error text at all (page-overview §12 #23).
- 10–11 px text is used for labels, pills and table headers (44 + 84 occurrences); it passes contrast where slate-500 or darker but is below the 12 px floor many guidelines recommend.
- Touch targets: the 28 px ⋮ and ✎ buttons are below 44 px on phones.
- Every status is shown by colour **and** text (pill label), never colour alone.

---

## 7. Screenshot map

| Topic | Desktop | Mobile |
|---|---|---|
| List frame | [list-default](../screenshots/desktop/list/list-default-desktop.png) | [list-default](../screenshots/mobile/list/list-default-mobile.png) |
| Condensed header | [list-condensed-header](../screenshots/desktop/list/list-condensed-header-desktop.png) | [list-condensed-header](../screenshots/mobile/list/list-condensed-header-mobile.png) |
| Group bands | [list-group-status](../screenshots/desktop/list/list-group-status-desktop.png) | [list-group-status](../screenshots/mobile/list/list-group-status-mobile.png) |
| Columns picker | [list-columns-picker](../screenshots/desktop/list/list-columns-picker-desktop.png) | [list-columns-picker](../screenshots/mobile/list/list-columns-picker-mobile.png) |
| Assign dialog + picker | [list-assign-dialog-picker-open](../screenshots/desktop/list/list-assign-dialog-picker-open-desktop.png) | [list-assign-dialog-picker-open](../screenshots/mobile/list/list-assign-dialog-picker-open-mobile.png) |
| Modal with fixed chrome | [list-categories-modal](../screenshots/desktop/list/list-categories-modal-desktop.png) | [list-categories-modal](../screenshots/mobile/list/list-categories-modal-mobile.png) |
| Inline validation | [list-categories-error-duplicate](../screenshots/desktop/list/list-categories-error-duplicate-desktop.png) | [list-categories-error-duplicate](../screenshots/mobile/list/list-categories-error-duplicate-mobile.png) |
| Record page | [list-item-detail-monitoring-on](../screenshots/desktop/list/list-item-detail-monitoring-on-desktop.png) | [list-item-detail-monitoring-on](../screenshots/mobile/list/list-item-detail-monitoring-on-mobile.png) |
| Wizard form | [list-add-item-alert-issue-basis](../screenshots/desktop/list/list-add-item-alert-issue-basis-desktop.png) | [list-add-item-alert-issue-basis](../screenshots/mobile/list/list-add-item-alert-issue-basis-mobile.png) |
| KPI tiles as filters | [drivers-filter-holding-nothing](../screenshots/desktop/drivers/drivers-filter-holding-nothing-desktop.png) | [drivers-filter-holding-nothing](../screenshots/mobile/drivers/drivers-filter-holding-nothing-mobile.png) |
| Tick list states | [drivers-manage-untick](../screenshots/desktop/drivers/drivers-manage-untick-desktop.png) | [drivers-manage-untick](../screenshots/mobile/drivers/drivers-manage-untick-mobile.png) |
| Step 2 + draft message | [drivers-manage-notify](../screenshots/desktop/drivers/drivers-manage-notify-desktop.png) | [drivers-manage-notify](../screenshots/mobile/drivers/drivers-manage-notify-mobile.png) |
| Confirmation dialog | [drivers-manage-confirm](../screenshots/desktop/drivers/drivers-manage-confirm-desktop.png) | [drivers-manage-confirm](../screenshots/mobile/drivers/drivers-manage-confirm-mobile.png) |
| Collection card (driver) | [drivers-sign-card-driver](../screenshots/desktop/drivers/drivers-sign-card-driver-desktop.png) | [drivers-sign-card-driver](../screenshots/mobile/drivers/drivers-sign-card-driver-mobile.png) |
| Sign-form | [drivers-sign-form-signed](../screenshots/desktop/drivers/drivers-sign-form-signed-desktop.png) | [drivers-sign-form-signed](../screenshots/mobile/drivers/drivers-sign-form-signed-mobile.png) |
| Holder page | [assets-holder-inventory-expired](../screenshots/desktop/assets/assets-holder-inventory-expired-desktop.png) | [assets-holder-inventory-expired](../screenshots/mobile/assets/assets-holder-inventory-expired-mobile.png) |
| Vendor profile | [vendors-profile-overview](../screenshots/desktop/vendors/vendors-profile-overview-desktop.png) | [vendors-profile-overview](../screenshots/mobile/vendors/vendors-profile-overview-mobile.png) |
| Plain full-page form | [vendors-add-canada](../screenshots/desktop/vendors/vendors-add-canada-desktop.png) | [vendors-add-canada](../screenshots/mobile/vendors/vendors-add-canada-mobile.png) |
| View-only strip | [list-view-only](../screenshots/desktop/list/list-view-only-desktop.png) | [list-view-only](../screenshots/mobile/list/list-view-only-mobile.png) |

All images: [screenshots/index.md](../screenshots/index.md).
