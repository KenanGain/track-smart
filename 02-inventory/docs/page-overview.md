# 02 – Inventory · Page Overview

**App:** TrackSmart (fleet compliance prototype) · **Section:** sidebar menu #2 "Inventory" · **Documented:** 2026-10-23 · **Source of truth:** the running app (test accounts only) cross-checked against `src/pages/inventory/*` and the routes in `src/App.tsx`.

> Everything below exists in the app today. Anything not seen on screen is marked **ASSUMPTION:** (inferred from code) or **TO CONFIRM:** (needs a product decision or a check I could not make). Demo figures (41 items, 22 drivers, …) are for the carrier **Acme Logistics** (`acct-001`, legal name Acme Trucking Inc.); expiry dates are seeded relative to today, so the Active / Expiring / Expired mix moves with the calendar.

---

## 0. Entry point and frame

| Item | Value |
|---|---|
| Sidebar item | **Inventory** (icon: boxes), second item under Dashboard / Messages / Account |
| Routes | `/inventory` (List) · `/inventory/drivers` · `/inventory/assets` · `/inventory/vendors` — plus the item, holder, manage, vendor and sign-form pages in the tree below |
| Navigation model | Path held in React state (`App.tsx handleNavigate`); the browser URL does not change and a reload lands on the Dashboard. Every screen is reached by clicking. |
| Top-bar title | "Inventory" on the List; "Inventory by Driver" / "Inventory by Asset" on those tabs; "Add Inventory" on the add form. Item pages and holder pages have no entry and show "TrackSmart" (TO CONFIRM). |
| Carrier scope | One carrier at a time — the one in the top-bar **Switch carrier** dropdown (Super Admin / Admin) or the user's own. Every count, list and picker is scoped to it. Switching carrier resets search and filters. |
| Section tabs | **List** · **Drivers** · **Assets** · **Vendors** — an on-page tab strip under the page title (`SubTabs`, aria "Inventory sections"); each tab is its own route. |
| Header | The app's standard list header (`ListPageHeader`): icon + title + count pill + one-line description; it **condenses** after ~140 px of scroll (title shrinks, description folds, a strip of KPI figures appears) and expands again on the way up. The tab strip never scrolls away. |

### Page-level states

| State | What the user sees |
|---|---|
| **Loading** | None. Data is local (seed + localStorage overlays) and renders immediately. ASSUMPTION: a real backend needs a skeleton. |
| **Empty carrier** | KPIs at 0, the Assigned / Available chips disabled, and "No inventory items match your filters · Try a different category, or show all items." |
| **View-only (light access)** | Blue strip under the top bar: "**View only** · a Safety Manager can look at Inventory here but not change it." Every control still works — the inventory pages read no role (TO CONFIRM, §9). |
| **No access (hidden)** | "Not in your menu" page: "**Inventory** is not part of what a **{Role}** on **{carrier}** can open." · "Access per role is set in Users & Roles ▸ Roles." · button **Go to Dashboard**. |
| **Success** | No toasts anywhere in Inventory. A save navigates away and the change is visible on the page it lands on. |
| **Error** | No inline field errors on the item form (Save stays disabled until valid); inline red errors only in the Categories modal and vendor forms; not-found pages for stale item / holder ids. |

---

## 1. Tree (what exists inside Inventory)

```
Inventory
├── List                          /inventory
│   ├── Header  [Categories → "Item Category" modal]
│   ├── KPI tiles (5)  Total Items · Active · Expiring Soon · Expired · Unassigned
│   ├── Category tab rail          All · Fuel Card · Transponder · … · Other
│   ├── Toolbar                    Search · [Add Inventory → Add item page]
│   ├── Filter row                 All items · Assigned · Available · Group by · Columns · Reset
│   ├── Table                      Item · Number/PIN · Issued · Expires · Asset · Driver · Status · Actions
│   │   ├── row click              → Item detail page
│   │   ├── ✎ Edit                 → Edit item page
│   │   └── ⋮  Assign / Change assignment → "Assign {item}" dialog · Share to chat → Share dialog
│   └── Pager                      Rows 8/15/25/50
├── Item detail                   /inventory/items/:id
│   ├── Header  [Edit] [⋮ Share to chat]
│   └── Tabs  Information · Monitoring · Activity
├── Add item / Edit item          /inventory/items/new · /inventory/items/:id/edit   (full-page wizard)
│   ├── 1 Item                     Vendor · Category · Record name · Status · Assigned to (Driver / Asset)
│   └── 2 Details                  Number · PIN · Issue date · Expiry date · Alert (Monitoring & Notifications)
├── Drivers                       /inventory/drivers   ("Inventory by Driver")
│   ├── KPI tiles (5, clickable filters)  Drivers · Holding inventory · Holding nothing · Expiring soon · Expired
│   ├── Toolbar                    Search · Columns · Showing n of N
│   ├── Filter row                 All drivers · Cross Border · US Only · Canada Only · Group by · Reset
│   ├── Table                      Driver · Status · Driver type · Returnable · (Expiring · Expired · No alert) · Actions
│   │   ├── row click              → Driver holder page
│   │   └── ⋮  Open driver · Assign inventory · Share to chat
│   └── Legend + Pager
├── Assets                        /inventory/assets    ("Inventory by Asset")  — same component, per unit
│   ├── Table                      Asset · Status · Items · Driver returnable · Asset removable · (…) · Actions
│   └── ⋮  Open asset · Manage inventory · Share to chat
├── Holder page (driver / asset)  /inventory/drivers/:id · /inventory/assets/:id
│   ├── Header  [Manage inventory] [⋮ Share to chat]
│   └── Tabs  Overview · Inventory · Monitoring · Activity
├── Manage inventory              /inventory/drivers/:id/assign · /inventory/assets/:id/assign   (full-page wizard)
│   ├── 1 Inventory                tick list: held items (untick = take off) + free items (tick = give out)
│   ├── 2 Driver Notification      (driver page only) collect / hand-back messages · forms to sign · where & when
│   └── "Confirm these changes" dialog → Save changes / Save and send
├── Vendors                       /inventory/vendors   (see §8)
│   ├── Vendor list · Vendor profile page · Add vendor · Edit vendor dialog · Categories
└── Driver sign-form              /inventory/sign-form   (driver seat, opened from a collection card in Messages)
    └── Receipt form · tick what you received · signature · Sign & confirm
```

