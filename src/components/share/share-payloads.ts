// ─────────────────────────────────────────────────────────────────────────────
// share-payloads — what "Share to chat" actually sends about a row.
//
// The dialog is shared already; what was not shared was the ANSWER to "share what?".
// Each caller built its own list, so sharing an asset from one screen sent the unit number
// and sharing it from another sent the unit number, its plate and its intervals. The
// recipient cannot tell which they got — they just see a short message and assume that is
// everything there is.
//
// A row's payload has three parts, and they go to three different places:
//
//   · its DATA goes in the NOTE. The facts on a record are not files, and the first attempt
//     put them in the attachment list, where "VIN: R7LKD9…" sat under a document icon with
//     a tick box beside it and the header counted twelve of them as "12 docs". Nothing there
//     could be opened, downloaded or viewed. They read as a note, so they are one.
//
//   · its DOCUMENTS go in the ATTACHMENTS, and only its documents — the files actually
//     filed against it, read from the same store the dialog's own "Add from app" picker
//     reads so what is offered and what is attached cannot disagree. A record with no
//     documents shows the dialog's own empty state, which still offers Device and From app.
//
//   · the RECORD ITSELF goes in the record link, so the message carries a way back to the
//     page rather than a description of it.
//
// Attachments arrive ticked. The sender unticks what they do not want to send, which is the
// right way round: a recipient is never short of context because the sender did not know an
// attachment existed.
// ─────────────────────────────────────────────────────────────────────────────

import type { ShareItem } from './ShareToChat';
import type { ConvSource, RecordRef } from '@/pages/messages/messages-store';
import { listAppDocuments } from '@/pages/compliance/compliance-data-store';

export interface SharePayload {
    title: string;
    subtitle: string;
    source: ConvSource;
    /** Documents only. See the note above. */
    items: ShareItem[];
    record?: RecordRef;
    defaultSubject: string;
    /** The record's own facts, as the note the message opens with. */
    defaultMessage: string;
}

/** One stated fact, dropped when there is nothing to state. */
type Fact = [label: string, value: unknown];

/**
 * The facts as a note.
 *
 * Headed by section the way the record is laid out, because a flat run of twenty
 * "label: value" lines is something a recipient skims rather than reads.
 */
function note(intro: string, sections: [string, Fact[]][]): string {
    const blocks = sections
        .map(([heading, facts]) => {
            const lines = facts
                .filter(([, v]) => v != null && v !== '')
                .map(([label, v]) => `  ${label}: ${v}`);
            return lines.length ? `${heading}\n${lines.join('\n')}` : '';
        })
        .filter(Boolean);
    return [intro, ...blocks].join('\n\n');
}

/**
 * The files already filed against this subject.
 *
 * Grouped by the record they were filed under rather than listed flat: "cvor-certificate.pdf"
 * on its own tells a recipient nothing about why it is in the message.
 */
function documentsFor(subjectId: string): ShareItem[] {
    try {
        return listAppDocuments()
            .filter((d) => d.subjectId === subjectId)
            .map((d) => ({ name: d.name, group: d.record }));
    } catch {
        // The picker survives a broken store by showing nothing; so does this.
        return [];
    }
}

// ── Asset ────────────────────────────────────────────────────────────────────

export interface ShareableAsset {
    id: string;
    unitNumber: string;
    year?: number;
    make?: string;
    model?: string;
    color?: string;
    vin?: string;
    assetType?: string;
    vehicleType?: string;
    assetCategory?: string;
    operationalStatus?: string;
    financialStructure?: string;
    plateNumber?: string;
    plateJurisdiction?: string;
    registrationExpiryDate?: string;
    odometer?: number;
    odometerUnit?: string;
}

