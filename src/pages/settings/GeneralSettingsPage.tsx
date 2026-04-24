import { useMemo, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Lock, Package, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { UI_DATA } from '@/pages/profile/carrier-profile.data';

// ─────────────────────────────────────────────────────────────────────────────
// Section registry — add more settings sections here as they are built.
// Each section is a self-contained component. Keeping them co-located here
// keeps the page simple; split into files if sections grow large.
// ─────────────────────────────────────────────────────────────────────────────

type SectionId = 'cargo';

const SECTIONS: { id: SectionId; label: string }[] = [
    { id: 'cargo', label: 'Cargo Carrier' },
];

export const GeneralSettingsPage = () => {
    const [activeSection, setActiveSection] = useState<SectionId>('cargo');

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-8 py-6">
                {/* Breadcrumb */}
                <div className="flex text-sm text-slate-500 mb-2">
                    <span className="mr-2">Settings</span>
                    <span>/</span>
                    <span className="ml-2 font-medium text-slate-900">General Settings</span>
                </div>

                {/* Header row */}
                <div className="flex items-end justify-between mb-6 flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            General Settings
                        </h1>
                        <p className="text-slate-500 max-w-2xl">
                            Manage catalogs, reference data, and application-wide defaults used across the fleet.
                        </p>
                    </div>

                    {/* Section switcher */}
                    {SECTIONS.length > 1 && (
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            {SECTIONS.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                        activeSection === s.id
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {activeSection === 'cargo' && <CargoCarrierSection />}
            </div>
        </div>
    );
};

export default GeneralSettingsPage;

// ─────────────────────────────────────────────────────────────────────────────
// Cargo Carrier section
// ─────────────────────────────────────────────────────────────────────────────

interface CatalogSection { key: string; label: string; items: string[] }

const DEFAULT_CATALOG: CatalogSection[] = UI_DATA.cargoEditor.sections.map(s => ({
    key: s.key,
    label: s.label,
    items: [...s.items],
}));

const DEFAULT_ITEM_SET: Record<string, Set<string>> = Object.fromEntries(
    DEFAULT_CATALOG.map(s => [s.key, new Set(s.items)]),
);

const CargoCarrierSection = () => {
    const [catalog, setCatalog] = useState<CatalogSection[]>(
        DEFAULT_CATALOG.map(s => ({ ...s, items: [...s.items] })),
    );
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [savedToast, setSavedToast] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
    const [formLabel, setFormLabel] = useState('');
    const [formCategory, setFormCategory] = useState<string>(DEFAULT_CATALOG[0]?.key ?? '');
    const [editingOriginal, setEditingOriginal] = useState<{ sectionKey: string; label: string } | null>(null);

    const rows = useMemo(() => {
        const all = catalog.flatMap(s =>
            s.items.map(item => ({
                label: item,
                categoryKey: s.key,
                categoryLabel: s.label,
                locked: DEFAULT_ITEM_SET[s.key]?.has(item) ?? false,
            })),
        );
        const q = search.trim().toLowerCase();
        return all.filter(r => {
            const matchesSearch = !q
                || r.label.toLowerCase().includes(q)
                || r.categoryLabel.toLowerCase().includes(q);
            const matchesCategory = categoryFilter === 'all' || r.categoryKey === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [catalog, search, categoryFilter]);

    const totalItems = useMemo(() => catalog.reduce((sum, s) => sum + s.items.length, 0), [catalog]);

    const openAdd = () => {
        setDialogMode('add');
        setFormLabel('');
        setFormCategory(DEFAULT_CATALOG[0]?.key ?? '');
        setEditingOriginal(null);
        setDialogOpen(true);
    };

    const openEdit = (sectionKey: string, label: string) => {
        setDialogMode('edit');
        setFormLabel(label);
        setFormCategory(sectionKey);
        setEditingOriginal({ sectionKey, label });
        setDialogOpen(true);
    };

    const submitDialog = () => {
        const label = formLabel.trim();
        if (!label || !formCategory) return;

        if (dialogMode === 'add') {
            const section = catalog.find(s => s.key === formCategory);
            if (!section) return;
            if (section.items.some(i => i.toLowerCase() === label.toLowerCase())) {
                alert(`"${label}" already exists in ${section.label}.`);
                return;
            }
            setCatalog(prev => prev.map(s =>
                s.key === formCategory ? { ...s, items: [...s.items, label] } : s,
            ));
        } else if (dialogMode === 'edit' && editingOriginal) {
            const targetSection = catalog.find(s => s.key === formCategory);
            if (!targetSection) return;

            // Collision check (ignore the row being edited)
            const conflict = targetSection.items.some(i =>
                i.toLowerCase() === label.toLowerCase()
                && !(i === editingOriginal.label && formCategory === editingOriginal.sectionKey),
            );
            if (conflict) {
                alert(`"${label}" already exists in ${targetSection.label}.`);
                return;
            }

            if (formCategory === editingOriginal.sectionKey) {
                setCatalog(prev => prev.map(s => s.key === formCategory
                    ? { ...s, items: s.items.map(i => i === editingOriginal.label ? label : i) }
                    : s,
                ));
            } else {
                // Moved to a different category — remove from old, add to new
                setCatalog(prev => prev.map(s => {
                    if (s.key === editingOriginal.sectionKey) {
                        return { ...s, items: s.items.filter(i => i !== editingOriginal.label) };
                    }
                    if (s.key === formCategory) {
                        return { ...s, items: [...s.items, label] };
                    }
                    return s;
                }));
            }
        }

        setDialogOpen(false);
    };

    const removeItem = (sectionKey: string, label: string) => {
        if (DEFAULT_ITEM_SET[sectionKey]?.has(label)) return;
        if (!confirm(`Remove "${label}"?`)) return;
        setCatalog(prev => prev.map(s => s.key === sectionKey
            ? { ...s, items: s.items.filter(i => i !== label) }
            : s,
        ));
    };

    const resetCatalog = () => {
        if (confirm('Reset the cargo catalog to the default list? Any items you added will be removed.')) {
            setCatalog(DEFAULT_CATALOG.map(s => ({ ...s, items: [...s.items] })));
        }
    };

    const saveCatalog = () => {
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2200);
    };

    const editingRowIsLocked = !!(editingOriginal && DEFAULT_ITEM_SET[editingOriginal.sectionKey]?.has(editingOriginal.label));

    return (
        <div className="flex flex-col space-y-4">
            {/* Section title + actions */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                        <Package className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">Cargo Carrier Catalog</h2>
                        <p className="text-xs text-slate-500">
                            Commodities shown in Edit Cargo Carried on the carrier profile. Defaults are locked.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={resetCatalog}
                        className="text-slate-700"
                    >
                        Reset to defaults
                    </Button>
                    <Button
                        onClick={saveCatalog}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                        <Save className="w-4 h-4" /> Save Changes
                    </Button>
                </div>
            </div>

            {savedToast && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                    Cargo catalog saved.
                </div>
            )}

            {/* Filter bar */}
            <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:space-y-0 lg:gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search cargo label or category..."
                        className="pl-9 bg-white"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full lg:w-[280px] bg-white">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {catalog.map(s => (
                            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0">
                    <Plus className="w-4 h-4" /> Add Cargo
                </Button>
            </div>

            <div className="text-xs text-slate-500">
                Showing <span className="font-semibold text-slate-700">{rows.length}</span> of{' '}
                <span className="font-semibold text-slate-700">{totalItems}</span> commodities.
            </div>

            {/* Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                Label
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider w-32">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                    No cargo types match your filters.
                                </td>
                            </tr>
                        ) : rows.map(row => (
                            <tr key={`${row.categoryKey}:${row.label}`} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-3.5 align-middle">
                                    <div className="flex items-center gap-2">
                                        {row.locked ? (
                                            <Lock className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                        ) : (
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        )}
                                        <span className={row.locked ? 'font-medium text-slate-900' : 'font-semibold text-blue-700'}>
                                            {row.label}
                                        </span>
                                        {!row.locked && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                                                Added
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-3.5 align-middle text-slate-700">{row.categoryLabel}</td>
                                <td className="px-6 py-3.5 text-center align-middle">
                                    {row.locked ? (
                                        <span className="text-[11px] text-slate-400 italic">default</span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => openEdit(row.categoryKey, row.label)}
                                                className="text-slate-600 hover:text-blue-600 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => removeItem(row.categoryKey, row.label)}
                                                className="text-slate-600 hover:text-red-600 transition-colors ml-1"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <Lock className="w-3 h-3" /> Default commodities are locked. Added items show an{' '}
                <span className="font-bold text-blue-600">Added</span> badge and can be edited or deleted.
            </p>

            {/* Add / Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogMode === 'add' ? 'Add Cargo Type' : 'Edit Cargo Type'}
                        </DialogTitle>
                    </DialogHeader>

                    {editingRowIsLocked ? (
                        <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3 flex items-start gap-2">
                            <Lock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                            <span>This is a default cargo type and cannot be edited.</span>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label htmlFor="cargo-label">Label</Label>
                                <Input
                                    id="cargo-label"
                                    autoFocus
                                    value={formLabel}
                                    onChange={e => setFormLabel(e.target.value)}
                                    placeholder="e.g. Propane Cylinders"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="cargo-category">Category</Label>
                                <Select value={formCategory} onValueChange={setFormCategory}>
                                    <SelectTrigger id="cargo-category">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {catalog.map(s => (
                                            <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            {editingRowIsLocked ? 'Close' : 'Cancel'}
                        </Button>
                        {!editingRowIsLocked && (
                            <Button
                                onClick={submitDialog}
                                disabled={!formLabel.trim()}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {dialogMode === 'add' ? 'Add' : 'Save Changes'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
