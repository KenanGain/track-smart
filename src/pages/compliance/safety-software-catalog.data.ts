import type { KeyNumberGroup } from '@/pages/admin/ComplianceAndDocumentsPage';

/**
 * SAFETY SOFTWARE — Document and Compliance classification (system default).
 *
 * Source: "safety software (1) (1).xlsx" — proposed normalized DB classification,
 * plus toll/transponder pass programs. Seeds the **Settings → New Compliance &
 * Documents** page, rendered as a read-only catalog by `SafetyCatalogView`.
 *
 * `recordName` is the short/common label shown in the main name column; the full
 * formal name is kept in `description` (subtitle).
 *
 * RECORD TYPE (drives the top-right switch)
 *   'C'  Compliance          — a number/code/account value only, no required document.
 *   'D'  Document            — an uploaded document only, no separate number value.
 *   'DC' Document/Compliance — both a number value AND an uploaded document.
 *
 * FIELD RULES (from the source): monitor the expiry / renewal / next-due / valid-to
 * date — never the issue date — unless the renewal is calculated from the issue date.
 * `configuredDate` is the workbook-configured monitoring date where one was provided.
 */

export type RecordTypeId = 'C' | 'D' | 'DC';
export type EntityId = 'Carrier' | 'Asset' | 'Driver';
export type DocRequirement = 'required' | 'optional' | 'none';
/**
 * How the document may be uploaded / versioned:
 *   'single'    — one upload; a new upload replaces it.
 *   'recurring' — retain previous uploads; add a new DATED version on renew/reissue/review/replace.
 *   'event'     — multiple dated versions on an event/replacement/status change (no fixed schedule).
 */
export type UploadMode = 'single' | 'recurring' | 'event';

export interface SafetyRecord {
    id: string;
    /** Short/common label — the main name column. */
    recordName: string;
    /** Full formal name / purpose — shown as a subtitle. */
    description: string;
    /** Compliance Name — user-facing label of the number/code/account field ('' if none). */
    numberName: string;
    /** Document Name — exact file/document label shown to users ('' if none). */
    documentName: string;
    category: KeyNumberGroup;
    entity: EntityId;
    type: RecordTypeId;
    /** Document upload requirement — separate from record type. */
    docRequirement: DocRequirement;
    /** Short recurrence note. */
    recurring: string;
    /** The date type we monitor (never the issue date). */
    monitorType: string;
    /** Workbook-configured monitoring date, when provided (YYYY-MM-DD). */
    configuredDate?: string;
    /** Whether an issue/effective date is captured for history. */
    tracksIssueDate?: boolean;
    jurisdiction: string;
    /** Full monitoring guidance (shown as helper text / tooltip). */
    monitor: string;
    /** Optional normalization note surfaced under the record name. */
    note?: string;
    /** Upload / versioning behaviour for the document (undefined when the record has no document). */
    uploadMode?: UploadMode;
    /** Labelled upload slots for the document (e.g. ['Front', 'Back']); undefined = a single upload. */
    slotLabels?: string[];
    /** Render the driver-license field set (matches the hiring Application license card). */
    isLicense?: boolean;
    /** Hide the State/Province selector — the record is not state/province-scoped (federal / country-level). */
    hideState?: boolean;
    /** Offer the full world country list (vs. the default US/Canada/Mexico) — e.g. Passport. */
    allCountries?: boolean;
    /**
     * Record holds MULTIPLE concurrent instances (e.g. several insurance policies), each independently
     * active and keeping its OWN current document + renewal history. When false/undefined the record is
     * single-current (one current document + version history).
     */
    multiInstance?: boolean;
    /** Noun for one instance of a multi-instance record (e.g. "policy"). Defaults to "document". */
    instanceNoun?: string;
}

