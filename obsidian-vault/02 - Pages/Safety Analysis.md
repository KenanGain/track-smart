---
name: Safety Analysis
description: CVOR-style safety analysis dashboard with charts
type: page
tags: [page, safety, analysis]
---

# Safety Analysis

**Route:** `/safety-analysis`
**File:** `src/pages/safety-analysis/SafetyAnalysisPage.tsx`
**Reference doc:** `docs/Safety_Analysis_Calculation_Documentation_2026-03-09.pdf`

## Purpose

CVOR (Commercial Vehicle Operator's Registration) style safety analysis: charts, drilldowns, scoring. Heavy use of `recharts`.

## History notes

- Many `cvor_*.py` scripts in repo root were used to iterate on this page's UI/structure (drilldown, charts v2→v5, full-width fixes, etc.). Useful to read git log if rolling back UI changes.

## Related

- [[Safety Events]]
- [[Inspections]]
- [[Violations]]
- [[Incidents]]
