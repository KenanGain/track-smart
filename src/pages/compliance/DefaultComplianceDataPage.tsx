import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    Building2, Truck, User, Layers, Search, Hash, FileText, MapPin, CalendarClock,
    UploadCloud, Eye, Trash2, X, Check, CircleAlert, CircleDashed, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown,
    ChevronLeft, Plus, Bell, Columns, Tag, Filter, Pencil, Info, Sparkles, ShieldCheck, Lock,
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
import { findUserById } from '@/data/users.data';
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

/** Current signed-in user's display name (for stamping who uploaded a version). */
function currentUserName(): string {
    try { const id = localStorage.getItem('app_current_user_id'); return (id && findUserById(id)?.name) || 'You'; } catch { return 'You'; }
}
/** Initials for an avatar chip from a person's name. */
function avatarInitials(name: string): string {
    const p = name.trim().split(/\s+/).filter(Boolean);
    if (!p.length) return '?';
    return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
const AVATAR_GRADIENTS = ['from-blue-500 to-blue-700', 'from-emerald-500 to-emerald-700', 'from-amber-500 to-amber-700', 'from-violet-500 to-violet-700', 'from-rose-500 to-rose-700', 'from-cyan-500 to-cyan-700'];
function avatarGradient(name: string): string {
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
// Sample uploader names for demo data (so "Uploaded by" shows realistic people).
const SAMPLE_UPLOADERS = ['Kenan Gain', 'Sarah Mitchell', 'Marcus Reed', 'Lily Chen', 'John Doe'];

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

/** Compact document list for one version — a tight line per file, or a clear "missing" chip when none uploaded. Shared by the table + mobile cards. */
function DocFilesCell({ files }: { files: DataDocFile[] }) {
    if (files.length === 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <CircleAlert size={11} /> No document
            </span>
        );
    }
    return (
        <div className="flex flex-col gap-0.5">
            {files.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <DocThumb f={f} size={18} />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-slate-600" title={f.name}>
                        {f.slot && <span className="mr-1 font-semibold text-slate-400">{f.slot}:</span>}{f.name}
                    </span>
                    {f.url && (
                        <button type="button" onClick={() => openFile(f)} title={`View ${f.name}`}
                            className="shrink-0 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"><Eye size={12} /> View</button>
                    )}
                </div>
            ))}
        </div>
    );
}

