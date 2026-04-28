import { useMemo, useState } from "react";
import { Truck, Mail, Lock, Eye, EyeOff, LogIn, ChevronDown, AlertCircle } from "lucide-react";
import {
    APP_USERS,
    DEMO_PASSWORD,
    ROLE_BADGE,
    ROLE_LABELS,
    findUserByEmail,
    type AppUser,
} from "@/data/users.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import { cn } from "@/lib/utils";

type Props = {
    onSignIn: (user: AppUser) => void;
};

export function LoginPage({ onSignIn }: Props) {
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Group users for the quick-login dropdown — dynamically by service profile
    const grouped = useMemo(() => {
        const groups: { label: string; users: AppUser[] }[] = [];

        // 1. Super admins (platform-wide)
        const superAdmins = APP_USERS.filter((u) => u.role === "super-admin");
        if (superAdmins.length > 0) {
            groups.push({ label: "Super Admins (platform-wide)", users: superAdmins });
        }

        // 2. One group per service profile
        for (const sp of SERVICE_PROFILES_DB) {
            const users = APP_USERS.filter((u) => u.serviceProfileId === sp.id);
            if (users.length === 0) continue;
            // Sort: admins first, then users by name
            users.sort((a, b) => {
                if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
                return a.name.localeCompare(b.name);
            });
            groups.push({
                label: `${sp.legalName}${sp.dbaName ? ` (${sp.dbaName})` : ""}`,
                users,
            });
        }

        // 3. Orphans — users not tied to any service profile (and not super admin)
        const orphans = APP_USERS.filter(
            (u) => u.role !== "super-admin" && !u.serviceProfileId
        );
        if (orphans.length > 0) {
            groups.push({ label: "Other Users", users: orphans });
        }

        return groups;
    }, []);

    const selectedUser = useMemo(
        () => APP_USERS.find((u) => u.id === selectedUserId) ?? null,
        [selectedUserId]
    );

    const handleSelectUser = (id: string) => {
        setSelectedUserId(id);
        const user = APP_USERS.find((u) => u.id === id);
        if (user) {
            setEmail(user.email);
            setPassword(DEMO_PASSWORD);
            setError(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const user = findUserByEmail(email);
        if (!user) {
            setError("No account found with that email.");
            return;
        }
        if (password !== DEMO_PASSWORD) {
            setError("Incorrect password. (Demo password is 'demo1234'.)");
            return;
        }
        setError(null);
        onSignIn(user);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-4">
            <div className="w-full max-w-md">
                {/* Brand */}
                <div className="flex flex-col items-center mb-8">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200 mb-4">
                        <Truck className="text-white" size={26} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">TrackSmart</h1>
                    <p className="text-sm text-slate-500 mt-1">Fleet operations platform</p>
                </div>

                {/* Card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div className="px-7 py-6 border-b border-slate-100">
                        <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Pick a demo user below or type credentials manually.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-7 space-y-5">
                        {/* Quick login dropdown */}
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                                Quick demo login
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedUserId}
                                    onChange={(e) => handleSelectUser(e.target.value)}
                                    className="w-full appearance-none h-11 pl-3 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors cursor-pointer"
                                >
                                    <option value="">Select a user…</option>
                                    {grouped.map((g) => (
                                        <optgroup key={g.label} label={g.label}>
                                            {g.users.map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name} — {u.title} ({ROLE_LABELS[u.role]})
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                            </div>

                            {selectedUser && (
                                <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold shrink-0",
                                        selectedUser.avatarGradient
                                    )}>
                                        {selectedUser.initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900 truncate">
                                                {selectedUser.name}
                                            </span>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                ROLE_BADGE[selectedUser.role]
                                            )}>
                                                {ROLE_LABELS[selectedUser.role]}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {selectedUser.accountName ?? "Platform-wide access"}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative flex items-center gap-3 my-2">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">or</span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Email
                            </label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                    className="w-full h-11 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full h-11 pl-9 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((s) => !s)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1.5">
                                Demo password: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{DEMO_PASSWORD}</code>
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm transition-colors"
                        >
                            <LogIn size={16} /> Sign In
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    Prototype build · No real authentication is performed.
                </p>
            </div>
        </div>
    );
}
