// ─────────────────────────────────────────────────────────────────────────────
// Which catalog records a SUBJECT actually tracks.
//
// The catalog is the same for every driver, but not every record applies to
// every driver — a local city driver needs no FAST card, an employee needs no
// owner-operator paperwork. Disabling a record here takes it out of that
// subject's list and out of their completion figures, without deleting anything:
// the record's captured data is untouched and comes straight back if it is
// re-enabled.
//
// Only DISABLED ids are stored, so a new subject (and every existing one) starts
// with the whole catalog enabled and the store stays empty until someone opts out
// of something.
//
// THE MOVE IS DEFERRED. A row does not jump between the Enabled and Disabled
// lists the moment its switch is flipped — it stays put, marked, until the list
// is refreshed. Rows that vanish under the cursor make it impossible to work down
// a list turning several off, which is exactly how this gets used. The reader of
// this store therefore holds a SNAPSHOT for filtering (see `useRecordEnablement`)
// while showing each row's live state.
//
// Persists to localStorage with a CustomEvent so open tabs stay in sync — the same
// shape as `compliance-data-store`.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useState } from 'react';

const KEY = 'compliance-record-enablement-v1';
const EVENT = 'compliance-record-enablement-change';

/** `${accountId}::${subjectId}` → the record ids that subject does NOT track. */
type Store = Record<string, string[]>;

/** Mirrors the compliance data store's key shape, including its account fallback. */
const scopeKey = (accountId: string | undefined, subjectId: string) => `${accountId ?? 'acct-001'}::${subjectId}`;

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

/** The record ids this subject does not track. */
export function disabledRecordIds(accountId: string | undefined, subjectId: string): string[] {
    return loadAll()[scopeKey(accountId, subjectId)] ?? [];
}

/** Turn one record on / off for one subject. Enabling drops the id rather than storing `true`. */
export function setRecordEnabled(accountId: string | undefined, subjectId: string, recordId: string, enabled: boolean): void {
    const all = loadAll();
    const key = scopeKey(accountId, subjectId);
    const current = new Set(all[key] ?? []);
    if (enabled) current.delete(recordId); else current.add(recordId);
    if (current.size) all[key] = [...current].sort();
    else delete all[key];   // fully enabled → no entry at all
    persist(all);
}

/**
 * One subject's enablement, for a list that must not reshuffle under the cursor.
 *
 * `disabled`  — live: what each row's switch shows, updating the instant it is flipped.
 * `listed`    — a snapshot taken on mount: what the list FILTERS by, so flipping a switch
 *               marks the row instead of moving it. `refresh()` re-takes it (as a reload
 *               would), which is when rows actually change lists.
 * `pending`   — the ids whose list will change on the next refresh, for the hint that
 *               tells the user their change is waiting.
 */
export function useRecordEnablement(accountId: string | undefined, subjectId: string) {
    const key = scopeKey(accountId, subjectId);
    const [live, setLive] = useState<string[]>(() => disabledRecordIds(accountId, subjectId));
    const [listed, setListed] = useState<string[]>(live);

    // Another tab (or another view of the same subject) changing this subject's enablement
    // updates the switches here, but still does not move any row until a refresh.
    useEffect(() => {
        const sync = () => setLive(disabledRecordIds(accountId, subjectId));
        window.addEventListener(EVENT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
    }, [accountId, subjectId]);

    // Switching to a different subject starts fresh — its own state, snapshotted. Adjusted
    // during render rather than in an effect: an effect would paint the previous subject's
    // enablement for a frame first, and React re-runs this immediately without committing
    // the discarded render (https://react.dev/reference/react/useState — "adjusting state
    // when a prop changes").
    const [scope, setScope] = useState(key);
    if (scope !== key) {
        const next = disabledRecordIds(accountId, subjectId);
        setScope(key);
        setLive(next);
        setListed(next);
    }

    const setEnabled = useCallback((recordId: string, enabled: boolean) => {
        setRecordEnabled(accountId, subjectId, recordId, enabled);
        setLive(disabledRecordIds(accountId, subjectId));
    }, [accountId, subjectId]);

    const refresh = useCallback(() => setListed(disabledRecordIds(accountId, subjectId)), [accountId, subjectId]);

    const disabled = useMemo(() => new Set(live), [live]);
    const listedDisabled = useMemo(() => new Set(listed), [listed]);
    const pending = useMemo(() => {
        const a = new Set(live), b = new Set(listed);
        return [...new Set([...live, ...listed])].filter(id => a.has(id) !== b.has(id));
    }, [live, listed]);

    return { disabled, listedDisabled, pending, setEnabled, refresh };
}
