// ─────────────────────────────────────────────────────────────────────────────
// AssetIntervalPage — one interval, on one unit.
//
// The rule's own page answers "which trucks are on PM-A and where do they all stand".
// The unit's page answers "what is this truck in for". Neither answers the question
// somebody standing next to the truck actually asks, which is about the PAIR:
//
//   when was PM-A last done ON THIS TRUCK, what was done, what did it cost, and how
//   far does it really run between services?
//
// That last one is why the history belongs here rather than as a column somewhere. A
// rule says "every 15,000 miles"; the record says what the truck actually gets. The gap
// between those two numbers is the whole of preventive maintenance, and it cannot be
// seen on a row.
//
// So: the interval and where it stands now at the top, and everything it has already
// had underneath.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useMemo, useState } from 'react';
import {
    ChevronLeft, CalendarClock, Gauge, Clock, Share2, Briefcase, ListChecks,
    Pencil, Lock, Bell, BellOff, ExternalLink, TrendingUp, Truck, Car,
    ClipboardCheck, Sparkles, SlidersHorizontal, FileSpreadsheet, FileText,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { ServiceHistoryTable } from '@/components/maintenance/ServiceHistoryTable';
import { ServiceDocumentsTable } from '@/components/maintenance/ServiceDocumentsTable';
import { ViewSwitch } from '@/components/ui/ListChrome';
import type { ServiceEvent } from './service-history';
import type { AssetIntervalLine } from './MaintenanceAssetsTable';
import type { AssetState, ClockDue } from './service-intervals';
import { tierOf } from './service-intervals';
import type { ServiceIntervals } from '@/types/service-types';
import { cn } from '@/lib/utils';

/** One set of words and colours for where a rule stands, wherever that is shown. */
export const STATE_PILL: Record<AssetState, { cls: string; label: string }> = {
    overdue: { cls: 'border-red-200 bg-red-50 text-red-700', label: 'Overdue' },
    due: { cls: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Due' },
    upcoming: { cls: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Upcoming' },
    untracked: { cls: 'border-slate-200 bg-slate-100 text-slate-500', label: 'Not tracking' },
};

const CLOCK_ICON: Record<ClockDue['unit'], React.ElementType> = {
    miles: Gauge,
    engine_hours: Clock,
    days: CalendarClock,
};

/** What the three clocks are called here — the columns' own words, not the engine's. */
const CLOCK_TITLE: Record<ClockDue['unit'], string> = {
    miles: 'Mileage interval',
    engine_hours: 'Operating hour',
    days: 'Time interval',
};

const shortDate = (iso?: string) => (iso
    ? new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : undefined);

const Dash = () => <span className="font-normal text-slate-300">—</span>;

/**
 * One captured value, the way a compliance record states them.
 *
 * Flowing rather than on a grid: the set varies — a rule on days alone has no odometer
 * to report — and a fixed grid leaves a dead cell on every odd count.
 */
function Fact({ label, children, className }: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('min-w-[8rem]', className)}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-800">{children}</div>
        </div>
    );
}

function Stat({ label, value, hint, tone = 'slate', Icon }: {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    tone?: 'slate' | 'red' | 'amber' | 'blue' | 'emerald';
    Icon: React.ElementType;
}) {
    const tones = {
        slate: 'bg-slate-100 text-slate-500',
        red: 'bg-red-50 text-red-600',
        amber: 'bg-amber-50 text-amber-600',
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
    } as const;
    /*
     * The KPI tile the rest of the app uses: the words on the left, the icon square on
     * the right, one row. Stacked — tile, then label, then figure, then note — three of
     * these were 140px of page to carry three numbers nobody came here for.
     */
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
            <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                <div className="mt-0.5 truncate text-[15px] font-bold tabular-nums text-slate-900">{value}</div>
                {hint && <p className="truncate text-[11px] text-slate-400">{hint}</p>}
            </div>
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
                <Icon size={15} />
            </span>
        </div>
    );
}

