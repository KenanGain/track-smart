# 01 — Overview

## What is a CVOR?

**CVOR** = Commercial Vehicle Operator's Registration. A regulatory program run by Ontario MTO (Ministry of Transportation) for any operator running commercial vehicles >4,500 kg or buses (>10 passengers) in Ontario. Carriers must register, file annually, and maintain a "safety profile."

The **CVOR Carrier Safety Profile** PDF (also called the "Level I record" or "Carrier Abstract") is what MTO issues. It contains:

- Carrier identification (legal name, address, CVOR #, status, dates)
- Fleet snapshot (# of vehicles, # of drivers, vehicle types, dangerous goods flag)
- Travel kilometers (Ontario / Rest of Canada / US-Mexico / Total — annualized)
- 24-month rolling counts of:
  - Collisions (with points / not pointed / total)
  - Convictions (driver / vehicle / load / other / total)
  - Inspections (by level 1-5 / OOS by level)
- 24-month rolling rates (Vehicle OOS %, Driver OOS %, Overall OOS %)
- **Performance Summary (R-Factor)** — the audit score: Collision %, Conviction %, Inspection %, weighted into an Overall Violation Rate %
- KM-rate-change breakdown tables (used to verify R-Factor math)
- Inspection threshold formula (= 0.6875 × (driver pts + vehicle pts))
- **Intervention and Event Details** — chronological log of every Inspection / Conviction / Collision event in the 24-month window
- Travel kilometric history table (multi-year)

The PDF is **always 19 pages** for the typical operator (more for very active fleets). It's a **scanned image with no text layer** — OCR is required.

---

## Carrier-context primer

- **CVOR #** — globally unique 9-digit operator ID, format `XXX-XXX-XXX` (e.g. `138-903-258`). One CVOR per legal entity.
- **CVOR pull** — a single PDF generated on a specific date, containing a 24-month rolling window ending on that date. Same carrier → many pulls over time.
- **Period** — always **24 months** in current MTO format. Period header on every section: `From <start> to <end> (24 Months)`.
- **R-Factor / Overall Violation Rate** — composite score (0–100%) used by MTO to trigger interventions:
  - **0–35%** = Safe
  - **35–50%** = Warning
  - **50–85%** = Audit (MTO will book a compliance audit)
  - **85–100%** = Show Cause (MTO can suspend the CVOR)
  - **>100%** = Seizure
- **Safety Rating** — a separate, slower-moving label issued after an MTO audit (Excellent / Satisfactory / Satisfactory-Unaudited / Conditional / Unsatisfactory).

---

## Why we ingest pulls over time

The TrackSmart CVOR page is a **time-series view** of the carrier's R-Factor and underlying counts. Each upload becomes a row in `cvorPeriodicReports[]` and a dot on the chart.

The carrier in our sample (`3580768 CANADA INC.`) has 15 pulls between Jun 2024 and Apr 2026:

| # | Pull date | Rating | Zone |
|---|---|---:|---|
| 1 | 2024-06-23 | 24.29% | Safe |
| 2 | 2024-07-25 | 24.16% | Safe |
| 3 | 2024-10-21 | 26.55% | Safe |
| … | … | … | … |
| 14 | 2026-02-02 | 22.31% | Safe |
| 15 | 2026-04-02 | 21.81% | Safe |

Every uploaded PDF must produce one such row. The frontend handles deduplication and ordering — your API just returns one record per PDF.

---

## Scope of extraction

We split the data into **three sinks** based on lifecycle:

| Sink | Updates | Used by |
|---|---|---|
| **A. Carrier Identity** | Once per carrier (sticky) | Carrier Profile card |
| **B. Per-Pull Metric**   | One per upload (appended) | KPI cards, performance chart, Pull-by-Pull table, OOS chart, mileage summary, Inspections-by-Level cards |
| **C. Per-Inspection Event** | Many per upload (one per Inspection event in PDF event log) | Bottom CVOR Inspections list (drilldown for selected pull) |

Convictions and Collisions are NOT extracted as individual events — only their **aggregate counts and points** at the pull level (sink B).

See `02-data-model.md` for the field-by-field map.

---

## What the user does on our side (so you understand the context)

1. Goes to the carrier's profile → CVOR section.
2. Clicks **Upload CVOR**.
3. Drops one or more PDFs.
4. We send the PDF(s) to **your API**.
5. You return the JSON.
6. We persist + render. The carrier's CVOR page now shows the new pull on every chart and at the top of the Pull-by-Pull table.

If the same PDF is uploaded twice, **we** dedupe by `(cvorNumber, reportDate)`. Your API doesn't need state.
