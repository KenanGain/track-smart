# PDF Extractor — Integration Specification

**Version:** 1.0
**Audience:** PDF extraction service / vendor
**Scope:** 6 Canadian & US commercial-carrier compliance reports

---

## 1. Contract

> Input: **one PDF (or DOC / DOCX)** file containing a carrier compliance
> report from one of the 6 supported jurisdictions.
>
> Output: **one JSON document** conforming exactly to the schema defined in
> this spec, with `kind` set to the jurisdiction code.

```
POST /extract
Content-Type: multipart/form-data

file:  <binary PDF>
hint:  "fmcsa" | "cvor" | "ab" | "bc" | "pe" | "ns"   (optional — if
                                                       the sender already
                                                       knows the kind,
                                                       pass it; otherwise
                                                       detect)

→ 200 OK
Content-Type: application/json

{ "kind": "…", …payload…,
  "warnings": [ "Totals reconciliation: sum(events.collisions.pts)=8 but header says 6" ] }
```

If the PDF is unrecognized or unparseable, return:

```
→ 422 Unprocessable Entity
{ "error": "unrecognized_report",
  "detail": "Could not identify report kind from content" }
```

---

## 2. Supported PDF types

| `kind` | Jurisdiction | Source PDF (title on cover / header text) |
|---|---|---|
| `fmcsa` | US (FMCSA) | "FMCSA Safety Measurement System Carrier Profile" + inspection reports (MCS-63) |
| `cvor`  | Ontario, Canada (MTO) | "CVOR Abstract" / "Commercial Vehicle Operator's Registration" |
| `ab`    | Alberta, Canada | "National Safety Code Carrier Profile" issued by Alberta Transportation |
| `bc`    | British Columbia, Canada | "National Safety Code Carrier Profile" issued by BC CVSE / Passenger Transportation Branch |
| `pe`    | Prince Edward Island, Canada | "NSC Carrier Profile" issued by PEI Highway Safety |
| `ns`    | Nova Scotia, Canada | "NSC Carrier Profile" issued by NS Registry of Motor Vehicles |

Detection hints (for auto-detect when `hint` is not supplied):

- **FMCSA** — contains "DOT Number" and "BASIC" category table.
- **CVOR** — contains "CVOR #" or "Rating (%)".
- **AB**   — contains "R-Factor" and "Monitoring Stage".
- **BC**   — contains "Profile Score" and "Weigh2GoBC" or "BC NSC".
- **PEI**  — contains "PE" NSC number prefix and demerit-point scale.
- **NS**   — contains "Nova Scotia Registry of Motor Vehicles" or
  "Safety Fitness Certificate" with indexed conviction/inspection/collision
  scores.

---

## 3. Global rules (apply to every payload)

### 3.1 Dates

Normalize to **ISO-8601** (`YYYY-MM-DD`). When the source uses a jurisdiction-
specific format, keep the original literal string in a sibling field
ending `Raw`:

| Source example | Normalized | Raw |
|---|---|---|
| `2026 FEB 23` (AB) | `"2026-02-23"` | `"2026 FEB 23"` |
| `14-Jul-2021` (PE) | `"2021-07-14"` | `"14-Jul-2021"` |
| `19/08/2022` (NS)  | `"2022-08-19"` | `"19/08/2022"` |
| `31-Mar-2025` (BC) | `"2025-03-31"` | `"31-Mar-2025"` |

Only carry the `Raw` field for header/carrier-level date fields the UI
displays verbatim — not for every event-row date. The required `Raw`
fields are documented per schema below.

### 3.2 Numbers

All points, scores, percentages, counts → JSON numbers.

- `"pts": 3`  ✅
- `"pts": "3"` ❌
- `"rFactor": 0.062` ✅
- `"rFactor": ".062"` ❌

### 3.3 Record identity

Every row in an `events.*` array MUST include a stable `id` string. The
extractor mints these; they do not need to come from the source PDF.
Format: `"<kind>-<slot>-<index>"` (e.g. `"ab-c-0001"`, `"bc-ac-05"`).

### 3.4 Missing sections

Emit `[]`. Do **NOT** omit the key. Downstream consumers branch on length,
not presence.

### 3.5 Enum spelling — DO NOT cross-map

