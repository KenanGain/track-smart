import * as React from "react";
import { cn } from "@/lib/utils";

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
    /** Show a slim divider line under the bar (default: true). */
    bordered?: boolean;
    /** Container size — sm: tighter padding, md: default. */
    size?: "sm" | "md";
};

/**
 * Standard secondary-tab bar used inside parent tabs and inside settings pages.
 * Underline style: blue-600 active, slate-500 inactive, optional icon and count badge.
 */
export function SubTabs<T extends string>({
    tabs,
    activeId,
    onChange,
    className,
    bordered = true,
    size = "md",
}: SubTabsProps<T>) {
    return (
        <div
            className={cn(
                bordered && "border-b border-slate-200",
                className
            )}
        >
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeId === tab.id;
                    const padding = size === "sm" ? "px-3 py-2.5" : "px-4 py-3";
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onChange(tab.id)}
                            className={cn(
                                "relative text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-2 border-b-2",
                                padding,
                                active
                                    ? "text-blue-600 border-blue-600"
                                    : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300"
                            )}
                            aria-current={active ? "page" : undefined}
                        >
                            {Icon && <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />}
                            <span>{tab.label}</span>
                            {typeof tab.count === "number" && tab.count > 0 && (
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold",
                                        active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                                    )}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