Reachable but with no link in the UI: `/inventory/drivers/:id/add` and `/inventory/assets/:id/add` (the add form pre-pointed at a holder). Legacy paths `/inventory/handover*`, `/inventory/driver-inventory*`, `/inventory/take-back/*` render the List. `InventoryDriversPage.tsx` and `InventoryAssetsPage.tsx` are dead code (not routed).

---

## 2. Tab: List  (`/inventory` · `InventoryListPage.tsx`)

**Purpose.** The carrier's whole inventory — fuel cards, transponders, ELDs, keys, PPE, devices, documents — in one sortable, groupable table. Search it, narrow it by category and by assignment, open an item, edit it, assign it or share it.

### 2.1 Header
| Element | Detail |
|---|---|
| Icon | Boxes, blue square |
| Title | **Inventory** + count pill (all items, tooltip "{n} items") |
| Description | "**{carrier}** — company inventory across every vendor category." (hidden below `sm`; folds when condensed) |
| Action | **Categories** (tag icon) → "Item Category" modal (§2.9) |
| Condensed strip | Chips "Items · Active · Expiring · Expired · Unassigned" with their figures (not clickable) |

### 2.2 KPI tiles
Grid 2 → 3 (`md`) → 5 (`lg`). Counts are for the whole carrier and ignore filters. **Clicking a tile does nothing** (no handler).

| Tile | Counts | Icon · accent |
|---|---|---|
| Total Items | every item | Layers · blue |
| Active | status Active | CircleCheck · emerald |
| Expiring Soon | status Expiring Soon | Clock · amber |
| Expired | status Expired | AlertTriangle · red |
| Unassigned | on neither a unit nor a driver | CircleSlash · slate |

Acme today: 41 · 35 · 3 · 3 · 14.

### 2.3 Category tab rail
`All {n}`, then one tab per category that has rows after the assignment filter (category name + count), then `Other {n}` for items with no known category. Acme: All 41 · Fuel Card 1 · Transponder 1 · ELD Provider 1 · Repair and Maintenance 2 · Keys & Access 7 · Safety & PPE 10 · Equipment & Supplies 8 · Devices & Electronics 6 · Cards & Documents 5. Chevrons "Scroll tabs left / right" appear when the rail overflows. If the active category empties after a filter change the rail falls back to All. An item's category is its own `categoryId`, falling back to its vendor's.

