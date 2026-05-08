# Safety Risk Score Engine Plan

## Purpose

Build one safety-risk engine that can combine every safety source available for a carrier:

- FMCSA / SMS / CSA data
- Ontario CVOR data
- NSC profiles and inspection data, by province where available
- Internal operational data: incidents, driver HOS/ELD, VEDR, inspections, violations, training, assets, maintenance, work orders, documents, registrations

The engine should produce risk scores, score distributions, charts, and exports at these scopes:

- Carrier
- Driver
- Asset / vehicle
- Driver + asset
- Carrier + driver
- Carrier + asset
- Carrier + driver + asset

Existing app convention mostly displays `Safety Score` where higher is better. This plan keeps that and derives `Risk Score` as `100 - safetyScore` where higher means more risk. UI can show either, but the engine should store both so charts and alerts are unambiguous.

## What We Have Now

### Carrier Registry And Scope

Current carrier/account data lives under:

- `src/pages/accounts/accounts.data.ts`
- `src/pages/accounts/carrier-drivers.data.ts`
- `src/pages/accounts/carrier-assets.data.ts`
- `src/pages/accounts/carrier-fleet.data.ts`

Drivers and assets are already carrier-scoped and generated with stable IDs. This is the right foundation for entity-level scoring.

### Compliance Enrollment

Current compliance enrollment lives under:

- `src/data/carrier-compliance.data.ts`
- `src/data/useCarrierCompliance.ts`
- `src/components/compliance/ComplianceConfigureModal.tsx`

This gives each carrier:

- `fmcsa`: enabled/hasData/USDOT
- `cvor`: enabled/hasData/CVOR number
- `nsc[]`: multi-jurisdiction NSC enrollments, e.g. `AB`, `BC`, `PE`, `NS`

This should be the gate for risk calculation. If a carrier has no FMCSA but has CVOR, FMCSA contributes no score. If it has BC + AB NSC, both NSC sources contribute with source weights.

### Source-Specific Safety Data

Current per-carrier source data is in:

- `src/data/carrier-safety-data.ts`
- `src/data/carrier-inspections.data.ts`
- `src/pages/inspections/inspectionsData.ts`
- `src/pages/inspections/cvorInterventionEvents.data.ts`
- `src/pages/inspections/nscInspectionsData.ts`

Available source shapes:

- FMCSA/SMS: BASIC categories, inspections, violations, OOS flags, crash-like incident support through `sms-engine.ts`.
- CVOR: carrier profile rating, collision/conviction/inspection percentages, counts, OOS rates, travel-km, periodic reports, intervention events.
- NSC Alberta: R-Factor, monitoring stage, conviction/admin/CVSA/collision contributions, stage thresholds.
- NSC BC: profile status, contravention/CVSA/accident scores, total score, thresholds.
- NSC PEI: collision/conviction/inspection points, current active vehicle counts, safety rating.
- NSC Nova Scotia: score levels, conviction/inspection/collision scores, fleet sizes, safety rating.

Important limitation: the NSC source models are not equivalent. They must be normalized before combining.

### Unified Safety Records

Current unified event resolver:

- `src/data/safety-records.ts`
- `src/components/safety/SafetyRecordsPanel.tsx`
- `src/components/safety/SourceSubTabs.tsx`

This already normalizes source identity into:

- `source`: `cvor | nsc | fmcsa`
- `sourceKey`: `cvor | fmcsa | nsc:AB | nsc:BC | ...`
- `kind`: `inspection | violation | collision | conviction | accident`
- optional `driverId`
- optional `assetId`
- preserved `raw`

This is the closest existing shape to the future risk-event ledger. It should be extended to be carrier-aware and score-aware.

### Existing Scoring Pieces

Current scoring files:

- `src/pages/safety-analysis/sms-engine.ts`
- `src/pages/safety-analysis/safetyScoring.ts`
- `src/pages/safety-analysis/safety-analysis.data.ts`
- `src/pages/safety-analysis/safetySettings.ts`

What exists:

