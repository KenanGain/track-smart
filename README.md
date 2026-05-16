# TrackSmart Dashboard

Fleet management and DOT/CVOR/NSC safety-compliance dashboard for trucking carriers. Front-end SPA prototype built with React 19, TypeScript, Vite 7, and Tailwind CSS 4. Runs entirely on mock data plus one serverless email endpoint.

> Status: working prototype. No real backend, no database, no router (navigation is `useState`-driven). Persistence is in-memory + a small amount of `localStorage` (logged-in user id, vendor responses).

---

## Stack

- **Runtime / framework:** React 19, TypeScript ~5.9, Vite 7
- **Styling:** Tailwind CSS 4 (`@tailwindcss/postcss`), Inter font, blue-primary HSL theme
- **Forms / validation:** `react-hook-form` 7, `zod` 4, `@hookform/resolvers`
- **UI primitives:** local `src/components/ui/*` (Button, Card, Dialog, Tabs, Combobox, Table, etc.); `lucide-react` icons; `class-variance-authority` + `tailwind-merge` + `clsx`
- **Charts:** `recharts`
- **Files / data:** `xlsx`, `xlsx-js-style`, `jspdf`, `html2canvas`
- **Email (serverless):** `resend`
- **Misc:** `vite-plugin-node-polyfills` (Buffer/process for browser), `react-router-dom` 7 (installed but **not yet wired**)

## Quickstart

