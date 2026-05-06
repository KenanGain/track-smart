---
title: Known Issues
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - known-issues
  - todo
  - documentation
---

# Known Issues

> Honest list of limitations and rough edges. If you discover a new one, add it here and to `TODO.md`.

## Architecture

- **No router.** Navigation is `useState<string>` + an `if`-chain in `App.tsx`. Browser back/forward and deep links don't work for app routes. Vendor portal works around this with hash routing. Migration to `react-router-dom` (already installed) is open.
- **Fat global context.** `AppDataContext` mixes documents, folders, tags, key numbers, and ~6 threshold slices. Wide consumers re-render on any change. Splitting is a known future task.
- **No fetch layer.** Anything that needs to "save" beyond a page lifetime currently can't (except via `localStorage`).

## Auth / security

- **Mock auth only.** `LoginPage` validates against an in-repo `DEMO_PASSWORD` constant. Do **not** deploy this to a public URL without a real auth solution.
- **`localStorage` identity.** `app_current_user_id` is trivially editable in DevTools — fine for a prototype, not for production.
- **Vendor portal payload is unsigned.** The base64url payload is opaque, not signed. A real production version should use a signed token + DB lookup (noted in `vendorPortal.utils.ts`).

## Email

- **Resend default sender.** Until a domain is verified in the Resend dashboard, the `from:` address is `onboarding@resend.dev` and `to:` is restricted to the Resend account owner's signup email. This breaks any test where you email a different recipient.
- **No email-delivery feedback in the app.** A successful POST returns `{ ok: true, id }`, but the carrier-side UI doesn't poll for delivery, opens, or replies.

## Dependencies

- **`xlsx ^0.18.5`** has open CVE advisories. Worth swapping or pinning a patched fork before any real production launch.
- **`react-router-dom 7`** is installed but unused — it's listed as a runtime dep with no consumers. Remove if not migrating soon.

## Code state

- **`SafetyAnalysisPage.tsx.corrupt.bak`** in `src/pages/safety-analysis/` is a stale backup. Safe to delete on confirmation.
- **In-flight PDF report files** are untracked: `CvorPdfReport.tsx`, `FmcsaPdfReport.tsx`, `NscPdfReport.tsx`, and `generate{Cvor,Fmcsa,Nsc}Pdf.ts`. They appear coherent with the modified `InspectionsPage.tsx` and `service-types.data.ts` / `service-types.ts`. Verify against `inspectionsData.ts` / `nscInspectionsData.ts` before committing.
- **No tests, no CI.** ESLint runs but isn't enforced anywhere.

## Working tree noise

- **`dist/`** — gitignored but present locally. Ignore.
- **`test-results/`** — present, contains `logs/`, `node-fixes/`, `python/`, `stray-tsx/`, `README.md`. Probably ad-hoc; not gitignored.
- **`docs/`** has multiple versioned vendor extraction packages (Alberta v1–v7, BC v1–v7, NS v1, PEI v1–v3, CVOR v1–v6) plus zips. Decide which versions can be archived.
- **`legacy-scripts/`** — one-off Python/Node CVOR fixers. Not used by the running app (memory note: confirmed). Decide on retention.

## Documentation drift

- The previous `obsidian-vault/02 - Pages/Pages Index.md` predates the introduction of `/service-profile`, the admin pages, and the vendor portal. Updated in this session, but spot-check before relying on it.
- Many page notes are still skeletons (route + file + related links only). Filling them out is in [[Backlog]].

## Unknowns

- **Hosting target** — assumed Vercel; no `vercel.json` committed.
- **Backend plan** — unclear when/whether a real backend is added.
- **Multi-region scope** — only FMCSA + four Canadian provinces are modelled today.

## Related

- [[Next Steps]]
- [[Active Tasks]]
- [[Backlog]]
