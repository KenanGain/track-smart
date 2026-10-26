import { useMemo, useState, type ReactNode } from "react";
import {
    AlertTriangle, BellRing, Boxes, Briefcase, Building2, ChevronRight, CreditCard, ExternalLink,
    FileText, Fuel, Gauge, Link2, Mail, MessageSquare, MessagesSquare, Paperclip, Phone, Settings2, ShieldAlert, ShieldCheck, SlidersHorizontal,
    Truck, UserCheck, Users as UsersIcon, Wrench, type LucideIcon,
} from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
import { PAGE_PAD } from "@/components/ui/ListPageHeader";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { SortTh, TablePager, useTableSort } from "@/components/ui/ListChrome";
import { useCondensingHeader, HEADER_TRANSITION } from "@/components/ui/use-condensing-header";
import { cn } from "@/lib/utils";
import { ROLE_BADGE, ROLE_LABELS, roleOn, type AppUser } from "@/data/users.data";
import { STATUS_BADGE as CARRIER_STATUS_BADGE, type AccountRecord } from "@/pages/accounts/accounts.data";
import { getServiceProfileById, isUnlimitedLimit, type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { formatUsd, TIER_CONFIG } from "@/pages/admin/billing.data";
import { PRIORITY_META, PRIORITY_ORDER, type MonitoringAlert, type PriorityLevel } from "@/pages/compliance/monitoring-alerts";
import { SOURCE_META } from "@/pages/compliance/monitoring-sources";
import { useConversations, type Conversation } from "@/pages/messages/messages-store";
import { useDirectoryVersion, carriersOf } from "@/pages/users-roles/scope";
import { LimitsDialog, UsageMeter } from "./limits-pieces";
import {
    carrierLimits, carrierUsers, serviceLimits, serviceUsers, setCarrierLimits, setServiceLimits, useLimitsVersion,
} from "./profile-limits.data";
import { carrierInsights, chatInsights, serviceInsights, type CarrierInsights } from "./profile-insights";

/**
 * Super Admin → one service profile, or one carrier profile: everything that runs behind it.
 *
 * Opened from a row on Service Profile Configuration or Carrier Profile Configuration. The
 * limits stay on top — they are what those pages are for — and below them the back end of
 * the profile: users and seats, fleet, compliance documents on file and missing, monitoring
 * running and the alerts it has raised, safety records, operations, hiring, billing, chats.
 *
 * Read-only apart from the limits. Every figure comes from the module that owns it (see
 * `profile-insights`), so it agrees with that module's own page.
 */

type Kind = "service" | "carrier";
type Tab = "overview" | "carriers" | "users" | "monitoring" | "chats";

const SERVICE_STATUS_BADGE: Record<ServiceProfile["status"], string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-rose-50 text-rose-700 border-rose-200",
    Inactive: "bg-slate-50 text-slate-600 border-slate-200",
};

const n = (v: number) => v.toLocaleString();
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const money = (v: number, currency: "USD" | "CAD") =>
    new Intl.NumberFormat(currency === "CAD" ? "en-CA" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);

// ── Building blocks ─────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, sub, tone = "bg-blue-50 text-blue-600" }: {
    icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; tone?: string;
}) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm @md:px-4 @md:py-3">
            {/* Below a phone-and-a-bit of width the icon gives its room to the figure. */}
            <span className={cn("hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg @md:flex", tone)}><Icon size={16} /></span>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <div className="min-w-0 text-[15px] font-bold text-slate-900">{value}</div>
                {sub && <p className="text-[11px] leading-snug text-slate-500">{sub}</p>}
            </div>
        </div>
    );
}

/** One area of the back end — a titled card of figures. */
function Section({ icon: Icon, title, note, tone = "bg-blue-50 text-blue-600", action, children }: {
    icon: LucideIcon; title: string; note?: ReactNode; tone?: string; action?: ReactNode; children: ReactNode;
}) {
    return (
        <section className="@container flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", tone)}><Icon size={14} /></span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800">{title}</p>
                    {note && <p className="truncate text-[11px] text-slate-500">{note}</p>}
                </div>
                {action}
            </header>
            <dl className="-mb-px -mr-px grid grid-cols-2 content-start @xl:grid-cols-4">{children}</dl>
        </section>
    );
}

