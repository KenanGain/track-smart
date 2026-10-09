import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, Check, Search, Truck, Store, Calendar, CalendarClock, FileText, Mail, Copy, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INITIAL_ASSETS as DEMO_FLEET, type Asset as FleetAsset } from "./assets.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
// Messages is how this office reaches anybody — a driver in their own thread, a shop as
// an outside contact. An order that names somebody and never reaches them is a note in a
// drawer.
import { shareToMessages, getOrCreateDriverConversation } from "@/pages/messages/messages-store";
// How often a service comes round, asked the same way everywhere it is asked: a tick and
// a figure per clock, so an unticked row writes nothing and a ticked one with no figure
// is not stored as "every 0" — which reads as due forever, from the moment it is saved.
import {
    ServiceIntervalFields, EMPTY_INTERVALS, fromDraft, type IntervalDraft,
} from "@/components/maintenance/ServiceIntervalFields";
import type { ServiceIntervals } from "@/types/service-types";

/**
 * Every asset this form can raise an order against.
 *
 * It used to read the demo fleet alone (a1—a7), so opening the form from one of the
 * carrier—s own units — which is every unit outside the demo — found nothing: the picker
 * came up empty, Section 1 said "select an asset first", and the order it was opened with
 * looked like an order about nothing. Ids are unique across carriers, so one lookup
 * answers for all of them.
 */
const FLEET: FleetAsset[] = [
    ...Object.values(CARRIER_ASSETS).flat(),
    ...DEMO_FLEET,
];
const INITIAL_ASSETS = FLEET;
import type { MaintenanceTask } from "./maintenance.data";
import { VENDOR_CATEGORIES, US_STATES, CA_PROVINCES, ADDRESS_COUNTRIES } from "@/pages/inventory/inventory.data";
// Live service-types store — picks up edits from Settings → Maintenance
// without remounting. Adding a service in settings appears here instantly.
import { useServiceTypes } from "@/data/serviceTypesStore";
import {
    buildVendorPortalUrl,
    buildMailtoLink,
    type VendorOrderPayload,
} from "@/pages/vendor-portal/vendorPortal.utils";
import { cn } from "@/lib/utils";

// --- Local UI Components (Copied for isolation/consistency) ---

