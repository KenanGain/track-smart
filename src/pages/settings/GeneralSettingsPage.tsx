import React, { Fragment, forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Plus, Lock, Package, Save, RotateCcw, Layers, Sparkles, Sliders, Pencil, Trash2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ListScrollFrame } from '@/components/ui/ListScrollFrame';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from '@/components/ui/list-header-bridge';
import { usePageChrome } from '@/components/ui/PageChrome';
import {
    FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager, useTableSort,
} from '@/components/ui/ListChrome';
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from '@/components/ui/list-chrome';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { UI_DATA } from '@/pages/profile/carrier-profile.data';

// ─────────────────────────────────────────────────────────────────────────────
// Settings ▸ General Settings — catalogs and reference data used across the fleet.
//
// Each catalog is a tab in the page header. One so far: the cargo catalog that Edit Cargo
// Carried on the carrier profile picks from. Add more sections to SECTIONS as they are built.
// ─────────────────────────────────────────────────────────────────────────────

type SectionId = 'cargo';

const SECTIONS: { id: SectionId; label: string; icon: React.ElementType }[] = [
    { id: 'cargo', label: 'Cargo catalog', icon: Package },
];

/** What the header asks the cargo section to do — its own Add dialog. */
type CargoHandle = { openAdd: () => void };

export const GeneralSettingsPage = () => {
    const [activeSection, setActiveSection] = useState<SectionId>('cargo');
    const { scrollRef, onScroll, condensed, bridge } = usePageChrome(activeSection);
    const cargo = React.useRef<CargoHandle>(null);
    const [cargoCount, setCargoCount] = useState(0);

    return (
        <ListHeaderBridge value={bridge.value}>
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
                <ListPageHeader
                    Icon={Sliders}
                    title="General Settings"
                    description="Catalogs, reference data and application-wide defaults used across the fleet."
                    condensed={condensed}
                    chips={bridge.chips ?? undefined}
                    tabs={SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, count: s.id === 'cargo' ? cargoCount : undefined }))}
                    activeTab={activeSection}
                    onTabChange={(id) => setActiveSection(id as SectionId)}
                    tabsLabel="General settings sections"
                    actions={activeSection === 'cargo' && (
                        <Button onClick={() => cargo.current?.openAdd()} className={cn('gap-2 bg-blue-600 text-white hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}>
                            <Plus className="h-4 w-4" /> Add cargo
                        </Button>
                    )}
                />
                {activeSection === 'cargo' && (
                    <CargoCarrierSection ref={cargo} scrollRef={scrollRef} onScroll={onScroll} onCount={setCargoCount} />
                )}
            </div>
        </ListHeaderBridge>
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

type Row = { label: string; categoryKey: string; categoryLabel: string; locked: boolean };
type Col = 'label' | 'category' | 'type';
type GroupBy = 'none' | 'category' | 'type';
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: 'none', label: 'No grouping' },
    { id: 'category', label: 'Group: Category' },
    { id: 'type', label: 'Group: Default / Added' },
];
const TYPES = ['Default', 'Added'];

const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn('px-4 py-2.5 text-sm align-middle whitespace-nowrap', className)}>{children}</td>
);

