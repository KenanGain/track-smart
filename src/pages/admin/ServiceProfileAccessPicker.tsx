import { useEffect, useMemo, useState } from "react";
import { Check, Search, X, Briefcase, Hash, Building2 } from "lucide-react";
import { type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { cn } from "@/lib/utils";

type Props = {
    /** All service profiles the current actor is allowed to grant. */
    profiles: ServiceProfile[];
    selectedIds: string[];
    applyToAll: boolean;
    onChange: (next: { ids: string[]; applyToAll: boolean }) => void;
};

/**
 * Multi service-profile access picker — same UI pattern as the asset and
 * carrier-access pickers: an "Apply to all" toggle, a "+ Add Service Profiles"
 * button, a selected-profiles table or empty state, and a nested selection
 * modal with search and checkbox rows. Violet accent to match the rest of
 * the service-profile UI.
 */
export function ServiceProfileAccessPicker({ profiles, selectedIds, applyToAll, onChange }: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return profiles;
        return profiles.filter(
            (p) =>
                p.legalName.toLowerCase().includes(q) ||
                (p.dbaName ?? "").toLowerCase().includes(q) ||
                p.businessType.toLowerCase().includes(q) ||
                p.stateOfInc.toLowerCase().includes(q)
        );
    }, [profiles, search]);

    const display = applyToAll
        ? profiles
        : selectedIds.map((id) => profiles.find((p) => p.id === id)).filter(Boolean) as ServiceProfile[];

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
            {/* Toolbar row */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleApplyToAll}
                        className={cn(
                            "w-11 h-6 rounded-full relative transition-colors",
                            applyToAll ? "bg-violet-600" : "bg-slate-200"
                        )}
                        aria-pressed={applyToAll}
                    >
                        <span className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                            applyToAll ? "left-6" : "left-1"
                        )} />
                    </button>
                    <label className="text-sm font-medium text-slate-700">Apply to all eligible service profiles</label>
                </div>
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    disabled={applyToAll}
                    className={cn(
                        "text-sm font-medium px-3 py-1.5 rounded-md border transition-colors",
                        applyToAll
                            ? "text-slate-300 border-slate-100 cursor-not-allowed"
                            : "text-violet-700 border-violet-200 hover:bg-violet-50"
                    )}
                >
                    + Add Service Profiles
                </button>
            </div>

            {/* Selected list / empty state */}
            {display.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                    {applyToAll
                        ? "No eligible service profiles found."
                        : "Select service profiles (or turn on Apply to All)."}
                </div>
            ) : (
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3">Service Profile — {display.length} Total</th>
                                <th className="px-4 py-3">State / Business</th>
                                <th className="px-4 py-3">DBA</th>
                                <th className="px-4 py-3 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {display.map((p) => {
                                const initials = p.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
                                return (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-7 w-7 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="font-semibold text-slate-900">{p.legalName}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">
                                            <span className="inline-flex items-center gap-1"><Hash size={11} className="text-slate-400" /> {p.stateOfInc}</span>
                                            <span className="ml-2 inline-flex items-center gap-1"><Briefcase size={11} className="text-slate-400" /> {p.businessType}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-600">{p.dbaName || "—"}</td>
                                        <td className="px-4 py-3 text-right">
                                            {!applyToAll && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeOne(p.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                                    aria-label="Remove service profile"
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
                    profiles={filtered}
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
    profiles, selectedIds, search, setSearch, onToggle, onClose,
}: {
    profiles: ServiceProfile[];
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
                    <h3 className="font-semibold text-lg text-slate-900">Select Service Profiles</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, DBA, or state…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-y-auto p-2 space-y-1 flex-1">
                    {profiles.length > 0 ? profiles.map((p) => {
                        const isSelected = selectedIds.includes(p.id);
                        const initials = p.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
                        return (
                            <div
                                key={p.id}
                                onClick={() => onToggle(p.id)}
                                className={cn(
                                    "flex items-center p-3 rounded-lg cursor-pointer transition-colors",
                                    isSelected ? "bg-violet-50" : "hover:bg-slate-50"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors",
                                    isSelected ? "bg-violet-600 border-violet-600" : "border-slate-300 bg-white"
                                )}>
                                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                </div>
                                <div className="min-w-0 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-md bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {initials}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{p.legalName}</div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {p.dbaName && <>DBA {p.dbaName} · </>}{p.stateOfInc} · {p.businessType}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-8 text-center text-slate-400">
                            <Building2 size={20} className="mx-auto mb-1.5 opacity-50" />
                            <p className="text-sm">No service profiles match your search.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="text-xs text-slate-500">
                        {selectedIds.length} service profile{selectedIds.length === 1 ? "" : "s"} selected
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white rounded-md bg-violet-600 hover:bg-violet-700 shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
