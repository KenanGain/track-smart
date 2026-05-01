---
name: CVOR PDF Extraction Map
description: Page-by-page walkthrough of the Ontario CVOR PDF — what to highlight, what to extract, what to ignore
type: reference
tags: [reference, cvor, ontario, mto, extraction, pdf]
---

# CVOR PDF — Page-by-Page Extraction Map

A page-by-page annotation guide for the Ontario MTO **Commercial Vehicle Operator Record** PDF (form `SR-LV-029A (2021/10)`). Use this together with [[CVOR Upload Reference]].

**Sample document analyzed:** `06042001_Ontario.pdf` — 19 pages — carrier `3580768 CANADA INC.` (CVOR `138-903-258`), generated `2026-02-25`.

> **Why this doc exists:** I can't physically annotate the PDF for you, but every block on every page is listed below with its extraction decision. Use any PDF tool (Adobe, Foxit, PDF-XChange, browser's built-in highlighter) to apply these colors yourself, or use this directly as the parser specification.

---

## Highlight legend

| Color | Meaning | Action |
|---|---|---|
| 🟢 **Green** | Extract — required field | Push to CVOR record. Parser must capture. |
| 🟡 **Yellow** | Extract — optional field | Push if present, accept blank. |
| 🔴 **Red** | Ignore | PDF chrome, MTO metadata, or repeated header. |

---

## Page 1 — Carrier Information + Collisions + Convictions

This is the **densest page**. Most of the operator master record is here.

### 🔴 Header (ignore — appears on every page)

```
Ministry of Transportation       Ministère des Transports         Ontario
Transportation Safety Division   Division de la sécurité ...
```

### 🟡 Document metadata (audit trail only)

