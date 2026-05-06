---
name: Active Tasks
description: Currently in-progress work items
type: tasks
tags: [tasks, active]
---

# Active Tasks

> One-line items. When done, move to [[Done]]. When deferred, move to [[Backlog]].

## In progress

- [ ] **Inspection PDF generators (uncommitted, untracked):** `CvorPdfReport.tsx`, `FmcsaPdfReport.tsx`, `NscPdfReport.tsx`, `generateCvorPdf.ts`, `generateFmcsaPdf.ts`, `generateNscPdf.ts`. Coherent with the modified `InspectionsPage.tsx`. Verify, run `npm run build`, walk each jurisdiction in browser, then commit.
- [ ] **Service-types model edits:** `src/data/service-types.data.ts` + `src/types/service-types.ts` are modified. Confirm consumers in maintenance / asset modals haven't broken.
- [ ] **Asset / maintenance modal edits:** `AssetDetailView.tsx`, `CreateOrderModal.tsx`, `CreateScheduleForm.tsx`, `maintenance.data.ts` modified. Walk Maintenance and Create-Order flows.
- [ ] **Compliance configure modal edit:** `ComplianceConfigureModal.tsx` modified. Walk per-regime gating.
- [ ] **Inspections page edit:** `InspectionsPage.tsx` modified — likely the wiring for the new PDF generators.

## Up next (today/this week)

- [ ] Verify vendor email path with a real `RESEND_API_KEY` (see [[Setup and Run Guide]] § "Email check").
- [ ] Walk app per role: super-admin, admin (Acme), regular user.
- [ ] Decide whether to commit the in-flight PDF generators as a single change or split.

## Notes

Use [[Task Template]] for anything bigger than a one-liner.

For the larger backlog see [[Backlog]] · [[Next Steps]] · [[Known Issues]] and the root `TODO.md`.
