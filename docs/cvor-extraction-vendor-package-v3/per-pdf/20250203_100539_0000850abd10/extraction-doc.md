# Extraction map — 20250203_100539_0000850abd10.pdf

Page-by-page guide for this specific PDF (29 pages). Read this side-by-side with `annotated.pdf` while you build your parser.

> The 7 highlight colors:
> 🟢 carrier identity · 🔵 per-pull metric · 🟣 inspection event · 🔴 collision event · 🟠 conviction event · 🟤 travel KM row · 🟡 audit/optional

---

## Page 1 — Carrier identity + Pull totals (🟢🔵🟡)

What you'll see on this page → JSON path → TrackSmart UI surface.

| PDF label | JSON path | UI surface | Color |
|---|---|---|---|
| **CVOR / RIN #** | `carrier.cvorNumber` (`850-000-203`) | Carrier Profile header | 🟢 |
| **Client Name** | `carrier.legalName` (`GTA EXPRESS LOGISTICS INC.`) | Carrier Profile header | 🟢 |
| **Operating As** | `carrier.operatingAs` (`GTA EXPRESS`) | Carrier Profile DBA badge | 🟢 |
| **Address** (multi-line) | `carrier.address.{street,city,state,zip,country}` | Carrier Profile address card | 🟢 |
| **Phone #** | `carrier.phone` | Contact card | 🟢 |
| **Email** | `carrier.email` | Contact card | 🟢 |
| **CVOR Status** | `carrier.cvorStatus` (`Registered`) | Status badge | 🟢 |
| **Original Issue Date** | `carrier.originalIssueDate` | Dates row | 🟢 |
| **Carrier Safety Rating** | `carrier.safetyRating` (`Satisfactory-Unaudited`) | Rating chip | 🟢 |
| **Type of Commercial Vehicle** | `carrier.vehicleTypes[]` | Fleet badges | 🟢 |
| **Dangerous Goods** | `carrier.dangerousGoods` (`true`) | DG flag | 🟢 |
| **Search Date and Time** | `source.searchDate`, `pull.reportDate` (`2025-02-03`) | Pull row + Pull Snapshot title | 🟡 |
| **Order #** | `source.orderNumber` | (audit) | 🟡 |
| **# of Commercial Vehicles** | `pull.trucks` (`130`) | Mileage Summary "Trucks" | 🔵 |
| **# of Drivers** | `pull.drivers` | (derived counts) | 🔵 |
| **Ontario Kms Travelled** | `pull.onMiles` (`16,388,058`) | Mileage Summary "Ontario" | 🔵 |
| **Rest of Canada Kms Travelled** | `pull.canadaMiles` (`666,469`) | Mileage Summary "Rest of Canada" | 🔵 |
| **Total Kms Travelled** | `pull.totalMiles` (`17,054,528`) | Mileage Summary "Total" | 🔵 |
| **Total # of Collisions** | `pull.collisionEvents` (`22`) | Collision Details total + KPI cards | 🔵 |
| **# of Collisions with points** | `pull.collWithPoints` (`8`) | Collision Details "With Points" | 🔵 |
| **# of Collisions not pointed** | `pull.collWithoutPoints` (`14`) | Collision Details "Without Points" | 🔵 |
| **Total # of convictions** | `pull.convictionEvents` (`26`) | Conviction Details total | 🔵 |

---

## Page 2 — Performance Summary + Severity breakdowns + Level table (🔵)

### Overall + Performance Summary

| PDF label | JSON path | Value for this PDF | UI surface |
|---|---|---|---|
| **Overall Violation Rate** | `pull.rating` | **27.21%** | CVOR Performance overall rating + Pull-by-Pull "Rating" |
| Collision row → **% Overall Contribution** | `pull.colContrib` | 3.31 | Pull-by-Pull "Col%" |
| Conviction row → **% Overall Contribution** | `pull.conContrib` | 5.62 | Pull-by-Pull "Con%" |
| Inspection row → **% Overall Contribution** | `pull.insContrib` | 18.29 | Pull-by-Pull "Ins%" |
| Collision **% of set Threshold** | `pull.colPctOfThresh` | 8.28 | CVOR Performance Collision tile |
| Conviction **% of set Threshold** | `pull.conPctOfThresh` | 14.05 | CVOR Performance Conviction tile |
| Inspection **% of set Threshold** | `pull.insPctOfThresh` | 91.45 | CVOR Performance Inspections tile |

