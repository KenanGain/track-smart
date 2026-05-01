# Page-by-Page Extraction Map (v2)

What to extract from every page of an Ontario MTO CVOR PDF, mapped to the `cvor-extraction-response.schema.json` JSON paths and the TrackSmart frontend surfaces (including **hover** tooltips) they drive.

> Page numbers refer to the standard 19-page CVOR PDF (`SR-LV-029A`). Layout is identical for the 8 / 17 / 29-page variants — only the event-list section grows or shrinks.

> Use this together with the annotated PDFs in `highlighted-pdfs/`. Each highlight maps to one of the 7 sinks: 🟢 GREEN / 🔵 BLUE / 🟣 PURPLE / 🔴 RED / 🟠 ORANGE / 🟤 BROWN / 🟡 YELLOW.

---

## Page 1 — Carrier Profile + Pull Snapshot Top Section

**Color sinks:** 🟢 GREEN (carrier identity) + 🔵 BLUE (per-pull metric) + 🟡 YELLOW (audit).

| PDF label | JSON path | Frontend surface | Color |
|---|---|---|---|
| **CVOR / RIN #** | `carrier.cvorNumber` | Carrier Profile header (sticky) | 🟢 |
| **Client Name** | `carrier.legalName` | Carrier Profile header | 🟢 |
| **Operating As** | `carrier.operatingAs` | Carrier Profile DBA badge | 🟢 |
| **Address** (multi-line) | `carrier.address.{street,city,state,zip,country}` | Carrier Profile address card | 🟢 |
| **Phone #** | `carrier.phone` | Carrier Profile contact card | 🟢 |
| **Mobile #** | `carrier.mobile` | Carrier Profile contact card | 🟡 |
| **Fax #** | `carrier.fax` | Carrier Profile contact card | 🟡 |
| **Email** | `carrier.email` | Carrier Profile contact card | 🟢 |
| **US DOT #** | `carrier.usDotNumber` | Carrier Profile contact card | 🟡 |
| **CVOR Status** | `carrier.cvorStatus` | Carrier Profile status badge | 🟢 |
| **Original Issue Date** | `carrier.originalIssueDate` | Carrier Profile dates row | 🟢 |
| **Start Date** | `pull.effectiveDate` | (audit) | 🟢 |
| **Expiry Date** | `pull.expiryDate` | (audit) | 🟢 |
| **Carrier Safety Rating** | `carrier.safetyRating` | Carrier Profile rating chip | 🟢 |
| **Type of Commercial Vehicle** | `carrier.vehicleTypes[]` | Carrier Profile fleet badges | 🟢 |
| **Dangerous Goods** (Yes/No) | `carrier.dangerousGoods` | Carrier Profile DG flag | 🟢 |
| **# of Commercial Vehicles** | `pull.trucks` | Pull Snapshot → Mileage Summary "Trucks" tile | 🔵 |
| **# of Drivers** | `pull.drivers` | (used for derived counts) | 🔵 |
| **Ontario Kms Travelled** | `pull.onMiles` | Pull Snapshot → Mileage Summary "Ontario" tile | 🔵 |
| **Rest of Canada Kms Travelled** | `pull.canadaMiles` | Pull Snapshot → Mileage Summary "Rest of Canada" tile | 🔵 |
| **US/Mexico Kms Travelled** | `pull.usMexicoMiles` | (carried but not rendered in mini panel) | 🔵 |
| **Total Kms Travelled** | `pull.totalMiles` | Pull Snapshot → Mileage Summary "Total" tile | 🔵 |
| **# of Vehicles Double Shifted** | (in `pull.travelKm[].doubleShifted`) | Travel Kilometric mini section | 🟡 |
| **Total # of Collisions** | `pull.collisionEvents` | Pull Snapshot → Collision Details total + KPI cards | 🔵 |
| **# of Collisions with points** | `pull.collWithPoints` | Pull Snapshot → Collision Details "With Points" row | 🔵 |
| **# of Collisions not pointed** | `pull.collWithoutPoints` | Pull Snapshot → Collision Details "Without Points" row | 🔵 |
| **Total # of convictions** | `pull.convictionEvents` | Pull Snapshot → Conviction Details total | 🔵 |
| **Search Date and Time** | `source.searchDate` (and `pull.reportDate`) | Pull row, Pull Snapshot title | 🟡 |
| **Order #** | `source.orderNumber` | (audit) | 🟡 |

