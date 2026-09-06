// ─────────────────────────────────────────────────────────────────────────────
// Issuing a warning letter → the driver's COMPLIANCE RECORD.
//
// A warning letter is a resolution chosen on a review — of an hours-of-service
// violation, a telematics safety event, a ticket, an accident. It is also a
// document that belongs in the driver's file, and the office should not have to
// file it a second time by hand.
//
// So issuing one writes the Warning Letter record for that driver, carrying the
// SOURCE with it: which surface it came from, what the event was, that record's
// own number and date, and a one-line summary. That is what makes a file of
// letters readable — every row says what it was for.
//
// Nothing here knows about React. Each review surface builds a
// `WarningLetterSource` from its own record and calls `issueWarningLetter`.
// ─────────────────────────────────────────────────────────────────────────────

import { SAFETY_RECORDS, defaultVersionLabel, type SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';
import { blankVersion, defaultMonitoring, writeComplianceVersion, type DocVersion } from '@/pages/compliance/compliance-data-store';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';

/** The catalog record every warning letter is filed as. */
export const WARNING_LETTER_RECORD_ID = 'warning-letter';

/** The surfaces a letter can be issued from, and the label the record stores. */
export const WARNING_SOURCE_LABEL = {
    hos: 'Hours of Service',
    'safety-event': 'Safety Event',
    ticket: 'Ticket',
    accident: 'Accident',
    other: 'Other',
} as const;
export type WarningSourceKind = keyof typeof WARNING_SOURCE_LABEL;

/**
 * What a review hands over when it issues a letter.
 *
 * `eventType` and `reference` are the two the file is read by — what happened, and which
 * record it happened on — so both surfaces fill them even when the rest is thin.
 */
export interface WarningLetterSource {
    kind: WarningSourceKind;
    /** The driver the letter is issued to. */
    driverId: string;
    driverName?: string;
    /** What happened — the HOS rule broken, the event type, the violation, the accident type. */
    eventType: string;
    /** The source record's own number: a violation id, an offense number, an accident number. */
    reference?: string;
    /**
     * The source record's INTERNAL id — what its own page needs to open it. Often not the
     * same as `reference`: a ticket is filed under "OFF-84729" but opened by its row id. Stored
     * so the letter's reference becomes a link back to the record it was issued for.
     */
    sourceId?: string;
    /** When the event happened (YYYY-MM-DD). */
    eventDate?: string;
    /** One line of context, shown on the letter and in the file. */
    summary?: string;
}

export const warningLetterRecord = (): SafetyRecord | undefined =>
    SAFETY_RECORDS.find(r => r.id === WARNING_LETTER_RECORD_ID);

/**
 * The ROSTER driver id to file against.
 *
 * The surfaces that issue letters do not all speak the same id: an HOS violation carries the
 * driver id it was reported with, and a telematics event carries the provider's own
 * (`drv_DRV2001`). A compliance record has to hang off the roster driver or it is an orphan
 * nobody will ever see, so the id is accepted only if the roster knows it, and otherwise the
 * driver is matched by name. Returns '' when neither works — better no record than one filed
 * against a driver who does not exist.
 */
export function resolveDriverId(
    accountId: string | undefined, opts: { driverId?: string; driverName?: string },
): string {
    const roster = getDriversForAccount(accountId ?? 'acct-001');
    if (opts.driverId && roster.some(d => d.id === opts.driverId)) return opts.driverId;
    const name = opts.driverName?.trim().toLowerCase();
    if (name) {
        const hit = roster.find(d => (d.name ?? '').trim().toLowerCase() === name);
        if (hit) return hit.id;
    }
    return '';
}

/** Today as YYYY-MM-DD — the date the letter is issued. */
function today(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** `2026-01-05T14:30` / `2026-01-05` / `Jan 5, 2026` → `2026-01-05`, or '' if unreadable. */
export function warningEventDate(raw: string | undefined): string {
    if (!raw) return '';
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
    if (iso) return iso[1];
    const t = Date.parse(raw);
    if (Number.isNaN(t)) return '';
    const d = new Date(t);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The version a source becomes. Returned rather than written so a caller can preview it, and
 * so the write path has one shape to test.
 */
export function warningLetterVersion(src: WarningLetterSource, issuedBy?: string): DocVersion | null {
    const record = warningLetterRecord();
    if (!record || !src.driverId) return null;
    const v = blankVersion(record, defaultVersionLabel(record));
    v.issueDate = today();
    v.expiryDate = '';
    v.country = '';
    v.stateProv = '';
    v.status = '';
    v.fields = {
        letterSource: WARNING_SOURCE_LABEL[src.kind],
        eventType: src.eventType.trim(),
        ...(src.reference?.trim() ? { eventReference: src.reference.trim() } : {}),
        ...(src.summary?.trim() ? { eventSummary: src.summary.trim() } : {}),
        ...(warningEventDate(src.eventDate) ? { eventDate: warningEventDate(src.eventDate) } : {}),
    };
    // Kept so the letter's Event reference can open the record it was issued for. The
    // reference alone is a number on a page; this is the way back to the thing itself.
    if (src.sourceId?.trim()) v.sourceRecordId = src.sourceId.trim();
    // Tagged by where it came from, so a file of letters can be read at a glance and the
    // office can tell an issued letter from one uploaded by hand.
    v.tags = ['Warning letter', WARNING_SOURCE_LABEL[src.kind]];
    if (issuedBy) v.uploadedBy = issuedBy;
    // A letter records an action already taken — there is nothing to expire or renew.
    v.monitoring = { ...defaultMonitoring(), enabled: false };
    return v;
}

/**
 * File the letter as the driver's Warning Letter record. Returns the version written, or null
 * when there is no driver to file it against (a violation with no matched driver, say) — the
 * caller can then still complete its own resolution rather than failing.
 *
 * Versions are PREPENDED, so a second letter is filed alongside the first rather than
 * replacing it: the history is the point.
 */
export function issueWarningLetter(
    accountId: string | undefined, src: WarningLetterSource, issuedBy?: string,
): DocVersion | null {
    // Resolved here rather than at each call site, so every surface files against the roster
    // driver whatever id it happens to hold.
    const driverId = resolveDriverId(accountId, { driverId: src.driverId, driverName: src.driverName });
    if (!driverId) return null;
    const version = warningLetterVersion({ ...src, driverId }, issuedBy);
    if (!version) return null;
    writeComplianceVersion(accountId, driverId, WARNING_LETTER_RECORD_ID, version);
    return version;
}
