# v1 → v2 Changelog

What expanded between the original vendor package (v1) and this v2 package.

## Why v2 exists

The TrackSmart frontend was rebuilt so that **every section of the Pull Snapshot card derives from per-pull data** — no fall-back to global lists, no hard-coded values. Selecting any of the 15 historical pulls now displays a fully internally-consistent snapshot whose totals match the breakdowns, breakdowns match the events, and points sum correctly across every section.

To make that work, the extractor must return more than the v1 summary fields.

---

## New required fields on `pull`

### 1. `pull.collisionDetails` (object)

Severity breakdown of the collisions counted in `collisionEvents`.

```json
{
  "fatal": 0,
  "personalInjury": 2,
  "propertyDamage": 16
}
```

**Source:** p.2 — Collision Details box (the existing box already had the totals; we now also need each severity class).
**Constraint:** `fatal + personalInjury + propertyDamage === collisionEvents`.
**Renders:** "By Severity" rows in Pull Snapshot → Collision Details mini section, with red/amber/blue dots.

### 2. `pull.convictionDetails` (object)

Two-axis breakdown of convictions: by points-status AND by category. Both axes sum to `convictionEvents`.

```json
{
  "withPoints": 9,
  "notPointed": 2,
  "driver": 6,
  "vehicle": 3,
  "load": 1,
  "other": 1
}
```

**Source:** p.2/p.3 — Conviction Details box.
**Constraint:** `withPoints + notPointed === convictionEvents` AND `driver + vehicle + load + other === convictionEvents`.
**Renders:** "By Category" + "By Points Status" rows in Pull Snapshot → Conviction Details mini section.

### 3. `pull.levelStats` (object)

Per-CVSA-level inspection counts + OOS counts.

```json
{
  "level1": { "count": 55, "oosCount": 21 },
  "level2": { "count": 41, "oosCount": 14 },
  "level3": { "count": 34, "oosCount": 4 },
  "level4": { "count": 4,  "oosCount": 1 },
  "level5": { "count": 3,  "oosCount": 0 }
}
```

**Source:** p.2 — # of Inspections by Level table (and the matching # of Inspections OOS by Level row).
**Constraint:** `Σ count === inspectionStats.cvsaInspections`. `(Σ oosCount × 100) / cvsaInspections ≈ oosOverall` within ±0.5.
**Renders:** CVOR Rating Comparison mini section + the main page Level cards.

### 4. `pull.inspectionStats` (object)

The Inspection Threshold Calculation table from p.3, expanded.

```json
{
  "cvsaInspections":       137,
  "vehiclesInspected":     205,
  "driversInspected":      137,
  "driverPoints":          2,
  "vehiclePoints":         46,
  "totalInspectionPoints": 47.38,
  "setThreshold":          56.27
}
```

**Source:** p.3 — Inspection Threshold Calculation.
**Constraints:**
- `totalInspectionPoints ≈ 0.6875 × driverPoints + vehiclePoints` (±0.05).
- `(totalInspectionPoints / setThreshold) × 100 ≈ insPctOfThresh` (±0.5).
**Renders:** Inspection Statistics mini section (renders all 7 rows + a derived "% of Set Threshold" row using `insPctOfThresh`).

### 5. `pull.collisionBreakdown` and `pull.convictionBreakdown` (array of 3)

The 3 sub-period rows from p.3's Collision/Conviction Breakdown by Kilometre Rate tables. Period 1 = most recent 8 months, Period 2 = middle 8 months, Period 3 = earliest 8 months.

```json
"collisionBreakdown": [
  { "events": 7, "points": 6 },
  { "events": 6, "points": 5 },
  { "events": 5, "points": 3 }
]
```

**Source:** p.3 — Collision / Conviction Breakdown by Kilometre Rate (3 rows each).
**Constraint:**
- `Σ events === collisionEvents` (or `convictionEvents`).
- `Σ points === totalCollisionPoints` (or `convictionPoints`).
**Renders:** Collision / Conviction Breakdown by Km Rate mini sections. The TrackSmart frontend re-derives `fromDate`, `toDate`, `kmPerMonth`, `threshold`, `pctSet` at render time from `reportDate`, `totalMiles`, and the events/points pair.

