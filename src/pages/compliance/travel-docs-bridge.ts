// ─────────────────────────────────────────────────────────────────────────────
// Travel documents captured on the driver application → the driver's COMPLIANCE
// RECORDS.
//
// The application's Travel Documents section used to hold its own hardcoded
// passport / visa / work-permit fields, which then had to be re-entered on the
// compliance side. They are the same documents: a passport captured at hire IS
// the driver's Passport record. So this section is driven by the compliance
// CATALOG instead — one block per travel record, asking for exactly the fields
// that record declares — and what the applicant answers is written straight in
// as that record's version.
//
// Nothing here knows about React — the form renders from `visibleTravelBlocks()`
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
// about their green card, and it leaves the office to work out which answers actually
// mattered. Two facts settle nearly all of it — where the driver runs, and whose citizen
// they are — and only the documents that follow are asked for.

/** The two countries this system's carriers operate in. */
export const TRAVEL_COUNTRIES = ['United States', 'Canada'] as const;
export type TravelCountry = typeof TRAVEL_COUNTRIES[number];

export const isTravelCountry = (c: string): boolean => (TRAVEL_COUNTRIES as readonly string[]).includes(c);

/**
 * The countries ONE application covers. A US-only driver is asked about the United States, a
 * Canada-only driver about Canada, and a cross-border driver about both — because the
 * paperwork a driver needs is the paperwork for the roads they will actually be on.
 */
export function travelCountriesFor(defaultCountry: string, crossBorder: boolean): string[] {
    if (crossBorder) return [...TRAVEL_COUNTRIES];
    return isTravelCountry(defaultCountry) ? [defaultCountry] : [...TRAVEL_COUNTRIES];
}

/** A right-to-work status in a country, and the record(s) that prove it. */
export interface TravelStatusOption { id: string; label: string; records: string[] }

/**
 * Status in a working country, for a driver who is a citizen of neither. Each status names
 * the document that proves it — which is what the form then asks to see — and "Not
 * applicable" names none, because a driver has to be able to say so without being asked for
 * a document they do not have.
 */
export const TRAVEL_STATUS_BY_COUNTRY: Record<string, TravelStatusOption[]> = {
    'United States': [
        { id: 'permanent-resident', label: 'Permanent Resident (Green Card)', records: ['green-card'] },
        { id: 'work-permit', label: 'Work Permit / Employment Authorization', records: ['work-permit'] },
        { id: 'none', label: 'Not applicable', records: [] },
    ],
    'Canada': [
        { id: 'permanent-resident', label: 'Permanent Resident (PR)', records: ['pr-documents'] },
        { id: 'work-permit', label: 'Work Permit', records: ['work-permit'] },
        { id: 'none', label: 'Not applicable', records: [] },
    ],
};

export const travelStatusOptions = (country: string): TravelStatusOption[] => TRAVEL_STATUS_BY_COUNTRY[country] ?? [];

/**
 * What the driver's right to cross and to work rests on.
 *
 * `holds` is the answer to every optional "do they carry one?" box, keyed by block (see
 * `TravelBlock`), so the questions and the documents they open stay in one place.
 */
export interface TravelProfile {
    /** The country the driver holds citizenship of — any country, not just the two. */
    citizenship: string;
    /** Right-to-work status per country: `{ 'United States': 'work-permit' }`. */
    authorization: Record<string, string>;
    /** Keys of the optional blocks the driver has ticked (a visa, a TWIC or FAST card). */
    holds?: string[];
    /** A single working country, from applications saved before this became per-country. */
    country?: string;
}

export const emptyTravelProfile = (): TravelProfile => ({ citizenship: '', authorization: {} });

/**
 * True when citizenship alone settles both the right to work and the right to enter.
 *
 * A US or Canadian citizen driving a truck across the line is not taking a job on the other
 * side, and neither country requires a visa of the other's citizens — so there is nothing to
 * ask them beyond the passport they cross on. Everyone else has a status to declare.
 */
export const isBorderCitizen = (p: TravelProfile): boolean => isTravelCountry(p.citizenship);

