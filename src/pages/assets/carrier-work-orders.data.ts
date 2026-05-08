// Per-carrier Work Orders + Maintenance Tasks (auto-generated)
//
// For every non-Acme carrier this file generates:
//   • A small set of MaintenanceTask records, one per asset, mixing statuses
//     (upcoming / due / overdue / in_progress / completed).
//   • A handful of TaskOrder records grouping those tasks under a vendor — a
//     mix of open and completed orders so the Asset Maintenance page has
//     real data to render across all its tabs.
//
// Acts as backend data: every record has a real asset id and a real vendor id
// from the per-carrier seed, so the existing maintenance UI already knows how
// to filter and group it without any frontend changes.
//
// Acme (acct-001) keeps the original hand-curated INITIAL_TASKS / INITIAL_ORDERS
// in `maintenance.data.ts` — those reference the demo asset ids a1..a7 which
// are not part of the per-carrier asset registry.

import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import type { Asset } from "@/pages/assets/assets.data";
import { VENDORS } from "@/pages/inventory/inventory.data";
import type {
    MaintenanceTask,
    MaintenanceTaskStatus,
    TaskOrder,
} from "./maintenance.data";

// ── Deterministic PRNG ──────────────────────────────────────────────────────

function hash(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h = (h ^ s.charCodeAt(i)) >>> 0;
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}
function mulberry32(seed: number) {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// pickIdx reserved for future use; left as comment to avoid an unused-symbol error.
// const pickIdx = (r: () => number, n: number) => Math.floor(r() * n);

// ── Maintenance task templates per service type ────────────────────────────

const SERVICE_TEMPLATES: Array<{
    serviceTypeId: string;
    unit: "miles" | "days" | "engine_hours";
    every: number;
    threshold: number;
}> = [
    { serviceTypeId: "oil_filter",        unit: "miles",        every: 15000, threshold: 5000 },
    { serviceTypeId: "tire_rotation",     unit: "miles",        every: 10000, threshold: 1000 },
    { serviceTypeId: "brake_inspection",  unit: "miles",        every: 25000, threshold: 3000 },
    { serviceTypeId: "annual_inspection", unit: "days",         every: 365,   threshold: 30   },
    { serviceTypeId: "grease_fifth_wheel",unit: "miles",        every: 5000,  threshold: 700  },
    { serviceTypeId: "reefer_service",    unit: "engine_hours", every: 1000,  threshold: 100  },
];

const STATUS_MIX: MaintenanceTaskStatus[] = [
    "upcoming", "due", "overdue", "completed", "in_progress",
];

// ── Per-carrier builder ────────────────────────────────────────────────────

interface CarrierWorkOrdersOutput {
    tasks: MaintenanceTask[];
    orders: TaskOrder[];
}

function isoOffset(daysFromNow: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
}

function buildForCarrier(account: AccountRecord): CarrierWorkOrdersOutput {
    const assets: Asset[] = CARRIER_ASSETS[account.id] ?? [];
    if (assets.length === 0) return { tasks: [], orders: [] };

    // Vendor pool for this carrier — repair shops first, others as fallback.
    const carrierVendors = VENDORS.filter((v) => v.accountId === account.id);
    const repairVendors = carrierVendors.filter((v) => v.categoryId === "cat-repair-maintenance");
    const vendorPool = repairVendors.length > 0 ? repairVendors : carrierVendors;
    if (vendorPool.length === 0) return { tasks: [], orders: [] };

    const r = mulberry32(hash(`workOrders:${account.id}`));
    const tasks: MaintenanceTask[] = [];
    const orders: TaskOrder[] = [];

    // Every vehicle gets at least one task + work order. The first handful
    // get a second task so dashboards have richer due/open/completed examples.
    const seedAssets = assets;

    seedAssets.forEach((asset, i) => {
        const taskCount = i < 8 ? 2 : 1;
        const assetTasks: MaintenanceTask[] = [];

        for (let t = 0; t < taskCount; t++) {
            const tmpl = SERVICE_TEMPLATES[(i + t) % SERVICE_TEMPLATES.length]!;
            const status = STATUS_MIX[Math.floor(r() * STATUS_MIX.length)]!;
            const odometer = (asset.odometer ?? 100000) + Math.floor(r() * 50000);
            const engineHours = 1500 + Math.floor(r() * 6000);
            const captureDate = isoOffset(-Math.floor(r() * 60));

            const task: MaintenanceTask = {
                id: `task_${account.id}_${asset.id}_${tmpl.serviceTypeId}`,
                assetId: asset.id,
                scheduleId: `sch_${account.id}_${asset.id}_${tmpl.serviceTypeId}`,
                serviceTypeIds: [tmpl.serviceTypeId],
                status,
                meterSnapshot: {
                    odometer,
                    engineHours,
                    capturedAt: captureDate,
                },
                dueRule: {
                    unit: tmpl.unit,
                    frequencyEvery: tmpl.every,
                    upcomingThreshold: tmpl.threshold,
                    ...(tmpl.unit === "miles"
                        ? { dueAtOdometer: odometer + tmpl.threshold }
                        : tmpl.unit === "engine_hours"
                            ? { dueAtEngineHours: engineHours + tmpl.threshold }
                            : { dueAtDate: isoOffset(15) }),
                },
                createdAt: isoOffset(-Math.floor(r() * 90) - 30),
            };
            tasks.push(task);
            assetTasks.push(task);
        }

        // Group this asset's tasks into a single TaskOrder (open or completed).
        const vendor = vendorPool[i % vendorPool.length]!;
        const orderStatus: TaskOrder["status"] = (() => {
            const s = r();
            if (s < 0.55) return "open";
            if (s < 0.92) return "completed";
            return "cancelled";
        })();

        const order: TaskOrder = {
            id: `wo_${account.id}_${asset.id}`,
            taskIds: assetTasks.map((tk) => tk.id),
            vendorId: vendor.id,
            status: orderStatus,
            createdAt: isoOffset(-Math.floor(r() * 60) - 5),
            dueDate: isoOffset(Math.floor(r() * 30) + 1),
            meta: {
                odometerRequired: true,
                odometerUnit: account.country === "CA" ? "km" : "miles",
                engineHoursRequired: tmpl_includesReefer(assetTasks),
            },
            notes:
                orderStatus === "open"
                    ? "Driver flagged the issue on pre-trip; please complete within the due window."
                    : orderStatus === "completed"
                        ? "Closed — invoice on file."
                        : "Cancelled — replaced by follow-up order.",
            completions:
                orderStatus !== "completed"
                    ? []
                    : [
                          {
                              id: `comp_${account.id}_${asset.id}`,
                              completedAt: isoOffset(-Math.floor(r() * 30) - 1),
                              invoiceNumber: `INV-${new Date().getFullYear()}-${String(1000 + Math.floor(r() * 9000)).padStart(4, "0")}`,
                              invoiceDate: isoOffset(-Math.floor(r() * 30) - 1).slice(0, 10),
                              currency: account.country === "CA" ? "CAD" : "USD",
                              taskIds: assetTasks.map((tk) => tk.id),
                              assetBreakdowns: [
                                  {
                                      assetId: asset.id,
                                      finalOdometer:
                                          (asset.odometer ?? 100000) + Math.floor(r() * 8000),
                                      finalEngineHours: 1500 + Math.floor(r() * 6000),
                                      costs: {
                                          partsAndSupplies: 80 + Math.floor(r() * 700),
                                          labour: 220 + Math.floor(r() * 600),
                                          tax: 30 + Math.floor(r() * 80),
                                          totalPaid: 0, // computed below
                                      },
                                      remarks: "Work completed; inspection passed.",
                                  },
                              ],
                          },
                      ],
        };

        // Backfill totalPaid.
        for (const c of order.completions) {
            for (const a of c.assetBreakdowns) {
                a.costs.totalPaid =
                    a.costs.partsAndSupplies + a.costs.labour + a.costs.tax;
            }
        }

        orders.push(order);
    });

    return { tasks, orders };
}

function tmpl_includesReefer(tasks: MaintenanceTask[]): boolean {
    return tasks.some((t) => t.serviceTypeIds.includes("reefer_service"));
}

// ── Public API ──────────────────────────────────────────────────────────────

const built = (() => {
    const allTasks: MaintenanceTask[] = [];
    const allOrders: TaskOrder[] = [];
    const byCarrier: Record<string, CarrierWorkOrdersOutput> = {};
    for (const account of ACCOUNTS_DB) {
        const out = buildForCarrier(account);
        byCarrier[account.id] = out;
        allTasks.push(...out.tasks);
        allOrders.push(...out.orders);
    }
    return { allTasks, allOrders, byCarrier };
})();

/** Generated maintenance tasks for all real carrier assets. */
export const CARRIER_GENERATED_TASKS = built.allTasks;

/** Generated work orders for all real carrier assets. */
export const CARRIER_GENERATED_ORDERS = built.allOrders;

/** Per-carrier breakdown of tasks + orders. */
export const CARRIER_WORK_ORDERS_BY_CARRIER: Record<string, CarrierWorkOrdersOutput> =
    built.byCarrier;

/** Returns the work orders + tasks for a specific carrier. */
export function getWorkOrdersForCarrier(accountId: string): CarrierWorkOrdersOutput {
    return built.byCarrier[accountId] ?? { tasks: [], orders: [] };
}
