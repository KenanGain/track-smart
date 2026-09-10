import { useEffect, useMemo, useState } from "react";
import {
    Smartphone, Bell, ChevronRight, ChevronLeft, ChevronDown, UploadCloud, PenLine, MessageSquare,
    Truck, ShieldCheck, AlertTriangle, CheckCircle2, Clock, FileText, User,
    Home as HomeIcon, Phone, Mail, Settings, LogOut, Wifi, Signal, BatteryFull,
    MapPin, IdCard, CircleHelp, Camera, Send, X, CalendarClock, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/pages/ats/ats-ui";
import { ACCIDENT_TYPES } from "@/data/accident-types.data";
import { useAccidentRecords, blankAccidentReport, carrierOwnerInfo, driverAccidentInfo, type AccidentRecord, type AccidentOwnerInfo, type AccidentDriverInfo } from "@/data/accident-records.data";
import { AccidentDisclosure } from "@/pages/incidents/AccidentDisclosure";
import { buildProfileBundle } from "@/pages/accounts/carrier-datasets.data";
import { MOCK_DRIVERS } from "@/pages/profile/carrier-profile.data";
import type { Driver } from "@/data/mock-app-data";
import { useDriverDqHealth, type Health } from "@/pages/ats/DqFilesPage";

/**
 * Driver Mobile App — the TrackSmart companion app drivers carry, driven by the
 * carrier's REAL driver records. A driver switcher at the top changes whose app
 * is previewed; identity, license, contact and DQ compliance all reflect that
 * driver. The driver can report an accident, which is attributed to them and
 * lands in the carrier's Default Accidents list.
 */

type TabId = "home" | "docs" | "hours" | "profile";

const NAV: { id: TabId; label: string; Icon: React.ElementType }[] = [
    { id: "home", label: "Home", Icon: HomeIcon },
    { id: "docs", label: "Documents", Icon: FileText },
    { id: "hours", label: "Hours", Icon: Clock },
    { id: "profile", label: "Profile", Icon: User },
];

// ── View-model derived from a real Driver record ───────────────────────────
interface DriverVM {
    id: string; name: string; first: string; initials: string;
    status: string; type: string; carrier: string;
    phone: string; email: string; hiredDate: string; terminal: string; address: string;
    license: string; licenseClass: string; licenseState: string; licenseExpiry: string;
    unit: string; dqPct: number;
}

/** Stable pseudo assigned-unit for a driver (drivers carry no vehicle field). */
function unitFor(id: string): string {
    const digits = (id.match(/\d+/g)?.join("") ?? "0");
    const n = Number(digits.slice(-2) || "0") % 20;
    return `ACM-T01${String(n).padStart(2, "0")}`;
}
function mobileNow(): { dt: string; today: string } {
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, "0");
    const dt = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
    return { dt, today: dt.slice(0, 10) };
}
function daysUntil(dateStr?: string): number | null {
    if (!dateStr) return null;
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
}
function buildVM(driver: Driver, health: Health | null, carrier: string): DriverVM {
    const lic = driver.licenses?.[0];
    return {
        id: driver.id,
        name: driver.name,
        first: driver.firstName || driver.name.split(" ")[0],
        initials: driver.avatarInitials,
        status: driver.status,
        type: driver.driverType || "Driver",
        carrier,
        phone: driver.phone,
        email: driver.email,
        hiredDate: driver.hiredDate,
        terminal: driver.terminal || "—",
        address: [driver.address, driver.city, [driver.state, driver.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        license: driver.licenseNumber || "—",
        licenseClass: lic ? `${lic.class}${lic.type ? ` · ${lic.type}` : ""}` : "CDL",
        licenseState: driver.licenseState || "—",
        licenseExpiry: driver.licenseExpiry || "—",
        unit: unitFor(driver.id),
        dqPct: health?.pct ?? 0,
    };
}

export function DriverMobileAppPage({ accountId }: { accountId?: string } = {}) {
    const bundle = useMemo(() => buildProfileBundle(accountId), [accountId]);
    const drivers: Driver[] = (bundle?.drivers ?? MOCK_DRIVERS) as Driver[];
    const carrier = bundle?.viewData?.page?.carrierHeader?.name ?? "Your carrier";

    const [driverId, setDriverId] = useState<string>(drivers[0]?.id ?? "");
    const driver = drivers.find(d => d.id === driverId) ?? drivers[0];

    const healthFor = useDriverDqHealth(accountId);
    const health = driver ? healthFor(driver) : null;
    const vm = driver ? buildVM(driver, health, carrier) : null;

    const { add } = useAccidentRecords(accountId);
    const owner = useMemo(() => carrierOwnerInfo(accountId), [accountId]);
    const driverInfo = driver ? driverAccidentInfo(driver) : null;

    const [tab, setTab] = useState<TabId>("home");
    const [reporting, setReporting] = useState(false);
    // Switching driver resets the phone to a clean Home + closes any open report.
    useEffect(() => { setReporting(false); setTab("home"); }, [driverId]);

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader
                iconGradient="from-indigo-500 to-violet-600"
                Icon={Smartphone}
                title="Driver Mobile App"
                subtitle="Companion app drivers use on the road — driven by your real driver records"
            />

            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
                {/* Driver switcher */}
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2 pl-1 text-sm font-medium text-slate-500">
                        <Smartphone size={16} className="text-indigo-500" /> Previewing the app as
                    </div>
                    {vm && <DriverSwitcher drivers={drivers} value={driverId} onChange={setDriverId} />}
                </div>

                <div className="grid items-center gap-10 lg:grid-cols-2">
                    {/* Intro / feature column */}
                    <div className="order-2 lg:order-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                            <Smartphone size={13} /> iOS &amp; Android
                        </span>
                        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
                            {vm ? `${vm.first}'s driver app` : "The TrackSmart driver app"}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                            Everything a driver needs in their pocket — qualification status at a glance, documents to
                            upload and sign, hours of service, and one‑tap accident reporting straight to the office.
                        </p>

                        <ul className="mt-6 space-y-3">
                            {[
                                { Icon: ShieldCheck, tone: "text-emerald-600 bg-emerald-50", title: "Live DQ compliance", body: vm ? `${vm.dqPct}% of ${vm.first}'s file complete.` : "Real-time completion and expiry alerts." },
                                { Icon: UploadCloud, tone: "text-blue-600 bg-blue-50", title: "Upload & e-sign", body: "Snap a photo or sign a form on the go." },
                                { Icon: AlertTriangle, tone: "text-rose-600 bg-rose-50", title: "Report an accident", body: "Filed under the driver, verified by the office." },
                                { Icon: Clock, tone: "text-amber-600 bg-amber-50", title: "Hours of service", body: "Drive / shift / cycle clocks and daily logs." },
                            ].map((f) => (
                                <li key={f.title} className="flex items-start gap-3">
                                    <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", f.tone)}>
                                        <f.Icon size={17} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900">{f.title}</div>
                                        <div className="text-xs text-slate-500">{f.body}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-7 flex flex-wrap gap-3">
                            <StoreBadge kicker="Download on the" store="App Store" />
                            <StoreBadge kicker="Get it on" store="Google Play" />
                        </div>
                    </div>

                    {/* Phone mockup */}
                    <div className="order-1 flex justify-center lg:order-2">
                        <PhoneFrame>
                            {vm && (
                                <>
                                    {tab === "home" && <HomeScreen d={vm} health={health} onReport={() => setReporting(true)} />}
                                    {tab === "docs" && <DocsScreen health={health} />}
                                    {tab === "hours" && <HoursScreen />}
                                    {tab === "profile" && <ProfileScreen d={vm} />}
                                    <BottomNav tab={tab} onChange={setTab} />
                                    {reporting && driverInfo && (
                                        <AccidentReportScreen key={vm.id} d={vm} driverInfo={driverInfo} owner={owner} onClose={() => setReporting(false)} onSubmit={add} />
                                    )}
                                </>
                            )}
                        </PhoneFrame>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Driver switcher ─────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
    Active: "bg-emerald-500", Inactive: "bg-slate-400", "On Leave": "bg-amber-500", Terminated: "bg-rose-500",
};

function DriverSwitcher({ drivers, value, onChange }: { drivers: Driver[]; value: string; onChange: (id: string) => void }) {
    const [open, setOpen] = useState(false);
    const sel = drivers.find(d => d.id === value) ?? drivers[0];
    if (!sel) return null;
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="flex min-w-[240px] items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition-colors hover:border-slate-300">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[13px] font-bold text-indigo-700">{sel.avatarInitials}</span>
                <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-bold text-slate-900">{sel.name}</span>
                    <span className="block truncate text-[11px] text-slate-500">{sel.driverType || "Driver"} · {sel.id}</span>
                </span>
                <ChevronDown size={16} className={cn("text-slate-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-40 mt-2 max-h-80 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{drivers.length} drivers</div>
                        {drivers.map(d => {
                            const on = d.id === value;
                            return (
                                <button key={d.id} type="button" onClick={() => { onChange(d.id); setOpen(false); }}
                                    className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors", on ? "bg-indigo-50" : "hover:bg-slate-50")}>
                                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold", on ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600")}>{d.avatarInitials}</span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[13px] font-semibold text-slate-900">{d.name}</span>
                                        <span className="block truncate text-[11px] text-slate-500">{d.driverType || "Driver"}</span>
                                    </span>
                                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_DOT[d.status] ?? "bg-slate-400")} title={d.status} />
                                    {on && <CheckCircle2 size={15} className="shrink-0 text-indigo-600" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Phone chrome ────────────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative w-full max-w-[380px]">
            <div className="relative rounded-[2.75rem] border-[11px] border-slate-900 bg-slate-900 shadow-2xl shadow-slate-400/40">
                <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-slate-900" />
                <div className="relative h-[760px] overflow-hidden rounded-[2.05rem] bg-slate-50">
                    <StatusBar />
                    {children}
                </div>
            </div>
            <span className="absolute -left-[11px] top-28 h-14 w-[3px] rounded-l bg-slate-800" />
            <span className="absolute -left-[11px] top-44 h-10 w-[3px] rounded-l bg-slate-800" />
            <span className="absolute -right-[11px] top-36 h-16 w-[3px] rounded-r bg-slate-800" />
        </div>
    );
}

function StatusBar() {
    return (
        <div className="flex h-11 items-center justify-between px-6 pt-1 text-slate-900">
            <span className="text-[13px] font-semibold tabular-nums">9:41</span>
            <div className="flex items-center gap-1.5">
                <Signal size={14} /><Wifi size={14} /><BatteryFull size={18} />
            </div>
        </div>
    );
}

function BottomNav({ tab, onChange }: { tab: TabId; onChange: (t: TabId) => void }) {
    return (
        <div className="absolute inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-stretch">
                {NAV.map((n) => {
                    const active = tab === n.id;
                    return (
                        <button key={n.id} type="button" onClick={() => onChange(n.id)} className="flex flex-1 flex-col items-center gap-1 pb-5 pt-2.5">
                            <n.Icon size={21} className={active ? "text-indigo-600" : "text-slate-400"} strokeWidth={active ? 2.4 : 2} />
                            <span className={cn("text-[10px] font-semibold", active ? "text-indigo-600" : "text-slate-400")}>{n.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function Screen({ children }: { children: React.ReactNode }) {
    return <div className="h-[calc(760px-2.75rem)] overflow-y-auto pb-24">{children}</div>;
}

// ── Home ────────────────────────────────────────────────────────────────
const TASK_TONE: Record<string, { icon: string; chip: string }> = {
    rose: { icon: "text-rose-600 bg-rose-50", chip: "bg-rose-600 text-white" },
    amber: { icon: "text-amber-600 bg-amber-50", chip: "bg-amber-500 text-white" },
    blue: { icon: "text-blue-600 bg-blue-50", chip: "bg-blue-600 text-white" },
};

function HomeScreen({ d, health, onReport }: { d: DriverVM; health: Health | null; onReport: () => void }) {
    // Build the "needs attention" list from the driver's real DQ health + license expiry.
    const tasks: { Icon: React.ElementType; tone: string; title: string; sub: string; chip: string }[] = [];
    if (health) {
        if (health.missing > 0) tasks.push({ Icon: AlertTriangle, tone: "rose", title: `${health.missing} required item${health.missing === 1 ? "" : "s"} missing`, sub: "From your DQ file", chip: "Upload" });
        if (health.expired > 0) tasks.push({ Icon: AlertTriangle, tone: "rose", title: `${health.expired} expired`, sub: "Renew to stay compliant", chip: "Renew" });
        if (health.expiring > 0) tasks.push({ Icon: Clock, tone: "amber", title: `${health.expiring} expiring soon`, sub: "Within 30 days", chip: "Review" });
    }
    const dLeft = daysUntil(d.licenseExpiry);
    if (dLeft !== null && dLeft >= 0 && dLeft <= 90) tasks.push({ Icon: IdCard, tone: "amber", title: "CDL renewal", sub: `Expires in ${dLeft} days`, chip: "Review" });
    const shown = tasks.slice(0, 3);
    const attention = health ? health.missing + health.issues : 0;
    const allGood = attention === 0;

    return (
        <Screen>
            {/* App bar */}
            <div className="flex items-center justify-between px-5 pt-1">
                <div>
                    <div className="text-xs text-slate-500">Good morning,</div>
                    <div className="text-lg font-bold text-slate-900">{d.first} 👋</div>
                </div>
                <div className="flex items-center gap-3">
                    <button className="relative rounded-full border border-slate-200 bg-white p-2 text-slate-500">
                        <Bell size={18} />
                        {!allGood && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" />}
                    </button>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{d.initials}</div>
                </div>
            </div>

            {/* Compliance status */}
            <div className="mx-5 mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-5 text-white shadow-lg shadow-indigo-500/20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-xs font-medium text-indigo-100">DQ File compliance</div>
                        <div className="mt-1 text-2xl font-bold">{allGood ? "On track" : "Action needed"}</div>
                        <div className="mt-1 text-xs text-indigo-100">{allGood ? "All items up to date" : `${attention} item${attention === 1 ? "" : "s"} need attention`}</div>
                    </div>
                    <Ring pct={d.dqPct} />
                </div>
                <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-white/15 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25">
                    View my file <ChevronRight size={15} />
                </button>
            </div>

            {/* Report an accident */}
            <button onClick={onReport} className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-left transition-colors hover:bg-rose-100">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white"><AlertTriangle size={20} /></span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-rose-900">Report an accident</span>
                    <span className="block text-xs text-rose-700/80">Tell us what happened — takes 2 minutes</span>
                </span>
                <ChevronRight size={18} className="text-rose-400" />
            </button>

            {/* Quick actions */}
            <div className="mx-5 mt-5 grid grid-cols-4 gap-3">
                {[
                    { Icon: UploadCloud, label: "Upload", tone: "text-blue-600 bg-blue-50" },
                    { Icon: PenLine, label: "Sign", tone: "text-emerald-600 bg-emerald-50" },
                    { Icon: MessageSquare, label: "Message", tone: "text-violet-600 bg-violet-50" },
                    { Icon: Clock, label: "Log HOS", tone: "text-amber-600 bg-amber-50" },
                ].map((a) => (
                    <button key={a.label} className="flex flex-col items-center gap-1.5">
                        <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", a.tone)}><a.Icon size={20} /></span>
                        <span className="text-[11px] font-medium text-slate-600">{a.label}</span>
                    </button>
                ))}
            </div>

            {/* Needs attention */}
            <div className="mx-5 mt-6">
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Needs attention</h3>
                    {!allGood && <span className="text-xs font-semibold text-indigo-600">See all</span>}
                </div>
                {shown.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                        <div className="text-sm font-semibold text-emerald-800">You're all caught up</div>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {shown.map((t, i) => <TaskRow key={i} {...t} />)}
                    </div>
                )}
            </div>

            {/* Assigned vehicle */}
            <div className="mx-5 mt-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">Assigned vehicle</h3>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white"><Truck size={20} /></div>
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-slate-900">{d.unit}</div>
                        <div className="truncate text-xs text-slate-500">{d.terminal} terminal</div>
                    </div>
                    {d.status === "Active"
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><MapPin size={11} /> On route</span>
                        : <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{d.status}</span>}
                </div>
            </div>
        </Screen>
    );
}

function Ring({ pct }: { pct: number }) {
    const r = 26;
    const c = 2 * Math.PI * r;
    const off = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
    return (
        <div className="relative h-[68px] w-[68px]">
            <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90">
                <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="7" />
                <circle cx="34" cy="34" r={r} fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
        </div>
    );
}

function TaskRow({ Icon, tone, title, sub, chip }: { Icon: React.ElementType; tone: string; title: string; sub: string; chip: string }) {
    const t = TASK_TONE[tone] ?? TASK_TONE.blue;
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", t.icon)}><Icon size={18} /></div>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <div className="text-xs text-slate-500">{sub}</div>
            </div>
            <button className={cn("rounded-lg px-3 py-1.5 text-[11px] font-bold", t.chip)}>{chip}</button>
        </div>
    );
}

// ── Documents ─────────────────────────────────────────────────────────────
type DocStatus = "missing" | "sign" | "expiring" | "onfile";
const DOCS: { name: string; cat: string; status: DocStatus }[] = [
    { name: "Medical Certificate", cat: "Medical", status: "missing" },
    { name: "Drug & Alcohol Policy", cat: "Disclosures", status: "sign" },
    { name: "Commercial Driver's License", cat: "License", status: "expiring" },
    { name: "Application for Employment", cat: "DQ File", status: "onfile" },
    { name: "PSP Authorization", cat: "Disclosures", status: "onfile" },
    { name: "Driver Abstract", cat: "Abstracts", status: "onfile" },
    { name: "Road Test Certificate", cat: "Qualification", status: "onfile" },
];
const DOC_STATUS: Record<DocStatus, { label: string; chip: string; Icon: React.ElementType; action: string }> = {
    missing: { label: "Missing", chip: "bg-rose-50 text-rose-700", Icon: AlertTriangle, action: "Upload" },
    sign: { label: "Sign", chip: "bg-amber-50 text-amber-700", Icon: PenLine, action: "Sign" },
    expiring: { label: "Expiring", chip: "bg-amber-50 text-amber-700", Icon: Clock, action: "View" },
    onfile: { label: "On file", chip: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2, action: "View" },
};

function DocsScreen({ health }: { health: Health | null }) {
    const [filter, setFilter] = useState<"all" | "todo" | "onfile">("all");
    const rows = DOCS.filter((d) => filter === "all" ? true : filter === "onfile" ? d.status === "onfile" : d.status !== "onfile");
    const todo = health ? health.missing + health.expiring + health.expired : DOCS.filter((d) => d.status !== "onfile").length;
    const onFile = health ? health.valid : DOCS.length - DOCS.filter((d) => d.status !== "onfile").length;

    return (
        <Screen>
            <div className="px-5 pt-1">
                <h2 className="text-xl font-bold text-slate-900">Documents &amp; forms</h2>
                <p className="text-xs text-slate-500">{todo} to complete · {onFile} on file</p>
            </div>

            <div className="mx-5 mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {([["all", "All"], ["todo", "To-do"], ["onfile", "On file"]] as const).map(([id, label]) => (
                    <button key={id} onClick={() => setFilter(id)}
                        className={cn("rounded-lg py-2 text-xs font-semibold transition-colors", filter === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}>
                        {label}
                    </button>
                ))}
            </div>

            <div className="mx-5 mt-4 space-y-2.5">
                {rows.map((d) => {
                    const s = DOC_STATUS[d.status];
                    return (
                        <div key={d.name} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><FileText size={18} /></div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-900">{d.name}</div>
                                <div className="truncate text-xs text-slate-500">{d.cat}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", s.chip)}><s.Icon size={10} /> {s.label}</span>
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-indigo-600">{s.action} <ChevronRight size={12} /></span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mx-5 mt-5">
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 py-4 text-sm font-semibold text-indigo-600">
                    <Camera size={17} /> Scan a document
                </button>
            </div>
        </Screen>
    );
}

// ── Hours of Service ────────────────────────────────────────────────────
const DUTY = [
    { id: "off", label: "Off Duty", color: "bg-slate-400" },
    { id: "sb", label: "Sleeper", color: "bg-blue-500" },
    { id: "drive", label: "Driving", color: "bg-emerald-500" },
    { id: "on", label: "On Duty", color: "bg-amber-500" },
] as const;

function HoursScreen() {
    const [duty, setDuty] = useState<string>("drive");
    return (
        <Screen>
            <div className="px-5 pt-1">
                <h2 className="text-xl font-bold text-slate-900">Hours of service</h2>
                <p className="text-xs text-slate-500">Today</p>
            </div>

            <div className="mx-5 mt-4 rounded-2xl bg-slate-900 p-5 text-white">
                <div className="text-xs text-slate-400">Current status</div>
                <div className="mt-1 flex items-center gap-2 text-2xl font-bold"><span className="h-3 w-3 rounded-full bg-emerald-400" /> Driving</div>
                <div className="mt-0.5 text-xs text-slate-400">Started 06:42 · 2h 18m elapsed</div>
            </div>

            <div className="mx-5 mt-4 grid grid-cols-4 gap-2">
                {DUTY.map((dd) => {
                    const active = duty === dd.id;
                    return (
                        <button key={dd.id} onClick={() => setDuty(dd.id)}
                            className={cn("flex flex-col items-center gap-1.5 rounded-xl border py-2.5 transition-all", active ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white")}>
                            <span className={cn("h-2.5 w-2.5 rounded-full", dd.color)} />
                            <span className="text-[10px] font-semibold text-slate-700">{dd.label}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mx-5 mt-5 space-y-3">
                <Clock24 label="Drive" used="4h 40m" left="6h 20m" pct={42} tone="bg-emerald-500" />
                <Clock24 label="Shift (14h)" used="5h 55m" left="8h 05m" pct={42} tone="bg-amber-500" />
                <Clock24 label="Cycle (70h)" used="27h 30m" left="42h 30m" pct={39} tone="bg-indigo-500" />
            </div>

            <div className="mx-5 mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 text-sm font-bold text-slate-900">Today's log</div>
                <div className="flex h-8 overflow-hidden rounded-lg">
                    <span className="bg-slate-300" style={{ width: "26%" }} />
                    <span className="bg-amber-400" style={{ width: "8%" }} />
                    <span className="bg-emerald-500" style={{ width: "40%" }} />
                    <span className="bg-blue-400" style={{ width: "12%" }} />
                    <span className="bg-slate-300" style={{ width: "14%" }} />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-slate-400"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span></div>
            </div>

            <div className="mx-5 mt-5">
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-semibold text-white"><CheckCircle2 size={16} /> Certify logs</button>
            </div>
        </Screen>
    );
}

function Clock24({ label, used, left, pct, tone }: { label: string; used: string; left: string; pct: number; tone: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900">{label}</span>
                <span className="font-bold tabular-nums text-slate-900">{left} <span className="font-medium text-slate-400">left</span></span>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} /></div>
            <div className="mt-1 text-[11px] text-slate-400">{used} used</div>
        </div>
    );
}

// ── Profile ─────────────────────────────────────────────────────────────
function ProfileScreen({ d }: { d: DriverVM }) {
    return (
        <Screen>
            <div className="flex flex-col items-center px-5 pt-3 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/25">{d.initials}</div>
                <div className="mt-3 text-lg font-bold text-slate-900">{d.name}</div>
                <div className="text-xs text-slate-500">{d.id} · {d.carrier}</div>
                <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">{d.type}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[d.status] ?? "bg-slate-400")} /> {d.status}
                    </span>
                </div>
            </div>

            <div className="mx-5 mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Driver's License</span>
                    <IdCard size={18} className="text-slate-400" />
                </div>
                <div className="mt-3 font-mono text-lg font-bold tracking-wider">{d.license}</div>
                <div className="mt-3 flex justify-between text-xs">
                    <div><div className="text-slate-400">Class</div><div className="font-semibold">{d.licenseClass}</div></div>
                    <div><div className="text-slate-400">State</div><div className="font-semibold">{d.licenseState}</div></div>
                    <div className="text-right"><div className="text-slate-400">Expires</div><div className="font-semibold">{d.licenseExpiry}</div></div>
                </div>
            </div>

            <div className="mx-5 mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                <InfoRow Icon={Phone} label="Phone" value={d.phone} />
                <InfoRow Icon={Mail} label="Email" value={d.email} />
                <InfoRow Icon={Truck} label="Assigned unit" value={`${d.unit} · ${d.terminal}`} />
                <InfoRow Icon={CalendarClock} label="Hired" value={d.hiredDate} />
            </div>

            <div className="mx-5 mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                <MenuRow Icon={Settings} label="Settings" />
                <MenuRow Icon={CircleHelp} label="Help & support" />
                <MenuRow Icon={LogOut} label="Sign out" danger />
            </div>
        </Screen>
    );
}

function InfoRow({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon size={16} /></div>
            <div className="min-w-0 flex-1">
                <div className="text-[11px] text-slate-400">{label}</div>
                <div className="truncate text-sm font-semibold text-slate-900">{value}</div>
            </div>
        </div>
    );
}

function MenuRow({ Icon, label, danger }: { Icon: React.ElementType; label: string; danger?: boolean }) {
    return (
        <button className="flex w-full items-center gap-3 p-3.5 text-left">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", danger ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500")}><Icon size={16} /></div>
            <span className={cn("flex-1 text-sm font-semibold", danger ? "text-rose-600" : "text-slate-900")}>{label}</span>
            {!danger && <ChevronRight size={16} className="text-slate-300" />}
        </button>
    );
}

// ── Accident report (driver) ───────────────────────────────────────────────
const MOB_INPUT = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function MField({ label, Icon, children }: { label: string; Icon?: React.ElementType; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">{Icon && <Icon size={12} className="text-slate-400" />}{label}</label>
            {children}
        </div>
    );
}

function AutoInfo({ title, icon: Icon, rows }: { title: string; icon: React.ElementType; rows: [string, string][] }) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-3.5 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Icon size={13} /> {title}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700"><CheckCircle2 size={9} /> Auto-filled</span>
            </div>
            <dl className="divide-y divide-slate-50">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-3 px-3.5 py-1.5">
                        <dt className="shrink-0 text-[11px] text-slate-400">{k}</dt>
                        <dd className="max-w-[62%] truncate text-right text-[12px] font-medium text-slate-800">{v || "—"}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function AccidentReportScreen({ d, driverInfo, owner, onClose, onSubmit }: { d: DriverVM; driverInfo: AccidentDriverInfo; owner: AccidentOwnerInfo; onClose: () => void; onSubmit: (r: AccidentRecord) => void }) {
    const { dt, today } = mobileNow();
    const [form, setForm] = useState<AccidentRecord>(() =>
        blankAccidentReport({
            driverId: d.id, driverName: d.name, unitId: d.unit, now: dt, today,
            driverInfo,
            ownerInfo: owner,
        }),
    );
    const [done, setDone] = useState(false);
    const set = <K extends keyof AccidentRecord>(k: K, v: AccidentRecord[K]) => setForm((f) => ({ ...f, [k]: v }));
    const canSubmit = form.location.trim().length > 0 && form.description.trim().length > 0;

    const submit = () => {
        if (!canSubmit) return;
        onSubmit(form);
        setDone(true);
    };

    return (
        <div className="absolute inset-x-0 bottom-0 top-11 z-40 flex flex-col bg-slate-50">
            {done ? (
                <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={40} /></div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900">Report submitted</h3>
                    <p className="mt-2 text-sm text-slate-500">Your safety manager has been notified and will review the accident. You can add more details anytime.</p>
                    <button onClick={onClose} className="mt-6 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white">Done</button>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
                        <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><ChevronLeft size={22} /></button>
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white"><AlertTriangle size={16} /></span>
                        <h3 className="text-base font-bold text-slate-900">Report an accident</h3>
                        <button onClick={onClose} className="ml-auto rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                        <AccidentDisclosure defaultOpen />

                        <AutoInfo title="Your information" icon={User} rows={[
                            ["Name", d.name], ["Phone", d.phone], ["Address", d.address],
                            ["Licence #", d.license], ["Expiry", d.licenseExpiry], ["Province", d.licenseState],
                        ]} />
                        <AutoInfo title="Owner / carrier" icon={Building2} rows={[
                            ["Name", owner.ownerName ?? ""], ["Phone", owner.ownerPhone ?? ""], ["Address", owner.ownerAddress ?? ""],
                            ["Policy #", owner.policyNumber ?? ""], ["NSC/CVOR #", owner.nscCvor ?? ""],
                        ]} />

                        <MField label="When did it happen?" Icon={CalendarClock}>
                            <input type="datetime-local" value={form.dateTime} onChange={(e) => set("dateTime", e.target.value)} className={MOB_INPUT} />
                        </MField>
                        <MField label="Where?" Icon={MapPin}>
                            <input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Road, exit, city…" className={MOB_INPUT} />
                        </MField>
                        <MField label="Type of accident">
                            <select value={form.accidentTypeId} onChange={(e) => set("accidentTypeId", e.target.value)} className={MOB_INPUT}>
                                <option value="">Select…</option>
                                {ACCIDENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.displayName}</option>)}
                            </select>
                        </MField>
                        <MField label="What happened?">
                            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Describe the accident…" className={cn(MOB_INPUT, "min-h-[90px] resize-y")} />
                        </MField>

                        <button type="button" onClick={() => set("injuries", !form.injuries)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <span className="text-sm font-medium text-slate-700">Was anyone injured?</span>
                            <span className={cn("relative h-6 w-11 rounded-full transition-colors", form.injuries ? "bg-rose-500" : "bg-slate-200")}>
                                <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", form.injuries ? "left-[22px]" : "left-0.5")} />
                            </span>
                        </button>
                        {form.injuries && (
                            <textarea value={form.injuryNotes ?? ""} onChange={(e) => set("injuryNotes", e.target.value)} placeholder="Injury details…" className={cn(MOB_INPUT, "min-h-[64px] resize-y")} />
                        )}

                        <div>
                            <div className="mb-1.5 text-xs font-semibold text-slate-600">Photos</div>
                            <button type="button" onClick={() => set("photoCount", form.photoCount + 1)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-500">
                                <Camera size={17} /> {form.photoCount > 0 ? `${form.photoCount} photo${form.photoCount === 1 ? "" : "s"} added — tap to add more` : "Add photos"}
                            </button>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
                            <Truck size={16} className="text-slate-400" /> Reporting as <span className="font-semibold text-slate-800">{d.name}</span> · {d.unit}
                        </div>
                    </div>

                    <div className="border-t border-slate-200 bg-white px-5 pb-6 pt-3">
                        <button onClick={submit} disabled={!canSubmit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-semibold text-white disabled:opacity-40">
                            <Send size={16} /> Submit report
                        </button>
                        {!canSubmit && <p className="mt-2 text-center text-[11px] text-slate-400">Add a location and a short description to submit.</p>}
                    </div>
                </>
            )}
        </div>
    );
}

// ── App-store badge (mock) ────────────────────────────────────────────────
function StoreBadge({ kicker, store }: { kicker: string; store: string }) {
    return (
        <div className="inline-flex items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-2.5 text-white">
            <Smartphone size={20} />
            <div className="leading-tight">
                <div className="text-[9px] uppercase tracking-wide text-slate-300">{kicker}</div>
                <div className="text-sm font-semibold">{store}</div>
            </div>
        </div>
    );
}

export default DriverMobileAppPage;
