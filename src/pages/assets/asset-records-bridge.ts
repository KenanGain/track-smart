// ─────────────────────────────────────────────────────────────────────────────
// The Add Asset form's remaining COMPLIANCE RECORDS: the pink slip, the annual
// safety inspection, and the preventive-maintenance service.
//
// The third of these bridges, and the simplest, because all three records are
// the same shape: a date it was done or issued, a date it falls due again, one
// document, and — for the two inspections — the odometer reading it was done at.
// Ownership needed a spec per structure and plating needed a variant per plate
// kind; these need neither, so one `commit` walks all three rather than three
// files that would drift.
//
// Why records rather than fields on the asset: an inspection certificate is
// produced on demand, it expires, and the office has to be told before it does.
// A field on the asset row does none of that. The form keeps asking — it is the
// natural moment to be told — and what it captures is filed where the alerts and
// the document list can see it.
// ─────────────────────────────────────────────────────────────────────────────

import {
    SAFETY_RECORDS, isDateMonitored,
    type SafetyRecord,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    blankVersion, defaultMonitoring, writeComplianceVersion,
    type DataDocFile, type DocVersion,
} from '@/pages/compliance/compliance-data-store';
import { STATES_BY_COUNTRY } from '@/pages/compliance/jurisdiction.data';
import { findUserById } from '@/data/users.data';

/** An upload as the asset form holds it, whichever of the two shapes it is in. */
type FormFile = { fileName?: string; name?: string; fileSize?: number; size?: number };

/** One captured record, as the form holds it. */
export interface AssetRecordCapture {
    /** The date it was done or issued. */
    issueDate?: string;
    /** The date it falls due again — what the record is monitored on. */
    expiryDate?: string;
    /** The record's own number, where it has one (the pink slip's policy number). */
    number?: string;
    /** Extra values keyed by the record's field keys (the odometer and its unit). */
    fields?: Record<string, string>;
    files?: FormFile[];
    /** Off only when somebody says so: these are exactly the dates nobody should have to remember. */
    monitoringEnabled?: boolean;
}

/** Which of the form's sections files which record. */
export const ASSET_RECORD_IDS = {
    pinkSlip: 'pink-slip',
    annualSafety: 'annual-safety',
    annualPm: 'annual-pm',
} as const;

export type AssetRecordKey = keyof typeof ASSET_RECORD_IDS;

export const assetRecordFor = (key: AssetRecordKey): SafetyRecord | undefined =>
    SAFETY_RECORDS.find(r => r.id === ASSET_RECORD_IDS[key]);

/**
 * Is there anything here to file?
 *
 * A date, a number or a document. Not the odometer on its own: a reading with no date and
 * no certificate beside it is somebody who started typing in the wrong box, and filing it
 * would put an inspection record on the truck saying an inspection happened.
 */
export function assetRecordHasContent(c: AssetRecordCapture | undefined): boolean {
    if (!c) return false;
    if ((c.issueDate ?? '').trim() || (c.expiryDate ?? '').trim()) return true;
    if ((c.number ?? '').trim()) return true;
    return (c.files?.length ?? 0) > 0;
}

/** Current signed-in user's display name — the same stamp the compliance page applies. */
function capturedByName(): string {
    try { const id = localStorage.getItem('app_current_user_id'); return (id && findUserById(id)?.name) || 'You'; } catch { return 'You'; }
}

/** Where the vehicle is plated, as the compliance side spells it. */
export function assetRecordCountry(formCountry: string | undefined): string {
    return formCountry === 'Canada' ? 'Canada' : formCountry === 'USA' ? 'United States' : '';
}

/**
 * One captured section → the version filed against the asset, or null when it was left
 * empty. `country` / `stateProv` come from the asset form's plate jurisdiction, since that
 * is the only place it is asked and it is where the vehicle is inspected.
 */
