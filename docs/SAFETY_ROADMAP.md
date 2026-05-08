# Safety Analytics — Outstanding Roadmap

> Status snapshot as of 2026-05-08. Captures the user-supplied review items
> that are NOT yet shipped, ranked by impact + effort. Use this as the
> backlog for the next iterations.
>
> See also:
> - [`SAFETY.md`](./SAFETY.md) — engine spec
> - [`SAFETY_RISK_SCORE_ENGINE_PLAN.md`](./SAFETY_RISK_SCORE_ENGINE_PLAN.md) — original plan
> - [`SAFETY_EXPORT_PLAN.md`](./SAFETY_EXPORT_PLAN.md) — export pipeline

---

## Recently shipped

### Iteration N+3 (this turn)

✅ **EWMA → Holt double-exponential** — fixed flatline bug. Both `ewmaForecast` and `ewmaProject` now track level + trend, project `level + k·trend` per month, and damp trend by `exp(−k/36)`. Alpha tunes by data density (α = 0.55 for sparse, 0.4 otherwise); β fixed at 0.2.
✅ **30-day delta badge** on the Carrier ScoreCard — derived from forecast history, shows `↑ +X.X pts · 30d` (emerald) or `↓ X.X pts · 30d` (rose).
✅ **Driver list — predicted incidents column** — at-a-glance "12.3v · 1.2a" (violations / accidents) per driver, with rose tint when accidents ≥ 0.5. Tooltip explains the 12-month projection horizon.
✅ **Heatmap drill-down drawer** — click any cell → slide-out (right side, 480px) with pair score, component breakdown, individual driver / asset scores, top shared contributors. Backdrop click + Escape close.
✅ **Heatmap auto-sort by risk** — drivers + assets sorted worst-first so red cells cluster top-left.
✅ **Heatmap "Show only Poor / Critical" filter** — checkbox dims out cells with safety ≥ 55 to surface dispatch-risk pairs in larger fleets.
✅ **Maintenance Cost-by-Category donut** — keyword-categorised spend (Brake/Tire, Engine/Trans, Steering/Susp, Body/Lights, Electrical, CVIP/Annual, Emissions/HVAC, Fluids/Oil, Other) with safety-critical categories coloured rose/violet. Side legend has count + dollars + %.
✅ **PDF JPEG → PNG** — text edges crisp at retina zoom, no JPEG artifacting. ~3× file size in exchange for premium feel.
✅ **Alert acknowledgment** — per-alert `Acknowledge ✓` button, persisted in `localStorage` under `safety:ack-alerts`, with "Hide / Show acknowledged" toggle and a `N new · M acknowledged` counter.
✅ **Dead code removed** — `_LegacyExportBar` (180 lines) + helper `csvCell` deleted; the `ExportToolbar` at the top of the page is now the only export entry point.

### Iteration N+2

✅ Driver list — `TrendArrow` (events/mo slope, ↑/↓/→) + last-event-age column. Sorted worst-first, surfaces deteriorating drivers without opening detail.
✅ Asset list — `OverdueBadge` (rose pill with count) inline next to unit number; rows resort to bubble overdue assets first.
✅ Overview — replaced the full driver×asset matrix with `TopRiskyAssignments` (3 worst pairs, compact card). Full matrix stays on Combined tab.
✅ Maintenance forecast — `estimatedCost` + `costSampleSize` on every item. Cost derived from prior completed work-orders for that service type (averaged across asset breakdowns), with a category-default fallback when no sample exists. Surfaced in the in-page table (with total row), CSV export, and PDF maintenance page (3-stat header + table emphasis on cost column + asterisk legend).
✅ PDF — alerts grouped into severity boxes (`Urgent` red / `Warning` amber / `Informational` slate), each with a colored header band.
✅ PDF — milestone data table under the forecast chart on Page 3 (Month +1, +3, +6, +12, +18, +24, +36, +60 with date · predicted · 80% lower/upper · events · OOS).

### Iteration N+1

✅ Forecast tab — fix filter consistency: carrier forecast now uses the same filtered ledger as the visible event count. `forecastCarrierRisk(carrierId, horizon, cfg, maintByMonth, filters)`.
✅ Overview — `SourceCoverageCard` showing every source (FMCSA / CVOR / NSC AB-BC-PE-NS / 6 internal sources) with enrolment status, event count, native + normalized score, newest / oldest event date.
✅ PDF — dynamic band thresholds (read from active `RiskConfig.bands`, not hard-coded 85/70/55/35).
✅ Bundle ZIP — includes `meta/risk-config.json` snapshot for reproducibility.
✅ Filter UI — invalid custom range (`from > to`) is detected, warned, and ignored instead of zeroing the ledger. Date inputs constrain `min`/`max` to prevent the bug recurring.
✅ ForecastGuide — preset scenario chips with rationale, plus a glossary table.
✅ Color scheme — primary brand colour switched from slate-900 to blue-600 across forecast UI.
✅ HowComputed — explanation card visible on Overview + Forecast (not just hover tooltip).

