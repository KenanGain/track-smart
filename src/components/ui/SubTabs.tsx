import * as React from "react";
import { cn } from "@/lib/utils";
import { TabScroller } from "@/components/ui/TabScroller";

export type SubTab<T extends string = string> = {
    id: T;
    label: string;
    icon?: React.ElementType;
    count?: number;
};

type SubTabsProps<T extends string> = {
    tabs: SubTab<T>[];
    activeId: T;
    onChange: (id: T) => void;
    className?: string;
    /** Show a slim divider line under the bar (default: true). Ignored for the segmented variant. */
    bordered?: boolean;
    /** Container size — sm: tighter padding, md: default. */
    size?: "sm" | "md";
    /** Distribute tabs evenly to fill the full bar width instead of scrolling (default: false). */
    fill?: boolean;
    /** Visual style: 'underline' (default) or 'segmented' (white active pill on a slate track). */
    variant?: "underline" | "segmented";
};

/**
 * Standard secondary-tab bar used inside parent tabs and inside settings pages.
 * - underline (default): blue-600 active underline, slate-500 inactive.
 * - segmented: white active pill on a slate-100 track (icon + count badge).
 */
export function SubTabs<T extends string>({
    tabs,
    activeId,
    onChange,
    className,
    bordered = true,
    size = "md",
    fill = false,
    variant = "underline",
}: SubTabsProps<T>) {
    const segmented = variant === "segmented";
    return (
        <div
            className={cn(
                !segmented && bordered && "border-b border-slate-200",
                segmented && "rounded-xl border border-slate-200 bg-slate-100 p-1",
                className
            )}
        >
            <TabRow segmented={segmented} fill={fill} activeKey={String(activeId)}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeId === tab.id;
                    const padding = segmented ? (size === "sm" ? "px-3 py-1.5" : "px-3.5 py-2") : (size === "sm" ? "px-3 py-2.5" : "px-4 py-3");
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChange(tab.id)}
                            className={cn(
                                "relative text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-2",
                                padding,
                                fill && "flex-1 justify-center",
                                segmented
                                    ? active
                                        ? "rounded-lg bg-white text-slate-900 font-semibold shadow-sm"
                                        : "rounded-lg text-slate-500 hover:bg-white/60 hover:text-slate-800"
                                    : cn(
                                        "border-b-2",
                                        active
                                            ? "text-blue-600 border-blue-600"
                                            : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300"
                                    )
                            )}
                            aria-current={active ? "page" : undefined}
                            data-tab-active={active || undefined}
                        >
                            {Icon && <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />}
                            <span>{tab.label}</span>
                            {typeof tab.count === "number" && tab.count > 0 && (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold",
                                        active ? "bg-blue-100 text-blue-700" : cn(segmented ? "bg-slate-200" : "bg-slate-100", "text-slate-600")
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </TabRow>
        </div>
    );
}

/**
 * The tab row itself. When the bar can scroll it is wrapped in TabScroller, which
 * hides the scrollbar and adds the left/right chevrons; `fill` bars can't scroll
 * (the tabs share the width), so they stay a plain flex row.
 */
function TabRow({ segmented, fill, activeKey, children }: {
    segmented: boolean; fill: boolean; activeKey: string; children: React.ReactNode;
}) {
    if (fill) {
        return <div className={cn("flex w-full items-center gap-1", !segmented && "-mb-px")}>{children}</div>;
    }
    return (
        <TabScroller activeKey={activeKey} navClassName={cn("gap-1", !segmented && "-mb-px")}>
            {children}
        </TabScroller>
    );
}