```sh
git clone <this-repo>
cd "Full prototpye code"
npm install
cp .env.example .env       # fill in RESEND_API_KEY (only needed for email)
npm run dev                # starts Vite at http://localhost:5173
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR + dev-API plugin (`/api/*.ts` routed locally) |
| `npm run build` | `tsc -b` then `vite build` → `dist/` |
| `npm run lint` | ESLint over the repo |
| `npm run preview` | Serve the `dist/` build locally |

## Environment variables

`.env` (or Vercel env vars in production). See [`.env.example`](./.env.example).

| Var | Required | Used by | Purpose |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | only for email | `api/send-vendor-email.ts` | Send vendor work-order emails through Resend |

> If `RESEND_API_KEY` is unset, the app still runs — only vendor email sending is disabled.

## Folder layout

```
api/                            Vercel serverless functions (also served in dev)
  send-vendor-email.ts          POST endpoint — sends WO email via Resend
  _emailTemplate.ts             HTML email template (inline styles)

src/
  App.tsx                       Root orchestrator — path state + page switch
  main.tsx                      React entry; wraps in <AppDataProvider>
  index.css                     Tailwind base + theme variables
  components/
    layout/                     AppSidebar, TopNavbar, Carrier/ServiceProfile switchers
    ui/                         Local primitives (button, card, dialog, table, ...)
    compliance/                 ComplianceConfigureModal, RegimeGate
    key-numbers/                KeyNumberModal
    locations/                  LocationEditorModal, LocationViewModal
    settings/                   DocumentTypeEditor, FolderTreeSelect
  context/
    AppDataContext.tsx          Global mock-state provider (docs, folders, key#s, thresholds)
  data/                         Global mock data + one-off CVOR scripts
  pages/                        One folder per area:
    account/, accounts/, admin/, assets/, auth/, compliance/,
    finance/, fuel/, hos/, incidents/, inspections/, inventory/,
    profile/, safety-analysis/, safety-events/, service/, settings/,
    tickets/, vendor-portal/, violations/
  server/devApi.ts              Vite plugin — serves /api/*.ts in dev
  lib/utils.ts                  cn() helper
  types/                        Shared TS types (sidebar, key-numbers, training, ...)
  utils/compliance-utils.ts     Compliance helpers

docs/                           Vendor extraction packages + spec MDs (Alberta/BC/NS/PEI/CVOR)
obsidian-vault/                 Project knowledge vault (open in Obsidian)
legacy-scripts/                 One-off prototype scripts (not used by the app)
scripts/                        Active CVOR data-prep scripts + Python PDF highlighters
```

## Main features (current)

- Multi-tenant carrier/service-profile model with role-based shell (super-admin / admin / user) — see `src/App.tsx`, `src/data/users.data.ts`, `src/pages/accounts/service-profiles.data.ts`
- **Carrier Profile** (`/account/profile`) — full carrier identity, DOT/MC/CVOR numbers, authority
- **Service Profile** (`/service-profile`) — service-org parent of one or more carriers
- **Accounts list** (`/accounts`) — multi-account directory
- **Inventory** (`/inventory`, `/inventory/vendors`) — items + vendor directory
- **Compliance & Documents** (`/compliance`) — folder tree + document types + tags + key numbers
- **Maintenance** (`/maintenance`, `/assets/directory`) — assets, work orders, scheduled service, vendor work-order email flow
- **Inspections** (`/inspections`) — DOT/FMCSA roadside, CVOR (Ontario), NSC (Alberta/BC/PEI/Nova Scotia) — incl. PDF report generation (`generateFmcsaPdf.ts`, `generateCvorPdf.ts`, `generateNscPdf.ts`)
- **Violations** (`/violations`, `/settings/violations`)
- **Accidents/Incidents** (`/accidents`)
- **Safety Events** (`/safety-events`)
- **Safety Analysis** (`/safety-analysis`) — legacy CVOR-style dashboard (SMS engine + scoring + Excel export)
- **Safety Analysis (Beta)** (`/safety-analysis/beta`) — composite Fleet Safety Score with six sub-tabs:
  - **Safety Dashboard** — fleet ring + 6 sub-score rings (Accident / ELD-HOS / Inspection / Driver / VEDR / Roadside) each with a Contribution bar, score breakdown table, Fleet Score Trend chart, monthly TrackSmart-points trend, jurisdictional regime cards, and a collapsible Geographic distribution panel with click-to-drill-in.
  - **Accidents · Violations** — heatmap, top-jurisdictions list, distribution histograms, and a `SafetyRecordsPanel` paginated table.
  - **Driver** — per-driver scorecards (grid / list), distribution histogram, and a `DriverRiskViolationsPanel` (High / Moderate / Lower risk drill-in).
  - **Assets** — per-asset scorecards (grid / list), distribution histogram, and an `AssetMaintenancePanel` (Overdue / Due / Upcoming drill-in).
  - **Forecast** — main risk-score forecast chart, **per-regime forecasts** (FMCSA / CVOR / NSC AB-BC-NS-PE) with aggregate KPI strip and prescriptive recommendation engine, driver crash probability list (Poisson tail), asset maintenance probability list (hazard-rate), maintenance-cost donut, vehicle-maintenance forecast table.
- **Hours of Service** (`/hours-of-service`)
- **Fuel** (`/fuel`, `/settings/fuel`) — IFTA summaries
- **Paystubs** (`/paystubs`), **Tickets** (`/tickets`)
- **Settings** — General, Key Numbers, Document Types/Folders, Maintenance, Expense Types, Violations, Inspections, Trainings, Safety
- **Admin** (`/admin/users`, `/admin/users/new`)
- **Profile** (`/profile/me`)
- **Vendor portal (public)** — `#/vendor/work-order?d=<base64url>` skips the auth shell and renders a self-contained work-order form for an external mechanic. Payload + responses live in the URL hash and `localStorage` — no backend.

## Backend / API

There is no traditional backend. One serverless endpoint:

- `POST /api/send-vendor-email` — sends a vendor work-order email via Resend. Shape: `src/types`-style inline interface in `api/send-vendor-email.ts`.
  - Local dev: routed by `src/server/devApi.ts` (Vite plugin in `vite.config.ts`)
  - Production: Vercel auto-deploys `/api/*.ts` as serverless functions
  - Files prefixed `_` (e.g. `_emailTemplate.ts`) are **not exposed** as endpoints

## Storage

- **In-memory React state** (mock data files in `src/data/*.data.ts` and `src/pages/*/*.data.ts`)
- **`localStorage`:**
  - `app_current_user_id` — restores logged-in user across reloads (`src/App.tsx`)
  - `tracksmart_vendor_responses` — vendor portal saved responses (`src/pages/vendor-portal/vendorPortal.utils.ts`)

There is no database, no fetch layer, and no real auth.

## Known issues / limitations

- No router. Navigation is a single `useState<string>` in `App.tsx` plus a long `if` chain in `renderPage()`. Deep-links and browser-back do not work for app routes (the vendor portal uses URL-hash routing as a workaround).
- Resend free `onboarding@resend.dev` sender restricts recipients to the account owner's signup email until a domain is verified.
- `xlsx ^0.18.5` has known CVE advisories; revisit when adopting a real backend.
- `src/pages/safety-analysis/SafetyAnalysisPage.tsx.corrupt.bak` is a stale backup; safe to delete on confirmation.
- Currently uncommitted (see `git status`): inspection PDF report generators (CvorPdfReport, FmcsaPdfReport, NscPdfReport + corresponding `generate*.ts`), service-types updates, compliance/asset modal updates.
- `legacy-scripts/` contains one-off Python/Node helpers for CVOR data prep — **not** used by the running app.

## Documentation map

- [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) — what's built, business logic, risk areas
- [DESIGN.md](./DESIGN.md) — design system reference (color, typography, components)
- [SKILLS.md](./SKILLS.md) — rules for AI agents working on this repo
- [AGENT_PROMPT.md](./AGENT_PROMPT.md) — drop-in prompt for the next AI agent
- [CHANGELOG.md](./CHANGELOG.md) — change log
- [TODO.md](./TODO.md) — task list
- [obsidian-vault/](./obsidian-vault/) — Obsidian knowledge vault — open in Obsidian and start at `00 - Home/Home.md`
- [docs/](./docs/) — vendor extraction packages + jurisdiction-specific PDF/CSV specs (Alberta, BC, Nova Scotia, PEI, Ontario CVOR)

## License

Unspecified.
