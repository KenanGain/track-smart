# PDF Extraction Schemas — Empty + Populated

For each compliance page the parser receives a PDF / DOC and must return a
JSON payload. This document gives, per page:

1. **Empty template** — every key the parser must emit, with empty / null values.
2. **Populated example** — the same shape with realistic data, to show what
   "good" extraction looks like.

Rules that apply to every payload:

- Dates → `YYYY-MM-DD`. Keep the source's literal string in a `*Raw` sibling
  if the PDF uses a non-ISO format (e.g. `2026 FEB 23`, `19/08/2022`).
- Points / scores / counts → **numbers**, not strings.
- Every event-list row must have a stable `id` (the parser may mint one).
- Missing sections → emit `[]`, do **not** omit the key.
- Enums must match the exact spelling per jurisdiction (see section 8).

---

## 1. FMCSA (US SMS) — `kind: "fmcsa"`

### Empty template

```json
{
  "kind": "fmcsa",
  "lastUpdated": null,
  "lastUploaded": null,
  "basics": [],
  "inspectionsByMonth": [],
  "oosDonut": { "totalViolations": 0, "oos": 0, "oosPct": 0, "nonOos": 0, "nonOosPct": 0 },
  "topViolations": [],
  "levelStats": [],
  "stateMetrics": [],
  "inspections": []
}
```

Event-row templates (what each array item should look like):

```json
{
  "basicsItem":         { "category": "", "measure": 0, "percentile": 0, "alertThreshold": 0, "status": "" },
  "monthItem":          { "month": "", "withViolations": 0, "withoutViolations": 0 },
  "topViolationItem":   { "code": "", "description": "", "count": 0, "points": 0 },
  "levelStatItem":      { "level": "", "count": 0, "oosCount": 0, "oosPct": 0 },
  "stateMetricItem":    { "state": "", "inspections": 0, "violations": 0, "points": 0, "basics": {} },
  "inspectionItem": {
    "id": "", "date": "", "startTime": "", "endTime": "",
    "state": "", "level": "",
    "location": { "street": "", "city": "", "province": "", "raw": "" },
    "driverId": "", "driver": "", "driverLicense": "",
    "vehiclePlate": "", "vehicleType": "", "assetId": "",
    "units": [],
    "powerUnitDefects": "", "trailerDefects": "",
    "oosSummary": { "driver": "PASSED", "vehicle": "PASSED", "total": 0 },
    "smsPoints":  { "driver": 0, "vehicle": 0, "carrier": 0 },
    "isClean": true, "hasOOS": false,
    "hasVehicleViolations": false, "hasDriverViolations": false,
    "severityRate": null,
    "violations": []
  },
  "violationItem": {
    "code": "", "category": "", "description": "", "subDescription": "",
    "severity": 0, "weight": 0, "points": 0,
    "oos": false, "driverRiskCategory": 0
  }
}
```

