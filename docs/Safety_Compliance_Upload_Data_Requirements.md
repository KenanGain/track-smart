# Safety & Compliance — Upload Data Requirements

For each safety/compliance page, this document describes every field that the
"Add Inspection" upload flow (PDF / DOC) must extract from the uploaded report
so the form can pre-populate the summary cards **and** the detail lists.

Each section lists:
1. **Regular format** — human readable, grouped exactly like the page.
2. **JSON format** — schema the parser should emit.

All dates should be normalized to **ISO-8601** (`YYYY-MM-DD`) in the JSON payload
even if the source report prints them differently (`14-Jul-2021`, `2026 JAN 07`,
`19/08/2022`, etc.). Keep the original string in a `raw` field if you need it
for display.

---

## 1. FMCSA (US SMS) — `activeMainTab === 'sms'`

Source: FMCSA roadside inspection report (Form MCS-63 / MCS-150).

### Regular format

**Inspection Basics**
- Report Number
- Inspection Date
- Level (I–VIII)
- State (US)
- Start Time / End Time
- Location — Street, City, ZIP

**Driver & Vehicle**
- Driver ID, Driver Name, Driver Licence #
- Asset ID, Vehicle Plate, Vehicle Type (Truck / Tractor / Trailer / Bus)

**Defects Found**
- Power Unit Defects (free text)
- Trailer Defects (free text)

**Violations** (repeatable)
- Code (e.g. `393.47A-BSF`, `395.8(e)`)
- BASIC Category (Unsafe Driving · Crash Indicator · Hours-of-service
  Compliance · Vehicle Maintenance · Controlled Substances/Alcohol ·
  Hazardous Materials Compliance · Driver Fitness)
- Description
- Severity (0–8)
- Weight (default 3)
- Points
- OOS (true/false)
- Driver Risk Category (1–3)

**SMS Points Summary** — derived, not read from report
- Driver Points, Vehicle Points, Carrier Points, OOS Count
  (computed from Violations[])

### JSON format

```json
{
  "kind": "fmcsa",
  "basics": {
    "reportNumber": "MIGRAHA00829",
    "inspectionDate": "2025-08-14",
    "level": "Level 2",
    "state": "MI",
    "startTime": "09:15",
    "endTime": "10:40",
    "location": { "street": "I-94 MM178", "city": "Battle Creek", "zip": "49015" }
  },
  "driverVehicle": {
    "driverId": "DRV-2001",
    "driver": "SAMPLE DRIVER",
    "driverLicense": "D1234-5678-9012",
    "assetId": "a1",
    "vehiclePlate": "ABC-123",
    "vehicleType": "Truck"
  },
  "defects": {
    "powerUnit": "Left front brake out of adjustment",
    "trailer": ""
  },
  "violations": [
    {
      "code": "393.47A-BSF",
      "basicCategory": "Vehicle Maintenance",
      "description": "Inadequate brake stopping distance",
      "severity": 4,
      "weight": 3,
      "points": 12,
      "oos": true,
      "driverRiskCategory": 3
    }
  ]
}
```

---

## 2. CVOR (Ontario MTO) — `activeMainTab === 'cvor'`

Source: Ontario MTO CVOR abstract + roadside inspection report.

### Regular format

**Inspection Basics**
- Report Number, Inspection Date, Level (1–5), Province
- Start/End Time, Street, City, Postal Code

**Driver & Vehicle**
- Driver ID, Driver Name, Driver Licence #
- Asset ID, Vehicle Plate, Vehicle Type, VIN

**OOS & Defects**
- Driver OOS (Passed / Failed)
- Vehicle OOS (Passed / Failed)
- Power Unit Defects, Trailer Defects

**Fine**
- Amount, Currency (CAD default)

**Violations** (repeatable)
- Code (HTA / O.Reg / TDG / Criminal Code references, e.g. `HTA s.128(1)`,
  `O.Reg.199/07 s.6(1)`)
- CVOR Category (Vehicle Maintenance · Unsafe Driving · Hours-of-service
  Compliance · Driver Fitness · Hazardous Materials Compliance ·
  Controlled Substances/Alcohol — no "Crash Indicator")