### 2.4 Toolbar and filter row
| Control | Type | Behaviour |
|---|---|---|
| Search | text, placeholder "Search item, vendor, number or PIN…" | case-insensitive on item name, vendor name, serial, PIN (not the vendor's company name) |
| **Add Inventory** | button (plus icon) | → Add item page |
| All items · Assigned · Available | filter chips with live counts | Assigned = on a unit or a driver; Available = on neither. A chip at 0 is disabled; "All items" never is. |
| Group by | select (tooltip "Group the list"), blue when set | Options: *Group by* (none) · **Assignment** (Assigned, Available) · **Status** (Expired, Expiring Soon, Active — urgency order) · **Category** (A–Z, Other) · **Vendor** (company name; all accessories in one "Company Issued" band). Bands are labelled rows with a count and never split across pages. |
| Columns | button → "Toggle columns" panel | Item 🔒 · Number / PIN · Issued · Expires · Asset · Driver · Status · Actions 🔒. Not remembered. |
| Reset | button (X), tooltip "Clear the filters on this row" | shown only while a chip, grouping, category or search is set; clears those four (not columns or sort) |

### 2.5 Table
One table at every width (horizontal scroll on small screens), zebra rows, Actions column sticky on the right. Headers sort ascending → descending → off; blanks always last.

| Column | Content |
|---|---|
| **Item** | category icon tile, name ("Comdata — Fuel Card", "Truck Keys — Keys & Access"), vendor company underneath ("Comdata Inc.", "Company Issued") |
| **Number / PIN** | serial (mono) and "PIN ####" |
| **Issued** | "Mar 17, 2025" |
| **Expires** | date + bell (green = alert set, tooltip "Alert on expiry date · remind 30d, 7d, on the day"; grey bell-off = "No alert set"), or "no expiry" |
| **Asset** | CMV (indigo) / Non-CMV (orange) chip, unit number, "{year} {make} {model}"; "—" or "Unknown asset" |
| **Driver** | green "Driver" chip, name, "License …" or "Assigned directly"; grey "Unassigned" pill when on nobody and no unit; "—" when on a unit only |
| **Status** | pill: Active (emerald) · Expiring Soon (amber) · Expired (red) |
| **Actions** | ✎ **Edit** → Edit item page · ⋮ **More actions**: **Assign** (unassigned) or **Change assignment** (assigned) → Assign dialog; **Share to chat** → Share dialog |

Row click — or Enter / Space on a focused row (`role="link"`) — opens the item detail page.

### 2.6 Pager
"Showing **1–15** of **41** items" · Rows 8 / 15 (default) / 25 / 50 · Previous / Next · windowed page numbers with "…". Resets to page 1 on any search, filter, grouping or carrier change.

### 2.7 States
| State | Detail |
|---|---|
| Default | All tab, All items chip, no grouping, no sort, 15 rows |
| Condensed header | after scrolling the body |
| No results | Layers icon · "No inventory items match your filters" · "Nothing matches **{q}** in this view." (searching) or "Try a different category, or show all items." · **Clear filters** (when search / chip / category is set) |
| Deep link | Opening an inventory record link from a chat lands on that item's detail page |

### 2.8 "Assign {item}" dialog  (row ⋮ → Assign / Change assignment)
Centred card (`max-w-lg`). Closes only with **×** or **Cancel** (no backdrop or Escape close).

| Part | Detail |
|---|---|
| Header | truck icon · "Assign {item}" · "{serial} · Currently: {Not assigned \| unit · driver \| a driver no longer on the roster}" |
| **UNIT** block | only if the item is ticked for Asset. Hint "It belongs to this unit and comes off when the unit leaves the fleet." Picker "Select a unit". |
| **DRIVER** block | only if ticked for Driver. Hint "This person is answerable for it and hands it back when they leave." Picker "Select a driver". |
| Both | blue note "This item is ticked for both, so it can be filed in both places at once — on the unit, and on the person who carries it. Leave either blank if only one of them is settled." |
| Picker (opens in place) | search "Search by unit #, VIN, make/model, plate…" / "Search by name, license, terminal, status…"; unit rows: unit #, type + status chips, year make model, current driver or "No driver assigned", "VIN •••1234 · Plate · ST · miles"; driver rows (Active only): name, status / licence state / terminal chips, type, "License … · Exp … · phone"; no match "No vehicles match "{q}"" / "No drivers match "{q}""; footer "{n} of {total} · Esc to close"; × "Clear assignment" |
| Footer | **Unassign** (only when assigned) · **Cancel** · **Save assignment** (disabled, tooltip "Pick a unit or a driver first", until something is picked) |
| Writes | assignment patch on the item + activity "Assigned to vehicle and driver" / "Assigned to driver" / "Assigned to vehicle", or "Unassigned · Taken back from {holder}". No message is sent from here. |

Which blocks show: fuel card, transponder, truck keys → both; PPE, uniform → Driver only; ELD, repair shop → Unit only.

### 2.9 "Item Category" modal  (header → Categories)
Blurred backdrop; backdrop click or Esc closes; page scroll locked.

| Part | Detail |
|---|---|
| Title | "Item Category" · "Single source of truth for what kind of things your inventory holds." |
| Bar | "{n} categories" (12) · **Add Category** (hidden while a form is open) |
| New Category card | **Name *** (placeholder "e.g. Telematics", autofocus) · **Description (optional)** ("Short description") · Cancel · **+ Add** |
| Errors (red box) | "Category name is required." · `A category named "{name}" already exists.` (case-insensitive) |
| Category row | tag tile, name, description, "{n} item(s)" pill, ✎ "Edit category", 🗑 "Delete category" — or 🔒 "In use by {n} items" when it has items |
| Edit card | 'Editing "{name}"' · same fields · Cancel · Save (duplicate → same error; empty name → Save does nothing) |
| Delete — empty | 'Delete "{name}"?' · "Nothing is filed under it, so nothing else changes. This can’t be undone." · Cancel · **Delete category** (red) |
| Delete — in use | '"{name}" can’t be deleted' · "**{n} items are** filed under this category. Move them to another category first, and this one can go." · up to 4 item names + "and {n} more" · **Close** |
| Empty | "No categories yet" · "Add one above to start grouping vendors." |
| Footer | **Done** |

The 12 categories: Fuel Card · Transponder · ELD Provider · GPS Tracking · Dashcam · Repair and Maintenance · Keys & Access · Safety & PPE · Equipment & Supplies · Devices & Electronics · Cards & Documents · Others. **Changes made here are not saved** — they live in the page's memory, are lost on navigation, and the category rail and item form keep using the built-in list (TO CONFIRM, §12).

### 2.10 Share dialog  (row ⋮ → Share to chat; also on item and holder pages)
The app-wide Share dialog: "Share {item}" · "Send the item in a chat, or to an outsider by email" · **Send via** In-app chat / External chat / Email · recipient search ("Search people…" / saved or new contact) · Subject (defaults to the item name) · Message ("Add a note…") · Attachments (Device / From app; starts empty) · Preview / Edit · send button **Share in chat** / **Send & create chat** / **Email documents** (disabled until a recipient or valid email) · success screen "Shared in Messages" with **Done** and **Open in Messages**. The message carries a record link (type `inventory`, label, "{vendor} · {serial}") that opens the item.

---

## 3. Item pages

### 3.1 Item detail  (`/inventory/items/:id` · `InventoryItemDetailPage.tsx`)
**Purpose.** Read one item: what it is, where it is, what it counts down to, and what has happened to it. Editing is a separate page.

| Region | Detail |
|---|---|
| Header | "‹ Back to {previous page}" · boxes tile · item name (h1) · status pill · "**{vendor}** · {category} · {serial}" · **Edit** (blue) → Edit page · ⋮ **Share to chat** (no delete) |
| Tabs | **Information** · **Monitoring** · **Activity {n}** |

**Information**
- *Item* card ("What it is, and what is printed on it."): Vendor · Category · Number · PIN ("—") · Issue date · Expiry date ("Never expires") · Notes (only when set — repair-shop seeds carry "Service vendor inventory record tied to fleet maintenance coverage.").
- *Assignment* card ("Where it is, and whose hands it is in."): **ASSET** chip + unit + year make model, or "Not on a vehicle." · **DRIVER** chip + name + licence, or "Nobody is holding this." · **Vendor contact** "{contact} · {email/phone}" (vendor items only). No assign buttons here.

**Monitoring**
- *Alert* card ("What this counts down to, and when it says so."). On: green "Monitoring is on" · Counting from (Issue / Expiry / Custom date) · Renews ("Annually (Every 1 Year)", "Does not recur", …) · Reminders ("30 days before, on the day") · Sent by ("In-app · Email" / "Nowhere"). Off: grey "No alert is set" · "This runs out on {date} and nobody will be told." or "There is no expiry date on this item, so there is nothing to count down to." · **Set one up** → Edit page.
- *Next date* card ("The date the alert counts back from."): big date + "Due today" / "{n} days overdue" (red) / "{n} days from now" (amber ≤ 30, else green) · Issued · Expires ("Never"); or "This item has no expiry and no custom date, so there is nothing to come due."

**Activity** — timeline, newest first. *System* entries are derived (never stored): "Added to inventory · From {vendor} · Number {serial}", "Assigned · {unit} · {driver}", "Expired · Ran out on {date}". *Office* / *Driver* entries are recorded: "Added to inventory", "Item updated — {n} changes" with the change list ("Number: A → B · Status: Active → Expired · Driver: X → none · Alert turned on"), assignment events, "Asked to collect it", "Receipt signed", "Collected by driver", "Handed back to the office". Empty: "Nothing has been recorded against this item yet."

**Not found:** "That inventory item no longer exists" · "It may have been removed, or it belongs to another carrier." · **Back to Inventory**.

### 3.2 Add item / Edit item  (`/inventory/items/new`, `/inventory/items/:id/edit` · `AddInventoryItemPage.tsx` + `InventoryItemFields.tsx`)
**Purpose.** Create an item, or change one. Full-page wizard (`WizardEditor`): header with "← Back to Inventory", title **Add Inventory** / **Edit Inventory — {item}**, subtitle "Item details, dates and alert.", actions **Cancel** (→ List, in both modes) and **✓ Save Inventory** / **✓ Update Inventory** (grey and disabled until valid). Left rail "Progress · Complete each section" with steps **1 Item** and **2 Details** (answered-field counts, green check, click to scroll, scroll-spy) — hidden below `md`.

**Section 1 — Item** ("Who it is from, and what to call it.")

| Field | Type | Required | Rules / options |
|---|---|---|---|
| Vendor * | select | **enforced** | the carrier's vendors (all vendors if it has none); defaults to the first. Changing it changes the category (unless one was chosen by hand) and renames an auto-named item. |
| Category * | select | marked, not enforced | "Select a category…" + the 12 categories; defaults to the vendor's; hint "What kind of thing this is." |
| Record name * | text | marked, not enforced | default "{vendor} — {category}"; hint "Defaults to the vendor and its category."; a typed name survives vendor / category changes; cleared → shows the default |
| Status * | select | always set | Active (default) · Expiring Soon · Expired — **set by hand, not derived from dates** |
| Assigned to * | 2 tick cards | at least one stays ticked | **Driver** "The driver returns it to the carrier when they leave, or when they move to a different asset." · **Asset** "It is removed when the asset leaves the carrier's fleet." Default **Asset** only. Hint "Tick both where the item belongs to the unit and a person is answerable for it." |

**Section 2 — Numbers, Dates & Monitoring** (rail "Details"; "What is printed on it, how long it runs, and when to be told.")

| Field | Type | Required | Rules |
|---|---|---|---|
| Number * | text, "e.g. FC-558271" | **enforced** (trimmed, not empty) | no format or uniqueness check |
| PIN | text, "e.g. 4421" | no | — |
| Issue date * | date | **enforced** | — |
| Expiry date | date | no | hint "Leave blank for something that never runs out — a yard key." No check that it is after the issue date. |
| **Alert** — Monitoring & Notifications | switch (default **Off**) + panel | — | **Monitor based on** Issue date / Expiry date (default) / Custom date · **Date to monitor** (read-only chip, or a date input for Custom) · **Renewal recurrence** (Issue-date basis only): Does not recur, Monthly, Quarterly (Every 3 Months), Semi-Annually (Every 6 Months), Annually (Every 1 Year) (default), Every 2 Years, Every 3 Years, Every 5 Years · **Notification reminders** 90 / 60 / 45 / 30 (default) / 15 / 7 days before, On the date · **Notification channels** Email ✓, In-App ✓ · **Projected Notification Schedule** sentence. Amber warning when on, basis = Expiry and no expiry date: "There is no expiry date to count back from yet — add one above, or point the alert at the issue date or a custom one." |

Validation = Vendor + Number + Issue date. There are **no error messages**: Save simply stays disabled. Save on **Add** stores the item (id `inv-add-<time>`), logs "Added to inventory" and returns to the List, where the new item is first. Save on **Edit** stores the changes, logs "Item updated — {n} changes" and opens the item's detail page. Assignment is not edited here (it is carried through unchanged).

---

## 4. Tabs: Drivers and Assets  (`/inventory/drivers`, `/inventory/assets` · `InventoryHoldersPage.tsx`)

**Purpose.** The same inventory counted the other way round — per person and per vehicle: what each one holds and what needs attention. One component serves both tabs.

| Region | Drivers | Assets |
|---|---|---|
| Header | user icon · **Inventory by Driver** + count of items held (tooltip "{n} items across {k} drivers") · "**{carrier}** — what each driver is holding, and what needs attention." | truck icon · **Inventory by Asset** · "… what each asset is holding …" |
| KPI tiles — **clickable filters** | **Drivers** (all) · **Holding inventory** · **Holding nothing** · **Expiring soon** · **Expired** | **Assets** · Holding inventory · Holding nothing · Expiring soon · Expired |
| Acme today | 22 · 12 · 10 · 1 · 0 (19 items held) | 18 · 8 · 10 · 2 · 2 (17 items) |
| Search | "Search driver, or an item they hold…" (name, sub-line, held item name or serial) | "Search unit, make, or an item on it…" |
| Columns | Driver 🔒 · Status · Driver type · Returnable items · Expiring · Expired · No alert · Actions 🔒 (last three off by default) | Asset 🔒 · Status · Items · Driver returnable · Asset removable · Expiring · Expired · No alert · Actions 🔒 |
| Right of toolbar | "Showing {n} of {N}" | same |
| Chips | **All drivers** · **Cross Border** · **US Only** · **Canada Only** (driver type from DQ files; 0 → disabled) | — |
| Group by | Jurisdiction · Status · Holdings | Status · Holdings |
| Reset | clears tile filter, chip, grouping and search | same |
| Row | icon chip (greyed when holding nothing) · name · sub-line (driver type / terminal) · status pill (Active, On Leave, Inactive, Terminated) · driver-type badge · counts ("—" for 0) | unit · "2025 International HV507" · CMV / Non-CMV badge · status (Active, Maintenance, Out of service, Deactivated, Draft) · counts |
| Row click | → driver holder page | → asset holder page |
| ⋮ menu | **Open driver** · **Assign inventory** · **Share to chat** | **Open asset** · **Manage inventory** · **Share to chat** |
| Legend under the table | "**Returnable** — travels with whoever drives it, and has to come back" · "**On the vehicle** — fitted to the vehicle, and has to come off" · "**No alert** — has an expiry date nobody will be told about" | "**Driver returnable** — …" · "**Asset removable** — …" · "No alert — …" |
| Pager | "Showing 1–15 of 22 drivers", Rows 8 / 15 / 25 / 50 | "… assets" |
| No results | "No drivers match this view" · "Try a different search, or show all drivers." | "No assets match this view" |
| Share | "Share {name}" · "What this driver is holding, in a chat or by email" — attachments = the held items grouped by how they are held; default subject "{name} — inventory" | same for the vehicle |

Every roster driver / fleet unit is listed, including those holding nothing; holders that are not on the roster show as "Unknown driver" / "Unknown asset" with status "Off roster". Default order: most items first, then A–Z. *Expiring* = within 30 days; *No alert* = has an expiry date but monitoring off.

---

## 5. Holder page  (`/inventory/drivers/:id`, `/inventory/assets/:id` · `HolderDetailPage.tsx` + `HolderInventoryPanel.tsx`)

**Purpose.** One driver's or one unit's inventory as a page of its own.

| Region | Detail |
|---|---|
| Header | "‹ Back to …" · ID-card / truck tile · title · sub-line with " · **{n} expired**" (rose) or " · **{n} expiring**" (amber) · **Manage inventory** → Manage page · ⋮ **Share to chat** |
| Tabs | **Overview** · **Inventory {n}** · **Monitoring {n}** · **Activity {n}** |
| Overview | four figures: **Items held** · **Also on a unit** (driver page) / **Also on a driver** (asset page) · **Expiring soon** · **Expired** |
| Inventory | attention pills ("{n} expired", "{n} expiring soon") · category strip (All + held categories) · search "Search item, vendor, serial or PIN…" · sort buttons **Expiry** (default) / **Vendor** / **Issued** · status select All statuses / Active / Expiring Soon / Expired · Group by Assigned to / Status / Category / Vendor · Reset · table **Item · Type · Serial · PIN · Issued · Expires ("{n}d overdue" / "in {n}d") · Assigned to (Both / Driver / Asset / Unassigned) · Status · ✎** (min. 980 px wide, scrolls on phones) · pager Rows 5 / 8 / 15 / 25 · row → item page |
| Inventory — empty | "Nothing on file" · "Nothing is issued to this driver, riding in their cab, or signed across to them." / "Nothing is kept on this vehicle or carried by whoever drives it." · filtered: "Nothing matches that" · "Clear the search or pick a different filter." |
| Monitoring | "Dates being watched" · "Soonest first. An item with no date to watch is not listed." · rows: colour bar (blue returnable / slate removable), item name (→ item page), bell + basis or "No alert set", date, "{n}d overdue" / "in {n}d" · empty "Nothing on {title} has a date to watch." |
| Activity | "Activity" · "Everything that happened to what this holds, newest first." · each entry prefixed with the item name · empty "Nothing has happened yet." |
| Not found | "That driver is no longer here" / "That asset is no longer here" · "They may have been removed, or belong to another carrier." · **Back to Drivers / Assets** |

**Defects seen in code (TO CONFIRM, §12):** the title shows the raw id (e.g. "DRV-001-0001") because the route never passes the holder's name; and a real driver holding nothing (e.g. Barbara Cox) gets the not-found page instead of an empty one.

The same Inventory panel (with a **Manage inventory** button) is embedded in the driver profile and the asset record in Account.

---

## 6. Manage inventory  (`/inventory/drivers/:id/assign`, `/inventory/assets/:id/assign` · `AssignInventoryPage.tsx`)

**Purpose.** Put inventory on, or take it off, one holder in one list of ticks — and, for a driver, draft and send the collection / hand-back message with any forms they must sign.

| Region | Detail |
|---|---|
| Header | "← Back to …" · **Manage inventory — {holder}** · "Driver · {n} item(s) held" / "{CMV \| Non-CMV} · {year make model} · {n} item(s) held" |
| Step bar | driver: **1 Inventory** · **2 Driver Notification**; asset: **Inventory** only |
| Sticky action bar | **‹ Back** (disabled on step 1) · status "Nothing picked yet — tick something on the list." or "{n} change(s) · {x} going on · {y} coming off · {z} message(s)" · primary button: grey/disabled at 0 changes; dark **Driver Notification ›** (tooltip "Something you have picked travels with the driver. Read what they will be told first.") until the notify step has been read; then **Save & send** / **Save changes** → confirmation |

**Step 1 — Inventory** (`ItemPickList`)
- One list: items already on the holder (ticked) then free items (driver page: items ticked for Driver and on nobody; asset page: ticked for Asset and on no unit).
- Category strip · search "Search unassigned items…" · "{held} on it — {free} free to give out" / "On nobody, in this carrier's inventory." · chips All items / Assigned / Available (when something is held) · Group by Assignment / Category / Vendor / Handling / Status · Reset.
- Table: tick · **Item name · Category · Serial** (+ PIN) · **Driver returnable** (Yes / No / N/A) · **Issue date · Expiry date** ("no expiry") · **Status**. Ticking a free row tints it blue ("Put {item} on this driver → {holder}"); unticking a held row turns it rose and strikes the name ("Take {item} off this driver").
- Empty: "Nothing is on this driver, and every item in this carrier's inventory is already somewhere else. Take one back first, or add a new item." · no match: "Nothing matches "{q}"" / "Nothing in this category."
- Demo: Jason Cooper holds *Comdata — Fuel Card* and *Truck Keys*; six spare items are free to give out (Spare Truck Keys (set), Spare Yard Gate Fob, Spare Hi-Vis Vests (box), Spare Safety Gloves (box), Spare Tablet (expired), Blank Logbooks).

**Step 2 — Driver Notification** (driver page only; "The collection list that lands in the driver app.")
- "{Driver} collects {n}" list with **Driver returnable** chips.
- Switch **"Ask them to collect it when you save"** (default on): "It lands in their chat as a checklist they tick off in the driver app. What they confirm comes back onto the item." / off: "The kit still goes onto the vehicle. Nobody is asked to come for it." Hand-backs are always sent — amber "One hand-back is still going out. Somebody is carrying kit this save takes off the record, and not asking for it is how it stays in a pocket."
- **Forms to sign** (violet block, switch default on, **Uniform & Equipment Issue Receipt** pre-attached): "{n} forms to sign" · "The form goes out in the same message, filled in from what they tick off, and filed onto their record once signed." · per form **Read it** (full-screen preview "As {driver} will see it — filled in from what you have picked." + Close) and × · **+ Add a form** picker ("Search the form catalog…", groups *Company paperwork* — Direct Deposit Authorization, Emergency Contact Information, Tax Withholding (W-4 / TD1), Uniform & Equipment Issue Receipt, Fuel Card Agreement — and *Policy & consent forms*).
- **Collected from / handed to**: The office (default) / Somebody else (+ "Who has it — e.g. Mike Johnson, yard office") · **By when (optional)** date-time.
- One message card per plan: driver, "Collects {n}" / "Hands in {n}", editable 6-line draft ("Hi Jason — you’ve been assigned an item. Please collect it from the office: • … Tick them off below once you have them."), "Drafted from what is moving. Type to make it yours." / "Your wording — it will not be rewritten if the list changes.", **Reset to draft**, **Open chat**.

**Confirm dialog** — "Confirm these changes" · "{holder} — this is what will happen when you save." · "Going onto this driver ({n})" / "Coming off it ({n})" with Driver / Asset chips · **Who gets told** ("Nobody. Everything here stays with the driver, so there is no message to send." or "Jason Cooper collects 1 item from the office and signs 1 form") · **Go back** · **✓ Save and send** / **✓ Save changes**.

**On save** the assignment changes are stored, each item logs "Assigned to driver / vehicle" or "Unassigned", messages are posted into the driver's chat as a collection card ("Asked to collect it", "Receipt to sign" on each item), and the page returns to the Drivers / Assets tab. No toast. The asset page never sends a message.

---

## 7. Driver collection and sign-form  (Messages card → `/inventory/sign-form` · `CollectionFormPage.tsx`, `InlineFormFill.tsx`)

**Purpose.** The driver's half of a hand-out: tick off what they picked up (or handed back) and sign the receipt, which is filed on their record.

| Who | What they see |
|---|---|
| Office, in Messages | The collection card read-only: "Waiting for {driver} to confirm what they picked up." + **Open in driver app** |
| Driver seat, in Messages | The card is live: title "Collect from the office" / "Hand back to the office" (or "… from / to {person}"), "Tick what you have picked up.", "{n} items · issued by {who} · {holder}", pills "from {place}" / "by {due}", **Select all / Clear all**, every line pre-ticked with a route chip (Assigned / In the cab / Sign for), **Receipt to sign** with **Fill it in**, footer "{n} of {all} ticked · the receipt lists these", primary **Sign & confirm** / "I have collected these" / "Collected {n} of {all}" |
| Driver Mobile App | Home tile **Collect from the office** — "{n} lists waiting — tick off what you pick up"; empty "Nothing to collect"; "Already collected"; signing happens on an in-app "Sign the receipt" screen |

**Sign-form page** — "‹ Back" · violet file-signature tile · **{form title}** (e.g. "Uniform & Equipment Issue Receipt") · "{driver} · {n} item(s) · {k} more form(s) after this" · pills unit / from / by.
- Statement panel (open by default): "Tick what you received, and what you are agreeing to" — the **Items received ({n})** table with a **Got** tick column and "Issued for {unit}.", then the statement ("I acknowledge receipt of the company property listed above… may be deducted from my final pay where permitted by law.").
- Fields: Employee name, Issue date (prefilled) · **Signature** pad · Print Name · Date.
- Footer hint "Tick what you received." / "Sign above to finish." / "Signing files a copy on {name}'s record." · **✓ Sign & confirm** / **Sign & next form** — disabled until every signature is drawn and at least one item is ticked.
- "Nothing to sign here" when opened without a request (e.g. after a reload: "This page opens from a collection message, and it was not opened from one — a reload loses which receipt you were signing."), when the collection is gone, already signed ("This one has been signed and filed.") or the form detached · **Back to the message**.

**On signing:** a signed copy (tag "Filled in system", "Signed by X on DATE", the item list) is filed on the driver's compliance record; each item logs "Receipt signed"; when no forms remain the collection is confirmed ("Collected by driver" / "Not collected"; a hand-back clears the driver from the item: "Handed back to the office"); back to Messages, where the card reads "Signed by {driver} on {date} — filed on their record." and "All {n} confirmed by {driver}." The filed copy opens from Compliances & Documents with **👁 Form** (Form view / PDF view, themes Standard / Compact / Enhanced / Traditional / Black & White, Print, Download PDF).

---

## 8. Tab: Vendors  (`/inventory/vendors` · `VendorsListPage.tsx` + `VendorsTable.tsx`)

**Purpose.** The shops and suppliers the carrier buys from — the same list the sidebar **Vendors** menu shows (`/vendors`, without the Inventory tabs), and the vendors an inventory item or a work order is filed against.

### 8.1 List
| Region | Detail |
|---|---|
| Header | store icon · **Vendors** + count pill (tooltip "{n} vendors") · "**{carrier}** — {n} vendors this carrier buys from" · **+ Add Vendor** → Add Vendor page · the four Inventory tabs |
| KPI tiles (clickable filters) | **Total Vendors** (all) · **Active** · **Inactive** — Acme 41 / 41 / 0 |
| Toolbar | search "Search vendor, contact or address…" (name, company, email, phone, address) · **Group by** (select "Band the list"): Status · Jurisdiction (state, else country, else "No address") · **Columns** (Vendor 🔒, Address, Contact, Status, Actions 🔒) · **Reset** |
| Table | **Vendor** (store icon, name " · company") · **Address** (pin + "street, apt, city, ST zip" or "—") · **Contact** (mail + email · phone, or "—") · **Status** (ACTIVE / INACTIVE pill) · ⋮ **Actions for {name}**: **Share to chat** · **Edit** · **Delete** (red). Fixed layout, min 920 px, scrolls sideways on phones; Actions column sticky. Row click → vendor profile. |
| Pager | "Showing 1–15 of 41 vendors", Rows 8 / 15 / 25 / 50 |
| No results | "No vendors match your filters" · "Nothing matches **{q}** in this view." / "Try another status, or show them all." · **Clear filters** (also what the Inactive tile shows today — there are no inactive vendors) |
| Delete | dialog **Delete “{name}”?** · "It will stop appearing when anyone raises a work order or files inventory against a vendor. Records that already name it are not changed." · Cancel · **Delete vendor** (red). No guard for items still filed against it; no undo. |
| Share | "Share {name}" · "A vendor record, in a chat or by email" · items: vendor, email, phone, address · subject "{name} — vendor" |

There is **no category strip** on this list (by design: "a vendor's category is an inventory concept"). The list **includes** the 36 "Company Issued" placeholder rows each carrier gets for its accessories (Truck Keys, Safety Gloves, …: no address, no contact) — Acme shows 5 real vendors + 36 of those (TO CONFIRM, §12).

### 8.2 Vendor profile  (row click → `/maintenance/vendors/:id`, rendered by Maintenance's `VendorPage`)
| Region | Detail |
|---|---|
| Header | "← Vendors" (back to where it came from) · store icon · name · status pill · "{company} · {category} · {n} work orders · {n} bills". The Edit / Share buttons in the component are not shown here (no handlers passed). |
| Tabs | **Overview** · **Inventory {n}** · **Work Orders {n}** · **Repair bills {n}** · **Activity {n}** |
| Overview | five figures: **Total spent** (per currency, "Nothing billed"), **Bills** ("x service · y roadside"), **Work orders** ("x still open"), **Inventory** ("item(s) on the fleet"), **Last job** (date or "Never") · **How to reach them** (Contact, Email, Phone, Address) · **Costs** (per currency: Service records vs Roadside repairs bars; empty "Nothing billed yet") |
| Inventory | "Inventory from this vendor" · "{n} item(s) filed against them — cards, transponders, keys and anything else they issued." · Item · Serial · Assigned to · Expires · Status; empty "Nothing filed against this vendor" · "Items added in Inventory under this vendor show up here." Row click → the Inventory List (not the item). |
| Work Orders | the shared work-orders table filtered to this vendor (All / Open / Completed / Cancelled, Group by), empty "Nothing has been sent to this vendor" |
| Repair bills | "Repair bills and total" · All / Service records / Roadside · Billed · Invoice # · For · Unit · Labour · Parts · Total · footer "TOTAL BILLED" per currency; empty "This vendor has not billed us" |
| Activity | "Work order raised — …", "Service billed — USD 935.00", "Roadside repair billed — USD 412.60"; empty "Nothing has happened with this vendor yet." |

Demo: **Wilmington Truck Service** — 1 item, 9 work orders, 38 bills, USD 31,353.60 spent. A "Company Issued" row opens an empty profile (all contact fields "—").

### 8.3 Add Vendor  (`/inventory/vendors/new` · `AddVendorPage.tsx`)
Full page: "← Back to Vendors" · breadcrumb "Acme Trucking Inc. / Inventory / Vendors / Add Vendor" (carrier name hard-coded) · **Add Vendor** · **Cancel** · **✓ Save Vendor** (grey until a name is typed). Footer tip "Tip: Asset and driver assignments live on inventory items, not on the vendor itself."

| Section | Field | Type | Required | Placeholder / options |
|---|---|---|---|---|
| 1 Vendor Identity & Classification — "Who this vendor is and what services they provide." | Vendor Name * | text | **yes** (trimmed) | "e.g. Comdata" |
| | Company Name (Optional) | text | no | "e.g. Comdata Inc." |
| 2 Contact Information — "Primary point of contact at this vendor." | Contact Name | text | no | "e.g. Jane Smith" |
| | Email | email (not validated) | no | "contact@vendor.com" |
| | Phone | text | no | "(555) 555-0100" |
| 3 Vendor Address — "Primary business location." | Country | select | no | United States (default) · Canada — changing it clears the state |
| | Street Address | text | no | "1200 North Dupont Highway" |
| | Apartment, suite, etc. (Optional) | text | no | "(Optional)" |
| | City | text | no | "Wilmington" |
| | State / Province | select | no | "Select…" + 51 US codes incl. DC, or 13 Canadian codes |
| | ZIP Code / Postal Code | text | no | "19801" / "K1A 0B1" |

Save: the vendor is added at the top of the list (category "Others", status Active, this carrier) and the page returns to the list. No toast, no error messages.

### 8.4 Edit Vendor dialog  (row ⋮ → Edit · `VendorFormDialog.tsx`)
"Edit Vendor" · "Update vendor information below." · **Company Information**: Company Name * ("e.g. Fleet Maintenance Pro"), Contact Name ("e.g. John Doe"), Email ("contact@company.com"), Phone ("(555) 555-0000") · **Address**: Country ("Select country": USA / Canada), Unit / Suite ("Suite 100"), Street Address ("123 Main Street"), City, State/Province ("Select"), ZIP / Postal Code ("12345" / "A1A 1A1") · **Cancel** · **Save Changes**. The vendor's Name, Status and Category are not editable here — so a vendor can never be made Inactive from the UI. The whole sheet scrolls (header and footer scroll away).

---

## 9. Roles and visibility

Access comes from the role table in Users & Roles ▸ Roles (`DEFAULT_MENU_ACCESS`, overridable). Super Admin is always Full.

| Menu (key) | Admin | Fleet Admin | Safety Manager | User | Driver |
|---|---|---|---|---|---|
| Inventory (`inventory`) — every `/inventory/*` page incl. its Vendors tab | Full | Full | **Light** | Full | Hidden |
| Vendors (`vendors`) — `/vendors` | Full | Full | **Light** | Full | Hidden |

- **Full** — in the menu, every control works.
- **Light** — in the menu, with the "View only" strip. The Inventory pages read no role or read-only flag, so Add, Edit, Assign, Manage, Delete vendor and Share all still work (TO CONFIRM, §12).
- **Hidden** — not in the menu; the path shows the "Not in your menu" page.
- **Driver** — never sees the office pages. A driver's allowed paths are the Driver Mobile App, Messages, their own profile, Apply for Carrier and the **sign-form page**; their share of Inventory is the collection card in Messages, the "Collect from the office" screen in the app, and the receipt they sign.

---

## 10. Shared behaviours and storage

| Behaviour | Detail |
|---|---|
| Carrier scope | Every list, picker and count is the active carrier's; items and vendors carry the carrier (`accountId`). |
| Status | **Stored, not derived.** Seeded from the expiry date (expired < 0 days, Expiring Soon ≤ 30 days, else Active) and then set by hand on the form; the List KPIs, chips and groups read the stored value while the Drivers / Assets / holder pages count expiring / expired from the dates. |
| Handling vs assignment | *Handling* (the Driver / Asset ticks) says where an item **may** go; *assignment* (`assignedTo` = unit, `assignedDriverId` = person) says where it **is**. An item can be on a unit, on a person, on both or on neither. |
| Reserved items | On the Manage page an item already on another holder of the same kind is not offered; the List's Assign dialog can move it directly. |
| Monitoring feed | Items with an alert switched on appear on Compliance Monitoring (source pill "Inventory", priority from days left and reminders, link back to the item). The notification bell does not include inventory. |
| Activity | Every add, edit, assignment, message, signature and confirmation is logged on the item (role Office / Driver); "Added", "Assigned" and "Expired" entries are derived from the record. |
| Messages | Hand-outs and hand-backs are chat messages with a collection card; signed receipts are filed on the driver's compliance record (`onbform:` / `consent:` records) and open from Compliances & Documents. |
| Persistence (prototype) | localStorage: `inv_item_additions_v1` (new items), `inv_item_edits_v1` (changes over the seed), `inv_item_activity_v1` (trail), `messages:conversations:v3` (collection cards), `compliance-data-v3` (signed receipts). **In memory only** (lost on reload): vendors added / edited / deleted, categories, the sign-form hand-off. |
| Toasts | none in this section |

---

## 11. Not in the UI (left out on purpose, or missing)

- **Deleting an inventory item** — no delete exists anywhere (List, item page or store).
- **Import / export** of items or vendors.
- **Quantity** — a "box of gloves" is one row; there is no stock count.
- **Re-deriving status from dates** — status is a field the user sets.
- **Vendor status / category** — not editable after creation (Add Vendor files every new vendor under "Others", Active).
- The **holder preset add form** (`/inventory/drivers/:id/add`, `/inventory/assets/:id/add`) exists but nothing links to it.
- Dead code: `InventoryDriversPage.tsx`, `InventoryAssetsPage.tsx`, `carrier-vendors.data.ts`, `asset-inventory-bridge.ts`.

---

## 12. TO CONFIRM (open questions)

**Product behaviour**
1. **Light role (Safety Manager)** shows "View only" but every Inventory control still works. Should Add / Edit / Assign / Manage / Delete be disabled in light mode? (§9)
2. **Status** is chosen by hand and never recomputed. Should it be derived from the expiry date (≤ 30 days = Expiring Soon, past = Expired)? (§10)
3. **Item delete** does not exist. Needed (soft delete, keeping the activity trail)? (§11)
4. **KPI tiles on the List** do nothing when clicked, while the Drivers / Assets / Vendors tiles filter. Make them filters too? (§2.2)
5. **Categories** added, renamed or deleted in the modal are not saved and are ignored by the rail and the item form. Should they persist and drive both? (§2.9)
6. **"Company Issued" placeholder vendors** (36 per carrier) are listed on the Vendors tab. Hide them, as Maintenance and the asset form already do? (§8.1)
7. **Vendors** added, edited or deleted are kept in memory only, and a new vendor does not appear in the item form's Vendor list. Persist and share one vendor store? (§8)
8. **Vendor profile** shows the record as it was before an edit (it reads Maintenance's copy first), and its Edit / Share buttons are not shown. (§8.2)
9. **Vendor Name, Status and Category** cannot be edited, so no vendor can ever be made Inactive. (§8.4)
10. **Deleting a vendor** has no check for items or work orders still filed against it. Block, or reassign? (§8.1)

**Defects seen in code**
11. **Holder page title** shows the raw id ("DRV-001-0001") instead of the driver's name or unit number. (§5)
12. **A driver or unit holding nothing** opens the not-found page instead of an empty holder page. (§5)
13. **Unassigning a seeded item does not stick**: the stored patch drops `undefined` fields, so the seeded assignment comes back. Affects Unassign in the dialog, untick on the Manage page and a confirmed hand-back. (§2.8, §6)
14. **Item detail page does not show edits to seeded items** (it reads the seed without the edit overlay), although Save lands there. (§3.1)
15. **Item detail Category** comes from the vendor, not the item's own category. (§3.1)
16. **Edit with an unknown id** silently opens the Add form and creates a new item. (§3.2)
17. **Vendor profile Inventory tab** lists seeded items only (not items added in the app), and its rows open the List rather than the item. (§8.2)
18. **Edit Vendor dialog** stores Country as "USA" while the data uses "United States"; the whole sheet scrolls, so Save scrolls out of view. (§8.4)
19. **Add Vendor breadcrumb** always says "Acme Trucking Inc.". (§8.3)
20. **Holder share links** may not open the holder (only the List consumes record links). (§4)
21. **Top-bar title** reads "TrackSmart" on item and holder pages. (§0)

**Validation and data**
22. **Item form**: Category, Record name and Status are marked required but not enforced; no check that the expiry date is after the issue date; no uniqueness check on Number. Add these? (§3.2)
23. **Item form errors**: Save just stays disabled with no message. Show inline errors instead? (§3.2)
24. **Alert assignee** is shown on the item page when set, but nothing in the form sets it. (§3.1)
25. **Recurrence** ("Renews annually") is shown but nothing rolls the dates forward. Intended to auto-renew? (§3.1)
26. **No-carrier and empty-carrier states** could not be captured (every demo carrier has inventory). (§0)
27. **Vendor profile opened from Inventory** lives at `/maintenance/vendors/:id`, so the sidebar highlights **Maintenance**, not Inventory, and the top bar reads "Vendor". (§8.2)
