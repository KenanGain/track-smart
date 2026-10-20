import { useEffect, useState } from "react";
import { CheckCircle2, Lock, PanelLeft, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TableGroupBand } from "@/components/ui/ListChrome";
import { TH_ROW_CLS } from "@/components/ui/list-chrome";
import { ROLE_BADGE, ROLE_LABELS, ROLE_ORDER, type AppUser, type UserRole } from "@/data/users.data";
import {
    ACCESS_CYCLE, ACCESS_META, LEVEL_META, MENU_GROUPS, MENU_ROWS, ROLE_META, isAccessChanged, resetRoleAccess,
    setRoleAccess, useRoleAccess,
} from "./roles.data";

// The pieces both Users & Roles pages are built from — the service profile's (every role) and
// a carrier's (its four) — so a role, a status or the access table reads the same on each.

export const STATUS_META: Record<AppUser["status"], { dot: string; text: string }> = {
    Active: { dot: "bg-emerald-500", text: "text-emerald-700" },
    Invited: { dot: "bg-amber-500", text: "text-amber-700" },
    Inactive: { dot: "bg-slate-300", text: "text-slate-500" },
};

export const KPI_ACCENT: Partial<Record<UserRole, string>> = {
    admin: "blue", "fleet-admin": "sky", "safety-manager": "amber", driver: "emerald", user: "slate",
};

/** The roles a service profile holds, in the order its lists and filters show them. */
export const PROFILE_ROLES: UserRole[] = ROLE_ORDER.filter((r) => r !== "super-admin");

export function Avatar({ u, size = "md" }: { u: AppUser; size?: "sm" | "md" }) {
    return (
        <span title={u.name} className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white",
            u.avatarGradient, size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs", u.status === "Inactive" && "opacity-50 grayscale")}>
            {u.initials}
        </span>
    );
}

export function RoleBadge({ role }: { role: UserRole }) {
    const m = ROLE_META[role];
    return (
        <span className={cn("inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold", ROLE_BADGE[role])}>
            <m.Icon className="h-3 w-3 shrink-0" /> <span className="truncate">{m.label}</span>
        </span>
    );
}

/** A user's status — or, with `label`, a carrier's, drawn in the user status it most resembles. */
export function StatusDot({ status, label }: { status: AppUser["status"]; label?: string }) {
    const m = STATUS_META[status];
    return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-[12px] font-semibold", m.text)}><span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />{label ?? status}</span>;
}

/** One card per role: what it is for, who gives it, how many hold it here. */
export function RoleCardsGrid({ roles, countOf, countSuffix, showLevel = true }: {
    roles: UserRole[]; countOf: (r: UserRole) => number; countSuffix: (r: UserRole) => string;
    /** The level tag on each card — off where every card is on the same level. */
    showLevel?: boolean;
}) {
    return (
        // Four cards go two-by-two until the row is really wide: four across at 1280 left the
        // remit wrapping onto five lines and "Given by" cut to three letters.
        <section className={cn("grid gap-3 sm:grid-cols-2", roles.length > 4 ? "xl:grid-cols-3" : "2xl:grid-cols-4")}>
            {roles.map((r) => {
                const m = ROLE_META[r];
                return (
                    <div key={r} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", m.chip)}><m.Icon className="h-5 w-5" /></span>
                            <div className="min-w-0 flex-1">
                                <p className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">{m.label}
                                    {showLevel && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{LEVEL_META[m.level].label}</span>}
                                </p>
                                <p className="mt-1 text-[13px] leading-snug text-slate-600">{m.remit}</p>
                            </div>
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[12px] text-slate-500" style={{ marginTop: 14 }}>
                            <span className="min-w-0 truncate" title={m.grantedBy}>Given by: <span className="font-medium text-slate-600">{m.grantedBy}</span></span>
                            <span className="shrink-0 font-semibold tabular-nums text-slate-700">{countOf(r)} {countSuffix(r)}</span>
                        </div>
                    </div>
                );
            })}
        </section>
    );
}

/**
 * Which sidebar menus each role gets — Full, Light (view only) or Hidden. Only a Super Admin
 * changes it; the sidebar follows it for everyone with that role.
 */
