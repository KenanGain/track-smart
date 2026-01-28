import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_NODES } from "@/data/sidebar.data";
import { isGroup, type SidebarNode } from "@/types/sidebar";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type AppSidebarProps = {
    currentPath: string;
    onNavigate: (path: string) => void;
    className?: string;
};

export function AppSidebar({ currentPath, onNavigate, className }: AppSidebarProps) {
    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const n of SIDEBAR_NODES) {
            if (isGroup(n)) initial[n.key] = !!n.defaultOpen;
        }
        return initial;
    });

    const toggleGroup = (key: string) => {
        setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <aside
            className={cn(
                "h-screen w-[260px] border-r border-slate-200 bg-white",
                "flex flex-col",
                className
            )}
        >
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">TrackSmart</h2>
            </div>

            <ScrollArea className="flex-1">
                <div className="px-3 py-4">
                    <nav className="space-y-1">
                        {SIDEBAR_NODES.map((node) => (
                            <SidebarNodeView
                                key={node.key}
                                node={node}
                                currentPath={currentPath}
                                open={isGroup(node) ? !!openGroups[node.key] : undefined}
                                onToggle={isGroup(node) ? () => toggleGroup(node.key) : undefined}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </nav>
                </div>
            </ScrollArea>

            <div className="p-3 border-t border-slate-200">
                <div className="text-xs text-slate-500">
                    Version 1.0.0
                </div>
            </div>
        </aside>
    );
}

function SidebarNodeView(props: {
    node: SidebarNode;
    currentPath: string;
    onNavigate: (path: string) => void;
    open?: boolean;
    onToggle?: () => void;
}) {
    const { node, currentPath, onNavigate, open, onToggle } = props;

    if (!isGroup(node)) {
        return (
            <LeafItem
                label={node.label}
                Icon={node.icon}
                active={node.path ? isActive(currentPath, node.path) : false}
                onClick={() => node.path && onNavigate(node.path)}
            />
        );
    }

    const groupActive = node.children.some((c) => c.path && isActive(currentPath, c.path));

    return (
        <div className={cn("space-y-1", open && groupActive && "bg-indigo-50/50 rounded-lg p-1")}>
            <Button
                type="button"
                variant="ghost"
                onClick={onToggle}
                className={cn(
                    "w-full justify-between rounded-md px-3 py-2 h-auto",
                    "hover:bg-indigo-50/70",
                    open && groupActive && "bg-indigo-50/70",
                    !open && groupActive && "border-2 border-slate-800"
                )}
            >
                <div className="flex items-center gap-2.5">
                    {node.icon ? (
                        <node.icon className={cn(
                            "h-[18px] w-[18px]",
                            open && groupActive ? "text-blue-600" : "text-slate-600"
                        )} />
                    ) : null}
                    <span className={cn(
                        "text-sm font-medium",
                        open && groupActive ? "text-blue-600" : "text-slate-800"
                    )}>{node.label}</span>
                </div>
                <ChevronDown
                    className={cn(
                        "h-4 w-4 transition-transform",
                        open && groupActive ? "text-blue-600" : "text-slate-500",
                        open ? "rotate-180" : "rotate-0"
                    )}
                />
            </Button>

            {open ? (
                <div className="pl-0 space-y-0.5">
                    {node.children.map((child) => (
                        <LeafItem
                            key={child.key}
                            label={child.label}
                            Icon={child.icon}
                            active={child.path ? isActive(currentPath, child.path) : false}
                            onClick={() => child.path && onNavigate(child.path)}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function LeafItem(props: {
    label: string;
    Icon?: React.ComponentType<{ className?: string }>;
    active: boolean;
    onClick: () => void;
}) {
    const { label, Icon, active, onClick } = props;

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-left",
                "hover:bg-indigo-50/70 transition-colors group",
                active && "bg-indigo-50/80 border-l-[3px] border-blue-600 pl-[9px]"
            )}
        >
            {Icon ? (
                <Icon
                    className={cn(
                        "h-[18px] w-[18px] flex-shrink-0",
                        active ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                    )}
                />
            ) : null}
            <span
                className={cn(
                    "text-sm",
                    active ? "font-medium text-blue-600" : "text-slate-700 font-normal group-hover:text-slate-900"
                )}
            >
                {label}
            </span>
        </button>
    );
}

function isActive(currentPath: string, itemPath: string) {
    // strict match OR "startsWith" to keep parent pages highlighted
    // Simple normalization 
    return currentPath === itemPath || currentPath.startsWith(itemPath + "/");
}
