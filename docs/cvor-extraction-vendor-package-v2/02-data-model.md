# Data Model — v2

Field-by-field walkthrough. Each row says **where on the PDF** to find it, **what type** to emit, and **which TrackSmart frontend field** it drives.

> **Source of truth:** `cvor-extraction-response.schema.json` (Draft-07). If anything in this doc disagrees with the schema, the schema wins.

---

## Top-level shape

```json
{
  "warnings":         [...],
  "source":           { ... },
  "carrier":          { ... },
  "pull":             { ... }
}
```

`warnings`, `source`, and `carrier` are unchanged from v1 — see `01-overview.md`.

The expanded surface lives entirely under `pull`.

---

## `pull.*` — per-pull record

### A. Identity / window (unchanged from v1)

| JSON field | Type | PDF source | Frontend field |
|---|---|---|---|
| `pull.reportDate`     | date     | p.1 — Search Date and Time → ISO date | `reportDate` |
| `pull.periodLabel`    | string   | derived (e.g. `Apr 2/26`) | `periodLabel` |
| `pull.effectiveDate`  | date     | p.1 — Start Date | — |
| `pull.expiryDate`     | date     | p.1 — Expiry Date | — |
| `pull.windowStart`    | date     | derived: reportDate − 24 mo | — |
| `pull.windowEnd`      | date     | = reportDate | — |

### B. Headline rating + contributions (unchanged)

| JSON field | Type | PDF source | Frontend field |
|---|---|---|---|
| `pull.rating`         | number   | p.2 — Overall Violation Rate % | `rating` |
| `pull.colContrib`     | number   | p.2 — Collision % Overall Contribution | `colContrib` |
| `pull.conContrib`     | number   | p.2 — Conviction % Overall Contribution | `conContrib` |
| `pull.insContrib`     | number   | p.2 — Inspection % Overall Contribution | `insContrib` |
| `pull.colPctOfThresh` | number   | p.2 — Collision % of set Threshold | `colPctOfThresh` |
| `pull.conPctOfThresh` | number   | p.2 — Conviction % of set Threshold | `conPctOfThresh` |
| `pull.insPctOfThresh` | number   | p.2 — Inspection % of set Threshold | `insPctOfThresh` |

### C. Counts / OOS / fleet (unchanged)

| JSON field | Type | PDF source | Frontend field |
|---|---|---|---|
| `pull.collisionEvents`      | int    | p.1 — Total # of Collisions | `collisionEvents` |
| `pull.collWithPoints`       | int    | p.1 — # of Collisions with points | `collWithPoints` |
| `pull.collWithoutPoints`    | int    | p.1 — # of Collisions not pointed | `collWithoutPoints` |
| `pull.totalCollisionPoints` | int    | p.2 — Collision Breakdown Total | `totalCollisionPoints` |
| `pull.convictionEvents`     | int    | p.1 — Total # of convictions | `convictionEvents` |
| `pull.convictionPoints`     | int    | p.2/p.3 — Conviction Breakdown Total | `convictionPoints` |
| `pull.oosOverall`           | number | p.2 — Overall OOS % | `oosOverall` |
| `pull.oosVehicle`           | number | p.2 — Vehicle OOS % | `oosVehicle` |
| `pull.oosDriver`            | number | p.2 — Driver OOS % | `oosDriver` |
| `pull.trucks`               | int    | p.1 — # of Commercial Vehicles | `trucks` |
| `pull.drivers`              | int    | p.1 — # of Drivers | — |
| `pull.onMiles`              | number | p.1 — Ontario Kms Travelled | `onMiles` |
| `pull.canadaMiles`          | number | p.1 — Rest of Canada Kms Travelled | `canadaMiles` |
| `pull.usMexicoMiles`        | number | p.1 — US/Mexico Kms Travelled | — |
| `pull.totalMiles`           | number | p.1 — Total Kms Travelled | `totalMiles` |

---

## D. **NEW** in v2 — Collision Details (severity)

```jsonc
"collisionDetails": {
  "fatal":          0,    // p.2 — Fatal collisions
  "personalInjury": 2,    // p.2 — Personal Injury collisions
  "propertyDamage": 16    // p.2 — Property Damage collisions
}
```

