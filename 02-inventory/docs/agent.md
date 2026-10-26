# 02 – Inventory · Instructions for an AI coding agent

You are building or maintaining the **Inventory** section of TrackSmart. Read this file first, then [page-overview.md](page-overview.md) (what every screen does, field by field) and [design.md](design.md) (how it looks). The screenshots in [../screenshots/](../screenshots/index.md) are the visual truth; the walkthrough is [../video/inventory-walkthrough.mp4](../video/inventory-walkthrough.mp4). Where this file and the running app disagree, the app wins — report the difference.

---

## 1. Purpose

Inventory is the carrier's register of company property — fuel cards, toll transponders, ELDs, GPS units, dashcams, keys and gate cards, PPE, equipment, devices and documents — and of **who holds it**:

- **List** — every item, with its number, dates, status, and the unit and/or driver it is on.
- **Drivers / Assets** — the same inventory counted per person and per vehicle.
- **Manage inventory** — give items to, or take them back from, one driver or unit; for a driver this drafts and sends a collection / hand-back message with any forms to sign.
- **Driver side** — the driver ticks off what they collected (or handed back) and signs the receipt, which is filed on their compliance record.
- **Vendors** — the suppliers an item (or a work order) is filed against.

Every item can carry an **expiry alert** that feeds Compliance Monitoring. Everything is **scoped to one carrier** (the one in the top-bar switcher).

---

## 2. Tech stack

### 2.1 Current (the prototype you are maintaining)

| Layer | Choice |
|---|---|
| UI | React 19 + TypeScript 5.9, Vite 7, Tailwind CSS 4.1 (utilities only; `cn()` = clsx + tailwind-merge), lucide-react icons |
| Routing | A path string held in `App.tsx` state (`handleNavigate`) — not react-router routes. New pages are `if (path === …)` / regex branches in `App.tsx`. The browser URL does not change. |
| Data | Seed generated per carrier at module load (`inventory.data.ts`) + localStorage overlays (`inventory-store.ts`, `inventory-activity.ts`) + the shared `messages-store` and `compliance-data-store`. Vendors are an **in-memory** store (`src/data/vendorsStore.ts`). No backend. |
| Auth / roles | `src/data/users.data.ts`; menu access table `src/pages/users-roles/roles.data.ts` (`inventory`, `vendors` keys); gate in `App.tsx` (hidden → "Not in your menu", light → "View only" strip). |
| Build / check | `npx tsc -b` **and** `npx vite build` — both must pass (`tsc --noEmit` checks nothing here: the root tsconfig is a solution file). |

### 2.2 Target (what the documentation brief asks the rebuild to use)

**ASSUMPTION — TO CONFIRM with the product owner:** the React + TypeScript front end as above, a **Node.js (Express or Fastify) REST API**, and **MongoDB** with the collections in [../data/schema.md](../data/schema.md) (Step 7). Keep the store modules (`inventory-store.ts`, `vendorsStore.ts`, `inventory-activity.ts`, `inventory-collection.ts`) as the only code that talks to the API, so the pages do not change.

---

## 3. File / component structure

### 3.1 What exists today (`src/pages/inventory/` unless noted)

