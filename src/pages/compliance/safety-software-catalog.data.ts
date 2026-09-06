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

/**
 * Per-field configuration for a CUSTOM record's data-entry form.
 *
 * A custom record is authored in Settings ▸ New Compliance & Documents as a small
 * FORM DEFINITION — the user picks which fields the record's data-entry form (rendered
 * by `VersionFields` on the Default Compliances & Documents page) should show, and which
 * of those are required. `undefined` on a record means "system default" — the built-in
 * field rules apply and the form looks exactly as it always has.
 */
/**
 * An extra single-select field on a record's data-entry form, captured per version in
 * `DocVersion.fields[key]`. Declared on the catalog record so the office form
 * (`VersionFields`), the Settings preview and the driver-side chat request all render
 * the same field set from one definition.
 */
/**
 * Shared by every extra-field kind: where the field sits among the others, and whether it
 * begins a fresh row. Without these, fields render grouped by KIND — every select, then
 * every text, then the dates — which is the right default but not always the right reading
 * order. A pay statement wants its period dates first and its amount beside its currency.
 */
interface RecordFieldPlacement {
    /** Sort key among a record's extra fields; equal values keep their kind grouping. */
    order?: number;
    /** Start a new grid row at this field, so what follows pairs with it rather than with
     *  whatever came before. */
    rowStart?: boolean;
}

export interface RecordSelectField extends RecordFieldPlacement {
    /** Stable key under `DocVersion.fields`. */
    key: string;
    label: string;
    options: string[];
    required?: boolean;
    placeholder?: string;
    /** How it is picked — a dropdown (default), or radio buttons for a short either/or set. */
    control?: 'select' | 'radio';
}

/**
 * A field whose value is the NUMBER of a record that lives on ANOTHER page — a warning
 * letter's ticket, accident, hours-of-service violation or safety event.
 *
 * Which page it opens is not fixed: one letter comes from a ticket, the next from an
 * accident, so the destination is read from the select field that names the source (`from`)
 * and mapped through `paths`. A value with no path — "Other" — simply is not a link.
 *
 * The letter is also filed with the source record's own id (`DocVersion.sourceRecordId`), so
 * the link opens THAT record rather than dropping the reader on a list to find it again.
 */
export interface RecordFieldSourceLink {
    /** Key of the select field whose value names the source (e.g. `letterSource`). */
    from: string;
    /** That value → the page path it opens. */
    paths: Record<string, string>;
}

/**
 * A free-text field on a record's data-entry form, captured per version in
 * `DocVersion.fields[key]` exactly like a select field.
 */
export interface RecordTextField extends RecordFieldPlacement {
    key: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    /** Render a text AREA rather than a single line — for values that run to a list or a note. */
    multiline?: boolean;
    /** This value names a record elsewhere in the app — show it as a link that opens it. */
    sourceLink?: RecordFieldSourceLink;
    /** Values the demo / sample generators cycle through. Prototype data only. */
    demoValues?: string[];
}

/**
 * A date field on a record's data-entry form, captured per version in
 * `DocVersion.fields[key]` as an ISO `YYYY-MM-DD` string. Distinct from the record's
 * built-in issue / expiry dates: these are dates the record itself is ABOUT (the
 * employment a safety-performance investigation covers), not dates it is monitored on.
 */
export interface RecordDateField extends RecordFieldPlacement {
    key: string;
    label: string;
    required?: boolean;
    /** Values the demo / sample generators cycle through. Prototype data only. */
    demoValues?: string[];
}

/**
 * A READ-ONLY field computed from two date fields — an employment period from its start
 * and end date. Never stored: it is derived on every read, so it cannot drift out of step
 * with the dates it comes from, and correcting a date corrects it everywhere at once.
 */
export interface RecordDerivedField extends RecordFieldPlacement {
    key: string;
    label: string;
    /** The `[start, end]` date-field keys it spans. */
    from: [string, string];
    /**
     * How to say the span. 'months' (the default) reads it as years and months, for a span
     * of employment; 'days' reads it as weeks or days, for a pay period — where "less than
     * a month" would be true of every record and tell you nothing.
     */
    format?: 'months' | 'days';
    /** Placeholder shown while either date is still missing. */
    hint?: string;
}

/** One extra field on a record's form, tagged with how it is entered. */
export type RecordFieldDef =
    | ({ kind: 'select' } & RecordSelectField)
    | ({ kind: 'text' } & RecordTextField)
    | ({ kind: 'date' } & RecordDateField)
    | ({ kind: 'derived' } & RecordDerivedField);

/**
 * Every extra field a record captures, in form / column order: by default what it IS
 * (selects, then free text), then WHEN (dates), then anything computed from those dates —
 * so a derived value always renders after the fields it is calculated from. A record that
 * needs a different reading order sets `order` on its fields.
 */