export function assetSharePayload(a: ShareableAsset): SharePayload {
    const describe = [a.year, a.make, a.model].filter(Boolean).join(' ');
    return {
        title: `Share ${a.unitNumber}`,
        subtitle: 'The unit, its plating and everything filed against it',
        source: { type: 'manual', id: a.id, label: a.unitNumber },
        record: {
            type: 'asset',
            id: a.id,
            label: a.unitNumber,
            sublabel: describe || a.assetType,
            // The carrier profile, which opens the Assets tab and this unit's record on
            // arrival. '/account' is not a route at all — following the link landed
            // nowhere, which is what "share the record page" was failing at.
            path: '/account/profile',
        },
        defaultSubject: `${a.unitNumber}${describe ? ` — ${describe}` : ''}`,
        defaultMessage: note(`${a.unitNumber}${describe ? ` — ${describe}` : ''}`, [
            ['Unit', [
                ['Type', a.assetType && a.vehicleType ? `${a.assetType} · ${a.vehicleType}` : a.assetType],
                ['Class', a.assetCategory],
                ['Colour', a.color],
                ['VIN', a.vin],
                ['Status', a.operationalStatus],
            ]],
            ['Plating', [
                ['Plate', a.plateNumber && a.plateJurisdiction ? `${a.plateNumber} (${a.plateJurisdiction})` : a.plateNumber],
                ['Registration expires', a.registrationExpiryDate],
            ]],
            ['Ownership', [
                ['Held', a.financialStructure],
                ['Odometer', a.odometer != null ? `${a.odometer.toLocaleString()} ${a.odometerUnit || 'mi'}` : null],
            ]],
        ]),
        items: documentsFor(a.id),
    };
}

// ── Driver ───────────────────────────────────────────────────────────────────

export interface ShareableDriver {
    id: string;
    name: string;
    status?: string;
    hireDate?: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    licenseState?: string;
    licenseExpiry?: string;
    /** How far through their DQ file they are, where the list has worked it out. */
    dqPercent?: number;
    /** What the compliance column is showing, in words. */
    complianceNote?: string;
}

export function driverSharePayload(d: ShareableDriver): SharePayload {
    return {
        title: `Share ${d.name}`,
        subtitle: 'The driver, their licence and the file behind them',
        source: { type: 'manual', id: d.id, label: d.name },
        record: {
            type: 'driver',
            id: d.id,
            label: d.name,
            sublabel: d.licenseNumber ? `Licence ${d.licenseNumber}` : d.id,
            path: '/account/profile',
        },
        defaultSubject: `${d.name} — driver file`,
        defaultMessage: note(`${d.name} (${d.id})`, [
            ['Driver', [
                ['Status', d.status],
                ['Hired', d.hireDate],
            ]],
            ['Licence', [
                ['Number', d.licenseNumber],
                ['Jurisdiction', d.licenseState],
                ['Expires', d.licenseExpiry],
            ]],
            ['Contact', [
                ['Phone', d.phone],
                ['Email', d.email],
            ]],
            ['DQ file', [
                ['Complete', d.dqPercent != null ? `${d.dqPercent}%` : null],
                ['Standing', d.complianceNote],
            ]],
        ]),
        items: documentsFor(d.id),
    };
}

// ── Yard terminal ────────────────────────────────────────────────────────────

export interface ShareableLocation {
    id: string;
    name: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
    security?: { fenced?: boolean; gated?: boolean; cctv?: boolean; guard?: boolean; restricted?: boolean };
    score?: number;
    status?: string;
    assignedAssets?: string[];
}

/** The five measures, in the order the table's own columns run. */
const SECURITY_LABELS: [keyof NonNullable<ShareableLocation['security']>, string][] = [
    ['fenced', 'Fenced'], ['gated', 'Gated'], ['cctv', 'CCTV'],
    ['guard', 'Guard on site'], ['restricted', 'Restricted access'],
];

export function locationSharePayload(l: ShareableLocation): SharePayload {
    const street = [l.address?.street, [l.address?.city, l.address?.state].filter(Boolean).join(', '), l.address?.zip]
        .filter(Boolean).join(' · ');
    return {
        title: `Share ${l.name}`,
        subtitle: 'The yard, its address and how it is secured',
        source: { type: 'manual', id: l.id, label: l.name },
        record: { type: 'location', id: l.id, label: l.name, sublabel: street || l.id, path: '/account/profile' },
        defaultSubject: `${l.name} — yard terminal`,
        defaultMessage: note(`${l.name} (${l.id})`, [
            ['Yard', [
                ['Status', l.status],
                ['Address', street],
                ['Assets assigned', l.assignedAssets?.length ? String(l.assignedAssets.length) : null],
            ]],
            // Both halves, because "what is NOT in place" is the half a reader is checking
            // for — a list of only the ticks reads as a clean bill of health.
            ['Security', [
                ...SECURITY_LABELS.map(([k, label]) => [label, l.security?.[k] ? 'yes' : 'no'] as Fact),
                ['Score', l.score != null ? `${l.score} / 100` : null],
            ]],
        ]),
        // A yard is not a compliance subject, so it has no document shelf of its own.
        items: [],
    };
}
