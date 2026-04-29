import { useEffect, useMemo, useState } from "react";
import {
    Plus, Tag, Trash2, X, Edit2, Check, Layers, AlertCircle,
} from "lucide-react";
import {
    type Vendor,
    type VendorCategory,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onClose: () => void;
    categories: VendorCategory[];
    vendors: Vendor[];
    onCategoriesChange: (next: VendorCategory[]) => void;
};

export function VendorCategoriesModal({
    open, onClose, categories, vendors, onCategoriesChange,
}: Props) {
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state — reused across add/edit
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Vendor counts per category for safety checks
    const vendorsByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        for (const v of vendors) map[v.categoryId] = (map[v.categoryId] ?? 0) + 1;
        return map;
    }, [vendors]);

    useEffect(() => {
        if (!open) return;
        setEditingCategoryId(null);
        setShowAddForm(false);
        resetForm();
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    const resetForm = () => { setName(""); setDescription(""); };

    const startAdd = () => {
        setEditingCategoryId(null);
        resetForm();
        setShowAddForm(true);
        setError(null);
    };

    const startEdit = (c: VendorCategory) => {
        setShowAddForm(false);
        setEditingCategoryId(c.id);
        setName(c.name);
        setDescription(c.description ?? "");
        setError(null);
    };

    const cancelForm = () => {
        setShowAddForm(false);
        setEditingCategoryId(null);
        resetForm();
        setError(null);
    };

    const handleAdd = () => {
        const trimmed = name.trim();
        if (!trimmed) { setError("Category name is required."); return; }
        if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
            setError(`A category named "${trimmed}" already exists.`);
            return;
        }
        const id = `cat-${Date.now()}`;
        onCategoriesChange([
            ...categories,
            { id, name: trimmed, description: description.trim() || undefined },
        ]);
        setShowAddForm(false);
        resetForm();
        setError(null);
    };

    const handleSave = () => {
        const trimmed = name.trim();
        if (!trimmed || !editingCategoryId) return;
        const conflict = categories.some(
            (c) => c.id !== editingCategoryId && c.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (conflict) { setError(`A category named "${trimmed}" already exists.`); return; }
        onCategoriesChange(
            categories.map((c) =>
                c.id === editingCategoryId
                    ? { ...c, name: trimmed, description: description.trim() || undefined }
                    : c
            )
        );
        setEditingCategoryId(null);
        resetForm();
        setError(null);
    };

    const handleDelete = (cat: VendorCategory) => {
        if (vendorsByCategory[cat.id]) {
            setError(`Can't delete "${cat.name}" — ${vendorsByCategory[cat.id]} vendor(s) still use it.`);
            return;
        }
        if (!confirm(`Delete the "${cat.name}" category?`)) return;
        onCategoriesChange(categories.filter((c) => c.id !== cat.id));
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Vendor Categories</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Single source of truth for what kind of services your vendors provide.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40">
                    {/* Top bar */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{categories.length}</span> categor{categories.length === 1 ? "y" : "ies"}
                        </div>
                        {!showAddForm && !editingCategoryId && (
                            <button
                                type="button"
                                onClick={startAdd}
                                className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={14} /> Add Category
                            </button>
                        )}
                    </div>

                    {/* Add form */}
                    {showAddForm && (
                        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
                            <div className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
                                <Tag size={14} className="text-blue-600" /> New Category
                            </div>
                            <CategoryForm
                                name={name} setName={setName}
                                description={description} setDescription={setDescription}
                            />
                            <div className="mt-3 flex justify-end gap-2">
                                <button onClick={cancelForm} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                                <button onClick={handleAdd} className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
                                    <Plus size={12} /> Add
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                            <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
                        </div>
                    )}

                    {/* Categories list */}
                    {categories.length === 0 ? (
                        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
                            <Layers size={20} className="mx-auto text-slate-400 mb-2" />
                            <p className="text-sm text-slate-600 font-medium">No categories yet</p>
                            <p className="text-xs text-slate-500 mt-1">Add one above to start grouping vendors.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {categories.map((c) => {
                                const isEditing = editingCategoryId === c.id;
                                const vendorCount = vendorsByCategory[c.id] ?? 0;

                                if (isEditing) {
                                    return (
                                        <div key={c.id} className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
                                            <div className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
                                                <Edit2 size={14} className="text-blue-600" /> Editing "{c.name}"
                                            </div>
                                            <CategoryForm
                                                name={name} setName={setName}
                                                description={description} setDescription={setDescription}
                                                            />
                                            <div className="mt-3 flex justify-end gap-2">
                                                <button onClick={cancelForm} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                                                <button onClick={handleSave} className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
                                                    <Check size={12} /> Save
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Tag size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                                                {c.description && <div className="text-xs text-slate-500 truncate">{c.description}</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                {vendorCount} vendor{vendorCount === 1 ? "" : "s"}
                                            </span>
                                            <IconBtn icon={Edit2} onClick={() => startEdit(c)} title="Edit category" />
                                            <IconBtn icon={Trash2} variant="danger" onClick={() => handleDelete(c)} title="Delete category" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

function CategoryForm({
    name, setName, description, setDescription,
}: {
    name: string; setName: (v: string) => void;
    description: string; setDescription: (v: string) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Telematics"
                        autoFocus
                        className="h-9 w-full px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Description (optional)
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Short description"
                        className="h-9 w-full px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>
        </div>
    );
}

function IconBtn({
    icon: Icon, onClick, title, variant = "ghost",
}: {
    icon: React.ElementType;
    onClick: () => void;
    title: string;
    variant?: "ghost" | "danger";
}) {
    const styles = variant === "danger"
        ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
        : "text-slate-400 hover:text-slate-700 hover:bg-slate-100";
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={cn("h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors", styles)}
        >
            <Icon size={14} />
        </button>
    );
}
