import { useState } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { KebabMenu, type KebabItem } from "@/components/ui/KebabMenu";
import { TablePager } from "@/components/ui/ListChrome";
import { PAGE_SIZES, TH_ROW_CLS } from "@/components/ui/list-chrome";

// ─────────────────────────────────────────────────────────────────────────────
// SetupTable — the list every hiring/onboarding setup tab renders into (Workflow
// Builder, Onboarding Setup): one line per row, the facts in columns, and every
// action behind the three dots. A click on the row does the first thing in its menu.
// ─────────────────────────────────────────────────────────────────────────────

export const ROW_CLS = "cursor-pointer transition-colors hover:bg-slate-50/70";
export const CELL = "px-3 py-3 text-[13px] text-slate-600";

/**
 * Name column, the tab's own columns, then Actions — so colSpan is `cols.length + 1`.
 *
 * `minW` is the width below which the table scrolls sideways instead of squeezing: the name
 * column is the one without a fixed width, so a wide table on a narrow card would otherwise
 * crush it to "U…" while the fixed columns keep their room.
 */
export function RowTable({ cols, minW = 560, noActions, children }: {
    cols: { label: string; w?: string }[]; minW?: number; noActions?: boolean; children: React.ReactNode;
}) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full table-fixed text-sm" style={{ minWidth: minW }}>
                <thead>
                    <tr className={TH_ROW_CLS}>
                        {cols.map((c, i) => <th key={c.label} className={cn("py-2.5", i === 0 ? "px-5" : "px-3", c.w)}>{c.label}</th>)}
                        {!noActions && <th className="w-20 py-2.5 pl-1 pr-5 text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">{children}</tbody>
            </table>
        </div>
    );
}

/** Icon, name (with a Default lock when it is a built-in) and a one-line description. */
export function NameCell({ icon: Icon, accent, iconStyle, name, sub, locked }: {
    icon: React.ElementType; accent?: string; iconStyle?: React.CSSProperties; name: string; sub?: string; locked?: boolean;
}) {
    return (
        <td className="px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accent)} style={iconStyle}><Icon className="h-4 w-4" /></div>
                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900" title={name}>{name}</p>
                    {/* The Default lock rides on the second line, so it never takes room from the name. */}
                    {(sub || locked) && (
                        <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-slate-500">
                            {locked && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500"><Lock className="h-2.5 w-2.5" /> Default</span>}
                            {sub && <span className="truncate" title={sub}>{sub}</span>}
                        </p>
                    )}
                </div>
            </div>
        </td>
    );
}

/**
 * Rows per page and the pager under a list. Holds its own page, so each tab starts on page
 * one; the page snaps back into range when the list shrinks. Children get the current slice.
 */
export function Paged<T>({ items, children }: { items: T[]; children: (slice: T[]) => React.ReactNode }) {
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(PAGE_SIZES[0]);
    const pages = Math.max(1, Math.ceil(items.length / size));
    const safe = Math.min(page, pages);
    const slice = items.slice((safe - 1) * size, safe * size);
    return (
        <>
            {children(slice)}
            {items.length > 0 && (
                <TablePager page={safe} pageSize={size} total={items.length}
                    onPage={setPage} onPageSize={(n) => { setSize(n); setPage(1); }}
                    className="rounded-b-xl bg-slate-50/60" />
            )}
        </>
    );
}

/** The row's three-dot menu. Stops the click so opening the menu doesn't also open the row. */
export function ActionsCell({ name, items }: { name: string; items: KebabItem[] }) {
    return (
        <td className="py-3 pl-1 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
            {items.length > 0 && <KebabMenu title={`Actions for ${name}`} items={items} />}
        </td>
    );
}
