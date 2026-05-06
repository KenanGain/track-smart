---
title: Next Steps
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - next-steps
  - todo
  - documentation
---

# Next Steps

> Recommended order for the next agent. Pulls from [[Active Tasks]], [[Backlog]], [[Known Issues]], and `TODO.md`.

## Now (this session / next session)

1. **Decide on the in-flight PDF reports.** Confirm with the user whether `CvorPdfReport.tsx`, `FmcsaPdfReport.tsx`, `NscPdfReport.tsx`, and the corresponding `generate*Pdf.ts` should ship. If yes — verify against `inspectionsData.ts` / `nscInspectionsData.ts`, run `npm run build`, walk the Inspections page in the browser for each jurisdiction, then commit.
2. **Verify the modified files** (`ComplianceConfigureModal`, `AssetDetailView`, `CreateOrderModal`, `CreateScheduleForm`, `maintenance.data.ts`, `service-types.data.ts`, `service-types.ts`, `InspectionsPage.tsx`). Run `npm run build` and walk the affected screens.
3. **Run the vendor email path end-to-end** with a real `RESEND_API_KEY`. Verify Resend delivery and the portal payload round-trip.
4. **Walk each role** (super-admin, admin, regular user). Confirm sidebar role filtering and default-carrier resolution still match the docs in [[Frontend]] / `PROJECT_CONTEXT.md`.

## Soon

5. **Add a `vercel.json`** if Vercel is the hosting target — make the implicit explicit.
6. **Plan the router migration** to `react-router-dom`. Write an ADR in `08 - Decisions & ADRs/ADR-001-router-migration.md` before starting.
7. **Replace `xlsx ^0.18.5`** with a patched alternative.
8. **Remove `react-router-dom`** if a router migration is not soon — don't ship unused runtime dependencies.
9. **Document `AppDataContext` slices** in detail. List which UI consumes each slice so a future split is trivial.

## Later

10. **Real backend.** Choose a stack (most likely Next.js or Vercel Functions + a managed Postgres). Replace mock-data imports with API calls; move `localStorage` keys to server records.
11. **Real auth.** Replace the mock `LoginPage` with an SSO/OAuth provider (Auth0, Clerk, or a homegrown email-magic-link).
12. **Tests.** Adopt Vitest (Vite-native). Start with a smoke test for `App.tsx` and unit tests for `safetyScoring.ts`, `vendorPortal.utils.ts`, and the email template renderer.
13. **CI/CD.** GitHub Actions: `npm ci && npm run build && npm run lint`. Block merges that fail.
14. **A11y audit.** ARIA labels, keyboard nav for modals, color-contrast pass.
15. **Mobile breakpoints.** Decide if mobile is in scope before adding any responsive utilities.

## Carry-overs from the existing backlog

- Decide whether `/fuel` and `/settings/fuel` should remain shared or split.
- Lift the Safety Analysis calculation PDF rules into [[Safety Analysis Spec]].
- Inventory every UI primitive in [[UI Components]].
- Clean up legacy CVOR scripts and stale logs in `test-results/`.

## Related

- [[Known Issues]]
- [[Active Tasks]]
- [[Backlog]]
- [[Done]]