const CargoCarrierSection = forwardRef<CargoHandle, {
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    onCount?: (n: number) => void;
}>(function CargoCarrierSection({ scrollRef, onScroll, onCount }, ref) {
    const [catalog, setCatalog] = useState<CatalogSection[]>(
        DEFAULT_CATALOG.map(s => ({ ...s, items: [...s.items] })),
    );
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [savedToast, setSavedToast] = useState(false);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
    const [formLabel, setFormLabel] = useState('');
    const [formCategory, setFormCategory] = useState<string>(DEFAULT_CATALOG[0]?.key ?? '');
    const [editingOriginal, setEditingOriginal] = useState<{ sectionKey: string; label: string } | null>(null);

    const all = useMemo<Row[]>(() => catalog.flatMap(s =>
        s.items.map(item => ({
            label: item,
            categoryKey: s.key,
            categoryLabel: s.label,
            locked: DEFAULT_ITEM_SET[s.key]?.has(item) ?? false,
        })),
    ), [catalog]);
    useEffect(() => { onCount?.(all.length); }, [all.length, onCount]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all.filter(r => {
            if (categoryFilter && r.categoryLabel !== categoryFilter) return false;
            if (typeFilter && (r.locked ? 'Default' : 'Added') !== typeFilter) return false;
            return !q || r.label.toLowerCase().includes(q) || r.categoryLabel.toLowerCase().includes(q);
        });
    }, [all, search, categoryFilter, typeFilter]);

    const readers = useMemo(() => ({
        label: (r: Row) => r.label,
        category: (r: Row) => r.categoryLabel,
        type: (r: Row) => (r.locked ? 1 : 0),
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, Row>(rows, readers, null);
    const groupOf = (r: Row): { rank: number | string; label: string } | null =>
        groupBy === 'category' ? { rank: catalog.findIndex(s => s.key === r.categoryKey), label: r.categoryLabel }
            : groupBy === 'type' ? { rank: r.locked ? 1 : 0, label: r.locked ? 'Default' : 'Added' }
                : null;
    const grouped = groupBy === 'none' ? sorted : sorted
        .map((r, i) => ({ r, i, g: groupOf(r)! }))
        .sort((x, y) => (Number(x.g.rank) - Number(y.g.rank)) || x.i - y.i)
        .map(x => x.r);
    const groupCounts = new Map<string, number>();
    if (groupBy !== 'none') grouped.forEach(r => { const l = groupOf(r)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const added = all.filter(r => !r.locked).length;
    const stats: KpiStat[] = [
        { id: 'all', label: 'Commodities', value: all.length, Icon: Package, accent: 'blue' },
        { id: 'Default', label: 'Defaults (locked)', value: all.length - added, Icon: Lock, accent: 'slate' },
        { id: 'Added', label: 'Added by you', value: added, Icon: Sparkles, accent: 'violet' },
        { id: 'categories', label: 'Categories', value: catalog.length, Icon: Layers, accent: 'emerald' },
    ];
    const pickKpi = (id: string) => {
        if (id === 'categories') { setGroupBy(g => (g === 'category' ? 'none' : 'category')); return; }
        setPage(1);
        setTypeFilter(id === 'all' || typeFilter === id ? '' : id);
    };
    const kpiActive = typeFilter || 'all';
    useHeaderChips(chipsFromStats(stats, kpiActive, pickKpi));

    const filterCount = [!!categoryFilter, !!typeFilter, groupBy !== 'none'].filter(Boolean).length;
    const touched = filterCount > 0 || !!search.trim();
    const reset = () => { setSearch(''); setCategoryFilter(''); setTypeFilter(''); setGroupBy('none'); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    const openAdd = () => {
        setDialogMode('add');
        setFormLabel('');
        setFormCategory(DEFAULT_CATALOG[0]?.key ?? '');
        setEditingOriginal(null);
        setDialogOpen(true);
    };
    useImperativeHandle(ref, () => ({ openAdd }));

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
        <>
            <ListScrollFrame
                above={<>
                    {savedToast && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                            Cargo catalog saved.
                        </div>
                    )}
                    <KpiStatRow stats={stats} activeId={kpiActive} onPick={pickKpi} />
                </>}
                title="Cargo carrier catalog"
                count={grouped.length}
                total={all.length}
                description={<>Commodities shown in Edit Cargo Carried on the carrier profile. <Lock className="inline h-3 w-3 -mt-0.5" /> Defaults are locked; the ones you add can be edited or removed.</>}
                actions={<>
                    <Button variant="outline" onClick={resetCatalog} className="h-9 gap-1.5 text-slate-700"><RotateCcw className="h-4 w-4" /> Reset to defaults</Button>
                    <Button onClick={saveCatalog} className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"><Save className="h-4 w-4" /> Save changes</Button>
                </>}
                scrollRef={scrollRef}
                onScroll={onScroll}
                contentKey={`${filtersOpen}|${slice.length}|${savedToast}`}
                toolbar={
                    <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search cargo label or category…"
                        filters={<div className={mobileFold(filtersOpen)}>
                            <FilterSelect value={categoryFilter} onChange={toPage1(setCategoryFilter)} title="Category" allLabel="All categories" options={catalog.map(s => s.label)} />
                            <FilterSelect value={typeFilter} onChange={toPage1(setTypeFilter)} title="Default or added" allLabel="Defaults and added" options={TYPES} />
                        </div>}
                        filtersExtra={<>
                            <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
                            <div className={mobileFold(filtersOpen)}>
                                <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={GROUPS} />
                                <ResetFilters on={touched} onReset={reset} />
                            </div>
                        </>} />
                }
                footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
            >
                <table className="w-full">
                    <thead>
                        <tr>
                            <SortTh col="label" label="Label" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                            <SortTh col="category" label="Category" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                            <SortTh col="type" label="Type" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                            <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {slice.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-14 text-center">
                                    <Package className="mx-auto h-7 w-7 text-slate-300" />
                                    <p className="mt-3 text-sm font-semibold text-slate-700">No cargo types match your filters</p>
                                    {touched && (
                                        <button type="button" onClick={reset}
                                            className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                            Clear filters
                                        </button>
                                    )}
                                </td>
                            </tr>
                        )}
                        {slice.map((row, i) => {
                            const g = groupOf(row);
                            const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                            return (
                                <Fragment key={`${row.categoryKey}:${row.label}`}>
                                    {g && (!prev || prev.label !== g.label) && (
                                        <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={4} />
                                    )}
                                    <tr className={cn('group transition-colors hover:bg-slate-50', !row.locked && 'cursor-pointer')}
                                        onClick={() => !row.locked && openEdit(row.categoryKey, row.label)}>
                                        <TD>
                                            <div className="flex items-center gap-2">
                                                {row.locked
                                                    ? <Lock className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                                                    : <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
                                                <span className={row.locked ? 'font-medium text-slate-900' : 'font-semibold text-blue-700'}>{row.label}</span>
                                            </div>
                                        </TD>
                                        <TD className="text-[13px] text-slate-700">{row.categoryLabel}</TD>
                                        <TD>
                                            {row.locked
                                                ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Lock className="h-2.5 w-2.5" /> Default</span>
                                                : <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">Added</span>}
                                        </TD>
                                        <TD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                            {!row.locked && (
                                                <KebabMenu title={`Actions for ${row.label}`} items={[
                                                    { label: 'Edit cargo type', icon: Pencil, onClick: () => openEdit(row.categoryKey, row.label) },
                                                    { label: 'Delete cargo type', icon: Trash2, danger: true, onClick: () => removeItem(row.categoryKey, row.label) },
                                                ]} />
                                            )}
                                        </TD>
                                    </tr>
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </ListScrollFrame>

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
        </>
    );
});
