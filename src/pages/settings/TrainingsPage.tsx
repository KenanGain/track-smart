import React, { Fragment, useMemo, useState } from "react";
import { GraduationCap, Plus, Check, X, Clock, FileText, Bell, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRAINING_TYPES, TRAINING_CATEGORIES } from "@/data/training.data";
import type { TrainingType } from "@/types/training.types";
import { TrainingEditModal } from "./TrainingEditModal";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from "@/components/ui/list-header-bridge";
import { usePageChrome } from "@/components/ui/PageChrome";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { RowActions } from "@/components/ui/RowActions";

// Helper Components
const StatusBadge = ({ status }: { status: 'active' | 'inactive' }) => {
    if (status === 'active') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
        </span>
    );
};

const MandatoryBadge = ({ mandatory }: { mandatory: boolean }) => {
    if (mandatory) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                Required
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium uppercase tracking-wider">
            Optional
        </span>
    );
};

const buildProjectedNotificationText = (
    monitorBasedOn: "expiry_date" | "issue_date",
    reminderDays: number[]
) => {
    const basedOnLabel = monitorBasedOn === "expiry_date" ? "Expiry Date" : "Issue Date";
    if (reminderDays.length === 0) {
        return `Monitor ${basedOnLabel}. No reminders configured.`;
    }

    const sortedDays = [...reminderDays].sort((a, b) => b - a);
    return `Monitor ${basedOnLabel}. Reminders at ${sortedDays.map(day => `${day} day${day > 1 ? "s" : ""}`).join(", ")} before.`;
};

/** A new, empty training type — the editor fills it in. */
const blankTraining = (category: string): TrainingType => ({
    id: `trn-${Date.now().toString(36)}`,
    name: "",
    category,
    status: "active",
    defaultMandatory: false,
    defaultDueDays: 30,
    defaultDeliveryModes: ["online"],
    defaultDocuments: { required: false, documentTypeIds: [] },
    defaultAssessment: { enabled: false, passingScore: null, maxAttempts: null },
    monitoringNotifications: {
        enabled: false,
        monitorBasedOn: "expiry_date",
        renewalRecurrence: "annual",
        notificationRemindersDaysBefore: [30],
        notificationChannels: { email: true, inApp: true, sms: false },
        projectedNotificationScheduleText: buildProjectedNotificationText("expiry_date", [30]),
    },
    tags: [],
});