Each jurisdiction uses its own exact spellings. Preserve them verbatim.
See [§10 Enum Dictionary](#10-enum-dictionary) for the full table.

### 3.6 Totals reconciliation

When the PDF prints a summary total (header badge, cover-page score), the
extractor must also compute the total from the event arrays. If they
disagree, emit a `warnings` entry:

```json
"warnings": [
  "totals_mismatch: events.convictions sum(pts)=6, header reads 9"
]
```

Do not silently "correct" — emit both and let the consumer decide.

---

## 4. `kind: "fmcsa"` — FMCSA SMS

### 4.1 Top-level schema

```jsonc
{
  "kind": "fmcsa",
  "lastUpdated":  <iso datetime | null>,  // snapshot run date
  "lastUploaded": <iso datetime | null>,  // upload timestamp (set by API if unknown)

  "basics":            <BasicRow[]>,        // 7-row BASIC scores table
  "inspectionsByMonth":<MonthRow[]>,        // monthly inspection counts
  "oosDonut":          <OosDonut>,          // out-of-service aggregates
  "topViolations":     <TopViolationRow[]>, // top 6 violation codes
  "levelStats":        <LevelStatRow[]>,    // inspections by level (1–8)
  "stateMetrics":      <StateMetricRow[]>,  // per-state BASIC counts
  "inspections":       <Inspection[]>,      // individual inspection records

  "warnings": <string[]>
}
```

### 4.2 Row types

```jsonc
BasicRow {
  "category": "Unsafe Driving" | "Crash Indicator" |
              "Hours-of-service Compliance" | "Vehicle Maintenance" |
              "Controlled Substances/Alcohol" |
              "Hazardous Materials Compliance" | "Driver Fitness",
  "measure": <number>,          // 0.00–10.00, time-weighted severity
  "percentile": <number>,       // 0–100
  "alertThreshold": <number>,   // 65 for most; 60 for passenger; 80 for HM
  "status": "ALERT" | "OK" | "Low Data"
}

MonthRow {
  "month": "YYYY-MM",
  "withViolations": <int>,
  "withoutViolations": <int>
}

OosDonut {
  "totalViolations": <int>,
  "oos": <int>,     "oosPct":    <number>,
  "nonOos": <int>,  "nonOosPct": <number>
}

TopViolationRow {
  "code": <string>,          // e.g. "393.47A-BSF"
  "description": <string>,
  "count": <int>,
  "points": <int>
}

LevelStatRow {
  "level": "Level 1" | … | "Level 8",
  "count": <int>,
  "oosCount": <int>,
  "oosPct": <number>
}

StateMetricRow {
  "state": "<2-letter state code>",
  "inspections": <int>,
  "violations":  <int>,
  "points":      <int>,
  "basics": { "<BASIC name>": <int>, … }   // per-BASIC violation counts
}

Inspection {
  "id": <string>,                          // report number
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM", "endTime": "HH:MM",
  "state": "<2-letter>",
  "level": "Level 1" | … | "Level 8",
  "location": { "street": <string>, "city": <string>, "province": "<2-letter>", "raw": <string> },
  "driverId": <string>,
  "driver": <string>,
  "driverLicense": <string>,
  "vehiclePlate": <string>,
  "vehicleType": <string>,
  "assetId": <string>,
  "units": [
    { "type": <string>, "make": <string>, "license": <string>, "vin": <string> }
  ],
  "powerUnitDefects": <string>,
  "trailerDefects": <string>,
  "oosSummary": { "driver": "PASSED" | "FAILED", "vehicle": "PASSED" | "FAILED", "total": <int> },
  "smsPoints":  { "driver": <int>, "vehicle": <int>, "carrier": <int> },
  "isClean": <bool>,
  "hasOOS":  <bool>,
  "hasVehicleViolations": <bool>,
  "hasDriverViolations":  <bool>,
  "severityRate": <number | null>,
  "violations": <Violation[]>
}

Violation {
  "code": <string>,           // FMCSA regulation code
  "category": "<one of the 7 BASIC categories>",
  "description": <string>,
  "subDescription": <string>,
  "severity": <int>,          // 0–8
  "weight":   <int>,          // typically 3
  "points":   <int>,
  "oos":      <bool>,
  "driverRiskCategory": <int> // 1–3
}
```

### 4.3 Populated example

See [§11 Worked Examples](#11-worked-examples) → `fmcsa`.

---

## 5. `kind: "cvor"` — CVOR (Ontario MTO)

### 5.1 Top-level schema

```jsonc
{
  "kind": "cvor",
  "lastUpdated":  <iso | null>,
  "lastUploaded": <iso | null>,

  "overall": {
    "rating":    <number>,             // 0–100+
    "status":    "OK" | "WARNING" | "AUDIT" | "SHOW CAUSE" | "SEIZURE",
    "guidance":  <string>,
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 }
  },

  "categories": {
    "collisions":  { "pctOfThresh": <num>, "events": <int>, "points": <int>, "contribution": 40 },
    "convictions": { "pctOfThresh": <num>, "events": <int>, "points": <int>, "contribution": 40 },
    "inspections": { "pctOfThresh": <num>, "events": <int>, "oosRate": <num>, "contribution": 20 }
  },

  "oosRates": {
    "overall": { "current": <num>, "threshold": 30, "enabled": true },
    "vehicle": { "current": <num>, "threshold": 25, "enabled": true },
    "driver":  { "current": <num>, "threshold": 10, "enabled": true }
  },

  "recommendedActions": [ { "severity": "critical"|"warning"|"info", "title": <str>, "description": <str> } ],
  "mileage": { "ontarioMiles": <int>, "canadaMiles": <int>, "usMexicoMiles": <int>, "totalMiles": <int> },
  "levelComparison": <LevelStatRow[]>,   // same shape as FMCSA levels but Levels 1–5
  "periodicReports": <PeriodicReport[]>, // up to 24 monthly snapshots

  "inspections": <CvorInspection[]>,
  "warnings": <string[]>
}
```

### 5.2 Row types

```jsonc
PeriodicReport {
  "periodLabel": <string>,              // e.g. "Jun 23/24"
  "reportDate":  "YYYY-MM-DD",
  "rating":      <number>,
  "colContrib":  <number>, "conContrib":  <number>, "insContrib":  <number>,
  "colPctOfThresh": <number>, "conPctOfThresh": <number>, "insPctOfThresh": <number>,
  "collisionEvents": <int>,   "convictionEvents": <int>,
  "oosOverall": <number>, "oosVehicle": <number>, "oosDriver": <number>,
  "trucks": <int>,
  "onMiles": <int>, "canadaMiles": <int>, "totalMiles": <int>,
  "collWithPoints": <int>, "collWithoutPoints": <int>,
  "totalCollisionPoints": <int>, "convictionPoints": <int>
}

CvorInspection extends FMCSA Inspection (§4.2) with:
  "cvorPoints": { "driver": <int>, "vehicle": <int>, "cvor": <int> }   // replaces smsPoints
  "fine":       { "amount": <string>, "currency": "CAD" | "USD" }
  "attachedDocs": <AttachedDoc[]>

AttachedDoc {
  "id": <string>,
  "docType": "Inspection Report" | "Driver Statement" |
             "Vehicle Inspection Report (VIR)" |
             "Work Order / Repair Invoice" |
             "Bill of Lading" | "Driver Log / ELD Record" |
             "Proof of Insurance" | "Permit / Registration" |
             "Photograph Evidence" | "MTO Correspondence" | "Other",
  "docNumber": <string>,
  "issueDate": "YYYY-MM-DD",
  "fileName":  <string>,
  "fileSize":  <int>
}
```

### 5.3 CVOR violation codes

Preserve source formatting verbatim. Examples:
- `HTA s.128(1)` (Highway Traffic Act)
- `O.Reg.199/07 s.6(1)` (Ontario Regulation)
- `TDG s.7.1(1)` (Transportation of Dangerous Goods)
- `Criminal Code s.320.14` (impaired)

Violation categories (6 allowed — no "Crash Indicator", no "Carrier"):
```
Vehicle Maintenance | Unsafe Driving | Hours-of-service Compliance |
Driver Fitness      | Hazardous Materials Compliance | Controlled Substances/Alcohol
```

---

## 6. `kind: "ab"` — Alberta NSC

### 6.1 Top-level schema

```jsonc
{
  "kind": "ab",

  "performanceCard": {
    "carrierName": <string>,
    "rFactor": <number>,                     // 0.000–1.000+
    "monitoringStage": "Not Monitored" | "Stage 1" | "Stage 2" | "Stage 3" | "Stage 4",
    "fleetRange": <string>,                  // e.g. "30.0-44.9"
    "fleetType":  "Truck" | "Bus" | "Truck & Bus",
    "stageThresholds": [ { "stage": 1|2|3|4, "low": <num>, "high": <num|null> } ],
    "statusMessage": <string>
  },

  "contributions": {
    "convictions":          { "pct": <num>, "events": <int> },
    "adminPenalties":       { "pct": <num>, "events": <int> },
    "cvsaInspections":      { "pct": <num>, "events": <int> },
    "reportableCollisions": { "pct": <num>, "events": <int> }
  },

  "fleetMonitoring": {
    "fleetAvg": <number>, "fleetCurrent": <int>,
    "monitoringAsOf": "YYYY-MM-DD", "monitoringAsOfRaw": <string>,
    "monitoringRFactor": <number>,
    "monitoringStage":   <string>,
    "totalCarriersAB":   <int>
  },

  "convictionTotals":   { "documents": <int>, "count": <int>, "points": <int> },
  "carrierIdentifiers": { "nscNumber": <string>, "mvidNumber": <string>,
                          "operatingStatus": "Federal" | "Provincial" },

  "certificate": {
    "certNumber": <string>,
    "certEffective": "YYYY-MM-DD", "certEffectiveRaw": <string>,
    "certExpiry":    "YYYY-MM-DD", "certExpiryRaw":    <string>,
    "safetyRating":  "Excellent" | "Satisfactory" | "Satisfactory Unaudited" |
                     "Conditional" | "Unsatisfactory"
  },

  "events": {
    "convictions":            <AbConviction[]>,
    "cvsaInspections":        <AbCvsa[]>,
    "collisions":             <AbCollision[]>,
    "adminPenalties":         <AbAdminPenalty[]>,
    "monitoring":             <AbMonitoringSnapshot[]>,
    "facilityLicences":       <AbFacilityLicence[]>,
    "safetyRatingHistory":    <AbSafetyRating[]>,
    "operatingStatusHistory": <AbOperatingStatus[]>,
    "historicalEvents":       <AbHistoricalEvent[]>
  },

  "warnings": <string[]>
}
```

### 6.2 Row types

```jsonc
AbConviction {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD", "time": "HH:MM",
  "documentNo": <string>, "docketNo": <string>,
  "jurisdiction": "<2-letter>",
  "dateEntered": "YYYY-MM-DD",
  "issuingAgency": <string>,
  "location": <string>,
  "driver": <string>, "vehicle": <string>,
  "plate": <string>, "commodity": <string>,
  "actSection": <string>, "actDesc": <string>,
  "ccmtaCode": <string>,
  "convVehicle": <string>, "convDate": "YYYY-MM-DD",
  "activePts": <int>
}

AbCvsa {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD", "time": "HH:MM",
  "documentNo": <string>,
  "jurisdiction": "<2-letter>",
  "level": "Level 1" | … | "Level 8",
  "result": "Pass" | "Warning" | "Out of Service",
  "dateEntered": "YYYY-MM-DD",
  "agency": <string>,
  "location": <string>,
  "driver": <string>,
  "vehicles": [
    { "type": "P" | "ST" | "T" | "B" | <string>,
      "plate": <string>, "jurisdiction": "<2-letter>",
      "vin": <string>, "year": <int>, "make": <string>,
      "cvsaDecal": <string> }
  ],
  "defects": [
    { "code": <string>, "label": <string>,
      "oos": <int>, "req": <int>,
      "total": <int>, "pct": <number> }
  ]
}

AbCollision {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD", "time": "HH:MM",
  "documentNo": <string>, "jurisdiction": "<2-letter>",
  "plate": <string>, "plateJur": "<2-letter>",
  "status": <string>,
  "preventable": "Preventable" | "Non-Preventable" | "Not Evaluated",
  "severity": "Property Damage" | "Injury" | "Fatal",
  "points": <int>,
  "driver": <string>, "location": <string>,
  "vehicle": <string>, "vin": <string>,
  "activePts": <int>
}

AbAdminPenalty {
  "id": <string>,
  "date": "YYYY-MM-DD",
  "documentNo": <string>,
  "description": <string>,
  "points": <int>
}

AbMonitoringSnapshot {
  "id": <string>,
  "date": "YYYY-MM-DD",
  "type": "MONT",
  "trkPct": <number>, "busPct": <number>,
  "avg": <number>, "cur": <number>, "score": <number>,
  "convPct": <number>, "inspPct": <number>, "collPct": <number>,
  "stage": "Not on Monitoring" | "Stage 1" | … | "Stage 4"
}

AbFacilityLicence {
  "id": <string>,
  "licenceNumber": <string>,
  "effective": "YYYY-MM-DD",
  "expiry":    "YYYY-MM-DD",
  "status":    <string>
}

AbSafetyRating {
  "seq": <int>,
  "effective": "YYYY-MM-DD",
  "expiry":    "YYYY-MM-DD",
  "description": <string>,      // e.g. "Satisfactory Unaudited"
  "comments":    <string>
}

AbOperatingStatus {
  "seq": <int>,
  "effective": "YYYY-MM-DD",
  "inactive":  "YYYY-MM-DD" | null,
  "description": "Federal" | "Provincial"
}

AbHistoricalEvent {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "type": "MONT" | "CVSA" | "CONV" | "VIOL" | "SAFE" | "COLL",
  "jurisdiction": "<2-letter>",
  "description":  <string>
}
```

---

## 7. `kind: "bc"` — BC NSC

### 7.1 Top-level schema

```jsonc
{
  "kind": "bc",

  "demographics": {
    "carrierName": <string>, "nscNumber": <string>, "jurisdiction": "BC",
    "primaryBusinessType": <string>,
    "mailingAddress": <string>,
    "certificateIssueDate": "YYYY-MM-DD",
    "extraProvincial": <bool>, "premiumCarrier": <bool>,
    "weigh2GoBC": <bool>, "preventativeMaintenance": <bool>,
    "numberOfLicensedVehicles": <int>,
    "reportRunDate": "YYYY-MM-DD",
    "profileFrom": "YYYY-MM-DD", "profileTo": "YYYY-MM-DD"
  },

  "certificate": {
    "certificateStatus": "Active" | "Expired" | "Suspended",
    "safetyRating":      "Satisfactory" | "Conditional" | "Unsatisfactory",
    "profileStatus":     "Satisfactory" | "Conditional" | "Unsatisfactory",
    "auditStatus":       "Unaudited" | "Audited"
  },

  "complianceReview": {
    "asOfDate": "YYYY-MM-DD",
    "averageFleetSize": <number>,
    "scores": [
      { "category": "Contraventions",        "score": <number>, "events": <int> },
      { "category": "CVSA (Out of Service)", "score": <number>, "events": <int> },
      { "category": "Accidents",             "score": <number>, "events": <int> }
    ],
    "totalScore": <number>
  },

  "thresholds": [
    { "status": "Satisfactory" | "Conditional" | "Unsatisfactory",
      "contraventions": <string>, "cvsa": <string>,
      "accidents":      <string>, "total": <string> }
  ],

  "events": {
    "profileScores":   <BcProfileScore[]>,     // 14 monthly pulls
    "activeFleet":     <BcFleetRow[]>,
    "driverGuilty":    <BcContravention[]>,
    "carrierGuilty":   <BcContravention[]>,
    "driverPending":   <BcContravention[]>,
    "carrierPending":  <BcContravention[]>,
    "cvsaInspections": <BcCvsa[]>,
    "accidents":       <BcAccident[]>,
    "auditSummary":    <BcAudit[]>,
    "cvip":            <BcCvip[]>
  },

  "warnings": <string[]>
}
```

### 7.2 Row types

```jsonc
BcProfileScore {
  "id": <string>, "month": "YYYY-MM",
  "vd": <int>, "ad": <int>, "avg": <number>,
  "contra": <number>, "cvsa": <number>, "acc": <number>, "total": <number>
}

BcFleetRow {
  "id": <string>,
  "regi": <string>, "plate": <string>,
  "year": <int>, "make": <string>,
  "owner": <string>, "gvw": <int>
}

BcContravention {
  "id": <string>,
  "driverName": <string>, "dl": <string>, "dlJur": "<2-letter>",
  "date": "YYYY-MM-DD", "time": "HH:MM",
  "ticket": <string>,
  "plate": <string>, "plateJur": "<2-letter>",
  "location": <string>, "juris": "<2-letter>",
  "dispDate": "YYYY-MM-DD" | "",           // empty for Pending lists
  "act": <string>, "section": <string>,
  "desc": <string>, "equiv": <string>,
  "pts": <int>
}

BcCvsa {
  "id": <string>,
  "date": "YYYY-MM-DD",
  "inspectionNo": <string>,
  "level": "Level 1" | … | "Level 5",
  "plate": <string>, "driver": <string>,
  "defects": <string>,                     // defect category label
  "result": "Pass" | "Warning" | "Out of Service"
}

BcAccident {
  "id": <string>,
  "date": "YYYY-MM-DD", "time": "HH:MM",
  "report": <string>, "location": <string>, "jur": "<2-letter>",
  "driverName": <string>, "dl": <string>, "dlJur": "<2-letter>",
  "plate": <string>, "plateJur": "<2-letter>", "regi": <string>,
  "vehDesc": <string>,
  "type":    "Property" | "Injury" | "Fatality",
  "fault":   "At Fault" | "No Fault" | "Fault Unknown",
  "charges": "Yes" | "No",
  "pts": <int>
}

BcAudit {
  "id": <string>,
  "date": "YYYY-MM-DD",
  "auditType": "Facility" | "Compliance Review" | "Safety" | "Investigative",
  "result":    "Satisfactory" | "Conditional" | "Unsatisfactory",
  "notes": <string>
}

BcCvip {
  "id": <string>,
  "regi": <string>, "plate": <string>, "vehicle": <string>,
  "date": "YYYY-MM-DD",
  "type": "CVIP" | "N&O",
  "facility": <string>, "confirmation": <string>, "decal": <string>,
  "expiry": "YYYY-MM-DD" | "",
  "result": "Pass" | "Pass (Repair Same Day)" | "Fail" | "N&O 1" | "N&O 2"
}
```

---

## 8. `kind: "pe"` — PEI NSC

### 8.1 Top-level schema

```jsonc
{
  "kind": "pe",

  "carrier":    { "carrierName": <string>, "nscNumber": <string>,
                  "profileAsOf": "YYYY-MM-DD", "jurisdiction": "Prince Edward Island" },
  "latestPull": { "collisionPoints": <int>, "convictionPoints": <int>,
                  "inspectionPoints": <int>, "totalPoints": <int>,
                  "maxPoints": <int>,        "pctOfMax": <number> },
  "fleet":      { "currentActiveVehicles": <int>, "currentActiveVehiclesAtLastAssessment": <int> },
  "certificate":{ "safetyRating": "Satisfactory" | "Conditional" | "Unsatisfactory",
                  "certStatus":   "Active" | "Expired" | "Suspended",
                  "auditStatus":  "Unaudited" | "Audited - Compliant" |
                                  "Audited - Action Required" | "Audited - Non-Compliant" },

  "events": {
    "collisions":  <PeCollision[]>,
    "convictions": <PeConviction[]>,
    "inspections": <PeInspection[]>,
    "audits":      <PeAudit[]>
  },

  "warnings": <string[]>
}
```

`maxPoints` is determined by fleet size (Schedule 3 lookup — the extractor
should emit whatever the header prints; do NOT compute it).

### 8.2 Row types

```jsonc
PeCollision {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "severity": "Property Damage" | "Injury" | "Fatality",
  "caseNum":  <string>,
  "fault":    "At Fault" | "Not at Fault" | "Fault Unknown",
  "vehicles": <int>, "killed": <int>, "injured": <int>,
  "pts": <int>
}

PeConviction {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "loc":  "<2-letter jurisdiction>",
  "charge": <string>, "natCode": <string>,
  "pts": <int>
}

PeInspection {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "cvsaLevel": 1 | 2 | 3 | 4 | 5,
  "log":          "Passed" | "Warning" | "Failed",
  "tdg":          "Passed" | "Warning" | "Failed" | "N/A",
  "loadSecurity": "Passed" | "Warning" | "Failed",
  "driverName": <string>,
  "status": "P" | "W" | "O"          // Pass / Warning / Out-of-service
}

PeAudit {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "result":    "COMPLIANT" | "CONDITIONAL" | "NON-COMPLIANT",
  "auditType": "Compliance" | "Facility" | "Safety" | "Investigative"
}
```

---

## 9. `kind: "ns"` — Nova Scotia NSC

### 9.1 Top-level schema

```jsonc
{
  "kind": "ns",

  "carrier":    { "carrierName": <string>, "nscNumber": <string>, "profileAsOf": "YYYY-MM-DD" },
  "latestPull": { "collisionScore": <number>, "convictionScore": <number>, "inspectionScore": <number> },
  "fleet":      { "currentFleetSize": <int>, "avgDailyFleetSize": <number> },
  "thresholds": { "scoreLevel1": <number>, "scoreLevel2": <number>, "scoreLevel3": <number>,
                  "safetyRating": "Satisfactory" | "Satisfactory - Unaudited" |
                                  "Conditional" | "Unsatisfactory",
                  "safetyRatingExpires": "YYYY-MM-DD" | null },

  "events": {
    "cvsaInspections": <NsCvsa[]>,
    "auditHistory":    <NsAudit[]>,
    "convictions":     <NsConviction[]>,
    "collisions":      <NsCollision[]>,
    "trafficOffences": <NsTrafficOffence[]>
  },

  "warnings": <string[]>
}
```

Scores are emitted to 4 decimal places (e.g. `6.2510`). Do not round.

### 9.2 Row types

```jsonc
NsCvsa {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "cvsaNumber": <string>,
  "jur": "<2-letter>",
  "plates": <string>,                       // "<plate> / <jur>" format verbatim
  "driverMaster": <string>,                 // "<master #> / <jur>" format verbatim
  "result": "Passed" | "Defect Noted" | "Out-of-Service",
  "demeritPts": <int>
}

NsAudit {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "auditNum": <string>, "sequence": <string>,
  "result": "Compliant" | "Conditional" | "Non-Compliant"
}

NsConviction {
  "id": <string>, "seq": <int>,
  "offenceDate": "YYYY-MM-DD",
  "convDate":    "YYYY-MM-DD",
  "ticket": <string>,
  "offence": <string>,
  "driverMaster": <string>,
  "sectionActReg": <string>,
  "pts": <int>
}

NsCollision {
  "id": <string>, "seq": <int>,
  "date": "YYYY-MM-DD",
  "severity": "PROPERTY DAMAGE" | "INJURY" | "FATAL",
  "location": <string>,
  "driverMaster": <string>, "driverJur": "<2-letter>",
  "plate": <string>,        "plateJur":  "<2-letter>",
  "pts": <int>
}

NsTrafficOffence {
  "id": <string>, "seq": <int>,
  "offenceDate": "YYYY-MM-DD",
  "plate": <string>,
  "driverMaster": <string>,
  "statute": <string>,                      // e.g. "CVDH 7 1 A", "MVA 20 2"
  "description": <string>
}
```

---

## 10. Enum Dictionary

**Do NOT reuse strings across jurisdictions.** The UI compares strings
literally. Each row below shows the exact spelling required by the target
page.

| Concept | `fmcsa` | `cvor` | `ab` | `bc` | `pe` | `ns` |
|---|---|---|---|---|---|---|
| Severity (fatality)  | n/a | n/a | `"Fatal"` | `"Fatality"` | `"Fatality"` | `"FATAL"` |
| Severity (injury)    | n/a | n/a | `"Injury"` | `"Injury"` | `"Injury"` | `"INJURY"` |
| Severity (property)  | n/a | n/a | `"Property Damage"` | `"Property"` | `"Property Damage"` | `"PROPERTY DAMAGE"` |
| OOS — CVSA result    | n/a | n/a | `"Out of Service"` | `"Out of Service"` | `"O"` (status) | `"Out-of-Service"` |
| CVSA pass            | n/a | n/a | `"Pass"` | `"Pass"` | `"P"` (status) | `"Passed"` |
| CVSA warning         | n/a | n/a | `"Warning"` | `"Warning"` | `"W"` (status) | `"Defect Noted"` |
| OOS — driver/vehicle | `"FAILED"`/`"PASSED"` | `"FAILED"`/`"PASSED"` | n/a | n/a | n/a | n/a |
| Fault — at-fault     | n/a | n/a | n/a | `"At Fault"` | `"At Fault"` | n/a |
| Fault — not at fault | n/a | n/a | n/a | `"No Fault"` | `"Not at Fault"` | n/a |
| Fault — unknown      | n/a | n/a | n/a | `"Fault Unknown"` | `"Fault Unknown"` | n/a |
| Audit result — pass  | n/a | n/a | n/a | `"Satisfactory"` | `"COMPLIANT"` | `"Compliant"` |
| Audit result — cond. | n/a | n/a | n/a | `"Conditional"` | `"CONDITIONAL"` | `"Conditional"` |
| Audit result — fail  | n/a | n/a | n/a | `"Unsatisfactory"` | `"NON-COMPLIANT"` | `"Non-Compliant"` |
| Monitoring stage     | n/a | n/a | `"Not Monitored"` `"Stage 1"…"Stage 4"` | n/a | n/a | n/a |

---

## 11. Worked Examples

### 11.1 FMCSA

<details>
<summary>Click to expand full populated payload</summary>

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
    { "month": "2025-09", "withViolations": 14, "withoutViolations": 33 }
  ],
  "oosDonut": { "totalViolations": 170, "oos": 14, "oosPct": 8.2, "nonOos": 156, "nonOosPct": 91.8 },
  "topViolations": [
    { "code": "393.47A-BSF", "description": "Inadequate brake stopping distance", "count": 18, "points": 216 },
    { "code": "395.8(e)",    "description": "False report of duty status",        "count": 11, "points": 165 }
  ],
  "levelStats": [
    { "level": "Level 1", "count": 42, "oosCount": 7, "oosPct": 16.7 },
    { "level": "Level 2", "count": 68, "oosCount": 4, "oosPct":  5.9 }
  ],
  "stateMetrics": [
    { "state": "MI", "inspections": 42, "violations": 28, "points": 187,
      "basics": { "Unsafe Driving": 5, "Vehicle Maintenance": 11, "Hours-of-service Compliance": 6, "Driver Fitness": 4, "Crash Indicator": 2 } }
  ],
  "inspections": [
    { "id": "MIGRAHA00829", "date": "2025-08-14", "startTime": "09:15", "endTime": "10:40",
      "state": "MI", "level": "Level 2",
      "location": { "street": "I-94 MM178", "city": "Battle Creek", "province": "MI", "raw": "BATTLE CREEK, MI" },
      "driverId": "DRV-2001", "driver": "RANDEEP SINGH", "driverLicense": "D1234-5678-9012",
      "vehiclePlate": "ABC-123", "vehicleType": "Truck Tractor", "assetId": "a1",
      "units": [ { "type": "Truck Tractor", "make": "Freightliner", "license": "ABC-123", "vin": "1FUJGHDV9CLBK1234" } ],
      "powerUnitDefects": "Left front brake out of adjustment", "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "FAILED", "total": 1 },
      "smsPoints":  { "driver": 0, "vehicle": 12, "carrier": 0 },
      "isClean": false, "hasOOS": true, "hasVehicleViolations": true, "hasDriverViolations": false,
      "severityRate": 4.0,
      "violations": [
        { "code": "393.47A-BSF", "category": "Vehicle Maintenance",
          "description": "Inadequate brake stopping distance", "subDescription": "Air Brakes",
          "severity": 4, "weight": 3, "points": 12, "oos": true, "driverRiskCategory": 3 }
      ]
    }
  ],
  "warnings": []
}
```

</details>

### 11.2 CVOR

<details>
<summary>Click to expand full populated payload</summary>

```json
{
  "kind": "cvor",
  "lastUpdated":  "2025-04-17T16:00:00Z",
  "lastUploaded": "2025-04-15T10:20:00Z",
  "overall": { "rating": 42.7, "status": "WARNING",
    "guidance": "7.3% below Audit threshold",
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 } },
  "categories": {
    "collisions":  { "pctOfThresh": 18.3, "events": 5,  "points": 8, "contribution": 40 },
    "convictions": { "pctOfThresh": 22.1, "events": 7,  "points": 9, "contribution": 40 },
    "inspections": { "pctOfThresh": 11.5, "events": 42, "oosRate": 8.1, "contribution": 20 }
  },
  "oosRates": {
    "overall": { "current": 8.1, "threshold": 30, "enabled": true },
    "vehicle": { "current": 6.4, "threshold": 25, "enabled": true },
    "driver":  { "current": 1.7, "threshold": 10, "enabled": true }
  },
  "recommendedActions": [
    { "severity": "warning", "title": "CVOR rating in Warning band",     "description": "Submit corrective action plan within 30 days." }
  ],
  "mileage": { "ontarioMiles": 1200000, "canadaMiles": 2800000, "usMexicoMiles": 1400000, "totalMiles": 5400000 },
  "levelComparison": [
    { "level": "Level 1", "count": 11, "oosCount": 3, "oosPct": 27.3 },
    { "level": "Level 2", "count": 18, "oosCount": 1, "oosPct":  5.6 }
  ],
  "periodicReports": [
    { "periodLabel": "Jun 23/24", "reportDate": "2024-06-30", "rating": 42.7,
      "colContrib": 18.3, "conContrib": 22.1, "insContrib": 2.3,
      "colPctOfThresh": 18.3, "conPctOfThresh": 22.1, "insPctOfThresh": 11.5,
      "collisionEvents": 5, "convictionEvents": 7,
      "oosOverall": 8.1, "oosVehicle": 6.4, "oosDriver": 1.7,
      "trucks": 42, "onMiles": 1200000, "canadaMiles": 2800000, "totalMiles": 5400000,
      "collWithPoints": 3, "collWithoutPoints": 2,
      "totalCollisionPoints": 8, "convictionPoints": 9 }
  ],
  "inspections": [
    { "id": "ONWINDS16001", "date": "2025-04-12", "startTime": "14:20", "endTime": "15:55",
      "state": "ON", "level": "Level 2",
      "location": { "street": "Hwy 401 EB", "city": "Windsor", "province": "ON", "raw": "WINDSOR, ON" },
      "driverId": "DRV-3001", "driver": "NAVJOT SINGH", "driverLicense": "S1234-56789-01234",
      "vehiclePlate": "AB 12 345", "vehicleType": "Truck Tractor", "assetId": "a5",
      "units": [{ "type": "Truck Tractor", "make": "Volvo", "license": "AB 12 345", "vin": "1FUJGHDV9CLBK1234" }],
      "powerUnitDefects": "ABS warning lamp inoperable", "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "FAILED", "total": 1 },
      "cvorPoints": { "driver": 0, "vehicle": 5, "cvor": 5 },
      "fine": { "amount": "125.00", "currency": "CAD" },
      "violations": [
        { "code": "O.Reg.199/07 s.6(1)", "category": "Vehicle Maintenance",
          "description": "Defective ABS indicator", "subDescription": "Brakes",
          "severity": 3, "weight": 3, "points": 5, "oos": true, "driverRiskCategory": 2 }
      ],
      "attachedDocs": [
        { "id": "d-0001", "docType": "Inspection Report", "docNumber": "VIR-2025-04-12",
          "issueDate": "2025-04-12", "fileName": "vir.pdf", "fileSize": 234120 }
      ]
    }
  ],
  "warnings": []
}
```

</details>

### 11.3 Alberta NSC

<details>
<summary>Click to expand full populated payload</summary>

```json
{
  "kind": "ab",
  "performanceCard": {
    "carrierName": "VM Motors Inc.",
    "rFactor": 0.062, "monitoringStage": "Not Monitored",
    "fleetRange": "30.0-44.9", "fleetType": "Truck",
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
    "fleetAvg": 40.0, "fleetCurrent": 40,
    "monitoringAsOf": "2026-01-31", "monitoringAsOfRaw": "2026 JAN 31",
    "monitoringRFactor": 0.185, "monitoringStage": "Not on Monitoring",
    "totalCarriersAB": 17704
  },
  "convictionTotals":   { "documents": 3, "count": 3, "points": 3 },
  "carrierIdentifiers": { "nscNumber": "AB257-4556", "mvidNumber": "0895-41544", "operatingStatus": "Federal" },
  "certificate": {
    "certNumber": "002449387",
    "certEffective": "2026-01-07", "certEffectiveRaw": "2026 JAN 07",
    "certExpiry":    "2028-12-31", "certExpiryRaw":    "2028 DEC 31",
    "safetyRating":  "Satisfactory Unaudited"
  },
  "events": {
    "convictions": [
      { "id": "ab-c-0001", "seq": 1, "date": "2025-11-18", "time": "14:02",
        "documentNo": "CNV-40231", "docketNo": "DKT-9912",
        "jurisdiction": "AB", "dateEntered": "2025-12-02", "issuingAgency": "Alberta Sheriff",
        "location": "Calgary, AB",
        "driver": "S. Thompson", "vehicle": "2019 Peterbilt",
        "plate": "PLT-001", "commodity": "General freight",
        "actSection": "HTA s.128(1)", "actDesc": "Speeding",
        "ccmtaCode": "0001", "convVehicle": "PLT-001",
        "convDate": "2025-12-15", "activePts": 3 }
    ],
    "cvsaInspections": [
      { "id": "ab-i-0001", "seq": 1, "date": "2026-01-14", "time": "11:20",
        "documentNo": "CVSA-12931", "jurisdiction": "AB",
        "level": "Level 2", "result": "Pass",
        "dateEntered": "2026-01-16", "agency": "Alberta Sheriff",
        "location": "Leduc, AB", "driver": "S. Thompson",
        "vehicles": [ { "type": "P", "plate": "PLT-001", "jurisdiction": "AB",
          "vin": "1XKYD49X8DJ309234", "year": 2019, "make": "Peterbilt", "cvsaDecal": "DE-4421" } ],
        "defects": [] }
    ],
    "collisions": [
      { "id": "ab-col-0001", "seq": 1, "date": "2025-09-07", "time": "17:14",
        "documentNo": "COL-8812", "jurisdiction": "AB",
        "plate": "PLT-002", "plateJur": "AB",
        "status": "Closed", "preventable": "Preventable",
        "severity": "Property Damage", "points": 2,
        "driver": "M. Lee", "location": "Highway 2, AB",
        "vehicle": "2021 Volvo", "vin": "4V4NC9GH2PN123456", "activePts": 2 }
    ],
    "adminPenalties": [],
    "monitoring": [
      { "id": "ab-m-0001", "date": "2026-01-31", "type": "MONT",
        "trkPct": 100, "busPct": 0,
        "avg": 0.189, "cur": 0.185, "score": 0.185,
        "convPct": 34.6, "inspPct": 32.3, "collPct": 33.1,
        "stage": "Not on Monitoring" }
    ],
    "facilityLicences": [],
    "safetyRatingHistory":    [ { "seq": 1, "effective": "2026-01-07", "expiry": "2028-12-31",
                                  "description": "Satisfactory Unaudited", "comments": "Issued at renewal" } ],
    "operatingStatusHistory": [ { "seq": 1, "effective": "2022-03-15", "inactive": null, "description": "Federal" } ],
    "historicalEvents": [
      { "id": "ab-h-0001", "seq": 1, "date": "2026-01-31", "type": "MONT", "jurisdiction": "AB",
        "description": "Monthly R-Factor snapshot 0.185" },
      { "id": "ab-h-0002", "seq": 2, "date": "2025-11-18", "type": "CONV", "jurisdiction": "AB",
        "description": "HTA 128(1) Speeding — 3 pts" }
    ]
  },
  "warnings": []
}
```

</details>

### 11.4 BC NSC

<details>
<summary>Click to expand full populated payload</summary>

```json
{
  "kind": "bc",
  "demographics": {
    "carrierName": "INERTIA CARRIER LTD.", "nscNumber": "BC123456", "jurisdiction": "BC",
    "primaryBusinessType": "General Freight",
    "mailingAddress": "101-8351 ALEXANDRA ROAD, RICHMOND, BC V6X 1C3",
    "certificateIssueDate": "2019-05-01",
    "extraProvincial": true, "premiumCarrier": false,
    "weigh2GoBC": true, "preventativeMaintenance": true,
    "numberOfLicensedVehicles": 78,
    "reportRunDate": "2025-04-17", "profileFrom": "2023-04-17", "profileTo": "2025-04-17"
  },
  "certificate": {
    "certificateStatus": "Active", "safetyRating": "Satisfactory",
    "profileStatus": "Satisfactory", "auditStatus": "Unaudited"
  },
  "complianceReview": {
    "asOfDate": "2025-03-31", "averageFleetSize": 77.56,
    "scores": [
      { "category": "Contraventions",        "score": 0.30, "events": 39 },
      { "category": "CVSA (Out of Service)", "score": 0.31, "events": 12 },
      { "category": "Accidents",             "score": 0.00, "events": 11 }
    ],
    "totalScore": 0.61
  },
  "thresholds": [
    { "status": "Satisfactory",   "contraventions": "< 1.76",     "cvsa": "< 0.93",     "accidents": "< 0.23",     "total": "< 2.13" },
    { "status": "Conditional",    "contraventions": "1.76-2.98",  "cvsa": "0.93-1.08",  "accidents": "0.23-0.27",  "total": "2.13-3.64" },
    { "status": "Unsatisfactory", "contraventions": ">= 2.98",    "cvsa": ">= 1.08",    "accidents": ">= 0.27",    "total": ">= 3.64" }
  ],
  "events": {
    "profileScores": [
      { "id": "bc-ps-01", "month": "2025-03", "vd": 28308, "ad": 365, "avg": 77.56, "contra": 0.30, "cvsa": 0.31, "acc": 0.00, "total": 0.61 }
    ],
    "activeFleet": [
      { "id": "bc-fl-01", "regi": "10537552", "plate": "69124P", "year": 2006, "make": "FREIGHTLIN",
        "owner": "Inertia Carrier Ltd.", "gvw": 25854 }
    ],
    "driverGuilty": [
      { "id": "bc-dg-01", "driverName": "BAJWA, MANJOT", "dl": "B0209516098126", "dlJur": "ON",
        "date": "2024-12-24", "time": "00:00", "ticket": "1333765",
        "plate": "72843P", "plateJur": "BC", "location": "BALGONIE", "juris": "SK",
        "dispDate": "2025-01-16", "act": "HT", "section": "6;b",
        "desc": "Improper use of lights", "equiv": "0323", "pts": 2 }
    ],
    "carrierGuilty": [], "driverPending": [], "carrierPending": [],
    "cvsaInspections": [
      { "id": "bc-cv-01", "date": "2025-01-22", "inspectionNo": "EA602200100",
        "level": "Level 1", "plate": "68042P", "driver": "Singh, A.",
        "defects": "Brakes", "result": "Out of Service" }
    ],
    "accidents": [
      { "id": "bc-ac-01", "date": "2023-03-03", "time": "09:48", "report": "6653022",
        "location": "PICKERING, BAYLY ST", "jur": "ON",
        "driverName": "KHAIRA, EKAMPREET SINGH", "dl": "K31462008981001", "dlJur": "ON",
        "plate": "76118P", "plateJur": "BC", "regi": "14199432", "vehDesc": "",
        "type": "Property", "fault": "At Fault", "charges": "No", "pts": 2 }
    ],
    "auditSummary": [],
    "cvip": [
      { "id": "bc-cvip-01", "regi": "10537552", "plate": "69124P", "vehicle": "2006 FREIGHTLIN",
        "date": "2022-04-20", "type": "N&O", "facility": "", "confirmation": "FR66236",
        "decal": "", "expiry": "", "result": "N&O 2" }
    ]
  },
  "warnings": []
}
```

</details>

### 11.5 PEI NSC

<details>
<summary>Click to expand full populated payload</summary>

```json
{
  "kind": "pe",
  "carrier":     { "carrierName": "BUSINESS PORTERS INC.", "nscNumber": "PE316583",
                   "profileAsOf": "2021-07-14", "jurisdiction": "Prince Edward Island" },
  "latestPull":  { "collisionPoints": 8, "convictionPoints": 6, "inspectionPoints": 9,
                   "totalPoints": 23, "maxPoints": 55, "pctOfMax": 41.8 },
  "fleet":       { "currentActiveVehicles": 19, "currentActiveVehiclesAtLastAssessment": 19 },
  "certificate": { "safetyRating": "Conditional", "certStatus": "Active", "auditStatus": "Unaudited" },
  "events": {
    "collisions": [
      { "id": "pe-col-01", "seq": 1, "date": "2021-05-12", "severity": "Property Damage",
        "caseNum": "BC2021-0583", "fault": "At Fault",
        "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 },
      { "id": "pe-col-02", "seq": 2, "date": "2021-02-18", "severity": "Injury",
        "caseNum": "AB2021-1147", "fault": "At Fault",
        "vehicles": 2, "killed": 0, "injured": 1, "pts": 4 }
    ],
    "convictions": [
      { "id": "pe-con-01", "seq": 1, "date": "2021-03-04", "loc": "QC",
        "charge": "SIGNALISATION NON RESPECTÉE", "natCode": "317", "pts": 3 }
    ],
    "inspections": [
      { "id": "pe-ins-01", "seq": 1, "date": "2022-11-22", "cvsaLevel": 3,
        "log": "Passed", "tdg": "Passed", "loadSecurity": "Passed",
        "driverName": "SINGH", "status": "P" },
      { "id": "pe-ins-02", "seq": 2, "date": "2021-03-23", "cvsaLevel": 1,
        "log": "Passed", "tdg": "Passed", "loadSecurity": "Passed",
        "driverName": "SINGH", "status": "O" }
    ],
    "audits": [
      { "id": "pe-aud-01", "seq": 1, "date": "2021-01-13",
        "result": "NON-COMPLIANT", "auditType": "Compliance" }
    ]
  },
  "warnings": []
}
```

</details>

### 11.6 Nova Scotia NSC

<details>
<summary>Click to expand full populated payload</summary>

```json
{
  "kind": "ns",
  "carrier":    { "carrierName": "MAPLE LEAF FORCE LIMITED", "nscNumber": "MAPLE739646000",
                  "profileAsOf": "2022-08-19" },
  "latestPull": { "collisionScore": 0.0000, "convictionScore": 6.2510, "inspectionScore": 13.4179 },
  "fleet":      { "currentFleetSize": 14, "avgDailyFleetSize": 14.79 },
  "thresholds": { "scoreLevel1": 39.7531, "scoreLevel2": 45.9602, "scoreLevel3": 60.1836,
                  "safetyRating": "Satisfactory - Unaudited", "safetyRatingExpires": null },
  "events": {
    "cvsaInspections": [
      { "id": "ns-cv-01", "seq": 1, "date": "2022-11-29", "cvsaNumber": "445131-1",
        "jur": "NB", "plates": "PR45273 / MB",
        "driverMaster": "D4391-00009-90407 / ON", "result": "Passed", "demeritPts": 0 },
      { "id": "ns-cv-13", "seq": 13, "date": "2023-04-25", "cvsaNumber": "667415",
        "jur": "NS", "plates": "TC1771 / MB",
        "driverMaster": "SINGH210898005 / NS", "result": "Out-of-Service", "demeritPts": 3 }
    ],
    "auditHistory": [
      { "id": "ns-au-01", "seq": 1, "date": "2023-04-28", "auditNum": "34843",
        "sequence": "1", "result": "Compliant" }
    ],
    "convictions": [
      { "id": "ns-cn-01", "seq": 1, "offenceDate": "2020-11-19", "convDate": "2021-01-19",
        "ticket": "5488801",
        "offence": "OPER VEH NOT CONFORMING WITH SPECIAL PERMIT",
        "driverMaster": "CZIPP141270003", "sectionActReg": "11 9 WDVR", "pts": 3 }
    ],
    "collisions": [
      { "id": "ns-co-01", "seq": 1, "date": "2020-09-04", "severity": "PROPERTY DAMAGE",
        "location": "MONTREAL / QC",
        "driverMaster": "", "driverJur": "ON",
        "plate": "PR42409", "plateJur": "NS", "pts": 0 }
    ],
    "trafficOffences": [
      { "id": "ns-to-01", "seq": 1, "offenceDate": "2023-09-05",
        "plate": "PR45273", "driverMaster": "SINGH120992005",
        "statute": "CVDH 7 1 A",
        "description": "FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME" }
    ]
  },
  "warnings": []
}
```

</details>

---

## 12. Testing / Acceptance

For each `kind`, we will ship a golden-test bundle:

```
testdata/
  fmcsa/
    sample-01.pdf       → expected.json
    sample-02.pdf       → expected.json
  cvor/
    sample-01.pdf       → expected.json
  ab/
    sample-01.pdf       → expected.json
  bc/
    sample-01.pdf       → expected.json
  pe/
    sample-01.pdf       → expected.json
  ns/
    sample-01.pdf       → expected.json
```

Acceptance criteria:

1. For every sample PDF, the extractor output deep-equals the expected
   JSON (after key sorting). Numeric tolerance: ±0.01 on scores /
   percentages; exact match on counts, points, IDs, dates, strings.
2. Empty sections emit `[]`, not `null` and not missing.
3. No silent string fallbacks — if a field cannot be extracted, emit
   the empty string `""` for string fields or `null` for date/numeric
   nullables, and add a `warnings` entry with the field path:
   `"missing: carrier.mailingAddress"`.
4. `warnings` is always an array. Emit `[]` when clean.

---

## 13. Change control

This spec is versioned. Changes will bump the top-level `Version` and
ship a migration note (fields renamed / added / removed). The extractor
is expected to continue emitting the previous shape until the consumer
upgrades — use content negotiation:

```
Accept: application/json; profile="pdf-extractor-spec-1.0"
```

Future spec versions will add `"version": "1.1"` to the payload.

---

## 14. No-records / empty-state templates

When a section on the PDF is absent (e.g. a carrier with no audits, no
collisions, no admin penalties), emit the key with an **empty array
`[]`** for lists and **type-appropriate defaults** for scalars. Never
omit a required key. These are the canonical "nothing to report"
payloads the extractor emits when the PDF is well-formed but has no
substantive data:

### 14.1 `fmcsa` — empty

```json
{
  "kind": "fmcsa",
  "lastUpdated": null, "lastUploaded": null,
  "basics": [
    { "category": "Unsafe Driving",                "measure": 0, "percentile": 0, "alertThreshold": 65, "status": "Low Data" },
    { "category": "Crash Indicator",               "measure": 0, "percentile": 0, "alertThreshold": 65, "status": "Low Data" },
    { "category": "Hours-of-service Compliance",   "measure": 0, "percentile": 0, "alertThreshold": 65, "status": "Low Data" },
    { "category": "Vehicle Maintenance",           "measure": 0, "percentile": 0, "alertThreshold": 80, "status": "Low Data" },
    { "category": "Controlled Substances/Alcohol", "measure": 0, "percentile": 0, "alertThreshold": 80, "status": "Low Data" },
    { "category": "Hazardous Materials Compliance","measure": 0, "percentile": 0, "alertThreshold": 80, "status": "Low Data" },
    { "category": "Driver Fitness",                "measure": 0, "percentile": 0, "alertThreshold": 80, "status": "Low Data" }
  ],
  "inspectionsByMonth": [],
  "oosDonut": { "totalViolations": 0, "oos": 0, "oosPct": 0, "nonOos": 0, "nonOosPct": 0 },
  "topViolations": [], "levelStats": [], "stateMetrics": [],
  "inspections": [],
  "warnings": []
}
```

### 14.2 `cvor` — empty

```json
{
  "kind": "cvor",
  "lastUpdated": null, "lastUploaded": null,
  "overall": { "rating": 0, "status": "OK", "guidance": "",
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 } },
  "categories": {
    "collisions":  { "pctOfThresh": 0, "events": 0, "points": 0, "contribution": 40 },
    "convictions": { "pctOfThresh": 0, "events": 0, "points": 0, "contribution": 40 },
    "inspections": { "pctOfThresh": 0, "events": 0, "oosRate": 0, "contribution": 20 }
  },
  "oosRates": {
    "overall": { "current": 0, "threshold": 30, "enabled": true },
    "vehicle": { "current": 0, "threshold": 25, "enabled": true },
    "driver":  { "current": 0, "threshold": 10, "enabled": true }
  },
  "recommendedActions": [],
  "mileage": { "ontarioMiles": 0, "canadaMiles": 0, "usMexicoMiles": 0, "totalMiles": 0 },
  "levelComparison": [], "periodicReports": [],
  "inspections": [],
  "warnings": []
}
```

### 14.3 `ab` — empty

```json
{
  "kind": "ab",
  "performanceCard": { "carrierName": "", "rFactor": 0, "monitoringStage": "Not Monitored",
    "fleetRange": "", "fleetType": "Truck",
    "stageThresholds": [], "statusMessage": "" },
  "contributions": {
    "convictions":          { "pct": 0, "events": 0 },
    "adminPenalties":       { "pct": 0, "events": 0 },
    "cvsaInspections":      { "pct": 0, "events": 0 },
    "reportableCollisions": { "pct": 0, "events": 0 }
  },
  "fleetMonitoring": { "fleetAvg": 0, "fleetCurrent": 0,
    "monitoringAsOf": null, "monitoringAsOfRaw": "",
    "monitoringRFactor": 0, "monitoringStage": "Not on Monitoring",
    "totalCarriersAB": 0 },
  "convictionTotals":   { "documents": 0, "count": 0, "points": 0 },
  "carrierIdentifiers": { "nscNumber": "", "mvidNumber": "", "operatingStatus": "Federal" },
  "certificate": { "certNumber": "",
    "certEffective": null, "certEffectiveRaw": "",
    "certExpiry":    null, "certExpiryRaw":    "",
    "safetyRating":  "Satisfactory Unaudited" },
  "events": {
    "convictions": [], "cvsaInspections": [], "collisions": [], "adminPenalties": [],
    "monitoring": [], "facilityLicences": [],
    "safetyRatingHistory": [], "operatingStatusHistory": [],
    "historicalEvents": []
  },
  "warnings": []
}
```

### 14.4 `bc` — empty

```json
{
  "kind": "bc",
  "demographics": { "carrierName": "", "nscNumber": "", "jurisdiction": "BC",
    "primaryBusinessType": "", "mailingAddress": "",
    "certificateIssueDate": null,
    "extraProvincial": false, "premiumCarrier": false,
    "weigh2GoBC": false, "preventativeMaintenance": false,
    "numberOfLicensedVehicles": 0,
    "reportRunDate": null, "profileFrom": null, "profileTo": null },
  "certificate": { "certificateStatus": "Active", "safetyRating": "Satisfactory",
    "profileStatus": "Satisfactory", "auditStatus": "Unaudited" },
  "complianceReview": { "asOfDate": null, "averageFleetSize": 0,
    "scores": [
      { "category": "Contraventions",        "score": 0, "events": 0 },
      { "category": "CVSA (Out of Service)", "score": 0, "events": 0 },
      { "category": "Accidents",             "score": 0, "events": 0 }
    ],
    "totalScore": 0 },
  "thresholds": [],
  "events": {
    "profileScores": [], "activeFleet": [],
    "driverGuilty": [], "carrierGuilty": [], "driverPending": [], "carrierPending": [],
    "cvsaInspections": [], "accidents": [], "auditSummary": [], "cvip": []
  },
  "warnings": []
}
```

### 14.5 `pe` — empty

```json
{
  "kind": "pe",
  "carrier":     { "carrierName": "", "nscNumber": "", "profileAsOf": null,
                   "jurisdiction": "Prince Edward Island" },
  "latestPull":  { "collisionPoints": 0, "convictionPoints": 0, "inspectionPoints": 0,
                   "totalPoints": 0, "maxPoints": 55, "pctOfMax": 0 },
  "fleet":       { "currentActiveVehicles": 0, "currentActiveVehiclesAtLastAssessment": 0 },
  "certificate": { "safetyRating": "Satisfactory", "certStatus": "Active", "auditStatus": "Unaudited" },
  "events":      { "collisions": [], "convictions": [], "inspections": [], "audits": [] },
  "warnings": []
}
```

### 14.6 `ns` — empty

```json
{
  "kind": "ns",
  "carrier":    { "carrierName": "", "nscNumber": "", "profileAsOf": null },
  "latestPull": { "collisionScore": 0, "convictionScore": 0, "inspectionScore": 0 },
  "fleet":      { "currentFleetSize": 0, "avgDailyFleetSize": 0 },
  "thresholds": { "scoreLevel1": 0, "scoreLevel2": 0, "scoreLevel3": 0,
                  "safetyRating": "Satisfactory - Unaudited", "safetyRatingExpires": null },
  "events": {
    "cvsaInspections": [], "auditHistory": [],
    "convictions": [], "collisions": [], "trafficOffences": []
  },
  "warnings": []
}
```

### 14.7 How "no records" is shown on screen

When a section's array is empty, the UI renders a greyed-out banner such
as:

| Section | Empty-state banner |
|---|---|
| Alberta Convictions            | "There are no Conviction records in this pull." |
| Alberta CVSA Inspections       | "There are no CVSA Inspection records." |
| Alberta Admin Penalties        | "No administrative penalties." |
| BC Active Fleet                | "No fleet vehicles listed." |
| BC Audit Summary               | "UNAUDITED — no audits on record." |
| BC CVIP                        | "No CVIP records." |
| PEI Collisions                 | "There are no Collision records." |
| PEI Audits                     | "There are no Audit records for period selected." |
| NS CVSA Inspection             | "No CVSA inspections recorded." |
| NS Audit History               | "There are no Audit History records." |
| NS Traffic Offence Reports     | "There are no Traffic Offence Report records." |

The extractor does NOT emit these strings — it emits `[]`. The UI
generates the banner text from the empty array. But if the PDF
explicitly states "No records" or equivalent, append a warning:

```json
"warnings": [ "ab.events.facilityLicences: PDF confirms no records" ]
```

---

## 15. JSON Schemas (Draft-07)

The extractor output MUST validate against the following schemas. Use
`$ref` for shared row types. Only the top-level skeleton is shown below —
full row-type `$defs` expand into the shapes documented in sections 4–9.

### 15.1 Root dispatcher

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://inertia.example/schemas/pdf-extractor/root.json",
  "oneOf": [
    { "$ref": "#/$defs/fmcsa" },
    { "$ref": "#/$defs/cvor" },
    { "$ref": "#/$defs/ab" },
    { "$ref": "#/$defs/bc" },
    { "$ref": "#/$defs/pe" },
    { "$ref": "#/$defs/ns" }
  ]
}
```

