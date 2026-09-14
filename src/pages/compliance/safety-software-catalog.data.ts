import { CA_PROVINCES } from '@/pages/compliance/jurisdiction.data';

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
    /**
     * Only ask this when another answer says it applies.
     *
     * A non-owned-trailer coverage limit is a real number on the policies that carry that
     * cover and a meaningless one on the policies that do not — asking every time invites a
     * figure to be filed against cover the carrier never bought. `field` names the other
     * field's key; it must be ticked, or equal `is` when given.
     */
    showWhen?: { field: string; is?: string };
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
    /**
     * The value records filed BEFORE this field existed must have had.
     *
     * Adding a question to a record with history leaves every stored record unanswered, and a
     * sampled answer is a guess presented as a fact. Where the old record could only have meant
     * one thing — the WSIB record was Ontario's board, because that is all the record was — it
     * takes that value instead. New records are unaffected: the field is still asked, blank.
     */
    priorValue?: string;
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
/**
 * A yes/no the record captures — an optional cover a policy either includes or does not.
 *
 * Distinct from a two-option select: "did they buy reefer breakdown cover" has an answer even
 * before anyone has been asked, and that answer is no. A select would sit empty and read as
 * unanswered.
 */
export interface RecordCheckField extends RecordFieldPlacement {
    key: string;
    label: string;
    /** One line under the label, saying what the cover actually is. */
    hint?: string;
}

export interface RecordTextField extends RecordFieldPlacement {
    key: string;
    label: string;
    placeholder?: string;
    required?: boolean;
    /**
     * Capture an amount together with the currency it is in. A coverage limit of 2,000,000 is
     * two different numbers on a cross-border carrier, and a policy filed without saying which
     * cannot be checked against a US minimum. The currency lands under `currencyKey`.
     */
    money?: { currencyKey: string; currencies: string[]; defaultCurrency?: string };
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
    | ({ kind: 'check' } & RecordCheckField)
    | ({ kind: 'date' } & RecordDateField)
    | ({ kind: 'derived' } & RecordDerivedField);

/** What a ticked check field stores. Anything non-empty reads as ticked. */
export const CHECKED = 'yes';

/**
 * Does this field apply, given what has been answered so far?
 *
 * A field gated on an answer nobody has given yet does not apply — so the form asks the
 * gating question first and the dependent one only once it has been answered that way.
 */
export function fieldApplies(f: { showWhen?: { field: string; is?: string } }, fields?: Record<string, string>): boolean {
    const w = f.showWhen;
    if (!w) return true;
    const v = (fields?.[w.field] ?? '').trim();
    return w.is === undefined ? v !== '' : v === w.is;
}

/** The fields a form should actually show for these answers (see `fieldApplies`). */
export function visibleRecordFields(r: SafetyRecord, fields?: Record<string, string>): RecordFieldDef[] {
    return recordFields(r).filter(f => fieldApplies(f, fields));
}

/**
 * Values to clear because the answer they hung off has changed.
 *
 * Un-ticking "non-owned trailer" must take its coverage limit with it: left behind, the
 * record still carries a limit for cover it no longer claims, and the figure reappears the
 * moment the box is ticked again — with a number nobody re-checked.
 */
export function strandedFieldKeys(r: SafetyRecord, fields?: Record<string, string>): string[] {
    const out: string[] = [];
    for (const f of recordFields(r)) {
        if (fieldApplies(f, fields)) continue;
        if ((fields?.[f.key] ?? '') !== '') out.push(f.key);
        // An amount takes its currency with it — a lone "CAD" is not a value.
        const cur = f.kind === 'text' ? f.money?.currencyKey : undefined;
        if (cur && (fields?.[cur] ?? '') !== '') out.push(cur);
    }
    return out;
}

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
        ...(r.checkFields ?? []).map(f => ({ kind: 'check' as const, ...f })),
        ...(r.dateFields ?? []).map(f => ({ kind: 'date' as const, ...f })),
        ...(r.derivedFields ?? []).map(f => ({ kind: 'derived' as const, ...f })),
    ];
    // Stable, so a record that sets no `order` keeps exactly the grouping above.
    return defs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Demo values a generator may cycle through for one field (a derived field has none). */
