// Reads / writes per-carrier compliance enrollment, with localStorage
// persistence so toggles survive a reload. The runtime store is a thin
// override layer on top of `DEFAULT_CARRIER_COMPLIANCE` from
// `carrier-compliance.data.ts`.

import { useEffect, useState, useSyncExternalStore } from "react";
import {
    DEFAULT_CARRIER_COMPLIANCE,
    type CarrierCompliance,
    type NscJurisdictionEnrollment,
    type NscJurisdiction,
} from "./carrier-compliance.data";

// Bump this suffix whenever the shape of CarrierCompliance changes in
// a non-additive way, so cached overrides from older builds don't mask
// the new defaults. v2 invalidates pre-NSC-multi-jurisdiction overrides
// (Acme gained AB / BC / PE / NS NSC enrolments after v1 had shipped).
const STORAGE_KEY = "app_carrier_compliance_overrides_v2";

// ── Override store (in-memory + localStorage mirror) ─────────────────

type OverrideMap = Record<string, CarrierCompliance>;

function loadOverrides(): OverrideMap {
    if (typeof window === "undefined") return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw) as OverrideMap;
    } catch {
        return {};
    }
}

let overrides: OverrideMap = loadOverrides();

function persist(): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch {
        // Storage full / disabled — silently drop. The in-memory state is
        // still authoritative for this session.
    }
}

// ── External-store glue so React components re-render on writes ──────

const listeners = new Set<() => void>();
function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
function notify(): void {
    listeners.forEach((cb) => cb());
}

// Cache the overrides reference returned to React so identity is stable
// between unrelated re-renders (otherwise useSyncExternalStore complains
// about getSnapshot returning a new value on every call).
let snapshotRef: OverrideMap = overrides;
function getSnapshot(): OverrideMap {
    return snapshotRef;
}

function commit(next: OverrideMap): void {
    overrides = next;
    snapshotRef = next;
    persist();
    notify();
}

// ── Reads ────────────────────────────────────────────────────────────

/**
 * Resolved compliance for a carrier: default seeded record overlaid with
 * any user-edited overrides from localStorage.
 */
export function getCarrierCompliance(accountId: string): CarrierCompliance {
    if (overrides[accountId]) return overrides[accountId];
    return (
        DEFAULT_CARRIER_COMPLIANCE[accountId]
        ?? {
            accountId,
            fmcsa: { hasData: false, enabled: false, usdot: "" },
            cvor:  { hasData: false, enabled: false, number: "" },
            nsc:   [],
        }
    );
}

// ── Writes ───────────────────────────────────────────────────────────

/** Replace the entire compliance record for a carrier. */
export function setCarrierCompliance(
    accountId: string,
    next: CarrierCompliance,
    editedBy?: string,
): void {
    const stamped: CarrierCompliance = {
        ...next,
        accountId,
        lastEditedBy: editedBy ?? next.lastEditedBy,
        lastEditedAt: new Date().toISOString(),
    };
    commit({ ...overrides, [accountId]: stamped });
}

/** Toggle a single regime on/off without changing registration numbers. */
export function setFmcsaEnabled(
    accountId: string, enabled: boolean, editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        fmcsa: { ...cur.fmcsa, enabled, hasData: cur.fmcsa.hasData || enabled },
    }, editedBy);
}

export function setCvorEnabled(
    accountId: string, enabled: boolean, editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        cvor: { ...cur.cvor, enabled, hasData: cur.cvor.hasData || enabled },
    }, editedBy);
}

export function setFmcsaNumber(
    accountId: string, usdot: string, editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        fmcsa: { ...cur.fmcsa, usdot },
    }, editedBy);
}

export function setCvorNumber(
    accountId: string, number: string, editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        cvor: { ...cur.cvor, number },
    }, editedBy);
}

export function addNscJurisdiction(
    accountId: string,
    jurisdiction: NscJurisdiction,
    number = "",
    editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    if (cur.nsc.some((n) => n.jurisdiction === jurisdiction)) return; // already present
    const next: NscJurisdictionEnrollment = {
        jurisdiction,
        hasData: true,
        enabled: true,
        number,
    };
    setCarrierCompliance(accountId, {
        ...cur,
        nsc: [...cur.nsc, next],
    }, editedBy);
}

export function removeNscJurisdiction(
    accountId: string,
    jurisdiction: NscJurisdiction,
    editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        nsc: cur.nsc.filter((n) => n.jurisdiction !== jurisdiction),
    }, editedBy);
}

export function setNscEnabled(
    accountId: string,
    jurisdiction: NscJurisdiction,
    enabled: boolean,
    editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        nsc: cur.nsc.map((n) =>
            n.jurisdiction === jurisdiction
                ? { ...n, enabled, hasData: n.hasData || enabled }
                : n
        ),
    }, editedBy);
}

export function setNscNumber(
    accountId: string,
    jurisdiction: NscJurisdiction,
    number: string,
    editedBy?: string,
): void {
    const cur = getCarrierCompliance(accountId);
    setCarrierCompliance(accountId, {
        ...cur,
        nsc: cur.nsc.map((n) =>
            n.jurisdiction === jurisdiction ? { ...n, number } : n
        ),
    }, editedBy);
}

// ── React hook ───────────────────────────────────────────────────────

/**
 * Subscribes to compliance changes for one carrier and re-renders when
 * the toggle state for that carrier flips.
 */
export function useCarrierCompliance(
    accountId: string | undefined,
): CarrierCompliance | null {
    // Subscribe to the override store so components that watch compliance
    // re-render on writes from anywhere in the tree (the modal, etc.).
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const [resolved, setResolved] = useState<CarrierCompliance | null>(
        accountId ? getCarrierCompliance(accountId) : null
    );
    useEffect(() => {
        if (!accountId) { setResolved(null); return; }
        setResolved(getCarrierCompliance(accountId));
        const unsub = subscribe(() => setResolved(getCarrierCompliance(accountId)));
        return unsub;
    }, [accountId]);
    return resolved;
}
