# TODO — TrackSmart Dashboard

> Current task list. Move completed items into `CHANGELOG.md` rather than striking them through here.

## High Priority

- [ ] **Decide fate of in-progress PDF report generators.** Confirm with the user whether `CvorPdfReport.tsx`, `FmcsaPdfReport.tsx`, `NscPdfReport.tsx`, and `generate*Pdf.ts` (currently untracked) should be committed as-is, polished further, or split. Verify they render against `inspectionsData.ts` and `nscInspectionsData.ts` without missing fields.
- [ ] **Verify uncommitted changes** to `ComplianceConfigureModal`, `AssetDetailView`, `CreateOrderModal`, `CreateScheduleForm`, `maintenance.data.ts`, `service-types.data.ts`, `service-types.ts`, and `InspectionsPage.tsx`. Run `npm run build` and walk the affected screens.
- [ ] **Confirm the vendor email path works end-to-end** — set `RESEND_API_KEY`, click "Send via Email" from `CreateOrderModal`, confirm Resend delivery, click the link, complete the form, save the response.
- [ ] **Test the full app flow per role** — super-admin, admin (Acme Trucking), regular user. Confirm sidebar visibility, default carrier resolution, and the carrier switcher behave as `getDefaultCarrierForUser()` documents.
- [ ] **Document the Service Profile model** in `obsidian-vault/01 - Project Overview/`. The page note exists but the data shape isn't deeply explained yet.

## Medium Priority

- [ ] **Add a `vercel.json`** if Vercel is the intended host — currently inferred from `api/*.ts` shape but not committed.
- [ ] **Review `xlsx` CVE advisories** and decide whether to swap to `xlsx-populate`, `exceljs`, or pin a patched fork.
- [ ] **Inventory every UI primitive** in `obsidian-vault/04 - Components/UI Components.md`. (Carried over from existing backlog.)
- [ ] **Lift `Safety_Analysis_Calculation_Documentation_2026-03-09.pdf` rules** into `obsidian-vault/05 - Features & Specs/Safety Analysis Spec.md`. (Carried over.)
- [ ] **Document `AppDataContext` slices** — what each piece is, who consumes it, and which slices should split first when state grows. (Carried over.)
- [ ] **Add architecture diagram** (vault attachment) showing shell → page tree → context dependencies.
- [ ] **Add screenshots** of representative pages to `obsidian-vault/attachments/` and reference them from the matching page notes.
- [ ] **Decide whether `/fuel` and `/settings/fuel` should be one page or two.** Currently they share `FuelPage`. (Carried over.)

## Low Priority

- [ ] **Plan the router migration** to `react-router-dom` (already installed) — pre-write a migration ADR before doing the work. (Carried over.)
- [ ] **Decide retention** of `legacy-scripts/` (Python/Node CVOR fixers) — move out of repo, archive in a tag, or keep with a top-of-folder README. (Per the existing memory: it's already documented as one-off prototype scripts.)
- [ ] **Clean up `dist/` and `test-results/`** in working tree — `dist/` is gitignored but present locally; `test-results/` is not gitignored and contains logs.
- [ ] **Delete `src/pages/safety-analysis/SafetyAnalysisPage.tsx.corrupt.bak`** once confirmed it's dead.
- [ ] **Daily-note discipline** — consider adopting `obsidian-vault/07 - Daily Notes/` regularly so future agents can read recent decisions.
- [ ] **Add Vitest scaffolding** if the project keeps growing — at least a smoke test that imports `App.tsx` and renders the login page.
- [ ] **Toast / notification primitive** — currently feedback is inline. Decide on a pattern (e.g., `sonner`) before each page invents its own.
- [ ] **Accessibility audit** — focus rings exist, but ARIA labels on icon-only buttons and keyboard traversal of modals haven't been audited.
