import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Row-count + pagination footer shared by the inventory tables. */
export function TablePager({
    page, perPage, total, label, onPage, onPerPage, perPageOptions = [8, 15, 25, 50],
}: {
    page: number;
    perPage: number;
    total: number;
    label: string;
    onPage: (p: number) => void;
    onPerPage?: (n: number) => void;
    perPageOptions?: number[];
}) {
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const p = Math.min(page, totalPages - 1);
    const from = total === 0 ? 0 : p * perPage + 1;
    const to = Math.min(total, p * perPage + perPage);

    // Windowed page numbers so a long list doesn't overflow.
    const pages: number[] = [];
    const win = 2;
    for (let i = 0; i < totalPages; i++) {
        if (i === 0 || i === totalPages - 1 || (i >= p - win && i <= p + win)) pages.push(i);
    }

    const navBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500";

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
            <div className="flex items-center gap-4">
                <span className="text-xs text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{from}–{to}</span> of <span className="font-semibold text-slate-700">{total}</span> {label}
                </span>
                {onPerPage && (
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                        Rows
                        <select
                            value={perPage}
                            onChange={(e) => onPerPage(Number(e.target.value))}
                            className="h-7 rounded-md border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500"
                        >
                            {perPageOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </label>
                )}
            </div>
            <div className="flex items-center gap-1">
                <button type="button" disabled={p === 0} onClick={() => onPage(p - 1)} className={navBtn} aria-label="Previous page"><ChevronLeft size={15} /></button>
                {pages.map((i, idx) => {
                    const prev = pages[idx - 1];
                    const gap = prev !== undefined && i - prev > 1;
                    return (
                        <span key={i} className="flex items-center gap-1">
                            {gap && <span className="px-1 text-xs text-slate-400">…</span>}
                            <button type="button" onClick={() => onPage(i)} className={cn("h-8 min-w-[2rem] rounded-md px-2 text-xs font-semibold transition-colors", i === p ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50")}>{i + 1}</button>
                        </span>
                    );
                })}
                <button type="button" disabled={p === totalPages - 1} onClick={() => onPage(p + 1)} className={navBtn} aria-label="Next page"><ChevronRight size={15} /></button>
            </div>
        </div>
    );
}
