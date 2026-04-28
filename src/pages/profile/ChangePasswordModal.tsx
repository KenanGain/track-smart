import { useEffect, useMemo, useState } from "react";
import { X, KeyRound, Eye, EyeOff, AlertCircle, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_PASSWORD } from "@/data/users.data";

type Props = {
    open: boolean;
    onClose: () => void;
    onSave: (signOutOthers: boolean) => void;
};

type Strength = {
    score: 0 | 1 | 2 | 3 | 4;
    label: "Too short" | "Weak" | "Fair" | "Good" | "Strong";
    color: string;
    width: string;
};

function evaluateStrength(pw: string): Strength {
    if (pw.length === 0) return { score: 0, label: "Too short", color: "bg-slate-200", width: "0%" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

    if (pw.length < 8) return { score: 0, label: "Too short", color: "bg-red-500", width: "20%" };
    if (clamped <= 1) return { score: 1, label: "Weak", color: "bg-red-500", width: "25%" };
    if (clamped === 2) return { score: 2, label: "Fair", color: "bg-amber-500", width: "50%" };
    if (clamped === 3) return { score: 3, label: "Good", color: "bg-blue-500", width: "75%" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", width: "100%" };
}

export function ChangePasswordModal({ open, onClose, onSave }: Props) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNext, setShowNext] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [signOutOthers, setSignOutOthers] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        setCurrent(""); setNext(""); setConfirm("");
        setShowCurrent(false); setShowNext(false); setShowConfirm(false);
        setSignOutOthers(true);
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    const strength = useMemo(() => evaluateStrength(next), [next]);
    const matches = next.length > 0 && next === confirm;

    const checks = [
        { ok: next.length >= 8, label: "At least 8 characters" },
        { ok: /[A-Z]/.test(next) && /[a-z]/.test(next), label: "Mixed case (Aa)" },
        { ok: /\d/.test(next), label: "At least one number" },
        { ok: /[^A-Za-z0-9]/.test(next), label: "At least one symbol" },
    ];

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!current) { setError("Enter your current password."); return; }
        if (current !== DEMO_PASSWORD) { setError("Current password is incorrect."); return; }
        if (next.length < 8) { setError("New password must be at least 8 characters."); return; }
        if (next === current) { setError("New password must be different from your current password."); return; }
        if (next !== confirm) { setError("The new passwords don't match."); return; }
        onSave(signOutOthers);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <KeyRound size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Use a strong, unique password.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Current */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Current Password <span className="text-red-500">*</span>
                        </label>
                        <PasswordInput
                            value={current}
                            onChange={(v) => { setCurrent(v); setError(null); }}
                            show={showCurrent}
                            onToggle={() => setShowCurrent((s) => !s)}
                            placeholder="Enter your current password"
                            autoComplete="current-password"
                        />
                        <p className="text-[11px] text-slate-400 mt-1.5">
                            Demo: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{DEMO_PASSWORD}</code>
                        </p>
                    </div>

                    {/* New */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            New Password <span className="text-red-500">*</span>
                        </label>
                        <PasswordInput
                            value={next}
                            onChange={(v) => { setNext(v); setError(null); }}
                            show={showNext}
                            onToggle={() => setShowNext((s) => !s)}
                            placeholder="At least 8 characters"
                            autoComplete="new-password"
                        />

                        {/* Strength bar */}
                        <div className="mt-2">
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full transition-all duration-300", strength.color)}
                                    style={{ width: strength.width }}
                                />
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className={cn(
                                    "text-[11px] font-semibold",
                                    strength.score === 0 ? "text-slate-400" :
                                    strength.score <= 1 ? "text-red-600" :
                                    strength.score === 2 ? "text-amber-600" :
                                    strength.score === 3 ? "text-blue-600" :
                                    "text-emerald-600"
                                )}>
                                    {strength.label}
                                </span>
                            </div>
                        </div>

                        {/* Requirements */}
                        <ul className="mt-2 grid grid-cols-2 gap-1.5">
                            {checks.map((c, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-[11px]">
                                    <span className={cn(
                                        "h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0",
                                        c.ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {c.ok ? <Check size={10} strokeWidth={3} /> : <Lock size={8} />}
                                    </span>
                                    <span className={c.ok ? "text-slate-700" : "text-slate-400"}>{c.label}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Confirm */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Confirm New Password <span className="text-red-500">*</span>
                        </label>
                        <PasswordInput
                            value={confirm}
                            onChange={(v) => { setConfirm(v); setError(null); }}
                            show={showConfirm}
                            onToggle={() => setShowConfirm((s) => !s)}
                            placeholder="Re-enter your new password"
                            autoComplete="new-password"
                        />
                        {confirm.length > 0 && (
                            <p className={cn(
                                "text-[11px] mt-1.5 inline-flex items-center gap-1",
                                matches ? "text-emerald-600" : "text-red-600"
                            )}>
                                {matches ? <><Check size={11} strokeWidth={3} /> Passwords match</> : <><AlertCircle size={11} /> Passwords don't match</>}
                            </p>
                        )}
                    </div>

                    {/* Sign out other sessions */}
                    <label className="flex items-start gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/60 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={signOutOthers}
                            onChange={(e) => setSignOutOthers(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-slate-900">Sign out of other sessions</div>
                            <div className="text-xs text-slate-500">
                                Recommended. Other devices will be signed out and asked to log in again.
                            </div>
                        </div>
                    </label>

                    {error && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={!current || !next || !confirm || !matches || strength.score < 2}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2",
                            (!current || !next || !confirm || !matches || strength.score < 2)
                                ? "bg-slate-300 cursor-not-allowed"
                                : "bg-blue-600 hover:bg-blue-700"
                        )}
                    >
                        <KeyRound size={16} /> Update Password
                    </button>
                </div>
            </div>
        </div>
    );
}

function PasswordInput({
    value, onChange, show, onToggle, placeholder, autoComplete,
}: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder?: string;
    autoComplete?: string;
}) {
    return (
        <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
                type={show ? "text" : "password"}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className="w-full h-10 pl-9 pr-10 rounded-md border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label={show ? "Hide password" : "Show password"}
            >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </div>
    );
}
