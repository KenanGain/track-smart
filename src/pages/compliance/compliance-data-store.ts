import { useEffect, useState } from 'react';
import { SAFETY_RECORDS, recordFields, fieldPool, defaultVersionLabel, isDateMonitored, statesForRecord, recordForFields, pruneRecordFields, strandedFieldKeys, isAutoVersionLabel, type SafetyRecord, type EntityId } from '@/pages/compliance/safety-software-catalog.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { getAccountById } from '@/pages/accounts/accounts.data';

/**
 * Per-carrier / per-subject DATA layer for the "Default Compliances & Documents" page.
 *
 * The system-default catalog (`SAFETY_RECORDS`) defines WHICH records exist and how they
 * behave. This store holds the ACTUAL captured values + uploaded files, scoped by:
 *   accountId  — the carrier selected in the top CarrierSwitcher
 *   subjectId  — the specific subject the record belongs to:
 *                  Carrier records → '__carrier__'
 *                  Asset records   → the asset id
 *                  Driver records  → the driver id
 *   recordId   — the catalog record id
 *
 * Each entry holds an array of dated VERSIONS (newest first = current), so recurring /
 * event documents keep their history. Same localStorage + CustomEvent pattern as
 * inventory-store.ts. Persistence is best-effort (try/catch) — large base64 files may
 * exceed quota, which is acceptable for the prototype.
 */

export const CARRIER_SUBJECT = '__carrier__';

export interface DataDocFile {
    name: string;
    size: number;
    /** Data URL (base64) so "View" keeps working after reload. */
    url?: string;
    /** Optional slot label (e.g. "Front of License"). */
    slot?: string;
    /** Optional free-text tag for an extra supporting document on the same record (e.g. "Endorsement", "Declaration page"). */
    tag?: string;
    uploadedAt: string; // ISO
}
 
/** What the monitoring alerts are driven by. */
export type MonitorBasis = 'issue' | 'expiry' | 'custom' | 'status';

/** Per-version monitoring/notification config (inline in the version card + row bell action). */
export interface MonitoringConfig {
    enabled: boolean;
    basis: MonitorBasis;
    customDate: string;  // YYYY-MM-DD, used when basis === 'custom'
    recurrence: string;  // renewal cadence id (see RECURRENCE_OPTIONS on the page)
    reminders: number[]; // days before the monitored date
    channels: { email: boolean; inApp: boolean };
    /** Who this alert is assigned to — a platform user (id) or a free-typed name (id "other:<name>"). Undefined = unassigned. */
    assignee?: { id: string; name: string };
}

export function defaultMonitoring(): MonitoringConfig {
    return { enabled: false, basis: 'expiry', customDate: '', recurrence: 'annually', reminders: [90, 60, 30], channels: { email: true, inApp: true } };
}

export interface DocVersion {
    id: string;
    label: string;
    numberValue: string;
    country: string;
    stateProv: string;
    issueDate: string;   // YYYY-MM-DD
    expiryDate: string;  // YYYY-MM-DD (the monitored date)
    status: string;      // the monitored status value (status-based records)
    notes: string;
    tags: string[];
    /** Values for the record's extra select fields (`SafetyRecord.selectFields`), keyed by field key. */
    fields?: Record<string, string>;
    files: DataDocFile[];
    monitoring: MonitoringConfig;
    uploadedAt: string;  // ISO
    uploadedBy?: string; // name of the person who captured/uploaded this version
    /** Pinned as THE current record. Unset on every version → the newest one is current.
     *  Only one version in a list carries it; the save paths clear it from the others. */
    isCurrent?: boolean;
    /**
     * The id of the record on ANOTHER page that this version came from — the ticket, accident,
     * HOS violation or safety event a warning letter was issued on. Set when a review files
     * the record; a version typed in by hand has none. Read by fields that declare a
     * `sourceLink`, which turn their value into a link that opens exactly that record.
     */
    sourceRecordId?: string;
    // Insurance-only fields (multi-instance records).
    producer?: string;    // broker / producer of record
    insurer?: string;     // insurance carrier
    policyLimit?: string; // coverage limit, e.g. "$1,000,000"
}

/**
 * A single concurrent "instance" of a multi-instance record — e.g. one insurance policy.
 * Each instance is independently active and keeps its OWN dated version history
 * (versions[0] = that policy's current document).
 */
