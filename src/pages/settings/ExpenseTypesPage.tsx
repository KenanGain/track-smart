import React, { Fragment, useState, useMemo } from 'react';
import { Plus, Check, Building2, Truck, User, ArrowLeft, Save, Receipt, Repeat, FileCheck2, TrendingUp, Lock as LockIcon, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ListScrollFrame } from '@/components/ui/ListScrollFrame';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from '@/components/ui/list-header-bridge';
import { usePageChrome } from '@/components/ui/PageChrome';
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from '@/components/ui/ListChrome';
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from '@/components/ui/list-chrome';
import { RowActions } from '@/components/ui/RowActions';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { INITIAL_EXPENSE_TYPES, type ExpenseType, type ExpenseCategory, type ExpenseSubCategory, type ExpenseEntityType, type ExpenseFrequency } from './expenses.data';
import { useAppData } from '@/context/AppDataContext';
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DocumentTypeEditor } from "@/components/settings/DocumentTypeEditor"
import { Bell } from "lucide-react"

// --- Components ---

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className}`}>
        {children}
    </span>
);
import { useBackAwareView } from '@/lib/use-back-aware-view';

type EntityTab = 'all' | ExpenseEntityType;
const ENTITY_TABS: { id: EntityTab; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All expense types', icon: LayoutGrid },
    { id: 'Carrier', label: 'Carrier', icon: Building2 },
    { id: 'Asset', label: 'Asset', icon: Truck },
    { id: 'Driver', label: 'Driver', icon: User },
];
type Col = 'name' | 'entity' | 'classification' | 'configuration' | 'description';
const COLUMNS: PickerColumn<Col>[] = [
    { id: 'name', label: 'Expense name', locked: true },
    { id: 'entity', label: 'Entity' },
    { id: 'classification', label: 'Classification' },
    { id: 'configuration', label: 'Configuration' },
    { id: 'description', label: 'Description' },
];
type GroupBy = 'none' | 'entity' | 'category' | 'subCategory';
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: 'none', label: 'No grouping' },
    { id: 'entity', label: 'Group: Entity' },
    { id: 'category', label: 'Group: Variable / Fixed' },
    { id: 'subCategory', label: 'Group: Sub-category' },
];
const CATEGORY_LABEL: Record<ExpenseCategory, string> = { variable: 'Variable', fixed: 'Fixed' };
const SUB_LABEL: Record<ExpenseSubCategory, string> = { operational: 'Operational', compliance: 'Compliance', recurring: 'Recurring', other: 'Other' };
const CONFIG_OPTIONS = ['Recurring', 'Document required', 'Neither'];
const ENTITY_ICON: Record<ExpenseEntityType, React.ElementType> = { Carrier: Building2, Asset: Truck, Driver: User };

const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={cn('px-4 py-2.5 text-sm align-middle whitespace-nowrap', className)}>{children}</td>
);

export const ExpenseTypesPage = () => {
    // --- State ---
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(INITIAL_EXPENSE_TYPES);
    const [isEditing, setIsEditing] = useState(false);
    // Back leaves the editor rather than the app.
    useBackAwareView(isEditing, () => setIsEditing(false), "expense-type");
    const [editingType, setEditingType] = useState<ExpenseType | null>(null);
    const [tab, setTab] = useState<EntityTab>('all');
    const { scrollRef, onScroll, condensed, bridge } = usePageChrome(tab);

    // --- Actions ---
    const handleDelete = (id: string) => setExpenseTypes(prev => prev.filter(t => t.id !== id));

    const handleSave = (type: ExpenseType) => {
        if (editingType) {
            setExpenseTypes(prev => prev.map(t => t.id === type.id ? type : t));
        } else {
            setExpenseTypes(prev => [...prev, { ...type, id: `exp_${Math.random().toString(36).substr(2, 9)}` }]);
        }
        setIsEditing(false);
        setEditingType(null);
    };

    const startEditing = (type?: ExpenseType) => {
        setEditingType(type || null);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditingType(null);
    };

    if (isEditing) {
        return (
            <ExpenseTypeEditor
                initialData={editingType}
                onSave={handleSave}
                onCancel={cancelEditing}
            />
        );
    }

    const tabCount = (t: EntityTab) => (t === 'all' ? expenseTypes.length : expenseTypes.filter(x => x.entityType === t).length);

    return (
        <ListHeaderBridge value={bridge.value}>
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
                <ListPageHeader
                    Icon={Receipt}
                    title="Expense Types"
                    description="The expense categories drivers and the office record against a carrier, an asset or a driver — and what each one requires."
                    condensed={condensed}
                    chips={bridge.chips ?? undefined}
                    tabs={ENTITY_TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon, count: tabCount(t.id) }))}
                    activeTab={tab}
                    onTabChange={(id) => setTab(id as EntityTab)}
                    tabsLabel="Expense entities"
                    showZeroCounts
                    actions={
                        <Button onClick={() => startEditing()} className={cn('gap-2 bg-blue-600 text-white hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}>
                            <Plus size={16} /> Add expense type
                        </Button>
                    }
                />
                <ExpenseTypesList
                    key={tab}
                    types={tab === 'all' ? expenseTypes : expenseTypes.filter(t => t.entityType === tab)}
                    tabLabel={ENTITY_TABS.find(t => t.id === tab)!.label}
                    showEntity={tab === 'all'}
                    onEdit={startEditing}
                    onDelete={(t) => handleDelete(t.id)}
                    scrollRef={scrollRef}
                    onScroll={onScroll}
                />
            </div>
        </ListHeaderBridge>
    );
};

function ExpenseTypesList({ types, tabLabel, showEntity, onEdit, onDelete, scrollRef, onScroll }: {
    types: ExpenseType[];
    tabLabel: string;
    showEntity: boolean;
    onEdit: (t: ExpenseType) => void;
    onDelete: (t: ExpenseType) => void;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [sub, setSub] = useState('');
    const [config, setConfig] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map(c => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const stats: KpiStat[] = [
        { id: 'all', label: 'Expense types', value: types.length, Icon: Receipt, accent: 'blue' },
        { id: 'variable', label: 'Variable', value: types.filter(t => t.category === 'variable').length, Icon: TrendingUp, accent: 'sky' },
        { id: 'fixed', label: 'Fixed', value: types.filter(t => t.category === 'fixed').length, Icon: LockIcon, accent: 'violet' },
        { id: 'recurring', label: 'Recurring', value: types.filter(t => t.isRecurring).length, Icon: Repeat, accent: 'amber' },
        { id: 'docs', label: 'Document required', value: types.filter(t => t.documentRequired).length, Icon: FileCheck2, accent: 'emerald' },
    ];
    const kpiActive = category ? category : config === 'Recurring' ? 'recurring' : config === 'Document required' ? 'docs' : !sub && !config ? 'all' : '';
    const pickKpi = (id: string) => {
        setPage(1);
        if (id === 'all') { setCategory(''); setConfig(''); return; }
        if (id === 'variable' || id === 'fixed') { setConfig(''); setCategory(c => (c === id ? '' : id)); return; }
        setCategory('');
        const want = id === 'recurring' ? 'Recurring' : 'Document required';
        setConfig(c => (c === want ? '' : want));
    };
    useHeaderChips(chipsFromStats(stats, kpiActive, pickKpi));

    const q = search.trim().toLowerCase();
    const rows = types.filter(t => {
        if (category && t.category !== category) return false;
        if (sub && SUB_LABEL[t.subCategory] !== sub) return false;
        if (config === 'Recurring' && !t.isRecurring) return false;
        if (config === 'Document required' && !t.documentRequired) return false;
        if (config === 'Neither' && (t.isRecurring || t.documentRequired)) return false;
        return !q || [t.name, t.category, t.subCategory, t.entityType, t.description ?? ''].some(x => x.toLowerCase().includes(q));
    });
    const readers = useMemo(() => ({
        name: (t: ExpenseType) => t.name,
        entity: (t: ExpenseType) => t.entityType,
        classification: (t: ExpenseType) => `${t.category} ${t.subCategory}`,
        configuration: (t: ExpenseType) => (t.isRecurring ? 0 : t.documentRequired ? 1 : 2),
        description: (t: ExpenseType) => t.description ?? '',
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, ExpenseType>(rows, readers, null);
    const groupOf = (t: ExpenseType): { rank: number | string; label: string } | null =>
        groupBy === 'entity' ? { rank: ['Carrier', 'Asset', 'Driver'].indexOf(t.entityType), label: t.entityType }
            : groupBy === 'category' ? { rank: t.category === 'variable' ? 0 : 1, label: CATEGORY_LABEL[t.category] }
                : groupBy === 'subCategory' ? { rank: Object.keys(SUB_LABEL).indexOf(t.subCategory), label: SUB_LABEL[t.subCategory] }
                    : null;
    const grouped = groupBy === 'none' ? sorted : sorted
        .map((t, i) => ({ t, i, g: groupOf(t)! }))
        .sort((x, y) => (Number(x.g.rank) - Number(y.g.rank)) || x.i - y.i)
        .map(x => x.t);
    const groupCounts = new Map<string, number>();
    if (groupBy !== 'none') grouped.forEach(t => { const l = groupOf(t)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
    const show = (c: Col) => visible.has(c) && (c !== 'entity' || showEntity);
    const colCount = COLUMNS.filter(c => c.locked || show(c.id)).length + 1;
    const filterCount = [!!category, !!sub, !!config, groupBy !== 'none'].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setSearch(''); setCategory(''); setSub(''); setConfig(''); setGroupBy('none'); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    return (
        <ListScrollFrame
            above={<KpiStatRow stats={stats} activeId={kpiActive} onPick={pickKpi} />}
            title={tabLabel === 'All expense types' ? 'Expense types' : `${tabLabel} expense types`}
            count={grouped.length}
            total={types.length}
            description="Each type says whether it varies or is fixed, whether it repeats, and what document has to come with it — click a row to edit it."
            actions={<ColumnPicker columns={showEntity ? COLUMNS : COLUMNS.filter(c => c.id !== 'entity')} visible={visible}
                onToggle={(id) => setVisible(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search expense types…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={category ? CATEGORY_LABEL[category as ExpenseCategory] : ''} title="Variable or fixed" allLabel="Variable and fixed"
                            options={['Variable', 'Fixed']} onChange={toPage1((v: string) => setCategory(v === 'Variable' ? 'variable' : v === 'Fixed' ? 'fixed' : ''))} />
                        <FilterSelect value={sub} onChange={toPage1(setSub)} title="Sub-category" allLabel="All sub-categories" options={Object.values(SUB_LABEL)} />
                        <FilterSelect value={config} onChange={toPage1(setConfig)} title="Configuration" allLabel="Any configuration" options={CONFIG_OPTIONS} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={showEntity ? GROUPS : GROUPS.filter(g => g.id !== 'entity')} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="name" label="Expense name" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show('entity') && <SortTh col="entity" label="Entity" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show('classification') && <SortTh col="classification" label="Classification" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show('configuration') && <SortTh col="configuration" label="Configuration" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show('description') && <SortTh col="description" label="Description" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <Receipt className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{types.length ? 'No expense type matches' : 'No expense types here yet'}</p>
                                {touched && (
                                    <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((type, i) => {
                        const g = groupOf(type);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const EIcon = ENTITY_ICON[type.entityType];
                        return (
                            <Fragment key={type.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onEdit(type)}>
                                    <TD>
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Receipt size={14} /></span>
                                            <span className="font-semibold text-slate-900">{type.name}</span>
                                        </div>
                                    </TD>
                                    {show('entity') && (
                                        <TD><span className="inline-flex items-center gap-1.5 text-[13px] text-slate-600"><EIcon size={14} className="text-slate-400" /> {type.entityType}</span></TD>
                                    )}
                                    {show('classification') && (
                                        <TD>
                                            <span className="inline-flex items-center gap-1.5">
                                                <Badge className={type.category === 'variable' ? 'border border-blue-100 bg-blue-50 text-blue-700' : 'border border-purple-100 bg-purple-50 text-purple-700'}>
                                                    {CATEGORY_LABEL[type.category]}
                                                </Badge>
                                                <span className="text-xs text-slate-500">· {SUB_LABEL[type.subCategory]}</span>
                                            </span>
                                        </TD>
                                    )}
                                    {show('configuration') && (
                                        <TD>
                                            <span className="inline-flex items-center gap-1.5">
                                                {type.isRecurring && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700"><Repeat size={11} /> Recurring{type.frequency ? ` · ${type.frequency}` : ''}</span>}
                                                {type.documentRequired && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700"><Check size={11} /> Document</span>}
                                                {!type.isRecurring && !type.documentRequired && <span className="text-xs text-slate-300">—</span>}
                                            </span>
                                        </TD>
                                    )}
                                    {show('description') && (
                                        <TD className="max-w-[22rem] truncate text-[13px] text-slate-500"><span title={type.description}>{type.description || '—'}</span></TD>
                                    )}
                                    <td className={cn('px-4 py-2.5', PIN_TD_ACTIONS)} onClick={(e) => e.stopPropagation()}>
                                        <RowActions noun="expense type" name={type.name} onEdit={() => onEdit(type)} onDelete={() => onDelete(type)} />
                                    </td>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}

// --- Editor Component (Dedicated Form) ---

const ExpenseTypeEditor = ({ initialData, onSave, onCancel }: { 
    initialData: ExpenseType | null;
    onSave: (data: ExpenseType) => void;
    onCancel: () => void;
}) => {
    const [formData, setFormData] = useState<Partial<ExpenseType>>(initialData || {
        name: "",
        entityType: "Asset",
        category: "variable",
        subCategory: "operational",
        isRecurring: false,
        frequency: null,
        dateRequired: true,
        documentRequired: false,
        documentTypeId: null,
        description: ""
    });

    const { documents, addDocument } = useAppData();
    const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

    // Filter documents based on entity type
    const availableDocuments = useMemo(() => {
        const type = (formData.entityType || 'asset').toLowerCase();
        return documents.filter(doc => doc.relatedTo.toLowerCase() === type);
    }, [formData.entityType, documents]);

    const handleSaveNewDocument = (data: Partial<any>) => {
        const newDocId = Math.random().toString(36).substr(2, 9);
        const newDoc: any = {
            id: newDocId,
            name: data.name || 'New Document',
            relatedTo: (formData.entityType || 'Asset').toLowerCase(),
            expiryRequired: data.expiryRequired ?? true,
            issueDateRequired: data.issueDateRequired ?? false,
            issueStateRequired: data.issueStateRequired ?? false,
            issueCountryRequired: data.issueCountryRequired ?? false,
            status: data.status || 'Active',
            selectedTags: {},
            requirementLevel: data.requirementLevel || 'required',
            ...data
        };
        addDocument(newDoc);
        
        // Select the new document
        setFormData(prev => ({ 
            ...prev, 
            documentTypeId: newDocId,
            documentRequired: true
        }));
        setIsAddDocModalOpen(false);
    }

    // Logic: If Sub-Category changes to 'recurring', auto-enable isRecurring and force Date Required
    const handleSubCategoryChange = (val: ExpenseSubCategory) => {
        const isRecurring = val === 'recurring';
        setFormData(prev => ({ 
            ...prev, 
            subCategory: val,
            isRecurring: isRecurring ? true : prev.isRecurring,
            dateRequired: isRecurring ? true : prev.dateRequired
        }));
    };

    // Logic: When Recurring is toggled, if ON -> Date Required MUST be ON
    const handleRecurringToggle = (checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            isRecurring: checked,
            dateRequired: checked ? true : prev.dateRequired // Force date required if recurring
        }));
    };
    
    // Logic: When Document Type is selected, Document Required MUST be ON
    const handleDocumentTypeChange = (docId: string) => {
        setFormData(prev => ({
            ...prev,
            documentTypeId: docId || null,
            documentRequired: docId ? true : prev.documentRequired
        }));
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* Header — the same band as the list, with the way back and the save */}
            <ListPageHeader
                Icon={Receipt}
                title={initialData ? `Edit expense type · ${initialData.name}` : 'New expense type'}
                description={initialData ? 'Update its classification, requirements and documents.' : 'Configure a new expense category and what it requires.'}
                condensed={false}
                actions={<>
                    <Button variant="outline" className="h-9 gap-1.5" onClick={onCancel}>
                        <ArrowLeft className="h-4 w-4" /> Back to expense types
                    </Button>
                    <Button
                        onClick={() => onSave(formData as ExpenseType)}
                        disabled={!formData.name}
                        className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Save className="h-4 w-4" />
                        Save changes
                    </Button>
                </>}
            />

            {/* Scrollable Content */}
            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
                <div className="max-w-4xl space-y-6">
                    
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="h-6 w-1 rounded-full bg-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
                        </div>
                        
                        {/* Name - Full Width */}
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-slate-700">Expense Type Name <span className="text-rose-500">*</span></label>
                            <input 
                                className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-slate-400"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Fuel, Insurance"
                            />
                        </div>

                        {/* Related To (Entity Type) - Radio Cards */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                Related To <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {['Carrier', 'Asset', 'Driver'].map((type) => {
                                    const isSelected = formData.entityType === type;
                                    const icons = {
                                        Carrier: <Building2 className="h-5 w-5" />,
                                        Asset: <Truck className="h-5 w-5" />,
                                        Driver: <User className="h-5 w-5" />
                                    };
                                    return (
                                        <div 
                                            key={type}
                                            onClick={() => setFormData(prev => ({ ...prev, entityType: type as ExpenseEntityType, documentTypeId: null }))}
                                            className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all relative ${isSelected ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                        >
                                            <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            
                                            <div className={`p-3 rounded-full ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {icons[type as keyof typeof icons]}
                                            </div>
                                            <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{type}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Category</label>
                                <select 
                                    className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all hover:border-slate-400"
                                    value={formData.category}
                                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                                >
                                    <option value="variable">Variable</option>
                                    <option value="fixed">Fixed</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Sub-Category</label>
                                 <select 
                                    className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all hover:border-slate-400"
                                    value={formData.subCategory}
                                    onChange={e => handleSubCategoryChange(e.target.value as ExpenseSubCategory)}
                                >
                                    <option value="operational">Operational</option>
                                    <option value="compliance">Compliance</option>
                                    <option value="recurring">Recurring</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <textarea 
                                className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none transition-all hover:border-slate-400"
                                value={formData.description || ""}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>

                    {/* Requirements Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="h-6 w-1 rounded-full bg-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Requirements</h2>
                        </div>
                        
                        {/* Recurring Logic Block */}
                         <div className={`rounded-xl border p-5 space-y-4 transition-colors ${formData.subCategory === 'recurring' ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                             <div className="flex items-center justify-between">
                                <div>
                                    <span className={`block text-sm font-medium ${formData.subCategory === 'recurring' ? 'text-slate-900' : 'text-slate-500'}`}>Allow Recurring Schedule</span>
                                    <span className="block text-xs text-slate-500">Enable if this expense repeats (e.g. subscriptions)</span>
                                </div>
                                <Toggle 
                                    checked={formData.isRecurring} 
                                    onCheckedChange={handleRecurringToggle} 
                                    disabled={formData.subCategory !== 'recurring'}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                             {formData.isRecurring && (
                                <div className="animate-in slide-in-from-top-1 fade-in pt-3 border-t border-slate-200 mt-3">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Default Frequency</label>
                                    <select 
                                        className="w-full max-w-xs border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all hover:border-slate-400"
                                        value={formData.frequency || ""}
                                        onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as ExpenseFrequency }))}
                                    >
                                        <option value="">Select Frequency...</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annually">Annually</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Date Required Toggle */}
                             <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300">
                                <div>
                                    <span className="text-sm font-medium text-slate-900">Is Date Required?</span>
                                    <p className="text-xs text-slate-500">Must enter a date for expense</p>
                                </div>
                                <Toggle 
                                    checked={formData.dateRequired} 
                                    onCheckedChange={checked => setFormData(prev => ({ ...prev, dateRequired: checked }))} 
                                    disabled={formData.isRecurring} // Lock if Recurring is ON
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                            {/* Document Required Toggle */}
                             <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <span className="text-sm font-medium text-slate-900">Supporting Document Required?</span>
                                    <p className="text-xs text-slate-500">Requires an upload and validates against document type</p>
                                </div>
                                <Toggle 
                                    checked={formData.documentRequired} 
                                    onCheckedChange={checked => setFormData(prev => ({ ...prev, documentRequired: checked }))} 
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>
                        </div>

                        {/* Linked Document Type Selection */}
                        {formData.documentRequired && (
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    Link to Document Type <span className="text-rose-500">*</span>
                                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Auto-syncs settings
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.documentTypeId || ""}
                                        onChange={(e) => handleDocumentTypeChange(e.target.value)}
                                        className="flex-1 h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Select a document type...</option>
                                        {availableDocuments
                                            .filter(doc => doc.status === 'Active')
                                            .map(doc => (
                                                <option key={doc.id} value={doc.id}>{doc.name}</option>
                                            ))
                                        }
                                    </select>
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={() => setIsAddDocModalOpen(true)}
                                        className="h-10 w-10 shrink-0 bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                        title="Create new document type"
                                   >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-blue-600 flex items-center gap-1">
                                    <Bell className="h-3 w-3" />
                                    Selecting a document type will sync expiry, issue date, and monitoring settings.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Document Modal */}
            <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
                    <div className="h-full flex flex-col">
                        <DocumentTypeEditor
                            initialData={null}
                            onSave={handleSaveNewDocument}
                            onCancel={() => setIsAddDocModalOpen(false)}
                            defaultRelatedTo={(formData.entityType || 'Asset').toLowerCase() as any}
                            showHeader={true} 
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