export function recordFields(r: SafetyRecord): RecordFieldDef[] {
    const defs: RecordFieldDef[] = [
        ...(r.selectFields ?? []).map(f => ({ kind: 'select' as const, ...f })),
        ...(r.textFields ?? []).map(f => ({ kind: 'text' as const, ...f })),
        ...(r.dateFields ?? []).map(f => ({ kind: 'date' as const, ...f })),
        ...(r.derivedFields ?? []).map(f => ({ kind: 'derived' as const, ...f })),
    ];
    // Stable, so a record that sets no `order` keeps exactly the grouping above.
    return defs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Demo values a generator may cycle through for one field (a derived field has none). */
export function fieldPool(f: RecordFieldDef): string[] {
    if (f.kind === 'select') return f.options;
    if (f.kind === 'derived') return [];
    return f.demoValues ?? [];
}

/** Whole months from `a` to `b`, or -1 if either is missing / unparseable / out of order. */
function monthsBetween(a: string, b: string): number {
    if (!a || !b) return -1;
    const s = new Date(`${a}T00:00:00`), e = new Date(`${b}T00:00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return -1;
    let m = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    if (e.getDate() < s.getDate()) m -= 1; // the final month is not complete yet
    return m;
}

/** A span of two dates in plain words — "3 years 5 months". Empty when it cannot be worked out. */
export function durationLabel(start: string, end: string): string {
    const m = monthsBetween(start, end);
    if (m < 0) return '';
    if (m === 0) return 'Less than a month';
    const y = Math.floor(m / 12), mo = m % 12;
    return [y && `${y} ${y === 1 ? 'year' : 'years'}`, mo && `${mo} ${mo === 1 ? 'month' : 'months'}`]
        .filter(Boolean).join(' ');
}

/** Whole days from `a` to `b` counting BOTH ends — a period from the 1st to the 14th runs
 *  14 days, which is how a pay period is read. -1 if either is missing or out of order. */
function daysBetween(a: string, b: string): number {
    if (!a || !b) return -1;
    const s = new Date(`${a}T00:00:00`), e = new Date(`${b}T00:00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return -1;
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
}

/** A short span in plain words — "2 weeks", "15 days". Empty when it cannot be worked out. */
export function daySpanLabel(start: string, end: string): string {
    const d = daysBetween(start, end);
    if (d < 0) return '';
    if (d >= 7 && d % 7 === 0) { const w = d / 7; return `${w} ${w === 1 ? 'week' : 'weeks'}`; }
    return `${d} ${d === 1 ? 'day' : 'days'}`;
}

/**
 * The value to DISPLAY for one of a record's extra fields. Every render site (the form, the
 * list columns, the mobile cards, the detail facts) reads through this, so a derived field
 * is computed once here rather than special-cased in each of them.
 */
export function fieldValue(f: RecordFieldDef, fields?: Record<string, string>): string {
    if (f.kind !== 'derived') return fields?.[f.key] ?? '';
    const start = fields?.[f.from[0]] ?? '', end = fields?.[f.from[1]] ?? '';
    return f.format === 'days' ? daySpanLabel(start, end) : durationLabel(start, end);
}

/** DOT / non-DOT testing reasons offered on a Drug Test Result record. */
export const DRUG_TEST_TYPES = [
    'Pre-Employment DOT',
    'Pre-Employment Non-DOT',
    'Return on Duty',
    'Follow-Up',
    'Post-Accident Drug & Alcohol',
];

/** A drug & alcohol test has one of two outcomes — this replaces the generic status list. */
export const DRUG_TEST_RESULTS = ['Negative', 'Positive'];

export interface CustomFieldConfig {
    /** Show this field on the data-entry form. */
    enabled: boolean;
    /** Mark it required (the form flags it, not hard-validated in the prototype). */
    required: boolean;
}
export interface CustomFormConfig {
    /** Number / code / account value (e.g. "License Number"). */
    numberField: CustomFieldConfig;
    country: CustomFieldConfig;
    state: CustomFieldConfig;
    issueDate: CustomFieldConfig;
    expiryDate: CustomFieldConfig;
    status: CustomFieldConfig;
    /** Document upload — `multi` allows several documents on one record. */
    upload: CustomFieldConfig & { multi: boolean };
    monitoring: { enabled: boolean };
    tags: { enabled: boolean };
    notes: { enabled: boolean };
}

/** Fresh custom-form definition — mirrors a standard "Compliance & Document" record. */
export const DEFAULT_CUSTOM_FORM: CustomFormConfig = {
    numberField: { enabled: true, required: true },
    country: { enabled: true, required: false },
    state: { enabled: true, required: false },
    issueDate: { enabled: true, required: false },
    expiryDate: { enabled: true, required: true },
    status: { enabled: false, required: false },
    upload: { enabled: true, required: true, multi: false },
    monitoring: { enabled: true },
    tags: { enabled: true },
    notes: { enabled: true },
};

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
    /** Default notification-reminder windows (days before the monitored date). Falls back to
     *  the global default [90, 60, 30] when unset. Only applies to date-monitored records. */
    defaultReminders?: number[];
    /**
     * Which date monitoring starts from by default. 'issue' suits anything on a review cycle
     * — the next one falls due a recurrence after it was pulled — and needs `tracksIssueDate`.
     * Unset behaves as 'expiry'.
     */
    defaultMonitorBasis?: 'issue' | 'expiry';
    /** Guidance about the record itself, shown as an info card at the top of its form
     *  (e.g. how often to re-pull it). Not a monitoring setting — advice for the user. */
    practiceNote?: string;
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
    /** Hide the Country selector — the record captures no jurisdiction at all. */
    hideCountry?: boolean;
    /** Pre-select this country on a new record (e.g. a US-federal report). */
    defaultCountry?: string;
    /** Hide the monitored-status field — the record has neither a date nor a status to track. */
    hideStatus?: boolean;
    /** Extra single-select fields the data-entry form captures (e.g. a drug test's Test type). */
    selectFields?: RecordSelectField[];
    /** Extra free-text fields the data-entry form captures (e.g. a licence's class / endorsements). */
    textFields?: RecordTextField[];
    /** Name a NEW record takes, when it differs from the catalog's formal `recordName`. */
    versionName?: string;
    /** A previous `versionName` / `recordName`, so stored records get relabelled on rename. */
    versionRenamedFrom?: string;
    /** Extra date fields the record is ABOUT (e.g. the employment a history covers). */
    dateFields?: RecordDateField[];
    /** Read-only fields computed from two of the record's dates (e.g. an employment period). */
    derivedFields?: RecordDerivedField[];
    /** Label for the monitored-status field (defaults to "Status"). */
    statusLabel?: string;
    /** Allowed values for the monitored-status field (defaults to the generic status list). */
    statusOptions?: string[];
    /** How the monitored-status field is picked — a dropdown (default) or radio buttons for a
     *  short, mutually exclusive set (e.g. a test result). */
    statusControl?: 'select' | 'radio';
    /** No monitoring / notifications on this record — there is no date or status change to alert on. */
    hideMonitoring?: boolean;
    /** A new version defaults its display name to the RECORD's name rather than "Record <year>". */
    nameFromRecord?: boolean;
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
    /** True for user-created records (Settings ▸ New Compliance & Documents ▸ Add custom record) — these are editable & deletable. */
    custom?: boolean;
    /** Field-by-field data-entry form definition — present only on custom records (drives `VersionFields`). */
    customForm?: CustomFormConfig;
}

/**
 * Where a warning letter can come from. Declared here rather than in the review pages so the
 * catalog record, the list filter and every surface that issues one agree on the wording.
 */
export const WARNING_LETTER_SOURCES = ['Hours of Service', 'Safety Event', 'Ticket', 'Accident', 'Other'] as const;

/**
 * Where each of those sources lives, so a filed letter can open the record it was issued
 * for. Keyed by the value stored on the letter, and pointing at the same page paths the
 * shared record links use. "Other" is deliberately absent: a letter written by hand about
 * something this system does not track has nothing to open.
 */
export const WARNING_LETTER_SOURCE_PATHS: Record<string, string> = {
    'Hours of Service': '/safety-event/hours-of-service-violations',
    'Safety Event': '/safety-events',
    Ticket: '/tickets',
    Accident: '/default-accidents',
};

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
    // A test is an event, not a credential: it captures WHY the driver was tested and the
    // outcome, plus the date it was taken. No jurisdiction fields — the test is federal
    // (or company) policy, not state-issued.
    { id: 'drug-test', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Drug Test Result', description: 'Drug and Alcohol Testing Record', numberName: '', documentName: 'Drug & Alcohol Test Result / Employer Testing Record',
      recurring: 'Per test', monitorType: 'On file', tracksIssueDate: true, hideCountry: true, hideState: true, nameFromRecord: true,
      // A result is final the day it is issued — nothing to monitor.
      hideMonitoring: true,
      selectFields: [{ key: 'testType', label: 'Test type', options: DRUG_TEST_TYPES, required: true, placeholder: 'Select test type' }],
      statusLabel: 'Test result', statusOptions: DRUG_TEST_RESULTS, statusControl: 'radio',
      jurisdiction: 'Applicable DOT testing jurisdiction',
      monitor: 'Point-in-time drug & alcohol test result; no document expiry. Retained on file.' },
    { id: 'hazmat', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'HAZMAT', description: 'PHMSA Hazardous Materials Registration', numberName: 'HAZMAT Registration Number', documentName: 'HAZMAT Certificate of Registration',
      recurring: 'Yes', monitorType: 'Expiry date', configuredDate: '2026-06-30', jurisdiction: 'United States, federal',
      monitor: 'Expiry date.' },
    { id: 'mcs90', category: 'Regulatory and Safety Numbers', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'MCS-90', description: 'Motor Carrier Public Liability Endorsement', numberName: '', documentName: 'MCS-90 Endorsement',
      recurring: 'No independent expiry', monitorType: 'Linked to insurance policy', jurisdiction: 'United States, federal',
      monitor: 'Linked to the insurance policy — monitor policy effective/expiry dates & replacement/cancellation status.' },
    // A federal credential: card number + issuing country + the expiry it is monitored on.
    // No state/province (it is federal) and no issue date — only the card's own expiry drives
    // the alerts, which also means monitoring never offers a renewal cadence.
    { id: 'twic', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'TWIC Card', description: 'Transportation Worker Identification Credential', numberName: 'TWIC Card Number', documentName: 'TWIC Card Copy',
      recurring: 'Variable expiry', monitorType: 'Card expiry date',
      hideState: true, nameFromRecord: true,
      jurisdiction: 'United States, federal',
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
    // The catalog entry is the formal licence class of record; what you file against a driver
    // is simply their driver licence, so new records are named that rather than after the
    // catalog heading.
    { id: 'cdl', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required', isLicense: true,
      recordName: 'Commercial Driver License', description: "Commercial Driver's License (CDL)", numberName: 'CDL Number', documentName: "Driver's License / CDL", slotLabels: ['Front of License', 'Back of License'],
      recurring: 'Per licence term', monitorType: 'Licence expiry date', tracksIssueDate: true, nameFromRecord: true,
      versionName: 'Driver License', versionRenamedFrom: 'CDL',
      jurisdiction: 'Issuing state / province',
      textFields: [
          { key: 'licenseClass', label: 'License class', placeholder: 'e.g. A', demoValues: ['A', 'B', 'A', 'C'] },
          // Endorsements and restrictions are lists, often written out in full — they need room.
          { key: 'endorsements', label: 'Endorsements', placeholder: 'e.g. H — Hazmat, N — Tank vehicle', multiline: true,
            demoValues: ['H — Hazmat, N — Tank vehicle', 'T — Double/triple trailers', 'N — Tank vehicle, T — Double/triple trailers', 'H — Hazmat'] },
          { key: 'restrictions', label: 'Restrictions', placeholder: 'e.g. L — No air brakes, Z — No full air brakes', multiline: true,
            demoValues: ['L — No air brakes', 'Z — No full air brakes', 'L — No air brakes, Z — No full air brakes', 'E — No manual transmission'] },
      ],
      monitor: 'Licence expiry date. Store class, endorsements, restrictions and issue date.' },
    { id: 'medical-cert', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Medical Certificate', description: "Medical Examiner's Certificate (DOT Medical Card, MCSA-5876)", numberName: 'National Registry Number', documentName: "Medical Examiner's Certificate",
      recurring: 'Per medical term (≤ 24 months)', monitorType: 'Medical card expiry', tracksIssueDate: true, jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Medical certificate expiry date (max 24-month term, 49 CFR 391.41).' },
    // An MVR does not expire — it is pulled, reviewed, and pulled again. The date tracked is
    // when the next one falls due, so that is what the form and the monitoring both call it.
    { id: 'mvr', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'MVR', description: 'Motor Vehicle Record (MVR)', numberName: 'MVR Order / Reference Number', documentName: 'Motor Vehicle Record (MVR)',
      recurring: 'Annual', monitorType: 'Next renew date', nameFromRecord: true,
      jurisdiction: 'Driver licensing state / province',
      monitor: 'Reviewed at least every 12 months (§391.25).' },
    // An abstract is pulled and reviewed on a cycle rather than expiring, so monitoring runs
    // from the ISSUE date on an annual recurrence, and the date captured is the next review.
    { id: 'driver-cvdr', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required', tracksIssueDate: true,
      recordName: 'Driver Commercial Abstract', description: 'Driver Commercial Abstract (CVDR / CDR / CDA)', numberName: 'Abstract Reference Number', documentName: 'Driver Commercial Abstract',
      recurring: 'Annual', monitorType: 'Next review date', nameFromRecord: true,
      defaultMonitorBasis: 'issue', jurisdiction: 'Issuing province / state',
      monitor: 'Annual review of the driver commercial abstract. Monitored from the issue date on an annual cycle. Reminders 30 / 15 days before the review due date.',
      note: 'Canadian commercial driver record — provincial equivalent of the MVR.',
      defaultReminders: [30, 15],
      practiceNote: 'Renewing every 90 days is good practice for this record.' },
    // A PSP is pulled once per hire and filed: it has no expiry, no status to track and
    // nothing to alert on, so it captures only the date it was pulled and the report itself.
    // FMCSA is US-federal, so the country is fixed and there is no state.
    { id: 'psp-report', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'PSP Report', description: 'FMCSA Pre-Employment Screening Program Report', numberName: '', documentName: 'FMCSA PSP Report',
      recurring: 'Per hire', monitorType: 'Pre-employment / status',
      nameFromRecord: true, tracksIssueDate: true, defaultCountry: 'United States', hideState: true,
      hideStatus: true, hideMonitoring: true,
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Pre-employment screening record (5-yr crash / 3-yr inspection); re-pull as needed — no fixed expiry.' },
    // A query is run, comes back either restricted or not, and is re-run on a cycle. Both
    // answers are either/or, so they are radio pairs rather than dropdowns — and both are
    // worth filtering the list by. FMCSA is US-federal: country fixed, no state.
    { id: 'clearinghouse-query', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Clearinghouse Query', description: 'FMCSA Drug & Alcohol Clearinghouse Query', numberName: 'Query Reference Number', documentName: 'Clearinghouse Query Result',
      recurring: 'Annual', monitorType: 'Next review date',
      nameFromRecord: true, tracksIssueDate: true, defaultCountry: 'United States', hideState: true,
      selectFields: [
          { key: 'queryType', label: 'Query type', options: ['Full Query', 'Limited Query'], control: 'radio', required: true },
          { key: 'queryResult', label: 'Query result', options: ['Not Restricted', 'Restricted'], control: 'radio', required: true },
      ],
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Annual limited query due date (§382.701). Monitored on the issue date, the next review date, or a custom date.' },
    // A review is performed on a date and the next one falls due 12 months later, so the
    // record captures both dates and can be monitored from either — or a custom date. The
    // review is of the driver's record as a whole, not of one state's, so there is no state.
    { id: 'annual-review', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Annual Driver Review', description: 'Annual Review of Driving Record (§391.25)', numberName: '', documentName: 'Annual Review of Driving Record',
      recurring: 'Annual', monitorType: 'Next review date',
      nameFromRecord: true, tracksIssueDate: true, hideState: true, defaultMonitorBasis: 'issue',
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Annual review of driving record due each 12 months (§391.25). Monitored on the issue date, the next review date, or a custom date.' },
    // A §391.23 investigation is run PER PREVIOUS EMPLOYER, so the record captures which
    // employer and the period worked there. The period is derived from the two dates rather
    // than typed — one less thing to keep in step, and it cannot contradict them. There is no
    // jurisdiction: what is investigated is an employment, not a state's records. Nor is there
    // anything to track: the investigation is run once at hire and filed, so it carries no
    // recurring date to alert on and no status to watch — the record IS the finding.
    { id: 'safety-perf-history', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Safety Performance History', description: 'Previous Employer Safety Performance History (§391.23)', numberName: '', documentName: 'Safety Performance History Records',
      recurring: 'Once per hire', monitorType: 'Completion status',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      textFields: [
          { key: 'employerName', label: 'Employer name', placeholder: 'Previous employer', required: true,
            demoValues: ['Northline Transport Ltd.', 'Bison Freight Systems', 'Copperline Carriers Inc.'] },
      ],
      // Matched pools — the generators pick the SAME index for every date field on a record,
      // so entry n of one lines up with entry n of the other and the span stays positive.
      dateFields: [
          { key: 'employmentStart', label: 'Employment start date', required: true,
            demoValues: ['2015-06-15', '2018-03-01', '2020-01-06'] },
          { key: 'employmentEnd', label: 'Employment end date', required: true,
            demoValues: ['2018-02-28', '2021-08-31', '2023-11-30'] },
      ],
      derivedFields: [
          { key: 'employmentPeriod', label: 'Employment period', from: ['employmentStart', 'employmentEnd'], hint: 'Set both dates' },
      ],
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Investigate prior 3 years of employment at hire (§391.23); retained in the DQ file.' },
    // A road test is given for a reason and either passed or failed on a given day. Both
    // answers are either/or, so they are radio pairs and both are worth filtering the list
    // by. The certificate is filed once and does not expire, so the outcome IS the record's
    // result field — there is no separate status to watch and nothing to alert on.
    { id: 'road-test', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Road Test Certificate', description: 'Road Test Certificate (§391.31)', numberName: '', documentName: 'Road Test Certificate',
      recurring: 'Once (or accepted equivalent)', monitorType: 'Completion status',
      nameFromRecord: true, hideStatus: true, hideMonitoring: true,
      selectFields: [
          { key: 'testReason', label: 'Test reason', options: ['Pre-Employment', 'Post-Accident'], control: 'radio', required: true },
          { key: 'testResult', label: 'Result', options: ['Pass', 'Fail'], control: 'radio', required: true },
      ],
      dateFields: [
          { key: 'testDate', label: 'Test date', required: true, demoValues: ['2024-02-12', '2022-07-05', '2025-09-18'] },
      ],
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Road test certificate or accepted equivalent — CDL / prior certificate (§391.33).' },
    // The application is filled in on a day and filed. It captures that date and the
    // document itself, and nothing else: it is applied FOR a job, not issued by a
    // jurisdiction, and it neither expires nor changes state — so no country, no state, no
    // status to watch and nothing to alert on.
    { id: 'driver-application', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Driver Application', description: 'Driver Application for Employment (§391.21)', numberName: '', documentName: 'Driver Application for Employment',
      recurring: 'Once per hire', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      dateFields: [
          { key: 'applicationDate', label: 'Application date', required: true,
            demoValues: ['2019-03-15', '2021-06-28', '2023-08-04'] },
      ],
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Completed employment application retained in the DQ file (§391.21).' },
    { id: 'passport', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'required', hideState: true, allCountries: true,
      nameFromRecord: true,
      recordName: 'Passport', description: 'Driver Passport', numberName: 'Passport Number', documentName: 'Passport',
      recurring: 'Per passport term', monitorType: 'Passport expiry', tracksIssueDate: true, jurisdiction: 'Issuing country',
      monitor: 'Passport expiry date.' },
    // A card, so it is named after itself and monitored on the date it runs out. It is
    // issued by a country's border agency (CBP / CBSA), not by a state, so it keeps the
    // standard country selector — which already offers exactly the FAST lanes, US, Canada
    // and Mexico — and drops the state.
    { id: 'fast-card', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional',
      recordName: 'FAST Card', description: 'Free and Secure Trade (FAST) Card', numberName: 'FAST Card Number', documentName: 'FAST Card',
      recurring: 'Per card term', monitorType: 'Card expiry',
      nameFromRecord: true, hideState: true,
      jurisdiction: 'US–Canada border (CBP / CBSA)',
      monitor: 'FAST card expiry date. Monitored on the card expiry or a custom date — the card is replaced, not renewed on a cycle.' },
    // Both are granted by a COUNTRY, not by one of its states — so the country stays (it is
    // the whole point of the record: which country admitted the driver) and the state goes.
    { id: 'visa', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
      hideState: true, nameFromRecord: true,
      selectFields: [
          { key: 'visaType', label: 'Visa type', options: ['B1/B2', 'TN', 'H-2B', 'L-1', 'Other'] },
      ],
      recordName: 'Visa', description: 'Entry / Travel Visa (cross-border)', numberName: 'Visa Number', documentName: 'Visa',
      recurring: 'Per visa term', monitorType: 'Visa expiry', jurisdiction: 'Issuing country',
      monitor: 'Visa expiry date for cross-border drivers. Monitor the current (most recent) visa.' },
    { id: 'work-permit', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
      hideState: true, nameFromRecord: true,
      selectFields: [
          { key: 'permitType', label: 'Permit type', options: ['Open Work Permit', 'Employer-Specific (LMIA)', 'Post-Graduation (PGWP)', 'Other'] },
      ],
      recordName: 'Work Permit', description: 'Work / Employment Authorization Permit (cross-border)', numberName: 'Work Permit Number', documentName: 'Work Permit',
      recurring: 'Per permit term', monitorType: 'Work permit expiry', jurisdiction: 'Issuing country',
      monitor: 'Work permit / employment-authorization expiry date. Monitor the current (most recent) permit.' },
    // Proof of permanent residence — one per country, and both work the way the work permit
    // above does: a number plus the card itself, kept as dated versions so a renewal is filed
    // alongside the one it replaces rather than overwriting it. The STATUS is permanent but
    // the CARD is not, so both are monitored on the card's expiry. The issuing country is
    // fixed for each (USCIS / IRCC), so it is pre-filled and there is no state.
    { id: 'green-card', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
      hideState: true, defaultCountry: 'United States', nameFromRecord: true,
      recordName: 'Green Card', description: 'US Permanent Resident Card (Form I-551)', numberName: 'Green Card Number', documentName: 'Green Card',
      recurring: 'Per card term', monitorType: 'Green card expiry', jurisdiction: 'United States (USCIS)',
      monitor: 'Permanent Resident Card expiry date. Monitor the current (most recent) card — the residence itself does not lapse with it.' },
    { id: 'pr-documents', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
      hideState: true, defaultCountry: 'Canada', nameFromRecord: true,
      recordName: 'PR Documents', description: 'Permanent Residence Documents (PR Card / Confirmation of PR)', numberName: 'PR / UCI Number', documentName: 'PR Documents',
      recurring: 'Per card term', monitorType: 'PR card expiry', jurisdiction: 'Canada (IRCC)',
      monitor: 'Permanent Resident card expiry date. Monitor the current (most recent) card — PR status itself does not lapse with it.' },
    { id: 'training-cert', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Training Certificate', description: 'Driver Training Completion Certificate', numberName: '', documentName: 'Training Completion Certificate',
      recurring: 'Annual (per course)', monitorType: 'Next training renewal due', jurisdiction: 'Company policy',
      monitor: 'Training certificate renewal (e.g., TDG, HOS, load securement, defensive driving) — reminders 90/60/30 days.',
      note: 'Covers assigned onboarding / annual training courses.' },

    // ── Additional Driver records (legal, payroll & personal documents) ──
    // A clearance check is run by a PROVIDER on a date and comes back clear or not. It does
    // not expire so much as go stale, so monitoring runs from the issue date on a three-year
    // cycle and the date it works out is when the next one is due. Cleared by a police
    // service rather than by a state, so it captures no jurisdiction.
    { id: 'criminal-record', category: 'Regulatory and Safety Numbers', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Police Clearance Check', description: 'Police Clearance Check (PCC) / Criminal Record Check', numberName: 'Reference Number', documentName: 'Police Clearance Check',
      recurring: 'Every 3 years', monitorType: 'Next renew date', tracksIssueDate: true,
      nameFromRecord: true, hideCountry: true, hideState: true, defaultMonitorBasis: 'issue',
      selectFields: [
          { key: 'checkResult', label: 'Result', options: ['Clear', 'Not Clear'], control: 'radio', required: true },
      ],
      textFields: [
          { key: 'provider', label: 'Provider', placeholder: 'Police service or screening provider', required: true,
            demoValues: ['RCMP', 'Ontario Provincial Police', 'Sterling Backcheck'] },
      ],
      jurisdiction: 'National / provincial police service',
      monitor: 'Police clearance check result. Monitored from the issue date on a three-year cycle; the next renew date is what that works out to.' },
    // A pay statement covers a PERIOD and pays an amount in a currency. The period's length
    // is worked out from its two dates rather than typed, and the currency is worth filtering
    // the list by for a carrier running both sides of the border. Paid by the company, not
    // issued by a jurisdiction, and filed rather than tracked — so no country, no state, no
    // separate issue date on top of the period, and nothing to alert on.
    { id: 'payroll-statement', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Payroll Statement', description: 'Driver Payroll Statement / Pay Stub', numberName: '', documentName: 'Payroll Statement',
      recurring: 'Per pay period', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      // Read in this order: what period it covers, how long that is, what it paid, in what.
      dateFields: [
          { key: 'periodStart', label: 'Period start', required: true,
            demoValues: ['2026-01-01', '2026-01-16', '2026-02-01'] },
          { key: 'periodEnd', label: 'Period end', required: true,
            demoValues: ['2026-01-15', '2026-01-31', '2026-02-14'] },
      ],
      derivedFields: [
          { key: 'payPeriod', label: 'Pay period', from: ['periodStart', 'periodEnd'], format: 'days',
            hint: 'Set both dates', order: 1 },
      ],
      textFields: [
          { key: 'payAmount', label: 'Pay amount', placeholder: 'e.g. 4,250.00', required: true,
            order: 2, rowStart: true, demoValues: ['4,250.00', '3,980.55', '5,120.75'] },
      ],
      selectFields: [
          { key: 'currency', label: 'Currency', options: ['CAD', 'USD'], required: true, order: 3 },
      ],
      jurisdiction: 'Company payroll',
      monitor: 'Driver pay statements retained per pay period.' },
    // One letter per prior employer, so the record captures which employer and the period
    // worked there — the period worked out from the two dates rather than typed. The same
    // shape as the safety performance history it supports: written by a past employer, not
    // issued by a jurisdiction, and filed once with nothing to alert on.
    { id: 'experience-letter', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Employer Experience Letter', description: 'Previous Employer Experience / Reference Letter', numberName: '', documentName: 'Employer Experience Letter',
      recurring: 'Per prior employer', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      textFields: [
          { key: 'employerName', label: 'Employer name', placeholder: 'Previous employer', required: true,
            demoValues: ['Northline Transport Ltd.', 'Bison Freight Systems', 'Copperline Carriers Inc.'] },
      ],
      // Matched pools — the generators pick the SAME index for every date field on a record,
      // so entry n of one lines up with entry n of the other and the span stays positive.
      dateFields: [
          { key: 'employmentStart', label: 'Employment start date', required: true,
            demoValues: ['2014-04-07', '2017-09-11', '2020-05-18'] },
          { key: 'employmentEnd', label: 'Employment end date', required: true,
            demoValues: ['2017-08-31', '2020-04-30', '2023-06-30'] },
      ],
      derivedFields: [
          { key: 'employmentPeriod', label: 'Employment period', from: ['employmentStart', 'employmentEnd'], hint: 'Set both dates' },
      ],
      jurisdiction: 'Prior employer',
      monitor: 'Experience / reference letters from prior employers, supporting the safety performance history.' },
    // The NUMBER is for life, but the CARD carries a term — a SIN issued to a temporary
    // resident expires with their permit — so the card is monitored on that expiry. Issued by
    // a national agency (SSA / Service Canada), so it keeps the country and drops the state.
    { id: 'ssn-sin-card', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'optional', hideState: true, slotLabels: ['Front', 'Back'],
      recordName: 'SSN / SIN Card', description: 'Social Security Number (US) / Social Insurance Number (Canada) Card', numberName: 'SSN / SIN', documentName: 'SSN / SIN Card',
      recurring: 'Per card term', monitorType: 'Card expiry', tracksIssueDate: true, nameFromRecord: true,
      jurisdiction: 'United States (SSA) / Canada (Service Canada)',
      monitor: 'Government identity / tax number and card; monitored on the card expiry. Retained for payroll and tax — store securely.' },
    // The letter states the TERMS of the job: when they start, on what basis, on what
    // schedule and over what territory. All three terms are worth filtering the roster by.
    // Offered by the company, not issued by a jurisdiction, and signed once and filed — so no
    // country, no state, no status and nothing to alert on.
    { id: 'offer-letter', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Offer Letter', description: 'Employment Offer Letter', numberName: '', documentName: 'Offer Letter',
      recurring: 'Once per hire', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      // Read in this order: when they join, then the three terms — the joining date starts a
      // row so the two radio pairs, which stand taller, end up side by side on their own.
      dateFields: [
          { key: 'joiningDate', label: 'Joining date', required: true, order: -2, rowStart: true,
            demoValues: ['2024-04-01', '2025-02-17', '2026-01-05'] },
      ],
      selectFields: [
          { key: 'employmentType', label: 'Employment type', options: ['Contract', 'Owner-Operator'], required: true, order: -1 },
          { key: 'workSchedule', label: 'Work schedule', options: ['Full-Time', 'Part-Time'], control: 'radio', required: true },
          { key: 'operatingZone', label: 'Operating zone', options: ['City Driver', 'Long Haul', 'Cross-Border'], control: 'radio', required: true },
      ],
      jurisdiction: 'Company',
      monitor: 'Signed employment offer letter retained in the hiring file.' },
    // The other end of the same employment. Filed once, with the date it took effect.
    { id: 'termination-letter', category: 'Other', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Termination Letter', description: 'Employment Termination / Separation Letter', numberName: '', documentName: 'Termination Letter',
      recurring: 'Once', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      dateFields: [
          { key: 'terminationDate', label: 'Termination date', required: true,
            demoValues: ['2024-11-29', '2025-06-13', '2026-03-31'] },
      ],
      jurisdiction: 'Company',
      monitor: 'Employment termination / separation letter retained in the driver file.' },
    // A warning letter is never issued on its own — it is always ABOUT something: an
    // hours-of-service violation, a telematics event, a ticket, an accident. So the letter
    // carries its source with it (where it was issued from, what happened, that record's own
    // number and date), filled in automatically when it is issued from a review and typed by
    // hand when one is filed directly. Without that the driver file shows a stack of letters
    // and no way to tell what any of them was for.
    { id: 'warning-letter', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Warning Letter', description: 'Driver Warning Letter (issued on review)', numberName: '', documentName: 'Warning Letter',
      recurring: 'Per incident', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      tracksIssueDate: true,
      selectFields: [
          { key: 'letterSource', label: 'Issued from', required: true, order: -3,
            options: [...WARNING_LETTER_SOURCES] },
      ],
      textFields: [
          { key: 'eventType', label: 'Event type', required: true, order: -2, rowStart: true,
            placeholder: 'e.g. 11-Hour Driving Limit',
            demoValues: ['11-Hour Driving Limit', 'Harsh Braking', 'Speeding', 'Rear-end collision'] },
          // The number of the record this letter is about — and a way back to it. A letter
          // that says "Ticket OFF-84729" and cannot show you that ticket makes the reader
          // go and find it by hand, which is the one thing the reference was meant to save.
          { key: 'eventReference', label: 'Event reference', order: -1,
            placeholder: 'e.g. HOSV-1042',
            sourceLink: { from: 'letterSource', paths: WARNING_LETTER_SOURCE_PATHS },
            demoValues: ['HOSV-1042', 'SE-2291', 'OFF-84729', 'ACC-2026-0021'] },
          { key: 'eventSummary', label: 'What happened', multiline: true, order: 2,
            placeholder: 'The event this letter was issued for.',
            demoValues: [
                'Exceeded the 11-hour driving limit by 42 minutes on a Chicago run.',
                'Harsh braking event recorded at 65 km/h in a 50 zone.',
                'Speeding citation issued on Hwy 401 westbound near Exit 312.',
                'Rear-end collision at low speed; no injuries reported.',
            ] },
      ],
      dateFields: [
          { key: 'eventDate', label: 'Event date', order: 1,
            demoValues: ['2026-01-05', '2025-08-21', '2025-11-01'] },
      ],
      jurisdiction: 'Company',
      monitor: 'Warning letter kept on file. It records an action already taken, so there is nothing to expire or renew.' },
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
    'criminal-record', 'ssn-sin-card', 'offer-letter', 'termination-letter']);
// Event/replacement (re-pulled ad-hoc) also covers the PSP report and per-incident / ad-hoc driver documents.
const EVENT_UPLOAD_IDS = new Set(['drug-test', 'mcs90', 'dtops', 'ezpass', 'prepass', 'bestpass', 'apass', 'bwb-pass',
    'psp-report', 'experience-letter']);
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

/** Character limit for a record's display name — the same wherever a record is named. */
export const MAX_RECORD_NAME = 40;

/**
 * Display name for a NEW version of a record. Most records are named by the year they
 * cover ("Record 2026"); records flagged `nameFromRecord` are named after the record
 * itself, because every version IS one of that thing (a drug test result, not a
 * yearly renewal of one). `versionName` overrides that where the catalog's formal name
 * is not what you would write on the record — the catalog lists "Commercial Driver
 * License", but what gets filed is a driver licence. `year` is passed when seeding
 * dated demo history.
 */
export function defaultVersionLabel(r: SafetyRecord, year?: number | string): string {
    const base = r.versionName ?? r.recordName;
    if (r.nameFromRecord || r.versionName) return year ? `${base} ${year}` : base;
    return `Record ${year ?? new Date().getFullYear()}`;
}

/** The values the monitored-status field offers for a record. */
export const statusOptionsFor = (r: SafetyRecord, fallback: string[]): string[] => r.statusOptions ?? fallback;
