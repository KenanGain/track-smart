import { useMemo, useState, useEffect } from "react";
import {
    LayoutGrid, Building2, Truck, User, Search, X, Save, Bell, ChevronDown,
    AlertTriangle, AlertCircle, Clock, CheckCircle2, ShieldCheck, FileText, Link2, CalendarClock,
    CalendarDays, ChevronLeft, ChevronRight, Send,
} from "lucide-react";
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useAppData } from "@/context/AppDataContext";
import {
    SEED_KEY_NUMBERS, DOCUMENTS,
} from "@/pages/admin/ComplianceAndDocumentsPage";
import {
    loadCarrierAssignment, getEntityAssignment, DOC_IDS_BY_KN_ID,
    type EntityScope,
} from "@/pages/admin/carrier-compliance.data";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-fleet.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import {
    loadMonitoringConfigs, saveMonitoringConfigs, monitorItemKey, reminderSummary,
    DEFAULT_MONITORING, REMINDER_DAYS, type MonitoringConfig,
    loadTasks, saveTasks, taskKeyOf, taskTone, TASK_STATUS_LABEL,
    type ComplianceTask, type TaskStatus, type RequestRecord, type Recipient,
} from "@/pages/compliance/compliance-monitoring.data";
import { MonitoringNotificationsForm } from "@/components/compliance/MonitoringNotificationsForm";
import { RequestDocumentModal } from "@/components/compliance/RequestDocumentModal";

type Scope = 'Carrier' | 'Driver' | 'Asset';
type Tab = 'Dashboard' | 'Calendar' | Scope;
type CalTone = 'red' | 'amber' | 'blue' | 'slate';

interface DueEvent { date: string; key: string; entityId?: string; name: string; scope: Scope; kind: 'kn' | 'doc'; entityName: string; tone: CalTone; daysLeft: number | null }
interface TaskRow { key: string; item: MonitorItem; scope: Scope; entityId?: string; entityName: string; status: RowStatus; task?: ComplianceTask; severity: Severity; assignee: string }

interface MonitorItem {
    key: string;
    kind: 'kn' | 'doc';
    id: string;
    name: string;
    scope: Scope;
    hasExpiry: boolean;
    hasIssueDate: boolean;
    required: boolean;
    linkedName?: string;
}

type Severity = 'urgent' | 'action' | 'optional';
type StatusTone = 'red' | 'amber' | 'emerald' | 'slate';

interface AlertRow { id: string; severity: Severity; scope: Scope; name: string; reason: string; assignee: string; count: number }
interface EntityOpt { id: string; name: string; sub?: string }
interface RowStatus { label: string; tone: StatusTone; date?: string; daysLeft: number | null }

const SCOPE_KEY: Record<Scope, EntityScope | 'carrier'> = { Carrier: 'carrier', Driver: 'driver', Asset: 'asset' };
const ASSIGNEE: Record<Scope, string> = { Carrier: 'Carrier Admin', Driver: 'Driver', Asset: 'Safety Manager' };

const DAY = 86_400_000;
const daysUntil = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const t = Date.parse(dateStr);
    if (Number.isNaN(t)) return null;
    return Math.round((t - Date.now()) / DAY);
};
const maxWindowOf = (cfg: MonitoringConfig) => Math.max(0, ...REMINDER_DAYS.filter(d => cfg.reminders[d]));

