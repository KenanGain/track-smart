---
name: CVOR Upload Reference
description: Authoritative field map for CVOR upload — what we extract from the Ontario MTO CVOR PDF and push to the CVOR data model
type: reference
tags: [reference, cvor, ontario, mto, compliance, extraction]
---

# CVOR Upload — Required Data Fields & PDF Source Map

What is captured when a carrier uploads or registers a **CVOR (Commercial Vehicle Operator's Registration)** profile. This is the source of truth for both the **CVOR upload form** AND the **PDF extractor** that ingests Ontario MTO CVOR documents.

**Scope:** Operators of commercial vehicles >4,500 kg or buses (>10 passengers) registered in Ontario. Issued and maintained by Ontario MTO. Document title in PDF: `COMMERCIAL VEHICLE OPERATOR RECORD` (form `SR-LV-029A (2021/10)`).

**Companion doc:** [[CVOR PDF Extraction Map]] — page-by-page walkthrough with highlight legend.

---

## Highlight legend (for marking the source PDF)

Four categories, each with **two shades** so labels and values are visually distinct in the annotated PDF:

| Color | Sink | Lands in |
|---|---|---|
| 🟢 **GREEN**  (pale label / strong value) | Carrier Identity      | Carrier Profile (one-time) |
| 🔵 **BLUE**   (pale label / strong value) | Per-Pull Metric       | `cvorPeriodicReports` → KPI cards, history chart, Pull-by-Pull table |
| 🟣 **PURPLE** (pale label / strong value) | Per-Inspection Event  | bottom **CVOR Inspections** list |
| 🟡 **YELLOW** (pale label / strong value) | Optional / audit      | push if present, OK to skip |
| 🔴 No color | Ignore | page chrome, MTO metadata, multi-year travel history |

Every row below has a `PDF Source` cell with the exact label string and page number where the value appears.

---

## ⭐ TL;DR — What the App Actually Consumes

The site has **three CVOR data sinks**. Anything not listed here is appendix — useful for audit but not surfaced in the UI today.

### A. Carrier Profile (one-time, on first CVOR upload)

Populates the carrier's identity card on `/account/profile`. These are 🟢 in the PDF.

| Frontend field | PDF label (page 1) |
|---|---|
| `cvorNumber` | `CVOR / RIN #` |
| `legalName` | `Client Name` |
| `dbaName` | `Operating As` |
| `address` (full block) | `Address` |
| `phone` | `Phone #` |
| `email` | `Email` |
| `cvorStatus` | `CVOR Status` |
| `originalIssueDate` | `Original Issue Date` |
| `effectiveDate` | `Start Date` |
| `expiryDate` | `Expiry Date` |
| `safetyRating` | `Carrier Safety Rating` |
| `fleetTrucks` | `# of Commercial Vehicles` |
| `fleetDrivers` | `# of Drivers` |
| `vehicleTypes` | `Type of Commercial Vehicle` |
| `dangerousGoods` | `Dangerous Goods` |

### B. CVOR Pull (every upload — appended to `cvorPeriodicReports`)

One row per uploaded PDF. Maps **1-to-1** to `CvorPeriodicReport` in `src/pages/inspections/inspectionsData.ts`. These are 🔵 in the PDF.

| Frontend field | PDF source | Page |
|---|---|---|
| `reportDate` | `Search Date and Time` (date portion) — the pull date | p.1 header |
| `periodLabel` | derived from `reportDate` (e.g. `"Apr 2/26"`) | — |
| `rating` | `Overall Violation Rate %` | p.2 footer of Performance Summary |
| `colContrib` | Performance Summary → `Collision` row → `% Overall Contribution` | p.2 |
| `conContrib` | Performance Summary → `Conviction` row → `% Overall Contribution` | p.2 |
| `insContrib` | Performance Summary → `Inspection` row → `% Overall Contribution` | p.2 |
| `colPctOfThresh` | Performance Summary → `Collision` row → `% of set Threshold` | p.2 |
| `conPctOfThresh` | Performance Summary → `Conviction` row → `% of set Threshold` | p.2 |
| `insPctOfThresh` | Performance Summary → `Inspection` row → `% of set Threshold` | p.2 |
| `collisionEvents` | `Total # of Collisions` | p.1 |
| `convictionEvents` | `Total # of convictions` | p.1 |
| `oosOverall` | `Overall Out of Service %` | p.2 |
| `oosVehicle` | `Vehicle Out of Service %` | p.2 |
| `oosDriver` | `Driver Out of Service %` | p.2 |
| `trucks` | `# of Commercial Vehicles` | p.1 |
| `onMiles` | `Ontario Kms Travelled` (km — convert to mi if needed) | p.1 |
| `canadaMiles` | `Rest of Canada Kms Travelled` | p.1 |
| `totalMiles` | `Total Kms Travelled` | p.1 |
| `collWithPoints` | `# of Collisions with points` | p.1 |
| `collWithoutPoints` | `# of Collisions not pointed` | p.1 |
| `totalCollisionPoints` | Collision Breakdown → `Total` row → `# of Points` | p.2 |
| `convictionPoints` | Conviction Breakdown → `Total` row → `# of Points` | p.2/p.3 |

### C. Per-Inspection Event (one row per Inspection in `intervention and Event Details`)

Drives the bottom **CVOR Inspections** table on the page. Source: PDF pages 3–17, inside the `Intervention and Event Details` section, **only events where the leading row is an Inspection** (Convictions and Collisions are *not* shown in this list — their counts are captured at the pull level above).

| Frontend column | PDF label |
|---|---|
| Date / Time   | `Inspection Date` + `Start Time` + `End Time` |
| Report        | `CVIR #` |
| Location      | `Location` |
| Driver / Licence | `Driver Name` + `Driver Licence Number` |
| Power Unit / Defects | Vehicle 1 → `Unit Number`; defect list = repeating `Category*` + `Defect` rows |
| Veh Pts       | `Vehicle Points` |
| Dvr Pts       | `Driver Points` |
| CVOR Pts      | `Vehicle Points + Driver Points` (derived) |
| Status        | derived: `Categories OOS > 0` → **OOS**, else `Total All Defects > 0` → **DEFECT**, else **OK** |
| Violation Categories | groupBy(`Category*`) over the defect list — asterisk on category = OOS-eligible |

### Frontend surfaces driven by this data

| Surface | Source category | Notes |
|---|---|---|
| **Top KPI cards** (Overall Rating + Collisions / Convictions / Inspections + zone badge) | B | uses `rating`, `colPctOfThresh`, `conPctOfThresh`, `insPctOfThresh`, plus event counts/points for the subtitle line |
| **OOS Rates strip** (Overall / Vehicle / Driver) | B | `oosOverall`, `oosVehicle`, `oosDriver` |
| **Mileage Summary** (Ontario / Canada / US-Mexico / Total) | B | km values, with KM↔MI toggle in UI |
| **CVOR Rating Comparison** (Level 1-5 cards with insp + OOS counts) | B | `inspectionsByLevel`, `inspectionsOosByLevel` |
| **CVOR Performance History** SVG chart | B | line per metric across all pulls |
| **Hover tooltip on chart** (rating + 3 contribs + 3 OOS + counts/pts) | B | reads the full `CvorPeriodicReport` |
| **Category Contributions chart** | B | line for each of `colContrib` / `conContrib` / `insContrib` |
| **Out-of-Service Rates chart** | B | line for each of `oosOverall` / `oosVehicle` / `oosDriver` |
| **Event Counts & Points chart** (bars + line) | B | `collisionEvents`, `convictionEvents`, `totalCollisionPoints`, `convictionPoints` |
| **Pull-by-Pull table** (14 columns) | B | one row per pull |
| **CVOR Inspection Filters** (All / Clean / OOS / Veh Issues / HOS-Driver / Severe 7+) | C | derived from event log |
| **CVOR Inspections list** (10 columns + Violation Categories sublist) | C | one row per inspection event |
| **Carrier Profile identity card** (CVOR #, Name, Address, Status, Dates, Rating) | A | sticky |

Everything below this section is **appendix** — reference data captured by the PDF but not yet surfaced in the UI.

---

## 🛠 Artefacts (in `scripts/`)

| File | Purpose |
|---|---|
| `scripts/highlight_cvor_pdf.py` | OCR-driven CVOR PDF highlighter. 4 colors × 2 shades (label vs value). Per-rule page scoping. |
| `scripts/cvor_extraction_schema.json` | JSON Schema (draft-07). Source of truth for extractor output. Mirrors all field names used by the React components. |
| `scripts/cvor_pulls_template.csv` | CSV header + sample row, one row per CVOR pull. Wide format. |
| `scripts/cvor_inspection_events_template.csv` | CSV header + sample rows, one row per Inspection event. `defects` column uses `\|` as event separator and `:` as inner-field separator: `Category:Defect:OOS\|next…`. |
| (this file) | Long-form readme + appendix |

### Frontend module map

| Concern | TS file | Symbol |
|---|---|---|
| Per-pull data shape | `src/pages/inspections/inspectionsData.ts` | `CvorPeriodicReport` (type) + `cvorPeriodicReports` (array) |
| Per-pull chart + KPI cards + table | `src/pages/inspections/InspectionsPage.tsx` | search for `cvorPeriodicReports` (~line 5836 onwards) |
| Pull-by-Pull table (14-col) | `src/pages/inspections/InspectionsPage.tsx` | `~line 6833`, `<table className="w-full text-[12px]">` |
| Single-event upload form | `src/pages/inspections/AddInspectionForms.tsx` | `CvorFormData`, `CvorInspectionForm`, `EMPTY_CVOR` |
| Event-log roadside inspections | `src/pages/inspections/inspectionsData.ts` | `inspectionsData` (one entry per CVIR event) |
| Carrier identity card | `src/pages/profile/CarrierProfilePage.tsx` + `carrier-profile.data.ts` | `cvorNumber`, `legalName`, `dbaName`, `dotNumber`, etc. |

---

## 1. Operator Identification

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 CVOR Number | text | **Yes** | p.1 — `CVOR / RIN #` | 9 digits, e.g. `138-903-258`. Strip dashes for storage; render with dashes. |
| 🟢 Legal Name | text | **Yes** | p.1 — `Client Name` | Exact legal entity name. |
| 🟡 Operating Name (DBA) | text | No | p.1 — `Operating As` | Trade name if different. Often blank. |
| 🟡 Business Type | enum | **Yes** | _not in PDF — derive from Legal Name suffix_ | Corporation / Sole Proprietorship / Partnership / LLP / Other. |
| 🟡 Business Number (BN) | text | No | _not in PDF_ | CRA 9-digit business number. |
| 🟡 USDOT Number | text | Conditional | p.1 — `US DOT #` | Required if cross-border. Often blank for ON-only carriers. |
| 🟡 NSC Number | text | Conditional | _not in PDF — separate NSC certificate_ | Required if interprovincial. |
| 🟡 Date of Incorporation | date | No | _not in PDF_ | |

---

## 2. Operator Address

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 Mailing Address | full address | **Yes** | p.1 — `Address` (multi-line block) | Parse street, city, province, postal code from a single block. Format: `<STREET>\n<CITY> <PROV> <POSTAL>`. |
| 🟡 Physical / Terminal Address | full address | No | _not in PDF_ | Only collected via separate form. |
| 🟢 Phone | tel | **Yes** | p.1 — `Phone #` | |
| 🟡 Mobile | tel | No | p.1 — `Mobile #` | New field — often blank. |
| 🟡 Fax | tel | No | p.1 — `Fax #` | |
| 🟢 Email | email | **Yes** | p.1 — `Email` | Primary CVOR correspondence. |

---

## 3. CVOR Status & Issuance

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 Operator Status | enum | **Yes** | p.1 — `CVOR Status` | Values seen: `Registered` / `Cancelled` / `Surrendered` / `Suspended`. |
| 🟢 Original Issue Date | date | **Yes** | p.1 — `Original Issue Date` | First CVOR issued date. Format `YYYY-MM-DD`. |
| 🟢 Effective / Start Date | date | **Yes** | p.1 — `Start Date` | Current registration start date. |
| 🟢 Certificate Expiry Date | date | **Yes** | p.1 — `Expiry Date` | When the current CVOR certificate lapses. |
| 🟡 Last Status Change | date | No | _not in PDF_ | |
| 🟡 Plan Type | enum | No | _not in PDF — implied by NSC presence_ | Federal / Provincial / Both. |
| 🟡 Operating Region | enum | No | _derived from Kms Travelled_ | Ontario only / Interprovincial / International. If `US/Mexico Kms` ≠ `Not Applicable` → International. |
| 🟡 Fleet Size Class | enum | Auto-derived | _derived from `# of Commercial Vehicles`_ | Small (<25) / Medium (25–100) / Large (>100). |

---

## 4. Safety Rating

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 Overall Safety Rating | enum | **Yes** | p.1 — `Carrier Safety Rating` | Values: `Excellent` / `Satisfactory` / `Satisfactory-Unaudited` / `Conditional` / `Unsatisfactory`. Found on same line as `Overall Violation Rate`. |
| 🟢 Overall Violation Rate | percent | **Yes** | p.1 — `Overall Violation Rate` (also p.2 footer of Performance Summary) | Same number, two locations. e.g. `26.22 %`. |
| 🟡 Last Audit Date | date | Conditional | p.2 — `Most Recent Audit` table → `Date` | Often blank. |
| 🟡 Audit Type | text | No | p.2 — `Most Recent Audit` table → `Type` | |
| 🟡 Next Audit Due | date | No | _not in PDF_ | |
| 🟡 Auditor / Inspector Name | text | No | _not in PDF_ | |

---

## 5. Fleet Composition

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 # of Commercial Vehicles | number | **Yes** | p.1 — `# of Commercial Vehicles` | Total power units + trailers (PDF reports a single combined number). |
| 🟡 # of Vehicles Double Shifted | number | No | p.1 — `# of Vehicles Double Shifted` | May read `Not Applicable`. |
| 🟢 Total Drivers | number | **Yes** | p.1 — `# of Drivers` | |
| 🟢 Vehicle Types | multi-select | **Yes** | p.1 — `Type of Commercial Vehicle` | Values: `Truck` / `Bus` / `School Bus` / `Tow` / `Coach` / `Other`. |
| 🟢 TDG (Dangerous Goods) | bool | **Yes** | p.1 — `Dangerous Goods` | `Yes` / `No`. |
| 🟡 Power Units (split) | number | Optional | _not split in PDF — derive_ | If you need this split, infer from Vehicle Type + per-event log vehicle entries. |
| 🟡 Trailers (split) | number | Optional | _not split in PDF — derive_ | |
| 🟡 Buses | number | Conditional | _derived from Vehicle Types_ | |
| 🟡 Commodities Hauled | multi-select | No | _not in PDF — separate disclosure_ | General Freight / Refrigerated / TDG / Passengers / Livestock / Construction / Other. |

---

## 5b. Kilometric Travel (current annual rate)

> **NEW section**, added to capture data on p.1 that drives threshold calculations.

The PDF footnote notes: *"Kilometres shown are the current annual rates most recently reported by the operator for the last 12 months (could include actual and estimated travel)."*

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 Ontario Kms Travelled | number | **Yes** | p.1 — `Ontario Kms Travelled` | Annual rate. e.g. `11,480,094`. |
| 🟢 Rest of Canada Kms Travelled | number | **Yes** | p.1 — `Rest of Canada Kms Travelled` | Annual rate. |
| 🟢 US/Mexico Kms Travelled | number \| `N/A` | **Yes** | p.1 — `US/Mexico Kms Travelled` | May be `Not Applicable`. |
| 🟢 Total Kms Travelled | number | **Yes** | p.1 — `Total Kms Travelled` | Sum of the three above. |

**Historical kms** are on p.18–19 — see [§13 Travel Kilometric History](#13-travel-kilometric-history).

---

## 6. Performance Metrics (24-Month Rolling)

The CVOR Carrier Safety Profile reports collisions, convictions, and inspections over a rolling 24-month window. **Period dates are on every section header**, e.g. `From 2024-01-27 to 2026-01-26 (24 Months)`.

### 6a. Period

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 Period Start | date | **Yes** | p.1 — `Collision Details From <start> to <end>` | First date in any period header. |
| 🟢 Period End | date | **Yes** | p.1 — same line | Second date. |
| 🟢 Period Length | number | **Yes** | same line — `(N Months)` | Always `24` in current MTO format. |

### 6b. Collisions (p.1)

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟢 Collisions With Points | number | `# of Collisions with points` | |
| 🟢 Collisions — Fatal | number | `Fatal` (under Collisions w/ points) | |
| 🟢 Collisions — Personal Injury | number | `Personal Injury` | |
| 🟢 Collisions — Property Damage | number | `Property Damage` | |
| 🟢 Collisions Not Pointed | number | `# of Collisions not pointed` | |
| 🟢 Total Collisions | number | `Total # of Collisions` | |

### 6c. Convictions (p.1)

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟢 Convictions With Points | number | `# of Conviction with points` | |
| 🟢 Convictions — Driver | number | `Driver` (under Convictions) | |
| 🟢 Convictions — Vehicle | number | `Vehicle` | |
| 🟢 Convictions — Load | number | `Load` | |
| 🟢 Convictions — Other | number | `Other` | |
| 🟢 Convictions Not Pointed | number | `# of Conviction not pointed` | |
| 🟢 Total Convictions | number | `Total # of convictions` | |

### 6d. Inspections (p.2)

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟢 Inspections by Level — L1 | number | p.2 — `# of Inspections by level → Level 1` | |
| 🟢 Inspections by Level — L2 | number | p.2 — `Level 2` | |
| 🟢 Inspections by Level — L3 | number | p.2 — `Level 3` | |
| 🟢 Inspections by Level — L4 | number | p.2 — `Level 4` | |
| 🟢 Inspections by Level — L5 | number | p.2 — `Level 5` | |
| 🟢 Inspections OOS — L1 | number | p.2 — `# of Inspections out of service by level → Level 1` | |
| 🟢 Inspections OOS — L2 | number | `Level 2` | |
| 🟢 Inspections OOS — L3 | number | `Level 3` | |
| 🟢 Inspections OOS — L4 | number | `Level 4` | |
| 🟢 Inspections OOS — L5 | number | `Level 5` | |
| 🟢 Total Vehicles Inspected | number | p.2 — `Total number of vehicles inspected` | |

### 6e. Out of Service Rates (p.2 — *Excludes Level 4*)

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟢 Vehicle OOS % | percent | p.2 — `Vehicle Out of Service %` | |
| 🟢 Driver OOS % | percent | p.2 — `Driver Out of Service %` | |
| 🟢 Overall OOS % | percent | p.2 — `Overall Out of Service %` | |

### 6f. R-Factor / Performance Summary (p.2)

The 4-column Performance Summary table is the official R-Factor breakdown.

| Event Type | % of Set Threshold | % Weight | % Overall Contribution | PDF Source |
|---|---|---|---|---|
| 🟢 Collision | 10.35 | 40 | 4.14 | p.2 row `Collision` |
| 🟢 Conviction | 15.95 | 40 | 6.38 | p.2 row `Conviction` |
| 🟢 Inspection | 78.50 | 20 | 15.70 | p.2 row `Inspection` |
| 🟢 Overall Violation Rate % | — | — | 26.22 | p.2 footer `Overall Violation Rate %` |

### 6g. Inspection Threshold Calculation (p.3)

Used to verify or recompute the inspection % of set threshold.

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟢 # CVSA Inspections Conducted | number | p.3 — `# of CVSA inspections conducted` | |
| 🟢 # Vehicles Inspected | number | p.3 — `# of Vehicles inspected` | |
| 🟢 # Drivers Inspected | number | p.3 — `# of Drivers inspected` | |
| 🟢 Total Units Inspected | number | p.3 — `Total units inspected` | |
| 🟢 Driver Points Assigned (D) | number | p.3 — `# of Driver points assigned (D)` | |
| 🟢 Vehicle Points Assigned (V) | number | p.3 — `# of Vehicle points assigned (V)` | |
| 🟢 Total Inspection Points | number | p.3 — `Total inspection points (0.6875 x D+V)` | Formula stated in label. |
| 🟢 Set Inspection Threshold Points | number | p.3 — `# of Set inspection threshold points` | |
| 🟢 Inspection % of Set Threshold | percent | p.3 — `% of set threshold` | Should match the Inspection row in §6f. |

### 6h. Collision & Conviction Breakdown by Kilometre Rate Change (p.2 / p.3)

These two parallel tables explain how the rolling-window threshold is split when the operator's reported km rate changes mid-period.

Each row of each table:

| Field | Type | Notes |
|---|---|---|
| 🟢 Time Period | number | `1`, `2`, `3`, `Total` |
| 🟢 From Date | date | |
| 🟢 To Date | date | |
| 🟢 # of Months | decimal | e.g. `9.87`, `10.83` |
| 🟢 KM Rate Per Month | number | |
| 🟢 # of Events | number | |
| 🟢 # of Points | number | |
| 🟢 Set Threshold Points | number | |
| 🟢 Percent of Set Threshold | percent | |

**PDF source:**
- Collision breakdown — p.2 — `Collision Breakdown by Kilometre Rate Change`
- Conviction breakdown — p.2 (continues on p.3) — `Conviction Breakdown by Kilometre Rate Change`

---

## 7. Insurance

> Not in the CVOR PDF — collected separately via the carrier's Liability Slip / Pink Slip upload.

| Field | Type | Required | Notes |
|---|---|---|---|
| Insurance Carrier | text | **Yes** | |
| Policy Number | text | **Yes** | |
| Liability Limit (CAD) | currency | **Yes** | Min $1M; $2M+ for TDG/passengers. |
| Effective Date | date | **Yes** | |
| Expiry Date | date | **Yes** | Future. |
| Cargo Insurance | currency | No | |
| Liability Slip (Pink Slip) | file | **Yes** | |

---

## 8. Designated Contacts

> Not in the CVOR PDF — collected on the upload form.

| Field | Type | Required | Notes |
|---|---|---|---|
| CVOR Designated Officer | name + title + phone + email | **Yes** | Legal point of contact for MTO. |
| Safety Officer | name + title + phone + email | No | If different. |
| Operations / Dispatch Contact | name + phone + email | No | |

---

## 9. Renewal & Filing

| Field | Type | Required | PDF Source | Notes |
|---|---|---|---|---|
| 🟢 Annual Filing Date | date | Auto | p.1 — derived from `Start Date` (annual cycle) | |
| 🟡 Annual Renewal Fee Status | enum | **Yes** | _not in PDF — track separately_ | Paid / Unpaid / Overdue. |
| 🟡 Last Filing Confirmation # | text | No | p.1 — `Order #` | The PDF order number can be used as a filing reference. |
| 🟢 Next Renewal Due | date | Auto | _derived from `Expiry Date`_ | |

---

## 10. Documents to Upload

| Document | Required | Notes |
|---|---|---|
| 🟢 CVOR Certificate (PDF) | **Yes** | This is what we extract. |
| 🟡 Carrier Safety Profile (Level I) | Recommended | Latest pulled from MTO. |
| 🟡 Most Recent Audit Report | Conditional | If audited. |
| 🟢 Liability Insurance Slip | **Yes** | |
| 🟡 TDG Certificate | Conditional | Required if `Dangerous Goods = Yes`. |
| 🟡 Voluntary Disclosure / Action Plan | No | If responding to MTO. |

---

## 11. Tow Operator (p.3)

> Mostly blank for non-tow carriers but the section MUST be parsed to capture data when present.

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟡 Tow Operator Interventions Period | date range | p.3 — `Summary of Tow Operator Interventions from <start> to <end>` | |
| 🟡 Tow Operator Intervention Type | text | p.3 — `Type` row | |
| 🟡 Tow Operator Date Notified | date | p.3 — `Date Notified` row | |
| 🟡 Tow Sanction Period | date range (60 mo) | p.3 — `Sanction Summary of Tow Operator from <start> to <end>` | |
| 🟡 Tow Sanction Type | text | p.3 — `Sanction Type` row | |
| 🟡 Tow Sanction Start | date | `Start Date` | |
| 🟡 Tow Sanction End | date | `End Date` | |

---

## 12. Intervention & Event Log (p.3 onwards)

This is the long history tail. The PDF section header is `Intervention and Event Details - From <start> To <end>` (p.3). Each event is one of three types: **Inspection**, **Conviction**, **Collision**. Identify by the leading row label.

> **Storage strategy:** push each event as a separate row in `cvor_events` keyed by the `CVIR #`, `Microfilm #`, or `(date, plate, driver)` composite. Link back to the parent CVOR record by `CVOR Number`.

### 12a. Inspection event

| Field | Type | PDF Label | Notes |
|---|---|---|---|
| 🟢 CVIR # | text | `CVIR #` | Primary key for inspection events. e.g. `ONEA01827393`. |
| 🟢 Inspection Date | date | `Inspection Date` | |
| 🟢 Start Time | time | `Start Time` | |
| 🟢 End Time | time | `End Time` | |
| 🟢 Vehicle Points | number | `Vehicle Points` | |
| 🟢 Driver Points | number | `Driver Points` | |
| 🟢 Level of Inspection | number | `Level of Inspection` | 1–5. |
| 🟢 # of Vehicles | number | `# of Vehicles` | |
| 🟢 Co-Driver | bool | `Co-Driver` | `Y`/`N`. |
| 🟢 Impoundment | bool | `Impoundment` | `Y`/`N`. |
| 🟢 Charged | bool | `Charged` | `Y`/`N`. |
| 🟢 Categories OOS | number | `Categories OOS*` | |
| 🟢 Total All Defects | number | `Total All Defects` | |
| 🟢 Location | text | `Location` | TIS / district name. |
| 🟢 Driver Licence # | text | `Driver Licence Number` | |
| 🟢 Driver Jurisdiction | text | `Jurisdiction` (under driver) | |
| 🟢 Driver Name | text | `Driver Name` | |
| 🟢 Vehicle 1 — Make | text | `Vehicle 1 → Vehicle Make` | 4-char code, e.g. `VOLV`, `FRHT`. |
| 🟢 Vehicle 1 — Unit Number | text | `Unit Number` | |
| 🟢 Vehicle 1 — Plate | text | `Vehicle Plate` | |
| 🟢 Vehicle 1 — Jurisdiction | text | `Jurisdiction` (under vehicle) | e.g. `CAON`. |
| 🟢 Vehicle 2 — Make/Unit/Plate/Jurisdiction | text | same labels under `Vehicle 2` | Optional, present when `# of Vehicles >= 2`. |
| 🟢 Defect (n) — Category | text | `Category*` (asterisk = OOS-eligible) | Repeatable; `*` flags OOS categories. |
| 🟢 Defect (n) — Defect | text | `Defect` | |

### 12b. Conviction event

| Field | Type | PDF Label | Notes |
|---|---|---|---|
| 🟢 Event Date | date | `Event Date` | When the offence occurred. |
| 🟢 Event Time | time | `Time` | |
| 🟢 Conviction Date | date | `Conviction Date` | When the court ruled. |
| 🟢 Jurisdiction | text | `Jurisdiction` | e.g. `CAON`, `QC`. |
| 🟢 Points | number | `Points` | Demerit points. |
| 🟡 Ticket # | text | `Ticket #` | |
| 🟢 Charged | enum | `Charged` | `Driver` / `Carrier`. |
| 🟢 Vehicle Plate # | text | `Vehicle Plate #` | |
| 🟢 Vehicle Plate Jurisdiction | text | `Vehicle Plate Jurisdiction` | |
| 🟡 Driver Name | text | `Driver Name` | Often blank for carrier-only convictions. |
| 🟡 Driver Licence # | text | `Driver Licence #` | |
| 🟡 Driver Licence Jurisdiction | text | `Driver Licence Jurisdiction` | |
| 🟡 Offence Location | text | `Offence Location` | |
| 🟢 Microfilm # | text | `Microfilm #` | Stable secondary key. |
| 🟢 Offence | text | `Offence` | e.g. `SPEEDING PHOTO RADAR`. |
| 🟢 CCMTA Equivalency | text | `CCMTA Equivalency` | e.g. `Speeding 11-20 km/hour over posted limit`. |

### 12c. Collision event

| Field | Type | PDF Label | Notes |
|---|---|---|---|
| 🟢 Incident Date | date | `Incident Date` | |
| 🟢 Incident Time | time | `Incident Time` | |
| 🟢 Collision Class | enum | `Collision Class` | `CLASS-INJURY` / `CLASS-PROPERTY DAMAGE ONLY` / `CLASS-FATAL` / etc. |
| 🟢 Collision Jurisdiction | text | `Collision Jurisdiction` | |
| 🟢 Collision Location | text | `Collision Location` | |
| 🟡 Ticket # | text | `Ticket #` | |
| 🟢 Vehicle Plate # | text | `Vehicle Plate #` | |
| 🟢 Vehicle Plate Jurisdiction | text | `Vehicle Plate Jurisdiction` | |
| 🟢 Vehicle Action | text | `Vehicle Action` | e.g. `VEH ACTN-CHANGING LANES`. |
| 🟢 Vehicle Condition | text | `Vehicle Condition` | e.g. `VEH COND-NO APPARENT DEFECT`. |
| 🟢 Driver Name | text | `Driver Name` | |
| 🟢 Driver Licence # | text | `Driver Licence #` | |
| 🟢 Driver Licence Jurisdiction | text | `Driver Licence Jurisdiction` | |
| 🟢 Driver Action | text | `Driver Action` | e.g. `DR ACT-IMPROPER LANE CHANGE`. |
| 🟢 Driver Condition | text | `Driver Condition` | |
| 🟢 Driver Charged | bool | `Driver Charged` | `Y`/`N`. |
| 🟢 Points | number | `Points` | |
| 🟢 Microfilm # | text | `Microfilm #` | |

---

## 13. Travel Kilometric History (p.18–19)

Multi-year historical km record. Goes back to the operator's first registration year. Useful for trend charts.

Each row of the `Travel Kilometric Information` table:

| Field | Type | PDF Column | Notes |
|---|---|---|---|
| 🟢 Period Start | date | `Date From` | |
| 🟢 Period End | date | `To` | |
| 🟢 # of Vehicles | number | `Commercial Vehicles → # of Vehicles` | |
| 🟡 # of Vehicles Double Shifted | number | `Commercial Vehicles → # of Double Shifted` | |
| 🟢 Total Vehicles | number | `Commercial Vehicles → Total` | |
| 🟢 Ontario Kms | number | `Kilometric Travel → Ontario` | |
| 🟢 Rest of Canada Kms | number | `Rest of Canada` | |
| 🟢 US/Mexico Kms | number | `US/Mexico` | `0` when not applicable. |
| 🟢 # of Drivers | number | `# of Drivers` | |
| 🟢 E/A flag | enum | `E/A*` | `E` = Estimated, `A` = Actual (legend on p.19). |

---

## 14. Document Metadata (audit trail)

> Not part of the CVOR data model, but stored on the upload record so we can prove what was extracted from which document.

| Field | Type | PDF Source | Notes |
|---|---|---|---|
| 🟡 Order # | text | p.1 — `Order #` | MTO order number. |
| 🟡 Search Date and Time | datetime | p.1 — `Search Date and Time` | When MTO generated the report. |
| 🟡 Form Version | text | every page footer | e.g. `SR-LV-029A (2021/10)`. |
| 🟡 Page Count | number | every page footer | `PAGE N OF M`. |
| 🟡 Footer Reference URL | url | p.19 — `For further explanation refer to:` | https://www.mto.gov.on.ca/english/trucks/guideline/cvor.shtml |

---

## Validation Rules (summary)

- **CVOR Number** must match `^\d{3}-?\d{3}-?\d{3}$`.
- **Legal Name** must match the name on the uploaded CVOR Certificate (manual review).
- **# of Commercial Vehicles** + **# of Drivers** must each be ≥ 1.
- **Insurance Expiry** must be a future date at upload time.
- **NSC Number** required if `Operating Region` resolves to Interprovincial / International.
- **Dangerous Goods = Yes** ⇒ Liability Limit must be ≥ $2,000,000 and TDG Certificate is required.
- **Safety Rating = Conditional / Unsatisfactory** ⇒ corrective action plan upload is recommended.
- **Total Kms Travelled** should equal `Ontario + Rest of Canada + US/Mexico` (warn if drift > 1%).
- **Performance Summary `Overall Contribution` sum** should equal `Overall Violation Rate %` (warn if drift > 0.1).

---

## Related

- [[CVOR PDF Extraction Map]] — page-by-page walkthrough of `06042001_Ontario.pdf`
- [[Compliance Documents]]
- [[PDF Extraction]]
- [[Safety Compliance Upload]]
