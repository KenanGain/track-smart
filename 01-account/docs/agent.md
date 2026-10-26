# 01 – Account · Instructions for an AI coding agent

Read this before touching the Account section. It says what the section is for, what it is built with, where every piece lives, what the API must do, which rules are not negotiable, and the checklist you must pass before you say "done". The behaviour you are implementing is specified field by field in [page-overview.md](page-overview.md); the look in [design.md](design.md); the data in [../data/schema.md](../data/schema.md).

---

## 1. Purpose

**Account** (`/account/profile`, sidebar item #1) is the carrier's fleet profile: one carrier, four sections.

| Section | Answers |
|---|---|
| Fleet Overview | Who is this carrier legally (USDOT / CVOR / NSC, authority, addresses, officers, cargo) and how big is it? |
| Yard Terminals | Where does it park, and how secure is each yard? |
| Assets | Every truck, trailer and non-CMV vehicle: plate, ownership, status, compliance, and the door into the unit's full record. |
| Drivers | Everyone on the roster: status, licence, compliance, and the door into the driver's full file. |

Everything in Account is **scoped to one carrier** (the one chosen in the top-bar switcher or the user's own). Other modules (Compliance, Monitoring, Maintenance, Tickets…) read the assets and drivers created here; Account is their source of truth for *who* and *what* exists.

---

## 2. Tech stack

### 2.1 Current (the prototype you are maintaining)

| Layer | Choice |
|---|---|
| UI | React 19.2 + TypeScript 5.9, Vite 7, Tailwind CSS 4.1 (utilities only; `cn()` = clsx + tailwind-merge), lucide-react icons, react-hook-form + zod (asset wizard), xlsx (driver import) |
| Routing | A path string held in `App.tsx` state (`handleNavigate`), **not** react-router routes, even though react-router-dom is installed. New pages are added as `if (path === …)` branches in `App.tsx`. |
| Data | Module-level stores backed by `localStorage` and `window` events, read with `useSyncExternalStore`. Seed data is generated per carrier from `accounts.data.ts`. There is **no backend**. |
| Auth / roles | `src/data/users.data.ts`, `src/pages/users-roles/roles.data.ts` (menu access table), `AccessGate.tsx` (hidden / light / full). Demo sign-in only. |
| Build / check | `npx tsc -b` (type-check; the root tsconfig is a solution file, so `tsc --noEmit` checks nothing) and `npx vite build` (catches missing exports that tsc does not). Both must pass. |

### 2.2 Target (what the documentation brief asks the rebuild to use)

**ASSUMPTION — TO CONFIRM with the product owner:** React + TypeScript front end as above, a **Node.js (Express or Fastify) REST API**, and **MongoDB** with the collections in [../data/schema.md](../data/schema.md). Section 5 defines that API. Keep the front-end store modules as the single place that calls it, so the pages do not change.

---

## 3. File / component structure

### 3.1 What exists today

```
src/
├── App.tsx                                  path === "/account/profile" → <CarrierProfilePage>; "/account/locations" → <LocationsPage>
├── data/
│   ├── sidebar.data.ts                      { key: "account", label: "Account", path: "/account/profile" }
│   ├── users.data.ts · role-test-users.data.ts
│   └── license-classes.data.ts             LICENSE_CLASS_VALUES used by the driver form
├── pages/
│   ├── profile/
│   │   ├── CarrierProfilePage.tsx           the page: header, 4 tabs, Fleet Overview cards + modals, Drivers tab (list, import, add, status), delete flows, toasts
│   │   ├── carrier-profile.data.ts          UI_DATA (edit-modal field definitions), DIRECTOR_UI, OFFICE_LOCATIONS, cargo mapping, MOCK_DRIVERS
│   │   ├── DriverComponents.tsx             DriverStatusSelect (+ DRIVER_STATUSES), small form pieces
│   │   ├── DriverImportModal.tsx            CSV/XLSX import (IMPORT_COLUMNS = accepted headers)
│   │   ├── AddDriverApplication.tsx         Add/Edit Driver = ApplicationFormView in "page" mode
│   │   ├── driver-application-map.ts        Driver ⇄ ApplicationData mapping
│   │   └── DriverProfileView.tsx            driver profile page (header, tiles, 13 tabs)
│   ├── assets/
│   │   ├── AssetDirectoryPage.tsx           Assets tab: KPI tiles, sub-tabs, table/cards, inline status, row menu, share, delete
│   │   ├── AssetModal.tsx                   Add/Edit Asset full-screen wizard (zod `assetSchema`, 9 sections)
│   │   ├── AssetDetailView.tsx              asset detail page (header, tiles, 11 tabs)
│   │   └── assets.data.ts                   Asset type, INITIAL_ASSETS, USA_STATES, CANADA_PROVINCES, MOCK_YARDS
│   ├── accounts/
│   │   ├── accounts.data.ts                 ACCOUNTS_DB (carriers)
│   │   ├── carrier-assets.data.ts           getAssetsForAccount / getAssetById / addCarrierAsset / updateCarrierAsset (patch store `ts_carrier_asset_patches_v1`, ASSETS_CHANGED_EVENT)
│   │   └── carrier-drivers.data.ts          getDriversForAccount / getDriverById / addCarrierDriver / updateCarrierDriver / removeCarrierDriver (patch store `carrier-driver-patches`, DRIVERS_CHANGED_EVENT)
│   ├── account/
│   │   ├── LocationsPage.tsx                Yard Terminals (also standalone at /account/locations)
│   │   ├── locations.data.ts                Location types, LOCATIONS_UI (filters, modal copy), INITIAL_LOCATIONS_DATA
│   │   └── EmptyCarrierProfile.tsx          "No carrier profile yet"
│   └── hiring-process/ApplicationSettingsPage.tsx   ApplicationFormView (the 15-section driver form; shared with hiring)
└── components/
    ├── ui/ListPageHeader.tsx · use-condensing-header.ts · SubTabs.tsx · TabScroller.tsx · ProfileTabs.tsx
    ├── ui/KpiStatCard.tsx (KpiStatRow) · KpiChipStrip.tsx
    ├── ui/ListChrome.tsx (SortTh, ColumnPicker, TableGroupBand, TablePager, useTableSort) · DataListToolbar.tsx (PaginationBar)
    ├── ui/KebabMenu.tsx · RowActions.tsx (Open / Edit / Share to chat / Delete, with the confirm)
    ├── ui/WizardEditor.tsx (WizardHeader, WizardStepNav, WizardSection)
    ├── ui/UploadZone.tsx · MonitoringToggle (pages/compliance)
    ├── share/ShareToChat.tsx · ShareButton.tsx · share-payloads.ts (assetSharePayload, driverSharePayload, locationSharePayload)
    ├── locations/LocationEditorModal.tsx (yard editor + office-location editor) · LocationViewModal.tsx
    └── key-numbers/KeyNumberModal.tsx (legacy; reachable only from dead code)
```

### 3.2 What to create for the target build

```
server/
├── src/routes/carriers.ts      §5.1 carrier profile, office locations, directors, cargo
├── src/routes/yards.ts         §5.2
├── src/routes/assets.ts        §5.3
├── src/routes/drivers.ts       §5.4 (incl. import)
├── src/models/*.ts             one per collection in data/schema.md
├── src/middleware/auth.ts      session → user; carrier scope; role → menu access
└── src/validation/*.ts         zod schemas shared with the client (copy `assetSchema` from AssetModal.tsx; add driver, yard, director, office schemas)
src/api/account.ts              typed fetch wrappers; the only module the stores import
```

Keep the page components; swap the inside of the store modules (`carrier-assets.data.ts`, `carrier-drivers.data.ts`, `carrier-profile.data.ts`, `locations.data.ts`) to call `src/api/account.ts` and cache the result. The `window` events and `useSyncExternalStore` contract stay, so nothing above the stores changes.

---

## 4. Behaviour you must preserve

These come from the product owner's own corrections during development. Treat them as requirements.

1. **Lists are one line per row**, truncated with a `title` tooltip. Never let a row grow to two lines.
2. **Every row action lives in the ⋮ menu** (`RowActions` → `KebabMenu`): Open · Edit · Share to chat · (module extras) · **Delete last and red**. Never a bare pencil + bin pair.
3. **Status is changed inline** with the pill select (`AssetStatusSelect`, `DriverStatusSelect`), saved immediately, confirmed with a toast. Also on the detail page header.
4. **Full-page forms wear the Wizard chrome** (`WizardHeader` + `WizardStepNav` + `WizardSection`): Add/Edit Asset, Add/Edit Driver. Modals keep header and footer in view; only the middle scrolls.
5. **One "Share to chat" button** (`ShareButton`) next to Edit on every record page; the dialog is `ShareToChat` fed by `share-payloads.ts`.
6. **Preserve existing UI when fixing a requirement** — change only what the requirement targets; do not restyle neighbours.
7. **Build only what the current request asks**; no speculative tabs or sections.
8. **Add Driver reuses the application form** (`ApplicationFormView`, page mode) so hiring and Account capture the same data; the driver-type picker drives US/Canada labels and the 8/14-day Hours-of-Service window.
9. **Asset wizard "Other" vehicle type** stores the typed name as the vehicle type itself.
10. **KPI tiles filter their own list**; clicking the active tile (or Total) clears the filter.
11. Carrier scope: a user only ever sees the carriers `canOpenCarrier` allows; the page shows `EmptyCarrierProfile` when none applies.
12. Headers condense on scroll (`useCondensingHeader`); the body is its own scroller with `[overflow-anchor:none]`; never pad a page out to keep a fold.

---

## 5. API (target build)

All routes are under `/api/v1`, JSON in and out, and require a session (cookie or bearer). Every request is checked against the caller's carrier scope: `:carrierId` must be one the user can open, otherwise **403**. Errors use one shape:

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "VIN must be 17 characters", "fields": { "vin": "Must be 17 characters" } } }
```

Codes: `UNAUTHENTICATED` 401 · `FORBIDDEN` 403 (scope or light/hidden access) · `NOT_FOUND` 404 · `VALIDATION_FAILED` 422 · `CONFLICT` 409 (duplicate unit number / VIN / email) · `RATE_LIMITED` 429.

### 5.1 Carrier profile (Fleet Overview)

| Method | Route | Body / query | Response |
|---|---|---|---|
| GET | `/carriers/:carrierId` | — | `Carrier` (identity, authority, addresses, fleetCounts, cargo, officeLocations[], directors[], riskScore) |
| PATCH | `/carriers/:carrierId/identity` | any of `dotNumber, safetyRegType, safetyRegNumber, rinNumber, legalName*, dbaName, businessType*, stateOfInc*, extraProvincial, status*` | updated `Carrier` |
| PATCH | `/carriers/:carrierId/authority` | `operationClassification[], carrierOperation[], hazmatOperation[], fmcsaAuthorityTypes[]` (values from the option lists in page-overview §2.2) | updated `Carrier` |
| PATCH | `/carriers/:carrierId/addresses` | `{ legal: Address, mailing: MailingAddress }` (mailing fields all required) | updated `Carrier` |
| PATCH | `/carriers/:carrierId/fleet-counts` | `{ powerUnits*, drivers*, nonCmv }` integers ≥ 0 | updated `Carrier` |
| PUT | `/carriers/:carrierId/cargo` | `{ cargoTypes: string[] }` (labels from the MCS-150 list; mapped server-side to cargo families) | updated `Carrier` |
| POST | `/carriers/:carrierId/office-locations` | `{ label*, address*, contact*, phone*, hours?: { weekdays, saturday, sunday } }` | `OfficeLocation` 201 |
| PATCH / DELETE | `/carriers/:carrierId/office-locations/:id` | same fields / — | `OfficeLocation` / 204 |
| POST | `/carriers/:carrierId/directors` | `{ name*, roleTitle, email*, phone*, stockClass, ownershipPct* (0–100), dateAppointed, dateResigned, responsibility }` | `Director` 201 |
| PATCH | `/carriers/:carrierId/directors/:id` | same | `Director` |
| POST | `/carriers/:carrierId/identity/dot-lookup` | `{ dotNumber }` | SAFER fields to prefill (TO CONFIRM: real FMCSA SAFER integration or stub) |

### 5.2 Yard terminals

| Method | Route | Body / query | Response |
|---|---|---|---|
| GET | `/carriers/:carrierId/yards` | `?search=&status=All|Active|Maintenance|Deactivated&security=` | `{ groups: [{ name, items: Yard[] }] }` |
| POST | `/carriers/:carrierId/yards` | `{ name*, locationId, address: { street, city, state, zip }, timezone, status, security: { fenced, gated, cctv, guard, restricted } }` | `Yard` 201 (server computes `score` 0–100) |
| GET / PATCH / DELETE | `/carriers/:carrierId/yards/:id` | — / same / — | `Yard` / `Yard` / 204 |

### 5.3 Assets

| Method | Route | Body / query | Response |
|---|---|---|---|
| GET | `/carriers/:carrierId/assets` | `?category=all|CMV|Non-CMV&status=&search=&sort=unitNumber|dateAdded|…&dir=asc|desc&page=1&pageSize=10` | `{ items: Asset[], total, counts: { total, active, maintenance, outOfService, draft, deactivated } }` |
| POST | `/carriers/:carrierId/assets` | the `assetSchema` payload (page-overview §4.2) | `Asset` 201 — also files the bill-of-sale document when present |
| GET | `/carriers/:carrierId/assets/:id` | — | `AssetDetail` (asset + driverAssignments + monitoring summary + compliance counts) |
| PATCH | `/carriers/:carrierId/assets/:id` | partial `assetSchema` | `Asset` |
| PATCH | `/carriers/:carrierId/assets/:id/status` | `{ status: Active|Maintenance|Out of Service|Draft|Deactivated, dateRemoved?, insuranceRemovedDate? }` | `Asset` |
| DELETE | `/carriers/:carrierId/assets/:id` | — | 204 (refuse with 409 if the unit is on an open work order or hand-over; TO CONFIRM) |
| POST | `/carriers/:carrierId/assets/:id/share` | `{ delivery: in-app|external|email, to, subject, message, documentIds[] }` | `{ conversationId }` |
| GET | `/carriers/:carrierId/assets/export` | same filters as the list | CSV (TO CONFIRM — Export is a no-op today) |

### 5.4 Drivers

| Method | Route | Body / query | Response |
|---|---|---|---|
| GET | `/carriers/:carrierId/drivers` | `?status=All|Active|Inactive|On Leave|Terminated&search=&sort=&dir=&page=&pageSize=` | `{ items: Driver[], total, counts: { total, active, inactive, onLeave, terminated } }` |
| POST | `/carriers/:carrierId/drivers` | `ApplicationData` (the 15-section form, page-overview §5.3) + `driverType` | `Driver` 201 — also files travel documents as compliance records |
| GET | `/carriers/:carrierId/drivers/:id` | — | `DriverDetail` (driver + application + tiles + tab counts) |
| PATCH | `/carriers/:carrierId/drivers/:id` | partial `ApplicationData` | `Driver` |
| PATCH | `/carriers/:carrierId/drivers/:id/status` | `{ status: Active|On Leave|Inactive|Terminated }` | `Driver` |
| DELETE | `/carriers/:carrierId/drivers/:id` | — | 204 (TO CONFIRM: soft-delete to keep compliance history) |
| POST | `/carriers/:carrierId/drivers/import` | multipart CSV/XLSX; headers matched case/space-insensitively to `IMPORT_COLUMNS` | `{ created: number, skipped: [{ row, reason }] }` |
| POST | `/carriers/:carrierId/drivers/:id/share` | as assets | `{ conversationId }` |
| GET | `/carriers/:carrierId/drivers/export` | filters | CSV (TO CONFIRM) |

### 5.5 Access

| Method | Route | Response |
|---|---|---|
| GET | `/me` | `{ user, role, carriers: [{ id, name, access: full|light }] }` — drives the carrier switcher, the view-only strip and the hidden menu |

---

## 6. Validation and security rules

**Authentication.** Every Account route requires a signed-in user. Unauthenticated → 401 and the client shows the login page.

**Authorisation.** Menu access per role (defaults in `roles.data.ts`; editable in Users & Roles ▸ Roles): Super Admin, Admin, Fleet Admin = **full**; Safety Manager, User = **light**; Driver = **hidden**. Enforce on the server, not only in the UI: *light* may call GET only and gets 403 on writes; *hidden* gets 403 on everything under `/carriers/:id/*` for Account. The client additionally hides the menu (hidden) or shows the "View only" strip (light). **TO CONFIRM:** whether light should also disable the edit controls in the UI (today they are rendered).

**Carrier scope.** `:carrierId` must be in `GET /me`'s carrier list. Super Admin sees all; Admin only the carriers under their service profile; Fleet Admin / Safety Manager / User only their assignments.

**Field validation** (server and client, same zod schemas):

- Asset: `unitNumber` required, unique per carrier; `vin` exactly 17 chars, unique per carrier; `make`, `model` required; `year` 1900 … current+2; `dateAdded` required; `insuranceAddedDate` required when status is Active; `odometer` required and ≥ 0; `dateRemoved` required when Deactivated; `notes` ≤ 2000 chars; driver assignment rows need `driverId` + `startDate`, max 2 rows.
- Driver: first and last name required; email, when present, RFC-5322 shape and unique per carrier; dates `YYYY-MM-DD`; licence class from `LICENSE_CLASS_VALUES`; status from the four allowed values; `driverType` from the three driver types. **TO CONFIRM:** which further fields block Save (today none do).
- Director: `name`, `email`, `phone`, `ownershipPct` (0–100) required. Office location: `label`, `address`, `contact`, `phone` required. Mailing address: all five fields required. Yard: `name` required; `security` booleans.
- Import: reject files over 5 MB or 2,000 rows; report per-row reasons; never partially apply a row.

**Passwords / re-authentication.** Account does not manage passwords (that is Settings ▸ Users & Roles); apply the app-wide rule there. **Require a fresh re-authentication (within 5 min) for destructive writes in Account:** deleting a driver, deleting an asset, deleting a yard, changing a driver's status to Terminated. ASSUMPTION until confirmed; today only a `confirm()` dialog guards them.

**Rate limits (proposed):** 60 writes / minute / user on Account routes; 5 imports / hour / carrier; 10 DOT lookups / minute / carrier.

**Personal data.** Drivers and directors are people: never log request bodies containing their SSN/SIN, licence numbers or dates of birth; the `share` endpoints must only attach documents the caller can read. Screenshots and recordings for documentation are taken against fictional demo data only and are not masked; never capture a real customer's data.

**Audit.** Every write under `/carriers/:id/*` appends an activity entry (who, what, when, before/after) — the Activity tabs on asset and driver pages read it.

---

## 7. Do's and don'ts

**Do**
- Use the shared chrome: `ListPageHeader`, `SubTabs`/`TabScroller`, `KpiStatRow`, `ListChrome` (sort, columns, pager, group bands), `RowActions`/`KebabMenu`, `WizardEditor`, `ShareButton`/`ShareToChat`, `UploadZone`, `MonitoringToggle`. Never hand-roll a table pager, a kebab menu or a share button.
- Keep every lookup in `<main>`-scoped components and every dialog/menu in a portal (`createPortal`), positioned `fixed`, so cards with `overflow-hidden` cannot clip them.
- Scope everything by `accountId`; read through `getAssetsForAccount` / `getDriversForAccount`, write through `addCarrierAsset` / `updateCarrierAsset` / `addCarrierDriver` / `updateCarrierDriver` / `removeCarrierDriver`, and dispatch the `*_CHANGED_EVENT` so other modules re-render.
- Verify with **both** `npx tsc -b` and `npx vite build`, then a browser pass with zero console errors (the documentation capture scripts double as a smoke test).
- Grep for every use before removing state or a variable; a `ReferenceError` in JSX only surfaces at runtime as a blank page.
- Put early returns **below** every hook in `AssetDetailView` and `DriverProfileView` (a white page with a silent console is a hook-count mismatch).
- Write user-facing text in plain sentences; toasts say what happened ("Driver added successfully", "<driver name> is now On Leave").

**Don't**
- Don't add `react-router` routes; follow the `App.tsx` path-branch pattern until the app is migrated as a whole.
- Don't put a second copy of the driver form in Account; `AddDriverApplication` wraps the hiring `ApplicationFormView`.
- Don't derive a status by hand that a store already derives (compliance "n missing", DQ %, risk score).
- Don't use `getByRole`/`querySelector` lookups that can hit the sidebar when you write tests or capture scripts — scope to `main`.
- Don't ship 10 px `slate-400` labels in new work; use `slate-500` (contrast, see design.md §6).
- Don't delete the legacy Compliance/Documents tab code in `CarrierProfilePage.tsx` without a product decision (page-overview §8); it is unreachable, not harmless to remove blindly (its modals are imported elsewhere).

---

## 8. Acceptance checklist

Say "done" only when every line is true.

**Build**
- [ ] `npx tsc -b` exits 0.
- [ ] `npx vite build` exits 0.
- [ ] `npx eslint .` reports no new errors in the files you touched.

**Fleet Overview**
- [ ] All eight cards render for a carrier; the no-carrier page renders for a user with no carrier.
- [ ] Each pencil opens its own modal with the fields, options and required marks in page-overview §2; Cancel discards; Save shows the matching toast and the card updates.
- [ ] Add / Edit / Remove office location and Add / View / Edit director work and persist across a reload.

**Yard Terminals**
- [ ] Search, Status and Security filters narrow the grouped table; the empty state appears for no match.
- [ ] Row click opens the view modal; ⋮ offers Open / Edit / Share to chat / Delete; Delete asks to confirm and toasts.
- [ ] Add New Location saves with the five security toggles and a computed score.

**Assets**
- [ ] KPI tiles filter and clear; sub-tabs split CMV / Non-CMV; search, Columns, pagination work.
- [ ] Inline status select saves and toasts; the table never wraps to two lines; the Actions column stays pinned when the table scrolls sideways.
- [ ] Add Asset enforces the zod rules (unit, 17-char VIN, make, model, dates, odometer); "Other" vehicle type stores the typed name; a bill of sale files a document; Edit reopens with every value.
- [ ] Asset detail shows the tiles and all 11 tabs; Edit Vehicle opens the wizard pre-filled; Share to chat opens the dialog.

**Drivers**
- [ ] KPI tiles, search, status filter chip, Columns, Export/Import, Add Driver all present; pagination works.
- [ ] Inline status select saves and toasts; ⋮ offers Open / Edit / Share to chat / Open DQ file / Delete.
- [ ] Import accepts CSV/XLSX with the documented headers, previews, creates rows, toasts the count.
- [ ] Add Driver shows the driver-type picker and all 15 sections; Save creates the driver, files travel documents, toasts; Edit reopens pre-filled.
- [ ] Driver profile shows status select, Share to chat, Print, Edit Profile, the four tiles and all 13 tabs.

**Cross-cutting**
- [ ] Every list row has a one-line layout with tooltips; every row action is inside ⋮ with Delete last and red.
- [ ] The header condenses on scroll-down and returns on scroll-up on the page, the asset detail and the driver profile.
- [ ] Phone width (390 px): no horizontal page scroll; tables become cards; modals keep their footer in view.
- [ ] Roles: Driver cannot see the menu; Safety Manager / User see the "View only" strip; server rejects their writes with 403.
- [ ] No real customer data in logs, fixtures committed to git, or documentation captures (demo data only).
- [ ] Zero console errors in a full click-through at 1440 px and 390 px.
