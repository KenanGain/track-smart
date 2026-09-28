// ─────────────────────────────────────────────────────────────────────────────
// One back button, that knows where you came from.
//
// The pages wrote their own, each with a hard-coded destination, so "Back to
// Assets" appeared on a truck you had opened from a compliance alert. This one
// asks the navigation trail and falls back to the page's own parent only when
// there is nothing to go back to — a reload, or a link somebody sent you.
// ─────────────────────────────────────────────────────────────────────────────

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { backTarget, backLabel, type BackTarget } from "@/lib/nav-history";

export function useBackTarget(fallback: string, fallbackLabel?: string): BackTarget {
    // Read at render rather than memoised: the trail is module state, and a page that
    // memoised it on mount would keep showing the route it was opened by after the user
    // had navigated within it.
    return backTarget(fallback, fallbackLabel);
}

export function BackLink({ fallback, fallbackLabel, onNavigate, className, size = "sm" }: {
    /** Where this page belongs when there is no trail to unwind. */
    fallback: string;
    fallbackLabel?: string;
    onNavigate: (path: string) => void;
    className?: string;
    size?: "sm" | "md";
}) {
    const target = useBackTarget(fallback, fallbackLabel);
    return (
        <button
            type="button"
            onClick={() => onNavigate(target.path)}
            className={cn(
                "inline-flex items-center gap-1.5 font-semibold text-slate-500 transition-colors hover:text-blue-600",
                size === "md" ? "text-sm" : "text-xs",
                className,
            )}
        >
            <ChevronLeft size={size === "md" ? 16 : 14} /> {backLabel(target)}
        </button>
    );
}
