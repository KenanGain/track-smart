/**
 * Per-asset maintenance forecast.
 *
 * Spec: docs/SAFETY.md (extension — vehicle future-maintenance prediction).
 *
 * Two prediction sources:
 *   1. Existing scheduled tasks with `dueRule.dueAtDate` — used directly.
 *   2. Frequency-based interval projection: if a task has `dueRule.unit
 *      = 'days' | 'miles' | 'engine_hours'`, predict the next due date
 *      using the asset's avg utilization (miles / day or hours / day).
 *
 * Pure functions — no React. The UI bins results into the user's selected
 * horizon and surfaces them in a list.
 */

import { getOrdersForCarrier, getTasksForCarrier } from '@/pages/assets/maintenance.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { INITIAL_SERVICE_TYPES, type MaintenanceTask } from '@/pages/assets/maintenance.data';

export interface MaintenanceForecastItem {
    /** Asset id this task targets. */
    assetId: string;
    /** Display label for the asset (unit number or VIN tail). */
    assetLabel: string;
    /** Source maintenance task id. */
    taskId: string;
    /** Service-type ids covered by the task. */
    serviceTypeIds: string[];
    /** Pretty service-type names. */
    serviceLabels: string[];
    /** Current task status. */
    status: MaintenanceTask['status'];
    /** Predicted (or scheduled) due date — ISO YYYY-MM-DD. */
    predictedDue: string;
    /** Days from today until predicted due (negative = overdue). */
    daysUntilDue: number;
    /** How we got the date. */
    method: 'scheduled' | 'projected-days' | 'projected-miles' | 'projected-hours' | 'overdue';
    /** Confidence in the prediction. */
    confidence: 'high' | 'medium' | 'low';
    /** 0..10 — derived from service-type group + status. */
    severity: number;
    /** Diagnostic details for the UI tooltip. */
    note?: string;
    /** Estimated cost (USD/CAD per the carrier's currency mix) derived from
     *  historical work orders for similar service types. May be 0 when no
     *  historical record exists for any of the listed service types. */
    estimatedCost: number;
    /** Number of historical work orders that fed the cost estimate (1+
     *  means high confidence; 0 means we fell back to a category default). */
    costSampleSize: number;
}

const SERVICE_TYPE_BY_ID: Record<string, (typeof INITIAL_SERVICE_TYPES)[number]> = Object.fromEntries(
    INITIAL_SERVICE_TYPES.map((s) => [s.id, s]),
);

function serviceLabel(id: string): string {
    return SERVICE_TYPE_BY_ID[id]?.name ?? id;
}

function severityForServiceTypes(ids: string[], status: MaintenanceTask['status']): number {
    const base = ids.some((id) => /brake|tire|steer|cvip|annual|safety|emission/i.test(serviceLabel(id))) ? 7 : 4;
    if (status === 'overdue') return Math.min(10, base + 3);
    if (status === 'due') return Math.min(10, base + 1);
    return base;
}

/** Estimate average miles/day or hours/day for an asset, used for
 *  utilization-driven projection. Falls back to fleet defaults when the
 *  asset has no usage history on file. */
function utilizationFor(assetId: string, carrierId: string): { milesPerDay: number; hoursPerDay: number } {
    const asset = (CARRIER_ASSETS[carrierId] ?? []).find((a) => a.id === assetId) as
        | { odometer?: number; year?: number; engineHours?: number }
        | undefined;
    if (!asset) return { milesPerDay: 220, hoursPerDay: 6 };

    const yearsInService = Math.max(1, new Date().getFullYear() - (asset.year ?? new Date().getFullYear() - 2));
    const miles = asset.odometer ?? 0;
    const hours = asset.engineHours ?? 0;
    return {
        milesPerDay: miles > 0 ? Math.max(50, miles / (yearsInService * 365)) : 220,
        hoursPerDay: hours > 0 ? Math.max(2, hours / (yearsInService * 365)) : 6,
    };
}