```
Routed pages
  InventoryListPage.tsx        /inventory — List tab (KPIs, category rail, filters, table, Assign dialog, Categories, Share)
  InventoryItemDetailPage.tsx  /inventory/items/:id — Information · Monitoring · Activity
  AddInventoryItemPage.tsx     /inventory/items/new · /inventory/items/:id/edit · /inventory/(drivers|assets)/:id/add
  InventoryHoldersPage.tsx     /inventory/drivers · /inventory/assets (kind = driver | asset)
  HolderDetailPage.tsx         /inventory/(drivers|assets)/:id — Overview · Inventory · Monitoring · Activity
  AssignInventoryPage.tsx      /inventory/(drivers|assets)/:id/assign — Manage inventory wizard
  VendorsListPage.tsx          /inventory/vendors and /vendors (standalone)
  AddVendorPage.tsx            /inventory/vendors/new and /vendors/new
  CollectionFormPage.tsx       /inventory/sign-form — driver signs a receipt
Components
  InventoryTabs.tsx · InventoryKpi.tsx · TablePager.tsx · inventory-visuals.ts (category icon + palette)
  InventoryItemFields.tsx (the item form sections) · AssignItemDialog.tsx · AssignmentTargetPicker.tsx
  HolderInventoryPanel.tsx (also embedded in the driver profile and the asset record)
  ItemPickList.tsx · MovementNotify.tsx · MovementForms.tsx (Manage inventory)
  InlineFormFill.tsx · FiledFormViewer.tsx (sign / read back a receipt)
  VendorsTable.tsx · VendorFormDialog.tsx · VendorPage.tsx (rendered by Maintenance for /maintenance/vendors/:id)
  VendorCategoriesModal.tsx ("Item Category")
Data / logic
  inventory.data.ts            types, VENDOR_CATEGORIES, VENDORS, seed items, handling / assignment readers, monitoring adapter
  inventory-store.ts           additions + edits overlays; currentInventoryItems(); useInventoryAdditions()
  inventory-assignment.ts      driver / asset resolvers, Assigned / Available predicates, date helpers
  inventory-rollup.ts          per-driver / per-asset pivots, assignableTo(), totals
  inventory-activity.ts        per-item event log + derived trail + describeChanges()
  inventory-movements.ts       movement vocabulary → message plans
  inventory-collection.ts      collection / hand-back cards in the driver chat; confirmCollection()
  inventory-forms.ts           forms on hand-outs; filed as compliance versions (onbform: / consent: record ids)
  collection-signing.ts        signAndSettle(); collection-form-handoff.ts (one-shot hand-off to /inventory/sign-form)
  notify-state.ts              the "tell them" draft state
  src/data/vendorsStore.ts     vendors (in memory)
  src/pages/messages/InventoryCollectionCard.tsx   the card in Messages
Dead (do not extend; remove after confirming): InventoryDriversPage.tsx, InventoryAssetsPage.tsx,
  carrier-vendors.data.ts, src/pages/assets/asset-inventory-bridge.ts
```

### 3.2 What to create for the target build

```
server/
  routes/inventory-items.ts      §5.1
  routes/inventory-categories.ts §5.2
  routes/vendors.ts              §5.3
  routes/inventory-holders.ts    §5.4  (read models over items + Account's drivers / assets)
  routes/inventory-movements.ts  §5.5  (manage: assign / unassign + messages)
  routes/inventory-collections.ts §5.6 (driver confirm / sign)
  services/inventory-status.ts   derive status from expiryDate (≤ 30 days = Expiring Soon, < 0 = Expired)
  services/inventory-alerts.ts   the Monitoring feed (same rules as monitoring-sources.ts inventoryAlerts)
  models/*.ts                    one per collection in data/schema.md
src/pages/inventory/
  inventory-api.ts               the only client of the API; inventory-store.ts and vendorsStore.ts call it
```

---

## 4. Behaviour you must preserve