### 15.2 `fmcsa` schema

```json
{
  "type": "object",
  "required": ["kind", "basics", "inspectionsByMonth", "oosDonut", "topViolations", "levelStats", "stateMetrics", "inspections", "warnings"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "fmcsa" },
    "lastUpdated":  { "type": ["string", "null"], "format": "date-time" },
    "lastUploaded": { "type": ["string", "null"], "format": "date-time" },
    "basics": {
      "type": "array", "minItems": 7, "maxItems": 7,
      "items": { "type": "object", "required": ["category","measure","percentile","alertThreshold","status"],
        "properties": {
          "category": { "enum": ["Unsafe Driving","Crash Indicator","Hours-of-service Compliance","Vehicle Maintenance","Controlled Substances/Alcohol","Hazardous Materials Compliance","Driver Fitness"] },
          "measure":  { "type": "number", "minimum": 0 },
          "percentile": { "type": "number", "minimum": 0, "maximum": 100 },
          "alertThreshold": { "type": "number", "minimum": 0, "maximum": 100 },
          "status": { "enum": ["ALERT","OK","Low Data"] }
        } }
    },
    "inspectionsByMonth": { "type": "array", "items": {
      "type": "object", "required": ["month","withViolations","withoutViolations"],
      "properties": {
        "month": { "type": "string", "pattern": "^\\d{4}-\\d{2}$" },
        "withViolations":    { "type": "integer", "minimum": 0 },
        "withoutViolations": { "type": "integer", "minimum": 0 }
      } } },
    "oosDonut": { "type": "object", "required": ["totalViolations","oos","oosPct","nonOos","nonOosPct"],
      "properties": {
        "totalViolations": { "type": "integer", "minimum": 0 },
        "oos":       { "type": "integer", "minimum": 0 },
        "oosPct":    { "type": "number",  "minimum": 0, "maximum": 100 },
        "nonOos":    { "type": "integer", "minimum": 0 },
        "nonOosPct": { "type": "number",  "minimum": 0, "maximum": 100 }
      } },
    "topViolations": { "type": "array", "items": { "$ref": "#/$defs/topViolation" } },
    "levelStats":    { "type": "array", "items": { "$ref": "#/$defs/levelStat"    } },
    "stateMetrics":  { "type": "array", "items": { "$ref": "#/$defs/stateMetric"  } },
    "inspections":   { "type": "array", "items": { "$ref": "#/$defs/fmcsaInspection" } },
    "warnings":      { "type": "array", "items": { "type": "string" } }
  }
}
```

