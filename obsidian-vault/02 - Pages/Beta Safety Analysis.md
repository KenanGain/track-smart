---
name: Beta Safety Analysis
description: New TrackSmart safety analysis hub — fleet score, regime breakdowns, accident/violation/driver/asset deep-dives and a forecast tab
type: page
tags: [page, safety, beta, analysis, forecast]
---

# Beta Safety Analysis

**Route:** `/safety-analysis/beta`
**File:** `src/pages/safety-analysis/BetaSafetyAnalysisPage.tsx`
**Predecessor:** [[Safety Analysis]] (`/safety-analysis`) — the legacy CVOR-style dashboard

## Purpose

A re-built safety-analysis hub that lifts the carrier's entire compliance picture into one place. Wires the carrier ledger (accidents · violations · inspections · HOS · maintenance) to a single composite Fleet Safety Score and surfaces every sub-score, contribution, jurisdictional split, drilldown list, and a 12-month forecast in one navigable shell.

## Header

- Breadcrumb: `Safety / Safety Analysis (Beta)`
- Flask icon + title `Safety Analysis`
- Sub-tab strip (live state in `activeTab: SubTabId`):

| id | label | top-level view |
| --- | --- | --- |
| `safety-dashboard` | Safety Dashboard | `SafetyDashboardView` — Fleet ring + 6 sub-rings + score breakdown + Fleet Score Trend + TrackSmart points trend |
| `accidents`        | Accidents        | `AccidentsAnalysisView` |
| `violations`       | Violations       | `ViolationsAnalysisView` — `ViolationScoreRingsPanel` (6 BASIC rings + contribution mapping) |
| `driver`           | Driver           | `DriversAnalysisView` |
| `assets`           | Assets           | `AssetsAnalysisView` |
| `forecast`         | Forecast         | `ForecastAnalysisView` |

## Safety Dashboard tab — `SafetyDashboardView`

Composite Fleet Safety Score rendered by `FleetSafetyScorePanel`:

1. **Sub-score contribution bar** above the rings — each component's slice of the 100-pt score (`SubScoreContributionBar`).
2. **Fleet ring** (large) + **6 sub-rings**: Accident · ELD / HOS · Inspection · Driver · VEDR · Roadside Violation.
   - Each ring carries a `events` count and a **Contribution** bar (per-card share of shortfall-from-100). Hover the ring tile to see purpose + focus + contribution percentage + event count.
3. **Score breakdown** (`ScoreBreakdownSection`) — component table + period changes.
4. **Fleet Score Trend** chart — 3M/6M/12M/24M selector, history + industry-average benchmark.
5. **TrackSmart points trend** (`TsPointsTrendSection`) — monthly Driver / Asset / Carrier points caused by violations; 3M/6M/12M/24M/36M selector.
6. **Regulatory cards** (CVOR / FMCSA / NSC by province) + jurisdictional drilldowns.
7. **Geographic distribution** (`GeographicDistributionPanel`) — collapsible. Choropleth + bubble overlay of North America + per-jurisdiction top list with click-to-drill-in.

## Driver tab — `DriversAnalysisView`

- `TsPointsTrendSection` scoped to `series=['driver']`.
- `DriverDistributionPanel` — band-bucket histogram (Excellent / Good / Fair / Poor / Critical).
- **`DriverRiskViolationsPanel`** — splits the violation ledger into **High / Moderate / Lower** risk buckets per driver. Left column lists drivers ordered by violation count; right column shows every individual violation for the selected driver with code · OOS / status / fine. Bucket chips are derived from `driverRiskCategory` on each violation row.
- Search + band filter + Grid / List view toggle for the per-driver scorecards (`DriverGridView` / `DriverListView`).
- Selecting a driver opens `DriverDetailPanel` — driver safety score ring + 6 sub-rings + counts strip + `DriverComponentBreakdown` + "View profile" button that deep-links to [[Driver Profile View]].

