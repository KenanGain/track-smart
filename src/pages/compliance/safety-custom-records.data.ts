import { useEffect, useState } from 'react';
import type { SafetyRecord, CustomFormConfig } from '@/pages/compliance/safety-software-catalog.data';

/**
 * User-created CUSTOM records for the "New Compliance & Documents" catalog.
 *
 * The system-default classification (`SAFETY_RECORDS`) is read-only. This store holds
 * extra records a carrier adds for their own documents / compliances (per Carrier, Asset
 * or Driver). They are merged into the Settings catalog AND surfaced on the Default
 * Compliances & Documents data page, where their data-entry form is defined by each
 * record's `customForm`.
 *
 * CARRIER-SCOPED: custom records belong to ONE carrier (account). The store is a map of
 * `accountId → SafetyRecord[]`, so switching the top carrier switcher re-scopes the list.
 *
 * Same localStorage + CustomEvent pattern as the other prototype stores.
 */

const KEY = 'safety-custom-records-v2';
/** Legacy global (non-carrier-scoped) store — records added before per-carrier scoping. */
const LEGACY_KEY = 'safety-custom-records-v1';
/** Tracks which accounts have already received the seed demos (so deletes stick). */
const SEEDED_KEY = 'safety-custom-records-seeded-v1';
const EVENT = 'safety-custom-records-change';
/** Bucket used when no carrier is selected (e.g. the page opened without an account). */
const NO_ACCOUNT = '_noacct';

export function newCustomRecordId(): string {
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

type Store = Record<string, SafetyRecord[]>;

// ── Demo custom records — seeded once per carrier so there's something to edit ────────
/** Monitoring / Tags / Notes are common to every record — always enabled. */
const COMMON = { monitoring: { enabled: true }, tags: { enabled: true }, notes: { enabled: true } };

const DEMO_1_FORM: CustomFormConfig = {
    numberField: { enabled: true, required: true },
    country: { enabled: true, required: false },
    state: { enabled: true, required: false },
    issueDate: { enabled: true, required: false },
    expiryDate: { enabled: true, required: true },
    status: { enabled: false, required: false },
    upload: { enabled: true, required: true, multi: false },
    ...COMMON,
};
const DEMO_2_FORM: CustomFormConfig = {
    numberField: { enabled: false, required: false },
    country: { enabled: true, required: false },
    state: { enabled: false, required: false },
    issueDate: { enabled: false, required: false },
    expiryDate: { enabled: true, required: true },
    status: { enabled: false, required: false },
    upload: { enabled: true, required: true, multi: true },
    ...COMMON,
};

const DEMO_RECORDS: SafetyRecord[] = [
    {
        id: 'custom-demo-1', recordName: 'Business License (Demo 1)',
        description: 'City / municipal business operating license',
        numberName: 'License Number', documentName: 'License Certificate',
        category: 'Other', entity: 'Carrier', type: 'DC', docRequirement: 'required',
        recurring: 'Custom', monitorType: 'Expiry date', tracksIssueDate: true, hideState: false,
        jurisdiction: '—', monitor: 'Custom record — monitored on the expiry date.',
        uploadMode: 'recurring', multiInstance: false, custom: true, customForm: DEMO_1_FORM,
    },
    {
        id: 'custom-demo-2', recordName: 'Insurance Certificates (Demo 2)',
        description: 'Fleet insurance certificates & endorsements',
        numberName: '', documentName: 'Insurance Document',
        category: 'Other', entity: 'Carrier', type: 'D', docRequirement: 'required',
        recurring: 'Custom', monitorType: 'Expiry date', tracksIssueDate: false, hideState: true,
        jurisdiction: '—', monitor: 'Custom record — monitored on the expiry date.',
        uploadMode: 'recurring', multiInstance: true, custom: true, customForm: DEMO_2_FORM,
    },
];

function loadStore(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}

/**
 * One-time carry-over: records added under the old global store are moved — verbatim, so
 * nothing the user already created is lost — into the current carrier's bucket, then the
 * legacy key is cleared so it never runs again. Records without a `customForm` keep working
 * (VersionFields falls back to the built-in field rules for them).
 */
let legacyMigrated = false;
function migrateLegacyInto(acct: string) {
    if (legacyMigrated || acct === NO_ACCOUNT) return;
    let legacy: SafetyRecord[] = [];
    try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (raw) legacy = JSON.parse(raw) as SafetyRecord[];
    } catch { /* ignore */ }
    if (legacy.length) {
        const store = loadStore();
        store[acct] = [...legacy.map(r => ({ ...r, custom: true })), ...(store[acct] ?? [])];
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
    }
    try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
    legacyMigrated = true;
}

/**
 * Seed the two demo records into a carrier's bucket ONCE (tracked in SEEDED_KEY), so there's
 * always something to open and edit. Runs once per account ever — if the user deletes a demo,
 * it stays deleted.
 */
function seedDemosInto(acct: string) {
    if (acct === NO_ACCOUNT) return;
    let seeded: Record<string, boolean> = {};
    try { seeded = JSON.parse(localStorage.getItem(SEEDED_KEY) || '{}'); } catch { /* ignore */ }
    if (seeded[acct]) return;
    const store = loadStore();
    const existing = new Set((store[acct] ?? []).map(r => r.id));
    const fresh = DEMO_RECORDS.filter(d => !existing.has(d.id));
    if (fresh.length) {
        store[acct] = [...(store[acct] ?? []), ...fresh.map(r => ({ ...r, custom: true }))];
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
    }
    seeded[acct] = true;
    try { localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded)); } catch { /* ignore */ }
}

function loadFor(acct: string): SafetyRecord[] {
    migrateLegacyInto(acct);
    seedDemosInto(acct);
    const list = loadStore()[acct] ?? [];
    return list.map(r => ({ ...r, custom: true }));
}

function persistFor(acct: string, list: SafetyRecord[]) {
    const store = loadStore();
    store[acct] = list;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota — best-effort for prototype */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

/** Hook: this carrier's custom records + add/update/remove. Pass the current account id. */
export function useCustomSafetyRecords(accountId?: string) {
    const acct = accountId || NO_ACCOUNT;
    const [records, setRecords] = useState<SafetyRecord[]>(() => loadFor(acct));

    useEffect(() => {
        const h = () => setRecords(loadFor(acct));
        h(); // re-read immediately when the carrier changes
        window.addEventListener(EVENT, h);
        window.addEventListener('storage', h);
        return () => {
            window.removeEventListener(EVENT, h);
            window.removeEventListener('storage', h);
        };
    }, [acct]);

    const add = (r: SafetyRecord) => persistFor(acct, [...loadFor(acct), { ...r, custom: true }]);
    const update = (r: SafetyRecord) => persistFor(acct, loadFor(acct).map(x => (x.id === r.id ? { ...r, custom: true } : x)));
    const remove = (id: string) => persistFor(acct, loadFor(acct).filter(x => x.id !== id));

    return { records, add, update, remove };
}
