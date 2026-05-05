# Extraction Walkthrough — 9496971 CANADA INC (NSC ZZZZZ728361002)

This document maps every printed label on the raw PDF to its JSON path in
`extracted.json`. Open the raw PDF (`raw-pdfs/9496971_CANADA_INC_NS_Carrier_Profile.pdf`)
side by side with `annotated.pdf` while reading.

---

## Page 1 — Header / demographics / scores / audit / first 7 CVSA rows

### Header banner (yellow)
| PDF label / value | JSON path |
|---|---|
| `Date: 26/11/2024` | `source.reportRunDate` |
| `Department of Public Works` | (label only — no JSON value) |
| `Carrier Profile Abstract` / `as of 26/11/2024` | `source.profileAsOf` + `pull.asOfDate` |
| `NSC #: ZZZZZ728361002` | `carrier.nscNumber` |

### Demographics block (green)
| PDF label | Value | JSON path |
|---|---|---|
| `Name:` | `9496971 CANADA INC` | `carrier.demographics.carrierName` |
| `Contact Name:` | `HARSIMRAN SINGH` | `carrier.demographics.contactName` |
| `Contact Title:` | `DIRECTOR` | `carrier.demographics.contactTitle` |
| `Phone:` | `902-440-0679` | `carrier.demographics.phone` |
| `Mailing Address` | `409 BLUEWATER RD, BEDFORD NS, B4B1J7` (joined from 3 PDF lines) | `carrier.demographics.mailingAddress` |
| `Physical Address` | `409 BLUEWATER RD, BEDFORD NS, B4B1J7` | `carrier.demographics.physicalAddress` |
| `Principal Place of Business:` | `409 BLUEWATER RD` | `carrier.demographics.principalPlace` |
| `U.S. DOT#:` | (blank) | `carrier.demographics.usDotNumber` (null) |
| `IRP #:` | `9110501` | `carrier.demographics.irpNumber` |
| `MVI Stn #:` | `0` | `carrier.demographics.mviStnNumber` |
| `Current Fleet Size:` | `7` | `carrier.demographics.currentFleetSize` |
| `Avg. Daily Fleet Size:` | `7.15` | `carrier.demographics.avgDailyFleetSize` |
| `Safety Rating:` | `SATISFACTORY` | `carrier.certificate.safetyRating` |
| `Expires:` | `12/2024` | `carrier.certificate.safetyRatingExpires` |

### Safety Rating Score thresholds (blue)
| Column | Value | JSON path |
|---|---|---|
| Level 1 | `39.7531` | `pull.thresholds.level1` |
| Level 2 | `45.9602` | `pull.thresholds.level2` |
| Level 3 | `60.1836` | `pull.thresholds.level3` |

### Indexed Score area (blue)
| Component | Value | JSON path |
|---|---|---|
| Convictions | `0.0000` | `pull.scores.convictions` |
| Inspections | `0.3411` | `pull.scores.inspections` |
| Collisions | `0.0000` | `pull.scores.collisions` |
| Total Demerit Score | `0.3411` | `pull.scores.totalDemerit` |

### Audit History (blue)
| PDF row | JSON path |
|---|---|
| `28/04/2023 / 34843 / 1 / Compliant` | `pull.auditHistory[0]` |

### CVSA Inspection table (purple) — first 7 rows
The page-1 CVSA block lists rows #1-#7 of the 50-row table. Each row maps to
one element of `pull.cvsaInspections[]`:
- `seq` — assigned by extractor in document order (1..50)
- `date` — `dd/mm/yyyy`
- `cvsaNumber` — alphanumeric (e.g. `445131-1`, `ONEA01539682`, `D700300267`)
- `jur` — 2-3 letter jurisdiction (`NB`, `ON`, `NS`, `ME`, `NY`, `DE`)
- `plates[]` — 1-2 entries, each printed as `{plate} / {jur}`
- `driverMaster` — printed as `{id} / {jur}`, may span 2 lines when the trailing jur wraps
- `result` — `Passed` / `Defect Noted` / `Out-of-Service`
- `demeritPts` — `0` for Passed/Defect Noted, `3` for Out-of-Service

### Footer banner
| PDF text | JSON path |
|---|---|
| `ZZZZZ728361002 Abstract / Page 1 of 3` | (label only — `source.fileName` and `pageCount` derived from the file system) |

---

## Page 2 — CVSA continuation (rows #8-#34)

Same column layout as page 1. The "CVSA Inspection" + column header block reprints at the top of every page.

The Out-of-Service row #13 (`25/04/2023 / 667415 / NS / TC1771 / MB + PR49497 / NS / SINGH210898005 / NS`) carries `demeritPts: 3` — note the disambiguation: the LAST plate-shaped line (`SINGH210898005 / NS`) is the **driver master**, not a third plate, even though its shape matches the plate regex.

A second Out-of-Service row #20 (`30/09/2023 / ONEA01591843`) likewise carries 3 points.

A third Out-of-Service row #33 (`20/02/2024 / 9450001572 / ME`) carries 3 points.

---

## Page 3 — CVSA tail / Totals / Convictions / Collisions / Warnings

### CVSA tail rows (#35-#50)
Same layout. Row #46 (`24/04/2024 / D700300358 / NY`) is the fourth and final Out-of-Service row.

### CVSA Totals (purple)
| PDF row | JSON path |
|---|---|
| `Totals 50` | `pull.cvsaTotals.records` |
| `Totals 12` (= 4 OOS × 3 pts) | `pull.cvsaTotals.demeritPts` |

### Convictions (orange) — empty for this carrier
| PDF text | JSON path |
|---|---|
| `Convictions` | (section header) |
| `There are no Conviction records.` | `pull.convictions[]` (empty array) |

### Collisions (red) — empty for this carrier
| PDF text | JSON path |
|---|---|
| `Collisions` | (section header) |
| `There are no Collision records.` | `pull.collisions[]` (empty array) |

### Traffic Offence Reports / Warning Tickets (yellow)
Two warning rows on this carrier. Columns: Offence Date / Plate Number / Driver Master No. / Statute / Sect. Sub-Sect / Clause + free-text description.

| # | Offence Date | Plate | Driver Master | Statute | Description |
|---|---|---|---|---|---|
| 1 | `05/09/2023` | `PR45273` | `SINGH120992005` | `CVDH 7 1 A` | `FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME` |
| 2 | `20/06/2024` | `PR45276` | `S04036398930615` | `MVA 20 2` | `LICENSE PLATE NOT CLEARLY LEGIBLE ( NUMBERS WEARING OFF )` |

Each row maps to `pull.warningTickets[i]` with `seq = i + 1`.

| PDF row | JSON path |
|---|---|
| `Totals 2` | `pull.warningTotals.records` |

---

## Cross-reference: validator checks pass for this PDF

1. ✅ Schema validates
2. ✅ `0.0000 + 0.3411 + 0.0000 = 0.3411` (totalDemerit)
3. ✅ `cvsaTotals.records (50) == len(cvsaInspections) (50)`
4. ✅ `cvsaTotals.demeritPts (12) == 3+3+3+3 = 12`
5. ✅ All 4 OOS rows have `demeritPts: 3`
6. ✅ All non-OOS rows have `demeritPts: 0`
7. ✅ `warningTotals.records (2) == len(warningTickets) (2)`
8. ✅ `39.7531 < 45.9602 < 60.1836`
9. ✅ `source.profileAsOf == pull.asOfDate == 26/11/2024`
10. ✅ CVSA seqs are 1..50 contiguous

`python validate.py` → `1/1 OK`.
