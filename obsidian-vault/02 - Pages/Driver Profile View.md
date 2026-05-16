---
name: Driver Profile View
description: Per-driver profile page hosting identity, compliance, safety analysis breakdown, documents, inspections, violations, accidents and HOS
type: page
tags: [page, driver, profile, safety, beta]
---

# Driver Profile View

**Route:** opens inside [[Carrier Profile]] via `viewingDriverId` state — also auto-opened by deep-link from [[Beta Safety Analysis]] driver detail panel
**File:** `src/pages/profile/DriverProfileView.tsx`
**Container:** `src/pages/profile/CarrierProfilePage.tsx` (renders `DriverProfileView` when `viewingDriverId` is set)

## Purpose

Single source of truth for one driver. Tabs cover identity, compliance, documents, training, certificates, trips, HOS, inspections, violations, accidents, tickets, paystubs, and inventory.

## Deep-link from Safety Analysis (Beta)

The Beta Safety Analysis Driver tab's detail panel includes a `View profile` button that:

1. Stashes the driver id at `sessionStorage['beta-deep-link-driver-id']`.
2. Stashes the return path at `sessionStorage['beta-return-path']`.
3. Navigates to `/account/profile`.

`CarrierProfilePage` reads both keys on mount, finds the driver in its roster, auto-opens `DriverProfileView`, and remembers the return path. The driver-view Back button checks the saved return path — if present, it routes back to `/safety-analysis/beta` instead of just clearing local state.

## Overview tab

Default tab. Top-to-bottom:

1. **`DriverSafetyAnalysisSection`** — see below.
2. Compliance KPI row — Safety Score (computed) / Inspections (`N clean / M OOS`) / Violations (`N open / M OOS`) / Incidents (`N preventable`). Each card is clickable and routes to the matching tab.
3. HOS · Last 7 days card + Recent Activity card.
4. Fines (Lifetime) + Accident Costs.
5. Documents needing attention quick-list.

### `DriverSafetyAnalysisSection`

Mirrors the per-driver breakdown surfaced in [[Beta Safety Analysis]] > Driver detail panel. Same numbers, same colour palette, same component weights.

- **Header**: "Driver Safety Analysis" + descriptor + 30-day delta.
- **Large overall ring** (`DriverRing`, large) — score · `/100` · band label (Excellent / Good / Fair / Poor / Critical).
- **6 sub-rings**: Accidents · ELD / HOS · Inspections · VEDR · Violations · Status. Each tile carries a count subtitle (`{N} on record`, `{N} rule break(s)`, `roadside outcome`, `{N} events`, `{N} total · {M} OOS`, `Active driver` / `Inactive`).
- **KPI counts strip** — Accidents · Violations · OOS · HOS Breaks · VEDR Events — coloured amber when non-zero.
- **Component breakdown bar** — stacked weight ribbon + per-row breakdown (label · score bar · score · weight · event count). Components & weights:
  - Driver events × 0.22
  - HOS / ELD × 0.16
  - Telematics / VEDR × 0.12
  - Roadside inspections × 0.18
  - Incidents × 0.22
  - Training / docs × 0.10 (fixed 75 score in the prototype)

### Data source

`computeDriverScorecards(accountId)` from `src/pages/safety-analysis/fleet-safety-score.data.ts`. Section renders `null` silently if the driver isn't in the carrier scorecard list (unscoped seed records).

`accountId` is threaded from `CarrierProfilePage` → `DriverProfileView`.

## Other tabs

Profile · Documents · Training · Certificates · Trips · Hours of Service · Inspections · Violations · Accidents · Tickets · Paystubs · Inventory.

Inspections / Violations / Accidents all use the shared `SafetyRecordsPanel` (`src/components/safety/SafetyRecordsPanel.tsx`) — CVOR / NSC-by-jurisdiction / FMCSA sub-panels with KPI strip, search, date-window filter, result filter, paginated table, and an expandable per-source detail row.

## Related

- [[Beta Safety Analysis]] — origin of the deep-link
- [[Carrier Profile]] — host page
- [[Safety Analysis Spec]] — composite scoring model
