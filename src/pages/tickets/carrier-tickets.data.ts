/**
 * Per-carrier Ticket records (deterministic mock data).
 *
 * For every carrier in `ACCOUNTS_DB` (other than the legacy demo seed in
 * tickets.data.ts) this file synthesises a small set of tickets keyed to
 * that carrier's drivers, assets, and home jurisdiction. The records use
 * the same `TicketRecord` shape as the seed data, but also carry the
 * `accountId`, `identifiers`, `ticketKind`, and `attachedDocuments`
 * fields so the new TicketsPage can filter / show document types / etc.
 *
 * The shape mirrors what the new Add/Edit form produces, so editing a
 * synthesised record round-trips through the same fields the user sees.
 */

import { ACCOUNTS_DB, type AccountRecord } from '@/pages/accounts/accounts.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { hash, mulberry32, pick } from '@/pages/accounts/carrier-fleet-shared.data';
import { MOCK_TICKETS, type TicketRecord, type TicketKind, type ViolationType } from './tickets.data';
import {
    CARRIER_VIOLATIONS_BY_CARRIER,
    type CarrierViolationRecord,
} from '@/pages/violations/carrier-violations.data';
import {
    EXTERNAL_VIOLATION_FEEDS_BY_CARRIER,
    VIOLATION_SOURCE_META,
    type ExternalViolationRecord,
    type ExternalViolationSource,
} from '@/pages/violations/external-violation-feeds.data';

// ── Carrier-scoped TicketRecord (extends TicketRecord with carrier link) ───
// The runtime list merges with user-added tickets, so we widen the type to
// keep an explicit `accountId` plus the rich identifier/doc fields. The
// optional `_violationId` back-references the source violation so the
// missing-tickets reconciler can verify two-way mapping.
export interface CarrierTicketRecord extends TicketRecord {
    accountId: string;
    primaryDocTypeId?: string;
    primaryDocTypeLabel?: string;
    _violationId?: string;
}

// ── Builder ────────────────────────────────────────────────────────────────

/** Heuristic: map a violation's free-text type to one of the narrow
 *  Ticket buckets so the list view's badge palette still renders. */
function narrowTypeFromViolation(viol: CarrierViolationRecord): ViolationType {
    const text = `${viol.violationType ?? ''} ${viol.violationGroup ?? ''}`.toLowerCase();
    if (/speed|mph|over\s*limit|kph/.test(text))                       return 'Speeding';
    if (/overweight|axle|gvw|weight/.test(text))                       return 'Overweight';
    if (/logbook|log\s*book|hos|hours[-\s]?of[-\s]?service/.test(text))return 'Logbook violation';
    if (/insurance|liability|coverage/.test(text))                     return 'Insurance lapse';
    if (/red\s*light|signal|stop\s*sign/.test(text))                   return 'Red Light';
    if (/parking|stopping|stopped/.test(text))                         return 'Parking';
    return 'Equipment defect';
}

/** Map a violation's BASIC category-ish text into the BASIC label we
 *  use on the form / list strip. Lets the data file write the same
 *  category string the UI tabs expect. */
function basicCategoryFor(viol: CarrierViolationRecord): string {
    const text = `${viol.violationType ?? ''} ${viol.violationGroup ?? ''} ${viol.violationCode ?? ''}`.toLowerCase();
    if (/unsafe\s*driving|speed|red\s*light|reckless|signal|parking/.test(text)) return 'Unsafe Driving';
    if (/vehicle\s*maintenance|brake|tire|lamp|coupling|wheel|equipment|overweight|axle/.test(text)) return 'Vehicle Maintenance';
    if (/hours[-\s]?of[-\s]?service|hos|logbook|eld|duty/.test(text)) return 'Hours of Service Compliance';
    if (/driver\s*fitness|insurance|licen[cs]e/.test(text)) return 'Driver Fitness';
    if (/controlled\s*substance|alcohol|drug/.test(text)) return 'Controlled Substances / Alcohol';
    return 'Other';
}

