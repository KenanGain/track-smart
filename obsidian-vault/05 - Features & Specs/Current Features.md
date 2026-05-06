---
title: Current Features
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - features
  - documentation
---

# Current Features

> Inventory of what is actually working today, by area. Does not list aspirational features.

## Auth

- **Mock login** — `LoginPage` reads `APP_USERS` from `src/data/users.data.ts` and groups them by service profile in a quick-login dropdown. Password is the `DEMO_PASSWORD` constant.
- **Session restore** — logged-in `userId` persisted to `localStorage["app_current_user_id"]`; restored on boot in `App.tsx`.
- **Sign out** — clears `currentUser`, `selectedAccount`, and the `localStorage` key.

## Multi-tenant model

- **Service Profile** = the parent service organization (`SERVICE_PROFILES_DB`, e.g. `svc-001` TrackSmart).
- **Carrier Account** = a fleet operator (`ACCOUNTS_DB`, e.g. `acct-001` Acme).
- **AppUser** = role + scopes (`accountId`, `managedAccountIds`, `serviceProfileId`, `serviceProfileIds`).
- **Default carrier resolution** — `getDefaultCarrierForUser()` in `App.tsx` picks the right starting carrier per user. Super-admins fall back to Acme.
- **Carrier switcher** — top navbar; only shows for users with multiple accessible carriers.
- **Service-profile switcher** — `<ServiceProfileSwitcher>` component; first-time login auto-resolves via `getDefaultServiceProfileForUser()`.

## Pages by area

(See [[Pages Index]] for routes.)

### Profile & Account
- My Profile, Carrier Profile (huge), Locations, Empty Carrier Profile state.

### Service
- Service Profile, Empty Service Profile state, Add Office modal.

### Accounts (multi-tenant)
- Accounts list/tabs, Add Account, Add Service Profile, Carrier view/edit modals, Service Profile view/edit modals.

### Admin
- Users list, Add user, User view/edit modals, Carrier/Service-Profile access pickers.

### Inventory
- Inventory list, Vendors, Add inventory item, Add vendor, vendor categories modal.

### Compliance
- Compliance Documents — folder tree + document types + tag sections + attachments. Configure modal scopes per regime via [[RegimeGate]].
- Key Numbers — settings page + modal for editing identifiers.

### Maintenance
- Asset Directory, Asset Maintenance, Asset modal/detail view, Create Order modal (with vendor email send), Create Schedule form, Add Expense modal.

### Inspections (jurisdictional)
- DOT/FMCSA: roadside data, BASIC/OOS visualizations, FMCSA API fetch block, Inspection Report Panel, Score Band Hover Card.
- Ontario CVOR: periodic reports, intervention events, performance cards.
- Alberta NSC: performance history, conviction analysis (table + summary + details), CVSA inspections, collisions, violations, monitoring, facility-licence, safety-fitness, historical events.
- BC NSC: carrier profile, performance history, contraventions, CVSA, accidents, CVIP.
- PEI NSC: performance card + history.
- Nova Scotia NSC: performance block + card + history.
- **In flight (uncommitted):** PDF report generators for FMCSA, CVOR, NSC.

### Violations
- Violations list page, edit form, settings catalog.

### Safety
- Safety Events list.
- Safety Analysis — SMS engine (`sms-engine.ts`), scoring (`safetyScoring.ts`), Excel export.
- Safety Settings — thresholds (CSA + CVOR, OOS, per-category) consumed by Safety Analysis charts.

### Operations
- Hours of Service.
- Fuel + IFTA summary (page + settings).
- Paystubs.
- Tickets.
- Incidents (`/accidents`).

### Settings
- General, Key Numbers, Document Types, Document Folders, Maintenance, Expense Types, Violations, Inspections, Trainings, Safety, Fuel.

### Vendor portal (public)
- `#/vendor/work-order?d=<base64url>` opens a self-contained work-order form.
- Vendor enters labor, parts, odometer, engine hours, invoice file.
- Response saved to `localStorage["tracksmart_vendor_responses"]`.

## Cross-cutting features

- **Compliance regimes** — `<RegimeGate>` shows/hides UI based on enabled regimes per carrier.
- **Document/folder/tag management** — full CRUD via `AppDataContext` actions.
- **Threshold management** — CSA + CVOR + per-category + OOS thresholds, all in `AppDataContext`.
- **Excel export** — `xlsx-js-style` (Safety Analysis).
- **PDF export** — `jspdf` + `html2canvas` (Inspections, in flight).
- **Email send** — `POST /api/send-vendor-email` via Resend.

## Features explicitly NOT yet built

- Real authentication / SSO
- Real persistence (database, fetch layer)
- Dashboard analytics page (placeholder only)
- Dark mode
- Mobile-responsive layout
- Tests, CI

## Related

- [[Pages Index]]
- [[Frontend]]
- [[Backend]]
- [[Input Output Flow]]
- [[Known Issues]]
