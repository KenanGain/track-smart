import { VIOLATION_DATA } from '@/data/violations.data';
import type { TicketViolation } from './tickets.data';

// Quick charge presets shown as toggle chips on the ticket form. Each is a
// violation "type" — selecting one adds it to the ticket's violations list.
export const CHARGE_PRESETS = [
    'Speeding',
    'Improper Lane Change',
    'Failure to Yield',
    'Following Too Closely',
    'Running Red Light / Stop Sign',
    'Distracted Driving',
    'Improper Turn',
    'Failure to Obey Traffic Control',
] as const;

// "Select all that apply" penalty / fine types applied to a ticket.
export const PENALTY_OPTIONS = ['Fine', 'Suspension', 'Revocation', 'Community Service', 'Other'] as const;

// Each quick charge preset maps to a concrete SMS/CVOR violation code in the
// master chart, so selecting the chip fills in the real code + category + group
// (e.g. "Speeding" → [392.2S]) instead of a bare label-only entry.
export const PRESET_CODES: Record<string, string> = {
    'Speeding':                        '392.2S',
    'Improper Lane Change':            '392.2LC',
    'Failure to Yield':                '392.2Y',
    'Following Too Closely':           '392.2FC',
    'Running Red Light / Stop Sign':   '392.2C',
    'Distracted Driving':              '390.17DT',
    'Improper Turn':                   '392.2T',
    'Failure to Obey Traffic Control': '392.2C',
    // 'Other' has no specific code — added as a plain label.
};

/** Map a master-chart violation description to one of the narrow
 *  TicketRecord violationType buckets so the list view can keep showing a
 *  colour-coded badge. Simple keyword match — same heuristic the store uses. */
export function narrowTypeFor(description: string, group?: string): string {
    const text = `${description} ${group ?? ''}`.toLowerCase();
    if (/speed|mph|over\s*limit|kph|excess/.test(text))                return 'Speeding';
    if (/overweight|axle|gvw|gross\s*weight/.test(text))               return 'Overweight';
    if (/logbook|log\s*book|hos|hours\s*of\s*service|eld/.test(text))  return 'Logbook violation';
    if (/insurance|liability|coverage/.test(text))                     return 'Insurance lapse';
    if (/red\s*light|signal|stop\s*sign/.test(text))                   return 'Red Light';
    if (/parking|stopping|stopped/.test(text))                         return 'Parking';
    return 'Equipment defect';
}

/** Find a violation item by its code in the master chart, plus its category label. */
export function findViolationByCode(code: string): { item: any; categoryLabel: string } | null {
    for (const [catKey, cat] of Object.entries(VIOLATION_DATA.categories)) {
        const item = cat.items.find(i => i.violationCode === code);
        if (item) return { item, categoryLabel: (cat as any).label ?? catKey.replace(/_/g, ' ') };
    }
    return null;
}

/** Build an enriched preset violation from a charge label — fills the real
 *  code + category + group when the preset maps to a master-chart code. */
export function violationFromCharge(charge: string): TicketViolation {
    const code = PRESET_CODES[charge];
    const match = code ? findViolationByCode(code) : null;
    return match
        ? {
            label: charge,
            type: narrowTypeFor(match.item.violationDescription, match.item.violationGroup),
            subtype: match.item.violationDescription,
            category: match.categoryLabel,
            group: match.item.violationGroup,
            code: match.item.violationCode,
            isOos: !!match.item.isOos,
            source: 'preset',
            dataId: match.item.id,
        }
        : { label: charge, type: narrowTypeFor(charge), source: 'preset' };
}
