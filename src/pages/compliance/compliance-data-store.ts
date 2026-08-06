import { useEffect, useState } from 'react';
import type { SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';

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
