// ─────────────────────────────────────────────────────────────────────────────
// What the Add Asset form says about the four PM tiers.
//
// The form used to ask for two annual records — the safety inspection and the annual PM
// service — as free-standing dates with a certificate each. Both of those are already
// services the PM tiers cover (PM-D is the annual one), so the form was asking a second
// time, in its own words, for something the maintenance module counts properly.
//
// What it asks now is the question that actually starts the cycle: which of PM-A…PM-D
// does this unit run, and when was each last done. A tier switched on with a date and a
// reading is a countdown that can start; switched on with nothing, there is no "last
// one" to count from and the rule would sit on the unit saying "not recorded" forever.
//
// This module is the bridge, in the shape the ownership documents use: the form writes
// here when the save assigns an id, and the maintenance module reads here when it seeds
// a carrier. It is deliberately NOT the maintenance state itself — the enrolment and the
// ledger are built from this, once, and are the truth from then on.
// ─────────────────────────────────────────────────────────────────────────────

import { PM_TIER_IDS } from './service-intervals';

/**
 * One tier, as the asset form captured it.
 *
 * It carries everything the Add service record form carries, because what this writes IS
 * one of those records — the first on that tier's ledger. A first entry that holds less
 * than every entry after it is the gap every "who did this, and what did it cost"
 * question falls into a year later.
 */
export interface PmStart {
    /** The day it was last done. Without it nothing can be counted from. */
    lastDate?: string;
    /** The reading it was done at, in whatever unit was entered. */
    odometer?: number;
    odometerUnit?: 'miles' | 'km';
    engineHours?: number;
    /** The shop that did it, where there was one. */
    vendorId?: string;
    vendorName?: string;
    /** Who turned the spanner — not where it was done, which is the vendor. */
    performedBy?: 'driver' | 'mechanic';
    driverId?: string;
    performedByName?: string;
    /** The bill, as an invoice is actually written. */
    labour?: number;
    parts?: number;
    cost?: number;
    currency?: string;
    /** About this service, and about the next one. */
    notes?: string;
    remarks?: string;
    /** The bill, the sheet, the signed copy — whatever proves it happened. */
    files: { name: string; url?: string }[];
}

/** Only the tiers that were switched on, keyed by interval id. */
export type PmEnrolment = Record<string, PmStart>;

const KEY = 'tracksmart.asset-pm-enrolment.v1';

type Store = Record<string, Record<string, PmEnrolment>>;

function read(): Store {
    try {
        return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Store;
    } catch {
        return {};
    }
}

function write(s: Store) {
    try {
        localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
        /* a prototype that cannot write its demo data still has to render */
    }
}

/** Everything this carrier's assets said on the form, by asset id. */
export function pmEnrolmentsForCarrier(accountId?: string): Record<string, PmEnrolment> {
    if (!accountId) return {};
    return read()[accountId] ?? {};
}

export function pmEnrolmentFor(accountId: string | undefined, assetId: string): PmEnrolment {
    return pmEnrolmentsForCarrier(accountId)[assetId] ?? {};
}

/**
 * File what the form said, against the asset id the save assigned.
 *
 * Called from the asset save handler beside `commitOwnershipDoc` and `commitAssetRecords`,
 * for the same reason they are: until the save runs there is no id to file it against.
 */
export function commitPmEnrolment(
    accountId: string | undefined, assetId: string, enrolment: PmEnrolment,
) {
    if (!accountId) return;
    const all = read();
    const carrier = { ...(all[accountId] ?? {}) };
    if (Object.keys(enrolment).length === 0) delete carrier[assetId];
    else carrier[assetId] = enrolment;
    write({ ...all, [accountId]: carrier });
}

/**
 * Pull the four tiers out of the form's own payload.
 *
 * The fields are flat — `pmOn_sch_pm_a`, `pmLastDate_sch_pm_a` — because a dotted name
 * would make react-hook-form build an object keyed by an id with underscores in it, and
 * the one place that is read is here.
 */
