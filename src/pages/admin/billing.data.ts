// Mock billing data — subscriptions and transactions derived deterministically
// from the existing SERVICE_PROFILES_DB. No randomness: same inputs → same
// output on every load, so the Super Admin Dashboard renders consistently.

import { SERVICE_PROFILES_DB, ACCOUNT_LIMIT_UNLIMITED } from "@/pages/accounts/service-profiles.data";

export type SubscriptionTier = "Starter" | "Pro" | "Enterprise";
export type SubscriptionStatus = "Active" | "Trial" | "Past Due" | "Cancelled";
export type TransactionStatus = "Paid" | "Pending" | "Failed" | "Refunded";
export type TransactionType = "Subscription" | "Setup Fee" | "Add-on" | "Refund";
export type PaymentMethod = "Card" | "ACH" | "Wire";

export interface TierConfig {
    name: SubscriptionTier;
    monthlyPrice: number;
    /** Infinity for unlimited */
    carrierLimit: number;
    color: string;
    blurb: string;
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
    Starter: {
        name: "Starter",
        monthlyPrice: 99,
        carrierLimit: 5,
        color: "#64748b",
        blurb: "Up to 5 carriers · Basic compliance",
    },
    Pro: {
        name: "Pro",
        monthlyPrice: 299,
        carrierLimit: 25,
        color: "#2563eb",
        blurb: "Up to 25 carriers · Full compliance suite",
    },
    Enterprise: {
        name: "Enterprise",
        monthlyPrice: 999,
        carrierLimit: Infinity,
        color: "#8b5cf6",
        blurb: "Unlimited carriers · White-label · SLA",
    },
};

export const TIER_ORDER: SubscriptionTier[] = ["Starter", "Pro", "Enterprise"];

export interface Subscription {
    id: string;
    serviceProfileId: string;
    serviceProfileName: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    /** ISO date */
    startDate: string;
    /** ISO date */
    nextBillingDate: string;
    monthlyAmount: number;
    seats: number;
}

export interface Transaction {
    id: string;
    invoiceNumber: string;
    subscriptionId: string;
    serviceProfileId: string;
    serviceProfileName: string;
    /** ISO date */
    date: string;
    amount: number;
    status: TransactionStatus;
    type: TransactionType;
    method: PaymentMethod;
    tier: SubscriptionTier;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function hashString(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
}

function tierFor(accountLimit: number): SubscriptionTier {
    if (accountLimit === ACCOUNT_LIMIT_UNLIMITED) return "Enterprise";
    if (accountLimit >= 8) return "Pro";
    return "Starter";
}

function subscriptionStatusFor(status: string): SubscriptionStatus {
    switch (status) {
        case "Active":
            return "Active";
        case "Pending":
            return "Trial";
        case "Suspended":
            return "Past Due";
        case "Inactive":
            return "Cancelled";
        default:
            return "Active";
    }
}

function isoDate(d: Date): string {
    return d.toISOString().slice(0, 10);
}

// Reference "now" for billing windows. We freeze it to the current build/render
// moment so the 12-month window is stable inside a single session.
const NOW = new Date();

function addMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
}

// ── Subscriptions ───────────────────────────────────────────────────────────

export const SUBSCRIPTIONS: Subscription[] = SERVICE_PROFILES_DB.map((sp) => {
    const tier = tierFor(sp.accountLimit);
    const status = subscriptionStatusFor(sp.status);
    const config = TIER_CONFIG[tier];
    const seats = Math.max(sp.accountsCreated, 1);

    // Next billing = first of next month (Past Due → "today" to look overdue)
    const nextBilling =
        status === "Past Due"
            ? NOW
            : new Date(NOW.getFullYear(), NOW.getMonth() + 1, 1);

    return {
        id: `sub-${sp.id.replace("svc-", "")}`,
        serviceProfileId: sp.id,
        serviceProfileName: sp.dbaName || sp.legalName,
        tier,
        status,
        startDate: sp.createdAt,
        nextBillingDate: isoDate(nextBilling),
        monthlyAmount: config.monthlyPrice,
        seats,
    };
});

