# Safety Forecast — Export & Filter Plan

> **Status:** Proposal — implementation-ready spec.
> **Predecessors:** [`SAFETY.md`](./SAFETY.md) · [`SAFETY_RISK_SCORE_ENGINE_PLAN.md`](./SAFETY_RISK_SCORE_ENGINE_PLAN.md) · [`Safety_Risk_Engine_Obsidian.md`](./Safety_Risk_Engine_Obsidian.md)
> **Last revised:** 2026-05-08.

---

## 1. Goals

The Forecast tab today projects safety scores, predicted incidents, and per-asset maintenance over a chosen horizon. This proposal extends it with:

- A **four-axis filter bar** — time, distance, location, timeline — applied to every forecast and every export.
- A **multi-format export pipeline** — multi-section CSV, multi-page A4 PDF, full-bundle ZIP — using the same `html2canvas + jsPDF` toolchain already shipping for CVOR / FMCSA / NSC reports.
- **Predefined narrative templates** for every export kind — auto-generated executive summaries, trend commentary, hotspot analysis, recommendations — so an exported PDF reads like a written report, not a data dump.

Every output is **fully dynamic** — driven by the active carrier's events, the chosen filters, and the active risk-config. No static text other than the narrative templates.

---

## 2. Filter Bar (new)