### Collision Details box (severity)

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **Fatal** | `pull.collisionDetails.fatal` | 0 | "By Severity → Fatal" |
| **Personal Injury** | `pull.collisionDetails.personalInjury` | 3 | "By Severity → Personal Injury" |
| **Property Damage** | `pull.collisionDetails.propertyDamage` | 19 | "By Severity → Property Damage" |
| **Total Collision Points** | `pull.totalCollisionPoints` | 18 | Collision Details "Total Points" |

> Constraint: `fatal + personalInjury + propertyDamage = 22 = collisionEvents (22)` ✓

### Conviction Details box (category + points-status)

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **With Points** | `pull.convictionDetails.withPoints` | 22 | "By Points Status → With Points" |
| **Not Pointed** | `pull.convictionDetails.notPointed` | 4 | "By Points Status → Not Pointed" |
| **Driver** | `pull.convictionDetails.driver` | 14 | "By Category → Driver" |
| **Vehicle** | `pull.convictionDetails.vehicle` | 7 | "By Category → Vehicle" |
| **Load** | `pull.convictionDetails.load` | 3 | "By Category → Load" |
| **Other** | `pull.convictionDetails.other` | 2 | "By Category → Other" |
| **Total Conviction Points** | `pull.convictionPoints` | 72 | Conviction Details "Total Points" |

> Both axes must equal `convictionEvents` (26). withPts+notPtd = 26 ✓ · drv+veh+load+other = 26 ✓

### OOS rates strip

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **Overall Out of Service %** | `pull.oosOverall` | 28.57% | Pull-by-Pull "OOS Ov%" |
| **Vehicle Out of Service %** | `pull.oosVehicle` | 31.43% | Pull-by-Pull "OOS Veh%" |
| **Driver Out of Service %** | `pull.oosDriver` | 4.40% | Pull-by-Pull "OOS Drv%" |

### # of Inspections by Level table

| Level | count | OOS | UI |
|---|---:|---:|---|
| Level 1 | 61 | 22 | Pull Snapshot → CVOR Rating Comparison "Level 1" |
| Level 2 | 46 | 15 | "Level 2" |
| Level 3 | 38 | 5 | "Level 3" |
| Level 4 | 4 | 1 | "Level 4" |
| Level 5 | 3 | 0 | "Level 5" |

> Sum of `count` (152) MUST equal `inspectionStats.cvsaInspections` (152). ✓

---

## Page 3 — KMR Breakdowns + Inspection Threshold (🔵)

### Collision Breakdown by Kilometre Rate Change

| Period | Events | Points |
|---|---:|---:|
| 1 (most recent 8 mo) | 8 | 8 |
| 2 (middle 8 mo)      | 7 | 6 |
| 3 (earliest 8 mo)    | 7 | 4 |
| **Sum**              | **22** | **18** |

→ `pull.collisionBreakdown[0..2].{events,points}`. Sum must equal `collisionEvents` (22) and `totalCollisionPoints` (18). ✓

### Conviction Breakdown by Kilometre Rate Change

| Period | Events | Points |
|---|---:|---:|
| 1 | 10 | 27 |
| 2 | 9 | 26 |
| 3 | 7 | 19 |
| **Sum** | **26** | **72** |

→ `pull.convictionBreakdown[0..2].{events,points}`. Sum must equal `convictionEvents` (26) and `convictionPoints` (72). ✓

### Inspection Threshold Calculation (drives Inspection Statistics mini section)