/** Resolve a date offset to ISO YYYY-MM-DD relative to today. */
function dateAfter(iso: string, days: number): string {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** Decide a Ticket status from the source violation's status + result.
 *  Citations close out as 'Paid' when the convicting record reads
 *  closed, sit at 'In Court' when under review, and otherwise stay 'Due'. */
function statusFor(viol: CarrierViolationRecord, r: () => number): TicketRecord['status'] {
    if (viol.status === 'Closed' && viol.result === 'Citation Issued') return r() < 0.7 ? 'Paid' : 'Closed';
    if (viol.status === 'Closed') return 'Closed';
    if (viol.status === 'Under Review') return 'In Court';
    return r() < 0.6 ? 'Due' : 'In Court';
}

/** Build a `CarrierTicketRecord` from a citation-issued violation.
 *  The ticket inherits the violation's identifiers so the two surfaces
 *  reconcile: same ticketNumber, citationNumber, date, driver, asset,
 *  fineAmount. Source violation id is stamped onto `_violationId` for
 *  cross-page traceability.
 */
function ticketFromViolation(
    viol: CarrierViolationRecord,
    seq: number,
    account: AccountRecord,
    r: () => number,
): CarrierTicketRecord {
    const isElectronic = r() < 0.25;
    const ticketKind: TicketKind = isElectronic ? 'Electronic' : 'Paper';
    const docType = isElectronic
        ? { id: 'viol_eticket',    label: 'Electronic Ticket' }
        : { id: 'viol_ticket',     label: 'Violation Ticket / Citation' };

    const status = statusFor(viol, r);
    const isCanada = viol.locationCountry === 'CA' || (viol.locationCountry as string) === 'Canada';
    const narrow = narrowTypeFromViolation(viol);
    const basicCategory = basicCategoryFor(viol);
    const subtype = (viol as any).violationType || (viol as any).offence || viol.violationCode;
    const offenseSeq = 84740 + seq + (hash(account.id) % 200);
    const offenseNumber = `OFF-${offenseSeq}`;

    return {
        id: `${account.id}-tkt-${String(seq + 1).padStart(3, '0')}`,
        accountId: account.id,
        offenseNumber,
        date: viol.date,
        time: viol.time,
        driverId: viol.driverId,
        driverName: viol.driverName,
        location: [viol.locationCity, viol.locationState].filter(Boolean).join(', '),
        description: `${viol.locationStreet ?? ''}`.trim(),
        assetId: viol.assetName ?? viol.assetId ?? '',
        violationType: narrow,
        violationSubtype: subtype,
        violationCategory: basicCategory,
        violationGroup: viol.violationGroup,
        isOos: viol.isOos,
        fineAmount: Math.max(0, Math.round(viol.fineAmount + (viol.expenseAmount ?? 0))),
        currency: viol.currency,
        status,
        hasTicketFile:  ticketKind === 'Paper'      && r() < 0.85,
        hasReceiptFile: status === 'Paid'           && r() < 0.9,
        hasNoticeFile:  ticketKind === 'Electronic' && r() < 0.8,
        assignedToThirdParty: status === 'In Court' && r() < 0.6,
        ticketKind,
        ticketDetails: isElectronic
            ? {
                portalUrl:      `https://eticket.${isCanada ? 'gc.ca' : 'gov'}/lookup/${(viol.ticketNumber || viol.citationNumber || '').toLowerCase()}`,
                qrReference:    `${Math.floor(r() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}-${Math.floor(r() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0')}`,
                eIssuingDevice: pick(r, ['X300-Tablet', 'Z900-Handheld', 'eCitator-P2', 'Brother-PJ763']),
            }
            : {
                officerName:   pick(r, ['R. Hayes', 'M. Tanaka', 'P. Singh', 'C. Lefebvre', 'D. Okafor', 'A. Sullivan']),
                officerBadge:  `BADGE-${1000 + Math.floor(r() * 9000)}`,
                courtLocation: `${viol.locationCity ?? 'Local'} ${isCanada ? 'POA Court' : 'Municipal Court'}`,
                courtDate:     viol.convictionDate ?? dateAfter(viol.date, 30 + Math.floor(r() * 60)),
            },
        identifiers: {
            // Ticket # / Citation # come straight from the source violation
            // so the reconciliation lookup is exact.
            ticketNumber: viol.ticketNumber,
            citationNumber: viol.citationNumber,
            violationTicketNumber: isElectronic ? viol.ticketNumber : undefined,
            docketNumber: viol.docketNumber,
            courtCaseNumber: status === 'Paid' || status === 'Closed'
                ? `CC-${viol.date.slice(0, 4)}-${String(800 + seq).padStart(6, '0')}`
                : undefined,
            violationCode: viol.violationCode,
            statuteSection: viol.actSection,
            driverLicenceNumber: (CARRIER_DRIVERS[account.id]?.find(d => d.id === viol.driverId) as any)?.licenseNumber,
            plateNumber: (CARRIER_ASSETS[account.id]?.find(a => a.id === viol.assetId) as any)?.plateNumber,
            vinNumber:   (CARRIER_ASSETS[account.id]?.find(a => a.id === viol.assetId) as any)?.vin,
            usdotNumber: account.dotNumber || undefined,
            cvorNumber:  account.cvorNumber || undefined,
            nscNumber:   account.nscNumber || undefined,
            carrierNumber: account.id,
            receiptNumber: status === 'Paid'
                ? `RCPT-${viol.date.slice(0, 4)}-${String(100 + seq).padStart(6, '0')}`
                : undefined,
            paymentReferenceNumber: status === 'Paid'
                ? `PAY-REF-${100000 + Math.floor(r() * 900000)}`
                : undefined,
        },
        primaryDocTypeId: docType.id,
        primaryDocTypeLabel: docType.label,
        // Back-reference to the source violation. Used by the reconciliation
        // banner to flag "missing tickets" when a citation-issued violation
        // has no corresponding ticket in the carrier ticket store.
        _violationId: viol.id,
    } as CarrierTicketRecord;
}

/** Build the per-carrier ticket list from that carrier's violations.
 *  Roughly 80% of citation-issued violations get promoted to tickets;
 *  the remaining 20% are intentionally left without a ticket so the
 *  missing-tickets reconciliation banner has work to show. */
function buildForCarrier(account: AccountRecord): CarrierTicketRecord[] {
    const r = mulberry32(hash(`tickets:${account.id}`));
    const violations = CARRIER_VIOLATIONS_BY_CARRIER[account.id] ?? [];
    // Only citation-issued violations naturally produce a ticket.
    const citationViols = violations.filter(v => v.result === 'Citation Issued');
    if (citationViols.length === 0) return [];

    const out: CarrierTicketRecord[] = [];
    let seq = 0;
    for (const viol of citationViols) {
        // ~80% coverage — leave a deterministic ~20% as "missing tickets".
        if (r() < 0.20) continue;
        out.push(ticketFromViolation(viol, seq++, account, r));
    }
    return out;
}

// ── Public surface ─────────────────────────────────────────────────────────

const CARRIER_TICKETS_BY_ID: Record<string, CarrierTicketRecord[]> = {};
const CARRIER_TICKETS_ALL: CarrierTicketRecord[] = [];

for (const acct of ACCOUNTS_DB) {
    const list = buildForCarrier(acct);
    CARRIER_TICKETS_BY_ID[acct.id] = list;
    CARRIER_TICKETS_ALL.push(...list);
}

// Tag legacy MOCK_TICKETS to Acme so they show up in the demo carrier view.
const ACME_ID = 'acct-001';
const LEGACY_AS_CARRIER: CarrierTicketRecord[] = MOCK_TICKETS.map(t => ({
    ...t,
    accountId: ACME_ID,
    primaryDocTypeId:
        t.hasTicketFile  ? 'viol_ticket'       :
        t.hasNoticeFile  ? 'viol_eticket'      :
        t.hasReceiptFile ? 'viol_fine_receipt' : undefined,
    primaryDocTypeLabel:
        t.hasTicketFile  ? 'Violation Ticket / Citation' :
        t.hasNoticeFile  ? 'Electronic Ticket'           :
        t.hasReceiptFile ? 'Fine Payment Receipt'        : undefined,
}));
CARRIER_TICKETS_BY_ID[ACME_ID] = [
    ...LEGACY_AS_CARRIER,
    ...(CARRIER_TICKETS_BY_ID[ACME_ID] ?? []),
];
CARRIER_TICKETS_ALL.unshift(...LEGACY_AS_CARRIER);

/** Tickets scoped to one carrier (deterministic + seeded). */
export function getTicketsForCarrier(accountId: string): CarrierTicketRecord[] {
    return CARRIER_TICKETS_BY_ID[accountId] ?? [];
}

/** All carrier-scoped tickets across every account in ACCOUNTS_DB. */
export function getAllCarrierTickets(): CarrierTicketRecord[] {
    return CARRIER_TICKETS_ALL;
}

export { CARRIER_TICKETS_BY_ID, CARRIER_TICKETS_ALL };

// ─── Missing-tickets reconciliation ───────────────────────────────────────
//
// A "ticket reference" exists anywhere that has a citation/ticket number:
//   • Carrier violations marked `Citation Issued` carry `ticketNumber` /
//     `citationNumber` (the agency issued a ticket on that violation).
//   • External regulator feeds (FMCSA SMS, CVOR conviction, NSC-AB/PEI/NS,
//     federal Contraventions) carry `citationNumber`.
//
// If a carrier's ticket store doesn't have a record with that ticket/citation
// number, we surface it on the Tickets page as a MISSING ticket — so safety
// and compliance can add the missing record with one click. Mirrors the
// missing-violations notification on the Violations page.

/** Pseudo-source key used for ticket references that come from the
 *  internal violation log (not an external regulator feed). Lets us
 *  treat all sources uniformly when grouping/counting per source. */
export const VIOLATION_LOG_SOURCE = 'VIOL-LOG' as const;
export type MissingTicketSource = ExternalViolationSource | typeof VIOLATION_LOG_SOURCE;

/** Source registry extended with the internal violation-log "source". */
export const MISSING_TICKET_SOURCES: Record<MissingTicketSource, { short: string; label: string; agency: string; tone: string }> = {
    ...(VIOLATION_SOURCE_META as Record<ExternalViolationSource, { short: string; label: string; agency: string; tone: string }>),
    [VIOLATION_LOG_SOURCE]: {
        short: 'Violation Log',
        label: 'Internal Violation Log',
        agency: 'Carrier safety / compliance team',
        tone: 'bg-slate-50 text-slate-700 border-slate-200',
    },
} as const;

/** A normalized "ticket reference" pulled from either a violation or an
 *  external regulator feed, with enough context to render the banner row
 *  and prefill a new ticket if the user clicks "Log Ticket". */
export interface MissingTicketRef {
    /** Stable id for React keys + dismiss tracking. */
    id: string;
    /** Where this reference came from. */
    sourceKind: 'violation' | 'external-feed';
    /** Source key used for grouping + breakdown chips. */
    source: MissingTicketSource;
    /** Pretty source label for the badge ("FMCSA SMS", "CVOR Conv.", etc). */
    sourceLabel: string;
    /** Tailwind classes for the source chip. */
    sourceTone: string;
    /** Full agency name — surfaces in tooltips. */
    sourceAgency: string;
    accountId: string;
    date: string;
    time?: string;
    driverName: string;
    /** Driver licence # when the feed entry carries one (FMCSA only sometimes). */
    driverLicense?: string;
    /** "City, State" composed string for the table. */
    location: string;
    city?: string;
    state?: string;
    country?: 'USA' | 'CA';
    /** The reference number we'd look up in the ticket store. */
    ticketNumber?: string;
    citationNumber?: string;
    convictionNumber?: string;
    convictionDate?: string;
    violationCode: string;
    violationDescription: string;
    rawDescription?: string;
    /** Severity classification (OOS / Critical / Serious / Moderate / Minor). */
    severity: 'OOS' | 'Critical' | 'Serious' | 'Moderate' | 'Minor';
    /** Fine amount — 0 when the source didn't carry a fine (court-decided). */
    fineAmount: number;
    currency: 'USD' | 'CAD';
    /** Back-reference to the source row's id (violation id or external id). */
    sourceRecordId: string;
    /** Optional violation if sourced from one — used to prefill the form. */
    violation?: CarrierViolationRecord;
    /** Optional external record if sourced from a feed. */
    external?: ExternalViolationRecord;
}

/** Map a violation's risk-category to the severity bucket the banner
 *  uses (OOS / Critical / Serious / Moderate / Minor). */
function severityFromViolation(v: CarrierViolationRecord): MissingTicketRef['severity'] {
    if (v.isOos || v.result === 'OOS Order') return 'OOS';
    if (v.driverRiskCategory === 1) return 'Critical';
    if (v.driverRiskCategory === 2) return 'Serious';
    if (v.driverRiskCategory === 3) return 'Moderate';
    return 'Minor';
}

function normalizeRef(s: string | undefined): string {
    return (s ?? '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/** Build the set of all ticket-number / citation-number strings that
 *  exist in the carrier's ticket store. We normalize so "CT-IL-12345"
 *  and "ct il 12345" match. */
function ticketRefSetFor(accountId: string): Set<string> {
    const refs = new Set<string>();
    for (const t of CARRIER_TICKETS_BY_ID[accountId] ?? []) {
        if (t.offenseNumber)            refs.add(normalizeRef(t.offenseNumber));
        if (t.identifiers?.ticketNumber)   refs.add(normalizeRef(t.identifiers.ticketNumber));
        if (t.identifiers?.citationNumber) refs.add(normalizeRef(t.identifiers.citationNumber));
        if (t.identifiers?.violationTicketNumber) refs.add(normalizeRef(t.identifiers.violationTicketNumber));
        if (t._violationId) refs.add(`viol:${t._violationId}`);
    }
    return refs;
}

/** Project a single external-feed record (FMCSA SMS / CVOR / NSC /
 *  Contraventions) into the unified MissingTicketRef shape. */
function refFromExternal(e: ExternalViolationRecord, accountId: string): MissingTicketRef {
    const meta = MISSING_TICKET_SOURCES[e.source];
    return {
        id: `mt-ext-${e.externalId}`,
        sourceKind: 'external-feed',
        source: e.source,
        sourceLabel: meta.short,
        sourceTone: meta.tone,
        sourceAgency: meta.agency,
        accountId,
        date: e.date,
        time: e.time,
        driverName: e.driverName,
        driverLicense: e.driverLicense,
        location: `${e.city}, ${e.state}`,
        city: e.city,
        state: e.state,
        country: e.country,
        citationNumber: e.citationNumber || undefined,
        convictionNumber: e.convictionNumber || undefined,
        convictionDate: e.convictionDate,
        violationCode: e.violationCode,
        violationDescription: e.violationDescription,
        rawDescription: e.rawDescription,
        severity: e.severity,
        fineAmount: e.fineAmount || 0,
        currency: e.currency,
        sourceRecordId: e.externalId,
        external: e,
    };
}

/** Return the missing-ticket references for a carrier — violations that
 *  have a ticket # but no matching ticket in the store, plus external
 *  feed entries that aren't matched to any local ticket either.
 *
 *  `liveFeeds` lets callers fold in runtime-synced regulator feed
 *  entries (from the Sync button) so the banner reflects them live. */
export function getMissingTicketsForCarrier(
    accountId: string,
    liveFeeds: ExternalViolationRecord[] = [],
): MissingTicketRef[] {
    const known = ticketRefSetFor(accountId);
    const out: MissingTicketRef[] = [];

    // ── 1. Carrier violations with a citation/ticket # but no ticket on file
    const violations = CARRIER_VIOLATIONS_BY_CARRIER[accountId] ?? [];
    for (const v of violations) {
        // Only citation-issued violations naturally produce a ticket.
        if (v.result !== 'Citation Issued') continue;
        const tn = v.ticketNumber ?? '';
        const cn = v.citationNumber ?? '';
        if (!tn && !cn) continue;
        const hit = known.has(normalizeRef(tn))
            || known.has(normalizeRef(cn))
            || known.has(`viol:${v.id}`);
        if (hit) continue;
        const violMeta = MISSING_TICKET_SOURCES[VIOLATION_LOG_SOURCE];
        out.push({
            id: `mt-viol-${v.id}`,
            sourceKind: 'violation',
            source: VIOLATION_LOG_SOURCE,
            sourceLabel: violMeta.short,
            sourceTone: violMeta.tone,
            sourceAgency: violMeta.agency,
            accountId,
            date: v.date,
            time: v.time,
            driverName: v.driverName,
            location: [v.locationCity, v.locationState].filter(Boolean).join(', '),
            city: v.locationCity,
            state: v.locationState,
            country: v.locationCountry === 'CA' || (v.locationCountry as string) === 'Canada' ? 'CA' : 'USA',
            ticketNumber: tn || undefined,
            citationNumber: cn || undefined,
            convictionNumber: v.convictionNumber,
            convictionDate: v.convictionDate,
            violationCode: v.violationCode,
            violationDescription: v.violationType,
            rawDescription: v.offence || v.charge,
            severity: severityFromViolation(v),
            fineAmount: v.fineAmount || 0,
            currency: v.currency,
            sourceRecordId: v.id,
            violation: v,
        });
    }

    // ── 2. External regulator feeds (FMCSA SMS / CVOR conviction / NSC AB·
    //    PEI·NS conviction / federal Contraventions) with a citation # or
    //    conviction # not on file. Static seed + live-synced batch combined,
    //    so the Sync button result shows up in the banner immediately.
    const staticFeeds = EXTERNAL_VIOLATION_FEEDS_BY_CARRIER[accountId] ?? [];
    const seenExtIds = new Set<string>();
    const allFeeds: ExternalViolationRecord[] = [];
    for (const e of [...liveFeeds, ...staticFeeds]) {
        if (seenExtIds.has(e.externalId)) continue;
        seenExtIds.add(e.externalId);
        allFeeds.push(e);
    }
    for (const e of allFeeds) {
        const cn = e.citationNumber ?? '';
        const conv = e.convictionNumber ?? '';
        if (!cn && !conv) continue;
        if (known.has(normalizeRef(cn)) || known.has(normalizeRef(conv))) continue;
        out.push(refFromExternal(e, accountId));
    }

    // Newest first — same ordering as the violations missing-banner.
    out.sort((a, b) => (a.date < b.date ? 1 : -1));
    return out;
}

/** Summary stats for the missing-ticket banner — per-source counts
 *  (verified vs missing) plus totals. The banner uses this to render
 *  the breakdown chips along the same shape the Violations banner does. */
export interface MissingTicketsSummary {
    missingCount: number;
    onFileCount: number;
    /** total candidate refs across all sources (verified + missing). */
    totalRefs: number;
    /** reconciliation percentage (0-100, rounded). */
    matchPct: number;
    /** per-source verified + missing counts for the chip strip. */
    perSource: Array<{
        source: MissingTicketSource;
        short: string;
        tone: string;
        agency: string;
        verified: number;
        missing: number;
        total: number;
    }>;
}

/** Build the summary header for the missing-ticket banner. Verified =
 *  refs whose ticket is on file; Missing = same refs but unmatched. */
export function summarizeMissingTickets(
    accountId: string,
    liveFeeds: ExternalViolationRecord[] = [],
): MissingTicketsSummary {
    const known = ticketRefSetFor(accountId);
    const missing = getMissingTicketsForCarrier(accountId, liveFeeds);
    const missingBySource = new Map<MissingTicketSource, number>();
    for (const m of missing) {
        missingBySource.set(m.source, (missingBySource.get(m.source) ?? 0) + 1);
    }

    // Count verified refs per source — internal violation log + each feed source.
    const verifiedBySource = new Map<MissingTicketSource, number>();
    const violations = CARRIER_VIOLATIONS_BY_CARRIER[accountId] ?? [];
    for (const v of violations) {
        if (v.result !== 'Citation Issued') continue;
        const tn = normalizeRef(v.ticketNumber);
        const cn = normalizeRef(v.citationNumber);
        if (known.has(tn) || known.has(cn) || known.has(`viol:${v.id}`)) {
            verifiedBySource.set(VIOLATION_LOG_SOURCE, (verifiedBySource.get(VIOLATION_LOG_SOURCE) ?? 0) + 1);
        }
    }
    const staticFeeds = EXTERNAL_VIOLATION_FEEDS_BY_CARRIER[accountId] ?? [];
    const seenExt = new Set<string>();
    for (const e of [...liveFeeds, ...staticFeeds]) {
        if (seenExt.has(e.externalId)) continue;
        seenExt.add(e.externalId);
        const cn = normalizeRef(e.citationNumber);
        const conv = normalizeRef(e.convictionNumber);
        if (!cn && !conv) continue;
        if (known.has(cn) || known.has(conv)) {
            verifiedBySource.set(e.source, (verifiedBySource.get(e.source) ?? 0) + 1);
        }
    }

    const sources: MissingTicketSource[] = Array.from(new Set<MissingTicketSource>([
        ...Array.from(verifiedBySource.keys()),
        ...Array.from(missingBySource.keys()),
    ]));
    const perSource = sources.map(src => {
        const meta = MISSING_TICKET_SOURCES[src];
        const verified = verifiedBySource.get(src) ?? 0;
        const miss = missingBySource.get(src) ?? 0;
        return {
            source: src,
            short: meta.short,
            tone: meta.tone,
            agency: meta.agency,
            verified,
            missing: miss,
            total: verified + miss,
        };
    }).filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total);

    const onFileCount  = perSource.reduce((s, b) => s + b.verified, 0);
    const missingCount = perSource.reduce((s, b) => s + b.missing, 0);
    const totalRefs    = onFileCount + missingCount;
    const matchPct     = totalRefs === 0 ? 100 : Math.round((onFileCount / totalRefs) * 100);
    return { missingCount, onFileCount, totalRefs, matchPct, perSource };
}