**Sum constraint:** `fatal + personalInjury + propertyDamage === collisionEvents`.
**Frontend:** Pull Snapshot → Collision Details mini section, "By Severity" rows (red/amber/blue dots).

## E. **NEW** in v2 — Conviction Details (category + points-status)

```jsonc
"convictionDetails": {
  "withPoints": 9,   // p.2/p.3 — Convictions with points
  "notPointed": 2,   // p.2/p.3 — Convictions not pointed
  "driver":     6,   // p.2/p.3 — Driver-category
  "vehicle":    3,   // p.2/p.3 — Vehicle-category
  "load":       1,   // p.2/p.3 — Load-category
  "other":      1    // p.2/p.3 — Other-category
}
```

**Sum constraints:** Both axes must sum to `convictionEvents`:
- `withPoints + notPointed === convictionEvents`
- `driver + vehicle + load + other === convictionEvents`

**Frontend:** Pull Snapshot → Conviction Details mini section, "By Category" + "By Points Status" rows.

## F. **NEW** in v2 — Level Stats (CVSA Level 1-5)

```jsonc
"levelStats": {
  "level1": { "count": 55, "oosCount": 21 },  // p.2 — Inspections + OOS by level
  "level2": { "count": 41, "oosCount": 14 },
  "level3": { "count": 34, "oosCount": 4 },
  "level4": { "count": 4,  "oosCount": 1 },
  "level5": { "count": 3,  "oosCount": 0 }
}
```

**Sum constraint:** `Σ count === inspectionStats.cvsaInspections`. `(Σ oosCount × 100) / cvsaInspections ≈ oosOverall` (±0.5).
**Frontend:** Pull Snapshot → CVOR Rating Comparison mini section + main page Level cards.

## G. **NEW** in v2 — Inspection Stats (Threshold Calculation)

```jsonc
"inspectionStats": {
  "cvsaInspections":       137,   // p.3 — # of CVSA inspections conducted
  "vehiclesInspected":     205,   // p.3 — # of Vehicles inspected
  "driversInspected":      137,   // p.3 — # of Drivers inspected
  "driverPoints":          2,     // p.3 — # of Driver points assigned (D)
  "vehiclePoints":         46,    // p.3 — # of Vehicle points assigned (V)
  "totalInspectionPoints": 47.38, // p.3 — = 0.6875 × D + V
  "setThreshold":          56.27  // p.3 — # of Set inspection threshold points
}
```

**Constraints:**
- `totalInspectionPoints ≈ 0.6875 × driverPoints + vehiclePoints` (±0.05)
- `(totalInspectionPoints / setThreshold) × 100 ≈ insPctOfThresh` (±0.5)

**Frontend:** Pull Snapshot → Inspection Statistics mini section.

## H. **NEW** in v2 — KMR Breakdowns (3 sub-periods each)

```jsonc
"collisionBreakdown": [           // p.3 — Collision Breakdown by Kilometre Rate
  { "events": 7, "points": 6 },   // Period 1 = most recent 8 months
  { "events": 6, "points": 5 },   // Period 2 = middle 8 months
  { "events": 5, "points": 3 }    // Period 3 = earliest 8 months
],

"convictionBreakdown": [          // p.3 — Conviction Breakdown by Kilometre Rate
  { "events": 5, "points": 9 },
  { "events": 4, "points": 9 },
  { "events": 2, "points": 6 }
]
```

**Constraints:**
- `Σ collisionBreakdown[i].events === collisionEvents`
- `Σ collisionBreakdown[i].points === totalCollisionPoints`
- `Σ convictionBreakdown[i].events === convictionEvents`
- `Σ convictionBreakdown[i].points === convictionPoints`

**Frontend:** Pull Snapshot → Collision/Conviction Breakdown by Km Rate mini sections. The frontend re-derives `fromDate / toDate / kmPerMonth / threshold / pctSet` from `reportDate + totalMiles` at render time.

## I. **NEW** in v2 — Events list (Intervention & Event Details)

