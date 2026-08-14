import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronLeft, ChevronRight, ChevronsUpDown, Check, Plus, Trash2, ChevronUp, ChevronDown, X, Search, Info,
    FileText, FileSignature, PenLine, ClipboardList, FolderPlus, SlidersHorizontal, FileCheck2, ListChecks,
    Hash, Sparkles, MapPin, Calendar, CalendarClock, Activity, History, Eye, ExternalLink, FileDown, Users, AlertTriangle, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import {
    getDqChecklist, blankDqChecklist, newDqItem, emptyDqSection,
    inferRequirement, inferMonitoring, defaultJurisdictionFor, driverTypeLabel,
    documentCount, formCount, itemCount, checkTimeFromMonitoring, checkTimeMeta,
    requirementMeta, monitoringSummary,
    DQ_DRIVER_TYPES, DQ_JURISDICTIONS, DQ_CHECK_TIMES,
    type DqChecklist, type DqDriverTypeId, type DqItem, type DqItemSource, type DqRequirement, type DqCheckTime,
} from "./settings-dq-checklists.data";
import {
    SAFETY_RECORDS, SAFETY_CATEGORY_ORDER, RECORD_TYPE_LABEL, RECORD_TYPE_ORDER, isDateMonitored,
    type SafetyRecord, type RecordTypeId, type UploadMode,
} from "@/pages/compliance/safety-software-catalog.data";
import { useCustomSafetyRecords } from "@/pages/compliance/safety-custom-records.data";
import { useComplianceData, entryStatus, CARRIER_SUBJECT } from "@/pages/compliance/compliance-data-store";
import { SubjectDocuments } from "@/pages/compliance/DefaultComplianceDataPage";
import { getAccountById } from "@/pages/accounts/accounts.data";
import { consentForms, consentRegion, THEME_HEX, POLICY_FORMS, type PolicyTheme, type PolicyFormDef } from "@/pages/hiring-process/policy-forms.data";
import { ONBOARDING_FORM_DEFS, getOnboardingFormDef } from "@/pages/hiring-process/onboarding.data";
import { PolicyForm } from "@/pages/hiring-process/PolicyForm";
import { ReviewSignOff, newSignOff, type SignOffData } from "@/pages/hiring-process/FormKit";
import { ThemedDocumentViewer } from "@/pages/hiring-process/ThemedDocumentViewer";
import type { DocSection } from "@/pages/hiring-process/FormDocument";
import { DriverAssignPanel, assignedDriverCount } from "./SettingsDqAssignDrivers";

/**
 * DQ template builder — assemble a Driver Qualification File from two sources
 * (Compliances from the Default catalog, Forms from Hiring) into fully-editable
 * sections. The Compliances tab is the Default-catalog Records data-table with a
 * checkbox to include a record; the Forms tab is the application Consent forms +
 * Onboarding forms; each item carries a Required toggle + the real
 * document-monitoring config. Four tabs: Define · Compliances · Forms · Checklist.
 */

// ── Form catalog (application consent forms + onboarding forms) ──────────────────
type DqFormRegion = "US" | "Canada" | "All";
type DqFormOption = {
    refId: string;            // "consent:<id>" | "onbform:<id>"
    title: string; accent: string; blurb: string;
    theme: PolicyTheme; region?: DqFormRegion;
    group: "consent" | "onboarding";
};
const CONSENT_FORM_OPTIONS: DqFormOption[] = consentForms().map(f => ({
    refId: `consent:${f.id}`, title: f.title, accent: f.accentTitle, blurb: f.blurb,
    theme: f.theme, region: consentRegion(f.id), group: "consent",
}));
const ONBOARDING_FORM_OPTIONS: DqFormOption[] = ONBOARDING_FORM_DEFS.map(f => ({
    refId: `onbform:${f.id}`, title: f.title, accent: f.accentTitle, blurb: f.blurb ?? "",
    theme: f.theme, group: "onboarding",
}));
const formOptionLabel = (o: DqFormOption) => `${o.title} ${o.accent}`.replace(/\s+/g, " ").trim();
// refId → form option, so the dedicated Form record page can show its group/region/blurb.
const FORM_OPTION_BY_REFID: Record<string, DqFormOption> = Object.fromEntries(
    [...CONSENT_FORM_OPTIONS, ...ONBOARDING_FORM_OPTIONS].map(o => [o.refId, o]),
);

// A form item is represented as a synthetic driver "Documents" SafetyRecord so it can reuse
// the SAME in-system record page (SubjectDocuments/RecordDetailPage) as compliance items —
// the form's records live in the compliance store keyed by its refId.
export function formToRecord(item: DqItem): SafetyRecord {
    const opt = item.refId ? FORM_OPTION_BY_REFID[item.refId] : undefined;
    const region = opt?.region;
    return {
        id: item.refId ?? item.id,
        recordName: item.label || opt?.title || "Form",
        description: opt?.blurb || item.note || "",
        numberName: "",
        documentName: item.label || "Signed form",
        category: "Other" as SafetyRecord["category"],
        entity: "Driver",
        type: "D",
        docRequirement: item.requirement === "must" ? "required" : "optional",
        recurring: "Per hire",
        monitorType: "On file",
        jurisdiction: region === "Canada" ? "Canada" : region === "US" ? "United States, federal" : "",
        monitor: "Keep a signed copy of the completed form on file.",
        uploadMode: "single",
    };
}

export type BuilderTab = "details" | "documents" | "forms" | "checklist" | "drivers";

