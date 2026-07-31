import { useEffect, useMemo, useState } from 'react';
import {
    Building2, Truck, User, Layers, Search, Hash, FileText, MapPin, CalendarClock,
    UploadCloud, Eye, Trash2, X, Check, CircleAlert, CircleDashed, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown,
    ChevronLeft, Plus, Bell, Columns, Tag, Filter, Pencil, Info, Sparkles, ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KeyNumberGroup } from '@/pages/admin/ComplianceAndDocumentsPage';
import {
    SAFETY_RECORDS, SAFETY_CATEGORY_ORDER, ENTITY_ORDER, isDateMonitored, RECORD_TYPE_LABEL, RECORD_TYPE_ORDER,
    type SafetyRecord, type EntityId, type RecordTypeId,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    useComplianceData, computeStats, entryStatus, currentVersion, newVersion, newInstance, instancesOf, emptyEntry,
    defaultMonitoring, CARRIER_SUBJECT,
    type RecordDataEntry, type DocVersion, type DocInstance, type DataDocFile, type DataStatus, type MonitoringConfig, type MonitorBasis,
} from '@/pages/compliance/compliance-data-store';
import { useSafetyTags, tagColor, smartTagMatch, MAX_DOC_TAGS } from '@/pages/compliance/safety-tags.data';
import { COUNTRIES, ALL_COUNTRIES, STATES_BY_COUNTRY } from '@/pages/compliance/jurisdiction.data';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import type { Asset } from '@/pages/assets/assets.data';
import type { Driver } from '@/pages/profile/carrier-profile.data';

/**
 * Default Compliances & Documents — the per-carrier DATA page.
 *
 * Carrier tab → the carrier's own compliance/document records.
 * Asset tab   → a list of the carrier's assets; pick one → its Asset records.
 * Driver tab  → a list of the carrier's drivers; pick one → its Driver records.
 * Each record captures real number/dates + uploaded document(s) with dated VERSIONS
 * (multi-upload), scoped per carrier + subject via compliance-data-store.
 */

const ENTITY_ICON: Record<EntityId, typeof Building2> = { Carrier: Building2, Asset: Truck, Driver: User };

function fmtSize(bytes: number): string {
    if (!bytes) return '0 B';
    const u = ['B', 'KB', 'MB', 'GB'];
    const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}
function readAsDataUrl(file: File): Promise<string | undefined> {
    return new Promise(res => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result));
        fr.onerror = () => res(undefined);
        fr.readAsDataURL(file);
    });
}
/** Deterministic sample number for the "Fill demo data" button (mirrors the settings catalog). */
function sampleNumber(r: SafetyRecord): string {
    let h = 0;
    for (const c of r.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const digits = String((h % 900000) + 100000);
    const prefix = (r.numberName.match(/[A-Za-z]/g)?.slice(0, 3).join('') || 'NUM').toUpperCase();
    return `${prefix}-${digits}`;
}
function searchBlob(r: SafetyRecord): string {
    return [r.recordName, r.description, r.numberName, r.documentName, r.category, r.jurisdiction].join(' ').toLowerCase();
}
function isVersionEmpty(v: DocVersion): boolean {
    return v.files.length === 0 && !v.numberValue.trim() && !v.issueDate && !v.expiryDate && !(v.status ?? '').trim() && !v.notes.trim()
        && v.tags.length === 0 && !v.monitoring.enabled;
}

// ── Status pill ───────────────────────────────────────────────────────
const STATUS_META: Record<DataStatus, { label: string; tone: string; Icon: typeof Check }> = {
    complete: { label: 'Complete', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: Check },
    missing: { label: 'Missing', tone: 'border-rose-200 bg-rose-50 text-rose-700', Icon: CircleAlert },
    optional: { label: 'Optional', tone: 'border-slate-200 bg-slate-50 text-slate-500', Icon: CircleDashed },
};
function StatusPill({ status }: { status: DataStatus }) {
    const m = STATUS_META[status];
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', m.tone)}>
            <m.Icon size={11} /> {m.label}
        </span>
    );
}

// ── Column helpers (mirror the settings-catalog table) ────────────────
const CATEGORY_SHORT: Record<string, string> = {
    'Regulatory and Safety Numbers': 'Regulatory & Safety',
    'Tax and Business Identification Numbers': 'Tax & Business ID',
    'Carrier & Industry Codes': 'Carrier & Industry',
    'Bond and Registration Numbers': 'Bond & Registration',
    'Other': 'Other',
};
const RECORD_TYPE_TONE: Record<string, string> = {
    C: 'border-blue-200 bg-blue-50 text-blue-700',
    D: 'border-violet-200 bg-violet-50 text-violet-700',
    DC: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};
