---
name: Inspections
description: DOT roadside inspections list
type: page
tags: [page, safety, inspections]
---

# Inspections

**Route:** `/inspections`
**File:** `src/pages/inspections/InspectionsPage.tsx`

## Purpose

DOT roadside inspections list across multiple jurisdictions, with per-jurisdiction performance views and (in flight) downloadable PDF reports.

## Jurisdictions and components

| Jurisdiction | Components / files |
| --- | --- |
| FMCSA / CSA (US) | `FmcsaApiFetchBlock`, `FmcsaInspectionForm`, `EMPTY_FMCSA`, `FmcsaPdfReport.tsx` (uncommitted) + `generateFmcsaPdf.ts` (uncommitted) |
| Ontario CVOR | `CvorInspectionForm`, `cvorInterventionEvents.data.ts`, `cvorPeriodicReports`, `CvorPdfReport.tsx` (uncommitted) + `generateCvorPdf.ts` (uncommitted) |
| Alberta NSC | `NscAbPerformanceHistory`, `AbConvictionAnalysisTable`, `AbCvsaInspectionAnalysisTable`, `AbCollisionInformationPanel`, `AbViolationInformationPanel`, `AbMonitoringInformationPanel`, `AbFacilityLicenceInformationPanel`, `AbSafetyFitnessInformationPanel`, `AbHistoricalSummaryPanel`, `AbHistoricalEventsList` |
| British Columbia NSC | `NscBcCarrierProfile`, `NscBcPerformanceHistory`, `BcMonthHistoryTable`, `BcActiveFleetTable`, `DriverContraventionsList`, `CarrierContraventionsList`, `CvsaInspectionSummaries`, `CvsaInspectionDetailsList`, `AccidentSummaryTable`, `AccidentDetailsList`, `CvipInspectionList`, `BcPanels` |
| PEI NSC | `NscPeiPerformanceCard`, `NscPeiPerformanceHistory` |
| Nova Scotia NSC | `NscNsPerformanceBlock`, `NscNsPerformanceCard`, `NscNsPerformanceHistory` |

Shared: `NscPerformanceCard`, `NscSummaryCard`, `NscOosSummaryCard`, `NscMonitoringHistory`, `NscCvsaInspections`, `NscCvsaOverview`, `NscGenericPerformanceBlock`, `NSCConvictionSection`, `SafetyRatingOosCard`, `ScoreBandHoverCard`, `InspectionReportPanel`.

Add-inspection forms live in `AddInspectionForms.tsx` with one `*InspectionForm` per jurisdiction and matching `EMPTY_*` constants.

## Data

- `inspectionsData.ts` — main FMCSA + CVOR fixtures, `SUMMARY_CATEGORIES`, `getJurisdiction()`, `getEquivalentCode()`.
- `nscInspectionsData.ts` — NSC fixtures + `NSC_INSPECTIONS`, `DEFECT_TO_NSC`, `NSC_CODE_TO_SYSTEM`.
- `cvorInterventionEvents.data.ts` — CVOR intervention events, travel-km, period.
- `nscViolationMap.ts` — code mapping helpers.

## In-flight (uncommitted)

- `CvorPdfReport.tsx` · `FmcsaPdfReport.tsx` · `NscPdfReport.tsx` — off-screen React components that render `.pdf-page` blocks.
- `generateCvorPdf.ts` · `generateFmcsaPdf.ts` · `generateNscPdf.ts` — browser pipeline: render off-screen → wait for fonts → `html2canvas` per page → assemble with `jspdf` → `pdf.save(fileName)`.

## Related

- [[Settings — Inspections]]
- [[Violations]]
- [[Safety Events]]
- [[Current Features]]
- [[Input Output Flow]] § "Inspection PDF flow"