| Field | Value | JSON path |
|---|---:|---|
| # of CVSA inspections conducted | 152 | `pull.inspectionStats.cvsaInspections` |
| # of Vehicles inspected | 228 | `pull.inspectionStats.vehiclesInspected` |
| # of Drivers inspected | 152 | `pull.inspectionStats.driversInspected` |
| # of Driver points assigned (D) | 3 | `pull.inspectionStats.driverPoints` |
| # of Vehicle points assigned (V) | 51 | `pull.inspectionStats.vehiclePoints` |
| Total inspection points (0.6875 × D + V) | 53.06 | `pull.inspectionStats.totalInspectionPoints` |
| # of Set inspection threshold points | 58.02 | `pull.inspectionStats.setThreshold` |
| % of Set Threshold | 91.45% | (= `pull.insPctOfThresh`) |

> Formula: `0.6875 × 3 + 51 = 53.06 ≈ totalInspectionPoints (53.06)` ✓

---

## Pages 4 – 27 — Intervention & Event Details (🟣🔴🟠)

This is the longest section: each row is one event. **Inspection rows** (🟣 PURPLE), **Collision rows** (🔴 RED), **Conviction rows** (🟠 ORANGE).

For this PDF: **22 collisions + 26 convictions + 152 inspections = 200 total events**.

### Common fields on every row

| PDF label | JSON path |
|---|---|
| Date / Inspection Date / Incident Date / Event Date | `events[i].date` |
| Time / Start+End Time | `events[i].time` (or `startTime` + `endTime` for inspections) |
| CVIR # / Ticket # | `events[i].cvir` or `events[i].ticket` |
| Location | `events[i].location` |
| Driver Name | `events[i].driverName` |
| Driver Licence Number + Jurisdiction | `events[i].driverLicence`, `events[i].driverLicenceJurisdiction` |
| Vehicle 1 (Make / Unit / Plate / Jurisdiction) | `events[i].vehicle1.{make,unit,plate,jurisdiction}` |
| Vehicle 2 (when present) | `events[i].vehicle2.*` |

### Inspection-specific (🟣 PURPLE)

`events[i].{level, vehiclePoints, driverPoints, oosCount, totalDefects, charged, coDriver, impoundment, defects[]}`.

### Collision-specific (🔴 RED)

`events[i].collision.{collisionClass, jurisdiction, vehicleAction, vehicleCondition, driverAction, driverCondition, driverCharged, points, microfilm}`.

### Conviction-specific (🟠 ORANGE)

`events[i].conviction.{convictionDate, jurisdiction, chargedCarrier, microfilm, offence, ccmtaEquivalency, points}`.

> **Constraint:** the 3 type-counts in `events` must match the totals on pages 1-3:
> - `events.filter(type==='inspection').length === inspectionStats.cvsaInspections` (152)
> - `events.filter(type==='collision').length === collisionEvents` (22)
> - `events.filter(type==='conviction').length === convictionEvents` (26)

---

## Pages 28+ — Travel Kilometric Information (🟤)

Per-period rows with E/A type discriminator. `pull.travelKm[]` array.

| PDF column | JSON path |
|---|---|
| From Date | `pull.travelKm[i].fromDate` |
| To Date | `pull.travelKm[i].toDate` |
| E/A | `pull.travelKm[i].type` (`Estimated` \| `Actual`) |
| # Vehicles / # Double Shifted / Total Vehicles | `pull.travelKm[i].{vehicles,doubleShifted,totalVehicles}` |
| Ontario KM / Rest of Canada KM / US/Mexico KM | `pull.travelKm[i].{ontarioKm,restOfCanadaKm,usMexicoKm}` |
| # Drivers | `pull.travelKm[i].drivers` |
| Total KM | `pull.travelKm[i].totalKm` |

> **Constraint:** `Σ travelKm[].totalKm ≈ pull.totalMiles` (17,054,528) within ±5%.

---

## Footer — form metadata

`source.formVersion` (e.g. `SR-LV-029A (2021/10)`).