- Description, Severity, Weight, CVOR Points, Driver Risk, OOS

**CVOR Points Summary** — derived
- Driver Points, Vehicle Points, Total CVOR (no carrier tier)

**Attached Documents** (repeatable)
- Document Type (Inspection Report · Driver Statement · VIR · Work Order ·
  Bill of Lading · ELD / Log · Insurance · Permit · Photograph · MTO
  Correspondence · Other)
- Document Number, Issue Date, File

### JSON format

```json
{
  "kind": "cvor",
  "basics": {
    "reportNumber": "ONWINDS16001",
    "inspectionDate": "2025-04-12",
    "level": "Level 2",
    "province": "ON",
    "startTime": "14:20",
    "endTime": "15:55",
    "location": { "street": "Hwy 401 EB", "city": "Windsor", "postal": "N9A 4J6" }
  },
  "driverVehicle": {
    "driverId": "DRV-3001",
    "driver": "", "driverLicense": "",
    "assetId": "a5", "vehiclePlate": "AB 12 345",
    "vehicleType": "Truck Tractor", "vin": "1FUJGHDV9CLBK1234"
  },
  "oos": { "driver": "PASSED", "vehicle": "FAILED" },
  "defects": { "powerUnit": "ABS warning lamp inoperable", "trailer": "" },
  "fine": { "amount": "125.00", "currency": "CAD" },
  "violations": [
    {
      "code": "O.Reg.199/07 s.6(1)",
      "cvorCategory": "Vehicle Maintenance",
      "description": "Defective ABS indicator",
      "severity": 3, "weight": 3, "points": 5,
      "oos": true, "driverRiskCategory": 2
    }
  ],
  "attachedDocs": [
    { "docType": "Inspection Report", "docNumber": "VIR-2025-04-12", "issueDate": "2025-04-12", "file": "vir.pdf" }
  ]
}
```

---

## 3. Alberta NSC — `activeMainTab === 'carrier-profile-ab'`

Source: Alberta NSC Carrier Profile report.

### Regular format

**Carrier Identity**
- Carrier Name, NSC Number, MVID Number
- Operating Status (Federal / Provincial), Fleet Type, Fleet Range

**Latest Pull — Profile Summary**
- Profile Date (e.g. `2026 FEB 23`)
- R-Factor
- Monitoring Stage (Not Monitored / Stage 1–4)
- Current Fleet, Avg Fleet Size

**R-Factor Contributions** — 4 category rows
- Convictions: % and events
- Admin Penalties: % and events
- CVSA Inspections: % and events
- Reportable Collisions: % and events

**Safety Fitness Certificate**
- Certificate Number, Effective, Expiry
- Safety Rating (Excellent · Satisfactory · Satisfactory Unaudited ·
  Conditional · Unsatisfactory)

**Monitoring Snapshot (month-end)**
- As-Of Date, Latest R-Factor, Latest Monitoring Stage, Total AB Carriers

**Conviction Totals**
- Documents, Count, Points

**Event Lists** (all repeatable):

- **Convictions** — Date · Doc # · Docket # · Jurisdiction · Plate · Driver ·
  Offence · Points
- **CVSA Inspections** — Date · Doc # · Jurisdiction · Agency · Plate ·
  Level · Result (Pass / Warning / Out of Service)
- **Reportable Collisions** — Date · Doc # · Plate · Severity (Property
  Damage / Injury / Fatal) · Preventable (Preventable / Non-Preventable /
  Not Evaluated) · Driver · Points
- **Administrative Penalties** — Date · Doc # · Description · Points
- **Historical / Intervention Events** — Date · Type (MONT / CVSA / CONV /
  VIOL / SAFE / COLL) · Description

### JSON format