export function fieldPool(f: RecordFieldDef): string[] {
    if (f.kind === 'select') return f.options;
    // A yes/no is drawn, not sampled from a list; a derived value is computed.
    if (f.kind === 'derived' || f.kind === 'check') return [];
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

/**
 * ONE kind of document on a record that holds several — see `SafetyRecord.variantByField`.
 *
 * Only what differs is listed; everything unset stays as the record declares it. A certificate
 * of incorporation is issued once and never expires, a master business licence expires and is
 * renewed — so a single form asking both for an expiry date is asking one of them for a date
 * that does not exist, and offering an alert that can never fire.
 */
export interface RecordVariant {
    /** Label of the number field on THIS document (e.g. a corporation number). */
    numberName?: string;
    /** The document's own name, for the upload block. */
    documentName?: string;
    /** Whether this document carries an issue date. */
    tracksIssueDate?: boolean;
    /** What is monitored — a status-only value (e.g. 'No expiry') means no date is asked for. */
    monitorType?: string;
    /** Nothing to alert on for this document. */
    hideMonitoring?: boolean;
    /** Monitoring arrives switched ON for this document. */
    monitorByDefault?: boolean;
    /** How often this one renews. */
    recurring?: string;
    /** Keys of the record's extra fields this document does NOT capture. */
    hideFields?: string[];
    /**
     * Whether this kind has a document at all, and whether it is required. A non-bonded
     * carrier code is a number and nothing else; the bonded one carries a surety bond. Set
     * `type: 'C'` with `docRequirement: 'none'` to drop the upload entirely — the same pair
     * that says so on a record.
     */
    type?: RecordTypeId;
    docRequirement?: DocRequirement;
    /** No monitored status on this kind (it has a date instead, or nothing to track). */
    hideStatus?: boolean;
}

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
    category: SafetyCategory;
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
    /**
     * State / province a new record arrives with — for records issued by ONE jurisdiction (a
     * CVOR is Ontario's, always). Paired with `defaultCountry`, since a province without its
     * country cannot be selected: the list of provinces comes from the country above it.
     */
    defaultStateProv?: string;
    /**
     * Start with monitoring ON. For a document whose whole purpose is to be valid on a date,
     * monitoring switched off by default means the alert exists but nobody has it — the office
     * has to remember to arm it on every single record, which is the thing being automated.
     * The basis follows `defaultMonitorBasis` / the record's own monitored date as usual, and
     * a config the user has already saved always wins over this.
     */
    monitorByDefault?: boolean;
    /** Hide the monitored-status field — the record has neither a date nor a status to track. */
    hideStatus?: boolean;
    /**
     * The monitored date is OPTIONAL on this record's form.
     *
     * Required is right where the date is on the document (a licence's expiry): you are copying
     * it across. It is wrong where the date is one the system works out — a next review due from
     * an issue date and a cycle — because then the form demands a figure it already knows, and a
     * record that is otherwise complete cannot be filed.
     */
    expiryOptional?: boolean;
    /** Extra single-select fields the data-entry form captures (e.g. a drug test's Test type). */
    selectFields?: RecordSelectField[];
    /** Extra free-text fields the data-entry form captures (e.g. a licence's class / endorsements). */
    textFields?: RecordTextField[];
    /** Yes/no fields the form captures (e.g. the optional covers on an insurance policy). */
    checkFields?: RecordCheckField[];
    /**
     * Key of a select field that NAMES each record — a safety fitness certificate is called
     * after the form it takes (NIR, CVOR Level 2, NSC), because that is what distinguishes one
     * of these from another in a list. Picking the type renames the record; a name the user
     * typed themselves is never overwritten (see `isAutoVersionLabel`).
     */
    nameFromField?: string;
    /**
     * The record's province depends on a field's value: `from` names the select field, `states`
     * maps each of its values to the provinces that may issue it. One province means the form
     * fills it in; several narrows the dropdown to those. Without this, a form offering all
     * thirteen provinces invites a certificate to be filed against one that cannot issue it.
     */
    stateByField?: { from: string; states: Record<string, string[]> };
    /**
     * The record holds MORE THAN ONE KIND of document, and each kind has its own shape:
     * `from` names the select field that says which, `variants` maps each of its values to
     * what that document actually captures. The `''` entry covers "nothing picked yet".
     *
     * The record ITSELF declares the union — every field any of its documents has — so the
     * list, its columns and the catalog still describe the whole record; a variant only ever
     * NARROWS that. Read through `recordForFields`, never directly.
     */
    variantByField?: { from: string; variants: Record<string, RecordVariant> };
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
    /**
     * The form does not ask for a record name.
     *
     * A name earns its place where one record has to be told from another — several uploaded
     * documents, a renewal history worth labelling. A state permit that holds no document is
     * the only one of its kind on the record, so the field would be a box asking the user to
     * type the record's own name back at it. Named after the record instead, which is why this
     * always travels with `nameFromRecord`.
     */
    hideRecordName?: boolean;
    /**
     * The carrier holds exactly ONE of these, ever. A FEIN is issued once to a legal entity and
     * never renewed, so there is no renewal history and no second number — Add is closed once
     * one is on file rather than left open to capture a duplicate that cannot exist. (Different
     * from `multiInstance`, which is about several CONCURRENT records of one kind.)
     */
    singleRecord?: boolean;
    /**
     * The monitored date a NEW record arrives with, as 'MM-DD', for a permit that always falls
     * due on the same day — a KYU licence runs to 31 December whatever month it was filed in.
     * The next such date that has not yet passed is used. Only ever a starting value: it is an
     * ordinary editable date, and nothing back-fills it onto records already captured.
     */
    defaultExpiry?: string;
    /** Offer the full world country list (vs. the default US/Canada/Mexico) — e.g. Passport. */
    allCountries?: boolean;
    /**
     * Narrow the country list to the ones that can actually issue this record — FAST and
     * SmartWay are joint US / Canada programmes, and offering Mexico invites a certificate to
     * be filed against a country that does not run one. Narrows rather than pins: where a
     * record has exactly one country, `defaultCountry` fills it in instead of asking.
     */
    countries?: string[];
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
 * The forms a provincial safety fitness certificate takes. One certificate, three names:
 * Québec issues an NIR, Ontario a CVOR Level 2, and the remaining provinces an NSC
 * certificate. Declared here so the record, its province mapping and the merge of the old
 * per-province records all read from one list.
 */
export const SAFETY_FITNESS_TYPES = ['NIR', 'CVOR Level 2', 'NSC'] as const;
export type SafetyFitnessType = typeof SAFETY_FITNESS_TYPES[number];

/**
 * Which province can issue each of them. NIR and CVOR Level 2 pin exactly one — so choosing
 * the type IS choosing the province, and the form fills it in rather than asking. NSC covers
 * everywhere else, which narrows the list instead of pinning it: Ontario and Québec are left
 * out because those two provinces issue their own kind.
 */
/**
 * The two names one thing goes by. Ontario calls its workers' compensation board the WSIB;
 * every other province and territory calls theirs a WCB (or WorkSafe, or the CNESST — all of
 * them a WCB on the paperwork a carrier files).
 */
export const WORKERS_COMP_TYPES = ['WSIB', 'WCB'] as const;

/**
 * Whether a code is backed by a surety bond — asked the same way on the CBSA carrier code and
 * on the SCAC, because it is the same question. Non-bonded first: it is the simpler of the two
 * and the one that asks for nothing further.
 */
export const BOND_STATUS = ['Non-bonded', 'Bonded'] as const;

/** Who wrote an experience letter — a previous employer, or the carrier's insurer. */
export const EXPERIENCE_LETTER_TYPES = ['Employer', 'Insurance'] as const;

/**
 * Which province each board belongs to. WSIB pins Ontario — there is exactly one — so choosing
 * the type fills the jurisdiction in. WCB covers everywhere else, which NARROWS the list to
 * those provinces rather than choosing one: a carrier registered in Alberta and one in BC both
 * file a WCB, and the form must not decide between them.
 */
export const WORKERS_COMP_STATES: Record<string, string[]> = {
    WSIB: ['Ontario'],
    WCB: CA_PROVINCES.filter(p => p !== 'Ontario'),
};

export const SAFETY_FITNESS_STATES: Record<string, string[]> = {
    NIR: ['Quebec'],
    'CVOR Level 2': ['Ontario'],
    NSC: CA_PROVINCES.filter(p => p !== 'Ontario' && p !== 'Quebec'),
};

/**
 * The two company papers filed on one record. Incorporation created the company; the master
 * business licence registers the name it operates under. Declared here so the record, its
 * per-type form and the merge of the two old records all read from one list.
 */
/**
 * The covers a motor carrier's commercial policies are written for. Each is a separate policy
 * with its own insurer, number and dates, which is why the Insurance record is multi-instance
 * and each of its policies is named after the type it carries.
 */
export const INSURANCE_TYPES = ['CGL', 'Auto Liability', 'Motor Truck Cargo'] as const;
export type InsuranceType = typeof INSURANCE_TYPES[number];

export const COMPANY_DOC_TYPES = ['Articles of Incorporation', 'Master Business License'] as const;
export type CompanyDocType = typeof COMPANY_DOC_TYPES[number];

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
    // A CVOR is issued by Ontario, to one carrier, and every one of them expires — so none of
    // that is worth asking for. The record names itself, arrives as Ontario, Canada, and comes
    // with monitoring already on and pointed at the expiry date: for a certificate whose whole
    // purpose is to be valid on a date, monitoring switched off is never the right default.
    { id: 'cvor', category: 'Operating Authority', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CVOR Certificate', description: "Commercial Vehicle Operator's Registration (CVOR)", numberName: 'CVOR Number', documentName: 'CVOR Certificate',
      recurring: 'Variable renewal/expiry', monitorType: 'Expiry date', tracksIssueDate: true, jurisdiction: 'Ontario, Canada',
      nameFromRecord: true, defaultCountry: 'Canada', defaultStateProv: 'Ontario', monitorByDefault: true,
      monitor: 'Expiry date, monitored by default. Store issue date for history only.' },
    // CVOR Level 2 and the Québec NIR used to be records of their own here. They are now the
    // two provincial FORMS of the Safety Fitness Certificate below, chosen by its type field;
    // records already filed under either are moved onto it (see `MERGED_RECORDS`).
    // ONE record for the provincial safety fitness certificate, in whichever form the
    // province issues it: Québec's NIR, Ontario's CVOR Level 2, an NSC certificate anywhere
    // else. Three near-identical records (each with its own number field, its own name and
    // its own province) said the same thing three times, and a carrier had to know which of
    // them applied before it could file the certificate in its hand. Now it picks the type,
    // and the type settles the name and the province.
    { id: 'safety-fitness', category: 'Operating Authority', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Safety Fitness Certificate', description: 'Provincial safety fitness certificate — NIR (Québec), CVOR Level 2 (Ontario) or NSC', numberName: 'Certificate Number', documentName: 'Safety Fitness Certificate',
      recurring: 'Depends on Canadian jurisdiction', monitorType: 'Expiry date', jurisdiction: 'Canadian province / territory',
      defaultCountry: 'Canada', hideStatus: true, monitorByDefault: true,
      // The type is asked FIRST and decides the rest: it names the record and pins the
      // province (or, for an NSC, narrows the list to the provinces that issue one).
      nameFromField: 'certType',
      stateByField: { from: 'certType', states: SAFETY_FITNESS_STATES },
      selectFields: [
          { key: 'certType', label: 'Type of certificate', required: true, order: -3, rowStart: true,
            options: [...SAFETY_FITNESS_TYPES] },
      ],
      monitor: 'Expiry date of the certificate, monitored by default. Where a province prints no expiry, store the next renewal / review date — or switch the alert to a custom date.' },
    // The certificate itself is filed once: a number, the day it was issued, and the document.
    // It does not expire, and the office does not decide whether the authority is active —
    // FMCSA does. So there is no status field here and nothing to alert on; the authority's
    // real status, the insurance it requires and the filings against it are looked up and shown
    // on the record's own page (see `mc-authority.data`).
    { id: 'mc', category: 'Operating Authority', entity: 'Carrier', type: 'DC', docRequirement: 'required', hideState: true,
      recordName: 'MC Certificate', description: 'FMCSA Motor Carrier Operating Authority', numberName: 'MC Number', documentName: 'FMCSA Operating Authority Certificate (MC)',
      recurring: 'No fixed expiry', monitorType: 'Authority / status change', jurisdiction: 'United States, federal',
      nameFromRecord: true, defaultCountry: 'United States', tracksIssueDate: true,
      hideStatus: true, hideMonitoring: true,
      monitor: 'Authority status, revocation, suspension and the insurance filed against it come from FMCSA — read on the record, not alerted on here.' },
    { id: 'dot-biennial', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'optional',
      recordName: 'DOT Biennial Update', description: 'FMCSA DOT Biennial Update', numberName: 'DOT Biennial Update (linked to USDOT)', documentName: 'MCS-150 / MCS-150B Filing Confirmation',
      recurring: 'Biennial', monitorType: 'Next filing due', jurisdiction: 'United States, federal',
      monitor: 'Next biennial filing due date calculated from the USDOT number and last filing/update date.',
      note: 'Optional MCS-150/MCS-150B upload; uses the USDOT number (no separate number).' },
    { id: 'usdot', category: 'Other', entity: 'Carrier', type: 'C', docRequirement: 'none',
      recordName: 'DOT', description: 'USDOT Registration', numberName: 'USDOT Number', documentName: '',
      recurring: 'Number does not expire', monitorType: 'Active/inactive status', jurisdiction: 'United States, federal',
      monitor: 'Active/inactive status and linked next biennial filing due date.' },
    // A test is an event, not a credential: it captures WHY the driver was tested and the
    // outcome, plus the date it was taken. No jurisdiction fields — the test is federal
    // (or company) policy, not state-issued.
    { id: 'drug-test', category: 'Personal Documents', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Drug Test Result', description: 'Drug and Alcohol Testing Record', numberName: '', documentName: 'Drug & Alcohol Test Result / Employer Testing Record',
      recurring: 'Per test', monitorType: 'On file', tracksIssueDate: true, hideCountry: true, hideState: true, nameFromRecord: true,
      // A result is final the day it is issued — nothing to monitor.
      hideMonitoring: true,
      selectFields: [{ key: 'testType', label: 'Test type', options: DRUG_TEST_TYPES, required: true, placeholder: 'Select test type' }],
      statusLabel: 'Test result', statusOptions: DRUG_TEST_RESULTS, statusControl: 'radio',
      jurisdiction: 'Applicable DOT testing jurisdiction',
      monitor: 'Point-in-time drug & alcohol test result; no document expiry. Retained on file.' },
    // PHMSA registers hazmat carriers federally, for a term that ends: so the record names
    // itself, arrives as the United States with no province to pick (there is no state-issued
    // version of this), and comes with monitoring already pointed at the expiry date.
    { id: 'hazmat', category: 'Safety & Regulatory Permits', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'HAZMAT', description: 'PHMSA Hazardous Materials Registration', numberName: 'HAZMAT Registration Number', documentName: 'HAZMAT Certificate of Registration',
      recurring: 'Yes', monitorType: 'Expiry date', configuredDate: '2026-06-30', jurisdiction: 'United States, federal',
      nameFromRecord: true, defaultCountry: 'United States', hideState: true, monitorByDefault: true,
      monitor: 'Expiry date, monitored by default.' },
    { id: 'mcs90', category: 'Safety & Regulatory Permits', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'MCS-90', description: 'Motor Carrier Public Liability Endorsement', numberName: '', documentName: 'MCS-90 Endorsement',
      recurring: 'No independent expiry', monitorType: 'Linked to insurance policy', jurisdiction: 'United States, federal',
      monitor: 'Linked to the insurance policy — monitor policy effective/expiry dates & replacement/cancellation status.' },
    // A federal credential: card number + issuing country + the expiry it is monitored on.
    // No state/province (it is federal) and no issue date — only the card's own expiry drives
    // the alerts, which also means monitoring never offers a renewal cadence.
    { id: 'twic', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'TWIC Card', description: 'Transportation Worker Identification Credential', numberName: 'TWIC Card Number', documentName: 'TWIC Card Copy',
      recurring: 'Variable expiry', monitorType: 'Card expiry date',
      hideState: true, nameFromRecord: true,
      jurisdiction: 'United States, federal',
      monitor: 'Card expiry date.' },

    // ── 2. Tax and Business Identification Numbers ────────────────────
    // Issued by the carrier's BASE jurisdiction, so both the country and the province / state
    // are asked — an Ontario IFTA licence and a Michigan one are different licences. No issue
    // date: the licence runs to a fixed year end, and that expiry is the whole point of it.
    { id: 'ifta-license', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'IFTA License', description: 'International Fuel Tax Agreement Registration', numberName: 'IFTA Account / License Number', documentName: 'IFTA License',
      recurring: 'Annual', monitorType: 'Expiry date', configuredDate: '2026-12-31', jurisdiction: 'Base IFTA jurisdiction (CA/US)',
      // Named after itself, and watched by default: a licence that lapses at a year end and is
      // not being watched is the exact thing this page exists to prevent.
      nameFromRecord: true, monitorByDefault: true,
      monitor: 'Expiry date (annual).' },
    { id: 'ifta-decal', category: 'Tax and Business Identification Numbers', entity: 'Asset', type: 'DC', docRequirement: 'required',
      recordName: 'IFTA Decal', description: 'International Fuel Tax Agreement Vehicle Decal', numberName: 'IFTA Decal Number', documentName: 'IFTA Decal Record / Copy',
      recurring: 'Annual', monitorType: 'Expiry date', configuredDate: '2026-12-31', jurisdiction: 'Same base IFTA jurisdiction',
      monitor: 'Expiry date (annual).' },
    // Issued ONCE to the legal entity and never renewed: no expiry, so nothing to monitor and
    // no status to track, and no second one to file. Federal, so the state is not asked — but
    // the country is, because a carrier operating both sides of the border files US and
    // Canadian tax numbers side by side and they must not read as one kind. The 147C letter is
    // a real document, which is why this record still carries a name and an upload.
    { id: 'fein', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'FEIN', description: 'Federal Employer Identification', numberName: 'FEIN Number', documentName: 'IRS EIN Verification Letter (147C)',
      recurring: 'No normal expiry', monitorType: 'No expiry', jurisdiction: 'United States, federal',
      nameFromRecord: true, defaultCountry: 'United States', hideState: true, hideStatus: true, hideMonitoring: true,
      singleRecord: true,
      monitor: 'No expiry alert; monitor only when the legal entity or tax registration changes.' },
    // ── The state weight-distance / highway-use permits ──────────────────
    // WDT, KYU, HUT and Oregon are the same shape, and none of them is a document: the state
    // issues a number and a date, and the carrier files a return against it. So each captures
    // its number, the one jurisdiction that can issue it (filled in, not asked — there is no
    // WDT outside New Mexico), and the date it falls due, which is the only thing worth an
    // alert. Connecticut is the exception, and keeps its certificate and its name. With no
    // document to tell one filing from another, there is nothing for a record name to
    // distinguish, so the form does not ask for one and the permit is named after itself.
    { id: 'nm-wdt', category: 'Other', entity: 'Carrier', type: 'C', docRequirement: 'none',
      recordName: 'WDT Permit', versionRenamedFrom: 'NM', description: 'New Mexico Weight Distance Tax Registration', numberName: 'WDT Number', documentName: '',
      recurring: 'Recurring', monitorType: 'Expiry / renewal due', configuredDate: '2026-12-31', jurisdiction: 'New Mexico, United States',
      nameFromRecord: true, hideRecordName: true, monitorByDefault: true,
      defaultCountry: 'United States', defaultStateProv: 'New Mexico',
      monitor: 'Expiry/renewal due date.', note: 'Carrier master account; Asset when an asset-specific permit is issued.' },
    // Kentucky's renews on a fixed calendar — every licence runs to 31 December — so the date
    // is filled in rather than looked up, and corrected on the rare filing that does not.
    { id: 'kyu', category: 'Other', entity: 'Carrier', type: 'C', docRequirement: 'none',
      recordName: 'KYU Permit', versionRenamedFrom: 'KYU', description: 'Kentucky Weight Distance Tax Registration', numberName: 'KYU Number', documentName: '',
      recurring: 'Recurring', monitorType: 'Renewal / filing due', configuredDate: '2026-12-31', jurisdiction: 'Kentucky, United States',
      nameFromRecord: true, hideRecordName: true, monitorByDefault: true, defaultExpiry: '12-31',
      defaultCountry: 'United States', defaultStateProv: 'Kentucky',
      monitor: 'Renewal/filing due date.', note: 'Carrier master account; Asset association where required.' },
    { id: 'ny-hut', category: 'Other', entity: 'Carrier', type: 'C', docRequirement: 'none',
      recordName: 'HUT Permit', versionRenamedFrom: 'HUT', description: 'New York Highway Use Tax Registration', numberName: 'NY PIN / HUT PIN', documentName: '',
      recurring: 'Recurring', monitorType: 'Expiry / renewal due', configuredDate: '2026-12-31', jurisdiction: 'New York, United States',
      nameFromRecord: true, hideRecordName: true, monitorByDefault: true,
      defaultCountry: 'United States', defaultStateProv: 'New York',
      monitor: 'Permit/certificate expiry or renewal due date.', note: 'Carrier account plus Asset-specific certificate/permit.' },
    // Connecticut is the one of these that issues a CERTIFICATE, so it keeps its upload — and
    // with a document to file, a record name earns its place again: it is what tells this
    // year's certificate from the one it replaced. Renews on the same fixed calendar as the
    // KYU, so the date arrives filled in.
    { id: 'ct-permit', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Connecticut Permit', versionRenamedFrom: 'CT', description: 'Connecticut Highway Use / Tax Registration', numberName: 'Registration Number', documentName: 'Connecticut Permit / Tax Registration Certificate',
      recurring: 'Recurring', monitorType: 'Expiry / renewal due', configuredDate: '2026-12-31', jurisdiction: 'Connecticut, United States',
      nameFromRecord: true, monitorByDefault: true, defaultExpiry: '12-31',
      defaultCountry: 'United States', defaultStateProv: 'Connecticut',
      monitor: 'Expiry/renewal due date (31 December).', note: 'Carrier account; Asset when asset-specific.' },
    // Oregon is the fourth of the no-document permits: an account number, the state that holds
    // it, and the date the renewal falls due.
    { id: 'oregon-wm', category: 'Other', entity: 'Carrier', type: 'C', docRequirement: 'none',
      recordName: 'Oregon', description: 'Oregon Weight-Mile Tax Registration', numberName: 'Oregon Weight-Mile Account Number', documentName: '',
      recurring: 'Recurring', monitorType: 'Renewal due', configuredDate: '2026-12-31', jurisdiction: 'Oregon, United States',
      nameFromRecord: true, hideRecordName: true, monitorByDefault: true, defaultExpiry: '12-31',
      defaultCountry: 'United States', defaultStateProv: 'Oregon',
      monitor: 'Renewal due date (31 December). Where the registration is permanent, clear the date and switch the alert off.',
      note: 'Carrier master account; Asset association where required.' },
    // One record for the workers' compensation board a carrier is registered with, whichever
    // province that is. The type is asked first and settles the rest: it names the record and
    // pins the jurisdiction, because Ontario's board IS the WSIB — picking it is picking the
    // province. A WCB is every other province's, so it narrows the list instead of choosing
    // for the carrier, which board they are registered with being theirs to say.
    { id: 'wsib', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'WSIB / WCB', versionRenamedFrom: 'WSIB', description: "Workers' Compensation Registration", numberName: 'Account Number', documentName: 'Clearance Certificate',
      recurring: 'Monthly', monitorType: 'Valid-to / clearance date', jurisdiction: 'Canada, provincial',
      defaultCountry: 'Canada',
      nameFromField: 'boardType',
      stateByField: { from: 'boardType', states: WORKERS_COMP_STATES },
      selectFields: [
          // Every record filed while this was "the WSIB record" was Ontario's board — that is
          // all the record was — so the history reads WSIB rather than a coin toss.
          { key: 'boardType', label: 'Board', required: true, order: -3, rowStart: true, control: 'radio',
            options: [...WORKERS_COMP_TYPES], priorValue: 'WSIB' },
      ],
      monitor: 'Certificate valid-to / clearance expiry date, not merely the issue date.' },
    // ONE record for the two papers that say the company exists: the certificate of
    // incorporation that created it, and the master business licence that registers the name it
    // trades under. They were two records, and they behave nothing alike — incorporation is
    // issued once and never expires, a business licence expires and is renewed — so the type is
    // asked first and settles the rest: the record's name, which dates it asks for, and whether
    // there is anything to monitor at all. Records already filed under either are moved here
    // (see `MERGED_RECORDS`).
    { id: 'company-docs', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Company Documents', description: 'Incorporation and business-name registration documents', numberName: 'Corporation / Registration Number', documentName: 'Company Document',
      recurring: 'Depends on the document', monitorType: 'Expiry date', tracksIssueDate: true, jurisdiction: 'Federal / provincial / state registering jurisdiction',
      hideStatus: true,
      // The record declares BOTH documents' fields — that is what the list and its columns
      // describe. Each type then narrows it to its own (see `variantByField` below).
      nameFromField: 'docType',
      selectFields: [
          { key: 'docType', label: 'Type', required: true, order: -3, rowStart: true,
            options: [...COMPANY_DOC_TYPES] },
      ],
      textFields: [
          { key: 'registrationName', label: 'Registration name', order: -2,
            placeholder: 'Business name as registered', demoValues: ['Acme Transport', 'Acme Logistics Group', 'Acme Freight Systems'] },
      ],
      variantByField: {
          from: 'docType',
          variants: {
              // Nothing picked yet: ask for the type before asking for dates that may not exist.
              '': { tracksIssueDate: false, monitorType: 'No expiry', hideMonitoring: true, hideFields: ['registrationName'] },
              'Articles of Incorporation': {
                  numberName: 'Corporation Number', documentName: 'Articles / Certificate of Incorporation',
                  recurring: 'Usually static', monitorType: 'No expiry', hideMonitoring: true,
                  hideFields: ['registrationName'],
              },
              'Master Business License': {
                  numberName: 'BIN / Registration Number', documentName: 'Master Business Licence / Business Name Registration',
                  recurring: 'Where a renewal cycle applies', monitorType: 'Expiry date',
                  tracksIssueDate: false, monitorByDefault: true,
              },
          },
      },
      monitor: 'A master business licence is monitored on its expiry date (or a custom date where the province prints none). A certificate of incorporation does not expire — it carries an issue date only, and no alert.' },

    // ── 3. Carrier & Industry Codes ───────────────────────────────────
    // A carrier code is a number CBSA issues, and on its own it has nothing to expire: no
    // document, no date, no alert. A BONDED code is a different thing — the bond behind it is
    // a document with an expiry, and a bond that lapses takes the code with it, which is the
    // whole reason to watch it. So the bond question is asked once and the rest of the record
    // follows from it, rather than every carrier being shown surety fields they do not have.
    //
    // The record declares the UNION — a date, a document, the surety fields — because that is
    // what the list and its columns describe; each answer then NARROWS it (see `variantByField`).
    { id: 'carrier-code', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Carrier Code', description: 'CBSA Carrier Code Registration', numberName: 'Carrier Code', documentName: 'Surety Bond',
      recurring: 'No fixed expiry', monitorType: 'Surety bond expiry', jurisdiction: 'Canada, federal customs',
      // Named after itself: a carrier holds ONE code, so "Record 2026" tells you nothing that
      // the record it sits under does not already say. The bond does not name it — bonded or
      // not, it is the same code, unlike a certificate whose type is what it IS.
      nameFromRecord: true,
      defaultCountry: 'Canada', hideStatus: true,
      selectFields: [
          { key: 'bondStatus', label: 'Bond', required: true, order: 1, rowStart: true, control: 'radio',
            options: [...BOND_STATUS] },
      ],
      textFields: [
          { key: 'suretyCompany', label: 'Surety bond company', order: 2, rowStart: true,
            placeholder: 'e.g. Trisura Guarantee Insurance', demoValues: ['Trisura Guarantee Insurance', 'Intact Insurance', 'Aviva Canada', 'The Guarantee Company of North America'] },
          { key: 'bondNumber', label: 'Surety bond number', order: 3,
            placeholder: 'Bond number', demoValues: ['SB-4471902', 'SB-8820114', 'B-2290477'] },
      ],
      variantByField: {
          from: 'bondStatus',
          variants: {
              // Not yet said. Nothing is demanded and no surety field is asked — but a document
              // already on file stays visible, because a question nobody has answered is not a
              // reason to hide what a carrier has already filed.
              '': { documentName: 'Supporting document', docRequirement: 'optional',
                    monitorType: 'No expiry', hideMonitoring: true, hideFields: ['suretyCompany', 'bondNumber'] },
              // Just the code: a number, and where it was issued.
              'Non-bonded': { documentName: '', type: 'C', docRequirement: 'none',
                    monitorType: 'No expiry', hideMonitoring: true, hideFields: ['suretyCompany', 'bondNumber'] },
              // The bond is the thing that expires, so it is the thing that is watched.
              Bonded: { documentName: 'Surety Bond', type: 'DC', docRequirement: 'required',
                    monitorType: 'Surety bond expiry', monitorByDefault: true },
          },
      },
      monitor: 'A bonded carrier code is monitored on the surety bond expiry — the code lapses with the bond. A non-bonded code has no date and no alert.' },
    // The same bond question as the carrier code, with one difference that decides the shape:
    // a SCAC certificate has an expiry of its OWN. The bond behind a bonded SCAC expires on a
    // separate schedule, and a version carries one date and one alert — so the bond cannot ride
    // along inside this record. It is its own, "US Customs Bond", watched on its own expiry.
    // This field is what says whether the carrier needs one.
    { id: 'scac', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'SCAC Code', description: 'Standard Carrier Alpha Code Registration', numberName: 'SCAC Code', documentName: 'SCAC Certificate',
      recurring: 'Variable renewal/expiry', monitorType: 'Certificate expiry / renewal', jurisdiction: 'North American transportation industry',
      nameFromRecord: true, defaultCountry: 'United States', hideState: true, monitorByDefault: true,
      selectFields: [
          { key: 'bondStatus', label: 'Bond', required: true, order: 1, rowStart: true, control: 'radio',
            options: [...BOND_STATUS] },
      ],
      practiceNote: 'A bonded SCAC also needs the bond itself on file. It is filed as a US Customs Bond — its own record, with its own number and its own expiry to watch.',
      monitor: 'Certificate/code expiry or renewal due date. The bond behind a bonded SCAC expires separately and is monitored on its own record.' },
    // CTPAT does not expire — it comes due. The renewal is a security profile to rewrite and
    // have accepted, which is weeks of work, so the alert runs on a 45-day drumbeat rather
    // than the usual 90 / 60 / 30 flurry: 90 days out to start it, 45 to finish it, and on the
    // day itself. Armed by default, because a membership that lapses un-renewed costs the
    // carrier its FAST lanes.
    { id: 'ctpat', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CTPAT', description: 'Customs Trade Partnership Against Terrorism Certification', numberName: 'CTPAT Account Number', documentName: 'CTPAT Certification / Approval Letter',
      recurring: 'Periodic validation', monitorType: 'Next renewal date', jurisdiction: 'United States, federal customs',
      nameFromRecord: true, defaultCountry: 'United States', hideState: true,
      monitorByDefault: true, defaultReminders: [90, 45, 0],
      practiceNote: 'CTPAT renewal is a security profile to review and re-submit, not a date to copy across — so the reminder runs every 45 days (90 days before, 45 days before, and on the day) rather than leaving it to the last month.',
      monitor: 'Next renewal date, monitored by default, with reminders every 45 days.' },
    // CTPAT's counterpart, and shaped the same way: an account number, a date the review falls
    // due, the approval letter, and an alert on that date. The difference is whose programme it
    // is — Partners in Protection is CBSA's, so it defaults to Canada where CTPAT defaults to
    // the United States. The two are mutually recognised, not interchangeable.
    { id: 'pip', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'PIP', description: 'Partners in Protection Certification', numberName: 'PIP Account Number', documentName: 'PIP Certificate / Approval Letter',
      recurring: 'Periodic review', monitorType: 'Next review date', jurisdiction: 'Canada, federal customs',
      nameFromRecord: true, defaultCountry: 'Canada', hideState: true, monitorByDefault: true,
      monitor: 'Next review date, monitored by default.' },
    // The authorization arrives as TWO separate pieces of paper — the card a driver carries and
    // the certificate the office files — and a carrier holds both at once. Named upload slots
    // rather than a pile of attachments, so a missing card is visible as a gap instead of being
    // lost among the files that are there.
    // Nothing is watched: CSA is held, not renewed on a cycle, so there is no date and no alert.
    { id: 'csa', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'CSA', description: 'CBSA Customs Self-Assessment Authorization', numberName: 'CSA Account Number', documentName: 'CSA Authorization',
      slotLabels: ['CSA Card', 'CSA Certificate'],
      recurring: 'Ongoing authorization', monitorType: 'On file', jurisdiction: 'Canada, federal customs',
      nameFromRecord: true, defaultCountry: 'Canada', hideState: true, hideStatus: true, hideMonitoring: true,
      monitor: 'Nothing to monitor — the authorization is held rather than renewed on a cycle, so there is no date and no alert.',
      note: 'CBSA Customs Self-Assessment — not the FMCSA safety-score program.' },
    // A joint US / Canada programme, so the country is ASKED rather than filled in — and the
    // list is narrowed to the two that run it, because a SmartWay partnership filed against
    // Mexico is a record nobody can act on. The renewal is annual and armed by default: a
    // partnership that lapses is dropped from the EPA's published list.
    { id: 'smartway', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'SmartWay', description: 'EPA SmartWay Partnership', numberName: 'SmartWay Partner ID / Account Number', documentName: 'SmartWay Partner Certificate / Approval',
      recurring: 'Annual', monitorType: 'Next renewal date', configuredDate: '2026-03-31', jurisdiction: 'US / Canada freight program',
      nameFromRecord: true, countries: ['United States', 'Canada'], hideState: true, monitorByDefault: true,
      monitor: 'Next renewal date, monitored by default on an annual cycle.' },

    // The company-level FAST approval, which is not the driver's card: one belongs to the
    // carrier and one to the person, and a carrier holds one of these against many of those
    // (see the driver FAST Card record). Approved jointly by CBP and CBSA, so the same two
    // countries as SmartWay. Nothing is watched — the certificate is held, and the expiry that
    // matters in practice is on each driver's card, where it is already monitored.
    { id: 'fast-certificate', category: 'Carrier Codes & Certifications', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'FAST Certificate', description: 'Free and Secure Trade (FAST) Carrier Approval', numberName: 'FAST ID', documentName: 'FAST Certificate',
      recurring: 'Ongoing approval', monitorType: 'On file', jurisdiction: 'United States / Canada, joint customs program',
      nameFromRecord: true, countries: ['United States', 'Canada'], hideState: true, hideStatus: true, hideMonitoring: true,
      monitor: 'Nothing to monitor — the carrier approval is held, not renewed on a cycle. Each driver\'s FAST card carries its own expiry and is monitored there.' },

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
    { id: 'ucr', category: 'Safety & Regulatory Permits', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'UCR', description: 'Unified Carrier Registration', numberName: '', documentName: 'UCR Registration Certificate / Filing Confirmation',
      recurring: 'Annual', monitorType: 'Expiry / registration-year end', configuredDate: '2026-12-31', jurisdiction: 'United States, interstate registration',
      monitor: 'Expiry / registration-year end (annual).' },
    { id: 'boc3', category: 'Other', entity: 'Carrier', type: 'D', docRequirement: 'required',
      recordName: 'BOC-3', description: 'Designation of Process Agents Filing', numberName: '', documentName: 'BOC-3 Filing Confirmation / Certificate',
      recurring: 'No scheduled expiry', monitorType: 'Filing status / change', jurisdiction: 'United States, federal',
      monitor: 'Filing status/change date — not expiry.' },
    // The bond behind a bonded SCAC. It lives here rather than inside the SCAC record because
    // it expires on its OWN schedule: a certificate valid to March and a bond valid to October
    // are two dates and two alerts, and a version carries one of each. Optional, not required —
    // only a bonded carrier holds one, and marking every other carrier "missing a customs bond"
    // is noise on a page whose job is to say what is actually outstanding.
    { id: 'us-bond', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'optional',
      recordName: 'US Customs Bond', versionRenamedFrom: 'US Bond', description: 'United States Customs Surety Bond', numberName: 'US Bond Number', documentName: 'US Customs Bond',
      recurring: 'Per bond term', monitorType: 'Surety bond expiry', jurisdiction: 'United States, federal customs',
      nameFromRecord: true, defaultCountry: 'United States', hideState: true, monitorByDefault: true,
      textFields: [
          // The surety's own reference for the bond, which is what the surety company answers
          // to — not the same number CBP knows it by, and both are printed on the bond.
          { key: 'suretyReference', label: 'Surety reference number', order: 1,
            placeholder: "The surety company's own reference",
            demoValues: ['SUR-2291045', 'SUR-7714302', 'TRI-5580291'] },
      ],
      monitor: 'Surety bond expiry date, monitored by default — the bonded status lapses with the bond.' },
    { id: 'canada-bond', category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Canada Bond', description: 'Canada Customs or Surety Bond', numberName: 'Canada Bond Number', documentName: 'Canada Bond Certificate',
      recurring: 'Variable', monitorType: 'Bond expiry / renewal', jurisdiction: 'Canada',
      monitor: 'Bond expiry/termination/renewal date.', note: 'Store bond_type.' },

    // ── 5. Others ─────────────────────────────────────────────────────
    // A carrier does not hold "an insurance policy" — it holds several at once, each covering
    // a different exposure, each with its own insurer, number and dates. So the record is
    // multi-instance and every policy is NAMED after the cover it provides: "Auto Liability"
    // and "Motor Truck Cargo" is what tells one row from another, where "Insurance 2026"
    // three times over tells you nothing.
    //
    // The two optional covers are checkboxes rather than a select, because they have an answer
    // before anyone is asked and that answer is no. Non-owned trailer cover then asks for its
    // own limit — a separate figure from the policy's, and only a real one on the policies
    // that carry it (see `showWhen`).
    { id: 'insurance', category: 'Insurance', entity: 'Carrier', type: 'DC', docRequirement: 'required',
      recordName: 'Insurance', description: 'Commercial Insurance Coverage', numberName: 'Policy Number', documentName: 'Certificate of Insurance / Insurance Policy',
      recurring: 'Yes', monitorType: 'Policy expiry date', tracksIssueDate: true, jurisdiction: 'Company',
      // No country, no province. A policy is written by an INSURER, not issued by a
      // jurisdiction: there is no authority to pick and nothing the choice would change.
      // Where the cross-border distinction actually bites — the size of a limit — it is
      // carried by the limit's own currency.
      hideCountry: true, hideState: true,
      multiInstance: true, instanceNoun: 'policy',
      nameFromField: 'insuranceType',
      selectFields: [
          { key: 'insuranceType', label: 'Insurance type', options: [...INSURANCE_TYPES], required: true, order: -3 },
      ],
      checkFields: [
          { key: 'nonOwnedTrailer', label: 'Non-owned trailer', hint: 'Covers trailers the carrier pulls but does not own', order: 3, rowStart: true },
          { key: 'reeferBreakdown', label: 'Reefer breakdown', hint: 'Cargo lost to a refrigeration unit failure', order: 3 },
      ],
      textFields: [
          { key: 'nonOwnedLimit', label: 'Non-owned trailer coverage limit', order: 4, rowStart: true,
            placeholder: 'e.g. 500,000', money: { currencyKey: 'nonOwnedCurrency', currencies: ['CAD', 'USD'] },
            showWhen: { field: 'nonOwnedTrailer' } },
      ],
      monitor: 'Policy expiry date. Store issue/effective date for history.',
      note: 'The broker and agent who placed these policies are named once in the page header.' },
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
    { id: 'cdl', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'required', isLicense: true,
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
    { id: 'medical-cert', category: 'Personal Documents', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Medical Certificate', description: "Medical Examiner's Certificate (DOT Medical Card, MCSA-5876)", numberName: 'National Registry Number', documentName: "Medical Examiner's Certificate",
      recurring: 'Per medical term (≤ 24 months)', monitorType: 'Medical card expiry', tracksIssueDate: true, jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Medical certificate expiry date (max 24-month term, 49 CFR 391.41).' },
    // A driver's non-commercial abstract does not expire — it is pulled, reviewed, and pulled
    // again. The date tracked is when the next one falls due, so that is what the form and the
    // monitoring both call it. Known by its acronym, so MVR stays the short name and the full
    // name — the counterpart of the Driver Commercial Abstract below — is its description.
    // `versionRenamedFrom` relabels records filed under the full name back to the acronym.
    { id: 'mvr', category: 'Abstracts & Annual Reviews', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'MVR', description: 'Driver Non-Commercial Abstract', numberName: 'Abstract Order / Reference Number', documentName: 'Driver Non-Commercial Abstract',
      recurring: 'Annual', monitorType: 'Next renew date', nameFromRecord: true, versionRenamedFrom: 'Driver Non-Commercial Abstract',
      jurisdiction: 'Driver licensing state / province',
      monitor: 'Reviewed at least every 12 months (§391.25).' },
    // An abstract is pulled and reviewed on a cycle rather than expiring, so monitoring runs
    // from the ISSUE date on an annual recurrence, and the date captured is the next review.
    { id: 'driver-cvdr', category: 'Abstracts & Annual Reviews', entity: 'Driver', type: 'DC', docRequirement: 'required', tracksIssueDate: true,
      recordName: 'Driver Commercial Abstract', description: 'Provincial commercial driving record, reviewed annually', numberName: 'Abstract Reference Number', documentName: 'Driver Commercial Abstract',
      recurring: 'Annual', monitorType: 'Next review date', nameFromRecord: true,
      defaultMonitorBasis: 'issue', jurisdiction: 'Issuing province / state',
      monitor: 'Annual review of the driver commercial abstract. Monitored from the issue date on an annual cycle. Reminders 30 / 15 days before the review due date.',
      note: 'Canadian commercial driver record — the commercial counterpart of the non-commercial abstract.',
      defaultReminders: [30, 15],
      practiceNote: 'Renewing every 90 days is good practice for this record.' },
    // A PSP is pulled once per hire and filed: it has no expiry, no status to track and
    // nothing to alert on, so it captures only the date it was pulled and the report itself.
    // FMCSA is US-federal, so the country is fixed and there is no state.
    { id: 'psp-report', category: 'Abstracts & Annual Reviews', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'PSP Report', description: 'FMCSA Pre-Employment Screening Program Report', numberName: '', documentName: 'FMCSA PSP Report',
      recurring: 'Per hire', monitorType: 'Pre-employment / status',
      nameFromRecord: true, tracksIssueDate: true, defaultCountry: 'United States', hideState: true,
      hideStatus: true, hideMonitoring: true,
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Pre-employment screening record (5-yr crash / 3-yr inspection); re-pull as needed — no fixed expiry.' },
    // A query is run, comes back either restricted or not, and is re-run on a cycle. Both
    // answers are either/or, so they are radio pairs rather than dropdowns — and both are
    // worth filtering the list by. FMCSA is US-federal: country fixed, no state.
    { id: 'clearinghouse-query', category: 'Other', entity: 'Driver', type: 'DC', docRequirement: 'required',
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
    { id: 'annual-review', category: 'Abstracts & Annual Reviews', entity: 'Driver', type: 'D', docRequirement: 'required',
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
    { id: 'safety-perf-history', category: 'Pre-Employment', entity: 'Driver', type: 'D', docRequirement: 'required',
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
    { id: 'road-test', category: 'Pre-Employment', entity: 'Driver', type: 'D', docRequirement: 'required',
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
    { id: 'driver-application', category: 'Pre-Employment', entity: 'Driver', type: 'D', docRequirement: 'required',
      recordName: 'Driver Application', description: 'Driver Application for Employment (§391.21)', numberName: '', documentName: 'Driver Application for Employment',
      recurring: 'Once per hire', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      dateFields: [
          { key: 'applicationDate', label: 'Application date', required: true,
            demoValues: ['2019-03-15', '2021-06-28', '2023-08-04'] },
      ],
      jurisdiction: 'United States, federal (FMCSA)',
      monitor: 'Completed employment application retained in the DQ file (§391.21).' },
    { id: 'passport', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'required', hideState: true, allCountries: true,
      nameFromRecord: true,
      recordName: 'Passport', description: 'Driver Passport', numberName: 'Passport Number', documentName: 'Passport',
      recurring: 'Per passport term', monitorType: 'Passport expiry', tracksIssueDate: true, jurisdiction: 'Issuing country',
      monitor: 'Passport expiry date.' },
    // A card, so it is named after itself and monitored on the date it runs out. It is
    // issued by a country's border agency (CBP / CBSA), not by a state, so it keeps the
    // standard country selector — which already offers exactly the FAST lanes, US, Canada
    // and Mexico — and drops the state.
    { id: 'fast-card', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'optional',
      recordName: 'FAST Card', description: 'Free and Secure Trade (FAST) Card', numberName: 'FAST Card Number', documentName: 'FAST Card',
      recurring: 'Per card term', monitorType: 'Card expiry',
      nameFromRecord: true, hideState: true,
      jurisdiction: 'US–Canada border (CBP / CBSA)',
      monitor: 'FAST card expiry date. Monitored on the card expiry or a custom date — the card is replaced, not renewed on a cycle.' },
    // Both are granted by a COUNTRY, not by one of its states — so the country stays (it is
    // the whole point of the record: which country admitted the driver) and the state goes.
    { id: 'visa', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
      hideState: true, nameFromRecord: true,
      selectFields: [
          { key: 'visaType', label: 'Visa type', options: ['B1/B2', 'TN', 'H-2B', 'L-1', 'Other'] },
      ],
      recordName: 'Visa', description: 'Entry / Travel Visa (cross-border)', numberName: 'Visa Number', documentName: 'Visa',
      recurring: 'Per visa term', monitorType: 'Visa expiry', jurisdiction: 'Issuing country',
      monitor: 'Visa expiry date for cross-border drivers. Monitor the current (most recent) visa.' },
    { id: 'work-permit', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
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
    { id: 'green-card', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
      hideState: true, defaultCountry: 'United States', nameFromRecord: true,
      recordName: 'Green Card', description: 'US Permanent Resident Card (Form I-551)', numberName: 'Green Card Number', documentName: 'Green Card',
      recurring: 'Per card term', monitorType: 'Green card expiry', jurisdiction: 'United States (USCIS)',
      monitor: 'Permanent Resident Card expiry date. Monitor the current (most recent) card — the residence itself does not lapse with it.' },
    { id: 'pr-documents', category: 'Travel Documents', entity: 'Driver', type: 'DC', docRequirement: 'optional', tracksIssueDate: true,
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
    { id: 'criminal-record', category: 'Pre-Employment', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Police Clearance Check', description: 'Police Clearance Check (PCC) / Criminal Record Check', numberName: 'Reference Number', documentName: 'Police Clearance Check',
      recurring: 'Every 3 years', monitorType: 'Next review date', tracksIssueDate: true,
      // The next review is WORKED OUT from the issue date and the three-year cycle, so the
      // office should not have to type it in to file a check it already holds.
      nameFromRecord: true, hideCountry: true, hideState: true, defaultMonitorBasis: 'issue', expiryOptional: true,
      selectFields: [
          { key: 'checkResult', label: 'Result', options: ['Clear', 'Not Clear'], control: 'radio', required: true },
      ],
      textFields: [
          { key: 'provider', label: 'Provider', placeholder: 'Police service or screening provider', required: true,
            demoValues: ['RCMP', 'Ontario Provincial Police', 'Sterling Backcheck'] },
      ],
      jurisdiction: 'National / provincial police service',
      monitor: 'Police clearance check result. Monitored from the issue date on a three-year cycle; the next review date is what that works out to.' },
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
    { id: 'experience-letter', category: 'Pre-Employment', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Experience Letter', versionRenamedFrom: 'Employer Experience Letter',
      description: 'Previous Employer / Insurer Experience Letter', numberName: '', documentName: 'Experience Letter',
      recurring: 'Per prior employer', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      selectFields: [
          // Two letters, one record: a previous employer vouching for the driver's history, and
          // an insurer vouching for their claims record. They are asked for at the same point in
          // hiring and filed the same way, so the difference is a field rather than a record.
          // Every letter on file predates the question and was an employer's — that is all this
          // record was — so the history reads Employer rather than a coin toss.
          { key: 'letterType', label: 'Letter from', required: true, order: -1, rowStart: true, control: 'radio',
            options: [...EXPERIENCE_LETTER_TYPES], priorValue: 'Employer' },
      ],
      textFields: [
          { key: 'employerName', label: 'Employer / insurer', placeholder: 'Previous employer or insurer', required: true,
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
    { id: 'ssn-sin-card', category: 'Personal Documents', entity: 'Driver', type: 'DC', docRequirement: 'optional', hideState: true, slotLabels: ['Front', 'Back'],
      recordName: 'SSN / SIN Card', description: 'Social Security Number (US) / Social Insurance Number (Canada) Card', numberName: 'SSN / SIN', documentName: 'SSN / SIN Card',
      recurring: 'Per card term', monitorType: 'Card expiry', tracksIssueDate: true, nameFromRecord: true,
      jurisdiction: 'United States (SSA) / Canada (Service Canada)',
      monitor: 'Government identity / tax number and card; monitored on the card expiry. Retained for payroll and tax — store securely.' },
    // The letter states the TERMS of the job: when they start, on what basis, on what
    // schedule and over what territory. All three terms are worth filtering the roster by.
    // Offered by the company, not issued by a jurisdiction, and signed once and filed — so no
    // country, no state, no status and nothing to alert on.
    { id: 'offer-letter', category: 'Personal Documents', entity: 'Driver', type: 'D', docRequirement: 'optional',
      recordName: 'Offer Letter / Contract', description: 'Employment Offer Letter / Contract', numberName: '', documentName: 'Offer Letter / Contract',
      // The offer and the contract are one filing here: the letter states the terms and the
      // signed contract is the same terms accepted, and carriers file whichever they hold.
      // `versionRenamedFrom` relabels records already captured under the old name, so a
      // driver's list does not end up mixing "Offer Letter 2025" with "Offer Letter / Contract 2026".
      versionRenamedFrom: 'Offer Letter',
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
      monitor: 'Signed employment offer letter or contract retained in the hiring file.' },
    // The other end of the same employment. Filed once, with the date it took effect.
    { id: 'termination-letter', category: 'Personal Documents', entity: 'Driver', type: 'D', docRequirement: 'optional',
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
    // carries its source with it (what it was issued for, what happened, that record's own
    // number and date), filled in automatically when it is issued from a review and typed by
    // hand when one is filed directly. Without that the driver file shows a stack of letters
    // and no way to tell what any of them was for. The detail of the event itself stays on
    // the source record, which the Event reference links to — it is not retyped here.
    { id: 'warning-letter', category: 'Disciplinary Records', entity: 'Driver', type: 'DC', docRequirement: 'required',
      recordName: 'Warning Letter', description: 'Driver Warning Letter (issued on review)', numberName: '', documentName: 'Warning Letter',
      recurring: 'Per incident', monitorType: 'On file',
      nameFromRecord: true, hideCountry: true, hideState: true, hideStatus: true, hideMonitoring: true,
      tracksIssueDate: true,
      selectFields: [
          { key: 'letterSource', label: 'Issued for', required: true, order: -3,
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
      ],
      dateFields: [
          { key: 'eventDate', label: 'Event date', order: 1,
            demoValues: ['2026-01-05', '2025-08-21', '2025-11-01'] },
      ],
      jurisdiction: 'Company',
      monitor: 'Warning letter kept on file. It records an action already taken, so there is nothing to expire or renew.' },
];

// ── Upload mode classification (per the safety-software workbook) ──────
// Single upload (one file; replaces): MC, FEIN (147C), Carrier Code, BOC-3.
// Company Documents is NOT single-upload, even though incorporation is filed once: the same
// record holds the master business licence, which is renewed, and a renewal has to be able to
// keep the licence it replaces.
// Event/replacement (multiple dated versions, no fixed schedule): Drug Test, MCS-90, and the toll/
// transponder passes (reissued/replaced ad-hoc). Everything else with a document is recurring
// (retain previous + new dated version on renew/reissue/review/replace). Compliance-only records
// (USDOT, IRP Plate, the WDT / KYU / HUT / Oregon permits) have no document → no upload mode.
// Single (one file; replaces) also covers the once-per-hire driver DQ paperwork.
const SINGLE_UPLOAD_IDS = new Set(['mc', 'fein', 'carrier-code', 'boc3',
    'safety-perf-history', 'road-test', 'driver-application',
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

/**
 * The categories, in the order their tabs appear.
 *
 * They are NOT one taxonomy stretched over three entities. A carrier files an operating
 * authority and an insurance policy; a driver files a passport and a road test; the two have
 * nothing to say to each other, and a shared list ("Regulatory and Safety Numbers") ends up
 * holding a driver's medical certificate next to a carrier's MC number because both are
 * regulatory. So each entity has its own headings, and the category tabs on a page are built
 * from what that entity's records actually use — the rest simply never appear there.
 *
 * Carrier first, then driver, then the asset headings, with Other last everywhere.
 */
export const SAFETY_CATEGORY_ORDER = [
    // Carrier
    'Operating Authority',
    'Safety & Regulatory Permits',
    'Carrier Codes & Certifications',
    'Insurance',
    // Driver
    'Personal Documents',
    'Travel Documents',
    'Abstracts & Annual Reviews',
    'Pre-Employment',
    'Disciplinary Records',
    // Asset — unchanged, and still the home of custom records filed under them.
    'Regulatory and Safety Numbers',
    'Tax and Business Identification Numbers',
    'Carrier & Industry Codes',
    'Bond and Registration Numbers',
    'Other',
] as const;

/** One category heading. */
export type SafetyCategory = typeof SAFETY_CATEGORY_ORDER[number];

/**
 * The headings each entity files under — what the category picker offers when a carrier adds a
 * custom record, and the reason no page shows an empty tab. "Other" is on every list: it is
 * where anything that fits none of the headings above it belongs, on any entity.
 */
export const SAFETY_CATEGORIES_BY_ENTITY: Record<EntityId, SafetyCategory[]> = {
    Carrier: ['Operating Authority', 'Safety & Regulatory Permits', 'Carrier Codes & Certifications', 'Insurance', 'Other'],
    Driver: ['Personal Documents', 'Travel Documents', 'Abstracts & Annual Reviews', 'Pre-Employment', 'Disciplinary Records', 'Other'],
    Asset: ['Regulatory and Safety Numbers', 'Tax and Business Identification Numbers', 'Carrier & Industry Codes', 'Bond and Registration Numbers', 'Other'],
};

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
    if (r.nameFromRecord || r.versionName || r.nameFromField) return year ? `${base} ${year}` : base;
    return `Record ${year ?? new Date().getFullYear()}`;
}

/** The values a record's own select field offers, or [] when it has no such field. */
const fieldOptions = (r: SafetyRecord, key?: string): string[] =>
    (key ? r.selectFields?.find(f => f.key === key)?.options : undefined) ?? [];

/**
 * True when a record's name is still one the SYSTEM chose, rather than something a person
 * typed. That is the licence to change it: picking a different certificate type may rename the
 * record, but only if nobody has given it a name of their own.
 *
 * Auto names are the record's default ("Safety Fitness Certificate"), the generic "Record",
 * any value of the field the record is named after ("NIR"), or any of those followed by a year
 * and / or the " (2)" that keeps a second record in the same year distinct.
 */
export function isAutoVersionLabel(r: SafetyRecord, label: string): boolean {
    const bare = label.trim().replace(/\s*\(\d+\)$/, '').replace(/\s+\d{4}$/, '').trim();
    if (!bare) return true;
    const auto = ['Record', r.versionName ?? r.recordName, r.versionRenamedFrom, ...fieldOptions(r, r.nameFromField)];
    return auto.some(a => !!a && a.toLowerCase() === bare.toLowerCase());
}

/**
 * The provinces a record allows, given the field its jurisdiction depends on — null when the
 * record puts no constraint on it (the country's full list applies).
 */
export function statesForRecord(r: SafetyRecord, fields?: Record<string, string>): string[] | null {
    const dep = r.stateByField;
    if (!dep) return null;
    const chosen = fields?.[dep.from] ?? '';
    return dep.states[chosen] ?? null;
}

/**
 * The record as it applies to ONE filed document.
 *
 * A record that holds several kinds of document (`variantByField`) declares the union of their
 * fields, because that is what the record IS — but no single document has all of them. This
 * resolves the record down to the one being looked at, so every surface that reads a record's
 * flags (the form, the detail facts, the migration) narrows in step, from one declaration,
 * rather than each growing its own conditions.
 *
 * Returns the record itself — the same object — for everything that has no variants.
 */
export function recordForFields(r: SafetyRecord, fields?: Record<string, string>): SafetyRecord {
    const dep = r.variantByField;
    if (!dep) return r;
    const variant = dep.variants[fields?.[dep.from] ?? ''];
    if (!variant) return r;
    const { hideFields, ...over } = variant;
    const merged: SafetyRecord = { ...r, ...over };
    if (hideFields?.length) {
        const drop = new Set(hideFields);
        const keep = <T extends { key: string }>(list?: T[]) => list?.filter(f => !drop.has(f.key));
        merged.selectFields = keep(merged.selectFields);
        merged.textFields = keep(merged.textFields);
        merged.dateFields = keep(merged.dateFields);
        merged.derivedFields = keep(merged.derivedFields);
    }
    return merged;
}

/**
 * Stored field values, minus anything the record — resolved for this document — does not
 * capture. A value left behind by a field the form no longer shows is worse than missing: it
 * is still read by the list columns and the record's facts, so it reads as current while
 * being unreachable and uncorrectable. Only records WITH variants are pruned.
 */
export function pruneRecordFields(r: SafetyRecord, fields?: Record<string, string>): Record<string, string> | undefined {
    if (!r.variantByField || !fields) return fields;
    const keys = new Set(recordFields(recordForFields(r, fields)).map(f => f.key));
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(fields)) if (keys.has(k)) out[k] = val;
    return Object.keys(out).length === Object.keys(fields).length ? fields : out;
}

/** The values the monitored-status field offers for a record. */
export const statusOptionsFor = (r: SafetyRecord, fallback: string[]): string[] => r.statusOptions ?? fallback;