// ── Transactions ────────────────────────────────────────────────────────────
// 12 months of subscription invoices per active/past-due/cancelled subscription
// (cancelled ones cut off at month 6). Trials don't bill yet.
// A few setup fees on the first invoice. Status is mostly Paid with a small
// number of Pending/Failed/Refunded sprinkled in deterministically.

const TX_STATUS_DIST: TransactionStatus[] = [
    "Paid", "Paid", "Paid", "Paid", "Paid", "Paid",
    "Paid", "Paid", "Pending", "Failed", "Refunded", "Paid",
];

const PAYMENT_METHOD_DIST: PaymentMethod[] = ["Card", "Card", "Card", "ACH", "ACH", "Wire"];

function buildTransactions(): Transaction[] {
    const out: Transaction[] = [];
    let counter = 1000;

    for (const sub of SUBSCRIPTIONS) {
        const seed = hashString(sub.id);

        // Trial subscriptions don't have transactions yet.
        if (sub.status === "Trial") continue;

        // Cancelled = stopped 6 months ago. Active/Past Due = full 12 months.
        const monthsBack = sub.status === "Cancelled" ? 6 : 12;

        for (let i = monthsBack - 1; i >= 0; i--) {
            // Bill on the 1st of each historical month, working backwards.
            const billDate = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
            // Don't generate transactions older than the subscription's start.
            if (billDate < new Date(sub.startDate)) continue;

            const distIdx = (seed + i) % TX_STATUS_DIST.length;
            let status: TransactionStatus = TX_STATUS_DIST[distIdx];

            // The most recent month for a Past Due subscription is unpaid.
            if (sub.status === "Past Due" && i === 0) status = "Failed";
            // Active subscriptions never have a Failed most-recent invoice.
            if (sub.status === "Active" && i === 0 && status === "Failed") status = "Paid";

            const method = PAYMENT_METHOD_DIST[(seed + i) % PAYMENT_METHOD_DIST.length];

            counter += 1;
            out.push({
                id: `tx-${counter}`,
                invoiceNumber: `INV-${billDate.getFullYear()}${String(billDate.getMonth() + 1).padStart(2, "0")}-${sub.id.split("-")[1]}`,
                subscriptionId: sub.id,
                serviceProfileId: sub.serviceProfileId,
                serviceProfileName: sub.serviceProfileName,
                date: isoDate(billDate),
                amount:
                    status === "Refunded"
                        ? -sub.monthlyAmount
                        : sub.monthlyAmount,
                status,
                type: "Subscription",
                method,
                tier: sub.tier,
            });
        }

        // One-off setup fee on the first month for ~half of subscriptions.
        if ((seed % 2 === 0) && monthsBack > 0) {
            const setupDate = new Date(sub.startDate);
            counter += 1;
            out.push({
                id: `tx-${counter}`,
                invoiceNumber: `INV-${setupDate.getFullYear()}${String(setupDate.getMonth() + 1).padStart(2, "0")}-${sub.id.split("-")[1]}-SETUP`,
                subscriptionId: sub.id,
                serviceProfileId: sub.serviceProfileId,
                serviceProfileName: sub.serviceProfileName,
                date: sub.startDate,
                amount: sub.tier === "Enterprise" ? 2500 : sub.tier === "Pro" ? 750 : 250,
                status: "Paid",
                type: "Setup Fee",
                method: "Wire",
                tier: sub.tier,
            });
        }

        // Occasional add-on for Pro/Enterprise (extra seats) — one per recent month.
        if (sub.tier !== "Starter" && (seed % 3 === 0)) {
            const addOnDate = addMonths(NOW, -2);
            addOnDate.setDate(15);
            counter += 1;
            out.push({
                id: `tx-${counter}`,
                invoiceNumber: `INV-${addOnDate.getFullYear()}${String(addOnDate.getMonth() + 1).padStart(2, "0")}-${sub.id.split("-")[1]}-ADDON`,
                subscriptionId: sub.id,
                serviceProfileId: sub.serviceProfileId,
                serviceProfileName: sub.serviceProfileName,
                date: isoDate(addOnDate),
                amount: sub.tier === "Enterprise" ? 350 : 150,
                status: "Paid",
                type: "Add-on",
                method: "Card",
                tier: sub.tier,
            });
        }
    }

    // Newest first.
    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return out;
}

