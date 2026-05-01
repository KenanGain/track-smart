# Extraction map — 20241104_125433_0000369fbd10.pdf

Page-by-page guide for this specific PDF (8 pages). Read this side-by-side with `annotated.pdf` while you build your parser.

> The 7 highlight colors:
> 🟢 carrier identity · 🔵 per-pull metric · 🟣 inspection event · 🔴 collision event · 🟠 conviction event · 🟤 travel KM row · 🟡 audit/optional

---

## Page 1 — Carrier identity + Pull totals (🟢🔵🟡)

What you'll see on this page → JSON path → TrackSmart UI surface.

| PDF label | JSON path | UI surface | Color |
|---|---|---|---|
| **CVOR / RIN #** | `carrier.cvorNumber` (`369-110-004`) | Carrier Profile header | 🟢 |
| **Client Name** | `carrier.legalName` (`BLUEFIN LOCAL HAULERS LTD.`) | Carrier Profile header | 🟢 |
| **Operating As** | `carrier.operatingAs` (`BLUEFIN HAUL`) | Carrier Profile DBA badge | 🟢 |
| **Address** (multi-line) | `carrier.address.{street,city,state,zip,country}` | Carrier Profile address card | 🟢 |
| **Phone #** | `carrier.phone` | Contact card | 🟢 |
| **Email** | `carrier.email` | Contact card | 🟢 |
| **CVOR Status** | `carrier.cvorStatus` (`Registered`) | Status badge | 🟢 |
| **Original Issue Date** | `carrier.originalIssueDate` | Dates row | 🟢 |
| **Carrier Safety Rating** | `carrier.safetyRating` (`Satisfactory-Unaudited`) | Rating chip | 🟢 |
| **Type of Commercial Vehicle** | `carrier.vehicleTypes[]` | Fleet badges | 🟢 |
| **Dangerous Goods** | `carrier.dangerousGoods` (`false`) | DG flag | 🟢 |
| **Search Date and Time** | `source.searchDate`, `pull.reportDate` (`2026-01-26`) | Pull row + Pull Snapshot title | 🟡 |
| **Order #** | `source.orderNumber` | (audit) | 🟡 |
| **# of Commercial Vehicles** | `pull.trucks` (`45`) | Mileage Summary "Trucks" | 🔵 |
| **# of Drivers** | `pull.drivers` | (derived counts) | 🔵 |
| **Ontario Kms Travelled** | `pull.onMiles` (`3,358,000`) | Mileage Summary "Ontario" | 🔵 |
| **Rest of Canada Kms Travelled** | `pull.canadaMiles` (`0`) | Mileage Summary "Rest of Canada" | 🔵 |
| **Total Kms Travelled** | `pull.totalMiles` (`3,358,000`) | Mileage Summary "Total" | 🔵 |
| **Total # of Collisions** | `pull.collisionEvents` (`4`) | Collision Details total + KPI cards | 🔵 |
| **# of Collisions with points** | `pull.collWithPoints` (`2`) | Collision Details "With Points" | 🔵 |
| **# of Collisions not pointed** | `pull.collWithoutPoints` (`2`) | Collision Details "Without Points" | 🔵 |
| **Total # of convictions** | `pull.convictionEvents` (`10`) | Conviction Details total | 🔵 |

---

## Page 2 — Performance Summary + Severity breakdowns + Level table (🔵)

### Overall + Performance Summary

| PDF label | JSON path | Value for this PDF | UI surface |
|---|---|---|---|
| **Overall Violation Rate** | `pull.rating` | **32.18%** | CVOR Performance overall rating + Pull-by-Pull "Rating" |
| Collision row → **% Overall Contribution** | `pull.colContrib` | 9.39 | Pull-by-Pull "Col%" |
| Conviction row → **% Overall Contribution** | `pull.conContrib` | 15.39 | Pull-by-Pull "Con%" |
| Inspection row → **% Overall Contribution** | `pull.insContrib` | 7.4 | Pull-by-Pull "Ins%" |
| Collision **% of set Threshold** | `pull.colPctOfThresh` | 23.47 | CVOR Performance Collision tile |
| Conviction **% of set Threshold** | `pull.conPctOfThresh` | 38.48 | CVOR Performance Conviction tile |
| Inspection **% of set Threshold** | `pull.insPctOfThresh` | 37 | CVOR Performance Inspections tile |

### Collision Details box (severity)

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **Fatal** | `pull.collisionDetails.fatal` | 0 | "By Severity → Fatal" |
| **Personal Injury** | `pull.collisionDetails.personalInjury` | 0 | "By Severity → Personal Injury" |
| **Property Damage** | `pull.collisionDetails.propertyDamage` | 4 | "By Severity → Property Damage" |
| **Total Collision Points** | `pull.totalCollisionPoints` | 4 | Collision Details "Total Points" |

