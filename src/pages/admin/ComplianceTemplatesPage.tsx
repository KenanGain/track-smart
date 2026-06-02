import { useMemo, useState } from 'react';
import {
    Plus, Trash2, Lock, Check, Pencil, X, Save,
    ShieldCheck, FileText, Gauge, LayoutTemplate, Search, Building2, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import {
    loadTemplates, upsertTemplate, deleteTemplate,
    applyToggle, applyBulk, withMandatoryDocs, handOverTemplates,
    type CarrierComplianceAssignment, type ComplianceTemplate,
} from './carrier-compliance.data';
import { SERVICE_PROFILES_DB } from '@/pages/accounts/service-profiles.data';
import {
    KeyNumbersAssignment, DocumentsAssignment, TemplatesPanel, formTypeLabel,
} from './CarrierComplianceSetupPage';
import { SEED_KEY_NUMBERS, DOCUMENTS } from './ComplianceAndDocumentsPage';
import {
    DEFAULT_MONITORING, monitorItemKey, reminderSummary, type MonitoringConfig,
} from '@/pages/compliance/compliance-monitoring.data';
import { MonitoringNotificationsForm } from '@/components/compliance/MonitoringNotificationsForm';
import {
    loadTemplates as loadHiringTemplates, type DriverHiringTemplate,
} from '@/pages/settings/driver-hiring-templates.data';

/**
 * Super Admin → Compliance Templates.
 *
 * Author full-bundle templates: pick what's enabled across Compliance (key
 * numbers), Documents, Monitoring (per-item reminders/channels) and Hiring
 * Templates, save as a named template. Saved templates flow into the "Apply
 * Templates" picker on Service Profile / Carrier Compliance Setup, which
 * cascades down to carriers.
 */

type TplTab = 'compliance' | 'documents' | 'monitoring' | 'hiring';
const today = () => new Date().toISOString().slice(0, 10);

interface MonitorItem { kind: 'kn' | 'doc'; id: string; name: string; hasExpiry: boolean; hasIssueDate: boolean; }

function blankAssignment(id: string): CarrierComplianceAssignment {
    return {
        carrierId: id,
        enabledKeyNumberIds: [],
        enabledDocumentTypeIds: withMandatoryDocs([]),
        enabledHiringTemplateIds: [],
        updatedAt: today(),
    };
}

function assignmentFromTemplate(t: ComplianceTemplate): CarrierComplianceAssignment {
    return {
        carrierId: t.id,
        enabledKeyNumberIds: [...t.enabledKeyNumberIds],
        enabledDocumentTypeIds: withMandatoryDocs([...t.enabledDocumentTypeIds]),
        enabledHiringTemplateIds: [...(t.enabledHiringTemplateIds ?? [])],
        updatedAt: today(),
    };
}

export const ComplianceTemplatesPage = () => {
    const [templates, setTemplates] = useState<ComplianceTemplate[]>(() => loadTemplates());
    const [selectedId, setSelectedId] = useState<string>(() => loadTemplates()[0]?.id ?? '');
    const selected = templates.find(t => t.id === selectedId) ?? null;
    const isSeedSelected = !!selected?.isSeed;

    // Editable draft for the selected template.
    const [name, setName] = useState<string>(selected?.name ?? '');
    const [description, setDescription] = useState<string>(selected?.description ?? '');
    const [assignment, setAssignment] = useState<CarrierComplianceAssignment>(
        () => (selected ? assignmentFromTemplate(selected) : blankAssignment('draft')),
    );
    const [monitoring, setMonitoring] = useState<Record<string, MonitoringConfig>>(
        () => ({ ...(selected?.monitoring ?? {}) }),
    );

    const [tab, setTab] = useState<TplTab>('compliance');
    const [formType, setFormType] = useState<string>('hiring-driver');
    const [configuring, setConfiguring] = useState<MonitorItem | null>(null);
    const [savedFlash, setSavedFlash] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [assignNote, setAssignNote] = useState<string | null>(null);

    const [hiringTemplates] = useState<DriverHiringTemplate[]>(() => loadHiringTemplates());
    const formTypeOptions = useMemo(() => {
        const seen = new Set<string>();
        const out: { id: string; label: string }[] = [];
        for (const t of hiringTemplates) {
            if (seen.has(t.formType)) continue;
            seen.add(t.formType);
            out.push({ id: t.formType, label: formTypeLabel(t.formType) });
        }
        if (out.length === 0) out.push({ id: 'hiring-driver', label: 'Hiring Driver' });
        return out;
    }, [hiringTemplates]);
    const filteredHiring = useMemo(() => hiringTemplates.filter(t => t.formType === formType), [hiringTemplates, formType]);

    const enabledKnSet = useMemo(() => new Set(assignment.enabledKeyNumberIds), [assignment]);
    const enabledDocSet = useMemo(() => new Set(assignment.enabledDocumentTypeIds), [assignment]);

    // Date-bearing enabled items eligible for monitoring.
    const monitorItems = useMemo<MonitorItem[]>(() => {
        const out: MonitorItem[] = [];
        for (const k of SEED_KEY_NUMBERS) {
            if (k.status === 'Active' && enabledKnSet.has(k.id) && (k.hasExpiry || k.issueDateRequired)) {
                out.push({ kind: 'kn', id: k.id, name: k.name, hasExpiry: !!k.hasExpiry, hasIssueDate: !!k.issueDateRequired });
            }
        }
        for (const d of DOCUMENTS) {
            if (d.status === 'Active' && enabledDocSet.has(d.id) && (d.expiryRequired || d.issueDateRequired)) {
                out.push({ kind: 'doc', id: d.id, name: d.name, hasExpiry: !!d.expiryRequired, hasIssueDate: !!d.issueDateRequired });
            }
        }
        return out;
    }, [enabledKnSet, enabledDocSet]);

    const loadInto = (t: ComplianceTemplate | null) => {
        setSelectedId(t?.id ?? '');
        setName(t?.name ?? '');
        setDescription(t?.description ?? '');
        setAssignment(t ? assignmentFromTemplate(t) : blankAssignment('draft'));
        setMonitoring({ ...(t?.monitoring ?? {}) });
        setTab('compliance');
    };

    const handleNew = () => {
        loadInto(null);
        setName('New Template');
    };

    const handleSelect = (t: ComplianceTemplate) => loadInto(t);

    const flash = () => { setSavedFlash(true); window.setTimeout(() => setSavedFlash(false), 1500); };

    const handleSave = () => {
        if (!name.trim()) return;
        // Editing a custom template keeps its id; saving a built-in creates a new custom copy.
        const id = (selectedId && !isSeedSelected) ? selectedId : `tmpl-${Math.random().toString(36).slice(2, 9)}`;
        const t: ComplianceTemplate = {
            id,
            name: name.trim(),
            description: description.trim() || undefined,
            enabledKeyNumberIds: [...assignment.enabledKeyNumberIds],
            enabledDocumentTypeIds: [...assignment.enabledDocumentTypeIds],
            enabledHiringTemplateIds: [...(assignment.enabledHiringTemplateIds ?? [])],
            monitoring: Object.keys(monitoring).length ? monitoring : undefined,
            isSeed: false,
            updatedAt: today(),
        };
        upsertTemplate(t);
        setTemplates(loadTemplates());
        setSelectedId(id);
    };

    /** Hand over (provision) compliance + hiring templates to service profiles —
     *  grants access only; the profile applies the values itself afterwards. */
    const handOver = (complianceIds: string[], hiringIds: string[], profileIds: string[]) => {
        const total = complianceIds.length + hiringIds.length;
        if (total === 0 || profileIds.length === 0) return;
        handOverTemplates(profileIds, complianceIds, hiringIds);
        setAssigning(false);
        setAssignNote(`Handed over ${total} template${total === 1 ? '' : 's'} to ${profileIds.length} service profile${profileIds.length === 1 ? '' : 's'}.`);
        window.setTimeout(() => setAssignNote(null), 3500);
    };

    const handleDelete = (t: ComplianceTemplate) => {
        if (t.isSeed) return;
        if (!window.confirm(`Delete template "${t.name}"?`)) return;
        deleteTemplate(t.id);
        const next = loadTemplates();
        setTemplates(next);
        loadInto(next[0] ?? null);
    };

    // Compliance / Documents toggles run the KN↔Doc cascade on the draft.
    const handleToggle = (kind: 'keynumber' | 'document', id: string, enable: boolean) =>
        setAssignment(prev => applyToggle(prev, kind, id, enable).next);
    const handleBulk = (kind: 'keynumber' | 'document', ids: string[], enable: boolean) =>
        setAssignment(prev => applyBulk(prev, kind, ids, enable));

    // Hiring template enrolment on the draft.
    const enabledHiringIds = assignment.enabledHiringTemplateIds ?? [];
    // Hiring pipelines collect the "used in hiring" Key Numbers + Documents, so
    // enabling a hiring template auto-includes those items (linked dimensions).
    const withHiringRequirements = (a: CarrierComplianceAssignment): CarrierComplianceAssignment => {
        let next = a;
        for (const k of SEED_KEY_NUMBERS) {
            if (k.status === 'Active' && k.usedInHiring && !next.enabledKeyNumberIds.includes(k.id)) {
                next = applyToggle(next, 'keynumber', k.id, true).next;
            }
        }
        for (const d of DOCUMENTS) {
            if (d.status === 'Active' && d.usedInHiring && !next.enabledDocumentTypeIds.includes(d.id)) {
                next = applyToggle(next, 'document', d.id, true).next;
            }
        }
        return next;
    };
    const toggleHiring = (id: string, enabled: boolean) =>
        setAssignment(prev => {
            const next: CarrierComplianceAssignment = {
                ...prev,
                enabledHiringTemplateIds: enabled
                    ? [...new Set([...(prev.enabledHiringTemplateIds ?? []), id])]
                    : (prev.enabledHiringTemplateIds ?? []).filter(x => x !== id),
            };
            return enabled ? withHiringRequirements(next) : next;
        });
    const bulkHiring = (enable: boolean) =>
        setAssignment(prev => {
            const next: CarrierComplianceAssignment = {
                ...prev,
                enabledHiringTemplateIds: enable
                    ? [...new Set([...(prev.enabledHiringTemplateIds ?? []), ...filteredHiring.map(t => t.id)])]
                    : (prev.enabledHiringTemplateIds ?? []).filter(id => !filteredHiring.some(t => t.id === id)),
            };
            return enable ? withHiringRequirements(next) : next;
        });

    // Monitoring per item.
    const cfgFor = (key: string): MonitoringConfig => monitoring[key] ?? DEFAULT_MONITORING;
    const setMonEnabled = (key: string, enabled: boolean) =>
        setMonitoring(prev => ({ ...prev, [key]: { ...(prev[key] ?? DEFAULT_MONITORING), enabled } }));
    const setMonConfig = (key: string, cfg: MonitoringConfig) =>
        setMonitoring(prev => ({ ...prev, [key]: cfg }));

    const pill = (id: TplTab, label: string, Icon: React.ComponentType<{ size?: number; className?: string }>) => {
        const active = tab === id;
        return (
            <button
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                    "inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors",
                    active ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800",
                )}
            >
                <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} /> {label}
            </button>
        );
    };

    return (
        <div className="flex h-full flex-col bg-slate-50/50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-6 pt-4 pb-0">
                <nav className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
                    <span>Super Admin</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900">Compliance Templates</span>
                </nav>
                <div className="flex items-start gap-3 pb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-sm">
                        <LayoutTemplate size={18} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Compliance Templates</h1>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Build reusable templates — Compliance, Documents, Monitoring and Hiring — and assign them to service profiles, which pass them to carrier profiles.
                        </p>
                    </div>
                </div>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* Left rail — template list */}
                <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
                    <div className="flex-1 overflow-y-auto p-3">
                        <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Built-in</div>
                        <div className="space-y-1">
                            {templates.filter(t => t.isSeed).map(t => (
                                <TplListItem key={t.id} t={t} active={selectedId === t.id} onSelect={() => handleSelect(t)} />
                            ))}
                        </div>
                        {templates.some(t => !t.isSeed) && (
                            <>
                                <div className="mb-2 mt-4 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom</div>
                                <div className="space-y-1">
                                    {templates.filter(t => !t.isSeed).map(t => (
                                        <TplListItem key={t.id} t={t} active={selectedId === t.id} onSelect={() => handleSelect(t)} onDelete={() => handleDelete(t)} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="border-t border-slate-200 p-3">
                        <Button onClick={handleNew} className="w-full gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                            <Plus size={14} /> New template
                        </Button>
                    </div>
                </aside>

                {/* Right — editor */}
                <section className="flex min-w-0 flex-1 flex-col">
                    {/* Meta + tabs */}
                    <div className="border-b border-slate-200 bg-white px-6 py-4">
                        {isSeedSelected && (
                            <span className="mb-2 inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                <Lock size={10} /> Built-in · saving creates a custom copy
                            </span>
                        )}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                                <input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Template name"
                                    className="block w-full max-w-md rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xl font-bold text-slate-900 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Optional description — when to use this template"
                                    className="mt-1 block w-full max-w-xl rounded-md border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-slate-500 hover:border-slate-200 focus:border-blue-500 focus:bg-white focus:text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                {savedFlash && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                                        <Check size={11} /> Saved
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => setAssigning(true)}
                                    title="Hand over templates to service profiles (grants access; they apply them)"
                                    className="gap-1.5"
                                >
                                    <Send size={14} /> Hand over…
                                </Button>
                                <Button
                                    disabled={!name.trim()}
                                    onClick={() => { handleSave(); flash(); }}
                                    className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    <Save size={14} /> {isSeedSelected ? 'Save as new template' : 'Save template'}
                                </Button>
                            </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-200/70 pt-2 text-[11px] text-slate-500">
                            <span><span className="font-semibold text-blue-600">{enabledKnSet.size}</span> key numbers</span>
                            <span><span className="font-semibold text-violet-600">{enabledDocSet.size}</span> documents</span>
                            <span><span className="font-semibold text-emerald-600">{monitorItems.filter(i => cfgFor(monitorItemKey(i.kind, i.id)).enabled).length}</span> monitored</span>
                            <span><span className="font-semibold text-amber-600">{enabledHiringIds.length}</span> hiring templates</span>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                            {pill('compliance', 'Compliance', ShieldCheck)}
                            {pill('documents', 'Documents', FileText)}
                            {pill('monitoring', 'Monitoring', Gauge)}
                            {pill('hiring', 'Hiring Templates', LayoutTemplate)}
                        </div>
                    </div>

                    {/* Tab body */}
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {tab === 'compliance' && (
                            <KeyNumbersAssignment
                                enabledIds={enabledKnSet}
                                onToggle={(id, enabled) => handleToggle('keynumber', id, enabled)}
                                onBulk={(ids, enable) => handleBulk('keynumber', ids, enable)}
                            />
                        )}
                        {tab === 'documents' && (
                            <DocumentsAssignment
                                enabledIds={enabledDocSet}
                                onToggle={(id, enabled) => handleToggle('document', id, enabled)}
                                onBulk={(ids, enable) => handleBulk('document', ids, enable)}
                            />
                        )}
                        {tab === 'monitoring' && (
                            <MonitoringTemplateEditor
                                items={monitorItems}
                                cfgFor={cfgFor}
                                onSetEnabled={setMonEnabled}
                                onConfigure={setConfiguring}
                            />
                        )}
                        {tab === 'hiring' && (
                            <TemplatesPanel
                                hiringTemplates={filteredHiring}
                                formType={formType}
                                formTypeOptions={formTypeOptions}
                                onFormTypeChange={setFormType}
                                enabledHiringIds={enabledHiringIds}
                                onToggleHiring={toggleHiring}
                                onBulkHiring={bulkHiring}
                            />
                        )}
                    </div>
                </section>
            </div>

            {configuring && (
                <MonitoringConfigModal
                    item={configuring}
                    value={cfgFor(monitorItemKey(configuring.kind, configuring.id))}
                    onSave={(cfg) => { setMonConfig(monitorItemKey(configuring.kind, configuring.id), cfg); setConfiguring(null); }}
                    onClose={() => setConfiguring(null)}
                />
            )}

            {assigning && (
                <HandOverModal
                    templates={templates}
                    hiringTemplates={hiringTemplates}
                    initialTemplateIds={selected ? [selected.id] : []}
                    onHandOver={handOver}
                    onClose={() => setAssigning(false)}
                />
            )}

            {assignNote && (
                <div className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
                    {assignNote}
                </div>
            )}
        </div>
    );
};

/** Hand over (provision) compliance + hiring templates to service profiles — grants access only. */
function HandOverModal({ templates, hiringTemplates, initialTemplateIds, onHandOver, onClose }: {
    templates: ComplianceTemplate[];
    hiringTemplates: DriverHiringTemplate[];
    initialTemplateIds: string[];
    onHandOver: (complianceIds: string[], hiringIds: string[], profileIds: string[]) => void;
    onClose: () => void;
}) {
    const [compSel, setCompSel] = useState<Set<string>>(() => new Set(initialTemplateIds));
    const [hiringSel, setHiringSel] = useState<Set<string>>(new Set());
    const [profileSel, setProfileSel] = useState<Set<string>>(new Set());
    const [tplQuery, setTplQuery] = useState('');
    const [profileQuery, setProfileQuery] = useState('');

    const profiles = useMemo(() => SERVICE_PROFILES_DB.map(p => ({ id: p.id, name: p.dbaName || p.legalName })), []);

    const toggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) =>
        setter(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    const setAll = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, ids: string[], on: boolean) =>
        setter(prev => { const next = new Set(prev); ids.forEach(id => on ? next.add(id) : next.delete(id)); return next; });

    const tq = tplQuery.trim().toLowerCase();
    const compList = templates.filter(t => !tq || t.name.toLowerCase().includes(tq));
    const hireList = hiringTemplates.filter(t => !tq || t.name.toLowerCase().includes(tq));
    const pq = profileQuery.trim().toLowerCase();
    const profileList = profiles.filter(p => !pq || p.name.toLowerCase().includes(pq));
    const profileIds = profileList.map(p => p.id);
    const allProfilesOn = profileIds.length > 0 && profileIds.every(id => profileSel.has(id));

    const total = compSel.size + hiringSel.size;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Hand over templates</h3>
                        <p className="mt-0.5 text-sm text-slate-500">
                            Grant service profiles access to these templates. Nothing is applied — the service-profile admin assigns the values, and carriers inherit from their profile.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>

                {/* Two panes */}
                <div className="grid h-[58vh] grid-cols-2 divide-x divide-slate-200">
                    {/* LEFT — Templates (compliance + hiring) */}
                    <div className="flex min-h-0 flex-col">
                        <div className="px-5 pt-4 pb-2">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Templates to hand over</p>
                        </div>
                        <div className="px-5 pb-2">
                            <div className="relative">
                                <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                                <input value={tplQuery} onChange={e => setTplQuery(e.target.value)} placeholder="Search templates…"
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
                            {/* Compliance templates */}
                            <div className="flex items-center justify-between px-2 pb-1 pt-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliance ({compList.length})</span>
                                <button type="button" onClick={() => setAll(setCompSel, compList.map(t => t.id), !compList.every(t => compSel.has(t.id)))} className="text-[11px] font-semibold text-blue-600 hover:underline">
                                    {compList.length > 0 && compList.every(t => compSel.has(t.id)) ? 'Clear' : 'All'}
                                </button>
                            </div>
                            {compList.map(t => {
                                const on = compSel.has(t.id);
                                return (
                                    <label key={t.id} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 transition-colors", on ? "border-blue-400 bg-blue-50/40" : "border-slate-200 hover:bg-slate-50")}>
                                        <input type="checkbox" checked={on} onChange={() => toggle(setCompSel, t.id)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5">
                                                <span className="truncate text-sm font-semibold text-slate-800">{t.name}</span>
                                                {t.isSeed && <Lock size={11} className="shrink-0 text-slate-400" />}
                                            </span>
                                            <span className="block text-[11px] text-slate-400">{t.enabledKeyNumberIds.length} KN · {t.enabledDocumentTypeIds.length} docs</span>
                                        </span>
                                    </label>
                                );
                            })}
                            {/* Hiring templates */}
                            <div className="flex items-center justify-between px-2 pb-1 pt-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hiring (ATS) ({hireList.length})</span>
                                <button type="button" onClick={() => setAll(setHiringSel, hireList.map(t => t.id), !hireList.every(t => hiringSel.has(t.id)))} className="text-[11px] font-semibold text-blue-600 hover:underline">
                                    {hireList.length > 0 && hireList.every(t => hiringSel.has(t.id)) ? 'Clear' : 'All'}
                                </button>
                            </div>
                            {hireList.length === 0 && <div className="px-3 py-3 text-center text-[12px] text-slate-400">No hiring templates.</div>}
                            {hireList.map(t => {
                                const on = hiringSel.has(t.id);
                                return (
                                    <label key={t.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors", on ? "border-blue-400 bg-blue-50/40" : "border-slate-200 hover:bg-slate-50")}>
                                        <input type="checkbox" checked={on} onChange={() => toggle(setHiringSel, t.id)} className="h-4 w-4 accent-blue-600" />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-slate-800">{t.name}</span>
                                            <span className="block text-[11px] text-slate-400">{formTypeLabel(t.formType)}</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* RIGHT — Service profiles */}
                    <div className="flex min-h-0 flex-col">
                        <div className="flex items-center justify-between gap-2 px-5 pt-4">
                            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Building2 size={13} /> Service Profiles</p>
                            <button type="button" onClick={() => setAll(setProfileSel, profileIds, !allProfilesOn)} className="text-[11px] font-semibold text-blue-600 hover:underline">
                                {allProfilesOn ? 'Clear' : 'Select all'}
                            </button>
                        </div>
                        <div className="px-5 pb-2 pt-2">
                            <div className="relative">
                                <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                                <input value={profileQuery} onChange={e => setProfileQuery(e.target.value)} placeholder="Search service profiles…"
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
                            {profileList.length === 0 && <div className="px-3 py-8 text-center text-sm text-slate-400">No service profiles match.</div>}
                            {profileList.map(p => {
                                const on = profileSel.has(p.id);
                                return (
                                    <label key={p.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors", on ? "border-blue-400 bg-blue-50/40" : "border-slate-200 hover:bg-slate-50")}>
                                        <input type="checkbox" checked={on} onChange={() => toggle(setProfileSel, p.id)} className="h-4 w-4 accent-blue-600" />
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{p.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <span className="text-[12px] text-slate-500">
                        <span className="font-semibold text-slate-700">{total}</span> template{total === 1 ? '' : 's'}
                        <span className="mx-1.5 text-slate-300">→</span>
                        <span className="font-semibold text-slate-700">{profileSel.size}</span> service profile{profileSel.size === 1 ? '' : 's'}
                    </span>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                        <button type="button" disabled={total === 0 || profileSel.size === 0} onClick={() => onHandOver([...compSel], [...hiringSel], [...profileSel])}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                            <Send className="h-4 w-4" /> Hand over
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TplListItem({ t, active, onSelect, onDelete }: {
    t: ComplianceTemplate; active: boolean; onSelect: () => void; onDelete?: () => void;
}) {
    return (
        <div className={cn(
            "group flex items-center gap-2 rounded-md border px-2.5 py-2 transition-colors",
            active ? "border-blue-500 bg-blue-50/60" : "border-transparent hover:bg-slate-50",
        )}>
            <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
                <span className={cn("block truncate text-[13px] font-semibold", active ? "text-blue-900" : "text-slate-800")}>{t.name}</span>
                <span className="block truncate text-[11px] text-slate-400">
                    {t.enabledKeyNumberIds.length} KN · {t.enabledDocumentTypeIds.length} docs
                </span>
            </button>
            {t.isSeed
                ? <Lock size={12} className="shrink-0 text-slate-300" />
                : onDelete && (
                    <button type="button" onClick={onDelete} className="shrink-0 rounded p-1 text-slate-300 opacity-0 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100" title="Delete">
                        <Trash2 size={13} />
                    </button>
                )}
        </div>
    );
}

function MonitoringTemplateEditor({ items, cfgFor, onSetEnabled, onConfigure }: {
    items: MonitorItem[];
    cfgFor: (key: string) => MonitoringConfig;
    onSetEnabled: (key: string, enabled: boolean) => void;
    onConfigure: (item: MonitorItem) => void;
}) {
    if (items.length === 0) {
        return (
            <div className="px-6 py-12 text-center">
                <Gauge size={28} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">No date-bearing items enabled yet</p>
                <p className="mt-1 text-[12px] text-slate-400">Enable Key Numbers or Documents that track an expiry / issue date to monitor them.</p>
            </div>
        );
    }
    return (
        <div className="px-6 py-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/50">
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-5 py-3">Item</th>
                            <th className="px-3 py-3">Monitor</th>
                            <th className="px-3 py-3">Reminders</th>
                            <th className="px-3 py-3 text-right pr-5">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => {
                            const key = monitorItemKey(item.kind, item.id);
                            const cfg = cfgFor(key);
                            return (
                                <tr key={key} className={cn("border-b border-slate-100 last:border-b-0", !cfg.enabled && "bg-slate-50/40")}>
                                    <td className="px-5 py-3 align-top">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("inline-flex h-6 items-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wide", item.kind === 'kn' ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600")}>
                                                {item.kind === 'kn' ? 'Key #' : 'Doc'}
                                            </span>
                                            <span className={cn("text-sm font-semibold", cfg.enabled ? "text-slate-900" : "text-slate-400")}>{item.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <Toggle checked={cfg.enabled} onCheckedChange={(v) => onSetEnabled(key, v)} />
                                    </td>
                                    <td className="px-3 py-3 align-top text-[12px] text-slate-500">
                                        {cfg.enabled ? `${cfg.monitorBasedOn === 'expiry' ? 'Expiry' : 'Issue'} · ${reminderSummary(cfg)}` : <span className="text-slate-400">Off</span>}
                                    </td>
                                    <td className="px-3 py-3 align-top text-right pr-5">
                                        <button type="button" onClick={() => onConfigure(item)} title="Edit monitoring settings"
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
                                            <Pencil size={14} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function MonitoringConfigModal({ item, value, onSave, onClose }: {
    item: MonitorItem; value: MonitoringConfig; onSave: (cfg: MonitoringConfig) => void; onClose: () => void;
}) {
    const [draft, setDraft] = useState<MonitoringConfig>(value);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Monitoring Settings</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                            <FileText size={13} className={item.kind === 'doc' ? 'text-violet-500' : 'text-blue-500'} />
                            {item.name}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <MonitoringNotificationsForm value={draft} onChange={setDraft} />
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSave(draft)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                        <Save className="h-4 w-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComplianceTemplatesPage;