1. **Carrier scope.** Every read and write is for the active carrier. An item, vendor, category, event and collection belongs to exactly one carrier.
2. **Handling vs assignment.** *Handling* (`driver-returnable`, `asset-removable`; at least one) says where an item **may** go; *assignment* (`assignedTo` = unit, `assignedDriverId` = person) says where it **is**. Both fields are independent: unit only, person only, both, or neither. Pickers only offer what the handling allows.
3. **Reserved items.** Manage inventory offers only items with no holder of that kind; the List's Assign dialog may move an item directly between holders.
4. **Status.** Today it is stored and chosen by hand; the target derives it from the expiry date (TO CONFIRM, page-overview §12 #2). Either way the List KPIs, chips and groups, the holder counts and Monitoring must agree.
5. **Monitoring feed.** An item with an enabled alert appears on Compliance Monitoring: id `inventory:<itemId>`, source "Inventory", subject = assigned driver, else unit, else the carrier; priority from days left and the item's reminders (default 90 / 30 / 7); link back to the item.
6. **Activity trail.** Log every create, update (with a field-by-field change list), assignment, unassignment, message sent, receipt requested, receipt signed, collection confirmed / not collected, hand-back confirmed. "Added", "Assigned" and "Expired" entries are derived from the record and never stored.
7. **Messages.** Assigning to a driver from Manage inventory sends a **collect** card (unless switched off); unassigning sends a **hand-back** card (always). A unit is never messaged. The List's Assign dialog sends nothing. Cards are chat messages in the driver's conversation; every copy of a card settles together.
8. **Receipts.** A collect card may carry forms (default: Uniform & Equipment Issue Receipt). Signing files a version on the driver's compliance record (`onbform:<defId>` or `consent:<defId>`, tag "Filled in system", the item list in the notes and in `formData.lines`). Signing the last form confirms the collection.
9. **Hand-back confirmation** clears `assignedDriverId` for the ticked items (the unit assignment stays).
10. **No item delete** today. If you add one, make it soft (keep the trail and any filed receipts).
11. **Categories.** One list of 12 built-ins; a category in use cannot be deleted.
12. **Vendors.** Deleting asks first; records that already name the vendor keep their reference.
13. **Navigation.** Saving an item returns to the List (add) or the item page (edit); Manage inventory returns to its tab; nothing shows a toast.

---

## 5. API (target build)

All routes are under `/api/carriers/:carrierId/…`, require an authenticated session, and check the caller's access to the carrier and their role's access to the `inventory` menu (`full` for writes, `light` or `full` for reads). Errors use `{ error: { code, message, field? } }` with HTTP 400 (validation), 401 (no session), 403 (no access / view-only), 404 (not found or another carrier's), 409 (conflict), 422 (rule broken).

### 5.1 Items
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/inventory/items` | query: `q`, `categoryId`, `assignment=assigned\|available`, `status`, `groupBy`, `sort`, `page`, `pageSize` (8/15/25/50) | `{ items: InventoryItem[], total, kpis: { total, active, expiringSoon, expired, unassigned }, categoryCounts }` | 403 |
| GET | `/inventory/items/:itemId` | — | `InventoryItem` + `vendor` + resolved `asset` / `driver` | 404 |
| POST | `/inventory/items` | `{ vendorId, categoryId?, handling[], name?, serial, pin?, issueDate, expiryDate?, status?, monitoring? }` | `201 InventoryItem` | 400 `serial` / `issueDate` / `vendorId` required; 422 `expiryDate` before `issueDate`; 409 duplicate `serial` (TO CONFIRM) |
| PATCH | `/inventory/items/:itemId` | any subset of the POST body | `InventoryItem` (+ event "Item updated — n changes") | 400, 404, 422 |
| GET | `/inventory/items/:itemId/activity` | — | `InventoryEvent[]` (derived + stored, newest first) | 404 |

### 5.2 Categories
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/inventory/categories` | — | `{ id, name, description?, itemCount }[]` | — |
| POST | `/inventory/categories` | `{ name, description? }` | `201 Category` | 400 "Category name is required."; 409 `A category named "{name}" already exists.` (case-insensitive) |
| PATCH | `/inventory/categories/:id` | `{ name?, description? }` | `Category` | 400, 409 |
| DELETE | `/inventory/categories/:id` | — | `204` | 409 `{ items: [first 4 names], count }` when in use |

### 5.3 Vendors
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/vendors` | query: `q`, `status`, `groupBy`, `sort`, `page`, `pageSize`, `includeCompanyIssued=false` | `{ vendors, total, kpis: { total, active, inactive } }` | — |
| GET | `/vendors/:vendorId` | — | `Vendor` + `{ itemCount, workOrderCount, billCount, totalsByCurrency, lastJobAt }` | 404 |
| POST | `/vendors` | `{ name, companyName?, contactName?, email?, phone?, address?: { country, street, apt, city, state, zip }, categoryId?, status? }` | `201 Vendor` | 400 `name` required; 400 invalid `email`; 400 `state` not in the country's list |
| PATCH | `/vendors/:vendorId` | any subset | `Vendor` | 400, 404 |
| DELETE | `/vendors/:vendorId` | — | `204` | 409 when items or open work orders still reference it (TO CONFIRM — today it is not blocked) |

### 5.4 Holders (read models)
| Method | Route | Response |
|---|---|---|
| GET | `/inventory/holders?kind=driver\|asset&q&filter=all\|with\|without\|expiring\|expired&driverType&groupBy&page` | `{ rows: HolderRow[], totals: { holders, withItems, none, expiring, expired, unwatched } }` — every roster driver / fleet unit, including those holding nothing |
| GET | `/inventory/holders/:kind/:holderId` | `{ holder: { id, label, sub, status }, items: HeldItem[], watched: [...], activity: InventoryEvent[] }` — **404 only when the driver / unit does not exist**, never because it holds nothing |
| GET | `/inventory/holders/:kind/:holderId/assignable` | items this holder could be given (`assignableTo` rules) |

### 5.5 Movements (Manage inventory and the Assign dialog)
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| POST | `/inventory/items/:itemId/assignment` | `{ assetId?: string\|null, driverId?: string\|null }` (null = take off) | `InventoryItem` + event | 422 target not allowed by handling; 404 unknown target |
| POST | `/inventory/holders/:kind/:holderId/movements` | `{ add: itemId[], remove: itemId[], notify: { collect: boolean, counterparty: { kind: "office"\|"person", name? }, dueAt?, formIds: string[], notes: { [planKey]: string } } }` | `{ items: InventoryItem[], collections: InventoryCollection[] }` | 409 an item in `add` already has a holder of that kind; 422 an item in `remove` is not on this holder |

Unassign must **remove** the field (`$unset` or `null`), not write `undefined` — the prototype loses unassignments of seeded items this way (page-overview §12 #13).

### 5.6 Collections (driver side)
| Method | Route | Request | Response | Errors |
|---|---|---|---|---|
| GET | `/me/inventory-collections` | — (driver session) | the driver's pending and settled cards | 403 not a driver |
| POST | `/inventory-collections/:id/confirm` | `{ itemIds: string[] }` | the settled card (+ item events; a hand-back clears the driver) | 409 already settled; 403 not this driver |
| POST | `/inventory-collections/:id/forms/:defId/sign` | `{ itemIds, values, signatures: { [signerId]: dataUrl \| typedName } }` | `{ card, remainingForms }` (+ compliance version filed; the last form confirms the card) | 400 no signature / no items ticked; 409 already signed |

---

## 6. Validation and security rules

- **Auth required** on every route; the session decides the carrier list and the role per carrier (roles are per carrier).
- **Role gate:** `inventory` menu — Admin / Fleet Admin / User full, Safety Manager **light**, Driver hidden; Super Admin always full. **Enforce light on the server** (reject writes with 403) and disable the controls in the UI — today the prototype only shows a banner (page-overview §12 #1).
- **Drivers** may call only `/me/inventory-collections` and the confirm / sign routes for **their own** cards.
- **Item:** `vendorId` must be one of the carrier's vendors; `serial` trimmed, 1–64 chars; `issueDate` required, ISO date; `expiryDate` optional, ≥ `issueDate`; `handling` non-empty subset of the two values; `assignedDriverId` only when `driver-returnable` is in `handling`; `assignedTo` only when `asset-removable` is; `monitoring.reminders` ⊆ {90, 60, 45, 30, 15, 7, 0}; `monitoring.basis = "expiry"` requires an `expiryDate`.
- **PIN** values are secrets for fuel cards and gate cards: return them only to full-access roles, never in share payloads or logs (ASSUMPTION — TO CONFIRM; the prototype shows them to everyone).
- **Vendor:** `name` trimmed, required; `email` valid if present; `state` in the country's list; `country` stored as "United States" / "Canada" (the prototype's edit dialog writes "USA").
- **Category:** `name` required, unique per carrier (case-insensitive); delete blocked while any item resolves to it.
- **Signatures:** store the image or typed name with signer, timestamp and IP / device; the filed version is immutable.
- **Rate limits:** 60 writes / minute / user on inventory routes; 10 sign attempts / minute / driver.
- **Audit:** every write produces an `InventoryEvent` with `by` (user id + name) and `role`.

---

## 7. Do's and don'ts

**Do**
- Read items through one function (`currentInventoryItems` today, `inventory-api` later) so seed, additions and edits are always merged the same way.
- Use the readers `itemHandlings`, `goesToDriver`, `goesToAsset`, `itemDriverId`, `itemAssetAssignment`, `assignmentOf`, `itemCategoryId`, `itemName` — never the raw fields (three historical shapes exist).
- Reuse the shared UI: `ListPageHeader`, `KpiStatCard` / `KpiTile`, `ListChrome` (`SortTh`, `ColumnPicker`, `FilterSelect`, `TableGroupBand`), `TablePager`, `KebabMenu` / `RowActions`, `ShareToChat`, `WizardEditor`, `ActivityTimeline`, `MonitoringToggle`.
- Keep the List, holder pages, Monitoring and profile insights reading the same status and assignment.
- Run `npx tsc -b` and `npx vite build` after every change.

**Don't**
- Don't message a unit, and don't send anything from the List's Assign dialog.
- Don't let an item be on two drivers or two units at once.
- Don't write `undefined` into a persisted patch to clear a field.
- Don't show the "Company Issued" placeholder vendors anywhere a user picks a real supplier.
- Don't add toasts — the section's pattern is "land on the page where the change shows".
- Don't extend the dead files listed in §3.1.

---

## 8. Acceptance checklist

The agent may say "done" only when every line is true:

- [ ] `npx tsc -b` and `npx vite build` pass.
- [ ] List: 5 KPIs, category rail with counts, search, All / Assigned / Available chips, Group by (Assignment, Status, Category, Vendor), Columns, Reset, sortable headers, pager 8/15/25/50 — matches [list-default](../screenshots/desktop/list/list-default-desktop.png).
- [ ] Row click opens the item page; ✎ opens Edit; ⋮ has Assign / Change assignment and Share to chat.
- [ ] Assign dialog shows only the blocks the item's handling allows; Save disabled until something is picked; Unassign only when assigned; **unassigning a seeded item sticks after a reload**.
- [ ] Item page: Information, Monitoring (on / off / no-expiry variants), Activity; **an edit to a seeded item is visible on the item page**.
- [ ] Add / Edit item: required Vendor, Number, Issue date; the alert block with all its options and the no-expiry warning; Save lands on the List (add) / item page (edit) and logs the event.
- [ ] Drivers / Assets tabs: every roster holder listed, KPI tiles filter, driver-type chips, Group by, row menu, legend.
- [ ] Holder page: **title is the driver's name / unit number**; a holder with nothing shows an empty Inventory tab, not "no longer here".
- [ ] Manage inventory: tick / untick; Driver Notification (collect switch, forms, office / somebody else, by when, editable drafts); confirmation lists going on / coming off / who gets told; save writes assignments, events and cards.
- [ ] Driver seat: card is live, sign-form requires a signature and at least one ticked item, signing files the receipt and settles the card; hand-back confirm clears the driver.
- [ ] Vendors: list, KPIs as filters, search, Group by, Columns, Share / Edit / Delete with confirmation, profile tabs, Add Vendor validation.
- [ ] Categories: add / edit / delete with both error messages and the in-use block.
- [ ] Light role cannot change anything (UI disabled **and** server 403); hidden role gets "Not in your menu".
- [ ] Inventory alerts appear on Compliance Monitoring with source "Inventory" and link back to the item.
- [ ] Mobile 390 px: no page-level horizontal scroll; tables scroll inside their card with Actions pinned — matches [list-default-mobile](../screenshots/mobile/list/list-default-mobile.png).
