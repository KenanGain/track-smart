// ─────────────────────────────────────────────────────────────────────────────
// The two annual records, read back.
//
// The Add Asset form asks for them on its Annual safety step — the annual safety
// inspection and the annual preventive-maintenance service — and files each as a
// compliance record against the asset: a date it was done, the odometer it was done at,
// the date it falls due again, and the certificate. See `asset-records-bridge.ts`, which
// writes them.
//
// Maintenance has to READ them, for two reasons. The asset's page should show what was
// captured rather than send somebody to the asset form to find out; and an Annual
// Inspection interval that counts 365 days from nothing while the certificate sitting on
// the asset says exactly when it was done is a screen disagreeing with itself.
// ─────────────────────────────────────────────────────────────────────────────

import { currentVersion, type DocVersion, type RecordDataEntry } from '@/pages/compliance/compliance-data-store';
import { ASSET_RECORD_IDS, assetRecordVersion } from './asset-records-bridge';
import type { ClockDue } from './service-intervals';

/** One of the two, as maintenance needs it. */
export interface AnnualCapture {
    /** The day it was done. */
    lastDate?: string;
    /** The day it falls due again — what the alerts count down to. */
    nextDue?: string;
    /** The reading it was done at, in whatever unit was entered. */
    odometer?: number;
    odometerUnit?: string;
    files: { name: string; url?: string }[];
    capturedBy?: string;
    capturedAt?: string;
}

/** Which service types make an interval the annual safety inspection. */
export const ANNUAL_SAFETY_SERVICES = ['annual_inspection', 'insp_safety_annual'];

export const isAnnualSafetyInterval = (serviceTypeIds: string[]) =>
    serviceTypeIds.some((id) => ANNUAL_SAFETY_SERVICES.includes(id));

export const ANNUAL_RECORD_IDS = ASSET_RECORD_IDS;

/** Read one of the two off a compliance entry. Nothing captured → nothing returned. */
export function annualFromEntry(entry: RecordDataEntry | undefined): AnnualCapture | undefined {
    const v = entry ? currentVersion(entry) : null;
    if (!v) return undefined;
    const odo = Number(v.fields?.odometer ?? '');
    const capture: AnnualCapture = {
        lastDate: v.issueDate || undefined,
        nextDue: v.expiryDate || undefined,
        odometer: Number.isFinite(odo) && odo > 0 ? odo : undefined,
        odometerUnit: v.fields?.odometerUnit || undefined,
        files: (v.files ?? []).map((f) => ({ name: f.name, url: f.url })),
        capturedBy: v.uploadedBy,
        capturedAt: v.uploadedAt,
    };
    // A record with nothing on it is not a record.
    const hasAnything = capture.lastDate || capture.nextDue || capture.odometer || capture.files.length;
    return hasAnything ? capture : undefined;
}

const DAY = 86400000;
const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
const atNoon = (iso: string) => new Date(iso.length === 10 ? `${iso}T08:00:00` : iso);

/** How far off the next one is, in days. Negative is past. */
export function daysUntil(iso: string, now: Date = new Date()): number {
    return Math.round((atNoon(iso).getTime() - now.getTime()) / DAY);
}

/**
 * The days clock for an interval fed by the asset's own annual record.
 *
 * It counts to the date on the certificate, not to "a year after whatever somebody typed
 * into the interval": the certificate is the thing an inspector asks for, and the date on
 * it is the date that matters. Where no next-due date was captured, it falls back to the
 * interval's own length from the day it was done.
 */