/** One label/value fact in a mobile document card. */
function MobileFact({ label, value }: { label: string; value?: string }) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-0.5 text-[13px] text-slate-700 truncate">{value || <span className="text-slate-400">—</span>}</div>
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
    'medical-certificate.pdf': 4785, 'drug-test.pdf': 4790, 'mvr.pdf': 4808, 'psp-report.pdf': 4779, 'safety-fitness.pdf': 4800,
    'mc-authority.pdf': 4762, 'ifta.pdf': 4763, 'irp.pdf': 4779, 'annual-inspection.pdf': 4766, 'business-registration.pdf': 4777,
};
// Route a record to its best-matching demo PDF by id / document name / record name (first rule wins).
const DEMO_PDF_RULES: { re: RegExp; file: string }[] = [
    { re: /medical|physical/, file: 'medical-certificate.pdf' },
    { re: /drug|alcohol|clearinghouse/, file: 'drug-test.pdf' },
    { re: /mvr|abstract/, file: 'mvr.pdf' },
    { re: /psp/, file: 'psp-report.pdf' },
    { re: /safety.?fitness|\bnsc\b|fitness/, file: 'safety-fitness.pdf' },
    { re: /\bmc\b|operating.?authority/, file: 'mc-authority.pdf' },
    { re: /ifta|fuel.?tax/, file: 'ifta.pdf' },
    { re: /\birp\b|apportion|cab.?card|plate/, file: 'irp.pdf' },
    { re: /inspection/, file: 'annual-inspection.pdf' },
    { re: /article|incorporat|business|fein|registration.?number/, file: 'business-registration.pdf' },
    { re: /insurance|pink.?slip/, file: 'insurance-certificate.pdf' },
    { re: /cvor|nir/, file: 'cvor-certificate.pdf' },
];
/** Pick the demo PDF that best represents a record — 13 realistic trucking-compliance documents for Acme. */
function demoPdfFile(record: SafetyRecord): { file: string; size: number } {
    let file: string;
    if (record.isLicense || record.id === 'cdl') file = 'driver-license.pdf';
    else if (record.multiInstance) file = 'insurance-certificate.pdf';
    else {
        const blob = `${record.id} ${record.documentName || ''} ${record.recordName}`.toLowerCase();
        file = DEMO_PDF_RULES.find(r => r.re.test(blob))?.file ?? 'compliance-document.pdf';
    }
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
        uploadedBy: SAMPLE_UPLOADERS[(recordHash(record) + label.length) % SAMPLE_UPLOADERS.length],
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

/**
 * RICH sample for the detail page's "Sample data" button — always produces MULTIPLE documents so
 * the dedicated multi-document list is demonstrable: 3 dated versions for normal records, and for
 * INSURANCE two policies each with 2 versions (current + renewal history).
 */
function buildDetailSample(record: SafetyRecord): RecordDataEntry {
    const olderMon = () => ({ ...seedMonitoring(record), enabled: false });
    const dated = isDateMonitored(record);
    if (record.multiInstance) {
        // One instance per concurrent policy, each with a few dated versions (current + renewal history).
        const policy = (name: string, num: string, years: number[]): DocInstance => ({
            ...newInstance(name),
            versions: years.map((y, i) => sampleVersion(record, `Version ${y}`, {
                numberValue: num, expiryDate: `${y}-12-31`,
                tags: i === 0 ? ['Verified', 'Primary'] : [], monitoring: i === 0 ? { ...seedMonitoring(record), enabled: true } : olderMon(),
            })),
        });
        return {
            versions: [],
            instances: [
                policy('Liability — State Farm', 'POL-100', [2026, 2025, 2024]),
                policy('Cargo — Progressive', 'POL-200', [2027, 2026, 2025]),
                policy('Physical Damage — Northbridge', 'POL-300', [2026, 2025]),
                policy('Umbrella — Chubb', 'POL-400', [2026, 2025, 2024, 2023]),
            ],
        };
    }
    // 6 dated versions (newest = current, the rest are renewal history).
    // Slotted records (CDL, SSN) naturally get multiple files (Front/Back) via sampleVersion; single-upload records stay single.
    // History versions deliberately carry realistic GAPS so "missing document / date / number" states are demonstrable
    // (the current version i===0 always stays complete, so the record still reads as up-to-date).
    const years = [2026, 2025, 2024, 2023, 2022, 2021];
    return {
        versions: years.map((y, i) => {
            const v = sampleVersion(record, `Version ${y}`, {
                expiryDate: dated ? `${y}-12-31` : '',
                issueDate: record.tracksIssueDate ? `${y - 2}-01-10` : '',
                status: !dated ? (i === 0 ? 'Active' : 'On File') : '',
                tags: i === 0 ? ['Verified', 'Primary'] : i === 1 ? ['Renewed'] : [],
                monitoring: i === 0 ? { ...seedMonitoring(record), enabled: true } : olderMon(),
            });
            if (i === 2) return { ...v, files: [] };                       // missing document
            if (i === 3) return { ...v, expiryDate: '', issueDate: '' };    // missing dates
            if (i === 4) return { ...v, numberValue: '' };                  // missing number / code
            return v;
        }),
    };
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

// ── Toasts (global, stacked) — any component can fire one via emitToast() ──
type ToastKind = 'success' | 'error' | 'info';
interface ToastMsg { id: number; message: string; kind: ToastKind }
let __toastSeq = 0;
function emitToast(message: string, kind: ToastKind = 'success') {
    window.dispatchEvent(new CustomEvent('dc-toast', { detail: { id: ++__toastSeq, message, kind } as ToastMsg }));
}
/** Bottom-right stack of auto-dismissing toasts. Rendered once at the page root. */
function ToastStack() {
    const [toasts, setToasts] = useState<ToastMsg[]>([]);
    useEffect(() => {
        const h = (e: Event) => {
            const t = (e as CustomEvent).detail as ToastMsg;
            setToasts(list => [...list, t]);
            setTimeout(() => setToasts(list => list.filter(x => x.id !== t.id)), 3000);
        };
        window.addEventListener('dc-toast', h);
        return () => window.removeEventListener('dc-toast', h);
    }, []);
    return (
        <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-2">
            {toasts.map(t => (
                <div key={t.id} className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg animate-fade-in-up', t.kind === 'error' ? 'bg-rose-600' : 'bg-slate-900')}>
                    <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', t.kind === 'error' ? 'bg-white/20' : 'bg-emerald-500/20')}>
                        {t.kind === 'error' ? <CircleAlert className="h-3.5 w-3.5 text-white" /> : <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    </span>
                    <span className="text-sm font-medium">{t.message}</span>
                    <button type="button" onClick={() => setToasts(list => list.filter(x => x.id !== t.id))} className="ml-1 text-white/60 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
            ))}
        </div>
    );
}

/** Confirmation modal — "Are you sure?" before a destructive/irreversible action. */
function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel }: {
    title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onCancel} />
            <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
                <div className="flex items-start gap-3">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', danger ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600')}>
                        {danger ? <Trash2 size={19} /> : <CircleAlert size={20} />}
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900">{title}</h3>
                        <p className="mt-1 text-[13px] text-slate-500">{message}</p>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={onConfirm} className={cn('inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-white', danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700')}>
                        {danger && <Trash2 size={14} />} {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

type EntryGetter = (subjectId: string, recordId: string) => RecordDataEntry;
type EntrySetter = (subjectId: string, recordId: string, entry: RecordDataEntry) => void;

// ── Page ──────────────────────────────────────────────────────────────
export function DefaultComplianceDataPage({ accountId }: { accountId?: string }) {
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : 'the selected carrier';

    const { acct, all, getEntry, setEntry, setEntries } = useComplianceData(accountId);
    const [recordType, setRecordType] = useState<RecordTypeId>('DC');
    const [entity, setEntity] = useState<EntityId>('Carrier');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null); // asset/driver id
    const [focusRecordId, setFocusRecordId] = useState<string | null>(null);     // deep-link from the Monitoring page
    const [detailOpen, setDetailOpen] = useState(false);                         // a record's dedicated detail page is open → hide page chrome

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
    // One-click "Load sample data" seeds EVERY subject — the carrier + all assets + all drivers —
    // so the whole app (incl. monitoring) has representative data.
    const sampleSubjects = useMemo(() => {
        const extras: { subjectId: string; entity: EntityId }[] = [];
        for (const a of assets) extras.push({ subjectId: a.id, entity: 'Asset' });
        for (const d of drivers) extras.push({ subjectId: d.id, entity: 'Driver' });
        return extras;
    }, [assets, drivers]);

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <ToastStack />
            {/* Header — hidden while a record's dedicated detail page is open */}
            {!detailOpen && (
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
            )}

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
                        setEntries={setEntries}
                        all={all}
                        autoOpenRecordId={focusRecordId}
                        onFocusConsumed={() => setFocusRecordId(null)}
                        alsoSeedSubjects={sampleSubjects}
                        onDetailChange={setDetailOpen}
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
                                    setEntries={setEntries}
                                    all={all}
                                    autoOpenRecordId={focusRecordId}
                                    onFocusConsumed={() => setFocusRecordId(null)}
                                    onBack={() => setSelectedSubject(null)}
                                    backLabel="All assets"
                                    onDetailChange={setDetailOpen}
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
                                    setEntries={setEntries}
                                    all={all}
                                    autoOpenRecordId={focusRecordId}
                                    onFocusConsumed={() => setFocusRecordId(null)}
                                    onBack={() => setSelectedSubject(null)}
                                    backLabel="All drivers"
                                    onDetailChange={setDetailOpen}
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
function SubjectDocuments({ entity, subjectId, subjectLabel, carrierName, records, getEntry, setEntry, setEntries, all, onBack, backLabel, autoOpenRecordId, onFocusConsumed, alsoSeedSubjects, onDetailChange }: {
    entity: EntityId;
    subjectId: string;
    subjectLabel: string;
    carrierName: string;
    records: SafetyRecord[];
    getEntry: EntryGetter;
    setEntry: EntrySetter;
    setEntries: (items: { subjectId: string; recordId: string; entry: RecordDataEntry }[]) => void;
    all: unknown;
    onBack?: () => void;
    backLabel?: string;
    autoOpenRecordId?: string | null;   // deep-link: open this record's Manage modal on mount
    onFocusConsumed?: () => void;
    // Extra subjects to seed alongside this one (Carrier → also a sample asset + driver) so the
    // monitoring page's Driver / Asset tabs have representative data. `records` already holds every entity's records.
    alsoSeedSubjects?: { subjectId: string; entity: EntityId }[];
    // Notify the parent when a record's dedicated detail page opens/closes → it hides the page header + entity tabs.
    onDetailChange?: (open: boolean) => void;
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
    const [manage, setManage] = useState<SafetyRecord | null>(null);
    const [detailRecord, setDetailRecord] = useState<SafetyRecord | null>(null); // row → dedicated detail page
    const [confirmClear, setConfirmClear] = useState(false);                     // Clear → "are you sure?"
    // Tell the parent to hide its header/entity tabs while a detail page is open (and reset on unmount / subject change).
    useEffect(() => { onDetailChange?.(!!detailRecord); }, [detailRecord, onDetailChange]);
    useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

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

    // "Load sample data" — seed THIS subject + every alsoSeedSubject (all assets + drivers) in ONE batch write,
    // so the whole app (incl. monitoring) has representative data. Each doc-bearing record gets a real demo PDF.
    const loadSampleData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        entityRecords.forEach((r, i) => items.push({ subjectId, recordId: r.id, entry: buildSampleEntry(r, i) ?? emptyEntry() }));
        for (const ex of alsoSeedSubjects ?? [])
            records.filter(r => r.entity === ex.entity).forEach((r, i) => items.push({ subjectId: ex.subjectId, recordId: r.id, entry: buildSampleEntry(r, i) ?? emptyEntry() }));
        setEntries(items);
        const subjectCount = 1 + (alsoSeedSubjects?.length ?? 0);
        emitToast(`Sample data loaded — ${items.length} records across ${subjectCount} ${subjectCount === 1 ? 'subject' : 'subjects'}`);
    };
    const clearData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        entityRecords.forEach(r => items.push({ subjectId, recordId: r.id, entry: emptyEntry() }));
        for (const ex of alsoSeedSubjects ?? [])
            records.filter(r => r.entity === ex.entity).forEach(r => items.push({ subjectId: ex.subjectId, recordId: r.id, entry: emptyEntry() }));
        setEntries(items);
        emitToast('Data cleared');
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
            {detailRecord ? (
                <RecordDetailPage
                    record={detailRecord}
                    entry={getEntry(subjectId, detailRecord.id)}
                    entity={entity}
                    subjectLabel={subjectLabel}
                    subjectId={subjectId}
                    setEntry={setEntry}
                    onBack={() => setDetailRecord(null)}
                />
            ) : (
            <>
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
                            <button type="button" onClick={() => setConfirmClear(true)} title="Clear all captured data for this subject"
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
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(r => (
                                    <RecordTableRow
                                        key={r.id}
                                        r={r}
                                        entry={entryFor(r)}
                                        visibleCols={visibleCols}
                                        onOpen={() => setDetailRecord(r)}
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
            </>
            )}

            {manage && (
                <ManageModal
                    key={`${subjectId}-${manage.id}`}
                    record={manage}
                    subjectLabel={subjectLabel}
                    carrierName={carrierName}
                    initial={getEntry(subjectId, manage.id)}
                    onSave={entry => { setEntry(subjectId, manage.id, entry); setManage(null); emitToast('Changes saved'); }}
                    onClose={() => setManage(null)}
                />
            )}

            {confirmClear && (
                <ConfirmDialog
                    danger
                    title="Clear all data?"
                    message={`This removes every captured document / version for ${subjectLabel}${(alsoSeedSubjects?.length ?? 0) > 0 ? ' and all seeded assets & drivers' : ''}. This can't be undone.`}
                    confirmLabel="Clear all"
                    onConfirm={() => { clearData(); setConfirmClear(false); }}
                    onCancel={() => setConfirmClear(false)}
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
function RecordTableRow({ r, entry, visibleCols, onOpen }: {
    r: SafetyRecord; entry: RecordDataEntry; visibleCols: Set<DataColId>;
    onOpen: () => void;
}) {
    const status = entryStatus(r, entry);
    const isMulti = !!r.multiInstance;
    const insts = instancesOf(entry);
    const noun = r.instanceNoun || 'document';
    const nounPl = (n: number) => (n === 1 ? noun : (noun.endsWith('y') ? noun.slice(0, -1) + 'ies' : noun + 's'));
    // Representative "current" for the row — for multi-instance records, the first policy's current version.
    const cur = isMulti ? (insts[0]?.versions[0] ?? null) : currentVersion(entry);
    const versionCount = isMulti ? insts.length : entry.versions.length;
    const monitoringOn = isMulti ? insts.some(i => !!i.versions[0]?.monitoring?.enabled) : !!cur?.monitoring?.enabled;

    return (
        <>
            <tr className="border-b border-slate-100 hover:bg-slate-50/50 align-top">
                {/* Record & Fields */}
                <td className="px-4 py-3.5 pl-5">
                    <div className="flex items-start gap-2">
                        <div className="min-w-0">
                            <button type="button" onClick={onOpen} title="Open details" className="group inline-flex items-center gap-1 text-left text-sm font-semibold text-slate-900 hover:text-blue-600">
                                {r.recordName}
                                <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                            </button>
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
            </tr>

        </>
    );
}

// ── Record detail page (MOTUS-style: header band + info block + tabs + document table) ──
const MONITOR_BASIS_LABEL: Record<MonitorBasis, string> = { issue: 'Issue date', expiry: 'Expiry date', custom: 'Custom date', status: 'Status' };
function recurrenceLabel(id: string): string { return RECURRENCE_OPTIONS.find(o => o.id === id)?.label ?? id; }
/** Recurrence cadence → interval in months (0 = does not recur). */
function recurrenceMonths(id: string): number {
    return ({ monthly: 1, quarterly: 3, semiannually: 6, annually: 12, biennially: 24, triennially: 36, fiveyearly: 60 } as Record<string, number>)[id] ?? 0;
}

// ── Monitoring calendar helpers ───────────────────────────────────────
function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function daysBetween(a: Date, b: Date): number { return Math.round((a.setHours(0, 0, 0, 0) - new Date(b).setHours(0, 0, 0, 0)) / 86400000); }
function relDays(n: number): string {
    if (n === 0) return 'Today'; if (n === 1) return 'Tomorrow'; if (n === -1) return 'Yesterday';
    return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
interface AlertEvt { key: string; date: Date; label: string; kind: 'reminder' | 'due'; }
type DayMark = AlertEvt & { days: number };
/** Build the concrete alert dates from a monitoring config + its monitored date (reminders fire N days before; 9:00 AM). */
function buildAlerts(cfg: MonitoringConfig | undefined, monitoredDate: string, monitorType?: string): AlertEvt[] {
    if (!cfg || !monitoredDate || cfg.basis === 'status') return [];
    const due = new Date(`${monitoredDate}T09:00:00`);
    if (isNaN(due.getTime())) return [];
    const evts: AlertEvt[] = [...cfg.reminders].sort((a, b) => b - a).map(d => {
        const dt = new Date(due); dt.setDate(dt.getDate() - d);
        return { key: `r${d}`, date: dt, label: reminderLabel(d), kind: 'reminder' as const };
    });
    evts.push({ key: 'due', date: due, label: `${monitorType || 'Due'} date`, kind: 'due' });
    return evts;
}
const fmtAlertDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtAlertTime = (d: Date) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Compact single-month grid used inside the 12-month year view. Marked days show a hover tooltip and are clickable. */
function MiniMonth({ year, month, marks, selectedKey, onSelect }: {
    year: number; month: number; marks: Map<string, DayMark>; selectedKey: string | null; onSelect: (m: DayMark) => void;
}) {
    const startDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = ymd(new Date());
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    // Pad to a uniform 6 week-rows so every month box is the same square shape.
    while (cells.length < 42) cells.push(null);
    const monthHasMark = cells.some(d => d !== null && marks.has(ymd(new Date(year, month, d))));
    return (
        <div className={cn('flex aspect-square flex-col rounded-lg border p-2', monthHasMark ? 'border-blue-200 bg-blue-50/30' : 'border-slate-100')}>
            <div className={cn('mb-1 shrink-0 text-center text-[11px] font-bold', monthHasMark ? 'text-blue-700' : 'text-slate-600')}>
                {new Date(year, month, 1).toLocaleString(undefined, { month: 'short' })}
            </div>
            {/* auto header row + 6 equal week rows fill the square, so day cells stay square at any width */}
            <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-[auto_repeat(6,minmax(0,1fr))] gap-0.5">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="text-center text-[8px] font-semibold text-slate-300">{d}</div>)}
                {cells.map((d, i) => {
                    if (d === null) return <div key={i} />;
                    const key = ymd(new Date(year, month, d));
                    const mark = marks.get(key);
                    const isToday = key === todayKey;
                    const isSel = key === selectedKey;
                    if (mark) {
                        return (
                            <button key={i} type="button" onClick={() => onSelect(mark)}
                                title={`${mark.label} — ${fmtAlertDate(mark.date)} · ${fmtAlertTime(mark.date)} (${relDays(mark.days)})`}
                                className={cn('flex h-full min-h-0 items-center justify-center rounded text-[9px] font-bold text-white transition-transform hover:scale-110',
                                    mark.kind === 'due' ? 'bg-rose-500' : 'bg-blue-500', isSel && 'ring-2 ring-offset-1 ring-slate-800')}>{d}</button>
                        );
                    }
                    return (
                        <div key={i} className={cn('flex h-full min-h-0 items-center justify-center rounded text-[9px]',
                            isToday ? 'font-bold text-slate-700 ring-1 ring-slate-300' : 'text-slate-500')}>{d}</div>
                    );
                })}
            </div>
        </div>
    );
}

/** 12-month (yearly) calendar highlighting every reminder day (blue) + the due day (rose). Hover a day for details; click to select it. */
function YearCalendar({ year, marks, dueLabel, selectedKey, onSelect, onPrevYear, onNextYear, canPrev, canNext }: {
    year: number; marks: Map<string, DayMark>; dueLabel: string; selectedKey: string | null; onSelect: (m: DayMark) => void;
    onPrevYear?: () => void; onNextYear?: () => void; canPrev?: boolean; canNext?: boolean;
}) {
    const yearNav = !!(onPrevYear || onNextYear);
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                    {yearNav && (
                        <button type="button" onClick={onPrevYear} disabled={!canPrev} title="Previous year"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={15} /></button>
                    )}
                    <div className="text-sm font-bold text-slate-800 tabular-nums">{year} · full year <span className="ml-1 hidden font-normal text-slate-400 sm:inline">— hover a marked day for details, click to select</span></div>
                    {yearNav && (
                        <button type="button" onClick={onNextYear} disabled={!canNext} title="Next year"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={15} /></button>
                    )}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Reminder</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> {dueLabel}</span>
                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full ring-1 ring-slate-300" /> Today</span>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-4 gap-2.5">
                {Array.from({ length: 12 }, (_, m) => <MiniMonth key={m} year={year} month={m} marks={marks} selectedKey={selectedKey} onSelect={onSelect} />)}
            </div>
        </div>
    );
}


/** Monitoring TAB body — a VIEW-ONLY calendar + agenda of alerts (hover a day for details, click to select). */
function MonitoringCalendarTab({ record, cfg, monitoredDate, monitoringOn }: {
    record: SafetyRecord; cfg?: MonitoringConfig; monitoredDate: string; monitoringOn: boolean;
}) {
    const [selected, setSelected] = useState<DayMark | null>(null);
    const [viewYearOverride, setViewYearOverride] = useState<number | null>(null);
    if (!monitoringOn || !cfg) {
        return (
            <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><Bell size={20} /></div>
                <p className="text-sm font-semibold text-slate-700">Monitoring is off for this record</p>
                <p className="mt-1 text-[13px] text-slate-500">Enable it from the record's <span className="font-semibold text-slate-700">Monitor</span> action to get expiry / renewal reminders.</p>
            </div>
        );
    }
    if (cfg.basis === 'status') {
        return (
            <div className="p-5 space-y-4">
                <h3 className="inline-flex items-center gap-2 text-sm font-bold text-slate-800"><Bell size={16} className="text-blue-600" /> Status monitoring</h3>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-[13px] text-slate-600">
                    Notified whenever the status changes — there is no dated alert schedule.
                </div>
            </div>
        );
    }
    const today = new Date();
    const dueLabel = record.monitorType || 'Due';
    const base = new Date(`${monitoredDate}T09:00:00`);
    const interval = recurrenceMonths(cfg.recurrence);
    const baseYear = isNaN(base.getTime()) ? today.getFullYear() : base.getFullYear();
    const currentYear = today.getFullYear();
    const startYear = Math.min(baseYear, currentYear) - 1;
    const endYear = Math.max(baseYear, currentYear) + 3;
    // Project the monitored (due) date across recurrence cycles → every occurrence within [startYear, endYear].
    const dueDates: Date[] = [];
    if (!isNaN(base.getTime())) {
        if (interval <= 0) {
            dueDates.push(base);
        } else {
            const d = new Date(base);
            while (d.getFullYear() > startYear) d.setMonth(d.getMonth() - interval);
            while (d.getFullYear() <= endYear) {
                if (d.getFullYear() >= startYear) dueDates.push(new Date(d));
                d.setMonth(d.getMonth() + interval);
            }
        }
    }
    // Reminders + due for every cycle → the full multi-year alert set.
    const alerts: DayMark[] = dueDates
        .flatMap((due, ci) => buildAlerts(cfg, ymd(due), record.monitorType).map(e => ({ ...e, key: `c${ci}-${e.key}` })))
        .map(e => ({ ...e, days: daysBetween(new Date(e.date), today) }));
    const upcoming = [...alerts].filter(a => a.days >= 0).sort((a, b) => a.date.getTime() - b.date.getTime());
    const next = upcoming[0];
    const marks = new Map<string, DayMark>();
    for (const a of alerts) { const k = ymd(a.date); const ex = marks.get(k); marks.set(k, ex && ex.kind === 'due' ? ex : a); }
    const defaultYear = next ? next.date.getFullYear() : baseYear;
    const viewYear = Math.min(endYear, Math.max(startYear, viewYearOverride ?? defaultYear));
    const shown = selected || next;
    // Clicking a day / agenda row selects it AND jumps the calendar to that alert's year.
    const handleSelect = (m: DayMark) => { setSelected(m); setViewYearOverride(m.date.getFullYear()); };

    return (
        <div className="p-5 space-y-4">
            <h3 className="inline-flex items-center gap-2 flex-wrap text-sm font-bold text-slate-800"><CalendarClock size={16} className="text-blue-600" /> Upcoming alerts · <span className="font-semibold text-slate-500">{dueLabel} {monitoredDate}</span></h3>

            {/* Two-column: calendar on the left, alert schedule (scrollable) on the right */}
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
                {/* LEFT — 12-month (yearly) calendar with year switcher; hover for details, click to select */}
                <YearCalendar year={viewYear} marks={marks} dueLabel={dueLabel} selectedKey={selected ? ymd(selected.date) : null} onSelect={handleSelect}
                    onPrevYear={() => setViewYearOverride(viewYear - 1)} onNextYear={() => setViewYearOverride(viewYear + 1)}
                    canPrev={viewYear > startYear} canNext={viewYear < endYear} />

                {/* RIGHT — selected/next alert + the scrollable agenda */}
                <div className="flex flex-col rounded-xl border border-slate-200 overflow-hidden lg:max-h-[600px]">
                    {shown ? (
                        <div className={cn('shrink-0 border-b p-4', selected ? 'border-slate-200 bg-slate-50' : 'border-blue-100 bg-blue-50/60')}>
                            <div className="flex items-center justify-between gap-2">
                                <div className={cn('text-[10px] font-bold uppercase tracking-wider', selected ? 'text-slate-500' : 'text-blue-500')}>{selected ? 'Selected alert' : 'Next alert'}</div>
                                {selected && <button type="button" onClick={() => setSelected(null)} className="text-[11px] font-semibold text-slate-500 hover:text-slate-700">Clear</button>}
                            </div>
                            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                                <div>
                                    <div className="text-base font-bold text-slate-900">{shown.label}</div>
                                    <div className="mt-0.5 text-[12px] text-slate-600">{fmtAlertDate(shown.date)} · {fmtAlertTime(shown.date)}</div>
                                </div>
                                <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold', shown.days <= 7 && shown.days >= 0 ? 'bg-rose-100 text-rose-700' : shown.days < 0 ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700')}>{relDays(shown.days)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="shrink-0 border-b border-slate-100 p-4 text-[12px] text-slate-500">No upcoming alerts — every reminder date has passed. Click a day to inspect any alert.</div>
                    )}
                    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alert schedule · all cycles</span>
                        <span className="inline-flex items-center rounded-full bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 tabular-nums">{alerts.length}</span>
                    </div>
                    {/* Scrollable agenda of EVERY alert across cycles — click a row to select that alert (jumps the calendar to its year) */}
                    <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
                        {[...alerts].sort((a, b) => a.date.getTime() - b.date.getTime()).map(a => (
                            <li key={a.key}>
                                <button type="button" onClick={() => handleSelect(a)}
                                    className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50', a.days < 0 && 'opacity-50', selected?.key === a.key && 'bg-slate-100')}>
                                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', a.kind === 'due' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600')}>
                                        {a.kind === 'due' ? <CalendarClock size={15} /> : <Bell size={15} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[13px] font-semibold text-slate-800">{a.label}</div>
                                        <div className="text-[11px] text-slate-500">{fmtAlertDate(a.date)} · {fmtAlertTime(a.date)}</div>
                                    </div>
                                    <span className={cn('text-[12px] font-semibold whitespace-nowrap', a.days < 0 ? 'text-slate-400' : a.days <= 7 ? 'text-rose-600' : 'text-slate-600')}>{relDays(a.days)}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Channels + cadence summary */}
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold">Renewal: {recurrenceLabel(cfg.recurrence)}</span>
                {cfg.channels.email && <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"><Bell size={11} className="text-slate-400" /> Email</span>}
                {cfg.channels.inApp && <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1"><Bell size={11} className="text-slate-400" /> In-App</span>}
                {cfg.assignee && <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">Assigned · {cfg.assignee.name}</span>}
            </div>
        </div>
    );
}

interface DocRow { key: string; instanceName?: string; instanceId?: string; version: DocVersion; isCurrent: boolean; }
function buildDocRows(record: SafetyRecord, entry: RecordDataEntry): DocRow[] {
    const rows: DocRow[] = [];
    if (record.multiInstance) {
        for (const inst of instancesOf(entry))
            inst.versions.forEach((v, i) => rows.push({ key: `${inst.id}-${v.id}`, instanceName: inst.name, instanceId: inst.id, version: v, isCurrent: i === 0 }));
    } else {
        entry.versions.forEach((v, i) => rows.push({ key: v.id, version: v, isCurrent: i === 0 }));
    }
    return rows;
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 px-5 py-3">
            <span className="text-[13px] font-semibold text-slate-500 shrink-0">{label}</span>
            <span className="text-[13px] text-slate-800 text-right min-w-0 break-words">{children}</span>
        </div>
    );
}

// ── Version lifecycle state (user-controllable: Current / Historical / Superseded / Cancelled / Expired / Pending) ──
type DocState = 'current' | 'historical' | 'superseded' | 'cancelled' | 'expired' | 'pending';
const DOC_STATE_META: Record<DocState, { label: string; tone: string; dot: string }> = {
    current: { label: 'Current', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    historical: { label: 'Historical', tone: 'border-slate-200 bg-slate-50 text-slate-500', dot: 'bg-slate-400' },
    superseded: { label: 'Superseded', tone: 'border-slate-200 bg-slate-50 text-slate-500', dot: 'bg-slate-400' },
    cancelled: { label: 'Cancelled', tone: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
    expired: { label: 'Expired', tone: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    pending: { label: 'Pending', tone: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};
const DOC_STATE_ORDER: DocState[] = ['current', 'historical', 'superseded', 'cancelled', 'expired', 'pending'];
/** Effective state for a version — the explicit `state` if set, else derived from position (index 0 → current). */
function effectiveState(v: DocVersion, isCurrent: boolean): DocState {
    return (v.state && DOC_STATE_META[v.state as DocState] ? v.state : (isCurrent ? 'current' : 'historical')) as DocState;
}
/** State pill for a document row — reflects the version's controllable lifecycle state. */
function StateBadge({ state, multi }: { state: DocState; multi: boolean }) {
    const meta = DOC_STATE_META[state] ?? DOC_STATE_META.historical;
    const label = state === 'current' && multi ? 'Active' : meta.label;
    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', meta.tone)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} /> {label}
        </span>
    );
}
/** "Uploaded by" cell — avatar + name + timestamp (falls back to just the date when the uploader is unknown). */
function UploaderCell({ name, at }: { name?: string; at: string }) {
    if (!name) return <td className="px-4 py-3 text-[12px] text-slate-400 whitespace-nowrap">{fmtDateTime(at)}</td>;
    return (
        <td className="px-4 py-3 whitespace-nowrap">
            <div className="flex items-center gap-2">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white', avatarGradient(name))}>{avatarInitials(name)}</span>
                <div className="leading-tight">
                    <div className="text-[12px] font-medium text-slate-700">{name}</div>
                    <div className="text-[11px] text-slate-400">{fmtDateTime(at)}</div>
                </div>
            </div>
        </td>
    );
}

// ── Detail document-table controls (search / filter / sort / column-select / pagination) ──
type DocColId = 'state' | 'issue' | 'expiry' | 'status' | 'tags' | 'document' | 'uploaded';
type DocSortCol = 'number' | 'policy' | 'version' | 'state' | 'issue' | 'expiry' | 'status' | 'uploaded';
const DOC_COLS_ALL: DocColId[] = ['state', 'issue', 'expiry', 'status', 'tags', 'document', 'uploaded'];
// Core columns that are always shown — cannot be toggled off (locked in the Columns menu).
const DOC_LOCKED_COLS: DocColId[] = ['state', 'document'];
const DOC_COL_LABEL: Record<DocColId, string> = {
    state: 'State', issue: 'Issue date', expiry: 'Expiry date', status: 'Status', tags: 'Tags', document: 'Document', uploaded: 'Uploaded by',
};
const DOC_TH_CLS = 'px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
function docSortValue(col: DocSortCol, row: DocRow): string {
    const v = row.version;
    switch (col) {
        case 'number': return (v.numberValue || '').toLowerCase();
        case 'policy': return (row.instanceName || '').toLowerCase();
        case 'version': return (v.label || '').toLowerCase();
        case 'state': return String(DOC_STATE_ORDER.indexOf(effectiveState(v, row.isCurrent))).padStart(2, '0');
        case 'issue': return v.issueDate || '';
        case 'expiry': return v.expiryDate || '';
        case 'status': return (v.status || '').toLowerCase();
        case 'uploaded': return `${v.uploadedBy || ''} ${v.uploadedAt || ''}`.toLowerCase();
        default: return '';
    }
}
function docSearchBlob(row: DocRow): string {
    const v = row.version;
    return [v.numberValue, v.label, row.instanceName, v.status, DOC_STATE_META[effectiveState(v, row.isCurrent)].label, v.issueDate, v.expiryDate, v.uploadedBy, v.tags.join(' '), v.files.map(f => f.name).join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
}
/** Sortable header cell for the detail document table. */
function DocTh({ col, label, sortable, sort, onSort, className }: {
    col?: DocSortCol; label: string; sortable?: boolean;
    sort: { col: DocSortCol; dir: 'asc' | 'desc' } | null; onSort: (c: DocSortCol) => void; className?: string;
}) {
    if (!sortable || !col) return <th className={cn(DOC_TH_CLS, className)}>{label}</th>;
    const active = sort?.col === col;
    const Icon = active ? (sort!.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
    return (
        <th className={cn(DOC_TH_CLS, className)}>
            <button type="button" onClick={() => onSort(col)} className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}>
                {label} <Icon size={12} className={active ? '' : 'text-slate-300'} />
            </button>
        </th>
    );
}
/** Column-visibility dropdown for the detail document table (lists only the columns that apply to this record). */
function DocColumnsDropdown({ cols, visible, onToggle }: { cols: DocColId[]; visible: Set<DocColId>; onToggle: (id: DocColId) => void }) {
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
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
                        {cols.map(id => {
                            const locked = DOC_LOCKED_COLS.includes(id);
                            return (
                                <label key={id} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] text-slate-700', locked ? 'cursor-default opacity-80' : 'hover:bg-slate-50 cursor-pointer')}>
                                    <input type="checkbox" checked={locked || visible.has(id)} disabled={locked} onChange={() => !locked && onToggle(id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 disabled:opacity-100" />
                                    <span className="flex-1">{DOC_COL_LABEL[id]}</span>
                                    {locked && <Lock size={11} className="text-slate-400" />}
                                </label>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

/**
 * Shared documents/versions TABLE for one record — search / tag filter / sort / column-select /
 * pagination + a "Show history" toggle, an **Add** button that opens the record form (popup), and
 * per-row **Edit** / **Remove**. Handles multi-instance INSURANCE (one row per policy × version).
 * Rendered in TWO places: the record detail page's Documents tab, and INLINE inside the list's
 * expandable row. Reads `entry` live from the store, so Load-sample / Fill-demo data reflect here.
 */
function DocumentsTable({ record, entry, subjectId, setEntry, compact = false, subjectLabel }: {
    record: SafetyRecord; entry: RecordDataEntry; subjectId: string; setEntry: EntrySetter;
    compact?: boolean; subjectLabel?: string;
}) {
    const [includeHistory, setIncludeHistory] = useState(false);
    const [editing, setEditing] = useState<{ version: DocVersion; mode: 'add' | 'edit'; instanceId?: string; newPolicy?: boolean } | null>(null);
    const [docSearch, setDocSearch] = useState('');
    const [tagFilter, setTagFilter] = useState('all');
    const [docSort, setDocSort] = useState<{ col: DocSortCol; dir: 'asc' | 'desc' } | null>(null);
    const [visibleDocCols, setVisibleDocCols] = useState<Set<DocColId>>(() => new Set(DOC_COLS_ALL));
    const [docPageSize, setDocPageSize] = useState(25);
    const [docPage, setDocPage] = useState(1);
    const [pendingDelete, setPendingDelete] = useState<DocRow | null>(null); // → ConfirmDialog "are you sure?"
    const toggleDocSort = (col: DocSortCol) => setDocSort(prev => (prev && prev.col === col ? (prev.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));
    const toggleDocCol = (id: DocColId) => { if (DOC_LOCKED_COLS.includes(id)) return; setVisibleDocCols(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    useEffect(() => { setDocPage(1); }, [docSearch, tagFilter, docSort, docPageSize, includeHistory]);
    // Remove one version (or, for multi-instance, one policy's version — dropping the policy if it empties). Confirmed via ConfirmDialog.
    const doRemove = (row: DocRow) => {
        if (row.instanceId) {
            const instances = (entry.instances ?? [])
                .map(inst => (inst.id === row.instanceId ? { ...inst, versions: inst.versions.filter(v => v.id !== row.version.id) } : inst))
                .filter(inst => inst.versions.length > 0);
            setEntry(subjectId, record.id, { ...entry, instances });
        } else {
            setEntry(subjectId, record.id, { ...entry, versions: entry.versions.filter(v => v.id !== row.version.id) });
        }
        setPendingDelete(null);
        emitToast(`${row.version.label} removed`, 'success');
    };
    // Scoped single-version add / edit (opens VersionEditModal — "each row edit only shows that data").
    const freshVersion = () => ({ ...newVersion(`Version ${new Date().getFullYear()}`), monitoring: seedMonitoring(record), uploadedBy: currentUserName() });
    const startEdit = (row: DocRow) => setEditing({ version: row.version, mode: 'edit', instanceId: row.instanceId });
    const startAdd = () => setEditing({ version: freshVersion(), mode: 'add' });
    const startAddPolicy = () => setEditing({ version: freshVersion(), mode: 'add', newPolicy: true });
    const startAddToPolicy = (instanceId: string) => setEditing({ version: freshVersion(), mode: 'add', instanceId });
    const saveVersion = (saved: DocVersion, policyName?: string) => {
        if (!editing) return;
        if (editing.newPolicy) {
            // New insurance policy → a fresh instance holding this version as its current.
            const inst = { ...newInstance((policyName || '').trim() || `Policy ${(entry.instances?.length ?? 0) + 1}`), versions: [saved] };
            setEntry(subjectId, record.id, { ...entry, versions: [], instances: [...(entry.instances ?? []), inst] });
        } else if (editing.instanceId) {
            // Add-to-policy prepends as that policy's new current; edit replaces in place.
            const instances = (entry.instances ?? []).map(inst => (inst.id === editing.instanceId
                ? { ...inst, versions: editing.mode === 'add' ? [saved, ...inst.versions] : inst.versions.map(x => (x.id === saved.id ? saved : x)) }
                : inst));
            setEntry(subjectId, record.id, { ...entry, instances });
        } else if (editing.mode === 'add') {
            setEntry(subjectId, record.id, { ...entry, versions: [saved, ...entry.versions] });
        } else {
            setEntry(subjectId, record.id, { ...entry, versions: entry.versions.map(x => (x.id === saved.id ? saved : x)) });
        }
        emitToast(editing.newPolicy ? `${(record.instanceNoun || 'Policy')} added` : editing.mode === 'add' ? 'Version added' : 'Changes saved');
        setEditing(null);
    };

    const isMulti = !!record.multiInstance;
    const dated = isDateMonitored(record);
    const noun = record.instanceNoun || 'document';
    const showNumber = !!record.numberName;
    const showIssue = !!record.tracksIssueDate;
    const showDate = dated;
    const showStatus = !dated;
    const showCol = (id: DocColId) => DOC_LOCKED_COLS.includes(id) || visibleDocCols.has(id);
    const applicableDocCols = DOC_COLS_ALL.filter(id =>
        id === 'issue' ? showIssue : id === 'expiry' ? showDate : id === 'status' ? showStatus : true);

    const allRows = buildDocRows(record, entry);
    // "History" = older/previous versions (position-based, newest = current). Independent of the controllable State field.
    const isCurrentRow = (r: DocRow) => r.isCurrent;
    const historyCount = allRows.filter(r => !isCurrentRow(r)).length;
    const tagOptions = Array.from(new Set(allRows.flatMap(r => r.version.tags))).sort();
    const baseRows = includeHistory ? allRows : allRows.filter(isCurrentRow);
    const q = docSearch.trim().toLowerCase();
    const filteredRows = baseRows.filter(r => {
        if (tagFilter !== 'all' && !r.version.tags.some(t => t.toLowerCase() === tagFilter.toLowerCase())) return false;
        if (q && !docSearchBlob(r).includes(q)) return false;
        return true;
    });
    const sortedRows = docSort
        ? [...filteredRows].sort((a, b) => docSortValue(docSort.col, a).localeCompare(docSortValue(docSort.col, b), undefined, { numeric: true, sensitivity: 'base' }) * (docSort.dir === 'desc' ? -1 : 1))
        : filteredRows;
    const totalDocs = sortedRows.length;
    const docTotalPages = Math.max(1, Math.ceil(totalDocs / docPageSize));
    const docSafePage = Math.min(docPage, docTotalPages);
    const docStart = (docSafePage - 1) * docPageSize;
    const pageRows = compact ? sortedRows : sortedRows.slice(docStart, docStart + docPageSize);

    return (
        <>
            {/* Header — title + Show-history toggle + Add (opens the record form popup) */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 flex-wrap">
                <h3 className="text-[13px] font-bold text-slate-700">{isMulti ? 'Active filings' : 'Documents & versions'}</h3>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Persistent "Show history" toggle — reveals older/historical versions; disabled when there are none yet. */}
                    <button type="button" disabled={historyCount === 0} onClick={() => setIncludeHistory(v => !v)}
                        title={historyCount === 0 ? 'No older versions yet' : includeHistory ? 'Hide historical versions' : 'Show historical (old) versions'}
                        className={cn('inline-flex items-center gap-2 text-[12px] font-semibold', historyCount === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-800')}>
                        <span className={cn('relative h-5 w-9 rounded-full transition-colors', includeHistory && historyCount > 0 ? 'bg-blue-600' : 'bg-slate-300')}>
                            <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', includeHistory && historyCount > 0 ? 'left-[18px]' : 'left-0.5')} />
                        </span>
                        Show history
                        <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-slate-100', historyCount === 0 ? 'text-slate-400' : 'text-slate-500')}>{historyCount}</span>
                    </button>
                    <button type="button" onClick={() => setEntry(subjectId, record.id, buildDetailSample(record))} title="Populate this record with sample data (multiple documents)"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-200 bg-violet-50 text-[12px] font-semibold text-violet-700 hover:bg-violet-100">
                        <Sparkles size={14} /> Sample data
                    </button>
                    <button type="button" onClick={isMulti ? startAddPolicy : startAdd} title={isMulti ? `Add a ${noun}` : 'Add a new version'}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700">
                        <Plus size={14} /> Add {isMulti ? noun : 'version'}
                    </button>
                </div>
            </div>
            {allRows.length === 0 ? (
                <div className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><FileText size={20} /></div>
                    <p className="text-sm font-semibold text-slate-700">No documents captured yet</p>
                    <p className="mt-1 text-[13px] text-slate-500">Use <span className="font-semibold text-slate-700">Add</span> to upload a document or record a number / date.</p>
                    <button type="button" onClick={isMulti ? startAddPolicy : startAdd} className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><UploadCloud size={15} /> Add {isMulti ? noun : 'version'}</button>
                </div>
            ) : (
                <>
                    {/* Toolbar — search + tag filter + column selector (hidden in compact/inline mode) */}
                    {!compact && (
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 flex-wrap">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search versions, numbers, tags, files…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                        {tagOptions.length > 0 && (
                            <>
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>
                                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} title="Filter by tag"
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                    <option value="all">All tags</option>
                                    {tagOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </>
                        )}
                        <div className="hidden md:block"><DocColumnsDropdown cols={applicableDocCols} visible={visibleDocCols} onToggle={toggleDocCol} /></div>
                    </div>
                    )}
                    {pageRows.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-500">No documents match your search / filters.</div>
                    ) : (
                        <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[1160px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr>
                                        {showNumber && <DocTh col="number" label={record.numberName} sortable sort={docSort} onSort={toggleDocSort} className="pl-5" />}
                                        {isMulti && <DocTh col="policy" label={noun.charAt(0).toUpperCase() + noun.slice(1)} sortable sort={docSort} onSort={toggleDocSort} className={cn(!showNumber && 'pl-5')} />}
                                        <DocTh col="version" label="Version" sortable sort={docSort} onSort={toggleDocSort} className={cn(!showNumber && !isMulti && 'pl-5')} />
                                        {showCol('state') && <DocTh col="state" label="State" sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showIssue && showCol('issue') && <DocTh col="issue" label="Issue date" sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showDate && showCol('expiry') && <DocTh col="expiry" label="Expiry date" sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showStatus && showCol('status') && <DocTh col="status" label="Status" sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showCol('tags') && <DocTh label="Tags" sort={docSort} onSort={toggleDocSort} />}
                                        {showCol('document') && <DocTh label="Document" sort={docSort} onSort={toggleDocSort} />}
                                        {showCol('uploaded') && <DocTh col="uploaded" label="Uploaded by" sortable sort={docSort} onSort={toggleDocSort} />}
                                        <th className={cn(DOC_TH_CLS, 'pr-5 text-right')}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(row => {
                                        const v = row.version;
                                        const st = effectiveState(v, row.isCurrent);
                                        return (
                                            <tr key={row.key} className={cn('border-b border-slate-100 align-top', st === 'current' ? 'bg-emerald-50/40' : 'hover:bg-slate-50/50')}>
                                                {showNumber && <td className={cn('px-4 py-3 whitespace-nowrap text-[13px] font-semibold text-slate-800', 'pl-5')}>{v.numberValue || <span className="font-normal text-slate-400">—</span>}</td>}
                                                {isMulti && <td className={cn('px-4 py-3 whitespace-nowrap text-[13px] font-semibold text-slate-800', !showNumber && 'pl-5')}>{row.instanceName || '—'}</td>}
                                                <td className={cn('px-4 py-3 whitespace-nowrap', !showNumber && !isMulti && 'pl-5')}>
                                                    <span className="text-[13px] font-medium text-slate-700">{v.label}</span>
                                                </td>
                                                {showCol('state') && <td className="px-4 py-3 whitespace-nowrap"><StateBadge state={st} multi={isMulti} /></td>}
                                                {showIssue && showCol('issue') && <td className="px-4 py-3 text-[13px] text-slate-700 whitespace-nowrap">{v.issueDate || <span className="text-slate-400">—</span>}</td>}
                                                {showDate && showCol('expiry') && <td className="px-4 py-3 text-[13px] text-slate-700 whitespace-nowrap">{v.expiryDate || <span className="text-slate-400">—</span>}</td>}
                                                {showStatus && showCol('status') && <td className="px-4 py-3 whitespace-nowrap">{v.status ? <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{v.status}</span> : <span className="text-[13px] text-slate-400">—</span>}</td>}
                                                {showCol('tags') && (
                                                    <td className="px-4 py-3">
                                                        {v.tags.length ? (
                                                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                                {v.tags.map(t => <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', tagColor(t))}><Tag size={9} /> {t}</span>)}
                                                            </div>
                                                        ) : <span className="text-[13px] text-slate-400">—</span>}
                                                    </td>
                                                )}
                                                {showCol('document') && (
                                                    <td className="px-4 py-3">
                                                        <div className="max-w-[260px]"><DocFilesCell files={v.files} /></div>
                                                    </td>
                                                )}
                                                {showCol('uploaded') && <UploaderCell name={v.uploadedBy} at={v.uploadedAt} />}
                                                <td className="px-4 py-3 pr-5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {isMulti && row.isCurrent && row.instanceId && (
                                                            <button type="button" onClick={() => startAddToPolicy(row.instanceId!)} title="Add a version to this policy"
                                                                className="inline-flex h-8 items-center gap-1 px-2 rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"><Plus size={13} /> Version</button>
                                                        )}
                                                        <button type="button" onClick={() => startEdit(row)} title="Edit this version"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"><Pencil size={14} /></button>
                                                        <button type="button" onClick={() => setPendingDelete(row)} title="Remove this version"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile card list — the table becomes stacked cards on small screens */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {pageRows.map(row => {
                                const v = row.version;
                                const st = effectiveState(v, row.isCurrent);
                                return (
                                    <div key={row.key} className={cn('p-4 space-y-3', st === 'current' ? 'bg-emerald-50/40' : '')}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[14px] font-semibold text-slate-800">{v.label}</span>
                                                    <StateBadge state={st} multi={isMulti} />
                                                </div>
                                                {isMulti && row.instanceName && <div className="mt-0.5 text-[12px] font-medium text-slate-500">{row.instanceName}</div>}
                                                {showNumber && <div className="mt-0.5 text-[12px] text-slate-500">{record.numberName}: <span className="font-semibold text-slate-700">{v.numberValue || '—'}</span></div>}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isMulti && row.isCurrent && row.instanceId && (
                                                    <button type="button" onClick={() => startAddToPolicy(row.instanceId!)} title="Add a version to this policy"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Plus size={15} /></button>
                                                )}
                                                <button type="button" onClick={() => startEdit(row)} title="Edit this version"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"><Pencil size={14} /></button>
                                                <button type="button" onClick={() => setPendingDelete(row)} title="Remove this version"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {showIssue && <MobileFact label="Issue date" value={v.issueDate} />}
                                            {showDate && <MobileFact label="Expiry date" value={v.expiryDate} />}
                                            {showStatus && <MobileFact label="Status" value={v.status} />}
                                            <MobileFact label="Uploaded by" value={v.uploadedBy} />
                                        </div>
                                        {v.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {v.tags.map(t => <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', tagColor(t))}><Tag size={9} /> {t}</span>)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Document</div>
                                            <DocFilesCell files={v.files} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        </>
                    )}
                    {/* Pagination footer — rows per page + range + pager (hidden in compact/inline mode) */}
                    {!compact && (
                    <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap">
                        <div className="flex items-center gap-3 text-[12px] text-slate-500">
                            <label className="flex items-center gap-1.5">
                                Rows per page
                                <select value={docPageSize} onChange={e => setDocPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                            <span className="tabular-nums">{totalDocs === 0 ? '0' : `${docStart + 1}–${Math.min(docStart + docPageSize, totalDocs)}`} of {totalDocs}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" disabled={docSafePage <= 1} onClick={() => setDocPage(docSafePage - 1)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                <ChevronLeft size={14} /> Prev
                            </button>
                            <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {docSafePage} of {docTotalPages}</span>
                            <button type="button" disabled={docSafePage >= docTotalPages} onClick={() => setDocPage(docSafePage + 1)}
                                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                    )}
                </>
            )}
            {editing && (
                <VersionEditModal
                    record={record}
                    subjectLabel={subjectLabel}
                    version={editing.version}
                    mode={editing.mode}
                    askPolicyName={!!editing.newPolicy}
                    policyOptions={Array.from(new Set([...instancesOf(entry).map(i => i.name), ...(record.multiInstance ? INSURANCE_POLICY_SUGGESTIONS : [])]))}
                    onSave={saveVersion}
                    onClose={() => setEditing(null)}
                />
            )}
            {pendingDelete && (
                <ConfirmDialog
                    danger
                    title={`Remove ${pendingDelete.version.label}?`}
                    message={`${pendingDelete.instanceName ? `From ${pendingDelete.instanceName}. ` : ''}This document version will be permanently removed. This can't be undone.`}
                    confirmLabel="Remove"
                    onConfirm={() => doRemove(pendingDelete)}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
        </>
    );
}

type DetailTab = 'documents' | 'monitoring';
function RecordDetailPage({ record, entry, entity, subjectLabel, subjectId, setEntry, onBack }: {
    record: SafetyRecord; entry: RecordDataEntry; entity: EntityId; subjectLabel: string;
    subjectId: string; setEntry: EntrySetter;
    onBack: () => void;
}) {
    const [tab, setTab] = useState<DetailTab>('documents');
    const status = entryStatus(record, entry);
    const isMulti = !!record.multiInstance;
    const cur = isMulti ? (instancesOf(entry)[0]?.versions[0] ?? null) : currentVersion(entry);
    const dated = isDateMonitored(record);
    const cfg = cur?.monitoring;
    const monitoringOn = isMulti ? instancesOf(entry).some(i => !!i.versions[0]?.monitoring?.enabled) : !!cfg?.enabled;
    const monitoredDate = cur && cfg ? monitoredDateFor(cfg, cur) : '';
    const EntityIcon = ENTITY_ICON[entity];
    const noun = record.instanceNoun || 'document';
    const showNumber = !!record.numberName;
    const docCount = buildDocRows(record, entry).length;

    return (
        <div className="space-y-4">
            {/* Back link */}
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[13px] font-semibold text-slate-500 hover:text-blue-600">
                <ChevronLeft size={15} /> Back to list
            </button>
            {/* Header card + info block (app theme) */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-4 p-5 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <FileText size={22} />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-xl font-bold leading-tight text-slate-900">{record.recordName}</h2>
                            {record.description && <p className="mt-0.5 text-[13px] text-slate-500">{record.description}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', RECORD_TYPE_TONE[record.type])}>{RECORD_TYPE_LABEL[record.type]}</span>
                        <StatusPill status={status} />
                    </div>
                </div>
                <div className="border-t border-slate-100 divide-y divide-slate-100 sm:grid sm:grid-cols-2 sm:divide-y-0 sm:[&>*]:border-b sm:[&>*]:border-slate-100 sm:[&>*:nth-child(odd)]:border-r">
                    <InfoRow label="Subject"><span className="inline-flex items-center gap-1.5"><EntityIcon size={13} className="text-slate-400" /> {subjectLabel} <span className="text-slate-400">· {entity}</span></span></InfoRow>
                    <InfoRow label="Category">{CATEGORY_SHORT[record.category] ?? record.category}</InfoRow>
                    {showNumber && <InfoRow label={record.numberName}>{cur?.numberValue ? <span className="font-semibold">{cur.numberValue}</span> : <span className="text-slate-400">—</span>}</InfoRow>}
                    <InfoRow label={record.monitorType || (dated ? 'Monitored date' : 'Status')}>
                        {dated ? (monitoredDate ? <span className="font-semibold">{monitoredDate}</span> : <span className="text-slate-400">—</span>) : (cur?.status || <span className="text-slate-400">—</span>)}
                    </InfoRow>
                    <InfoRow label="Monitoring">
                        {monitoringOn && cfg
                            ? <span className="inline-flex items-center gap-1 font-semibold text-blue-600"><Bell size={12} /> On · {MONITOR_BASIS_LABEL[cfg.basis]}{cfg.assignee ? ` · ${cfg.assignee.name}` : ''}</span>
                            : <span className="text-slate-400">Off</span>}
                    </InfoRow>
                    <InfoRow label="Jurisdiction">{record.jurisdiction || <span className="text-slate-400">—</span>}</InfoRow>
                </div>
            </div>

            {/* Tabs + content */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-1 border-b border-slate-100 px-4 pt-3">
                    {([['documents', isMulti ? `${noun.charAt(0).toUpperCase() + noun.slice(1)} filings` : 'Documents'], ['monitoring', 'Monitoring']] as [DetailTab, string][]).map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setTab(id)}
                            className={cn('inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                                tab === id ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent')}>
                            {label}
                            {id === 'documents' && <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">{docCount}</span>}
                        </button>
                    ))}
                </div>

                {tab === 'documents' ? (
                    <DocumentsTable record={record} entry={entry} subjectId={subjectId} setEntry={setEntry} subjectLabel={subjectLabel} />
                ) : (
                    <MonitoringCalendarTab record={record} cfg={cfg ?? undefined} monitoredDate={monitoredDate} monitoringOn={monitoringOn} />
                )}
            </div>
        </div>
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

/** Deterministic demo fill for a SINGLE version (mirrors Load-sample / ManageModal's fillV). */
function fillVersionDemo(record: SafetyRecord, v: DocVersion): DocVersion {
    const country = record.allCountries ? 'United States' : 'Canada';
    const stateProv = record.hideState ? '' : (STATES_BY_COUNTRY[country]?.[0] ?? '');
    const merged: DocVersion = {
        ...v,
        numberValue: record.numberName ? sampleNumber(record) : v.numberValue,
        country, stateProv,
        issueDate: record.tracksIssueDate ? '2024-01-15' : v.issueDate,
        expiryDate: isDateMonitored(record) ? (record.configuredDate ?? '2026-12-31') : v.expiryDate,
        status: !isDateMonitored(record) ? (v.status || 'Active') : v.status,
        tags: v.tags.length ? v.tags : ['Verified', 'Primary'],
        monitoring: { ...v.monitoring, enabled: true },
    };
    if (record.type !== 'C' && record.docRequirement !== 'none' && merged.files.length === 0) merged.files = sampleDocFiles(record);
    return merged;
}

/** Compact monitoring on/off toggle + reminders/channels for one version (used inside the version form). */
function MonitoringToggle({ record, monitoring, issueDate, expiryDate, status, onChange }: {
    record: SafetyRecord; monitoring: MonitoringConfig; issueDate: string; expiryDate: string; status: string; onChange: (cfg: MonitoringConfig) => void;
}) {
    const cfg = monitoring;
    const [open, setOpen] = useState(true);
    const dated = isDateMonitored(record);
    const monitored = monitoredDateFor(cfg, { issueDate, expiryDate });
    const toggleReminder = (d: number) => onChange({ ...cfg, reminders: cfg.reminders.includes(d) ? cfg.reminders.filter(x => x !== d) : [...cfg.reminders, d] });
    const toggleChannel = (k: 'email' | 'inApp') => onChange({ ...cfg, channels: { ...cfg.channels, [k]: !cfg.channels[k] } });
    // Switching basis: seed the custom date from the current monitored date so it's never blank.
    const pickBasis = (b: MonitorBasis) => onChange({ ...cfg, basis: b, customDate: b === 'custom' && !cfg.customDate ? (expiryDate || issueDate || '') : cfg.customDate });
    const basisOptions: { id: MonitorBasis; label: string }[] = [
        ...(record.tracksIssueDate ? [{ id: 'issue' as MonitorBasis, label: 'Issue date' }] : []),
        { id: 'expiry', label: 'Expiry date' },
        { id: 'custom', label: 'Custom date' },
    ];
    const selCls = 'w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
    // Projected schedule summary line.
    const remDays = [...cfg.reminders].sort((a, b) => b - a);
    const dayParts = remDays.filter(d => d > 0);
    const onTheDate = remDays.includes(0);
    const reminderText = dayParts.length
        ? `Reminders ${dayParts.join(', ')} days before` + (onTheDate ? ' + on the date' : '')
        : (onTheDate ? 'Reminder on the date' : 'No reminders set');
    const channelText = [cfg.channels.email && 'Email', cfg.channels.inApp && 'In-App'].filter(Boolean).join(', ') || 'no channels';
    const scheduleText = dated
        ? `Monitor ${MONITOR_BASIS_LABEL[cfg.basis].toLowerCase()}${monitored ? ` (${monitored})` : ''}. ${reminderText} · repeats ${recurrenceLabel(cfg.recurrence)} · via ${channelText}.`
        : `Notify whenever the status${status ? ` (${status})` : ''} changes · via ${channelText}.`;

    return (
        <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between border-l-2 border-blue-500 bg-slate-50/70 px-3 py-2">
                <button type="button" onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                    <Bell size={13} className="text-blue-500" /> Monitoring &amp; Notifications
                    {cfg.enabled && (open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">{cfg.enabled ? 'Enabled' : 'Off'}</span>
                    <button type="button" onClick={() => onChange({ ...cfg, enabled: !cfg.enabled })} aria-pressed={cfg.enabled}
                        className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0', cfg.enabled ? 'bg-blue-600' : 'bg-slate-300')}>
                        <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', cfg.enabled ? 'left-[18px]' : 'left-0.5')} />
                    </button>
                </div>
            </div>
            {cfg.enabled && open && (
                <div className="p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                        {/* LEFT — what/when to monitor */}
                        <div className="space-y-3">
                            {dated ? (
                                <>
                                    <div>
                                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitor based on</div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {basisOptions.map(o => (
                                                <label key={o.id} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                                    <input type="radio" name={`mon-basis-${record.id}`} checked={cfg.basis === o.id} onChange={() => pickBasis(o.id)} className="border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                    {o.label}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Date to monitor</div>
                                        {cfg.basis === 'custom' ? (
                                            <input type="date" value={cfg.customDate} onChange={e => onChange({ ...cfg, customDate: e.target.value })} className={selCls} />
                                        ) : (
                                            <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[13px] font-semibold text-emerald-700"><CalendarClock size={14} /> {monitored || '—'}</div>
                                        )}
                                        {cfg.basis !== 'custom' && (
                                            <p className="mt-1 text-[10px] text-slate-400">Pulled from the {MONITOR_BASIS_LABEL[cfg.basis].toLowerCase()} above — pick “Custom date” to enter your own.</p>
                                        )}
                                    </div>
                                    <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Renewal recurrence</div>
                                        <select value={cfg.recurrence} onChange={e => onChange({ ...cfg, recurrence: e.target.value })} className={selCls}>
                                            {RECURRENCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Monitor based on</div>
                                    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                                        <ShieldCheck size={14} className="text-slate-400" /> Status changes{status ? ` · currently ${status}` : ''}
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">This record has no expiry — you’re notified whenever its status changes.</p>
                                </div>
                            )}
                        </div>
                        {/* RIGHT — reminders + channels */}
                        <div className="space-y-3">
                            {dated && (
                                <div>
                                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification reminders</div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {REMINDER_DAYS.map(d => (
                                            <label key={d} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={cfg.reminders.includes(d)} onChange={() => toggleReminder(d)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                {reminderLabel(d)}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Notification channels</div>
                                <div className="flex items-center gap-4">
                                    {(['email', 'inApp'] as const).map(k => (
                                        <label key={k} className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer">
                                            <input type="checkbox" checked={cfg.channels[k]} onChange={() => toggleChannel(k)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                            {k === 'email' ? 'Email' : 'In-App'}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Projected schedule summary */}
                    <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5">
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700"><Bell size={12} /> Projected Notification Schedule</div>
                        <p className="mt-1 text-[11px] leading-relaxed text-blue-700/90">{scheduleText}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Version fields (Details / Document / Monitoring / Tags / Notes) for ONE version — shared by VersionSet + VersionEditModal ──
function VersionFields({ record, version, onChange, tagCatalog, addToCatalog }: {
    record: SafetyRecord; version: DocVersion; onChange: (next: DocVersion) => void;
    tagCatalog: string[]; addToCatalog: (t: string) => void;
}) {
    const v = version;
    const hasDoc = record.type !== 'C' && record.docRequirement !== 'none';
    const slots = record.slotLabels ?? [];
    const countries = record.allCountries ? ALL_COUNTRIES : COUNTRIES;
    const numberRequired = record.type === 'C' || record.type === 'DC';
    const inputCls = 'w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
    const states = STATES_BY_COUNTRY[v.country] ?? [];

    const patch = (p: Partial<DocVersion>) => onChange({ ...v, ...p });
    const setCountry = (val: string) => onChange({ ...v, country: val, stateProv: (STATES_BY_COUNTRY[val] ?? []).includes(v.stateProv) ? v.stateProv : '' });
    const addFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const docs: DataDocFile[] = await Promise.all(Array.from(list).map(async f => ({ name: f.name, size: f.size, url: await readAsDataUrl(f), uploadedAt: new Date().toISOString() })));
        onChange({ ...v, files: [...v.files, ...docs] });
    };
    const removeFile = (i: number) => onChange({ ...v, files: v.files.filter((_, idx) => idx !== i) });
    const setSlotFile = async (slot: string, file: File | undefined) => {
        if (!file) return;
        const doc: DataDocFile = { name: file.name, size: file.size, url: await readAsDataUrl(file), slot, uploadedAt: new Date().toISOString() };
        onChange({ ...v, files: [...v.files.filter(f => f.slot !== slot), doc] });
    };
    const removeSlotFile = (slot: string) => onChange({ ...v, files: v.files.filter(f => f.slot !== slot) });
    const addTag = (t: string) => { const val = t.trim(); if (!val) return; addToCatalog(val); if (!v.tags.some(x => x.toLowerCase() === val.toLowerCase())) onChange({ ...v, tags: [...v.tags, val] }); };
    const removeTag = (t: string) => onChange({ ...v, tags: v.tags.filter(x => x !== t) });

    return (
        <div className="space-y-3">
            {/* DETAILS */}
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {record.numberName && (
                    <Field label={record.numberName} required={numberRequired}>
                        <input value={v.numberValue} onChange={e => patch({ numberValue: e.target.value })} placeholder={`Enter ${record.numberName.toLowerCase()}`} className={inputCls} />
                    </Field>
                )}
                <Field label="Country">
                    <select value={v.country} onChange={e => setCountry(e.target.value)} className={inputCls}>
                        <option value="">Select country</option>
                        {countries.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </Field>
                {!record.hideState && (
                    <Field label="State / Province">
                        <select value={v.stateProv} disabled={states.length === 0} onChange={e => patch({ stateProv: e.target.value })} className={inputCls}>
                            <option value="">{states.length ? 'Select state / province' : '—'}</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                )}
                {record.tracksIssueDate && (
                    <Field label="Issue date" optional>
                        <input type="date" value={v.issueDate} onChange={e => patch({ issueDate: e.target.value })} className={inputCls} />
                    </Field>
                )}
                {isDateMonitored(record) && (
                    <Field label={record.monitorType} required>
                        <input type="date" value={v.expiryDate} onChange={e => patch({ expiryDate: e.target.value })} className={inputCls} />
                    </Field>
                )}
                {!isDateMonitored(record) && (
                    <Field label="Status" required>
                        <select value={v.status ?? ''} onChange={e => patch({ status: e.target.value })} className={inputCls}>
                            <option value="">Select status</option>
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                )}
                <Field label="State">
                    <select value={v.state ?? ''} onChange={e => patch({ state: e.target.value || undefined })} className={inputCls}>
                        <option value="">Automatic (Current / Historical by order)</option>
                        {DOC_STATE_ORDER.map(s => <option key={s} value={s}>{DOC_STATE_META[s].label}</option>)}
                    </select>
                </Field>
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
                                        {file ? <FileChip f={file} onRemove={() => removeSlotFile(slot)} /> : <UploadZone compact label={`Drag ${slot} here — or click`} onFiles={list => setSlotFile(slot, list?.[0])} />}
                                    </div>
                                );
                            })}
                        </div>
                    ) : v.files.length > 0 ? (
                        <div className="space-y-2">{v.files.map((f, i) => <FileChip key={i} f={f} onRemove={() => removeFile(i)} />)}</div>
                    ) : (
                        <UploadZone label="Drag a file here — or click — to upload the document" hint="Captures the document for this version; PDF, image or file" multiple onFiles={addFiles} />
                    )}
                </div>
            )}
            {/* MONITORING (compact toggle) */}
            <div className="border-t border-slate-200 pt-3">
                <MonitoringToggle record={record} monitoring={v.monitoring} issueDate={v.issueDate} expiryDate={v.expiryDate} status={v.status ?? ''}
                    onChange={m => patch({ monitoring: m })} />
            </div>
            {/* TAGS */}
            <div className="border-t border-slate-200 pt-3">
                <TagField tags={v.tags} catalog={tagCatalog} onAdd={addTag} onRemove={removeTag} />
            </div>
            {/* NOTES */}
            <div className="border-t border-slate-200 pt-3">
                <Field label="Notes">
                    <textarea value={v.notes} onChange={e => patch({ notes: e.target.value })} rows={2} placeholder="Optional notes…"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                </Field>
            </div>
        </div>
    );
}

/** Modal that adds or edits ONE version in isolation — "each row edit only shows that data". Compact (no monitoring). */
// Common insurance policy types offered as suggestions when naming a new policy.
const INSURANCE_POLICY_SUGGESTIONS = [
    'Liability', 'Cargo', 'Physical Damage', 'Umbrella',
    'General Liability', 'Non-Trucking Liability', 'Trailer Interchange', 'Workers Compensation',
];

/** Searchable single-select with create — pick an existing / suggested policy name, or type a new one. */
function PolicyNameCombo({ value, onChange, options, placeholder }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
    const [open, setOpen] = useState(false);
    const q = value.trim().toLowerCase();
    const filtered = options.filter(o => o.toLowerCase().includes(q));
    const exact = options.some(o => o.toLowerCase() === q);
    const showAdd = q.length > 0 && !exact;
    return (
        <div className="relative">
            <div className="relative">
                <input
                    value={value}
                    onChange={e => { onChange(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    placeholder={placeholder}
                    className="w-full h-9 pl-3 pr-9 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {open && (filtered.length > 0 || showAdd) && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                    {filtered.length > 0 && <div className="px-3 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Existing / suggested</div>}
                    {filtered.map(o => (
                        <button key={o} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onChange(o); setOpen(false); }}
                            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50', o.toLowerCase() === q ? 'font-semibold text-blue-700 bg-blue-50/40' : 'text-slate-700')}>
                            <FileText size={13} className="shrink-0 text-slate-400" /> <span className="truncate">{o}</span>
                        </button>
                    ))}
                    {showAdd && (
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setOpen(false)}
                            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50', filtered.length > 0 && 'border-t border-slate-100')}>
                            <Plus size={13} className="shrink-0" /> Add &ldquo;{value.trim()}&rdquo;
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function VersionEditModal({ record, subjectLabel, version, mode, noun, askPolicyName, policyOptions, onSave, onClose }: {
    record: SafetyRecord; subjectLabel?: string;
    version: DocVersion; mode: 'add' | 'edit'; noun?: string; askPolicyName?: boolean; policyOptions?: string[];
    onSave: (v: DocVersion, policyName?: string) => void; onClose: () => void;
}) {
    const [v, setV] = useState<DocVersion>(version);
    const [policyName, setPolicyName] = useState('');
    const { tags: tagCatalog, add: addToCatalog } = useSafetyTags();
    const EntityIcon = ENTITY_ICON[record.entity];
    const unit = askPolicyName ? (noun || 'policy') : (noun || 'version');
    const Unit = unit.charAt(0).toUpperCase() + unit.slice(1);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-bold text-slate-900">{mode === 'add' ? `Add ${unit}` : `Edit ${v.label}`}</h3>
                            <span className="text-[13px] text-slate-500">· {record.recordName}</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-600"><EntityIcon size={13} className="text-slate-400" /> {subjectLabel || record.entity} <span className="text-slate-400">· {record.entity}</span></span>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{v.label}</span>
                        <button type="button" onClick={() => { setV(cur => fillVersionDemo(record, cur)); ['Verified', 'Primary'].forEach(addToCatalog); }}
                            className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"><Sparkles size={13} /> Fill demo data</button>
                    </div>
                    {askPolicyName && (
                        <Field label={`${Unit} name`} required>
                            <PolicyNameCombo value={policyName} onChange={setPolicyName} options={policyOptions ?? []} placeholder={`${Unit} name — e.g. Liability — State Farm`} />
                        </Field>
                    )}
                    <VersionFields record={record} version={v} onChange={setV} tagCatalog={tagCatalog} addToCatalog={addToCatalog} />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><MapPin size={12} /> {record.jurisdiction}</div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSave(v, askPolicyName ? policyName : undefined)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><Check size={15} /> {mode === 'add' ? `Add ${unit}` : 'Save changes'}</button>
                </div>
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
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameDraft, setRenameDraft] = useState('');
    const [infoId, setInfoId] = useState<string | null>(null);

    const patchVersion = (id: string, patch: Partial<DocVersion>) =>
        onChange(versions.map(v => (v.id === id ? { ...v, ...patch } : v)));
    const addVersion = () =>
        onChange([{ ...newVersion(`Version ${versions.length + 1}`), monitoring: seedMonitoring(record), uploadedBy: currentUserName() }, ...versions]);
    const addVersionWithFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const docs: DataDocFile[] = await Promise.all(Array.from(list).map(async f => ({
            name: f.name, size: f.size, url: await readAsDataUrl(f), uploadedAt: new Date().toISOString(),
        })));
        onChange([{ ...newVersion(`Version ${versions.length + 1}`), monitoring: seedMonitoring(record), files: docs, uploadedBy: currentUserName() }, ...versions]);
    };
    const removeVersion = (id: string) => onChange(versions.filter(v => v.id !== id));

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

                    <VersionFields record={record} version={v}
                        onChange={nv => onChange(versions.map(x => (x.id === v.id ? nv : x)))}
                        tagCatalog={tagCatalog} addToCatalog={addToCatalog} />
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
