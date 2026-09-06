// ─────────────────────────────────────────────────────────────────────────────
// Compliance picker — the bridge between the "/" picker in an AI-agent chat and
// the real Compliances & Documents catalog.
//
// Typing "/" in an agent chat lists every compliance / document record the carrier
// tracks (the default catalog plus that carrier's custom records). Picking
// one resolves the record's CAPTURE RULES — which fields the recipient must fill and
// whether a document is uploaded — into a plain `ComplianceAsk`, so the widget
// delivered into a driver's chat renders exactly the same field set as the office-side
// data-entry form (see `VersionFields` on the Default Compliances & Documents page).
// ─────────────────────────────────────────────────────────────────────────────

import {
    SAFETY_RECORDS, SAFETY_CATEGORY_ORDER, isDateMonitored,
    type SafetyRecord, type EntityId,
} from '@/pages/compliance/safety-software-catalog.data';
import { newVersion, writeComplianceVersion, type DocVersion, type DataDocFile } from '@/pages/compliance/compliance-data-store';
import type { ComplianceAsk, ComplianceSubmission } from './ai-agents';

/**
 * Resolve one catalog record into the capture rules the chat widget needs. Mirrors
 * `VersionFields` exactly: custom records carry an explicit per-field form definition,
 * system records fall back to the built-in rules.
 */
export function buildComplianceAsk(r: SafetyRecord): ComplianceAsk {
    const cf = r.customForm;
    const hasDoc = r.type !== 'C' && r.docRequirement !== 'none';
    return {
        recordId: r.id,
        recordName: r.recordName,
        documentName: r.documentName,
        description: r.description,
        category: r.category,
        entity: r.entity,
        numberName: r.numberName,
        monitorType: r.monitorType,
        recurring: r.recurring,
        needsNumber: cf ? cf.numberField.enabled && !!r.numberName : !!r.numberName,
        numberRequired: cf ? cf.numberField.required : (r.type === 'C' || r.type === 'DC'),
        needsCountry: cf ? cf.country.enabled : !r.hideCountry,
        needsState: cf ? cf.state.enabled : !r.hideState,
        allCountries: !!r.allCountries,
        needsIssueDate: cf ? cf.issueDate.enabled : !!r.tracksIssueDate,
        needsExpiryDate: cf ? cf.expiryDate.enabled : isDateMonitored(r),
        // A record can opt out of the status field entirely — the chat request must not ask
        // the driver for a value the office form no longer has anywhere to put.
        needsStatus: cf ? cf.status.enabled : (!isDateMonitored(r) && !r.hideStatus),
        needsUpload: cf ? cf.upload.enabled : hasDoc,
        multi: cf ? (cf.upload.enabled && cf.upload.multi) : !!r.multiInstance,
        slotLabels: r.slotLabels,
        statusLabel: r.statusLabel,
        statusOptions: r.statusOptions,
        statusControl: r.statusControl,
        selects: r.selectFields?.map(f => ({ ...f })),
    };
}

/** One row of the "/" compliance list. */
export interface CompliancePick {
    record: SafetyRecord;
    ask: ComplianceAsk;
}

/**
 * The pickable catalog for a carrier — default records plus that carrier's customs.
 * `entityFirst` floats one entity's records to the top (a tagged driver puts Driver
 * records first) while still keeping Carrier / Asset records reachable.
 */
export function compliancePicks(customRecords: SafetyRecord[], entityFirst?: EntityId): CompliancePick[] {
    const catOrder = new Map(SAFETY_CATEGORY_ORDER.map((c, i) => [c, i] as const));
    const all = [...customRecords, ...SAFETY_RECORDS];
    const sorted = [...all].sort((a, b) => {
        if (entityFirst) {
            const ea = a.entity === entityFirst ? 0 : 1;
            const eb = b.entity === entityFirst ? 0 : 1;
            if (ea !== eb) return ea - eb;
        }
        const ca = catOrder.get(a.category) ?? 99;
        const cb = catOrder.get(b.category) ?? 99;
        if (ca !== cb) return ca - cb;
        return a.recordName.localeCompare(b.recordName);
    });
    return sorted.map(record => ({ record, ask: buildComplianceAsk(record) }));
}

/** Free-text match over a record's name, document, number label and category. */
export function matchesCompliance(pick: CompliancePick, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const r = pick.record;
    return [r.id, r.recordName, r.documentName, r.description, r.numberName, r.category, r.entity]
        .some(v => (v ?? '').toLowerCase().includes(q));
}

/**
 * Write a driver's chat submission onto their real compliance record, so a document
 * captured in a chat shows up on the driver's Compliances tab like any other upload.
 */
export function saveComplianceSubmission(input: {
    accountId?: string;
    subjectId?: string;
    ask: ComplianceAsk;
    submission: ComplianceSubmission;
    files: DataDocFile[];
    uploadedBy?: string;
}): boolean {
    const { accountId, subjectId, ask, submission, files, uploadedBy } = input;
    if (!subjectId) return false;
    const v: DocVersion = {
        ...newVersion(ask.recordName),
        numberValue: submission.numberValue ?? '',
        country: submission.country ?? '',
        stateProv: submission.stateProv ?? '',
        issueDate: submission.issueDate ?? '',
        expiryDate: submission.expiryDate ?? '',
        status: submission.statusValue ?? '',
        fields: submission.fields,
        notes: submission.notes ?? '',
        tags: ['Submitted in chat'],
        files,
        uploadedBy: uploadedBy || 'Driver (chat upload)',
    };
    writeComplianceVersion(accountId, subjectId, ask.recordId, v);
    return true;
}

/** Read a picked file as a data URL so "View" keeps working after a reload. */
export function readAsDataUrl(file: File): Promise<string> {
    return new Promise(resolve => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result ?? ''));
        fr.onerror = () => resolve('');
        fr.readAsDataURL(file);
    });
}
