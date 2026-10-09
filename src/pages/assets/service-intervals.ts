// ─────────────────────────────────────────────────────────────────────────────
// Service intervals — the rule, as opposed to the work it generates.
//
// The page only ever kept TASKS: one row per asset per service, each carrying the
// `scheduleId` of the rule that made it. The rule itself — its name, what it covers,
// how often, which assets — was thrown away the moment Create Service Intervals
// closed, so the screen named after it could only show you its output.
//
// Rather than a second store that could drift from the tasks, a rule is DERIVED by
// grouping tasks on `scheduleId`, and the handful of things the tasks cannot carry
// (the name you typed, the clocks you ticked, "apply to all") are kept beside them as
// meta. A rule with no tasks left cannot exist, and a task can never belong to a rule
// that is not listed.
// ─────────────────────────────────────────────────────────────────────────────

import type { MaintenanceTask } from './maintenance.data';
import type { ServiceIntervals } from '@/types/service-types';
import { intervalSummary } from '@/types/service-types';

/**
 * How heavy a service is.
 *
 * Four words every shop, OEM schedule, lease agreement and maintenance audit already
 * uses, so they are the system’s words too rather than a label somebody retypes. The
 * weight is a different question from how often it comes round: a fleet running long
 * haul and one running city delivery will set very different intervals on the same
 * MINOR service, and "what does a minor cost us" is only answerable if minor means the
 * same thing on every rule.
 *
 * They escalate, and each one is understood to contain the one below it.
 */