const TrainingsPage = () => {
    const [trainings, setTrainings] = useState<TrainingType[]>(TRAINING_TYPES);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [selectedTraining, setSelectedTraining] = useState<TrainingType | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState<TrainingType | null>(null);

    const { scrollRef, onScroll, condensed, bridge } = usePageChrome(activeTab);
    const visibleTrainings = activeTab === "all" ? trainings : trainings.filter(t => t.category === activeTab);

    const handleView = (training: TrainingType) => {
        setSelectedTraining(training);
        setIsViewDialogOpen(true);
    };

    const handleEdit = (training: TrainingType) => {
        setEditForm(structuredClone(training));
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editForm) {
            return;
        }

        const normalizedReminders = [...editForm.monitoringNotifications.notificationRemindersDaysBefore]
            .sort((a, b) => b - a);

        const updatedTraining: TrainingType = {
            ...editForm,
            tags: editForm.tags.filter(tag => tag.trim().length > 0),
            defaultDocuments: {
                ...editForm.defaultDocuments,
                documentTypeIds: editForm.defaultDocuments.documentTypeIds.filter(id => id.trim().length > 0)
            },
            monitoringNotifications: {
                ...editForm.monitoringNotifications,
                notificationRemindersDaysBefore: normalizedReminders,
                projectedNotificationScheduleText: buildProjectedNotificationText(
                    editForm.monitoringNotifications.monitorBasedOn,
                    normalizedReminders
                )
            }
        };

        // A new one is added; an existing one is replaced where it stands.
        setTrainings(prev => prev.some(t => t.id === updatedTraining.id)
            ? prev.map(training => training.id === updatedTraining.id ? updatedTraining : training)
            : [...prev, updatedTraining]);
        setSelectedTraining(prev => prev?.id === updatedTraining.id ? updatedTraining : prev);
        setEditForm(null);
        setIsEditDialogOpen(false);
    };

    const formatDeliveryModes = (modes: string[]) => {
        const labels: Record<string, string> = {
            in_person: "In-Person",
            online: "Online",
            video: "Video",
            document_ack: "Doc Ack",
            ride_along: "Ride Along",
            simulation: "Simulation"
        };
        return modes.map(m => labels[m] || m).join(", ");
    };

    const formatRecurrence = (recurrence: string) => {
        const labels: Record<string, string> = {
            one_time: "One-Time",
            weekly: "Weekly",
            monthly: "Monthly",
            quarterly: "Quarterly",
            semi_annual: "Semi-Annual",
            annual: "Annual",
            biennial: "Biennial"
        };
        return labels[recurrence] || recurrence;
    };

    const startNew = () => {
        setEditForm(blankTraining(activeTab !== "all" ? activeTab : TRAINING_CATEGORIES[0]));
        setIsEditDialogOpen(true);
    };
    const tabCount = (id: string) => (id === "all" ? trainings.length : trainings.filter(t => t.category === id).length);

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={GraduationCap}
                title="Training Management"
                description="Training requirements, delivery methods, assessments and monitoring for driver development programs."
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                tabs={[
                    { id: "all", label: "All training types", icon: LayoutGrid, count: tabCount("all") },
                    ...TRAINING_CATEGORIES.map((c) => ({ id: c, label: c, icon: c.startsWith("Driver") ? ShieldCheck : Users, count: tabCount(c) })),
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id)}
                tabsLabel="Training categories"
                showZeroCounts
                actions={
                    <Button onClick={startNew} className={cn("gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700", condensed ? "h-8" : "h-9")}>
                        <Plus className="h-4 w-4" /> Add training type
                    </Button>
                }
            />

            <TrainingsList
                key={activeTab}
                trainings={visibleTrainings}
                tabLabel={activeTab === "all" ? "Training types" : activeTab}
                showCategory={activeTab === "all"}
                onView={handleView}
                onEdit={handleEdit}
                formatRecurrence={formatRecurrence}
                scrollRef={scrollRef}
                onScroll={onScroll}
            />

            {/* View Dialog */}
            {isViewDialogOpen && selectedTraining && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsViewDialogOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-8 pb-6 bg-white border-b border-slate-100">
                            <div className="flex items-center gap-2 mb-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                Training Details
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                                {selectedTraining.name}
                            </h2>
                            <p className="text-slate-500 mt-2 text-base">
                                {selectedTraining.category}
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <StatusBadge status={selectedTraining.status} />
                                <MandatoryBadge mandatory={selectedTraining.defaultMandatory} />
                            </div>
                        </div>

                        {/* Metrics Cards */}
                        <div className="grid grid-cols-3 gap-4 px-8 my-6">
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Due Days</span>
                                <span className="text-2xl font-bold text-slate-900">{selectedTraining.defaultDueDays}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Delivery Modes</span>
                                <span className="text-xs font-medium text-slate-700 text-center">{selectedTraining.defaultDeliveryModes.length} Options</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Assessment</span>
                                {selectedTraining.defaultAssessment.enabled ? (
                                    <span className="text-2xl font-bold text-emerald-600">{selectedTraining.defaultAssessment.passingScore}%</span>
                                ) : (
                                    <X className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="px-8 pb-8 space-y-6">
                            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Delivery Methods</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTraining.defaultDeliveryModes.map(mode => (
                                        <span key={mode} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                                            {formatDeliveryModes([mode])}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {selectedTraining.monitoringNotifications.enabled && (
                                <div className="bg-blue-50/80 rounded-2xl p-6 border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Bell className="w-3.5 h-3.5" />
                                        Monitoring & Notifications
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Recurrence:</span>
                                            <span className="font-semibold text-slate-900">{formatRecurrence(selectedTraining.monitoringNotifications.renewalRecurrence)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Based On:</span>
                                            <span className="font-semibold text-slate-900 capitalize">{selectedTraining.monitoringNotifications.monitorBasedOn.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Reminders:</span>
                                            <span className="font-semibold text-slate-900">{selectedTraining.monitoringNotifications.notificationRemindersDaysBefore.join(', ')} days before</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-100">
                                            <p className="text-xs text-blue-700 italic">{selectedTraining.monitoringNotifications.projectedNotificationScheduleText}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTraining.defaultAssessment.enabled && (
                                <div className="bg-emerald-50/80 rounded-2xl p-6 border border-emerald-100">
                                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">Assessment Configuration</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Passing Score:</span>
                                            <span className="font-bold text-emerald-700">{selectedTraining.defaultAssessment.passingScore}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Max Attempts:</span>
                                            <span className="font-semibold text-slate-900">{selectedTraining.defaultAssessment.maxAttempts || 'Unlimited'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTraining.tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-6 flex justify-end border-t border-slate-100 pt-4">
                            <Button onClick={() => setIsViewDialogOpen(false)} variant="outline" className="min-w-[100px] border-slate-200 text-slate-600">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <TrainingEditModal
                isOpen={isEditDialogOpen}
                training={editForm}
                categories={TRAINING_CATEGORIES}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setEditForm(null);
                }}
                onChange={(training) => setEditForm(training)}
                onSave={handleSaveEdit}
            />
        </div>
        </ListHeaderBridge>
    );
};

type Col = "name" | "category" | "status" | "required" | "due" | "configuration";
const COLUMNS: PickerColumn<Col>[] = [
    { id: "name", label: "Training name", locked: true },
    { id: "category", label: "Category" },
    { id: "status", label: "Status" },
    { id: "required", label: "Required" },
    { id: "due", label: "Due days" },
    { id: "configuration", label: "Configuration" },
];
type GroupBy = "none" | "category" | "status" | "required";
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "category", label: "Group: Category" },
    { id: "status", label: "Group: Status" },
    { id: "required", label: "Group: Required / Optional" },
];
const CONFIG_OPTIONS = ["With assessment", "Monitored", "Docs required"];

const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

function TrainingsList({ trainings, tabLabel, showCategory, onView, onEdit, formatRecurrence, scrollRef, onScroll }: {
    trainings: TrainingType[];
    tabLabel: string;
    showCategory: boolean;
    onView: (t: TrainingType) => void;
    onEdit: (t: TrainingType) => void;
    formatRecurrence: (r: string) => string;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [required, setRequired] = useState("");
    const [config, setConfig] = useState("");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map(c => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const stats: KpiStat[] = [
        { id: "all", label: "Training types", value: trainings.length, Icon: GraduationCap, accent: "blue" },
        { id: "Required", label: "Mandatory", value: trainings.filter(t => t.defaultMandatory).length, Icon: Check, accent: "rose" },
        { id: "With assessment", label: "With assessment", value: trainings.filter(t => t.defaultAssessment.enabled).length, Icon: FileText, accent: "amber" },
        { id: "Monitored", label: "Monitored", value: trainings.filter(t => t.monitoringNotifications.enabled).length, Icon: Bell, accent: "emerald" },
    ];
    const kpiActive = required === "Required" ? "Required" : config || (!required && !status ? "all" : "");
    const pickKpi = (id: string) => {
        setPage(1);
        if (id === "all") { setRequired(""); setConfig(""); return; }
        if (id === "Required") { setConfig(""); setRequired(r => (r === "Required" ? "" : "Required")); return; }
        setRequired(""); setConfig(c => (c === id ? "" : id));
    };
    useHeaderChips(chipsFromStats(stats, kpiActive, pickKpi));

    const q = search.trim().toLowerCase();
    const rows = trainings.filter(t => {
        if (status && (t.status === "active" ? "Active" : "Inactive") !== status) return false;
        if (required && (t.defaultMandatory ? "Required" : "Optional") !== required) return false;
        if (config === "With assessment" && !t.defaultAssessment.enabled) return false;
        if (config === "Monitored" && !t.monitoringNotifications.enabled) return false;
        if (config === "Docs required" && !t.defaultDocuments.required) return false;
        return !q || [t.name, t.category, ...t.tags].some(x => x.toLowerCase().includes(q));
    });
    const readers = useMemo(() => ({
        name: (t: TrainingType) => t.name,
        category: (t: TrainingType) => t.category,
        status: (t: TrainingType) => (t.status === "active" ? 0 : 1),
        required: (t: TrainingType) => (t.defaultMandatory ? 0 : 1),
        due: (t: TrainingType) => t.defaultDueDays,
        configuration: (t: TrainingType) => Number(t.defaultAssessment.enabled) + Number(t.monitoringNotifications.enabled) + Number(t.defaultDocuments.required),
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, TrainingType>(rows, readers, null);
    const groupOf = (t: TrainingType): { rank: number; label: string } | null =>
        groupBy === "category" ? { rank: TRAINING_CATEGORIES.indexOf(t.category), label: t.category }
            : groupBy === "status" ? { rank: t.status === "active" ? 0 : 1, label: t.status === "active" ? "Active" : "Inactive" }
                : groupBy === "required" ? { rank: t.defaultMandatory ? 0 : 1, label: t.defaultMandatory ? "Required" : "Optional" }
                    : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((t, i) => ({ t, i, g: groupOf(t)! }))
        .sort((x, y) => x.g.rank - y.g.rank || x.i - y.i)
        .map(x => x.t);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach(t => { const l = groupOf(t)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
    const show = (c: Col) => visible.has(c) && (c !== "category" || showCategory);
    const colCount = COLUMNS.filter(c => c.locked || show(c.id)).length + 1;
    const filterCount = [!!status, !!required, !!config, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setSearch(""); setStatus(""); setRequired(""); setConfig(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    return (
        <ListScrollFrame
            above={<KpiStatRow stats={stats} activeId={kpiActive} onPick={pickKpi} />}
            title={tabLabel}
            count={grouped.length}
            total={trainings.length}
            description="What each training requires — due days, delivery, assessment and monitoring. Click a row to see its details."
            actions={<ColumnPicker columns={showCategory ? COLUMNS : COLUMNS.filter(c => c.id !== "category")} visible={visible}
                onToggle={(id) => setVisible(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search name, category, tag…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="All statuses" options={["Active", "Inactive"]} />
                        <FilterSelect value={required} onChange={toPage1(setRequired)} title="Required" allLabel="Required and optional" options={["Required", "Optional"]} />
                        <FilterSelect value={config} onChange={toPage1(setConfig)} title="Configuration" allLabel="Any configuration" options={CONFIG_OPTIONS} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={showCategory ? GROUPS : GROUPS.filter(g => g.id !== "category")} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="name" label="Training name" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("category") && <SortTh col="category" label="Category" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("required") && <SortTh col="required" label="Required" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("due") && <SortTh col="due" label="Due days" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("configuration") && <SortTh col="configuration" label="Configuration" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <GraduationCap className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{trainings.length ? "No training type matches" : "No training types here yet"}</p>
                                {touched && (
                                    <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((training, i) => {
                        const g = groupOf(training);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        return (
                            <Fragment key={training.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onView(training)}>
                                    <TD>
                                        <div className="flex items-center gap-2.5" title={[training.name, ...training.tags].join(" · ")}>
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600"><GraduationCap size={14} /></span>
                                            <span className="font-semibold text-slate-900">{training.name}</span>
                                            {training.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{tag}</span>
                                            ))}
                                            {training.tags.length > 2 && <span className="text-[10px] text-slate-400">+{training.tags.length - 2}</span>}
                                        </div>
                                    </TD>
                                    {show("category") && <TD className="text-[13px] text-slate-600">{training.category}</TD>}
                                    {show("status") && <TD><StatusBadge status={training.status} /></TD>}
                                    {show("required") && <TD><MandatoryBadge mandatory={training.defaultMandatory} /></TD>}
                                    {show("due") && (
                                        <TD><span className="inline-flex items-center gap-1 text-slate-700"><Clock className="h-3 w-3 text-slate-400" /><span className="font-semibold tabular-nums">{training.defaultDueDays}</span></span></TD>
                                    )}
                                    {show("configuration") && (
                                        <TD>
                                            <span className="inline-flex items-center gap-1.5">
                                                {training.defaultAssessment.enabled && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700"><Check size={11} /> {training.defaultAssessment.passingScore}%</span>}
                                                {training.monitoringNotifications.enabled && <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700"><Bell size={11} /> {formatRecurrence(training.monitoringNotifications.renewalRecurrence)}</span>}
                                                {training.defaultDocuments.required && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700"><FileText size={11} /> Docs</span>}
                                                {!training.defaultAssessment.enabled && !training.monitoringNotifications.enabled && !training.defaultDocuments.required && <span className="text-xs text-slate-300">—</span>}
                                            </span>
                                        </TD>
                                    )}
                                    <td className={cn("px-4 py-2.5", PIN_TD_ACTIONS)} onClick={(e) => e.stopPropagation()}>
                                        <RowActions noun="training type" name={training.name} openLabel="View details" onOpen={() => onView(training)} onEdit={() => onEdit(training)} />
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

export default TrainingsPage;