### 15.3 `cvor` schema — root signature

```json
{
  "type": "object",
  "required": ["kind","overall","categories","oosRates","recommendedActions","mileage","levelComparison","periodicReports","inspections","warnings"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "cvor" },
    "overall": { "type": "object", "required": ["rating","status","guidance","thresholds"],
      "properties": {
        "rating":   { "type": "number", "minimum": 0 },
        "status":   { "enum": ["OK","WARNING","AUDIT","SHOW CAUSE","SEIZURE"] },
        "guidance": { "type": "string" },
        "thresholds": { "type": "object", "required": ["warning","audit","showCause","seizure"],
          "properties": {
            "warning":   { "type": "number" }, "audit":     { "type": "number" },
            "showCause": { "type": "number" }, "seizure":   { "type": "number" }
          } }
      } },
    "categories": { "type": "object", "required": ["collisions","convictions","inspections"] },
    "oosRates":   { "type": "object", "required": ["overall","vehicle","driver"] },
    "recommendedActions": { "type": "array", "items": {
      "type": "object", "required": ["severity","title","description"],
      "properties": {
        "severity": { "enum": ["critical","warning","info"] },
        "title":    { "type": "string" }, "description": { "type": "string" }
      } } },
    "mileage": { "type": "object", "required": ["ontarioMiles","canadaMiles","usMexicoMiles","totalMiles"] },
    "levelComparison": { "type": "array", "items": { "$ref": "#/$defs/levelStat" } },
    "periodicReports": { "type": "array", "items": { "$ref": "#/$defs/cvorPeriodicReport" } },
    "inspections":     { "type": "array", "items": { "$ref": "#/$defs/cvorInspection" } },
    "warnings":        { "type": "array", "items": { "type": "string" } }
  }
}
```