export function pmEnrolmentFromForm(
    data: Record<string, any>,
    /** The carrier's own shops and drivers, so a name is stored and not just an id. */
    lookup?: { vendors?: { id: string; name: string }[]; drivers?: { id: string; name: string }[] },
): PmEnrolment {
    const out: PmEnrolment = {};
    const money = (v: any) => {
        const n = Number(String(v ?? '').replace(/[^0-9.]/g, ''));
        return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    for (const id of PM_TIER_IDS) {
        if (!data[`pmOn_${id}`]) continue;
        const odo = money(data[`pmOdometer_${id}`]);
        const hrs = money(data[`pmHours_${id}`]);
        const labour = money(data[`pmLabour_${id}`]);
        const parts = money(data[`pmParts_${id}`]);
        const total = (labour ?? 0) + (parts ?? 0);
        const typing = !!data[`pmTyping_${id}`];
        const vendorId = typing ? undefined : (data[`pmVendorId_${id}`] || undefined);
        const driverId = data[`pmDriverId_${id}`] || undefined;
        const performedBy = data[`pmPerformedBy_${id}`] === 'driver' ? 'driver' as const : 'mechanic' as const;
        out[id] = {
            lastDate: data[`pmLastDate_${id}`] || undefined,
            odometer: odo,
            odometerUnit: data[`pmOdometerUnit_${id}`] === 'km' ? 'km' : 'miles',
            engineHours: hrs,
            vendorId,
            // A shop typed in is still a shop; one picked off the list is stored by name
            // too, so the record reads the same wherever it is opened.
            vendorName: typing
                ? (String(data[`pmVendorName_${id}`] ?? '').trim() || undefined)
                : lookup?.vendors?.find((v) => v.id === vendorId)?.name,
            performedBy,
            driverId: performedBy === 'driver' ? driverId : undefined,
            performedByName: performedBy === 'driver'
                ? lookup?.drivers?.find((d) => d.id === driverId)?.name
                : (String(data[`pmPerson_${id}`] ?? '').trim() || undefined),
            labour,
            parts,
            cost: total > 0 ? total : undefined,
            currency: data[`pmCurrency_${id}`] || 'USD',
            notes: String(data[`pmNotes_${id}`] ?? '').trim() || undefined,
            remarks: String(data[`pmRemarks_${id}`] ?? '').trim() || undefined,
            files: Array.isArray(data[`pmDocument_${id}`]) ? data[`pmDocument_${id}`] : [],
        };
    }
    return out;
}

/** The form's own defaults, so editing an asset re-opens what it was saved with. */
export function pmFormDefaults(enrolment: PmEnrolment): Record<string, any> {
    const out: Record<string, any> = {};
    for (const id of PM_TIER_IDS) {
        const e = enrolment[id];
        out[`pmOn_${id}`] = !!e;
        out[`pmLastDate_${id}`] = e?.lastDate ?? '';
        out[`pmOdometer_${id}`] = e?.odometer != null ? String(e.odometer) : '';
        out[`pmOdometerUnit_${id}`] = e?.odometerUnit ?? 'miles';
        out[`pmHours_${id}`] = e?.engineHours != null ? String(e.engineHours) : '';
        // A shop that was typed in rather than picked stays typed in on the way back.
        out[`pmTyping_${id}`] = !!e?.vendorName && !e?.vendorId;
        out[`pmVendorId_${id}`] = e?.vendorId ?? '';
        out[`pmVendorName_${id}`] = e?.vendorName ?? '';
        out[`pmPerformedBy_${id}`] = e?.performedBy ?? 'mechanic';
        out[`pmDriverId_${id}`] = e?.driverId ?? '';
        out[`pmPerson_${id}`] = e?.performedBy === 'driver' ? '' : (e?.performedByName ?? '');
        out[`pmLabour_${id}`] = e?.labour != null ? String(e.labour) : '';
        out[`pmParts_${id}`] = e?.parts != null ? String(e.parts) : '';
        out[`pmCurrency_${id}`] = e?.currency ?? 'USD';
        out[`pmNotes_${id}`] = e?.notes ?? '';
        out[`pmRemarks_${id}`] = e?.remarks ?? '';
        out[`pmDocument_${id}`] = e?.files ?? [];
    }
    return out;
}
