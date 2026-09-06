// ─────────────────────────────────────────────────────────────────────────────
// Travel documents captured on the driver application → the driver's COMPLIANCE
// RECORDS.
//
// The application's Travel Documents section used to hold its own hardcoded
// passport / visa / work-permit fields, which then had to be re-entered on the
// compliance side. They are the same documents: a passport captured at hire IS
// the driver's Passport record. So this section is driven by the compliance
// CATALOG instead — one question per travel record, asking for exactly the
// fields that record declares — and what the applicant answers is written
// straight in as that record's first version.
//
// Adding a travel record to the catalog therefore adds it to the application
// form and to this hand-off with no further work: Green Card and PR Documents
// arrived that way.
//
// Nothing here knows about React — the form renders from `travelDocRecords()`
// and calls `commitTravelDocs` once the driver has an id.
// ─────────────────────────────────────────────────────────────────────────────

import {
    SAFETY_RECORDS, isDateMonitored, defaultVersionLabel, recordFields, type SafetyRecord,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    blankVersion, defaultMonitoring, writeComplianceVersion, type DocVersion, type MonitoringConfig,
} from '@/pages/compliance/compliance-data-store';

// ── Who needs which documents ───────────────────────────────────────────
// Asking every driver about every travel document is wrong twice over: it asks a US citizen
// driving in the US about their green card, and it leaves the office to work out which
// answers actually mattered. Three questions settle it instead — which country, whose
// citizen, and what status — and only the documents that follow from those are asked for.

/** The countries a driver is set up to work in. */
export const TRAVEL_COUNTRIES = ['United States', 'Canada'] as const;

/** A status in a country, and the records it requires. */
export interface TravelStatusOption { id: string; label: string; records: string[] }

/**
 * Status in the working country, for someone who is NOT a citizen of it. Each status names
 * the record(s) that prove it — which is what the form then asks to see.
 */
export const TRAVEL_STATUS_BY_COUNTRY: Record<string, TravelStatusOption[]> = {
    'United States': [
        { id: 'permanent-resident', label: 'Permanent Resident (Green Card)', records: ['green-card'] },
        { id: 'work-permit', label: 'Work Permit / Employment Authorization', records: ['work-permit'] },
    ],
    'Canada': [
        { id: 'permanent-resident', label: 'Permanent Resident', records: ['pr-documents'] },
        { id: 'work-permit', label: 'Work Permit', records: ['work-permit'] },
    ],
};

/**
 * What the driver's right to work rests on.
 *
 * A cross-border carrier runs on both sides of the line, so the question is not "which
 * country do they work in" but "where do they already have the right to work". Citizenship
 * answers that for one country at most; every OTHER country has to be authorised. So a
 * Canadian is asked about the US, an American about Canada, and someone from anywhere else
 * about both.
 */
export interface TravelProfile {
    /** The country the driver holds citizenship of — any country, not just the two. */
    citizenship: string;
    /** Right-to-work status per country: `{ 'United States': 'work-permit' }`. */
    authorization: Record<string, string>;
    /** A single working country, from applications saved before this became per-country. */
    country?: string;
}

export const emptyTravelProfile = (): TravelProfile => ({ citizenship: '', authorization: {} });

export const travelStatusOptions = (country: string): TravelStatusOption[] => TRAVEL_STATUS_BY_COUNTRY[country] ?? [];

/**
 * The countries this driver still needs authorisation for — every one they are not a citizen
 * of. Empty until citizenship is answered, since until then we do not know which.
 */
export function countriesNeedingAuthorization(p: TravelProfile): string[] {
    if (!p.citizenship) return [];
    return TRAVEL_COUNTRIES.filter(c => c !== p.citizenship);
}

/** The status chosen for one country, resolved to its option. */
export function authorizationFor(p: TravelProfile, country: string): TravelStatusOption | undefined {
    const chosen = p.authorization?.[country];
    if (!chosen) return undefined;
    // The select stores the visible label; older data may hold the id.
    return travelStatusOptions(country).find(o => o.id === chosen || o.label === chosen);
}

