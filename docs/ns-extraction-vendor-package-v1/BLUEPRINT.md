# Blueprint — Nova Scotia NSC Carrier Profile Abstract vendor package (v1)

## What an NS Carrier Profile Abstract looks like

The Nova Scotia **Department of Public Works — Carrier Profile Abstract** is a short text-PDF (the shipped sample is **3 pages**, real-world abstracts run 2-5 pages depending on event volume). Every page repeats a footer banner `<NSC#> Abstract  |  Page n of N`.

| Page | Content | Frontend home |
|---|---|---|
| **p1** | Cover header (Date / NSC# / Carrier name / Contact / Phone / addresses / IRP / MVI / fleet sizes / Safety Rating / Expires) + Safety Rating Score thresholds (Level 1/2/3) + Indexed Score area (Convictions / Inspections / Collisions / Total Demerit) + Audit History + first batch of CVSA Inspection rows | `NsNscData` (demographics + thresholds + scores + auditHistory[]) |
| **p2** | CVSA Inspection rows (continued) | `NsCvsaRow[]` |
| **p3** | CVSA Inspection rows (final) + Totals (records + demerit pts) + Convictions section (or "There are no Conviction records.") + Collisions section (or "There are no Collision records.") + Traffic Offence Reports (Warning Tickets) + Totals | `NsCvsaRow`, `NsConvictionRow`, `NsCollisionRow`, `NsWarningRow` |

**Note** — NS PDFs are **text-extractable**. Every label and value comes through `page.get_text()` and `search_for()` cleanly. No OCR needed.

## Data points → frontend mapping

The NS frontend renders three major surfaces, all of which consume sub-trees of `extracted.json`:

| Frontend block | Source field |
|---|---|
| `NscNsPerformanceCard` — sticky header + indexed score panel + threshold ladder + audit history + safety certificate | `carrier.demographics.*`, `carrier.certificate.*`, `pull.thresholds`, `pull.scores`, `pull.auditHistory[]` |
| `NscNsPerformanceBlock` — 5 expandable analysis rows (CVSA, Audits, Convictions, Collisions, Warnings) | `pull.cvsaInspections[]`, `pull.auditHistory[]`, `pull.convictions[]`, `pull.collisions[]`, `pull.warningTickets[]` |
| `NscNsPerformanceHistory` — pull-by-pull line chart | *Out of scope for v1.* The PDF is a single point-in-time abstract; pull history is synthesized over time on the carrier-management server, not in any single PDF. |

## NS rating system reference

Nova Scotia uses an **indexed demerit scoring system** (not raw event counts like BC). The carrier's Total Demerit Score is compared against three thresholds (Level 1/2/3) which are themselves a function of fleet size:

| Band | Range | Action |
|---|---|---|
| Low | 0 – Level 1 | None — performance within acceptable range |
| Moderate | Level 1 – Level 2 | Enhanced monitoring |
| High | Level 2 – Level 3 | Compliance interview required |
| Critical | ≥ Level 3 | Compliance audit / show-cause hearing |

The **minimum is always 0**. **Lower is better.** Level 3 is treated as the practical max (100% scaled).

For the shipped sample (`9496971 CANADA INC`, fleet 7):
- Level 1 = 39.7531
- Level 2 = 45.9602
- Level 3 = 60.1836
- Total Demerit = 0.3411 → **Low band** (well below Moderate threshold)

## Indexed score breakdown (`pull.scores`)

Three components, each weighted by event severity, fleet size, and recency:

- `convictions` — driver and carrier traffic conviction records
- `inspections` — CVSA and MVI inspection results, especially OOS
- `collisions`  — at-fault collision records, weighted by injury/fatality severity
- `totalDemerit = convictions + inspections + collisions`

Each component is independent — a high inspections score doesn't pull up convictions. The frontend tile system shows what % of Level 3 each component represents.

## CVSA demerit-points rule

NS assigns points for CVSA inspections per their result:

| Result | Demerit Points |
|---|--:|
| Passed | 0 |
| Defect Noted | 0 |
| **Out-of-Service** | **3** |

Validator check 5+6 enforce this ↔ relationship.

## Methodology — section by section

For each PDF we do this:

1. **Header (p1)** — Pull `Date`, `Carrier Profile Abstract as of <date>`, `NSC #`, contact info, addresses, IRP/MVI/fleet sizes, safety rating + expires. Anchors `source.*` + `carrier.demographics.*` + `carrier.certificate.*`.
2. **Safety Rating Score (p1)** — Pull the 3 numeric thresholds. Anchors `pull.thresholds.{level1,level2,level3}`.
3. **Indexed Score (p1)** — Pull the 4 component scores. Anchors `pull.scores.{convictions,inspections,collisions,totalDemerit}`.
4. **Audit History (p1)** — Per-audit rows with date / audit#/seq# / result.
5. **CVSA Inspection table (p1-p3)** — Per-inspection rows. Each row has 1-2 plate lines and a driver master that may itself span 2 lines (when the trailing 2-letter jurisdiction wraps). Always parse the LAST plate-shaped line as the driver master, not a third plate.
6. **Convictions (p3)** — Either "There are no Conviction records." (empty list) or per-row data with offence date, conv date, ticket, offence text, driver master, section/act/reg, demerit points.
7. **Collisions (p3)** — Either "There are no Collision records." (empty list) or per-row data with date, severity, location, driver master + jur, plate + jur, demerit points.
8. **Traffic Offence Reports / Warning Tickets (p3)** — Per-row data with offence date, plate, driver master, statute, description.

## How a vendor uses this package

```bash
# 1. Read README + this BLUEPRINT
# 2. Open the per-pdf folder
cd per-pdf/9496971_Canada_2024-11-26/

# 3. Open raw + annotated PDFs side by side:
#    raw-pdfs/9496971_CANADA_INC_NS_Carrier_Profile.pdf
#    per-pdf/9496971_Canada_2024-11-26/annotated.pdf

# 4. Read extraction-doc.md page by page; build your parser
# 5. (Optional) study scripts/extractor.py — it produces the shipped JSON
# 6. Run your API on the raw PDF; save output to extracted.json
# 7. Compare against the shipped extracted.json field by field
# 8. From package root:
cd ../..
python validate.py
# Exit 0 = ready to ship.
```

## Differences from BC / AB / CVOR / PEI vendor packages

1. **3 pages, not 37** — NS abstracts are radically shorter. No per-month rolling table, no per-vehicle Active Fleet, no CVIP records.
2. **Indexed demerit scoring** rather than raw violation counts — Convictions / Inspections / Collisions each get a single floating-point indexed score.
3. **Three thresholds (Level 1/2/3)** instead of BC's Satisfactory / Conditional / Unsatisfactory.
4. **Date format `dd/mm/yyyy`** rather than BC's `dd-MMM-yyyy`. Preserve as printed.
5. **Driver Master Number** identifier on every CVSA / Conviction / Collision / Warning row. Format `<id> / <jur>` and frequently spans two lines in the PDF (the trailing jur wraps).
6. **No driver/carrier contraventions split** like BC §4.1-4.4. NS just has a single Convictions list (and optional Warnings list).
7. **Footer banner** is `<NSC#> Abstract  Page n of N` — used as a fingerprint for sanity-checking that the right NSC# is on the right document.