### Populated example

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
    { "code": "395.8(e)",    "description": "False report of driver's record of duty status", "count": 11, "points": 165 },
    { "code": "393.9",       "description": "Inoperable required lamp",            "count": 24, "points":  96 }
  ],
  "levelStats": [
    { "level": "Level 1", "count": 42, "oosCount": 7, "oosPct": 16.7 },
    { "level": "Level 2", "count": 68, "oosCount": 4, "oosPct":  5.9 },
    { "level": "Level 3", "count": 51, "oosCount": 2, "oosPct":  3.9 }
  ],
  "stateMetrics": [
    { "state": "MI", "inspections": 42, "violations": 28, "points": 187, "basics": { "Unsafe Driving": 5, "Vehicle Maintenance": 11, "Hours-of-service Compliance": 6, "Driver Fitness": 4, "Crash Indicator": 2 } },
    { "state": "OH", "inspections": 31, "violations": 19, "points": 121, "basics": { "Unsafe Driving": 3, "Vehicle Maintenance":  8, "Hours-of-service Compliance": 4, "Driver Fitness": 3, "Crash Indicator": 1 } }
  ],
  "inspections": [
    {
      "id": "MIGRAHA00829",
      "date": "2025-08-14", "startTime": "09:15", "endTime": "10:40",
      "state": "MI", "level": "Level 2",
      "location": { "street": "I-94 MM178", "city": "Battle Creek", "province": "MI", "raw": "BATTLE CREEK, MI" },
      "driverId": "DRV-2001", "driver": "RANDEEP SINGH", "driverLicense": "D1234-5678-9012",
      "vehiclePlate": "ABC-123", "vehicleType": "Truck Tractor", "assetId": "a1",
      "units": [
        { "type": "Truck Tractor", "make": "Freightliner", "license": "ABC-123", "vin": "1FUJGHDV9CLBK1234" }
      ],
      "powerUnitDefects": "Left front brake out of adjustment", "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "FAILED", "total": 1 },
      "smsPoints":  { "driver": 0, "vehicle": 12, "carrier": 0 },
      "isClean": false, "hasOOS": true,
      "hasVehicleViolations": true, "hasDriverViolations": false,
      "severityRate": 4.0,
      "violations": [
        { "code": "393.47A-BSF", "category": "Vehicle Maintenance", "description": "Inadequate brake stopping distance", "subDescription": "Air Brakes", "severity": 4, "weight": 3, "points": 12, "oos": true, "driverRiskCategory": 3 }
      ]
    }
  ]
}
```

---

## 2. CVOR (Ontario) — `kind: "cvor"`

### Empty template

```json
{
  "kind": "cvor",
  "lastUpdated": null,
  "lastUploaded": null,
  "overall": {
    "rating": 0,
    "status": "",
    "guidance": "",
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 }
  },
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
  "levelComparison": [],
  "periodicReports": [],
  "inspections": []
}
```

Event-row templates:

```json
{
  "recommendedActionItem": { "severity": "", "title": "", "description": "" },
  "levelComparisonItem":   { "level": "", "count": 0, "oosCount": 0, "oosPct": 0 },
  "periodicReportItem": {
    "periodLabel": "", "reportDate": "",
    "rating": 0, "colContrib": 0, "conContrib": 0, "insContrib": 0,
    "colPctOfThresh": 0, "conPctOfThresh": 0, "insPctOfThresh": 0,
    "collisionEvents": 0, "convictionEvents": 0,
    "oosOverall": 0, "oosVehicle": 0, "oosDriver": 0,
    "trucks": 0, "onMiles": 0, "canadaMiles": 0, "totalMiles": 0,
    "collWithPoints": 0, "collWithoutPoints": 0,
    "totalCollisionPoints": 0, "convictionPoints": 0
  },
  "inspectionItem": {
    "id": "", "date": "", "startTime": "", "endTime": "",
    "state": "", "level": "",
    "location": { "street": "", "city": "", "province": "", "raw": "" },
    "driverId": "", "driver": "", "driverLicense": "",
    "vehiclePlate": "", "vehicleType": "", "assetId": "", "vin": "",
    "units": [],
    "powerUnitDefects": "", "trailerDefects": "",
    "oosSummary": { "driver": "PASSED", "vehicle": "PASSED", "total": 0 },
    "cvorPoints": { "driver": 0, "vehicle": 0, "cvor": 0 },
    "fine": { "amount": "", "currency": "CAD" },
    "violations": [],
    "attachedDocs": []
  },
  "attachedDocItem": {
    "id": "", "docType": "", "docNumber": "",
    "issueDate": "", "fileName": "", "fileSize": 0
  }
}
```

### Populated example

```json
{
  "kind": "cvor",
  "lastUpdated":  "2025-04-17T16:00:00Z",
  "lastUploaded": "2025-04-15T10:20:00Z",
  "overall": {
    "rating": 42.7,
    "status": "WARNING",
    "guidance": "7.3% below Audit threshold",
    "thresholds": { "warning": 35, "audit": 50, "showCause": 85, "seizure": 100 }
  },
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
    { "severity": "warning", "title": "CVOR rating in Warning band",     "description": "Submit corrective action plan within 30 days." },
    { "severity": "warning", "title": "Vehicle OOS approaching threshold","description": "Vehicle OOS rate 6.4% is 74% of the 25% trigger." }
  ],
  "mileage": { "ontarioMiles": 1200000, "canadaMiles": 2800000, "usMexicoMiles": 1400000, "totalMiles": 5400000 },
  "levelComparison": [
    { "level": "Level 1", "count": 11, "oosCount": 3, "oosPct": 27.3 },
    { "level": "Level 2", "count": 18, "oosCount": 1, "oosPct":  5.6 },
    { "level": "Level 3", "count": 10, "oosCount": 0, "oosPct":  0.0 }
  ],
  "periodicReports": [
    { "periodLabel": "Jun 23/24", "reportDate": "2024-06-30", "rating": 42.7, "colContrib": 18.3, "conContrib": 22.1, "insContrib": 2.3, "colPctOfThresh": 18.3, "conPctOfThresh": 22.1, "insPctOfThresh": 11.5, "collisionEvents": 5, "convictionEvents": 7, "oosOverall": 8.1, "oosVehicle": 6.4, "oosDriver": 1.7, "trucks": 42, "onMiles": 1200000, "canadaMiles": 2800000, "totalMiles": 5400000, "collWithPoints": 3, "collWithoutPoints": 2, "totalCollisionPoints": 8, "convictionPoints": 9 },
    { "periodLabel": "May 23/24", "reportDate": "2024-05-31", "rating": 41.2, "colContrib": 17.9, "conContrib": 21.4, "insContrib": 1.9, "colPctOfThresh": 17.9, "conPctOfThresh": 21.4, "insPctOfThresh":  9.5, "collisionEvents": 5, "convictionEvents": 6, "oosOverall": 7.6, "oosVehicle": 6.0, "oosDriver": 1.6, "trucks": 41, "onMiles": 1180000, "canadaMiles": 2750000, "totalMiles": 5280000, "collWithPoints": 3, "collWithoutPoints": 2, "totalCollisionPoints": 8, "convictionPoints": 8 }
  ],
  "inspections": [
    {
      "id": "ONWINDS16001",
      "date": "2025-04-12", "startTime": "14:20", "endTime": "15:55",
      "state": "ON", "level": "Level 2",
      "location": { "street": "Hwy 401 EB", "city": "Windsor", "province": "ON", "raw": "WINDSOR, ON" },
      "driverId": "DRV-3001", "driver": "NAVJOT SINGH", "driverLicense": "S1234-56789-01234",
      "vehiclePlate": "AB 12 345", "vehicleType": "Truck Tractor", "assetId": "a5",
      "vin": "1FUJGHDV9CLBK1234",
      "units": [{ "type": "Truck Tractor", "make": "Volvo", "license": "AB 12 345", "vin": "1FUJGHDV9CLBK1234" }],
      "powerUnitDefects": "ABS warning lamp inoperable", "trailerDefects": "",
      "oosSummary": { "driver": "PASSED", "vehicle": "FAILED", "total": 1 },
      "cvorPoints": { "driver": 0, "vehicle": 5, "cvor": 5 },
      "fine": { "amount": "125.00", "currency": "CAD" },
      "violations": [
        { "code": "O.Reg.199/07 s.6(1)", "category": "Vehicle Maintenance", "description": "Defective ABS indicator", "subDescription": "Brakes", "severity": 3, "weight": 3, "points": 5, "oos": true, "driverRiskCategory": 2 }
      ],
      "attachedDocs": [
        { "id": "d-0001", "docType": "Inspection Report", "docNumber": "VIR-2025-04-12", "issueDate": "2025-04-12", "fileName": "vir.pdf", "fileSize": 234120 }
      ]
    }
  ]
}
```

---

## 3. Alberta NSC — `kind: "ab"`

### Empty template

```json
{
  "kind": "ab",
  "performanceCard": {
    "carrierName": "",
    "rFactor": 0,
    "monitoringStage": "",
    "fleetRange": "",
    "fleetType": "",
    "stageThresholds": [],
    "statusMessage": ""
  },
  "contributions": {
    "convictions":          { "pct": 0, "events": 0 },
    "adminPenalties":       { "pct": 0, "events": 0 },
    "cvsaInspections":      { "pct": 0, "events": 0 },
    "reportableCollisions": { "pct": 0, "events": 0 }
  },
  "fleetMonitoring": {
    "fleetAvg": 0, "fleetCurrent": 0,
    "monitoringAsOf": null, "monitoringAsOfRaw": "",
    "monitoringRFactor": 0, "monitoringStage": "",
    "totalCarriersAB": 0
  },
  "convictionTotals":   { "documents": 0, "count": 0, "points": 0 },
  "carrierIdentifiers": { "nscNumber": "", "mvidNumber": "", "operatingStatus": "" },
  "certificate": {
    "certNumber": "",
    "certEffective": null, "certEffectiveRaw": "",
    "certExpiry":    null, "certExpiryRaw":    "",
    "safetyRating": ""
  },
  "events": {
    "convictions": [],
    "cvsaInspections": [],
    "collisions": [],
    "adminPenalties": [],
    "monitoring": [],
    "facilityLicences": [],
    "safetyRatingHistory": [],
    "operatingStatusHistory": [],
    "historicalEvents": []
  }
}
```

Event-row templates:

```json
{
  "convictionItem": { "id": "", "seq": 0, "date": "", "time": "", "documentNo": "", "docketNo": "", "jurisdiction": "", "dateEntered": "", "issuingAgency": "", "location": "", "driver": "", "vehicle": "", "plate": "", "commodity": "", "actSection": "", "actDesc": "", "ccmtaCode": "", "convVehicle": "", "convDate": "", "activePts": 0 },
  "cvsaItem":       { "id": "", "seq": 0, "date": "", "time": "", "documentNo": "", "jurisdiction": "", "level": "", "result": "", "dateEntered": "", "agency": "", "location": "", "driver": "", "vehicles": [], "defects": [] },
  "collisionItem":  { "id": "", "seq": 0, "date": "", "time": "", "documentNo": "", "jurisdiction": "", "plate": "", "plateJur": "", "status": "", "preventable": "", "severity": "", "points": 0, "driver": "", "location": "", "vehicle": "", "vin": "", "activePts": 0 },
  "adminPenaltyItem":{ "id": "", "date": "", "documentNo": "", "description": "", "points": 0 },
  "monitoringItem": { "id": "", "date": "", "type": "MONT", "trkPct": 0, "busPct": 0, "avg": 0, "cur": 0, "score": 0, "convPct": 0, "inspPct": 0, "collPct": 0, "stage": "" },
  "historicalItem": { "id": "", "seq": 0, "date": "", "type": "", "jurisdiction": "", "description": "" }
}
```

### Populated example

```json
{
  "kind": "ab",
  "performanceCard": {
    "carrierName": "VM Motors Inc.",
    "rFactor": 0.062,
    "monitoringStage": "Not Monitored",
    "fleetRange": "30.0-44.9",
    "fleetType": "Truck",
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
      { "id": "ab-c-0001", "seq": 1, "date": "2025-11-18", "time": "14:02", "documentNo": "CNV-40231", "docketNo": "DKT-9912", "jurisdiction": "AB", "dateEntered": "2025-12-02", "issuingAgency": "Alberta Sheriff", "location": "Calgary, AB", "driver": "S. Thompson", "vehicle": "2019 Peterbilt", "plate": "PLT-001", "commodity": "General freight", "actSection": "HTA s.128(1)", "actDesc": "Speeding", "ccmtaCode": "0001", "convVehicle": "PLT-001", "convDate": "2025-12-15", "activePts": 3 }
    ],
    "cvsaInspections": [
      { "id": "ab-i-0001", "seq": 1, "date": "2026-01-14", "time": "11:20", "documentNo": "CVSA-12931", "jurisdiction": "AB", "level": "Level 2", "result": "Pass", "dateEntered": "2026-01-16", "agency": "Alberta Sheriff", "location": "Leduc, AB", "driver": "S. Thompson",
        "vehicles": [ { "type": "P", "plate": "PLT-001", "jurisdiction": "AB", "vin": "1XKYD49X8DJ309234", "year": 2019, "make": "Peterbilt", "cvsaDecal": "DE-4421" } ],
        "defects": [] },
      { "id": "ab-i-0002", "seq": 2, "date": "2025-10-22", "time": "15:05", "documentNo": "CVSA-12801", "jurisdiction": "AB", "level": "Level 1", "result": "Out of Service", "dateEntered": "2025-10-23", "agency": "RCMP", "location": "Red Deer, AB", "driver": "M. Lee",
        "vehicles": [ { "type": "P", "plate": "PLT-003", "jurisdiction": "AB", "vin": "1FUJGHDV9CLBK1234", "year": 2020, "make": "Freightliner", "cvsaDecal": "" } ],
        "defects": [ { "code": "393.47A-BSF", "label": "Inadequate brake stopping distance", "oos": 1, "req": 0, "total": 1, "pct": 100 } ] }
    ],
    "collisions": [
      { "id": "ab-col-0001", "seq": 1, "date": "2025-09-07", "time": "17:14", "documentNo": "COL-8812", "jurisdiction": "AB", "plate": "PLT-002", "plateJur": "AB", "status": "Closed", "preventable": "Preventable", "severity": "Property Damage", "points": 2, "driver": "M. Lee", "location": "Highway 2, AB", "vehicle": "2021 Volvo", "vin": "4V4NC9GH2PN123456", "activePts": 2 }
    ],
    "adminPenalties": [],
    "monitoring": [
      { "id": "ab-m-0001", "date": "2026-01-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.189, "cur": 0.185, "score": 0.185, "convPct": 34.6, "inspPct": 32.3, "collPct": 33.1, "stage": "Not on Monitoring" },
      { "id": "ab-m-0002", "date": "2025-12-31", "type": "MONT", "trkPct": 100, "busPct": 0, "avg": 0.201, "cur": 0.192, "score": 0.192, "convPct": 35.2, "inspPct": 31.8, "collPct": 33.0, "stage": "Not on Monitoring" }
    ],
    "facilityLicences": [],
    "safetyRatingHistory":    [ { "seq": 1, "effective": "2026-01-07", "expiry": "2028-12-31", "description": "Satisfactory Unaudited", "comments": "Issued at renewal" } ],
    "operatingStatusHistory": [ { "seq": 1, "effective": "2022-03-15", "inactive": null,       "description": "Federal" } ],
    "historicalEvents": [
      { "id": "ab-h-0001", "seq": 1, "date": "2026-01-31", "type": "MONT", "jurisdiction": "AB", "description": "Monthly R-Factor snapshot 0.185" },
      { "id": "ab-h-0002", "seq": 2, "date": "2025-11-18", "type": "CONV", "jurisdiction": "AB", "description": "HTA 128(1) Speeding — 3 pts" },
      { "id": "ab-h-0003", "seq": 3, "date": "2025-10-22", "type": "CVSA", "jurisdiction": "AB", "description": "Level 1 — Out of Service (brake defect)" }
    ]
  }
}
```

---

## 4. BC NSC — `kind: "bc"`

### Empty template

```json
{
  "kind": "bc",
  "demographics": {
    "carrierName": "", "nscNumber": "", "jurisdiction": "BC",
    "primaryBusinessType": "", "mailingAddress": "",
    "certificateIssueDate": null,
    "extraProvincial": false, "premiumCarrier": false,
    "weigh2GoBC": false, "preventativeMaintenance": false,
    "numberOfLicensedVehicles": 0,
    "reportRunDate": null, "profileFrom": null, "profileTo": null
  },
  "certificate": {
    "certificateStatus": "", "safetyRating": "",
    "profileStatus": "", "auditStatus": ""
  },
  "complianceReview": {
    "asOfDate": null, "averageFleetSize": 0,
    "scores": [
      { "category": "Contraventions",        "score": 0, "events": 0 },
      { "category": "CVSA (Out of Service)", "score": 0, "events": 0 },
      { "category": "Accidents",             "score": 0, "events": 0 }
    ],
    "totalScore": 0
  },
  "thresholds": [],
  "events": {
    "profileScores":   [],
    "activeFleet":     [],
    "driverGuilty":    [],
    "carrierGuilty":   [],
    "driverPending":   [],
    "carrierPending":  [],
    "cvsaInspections": [],
    "accidents":       [],
    "auditSummary":    [],
    "cvip":            []
  }
}
```

Event-row templates:

```json
{
  "profileScoreItem":  { "id": "", "month": "", "vd": 0, "ad": 0, "avg": 0, "contra": 0, "cvsa": 0, "acc": 0, "total": 0 },
  "activeFleetItem":   { "id": "", "regi": "", "plate": "", "year": 0, "make": "", "owner": "", "gvw": 0 },
  "contraventionItem": { "id": "", "driverName": "", "dl": "", "dlJur": "", "date": "", "time": "", "ticket": "", "plate": "", "plateJur": "BC", "location": "", "juris": "", "dispDate": "", "act": "", "section": "", "desc": "", "equiv": "", "pts": 0 },
  "cvsaInspectionItem":{ "id": "", "date": "", "inspectionNo": "", "level": "", "plate": "", "driver": "", "defects": "", "result": "" },
  "accidentItem":      { "id": "", "date": "", "time": "", "report": "", "location": "", "jur": "", "driverName": "", "dl": "", "dlJur": "", "plate": "", "plateJur": "BC", "regi": "", "vehDesc": "", "type": "", "fault": "", "charges": "No", "pts": 0 },
  "auditItem":         { "id": "", "date": "", "auditType": "", "result": "", "notes": "" },
  "cvipItem":          { "id": "", "regi": "", "plate": "", "vehicle": "", "date": "", "type": "", "facility": "", "confirmation": "", "decal": "", "expiry": "", "result": "" }
}
```

### Populated example

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
      { "id": "bc-ps-01", "month": "2025-03", "vd": 28308, "ad": 365, "avg": 77.56, "contra": 0.30, "cvsa": 0.31, "acc": 0.00, "total": 0.61 },
      { "id": "bc-ps-02", "month": "2025-02", "vd": 28186, "ad": 365, "avg": 77.22, "contra": 0.30, "cvsa": 0.31, "acc": 0.05, "total": 0.66 },
      { "id": "bc-ps-03", "month": "2025-01", "vd": 28080, "ad": 366, "avg": 76.72, "contra": 0.20, "cvsa": 0.23, "acc": 0.05, "total": 0.48 }
    ],
    "activeFleet": [
      { "id": "bc-fl-01", "regi": "10537552", "plate": "69124P", "year": 2006, "make": "FREIGHTLIN", "owner": "Inertia Carrier Ltd.", "gvw": 25854 },
      { "id": "bc-fl-02", "regi": "11081163", "plate": "68012P", "year": 2015, "make": "VOLVO",      "owner": "Inertia Carrier Ltd.", "gvw": 25854 }
    ],
    "driverGuilty": [
      { "id": "bc-dg-01", "driverName": "BAJWA, MANJOT", "dl": "B0209516098126", "dlJur": "ON", "date": "2024-12-24", "time": "00:00", "ticket": "1333765", "plate": "72843P", "plateJur": "BC", "location": "BALGONIE", "juris": "SK", "dispDate": "2025-01-16", "act": "HT", "section": "6;b", "desc": "Improper use of lights", "equiv": "0323", "pts": 2 }
    ],
    "carrierGuilty":  [ { "id": "bc-cg-01", "driverName": "", "dl": "", "dlJur": "BC", "date": "2024-11-05", "time": "", "ticket": "C-45203", "plate": "", "plateJur": "BC", "location": "KAMLOOPS", "juris": "BC", "dispDate": "2024-12-12", "act": "MVA", "section": "37.27(1)", "desc": "Carrier failed to maintain records", "equiv": "", "pts": 2 } ],
    "driverPending":  [ { "id": "bc-dp-01", "driverName": "SINGH, AMRITPAL", "dl": "S4490169094", "dlJur": "ON", "date": "2025-02-14", "time": "08:40", "ticket": "P-118822", "plate": "68042P", "plateJur": "BC", "location": "VANCOUVER", "juris": "BC", "dispDate": "", "act": "MVA", "section": "150.1", "desc": "Fail to keep right (pending)", "equiv": "0303", "pts": 0 } ],
    "carrierPending": [ { "id": "bc-cp-01", "driverName": "", "dl": "", "dlJur": "BC", "date": "2025-03-02", "time": "", "ticket": "C-58440", "plate": "", "plateJur": "BC", "location": "BURNABY", "juris": "BC", "dispDate": "", "act": "MVA", "section": "234", "desc": "Logbook audit discrepancy (pending)", "equiv": "", "pts": 0 } ],
    "cvsaInspections": [
      { "id": "bc-cv-01", "date": "2025-01-22", "inspectionNo": "EA602200100", "level": "Level 1", "plate": "68042P", "driver": "Singh, A.", "defects": "Brakes", "result": "Out of Service" },
      { "id": "bc-cv-02", "date": "2024-11-14", "inspectionNo": "EA602012990", "level": "Level 2", "plate": "72843P", "driver": "Bhullar",   "defects": "Lighting", "result": "Warning" }
    ],
    "accidents": [
      { "id": "bc-ac-01", "date": "2023-03-03", "time": "09:48", "report": "6653022", "location": "PICKERING, BAYLY ST", "jur": "ON", "driverName": "KHAIRA, EKAMPREET SINGH", "dl": "K31462008981001", "dlJur": "ON", "plate": "76118P", "plateJur": "BC", "regi": "14199432", "vehDesc": "", "type": "Property", "fault": "At Fault", "charges": "No", "pts": 2 },
      { "id": "bc-ac-02", "date": "2022-12-03", "time": "00:00", "report": "6652780", "location": "KENORA, 17",          "jur": "ON", "driverName": "HARJOT SINGH",            "dl": "H00670000970520", "dlJur": "ON", "plate": "74162P", "plateJur": "BC", "regi": "13379228", "vehDesc": "", "type": "Injury",   "fault": "At Fault", "charges": "No", "pts": 4 }
    ],
    "auditSummary": [],
    "cvip": [
      { "id": "bc-cvip-01", "regi": "10537552", "plate": "69124P", "vehicle": "2006 FREIGHTLIN", "date": "2022-04-20", "type": "N&O",  "facility": "",      "confirmation": "FR66236",  "decal": "",       "expiry": "",           "result": "N&O 2" },
      { "id": "bc-cvip-02", "regi": "11081163", "plate": "68012P", "vehicle": "2015 VOLVO",      "date": "2022-01-05", "type": "CVIP", "facility": "S6903", "confirmation": "15934668", "decal": "FR17405","expiry": "2022-07-31", "result": "Pass (Repair Same Day)" }
    ]
  }
}
```