/** True once citizenship and every authorisation it calls for have been answered. */
export function travelProfileAnswered(p: TravelProfile): boolean {
    if (!p.citizenship) return false;
    return countriesNeedingAuthorization(p).every(c => !!p.authorization?.[c]);
}

/**
 * The records to ask for, given the answers so far — empty for a citizen, and empty until
 * the questions are answered. A passport comes with every one of them: a non-citizen needs
 * one whatever their status, which is why it is not a question of its own.
 */
/**
 * Records asked by a QUESTION of their own rather than derived from the right-to-work status,
 * grouped because they are not one kind of thing.
 *
 * A visa is permission to ENTER — a permanent resident may hold one, so may a citizen crossing
 * the other way — which is why it hangs off the passport rather than off a status. The TWIC and
 * FAST cards are trade credentials: a driver either carries one or does not, whatever their
 * citizenship, so they are asked of everyone and sit at the end.
 *
 * `placement` says where the group is asked, so the form does not have to know the ids.
 */
export interface TravelQuestionGroup {
    id: string;
    title: string;
    note?: string;
    placement: 'after-passport' | 'after-status';
    records: readonly string[];
}

export const TRAVEL_QUESTION_GROUPS: readonly TravelQuestionGroup[] = [
    { id: 'visa', title: 'Visa', placement: 'after-passport', records: ['visa'] },
    {
        id: 'credentials', title: 'Border & Port Credentials', placement: 'after-status',
        note: 'Optional cards a driver either carries or does not — asked of everyone, whatever their citizenship or right to work.',
        records: ['twic', 'fast-card'],
    },
];

/** Every record asked by a question, flattened — derived so a group cannot be missed. */
export const QUESTION_RECORD_IDS: readonly string[] = TRAVEL_QUESTION_GROUPS.flatMap(g => [...g.records]);

/** True for a record the applicant is ASKED about, rather than one their status calls for. */
export const isQuestionRecord = (id: string): boolean => QUESTION_RECORD_IDS.includes(id);

export function requiredTravelRecordIds(p: TravelProfile, docs?: TravelDocs): string[] {
    // Rule 1 — the PASSPORT is asked of everyone. Citizenship does not remove the need for
    // one: a US citizen driving into Canada still crosses on a passport.
    const ids = ['passport'];
    // Rule 2 — the RIGHT TO WORK, per country. Each country they are not a citizen of
    // contributes whatever its chosen status names, so a third-country national ends up
    // asked for both sides' paperwork.
    for (const country of countriesNeedingAuthorization(p)) {
        ids.push(...(authorizationFor(p, country)?.records ?? []));
    }
    // Rule 3 — the records that answer their OWN question (visa, TWIC card, FAST card). None
    // of them follows from a status, so each is asked, and only a "Yes" brings it in.
    for (const id of QUESTION_RECORD_IDS) if (docs?.[id]?.has === 'Yes') ids.push(id);
    // Deduped and kept in the catalog's own order, so the form never jumps around.
    return TRAVEL_DOC_RECORD_IDS.filter(id => ids.includes(id));
}

/** The permission records alone — rule 2, without the passport that rule 1 always adds. */
export function requiredPermissionRecordIds(p: TravelProfile): string[] {
    return requiredTravelRecordIds(p).filter(id => id !== 'passport');
}

/** The records asked by their own question, whatever the profile says. */
export const questionRecords = (): SafetyRecord[] =>
    travelDocRecords().filter(r => isQuestionRecord(r.id));

/**
 * The question groups with their records resolved, and any group whose records have all been
 * removed from the catalog dropped — so the form renders no empty heading.
 */
export function travelQuestionGroups(): (Omit<TravelQuestionGroup, 'records'> & { records: SafetyRecord[] })[] {
    return TRAVEL_QUESTION_GROUPS
        .map(g => ({ ...g, records: travelDocRecords().filter(r => g.records.includes(r.id)) }))
        .filter(g => g.records.length > 0);
}