/** The countries whose right-to-work question this driver has to answer. */
export function countriesNeedingAuthorization(p: TravelProfile, countries: readonly string[]): string[] {
    if (!p.citizenship || isBorderCitizen(p)) return [];
    return countries.filter(isTravelCountry);
}

/** The status chosen for one country, resolved to its option. */
export function authorizationFor(p: TravelProfile, country: string): TravelStatusOption | undefined {
    const chosen = p.authorization?.[country];
    if (!chosen) return undefined;
    // The select stores the visible label; older data may hold the id.
    return travelStatusOptions(country).find(o => o.id === chosen || o.label === chosen);
}

/** True once citizenship and every authorisation it calls for have been answered. */
export function travelProfileAnswered(p: TravelProfile, countries: readonly string[]): boolean {
    if (!p.citizenship) return false;
    return countriesNeedingAuthorization(p, countries).every(c => !!p.authorization?.[c]);
}

/**
 * Whether the driver may work in one country, as the application's own answers settle it.
 * Replaces the two "do you have legal right to work in …?" toggles the form used to carry:
 * they asked for the same fact twice, and a toggle can contradict the citizenship and status
 * answered a step later. Derived, so it cannot.
 */
export function hasRightToWork(p: TravelProfile, country: string): boolean {
    if (!p.citizenship) return false;
    if (isBorderCitizen(p)) return true;
    const opt = authorizationFor(p, country);
    return !!opt && opt.records.length > 0;
}

// ── The blocks the section is made of ───────────────────────────────────

/** Which part of the section a block belongs to — they are asked in this order. */
export const TRAVEL_GROUPS = ['passport', 'authorization', 'visa', 'credentials'] as const;
export type TravelGroup = typeof TRAVEL_GROUPS[number];

/** Heading and standfirst for each group, so the form does not spell them out itself. */
export const TRAVEL_GROUP_META: Record<TravelGroup, { title: string; note?: string }> = {
    passport: { title: 'Passport' },
    authorization: { title: 'Right to work' },
    visa: {
        title: 'Visa',
        note: 'Permission to ENTER, which is not the same as permission to work — tick each country the driver holds a visa for and add every one of them.',
    },
    credentials: {
        title: 'Border & Port Credentials',
        note: 'Optional cards a driver either carries or does not, whatever their citizenship or right to work.',
    },
};

/**
 * ONE thing the section asks for: a record, filed as many times as the driver actually holds
 * it. Both sides of a cross-border driver's paperwork can be the same catalog record — a US
 * work permit and a Canadian one are both Work Permits — so the block, not the record, is the
 * unit the form and the captures are keyed by.
 */
export interface TravelBlock {
    /** Stable key: the record id, plus the country when the same record is asked for twice. */
    key: string;
    recordId: string;
    /** The country whose paperwork this is; '' when the driver's own answer decides it. */
    country: string;
    group: TravelGroup;
    /** Heading for the block's documents. */
    title: string;
    /** Wording of the tick-box, for a block the driver opts into. */
    question: string;
    /** Why it is being asked — shown under the heading, so no answer looks arbitrary. */
    reason: string;
    /** Asked behind a switch: nothing is captured unless the driver says they hold one. */
    gated: boolean;
    /**
     * The only countries this document can be issued by, when there are few enough to show
     * them all at once. A visa on a cross-border application is for the United States or for
     * Canada — two answers, so they are offered as a pair to pick from rather than as a
     * search through every country on earth, and each visa says on its face which it is.
     */
    countryChoices?: string[];
}

const blockKey = (recordId: string, country: string) => (country ? `${recordId}@${country}` : recordId);

/** The record id behind a block key — including a legacy key that is just the record id. */
export const recordIdForKey = (key: string): string => key.split('@')[0];

/** The optional border cards, and what each one presupposes about where the driver runs. */
const TRAVEL_CREDENTIALS: readonly { recordId: string; country: string; requires: string[]; reason: string }[] = [
    {
        recordId: 'twic', country: 'United States', requires: ['United States'],
        reason: 'Needed to enter a secure US port area unescorted. Asked because this driver runs in the United States.',
    },
    {
        recordId: 'fast-card', country: '', requires: ['United States', 'Canada'],
        reason: 'Expedited clearance in the FAST lanes. Asked because this driver crosses the border.',
    },
];