const Button = ({ variant = "primary", size = "default", className = "", children, ...props }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const sizes: Record<string, string> = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9"
    };
    const variants: Record<string, string> = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        destructive: "bg-red-500 text-white hover:bg-red-600",
    };
    return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = React.forwardRef(({ className, disabled, ...props }: any, ref: any) => (
    <input ref={ref} disabled={disabled} className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${className}`} {...props} />
));
Input.displayName = "Input";

const Label = ({ children, className = "" }: any) => (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>
);

// --- Create Order Page Component ---

interface CarrierAccount {
    id: string;
    legalName: string;
    dbaName?: string;
    dotNumber?: string;
    city?: string;
    state?: string;
}

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (orderData: any) => void;
    selectedTasks?: MaintenanceTask[];
    availableTasks?: MaintenanceTask[];
    vendors: any[];
    onAddVendor: (vendor: any) => void;
    preSelectedAssetId?: string;
    /** Active carrier — surfaced in the header, vendor portal, and email. */
    account?: CarrierAccount;
    /** The carrier’s drivers, for a bill the driver paid. */
    drivers?: { id: string; name: string }[];
    /**
     * The work this order was opened with: one row per asset per interval.
     *
     * The form used to be handed TASKS, which is a narrower thing — an interval that has
     * not raised one yet has no task to hand over, so ticking four rows on an asset’s page
     * produced an order with one item in it. A row is a job: the asset, what is to be
     * done, and the task behind it where one already exists.
     */
    workRows?: WorkRow[];
    /** Every interval an asset is on, for adding another unit to the order. */
    intervalsForAsset?: (assetId: string) => WorkRow[];
    /**
     * Start a rule for this unit, from here.
     *
     * The work you need doing is often work the unit is not on a rule for yet, and the
     * answer to that was to close the order, go to Service Intervals, build the rule,
     * enrol the unit, come back and raise the order again. It returns the job so it can
     * be ticked onto the order that prompted it.
     */
    onAddInterval?: (spec: {
        name: string;
        serviceTypeIds: string[];
        assetId: string;
        intervals: ServiceIntervals;
    }) => WorkRow | undefined;
}

/** One job on an order: this asset, this piece of work. */
export interface WorkRow {
    assetId: string;
    /** The rule it comes from, where it comes from one. */
    intervalId?: string;
    name: string;
    serviceTypeIds: string[];
    /** The task already raised for it, if any — otherwise one is raised on save. */
    taskId?: string;
    status?: string;
    /*
     * What the rule says and where it stands.
     *
     * Carried so the list can be read rather than recognised: "PM-B" on its own is a code
     * somebody has to already know, and deciding which jobs go to the shop on this visit
     * means seeing which of them are overdue and which are 8,000 miles away.
     */
    tier?: string;
    everyText?: string;
    services?: string[];
    due?: { at?: string; left?: string; over?: boolean };
}

export const CreateOrderModal = ({ isOpen, onClose, onCreate, selectedTasks, availableTasks, vendors, onAddVendor, preSelectedAssetId, account, drivers = [], workRows, intervalsForAsset, onAddInterval }: CreateOrderModalProps) => {
    // Live service-type catalog. Re-renders automatically when an admin
    // adds/edits a service in Settings → Maintenance.
    const SERVICE_TYPES = useServiceTypes();
    /**
     * Who the work is being handed to.
     *
     * A vendor is a shop that invoices; a driver is the person already standing next to
     * the truck. Asked before anything else in that section, because every field under it
     * belongs to one answer or the other %s a vendor's email on an order a driver is doing
     * is a question nobody can answer.
     */
    const [assignedDriverId, setAssignedDriverId] = useState("");
    const [vendorId, setVendorId] = useState("");
    const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState("");
    /*
     * What the vendor must record when CLOSING the order is not asked while raising one.
     *
     * The order still carries the field, because the complete-order form reads it and the
     * seeded orders set it — this form simply stops asking a question about the end of a
     * job on the form that starts it.
     */
    const requireOdometer = false;
    const odometerUnit: "miles" | "km" = "miles";
    const requireEngineHours = false;
    const [remarks, setRemarks] = useState("");

    // Add Vendor State — fields mirror AddVendorPage (inventory vendor shape)
    const [isAddingVendor, setIsAddingVendor] = useState(false);
    const emptyVendor = {
        name: "",
        companyName: "",
        categoryId: VENDOR_CATEGORIES[0]?.id ?? "",
        email: "",
        phone: "",
        contactName: "",
        contactInfo: "",
        address: {
            country: "United States" as "United States" | "Canada",
            street: "",
            apt: "",
            city: "",
            state: "",
            zip: "",
        },
    };
    const [newVendor, setNewVendor] = useState(emptyVendor);

    // Section 1 follows a four-step flow:
    //   1) Pick asset class (CMV vs Non-CMV)            → `assetClass`
    //   2) Pick the asset itself                         → `focusAssetId`
    //   3) Toggle on any existing scheduled tasks        → handled via
    //      `localSelectedTaskIds` filtered to focusAsset
    //   4) Optionally add a fresh task with maintenance  → `directTasks`
    //      type + per-task remarks (no schedule needed)
    // Each direct task = one asset + N services + per-service remarks.
    // remarksByService is keyed by service-type id; entries with empty values
    // are dropped at submit time.
    type DirectTaskDraft = {
        id: string;
        assetId: string;
        serviceTypeIds: string[];
        remarksByService?: Record<string, string>;
    };
    // Kept for the vendor-portal payload, which names the unit the order is for.
    const [, setAssetClass] = useState<"CMV" | "Non-CMV">("CMV");
    const [, setFocusAssetId] = useState("");
    const [directTasks, setDirectTasks] = useState<DirectTaskDraft[]>([]);
    // Per-task draft state (for the "Add new task" sub-card)

    // Per-service remarks (keyed by service-type id). Same input pattern as the
    // existing scheduled tasks list — a remarks textarea appears inline below
    // each service row that's been checked.
    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setAssignedDriverId("");
            setVendorId("");
            setCreateDate(new Date().toISOString().split('T')[0]);
            setIsAddingVendor(false);
            setNewVendor(emptyVendor);
            setDirectTasks([]);
            setSentOrder(null);
            setCopyConfirm(false);
            // Opened WITH tasks — from an asset, an interval, or a row’s menu — so those
            // are the ticked ones, and the form opens on the asset they belong to rather
            // than on an empty picker that makes the order look like it has nothing in it.
            const incoming = selectedTasks ?? [];
            setLocalSelectedTaskIds(incoming.map(t => t.id));
            setRowRemarks({});
            setJobQuery("");
            setRuleOpen(false);
            setRuleName("");
            setRuleServiceIds([]);
            setRuleQuery("");
            setRuleIv(EMPTY_INTERVALS);
            setAbout("");
            setOrderNameInput("");
            // The work it was opened with. Where the caller said nothing, the tasks it was
            // handed are the work — one row each.
            const seeded: WorkRow[] = workRows?.length
                ? workRows
                : incoming.map(t => ({
                    assetId: t.assetId,
                    name: t.serviceTypeIds.map(id => SERVICE_TYPES.find(x => x.id === id)?.name).filter(Boolean).join(", ") || "Maintenance",
                    serviceTypeIds: t.serviceTypeIds,
                    taskId: t.id,
                    status: t.status,
                }));
            /*
             * Everything else the unit is on comes with it, unticked.
             *
             * Raising an order from a PM-B row used to put PM-B on the form and nothing
             * else, so the truck went to the shop for one job while the oil change it was
             * also overdue for waited for its own visit. The one you came from is ticked;
             * the rest are there to tick.
             */
            const seededKeys = new Set(seeded.map(r => `${r.assetId}::${r.intervalId ?? r.name}`));
            const soleAsset = [...new Set(seeded.map(r => r.assetId))];
            const alsoOn = soleAsset.length === 1
                ? (intervalsForAsset?.(soleAsset[0]) ?? [])
                    .filter(r => !seededKeys.has(`${r.assetId}::${r.intervalId ?? r.name}`))
                : [];
            setRows([
                ...seeded.map(r => ({ ...r, key: `${r.assetId}::${r.intervalId ?? r.name}`, on: true })),
                ...alsoOn.map(r => ({ ...r, key: `${r.assetId}::${r.intervalId ?? r.name}`, on: false })),
            ]);
            const assetIds = [...new Set(seeded.map(r => r.assetId))];
            const focus = preSelectedAssetId
                ?? (assetIds.length === 1 ? assetIds[0] : undefined);
            const pre = focus ? INITIAL_ASSETS.find(a => a.id === focus) : undefined;
            if (pre) {
                setAssetClass(pre.assetCategory);
                setFocusAssetId(pre.id);
            } else {
                setAssetClass("CMV");
                setFocusAssetId("");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Vendor-portal email-send state. Populated after a successful create so the
    // user can copy the link or fire the real Resend send without leaving the modal.
    type SentOrderState = {
        portalUrl: string;
        vendorEmail: string;
        vendorName: string;
        workOrderNumber: string;
        // Snapshot of the payload so we can re-send if needed without rebuilding.
        payload: VendorOrderPayload;
    };
    const [sentOrder, setSentOrder] = useState<SentOrderState | null>(null);
    const [copyConfirm, setCopyConfirm] = useState(false);
    const [sendStatus, setSendStatus] = useState<
        | { state: 'idle' }
        | { state: 'sending' }
        | { state: 'sent'; messageId?: string }
        | { state: 'error'; message: string }
    >({ state: 'idle' });

    const [localSelectedTaskIds, setLocalSelectedTaskIds] = useState<string[]>([]);

    /** One job on the order, with whether it is ticked and what was said about it. */
    type Row = WorkRow & { key: string; on: boolean };
    const [rows, setRows] = useState<Row[]>([]);
    const [rowRemarks, setRowRemarks] = useState<Record<string, string>>({});
    /*
     * A rule being started from this form.
     *
     * Deliberately the three clocks and the services and nothing else: this is not the
     * interval builder, it is the short way to put a rule on a unit that needs one now.
     * Anything else about the rule is edited on its own page afterwards.
     */
    const [ruleOpen, setRuleOpen] = useState(false);
    const [ruleName, setRuleName] = useState("");
    const [ruleServiceIds, setRuleServiceIds] = useState<string[]>([]);
    const [ruleQuery, setRuleQuery] = useState("");
    const [ruleIv, setRuleIv] = useState<IntervalDraft>(EMPTY_INTERVALS);

    /** What the order is for, in words — the only thing a shop can work from with no interval. */
    const [about, setAbout] = useState("");
    /**
     * What to call it.
     *
     * Left empty the order is named after its own work and unit, which is how it gets
     * talked about anyway. Typed, it is whatever the yard calls this run of work.
     */
    const [orderNameInput, setOrderNameInput] = useState("");
    const rowKey = (r: WorkRow) => `${r.assetId}::${r.intervalId ?? r.name}`;
    const setRowsOn = (keys: string[], on: boolean) =>
        setRows(rs => rs.map(r => (keys.includes(r.key) ? { ...r, on } : r)));
    /**
     * One asset on an order, and as many of its intervals as you like.
     *
     * It used to accumulate: pick a second unit and its jobs joined the first unit's, on
     * one form, which then raised one work order per asset behind your back. Three trucks
     * went to the shop as three orders you never saw separately %s so a remark typed
     * against the trailer, a vendor chosen for the tractor and a due date set for all of
     * them belonged to three different pieces of paper.
     *
     * One asset is what a shop receives and what a bill comes back for. Picking another
     * replaces the first rather than adding to it.
     */
    const pickAsset = (assetId: string) => {
        const incoming = (intervalsForAsset?.(assetId) ?? []).map(r => ({ ...r, key: rowKey(r), on: true }));
        // An asset with no interval at all still belongs on the order: the work is
        // whatever Section 2 says it is.
        setRows(incoming.length ? incoming : [{
            assetId, name: "Work to be described", serviceTypeIds: [], key: `${assetId}::adhoc`, on: true,
        } as Row]);
    };

    /** The one unit this order is for, where one has been picked. */
    const orderAssetId = rows[0]?.assetId;

    /**
     * Start the rule, and put its first job on this order.
     *
     * Named after its services where nobody types a name, which is how every other rule
     * in this app gets its name. A rule with no clock at all is allowed: it is work the
     * yard wants done once, and the order is what says when.
     */
    const ruleServiceNames = () => ruleServiceIds
        .map((id) => SERVICE_TYPES.find((x) => x.id === id)?.name)
        .filter(Boolean) as string[];
    const ruleReady = !!orderAssetId && ruleServiceIds.length > 0;
    const addRule = () => {
        if (!ruleReady || !onAddInterval) return;
        const made = onAddInterval({
            name: ruleName.trim() || ruleServiceNames().join(', ') || 'Maintenance',
            serviceTypeIds: ruleServiceIds,
            assetId: orderAssetId!,
            // A ticked row with nothing in it is not an interval; `fromDraft` drops it.
            intervals: fromDraft(ruleIv) ?? {},
        });
        if (!made) return;
        // `new::` so the rail can count what this section actually produced.
        setRows((rs) => [...rs, { ...made, key: `new::${made.intervalId ?? made.name}`, on: true }]);
        setRuleOpen(false);
        setRuleName("");
        setRuleServiceIds([]);
        setRuleQuery("");
        setRuleIv(EMPTY_INTERVALS);
    };

    /**
     * The units this order can be raised against, and the one it is on.
     *
     * Resolved from ONE list, because two lists disagreed: the picker was built from this
     * carrier's fleet and the card under it from every fleet in the app, and ids are not
     * as unique across those as they look — so the box said "AST-001-0001" over a card
     * saying ACM-T0100, about the same order.
     */
    const pickableAssets = useMemo(() => {
        const mine = account?.id ? (CARRIER_ASSETS[account.id] ?? []) : [];
        const pool = mine.length ? mine : INITIAL_ASSETS.slice(0, 60);
        if (!orderAssetId || pool.some((a) => a.id === orderAssetId)) return pool;
        const elsewhere = INITIAL_ASSETS.find((a) => a.id === orderAssetId);
        return elsewhere ? [elsewhere, ...pool] : pool;
    }, [account?.id, orderAssetId]);

    const orderAsset = orderAssetId
        ? pickableAssets.find((a) => a.id === orderAssetId) ?? INITIAL_ASSETS.find((a) => a.id === orderAssetId)
        : undefined;
    const pickedRows = rows.filter(r => r.on);

    /**
     * The jobs this list is showing.
     *
     * A unit on a dozen rules is a list, and "is the annual on this order" is answered by
     * typing it rather than by scrolling. Searched over the work and what it covers,
     * because that is what somebody knows about the job they are looking for.
     */
    const [jobQuery, setJobQuery] = useState("");
    const shownRows = (() => {
        const q = jobQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) => [r.name, r.everyText, r.status, ...(r.services ?? [])]
            .some((v) => String(v ?? "").toLowerCase().includes(q)));
    })();
    /**
     * The jobs this list is showing.
     *
     * Searched over the unit and the work, because on an order covering a dozen units the
     * question is always "is the trailer on this" and scrolling is not an answer. Paged for
     * the same reason: the section is part of a form, and a form that is mostly one list
     * has stopped being a form.
     */
    /** What this order would be called if nobody names it. */
    const suggestedOrderName = (() => {
        const services = [...new Set(pickedRows.map(r => r.name))];
        const units = [...new Set(pickedRows.map(r =>
            INITIAL_ASSETS.find(a => a.id === r.assetId)?.unitNumber ?? r.assetId))];
        const work = services.length === 0 ? 'Maintenance'
            : services.length > 2 ? `${services[0]} +${services.length - 1}`
                : services.join(', ');
        const where = units.length === 1 ? units[0] : units.length === 0 ? 'no unit' : `${units.length} units`;
        return `${work} — ${where}`;
    })();
    const EM_DASH = "—";
    /** Remarks the user types when ticking an existing scheduled task. Same
     *  free-text shape as `draftRemarks` on a New Task — the two inputs
     *  share the "Remarks for this task" label and render side-by-side
     *  consistently. Cleared whenever the modal re-opens. */
    // Side-nav sections — same shape as AddAccountPage so the layout/feel
    // matches the rest of the app's "dedicated page with side nav" pattern.
    /*
     * Five sections, and all five are about work that has not happened yet.
     *
     * Repair Bill asked for an invoice, a mechanic and an odometer on a form whose whole
     * purpose is to SEND work to a shop %s a bill exists when the job comes back, and it
     * is filed when the order is completed or as a service record. Completion
     * Requirements asked which readings the vendor must take, which is a setting about
     * closing an order being asked while raising one.
     */
    const SECTIONS = [
        { id: 'asset',     label: 'Asset & Work',        icon: Truck        },
        { id: 'newrule',   label: 'New Service Interval', icon: CalendarClock },
        { id: 'vendor',    label: 'Who does the work',   icon: Store        },
        { id: 'schedule',  label: 'Schedule',            icon: Calendar   },
        { id: 'comments',  label: 'Additional Comments', icon: FileText   },
    ] as const;
    type SectionId = typeof SECTIONS[number]['id'];

    const [activeSection, setActiveSection] = useState<SectionId>('asset');
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    // Scroll-spy: highlight the section currently in view as the user
    // scrolls through the form.
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const onScroll = () => {
            const top = container.scrollTop + 120;
            let current: SectionId = SECTIONS[0].id;
            for (const s of SECTIONS) {
                const el = sectionRefs.current[s.id];
                if (el && el.offsetTop <= top) current = s.id as SectionId;
            }
            setActiveSection(current);
        };
        container.addEventListener('scroll', onScroll);
        return () => container.removeEventListener('scroll', onScroll);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const scrollToSection = (id: SectionId) => {
        const el = sectionRefs.current[id];
        const container = scrollRef.current;
        if (el && container) {
            container.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (selectedTasks && selectedTasks.length > 0) {
           setLocalSelectedTaskIds(selectedTasks.map(t => t.id));
        } else {
            setLocalSelectedTaskIds([]);
        }
    }, [selectedTasks, isOpen]);

    // Use local tasks if props tasks are empty (selection mode), otherwise use props tasks
    /**
     * Every task this form can put on an order: what the page offered, plus whatever it
     * was opened with.
     *
     * The two used to be an either/or — tasks handed in won, and the tick boxes were read
     * only from the other list. Opening the form from an asset or an interval therefore
     * showed an order you could not change: the asset picker was empty, the task list was
     * empty, and the only evidence anything had been selected was the summary at the
     * bottom. One pool, one set of ticks.
     */
    const taskPool = useMemo(() => {
        const byId = new Map<string, MaintenanceTask>();
        for (const t of availableTasks ?? []) byId.set(t.id, t);
        for (const t of selectedTasks ?? []) byId.set(t.id, t);
        return [...byId.values()];
    }, [availableTasks, selectedTasks]);

    const effectiveSelectedTasks = taskPool.filter(t => localSelectedTaskIds.includes(t.id));


    // Build the self-contained URL payload for the vendor-portal flow.
    // Encodes everything the vendor needs into the link itself — no backend
    // required for the frontend-only test.
    const buildPortalPayload = (orderId: string, finalVendorId: string): VendorOrderPayload | null => {
        const vendor = vendors.find((v: any) => v.id === finalVendorId);
        if (!vendor) return null;

        // Tasks come from two sources: existing scheduled tasks the user picked,
        // and inline directTasks. Flatten both into a per-asset structure.
        const perAsset = new Map<string, { assetId: string; serviceTypeIds: Set<string> }>();
        for (const t of effectiveSelectedTasks) {
            const entry = perAsset.get(t.assetId) ?? { assetId: t.assetId, serviceTypeIds: new Set<string>() };
            t.serviceTypeIds.forEach((sid: string) => entry.serviceTypeIds.add(sid));
            perAsset.set(t.assetId, entry);
        }
        for (const dt of directTasks) {
            const entry = perAsset.get(dt.assetId) ?? { assetId: dt.assetId, serviceTypeIds: new Set<string>() };
            dt.serviceTypeIds.forEach(sid => entry.serviceTypeIds.add(sid));
            perAsset.set(dt.assetId, entry);
        }

        const tasks = Array.from(perAsset.values()).map(({ assetId, serviceTypeIds }) => {
            const asset = INITIAL_ASSETS.find(a => a.id === assetId);
            return {
                assetId,
                unitNumber: asset?.unitNumber ?? assetId,
                year: asset?.year,
                make: asset?.make,
                model: asset?.model,
                vin: asset?.vin,
                services: Array.from(serviceTypeIds).map(sid => {
                    const s = SERVICE_TYPES.find(st => st.id === sid);
                    return { id: sid, name: s?.name ?? sid, group: s?.group ?? "" };
                }),
            };
        });

        return {
            orderId,
            workOrderNumber: orderId.replace(/^ord_/, "").slice(0, 8).toUpperCase(),
            createdBy: { name: account?.dbaName || account?.legalName || "TrackSmart Fleet" },
            carrier: account ? {
                id: account.id,
                legalName: account.legalName,
                dbaName: account.dbaName,
                dotNumber: account.dotNumber,
                city: account.city,
                state: account.state,
            } : undefined,
            vendor: {
                id: vendor.id,
                name: vendor.name || vendor.companyName || "Vendor",
                email: vendor.email,
                companyName: vendor.companyName,
            },
            createDate,
            dueDate: dueDate || undefined,
            notes: remarks || undefined,
            requirements: {
                odometerRequired: requireOdometer,
                odometerUnit,
                engineHoursRequired: requireEngineHours,
            },
            tasks,
        };
    };

    /**
     * The order, as the page will build it.
     *
     * A row that already has a task joins by its id; one that does not becomes a new task
     * on that asset — which is what makes "tick four intervals, raise one order" work on an
     * asset where only one of them had raised a task so far.
     */
    const orderTaskIds = () => pickedRows.map(r => r.taskId).filter(Boolean) as string[];
    const orderDirectTasks = () => {
        const out: { assetId: string; serviceTypeIds: string[]; remarksByService?: Record<string, string> }[] = [];
        /*
         * The work on the order is the work ticked in Section 1, full stop.
         *
         * Section 3 used to carry a loose "Services" list of its own that was added to
         * every asset on the order — a third way of putting work on one, beside the
         * unit's own intervals and the rule Section 2 can start. Three ways to answer one
         * question is three places for the answer to differ, and the loose one produced
         * tasks against no rule, which nothing could ever close properly.
         */
        for (const r of pickedRows.filter(x => !x.taskId)) {
            if (!r.serviceTypeIds.length) continue;
            out.push({ assetId: r.assetId, serviceTypeIds: r.serviceTypeIds });
        }
        return out;
    };

    const validateAndResolveVendor = (): { ok: boolean; vendorId: string } => {
        if (pickedRows.length === 0 && !about.trim()) {
            alert("Tick the work this order covers, or say what it is about in Section 2");
            return { ok: false, vendorId: "" };
        }
        if (!vendorId && !isAddingVendor) {
            alert("Please select a vendor");
            return { ok: false, vendorId: "" };
        }
        let finalVendorId = vendorId;
        if (isAddingVendor) {
            if (!newVendor.name) {
                alert("Please enter a vendor name");
                return { ok: false, vendorId: "" };
            }
            const createdVendor = buildInventoryVendor(newVendor);
            onAddVendor(createdVendor);
            finalVendorId = createdVendor.id;
        }
        return { ok: true, vendorId: finalVendorId };
    };

    /**
     * Tell the driver, where one was assigned.
     *
     * An order with somebody's name on it that never reaches them is a note in a drawer.
     * It goes into their own chat thread — the same place everything else this office
     * sends a driver goes — with the jobs on it as the attachment list, so they can see
     * what they are taking it in for.
     */
    const notifyDriver = () => {
        const driver = drivers.find((d) => d.id === assignedDriverId);
        if (!driver) return;
        const unit = orderAsset?.unitNumber ?? orderAssetId ?? 'the unit';
        const convId = getOrCreateDriverConversation(driver.name);
        shareToMessages({
            recipientName: driver.name,
            recipientId: convId,
            channel: 'in-app',
            message: [
                `Work order for ${unit}: ${orderNameInput.trim() || suggestedOrderName}.`,
                dueDate ? `Due ${dueDate}.` : '',
                about.trim(),
            ].filter(Boolean).join(' '),
            items: pickedRows.map((r) => ({ name: r.name, group: 'Work' })),
            source: { type: 'manual', id: orderAssetId ?? 'order', label: `Work order · ${unit}` },
        });
    };

    const handleCreate = () => {
        const { ok, vendorId: finalVendorId } = validateAndResolveVendor();
        if (!ok) return;
        notifyDriver();

        onCreate({
            taskIds: orderTaskIds(),
            // Remarks, keyed by the task they belong to.
            taskRemarks: Object.fromEntries(
                rows.filter(r => r.taskId && (rowRemarks[r.key] ?? "").trim())
                    .map(r => [r.taskId as string, rowRemarks[r.key]])
            ),
            directTasks: orderDirectTasks(),
            about: about.trim() || undefined,
            name: orderNameInput.trim() || undefined,
            vendorId: finalVendorId,
            assignedDriverId: assignedDriverId || undefined,
            assignedDriverName: drivers.find((d) => d.id === assignedDriverId)?.name,
            createDate,
            dueDate,
            meta: {
                odometerRequired: requireOdometer,
                odometerUnit,
                engineHoursRequired: requireEngineHours
            },
            notes: remarks,
        });
    };

    // Create + generate vendor-portal link, then show the email panel.
    // Same payload that gets passed to onCreate is also used to build the link.
    const handleCreateAndSend = () => {
        const { ok, vendorId: finalVendorId } = validateAndResolveVendor();
        if (!ok) return;
        // The shop is being sent to, and the driver still needs telling.
        notifyDriver();

        const orderId = `ord_${Math.random().toString(36).slice(2, 11)}`;
        const payload = buildPortalPayload(orderId, finalVendorId);
        if (!payload) {
            alert("Could not resolve vendor. Please reselect and try again.");
            return;
        }
        const portalUrl = buildVendorPortalUrl(payload);

        onCreate({
            id: orderId,
            taskIds: orderTaskIds(),
            directTasks: orderDirectTasks(),
            about: about.trim() || undefined,
            name: orderNameInput.trim() || undefined,
            vendorId: finalVendorId,
            assignedDriverId: assignedDriverId || undefined,
            assignedDriverName: drivers.find((d) => d.id === assignedDriverId)?.name,
            createDate,
            dueDate,
            meta: {
                odometerRequired: requireOdometer,
                odometerUnit,
                engineHoursRequired: requireEngineHours
            },
            notes: remarks,
            portalUrl,
        });

        setSentOrder({
            portalUrl,
            vendorEmail: payload.vendor.email || "",
            vendorName: payload.vendor.name,
            workOrderNumber: payload.workOrderNumber,
            payload,
        });
        setCopyConfirm(false);
        setSendStatus({ state: 'idle' });
    };

    // Real send via the /api/send-vendor-email endpoint (Resend in prod,
    // dev-API plugin during `npm run dev`). Falls back to a mailto: link if
    // the API request fails so the user can still ship the link manually.
    const sendByApi = async () => {
        if (!sentOrder) return;
        if (!sentOrder.vendorEmail) {
            alert("This vendor has no email on file. Add one and try again.");
            return;
        }
        const p = sentOrder.payload;
        setSendStatus({ state: 'sending' });
        try {
            const resp = await fetch('/api/send-vendor-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: sentOrder.vendorEmail,
                    workOrderNumber: sentOrder.workOrderNumber,
                    portalUrl: sentOrder.portalUrl,
                    carrier: p.carrier,
                    vendor: {
                        name: p.vendor.name,
                        companyName: p.vendor.companyName,
                        contactName: undefined,
                    },
                    createDate: p.createDate,
                    dueDate: p.dueDate,
                    notes: p.notes,
                    requirements: p.requirements,
                    tasks: p.tasks.map(t => ({
                        unitNumber: t.unitNumber,
                        year: t.year,
                        make: t.make,
                        model: t.model,
                        vin: t.vin,
                        services: t.services.map(s => ({ name: s.name, group: s.group })),
                    })),
                    senderName: p.carrier?.dbaName || p.carrier?.legalName || 'TrackSmart Fleet',
                }),
            });
            const data = await resp.json().catch(() => ({}));
            if (!resp.ok || !data?.ok) {
                const msg = data?.error || `Send failed (HTTP ${resp.status})`;
                setSendStatus({ state: 'error', message: msg });
                return;
            }
            setSendStatus({ state: 'sent', messageId: data.id });
        } catch (err) {
            setSendStatus({
                state: 'error',
                message: err instanceof Error ? err.message : 'Network error',
            });
        }
    };

    const openMailtoFallback = () => {
        if (!sentOrder?.vendorEmail) return;
        const link = buildMailtoLink({
            to: sentOrder.vendorEmail,
            workOrderNumber: sentOrder.workOrderNumber,
            portalUrl: sentOrder.portalUrl,
        });
        window.location.href = link;
    };

    const copyPortalUrl = async () => {
        if (!sentOrder) return;
        try {
            await navigator.clipboard.writeText(sentOrder.portalUrl);
            setCopyConfirm(true);
            setTimeout(() => setCopyConfirm(false), 1800);
        } catch {
            // Clipboard API can fail in non-secure contexts; fall back to a prompt.
            window.prompt("Copy this link:", sentOrder.portalUrl);
        }
    };

    const handleSaveNewVendor = () => {
        if (!newVendor.name) return;
        const createdVendor = buildInventoryVendor(newVendor);
        onAddVendor(createdVendor);
        setVendorId(createdVendor.id);
        setIsAddingVendor(false);
        setNewVendor(emptyVendor);
    };

    // Assets filtered by the chosen class — drives the asset dropdown.
    // Existing scheduled tasks for the focused asset.
    //
    // Visible = the task is OPEN (not completed/cancelled) AND it isn't
    // attached to a closed work order. Anything that's been worked on or
    // dropped is filtered out — the panel only ever shows live tasks
    // the user can act on. We compute it straight from the seed so the
    // panel populates the moment an asset is picked.
    /**
     * The focused asset’s tasks, under the rule that raised each one.
     *
     * Nobody picks tasks: they decide to do THE PM SERVICE and the brake inspection on this
     * truck, and the tasks follow. So the rules are the headings, each with a tick that
     * takes the whole rule at once, and anything raised by hand falls under "One-off work".
     */
    /** Tick a whole rule on or off — every task it has raised on this asset. */
    // 8 category pills for the New Task picker.
    // Count of services per category for the chosen asset class — used as a
    // badge on each pill so the user knows "Brakes (23)" before they click.
    // For the sidebar nav: returns 0 (untouched), or a positive count
    // (filled / number of items) so we can show a check + count badge.
    const completionFor = (id: SectionId): number => {
        switch (id) {
            case 'asset':
                // The jobs ticked, and the two things said about the order itself.
                return pickedRows.length + (about.trim() ? 1 : 0) + (orderNameInput.trim() ? 1 : 0);
            case 'newrule':
                return rows.filter((r) => r.key.startsWith('new::')).length;
            case 'vendor':
                return (vendorId || (isAddingVendor && newVendor.name) ? 1 : 0)
                    + (assignedDriverId ? 1 : 0);
            case 'schedule':
                return (createDate ? 1 : 0) + (dueDate ? 1 : 0);
            case 'comments':
                return remarks.trim() ? 1 : 0;
            default:
                return 0;
        }
    };

    if (!isOpen) return null;

    const pageTitle = preSelectedAssetId ? "Log Maintenance" : "Create Task Order";
    const pageSubtitle = "Bundle one or more maintenance items into a single work order for a vendor.";

    return (
        <div className="flex-1 min-h-screen bg-slate-50 flex flex-col">
            {/* Page header — sticky at top so it stays visible while scrolling */}
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <button
                            onClick={onClose}
                            className="mt-0.5 inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                            aria-label="Back"
                            type="button"
                        >
                            <X size={18} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold text-slate-900 truncate">{pageTitle}</h1>
                            <p className="text-sm text-slate-500 mt-0.5">{pageSubtitle}</p>
                        </div>
                    </div>
                    {/* Active carrier indicator — makes it explicit which carrier
                        the vendor list and outgoing email are scoped to. */}
                    {account && (
                        <div className="hidden md:flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-md px-3 py-1.5 shrink-0">
                            <div className="w-7 h-7 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                                {(account.dbaName || account.legalName).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="text-xs leading-tight">
                                <div className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">Carrier</div>
                                <div className="font-semibold text-slate-900">{account.dbaName || account.legalName}</div>
                                {account.dotNumber && (
                                    <div className="text-[10px] text-slate-500">DOT #{account.dotNumber}</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Two-pane Body — left aside is the section nav (mirrors
                AddAccountPage / AddServiceProfilePage), right pane is the
                scrollable form. The sentOrder post-create view collapses
                the aside since there are no sections to navigate. */}
            <main className="flex-1 flex overflow-hidden">
                {/* Side navigation — section list with progress markers */}
                {!sentOrder && (
                    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white hidden md:flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Builder</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5">Step through each section</p>
                        </div>
                        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                            {SECTIONS.map((s, idx) => {
                                const Icon = s.icon;
                                const isActive = activeSection === s.id;
                                const count = completionFor(s.id);
                                return (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => scrollToSection(s.id)}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                                            isActive
                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30'
                                                : 'text-slate-600 hover:bg-slate-50'
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                                isActive
                                                    ? 'bg-blue-600 text-white'
                                                    : count > 0
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            )}
                                        >
                                            {count > 0 && !isActive ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                        </span>
                                        <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                                        <span className="flex-1 text-sm font-semibold">{s.label}</span>
                                        {count > 0 && (
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                                )}
                                            >
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>
                )}

                {/* Main content — scrollable pane */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 pb-28">
                <div className="max-w-3xl mx-auto">
            {sentOrder ? (
                /* Post-create view: show the generated link + mailto launcher.
                   Real production would call a backend send endpoint here instead. */
                <div className="space-y-5">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <Check size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-semibold text-emerald-900 text-sm">
                                Work Order #{sentOrder.workOrderNumber} created
                            </div>
                            <div className="text-xs text-emerald-700 mt-0.5">
                                Send the link below to <span className="font-medium">{sentOrder.vendorName}</span>
                                {sentOrder.vendorEmail && <> at <span className="font-medium">{sentOrder.vendorEmail}</span></>}.
                            </div>
                        </div>
                    </div>

                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                        <div>
                            <Label className="mb-1.5 block text-xs text-slate-500 uppercase tracking-wider">
                                Vendor portal link
                            </Label>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={sentOrder.portalUrl}
                                    onFocus={(e) => e.currentTarget.select()}
                                    className="flex-1 h-9 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                                <Button variant="secondary" size="sm" onClick={copyPortalUrl} className="gap-1">
                                    <Copy size={12} />
                                    {copyConfirm ? "Copied" : "Copy"}
                                </Button>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1.5">
                                The full work order is encoded into this URL — no backend lookup needed for testing.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                                onClick={sendByApi}
                                disabled={!sentOrder.vendorEmail || sendStatus.state === 'sending' || sendStatus.state === 'sent'}
                                className="gap-1.5"
                            >
                                <Mail size={14} />
                                {sendStatus.state === 'sending'
                                    ? 'Sending…'
                                    : sendStatus.state === 'sent'
                                    ? 'Email Sent'
                                    : 'Send Email to Vendor'}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => window.open(sentOrder.portalUrl, "_blank", "noopener")}
                                className="gap-1.5"
                            >
                                <ExternalLink size={14} /> Preview as Vendor
                            </Button>
                        </div>

                        {sendStatus.state === 'sent' && (
                            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 flex items-start gap-2">
                                <Check size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    Email delivered to <span className="font-medium">{sentOrder.vendorEmail}</span>
                                    {sendStatus.messageId && (
                                        <> · <span className="font-mono text-emerald-700">{sendStatus.messageId.slice(0, 8)}…</span></>
                                    )}
                                </div>
                            </div>
                        )}

                        {sendStatus.state === 'error' && (
                            <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2 space-y-2">
                                <div>
                                    <span className="font-semibold">Send failed:</span> {sendStatus.message}
                                </div>
                                <button
                                    type="button"
                                    onClick={openMailtoFallback}
                                    className="text-red-700 underline hover:text-red-900"
                                >
                                    Open in your local mail client instead
                                </button>
                            </div>
                        )}

                        {!sentOrder.vendorEmail && (
                            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                                This vendor has no email on file. Use the copy button to share the link manually,
                                or edit the vendor record to add an email.
                            </div>
                        )}
                    </section>
                </div>
            ) : (
            <div className="space-y-5">
                {/* Section 1: one unit, and which of its jobs go to the shop.

                    It used to accumulate assets: pick a second unit and its jobs joined
                    the first unit's on one form, which then raised one work order per
                    asset behind you. Three trucks went to the shop as three orders you
                    never saw separately, so a remark typed against the trailer, a vendor
                    chosen for the tractor and a due date set for all of them belonged to
                    three different pieces of paper. */}
                <div ref={(el) => { sectionRefs.current['asset'] = el; }}>
                <Section number={1} title="Asset & Work" subtitle="The unit going to the shop, and which of its jobs." icon={Truck}>
                    {/* What it is called and what it is for, before the unit it is about.

                        A line each rather than two columns: an order name is a sentence
                        ("Fall PM run") and a description is several, and side by side they
                        were two narrow boxes wrapping "What is this work order about" onto
                        three lines to ask for one. */}
                    <div className="mb-4">
                        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Order name <span className="font-normal normal-case text-slate-400">(optional)</span>
                        </Label>
                        <input
                            value={orderNameInput}
                            onChange={(e) => setOrderNameInput(e.target.value)}
                            placeholder={suggestedOrderName}
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 truncate text-[11px] text-slate-400">
                            Left empty it is named {'"'}{suggestedOrderName}{'"'}.
                        </p>
                    </div>

                    <div className="mb-5">
                        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Description
                        </Label>
                        <textarea
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            rows={3}
                            placeholder="e.g. air leak from the passenger-side service line, found on the walk-around"
                            className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                            A work order with no interval behind it is whatever this says it is, so
                            the shop has nothing else to go on.
                        </p>
                    </div>

                    <div className="mb-4 border-t border-slate-100 pt-4">
                        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Asset
                        </Label>
                        {/* This carrier's own units, and always the one already picked.
                            The list was the first sixty of every fleet in the app, so a
                            unit further down it had no row to match and the box showed the
                            raw id — "AST-001-0002" over a card saying ACM-T0101. */}
                        <Select value={orderAssetId ?? ""} onValueChange={pickAsset}>
                            <SelectTrigger className="w-full">
                                {/* Said in words rather than left to Radix to match a row:
                                    the row it matched came from a different list. */}
                                <SelectValue placeholder="Search the fleet...">
                                    {orderAsset
                                        ? `${orderAsset.unitNumber} ${EM_DASH} ${[orderAsset.year, orderAsset.make, orderAsset.model].filter(Boolean).join(' ')}`
                                        : undefined}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {pickableAssets.map(a => (
                                    <SelectItem key={a.id} value={a.id}>
                                        {a.unitNumber} {EM_DASH} {[a.year, a.make, a.model].filter(Boolean).join(' ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                            One unit an order. Picking another replaces this one — a shop receives
                            a truck, and a bill comes back for a truck.
                        </p>
                    </div>

                    {rows.length === 0 ? (
                        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-slate-600">
                            Nothing on this order yet. Pick the unit above, or describe the work in
                            Section 2 and send it without an interval.
                        </div>
                    ) : (<>
                        {/* The unit, once, above its own jobs — it was repeated down a
                            column that read the same thing on every row. */}
                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                            <Truck size={15} className="shrink-0 text-blue-600" />
                            <span className="text-[13px] font-bold text-slate-900">
                                {orderAsset?.unitNumber ?? orderAssetId}
                            </span>
                            <span className="truncate text-[11px] text-slate-400">
                                {[orderAsset?.year, orderAsset?.make, orderAsset?.model].filter(Boolean).join(' ')}
                            </span>
                            <div className="flex-1" />
                            <span className="whitespace-nowrap text-[12px] text-slate-500">
                                <span className="font-bold tabular-nums text-slate-700">{pickedRows.length}</span>
                                {' of '}
                                <span className="tabular-nums">{rows.length}</span>
                                {' job'}{rows.length === 1 ? '' : 's'}{' on this order'}
                            </span>
                            {/* A unit on a dozen rules is a list, and "is the annual on this
                                order" is answered by typing it rather than by scrolling. */}
                            {rows.length > 1 && (
                                <div className="relative w-full sm:w-52">
                                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={jobQuery}
                                        onChange={(e) => setJobQuery(e.target.value)}
                                        placeholder="Find a job..."
                                        className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200">
                        <div className="max-h-[22rem] overflow-auto">
                            <table className="w-full min-w-[640px]">
                                <thead>
                                    <tr>
                                        <th className="sticky top-0 z-10 w-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => setRowsOn(rows.map(r => r.key), !rows.every(r => r.on))}
                                                aria-label="Select every job"
                                                className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                                    rows.every(r => r.on) ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}
                                            >
                                                {rows.every(r => r.on) && <Check size={11} />}
                                            </button>
                                        </th>
                                        {["Work", "Next due", "Status", "Remarks"].map((h, i) => (
                                            <th key={h} className={cn(
                                                "sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500",
                                                i > 0 && "border-l",
                                            )}>{h}</th>
                                        ))}
                                        <th className="sticky top-0 z-10 w-10 border-b border-l border-slate-200 bg-slate-50 px-3 py-2" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {shownRows.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-[13px] text-slate-500">
                                                No job on this unit matches {'"'}{jobQuery}{'"'}.
                                            </td>
                                        </tr>
                                    )}
                                    {shownRows.map((r) => (
                                        <tr key={r.key} className={cn("transition-colors", r.on ? "bg-white hover:bg-slate-50/60" : "bg-slate-50/60")}>
                                            <td className="px-3 py-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setRowsOn([r.key], !r.on)}
                                                    aria-label={`Select ${r.name}`}
                                                    className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                                        r.on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}
                                                >
                                                    {r.on && <Check size={11} />}
                                                </button>
                                            </td>
                                            <td className="border-l border-slate-100 px-3 py-2">
                                                <div className="flex items-center gap-2 whitespace-nowrap">
                                                    <span className={cn("text-[13px] font-semibold", r.on ? "text-slate-900" : "text-slate-400")}>
                                                        {r.name}
                                                    </span>
                                                    <span className={cn("shrink-0 rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-wider",
                                                        r.taskId ? "border-slate-200 bg-slate-100 text-slate-500" : "border-blue-200 bg-blue-50 text-blue-700")}>
                                                        {r.taskId ? "Scheduled" : "New task"}
                                                    </span>
                                                </div>
                                                {/* What the rule asks for, under its name: "PM-B" is a code
                                                    somebody has to already know. */}
                                                <div className="truncate text-[11px] text-slate-400">
                                                    {r.everyText ?? (r.services?.join(', ') || 'By hand')}
                                                </div>
                                            </td>
                                            {/* Where it stands, so the choice of what goes on this visit is
                                                made on the figures rather than on memory. */}
                                            <td className="whitespace-nowrap border-l border-slate-100 px-3 py-2">
                                                {r.due?.at ? (<>
                                                    <div className={cn("text-[13px] tabular-nums",
                                                        r.due.over ? "font-semibold text-red-600" : "text-slate-700")}>
                                                        {r.due.at}
                                                    </div>
                                                    {r.due.left && (
                                                        <div className={cn("text-[11px]", r.due.over ? "text-red-500" : "text-slate-400")}>
                                                            {r.due.left}
                                                        </div>
                                                    )}
                                                </>) : <span className="text-[13px] text-slate-300">—</span>}
                                            </td>
                                            <td className="whitespace-nowrap border-l border-slate-100 px-3 py-2 text-[11px] uppercase tracking-wider text-slate-400">
                                                {r.status?.replace(/_/g, " ") ?? "—"}
                                            </td>
                                            <td className="border-l border-slate-100 px-3 py-2">
                                                <input
                                                    value={rowRemarks[r.key] ?? ""}
                                                    onChange={(e) => setRowRemarks(p => ({ ...p, [r.key]: e.target.value }))}
                                                    disabled={!r.on}
                                                    placeholder="Optional"
                                                    className="h-8 w-full min-w-[9rem] rounded-md border border-slate-200 bg-white px-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-300"
                                                />
                                            </td>
                                            <td className="border-l border-slate-100 px-2 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setRows(rs => rs.filter(x => x.key !== r.key))}
                                                    title="Take this job off the order"
                                                    className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-rose-600"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        </div>

                    </>)}
                </Section>
                </div>

                {/* Section 2: a rule this unit needs and is not on yet.

                    The work somebody wants doing is often work the unit has no rule for,
                    and the answer to that was to close the order, go to Service Intervals,
                    build the rule, enrol the unit, come back and raise the order again. */}
                <div ref={(el) => { sectionRefs.current['newrule'] = el; }}>
                <Section
                    number={2}
                    title="New Service Interval"
                    subtitle={orderAsset
                        ? `Start a rule for ${orderAsset.unitNumber} and put it on this order.`
                        : "Pick the unit above, then start a rule for it here."}
                    icon={Plus}
                >
                    {!orderAssetId ? (
                        <p className="text-[13px] text-slate-500">
                            A rule belongs to a unit, so pick one in Section 1 first.
                        </p>
                    ) : !ruleOpen ? (
                        <button
                            type="button"
                            onClick={() => setRuleOpen(true)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-700"
                        >
                            <Plus size={15} /> Add a service interval for {orderAsset?.unitNumber}
                        </button>
                    ) : (
                        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                            <div>
                                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Name <span className="font-normal normal-case text-slate-400">(optional)</span>
                                </Label>
                                <input
                                    value={ruleName}
                                    onChange={(e) => setRuleName(e.target.value)}
                                    placeholder={ruleServiceNames().join(', ') || 'e.g. Reefer PM'}
                                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Left empty it is named after the services it covers.
                                </p>
                            </div>

                            {/* The same tick-and-figure the interval builder and the service
                                catalog use. Three bare boxes labelled "mi h days" asked the
                                question in this form's own words, and a figure typed into one
                                of them was indistinguishable from a clock somebody meant to
                                switch on. */}
                            <div>
                                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Comes round every
                                </Label>
                                <ServiceIntervalFields value={ruleIv} onChange={setRuleIv} />
                                <p className="mt-1.5 text-[11px] text-slate-400">
                                    Whichever comes first. Tick none and it is work done by hand — the
                                    order is what says when.
                                </p>
                            </div>

                            <div>
                                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Services
                                </Label>
                                <div className="relative mb-2">
                                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={ruleQuery}
                                        onChange={(e) => setRuleQuery(e.target.value)}
                                        placeholder="Search services..."
                                        className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
                                    {SERVICE_TYPES
                                        .filter(t => !ruleQuery || t.name.toLowerCase().includes(ruleQuery.toLowerCase()))
                                        .slice(0, 40)
                                        .map(t => {
                                            const on = ruleServiceIds.includes(t.id);
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setRuleServiceIds(prev => on ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                                                    className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                                                        on ? "bg-blue-50" : "hover:bg-slate-50")}
                                                >
                                                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                                        on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>
                                                        {on && <Check size={11} />}
                                                    </span>
                                                    <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{t.name}</span>
                                                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-400">{t.group}</span>
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setRuleOpen(false)}
                                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!ruleReady}
                                    onClick={addRule}
                                    className={cn("inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-white shadow-sm transition-colors",
                                        ruleReady ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300")}
                                >
                                    <Check size={15} /> Create and add to this order
                                </button>
                            </div>
                            {!ruleReady && (
                                <p className="text-right text-[11px] text-slate-400">
                                    Pick at least one service — a rule with no work in it has nothing to do.
                                </p>
                            )}
                        </div>
                    )}
                </Section>
                </div>

                {/* Section 3: who does it */}
                <div ref={(el) => { sectionRefs.current['vendor'] = el; }}>
                <Section
                    number={3}
                    title="Who does the work"
                    subtitle="The shop it goes to, and the driver who takes it there."
                    icon={Store}
                >
                    <div className="flex items-center justify-between mb-2">
                        <Label>Assign Vendor <span className="text-red-500">*</span></Label>
                        {!isAddingVendor && (
                            <button
                                onClick={() => setIsAddingVendor(true)}
                                className="text-xs text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> Add New
                            </button>
                        )}
                    </div>

                    {isAddingVendor ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700 uppercase">New Vendor Details</span>
                                <button onClick={() => setIsAddingVendor(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                            </div>

                            {/* Identity */}
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Vendor Name *"
                                    value={newVendor.name}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, name: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Company Name"
                                    value={newVendor.companyName}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, companyName: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            {/* Category */}
                            <Select
                                value={newVendor.categoryId}
                                onValueChange={(val) => setNewVendor({ ...newVendor, categoryId: val })}
                            >
                                <SelectTrigger className="bg-white h-9">
                                    <SelectValue placeholder="Vendor Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VENDOR_CATEGORIES.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Contact */}
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Email"
                                    value={newVendor.email}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, email: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Phone"
                                    value={newVendor.phone}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, phone: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Contact Name"
                                    value={newVendor.contactName}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, contactName: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Contact Info"
                                    value={newVendor.contactInfo}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, contactInfo: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Address</Label>
                                <Select
                                    value={newVendor.address.country}
                                    onValueChange={(val) => setNewVendor({ ...newVendor, address: { ...newVendor.address, country: val as any, state: "" } })}
                                >
                                    <SelectTrigger className="bg-white h-9">
                                        <SelectValue placeholder="Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ADDRESS_COUNTRIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-3">
                                        <Input
                                            placeholder="Street"
                                            value={newVendor.address.street}
                                            onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, street: e.target.value } })}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            placeholder="Apt"
                                            value={newVendor.address.apt}
                                            onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, apt: e.target.value } })}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Input
                                        placeholder="City"
                                        value={newVendor.address.city}
                                        onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, city: e.target.value } })}
                                        className="bg-white"
                                    />
                                    <Select
                                        value={newVendor.address.state}
                                        onValueChange={(val) => setNewVendor({ ...newVendor, address: { ...newVendor.address, state: val } })}
                                    >
                                        <SelectTrigger className="bg-white h-9">
                                            <SelectValue placeholder={newVendor.address.country === "Canada" ? "Province" : "State"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(newVendor.address.country === "Canada" ? CA_PROVINCES : US_STATES).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder={newVendor.address.country === "Canada" ? "Postal" : "ZIP"}
                                        value={newVendor.address.zip}
                                        onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, zip: e.target.value } })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleSaveNewVendor} disabled={!newVendor.name} className="h-7 text-xs">
                                    Save Vendor
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Select value={vendorId} onValueChange={setVendorId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Vendor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {vendors.map((vendor: any) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                        {vendor.name || vendor.companyName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    {/* And who takes it there.

                        A vendor is always on the order — somebody does the work and
                        somebody invoices for it. A driver is how it GETS there: the person
                        who drops the truck off, or who does the job themselves where the
                        yard handles it. Assigned, the order is sent to them the moment it
                        is created; left empty it is the office's to chase. */}
                    <div className="mt-5 border-t border-slate-100 pt-5">
                        <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Assign to a driver <span className="font-normal normal-case text-slate-400">(optional)</span>
                        </Label>
                        <Select
                            value={assignedDriverId}
                            onValueChange={(v) => setAssignedDriverId(v === '__none__' ? '' : v)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Nobody — the office handles it">
                                    {drivers.find((d) => d.id === assignedDriverId)?.name}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {/* Pickable back off again: an order assigned by mistake has
                                    to be un-assignable without reopening the form. */}
                                <SelectItem value="__none__">Nobody — the office handles it</SelectItem>
                                {drivers.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="mt-1.5 text-[11px] text-slate-400">
                            {assignedDriverId
                                ? 'Creating the order sends it to them in Messages.'
                                : 'Pick somebody and the order is sent to them when it is created.'}
                        </p>
                    </div>
                </Section>
                </div>

                {/* Section 4: Schedule */}
                <div ref={(el) => { sectionRefs.current['schedule'] = el; }}>
                <Section number={4} title="Schedule" subtitle="When to start the order and when it's due." icon={Calendar}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-1.5 block text-xs text-slate-600">Create Date</Label>
                            <Input
                                type="date"
                                value={createDate}
                                onChange={(e: any) => setCreateDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="mb-1.5 block text-xs text-slate-600">Order Due Date</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e: any) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </Section>
                </div>

                {/* Section 5: Additional Comments — order-level notes for the vendor */}
                <div ref={(el) => { sectionRefs.current['comments'] = el; }}>
                <Section number={5} title="Additional Comments" subtitle="Order-level notes for the vendor (optional). Per-task remarks live on each task above." icon={FileText}>
                    <textarea
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 h-24 resize-none"
                        placeholder="e.g. Please call the driver before pickup, gate code 1234, parts already shipped to the shop..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </Section>
                </div>
            </div>
            )}
                </div>
                </div>
            </main>

            {/* Sticky action footer */}
            <footer className="sticky bottom-0 bg-white border-t border-slate-200 shadow-[0_-1px_3px_rgba(15,23,42,0.04)]">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-end gap-2">
                    {sentOrder ? (
                        <Button variant="ghost" onClick={() => { setSentOrder(null); onClose(); }}>Done</Button>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button variant="secondary" onClick={handleCreate}>
                                {assignedDriverId ? 'Create & Assign to Driver' : 'Create Order'}
                            </Button>
                            {/* Either way the shop is where the work is going, so sending it
                                there is the blue one. A driver assigned is told on both. */}
                            <Button onClick={handleCreateAndSend} className="gap-1.5">
                                <Mail size={14} /> Create &amp; Send to Vendor
                            </Button>
                        </>
                    )}
                </div>
            </footer>
        </div>
    );
};

// Numbered card section — same visual rhythm as CreateScheduleForm.
function Section({
    number, title, subtitle, icon: Icon, children,
}: { number: number; title: string; subtitle?: string; icon?: React.ElementType; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {number}
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-slate-400" />}
                        {title}
                    </h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="pl-10">{children}</div>
        </section>
    );
}

// Build an inventory-shaped Vendor record from the inline add-vendor form.
function buildInventoryVendor(v: {
    name: string; companyName: string; categoryId: string; email: string; phone: string;
    contactName: string; contactInfo: string;
    address: { country: "United States" | "Canada"; street: string; apt: string; city: string; state: string; zip: string };
}) {
    return {
        id: `v_new_${Math.random().toString(36).substr(2, 9)}`,
        name: v.name,
        companyName: v.companyName || undefined,
        categoryId: v.categoryId,
        email: v.email || undefined,
        phone: v.phone || undefined,
        contactName: v.contactName || undefined,
        contactInfo: v.contactInfo || undefined,
        address: {
            country: v.address.country,
            street: v.address.street || undefined,
            apt: v.address.apt || undefined,
            city: v.address.city || undefined,
            state: v.address.state || undefined,
            zip: v.address.zip || undefined,
        },
        status: "Active" as const,
    };
}
