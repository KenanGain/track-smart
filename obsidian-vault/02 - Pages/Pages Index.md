---
name: Pages Index
description: Map of every page/route in the TrackSmart Dashboard
type: index
tags: [pages, index]
---

# Pages Index

Every UI page in the app, grouped by area. Routes are the `path` strings handled in `src/App.tsx`.

## Dashboard

- `/dashboard` — placeholder, "coming soon" panel

## Auth

- `(no path — gates the app)` → `LoginPage` (`src/pages/auth/LoginPage.tsx`). Quick-login dropdown grouped by service profile.

## Profile

- `/profile/me` → `MyProfilePage` (`src/pages/profile/MyProfilePage.tsx`)

## Account & Service

- `/account/profile` → [[Carrier Profile]]
- `/account/locations` → [[Locations]]
- `/service-profile` → `ServiceProfilePage` (`src/pages/service/ServiceProfilePage.tsx`); empty state via `EmptyServiceProfile`

## Accounts (multi-tenant)

- `/accounts` → [[Accounts List]] (renders `AccountsTabsPage`)
- `/accounts/new` → [[Add Account]]
- `/accounts/services/new` → `AddServiceProfilePage`

## Admin

- `/admin/users` → `UsersListPage` (`src/pages/admin/UsersListPage.tsx`)
- `/admin/users/new` → `AddUserPage`

## Inventory

- `/inventory` → `InventoryListPage`
- `/inventory/items/new` → `AddInventoryItemPage`
- `/inventory/vendors` → `VendorsListPage`
- `/inventory/vendors/new` → `AddVendorPage`

## Compliance

- `/compliance` → [[Compliance Documents]]

## Safety

- `/safety-events` → [[Safety Events]]
- `/safety-analysis` → [[Safety Analysis]]
- `/inspections` → [[Inspections]]
- `/violations` → [[Violations]]
- `/accidents` → [[Incidents]]

## Operations

- `/fuel` → [[Fuel]]
- `/hours-of-service` → [[Hours of Service]]
- `/paystubs` → [[Paystubs]]
- `/tickets` → [[Tickets]]

## Assets

- `/assets/directory` → [[Asset Directory]]
- `/maintenance` → [[Asset Maintenance]]

## Settings

- `/settings/general` → [[Settings — General]]
- `/settings/key-numbers` → [[Settings — Key Numbers]]
- `/settings/document-types` → [[Settings — Document Types]]
- `/settings/document-folders` → [[Settings — Document Folders]]
- `/settings/maintenance` → [[Settings — Maintenance]]
- `/settings/expenses` → [[Settings — Expense Types]]
- `/settings/violations` → [[Settings — Violations]]
- `/settings/inspections` → [[Settings — Inspections]]
- `/settings/trainings` → [[Settings — Trainings]]
- `/settings/safety` → [[Settings — Safety]]
- `/settings/fuel` → [[Settings — Fuel]]

## Vendor portal (public)

- `#/vendor/work-order?d=<base64url>` → `VendorWorkOrderFormPage` (`src/pages/vendor-portal/VendorWorkOrderFormPage.tsx`). Renders before the auth shell — see [[Architecture]] § "Vendor-portal short-circuit".

## Pattern

Each page note follows the [[Page Spec Template]]:
- Route, file, purpose
- Data sources
- Key components used
- Open questions / TODOs
