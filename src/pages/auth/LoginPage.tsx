import { useEffect, useMemo, useRef, useState } from "react";
import { Truck, Mail, Lock, Eye, EyeOff, LogIn, ChevronDown, AlertCircle, Search, Check, X } from "lucide-react";
import {
    APP_USERS,
    DEMO_PASSWORD,
    ROLE_LABELS,
    findUserByEmail,
    type AppUser,
} from "@/data/users.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import { cn } from "@/lib/utils";

type Props = {
    onSignIn: (user: AppUser) => void;
};

const ROLE_ORDER: Record<string, number> = { "super-admin": 0, "admin": 1, "user": 2 };

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

        for (const sp of SERVICE_PROFILES_DB) {
            const users = APP_USERS
                .filter((u) => u.serviceProfileId === sp.id && matches(u))
                .sort((a, b) => {
                    const r = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
                    if (r !== 0) return r;
                    return a.name.localeCompare(b.name);
                });
            if (users.length === 0) continue;
            out.push({ label: sp.dbaName ?? sp.legalName, users });
        }
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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const u = findUserByEmail(email);
        if (!u) {
            setError("No account found with that email.");
            return;
        }
        if (password !== DEMO_PASSWORD) {
            setError("Incorrect password. (Demo password is 'demo1234'.)");
            return;
        }
        setError(null);
        onSignIn(u);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md">
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
                </div>

                <p className="text-center text-xs text-slate-400 mt-5">
                    Prototype build · No real authentication is performed.
                </p>
            </div>
        </div>
    );
}