### 15.4 `ab` schema — root signature

```json
{
  "type": "object",
  "required": ["kind","performanceCard","contributions","fleetMonitoring","convictionTotals","carrierIdentifiers","certificate","events","warnings"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "ab" },
    "performanceCard": { "type": "object", "required": ["carrierName","rFactor","monitoringStage","fleetRange","fleetType","stageThresholds","statusMessage"] },
    "contributions":   { "type": "object", "required": ["convictions","adminPenalties","cvsaInspections","reportableCollisions"] },
    "fleetMonitoring": { "type": "object", "required": ["fleetAvg","fleetCurrent","monitoringAsOf","monitoringRFactor","monitoringStage","totalCarriersAB"] },
    "convictionTotals":   { "type": "object", "required": ["documents","count","points"] },
    "carrierIdentifiers": { "type": "object", "required": ["nscNumber","mvidNumber","operatingStatus"] },
    "certificate":        { "type": "object", "required": ["certNumber","certEffective","certExpiry","safetyRating"] },
    "events": { "type": "object", "required": ["convictions","cvsaInspections","collisions","adminPenalties","monitoring","facilityLicences","safetyRatingHistory","operatingStatusHistory","historicalEvents"] },
    "warnings": { "type": "array", "items": { "type": "string" } }
  }
}
```

