// ─────────────────────────────────────────────────────────────────────────────
// VendorPage — one shop, and everything the fleet has with it.
//
// The gap this closes
// ───────────────────
// A vendor was a row in a list: a name, an address, a phone number. Everything that
// actually matters about a shop is what it has DONE and what it has COST, and that was
// scattered across four modules — the work orders raised with it, the services filed
// against it, the repair bills from roadside inspections, and the inventory filed under
// it. "What do we spend with this company, and what have they touched" had no answer
// anywhere, which is the question asked before a contract is renewed or argued about.
//
// Nothing here is stored a second time. Every tab is the same records the module it comes
// from shows, read through one filter: this vendor.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
    ArrowLeft, Store, Mail, Phone, MapPin, UserRound, Briefcase, Package, Receipt,
    LayoutGrid, Activity as ActivityIcon, Share2, Pencil, FileText, Truck,
    CalendarClock, Wrench, ShieldAlert,
} from 'lucide-react';
import { ProfileTabs } from '@/components/ui/ProfileTabs';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
import { TH, TD, COL_RULE, RowIcon, EmptyRow, TableScroll } from '@/components/ui/CatalogTable';
import { WorkOrdersTable, type WorkOrderRow } from '@/components/maintenance/WorkOrdersTable';
import { cn } from '@/lib/utils';

/** One thing the carrier holds that came from this vendor. */
export interface VendorInventoryRow {
    id: string;
    name: string;
    category?: string;
    serial?: string;
    /** The unit or the person it is filed against. */
    assignedTo?: string;
    status: string;
    expiryDate?: string;
}

/**
 * One bill from this vendor, whichever screen filed it.
 *
 * The two sources are genuinely different events — a roadside inspection's repair bill is
 * work the fleet did not plan, a service record is work it did — and they are the same
 * question to the vendor: what have we paid you. So they are one list with the source
 * written on the row, rather than two lists that have to be added up by hand.
 */
export interface VendorBillRow {
    id: string;
    source: 'roadside' | 'service';
    date: string;
    /** What the shop knows it by, and what the payable line is matched against. */
    invoiceNumber?: string;
    /** What it was for — the inspection, or the interval it satisfied. */
    reference: string;
    assetLabel?: string;
    labour?: number;
    parts?: number;
    total: number;
    currency: string;
    files: number;
    /** Open the record it came off, where there is one to open. */
    openId?: string;
}

export interface VendorDetail {
    id: string;
    name: string;
    companyName?: string;
    categoryLabel?: string;
    status: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    items: VendorInventoryRow[];
    orders: WorkOrderRow[];
    bills: VendorBillRow[];
    activity: ActivityEntry[];
}

