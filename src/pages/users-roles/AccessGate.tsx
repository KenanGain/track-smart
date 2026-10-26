import { Eye, LayoutDashboard, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type UserRole } from "@/data/users.data";
import { ROLE_META } from "./roles.data";

// ─────────────────────────────────────────────────────────────────────────────
// What the Sidebar menus by role table means once a page is open.
//
// The sidebar leaves a Hidden menu out and marks a Light one with an eye — but a sidebar is
// a menu, not a lock: an old link, a shared record or the Back button can still land a
// person on a page their role does not have. App.tsx asks the same table on the way in and
// renders one of these instead of (or above) the page.
// ─────────────────────────────────────────────────────────────────────────────

/** A page whose menu is Hidden for this role — shown in place of the page. */
export function NoAccessPage({ role, menuLabel, carrier, onNavigate }: {
    role: UserRole; menuLabel: string; carrier?: string; onNavigate: (path: string) => void;
}) {
    const m = ROLE_META[role];
    return (
        <div className="flex min-h-full items-center justify-center bg-slate-50 p-8">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Lock className="h-5 w-5" /></span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">Not in your menu</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                    <b className="text-slate-700">{menuLabel}</b> is not part of what a{m.label === "Admin" ? "n" : ""} <b className="text-slate-700">{m.label}</b>
                    {carrier ? <> on <b className="text-slate-700">{carrier}</b></> : null} can open.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> Access per role is set in Users &amp; Roles ▸ Roles.
                </p>
                <div className="mt-5 flex justify-center">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => onNavigate("/dashboard")}>
                        <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * A page whose menu is Light for this role — a line above the page saying so. Not sticky:
 * the pages keep their own sticky list headers at the top of the same scroller, and two
 * things pinned to the same edge cover each other.
 */
export function ViewOnlyBanner({ role, menuLabel, className }: { role: UserRole; menuLabel: string; className?: string }) {
    const label = ROLE_LABELS[role];
    return (
        <div role="note" className={cn("flex items-center gap-2 border-b border-blue-200 bg-blue-50 px-6 py-1.5 text-[12px] text-blue-800", className)}>
            <Eye className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="min-w-0 truncate">
                <b>View only</b> · {label === "Admin" ? "an" : "a"} {label} can look at {menuLabel} here but not change it.
            </span>
        </div>
    );
}