/**
 * Everything the section asks THIS driver for, in the order it is asked.
 *
 * The passport first, because everyone crosses on one. Then the right to work, which only a
 * driver who is a citizen of neither country has to answer — and only for the countries they
 * will be driving in. Then the visas that let them enter, and last the optional cards.
 */
export function visibleTravelBlocks(p: TravelProfile, countries: readonly string[]): TravelBlock[] {
    const out: TravelBlock[] = [];
    const known = new Set(travelDocRecords().map(r => r.id));
    const push = (b: TravelBlock) => { if (known.has(b.recordId)) out.push(b); };
    const nameOf = (id: string) => SAFETY_RECORDS.find(r => r.id === id)?.recordName ?? id;

    // 1 — the passport. Citizenship does not remove the need for one.
    push({
        key: 'passport', recordId: 'passport', country: '', group: 'passport',
        title: 'Passport', question: 'Passport', gated: false,
        reason: 'Asked of every driver — a citizen still crosses the border on a passport.',
    });

    // 2 — the right to work, per country, and the document the chosen status names.
    for (const country of countriesNeedingAuthorization(p, countries)) {
        const opt = authorizationFor(p, country);
        for (const recordId of opt?.records ?? []) {
            push({
                key: blockKey(recordId, country), recordId, country, group: 'authorization',
                title: `${nameOf(recordId)} — ${country}`, question: nameOf(recordId), gated: false,
                reason: `Proves the right to work in ${country}, which is what "${opt?.label}" was answered above.`,
            });
        }
    }

    // 3 — the visa. ONE question, not one per country: which country a visa is for is a
    // property of the visa, not a separate thing to hold, and a driver crossing both ways
    // adds a second visa rather than answering a second question.
    const visaFor = countries.filter(isTravelCountry);
    if (p.citizenship && !isBorderCitizen(p) && visaFor.length) {
        push({
            key: 'visa', recordId: 'visa', country: '', group: 'visa',
            title: 'Visa', question: 'Holds an entry visa', gated: true,
            countryChoices: visaFor,
            reason: visaFor.length > 1
                ? `Permission to enter ${visaFor.join(' or ')} — add one for each.`
                : `Permission to enter ${visaFor[0]}.`,
        });
    }

    // 4 — the optional cards, where the driver's roads make them possible at all.
    for (const c of TRAVEL_CREDENTIALS) {
        if (!c.requires.every(r => countries.includes(r))) continue;
        push({
            key: blockKey(c.recordId, c.country), recordId: c.recordId, country: c.country, group: 'credentials',
            title: nameOf(c.recordId), question: nameOf(c.recordId), gated: true, reason: c.reason,
        });
    }
    return out;
}

/**
 * Every block the section could ever ask for — used to place the documents from a saved
 * application, which may have been filled in under answers that have since changed.
 *
 * A citizen of neither country running both sides is asked the most, so walking every status
 * of every country for that driver reaches every block that can exist.
 */
export const allTravelBlocks = (): TravelBlock[] => {
    const both = [...TRAVEL_COUNTRIES];
    const out = new Map<string, TravelBlock>();
    for (const country of both) {
        for (const o of travelStatusOptions(country)) {
            const p: TravelProfile = { citizenship: 'Third country', authorization: { [country]: o.id } };
            for (const b of visibleTravelBlocks(p, both)) out.set(b.key, b);
        }
    }
    return [...out.values()];
};

/** True for a block the driver has ticked (or one that is not behind a tick-box at all). */
export const blockAsked = (p: TravelProfile, b: TravelBlock): boolean =>
    !b.gated || (p.holds ?? []).includes(b.key);

/** The blocks actually being filled in — ticked, or never gated to begin with. */
export const askedTravelBlocks = (p: TravelProfile, countries: readonly string[]): TravelBlock[] =>
    visibleTravelBlocks(p, countries).filter(b => blockAsked(p, b));

/**
 * The travel / immigration records the application can ask about.
 * Passport first (everyone has one), then the permissions a status calls for, then the visa,
 * and last the border cards a driver may simply carry.
 */