const SOURCE_ICON: Record<DqItemSource, React.ElementType> = { document: FileText, form: FileSignature, custom: PenLine };
const SOURCE_TINT: Record<DqItemSource, string> = { document: "text-slate-400", form: "text-blue-500", custom: "text-violet-500" };
const SOURCE_TYPE_LABEL: Record<DqItemSource, string> = { document: "Compliance", form: "Form", custom: "Point" };
const SOURCE_TYPE_CHIP: Record<DqItemSource, string> = {
    document: "bg-blue-50 text-blue-700 ring-blue-200",
    form: "bg-violet-50 text-violet-700 ring-violet-200",
    custom: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function SettingsDqChecklistBuilder({ checklistId, onBack, onSave, accountId, initialTab }: {
    checklistId: string;
    onBack: () => void;
    onSave: (c: DqChecklist) => void;
    accountId?: string;
    initialTab?: BuilderTab;
}) {
    const existing = checklistId !== "new" ? getDqChecklist(checklistId) : undefined;
    const [cl, setCl] = useState<DqChecklist>(existing ?? blankDqChecklist());
    const [tab, setTab] = useState<BuilderTab>(initialTab ?? "details");
    const [landingId, setLandingId] = useState<string>(cl.sections[0]?.id ?? "");
    const [preview, setPreview] = useState(false);

    const { records: customRecords } = useCustomSafetyRecords(accountId);
    const allRecords = useMemo(() => [...customRecords, ...SAFETY_RECORDS], [customRecords]);

    const canSave = cl.name.trim().length > 0;
    const save = () => { if (canSave) { onSave({ ...cl, name: cl.name.trim() }); onBack(); } };
    const setField = (patch: Partial<DqChecklist>) => setCl(c => ({ ...c, ...patch }));

    const flat = useMemo(() => cl.sections.flatMap(s => s.items), [cl.sections]);
    const includedDocRefs = useMemo(() => new Set(flat.filter(i => i.source === "document" && i.refId).map(i => i.refId!)), [flat]);
    const formItemByRef = useMemo(() => {
        const m = new Map<string, DqItem>();
        for (const i of flat) if (i.source === "form" && i.refId && !m.has(i.refId)) m.set(i.refId, i);
        return m;
    }, [flat]);

    // ── section / item mutations ────────────────────────────────────────────────
    const mutateSections = (fn: (sections: DqChecklist["sections"]) => DqChecklist["sections"]) =>
        setCl(c => ({ ...c, sections: fn(c.sections) }));

    const addItemToLanding = (item: DqItem) => setCl(c => {
        let sections = c.sections;
        let targetId = landingId && sections.some(s => s.id === landingId) ? landingId : sections[0]?.id;
        if (!targetId) { const s = emptyDqSection("Documents"); sections = [s]; targetId = s.id; setLandingId(s.id); }
        return { ...c, sections: sections.map(s => s.id === targetId ? { ...s, items: [...s.items, item] } : s) };
    });
    const removeItemsByRef = (refId: string, source: DqItemSource) =>
        mutateSections(secs => secs.map(s => ({ ...s, items: s.items.filter(i => !(i.source === source && i.refId === refId)) })));
    const patchItem = (itemId: string, patch: Partial<DqItem>) =>
        mutateSections(secs => secs.map(s => ({ ...s, items: s.items.map(i => i.id === itemId ? { ...i, ...patch } : i) })));
    const removeItem = (itemId: string) =>
        mutateSections(secs => secs.map(s => ({ ...s, items: s.items.filter(i => i.id !== itemId) })));
    const moveItem = (itemId: string, toSectionId: string) => mutateSections(secs => {
        const item = secs.flatMap(s => s.items).find(i => i.id === itemId);
        if (!item) return secs;
        return secs.map(s =>
            s.id === toSectionId
                ? { ...s, items: s.items.some(i => i.id === itemId) ? s.items : [...s.items, item] }
                : { ...s, items: s.items.filter(i => i.id !== itemId) });
    });
    const reorderItem = (sectionId: string, index: number, dir: -1 | 1) => mutateSections(secs => secs.map(s => {
        if (s.id !== sectionId) return s;
        const j = index + dir;
        if (j < 0 || j >= s.items.length) return s;
        const items = [...s.items];
        [items[index], items[j]] = [items[j], items[index]];
        return { ...s, items };
    }));
    const addCustomItem = (sectionId: string) =>
        mutateSections(secs => secs.map(s => s.id === sectionId ? { ...s, items: [...s.items, newDqItem("custom", { label: "" })] } : s));
    const addSection = () => setCl(c => { const s = emptyDqSection(); return { ...c, sections: [...c.sections, s] }; });
    const renameSection = (id: string, title: string) => mutateSections(secs => secs.map(s => s.id === id ? { ...s, title } : s));
    const removeSection = (id: string) => mutateSections(secs => secs.filter(s => s.id !== id));
    const reorderSection = (index: number, dir: -1 | 1) => mutateSections(secs => {
        const j = index + dir;
        if (j < 0 || j >= secs.length) return secs;
        const next = [...secs];
        [next[index], next[j]] = [next[j], next[index]];
        return next;
    });

    // ── source toggles ──────────────────────────────────────────────────────────
    const docItemFor = (r: SafetyRecord) => {
        const monitoring = inferMonitoring(r.monitorType, r.recurring);
        return newDqItem("document", {
            refId: r.id, label: r.recordName,
            requirement: inferRequirement(r.docRequirement),
            monitoring,
            checkTime: checkTimeFromMonitoring(monitoring),
            jurisdiction: r.jurisdiction,
            ...(r.multiInstance ? { list: true } : {}),
        });
    };
    const toggleDoc = (r: SafetyRecord) => {
        if (includedDocRefs.has(r.id)) removeItemsByRef(r.id, "document");
        else addItemToLanding(docItemFor(r));
    };
    // Bulk select / clear (header + mobile "select all") for a set of records at once.
    const setDocsSelected = (recs: SafetyRecord[], select: boolean) => setCl(c => {
        if (!select) {
            const rm = new Set(recs.map(r => r.id));
            return { ...c, sections: c.sections.map(s => ({ ...s, items: s.items.filter(i => !(i.source === "document" && i.refId && rm.has(i.refId))) })) };
        }
        const included = new Set(c.sections.flatMap(s => s.items).filter(i => i.source === "document" && i.refId).map(i => i.refId));
        let sections = c.sections;
        let targetId = landingId && sections.some(s => s.id === landingId) ? landingId : sections[0]?.id;
        if (!targetId) { const s = emptyDqSection("Documents"); sections = [s]; targetId = s.id; setLandingId(s.id); }
        const toAdd = recs.filter(r => !included.has(r.id)).map(docItemFor);
        if (toAdd.length === 0) return c;
        return { ...c, sections: sections.map(s => s.id === targetId ? { ...s, items: [...s.items, ...toAdd] } : s) };
    });
    const toggleForm = (id: string, name: string) => {
        if (formItemByRef.has(id)) removeItemsByRef(id, "form");
        else addItemToLanding(newDqItem("form", { refId: id, label: name, fulfill: "fill" }));
    };
    // Bulk select / clear (header + mobile "select all") for a set of form options.
    const setFormsSelected = (opts: DqFormOption[], select: boolean) => setCl(c => {
        if (!select) {
            const rm = new Set(opts.map(o => o.refId));
            return { ...c, sections: c.sections.map(s => ({ ...s, items: s.items.filter(i => !(i.source === "form" && i.refId && rm.has(i.refId))) })) };
        }
        const included = new Set(c.sections.flatMap(s => s.items).filter(i => i.source === "form" && i.refId).map(i => i.refId));
        let sections = c.sections;
        let targetId = landingId && sections.some(s => s.id === landingId) ? landingId : sections[0]?.id;
        if (!targetId) { const s = emptyDqSection("Documents"); sections = [s]; targetId = s.id; setLandingId(s.id); }
        const toAdd = opts.filter(o => !included.has(o.refId)).map(o => newDqItem("form", { refId: o.refId, label: formOptionLabel(o), fulfill: "fill" }));
        if (toAdd.length === 0) return c;
        return { ...c, sections: sections.map(s => s.id === targetId ? { ...s, items: [...s.items, ...toAdd] } : s) };
    });

    const TABS: { id: BuilderTab; label: string; Icon: React.ElementType; count?: number }[] = [
        { id: "details", label: "Define", Icon: FileText },
        { id: "documents", label: "Compliances", Icon: ListChecks, count: documentCount(cl) },
        { id: "forms", label: "Forms", Icon: FileSignature, count: formCount(cl) },
        { id: "checklist", label: "Checklist", Icon: ClipboardList, count: itemCount(cl) },
        { id: "drivers", label: "Drivers", Icon: Users, count: assignedDriverCount(cl.id) || undefined },
    ];

    if (preview) {
        return <DqFilePreview cl={cl} records={allRecords} accountId={accountId} onPatchItem={patchItem} onBack={() => setPreview(false)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header bar — same chrome as the New-role page, with tabs on its bottom edge */}
            <div className="bg-white border-b border-slate-200">
                <div className="px-4 sm:px-8 py-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-start gap-3">
                            <button type="button" onClick={onBack} title="Back to checklists"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                                <ChevronLeft className="h-[18px] w-[18px]" />
                            </button>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><FileCheck2 className="h-5 w-5" /></div>
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-slate-900">{checklistId === "new" ? "New DQ File Template" : "Edit DQ File Template"}</h1>
                                <p className="mt-0.5 text-sm text-slate-500">{cl.name || "Untitled"}{cl.jurisdiction ? ` · ${cl.jurisdiction}` : ""} — pull compliances from your Default catalog and forms from Hiring, then tag each item.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={onBack}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" disabled={!canSave} onClick={save}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                                <Check className="h-[15px] w-[15px]" /> Save checklist
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-4 -mb-5 flex items-center gap-1 overflow-x-auto">
                        {TABS.map(t => (
                            <DqBuilderTab key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} Icon={t.Icon} label={t.label} count={t.count} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-4 py-6 sm:px-8">
                {tab === "details" && <div className="max-w-4xl"><DetailsTab cl={cl} setField={setField} /></div>}
                {tab === "documents" && (
                    <DocumentsTab records={allRecords} includedRefs={includedDocRefs} onToggle={toggleDoc} onSelectAll={setDocsSelected} />
                )}
                {tab === "forms" && (
                    <FormsTab itemByRef={formItemByRef} onToggle={toggleForm} onSelectAll={setFormsSelected} />
                )}
                {tab === "checklist" && (
                    <ChecklistTab cl={cl}
                        onRename={renameSection} onRemoveSection={removeSection} onReorderSection={reorderSection}
                        onAddSection={addSection} onAddCustom={addCustomItem}
                        onPatchItem={patchItem} onRemoveItem={removeItem} onMoveItem={moveItem} onReorderItem={reorderItem}
                        onPreview={() => setPreview(true)} />
                )}
                {tab === "drivers" && (
                    <div className="max-w-[1100px]">
                        <DriverAssignPanel checklist={cl} accountId={accountId} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Tab: Define ─────────────────────────────────────────────────────────────────
function DetailsTab({ cl, setField }: { cl: DqChecklist; setField: (patch: Partial<DqChecklist>) => void }) {
    return (
        <div className="space-y-5">
            {/* Driver type */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                    <p className="text-sm font-bold text-slate-800">Driver type</p>
                    <p className="text-[11px] leading-snug text-slate-500">Who this DQ file is for — sets the default jurisdiction.</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 p-5 sm:grid-cols-3">
                    {DQ_DRIVER_TYPES.map(dt => {
                        const on = cl.type === dt.id;
                        return (
                            <button key={dt.id} type="button"
                                onClick={() => setField({ type: dt.id as DqDriverTypeId, jurisdiction: defaultJurisdictionFor(dt.id as DqDriverTypeId) })}
                                className={cn("rounded-xl border px-3.5 py-3 text-left transition", on ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                                <div className="flex items-center justify-between">
                                    <p className={cn("text-sm font-semibold", on ? "text-blue-700" : "text-slate-800")}>{dt.label}</p>
                                    {on && <Check className="h-4 w-4 text-blue-600" />}
                                </div>
                                <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{dt.blurb}</p>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Details */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                    <p className="text-sm font-bold text-slate-800">Template details</p>
                    <p className="text-[11px] leading-snug text-slate-500">Name this template and set the jurisdiction it applies to.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-500">Template name
                        <Input value={cl.name} onChange={e => setField({ name: e.target.value })} placeholder="e.g. Cross Border DQ File" className="mt-1.5" autoFocus />
                    </label>
                    <label className="block text-xs font-semibold text-slate-500">Jurisdiction
                        <select value={cl.jurisdiction ?? ""} onChange={e => setField({ jurisdiction: e.target.value })}
                            className="mt-1.5 flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none">
                            {DQ_JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-500 sm:col-span-2">Description <span className="font-normal text-slate-400">(optional)</span>
                        <Input value={cl.description ?? ""} onChange={e => setField({ description: e.target.value })} placeholder="Short summary of this DQ file" className="mt-1.5" />
                    </label>
                </div>
            </section>
        </div>
    );
}

// ── Tab: Compliances — the Default-catalog Records table with a select checkbox ──
const RECORD_TYPE_TONE: Record<RecordTypeId, string> = {
    C: "border-blue-200 bg-blue-50 text-blue-700",
    D: "border-violet-200 bg-violet-50 text-violet-700",
    DC: "border-emerald-200 bg-emerald-50 text-emerald-700",
};
const CATEGORY_SHORT: Record<string, string> = {
    "Regulatory and Safety Numbers": "Regulatory & Safety",
    "Tax and Business Identification Numbers": "Tax & Business ID",
    "Carrier & Industry Codes": "Carrier & Industry",
    "Bond and Registration Numbers": "Bond & Registration",
    "Other": "Other",
};
const UPLOAD_MODE_TONE: Record<UploadMode, string> = {
    single: "border-slate-200 bg-slate-50 text-slate-500",
    recurring: "border-blue-200 bg-blue-50 text-blue-700",
    event: "border-violet-200 bg-violet-50 text-violet-700",
};

function RequirementPill({ r }: { r: SafetyRecord }) {
    if (r.docRequirement === "none") return <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-400">No document</span>;
    const required = r.docRequirement === "required";
    return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", required ? "border-blue-200 bg-blue-50 text-blue-700" : "border-amber-200 bg-amber-50 text-amber-700")}>{required ? "Required" : "Optional"}</span>;
}
function UploadModeChip({ mode }: { mode: UploadMode }) {
    const Icon = mode === "single" ? FileText : History;
    const short = mode === "single" ? "Single" : mode === "recurring" ? "Recurring versions" : "Event versions";
    return <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap", UPLOAD_MODE_TONE[mode])}><Icon size={9} /> {short}</span>;
}
function MonitoringCell({ r }: { r: SafetyRecord }) {
    if (r.configuredDate) return <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CalendarClock size={12} /> {r.monitorType}<span className="font-mono text-[10px] text-emerald-600">· {r.configuredDate}</span></span>;
    if (isDateMonitored(r)) return <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-700"><Calendar size={12} className="text-slate-400" /> {r.monitorType}</span>;
    return <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500"><Activity size={12} className="text-slate-400" /> {r.monitorType}</span>;
}

type DocColId = "record" | "category" | "type" | "document" | "monitoring" | "jurisdiction";
interface DocCol { id: DocColId; label: string; sortValue: (r: SafetyRecord) => string; render: (r: SafetyRecord) => React.ReactNode; cellClassName?: string; }
const DOC_COLUMNS: DocCol[] = [
    {
        id: "record", label: "Record & Fields", sortValue: r => r.recordName, cellClassName: "min-w-[220px]",
        render: r => (
            <>
                <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900">{r.recordName}</span>
                    {r.custom && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"><Sparkles size={8} /> Custom</span>}
                </div>
                {r.description && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{r.description}</div>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                    {r.numberName && <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"><Hash size={9} /> {r.numberName}</span>}
                    {r.documentName && <span className="inline-flex items-center gap-1 rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"><FileText size={9} /> {r.documentName}</span>}
                </div>
            </>
        ),
    },
    { id: "category", label: "Category", sortValue: r => r.category, render: r => <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">{CATEGORY_SHORT[r.category] ?? r.category}</span> },
    { id: "type", label: "Record Type", sortValue: r => RECORD_TYPE_LABEL[r.type], render: r => <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap", RECORD_TYPE_TONE[r.type])}>{RECORD_TYPE_LABEL[r.type]}</span> },
    { id: "document", label: "Document", sortValue: r => r.docRequirement, render: r => <div className="space-y-1"><RequirementPill r={r} />{r.uploadMode && <UploadModeChip mode={r.uploadMode} />}</div> },
    { id: "monitoring", label: "Monitoring", sortValue: r => (r.configuredDate ?? "") + r.monitorType, render: r => <div title={r.monitor}><MonitoringCell r={r} /><div className="mt-0.5 text-[10px] text-slate-400">Recurring: {r.recurring}</div></div> },
    { id: "jurisdiction", label: "Jurisdiction", sortValue: r => r.jurisdiction, render: r => <span className="inline-flex items-start gap-1 text-[12px] text-slate-600 max-w-[220px]"><MapPin size={12} className="mt-0.5 shrink-0 text-slate-400" /><span>{r.jurisdiction}</span></span> },
];
const DOC_PAGE_SIZES = [10, 25, 50, 100];
const docBlob = (r: SafetyRecord) => [r.recordName, r.description, r.numberName, r.documentName, r.jurisdiction, r.monitorType, r.recurring].join(" ").toLowerCase();

function DocSortableTh({ col, sort, onSort, className }: { col: DocCol; sort: { col: DocColId; dir: "asc" | "desc" }; onSort: (id: DocColId) => void; className?: string }) {
    const active = sort.col === col.id;
    const Icon = active ? (sort.dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className={cn("px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap", className)}>
            <button type="button" onClick={() => onSort(col.id)} className={cn("inline-flex items-center gap-1 hover:text-slate-700 transition-colors", active && "text-blue-600")}>
                {col.label} <Icon size={12} className={active ? "" : "text-slate-300"} />
            </button>
        </th>
    );
}

function DocumentsTab({ records, includedRefs, onToggle, onSelectAll }: {
    records: SafetyRecord[]; includedRefs: Set<string>;
    onToggle: (r: SafetyRecord) => void;
    onSelectAll: (records: SafetyRecord[], select: boolean) => void;
}) {
    const [q, setQ] = useState("");
    const [rtype, setRtype] = useState<RecordTypeId | "All">("All");
    const [juris, setJuris] = useState("All");
    const [cat, setCat] = useState<string>("All");
    const [sort, setSort] = useState<{ col: DocColId; dir: "asc" | "desc" }>({ col: "record", dir: "asc" });
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);

    const jurisdictions = useMemo(() => Array.from(new Set(records.map(r => r.jurisdiction).filter(Boolean))).sort(), [records]);

    // Base filter (everything except the category tabs) — also drives the tab counts.
    const base = useMemo(() => {
        const query = q.trim().toLowerCase();
        return records.filter(r =>
            r.entity === "Driver" &&
            (rtype === "All" || r.type === rtype) &&
            (juris === "All" || r.jurisdiction === juris) &&
            (!query || docBlob(r).includes(query)));
    }, [records, q, rtype, juris]);

    const catCounts = useMemo(() => { const m = new Map<string, number>(); for (const r of base) m.set(r.category, (m.get(r.category) ?? 0) + 1); return m; }, [base]);
    const cats = useMemo(() => SAFETY_CATEGORY_ORDER.filter(c => catCounts.has(c)), [catCounts]);

    const filtered = useMemo(() => cat === "All" ? base : base.filter(r => r.category === cat), [base, cat]);
    const sorted = useMemo(() => {
        const col = DOC_COLUMNS.find(c => c.id === sort.col);
        const arr = [...filtered];
        if (col) arr.sort((a, b) => sort.dir === "asc" ? col.sortValue(a).localeCompare(col.sortValue(b)) : col.sortValue(b).localeCompare(col.sortValue(a)));
        return arr;
    }, [filtered, sort]);

    useEffect(() => setPage(1), [q, rtype, juris, cat, sort, pageSize]);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(startIdx, startIdx + pageSize);
    const toggleSort = (id: DocColId) => setSort(s => s.col === id ? { col: id, dir: s.dir === "asc" ? "desc" : "asc" } : { col: id, dir: "asc" });
    const allSel = filtered.length > 0 && filtered.every(r => includedRefs.has(r.id));

    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search records, numbers, jurisdiction…" className="h-9 pl-9" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={rtype} onChange={e => setRtype(e.target.value as RecordTypeId | "All")}
                            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-medium text-slate-600 focus:outline-none">
                            <option value="All">All record types</option>
                            {RECORD_TYPE_ORDER.map(t => <option key={t} value={t}>{RECORD_TYPE_LABEL[t]}</option>)}
                        </select>
                        <select value={juris} onChange={e => setJuris(e.target.value)}
                            className="h-9 max-w-[13rem] rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-medium text-slate-600 focus:outline-none">
                            <option value="All">All jurisdictions</option>
                            {jurisdictions.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                    </div>
                </div>

                {/* Category tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2">
                    <CatTab label="All" count={base.length} active={cat === "All"} onClick={() => setCat("All")} />
                    {cats.map(c => <CatTab key={c} label={CATEGORY_SHORT[c] ?? c} count={catCounts.get(c) ?? 0} active={cat === c} onClick={() => setCat(c)} />)}
                </div>

                {pageRows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-400">No records match your search / filters.</div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[940px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr className="text-left">
                                        {DOC_COLUMNS.map(c => <DocSortableTh key={c.id} col={c} sort={sort} onSort={toggleSort} />)}
                                        <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-2">Enabled
                                                <Toggle checked={allSel} onCheckedChange={() => onSelectAll(filtered, !allSel)} />
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(r => {
                                        const on = includedRefs.has(r.id);
                                        return (
                                            <tr key={r.id}
                                                className={cn("border-b border-slate-100 align-top transition-colors", on ? "bg-blue-50/40" : "hover:bg-slate-50/60")}>
                                                {DOC_COLUMNS.map(c => <td key={c.id} className={cn("px-4 py-3.5 align-top", c.cellClassName)}>{c.render(r)}</td>)}
                                                <td className="px-4 py-3.5 pr-5 text-right align-top">
                                                    <Toggle checked={on} onCheckedChange={() => onToggle(r)} className="ml-auto" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="lg:hidden">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                                <span className="text-[12px] font-semibold text-slate-600">Enable all ({filtered.length})</span>
                                <Toggle checked={allSel} onCheckedChange={() => onSelectAll(filtered, !allSel)} />
                            </div>
                            <ul className="divide-y divide-slate-100">
                            {pageRows.map(r => {
                                const on = includedRefs.has(r.id);
                                return (
                                    <li key={r.id} className={cn("px-4 py-3.5 transition-colors", on ? "bg-blue-50/40" : "hover:bg-slate-50/60")}>
                                        <div className="flex items-start gap-3">
                                            <div className="min-w-0 flex-1">
                                                {DOC_COLUMNS[0].render(r)}
                                                <div className="mt-2.5 grid grid-cols-1 gap-x-4 gap-y-2 border-t border-slate-100 pt-2.5 sm:grid-cols-2">
                                                    {DOC_COLUMNS.slice(1).map(c => (
                                                        <div key={c.id} className="flex items-start gap-2">
                                                            <span className="w-20 shrink-0 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{c.label}</span>
                                                            <div className="min-w-0 flex-1">{c.render(r)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <Toggle checked={on} onCheckedChange={() => onToggle(r)} className="mt-0.5 shrink-0" />
                                        </div>
                                    </li>
                                );
                            })}
                            </ul>
                        </div>
                    </>
                )}

                {/* Pagination */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                        <label className="flex items-center gap-1.5">Rows per page
                            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                                {DOC_PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <span className="tabular-nums">{total === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + pageSize, total)}`} of {total}</span>
                        <span className="tabular-nums text-slate-400">· {includedRefs.size} selected</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Prev</button>
                        <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                        <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DqBuilderTab({ active, onClick, Icon, label, count }: { active: boolean; onClick: () => void; Icon: React.ElementType; label: string; count?: number }) {
    return (
        <button type="button" onClick={onClick}
            className={cn("inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4",
                active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800")}>
            <Icon size={15} className={cn("shrink-0", active ? "text-blue-600" : "text-slate-400")} />
            <span>{label}</span>
            {typeof count === "number" && (
                <span className={cn("inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums", active ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600")}>{count}</span>
            )}
        </button>
    );
}

function CatTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
    return (
        <button type="button" onClick={onClick}
            className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition", active ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200" : "text-slate-600 hover:bg-slate-100")}>
            {label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", active ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-500")}>{count}</span>
        </button>
    );
}

// ── Tab: Forms — proper list view (consent forms + onboarding forms) ────────────
const FORM_TILE_TONE: Record<PolicyTheme, string> = {
    blue: "bg-blue-50 text-blue-600",
    teal: "bg-teal-50 text-teal-600",
    orange: "bg-orange-50 text-orange-600",
};
const REGION_TONE: Record<DqFormRegion, string> = {
    US: "bg-blue-50 text-blue-700 ring-blue-200",
    Canada: "bg-rose-50 text-rose-700 ring-rose-200",
    All: "bg-slate-100 text-slate-600 ring-slate-200",
};
const SOURCE_TONE: Record<DqFormOption["group"], string> = {
    consent: "border-blue-200 bg-blue-50 text-blue-700",
    onboarding: "border-violet-200 bg-violet-50 text-violet-700",
};
const SOURCE_LABEL: Record<DqFormOption["group"], string> = { consent: "Consent", onboarding: "Onboarding" };
const ALL_FORM_OPTIONS: DqFormOption[] = [...CONSENT_FORM_OPTIONS, ...ONBOARDING_FORM_OPTIONS];

type FormSortCol = "form" | "source" | "region";
const FORM_SORT_VALUE: Record<FormSortCol, (o: DqFormOption) => string> = {
    form: o => o.title, source: o => o.group, region: o => o.region ?? "zzz",
};
// Reusable sortable header (form list + any other simple table).
function SortTh({ label, active, dir, onClick, className }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void; className?: string }) {
    const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className={cn("px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap", className)}>
            <button type="button" onClick={onClick} className={cn("inline-flex items-center gap-1 transition-colors hover:text-slate-700", active && "text-blue-600")}>
                {label} <Icon size={12} className={active ? "" : "text-slate-300"} />
            </button>
        </th>
    );
}

function FormsTab({ itemByRef, onToggle, onSelectAll }: {
    itemByRef: Map<string, DqItem>;
    onToggle: (id: string, name: string) => void;
    onSelectAll: (options: DqFormOption[], select: boolean) => void;
}) {
    const [q, setQ] = useState("");
    const [src, setSrc] = useState<"all" | DqFormOption["group"]>("all");
    const [sort, setSort] = useState<{ col: FormSortCol; dir: "asc" | "desc" }>({ col: "form", dir: "asc" });
    const toggleSort = (col: FormSortCol) => setSort(s => s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" });

    const base = useMemo(() => {
        const query = q.trim().toLowerCase();
        return ALL_FORM_OPTIONS.filter(o => !query || `${o.title} ${o.accent} ${o.blurb}`.toLowerCase().includes(query));
    }, [q]);
    const srcCounts = useMemo(() => ({
        consent: base.filter(o => o.group === "consent").length,
        onboarding: base.filter(o => o.group === "onboarding").length,
    }), [base]);
    const filtered = useMemo(() => src === "all" ? base : base.filter(o => o.group === src), [base, src]);
    const rows = useMemo(() => {
        const val = FORM_SORT_VALUE[sort.col];
        return [...filtered].sort((a, b) => sort.dir === "asc" ? val(a).localeCompare(val(b)) : val(b).localeCompare(val(a)));
    }, [filtered, sort]);

    const selectedCount = ALL_FORM_OPTIONS.filter(o => itemByRef.has(o.refId)).length;
    const allSel = filtered.length > 0 && filtered.every(o => itemByRef.has(o.refId));

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[12px] text-blue-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p>Enable the forms this DQ file must contain — from the driver <span className="font-semibold">application consents</span> and <span className="font-semibold">onboarding</span> paperwork. Set each form's Fill/Upload, requirement and monitoring on the <span className="font-semibold">Checklist</span> tab.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Toolbar */}
                <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search forms…" className="h-9 pl-9" />
                    </div>
                    <span className="shrink-0 text-[12px] font-medium text-slate-500 tabular-nums">{selectedCount} enabled</span>
                </div>

                {/* Source tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-100 px-4 py-2">
                    <CatTab label="All forms" count={base.length} active={src === "all"} onClick={() => setSrc("all")} />
                    <CatTab label="Application Consent" count={srcCounts.consent} active={src === "consent"} onClick={() => setSrc("consent")} />
                    <CatTab label="Onboarding" count={srcCounts.onboarding} active={src === "onboarding"} onClick={() => setSrc("onboarding")} />
                </div>

                {rows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-400">No forms match your search.</div>
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[640px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr className="text-left">
                                        <SortTh label="Form" active={sort.col === "form"} dir={sort.dir} onClick={() => toggleSort("form")} className="w-[55%]" />
                                        <SortTh label="Source" active={sort.col === "source"} dir={sort.dir} onClick={() => toggleSort("source")} />
                                        <SortTh label="Region" active={sort.col === "region"} dir={sort.dir} onClick={() => toggleSort("region")} />
                                        <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-2">Enabled
                                                <Toggle checked={allSel} onCheckedChange={() => onSelectAll(filtered, !allSel)} />
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(o => {
                                        const on = itemByRef.has(o.refId);
                                        return (
                                            <tr key={o.refId} className={cn("border-b border-slate-100 align-top transition-colors", on ? "bg-blue-50/40" : "hover:bg-slate-50/60")}>
                                                <td className="px-4 py-3.5 align-top">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", FORM_TILE_TONE[o.theme])}><FileSignature className="h-4 w-4" /></div>
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-semibold text-slate-800">{o.title}{o.accent && <span style={{ color: THEME_HEX[o.theme] }}> {o.accent}</span>}</p>
                                                            {o.blurb && <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{o.blurb}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 align-top">
                                                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", SOURCE_TONE[o.group])}>{SOURCE_LABEL[o.group]}</span>
                                                </td>
                                                <td className="px-4 py-3.5 align-top">
                                                    {o.region
                                                        ? <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1", REGION_TONE[o.region])}>{o.region}</span>
                                                        : <span className="text-slate-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3.5 pr-5 text-right align-top">
                                                    <Toggle checked={on} onCheckedChange={() => onToggle(o.refId, formOptionLabel(o))} className="ml-auto" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <ul className="divide-y divide-slate-100 lg:hidden">
                            {rows.map(o => {
                                const on = itemByRef.has(o.refId);
                                return (
                                    <li key={o.refId} className={cn("px-4 py-3.5 transition-colors", on ? "bg-blue-50/30" : "hover:bg-slate-50/70")}>
                                        <div className="flex items-start gap-3">
                                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", FORM_TILE_TONE[o.theme])}><FileSignature className="h-4 w-4" /></div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                    <p className="text-[13px] font-semibold text-slate-800">{o.title}{o.accent && <span style={{ color: THEME_HEX[o.theme] }}> {o.accent}</span>}</p>
                                                    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide", SOURCE_TONE[o.group])}>{SOURCE_LABEL[o.group]}</span>
                                                    {o.region && <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1", REGION_TONE[o.region])}>{o.region}</span>}
                                                </div>
                                                {o.blurb && <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{o.blurb}</p>}
                                            </div>
                                            <Toggle checked={on} onCheckedChange={() => onToggle(o.refId, formOptionLabel(o))} className="mt-0.5 shrink-0" />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-[12px] text-slate-500">
                    <span className="tabular-nums">{rows.length} form{rows.length === 1 ? "" : "s"}</span>
                    <span className="tabular-nums text-slate-400">{selectedCount} enabled</span>
                </div>
            </div>
        </div>
    );
}

// ── Tab: Checklist (assembled, editable) ────────────────────────────────────────
function ChecklistTab({ cl, onRename, onRemoveSection, onReorderSection, onAddSection, onAddCustom, onPatchItem, onRemoveItem, onMoveItem, onReorderItem, onPreview }: {
    cl: DqChecklist;
    onRename: (id: string, title: string) => void;
    onRemoveSection: (id: string) => void;
    onReorderSection: (index: number, dir: -1 | 1) => void;
    onAddSection: () => void;
    onAddCustom: (sectionId: string) => void;
    onPatchItem: (itemId: string, patch: Partial<DqItem>) => void;
    onRemoveItem: (itemId: string) => void;
    onMoveItem: (itemId: string, toSectionId: string) => void;
    onReorderItem: (sectionId: string, index: number, dir: -1 | 1) => void;
    onPreview: () => void;
}) {
    if (cl.sections.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><ClipboardList className="h-6 w-6" /></div>
                <p className="mt-4 text-sm font-semibold text-slate-700">No sections yet</p>
                <p className="mt-1 text-sm text-slate-500">Add a section, then pick compliances & forms on the other tabs.</p>
                <Button className="mt-4" size="sm" onClick={onAddSection}><Plus className="h-4 w-4" /> Add section</Button>
            </div>
        );
    }
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[12px] text-slate-600">
                    <SlidersHorizontal className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p>Set each item’s <span className="font-semibold text-slate-700">check time</span> (how often to re-check it). Compliances & forms are added / removed by their toggle on the <span className="font-semibold text-slate-700">Compliances</span> / <span className="font-semibold text-slate-700">Forms</span> tab (<Lock className="inline h-3 w-3" /> locked here); only custom <span className="font-semibold text-slate-700">points</span> can be added &amp; removed on this tab.</p>
                </div>
                <Button onClick={onPreview} className="shrink-0"><Eye className="h-4 w-4" /> Preview</Button>
            </div>
            {cl.sections.map((section, si) => (
                <div key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                        <input value={section.title} onChange={e => onRename(section.id, e.target.value)} placeholder="Section title"
                            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-800 focus:outline-none" />
                        <span className="shrink-0 rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">{section.items.length}</span>
                        <div className="flex shrink-0 items-center gap-0.5">
                            <IconBtn title="Move up" disabled={si === 0} onClick={() => onReorderSection(si, -1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                            <IconBtn title="Move down" disabled={si === cl.sections.length - 1} onClick={() => onReorderSection(si, 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                            <IconBtn title="Delete section" onClick={() => { if (section.items.length === 0 || window.confirm(`Delete section “${section.title || "Untitled"}” and its ${section.items.length} item(s)?`)) onRemoveSection(section.id); }}>
                                <Trash2 className="h-4 w-4 text-rose-500" />
                            </IconBtn>
                        </div>
                    </div>

                    {section.items.length === 0 ? (
                        <p className="px-5 py-5 text-center text-[12px] text-slate-400">No items yet — add compliances/forms on the other tabs, or a custom item below.</p>
                    ) : (<>
                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[720px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-2.5 pl-5">Check Item</th>
                                        <th className="w-28 px-4 py-2.5">Type</th>
                                        <th className="w-32 px-4 py-2.5">Check time</th>
                                        <th className="w-32 px-4 py-2.5 pr-5 text-right">Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {section.items.map((item, ii) => {
                                        const Icon = SOURCE_ICON[item.source];
                                        return (
                                            <tr key={item.id} className="border-b border-slate-100 align-middle hover:bg-slate-50/60">
                                                <td className="px-4 py-3 pl-5">
                                                    <div className="flex items-center gap-2.5">
                                                        <Icon className={cn("h-4 w-4 shrink-0", SOURCE_TINT[item.source])} />
                                                        <div className="min-w-0 flex-1">
                                                            {item.source === "custom" ? (
                                                                <input value={item.label} onChange={e => onPatchItem(item.id, { label: e.target.value })} placeholder="Item name…"
                                                                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] font-semibold text-slate-800 focus:border-blue-400 focus:outline-none" />
                                                            ) : (
                                                                <p className="text-[13px] font-semibold text-slate-800">{item.label || <span className="italic text-slate-400">Untitled item</span>}{item.list && <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">list</span>}</p>
                                                            )}
                                                            {item.note && <p className="mt-0.5 text-[11px] text-slate-400">{item.note}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1", SOURCE_TYPE_CHIP[item.source])}>{SOURCE_TYPE_LABEL[item.source]}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select value={item.checkTime ?? "none"} onChange={e => onPatchItem(item.id, { checkTime: e.target.value as DqCheckTime })}
                                                        className={cn("h-8 w-full rounded-md border px-1.5 text-[12px] font-semibold focus:border-blue-400 focus:outline-none",
                                                            (item.checkTime ?? "none") === "none" ? "border-slate-200 bg-white text-slate-500" : "border-blue-200 bg-blue-50 text-blue-700")}>
                                                        {DQ_CHECK_TIMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 pr-5">
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        {cl.sections.length > 1 && (
                                                            <select value={section.id} onChange={e => onMoveItem(item.id, e.target.value)} title="Move to section"
                                                                className="h-7 max-w-[7rem] rounded-md border border-slate-200 bg-white px-1.5 text-[12px] font-medium text-slate-600 focus:outline-none">
                                                                {cl.sections.map(s => <option key={s.id} value={s.id}>{s.title || "Untitled"}</option>)}
                                                            </select>
                                                        )}
                                                        <IconBtn title="Move up" disabled={ii === 0} onClick={() => onReorderItem(section.id, ii, -1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                                                        <IconBtn title="Move down" disabled={ii === section.items.length - 1} onClick={() => onReorderItem(section.id, ii, 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                                                        {item.source === "custom" ? (
                                                            <IconBtn title="Remove item" onClick={() => onRemoveItem(item.id)}><X className="h-4 w-4 text-slate-400" /></IconBtn>
                                                        ) : (
                                                            <span title="Disable it on the Compliances / Forms tab to remove" className="flex h-7 w-7 items-center justify-center text-slate-300"><Lock className="h-3.5 w-3.5" /></span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <ul className="divide-y divide-slate-100 lg:hidden">
                            {section.items.map((item, ii) => {
                                const Icon = SOURCE_ICON[item.source];
                                return (
                                    <li key={item.id} className="px-4 py-3">
                                        <div className="flex items-start gap-2.5">
                                            <Icon className={cn("mt-1 h-4 w-4 shrink-0", SOURCE_TINT[item.source])} />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="flex items-start gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        {item.source === "custom" ? (
                                                            <input value={item.label} onChange={e => onPatchItem(item.id, { label: e.target.value })} placeholder="Item name…"
                                                                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-[13px] font-semibold text-slate-800 focus:border-blue-400 focus:outline-none" />
                                                        ) : (
                                                            <p className="text-[13px] font-semibold text-slate-800">{item.label || <span className="italic text-slate-400">Untitled item</span>}</p>
                                                        )}
                                                        {item.note && <p className="mt-0.5 text-[11px] text-slate-400">{item.note}</p>}
                                                    </div>
                                                    <span className={cn("mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1", SOURCE_TYPE_CHIP[item.source])}>{SOURCE_TYPE_LABEL[item.source]}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <label className="flex-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Check time
                                                        <select value={item.checkTime ?? "none"} onChange={e => onPatchItem(item.id, { checkTime: e.target.value as DqCheckTime })}
                                                            className={cn("mt-1 h-8 w-full rounded-md border px-1.5 text-[12px] font-semibold focus:border-blue-400 focus:outline-none",
                                                                (item.checkTime ?? "none") === "none" ? "border-slate-200 bg-white text-slate-500" : "border-blue-200 bg-blue-50 text-blue-700")}>
                                                            {DQ_CHECK_TIMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                                        </select>
                                                    </label>
                                                    <div className="flex shrink-0 items-center gap-0.5 self-end">
                                                        <IconBtn title="Move up" disabled={ii === 0} onClick={() => onReorderItem(section.id, ii, -1)}><ChevronUp className="h-4 w-4" /></IconBtn>
                                                        <IconBtn title="Move down" disabled={ii === section.items.length - 1} onClick={() => onReorderItem(section.id, ii, 1)}><ChevronDown className="h-4 w-4" /></IconBtn>
                                                        {item.source === "custom" ? (
                                                            <IconBtn title="Remove item" onClick={() => onRemoveItem(item.id)}><X className="h-4 w-4 text-slate-400" /></IconBtn>
                                                        ) : (
                                                            <span title="Disable it on the Compliances / Forms tab to remove" className="flex h-7 w-7 items-center justify-center text-slate-300"><Lock className="h-3.5 w-3.5" /></span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </>)}
                    <div className="border-t border-slate-100 px-4 py-2.5">
                        <button type="button" onClick={() => onAddCustom(section.id)}
                            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:text-blue-700">
                            <Plus className="h-4 w-4" /> Add custom item
                        </button>
                    </div>
                </div>
            ))}
            <Button variant="outline" onClick={onAddSection}><FolderPlus className="h-4 w-4" /> Add section</Button>
        </div>
    );
}

function IconBtn({ title, disabled, onClick, children }: { title: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button type="button" title={title} disabled={disabled} onClick={onClick}
            className={cn("flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100", disabled && "cursor-not-allowed opacity-30 hover:bg-transparent")}>
            {children}
        </button>
    );
}

// ── Preview (full-page, launched from the Checklist tab) ─────────────────────────
// Resolve a form item's PolicyFormDef from its prefixed refId.
function formDefForRefId(refId?: string): PolicyFormDef | undefined {
    if (!refId) return undefined;
    if (refId.startsWith("consent:")) return POLICY_FORMS.find(f => f.id === refId.slice("consent:".length));
    if (refId.startsWith("onbform:")) return getOnboardingFormDef(refId.slice("onbform:".length));
    return undefined;
}

// Icon-only action button (Preview action column).
function IconAction({ title, Icon, onClick, disabled, tone = "slate" }: { title: string; Icon: React.ElementType; onClick: () => void; disabled?: boolean; tone?: "slate" | "blue" | "violet" }) {
    return (
        <button type="button" title={title} disabled={disabled} onClick={onClick}
            className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition",
                disabled ? "cursor-not-allowed border-slate-200 text-slate-300"
                    : tone === "blue" ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    : tone === "violet" ? "border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
            <Icon className="h-4 w-4" />
        </button>
    );
}

// Driver-info fields shown on top of the Preview.
const PREVIEW_DRIVER_FIELDS: { key: string; label: string; type: "text" | "date" }[] = [
    { key: "name", label: "Driver Name", type: "text" },
    { key: "license", label: "Driver's License Number", type: "text" },
];

// Plain-language "what to check" sentence — the item's check-time cadence takes
// priority, then falls back to its monitoring config / type.
function checkSentence(item: DqItem): string {
    if (item.checkTime && item.checkTime !== "none") return checkTimeMeta(item.checkTime).sentence;
    if (item.source === "form") return (item.fulfill ?? "fill") === "upload" ? "Signed form on file" : "Complete and sign the form";
    const cfg = item.monitoring;
    if (!cfg || !cfg.enabled) return "Keep a current copy on file";
    if (cfg.monitorBasedOn === "issue_date") return "Track from the issue date";
    return "Renew before the expiry date";
}

export function DqFilePreview({ cl, records, accountId, subjectId, subjectLabel = "Preview driver", initialDriverName, title, subtitle, headerRight, backLabel = "Back to builder", embedded, formsOnly, onPatchItem, onBack }: {
    cl: DqChecklist; records: SafetyRecord[]; accountId?: string;
    // When rendered for a REAL driver (main DQ Files page), pass the driver's id + name so
    // compliance/form records persist per driver; defaults to a synthetic preview subject.
    subjectId?: string; subjectLabel?: string; initialDriverName?: string;
    title?: string; subtitle?: string; headerRight?: React.ReactNode; backLabel?: string;
    // Embedded inside a host tab (e.g. the driver profile) → drop the full-page chrome/header.
    embedded?: boolean;
    // Forms-only view (driver profile ▸ Forms tab) → show only the file's form items (the
    // same fill/upload module + per-driver data), hide the Driver Info card + sign-off.
    formsOnly?: boolean;
    onPatchItem: (itemId: string, patch: Partial<DqItem>) => void;
    onBack: () => void;
}) {
    const [pdfView, setPdfView] = useState(false);
    const [openForm, setOpenForm] = useState<PolicyFormDef | null>(null);
    const [openFormPreview, setOpenFormPreview] = useState(false);   // open the form in view (preview) mode
    const [formsDetailOpen, setFormsDetailOpen] = useState(false);   // forms-only: a form's record detail is open
    const [formRecordItem, setFormRecordItem] = useState<DqItem | null>(null);
    const [docRecordItem, setDocRecordItem] = useState<DqItem | null>(null);
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [driverInfo, setDriverInfo] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};
        if (initialDriverName) init.name = initialDriverName;
        return init;
    });
    const [signoff, setSignoff] = useState<SignOffData>(() => ({ ...newSignOff(), role: "Safety Manager" }));
    const [itemQ, setItemQ] = useState("");

    // Live compliance store — document items open the REAL in-system record page
    // (DefaultComplianceDataPage.SubjectDocuments) and their Status reflects the store.
    const { getEntry, setEntry, setEntries, all } = useComplianceData(accountId);
    const previewSubjectId = subjectId ?? "dq-preview-driver";  // real driver id, or a synthetic preview subject
    const subjectIdForEntity = (e: SafetyRecord["entity"]) => (e === "Carrier" ? CARRIER_SUBJECT : previewSubjectId);
    const carrierName = (accountId ? getAccountById(accountId) : undefined)?.dbaName ?? (accountId ? getAccountById(accountId) : undefined)?.legalName ?? "the selected carrier";

    const recordById = useMemo(() => new Map(records.map(r => [r.id, r])), [records]);
    // ONE flat list — items across all sections, not grouped. The forms-only view (driver
    // profile ▸ Forms tab) shows EVERY form for the driver's TYPE (by region), not just the
    // ones already in the file: the file's forms first (keeping their requirement/note), then
    // every other catalog form matching the type — US Only → US + common, Canada Only → Canada
    // + common, Cross Border → all. Onboarding forms (no region) always apply.
    const items = useMemo(() => {
        const flat = cl.sections.flatMap(s => s.items);
        if (!formsOnly) return flat;
        const wanted = (r?: DqFormRegion) =>
            cl.type === "cross_border" ? true
                : cl.type === "us_only" ? (r === "US" || r === "All" || r == null)
                    : (r === "Canada" || r === "All" || r == null);
        const inFileForms = flat.filter(i => i.source === "form" && i.refId);
        const inFileRefs = new Set(inFileForms.map(i => i.refId));
        const catalogForms = ALL_FORM_OPTIONS
            .filter(o => wanted(o.region) && !inFileRefs.has(o.refId))
            .map(o => newDqItem("form", { id: o.refId, refId: o.refId, label: o.title, requirement: "optional" }));
        return [...inFileForms, ...catalogForms];
    }, [cl.sections, cl.type, formsOnly]);
    const filteredItems = useMemo(() => {
        const query = itemQ.trim().toLowerCase();
        return query ? items.filter(i => `${i.label} ${i.note ?? ""} ${checkSentence(i)}`.toLowerCase().includes(query)) : items;
    }, [items, itemQ]);

    // Forms-only view → render the forms through the SAME list UI as the Compliances tab
    // (SubjectDocuments), each form synthesized into a driver record. Clicking a form opens
    // its record detail with a per-form "Fill out the form" card (detailExtraFor).
    const formRecords = useMemo(() => (formsOnly ? items.map(formToRecord) : []), [items, formsOnly]);
    const openFormIn = (def: PolicyFormDef, preview: boolean) => { setOpenFormPreview(preview); setOpenForm(def); };
    const renderFormFill = (rec: SafetyRecord) => {
        const item = items.find(i => (i.refId ?? i.id) === rec.id);
        if (!item) return null;
        const def = formDefForRefId(item.refId);
        return (
            <FillFormSection
                formName={item.label}
                def={def}
                filled={!!checked[item.id]}
                onFill={() => def && openFormIn(def, false)}
                onView={() => def && openFormIn(def, true)}
                onToggleFilled={v => setChecked(c => ({ ...c, [item.id]: v }))}
            />
        );
    };

    const toggleChecked = (id: string) => setChecked(c => ({ ...c, [id]: !c[id] }));
    const setDriverField = (k: string, v: string) => setDriverInfo(d => ({ ...d, [k]: v }));
    const setNote = (id: string, v: string) => setNotes(n => ({ ...n, [id]: v }));
    // Completion — documents & forms reflect the compliance store (records on the record page);
    // forms are also complete when marked filled in-system (checked); custom points use checked.
    const itemComplete = (item: DqItem): boolean => {
        if (item.source === "custom") return !!checked[item.id];
        const rec = item.source === "document" ? recordById.get(item.refId ?? "") : formToRecord(item);
        const storeComplete = !!rec && entryStatus(rec, getEntry(subjectIdForEntity(rec.entity), rec.id)) === "complete";
        return item.source === "form" ? storeComplete || !!checked[item.id] : storeComplete;
    };

    // Shared per-item cells (reused by the desktop table + mobile cards).
    const reqSelect = (item: DqItem) => (
        <select value={item.requirement} onChange={e => onPatchItem(item.id, { requirement: e.target.value as DqRequirement })}
            className={cn("h-8 w-full rounded-lg border px-2 text-[12px] font-semibold focus:outline-none",
                item.requirement === "must" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-600")}>
            <option value="must">Required</option>
            <option value="optional">Optional</option>
        </select>
    );
    // Action buttons only — Open form / Go to record / Upload. The Missing / On file
    // status lives in its own column via renderStatus().
    const renderActions = (item: DqItem) => {
        return (
            <div className="flex items-center gap-1.5">
                {item.source === "form" && (
                    <IconAction title="Open form — fill or upload" Icon={ExternalLink} tone="blue" onClick={() => setFormRecordItem(item)} />
                )}
                {item.source === "document" && (
                    <IconAction title="Open compliance record — view & upload" Icon={ExternalLink} tone="blue" onClick={() => setDocRecordItem(item)} />
                )}
                {item.source === "custom" && (
                    <span className="text-[13px] text-slate-300" title="Manual check point — tick the checkbox">—</span>
                )}
            </div>
        );
    };
    // Status chip — On file / Missing, driven by the compliance store (+ in-system fill for forms).
    const renderStatus = (item: DqItem) => (
        itemComplete(item) ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"><Check className="h-3 w-3" /> On file</span>
        ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600"><AlertTriangle className="h-3 w-3" /> Missing</span>
        )
    );
    const notesInput = (item: DqItem) => (
        <input value={notes[item.id] ?? ""} onChange={e => setNote(item.id, e.target.value)} placeholder="Add a note…"
            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[12px] focus:border-blue-400 focus:outline-none" />
    );

    // A form opened to fill/view takes over the full screen (its own back button).
    // startPreview=false → fillable mode; true → the read-only preview ("View").
    if (openForm) return <PolicyForm def={openForm} startPreview={openFormPreview} onBack={() => { setOpenForm(null); setOpenFormPreview(false); }} />;

    // Form item → the SAME in-system record page as documents (Add record / Sample data /
    // Documents / Monitoring), backed by a synthesized record, PLUS a "Fill out the form"
    // section (detailExtra) so the form can also be completed & signed in-system.
    if (formRecordItem) {
        const def = formDefForRefId(formRecordItem.refId);
        const id = formRecordItem.id;
        const rec = formToRecord(formRecordItem);
        return (
            <DocRecordDetail
                record={rec}
                accountId={accountId}
                subjectId={subjectIdForEntity(rec.entity)}
                subjectLabel={driverInfo.name?.trim() || subjectLabel}
                onBack={() => setFormRecordItem(null)}
                detailExtra={
                    <FillFormSection
                        formName={formRecordItem.label}
                        def={def}
                        filled={!!checked[id]}
                        onFill={() => def && openFormIn(def, false)}
                        onView={() => def && openFormIn(def, true)}
                        onToggleFilled={v => setChecked(c => ({ ...c, [id]: v }))}
                    />
                }
            />
        );
    }

    // Document item → the REAL in-system compliance record page (Add record + Sample data
    // + Documents/Monitoring), opened straight to this record's detail.
    if (docRecordItem) {
        const rec = recordById.get(docRecordItem.refId ?? "");
        if (rec) return (
            <DocRecordDetail
                record={rec}
                accountId={accountId}
                subjectId={subjectIdForEntity(rec.entity)}
                subjectLabel={driverInfo.name?.trim() || subjectLabel}
                onBack={() => setDocRecordItem(null)}
            />
        );
        // rec missing (shouldn't happen for seeded items) — fall through to the preview.
    }

    // PDF view — the same branded, themeable document shell as the hiring consent forms
    // (letterhead + theme tabs + Print + Download PDF) via ThemedDocumentViewer.
    if (pdfView) {
        const VERIF = (item: DqItem) => (itemComplete(item) ? "Present" : "—");
        const infoRows = [
            { label: "Driver's Name", value: driverInfo.name || "" },
            { label: "CDL Number / State", value: driverInfo.license || "" },
            { label: "Date of Hire", value: "" },
            { label: "Date of Birth", value: "" },
            { label: "Vehicle Identification Number (VIN)", value: "" },
            { label: "License Plate Number", value: "" },
            { label: "Fleet Unit Number (if applicable)", value: "" },
            { label: "Date of Review / Inspection", value: "" },
        ];
        const tableRows = items.map(item => [
            `${item.label}${item.list ? " (list)" : ""}${item.note ? ` — ${item.note}` : ""}`,
            requirementMeta(item.requirement).label,
            monitoringSummary(item.monitoring),
            VERIF(item),
            notes[item.id] || "",
        ]);
        const signRows = [
            { label: "Reviewed by", value: signoff.name || "" },
            { label: "Title / role", value: signoff.role || "" },
            { label: "Date", value: signoff.date || "" },
        ];
        const sections: DocSection[] = [
            { title: "Driver / Vehicle Information", groups: [{ rows: infoRows }] },
            { title: "Driver Qualification File", groups: [{ table: { headers: ["Check Item", "Requirement", "Monitoring", "Verification", "Notes"], rows: tableRows } }] },
            { title: "Reviewer Sign-Off", groups: [{ rows: signRows, ...(signoff.sig ? { images: [signoff.sig] } : {}) }] },
        ];
        const slug = (cl.name || "dq-file").trim().replace(/\s+/g, "-").toLowerCase();
        return (
            <ThemedDocumentViewer
                title={cl.name || "Driver Qualification File"}
                subtitle={`Driver Qualification File · ${driverTypeLabel(cl.type)}${cl.jurisdiction ? ` · ${cl.jurisdiction}` : ""}`}
                badge={driverTypeLabel(cl.type)}
                sections={sections}
                fileName={`${slug}.pdf`}
                onBack={() => setPdfView(false)}
                backLabel="Back to preview"
            />
        );
    }

    return (
        <div className={embedded ? "" : "min-h-screen bg-slate-50"}>
            {embedded ? (
                /* Embedded — an integrated header card (title + actions) so it reads as part
                   of the tab, not buttons floating in the page. Stacks on mobile. Hidden while a
                   form's record detail is open (the detail has its own header + "Back to list"). */
                formsDetailOpen ? null : (
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FileCheck2 className="h-5 w-5" /></div>
                        <div className="min-w-0">
                            <p className="truncate text-[15px] font-bold text-slate-900">{title ?? "Driver Qualification File"}</p>
                            <p className="text-[11px] leading-snug text-slate-500">{subtitle ?? "Verify items, open / upload records and sign off — saved for this driver."}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                        {headerRight}
                        <button type="button" onClick={() => setPdfView(true)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                            <FileDown className="h-4 w-4" /> PDF view
                        </button>
                    </div>
                </div>
                )
            ) : (
                /* Header — same chrome as the builder */
                <div className="bg-white border-b border-slate-200">
                    <div className="px-4 sm:px-8 py-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <button type="button" onClick={onBack} title={backLabel}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800">
                                    <ChevronLeft className="h-[18px] w-[18px]" />
                                </button>
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white"><Eye className="h-5 w-5" /></div>
                                <div className="min-w-0">
                                    <h1 className="text-2xl font-bold text-slate-900">{title ?? `Preview — ${cl.name || "Untitled DQ File"}`}</h1>
                                    <p className="mt-0.5 text-sm text-slate-500">{subtitle ?? `${driverTypeLabel(cl.type)}${cl.jurisdiction ? ` · ${cl.jurisdiction}` : ""} — set each item’s requirement and open / upload its form or compliance record.`}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {headerRight}
                                <button type="button" onClick={() => setPdfView(true)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                    <FileDown className="h-4 w-4" /> PDF view
                                </button>
                                <button type="button" onClick={onBack}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                    <ChevronLeft className="h-4 w-4" /> {backLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={embedded ? "" : "px-4 py-6 sm:px-8"}>
                <div className="space-y-5">
                        {/* Driver Information — hidden in the forms-only view (host tab already shows the driver). */}
                        {!formsOnly && (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                                <p className="text-sm font-bold text-slate-800">Driver Information</p>
                                <p className="text-[11px] leading-snug text-slate-500">The driver this DQ file belongs to.</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                                {PREVIEW_DRIVER_FIELDS.map(f => (
                                    <label key={f.key} className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}
                                        <input type={f.type} value={driverInfo[f.key] ?? ""} onChange={e => setDriverField(f.key, e.target.value)}
                                            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal normal-case text-slate-800 focus:border-blue-400 focus:outline-none" />
                                    </label>
                                ))}
                            </div>
                        </div>
                        )}

                        {/* Check-item list */}
                        {items.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-400">{formsOnly ? "No forms available for this driver's type." : "This DQ file has no items yet — add compliances & forms in the builder."}</div>
                        ) : formsOnly ? (
                            /* Forms tab → the SAME list-view UI as the Compliances tab (SubjectDocuments):
                               rows = the file's forms as synthesized driver records; click a form → its record
                               detail with a per-form "Fill out the form" card + Add-record / upload. Same per-driver data. */
                            <SubjectDocuments
                                embedded
                                hideCategoryTabs
                                entity="Driver"
                                subjectId={previewSubjectId}
                                subjectLabel={driverInfo.name?.trim() || subjectLabel}
                                carrierName={carrierName}
                                records={formRecords}
                                getEntry={getEntry}
                                setEntry={setEntry}
                                setEntries={setEntries}
                                all={all}
                                onDetailChange={setFormsDetailOpen}
                                detailExtraFor={renderFormFill}
                            />
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {/* Toolbar */}
                                <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="relative w-full sm:w-72">
                                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input value={itemQ} onChange={e => setItemQ(e.target.value)} placeholder="Search check items…" className="h-9 pl-9" />
                                    </div>
                                    <span className="shrink-0 text-[12px] font-medium text-slate-500 tabular-nums">{filteredItems.length} of {items.length} items</span>
                                </div>
                                {filteredItems.length === 0 ? (
                                    <div className="px-5 py-12 text-center text-sm text-slate-400">No items match “{itemQ}”.</div>
                                ) : (<>
                                    {/* Desktop table — only at xl+, where the (embedded) tab has room. */}
                                    <div className="hidden overflow-x-auto xl:block">
                                        <table className="w-full min-w-[880px]">
                                            <thead className="border-b border-slate-200 bg-slate-50/50">
                                                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    <th className="px-4 py-2.5 pl-5">Check Item</th>
                                                    <th className="w-28 px-3 py-2.5">Req / Opt</th>
                                                    <th className="w-16 px-3 py-2.5 whitespace-nowrap">Action</th>
                                                    <th className="w-24 px-3 py-2.5">Status</th>
                                                    <th className="w-12 px-2 py-2.5 text-center">Check</th>
                                                    <th className="w-44 px-4 py-2.5 pr-5">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredItems.map(item => {
                                                    const Icon = SOURCE_ICON[item.source];
                                                    return (
                                                        <tr key={item.id} className={cn("border-b border-slate-100 align-middle transition-colors", checked[item.id] ? "bg-emerald-50/40" : "hover:bg-slate-50/60")}>
                                                            <td className="px-4 py-3.5 pl-5">
                                                                <div className="flex items-center gap-2.5">
                                                                    <Icon className={cn("h-4 w-4 shrink-0", SOURCE_TINT[item.source])} />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[13px] font-semibold text-slate-800">
                                                                            {item.label || <span className="italic text-slate-400">Untitled item</span>}
                                                                            {item.list && <span className="ml-1.5 rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">list</span>}
                                                                        </p>
                                                                        <p className="mt-0.5 text-[11px] text-slate-500">{checkSentence(item)}</p>
                                                                        {item.note && <p className="mt-0.5 text-[11px] italic text-slate-400">{item.note}</p>}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-3 py-3.5">{reqSelect(item)}</td>
                                                            <td className="px-3 py-3.5">{renderActions(item)}</td>
                                                            <td className="px-3 py-3.5">{renderStatus(item)}</td>
                                                            <td className="px-2 py-3.5 text-center">
                                                                <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggleChecked(item.id)} className="h-4 w-4 accent-emerald-600" />
                                                            </td>
                                                            <td className="px-4 py-3.5 pr-5">{notesInput(item)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile / tablet cards — below xl, so the wide table never overflows the tab. */}
                                    <ul className="divide-y divide-slate-100 xl:hidden">
                                        {filteredItems.map(item => {
                                            const Icon = SOURCE_ICON[item.source];
                                            const hasAction = item.source !== "custom";
                                            return (
                                                <li key={item.id} className={cn("space-y-3 px-4 py-4 transition-colors", checked[item.id] && "bg-emerald-50/40")}>
                                                    {/* Title + live status */}
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-start gap-2.5">
                                                            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", SOURCE_TINT[item.source])} />
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                                                                    <span className="text-[13px] font-semibold text-slate-800">{item.label || "Untitled item"}</span>
                                                                    {item.list && <span className="rounded bg-slate-100 px-1 py-0.5 text-[10px] font-semibold text-slate-500">list</span>}
                                                                </div>
                                                                <p className="mt-0.5 text-[11px] text-slate-500">{checkSentence(item)}</p>
                                                                {item.note && <p className="mt-0.5 text-[11px] italic text-slate-400">{item.note}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0">{renderStatus(item)}</div>
                                                    </div>
                                                    {/* Controls: requirement · open action · manual check */}
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <div className="w-32 shrink-0">{reqSelect(item)}</div>
                                                        {hasAction && renderActions(item)}
                                                        <label className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600">
                                                            <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggleChecked(item.id)} className="h-4 w-4 accent-emerald-600" />
                                                            Checked
                                                        </label>
                                                    </div>
                                                    {/* Notes */}
                                                    {notesInput(item)}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>)}
                            </div>
                        )}

                        {!formsOnly && items.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <ReviewSignOff bare kicker="Reviewer Sign-Off"
                                    heading="I confirm this Driver Qualification File has been reviewed and is complete."
                                    value={signoff} onChange={setSignoff}
                                    subtext="By signing you confirm every required item above has been reviewed. Your name, title, date and signature are recorded on file."
                                    nameLabel="Reviewed by" buttonLabel="Confirm review & sign" signedLabel="Reviewed & signed" signedByLabel="Reviewed by" />
                            </div>
                        )}
                </div>
            </div>

        </div>
    );
}


// ── Real in-system compliance record page ────────────────────────────────────────
// A document item opens the ACTUAL DefaultComplianceDataPage record detail (Documents /
// Monitoring tabs, Add record, Sample data) via SubjectDocuments + autoOpenRecordId —
// scoped to a synthetic preview subject so the DQ template preview doesn't mutate real
// drivers' compliance data. Back-to-list inside the detail returns to the preview.
function DocRecordDetail({ record, accountId, subjectId, subjectLabel, detailExtra, onBack }: {
    record: SafetyRecord;
    accountId?: string;
    subjectId: string;
    subjectLabel: string;
    detailExtra?: React.ReactNode;
    onBack: () => void;
}) {
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : "the selected carrier";
    const { all, getEntry, setEntry, setEntries } = useComplianceData(accountId);
    const { records: customRecords } = useCustomSafetyRecords(accountId);
    // Ensure the (possibly synthesized, form-backed) record is in the list SubjectDocuments filters.
    const records = useMemo(() => {
        const base = [...customRecords, ...SAFETY_RECORDS];
        return base.some(r => r.id === record.id) ? base : [record, ...base];
    }, [customRecords, record]);
    // Return to the preview once the record's detail is closed. onDetailChange MUST be a
    // stable identity — SubjectDocuments re-fires it on every render, so an inline arrow
    // would spuriously trigger onBack. Keep the latest onBack in a ref.
    const opened = useRef(false);
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;
    const handleDetailChange = useCallback((open: boolean) => {
        if (open) opened.current = true;
        else if (opened.current) onBackRef.current();
    }, []);
    return (
        <SubjectDocuments
            entity={record.entity}
            subjectId={subjectId}
            subjectLabel={subjectLabel}
            carrierName={carrierName}
            records={records}
            getEntry={getEntry}
            setEntry={setEntry}
            setEntries={setEntries}
            all={all}
            autoOpenRecordId={record.id}
            onDetailChange={handleDetailChange}
            onBack={onBack}
            detailExtra={detailExtra}
        />
    );
}

// ── "Fill out the form" section ──────────────────────────────────────────────────
// Rendered INSIDE a DQ form's record detail page (via SubjectDocuments `detailExtra`),
// between the record header and the Documents/Monitoring tabs. Lets the form be
// completed & signed in-system, alongside the standard Add record / upload flow the
// record page already provides. Styled to match the record page's cards.
function FillFormSection({ formName, def, filled, onFill, onView, onToggleFilled }: {
    formName: string;
    def: PolicyFormDef | undefined;
    filled: boolean;
    onFill: () => void;
    onView: () => void;
    onToggleFilled: (v: boolean) => void;
}) {
    return (
        <div className={cn("rounded-xl border p-5 shadow-sm transition-colors", filled ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", filled ? "bg-emerald-100 text-emerald-600" : "bg-violet-50 text-violet-600")}>
                        {filled ? <FileCheck2 className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[15px] font-bold text-slate-800">Fill out the form</p>
                            {filled && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><Check className="h-3 w-3" /> Completed</span>}
                        </div>
                        <p className="mt-0.5 text-[13px] text-slate-500">
                            {filled
                                ? <>{formName || "This form"} is completed in the system. View the signed form, or reopen to edit — or add a signed copy in the records below.</>
                                : <>Complete and sign {formName || "this form"} directly in the system — or add a signed copy in the records below.</>}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {filled ? (
                        <>
                            <Button onClick={onView} disabled={!def}><Eye className="h-4 w-4" /> View form</Button>
                            <Button variant="outline" onClick={onFill} disabled={!def}><PenLine className="h-4 w-4" /> Edit</Button>
                        </>
                    ) : (
                        <Button onClick={onFill} disabled={!def}>
                            <FileSignature className="h-4 w-4" /> {def ? "Open & fill form" : "Form unavailable"}
                        </Button>
                    )}
                </div>
            </div>
            {/* Completion toggle */}
            <label className="mt-4 flex cursor-pointer items-center gap-2 border-t border-slate-100 pt-3.5 text-[13px] text-slate-600">
                <input type="checkbox" checked={filled} onChange={e => onToggleFilled(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
                Mark as completed in system
            </label>
        </div>
    );
}

