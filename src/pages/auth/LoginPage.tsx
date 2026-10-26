import { useEffect, useMemo, useRef, useState } from "react";
import { Truck, Mail, Lock, Eye, EyeOff, LogIn, ChevronDown, AlertCircle, Search, Check, X, ShieldCheck, ArrowRight } from "lucide-react";
import {
    APP_USERS,
    isDriverUser,
    isIndependentDriverUser,
    DEMO_PASSWORD,
    checkPassword,
    ROLE_BADGE,
    ROLE_LABELS,
    findUserByEmail,
    findUserById,
    type AppUser,
} from "@/data/users.data";
import { ROLE_TEST_ACCOUNTS, type RoleTestAccount } from "@/data/role-test-users.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import { cn } from "@/lib/utils";
import { SignUpPage } from "./SignUpPage";
import { UserPlus } from "lucide-react";

type Props = {
    onSignIn: (user: AppUser) => void;
};

const ROLE_ORDER: Record<string, number> = { "super-admin": 0, "admin": 1, "fleet-admin": 2, "safety-manager": 3, "user": 4, "driver": 5 };

export function LoginPage({ onSignIn }: Props) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [signingUp, setSigningUp] = useState(false);

    // Close dropdown on outside click / escape.
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        // Focus search on open.
        const t = setTimeout(() => inputRef.current?.focus(), 0);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
            clearTimeout(t);
        };
    }, [open]);

    // Build sections: Super Admins first, then one section per service profile.
    const sections = useMemo(() => {
        const q = search.trim().toLowerCase();
        const matches = (u: AppUser) =>
            !q ||
            u.name.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            (u.accountName ?? "").toLowerCase().includes(q);

        const out: Array<{ label: string; users: AppUser[] }> = [];

        const supers = APP_USERS
            .filter((u) => u.role === "super-admin" && matches(u))
            .sort((a, b) => a.name.localeCompare(b.name));
        if (supers.length > 0) out.push({ label: "Super Admins", users: supers });

        /*
         * Office staff per service organisation, then drivers.
         *
         * Drivers were listed inside their service profile alongside the admins, so one
         * group held four office users and twenty-two drivers and you scrolled past the
         * whole roster to reach anybody. They are a different kind of seat — the driver app,
         * not the fleet — so they get their own group.
         */
        for (const sp of SERVICE_PROFILES_DB) {
            const users = APP_USERS
                .filter((u) => u.serviceProfileId === sp.id && !isDriverUser(u) && matches(u))
                .sort((a, b) => {
                    const r = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
                    if (r !== 0) return r;
                    return a.name.localeCompare(b.name);
                });
            if (users.length === 0) continue;
            out.push({ label: sp.dbaName ?? sp.legalName, users });
        }

        // Roster drivers, under the carrier whose roster they are on.
        const byCarrier = new Map<string, AppUser[]>();
        for (const u of APP_USERS) {
            if (!isDriverUser(u) || isIndependentDriverUser(u) || !matches(u)) continue;
            const key = u.accountName ?? "Drivers";
            byCarrier.set(key, [...(byCarrier.get(key) ?? []), u]);
        }
        for (const [carrier, users] of byCarrier) {
            out.push({ label: `Drivers — ${carrier}`, users: users.sort((a, b) => a.name.localeCompare(b.name)) });
        }

        /*
         * Drivers who belong to no carrier.
         *
         * Every group above is a service organisation, so an account with no service profile
         * falls through all of them and appears in none — which is every unaffiliated driver,
         * the one seat that cannot be reached by picking a company. Listed last, because they
         * are nobody's employee rather than the first thing anyone is looking for.
         */
        const independents = APP_USERS
            .filter((u) => isIndependentDriverUser(u) && matches(u))
            .sort((a, b) => a.name.localeCompare(b.name));
        if (independents.length > 0) out.push({ label: "Independent drivers — no carrier", users: independents });

        return out;
    }, [search]);

    const selectedUser = useMemo(
        () => APP_USERS.find((u) => u.id === selectedUserId) ?? null,
        [selectedUserId]
    );

    const handlePickUser = (id: string) => {
        setSelectedUserId(id);
        const u = APP_USERS.find((x) => x.id === id);
        if (u) {
            setEmail(u.email);
            setPassword(DEMO_PASSWORD);
            setError(null);
        }
        setOpen(false);
        setSearch("");
    };

    /**
     * Sign somebody in, status permitting. A deactivated account stays out. (An invited one is
     * accepting its invitation by signing in — App's sign-in funnel makes it Active.)
     */
    const signIn = (u: AppUser) => {
        if (u.status === "Inactive") {
            setSelectedUserId(u.id);
            setEmail(u.email);
            setError(`${u.name}'s account is deactivated. An Admin can reactivate it from Users & Roles.`);
            return;
        }
        setError(null);
        onSignIn(u);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const u = findUserByEmail(email);
        if (!u) {
            setError("No account found with that email.");
            return;
        }
        if (!checkPassword(u, password)) {
            setError("Incorrect password. (Seed accounts use 'demo1234'; a signed-up account uses the password it chose.)");
            return;
        }
        signIn(u);
    };

    // One login per access shape (role-test-users.data.ts) — a real account each.
    const testRows = useMemo(
        () => ROLE_TEST_ACCOUNTS.map((t) => ({ t, u: findUserById(t.userId) })).filter((r): r is { t: RoleTestAccount; u: AppUser } => !!r.u),
        [],
    );

    if (signingUp) return <SignUpPage onBack={() => setSigningUp(false)} onSignedUp={(u) => onSignIn(u)} />;

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md lg:max-w-[900px] lg:flex lg:items-start lg:justify-center lg:gap-6">
                <div className="w-full lg:max-w-md lg:shrink-0">
                {/* Brand — minimal, monochrome */}
                <div className="flex flex-col items-center mb-8">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center mb-3">
                        <Truck className="text-white" size={22} />
                    </div>
                    <h1 className="text-xl font-semibold text-slate-900">TrackSmart</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Fleet operations platform</p>
                </div>

                {/* Card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100">
                        <h2 className="text-base font-semibold text-slate-900">Sign in to your account</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pick a demo user or enter credentials manually.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* ── Quick demo login — proper dropdown, no avatars / colors ── */}
                        <div ref={dropdownRef}>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                                Quick demo login
                            </label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setOpen((o) => !o)}
                                    aria-haspopup="listbox"
                                    aria-expanded={open}
                                    className={cn(
                                        "w-full h-10 px-3 rounded-lg border bg-white text-sm transition-colors inline-flex items-center justify-between gap-2 cursor-pointer text-left",
                                        open ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300"
                                    )}
                                >
                                    {selectedUser ? (
                                        <span className="flex-1 min-w-0 truncate text-slate-900">
                                            <span className="font-medium">{selectedUser.name}</span>
                                            <span className="text-slate-400"> · </span>
                                            <span className="text-slate-500">{ROLE_LABELS[selectedUser.role]}</span>
                                            {selectedUser.role !== "super-admin" && selectedUser.accountName && (
                                                <>
                                                    <span className="text-slate-400"> · </span>
                                                    <span className="text-slate-500 truncate">{selectedUser.accountName}</span>
                                                </>
                                            )}
                                        </span>
                                    ) : (
                                        <span className="flex-1 text-slate-400">Select a user…</span>
                                    )}
                                    <ChevronDown
                                        size={14}
                                        className={cn("text-slate-400 transition-transform shrink-0", open && "rotate-180")}
                                    />
                                </button>

                                {open && (
                                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
                                        {/* Search */}
                                        <div className="p-2 border-b border-slate-100">
                                            <div className="relative">
                                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                <input
                                                    ref={inputRef}
                                                    type="text"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    placeholder="Search name, email, carrier…"
                                                    className="w-full h-8 pl-8 pr-7 rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                                                />
                                                {search && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setSearch(""); inputRef.current?.focus(); }}
                                                        aria-label="Clear search"
                                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:bg-slate-100"
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sections */}
                                        <div className="max-h-72 overflow-y-auto py-1" role="listbox">
                                            {sections.length === 0 ? (
                                                <div className="py-8 text-center text-xs text-slate-400">
                                                    No users match "{search}"
                                                </div>
                                            ) : (
                                                sections.map((section) => (
                                                    <div key={section.label}>
                                                        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                                                            {section.label}
                                                        </div>
                                                        {section.users.map((u) => {
                                                            const selected = u.id === selectedUserId;
                                                            return (
                                                                <button
                                                                    key={u.id}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={selected}
                                                                    onClick={() => handlePickUser(u.id)}
                                                                    className={cn(
                                                                        "w-full px-3 py-1.5 flex items-center justify-between gap-3 text-left transition-colors text-sm",
                                                                        selected ? "bg-slate-50" : "hover:bg-slate-50"
                                                                    )}
                                                                >
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className="text-slate-900 font-medium truncate block">{u.name}</span>
                                                                        <span className="text-[11px] text-slate-500 truncate block">
                                                                            {ROLE_LABELS[u.role]}
                                                                            {u.role !== "super-admin" && u.title && (
                                                                                <>
                                                                                    <span className="text-slate-300 mx-1">·</span>
                                                                                    {u.title}
                                                                                </>
                                                                            )}
                                                                        </span>
                                                                    </span>
                                                                    {selected && <Check size={14} className="text-slate-700 shrink-0" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative flex items-center gap-3 my-1">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">or</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Email
                            </label>
                            <div className="relative">
                                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                Demo password: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{DEMO_PASSWORD}</code>
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="w-full h-10 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                        >
                            <LogIn size={15} /> Sign In
                        </button>
                    </form>
                    {/* New here — a driver, an office user, a carrier or a service profile. */}
                    <div className="border-t border-slate-100 bg-slate-50/70 px-6 py-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">New to TrackSmart?</span>
                        <button type="button" onClick={() => setSigningUp(true)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                            <UserPlus size={13} /> Create an account
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-5">
                    Prototype build · No real authentication is performed.
                </p>
                </div>

                {/* ── Sign in as a role — the test accounts, one per access shape ── */}
                <aside className="mt-6 w-full lg:mt-[7.25rem] lg:w-[420px] lg:shrink-0">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><ShieldCheck size={16} /></span>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-slate-900">Sign in as a role</h2>
                                <p className="text-xs text-slate-500 mt-0.5">One real login per access shape. Pick one to see its menus, carriers and alerts.</p>
                            </div>
                        </div>
                        <ul className="max-h-[480px] overflow-y-auto divide-y divide-slate-100" aria-label="Test accounts">
                            {testRows.map(({ t, u }) => (
                                <li key={t.userId}>
                                    <button
                                        type="button"
                                        onClick={() => signIn(u)}
                                        title={`Menus: ${t.menus}\n\nData: ${t.data}\n\nAlerts: ${t.alerts}`}
                                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <span className={cn("inline-flex h-6 w-[7.5rem] shrink-0 items-center justify-center rounded-full border text-[10px] font-bold uppercase tracking-wider", ROLE_BADGE[u.role])}>
                                            {ROLE_LABELS[u.role]}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex min-w-0 items-center gap-1.5">
                                                <span className="text-sm font-medium text-slate-900 truncate">{u.name}</span>
                                                {u.status !== "Active" && (
                                                    <span className={cn("shrink-0 rounded-full px-1.5 text-[10px] font-bold", u.status === "Invited" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500")}>
                                                        {u.status === "Invited" ? "Invited" : "Deactivated"}
                                                    </span>
                                                )}
                                            </span>
                                            <span className="block text-[11px] text-slate-500 truncate">{t.scenario} · {t.where}</span>
                                        </span>
                                        <ArrowRight size={14} className="shrink-0 text-slate-300" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/70 text-[11px] text-slate-500">
                            Hover a row for what to check · defined in <code className="font-mono bg-white px-1 py-0.5 rounded text-slate-600">src/data/role-test-users.data.ts</code>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}
