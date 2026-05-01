# 05 — Frontend Component Mapping

How each JSON field is rendered. Useful for understanding why a field is named the way it is, and for prioritizing accuracy.

---

## Carrier Profile identity card

Top of `/account/profile` (the Carrier Profile page). Renders **once** when the carrier is created or refreshed.

| JSON | UI element |
|---|---|
| `carrier.cvorNumber` | "CVOR # 138-903-258" badge |
| `carrier.legalName` | Page title |
| `carrier.operatingAs` | "DBA <name>" subtitle |
| `carrier.address.*` | Address line in the contact card |
| `carrier.phone`, `carrier.email` | Contact card |
| `carrier.cvorStatus` | Status pill (color-coded) |
| `carrier.originalIssueDate`, `effectiveDate`, `expiryDate` | Dates panel |
| `carrier.safetyRating` | Rating badge (color-coded) |
| `carrier.vehicleTypes` | Chips list ("Truck", "Bus") |
| `carrier.dangerousGoods` | TDG badge if `true` |

---

## CVOR page — Top KPI cards (4 tiles)

Reads the **latest** `pull` record.

| Card | JSON |
|---|---|
| **Overall CVOR Rating** (big % + zone) | `pull.rating` + threshold zone |
| **Collisions** | `pull.colPctOfThresh`, `pull.collisionEvents`, `pull.totalCollisionPoints` |
| **Convictions** | `pull.conPctOfThresh`, `pull.convictionEvents`, `pull.convictionPoints` |
| **Inspections** | `pull.insPctOfThresh`, `pull.oosOverall` |

Threshold zones (hardcoded in UI): WARN 35% / AUDIT 50% / SHOW CAUSE 85% / SEIZURE 100%.

---

## CVOR page — Out-of-Service Rates strip

| Card | JSON | Threshold |
|---|---|---|
| OVERALL | `pull.oosOverall` | 30% |
| VEHICLE | `pull.oosVehicle` | 25% |
| DRIVER  | `pull.oosDriver`  | 10% |

---

## CVOR page — Mileage Summary

KM/MI toggle in UI. Stored as KM.

| Card | JSON |
|---|---|
| Ontario   | `pull.onMiles` |
| Canada    | `pull.canadaMiles` |
| US/Mexico | `pull.usMexicoMiles` |
| Total     | `pull.totalMiles` |

---

## CVOR page — CVOR Rating Comparison (Inspections by Level)

5 cards, one per CVSA inspection level.

| Card label | JSON |
|---|---|
| Level 1 — Full Inspection | `pull.inspectionsByLevel.l1`, `pull.inspectionsOosByLevel.l1` |
| Level 2 — Walk-Around | `.l2` pair |
| Level 3 — Driver/Credentials | `.l3` pair |
| Level 4 — Special Inspections | `.l4` pair |
| Level 5 — Vehicle Only | `.l5` pair |

UI computes "OOS %" per card as `oosL_n / inspL_n`.

---

## CVOR page — Performance History chart (multi-line)

Time-series of all `cvorPeriodicReports`, indexed by `pull.reportDate`.

| Line | JSON field across all pulls |
|---|---|
| Overall CVOR Rating | `pull.rating` |
| Threshold lines (35/50/85) | static |

Hover tooltip on each pull dot shows: `rating`, `colContrib`, `conContrib`, `insContrib`, `oosOverall`, `oosVehicle`, `oosDriver`, `collisionEvents / convictionEvents`, `totalCollisionPoints / convictionPoints`.

---

## CVOR page — Category Contributions chart

3 lines, one per weighted contribution.

| Line | JSON |
|---|---|
| Collisions (40%) | `pull.colContrib` |
| Convictions (40%) | `pull.conContrib` |
| Inspections (20%) | `pull.insContrib` |

---

## CVOR page — Out-of-Service Rates chart

3 lines + 2 threshold lines (20%, 35%).

| Line | JSON |
|---|---|
| Overall OOS% | `pull.oosOverall` |
| Vehicle OOS% | `pull.oosVehicle` |
| Driver OOS% | `pull.oosDriver` |

---

## CVOR page — Event Counts & Points chart (bars + lines)

| Series | JSON |
|---|---|
| Collisions (bar)   | `pull.collisionEvents` |
| Convictions (bar)  | `pull.convictionEvents` |
| Col Points (line)  | `pull.totalCollisionPoints` |
| Conv Points (line) | `pull.convictionPoints` |

---

## CVOR page — Pull-by-Pull table (14 columns)

One row per pull. Newest first.

| Column | JSON |
|---|---|
| Pull Date | `pull.reportDate` (rendered via `pull.periodLabel`) |
| 24-Month Window | derived: `windowStart` → `windowEnd` |
| Status | derived UI-side from `rating` zone |
| Rating | `pull.rating` |
| Col% | `pull.colContrib` |
| Con% | `pull.conContrib` |
| Ins% | `pull.insContrib` |
| #Col | `pull.collisionEvents` |
| #Conv | `pull.convictionEvents` |
| Col Pts | `pull.totalCollisionPoints` |
| Conv Pts | `pull.convictionPoints` |
| OOS Ov% | `pull.oosOverall` |
| OOS Veh% | `pull.oosVehicle` |
| OOS Drv% | `pull.oosDriver` |

---

## CVOR page — Bottom CVOR Inspections list

Drilldown for the **selected pull**. Filtered by the user via the `CVOR Inspection Filters` row (All / Clean / OOS Flags / Veh Issues / HOS-Driver / Severe 7+).

| Column | JSON |
|---|---|
| Date / Time | `event.inspectionDate` + `event.startTime` - `event.endTime` |
| Report | `event.cvirNumber` + `CVOR L<level>` badge from `event.level` |
| Location | `event.location` + jurisdiction |
| Driver / Licence | `event.driver.name` + `event.driver.licenseNumber` |
| Power Unit / Defects | `event.vehicles[0].unitNumber` + comma-joined `event.defects[].defect` |
| Violations | count = `event.defects.length` |
| Veh Pts | `event.vehiclePoints` |
| Dvr Pts | `event.driverPoints` |
| CVOR Pts | `event.cvorPoints` |
| Status | `event.status` |
| Violation Categories sublist | `groupBy(event.defects[].category)`, with `oos:true` showing the OOS chip |

---

## TypeScript reference

The fields above mirror the existing TS interfaces:

```ts
// src/pages/inspections/inspectionsData.ts
export type CvorPeriodicReport = {
  reportDate: string; periodLabel: string;
  rating: number; colContrib: number; conContrib: number; insContrib: number;
  colPctOfThresh: number; conPctOfThresh: number; insPctOfThresh: number;
  collisionEvents: number; convictionEvents: number;
  oosOverall: number; oosVehicle: number; oosDriver: number;
  trucks: number; onMiles: number; canadaMiles: number; totalMiles: number;
  collWithPoints: number; collWithoutPoints: number;
  totalCollisionPoints: number; convictionPoints: number;
};
```

**Field names in the JSON response must match these exactly** — the renderer reads them by name.