> Constraint: `fatal + personalInjury + propertyDamage = 4 = collisionEvents (4)` ✓

### Conviction Details box (category + points-status)

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **With Points** | `pull.convictionDetails.withPoints` | 9 | "By Points Status → With Points" |
| **Not Pointed** | `pull.convictionDetails.notPointed` | 1 | "By Points Status → Not Pointed" |
| **Driver** | `pull.convictionDetails.driver` | 6 | "By Category → Driver" |
| **Vehicle** | `pull.convictionDetails.vehicle` | 0 | "By Category → Vehicle" |
| **Load** | `pull.convictionDetails.load` | 1 | "By Category → Load" |
| **Other** | `pull.convictionDetails.other` | 3 | "By Category → Other" |
| **Total Conviction Points** | `pull.convictionPoints` | 16 | Conviction Details "Total Points" |

> Both axes must equal `convictionEvents` (10). withPts+notPtd = 10 ✓ · drv+veh+load+other = 10 ✓

### OOS rates strip

| PDF label | JSON path | Value | UI |
|---|---|---|---|
| **Overall Out of Service %** | `pull.oosOverall` | 20.69% | Pull-by-Pull "OOS Ov%" |
| **Vehicle Out of Service %** | `pull.oosVehicle` | 33.33% | Pull-by-Pull "OOS Veh%" |
| **Driver Out of Service %** | `pull.oosDriver` | 3.45% | Pull-by-Pull "OOS Drv%" |

### # of Inspections by Level table

| Level | count | OOS | UI |
|---|---:|---:|---|
| Level 1 | 5 | 4 | Pull Snapshot → CVOR Rating Comparison "Level 1" |
| Level 2 | 4 | 1 | "Level 2" |
| Level 3 | 17 | 1 | "Level 3" |
| Level 4 | 7 | 1 | "Level 4" |
| Level 5 | 3 | 0 | "Level 5" |

> Sum of `count` (36) MUST equal `inspectionStats.cvsaInspections` (36). ✓

---

## Page 3 — KMR Breakdowns + Inspection Threshold (🔵)

### Collision Breakdown by Kilometre Rate Change

| Period | Events | Points |
|---|---:|---:|
| 1 (most recent 8 mo) | 1 | 0 |
| 2 (middle 8 mo)      | 0 | 0 |
| 3 (earliest 8 mo)    | 3 | 4 |
| **Sum**              | **4** | **4** |

→ `pull.collisionBreakdown[0..2].{events,points}`. Sum must equal `collisionEvents` (4) and `totalCollisionPoints` (4). ✓

### Conviction Breakdown by Kilometre Rate Change

| Period | Events | Points |
|---|---:|---:|
| 1 | 0 | 0 |
| 2 | 4 | 6 |
| 3 | 6 | 10 |
| **Sum** | **10** | **16** |

→ `pull.convictionBreakdown[0..2].{events,points}`. Sum must equal `convictionEvents` (10) and `convictionPoints` (16). ✓

### Inspection Threshold Calculation (drives Inspection Statistics mini section)

| Field | Value | JSON path |
|---|---:|---|
| # of CVSA inspections conducted | 36 | `pull.inspectionStats.cvsaInspections` |
| # of Vehicles inspected | 38 | `pull.inspectionStats.vehiclesInspected` |
| # of Drivers inspected | 36 | `pull.inspectionStats.driversInspected` |
| # of Driver points assigned (D) | 1 | `pull.inspectionStats.driverPoints` |
| # of Vehicle points assigned (V) | 6 | `pull.inspectionStats.vehiclePoints` |
| Total inspection points (0.6875 × D + V) | 6.69 | `pull.inspectionStats.totalInspectionPoints` |
| # of Set inspection threshold points | 18.08 | `pull.inspectionStats.setThreshold` |
| % of Set Threshold | 37% | (= `pull.insPctOfThresh`) |

> Formula: `0.6875 × 1 + 6 = 6.69 ≈ totalInspectionPoints (6.69)` ✓

---

## Pages 4 – 6 — Intervention & Event Details (🟣🔴🟠)

This is the longest section: each row is one event. **Inspection rows** (🟣 PURPLE), **Collision rows** (🔴 RED), **Conviction rows** (🟠 ORANGE).

For this PDF: **4 collisions + 10 convictions + 36 inspections = 50 total events**.

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
> - `events.filter(type==='inspection').length === inspectionStats.cvsaInspections` (36)
> - `events.filter(type==='collision').length === collisionEvents` (4)
> - `events.filter(type==='conviction').length === convictionEvents` (10)

---

## Pages 7+ — Travel Kilometric Information (🟤)

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

> **Constraint:** `Σ travelKm[].totalKm ≈ pull.totalMiles` (3,358,000) within ±5%.

---

## Footer — form metadata

`source.formVersion` (e.g. `SR-LV-029A (2021/10)`).
