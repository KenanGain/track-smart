// ============================================================================
//  ACME TRUCKING (acct-001) — Safety & Compliance Demo Data Index
// ============================================================================
//
// Acme Trucking Inc. is the canonical demo carrier for the Safety and
// Compliance page (`/inspections`). It is the ONLY carrier in the system
// that ships with backing mock data for every regime visible in the page's
// six tabs:
//
//     1. FMCSA SMS BASIC                       (US)
//     2. Ontario CVOR                          (Canada — Ontario)
//     3. Alberta NSC Carrier Profile           (Canada — Alberta)
//     4. British Columbia NSC Carrier Profile  (Canada — British Columbia)
//     5. PEI NSC Carrier Profile               (Canada — Prince Edward Island)
//     6. Nova Scotia NSC Carrier Profile       (Canada — Nova Scotia)
//
// This file is a **registry**, not a data definition — it documents where
// each piece of mock data physically lives in the codebase and re-exports
// the underlying constants under stable `ACME_*` aliases. Anything that
// needs to know "what data does Acme have?" can import from here instead
// of crawling the inspection-page source tree.
//
// Compliance enrolment defaults (which tabs are *enabled* for Acme) live
// in `src/data/carrier-compliance.data.ts → buildDefaultCompliance()`. By
// default Acme has FMCSA + CVOR + NSC AB + BC + PE + NS all enabled with
// `hasData: true` so every tab in the Safety and Compliance page renders
// when an Acme user logs in.
//
// ----------------------------------------------------------------------------
//  Data inventory by source file
// ----------------------------------------------------------------------------
//
//  FMCSA SMS BASIC + Ontario CVOR
//    src/pages/inspections/inspectionsData.ts
//      • carrierProfile         — basic / cvorAnalysis (numbers, ratings)
//      • inspectionsData        — every roadside CVSA inspection (CSA + CVOR)
//      • cvorPeriodicReports    — quarterly CVOR pull snapshots
//    src/pages/inspections/cvorInterventionEvents.data.ts
//      • CVOR_INTERVENTION_PERIOD
//      • cvorInterventionEvents
//      • cvorTravelKm
//    src/pages/inspections/nscInspectionsData.ts
//      • NSC_INSPECTIONS        — cross-jurisdiction NSC inspection rows
//      • DEFECT_TO_NSC, NSC_CODE_TO_SYSTEM
//
//  Alberta NSC
//    src/pages/inspections/InspectionsPage.tsx
//      • ALBERTA_NSC_PERFORMANCE_CARD  — Alberta carrier-profile card data
//    src/pages/inspections/NscAbPerformanceHistory.tsx
//      • Internal AB pull-history mock + the rendered component
//
//  British Columbia NSC
//    src/pages/inspections/NscBcCarrierProfile.tsx
//      • INERTIA_CARRIER_BC_DATA       — BC carrier profile (12-page abstract)
//    src/pages/inspections/NscBcPerformanceHistory.tsx
//      • Pull-by-pull BC monthly history component
//
//  PEI NSC
//    src/pages/inspections/InspectionsPage.tsx
//      • PRINCE_EDWARD_ISLAND_NSC_PROFILE
//    src/pages/inspections/NscPeiPerformanceCard.tsx
//      • PEI carrier-profile card component
//    src/pages/inspections/NscPeiPerformanceHistory.tsx
//      • PEI pull-history component
//
//  Nova Scotia NSC
//    src/pages/inspections/InspectionsPage.tsx
//      • NOVA_SCOTIA_NSC_PROFILE
//    src/pages/inspections/NscNsPerformanceCard.tsx
//      • NS carrier-profile card component (`NscNsPerformanceCard`)
//    src/pages/inspections/NscNsPerformanceBlock.tsx
//      • CVSA / Audits / Convictions / Collisions / Warnings (per-event lists)
//    src/pages/inspections/NscNsPerformanceHistory.tsx
//      • NS_PULL_DATA — 15 monthly pulls feeding the Pull-by-Pull view
//
// ============================================================================

import {
    carrierProfile as _carrierProfile,
    inspectionsData as _inspectionsData,
    cvorPeriodicReports as _cvorPeriodicReports,
} from "@/pages/inspections/inspectionsData";

import {
    CVOR_INTERVENTION_PERIOD as _CVOR_INTERVENTION_PERIOD,
    cvorInterventionEvents as _cvorInterventionEvents,
    cvorTravelKm as _cvorTravelKm,
} from "@/pages/inspections/cvorInterventionEvents.data";

import {
    NSC_INSPECTIONS as _NSC_INSPECTIONS,
} from "@/pages/inspections/nscInspectionsData";