### 15.5 `bc` schema — root signature

```json
{
  "type": "object",
  "required": ["kind","demographics","certificate","complianceReview","thresholds","events","warnings"],
  "additionalProperties": false,
  "properties": {
    "kind": { "const": "bc" },
    "demographics":     { "type": "object", "required": ["carrierName","nscNumber","jurisdiction","numberOfLicensedVehicles","reportRunDate","profileFrom","profileTo"] },
    "certificate":      { "type": "object", "required": ["certificateStatus","safetyRating","profileStatus","auditStatus"] },
    "complianceReview": { "type": "object", "required": ["asOfDate","averageFleetSize","scores","totalScore"] },
    "thresholds":       { "type": "array", "items": { "$ref": "#/$defs/bcThresholdRow" } },
    "events":           { "type": "object", "required": ["profileScores","activeFleet","driverGuilty","carrierGuilty","driverPending","carrierPending","cvsaInspections","accidents","auditSummary","cvip"] },
    "warnings":         { "type": "array", "items": { "type": "string" } }
  }
}
```

### 15.6 `pe` schema — root signature

```json
{
  "type": "object",
  "required": ["kind","carrier","latestPull","fleet","certificate","events","warnings"],
  "additionalProperties": false,
  "properties": {
    "kind":        { "const": "pe" },
    "carrier":     { "type": "object", "required": ["carrierName","nscNumber","profileAsOf","jurisdiction"] },
    "latestPull":  { "type": "object", "required": ["collisionPoints","convictionPoints","inspectionPoints","totalPoints","maxPoints","pctOfMax"] },
    "fleet":       { "type": "object", "required": ["currentActiveVehicles","currentActiveVehiclesAtLastAssessment"] },
    "certificate": { "type": "object", "required": ["safetyRating","certStatus","auditStatus"] },
    "events":      { "type": "object", "required": ["collisions","convictions","inspections","audits"] },
    "warnings":    { "type": "array", "items": { "type": "string" } }
  }
}
```

### 15.7 `ns` schema — root signature

```json
{
  "type": "object",
  "required": ["kind","carrier","latestPull","fleet","thresholds","events","warnings"],
  "additionalProperties": false,
  "properties": {
    "kind":        { "const": "ns" },
    "carrier":     { "type": "object", "required": ["carrierName","nscNumber","profileAsOf"] },
    "latestPull":  { "type": "object", "required": ["collisionScore","convictionScore","inspectionScore"] },
    "fleet":       { "type": "object", "required": ["currentFleetSize","avgDailyFleetSize"] },
    "thresholds":  { "type": "object", "required": ["scoreLevel1","scoreLevel2","scoreLevel3","safetyRating","safetyRatingExpires"] },
    "events":      { "type": "object", "required": ["cvsaInspections","auditHistory","convictions","collisions","trafficOffences"] },
    "warnings":    { "type": "array", "items": { "type": "string" } }
  }
}
```

---

## 16. Pull-by-pull time-series examples

### 16.1 CVOR — 24 monthly periodic reports

`periodicReports` should carry one entry per month for the last 24
months. Newest first. Example (trimmed to 12 for brevity; in production
emit all 24):

