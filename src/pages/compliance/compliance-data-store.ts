import { useEffect, useState } from 'react';
import { SAFETY_RECORDS, type SafetyRecord, type EntityId } from '@/pages/compliance/safety-software-catalog.data';
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
    files: DataDocFile[];
    monitoring: MonitoringConfig;
    uploadedAt: string;  // ISO
    uploadedBy?: string; // name of the person who captured/uploaded this version
    state?: string;      // lifecycle state override: current | historical | superseded | cancelled | expired | pending (unset → derived from position)
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

export function currentVersion(entry: RecordDataEntry): DocVersion | null {
    return entry.versions[0] ?? null;
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

/** Current (newest) version of a specific instance. */
export function instanceCurrent(inst: DocInstance): DocVersion | null {
    return inst.versions[0] ?? null;
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
