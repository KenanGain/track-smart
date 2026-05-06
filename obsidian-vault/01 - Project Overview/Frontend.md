---
title: Frontend
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - frontend
  - documentation
---

# Frontend

> What the front-end is and how it boots, navigates, and renders. Pair with [[Architecture]] and [[Pages Index]].

## Stack

- **React 19** with `<StrictMode>` wrapping `<AppDataProvider>`.
- **TypeScript** ~5.9 (strict).
- **Vite 7** dev/build with the local `devApiPlugin` from `src/server/devApi.ts`.
- **Tailwind CSS 4** + Inter font + the HSL theme tokens in `src/index.css`.
- **Forms:** `react-hook-form` 7 + `zod` 4.
- **Icons:** `lucide-react`. **Charts:** `recharts`.

## Boot path

```
index.html → src/main.tsx
  └─ <StrictMode>
       └─ <AppDataProvider>     ← src/context/AppDataContext.tsx
            └─ <App />          ← src/App.tsx
```

`App.tsx` is the orchestrator. It:

1. Short-circuits to `<VendorWorkOrderFormPage>` when the URL hash matches `#/vendor/work-order?d=…` (see [[Vendor Portal]] section in [[Current Features]]).
2. Restores `currentUser` from `localStorage["app_current_user_id"]`.
3. Computes a default carrier via `getDefaultCarrierForUser(user)`:
   - `user.accountId` → that carrier
   - `user.managedAccountIds[0]` → that carrier
   - `user.serviceProfileId` → first carrier under that profile
   - `super-admin` → Acme (`acct-001`) fallback
   - else → null (renders `<EmptyCarrierProfile>`)
4. Renders `<LoginPage>` if there is no `currentUser`.
5. Otherwise renders the shell: `<AppSidebar>` + `<TopNavbar>` + `<main>` containing the result of `renderPage()`.
6. `renderPage()` is a long `if` chain on `path` (e.g. `if (path === "/inspections") { ... }`).

## Navigation

- **Simulated.** `path` is `useState<string>` in `App.tsx`.
- Sidebar items call `onNavigate(newPath)` to set it.
- `react-router-dom` is installed but **not** used. Migrating is an open task — see [[Next Steps]] and [[Backlog]].
- The vendor portal uses URL-hash routing (`#/vendor/...`) so a vendor's link survives reloads without a router.

## Sidebar structure

Defined in `src/data/sidebar.data.ts` as `SIDEBAR_NODES[]`. Each node:

```ts
{ key, label, icon, path?, children?, roles? }
```

`AppSidebar.tsx` filters by `currentUser.role`. Top-level sections (current order):

- Dashboard, Account, Service Profile, Inventory (List, Vendors), Compliance & Documents, Maintenance, Paystubs, Hours of Service, Fuel, Accidents, Safety and Compliance (Inspections), Violations, Safety Events, … (full list in `sidebar.data.ts`)

## Page tree

See [[Pages Index]] for the route → file map. High-level groups:

| Group | Folder | Notable pages |
| --- | --- | --- |
| Auth | `src/pages/auth` | `LoginPage` |
| Profile | `src/pages/profile` | `MyProfilePage`, `CarrierProfilePage`, driver views |
| Account / Service | `src/pages/account`, `src/pages/service` | Carrier Profile, Locations, Service Profile, Empty states |
| Accounts (multi-tenant) | `src/pages/accounts` | List, Tabs, Add, Carrier/Service-Profile modals |
| Admin | `src/pages/admin` | Users list, Add user, role-aware modals |
| Inventory | `src/pages/inventory` | List, Vendors, Drivers, Assets, Add item, Add vendor |
| Compliance | `src/pages/compliance` | Documents page (folder tree + types + tags) |
| Assets / Maintenance | `src/pages/assets` | Asset Directory, Asset Maintenance, Asset modals, Create order, Create schedule |
| Inspections | `src/pages/inspections` | Big page with FMCSA, CVOR, Alberta NSC, BC NSC, PEI NSC, NS NSC sub-views + PDF reports |
| Violations | `src/pages/violations` | List, edit form |
| Safety | `src/pages/safety-events`, `src/pages/safety-analysis` | Events, Analysis (SMS engine, Excel export) |
| Fleet ops | `src/pages/fuel`, `src/pages/hos`, `src/pages/finance`, `src/pages/tickets`, `src/pages/incidents` | Fuel, HOS, Paystubs, Tickets, Incidents |
| Settings | `src/pages/settings` | General, Key Numbers, Document Types/Folders, Maintenance, Expense Types, Violations, Inspections, Trainings, Safety, Fuel |
| Vendor portal (public) | `src/pages/vendor-portal` | `VendorWorkOrderFormPage`, hash-payload utils |

## Component primitives

`src/components/ui/`:

`badge`, `button`, `card`, `combobox`, `DataListToolbar`, `dialog`, `input`, `label`, `radio-group`, `scroll-area`, `select`, `separator`, `SubTabs`, `table`, `tabs`, `textarea`, `toggle`.

Shared compositions live one folder up:

- `src/components/layout/` — `AppSidebar`, `TopNavbar`, `CarrierSwitcher`, `ServiceProfileSwitcher`
- `src/components/compliance/` — `ComplianceConfigureModal`, `RegimeGate`
- `src/components/key-numbers/` — `KeyNumberModal`
- `src/components/locations/` — `LocationEditorModal`, `LocationViewModal`
- `src/components/settings/` — `DocumentTypeEditor`, `FolderTreeSelect`

## Global state

[[AppDataContext]] holds:

- `documents`, `folderTree`, `tagSections`
- `keyNumbers`, `keyNumberValues`
- CSA + CVOR thresholds (warning/critical, OOS overall/vehicle/driver, per-category)
- Action helpers (add/update/delete folder, doc, tag section, etc.)

Per-page state is local. There is no Redux/Zustand/RTK-query.

## Related

- [[Architecture]] · [[Tech Stack]]
- [[Pages Index]]
- [[Components Index]]
- [[Design System]]
- [[Database and Storage]]
