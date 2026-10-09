// ─────────────────────────────────────────────────────────────────────────────
// asset-interval-lines — one rule, against one unit.
//
// "Where does PM-B stand on ACM-T0100" is asked from three places now: the maintenance
// module's own asset page, that unit's record in the carrier profile, and the compliance
// tab's maintenance record. It has one answer, so it is worked out once.
//
// It was worked out inline in the module's page, which was fine while that was the only
// page that asked. The moment a second screen shows the same rules, an inline derivation
// is two derivations — and they drift at the edges nobody looks at: the annual certificate
// standing in for a days clock, a rule counted as tracking because a task is open rather
// than because anybody enrolled it. Those edges are exactly what a yard argues about.
// ─────────────────────────────────────────────────────────────────────────────

import type { MaintenanceTask } from './maintenance.data';
import type { AssetIntervalLine, MaintenanceAssetRow } from './MaintenanceAssetsTable';
import {
    assetStateFor, dueFromRule, intervalText, projectClocks, soonestClock,
    type AssetState, type ServiceIntervalRow,
} from './service-intervals';
import { annualClock, isAnnualSafetyInterval, type AnnualCapture } from './asset-annual-records';

/** The meters this unit is currently reading — what every clock counts towards. */
export interface AssetMeter {
    odometer: number;
    engineHours: number;
}

/**
 * Where one rule stands on one unit.
 *
 * `tasks` is the whole list rather than this rule's slice, because what makes a rule
 * "open" is an outstanding task of ITS that belongs to THIS asset — both halves, or a
 * sister unit's work counts as this one's.
 */
export function assetIntervalLine(
    rule: ServiceIntervalRow,
    assetId: string,
    tasks: MaintenanceTask[],
    meter: AssetMeter,
    serviceName: (id: string) => string,
    annualSafety?: AnnualCapture,
): AssetIntervalLine {
    const enrolled = rule.enrollment[assetId];
    const mine = tasks.filter((t) => rule.taskIds.includes(t.id) && t.assetId === assetId);
    const open = mine.find((t) => t.status !== 'completed' && t.status !== 'cancelled');
    const tracking = enrolled ? enrolled.enabled : !!open;
    const clocks = tracking ? projectClocks(rule.intervals, enrolled, meter) : [];
    const soonest = soonestClock(clocks);
    const iv = rule.intervals;

    // An Annual Inspection interval counts to the certificate on the asset, where there is
    // one: 365 days from nothing is a figure nobody can act on while the date it was
    // actually done is sitting on the record.
    const safety = isAnnualSafetyInterval(rule.serviceTypeIds) ? annualSafety : undefined;
    const fromAnnualRecord = !!safety && !!iv?.days && !enrolled?.lastServiceDate;
    const shownClocks = fromAnnualRecord
        ? ([annualClock(safety!, iv!.days!.every), ...clocks.filter((c) => c.unit !== 'days')]
            .filter(Boolean) as typeof clocks)
        : clocks;
    const shownSoonest = fromAnnualRecord ? soonestClock(shownClocks) : soonest;

    return {
        intervalId: rule.id,
        name: rule.name,
        tier: rule.tier,
        everyText: intervalText(iv).join(' · ') || 'By hand',
        services: rule.serviceTypeIds.map(serviceName),
        serviceTypeIds: rule.serviceTypeIds,
        state: assetStateFor(tracking || fromAnnualRecord, shownClocks, open?.status),
        // The rule's own clocks where it has them; failing that, whatever the task
        // carries, which is how the seeded rules answer.
        due: shownSoonest
            ? { at: shownSoonest.dueText, left: shownSoonest.remainingText, over: shownSoonest.over, label: shownSoonest.label }
            : tracking ? dueFromRule(open?.dueRule, meter) : undefined,
        clocks: shownClocks,
        // What the rule runs at all, so a column can tell "does not go by hours" from
        // "nobody has said what its hours read".
        runs: {
            mileage: iv?.mileage ? `every ${iv.mileage.every.toLocaleString()} ${iv.mileage.unit === 'km' ? 'km' : 'mi'}` : undefined,
            hours: iv?.engineHours ? `every ${iv.engineHours.every.toLocaleString()} h` : undefined,
            days: iv?.days ? `every ${iv.days.every.toLocaleString()} days` : undefined,
        },
        tracking: tracking || fromAnnualRecord,
        enrolled,
        fromAnnualRecord,
        lastService: fromAnnualRecord
            ? { date: safety!.lastDate, odometer: safety!.odometer, odometerUnit: safety!.odometerUnit }
            : undefined,
        taskId: open?.id,
    };
}

/** Worst first, and among equals whatever falls due soonest. */
export const ASSET_STATE_RANK: Record<AssetState | 'none', number> = {
    overdue: 0, due: 1, upcoming: 2, untracked: 3, none: 4,
};

/**
 * One unit, and every rule it is on.
 *
 * The row the module's asset list is built from, and the one its detail page reads. A
 * second screen wanting the same list builds it with this rather than with its own loop.
 */
export function assetMaintenanceRow(
    asset: { id: string; label: string; kind?: 'truck' | 'trailer'; description?: string; driver?: string; meter: AssetMeter },
    rules: ServiceIntervalRow[],
    tasks: MaintenanceTask[],
    serviceName: (id: string) => string,
    opts: { annualSafety?: AnnualCapture; openOrders?: (taskIds: string[]) => number } = {},
): MaintenanceAssetRow {
    const lines = rules
        .filter((r) => r.assetIds.includes(asset.id))
        .map((r) => assetIntervalLine(r, asset.id, tasks, asset.meter, serviceName, opts.annualSafety));

    const counts: Record<AssetState, number> = { overdue: 0, due: 0, upcoming: 0, untracked: 0 };
    for (const l of lines) counts[l.state] += 1;

    const sorted = [...lines].sort((a, b) => ASSET_STATE_RANK[a.state] - ASSET_STATE_RANK[b.state]);
    const state: AssetState | 'none' = lines.length === 0 ? 'none' : sorted[0].state;
    const outstandingTaskIds = lines.map((l) => l.taskId).filter(Boolean) as string[];

    return {
        id: asset.id,
        label: asset.label,
        kind: asset.kind,
        description: asset.description,
        driver: asset.driver,
        meter: asset.meter,
        lines: sorted,
        counts,
        state,
        next: sorted.find((l) => l.due) ?? sorted[0],
        openOrders: opts.openOrders?.(outstandingTaskIds) ?? 0,
        outstandingTaskIds,
    };
}
