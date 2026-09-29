// ─────────────────────────────────────────────────────────────────────────────
// What the inspector wrote up, as a list.
//
// Three panels — one per party — was the shape of the FORM, and the form is
// right to be shaped that way: you fill it in by walking round the truck, then
// the trailer, then talking to the driver. Reading it back is a different job.
// An auditor asking "what was found on this inspection" wants the findings in
// one column they can run an eye down, with the code beside each one, not three
// cards to add up.
//
// So the party becomes a column rather than a container, and the table reads
// like the Violations page does elsewhere in the app: date-ordered rows, a code,
// a category, and the flag that matters. One row per finding, and every row can
// be shared or struck off on its own.
// ─────────────────────────────────────────────────────────────────────────────

import { Container, Plus, ShieldAlert, Truck, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { Share2, Trash2 } from "lucide-react";
import type { TicketViolation } from "@/pages/tickets/tickets.data";
import { PARTY_LABEL, type PartyKind, type RoadsideInspection } from "./roadside.data";

/** One finding, with the party it was found against carried alongside. */
export interface ViolationRow {
    kind: PartyKind;
    /** Where it sits in that party's list — what a remove has to address. */
    index: number;
    unit: string;
    v: TicketViolation;
}

export function violationRows(i: RoadsideInspection): ViolationRow[] {
    const parties: [PartyKind, RoadsideInspection["truck"]][] = [
        ["truck", i.truck], ["trailer", i.trailer], ["driver", i.driver],
    ];
    return parties.flatMap(([kind, p]) =>
        (p.hasViolation ? p.violations : []).map((v, index) => ({
            kind, index, unit: p.label ?? "—", v,
        })),
    );
}

const PARTY_ICON: Record<PartyKind, React.ElementType> = {
    truck: Truck, trailer: Container, driver: User,
};

const TH = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap border-r border-slate-200/70 last:border-r-0";
const TD = "px-3 py-1.5 text-[13px] align-middle border-r border-slate-100 last:border-r-0";

export function ViolationList({ inspection, onAdd, onShare, onRemove, readOnly }: {
    inspection: RoadsideInspection;
    /** Open the editor, where the pickers live. */
    onAdd?: () => void;
    onShare?: (row: ViolationRow) => void;
    onRemove?: (row: ViolationRow) => void;
    readOnly?: boolean;
}) {
    const rows = violationRows(inspection);
    const parties = [
        { kind: "truck" as const, p: inspection.truck },
        { kind: "trailer" as const, p: inspection.trailer },
        { kind: "driver" as const, p: inspection.driver },
    ];
    /** Parties that were inspected and came back clean — worth saying, not worth a row each. */
    const clean = parties.filter((x) => x.p.label && (!x.p.hasViolation || x.p.violations.length === 0));

    const actions = (row: ViolationRow) => [
        ...(onShare ? [{ label: "Share to chat", icon: Share2, onClick: () => onShare(row) }] : []),
        ...(onRemove && !readOnly ? [{ label: "Remove violation", icon: Trash2, danger: true, onClick: () => onRemove(row) }] : []),
    ];

    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Violations
                    <span className="ml-1.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 ring-1 ring-slate-200">
                        {rows.length}
                    </span>
                </p>
                {!readOnly && onAdd && (
                    <button type="button" onClick={onAdd}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                        <Plus size={13} /> Add violation
                    </button>
                )}
            </div>

            {/* Desk */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[820px]">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th className={TH}>Found on</th>
                            <th className={TH}>Code</th>
                            <th className={TH}>Violation</th>
                            <th className={TH}>Category</th>
                            <th className={TH}>Group</th>
                            <th className={TH}>OOS</th>
                            <th className={cn(TH, "pr-2 text-right")}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((row) => {
                            const Icon = PARTY_ICON[row.kind];
                            return (
                                <tr key={`${row.kind}-${row.index}`} className="h-9">
                                    <td className={cn(TD, "whitespace-nowrap")}>
                                        <span className="inline-flex items-center gap-1.5">
                                            <Icon size={13} className="text-slate-400" />
                                            <span className="font-semibold text-slate-700">{PARTY_LABEL[row.kind]}</span>
                                            <span className="text-slate-400">{row.unit}</span>
                                        </span>
                                    </td>
                                    <td className={cn(TD, "whitespace-nowrap font-mono text-[12px] font-bold text-slate-600")}>
                                        {row.v.code || "—"}
                                    </td>
                                    <td className={cn(TD, "max-w-[280px] truncate text-slate-800")}
                                        title={row.v.subtype || row.v.label}>
                                        {row.v.subtype || row.v.label}
                                    </td>
                                    <td className={cn(TD, "whitespace-nowrap text-slate-600")}>{row.v.category || "—"}</td>
                                    <td className={cn(TD, "whitespace-nowrap text-slate-600")}>{row.v.group || "—"}</td>
                                    <td className={cn(TD, "whitespace-nowrap")}>
                                        {row.v.isOos
                                            ? <span className="inline-flex items-center rounded border border-rose-300 bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-700">OOS</span>
                                            : <span className="text-slate-300">&mdash;</span>}
                                    </td>
                                    <td className={cn(TD, "pr-2")}>
                                        <div className="flex justify-end">
                                            {actions(row).length > 0
                                                ? <KebabMenu items={actions(row)} title="Violation actions" />
                                                : <span className="text-slate-300">&mdash;</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center">
                                    <ShieldAlert size={22} className="mx-auto text-slate-300" />
                                    <p className="mt-2 text-[13px] font-semibold text-slate-600">Nothing was found</p>
                                    <p className="mt-0.5 text-[12px] text-slate-400">
                                        No violation against the truck, the trailer or the driver.
                                    </p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Phone */}
            <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((row) => {
                    const Icon = PARTY_ICON[row.kind];
                    return (
                        <div key={`${row.kind}-${row.index}`} className="flex items-start gap-3 p-4">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <Icon size={14} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {row.v.code && (
                                        <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[11px] font-bold text-slate-600">{row.v.code}</span>
                                    )}
                                    {row.v.isOos && (
                                        <span className="rounded border border-rose-300 bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-700">OOS</span>
                                    )}
                                </div>
                                <p className="mt-1 text-[13px] font-semibold text-slate-800">{row.v.subtype || row.v.label}</p>
                                <p className="text-[12px] text-slate-500">
                                    {PARTY_LABEL[row.kind]} {row.unit}
                                    {row.v.category ? ` · ${row.v.category}` : ""}
                                </p>
                            </div>
                            {actions(row).length > 0 && <KebabMenu items={actions(row)} title="Violation actions" />}
                        </div>
                    );
                })}
                {rows.length === 0 && (
                    <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                        No violation against the truck, the trailer or the driver.
                    </p>
                )}
            </div>

            {/* What came back clean. A line, because "the driver was fine" is an answer
                somebody looking at this page needs, and three empty cards is not. */}
            {clean.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 bg-slate-50/50 px-4 py-2 text-[12px] text-slate-500">
                    <span className="font-semibold text-slate-600">No violation:</span>
                    {clean.map((x) => (
                        <span key={x.kind} className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-px text-[11px] font-semibold text-emerald-700">
                            {PARTY_LABEL[x.kind]} {x.p.label}
                        </span>
                    ))}
                </p>
            )}
        </section>
    );
}
