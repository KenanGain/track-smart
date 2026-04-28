import { useEffect, useMemo, useState } from "react";
import { Check, Search, X, Building2 } from "lucide-react";
import { type AccountRecord } from "@/pages/accounts/accounts.data";
import { cn } from "@/lib/utils";

type Props = {
    /** All carriers the current actor is allowed to grant access to. */
    carriers: AccountRecord[];
    selectedIds: string[];
    applyToAll: boolean;
    onChange: (next: { ids: string[]; applyToAll: boolean }) => void;
};

/**
 * Multi-carrier access picker — matches the asset-assignment UI used in the
 * Add Inventory form: an "Apply to all" toggle, a "+ Add Carriers" button,
 * a selected-carriers table or empty state, and a nested selection modal
 * with search and checkbox rows.
 */
export function CarrierAccessPicker({ carriers, selectedIds, applyToAll, onChange }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return carriers;
        return carriers.filter(
            (c) =>
                c.legalName.toLowerCase().includes(q) ||
                c.dbaName.toLowerCase().includes(q) ||
                c.dotNumber.toLowerCase().includes(q)
        );
    }, [carriers, search]);

    const display = applyToAll
        ? carriers
        : selectedIds.map((id) => carriers.find((c) => c.id === id)).filter(Boolean) as AccountRecord[];

    const toggleOne = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange({ ids: selectedIds.filter((x) => x !== id), applyToAll: false });
        } else {
            onChange({ ids: [...selectedIds, id], applyToAll: false });
        }
    };

    const removeOne = (id: string) => {
        onChange({ ids: selectedIds.filter((x) => x !== id), applyToAll: false });
    };

    const toggleApplyToAll = () => {
        const next = !applyToAll;
        onChange({ ids: next ? [] : selectedIds, applyToAll: next });
    };

    return (
        <div className="space-y-5">
            {/* Toolbar row: toggle + Add button */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleApplyToAll}
                        className={cn(
                            "w-11 h-6 rounded-full relative transition-colors",
                            applyToAll ? "bg-blue-600" : "bg-slate-200"
                        )}
                        aria-pressed={applyToAll}
                    >
                        <span className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                            applyToAll ? "left-6" : "left-1"
                        )} />
                    </button>
                    <label className="text-sm font-medium text-slate-700">Apply to all eligible carriers</label>
                </div>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    disabled={applyToAll}
                    className={cn(
                        "text-sm font-medium px-3 py-1.5 rounded-md border transition-colors",
                        applyToAll
                            ? "text-slate-300 border-slate-100 cursor-not-allowed"
                            : "text-blue-600 border-blue-200 hover:bg-blue-50"
                    )}
                >
                    + Add Carriers
                </button>
            </div>

            {/* Selected list / empty state */}
            {display.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                    {applyToAll ? "No eligible carriers found." : "Select carriers (or turn on Apply to All)."}
                </div>
            ) : (
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Carriers — {display.length} Total</th>
                                <th className="px-4 py-3">DBA</th>
                                <th className="px-4 py-3">DOT #</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {display.map((c) => {
                                const initials = c.legalName
                                    .replace(/[^a-zA-Z0-9\s]/g, "")
                                    .split(/\s+/)
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((p) => p[0]!.toUpperCase())
                                    .join("");
                                return (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="font-semibold text-slate-900">{c.legalName}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{c.dbaName || "—"}</td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{c.dotNumber || "—"}</td>
                                        <td className="px-4 py-3 text-right">
                                            {!applyToAll && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOne(c.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                    aria-label="Remove carrier"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Selection modal */}
            {isModalOpen && (
                <SelectionModal
                    carriers={filtered}
                    selectedIds={selectedIds}
                    search={search}
                    setSearch={setSearch}
                    onToggle={toggleOne}
                    onClose={() => { setIsModalOpen(false); setSearch(""); }}
                />
            )}
        </div>
    );
}

function SelectionModal({
    carriers, selectedIds, search, setSearch, onToggle, onClose,
}: {
    carriers: AccountRecord[];
    selectedIds: string[];
    search: string;
    setSearch: (v: string) => void;
    onToggle: (id: string) => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-lg text-slate-900">Select Carriers</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, DBA, or DOT…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto p-2 space-y-1 flex-1">
                    {carriers.length > 0 ? carriers.map((c) => {
                        const isSelected = selectedIds.includes(c.id);
                        const initials = c.legalName
                            .replace(/[^a-zA-Z0-9\s]/g, "")
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]!.toUpperCase())
                            .join("");
                        return (
                            <div
                                key={c.id}
                                onClick={() => onToggle(c.id)}
                                className={cn(
                                    "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
                                    isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors",
                                    isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"
                                )}>
                                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <div className="min-w-0 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{c.legalName}</div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {c.dbaName && c.dbaName !== c.legalName && <>DBA {c.dbaName}</>}
                                            {c.dbaName && c.dotNumber && <span className="mx-1">·</span>}
                                            {c.dotNumber && <>DOT {c.dotNumber}</>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-8 text-center text-slate-400">
                            <Building2 size={20} className="mx-auto mb-1.5 opacity-50" />
                            <p className="text-sm">No carriers match your search.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        {selectedIds.length} carrier{selectedIds.length === 1 ? "" : "s"} selected
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
