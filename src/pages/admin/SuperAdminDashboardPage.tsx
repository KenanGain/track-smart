import { useEffect, useMemo, useRef, useState } from "react";
import {
    ShieldAlert,
    UserCog,
    User,
    Clock3,
    Server,
    CircleDot,
    LayoutDashboard,
    TrendingUp,
    Sparkles,
    Wifi,
    Radio,
    BarChart3,
    Gauge,
    Users as UsersIcon,
    Activity,
    Cpu,
    Receipt,
    CreditCard,
    DollarSign,
    Repeat,
    AlertTriangle,
    Crown,
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    Area,
    AreaChart,
} from "recharts";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { PaginationBar } from "@/components/ui/DataListToolbar";
import { APP_USERS, ROLE_BADGE, ROLE_LABELS, type AppUser } from "@/data/users.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import {
    SUBSCRIPTIONS,
    TRANSACTIONS,
    TIER_CONFIG,
    TIER_ORDER,
    getMonthlyRevenue,
    getBillingTotals,
    formatUsd,
    type SubscriptionStatus,
    type SubscriptionTier,
    type TransactionStatus,
} from "./billing.data";
import { cn } from "@/lib/utils";

type Props = {
    currentUser: AppUser;
};

// Theme palette — pulled from the existing app tokens so charts and pills
// match the rest of TrackSmart.
const ROLE_COLORS: Record<string, string> = {
    "super-admin": "#8b5cf6", // violet-500
    admin: "#2563eb",         // blue-600
    user: "#64748b",          // slate-500
};

const STATUS_COLORS: Record<string, string> = {
    Active: "#10b981",   // emerald-500
    Inactive: "#94a3b8", // slate-400
};

type TabKey =
    | "overview"
    | "users"
    | "activity"
    | "transactions"
    | "subscriptions"
    | "system";

const TAB_ORDER: TabKey[] = [
    "overview",
    "users",
    "activity",
    "transactions",
    "subscriptions",
    "system",
];

const TAB_LABELS: Record<TabKey, string> = {
    overview: "Overview",
    users: "Users",
    activity: "Activity",
    transactions: "Transactions",
    subscriptions: "Subscriptions",
    system: "System",
};

const TAB_COLORS: Record<TabKey, string> = {
    overview: "#2563eb",       // blue-600
    users: "#8b5cf6",          // violet-500
    activity: "#10b981",       // emerald-500
    transactions: "#0ea5e9",   // sky-500
    subscriptions: "#ec4899",  // pink-500
    system: "#f59e0b",         // amber-500
};

const TX_STATUS_COLORS: Record<TransactionStatus, string> = {
    Paid: "#10b981",      // emerald-500
    Pending: "#f59e0b",   // amber-500
    Failed: "#ef4444",    // red-500
    Refunded: "#94a3b8",  // slate-400
};

const SUB_STATUS_COLORS: Record<SubscriptionStatus, string> = {
    Active: "#10b981",
    Trial: "#0ea5e9",
    "Past Due": "#f59e0b",
    Cancelled: "#94a3b8",
};

const SUB_STATUS_BADGE: Record<SubscriptionStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Trial: "bg-sky-50 text-sky-700 border-sky-200",
    "Past Due": "bg-amber-50 text-amber-700 border-amber-200",
    Cancelled: "bg-slate-50 text-slate-600 border-slate-200",
};

const TX_STATUS_BADGE: Record<TransactionStatus, string> = {
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Failed: "bg-red-50 text-red-700 border-red-200",
    Refunded: "bg-slate-50 text-slate-600 border-slate-200",
};

const TIER_BADGE: Record<SubscriptionTier, string> = {
    Starter: "bg-slate-50 text-slate-700 border-slate-200",
    Pro: "bg-blue-50 text-blue-700 border-blue-200",
    Enterprise: "bg-violet-50 text-violet-700 border-violet-200",
};

const formatDuration = (ms: number): string => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const formatDurationShort = (ms: number): string => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    if (totalSec < 60) return `${totalSec}s`;
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m < 60) return `${m}m ${s.toString().padStart(2, "0")}s`;
    const h = Math.floor(m / 60);
    return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
};

