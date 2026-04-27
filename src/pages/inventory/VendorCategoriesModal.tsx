import { useEffect, useMemo, useState } from "react";
import { Plus, Tag, Trash2, X } from "lucide-react";
import type { Vendor, VendorCategory } from "./inventory.data";

type Props = {
    open: boolean;
    onClose: () => void;
    categories: VendorCategory[];
    vendors: Vendor[];
    onChange: (next: VendorCategory[]) => void;
};

export function VendorCategoriesModal({ open, onClose, categories, vendors, onChange }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState<string | null>(null);

    const counts = useMemo(() => {
        const map: Record<string, number> = {};
        for (const v of vendors) map[v.categoryId] = (map[v.categoryId] ?? 0) + 1;
        return map;
    }, [vendors]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const id = `cat-${Date.now()}`;
        onChange([...categories, { id, name: name.trim(), description: description.trim() || undefined }]);
        setName("");
        setDescription("");
        setError(null);
    };

    const handleRemove = (id: string) => {
        if (counts[id]) {
            setError("Cannot remove a category that still has vendors assigned.");
            return;
        }
        onChange(categories.filter((c) => c.id !== id));
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Vendor Categories</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Organize vendors into logical groups.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto px-6 py-5 space-y-5">
                    <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">Name <span className="text-red-500">*</span></label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="e.g. Telematics"
                                className="h-10 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-slate-700">Description</label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Short description"
                                className="h-10 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-10 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Plus size={15} /> Add
                        </button>
                    </form>

                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                        </div>
                        <ul>
                            {categories.map((c) => (
                                <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <Tag size={16} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                                            {c.description && <div className="text-xs text-slate-500 truncate">{c.description}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-xs text-slate-500 whitespace-nowrap">
                                            {counts[c.id] ?? 0} vendor{(counts[c.id] ?? 0) === 1 ? "" : "s"}
                                        </span>
                                        <button
                                            onClick={() => handleRemove(c.id)}
                                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            aria-label="Delete category"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