```json
"periodicReports": [
  { "periodLabel": "Jun 23/24", "reportDate": "2024-06-30", "rating": 42.7, "colContrib": 18.3, "conContrib": 22.1, "insContrib": 2.3, "colPctOfThresh": 18.3, "conPctOfThresh": 22.1, "insPctOfThresh": 11.5, "collisionEvents": 5, "convictionEvents": 7, "oosOverall": 8.1, "oosVehicle": 6.4, "oosDriver": 1.7, "trucks": 42, "onMiles": 1200000, "canadaMiles": 2800000, "totalMiles": 5400000, "collWithPoints": 3, "collWithoutPoints": 2, "totalCollisionPoints": 8, "convictionPoints": 9 },
  { "periodLabel": "May 23/24", "reportDate": "2024-05-31", "rating": 41.2, "colContrib": 17.9, "conContrib": 21.4, "insContrib": 1.9, "colPctOfThresh": 17.9, "conPctOfThresh": 21.4, "insPctOfThresh":  9.5, "collisionEvents": 5, "convictionEvents": 6, "oosOverall": 7.6, "oosVehicle": 6.0, "oosDriver": 1.6, "trucks": 41, "onMiles": 1180000, "canadaMiles": 2750000, "totalMiles": 5280000, "collWithPoints": 3, "collWithoutPoints": 2, "totalCollisionPoints": 8, "convictionPoints": 8 },
  { "periodLabel": "Apr 23/24", "reportDate": "2024-04-30", "rating": 39.8, "colContrib": 17.2, "conContrib": 20.3, "insContrib": 2.3, "colPctOfThresh": 17.2, "conPctOfThresh": 20.3, "insPctOfThresh": 11.5, "collisionEvents": 4, "convictionEvents": 6, "oosOverall": 8.0, "oosVehicle": 6.6, "oosDriver": 1.4, "trucks": 40, "onMiles": 1155000, "canadaMiles": 2700000, "totalMiles": 5175000, "collWithPoints": 2, "collWithoutPoints": 2, "totalCollisionPoints": 6, "convictionPoints": 7 },
  { "periodLabel": "Mar 23/24", "reportDate": "2024-03-31", "rating": 38.4, "colContrib": 16.8, "conContrib": 19.5, "insContrib": 2.1, "colPctOfThresh": 16.8, "conPctOfThresh": 19.5, "insPctOfThresh": 10.5, "collisionEvents": 4, "convictionEvents": 6, "oosOverall": 7.8, "oosVehicle": 6.4, "oosDriver": 1.4, "trucks": 40, "onMiles": 1130000, "canadaMiles": 2650000, "totalMiles": 5075000, "collWithPoints": 2, "collWithoutPoints": 2, "totalCollisionPoints": 6, "convictionPoints": 7 },
  { "periodLabel": "Feb 23/24", "reportDate": "2024-02-29", "rating": 37.1, "colContrib": 16.3, "conContrib": 18.9, "insContrib": 1.9, "colPctOfThresh": 16.3, "conPctOfThresh": 18.9, "insPctOfThresh":  9.5, "collisionEvents": 4, "convictionEvents": 5, "oosOverall": 7.5, "oosVehicle": 6.2, "oosDriver": 1.3, "trucks": 39, "onMiles": 1100000, "canadaMiles": 2600000, "totalMiles": 4975000, "collWithPoints": 2, "collWithoutPoints": 2, "totalCollisionPoints": 6, "convictionPoints": 6 },
  { "periodLabel": "Jan 23/24", "reportDate": "2024-01-31", "rating": 36.0, "colContrib": 15.9, "conContrib": 18.2, "insContrib": 1.9, "colPctOfThresh": 15.9, "conPctOfThresh": 18.2, "insPctOfThresh":  9.5, "collisionEvents": 3, "convictionEvents": 5, "oosOverall": 7.4, "oosVehicle": 6.1, "oosDriver": 1.3, "trucks": 39, "onMiles": 1075000, "canadaMiles": 2555000, "totalMiles": 4880000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 6 },
  { "periodLabel": "Dec 22/23", "reportDate": "2023-12-31", "rating": 34.8, "colContrib": 15.4, "conContrib": 17.6, "insContrib": 1.8, "colPctOfThresh": 15.4, "conPctOfThresh": 17.6, "insPctOfThresh":  9.0, "collisionEvents": 3, "convictionEvents": 5, "oosOverall": 7.1, "oosVehicle": 5.9, "oosDriver": 1.2, "trucks": 38, "onMiles": 1050000, "canadaMiles": 2500000, "totalMiles": 4780000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 5 },
  { "periodLabel": "Nov 22/23", "reportDate": "2023-11-30", "rating": 33.6, "colContrib": 14.9, "conContrib": 17.0, "insContrib": 1.7, "colPctOfThresh": 14.9, "conPctOfThresh": 17.0, "insPctOfThresh":  8.5, "collisionEvents": 3, "convictionEvents": 4, "oosOverall": 6.9, "oosVehicle": 5.7, "oosDriver": 1.2, "trucks": 38, "onMiles": 1025000, "canadaMiles": 2450000, "totalMiles": 4680000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 5 },
  { "periodLabel": "Oct 22/23", "reportDate": "2023-10-31", "rating": 32.4, "colContrib": 14.5, "conContrib": 16.3, "insContrib": 1.6, "colPctOfThresh": 14.5, "conPctOfThresh": 16.3, "insPctOfThresh":  8.0, "collisionEvents": 3, "convictionEvents": 4, "oosOverall": 6.7, "oosVehicle": 5.5, "oosDriver": 1.2, "trucks": 37, "onMiles":  995000, "canadaMiles": 2400000, "totalMiles": 4580000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 4 },
  { "periodLabel": "Sep 22/23", "reportDate": "2023-09-30", "rating": 31.2, "colContrib": 14.0, "conContrib": 15.6, "insContrib": 1.6, "colPctOfThresh": 14.0, "conPctOfThresh": 15.6, "insPctOfThresh":  8.0, "collisionEvents": 3, "convictionEvents": 4, "oosOverall": 6.5, "oosVehicle": 5.3, "oosDriver": 1.2, "trucks": 37, "onMiles":  970000, "canadaMiles": 2350000, "totalMiles": 4475000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 4 },
  { "periodLabel": "Aug 22/23", "reportDate": "2023-08-31", "rating": 30.0, "colContrib": 13.5, "conContrib": 15.0, "insContrib": 1.5, "colPctOfThresh": 13.5, "conPctOfThresh": 15.0, "insPctOfThresh":  7.5, "collisionEvents": 3, "convictionEvents": 3, "oosOverall": 6.3, "oosVehicle": 5.2, "oosDriver": 1.1, "trucks": 36, "onMiles":  945000, "canadaMiles": 2300000, "totalMiles": 4375000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 3 },
  { "periodLabel": "Jul 22/23", "reportDate": "2023-07-31", "rating": 28.7, "colContrib": 13.0, "conContrib": 14.3, "insContrib": 1.4, "colPctOfThresh": 13.0, "conPctOfThresh": 14.3, "insPctOfThresh":  7.0, "collisionEvents": 3, "convictionEvents": 3, "oosOverall": 6.1, "oosVehicle": 5.0, "oosDriver": 1.1, "trucks": 36, "onMiles":  920000, "canadaMiles": 2250000, "totalMiles": 4275000, "collWithPoints": 2, "collWithoutPoints": 1, "totalCollisionPoints": 5, "convictionPoints": 3 }
]
```

### 16.2 BC — 14 monthly profile scores (full series)

```json
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
]
```

### 16.3 Alberta — 21-month monitoring snapshot series

```json
"monitoring": [
  { "id": "ab-m-01", "date": "2026-01-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.189, "cur": 0.185, "score": 0.185, "convPct": 34.6, "inspPct": 32.3, "collPct": 33.1, "stage": "Not on Monitoring" },
  { "id": "ab-m-02", "date": "2025-12-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.201, "cur": 0.192, "score": 0.192, "convPct": 35.2, "inspPct": 31.8, "collPct": 33.0, "stage": "Not on Monitoring" },
  { "id": "ab-m-03", "date": "2025-11-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.210, "cur": 0.205, "score": 0.205, "convPct": 36.0, "inspPct": 30.9, "collPct": 33.1, "stage": "Not on Monitoring" },
  { "id": "ab-m-04", "date": "2025-10-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.215, "cur": 0.211, "score": 0.211, "convPct": 36.4, "inspPct": 30.4, "collPct": 33.2, "stage": "Not on Monitoring" },
  { "id": "ab-m-05", "date": "2025-09-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.223, "cur": 0.219, "score": 0.219, "convPct": 36.9, "inspPct": 29.8, "collPct": 33.3, "stage": "Not on Monitoring" },
  { "id": "ab-m-06", "date": "2025-08-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.231, "cur": 0.224, "score": 0.224, "convPct": 37.1, "inspPct": 29.4, "collPct": 33.5, "stage": "Not on Monitoring" },
  { "id": "ab-m-07", "date": "2025-07-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.240, "cur": 0.232, "score": 0.232, "convPct": 37.5, "inspPct": 28.9, "collPct": 33.6, "stage": "Not on Monitoring" },
  { "id": "ab-m-08", "date": "2025-06-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.247, "cur": 0.238, "score": 0.238, "convPct": 37.8, "inspPct": 28.5, "collPct": 33.7, "stage": "Not on Monitoring" },
  { "id": "ab-m-09", "date": "2025-05-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.255, "cur": 0.246, "score": 0.246, "convPct": 38.2, "inspPct": 28.0, "collPct": 33.8, "stage": "Not on Monitoring" },
  { "id": "ab-m-10", "date": "2025-04-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.263, "cur": 0.254, "score": 0.254, "convPct": 38.5, "inspPct": 27.6, "collPct": 33.9, "stage": "Not on Monitoring" },
  { "id": "ab-m-11", "date": "2025-03-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.271, "cur": 0.262, "score": 0.262, "convPct": 38.9, "inspPct": 27.1, "collPct": 34.0, "stage": "Not on Monitoring" },
  { "id": "ab-m-12", "date": "2025-02-28", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.279, "cur": 0.270, "score": 0.270, "convPct": 39.2, "inspPct": 26.7, "collPct": 34.1, "stage": "Not on Monitoring" },
  { "id": "ab-m-13", "date": "2025-01-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.287, "cur": 0.279, "score": 0.279, "convPct": 39.5, "inspPct": 26.3, "collPct": 34.2, "stage": "Not on Monitoring" },
  { "id": "ab-m-14", "date": "2024-12-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.295, "cur": 0.287, "score": 0.287, "convPct": 39.8, "inspPct": 25.9, "collPct": 34.3, "stage": "Not on Monitoring" },
  { "id": "ab-m-15", "date": "2024-11-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.303, "cur": 0.295, "score": 0.295, "convPct": 40.2, "inspPct": 25.5, "collPct": 34.3, "stage": "Stage 1"  },
  { "id": "ab-m-16", "date": "2024-10-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.312, "cur": 0.304, "score": 0.304, "convPct": 40.5, "inspPct": 25.1, "collPct": 34.4, "stage": "Stage 1"  },
  { "id": "ab-m-17", "date": "2024-09-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.320, "cur": 0.312, "score": 0.312, "convPct": 40.8, "inspPct": 24.8, "collPct": 34.4, "stage": "Stage 1"  },
  { "id": "ab-m-18", "date": "2024-08-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.328, "cur": 0.320, "score": 0.320, "convPct": 41.1, "inspPct": 24.4, "collPct": 34.5, "stage": "Stage 1"  },
  { "id": "ab-m-19", "date": "2024-07-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.336, "cur": 0.328, "score": 0.328, "convPct": 41.4, "inspPct": 24.1, "collPct": 34.5, "stage": "Stage 1"  },
  { "id": "ab-m-20", "date": "2024-06-30", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.344, "cur": 0.336, "score": 0.336, "convPct": 41.7, "inspPct": 23.7, "collPct": 34.6, "stage": "Stage 1"  },
  { "id": "ab-m-21", "date": "2024-05-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.352, "cur": 0.344, "score": 0.344, "convPct": 42.0, "inspPct": 23.4, "collPct": 34.6, "stage": "Stage 1"  }
]
```

### 16.4 NS — full 18 CVSA inspection series