- SMS BASIC scoring and time/distance weighting.
- Combined score currently blends operational + regulatory, but regulatory only blends SMS + CVOR.
- Driver score mock data with component scores.
- Asset export risk scoring in `exportExcel.ts`.
- Score band distribution helper.
- Large Safety Settings schema with thresholds, weights, alert settings, SMS settings, asset settings, inspection settings, violation settings, training settings, VEDR settings.

Main limitation: scoring is split across files and not fully carrier-scoped. NSC is not yet part of the combined regulatory score.

### Export

Current export:

- `src/pages/safety-analysis/exportExcel.ts`

It exports XLSX with:

- introduction
- formulas
- filters
- fleet summary
- SMS & CVOR
- SMS BASIC
- CVOR
- drivers
- assets
- inspections
- violations
- accidents
- individual driver tabs
- individual asset tabs

Main limitation: export currently uses static `MOCK_DRIVERS`, `INITIAL_ASSETS`, `inspectionsData`, and `carrierProfile`. It needs carrier-scoped inputs and new NSC/combined score sheets.

## Current Data Capability Matrix

| Data source | Current files | Carrier score | Driver score | Asset score | Native score meaning | Main normalization need |
|---|---|---:|---:|---:|---|---|
| FMCSA / SMS / CSA | `sms-engine.ts`, `inspectionsData.ts`, `carrier-inspections.data.ts` | Yes | Yes, when inspection resolves to driver | Yes, when inspection resolves to asset | BASIC percentiles, lower is better | Convert percentile to safety score with `100 - percentile`; preserve official thresholds |
| Ontario CVOR | `carrier-safety-data.ts`, `cvorInterventionEvents.data.ts`, `inspectionsData.ts` | Yes | Yes, when event has driver licence/name/id | Yes, when event has plate/unit/id | CVOR rating %, lower is better | Convert rating and component percentages to 0-100 safety; classify collision/conviction/inspection domain |
| NSC Alberta | `carrier-safety-data.ts`, `InspectionsPage.tsx` constants | Yes | Partial; only if NSC event rows carry driver IDs | Partial; only if NSC event rows carry asset IDs | R-Factor and monitoring stage, lower is better | Map stage/R-Factor to risk bands and 0-100 safety |
| NSC British Columbia | `carrier-safety-data.ts`, `NscBcCarrierProfile.tsx` constants | Yes | Partial through NSC inspection rows | Partial through NSC inspection rows | Contravention/CVSA/accident scores and profile status, lower is better | Normalize against BC threshold table |
| NSC Prince Edward Island | `carrier-safety-data.ts`, `InspectionsPage.tsx` constants | Yes | Limited | Limited | Collision/conviction/inspection points by fleet size | Convert points per active vehicle to risk |
| NSC Nova Scotia | `carrier-safety-data.ts`, `InspectionsPage.tsx` constants | Yes | Limited | Limited | Score levels plus component scores, lower is better | Compare total score to level thresholds |
| Roadside inspections | `carrier-inspections.data.ts`, `inspectionsData.ts` | Yes | Yes | Yes | Violations, OOS, SMS/CVOR points | Already close to normalized event rows; add `carrierId` everywhere |
| Incidents / crashes | `incidents.data.ts` | Yes | Yes | Sometimes, if vehicle linked | Fatal/injury/tow/preventable/cost | Apply severity, preventability, recency, exposure |
| HOS / ELD | `safety-analysis.data.ts`, `hos.data.ts` | Aggregate | Yes | Sometimes via vehicleId | violation severity, OOS | Normalize by driver window and recency |
| VEDR / telematics | `safety-analysis.data.ts`, `SafetyEventsPage.tsx` | Aggregate | Yes | Sometimes via vehicle plate/unit | event severity/tags | Convert event tags to penalty model |
| Assets | `carrier-assets.data.ts`, `assets.data.ts` | Aggregate | No | Yes | status, age, mileage, registration | Use asset health formula and maintenance/document penalties |
| Maintenance / work orders | `maintenance.data.ts`, `carrier-work-orders.data.ts` | Aggregate | No | Yes | open/completed/cancelled work orders, costs, service types | Convert overdue/open/failed service to asset health risk |
| Inventory/vendors | `inventory.data.ts`, `carrier-vendor-seed.data.ts` | Informational | Sometimes driver assignment | Sometimes asset assignment | assigned vendor inventory | Usually not core safety risk except expired safety-critical items |
| Training | `training.data.ts`, `safety-analysis.data.ts` | Aggregate | Yes | No | completion/expiry | Use completion and expiry penalty |