export interface DocInstance {
    id: string;
    name: string;            // policy / item name, e.g. "Liability — State Farm"
    versions: DocVersion[];  // versions[0] === this instance's current
}

    export interface RecordDataEntry {
        versions: DocVersion[];      // single-current records — versions[0] === current (newest)
        instances?: DocInstance[];   // multi-instance records (e.g. Insurance) — many concurrent policies
    }

    export function emptyEntry(): RecordDataEntry {
        return { versions: [] };
}

/** The record being monitored: whichever version is pinned, else the newest. */
export function currentVersion(entry: RecordDataEntry): DocVersion | null {
    return entry.versions.find(v => v.isCurrent) ?? entry.versions[0] ?? null;
}

export function newInstance(name: string): DocInstance {
    return { id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name, versions: [] };
}

/** One uploaded document surfaced in the "Add from app" picker. */
export interface AppDocument {
    name: string;      // file name (the shareable unit)
    entity: EntityId;  // Carrier | Asset | Driver — which side of the fleet it belongs to
    subjectId: string; // subject id (carrier '__carrier__' / asset id / driver id) — for drill-down
    subject: string;   // carrier name / asset unit / driver name
    recordId: string;  // catalog record id — for the record drill level
    record: string;    // human record name, e.g. "CVOR Certificate"
    url?: string;      // data URL (base64) when present → lets "View" preview it
}

const RECORD_BY_ID = new Map(SAFETY_RECORDS.map(r => [r.id, r] as const));

/**
 * Every uploaded document currently stored in the app — feeds the "Add from app" picker in
 * ShareToChat so a user can attach a document that already lives in the system instead of
 * re-uploading it. Each key is `${accountId}::${subjectId}::${recordId}`, so we resolve the
 * real record name (catalog), the entity (Carrier/Asset/Driver), and the subject label
 * (carrier / asset unit / driver name). Deduped by subject + file name.
 */
export function listAppDocuments(): AppDocument[] {
    const all = loadAll();
    // Per-account lookups, resolved once and cached across keys.
    const assetCache = new Map<string, Map<string, string>>();
    const driverCache = new Map<string, Map<string, string>>();
    const carrierCache = new Map<string, string>();
    const subjectsFor = (acct: string) => {
        if (!assetCache.has(acct)) {
            try { assetCache.set(acct, new Map(getAssetsForAccount(acct).map(a => [a.id, a.unitNumber]))); }
            catch { assetCache.set(acct, new Map()); }
        }
        if (!driverCache.has(acct)) {
            try { driverCache.set(acct, new Map(getDriversForAccount(acct).map(d => [d.id, d.name]))); }
            catch { driverCache.set(acct, new Map()); }
        }
        if (!carrierCache.has(acct)) {
            let label = 'Carrier';
            try { const a = getAccountById(acct); if (a) label = a.dbaName || a.legalName || 'Carrier'; } catch { /* ignore */ }
            carrierCache.set(acct, label);
        }
        return { assets: assetCache.get(acct)!, drivers: driverCache.get(acct)!, carrier: carrierCache.get(acct)! };
    };

    const seen = new Set<string>();
    const out: AppDocument[] = [];
    for (const [key, entry] of Object.entries(all)) {
        const [acct, subjectId, recordId] = key.split('::');
        if (!acct || !subjectId || !recordId) continue;
        const rec = RECORD_BY_ID.get(recordId);
        const { assets, drivers, carrier } = subjectsFor(acct);
        const entity: EntityId = rec?.entity
            ?? (subjectId === CARRIER_SUBJECT ? 'Carrier' : assets.has(subjectId) ? 'Asset' : drivers.has(subjectId) ? 'Driver' : 'Carrier');
        const record = rec?.recordName ?? recordId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const subject = entity === 'Carrier' ? carrier : (assets.get(subjectId) ?? drivers.get(subjectId) ?? subjectId);
        const versions = [
            ...(entry.versions ?? []),
            ...((entry.instances ?? []).flatMap(i => i.versions ?? [])),
        ];
        for (const v of versions) {
            for (const f of (v.files ?? [])) {
                if (!f?.name) continue;
                const dk = `${subjectId}::${f.name}`;
                if (seen.has(dk)) continue;
                seen.add(dk);
                out.push({ name: f.name, entity, subjectId, subject, recordId, record, url: f.url });
            }
        }
    }
    return out;
}