export function SuperAdminDashboardPage({ currentUser }: Props) {
    // ── Live platform clock ──────────────────────────────────────────────────
    const [now, setNow] = useState(() => new Date());
    const [mountedAt] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    // ── Tab state + per-tab time tracker ─────────────────────────────────────
    const [activeTab, setActiveTab] = useState<TabKey>("overview");
    const [tabTimes, setTabTimes] = useState<Record<TabKey, number>>({
        overview: 0,
        users: 0,
        activity: 0,
        transactions: 0,
        subscriptions: 0,
        system: 0,
    });
    const tabStartRef = useRef<number>(Date.now());

    // Tick the active tab's accumulator every second.
    useEffect(() => {
        const id = setInterval(() => {
            setTabTimes((prev) => ({ ...prev, [activeTab]: prev[activeTab] + 1000 }));
        }, 1000);
        return () => clearInterval(id);
    }, [activeTab]);

    useEffect(() => {
        tabStartRef.current = Date.now();
    }, [activeTab]);

    const totalTrackedMs = TAB_ORDER.reduce((s, k) => s + tabTimes[k], 0);
    const mostUsedTab: TabKey = TAB_ORDER.reduce((a, b) =>
        tabTimes[a] >= tabTimes[b] ? a : b,
    );

    // ── Aggregations ─────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = APP_USERS.length;
        const superAdmins = APP_USERS.filter((u) => u.role === "super-admin").length;
        const admins = APP_USERS.filter((u) => u.role === "admin").length;
        const regular = APP_USERS.filter((u) => u.role === "user").length;
        const active = APP_USERS.filter((u) => u.status === "Active").length;
        const inactive = APP_USERS.filter((u) => u.status === "Inactive").length;
        const activePct = total > 0 ? (active / total) * 100 : 0;
        return {
            total,
            superAdmins,
            admins,
            regular,
            active,
            inactive,
            activePct,
            carriers: ACCOUNTS_DB.length,
            serviceProfiles: SERVICE_PROFILES_DB.length,
        };
    }, []);

    const usersByRoleData = useMemo(
        () => [
            { role: "Super Admin", count: stats.superAdmins, color: ROLE_COLORS["super-admin"] },
            { role: "Admin", count: stats.admins, color: ROLE_COLORS.admin },
            { role: "User", count: stats.regular, color: ROLE_COLORS.user },
        ],
        [stats],
    );

    const statusPieData = useMemo(
        () => [
            { name: "Active", value: stats.active },
            { name: "Inactive", value: stats.inactive },
        ],
        [stats],
    );

    const usersByServiceProfileData = useMemo(() => {
        const counts = new Map<string, { active: number; inactive: number }>();
        for (const u of APP_USERS) {
            const key = u.serviceProfileId ?? "unscoped";
            const cur = counts.get(key) ?? { active: 0, inactive: 0 };
            if (u.status === "Active") cur.active += 1;
            else cur.inactive += 1;
            counts.set(key, cur);
        }
        const rows = Array.from(counts.entries()).map(([id, c]) => {
            if (id === "unscoped") return { label: "Unscoped", ...c, total: c.active + c.inactive };
            const sp = SERVICE_PROFILES_DB.find((s) => s.id === id);
            return { label: sp?.dbaName || sp?.legalName || id, ...c, total: c.active + c.inactive };
        });
        rows.sort((a, b) => b.total - a.total);
        return rows;
    }, []);

    const topServiceProfiles = useMemo(
        () => usersByServiceProfileData.slice(0, 5),
        [usersByServiceProfileData],
    );

    // ── Active users / live sessions ─────────────────────────────────────────
    const activeUsers = useMemo(
        () => APP_USERS.filter((u) => u.status === "Active"),
        [],
    );

    // Recent-sessions view = the signed-in user first, then active users.
    const sessionRows = useMemo(() => {
        const others = activeUsers.filter((u) => u.id !== currentUser.id);
        return [currentUser, ...others];
    }, [activeUsers, currentUser]);

    // ── Pagination state ─────────────────────────────────────────────────────
    const [usersPage, setUsersPage] = useState(1);
    const [usersRowsPerPage, setUsersRowsPerPage] = useState(10);
    const usersTotal = APP_USERS.length;
    const usersStart = (usersPage - 1) * usersRowsPerPage;
    const usersSlice = APP_USERS.slice(usersStart, usersStart + usersRowsPerPage);
    // Reset to page 1 if rowsPerPage changes leaves us out of range.
    useEffect(() => {
        const max = Math.max(1, Math.ceil(usersTotal / usersRowsPerPage));
        if (usersPage > max) setUsersPage(max);
    }, [usersRowsPerPage, usersTotal, usersPage]);

    const [sessionsPage, setSessionsPage] = useState(1);
    const [sessionsRowsPerPage, setSessionsRowsPerPage] = useState(10);
    const sessionsTotal = sessionRows.length;
    const sessionsStart = (sessionsPage - 1) * sessionsRowsPerPage;
    const sessionsSlice = sessionRows.slice(sessionsStart, sessionsStart + sessionsRowsPerPage);
    useEffect(() => {
        const max = Math.max(1, Math.ceil(sessionsTotal / sessionsRowsPerPage));
        if (sessionsPage > max) setSessionsPage(max);
    }, [sessionsRowsPerPage, sessionsTotal, sessionsPage]);

    // Transactions pagination
    const [txPage, setTxPage] = useState(1);
    const [txRowsPerPage, setTxRowsPerPage] = useState(10);
    const txTotal = TRANSACTIONS.length;
    const txStart = (txPage - 1) * txRowsPerPage;
    const txSlice = TRANSACTIONS.slice(txStart, txStart + txRowsPerPage);
    useEffect(() => {
        const max = Math.max(1, Math.ceil(txTotal / txRowsPerPage));
        if (txPage > max) setTxPage(max);
    }, [txRowsPerPage, txTotal, txPage]);

    // Subscriptions pagination
    const [subPage, setSubPage] = useState(1);
    const [subRowsPerPage, setSubRowsPerPage] = useState(10);
    const subTotal = SUBSCRIPTIONS.length;
    const subStart = (subPage - 1) * subRowsPerPage;
    const subSlice = SUBSCRIPTIONS.slice(subStart, subStart + subRowsPerPage);
    useEffect(() => {
        const max = Math.max(1, Math.ceil(subTotal / subRowsPerPage));
        if (subPage > max) setSubPage(max);
    }, [subRowsPerPage, subTotal, subPage]);

    // Billing aggregations
    const billingTotals = useMemo(() => getBillingTotals(), []);
    const monthlyRevenue = useMemo(() => getMonthlyRevenue(12), []);

    const txStatusData = useMemo(() => {
        const buckets: Record<TransactionStatus, number> = {
            Paid: 0,
            Pending: 0,
            Failed: 0,
            Refunded: 0,
        };
        for (const tx of TRANSACTIONS) buckets[tx.status] += 1;
        return (Object.keys(buckets) as TransactionStatus[]).map((s) => ({
            name: s,
            value: buckets[s],
            color: TX_STATUS_COLORS[s],
        }));
    }, []);

    const subTierData = useMemo(() => {
        const buckets: Record<SubscriptionTier, { count: number; mrr: number }> = {
            Starter: { count: 0, mrr: 0 },
            Pro: { count: 0, mrr: 0 },
            Enterprise: { count: 0, mrr: 0 },
        };
        for (const sub of SUBSCRIPTIONS) {
            buckets[sub.tier].count += 1;
            if (sub.status === "Active" || sub.status === "Past Due") {
                buckets[sub.tier].mrr += sub.monthlyAmount;
            }
        }
        return TIER_ORDER.map((t) => ({
            tier: t,
            count: buckets[t].count,
            mrr: buckets[t].mrr,
            color: TIER_CONFIG[t].color,
        }));
    }, []);

    const subStatusData = useMemo(() => {
        const buckets: Record<SubscriptionStatus, number> = {
            Active: 0,
            Trial: 0,
            "Past Due": 0,
            Cancelled: 0,
        };
        for (const sub of SUBSCRIPTIONS) buckets[sub.status] += 1;
        return (Object.keys(buckets) as SubscriptionStatus[]).map((s) => ({
            name: s,
            value: buckets[s],
            color: SUB_STATUS_COLORS[s],
        }));
    }, []);

    // ── System info ──────────────────────────────────────────────────────────
    const systemInfo = useMemo(
        () => ({
            mode: import.meta.env.MODE,
            isDev: import.meta.env.DEV,
            isProd: import.meta.env.PROD,
            base: import.meta.env.BASE_URL,
            language: typeof navigator !== "undefined" ? navigator.language : "—",
            platform: typeof navigator !== "undefined" ? navigator.platform : "—",
        }),
        [],
    );

    const sessionUptimeMs = now.getTime() - mountedAt;

    // ── SubTabs config — matches Account section style ──────────────────────
    const SUBTABS: SubTab<TabKey>[] = [
        { id: "overview", label: TAB_LABELS.overview, icon: LayoutDashboard },
        { id: "users", label: TAB_LABELS.users, icon: UsersIcon, count: stats.total },
        { id: "activity", label: TAB_LABELS.activity, icon: Activity, count: 1 },
        { id: "transactions", label: TAB_LABELS.transactions, icon: Receipt, count: billingTotals.totalTransactions },
        { id: "subscriptions", label: TAB_LABELS.subscriptions, icon: CreditCard, count: billingTotals.activeSubs + billingTotals.pastDueSubs },
        { id: "system", label: TAB_LABELS.system, icon: Cpu },
    ];

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ───────── Hero ───────── */}
            <div className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950">
                <div
                    className="pointer-events-none absolute inset-0 opacity-40"
                    style={{
                        background:
                            "radial-gradient(900px 300px at 80% -20%, rgba(139,92,246,0.35), transparent 60%), radial-gradient(700px 280px at 10% 110%, rgba(37,99,235,0.25), transparent 60%)",
                    }}
                />
                <div className="relative px-8 py-7">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/90 mb-2">
                                <LayoutDashboard size={13} />
                                Super Admin Console
                            </div>
                            <h1 className="text-3xl font-semibold text-white tracking-tight">
                                Platform Dashboard
                            </h1>
                            <p className="text-sm text-slate-300/90 mt-1.5 max-w-2xl">
                                Real-time snapshot of users, accounts, and platform engagement across TrackSmart.
                            </p>

                            <div className="flex items-center gap-2 mt-5 flex-wrap">
                                <StatusPill tone="emerald" icon={<Radio size={11} />}>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="relative flex h-2 w-2">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                        </span>
                                        Live · 1 active session
                                    </span>
                                </StatusPill>
                                <StatusPill tone="violet" icon={<Sparkles size={11} />}>
                                    {systemInfo.isDev ? "Development" : systemInfo.isProd ? "Production" : "Unknown"}
                                </StatusPill>
                                <StatusPill tone="slate" icon={<Wifi size={11} />}>
                                    {systemInfo.language}
                                </StatusPill>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 min-w-[240px]">
                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-5 py-4">
                                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                    Platform Time
                                </div>
                                <div className="text-3xl font-semibold text-white tabular-nums mt-1.5 tracking-tight">
                                    {now.toLocaleTimeString()}
                                </div>
                                <div className="text-xs text-slate-300/80 mt-1">
                                    {now.toLocaleDateString(undefined, {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-5 py-3 flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                                        Session Uptime
                                    </div>
                                    <div className="text-base font-mono tabular-nums text-white mt-0.5">
                                        {formatDuration(sessionUptimeMs)}
                                    </div>
                                </div>
                                <Gauge size={20} className="text-slate-300/80" />
                            </div>
                        </div>
                    </div>

                    {/* Hero KPI strip */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-6">
                        <HeroKpi
                            label="Total Users"
                            value={stats.total}
                            sub={`${stats.active} active · ${stats.inactive} inactive`}
                            color="#60a5fa"
                            segments={[
                                { value: stats.active, color: "#34d399" },
                                { value: stats.inactive, color: "#475569" },
                            ]}
                        />
                        <HeroKpi
                            label="Active Now"
                            value={1}
                            sub={`Of ${stats.active} active accounts on platform`}
                            color="#34d399"
                            pulse
                        />
                        <HeroKpi
                            label="Carriers"
                            value={stats.carriers}
                            sub={`Across ${stats.serviceProfiles} service profiles`}
                            color="#fbbf24"
                        />
                        <HeroKpi
                            label="MRR"
                            value={formatUsd(billingTotals.mrr, { compact: true })}
                            sub={`${billingTotals.activeSubs + billingTotals.pastDueSubs} billing subscriptions`}
                            color="#f472b6"
                        />
                        <HeroKpi
                            label="Total Revenue"
                            value={formatUsd(billingTotals.totalRevenue, { compact: true })}
                            sub={`${billingTotals.totalTransactions} transactions to date`}
                            color="#38bdf8"
                        />
                    </div>
                </div>
            </div>

            {/* ───────── SubTabs (matches Account section) ───────── */}
            <div className="bg-white border-b border-slate-200 shadow-sm px-6">
                <SubTabs tabs={SUBTABS} activeId={activeTab} onChange={setActiveTab} />
            </div>

            {/* ───────── Tab content ───────── */}
            <div className="px-8 py-6">
                {/* ───────────────── Overview ───────────────── */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="Super Admins"
                                value={stats.superAdmins}
                                icon={<ShieldAlert size={16} />}
                                tone="violet"
                                share={stats.superAdmins / Math.max(stats.total, 1)}
                                shareLabel="of platform"
                            />
                            <StatCard
                                label="Admins"
                                value={stats.admins}
                                icon={<UserCog size={16} />}
                                tone="blue"
                                share={stats.admins / Math.max(stats.total, 1)}
                                shareLabel="of platform"
                            />
                            <StatCard
                                label="Regular Users"
                                value={stats.regular}
                                icon={<User size={16} />}
                                tone="slate"
                                share={stats.regular / Math.max(stats.total, 1)}
                                shareLabel="of platform"
                            />
                            <StatCard
                                label="Active Rate"
                                value={`${stats.activePct.toFixed(0)}%`}
                                icon={<TrendingUp size={16} />}
                                tone="emerald"
                                share={stats.activePct / 100}
                                shareLabel={`${stats.active} of ${stats.total} accounts`}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <ChartCard
                                title="Users by Role"
                                subtitle="Headcount distribution"
                                className="lg:col-span-2"
                            >
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart
                                        data={usersByRoleData}
                                        margin={{ top: 8, right: 12, left: -10, bottom: 8 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="role" stroke="#64748b" fontSize={12} />
                                        <YAxis allowDecimals={false} stroke="#64748b" fontSize={12} />
                                        <RechartsTooltip
                                            cursor={{ fill: "#f1f5f9" }}
                                            contentStyle={{
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 12,
                                            }}
                                        />
                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                            {usersByRoleData.map((d) => (
                                                <Cell key={d.role} fill={d.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="User Status" subtitle="Active vs inactive">
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={2}
                                            stroke="none"
                                        >
                                            {statusPieData.map((d) => (
                                                <Cell key={d.name} fill={STATUS_COLORS[d.name]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 12,
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={28}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        <ChartCard
                            title="Top Service Profiles"
                            subtitle="Largest organizations on the platform"
                        >
                            <div className="divide-y divide-slate-100">
                                {topServiceProfiles.map((row, i) => {
                                    const max = topServiceProfiles[0]?.total ?? 1;
                                    const pct = (row.total / max) * 100;
                                    return (
                                        <div key={row.label} className="flex items-center gap-4 py-3">
                                            <div className="w-6 text-xs font-semibold text-slate-400 tabular-nums">
                                                #{i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-3 mb-1.5">
                                                    <div className="text-sm font-medium text-slate-900 truncate">
                                                        {row.label}
                                                    </div>
                                                    <div className="text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                                                        {row.total}{" "}
                                                        <span className="font-normal text-slate-400">users</span>
                                                    </div>
                                                </div>
                                                <SegmentBar
                                                    segments={[
                                                        { value: row.active, color: "#10b981" },
                                                        { value: row.inactive, color: "#cbd5e1" },
                                                    ]}
                                                    width={pct}
                                                />
                                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        {row.active} active
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        {row.inactive} inactive
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ChartCard>
                    </div>
                )}

                {/* ───────────────── Users ───────────────── */}
                {activeTab === "users" && (
                    <div className="space-y-6">
                        <ChartCard
                            title="Users by Service Profile"
                            subtitle="Active vs inactive across the platform's service organizations"
                        >
                            <ResponsiveContainer
                                width="100%"
                                height={Math.max(220, usersByServiceProfileData.length * 32)}
                            >
                                <BarChart
                                    data={usersByServiceProfileData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 24, left: 8, bottom: 5 }}
                                    stackOffset="sign"
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#e2e8f0"
                                        horizontal={false}
                                    />
                                    <XAxis
                                        type="number"
                                        allowDecimals={false}
                                        stroke="#64748b"
                                        fontSize={12}
                                    />
                                    <YAxis
                                        dataKey="label"
                                        type="category"
                                        width={200}
                                        stroke="#64748b"
                                        fontSize={12}
                                    />
                                    <RechartsTooltip
                                        cursor={{ fill: "#f1f5f9" }}
                                        contentStyle={{
                                            borderRadius: 8,
                                            border: "1px solid #e2e8f0",
                                            fontSize: 12,
                                        }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                                    <Bar
                                        dataKey="active"
                                        stackId="a"
                                        fill="#10b981"
                                        name="Active"
                                    />
                                    <Bar
                                        dataKey="inactive"
                                        stackId="a"
                                        fill="#cbd5e1"
                                        name="Inactive"
                                        radius={[0, 4, 4, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">All users</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {stats.total} accounts on the platform.
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    <span className="font-semibold text-emerald-600 tabular-nums">
                                        {stats.active}
                                    </span>{" "}
                                    active ·{" "}
                                    <span className="font-semibold text-slate-500 tabular-nums">
                                        {stats.inactive}
                                    </span>{" "}
                                    inactive
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <Th>User</Th>
                                            <Th>Role</Th>
                                            <Th>Service Profile</Th>
                                            <Th>Status</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {usersSlice.map((u) => {
                                            const sp = u.serviceProfileId
                                                ? SERVICE_PROFILES_DB.find((s) => s.id === u.serviceProfileId)
                                                : null;
                                            return (
                                                <tr
                                                    key={u.id}
                                                    className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                                >
                                                    <Td>
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={cn(
                                                                    "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold shadow-sm",
                                                                    u.avatarGradient,
                                                                )}
                                                            >
                                                                {u.initials}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-900">
                                                                    {u.name}
                                                                </div>
                                                                <div className="text-xs text-slate-500">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
                                                                ROLE_BADGE[u.role],
                                                            )}
                                                        >
                                                            {ROLE_LABELS[u.role]}
                                                        </span>
                                                    </Td>
                                                    <Td className="text-slate-600">
                                                        {sp?.dbaName || sp?.legalName || "—"}
                                                    </Td>
                                                    <Td>
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center gap-1.5 text-xs font-medium",
                                                                u.status === "Active"
                                                                    ? "text-emerald-700"
                                                                    : "text-slate-500",
                                                            )}
                                                        >
                                                            <CircleDot
                                                                size={10}
                                                                className={cn(
                                                                    u.status === "Active"
                                                                        ? "text-emerald-500"
                                                                        : "text-slate-400",
                                                                )}
                                                            />
                                                            {u.status}
                                                        </span>
                                                    </Td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                totalItems={usersTotal}
                                currentPage={usersPage}
                                rowsPerPage={usersRowsPerPage}
                                onPageChange={setUsersPage}
                                onRowsPerPageChange={(rows) => {
                                    setUsersRowsPerPage(rows);
                                    setUsersPage(1);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ───────────────── Activity ───────────────── */}
                {activeTab === "activity" && (
                    <div className="space-y-6">
                        {/* Live active users hero */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm relative overflow-hidden">
                                <div className="flex items-start gap-5">
                                    <div className="relative shrink-0">
                                        <div
                                            className={cn(
                                                "w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-semibold shadow-lg shadow-emerald-200/60",
                                                currentUser.avatarGradient,
                                            )}
                                        >
                                            {currentUser.initials}
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                                            <Radio size={11} /> Live · Active Now
                                        </div>
                                        <div className="mt-1 flex items-baseline gap-3">
                                            <div className="text-5xl font-semibold text-slate-900 tabular-nums tracking-tight">
                                                1
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                of {stats.active} active accounts
                                            </div>
                                        </div>
                                        <div className="mt-2 text-sm text-slate-700">
                                            <span className="font-semibold text-slate-900">{currentUser.name}</span>{" "}
                                            <span className="text-slate-400">·</span>{" "}
                                            <span className="text-slate-500">{ROLE_LABELS[currentUser.role]}</span>
                                        </div>
                                        <div className="mt-3 text-xs text-slate-500">
                                            Without backend telemetry, only your active session is reported as
                                            online.
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-5 pt-5 border-t border-emerald-100/60">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">
                                        Active accounts on platform
                                    </div>
                                    <AvatarStack
                                        users={activeUsers}
                                        currentId={currentUser.id}
                                        max={9}
                                    />
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 inline-flex items-center gap-1.5">
                                    <Clock3 size={11} /> Session Uptime
                                </div>
                                <div className="text-4xl font-semibold text-slate-900 mt-2 tabular-nums tracking-tight font-mono">
                                    {formatDuration(sessionUptimeMs)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Since this dashboard mounted
                                </div>

                                <div className="mt-5 pt-5 border-t border-slate-100">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">
                                        Most run time
                                    </div>
                                    <div className="text-lg font-semibold text-slate-900 capitalize">
                                        {TAB_LABELS[mostUsedTab]}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {formatDurationShort(tabTimes[mostUsedTab])} on this tab
                                    </div>
                                </div>
                            </div>
                        </div>

                        <ChartCard
                            title="Most Run Time"
                            subtitle="Time spent in each tab during this session"
                            icon={<BarChart3 size={14} />}
                        >
                            <div className="space-y-3">
                                {TAB_ORDER.map((t) => {
                                    const ms = tabTimes[t];
                                    const pct = totalTrackedMs > 0 ? (ms / totalTrackedMs) * 100 : 0;
                                    const isActive = t === activeTab;
                                    const isLeader = t === mostUsedTab && totalTrackedMs > 0;
                                    return (
                                        <div key={t} className="flex items-center gap-4">
                                            <div className="w-24 shrink-0 flex items-center gap-2">
                                                <span
                                                    className="h-2 w-2 rounded-full"
                                                    style={{ background: TAB_COLORS[t] }}
                                                />
                                                <span
                                                    className={cn(
                                                        "text-sm",
                                                        isActive
                                                            ? "font-semibold text-slate-900"
                                                            : "text-slate-700",
                                                    )}
                                                >
                                                    {TAB_LABELS[t]}
                                                </span>
                                                {isActive && (
                                                    <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-emerald-600 ml-1">
                                                        live
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-[width] duration-500"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: TAB_COLORS[t],
                                                    }}
                                                />
                                            </div>
                                            <div
                                                className={cn(
                                                    "w-28 text-right text-sm tabular-nums shrink-0",
                                                    isLeader
                                                        ? "font-semibold text-slate-900"
                                                        : "text-slate-600",
                                                )}
                                            >
                                                {formatDurationShort(ms)}{" "}
                                                <span className="text-xs text-slate-400">
                                                    ({pct.toFixed(0)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                    <span>Total tracked</span>
                                    <span className="font-mono tabular-nums text-slate-700">
                                        {formatDurationShort(totalTrackedMs)}
                                    </span>
                                </div>
                            </div>
                        </ChartCard>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Recent sessions</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        Live = your current session. Other rows show recently active accounts.
                                    </div>
                                </div>
                                <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                    </span>
                                    Live
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <Th>User</Th>
                                            <Th>Role</Th>
                                            <Th>Service Profile</Th>
                                            <Th>Status</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sessionsSlice.map((u) => {
                                            const isLive =
                                                u.id === currentUser.id && sessionsPage === 1;
                                            const sp = u.serviceProfileId
                                                ? SERVICE_PROFILES_DB.find((s) => s.id === u.serviceProfileId)
                                                : null;
                                            return (
                                                <tr
                                                    key={u.id}
                                                    className={cn(
                                                        "border-t border-slate-100 hover:bg-slate-50/70 transition-colors",
                                                        isLive && "bg-emerald-50/30",
                                                    )}
                                                >
                                                    <Td>
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative shrink-0">
                                                                <div
                                                                    className={cn(
                                                                        "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold",
                                                                        u.avatarGradient,
                                                                    )}
                                                                >
                                                                    {u.initials}
                                                                </div>
                                                                {isLive && (
                                                                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-900">
                                                                    {u.name}
                                                                </div>
                                                                <div className="text-xs text-slate-500">
                                                                    {u.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Td>
                                                    <Td>
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
                                                                ROLE_BADGE[u.role],
                                                            )}
                                                        >
                                                            {ROLE_LABELS[u.role]}
                                                        </span>
                                                    </Td>
                                                    <Td className="text-slate-600">
                                                        {sp?.dbaName || sp?.legalName || "—"}
                                                    </Td>
                                                    <Td>
                                                        {isLive ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                                                <span className="relative flex h-2 w-2">
                                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                                </span>
                                                                Online
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                                                                <span className="w-2 h-2 rounded-full bg-slate-300" />
                                                                Offline
                                                            </span>
                                                        )}
                                                    </Td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                totalItems={sessionsTotal}
                                currentPage={sessionsPage}
                                rowsPerPage={sessionsRowsPerPage}
                                onPageChange={setSessionsPage}
                                onRowsPerPageChange={(rows) => {
                                    setSessionsRowsPerPage(rows);
                                    setSessionsPage(1);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ───────────────── Transactions ───────────────── */}
                {activeTab === "transactions" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="Total Revenue"
                                value={formatUsd(billingTotals.totalRevenue, { compact: true })}
                                icon={<DollarSign size={16} />}
                                tone="emerald"
                                share={1}
                                shareLabel={`${billingTotals.totalTransactions} transactions`}
                            />
                            <StatCard
                                label="Avg Transaction"
                                value={formatUsd(billingTotals.avgTransaction)}
                                icon={<Receipt size={16} />}
                                tone="blue"
                            />
                            <StatCard
                                label="Pending"
                                value={formatUsd(billingTotals.pendingAmount, { compact: true })}
                                icon={<Clock3 size={16} />}
                                tone="amber"
                            />
                            <StatCard
                                label="Failed Rate"
                                value={`${billingTotals.failedRate.toFixed(1)}%`}
                                icon={<AlertTriangle size={16} />}
                                tone="slate"
                                share={billingTotals.failedRate / 100}
                                shareLabel={`${formatUsd(billingTotals.failedAmount, { compact: true })} failed`}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <ChartCard
                                title="Revenue Over Time"
                                subtitle="Net paid revenue per month (last 12 months)"
                                icon={<TrendingUp size={14} />}
                                className="lg:col-span-2"
                            >
                                <ResponsiveContainer width="100%" height={280}>
                                    <AreaChart
                                        data={monthlyRevenue}
                                        margin={{ top: 8, right: 12, left: -10, bottom: 8 }}
                                    >
                                        <defs>
                                            <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickFormatter={(v) => formatUsd(v, { compact: true })}
                                        />
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 12,
                                            }}
                                            formatter={(value: number | undefined) => [formatUsd(value ?? 0), "Revenue"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            stroke="#0ea5e9"
                                            strokeWidth={2}
                                            fill="url(#revGradient)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard
                                title="Transaction Status"
                                subtitle="Distribution across all transactions"
                            >
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={txStatusData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={60}
                                            outerRadius={95}
                                            paddingAngle={2}
                                            stroke="none"
                                        >
                                            {txStatusData.map((d) => (
                                                <Cell key={d.name} fill={d.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 12,
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={28}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">All transactions</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {billingTotals.totalTransactions} records ·{" "}
                                        <span className="font-semibold text-emerald-600">
                                            {formatUsd(billingTotals.paidRevenue, { compact: true })}
                                        </span>{" "}
                                        paid
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">Sorted newest first</div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <Th>Invoice</Th>
                                            <Th>Date</Th>
                                            <Th>Service Profile</Th>
                                            <Th>Type</Th>
                                            <Th>Method</Th>
                                            <Th>Status</Th>
                                            <Th>Amount</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {txSlice.map((tx) => (
                                            <tr
                                                key={tx.id}
                                                className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                            >
                                                <Td>
                                                    <div className="font-mono text-xs text-slate-700">
                                                        {tx.invoiceNumber}
                                                    </div>
                                                </Td>
                                                <Td className="text-slate-600 whitespace-nowrap">
                                                    {new Date(tx.date).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </Td>
                                                <Td>
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className={cn(
                                                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                                                TIER_BADGE[tx.tier],
                                                            )}
                                                        >
                                                            {tx.tier}
                                                        </span>
                                                        <span className="text-slate-900 font-medium truncate">
                                                            {tx.serviceProfileName}
                                                        </span>
                                                    </div>
                                                </Td>
                                                <Td className="text-slate-600">{tx.type}</Td>
                                                <Td>
                                                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                                                        <CreditCard size={12} className="text-slate-400" />
                                                        {tx.method}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
                                                            TX_STATUS_BADGE[tx.status],
                                                        )}
                                                    >
                                                        {tx.status}
                                                    </span>
                                                </Td>
                                                <Td>
                                                    <span
                                                        className={cn(
                                                            "font-semibold tabular-nums",
                                                            tx.amount < 0
                                                                ? "text-slate-500"
                                                                : tx.status === "Paid"
                                                                  ? "text-slate-900"
                                                                  : "text-slate-600",
                                                        )}
                                                    >
                                                        {formatUsd(tx.amount)}
                                                    </span>
                                                </Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                totalItems={txTotal}
                                currentPage={txPage}
                                rowsPerPage={txRowsPerPage}
                                onPageChange={setTxPage}
                                onRowsPerPageChange={(rows) => {
                                    setTxRowsPerPage(rows);
                                    setTxPage(1);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ───────────────── Subscriptions ───────────────── */}
                {activeTab === "subscriptions" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="MRR"
                                value={formatUsd(billingTotals.mrr)}
                                icon={<Repeat size={16} />}
                                tone="emerald"
                                share={1}
                                shareLabel="Monthly recurring revenue"
                            />
                            <StatCard
                                label="ARR"
                                value={formatUsd(billingTotals.arr, { compact: true })}
                                icon={<TrendingUp size={16} />}
                                tone="blue"
                            />
                            <StatCard
                                label="Active Subs"
                                value={billingTotals.activeSubs}
                                icon={<CreditCard size={16} />}
                                tone="violet"
                                share={billingTotals.activeSubs / Math.max(SUBSCRIPTIONS.length, 1)}
                                shareLabel={`of ${SUBSCRIPTIONS.length} total`}
                            />
                            <StatCard
                                label="Past Due"
                                value={billingTotals.pastDueSubs}
                                icon={<AlertTriangle size={16} />}
                                tone="amber"
                                share={billingTotals.pastDueSubs / Math.max(SUBSCRIPTIONS.length, 1)}
                                shareLabel={`${billingTotals.trialSubs} on trial`}
                            />
                        </div>

                        {/* Tier breakdown cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {subTierData.map((row) => {
                                const cfg = TIER_CONFIG[row.tier];
                                return (
                                    <div
                                        key={row.tier}
                                        className="relative rounded-xl bg-white border border-slate-200 shadow-sm p-5 overflow-hidden"
                                    >
                                        <div
                                            className="absolute inset-x-0 top-0 h-1"
                                            style={{ background: cfg.color }}
                                        />
                                        <div className="flex items-center justify-between">
                                            <div className="inline-flex items-center gap-2">
                                                {row.tier === "Enterprise" ? (
                                                    <Crown size={16} style={{ color: cfg.color }} />
                                                ) : row.tier === "Pro" ? (
                                                    <Sparkles size={16} style={{ color: cfg.color }} />
                                                ) : (
                                                    <CircleDot size={16} style={{ color: cfg.color }} />
                                                )}
                                                <span
                                                    className="text-sm font-semibold"
                                                    style={{ color: cfg.color }}
                                                >
                                                    {row.tier}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono">
                                                {formatUsd(cfg.monthlyPrice)}/mo
                                            </div>
                                        </div>
                                        <div className="mt-3 flex items-baseline gap-2">
                                            <div className="text-3xl font-semibold text-slate-900 tabular-nums tracking-tight">
                                                {row.count}
                                            </div>
                                            <div className="text-xs text-slate-500">subscriptions</div>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-500">
                                            <span className="font-semibold text-slate-700 tabular-nums">
                                                {formatUsd(row.mrr)}
                                            </span>{" "}
                                            MRR
                                        </div>
                                        <div className="mt-3 text-[11px] text-slate-500">{cfg.blurb}</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <ChartCard
                                title="MRR by Tier"
                                subtitle="Monthly recurring revenue contribution per plan"
                                icon={<DollarSign size={14} />}
                                className="lg:col-span-2"
                            >
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart
                                        data={subTierData}
                                        margin={{ top: 8, right: 12, left: -10, bottom: 8 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                        <XAxis dataKey="tier" stroke="#64748b" fontSize={12} />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={12}
                                            tickFormatter={(v) => formatUsd(v, { compact: true })}
                                        />
                                        <RechartsTooltip
                                            cursor={{ fill: "#f1f5f9" }}
                                            contentStyle={{
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 12,
                                            }}
                                            formatter={(value: number | undefined, name: string | undefined) =>
                                                name === "mrr" ? [formatUsd(value ?? 0), "MRR"] : [value ?? 0, name ?? ""]
                                            }
                                        />
                                        <Bar dataKey="mrr" radius={[8, 8, 0, 0]}>
                                            {subTierData.map((d) => (
                                                <Cell key={d.tier} fill={d.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title="Subscription Status" subtitle="By lifecycle state">
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={subStatusData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            stroke="none"
                                        >
                                            {subStatusData.map((d) => (
                                                <Cell key={d.name} fill={d.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{
                                                borderRadius: 8,
                                                border: "1px solid #e2e8f0",
                                                fontSize: 12,
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={28}
                                            iconType="circle"
                                            wrapperStyle={{ fontSize: 12 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">All subscriptions</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {SUBSCRIPTIONS.length} total · one per service profile
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500">
                                    <span className="font-semibold text-emerald-600 tabular-nums">
                                        {billingTotals.activeSubs}
                                    </span>{" "}
                                    active ·{" "}
                                    <span className="font-semibold text-amber-600 tabular-nums">
                                        {billingTotals.pastDueSubs}
                                    </span>{" "}
                                    past due
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50/80">
                                        <tr>
                                            <Th>Service Profile</Th>
                                            <Th>Tier</Th>
                                            <Th>Seats</Th>
                                            <Th>Monthly</Th>
                                            <Th>Started</Th>
                                            <Th>Next Bill</Th>
                                            <Th>Status</Th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {subSlice.map((sub) => (
                                            <tr
                                                key={sub.id}
                                                className="border-t border-slate-100 hover:bg-slate-50/70 transition-colors"
                                            >
                                                <Td>
                                                    <div className="font-medium text-slate-900">
                                                        {sub.serviceProfileName}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono">
                                                        {sub.id}
                                                    </div>
                                                </Td>
                                                <Td>
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold",
                                                            TIER_BADGE[sub.tier],
                                                        )}
                                                    >
                                                        {sub.tier === "Enterprise" && (
                                                            <Crown size={11} className="mr-1" />
                                                        )}
                                                        {sub.tier}
                                                    </span>
                                                </Td>
                                                <Td className="text-slate-600 tabular-nums">{sub.seats}</Td>
                                                <Td className="font-semibold tabular-nums text-slate-900">
                                                    {formatUsd(sub.monthlyAmount)}
                                                </Td>
                                                <Td className="text-slate-600 whitespace-nowrap">
                                                    {new Date(sub.startDate).toLocaleDateString(undefined, {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </Td>
                                                <Td className="text-slate-600 whitespace-nowrap">
                                                    {sub.status === "Cancelled" ? (
                                                        <span className="text-slate-400">—</span>
                                                    ) : (
                                                        new Date(sub.nextBillingDate).toLocaleDateString(undefined, {
                                                            month: "short",
                                                            day: "numeric",
                                                            year: "numeric",
                                                        })
                                                    )}
                                                </Td>
                                                <Td>
                                                    <span
                                                        className={cn(
                                                            "inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-medium",
                                                            SUB_STATUS_BADGE[sub.status],
                                                        )}
                                                    >
                                                        {sub.status}
                                                    </span>
                                                </Td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <PaginationBar
                                totalItems={subTotal}
                                currentPage={subPage}
                                rowsPerPage={subRowsPerPage}
                                onPageChange={setSubPage}
                                onRowsPerPageChange={(rows) => {
                                    setSubRowsPerPage(rows);
                                    setSubPage(1);
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* ───────────────── System ───────────────── */}
                {activeTab === "system" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                                <Server size={16} className="text-slate-500" />
                                <div className="text-sm font-semibold text-slate-900">Runtime</div>
                                <div className="ml-auto">
                                    <span
                                        className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold uppercase tracking-wider",
                                            systemInfo.isProd
                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                : "bg-amber-50 text-amber-700 border-amber-200",
                                        )}
                                    >
                                        {systemInfo.mode}
                                    </span>
                                </div>
                            </div>
                            <dl className="divide-y divide-slate-100">
                                <SystemRow
                                    label="Environment"
                                    value={
                                        systemInfo.isDev
                                            ? "Development (Vite dev server)"
                                            : systemInfo.isProd
                                              ? "Production"
                                              : "Unknown"
                                    }
                                />
                                <SystemRow label="Base URL" value={systemInfo.base || "/"} />
                                <SystemRow label="Browser language" value={systemInfo.language} />
                                <SystemRow label="Platform" value={systemInfo.platform} />
                                <SystemRow
                                    label="Platform time"
                                    value={now.toLocaleString(undefined, {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                    })}
                                />
                                <SystemRow
                                    label="Session uptime"
                                    value={formatDuration(sessionUptimeMs)}
                                    mono
                                />
                            </dl>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="px-5 py-4 border-b border-slate-200">
                                <div className="text-sm font-semibold text-slate-900">Data sources</div>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    Mock-data inventory backing this dashboard.
                                </div>
                            </div>
                            <dl className="divide-y divide-slate-100">
                                <SystemRow
                                    label="APP_USERS records"
                                    value={`${APP_USERS.length}`}
                                    mono
                                />
                                <SystemRow
                                    label="ACCOUNTS_DB records"
                                    value={`${ACCOUNTS_DB.length}`}
                                    mono
                                />
                                <SystemRow
                                    label="SERVICE_PROFILES_DB records"
                                    value={`${SERVICE_PROFILES_DB.length}`}
                                    mono
                                />
                                <SystemRow
                                    label="SUBSCRIPTIONS records"
                                    value={`${SUBSCRIPTIONS.length}`}
                                    mono
                                />
                                <SystemRow
                                    label="TRANSACTIONS records"
                                    value={`${TRANSACTIONS.length}`}
                                    mono
                                />
                                <SystemRow
                                    label="Persistence"
                                    value="In-memory + localStorage (no backend)"
                                />
                                <SystemRow
                                    label="Email endpoint"
                                    value="POST /api/send-vendor-email (Resend)"
                                />
                            </dl>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ───────────────────────── Helpers ─────────────────────────

function StatusPill({
    children,
    icon,
    tone = "slate",
}: {
    children: React.ReactNode;
    icon?: React.ReactNode;
    tone?: "emerald" | "violet" | "slate" | "amber";
}) {
    const map: Record<string, string> = {
        emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
        violet: "bg-violet-500/10 text-violet-300 border-violet-400/30",
        slate: "bg-white/5 text-slate-300 border-white/15",
        amber: "bg-amber-500/10 text-amber-300 border-amber-400/30",
    };
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium backdrop-blur-sm",
                map[tone],
            )}
        >
            {icon ? <span className="opacity-80">{icon}</span> : null}
            {children}
        </span>
    );
}

function HeroKpi({
    label,
    value,
    sub,
    color,
    segments,
    pulse,
}: {
    label: string;
    value: number | string;
    sub?: string;
    color: string;
    segments?: { value: number; color: string }[];
    pulse?: boolean;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur px-5 py-4 relative overflow-hidden">
            <div
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            />
            <div className="flex items-start justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    {label}
                </div>
                {pulse && (
                    <span className="relative flex h-2 w-2 mt-1">
                        <span
                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                            style={{ background: color }}
                        />
                        <span
                            className="relative inline-flex h-2 w-2 rounded-full"
                            style={{ background: color }}
                        />
                    </span>
                )}
            </div>
            <div className="text-3xl font-semibold text-white mt-1.5 tabular-nums tracking-tight">
                {value}
            </div>
            {segments && segments.length > 0 ? (
                <div className="mt-3">
                    <SegmentBar segments={segments} compact />
                </div>
            ) : null}
            {sub ? <div className="text-xs text-slate-300/80 mt-2">{sub}</div> : null}
        </div>
    );
}

type StatTone = "slate" | "blue" | "violet" | "emerald" | "amber";

const STAT_TONES: Record<StatTone, { iconBg: string; iconFg: string; bar: string }> = {
    slate: { iconBg: "bg-slate-100", iconFg: "text-slate-600", bar: "bg-slate-500" },
    blue: { iconBg: "bg-blue-50", iconFg: "text-blue-600", bar: "bg-blue-500" },
    violet: { iconBg: "bg-violet-50", iconFg: "text-violet-600", bar: "bg-violet-500" },
    emerald: { iconBg: "bg-emerald-50", iconFg: "text-emerald-600", bar: "bg-emerald-500" },
    amber: { iconBg: "bg-amber-50", iconFg: "text-amber-600", bar: "bg-amber-500" },
};

function StatCard({
    label,
    value,
    icon,
    tone = "slate",
    share,
    shareLabel,
}: {
    label: string;
    value: number | string;
    icon?: React.ReactNode;
    tone?: StatTone;
    share?: number;
    shareLabel?: string;
}) {
    const t = STAT_TONES[tone];
    const pct = share != null ? Math.max(0, Math.min(1, share)) * 100 : null;
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {label}
                </div>
                {icon ? (
                    <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", t.iconBg, t.iconFg)}>
                        {icon}
                    </div>
                ) : null}
            </div>
            <div className="text-3xl font-semibold text-slate-900 mt-2 tabular-nums tracking-tight">
                {value}
            </div>
            {pct != null ? (
                <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-[width] duration-500", t.bar)}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    {shareLabel ? (
                        <div className="text-[11px] text-slate-500 mt-1.5">
                            <span className="font-semibold text-slate-700 tabular-nums">
                                {pct.toFixed(0)}%
                            </span>{" "}
                            {shareLabel}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function SegmentBar({
    segments,
    width = 100,
    compact,
}: {
    segments: { value: number; color: string }[];
    width?: number;
    compact?: boolean;
}) {
    const total = segments.reduce((s, x) => s + x.value, 0);
    if (total === 0) {
        return (
            <div
                className={cn("rounded-full bg-slate-100", compact ? "h-1" : "h-1.5")}
                style={{ width: `${width}%` }}
            />
        );
    }
    return (
        <div
            className={cn(
                "flex rounded-full overflow-hidden bg-slate-100",
                compact ? "h-1" : "h-1.5",
            )}
            style={{ width: `${width}%` }}
        >
            {segments.map((s, i) => {
                const pct = (s.value / total) * 100;
                if (pct === 0) return null;
                return (
                    <div
                        key={i}
                        style={{ width: `${pct}%`, background: s.color }}
                        className="h-full"
                    />
                );
            })}
        </div>
    );
}

function AvatarStack({
    users,
    currentId,
    max = 8,
}: {
    users: AppUser[];
    currentId: string;
    max?: number;
}) {
    const ordered = [...users].sort((a, b) => {
        if (a.id === currentId) return -1;
        if (b.id === currentId) return 1;
        const roleOrder: Record<string, number> = { "super-admin": 0, admin: 1, user: 2 };
        if (a.role !== b.role) return roleOrder[a.role] - roleOrder[b.role];
        return a.name.localeCompare(b.name);
    });
    const shown = ordered.slice(0, max);
    const remainder = Math.max(0, ordered.length - shown.length);

    return (
        <div className="flex items-center">
            <div className="flex -space-x-2">
                {shown.map((u) => (
                    <div
                        key={u.id}
                        className={cn(
                            "relative w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-[11px] font-semibold ring-2 ring-white",
                            u.avatarGradient,
                        )}
                        title={`${u.name} · ${ROLE_LABELS[u.role]}`}
                    >
                        {u.initials}
                        {u.id === currentId && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        )}
                    </div>
                ))}
                {remainder > 0 && (
                    <div className="w-9 h-9 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center text-[11px] font-semibold text-slate-600">
                        +{remainder}
                    </div>
                )}
            </div>
            <div className="ml-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700 tabular-nums">{users.length}</span>{" "}
                active accounts
            </div>
        </div>
    );
}

function ChartCard({
    title,
    subtitle,
    children,
    icon,
    className,
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "bg-white border border-slate-200 rounded-xl shadow-sm",
                className,
            )}
        >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                {icon ? <span className="text-slate-500">{icon}</span> : null}
                <div>
                    <div className="text-sm font-semibold text-slate-900">{title}</div>
                    {subtitle ? (
                        <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
                    ) : null}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function Th({ children }: { children: React.ReactNode }) {
    return (
        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] whitespace-nowrap">
            {children}
        </th>
    );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
    return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

function SystemRow({
    label,
    value,
    mono,
}: {
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-6 px-5 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                {label}
            </dt>
            <dd
                className={cn(
                    "text-sm text-slate-900 truncate text-right",
                    mono && "font-mono tabular-nums",
                )}
                title={value}
            >
                {value}
            </dd>
        </div>
    );
}
