import { List, Store } from "lucide-react";
import { cn } from "@/lib/utils";

// Inventory section navigation, rendered as an on-page tab strip (same pattern
// as the Carrier Compliance Carrier/Asset/Driver tabs). Hand Over and Driver
// Inventory are folded into the List tab (driven by its handed-over switch), so
// only List and Vendors remain as top-level tabs.
export type InventoryTab = "list" | "vendors";

const TABS: { id: InventoryTab; label: string; Icon: React.ElementType; path: string }[] = [
    { id: "list", label: "List", Icon: List, path: "/inventory" },
    { id: "vendors", label: "Vendors", Icon: Store, path: "/inventory/vendors" },
];

export function InventoryTabs({ current, onNavigate, className }: {
    current: InventoryTab;
    onNavigate: (path: string) => void;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-1 overflow-x-auto no-scrollbar", className)}>
            {TABS.map((t) => {
                const active = current === t.id;
                return (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => onNavigate(t.path)}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            active
                                ? "text-blue-600 border-blue-600"
                                : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300",
                        )}
                    >
                        <t.Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} /> {t.label}
                    </button>
                );
            })}
        </div>
    );
}