```json
{
  "kind": "ab",
  "carrier": {
    "carrierName": "VM Motors Inc.",
    "nscNumber": "AB257-4556",
    "mvidNumber": "0895-41544",
    "operatingStatus": "Federal",
    "fleetType": "Truck",
    "fleetRange": "30.0-44.9"
  },
  "latestPull": {
    "profileDate": "2026-02-23",
    "rFactor": 0.062,
    "monitoringStage": "Not Monitored",
    "fleetCurrent": 40,
    "fleetAvg": 40.0
  },
  "contributions": {
    "convictions":         { "pct": 34.6, "events": 5 },
    "adminPenalties":      { "pct": 0.0,  "events": 0 },
    "cvsaInspections":     { "pct": 32.3, "events": 43 },
    "reportableCollisions":{ "pct": 33.1, "events": 6 }
  },
  "certificate": {
    "certNumber": "002449387",
    "certEffective": "2026-01-07",
    "certExpiry":    "2028-12-31",
    "safetyRating": "Satisfactory Unaudited"
  },
  "monitoring": {
    "asOf": "2026-01-31",
    "rFactor": 0.185,
    "stage": "Not on Monitoring",
    "totalCarriersAB": 17704
  },
  "convictionTotals": { "documents": 3, "count": 3, "points": 3 },
  "events": {
    "convictions": [
      { "date": "2025-11-18", "documentNo": "CNV-40231", "docketNo": "DKT-9912",
        "jurisdiction": "AB", "plate": "PLT-001", "driver": "S. Thompson",
        "offence": "HTA s.128(1) Speeding", "points": 3 }
    ],
    "cvsaInspections": [
      { "date": "2026-01-14", "documentNo": "CVSA-12931", "jurisdiction": "AB",
        "agency": "Alberta Sheriff", "plate": "PLT-001", "level": "Level 2",
        "result": "Pass" }
    ],
    "collisions": [
      { "date": "2025-09-07", "documentNo": "COL-8812", "plate": "PLT-002",
        "severity": "Property Damage", "preventable": "Preventable",
        "driver": "M. Lee", "points": 2 }
    ],
    "adminPenalties": [],
    "historical": [
      { "date": "2026-01-31", "type": "MONT", "description": "R-Factor snapshot 0.185" }
    ]
  }
}
```

---

## 4. BC NSC — `activeMainTab === 'carrier-profile-bc'`

Source: BC Passenger Transportation Board / CVSE NSC Carrier Profile.

### Regular format

**Demographics**
- Carrier Name, NSC Number, Jurisdiction (BC)
- Primary Business Type, Mailing Address, Certificate Issue Date
- Extra-Provincial, Premium Carrier, Weigh2GoBC, Preventative Maintenance
- Number of Licensed Vehicles
- Report Run Date, Profile From, Profile To

**Certificate**
- Certificate Status, Safety Rating, Profile Status, Audit Status

**Compliance Review (Latest Pull)**
- As-Of Date, Average Fleet Size
- Contraventions Score + events
- CVSA (Out-of-Service) Score + events
- Accidents Score + events
- Total Score

**Event Lists** — 7 sections total:

1. **Profile Scores** (monthly history) — Month · VehDays (VD) · ActDays (AD) ·
   Avg Fleet · Contraventions Score · CVSA Score · Accident Score · Total Score
2. **Active Fleet** — Regi · Plate · Year · Make · Owner · GVW
3. **Contraventions** — split into 4 sub-lists:
   - Driver Contraventions (Guilty)
   - Carrier Contraventions (Guilty)
   - Pending Driver Contraventions
   - Pending Carrier Contraventions

   Each row: Date · Driver · DL # · Ticket · Plate · Location · Act ·
   Section · Description · Points
4. **CVSA Inspection Results** — Date · Inspection # · Level · Plate ·
   Driver · Defect category · Result (Pass / Warning / Out of Service)
5. **Accident Information** — Date · Time · Report # · Location · Jurisdiction ·
   Driver · Plate · Type (Property / Injury / Fatality) · Fault (At Fault /
   No Fault / Fault Unknown) · Charges (Yes / No) · Points
6. **Audit Summary** — Date · Audit Type (Facility · Compliance Review ·
   Safety · Investigative) · Result · Notes
