// ─────────────────────────────────────────────────────────────────────────────
// The Registration & Plate section on the Add Asset form → the asset's PLATE
// RECORD.
//
// The same arrangement as ownership-docs-bridge, for the same reason. The
// Default Compliances & Documents module already owns this question: `irp-plate`
// ("Asset Plates") asks whether the plate is apportioned, takes the plate number,
// the issuing jurisdiction and the expiry it runs to, and holds the two documents
// that come with it — the copy of ownership, and, on an apportioned plate, the
// cab card. A local plate has no cab card, so that slot is not offered rather
// than standing open as a permanent gap.
//
// Before this, the asset form asked all of that over again into fields of its
// own. The office therefore typed the plate number twice, and the copy that
// aged out was the one on the compliance page — the one an officer's request
// gets answered from.
//
// So the form keeps asking (it is the natural moment to be told), and what it
// captures is filed as the record. Nothing here knows about React: the section
// renders from the asset form's own inputs, and the save path calls
// `commitPlateRecord` once the asset has an id.
// ─────────────────────────────────────────────────────────────────────────────

import {
    SAFETY_RECORDS, recordForFields, isDateMonitored,
    type SafetyRecord,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    blankVersion, defaultMonitoring, writeComplianceVersion,
    type DataDocFile, type DocVersion, type MonitoringConfig,
} from '@/pages/compliance/compliance-data-store';
import { STATES_BY_COUNTRY } from '@/pages/compliance/jurisdiction.data';
import { findUserById } from '@/data/users.data';

/** The catalog record the plate section files against. */
export const PLATE_RECORD_ID = 'irp-plate';

/** The field on that record whose answer decides the rest of it. */
const PLATE_TYPE_KEY = 'plateType';

/**
 * The asset form says IRP / Local; the record says IRP / Non-IRP.
 *
 * Two words for one answer, which is exactly the kind of thing that quietly files a plate
 * under a variant that does not exist — `recordForFields` falls back to the base record for
 * an unknown value, so a "Local" plate would have been filed with a cab card slot and the
 * fleet expiry. Translated in one place, both ways.
 */
export const plateTypeForRecord = (formValue: string | undefined): string =>
    formValue === 'Local' ? 'Non-IRP' : formValue === 'IRP' ? 'IRP' : '';

/** The record as this plate makes it: an apportioned plate and a local one are not the same form. */
export function plateRecordFor(plateType: string | undefined): SafetyRecord | null {
    const base = SAFETY_RECORDS.find(r => r.id === PLATE_RECORD_ID);
    if (!base) return null;
    const kind = plateTypeForRecord(plateType);
    return recordForFields(base, kind ? { [PLATE_TYPE_KEY]: kind } : undefined);
}

/**
 * What the uploads are called, in the record's own words.
 *
 * An apportioned plate files a copy of ownership AND a cab card; a local plate files the
 * ownership copy alone. Read off the record rather than spelled out here, so a slot renamed
 * in the catalog renames on the asset form too.
 *
 * NONE until the kind has been answered. `recordForFields` falls back to the base record
 * for a value it does not know, and the base record declares both slots — so an unanswered
 * plate would offer a cab card box before anybody had said the plate was apportioned, and
 * a file dropped in it would be filed into a slot a local plate's form never draws.
 */
export function plateSlotLabels(plateType: string | undefined): string[] {
    if (!plateTypeForRecord(plateType)) return [];
    return plateRecordFor(plateType)?.slotLabels ?? [];
}

/** Does this plate carry a cab card? Only an apportioned one does, once it says so. */
export const plateHasCabCard = (plateType: string | undefined): boolean =>
    plateSlotLabels(plateType).length > 1;

/** What the plate section holds, as the asset form holds it. */
export interface PlateSource {
    plateType?: string;
    plateNumber?: string;
    plateCountry?: string;
    plateJurisdiction?: string;
    registrationIssueDate?: string;
    registrationExpiryDate?: string;
    /** The copy of ownership — slot one on every plate. */
    plateDocument?: { fileName?: string; name?: string; fileSize?: number; size?: number }[];
    /** The cab card — slot two, and only on an apportioned plate. */
    cabCardDocument?: { fileName?: string; name?: string; fileSize?: number; size?: number }[];
    /** The alert, as the section's monitoring block left it. */
    plateMonitoringEnabled?: boolean;
    plateMonitorBasedOn?: string;
    plateMonitoring?: MonitoringConfig;
}