---

## 5. PEI NSC — `kind: "pe"`

### Empty template

```json
{
  "kind": "pe",
  "carrier":     { "carrierName": "", "nscNumber": "", "profileAsOf": null, "jurisdiction": "Prince Edward Island" },
  "latestPull":  { "collisionPoints": 0, "convictionPoints": 0, "inspectionPoints": 0, "totalPoints": 0, "maxPoints": 55, "pctOfMax": 0 },
  "fleet":       { "currentActiveVehicles": 0, "currentActiveVehiclesAtLastAssessment": 0 },
  "certificate": { "safetyRating": "", "certStatus": "", "auditStatus": "" },
  "events": {
    "collisions":  [],
    "convictions": [],
    "inspections": [],
    "audits":      []
  }
}
```

Event-row templates:

```json
{
  "collisionItem":  { "id": "", "seq": 0, "date": "", "severity": "", "caseNum": "", "fault": "", "vehicles": 0, "killed": 0, "injured": 0, "pts": 0 },
  "convictionItem": { "id": "", "seq": 0, "date": "", "loc": "", "charge": "", "natCode": "", "pts": 0 },
  "inspectionItem": { "id": "", "seq": 0, "date": "", "cvsaLevel": 0, "log": "", "tdg": "", "loadSecurity": "", "driverName": "", "status": "" },
  "auditItem":      { "id": "", "seq": 0, "date": "", "result": "", "auditType": "" }
}
```

