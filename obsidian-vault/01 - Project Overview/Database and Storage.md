---
title: Database and Storage
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - data
  - storage
  - documentation
---

# Database and Storage

> There is no real database in this repo. Persistence is a thin layer on top of mock TS data + browser `localStorage`. Document this section honestly so future agents don't assume otherwise.

## Storage layers (current)

| Layer | What lives there | Where |
| --- | --- | --- |
| Compile-time mock data | All accounts, service profiles, users, carriers, fleet, drivers, inspections, violations, fuel, HOS, etc. | TS files under `src/data/` and `src/pages/<area>/*.data.ts` |
| In-memory React state | Anything the user creates/edits during a session | `useState` in pages and modals |
| `<AppDataContext>` | Documents, folder tree, tag sections, key numbers + values, CSA/CVOR/OOS thresholds | `src/context/AppDataContext.tsx` |
| `localStorage` | A few cross-session bits (see below) | Browser only |

**There is no:**

- SQL/NoSQL database
- ORM
- Backend API beyond `/api/send-vendor-email`
- Network fetch layer
- Migration / schema management

## `localStorage` keys

| Key | Owner | Purpose |
| --- | --- | --- |
| `app_current_user_id` | `src/App.tsx` | Survives reloads — restores logged-in user. Cleared on sign-out. |
| `tracksmart_vendor_responses` | `src/pages/vendor-portal/vendorPortal.utils.ts` | Stores vendor work-order responses keyed by `orderId`. Used by `saveVendorResponse` / `loadVendorResponses`. |

Don't add more `localStorage` keys without a clear reason — once a real backend exists they all become migration debt.

## Mock data hot-spots

(See [[Data Index]] for the full catalog.)

| File | Owns |
| --- | --- |
| `src/data/users.data.ts` | `APP_USERS`, `DEMO_PASSWORD`, role helpers |
| `src/pages/accounts/accounts.data.ts` | `ACCOUNTS_DB` (carriers) |
| `src/pages/accounts/service-profiles.data.ts` | `SERVICE_PROFILES_DB` (parent service orgs) |
| `src/pages/accounts/carrier-fleet*.data.ts` | Trucks, trailers |
| `src/pages/accounts/carrier-drivers.data.ts` | Drivers |
| `src/pages/accounts/carrier-assets.data.ts` | Asset roster |
| `src/pages/inspections/inspectionsData.ts` | FMCSA + CVOR fixtures |
| `src/pages/inspections/nscInspectionsData.ts` | NSC fixtures (Alberta/BC/PEI/NS) |
| `src/pages/safety-analysis/safety-analysis.data.ts` | Safety scoring fixtures |
| `src/data/sidebar.data.ts` | `SIDEBAR_NODES` |
| `src/data/training.data.ts` | Driver training records |
| `src/data/violations.data.ts` | Violation taxonomy |

## Data import / export

- **Excel import:** `xlsx ^0.18.5` — used in inspection upload flows.
- **Excel export:** `xlsx-js-style` — `src/pages/safety-analysis/exportExcel.ts` writes styled workbooks.
- **PDF export (in flight):** `jspdf` + `html2canvas` — `src/pages/inspections/generate{Fmcsa,Cvor,Nsc}Pdf.ts` mount a hidden React tree, rasterize each `.pdf-page`, and assemble a multi-page PDF.
- **Vendor work-order payload:** base64url JSON in the URL hash. See `src/pages/vendor-portal/vendorPortal.utils.ts` (`encodePayload`, `decodePayload`, `buildVendorPortalUrl`).

## When a real database arrives

(Out of scope today, listed for the next agent.)

- Replace mock-data imports with hooks (`useQuery` / `useSWR`) calling new `/api/*` endpoints.
- Move `AppDataContext` from a state-of-record to a cache.
- Plan migration of the `localStorage` keys: `app_current_user_id` becomes a session cookie; `tracksmart_vendor_responses` becomes a server record keyed by `orderId`.

## Related

- [[Data Index]]
- [[AppDataContext]]
- [[Backend]]
- [[Frontend]]