import {
    ALBERTA_NSC_PERFORMANCE_CARD as _ALBERTA_NSC_PERFORMANCE_CARD,
    NOVA_SCOTIA_NSC_PROFILE as _NOVA_SCOTIA_NSC_PROFILE,
    PRINCE_EDWARD_ISLAND_NSC_PROFILE as _PRINCE_EDWARD_ISLAND_NSC_PROFILE,
} from "@/pages/inspections/InspectionsPage";

import {
    INERTIA_CARRIER_BC_DATA as _INERTIA_CARRIER_BC_DATA,
} from "@/pages/inspections/NscBcCarrierProfile";

import {
    NS_PULL_DATA as _NS_PULL_DATA,
} from "@/pages/inspections/NscNsPerformanceHistory";

// ── Stable Acme-prefixed aliases ─────────────────────────────────────

/** Acme's combined FMCSA / Ontario CVOR carrier profile (basic scores,
 *  CVOR analysis, OOS rates, licensing). Drives the FMCSA + CVOR tabs. */
export const ACME_CARRIER_PROFILE = _carrierProfile;

/** Every roadside inspection (CSA + CVOR) attributed to Acme. */
export const ACME_INSPECTIONS = _inspectionsData;

/** Quarterly CVOR pull snapshots for Acme. */
export const ACME_CVOR_PERIODIC_REPORTS = _cvorPeriodicReports;

/** Acme's Ontario CVOR intervention period + intervention events + travel-KM
 *  rows. Used by the CVOR tab's intervention timeline + Travel KM table. */
export const ACME_CVOR_INTERVENTION_PERIOD = _CVOR_INTERVENTION_PERIOD;
export const ACME_CVOR_INTERVENTION_EVENTS = _cvorInterventionEvents;
export const ACME_CVOR_TRAVEL_KM = _cvorTravelKm;

/** Cross-jurisdiction NSC inspection records. Feeds the four NSC tabs. */
export const ACME_NSC_INSPECTIONS = _NSC_INSPECTIONS;

/** Per-province NSC profile data. */
export const ACME_NSC_AB_PROFILE = _ALBERTA_NSC_PERFORMANCE_CARD;
export const ACME_NSC_BC_PROFILE = _INERTIA_CARRIER_BC_DATA;
export const ACME_NSC_PE_PROFILE = _PRINCE_EDWARD_ISLAND_NSC_PROFILE;
export const ACME_NSC_NS_PROFILE = _NOVA_SCOTIA_NSC_PROFILE;

/** NS pull-by-pull monthly history (15 pulls). Feeds the NS tab's chart. */
export const ACME_NSC_NS_PULL_HISTORY = _NS_PULL_DATA;

// ── Aggregate index — quick "what does Acme have?" lookup ────────────

export const ACME_SAFETY_COMPLIANCE_INDEX = {
    accountId: "acct-001",
    legalName: "Acme Trucking Inc.",

    fmcsa: {
        carrierProfile: ACME_CARRIER_PROFILE,
        inspections:    ACME_INSPECTIONS, // filtered to CSA at point-of-use
    },
    cvor: {
        carrierProfile:      ACME_CARRIER_PROFILE,
        inspections:         ACME_INSPECTIONS, // filtered to CVOR at point-of-use
        periodicReports:     ACME_CVOR_PERIODIC_REPORTS,
        interventionPeriod:  ACME_CVOR_INTERVENTION_PERIOD,
        interventionEvents:  ACME_CVOR_INTERVENTION_EVENTS,
        travelKm:            ACME_CVOR_TRAVEL_KM,
    },
    nsc: {
        AB: { profile: ACME_NSC_AB_PROFILE,                      inspections: ACME_NSC_INSPECTIONS },
        BC: { profile: ACME_NSC_BC_PROFILE,                      inspections: ACME_NSC_INSPECTIONS },
        PE: { profile: ACME_NSC_PE_PROFILE,                      inspections: ACME_NSC_INSPECTIONS },
        NS: { profile: ACME_NSC_NS_PROFILE, pullHistory: ACME_NSC_NS_PULL_HISTORY, inspections: ACME_NSC_INSPECTIONS },
    },
} as const;

/**
 * Given an `accountId`, return the safety/compliance demo data attached to
 * that carrier — or `null` for any carrier that doesn't ship with mock data.
 *
 * Today only Acme (acct-001) has demo data. Other carriers can still be
 * configured (FMCSA / CVOR / NSC enrolment toggles) but their tab content
 * has no backing mock until vendor packages are wired in per-carrier.
 */
export function getSafetyComplianceData(accountId: string) {
    if (accountId === "acct-001") return ACME_SAFETY_COMPLIANCE_INDEX;
    return null;
}