export const TRANSACTIONS: Transaction[] = buildTransactions();

// ── Aggregations ────────────────────────────────────────────────────────────

export interface MonthlyRevenuePoint {
    /** "YYYY-MM" */
    month: string;
    /** "Mon 'YY" — pretty axis label */
    label: string;
    revenue: number;
    count: number;
}

export function getMonthlyRevenue(months = 12): MonthlyRevenuePoint[] {
    const buckets = new Map<string, MonthlyRevenuePoint>();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(NOW.getFullYear(), NOW.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
        buckets.set(key, { month: key, label, revenue: 0, count: 0 });
    }
    for (const tx of TRANSACTIONS) {
        const key = tx.date.slice(0, 7);
        const bucket = buckets.get(key);
        if (!bucket) continue;
        if (tx.status === "Paid") {
            bucket.revenue += tx.amount;
            bucket.count += 1;
        } else if (tx.status === "Refunded") {
            bucket.revenue += tx.amount; // amount is already negative
            bucket.count += 1;
        }
    }
    return Array.from(buckets.values());
}

export interface BillingTotals {
    totalTransactions: number;
    totalRevenue: number;
    paidRevenue: number;
    refundedAmount: number;
    pendingAmount: number;
    failedAmount: number;
    avgTransaction: number;
    failedRate: number;
    mrr: number;
    arr: number;
    activeSubs: number;
    trialSubs: number;
    pastDueSubs: number;
    cancelledSubs: number;
}

export function getBillingTotals(): BillingTotals {
    let paidRevenue = 0;
    let refundedAmount = 0;
    let pendingAmount = 0;
    let failedAmount = 0;
    let paidCount = 0;
    let totalCount = TRANSACTIONS.length;

    for (const tx of TRANSACTIONS) {
        if (tx.status === "Paid") {
            paidRevenue += tx.amount;
            paidCount += 1;
        } else if (tx.status === "Refunded") {
            refundedAmount += Math.abs(tx.amount);
        } else if (tx.status === "Pending") {
            pendingAmount += tx.amount;
        } else if (tx.status === "Failed") {
            failedAmount += tx.amount;
        }
    }

    const totalRevenue = paidRevenue + refundedAmount * -1; // net of refunds
    const avgTransaction = paidCount > 0 ? paidRevenue / paidCount : 0;
    const failedCount = TRANSACTIONS.filter((t) => t.status === "Failed").length;
    const failedRate = totalCount > 0 ? (failedCount / totalCount) * 100 : 0;

    let mrr = 0;
    let activeSubs = 0;
    let trialSubs = 0;
    let pastDueSubs = 0;
    let cancelledSubs = 0;

    for (const sub of SUBSCRIPTIONS) {
        if (sub.status === "Active" || sub.status === "Past Due") {
            mrr += sub.monthlyAmount;
        }
        if (sub.status === "Active") activeSubs += 1;
        if (sub.status === "Trial") trialSubs += 1;
        if (sub.status === "Past Due") pastDueSubs += 1;
        if (sub.status === "Cancelled") cancelledSubs += 1;
    }

    return {
        totalTransactions: totalCount,
        totalRevenue,
        paidRevenue,
        refundedAmount,
        pendingAmount,
        failedAmount,
        avgTransaction,
        failedRate,
        mrr,
        arr: mrr * 12,
        activeSubs,
        trialSubs,
        pastDueSubs,
        cancelledSubs,
    };
}

// ── Currency formatter ──────────────────────────────────────────────────────

export const formatUsd = (n: number, opts?: { compact?: boolean }): string => {
    if (opts?.compact && Math.abs(n) >= 1000) {
        const isNeg = n < 0;
        const abs = Math.abs(n);
        if (abs >= 1_000_000) {
            return `${isNeg ? "-" : ""}$${(abs / 1_000_000).toFixed(1)}M`;
        }
        return `${isNeg ? "-" : ""}$${(abs / 1000).toFixed(1)}K`;
    }
    return n.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    });
};
