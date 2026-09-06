import { useEffect, useState } from 'react';
import { SAFETY_RECORDS, recordFields, fieldPool, defaultVersionLabel, type SafetyRecord, type EntityId } from '@/pages/compliance/safety-software-catalog.data';
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

/** A blank version with the record's own catalog defaults applied — today only the
 *  pre-selected country of a jurisdiction-fixed record (a US-federal report), but this is
 *  where any future per-record default belongs. */
export function blankVersion(record: SafetyRecord, label: string): DocVersion {
    const v = newVersion(label);
    if (record.defaultCountry) v.country = record.defaultCountry;
    return v;
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
const MIGRATION_KEY = 'compliance-data-catalog-v24';

/** Deterministic pick so a migrated version keeps the same value on every reload. */
function pickFor(seed: string, options: string[]): string {
    let h = 0;
    for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return options[h % options.length] ?? '';
}

function migrateVersion(r: SafetyRecord | undefined, v: DocVersion): DocVersion | null {
    let next: DocVersion | null = null;
    const patch = (p: Partial<DocVersion>) => { next = { ...(next ?? v), ...p }; };
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
    // A record with a fixed jurisdiction fills its country in rather than leaving it blank.
    if (r.defaultCountry && !(next ?? v).country) patch({ country: r.defaultCountry });
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
        const pool = fieldPool(f);
        if (pool.length && !(next ?? v).fields?.[f.key]) {
            patch({ fields: { ...((next ?? v).fields ?? {}), [f.key]: pickFor(f.kind === 'date' ? v.id : v.id + f.key, pool) } });
        }
    }
    // Monitoring the record no longer offers must not stay switched on — it would keep
    // firing alerts from a config the form can no longer reach.
    if (r.hideMonitoring && (next ?? v).monitoring?.enabled) patch({ monitoring: { ...(next ?? v).monitoring, enabled: false } });
    // "Record 2026" → "Driver License 2026" for records now named after themselves, and the
    // same for records already named after a PREVIOUS name of the record (a rename would
    // otherwise leave a list mixing both). Built from defaultVersionLabel so the migrated
    // name is exactly what a new record would be given today.
    if (r.nameFromRecord || r.versionName) {
        const label = (next ?? v).label.trim();
        const stale = ['Record', r.versionRenamedFrom].filter(Boolean) as string[];
        for (const from of stale) {
            const m = new RegExp(`^${from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d{4})?$`, 'i').exec(label);
            if (m) { patch({ label: defaultVersionLabel(r, m[1]) }); break; }
        }
    }
    return next;
}

function migrateStore(): void {
    if (typeof window === 'undefined') return;
    try {
        if (localStorage.getItem(MIGRATION_KEY)) return;
        const all = loadAll();
        let changed = false;
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

    // Compliance-only records (type C, no document) are complete once the number is captured.
    if (r.type === 'C' || r.docRequirement === 'none') {
        return hasNumber ? 'complete' : (r.docRequirement === 'optional' ? 'optional' : 'missing');
    }
    // Document-bearing records are driven by the uploaded document.
    if (r.docRequirement === 'required') return hasDoc ? 'complete' : 'missing';
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