---

## Page 2 — Performance Summary + Collision/Conviction Details + Inspections-by-Level

**Color sinks:** 🔵 BLUE everywhere on this page.

### A. Overall Violation Rate + Performance Summary (top of p.2)

| PDF label | JSON path | Frontend surface |
|---|---|---|
| **Overall Violation Rate** (%) | `pull.rating` | Pull Snapshot → CVOR Performance overall rating + Pull-by-Pull "Rating" column + main page headline |
| Collision row → **% Overall Contribution** | `pull.colContrib` | Pull-by-Pull "Col%" column + Performance History chart |
| Conviction row → **% Overall Contribution** | `pull.conContrib` | Pull-by-Pull "Con%" column |
| Inspection row → **% Overall Contribution** | `pull.insContrib` | Pull-by-Pull "Ins%" column |
| Collision row → **% of set Threshold** | `pull.colPctOfThresh` | CVOR Performance Collision tile (the big % number) |
| Conviction row → **% of set Threshold** | `pull.conPctOfThresh` | CVOR Performance Conviction tile |
| Inspection row → **% of set Threshold** | `pull.insPctOfThresh` | CVOR Performance Inspections tile + Inspection Statistics "% of Set Threshold" row |

### B. Collision Details box

| PDF label | JSON path | Frontend surface |
|---|---|---|
| **Fatal** count | `pull.collisionDetails.fatal` | Pull Snapshot → Collision Details "By Severity → Fatal" |
| **Personal Injury** count | `pull.collisionDetails.personalInjury` | "By Severity → Personal Injury" |
| **Property Damage** count | `pull.collisionDetails.propertyDamage` | "By Severity → Property Damage" |
| Collision Breakdown Total → **# of Points** | `pull.totalCollisionPoints` | Collision Details "Total Points" + KPI card |

### C. Conviction Details box

| PDF label | JSON path | Frontend surface |
|---|---|---|
| **With Points** | `pull.convictionDetails.withPoints` | Conviction Details "By Points Status → With Points" |
| **Not Pointed** | `pull.convictionDetails.notPointed` | "By Points Status → Not Pointed" |
| **Driver** | `pull.convictionDetails.driver` | "By Category → Driver" |
| **Vehicle** | `pull.convictionDetails.vehicle` | "By Category → Vehicle" |
| **Load** | `pull.convictionDetails.load` | "By Category → Load" |
| **Other** | `pull.convictionDetails.other` | "By Category → Other" |
| Conviction Breakdown Total → **# of Points** | `pull.convictionPoints` | Conviction Details "Total Points" + KPI card |

### D. Out-of-Service rates strip

| PDF label | JSON path | Frontend surface |
|---|---|---|
| **Overall Out of Service %** | `pull.oosOverall` | Pull-by-Pull "OOS Ov%" column + CVOR Performance Inspections tile detail |
| **Vehicle Out of Service %** | `pull.oosVehicle` | "OOS Veh%" column |
| **Driver Out of Service %** | `pull.oosDriver` | "OOS Drv%" column |

### E. # of Inspections by Level table (drives `levelStats`)

| PDF row × column | JSON path | Frontend surface |
|---|---|---|
| Level 1 / # | `pull.levelStats.level1.count` | Pull Snapshot → CVOR Rating Comparison "Level 1" row |
| Level 1 / OOS | `pull.levelStats.level1.oosCount` | Same row, OOS subtitle |
| Level 2 / # | `pull.levelStats.level2.count` | "Level 2" row |
| Level 2 / OOS | `pull.levelStats.level2.oosCount` | |
| Level 3 / # | `pull.levelStats.level3.count` | |
| Level 3 / OOS | `pull.levelStats.level3.oosCount` | |
| Level 4 / # | `pull.levelStats.level4.count` | |
| Level 4 / OOS | `pull.levelStats.level4.oosCount` | |
| Level 5 / # | `pull.levelStats.level5.count` | |
| Level 5 / OOS | `pull.levelStats.level5.oosCount` | |

---

## Page 3 — KMR Breakdowns + Inspection Threshold Calculation

### A. Collision Breakdown by Kilometre Rate Change (3 sub-period rows)