## Assets tab — `AssetsAnalysisView`

- `TsPointsTrendSection` scoped to `series=['asset']`.
- `AssetDistributionPanel` — band-bucket histogram.
- **`AssetMaintenancePanel`** — per-asset maintenance list bucketed by **Overdue / Due / Upcoming**. Backed by `computeMaintenanceForecast(account, 24mo)`. Left column lists assets ordered by overdue → due → total task count; right column shows every individual task for the selected asset with status badge · category · confidence · `Nd overdue` / `Due today` / `in Nd` and estimated cost.
- Search + band filter + Grid / List view toggle.
- Selecting an asset opens `AssetDetailPanel` — asset safety score ring + 6 sub-rings (Maintenance · Inspections · Violations · Accidents · VEDR · Status) + counts strip (Accidents · Violations · OOS · Veh Maint Viol · Overdue WO) + `AssetComponentBreakdown` + "View profile" deep-link to [[Asset Directory]] > AssetDetailView.

## Forecast tab — `ForecastAnalysisView`

12-month-history / 12-month-projection model with horizon presets (1m → 5y) and operator filters.

- **Risk-score forecast chart** (`RiskForecastChart`) — full carrier projection: history (solid) + forecast (dashed) + 80% prediction band, OLS regression damped toward the long-run mean past 36 months. Hover-to-snap reveals the focused month's score and PI bounds.
- **[[Regime Forecasts]]** — per-regulatory-regime forecasts: FMCSA / Ontario CVOR / NSC AB / BC / NS / PE. Collapsible section with an aggregate KPI strip (Avg current · Avg @ horizon · Degrading · High-risk · OOS findings · High-priority actions) and one row per regime — each row is itself collapsible to expose the chart + KPIs + recommendations.
- **Driver crash probability** (`ProbabilityList`) — top 10 drivers by `P(≥1 serious event)` (Poisson tail). Hover any row to see the per-factor breakdown driving the probability.
- **Asset maintenance probability** (`ProbabilityList`) — top 10 assets by P(maintenance-driven OOS / breakdown). Hover any row to see the hazard-rate breakdown.
- **Maintenance cost by category** (`MaintenanceCostDonut`) — donut + tabular legend.
- **Vehicle maintenance forecast** (`VehicleMaintenanceForecastTable`) — paginated, searchable, status-tab table of every projected task.

## Data sources

All UI is read from helpers in `src/pages/safety-analysis/fleet-safety-score.data.ts`:

- `computeFleetSafetyScore(accountId)` → composite + sub-scores + signals + regimes
- `computeFleetScoreTrend(accountId, months)` → monthly fleet score history
- `computeMonthlyTsPoints(accountId, months)` → Driver / Asset / Carrier point series
- `computeViolationScoreBreakdown(accountId)` → 6 BASIC rings + contribution
- `computeDriverScorecards(accountId)` / `computeAssetScorecards(accountId)`
- `computeCarrierForecast(accountId, horizonMonths, historyMonths)` → main risk-score forecast
- `computeDriverCrashForecasts(...)` / `computeAssetMaintenanceForecasts(...)` → per-row probability lists with per-factor breakdowns
- `computeMaintenanceForecast(accountId, horizonMonths)` → row table + cost donut
- `computeAllRegimeForecasts(accountId, horizonMonths, historyMonths)` → per-regime forecasts — see [[Regime Forecasts]]

Geo overlay uses `risk-geo` aggregations + `NorthAmericaMap` from the same folder.

## Related

- [[Safety Analysis]] — legacy CVOR-style dashboard
- [[Regime Forecasts]] — per-regulator forecast model
- [[Safety Events]] · [[Inspections]] · [[Violations]] · [[Incidents]]
- [[Carrier Profile]] — DOT / CVOR / NSC numbers feed regime applicability
- [[Driver Profile View]] · [[Asset Detail View]] — deep-link targets from the Driver / Asset panels