---

## Open roadmap — Overview tab

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Native score beside normalized** in source pills | `SourceScore` already carries `nativeScore` + `nativeLabel`. Surface them in `<SourcesCard>` (currently hides native by default). |
| ★★★ | **"Why did the score change?"** panel | Compare current `EntityRiskScore` to a snapshot N days ago. Requires a per-carrier score-snapshot table. |
| ★★ | **Top 5 carrier risks by impact** | One-line "the score is X because of Y, Z, ..." summary derived from `topContributors[]`. |
| ★★ | **Drilldown to raw evidence** | Each contributor row → opens the underlying inspection / incident / violation in a side panel. |

---

## Open roadmap — Drivers tab

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Predicted columns in driver list** (violations, accidents, trend, last event) | Already in `DriverIncidentForecast` — surface in the existing `DriverList` table. |
| ★★★ | **Carrier + Driver score view** | Engine supports `kind: 'carrierDriver'` already; add a tab toggle on `DriverDetail`. |
| ★★ | **Filters by source / domain / preventability / jurisdiction** | New filter dropdown above the driver list, similar to the forecast filter bar. |
| ★★ | **Score contribution waterfall** | Already partially in `topContributors`. Add a recharts waterfall chart to `DriverDetail`. |
| ★ | **Event timeline + HOS/VEDR clusters** | Requires HOS + VEDR adapters to actually populate the ledger (see "Internal source merge" below). |
| ★ | **Compare to fleet median + similar exposure** | Add z-score column relative to drivers in same `distanceBucket`. |

---

## Open roadmap — Assets tab

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Maintenance / WO into asset score** | `forecastCarrierMaintenance` is computed but not feeding `scoreAsset`. Add a `maintenanceComponent` to the asset formula in `risk-scoring.ts`. |
| ★★★ | **Predicted columns in asset list** | Open WOs, overdue maint, OOS count, registration/CVIP expiry, last inspection date — surface in `AssetList`. |
| ★★★ | **Carrier + Asset score view** | Engine supports `kind: 'carrierAsset'`; add tab on `AssetDetail`. |
| ★★ | **Asset readiness indicator** | Derived label: `safe / monitor / avoid long-haul / do not dispatch`. Pure function on the existing score + open WO count. |
| ★★ | **Defect categories chart + cost projection** | Build a small recharts panel on `AssetDetail`. |
| ★ | **Assigned-driver risk influence** | Cross-reference driver assignments → the asset's risk picks up driver-induced events. |

---

## Open roadmap — Combined tab

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Mode switch**: Driver+Asset · Carrier+Driver · Carrier+Asset · Carrier+Driver+Asset | Engine supports all four; UI currently only shows DriverAsset matrix. Add a pill switcher. |
| ★★★ | **Real assignment data** instead of round-robin | Wire to dispatch / trip data when available; the matrix today samples `i % 5 !== j % 5`. |
| ★★ | **Sortable worst-combinations table** | Sort by combined score; filter by threshold. |
| ★★ | **Pair detail page** | Click any cell → drill into shared events, jurisdiction exposure, defects under that driver. |
| ★ | **Dispatch recommendation** | "Best available driver/asset for this lane" — needs a load-board feed. |

---

## Open roadmap — Forecast tab

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Backtest / model validation** | Withhold last N months, re-forecast, compute MAE / MAPE. Display alongside R² on the summary card. |
| ★★★ | **Forecast confidence reasons** | Replace single `'high' / 'medium' / 'low'` with reason chips: "sparse data" · "high residual" · "missing source" · "long horizon". |
| ★★★ | **Source contribution forecast** | Decompose predicted events by source (FMCSA / CVOR / NSC / internal). Show stacked bar of contribution. |
| ★★ | **Scenario mode** | "What if overdue maintenance completed" → re-run forecast with overdue items zeroed. Same for "remove top-3 high-risk drivers." |
| ★★ | **Exposure-normalized forecast** | Toggle: per 100 inspections / per 100k miles / per active asset / per driver-month. |
| ★ | **Seasonality** | Replace EWMA + linear with Holt-Winters (additive seasonal). Requires ≥ 24 months of data. |

---

## Open roadmap — Internal source merge

The canonical risk ledger today reliably ingests FMCSA · CVOR · NSC · incidents.
HOS / VEDR / maintenance / training / documents have adapter stubs in
`risk-adapters.ts` but are not yet wired into `risk-load.ts`.