/** Every concurrent instance of a multi-instance record (empty for single-current records). */
export function instancesOf(entry: RecordDataEntry): DocInstance[] {
    return entry.instances ?? [];
}

/** Current version of a specific instance — pinned if one is, else the newest. */
export function instanceCurrent(inst: DocInstance): DocVersion | null {
    return inst.versions.find(v => v.isCurrent) ?? inst.versions[0] ?? null;
}

export function newVersion(label: string): DocVersion {
    // App runtime — Date.now()/Math.random() are available here (unlike workflow scripts).
    return {
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        label,
        numberValue: '',
        country: '',
        stateProv: '',
        issueDate: '',
        expiryDate: '',
        status: '',
        notes: '',
        tags: [],
        files: [],
        monitoring: defaultMonitoring(),
        uploadedAt: new Date().toISOString(),
    };
}

/**
 * A record's fixed renewal day ('MM-DD') as a real date: the next one that has not passed.
 *
 * Filed in January, a KYU licence runs to this 31 December; filed on New Year's Eve, to the
 * next. Taking the current year unconditionally would hand the user a date already behind
 * them — a permit that arrives on the monitoring dashboard overdue on the day it is captured.
 */
export function fixedDateFor(mmdd: string, today = new Date()): string {
    const y = today.getFullYear();
    const iso = `${y}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return `${y}-${mmdd}` >= iso ? `${y}-${mmdd}` : `${y + 1}-${mmdd}`;
}

/** A blank version with the record's own catalog defaults applied — the pre-selected
 *  jurisdiction of a record only one state can issue, and the fixed date a permit always
 *  falls due on. Starting values only: every one of them is an ordinary editable field. */
export function blankVersion(record: SafetyRecord, label: string): DocVersion {
    const v = newVersion(label);
    if (record.defaultCountry) v.country = record.defaultCountry;
    // Only alongside its country: the province list is derived from the country above it, so a
    // province set on its own would be a value the form cannot show.
    if (record.defaultStateProv && v.country) v.stateProv = record.defaultStateProv;
    // Only where there is a date to hold it — a record monitored on a status has no expiry
    // field to show it in, so the value would sit in the data unreachable.
    if (record.defaultExpiry && isDateMonitored(record)) v.expiryDate = fixedDateFor(record.defaultExpiry);
    return v;
}

/**
 * Writing ONE of a record's own fields — and everything that answer settles.
 *
 * Some fields are not a detail of the record, they are what the record IS, and the rest
 * follows from them: choosing NIR names the certificate NIR and makes it Québec's; choosing
 * Articles of Incorporation says this document has an issue date, no expiry and nothing to
 * alert on. Those are not separate answers the user should have to give again.
 *
 * The half that is easy to forget is what the OLD answer left behind. A field or a date the
 * new kind does not have stays in the data unless it is cleared — invisible in the form, still
 * read by the list columns and by monitoring, so an incorporation certificate would sit on the
 * dashboard as expiring on a date inherited from a business licence, with nowhere to correct
 * it. Anything the user typed themselves — the record's name — is never overwritten.
 *
 * Returns just the patch, so every form that edits a version applies the same rules.
 */
export function fieldWritePatch(base: SafetyRecord, v: DocVersion, key: string, val: string): Partial<DocVersion> {
    const fields = { ...(v.fields ?? {}), [key]: val };
    const next: Partial<DocVersion> = { fields };
    const rec = recordForFields(base, fields);
    if (base.nameFromField === key && val && isAutoVersionLabel(base, v.label)) next.label = val;
    if (base.variantByField?.from === key) {
        next.fields = pruneRecordFields(rec, fields);
        if (!rec.tracksIssueDate) next.issueDate = '';
        if (!isDateMonitored(rec)) next.expiryDate = '';
        const hadMonitoring = !recordForFields(base, v.fields).hideMonitoring;
        next.monitoring = {
            ...v.monitoring,
            // Armed by the new kind's own default when there was no alert to speak of before;
            // a choice the user has already made about a monitored kind is left standing.
            enabled: rec.hideMonitoring ? false : hadMonitoring ? v.monitoring.enabled : !!rec.monitorByDefault,
            // A basis the new kind cannot resolve points the alert at no date at all.
            basis: !isDateMonitored(rec) ? 'status'
                : (v.monitoring.basis === 'status' || (v.monitoring.basis === 'issue' && !rec.tracksIssueDate)) ? 'expiry'
                : v.monitoring.basis,
        };
    }
    if (base.stateByField?.from === key) {
        const allowed = statesForRecord(base, fields);
        next.stateProv = allowed?.length === 1 ? allowed[0]
            : (allowed && !allowed.includes(v.stateProv)) ? '' : v.stateProv;
        if (next.stateProv && !v.country && base.defaultCountry) next.country = base.defaultCountry;
    }
    // Un-ticking an answer takes whatever hung off it. Leaving the value behind means the
    // record still carries a non-owned-trailer limit for cover it no longer claims, and the
    // figure silently reappears the next time the box is ticked — a number nobody re-checked.
    const stranded = strandedFieldKeys(rec, next.fields ?? fields);
    if (stranded.length) {
        const cleaned = { ...(next.fields ?? fields) };
        for (const k of stranded) delete cleaned[k];
        next.fields = cleaned;
    }
    return next;
}

type Store = Record<string, RecordDataEntry>; // `${accountId}::${subjectId}::${recordId}` -> entry

const KEY = 'compliance-data-v3';
const EVENT = 'compliance-data-change';

function loadAll(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}

function persist(all: Store) {
    try {
        localStorage.setItem(KEY, JSON.stringify(all));
    } catch { /* quota — best-effort for prototype */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

// ── Catalog migration ─────────────────────────────────────────────────────────
// Records already captured in the browser were stored under the FIELD RULES the
// catalog had at the time. When a record's rules change — a jurisdiction field is
// dropped, its status gains its own value set, a new select field appears — the
// stored versions still carry the old shape and would read wrong on the page.
// This normalizes them once against the current catalog, so it also covers any
// future rule change without another migration.
// Bump this (not KEY) whenever the catalog's field rules change again — bumping KEY would
// discard every record the user has captured.
const MIGRATION_KEY = 'compliance-data-catalog-v49';

/** Deterministic pick so a migrated version keeps the same value on every reload. */
function pickFor(seed: string, options: string[]): string {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return options[h % options.length] ?? '';
}

function migrateVersion(base: SafetyRecord | undefined, v: DocVersion): DocVersion | null {
    let next: DocVersion | null = null;
    const patch = (p: Partial<DocVersion>) => { next = { ...(next ?? v), ...p }; };
    // A record holding several KINDS of document is read as the kind THIS version is: which
    // dates it has, what its number is called and whether it has an alert at all differ per
    // kind, so every rule below has to ask the variant, not the record. Resolved from the
    // stored type — never guessed: a version with no type chosen is exactly that, and stamping
    // one on it would invent what document a carrier filed.
    const r = base ? recordForFields(base, v.fields) : base;
    // The old free-form lifecycle value (current | historical | superseded | …) is gone:
    // a record is either the pinned current one or history. Anything that was explicitly
    // "current" becomes the pin; every other value falls back to position.
    const legacy = (v as DocVersion & { state?: string }).state;
    if (legacy !== undefined) {
        patch({ isCurrent: legacy === 'current' ? true : undefined });
        delete (next as unknown as { state?: string }).state;
    }
    if (!r) return next;
    // Jurisdiction fields the record no longer shows would otherwise stay in the data.
    if (r.hideCountry && ((next ?? v).country || (next ?? v).stateProv)) patch({ country: '', stateProv: '' });
    else if (r.hideState && (next ?? v).stateProv) patch({ stateProv: '' });
    // A country the record's list no longer offers is a value the select cannot show: the field
    // reads blank, and saving the form would write the blank back anyway. Cleared so it is
    // asked again, along with the province, which is derived from whatever country is chosen.
    if (r.countries?.length && (next ?? v).country && !r.countries.includes((next ?? v).country)) {
        patch({ country: '', stateProv: '' });
    }
    // A record with a fixed jurisdiction fills its country in rather than leaving it blank —
    // and its province too, where the record is issued by exactly one.
    if (r.defaultCountry && !(next ?? v).country) patch({ country: r.defaultCountry });
    if (r.defaultStateProv && (next ?? v).country === r.defaultCountry && !(next ?? v).stateProv) {
        patch({ stateProv: r.defaultStateProv });
    }
    // A status the record no longer captures would keep showing in the list column.
    if (r.hideStatus && (next ?? v).status) patch({ status: '' });
    // A status value from the old generic list is meaningless under the record's own set.
    if (r.statusOptions?.length) {
        const cur = (next ?? v).status;
        if (cur && !r.statusOptions.includes(cur)) patch({ status: r.statusOptions[0] });
    }
    // Fields added to a record after the fact start unanswered — give stored history a
    // plausible value so the new columns don't read as an empty grid. Date fields are seeded
    // off the version id ALONE, never the field key: every date field on the record then picks
    // the same entry of its matched pool, so a start date lands before its end date. Derived
    // fields have no pool — they are computed from those dates, never stored.
    for (const f of recordFields(r)) {
        // Never the field that says WHICH document this is: a plausible value for an unanswered
        // question is one thing, deciding on a carrier's behalf that their filing is a
        // certificate of incorporation is another.
        if (r.variantByField?.from === f.key) continue;
        if ((next ?? v).fields?.[f.key]) continue;
        // …unless the old record could only have meant one thing. A WSIB record was Ontario's
        // board, because that is all the record was, so its history takes that answer outright
        // rather than one sampled from a list that now also offers WCB.
        const prior = f.kind === 'select' ? f.priorValue : undefined;
        const pool = fieldPool(f);
        if (!prior && !pool.length) continue;
        patch({ fields: { ...((next ?? v).fields ?? {}), [f.key]: prior ?? pickFor(f.kind === 'date' ? v.id : v.id + f.key, pool) } });
    }
    // A record whose answer PINS its province — a WSIB is Ontario's board, and only Ontario's —
    // fills it in for the history too. Run after the loop above, because the answer it reads
    // may be the one that loop just seeded. Only where exactly one province is possible: where
    // the record narrows to several (a WCB), choosing between them is not the migration's call.
    if (r?.stateByField && !(next ?? v).stateProv) {
        const only = statesForRecord(r, (next ?? v).fields);
        if (only?.length === 1) {
            patch({ stateProv: only[0] });
            if (!(next ?? v).country && r.defaultCountry) patch({ country: r.defaultCountry });
        }
    }
    // Anything left over from a field, or a date, that THIS kind of document does not have.
    // Left in place it is worse than missing: the list columns and the record's facts still
    // read it, so it shows as current while being unreachable in the form — and an expiry date
    // stashed on a document that cannot expire puts the record on the monitoring dashboard as
    // expiring. Only records with variants are swept; nothing else changes shape per version.
    if (r.variantByField) {
        const pruned = pruneRecordFields(r, (next ?? v).fields);
        if (pruned !== (next ?? v).fields) patch({ fields: pruned });
    }
    // A field the record no longer declares AT ALL — one dropped from the catalog — is dead
    // weight: the form cannot show it, nothing can correct it, and it still turns up in the
    // list's search. Worse, re-using the key later would resurrect an answer nobody re-checked.
    // The companion key a money field stores its currency under is NOT a field of its own, so
    // it is kept deliberately — dropping it would leave an amount with no currency.
    {
        const stored = (next ?? v).fields;
        if (stored) {
            const declared = new Set<string>();
            for (const f of recordFields(r)) {
                declared.add(f.key);
                if (f.kind === 'text' && f.money) declared.add(f.money.currencyKey);
            }
            const kept = Object.entries(stored).filter(([k]) => declared.has(k));
            if (kept.length !== Object.keys(stored).length) patch({ fields: Object.fromEntries(kept) });
        }
    }
    // A DATE the record no longer has is the same problem as a field it no longer has, and it
    // is not confined to records with variants: a CSA authorization that stops being watched
    // still carries the review date someone typed while it was. Invisible in the form, still
    // read by the list's date column and by monitoring — a record sitting on the dashboard
    // expiring on a date with nowhere left to correct it.
    if (r && !r.tracksIssueDate && (next ?? v).issueDate) patch({ issueDate: '' });
    if (r && !isDateMonitored(r) && (next ?? v).expiryDate) patch({ expiryDate: '' });
    // Monitoring the record no longer offers must not stay switched on — it would keep
    // firing alerts from a config the form can no longer reach.
    if (r.hideMonitoring && (next ?? v).monitoring?.enabled) patch({ monitoring: { ...(next ?? v).monitoring, enabled: false } });
    // A record that used to watch a STATUS and now watches a date (CVOR Level 2 gaining a
    // renewal date) leaves stored configs pointed at 'status', which resolves to no date at
    // all: the alert stays switched on and never fires, and the basis picker shows nothing
    // selected. Repointed at whatever the record now monitors — and the reverse, since
    // 'expiry' on a record with no date to expire is the same silent no-op.
    {
        const mon = (next ?? v).monitoring;
        const dated = isDateMonitored(r);
        if (mon && dated && mon.basis === 'status') {
            patch({ monitoring: { ...mon, basis: (r.defaultMonitorBasis === 'issue' && r.tracksIssueDate) ? 'issue' : 'expiry' } });
        } else if (mon && !dated && mon.basis === 'expiry') {
            patch({ monitoring: { ...mon, basis: 'status' } });
        }
    }
    // "Record 2026" → "Driver License 2026" for records now named after themselves, and the
    // same for records already named after a PREVIOUS name of the record (a rename would
    // otherwise leave a list mixing both). Built from defaultVersionLabel so the migrated
    // name is exactly what a new record would be given today.
    // A second record filed in the same year is named "… (2)" to keep it distinct, so that
    // suffix has to survive the relabel — otherwise two records collapse onto one name, or
    // (worse) the suffixed one is left behind reading "Record 2026 (2)" beside its renamed
    // siblings. The year and the suffix are both carried across.
    if (r.nameFromRecord || r.versionName || r.nameFromField) {
        const label = (next ?? v).label.trim();
        // A record named after one of its own fields takes that field's value — a stored
        // "Record 2025" on a safety fitness certificate becomes "NSC 2025", not the record's
        // generic name, because the form it takes is what tells one of them from another.
        const fromField = r.nameFromField ? ((next ?? v).fields?.[r.nameFromField] ?? '').trim() : '';
        const stale = ['Record', r.versionRenamedFrom].filter(Boolean) as string[];
        for (const from of stale) {
            const m = new RegExp(`^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d{4})?(\\s*\\(\\d+\\))?$`, 'i').exec(label);
            if (m) {
                const base = fromField ? `${fromField}${m[1] ? ` ${m[1]}` : ''}` : defaultVersionLabel(r, m[1]);
                patch({ label: base + (m[2] ? ` ${m[2].trim()}` : '') });
                break;
            }
        }
    }
    return next;
}

/**
 * Records that were FOLDED INTO another one, and what they become there.
 *
 * The Québec NIR and Ontario's CVOR Level 2 are now two forms of the one Safety Fitness
 * Certificate, chosen by its type field. Dropping them from the catalog alone would leave
 * every certificate a carrier has already filed sitting in storage under an id nothing reads —
 * present in the data, gone from the screen. So their entries are moved onto the surviving
 * record, stamped with the type (and the province) that says which form they were.
 */
const MERGED_RECORDS: Record<string, { into: string; fields: Record<string, string>; country: string; stateProv: string; wasNamed: string }> = {
    nir: { into: 'safety-fitness', fields: { certType: 'NIR' }, country: 'Canada', stateProv: 'Quebec', wasNamed: 'NIR Certificate' },
    'cvor-level-2': { into: 'safety-fitness', fields: { certType: 'CVOR Level 2' }, country: 'Canada', stateProv: 'Ontario', wasNamed: 'CVOR Level 2' },
    // The company's two founding papers, now the two types of one Company Documents record.
    // No jurisdiction is stamped: either can be registered federally or in any province, so
    // whatever was filed is what is kept.
    articles: { into: 'company-docs', fields: { docType: 'Articles of Incorporation' }, country: '', stateProv: '', wasNamed: 'Articles of Incorporation' },
    'operating-name': { into: 'company-docs', fields: { docType: 'Master Business License' }, country: '', stateProv: '', wasNamed: 'Operating Name Registration' },
};

/** Move one folded-in record's versions onto the record that absorbed it. */
function mergeFoldedRecords(all: Store): boolean {
    let moved = false;
    for (const [key, entry] of Object.entries(all)) {
        const [acct, subject, recordId] = key.split('::');
        const spec = MERGED_RECORDS[recordId ?? ''];
        if (!spec || !entry.versions?.length) continue;
        const target = `${acct}::${subject}::${spec.into}`;
        const rec = RECORD_BY_ID.get(spec.into);
        // Exactly one record in a list may be pinned as THE current one. A pin the user set is
        // kept where the destination has none — dropping it would silently un-choose their
        // choice — and dropped where it would make a second.
        let pinTaken = (all[target]?.versions ?? []).some(x => x.isCurrent);
        const stamped = entry.versions.map(v => {
            const keepPin = !!v.isCurrent && !pinTaken;
            if (keepPin) pinTaken = true;
            return {
                ...v,
                fields: { ...(v.fields ?? {}), ...spec.fields },
                country: v.country || spec.country,
                stateProv: v.stateProv || spec.stateProv,
                // Named after the form it was: a generic "Record 2026" or the old record's own
                // name becomes "NIR 2026" / "CVOR Level 2 2026". A typed name is kept.
                label: relabelMerged(v.label, spec, rec),
                isCurrent: keepPin || undefined,
            };
        });
        const existing = all[target]?.versions ?? [];
        all[target] = { ...(all[target] ?? {}), versions: [...existing, ...stamped].sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || '')) };
        delete all[key];
        moved = true;
    }
    return moved;
}

function relabelMerged(label: string, spec: { fields: Record<string, string>; wasNamed: string }, rec?: SafetyRecord): string {
    const name = Object.values(spec.fields)[0] ?? label;
    const auto = ['Record', spec.wasNamed, name, rec?.recordName].filter(Boolean) as string[];
    for (const from of auto) {
        const m = new RegExp(`^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d{4})?(\\s*\\(\\d+\\))?$`, 'i').exec(label.trim());
        if (m) return `${name}${m[1] ? ` ${m[1]}` : ''}${m[2] ? ` ${m[2].trim()}` : ''}`;
    }
    return label;
}

function migrateStore(): void {
    if (typeof window === 'undefined') return;
    try {
        if (localStorage.getItem(MIGRATION_KEY)) return;
        const all = loadAll();
        // Merges first: the moved versions then go through the same per-record rules below as
        // everything else, under the record that absorbed them.
        let changed = mergeFoldedRecords(all);
        // The two seeded demo custom records are gone from the catalog. Whatever was captured
        // against them is unreachable now — no record to open it under — so it goes with them
        // rather than sitting in storage forever.
        for (const key of Object.keys(all)) {
            if (/^[^:]+::[^:]+::custom-demo-[12]$/.test(key)) { delete all[key]; changed = true; }
        }
        for (const [key, entry] of Object.entries(all)) {
            // Every entry is visited: the lifecycle-value cleanup applies to all of them, and
            // migrateVersion applies the per-record rules only where the catalog defines them.
            const rec = RECORD_BY_ID.get(key.split('::')[2] ?? '');
            const mapVersions = (list: DocVersion[]) => list.map(v => migrateVersion(rec, v) ?? v);
            const versions = mapVersions(entry.versions ?? []);
            const instances = entry.instances?.map(i => ({ ...i, versions: mapVersions(i.versions ?? []) }));
            if (versions.some((v, i) => v !== entry.versions?.[i])
                || instances?.some((inst, i) => inst.versions.some((v, j) => v !== entry.instances?.[i]?.versions?.[j]))) {
                all[key] = instances ? { versions, instances } : { versions };
                changed = true;
            }
        }
        // A record whose province depends on one of its own fields: fill in the one the
        // stored type allows, so merged and pre-existing certificates read the same.
        for (const [key, entry] of Object.entries(all)) {
            const rec = RECORD_BY_ID.get(key.split('::')[2] ?? '');
            if (!rec?.stateByField) continue;
            const fixed = (entry.versions ?? []).map(v => {
                const allowed = statesForRecord(rec, v.fields);
                if (!allowed || (v.stateProv && allowed.includes(v.stateProv))) return v;
                return allowed.length === 1 ? { ...v, stateProv: allowed[0], country: v.country || rec.defaultCountry || '' } : { ...v, stateProv: '' };
            });
            if (fixed.some((v, i) => v !== entry.versions?.[i])) { all[key] = { ...entry, versions: fixed }; changed = true; }
        }
        if (changed) persist(all);
        localStorage.setItem(MIGRATION_KEY, '1');
    } catch { /* ignore — migration is best-effort */ }
}
migrateStore();

export function useComplianceData(accountId?: string) {
    const acct = accountId ?? 'acct-001';
    const [all, setAll] = useState<Store>(loadAll);
    useEffect(() => {
        const h = () => setAll(loadAll());
        window.addEventListener(EVENT, h);
        window.addEventListener('storage', h);
        return () => {
            window.removeEventListener(EVENT, h);
            window.removeEventListener('storage', h);
        };
    }, []);

    const keyOf = (subjectId: string, recordId: string) => `${acct}::${subjectId}::${recordId}`;
    const getEntry = (subjectId: string, recordId: string): RecordDataEntry =>
        all[keyOf(subjectId, recordId)] ?? emptyEntry();
    const setEntry = (subjectId: string, recordId: string, entry: RecordDataEntry) => {
        const cur = loadAll();
        persist({ ...cur, [keyOf(subjectId, recordId)]: entry });
    };
    // Batch write — one read + one persist + one event for many entries (used by "Load sample data" across every subject).
    const setEntries = (items: { subjectId: string; recordId: string; entry: RecordDataEntry }[]) => {
        if (!items.length) return;
        const next = { ...loadAll() };
        for (const it of items) next[keyOf(it.subjectId, it.recordId)] = it.entry;
        persist(next);
    };

    return { acct, all, getEntry, setEntry, setEntries };
}

/**
 * Prepend a version to ONE record entry without the hook — used when a document is
 * captured outside the compliance pages (e.g. a driver fills & uploads a compliance
 * request straight from a chat widget). Fires the same change event, so any open
 * compliance page picks it up immediately.
 */
export function writeComplianceVersion(
    accountId: string | undefined, subjectId: string, recordId: string, version: DocVersion,
): void {
    if (!subjectId || !recordId) return;
    const key = `${accountId ?? 'acct-001'}::${subjectId}::${recordId}`;
    const all = loadAll();
    const entry = all[key] ?? emptyEntry();
    persist({ ...all, [key]: { ...entry, versions: [version, ...entry.versions] } });
}

// ── Status + completeness ─────────────────────────────────────────────

export type DataStatus = 'complete' | 'missing' | 'optional';

export function entryStatus(r: SafetyRecord, entry: RecordDataEntry): DataStatus {
    // Multi-instance records (e.g. Insurance): complete once at least one active policy has a current document/number.
    if (r.multiInstance) {
        const insts = instancesOf(entry);
        const anyFilled = insts.some(i => {
            const c = instanceCurrent(i);
            return !!c && (c.files.length > 0 || c.numberValue.trim().length > 0);
        });
        if (r.docRequirement === 'optional') return anyFilled ? 'complete' : 'optional';
        return anyFilled ? 'complete' : 'missing';
    }

    const cur = currentVersion(entry);
    const hasDoc = !!cur && cur.files.length > 0;
    const hasNumber = !!cur && cur.numberValue.trim().length > 0;
    // Read as the kind this record actually IS: a non-bonded carrier code has no document, so
    // judging it against the record's union would mark a complete record missing for want of a
    // surety bond it does not carry. Records with one kind resolve to themselves.
    const kind = recordForFields(r, cur?.fields);

    // Compliance-only records (type C, no document) are complete once the number is captured.
    if (kind.type === 'C' || kind.docRequirement === 'none') {
        return hasNumber ? 'complete' : (kind.docRequirement === 'optional' ? 'optional' : 'missing');
    }
    // Document-bearing records are driven by the uploaded document.
    if (kind.docRequirement === 'required') return hasDoc ? 'complete' : 'missing';
    return hasDoc ? 'complete' : 'optional';
}

export interface DataStats {
    total: number;
    complete: number;
    requiredMissing: number;
    optionalPending: number;
    pct: number; // % of REQUIRED records that are complete
}

/** Roll up completion across a set of records, resolving each record's entry via `entryFor`. */
export function computeStats(records: SafetyRecord[], entryFor: (r: SafetyRecord) => RecordDataEntry): DataStats {
    let complete = 0, requiredMissing = 0, optionalPending = 0;
    for (const r of records) {
        const s = entryStatus(r, entryFor(r));
        if (s === 'complete') complete++;
        else if (s === 'missing') requiredMissing++;
        else optionalPending++;
    }
    const total = records.length;
    const required = complete + requiredMissing;
    const pct = required === 0 ? 100 : Math.round((complete / required) * 100);
    return { total, complete, requiredMissing, optionalPending, pct };
}