/** One figure in a section. `warn` / `bad` colour the number when it needs somebody. */
function Fig({ label, value, sub, warn, bad }: { label: string; value: ReactNode; sub?: ReactNode; warn?: boolean; bad?: boolean }) {
    return (
        <div className="min-w-0 border-b border-r border-slate-100 px-4 py-3">
            <dt className="truncate text-[11px] font-medium text-slate-500">{label}</dt>
            <dd className={cn("mt-0.5 text-lg font-bold tabular-nums", bad ? "text-rose-600" : warn ? "text-amber-600" : "text-slate-900")}>{value}</dd>
            {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
        </div>
    );
}

/**
 * A named run of cards. Its own grid, so a group with an odd card out lets that card take the
 * whole row rather than leaving it alone beside a hole.
 */
function Group({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <div>
            <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</h2>
            <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2 @3xl:[&>*:last-child:nth-child(odd)]:col-span-2">{children}</div>
        </div>
    );
}

/** Required records complete vs missing for one kind of subject, as a bar. */
function Coverage({ label, done, missing }: { label: string; done: number; missing: number }) {
    const total = done + missing;
    const p = pct(done, total);
    return (
        <div className="col-span-full border-b border-r border-slate-100 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] font-medium text-slate-600">{label}</span>
                <span className="text-[12px] tabular-nums text-slate-500"><b className="text-slate-900">{p}%</b> · {n(done)} of {n(total)}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", p >= 90 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${p}%` }} />
            </div>
            {missing > 0 && <p className="mt-1 text-[11px] text-slate-400">{n(missing)} required still missing</p>}
        </div>
    );
}

function PriorityPill({ p }: { p: PriorityLevel }) {
    return <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold", PRIORITY_META[p].tone)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_META[p].dot)} />{PRIORITY_META[p].label}
    </span>;
}

/** Open alerts by priority, as one stacked bar and a legend. */
function PriorityBar({ counts }: { counts: Record<PriorityLevel, number> }) {
    const total = PRIORITY_ORDER.reduce((s, p) => s + counts[p], 0);
    return (
        <div className="col-span-full border-b border-r border-slate-100 px-4 py-3">
            <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
                {total > 0 && PRIORITY_ORDER.map((p) => counts[p] > 0 && (
                    <div key={p} className={PRIORITY_META[p].bar} style={{ width: `${(counts[p] / total) * 100}%` }} title={`${PRIORITY_META[p].label}: ${counts[p]}`} />
                ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {PRIORITY_ORDER.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span className={cn("h-2 w-2 rounded-full", PRIORITY_META[p].dot)} /> {PRIORITY_META[p].label} <b className="tabular-nums text-slate-800">{counts[p]}</b>
                    </span>
                ))}
            </div>
        </div>
    );
}

const EmptyRow = ({ cols, text }: { cols: number; text: string }) => (
    <tr><td colSpan={cols} className="px-4 py-12 text-center text-sm text-slate-500">{text}</td></tr>
);

// ── The page ────────────────────────────────────────────────────────────────

export function ProfileInsightsPage({ kind, id, onNavigate, onOpenCarrier, onOpenServiceProfile }: {
    kind: Kind;
    id: string;
    onNavigate: (path: string) => void;
    /** Into the carrier's own workspace (Account). */
    onOpenCarrier?: (account: AccountRecord) => void;
    /** Into the service profile's own page. */
    onOpenServiceProfile?: (id: string) => void;
}) {
    const dir = useDirectoryVersion();
    const lim = useLimitsVersion();
    const conversations = useConversations();
    const { scrollRef, condensed, onScroll } = useCondensingHeader();
    const [tab, setTab] = useState<Tab>("overview");
    const [editing, setEditing] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    const HOME = kind === "service" ? "/admin/service-profile-compliance" : "/admin/carrier-profile-configuration";
    const LIST_LABEL = kind === "service" ? "Service Profile Configuration" : "Carrier Profile Configuration";

    // eslint-disable-next-line react-hooks/exhaustive-deps -- dir/lim are the store snapshots
    const svc = useMemo(() => (kind === "service" ? serviceInsights(id) : null), [kind, id, dir, lim]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const car = useMemo(() => (kind === "carrier" ? carrierInsights(id) : null), [kind, id, dir, lim]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const chats = useMemo(() => chatInsights(), [conversations]);

    const sp = kind === "service" ? getServiceProfileById(id) : getServiceProfileById(car?.carrier.serviceProfileId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const limits = useMemo(() => (kind === "service" ? serviceLimits(id) : null), [kind, id, dir, lim]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const seat = useMemo(() => (kind === "service" ? limits!.users : carrierLimits(id).users), [kind, id, dir, lim, limits]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const people = useMemo<AppUser[]>(() => (kind === "service" ? serviceUsers(id) : carrierUsers(id)), [kind, id, dir]);

    if ((kind === "service" && (!svc || !sp)) || (kind === "carrier" && !car)) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-50 p-8 text-center">
                <p className="text-sm text-slate-600">This {kind === "service" ? "service profile" : "carrier profile"} no longer exists.</p>
                <BackLink fallback={HOME} fallbackLabel={LIST_LABEL} onNavigate={onNavigate} />
            </div>
        );
    }

    // What the page is about, whichever kind.
    const title = kind === "service" ? sp!.legalName : car!.carrier.legalName;
    const dba = kind === "service" ? sp!.dbaName : car!.carrier.dbaName;
    const initials = title.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
    const status = kind === "service" ? sp!.status : car!.carrier.status;
    const statusBadge = kind === "service" ? SERVICE_STATUS_BADGE[sp!.status] : CARRIER_STATUS_BADGE[car!.carrier.status];
    const fleet = kind === "service" ? svc!.fleet : car!.fleet;
    const docs = kind === "service" ? svc!.documents : car!.documents;
    const mon = kind === "service" ? svc!.monitoring : car!.monitoring;
    const safety = kind === "service" ? svc!.safety : car!.safety;
    const ops = kind === "service" ? svc!.operations : car!.operations;
    const hiring = kind === "service" ? svc!.hiring : car!.hiring;
    const userStates = kind === "service" ? svc!.userStates : car!.userStates;
    const drv = kind === "service" ? svc!.drivers : car!.drivers;
    const ast = kind === "service" ? svc!.assets : car!.assets;
    const cov = kind === "service" ? svc!.coverage : car!.coverage;
    const risk = kind === "service" ? svc!.risk : car!.risk;
    const fuel = kind === "service" ? svc!.fuel : car!.fuel;
    const mnt = kind === "service" ? svc!.maintenance : car!.maintenance;
    const inv = kind === "service" ? svc!.inventoryState : car!.inventoryState;
    const auth = kind === "service" ? svc!.authority : car!.authority;
    const act = kind === "service" ? svc!.activity : car!.activity;
    const alerts: (MonitoringAlert & { carrier?: AccountRecord })[] = mon.alerts;

    const tabs: SubTab<Tab>[] = [
        { id: "overview", label: "Overview", icon: Gauge },
        ...(kind === "service" ? [{ id: "carriers" as Tab, label: "Carrier profiles", icon: Building2, count: svc!.carriers.length }] : []),
        { id: "users", label: "Users", icon: UsersIcon, count: people.length },
        { id: "monitoring", label: "Monitoring", icon: BellRing, count: mon.openAlerts },
        { id: "chats", label: "Chats", icon: MessagesSquare, count: chats.internal + chats.external },
    ];

    const say = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2600); };
    const openOwn = () => {
        if (kind === "service") onOpenServiceProfile?.(id);
        else onOpenCarrier?.(car!.carrier);
    };

    const meta: ReactNode[] = kind === "service"
        ? [
            <span key="t" className="flex items-center gap-1 font-medium text-slate-700"><Briefcase size={12} className="text-slate-400" /> {sp!.businessType} · {sp!.stateOfInc}</span>,
            sp!.contactEmail && <span key="e" className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {sp!.contactEmail}</span>,
            sp!.contactPhone && <span key="p" className="flex items-center gap-1"><Phone size={12} className="text-slate-400" /> {sp!.contactPhone}</span>,
            <span key="c" className="text-slate-400">Since {sp!.createdAt}</span>,
        ]
        : [
            car!.carrier.dotNumber && <span key="d" className="flex items-center gap-1 font-medium text-slate-700"><Truck size={12} className="text-slate-400" /> USDOT {car!.carrier.dotNumber}</span>,
            <span key="l" className="flex items-center gap-1"><Building2 size={12} className="text-slate-400" /> {[car!.carrier.city, car!.carrier.state].filter(Boolean).join(", ")}</span>,
            sp && <button key="s" type="button" onClick={() => onNavigate(`/admin/service-profile-compliance/${sp.id}`)}
                className="flex items-center gap-1 text-blue-600 hover:underline"><Briefcase size={12} /> {sp.dbaName || sp.legalName}</button>,
            <span key="r" className="text-slate-400">{car!.carrier.safetyRating}</span>,
        ];

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* Header band — the shape the driver, asset and inspection pages have. */}
            <div className={cn("@container shrink-0 border-b border-slate-200 bg-white", HEADER_TRANSITION, condensed ? "shadow-md" : "shadow-sm")}>
                <header className={cn("flex items-center gap-3 overflow-hidden border-b border-slate-100 bg-slate-50/60 px-4 sm:px-8", HEADER_TRANSITION,
                    condensed ? "h-0 border-b-0 opacity-0" : "h-11 opacity-100")}>
                    <span className="min-w-0 shrink-0 truncate whitespace-nowrap"><BackLink fallback={HOME} fallbackLabel={LIST_LABEL} onNavigate={onNavigate} /></span>
                    <span aria-hidden className="hidden h-4 w-px bg-slate-200 sm:block" />
                    <nav className="hidden min-w-0 items-center whitespace-nowrap text-xs font-medium text-slate-500 sm:flex">
                        <span className="text-slate-400">Super Admin</span>
                        <ChevronRight size={12} className="mx-1.5 shrink-0 text-slate-300" />
                        <span className="cursor-pointer text-slate-400 transition-colors hover:text-blue-600" onClick={() => onNavigate(HOME)}>{LIST_LABEL}</span>
                        <ChevronRight size={12} className="mx-1.5 shrink-0 text-slate-300" />
                        <span className="truncate font-semibold text-slate-700">{title}</span>
                    </nav>
                </header>

                <div className={cn("px-4 sm:px-8", HEADER_TRANSITION, condensed ? "py-2" : "py-4 sm:py-5")}>
                    <div className={cn("flex min-w-0 items-start justify-between", HEADER_TRANSITION, condensed ? "gap-2" : "flex-col gap-4 @3xl:flex-row")}>
                        <div className={cn("flex min-w-0 items-start", HEADER_TRANSITION, condensed ? "items-center gap-3" : "gap-3 sm:gap-4")}>
                            <div className={cn("flex shrink-0 items-center justify-center rounded-2xl border-white font-bold shadow-md ring-1 ring-slate-200/60", HEADER_TRANSITION,
                                kind === "service" ? "bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700" : "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700",
                                condensed ? "h-10 w-10 border-2 text-sm" : "h-14 w-14 border-[3px] text-lg sm:h-[72px] sm:w-[72px] sm:text-xl")}>
                                {initials}
                            </div>
                            <div className="min-w-0">
                                <div className={cn("flex items-center gap-2", condensed ? "min-w-0 flex-nowrap" : "flex-wrap")}>
                                    <h1 className={cn("font-bold tracking-tight text-slate-900", HEADER_TRANSITION, condensed ? "min-w-0 truncate text-base" : "text-lg sm:text-2xl")}>{title}</h1>
                                    <span className={cn("inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusBadge)}>{status}</span>
                                    <span className={cn("inline-flex items-center rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500", condensed && "hidden")}>
                                        {kind === "service" ? "Service profile" : "Carrier profile"}
                                    </span>
                                </div>
                                <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 overflow-hidden text-xs text-slate-500", HEADER_TRANSITION,
                                    condensed ? "mt-0 max-h-0 opacity-0" : "mt-1.5 max-h-24 opacity-100")}>
                                    {dba && <span className="font-medium text-slate-600">DBA {dba}</span>}
                                    {meta.filter(Boolean)}
                                </div>
                            </div>
                        </div>
                        <div className={cn("flex shrink-0 flex-wrap items-center gap-2", HEADER_TRANSITION, condensed ? "self-center [&>button]:h-8" : "@3xl:pt-1")}>
                            <button type="button" onClick={openOwn}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                                <ExternalLink className="h-4 w-4" /> <span className="hidden sm:inline">Open {kind === "service" ? "profile" : "carrier"}</span>
                            </button>
                            <button type="button" onClick={() => setEditing(true)}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700">
                                <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">Edit limits</span><span className="sm:hidden">Limits</span>
                            </button>
                        </div>
                    </div>

                    {/* The four figures — the limits first, because they are what this page configures. */}
                    <div className={cn("grid grid-cols-2 gap-2 overflow-hidden @md:gap-3 @4xl:grid-cols-4", HEADER_TRANSITION,
                        condensed ? "mt-0 max-h-0 opacity-0" : "mt-4 max-h-[32rem] opacity-100 sm:mt-5")}>
                        {kind === "service"
                            ? <StatTile icon={Building2} label="Carrier profiles" tone="bg-violet-50 text-violet-600" value={<UsageMeter usage={limits!.carriers} noun="slot" />} />
                            : <StatTile icon={Truck} label="Fleet" tone="bg-violet-50 text-violet-600" value={`${n(fleet.drivers)} drivers`} sub={`${n(fleet.assets)} assets`} />}
                        <StatTile icon={UsersIcon} label="User seats" value={<UsageMeter usage={seat} noun="seat" />} />
                        <StatTile icon={FileText} label="Documents on file" tone={docs.requiredMissing ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}
                            value={n(docs.files)} sub={docs.requiredMissing ? `${n(docs.requiredMissing)} required missing` : "Nothing required missing"} />
                        <StatTile icon={BellRing} label="Monitoring" tone={mon.byPriority.overdue ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}
                            value={`${n(mon.openAlerts)} open alerts`} sub={`${n(mon.running)} monitors running`} />
                    </div>

                    <div className={cn("border-t border-slate-100 pt-1", HEADER_TRANSITION, condensed ? "-mb-2 mt-2" : "-mb-4 mt-3 sm:-mb-5 sm:mt-4")}>
                        <SubTabs tabs={tabs} activeId={tab} onChange={setTab} showZeroCounts bordered={false} ariaLabel="Profile sections" />
                    </div>
                </div>
            </div>

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]">
                <div className={cn("@container space-y-4 py-4 sm:space-y-5 sm:py-6", PAGE_PAD)}>
                    {tab === "overview" && (
                        <div className="space-y-6">
                            <Group label="People">
                            <Section icon={UsersIcon} title="Users & seats" tone="bg-blue-50 text-blue-600"
                                note={isUnlimitedLimit(seat.limit) ? "Unlimited seats" : `${n(seat.used)} of ${n(seat.limit)} seats used`}>
                                <Fig label="Office users" value={n(people.length)} bad={!isUnlimitedLimit(seat.limit) && seat.used >= seat.limit} />
                                {kind === "service"
                                    ? <Fig label="Admins" value={n(svc!.users.admins)} sub="Every carrier, now and later" />
                                    : <Fig label="Driver logins" value={n(car!.users.driverLogins)} sub="Not counted against seats" />}
                                <Fig label="Active" value={n(userStates.active)} />
                                <Fig label="Invited · not signed in" value={n(userStates.invited)} warn={userStates.invited > 0} />
                                <Fig label="Inactive" value={n(userStates.inactive)} />
                                {kind === "service"
                                    ? <Fig label="Seats left" value={isUnlimitedLimit(seat.limit) ? "∞" : n(seat.remaining)} />
                                    : <Fig label="Fleet Admins · Safety · Users" value={`${n(car!.users.byRole["fleet-admin"] ?? 0)} · ${n(car!.users.byRole["safety-manager"] ?? 0)} · ${n(car!.users.byRole.user ?? 0)}`} />}
                                {kind === "service" && svc!.billing.subscription && (
                                    <Fig label="Seats on the plan" value={n(svc!.billing.subscription.seats)}
                                        sub={people.length > svc!.billing.subscription.seats ? `${n(people.length - svc!.billing.subscription.seats)} more users than the plan pays for` : `${n(svc!.billing.subscription.seats - people.length)} unused`}
                                        bad={people.length > svc!.billing.subscription.seats} />
                                )}
                            </Section>
                            <Section icon={UserCheck} title="Hiring & onboarding" tone="bg-indigo-50 text-indigo-600" note="Applicants on the hiring pipeline">
                                <Fig label="Applicants" value={n(hiring.applicants)} />
                                <Fig label="In progress" value={n(hiring.inProgress)} />
                                <Fig label="Approved · onboarding" value={n(hiring.approved)} />
                                <Fig label="Rejected" value={n(hiring.rejected)} />
                            </Section>
                            </Group>
                            <Group label="Fleet">
                            <Section icon={UserCheck} title="Drivers" tone="bg-violet-50 text-violet-600" note="The roster and the licence each one drives on">
                                <Fig label="Drivers" value={n(fleet.drivers)} />
                                <Fig label="Active" value={n(drv.active)} />
                                <Fig label="On leave" value={n(drv.onLeave)} />
                                <Fig label="Inactive · terminated" value={n(drv.inactive)} />
                                <Fig label="CDL expired" value={n(drv.cdlExpired)} bad={drv.cdlExpired > 0} />
                                <Fig label="CDL expiring in 30 days" value={n(drv.cdlExpiring)} warn={drv.cdlExpiring > 0} />
                            </Section>
                            <Section icon={Truck} title="Assets" tone="bg-violet-50 text-violet-600" note={`${n(fleet.powerUnits)} power units · ${n(fleet.trailers)} trailers`}>
                                <Fig label="Assets" value={n(fleet.assets)} />
                                <Fig label="Active" value={n(ast.active)} />
                                <Fig label="In maintenance" value={n(ast.maintenance)} warn={ast.maintenance > 0} />
                                <Fig label="Out of service" value={n(ast.outOfService)} bad={ast.outOfService > 0} />
                                <Fig label="Registration expired" value={n(ast.regExpired)} bad={ast.regExpired > 0} />
                                <Fig label="Registration expiring" value={n(ast.regExpiring)} warn={ast.regExpiring > 0} sub="Within 30 days" />
                                <Fig label="Owned · leased" value={`${n(ast.owned)} · ${n(ast.leased)}`} sub="Leased, financed or rented" />
                                <Fig label="Average age" value={ast.yearCount ? `${Math.max(0, new Date().getFullYear() - Math.round(ast.yearSum / ast.yearCount))} yrs` : "—"}
                                    sub={ast.yearCount ? `Model year ${Math.round(ast.yearSum / ast.yearCount)} on average` : undefined} />
                            </Section>
                            <Section icon={Wrench} title="Maintenance" tone="bg-sky-50 text-sky-600" note="Work orders and service tasks">
                                <Fig label="Open work orders" value={n(ops.workOrdersOpen)} />
                                <Fig label="Completed orders" value={n(mnt.ordersCompleted)} />
                                <Fig label="Service tasks due" value={n(mnt.tasksDue)} warn={mnt.tasksDue > 0} />
                                <Fig label="Overdue service tasks" value={n(ops.tasksOverdue)} bad={ops.tasksOverdue > 0} />
                                <Fig label="Spend on file" value={formatUsd(mnt.spend)} sub="From the bills filed on orders" />
                            </Section>
                            </Group>
                            <Group label="Compliance & monitoring">
                            <Section icon={FileText} title="Compliance documents" tone="bg-emerald-50 text-emerald-600"
                                note={`${n(docs.captured)} records captured across carrier, assets and drivers`}>
                                <Fig label="Files on file" value={n(docs.files)} />
                                <Fig label="Records complete" value={n(docs.complete)} />
                                <Fig label="Required missing" value={n(docs.requiredMissing)} warn={docs.requiredMissing > 0} />
                                <Fig label="Key numbers captured" value={n(docs.keyNumbers)} />
                                <Fig label="Expired" value={n(docs.expired)} bad={docs.expired > 0} />
                                <Fig label="Expiring in 30 days" value={n(docs.expiringSoon)} warn={docs.expiringSoon > 0} />
                            </Section>
                            <Section icon={Gauge} title="Compliance coverage" tone="bg-emerald-50 text-emerald-600"
                                note={`${pct(docs.complete, docs.complete + docs.requiredMissing)}% of required records complete`}>
                                <Coverage label="Carrier records" done={cov.carrierComplete} missing={cov.carrierMissing} />
                                <Coverage label="Asset records" done={cov.assetComplete} missing={cov.assetMissing} />
                                <Coverage label="Driver records" done={cov.driverComplete} missing={cov.driverMissing} />
                            </Section>
                            <Section icon={BellRing} title="Monitoring" tone="bg-rose-50 text-rose-600" note={`${n(mon.handled)} alerts already answered`}
                                action={<button type="button" onClick={() => setTab("monitoring")} className="text-[11px] font-semibold text-blue-600 hover:underline">View alerts</button>}>
                                <Fig label="Monitors running" value={n(mon.running)} sub="Documents with a watch on" />
                                <Fig label="Open alerts" value={n(mon.openAlerts)} bad={mon.byPriority.overdue > 0} warn={mon.openAlerts > 0} />
                                <Fig label="Notification rules on" value={n(mon.rulesEnabled)} />
                                <Fig label="Overdue · Critical" value={`${n(mon.byPriority.overdue)} · ${n(mon.byPriority.critical)}`} bad={mon.byPriority.overdue > 0} />
                                <Fig label="Actions taken" value={n(act.actions)} sub={`${n(act.actions30d)} in the last 30 days`} />
                                <Fig label="Last action" value={act.lastActionAt ? new Date(act.lastActionAt).toLocaleDateString() : "Never"} />
                                <PriorityBar counts={mon.byPriority} />
                            </Section>
                            <Section icon={ShieldCheck} title="Operating authority" tone="bg-slate-100 text-slate-600"
                                note={kind === "carrier" ? `Safety rating: ${car!.carrier.safetyRating}` : "Carriers by safety rating and registrations held"}>
                                {kind === "service" ? <>
                                    <Fig label="Satisfactory" value={n(auth.satisfactory)} />
                                    <Fig label="Conditional" value={n(auth.conditional)} warn={auth.conditional > 0} />
                                    <Fig label="Unsatisfactory" value={n(auth.unsatisfactory)} bad={auth.unsatisfactory > 0} />
                                    <Fig label="Not rated" value={n(auth.notRated)} />
                                </> : <>
                                    <Fig label="USDOT" value={car!.carrier.dotNumber || "—"} />
                                    <Fig label="CVOR" value={car!.carrier.cvorNumber || "—"} />
                                    <Fig label="NSC" value={car!.carrier.nscNumbers?.length ? car!.carrier.nscNumbers.join(", ") : car!.carrier.nscNumber || "—"} />
                                    <Fig label="RIN" value={car!.carrier.rinNumber || "—"} />
                                </>}
                                {kind === "service" && <Fig label="USDOT · CVOR · NSC · RIN" value={`${n(auth.usdot)} · ${n(auth.cvor)} · ${n(auth.nsc)} · ${n(auth.rin)}`} sub="Carriers holding each" />}
                            </Section>
                            </Group>
                            <Group label="Safety & risk">
                            <Section icon={ShieldAlert} title="Safety record" tone="bg-amber-50 text-amber-600" note="Tickets, violations, inspections, accidents, HOS">
                                <Fig label="Tickets" value={n(safety.tickets)} sub={`${n(safety.ticketsOpen)} open`} warn={safety.ticketsOpen > 0} />
                                <Fig label="Violations" value={n(safety.violations)} sub={`${n(risk.violationsOpen)} open · ${n(risk.violationsOos)} out of service`} bad={risk.violationsOos > 0} />
                                <Fig label="Roadside inspections" value={n(safety.inspections)} sub={`${n(risk.inspectionsPass)} passed · ${n(risk.inspectionsFail)} failed · ${n(safety.inspectionsOos)} OOS`} bad={safety.inspectionsOos > 0} />
                                <Fig label="Accidents" value={n(safety.accidents)} sub={`${n(risk.accidentsInjury)} with injuries · ${n(risk.accidentsPreventable)} preventable`} bad={risk.accidentsInjury > 0} />
                                <Fig label="HOS daily logs" value={n(safety.hosLogs)} />
                                <Fig label="Demerit points" value={n(risk.demeritPoints)} sub="Assessed on tickets" warn={risk.demeritPoints > 0} />
                            </Section>
                            <Section icon={CreditCard} title="Cost of the safety record" tone="bg-amber-50 text-amber-600" note="Fines and legal costs filed on tickets">
                                <Fig label="Fines · USD" value={money(risk.finesUsd, "USD")} />
                                <Fig label="Fines · CAD" value={money(risk.finesCad, "CAD")} />
                                <Fig label="Legal costs · USD" value={money(risk.legalUsd, "USD")} />
                                <Fig label="Legal costs · CAD" value={money(risk.legalCad, "CAD")} />
                            </Section>
                            </Group>
                            <Group label="Operations">
                            <Section icon={Fuel} title="Fuel" tone="bg-sky-50 text-sky-600" note="Purchases, efficiency and idling">
                                <Fig label="Fuel purchases" value={n(ops.fuelPurchases)} />
                                <Fig label="Fuel spend" value={formatUsd(ops.fuelSpend)} />
                                <Fig label="Gallons" value={n(fuel.gallons)} />
                                <Fig label="Average MPG" value={fuel.mpgCount ? (fuel.mpgSum / fuel.mpgCount).toFixed(1) : "—"} sub="Across drivers" />
                                <Fig label="Idling" value={`${n(Math.round(fuel.idleMinutes / 60))} hrs`} sub={`${n(fuel.idleEvents)} idling events`} warn={fuel.idleMinutes > 0} />
                            </Section>
                            <Section icon={Boxes} title="Inventory & vendors" tone="bg-sky-50 text-sky-600" note="Cards, devices, permits and who supplies them">
                                <Fig label="Inventory items" value={n(ops.inventory)} />
                                <Fig label="Handed out" value={n(inv.handedOut)} sub="With a driver or on a unit" />
                                <Fig label="Expired" value={n(inv.expired)} bad={inv.expired > 0} />
                                <Fig label="Expiring soon" value={n(inv.expiring)} warn={inv.expiring > 0} />
                                <Fig label="Vendors" value={n(ops.vendors)} />
                            </Section>
                            </Group>
                            <Group label={kind === "service" ? "Business & communication" : "Setup & communication"}>
                            {kind === "service" ? (
                                <Section icon={CreditCard} title="Billing" tone="bg-pink-50 text-pink-600"
                                    note={svc!.billing.subscription ? `${TIER_CONFIG[svc!.billing.subscription.tier]?.name ?? svc!.billing.subscription.tier} plan · ${svc!.billing.subscription.status}` : "No subscription"}>
                                    <Fig label="Monthly" value={svc!.billing.subscription ? formatUsd(svc!.billing.subscription.monthlyAmount) : "—"} />
                                    <Fig label="Next billing" value={svc!.billing.subscription?.nextBillingDate ?? "—"} />
                                    <Fig label="Paid to date" value={formatUsd(svc!.billing.paid)} sub={`${n(svc!.billing.transactions)} transactions`} />
                                    <Fig label="Customer since" value={svc!.billing.subscription?.startDate ?? "—"} />
                                    <Fig label="Pending" value={n(svc!.billing.pending)} warn={svc!.billing.pending > 0} />
                                    <Fig label="Failed" value={n(svc!.billing.failed)} bad={svc!.billing.failed > 0} />
                                </Section>
                            ) : (
                                <Section icon={Settings2} title="Compliance setup" tone="bg-slate-100 text-slate-600" note="Templates and catalog items switched on">
                                    <Fig label="Templates applied" value={n(car!.setup.templates)} />
                                    <Fig label="Key numbers on" value={n(car!.setup.keyNumbersEnabled)} />
                                    <Fig label="Document types on" value={n(car!.setup.documentTypesEnabled)} />
                                    <Fig label="Carrier since" value={car!.carrier.createdAt} />
                                </Section>
                            )}
                            <Section icon={MessagesSquare} title="Chats" tone="bg-teal-50 text-teal-600" note="Workspace-wide — chats are not tagged to a carrier yet"
                                action={<button type="button" onClick={() => setTab("chats")} className="text-[11px] font-semibold text-blue-600 hover:underline">View chats</button>}>
                                <Fig label="Internal chats" value={n(chats.internal)} />
                                <Fig label="External chats" value={n(chats.external)} sub={`${n(chats.secureLinks)} secure links · ${n(chats.emailOnly)} email-only`} />
                                <Fig label="Messages · attachments" value={`${n(chats.messages)} · ${n(chats.attachments)}`} />
                                <Fig label="Disabled · unread" value={`${n(chats.disabled)} · ${n(chats.unread)}`} />
                                <Fig label="AI agents" value={n(chats.aiAgents)} />
                                <Fig label="Tagged contacts" value={n(chats.taggedContacts)} sub={`${n(chats.tags)} chat tags`} />
                            </Section>
                            </Group>
                        </div>
                    )}

                    {tab === "carriers" && svc && (
                        <CarriersTable rows={svc.carriers} onOpen={(c) => onNavigate(`/admin/carrier-profile-configuration/${c.id}`)} />
                    )}
                    {tab === "users" && <UsersTable users={people} carrierId={kind === "carrier" ? id : undefined} />}
                    {tab === "monitoring" && <AlertsTable alerts={alerts} showCarrier={kind === "service"} />}
                    {tab === "chats" && <ChatsTable conversations={conversations} />}
                </div>
            </div>

            {editing && kind === "service" && (
                <LimitsDialog
                    title={`Limits · ${sp!.dbaName || sp!.legalName}`}
                    subtitle="How far this service profile can grow. Add Carrier and Add User stop at these numbers."
                    fields={[
                        { key: "carriers", label: "Carrier profiles it can create", help: "Carrier profiles under this service profile.", used: limits!.carriers.used, value: limits!.carriers.limit },
                        { key: "users", label: "Users it can add", help: "Office logins across the profile — its Admins and every carrier's team. Driver logins are not counted.", used: seat.used, value: seat.limit },
                    ]}
                    onClose={() => setEditing(false)}
                    onSave={(v) => { setServiceLimits(id, { carrierLimit: v.carriers, userLimit: v.users }); setEditing(false); say("Limits saved"); }}
                />
            )}
            {editing && kind === "carrier" && (
                <LimitsDialog
                    title={`Limits · ${dba || title}`}
                    subtitle={`How many people can sign in to ${dba || title}. Add User stops at this number.`}
                    fields={[{ key: "users", label: "Users it can add", help: "Office logins on this carrier — Fleet Admins, Safety Managers and Users. Service-profile Admins and driver logins are not counted.", used: seat.used, value: seat.limit }]}
                    onClose={() => setEditing(false)}
                    onSave={(v) => { setCarrierLimits(id, { userLimit: v.users }); setEditing(false); say("Limit saved"); }}
                />
            )}

            {toast && <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>}
        </div>
    );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

const CARD = "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm";
const TD = "px-4 py-3";

function usePaged<T>(rows: T[]) {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const shown = rows.slice((page - 1) * pageSize, page * pageSize);
    return { shown, pager: <TablePager page={page} pageSize={pageSize} total={rows.length} onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(1); }} /> };
}

