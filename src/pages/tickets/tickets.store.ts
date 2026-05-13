/**
 * Cross-page ticket store.
 *
 * Tickets are sourced from two places:
 *   1. The static `MOCK_TICKETS` seed (read-only).
 *   2. User-added tickets — created either directly from the Tickets page or
 *      auto-created when a Violation is saved with a citation/ticket document.
 *
 * This module gives both surfaces a single source of truth backed by
 * `localStorage`, with a `useSyncExternalStore` hook so the Tickets list
 * re-renders the moment a violation save creates a new ticket.
 */

import { useSyncExternalStore } from 'react';
import { MOCK_TICKETS, type TicketRecord, type ViolationType, type TicketIdentifiers } from './tickets.data';
import { getTicketsForCarrier, getAllCarrierTickets } from './carrier-tickets.data';

// ── Storage ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'tracksmart_user_tickets_v1';

function loadFromStorage(): TicketRecord[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as TicketRecord[]) : [];
    } catch { return []; }
}

function persist(list: TicketRecord[]): void {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
}

let userTickets: TicketRecord[] = loadFromStorage();
const listeners = new Set<() => void>();

function notify(): void {
    for (const l of listeners) l();
}

function commit(next: TicketRecord[]): void {
    userTickets = next;
    persist(next);
    notify();
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Read the merged ticket list (seed + user-added). User-added entries
 *  override seed entries that share the same id, so editing a seed ticket
 *  works without mutating the read-only MOCK_TICKETS array. */
export function getAllTickets(): TicketRecord[] {
    const userIds = new Set(userTickets.map(t => t.id));
    const carrierTickets = getAllCarrierTickets();
    const carrierKept = carrierTickets.filter(t => !userIds.has(t.id));
    const seedKept = MOCK_TICKETS.filter(t => !userIds.has(t.id) && !carrierTickets.some(c => c.id === t.id));
    return [...userTickets, ...carrierKept, ...seedKept];
}

/** Tickets scoped to a single carrier (driven by the navbar carrier
 *  dropdown). Returns the carrier's synthesised tickets plus any
 *  user-added entries that target the same accountId. */
export function getTicketsForCarrierAccount(accountId: string): TicketRecord[] {
    const carrier = getTicketsForCarrier(accountId);
    const userForCarrier = userTickets.filter(t => (t as any).accountId === accountId);
    const userIds = new Set(userForCarrier.map(t => t.id));
    const carrierKept = carrier.filter(t => !userIds.has(t.id));
    return [...userForCarrier, ...carrierKept];
}

export function addTicket(ticket: TicketRecord): void {
    // Dedup by offenseNumber so re-saving the same violation doesn't create
    // duplicate tickets — replace the existing entry in place.
    const existing = userTickets.findIndex(t => t.offenseNumber === ticket.offenseNumber);
    if (existing >= 0) {
        const next = [...userTickets];
        next[existing] = ticket;
        commit(next);
    } else {
        commit([ticket, ...userTickets]);
    }
}

export function updateTicket(id: string, patch: Partial<TicketRecord>): void {
    const idx = userTickets.findIndex(t => t.id === id);
    if (idx >= 0) {
        const next = [...userTickets];
        next[idx] = { ...next[idx], ...patch, id };
        commit(next);
        return;
    }
    // Editing a seed ticket — store an override in userTickets so
    // getAllTickets() returns the edited version (user-added wins over
    // same-id seed via the dedup in getAllTickets).
    const seed = MOCK_TICKETS.find(t => t.id === id);
    if (seed) {
        commit([{ ...seed, ...patch, id }, ...userTickets]);
    }
}

export function removeTicket(id: string): void {
    commit(userTickets.filter(t => t.id !== id));
}

// ── React hook ─────────────────────────────────────────────────────────────

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function getSnapshot(): TicketRecord[] {
    return userTickets;
}

/** Subscribe to the merged ticket list. Re-renders when a violation save
 *  creates / updates a ticket from any page. */
export function useTickets(): TicketRecord[] {
    // We track changes via the user-added array reference. The seed is
    // immutable, so the merged result re-derives when userTickets changes.
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    return getAllTickets();
}

/** Carrier-scoped ticket list hook. Re-renders whenever the user-added
 *  store changes; the underlying carrier data is deterministic and
 *  immutable so we don't need to track it separately. */
export function useCarrierTickets(accountId: string | undefined): TicketRecord[] {
    useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    if (!accountId) return getAllTickets();
    return getTicketsForCarrierAccount(accountId);
}

// ── Violation → Ticket mapping ─────────────────────────────────────────────

/** Map a violation category / description to the closest ticket
 *  `ViolationType`. Used when promoting a violation into a Ticket record. */
function inferViolationType(category: string, description: string): ViolationType {
    const text = `${category} ${description}`.toLowerCase();
    if (/speed|mph|over\s*limit/.test(text))             return 'Speeding';
    if (/overweight|axle|gvw/.test(text))                return 'Overweight';
    if (/logbook|log\s*book|hos|hours\s*of\s*service/.test(text)) return 'Logbook violation';
    if (/insurance|liability|coverage/.test(text))       return 'Insurance lapse';
    if (/red\s*light|signal/.test(text))                 return 'Red Light';
    if (/parking|stopping/.test(text))                   return 'Parking';
    return 'Equipment defect';
}

/** Map a violation result + status to a Ticket status. */
function inferTicketStatus(result?: string, status?: string): TicketRecord['status'] {
    if (status === 'Closed' || result === 'Paid' || result === 'Citation Issued' && status === 'Closed')
        return 'Closed';
    if (result === 'Paid')        return 'Paid';
    if (status === 'In Court' || result === 'Under Review') return 'In Court';
    return 'Due';
}

interface AttachedDoc {
    docTypeId?: string;
    docTypeName?: string;
    docNumber?: string;
    issueDate?: string;
    fileName?: string;
    /** Type-specific sub-fields. Open-shape so adding a new doc type
     *  later doesn't require changes here. */
    extras?: {
        officerName?: string;
        officerBadge?: string;
        courtLocation?: string;
        courtDate?: string;
        portalUrl?: string;
        qrReference?: string;
        eIssuingDevice?: string;
    };
}

export interface ViolationLike {
    id?: string;
    date?: string;
    time?: string;
    driverId?: string;
    driverName?: string;
    assetId?: string;
    /** Joined "street, city, state zip" — legacy / fallback. */
    location?: string;
    /** Structured location fields from the violation edit form. */
    locationStreet?: string;
    locationCity?: string;
    locationState?: string;
    locationZip?: string;
    locationCountry?: string;
    description?: string;
    category?: string;
    fineAmount?: number;
    /** Optional secondary fee charged on top of the fine. Both are
     *  carried over to the ticket's fineAmount (sum) for executive
     *  visibility of the total spend. */
    expenseAmount?: number;
    currency?: 'USD' | 'CAD';
    status?: string;
    result?: string;
    // ── Identifiers (flat on the form, nested on the ticket record) ──
    // 1) Citation / Offence
    ticketNumber?: string;
    citationNumber?: string;
    violationTicketNumber?: string;
    offenceNumber?: string;
    offenceNoticeNumber?: string;
    contraventionNumber?: string;
    // 2) Court / Legal
    docketNumber?: string;
    courtCaseNumber?: string;
    courtLocationCode?: string;
    iconCourtCode?: string;
    // 3) Violation / Statute
    violationCode?: string;
    statuteSection?: string;
    // 4) Driver / Asset (as printed on the ticket)
    driverLicenceNumber?: string;
    plateNumber?: string;
    vinNumber?: string;
    // 5) Inspection / Officer
    inspectionReportNumber?: string;
    officerBadgeNumber?: string;
    // 6) Carrier / Operator
    usdotNumber?: string;
    mcNumber?: string;
    cvorNumber?: string;
    nscNumber?: string;
    carrierNumber?: string;
    // 7) Financial
    finePenaltyNumber?: string;
    paymentReferenceNumber?: string;
    receiptNumber?: string;
    /** The form persists docs under `attachedDocuments`; some adapter
     *  paths use `attachedDocs`. Accept either. */
    attachedDocs?: AttachedDoc[];
    attachedDocuments?: AttachedDoc[];
}

/** Project the flat identifier fields off a ViolationLike into the
 *  grouped TicketIdentifiers shape stored on TicketRecord. Returns
 *  undefined when none of the fields are set — keeps the record clean. */
function pickIdentifiers(v: ViolationLike): TicketIdentifiers | undefined {
    const ids: TicketIdentifiers = {
        ticketNumber:            v.ticketNumber || undefined,
        citationNumber:          v.citationNumber || undefined,
        violationTicketNumber:   v.violationTicketNumber || undefined,
        offenceNumber:           v.offenceNumber || undefined,
        offenceNoticeNumber:     v.offenceNoticeNumber || undefined,
        contraventionNumber:     v.contraventionNumber || undefined,
        docketNumber:            v.docketNumber || undefined,
        courtCaseNumber:         v.courtCaseNumber || undefined,
        courtLocationCode:       v.courtLocationCode || undefined,
        iconCourtCode:           v.iconCourtCode || undefined,
        violationCode:           v.violationCode || undefined,
        statuteSection:          v.statuteSection || undefined,
        driverLicenceNumber:     v.driverLicenceNumber || undefined,
        plateNumber:             v.plateNumber || undefined,
        vinNumber:               v.vinNumber || undefined,
        inspectionReportNumber:  v.inspectionReportNumber || undefined,
        officerBadgeNumber:      v.officerBadgeNumber || undefined,
        usdotNumber:             v.usdotNumber || undefined,
        mcNumber:                v.mcNumber || undefined,
        cvorNumber:              v.cvorNumber || undefined,
        nscNumber:               v.nscNumber || undefined,
        carrierNumber:           v.carrierNumber || undefined,
        finePenaltyNumber:       v.finePenaltyNumber || undefined,
        paymentReferenceNumber:  v.paymentReferenceNumber || undefined,
        receiptNumber:           v.receiptNumber || undefined,
    };
    const hasAny = Object.values(ids).some(Boolean);
    return hasAny ? ids : undefined;
}

/** Compose a "City, State" location string from whichever fields the
 *  violation carries. The Tickets list splits the value by comma and
 *  shows the first token as the primary line and the second as the
 *  secondary, so we have to send a clean City/State pair — not the full
 *  street address. */
function composeTicketLocation(v: ViolationLike): string {
    const city = (v.locationCity ?? '').trim();
    const state = (v.locationState ?? '').trim();
    if (city || state) {
        return [city, state].filter(Boolean).join(', ');
    }
    // Fallback — try to recover City, State from a full address. Common
    // shapes:
    //   "street, city, state zip"  → city = parts[1], state = parts[2]
    //   "city, state"              → parts[0], parts[1]
    const parts = (v.location ?? '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return parts.join(', ');
    if (parts.length >= 3) {
        // Drop the leading street, keep the next two segments. Strip a
        // trailing zip from the state segment ("ON M5V 1A1" → "ON").
        const c = parts[1];
        const s = parts[2].replace(/\s+\S+$/, '').trim() || parts[2];
        return [c, s].filter(Boolean).join(', ');
    }
    return v.location ?? '';
}

/** A doc qualifies as a citation/ticket when either the type id, type
 *  name, or document number matches the well-known patterns. Catches
 *  both the paper Ticket (`viol_ticket`) and the electronic eTicket
 *  (`viol_eticket`). */
function isCitationDoc(d: AttachedDoc): boolean {
    if (d.docTypeId === 'viol_ticket' || d.docTypeId === 'viol_eticket') return true;
    const haystack = `${d.docTypeId ?? ''} ${d.docTypeName ?? ''}`;
    if (/ticket|citation|eticket/i.test(haystack)) return true;
    if (/CIT|TKT|ETK/i.test(d.docNumber ?? '')) return true;
    return false;
}

/**
 * Convert a violation record + citation document into a TicketRecord.
 * Returns null when the violation carries no citation / ticket evidence
 * (no doc number, no fine, no ticket/citation number) — those don't
 * belong in the Tickets surface.
 */
export function buildTicketFromViolation(v: ViolationLike): TicketRecord | null {
    const docs = v.attachedDocuments ?? v.attachedDocs ?? [];
    const citationDoc = docs.find(isCitationDoc);
    const offense =
        citationDoc?.docNumber ||
        v.ticketNumber ||
        v.citationNumber ||
        (v.id ? `OFF-${v.id}` : '');

    // Fine + expense roll up into the visible ticket total (matches the
    // "Total (Fine + Expenses)" line in the violation form).
    const fine    = Number(v.fineAmount ?? 0) || 0;
    const expense = Number(v.expenseAmount ?? 0) || 0;
    const total   = fine + expense;

    // A ticket needs *some* identifier — either an offense number or a
    // monetary amount > 0. Otherwise it's not really a ticket and we skip.
    if (!offense && total <= 0) return null;

    // Currency: respect the violation's explicit choice; default by
    // country when not set (Canada → CAD, otherwise USD).
    const currency: 'USD' | 'CAD' =
        v.currency === 'CAD' || v.currency === 'USD'
            ? v.currency
            : /^(CA|Canada)$/i.test(v.locationCountry ?? '')
                ? 'CAD'
                : 'USD';

    const id = v.id ? `TKT-FROM-${v.id}` : `TKT-${Date.now()}`;
    const isElectronic = citationDoc?.docTypeId === 'viol_eticket';

    // Stitch the type-specific extras into the description column so they
    // surface on the Tickets list without needing a new column:
    //   • Paper ticket   → "Officer R. Hayes · Court: Toronto POC · Court Date: …"
    //   • eTicket        → "QR: 44A2-9B71 · Portal: eticket.gov · Device: X300"
    const extraBits: string[] = [];
    if (citationDoc?.extras) {
        const x = citationDoc.extras;
        if (isElectronic) {
            if (x.qrReference)    extraBits.push(`QR ${x.qrReference}`);
            if (x.portalUrl)      extraBits.push(`Portal ${x.portalUrl}`);
            if (x.eIssuingDevice) extraBits.push(`Device ${x.eIssuingDevice}`);
        } else {
            if (x.officerName)    extraBits.push(`Officer ${x.officerName}${x.officerBadge ? ` #${x.officerBadge}` : ''}`);
            if (x.courtLocation)  extraBits.push(`Court ${x.courtLocation}`);
            if (x.courtDate)      extraBits.push(`Court date ${x.courtDate}`);
        }
    }

    return {
        id,
        offenseNumber: offense || `OFF-${id}`,
        date: (citationDoc?.issueDate || v.date || '').slice(0, 10),
        time: v.time ?? '00:00',
        driverId: v.driverId ?? '',
        driverName: v.driverName ?? '',
        assetId: v.assetId ?? '',
        // Compose a clean "City, State" string — the Tickets list splits
        // by comma and shows segments in two stacked lines, so feeding
        // it the full street address would mis-render.
        location: composeTicketLocation(v),
        // Description carries: (1) street-level detail so it isn't lost,
        // (2) original violation description, (3) the type-specific
        // extras the user typed into the form. All separated by ` · `
        // for a tidy single-line read in the table.
        description: [
            v.locationStreet,
            v.description ?? v.category,
            ...extraBits,
        ].filter(Boolean).join(' · ') || (v.description ?? v.category ?? ''),
        violationType: inferViolationType(v.category ?? '', v.description ?? ''),
        violationSubtype: (v as any).violationSubtype || v.description || undefined,
        violationCategory: (v as any).violationCategory || undefined,
        violationGroup:    (v as any).violationGroup    || undefined,
        isOos:             !!(v as any).isOos || undefined,
        fineAmount: total,
        currency,
        status: inferTicketStatus(v.result, v.status),
        // Paper ticket → "ticket file" indicator. eTicket → "notice file"
        // (the eCitation PDF acts as the notice). Letting the row icons
        // distinguish the two kinds at a glance.
        hasTicketFile:  !isElectronic && !!citationDoc?.fileName,
        hasReceiptFile: false,
        hasNoticeFile:  isElectronic   && !!citationDoc?.fileName,
        assignedToThirdParty: !!(v as any).assignedToThirdParty,
        ticketKind: isElectronic ? 'Electronic' : 'Paper',
        ticketDetails: citationDoc?.extras
            ? {
                officerName:     citationDoc.extras.officerName,
                officerBadge:    citationDoc.extras.officerBadge,
                courtLocation:   citationDoc.extras.courtLocation,
                courtDate:       citationDoc.extras.courtDate,
                portalUrl:       citationDoc.extras.portalUrl,
                qrReference:     citationDoc.extras.qrReference,
                eIssuingDevice:  citationDoc.extras.eIssuingDevice,
            }
            : undefined,
        // Identifiers come from two places: (a) the carrier/driver/asset
        // entities the user picked (flowed in via `v`), and (b) the
        // citation document itself — for example the ticket #, court
        // date, and statute section. Merging both so the saved ticket
        // carries everything the user entered.
        identifiers: (() => {
            const base = pickIdentifiers(v) ?? {};
            if (citationDoc) {
                if (isElectronic) {
                    if (citationDoc.docNumber) base.violationTicketNumber = citationDoc.docNumber;
                } else if (citationDoc.docTypeId === 'viol_ticket') {
                    if (citationDoc.docNumber) base.ticketNumber = citationDoc.docNumber;
                }
            }
            return Object.values(base).some(Boolean) ? base : undefined;
        })(),
    };
}

/**
 * High-level helper called from the violation save flow. Returns the
 * created ticket (or null when the violation doesn't qualify).
 */
export function syncTicketFromViolation(v: ViolationLike): TicketRecord | null {
    const ticket = buildTicketFromViolation(v);
    if (!ticket) return null;
    addTicket(ticket);
    return ticket;
}