export function assetRecordVersion(
    key: AssetRecordKey,
    c: AssetRecordCapture | undefined,
    where: { country?: string; stateProv?: string },
    capturedBy?: string,
): DocVersion | null {
    const record = assetRecordFor(key);
    if (!record || !assetRecordHasContent(c) || !c) return null;

    const v = blankVersion(record, record.recordName);
    v.numberValue = (c.number ?? '').trim();

    // A record that captures no jurisdiction is not given one: a value the form cannot show
    // is a value nobody can correct.
    if (!record.hideCountry) {
        v.country = assetRecordCountry(where.country);
        const provinces = STATES_BY_COUNTRY[v.country] ?? [];
        v.stateProv = provinces.includes(where.stateProv ?? '') ? (where.stateProv ?? '') : '';
    } else {
        v.country = '';
        v.stateProv = '';
    }

    v.issueDate = record.tracksIssueDate ? (c.issueDate ?? '') : '';
    v.expiryDate = isDateMonitored(record) ? (c.expiryDate ?? '') : '';

    // Only the keys this record still declares, so a value left in the form by a field that
    // has since moved cannot leak onto the document.
    const declared = new Set<string>([
        ...(record.textFields ?? []).map(f => f.key),
        ...(record.selectFields ?? []).map(f => f.key),
    ]);
    const fields: Record<string, string> = {};
    for (const [k, val] of Object.entries(c.fields ?? {})) {
        if (declared.has(k) && (val ?? '').trim()) fields[k] = val.trim();
    }
    if (Object.keys(fields).length) v.fields = fields;

    const now = new Date().toISOString();
    v.files = (c.files ?? []).map((f): DataDocFile => ({
        name: f.fileName ?? f.name ?? 'document',
        size: f.fileSize ?? f.size ?? 0,
        uploadedAt: now,
    }));

    // Tagged with where it came from: on the compliance list this is the difference between a
    // record the office filed and one captured while the asset was being registered.
    v.tags = ['From asset form'];
    v.uploadedBy = capturedBy || capturedByName();
    v.monitoring = {
        ...defaultMonitoring(),
        basis: 'expiry',
        // Never without a date to count back from: an alert on a blank due date fires on nothing.
        enabled: isDateMonitored(record) && (c.monitoringEnabled ?? true) && !!v.expiryDate,
    };
    return v;
}

/** What the asset form hands over for all three. */
export interface AssetRecordSource {
    plateCountry?: string;
    plateJurisdiction?: string;
    pinkSlip?: AssetRecordCapture;
    annualSafety?: AssetRecordCapture;
    annualPm?: AssetRecordCapture;
}

/**
 * The asset form's flat values — as three captures.
 *
 * The form holds one field per question because that is what a form is; the records want
 * them grouped. Done here rather than in the component so the save path has one thing to
 * call and the mapping cannot differ between the two pages that save an asset.
 */
export function assetRecordsFromForm(data: Record<string, any>): AssetRecordSource {
    return {
        plateCountry: data.plateCountry,
        plateJurisdiction: data.plateJurisdiction,
        pinkSlip: {
            number: data.pinkSlipNumber,
            expiryDate: data.pinkSlipExpiry,
            files: data.pinkSlipDocument,
        },
        annualSafety: {
            issueDate: data.annualSafetyLastDate,
            expiryDate: data.annualSafetyNextDue,
            fields: {
                odometer: data.annualSafetyOdometer ?? '',
                odometerUnit: data.annualSafetyOdometerUnit ?? '',
            },
            files: data.annualSafetyDocument,
        },
        annualPm: {
            issueDate: data.annualPmLastDate,
            expiryDate: data.annualPmNextDue,
            fields: {
                odometer: data.annualPmOdometer ?? '',
                odometerUnit: data.annualPmOdometerUnit ?? '',
            },
            files: data.annualPmDocument,
        },
    };
}

/**
 * File whichever of the three were filled in. Called once the asset has an id — on Add Asset
 * that is only after the list assigns one.
 *
 * Returns the names filed, for the confirmation the user sees. Each prepends, so re-filing
 * this year's inspection keeps last year's rather than erasing the history a claim is
 * argued from.
 */
export function commitAssetRecords(
    accountId: string | undefined, assetId: string, src: AssetRecordSource, capturedBy?: string,
): string[] {
    if (!assetId) return [];
    const where = { country: src.plateCountry, stateProv: src.plateJurisdiction };
    const filed: string[] = [];
    for (const key of Object.keys(ASSET_RECORD_IDS) as AssetRecordKey[]) {
        const version = assetRecordVersion(key, src[key], where, capturedBy);
        if (!version) continue;
        writeComplianceVersion(accountId, assetId, ASSET_RECORD_IDS[key], version);
        filed.push(version.label);
    }
    return filed;
}
