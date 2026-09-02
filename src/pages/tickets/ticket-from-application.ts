import type { TicketRecord, TicketViolation } from './tickets.data';
import type { Incident } from '@/pages/hiring-process/ApplicationSettingsPage';

/** Pull a representative number out of a fine-amount range string
 *  (e.g. "$100 - $250" → 100). Returns 0 when no number is present. */
function parseFineRange(s?: string): number {
    const nums = (s ?? '').match(/\d[\d,]*/g);
    if (!nums || !nums.length) return 0;
    return Number(nums[0].replace(/,/g, '')) || 0;
}

const yn = (v?: string): boolean | undefined => (v === 'Yes' ? true : v === 'No' ? false : undefined);

/**
 * Build ticket records from a driver's self-reported application violations.
 * Each Incident becomes ONE ticket linked to the driver, so traffic violations
 * entered on the Hiring / Add-Driver form show up in the Tickets list by default.
 *
 * Ids/offense numbers are deterministic per (driver, index) so re-saving an edit
 * updates the same tickets in place (addTicket dedups by offenseNumber).
 */
export function ticketsFromApplicationIncidents(
    incidents: Incident[] | undefined,
    driver: { id: string; name?: string; assetId?: string },
    accountId?: string,
): TicketRecord[] {
    return (incidents ?? [])
        // Skip empty rows — needs at least a violation, a penalty or a fine amount.
        .filter(inc => (inc.violations?.length ?? 0) > 0 || (inc.penalties?.length ?? 0) > 0 || !!inc.fineAmount)
        .map((inc, idx) => {
            const violations: TicketViolation[] = inc.violations ?? [];
            const primary = violations[0];
            const date = inc.date?.m && inc.date?.y
                ? `${inc.date.y}-${String(inc.date.m).padStart(2, '0')}-01`
                : '';
            const ticket = {
                id: `TKT-APP-${driver.id}-${idx}`,
                offenseNumber: `OFF-APP-${driver.id}-${idx}`,
                date,
                time: '00:00',
                driverId: driver.id,
                driverName: driver.name ?? '',
                assetId: driver.assetId ?? '',
                location: inc.state || '',
                description: ['Reported on driver application', inc.comments].filter(Boolean).join(' · '),
                violationType: (primary?.type as TicketRecord['violationType']) ?? 'Speeding',
                violationSubtype: primary?.subtype || primary?.label,
                violationCategory: primary?.category,
                violationGroup: primary?.group,
                isOos: inc.outOfService === 'Yes',
                violations: violations.length ? violations : undefined,
                fineAmount: parseFineRange(inc.fineAmount),
                currency: 'USD' as const,
                status: 'Closed' as const,   // historical, self-reported conviction
                hasTicketFile: false,
                hasReceiptFile: false,
                hasNoticeFile: false,
                outOfService: yn(inc.outOfService),
                commercialVehicle: yn(inc.commercial),
                penalties: inc.penalties?.length ? inc.penalties : undefined,
                demeritPoints: inc.penaltyPoints ? Number(inc.penaltyPoints) || undefined : undefined,
                identifiers: primary?.code ? { violationCode: primary.code } : undefined,
            } as TicketRecord;
            // accountId is read off tickets via `(t as any).accountId` for carrier scoping.
            if (accountId) (ticket as any).accountId = accountId;
            return ticket;
        });
}