export interface AssetIntervalPageProps {
    asset: {
        id: string;
        label: string;
        kind?: 'truck' | 'trailer';
        description?: string;
        driver?: string;
        meter: { odometer: number; engineHours: number };
    };
    line: AssetIntervalLine;
    rule: {
        id: string;
        name: string;
        system?: boolean;
        intervals?: ServiceIntervals;
        serviceTypeIds: string[];
        assetCount: number;
    };
    /** Every service this unit has had against this rule, newest first. */
    history: ServiceEvent[];
    /** The live work order holding this job, where there is one. */
    onOrder?: string;
    serviceOf: (id: string) => { name: string; group?: string };
    onBack: () => void;
    /** The rule itself — every unit on it, which is a different question. */
    onOpenRule: () => void;
    onCreateOrder?: () => void;
    /** Say when it was last done, which is what switches the countdown on. */
    onSetLastService?: () => void;
    /**
     * File a service that has already happened.
     *
     * The other half of how work gets done: nobody raised an order, the truck was
     * already in, and what exists is a receipt. It files the same ledger entry a closed
     * order files — vendor, invoice, bill, document — and the countdown restarts
     * because that entry is now the newest one for this pair.
     */
    onAddRecord?: () => void;
    /**
     * Turn the warnings on or off for this unit on this rule.
     *
     * It follows the tracking switch rather than standing beside it as an equal: a
     * warning is a thing said BEFORE a countdown ends, so on a rule nothing is counting
     * there is nothing to be early about. Switched off here, the rule still comes due;
     * you simply are not told first.
     */
    onSetMonitoring?: (enabled: boolean) => void;
    /**
     * Open the warnings themselves.
     *
     * A switch can say on or off and nothing else, and everything that makes a warning
     * useful — how far ahead of the mileage, how many hours out, which days before the
     * date, down which channel — had no home on this page at all. It is the same card
     * the last-service form wears, asked on its own.
     */
    onEditMonitoring?: () => void;
    /**
     * Fill the record with a plausible past, for looking at the screen.
     *
     * A pair with nothing on it shows an empty table and three dashes where the averages
     * go, which is exactly right for a unit whose first service is still ahead of it and
     * no use at all for seeing whether any of this works. Offered only where there is
     * genuinely nothing — it is a way in, not a feature of the record.
     */
    onLoadSample?: () => void;
    /**
     * Bring a spreadsheet in whole.
     *
     * The record a carrier already has is a spreadsheet, and typing six years of it one
     * visit at a time through the record form is the reason nobody ever does. Beside Add
     * record rather than hidden in a menu: on a pair with two entries and six years of
     * history in a drawer, it is the more useful of the two.
     */
    onBulkUpload?: () => void;
    onShare?: () => void;
    onOpenHistory?: (eventId: string) => void;
    onEditHistory?: (eventId: string) => void;
    onShareHistory?: (eventId: string) => void;
    onOpenOrder?: (orderId: string) => void;
}

