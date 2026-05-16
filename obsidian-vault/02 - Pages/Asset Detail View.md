---
name: Asset Detail View
description: Per-asset profile page hosting identity, safety analysis, compliance, maintenance, inspections, violations, accidents, expenses and inventory
type: page
tags: [page, asset, profile, safety, beta]
---

# Asset Detail View

**Route:** opens inside [[Asset Directory]] when an asset is selected
**File:** `src/pages/assets/AssetDetailView.tsx`
**Container:** `src/pages/assets/AssetDirectoryPage.tsx` (renders `AssetDetailView` when `selectedAsset` is set; that page is in turn embedded in [[Carrier Profile]])

## Purpose

Single source of truth for one asset. Tabs cover identity / overview, compliance monitoring, documents, maintenance, inventory, expenses, inspections, violations, accidents, and notifications.

## Tab order

`Overview` (default) · `Compliance Monitoring` · `Documents` · `Maintenance` · `Inventory` · `Expenses` · `Inspections` · `Violations` · `Accidents` · `Notifications`

## Overview tab

Default tab. Top-to-bottom:

1. **`AssetSafetyAnalysisSection`** — see below.
2. **KPI row** (4 clickable cards) — Safety Score (computed) · Inspections (`N clean / M OOS`) · Violations (`N open / M OOS`) · Incidents (`N preventable`). Each routes to the relevant tab on click.
3. **Maintenance summary card** — Overdue / Due / Upcoming tile chips + open / completed work-order counts + total service cost. Pulled from local `assetTasks` / `assetOrders` state.
4. **Recent activity card** — last 6 events combined from inspections / violations / incidents / completed maintenance.
5. **Asset specs card** — Unit · Plate · VIN · Make/Model · Year (with auto-computed age) · Odometer · Status (`operationalStatus`) · Ownership (`financialStructure`).
6. **Alerts card** — top 5 entries from the existing `assetAlerts` summary, each routing to the related tab on click.

### `AssetSafetyAnalysisSection`

Mirrors the per-asset breakdown surfaced in [[Beta Safety Analysis]] > Asset detail panel. Same numbers, same colour palette, same component weights.

- **Header**: "Asset Safety Analysis" + descriptor + 30-day delta.
- **Large overall ring** (`AssetRing`, large) — score · `/100` · band label.
- **6 sub-rings**: Maintenance · Inspections · Violations · Accidents · VEDR · Status. Tiles carry subtitles like `{N}/{M} overdue`, `roadside outcome`, `{N} - {M} OOS`, `{N} on record`, `telematics`, `{operationalStatus}`.
- **KPI counts strip** — Accidents · Violations · OOS · Veh Maint Viol · `Overdue WO` (`{overdue}/{total}` format).
- **Component breakdown bar** — stacked weight ribbon + per-row breakdown. Components & weights:
  - Maintenance × 0.25
  - Roadside inspections × 0.20
  - Violations × 0.20
  - Incidents × 0.20
  - Telematics / VEDR × 0.10
  - Status / readiness × 0.05 (95 if `operationalStatus === 'Active'` else 60)

### Data source

`computeAssetScorecards(accountId)` from `src/pages/safety-analysis/fleet-safety-score.data.ts`. Section renders `null` silently if the asset isn't in the carrier scorecard list.

`accountId` is threaded `CarrierProfilePage` → `AssetDirectoryPage` → `AssetDetailView`.

## Other tabs

- **Compliance Monitoring** — stat filters (Missing Number / Missing Expiry / Missing Doc / Expiring / Expired) + key-number list driven by the active filter.
- **Documents** — asset-required document list (Plate, Transponder, Insurance, custom permits) with status badges and document filters.
- **Maintenance** — schedules + tasks + work orders + create-schedule + create-order forms.
- **Inspections / Violations / Accidents** — render the shared `SafetyRecordsPanel` (`src/components/safety/SafetyRecordsPanel.tsx`).
- **Inventory** — asset-scoped inventory items (`getInventoryByAssetId`).
- **Expenses** — manual expenses + auto-derived "system" expenses from work orders.
- **Notifications** — cross-cutting alerts (`assetAlerts` memo).

## Related

- [[Beta Safety Analysis]] — Asset tab + Asset detail panel
- [[Asset Directory]] — host page
- [[Asset Maintenance]] — same data model behind the Maintenance tab
- [[Safety Analysis Spec]] — composite scoring model