export const TRAVEL_DOC_RECORD_IDS = ['passport', 'visa', 'work-permit', 'green-card', 'pr-documents', 'twic', 'fast-card'] as const;
export type TravelDocRecordId = typeof TRAVEL_DOC_RECORD_IDS[number];

/** Year / month / day as the application form holds it (three selects). */
export interface TravelDate { m: string; d: string; y: string }
const emptyTravelDate = (): TravelDate => ({ m: '', d: '', y: '' });

/** One travel document as captured on the application. */
export interface TravelDocCapture {
    /** Stable id, so a card keeps its inputs when the one above it is deleted. */
    id: string;
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

/** Every document captured, keyed by BLOCK key — a list per block, newest last. */
export type TravelDocs = Record<string, TravelDocCapture[]>;

/** The catalog records behind the section — silently skipping any that has been removed. */
export function travelDocRecords(): SafetyRecord[] {
    return TRAVEL_DOC_RECORD_IDS
        .map(id => SAFETY_RECORDS.find(r => r.id === id))
        .filter((r): r is SafetyRecord => !!r);
}

export const travelRecordFor = (key: string): SafetyRecord | undefined =>
    SAFETY_RECORDS.find(r => r.id === recordIdForKey(key));

let seq = 0;
const newId = () => `td-${Date.now().toString(36)}-${(seq++).toString(36)}`;

/**
 * What a new capture is called: the record's own name, made distinct where a driver hands
 * over more than one of the same thing — a US work permit beside a Canadian one, a renewed
 * visa beside the one it replaces. Two compliance records under one name are indistinguishable
 * in a list, which is the whole reason the name is captured at all.
 */
export function travelDocLabel(record: SafetyRecord, country: string, index: number): string {
    const base = defaultVersionLabel(record);
    const named = country && country !== record.defaultCountry ? `${base} — ${country}` : base;
    return index === 0 ? named : `${named} (${index + 1})`;
}

/** A blank capture for one block, with the country it is for already filled in. */
export function emptyTravelDoc(record: SafetyRecord, country = '', index = 0): TravelDocCapture {
    return {
        id: newId(),
        label: travelDocLabel(record, country, index),
        number: '',
        country: record.defaultCountry ?? (record.hideCountry ? '' : country),
        issue: emptyTravelDate(),
        expiry: emptyTravelDate(),
        doc: '',
        fields: {},
        // Enabled and counting back from the document's expiry, which is what these all are.
        monitoring: { ...defaultMonitoring(), enabled: true, basis: 'expiry' },
    };
}

/** A blank capture for a block, resolving its record itself. */
export function emptyTravelDocFor(block: TravelBlock, index = 0): TravelDocCapture | null {
    const record = travelRecordFor(block.recordId);
    return record ? emptyTravelDoc(record, block.country, index) : null;
}

/**
 * The captures on one block — at least one, so a block always shows a form to fill in
 * without anything having to be written to state before the driver types.
 *
 * That placeholder is rebuilt on every render until it IS typed into, so its id has to be
 * derived from the block rather than generated: a fresh id each time would give React a new
 * card each time, and the cursor would jump out of the field being filled in.
 */
export function travelDocsFor(docs: TravelDocs, block: TravelBlock): TravelDocCapture[] {
    const list = docs[block.key];
    if (list?.length) return list;
    const blank = emptyTravelDocFor(block);
    return blank ? [{ ...blank, id: `${block.key}#1` }] : [];
}

export const emptyTravelDocs = (): TravelDocs => ({});

/**
 * Drop the documents behind questions that are no longer being asked.
 *
 * Changing an answer changes which documents the form shows, and anything the old answer
 * opened has to go with it: a green card captured under "Permanent Resident" would otherwise
 * still be sitting in the data when the answer says "Work Permit", and would still be filed
 * as that driver's record. Only keys that WERE visible are removed — data from a saved
 * application that this form is not currently showing is left exactly where it is.
 */
export function syncTravelDocs(docs: TravelDocs, before: TravelBlock[], after: TravelBlock[]): TravelDocs {
    const keep = new Set(after.map(b => b.key));
    const drop = before.filter(b => !keep.has(b.key)).map(b => b.key);
    if (!drop.some(k => docs[k])) return docs;
    const out = { ...docs };
    for (const k of drop) delete out[k];
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
 * kept so nothing downstream had to change to gain the catalog-driven form. The FIRST
 * capture of each stands for the driver's current one.
 */
export function legacyTravelShape(docs: TravelDocs) {
    const at = (id: string): TravelDocCapture | undefined => {
        for (const [key, list] of Object.entries(docs)) {
            if (recordIdForKey(key) === id && list?.length) return list[0];
        }
        return undefined;
    };
    const p = at('passport'), v = at('visa'), w = at('work-permit');
    const held = (c: TravelDocCapture | undefined) => (c ? 'Yes' : 'No');
    return {
        passport: { number: p?.number ?? '', country: p?.country ?? '', expiry: p?.expiry ?? emptyTravelDate(), doc: p?.doc ?? '' },
        visa: {
            has: held(v), number: v?.number ?? '', type: v?.fields?.visaType ?? '',
            expiry: v?.expiry ?? emptyTravelDate(), doc: v?.doc ?? '',
            monitor: v?.monitoring?.enabled ?? true, reminderDays: v?.monitoring?.reminders ?? [90, 60, 30],
        },
        workPermit: {
            has: held(w), number: w?.number ?? '', type: w?.fields?.permitType ?? '',
            expiry: w?.expiry ?? emptyTravelDate(), doc: w?.doc ?? '',
            monitor: w?.monitoring?.enabled ?? true, reminderDays: w?.monitoring?.reminders ?? [90, 60, 30],
        },
    };
}

/** One travel document as applications used to save it — a single capture per record id. */
type SavedCapture = Partial<TravelDocCapture> & { has?: string };

/** What an application was saved with, in any of the shapes it has had. */
interface LegacyTravelSource {
    travelProfile?: TravelProfile;
    travelDocs?: Record<string, SavedCapture | SavedCapture[]>;
    passport?: { number?: string; country?: string; expiry?: TravelDate; doc?: string };
    visa?: { has?: string; number?: string; type?: string; expiry?: TravelDate; doc?: string; monitor?: boolean; reminderDays?: number[] };
    workPermit?: { has?: string; number?: string; type?: string; expiry?: TravelDate; doc?: string; monitor?: boolean; reminderDays?: number[] };
}

/** Fill in whatever a saved capture did not carry, so every entry is well-formed. */
function restoreCapture(record: SafetyRecord, saved: SavedCapture, country: string, index: number): TravelDocCapture {
    const blank = emptyTravelDoc(record, country, index);
    return {
        ...blank,
        ...saved,
        id: saved.id || blank.id,
        label: saved.label || blank.label,
        country: saved.country || blank.country,
        fields: { ...(saved.fields ?? {}) },
        monitoring: { ...blank.monitoring, ...(saved.monitoring ?? {}) },
    };
}

/**
 * Pre-fill the section from a saved application, in whichever shape it was saved.
 *
 * Three shapes exist: one capture per record id (the catalog-driven form's first version),
 * the three hardcoded passport / visa / work-permit blocks before that, and the current
 * per-block lists. An older application has to open with its documents in place — a driver
 * being re-opened for editing should not find their passport gone — so each is read across,
 * and a document whose question is behind a tick-box arrives ticked.
 */
export function travelDocsFromApplication(
    src: LegacyTravelSource | undefined, fallbackCountry = '',
): { docs: TravelDocs; profile: TravelProfile } {
    const profile: TravelProfile = { ...emptyTravelProfile(), ...(src?.travelProfile ?? {}) };
    profile.authorization = { ...(src?.travelProfile?.authorization ?? {}) };
    const docs: TravelDocs = {};
    if (!src) return { docs, profile };
    const blocks = allTravelBlocks();
    const holds = new Set(profile.holds ?? []);

    /** Where a record's captures belong now: its own block, preferring the country it names. */
    const blockFor = (recordId: string, country: string): TravelBlock | undefined =>
        blocks.find(b => b.recordId === recordId && b.country === country)
        ?? blocks.find(b => b.recordId === recordId && !b.country)
        ?? blocks.find(b => b.recordId === recordId);

    const put = (recordId: string, saved: SavedCapture[], country: string) => {
        const record = SAFETY_RECORDS.find(r => r.id === recordId);
        const block = blockFor(recordId, country);
        if (!record || !block) return;
        const list = saved.map((s, i) => restoreCapture(record, s, block.country || country, i))
            .filter(c => travelDocHasContent(record, c));
        if (!list.length) return;
        docs[block.key] = [...(docs[block.key] ?? []), ...list];
        // A document that IS there answers its own question — otherwise it would be filed
        // under a box the form shows as unticked.
        if (block.gated) holds.add(block.key);
    };

    if (src.travelDocs) {
        for (const [key, saved] of Object.entries(src.travelDocs)) {
            const list = Array.isArray(saved) ? saved : [saved];
            // Saved by the current form: already keyed by block, so it is kept as it is.
            if (Array.isArray(saved) && key.includes('@')) {
                const record = travelRecordFor(key);
                const block = blocks.find(b => b.key === key);
                if (!record) continue;
                const kept = list.map((s, i) => restoreCapture(record, s, block?.country ?? '', i));
                if (kept.length) {
                    docs[key] = kept;
                    if (block?.gated) holds.add(key);
                }
                continue;
            }
            // A single capture per record id: only 'Yes' ever meant anything was captured.
            const answered = list.filter(s => !('has' in s) || s.has !== 'No');
            put(recordIdForKey(key), answered, (list[0]?.country as string) || '');
        }
        profile.holds = [...holds];
        return { docs, profile };
    }

    // The three hardcoded blocks, from before the section was catalog-driven.
    const carry = (recordId: string, from: LegacyTravelSource['visa'], typeKey?: string) => {
        if (!from) return;
        const monitoring = { ...defaultMonitoring(), enabled: from.monitor ?? true, basis: 'expiry' as const, reminders: from.reminderDays ?? [90, 60, 30] };
        put(recordId, [{
            number: from.number ?? '',
            country: (from as { country?: string }).country || fallbackCountry,
            expiry: from.expiry, doc: from.doc ?? '',
            fields: typeKey && from.type ? { [typeKey]: from.type } : {},
            monitoring,
        }], (from as { country?: string }).country || '');
    };
    carry('passport', src.passport as LegacyTravelSource['visa']);
    carry('visa', src.visa?.has === 'No' ? undefined : src.visa, 'visaType');
    carry('work-permit', src.workPermit?.has === 'No' ? undefined : src.workPermit, 'permitType');
    profile.holds = [...holds];
    return { docs, profile };
}

/**
 * File every captured travel document as the driver's compliance record. Called once the
 * driver has an id — on Add Driver that is only after the roster assigns one.
 *
 * Driven by the captures rather than by the questions: what the form is holding IS what the
 * driver handed over, because changing an answer takes its documents with it (`syncTravelDocs`).
 * Every capture becomes its own version, so a driver with two work permits gets two records.
 *
 * Returns the record names written, for the confirmation the user sees. Existing versions are
 * kept: this prepends, so re-saving an edited driver files the newer document over the older
 * one rather than replacing history.
 */
export function commitTravelDocs(
    accountId: string | undefined, subjectId: string,
    docs: TravelDocs | undefined, capturedBy?: string,
): string[] {
    if (!subjectId || !docs) return [];
    const written: string[] = [];
    // In catalog order, so the confirmation reads the same way the form did.
    const keys = Object.keys(docs).sort((a, b) =>
        TRAVEL_DOC_RECORD_IDS.indexOf(recordIdForKey(a) as TravelDocRecordId)
        - TRAVEL_DOC_RECORD_IDS.indexOf(recordIdForKey(b) as TravelDocRecordId));
    for (const key of keys) {
        const record = travelRecordFor(key);
        if (!record) continue;
        // Oldest first: each write goes in at the TOP of the record's history, so filing the
        // driver's first card last leaves it where it belongs — as the current document.
        for (const capture of [...(docs[key] ?? [])].reverse()) {
            const version = travelDocVersion(record, capture, capturedBy);
            if (!version) continue;
            writeComplianceVersion(accountId, subjectId, record.id, version);
            written.push(version.label);
        }
    }
    return written;
}