function isImageFile(f: DataDocFile): boolean {
    return !!f.url?.startsWith('data:image') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name);
}
function openFile(f: DataDocFile) {
    if (!f.url) return;
    // Browsers block top-level navigation to data: URLs — convert those to a blob URL so the PDF actually opens.
    // Real file URLs (e.g. /demo-docs/cvor-certificate.pdf) open directly.
    if (f.url.startsWith('data:')) {
        try {
            const comma = f.url.indexOf(',');
            const mime = /data:([^;]+)/.exec(f.url.slice(0, comma))?.[1] || 'application/pdf';
            const bin = atob(f.url.slice(comma + 1));
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            window.open(blobUrl, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        } catch { /* fall through to a direct open */ }
    }
    window.open(f.url, '_blank', 'noopener');
}
/** Small preview of a document — the actual image when it's an image, else a file icon. */
function DocThumb({ f, size = 40 }: { f: DataDocFile; size?: number }) {
    if (isImageFile(f) && f.url) {
        return <img src={f.url} alt={f.name} className="rounded-md border border-slate-200 object-cover shrink-0" style={{ height: size, width: size }} />;
    }
    return (
        <div className="rounded-md border border-slate-200 bg-slate-100 text-slate-400 flex items-center justify-center shrink-0" style={{ height: size, width: size }}>
            <FileText size={Math.round(size * 0.45)} />
        </div>
    );
}

// ── Table columns / sort / pagination ─────────────────────────────────
type DataColId = 'category' | 'type' | 'monitoring' | 'status';
type SortCol = 'record' | DataColId;
const DATA_COLUMNS: { id: DataColId; label: string }[] = [
    { id: 'category', label: 'Category' },
    { id: 'type', label: 'Record Type' },
    { id: 'monitoring', label: 'Monitoring' },
    { id: 'status', label: 'Status' },
];
const ALL_DATA_COLS: DataColId[] = DATA_COLUMNS.map(c => c.id);
const STATUS_RANK: Record<DataStatus, number> = { complete: 0, missing: 1, optional: 2 };
const PAGE_SIZES = [10, 25, 50, 100];
const REMINDER_DAYS = [90, 60, 30, 7, 0]; // 0 = "On the date"
const reminderLabel = (d: number) => (d === 0 ? 'On the date' : `${d} Days Before`);
// Status values for status-based records (the monitored value captured in the form).
const STATUS_OPTIONS = ['Active', 'Pending', 'On File', 'Complete', 'Incomplete', 'Expired', 'Inactive'];

// Renewal cadence options (mirror the settings-catalog MonitoringSettings).
const RECURRENCE_OPTIONS: { id: string; label: string }[] = [
    { id: 'none', label: 'Does not recur' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'quarterly', label: 'Quarterly (Every 3 Months)' },
    { id: 'semiannually', label: 'Semi-Annually (Every 6 Months)' },
    { id: 'annually', label: 'Annually (Every 1 Year)' },
    { id: 'biennially', label: 'Every 2 Years' },
    { id: 'triennially', label: 'Every 3 Years' },
    { id: 'fiveyearly', label: 'Every 5 Years' },
];
/** Map the record's free-text `recurring` note onto a recurrence option. */
function recurrenceFromRecord(r: SafetyRecord): string {
    const s = (r.recurring || '').toLowerCase();
    if (/no (fixed|normal|scheduled|independent)|does not expire|usually static|static/.test(s)) return 'none';
    if (s.includes('month')) return 'monthly';
    if (s.includes('quarter')) return 'quarterly';
    if (s.includes('semi')) return 'semiannually';
    if (s.includes('bienn') || s.includes('every 2') || s.includes('2 year')) return 'biennially';
    if (s.includes('annual') || s.includes('yearly') || s.includes('year')) return 'annually';
    return 'annually';
}
/** Build a monitoring config seeded from the record (recurrence), merging any stored value on top. */
function seedMonitoring(record: SafetyRecord, existing?: MonitoringConfig): MonitoringConfig {
    const base = defaultMonitoring();
    base.recurrence = recurrenceFromRecord(record);
    // Status-only records default to status-based monitoring (no date reminders).
    base.basis = isDateMonitored(record) ? 'expiry' : 'status';
    if (base.basis === 'status') base.reminders = [];
    return existing ? { ...base, ...existing } : base;
}

// ── Sample data ("Load sample data" button — populate the list to preview every row state) ──
const SAMPLE_EXPIRIES = ['2026-02-28', '2026-05-31', '2026-08-15', '2026-11-30', '2027-01-31', '2027-04-30', '2025-12-31', '2026-09-30'];
const SAMPLE_ISSUES = ['2023-08-10', '2024-01-15', '2024-04-01', '2024-07-22', '2023-11-05', '2024-10-18'];
const SAMPLE_STATUSES = ['Active', 'On File', 'Pending', 'Complete'];
function recordHash(record: SafetyRecord): number {
    let h = 0;
    for (const c of record.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
}
function sampleExpiry(record: SafetyRecord): string {
    return record.configuredDate ?? SAMPLE_EXPIRIES[recordHash(record) % SAMPLE_EXPIRIES.length];
}
function sampleStatus(record: SafetyRecord): string {
    return SAMPLE_STATUSES[recordHash(record) % SAMPLE_STATUSES.length];
}
// Static demo PDFs (public/demo-docs/*.pdf). Real file URLs open reliably in the browser's PDF viewer —
// unlike inline data: URLs, which browsers block from top-level navigation. Regenerate: `node scripts/generate-demo-docs.mjs`.
const DEMO_PDF_SIZE: Record<string, number> = {
    'cvor-certificate.pdf': 4780, 'insurance-certificate.pdf': 4793, 'compliance-document.pdf': 4783, 'driver-license.pdf': 4676,
};
/** Pick the demo PDF that best represents a record (license card / CVOR / insurance / generic certificate). */
function demoPdfFile(record: SafetyRecord): { file: string; size: number } {
    const file = (record.isLicense || record.id === 'cdl') ? 'driver-license.pdf'
        : (record.multiInstance || /insurance|pink-slip/i.test(record.id)) ? 'insurance-certificate.pdf'
            : (/cvor/i.test(record.id) || /cvor/i.test(record.documentName || '')) ? 'cvor-certificate.pdf'
                : 'compliance-document.pdf';
    return { file, size: DEMO_PDF_SIZE[file] ?? 4800 };
}
function sampleDocFiles(record: SafetyRecord): DataDocFile[] {
    const slug = (record.documentName || 'document').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document';
    const now = new Date().toISOString();
    const { file, size } = demoPdfFile(record);
    const url = `/demo-docs/${file}`;
    const slots = record.slotLabels ?? [];
    if (slots.length > 0) return slots.map(slot =>
        ({ name: `${slug}-${slot.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`, size, url, slot, uploadedAt: now }));
    return [{ name: `${slug}.pdf`, size, url, uploadedAt: now }];
}
/** Give an existing file that has no viewable url (legacy placeholder) a real demo PDF, preserving its slot. */
function withDemoPdf(record: SafetyRecord, f: DataDocFile): DataDocFile {
    const { file, size } = demoPdfFile(record);
    return { ...f, url: `/demo-docs/${file}`, size, name: f.name.replace(/\.[a-z0-9]+$/i, '.pdf') };
}
function sampleVersion(record: SafetyRecord, label: string, over: Partial<DocVersion> = {}): DocVersion {
    const hasDoc = record.type !== 'C' && record.docRequirement !== 'none';
    const country = record.allCountries ? 'United States' : 'Canada';
    const stateProv = record.hideState ? '' : (STATES_BY_COUNTRY[country]?.[0] ?? '');
    const v: DocVersion = {
        ...newVersion(label),
        numberValue: record.numberName ? sampleNumber(record) : '',
        country, stateProv,
        issueDate: record.tracksIssueDate ? SAMPLE_ISSUES[recordHash(record) % SAMPLE_ISSUES.length] : '',
        expiryDate: isDateMonitored(record) ? sampleExpiry(record) : '',
        status: !isDateMonitored(record) ? sampleStatus(record) : '',
        files: [],
        monitoring: { ...seedMonitoring(record), enabled: true },
        ...over,
    };
    if (hasDoc && v.files.length === 0) v.files = sampleDocFiles(record);
    return v;
}
/** Deterministic sample entry for a record at list position `i` — spread across every row state. */
function buildSampleEntry(record: SafetyRecord, i: number): RecordDataEntry | null {
    // Multi-instance records (e.g. Insurance) → two concurrent active policies, each with its own current.
    if (record.multiInstance) {
        return {
            versions: [],
            instances: [
                { ...newInstance('Liability — State Farm'), versions: [sampleVersion(record, 'Version 2026', { numberValue: 'POL-100', expiryDate: '2026-12-31', tags: ['Verified', 'Primary'] })] },
                { ...newInstance('Cargo — Progressive'), versions: [sampleVersion(record, 'Version 2026', { numberValue: 'POL-200', expiryDate: '2027-03-15', tags: ['Renewed'] })] },
            ],
        };
    }
    const mode = i % 6;
    if (mode === 5) return null;                                                                        // leave empty → Missing / Optional
    if (mode === 4) return { versions: [sampleVersion(record, 'Version 2026', { monitoring: { ...seedMonitoring(record), enabled: false } })] }; // filled, monitoring off, no tags
    const tags = mode === 0 ? ['Verified', 'Primary'] : mode === 1 ? ['Renewed'] : mode === 2 ? ['Pending Review'] : [];
    const current = sampleVersion(record, 'Version 2026', { tags });
    // Every 3rd record keeps an older version too → an expandable multi-version row.
    if (mode === 3) {
        return {
            versions: [
                current,
                sampleVersion(record, 'Version 2025', {
                    expiryDate: isDateMonitored(record) ? '2025-12-31' : '',
                    issueDate: record.tracksIssueDate ? '2023-01-10' : '',
                    monitoring: { ...seedMonitoring(record), enabled: false },
                }),
            ],
        };
    }
    return { versions: [current] };
}

function sortValueFor(col: SortCol, r: SafetyRecord, entry: RecordDataEntry): string {
    const cur = currentVersion(entry);
    switch (col) {
        case 'record': return r.recordName.toLowerCase();
        case 'category': return r.category;
        case 'type': return RECORD_TYPE_LABEL[r.type];
        case 'monitoring': return (cur?.expiryDate || '') + (cur?.numberValue || '');
        case 'status': return String(STATUS_RANK[entryStatus(r, entry)]);
        default: return '';
    }
}
function versionTags(entry: RecordDataEntry): string[] {
    return currentVersion(entry)?.tags ?? [];
}
function fmtDateTime(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function monitoredDateFor(cfg: MonitoringConfig, v: { issueDate: string; expiryDate: string }): string {
    if (cfg.basis === 'status') return '';
    return cfg.basis === 'issue' ? v.issueDate : cfg.basis === 'custom' ? cfg.customDate : v.expiryDate;
}

type EntryGetter = (subjectId: string, recordId: string) => RecordDataEntry;
type EntrySetter = (subjectId: string, recordId: string, entry: RecordDataEntry) => void;

// ── Page ──────────────────────────────────────────────────────────────
export function DefaultComplianceDataPage({ accountId }: { accountId?: string }) {
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : 'the selected carrier';

    const { acct, all, getEntry, setEntry } = useComplianceData(accountId);
    const [recordType, setRecordType] = useState<RecordTypeId>('DC');
    const [entity, setEntity] = useState<EntityId>('Carrier');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null); // asset/driver id
    const [focusRecordId, setFocusRecordId] = useState<string | null>(null);     // deep-link from the Monitoring page

    // Deep-link: the Monitoring page writes a `dcd-focus` hint before navigating here → jump to that
    // record's entity/type/subject and auto-open its Manage modal.
    useEffect(() => {
        try {
            const raw = localStorage.getItem('dcd-focus');
            if (!raw) return;
            localStorage.removeItem('dcd-focus');
            const f = JSON.parse(raw) as { acct?: string; entity?: EntityId; subjectId?: string; recordId?: string };
            if (!f || f.acct !== acct || !f.recordId) return;
            const rec = SAFETY_RECORDS.find(r => r.id === f.recordId);
            if (rec) setRecordType(rec.type);
            if (f.entity) setEntity(f.entity);
            setSelectedSubject(f.entity && f.entity !== 'Carrier' ? (f.subjectId ?? null) : null);
            setFocusRecordId(f.recordId);
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acct]);

    // The top-right record-type switch scopes the whole page to Compliances & Documents / Compliances / Documents.
    const records = useMemo(() => SAFETY_RECORDS.filter(r => r.type === recordType), [recordType]);
    const assets = useMemo(() => getAssetsForAccount(acct), [acct]);
    const drivers = useMemo(() => getDriversForAccount(acct), [acct]);

    const entityCounts = useMemo(() => {
        const m: Record<EntityId, number> = { Carrier: 0, Asset: 0, Driver: 0 };
        for (const r of records) m[r.entity]++;
        return m;
    }, [records]);

    const switchEntity = (e: EntityId) => { setEntity(e); setSelectedSubject(null); };

    // When seeding the carrier, also seed the first asset + driver so the Monitoring page's Asset/Driver tabs have data.
    const sampleSubjects = useMemo(() => {
        const extras: { subjectId: string; entity: EntityId }[] = [];
        if (assets[0]) extras.push({ subjectId: assets[0].id, entity: 'Asset' });
        if (drivers[0]) extras.push({ subjectId: drivers[0].id, entity: 'Driver' });
        return extras;
    }, [assets, drivers]);

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Layers size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-slate-900">Default Compliances &amp; Documents</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Compliance &amp; document records for <span className="font-semibold text-slate-700">{carrierName}</span> — captured per carrier, asset and driver.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-auto">
                        <RecordTypeSwitch value={recordType} onChange={setRecordType} />
                        {account && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                                <Building2 size={15} /> {carrierName}
                            </span>
                        )}
                    </div>
                </div>

                {/* Entity tabs */}
                <div className="flex items-center gap-1 mt-4 -mb-5">
                    {ENTITY_ORDER.map(e => {
                        const active = entity === e;
                        const Icon = ENTITY_ICON[e];
                        const badge = e === 'Asset' ? assets.length : e === 'Driver' ? drivers.length : entityCounts.Carrier;
                        return (
                            <button
                                key={e}
                                type="button"
                                onClick={() => switchEntity(e)}
                                className={cn(
                                    'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                    active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                                )}
                            >
                                <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                {e}
                                <span className={cn(
                                    'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                                    active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600',
                                )}>
                                    {badge}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6 space-y-5">
                {entity === 'Carrier' && (
                    <SubjectDocuments
                        entity="Carrier"
                        subjectId={CARRIER_SUBJECT}
                        subjectLabel={carrierName}
                        carrierName={carrierName}
                        records={records}
                        getEntry={getEntry}
                        setEntry={setEntry}
                        all={all}
                        autoOpenRecordId={focusRecordId}
                        onFocusConsumed={() => setFocusRecordId(null)}
                        alsoSeedSubjects={sampleSubjects}
                    />
                )}

                {entity === 'Asset' && (
                    selectedSubject
                        ? (() => {
                            const asset = assets.find(a => a.id === selectedSubject);
                            return (
                                <SubjectDocuments
                                    entity="Asset"
                                    subjectId={selectedSubject}
                                    subjectLabel={asset ? `${asset.unitNumber} · ${asset.make} ${asset.model}` : 'Asset'}
                                    carrierName={carrierName}
                                    records={records}
                                    getEntry={getEntry}
                                    setEntry={setEntry}
                                    all={all}
                                    autoOpenRecordId={focusRecordId}
                                    onFocusConsumed={() => setFocusRecordId(null)}
                                    onBack={() => setSelectedSubject(null)}
                                    backLabel="All assets"
                                />
                            );
                        })()
                        : <AssetList assets={assets} records={records} getEntry={getEntry} onOpen={setSelectedSubject} />
                )}

                {entity === 'Driver' && (
                    selectedSubject
                        ? (() => {
                            const driver = drivers.find(d => d.id === selectedSubject);
                            return (
                                <SubjectDocuments
                                    entity="Driver"
                                    subjectId={selectedSubject}
                                    subjectLabel={driver ? driver.name : 'Driver'}
                                    carrierName={carrierName}
                                    records={records}
                                    getEntry={getEntry}
                                    setEntry={setEntry}
                                    all={all}
                                    autoOpenRecordId={focusRecordId}
                                    onFocusConsumed={() => setFocusRecordId(null)}
                                    onBack={() => setSelectedSubject(null)}
                                    backLabel="All drivers"
                                />
                            );
                        })()
                        : <DriverList drivers={drivers} records={records} getEntry={getEntry} onOpen={setSelectedSubject} />
                )}
            </div>
        </div>
    );
}

// ── Record-type switch (top-right) — Compliances & Documents / Compliances / Documents ──
const RECORD_TYPE_ICON: Record<RecordTypeId, typeof Layers> = { DC: Layers, C: ShieldCheck, D: FileText };
function RecordTypeSwitch({ value, onChange }: { value: RecordTypeId; onChange: (t: RecordTypeId) => void }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            {RECORD_TYPE_ORDER.map(t => {
                const active = value === t;
                const Icon = RECORD_TYPE_ICON[t];
                return (
                    <button
                        key={t}
                        type="button"
                        onClick={() => onChange(t)}
                        className={cn(
                            'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                            active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                        )}
                    >
                        <Icon size={13} className={active ? 'text-white' : 'text-slate-400'} /> {RECORD_TYPE_LABEL[t]}
                    </button>
                );
            })}
        </div>
    );
}

// ── Master lists (Asset / Driver) ─────────────────────────────────────
function CompletionBar({ pct }: { pct: number }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
        </div>
    );
}

function AssetList({ assets, records, getEntry, onOpen }: {
    assets: Asset[]; records: SafetyRecord[]; getEntry: EntryGetter; onOpen: (id: string) => void;
}) {
    const [q, setQ] = useState('');
    const assetRecords = useMemo(() => records.filter(r => r.entity === 'Asset'), [records]);
    const filtered = q.trim()
        ? assets.filter(a => `${a.unitNumber} ${a.make} ${a.model} ${a.vin} ${a.assetType}`.toLowerCase().includes(q.trim().toLowerCase()))
        : assets;
    return (
        <ListShell title="Assets" count={assets.length} q={q} setQ={setQ} placeholder="Search unit, VIN, make…" Icon={Truck}>
            {filtered.map(a => {
                const stats = computeStats(assetRecords, r => getEntry(a.id, r.id));
                return (
                    <li key={a.id}>
                        <button type="button" onClick={() => onOpen(a.id)} className="w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/60 text-left">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                <Truck size={18} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-900">{a.unitNumber}</span>
                                    <span className="text-[12px] text-slate-500">{a.year} {a.make} {a.model}</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{a.assetType}</span>
                                </div>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <div className="w-40 max-w-[45vw]"><CompletionBar pct={stats.pct} /></div>
                                    <span className="text-[11px] text-slate-500 tabular-nums">{stats.complete}/{stats.complete + stats.requiredMissing} required</span>
                                    {stats.requiredMissing > 0 && <span className="text-[11px] font-semibold text-rose-500">{stats.requiredMissing} missing</span>}
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 shrink-0" />
                        </button>
                    </li>
                );
            })}
        </ListShell>
    );
}

function DriverList({ drivers, records, getEntry, onOpen }: {
    drivers: Driver[]; records: SafetyRecord[]; getEntry: EntryGetter; onOpen: (id: string) => void;
}) {
    const [q, setQ] = useState('');
    const driverRecords = useMemo(() => records.filter(r => r.entity === 'Driver'), [records]);
    const filtered = q.trim()
        ? drivers.filter(d => `${d.name} ${d.driverType ?? ''} ${d.licenseState ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
        : drivers;
    return (
        <ListShell title="Drivers" count={drivers.length} q={q} setQ={setQ} placeholder="Search driver, type…" Icon={User}>
            {filtered.map(d => {
                const stats = computeStats(driverRecords, r => getEntry(d.id, r.id));
                return (
                    <li key={d.id}>
                        <button type="button" onClick={() => onOpen(d.id)} className="w-full flex items-center gap-4 px-4 sm:px-5 py-3.5 hover:bg-slate-50/60 text-left">
                            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 text-[13px] font-bold flex items-center justify-center shrink-0">
                                {d.avatarInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                                    {d.driverType && <span className="text-[12px] text-slate-500">{d.driverType}</span>}
                                    {d.licenseState && <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{d.licenseState}</span>}
                                </div>
                                <div className="mt-1.5 flex items-center gap-3">
                                    <div className="w-40 max-w-[45vw]"><CompletionBar pct={stats.pct} /></div>
                                    <span className="text-[11px] text-slate-500 tabular-nums">{stats.complete}/{stats.complete + stats.requiredMissing} required</span>
                                    {stats.requiredMissing > 0 && <span className="text-[11px] font-semibold text-rose-500">{stats.requiredMissing} missing</span>}
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 shrink-0" />
                        </button>
                    </li>
                );
            })}
        </ListShell>
    );
}

function ListShell({ title, count, q, setQ, placeholder, Icon, children }: {
    title: string; count: number; q: string; setQ: (v: string) => void; placeholder: string; Icon: typeof Truck; children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 flex-wrap">
                <h3 className="inline-flex items-center gap-2 text-base font-bold text-slate-800">
                    <Icon size={17} className="text-slate-400" /> {title} <span className="text-slate-400 font-semibold">({count})</span>
                </h3>
                <div className="relative w-full sm:w-72">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
            </div>
            <ul className="divide-y divide-slate-100">{children}</ul>
        </div>
    );
}

// ── Subject documents (Carrier / one Asset / one Driver) ──────────────
function SubjectDocuments({ entity, subjectId, subjectLabel, carrierName, records, getEntry, setEntry, all, onBack, backLabel, autoOpenRecordId, onFocusConsumed, alsoSeedSubjects }: {
    entity: EntityId;
    subjectId: string;
    subjectLabel: string;
    carrierName: string;
    records: SafetyRecord[];
    getEntry: EntryGetter;
    setEntry: EntrySetter;
    all: unknown;
    onBack?: () => void;
    backLabel?: string;
    autoOpenRecordId?: string | null;   // deep-link: open this record's Manage modal on mount
    onFocusConsumed?: () => void;
    // Extra subjects to seed alongside this one (Carrier → also a sample asset + driver) so the
    // monitoring page's Driver / Asset tabs have representative data. `records` already holds every entity's records.
    alsoSeedSubjects?: { subjectId: string; entity: EntityId }[];
}) {
    const { tags: tagCatalog } = useSafetyTags();
    const [category, setCategory] = useState<KeyNumberGroup | 'All'>('All');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | DataStatus>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' } | null>(null);
    const [visibleCols, setVisibleCols] = useState<Set<DataColId>>(() => new Set(ALL_DATA_COLS));
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [manage, setManage] = useState<SafetyRecord | null>(null);

    const toggleExpand = (id: string) => setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleCol = (id: DataColId) => setVisibleCols(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSort = (col: SortCol) => setSort(prev => (prev && prev.col === col ? (prev.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));

    const entityRecords = useMemo(() => records.filter(r => r.entity === entity), [records, entity]);
    const entryFor = (r: SafetyRecord) => getEntry(subjectId, r.id);

    // Deep-link from the Monitoring page → auto-open the requested record's Manage modal once.
    useEffect(() => {
        if (!autoOpenRecordId) return;
        const rec = entityRecords.find(r => r.id === autoOpenRecordId);
        if (rec) setManage(rec);
        onFocusConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpenRecordId]);

    // "Load sample data" — seed this subject's records with representative values so the list preview shows every row state.
    // Each doc-bearing record gets a real demo PDF (public/demo-docs/*.pdf) so the View button opens an actual document.
    const loadSampleData = () => {
        entityRecords.forEach((r, i) => setEntry(subjectId, r.id, buildSampleEntry(r, i) ?? emptyEntry()));
        for (const ex of alsoSeedSubjects ?? [])
            records.filter(r => r.entity === ex.entity).forEach((r, i) => setEntry(ex.subjectId, r.id, buildSampleEntry(r, i) ?? emptyEntry()));
    };
    const clearData = () => {
        entityRecords.forEach(r => setEntry(subjectId, r.id, emptyEntry()));
        for (const ex of alsoSeedSubjects ?? [])
            records.filter(r => r.entity === ex.entity).forEach(r => setEntry(ex.subjectId, r.id, emptyEntry()));
    };
    const hasData = entityRecords.some(r => {
        const e = getEntry(subjectId, r.id);
        return e.versions.length > 0 || (e.instances?.length ?? 0) > 0;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stats = useMemo(() => computeStats(entityRecords, entryFor), [entityRecords, subjectId, all]);

    const categoryTabs = useMemo(() => {
        const present = SAFETY_CATEGORY_ORDER.filter(c => entityRecords.some(r => r.category === c));
        return [
            { id: 'All' as KeyNumberGroup | 'All', label: 'All', count: entityRecords.length },
            ...present.map(c => ({ id: c as KeyNumberGroup | 'All', label: c, count: entityRecords.filter(r => r.category === c).length })),
        ];
    }, [entityRecords]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entityRecords.filter(r => {
            if (category !== 'All' && r.category !== category) return false;
            const entry = getEntry(subjectId, r.id);
            if (statusFilter !== 'all' && entryStatus(r, entry) !== statusFilter) return false;
            const tags = versionTags(entry);
            if (tagFilter !== 'all' && !tags.some(t => t.toLowerCase() === tagFilter.toLowerCase())) return false;
            if (q) {
                const cur = currentVersion(entry);
                const hay = `${searchBlob(r)} ${cur?.numberValue || ''} ${tags.join(' ')}`.toLowerCase();
                if (!(hay.includes(q) || tags.some(t => smartTagMatch(q, t)))) return false;
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityRecords, category, statusFilter, tagFilter, search, subjectId, all]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const arr = [...filtered].sort((a, b) =>
            sortValueFor(sort.col, a, getEntry(subjectId, a.id))
                .localeCompare(sortValueFor(sort.col, b, getEntry(subjectId, b.id)), undefined, { numeric: true, sensitivity: 'base' }));
        if (sort.dir === 'desc') arr.reverse();
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, sort, subjectId, all]);

    useEffect(() => { setPage(1); }, [category, statusFilter, tagFilter, search, pageSize, sort, subjectId]);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);
    const cols = DATA_COLUMNS.filter(c => visibleCols.has(c.id));
    const selectCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    return (
        <div className="space-y-5">
            {/* Breadcrumb / subject header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    {onBack && (
                        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50">
                            <ChevronLeft size={15} /> {backLabel ?? 'Back'}
                        </button>
                    )}
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-800 truncate">
                        {entity === 'Driver' ? <User size={15} className="text-slate-400" /> : entity === 'Asset' ? <Truck size={15} className="text-slate-400" /> : <Building2 size={15} className="text-slate-400" />}
                        {subjectLabel}
                    </span>
                </div>
            </div>

            {/* KPI tiles for this subject */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KpiTile label="Records" value={stats.total} Icon={Layers} accent="slate" />
                <KpiTile label="Complete" value={stats.complete} Icon={Check} accent="emerald" />
                <KpiTile label="Required Missing" value={stats.requiredMissing} Icon={CircleAlert} accent="rose" />
                <KpiTile label="Required Complete" value={`${stats.pct}%`} Icon={CalendarClock} accent="blue" />
            </div>

            {/* List card */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-100 overflow-x-auto">
                    {categoryTabs.map(t => {
                        const active = category === t.id;
                        return (
                            <button key={String(t.id)} type="button" onClick={() => setCategory(t.id)}
                                className={cn('inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                                    active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent')}>
                                {t.label}
                                <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Toolbar — search + filters + column selector */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records, numbers, tags, jurisdiction…"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | DataStatus)} className={selectCls} title="Filter by status">
                        <option value="all">All statuses</option>
                        <option value="complete">Complete</option>
                        <option value="missing">Missing</option>
                        <option value="optional">Optional</option>
                    </select>
                    <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className={selectCls} title="Filter by document tag">
                        <option value="all">All tags</option>
                        {tagCatalog.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ColumnsDropdown visible={visibleCols} onToggle={toggleCol} />
                    <div className="ml-auto flex items-center gap-2">
                        <button type="button" onClick={loadSampleData} title={alsoSeedSubjects?.length ? 'Populate carrier records plus a sample asset & driver (with demo PDF documents) so every monitoring tab has data' : 'Populate this list with representative sample records (with demo PDF documents)'}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-violet-200 bg-violet-50 text-[13px] font-semibold text-violet-700 hover:bg-violet-100">
                            <Sparkles size={14} /> Load sample data
                        </button>
                        {hasData && (
                            <button type="button" onClick={clearData} title="Clear all captured data for this subject"
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-500 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200">
                                <Trash2 size={14} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {pageRows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">No records match your search / filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                            <thead className="border-b border-slate-200 bg-slate-50/50">
                                <tr className="text-left">
                                    <SortableTh col="record" label="Record & Fields" sort={sort} onSort={toggleSort} className="pl-5" />
                                    {cols.map(c => <SortableTh key={c.id} col={c.id} label={c.label} sort={sort} onSort={toggleSort} />)}
                                    <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(r => (
                                    <RecordTableRow
                                        key={r.id}
                                        r={r}
                                        entry={entryFor(r)}
                                        visibleCols={visibleCols}
                                        expanded={expanded.has(r.id)}
                                        onToggle={() => toggleExpand(r.id)}
                                        onManage={() => setManage(r)}
                                        onMonitor={() => setManage(r)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap">
                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                        <label className="flex items-center gap-1.5">
                            Rows per page
                            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <span className="tabular-nums">{total === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, total)}`} of {total}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                        <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {manage && (
                <ManageModal
                    key={`${subjectId}-${manage.id}`}
                    record={manage}
                    subjectLabel={subjectLabel}
                    carrierName={carrierName}
                    initial={getEntry(subjectId, manage.id)}
                    onSave={entry => { setEntry(subjectId, manage.id, entry); setManage(null); }}
                    onClose={() => setManage(null)}
                />
            )}
        </div>
    );
}

function SortableTh({ col, label, sort, onSort, className }: {
    col: SortCol; label: string; sort: { col: SortCol; dir: 'asc' | 'desc' } | null; onSort: (c: SortCol) => void; className?: string;
}) {
    const active = sort?.col === col;
    const Icon = active ? (sort!.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className={cn('px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap', className)}>
            <button type="button" onClick={() => onSort(col)} className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}>
                {label} <Icon size={12} className={active ? '' : 'text-slate-300'} />
            </button>
        </th>
    );
}

function ColumnsDropdown({ visible, onToggle }: { visible: Set<DataColId>; onToggle: (id: DataColId) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                <Columns size={14} /> Columns <ChevronDown size={13} className="text-slate-400" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
                        {DATA_COLUMNS.map(c => (
                            <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-[13px] text-slate-700">
                                <input type="checkbox" checked={visible.has(c.id)} onChange={() => onToggle(c.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                {c.label}
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Record table row (+ expandable version sub-rows) ──────────────────
function RecordTableRow({ r, entry, visibleCols, expanded, onToggle, onManage, onMonitor }: {
    r: SafetyRecord; entry: RecordDataEntry; visibleCols: Set<DataColId>;
    expanded: boolean; onToggle: () => void; onManage: () => void; onMonitor: () => void;
}) {
    const status = entryStatus(r, entry);
    const isMulti = !!r.multiInstance;
    const insts = instancesOf(entry);
    const noun = r.instanceNoun || 'document';
    const nounPl = (n: number) => (n === 1 ? noun : (noun.endsWith('y') ? noun.slice(0, -1) + 'ies' : noun + 's'));
    // Representative "current" for the row — for multi-instance records, the first policy's current version.
    const cur = isMulti ? (insts[0]?.versions[0] ?? null) : currentVersion(entry);
    const curFile = cur?.files[0];               // the "latest current document" shown in the main row
    const versionCount = isMulti ? insts.length : entry.versions.length;
    // Expandable when there are policies (multi-instance), more than one version, or a version holds >1 file.
    const expandable = isMulti ? insts.length > 0 : (versionCount > 1 || entry.versions.some(v => v.files.length > 1));
    const monitoringOn = isMulti ? insts.some(i => !!i.versions[0]?.monitoring?.enabled) : !!cur?.monitoring?.enabled;
    const colSpan = visibleCols.size + 2; // record + actions + visible data columns

    return (
        <>
            <tr className="border-b border-slate-100 hover:bg-slate-50/50 align-top">
                {/* Record & Fields */}
                <td className="px-4 py-3.5 pl-5">
                    <div className="flex items-start gap-2">
                        {expandable ? (
                            <button type="button" onClick={onToggle} title={expanded ? 'Collapse' : 'Expand versions'}
                                className="mt-0.5 h-5 w-5 inline-flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0">
                                {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </button>
                        ) : <span className="w-5 shrink-0" />}
                        <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900">{r.recordName}</div>
                            {r.description && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{r.description}</div>}
                            <div className="mt-1 flex flex-wrap gap-1.5">
                                {r.numberName && (
                                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                        <Hash size={9} /> {r.numberName}
                                    </span>
                                )}
                                {r.documentName && (
                                    <span className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">
                                        <FileText size={9} /> {r.documentName}
                                    </span>
                                )}
                                {cur && cur.tags.length > 0 && cur.tags.map(t => (
                                    <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', tagColor(t))}>
                                        <Tag size={9} /> {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </td>
                {/* Category */}
                {visibleCols.has('category') && (
                    <td className="px-4 py-3.5">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                            {CATEGORY_SHORT[r.category] ?? r.category}
                        </span>
                    </td>
                )}
                {/* Record Type */}
                {visibleCols.has('type') && (
                    <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', RECORD_TYPE_TONE[r.type])}>
                            {RECORD_TYPE_LABEL[r.type]}
                        </span>
                    </td>
                )}
                {/* Monitoring — captured values on the current version */}
                {visibleCols.has('monitoring') && (
                    <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col gap-1.5 text-[12px] min-w-[180px]">
                            {r.numberName && (
                                <div className="leading-snug text-slate-700">
                                    <span className="text-slate-400">{r.numberName}: </span>
                                    <span className="font-semibold">{cur?.numberValue || '—'}</span>
                                </div>
                            )}
                            {isDateMonitored(r) ? (
                                <div className="flex items-start gap-1.5 leading-snug text-slate-600">
                                    <CalendarClock size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                    <span><span className="text-slate-400">{r.monitorType}: </span><span className="font-semibold text-slate-700">{cur?.expiryDate || '—'}</span></span>
                                </div>
                            ) : (
                                <div className="flex items-start gap-1.5 leading-snug text-slate-600">
                                    <CircleDashed size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                    <span><span className="text-slate-400">{r.monitorType}: </span><span className="font-semibold text-slate-700">{cur?.status || '—'}</span></span>
                                </div>
                            )}
                            {(monitoringOn || isMulti || versionCount > 1) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {monitoringOn && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                            <Bell size={9} /> Monitoring on
                                        </span>
                                    )}
                                    {isMulti
                                        ? insts.length > 0 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{insts.length} {nounPl(insts.length)} · all active</span>
                                        : versionCount > 1 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{versionCount} versions</span>}
                                </div>
                            )}
                        </div>
                    </td>
                )}
                {/* Status */}
                {visibleCols.has('status') && (
                    <td className="px-4 py-3.5"><StatusPill status={status} /></td>
                )}
                {/* Actions — View · Manage / Upload · Monitor */}
                <td className="px-4 py-3.5 pr-5">
                    <div className="flex items-center justify-end gap-1.5">
                        <button type="button" title={curFile?.url ? 'View current document' : 'No viewable document'} disabled={!curFile?.url}
                            onClick={() => curFile?.url && openFile(curFile)}
                            className={cn('inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-semibold transition-colors',
                                curFile?.url ? 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200'
                                    : 'border-slate-200 text-slate-300 cursor-not-allowed')}>
                            <Eye size={14} /> View
                        </button>
                        <button type="button" title={versionCount > 0 ? 'Upload / manage documents' : 'Upload document'} onClick={onManage}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                            <UploadCloud size={14} /> {versionCount > 0 ? 'Manage' : 'Upload'}
                        </button>
                        <button type="button" title="Monitoring & notifications" onClick={onMonitor}
                            className={cn('inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-semibold transition-colors',
                                monitoringOn ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200')}>
                            <Bell size={14} /> {monitoringOn ? 'Monitoring' : 'Monitor'}
                        </button>
                    </div>
                </td>
            </tr>

            {/* Expanded — one card per version (or per active policy for multi-instance records) */}
            {expandable && expanded && (
                <tr className="bg-slate-50/50">
                    <td colSpan={colSpan} className="px-5 pb-4 pt-1">
                        <div className="ml-7 space-y-2">
                            {isMulti ? insts.map((inst, idx) => {
                                const c = inst.versions[0];
                                return (
                                    <div key={inst.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 min-w-[7rem] shrink-0">
                                            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-700">ACTIVE</span>
                                            <span className="truncate max-w-[170px]">{inst.name || `${noun.charAt(0).toUpperCase() + noun.slice(1)} ${idx + 1}`}</span>
                                        </span>
                                        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                                            {c && c.files.length ? c.files.map((f, i) => (
                                                <button key={i} type="button" onClick={() => openFile(f)} title="View document"
                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 hover:border-blue-300 hover:bg-blue-50/40">
                                                    <DocThumb f={f} size={30} />
                                                    <span className="text-[11px] text-slate-600 max-w-[130px] truncate">{f.slot ? `${f.slot}: ` : ''}{f.name}</span>
                                                    <Eye size={12} className="text-blue-500 shrink-0" />
                                                </button>
                                            )) : <span className="text-[11px] text-slate-400">No document uploaded</span>}
                                        </div>
                                        <span className="text-[11px] text-slate-500 shrink-0">
                                            {[c?.numberValue, c?.expiryDate].filter(Boolean).join(' · ')}{inst.versions.length > 1 ? ` · ${inst.versions.length} versions` : ''}
                                        </span>
                                    </div>
                                );
                            }) : entry.versions.map((v, idx) => (
                                <div key={v.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700 w-28 shrink-0">
                                        {v.label}
                                        {idx === 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">Current</span>}
                                    </span>
                                    <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                                        {v.files.length ? v.files.map((f, i) => (
                                            <button key={i} type="button" onClick={() => openFile(f)} title="View document"
                                                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 hover:border-blue-300 hover:bg-blue-50/40">
                                                <DocThumb f={f} size={30} />
                                                <span className="text-[11px] text-slate-600 max-w-[130px] truncate">{f.slot ? `${f.slot}: ` : ''}{f.name}</span>
                                                <Eye size={12} className="text-blue-500 shrink-0" />
                                            </button>
                                        )) : <span className="text-[11px] text-slate-400">No document uploaded</span>}
                                    </div>
                                    <span className="text-[11px] text-slate-500 shrink-0">
                                        {[v.numberValue, v.expiryDate].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

// ── KPI tile ──────────────────────────────────────────────────────────
const ACCENT: Record<string, string> = {
    slate: 'text-slate-500 bg-slate-100',
    emerald: 'text-emerald-600 bg-emerald-50',
    rose: 'text-rose-600 bg-rose-50',
    blue: 'text-blue-600 bg-blue-50',
};
function KpiTile({ label, value, Icon, accent }: { label: string; value: string | number; Icon: typeof Layers; accent: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3.5 flex items-center justify-between">
            <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
            </div>
            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', ACCENT[accent] ?? ACCENT.slate)}>
                <Icon size={18} />
            </div>
        </div>
    );
}

// ── Version set — the upload-first version manager for ONE document/policy ──
function VersionSet({ record, versions, onChange, versioned, tagCatalog, addToCatalog }: {
    record: SafetyRecord;
    versions: DocVersion[];
    onChange: (versions: DocVersion[]) => void;
    versioned: boolean;
    tagCatalog: string[];
    addToCatalog: (t: string) => void;
}) {
    const hasDoc = record.type !== 'C' && record.docRequirement !== 'none';
    const slots = record.slotLabels ?? [];
    const countries = record.allCountries ? ALL_COUNTRIES : COUNTRIES;
    const numberRequired = record.type === 'C' || record.type === 'DC';
    const inputCls = 'w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [infoId, setInfoId] = useState<string | null>(null);

    const patchVersion = (id: string, patch: Partial<DocVersion>) =>
        onChange(versions.map(v => (v.id === id ? { ...v, ...patch } : v)));
    const setCountry = (id: string, val: string) =>
        onChange(versions.map(v => (v.id === id
            ? { ...v, country: val, stateProv: (STATES_BY_COUNTRY[val] ?? []).includes(v.stateProv) ? v.stateProv : '' }
            : v)));
    const addVersion = () =>
        onChange([{ ...newVersion(`Version ${versions.length + 1}`), monitoring: seedMonitoring(record) }, ...versions]);
    const addVersionWithFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const docs: DataDocFile[] = await Promise.all(Array.from(list).map(async f => ({
            name: f.name, size: f.size, url: await readAsDataUrl(f), uploadedAt: new Date().toISOString(),
        })));
        onChange([{ ...newVersion(`Version ${versions.length + 1}`), monitoring: seedMonitoring(record), files: docs }, ...versions]);
    };
    const removeVersion = (id: string) => onChange(versions.filter(v => v.id !== id));
    const addFiles = async (id: string, list: FileList | null) => {
        if (!list || list.length === 0) return;
        const docs: DataDocFile[] = await Promise.all(Array.from(list).map(async f => ({
            name: f.name, size: f.size, url: await readAsDataUrl(f), uploadedAt: new Date().toISOString(),
        })));
        onChange(versions.map(v => (v.id === id ? { ...v, files: [...v.files, ...docs] } : v)));
    };
    const removeFile = (id: string, i: number) =>
        onChange(versions.map(v => (v.id === id ? { ...v, files: v.files.filter((_, idx) => idx !== i) } : v)));
    const setSlotFile = async (id: string, slot: string, file: File | undefined) => {
        if (!file) return;
        const doc: DataDocFile = { name: file.name, size: file.size, url: await readAsDataUrl(file), slot, uploadedAt: new Date().toISOString() };
        onChange(versions.map(v => (v.id === id ? { ...v, files: [...v.files.filter(f => f.slot !== slot), doc] } : v)));
    };
    const removeSlotFile = (id: string, slot: string) =>
        onChange(versions.map(v => (v.id === id ? { ...v, files: v.files.filter(f => f.slot !== slot) } : v)));
    const addTag = (id: string, t: string) => {
        const val = t.trim();
        if (!val) return;
        addToCatalog(val);
        onChange(versions.map(ver => (ver.id === id
            ? (ver.tags.some(x => x.toLowerCase() === val.toLowerCase()) ? ver : { ...ver, tags: [...ver.tags, val] })
            : ver)));
    };
    const removeTag = (id: string, t: string) =>
        onChange(versions.map(ver => (ver.id === id ? { ...ver, tags: ver.tags.filter(x => x !== t) } : ver)));

    return (
        <div className="space-y-4">
            {versions.map((v, idx) => (
                <div key={v.id} className={cn('rounded-xl border p-4 space-y-3', idx === 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white')}>
                    {versioned && (
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                {idx === 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                        <Check size={10} /> CURRENT
                                    </span>
                                )}
                                {renamingId === v.id ? (
                                    <input autoFocus value={renameDraft} onChange={e => setRenameDraft(e.target.value)}
                                        onBlur={() => { const t = renameDraft.trim(); if (t) patchVersion(v.id, { label: t }); setRenamingId(null); }}
                                        onKeyDown={e => { if (e.key === 'Enter') { const t = renameDraft.trim(); if (t) patchVersion(v.id, { label: t }); setRenamingId(null); } if (e.key === 'Escape') setRenamingId(null); }}
                                        className="h-7 px-2 rounded border border-blue-300 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                ) : (
                                    <span className="text-sm font-semibold text-slate-800 truncate">{v.label}</span>
                                )}
                                <button type="button" title="Rename version" onClick={() => { setRenameDraft(v.label); setRenamingId(v.id); }}
                                    className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"><Pencil size={13} /></button>
                                <div className="relative">
                                    <button type="button" title="Version info" onClick={() => setInfoId(id => (id === v.id ? null : v.id))}
                                        className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"><Info size={13} /></button>
                                    {infoId === v.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setInfoId(null)} />
                                            <div className="absolute left-0 z-20 mt-1 w-60 rounded-lg border border-slate-200 bg-white shadow-lg p-3 text-[12px] text-slate-600">
                                                <div className="font-semibold text-slate-800 mb-1">Version details</div>
                                                <div>Uploaded: {fmtDateTime(v.uploadedAt)}</div>
                                                <div>{v.files.length} file{v.files.length === 1 ? '' : 's'} attached</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button type="button" onClick={() => removeVersion(v.id)} title="Remove version"
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 shrink-0">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    {/* DETAILS */}
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {record.numberName && (
                            <Field label={record.numberName} required={numberRequired}>
                                <input value={v.numberValue} onChange={e => patchVersion(v.id, { numberValue: e.target.value })}
                                    placeholder={`Enter ${record.numberName.toLowerCase()}`}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                            </Field>
                        )}
                        <Field label="Country">
                            <select value={v.country} onChange={e => setCountry(v.id, e.target.value)} className={inputCls}>
                                <option value="">Select country</option>
                                {countries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        {!record.hideState && (() => {
                            const states = STATES_BY_COUNTRY[v.country] ?? [];
                            return (
                                <Field label="State / Province">
                                    <select value={v.stateProv} disabled={states.length === 0} onChange={e => patchVersion(v.id, { stateProv: e.target.value })} className={inputCls}>
                                        <option value="">{states.length ? 'Select state / province' : '—'}</option>
                                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </Field>
                            );
                        })()}
                        {record.tracksIssueDate && (
                            <Field label="Issue date" optional>
                                <input type="date" value={v.issueDate} onChange={e => patchVersion(v.id, { issueDate: e.target.value })}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                            </Field>
                        )}
                        {isDateMonitored(record) && (
                            <Field label={record.monitorType} required>
                                <input type="date" value={v.expiryDate} onChange={e => patchVersion(v.id, { expiryDate: e.target.value })}
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                            </Field>
                        )}
                        {!isDateMonitored(record) && (
                            <Field label="Status" required>
                                <select value={v.status ?? ''} onChange={e => patchVersion(v.id, { status: e.target.value })} className={inputCls}>
                                    <option value="">Select status</option>
                                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </Field>
                        )}
                    </div>

                    {/* UPLOADED DOCUMENT */}
                    {hasDoc && (
                        <div className="border-t border-slate-200 pt-3">
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Uploaded Document</div>
                            <div className="mb-1.5 text-[12px] font-semibold text-slate-600">{record.documentName || 'Document'}</div>
                            {slots.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {slots.map(slot => {
                                        const file = v.files.find(f => f.slot === slot);
                                        return (
                                            <div key={slot}>
                                                <div className="mb-1 text-[11px] font-semibold text-slate-500">{slot}</div>
                                                {file ? (
                                                    <FileChip f={file} onRemove={() => removeSlotFile(v.id, slot)} />
                                                ) : (
                                                    <UploadZone compact label={`Drag ${slot} here — or click`} onFiles={list => setSlotFile(v.id, slot, list?.[0])} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : v.files.length > 0 ? (
                                // Document already uploaded → show the file (with View + Remove); hide the dropzone. Remove brings it back.
                                <div className="space-y-2">
                                    {v.files.map((f, i) => (
                                        <FileChip key={i} f={f} onRemove={() => removeFile(v.id, i)} />
                                    ))}
                                </div>
                            ) : (
                                <UploadZone
                                    label="Drag a file here — or click — to upload the document"
                                    hint="Captures the document for this version; PDF, image or file"
                                    multiple
                                    onFiles={list => addFiles(v.id, list)}
                                />
                            )}
                        </div>
                    )}

                    {/* MONITORING */}
                    <div className="border-t border-slate-200 pt-3">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitoring</div>
                        <MonitoringPanel record={record} monitoring={v.monitoring} issueDate={v.issueDate} expiryDate={v.expiryDate} status={v.status ?? ''}
                            onChange={cfg => patchVersion(v.id, { monitoring: cfg })} />
                    </div>

                    {/* TAGS */}
                    <div className="border-t border-slate-200 pt-3">
                        <TagField tags={v.tags} catalog={tagCatalog} onAdd={t => addTag(v.id, t)} onRemove={t => removeTag(v.id, t)} />
                    </div>

                    {/* NOTES */}
                    <div className="border-t border-slate-200 pt-3">
                        <Field label="Notes">
                            <textarea value={v.notes} onChange={e => patchVersion(v.id, { notes: e.target.value })} rows={2} placeholder="Optional notes…"
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                        </Field>
                    </div>
                </div>
            ))}

            {versioned && (
                slots.length > 0 || !hasDoc ? (
                    // Multi-slot / no-document records → add an empty version to fill in.
                    <button type="button" onClick={addVersion}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-4 py-4 text-[12px] font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50/40">
                        <Plus size={15} /> Add a new dated version
                    </button>
                ) : versions.length === 0 ? (
                    // Upload-first: no version yet → uploading the document captures the first dated version.
                    <UploadZone
                        label="Drag a file here — or click — to upload the document"
                        hint="Captures the first dated version — its number, dates &amp; document"
                        multiple
                        onFiles={addVersionWithFiles}
                    />
                ) : (
                    // Already has a current version → small, secondary affordance for a renewal (keeps history).
                    <UploadZone compact label="＋ Add a renewal / new dated version — drag a file or click" onFiles={addVersionWithFiles} />
                )
            )}
        </div>
    );
}

// ── Policy card — one concurrent instance of a multi-instance record (e.g. an insurance policy) ──
function PolicyCard({ record, instance, index, tagCatalog, addToCatalog, onChange, onRemove }: {
    record: SafetyRecord; instance: DocInstance; index: number;
    tagCatalog: string[]; addToCatalog: (t: string) => void;
    onChange: (patch: Partial<DocInstance>) => void; onRemove: () => void;
}) {
    const noun = record.instanceNoun || 'document';
    const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-3">
            <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 shrink-0">
                    <ShieldCheck size={10} /> {Noun} {index + 1}
                </span>
                <input value={instance.name} onChange={e => onChange({ name: e.target.value })}
                    placeholder={`${Noun} name — e.g. Liability — State Farm`}
                    className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                <button type="button" onClick={onRemove} title={`Remove ${noun}`}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 shrink-0"><Trash2 size={16} /></button>
            </div>
            <VersionSet record={record} versions={instance.versions} versioned onChange={vs => onChange({ versions: vs })} tagCatalog={tagCatalog} addToCatalog={addToCatalog} />
        </div>
    );
}

// ── Manage / version modal ────────────────────────────────────────────
function ManageModal({ record, subjectLabel, carrierName, initial, onSave, onClose }: {
    record: SafetyRecord;
    subjectLabel: string;
    carrierName: string;
    initial: RecordDataEntry;
    onSave: (entry: RecordDataEntry) => void;
    onClose: () => void;
}) {
    const isMulti = !!record.multiInstance;
    const multi = record.uploadMode === 'recurring' || record.uploadMode === 'event';
    const hasDoc = record.type !== 'C' && record.docRequirement !== 'none';
    const EntityIcon = ENTITY_ICON[record.entity];
    const noun = record.instanceNoun || 'document';
    const plural = (n: number) => (n === 1 ? noun : (noun.endsWith('y') ? noun.slice(0, -1) + 'ies' : noun + 's'));
    const { tags: tagCatalog, add: addToCatalog } = useSafetyTags();

    const normalizeV = (v: DocVersion): DocVersion => ({ ...v, files: [...v.files], monitoring: seedMonitoring(record, v.monitoring), tags: v.tags ?? [], status: v.status ?? '' });

    // Single-current records use `versions`; multi-instance records use `instances` (each policy keeps its own versions).
    const [versions, setVersions] = useState<DocVersion[]>(() => {
        if (isMulti) return [];
        if (initial.versions.length) return initial.versions.map(normalizeV);
        return multi ? [] : [{ ...newVersion('Version 1'), monitoring: seedMonitoring(record) }];
    });
    const [instances, setInstances] = useState<DocInstance[]>(() => {
        if (!isMulti) return [];
        const seed = (initial.instances && initial.instances.length)
            ? initial.instances
            : (initial.versions.length ? [{ ...newInstance(''), versions: initial.versions }] : []);
        return seed.length ? seed.map(i => ({ ...i, versions: i.versions.map(normalizeV) })) : [newInstance('')];
    });

    const updateInstance = (id: string, patch: Partial<DocInstance>) =>
        setInstances(list => list.map(i => (i.id === id ? { ...i, ...patch } : i)));
    const addPolicy = () => setInstances(list => [...list, newInstance('')]);
    const removePolicy = (id: string) => setInstances(list => list.filter(i => i.id !== id));

    // Self-heal legacy data: earlier sample/demo files were saved WITHOUT a viewable document (no url → no View).
    // On open, attach a real demo PDF to any file that's missing one (Save persists it).
    useEffect(() => {
        if (!hasDoc) return;
        const missing = (vs: DocVersion[]) => vs.some(v => v.files.some(f => !f.url));
        if (!(isMulti ? instances.some(i => missing(i.versions)) : missing(versions))) return;
        const fixV = (v: DocVersion): DocVersion =>
            v.files.some(f => !f.url) ? { ...v, files: v.files.map(f => (f.url ? f : withDemoPdf(record, f))) } : v;
        if (isMulti) setInstances(list => list.map(i => ({ ...i, versions: i.versions.map(fixV) })));
        else setVersions(list => list.map(fixV));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // "Fill demo data" — mirrors Load sample data: attaches a real demo PDF (public/demo-docs/*.pdf) so View works.
    const country = record.allCountries ? 'United States' : 'Canada';
    const stateProv = record.hideState ? '' : (STATES_BY_COUNTRY[country]?.[0] ?? '');
    const fillV = (v: DocVersion, over: Partial<DocVersion> = {}): DocVersion => {
        const merged: DocVersion = {
            ...v,
            numberValue: record.numberName ? sampleNumber(record) : v.numberValue,
            country, stateProv,
            issueDate: record.tracksIssueDate ? '2024-01-15' : v.issueDate,
            expiryDate: isDateMonitored(record) ? (record.configuredDate ?? '2026-12-31') : v.expiryDate,
            status: !isDateMonitored(record) ? (v.status || 'Active') : v.status,
            tags: v.tags.length ? v.tags : ['Verified', 'Primary'],
            files: v.files,
            monitoring: { ...v.monitoring, enabled: true },
            ...over,
        };
        if (hasDoc && merged.files.length === 0) merged.files = sampleDocFiles(record);
        return merged;
    };
    const fillDemo = () => {
        if (isMulti) {
            const mk = (name: string, num: string, exp: string): DocInstance => ({
                ...newInstance(name),
                versions: [fillV({ ...newVersion('Version 2026'), monitoring: seedMonitoring(record) }, { numberValue: num, expiryDate: exp })],
            });
            setInstances([mk('Liability — State Farm', 'POL-100', '2026-12-31'), mk('Cargo — Progressive', 'POL-200', '2027-03-15')]);
        } else {
            setVersions(vs => (vs.length ? vs.map((v, idx) => (idx !== 0 ? v : fillV(v))) : [fillV({ ...newVersion('Version 1'), monitoring: seedMonitoring(record) })]));
        }
        ['Verified', 'Primary'].forEach(addToCatalog);
    };

    const save = () => {
        if (isMulti) {
            const kept = instances
                .map(i => ({ ...i, versions: i.versions.filter(v => !isVersionEmpty(v)) }))
                .filter(i => i.versions.length > 0 || i.name.trim().length > 0);
            onSave({ versions: [], instances: kept });
        } else {
            onSave({ versions: versions.filter(v => !isVersionEmpty(v)) });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* header (fixed) */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{record.recordName}</h3>
                            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', RECORD_TYPE_TONE[record.type])}>
                                {RECORD_TYPE_LABEL[record.type]}
                            </span>
                        </div>
                        {record.description && <p className="mt-0.5 text-[12px] text-slate-500">{record.description}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600">
                                <EntityIcon size={13} className="text-slate-400" /> {record.entity}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {CATEGORY_SHORT[record.category] ?? record.category}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                <Building2 size={11} /> {record.entity === 'Carrier' ? carrierName : `${carrierName} · ${subjectLabel}`}
                            </span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <button type="button" onClick={fillDemo}
                            className="inline-flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
                            <Sparkles size={13} /> Fill demo data
                        </button>
                        {isMulti
                            ? <span className="text-[12px] text-slate-500">{instances.length} {plural(instances.length)} · all active</span>
                            : (multi && versions.length > 0 && <span className="text-[12px] text-slate-500">{versions.length} dated version{versions.length === 1 ? '' : 's'} · newest first</span>)}
                    </div>

                    {isMulti ? (
                        <>
                            <div>
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="text-[13px] font-semibold text-slate-700">{record.documentName || 'Document'}</span>
                                    {record.docRequirement === 'required' && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                                </div>
                                <p className="text-[11px] text-slate-400">Add every active {noun} — each keeps its own current document plus renewal history.</p>
                            </div>
                            {instances.map((inst, i) => (
                                <PolicyCard key={inst.id} record={record} instance={inst} index={i} tagCatalog={tagCatalog} addToCatalog={addToCatalog}
                                    onChange={patch => updateInstance(inst.id, patch)} onRemove={() => removePolicy(inst.id)} />
                            ))}
                            {/* Distinct solid primary action — adds a whole new concurrent policy (not a version of an existing one). */}
                            <div className="flex justify-center border-t border-dashed border-slate-200 pt-4">
                                <button type="button" onClick={addPolicy}
                                    className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 text-white text-[13px] font-semibold shadow-sm hover:bg-blue-700">
                                    <Plus size={16} /> Add another {noun}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {multi && hasDoc && (
                                <div>
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                        <span className="text-[13px] font-semibold text-slate-700">{record.documentName || 'Document'}</span>
                                        {record.docRequirement === 'required' && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                                        {record.docRequirement === 'optional' && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</span>}
                                    </div>
                                    <p className="text-[11px] text-slate-400">Each renewal / reissue captures its own number, dates, document and tags as a new dated version — upload below. Previous versions are retained.</p>
                                </div>
                            )}
                            <VersionSet record={record} versions={versions} versioned={multi} onChange={setVersions} tagCatalog={tagCatalog} addToCatalog={addToCatalog} />
                        </>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <MapPin size={12} /> {record.jurisdiction}
                    </div>
                </div>

                {/* footer (fixed) */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={save} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                        <Check size={15} /> Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Tag editor (per version) ──────────────────────────────────────────
function TagField({ tags, catalog, onAdd, onRemove }: {
    tags: string[]; catalog: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void;
}) {
    const [q, setQ] = useState('');
    const atMax = tags.length >= MAX_DOC_TAGS;
    const suggestions = (q.trim()
        ? catalog.filter(t => !tags.includes(t) && smartTagMatch(q, t))
        : catalog.filter(t => !tags.includes(t))
    ).slice(0, 8);
    const exists = catalog.some(t => t.toLowerCase() === q.trim().toLowerCase());
    const add = (t: string) => { const v = t.trim(); if (!v || atMax) return; onAdd(v); setQ(''); };
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                    <Tag size={12} className="text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-500">Tags</span>
                </div>
                <span className={cn('text-[10px] font-bold tabular-nums', atMax ? 'text-amber-600' : 'text-slate-400')}>{tags.length}/{MAX_DOC_TAGS}</span>
            </div>
            {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {tags.map(t => (
                        <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>
                            {t}
                            <button type="button" onClick={() => onRemove(t)} className="opacity-60 hover:opacity-100" title="Remove tag"><X size={10} /></button>
                        </span>
                    ))}
                </div>
            )}
            {atMax ? (
                <p className="text-[11px] font-medium text-amber-600">Maximum of {MAX_DOC_TAGS} tags reached — remove one to add another.</p>
            ) : (
                <div className="relative">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={q} onChange={e => setQ(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(q); } }}
                                placeholder="Search or add a tag…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                        <button type="button" onClick={() => add(q)} disabled={!q.trim()}
                            className={cn('inline-flex shrink-0 items-center gap-1 h-9 px-3.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors',
                                q.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-400 cursor-not-allowed')}>
                            <Plus size={14} /> Add
                        </button>
                    </div>
                    {q.trim() && (
                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1">
                            {suggestions.map(t => (
                                <button key={t} type="button" onMouseDown={e => { e.preventDefault(); add(t); }}
                                    className="flex w-full items-center gap-1.5 px-2 py-1.5 rounded hover:bg-slate-50 text-left">
                                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>{t}</span>
                                </button>
                            ))}
                            {!exists && (
                                <button type="button" onMouseDown={e => { e.preventDefault(); add(q); }}
                                    className={cn('flex w-full items-center gap-1.5 px-2 py-1.5 rounded hover:bg-blue-50 text-left text-[13px] font-semibold text-blue-700', suggestions.length > 0 && 'mt-1 border-t border-slate-100 pt-2')}>
                                    <Plus size={12} /> Create “{q.trim()}”
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Monitoring & notifications modal (row "monitoring" action) ────────
// ── Refined upload dropzone (mirrors the settings-catalog Dropzone) ───
function UploadZone({ label, hint, compact, multiple, onFiles }: {
    label: string; hint?: string; compact?: boolean; multiple?: boolean; onFiles: (files: FileList | null) => void;
}) {
    const [dragging, setDragging] = useState(false);
    return (
        <label
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
            className={cn(
                'flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors',
                compact ? 'px-3 py-4' : 'px-4 py-7',
                dragging
                    ? 'cursor-copy border-blue-400 bg-blue-50 ring-2 ring-blue-200'
                    : 'cursor-pointer border-slate-300 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40',
            )}
        >
            <input type="file" multiple={multiple} className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = ''; }} />
            <UploadCloud size={compact ? 18 : 24} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
            <p className={cn('font-medium text-slate-600', compact ? 'text-[12px]' : 'text-sm')}>{dragging ? 'Drop file to upload' : label}</p>
            {hint && !dragging && <span className="text-[11px] text-slate-400">{hint}</span>}
        </label>
    );
}

function FileChip({ f, onRemove }: { f: DataDocFile; onRemove: () => void }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
            <div className="h-9 w-9 rounded-lg bg-white text-emerald-500 shadow-sm flex items-center justify-center shrink-0"><FileText size={16} /></div>
            <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-slate-800 truncate">{f.name}</div>
                <div className="text-[11px] text-emerald-600">✓ Uploaded · {fmtSize(f.size)}</div>
            </div>
            {f.url && (
                <button type="button" onClick={() => openFile(f)} title="View document"
                    className="inline-flex shrink-0 items-center gap-1.5 h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
                    <Eye size={14} /> View
                </button>
            )}
            <button type="button" onClick={onRemove} title="Remove"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-rose-600 shrink-0"><Trash2 size={16} /></button>
        </div>
    );
}

// ── Monitoring panel (inline in each version + the row bell modal) ────
function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
    return (
        <button type="button" onClick={() => onChange(!on)} aria-pressed={on}
            className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0', on ? 'bg-blue-600' : 'bg-slate-300')}>
            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', on ? 'left-[18px]' : 'left-0.5')} />
        </button>
    );
}
function RadioRow({ checked, disabled, onClick, label }: { checked: boolean; disabled?: boolean; onClick: () => void; label: string }) {
    return (
        <button type="button" disabled={disabled} onClick={onClick}
            className={cn('flex items-center gap-2 text-[13px]', disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:text-slate-900')}>
            <span className={cn('h-4 w-4 rounded-full border flex items-center justify-center shrink-0', checked ? 'border-blue-600' : 'border-slate-300')}>
                {checked && <span className="h-2 w-2 rounded-full bg-blue-600" />}
            </span>
            {label}
        </button>
    );
}
function CheckRow({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
    return (
        <button type="button" onClick={onClick} className="flex items-center gap-2 text-[13px] text-slate-700 hover:text-slate-900">
            <span className={cn('h-4 w-4 rounded border flex items-center justify-center shrink-0', checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300')}>
                {checked && <Check size={11} />}
            </span>
            {label}
        </button>
    );
}
function MonitoringPanel({ record, monitoring, issueDate, expiryDate, status, onChange }: {
    record: SafetyRecord; monitoring: MonitoringConfig; issueDate: string; expiryDate: string; status: string; onChange: (cfg: MonitoringConfig) => void;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const cfg = monitoring;
    const isStatus = cfg.basis === 'status';
    const set = (patch: Partial<MonitoringConfig>) => onChange({ ...cfg, ...patch });
    // Switching basis: status monitoring has no date reminders → clear them; returning to a date basis restores sensible defaults.
    const setBasis = (basis: MonitorBasis) => {
        if (basis === 'status') onChange({ ...cfg, basis, reminders: [] });
        else onChange({ ...cfg, basis, reminders: cfg.reminders.length ? cfg.reminders : [90, 60, 30] });
    };
    const toggleReminder = (d: number) => set({ reminders: cfg.reminders.includes(d) ? cfg.reminders.filter(x => x !== d) : [...cfg.reminders, d] });
    const basisLabel = cfg.basis === 'issue' ? 'Issue date' : cfg.basis === 'custom' ? 'Custom date' : cfg.basis === 'status' ? 'Status' : 'Expiry date';
    const resolved = monitoredDateFor(cfg, { issueDate, expiryDate });
    const recurrence = cfg.recurrence || 'annually';
    const recLabel = RECURRENCE_OPTIONS.find(o => o.id === recurrence)?.label ?? 'Annually';
    const sortedReminders = [...cfg.reminders].sort((a, b) => b - a);
    const daysBefore = sortedReminders.filter(d => d > 0);
    const onDate = sortedReminders.includes(0);
    const remindText = [daysBefore.length ? `${daysBefore.join(', ')} days before` : null, onDate ? 'on the date' : null].filter(Boolean).join(' and ');
    const remindSentence = remindText ? `Reminders ${remindText}` : 'No reminders selected';
    const channelText = [cfg.channels.email && 'Email', cfg.channels.inApp && 'In-App'].filter(Boolean).join(', ') || 'no channels';

    return (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Header + enable toggle */}
            <div className="flex items-center justify-between gap-3 border-l-2 border-blue-500 bg-slate-50/70 px-4 py-3">
                <div className="flex items-center gap-2">
                    <Bell size={15} className="text-blue-500" />
                    <h4 className="text-[13px] font-bold text-slate-800">Monitoring &amp; Notifications</h4>
                    {cfg.enabled && (
                        <button type="button" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'} className="ml-0.5 rounded p-0.5 text-slate-400 hover:text-slate-700">
                            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-600">{cfg.enabled ? 'Enabled' : 'Disabled'}</span>
                    <Switch on={cfg.enabled} onChange={v => set({ enabled: v })} />
                </div>
            </div>

            {cfg.enabled && !collapsed && (
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {/* Monitor based on + date/status + recurrence */}
                        <div className="space-y-4">
                            <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitor based on</p>
                                <div className="space-y-1.5">
                                    {record.tracksIssueDate && <RadioRow checked={cfg.basis === 'issue'} onClick={() => setBasis('issue')} label="Issue date" />}
                                    {isDateMonitored(record) && <RadioRow checked={cfg.basis === 'expiry'} onClick={() => setBasis('expiry')} label="Expiry date" />}
                                    <RadioRow checked={cfg.basis === 'custom'} onClick={() => setBasis('custom')} label="Custom date" />
                                    {!isDateMonitored(record) && <RadioRow checked={cfg.basis === 'status'} onClick={() => setBasis('status')} label="Status based" />}
                                </div>
                            </div>
                            {isStatus ? (
                                <div>
                                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status to monitor</p>
                                    <span className={cn('inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold',
                                        status ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                                        <CircleAlert size={14} /> {status || 'Set the status in the form above'}
                                    </span>
                                    <p className="mt-1 text-[10px] text-slate-400">Monitors the Status field above — you’re alerted when it changes.</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date to monitor</p>
                                        {cfg.basis === 'custom' ? (
                                            <>
                                                <input type="date" value={cfg.customDate} onChange={e => set({ customDate: e.target.value })}
                                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                                                <p className="mt-1 text-[10px] text-slate-400">Enter a specific date to monitor — independent of the expiry / issue date.</p>
                                            </>
                                        ) : (
                                            <>
                                                <span className={cn('inline-flex h-9 items-center gap-2 rounded-md border px-3 text-[13px] font-semibold',
                                                    resolved ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                                                    <CalendarClock size={14} /> {resolved || `Set the ${basisLabel.toLowerCase()} above`}
                                                </span>
                                                <p className="mt-1 text-[10px] text-slate-400">Pulled from the {basisLabel.toLowerCase()} above — pick “Custom date” to enter your own.</p>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Renewal recurrence</p>
                                        <select value={recurrence} onChange={e => set({ recurrence: e.target.value })}
                                            className="w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                                            {RECURRENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Reminders + channels */}
                        <div className="space-y-4">
                            <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification reminders</p>
                                {isStatus ? (
                                    <p className="text-[11px] text-slate-400">Date reminders don’t apply to status monitoring — you’re notified whenever the status changes.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                        {REMINDER_DAYS.map(d => <CheckRow key={d} checked={cfg.reminders.includes(d)} onClick={() => toggleReminder(d)} label={reminderLabel(d)} />)}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification channels</p>
                                <div className="flex flex-wrap items-center gap-4">
                                    <CheckRow checked={cfg.channels.email} onClick={() => set({ channels: { ...cfg.channels, email: !cfg.channels.email } })} label="Email" />
                                    <CheckRow checked={cfg.channels.inApp} onClick={() => set({ channels: { ...cfg.channels, inApp: !cfg.channels.inApp } })} label="In-App" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projected schedule */}
                    <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[12px] text-blue-800">
                        <Bell size={14} className="mt-0.5 shrink-0 text-blue-500" />
                        <div className="min-w-0">
                            <p className="font-semibold">Projected Notification Schedule</p>
                            <p className="text-blue-700">
                                {isStatus
                                    ? `Monitor status${status ? ` (${status})` : ''}. Notify on any status change · via ${channelText}.`
                                    : `Monitor ${basisLabel.toLowerCase()}${resolved ? ` (${resolved})` : ''}. ${remindSentence}${recurrence !== 'none' ? ` · repeats ${recLabel.replace(/\s*\(.*\)/, '')}` : ''} · via ${channelText}.`}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                {required && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                {optional && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</span>}
            </span>
            {children}
        </label>
    );
}
