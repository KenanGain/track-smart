import { useCallback, useSyncExternalStore } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// WHO PLACED THE COVER — the broker of record, and the person who answers the phone.
//
// This is not a property of a policy. A carrier buys its liability, its cargo and its CGL
// through ONE brokerage, usually from one named agent, and when a certificate is needed at
// 6am it is that person who is called — not whoever happens to be typed into the row you
// happened to open.
//
// It used to be captured per policy ("Producer", a free-text box on every version), which
// produced four spellings of the same brokerage across four rows and no phone number
// anywhere. It is stated once, here, and shown in the record's header above the policies it
// placed.
//
// Per carrier, in localStorage, like the rest of the prototype's data.
// ─────────────────────────────────────────────────────────────────────────────

export interface InsuranceBroker {
    /** The brokerage / producer of record. */
    producer: string;
    /** The person at that brokerage who handles this account. */
    agent: string;
    phone: string;
    email: string;
}

export const emptyBroker = (): InsuranceBroker => ({ producer: '', agent: '', phone: '', email: '' });

export const brokerIsEmpty = (b: InsuranceBroker): boolean =>
    !b.producer.trim() && !b.agent.trim() && !b.phone.trim() && !b.email.trim();

const KEY = 'insurance-broker-v1';
const EVENT = 'insurance-broker-changed';

type Store = Record<string, InsuranceBroker>;   // accountId -> broker

function loadAll(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? (JSON.parse(raw) as Store) : {};
    } catch { return {}; }
}

function saveAll(all: Store) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota — prototype only */ }
    snapshots.clear();
    try { window.dispatchEvent(new CustomEvent(EVENT)); } catch { /* SSR / probe */ }
}

// ── Snapshots, for `useSyncExternalStore` ───────────────────────────────────
// It demands a STABLE object between changes: parsing localStorage afresh on every call
// returns a new object each time, React sees the store as perpetually changed and re-renders
// without end. Cached per carrier, and the cache is dropped whenever anything writes.
const snapshots = new Map<string, InsuranceBroker>();

function snapshot(accountId?: string): InsuranceBroker {
    const key = accountId ?? '';
    let v = snapshots.get(key);
    if (!v) { v = getInsuranceBroker(accountId); snapshots.set(key, v); }
    return v;
}

function subscribe(onChange: () => void): () => void {
    const handle = () => { snapshots.clear(); onChange(); };
    window.addEventListener(EVENT, handle);
    window.addEventListener('storage', handle);   // another tab
    return () => {
        window.removeEventListener(EVENT, handle);
        window.removeEventListener('storage', handle);
    };
}

export function getInsuranceBroker(accountId?: string): InsuranceBroker {
    if (!accountId) return emptyBroker();
    return { ...emptyBroker(), ...(loadAll()[accountId] ?? {}) };
}

export function setInsuranceBroker(accountId: string, broker: InsuranceBroker) {
    const all = loadAll();
    all[accountId] = broker;
    saveAll(all);
}

/**
 * The carrier's broker, and a way to change it.
 *
 * Subscribed to the same-tab event as well as `storage`, so the header updates the moment the
 * dialog saves rather than on the next navigation.
 */
export function useInsuranceBroker(accountId?: string) {
    // Subscribed rather than copied into state: the broker lives in localStorage, and reading
    // it into `useState` meant an effect writing state on every carrier switch — a render
    // cascade, and a frame showing the previous carrier's broker.
    const broker = useSyncExternalStore(subscribe, () => snapshot(accountId), () => snapshot(accountId));

    const save = useCallback((next: InsuranceBroker) => {
        if (!accountId) return;
        setInsuranceBroker(accountId, next);
    }, [accountId]);

    return { broker, save, canSave: !!accountId };
}

/** Representative details, for the prototype's "Load sample data". */
export function sampleBroker(): InsuranceBroker {
    return {
        producer: 'Marsh McLennan Agency',
        agent: 'Dana Whitfield',
        phone: '(416) 555-0142',
        email: 'dana.whitfield@marshmma.com',
    };
}