export function ComplianceMonitoringPage({ accountId }: { accountId?: string } = {}) {
    const carrier = useMemo<AccountRecord>(() => {
        if (accountId) { const a = ACCOUNTS_DB.find(x => x.id === accountId); if (a) return a; }
        return ACCOUNTS_DB[0];
    }, [accountId]);

    const assignment = useMemo(() => loadCarrierAssignment(carrier.id), [carrier.id]);
    const { keyNumberValues, documentUploads } = useAppData();

    const [tab, setTab] = useState<Tab>('Dashboard');
    const [configs, setConfigs] = useState<Record<string, MonitoringConfig>>(() => loadMonitoringConfigs());
    const [configuring, setConfiguring] = useState<MonitorItem | null>(null);
    const [calRequest, setCalRequest] = useState<DueEvent | null>(null);
    const [driverId, setDriverId] = useState<string | null>(null);
    const [assetId, setAssetId] = useState<string | null>(null);

    // Task lifecycle store (request / order / resolve), persisted.
    const [tasks, setTasks] = useState<Record<string, ComplianceTask>>(() => loadTasks());
    const updateTask = (key: string, mut: (t: ComplianceTask) => ComplianceTask) => {
        setTasks(prev => {
            const cur = prev[key] ?? { key, status: 'not_requested' as TaskStatus, requests: [] };
            const next = { ...prev, [key]: mut(cur) };
            saveTasks(next);
            return next;
        });
    };
    const today = () => new Date().toISOString().slice(0, 10);
    const sendRequest = (key: string, rec: Omit<RequestRecord, 'id' | 'sentAt' | 'sentBy'>) => updateTask(key, t => ({
        ...t,
        status: 'requested',
        lastContactAt: today(),
        lastContactMethod: rec.methods.join(' + '),
        requests: [...t.requests, { ...rec, id: `req_${Date.now().toString(36)}`, sentAt: today(), sentBy: 'Safety Manager' }],
    }));
    const setTaskStatus = (key: string, status: TaskStatus) => updateTask(key, t => ({ ...t, status }));

    const configFor = (key: string): MonitoringConfig => configs[key] ?? DEFAULT_MONITORING;
    const saveConfig = (key: string, cfg: MonitoringConfig) =>
        setConfigs(prev => { const next = { ...prev, [key]: cfg }; saveMonitoringConfigs(next); return next; });

    // Entities per scope
    const drivers = useMemo<EntityOpt[]>(() => (CARRIER_DRIVERS[carrier.id] ?? []).map((d: any) => ({ id: d.id, name: d.name, sub: d.licenseNumber })), [carrier.id]);
    const assets = useMemo<EntityOpt[]>(() => (CARRIER_ASSETS[carrier.id] ?? []).map((a: any) => ({ id: a.id, name: a.unitNumber, sub: `${a.make} ${a.model}` })), [carrier.id]);
    useEffect(() => { if (!driverId && drivers[0]) setDriverId(drivers[0].id); }, [drivers, driverId]);
    useEffect(() => { if (!assetId && assets[0]) setAssetId(assets[0].id); }, [assets, assetId]);

    const entityNameOf = (s: Scope, id?: string): string => {
        if (s === 'Driver') return drivers.find(d => d.id === id)?.name ?? 'Driver';
        if (s === 'Asset') return assets.find(a => a.id === id)?.name ?? 'Asset';
        return carrier.dbaName || carrier.legalName;
    };

    // Monitorable (date-bearing) item types enabled at carrier level
    const itemsByScope = useMemo(() => {
        const enabledKn = new Set(assignment.enabledKeyNumberIds);
        const enabledDoc = new Set(assignment.enabledDocumentTypeIds);
        const build = (scope: Scope): MonitorItem[] => {
            const sk = SCOPE_KEY[scope];
            const kns: MonitorItem[] = SEED_KEY_NUMBERS
                .filter(k => k.status === 'Active' && k.relatedTo === scope && enabledKn.has(k.id) && (k.hasExpiry || k.issueDateRequired))
                .map(k => ({
                    key: monitorItemKey('kn', k.id), kind: 'kn', id: k.id, name: k.name, scope,
                    hasExpiry: k.hasExpiry, hasIssueDate: k.issueDateRequired, required: k.numberRequired,
                    linkedName: (DOC_IDS_BY_KN_ID.get(k.id) ?? []).map(id => DOCUMENTS.find(d => d.id === id)?.name).filter(Boolean)[0] as string | undefined,
                }));
            const docs: MonitorItem[] = DOCUMENTS
                .filter(d => d.status === 'Active' && d.scope === sk && enabledDoc.has(d.id) && (d.expiryRequired || d.issueDateRequired))
                .map(d => ({
                    key: monitorItemKey('doc', d.id), kind: 'doc', id: d.id, name: d.name, scope,
                    hasExpiry: d.expiryRequired, hasIssueDate: d.issueDateRequired, required: d.requirementLevel !== 'optional',
                }));
            return [...kns, ...docs];
        };
        return { Carrier: build('Carrier'), Driver: build('Driver'), Asset: build('Asset') };
    }, [assignment]);

    const entitiesByScope = useMemo(() => ({
        Carrier: [undefined] as (string | undefined)[],
        Driver: drivers.map(d => d.id) as (string | undefined)[],
        Asset: assets.map(a => a.id) as (string | undefined)[],
    }), [drivers, assets]);

    const rawStatus = (item: MonitorItem, entityId?: string) => {
        if (item.kind === 'kn') {
            const v = keyNumberValues[entityId ? `${entityId}_${item.id}` : item.id];
            return { present: !!v?.value?.trim(), expiry: v?.expiryDate };
        }
        const ups = documentUploads[`doc:${entityId ?? 'carrier'}:${item.id}`] ?? [];
        return { present: ups.length > 0, expiry: ups[0]?.expiryDate };
    };

    // Per-entity row status (captured date + computed state).
    const rowStatusFor = (item: MonitorItem, entityId: string | undefined): RowStatus => {
        const cfg = configFor(item.key);
        const st = rawStatus(item, entityId);
        if (item.required && !st.present) return { label: 'Missing', tone: 'red', daysLeft: null };
        if (item.hasExpiry) {
            const d = daysUntil(st.expiry);
            if (d === null) return { label: st.present ? 'No expiry set' : 'Not set', tone: 'slate', daysLeft: null };
            if (d < 0) return { label: `Expired ${-d}d ago`, tone: 'red', date: st.expiry, daysLeft: d };
            if (d <= maxWindowOf(cfg)) return { label: `Expiring in ${d}d`, tone: 'amber', date: st.expiry, daysLeft: d };
            return { label: `Valid · ${d}d left`, tone: 'emerald', date: st.expiry, daysLeft: d };
        }
        return st.present ? { label: 'Recorded', tone: 'emerald', daysLeft: null } : { label: 'Not set', tone: 'slate', daysLeft: null };
    };

    // ── Alerts ──
    const alerts = useMemo<AlertRow[]>(() => {
        const out: AlertRow[] = [];
        (['Carrier', 'Driver', 'Asset'] as Scope[]).forEach(scope => {
            const ents = entitiesByScope[scope];
            for (const item of itemsByScope[scope]) {
                if (!configFor(item.key).enabled) continue;
                let missing = 0, expired = 0, expiring = 0;
                for (const e of ents) {
                    const s = rowStatusFor(item, e);
                    if (s.label === 'Missing') missing++;
                    else if (s.tone === 'red' && s.daysLeft !== null) expired++;
                    else if (s.tone === 'amber') expiring++;
                }
                if (expired > 0) out.push({ id: `${item.key}-exp`, severity: 'urgent', scope, name: item.name, reason: 'Expired', assignee: ASSIGNEE[scope], count: expired });
                if (expiring > 0) out.push({ id: `${item.key}-soon`, severity: 'action', scope, name: item.name, reason: 'Expiring soon', assignee: ASSIGNEE[scope], count: expiring });
                if (missing > 0) out.push({ id: `${item.key}-miss`, severity: item.required ? 'urgent' : 'optional', scope, name: item.name, reason: item.required ? 'Missing — required' : 'Missing — optional', assignee: ASSIGNEE[scope], count: missing });
            }
        });
        const rank: Record<Severity, number> = { urgent: 0, action: 1, optional: 2 };
        return out.sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
    }, [itemsByScope, entitiesByScope, configs, keyNumberValues, documentUploads]);

    // ── Expiry timeline buckets (across all entities) ──
    const timeline = useMemo(() => {
        const buckets = { Expired: 0, '≤30d': 0, '≤60d': 0, '≤90d': 0, Later: 0 };
        (['Carrier', 'Driver', 'Asset'] as Scope[]).forEach(scope => {
            for (const item of itemsByScope[scope]) {
                if (!item.hasExpiry || !configFor(item.key).enabled) continue;
                for (const e of entitiesByScope[scope]) {
                    const d = daysUntil(rawStatus(item, e).expiry);
                    if (d === null) continue;
                    if (d < 0) buckets.Expired++;
                    else if (d <= 30) buckets['≤30d']++;
                    else if (d <= 60) buckets['≤60d']++;
                    else if (d <= 90) buckets['≤90d']++;
                    else buckets.Later++;
                }
            }
        });
        return Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));
    }, [itemsByScope, entitiesByScope, configs, keyNumberValues, documentUploads]);

    // ── Due events (every captured expiry) for the calendar / timeline ──
    const dueEvents = useMemo<DueEvent[]>(() => {
        const out: DueEvent[] = [];
        (['Carrier', 'Driver', 'Asset'] as Scope[]).forEach(s => {
            for (const item of itemsByScope[s]) {
                if (!item.hasExpiry || !configFor(item.key).enabled) continue;
                for (const e of entitiesByScope[s]) {
                    const expiry = rawStatus(item, e).expiry;
                    if (!expiry) continue;
                    const d = daysUntil(expiry);
                    const tone: CalTone = d === null ? 'slate' : d < 0 ? 'red' : d <= 30 ? 'amber' : d <= 90 ? 'blue' : 'slate';
                    out.push({ date: expiry, key: taskKeyOf(item.kind, item.id, e), entityId: e, name: item.name, scope: s, kind: item.kind, entityName: entityNameOf(s, e), tone, daysLeft: d });
                }
            }
        });
        return out;
    }, [itemsByScope, entitiesByScope, configs, keyNumberValues, documentUploads, drivers, assets, carrier]);

    // Per-(item, entity) task rows for the inbox — actionable items + any with a task.
    const taskRows = useMemo<TaskRow[]>(() => {
        const rows: TaskRow[] = [];
        (['Carrier', 'Driver', 'Asset'] as Scope[]).forEach(s => {
            for (const item of itemsByScope[s]) {
                if (!configFor(item.key).enabled) continue;
                for (const e of entitiesByScope[s]) {
                    const status = rowStatusFor(item, e);
                    const key = taskKeyOf(item.kind, item.id, e);
                    const task = tasks[key];
                    const actionable = status.tone === 'red' || status.tone === 'amber';
                    if (!actionable && !task) continue;
                    const severity: Severity = status.label.startsWith('Missing')
                        ? (item.required ? 'urgent' : 'optional')
                        : status.tone === 'red' ? 'urgent' : status.tone === 'amber' ? 'action' : 'optional';
                    rows.push({ key, item, scope: s, entityId: e, entityName: entityNameOf(s, e), status, task, severity, assignee: ASSIGNEE[s] });
                }
            }
        });
        const rank: Record<Severity, number> = { urgent: 0, action: 1, optional: 2 };
        return rows.sort((a, b) => rank[a.severity] - rank[b.severity]);
    }, [itemsByScope, entitiesByScope, configs, tasks, keyNumberValues, documentUploads, drivers, assets, carrier]);

    const kpis = useMemo(() => {
        const sum = (sev: Severity) => alerts.filter(a => a.severity === sev).reduce((n, a) => n + a.count, 0);
        const monitored = (['Carrier', 'Driver', 'Asset'] as Scope[]).reduce((n, s) => n + itemsByScope[s].filter(i => configFor(i.key).enabled).length, 0);
        const total = (['Carrier', 'Driver', 'Asset'] as Scope[]).reduce((n, s) => n + itemsByScope[s].length, 0);
        return { monitored, urgent: sum('urgent'), action: sum('action'), optional: sum('optional'), total };
    }, [itemsByScope, alerts, configs]);

    const severityData = [
        { name: 'Urgent', value: kpis.urgent, fill: '#ef4444' },
        { name: 'Action', value: kpis.action, fill: '#f59e0b' },
        { name: 'Optional', value: kpis.optional, fill: '#94a3b8' },
    ].filter(d => d.value > 0);

    // Active scope list config
    const scope = (tab === 'Dashboard' ? null : tab) as Scope | null;
    const selectedEntityId = scope === 'Driver' ? driverId : scope === 'Asset' ? assetId : undefined;
    const scopeEntities = scope === 'Driver' ? drivers : scope === 'Asset' ? assets : [];

    const listItems = useMemo(() => {
        if (!scope) return [];
        if (scope === 'Carrier') return itemsByScope.Carrier;
        const id = selectedEntityId ?? undefined;
        if (!id) return itemsByScope[scope];
        const ea = getEntityAssignment(assignment, SCOPE_KEY[scope] as EntityScope, id);
        const knSet = new Set(ea.enabledKeyNumberIds);
        const docSet = new Set(ea.enabledDocumentTypeIds);
        return itemsByScope[scope].filter(i => i.kind === 'kn' ? knSet.has(i.id) : docSet.has(i.id));
    }, [scope, selectedEntityId, itemsByScope, assignment]);

    return (
        <div className="flex-1 min-h-screen bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <h1 className="text-2xl font-bold text-slate-900">Compliance Monitoring</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Track expiries and renewals for {carrier.dbaName || carrier.legalName} and route action items to the right people.
                </p>
                <div className="flex items-center gap-1 mt-4 -mb-5">
                    {([
                        { id: 'Dashboard', label: 'Dashboard', Icon: LayoutGrid },
                        { id: 'Calendar', label: 'Calendar', Icon: CalendarDays },
                        { id: 'Carrier', label: 'Carrier', Icon: Building2 },
                        { id: 'Driver', label: 'Driver', Icon: User },
                        { id: 'Asset', label: 'Asset', Icon: Truck },
                    ] as const).map(t => {
                        const active = tab === t.id;
                        return (
                            <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                    active ? "text-blue-600 border-blue-600" : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300",
                                )}>
                                <t.Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-8 py-6 space-y-5">
                {tab === 'Dashboard' ? (
                    <MonitoringDashboard
                        kpis={kpis} severityData={severityData} timeline={timeline}
                        itemsByScope={itemsByScope} configFor={configFor} onGoToScope={setTab}
                        taskRows={taskRows} company={carrier.dbaName || carrier.legalName}
                        onSendRequest={sendRequest} onSetStatus={setTaskStatus}
                    />
                ) : tab === 'Calendar' ? (
                    <MonitoringCalendar events={dueEvents} onRequest={setCalRequest} />
                ) : (
                    <MonitoringList
                        scope={scope!}
                        items={listItems}
                        entities={scopeEntities}
                        selectedEntityId={selectedEntityId ?? null}
                        onSelectEntity={scope === 'Driver' ? setDriverId : scope === 'Asset' ? setAssetId : () => {}}
                        statusFor={(item) => rowStatusFor(item, selectedEntityId ?? undefined)}
                        configFor={configFor}
                        onConfigure={setConfiguring}
                    />
                )}
            </div>

            {configuring && (
                <ConfigureModal
                    item={configuring}
                    value={configFor(configuring.key)}
                    onSave={(cfg) => { saveConfig(configuring.key, cfg); setConfiguring(null); }}
                    onClose={() => setConfiguring(null)}
                />
            )}

            <RequestDocumentModal
                isOpen={calRequest !== null}
                itemName={calRequest?.name ?? ''}
                entityName={calRequest?.entityName ?? ''}
                company={carrier.dbaName || carrier.legalName}
                defaultRecipient={(calRequest ? ASSIGNEE[calRequest.scope] : 'Safety Manager') as Recipient}
                onClose={() => setCalRequest(null)}
                onSend={(rec) => { if (calRequest) sendRequest(calRequest.key, rec); }}
            />
        </div>
    );
}

// ── Dashboard ───────────────────────────────────────────────────────────

function MonitoringDashboard({ kpis, severityData, timeline, itemsByScope, configFor, onGoToScope, taskRows, company, onSendRequest, onSetStatus }: {
    kpis: { monitored: number; urgent: number; action: number; optional: number; total: number };
    severityData: { name: string; value: number; fill: string }[];
    timeline: { bucket: string; count: number }[];
    itemsByScope: Record<Scope, MonitorItem[]>;
    configFor: (key: string) => MonitoringConfig;
    onGoToScope: (s: Scope) => void;
    taskRows: TaskRow[];
    company: string;
    onSendRequest: (key: string, rec: Omit<RequestRecord, 'id' | 'sentAt' | 'sentBy'>) => void;
    onSetStatus: (key: string, status: TaskStatus) => void;
}) {
    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <Kpi label="Monitored Items" value={kpis.monitored} Icon={ShieldCheck} accent="blue" />
                <Kpi label="Urgent" value={kpis.urgent} Icon={AlertTriangle} accent="red" />
                <Kpi label="Action Required" value={kpis.action} Icon={AlertCircle} accent="amber" />
                <Kpi label="Optional" value={kpis.optional} Icon={Clock} accent="slate" />
                <Kpi label="Tracked Total" value={kpis.total} Icon={LayoutGrid} accent="emerald" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <ChartCard title="Action items by severity" icon={<AlertCircle size={16} className="text-blue-600" />}>
                    {severityData.length === 0 ? (
                        <EmptyChart label="Nothing needs attention" />
                    ) : (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="55%" height={190}>
                                <PieChart>
                                    <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={75} paddingAngle={2}>
                                        {severityData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                                {severityData.map(d => (
                                    <div key={d.name} className="flex items-center gap-2 text-sm">
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                                        <span className="text-slate-600">{d.name}</span>
                                        <span className="font-bold tabular-nums text-slate-900">{d.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </ChartCard>

                <div className="lg:col-span-2">
                    <ChartCard title="Renewal timeline" icon={<CalendarClock size={16} className="text-blue-600" />}>
                        <ResponsiveContainer width="100%" height={190}>
                            <BarChart data={timeline} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {timeline.map((d) => (
                                        <Cell key={d.bucket} fill={d.bucket === 'Expired' ? '#ef4444' : d.bucket === '≤30d' ? '#f59e0b' : d.bucket === '≤60d' ? '#fbbf24' : d.bucket === '≤90d' ? '#60a5fa' : '#cbd5e1'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                </div>
            </div>

            {/* Task inbox — the action control center */}
            <TaskInbox rows={taskRows} company={company} onSendRequest={onSendRequest} onSetStatus={onSetStatus} />

            {/* Scope summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['Carrier', 'Driver', 'Asset'] as Scope[]).map(s => {
                        const items = itemsByScope[s];
                        const monitored = items.filter(i => configFor(i.key).enabled).length;
                        const Icon = s === 'Carrier' ? Building2 : s === 'Driver' ? User : Truck;
                        return (
                            <button key={s} type="button" onClick={() => onGoToScope(s)}
                                className="w-full text-left bg-white border border-slate-200 rounded-xl shadow-sm p-4 hover:border-blue-300 hover:shadow transition-all">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Icon size={16} /></span>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{s} monitoring</div>
                                            <div className="text-[11px] text-slate-500">{items.length} date-bearing items</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black tabular-nums text-slate-900 leading-none">{monitored}</div>
                                        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">monitored</div>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
            </div>
        </>
    );
}

// ── List view ───────────────────────────────────────────────────────────

function MonitoringList({ scope, items, entities, selectedEntityId, onSelectEntity, statusFor, configFor, onConfigure }: {
    scope: Scope;
    items: MonitorItem[];
    entities: EntityOpt[];
    selectedEntityId: string | null;
    onSelectEntity: (id: string) => void;
    statusFor: (item: MonitorItem) => RowStatus;
    configFor: (key: string) => MonitoringConfig;
    onConfigure: (item: MonitorItem) => void;
}) {
    const [search, setSearch] = useState("");
    const isEntityScope = scope === 'Driver' || scope === 'Asset';
    const selected = entities.find(e => e.id === selectedEntityId) ?? null;
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(i => !q || i.name.toLowerCase().includes(q));
    }, [items, search]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 p-5 pb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    {scope === 'Carrier' ? <Building2 size={18} /> : scope === 'Driver' ? <User size={18} /> : <Truck size={18} />}
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 leading-tight">{scope} monitoring</h3>
                    <p className="text-[12px] text-slate-500">
                        {isEntityScope ? `Pick a ${scope.toLowerCase()} to see its captured dates and status.` : 'Items that carry a date — captured dates and status.'}
                    </p>
                </div>
            </div>

            {/* Entity selector (Driver / Asset) */}
            {isEntityScope && (
                <div className="px-5 pb-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Configuring {scope}</label>
                    <div className="relative max-w-sm">
                        <select
                            value={selectedEntityId ?? ''}
                            onChange={(e) => onSelectEntity(e.target.value)}
                            disabled={entities.length === 0}
                            className="w-full h-10 pl-3 pr-9 rounded-lg border border-slate-300 text-sm font-bold text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:bg-slate-50"
                        >
                            {entities.length === 0
                                ? <option value="">No {scope.toLowerCase()}s available</option>
                                : entities.map(e => <option key={e.id} value={e.id}>{e.name}{e.sub ? ` — ${e.sub}` : ''}</option>)}
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                    </div>
                </div>
            )}

            <div className="px-5 pb-3">
                <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items..."
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
            </div>

            <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/50">
                        <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="px-5 py-3">Item</th>
                            <th className="px-3 py-3">Date Tracked</th>
                            <th className="px-3 py-3">Captured</th>
                            <th className="px-3 py-3">Status</th>
                            <th className="px-3 py-3">Monitoring</th>
                            <th className="px-3 py-3 text-right pr-5">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isEntityScope && !selected ? (
                            <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">Select a {scope.toLowerCase()} to view monitoring.</td></tr>
                        ) : rows.length === 0 ? (
                            <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-slate-500">No date-bearing items for this {scope.toLowerCase()}.</td></tr>
                        ) : rows.map(item => {
                            const cfg = configFor(item.key);
                            const st = statusFor(item);
                            return (
                                <tr key={item.key} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40">
                                    <td className="px-5 py-3 align-top">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("inline-flex h-6 items-center rounded px-1.5 text-[9px] font-bold uppercase tracking-wide", item.kind === 'kn' ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600")}>
                                                {item.kind === 'kn' ? 'Key #' : 'Doc'}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                                        </div>
                                        {item.linkedName && (
                                            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-blue-600"><Link2 size={10} /> Linked to: {item.linkedName}</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {item.hasExpiry && <DateChip label="Expiry" />}
                                            {item.hasIssueDate && <DateChip label="Issue date" />}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 align-top text-sm">
                                        {st.date ? <span className="text-slate-700">{st.date}</span> : <span className="text-slate-400 italic">—</span>}
                                    </td>
                                    <td className="px-3 py-3 align-top"><StatusBadge status={st} /></td>
                                    <td className="px-3 py-3 align-top">
                                        {cfg.enabled ? (
                                            <div>
                                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 size={11} /> On</span>
                                                <p className="mt-0.5 text-[11px] text-slate-500">{cfg.monitorBasedOn === 'expiry' ? 'Expiry' : 'Issue'} · {reminderSummary(cfg)}</p>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Off</span>
                                        )}
                                    </td>
                                    <td className="px-3 py-3 align-top text-right pr-5">
                                        <button type="button" onClick={() => onConfigure(item)}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-[12px] font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">
                                            <Bell size={13} /> Configure
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

// ── Task inbox (action control center) ──────────────────────────────────

function TaskInbox({ rows, company, onSendRequest, onSetStatus }: {
    rows: TaskRow[];
    company: string;
    onSendRequest: (key: string, rec: Omit<RequestRecord, 'id' | 'sentAt' | 'sentBy'>) => void;
    onSetStatus: (key: string, status: TaskStatus) => void;
}) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [requestRow, setRequestRow] = useState<TaskRow | null>(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [sevFilter, setSevFilter] = useState<'all' | Severity>('all');
    const [dueFilter, setDueFilter] = useState<'all' | 'overdue' | '7' | '30' | '90'>('all');
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 8;

    const sevCounts = useMemo(() => {
        const c = { all: rows.length, urgent: 0, action: 0, optional: 0 };
        for (const r of rows) c[r.severity]++;
        return c;
    }, [rows]);

    const filtered = useMemo(() => rows.filter(r => {
        if (sevFilter !== 'all' && r.severity !== sevFilter) return false;
        if (dueFilter === 'overdue') return r.status.tone === 'red';
        if (dueFilter !== 'all') {
            const d = r.status.daysLeft;
            const n = +dueFilter;
            return d !== null && d >= 0 && d <= n;
        }
        return true;
    }), [rows, sevFilter, dueFilter]);

    useEffect(() => { setPage(0); }, [sevFilter, dueFilter, rows.length]);
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, pageCount - 1);
    const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

    const toggleSel = (key: string) => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
    const allSel = filtered.length > 0 && filtered.every(r => selected.has(r.key));
    const toggleAll = () => setSelected(prev => {
        const n = new Set(prev);
        if (allSel) filtered.forEach(r => n.delete(r.key)); else filtered.forEach(r => n.add(r.key));
        return n;
    });

    const firstSelected = rows.find(r => selected.has(r.key)) ?? null;

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-blue-600" />
                    <h3 className="text-base font-bold text-slate-800">Action Inbox</h3>
                    <span className="text-[11px] text-slate-400">— request, order &amp; resolve compliance items</span>
                </div>
                {selected.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-slate-600">{selected.size} selected</span>
                        <button type="button" onClick={() => setBulkOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700"><Send size={13} /> Request ({selected.size})</button>
                        <button type="button" onClick={() => { selected.forEach(k => onSetStatus(k, 'approved')); setSelected(new Set()); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"><CheckCircle2 size={13} /> Resolve</button>
                    </div>
                )}
            </div>

            {/* Filters: due/severity + due-window */}
            {rows.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/40 px-5 py-2.5">
                    {([
                        { id: 'all', label: 'All', count: sevCounts.all },
                        { id: 'urgent', label: 'Urgent', count: sevCounts.urgent },
                        { id: 'action', label: 'Action', count: sevCounts.action },
                        { id: 'optional', label: 'Optional', count: sevCounts.optional },
                    ] as const).map(f => {
                        const active = sevFilter === f.id;
                        return (
                            <button key={f.id} type="button" onClick={() => setSevFilter(f.id)}
                                className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors",
                                    active ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                                {f.label}
                                <span className={cn("inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums", active ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600")}>{f.count}</span>
                            </button>
                        );
                    })}
                    <span className="mx-1 h-5 w-px bg-slate-200" />
                    <select value={dueFilter} onChange={(e) => setDueFilter(e.target.value as typeof dueFilter)}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="all">Any due date</option>
                        <option value="overdue">Overdue / missing</option>
                        <option value="7">Due ≤ 7 days</option>
                        <option value="30">Due ≤ 30 days</option>
                        <option value="90">Due ≤ 90 days</option>
                    </select>
                    <span className="ml-auto text-[12px] text-slate-500">{filtered.length} item{filtered.length === 1 ? '' : 's'}</span>
                </div>
            )}

            {rows.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <CheckCircle2 size={22} className="mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">Inbox zero</p>
                    <p className="text-[12px] text-slate-500">Nothing missing, expiring or pending right now.</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-slate-500">No items match this filter.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-sm">
                        <thead className="bg-slate-50/60 border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                                <th className="px-4 py-3 w-8"><input type="checkbox" checked={allSel} onChange={toggleAll} className="h-3.5 w-3.5 rounded accent-blue-600" /></th>
                                <th className="px-3 py-3">Item / Entity</th>
                                <th className="px-3 py-3">Due</th>
                                <th className="px-3 py-3">Owner</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-3 py-3">Last contact</th>
                                <th className="px-3 py-3 text-right pr-5">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map(r => {
                                const status = r.task?.status;
                                return (
                                    <tr key={r.key} className={cn("border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40", selected.has(r.key) && "bg-blue-50/40")}>
                                        <td className="px-4 py-3 align-top"><input type="checkbox" checked={selected.has(r.key)} onChange={() => toggleSel(r.key)} className="h-3.5 w-3.5 rounded accent-blue-600" /></td>
                                        <td className="px-3 py-3 align-top">
                                            <div className="flex items-center gap-1.5">
                                                <SeverityDot severity={r.severity} />
                                                <span className="text-sm font-semibold text-slate-900">{r.item.name}</span>
                                                <ScopeChip scope={r.scope} />
                                            </div>
                                            <p className="mt-0.5 pl-4 text-[12px] text-slate-500">{r.entityName}</p>
                                        </td>
                                        <td className="px-3 py-3 align-top"><StatusBadge status={r.status} /></td>
                                        <td className="px-3 py-3 align-top text-[12px] text-slate-600">{r.task?.owner ?? r.assignee}</td>
                                        <td className="px-3 py-3 align-top">
                                            {status
                                                ? <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", TASK_BADGE[taskTone(status)])}>{TASK_STATUS_LABEL[status]}</span>
                                                : <span className="text-[11px] text-slate-400">Not requested</span>}
                                        </td>
                                        <td className="px-3 py-3 align-top text-[12px] text-slate-500">
                                            {r.task?.lastContactAt ? <span>{r.task.lastContactMethod} · {r.task.lastContactAt}</span> : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-3 py-3 align-top text-right pr-5">
                                            <div className="inline-flex items-center gap-1">
                                                <button type="button" onClick={() => setRequestRow(r)} className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"><Send size={12} /> Request</button>
                                                {status && status !== 'approved' && (
                                                    <button type="button" onClick={() => onSetStatus(r.key, 'approved')} title="Mark resolved" className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"><CheckCircle2 size={14} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {pageCount > 1 && (
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-2.5">
                            <span className="text-[12px] text-slate-500">
                                {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <button type="button" disabled={safePage === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"><ChevronLeft size={15} /></button>
                                <span className="px-2 text-[12px] font-semibold tabular-nums text-slate-700">{safePage + 1} / {pageCount}</span>
                                <button type="button" disabled={safePage >= pageCount - 1} onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"><ChevronRight size={15} /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <RequestDocumentModal
                isOpen={requestRow !== null}
                itemName={requestRow?.item.name ?? ''}
                entityName={requestRow?.entityName ?? ''}
                company={company}
                defaultRecipient={(requestRow?.assignee as Recipient) ?? 'Safety Manager'}
                onClose={() => setRequestRow(null)}
                onSend={(rec) => { if (requestRow) onSendRequest(requestRow.key, rec); }}
            />
            <RequestDocumentModal
                isOpen={bulkOpen}
                itemName={firstSelected?.item.name ?? ''}
                entityName={firstSelected?.entityName ?? ''}
                company={company}
                count={selected.size}
                defaultRecipient={(firstSelected?.assignee as Recipient) ?? 'Safety Manager'}
                onClose={() => setBulkOpen(false)}
                onSend={(rec) => { selected.forEach(k => onSendRequest(k, rec)); setSelected(new Set()); }}
            />
        </div>
    );
}

const TASK_BADGE: Record<string, string> = {
    red: 'border-red-200 bg-red-50 text-red-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blue: 'border-blue-200 bg-blue-50 text-blue-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-500',
};

// ── Calendar (year heatmap + timeline) ─────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, '0');
const isoOf = (y: number, m: number, d: number) => `${y}-${pad2(m + 1)}-${pad2(d)}`;
function parseISO(s: string): { y: number; m: number; d: number } | null {
    const mm = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return mm ? { y: +mm[1], m: +mm[2] - 1, d: +mm[3] } : null;
}
const TONE_RANK: Record<CalTone, number> = { red: 3, amber: 2, blue: 1, slate: 0 };
const worstTone = (a: CalTone, b: CalTone) => (TONE_RANK[b] > TONE_RANK[a] ? b : a);
const CAL_CELL: Record<CalTone, string> = {
    red: 'bg-red-500 text-white',
    amber: 'bg-amber-400 text-white',
    blue: 'bg-blue-400 text-white',
    slate: 'bg-slate-300 text-slate-700',
};
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function MonitoringCalendar({ events, onRequest }: { events: DueEvent[]; onRequest: (e: DueEvent) => void }) {
    const today = new Date();
    const todayKey = isoOf(today.getFullYear(), today.getMonth(), today.getDate());
    const [year, setYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const byDate = useMemo(() => {
        const m = new Map<string, DueEvent[]>();
        for (const e of events) {
            const p = parseISO(e.date);
            if (!p || p.y !== year) continue;
            const key = isoOf(p.y, p.m, p.d);
            const arr = m.get(key); if (arr) arr.push(e); else m.set(key, [e]);
        }
        return m;
    }, [events, year]);

    const dayTone = (key: string): CalTone | null => {
        const evs = byDate.get(key);
        if (!evs || evs.length === 0) return null;
        return evs.reduce<CalTone>((w, e) => worstTone(w, e.tone), 'slate');
    };

    const perMonth = useMemo(() => {
        const counts = Array.from({ length: 12 }, () => 0);
        for (const [key, evs] of byDate) { const p = parseISO(key)!; counts[p.m] += evs.length; }
        return counts;
    }, [byDate]);

    const upcoming = useMemo(() =>
        events.filter(e => parseISO(e.date)?.y === year).sort((a, b) => a.date.localeCompare(b.date)),
        [events, year]);

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-4">
                {/* Year nav + legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => setYear(y => y - 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronLeft size={16} /></button>
                        <span className="px-2 text-lg font-bold tabular-nums text-slate-900">{year}</span>
                        <button type="button" onClick={() => setYear(y => y + 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronRight size={16} /></button>
                        {year !== today.getFullYear() && (
                            <button type="button" onClick={() => setYear(today.getFullYear())} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Today</button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <Legend tone="red" label="Expired" />
                        <Legend tone="amber" label="≤30 days" />
                        <Legend tone="blue" label="≤90 days" />
                        <Legend tone="slate" label="Later" />
                    </div>
                </div>

                {/* Yearly month strip */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-12 gap-1.5">
                        {perMonth.map((c, m) => {
                            const max = Math.max(1, ...perMonth);
                            return (
                                <div key={m} className="flex flex-col items-center gap-1">
                                    <div className="flex h-16 w-full items-end justify-center rounded bg-slate-50">
                                        <div className="w-3 rounded-t bg-blue-500/80" style={{ height: `${(c / max) * 100}%` }} />
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-500">{MONTH_NAMES[m]}</span>
                                    <span className="text-[10px] font-bold tabular-nums text-slate-700">{c}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 12 mini-month heatmap calendars */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 12 }, (_, m) => (
                        <MiniMonth key={m} year={year} month={m} dayTone={dayTone} todayKey={todayKey}
                            selectedDate={selectedDate} onSelectDay={setSelectedDate} />
                    ))}
                </div>
            </div>

            {/* Right panel — selected day items (with actions) or upcoming */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden self-start">
                {selectedDate ? (
                    <>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays size={16} className="text-blue-600" />
                                <h3 className="text-base font-bold text-slate-800">{prettyDate(selectedDate)}</h3>
                            </div>
                            <button type="button" onClick={() => setSelectedDate(null)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
                        </div>
                        {(byDate.get(selectedDate) ?? []).length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-500">Nothing due on this day.</div>
                        ) : (
                            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                                {(byDate.get(selectedDate) ?? []).map((e, i) => <CalEventRow key={i} e={e} onRequest={onRequest} />)}
                            </ul>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                            <CalendarClock size={16} className="text-blue-600" />
                            <h3 className="text-base font-bold text-slate-800">Upcoming renewals</h3>
                            <span className="text-[11px] text-slate-400">— click a day for details</span>
                        </div>
                        {upcoming.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-500">No dated items in {year}.</div>
                        ) : (
                            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                                {upcoming.map((e, i) => <CalEventRow key={i} e={e} onRequest={onRequest} />)}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const prettyDate = (iso: string) => {
    const p = parseISO(iso); if (!p) return iso;
    return `${MONTH_NAMES[p.m]} ${p.d}, ${p.y}`;
};

/** Calendar event row with a Request action. */
function CalEventRow({ e, onRequest }: { e: DueEvent; onRequest: (e: DueEvent) => void }) {
    const p = parseISO(e.date)!;
    return (
        <li className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 leading-none">
                <span className="text-[9px] font-bold uppercase text-slate-400">{MONTH_NAMES[p.m]}</span>
                <span className="text-sm font-black tabular-nums text-slate-800">{p.d}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{e.name}</span>
                    <ScopeChip scope={e.scope} />
                </div>
                <p className="truncate text-[12px] text-slate-500">{e.entityName}</p>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap",
                e.tone === 'red' ? 'bg-red-50 text-red-700' : e.tone === 'amber' ? 'bg-amber-50 text-amber-700' : e.tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                {e.daysLeft === null ? '—' : e.daysLeft < 0 ? `${-e.daysLeft}d ago` : `${e.daysLeft}d`}
            </span>
            <button type="button" onClick={() => onRequest(e)} title="Request / order" className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"><Send size={12} /> Request</button>
        </li>
    );
}

function MiniMonth({ year, month, dayTone, todayKey, selectedDate, onSelectDay }: {
    year: number; month: number; dayTone: (key: string) => CalTone | null; todayKey: string;
    selectedDate: string | null; onSelectDay: (key: string) => void;
}) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-sm font-bold text-slate-800">{MONTH_NAMES[month]} {year}</div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className="text-[9px] font-bold text-slate-400">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={i} />;
                    const key = isoOf(year, month, day);
                    const tone = dayTone(key);
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDate;
                    const base = cn(
                        "flex h-6 w-full items-center justify-center rounded text-[11px] tabular-nums",
                        tone ? CAL_CELL[tone] + ' font-bold' : 'text-slate-600',
                        isToday && 'ring-2 ring-blue-600 ring-offset-1',
                        isSelected && 'outline outline-2 outline-blue-600',
                    );
                    return tone ? (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onSelectDay(key)}
                            title={`${day} ${MONTH_NAMES[month]} — view items due`}
                            className={cn(base, "cursor-pointer transition-transform hover:scale-110")}
                        >
                            {day}
                        </button>
                    ) : (
                        <span key={i} className={base}>{day}</span>
                    );
                })}
            </div>
        </div>
    );
}

function Legend({ tone, label }: { tone: CalTone; label: string }) {
    return <span className="inline-flex items-center gap-1"><span className={cn("h-3 w-3 rounded", CAL_CELL[tone])} /> {label}</span>;
}

// ── Configure modal ─────────────────────────────────────────────────────

function ConfigureModal({ item, value, onSave, onClose }: {
    item: MonitorItem; value: MonitoringConfig; onSave: (cfg: MonitoringConfig) => void; onClose: () => void;
}) {
    const [draft, setDraft] = useState<MonitoringConfig>(value);
    useEffect(() => { setDraft(value); }, [value]);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[90vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/30 px-6 py-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">Monitoring Settings</h3>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                            <FileText size={13} className={item.kind === 'doc' ? 'text-violet-500' : 'text-blue-500'} />
                            {item.name} <span className="text-slate-300">·</span> {item.scope}
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
}

// ── Small bits ──────────────────────────────────────────────────────────

const ACCENT: Record<string, { border: string; bg: string; color: string }> = {
    blue: { border: 'border-l-blue-500', bg: 'bg-blue-50', color: 'text-blue-600' },
    red: { border: 'border-l-red-500', bg: 'bg-red-50', color: 'text-red-600' },
    amber: { border: 'border-l-amber-500', bg: 'bg-amber-50', color: 'text-amber-600' },
    slate: { border: 'border-l-slate-400', bg: 'bg-slate-100', color: 'text-slate-600' },
    emerald: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', color: 'text-emerald-600' },
};

function Kpi({ label, value, Icon, accent }: { label: string; value: number; Icon: React.ComponentType<{ size?: number; className?: string }>; accent: keyof typeof ACCENT }) {
    const a = ACCENT[accent];
    return (
        <div className={cn("bg-white border border-slate-200 border-l-4 rounded-xl p-3 shadow-sm flex items-center justify-between gap-3", a.border)}>
            <div>
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", a.bg)}><Icon size={14} className={a.color} /></div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{label}</div>
            </div>
            <div className="text-2xl font-black tabular-nums text-slate-900 leading-none">{value}</div>
        </div>
    );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
            <div className="flex items-center gap-2 mb-3">{icon}<h3 className="text-base font-bold text-slate-800">{title}</h3></div>
            {children}
        </div>
    );
}

function EmptyChart({ label }: { label: string }) {
    return (
        <div className="flex h-[190px] flex-col items-center justify-center text-center">
            <CheckCircle2 size={22} className="mb-2 text-emerald-500" />
            <p className="text-sm font-semibold text-slate-700">{label}</p>
        </div>
    );
}

function SeverityDot({ severity }: { severity: Severity }) {
    return <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", severity === 'urgent' ? 'bg-red-500' : severity === 'action' ? 'bg-amber-500' : 'bg-slate-400')} />;
}

function StatusBadge({ status }: { status: RowStatus }) {
    const cls = status.tone === 'red' ? 'border-red-200 bg-red-50 text-red-700'
        : status.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700'
        : status.tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-100 text-slate-500';
    return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", cls)}>{status.label}</span>;
}

function ScopeChip({ scope }: { scope: Scope }) {
    const Icon = scope === 'Carrier' ? Building2 : scope === 'Driver' ? User : Truck;
    return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600"><Icon size={10} /> {scope}</span>;
}

function DateChip({ label }: { label: string }) {
    return <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600"><Clock size={10} className="text-slate-400" /> {label}</span>;
}