| Priority | Source | Notes |
|---|---|---|
| ★★★ | **Maintenance + work orders** | `forecastCarrierMaintenance` runs separately. Promote overdue items into the canonical ledger as `kind: 'maintenance'` events so they contribute to the asset score. |
| ★★★ | **HOS / ELD violations** | Adapter exists; needs a per-carrier HOS data shape exported from `safety-analysis.data.ts`. |
| ★★ | **VEDR / camera events** | Adapter exists; needs `getVedrEventsFor(carrierId)` in the data layer. |
| ★★ | **Training expirations** | Adapter exists; needs `getTrainingFor(carrierId)`. |
| ★ | **Documents (registration / DOT card)** | Adapter exists; needs `getDocumentsFor(carrierId)`. |

For each: build the per-carrier loader, add to `loadRiskEventsForCarrier`, watch `SourceCoverageCard` flip from `Internal · 0 events` → `Internal · N events`.

---

## Open roadmap — PDF reports

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Real carrier name** in PDFs | `ExportToolbar` falls back to `carrierId.slice(-6)` when label isn't passed in. Wire `carrierName` from the page header through to all export entry points. |
| ★★★ | **Source breakdown page** | New PDF page listing every source with native + normalized + event count + freshness (mirrors `SourceCoverageCard`). |
| ★★★ | **Component scores page** | Replace placeholder with the same component breakdown bar shown in the UI. |
| ★★★ | **Settings snapshot page** | Pretty-printed JSON of `RiskConfig` + bands + `criticalOverrides` + a config hash badge. |
| ★★ | **Forecast reliability page** | R² · σ · band visualization · backtest error · missing data warnings. |
| ★★ | **Driver / Asset / Hotspot PDFs** | Plan in `SAFETY_EXPORT_PLAN.md` §3.4. Templates are stubbed; need their own React components and generators (mirror of `generateForecastPdf`). |
| ★★ | **Per-entity PDFs in bundle** | When `riskScore ≥ threshold`, generate one PDF per driver/asset and zip it under `reports/drivers/` and `reports/assets/`. |
| ★ | **PDF QA gate** | After `html2canvas` capture, verify each `.pdf-page` has non-zero rendered pixels and no clipping. Fail loud. |

---

## Open roadmap — UX strategy (deferred from this iteration)

| Priority | Item | Notes |
|---|---|---|
| ★★★ | **Migrate PDFs from html2canvas → @react-pdf/renderer** | Today's report is rasterised: large file size, blurry on retina, text not selectable. Native PDF vectors would give selectable text, smaller files, sharper prints. Big effort: every page needs to be rebuilt with `@react-pdf/renderer` primitives (charts via `react-pdf-svg` or pre-rendered SVG). |
| ★★★ | **Global date / filter context** | Top-level rolling-window picker next to `CarrierSwitcher` so the whole dashboard (not just Forecast) can rewind to "what did this look like 6 months ago." Requires snapshotting events by date and re-running scoring against historical cutoffs. |
| ★★★ | **What-if scenario sliders on Forecast** | Sliders for "reduce HOS −20%", "remove top-3 drivers", "complete all overdue maintenance" → live re-projection. Requires a `scenarioOverrides` parameter on the forecast pipeline that adjusts the EWMA series before fitting. |
| ★★ | **Quick-action buttons on Recommendations** | Each recommendation opens the relevant flow pre-filled (Schedule Brake Maintenance → opens Work Order modal with asset pre-selected). |
| ★★ | **Industry benchmark line on RiskTrendChart** | Pull peer + national averages from CSA / NSC if data is available; render as a comparison line on the chart. |
| ★★ | **Combined tab — drill-down drawer + filters** | Click any heatmap cell → side-drawer with shared events / shared OOS / per-jurisdiction exposure. Plus filter to "show only Poor/Critical" + scope-mode switcher (D+A · C+D · C+A · C+D+A). |
| ★ | **Progressive disclosure** | Add `defaultCollapsed` to dense Overview cards (`SourceCoverageCard`, `DomainRadarChart`). |
| ★ | **PDF — Methodology / Lineage moved to formal Appendix** | Smaller font, dedicated "Appendix" eyebrow, distinct page numbering (A1, A2…). Keeps pp 1–8 strictly business-outcomes. |

---

## Suggested next-iteration scope (one-week ship)

If picking ~5 days of work, this combination delivers the highest perceived value:

1. **Driver/Asset list — predicted columns** (1 day) — already-computed data, just needs UI columns.
2. **Engine — merge maintenance into ledger** (1 day) — closes a real correctness gap.
3. **Forecast — backtest + reliability badge** (1 day) — answers "should I trust this?" upfront.
4. **PDF — settings + source breakdown + component pages** (1.5 days) — turns the report into a defensible audit artifact.
5. **Combined tab — scope mode switch** (0.5 days) — exposes existing engine capability.

Anything beyond that should slot into a Phase 2 scope after this lands and gets reviewed.
