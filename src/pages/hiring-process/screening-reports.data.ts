// Driver screening-report products (PSP / CVDR / CDA). PSP is the US FMCSA
// Pre-Employment Screening Program (5-year crash + 3-year inspection history);
// CVDR / CDA are commercial driver-record products used for cross-border drivers.

export const REPORT_TYPES = [
    "PSP — Pre-Employment Screening Program",
    "CVDR — Commercial Vehicle Driver Record",
    "CDA — Commercial Driver Abstract",
];

export const PSP_YEARS = "5-Year Crash · 3-Year Inspection";
export const OTHER_YEARS = ["3 years", "5 years"];

export const INSPECTION_LEVELS = [
    "Level I — Full",
    "Level II — Walk-Around",
    "Level III — Driver-Only",
    "Level IV — Special",
    "Level V — Vehicle-Only",
    "Level VI — Radioactive",
];

export const isPspType = (t: string) => t.startsWith("PSP");
