# Safety & Compliance — Frontend Data Reference

Complete inventory of every piece of data rendered by the six compliance pages
in `src/pages/inspections/`. For each field you get:

- **What it is** — plain description
- **Why it's required** — regulatory meaning or operational value
- **Regular format** — how it appears on screen
- **JSON format** — canonical shape for storage / APIs / document extraction

This is the long companion to
[`Safety_Compliance_Upload_Data_Requirements.md`](./Safety_Compliance_Upload_Data_Requirements.md),
which covers only the fields a user types in the Add Inspection modal. **This
document covers the entire rendered page** — header metrics, charts, derived
scores, detail tables, everything a user can see.

> Legend for the "required by" column:
> - **REG** = required by the jurisdiction's regulator (FMCSA / MTO / NSC board)
> - **OP**  = operational — used by carrier staff for day-to-day decisions
> - **AUD** = audit trail — must be retained for inspector / show-cause review
> - **UI**  = derived value — computed by the UI, not read from source

Tabs covered:

1. [FMCSA (US SMS)](#1-fmcsa-us-sms)
2. [CVOR (Ontario)](#2-cvor-ontario)
3. [Alberta NSC](#3-alberta-nsc)
4. [BC NSC](#4-bc-nsc)
5. [PEI NSC](#5-pei-nsc)
6. [Nova Scotia NSC](#6-nova-scotia-nsc)

---

## 1. FMCSA (US SMS)

**Source reports:** FMCSA SMS Carrier Profile, roadside inspection reports
(MCS-63), crash reports (MCS-150).

**Purpose:** Measure the carrier's CSA performance across the 7 BASIC
categories. Used by FMCSA to target interventions and by shippers / insurers
to assess risk. The overall score drives enforcement (warning letter →
offsite investigation → onsite audit → unsatisfactory rating).

### 1.1 Page header — Last Updated banner

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Last Updated | OP | "December 15, 2025 – 3:42 PM EST" | `"2025-12-15T20:42:00Z"` |
| Last Uploaded | OP | same format | `"2025-12-10T14:02:00Z"` |

Why: analysts need to know how stale the SMS snapshot is — BASIC percentiles
shift monthly when FMCSA re-runs its scoring.

### 1.2 Combined SMS Performance Card

#### 1.2.1 FMCSA SMS BASIC Scores (7-row table)

For each of the 7 BASIC categories:

| Column | Required by | Regular format | JSON |
|---|---|---|---|
| BASIC Category | REG | "Unsafe Driving", "Crash Indicator", "HOS Compliance", "Vehicle Maintenance", "Controlled Substances", "HM Compliance", "Driver Fitness" | enum |
| Measure | REG | 0–10 (time-weighted avg severity) | number |
| Percentile | REG | 0–100 | number |
| Alert threshold | REG | 65% (passenger 60%, HM 80%) | number |
| Status | UI | "ALERT" / "Low Data" / "OK" | enum |

**Why each BASIC matters:**
- **Unsafe Driving** — speeding, reckless driving, improper lane change; tied to roadside inspection violations in § 392.
- **Crash Indicator** — state-reported DOT-recordable crashes in the last 24 months, weighted by severity.
- **HOS Compliance** — violations of 49 CFR 395 (drive-time / rest breaks / logbook / ELD).
- **Vehicle Maintenance** — brakes / lights / tires / suspension / coupling per 49 CFR 396.
- **Controlled Substances/Alcohol** — drug & alcohol testing program violations per 49 CFR 382.
- **HM Compliance** — leaking/unmarked hazmat, placarding, shipping papers per 49 CFR 171–180.
- **Driver Fitness** — medical cert, CDL class, endorsements per 49 CFR 391.

Being "ALERT" on any BASIC can trigger an FMCSA investigation.

```json
{
  "basics": [
    { "category": "Unsafe Driving",            "measure": 2.14, "percentile": 68, "alertThreshold": 65, "status": "ALERT" },
    { "category": "Crash Indicator",           "measure": 1.07, "percentile": 54, "alertThreshold": 65, "status": "OK" },
    { "category": "Hours-of-service Compliance","measure": 1.80, "percentile": 42, "alertThreshold": 65, "status": "OK" },
    { "category": "Vehicle Maintenance",       "measure": 3.22, "percentile": 81, "alertThreshold": 80, "status": "ALERT" },
    { "category": "Controlled Substances/Alcohol","measure": 0.00, "percentile": 0, "alertThreshold": 80, "status": "Low Data" },
    { "category": "Hazardous Materials Compliance","measure": 0.00,"percentile": 0,"alertThreshold": 80, "status": "Low Data" },
    { "category": "Driver Fitness",            "measure": 0.34, "percentile": 12, "alertThreshold": 80, "status": "OK" }
  ]
}
```

#### 1.2.2 Inspections by Month — stacked bar chart

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Month | OP | "2025-11" | string `YYYY-MM` |
| withViolations | OP | count | number |
| withoutViolations | OP | count | number |

Why: spotting seasonal volume trends and whether violation rate is worsening
relative to inspection volume (raw count alone is misleading).

```json
{
  "inspectionsByMonth": [
    { "month": "2025-11", "withViolations": 12, "withoutViolations": 38 },
    { "month": "2025-10", "withViolations":  9, "withoutViolations": 41 }
  ]
}
```

#### 1.2.3 Out-of-Service Donut

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Total Violations | REG | center number | number |
| OOS count | REG | "14 (8.2%)" | number + pct |
| Non-OOS count | UI | "156 (91.8%)" | number + pct |

Why: OOS rate is the single most-scrutinized metric by FMCSA investigators —
above 20% vehicle OOS or 5% driver OOS typically triggers a compliance review.

```json
{
  "oosDonut": {
    "totalViolations": 170,
    "oos": 14, "oosPct": 8.2,
    "nonOos": 156, "nonOosPct": 91.8
  }
}
```

#### 1.2.4 Top Violations (bar chart, sortable by points or count)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Code | REG | "393.47A-BSF" | string |
| Description | REG | "Inadequate brake stopping distance" | string |
| Count | OP | number | number |
| Points | REG | severity × weight × timeWeight | number |

Why: identifies the *specific* defect driving the BASIC score — maintenance
managers need this to target repairs and training, not category-level scores.

#### 1.2.5 SMS Inspection Levels (I–VIII grid)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Level | REG | "Level 1", "Level 2" … "Level 8" | string |
| Count | OP | inspections at this level | number |
| OOS Count | REG | OOS events at this level | number |
| OOS % | UI | oosCount / count | number 0–100 |

Why: Level 1 is a full N-point inspection; Level 2/3 are lighter. A high OOS
rate on Level 1 is far more significant than on Level 2.

### 1.3 BASIC Metrics by State (sortable table)

| Column | Required by | Regular format | JSON |
|---|---|---|---|
| State | REG | "MI", "CA", etc. | 2-letter code |
| Per-BASIC counts | REG | 7 columns, one per BASIC | number |
| Total | UI | "Inspections" OR "Violations" OR "Points" (toggle) | number |

Why: identifies which states your fleet gets pulled over in most, and
whether a specific state is driving your BASIC scores. Some states (CA, TX,
OH) run far more inspections than others.

### 1.4 Per-inspection record (shown on expand and in Add Inspection form)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Report # | REG | "MIGRAHA00829" | string |
| Date / Time | REG | "2025-08-14 09:15–10:40" | ISO |
| State | REG | "MI" | 2-letter |
| Level | REG | "Level 2" | string |
| Location | OP | `{city, province, raw}` | object |
| Driver (id, name, licence) | REG | — | object |
| Vehicle (plate, type, asset, units[]) | REG | — | object |
| Violations[] | REG | see schema below | array |
| Power Unit Defects | OP | free text | string |
| Trailer Defects | OP | free text | string |
| OOS summary (driver / vehicle / total) | REG | "PASSED / FAILED" | enum |
| SMS Points (driver / vehicle / carrier) | UI | sum of violation points by tier | numbers |

Violation shape:

```json
{
  "code": "393.47A-BSF",
  "category": "Vehicle Maintenance",
  "description": "Inadequate brake stopping distance",
  "subDescription": "Air Brakes",
  "severity": 4,
  "weight": 3,
  "points": 12,
  "oos": true,
  "driverRiskCategory": 3
}
```

### 1.5 Full FMCSA page JSON (worked example)

```json
{
  "kind": "fmcsa",
  "lastUpdated": "2025-12-15T20:42:00Z",
  "lastUploaded": "2025-12-10T14:02:00Z",
  "basics": [
    { "category": "Unsafe Driving",                "measure": 2.14, "percentile": 68, "alertThreshold": 65, "status": "ALERT" },
    { "category": "Crash Indicator",               "measure": 1.07, "percentile": 54, "alertThreshold": 65, "status": "OK" },
    { "category": "Hours-of-service Compliance",   "measure": 1.80, "percentile": 42, "alertThreshold": 65, "status": "OK" },
    { "category": "Vehicle Maintenance",           "measure": 3.22, "percentile": 81, "alertThreshold": 80, "status": "ALERT" },
    { "category": "Controlled Substances/Alcohol", "measure": 0.00, "percentile":  0, "alertThreshold": 80, "status": "Low Data" },
    { "category": "Hazardous Materials Compliance","measure": 0.00, "percentile":  0, "alertThreshold": 80, "status": "Low Data" },
    { "category": "Driver Fitness",                "measure": 0.34, "percentile": 12, "alertThreshold": 80, "status": "OK" }
  ],
  "inspectionsByMonth": [
    { "month": "2025-11", "withViolations": 12, "withoutViolations": 38 },
    { "month": "2025-10", "withViolations":  9, "withoutViolations": 41 },
    { "month": "2025-09", "withViolations": 14, "withoutViolations": 33 },
    { "month": "2025-08", "withViolations": 11, "withoutViolations": 39 },
    { "month": "2025-07", "withViolations":  8, "withoutViolations": 36 },
    { "month": "2025-06", "withViolations": 10, "withoutViolations": 34 }
  ],
  "oosDonut": {
    "totalViolations": 170,
    "oos": 14,  "oosPct": 8.2,
    "nonOos": 156, "nonOosPct": 91.8
  },
  "topViolations": [
    { "code": "393.47A-BSF", "description": "Inadequate brake stopping distance",            "count": 18, "points": 216 },
    { "code": "395.8(e)",    "description": "False report of driver's record of duty status","count": 11, "points": 165 },
    { "code": "393.9",       "description": "Inoperable required lamp",                       "count": 24, "points":  96 },
    { "code": "391.11",      "description": "Driver lacking physical qualification",           "count":  6, "points":  72 },
    { "code": "393.75A1",    "description": "Flat tire or fabric exposed",                     "count":  9, "points":  54 },
    { "code": "396.3A1",     "description": "Inspection/repair/maintenance requirements",       "count": 15, "points":  45 }
  ],
  "levelStats": [
    { "level": "Level 1", "count": 42, "oosCount": 7, "oosPct": 16.7 },
    { "level": "Level 2", "count": 68, "oosCount": 4, "oosPct":  5.9 },
    { "level": "Level 3", "count": 51, "oosCount": 2, "oosPct":  3.9 },
    { "level": "Level 4", "count":  3, "oosCount": 0, "oosPct":  0.0 },
    { "level": "Level 5", "count":  1, "oosCount": 0, "oosPct":  0.0 },
    { "level": "Level 6", "count":  0, "oosCount": 0, "oosPct":  0.0 },
    { "level": "Level 7", "count":  0, "oosCount": 0, "oosPct":  0.0 },
    { "level": "Level 8", "count":  5, "oosCount": 1, "oosPct": 20.0 }
  ],
  "stateMetrics": [
    { "state": "MI", "inspections": 42, "violations": 28, "points": 187, "basics": { "Unsafe Driving": 5, "Crash Indicator": 2, "Hours-of-service Compliance": 6, "Vehicle Maintenance": 11, "Controlled Substances/Alcohol": 0, "Hazardous Materials Compliance": 0, "Driver Fitness": 4 } },
    { "state": "OH", "inspections": 31, "violations": 19, "points": 121, "basics": { "Unsafe Driving": 3, "Crash Indicator": 1, "Hours-of-service Compliance": 4, "Vehicle Maintenance":  8, "Controlled Substances/Alcohol": 0, "Hazardous Materials Compliance": 0, "Driver Fitness": 3 } },
    { "state": "PA", "inspections": 27, "violations": 12, "points":  78, "basics": { "Unsafe Driving": 2, "Crash Indicator": 0, "Hours-of-service Compliance": 3, "Vehicle Maintenance":  5, "Controlled Substances/Alcohol": 0, "Hazardous Materials Compliance": 0, "Driver Fitness": 2 } },
    { "state": "NY", "inspections": 22, "violations":  8, "points":  41, "basics": { "Unsafe Driving": 1, "Crash Indicator": 0, "Hours-of-service Compliance": 2, "Vehicle Maintenance":  4, "Controlled Substances/Alcohol": 0, "Hazardous Materials Compliance": 0, "Driver Fitness": 1 } },
    { "state": "IN", "inspections": 18, "violations":  6, "points":  32, "basics": { "Unsafe Driving": 1, "Crash Indicator": 1, "Hours-of-service Compliance": 1, "Vehicle Maintenance":  3, "Controlled Substances/Alcohol": 0, "Hazardous Materials Compliance": 0, "Driver Fitness": 0 } }
  ],
  "inspections": [
    {
      "id": "MIGRAHA00829",
      "date": "2025-08-14",
      "startTime": "09:15", "endTime": "10:40",
      "state": "MI", "level": "Level 2",
      "location": { "street": "I-94 MM178", "city": "Battle Creek", "province": "MI", "raw": "BATTLE CREEK, MI" },
      "driverId": "DRV-2001",
      "driver": "RANDEEP SINGH",
      "driverLicense": "D1234-5678-9012",
      "vehiclePlate": "ABC-123",
      "vehicleType": "Truck Tractor",
      "assetId": "a1",
      "units": [
        { "type": "Truck Tractor", "make": "Freightliner", "license": "ABC-123", "vin": "1FUJGHDV9CLBK1234" },
        { "type": "Trailer",       "make": "Utility",      "license": "TRL-5588","vin": "1UYVS2530LU000456" }
      ],
      "powerUnitDefects": "Left front brake out of adjustment",
      "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "FAILED", "total": 1 },
      "smsPoints": { "driver": 0, "vehicle": 12, "carrier": 0 },
      "isClean": false, "hasOOS": true,
      "hasVehicleViolations": true, "hasDriverViolations": false,
      "severityRate": 4.0,
      "violations": [
        { "code": "393.47A-BSF", "category": "Vehicle Maintenance", "description": "Inadequate brake stopping distance", "subDescription": "Air Brakes", "severity": 4, "weight": 3, "points": 12, "oos": true, "driverRiskCategory": 3 }
      ]
    },
    {
      "id": "OHINSPK01204",
      "date": "2025-07-22",
      "startTime": "14:05", "endTime": "14:40",
      "state": "OH", "level": "Level 3",
      "location": { "street": "I-80 MM91", "city": "Sandusky", "province": "OH", "raw": "SANDUSKY, OH" },
      "driverId": "DRV-2014",
      "driver": "MANPREET KAUR",
      "driverLicense": "K5544-3322-1100",
      "vehiclePlate": "DEF-456",
      "vehicleType": "Truck Tractor",
      "assetId": "a4",
      "units": [{ "type": "Truck Tractor", "make": "Volvo", "license": "DEF-456", "vin": "4V4NC9GH2PN123456" }],
      "powerUnitDefects": "",
      "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "PASSED", "total": 0 },
      "smsPoints": { "driver": 0, "vehicle": 0, "carrier": 0 },
      "isClean": true, "hasOOS": false,
      "hasVehicleViolations": false, "hasDriverViolations": false,
      "severityRate": null,
      "violations": []
    }
  ]
}
```

---

## 2. CVOR (Ontario)

**Source reports:** Ontario MTO CVOR Abstract (R-Factor report),
roadside inspection reports, conviction notices, collision reports.

**Purpose:** MTO uses the CVOR rating to decide whether a carrier gets a
warning letter, compliance audit, show-cause hearing, or registration
seizure. Unlike FMCSA's per-BASIC percentiles, CVOR is a single weighted
rating: 40% collisions + 40% convictions + 20% inspections.

### 2.1 Page header

- Last Updated / Last Uploaded timestamps (same as FMCSA).

### 2.2 CVOR Performance Summary Card

#### 2.2.1 Overall CVOR Rating

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Rating % | REG | "42.7%" on gradient bar | number 0–100+ |
| Status | UI | OK / WARNING / AUDIT / SHOW CAUSE / SEIZURE | enum |
| Guidance text | UI | "7.3% above Audit threshold" | string |
| Thresholds (warn/audit/show/seize) | REG | 35 / 50 / 85 / 100 | numbers |

Why each status matters:
- **OK (< 35%)** — no regulatory action.
- **WARNING (35–50%)** — letter issued; carrier must submit corrective plan.
- **AUDIT (50–85%)** — MTO compliance audit; on-site review of records.
- **SHOW CAUSE (85–100%)** — carrier must justify why their CVOR shouldn't be revoked.
- **SEIZURE (> 100%)** — commercial vehicle registration suspended.

```json
{
  "overall": {
    "rating": 42.7,
    "status": "WARNING",
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 }
  }
}
```

#### 2.2.2 Category tiles (3 columns)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Collisions | REG | % of threshold, events, points | object |
| Convictions | REG | % of threshold, events, points | object |
| Inspections | REG | % of threshold, events, OOS rate | object |

```json
{
  "categories": {
    "collisions":  { "pctOfThresh": 18.3, "events": 5,  "points": 8, "contribution": 40 },
    "convictions": { "pctOfThresh": 22.1, "events": 7,  "points": 9, "contribution": 40 },
    "inspections": { "pctOfThresh": 11.5, "events": 42, "oosRate": 8.1, "contribution": 20 }
  }
}
```

Why: the weighting tells you where to focus. Even a small absolute change in
collisions moves the CVOR twice as much as the same change in inspections.

#### 2.2.3 OOS Rates — 3 tiles

| Metric | Threshold | Regular format | JSON |
|---|---|---|---|
| Overall OOS | 30% | "8.1% (threshold 30%)" | `{ current, threshold }` |
| Vehicle OOS | 25% | "6.4%" | |
| Driver OOS | 10% | "1.7%" | |

Why: MTO tracks these separately from the main rating. Even if your CVOR
rating is OK, breaching a per-vehicle or per-driver OOS threshold can
trigger intervention.

```json
{
  "oosRates": {
    "overall":  { "current": 8.1, "threshold": 30, "enabled": true },
    "vehicle":  { "current": 6.4, "threshold": 25, "enabled": true },
    "driver":   { "current": 1.7, "threshold": 10, "enabled": true }
  }
}
```

#### 2.2.4 Recommended Actions (collapsible list)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Severity | UI | critical / warning / info | enum |
| Title | UI | "Vehicle OOS approaching threshold" | string |
| Description | UI | prose | string |

Why: auto-generated advice translates raw numbers into next steps
(e.g. "schedule CVSA prep training", "run ELD audit"). Saves dispatcher time.

#### 2.2.5 Mileage Summary (4 columns)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Ontario miles | REG | number | number |
| Canada miles | REG | number | number |
| US / Mexico miles | REG | number | number |
| Total miles | REG | number | number |

Why: CVOR scores are normalized by mileage — a carrier running 10M miles
with 50 inspections is very different from one running 500k miles with the
same 50 inspections. MTO requires accurate mileage for scoring.

#### 2.2.6 CVOR Rating Comparison Table (Levels 1–5)

| Column | Required by | Regular format | JSON |
|---|---|---|---|
| Level | REG | "Level 1" … "Level 5" | string |
| Inspection count | REG | number | number |
| OOS count | REG | number | number |
| OOS % | UI | percent | number |

### 2.3 Performance History Charts

Six synchronized SVG line/area charts, each 24 months on the X axis:

| Chart | Y axis | Purpose |
|---|---|---|
| Overall CVOR Rating Over Time | rating % | trending toward audit? |
| Collisions Contribution | pct of thresh | driving factor? |
| Convictions Contribution | pct of thresh | driving factor? |
| Inspections Contribution | pct of thresh | driving factor? |
| OOS Overall Over Time | OOS % | below 30 threshold? |
| OOS Vehicle / Driver | stacked % | root-cause of OOS |

Data shape per point:

```json
{
  "periodLabel": "Jun 23/24",
  "reportDate": "2024-06-30",
  "rating": 42.7,
  "colContrib": 18.3, "conContrib": 22.1, "insContrib": 11.5,
  "colPctOfThresh": 18.3, "conPctOfThresh": 22.1, "insPctOfThresh": 11.5,
  "collisionEvents": 5, "convictionEvents": 7,
  "oosOverall": 8.1, "oosVehicle": 6.4, "oosDriver": 1.7,
  "trucks": 42, "onMiles": 1_200_000, "canadaMiles": 2_800_000, "totalMiles": 5_400_000,
  "collWithPoints": 3, "collWithoutPoints": 2,
  "totalCollisionPoints": 8, "convictionPoints": 9
}
```

Why periodic data: MTO pulls a new CVOR rating every month using a
24-month rolling window. Seeing the trend is more useful than the latest
snapshot when deciding whether to push corrective-action urgency.

### 2.4 CVOR Inspections Table (per-inspection rows)

Same schema as FMCSA per-inspection plus `cvorPoints: { vehicle, driver, cvor }`
(note: CVOR has only 2 tiers — no "carrier" points unlike SMS).

### 2.5 Attached Documents (per-inspection)

Inspection Report · Driver Statement · VIR · Work Order / Repair Invoice ·
Bill of Lading · Driver Log / ELD Record · Proof of Insurance · Permit /
Registration · Photograph Evidence · MTO Correspondence · Other.

Why: MTO requires the carrier to retain these for the audit period
(typically 5 years). Attaching directly to the inspection record preserves
the evidence chain.

### 2.6 Full CVOR page JSON (worked example)

```json
{
  "kind": "cvor",
  "lastUpdated":  "2025-04-17T16:00:00Z",
  "lastUploaded": "2025-04-15T10:20:00Z",
  "overall": {
    "rating": 42.7,
    "status": "WARNING",
    "guidance": "7.3% below Audit threshold",
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 }
  },
  "categories": {
    "collisions":  { "pctOfThresh": 18.3, "events": 5,  "points": 8, "contribution": 40 },
    "convictions": { "pctOfThresh": 22.1, "events": 7,  "points": 9, "contribution": 40 },
    "inspections": { "pctOfThresh": 11.5, "events": 42, "oosRate": 8.1, "contribution": 20 }
  },
  "oosRates": {
    "overall": { "current":  8.1, "threshold": 30, "enabled": true },
    "vehicle": { "current":  6.4, "threshold": 25, "enabled": true },
    "driver":  { "current":  1.7, "threshold": 10, "enabled": true }
  },
  "recommendedActions": [
    { "severity": "warning",  "title": "CVOR rating in Warning band",           "description": "Submit corrective action plan to MTO within 30 days." },
    { "severity": "warning",  "title": "Vehicle OOS approaching threshold",     "description": "Vehicle OOS rate 6.4% is 74% of the 25% trigger. Tighten pre-trip inspection process." },
    { "severity": "info",     "title": "Focus remediation on collisions",       "description": "Collisions are the highest-weighted contribution at 40%. Review at-fault incidents from last 12 months." }
  ],
  "mileage": {
    "ontarioMiles": 1200000,
    "canadaMiles":  2800000,
    "usMexicoMiles": 1400000,
    "totalMiles":    5400000
  },
  "levelComparison": [
    { "level": "Level 1", "count": 11, "oosCount": 3, "oosPct": 27.3 },
    { "level": "Level 2", "count": 18, "oosCount": 1, "oosPct":  5.6 },
    { "level": "Level 3", "count": 10, "oosCount": 0, "oosPct":  0.0 },
    { "level": "Level 4", "count":  2, "oosCount": 0, "oosPct":  0.0 },
    { "level": "Level 5", "count":  1, "oosCount": 0, "oosPct":  0.0 }
  ],
  "periodicReports": [
    { "periodLabel": "Jun 23/24", "reportDate": "2024-06-30", "rating": 42.7, "colContrib": 18.3, "conContrib": 22.1, "insContrib":  2.3, "colPctOfThresh": 18.3, "conPctOfThresh": 22.1, "insPctOfThresh": 11.5, "collisionEvents": 5, "convictionEvents": 7, "oosOverall":  8.1, "oosVehicle":  6.4, "oosDriver": 1.7, "trucks": 42, "onMiles": 1200000, "canadaMiles": 2800000, "totalMiles": 5400000, "collWithPoints": 3, "collWithoutPoints": 2, "totalCollisionPoints": 8,  "convictionPoints": 9 },
    { "periodLabel": "May 23/24", "reportDate": "2024-05-31", "rating": 41.2, "colContrib": 17.9, "conContrib": 21.4, "insContrib":  1.9, "colPctOfThresh": 17.9, "conPctOfThresh": 21.4, "insPctOfThresh":  9.5, "collisionEvents": 5, "convictionEvents": 6, "oosOverall":  7.6, "oosVehicle":  6.0, "oosDriver": 1.6, "trucks": 41, "onMiles": 1180000, "canadaMiles": 2750000, "totalMiles": 5280000, "collWithPoints": 3, "collWithoutPoints": 2, "totalCollisionPoints": 8,  "convictionPoints": 8 },
    { "periodLabel": "Apr 23/24", "reportDate": "2024-04-30", "rating": 39.8, "colContrib": 17.2, "conContrib": 20.3, "insContrib":  2.3, "colPctOfThresh": 17.2, "conPctOfThresh": 20.3, "insPctOfThresh": 11.5, "collisionEvents": 4, "convictionEvents": 6, "oosOverall":  8.0, "oosVehicle":  6.6, "oosDriver": 1.4, "trucks": 40, "onMiles": 1155000, "canadaMiles": 2700000, "totalMiles": 5175000, "collWithPoints": 2, "collWithoutPoints": 2, "totalCollisionPoints": 6,  "convictionPoints": 7 }
  ],
  "inspections": [
    {
      "id": "ONWINDS16001",
      "date": "2025-04-12",
      "startTime": "14:20", "endTime": "15:55",
      "state": "ON", "level": "Level 2",
      "location": { "street": "Hwy 401 EB", "city": "Windsor", "province": "ON", "raw": "WINDSOR, ON" },
      "driverId": "DRV-3001",
      "driver": "NAVJOT SINGH",
      "driverLicense": "S1234-56789-01234",
      "vehiclePlate": "AB 12 345",
      "vehicleType": "Truck Tractor",
      "assetId": "a5",
      "units": [{ "type": "Truck Tractor", "make": "Volvo", "license": "AB 12 345", "vin": "1FUJGHDV9CLBK1234" }],
      "powerUnitDefects": "ABS warning lamp inoperable",
      "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "FAILED", "total": 1 },
      "cvorPoints": { "driver": 0, "vehicle": 5, "cvor": 5 },
      "fine": { "amount": "125.00", "currency": "CAD" },
      "violations": [
        { "code": "O.Reg.199/07 s.6(1)", "category": "Vehicle Maintenance", "description": "Defective ABS indicator", "subDescription": "Brakes", "severity": 3, "weight": 3, "points": 5, "oos": true, "driverRiskCategory": 2 }
      ],
      "attachedDocs": [
        { "id": "d-0001", "docType": "Inspection Report",  "docNumber": "VIR-2025-04-12", "issueDate": "2025-04-12", "fileName": "vir.pdf", "fileSize": 234120 },
        { "id": "d-0002", "docType": "Work Order / Repair Invoice", "docNumber": "WO-88210","issueDate": "2025-04-14", "fileName": "wo88210.pdf", "fileSize": 87540 }
      ]
    }
  ]
}
```

---

## 3. Alberta NSC

**Source:** Alberta Transportation NSC Carrier Profile.

**Purpose:** Alberta uses an R-Factor (relative-risk factor, 0.0–1.0+) to
compare a carrier against peers in its fleet-size band. Monitoring stages
escalate regulatory attention (Not Monitored → Stage 1–4 → Facility Audit
→ Safety Fitness Certificate revoke).

### 3.1 Page header

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Last Updated | OP | timestamp | ISO |
| Last Uploaded | OP | timestamp | ISO |

### 3.2 NSC Performance Card

#### 3.2.1 R-Factor Gauge

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| R-Factor | REG | "0.062" | number 3 decimals |
| Monitoring Stage | REG | "Not Monitored" / "Stage 1–4" | enum |
| Fleet Range | REG | "30.0–44.9" | string |
| Fleet Type | REG | "Truck" / "Bus" / "Truck & Bus" | enum |
| Stage Thresholds | REG | table per stage `{low, high}` | array |
| Status Message | UI | "0.355 below Stage 1" | string |

Why:
- **R-Factor** is the single number AB Transportation judges you on. It is
  a weighted mix of convictions (40%), admin penalties, CVSA inspections,
  and reportable collisions.
- **Stage Thresholds** are fleet-size-specific — a 10-truck fleet and a
  100-truck fleet have different Stage 1 boundaries. The raw R-Factor
  alone is meaningless without the band.

```json
{
  "performanceCard": {
    "rFactor": 0.062,
    "monitoringStage": "Not Monitored",
    "fleetRange": "30.0-44.9",
    "fleetType": "Truck",
    "stageThresholds": [
      { "stage": 1, "low": 0.42, "high": 0.55 },
      { "stage": 2, "low": 0.55, "high": 0.70 },
      { "stage": 3, "low": 0.70, "high": 0.85 },
      { "stage": 4, "low": 0.85, "high": null }
    ],
    "statusMessage": "0.358 below Stage 1"
  }
}
```

#### 3.2.2 Contribution tiles (4 sources of R-Factor)

| Tile | pct | events | Why it matters |
|---|---|---|---|
| Convictions | 34.6% | 5 | HTA / O.Reg convictions against drivers & carrier |
| Admin Penalties | 0.0% | 0 | AB administrative monetary penalties |
| CVSA Inspections | 32.3% | 43 | OOS findings at roadside inspections |
| Reportable Collisions | 33.1% | 6 | Collisions meeting AB's reportability criteria |

Points to Stage 1 typically land on whichever contribution is highest —
focus remediation effort there.

#### 3.2.3 NSC Fleet & Monitoring (6 stats)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Avg Fleet Size | REG | "40.0" | number 1 decimal |
| Current Fleet Size | REG | "40" | number |
| Monitoring As-Of | REG | "2026 JAN 31" (month-end) | raw + ISO |
| Monitoring R-Factor | REG | "0.185" | number |
| Monitoring Stage (latest) | REG | "Not on Monitoring" | enum |
| Total AB Carriers | REG | "17,704" | number |

Why "Total AB Carriers" is on the page: so a user knows the denominator
when comparing themselves to peers.

#### 3.2.4 Conviction Totals (3 stats)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Documents | REG | count | number |
| Convictions | REG | count | number |
| Points | REG | sum | number |

#### 3.2.5 Carrier Identifiers

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| NSC Number | REG | "AB257-4556" | string |
| MVID Number | REG | "0895-41544" | string |
| Operating Status | REG | "Federal" / "Provincial" | enum |

#### 3.2.6 Safety Fitness Certificate

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Certificate No. | REG | "002449387" | string |
| Effective | REG | "2026 JAN 07" | raw + ISO |
| Expiry | REG | "2028 DEC 31" | raw + ISO |
| Safety Rating | REG | "Excellent" / "Satisfactory" / "Satisfactory Unaudited" / "Conditional" / "Unsatisfactory" | enum |

Why: without an active SFC, the carrier cannot legally operate commercial
vehicles in or through Alberta. Audit / rating affects insurance rates.

### 3.3 Latest-Pull Detail Sections

Each section has a summary table, grouped summary, and detail rows. Fields
captured by the form are summarized here — see the full schemas in
[`Safety_Compliance_Upload_Data_Requirements.md`](./Safety_Compliance_Upload_Data_Requirements.md).

#### 3.3.1 Conviction Analysis

- Grouped rows: group name, count, percentage
- Summary rows: seq, date, document#, docket#, jurisdiction, vehicle, driver, offence, points
- Detail rows: seq, date, time, document, docket, jurisdiction, dateEntered, issuingAgency, location, driver, vehicle, commodity, actSection, actDesc, CCMTA code, convVehicle, convDate, activePts

Why detail level: during an MTO / Alberta hearing, the carrier must be
able to cross-reference each conviction against a driver record, a ticket,
and a disposition date. Missing any of these can void the record.

#### 3.3.2 CVSA Inspection Analysis

- Defect rows: code, label, oos count, req count, total, percentage
- Summary rows: seq, date, document, jurisdiction, agency, plate, plate-jurisdiction, level, result
- Vehicle sub-rows: type (P/ST/etc), plate, jurisdiction, VIN, year, make, CVSA decal
- Detail rows: seq, date, time, document, jurisdiction, level, result, dateEntered, agency, location, driver, vehicles[], defects[]

#### 3.3.3 Collision Information

- Totals: Property Damage / Injury / Fatal counts, non-preventable, preventable-or-not-evaluated, points
- Summary rows: seq, date, document, jur, plate, plateJur, status, preventable, severity, points, driver
- Detail rows: seq, date, time, document, jur, plate, plateJur, severity, assessment, driver, location, vehicle, vin, activePts

#### 3.3.4 Violation Information

- Admin penalty rows: date, document, description, points

#### 3.3.5 Monitoring Information (21-month history)

| Column | Required by | Regular format | JSON |
|---|---|---|---|
| Date | REG | month-end | ISO |
| Type | REG | "MONT" | enum |
| Truck % / Bus % | REG | 0–100 | number |
| Industry Avg / Current | REG | number | number |
| Score | REG | R-Factor | number |
| Contribution pcts (conv / insp / coll) | REG | 0–100 | number |
| Stage | REG | "Not on Monitoring" / "Stage 1–4" | enum |

#### 3.3.6 Facility Licence Information

Typically empty for carriers without a repair facility — shown to confirm
the absence.

#### 3.3.7 Safety Fitness Information

Two tables: Safety Rating history and Operating Status history.

#### 3.3.8 Historical Summary (35+ events)

| Column | Required by | Regular format | JSON |
|---|---|---|---|
| Date | AUD | ISO | ISO |
| Type | AUD | MONT / CVSA / CONV / VIOL / SAFE / COLL | enum |
| Jurisdiction | AUD | "AB" | 2-letter |
| Description | AUD | prose | string |

Why: one unified timeline for AUD purposes. When defending at a hearing,
the carrier needs to show chronology — the historical summary is the
single source used by auditors.

### 3.4 Full Alberta page JSON (worked example)

```json
{
  "kind": "ab",
  "performanceCard": {
    "carrierName": "VM Motors Inc.",
    "rFactor": 0.062,
    "monitoringStage": "Not Monitored",
    "fleetRange": "30.0-44.9",
    "fleetType": "Truck",
    "stageThresholds": [
      { "stage": 1, "low": 0.42, "high": 0.55 },
      { "stage": 2, "low": 0.55, "high": 0.70 },
      { "stage": 3, "low": 0.70, "high": 0.85 },
      { "stage": 4, "low": 0.85, "high": null }
    ],
    "statusMessage": "0.358 below Stage 1"
  },
  "contributions": {
    "convictions":          { "pct": 34.6, "events":  5 },
    "adminPenalties":       { "pct":  0.0, "events":  0 },
    "cvsaInspections":      { "pct": 32.3, "events": 43 },
    "reportableCollisions": { "pct": 33.1, "events":  6 }
  },
  "fleetMonitoring": {
    "fleetAvg": 40.0,
    "fleetCurrent": 40,
    "monitoringAsOf":    "2026-01-31", "monitoringAsOfRaw":  "2026 JAN 31",
    "monitoringRFactor": 0.185,
    "monitoringStage":   "Not on Monitoring",
    "totalCarriersAB":   17704
  },
  "convictionTotals": { "documents": 3, "count": 3, "points": 3 },
  "carrierIdentifiers": {
    "nscNumber": "AB257-4556",
    "mvidNumber": "0895-41544",
    "operatingStatus": "Federal"
  },
  "certificate": {
    "certNumber": "002449387",
    "certEffective": "2026-01-07", "certEffectiveRaw": "2026 JAN 07",
    "certExpiry":    "2028-12-31", "certExpiryRaw":    "2028 DEC 31",
    "safetyRating":  "Satisfactory Unaudited"
  },
  "events": {
    "convictions": [
      { "id": "ab-c-0001", "seq": 1, "date": "2025-11-18", "time": "14:02", "documentNo": "CNV-40231", "docketNo": "DKT-9912", "jurisdiction": "AB", "dateEntered": "2025-12-02", "issuingAgency": "Alberta Sheriff", "location": "Calgary, AB",     "driver": "S. Thompson", "vehicle": "2019 Peterbilt", "plate": "PLT-001", "commodity": "General freight", "actSection": "HTA s.128(1)", "actDesc": "Speeding", "ccmtaCode": "0001", "convVehicle": "PLT-001", "convDate": "2025-12-15", "activePts": 3 },
      { "id": "ab-c-0002", "seq": 2, "date": "2025-08-03", "time": "09:45", "documentNo": "CNV-40110", "docketNo": "DKT-9807", "jurisdiction": "AB", "dateEntered": "2025-08-15", "issuingAgency": "RCMP",            "location": "Edmonton, AB",    "driver": "R. Patel",     "vehicle": "2020 Volvo",     "plate": "PLT-004", "commodity": "General freight", "actSection": "HTA s.154(1)", "actDesc": "Improper lane use", "ccmtaCode": "0303", "convVehicle": "PLT-004", "convDate": "2025-09-02", "activePts": 2 }
    ],
    "cvsaInspections": [
      { "id": "ab-i-0001", "seq": 1, "date": "2026-01-14", "time": "11:20", "documentNo": "CVSA-12931", "jurisdiction": "AB", "level": "Level 2", "result": "Pass",            "dateEntered": "2026-01-16", "agency": "Alberta Sheriff", "location": "Leduc, AB",    "driver": "S. Thompson",
        "vehicles": [ { "type": "P",  "plate": "PLT-001", "jurisdiction": "AB", "vin": "1XKYD49X8DJ309234", "year": 2019, "make": "Peterbilt", "cvsaDecal": "DE-4421" } ],
        "defects": [] },
      { "id": "ab-i-0002", "seq": 2, "date": "2025-10-22", "time": "15:05", "documentNo": "CVSA-12801", "jurisdiction": "AB", "level": "Level 1", "result": "Out of Service",  "dateEntered": "2025-10-23", "agency": "RCMP",            "location": "Red Deer, AB", "driver": "M. Lee",
        "vehicles": [ { "type": "P",  "plate": "PLT-003", "jurisdiction": "AB", "vin": "1FUJGHDV9CLBK1234", "year": 2020, "make": "Freightliner","cvsaDecal": "" } ],
        "defects": [ { "code": "393.47A-BSF", "label": "Inadequate brake stopping distance", "oos": 1, "req": 0, "total": 1, "pct": 100 } ] }
    ],
    "collisions": [
      { "id": "ab-col-0001", "seq": 1, "date": "2025-09-07", "time": "17:14", "documentNo": "COL-8812", "jurisdiction": "AB", "plate": "PLT-002", "plateJur": "AB", "status": "Closed",  "preventable": "Preventable", "severity": "Property Damage", "points": 2, "driver": "M. Lee", "location": "Highway 2, AB", "vehicle": "2021 Volvo", "vin": "4V4NC9GH2PN123456", "activePts": 2 }
    ],
    "adminPenalties": [],
    "monitoring": [
      { "id": "ab-m-0001", "date": "2026-01-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.189, "cur": 0.185, "score": 0.185, "convPct": 34.6, "inspPct": 32.3, "collPct": 33.1, "stage": "Not on Monitoring" },
      { "id": "ab-m-0002", "date": "2025-12-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.201, "cur": 0.192, "score": 0.192, "convPct": 35.2, "inspPct": 31.8, "collPct": 33.0, "stage": "Not on Monitoring" },
      { "id": "ab-m-0003", "date": "2025-11-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.210, "cur": 0.205, "score": 0.205, "convPct": 36.0, "inspPct": 30.9, "collPct": 33.1, "stage": "Not on Monitoring" }
    ],
    "facilityLicences": [],
    "safetyRatingHistory": [
      { "seq": 1, "effective": "2026-01-07", "expiry": "2028-12-31", "description": "Satisfactory Unaudited", "comments": "Issued at renewal" }
    ],
    "operatingStatusHistory": [
      { "seq": 1, "effective": "2022-03-15", "inactive": null, "description": "Federal" }
    ],
    "historicalEvents": [
      { "id": "ab-h-0001", "seq": 1, "date": "2026-01-31", "type": "MONT", "jurisdiction": "AB", "description": "Monthly R-Factor snapshot 0.185" },
      { "id": "ab-h-0002", "seq": 2, "date": "2025-11-18", "type": "CONV", "jurisdiction": "AB", "description": "HTA 128(1) Speeding — 3 pts" },
      { "id": "ab-h-0003", "seq": 3, "date": "2025-10-22", "type": "CVSA", "jurisdiction": "AB", "description": "Level 1 — Out of Service (brake defect)" },
      { "id": "ab-h-0004", "seq": 4, "date": "2025-09-07", "type": "COLL", "jurisdiction": "AB", "description": "Property damage collision, at-fault, 2 pts" }
    ]
  }
}
```

---

## 4. BC NSC

**Source:** BC Passenger Transportation Branch / CVSE NSC Carrier Profile.

**Purpose:** BC uses absolute scores (not percentiles or R-Factor) — a
combined Contraventions + CVSA + Accidents score. Each category has
Satisfactory / Conditional / Unsatisfactory threshold bands. If the
total score or any individual category breaches, a compliance review is
triggered.

### 4.1 Demographics (header section)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Carrier Name | REG | "INERTIA CARRIER LTD." | string |
| NSC Number | REG | "BC123456" | string |
| Jurisdiction | REG | "BC" | 2-letter |
| Primary Business Type | REG | "General Freight" | string |
| Mailing Address | REG | multiline | string |
| Certificate Issue Date | REG | ISO | ISO |
| Extra-Provincial | REG | yes/no | boolean |
| Premium Carrier | REG | yes/no | boolean |
| Weigh2GoBC participant | OP | yes/no | boolean |
| Preventative Maintenance | OP | yes/no | boolean |
| Licensed Vehicles | REG | count | number |
| Report Run Date | AUD | ISO | ISO |
| Profile From / Profile To | REG | ISO | ISO |

Why Weigh2GoBC / Preventative Maintenance: they waive some inspections
at weigh scales — an analyst compares inspection counts with vs. without
these programs to judge their effectiveness.

### 4.2 Certificate

| Field | Regular format | JSON |
|---|---|---|
| Certificate Status | "Active" / "Expired" / "Suspended" | enum |
| Safety Rating | "Satisfactory" / "Conditional" / "Unsatisfactory" | enum |
| Profile Status | "Satisfactory" / "Conditional" / "Unsatisfactory" | enum |
| Audit Status | "Unaudited" / "Audited" | enum |

### 4.3 Compliance Review (Latest Pull)

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| As-Of Date | REG | "31-Mar-2025" | ISO |
| Average Fleet Size | REG | "77.56" | number 2 decimal |
| Contraventions | REG | score + events | `{ score, events }` |
| CVSA (OOS) | REG | score + events | `{ score, events }` |
| Accidents | REG | score + events | `{ score, events }` |
| Total Score | REG | sum | number |

```json
{
  "complianceReview": {
    "asOfDate": "2025-03-31",
    "averageFleetSize": 77.56,
    "scores": [
      { "category": "Contraventions",        "score": 0.30, "events": 39 },
      { "category": "CVSA (Out of Service)", "score": 0.31, "events": 12 },
      { "category": "Accidents",             "score": 0.00, "events": 11 }
    ],
    "totalScore": 0.61
  }
}
```

### 4.4 Thresholds Table (regulatory reference)

| Status | Contraventions | CVSA | Accidents | Total |
|---|---|---|---|---|
| Satisfactory | < 1.76 | < 0.93 | < 0.23 | < 2.13 |
| Conditional | 1.76–2.98 | 0.93–1.08 | 0.23–0.27 | 2.13–3.64 |
| Unsatisfactory | ≥ 2.98 | ≥ 1.08 | ≥ 0.27 | ≥ 3.64 |

Why surface the table: analysts can instantly see how much headroom exists
before a category moves to Conditional. Without the table, raw scores have
no reference point.

### 4.5 Detail sections (7 total — each is an event list)

1. **Profile Scores** (14 monthly pulls)
   - month, vehicleDays (vd), activeDays (ad), avgFleet, contraScore, cvsaScore, accScore, totalScore
   - Required: REG (mandatory for monthly review)
2. **Active Fleet** (every vehicle under the SFC)
   - regi, plate, year, make, owner, gvw
   - Required: REG (determines normalization basis)
3. **Contraventions** — split 4 ways:
   - Driver Contraventions (Guilty)
   - Carrier Contraventions (Guilty)
   - Pending Driver Contraventions
   - Pending Carrier Contraventions
   - Per row: driverName, dl, dlJur, date, ticket, plate, location, juris, act, section, description, points
   - Required: REG (drives the Contraventions score)
4. **CVSA Inspection Results** — date, inspection#, level, plate, driver, defect category, result
   - Required: REG (drives the CVSA score)
5. **Accident Information** — date, time, report#, location, jur, driver, plate, vehDesc, type (Property/Injury/Fatality), fault (At Fault/No Fault/Fault Unknown), charges, points
   - Required: REG (drives the Accident score)
6. **Audit Summary** — date, auditType, result, notes
   - Required: AUD
7. **CVIP Vehicle Inspection History** — regi, plate, vehicle, date, type (CVIP/N&O), facility, confirmation, decal, expiry, result
   - Required: REG for N&O, OP for CVIP
   - Why N&O matters: an outstanding Notice & Order means the vehicle cannot
     legally operate until the defect is remedied and cleared.

### 4.6 Full BC page JSON (worked example)

```json
{
  "kind": "bc",
  "demographics": {
    "carrierName": "INERTIA CARRIER LTD.",
    "nscNumber":   "BC123456",
    "jurisdiction":"BC",
    "primaryBusinessType": "General Freight",
    "mailingAddress": "101-8351 ALEXANDRA ROAD, RICHMOND, BC V6X 1C3",
    "certificateIssueDate": "2019-05-01",
    "extraProvincial": true,
    "premiumCarrier": false,
    "weigh2GoBC": true,
    "preventativeMaintenance": true,
    "numberOfLicensedVehicles": 78,
    "reportRunDate": "2025-04-17",
    "profileFrom":   "2023-04-17",
    "profileTo":     "2025-04-17"
  },
  "certificate": {
    "certificateStatus": "Active",
    "safetyRating":      "Satisfactory",
    "profileStatus":     "Satisfactory",
    "auditStatus":       "Unaudited"
  },
  "complianceReview": {
    "asOfDate": "2025-03-31",
    "averageFleetSize": 77.56,
    "scores": [
      { "category": "Contraventions",         "score": 0.30, "events": 39 },
      { "category": "CVSA (Out of Service)",  "score": 0.31, "events": 12 },
      { "category": "Accidents",              "score": 0.00, "events": 11 }
    ],
    "totalScore": 0.61
  },
  "thresholds": [
    { "status": "Satisfactory",   "contraventions": "< 1.76",    "cvsa": "< 0.93",   "accidents": "< 0.23",  "total": "< 2.13"  },
    { "status": "Conditional",    "contraventions": "1.76-2.98", "cvsa": "0.93-1.08","accidents": "0.23-0.27","total": "2.13-3.64" },
    { "status": "Unsatisfactory", "contraventions": ">= 2.98",   "cvsa": ">= 1.08",  "accidents": ">= 0.27", "total": ">= 3.64" }
  ],
  "events": {
    "profileScores": [
      { "id": "bc-ps-01", "month": "2025-03", "vd": 28308, "ad": 365, "avg": 77.56, "contra": 0.30, "cvsa": 0.31, "acc": 0.00, "total": 0.61 },
      { "id": "bc-ps-02", "month": "2025-02", "vd": 28186, "ad": 365, "avg": 77.22, "contra": 0.30, "cvsa": 0.31, "acc": 0.05, "total": 0.66 },
      { "id": "bc-ps-03", "month": "2025-01", "vd": 28080, "ad": 366, "avg": 76.72, "contra": 0.20, "cvsa": 0.23, "acc": 0.05, "total": 0.48 },
      { "id": "bc-ps-04", "month": "2024-12", "vd": 27815, "ad": 366, "avg": 76.00, "contra": 0.17, "cvsa": 0.24, "acc": 0.05, "total": 0.46 },
      { "id": "bc-ps-05", "month": "2024-11", "vd": 27517, "ad": 366, "avg": 75.18, "contra": 0.17, "cvsa": 0.28, "acc": 0.05, "total": 0.50 },
      { "id": "bc-ps-06", "month": "2024-10", "vd": 27229, "ad": 366, "avg": 74.40, "contra": 0.16, "cvsa": 0.32, "acc": 0.05, "total": 0.53 },
      { "id": "bc-ps-07", "month": "2024-09", "vd": 26943, "ad": 366, "avg": 73.61, "contra": 0.22, "cvsa": 0.29, "acc": 0.05, "total": 0.56 },
      { "id": "bc-ps-08", "month": "2024-08", "vd": 26644, "ad": 366, "avg": 72.80, "contra": 0.34, "cvsa": 0.29, "acc": 0.05, "total": 0.68 },
      { "id": "bc-ps-09", "month": "2024-07", "vd": 26170, "ad": 366, "avg": 71.50, "contra": 0.39, "cvsa": 0.29, "acc": 0.06, "total": 0.74 },
      { "id": "bc-ps-10", "month": "2024-06", "vd": 25647, "ad": 366, "avg": 70.07, "contra": 0.37, "cvsa": 0.26, "acc": 0.06, "total": 0.69 },
      { "id": "bc-ps-11", "month": "2024-05", "vd": 25139, "ad": 366, "avg": 68.69, "contra": 0.39, "cvsa": 0.39, "acc": 0.06, "total": 0.84 },
      { "id": "bc-ps-12", "month": "2024-04", "vd": 24638, "ad": 366, "avg": 67.32, "contra": 0.45, "cvsa": 0.45, "acc": 0.06, "total": 0.96 },
      { "id": "bc-ps-13", "month": "2024-03", "vd": 24330, "ad": 366, "avg": 66.48, "contra": 0.45, "cvsa": 0.41, "acc": 0.12, "total": 0.98 },
      { "id": "bc-ps-14", "month": "2024-02", "vd": 24249, "ad": 366, "avg": 66.25, "contra": 0.63, "cvsa": 0.36, "acc": 0.09, "total": 1.08 }
    ],
    "activeFleet": [
      { "id": "bc-fl-01", "regi": "10537552", "plate": "69124P", "year": 2006, "make": "FREIGHTLIN", "owner": "Inertia Carrier Ltd.", "gvw": 25854 },
      { "id": "bc-fl-02", "regi": "11081163", "plate": "68012P", "year": 2015, "make": "VOLVO",      "owner": "Inertia Carrier Ltd.", "gvw": 25854 },
      { "id": "bc-fl-03", "regi": "11848566", "plate": "71085P", "year": 2016, "make": "VOLVO",      "owner": "Inertia Carrier Ltd.", "gvw": 25854 },
      { "id": "bc-fl-04", "regi": "12584392", "plate": "57354P", "year": 2018, "make": "FREIGHTLIN", "owner": "Inertia Carrier Ltd.", "gvw": 25854 },
      { "id": "bc-fl-05", "regi": "12793166", "plate": "60145P", "year": 2018, "make": "VOLVO",      "owner": "Inertia Carrier Ltd.", "gvw": 25854 }
    ],
    "driverGuilty": [
      { "id": "bc-dg-01", "driverName": "BAJWA, MANJOT",            "dl": "B0209516098126", "dlJur": "ON", "date": "2024-12-24", "time": "00:00", "ticket": "1333765", "plate": "72843P", "plateJur": "BC", "location": "BALGONIE",      "juris": "SK", "dispDate": "2025-01-16", "act": "HT",                "section": "6;b", "desc": "Improper or inappropriate use of lights",    "equiv": "0323", "pts": 2 },
      { "id": "bc-dg-02", "driverName": "BHULLAR, GURWINDER SINGH", "dl": "179420971",      "dlJur": "AB", "date": "2025-01-26", "time": "20:32", "ticket": "2099880", "plate": "72843P", "plateJur": "BC", "location": "SHERWOOD PARK", "juris": "AB", "dispDate": "2025-02-03", "act": "122/0924(1)",       "section": "",    "desc": "Unauthorized flashing lamp on",              "equiv": "0610", "pts": 1 },
      { "id": "bc-dg-03", "driverName": "BHULLAR, GURWINDER SINGH", "dl": "179420971",      "dlJur": "AB", "date": "2025-01-26", "time": "20:32", "ticket": "2099879", "plate": "72843P", "plateJur": "BC", "location": "SHERWOOD PARK", "juris": "AB", "dispDate": "2025-02-03", "act": "304/0255.2(1)",     "section": "",    "desc": "Operate vehicle with unauthorized lamp alight", "equiv": "0323", "pts": 2 }
    ],
    "carrierGuilty": [
      { "id": "bc-cg-01", "driverName": "", "dl": "", "dlJur": "BC", "date": "2024-11-05", "time": "", "ticket": "C-45203", "plate": "", "plateJur": "BC", "location": "KAMLOOPS", "juris": "BC", "dispDate": "2024-12-12", "act": "MVA", "section": "37.27(1)", "desc": "Carrier failed to maintain records", "equiv": "", "pts": 2 }
    ],
    "driverPending": [
      { "id": "bc-dp-01", "driverName": "SINGH, AMRITPAL", "dl": "S4490169094", "dlJur": "ON", "date": "2025-02-14", "time": "08:40", "ticket": "P-118822", "plate": "68042P", "plateJur": "BC", "location": "VANCOUVER", "juris": "BC", "dispDate": "",  "act": "MVA", "section": "150.1", "desc": "Fail to keep right (pending)", "equiv": "0303", "pts": 0 }
    ],
    "carrierPending": [
      { "id": "bc-cp-01", "driverName": "", "dl": "", "dlJur": "BC", "date": "2025-03-02", "time": "", "ticket": "C-58440", "plate": "", "plateJur": "BC", "location": "BURNABY", "juris": "BC", "dispDate": "", "act": "MVA", "section": "234", "desc": "Logbook audit discrepancy (pending)", "equiv": "", "pts": 0 }
    ],
    "cvsaInspections": [
      { "id": "bc-cv-01", "date": "2025-01-22", "inspectionNo": "EA602200100", "level": "Level 1", "plate": "68042P", "driver": "Singh, A.", "defects": "Brakes",   "result": "Out of Service" },
      { "id": "bc-cv-02", "date": "2024-11-14", "inspectionNo": "EA602012990", "level": "Level 2", "plate": "72843P", "driver": "Bhullar",   "defects": "Lighting", "result": "Warning" },
      { "id": "bc-cv-03", "date": "2024-09-03", "inspectionNo": "EA601899127", "level": "Level 3", "plate": "57380P", "driver": "Khaira",    "defects": "",         "result": "Pass" }
    ],
    "accidents": [
      { "id": "bc-ac-01", "date": "2023-03-03", "time": "09:48", "report": "6653022", "location": "PICKERING, BAYLY ST",     "jur": "ON", "driverName": "KHAIRA, EKAMPREET SINGH", "dl": "K31462008981001", "dlJur": "ON", "plate": "76118P", "plateJur": "BC", "regi": "14199432", "vehDesc": "", "type": "Property", "fault": "At Fault", "charges": "No", "pts": 2 },
      { "id": "bc-ac-02", "date": "2023-01-07", "time": "23:53", "report": "6636812", "location": "THUNDER BAY, 11",        "jur": "ON", "driverName": "PUREWAL, MANJEET K",      "dl": "P93585165625620", "dlJur": "ON", "plate": "66581P", "plateJur": "BC", "regi": "13379226", "vehDesc": "", "type": "Property", "fault": "No Fault", "charges": "No", "pts": 0 },
      { "id": "bc-ac-03", "date": "2022-12-12", "time": "09:16", "report": "6631431", "location": "BLIND RIVER, CAUSLEY",   "jur": "ON", "driverName": "HANAD, HUSSEIN",          "dl": "173885906",       "dlJur": "AB", "plate": "57380P", "plateJur": "BC", "regi": "13322984", "vehDesc": "", "type": "Property", "fault": "At Fault", "charges": "No", "pts": 2 },
      { "id": "bc-ac-04", "date": "2022-12-03", "time": "00:00", "report": "6652780", "location": "KENORA, 17",            "jur": "ON", "driverName": "HARJOT SINGH",            "dl": "H00670000970520", "dlJur": "ON", "plate": "74162P", "plateJur": "BC", "regi": "13379228", "vehDesc": "", "type": "Injury",   "fault": "At Fault", "charges": "No", "pts": 4 },
      { "id": "bc-ac-05", "date": "2022-08-18", "time": "21:45", "report": "6614519", "location": "MISSISSAUGA, 401",      "jur": "ON", "driverName": "HAROON, MOHAMMAD",        "dl": "170551428",       "dlJur": "AB", "plate": "70365P", "plateJur": "BC", "regi": "13948198", "vehDesc": "", "type": "Property", "fault": "No Fault", "charges": "No", "pts": 0 }
    ],
    "auditSummary": [],
    "cvip": [
      { "id": "bc-cvip-01", "regi": "10537552", "plate": "69124P", "vehicle": "2006 FREIGHTLIN", "date": "2022-04-20", "type": "N&O",  "facility": "",       "confirmation": "FR66236",  "decal": "",        "expiry": "",           "result": "N&O 2" },
      { "id": "bc-cvip-02", "regi": "11081163", "plate": "68012P", "vehicle": "2015 VOLVO",      "date": "2022-01-05", "type": "CVIP", "facility": "S6903",  "confirmation": "15934668", "decal": "FR17405", "expiry": "2022-07-31", "result": "Pass (Repair Same Day)" },
      { "id": "bc-cvip-03", "regi": "11081163", "plate": "68012P", "vehicle": "2015 VOLVO",      "date": "2021-06-01", "type": "CVIP", "facility": "S2225",  "confirmation": "15408411", "decal": "FP85965", "expiry": "2021-12-31", "result": "Pass" },
      { "id": "bc-cvip-04", "regi": "11848566", "plate": "71085P", "vehicle": "2016 VOLVO",      "date": "2021-12-27", "type": "CVIP", "facility": "S15780", "confirmation": "15920322", "decal": "FR38592", "expiry": "2022-06-30", "result": "Pass" }
    ]
  }
}
```

---

## 5. PEI NSC

**Source:** Prince Edward Island NSC Carrier Profile.

**Purpose:** PEI uses a 55-point demerit scale (fleet-size-scaled) split
across Collisions + Convictions + Inspections. The header pill shows
"N / 55 pts" and a percentage of max. Alerts at thresholds: Advisory,
Warning, Interview, Sanction.

### 5.1 Summary Card

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Carrier Name | REG | "BUSINESS PORTERS INC." | string |
| NSC Number | REG | "PE316583" | string |
| Profile As-Of | REG | "14-Jul-2021" | ISO |
| Collision Points | REG | "8" | number |
| Conviction Points | REG | "6" | number |
| Inspection Points | REG | "9" | number |
| Total / Max | UI | "23 / 55 pts (41.8% of max)" | `{ total, max, pctOfMax }` |

Max is a schedule-3 lookup: fleet-size → max points (e.g. fleet 19 → max 55).

### 5.2 Fleet

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Current Active Vehicles | REG | "19" | number |
| Vehicles at Last Assessment | AUD | "19" | number |

### 5.3 Certificate & Audit

| Field | Regular format | JSON |
|---|---|---|
| Safety Rating | "Satisfactory" / "Conditional" / "Unsatisfactory" | enum |
| Cert Status | "Active" / "Expired" / "Suspended" | enum |
| Audit Status | "Unaudited" / "Audited - Compliant" / "Audited - Action Required" / "Audited - Non-Compliant" | enum |

### 5.4 Event lists (4 sections)

1. **Collisions** — date, severity (Property Damage / Injury / Fatality),
   caseNum, fault (At Fault / Not at Fault / Fault Unknown), vehicles,
   killed, injured, pts
   - Summary: "*N collisions | X property damage, Y injury/fatal · Points: P*"
2. **Convictions** — date, jurisdiction, charge, natCode, pts
   - Summary: "*N conviction records | charge, jurisdiction, and points · Points: P*"
3. **Inspections** — date, CVSA level (1–5), driver, log (Pass/Warn/Fail),
   TDG, load security, status (P/W/O)
   - Summary: "*N inspections | X pass, Y warning, Z out of service*"
4. **Audits** — date, result (COMPLIANT/CONDITIONAL/NON-COMPLIANT), auditType
   - Summary: "*N audits on record for period selected · Latest Result: R*"

### 5.5 Full PEI page JSON (worked example)

```json
{
  "kind": "pe",
  "carrier":     { "carrierName": "BUSINESS PORTERS INC.", "nscNumber": "PE316583", "profileAsOf": "2021-07-14", "jurisdiction": "Prince Edward Island" },
  "latestPull":  { "collisionPoints": 8, "convictionPoints": 6, "inspectionPoints": 9, "totalPoints": 23, "maxPoints": 55, "pctOfMax": 41.8 },
  "fleet":       { "currentActiveVehicles": 19, "currentActiveVehiclesAtLastAssessment": 19 },
  "certificate": { "safetyRating": "Conditional", "certStatus": "Active", "auditStatus": "Unaudited" },
  "events": {
    "collisions": [
      { "id": "pe-col-01", "seq": 1, "date": "2021-05-12", "severity": "Property Damage", "caseNum": "BC2021-0583", "fault": "At Fault",      "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 },
      { "id": "pe-col-02", "seq": 2, "date": "2021-02-18", "severity": "Injury",          "caseNum": "AB2021-1147", "fault": "At Fault",      "vehicles": 2, "killed": 0, "injured": 1, "pts": 4 },
      { "id": "pe-col-03", "seq": 3, "date": "2020-11-03", "severity": "Property Damage", "caseNum": "ON2020-8822", "fault": "Not at Fault",  "vehicles": 1, "killed": 0, "injured": 0, "pts": 0 },
      { "id": "pe-col-04", "seq": 4, "date": "2020-08-27", "severity": "Property Damage", "caseNum": "QC2020-5519", "fault": "Fault Unknown", "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 }
    ],
    "convictions": [
      { "id": "pe-con-01", "seq": 1, "date": "2021-03-04", "loc": "QC", "charge": "SIGNALISATION NON RESPECTÉE",    "natCode": "317", "pts": 3 },
      { "id": "pe-con-02", "seq": 2, "date": "2021-01-14", "loc": "BC", "charge": "DISOBEY TRAFFIC CONTROL DEVICE", "natCode": "317", "pts": 3 }
    ],
    "inspections": [
      { "id": "pe-ins-01", "seq":  1, "date": "2022-11-22", "cvsaLevel": 3, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SINGH",            "status": "P" },
      { "id": "pe-ins-02", "seq":  2, "date": "2022-10-07", "cvsaLevel": 3, "log": "Warning", "tdg": "Passed", "loadSecurity": "Passed", "driverName": "NAVJOT SINGH",     "status": "W" },
      { "id": "pe-ins-03", "seq":  3, "date": "2021-06-21", "cvsaLevel": 2, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "PANESAR",          "status": "P" },
      { "id": "pe-ins-04", "seq":  4, "date": "2021-06-11", "cvsaLevel": 3, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "BOWLAN J",         "status": "P" },
      { "id": "pe-ins-05", "seq":  5, "date": "2021-06-10", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "RATTEA SINGH",     "status": "P" },
      { "id": "pe-ins-06", "seq":  6, "date": "2021-05-19", "cvsaLevel": 3, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SIDHU S",          "status": "W" },
      { "id": "pe-ins-07", "seq":  7, "date": "2021-05-18", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SAINI S",          "status": "W" },
      { "id": "pe-ins-08", "seq":  8, "date": "2021-04-06", "cvsaLevel": 2, "log": "Warning", "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SINGH",            "status": "W" },
      { "id": "pe-ins-09", "seq":  9, "date": "2021-03-23", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SINGH",            "status": "O" },
      { "id": "pe-ins-10", "seq": 10, "date": "2021-03-17", "cvsaLevel": 2, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SINGH",            "status": "O" },
      { "id": "pe-ins-11", "seq": 11, "date": "2020-07-29", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "INDERJEET",        "status": "O" }
    ],
    "audits": [
      { "id": "pe-aud-01", "seq": 1, "date": "2021-01-13", "result": "NON-COMPLIANT", "auditType": "Compliance" }
    ]
  }
}
```

---

## 6. Nova Scotia NSC

**Source:** NS NSC Carrier Profile.

**Purpose:** NS uses indexed scores (per-category, comparing the carrier
against provincial thresholds). Scores can exceed 100; three increasing
thresholds (Moderate / High / Critical) determine the rating.

### 6.1 Carrier Identity

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Carrier Name | REG | "MAPLE LEAF FORCE LIMITED" | string |
| NSC Number | REG | "MAPLE739646000" | string |
| Profile As-Of | REG | "19-Aug-2022" | ISO |

### 6.2 Latest Pull — Indexed Scores

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Collision Score | REG | "0.0000" | number 4 decimal |
| Conviction Score | REG | "6.2510" | number 4 decimal |
| Inspection Score | REG | "13.4179" | number 4 decimal |

### 6.3 Fleet

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Current Fleet Size | REG | "14" | number |
| Avg Daily Fleet Size | REG | "14.79" | number 2 decimal |

### 6.4 Thresholds & Rating

| Field | Required by | Regular format | JSON |
|---|---|---|---|
| Score Level 1 (Moderate) | REG | "39.7531" | number 4 decimal |
| Score Level 2 (High) | REG | "45.9602" | number 4 decimal |
| Score Level 3 (Critical) | REG | "60.1836" | number 4 decimal |
| Safety Rating | REG | "Satisfactory" / "Satisfactory - Unaudited" / "Conditional" / "Unsatisfactory" | enum |
| Safety Rating Expires | REG | ISO | ISO |

Why thresholds are per-carrier: NS recalculates them annually based on
provincial distribution. Same absolute score means different ratings in
different years.

### 6.5 Event lists (5 sections)

1. **CVSA Inspection** — date, cvsaNumber, jur, plates, driverMaster,
   result (Passed / Defect Noted / Out-of-Service), demeritPts
   - Summary: "*N inspections | X passed, Y defect noted, Z out-of-service · Demerit Pts: P*"
2. **Audit History** — date, auditNum, sequence, result (Compliant / Conditional / Non-Compliant)
   - Summary: "*N audits on record for period selected · Latest Result: R*"
3. **Convictions** — offenceDate, convDate, ticket, offence, driverMaster, sectionActReg, pts
   - Summary: "*N conviction records | offence, ticket, act/section, and points · Demerit Pts: P*"
4. **Collisions** — date, severity (PROPERTY DAMAGE / INJURY / FATAL),
   location, driverMaster, driverJur, plate, plateJur, pts
   - Summary: "*N collision records | severity, location, driver, vehicle · Demerit Pts: P*"
5. **Traffic Offence Reports** — offenceDate, plate, driverMaster, statute, description
   - Summary: "*N warning tickets | plate, driver, statute, description*"

Why 5 separate lists: each maps to a distinct NS statute (MVA, CVDH, TDG,
Criminal Code) and different enforcement branches. Analysts drill into
each separately when defending at a hearing.

### 6.6 Full NS page JSON (worked example)

```json
{
  "kind": "ns",
  "carrier":    { "carrierName": "MAPLE LEAF FORCE LIMITED", "nscNumber": "MAPLE739646000", "profileAsOf": "2022-08-19" },
  "latestPull": { "collisionScore": 0.0000, "convictionScore": 6.2510, "inspectionScore": 13.4179 },
  "fleet":      { "currentFleetSize": 14, "avgDailyFleetSize": 14.79 },
  "thresholds": { "scoreLevel1": 39.7531, "scoreLevel2": 45.9602, "scoreLevel3": 60.1836,
                  "safetyRating": "Satisfactory - Unaudited", "safetyRatingExpires": null },
  "events": {
    "cvsaInspections": [
      { "id": "ns-cv-01", "seq":  1, "date": "2022-11-29", "cvsaNumber": "445131-1",     "jur": "NB", "plates": "PR45273 / MB",  "driverMaster": "D4391-00009-90407 / ON",   "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-02", "seq":  2, "date": "2022-12-11", "cvsaNumber": "449597",       "jur": "NB", "plates": "PR49497 / ON",  "driverMaster": "3225823 / NB",             "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-03", "seq":  3, "date": "2023-01-17", "cvsaNumber": "ONEA01539682", "jur": "ON", "plates": "PR48472 / NS",  "driverMaster": "175546217 / AB",           "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-04", "seq":  4, "date": "2023-01-31", "cvsaNumber": "448208",       "jur": "NB", "plates": "PR49497 / NS",  "driverMaster": "A58340000770805 / ON",     "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-05", "seq":  5, "date": "2023-02-23", "cvsaNumber": "665463",       "jur": "NS", "plates": "PR44654 / NS",  "driverMaster": "SINGH210898005 / NS",      "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-06", "seq":  6, "date": "2023-03-16", "cvsaNumber": "666079",       "jur": "NS", "plates": "PR49343 / NS",  "driverMaster": "J64570000940315 / ON",     "result": "Defect Noted",   "demeritPts": 0 },
      { "id": "ns-cv-07", "seq":  7, "date": "2023-03-22", "cvsaNumber": "666292",       "jur": "NS", "plates": "PR49497 / NS",  "driverMaster": "A58340000770805 / ON",     "result": "Defect Noted",   "demeritPts": 0 },
      { "id": "ns-cv-08", "seq":  8, "date": "2023-03-24", "cvsaNumber": "449276",       "jur": "NB", "plates": "PT82569 / NS",  "driverMaster": "A58340000770805 / ON",     "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-09", "seq":  9, "date": "2023-03-28", "cvsaNumber": "666467",       "jur": "NS", "plates": "PT82466 / NS",  "driverMaster": "SINGH210898005 / NS",      "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-10", "seq": 10, "date": "2023-04-12", "cvsaNumber": "ONEA01555539", "jur": "ON", "plates": "PR47116 / ON",  "driverMaster": "SINGH120992005 / NS",      "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-11", "seq": 11, "date": "2023-04-13", "cvsaNumber": "ONEA01555996", "jur": "ON", "plates": "PR48472 / NS",  "driverMaster": "S44901690940101 / ON",     "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-12", "seq": 12, "date": "2023-04-15", "cvsaNumber": "452679",       "jur": "NB", "plates": "PR45276 / NS",  "driverMaster": "D43910000990407 / ON",     "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-13", "seq": 13, "date": "2023-04-25", "cvsaNumber": "667415",       "jur": "NS", "plates": "TC1771 / MB",   "driverMaster": "SINGH210898005 / NS",      "result": "Out-of-Service", "demeritPts": 3 },
      { "id": "ns-cv-14", "seq": 14, "date": "2023-05-19", "cvsaNumber": "668953",       "jur": "NS", "plates": "PR45273 / NS",  "driverMaster": "SINGH120992005 / NS",      "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-15", "seq": 15, "date": "2023-06-07", "cvsaNumber": "669542",       "jur": "NS", "plates": "PT82947 / NS",  "driverMaster": "D43910000990407 / ON",     "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-16", "seq": 16, "date": "2023-06-15", "cvsaNumber": "669846",       "jur": "NS", "plates": "PR47116 / NS",  "driverMaster": "SINGH210898005 / NS",      "result": "Defect Noted",   "demeritPts": 0 },
      { "id": "ns-cv-17", "seq": 17, "date": "2023-06-24", "cvsaNumber": "670266",       "jur": "NS", "plates": "W7664P / ON",   "driverMaster": "A58340000770805 / ON",     "result": "Defect Noted",   "demeritPts": 0 },
      { "id": "ns-cv-18", "seq": 18, "date": "2023-06-30", "cvsaNumber": "ONEA01571114", "jur": "ON", "plates": "PT82489 / NS",  "driverMaster": "S04036398930615 / ON",     "result": "Passed",         "demeritPts": 0 }
    ],
    "auditHistory": [
      { "id": "ns-au-01", "seq": 1, "date": "2023-04-28", "auditNum": "34843", "sequence": "1", "result": "Compliant" }
    ],
    "convictions": [
      { "id": "ns-cn-01", "seq": 1, "offenceDate": "2020-11-19", "convDate": "2021-01-19", "ticket": "5488801", "offence": "OPER VEH NOT CONFORMING WITH SPECIAL PERMIT", "driverMaster": "CZIPP141270003", "sectionActReg": "11 9 WDVR", "pts": 3 }
    ],
    "collisions": [
      { "id": "ns-co-01", "seq": 1, "date": "2020-09-04", "severity": "PROPERTY DAMAGE", "location": "MONTREAL / QC", "driverMaster": "", "driverJur": "ON", "plate": "PR42409", "plateJur": "NS", "pts": 0 }
    ],
    "trafficOffences": [
      { "id": "ns-to-01", "seq": 1, "offenceDate": "2023-09-05", "plate": "PR45273", "driverMaster": "SINGH120992005",   "statute": "CVDH 7 1 A", "description": "FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME" },
      { "id": "ns-to-02", "seq": 2, "offenceDate": "2024-06-20", "plate": "PR45276", "driverMaster": "S04036398930615",  "statute": "MVA 20 2",   "description": "LICENSE PLATE NOT CLEARLY LEGIBLE (NUMBERS WEARING OFF)" }
    ]
  }
}
```

---

## Cross-cutting rules

### Dates

Always store ISO-8601 (`YYYY-MM-DD`). Keep the original source string in a
`raw` field when the source uses a non-standard format:

```json
{ "profileDate": "2026-02-23", "profileDateRaw": "2026 FEB 23" }
```

### Points / scores

Store as numbers. The UI coerces strings, but numeric JSON is easier to
sum, sort, chart, and validate.

### Enums — watch the dialect

Same concept, different spelling per jurisdiction. Extraction MUST
normalize:

| Concept | FMCSA | CVOR | AB | BC | PEI | NS |
|---|---|---|---|---|---|---|
| Severity max | n/a | n/a | "Fatal" | "Fatality" | "Fatality" | "FATAL" |
| OOS result | "OOS" | "OOS" | "Out of Service" | "Out of Service" | "Out of Service" | "Out-of-Service" |
| Fault wording | n/a | n/a | n/a | "No Fault" | "Not at Fault" | n/a |
| Collisions "PROPERTY DAMAGE" | n/a | n/a | "Property Damage" | "Property" | "Property Damage" | "PROPERTY DAMAGE" |

Build a normalization map per tab; don't reuse strings across tabs.

### Record identity

Every event row gets a stable `id` in JSON output (the UI relies on it).
IDs can be minted by the extractor (`ev-<hash>`); they don't need to come
from the source report.

### Totals

Totals (`totalPoints`, `totalScore`, demerit sums, per-category sums)
should be *computed from the event arrays* by the extractor, not read off
the summary box. If the computed total disagrees with the summary box,
flag that as a parser warning — it means either the report is out of
sync or the extractor missed a row.

### Missing sections

Emit empty arrays (`[]`) for event lists with no records — every section
renders a graceful "no records" state. Don't omit the key entirely.

### Importance bucket summary

- **REG (Regulator-required)** — losing these invalidates the record for
  audit / hearing defence.
- **OP (Operational)** — useful for dispatchers, safety managers, and
  shippers but not regulator-scoring inputs.
- **AUD (Audit trail)** — must be preserved for retention periods (5y
  MTO, 3y FMCSA safety records, etc.).
- **UI (Derived)** — computed; do *not* round-trip from storage — always
  recompute from source fields so UI and storage stay in sync.

---

## Companion docs

- [`Safety_Compliance_Upload_Data_Requirements.md`](./Safety_Compliance_Upload_Data_Requirements.md)
  — narrower, covers just the fields a user can *type* into the Add
  Inspection modal per tab.