export function annualClock(
    capture: AnnualCapture,
    everyDays: number,
    now: Date = new Date(),
): ClockDue | undefined {
    const dueIso = capture.nextDue
        ?? (capture.lastDate ? new Date(atNoon(capture.lastDate).getTime() + everyDays * DAY).toISOString() : undefined);
    if (!dueIso) return undefined;

    const due = atNoon(dueIso);
    const remaining = Math.round((due.getTime() - now.getTime()) / DAY);
    const threshold = Math.max(7, Math.round(everyDays * 0.2));
    const n = Math.abs(remaining).toLocaleString();

    return {
        unit: 'days',
        label: 'Days',
        everyText: `every ${everyDays.toLocaleString()} days`,
        dueText: fmtDate(due),
        remaining,
        remainingText: remaining < 0 ? `${n} days over` : remaining === 0 ? 'Due now' : `${n} days to go`,
        over: remaining <= 0,
        share: remaining / everyDays,
        status: remaining <= 0 ? 'overdue' : remaining <= threshold ? 'due' : 'upcoming',
        dueAtDate: due.toISOString(),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seeding the two records for a fleet that has none
//
// Every asset arrived in this prototype without ever going through the Add Asset form, so
// every annual block read "nothing captured yet" — which shows the empty state well and
// the feature not at all. This fills them in ONCE per carrier, with dates spread off each
// asset’s own id so the fleet has certificates in every state: some months out, some due
// within the month, a few already expired.
//
// Written as real compliance versions, so the asset’s Compliances tab, the monitoring
// alerts and this page all read the same record rather than this page having its own
// private copy of the truth.
// ─────────────────────────────────────────────────────────────────────────────

const SEED_FLAG = 'ts_annual_records_seeded_v1';

const hash = (s: string) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h = (h ^ s.charCodeAt(i)) >>> 0; h = Math.imul(h, 16777619) >>> 0; }
    return h;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** What the seeder hands the bridge for one record. */
interface SeedCapture {
    issueDate: string;
    expiryDate: string;
    fields: Record<string, string>;
    files: { name: string; size: number; url?: string }[];
}

/**
 * One asset’s pair of records, deterministic from its id.
 *
 * The inspection is a year long and the PM service six months, which is what they are; the
 * spread comes from how long ago each was done.
 */
function seedCaptureFor(assetId: string, odometer: number, now: Date): {
    safety: SeedCapture;
    pm: SeedCapture;
} {
    const h = hash(assetId);
    // Three bands rather than a straight spread, so a fleet of any size has certificates in
    // every state to look at: most of them months out, some inside the last month before
    // they expire, and a few already past — which is what a real yard looks like.
    const band = h % 3;
    const safetyAgeDays = band === 0 ? 30 + (h % 180)      // comfortably in date
        : band === 1 ? 340 + (h % 25)                       // inside its last month
            : 370 + (h % 90);                               // expired
    const pmAgeDays = band === 0 ? 15 + ((h >> 7) % 90)
        : band === 1 ? 150 + ((h >> 7) % 25)
            : 190 + ((h >> 7) % 60);
    const back = (days: number) => new Date(now.getTime() - days * 86400000);
    const fwd = (from: Date, days: number) => new Date(from.getTime() + days * 86400000);

    const safetyLast = back(safetyAgeDays);
    const pmLast = back(pmAgeDays);
    // The reading it was done at: the asset's own meter, less what it has run since.
    const odoAt = (days: number) => Math.max(0, Math.round(odometer - days * 320));

    return {
        safety: {
            issueDate: iso(safetyLast),
            expiryDate: iso(fwd(safetyLast, 365)),
            fields: { odometer: String(odoAt(safetyAgeDays)), odometerUnit: 'miles' },
            files: [{ name: 'annual-inspection.pdf', size: 4766, url: '/demo-docs/annual-inspection.pdf' }],
        },
        pm: {
            issueDate: iso(pmLast),
            expiryDate: iso(fwd(pmLast, 180)),
            fields: { odometer: String(odoAt(pmAgeDays)), odometerUnit: 'miles' },
            files: [{ name: 'compliance-document.pdf', size: 4783, url: '/demo-docs/compliance-document.pdf' }],
        },
    };
}

/**
 * Fill in the two annual records for every asset that has neither, once.
 *
 * Skips any asset that already has one — a record somebody filed, or deliberately deleted,
 * is not ours to overwrite — and remembers it has run, so a deleted record stays deleted.
 */
export function seedAnnualRecords(
    assets: { id: string; odometer?: number; odometerUnit?: 'mi' | 'km' }[],
    getEntry: (subjectId: string, recordId: string) => RecordDataEntry,
    setEntries: (items: { subjectId: string; recordId: string; entry: RecordDataEntry }[]) => void,
    accountId: string | undefined,
    now: Date = new Date(),
): number {
    const flag = `${SEED_FLAG}::${accountId ?? 'acct-001'}`;
    // No storage to ask (a private window, a test) is not the same as "already done" — it
    // only means we cannot remember, and the per-asset check below still protects anything
    // somebody has actually filed.
    let alreadyRun = false;
    try { alreadyRun = !!localStorage.getItem(flag); } catch { /* cannot remember */ }
    if (alreadyRun) return 0;

    const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];

    for (const a of assets) {
        const hasSafety = (getEntry(a.id, ANNUAL_RECORD_IDS.annualSafety).versions ?? []).length > 0;
        const hasPm = (getEntry(a.id, ANNUAL_RECORD_IDS.annualPm).versions ?? []).length > 0;
        if (hasSafety && hasPm) continue;

        const miles = !a.odometer ? 0 : a.odometerUnit === 'km' ? Math.round(a.odometer * 0.621371) : a.odometer;
        const seed = seedCaptureFor(a.id, miles, now);

        const add = (key: 'annualSafety' | 'annualPm', capture: typeof seed.safety) => {
            const v: DocVersion | null = assetRecordVersion(key, capture, {}, 'Fleet records');
            if (!v) return;
            // The bridge keeps a file's name and size; the demo certificates are real files
            // under /demo-docs, and a document nobody can open is not a document on file.
            v.files = v.files.map((f, i) => ({ ...f, url: capture.files[i]?.url ?? f.url }));
            items.push({ subjectId: a.id, recordId: ANNUAL_RECORD_IDS[key], entry: { versions: [v] } });
        };

        if (!hasSafety) add('annualSafety', seed.safety);
        if (!hasPm) add('annualPm', seed.pm);
    }

    if (items.length) setEntries(items);
    try { localStorage.setItem(flag, '1'); } catch { /* ignore */ }
    return items.length;
}