```jsonc
"events": [
  {
    "id":                          "20260402-coll-0",
    "type":                        "collision",
    "date":                        "2026-03-15",
    "time":                        "13:45",
    "ticket":                      "COLL-20260402-000",
    "location":                    "HWY 401 Toronto, ON",
    "driverName":                  "SINGH, M",
    "driverLicence":               "D1000000-ON",
    "driverLicenceJurisdiction":   "ON",
    "vehicle1": { "make": "VOLVO", "unit": "T100", "plate": "PR4000", "jurisdiction": "CAON" },
    "pointsTotal":                 2,
    "collision": {
      "collisionClass":   "CLASS-PROPERTY DAMAGE ONLY",
      "jurisdiction":     "CAON",
      "vehicleAction":    "VEH ACTN-CHANGING LANES",
      "vehicleCondition": "VEH COND-NO APPARENT DEFECT",
      "driverAction":     "DR ACT-IMPROPER LANE CHANGE",
      "driverCondition":  "DR COND-NORMAL",
      "driverCharged":    "Y",
      "points":           2,
      "microfilm":        "MF260402-0000"
    }
  },
  {
    "id":      "20260402-insp-0",
    "type":    "inspection",
    "date":    "2025-12-04",
    "startTime": "09:00",
    "endTime":   "09:45",
    "cvir":      "CVIR2604020000",
    "location":  "HWY 401 Toronto, ON",
    "driverName":"SINGH, M",
    "vehicle1":  { "make": "VOLVO", "unit": "T300", "plate": "PR6000", "jurisdiction": "CAON" },
    "level":     1,
    "vehiclePoints": 2,
    "driverPoints":  0,
    "oosCount":      1,
    "totalDefects":  2,
    "charged":       "Y",
    "defects": [
      { "category": "BRAKE SYSTEM", "defect": "BRAKES OUT OF ADJUSTMENT", "oos": true }
    ]
  }
  // ...one entry per row of the Intervention & Event Details table
]
```

**Constraints:**
- `events.filter(e => e.type === 'inspection').length === inspectionStats.cvsaInspections`
- `events.filter(e => e.type === 'collision').length === collisionEvents`
- `events.filter(e => e.type === 'conviction').length === convictionEvents`
- `Σ events[type=collision].collision.points === totalCollisionPoints`
- `Σ events[type=conviction].conviction.points === convictionPoints`
- `Σ events[type=inspection].vehiclePoints === inspectionStats.vehiclePoints`
- `Σ events[type=inspection].driverPoints === inspectionStats.driverPoints`

**Frontend:** Pull Snapshot → Intervention & Event Details mini section + bottom all-pulls aggregate table + KPI cards (Inspections / OOS / Clean / Tickets / Veh Pts / Dvr Pts / CVOR Pts).

## J. **NEW** in v2 — Travel Kilometric Information

```jsonc
"travelKm": [
  {
    "fromDate": "2025-04-02",
    "toDate":   "2026-04-02",
    "type":     "Estimated",
    "vehicles": 135,
    "doubleShifted": 0,
    "totalVehicles": 135,
    "ontarioKm":     6203981,
    "restOfCanadaKm":1686249,
    "usMexicoKm":    0,
    "drivers":       155,
    "totalKm":       7890230
  },
  {
    "fromDate": "2024-04-02",
    "toDate":   "2025-04-02",
    "type":     "Actual",
    ...
  }
]
```

**Constraint:** `Σ travelKm[].totalKm ≈ pull.totalMiles` (±5% rounding tolerance).
**Frontend:** Pull Snapshot → Travel Kilometric Information mini section.

---

## CSV templates that flatten this JSON

| File | Mirrors |
|---|---|
| `templates/pulls.csv`              | `pull.*` summary fields (no nested arrays) |
| `templates/level-stats.csv`        | `pull.levelStats.*` flattened (`level1_count`, `level1_oos`, …) |
| `templates/breakdown-by-km.csv`    | `pull.collisionBreakdown[]` and `pull.convictionBreakdown[]` (period 1-3 columns) |
| `templates/inspection-events.csv`  | `events[type=inspection]` |
| `templates/collision-events.csv`   | `events[type=collision]` |
| `templates/conviction-events.csv`  | `events[type=conviction]` |
| `templates/travel-km.csv`          | `pull.travelKm[]` rows |
| `templates/tickets.csv`            | tickets attached to events (if extracted separately) |

---

## See also

- `06-pdf-extraction-by-page.md` — page-by-page extraction map
- `04-validation.md` — full list of cross-field validation checks
- `05-frontend-mapping.md` — how each field renders in TrackSmart UI