export const SAFETY_RECORDS: SafetyRecord[] = [
    // ── 1. Regulatory and Safety Numbers ──────────────────────────────
    { id: 'cvor', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CVOR Certificate', description: "Commercial Vehicle Operator's Registration (CVOR)", numberName: 'CVOR Number', documentName: 'CVOR Certificate',
      recurring: 'Variable renewal/expiry', monitorType: 'Expiry date', tracksIssueDate: true, jurisdiction: 'Ontario, Canada',
      monitor: 'Expiry date. Store issue date for history only.' },
    { id: 'cvor-level-2', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'D', docRequirement: 'optional',
      recordName: 'CVOR Level 2', description: 'CVOR Level 2 (carrier profile)', numberName: '', documentName: 'CVOR Level 2 Certificate',
      recurring: 'Per issue', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'Ontario, Canada',
      monitor: 'CVOR Level 2 carrier-profile document. Issue date only — no expiry monitored.' },
    { id: 'safety-fitness', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Safety Fitness Certificate', description: 'Safety Fitness / National Safety Code Registration', numberName: 'NSC / Safety Fitness Number', documentName: 'Safety Fitness Certificate',
      recurring: 'Depends on Canadian jurisdiction', monitorType: 'Expiry / renewal due', jurisdiction: 'Canadian province/territory (BC, AB, SK, MB, NL, NB, NS, PE)',
      monitor: 'Expiry/renewal due date. If no expiry printed, store next review/renewal date.' },
    { id: 'nir', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'NIR Certificate', description: 'Québec Heavy-Vehicle Owner/Operator Registration (NIR)', numberName: 'NIR Number', documentName: 'NIR Registration Certificate',
      recurring: 'Periodic registry update', monitorType: 'Next update / renewal due', jurisdiction: 'Québec, Canada',
      monitor: 'Expiry or next update/renewal due date when provided; do not alert on issue date alone.' },
    { id: 'mc', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required', hideState: true,
      recordName: 'MC Certificate', description: 'FMCSA Motor Carrier Operating Authority', numberName: 'MC Number', documentName: 'FMCSA Operating Authority Certificate (MC)',
      recurring: 'No fixed expiry', monitorType: 'Authority / status change', jurisdiction: 'United States, federal',
      monitor: 'Authority/status changes, revocation, suspension, or replacement — not a normal expiry date.' },
    { id: 'dot-biennial', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'optional',
      recordName: 'DOT Biennial Update', description: 'FMCSA DOT Biennial Update', numberName: 'DOT Biennial Update (linked to USDOT)', documentName: 'MCS-150 / MCS-150B Filing Confirmation',
      recurring: 'Biennial', monitorType: 'Next filing due', jurisdiction: 'United States, federal',
      monitor: 'Next biennial filing due date calculated from the USDOT number and last filing/update date.',
      note: 'Optional MCS-150/MCS-150B upload; uses the USDOT number (no separate number).' },
    { id: 'usdot', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'C', docRequirement: 'none',
      recordName: 'DOT', description: 'USDOT Registration', numberName: 'USDOT Number', documentName: '',
      recurring: 'Number does not expire', monitorType: 'Active/inactive status', jurisdiction: 'United States, federal',
      monitor: 'Active/inactive status and linked next biennial filing due date.' },
    { id: 'drug-test', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Drug Test', description: 'Drug and Alcohol Testing Record', numberName: '', documentName: 'Drug & Alcohol Test Result / Employer Testing Record',
      recurring: 'Per test', monitorType: 'On file', jurisdiction: 'Applicable DOT testing jurisdiction',
      monitor: 'Point-in-time drug & alcohol test result; no document expiry. Retained on file.' },
    { id: 'hazmat', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'HAZMAT', description: 'PHMSA Hazardous Materials Registration', numberName: 'HAZMAT Registration Number', documentName: 'HAZMAT Certificate of Registration',
      recurring: 'Yes', monitorType: 'Expiry date', configuredDate: '2026-06-30', jurisdiction: 'United States, federal',
      monitor: 'Expiry date.' },
    { id: 'mcs90', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'MCS-90', description: 'Motor Carrier Public Liability Endorsement', numberName: '', documentName: 'MCS-90 Endorsement',
      recurring: 'No independent expiry', monitorType: 'Linked to insurance policy', jurisdiction: 'United States, federal',
      monitor: 'Linked to the insurance policy — monitor policy effective/expiry dates & replacement/cancellation status.' },
    { id: 'twic', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'TWIC Card', description: 'Transportation Worker Identification Credential', numberName: 'TWIC Card Number', documentName: 'TWIC Card Copy',
      recurring: 'Variable expiry', monitorType: 'Card expiry date', jurisdiction: 'United States, federal',
      monitor: 'Card expiry date.' },

    // ── 2. Tax and Business Identification Numbers ────────────────────
    { id: 'ifta-license', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'IFTA License', description: 'International Fuel Tax Agreement Registration', numberName: 'IFTA Account / License Number', documentName: 'IFTA License',
      recurring: 'Annual', monitorType: 'Expiry date', configuredDate: '2026-12-31', jurisdiction: 'Base IFTA jurisdiction (CA/US)',
      monitor: 'Expiry date (annual).' },
    { id: 'ifta-decal', category: 'Tax and Business Identification Numbers', entity: 'Asset', type: 'DC', docRequirement: 'required',
      recordName: 'IFTA Decal', description: 'International Fuel Tax Agreement Vehicle Decal', numberName: 'IFTA Decal Number', documentName: 'IFTA Decal Record / Copy',
      recurring: 'Annual', monitorType: 'Expiry date', configuredDate: '2026-12-31', jurisdiction: 'Same base IFTA jurisdiction',
      monitor: 'Expiry date (annual).' },
    { id: 'fein', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'FEIN', description: 'Federal Employer Identification', numberName: 'FEIN / EIN', documentName: 'IRS EIN Verification Letter (147C)',
      recurring: 'No normal expiry', monitorType: 'No expiry', jurisdiction: 'United States, federal',
      monitor: 'No expiry alert; monitor only when the legal entity or tax registration changes.' },
    { id: 'nm-wdt', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'NM', description: 'New Mexico Weight Distance Tax Registration', numberName: 'New Mexico WDT Account / Permit Number', documentName: 'New Mexico Weight Distance Tax Permit / Certificate',
      recurring: 'Recurring', monitorType: 'Expiry / renewal due', configuredDate: '2026-12-31', jurisdiction: 'New Mexico, United States',
      monitor: 'Expiry/renewal due date.', note: 'Carrier master account; Asset when an asset-specific permit is issued.' },
    { id: 'kyu', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'KYU', description: 'Kentucky Weight Distance Tax Registration', numberName: 'KYU Number', documentName: 'KYU License / Letter of Addition',
      recurring: 'Recurring', monitorType: 'Renewal / filing due', configuredDate: '2026-12-31', jurisdiction: 'Kentucky, United States',
      monitor: 'Renewal/filing due date.', note: 'Carrier master account; Asset association where required.' },
    { id: 'ny-hut', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'HUT', description: 'New York Highway Use Tax Registration', numberName: 'New York HUT Number', documentName: 'New York HUT Certificate of Registration',
      recurring: 'Recurring', monitorType: 'Expiry / renewal due', configuredDate: '2026-12-31', jurisdiction: 'New York, United States',
      monitor: 'Permit/certificate expiry or renewal due date.', note: 'Carrier account plus Asset-specific certificate/permit.' },
    { id: 'ct-permit', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CT', description: 'Connecticut Highway Use / Tax Registration', numberName: 'Connecticut Permit / Registration Number', documentName: 'Connecticut Permit / Tax Registration Certificate',
      recurring: 'Recurring', monitorType: 'Expiry / renewal due', configuredDate: '2026-12-31', jurisdiction: 'Connecticut, United States',
      monitor: 'Expiry/renewal due date.', note: 'Carrier account; Asset when asset-specific.' },
    { id: 'oregon-wm', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Oregon', description: 'Oregon Weight-Mile Tax Registration', numberName: 'Oregon Weight-Mile Account Number', documentName: 'Oregon Weight-Mile / Motor Carrier Registration Certificate',
      recurring: 'Recurring', monitorType: 'Renewal / status due', configuredDate: '2026-12-31', jurisdiction: 'Oregon, United States',
      monitor: 'Renewal/status due date; allow "permanent / no expiry" when applicable.', note: 'Carrier master account; Asset association where required.' },
    { id: 'wsib', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'WSIB', description: 'Ontario Workplace Safety and Insurance Registration', numberName: 'WSIB Account Number', documentName: 'WSIB Clearance Certificate',
      recurring: 'Monthly', monitorType: 'Valid-to / clearance date', jurisdiction: 'Select jurisdiction',
      monitor: 'Certificate valid-to / clearance expiry date, not merely the issue date.' },
    { id: 'articles', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Articles of Incorporation', description: 'Business Incorporation Registration', numberName: 'Corporation Number', documentName: 'Articles / Certificate of Incorporation',
      recurring: 'Usually static', monitorType: 'No expiry (unless jurisdiction sets one)', jurisdiction: 'Federal / provincial / state',
      monitor: 'Expiry/renewal only if the issuing jurisdiction provides one; otherwise no expiry alert.' },
    { id: 'operating-name', category: 'Tax and Business Identification Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Operating Name Registration', description: 'Operating or Business Name Registration', numberName: 'Operating Name Registration Number', documentName: 'Operating / Business Name Registration Certificate',
      recurring: 'Where a renewal cycle applies', monitorType: 'Registration expiry / renewal', jurisdiction: 'Province/state registering jurisdiction',
      monitor: 'Registration expiry/renewal due date.' },

    // ── 3. Carrier & Industry Codes ───────────────────────────────────
    { id: 'carrier-code', category: 'Carrier & Industry Codes', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Carrier Code', description: 'CBSA Carrier Code Registration', numberName: 'Carrier Code', documentName: 'CBSA Carrier Code Approval Letter',
      recurring: 'No fixed expiry', monitorType: 'Active status / replacement', jurisdiction: 'Canada, federal customs',
      monitor: 'Active status or replacement/change — not the issue date.' },
    { id: 'scac', category: 'Carrier & Industry Codes', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'SCAC Code', description: 'Standard Carrier Alpha Code Registration', numberName: 'SCAC Code', documentName: 'SCAC Certificate',
      recurring: 'Variable renewal/expiry', monitorType: 'Certificate expiry / renewal', jurisdiction: 'North American transportation industry',
      monitor: 'Certificate/code expiry or renewal due date.' },
    { id: 'ctpat', category: 'Carrier & Industry Codes', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CTPAT', description: 'Customs Trade Partnership Against Terrorism Certification', numberName: 'CTPAT Account / Reference Number', documentName: 'CTPAT Certification / Approval Letter',
      recurring: 'Periodic validation', monitorType: 'Next validation / review', jurisdiction: 'United States, federal customs',
      monitor: 'Next validation/review due date + certification status; use expiry only when provided.' },
    { id: 'pip', category: 'Carrier & Industry Codes', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'PIP', description: 'Partners in Protection Certification', numberName: 'PIP Account / Reference Number', documentName: 'PIP Certificate / Approval Letter',
      recurring: 'Periodic review', monitorType: 'Next review / revalidation', jurisdiction: 'Canada, federal customs',
      monitor: 'Next review/revalidation due date + active status; use expiry only when provided.' },
    { id: 'csa', category: 'Carrier & Industry Codes', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CSA', description: 'CBSA Customs Self-Assessment Authorization', numberName: 'CSA Account / Reference Number', documentName: 'CSA Approval / Authorization Letter',
      recurring: 'Ongoing authorization', monitorType: 'Status / next review', jurisdiction: 'Canada, federal customs',
      monitor: 'Authorization status and next review/revalidation date.', note: 'CBSA Customs Self-Assessment — not the FMCSA safety-score program.' },
    { id: 'smartway', category: 'Carrier & Industry Codes', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'SmartWay', description: 'EPA SmartWay Partnership', numberName: 'SmartWay Partner ID / Account Number', documentName: 'SmartWay Partner Certificate / Approval',
      recurring: 'Annual', monitorType: 'Annual submission / renewal', configuredDate: '2026-03-31', jurisdiction: 'US / North American freight program',
      monitor: 'Annual submission/renewal due date.' },

    // ── 4. Bond and Registration Numbers ──────────────────────────────
    { id: 'irp-plate', category: 'Bond and Registration Numbers', entity: 'Asset', type: 'C', docRequirement: 'none',
      recordName: 'IRP Plates', description: 'International Registration Plan Vehicle Plate', numberName: 'IRP Plate Number', documentName: '',
      recurring: 'Yes', monitorType: 'Fleet expiry (inherited)', jurisdiction: 'Base IRP jurisdiction',
      monitor: 'Fleet expiry date inherited from the IRP fleet. Cab card is the related document.', note: 'Store plate_type. The cab card is the associated document.' },
    { id: 'cab-card', category: 'Bond and Registration Numbers', entity: 'Asset', type: 'DC', docRequirement: 'required',
      recordName: 'Cab Card', description: 'International Registration Plan Cab Card', numberName: 'Linked IRP Plate / Fleet Number', documentName: 'IRP Cab Card',
      recurring: 'Yes', monitorType: 'Fleet expiry (inherited)', jurisdiction: 'Same as associated IRP fleet',
      monitor: 'Fleet expiry inherited from the associated IRP fleet/plate.', note: 'When the IRP fleet/plate expires, all associated cab cards expire together.' },
    { id: 'non-irp-plate', category: 'Bond and Registration Numbers', entity: 'Asset', type: 'DC', docRequirement: 'required',
      recordName: 'Non-IRP Plates (Local Plates)', description: 'Non-IRP Vehicle Registration', numberName: 'Non-IRP / Local Plate Number', documentName: 'Vehicle Permit / Registration Certificate',
      recurring: 'Yes', monitorType: 'Plate / registration expiry', jurisdiction: 'Issuing province/state',
      monitor: 'Plate/registration expiry date for the individual vehicle — not IRP fleet expiry.', note: 'Store plate_type. No cab card required for a non-IRP plate.' },
    { id: 'ucr', category: 'Bond and Registration Numbers', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'UCR', description: 'Unified Carrier Registration', numberName: '', documentName: 'UCR Registration Certificate / Filing Confirmation',
      recurring: 'Annual', monitorType: 'Expiry / registration-year end', configuredDate: '2026-12-31', jurisdiction: 'United States, interstate registration',
      monitor: 'Expiry / registration-year end (annual).' },
    { id: 'boc3', category: 'Bond and Registration Numbers', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'BOC-3', description: 'Designation of Process Agents Filing', numberName: '', documentName: 'BOC-3 Filing Confirmation / Certificate',
      recurring: 'No scheduled expiry', monitorType: 'Filing status / change', jurisdiction: 'United States, federal',
      monitor: 'Filing status/change date — not expiry.' },
    { id: 'us-bond', category: 'Bond and Registration Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'US Bond', description: 'United States Customs or Surety Bond', numberName: 'US Bond Number', documentName: 'US Bond Certificate',
      recurring: 'Variable', monitorType: 'Bond expiry / renewal', jurisdiction: 'United States',
      monitor: 'Bond expiry/termination/renewal date.', note: 'Store bond_type.' },
    { id: 'canada-bond', category: 'Bond and Registration Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Canada Bond', description: 'Canada Customs or Surety Bond', numberName: 'Canada Bond Number', documentName: 'Canada Bond Certificate',
      recurring: 'Variable', monitorType: 'Bond expiry / renewal', jurisdiction: 'Canada',
      monitor: 'Bond expiry/termination/renewal date.', note: 'Store bond_type.' },

    // ── 5. Others ─────────────────────────────────────────────────────
    { id: 'insurance', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Insurance', description: 'Commercial Insurance Coverage', numberName: 'Insurance Policy Number', documentName: 'Certificate of Insurance / Insurance Policy',
      recurring: 'Yes', monitorType: 'Policy expiry date', tracksIssueDate: true, jurisdiction: 'Policy-specific (CA/US)',
      multiInstance: true, instanceNoun: 'policy',
      monitor: 'Policy expiry date. Store issue/effective date for history.', note: 'Insurance broker & company come from the Vendor list.' },
    { id: 'pink-slip', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'required',
      recordName: 'Pink Slip', description: 'Vehicle Proof of Insurance', numberName: 'Insurance Policy Number', documentName: 'Proof of Automobile Insurance Card (Pink Slip)',
      recurring: 'Yes', monitorType: 'Insurance expiry date', jurisdiction: 'Issuing insurance jurisdiction',
      multiInstance: true, instanceNoun: 'policy',
      monitor: 'Insurance expiry date; normally inherits/links to the related policy.' },

    // Toll / transponder / bypass pass programs (per-vehicle credentials).
    { id: 'dtops', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'optional',
      recordName: 'DTOPS', description: 'Decal & Transponder Online Payment System (Oregon)', numberName: 'DTOPS Account / Transponder Number', documentName: 'DTOPS Decal / Transponder Record',
      recurring: 'Recurring', monitorType: 'Renewal / status due', jurisdiction: 'Oregon, United States',
      monitor: 'Renewal / status due date for the DTOPS decal/transponder.' },
    { id: 'ezpass', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'optional',
      recordName: 'EZ Pass', description: 'E-ZPass electronic toll transponder', numberName: 'E-ZPass Transponder / Account Number', documentName: 'E-ZPass Account / Transponder Record',
      recurring: 'Account-based', monitorType: 'Account / renewal', jurisdiction: 'US Northeast / Midwest toll network',
      monitor: 'Transponder/account status; renewal where applicable.' },
    { id: 'prepass', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'optional',
      recordName: 'PrePass', description: 'PrePass weigh-station bypass & toll transponder', numberName: 'PrePass Transponder / Account Number', documentName: 'PrePass Account / Transponder Record',
      recurring: 'Account-based', monitorType: 'Account / renewal', jurisdiction: 'United States',
      monitor: 'Transponder/account status; renewal where applicable.' },
    { id: 'bestpass', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'optional',
      recordName: 'Bestpass', description: 'Bestpass consolidated toll management transponder', numberName: 'Bestpass Account / Transponder Number', documentName: 'Bestpass Account Statement / Transponder Record',
      recurring: 'Account-based', monitorType: 'Account / renewal', jurisdiction: 'United States / Canada',
      monitor: 'Transponder/account status; renewal where applicable.' },
    { id: 'apass', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'optional',
      recordName: 'A-Pass', description: 'A-Pass border-crossing / toll pass', numberName: 'A-Pass Account / Transponder Number', documentName: 'A-Pass Account / Transponder Record',
      recurring: 'Account-based', monitorType: 'Account / renewal', jurisdiction: 'US–Canada border',
      monitor: 'Pass/transponder status; renewal where applicable.' },
    { id: 'bwb-pass', category: 'Other', entity: 'Asset', type: 'DC', docRequirement: 'optional',
      recordName: 'Blue Water Bridge Pass', description: 'Blue Water Bridge (MI–ON) toll pass', numberName: 'Blue Water Bridge Pass Account Number', documentName: 'Blue Water Bridge Pass Record',
      recurring: 'Account-based', monitorType: 'Account / renewal', jurisdiction: 'Michigan, US / Ontario, Canada',
      monitor: 'Pass/account status; renewal where applicable.' },

    // ── Driver Qualification & travel documents (surfaced by the hiring process) ──
    // The hiring/onboarding flow collects Driver documents & numbers not otherwise in this
    // catalog (Drug Test and TWIC already exist above). No new Asset items; the Carrier items it
    // touches (prior-employer USDOT, insurance policy) are already covered by `usdot` / `insurance`.
    { id: 'cdl', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required', isLicense: true,
      recordName: 'CDL', description: "Commercial Driver's License (CDL)", numberName: 'CDL Number', documentName: "Driver's License / CDL", slotLabels: ['Front of License', 'Back of License'],
      recurring: 'Per licence term', monitorType: 'Licence expiry date', tracksIssueDate: true, jurisdiction: 'Issuing state / province',
      monitor: 'Licence expiry date. Store class, endorsements, restrictions and issue date.' },
    { id: 'medical-cert', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Medical Certificate', description: "Medical Examiner's Certificate (DOT Medical Card, MCSA-5876)", numberName: 'National Registry Number', documentName: "Medical Examiner's Certificate",
      recurring: 'Per medical term (≤ 24 months)', monitorType: 'Medical card expiry', tracksIssueDate: true, jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Medical certificate expiry date (max 24-month term, 49 CFR 391.41).' },
    { id: 'mvr', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'MVR', description: 'Motor Vehicle Record (MVR)', numberName: 'MVR Order / Reference Number', documentName: 'Motor Vehicle Record (MVR)',
      recurring: 'Annual', monitorType: 'Next annual review due', jurisdiction: 'Driver licensing state / province',
      monitor: 'Reviewed at least every 12 months (§391.25).' },
    { id: 'driver-abstract', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Driver Abstract', description: 'Provincial Driver Abstract / CVOR Driver Record', numberName: 'Abstract Reference Number', documentName: 'Driver Abstract',
      recurring: 'Annual', monitorType: 'Next annual review due', jurisdiction: 'Issuing province (ON CVOR, AB, SAAQ, ICBC, SGI)',
      monitor: 'Annual review of the provincial driving abstract.', note: 'Canadian equivalent of the MVR (CVOR / CVDR driver record).' },
    { id: 'psp-report', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'PSP Report', description: 'FMCSA Pre-Employment Screening Program Report', numberName: '', documentName: 'FMCSA PSP Report',
      recurring: 'Per hire', monitorType: 'Pre-employment / status', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Pre-employment screening record (5-yr crash / 3-yr inspection); re-pull as needed — no fixed expiry.' },
    { id: 'clearinghouse-query', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Clearinghouse Query', description: 'FMCSA Drug & Alcohol Clearinghouse Query', numberName: 'Query Reference Number', documentName: 'Clearinghouse Query Result',
      recurring: 'Annual', monitorType: 'Next annual query due', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Annual limited query due date (§382.701).' },
    { id: 'annual-review', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Annual Driving Record Review', description: 'Annual Review of Driving Record (§391.25)', numberName: '', documentName: 'Annual Review of Driving Record',
      recurring: 'Annual', monitorType: 'Next annual review due', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Annual review of driving record due each 12 months (§391.25).' },
    { id: 'cert-violations', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Certificate of Violations', description: 'Driver Certificate of Violations (§391.27)', numberName: '', documentName: 'Driver Certificate of Violations',
      recurring: 'Annual', monitorType: 'Next annual certification due', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Annual driver certification of violations due (§391.27).' },
    { id: 'safety-perf-history', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Safety Performance History', description: 'Previous Employer Safety Performance History (§391.23)', numberName: '', documentName: 'Safety Performance History Records',
      recurring: 'Once per hire', monitorType: 'Completion status', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Investigate prior 3 years of employment at hire (§391.23); retained in the DQ file.' },
    { id: 'road-test', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Road Test Certificate', description: 'Road Test Certificate (§391.31)', numberName: '', documentName: 'Road Test Certificate',
      recurring: 'Once (or accepted equivalent)', monitorType: 'Completion status', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Road test certificate or accepted equivalent — CDL / prior certificate (§391.33).' },
    { id: 'driver-application', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Driver Application', description: 'Driver Application for Employment (§391.21)', numberName: '', documentName: 'Driver Application for Employment',
      recurring: 'Once per hire', monitorType: 'On file', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Completed employment application retained in the DQ file (§391.21).' },
    { id: 'passport', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'required', hideState: true, allCountries: true,
      recordName: 'Passport', description: 'Driver Passport', numberName: 'Passport Number', documentName: 'Passport',
      recurring: 'Per passport term', monitorType: 'Passport expiry', tracksIssueDate: true, jurisdiction: 'Issuing country',
      monitor: 'Passport expiry date.' },
    { id: 'fast-card', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional',
      recordName: 'FAST Card', description: 'Free and Secure Trade (FAST) Card', numberName: 'FAST Card Number', documentName: 'FAST Card',
      recurring: 'Per card term', monitorType: 'Card expiry', jurisdiction: 'US–Canada border (CBP / CBSA)',
      monitor: 'FAST card expiry date.' },
    { id: 'visa', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional',
      recordName: 'Visa', description: 'Work / Entry Visa (cross-border)', numberName: 'Visa Number', documentName: 'Visa',
      recurring: 'Per visa term', monitorType: 'Visa expiry', jurisdiction: 'Issuing country',
      monitor: 'Visa expiry date for cross-border drivers.' },
    { id: 'training-cert', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Training Certificate', description: 'Driver Training Completion Certificate', numberName: '', documentName: 'Training Completion Certificate',
      recurring: 'Annual (per course)', monitorType: 'Next training renewal due', jurisdiction: 'Company policy',
      monitor: 'Training certificate renewal (e.g., TDG, HOS, load securement, defensive driving) — reminders 90/60/30 days.',
      note: 'Covers assigned onboarding / annual training courses.' },

    // ── Additional Driver records (identifiers, legal, payroll & personal documents) ──
    // Two identifier numbers (no document) + a set of driver hiring / personal / financial documents.
    { id: 'abstract-number', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'C', docRequirement: 'none',
      recordName: 'Abstract Number', description: 'Driver Abstract / Driving Record Reference Number', numberName: 'Abstract Number', documentName: '',
      recurring: 'Number does not expire', monitorType: 'No expiry', jurisdiction: 'Issuing province / state',
      monitor: 'Reference number for the driver abstract; the abstract document itself is reviewed annually.',
      note: 'The abstract document is tracked under Driver Abstract.' },
    { id: 'da-consortium-id', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'C', docRequirement: 'none',
      recordName: 'Drug & Alcohol Consortium ID', description: 'Drug & Alcohol Consortium / C-TPA Membership ID', numberName: 'Consortium / C-TPA Member ID', documentName: '',
      recurring: 'While enrolled', monitorType: 'Active/inactive status', jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Membership ID for the driver’s random-testing consortium (C/TPA). Track active enrollment.' },
    { id: 'offense-ticket', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Offense Ticket', description: 'Traffic Offense / Violation Ticket', numberName: '', documentName: 'Offense / Violation Ticket',
      recurring: 'Per incident', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'Issuing jurisdiction',
      monitor: 'Traffic violation ticket issued to the driver; feeds the certificate of violations and abstract review.' },
    { id: 'notice-of-trial', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Notice of Trial', description: 'Court Notice of Trial (traffic / offense matter)', numberName: '', documentName: 'Notice of Trial',
      recurring: 'Per notice', monitorType: 'Court / hearing date', tracksIssueDate: true, jurisdiction: 'Issuing court',
      monitor: 'Scheduled court / hearing date for a contested offense ticket.' },
    { id: 'criminal-record', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Criminal Record Document', description: 'Criminal Record / Background Check Result', numberName: '', documentName: 'Criminal Record Check',
      recurring: 'Per hire / periodic', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'National / provincial police service',
      monitor: 'Criminal record / background check result retained for screening; re-run per company policy.' },
    { id: 'payroll-statement', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Payroll Statement', description: 'Driver Payroll Statement / Pay Stub', numberName: '', documentName: 'Payroll Statement',
      recurring: 'Per pay period', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'Company payroll',
      monitor: 'Driver pay statements retained per pay period.' },
    { id: 'travel-receipt', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Travel Receipt', description: 'Driver Travel / Expense Receipt', numberName: '', documentName: 'Travel Receipt',
      recurring: 'Per trip / expense', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'Company policy',
      monitor: 'Travel / expense receipts submitted by the driver for reimbursement.' },
    { id: 'payment-receipt', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Payment Receipt', description: 'Payment / Reimbursement Receipt', numberName: '', documentName: 'Payment Receipt',
      recurring: 'Per payment', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'Company policy',
      monitor: 'Proof-of-payment receipts on file.' },
    { id: 'experience-letter', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Employer Experience Letter', description: 'Previous Employer Experience / Reference Letter', numberName: '', documentName: 'Employer Experience Letter',
      recurring: 'Per prior employer', monitorType: 'On file', jurisdiction: 'Prior employer',
      monitor: 'Experience / reference letters from prior employers, supporting the safety performance history.' },
    { id: 'birth-certificate', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Birth Certificate', description: 'Driver Birth Certificate (proof of identity)', numberName: '', documentName: 'Birth Certificate',
      recurring: 'Does not expire', monitorType: 'On file', jurisdiction: 'Issuing vital-records office',
      monitor: 'Proof-of-identity document retained on file.' },
    { id: 'ssn-sin-card', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional', hideState: true, slotLabels: ['Front', 'Back'],
      recordName: 'SSN / SIN Card', description: 'Social Security Number (US) / Social Insurance Number (Canada) Card', numberName: 'SSN / SIN', documentName: 'SSN / SIN Card',
      recurring: 'Does not expire', monitorType: 'No expiry', jurisdiction: 'United States (SSA) / Canada (Service Canada)',
      monitor: 'Government identity / tax number and card; retained for payroll and tax. Store securely.' },
    { id: 'resume-cv', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Resume / CV', description: 'Driver Résumé / Curriculum Vitae', numberName: '', documentName: 'Resume / CV',
      recurring: 'Updated as needed', monitorType: 'On file', jurisdiction: 'N/A',
      monitor: 'Applicant résumé / CV retained with the hiring file.' },
    { id: 'lease-agreement', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Lease Agreement', description: 'Owner-Operator / Independent Contractor Lease Agreement', numberName: '', documentName: 'Lease Agreement',
      recurring: 'Per lease term', monitorType: 'Lease expiry / renewal', tracksIssueDate: true, jurisdiction: 'Contract',
      monitor: 'Owner-operator lease agreement; monitor lease end / renewal date.' },
    { id: 'offer-letter', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Offer Letter', description: 'Employment Offer Letter', numberName: '', documentName: 'Offer Letter',
      recurring: 'Once per hire', monitorType: 'On file', tracksIssueDate: true, jurisdiction: 'Company',
      monitor: 'Signed employment offer letter retained in the hiring file.' },
];

// ── Upload mode classification (per the safety-software workbook) ──────
// Single upload (one file; replaces): MC, FEIN (147C), Articles of Incorporation, Carrier Code, BOC-3.
// Event/replacement (multiple dated versions, no fixed schedule): Drug Test, MCS-90, and the toll/
// transponder passes (reissued/replaced ad-hoc). Everything else with a document is recurring
// (retain previous + new dated version on renew/reissue/review/replace). Compliance-only records
// (USDOT, IRP Plate) have no document → no upload mode.
// Single (one file; replaces) also covers the once-per-hire driver DQ paperwork.
const SINGLE_UPLOAD_IDS = new Set(['mc', 'fein', 'articles', 'carrier-code', 'boc3',
    'safety-perf-history', 'road-test', 'driver-application', 'cvor-level-2',
    // Once-on-file driver personal / hiring documents (replace on update).
    'criminal-record', 'birth-certificate', 'ssn-sin-card', 'resume-cv', 'offer-letter']);
// Event/replacement (re-pulled ad-hoc) also covers the PSP report and per-incident / ad-hoc driver documents.
const EVENT_UPLOAD_IDS = new Set(['drug-test', 'mcs90', 'dtops', 'ezpass', 'prepass', 'bestpass', 'apass', 'bwb-pass',
    'psp-report',
    'offense-ticket', 'notice-of-trial', 'travel-receipt', 'payment-receipt', 'experience-letter']);
for (const r of SAFETY_RECORDS) {
    if (r.type === 'C') continue; // Compliance-only — no document, no upload mode.
    r.uploadMode = SINGLE_UPLOAD_IDS.has(r.id) ? 'single' : EVENT_UPLOAD_IDS.has(r.id) ? 'event' : 'recurring';
}

export const UPLOAD_MODE_LABEL: Record<UploadMode, string> = {
    single: 'Single upload',
    recurring: 'Recurring · dated versions',
    event: 'Event-based · dated versions',
};

// ── Ordering + labels used by the catalog view ────────────────────────

/** The 5 categories in canonical order (matches the compliance category tabs). */
export const SAFETY_CATEGORY_ORDER: KeyNumberGroup[] = [
    'Regulatory and Safety Numbers',
    'Tax and Business Identification Numbers',
    'Carrier & Industry Codes',
    'Bond and Registration Numbers',
    'Other',
];

// Display order for the record-type switch — "Compliance & Documents" first.
export const RECORD_TYPE_ORDER: RecordTypeId[] = ['DC', 'C', 'D'];

export const RECORD_TYPE_LABEL: Record<RecordTypeId, string> = {
    C: 'Compliances',
    D: 'Documents',
    DC: 'Compliances & Documents',
};

export const ENTITY_ORDER: EntityId[] = ['Carrier', 'Asset', 'Driver'];

/** Monitoring labels that are status-based (no concrete date to alert on). */
const STATUS_ONLY = new Set([
    'No expiry', 'No expiry (unless jurisdiction sets one)', 'Active/inactive status',
    'Authority / status change', 'Active status / replacement', 'Filing status / change',
    'Linked to insurance policy', 'Status / next review',
    'Pre-employment / status', 'Completion status', 'On file',
]);

/** True when the record monitors a real date (vs. a status). */
export const isDateMonitored = (r: SafetyRecord): boolean => !STATUS_ONLY.has(r.monitorType);