export function AssetIntervalPage({
    asset, line, rule, history, onOrder, serviceOf,
    onBack, onOpenRule, onCreateOrder, onSetLastService, onAddRecord, onLoadSample,
    onSetMonitoring, onEditMonitoring, onBulkUpload, onShare,
    onOpenHistory, onEditHistory, onShareHistory, onOpenOrder,
}: AssetIntervalPageProps) {
    const pill = STATE_PILL[line.state];
    const tier = tierOf(line.tier);
    const soonest = line.clocks.find((c) => c.remainingText === line.due?.left && c.label === line.due?.label)
        ?? line.clocks[0];

    /** Where each clock counts from, in that clock's own unit. */
    const lastAt = (unit: ClockDue['unit']) => {
        const e = line.enrolled;
        if (unit === 'miles') {
            const v = line.lastService?.odometer ?? e?.lastOdometer;
            return v == null ? undefined : `${v.toLocaleString()} ${line.lastService?.odometerUnit === 'km' ? 'km' : 'mi'}`;
        }
        if (unit === 'engine_hours') {
            return e?.lastEngineHours == null ? undefined : `${e.lastEngineHours.toLocaleString()} h`;
        }
        return shortDate(line.lastService?.date ?? e?.lastServiceDate);
    };

    /**
     * What this unit actually gets, as opposed to what the rule asks for.
     *
     * Read off the gaps between consecutive services rather than stored: a fleet that
     * keeps to 15,000 miles and one that averages 19,000 have the same rule and very
     * different trucks, and the second one is a conversation nobody can have while the
     * only number on the screen is the one somebody typed into the rule.
     */
    const cadence = useMemo(() => {
        const sorted = [...history].sort((a, b) => String(a.performedAt).localeCompare(String(b.performedAt)));
        const miles: number[] = [];
        const days: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const next = sorted[i];
            if (prev.odometer != null && next.odometer != null && next.odometer > prev.odometer) {
                miles.push(next.odometer - prev.odometer);
            }
            const gap = Math.round(
                (new Date(next.performedAt).getTime() - new Date(prev.performedAt).getTime()) / 86400000,
            );
            if (gap > 0) days.push(gap);
        }
        const mean = (xs: number[]) => (xs.length
            ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length)
            : undefined);
        return {
            visits: sorted.length,
            avgMiles: mean(miles),
            avgDays: mean(days),
            spend: sorted.reduce((s, e) => s + (e.cost ?? 0), 0),
            currency: sorted.find((e) => e.currency)?.currency ?? 'USD',
            last: sorted[sorted.length - 1],
        };
    }, [history]);

    /** "1,800 mi over plan" / "on plan" — the comparison, said out loud. */
    const against = (actual: number | undefined, planned: number | undefined, unit: string) => {
        if (actual == null || !planned) return undefined;
        const diff = actual - planned;
        const pct = Math.abs(diff) / planned;
        if (pct < 0.05) return 'on plan';
        return `${Math.abs(diff).toLocaleString()} ${unit} ${diff > 0 ? 'over' : 'under'} plan`;
    };

    const AssetIcon = asset.kind === 'trailer' ? Car : Truck;

    /**
     * Which of the two lists is showing, and what sits over both of them.
     *
     * Not a tab and not a filter: a filter narrows one list, a tab changes the subject,
     * and this changes what a row IS. The counts are on the switch so you can see what
     * the other view holds before deciding to go there — a Documents view that turns out
     * to be empty is a click you would not have spent.
     */
    const [listView, setListView] = useState<'services' | 'documents'>('services');
    const docCount = useMemo(
        () => history.reduce((n, e) => n + (e.files?.length ?? 0), 0),
        [history],
    );

    /*
     * Two rows, both hard right.
     *
     * The switch and the buttons were on one line and were not the same KIND of control:
     * one decides what the list is, the others do something to it. Side by side they read
     * as five buttons of equal weight, and on a narrower card they wrapped into whatever
     * order fitted — the switch could end up below the thing it governs. The switch sits
     * on the title's line, where what-am-I-looking-at belongs; the actions sit under it.
     */
    const listActions = (
        <div className="flex flex-col items-end gap-2">
            <ViewSwitch
                value={listView}
                onChange={setListView}
                options={[
                    { id: 'services' as const, label: 'Services', icon: ClipboardCheck, count: history.length },
                    { id: 'documents' as const, label: 'Documents', icon: FileText, count: docCount },
                ]}
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
                {listView === 'services' && onBulkUpload && (
                    <button
                        type="button"
                        onClick={onBulkUpload}
                        title="Import a service history from a spreadsheet"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        <FileSpreadsheet size={14} className="text-blue-600" />
                        <span className="hidden sm:inline">Bulk upload</span>
                    </button>
                )}
                {/* A demo affordance, and it says so: it fills the record behind the countdown
                    without moving it. Offered while the record is too short to page, group or
                    average — which is most of them, since a unit arrives with the two or three
                    entries the carrier came in with. */}
                {listView === 'services' && onLoadSample && history.length < 8 && (
                    <button
                        type="button"
                        onClick={onLoadSample}
                        title="Fill the record behind the countdown. Nothing already on it moves."
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        <Sparkles size={13} className="text-blue-600" />
                        <span className="hidden sm:inline">Sample data</span>
                    </button>
                )}
                {/* On both views: filing a record is what puts a document on this list too. */}
                {onAddRecord && (
                    <button
                        type="button"
                        onClick={onAddRecord}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <ClipboardCheck size={14} /> Add record
                    </button>
                )}
            </div>
        </div>
    );

    // Nothing is counting, so nothing can warn you early about it — whatever the stored
    // setting says. The switch reads the truth rather than the preference.
    /*
     * Whether anything is actually counting - not merely whether the rule is switched on.
     *
     * A rule can be enrolled and still have no clock running: nobody has said when it was
     * last done, or the rule itself has no interval set. Either way there is no "before"
     * to be warned in, so the switch reads the truth rather than the stored preference.
     */
    const counting = line.tracking && line.clocks.length > 0;
    const monitoring = counting && (line.enrolled?.reminders?.enabled ?? false);

    /*
     * Which clocks are on screen below, so the header can state what they do not.
     *
     * A rule on days alone was putting the same four figures twice in one block: the
     * strip said "next due Sep 11, 2026 · 26 days over · decided by Days · comes round
     * 365 d · last performed Sep 11, 2025", and the card underneath said all four again.
     * Each clock owns its own figures; the header owns what belongs to the pair and to
     * no single clock, plus anything the rule records but does not count.
     */
    /*
     * What it covers, by group.
     *
     * A two-column table to say "Annual Inspection · Inspections" was a header row, a
     * body row and a card of its own to carry four words — with the interval’s own name
     * saying the first two already. Grouped text says the same thing in a line, and on a
     * six-service rule it says MORE: which parts of the truck the visit touches, which is
     * the thing a shop reads it for.
     */
    const covers = useMemo(() => {
        const by = new Map<string, string[]>();
        for (const id of rule.serviceTypeIds) {
            const sv = serviceOf(id);
            const key = sv.group ?? 'Other';
            const list = by.get(key);
            if (list) list.push(sv.name); else by.set(key, [sv.name]);
        }
        return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rule.serviceTypeIds]);

    const shown = {
        any: line.clocks.length > 0,
        // With one clock there is nothing to compare, so "which gets there first" and
        // the summary of it are the card itself.
        many: line.clocks.length > 1,
        miles: line.clocks.some((c) => c.unit === 'miles'),
        hours: line.clocks.some((c) => c.unit === 'engine_hours'),
        days: line.clocks.some((c) => c.unit === 'days'),
    };

    return (
        /*
         * The same shell a compliance record wears: a pinned identity bar, the values
         * captured on it joined flush underneath, and the lists below in their own cards.
         * A full-bleed header with the facts loose on the page underneath was this module
         * inventing its own layout for a screen the app already has a shape for.
         */
        <div className="h-full min-h-0 scroll-smooth overflow-y-auto bg-slate-50">
            {/* The house entrance: the same fade-and-rise every other record page in the
                app opens with, so arriving here does not feel like a different product.
                `scroll-smooth` above it is for the jumps WITHIN the page — they moved the
                view in a single frame, which reads as a flicker rather than as travel. */}
            <div className="mx-auto w-full max-w-[1400px] animate-in fade-in slide-in-from-bottom-2 px-4 py-5 duration-300 sm:px-6 sm:py-6 lg:px-8">

                {/* ── Identity bar ── back, what this is, and whether it is in order.
                    Pinned, so all three stay reachable for the whole page. */}
                <div className="sticky top-0 z-20 flex items-center gap-3 rounded-t-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <button
                        type="button"
                        onClick={onBack}
                        title={`Back to ${asset.label}`}
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                    >
                        <ChevronLeft size={15} />
                        <span className="hidden sm:inline">Back to {asset.label}</span>
                    </button>
                    <span aria-hidden className="h-6 w-px shrink-0 bg-slate-200" />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <CalendarClock size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-[15px] font-bold leading-tight text-slate-900">{line.name}</h2>
                            {/* Beside the name rather than at the far end of the bar: the end
                                is where the things you DO live now, and a badge among four
                                buttons reads as a fifth one. The badges that CLASSIFY the
                                rule went down a line - they were squeezing the one thing on
                                this bar that cannot be guessed from anywhere else. */}
                            <span className={cn(
                                'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                pill.cls,
                            )}>
                                {pill.label}
                            </span>
                        </div>
                        {/* Whose interval this is — one muted line, the way the record pages
                            name their subject. */}
                        <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-slate-500">
                            {tier && (
                                <span className={cn(
                                    'inline-flex shrink-0 items-center rounded-full border px-1.5 text-[9px] font-bold uppercase tracking-wider',
                                    tier.pill,
                                )}>
                                    {tier.label}
                                </span>
                            )}
                            {rule.system && (
                                <span className="hidden shrink-0 items-center rounded border border-slate-200 bg-slate-50 px-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:inline-flex">
                                    System
                                </span>
                            )}
                            <AssetIcon size={12} className="shrink-0 text-slate-400" />
                            <span className="shrink-0 font-semibold text-slate-600">{asset.label}</span>
                            <span aria-hidden className="shrink-0 text-slate-300">·</span>
                            <span className="truncate">
                                {[
                                    asset.description,
                                    asset.driver,
                                    `${asset.meter.odometer.toLocaleString()} mi`,
                                    `${asset.meter.engineHours.toLocaleString()} h`,
                                ].filter(Boolean).join(' · ')}
                            </span>
                        </p>
                    </div>
                    {/* What can be done about it, at the top where it is reached first
                        and stays reached: the bar is pinned, so these do not scroll away
                        the moment the record gets longer than a screen. */}
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onOpenRule}
                            title={`${rule.name} across all ${rule.assetCount} units`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            <ExternalLink size={14} /> <span className="hidden xl:inline">Open interval</span>
                        </button>
                        {onShare && (
                            <button
                                type="button"
                                onClick={onShare}
                                title="Share"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                <Share2 size={14} /> <span className="hidden xl:inline">Share</span>
                            </button>
                        )}
                        {onSetLastService && (
                            <button
                                type="button"
                                onClick={onSetLastService}
                                title={line.tracking ? 'Correct the last service' : 'Say when it was last done'}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <Pencil size={14} />
                                <span className="hidden xl:inline">{line.tracking ? 'Last service' : 'Start counting'}</span>
                            </button>
                        )}
                        {/* Add record is not here any more: it belongs over the list of
                            records, which is where you are looking when you decide to file
                            one, and two of the same button on one screen only makes you
                            choose between them. The bar keeps what is about the rule
                            itself — send it, change it, raise work against it. */}
                        {/* Already with a shop, it says which one rather than offering to
                            send the same work twice. */}
                        {onOrder ? (
                            <span
                                className="inline-flex h-8 max-w-[13rem] items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[12px] font-semibold text-slate-500"
                                title={`Already on ${onOrder} — finish that order first`}
                            >
                                <Lock size={13} /> <span className="hidden truncate xl:inline">On {onOrder}</span>
                            </span>
                        ) : onCreateOrder && (
                            <button
                                type="button"
                                onClick={onCreateOrder}
                                title="Create work order"
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                <Briefcase size={14} /> <span className="hidden lg:inline">Create work order</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── What stands on it ── joined flush to the bar above, as one card. */}
                <div className="rounded-b-xl border border-t-0 border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
                        {/* Only worth a line of its own when there are clocks to choose
                            between — with one, the card below IS the answer. */}
                        {shown.many && (<>
                            <Fact label="Comes due first" className="min-w-[10rem]">
                                {line.due?.at ?? <Dash />}
                                {line.due?.label && (
                                    <span className="font-normal text-slate-400"> on {line.due.label.toLowerCase()}</span>
                                )}
                            </Fact>
                            <Fact label="Due in">
                                {line.due?.left
                                    ? <span className={line.due.over ? 'text-red-600' : undefined}>{line.due.left}</span>
                                    : <Dash />}
                            </Fact>
                        </>)}
                        {/* Nothing is counting, so no card says how often it would. */}
                        {!shown.any && (
                            <Fact label="Comes round" className="min-w-[11rem]">{line.everyText}</Fact>
                        )}
                        {/* The days card already reads "from <date>". */}
                        {!shown.days && (
                            <Fact label="Last performed" className="min-w-[9rem]">
                                {shortDate(line.lastService?.date ?? line.enrolled?.lastServiceDate) ?? <Dash />}
                            </Fact>
                        )}
                        {/* A reading on record for a clock this rule does not run: worth
                            keeping, and nothing below will show it. */}
                        {!shown.miles && lastAt('miles') && (
                            <Fact label="Odometer then">{lastAt('miles')}</Fact>
                        )}
                        {!shown.hours && lastAt('engine_hours') && (
                            <Fact label="Engine hours then">{lastAt('engine_hours')}</Fact>
                        )}
                        {/* Belongs to the pair, not to any one clock. */}
                        <Fact label="Times done">{cadence.visits}</Fact>
                        {cadence.spend > 0 && (
                            <Fact label="Spent" className="min-w-[9rem]">
                                {cadence.currency} {cadence.spend.toFixed(2)}
                            </Fact>
                        )}
                        {/* How many units are on the rule. What it covers is listed in
                            full below, so counting it here was the same fact twice. */}
                        <Fact label="On this interval" className="min-w-[9rem]">
                            {rule.assetCount} unit{rule.assetCount === 1 ? '' : 's'}
                        </Fact>
                    </div>

                    {/* ── The clocks ── part of the same block, because they are the same
                        answer: the facts above say WHERE it stands, these say how far
                        through each clock that is. Two cards an inch apart made one record
                        read as two. All three at once, because "whichever comes first" is
                        the rule and a single due date cannot say it. */}
                    <div className="border-t border-slate-100 px-4 py-3">
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    How often it comes round
                                </h3>
                                {/* Each card states its own "every X" underneath; repeating
                                    the lot here was the same sentence twice, two lines apart. */}
                                <p className="mt-0.5 text-[12px] text-slate-500">
                                    {shown.many
                                        ? 'Three clocks at once — whichever comes first.'
                                        : shown.any
                                            ? 'Counted from the last one on record.'
                                            : `${line.everyText}. Nothing is counting until somebody says when it was last done.`}
                                </p>
                            </div>
                        {/* Monitoring, in the switch the unit's own list uses for tracking
                                — the same control for the same kind of decision, rather than a
                                badge here and a switch there. Off and unreachable while nothing
                                is counting: there is no "before" to warn you in. */}
                            {onSetMonitoring ? (
                                <div className="flex shrink-0 items-center gap-2">
                                    {/* The words open the settings; the switch is still the
                                        switch. On/off is one decision and "how early, and
                                        down which channel" is another, and a control that
                                        did both on one click would do the wrong one half
                                        the time. */}
                                    <button
                                        type="button"
                                        onClick={onEditMonitoring}
                                        disabled={!counting || !onEditMonitoring}
                                        title={counting
                                            ? 'Set how early you are warned, and down which channel'
                                            : 'Nothing is counting yet, so there is nothing to warn you about'}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-lg px-2 py-1 transition-colors',
                                            counting && onEditMonitoring
                                                ? 'hover:bg-slate-100'
                                                : 'cursor-default',
                                        )}
                                    >
                                        {monitoring
                                            ? <Bell size={13} className="text-blue-600" />
                                            : <BellOff size={13} className="text-slate-400" />}
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Monitoring
                                        </span>
                                        <span className={cn('text-xs font-semibold', monitoring ? 'text-slate-600' : 'text-slate-400')}>
                                            {monitoring ? 'On' : 'Off'}
                                        </span>
                                        {counting && onEditMonitoring && (
                                            <SlidersHorizontal size={12} className="text-slate-400" />
                                        )}
                                    </button>
                                    <Switch
                                        checked={monitoring}
                                        disabled={!counting}
                                        onCheckedChange={onSetMonitoring}
                                        aria-label="Warn me before this falls due"
                                    />
                                </div>
                            ) : line.enrolled?.reminders && (
                                <span className={cn(
                                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold',
                                    line.enrolled.reminders.enabled
                                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-500',
                                )}>
                                    {line.enrolled.reminders.enabled ? <Bell size={12} /> : <BellOff size={12} />}
                                    {line.enrolled.reminders.enabled ? 'You will be warned before it falls due' : 'Warnings off'}
                                </span>
                            )}
                        </div>

                        {line.clocks.length > 0 ? (
                            /*
                             * A line each, not a panel each.
                             *
                             * Three boxed cards with a progress bar in them took half a screen
                             * to say five short figures, and the bars were decoration: nobody
                             * reads "61% of the way through an interval" off a stripe, they
                             * read "450 mi to go" off the number already beside it. As rows
                             * the three clocks line up on every column, which is the one thing
                             * a reader actually wants to do with them — compare.
                             */
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] border-separate border-spacing-0">
                                    <thead>
                                        <tr className="text-left">
                                            {['Clock', 'Every', 'Counting from', 'Due at', 'Left'].map((h, i) => (
                                                <th
                                                    key={h}
                                                    className={cn(
                                                        'whitespace-nowrap pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400',
                                                        i > 0 && 'pl-6',
                                                        i === 4 && 'text-right',
                                                    )}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {line.clocks.map((c) => {
                                            const leads = line.clocks.length > 1 && c === soonest;
                                            const Icon = CLOCK_ICON[c.unit];
                                            return (
                                                <tr key={c.unit} className="border-t border-slate-100">
                                                    <td className="whitespace-nowrap py-2 pr-2">
                                                        <span className="flex items-center gap-2">
                                                            <Icon size={14} className="shrink-0 text-slate-400" />
                                                            <span className="text-[13px] font-semibold text-slate-800">
                                                                {CLOCK_TITLE[c.unit]}
                                                            </span>
                                                            {/* Which one decides, said in words on the row it
                                                                decides rather than as a badge on a card. */}
                                                            {leads && (
                                                                <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                    First
                                                                </span>
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap py-2 pl-6 text-[13px] tabular-nums text-slate-600">
                                                        {c.everyText.replace(/^every /, '')}
                                                    </td>
                                                    <td className="whitespace-nowrap py-2 pl-6 text-[13px] tabular-nums text-slate-600">
                                                        {lastAt(c.unit) ?? <Dash />}
                                                    </td>
                                                    <td className="whitespace-nowrap py-2 pl-6 text-[13px] font-semibold tabular-nums text-slate-900">
                                                        {c.dueText}
                                                    </td>
                                                    <td className={cn(
                                                        'whitespace-nowrap py-2 pl-6 text-right text-[13px] font-bold tabular-nums',
                                                        c.over ? 'text-red-600'
                                                            : c.status === 'due' ? 'text-amber-600' : 'text-slate-600',
                                                    )}>
                                                        {c.remainingText}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                                <p className="min-w-0 flex-1 text-[13px] text-slate-500">
                                    <span className="font-semibold text-slate-700">Nothing is counting yet.</span>{' '}
                                    Say when this was last done on {asset.label} and every clock starts from that
                                    reading — a countdown from a guess is worse than none.
                                </p>
                                {onSetLastService && (
                                    <button
                                        type="button"
                                        onClick={onSetLastService}
                                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[12px] font-semibold text-white hover:bg-slate-800"
                                    >
                                        <Pencil size={14} /> Say when it was last done
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── What it covers ── part of the same block: "PM-B" on its own tells
                        a shop nothing, and it is a property of the interval exactly as its
                        clocks are. Grouped, because which parts of the truck a visit
                        touches is what the list is read for. */}
                    <div className="border-t border-slate-100 px-4 py-3">
                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            What it covers
                        </h3>
                        {covers.length === 0 ? (
                            <p className="mt-0.5 text-[13px] text-slate-400">Nothing listed on this interval.</p>
                        ) : (
                            <dl className="mt-1.5 grid gap-x-8 gap-y-1.5 sm:grid-cols-[auto_1fr]">
                                {covers.map(([group, names]) => (
                                    <Fragment key={group}>
                                        <dt className="whitespace-nowrap text-[12px] font-semibold text-slate-500 sm:text-right">
                                            {group}
                                        </dt>
                                        <dd className="text-[13px] text-slate-800">{names.join(', ')}</dd>
                                    </Fragment>
                                ))}
                            </dl>
                        )}
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    {/* ── What it actually gets ── the rule is a plan; this is the record.
                        Only shown once there are two services to measure a gap between. */}
                    {(cadence.avgMiles != null || cadence.avgDays != null) && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Stat
                                label="Average gap"
                                value={cadence.avgMiles != null
                                    ? `${cadence.avgMiles.toLocaleString()} mi`
                                    : <span className="text-slate-400">—</span>}
                                hint={against(cadence.avgMiles, rule.intervals?.mileage?.every, 'mi')
                                    ?? 'between services on this unit'}
                                tone="blue"
                                Icon={TrendingUp}
                            />
                            <Stat
                                label="Average time"
                                value={cadence.avgDays != null
                                    ? `${cadence.avgDays.toLocaleString()} days`
                                    : <span className="text-slate-400">—</span>}
                                hint={against(cadence.avgDays, rule.intervals?.days?.every, 'days')
                                    ?? 'between services on this unit'}
                                tone="blue"
                                Icon={CalendarClock}
                            />
                            <Stat
                                label="Average cost"
                                value={cadence.spend > 0
                                    ? `${cadence.currency} ${(cadence.spend / Math.max(1, cadence.visits)).toFixed(2)}`
                                    : <span className="text-slate-400">—</span>}
                                hint={`over ${cadence.visits} service${cadence.visits === 1 ? '' : 's'}`}
                                tone="emerald"
                                Icon={ListChecks}
                            />
                        </div>
                    )}

                    {/* The buttons over whichever list is showing. Bulk upload and the
                        sample data are about the SERVICE record, so they are offered on
                        it; filing a record is what adds a document too, so it is offered
                        on both. */}
                    {/* ── Everything it has already had ── the same list the unit and the
                        rule show, filtered to this pair. One entry opens, corrects and
                        shares the same way wherever it is read.

                        Read two ways, because two different questions get asked of it.
                        "When was this last done and what did it cost" is a list of
                        SERVICES. "Where is the safety certificate, and which of these
                        have we not labelled" is a list of DOCUMENTS — and asking that of
                        a service list means opening services one at a time to look
                        inside. Neither view is a copy: both read the same ledger, so a
                        tag added in the record form is on the document list at once. */}
                    {listView === 'services' ? (
                        <ServiceHistoryTable
                            events={history}
                            title="Previous services"
                            subtitle={`${line.name} on ${asset.label} — every time it has been done, newest first.`}
                            showAsset={false}
                            showInterval={false}
                            onOpen={onOpenHistory}
                            onEdit={onEditHistory}
                            onShare={onShareHistory}
                            onOpenOrder={onOpenOrder}
                            headerAction={listActions}
                            emptyAction={onLoadSample && history.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={onLoadSample}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                                >
                                    <Sparkles size={13} className="text-blue-600" /> Load sample data
                                </button>
                            ) : undefined}
                        />
                    ) : (
                        <ServiceDocumentsTable
                            events={history}
                            title="Documents on record"
                            subtitle={`Every file filed with a ${line.name} on ${asset.label} — tagged, searchable, and still attached to the service it came in on.`}
                            onOpenRecord={onOpenHistory}
                            headerAction={listActions}
                            emptyHint="File a record with its invoice or certificate attached and it lands here."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
