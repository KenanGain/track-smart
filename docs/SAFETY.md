# Safety Risk Score Engine — Master Specification

> **Status:** Implementation-ready spec. Combines `SAFETY_RISK_SCORE_ENGINE_PLAN.md` (architecture) with concrete data-extraction, UI, chart, and export contracts.
> **Owners:** Safety / Compliance squad.
> **Last revised:** 2026-05-08.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Goals & Scopes](#2-goals--scopes)
3. [Data Sources & JSON Extraction](#3-data-sources--json-extraction)
4. [Canonical Risk Event Ledger](#4-canonical-risk-event-ledger)
5. [Source Normalization](#5-source-normalization)
6. [Recency, Decay, Exposure](#6-recency-decay-exposure)
7. [Confidence Model](#7-confidence-model)
8. [Score Calculation by Scope](#8-score-calculation-by-scope)
9. [Score Bands & Distribution](#9-score-bands--distribution)
10. [UI Component Library](#10-ui-component-library)
11. [Live Dynamic Charts](#11-live-dynamic-charts)
12. [Settings Page (Safety)](#12-settings-page-safety)
13. [Exports — CSV / PDF / Full ZIP / XLSX](#13-exports)
14. [File / Module Plan](#14-file--module-plan)
15. [Implementation Roadmap](#15-implementation-roadmap)
16. [Testing Plan](#16-testing-plan)
17. [Edge Cases & Open Questions](#17-edge-cases--open-questions)
18. [Glossary](#18-glossary)

---

## 1. Executive Summary

A unified, deterministic, fully-explainable risk scoring engine that consumes every safety signal already present in the app — FMCSA SMS, Ontario CVOR, NSC profiles for Alberta / British Columbia / PEI / Nova Scotia, internal incidents, HOS/ELD, VEDR telematics, maintenance / work orders, training and document compliance — and produces a single 0–100 safety score (and reciprocal 0–100 risk score) at seven scopes:

| # | Scope | Question it answers |
|---|---|---|
| 1 | Carrier | How risky is this company overall? |
| 2 | Driver | How risky is this driver? |
| 3 | Asset | How risky is this vehicle? |
| 4 | Driver + Asset | How risky is this driver behind this vehicle? |
| 5 | Carrier + Driver | How risky is this driver inside this carrier's environment? |
| 6 | Carrier + Asset | How risky is this vehicle inside this carrier's maintenance regime? |
| 7 | Carrier + Driver + Asset | How risky is this complete dispatch unit? |

Every score is built from **the same** canonical `RiskEvent` ledger, so the math is consistent across pages, charts, and exports — no number drift.

Design pillars:

- **Source-honest:** FMCSA, CVOR, and each NSC jurisdiction keep their native score visible alongside the normalized 0–100.
- **Available-only blending:** missing enrollments don't penalize a carrier (configurable).
- **Confidence-aware:** sparse data → "low confidence" badge, never silently scored as safe.
- **Pure functions first:** UI, charts, and exports all call the same engine functions.
- **Live & reactive:** every chart subscribes to the engine via `useSyncExternalStore`; settings changes recompute and re-render in <50 ms for typical fleets.
- **Explainable:** every score carries `topContributors` and `recommendations` for drill-down.

---

## 2. Goals & Scopes

### 2.1 Functional goals

- One engine, seven scopes (above).
- Configurable thresholds, equivalency, weights — saved per carrier in `localStorage` (key: `safety:risk-config:<accountId>`).
- Live charts that re-render the moment events arrive or settings change.
- CSV / PDF / Full-ZIP / XLSX export — reproducible from a config snapshot.
- Auditable: every score row exposes which events drove it, in which proportion.

### 2.2 Non-goals (explicit)

- No machine-learning model. The engine is deterministic and rule-based; ML can sit on top later as a "predicted-trajectory" layer.
- No real-time crash prediction. Scoring summarizes history + current state; it does not forecast incidents.
- No replacement of FMCSA / CVOR / NSC native ratings — those continue to display verbatim.

### 2.3 Scope identifiers

```ts
type RiskScope =
  | { kind: 'carrier'; carrierId: string }
  | { kind: 'driver';  carrierId: string; driverId: string }
  | { kind: 'asset';   carrierId: string; assetId: string }
  | { kind: 'driverAsset';        carrierId: string; driverId: string; assetId: string }
  | { kind: 'carrierDriver';      carrierId: string; driverId: string }
  | { kind: 'carrierAsset';       carrierId: string; assetId: string }
  | { kind: 'carrierDriverAsset'; carrierId: string; driverId: string; assetId: string };
```

A scope is the only input the public API needs:

```ts
computeRiskScore(scope: RiskScope, settings?: SafetySettings): EntityRiskScore;
```

---

## 3. Data Sources & JSON Extraction

This section enumerates **every existing JSON / data file** and shows the exact extractor that converts it into `RiskEvent[]`. Every adapter is a pure function: `(rawSource, carrierId) => RiskEvent[]`.

### 3.1 Source inventory (current files)

| Source | File(s) | Native shape |
|---|---|---|
| FMCSA SMS roadside | `src/pages/inspections/inspectionsData.ts` | `{id, date, driverId, assetId, vehiclePlate, vin, state, violations, smsPoints, oos}` |
| FMCSA carrier profile | `src/data/carrier-safety-data.ts → fmcsa` | `{usDot, basicScores: {[basic]: {percentile, alert, threshold}}, …}` |
| CVOR carrier profile | `src/data/carrier-safety-data.ts → cvor` | `{rating, collisions: {percentage,…}, convictions: {…}, inspections: {…}, oosRate, travelKm[]}` |
| CVOR intervention events | `src/pages/inspections/cvorInterventionEvents.data.ts` | `CvorInterventionEvent[]` (already has `assetId` / `driverId` after fix) |
| NSC AB profile | `src/data/carrier-safety-data.ts → nsc.AB` | `{rFactor, monitoringStage, conviction, admin, cvsa, collisions, stageThresholds}` |
| NSC BC profile | `src/data/carrier-safety-data.ts → nsc.BC` | `{profileStatus, contraventionScore, cvsaOosScore, accidentScore, totalScore, thresholds}` |
| NSC PE profile | `src/data/carrier-safety-data.ts → nsc.PE` | `{collisionPoints, convictionPoints, inspectionPoints, activeVehicles, safetyRating}` |
| NSC NS profile | `src/data/carrier-safety-data.ts → nsc.NS` | `{convictionScore, inspectionScore, collisionScore, totalScore, level, levelThresholds}` |
| NSC inspections | `src/pages/inspections/nscInspectionsData.ts` | `NscInspectionRecord[]` (already carries `primaryVehicle.assetId`, `driverLink.driverId`) |
| Incidents | `src/data/incidents.data.ts` | `{id, carrierId?, driverId, assetId, date, severity, preventable, fatal, injury, tow, cost}` |
| HOS / ELD | `src/data/hos.data.ts`, `safety-analysis.data.ts` | `{driverId, date, violationType, severity, oos}` |
| VEDR / telematics | `src/data/safety-analysis.data.ts` | `{driverId, assetId, date, eventType, severity, tags}` |
| Maintenance | `src/pages/assets/maintenance.data.ts` | `{assetId, type, dueDate, completedDate, overdue, severity}` |
| Work orders | `src/data/carrier-work-orders.data.ts` | `{assetId, status, openedDate, closedDate, serviceType, cost}` |
| Training | `src/data/training.data.ts` | `{driverId, courseId, completedDate, expiryDate, mandatory}` |
| Documents | `src/data/carrier-documents.data.ts` | `{driverId?, assetId?, type, expiryDate, status}` |

### 3.2 Adapter contract

```ts
// src/pages/safety-analysis/risk-adapters.ts

export interface RiskAdapter<TRaw> {
  source: RiskSource;
  /** Pure conversion. Adapter never mutates input. */
  toEvents(raw: TRaw, ctx: AdapterContext): RiskEvent[];
}

export interface AdapterContext {
  carrierId: string;
  /** ISO today — pass in for testability. */
  today: string;
  /** Resolver helpers shared across adapters. */
  resolveDriver(query: DriverQuery): string | undefined;
  resolveAsset(query: AssetQuery):  string | undefined;
}
```

### 3.3 Adapter — FMCSA SMS roadside

```ts
export const fmcsaInspectionAdapter: RiskAdapter<typeof inspectionsData> = {
  source: 'fmcsa',
  toEvents(rows, ctx) {
    const out: RiskEvent[] = [];
    for (const r of rows) {
      // Carrier filter — events that don't match this carrier are skipped.
      const driverId = ctx.resolveDriver({ id: r.driverId, name: r.driver });
      const assetId  = ctx.resolveAsset({ id: r.assetId, plate: r.vehiclePlate, vin: r.vin });
      if (!driverId && !assetId) continue;

      for (const v of r.violations ?? []) {
        out.push({
          id: `fmcsa:${r.id}:${v.code}`,
          carrierId: ctx.carrierId,
          source: 'fmcsa',
          domain: mapBasicToDomain(v.basic),     // Unsafe/HOS/Vehicle/Driver/Hazmat/Crash
          kind: 'violation',
          date: r.date,
          driverId,
          assetId,
          severity: clampSeverity(v.severityWeight ?? 5),
          points: v.smsPoints ?? 0,
          oos:   !!v.oos,
          confidence: 'high',
          raw: v,
        });
      }
    }
    return out;
  }
};
```

### 3.4 Adapter — FMCSA carrier profile (BASIC percentiles)

```ts
export const fmcsaProfileAdapter: RiskAdapter<FmcsaProfile> = {
  source: 'fmcsa',
  toEvents(p, ctx) {
    return Object.entries(p.basicScores ?? {}).map(([basic, b]) => ({
      id: `fmcsa-basic:${basic}:${p.usDot}`,
      carrierId: ctx.carrierId,
      source: 'fmcsa',
      domain: mapBasicToDomain(basic),
      kind: 'violation',
      date: ctx.today,
      severity: percentileToSeverity(b.percentile),  // 0..10
      points: 0,
      oos: false,
      confidence: b.percentile != null ? 'high' : 'low',
      preventable: undefined,
      raw: { basic, ...b },
    }));
  }
};
```

### 3.5 Adapter — CVOR profile + intervention events

```ts
export const cvorProfileAdapter: RiskAdapter<CvorProfile> = {
  source: 'cvor',
  toEvents(p, ctx) {
    return [
      mkProfileEvent('crash',      'collision',  p.collisions,  ctx),
      mkProfileEvent('conviction', 'conviction', p.convictions, ctx),
      mkProfileEvent('inspection', 'inspection', p.inspections, ctx),
    ];
  }
};

export const cvorInterventionAdapter: RiskAdapter<CvorInterventionEvent[]> = {
  source: 'cvor',
  toEvents(events, ctx) {
    return events.map((e) => ({
      id: `cvor-evt:${e.id}`,
      carrierId: ctx.carrierId,
      source: 'cvor',
      domain: e.type === 'collision' ? 'crash'
            : e.type === 'conviction' ? 'conviction'
            : 'inspection',
      kind: e.type,
      date: e.date,
      driverId: ctx.resolveDriver({ id: e.driverId, licence: e.driverLicence, name: e.driverName }),
      assetId:  ctx.resolveAsset({ id: e.assetId,  plate: e.vehicle1?.plate,  unit: e.vehicle1?.unit }),
      severity: cvorEventSeverity(e),       // 0..10
      points:   e.pointsTotal ?? e.vehiclePoints ?? 0,
      oos:      (e.oosCount ?? 0) > 0,
      confidence: 'high',
      raw: e,
    }));
  }
};
```

### 3.6 Adapter — NSC (jurisdiction-specific)

Each jurisdiction has a different native score; adapter normalizes to severity (0–10) via the rules in §5.

```ts
nscAbAdapter, nscBcAdapter, nscPeAdapter, nscNsAdapter
```

NSC inspections (`NSC_INSPECTIONS`) flow through one shared `nscInspectionAdapter` that emits a `RiskEvent` per row, tagged with the jurisdiction in `source: 'nsc:<JUR>'`.

### 3.7 Adapter — Internal sources

`incidentAdapter`, `hosAdapter`, `vedrAdapter`, `maintenanceAdapter`, `workOrderAdapter`, `trainingAdapter`, `documentAdapter` — all follow the same contract, all keyed to `carrierId + driverId? + assetId?`.

### 3.8 Master loader

```ts
// src/pages/safety-analysis/risk-load.ts

export function loadRiskEventsForCarrier(carrierId: string): RiskEvent[] {
  const ctx = makeAdapterContext(carrierId);
  return [
    ...fmcsaInspectionAdapter.toEvents(inspectionsData,             ctx),
    ...fmcsaProfileAdapter.toEvents(getCarrierFmcsa(carrierId),     ctx),
    ...cvorProfileAdapter.toEvents(getCarrierCvor(carrierId),       ctx),
    ...cvorInterventionAdapter.toEvents(cvorInterventionEvents,     ctx),
    ...nscAbAdapter.toEvents(getCarrierNsc(carrierId, 'AB'),        ctx),
    ...nscBcAdapter.toEvents(getCarrierNsc(carrierId, 'BC'),        ctx),
    ...nscPeAdapter.toEvents(getCarrierNsc(carrierId, 'PE'),        ctx),
    ...nscNsAdapter.toEvents(getCarrierNsc(carrierId, 'NS'),        ctx),
    ...nscInspectionAdapter.toEvents(NSC_INSPECTIONS,               ctx),
    ...incidentAdapter.toEvents(getIncidents(carrierId),            ctx),
    ...hosAdapter.toEvents(getHosViolations(carrierId),             ctx),
    ...vedrAdapter.toEvents(getVedrEvents(carrierId),               ctx),
    ...maintenanceAdapter.toEvents(getMaintenance(carrierId),       ctx),
    ...workOrderAdapter.toEvents(getWorkOrders(carrierId),          ctx),
    ...trainingAdapter.toEvents(getTraining(carrierId),             ctx),
    ...documentAdapter.toEvents(getDocuments(carrierId),            ctx),
  ];
}
```

The result is **one ledger** that powers every score, chart, and export.

---

## 4. Canonical Risk Event Ledger

```ts
export type RiskSource =
  | 'fmcsa' | 'cvor'
  | 'nsc:AB' | 'nsc:BC' | 'nsc:PE' | 'nsc:NS'
  | 'internal:incident' | 'internal:hos' | 'internal:vedr'
  | 'internal:maintenance' | 'internal:workOrder'
  | 'internal:training'   | 'internal:document';

export type RiskDomain =
  | 'crash' | 'unsafeDriving' | 'hos'
  | 'vehicleMaintenance' | 'driverFitness'
  | 'controlledSubstance' | 'hazmat'
  | 'inspection' | 'conviction' | 'collision'
  | 'assetHealth' | 'training' | 'documentCompliance';

export type RiskKind =
  | 'inspection' | 'violation' | 'collision' | 'conviction'
  | 'crash' | 'maintenance' | 'training' | 'document' | 'profile';

export interface RiskEvent {
  id: string;
  carrierId: string;
  source: RiskSource;
  domain: RiskDomain;
  kind:   RiskKind;
  date:   string;     // YYYY-MM-DD
  driverId?: string;
  assetId?:  string;
  severity:  number;  // 0..10 normalized
  points:    number;  // source-native
  oos:       boolean;
  preventable?: boolean;
  confidence: 'high' | 'medium' | 'low';
  raw: unknown;
}
```

The ledger is **append-only conceptually**; every adapter run regenerates from raw, never mutates events in place. This is what makes scores deterministic.

---

## 5. Source Normalization

Each source maps native units → normalized 0–100 source safety score `S` and per-event severity `σ ∈ [0,10]`.

### 5.1 FMCSA / SMS

| Native | Mapping |
|---|---|
| BASIC percentile `p` | `S_basic = 100 - p`; `σ = clamp(p / 10, 0, 10)` |
| Alert flag | If `percentile ≥ threshold` → severity floor = 7 |
| Violation `smsPoints` + OOS | `σ = clamp(smsPoints + (oos ? 4 : 0), 0, 10)` |
| Crash indicator | severity floor 8 if BASIC alert |

Source safety: `S_FMCSA = mean(S_basic over enrolled BASICs)`.

### 5.2 CVOR

| Native | Mapping |
|---|---|
| `cvorAnalysis.rating %` | `S_CVOR = clamp(100 - rating, 0, 100)` |
| `collisions.percentage` | component `S_collision = 100 - percentage` |
| `convictions.percentage` | component `S_conviction = 100 - percentage` |
| `inspections.percentage` | component `S_inspection = 100 - percentage` |
| Intervention event OOS | `σ = 10` |
| Conviction with `points` | `σ = clamp(2 + points, 0, 10)` |
| Collision charged Y, with `points` | `σ = clamp(4 + points × 0.5, 0, 10)` |

### 5.3 NSC Alberta

```
abRisk =
  stage === 'NotMonitored' ? 10 :
  stage === 'Stage1' ? 17 :
  stage === 'Stage2' ? 33 :
  stage === 'Stage3' ? 50 :
  stage === 'Stage4' ? 75 : 50;

S_AB = clamp(100 - abRisk - rFactorSurcharge(rFactor), 0, 100);
```

`rFactorSurcharge` adds 0–15 pts depending on how far past the stage threshold the R-Factor sits. Defaults are editable in Settings → Safety → NSC Alberta.

### 5.4 NSC British Columbia

| Profile status | Default `S_BC` band |
|---|---|
| Satisfactory | 85 |
| Conditional | 65 |
| Unsatisfactory | 35 |
| Unrated / NotMonitored | 80 (low confidence) |

Plus per-component:

```
S_BC_contravention = 100 - normalize(contraventionScore, bcThresholds.contravention)
S_BC_cvsa          = 100 - normalize(cvsaOosScore,       bcThresholds.cvsa)
S_BC_accident      = 100 - normalize(accidentScore,      bcThresholds.accident)
S_BC = (statusBand + 0.5 × min(S_BC_contravention, S_BC_cvsa, S_BC_accident)) / 1.5
```

### 5.5 NSC Prince Edward Island

```
totalPts = collisionPoints + convictionPoints + inspectionPoints
ppv      = totalPts / max(1, activeVehicles)
peRisk   = clamp(ppv × peMultiplier, 0, 100)   // peMultiplier configurable
S_PE     = 100 - peRisk
```

### 5.6 NSC Nova Scotia

```
total = convictionScore + inspectionScore + collisionScore
S_NS  = total ≤ level1 ? 95
      : total ≤ level2 ? 75
      : total ≤ level3 ? 50
      : 25
```

### 5.7 Internal sources (severity tables)

| Source | Severity rule |
|---|---|
| Incident — fatal | 10, preventable→+0, non-preventable→−1 |
| Incident — injury | 8 |
| Incident — tow | 5 |
| Incident — property only | 3 |
| HOS — driving over limit | 7 |
| HOS — log falsification | 9 |
| HOS — minor form/manner | 2 |
| VEDR — collision-class event | 8 |
| VEDR — harsh-brake critical | 5 |
| VEDR — speed > 15 mph over | 4 |
| Maintenance — overdue >30d | 4 |
| Maintenance — open OOS-prone (brake/tire) | 7 |
| Work order — unresolved past due | 5 |
| Training — mandatory expired | 6 |
| Document — registration expired | 8 |
| Document — DOT card expired | 6 |

---

## 6. Recency, Decay, Exposure

### 6.1 Decay curve

Default half-life = **12 months**. Override per setting `recencyHalfLifeMonths`.

```
weight(eventDays) = 0.5 ^ (eventDays / (halfLifeMonths × 30))
                  × stepDecay(eventDays)
```

With banded `stepDecay`:

| Age | Step factor |
|---|---|
| 0–6 months | 1.00 |
| 6–12 months | 0.80 |
| 12–24 months | 0.50 |
| 24+ months | 0.0 (excluded) |

### 6.2 Exposure denominators

| Scope | Default exposure |
|---|---|
| Carrier | `max(fleetSize, driverCount)` |
| Driver | `activeDays / 365` capped at 1.0 |
| Asset | `min(odometer / 100k, 1.0)` |

`weightedRaw / (cap × exposureFactor)` → final raw, then × 100, clamped 0–100.

### 6.3 Hard cutoff

Setting `hardCutoffMonths` (default 36) drops events older than that — they don't decay forever.

---

## 7. Confidence Model

Every score returns `confidence: 'high' | 'medium' | 'low'`.

| Scope | High | Medium | Low |
|---|---|---|---|
| Carrier | ≥1 regulatory source AND (≥5 inspections OR ≥12 mo data) | ≥1 source, sparse | No regulatory + <3 events |
| Driver | ≥3 events OR ≥90 active days | 1–2 events | 0 events |
| Asset | ≥3 inspections OR registration+odometer | 1–2 events | 0 events |
| Combined | both contributing entities high AND ≥1 shared event | otherwise | one entity low |

**Low confidence ≠ low risk.** UI shows `Low confidence` badge; recommendations are downgraded to "verify" rather than "act."

---

## 8. Score Calculation by Scope

### 8.1 Generic pipeline

```
collect → filter(scope) → normalize(severity)
       → applyDecay(weight) → applyExposure
       → groupByDomain → componentScore
       → weightedCombine(componentWeights[scope])
       → clamp(0..100)
       → attachContributors + recommendations + confidence
```

### 8.2 Carrier formula

```
Safety_Carrier
  = 0.45 × Regulatory
  + 0.20 × Incidents
  + 0.15 × InspectionsOOS
  + 0.10 × DriverAggregate
  + 0.10 × AssetAggregate
```

`Regulatory = weightedMean({ FMCSA, CVOR, NSC_home, NSC_other })` over enrolled sources only.

Default source weights (editable):

| Source | Weight |
|---|---|
| FMCSA | 0.35 |
| CVOR | 0.30 |
| NSC home jurisdiction | 0.25 |
| Additional NSC jurisdictions (split) | 0.10 |

If only one source is enrolled, it gets 1.0 of the regulatory bucket.

### 8.3 Driver formula

```
Safety_Driver
  = 0.35 × DriverEvents
  + 0.20 × HOS
  + 0.15 × Telematics
  + 0.15 × RoadsideInspections
  + 0.10 × Incidents (preventability-weighted)
  + 0.05 × Training
```

### 8.4 Asset formula

```
Safety_Asset
  = 0.25 × AssetMaintenance
  + 0.25 × AssetStatusAge
  + 0.25 × AssetInspectionsOOS
  + 0.15 × AssetViolations
  + 0.10 × AssetIncidents
```

### 8.5 Combined formulas

| Scope | Formula |
|---|---|
| Driver + Asset | `0.45 × Driver + 0.35 × Asset + 0.20 × SharedHistory` |
| Carrier + Driver | `0.70 × Driver + 0.20 × CarrierRegulatory + 0.10 × FleetPeer` |
| Carrier + Asset | `0.70 × Asset + 0.20 × CarrierRegulatory + 0.10 × FleetPeer` |
| Carrier + Driver + Asset | `0.35 × Driver + 0.30 × Asset + 0.20 × CarrierReg + 0.15 × Shared` |

`SharedHistory` = score over events where `driverId === d AND assetId === a`. If empty, neutral 80 with `low` confidence.

`FleetPeer` = percentile rank of the entity within its carrier's distribution × 100.

### 8.6 Output type

```ts
export interface EntityRiskScore {
  scope: RiskScope;
  safetyScore: number;          // 0..100, higher = safer
  riskScore: number;            // 100 - safetyScore
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  confidence: 'high' | 'medium' | 'low';
  sourceScores: SourceScore[];           // FMCSA, CVOR, NSC:AB, NSC:BC, …
  componentScores: ComponentScore[];     // crash, hos, vehicleMaintenance, …
  perJurisdiction: Record<string, number>;
  topContributors: RiskContribution[];   // ordered, max 10
  recommendations: RiskRecommendation[]; // text + action key + severity
  generatedAt: string;
  configHash: string;                    // SHA-1 of settings snapshot
}
```

---

## 9. Score Bands & Distribution

### 9.1 Default bands

| Band | Default range (safety) | Color token |
|---|---|---|
| Excellent | 85–100 | `emerald-500` |
| Good | 70–84 | `lime-500` |
| Fair | 55–69 | `amber-500` |
| Poor | 35–54 | `orange-500` |
| Critical | 0–34 | `rose-600` |

Sliders in Settings → Safety let users move thresholds; UI live-previews fleet histogram.

### 9.2 Distribution outputs

```ts
type ScoreDistribution = {
  scope: 'driver' | 'asset' | 'driverAsset' | 'source' | 'jurisdiction';
  buckets: { band: Rating; count: number; pct: number }[];
  total: number;
  median: number;
  p10: number;
  p90: number;
};
```

---

## 10. UI Component Library

Every component lives under `src/components/safety/risk/`. Each has a docblock, a Storybook (or test page) entry, and is composed from `shadcn/ui` primitives.

### 10.1 `<RiskScoreGauge />`

Semi-radial gauge 0–100.

| Prop | Type | Notes |
|---|---|---|
| `safetyScore` | number | Required |
| `confidence` | `'high'\|'medium'\|'low'` | Required |
| `rating` | `Rating` | Required |
| `size` | `'sm'\|'md'\|'lg'` | Default `md` |
| `onInfoClick` | () => void | Triggers `<RiskInfoPopover />` |

Inside the gauge:

- Big number (`safetyScore`)
- Band pill (color-coded)
- Confidence chip
- Tiny `(i)` button top-right → opens `<RiskInfoPopover />`

**Hover behavior:** mouseover anywhere on the arc shows a `<HoverCard>` with: 5 component scores + their weights + the formula.

### 10.2 `<RiskInfoPopover />`

The single source of truth for "why is this score what it is".

Shows:

- Formula in plain English (e.g. "Driver = 35% events + 20% HOS + …")
- Breakdown bar (component contributions)
- Top 5 contributors (event title + date + points)
- Settings used (config hash + "View settings snapshot" link)
- Last 3 changes (delta vs prior calc — if known)

Fully keyboard-accessible (`Esc` closes, `Tab` cycles).

### 10.3 `<ComponentBreakdownBar />`

Horizontal stacked bar — each component is a colored segment, width ∝ weighted contribution.

| Hover | Details |
|---|---|
| Per-segment | Component name, raw, weighted, formula segment, # events |
| Whole-bar | Total = Σ components + scope formula |

### 10.4 `<SourceSplitDonut />`

3- or 4-arc donut for FMCSA / CVOR / NSC (NSC subdivides into AB/BC/PE/NS arcs).

Hover: source-native score + normalized score + count of contributing events + jurisdiction-specific note ("FMCSA SMS percentile" vs "CVOR rating").

### 10.5 `<JurisdictionStackedBar />`

Stacked horizontal bar across BC / AB / PE / NS / ON / US states. Hover shows: # inspections, # violations, # OOS, sum-points contributing.

### 10.6 `<RiskTrendChart />`

12- or 24-month line. Each month = recompute the score using only events within a rolling 12-month window ending at that month.

| Hover (point) | Details |
|---|---|
| Score for month | Δ vs previous month, # events that month, top contributing event |

### 10.7 `<FleetDistributionHistogram />`

Carrier-level — bar chart of asset-or-driver count per band.

Click a bar → filtered list page with `?band=critical` query.

### 10.8 `<DriverAssetHeatmap />`

Matrix: rows = drivers, cols = assets (or vice versa). Cell color = combined `driverAsset` score. Empty cell = pair has never run together.

Hover cell: pair score, # shared events, last shared date.

Click cell → `<DriverAssetDrawer />` with full pair breakdown.

### 10.9 `<TopContributorsList />`

Ordered list of `RiskContribution`. Each row:

- Source pill (CVOR / NSC:BC / FMCSA / …)
- Domain icon
- Date (relative + absolute on hover)
- Title (short summary)
- Severity bar
- Weighted contribution to this score
- `View event →` link

### 10.10 `<RecommendationsCard />`

3–5 bullet recommendations driven by top contributors. Each carries:

- Severity (info / warn / urgent)
- Title
- 1-line description
- Action button (e.g. "Open work order", "Schedule training", "Review inspection")

### 10.11 `<RiskScopePicker />`

Tab-strip used on the Safety Analysis page to switch between scopes (Carrier / Driver / Asset / Combined). When in a Combined scope, secondary chips appear to pick the entities.

### 10.12 `<RiskBadge />`

Small inline pill — shows `safetyScore + band + confidence`. Used in tables and lists. On click → opens `<RiskInfoPopover />`.

### 10.13 Hover-block / `i`-button conventions

Every chart, every score number, every threshold has an `(i)` button or hover card that surfaces:

- **What this measures** (one sentence)
- **How it's calculated** (formula or rule)
- **Where the data comes from** (source list)
- **Where to change it** (deep-link to Settings → Safety → relevant section)

This is centralized through a shared `<RiskExplainTip />` component:

```tsx
<RiskExplainTip
  topic="driver.formula"
  side="right"
  trigger={<InfoIcon />}
/>
```

Topics live in `src/components/safety/risk/explainTopics.ts` so copy is reviewable.

---

## 11. Live Dynamic Charts

### 11.1 Reactivity model

```
RiskStore (useSyncExternalStore)
  ├─ events:   RiskEvent[]            (recomputed when source files change in dev)
  ├─ settings: SafetySettings         (subscribed to localStorage events)
  └─ derived:  Map<scopeKey, EntityRiskScore>   (LRU memoized)
```

All chart components subscribe via:

```ts
const score = useRiskScore(scope);          // memoized, cache-aware
const distribution = useRiskDistribution(scope);
const trend = useRiskTrend(scope, { months: 12 });
```

Setting changes invalidate the memo cache → all charts re-render in the next frame.

### 11.2 Chart library

`recharts` (already in deps). One thin wrapper per chart type lives in `src/components/safety/risk/charts/`.

### 11.3 Animations

- 300 ms ease-out on score gauge changes.
- 200 ms cross-fade on component bar segment changes.
- Histogram bars tween width on threshold-slider drag (debounced 80 ms).

### 11.4 Accessibility

- All charts ship with a hidden `<table>` companion (screen-reader friendly).
- Color is never the sole signal — every band also has a label.
- Keyboard: arrow keys traverse points/bars/cells.

---

## 12. Settings Page (Safety)

Path: `/settings/safety`. Persisted under `safety:risk-config:<accountId>`.

### 12.1 Page layout

Left rail (sticky TOC):

1. Bands & Thresholds
2. Regulatory Equivalency
3. NSC Normalization
4. Recency & Decay
5. Confidence Policy
6. Combined Entity Weights
7. Component Weights
8. Critical Overrides
9. Export Defaults
10. Methodology Snapshot

Right pane: form controls + live preview.

### 12.2 Bands & Thresholds

| Control | Range | Default | Help (`i`) |
|---|---|---|---|
| Excellent floor | 60–95 | 85 | "Score at or above is Excellent" |
| Good floor | 50–84 | 70 | "Score at or above is Good" |
| Fair floor | 30–69 | 55 | "Score at or above is Fair" |
| Poor floor | 0–54 | 35 | "Below is Critical" |

Validation: monotonic. Live histogram preview to the right.

### 12.3 Regulatory Equivalency

| Control | Type | Default | Help |
|---|---|---|---|
| Source mode | radio | `available-only` | "Don't penalize for unenrolled sources" |
| FMCSA weight | slider 0–1 | 0.35 | |
| CVOR weight | slider 0–1 | 0.30 | |
| NSC home weight | slider 0–1 | 0.25 | |
| Additional NSC weight | slider 0–1 | 0.10 | |
| Multi-NSC mode | radio | `split` | `split / max-risk / home-primary` |

Sum of weights normalized at save time.

### 12.4 NSC Normalization

Per-jurisdiction sub-cards:

- **AB:** stage→safety mapping, R-Factor surcharge curve.
- **BC:** profile-status→safety, threshold table for contravention/CVSA/accident.
- **PE:** points-per-vehicle multiplier (default 8.0).
- **NS:** level→safety mapping for L1 / L2 / L3.

### 12.5 Recency & Decay

| Control | Default |
|---|---|
| Half-life (months) | 12 |
| Hard cutoff (months) | 36 |
| Step decay 0–6 mo | 1.00 |
| Step decay 6–12 mo | 0.80 |
| Step decay 12–24 mo | 0.50 |

### 12.6 Confidence Policy

| Control | Default |
|---|---|
| Min events for high confidence (driver) | 3 |
| Min events for high confidence (asset) | 3 |
| Min months data for high confidence (carrier) | 12 |
| Low-confidence neutral safety | 75 |
| Missing source policy | `ignore` |

### 12.7 Combined Entity Weights

Editable values for the four combined formulas (§8.5).

### 12.8 Component Weights

Editable per-domain weights for Driver / Asset / Carrier formulas. Reset-to-defaults per row and global.

### 12.9 Critical Overrides

Boolean rules that force `Critical` regardless of average:

- Fatal crash within last 24 mo
- Two+ OOS in last 6 mo for same asset
- BASIC alert for Crash Indicator
- NSC Unsatisfactory rating

Each is a toggle with an `(i)` showing exact rule.

### 12.10 Export Defaults

| Control | Default |
|---|---|
| CSV scopes | all |
| PDF cover branding | carrier name + logo |
| Full export format | XLSX |
| Include raw source tabs | true |
| Include methodology appendix | true |

### 12.11 Methodology Snapshot

Read-only preview of the JSON config that will be written to every export. Copy-button + "Reset to factory defaults" with confirmation modal.

---

## 13. Exports

### 13.1 CSV (per-grid)

Files (per scope):

- `carrier-risk-summary.csv`
- `driver-risk-summary.csv`
- `asset-risk-summary.csv`
- `combined-driver-asset-risk.csv`
- `risk-events-ledger.csv`
- `source-normalization.csv`
- `risk-contributions.csv`

Common columns: `carrierId, scopeKind, scopeId, scopeLabel, source, sourceKey, domain, kind, date, daysAgo, driverId, assetId, plate, unit, vin, oosCount, defects, points, severity, weighted, safetyScore, riskScore, rating, confidence, topContributor`.

Last rows: per-component totals + final score.

Implementation: hand-rolled `papaparse`-style streaming, no new dep.

### 13.2 PDF (executive)

Built with `@react-pdf/renderer` (already wired for inspection PDFs).

Sections:

1. Cover — carrier name, scope, period, generated date, config hash.
2. Carrier compliance enrollment summary.
3. Score card (gauge + band).
4. Component breakdown bar.
5. Source split donut.
6. Top 10 contributing events.
7. Jurisdiction table.
8. Driver distribution histogram.
9. Asset distribution histogram.
10. Top 5 high-risk drivers.
11. Top 5 high-risk assets.
12. Top 5 high-risk driver+asset pairs.
13. Action plan / recommendations.
14. Methodology appendix.
15. Settings snapshot (page-numbered footer with config hash).

### 13.3 Full ZIP

`safety-export-<scope>-<date>.zip`:

- `risk-summary.json` — full `EntityRiskScore` for the chosen scope
- `events.csv` — every event that fed the score
- `summary.pdf` — executive PDF
- `config.json` — settings snapshot (so re-running with same config + same data → identical result)
- `methodology.md` — printable copy of this spec at the time of export

Built with `jszip` (~30 KB gzipped).

### 13.4 Full XLSX workbook

Tabs (existing `exportExcel.ts` extended):

- Summary
- Settings Snapshot
- Formula Equivalency
- Carrier Scores
- Source Scores
- Driver Scores
- Asset Scores
- Driver+Asset Scores
- Carrier+Driver Scores
- Carrier+Asset Scores
- Carrier+Driver+Asset Scores
- Risk Events Ledger
- Raw FMCSA / CVOR / NSC AB / NSC BC / NSC PE / NSC NS
- Recommendations

API:

```ts
exportRiskWorkbook({
  carrierId,
  includeRawSources: true,
  includeEntityTabs: true,
  includeMethodology: true,
  format: 'xlsx',
});
```

---

## 14. File / Module Plan

```
src/pages/safety-analysis/
  risk-engine.types.ts            // types: RiskEvent, EntityRiskScore, …
  risk-adapters.ts                // adapter contract + helpers
  risk-adapters.fmcsa.ts
  risk-adapters.cvor.ts
  risk-adapters.nsc.ts            // AB/BC/PE/NS adapters
  risk-adapters.internal.ts       // incidents/HOS/VEDR/maintenance/training/docs
  risk-load.ts                    // master loader
  risk-normalizers.ts             // §5 source normalizers
  risk-scoring.ts                 // §8 entity formulas
  risk-distribution.ts            // §9 distributions
  risk-explain.ts                 // top contributors + recommendations
  risk-store.ts                   // useSyncExternalStore RiskStore
  risk-config.ts                  // SafetySettings extension + defaults + zod
  risk-config.store.ts            // localStorage persistence
  risk-export.ts                  // CSV/PDF/ZIP/XLSX
  __tests__/                      // unit tests per module

src/components/safety/risk/
  RiskScoreGauge.tsx
  RiskInfoPopover.tsx
  ComponentBreakdownBar.tsx
  SourceSplitDonut.tsx
  JurisdictionStackedBar.tsx
  RiskTrendChart.tsx
  FleetDistributionHistogram.tsx
  DriverAssetHeatmap.tsx
  TopContributorsList.tsx
  RecommendationsCard.tsx
  RiskScopePicker.tsx
  RiskBadge.tsx
  RiskExplainTip.tsx
  ExportMenu.tsx
  charts/                         // recharts wrappers
  explainTopics.ts                // copy library

src/pages/settings/
  SafetySettingsPage.tsx          // extends existing page
  sections/
    BandsThresholdsSection.tsx
    RegulatoryEquivalencySection.tsx
    NscNormalizationSection.tsx
    RecencyDecaySection.tsx
    ConfidencePolicySection.tsx
    CombinedWeightsSection.tsx
    ComponentWeightsSection.tsx
    CriticalOverridesSection.tsx
    ExportDefaultsSection.tsx
    MethodologySnapshotSection.tsx
```

---

## 15. Implementation Roadmap

| Phase | Deliverable | Acceptance |
|---|---|---|
| **1** Adapter layer | `risk-engine.types.ts`, all `risk-adapters.*.ts`, `risk-load.ts`. | `loadRiskEventsForCarrier(id)` returns the merged ledger; raw payload preserved. |
| **2** Source normalization | `risk-normalizers.ts` for FMCSA, CVOR, AB/BC/PE/NS. | Each source produces `S, σ, confidence, explanation`. `available-only` excludes missing sources. NSC sources comparable on 0–100. |
| **3** Entity scoring | `risk-scoring.ts` for all seven scopes. | Scores deterministic, include contributors + confidence. Settings change recomputes. |
| **4** Distributions & charts | `risk-distribution.ts`, all `src/components/safety/risk/` components. | Carrier dashboard shows gauge + bar + donut + jur + trend + histogram + heatmap. Hover/info-button works on every figure. |
| **5** Settings | `SafetySettingsPage.tsx` with all 10 sections. | Persists to localStorage. Live-preview histogram updates on slider drag. Methodology snapshot exports clean JSON. |
| **6** Exports | `risk-export.ts` — CSV, PDF, ZIP, XLSX. | Reproducible: same config + same data ⇒ identical file hash. |
| **7** Validation | Unit tests + manual QA matrix. | 100% of normalizer branches covered; QA matrix in §16 passes. |

Estimated calendar: ~6–8 weeks for one engineer + part-time designer.

---

## 16. Testing Plan

### 16.1 Unit tests

- `risk-normalizers.test.ts` — every source × every native edge value (0, mid, max, missing).
- `risk-scoring.test.ts` — every scope × {empty, single-source, multi-source} carriers.
- `risk-distribution.test.ts` — bucket math, percentile calculation.
- `risk-adapters.*.test.ts` — golden-file round-trip per source.
- `risk-config.test.ts` — zod schema, monotonic threshold validation.

### 16.2 Manual QA matrix

| Carrier profile | Expected behavior |
|---|---|
| FMCSA only | Regulatory = FMCSA at 100% of bucket. NSC + CVOR sections hidden. |
| CVOR only | Regulatory = CVOR at 100%. Charts only show CVOR. |
| Multi-NSC (AB+BC) | Both jur chips render, jur stacked bar shows both. |
| FMCSA+CVOR+NSC | All sources contribute; weights normalize. |
| Driver no events | Score = neutral 80, confidence = low, "Insufficient data" badge. |
| Asset many maintenance, no inspections | Maintenance carries 25% weight; confidence = medium. |
| Driver+asset shared OOS | Pair score drops, shared-history component highlighted. |
| BASIC Crash Indicator alert | Critical override fires regardless of other components. |
| NSC BC Unsatisfactory | Critical override fires (toggle on by default). |

---

## 17. Edge Cases & Open Questions

- **Driver licensed in multiple jurisdictions:** which NSC home applies for `NSC home weight`? → use carrier home jurisdiction, not driver's.
- **Asset transferred mid-period:** events follow the asset's `assetId`. We do NOT split history by ownership — operationally surprising but auditable.
- **Carrier with both US (FMCSA) and CA (CVOR/NSC) operations:** all sources active simultaneously; `home jurisdiction` = primary IFTA base.
- **Same event appearing in two sources** (rare — e.g. FMCSA inspection that's also recorded as NSC): de-duplicate by `(date, plate, driverLicence)` 1:1; keep the higher-severity one, store the other under `linkedEventId` for transparency.
- **Score gaming:** weights stored per-account in `localStorage` are user-editable. Export config hash so auditors can detect tampered exports.

---

## 18. Glossary

| Term | Meaning |
|---|---|
| **Safety Score** | 0–100, higher is better. Primary UI value. |
| **Risk Score** | `100 - Safety Score`. Same information, alternate framing. |
| **Source** | Originating regulatory or internal system: FMCSA, CVOR, NSC:AB, NSC:BC, NSC:PE, NSC:NS, internal:*. |
| **Domain** | Risk category: crash, HOS, vehicleMaintenance, etc. |
| **Component** | A weighted slice of an entity formula (e.g. "DriverEvents" in driver formula). |
| **Severity** | Per-event 0–10 normalized scale. |
| **Confidence** | Data-density qualifier: high / medium / low. |
| **Recency decay** | Multiplier reducing the weight of older events. |
| **Exposure** | Denominator scaling raw points by fleet size / driver days / odometer. |
| **Source-native score** | The original score in source units (CVOR rating %, FMCSA percentile, NSC stage, etc.). Always preserved alongside normalized. |
| **Critical override** | Rule that forces band = Critical regardless of weighted average. |
| **Config hash** | SHA-1 of the active settings JSON; embedded in every export for reproducibility. |
| **Top contributor** | An event that contributes ≥X% of weighted risk; surfaced in info popovers. |
| **Recommendation** | Action card derived from top contributors (e.g. "Schedule brake-system inspection"). |

---

## See also

- [`SAFETY_RISK_SCORE_ENGINE_PLAN.md`](./SAFETY_RISK_SCORE_ENGINE_PLAN.md) — original architecture plan.
- [`SAFETY_COMPLIANCE_DATA_PLAN.md`](./SAFETY_COMPLIANCE_DATA_PLAN.md) — compliance enrollment data model.
- [`Frontend_Data_Reference.md`](./Frontend_Data_Reference.md) — file-by-file data inventory.
- [`Safety_Compliance_Upload_Data_Requirements.md`](./Safety_Compliance_Upload_Data_Requirements.md) — what carriers upload.
- [`Safety_Risk_Engine_Obsidian.md`](./Safety_Risk_Engine_Obsidian.md) — knowledge-graph view of these concepts (Obsidian-flavored).