export const PM_TIERS = [
    {
        id: 'minor',
        label: 'Minor / Safety',
        blurb: 'The quick turn — fluids, tyres, lamps, a walk round.',
        pill: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    {
        id: 'intermediate',
        label: 'Intermediate',
        blurb: 'Brakes, greasing, steering and suspension on top of a minor.',
        pill: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
        id: 'comprehensive',
        label: 'Comprehensive',
        blurb: 'Driveline, air system, wheel ends and frame — a day in the shop.',
        pill: 'border-amber-200 bg-amber-50 text-amber-700',
    },
    {
        id: 'major',
        label: 'Major / Annual',
        blurb: 'The mandated annual inspection and the service set that goes with it.',
        pill: 'border-violet-200 bg-violet-50 text-violet-700',
    },
] as const;

export type PmTierId = typeof PM_TIERS[number]['id'];

export const tierOf = (id?: string) => PM_TIERS.find((t) => t.id === id);
/** The words, for anywhere a label is all that is wanted. */
export const tierLabel = (id?: string) => tierOf(id)?.label;
/** Heaviest last, so a list grouped by weight reads in the order work escalates. */
export const tierRank = (id?: string) => {
    const at = PM_TIERS.findIndex((t) => t.id === id);
    return at === -1 ? PM_TIERS.length : at;
};

/** Which kinds of asset a rule covers, read off the assets it is actually on. */
export type IntervalEntity = 'truck' | 'trailer' | 'both' | 'none';

/** What a unit actually is. A van is not a truck, and for maintenance it reads as trailer-side kit. */
export type AssetKind = 'truck' | 'trailer';

/** Where an asset’s meters stand right now — what every countdown is measured against. */
export interface MeterReading {
    odometer: number;
    engineHours: number;
}

export const ENTITY_LABEL: Record<IntervalEntity, string> = {
    truck: 'Trucks',
    trailer: 'Trailers',
    both: 'Both',
    none: '—',
};

/**
 * One asset’s place on a rule.
 *
 * A rule covers assets; it does not follow all of them at the same moment. A truck can
 * be on the list and not yet counted — because nobody has said when it was last
 * serviced, and a countdown that starts from a guess is worse than no countdown. So an
 * asset is enrolled first and switched on second, and switching it on is exactly the
 * question "when was this last done": the odometer, the hour meter, or the date,
 * whichever clocks the rule runs on.
 */
export interface AssetEnrollment {
    /** Off until somebody says when it was last serviced. */
    enabled: boolean;
    /** The meter at the last service, in the unit the rule’s mileage clock is set in. */
    lastOdometer?: number;
    lastEngineHours?: number;
    /** yyyy-mm-dd — what the days clock counts from. */
    lastServiceDate?: string;
    /**
     * Taken off the rule.
     *
     * Not simply forgotten: the work it has already had belongs to this rule and stays in
     * its history, so the asset is marked gone rather than erased — otherwise a completed
     * task would quietly put it back on the list.
     */
    removed?: boolean;
    /** When to speak up before it falls due, and how. */
    reminders?: ReminderSettings;
    updatedAt?: string;
}

/**
 * Being told before it falls due.
 *
 * In the clock’s own unit, because that is the only warning that means anything: "in 30
 * days" is no use on a rule that goes by miles, and a truck doing 2,000 miles a week
 * needs a different head start from one doing 200.
 */
export interface ReminderSettings {
    enabled: boolean;
    /** Miles before the odometer target. */
    miles: number[];
    /** Hours before the hour-meter target. */
    hours: number[];
    /** Days before the date. 0 means "on the day". */
    days: number[];
    channels: { email: boolean; inApp: boolean };
}

/** What the form offers, per clock. */
export const REMINDER_CHOICES = {
    miles: [2000, 1000, 500, 250],
    hours: [100, 50, 25, 10],
    days: [30, 14, 7, 0],
} as const;

export const DEFAULT_REMINDERS: ReminderSettings = {
    enabled: true,
    miles: [1000],
    hours: [50],
    days: [30, 7],
    channels: { email: true, inApp: true },
};

/** What the form captured that a task cannot carry on its own. */
export interface ServiceIntervalMeta {
    name?: string;
    intervals?: ServiceIntervals;
    applyToAll?: boolean;
    createdAt?: string;
    /** Per asset: whether the rule is counting it, and from where. */
    assets?: Record<string, AssetEnrollment>;
    /** What it covers — kept so a rule with every asset switched off still exists. */
    serviceTypeIds?: string[];
    /**
     * The carrier did not write this one; it came with the system.
     *
     * A PM programme is not an opinion a fleet forms from scratch — the A/B/C/D tiers are
     * what OEM schedules, lease agreements and maintenance audits are all written against,
     * so a new carrier should find them already there rather than be asked to invent them
     * on day one. What IS theirs is which units are on each tier and from what reading, so
     * a default can be enrolled, switched off and tuned — but not deleted, because a
     * default somebody can delete is not a default.
     */
    system?: boolean;
    /** How heavy it is — a {@link PM_TIERS} id, never the words themselves. */
    tier?: PmTierId;
}

export interface ServiceIntervalRow {
    id: string;
    /** The tasks this rule has produced — what it owns, for removing it. */
    taskIds: string[];
    name: string;
    /** True when the name is the services' own, because nobody typed one. */
    derivedName: boolean;
    serviceTypeIds: string[];
    entity: IntervalEntity;
    assetIds: string[];
    applyToAll: boolean;
    intervals?: ServiceIntervals;
    /** Per asset, for the rule’s own page: tracking on or off, and from what reading. */
    enrollment: Record<string, AssetEnrollment>;
    /** Its tasks, by state — the rule's health in one row. */
    counts: { total: number; upcoming: number; due: number; overdue: number; completed: number; cancelled: number };
    /** Came with the system rather than from this carrier. Cannot be deleted. */
    system: boolean;
    /** How heavy it is — a {@link PM_TIERS} id. */
    tier?: PmTierId;
    createdAt?: string;
}

/** A rule is live while anything it made is still outstanding. */
export const isIntervalActive = (r: ServiceIntervalRow) =>
    r.counts.upcoming + r.counts.due + r.counts.overdue > 0;

/**
 * The clocks a rule runs on.
 *
 * Taken from the form when it was created here, and otherwise read back off the tasks'
 * own `dueRule` — which is how every seeded rule gets one without a migration.
 */
function intervalsFromTasks(tasks: MaintenanceTask[]): ServiceIntervals | undefined {
    const out: ServiceIntervals = {};
    for (const t of tasks) {
        const r = t.dueRule;
        if (!r) continue;
        if (r.unit === 'miles' && !out.mileage) out.mileage = { every: r.frequencyEvery, unit: 'miles' };
        if (r.unit === 'engine_hours' && !out.engineHours) out.engineHours = { every: r.frequencyEvery };
        if (r.unit === 'days' && !out.days) out.days = { every: r.frequencyEvery };
    }
    return Object.keys(out).length ? out : undefined;
}

/** One line for the Interval column: "15,000 mi · 180 d", or nothing at all. */
export const intervalText = (i?: ServiceIntervals) => intervalSummary(i);

export function deriveServiceIntervals(
    tasks: MaintenanceTask[],
    /** Truck or trailer, read off the fleet — not off CMV class, which is a different question. */
    assetKindOf: (assetId: string) => AssetKind | undefined,
    serviceName: (id: string) => string,
    meta: Record<string, ServiceIntervalMeta> = {},
): ServiceIntervalRow[] {
    // What makes two tasks the same RULE.
    //
    // A rule built here gets one id across every asset it was pointed at, so its own id
    // is the answer. The seeded ones do not: each carries `sch_a1_oil`, `sch_a2_oil`,
    // `sch_a3_oil` — the same rule with the asset baked into the id — so keying on it
    // gives one "rule" per task and a list no shorter than the one it replaced. Those
    // fall back to what actually distinguishes a rule: the services it covers and the
    // clock it runs on.
    const keyOf = (t: MaintenanceTask) => {
        if (t.scheduleId && meta[t.scheduleId]) return t.scheduleId;
        const services = [...t.serviceTypeIds].sort().join("+");
        const clock = t.dueRule ? `${t.dueRule.unit}:${t.dueRule.frequencyEvery}` : "manual";
        return `svc:${services}|${clock}`;
    };

    const byRule = new Map<string, MaintenanceTask[]>();
    for (const t of tasks) {
        const id = keyOf(t);
        const list = byRule.get(id);
        if (list) list.push(t); else byRule.set(id, [t]);
    }

    const rows: ServiceIntervalRow[] = [];
    for (const [id, group] of byRule) {
        const serviceTypeIds = [...new Set(group.flatMap((t) => t.serviceTypeIds))];
        const m = meta[id] ?? {};
        const enrollment = m.assets ?? {};
        // An asset put on the rule but not yet switched on has no task to be found by,
        // so the list of assets is the tasks' and the enrolment's together — less the ones
        // taken off it.
        const assetIds = [...new Set([...group.map((t) => t.assetId), ...Object.keys(enrollment)])]
            .filter((aid) => !enrollment[aid]?.removed);
        const kinds = new Set(assetIds.map(assetKindOf).filter(Boolean));
        const entity: IntervalEntity = kinds.size === 0 ? 'none'
            : kinds.size > 1 ? 'both'
                : kinds.has('truck') ? 'truck' : 'trailer';

        const counts = {
            total: group.length,
            upcoming: group.filter((t) => t.status === 'upcoming').length,
            due: group.filter((t) => t.status === 'due').length,
            overdue: group.filter((t) => t.status === 'overdue').length,
            completed: group.filter((t) => t.status === 'completed').length,
            cancelled: group.filter((t) => t.status === 'cancelled').length,
        };

        rows.push({
            id,
            taskIds: group.map((t) => t.id),
            // A rule nobody named is called after what it does, which is what the old list
            // showed in its Task Name column anyway.
            name: m.name?.trim() || serviceTypeIds.map(serviceName).filter(Boolean).join(', ') || 'Untitled interval',
            derivedName: !m.name?.trim(),
            serviceTypeIds,
            entity,
            assetIds,
            applyToAll: !!m.applyToAll,
            intervals: m.intervals ?? intervalsFromTasks(group),
            enrollment,
            counts,
            system: !!m.system,
            tier: m.tier,
            createdAt: m.createdAt ?? group.map((t) => t.createdAt).sort()[0],
        });
    }

    // A rule with every asset switched off has no tasks to be grouped by, and it has not
    // stopped existing — somebody wrote it down and will switch it back on. Those come
    // from what was kept beside the tasks.
    for (const [id, m] of Object.entries(meta)) {
        if (byRule.has(id)) continue;
        const serviceTypeIds = m.serviceTypeIds ?? [];
        const enrollment = m.assets ?? {};
        const assetIds = Object.keys(enrollment).filter((aid) => !enrollment[aid]?.removed);
        if (!serviceTypeIds.length && !assetIds.length) continue;
        const kinds = new Set(assetIds.map(assetKindOf).filter(Boolean));
        rows.push({
            id,
            taskIds: [],
            name: m.name?.trim() || serviceTypeIds.map(serviceName).filter(Boolean).join(', ') || 'Untitled interval',
            derivedName: !m.name?.trim(),
            serviceTypeIds,
            entity: kinds.size === 0 ? 'none' : kinds.size > 1 ? 'both' : kinds.has('truck') ? 'truck' : 'trailer',
            assetIds,
            applyToAll: !!m.applyToAll,
            intervals: m.intervals,
            enrollment,
            counts: { total: 0, upcoming: 0, due: 0, overdue: 0, completed: 0, cancelled: 0 },
            system: !!m.system,
            tier: m.tier,
            createdAt: m.createdAt,
        });
    }

    /*
     * The programme first, then whatever needs attention.
     *
     * PM-A through PM-D came with the system and every other maintenance document is
     * written against them, so they head the list in the order the tiers escalate — not
     * by whichever happens to be worst today. A default that sorts into the middle of a
     * carrier's own rules is a default nobody finds, and the four of them moving around
     * between visits is worse still: this is the one block of the list that should be in
     * the same place every time it is opened.
     *
     * Everything the carrier wrote follows, ordered by what needs doing: overdue, then
     * due, then by name.
     */
    return rows.sort((a, b) =>
        (Number(!!b.system) - Number(!!a.system))
        || (a.system && b.system ? tierRank(a.tier) - tierRank(b.tier) : 0)
        || (b.counts.overdue - a.counts.overdue)
        || (b.counts.due - a.counts.due)
        || a.name.localeCompare(b.name));
}

/**
 * The due rule a new task gets from the ticked clocks.
 *
 * One task carries one clock, so when several are ticked the one that will come up
 * first wins — distance before hours before days, which is the order a truck actually
 * wears out. The others are kept on the rule and shown in the list.
 */
export function dueRuleFromIntervals(
    intervals: ServiceIntervals | undefined,
    from: { odometer: number; engineHours: number; date?: Date },
): MaintenanceTask['dueRule'] | undefined {
    if (!intervals) return undefined;
    if (intervals.mileage) {
        // Kilometres are stored as entered; the meter is in miles, so convert for the target.
        const every = intervals.mileage.unit === 'km'
            ? Math.round(intervals.mileage.every * 0.621371)
            : intervals.mileage.every;
        return {
            unit: 'miles',
            frequencyEvery: every,
            upcomingThreshold: Math.max(500, Math.round(every * 0.1)),
            dueAtOdometer: from.odometer + every,
        };
    }
    if (intervals.engineHours) {
        const every = intervals.engineHours.every;
        return {
            unit: 'engine_hours',
            frequencyEvery: every,
            upcomingThreshold: Math.max(25, Math.round(every * 0.1)),
            dueAtEngineHours: from.engineHours + every,
        };
    }
    if (intervals.days) {
        const every = intervals.days.every;
        const start = from.date ?? new Date();
        const due = new Date(start.getTime() + every * 86400000);
        return {
            unit: 'days',
            frequencyEvery: every,
            upcomingThreshold: Math.max(7, Math.round(every * 0.2)),
            dueAtDate: due.toISOString(),
        };
    }
    return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// How far off a task is
//
// "Due at 240,000 mi" is only half the sentence: a truck on 245,500 is five and a half
// thousand miles past it, and the same figure on a truck that has just left the yard is
// months away. The list says both, and says it in the unit the rule itself runs on.
// ─────────────────────────────────────────────────────────────────────────────

/** How much is left before a task falls due. Negative means it is already past. */
export function remainingFor(
    rule: MaintenanceTask['dueRule'],
    meter: MeterReading,
    now: Date = new Date(),
): { value: number; unit: 'mi' | 'h' | 'd' } | undefined {
    if (!rule) return undefined;
    if (rule.unit === 'miles') return { value: (rule.dueAtOdometer ?? 0) - meter.odometer, unit: 'mi' };
    if (rule.unit === 'engine_hours') return { value: (rule.dueAtEngineHours ?? 0) - meter.engineHours, unit: 'h' };
    if (!rule.dueAtDate) return undefined;
    const days = Math.round((new Date(rule.dueAtDate).getTime() - now.getTime()) / 86400000);
    return { value: days, unit: 'd' };
}

const UNIT_WORD = { mi: 'mi', h: 'h', d: 'days' } as const;

/** "4,800 mi to go" / "1,200 mi over" / "in 12 days" — one short line for the Due In column. */
export function remainingText(r: { value: number; unit: 'mi' | 'h' | 'd' } | undefined) {
    if (!r) return undefined;
    const word = UNIT_WORD[r.unit];
    const n = Math.abs(r.value).toLocaleString();
    if (r.value < 0) return { text: `${n} ${word} over`, over: true };
    if (r.value === 0) return { text: 'Due now', over: true };
    return { text: `${n} ${word} to go`, over: false };
}

/** Where a task stands against its own rule, for the one we have just raised. */
export function statusForDue(
    rule: MaintenanceTask['dueRule'],
    meter: MeterReading,
    now: Date = new Date(),
): 'upcoming' | 'due' | 'overdue' {
    const left = remainingFor(rule, meter, now);
    if (!left || !rule) return 'upcoming';
    if (left.value <= 0) return 'overdue';
    return left.value <= rule.upcomingThreshold ? 'due' : 'upcoming';
}

// ─────────────────────────────────────────────────────────────────────────────
// Three clocks at once
//
// A real preventive-maintenance rule runs on all three: every 25,000 miles, every 500
// engine hours, or every 180 days — WHICHEVER COMES FIRST. A single due figure cannot
// say that, so each clock is projected from the asset’s own last service and they are
// compared on the only common ground they have: how much of their own interval is left.
// A truck with 170 of its 500 hours to go is further through than one with 11,500 of its
// 25,000 miles, and it is the hours that will fall due first.
// ─────────────────────────────────────────────────────────────────────────────

export type ClockUnit = 'miles' | 'engine_hours' | 'days';

export interface ClockDue {
    unit: ClockUnit;
    /** "Mileage" / "Engine hours" / "Days". */
    label: string;
    /** "every 25,000 mi". */
    everyText: string;
    /** Where it falls due: "257,000 mi", "8,300 h", "16 Feb 2027". */
    dueText: string;
    /** In the clock’s own unit. Negative means it is already past. */
    remaining: number;
    /** "11,500 mi to go" / "6 days over". */
    remainingText: string;
    over: boolean;
    /** remaining ÷ every — the figure the clocks are compared on. */
    share: number;
    status: 'upcoming' | 'due' | 'overdue';
    /** The raw target, for working out when to give warning. */
    dueAtOdometer?: number;
    dueAtEngineHours?: number;
    dueAtDate?: string;
}

const MI_PER_KM = 0.621371;
const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * Every clock this rule runs, counted from what the asset’s last service read.
 *
 * Empty when nobody has said when it was last done — a countdown from a guess is worse
 * than no countdown, and the caller falls back to whatever the task itself carries.
 */
export function projectClocks(
    intervals: ServiceIntervals | undefined,
    enrolled: AssetEnrollment | undefined,
    meter: MeterReading,
    now: Date = new Date(),
): ClockDue[] {
    if (!intervals || !enrolled) return [];
    const out: ClockDue[] = [];

    if (intervals.mileage && enrolled.lastOdometer != null) {
        const km = intervals.mileage.unit === 'km';
        const unitWord = km ? 'km' : 'mi';
        // Entered in the fleet's own unit; the meter is miles.
        const lastMiles = km ? enrolled.lastOdometer * MI_PER_KM : enrolled.lastOdometer;
        const everyMiles = km ? intervals.mileage.every * MI_PER_KM : intervals.mileage.every;
        const dueMiles = Math.round(lastMiles + everyMiles);
        const remainingMiles = dueMiles - meter.odometer;
        const shown = km ? Math.round(remainingMiles / MI_PER_KM) : remainingMiles;
        const threshold = Math.max(500, Math.round(everyMiles * 0.1));
        out.push({
            unit: 'miles',
            label: 'Mileage',
            everyText: `every ${intervals.mileage.every.toLocaleString()} ${unitWord}`,
            dueText: `${(km ? Math.round(dueMiles / MI_PER_KM) : dueMiles).toLocaleString()} ${unitWord}`,
            remaining: shown,
            remainingText: textFor(shown, unitWord),
            over: remainingMiles <= 0,
            share: remainingMiles / everyMiles,
            status: stateOf(remainingMiles, threshold),
            dueAtOdometer: dueMiles,
        });
    }

    if (intervals.engineHours && enrolled.lastEngineHours != null) {
        const every = intervals.engineHours.every;
        const due = enrolled.lastEngineHours + every;
        const remaining = due - meter.engineHours;
        const threshold = Math.max(25, Math.round(every * 0.1));
        out.push({
            unit: 'engine_hours',
            label: 'Engine hours',
            everyText: `every ${every.toLocaleString()} h`,
            dueText: `${due.toLocaleString()} h`,
            remaining,
            remainingText: textFor(remaining, 'h'),
            over: remaining <= 0,
            share: remaining / every,
            status: stateOf(remaining, threshold),
            dueAtEngineHours: due,
        });
    }

    if (intervals.days && enrolled.lastServiceDate) {
        const every = intervals.days.every;
        const from = new Date(`${enrolled.lastServiceDate}T08:00:00`);
        const due = new Date(from.getTime() + every * 86400000);
        const remaining = Math.round((due.getTime() - now.getTime()) / 86400000);
        const threshold = Math.max(7, Math.round(every * 0.2));
        out.push({
            unit: 'days',
            label: 'Days',
            everyText: `every ${every.toLocaleString()} days`,
            dueText: fmtDate(due),
            remaining,
            remainingText: textFor(remaining, 'days'),
            over: remaining <= 0,
            share: remaining / every,
            status: stateOf(remaining, threshold),
            dueAtDate: due.toISOString(),
        });
    }

    return out;
}

function textFor(value: number, unit: string) {
    const n = Math.abs(value).toLocaleString();
    if (value < 0) return `${n} ${unit} over`;
    if (value === 0) return 'Due now';
    return `${n} ${unit} to go`;
}

function stateOf(remaining: number, threshold: number): 'upcoming' | 'due' | 'overdue' {
    if (remaining <= 0) return 'overdue';
    return remaining <= threshold ? 'due' : 'upcoming';
}

/** Whichever comes first — the least of its own interval left. */
export function soonestClock(clocks: ClockDue[]): ClockDue | undefined {
    if (!clocks.length) return undefined;
    return [...clocks].sort((a, b) => a.share - b.share)[0];
}

/** The worst a rule’s clocks say about one asset: any one of them falling due is enough. */
export function statusFromClocks(clocks: ClockDue[]): 'upcoming' | 'due' | 'overdue' | undefined {
    if (!clocks.length) return undefined;
    if (clocks.some((c) => c.status === 'overdue')) return 'overdue';
    if (clocks.some((c) => c.status === 'due')) return 'due';
    return 'upcoming';
}

/** Where each warning lands, in the clock’s own unit: "at 256,000 mi", "on 17 Jan 2027". */
export function reminderPoints(clock: ClockDue, r: ReminderSettings): string[] {
    if (!r.enabled) return [];
    if (clock.unit === 'miles') {
        return [...r.miles].sort((a, b) => b - a)
            .map((m) => `${((clock.dueAtOdometer ?? 0) - m).toLocaleString()} mi`);
    }
    if (clock.unit === 'engine_hours') {
        return [...r.hours].sort((a, b) => b - a)
            .map((h) => `${((clock.dueAtEngineHours ?? 0) - h).toLocaleString()} h`);
    }
    if (!clock.dueAtDate) return [];
    const due = new Date(clock.dueAtDate).getTime();
    return [...r.days].sort((a, b) => b - a)
        .map((d) => (d === 0 ? `${fmtDate(new Date(due))} (on the day)` : fmtDate(new Date(due - d * 86400000))));
}

/** "Email, In-App" — or nothing at all, which is worth saying out loud. */
export function channelText(r: ReminderSettings) {
    const on = [r.channels.email && 'Email', r.channels.inApp && 'In-App'].filter(Boolean);
    return on.length ? on.join(', ') : 'no channel picked';
}


/** What an asset’s standing on a rule amounts to, in one word. */
export type AssetState = 'overdue' | 'due' | 'upcoming' | 'untracked';

/**
 * Said once, so the chips, the bands and the pill can never disagree.
 *
 * The clocks decide it where the asset has been switched on and given a last service;
 * failing that, whatever its own task says, which is how the seeded rules answer.
 */
export function assetStateFor(
    tracking: boolean,
    clocks: ClockDue[],
    openStatus?: MaintenanceTask['status'],
): AssetState {
    if (!tracking) return 'untracked';
    const live = statusFromClocks(clocks);
    if (live) return live;
    return openStatus === 'overdue' || openStatus === 'due' ? openStatus : 'upcoming';
}

/**
 * Where a task stands, for a reader that has no enrolment to work from.
 *
 * The same three answers `projectClocks` gives, read off the one clock a task can carry.
 */
export function dueFromRule(
    rule: MaintenanceTask['dueRule'],
    meter: MeterReading,
    now: Date = new Date(),
): { at: string; left?: string; over: boolean; label: string } | undefined {
    if (!rule) return undefined;
    const left = remainingFor(rule, meter, now);
    const text = remainingText(left);
    const at = rule.unit === 'miles' ? `${(rule.dueAtOdometer ?? 0).toLocaleString()} mi`
        : rule.unit === 'engine_hours' ? `${(rule.dueAtEngineHours ?? 0).toLocaleString()} h`
            : rule.dueAtDate ? fmtDate(new Date(rule.dueAtDate)) : '—';
    const label = rule.unit === 'miles' ? 'Mileage' : rule.unit === 'engine_hours' ? 'Engine hours' : 'Days';
    return { at, left: text?.text, over: !!text?.over, label };
}

// ─────────────────────────────────────────────────────────────────────────────
// The PM programme that ships with the system
//
// Every fleet of any size runs the same four tiers, because they are what OEM service
// schedules, lease agreements and maintenance audits are all written against:
//
//   PM-A  Minor / Safety      the quick turn — oil, tyres, lamps, fluids
//   PM-B  Intermediate        A, plus brakes, greasing, steering and suspension
//   PM-C  Comprehensive       B, plus driveline, air system, wheel ends and frame
//   PM-D  Major / Annual *    the mandated annual inspection and its service set
//
// Asking a new carrier to invent them on day one gets four rules that are each slightly
// wrong, so they come with the system instead. What belongs to the carrier is which
// units are on each tier and from what reading — those are theirs to set, switch off
// and tune. The tiers themselves cannot be deleted; a default somebody can delete is
// not a default.
//
// Each runs three clocks at once — miles, engine hours and months, whichever comes
// first — except PM-D, which runs on days alone. That is what the asterisk means: the
// annual is the regulator’s clock, not the engine’s, and a truck that has stood in a
// yard all year still needs it.
// ─────────────────────────────────────────────────────────────────────────────

export const PM_SERVICE_ID = 'sch_pm_a';
export const PM_B_ID = 'sch_pm_b';
export const PM_C_ID = 'sch_pm_c';
export const PM_D_ID = 'sch_pm_d';

/** The four tiers, in the order they escalate. */
export const PM_TIER_IDS = [PM_SERVICE_ID, PM_B_ID, PM_C_ID, PM_D_ID] as const;

/** A tier that runs on days alone covers trailers as readily as tractors. */
export const PM_ANNUAL_ID = PM_D_ID;

export const SEED_INTERVAL_META: Record<string, ServiceIntervalMeta> = {
    [PM_SERVICE_ID]: {
        name: 'PM-A',
        tier: 'minor',
        system: true,
        serviceTypeIds: [
            'oil_filter',
            'sched1_s9_tire_pressure',
            'sched1_s9_tire_tread_depth',
            'sched1_s6_required_lamps',
            'wiper_fluid',
        ],
        intervals: {
            mileage: { every: 15000, unit: 'miles' },
            engineHours: { every: 250 },
            days: { every: 90 },
        },
        applyToAll: false,
        createdAt: '2026-01-05T10:00:00Z',
        assets: {},
    },
    [PM_B_ID]: {
        name: 'PM-B',
        tier: 'intermediate',
        system: true,
        serviceTypeIds: [
            'brake_inspection',
            'tire_rotation',
            'grease_fifth_wheel',
            'sched1_s3a_s_cam',
            'sched1_s4_steering_linkage',
            'sched1_s2_shock_strut',
        ],
        intervals: {
            mileage: { every: 45000, unit: 'miles' },
            engineHours: { every: 750 },
            days: { every: 180 },
        },
        applyToAll: false,
        createdAt: '2026-01-05T10:00:00Z',
        assets: {},
    },
    [PM_C_ID]: {
        name: 'PM-C',
        tier: 'comprehensive',
        system: true,
        serviceTypeIds: [
            'sched1_s1_fuel_gas_diesel',
            'sched1_s3a_air_components',
            'sched1_s3a_brake_chamber',
            'sched1_s9_wheel_bearing',
            'sched1_s9_wheel_hub',
            'sched1_s8_frame_rails',
            'sched1_s7_wiring',
        ],
        intervals: {
            mileage: { every: 90000, unit: 'miles' },
            engineHours: { every: 1500 },
            days: { every: 365 },
        },
        applyToAll: false,
        createdAt: '2026-01-05T10:00:00Z',
        assets: {},
    },
    [PM_D_ID]: {
        name: 'PM-D',
        tier: 'major',
        system: true,
        // The annual inspection itself, which is what files the certificate when the work
        // order closing this tier is signed off.
        serviceTypeIds: [
            'annual_inspection',
            'insp_safety_annual',
            'serv_brake_annual',
            'serv_elec_annual',
            'serv_suspension_annual',
        ],
        // Days alone. An hour meter cannot make an annual come round sooner, and a truck
        // that has stood all year still needs one.
        intervals: {
            days: { every: 365 },
        },
        applyToAll: false,
        createdAt: '2026-01-05T10:00:00Z',
        assets: {},
    },
};

/**
 * The programme, spread over the carrier’s own fleet.
 *
 * The tiers are fixed; the enrolment is not, and it is the enrolment that makes the list
 * worth looking at. Every power unit goes on all four, counted back from its own meter
 * by roughly the tier’s own interval, so each one is at a believable point in its own
 * cycle rather than all of them falling due on the same afternoon. Trailers go on PM-D
 * only — they have no engine hours and the annual is the clock that actually applies
 * to them.
 *
 * A few are left deliberately awkward, because those are the rows worth testing: one
 * overdue on days while both meters still have room, one nobody has switched on, one
 * with the warnings turned off.
 */
export function buildSeedIntervalMeta(
    assets: { id: string; assetType?: string; odometer?: number; odometerUnit?: 'mi' | 'km' }[],
    tasks: MaintenanceTask[],
    now: Date = new Date(),
): Record<string, ServiceIntervalMeta> {
    const meterOf = (id: string) => {
        const mine = tasks.filter((t) => t.assetId === id);
        const asset = assets.find((a) => a.id === id);
        const own = !asset?.odometer ? 0
            : asset.odometerUnit === 'km' ? Math.round(asset.odometer * MI_PER_KM) : asset.odometer;
        return {
            odometer: Math.max(own, ...mine.map((t) => t.meterSnapshot?.odometer ?? 0), 0),
            engineHours: Math.max(0, ...mine.map((t) => t.meterSnapshot?.engineHours ?? 0)),
        };
    };

    const dayBefore = (n: number) => new Date(now.getTime() - n * 86400000).toISOString().slice(0, 10);
    // Stable per (tier, asset): a programme that reshuffles on every render is not one.
    const hash = (sv: string) => {
        let h = 0;
        for (let i = 0; i < sv.length; i++) h = (h * 31 + sv.charCodeAt(i)) | 0;
        return Math.abs(h);
    };

    const out: Record<string, ServiceIntervalMeta> = {};
    const trucks = assets.filter((a) => a.assetType === 'Truck');
    const trailers = assets.filter((a) => a.assetType && a.assetType !== 'Truck');

    for (const tierId of PM_TIER_IDS) {
        const base = SEED_INTERVAL_META[tierId];
        const enrolment: Record<string, AssetEnrollment> = {};
        const onIt = tierId === PM_D_ID ? [...trucks, ...trailers] : trucks;

        onIt.forEach((a, i) => {
            const seed = hash(`${tierId}:${a.id}`);
            const m = meterOf(a.id);
            const everyMiles = base.intervals?.mileage?.every ?? 0;
            const everyHours = base.intervals?.engineHours?.every ?? 0;
            const everyDays = base.intervals?.days?.every ?? 365;

            // How far through its own cycle this unit is: 15% to 105%, so most are
            // running, a few are close, and one or two have gone past.
            const through = 0.15 + (seed % 91) / 100;

            // One on each tier is on the list but not counted — nobody has said when it
            // was last done, and a countdown from a guess is worse than no countdown.
            if (i > 0 && i % 7 === 3) {
                enrolment[a.id] = { enabled: false, updatedAt: now.toISOString() };
                return;
            }

            enrolment[a.id] = {
                enabled: true,
                lastOdometer: everyMiles
                    ? Math.max(0, Math.round(m.odometer - everyMiles * through))
                    : undefined,
                lastEngineHours: everyHours
                    ? Math.max(0, Math.round(m.engineHours - everyHours * through))
                    : undefined,
                lastServiceDate: dayBefore(Math.round(everyDays * through)),
                reminders: seed % 11 === 0
                    // One with the warnings off, because that reads differently.
                    ? { ...DEFAULT_REMINDERS, enabled: false }
                    : DEFAULT_REMINDERS,
                updatedAt: now.toISOString(),
            };
        });

        out[tierId] = { ...base, assets: enrolment };
    }

    /*
     * Three hand-written rows on PM-A, so each of its clocks has a unit it is deciding.
     *
     * One figure could never show this: a truck with 20 of its 250 hours left is further
     * through than one with 5,000 of its 15,000 miles, and it is the hours that go first.
     * Written as how much of each clock is LEFT and counted back from the unit’s own
     * meter, so retuning the tier cannot quietly stop them demonstrating anything.
     */
    const every = SEED_INTERVAL_META[PM_SERVICE_ID].intervals!;
    const demo = (
        id: string,
        left: { miles: number; hours: number; days: number },
        reminders: ReminderSettings = DEFAULT_REMINDERS,
    ): AssetEnrollment => {
        const m = meterOf(id);
        return {
            enabled: true,
            lastOdometer: Math.max(0, m.odometer - (every.mileage!.every - left.miles)),
            lastEngineHours: Math.max(0, m.engineHours - (every.engineHours!.every - left.hours)),
            lastServiceDate: dayBefore(every.days!.every - left.days),
            reminders,
            updatedAt: now.toISOString(),
        };
    };

    const a = out[PM_SERVICE_ID].assets!;
    // Due on MILEAGE, with room on hours and months.
    a.a1 = demo('a1', { miles: 500, hours: 170, days: 30 });
    // Overdue on DAYS while both meters still have room — what one figure cannot say.
    a.a3 = demo('a3', { miles: 8000, hours: 150, days: -10 });
    // Due on HOURS, with miles still to run.
    a.a6 = demo('a6', { miles: 5000, hours: 20, days: 40 }, { ...DEFAULT_REMINDERS, hours: [100, 50] });
    // On the rule, not yet switched on — nobody has said when it was last done.
    a.a7 = { enabled: false, updatedAt: '2026-09-28T10:00:00Z' };

    return out;
}