Four orthogonal filter dimensions, composable. Default = no filtering (everything in the carrier's ledger over the chosen forecast horizon).

### 2.1 Time Filter (forecast horizon — existing, unchanged)

Chip group: `1 mo · 2 mo · 3 mo · 6 mo · 12 mo · 16 mo · 18 mo · 3 yr · 5 yr`. Drives how far forward the EWMA / regression projects.

### 2.2 Distance Filter (new — for driver / asset partitioning)

Buckets driver/asset by accumulated mileage so the exported tables can be scoped to high-utilization or low-utilization fleets:

| Bucket | Range |
|---|---|
| Light | 0 – 25 k mi |
| Standard | 25 k – 50 k mi |
| Heavy | 50 k – 100 k mi |
| Long-haul | 100 k – 250 k mi |
| Veteran | 250 k mi+ |

Multi-select — picking none = no distance filter.

Source: `asset.odometer` (assets), driver-aggregated mileage from related inspection / incident records.

### 2.3 Location Filter (new — geographic scoping)

Two layers, both multi-select:

1. **Country**: `US · CA` (zero or both)
2. **Jurisdiction**: state / province codes (`CA, TX, BC, ON, …`). Drawn from the current carrier's actual `JurisdictionStats[]` so empty states don't appear.

Filter is applied **before** forecasting:
- Only events whose `jurisdictionForEvent()` matches the selected codes feed the projection.
- The **NorthAmericaMap** in the report is automatically clipped to the selected codes.
- Per-driver / per-asset tables show only entities with at least one event in the selected location.

### 2.4 Timeline Filter (new — historical window)

Chip group + custom range, controls how much **past** data feeds the model:

| Chip | Window |
|---|---|
| 7d | last 7 days |
| 30d | last 30 days |
| 90d | last 90 days |
| 6mo | last 6 months |
| 12mo | last 12 months *(default)* |
| 24mo | last 24 months |
| All | unrestricted |
| Custom | user-picked from / to dates |

Distinct from forecast horizon — `timeline` controls the look-back, `time` controls the look-forward.

### 2.5 Filter state shape

```ts
export interface ForecastFilters {
    horizonMonths: 1 | 2 | 3 | 6 | 12 | 16 | 18 | 36 | 60;
    distanceBuckets: Array<'light' | 'standard' | 'heavy' | 'long-haul' | 'veteran'>;
    countries: Array<'US' | 'CA'>;
    jurisdictions: string[];          // 2-letter codes
    timelineWindowDays: number | null; // null = all-time
    timelineFromIso?: string;          // for custom range
    timelineToIso?: string;
}
```

All filter state is local to the Forecast tab; persisted via `sessionStorage` so a refresh keeps the user's choices but doesn't pollute the global config.

---

## 3. Export Pipeline

### 3.1 Tech reuse

The CVOR / FMCSA / NSC reports already in `src/pages/inspections/` use:

- **React** components → `<div className="pdf-page">` per A4 page, fully styled
- **html2canvas** at 2× scale per page → JPEG
- **jsPDF** composes A4 portrait pages
- Off-screen mount, two paint cycles + 350 ms wait + `document.fonts.ready`
- File saved client-side

We adopt this exact pattern. No new dependencies required for PDF.

For ZIP we use the existing `jszip` (already installed).

### 3.2 Export catalog

| ID | Format | Pages | Driven by | Use case |
|---|---|---|---|---|
| `forecast-summary` | CSV | n/a | Active filters | Quick overview row |
| `forecast-points` | CSV | n/a | History + projection | Plug into BI tools |
| `driver-incidents` | CSV | n/a | Per-driver predictions | HR / safety review |
| `hotspot-locations` | CSV | n/a | Per-jurisdiction | Route planning |
| `maintenance-items` | CSV | n/a | Per-asset task | Shop scheduling |
| `combined-csv` | CSV | sectioned | All of above + alerts | Single-file workbook |
| `carrier-forecast-pdf` | PDF | 8–14 pp | Carrier-level | Executive board pack |
| `driver-forecast-pdf` | PDF | 4–8 pp | Per-driver detail | One-on-one safety review |
| `asset-forecast-pdf` | PDF | 4–8 pp | Per-asset detail | Maintenance hand-off |
| `hotspot-forecast-pdf` | PDF | 6–10 pp | Geographic focus | Operations planning |
| `full-bundle-zip` | ZIP | n/a | Everything | Audit / archival |

### 3.3 Carrier Forecast PDF (canonical multi-page report)

Pages, in order:

1. **Cover** — carrier name + DOT/CVOR/NSC badges, scope, filter summary, reporting period, generated timestamp, **config hash** for reproducibility.
2. **Executive Summary** — 3-paragraph predefined narrative (template variables filled from forecast). Score gauge inset.
3. **Forecast chart** — 24-month history + projection line + 80% confidence band, band-threshold reference lines. Predefined trend commentary below.
4. **Forecast alerts** — auto-generated band-crossing alerts list, severity-coloured.
5. **Geographic distribution** — full-width North America map (choropleth + bubbles), filtered to the active jurisdictions. Top-6 hotspot table below.
6. **Per-jurisdiction predictions** — stacked bar (events by source) + table of top jurisdictions with predicted vs past counts.
7. **Top high-risk drivers** — top 10 by composite risk score, predicted violations / accidents, last-event date, confidence.
8. **Driver-incident commentary** — predefined narrative summarising the driver risk distribution.
9. **Per-asset maintenance forecast** — top 15 upcoming items, status + service + due date + days + method.
10. **Maintenance commentary** — predefined narrative.
11. **Component breakdown** — current carrier component scores (regulatory / incidents / OOS / driver agg / asset agg).
12. **Recommendations** — auto-generated action list with severity tiers + links.
13. **Methodology** — predefined explanation of EWMA / regression / decay (paragraph + math).
14. **Filter & data lineage** — exact filter JSON, source counts, config hash, software version.

Pages 1, 5, and 11 are **always** rendered. Pages 4, 7, 9, 12 are **skipped if the underlying section is empty** (e.g., no alerts → page 4 disappears, TOC and page numbers update).

### 3.4 Driver, Asset, Hotspot PDFs

Subsets of the carrier PDF, scoped to a single entity:

- **Driver PDF**: cover · driver summary card · score gauge · individual trend chart · violation/accident table · contributors · assigned-asset breakdown · methodology
- **Asset PDF**: cover · asset summary · current condition · upcoming maintenance · service-type history · related inspections / OOS · cost projection · methodology
- **Hotspot PDF**: cover · geographic heat map (single-jurisdiction zoom) · per-jurisdiction trend · contributing drivers + assets · OOS rate sparkline · narrative · methodology

### 3.5 Full-Bundle ZIP

`safety-export-<carrier>-<period>-<configHash>.zip`:

```
/forecast/
    summary.csv
    points.csv
    driver-incidents.csv
    hotspot-locations.csv
    maintenance-items.csv
    combined.csv
/reports/
    carrier-forecast.pdf
    drivers/
        DRV-2001-forecast.pdf       (one per driver above the risk threshold)
    assets/
        a1-forecast.pdf             (one per asset with upcoming maintenance)
    hotspots/
        TX-hotspot.pdf              (one per top jurisdiction)
/meta/
    config-snapshot.json
    filters.json
    methodology.md
    README.md
```

The README documents the bundle layout + how to verify reproducibility (re-run with `config-snapshot.json` + same data → identical hashes).

---

## 4. Predefined Narrative Library

A central `narratives.ts` file with template strings + a `renderNarrative(templateKey, vars)` helper. Each template fills from variables resolved at render time.

### 4.1 Template catalog

| Key | Used in | Sample output |
|---|---|---|
| `exec.summary` | Carrier PDF p2 | "Acme Trucking is currently at a `Good` safety score of 76.2. Over the next 12 months the carrier is projected to experience approximately 14.3 violations and 1.1 accidents, with the score trending **stable** at +0.05 pts/month. Confidence in this projection is **medium** based on 18 months of history." |
| `forecast.trend` | Carrier PDF p3 | "The 12-month forward projection shows the score …" |
| `alerts.summary` | Carrier PDF p4 | "Two band-crossing alerts have been raised. The first…" |
| `hotspots.intro` | Carrier PDF p5–6 | "Three jurisdictions — TX, CA, ON — account for 62% of historical incidents and are predicted to remain primary hotspots over the forecast horizon." |
| `drivers.intro` | Carrier PDF p7–8 | "Four drivers contribute disproportionately to predicted risk. Driver J. Smith (DRV-2001) carries the highest composite risk score at 78, driven primarily by …" |
| `maintenance.intro` | Carrier PDF p9–10 | "{N} maintenance items are predicted to come due within the {horizon} window. {M} of those are flagged as overdue today and require immediate attention." |
| `recommendations.intro` | Carrier PDF p12 | "Five concrete actions are recommended based on the forecast and historical contributors. The most urgent…" |
| `methodology.body` | Carrier PDF p13 | Static spec excerpt explaining EWMA + linear regression + decay + confidence. |
| `driver.summary` | Driver PDF p2 | "{driverName} ({licenceNumber}) currently presents a {riskBand} risk profile. The driver has logged {pastViolations} violations and {pastAccidents} accidents in the trailing {timelineLabel}…" |
| `asset.summary` | Asset PDF p2 | "Unit {unitNumber} ({make} {model}, {year}) is operating in {operationalStatus} status with {odometer} miles and {engineHours} engine hours…" |
| `hotspot.summary` | Hotspot PDF p2 | "{jurisdictionName} ({code}) has accumulated {pastViolations} violations and {pastAccidents} accidents from this carrier over the last {timelineLabel}…" |

### 4.2 Variable resolver

```ts
type NarrativeVars = {
    carrierName?: string;
    horizonLabel?: string;
    timelineLabel?: string;
    safetyScore?: number;
    rating?: string;
    trend?: 'improving' | 'stable' | 'degrading';
    slope?: number;
    confidence?: 'high' | 'medium' | 'low';
    predictedViolations?: number;
    predictedAccidents?: number;
    topJurisdictions?: string[];
    topDriverNames?: string[];
    overdueMaintenanceCount?: number;
    historicalMonths?: number;
    /* …full vocabulary listed in narratives.ts */
};

renderNarrative('exec.summary', vars)  // → string
```

Tone: factual, restrained — never editorializes. Numbers always rounded for prose; raw values appear in adjacent tables.

### 4.3 Localization-ready

Templates live in one file so a future i18n pass swaps them per locale. Initial release ships English only.

---

## 5. UI

### 5.1 Filter bar (replaces today's `<HorizonFilter>` row)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Forecast Filters                                              [Reset all] │
│  Forecast horizon  ◯1mo ◯2mo ◯3mo ◯6mo ●12mo ◯16mo ◯18mo ◯3y ◯5y          │
│  History window    ◯7d ◯30d ◯90d ◯6mo ●12mo ◯24mo ◯all  [Custom range…]  │
│  Distance bucket   ☐Light ☐Standard ☑Heavy ☐Long-haul ☐Veteran            │
│  Country           ☑US ☑CA                                                │
│  Jurisdictions     [+ TX] [+ CA] [+ ON] [Search…]                         │
└──────────────────────────────────────────────────────────────────────────┘
```

Active filter chip shows in a status row: `Filtered: 12 mo · 6 mo history · Heavy mileage · TX, CA, ON · 1,243 events of 4,807`.

### 5.2 Export menu

Single button next to the filter bar opens a dropdown with three groups:

```
EXPORT
├─ CSV
│  ├─ Forecast points
│  ├─ Driver incidents
│  ├─ Hotspots
│  ├─ Maintenance items
│  └─ Combined (workbook)
├─ PDF
│  ├─ Carrier forecast report
│  ├─ Driver report (top driver)
│  ├─ Asset report (top asset)
│  └─ Hotspot report (top jurisdiction)
└─ FULL BUNDLE
   └─ ZIP — everything (CSV + PDF + meta)
```

Each item shows row counts so the user knows what they'll get before they click.

---

## 6. File Plan

```
src/pages/safety-analysis/
    risk-filters.ts                  filter types + apply()
    risk-narratives.ts               narrative templates + renderer
    risk-export-csv.ts               all CSV builders
    risk-export-pdf.ts               PDF generator dispatcher (uses html2canvas+jsPDF)
    risk-export-zip.ts               full-bundle ZIP
    pdf/
        SafetyForecastPdfReport.tsx       carrier report
        DriverForecastPdfReport.tsx
        AssetForecastPdfReport.tsx
        HotspotForecastPdfReport.tsx
        components/
            PdfPage.tsx                   <div className="pdf-page"> shell
            PdfCover.tsx
            PdfTOC.tsx
            PdfNarrativeBlock.tsx
            PdfChart.tsx                  recharts wrapper sized for A4
            PdfMap.tsx                    static North America map for PDF
            PdfTable.tsx
SafetyForecast.tsx                   adds <FilterBar/> + <ExportMenu/>
```

---

## 7. Implementation Phases

| # | Deliverable | Acceptance |
|---|---|---|
| 1 | `risk-filters.ts` + filter UI | Filter state persists in session, every section recomputes when filters change. |
| 2 | `risk-narratives.ts` | All 11 templates render with correct variable substitution. Unit-tested. |
| 3 | CSV builders for the 5 single-dataset exports + combined | Each downloads correctly, opens cleanly in Excel/Numbers/Sheets. |
| 4 | `SafetyForecastPdfReport.tsx` | Renders at A4, all 14 pages, dynamic page-skipping when sections empty. |
| 5 | `generateForecastPdf` wrapper | Uses identical pattern to `generateFmcsaPdf` — html2canvas at 2× → jsPDF compose. |
| 6 | Driver / Asset / Hotspot PDFs | Same pattern, 4–10 pages each. |
| 7 | Full-bundle ZIP | All artifacts in canonical folder layout, README + config snapshot included. |
| 8 | Export menu UI | All export kinds wired, with row counts shown. |

Estimated calendar: 5–7 days for one engineer.

---

## 8. Acceptance criteria

- Selecting "Heavy mileage in TX over last 6 months, forecast 18 months" produces a forecast that:
  1. Excludes events outside TX from the projection.
  2. Excludes events older than 6 months from the EWMA fit.
  3. Excludes drivers/assets outside the Heavy mileage bucket from per-entity tables.
  4. Re-renders the map clipped to TX.
- Carrier PDF re-runs with same filters + same config + same data → identical pages, identical config hash, identical text.
- Combined CSV opens in Excel as a single file with `# Section` markers between datasets.
- Full bundle ZIP unpacks to the exact folder layout in §3.5.
- Every chart in every PDF is rendered through recharts (no rasterised vector loss).
- Maps in PDFs use the same projection / styling as the in-app map (no visual divergence).

---

## 9. Open questions / future work

- **Per-driver / per-asset PDF generation in bulk** — the bundle today produces one PDF per top-N driver. Should bulk generation produce *all* drivers / assets for the selected carrier? It's a one-line config switch; default off to avoid 100-page bundles.
- **Server-side rendering** — current implementation is client-side. For large fleets (> 500 drivers), a server-side puppeteer pipeline would be faster. Out of scope for this proposal.
- **Email delivery** — exports are currently saved locally. Wire-up to SES / SendGrid is a future iteration.
- **Email scheduling** — "send me a weekly forecast PDF every Monday" — depends on server-side rendering.

---

## See also

- [`SAFETY.md`](./SAFETY.md) — master engine spec.
- [`SAFETY_RISK_SCORE_ENGINE_PLAN.md`](./SAFETY_RISK_SCORE_ENGINE_PLAN.md) — original architecture.
- [`Safety_Risk_Engine_Obsidian.md`](./Safety_Risk_Engine_Obsidian.md) — knowledge graph.
- [`src/pages/inspections/FmcsaPdfReport.tsx`](../src/pages/inspections/FmcsaPdfReport.tsx) — reference PDF pattern.
- [`src/pages/inspections/generateFmcsaPdf.ts`](../src/pages/inspections/generateFmcsaPdf.ts) — reference PDF generator.