## Practical Suggestions

- Treat FMCSA, CVOR, and NSC as source-native regulatory systems first, not as identical raw data. Keep their original score visible beside the normalized TrackSmart score.
- Add `carrierId` to every normalized event. Driver and asset IDs are useful, but carrier scope is the required root.
- Use `available-only` source blending by default. A carrier should not be penalized for missing CVOR if it is not enrolled in CVOR.
- Show low-confidence scores differently from low scores. A driver with no inspections is not automatically safe; they are "low data".
- Use the highest-risk source as a visible warning even if weighted average is acceptable. Example: overall good score but NSC BC unsatisfactory should still create an intervention card.
- Make every score explainable with "top contributors": OOS brake inspection, preventable crash, expired registration, high CVOR conviction %, etc.
- Build the engine as pure functions first. UI, charts, and exports should call the same functions so numbers never drift.

## Recommended Target Architecture

### New Core Engine Module

Create:

- `src/pages/safety-analysis/risk-engine.types.ts`
- `src/pages/safety-analysis/risk-normalizers.ts`
- `src/pages/safety-analysis/risk-scoring.ts`
- `src/pages/safety-analysis/risk-distribution.ts`
- `src/pages/safety-analysis/risk-explain.ts`
- `src/pages/safety-analysis/risk-export.ts`

Keep source-specific extraction/adapters separate from formulas.

### Canonical Risk Event

All FMCSA, CVOR, NSC, incident, HOS, VEDR, maintenance, and training signals should become:

```ts
type RiskSource =
  | 'fmcsa'
  | 'cvor'
  | 'nsc:AB'
  | 'nsc:BC'
  | 'nsc:PE'
  | 'nsc:NS'
  | 'internal:incident'
  | 'internal:hos'
  | 'internal:vedr'
  | 'internal:maintenance'
  | 'internal:training'
  | 'internal:document';

type RiskDomain =
  | 'crash'
  | 'unsafeDriving'
  | 'hos'
  | 'vehicleMaintenance'
  | 'driverFitness'
  | 'controlledSubstance'
  | 'hazmat'
  | 'inspection'
  | 'conviction'
  | 'collision'
  | 'assetHealth'
  | 'training'
  | 'documentCompliance';

type RiskEvent = {
  id: string;
  carrierId: string;
  source: RiskSource;
  domain: RiskDomain;
  kind: 'inspection' | 'violation' | 'collision' | 'conviction' | 'crash' | 'maintenance' | 'training' | 'document';
  date: string;
  driverId?: string;
  assetId?: string;
  severity: number;       // 0-10 source-normalized severity
  points: number;         // source-native or normalized points
  oos: boolean;
  preventable?: boolean;
  confidence: 'high' | 'medium' | 'low';
  raw: unknown;
};
```

This lets every entity score query use the same pipeline:

1. collect events
2. filter by scope
3. normalize severity
4. apply decay/exposure
5. compute component scores
6. combine components
7. produce explanations

## Source Normalization

### FMCSA / SMS

Use `sms-engine.ts` as the baseline for FMCSA. Keep BASIC mapping:

- Unsafe Driving
- Crash Indicator
- HOS Compliance
- Vehicle Maintenance
- Controlled Substances / Alcohol
- Hazmat Compliance
- Driver Fitness

Normalize:

- FMCSA percentile: `sourceSafety = 100 - percentile`
- FMCSA alert: mark source component as high risk if percentile >= official threshold
- FMCSA severity: use violation severity, OOS bonus, and per-inspection cap from settings
- OOS: add severity and explanation

