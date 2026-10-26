import { useState } from "react";
import { Infinity as InfinityIcon, Save, SlidersHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isUnlimitedLimit } from "@/pages/accounts/service-profiles.data";
import { LIMIT_UNLIMITED, type Usage } from "./profile-limits.data";

// The two pieces both configuration pages draw a limit with: a meter in the row, and the
// dialog that changes it.

/** "5 / 10" with a bar that turns amber near the limit and red at it. */
export function UsageMeter({ usage, noun, className }: { usage: Usage; noun: string; className?: string }) {
    if (isUnlimitedLimit(usage.limit)) {
        return (
            <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", className)}>
                <span className="text-sm font-semibold tabular-nums text-slate-900">{usage.used}</span>
                <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[11px] font-bold text-violet-700">
                    <InfinityIcon size={11} /> Unlimited
                </span>
            </div>
        );
    }
    const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 100;
    const full = usage.used >= usage.limit;
    const tone = full ? "bg-rose-500" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
    return (
        <div className={cn("min-w-0", className)}>
            {/* Wraps rather than overflows: in a narrow stat tile the "left" note drops to its own line. */}
            <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">{usage.used} / {usage.limit}</span>
                <span className={cn("whitespace-nowrap text-[11px]", full ? "font-semibold text-rose-600" : "text-slate-500")}>
                    {full ? "limit reached" : `${usage.remaining} ${noun}${usage.remaining === 1 ? "" : "s"} left`}
                </span>
            </div>
            <div className="mt-1 h-1.5 w-full max-w-[9rem] overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

export type LimitField = {
    key: string;
    label: string;
    /** What the number allows, in a line. */
    help: string;
    /** How many are in use — a limit below it is refused. */
    used: number;
    value: number;
};

/** Change one record's limits. Each is a number of at least what is in use, or Unlimited. */
export function LimitsDialog({ title, subtitle, fields, onClose, onSave }: {
    title: string;
    subtitle: string;
    fields: LimitField[];
    onClose: () => void;
    onSave: (values: Record<string, number>) => void;
}) {
    const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
    // The number a field goes back to when Unlimited is unticked.
    const [lastNumber, setLastNumber] = useState<Record<string, number>>(() =>
        Object.fromEntries(fields.map((f) => [f.key, isUnlimitedLimit(f.value) ? Math.max(f.used, 1) : f.value])));
    const [error, setError] = useState<string | null>(null);

    const save = () => {
        for (const f of fields) {
            const v = values[f.key];
            if (isUnlimitedLimit(v)) continue;
            if (!Number.isInteger(v) || v < 1) return setError(`${f.label}: enter a whole number of at least 1, or tick Unlimited.`);
            if (v < f.used) return setError(`${f.label}: ${f.used} are already in use — the limit cannot go below that.`);
        }
        onSave(values);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-lg flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <SlidersHorizontal className="h-4 w-4" />
                        </span>
                        {title}
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">{subtitle}</p>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    {fields.map((f) => {
                        const v = values[f.key];
                        const unlimited = isUnlimitedLimit(v);
                        return (
                            <section key={f.key} className="rounded-lg border border-slate-200 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">{f.label}</p>
                                        <p className="mt-0.5 text-[12px] text-slate-500">{f.help}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-600">{f.used} in use</span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-3">
                                    <Input type="number" min={Math.max(1, f.used)} step={1} disabled={unlimited}
                                        value={unlimited ? "" : v} placeholder={unlimited ? "Unlimited" : undefined}
                                        onChange={(e) => {
                                            const n = e.target.value === "" ? 0 : Math.floor(Number(e.target.value));
                                            setValues((s) => ({ ...s, [f.key]: n }));
                                            setLastNumber((s) => ({ ...s, [f.key]: n }));
                                            setError(null);
                                        }}
                                        className="h-9 w-32 tabular-nums" aria-label={f.label} />
                                    <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                                        <input type="checkbox" checked={unlimited}
                                            onChange={(e) => {
                                                setValues((s) => ({ ...s, [f.key]: e.target.checked ? LIMIT_UNLIMITED : lastNumber[f.key] }));
                                                setError(null);
                                            }}
                                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                        Unlimited
                                    </label>
                                </div>
                            </section>
                        );
                    })}
                    {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">{error}</p>}
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={save}><Save className="h-4 w-4" /> Save limits</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