| PDF row | JSON path |
|---|---|
| Period 1 (most recent 8 mo) → # of Events | `pull.collisionBreakdown[0].events` |
| Period 1 → # of Points | `pull.collisionBreakdown[0].points` |
| Period 2 (middle 8 mo) → # of Events | `pull.collisionBreakdown[1].events` |
| Period 2 → # of Points | `pull.collisionBreakdown[1].points` |
| Period 3 (earliest 8 mo) → # of Events | `pull.collisionBreakdown[2].events` |
| Period 3 → # of Points | `pull.collisionBreakdown[2].points` |

**Frontend surface:** Pull Snapshot → Collision Breakdown by Km Rate mini section. The frontend re-derives `fromDate / toDate / kmPerMonth / threshold / pctSet` at render time from `reportDate` + `totalMiles`.

### B. Conviction Breakdown by Kilometre Rate Change (same shape)

`pull.convictionBreakdown[0..2].{events,points}` → Conviction Breakdown by Km Rate mini section.

### C. Inspection Threshold Calculation (drives `inspectionStats`)

| PDF label | JSON path | Frontend surface |
|---|---|---|
| **# of CVSA inspections conducted** | `pull.inspectionStats.cvsaInspections` | Inspection Statistics row |
| **# of Vehicles inspected** | `pull.inspectionStats.vehiclesInspected` | Same |
| **# of Drivers inspected** | `pull.inspectionStats.driversInspected` | Same |
| **# of Driver points assigned (D)** | `pull.inspectionStats.driverPoints` | Same |
| **# of Vehicle points assigned (V)** | `pull.inspectionStats.vehiclePoints` | Same |
| **Total inspection points (0.6875 × D + V)** | `pull.inspectionStats.totalInspectionPoints` | Same |
| **# of Set inspection threshold points** | `pull.inspectionStats.setThreshold` | Same |
| **% of Set Threshold** | (= `pull.insPctOfThresh`, also on p.2) | Same — emphasised row |

---

## Pages 4 – N — Intervention & Event Details

This is the **longest section**. Each row is one event (Inspection / Collision / Conviction). All rows go into `pull.events[]` discriminated by `type`.

**Color sinks:** 🟣 PURPLE (inspection rows), 🔴 RED (collision rows), 🟠 ORANGE (conviction rows).

### Common fields on every event row

| PDF label | JSON path |
|---|---|
| (event type icon) | `events[i].type` (`'inspection' \| 'collision' \| 'conviction'`) |
| **Date** / **Inspection Date** / **Incident Date** / **Event Date** | `events[i].date` |
| **Time** / **Start Time** / **End Time** / **Incident Time** | `events[i].time` (or `startTime` + `endTime` for inspections) |
| **CVIR #** (inspection) / **Ticket #** (coll/conv) | `events[i].cvir` or `events[i].ticket` |
| **Location** | `events[i].location` |
| **Driver Name** | `events[i].driverName` |
| **Driver Licence Number** | `events[i].driverLicence` |
| **Driver Licence Jurisdiction** | `events[i].driverLicenceJurisdiction` |
| **Vehicle 1** (Make / Unit / Plate / Jurisdiction) | `events[i].vehicle1.{make,unit,plate,jurisdiction}` |
| **Vehicle 2** (when present) | `events[i].vehicle2.{make,unit,plate,jurisdiction}` |

### Inspection-specific (🟣 PURPLE)

| PDF label | JSON path |
|---|---|
| **Level of Inspection** (1-5) | `events[i].level` |
| **# of Vehicles** inspected | `events[i].numVehicles` |
| **Vehicle Points** | `events[i].vehiclePoints` |
| **Driver Points** | `events[i].driverPoints` |
| **Categories OOS\*** | `events[i].oosCount` |
| **Total All Defects** | `events[i].totalDefects` |
| **Charged** (Y/N) | `events[i].charged` |
| **Co-Driver** (Y/N) | `events[i].coDriver` |
| **Impoundment** (Y/N) | `events[i].impoundment` |
| Repeating **Category\*** / **Defect** rows | `events[i].defects[].{category,defect,oos}` (`oos=true` when Category had asterisk) |

### Collision-specific (🔴 RED)