type CarrierCol = "carrier" | "users" | "drivers" | "assets" | "files" | "missing" | "alerts" | "status";

function CarriersTable({ rows, onOpen }: { rows: CarrierInsights[]; onOpen: (c: AccountRecord) => void }) {
    const readers = useMemo(() => ({
        carrier: (r: CarrierInsights) => r.carrier.legalName,
        users: (r: CarrierInsights) => r.users.office,
        drivers: (r: CarrierInsights) => r.fleet.drivers,
        assets: (r: CarrierInsights) => r.fleet.assets,
        files: (r: CarrierInsights) => r.documents.files,
        missing: (r: CarrierInsights) => r.documents.requiredMissing,
        alerts: (r: CarrierInsights) => r.monitoring.openAlerts,
        status: (r: CarrierInsights) => r.carrier.status,
    }), []);
    const { sort, onSort, sorted } = useTableSort<CarrierCol, CarrierInsights>(rows, readers, { col: "carrier", dir: "asc" });
    const { shown, pager } = usePaged(sorted);
    const th = (col: CarrierCol, label: string, className?: string) => <SortTh col={col} label={label} sortable sort={sort} onSort={onSort} className={className} />;
    return (
        <div className={CARD}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>{th("carrier", "Carrier profile")}{th("users", "Users")}{th("drivers", "Drivers")}{th("assets", "Assets")}{th("files", "Files")}{th("missing", "Missing")}{th("alerts", "Open alerts")}{th("status", "Status")}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {shown.map((r) => {
                            const u = carrierLimits(r.carrier.id).users;
                            return (
                                <tr key={r.carrier.id} onClick={() => onOpen(r.carrier)} className="cursor-pointer hover:bg-slate-50/70">
                                    <td className={cn(TD, "min-w-[15rem]")}>
                                        <p className="text-sm font-semibold text-slate-900">{r.carrier.legalName}</p>
                                        <p className="text-[12px] text-slate-500">{[r.carrier.dotNumber && `USDOT ${r.carrier.dotNumber}`, [r.carrier.city, r.carrier.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}</p>
                                    </td>
                                    <td className={TD}><UsageMeter usage={u} noun="seat" className="min-w-[8.5rem]" /></td>
                                    <td className={cn(TD, "text-sm tabular-nums")}>{n(r.fleet.drivers)}</td>
                                    <td className={cn(TD, "text-sm tabular-nums")}>{n(r.fleet.assets)}</td>
                                    <td className={cn(TD, "text-sm tabular-nums")}>{n(r.documents.files)}</td>
                                    <td className={cn(TD, "text-sm tabular-nums", r.documents.requiredMissing && "font-semibold text-amber-600")}>{n(r.documents.requiredMissing)}</td>
                                    <td className={cn(TD, "text-sm tabular-nums", r.monitoring.byPriority.overdue && "font-semibold text-rose-600")}>{n(r.monitoring.openAlerts)}</td>
                                    <td className={cn(TD, "whitespace-nowrap")}><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold", CARRIER_STATUS_BADGE[r.carrier.status])}>{r.carrier.status}</span></td>
                                </tr>
                            );
                        })}
                        {shown.length === 0 && <EmptyRow cols={8} text="No carrier profiles under this service profile yet." />}
                    </tbody>
                </table>
            </div>
            {pager}
        </div>
    );
}

type UserCol = "name" | "role" | "carriers" | "status";

function UsersTable({ users, carrierId }: { users: AppUser[]; carrierId?: string }) {
    const roleOf = (u: AppUser) => (carrierId ? roleOn(u, carrierId) : u.role);
    const readers = useMemo(() => ({
        name: (u: AppUser) => u.name,
        role: (u: AppUser) => ROLE_LABELS[carrierId ? roleOn(u, carrierId) : u.role],
        carriers: (u: AppUser) => carriersOf(u).length,
        status: (u: AppUser) => u.status,
    }), [carrierId]);
    const { sort, onSort, sorted } = useTableSort<UserCol, AppUser>(users, readers, { col: "name", dir: "asc" });
    const { shown, pager } = usePaged(sorted);
    const th = (col: UserCol, label: string) => <SortTh col={col} label={label} sortable sort={sort} onSort={onSort} />;
    return (
        <div className={CARD}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>{th("name", "User")}{th("role", "Role")}{th("carriers", "Carrier access")}{th("status", "Status")}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {shown.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50/70">
                                <td className={cn(TD, "min-w-[15rem]")}>
                                    <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                                    <p className="text-[12px] text-slate-500">{u.email}{u.title ? ` · ${u.title}` : ""}</p>
                                </td>
                                <td className={cn(TD, "whitespace-nowrap")}><span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold", ROLE_BADGE[roleOf(u)])}>{ROLE_LABELS[roleOf(u)]}</span></td>
                                <td className={cn(TD, "text-[13px] text-slate-600")}>
                                    {u.role === "admin" ? "Every carrier of the profile" : `${carriersOf(u).length} carrier${carriersOf(u).length === 1 ? "" : "s"}`}
                                </td>
                                <td className={cn(TD, "text-[13px] text-slate-700")}>{u.status}</td>
                            </tr>
                        ))}
                        {shown.length === 0 && <EmptyRow cols={4} text="No office users yet." />}
                    </tbody>
                </table>
            </div>
            {pager}
        </div>
    );
}