### Populated example

```json
{
  "kind": "pe",
  "carrier":     { "carrierName": "BUSINESS PORTERS INC.", "nscNumber": "PE316583", "profileAsOf": "2021-07-14", "jurisdiction": "Prince Edward Island" },
  "latestPull":  { "collisionPoints": 8, "convictionPoints": 6, "inspectionPoints": 9, "totalPoints": 23, "maxPoints": 55, "pctOfMax": 41.8 },
  "fleet":       { "currentActiveVehicles": 19, "currentActiveVehiclesAtLastAssessment": 19 },
  "certificate": { "safetyRating": "Conditional", "certStatus": "Active", "auditStatus": "Unaudited" },
  "events": {
    "collisions": [
      { "id": "pe-col-01", "seq": 1, "date": "2021-05-12", "severity": "Property Damage", "caseNum": "BC2021-0583", "fault": "At Fault",      "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 },
      { "id": "pe-col-02", "seq": 2, "date": "2021-02-18", "severity": "Injury",          "caseNum": "AB2021-1147", "fault": "At Fault",      "vehicles": 2, "killed": 0, "injured": 1, "pts": 4 },
      { "id": "pe-col-03", "seq": 3, "date": "2020-11-03", "severity": "Property Damage", "caseNum": "ON2020-8822", "fault": "Not at Fault",  "vehicles": 1, "killed": 0, "injured": 0, "pts": 0 },
      { "id": "pe-col-04", "seq": 4, "date": "2020-08-27", "severity": "Property Damage", "caseNum": "QC2020-5519", "fault": "Fault Unknown", "vehicles": 2, "killed": 0, "injured": 0, "pts": 2 }
    ],
    "convictions": [
      { "id": "pe-con-01", "seq": 1, "date": "2021-03-04", "loc": "QC", "charge": "SIGNALISATION NON RESPECTÉE",    "natCode": "317", "pts": 3 },
      { "id": "pe-con-02", "seq": 2, "date": "2021-01-14", "loc": "BC", "charge": "DISOBEY TRAFFIC CONTROL DEVICE", "natCode": "317", "pts": 3 }
    ],
    "inspections": [
      { "id": "pe-ins-01", "seq":  1, "date": "2022-11-22", "cvsaLevel": 3, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SINGH",        "status": "P" },
      { "id": "pe-ins-02", "seq":  2, "date": "2022-10-07", "cvsaLevel": 3, "log": "Warning", "tdg": "Passed", "loadSecurity": "Passed", "driverName": "NAVJOT SINGH", "status": "W" },
      { "id": "pe-ins-03", "seq":  3, "date": "2021-06-10", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "RATTEA SINGH", "status": "P" },
      { "id": "pe-ins-04", "seq":  4, "date": "2021-03-23", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "SINGH",        "status": "O" },
      { "id": "pe-ins-05", "seq":  5, "date": "2020-07-29", "cvsaLevel": 1, "log": "Passed",  "tdg": "Passed", "loadSecurity": "Passed", "driverName": "INDERJEET",    "status": "O" }
    ],
    "audits": [
      { "id": "pe-aud-01", "seq": 1, "date": "2021-01-13", "result": "NON-COMPLIANT", "auditType": "Compliance" }
    ]
  }
}
```

