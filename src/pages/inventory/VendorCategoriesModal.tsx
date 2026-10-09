import { useEffect, useMemo, useState } from "react";
import {
    Plus, Tag, Trash2, X, Edit2, Check, Layers, AlertCircle, Lock,
} from "lucide-react";
import {
    itemCategoryId,
    itemName,
    type InventoryItem,
    type VendorCategory,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onClose: () => void;
    categories: VendorCategory[];
    /** The items these categories categorise — what the counts and the delete guard read. */
    items: InventoryItem[];
    onCategoriesChange: (next: VendorCategory[]) => void;
};

export function VendorCategoriesModal({
    open, onClose, categories, items, onCategoriesChange,
}: Props) {
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state — reused across add/edit
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Which items are in each category — the count on the row, and what stops a
    // category being deleted out from under them. The items themselves rather than a
    // tally, because the dialog that blocks the delete should be able to name a few:
    // "12 items" sends you hunting, "12 items, starting with Fuel Card • ..." does not.
    const itemsByCategory = useMemo(() => {
        const map: Record<string, InventoryItem[]> = {};
        for (const it of items) {
            const id = itemCategoryId(it);
            if (id) (map[id] ??= []).push(it);
        }
        return map;
    }, [items]);

    // The category the trash icon was pressed on. Whether that ends in a delete or in a
    // "you cannot" depends on whether anything is filed under it.
    const [pendingDelete, setPendingDelete] = useState<VendorCategory | null>(null);

    useEffect(() => {
        if (!open) return;
        setEditingCategoryId(null);
        setShowAddForm(false);
        setPendingDelete(null);
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

    // Deleting is always a two-step now: the icon opens the dialog, and the dialog either
    // confirms an empty category away or explains why a used one is staying. A category
    // in use is never deleted — the items filed under it would point at nothing.
    const confirmDelete = (cat: VendorCategory) => {
        if ((itemsByCategory[cat.id] ?? []).length > 0) return;
        onCategoriesChange(categories.filter((c) => c.id !== cat.id));
        setPendingDelete(null);
        setError(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Item Category</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Single source of truth for what kind of things your inventory holds.
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
                                const itemCount = (itemsByCategory[c.id] ?? []).length;

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
                                                {itemCount} item{itemCount === 1 ? "" : "s"}
                                            </span>
                                            <IconBtn icon={Edit2} onClick={() => startEdit(c)} title="Edit category" />
                                            <IconBtn
                                                icon={itemCount > 0 ? Lock : Trash2}
                                                variant={itemCount > 0 ? "ghost" : "danger"}
                                                onClick={() => setPendingDelete(c)}
                                                title={itemCount > 0
                                                    ? `In use by ${itemCount} item${itemCount === 1 ? "" : "s"}`
                                                    : "Delete category"}
                                            />
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

                {pendingDelete && (
                    <DeleteCategoryDialog
                        category={pendingDelete}
                        inUse={itemsByCategory[pendingDelete.id] ?? []}
                        onCancel={() => setPendingDelete(null)}
                        onConfirm={() => confirmDelete(pendingDelete)}
                    />
                )}
            </div>
        </div>
    );
}

/**
 * What happens when the trash icon is pressed.
 *
 * Two answers in one box, because from the row they look like the same action: an empty
 * category asks once and goes, and a category with anything filed under it does not go at
 * all — it says how many items are holding it and names the first few, so the way out is
 * obvious (move those items first) instead of being a dead end.
 */
function DeleteCategoryDialog({ category, inUse, onCancel, onConfirm }: {
    category: VendorCategory;
    inUse: InventoryItem[];
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const blocked = inUse.length > 0;
    const names = inUse.slice(0, 4).map((it) => itemName(it));

    return (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
            <div
                role="alertdialog"
                aria-modal="true"
                aria-label={blocked ? `${category.name} is in use` : `Delete ${category.name}`}
                className="relative z-10 w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl"
            >
                <div className="flex items-start gap-3 p-5">
                    <div className={cn(
                        "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center",
                        blocked ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600",
                    )}>
                        {blocked ? <Lock size={18} /> : <Trash2 size={18} />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900">
                            {blocked ? `"${category.name}" can’t be deleted` : `Delete "${category.name}"?`}
                        </h3>
                        {blocked ? (
                            <>
                                <p className="mt-1 text-[13px] text-slate-600">
                                    <span className="font-semibold text-slate-900">
                                        {inUse.length} item{inUse.length === 1 ? " is" : "s are"}
                                    </span>{" "}
                                    filed under this category. Move them to another category first, and
                                    this one can go.
                                </p>
                                <ul className="mt-3 space-y-1">
                                    {names.map((n, i) => (
                                        <li key={i} className="flex items-center gap-2 text-[12px] text-slate-600">
                                            <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                                            <span className="truncate">{n}</span>
                                        </li>
                                    ))}
                                    {inUse.length > names.length && (
                                        <li className="pl-3 text-[12px] text-slate-400">
                                            and {inUse.length - names.length} more
                                        </li>
                                    )}
                                </ul>
                            </>
                        ) : (
                            <p className="mt-1 text-[13px] text-slate-600">
                                Nothing is filed under it, so nothing else changes. This can’t be undone.
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        {blocked ? "Close" : "Cancel"}
                    </button>
                    {!blocked && (
                        <button
                            type="button"
                            onClick={onConfirm}
                            className="h-9 px-3 rounded-md bg-red-600 text-xs font-semibold text-white shadow-sm hover:bg-red-700 inline-flex items-center gap-1.5"
                        >
                            <Trash2 size={12} /> Delete category
                        </button>
                    )}
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
