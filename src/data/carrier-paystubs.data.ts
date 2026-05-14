/**
 * Per-carrier Paystubs (deterministic mock data).
 *
 * For every carrier in `ACCOUNTS_DB` we synthesise the last 6 pay periods
 * (bi-monthly: 1st–15th, 16th–EOM) for every active driver, referencing
 * real driver ids + names from CARRIER_DRIVERS. Currency is set from the
 * carrier's country (CAD for Canada, USD elsewhere).
 *
 * Same pattern as the other carrier-scoped data files — PaystubsPage
 * rescopes automatically when the navbar carrier dropdown changes.
 */

import { ACCOUNTS_DB, type AccountRecord } from '@/pages/accounts/accounts.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { hash, mulberry32, pick } from '@/pages/accounts/carrier-fleet-shared.data';
import type { Paystub } from './paystubs.data';

const DEDUCTION_DESCS = [
    'Insurance', 'Health Insurance', '401(k) Contribution', 'Union Dues',
    'Cash Advance Repayment', 'Fuel Card Reconciliation', 'Garnishment',
];

const STATUS_MIX: Array<Paystub['status']> = ['Paid', 'Paid', 'Paid', 'Paid', 'Pending', 'Processing'];

// Cycle through Tailwind avatar swatches so the page's existing colour
// chips render even when CARRIER_DRIVERS doesn't carry one.
const AVATAR_PALETTE = [
    'bg-blue-100 text-blue-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-violet-100 text-violet-700',
    'bg-sky-100 text-sky-700',
    'bg-fuchsia-100 text-fuchsia-700',
    'bg-teal-100 text-teal-700',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fullName(d: any): string {
    return `${d.firstName ?? ''} ${d.lastName ?? d.name ?? ''}`.trim() || (d.name ?? 'Driver');
}
function initials(d: any): string {
    const parts = fullName(d).split(/\s+/);
    return ((parts[0]?.[0] ?? 'D') + (parts[1]?.[0] ?? 'R')).toUpperCase();
}

/** Pay-period strings + the iso date the paystub was cut. */
function periodWindows(): Array<{ payPeriod: string; date: string; paidDate: string }> {
    const out: Array<{ payPeriod: string; date: string; paidDate: string }> = [];
    const today = new Date();
    today.setDate(1);
    // 6 periods = 3 months back, bi-monthly.
    for (let i = 0; i < 6; i++) {
        const periodEnd = new Date(today);
        periodEnd.setDate(periodEnd.getDate() - 1); // last day of prior half
        const half = i % 2 === 0 ? 1 : 2; // alternate halves
        if (half === 1) {
            // 1st–15th of `periodEnd`'s month
            periodEnd.setDate(15);
            const start = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
            const cutDate = new Date(periodEnd);
            cutDate.setDate(16);
            const paid = new Date(cutDate); paid.setDate(paid.getDate() + 2);
            out.push({
                payPeriod: `${monthShort(start)} 01 - ${monthShort(periodEnd)} 15`,
                date: cutDate.toISOString().slice(0, 10),
                paidDate: paid.toISOString().slice(0, 10),
            });
        } else {
            // 16th–EOM
            const lastDay = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 0).getDate();
            const start = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 16);
            const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), lastDay);
            const cutDate = new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 1);
            const paid = new Date(cutDate); paid.setDate(paid.getDate() + 2);
            out.push({
                payPeriod: `${monthShort(start)} 16 - ${monthShort(end)} ${lastDay}`,
                date: cutDate.toISOString().slice(0, 10),
                paidDate: paid.toISOString().slice(0, 10),
            });
        }
        // Step back ~15 days for next loop.
        today.setDate(today.getDate() - 15);
    }
    return out;
}

function monthShort(d: Date): string {
    return d.toLocaleString('en-US', { month: 'short' });
}

// ── Builder ────────────────────────────────────────────────────────────────

function buildForCarrier(account: AccountRecord): Paystub[] {
    const r = mulberry32(hash(`paystubs:${account.id}`));
    const drivers = CARRIER_DRIVERS[account.id] ?? [];
    if (drivers.length === 0) return [];

    const isCanada = account.country === 'CA';
    const currency: Paystub['currency'] = isCanada ? 'CAD' : 'USD';
    const distanceUnit: Paystub['distanceUnit'] = isCanada ? 'km' : 'mi';
    const periods = periodWindows();
    const out: Paystub[] = [];
    let seq = 0;

    for (const driver of drivers) {
        // Skip terminated drivers entirely — they don't appear on paystubs.
        if (((driver as any).status ?? '').toLowerCase() === 'terminated') continue;

        const name = fullName(driver);
        const driverId = driver.id;
        const ratePerUnit = +(0.55 + r() * 0.25).toFixed(3); // $/mi or $/km
        const baseAvatar = AVATAR_PALETTE[hash(driverId) % AVATAR_PALETTE.length];

        for (let p = 0; p < periods.length; p++) {
            const period = periods[p];
            const miles = Math.round(1800 + r() * 1500);
            const grossPay = +(miles * ratePerUnit).toFixed(2);
            const deductions = +(120 + r() * 80).toFixed(2);
            const taxes = +(grossPay * (0.13 + r() * 0.05)).toFixed(2);
            const reimbursement = r() < 0.3 ? +(20 + r() * 80).toFixed(2) : 0;
            const netPay = +(grossPay - deductions - taxes + reimbursement).toFixed(2);

            out.push({
                id: hash(`${account.id}:${driverId}:${period.date}`) + (++seq),
                driverId,
                driverName: name,
                date: period.date,
                payPeriod: period.payPeriod,
                miles,
                distanceUnit,
                currency,
                grossPay,
                deductions,
                taxes,
                deductionDesc: pick(r, DEDUCTION_DESCS),
                reimbursement,
                netPay,
                paidDate: period.paidDate,
                status: pick(r, STATUS_MIX),
                avatar: initials(driver),
                color: baseAvatar,
                hasUpload: r() < 0.4,
                fileName: r() < 0.4 ? `paystub-${period.date}.pdf` : undefined,
            });
        }
    }

    // Newest cut date first.
    out.sort((a, b) => (a.date < b.date ? 1 : -1));
    return out;
}

// ── Public surface ─────────────────────────────────────────────────────────

const built = (() => {
    const byCarrier: Record<string, Paystub[]> = {};
    for (const account of ACCOUNTS_DB) {
        byCarrier[account.id] = buildForCarrier(account);
    }
    return byCarrier;
})();

export const CARRIER_PAYSTUBS_BY_ID: Record<string, Paystub[]> = built;

/** Paystubs scoped to one carrier. Empty when no active drivers. */
export function getPaystubsForCarrier(accountId: string): Paystub[] {
    return built[accountId] ?? [];
}
