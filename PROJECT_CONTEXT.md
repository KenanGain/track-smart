# PROJECT_CONTEXT

> Context dossier for engineers and AI agents picking up this codebase. Read this before making changes.

---

## What this project is

**TrackSmart Dashboard** is a front-end SPA prototype for a fleet-management / DOT-compliance product. It is targeted at trucking carriers and the safety/compliance staff who service them. The repo is a working visual prototype: every page renders against mock data files; the only piece of "real" infrastructure is a single Resend-backed email endpoint for vendor work-order emails.

The app understands several jurisdictions:

- **FMCSA / CSA** (US federal — Compliance, Safety, Accountability with BASIC scores + OOS rates)
- **Ontario CVOR** (carrier vehicle operator's record)
- **NSC** in Alberta, British Columbia, PEI, and Nova Scotia (each with its own performance/conviction/inspection model)

Multi-tenant model:

- A **Service Profile** (`SERVICE_PROFILES_DB`, `svc-001` is TrackSmart) is the parent organization that manages one or more carrier accounts.
- A **Carrier Account** (`ACCOUNTS_DB`, `acct-001` is Acme Trucking Inc.) is a fleet operator. Has DOT/CVOR/NSC numbers, locations, drivers, assets.
- An **AppUser** (`APP_USERS`) has a `role` (`super-admin` / `admin` / `user`) and may be scoped to an `accountId`, `managedAccountIds`, `serviceProfileId`, or `serviceProfileIds`.

`src/App.tsx` chooses the user's "default carrier" via `getDefaultCarrierForUser()` — primary account → managed → via service profile → super-admins fall back to Acme.

---

## Current state

| Area | State |
| --- | --- |
| Front-end shell | Built — login, sidebar, top navbar, carrier/service-profile switchers, role-filtered nav |
| Pages | Built or scaffolded for ~40+ routes (see Pages list below) |
| Routing | **Simulated** — `useState<string>` + `if` chain in `App.tsx`. `react-router-dom` 7 is installed but unused. Vendor portal uses URL hash. |
| Data | Mock TS files in `src/data/` and per-feature `*.data.ts`. No fetch layer. |
| Persistence | Memory only, plus `localStorage` for `app_current_user_id` and vendor responses |
| Backend | Single serverless endpoint: `POST /api/send-vendor-email` (Resend) |
| Auth | Mock — login picks any user from `APP_USERS` with `DEMO_PASSWORD`; identity stored in localStorage |
| PDF reports | New (uncommitted): FMCSA / CVOR / NSC inspection PDFs via `html2canvas` + `jspdf` |
| Tests | None in this repo |
| CI/CD | None configured |
| Lint | ESLint 9 + typescript-eslint configured |

### Uncommitted work (per `git status` at session start)

```
M  package.json / package-lock.json
M  src/components/compliance/ComplianceConfigureModal.tsx
M  src/data/service-types.data.ts
M  src/pages/assets/AssetDetailView.tsx
M  src/pages/assets/CreateOrderModal.tsx
M  src/pages/assets/CreateScheduleForm.tsx
M  src/pages/assets/maintenance.data.ts
M  src/pages/inspections/InspectionsPage.tsx
M  src/types/service-types.ts
?? src/pages/inspections/CvorPdfReport.tsx
?? src/pages/inspections/FmcsaPdfReport.tsx
?? src/pages/inspections/NscPdfReport.tsx
?? src/pages/inspections/generateCvorPdf.ts
?? src/pages/inspections/generateFmcsaPdf.ts
?? src/pages/inspections/generateNscPdf.ts
```

These look like a coherent in-progress feature: PDF report generation for the Inspections page + service-types model tweaks. Treat as in-flight; verify with the user before refactoring.

---

## Important files and folders

### Entry / orchestrator

- `index.html` → `src/main.tsx` → `<AppDataProvider><App /></AppDataProvider>`
- `src/App.tsx` — single source of routing truth. Holds `path`, `selectedAccount`, `selectedServiceProfileId`, `currentUser`. Switches pages via `if (path === ...)`.

### Sidebar / nav

- `src/data/sidebar.data.ts` — `SIDEBAR_NODES[]` (label, icon, path, children, optional roles)
- `src/components/layout/AppSidebar.tsx` — renders the sidebar with role filtering
- `src/components/layout/TopNavbar.tsx` — header, breadcrumbs, carrier switcher, user menu

### Global state

- `src/context/AppDataContext.tsx` — documents, folder tree, tag sections, **CSA + CVOR thresholds** (warning/critical and per-category), **OOS thresholds** (overall/vehicle/driver), key numbers + values.
  - All state is in-memory; no persistence.

### Mock data hot-spots

- `src/data/users.data.ts` — `APP_USERS`, `DEMO_PASSWORD`, role + lookup helpers
- `src/pages/accounts/accounts.data.ts` — `ACCOUNTS_DB`
- `src/pages/accounts/service-profiles.data.ts` — `SERVICE_PROFILES_DB`
- `src/pages/accounts/carrier-fleet.data.ts` / `carrier-assets.data.ts` / `carrier-drivers.data.ts` / `carrier-datasets.data.ts`
- `src/pages/inspections/inspectionsData.ts` — main FMCSA/CVOR fixtures
- `src/pages/inspections/nscInspectionsData.ts` — NSC fixtures
- `src/pages/safety-analysis/safety-analysis.data.ts` + `sms-engine.ts` + `safetyScoring.ts`

### Public-facing routes

The app shell is gated by login. **One** route bypasses the shell: the vendor portal. `src/App.tsx` checks `isVendorPortalUrl()` first and renders `<VendorWorkOrderFormPage />` when the URL hash starts with `#/vendor/work-order?d=`. The base64url-encoded hash payload is the entire work order — see `src/pages/vendor-portal/vendorPortal.utils.ts`.

---

## Main app flow

1. **Boot** — `<AppDataProvider>` seeds documents/folders/tags/key numbers/thresholds. `App.tsx` restores user from `localStorage`.
2. **Vendor-portal short-circuit** — if URL hash matches the vendor pattern, render the form and stop.
3. **Login gate** — without `currentUser`, render `<LoginPage>`. The login page reads `APP_USERS` and `DEMO_PASSWORD`, groups users by service profile, and offers a quick-login dropdown.
4. **App shell** — sidebar (role-filtered) + top navbar (carrier switcher) + `<main>` rendering `renderPage()`.
5. **Selecting a carrier** — `selectedAccount` controls which account-scoped pages display (Carrier Profile, Inspections, Maintenance, etc.). Default chosen by `getDefaultCarrierForUser()`.

---

## Core business logic to be aware of

- **Safety scoring** lives in `src/pages/safety-analysis/{sms-engine.ts, safetyScoring.ts, safetySettings.ts}`. Thresholds come from `AppDataContext`. Excel export via `exportExcel.ts`.
- **Inspection model** is jurisdiction-aware. The Inspections page composes per-jurisdiction sub-components (e.g. `NscBcPerformanceHistory`, `NscAbPerformanceHistory`, `NscPeiPerformanceCard`, `NscNsPerformanceCard`, `NscCvsaInspections`). Adding a jurisdiction means updating `inspectionsData.ts`/`nscInspectionsData.ts` and providing matching components.
- **Compliance regimes** are scoped by `RegimeGate` (`src/components/compliance/RegimeGate.tsx`) and configured via `ComplianceConfigureModal`.
- **Vendor work-order flow** is intentionally backend-less. Encoded in URL hash; vendor responses persist in `localStorage` only. Switching to a real backend is documented in `docs/vendor-work-order-flow.md`.
- **PDF report generation** (uncommitted) renders an off-screen React tree, runs `html2canvas` per `.pdf-page` element, then composes pages with `jspdf`. Pattern is consistent across `generateFmcsaPdf.ts`, `generateCvorPdf.ts`, `generateNscPdf.ts`.

---

## Inputs and outputs

| Input | Where it comes from |
| --- | --- |
| User selection / forms | React state in pages and modals |
| Login | Picked from `APP_USERS` constant + `DEMO_PASSWORD` constant |
| Imported files | `xlsx` for Excel uploads, `xlsx-js-style` for export, file inputs in inspection forms |
| Vendor work-order link | Hash-encoded base64url payload |

| Output | Where it goes |
| --- | --- |
| App state | In-memory React state |
| User identity | `localStorage["app_current_user_id"]` |
| Vendor responses | `localStorage["tracksmart_vendor_responses"]` |
| Vendor email | `POST /api/send-vendor-email` → Resend |
| PDF reports | Browser download via `jsPDF.save()` |
| Excel exports | Browser download via `xlsx-js-style` |

---

## Features that must not be broken

- **Login + session restore.** Removing or renaming `APP_USERS`, `findUserById`, or `app_current_user_id` will break the boot path.
- **Sidebar role filtering.** `AppSidebar` filters by `currentUser.role`. Don't widen visibility silently.
- **Default carrier resolution.** `getDefaultCarrierForUser()` and `getDefaultServiceProfileForUser()` in `App.tsx` are load-bearing for non-super-admins. They guard against landing on Acme by accident.
- **Vendor portal short-circuit.** Must run before any auth or shell logic — see `if (isVendorPortalUrl()) return <VendorWorkOrderFormPage />`.
- **Compliance regime gating.** `<RegimeGate>` controls which jurisdictional UI is visible.
- **Threshold defaults** in `AppDataContext.tsx`. Changing them shifts every safety-analysis chart.

---

## Safe areas for future development

- Adding new pages by appending to `SIDEBAR_NODES` + `renderPage()`.
- Adding new mock data files alongside existing ones in `src/data/` or `src/pages/<area>/`.
- Building new UI primitives in `src/components/ui/`. They follow the Tailwind + `cn()` pattern in `button.tsx`.
- New Settings sub-pages — `src/pages/settings/` is a clean home.
- Improving the vendor email template (`api/_emailTemplate.ts`) — inline-style only.

## Risk areas

- **Routing migration.** Anything that depends on `path` as state will break the moment `react-router-dom` is wired in. Plan it deliberately.
- **`AppDataContext` is a fat context.** Wide consumers re-render whenever any slice changes. Splitting it later is a project, not a quick fix.
- **`InspectionsPage.tsx`** is enormous and central. Multiple jurisdictional components are imported there. Edit with care; ensure both `npm run build` and the live UI flow work.
- **Mock data drift.** Many pages share `accounts.data.ts` / `users.data.ts`; renaming a field cascades widely.
- **PDF generation requires real DOM.** `html2canvas` cannot run in tests without a browser-equivalent.

## Known limitations

- No router → no deep-linkable URLs (except vendor portal).
- No real auth → never expose the dev URL publicly.
- Resend domain is unverified → email recipients limited to the account owner's signup email until a domain is verified in the Resend dashboard.
- `xlsx ^0.18.5` has open CVE advisories.
- No CI, no automated tests.

## Unknowns / assumptions

- **Assumption:** the uncommitted PDF-report files are intended to ship together with the modified `InspectionsPage.tsx` and `service-types` changes. They are coherent in scope but have not been committed.
- **Assumption:** `legacy-scripts/` and `scripts/` Python files are not run by the web app at runtime — they appear to be data-prep helpers. Confirmed by file contents and `package.json` (no Python invocation).
- **Unknown:** whether a database/back-end is planned and on what stack.
- **Unknown:** whether multi-region support beyond the four Canadian provinces + FMCSA is in scope.
- **Unknown:** intended hosting target. Resend + the `api/*.ts` shape strongly suggest **Vercel**, but no `vercel.json` is checked in.
- **Unknown:** ownership of `dist/` and `test-results/` — present in the working tree but unclear whether they should be committed (`dist` is gitignored, `test-results` is not).