---

## 6. Nova Scotia NSC — `kind: "ns"`

### Empty template

```json
{
  "kind": "ns",
  "carrier":    { "carrierName": "", "nscNumber": "", "profileAsOf": null },
  "latestPull": { "collisionScore": 0, "convictionScore": 0, "inspectionScore": 0 },
  "fleet":      { "currentFleetSize": 0, "avgDailyFleetSize": 0 },
  "thresholds": { "scoreLevel1": 0, "scoreLevel2": 0, "scoreLevel3": 0, "safetyRating": "", "safetyRatingExpires": null },
  "events": {
    "cvsaInspections": [],
    "auditHistory":    [],
    "convictions":     [],
    "collisions":      [],
    "trafficOffences": []
  }
}
```

Event-row templates:

```json
{
  "cvsaItem":         { "id": "", "seq": 0, "date": "", "cvsaNumber": "", "jur": "", "plates": "", "driverMaster": "", "result": "", "demeritPts": 0 },
  "auditItem":        { "id": "", "seq": 0, "date": "", "auditNum": "", "sequence": "", "result": "" },
  "convictionItem":   { "id": "", "seq": 0, "offenceDate": "", "convDate": "", "ticket": "", "offence": "", "driverMaster": "", "sectionActReg": "", "pts": 0 },
  "collisionItem":    { "id": "", "seq": 0, "date": "", "severity": "", "location": "", "driverMaster": "", "driverJur": "", "plate": "", "plateJur": "", "pts": 0 },
  "trafficOffenceItem":{ "id": "", "seq": 0, "offenceDate": "", "plate": "", "driverMaster": "", "statute": "", "description": "" }
}
```

