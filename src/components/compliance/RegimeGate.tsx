// Tiny wrapper that hides / greys out a compliance panel based on the
// carrier's enrollment state.
//
//   hasData === false                 → render nothing (panel hidden)
//   hasData === true, enabled === true  → render children unchanged
//   hasData === true, enabled === false → render children inside a grey
//                                          overlay with a "Not Enrolled"
//                                          badge in the top-right corner
//
// This keeps the existing FMCSA SMS BASIC, Ontario CVOR Performance, and
// NSC Carrier Profile panels byte-identical when active — we only add a
// thin overlay div on top when the user has disabled the regime.

import type { ReactNode } from "react";

type Props = {
    hasData: boolean;
    enabled: boolean;
    /** Optional label for the badge (defaults to "Not Enrolled"). */
    badge?: string;
    children: ReactNode;
};

export function RegimeGate({ hasData, enabled, badge = "Not Enrolled", children }: Props) {
    if (!hasData) return null;
    if (enabled) return <>{children}</>;
    return (
        <div className="relative">
            <div className="opacity-40 grayscale pointer-events-none select-none">
                {children}
            </div>
            <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-300 shadow-sm">
                    {badge}
                </span>
            </div>
        </div>
    );
}