/** Those records, resolved. */
export function requiredTravelRecords(p: TravelProfile, docs?: TravelDocs): SafetyRecord[] {
    const ids = requiredTravelRecordIds(p, docs);
    return travelDocRecords().filter(r => ids.includes(r.id));
}

/**
 * The travel / immigration records the application can ask about, in the order asked.
 * Passport first (everyone has one), then the visa that lives in it, then the permissions the
 * right-to-work status calls for, and last the border cards a driver may simply carry.
 */
export const TRAVEL_DOC_RECORD_IDS = ['passport', 'visa', 'work-permit', 'green-card', 'pr-documents', 'twic', 'fast-card'] as const;
export type TravelDocRecordId = typeof TRAVEL_DOC_RECORD_IDS[number];

/** Year / month / day as the application form holds it (three selects). */
export interface TravelDate { m: string; d: string; y: string }
const emptyTravelDate = (): TravelDate => ({ m: '', d: '', y: '' });

/** One travel document as captured on the application. */
export interface TravelDocCapture {
    /** '' until answered. Only 'Yes' files anything — 'No' is a real answer, not a blank. */
    has: string;
    /**
     * What the filed record is called. Seeded with the catalog's own default name — the same
     * one the office form fills in — so it is answered before it is asked, and editable for
     * the driver who hands over two of something ("Work Permit — renewal").
     */
    label: string;
    number: string;
    country: string;
    issue: TravelDate;
    expiry: TravelDate;
    /** Uploaded file name (the prototype's uploads are names, not bytes). */
    doc: string;
    /** The record's own declared fields (a visa's type, and so on), keyed by field key. */
    fields: Record<string, string>;
    /**
     * The alert to set once this becomes a compliance record. Held as the record's OWN
     * monitoring config, not a reduced { on, days } pair, because the application renders
     * the same Monitoring & Notifications block the office does -- anything less and a
     * setting made at hire could not survive the hand-off.
     */
    monitoring: MonitoringConfig;
}

export type TravelDocs = Record<string, TravelDocCapture>;

/** The catalog records behind the section — silently skipping any that has been removed. */
export function travelDocRecords(): SafetyRecord[] {
    return TRAVEL_DOC_RECORD_IDS
        .map(id => SAFETY_RECORDS.find(r => r.id === id))
        .filter((r): r is SafetyRecord => !!r);
}

/** A blank capture, with the record's own fixed country pre-filled where it has one. */
export function emptyTravelDoc(record: SafetyRecord, fallbackCountry = ''): TravelDocCapture {
    return {
        has: '',
        label: defaultVersionLabel(record),
        number: '',
        country: record.defaultCountry ?? (record.hideCountry ? '' : fallbackCountry),
        issue: emptyTravelDate(),
        expiry: emptyTravelDate(),
        doc: '',
        fields: {},
        // Enabled and counting back from the document's expiry, which is what these all are.
        monitoring: { ...defaultMonitoring(), enabled: true, basis: 'expiry' },
    };
}

export function emptyTravelDocs(fallbackCountry = ''): TravelDocs {
    const out: TravelDocs = {};
    for (const r of travelDocRecords()) out[r.id] = emptyTravelDoc(r, fallbackCountry);
    return out;
}

/** `{m,d,y}` → `YYYY-MM-DD`, or '' unless all three are set. */
export function isoDate(d: TravelDate | undefined): string {
    if (!d?.y || !d.m || !d.d) return '';
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
}

/** `YYYY-MM-DD` → `{m,d,y}` for pre-filling the form from an existing record. */
export function fromIsoDate(iso: string | undefined): TravelDate {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
    return m ? { y: m[1], m: m[2], d: m[3] } : emptyTravelDate();
}

/**
 * Which fields the form should ask for on one travel record — read from the record
 * itself, so the question set can never drift from the office-side form.
 */