/**
 * Is there a plate here at all?
 *
 * Deliberately narrow. A plate country defaults to USA and a jurisdiction to the first
 * province in the list, so counting those would file a blank plate record against every
 * asset anybody ever saves. A plate is a plate when it has a NUMBER, an expiry or a
 * document — the three things nobody types by accident.
 */
export function plateHasContent(src: PlateSource): boolean {
    if ((src.plateNumber ?? '').trim()) return true;
    if ((src.registrationExpiryDate ?? '').trim()) return true;
    return (src.plateDocument?.length ?? 0) > 0 || (src.cabCardDocument?.length ?? 0) > 0;
}

/** Current signed-in user's display name — the same stamp the compliance page applies. */
function capturedByName(): string {
    try { const id = localStorage.getItem('app_current_user_id'); return (id && findUserById(id)?.name) || 'You'; } catch { return 'You'; }
}

const asFiles = (
    list: PlateSource['plateDocument'], slot: string | undefined, now: string,
): DataDocFile[] => (list ?? []).map(f => ({
    name: f.fileName ?? f.name ?? 'document',
    size: f.fileSize ?? f.size ?? 0,
    slot,
    uploadedAt: now,
}));

/**
 * The plate section → the version filed against the asset, or null when no plate was given.
 *
 * The uploads keep their SLOT, so the compliance page shows the ownership copy and the cab
 * card in the two boxes it draws for them rather than as an undifferentiated pile.
 */
export function plateVersion(src: PlateSource, capturedBy?: string): DocVersion | null {
    const base = SAFETY_RECORDS.find(r => r.id === PLATE_RECORD_ID);
    const record = plateRecordFor(src.plateType);
    if (!base || !record || !plateHasContent(src)) return null;

    const v = blankVersion(base, record.recordName);
    v.numberValue = (src.plateNumber ?? '').trim();

    // The country as the compliance side spells it, and a province checked against it: the
    // asset form leaves the old province selected when the country changes, and a province
    // from the wrong country is a value the record's own form cannot show.
    v.country = src.plateCountry === 'Canada' ? 'Canada' : src.plateCountry === 'USA' ? 'United States' : '';
    const provinces = STATES_BY_COUNTRY[v.country] ?? [];
    v.stateProv = provinces.includes(src.plateJurisdiction ?? '') ? (src.plateJurisdiction ?? '') : '';

    v.issueDate = record.tracksIssueDate ? (src.registrationIssueDate ?? '') : (src.registrationIssueDate ?? '');
    v.expiryDate = isDateMonitored(record) ? (src.registrationExpiryDate ?? '') : '';

    const kind = plateTypeForRecord(src.plateType);
    if (kind) v.fields = { [PLATE_TYPE_KEY]: kind };

    const now = new Date().toISOString();
    // Unanswered, the slots are unknown rather than both: a document filed under no slot is
    // still filed, and still shown, where a document under the wrong slot is not.
    const slots = plateSlotLabels(src.plateType);
    v.files = [
        ...asFiles(src.plateDocument, slots[0], now),
        // Only where the plate has one. A cab card uploaded against a local plate would be
        // filed into a slot that plate's form does not draw, and so could not be seen again.
        ...(plateHasCabCard(src.plateType) ? asFiles(src.cabCardDocument, slots[1], now) : []),
    ];

    // Tagged with where it came from: on the compliance list this is the difference between a
    // record the office filed and one captured while the asset was being registered.
    v.tags = ['From asset form'];
    v.uploadedBy = capturedBy || capturedByName();
    v.monitoring = {
        ...(src.plateMonitoring ?? defaultMonitoring()),
        basis: src.plateMonitorBasedOn === 'issue_date' ? 'issue' : 'expiry',
        // Never without a date to count back from: an alert on a blank expiry fires on nothing.
        enabled: isDateMonitored(record) && (src.plateMonitoringEnabled ?? true) && !!v.expiryDate,
    };
    return v;
}

/**
 * File the plate as the asset's compliance record. Called once the asset has an id — on Add
 * Asset that is only after the list assigns one.
 *
 * Returns what was filed, for the confirmation the user sees, or null when the section was
 * left empty. This prepends, so re-plating a vehicle files the new plate over the old one
 * rather than erasing the plate it used to carry.
 */
export function commitPlateRecord(
    accountId: string | undefined, assetId: string, src: PlateSource, capturedBy?: string,
): string | null {
    if (!assetId) return null;
    const version = plateVersion(src, capturedBy);
    if (!version) return null;
    writeComplianceVersion(accountId, assetId, PLATE_RECORD_ID, version);
    return version.label;
}