export function AccessMatrix({ roles, editable, note }: { roles: UserRole[]; editable: boolean; note?: string }) {
    const access = useRoleAccess();
    const changed = MENU_ROWS.some((m) => roles.some((r) => isAccessChanged(access, m.id, r)));
    const groups = MENU_GROUPS.filter((g) => MENU_ROWS.some((m) => m.group === g));
    const span = roles.length + 1;

    return (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-2">
                    <PanelLeft className="h-4 w-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-800">Sidebar menus by role</h2>
                    <span className="text-[12px] text-slate-500">· {note ?? (editable ? "Click a cell — the sidebar follows it for everyone with that role" : "Set by TrackSmart")}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {ACCESS_CYCLE.map((a) => (
                        <span key={a} className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span className={cn("inline-flex h-5 min-w-[44px] items-center justify-center rounded px-1.5 text-[10px] font-bold ring-1 ring-inset", ACCESS_META[a].cls)}>{ACCESS_META[a].label}</span>
                            {ACCESS_META[a].hint}
                        </span>
                    ))}
                    {editable && changed && <Button size="sm" variant="outline" onClick={resetRoleAccess}><RotateCcw className="h-3.5 w-3.5" /> Reset to defaults</Button>}
                </div>
            </div>
            {/* Sideways scroll only where the table cannot fit; where it can, there is no scroll box,
                so the role headings can stick to the top of the page as the menus scroll past. */}
            <div className="overflow-x-auto xl:overflow-x-visible">
                <table className="w-full table-fixed text-sm" style={{ minWidth: 340 + roles.length * 104 }}>
                    <thead className="xl:sticky xl:top-0 xl:z-10">
                        <tr className={TH_ROW_CLS}>
                            <th className="px-5 py-2.5">Sidebar menu</th>
                            {roles.map((r) => (
                                <th key={r} className="w-[104px] px-2 py-2.5 text-center">
                                    <span className="inline-flex flex-col items-center gap-1">
                                        {(() => { const I = ROLE_META[r].Icon; return <span className={cn("flex h-6 w-6 items-center justify-center rounded-md", ROLE_META[r].chip)}><I className="h-3.5 w-3.5" /></span>; })()}
                                        <span className="whitespace-nowrap">{ROLE_LABELS[r]}</span>
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {groups.map((g) => {
                            const menus = MENU_ROWS.filter((m) => m.group === g);
                            return [
                                <TableGroupBand key={`band-${g}`} label={g} count={menus.length} colSpan={span} />,
                                ...menus.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/50">
                                        <td className="px-5 py-2.5">
                                            <p className="truncate text-[13px] font-semibold text-slate-800" title={c.label}>{c.label}</p>
                                            <p className="truncate text-[11px] text-slate-500" title={c.hint}>{c.hint}</p>
                                        </td>
                                        {roles.map((r) => {
                                            const a = access[c.id][r];
                                            const locked = !editable || r === "super-admin";
                                            const next = ACCESS_CYCLE[(ACCESS_CYCLE.indexOf(a) + 1) % ACCESS_CYCLE.length];
                                            const moved = isAccessChanged(access, c.id, r);
                                            return (
                                                <td key={r} className="px-2 py-2.5 text-center">
                                                    <button type="button" disabled={locked} onClick={() => setRoleAccess(c.id, r, next)}
                                                        title={r === "super-admin" ? "Super Admin always has every menu" : `${ROLE_LABELS[r]} · ${c.label}: ${ACCESS_META[a].hint}${locked ? "" : ` → click for ${ACCESS_META[next].label}`}${moved ? " (changed from default)" : ""}`}
                                                        className={cn("relative inline-flex h-6 min-w-[52px] items-center justify-center rounded-md px-2 text-[11px] font-bold ring-1 ring-inset transition",
                                                            ACCESS_META[a].cls, !locked && "hover:brightness-95 hover:ring-2", locked && "cursor-default")}>
                                                        {r === "super-admin" ? <Lock className="mr-1 h-2.5 w-2.5" /> : null}
                                                        {ACCESS_META[a].label}
                                                        {moved && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )),
                            ];
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/** A line of confirmation at the bottom corner, gone after four seconds. */
export function useToast() {
    const [toast, setToast] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(t);
    }, [toast]);
    const say = (text: string, tone: "ok" | "warn" = "ok") => setToast({ text, tone });
    const node = toast ? (
        <div role="status" className={cn("fixed bottom-6 right-6 z-[60] flex max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
            toast.tone === "ok" ? "bg-slate-900" : "bg-rose-600")}>
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {toast.text}
        </div>
    ) : null;
    return { say, node };
}
