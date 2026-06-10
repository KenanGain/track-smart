// Province / state-specific driving-record (abstract / MVR) product types.
//
// Each jurisdiction issues its own driving-record products under different names
// (Ontario CVOR vs Alberta 5-Year Abstract vs Quebec SAAQ record, etc.). The
// abstract form uses this to offer the correct record types once an issuing
// province / state is chosen.

export const US_MVR_TYPES = [
    "Motor Vehicle Record (MVR)",
    "Certified Driving Record",
    "3-Year MVR",
    "7-Year MVR",
    "Complete Driving History",
    "CDLIS Report",
];

// Per-province Canadian abstract products. Falls back to CA_DEFAULT.
export const CA_ABSTRACT_TYPES: Record<string, string[]> = {
    Ontario: ["3-Year Driver Record", "Complete Driver's Abstract", "Driver's Licence History", "CVOR Abstract (Commercial)"],
    Quebec: ["SAAQ Driving Record (Dossier de conduite)", "Demerit Points Record", "Complete Driving Record"],
    Alberta: ["Driver Abstract (3-Year)", "Driver Abstract (5-Year)", "Commercial Driver Abstract", "Complete Driver Abstract"],
    "British Columbia": ["ICBC Driving Record", "Driver's Abstract (N-Print)", "Commercial Driving Record"],
    Manitoba: ["Driver Abstract", "Driver Safety Rating Abstract"],
    Saskatchewan: ["SGI Driver Abstract", "Commercial Driver Abstract"],
    "Nova Scotia": ["Driver Abstract", "Court Driving Record"],
    "New Brunswick": ["Driver Abstract", "Court Driving Record"],
    "Newfoundland and Labrador": ["Driver Record Abstract", "Certified Driving Record"],
    "Prince Edward Island": ["Driver Abstract", "Certified Abstract"],
    "Northwest Territories": ["Driver Abstract"],
    Nunavut: ["Driver Abstract"],
    Yukon: ["Driver Abstract"],
};

const CA_DEFAULT = ["Driver Abstract (3-Year)", "Complete Driver Abstract", "Commercial Driver Abstract"];

/** Record / abstract product types available for the given country + issuing authority. */
export function recordTypesFor(country: string, authority: string): string[] {
    if (country === "Canada") return CA_ABSTRACT_TYPES[authority] ?? CA_DEFAULT;
    return US_MVR_TYPES;
}

/** Commercial / CVOR-style products reveal carrier + safety-rating fields. */
export function isCommercialType(t: string): boolean {
    return /CVOR|Commercial|CDLIS/i.test(t);
}