7. **CVIP Vehicle Inspection History** — Regi · Plate · Vehicle · Date ·
   Type (CVIP / N&O) · Facility · Expiry · Result (Pass · Pass (Repair Same
   Day) · Fail · N&O 1 · N&O 2)

### JSON format

```json
{
  "kind": "bc",
  "demographics": {
    "carrierName": "INERTIA CARRIER LTD.",
    "nscNumber": "BC123456",
    "jurisdiction": "BC",
    "primaryBusinessType": "General Freight",
    "mailingAddress": "…",
    "certificateIssueDate": "2019-05-01",
    "extraProvincial": true,
    "premiumCarrier": false,
    "weigh2GoBC": true,
    "preventativeMaintenance": true,
    "numberOfLicensedVehicles": 78,
    "reportRunDate": "2025-04-17",
    "profileFrom": "2023-04-17",
    "profileTo":   "2025-04-17"
  },
  "certificate": {
    "certificateStatus": "Active",
    "safetyRating": "Satisfactory",
    "profileStatus": "Satisfactory",
    "auditStatus": "Unaudited"
  },
  "complianceReview": {
    "asOfDate": "2025-03-31",
    "averageFleetSize": 77.56,
    "scores": [
      { "category": "Contraventions",        "score": 0.30, "events": 39 },
      { "category": "CVSA (Out of Service)", "score": 0.31, "events": 12 },
      { "category": "Accidents",             "score": 0.00, "events": 11 }
    ],
    "totalScore": 0.61
  },
  "events": {
    "profileScores": [
      { "month": "2025-03", "vd": 28308, "ad": 365, "avg": 77.56,
        "contra": 0.30, "cvsa": 0.31, "acc": 0.00, "total": 0.61 }
    ],
    "activeFleet": [
      { "regi": "10537552", "plate": "69124P", "year": 2006,
        "make": "FREIGHTLIN", "owner": "Inertia", "gvw": 0 }
    ],
    "driverGuilty":   [ /* DriverContraventionRow[] */ ],
    "carrierGuilty":  [ /* CarrierContraventionRow[] */ ],
    "driverPending":  [ /* PendingDriverContraventionRow[] */ ],
    "carrierPending": [ /* PendingCarrierContraventionRow[] */ ],
    "cvsaInspections": [
      { "date": "2025-01-22", "inspectionNo": "EA602200100", "level": "Level 1",
        "plate": "68042P", "driver": "Singh, A.", "defects": "Brakes",
        "result": "Out of Service" }
    ],
    "accidents": [
      { "date": "2023-03-03", "time": "09:48", "report": "6653022",
        "location": "PICKERING, BAYLY ST", "jur": "ON",
        "driverName": "KHAIRA, EKAMPREET SINGH",
        "plate": "76118P", "vehDesc": "",
        "type": "Property", "fault": "At Fault",
        "charges": "No", "pts": 2 }
    ],
    "auditSummary": [],
    "cvip": [
      { "regi": "10537552", "plate": "69124P", "vehicle": "2006 FREIGHTLIN",
        "date": "2022-04-20", "type": "N&O", "facility": "",
        "expiry": "", "result": "N&O 2" }
    ]
  }
}
```

---

## 5. PEI NSC — `activeMainTab === 'carrier-profile-pe'`

Source: PEI NSC Carrier Profile report.

### Regular format

**Carrier Identity**
- Carrier Name, NSC Number, Profile As-Of date

**Latest Pull — Demerit Points**
- Collision Points, Conviction Points, Inspection Points
- Total (auto = sum)

**Fleet**
- Current Active Vehicles, Active Vehicles at Last Assessment

**Certificate & Audit**
- Safety Rating (Satisfactory · Conditional · Unsatisfactory)
- Certificate Status (Active · Expired · Suspended)
- Audit Status (Unaudited · Audited - Compliant · Audited - Action Required ·
  Audited - Non-Compliant)

**Header — Total points** (e.g. `23 / 55 pts · 41.8% of max`)

**Event Lists** — 4 sections:

1. **Collisions** — Date · Severity (Property Damage / Injury / Fatality) ·
   Case # · Fault (At Fault / Not at Fault / Fault Unknown) · Vehicles ·
   Killed · Injured · Points
   - Summary line: "*N collisions | X property damage, Y injury/fatal · Points: P*"
2. **Convictions** — Date · Jurisdiction · Charge · Nat Code · Points
   - Summary line: "*N conviction records | charge, jurisdiction, and points · Points: P*"
3. **Inspections** — Date · CVSA Level (1–5) · Driver · Log (Passed/Warning/
   Failed) · TDG (Passed/Warning/Failed/N/A) · Load Security (Passed/Warning/
   Failed) · Status (P / W / O)
   - Summary line: "*N inspections | X pass, Y warning, Z out of service*"
4. **Audits** — Date · Result (COMPLIANT / CONDITIONAL / NON-COMPLIANT) ·
   Audit Type (Compliance / Facility / Safety / Investigative)
   - Summary line: "*N audits on record for period selected · Latest Result: R*"

### JSON format

```json
{
  "kind": "pe",
  "carrier": {
    "carrierName": "BUSINESS PORTERS INC.",
    "nscNumber": "PE316583",
    "profileAsOf": "2021-07-14"
  },
  "latestPull": {
    "collisionPoints": 8,
    "convictionPoints": 6,
    "inspectionPoints": 9,
    "totalPoints": 23,
    "maxPoints": 55,
    "pctOfMax": 41.8
  },
  "fleet": {
    "currentActiveVehicles": 19,
    "currentActiveVehiclesAtLastAssessment": 19
  },
  "certificate": {
    "safetyRating": "Conditional",
    "certStatus": "Active",
    "auditStatus": "Unaudited"
  },
  "events": {
    "collisions": [
      { "date": "2021-05-12", "severity": "Property Damage",
        "caseNum": "BC2021-0583", "fault": "At Fault",
        "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 }
    ],
    "convictions": [
      { "date": "2021-03-04", "loc": "QC",
        "charge": "SIGNALISATION NON RESPECTÉE",
        "natCode": "317", "pts": 3 }
    ],
    "inspections": [
      { "date": "2022-11-22", "cvsaLevel": 3,
        "log": "Passed", "tdg": "Passed", "loadSecurity": "Passed",
        "driverName": "SINGH", "status": "P" }
    ],
    "audits": [
      { "date": "2021-01-13", "result": "NON-COMPLIANT", "auditType": "Compliance" }
    ]
  }
}
```

---

## 6. Nova Scotia NSC — `activeMainTab === 'carrier-profile-ns'`

Source: NS NSC Carrier Profile report.

### Regular format

**Carrier Identity**
- Carrier Name, NSC Number, Profile As-Of date

**Latest Pull — Indexed Scores**
- Collision Score, Conviction Score, Inspection Score

**Fleet**
- Current Fleet Size, Avg Daily Fleet Size

**Thresholds & Rating**
- Score Level 1 (Moderate)
- Score Level 2 (High)
- Score Level 3 (Critical)
- Safety Rating (Satisfactory · Satisfactory - Unaudited · Conditional ·
  Unsatisfactory)
- Safety Rating Expires

**Event Lists** — 5 sections:

1. **CVSA Inspection** — Date · CVSA # · Jurisdiction · Plates ·
   Driver Master · Result (Passed / Defect Noted / Out-of-Service) ·
   Demerit Pts
   - Summary: "*N inspections | X passed, Y defect noted, Z out-of-service · Demerit Pts: P*"
2. **Audit History** — Date · Audit # · Sequence ·
   Result (Compliant / Conditional / Non-Compliant)
   - Summary: "*N audits on record for period selected · Latest Result: R*"
3. **Convictions** — Offence Date · Conviction Date · Ticket # · Offence ·
   Driver Master · Act/Section · Points
   - Summary: "*N conviction records | offence, ticket, act/section, and points · Demerit Pts: P*"
4. **Collisions** — Date · Severity (PROPERTY DAMAGE / INJURY / FATAL) ·
   Location · Driver Master · Driver Jur · Plate · Plate Jur · Points
   - Summary: "*N collision records | severity, location, driver, vehicle · Demerit Pts: P*"