| Label | Value (sample) | Notes |
|---|---|---|
| `Search Date and Time` | `2026-02-25 13:25:08` | Store on upload record. |
| `Order #` | `1-6847141418` | Store on upload record (also serves as filing confirmation #). |

### 🔴 Title (ignore)

```
COMMERCIAL VEHICLE OPERATOR RECORD
Carrier Information
```

### 🟢🟡 Carrier Information block

| PDF Label | Sample Value | Color | Maps to |
|---|---|---|---|
| `CVOR / RIN #` | `138-903-258` | 🟢 | §1 CVOR Number |
| `Client Name` | `3580768 CANADA INC.` | 🟢 | §1 Legal Name |
| `Operating As` | (blank) | 🟡 | §1 Operating Name (DBA) |
| `Address` (multi-line) | `6505 VIPOND DRIVE` `MISSISSAUGA ON L5T1J9` | 🟢 | §2 Mailing Address — split into street/city/prov/postal |
| `Phone #` | `(905) 670-6613` | 🟢 | §2 Phone |
| `Mobile #` | (blank) | 🟡 | §2 Mobile |
| `Fax #` | `(905) 670-8192` | 🟡 | §2 Fax |
| `Email` | `jag@dsttransport.ca` | 🟢 | §2 Email |
| `CVOR Status` | `Registered` | 🟢 | §3 Operator Status |
| `Expiry Date` | `2027-07-05` | 🟢 | §3 Certificate Expiry Date |
| `Overall Violation Rate` | `26.22 %` | 🟢 | §4 Overall Violation Rate |
| `Carrier Safety Rating` | `Satisfactory` | 🟢 | §4 Overall Safety Rating |
| `Start Date` | `2001-06-04` | 🟢 | §3 Effective / Start Date |
| `Original Issue Date` | `2001-06-04` | 🟢 | §3 Original Issue Date |
| `Type of Commercial Vehicle` | `Truck` | 🟢 | §5 Vehicle Types |
| `Dangerous Goods` | `Yes` | 🟢 | §5 TDG |
| `Ontario Kms Travelled` | `11,480,094` | 🟢 | §5b Ontario Kms |
| `Rest of Canada Kms Travelled` | `4,579,454` | 🟢 | §5b Rest of Canada Kms |
| `US/Mexico Kms Travelled` | `Not Applicable` | 🟢 | §5b US/Mexico Kms (store `null` for `Not Applicable`) |
| `Total Kms Travelled` | `16,059,548` | 🟢 | §5b Total Kms |
| `# of Commercial Vehicles` | `132` | 🟢 | §5 # of Commercial Vehicles |
| `# of Vehicles Double Shifted` | `Not Applicable` | 🟡 | §5 Double Shifted |
| `# of Drivers` | `158` | 🟢 | §5 Total Drivers |
| `US DOT #` | (blank) | 🟡 | §1 USDOT Number |

### 🔴 Footnote (ignore — informational)

```
*Kilometres shown are the current annual rates most recently reported by the operator
for the last 12 months (could include actual and estimated travel).
```

### 🟢 Collision Details block

Section header: `Collision Details From 2024-01-27 to 2026-01-26 (24 Months)` → extract the **period dates** (§6a).

| PDF Label | Sample | Color | Maps to |
|---|---|---|---|
| `# of Collisions with points` | `8` | 🟢 | §6b Collisions With Points |
| `Fatal` | `0` | 🟢 | §6b Fatal |
| `Personal Injury` | `2` | 🟢 | §6b Personal Injury |
| `Property Damage` | `11` | 🟢 | §6b Property Damage |
| `# of Collisions not pointed` | `5` | 🟢 | §6b Not Pointed |
| `Total # of Collisions` | `13` | 🟢 | §6b Total Collisions |

### 🟢 Conviction Details block

Section header: `Conviction Details From 2024-01-27 to 2026-01-26 (24 Months)`.

| PDF Label | Sample | Color | Maps to |
|---|---|---|---|
| `# of Conviction with points` | `24` | 🟢 | §6c With Points |
| `Driver` | `16` | 🟢 | §6c Driver |
| `Vehicle` | `7` | 🟢 | §6c Vehicle |
| `Load` | `4` | 🟢 | §6c Load |
| `Other` | `2` | 🟢 | §6c Other |
| `# of Conviction not pointed` | `5` | 🟢 | §6c Not Pointed |
| `Total # of convictions` | `29` | 🟢 | §6c Total Convictions |

### 🔴 Footer (ignore)

`SR-LV-029A (2021/10)` ··· `PAGE 1 OF 19`

---

## Page 2 — Inspection Details, OOS Rates, Performance Summary, Audits, KM Breakdown

### 🟢 Inspection Details (24-month rolling)

Section: `Inspection Details From 2024-01-27 to 2026-01-26 (24 Months)`.

| PDF Label | Sample | Color | Maps to |
|---|---|---|---|
| `# of Inspections by level → Level 1` | `34` | 🟢 | §6d L1 |
| `Level 2` | `38` | 🟢 | §6d L2 |
| `Level 3` | `34` | 🟢 | §6d L3 |
| `Level 4` | `43` | 🟢 | §6d L4 |
| `Level 5` | `0` | 🟢 | §6d L5 |
| `# of Inspections out of service by level → Level 1` | `25` | 🟢 | §6d OOS L1 |
| `Level 2` (OOS) | `8` | 🟢 | §6d OOS L2 |
| `Level 3` (OOS) | `0` | 🟢 | §6d OOS L3 |
| `Level 4` (OOS) | `0` | 🟢 | §6d OOS L4 |
| `Level 5` (OOS) | `0` | 🟢 | §6d OOS L5 |
| `Total number of vehicles inspected` | `220` | 🟢 | §6d Total |

### 🟢 Out of Service Rates (Excludes Level 4)

| PDF Label | Sample | Color | Maps to |
|---|---|---|---|
| `Vehicle Out of Service %` | `44.44` | 🟢 | §6e Vehicle OOS % |
| `Driver Out of Service %` | `1.89` | 🟢 | §6e Driver OOS % |
| `Overall Out of Service %` | `31.13` | 🟢 | §6e Overall OOS % |

### 🟢 Performance Summary (R-Factor — the single most important table)

```
Event Type   % of set Threshold   % Weight   % Overall Contribution
Collision    10.35                40         4.14
Conviction   15.95                40         6.38
Inspection   78.50                20         15.70
Overall Violation Rate %                     26.22
```

→ §6f, parse all four columns for each of the three event types + the overall.

### 🟡 Most Recent Audit (often blank)

```
Most Recent Audit
Type   Date
```

→ §4 Last Audit Date / Audit Type. Capture only when populated.

### 🟡 Summary of Interventions (often blank)

```
Summary of Interventions From 2024-02-25 to 2026-02-25 (24 Months)
Type   Date
```

→ Reserve for future MTO interventions table.

### 🟢 Collision Breakdown by Kilometre Rate Change

Multi-row table. Each row → §6h.

```
Time   From         To           # of    KM Rate    # of    # of     Set        Percent of
Period Date         Date         Months  Per Month  Events  Points   Threshold  Set Threshold
1      2025-04-01   2026-01-26   9.87    1,334,629  3       6        79.04      7.59
2      2024-05-07   2025-03-31   10.83   1,355,579  8       10       88.09      11.35
3      2024-01-27   2024-05-06   3.33    1,312,112  2       4        26.22      15.26
Total                            24.00              13      20                  10.35
```

### 🟢 Conviction Breakdown by Kilometre Rate Change

Same shape. Continues onto p.3.

```
1      2025-04-01   2026-01-26   9.87    1,334,629  8       18       181.67     9.91
2      2024-05-07   2025-03-31   10.83   1,355,579  17      42       202.47     20.74
3      2024-01-27   2024-05-06   3.33    1,312,112  4       11       60.26      18.25
Total                            24.00              29      71                  15.95
```

### 🔴 Footer (ignore) — `PAGE 2 OF 19`

---

## Page 3 — Inspection Threshold Calculation, Tow Operator, Event Log starts

### 🔴 Footnote continuation (ignore)

```
*Conviction threshold values are based on actual/estimated rate of kilometres travel per month
reported by the carrier for each time period. Assumed value is used if rate not reported.
```

### 🟢 Inspections Details (totals & threshold formula)

| PDF Label | Sample | Color | Maps to |
|---|---|---|---|
| `# of CVSA inspections conducted` | `149` | 🟢 | §6g |
| `# of Vehicles inspected` | `220` | 🟢 | §6g |
| `# of Drivers inspected` | `149` | 🟢 | §6g |
| `Total units inspected` | `369` | 🟢 | §6g |
| `# of Driver points assigned (D)` | `2` | 🟢 | §6g |
| `# of Vehicle points assigned (V)` | `45` | 🟢 | §6g |
| `Total inspection points (0.6875 x D+V)` | `46.37` | 🟢 | §6g — formula stated in label |
| `# of Set inspection threshold points` | `59.08` | 🟢 | §6g |
| `% of set threshold` | `78.50` | 🟢 | §6g — should match Performance Summary `Inspection` row |

### 🔴 Footnote (ignore)

```
**Inspection threshold value is based on number of drivers and vehicles inspected during
the entire performance period.
```

### 🟡 Tow Operator Certificate Details (blank for non-tow carriers)

```
Tow Operator Certificate Details
Summary of Tow Operator Interventions from 2024-02-25 to 2026-02-25 (24 Months)
Type   Date Notified

Sanction Summary of Tow Operator from 2021-02-26 to 2026-02-25 (60 Months)
Sanction Type   Start Date   End Date
```

→ §11. Capture period dates and any populated rows.

### 🔴 Marker (ignore)

```
End of Summary - History Follows
```

### 🟢 Event log header

```
Intervention and Event Details - From 2025-07-25 To 2026-02-25
```

→ Capture as the **event log period**.

### 🟢 First Inspection event begins (continues across many pages)

```
Inspection
CVIR #              ONEA01827393
Inspection Date     2026-01-13
Start Time          19:20:00         End Time    19:48:00
Vehicle Points      0
Driver Points       0
Level of Inspection 2                # of Vehicles  2
Co-Driver           N                Impoundment    N
Charged             N                Location       Gananoque South TIS
Categories OOS*     0
Total All Defects   0
Driver Licence Number  D92003908640312
Jurisdiction        CAON
Driver Name         DULAY,JASWANT,SINGH
Vehicle 1           Vehicle Make    VOLV
Unit Number         DS291
Vehicle Plate       PB15983
Jurisdiction        CAON
Vehicle 2           Vehicle Make    VANG
```

→ §12a Inspection event. **`CVIR #` is the primary key.**

### 🔴 Footer — `PAGE 3 OF 19`

---

## Pages 4–17 — Continued Event Log

These pages are 🟢 **all extract** but the structure repeats one of three event templates. Detect the event type by the first label in each block:

| First label | Event type | Goes to |
|---|---|---|
| `Inspection` | Inspection event | §12a |
| `Conviction` | Conviction event | §12b |
| `Collision` | Collision event | §12c |

### Pattern for inspection events

Already shown above (§12a). Notes:
- A single inspection can have **multiple `Vehicle 1` / `Vehicle 2`** entries when `# of Vehicles ≥ 2`.
- A single inspection can have **multiple `Category` / `Defect` pairs**, repeated as a list. `Category*` (with asterisk) = OOS-eligible. `Category` (no asterisk) = non-OOS.
- Vehicle make is always a 4-character ISO-style code (`VOLV`, `FRHT`, `INTL`, `MANA`, `MAXA`, `WABA`, `UTIL`, etc.).

### Pattern for conviction events (§12b)

```
Conviction
Event Date          2025-12-04        Time            20:01
Conviction Date     2026-01-12        Jurisdiction    CAON
Points              5
Ticket #            251020091500
Charged             Carrier
Vehicle Plate #     BR35771           Vehicle Plate Jurisdiction   CAON
Driver Name
Driver Licence Jurisdiction
Driver Licence #
Offence Location    @ON1020 DERRY RD. AND TOMKEN R
Microfilm #         065779406
Offence             RD LT-OWNR FAIL STOP
CCMTA Equivalency
```

Notes:
- For **Carrier-charged** convictions, driver fields are blank (the carrier — not a specific driver — is charged).
- For **Driver-charged** convictions, all driver fields are populated.
- `Microfilm #` is the most reliable secondary key.

### Pattern for collision events (§12c)

```
Collision
Incident Date              2026-01-06        Incident Time   13:16
Collision Class            CLASS-INJURY
Collision Jurisdiction     CAON
Collision Location         HALTON HILLS,401
Ticket #
Vehicle Plate #            PB34467           Vehicle Plate Jurisdiction   CAON
Vehicle Action             VEH ACTN-CHANGING LANES
Vehicle Condition          VEH COND-NO APPARENT DEFECT
Driver Name                SIDHU,GURCHARAN,SINGH
Driver Licence #           S41323088841018
Driver Licence Jurisdiction  CAON
Driver Action              DR ACT-IMPROPER LANE CHANGE
Driver Condition           DR COND-NORMAL
Driver Charged             N
Points                     4
Microfilm #                061422178
```

Notes:
- `Collision Class` values seen: `CLASS-INJURY`, `CLASS-PROPERTY DAMAGE ONLY`. Also possible: `CLASS-FATAL`, `CLASS-NON-FATAL INJURY`.
- `Vehicle Action`, `Vehicle Condition`, `Driver Action`, `Driver Condition` come from MTO-controlled enums prefixed with `VEH ACTN-`, `VEH COND-`, `DR ACT-`, `DR COND-`.

### 🔴 Page footers (ignore)

`SR-LV-029A (2021/10)` and `PAGE N OF 19` on every page.

---

## Pages 18–19 — Travel Kilometric History

### 🟢 Travel Kilometric Information table

```
Date                Commercial Vehicles    Kilometric Travel              # of      E/A*
From       To       # of      # of    Total Ontario     Rest of  US/      Drivers
                   Vehicles  Double         Canada    Mexico
                             Shifted
2025-04-01 2026-03-31 132    0       132   11,448,642 4,566,9080         158       E
2024-05-07 2025-03-31 132    0       132   10,494,588 4,186,3320         158       A
... (rows back to 2005-04-01)
```

**Important parser notes:**
- The columns `Rest of Canada` and `US/Mexico` are **printed without a separator** in older rows (e.g. `4,566,9080` is actually `4,566,908` Rest-of-Canada and `0` US/Mexico). Parser needs awareness.
- Modern rows (post-2018) often clearly separate the two columns.
- `E` / `A` flag is the rightmost column. Legend on p.19: `*E: Estimated; A: Actual`.

→ §13. Each row becomes one entry in `cvor_km_history`.

### 🔴 End-of-document marker (ignore — but capture URL as metadata)

```
End of Document
For further explanation refer to:
http://www.mto.gov.on.ca/english/trucks/guideline/cvor.shtml
```

→ Store URL as §14 Footer Reference URL.

### 🔴 Page 19 footer — `PAGE 19 OF 19`

---

## Quick parser checklist

When building / debugging the CVOR PDF parser, verify each of these:

- [ ] CVOR # extracted and matches `^\d{3}-\d{3}-\d{3}$`
- [ ] All four kms (Ontario / RoC / US-Mex / Total) extracted; sum check: `Ontario + RoC + (US-Mex || 0) ≈ Total`
- [ ] Period dates extracted from each `From <a> to <b>` header (collision, conviction, inspection, intervention)
- [ ] Performance Summary 3×3 + overall = 4 rows × 3 numeric columns
- [ ] Threshold formula sanity: `0.6875 × (Driver points + Vehicle points) ≈ Total inspection points` (within rounding)
- [ ] Performance Summary `Inspection % of Set Threshold` matches §6g `% of set threshold`
- [ ] Performance Summary contributions sum: `Collision Contrib + Conviction Contrib + Inspection Contrib ≈ Overall Violation Rate %` (within 0.1)
- [ ] Each event in the log starts with one of `Inspection` / `Conviction` / `Collision`
- [ ] Kilometric history rows with US/Mexico = 0 don't get the column smushed into Rest-of-Canada
- [ ] Total page count from footer matches `PAGE N OF M` of last page

---

## Suggested visual workflow for physically marking the PDF

If you want a **highlighted PDF artifact** to share with stakeholders:

1. Open the PDF in a tool that supports color-coded highlighting (Adobe Acrobat, Foxit, PDF-XChange, or even browser PDF viewers with highlighter extensions).
2. For each page, work top-to-bottom and apply 🟢 / 🟡 / 🔴 per the tables above.
3. Save as `06042001_Ontario.annotated.pdf` next to the original.
4. Do this once per **PDF format version** — when MTO publishes a new template (the form code in the footer changes, e.g. `SR-LV-029A (2021/10)` → `SR-LV-029A (2026/XX)`), redo this map.

---

## Related

- [[CVOR Upload Reference]]
- [[Compliance Documents]]
- [[PDF Extraction]]
- `docs/PDF_Extractor_Spec.md`
- `docs/PDF_Extraction_Schemas.md`