const shortDate = (iso?: string) => (iso
    ? new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—');

const money = (n: number, currency: string) =>
    `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Stat({ label, children, Icon }: { label: string; children: React.ReactNode; Icon: React.ElementType }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon size={15} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{children}</div>
        </div>
    );
}

function Field({ label, value, Icon }: { label: string; value?: React.ReactNode; Icon?: React.ElementType }) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-800">
                {Icon && <Icon size={13} className="shrink-0 text-slate-400" />}
                <span className="truncate">{value ?? <span className="text-slate-300">—</span>}</span>
            </div>
        </div>
    );
}

const SOURCE = {
    roadside: { label: 'Roadside repair', cls: 'border-amber-200 bg-amber-50 text-amber-700', Icon: ShieldAlert },
    service: { label: 'Service record', cls: 'border-blue-200 bg-blue-50 text-blue-700', Icon: Wrench },
} as const;

export function VendorPage({
    vendor, onBack, backLabel = 'Vendors', onEdit, onShare, onOpenOrder, onOpenBill, onOpenItem,
}: {
    vendor: VendorDetail;
    onBack: () => void;
    /**
     * Where Back goes, in words.
     *
     * The same page is opened from the maintenance vendor list and from the inventory one,
     * and a button that says "Vendors" when you came from Inventory is a small lie that
     * costs a click to find out about.
     */
    backLabel?: string;
    onEdit?: () => void;
    onShare?: () => void;
    onOpenOrder?: (orderId: string) => void;
    /** Open whatever filed the bill — the service record, or the inspection. */
    onOpenBill?: (bill: VendorBillRow) => void;
    onOpenItem?: (itemId: string) => void;
}) {
    type Tab = 'overview' | 'inventory' | 'orders' | 'bills' | 'activity';
    const [tab, setTab] = useState<Tab>('overview');
    const [billSource, setBillSource] = useState<'all' | 'roadside' | 'service'>('all');

    /*
     * What this vendor has cost, per currency.
     *
     * Never one number. A cross-border fleet pays the same shop in both, and adding USD
     * to CAD to get a single "spend" figure produces a number that is wrong in both
     * currencies and looks authoritative in neither.
     */
    const spend = useMemo(() => {
        const by = new Map<string, { total: number; roadside: number; service: number; count: number }>();
        for (const b of vendor.bills) {
            const at = by.get(b.currency) ?? { total: 0, roadside: 0, service: 0, count: 0 };
            at.total += b.total;
            at[b.source] += b.total;
            at.count += 1;
            by.set(b.currency, at);
        }
        return [...by.entries()].sort((a, b) => b[1].total - a[1].total);
    }, [vendor.bills]);

    const shownBills = useMemo(
        () => (billSource === 'all' ? vendor.bills : vendor.bills.filter((b) => b.source === billSource)),
        [vendor.bills, billSource],
    );
    /** The totals of what is on screen, not of everything — a filtered list that shows an
     *  unfiltered total is the quickest way to make somebody mistrust the whole page. */
    const shownTotals = useMemo(() => {
        const by = new Map<string, number>();
        for (const b of shownBills) by.set(b.currency, (by.get(b.currency) ?? 0) + b.total);
        return [...by.entries()];
    }, [shownBills]);

    const openOrders = vendor.orders.filter((o) => o.state === 'open').length;
    const lastJob = [...vendor.bills].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const counts = {
        roadside: vendor.bills.filter((b) => b.source === 'roadside').length,
        service: vendor.bills.filter((b) => b.source === 'service').length,
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                    <ArrowLeft size={15} /> {backLabel}
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Store size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">{vendor.name}</h1>
                                <span className={cn(
                                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                    vendor.status === 'Active'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-slate-200 bg-slate-100 text-slate-500',
                                )}>
                                    {vendor.status}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                                {[
                                    vendor.companyName,
                                    vendor.categoryLabel,
                                    `${vendor.orders.length} work order${vendor.orders.length === 1 ? '' : 's'}`,
                                    `${vendor.bills.length} bill${vendor.bills.length === 1 ? '' : 's'}`,
                                ].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <Pencil size={15} /> Edit
                            </button>
                        )}
                        {onShare && (
                            <button
                                type="button"
                                onClick={onShare}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <Share2 size={15} /> Share
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ProfileTabs
                ariaLabel="Vendor sections"
                activeId={tab}
                onChange={(id) => setTab(id as Tab)}
                className="shrink-0"
                tabs={[
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    { id: 'inventory', label: 'Inventory', icon: Package, count: vendor.items.length },
                    { id: 'orders', label: 'Work Orders', icon: Briefcase, count: vendor.orders.length },
                    { id: 'bills', label: 'Repair bills', icon: Receipt, count: vendor.bills.length },
                    { id: 'activity', label: 'Activity', icon: ActivityIcon, count: vendor.activity.length },
                ]}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6">
                    {/* ── Overview ── who they are, and what they have come to. */}
                    {tab === 'overview' && (<>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            <Stat label="Total spent" Icon={Receipt}>
                                {spend.length === 0
                                    ? <span className="text-slate-400">Nothing billed</span>
                                    : spend.slice(0, 2).map(([cur, v], i) => (
                                        <span key={cur} className={cn('block tabular-nums',
                                            i > 0 && 'text-[12px] font-semibold text-slate-500')}>
                                            {money(v.total, cur)}
                                        </span>
                                    ))}
                                {spend.length > 2 && (
                                    <span className="block text-[11px] font-medium text-slate-400">
                                        +{spend.length - 2} more currenc{spend.length - 2 === 1 ? 'y' : 'ies'}
                                    </span>
                                )}
                            </Stat>
                            <Stat label="Bills" Icon={FileText}>
                                <span className="tabular-nums">{vendor.bills.length}</span>
                                <span className="block text-[11px] font-medium text-slate-500">
                                    {counts.service} service · {counts.roadside} roadside
                                </span>
                            </Stat>
                            <Stat label="Work orders" Icon={Briefcase}>
                                <span className="tabular-nums">{vendor.orders.length}</span>
                                <span className="block text-[11px] font-medium text-slate-500">
                                    {openOrders} still open
                                </span>
                            </Stat>
                            <Stat label="Inventory" Icon={Package}>
                                <span className="tabular-nums">{vendor.items.length}</span>
                                <span className="block text-[11px] font-medium text-slate-500">
                                    {vendor.items.length === 1 ? 'item' : 'items'} on the fleet
                                </span>
                            </Stat>
                            <Stat label="Last job" Icon={CalendarClock}>
                                {lastJob ? shortDate(lastJob.date) : <span className="text-slate-400">Never</span>}
                            </Stat>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-bold text-slate-900">How to reach them</h2>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <Field label="Contact" value={vendor.contactName} Icon={UserRound} />
                                <Field label="Email" value={vendor.email} Icon={Mail} />
                                <Field label="Phone" value={vendor.phone} Icon={Phone} />
                                <Field label="Address" value={vendor.address} Icon={MapPin} />
                            </div>
                        </div>

                        {/*
                          * Costs, one card per currency.
                          *
                          * Never one number and never one bar. A cross-border fleet pays the
                          * same shop in both dollars, and the two are separate facts: adding
                          * them produces a figure that is wrong in USD, wrong in CAD, and
                          * looks authoritative in neither. Each currency gets its own total,
                          * its own count and its own split, side by side so they can be read
                          * against each other without being confused for each other.
                          *
                          * The split is the part worth looking at: a shop whose costs are
                          * mostly roadside repairs is fixing work nobody scheduled, which is
                          * a different conversation from one doing the booked PMs.
                          */}
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">Costs</h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        What this vendor has charged, kept apart by currency and by how the
                                        work came about.
                                    </p>
                                </div>
                                <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                                    {vendor.bills.length} bill{vendor.bills.length === 1 ? '' : 's'}
                                    {spend.length > 1 ? ` · ${spend.length} currencies` : ''}
                                </span>
                            </div>

                            {spend.length === 0 ? (
                                <div className="border-t border-slate-100 p-8 text-center">
                                    <Receipt size={26} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-semibold text-slate-700">Nothing billed yet</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        A service record filed against them, or a repair bill on a roadside
                                        inspection, adds up here.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2">
                                    {spend.map(([cur, v]) => {
                                        const pct = v.total > 0 ? Math.round((v.service / v.total) * 100) : 0;
                                        return (
                                            <div key={cur} className="bg-white p-5">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold tracking-wider text-slate-600">
                                                        {cur}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {v.count} bill{v.count === 1 ? '' : 's'}
                                                    </span>
                                                </div>
                                                <div className="mt-2 text-2xl font-black tabular-nums tracking-tight text-slate-900">
                                                    {money(v.total, cur)}
                                                </div>
                                                {/* Two bars rather than one split bar: a segment that
                                                    rounds to nothing still has to be visible, and a
                                                    shop with no roadside work at all should read as an
                                                    empty track, not as a missing one. */}
                                                <div className="mt-4 space-y-3">
                                                    {([
                                                        { label: 'Service records', value: v.service, tone: 'bg-blue-500', pct },
                                                        { label: 'Roadside repairs', value: v.roadside, tone: 'bg-amber-500', pct: 100 - pct },
                                                    ]).map((seg) => (
                                                        <div key={seg.label}>
                                                            <div className="flex items-baseline justify-between gap-2">
                                                                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
                                                                    <span className={cn('h-2 w-2 shrink-0 rounded-full', seg.tone)} />
                                                                    {seg.label}
                                                                </span>
                                                                <span className="text-[12px] font-bold tabular-nums text-slate-800">
                                                                    {money(seg.value, cur)}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                                <div className={cn('h-full rounded-full transition-all', seg.tone)}
                                                                    style={{ width: `${seg.pct}%` }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>)}

                    {/* ── Inventory ── what the fleet holds that came from here. */}
                    {tab === 'inventory' && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="px-5 py-3">
                                <h2 className="text-sm font-bold text-slate-900">Inventory from this vendor</h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {vendor.items.length} item{vendor.items.length === 1 ? '' : 's'} filed against them —
                                    cards, transponders, keys and anything else they issued.
                                </p>
                            </div>
                            <TableScroll className="border-t border-slate-100">
                                <table className="w-full min-w-[720px]">
                                    <thead>
                                        <tr>
                                            <TH>Item</TH>
                                            <TH className={COL_RULE}>Serial</TH>
                                            <TH className={COL_RULE}>Assigned to</TH>
                                            <TH className={COL_RULE}>Expires</TH>
                                            <TH className={COL_RULE}>Status</TH>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {vendor.items.length === 0 && (
                                            <EmptyRow
                                                colSpan={5}
                                                Icon={Package}
                                                title="Nothing filed against this vendor"
                                                hint="Items added in Inventory under this vendor show up here."
                                            />
                                        )}
                                        {vendor.items.map((it) => (
                                            <tr
                                                key={it.id}
                                                onClick={onOpenItem ? () => onOpenItem(it.id) : undefined}
                                                className={cn('transition-colors hover:bg-slate-50/60',
                                                    onOpenItem && 'cursor-pointer')}
                                            >
                                                <TD>
                                                    <div className="flex items-center gap-2.5">
                                                        <RowIcon Icon={Package} tone="blue" />
                                                        <div className="min-w-0">
                                                            <div className="truncate text-[13px] font-semibold leading-tight text-slate-900">
                                                                {it.name}
                                                            </div>
                                                            <p className="truncate text-[11px] leading-tight text-slate-500">
                                                                {it.category ?? 'Uncategorised'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap font-mono text-[12px] text-slate-600')}>
                                                    {it.serial || <span className="font-sans text-slate-300">—</span>}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'text-[13px] text-slate-700')}>
                                                    {it.assignedTo ? (
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <Truck size={12} className="text-slate-400" /> {it.assignedTo}
                                                        </span>
                                                    ) : <span className="text-slate-300">Unassigned</span>}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-[13px] tabular-nums text-slate-600')}>
                                                    {it.expiryDate ? shortDate(it.expiryDate) : <span className="text-slate-300">—</span>}
                                                </TD>
                                                <TD className={COL_RULE}>
                                                    <span className={cn(
                                                        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                                        it.status === 'Active'
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                            : 'border-slate-200 bg-slate-100 text-slate-500',
                                                    )}>
                                                        {it.status}
                                                    </span>
                                                </TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </TableScroll>
                        </div>
                    )}

                    {/* ── Work orders ── the same table the module and each unit show. */}
                    {tab === 'orders' && (
                        <WorkOrdersTable
                            orders={vendor.orders}
                            onOpen={onOpenOrder ? (o) => onOpenOrder(o.id) : undefined}
                            title={`Work orders · ${vendor.name}`}
                            emptyTitle="Nothing has been sent to this vendor"
                            emptyHint="Raise one from a unit's service interval and it appears here."
                        />
                    )}

                    {/* ── Repair bills ── both sources, one list, one total. */}
                    {tab === 'bills' && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">Repair bills and total</h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        Everything this vendor has charged — the bills filed against a roadside
                                        inspection and the ones filed with a service record, in one list.
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                                    {([
                                        { id: 'all' as const, label: 'All', n: vendor.bills.length },
                                        { id: 'service' as const, label: 'Service records', n: counts.service },
                                        { id: 'roadside' as const, label: 'Roadside', n: counts.roadside },
                                    ]).map((o) => (
                                        <button
                                            key={o.id}
                                            type="button"
                                            onClick={() => setBillSource(o.id)}
                                            className={cn(
                                                'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-[12px] font-bold transition-colors',
                                                billSource === o.id
                                                    ? 'bg-white text-slate-900 shadow-sm'
                                                    : 'text-slate-500 hover:text-slate-700',
                                            )}
                                        >
                                            {o.label} <span className="tabular-nums text-slate-400">{o.n}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <TableScroll className="border-t border-slate-100">
                                <table className="w-full min-w-[880px]">
                                    <thead>
                                        <tr>
                                            <TH>Billed</TH>
                                            <TH className={COL_RULE}>Invoice #</TH>
                                            <TH className={COL_RULE}>For</TH>
                                            <TH className={COL_RULE}>Unit</TH>
                                            <TH className={cn(COL_RULE, 'text-right')}>Labour</TH>
                                            <TH className={cn(COL_RULE, 'text-right')}>Parts</TH>
                                            <TH className={cn(COL_RULE, 'text-right')}>Total</TH>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {shownBills.length === 0 && (
                                            <EmptyRow
                                                colSpan={7}
                                                Icon={Receipt}
                                                title={vendor.bills.length === 0
                                                    ? 'This vendor has not billed us' : 'Nothing in this view'}
                                                hint={vendor.bills.length === 0
                                                    ? 'A service record filed against them, or a repair bill on a roadside inspection, lands here.'
                                                    : undefined}
                                                onClear={vendor.bills.length === 0 ? undefined : () => setBillSource('all')}
                                            />
                                        )}
                                        {shownBills.map((b) => {
                                            const src = SOURCE[b.source];
                                            return (
                                                <tr
                                                    key={b.id}
                                                    onClick={onOpenBill ? () => onOpenBill(b) : undefined}
                                                    className={cn('transition-colors hover:bg-slate-50/60',
                                                        onOpenBill && b.openId && 'cursor-pointer')}
                                                >
                                                    <TD>
                                                        <div className="flex items-center gap-2.5">
                                                            <RowIcon Icon={src.Icon} tone={b.source === 'roadside' ? 'amber' : 'blue'} />
                                                            <div className="min-w-0">
                                                                <div className="whitespace-nowrap text-[13px] font-semibold leading-tight text-slate-900">
                                                                    {shortDate(b.date)}
                                                                </div>
                                                                <span className={cn(
                                                                    'mt-0.5 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                                                    src.cls)}>
                                                                    {src.label}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TD>
                                                    {/* The one handle both sources share. It is what the shop
                                                        says on the phone, so a bill without one is a bill
                                                        nobody can look up from the other side. */}
                                                    <TD className={cn(COL_RULE, 'whitespace-nowrap font-mono text-[12px] text-slate-700')}>
                                                        {b.invoiceNumber || <span className="font-sans text-slate-300">Not given</span>}
                                                    </TD>
                                                    <TD className={cn(COL_RULE, 'text-[13px] text-slate-700')}>
                                                        <span className="block max-w-[15rem] truncate">{b.reference}</span>
                                                        {b.files > 0 && (
                                                            <span className="text-[11px] text-slate-500">
                                                                {b.files} file{b.files === 1 ? '' : 's'}
                                                            </span>
                                                        )}
                                                    </TD>
                                                    <TD className={cn(COL_RULE, 'whitespace-nowrap text-[13px] text-slate-700')}>
                                                        {b.assetLabel ?? <span className="text-slate-300">—</span>}
                                                    </TD>
                                                    <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] tabular-nums text-slate-600')}>
                                                        {b.labour != null ? money(b.labour, b.currency) : <span className="text-slate-300">—</span>}
                                                    </TD>
                                                    <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] tabular-nums text-slate-600')}>
                                                        {b.parts != null ? money(b.parts, b.currency) : <span className="text-slate-300">—</span>}
                                                    </TD>
                                                    <TD className={cn(COL_RULE, 'whitespace-nowrap text-right text-[13px] font-bold tabular-nums text-slate-900')}>
                                                        {money(b.total, b.currency)}
                                                    </TD>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </TableScroll>
                            {/* The total of what is ON SCREEN. A filtered list under an unfiltered
                                total is the quickest way to make somebody mistrust the page. */}
                            {shownTotals.length > 0 && (
                                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3">
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                                        {billSource === 'all' ? 'Total billed' : `Total · ${billSource === 'service' ? 'service records' : 'roadside'}`}
                                        <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">
                                            {shownBills.length} bill{shownBills.length === 1 ? '' : 's'}
                                        </span>
                                    </span>
                                    <span className="flex flex-wrap items-center gap-4">
                                        {shownTotals.map(([cur, sum]) => (
                                            <span key={cur} className="text-[15px] font-black tabular-nums text-slate-900">
                                                {money(sum, cur)}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'activity' && (
                        <ActivityTimeline
                            heading="Activity"
                            entries={vendor.activity}
                            emptyText="Nothing has happened with this vendor yet."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