5. **Traffic Offence Reports** — Offence Date · Plate · Driver Master ·
   Statute · Description
   - Summary: "*N warning tickets | plate, driver, statute, description*"

### JSON format

```json
{
  "kind": "ns",
  "carrier": {
    "carrierName": "MAPLE LEAF FORCE LIMITED",
    "nscNumber": "MAPLE739646000",
    "profileAsOf": "2022-08-19"
  },
  "latestPull": {
    "collisionScore": 0.0000,
    "convictionScore": 6.2510,
    "inspectionScore": 13.4179
  },
  "fleet": {
    "currentFleetSize": 14,
    "avgDailyFleetSize": 14.79
  },
  "thresholds": {
    "scoreLevel1": 39.7531,
    "scoreLevel2": 45.9602,
    "scoreLevel3": 60.1836,
    "safetyRating": "Satisfactory - Unaudited",
    "safetyRatingExpires": null
  },
  "events": {
    "cvsaInspections": [
      { "date": "2022-11-29", "cvsaNumber": "445131-1", "jur": "NB",
        "plates": "PR45273 / MB", "driverMaster": "D4391-00009-90407 / ON",
        "result": "Passed", "demeritPts": 0 }
    ],
    "auditHistory": [
      { "date": "2023-04-28", "auditNum": "34843", "sequence": "1",
        "result": "Compliant" }
    ],
    "convictions": [
      { "offenceDate": "2020-11-19", "convDate": "2021-01-19",
        "ticket": "5488801",
        "offence": "OPER VEH NOT CONFORMING WITH SPECIAL PERMIT",
        "driverMaster": "CZIPP141270003",
        "sectionActReg": "11 9 WDVR", "pts": 3 }
    ],
    "collisions": [
      { "date": "2020-09-04", "severity": "PROPERTY DAMAGE",
        "location": "MONTREAL / QC",
        "driverMaster": "", "driverJur": "ON",
        "plate": "PR42409", "plateJur": "NS", "pts": 0 }
    ],
    "trafficOffences": [
      { "offenceDate": "2023-09-05", "plate": "PR45273",
        "driverMaster": "SINGH120992005", "statute": "CVDH 7 1 A",
        "description": "FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME" }
    ]
  }
}
```

---

## Extraction / validation notes

- **Canonical IDs.** Every row in an `events.*` array should receive a stable
  `id` string in the output payload (the UI relies on it for React keys and
  for add/remove). The extractor can mint these (`ev-<hash>`) — they don't
  need to come from the source report.
- **Enum normalization.** Map synonyms before emitting:
  - Collision severity: `property damage` → `Property Damage`, `injured/fatal`
    → `Injury` or `Fatal` / `Fatality` as the page dictates (PEI uses
    `Fatality`, NS uses uppercase `FATAL`, BC uses `Fatality`).
  - CVSA results: `Pass/Passed` → `Passed` for NS, `Pass` for AB/BC/PEI;
    `OOS`/`Out of Service`/`Out-of-Service` — NS uses the hyphenated form.
  - Fault: `At-Fault/AT FAULT` → `At Fault`; `No Fault` / `Not at Fault`
    depending on page (BC uses `No Fault`, PEI uses `Not at Fault`).
- **Points.** Always emit as numbers (not strings). The UI coerces them,
  but numeric JSON is easier to sum, chart, and validate.
- **Dates.** Emit ISO-8601 in JSON. For display strings that the page
  shows verbatim (e.g. Alberta's `2026 FEB 23`), also emit a `raw` field
  so we don't lose the carrier-format display.
- **Totals.** `totalPoints` / `totalScore` / demerit totals should be
  computed by the extractor from the event arrays rather than read from
  the summary box, so there is exactly one source of truth. If the
  extracted total disagrees with the summary box on the report, flag
  that as a warning in the parser output.
- **Missing sections.** It's fine for an event array to be empty (`[]`) —
  every UI section renders a graceful "no records" state.
