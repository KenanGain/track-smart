// Per-driver DQ File runtime store.
//
// The Settings ▸ DQ Files checklists define the STRUCTURE (which check items a
// DQ file must contain, per driver type). This file is the RUNTIME layer: for
// each driver (scoped per carrier), it holds the driver's DQ type + the filled
// state of their DQ file (verification / notes / header / sign-off), persisted
// to localStorage with a CustomEvent (same pattern as inventory-store.ts).

import { useEffect, useState } from "react";
import type { SignOffData } from "@/pages/hiring-process/FormKit";
import type { Driver } from "@/pages/profile/carrier-profile.data";
import {
    loadDqChecklists, flattenItems,
    type DqDriverTypeId, type DqChecklist,
} from "@/pages/settings/settings-dq-checklists.data";
import { operationsFor } from "@/pages/accounts/carrier-datasets.data";

// ── Fill state (shared with DqFileDocument) ────────────────────────────────────
export type Verification = "" | "present" | "missing" | "expired" | "na";
export type ItemFill = { verification: Verification; notes: string };
export type DqFileFill = {
    header: Record<string, string>;
    items: Record<string, ItemFill>;
    nextReview: string;
    signoff: SignOffData | null;
};
export const emptyFill = (): DqFileFill => ({ header: {}, items: {}, nextReview: "", signoff: null });

export type DriverDqRecord = { driverType: DqDriverTypeId; fill: DqFileFill };

// ── Type resolution + checklist lookup ─────────────────────────────────────────
/**
 * Which DQ file a driver needs, before anybody overrides it.
 *
 * Citizenship and country alone can only ever say "US" or "Canada" — they describe where
 * a driver is FROM, not where they drive. Cross-border is a property of the work, so the
 * carrier is the missing input: one whose operations include Cross-Border runs the border,
 * and it runs it with the long-haul and owner-operator lanes. Local and lease work stays
 * inside one country whatever the carrier's authority says.
 *
 * `accountId` is optional so callers that never had a carrier to hand keep the answer they
 * always got. Anything that knows the account should pass it, or two screens will disagree
 * about the same driver.
 */
export function defaultTypeFor(driver: Driver, accountId?: string): DqDriverTypeId {
    const c = `${driver.citizenship ?? ""} ${driver.country ?? ""}`.toLowerCase();
    const domestic: DqDriverTypeId = c.includes("canada") ? "canada_only" : "us_only";
    if (!accountId) return domestic;
    if (!operationsFor(accountId).carrierOperation.includes("Cross-Border")) return domestic;
    const work = (driver.driverType ?? "").toLowerCase();
    return work.includes("long haul") || work.includes("owner operator") ? "cross_border" : domestic;
}

/** The Settings checklist that applies to a driver type (first match). */
export function checklistForType(type: DqDriverTypeId): DqChecklist | undefined {
    return loadDqChecklists().find(c => c.type === type);
}

// ── Completion roll-up ──────────────────────────────────────────────────────
export interface DqCompletion { total: number; present: number; na: number; missing: number; required: number; pct: number; complete: boolean }

export function computeCompletion(record: DriverDqRecord, checklist: DqChecklist | undefined): DqCompletion {
    const items = checklist ? flattenItems(checklist) : [];
    let present = 0, na = 0, missing = 0;           // overall counts
    let reqDenom = 0, reqPresent = 0, reqMissing = 0; // non-optional items only
    for (const it of items) {
        const v = record.fill.items[it.id]?.verification ?? "";
        const isPresent = v === "present", isNa = v === "na";
        if (isPresent) present++; else if (isNa) na++; else missing++; // "", "missing", "expired"
        if (it.requirement !== "optional" && !isNa) {
            reqDenom++;
            if (isPresent) reqPresent++; else reqMissing++;
        }
    }
    // Optional items never block completion or count toward the required denominator.
    const pct = reqDenom > 0 ? Math.round((reqPresent / reqDenom) * 100) : (items.length === 0 ? 0 : 100);
    return { total: items.length, present, na, missing, required: reqDenom, pct, complete: items.length > 0 && reqMissing === 0 };
}

// ── Persistence (keyed by `${accountId}::${driverId}`) ──────────────────────────
const KEY = "dqfiles:driver-records-v1";
const EVENT = "dqfiles-driver-records-change";

type Store = Record<string, DriverDqRecord>;

function loadAll(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}
function persist(all: Store) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}
const rowKey = (accountId: string, driverId: string) => `${accountId}::${driverId}`;

/** Per-carrier hook: read + mutate each driver's DQ record. Records default from the
 *  driver's citizenship and are only persisted once the user changes something. */
export function useDriverDqFiles(accountId?: string) {
    const acct = accountId ?? "acct-001";
    const [all, setAll] = useState<Store>(loadAll);
    useEffect(() => {
        const h = () => setAll(loadAll());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);

    const getRecord = (driver: Driver): DriverDqRecord =>
        all[rowKey(acct, driver.id)] ?? { driverType: defaultTypeFor(driver, acct), fill: emptyFill() };

    const patch = (driver: Driver, next: Partial<DriverDqRecord>) => {
        const cur = loadAll();
        const key = rowKey(acct, driver.id);
        const base = cur[key] ?? { driverType: defaultTypeFor(driver, acct), fill: emptyFill() };
        persist({ ...cur, [key]: { ...base, ...next } });
    };
    const setType = (driver: Driver, driverType: DqDriverTypeId) => patch(driver, { driverType });
    const setFill = (driver: Driver, fill: DqFileFill) => patch(driver, { fill });

    return { records: all, getRecord, setType, setFill };
}
