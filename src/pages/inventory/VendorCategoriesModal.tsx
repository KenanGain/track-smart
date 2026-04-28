import { useEffect, useMemo, useState } from "react";
import {
    Plus, Tag, Trash2, X, Edit2, Check, ChevronDown, ChevronRight,
    Layers, AlertCircle,
} from "lucide-react";
import {
    getTypesByCategory,
    type Vendor,
    type VendorCategory,
    type VendorType,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onClose: () => void;
    categories: VendorCategory[];
    types: VendorType[];
    vendors: Vendor[];
    onCategoriesChange: (next: VendorCategory[]) => void;
    onTypesChange: (next: VendorType[]) => void;
};

export function VendorCategoriesModal({
    open, onClose, categories, types, vendors, onCategoriesChange, onTypesChange,
}: Props) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingTypeKey, setEditingTypeKey] = useState<string | null>(null);
    const [addingTypeForCategory, setAddingTypeForCategory] = useState<string | null>(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state — reused across modes
    const [catName, setCatName] = useState("");
    const [catDesc, setCatDesc] = useState("");
    const [typeLabel, setTypeLabel] = useState("");
    const [typeMultiAsset, setTypeMultiAsset] = useState(true);

    // Vendor counts for safety checks
    const vendorsByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        for (const v of vendors) map[v.categoryId] = (map[v.categoryId] ?? 0) + 1;
        return map;
    }, [vendors]);

    const vendorsByType = useMemo(() => {
        const map: Record<string, number> = {};
        for (const v of vendors) map[v.type] = (map[v.type] ?? 0) + 1;
        return map;
    }, [vendors]);

    // Initially expand all categories the first time the modal opens
    useEffect(() => {
        if (!open) return;
        setExpanded((prev) => {
            const next = { ...prev };
            for (const c of categories) if (next[c.id] === undefined) next[c.id] = true;
            return next;
        });
        setError(null);
        setShowAddCategory(false);
        setEditingCategoryId(null);
        setEditingTypeKey(null);
        setAddingTypeForCategory(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose, categories]);

    if (!open) return null;

    const toggleCategory = (id: string) =>
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

    const resetCategoryForm = () => { setCatName(""); setCatDesc(""); };
    const resetTypeForm = () => { setTypeLabel(""); setTypeMultiAsset(true); };

    // ── Category actions ────────────────────────────────────────────────────

    const handleAddCategory = () => {
        const name = catName.trim();
        if (!name) { setError("Category name is required."); return; }
        if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            setError(`A category named "${name}" already exists.`); return;
        }
        const id = `cat-${Date.now()}`;
        onCategoriesChange([...categories, { id, name, description: catDesc.trim() || undefined }]);
        resetCategoryForm();
        setShowAddCategory(false);
        setExpanded((prev) => ({ ...prev, [id]: true }));
        setError(null);
    };

    const startEditCategory = (c: VendorCategory) => {
        setEditingCategoryId(c.id);
        setCatName(c.name);
        setCatDesc(c.description ?? "");
        setError(null);
    };

    const handleSaveCategory = () => {
        const name = catName.trim();
        if (!name || !editingCategoryId) return;
        const conflict = categories.some(
            (c) => c.id !== editingCategoryId && c.name.toLowerCase() === name.toLowerCase()
        );
        if (conflict) { setError(`A category named "${name}" already exists.`); return; }
        onCategoriesChange(
            categories.map((c) =>
                c.id === editingCategoryId
                    ? { ...c, name, description: catDesc.trim() || undefined }
                    : c
            )
        );
        setEditingCategoryId(null);
        resetCategoryForm();
        setError(null);
    };

    const handleDeleteCategory = (cat: VendorCategory) => {
        if (vendorsByCategory[cat.id]) {
            setError(`Can't delete "${cat.name}" — ${vendorsByCategory[cat.id]} vendor(s) still use it.`);
            return;
        }
        const typeCount = getTypesByCategory(cat.id, types).length;
        if (typeCount > 0) {
            if (!confirm(`Delete "${cat.name}" and its ${typeCount} type(s)?`)) return;
            onTypesChange(types.filter((t) => t.categoryId !== cat.id));
        }
        onCategoriesChange(categories.filter((c) => c.id !== cat.id));
        setError(null);
    };

    // ── Type actions ────────────────────────────────────────────────────────

    const startAddType = (categoryId: string) => {
        setAddingTypeForCategory(categoryId);
        resetTypeForm();
        setError(null);
        setExpanded((prev) => ({ ...prev, [categoryId]: true }));
    };

    const handleAddType = (categoryId: string) => {
        const label = typeLabel.trim();
        if (!label) { setError("Type name is required."); return; }
        if (types.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
            setError(`A type named "${label}" already exists.`); return;
        }
        const key = `type-${Date.now()}`;
        onTypesChange([
            ...types,
            { key, label, categoryId, multiAsset: typeMultiAsset },
        ]);
        resetTypeForm();
        setAddingTypeForCategory(null);
        setError(null);
    };

    const startEditType = (t: VendorType) => {
        setEditingTypeKey(t.key);
        setTypeLabel(t.label);
        setTypeMultiAsset(t.multiAsset);
        setError(null);
    };

    const handleSaveType = () => {
        const label = typeLabel.trim();
        if (!label || !editingTypeKey) return;
        const conflict = types.some(
            (t) => t.key !== editingTypeKey && t.label.toLowerCase() === label.toLowerCase()
        );
        if (conflict) { setError(`A type named "${label}" already exists.`); return; }
        onTypesChange(
            types.map((t) =>
                t.key === editingTypeKey
                    ? { ...t, label, multiAsset: typeMultiAsset }
                    : t
            )
        );
        setEditingTypeKey(null);
        resetTypeForm();
        setError(null);
    };

    const handleDeleteType = (t: VendorType) => {
        if (vendorsByType[t.key]) {
            setError(`Can't delete "${t.label}" — ${vendorsByType[t.key]} vendor(s) still use it.`);
            return;
        }
        if (!confirm(`Delete the "${t.label}" type?`)) return;
        onTypesChange(types.filter((x) => x.key !== t.key));
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Vendor Categories & Types</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Organize vendors into categories, and define the service types under each.
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
                    {/* Top action row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{categories.length}</span> categor{categories.length === 1 ? "y" : "ies"}
                            <span className="mx-2 text-slate-300">·</span>
                            <span className="font-semibold text-slate-700">{types.length}</span> type{types.length === 1 ? "" : "s"}
                        </div>
                        <button
                            type="button"
                            onClick={() => { setShowAddCategory((s) => !s); resetCategoryForm(); setError(null); }}
                            className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                        >
                            <Plus size={14} /> Add Category
                        </button>
                    </div>

                    {/* Add Category form */}
                    {showAddCategory && (
                        <div className="bg-white border border-blue-200 rounded-xl p-4 shadow-sm">
                            <div className="text-sm font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
                                <Tag size={14} className="text-blue-600" /> New Category
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <FieldInput
                                    label="Name"
                                    value={catName}
                                    onChange={setCatName}
                                    placeholder="e.g. Telematics"
                                    autoFocus
                                />
                                <FieldInput
                                    label="Description (optional)"
                                    value={catDesc}
                                    onChange={setCatDesc}
                                    placeholder="Short description"
                                />
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddCategory(false); resetCategoryForm(); setError(null); }}
                                    className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddCategory}
                                    className="h-8 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                                >
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
                        <div className="space-y-3">
                            {categories.map((c) => {
                                const isOpen = !!expanded[c.id];
                                const isEditing = editingCategoryId === c.id;
                                const cTypes = getTypesByCategory(c.id, types);

                                return (
                                    <div key={c.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                        {/* Category header */}
                                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                                            {isEditing ? (
                                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    <FieldInput value={catName} onChange={setCatName} placeholder="Category name" autoFocus compact />
                                                    <FieldInput value={catDesc} onChange={setCatDesc} placeholder="Description" compact />
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCategory(c.id)}
                                                    className="flex items-center gap-3 min-w-0 text-left flex-1"
                                                >
                                                    <span className={cn(
                                                        "h-8 w-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 transition-transform",
                                                        isOpen ? "rotate-0" : ""
                                                    )}>
                                                        {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                    </span>
                                                    <Tag size={14} className="text-slate-400 shrink-0" />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                                                        {c.description && (
                                                            <div className="text-xs text-slate-500 truncate">{c.description}</div>
                                                        )}
                                                    </div>
                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                        {cTypes.length} type{cTypes.length === 1 ? "" : "s"}
                                                    </span>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                                                        {vendorsByCategory[c.id] ?? 0} vendor{(vendorsByCategory[c.id] ?? 0) === 1 ? "" : "s"}
                                                    </span>
                                                </button>
                                            )}

                                            <div className="flex items-center gap-1 shrink-0">
                                                {isEditing ? (
                                                    <>
                                                        <IconBtn icon={Check} variant="primary" onClick={handleSaveCategory} title="Save" />
                                                        <IconBtn icon={X} onClick={() => { setEditingCategoryId(null); resetCategoryForm(); setError(null); }} title="Cancel" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <IconBtn icon={Edit2} onClick={() => startEditCategory(c)} title="Edit category" />
                                                        <IconBtn icon={Trash2} variant="danger" onClick={() => handleDeleteCategory(c)} title="Delete category" />
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Types list */}
                                        {isOpen && (
                                            <div className="border-t border-slate-100 bg-slate-50/40">
                                                {cTypes.length === 0 ? (
                                                    <div className="px-4 py-3 text-xs text-slate-400 italic">
                                                        No types in this category yet.
                                                    </div>
                                                ) : (
                                                    <ul className="divide-y divide-slate-100">
                                                        {cTypes.map((t) => {
                                                            const isTypeEditing = editingTypeKey === t.key;
                                                            return (
                                                                <li key={t.key} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white transition-colors">
                                                                    {isTypeEditing ? (
                                                                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                                                                            <FieldInput value={typeLabel} onChange={setTypeLabel} placeholder="Type name" autoFocus compact />
                                                                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={typeMultiAsset}
                                                                                    onChange={(e) => setTypeMultiAsset(e.target.checked)}
                                                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                                />
                                                                                Multi-asset
                                                                            </label>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                            <span className="h-6 w-6 rounded bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                                                                                <Layers size={11} />
                                                                            </span>
                                                                            <span className="text-sm font-medium text-slate-900 truncate">{t.label}</span>
                                                                            <span className={cn(
                                                                                "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border",
                                                                                t.multiAsset
                                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                                    : "bg-slate-100 text-slate-600 border-slate-200"
                                                                            )}>
                                                                                {t.multiAsset ? "Multi-asset" : "Single"}
                                                                            </span>
                                                                            {(vendorsByType[t.key] ?? 0) > 0 && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200">
                                                                                    {vendorsByType[t.key]} vendor{vendorsByType[t.key] === 1 ? "" : "s"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center gap-1 shrink-0">
                                                                        {isTypeEditing ? (
                                                                            <>
                                                                                <IconBtn icon={Check} variant="primary" onClick={handleSaveType} title="Save" />
                                                                                <IconBtn icon={X} onClick={() => { setEditingTypeKey(null); resetTypeForm(); setError(null); }} title="Cancel" />
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <IconBtn icon={Edit2} onClick={() => startEditType(t)} title="Edit type" />
                                                                                <IconBtn icon={Trash2} variant="danger" onClick={() => handleDeleteType(t)} title="Delete type" />
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                )}

                                                {/* Add type inline */}
                                                {addingTypeForCategory === c.id ? (
                                                    <div className="px-4 py-3 border-t border-slate-100 bg-white">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <FieldInput value={typeLabel} onChange={setTypeLabel} placeholder="Type name (e.g. Telematics Box)" autoFocus compact />
                                                            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 px-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={typeMultiAsset}
                                                                    onChange={(e) => setTypeMultiAsset(e.target.checked)}
                                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                                Multi-asset
                                                            </label>
                                                            <div className="ml-auto flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { setAddingTypeForCategory(null); resetTypeForm(); setError(null); }}
                                                                    className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAddType(c.id)}
                                                                    className="h-8 px-2.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                                                                >
                                                                    <Plus size={12} /> Add Type
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => startAddType(c.id)}
                                                        className="w-full px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center justify-center gap-1.5 border-t border-slate-100"
                                                    >
                                                        <Plus size={12} /> Add Type
                                                    </button>
                                                )}
                                            </div>
                                        )}
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
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tiny building blocks ────────────────────────────────────────────────────

function FieldInput({
    label, value, onChange, placeholder, autoFocus, compact,
}: {
    label?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    compact?: boolean;
}) {
    return (
        <div className={compact ? "flex-1 min-w-0" : "w-full"}>
            {label && (
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    {label}
                </label>
            )}
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className={cn(
                    "w-full px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
                    compact ? "h-8" : "h-9"
                )}
            />
        </div>
    );
}

function IconBtn({
    icon: Icon, onClick, title, variant = "ghost",
}: {
    icon: React.ElementType;
    onClick: () => void;
    title: string;
    variant?: "ghost" | "danger" | "primary";
}) {
    const styles =
        variant === "primary"
            ? "text-white bg-blue-600 hover:bg-blue-700 border-blue-600"
            : variant === "danger"
            ? "text-slate-400 hover:text-red-600 hover:bg-red-50 border-transparent"
            : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 border-transparent";

    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={cn(
                "h-8 w-8 inline-flex items-center justify-center rounded-md border transition-colors",
                styles
            )}
        >
            <Icon size={14} />
        </button>
    );
}