| PDF label | JSON path |
|---|---|
| **Collision Class** | `events[i].collision.collisionClass` |
| **Jurisdiction** | `events[i].collision.jurisdiction` |
| **Vehicle Action** | `events[i].collision.vehicleAction` |
| **Vehicle Condition** | `events[i].collision.vehicleCondition` |
| **Driver Action** | `events[i].collision.driverAction` |
| **Driver Condition** | `events[i].collision.driverCondition` |
| **Driver Charged** (Y/N) | `events[i].collision.driverCharged` |
| **Points** | `events[i].collision.points` |
| **Microfilm #** | `events[i].collision.microfilm` |

### Conviction-specific (🟠 ORANGE)

| PDF label | JSON path |
|---|---|
| **Conviction Date** | `events[i].conviction.convictionDate` |
| **Jurisdiction** | `events[i].conviction.jurisdiction` |
| **Charged Carrier** (Y/N/-) | `events[i].conviction.chargedCarrier` |
| **Microfilm #** | `events[i].conviction.microfilm` |
| **Offence** | `events[i].conviction.offence` |
| **CCMTA Equivalency** | `events[i].conviction.ccmtaEquivalency` |
| **Offence Location** | (subsumed into `events[i].location`) |
| **Points** | `events[i].conviction.points` |

---

## Page 18+ — Travel Kilometric Information

**Color sink:** 🟤 BROWN.

| PDF column | JSON path |
|---|---|
| **From Date** | `pull.travelKm[i].fromDate` |
| **To Date** | `pull.travelKm[i].toDate` |
| **E/A** (Estimated / Actual) | `pull.travelKm[i].type` |
| **# Vehicles** | `pull.travelKm[i].vehicles` |
| **# Double Shifted** | `pull.travelKm[i].doubleShifted` |
| **Total Vehicles** | `pull.travelKm[i].totalVehicles` |
| **Ontario KM** | `pull.travelKm[i].ontarioKm` |
| **Rest of Canada KM** | `pull.travelKm[i].restOfCanadaKm` |
| **US/Mexico KM** | `pull.travelKm[i].usMexicoKm` |
| **# Drivers** | `pull.travelKm[i].drivers` |
| **Total KM** | `pull.travelKm[i].totalKm` |

**Frontend surface:** Pull Snapshot → Travel Kilometric Information mini section (sortable / paginated table with E/A filter dropdown).

---

## Footer — Form metadata

| PDF text | JSON path |
|---|---|
| **SR-LV-029A (2021/10)** (or similar) | `source.formVersion` |

---

## Hover tooltips — what data they consume

The TrackSmart frontend shows several **hover-only** popups that all derive from the schema fields above (no extra data needed from the PDF):

| Hover surface | Derives from |
|---|---|
| Main page CVOR Performance category tile (Collisions / Convictions / Inspections) | `colPctOfThresh` / `conPctOfThresh` / `insPctOfThresh`, weights (40/40/20 — constant), and the CVOR thresholds (Warning/Audit/Show Cause/Seizure — app-level constants) |
| Pull Snapshot category tile (same 3 tiles, mini) | Same as above |
| Pull-by-Pull row hover | Already-displayed row columns (no extra data) |
| Inspection event expanded row | `events[i].defects[]` plus the inspection-specific fields above |
| Collision event expanded row | `events[i].collision.*` |
| Conviction event expanded row | `events[i].conviction.*` |
| Level Comparison level hover | `pull.levelStats.levelN.{count, oosCount}` |
| Pull Snapshot rating bar tooltip | `pull.rating` + threshold constants |
| Pull-by-Pull table → "Pull Coverage" badge in aggregate view | `events[i]` deduplicated across pulls (frontend-side aggregation) |

**No new schema fields are needed for hover content.** The schema captures the underlying data; the frontend renders both static and hover surfaces from it.

---

## Validator cross-field checks

The values you extract on different pages are tied together. The 15 cross-field checks in `validate.py` confirm:

1. p.2 collision severity sums to p.1 collision count.
2. p.2/p.3 conviction category and points-status both sum to p.1 conviction count.
3. p.2 level counts sum to p.3 CVSA inspections.
4. p.2 level OOS counts × 100 / cvsa ≈ p.2 OOS overall.
5. p.3 inspection-points formula closes (0.6875 × D + V).
6. p.3 KMR breakdown sums for collision and conviction match p.1 totals.
7. Event-list type counts (`type==='inspection' / 'collision' / 'conviction'`) match the p.1 / p.3 totals.
8. p.18+ travel KM totals close to p.1 total kms travelled (±5%).

If any check fails, your output is mathematically inconsistent — fix it before delivery.