### CVOR

CVOR already has a rating percentage where lower is better.

Normalize:

- `cvorSafety = clamp(100 - cvorAnalysis.rating, 0, 100)`
- component safety:
  - collisions: `100 - collisions.percentage`
  - convictions: `100 - convictions.percentage`
  - inspections: `100 - inspections.percentage`
- event severity:
  - collision with points: high
  - fatal / injury collision: critical
  - conviction with driver category: driver-domain
  - vehicle/load conviction: asset-domain
  - inspection OOS: asset and carrier domain

### NSC Alberta

Alberta uses R-Factor and monitoring stages.

Normalize:

- If `rFactor < stage1.low`, safety should be high, usually 90-100.
- Stage 1 maps around 75-89.
- Stage 2 maps around 60-74.
- Stage 3 maps around 40-59.
- Stage 4 maps around 0-39.

Formula:

```ts
abRisk = stageRiskBase + withinStageRatio * stageRiskSpan
abSafety = 100 - abRisk
```

Contribution domains:

- convictions -> conviction / unsafe / driver fitness depending source code if available
- admin penalties -> regulatory carrier risk
- CVSA inspections -> inspection / vehicle maintenance
- reportable collisions -> crash / collision

### NSC British Columbia

BC uses profile status and category scores:

- Contraventions
- CVSA OOS
- Accidents
- Total score

Normalize against BC thresholds:

- If total score is in Satisfactory band: safety 80-100.
- Conditional: safety 50-79.
- Unsatisfactory: safety 0-49.

Component mapping:

- Contraventions -> violations/convictions
- CVSA OOS -> vehicle maintenance + inspection
- Accidents -> crash

### NSC Prince Edward Island

PEI gives points:

- collision points
- conviction points
- inspection points
- current active vehicles

Normalize by exposure:

```ts
pointsPerVehicle = totalPoints / max(1, activeVehicles)
peRisk = min(100, pointsPerVehicle * pePointsPerVehicleMultiplier)
peSafety = 100 - peRisk
```

Settings should expose the PEI multiplier and a threshold table.

### NSC Nova Scotia

Nova Scotia has score levels and component scores:

- Level 1, Level 2, Level 3 thresholds
- conviction score
- inspection score
- collision score

Normalize:

- total = conviction + inspection + collision
- compare total to levels:
  - below level 1: high safety
  - level 1 to level 2: warning
  - level 2 to level 3: high risk
  - above level 3: critical

## Score Output Types

Every score should return:

```ts
type EntityRiskScore = {
  entityType: 'carrier' | 'driver' | 'asset' | 'driverAsset' | 'carrierDriver' | 'carrierAsset' | 'carrierDriverAsset';
  carrierId: string;
  driverId?: string;
  assetId?: string;
  safetyScore: number;
  riskScore: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  confidence: 'high' | 'medium' | 'low';
  sourceScores: SourceScore[];
  componentScores: ComponentScore[];
  distributions: ScoreDistribution[];
  topContributors: RiskContribution[];
  recommendations: RiskRecommendation[];
};
```

## Core Score Formula

Use a weighted component model:

```text
Safety Score =
  carrierRegulatoryScore * carrierRegulatoryWeight
  + driverBehaviorScore * driverWeight
  + assetHealthScore * assetWeight
  + incidentScore * incidentWeight
  + trainingScore * trainingWeight
  + documentComplianceScore * documentWeight
```

Weights depend on scope.

### Carrier Score

Carrier score should answer: "How risky is this company overall?"

Recommended default:

- Regulatory: 45%
- Incidents/crashes: 20%
- Inspections/OOS: 15%
- Driver aggregate: 10%
- Asset aggregate: 10%

Regulatory score blends only available sources:

```text
Regulatory =
  weightedMean(available source scores)
```

Default source weights:

- FMCSA: 35%
- CVOR: 30%
- NSC home province: 25%
- Additional NSC jurisdictions: 10% total split among them

If only one source exists, it receives 100% of the regulatory source weight. Do not penalize missing sources when the carrier is not enrolled.