export function travelDocFields(record: SafetyRecord) {
    return {
        number: !!record.numberName,
        numberLabel: record.numberName,
        country: !record.hideCountry,
        issue: !!record.tracksIssueDate,
        expiry: isDateMonitored(record),
        expiryLabel: record.monitorType,
        upload: record.type !== 'C' && record.docRequirement !== 'none',
        uploadLabel: record.documentName || record.recordName,
        monitoring: isDateMonitored(record) && !record.hideMonitoring,
        /** Whatever else the record declares — a visa's type, a permit's type. */
        extras: recordFields(record),
    };
}

/** True once a document carries something worth filing. */
export function travelDocHasContent(record: SafetyRecord, c: TravelDocCapture | undefined): boolean {
    if (!c) return false;
    const f = travelDocFields(record);
    return !!(c.doc.trim()
        || (f.number && c.number.trim())
        || (f.issue && isoDate(c.issue))
        || (f.expiry && isoDate(c.expiry))
        || f.extras.some(x => (c.fields?.[x.key] ?? '').trim()));
}

/** The date this capture's alert would actually count back from. */
function monitoredFor(c: TravelDocCapture, v: DocVersion): string {
    const basis = c.monitoring?.basis;
    if (basis === 'issue') return v.issueDate;
    if (basis === 'custom') return c.monitoring?.customDate ?? '';
    return v.expiryDate;
}

/**
 * One captured travel document → the version that becomes the driver's record, or null
 * when there is nothing to file. Only the fields the record actually declares are carried
 * over, so a value left behind by a changed answer cannot leak into the record.
 */
export function travelDocVersion(record: SafetyRecord, c: TravelDocCapture, capturedBy?: string): DocVersion | null {
    if (!travelDocHasContent(record, c)) return null;
    const f = travelDocFields(record);
    // Named by the applicant, falling back to the catalog default — a record cannot be filed
    // nameless, and a name cleared to blank should not be what the office finds it under.
    const v = blankVersion(record, c.label?.trim() || defaultVersionLabel(record));
    v.numberValue = f.number ? c.number.trim() : '';
    v.country = f.country ? (c.country || record.defaultCountry || '') : '';
    v.stateProv = '';
    v.issueDate = f.issue ? isoDate(c.issue) : '';
    v.expiryDate = f.expiry ? isoDate(c.expiry) : '';
    if (c.doc.trim()) {
        v.files = [{ name: c.doc.trim(), size: 0, uploadedAt: new Date().toISOString() }];
    }
    // Only keys the record still declares — a field dropped from the catalog must not
    // survive in the data as an orphan.
    const extras: Record<string, string> = {};
    for (const x of f.extras) {
        const val = (c.fields?.[x.key] ?? '').trim();
        if (val) extras[x.key] = val;
    }
    if (Object.keys(extras).length) v.fields = extras;
    // Tagged with where it came from: on the compliance list this is the difference between
    // a document the office filed and one the driver handed over at hire.
    v.tags = ['From application'];
    if (capturedBy) v.uploadedBy = capturedBy;
    v.monitoring = {
        ...(c.monitoring ?? defaultMonitoring()),
        // Only where the record has a date to monitor, and never without one: an expiry the
        // applicant left blank would alert on nothing.
        enabled: f.monitoring && (c.monitoring?.enabled ?? false) && !!monitoredFor(c, v),
    };
    return v;
}

/**
 * The application's legacy travel shape — the three hardcoded blocks the driver record and
 * its mappers still read. Derived from the captures so there is one source of truth, and
 * kept so nothing downstream had to change to gain the catalog-driven form.
 */