### Populated example

```json
{
  "kind": "ns",
  "carrier":    { "carrierName": "MAPLE LEAF FORCE LIMITED", "nscNumber": "MAPLE739646000", "profileAsOf": "2022-08-19" },
  "latestPull": { "collisionScore": 0.0000, "convictionScore": 6.2510, "inspectionScore": 13.4179 },
  "fleet":      { "currentFleetSize": 14, "avgDailyFleetSize": 14.79 },
  "thresholds": { "scoreLevel1": 39.7531, "scoreLevel2": 45.9602, "scoreLevel3": 60.1836, "safetyRating": "Satisfactory - Unaudited", "safetyRatingExpires": null },
  "events": {
    "cvsaInspections": [
      { "id": "ns-cv-01", "seq":  1, "date": "2022-11-29", "cvsaNumber": "445131-1",     "jur": "NB", "plates": "PR45273 / MB", "driverMaster": "D4391-00009-90407 / ON", "result": "Passed",         "demeritPts": 0 },
      { "id": "ns-cv-02", "seq":  2, "date": "2023-03-16", "cvsaNumber": "666079",       "jur": "NS", "plates": "PR49343 / NS", "driverMaster": "J64570000940315 / ON",   "result": "Defect Noted",   "demeritPts": 0 },
      { "id": "ns-cv-03", "seq":  3, "date": "2023-04-25", "cvsaNumber": "667415",       "jur": "NS", "plates": "TC1771 / MB",  "driverMaster": "SINGH210898005 / NS",    "result": "Out-of-Service", "demeritPts": 3 },
      { "id": "ns-cv-04", "seq":  4, "date": "2023-06-30", "cvsaNumber": "ONEA01571114", "jur": "ON", "plates": "PT82489 / NS", "driverMaster": "S04036398930615 / ON",   "result": "Passed",         "demeritPts": 0 }
    ],
    "auditHistory": [
      { "id": "ns-au-01", "seq": 1, "date": "2023-04-28", "auditNum": "34843", "sequence": "1", "result": "Compliant" }
    ],
    "convictions": [
      { "id": "ns-cn-01", "seq": 1, "offenceDate": "2020-11-19", "convDate": "2021-01-19", "ticket": "5488801", "offence": "OPER VEH NOT CONFORMING WITH SPECIAL PERMIT", "driverMaster": "CZIPP141270003", "sectionActReg": "11 9 WDVR", "pts": 3 }
    ],
    "collisions": [
      { "id": "ns-co-01", "seq": 1, "date": "2020-09-04", "severity": "PROPERTY DAMAGE", "location": "MONTREAL / QC", "driverMaster": "", "driverJur": "ON", "plate": "PR42409", "plateJur": "NS", "pts": 0 }
    ],
    "trafficOffences": [
      { "id": "ns-to-01", "seq": 1, "offenceDate": "2023-09-05", "plate": "PR45273", "driverMaster": "SINGH120992005",  "statute": "CVDH 7 1 A", "description": "FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME" },
      { "id": "ns-to-02", "seq": 2, "offenceDate": "2024-06-20", "plate": "PR45276", "driverMaster": "S04036398930615", "statute": "MVA 20 2",   "description": "LICENSE PLATE NOT CLEARLY LEGIBLE (NUMBERS WEARING OFF)" }
    ]
  }
}
```

