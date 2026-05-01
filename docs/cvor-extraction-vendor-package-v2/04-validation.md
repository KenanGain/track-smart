# 04 — Validation Rules & Edge Cases

Rules your extractor should apply / be aware of.

---

## Required-field rules

A response **must** include all required fields from the JSON Schema. If you can't find one, return `422 MISSING_REQUIRED` with the JSON path:

```json
{ "error": { "code": "MISSING_REQUIRED", "message": "Could not find Performance Summary table.", "field": "pull.colContrib", "page": 2 } }
```

Required (will trip `MISSING_REQUIRED` if missing):

- `carrier.cvorNumber`, `carrier.legalName`, `carrier.cvorStatus`, `carrier.originalIssueDate`, `carrier.safetyRating`, `carrier.vehicleTypes`, `carrier.dangerousGoods`
- `pull.reportDate`, `pull.rating`, `pull.colContrib`, `pull.conContrib`, `pull.insContrib`, `pull.colPctOfThresh`, `pull.conPctOfThresh`, `pull.insPctOfThresh`, `pull.collisionEvents`, `pull.convictionEvents`, `pull.totalCollisionPoints`, `pull.convictionPoints`, `pull.oosOverall`, `pull.oosVehicle`, `pull.oosDriver`, `pull.trucks`, `pull.drivers`, `pull.onMiles`, `pull.canadaMiles`, `pull.usMexicoMiles`, `pull.totalMiles`, `pull.inspectionsByLevel`, `pull.inspectionsOosByLevel`

`inspectionEvents[]` may be empty (`[]`). It must NOT be omitted.

---

## Format normalization

| Field | Rule |
|---|---|
| `cvorNumber` | Strip dashes/spaces. Validate `^\d{9}$`. Re-emit with dashes: `XXX-XXX-XXX`. |
| Dates | ISO 8601 `YYYY-MM-DD`. The PDF uses `YYYY-MM-DD` already. |
| Datetimes (`searchDate`) | ISO 8601 `YYYY-MM-DDTHH:MM:SS-04:00` (Eastern). |
| Times (`startTime`, `endTime`) | 24-hour `HH:MM`. PDF often uses `14:15`. |
| Percentages | Decimal numbers, NOT strings. `26.22` not `"26.22%"` and not `0.2622`. |
| Booleans | `Yes` → `true`, `No` → `false`. `Y` → `true`, `N` → `false`. |
| Mileage | **Kilometres**. Strip thousands separators. `Not Applicable` → `0`. |
| Counts | Integers. `-` or empty → `0`. |
| Vehicle types | Array. Split on commas / slashes. Trim. |

---

## Sanity / cross-field checks (warn, don't fail)

These are nice-to-have validations. Include them as warnings in the response if possible (we'll surface them on the upload review page).

```json
{
  "warnings": [
    { "code": "RFACTOR_DRIFT", "field": "pull.rating",
      "message": "colContrib + conContrib + insContrib differs from rating by 0.12" }
  ]
}
```

| Check | Tolerance |
|---|---|
| `colContrib + conContrib + insContrib ≈ rating` | drift ≤ 0.1 |
| `onMiles + canadaMiles + usMexicoMiles ≈ totalMiles` | drift ≤ 1% |
| `colContrib ≈ colPctOfThresh × 0.40` | drift ≤ 0.05 |
| `conContrib ≈ conPctOfThresh × 0.40` | drift ≤ 0.05 |
| `insContrib ≈ insPctOfThresh × 0.20` | drift ≤ 0.05 |
| `collWithPoints + collWithoutPoints ≈ collisionEvents` | drift ≤ 1 |
| `sum(inspectionsByLevel.l1..l5) ≈ totalVehiclesInspected` | drift ≤ 1 |
| `inspectionThreshold.totalInspectionPoints ≈ 0.6875 × (driverPointsAssigned + vehiclePointsAssigned)` | drift ≤ 1 |

---

## OCR pitfalls (observed in the sample)

The MTO PDF is a scanned image with no text layer. Common OCR failures we've seen:

| Confusion | Fix |
|---|---|
| `0` / `O` / `Q` in CVOR numbers and CVIRs | Restrict to digits via regex; CVIR is `^[A-Z]{2,4}\d+$` |
| `1` / `l` / `I` | Same — known CVIR prefixes are 2–4 letter province codes |
| `5` / `S` | Use surrounding context (pure-digit cells) |
| Hyphens in `CVOR / RIN #` field | The label literally contains `/`. Don't split on `/`. |
| Right-side values rendered far from labels | Some labels have 200+ px of whitespace before the value. Allow for it. |
| Address blocks span 2-3 lines | Concatenate consecutive lines under the `Address` label until the next labelled section |
| `Not Applicable` in km cells | Emit `0`, not `null`, for `usMexicoMiles` |
| Asterisk on `Category*` is OOS-marker, not a footnote | Treat `*` on a category as `oos: true` |

---

## Pull-vs-pull edge cases

- **Same carrier, same pull date, multiple uploads** — your API doesn't dedupe. We do, on `(cvorNumber, reportDate)`.
- **Pulls where `oosOverall = oosVehicle = oosDriver = 0`** — happens when the pull window had zero CVSA inspections. Emit `0`s, not `null`. Our UI renders `-` for zeros.
- **Pulls with zero collisions / zero convictions** — emit `0`s, not `null`.
- **Inspection events with no defects** (Clean inspection) — emit `defects: []`. `status: "OK"`.
- **Vehicles[1] (second vehicle) absent** — emit a 1-element `vehicles` array. Don't pad with nulls.

---

## What to do when the form version changes

If the PDF footer reads anything other than `SR-LV-029A (2021/10)`, attach a warning:

```json
{ "warnings": [{ "code": "FORM_VERSION_UNKNOWN", "message": "Form version SR-LV-029B (2027/03) not in test fixtures.", "field": "source.formVersion" }] }
```

Still attempt extraction; we'll review and update the parser as needed.