### Driver Score

Driver score should answer: "How risky is this driver?"

Recommended default:

- Driver safety events: 35%
- HOS/ELD: 20%
- VEDR/telematics: 15%
- Driver-linked roadside inspections: 15%
- Incidents/preventability: 10%
- Training/documents: 5%

FMCSA/CVOR/NSC records contribute when they resolve to `driverId`.

### Asset Score

Asset score should answer: "How risky is this vehicle?"

Recommended default:

- Asset status/registration/age/mileage: 25%
- Maintenance/work orders: 25%
- Asset-linked inspections/OOS: 25%
- Asset-linked violations/defects: 15%
- Asset-linked crashes/incidents: 10%

Current inventory + maintenance + work order data can be used immediately to calculate the maintenance component.

### Driver + Asset Score

Use this when asking: "How risky is this pairing?"

Recommended default:

- Driver score: 45%
- Asset score: 35%
- Shared events: 20%

Shared events are inspections/incidents where both `driverId` and `assetId` match. If there are no shared events, confidence becomes `low` and the score is just weighted driver/asset with shared-event neutral value.

### Carrier + Driver Score

Use this when asking: "How risky is this driver within this carrier context?"

Recommended default:

- Driver score: 70%
- Carrier regulatory score: 20%
- Carrier peer/rank context: 10%

This flags a decent driver in a high-risk carrier differently from the same driver in a clean carrier.

### Carrier + Asset Score

Use this when asking: "How risky is this vehicle within this carrier context?"

Recommended default:

- Asset score: 70%
- Carrier regulatory score: 20%
- Fleet peer/rank context: 10%

### Carrier + Driver + Asset Score

Use this when asking: "How risky is this complete operating combination?"

Recommended default:

- Driver score: 35%
- Asset score: 30%
- Carrier regulatory score: 20%
- Shared driver+asset event history: 15%

This should power dispatch-level risk insights: which driver-vehicle assignments should be avoided or reviewed.

## Recency And Exposure

Use current Safety Settings where possible:

- `smsLookbackMonths`
- `smsDecayBand1Pct`
- `smsDecayBand2Pct`
- `smsDecayBand3Pct`
- `incidentAgeCap`
- `recencyDecay`
- `inspAgeCap`
- `inspDecay`
- `violAgeCap`
- `violDecay`
- `driverAgeCap`

Recommended standard:

- 0-6 months: 100% impact
- 6-12 months: 65-80% impact
- 12-24 months: 30-60% impact
- older than cap: excluded or informational only

Exposure denominators:

- carrier: power units, drivers, fleet kilometres/miles, inspections
- driver: driving days, inspections, assigned miles if available
- asset: odometer, age, active days, inspections

If exposure is missing, do not silently treat it as zero. Use confidence and neutral baselines.

## Confidence

Every score should include confidence:

- High: enough events and exposure data
- Medium: some event data or partial source data
- Low: sparse data, no inspections, or synthetic fallback

Suggested rules:

- Carrier high: at least one regulatory source plus 5+ inspections or 12+ months data.
- Driver high: 3+ inspections/events or 90+ active days.
- Asset high: 3+ inspections/maintenance records or known odometer + registration + active status.
- Combined high: both entities high and at least one shared event.

Low confidence should not mean low risk. It should show "Low confidence" and avoid over-strong recommendations.

## Score Bands And Distribution

Use Safety Settings thresholds:

- Excellent: `score >= threshExcellent`
- Good: `score >= threshGood`
- Fair: `score >= threshFair`
- Poor: below fair
- Critical: below `criticalAlert` or any critical override event

Distribution outputs needed:

- carrier regulatory source distribution
- driver score distribution
- asset score distribution
- driver+asset pair distribution
- source score distribution: FMCSA, CVOR, NSC by province
- component distribution: crash, HOS, vehicle maintenance, driver fitness, etc.

Chart recommendations:

- Score band stacked bar: Excellent / Good / Fair / Poor / Critical
- Source radar: FMCSA, CVOR, NSC AB, NSC BC, NSC PE, NSC NS
- Component radar: crash, HOS, vehicle maintenance, driver fitness, training, documents
- Heatmap: driver rows x asset columns for assignment risk
- Trend line: last 12 months safety/risk score
- Contribution waterfall: top penalties and bonuses
- Scatter: risk vs confidence
- Pareto: top violation categories contributing to risk

## Safety Settings Additions

Existing `SafetySettings` is already broad. Add a new section: "Regulatory Equivalency".

New settings:

```ts
regulatorySourceMode: 'available-only' | 'strict-required';
fmcsaSourceWeight: number;
cvorSourceWeight: number;
nscSourceWeight: number;
additionalNscWeightMode: 'split' | 'max-risk' | 'home-primary';

nscAbStageSafety: {
  notMonitored: number;
  stage1: number;
  stage2: number;
  stage3: number;
  stage4: number;
};

nscBcBandSafety: {
  satisfactoryMin: number;
  conditionalMin: number;
  unsatisfactoryMin: number;
};

nscPePointsPerVehicleMultiplier: number;
nscNsLevel1Safety: number;
nscNsLevel2Safety: number;
nscNsLevel3Safety: number;

combinedDriverWeight: number;
combinedAssetWeight: number;
combinedCarrierWeight: number;
sharedEventWeight: number;

confidenceMinEventsHigh: number;
confidenceMinEventsMedium: number;
lowConfidenceNeutralScore: number;
missingSourcePolicy: 'ignore' | 'neutral' | 'penalize';
```

Settings UI should show formulas live, similar to current Safety Settings.

## Exports

### CSV Export

Provide one CSV per view:

- `carrier-risk-summary.csv`
- `driver-risk-summary.csv`
- `asset-risk-summary.csv`
- `combined-driver-asset-risk.csv`
- `risk-events.csv`
- `source-normalization.csv`
- `risk-contributions.csv`

CSV columns should include:

- carrierId
- driverId
- assetId
- source
- sourceKey
- domain
- safetyScore
- riskScore
- rating
- confidence
- eventCount
- oosCount
- topContributor
- recommendation

### PDF Export

PDF should be executive and readable:

- cover page
- carrier identity and compliance enrollments
- combined score summary
- source score breakdown
- driver distribution
- asset distribution
- top high-risk drivers
- top high-risk assets
- top high-risk driver+asset combinations
- charts
- action plan
- settings snapshot
- methodology appendix

Use existing PDF patterns from inspection reports if possible.

### Full Export

Full export should be a ZIP or XLSX workbook:

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
- Raw FMCSA
- Raw CVOR
- Raw NSC AB
- Raw NSC BC
- Raw NSC PE
- Raw NSC NS
- Recommendations

Upgrade `exportExcel.ts` so it accepts:

```ts
exportRiskWorkbook({
  carrierId,
  includeRawSources: true,
  includeEntityTabs: true,
  includeMethodology: true,
  format: 'xlsx',
});
```

## Implementation Phases

### Phase 1: Data Inventory And Adapter Contract

Create `risk-engine.types.ts`.

Add adapters:

- `fromFmcsaCarrierProfile`
- `fromFmcsaInspections`
- `fromCvorCarrierProfile`
- `fromCvorInterventionEvents`
- `fromNscAbProfile`
- `fromNscBcProfile`
- `fromNscPeProfile`
- `fromNscNsProfile`
- `fromIncidents`
- `fromHosVedr`
- `fromMaintenanceWorkOrders`
- `fromTrainingDocuments`

Acceptance:

- For any carrier, `getRiskEventsForCarrier(carrierId)` returns a normalized event list.
- Events retain raw source payload.
- Events resolve carrierId, driverId, assetId when available.

### Phase 2: Source Score Normalization

Create source score functions:

- `scoreFmcsaSource`
- `scoreCvorSource`
- `scoreNscAbSource`
- `scoreNscBcSource`
- `scoreNscPeSource`
- `scoreNscNsSource`

Acceptance:

- Each source produces `safetyScore`, `riskScore`, `confidence`, `explanation`.
- Missing/non-enrolled sources are excluded under default `available-only` policy.
- NSC sources can be compared on the same 0-100 scale.

### Phase 3: Entity Scoring

Create:

- `computeCarrierRiskScore(carrierId, settings)`
- `computeDriverRiskScore(carrierId, driverId, settings)`
- `computeAssetRiskScore(carrierId, assetId, settings)`
- `computeDriverAssetRiskScore(carrierId, driverId, assetId, settings)`
- `computeCarrierDriverRiskScore(carrierId, driverId, settings)`
- `computeCarrierAssetRiskScore(carrierId, assetId, settings)`
- `computeCarrierDriverAssetRiskScore(carrierId, driverId, assetId, settings)`

Acceptance:

- Scores include contribution breakdown.
- Scores include confidence.
- Scores are deterministic.
- Settings change recomputes output.

### Phase 4: Distributions And Charts

Create:

- `computeRiskDistribution(scores, settings)`
- `computeRiskTrend(entity, window)`
- `computeSourceBreakdown(carrierId)`
- `computeTopContributors(entity)`
- `computeAssignmentHeatmap(carrierId)`

Acceptance:

- Safety Analysis dashboard can show carrier, driver, asset, and combined charts.
- Distribution respects thresholds from Safety Settings.

### Phase 5: Settings UI

Extend `SafetySettings` and `SafetySettingsPage`.

Add sections:

- Regulatory Source Equivalency
- NSC Normalization
- Combined Entity Weights
- Missing Source / Confidence Policy
- Export Defaults

Acceptance:

- Settings persist to localStorage.
- Formula map includes every new setting.
- Methodology export includes new settings.

### Phase 6: Exports

Refactor export to accept carrier-scoped scoring inputs.

Acceptance:

- CSV export for visible table.
- PDF export for report.
- Full XLSX export with raw source tabs and methodology.
- Export uses selected carrier, not global Acme/static data.

### Phase 7: Validation

Add unit tests for:

- source normalization edge cases
- NSC threshold mapping
- missing source policy
- score band distribution
- entity score weighting
- shared driver+asset event scoring

Manual QA:

- carrier with FMCSA only
- carrier with CVOR only
- carrier with multiple NSCs
- carrier with FMCSA + CVOR + NSC
- driver with no events
- asset with no inspections but many maintenance records
- driver+asset combination with shared OOS inspection

## Suggested Product Behavior

### Carrier View

Show:

- Combined safety score
- Regulatory source chips with score and confidence
- Available sources only
- Score trend
- Distribution of drivers/assets
- Top 5 contributors
- Recommended actions

### Driver View

Show:

- Driver risk score
- Source tabs: FMCSA, CVOR, NSC by jurisdiction
- HOS/VEDR detail
- Incident/preventability
- Training status
- Shared asset risk if driver is assigned to a vehicle

### Asset View

Show:

- Asset risk score
- Inspection/OOS history
- Maintenance/work-order health
- Registration/document expiry risk
- Incident/collision history
- Driver assignment risk impact

### Driver + Asset Assignment View

Show:

- Pair score
- Pair confidence
- Shared history
- Driver score
- Asset score
- Assignment recommendation: `Approve`, `Review`, `Avoid until corrected`

## Key Design Decision

Do not try to force FMCSA, CVOR, and NSC into one fake regulatory formula at the raw-data level. Normalize each source into a common 0-100 source safety score, preserve the source-native score, then combine at the source-score layer.

This keeps the system auditable:

- FMCSA still shows BASIC percentile.
- CVOR still shows rating percentage.
- Alberta still shows R-Factor/stage.
- BC still shows total score/status.
- PEI/NS still show local point/level systems.
- TrackSmart shows the normalized combined score with a clear explanation.

## Immediate Next Build Step

Start with the canonical risk-event ledger and source-score normalizers. Once those exist, charts, distributions, and exports become straightforward because every page reads the same `EntityRiskScore` and `RiskEvent[]` shapes.