/** Forecast all upcoming maintenance for a carrier within N months. */
export function forecastCarrierMaintenance(
    carrierId: string,
    horizonMonths: number,
): MaintenanceForecastItem[] {
    const tasks = getTasksForCarrier(carrierId);
    const today = new Date();
    const todayMs = today.getTime();
    const horizonMs = todayMs + horizonMonths * 30 * 86_400_000;
    const out: MaintenanceForecastItem[] = [];

    // Build a per-service-type historical-cost average from completed orders
    // for this carrier. Used to populate `estimatedCost` on each forecast row.
    const costIndex = buildServiceCostIndex(carrierId);

    for (const t of tasks) {
        if (t.status === 'completed' || t.status === 'cancelled') continue;
        const asset = (CARRIER_ASSETS[carrierId] ?? []).find((a) => a.id === t.assetId);
        const assetLabel = asset
            ? `Unit ${asset.unitNumber ?? asset.id.slice(-4)}`
            : t.assetId;

        let predictedDue: string | undefined;
        let method: MaintenanceForecastItem['method'] = 'scheduled';
        let confidence: MaintenanceForecastItem['confidence'] = 'high';
        let note: string | undefined;

        // 1. Direct scheduled date
        if (t.dueRule?.dueAtDate) {
            predictedDue = t.dueRule.dueAtDate.slice(0, 10);
            method = 'scheduled';
            confidence = 'high';
        }

        // 2. Project by miles using current odometer + utilization
        if (!predictedDue && t.dueRule?.dueAtOdometer != null) {
            const cur = t.meterSnapshot?.odometer ?? 0;
            const due = t.dueRule.dueAtOdometer;
            const util = utilizationFor(t.assetId, carrierId);
            if (cur < due && util.milesPerDay > 0) {
                const days = Math.ceil((due - cur) / util.milesPerDay);
                const dt = new Date(todayMs + days * 86_400_000);
                predictedDue = dt.toISOString().slice(0, 10);
                method = 'projected-miles';
                confidence = 'medium';
                note = `Projected at ${util.milesPerDay.toFixed(0)} mi/day until ${due.toLocaleString()} mi.`;
            }
        }

        // 3. Project by engine hours
        if (!predictedDue && t.dueRule?.dueAtEngineHours != null) {
            const cur = t.meterSnapshot?.engineHours ?? 0;
            const due = t.dueRule.dueAtEngineHours;
            const util = utilizationFor(t.assetId, carrierId);
            if (cur < due && util.hoursPerDay > 0) {
                const days = Math.ceil((due - cur) / util.hoursPerDay);
                const dt = new Date(todayMs + days * 86_400_000);
                predictedDue = dt.toISOString().slice(0, 10);
                method = 'projected-hours';
                confidence = 'medium';
                note = `Projected at ${util.hoursPerDay.toFixed(1)} hrs/day.`;
            }
        }

        // 4. Project by recurring frequency (days)
        if (!predictedDue && t.dueRule?.unit === 'days' && t.dueRule.frequencyEvery) {
            const last = new Date(t.createdAt).getTime();
            const dt = new Date(last + t.dueRule.frequencyEvery * 86_400_000);
            predictedDue = dt.toISOString().slice(0, 10);
            method = 'projected-days';
            confidence = 'medium';
            note = `Every ${t.dueRule.frequencyEvery} days from ${new Date(t.createdAt).toLocaleDateString()}.`;
        }

        // Fall-back: overdue tasks without a date use today.
        if (!predictedDue) {
            predictedDue = today.toISOString().slice(0, 10);
            method = 'overdue';
            confidence = 'low';
            note = 'No due rule on file — flagged as currently due.';
        }

        const dueMs = new Date(predictedDue).getTime();
        const daysUntilDue = Math.round((dueMs - todayMs) / 86_400_000);

        // Skip items beyond the horizon (but always include overdue).
        if (dueMs > horizonMs && t.status !== 'overdue') continue;

        const cost = estimateCost(t.serviceTypeIds, costIndex);
        out.push({
            assetId: t.assetId,
            assetLabel,
            taskId: t.id,
            serviceTypeIds: t.serviceTypeIds,
            serviceLabels: t.serviceTypeIds.map(serviceLabel),
            status: t.status,
            predictedDue,
            daysUntilDue,
            method,
            confidence,
            severity: severityForServiceTypes(t.serviceTypeIds, t.status),
            note,
            estimatedCost: cost.amount,
            costSampleSize: cost.sampleSize,
        });
    }

    return out.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

// ── Cost estimation ─────────────────────────────────────────────────────────

interface CostSample { total: number; count: number }
type CostIndex = Map<string, CostSample>; // keyed by serviceTypeId

/** Default cost (in dollars) when no historical sample exists for any of the
 *  task's service types. Tuned conservatively from public US/CA averages so
 *  exec-budgeting numbers land in the right ballpark. */
const DEFAULT_SERVICE_COST: Record<string, number> = {
    brake: 850,
    tire: 1_200,
    cvip: 250,
    annual: 600,
    safety: 600,
    oil: 220,
    fluid: 180,
    inspection: 200,
    emission: 380,
    steering: 750,
    alignment: 320,
    suspension: 950,
    transmission: 2_400,
    engine: 3_800,
    hvac: 520,
    electrical: 480,
    body: 700,
};

/** Walk every completed work-order in this carrier's history and aggregate
 *  total paid by the (single) service type each task covered. Tasks linked
 *  to multiple service types divide the cost evenly across them. */
function buildServiceCostIndex(carrierId: string): CostIndex {
    const tasks = getTasksForCarrier(carrierId);
    const orders = getOrdersForCarrier(carrierId);
    const taskById = new Map(tasks.map((t) => [t.id, t] as const));
    const idx: CostIndex = new Map();
    for (const o of orders) {
        for (const ev of o.completions ?? []) {
            // Total paid across all assets in this completion event.
            const total = (ev.assetBreakdowns ?? []).reduce(
                (a, b) => a + (b.costs?.totalPaid ?? 0), 0,
            );
            if (total <= 0) continue;
            // Distribute evenly across the service types of the linked tasks.
            const sTypes = new Set<string>();
            for (const tid of ev.taskIds) {
                const t = taskById.get(tid);
                for (const s of t?.serviceTypeIds ?? []) sTypes.add(s);
            }
            if (sTypes.size === 0) continue;
            const each = total / sTypes.size;
            for (const s of sTypes) {
                const cur = idx.get(s);
                if (cur) { cur.total += each; cur.count += 1; }
                else idx.set(s, { total: each, count: 1 });
            }
        }
    }
    return idx;
}

/** Estimate cost for a forecast row from the historical index, falling
 *  back to a category default when no sample exists. */
function estimateCost(
    serviceTypeIds: string[],
    idx: CostIndex,
): { amount: number; sampleSize: number } {
    let amount = 0;
    let sampleSize = 0;
    for (const id of serviceTypeIds) {
        const hist = idx.get(id);
        if (hist && hist.count > 0) {
            amount += hist.total / hist.count;
            sampleSize += hist.count;
            continue;
        }
        // Fallback by service-type name keyword match.
        const label = (serviceLabel(id) || '').toLowerCase();
        const fallback =
            Object.entries(DEFAULT_SERVICE_COST).find(([k]) => label.includes(k))?.[1]
            ?? 250;
        amount += fallback;
    }
    return { amount: Math.round(amount), sampleSize };
}

/** Sum of estimated cost across a list of items — handy for the UI footer. */
export function totalEstimatedCost(items: MaintenanceForecastItem[]): number {
    return items.reduce((a, it) => a + (it.estimatedCost ?? 0), 0);
}

/** Bucket maintenance items per future month — feeds the risk forecast. */
export function maintenancePerMonth(
    items: MaintenanceForecastItem[],
    horizonMonths: number,
): number[] {
    const buckets: number[] = Array.from({ length: horizonMonths + 1 }, () => 0);
    const today = new Date();
    for (const it of items) {
        const due = new Date(it.predictedDue);
        const monthsAhead = Math.max(
            0,
            Math.round(
                (due.getFullYear() - today.getFullYear()) * 12
                + (due.getMonth() - today.getMonth()),
            ),
        );
        if (monthsAhead <= horizonMonths) buckets[monthsAhead] += 1;
    }
    return buckets;
}