export function legacyTravelShape(docs: TravelDocs) {
    const at = (id: string) => docs[id];
    const p = at('passport'), v = at('visa'), w = at('work-permit');
    return {
        passport: { number: p?.number ?? '', country: p?.country ?? '', expiry: p?.expiry ?? emptyTravelDate(), doc: p?.doc ?? '' },
        visa: {
            has: v?.has ?? '', number: v?.number ?? '', type: v?.fields?.visaType ?? '',
            expiry: v?.expiry ?? emptyTravelDate(), doc: v?.doc ?? '',
            monitor: v?.monitoring?.enabled ?? true, reminderDays: v?.monitoring?.reminders ?? [90, 60, 30],
        },
        workPermit: {
            has: w?.has ?? '', number: w?.number ?? '', type: w?.fields?.permitType ?? '',
            expiry: w?.expiry ?? emptyTravelDate(), doc: w?.doc ?? '',
            monitor: w?.monitoring?.enabled ?? true, reminderDays: w?.monitoring?.reminders ?? [90, 60, 30],
        },
    };
}

/** What an application was saved with, in either shape. */
interface LegacyTravelSource {
    travelDocs?: TravelDocs;
    passport?: { number?: string; country?: string; expiry?: TravelDate; doc?: string };
    visa?: { has?: string; number?: string; type?: string; expiry?: TravelDate; doc?: string; monitor?: boolean; reminderDays?: number[] };
    workPermit?: { has?: string; number?: string; type?: string; expiry?: TravelDate; doc?: string; monitor?: boolean; reminderDays?: number[] };
}

/**
 * Pre-fill the section from a saved application. Applications saved before the section
 * became catalog-driven carry only the three legacy blocks, so those are read across —
 * an existing driver opens with their passport and visa already in place.
 */
export function travelDocsFromApplication(src: LegacyTravelSource | undefined, fallbackCountry = ''): TravelDocs {
    const docs = emptyTravelDocs(fallbackCountry);
    if (!src) return docs;
    if (src.travelDocs) {
        // Merged onto blanks, so a record added to the catalog since the application was
        // saved still gets a well-formed (empty) capture rather than undefined.
        for (const id of Object.keys(docs)) {
            const saved = src.travelDocs[id];
            // The record name falls back to the catalog default, so an application saved
            // before the field existed opens named rather than blank.
            if (saved) docs[id] = { ...docs[id], ...saved, label: saved.label || docs[id].label, fields: { ...saved.fields } };
        }
        return docs;
    }
    const carry = (id: string, from: LegacyTravelSource['visa'], typeKey?: string, alwaysHas?: boolean) => {
        if (!from || !docs[id]) return;
        docs[id] = {
            ...docs[id],
            has: alwaysHas ? (from.number || from.doc ? 'Yes' : docs[id].has) : (from.has ?? ''),
            number: from.number ?? '',
            country: (from as { country?: string }).country || docs[id].country,
            expiry: from.expiry ?? docs[id].expiry,
            doc: from.doc ?? '',
            fields: typeKey && from.type ? { [typeKey]: from.type } : {},
            monitoring: {
                ...docs[id].monitoring,
                enabled: from.monitor ?? true,
                reminders: from.reminderDays ?? docs[id].monitoring.reminders,
            },
        };
    };
    // The passport had no question of its own before, so it counts as answered only if
    // something was actually entered for it.
    carry('passport', src.passport as LegacyTravelSource['visa'], undefined, true);
    carry('visa', src.visa, 'visaType');
    carry('work-permit', src.workPermit, 'permitType');
    return docs;
}

/**
 * File every answered travel document as the driver's compliance record. Called once the
 * driver has an id — on Add Driver that is only after the roster assigns one.
 *
 * Returns the record names written, for the confirmation the user sees. Existing versions
 * are kept: this prepends, so re-saving an edited driver files the newer document over the
 * older one rather than replacing history.
 */
export function commitTravelDocs(
    accountId: string | undefined, subjectId: string, profile: TravelProfile | undefined,
    docs: TravelDocs | undefined, capturedBy?: string,
): string[] {
    if (!subjectId || !docs || !profile) return [];
    const written: string[] = [];
    for (const record of requiredTravelRecords(profile, docs)) {
        const version = travelDocVersion(record, docs[record.id], capturedBy);
        if (!version) continue;
        writeComplianceVersion(accountId, subjectId, record.id, version);
        written.push(record.recordName);
    }
    return written;
}