### 6. `pull.events[]` (array)

The full Intervention & Event Details list from pp.4–N. Replaces the v1 `inspectionEvents` array — now includes collisions and convictions too. Each event uses a discriminator `type: 'inspection' | 'collision' | 'conviction'`.

**Source:** pp.4–17 (varies by PDF) — Intervention and Event Details section, every row.
**Constraints:**
- `events.filter(e => e.type === 'inspection').length === inspectionStats.cvsaInspections`.
- `events.filter(e => e.type === 'collision').length === collisionEvents`.
- `events.filter(e => e.type === 'conviction').length === convictionEvents`.
- For collision events: `Σ collision.points === totalCollisionPoints`.
- For conviction events: `Σ conviction.points === convictionPoints`.
- For inspection events: `Σ vehiclePoints === inspectionStats.vehiclePoints`, `Σ driverPoints === inspectionStats.driverPoints`.
**Renders:** Pull Snapshot → Intervention & Event Details mini section + bottom all-pulls aggregate table + KPI cards (counts derived from this list).

### 7. `pull.travelKm[]` (array)

Per-period vehicle/driver counts and km totals (Estimated forward + Actual back).

**Source:** p.18+ — Travel Kilometric Information table.
**Constraint:** `Σ totalKm ≈ pull.totalMiles` within ±5% (rounding tolerance).
**Renders:** Travel Kilometric Information mini section.

---

## v1 fields preserved unchanged

All v1 fields keep the same name and semantics:

- `source.*` (fileName, orderNumber, searchDate, formVersion, pageCount, extractedAt)
- `carrier.*` (cvorNumber, legalName, operatingAs, address, phone, mobile, fax, email, usDotNumber, cvorStatus, originalIssueDate, safetyRating, vehicleTypes, dangerousGoods)
- `pull.{reportDate, periodLabel, effectiveDate, expiryDate, windowStart, windowEnd}`
- `pull.{rating, colContrib, conContrib, insContrib, colPctOfThresh, conPctOfThresh, insPctOfThresh}`
- `pull.{collisionEvents, collWithPoints, collWithoutPoints, totalCollisionPoints}`
- `pull.{convictionEvents, convictionPoints}`
- `pull.{oosOverall, oosVehicle, oosDriver}`
- `pull.{trucks, drivers, onMiles, canadaMiles, usMexicoMiles, totalMiles}`
- Top-level `warnings[]` array

---

## v1 fields removed / replaced

- `inspectionEvents[]` → folded into `pull.events[]` (filter by `type === 'inspection'`).
- `pull.inspectionsByLevel` and `pull.inspectionsOosByLevel` → unified into `pull.levelStats.{level1..5}.{count, oosCount}`.
- `pull.totalVehiclesInspected` → moved into `pull.inspectionStats.vehiclesInspected`.
- `pull.inspectionThreshold` → renamed `pull.inspectionStats` (same shape, two field renames: `cvsaInspectionsConducted` → `cvsaInspections`, `driverPointsAssigned` → `driverPoints`, `vehiclePointsAssigned` → `vehiclePoints`).

---

## Highlight color palette extension

v1 used 4 colors (Green / Blue / Purple / Yellow). v2 adds 2 more so each event type has its own:

| Color | Sink |
|---|---|
| 🟢 GREEN  | Carrier identity (sticky profile) |
| 🔵 BLUE   | Per-Pull Metric (cvorPeriodicReports row) |
| 🟣 PURPLE | Inspection events (`pull.events[]` type=inspection) |
| 🔴 RED    | **NEW** — Collision events (`pull.events[]` type=collision) |
| 🟠 ORANGE | **NEW** — Conviction events (`pull.events[]` type=conviction) |
| 🟤 BROWN  | **NEW** — Travel kilometric rows (`pull.travelKm[]`) |
| 🟡 YELLOW | Optional / audit |

The pale shade still marks the LABEL; the strong shade still marks the VALUE.