Shown inline in [§11.6](#116-nova-scotia-nsc) — this is what a 12-month
NS profile emits verbatim. The extractor must not truncate or
de-duplicate.

---

## 17. Raw PDF text → JSON mapping

For each PDF type below, the left column is a near-verbatim excerpt from
the source PDF (OCR output). The right column is the extractor emission.

### 17.1 FMCSA BASIC scores

**Raw PDF text (FMCSA SMS Carrier Profile, page 2):**

```
BASIC                               Measure    Percentile    Alert
----------------------------------  --------   ----------    -----
Unsafe Driving                       2.14        68          YES
Crash Indicator                      1.07        54          NO
Hours-of-service Compliance          1.80        42          NO
Vehicle Maintenance                  3.22        81          YES  *
Controlled Substances/Alcohol        0.00         -          -
Hazardous Materials Compliance       0.00         -          -
Driver Fitness                       0.34        12          NO
*  HM threshold
```

**Emission:**

```json
"basics": [
  { "category": "Unsafe Driving",                "measure": 2.14, "percentile": 68, "alertThreshold": 65, "status": "ALERT" },
  { "category": "Crash Indicator",               "measure": 1.07, "percentile": 54, "alertThreshold": 65, "status": "OK" },
  { "category": "Hours-of-service Compliance",   "measure": 1.80, "percentile": 42, "alertThreshold": 65, "status": "OK" },
  { "category": "Vehicle Maintenance",           "measure": 3.22, "percentile": 81, "alertThreshold": 80, "status": "ALERT" },
  { "category": "Controlled Substances/Alcohol", "measure": 0.00, "percentile":  0, "alertThreshold": 80, "status": "Low Data" },
  { "category": "Hazardous Materials Compliance","measure": 0.00, "percentile":  0, "alertThreshold": 80, "status": "Low Data" },
  { "category": "Driver Fitness",                "measure": 0.34, "percentile": 12, "alertThreshold": 80, "status": "OK" }
]
```

Notes:
- Convert `YES` / `NO` / `-` in the Alert column to `"ALERT"` / `"OK"` / `"Low Data"`.
- A dash (`-`) or "Insufficient Data" banner → `"status": "Low Data"` and percentile `0`.
- Alert threshold: use `65` for all except `Vehicle Maintenance`, `Hazardous Materials Compliance`, `Driver Fitness`, and `Controlled Substances/Alcohol` which use `80`. Passenger carriers use `60` for all non-HM.

### 17.2 CVOR overall rating

**Raw PDF text (CVOR Abstract, page 1):**

```
CVOR Overall Rating: 42.7%   [WARNING]
7.3% below Audit threshold.

Thresholds: Warning 35%, Audit 50%, Show Cause 85%, Registration Seizure 100%.

Contributions:
  Collisions    40% weighting    18.3% of threshold   5 events
  Convictions   40% weighting    22.1% of threshold   7 events
  Inspections   20% weighting    11.5% of threshold  42 events  (8.1% OOS)
```

**Emission:**

```json
"overall": {
  "rating": 42.7, "status": "WARNING",
  "guidance": "7.3% below Audit threshold",
  "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 }
},
"categories": {
  "collisions":  { "pctOfThresh": 18.3, "events": 5,  "points": 0, "contribution": 40 },
  "convictions": { "pctOfThresh": 22.1, "events": 7,  "points": 0, "contribution": 40 },
  "inspections": { "pctOfThresh": 11.5, "events": 42, "oosRate": 8.1, "contribution": 20 }
}
```

`points` on collisions / convictions is filled in when the PDF lists the
specific points breakdown — if unstated, emit `0` and add a warning.

### 17.3 Alberta R-Factor Summary

**Raw PDF text (AB NSC Carrier Profile, cover):**

```
CARRIER NAME:  VM Motors Inc.
NSC NO:        AB257-4556        MVID NO:       0895-41544
OPERATING STATUS: Federal        FLEET TYPE:    Truck
PROFILE DATE:  2026 FEB 23       FLEET RANGE:   30.0-44.9

R-FACTOR:  0.062                  MONITORING STAGE:  Not Monitored
  Conviction contribution:          34.6%  (5 events)
  Admin Penalty contribution:        0.0%  (0 events)
  CVSA Inspection contribution:     32.3%  (43 events)
  Reportable Collision contribution: 33.1%  (6 events)

Monitoring (month-end 2026 JAN 31):
  R-Factor: 0.185   Stage: Not on Monitoring
  Total AB carriers: 17,704

Safety Fitness Certificate:
  Cert No: 002449387
  Effective: 2026 JAN 07
  Expiry:    2028 DEC 31
  Rating:    Satisfactory Unaudited

Convictions: Documents 3 / Convictions 3 / Points 3
```

**Emission:**

```json
{
  "performanceCard": {
    "carrierName": "VM Motors Inc.",
    "rFactor": 0.062, "monitoringStage": "Not Monitored",
    "fleetRange": "30.0-44.9", "fleetType": "Truck",
    "stageThresholds": [], "statusMessage": ""
  },
  "contributions": {
    "convictions":          { "pct": 34.6, "events":  5 },
    "adminPenalties":       { "pct":  0.0, "events":  0 },
    "cvsaInspections":      { "pct": 32.3, "events": 43 },
    "reportableCollisions": { "pct": 33.1, "events":  6 }
  },
  "fleetMonitoring": {
    "fleetAvg": 0, "fleetCurrent": 0,
    "monitoringAsOf": "2026-01-31", "monitoringAsOfRaw": "2026 JAN 31",
    "monitoringRFactor": 0.185, "monitoringStage": "Not on Monitoring",
    "totalCarriersAB": 17704
  },
  "convictionTotals":   { "documents": 3, "count": 3, "points": 3 },
  "carrierIdentifiers": { "nscNumber": "AB257-4556", "mvidNumber": "0895-41544", "operatingStatus": "Federal" },
  "certificate": {
    "certNumber": "002449387",
    "certEffective": "2026-01-07", "certEffectiveRaw": "2026 JAN 07",
    "certExpiry":    "2028-12-31", "certExpiryRaw":    "2028 DEC 31",
    "safetyRating":  "Satisfactory Unaudited"
  }
}
```

`stageThresholds` is filled from the fleet-size-band reference table the
PDF ships later (a Schedule 3 analog). Parse those rows too.

### 17.4 BC Monthly Profile Score row

**Raw PDF text (BC CVSE NSC Profile, Pull-by-Pull Monthly History table):**

```
Month     Total Active   Active Monthly    Average     Contraventions   CVSA      Accident   Total
          Vehicle Days   Days              Fleet Size    Score          Score     Score      Score
2025-03      28,308         365             77.56         0.30           0.31      0.00       0.61   (LATEST)
2025-02      28,186         365             77.22         0.30           0.31      0.05       0.66
```

**Emission** (per row):

```json
{ "id": "bc-ps-01", "month": "2025-03", "vd": 28308, "ad": 365, "avg": 77.56, "contra": 0.30, "cvsa": 0.31, "acc": 0.00, "total": 0.61 }
```

Strip commas from numeric fields (`28,308` → `28308`). Drop the `(LATEST)`
marker — the UI will infer "latest" from the first item in the array.

### 17.5 PEI Collision row

**Raw PDF text (PEI NSC Profile, Collisions section):**

```
Seq  Date         Severity          Case #           Fault            Veh  Killed  Injured  Pts
--   ----------   ----------------  ---------------  ---------------  ---  ------  -------  ---
1    2021/05/12   Property Damage   BC2021-0583      At Fault          2     0       0       2
2    2021/02/18   Injury            AB2021-1147      At Fault          2     0       1       4
3    2020/11/03   Property Damage   ON2020-8822      Not at Fault      1     0       0       0
4    2020/08/27   Property Damage   QC2020-5519      Fault Unknown     2     0       0       2
Total:                                                                 7     0       1       8
```

**Emission:**

```json
"collisions": [
  { "id": "pe-col-01", "seq": 1, "date": "2021-05-12", "severity": "Property Damage", "caseNum": "BC2021-0583", "fault": "At Fault",      "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 },
  { "id": "pe-col-02", "seq": 2, "date": "2021-02-18", "severity": "Injury",          "caseNum": "AB2021-1147", "fault": "At Fault",      "vehicles": 2, "killed": 0, "injured": 1, "pts": 4 },
  { "id": "pe-col-03", "seq": 3, "date": "2020-11-03", "severity": "Property Damage", "caseNum": "ON2020-8822", "fault": "Not at Fault",  "vehicles": 1, "killed": 0, "injured": 0, "pts": 0 },
  { "id": "pe-col-04", "seq": 4, "date": "2020-08-27", "severity": "Property Damage", "caseNum": "QC2020-5519", "fault": "Fault Unknown", "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 }
]
```

After emitting rows, reconcile: sum(`pts`) = 8, which should equal
`latestPull.collisionPoints`. If they disagree, emit a warning.

### 17.6 NS CVSA Inspection row

**Raw PDF text (NS NSC Profile, CVSA Inspection table):**

```
Seq   Date         CVSA #             Jur   Plates                          Driver Master           Result           Demerit
---   ----------   ----------------   ---   ----------------------------    --------------------   --------------   -------
  1   2022/11/29   445131-1           NB    PR45273 / MB, PR45273 / NS      D4391-00009-90407 / ON Passed                 0
  6   2023/03/16   666079             NS    PR49343 / NS, X5728P / ON       J64570000940315 / ON   Defect Noted           0
 13   2023/04/25   667415             NS    TC1771 / MB, PR49497 / NS       SINGH210898005 / NS    Out-of-Service         3
```

**Emission:** For multi-plate rows, join the plate cells with `, `
**preserving the trailing jurisdiction after `/`**. The UI parses on
`/ `.

```json
"cvsaInspections": [
  { "id": "ns-cv-01", "seq":  1, "date": "2022-11-29", "cvsaNumber": "445131-1", "jur": "NB", "plates": "PR45273 / MB, PR45273 / NS", "driverMaster": "D4391-00009-90407 / ON", "result": "Passed",         "demeritPts": 0 },
  { "id": "ns-cv-06", "seq":  6, "date": "2023-03-16", "cvsaNumber": "666079",   "jur": "NS", "plates": "PR49343 / NS, X5728P / ON",  "driverMaster": "J64570000940315 / ON",   "result": "Defect Noted",   "demeritPts": 0 },
  { "id": "ns-cv-13", "seq": 13, "date": "2023-04-25", "cvsaNumber": "667415",   "jur": "NS", "plates": "TC1771 / MB, PR49497 / NS",  "driverMaster": "SINGH210898005 / NS",    "result": "Out-of-Service", "demeritPts": 3 }
]
```

Note the exact enum spelling — `"Out-of-Service"` (hyphenated) is NS-only.

---

## 18. Delivery checklist (send this to the extractor vendor)

- [ ] Section **2 — Supported PDF types** confirms the 6 inputs.
- [ ] Section **3 — Global rules** — extractor follows the date / number / id / missing-section / enum / reconciliation conventions.
- [ ] Sections **4 – 9** — per-kind output schema; every key required, no extras.
- [ ] Section **10 — Enum Dictionary** — no cross-page string reuse.
- [ ] Section **11 — Worked Examples** — the vendor must pass these as fixtures.
- [ ] Section **14 — No-records templates** — the vendor emits `[]` for missing sections.
- [ ] Section **15 — JSON Schemas (Draft-07)** — output must validate.
- [ ] Section **16 — Pull-by-pull series** — CVOR 24mo, BC 14mo, AB 21mo, NS 12mo full series emitted.
- [ ] Section **17 — Raw-text-to-JSON mapping** — vendor uses these as micro-examples.
- [ ] Golden-test bundle (§12) delivered with PDFs + expected JSON.