type AlertCol = "priority" | "title" | "subject" | "carrier" | "date" | "source";
const PRIORITY_RANK: Record<PriorityLevel, number> = { overdue: 0, critical: 1, high: 2, medium: 3, low: 4 };

function AlertsTable({ alerts, showCarrier }: { alerts: (MonitoringAlert & { carrier?: AccountRecord })[]; showCarrier: boolean }) {
    type A = MonitoringAlert & { carrier?: AccountRecord };
    const readers = useMemo(() => ({
        priority: (a: A) => PRIORITY_RANK[a.priority],
        title: (a: A) => a.title,
        subject: (a: A) => a.subjectLabel,
        carrier: (a: A) => a.carrier?.legalName ?? "",
        date: (a: A) => a.date || null,
        source: (a: A) => SOURCE_META[a.source]?.short ?? a.source,
    }), []);
    const { sort, onSort, sorted } = useTableSort<AlertCol, A>(alerts, readers, { col: "priority", dir: "asc" });
    const { shown, pager } = usePaged(sorted);
    const th = (col: AlertCol, label: string) => <SortTh col={col} label={label} sortable sort={sort} onSort={onSort} />;
    const cols = showCarrier ? 6 : 5;
    return (
        <div className={CARD}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>{th("priority", "Priority")}{th("title", "Alert")}{th("subject", "For")}{showCarrier && th("carrier", "Carrier")}{th("date", "Date")}{th("source", "Source")}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {shown.map((a) => {
                            const S = SOURCE_META[a.source];
                            return (
                                <tr key={`${a.carrier?.id ?? ""}-${a.id}`} className="hover:bg-slate-50/70">
                                    <td className={cn(TD, "whitespace-nowrap")}><PriorityPill p={a.priority} /></td>
                                    <td className={cn(TD, "min-w-[16rem]")}>
                                        <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                                        {a.description && <p className="line-clamp-1 text-[12px] text-slate-500">{a.description}</p>}
                                    </td>
                                    <td className={cn(TD, "min-w-[9rem] text-[13px] text-slate-700")}>{a.subjectLabel}</td>
                                    {showCarrier && <td className={cn(TD, "min-w-[8rem] text-[13px] text-slate-700")}>{a.carrier?.dbaName || a.carrier?.legalName}</td>}
                                    <td className={cn(TD, "whitespace-nowrap text-[13px] tabular-nums text-slate-600")}>
                                        {a.date || "—"}
                                        {a.daysUntil !== null && a.daysUntil !== undefined && <span className={cn("ml-1.5 text-[11px]", a.daysUntil < 0 ? "text-rose-600" : "text-slate-400")}>
                                            {a.daysUntil < 0 ? `${-a.daysUntil}d late` : `in ${a.daysUntil}d`}
                                        </span>}
                                    </td>
                                    <td className={cn(TD, "whitespace-nowrap")}>
                                        {S ? <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold", S.tone)}><S.Icon size={11} /> {S.short}</span> : a.source}
                                    </td>
                                </tr>
                            );
                        })}
                        {shown.length === 0 && <EmptyRow cols={cols} text="No open alerts. Monitoring raises them when a watched date comes close or a status needs attention." />}
                    </tbody>
                </table>
            </div>
            {pager}
        </div>
    );
}

type ChatCol = "name" | "kind" | "status" | "messages" | "last";

function ChatsTable({ conversations }: { conversations: Conversation[] }) {
    const rows = useMemo(() => conversations.filter((c) => !c.ai), [conversations]);
    const readers = useMemo(() => ({
        name: (c: Conversation) => c.name,
        kind: (c: Conversation) => c.kind,
        status: (c: Conversation) => c.status,
        messages: (c: Conversation) => c.messages.length,
        last: (c: Conversation) => c.createdIso ?? c.lastAt,
    }), []);
    const { sort, onSort, sorted } = useTableSort<ChatCol, Conversation>(rows, readers, null);
    const { shown, pager } = usePaged(sorted);
    const th = (col: ChatCol, label: string) => <SortTh col={col} label={label} sortable sort={sort} onSort={onSort} />;
    return (
        <div className="space-y-3">
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Chats are not tagged to a carrier yet, so this is the whole workspace's Messages hub — the same list on every profile.
            </p>
            <div className={CARD}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>{th("name", "Chat")}{th("kind", "Type")}{th("status", "Status")}{th("messages", "Messages")}{th("last", "Last activity")}</tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {shown.map((c) => {
                                const files = c.messages.reduce((s, m) => s + ((m as { attachments?: unknown[] }).attachments?.length ?? 0), 0);
                                return (
                                    <tr key={c.id} className="hover:bg-slate-50/70">
                                        <td className={cn(TD, "min-w-[14rem]")}>
                                            <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                                            <p className="line-clamp-1 text-[12px] text-slate-500">{c.kind === "external" ? c.email || c.role : c.role}</p>
                                        </td>
                                        <td className={cn(TD, "whitespace-nowrap")}>
                                            {c.kind === "external"
                                                ? <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                                    {c.emailOnly ? <Mail size={11} /> : <Link2 size={11} />} External{c.emailOnly ? " · email" : " · secure link"}
                                                </span>
                                                : <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700"><MessageSquare size={11} /> Internal</span>}
                                            {c.tag && <span className={cn("ml-1.5 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", c.tagColor ?? "border-slate-200 bg-slate-50 text-slate-600")}>{c.tag}</span>}
                                        </td>
                                        <td className={cn(TD, "text-[13px]", c.status === "disabled" ? "text-slate-400" : "text-emerald-700")}>{c.status === "disabled" ? "Disabled" : "Active"}</td>
                                        <td className={cn(TD, "text-[13px] tabular-nums text-slate-700")}>
                                            {n(c.messages.length)}
                                            {files > 0 && <span className="ml-2 inline-flex items-center gap-0.5 text-[11px] text-slate-500"><Paperclip size={11} />{files}</span>}
                                            {c.unread > 0 && <span className="ml-2 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>}
                                        </td>
                                        <td className={cn(TD, "whitespace-nowrap text-[13px] text-slate-600")}>{c.lastAt}</td>
                                    </tr>
                                );
                            })}
                            {shown.length === 0 && <EmptyRow cols={5} text="No chats yet." />}
                        </tbody>
                    </table>
                </div>
                {pager}
            </div>
        </div>
    );
}