---

## 7. Per-PDF checklist — what to extract

| Source PDF | Page | Top-level keys to emit |
|---|---|---|
| FMCSA SMS Carrier Profile + roadside inspection reports | FMCSA tab | `basics`, `inspectionsByMonth`, `oosDonut`, `topViolations`, `levelStats`, `stateMetrics`, `inspections` |
| Ontario MTO CVOR Abstract + inspection reports | CVOR tab | `overall`, `categories`, `oosRates`, `recommendedActions`, `mileage`, `levelComparison`, `periodicReports`, `inspections` |
| Alberta NSC Carrier Profile | Alberta tab | `performanceCard`, `contributions`, `fleetMonitoring`, `convictionTotals`, `carrierIdentifiers`, `certificate`, `events.*` |
| BC NSC Carrier Profile (CVSE) | BC tab | `demographics`, `certificate`, `complianceReview`, `thresholds`, `events.*` |
| PEI NSC Carrier Profile | PEI tab | `carrier`, `latestPull`, `fleet`, `certificate`, `events.*` |
| Nova Scotia NSC Carrier Profile | NS tab | `carrier`, `latestPull`, `fleet`, `thresholds`, `events.*` |

---

## 8. Enum normalization (cross-jurisdiction)

| Concept | FMCSA | CVOR | AB | BC | PEI | NS |
|---|---|---|---|---|---|---|
| Severity (max) | n/a | n/a | `"Fatal"` | `"Fatality"` | `"Fatality"` | `"FATAL"` |
| OOS result | `"OOS"` | `"OOS"` | `"Out of Service"` | `"Out of Service"` | `"Out of Service"` | `"Out-of-Service"` |
| Fault wording | n/a | n/a | n/a | `"No Fault"` | `"Not at Fault"` | n/a |
| Collisions "Property Damage" | n/a | n/a | `"Property Damage"` | `"Property"` | `"Property Damage"` | `"PROPERTY DAMAGE"` |
| CVSA result "Pass" | n/a | n/a | `"Pass"` | `"Pass"` | `"P"` (status) | `"Passed"` |

Build a jurisdiction-specific normalization map — do **not** reuse strings
across pages.

---

## 9. Validation

- **Totals reconciliation.** Sum `events.*.pts` and compare against the
  header figure (`latestPull.totalPoints` / `complianceReview.totalScore`
  etc.). Emit a `warnings: []` array on the payload if they disagree.
- **Required keys.** Every top-level key in each empty template must be
  present, even if the value is empty. Downstream consumers rely on shape,
  not optional-chaining.
- **Numbers, not strings.** All points / scores / counts / percentages
  are numbers (`23`, `0.61`, `77.56`), never `"23"`.
