import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCondensingAnchor, useCondensingHeader, HEADER_TRANSITION } from '@/components/ui/use-condensing-header';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { type KpiChip } from '@/components/ui/KpiChipStrip';
import {
    ColumnPicker, FilterSelect, HistoryToggle, ListToolbar, SortTh, TablePager,
} from '@/components/ui/ListChrome';
import { type SortState } from '@/components/ui/list-chrome';
import { SubTabs } from '@/components/ui/SubTabs';
import {
    Building2, Truck, User, Layers, Search, Hash, FileText, MapPin, CalendarClock,
    UploadCloud, Eye, Trash2, X, Check, CircleAlert, CircleDashed, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown,
    ChevronLeft, Plus, Bell, Columns, Tag, Filter, Pencil, Info, Sparkles, ShieldCheck, CornerDownRight, Share2,
    ToggleLeft, ToggleRight, RotateCcw, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { UploadZone } from '@/components/ui/UploadZone';
import { ShareToChat } from '@/components/share/ShareToChat';
import { consumePendingRecord, setPendingRecord, setMessagesFocus, type RecordRef } from '@/pages/messages/messages-store';
import { useRecordEnablement } from '@/pages/compliance/record-enablement';
// The Monitoring & Notifications block lives on its own so the driver application can
// render the SAME control — what it captures becomes a record here.
import { MonitoringToggle } from '@/pages/compliance/MonitoringToggle';
import { McAuthorityFacts, McInsuranceTab, McProcessAgentTab } from '@/pages/compliance/McAuthorityPanel';
import { InsuranceBrokerFacts } from '@/pages/compliance/InsuranceBrokerPanel';
import { brokerIsEmpty, getInsuranceBroker, setInsuranceBroker, sampleBroker } from '@/pages/compliance/insurance-broker.data';
import {
    basisLabel, recurrenceLabel, reminderLabel, monitoredDateFor,
} from '@/pages/compliance/monitoring-schedule';
import {
    SAFETY_RECORDS, SAFETY_CATEGORY_ORDER, ENTITY_ORDER, isDateMonitored, RECORD_TYPE_LABEL, RECORD_TYPE_ORDER,
    defaultVersionLabel, MAX_RECORD_NAME, statusOptionsFor, recordFields, fieldPool, fieldValue,
    isAutoVersionLabel, statesForRecord, recordForFields, pruneRecordFields, type RecordFieldDef,
    CHECKED, fieldApplies,
    type SafetyRecord, type EntityId, type RecordTypeId,
    type SafetyCategory,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    prefilledNumberFor, useComplianceData, computeStats, entryStatus, currentVersion, newVersion, blankVersion, newInstance, instancesOf, emptyEntry,
    defaultMonitoring, fieldWritePatch, CARRIER_SUBJECT,
    type RecordDataEntry, type DocVersion, type DocInstance, type DataDocFile, type DataStatus, type MonitoringConfig,
} from '@/pages/compliance/compliance-data-store';
import { useCustomSafetyRecords } from '@/pages/compliance/safety-custom-records.data';
import { useSafetyTags, tagColor, smartTagMatch, MAX_DOC_TAGS } from '@/pages/compliance/safety-tags.data';
import { COUNTRIES, ALL_COUNTRIES, STATES_BY_COUNTRY } from '@/pages/compliance/jurisdiction.data';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { findUserById } from '@/data/users.data';

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

/** Compact document list for one version — a tight line per file, or a clear "missing" chip when none uploaded. Shared by the table + mobile cards.
 *  `showTag=false` hides the per-file tag (used in the table, where the tag has its own Tags column). Slot labels (Front/Back) always show. */
function DocFilesCell({ files, showTag = true }: { files: DataDocFile[]; showTag?: boolean }) {
    if (files.length === 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                <CircleAlert size={11} /> No document
            </span>
        );
    }
    return (
        <div className="flex flex-col gap-1">
            {files.map((f, i) => {
                const chip = f.slot || (showTag ? f.tag : undefined);
                return (
                    <div key={i} className="flex items-center gap-2">
                        <DocThumb f={f} size={22} />
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                            {chip && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{chip}</span>}
                            <span className="min-w-0 truncate text-[12px] font-medium text-slate-700" title={f.name}>{f.name}</span>
                        </div>
                        {f.url && (
                            <button type="button" onClick={() => openFile(f)} title={`View ${f.name}`}
                                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"><Eye size={12} /> View</button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
/** Tags cell — record (version) tags plus, optionally, this row's document tag (distinct slate chip). */
function DocTagsCell({ recordTags, docTag }: { recordTags: string[]; docTag?: string }) {
    if (!recordTags.length && !docTag) return <span className="text-[13px] text-slate-400">—</span>;
    return (
        <div className="flex flex-wrap gap-1 max-w-[220px]">
            {recordTags.map(t => <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', tagColor(t))}><Tag size={9} /> {t}</span>)}
            {docTag && <span className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold', tagColor(docTag))}><Tag size={9} /> {docTag}</span>}
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
// Status values for status-based records (the monitored value captured in the form).
const STATUS_OPTIONS = ['Active', 'Pending', 'On File', 'Complete', 'Incomplete', 'Expired', 'Inactive'];

/** Map the record's free-text `recurring` note onto a recurrence option. */
function recurrenceFromRecord(r: SafetyRecord): string {
    const s = (r.recurring || '').toLowerCase();
    if (/no (fixed|normal|scheduled|independent)|does not expire|usually static|static/.test(s)) return 'none';
    if (s.includes('month')) return 'monthly';
    if (s.includes('quarter')) return 'quarterly';
    if (s.includes('semi')) return 'semiannually';
    if (s.includes('bienn') || s.includes('every 2') || s.includes('2 year')) return 'biennially';
    // Before the catch-all `year`, which would otherwise swallow "Every 3 years" as annual.
    // Matched on "3 year" rather than "every 3" so a "3 month" cadence can never land here.
    if (s.includes('trienn') || s.includes('3 year')) return 'triennially';
    if (s.includes('annual') || s.includes('yearly') || s.includes('year')) return 'annually';
    return 'annually';
}
/** Build a monitoring config seeded from the record (recurrence), merging any stored value on top. */
/** True when the record captures a monitored STATUS value (no date to track, and not opted out). */
const capturesStatus = (r: SafetyRecord): boolean => !isDateMonitored(r) && !r.hideStatus;

export function seedMonitoring(record: SafetyRecord, existing?: MonitoringConfig): MonitoringConfig {
    const base = defaultMonitoring();
    base.recurrence = recurrenceFromRecord(record);
    // Status-only records default to status-based monitoring (no date reminders). A record on
    // a review cycle starts from its issue date, so the recurrence sets the next due date.
    base.basis = !isDateMonitored(record) ? 'status'
        : (record.defaultMonitorBasis === 'issue' && record.tracksIssueDate) ? 'issue'
        : 'expiry';
    if (base.basis === 'status') base.reminders = [];
    else if (record.defaultReminders) base.reminders = [...record.defaultReminders]; // per-record reminder default
    // A record that exists to be valid on a date arrives with its alert already armed. Every
    // path that creates a version seeds through here, so this is the only place it is decided.
    base.enabled = !!record.monitorByDefault;
    // A stored config always wins: monitoring the user switched OFF must stay off.
    return existing ? { ...base, ...existing } : base;
}

/** Default name for a NEW version, made unique against what the record already holds:
 *  "Drug Test Result", then "Drug Test Result (2)", … The first one keeps the plain name. */
function nextVersionLabel(record: SafetyRecord, entry: RecordDataEntry): string {
    const base = defaultVersionLabel(record);
    const taken = new Set([
        ...(entry.versions ?? []),
        ...(entry.instances ?? []).flatMap(i => i.versions ?? []),
    ].map(v => v.label.trim().toLowerCase()));
    if (!taken.has(base.toLowerCase())) return base;
    for (let n = 2; n < 500; n++) {
        const next = `${base} (${n})`;
        if (!taken.has(next.toLowerCase())) return next;
    }
    return base;
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
function sampleStatus(record: SafetyRecord, seed = 0): string {
    // A record that defines its own status values (e.g. a drug test's Negative / Positive)
    // is sampled from THOSE — the generic Active / On File list would be nonsense there.
    // Weighted so the realistic value dominates: only every 4th version takes the 2nd option.
    const own = record.statusOptions;
    if (own && own.length) return own[seed % 4 === 3 ? Math.min(1, own.length - 1) : 0];
    return SAMPLE_STATUSES[(recordHash(record) + seed) % SAMPLE_STATUSES.length];
}
/** Hash of a version's label — every dated label has the SAME length, so seeding demo values
 *  off the length alone would give a whole history one repeated value. */
function labelSeed(label: string): number {
    let h = 0;
    for (const c of label) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
}
/** Demo values for a record's extra fields — spread across the options so history varies. */
function sampleFields(record: SafetyRecord, seed = 0): Record<string, string> | undefined {
    const defs = recordFields(record);
    if (!defs.length) return undefined;
    const out: Record<string, string> = {};
    for (const f of defs) {
        const pool = fieldPool(f);
        if (pool.length) out[f.key] = pool[(recordHash(record) + seed) % pool.length] ?? '';
    }
    return Object.keys(out).length ? out : undefined;
}
/** Jurisdiction demo values, honouring the record's hideCountry / hideState flags. */
function sampleJurisdiction(record: SafetyRecord): { country: string; stateProv: string } {
    if (record.hideCountry) return { country: '', stateProv: '' };
    const country = record.defaultCountry ?? (record.allCountries ? 'United States' : 'Canada');
    return { country, stateProv: record.hideState ? '' : (STATES_BY_COUNTRY[country]?.[0] ?? '') };
}
// Static demo PDFs (public/demo-docs/*.pdf). Real file URLs open reliably in the browser's PDF viewer —
// unlike inline data: URLs, which browsers block from top-level navigation. Regenerate: `node scripts/generate-demo-docs.mjs`.
const DEMO_PDF_SIZE: Record<string, number> = {
    'cvor-certificate.pdf': 4780, 'insurance-certificate.pdf': 4793, 'compliance-document.pdf': 4783, 'driver-license.pdf': 4676,
    'medical-certificate.pdf': 4785, 'drug-test.pdf': 4790, 'non-commercial-abstract.pdf': 4808, 'psp-report.pdf': 4779, 'safety-fitness.pdf': 4800,
    'mc-authority.pdf': 4762, 'ifta.pdf': 4763, 'irp.pdf': 4779, 'annual-inspection.pdf': 4766, 'business-registration.pdf': 4777,
};
// Route a record to its best-matching demo PDF by id / document name / record name (first rule wins).
const DEMO_PDF_RULES: { re: RegExp; file: string }[] = [
    { re: /medical|physical/, file: 'medical-certificate.pdf' },
    { re: /drug|alcohol|clearinghouse/, file: 'drug-test.pdf' },
    { re: /mvr|abstract/, file: 'non-commercial-abstract.pdf' },
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
function sampleVersion(baseRecord: SafetyRecord, label: string, over: Partial<DocVersion> = {}): DocVersion {
    const hasDoc = baseRecord.type !== 'C' && baseRecord.docRequirement !== 'none';
    const seed = label.length;
    // Which KIND of document this sample is comes first, then everything else is sampled for
    // that kind — otherwise the demo data contradicts the form it is shown in: a certificate of
    // incorporation with an expiry date, or a business licence with fields it never had.
    const fields = pruneRecordFields(baseRecord, sampleFields(baseRecord, labelSeed(label)));
    const record = recordForFields(baseRecord, fields);
    const { country, stateProv } = sampleJurisdiction(record);
    const v: DocVersion = {
        ...blankVersion(record, label),
        numberValue: record.numberName ? sampleNumber(record) : '',
        country, stateProv,
        issueDate: record.tracksIssueDate ? SAMPLE_ISSUES[recordHash(record) % SAMPLE_ISSUES.length] : '',
        expiryDate: isDateMonitored(record) ? sampleExpiry(record) : '',
        status: capturesStatus(record) ? sampleStatus(record, seed) : '',
        fields,
        files: [],
        monitoring: { ...seedMonitoring(record), enabled: true },
        uploadedBy: SAMPLE_UPLOADERS[(recordHash(record) + label.length) % SAMPLE_UPLOADERS.length],
        ...over,
    };
    // The sample builders write `over` from the RECORD — both dates, for a record that declares
    // both — so the kind has the last word on which of them this document actually has.
    if (baseRecord.variantByField) {
        if (!record.tracksIssueDate) v.issueDate = '';
        if (!isDateMonitored(record)) v.expiryDate = '';
    }
    // Named after the kind it is, exactly as picking that type on the form would name it.
    if (record.nameFromField && fields?.[record.nameFromField] && isAutoVersionLabel(record, v.label)) {
        v.label = v.label.replace(defaultVersionLabel(record), fields[record.nameFromField]);
    }
    if (hasDoc && v.files.length === 0) v.files = sampleDocFiles(record);
    // A record with no monitoring block must never come back with monitoring switched on.
    if (record.hideMonitoring) v.monitoring = { ...v.monitoring, enabled: false };
    return v;
}
/** Deterministic sample entry for a record at list position `i` — spread across every row state. */
export function buildSampleEntry(record: SafetyRecord, i: number): RecordDataEntry | null {
    // Multi-instance records (e.g. Insurance) → two concurrent active policies, each with its own current.
    if (record.multiInstance) {
        // Insurance policies carry no record-level tags — each document is tagged individually.
        const insPolicy = (name: string, over: Partial<DocVersion>, docTag: string): DocInstance => {
            const ver = sampleVersion(record, defaultVersionLabel(record, 2026), { ...over, tags: [] });
            if (ver.files.length) ver.files = ver.files.map((f, idx) => (idx === 0 ? { ...f, tag: docTag } : f));
            return { ...newInstance(name), versions: [ver] };
        };
        return {
            versions: [],
            instances: [
                insPolicy('Liability — State Farm', { numberValue: 'POL-100', expiryDate: '2026-12-31' }, 'Certificate'),
                insPolicy('Cargo — Progressive', { numberValue: 'POL-200', expiryDate: '2027-03-15' }, 'Certificate'),
            ],
        };
    }
    const mode = i % 6;
    if (mode === 5) return null;                                                                        // leave empty → Missing / Optional
    if (mode === 4) return { versions: [sampleVersion(record, defaultVersionLabel(record, 2026), { monitoring: { ...seedMonitoring(record), enabled: false } })] }; // filled, monitoring off, no tags
    const tags = mode === 0 ? ['Verified', 'Primary'] : mode === 1 ? ['Renewed'] : mode === 2 ? ['Pending Review'] : [];
    const current = sampleVersion(record, defaultVersionLabel(record, 2026), { tags });
    // Every 3rd record keeps an older version too → an expandable multi-version row. Never a
    // record the carrier can only hold one of: a FEIN has no renewal, so a second row would be
    // demonstrating a state the record cannot reach.
    if (mode === 3 && !record.singleRecord) {
        return {
            versions: [
                current,
                sampleVersion(record, defaultVersionLabel(record, 2025), {
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
        // Document tags used for the multi-document policy demo (each maps to a row in the table).
        const POLICY_DOC_TAGS = ['Certificate', 'Endorsement', 'Declaration page', 'Schedule of coverage'];
        // One instance per concurrent policy, each with a few dated versions (current + renewal history).
        // A policy is named after the cover it carries, and every renewal of it carries the
        // SAME cover — so the type is set per policy, not sampled per version.
        const policy = (type: string, insurer: string, num: string, years: number[], pi: number): DocInstance => ({
            ...newInstance(type),
            versions: years.map((y, i) => {
                const ver = sampleVersion(record, type, {
                    numberValue: num, expiryDate: `${y}-12-31`,
                    insurer,
                    fields: { insuranceType: type },
                    // Insurance carries NO record-level tags — every tag lives on an individual document (below).
                    tags: [], monitoring: i === 0 ? { ...seedMonitoring(record), enabled: true } : olderMon(),
                });
                // Current record holds several TAGGED documents so the per-document extra rows are demonstrable.
                if (i === 0) {
                    const count = 3 + (pi % 2); // 3 or 4 documents per current record
                    const base = ver.files[0];
                    ver.files = Array.from({ length: count }, (_, d) => (d === 0
                        ? { ...base, tag: POLICY_DOC_TAGS[0] }
                        : { name: `policy-${POLICY_DOC_TAGS[d].toLowerCase().replace(/\s+/g, '-')}.pdf`, size: DEMO_PDF_SIZE['compliance-document.pdf'] ?? 4800, url: '/demo-docs/compliance-document.pdf', tag: POLICY_DOC_TAGS[d], uploadedAt: ver.uploadedAt }));
                }
                return ver;
            }),
        });
        // One policy per cover the carrier buys, each with its renewal history behind it.
        const defs: [string, string, string, number[]][] = [
            ['CGL', 'Travelers', 'CGL-4471', [2026, 2025, 2024, 2023, 2022]],
            ['Auto Liability', 'Northbridge Insurance', 'AL-8820', [2027, 2026, 2025, 2024, 2023]],
            ['Motor Truck Cargo', 'Progressive Casualty', 'MTC-1193', [2026, 2025, 2024, 2023]],
        ];
        return { versions: [], instances: defs.map(([t, ins, num, yrs], pi) => policy(t, ins, num, yrs, pi)) };
    }
    // 14 dated versions (newest = current, the rest are renewal history) — a carrier that has
    // held its authority for over a decade, which is also the length that makes the list worth
    // paging, sorting and searching, and the page long enough for the header to fold.
    // Slotted records (CDL, SSN) naturally get multiple files (Front/Back) via sampleVersion; single-upload records stay single.
    // History versions deliberately carry realistic GAPS so "missing document / date / number" states are demonstrable
    // (the current version i===0 always stays complete, so the record still reads as up-to-date).
    const thisYear = new Date().getFullYear();
    // …except where the carrier holds exactly one, which has no history to show.
    const years = record.singleRecord ? [thisYear] : Array.from({ length: 14 }, (_, i) => thisYear - i);
    return {
        versions: years.map((y, i) => {
            const v = sampleVersion(record, defaultVersionLabel(record, y), {
                expiryDate: dated ? `${y}-12-31` : '',
                issueDate: record.tracksIssueDate ? `${y - 2}-01-10` : '',
                status: capturesStatus(record) ? (record.statusOptions ? sampleStatus(record, i) : (i === 0 ? 'Active' : 'On File')) : '',
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
export function DefaultComplianceDataPage({ accountId, onNavigate }: { accountId?: string; onNavigate?: (path: string) => void }) {
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : 'the selected carrier';

    const { acct, all, getEntry, setEntry, setEntries } = useComplianceData(accountId);
    const [entity, setEntity] = useState<EntityId>('Carrier');
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null); // asset/driver id
    const [focusRecordId, setFocusRecordId] = useState<string | null>(null);     // deep-link from the Monitoring page
    const [detailOpen, setDetailOpen] = useState(false);                         // a record's dedicated detail page is open → hide page chrome
    // The header pins to the top of the app's scroll area and shrinks as you scroll into the
    // list; the KPI cards below fold with it through `CondensedHeaderContext`.
    // The header stays put and shrinks as the list scrolls; the body below is its own
    // scroller, which is what makes that possible and lets a list's toolbar pin beneath it.
    const { scrollRef, condensed, onScroll } = useCondensingHeader(entity);
    // The figures from whichever view is on screen, so they can ride up into the header as the
    // cards they belong to scroll away. Each view reports its own — the Carrier tab counts
    // records, the roster counts drivers — and only the one being rendered ever reports.
    const [kpiChips, setKpiChips] = useState<KpiChip[]>([]);
    // …and the buttons that act on the page rather than on the search.
    const [listActions, setListActions] = useState<ListPageActions>({});

    // Deep-link: the Monitoring page writes a `dcd-focus` hint before navigating here → jump to that
    // record's entity/type/subject and auto-open its Manage modal.
    useEffect(() => {
        try {
            const raw = localStorage.getItem('dcd-focus');
            if (!raw) return;
            localStorage.removeItem('dcd-focus');
            const f = JSON.parse(raw) as { acct?: string; entity?: EntityId; subjectId?: string; recordId?: string };
            if (!f || f.acct !== acct || !f.recordId) return;
            if (f.entity) setEntity(f.entity);
            setSelectedSubject(f.entity && f.entity !== 'Carrier' ? (f.subjectId ?? null) : null);
            setFocusRecordId(f.recordId);
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acct]);

    // Deep-link from a shared record link in Messages (id = "entity|subjectId|recordId") →
    // jump to that record's entity/subject and auto-open its detail.
    useEffect(() => {
        const id = consumePendingRecord('/default-compliance-documents');
        if (!id) return;
        const [ent, subj, rec] = id.split('|');
        if (!rec) return;
        if (ent === 'Carrier' || ent === 'Asset' || ent === 'Driver') setEntity(ent);
        setSelectedSubject(ent && ent !== 'Carrier' ? (subj || null) : null);
        setFocusRecordId(rec);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // One combined list — this carrier's custom records (shown first) + every system-default
    // record across all types (Compliances, Documents, Compliances & Documents).
    const { records: customRecords } = useCustomSafetyRecords(accountId);
    const records = useMemo(() => [...customRecords, ...SAFETY_RECORDS], [customRecords]);
    const assets = useMemo(() => getAssetsForAccount(acct), [acct]);
    const drivers = useMemo(() => getDriversForAccount(acct), [acct]);

    // Asset / Driver tabs: switch between the flat "Records" list (all subjects) and the subject roster.
    const [subView, setSubView] = useState<'records' | 'list'>('records');
    const assetSubjects = useMemo<RecSubject[]>(() => assets.map(a => ({ id: a.id, label: a.unitNumber, sub: `${a.year} ${a.make} ${a.model}` })), [assets]);
    const driverSubjects = useMemo<RecSubject[]>(() => drivers.map(d => ({ id: d.id, label: d.name, sub: d.driverType ?? undefined, initials: d.avatarInitials })), [drivers]);
    const assetRoster = useMemo<RosterSubject[]>(() => assets.map(a => ({ id: a.id, name: a.unitNumber, sub: `${a.year} ${a.make} ${a.model}`, type: a.assetType, extra: a.vin })), [assets]);
    const driverRoster = useMemo<RosterSubject[]>(() => drivers.map(d => ({ id: d.id, name: d.name, sub: d.driverType ?? undefined, type: d.driverType ?? '—', extra: d.licenseState ?? undefined, initials: d.avatarInitials })), [drivers]);
    const assetRecordCount = useMemo(() => records.filter(r => r.entity === 'Asset').length * assets.length, [records, assets]);
    const driverRecordCount = useMemo(() => records.filter(r => r.entity === 'Driver').length * drivers.length, [records, drivers]);

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
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ToastStack />
            {/* The app's standard list header (see `ListPageHeader`) — hidden while a record's
                dedicated detail page is open, which brings its own. */}
            {!detailOpen && (
                <ListPageHeader
                    Icon={Layers}
                    title="Default Compliances &amp; Documents"
                    description={<>Compliance &amp; document records for <span className="font-semibold text-slate-700">{carrierName}</span> — captured per carrier, asset and driver.</>}
                    chips={kpiChips}
                    condensed={condensed}
                    tabsLabel="Record scope"
                    tabs={ENTITY_ORDER.map(e => ({
                        id: e,
                        label: e,
                        icon: ENTITY_ICON[e],
                        count: e === 'Asset' ? assets.length : e === 'Driver' ? drivers.length : entityCounts.Carrier,
                    }))}
                    activeTab={entity}
                    onTabChange={id => switchEntity(id as EntityId)}
                    tabsRight={
                        entity !== 'Carrier' && !selectedSubject
                            ? <SubViewSwitch
                                value={subView} onChange={setSubView}
                                listLabel={entity === 'Asset' ? 'Assets' : 'Drivers'}
                                ListIcon={entity === 'Asset' ? Truck : User}
                                listCount={entity === 'Asset' ? assets.length : drivers.length}
                                recordCount={entity === 'Asset' ? assetRecordCount : driverRecordCount} />
                            : undefined
                    }
                    actions={<>
                        {listActions.loadSample && (
                            <button type="button" onClick={listActions.loadSample}
                                title={listActions.seedsEverywhere
                                    ? 'Load sample data everywhere — the carrier plus every asset & driver (with demo PDF documents), so all records, monitoring and the Records lists have data'
                                    : 'Populate this list with representative sample records (with demo PDF documents)'}
                                className={cn('inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[13px] font-semibold text-violet-700 hover:bg-violet-100', condensed ? 'h-8' : 'h-9')}>
                                <Sparkles size={14} className="shrink-0" />
                                <span className="hidden sm:inline">{listActions.seedsEverywhere ? 'Load sample data (everywhere)' : 'Load sample data'}</span>
                            </button>
                        )}
                        {listActions.clear && (
                            <button type="button" onClick={listActions.clear} title="Clear all captured data"
                                className={cn('inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-500 hover:border-rose-200 hover:bg-slate-50 hover:text-rose-600', condensed ? 'h-8' : 'h-9')}>
                                <Trash2 size={14} /> <span className="hidden sm:inline">Clear</span>
                            </button>
                        )}
                        {account && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                                <Building2 size={15} /> {carrierName}
                            </span>
                        )}
                    </>}
                />
            )}

            {/* Body — the scroller the header shrinks against. */}
            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-5 p-4 sm:p-8">
                {entity === 'Carrier' && (
                    <SubjectDocuments
                        accountId={accountId}
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
                        onNavigate={onNavigate}
                        onKpis={setKpiChips} onActions={setListActions}
                    />
                )}

                {entity === 'Asset' && (
                    selectedSubject
                        ? (() => {
                            const asset = assets.find(a => a.id === selectedSubject);
                            return (
                                <SubjectDocuments
                                    accountId={accountId}
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
                                    onNavigate={onNavigate}
                                    onKpis={setKpiChips} onActions={setListActions}
                                />
                            );
                        })()
                        : (subView === 'records'
                            ? <AllRecordsView entity="Asset" subjects={assetSubjects} records={records} getEntry={getEntry} setEntry={setEntry} setEntries={setEntries} all={all} onDetailChange={setDetailOpen} onNavigate={onNavigate} onKpis={setKpiChips} onActions={setListActions} />
                            : <SubjectRoster entity="Asset" subjects={assetRoster} records={records} getEntry={getEntry} onOpen={setSelectedSubject} all={all} onKpis={setKpiChips} />)
                )}

                {entity === 'Driver' && (
                    selectedSubject
                        ? (() => {
                            const driver = drivers.find(d => d.id === selectedSubject);
                            return (
                                <SubjectDocuments
                                    accountId={accountId}
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
                                    onNavigate={onNavigate}
                                    onKpis={setKpiChips} onActions={setListActions}
                                />
                            );
                        })()
                        : (subView === 'records'
                            ? <AllRecordsView entity="Driver" subjects={driverSubjects} records={records} getEntry={getEntry} setEntry={setEntry} setEntries={setEntries} all={all} onDetailChange={setDetailOpen} onNavigate={onNavigate} onKpis={setKpiChips} onActions={setListActions} />
                            : <SubjectRoster entity="Driver" subjects={driverRoster} records={records} getEntry={getEntry} onOpen={setSelectedSubject} all={all} onKpis={setKpiChips} />)
                )}
            </div>
            </div>
        </div>
    );
}

/**
 * The KPI cards above a list.
 *
 * They scroll away with the body — the header above is fixed, not sticky, so there is nothing
 * to fold them against — and hand their figures to the header's chip strip on the way out
 * (`onKpis`), which is why every view here reports the same numbers it draws.
 */
function KpiRow({ children }: { children: ReactNode }) {
    return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>;
}

/**
 * What the page header should offer on this view's behalf.
 *
 * The buttons live in the header, but only the view knows whether there is anything to clear
 * or how much a "load sample data" would seed — so the view says what is possible and the page
 * draws it, in the one band that never scrolls away.
 */
export interface ListPageActions {
    loadSample?: () => void;
    /** Undefined when there is nothing captured yet — no button rather than a dead one. */
    clear?: () => void;
    /** The seed covers the carrier plus every asset and driver, not just this list. */
    seedsEverywhere?: boolean;
}

/**
 * Report those actions upward. The handlers are re-created on every render, so they are held
 * in a ref and the reported object is rebuilt only when what is POSSIBLE changes — otherwise
 * the page would set state on every render of the view it is rendering.
 */
function useReportActions(report: ((a: ListPageActions) => void) | undefined, a: ListPageActions) {
    const latest = useRef(a);
    latest.current = a;
    const can = `${!!a.loadSample}|${!!a.clear}|${!!a.seedsEverywhere}`;
    const stable = useMemo<ListPageActions>(() => ({
        loadSample: latest.current.loadSample && (() => latest.current.loadSample?.()),
        clear: latest.current.clear && (() => latest.current.clear?.()),
        seedsEverywhere: latest.current.seedsEverywhere,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [can]);
    useEffect(() => { report?.(stable); }, [report, stable]);
    useEffect(() => () => report?.({}), [report]);
}

/**
 * Hand this view's KPI figures to the page header.
 *
 * `deps` is the list of raw numbers, not the chip array: rebuilding the array every render and
 * reporting that would set state on the page on every render, which re-renders this view, which
 * builds another array. The numbers are what actually change.
 */
function useReportKpis(report: ((chips: KpiChip[]) => void) | undefined, chips: KpiChip[], deps: unknown[]) {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stable = useMemo(() => chips, deps);
    useEffect(() => { report?.(stable); }, [report, stable]);
    // A view that unmounts takes its figures with it, or the header keeps showing the last
    // tab's numbers beside the new tab's title.
    useEffect(() => () => report?.([]), [report]);
}

// ── Master lists (Asset / Driver) ─────────────────────────────────────
function CompletionBar({ pct }: { pct: number }) {
    return (
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className={cn('h-full rounded-full', pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${pct}%` }} />
        </div>
    );
}

// Asset / Driver roster — a proper data table (KPIs + search + filters + sorting + pagination),
// each row keeping its completion progress bar. Replaces the old card lists.
type RosterSubject = { id: string; name: string; sub?: string; type: string; extra?: string; initials?: string };
type RosterCol = 'name' | 'type' | 'completion' | 'missing';

function SubjectRoster({ entity, subjects, records, getEntry, onOpen, all, onKpis }: {
    entity: 'Asset' | 'Driver';
    subjects: RosterSubject[];
    records: SafetyRecord[];
    getEntry: EntryGetter;
    onOpen: (id: string) => void;
    all: unknown;
    onKpis?: (chips: KpiChip[]) => void;
}) {
    const entityRecords = useMemo(() => records.filter(r => r.entity === entity), [records, entity]);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
    const [sort, setSort] = useState<{ col: RosterCol; dir: 'asc' | 'desc' }>({ col: 'name', dir: 'asc' });
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const noun = entity === 'Asset' ? 'assets' : 'drivers';
    const Icon = entity === 'Asset' ? Truck : User;
    const selectCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    const rows = useMemo(() => subjects.map(s => ({ s, stats: computeStats(entityRecords, r => getEntry(s.id, r.id)) })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [subjects, entityRecords, all]);

    const kpis = useMemo(() => {
        const total = rows.length;
        const complete = rows.filter(r => r.stats.pct === 100).length;
        const withMissing = rows.filter(r => r.stats.requiredMissing > 0).length;
        const avg = total ? Math.round(rows.reduce((a, r) => a + r.stats.pct, 0) / total) : 0;
        return { total, complete, withMissing, avg };
    }, [rows]);

    useReportKpis(onKpis, [
        { id: 'total', label: entity === 'Asset' ? 'Assets' : 'Drivers', value: kpis.total },
        { id: 'complete', label: 'Complete', value: kpis.complete, tone: 'text-emerald-700' },
        { id: 'missing', label: 'With missing', value: kpis.withMissing, tone: 'text-rose-700' },
        { id: 'avg', label: 'Avg completion', value: `${kpis.avg}%`, tone: 'text-blue-700' },
    ], [entity, kpis.total, kpis.complete, kpis.withMissing, kpis.avg]);

    const types = useMemo(() => Array.from(new Set(subjects.map(s => s.type).filter(t => t && t !== '—'))), [subjects]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(({ s, stats }) => {
            if (typeFilter !== 'all' && s.type !== typeFilter) return false;
            if (statusFilter === 'complete' && stats.pct !== 100) return false;
            if (statusFilter === 'incomplete' && stats.requiredMissing === 0) return false;
            if (q && !`${s.name} ${s.sub || ''} ${s.type} ${s.extra || ''}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, search, typeFilter, statusFilter]);

    const sorted = useMemo(() => {
        const val = (r: (typeof rows)[number]) =>
            sort.col === 'name' ? r.s.name.toLowerCase()
                : sort.col === 'type' ? (r.s.type || '').toLowerCase()
                    : sort.col === 'completion' ? String(r.stats.pct).padStart(3, '0')
                        : String(r.stats.requiredMissing).padStart(3, '0');
        const arr = [...filtered].sort((a, b) => val(a).localeCompare(val(b), undefined, { numeric: true }));
        if (sort.dir === 'desc') arr.reverse();
        return arr;
    }, [filtered, sort]);

    useEffect(() => { setPage(1); }, [search, typeFilter, statusFilter, pageSize, sort]);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);
    const toggleSort = (col: RosterCol) => setSort(prev => (prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' }));

    const Th = ({ col, label, className }: { col: RosterCol; label: string; className?: string }) => {
        const active = sort.col === col;
        const Ic = active ? (sort.dir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
        return (
            <th className={cn('px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap', className)}>
                <button type="button" onClick={() => toggleSort(col)} className={cn('inline-flex items-center gap-1 hover:text-slate-700 transition-colors', active && 'text-blue-600')}>
                    {label} <Ic size={12} className={active ? '' : 'text-slate-300'} />
                </button>
            </th>
        );
    };

    return (
        <div className="space-y-5">
            {/* KPI tiles */}
            <KpiRow>
                <KpiTile label={entity === 'Asset' ? 'Assets' : 'Drivers'} value={kpis.total} Icon={Icon} accent="slate" />
                <KpiTile label="Fully complete" value={kpis.complete} Icon={Check} accent="emerald" />
                <KpiTile label="With missing" value={kpis.withMissing} Icon={CircleAlert} accent="rose" />
                <KpiTile label="Avg completion" value={`${kpis.avg}%`} Icon={CalendarClock} accent="blue" />
            </KpiRow>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={entity === 'Asset' ? 'Search unit, VIN, make…' : 'Search driver, type…'}
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>
                    {types.length > 0 && (
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls} title="Filter by type">
                            <option value="all">All types</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'complete' | 'incomplete')} className={selectCls} title="Filter by completion">
                        <option value="all">All statuses</option>
                        <option value="complete">Fully complete</option>
                        <option value="incomplete">Has missing</option>
                    </select>
                </div>

                {pageRows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">No {noun} match your search / filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px]">
                            <thead className="border-b border-slate-200 bg-slate-50/50">
                                <tr>
                                    <Th col="name" label={entity} className="pl-5" />
                                    <Th col="type" label="Type" />
                                    <Th col="completion" label="Completion" className="w-[300px]" />
                                    <Th col="missing" label="Required Missing" />
                                    <th className="px-4 py-2.5" />
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(({ s, stats }) => (
                                    <tr key={s.id} onClick={() => onOpen(s.id)} className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                                        <td className="px-4 py-3 pl-5">
                                            <div className="flex items-center gap-2.5">
                                                {s.initials
                                                    ? <div className="h-9 w-9 rounded-full bg-blue-50 text-blue-600 text-[12px] font-bold flex items-center justify-center shrink-0">{s.initials}</div>
                                                    : <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Icon size={16} /></div>}
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{s.name}</div>
                                                    {s.sub && <div className="text-[11px] text-slate-500 truncate">{s.sub}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600 whitespace-nowrap">{s.type || '—'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-40"><CompletionBar pct={stats.pct} /></div>
                                                <span className="w-9 text-[12px] font-semibold text-slate-700 tabular-nums">{stats.pct}%</span>
                                                <span className="whitespace-nowrap text-[11px] text-slate-500 tabular-nums">{stats.complete}/{stats.complete + stats.requiredMissing} required</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {stats.requiredMissing > 0
                                                ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600"><CircleAlert size={11} /> {stats.requiredMissing}</span>
                                                : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"><Check size={11} /> None</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right"><ChevronRight size={16} className="text-slate-300" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <TablePager page={safePage} pageSize={pageSize} total={total}
                    onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1); }} />
            </div>
        </div>
    );
}

// ── Subject documents (Carrier / one Asset / one Driver) ──────────────
// Compact, refined subject stats for the EMBEDDED view (asset/driver detail tab) — a single slim bar
// instead of the four big KPI cards used on the standalone page.
function MiniStat({ value, label, dot }: { value: number | string; label: string; dot: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full shrink-0', dot)} />
            <span className="text-lg font-bold text-slate-900 tabular-nums leading-none">{value}</span>
            <span className="text-[12px] font-medium text-slate-500">{label}</span>
        </div>
    );
}
function SubjectStatBar({ stats }: { stats: { total: number; complete: number; requiredMissing: number; optionalPending: number; pct: number } }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 flex items-center gap-x-5 gap-y-3 flex-wrap">
            <div className="flex items-center gap-x-5 gap-y-2 flex-wrap">
                <MiniStat value={stats.total} label="Records" dot="bg-slate-300" />
                <MiniStat value={stats.complete} label="Complete" dot="bg-emerald-500" />
                <MiniStat value={stats.requiredMissing} label="Missing" dot="bg-rose-500" />
                {stats.optionalPending > 0 && <MiniStat value={stats.optionalPending} label="Optional" dot="bg-amber-400" />}
            </div>
            <div className="ml-auto min-w-[170px] flex-1 max-w-[280px]">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                    <span>Required complete</span>
                    <span className="tabular-nums text-slate-800">{stats.pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full transition-all', stats.pct >= 100 ? 'bg-emerald-500' : stats.pct >= 60 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${stats.pct}%` }} />
                </div>
            </div>
        </div>
    );
}

export function SubjectDocuments({ entity, subjectId, subjectLabel, carrierName, records, getEntry, setEntry, setEntries, all, onBack, backLabel, autoOpenRecordId, onFocusConsumed, alsoSeedSubjects, onDetailChange, embedded, detailExtra, detailExtraFor, hideCategoryTabs, onNavigate, accountId, onKpis, onActions }: {
    entity: EntityId;
    subjectId: string;
    /** Scopes which records this subject tracks (see `record-enablement`). */
    accountId?: string;
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
    // Embedded inside an entity detail tab → drop the redundant subject header + big KPI cards for a compact, refined look.
    embedded?: boolean;
    // Optional extra section rendered inside a record's detail page (e.g. a "Fill out the form" card for DQ forms).
    detailExtra?: ReactNode;
    // Per-record variant of detailExtra — receives the open record so a list (e.g. the DQ Forms tab)
    // can render the RIGHT form's fill card. Falls back to detailExtra when not provided.
    detailExtraFor?: (record: SafetyRecord) => ReactNode;
    // Hide the category tab row (e.g. the DQ Forms tab, where every record is one category → redundant).
    hideCategoryTabs?: boolean;
    // Deep-link navigation (used by the record-share "Share to chat" flow).
    onNavigate?: (path: string) => void;
    // Report this view's KPI figures to the page header, which shows them as chips once the
    // cards have scrolled out of reach. Not passed when embedded — there is no header to tell.
    onKpis?: (chips: KpiChip[]) => void;
    // The buttons that act on the whole page rather than on the search — they are drawn in the
    // header, which does not scroll away. See `ListPageActions`.
    onActions?: (a: ListPageActions) => void;
}) {
    const { tags: tagCatalog } = useSafetyTags();
    const [category, setCategory] = useState<SafetyCategory | 'All'>('All');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | DataStatus>('all');
    const [tagFilter, setTagFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<RecordTypeId | 'all'>('all');
    const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' } | null>(null);
    const [visibleCols, setVisibleCols] = useState<Set<DataColId>>(() => new Set(ALL_DATA_COLS));
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [manage, setManage] = useState<SafetyRecord | null>(null);
    const [detailRecord, setDetailRecord] = useState<SafetyRecord | null>(null); // row → dedicated detail page
    const [confirmClear, setConfirmClear] = useState(false);                     // Clear → "are you sure?"
    // Which records this subject tracks. `listedDisabled` is a snapshot, so flipping a row's
    // switch marks it rather than moving it out from under the cursor; `refresh` is what
    // actually moves rows between the two lists, exactly as reloading the page would.
    const { disabled, listedDisabled, pending, setEnabled, refresh } = useRecordEnablement(accountId, subjectId);
    const [enablementView, setEnablementView] = useState<'enabled' | 'disabled'>('enabled');
    useEffect(() => { setPage(1); }, [enablementView]);
    // Tell the parent to hide its header/entity tabs while a detail page is open (and reset on unmount / subject change).
    useEffect(() => { onDetailChange?.(!!detailRecord); }, [detailRecord, onDetailChange]);
    useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

    const toggleCol = (id: DataColId) => setVisibleCols(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSort = (col: SortCol) => setSort(prev => (prev && prev.col === col ? (prev.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));

    const allEntityRecords = useMemo(() => records.filter(r => r.entity === entity), [records, entity]);
    // Everything below — the stats bar, the category tabs, the filters, the table — works on
    // the records in the list you are LOOKING at, so "23 Records" always matches what is
    // listed and a disabled record stops counting against the driver's completion.
    const entityRecords = useMemo(
        () => allEntityRecords.filter(r => listedDisabled.has(r.id) === (enablementView === 'disabled')),
        [allEntityRecords, listedDisabled, enablementView]);
    const enabledCount = useMemo(() => allEntityRecords.filter(r => !listedDisabled.has(r.id)).length, [allEntityRecords, listedDisabled]);
    const disabledCount = allEntityRecords.length - enabledCount;
    const entryFor = (r: SafetyRecord) => getEntry(subjectId, r.id);

    // Deep-link from the Monitoring page → auto-open the requested record's dedicated detail page once.
    useEffect(() => {
        if (!autoOpenRecordId) return;
        const rec = allEntityRecords.find(r => r.id === autoOpenRecordId);
        if (rec) setDetailRecord(rec);
        onFocusConsumed?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoOpenRecordId]);

    // "Load sample data" — seed THIS subject + every alsoSeedSubject (all assets + drivers) in ONE batch write,
    // so the whole app (incl. monitoring) has representative data. Each doc-bearing record gets a real demo PDF.
    const loadSampleData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        allEntityRecords.forEach((r, i) => items.push({ subjectId, recordId: r.id, entry: buildSampleEntry(r, i) ?? emptyEntry() }));
        for (const ex of alsoSeedSubjects ?? [])
            records.filter(r => r.entity === ex.entity).forEach((r, i) => items.push({ subjectId: ex.subjectId, recordId: r.id, entry: buildSampleEntry(r, i) ?? emptyEntry() }));
        setEntries(items);
        // The broker lives beside the policies, not inside them, so seeding the policies
        // without it would leave the header pointedly blank.
        if (accountId && brokerIsEmpty(getInsuranceBroker(accountId))) setInsuranceBroker(accountId, sampleBroker());
        const subjectCount = 1 + (alsoSeedSubjects?.length ?? 0);
        emitToast(`Sample data loaded — ${items.length} records across ${subjectCount} ${subjectCount === 1 ? 'subject' : 'subjects'}`);
    };
    const clearData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        allEntityRecords.forEach(r => items.push({ subjectId, recordId: r.id, entry: emptyEntry() }));
        for (const ex of alsoSeedSubjects ?? [])
            records.filter(r => r.entity === ex.entity).forEach(r => items.push({ subjectId: ex.subjectId, recordId: r.id, entry: emptyEntry() }));
        setEntries(items);
        emitToast('Data cleared');
    };
    const hasData = allEntityRecords.some(r => {
        const e = getEntry(subjectId, r.id);
        return e.versions.length > 0 || (e.instances?.length ?? 0) > 0;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const stats = useMemo(() => computeStats(entityRecords, entryFor), [entityRecords, subjectId, all]);

    useReportActions(onActions, {
        loadSample: loadSampleData,
        clear: hasData ? () => setConfirmClear(true) : undefined,
        seedsEverywhere: !!alsoSeedSubjects?.length,
    });
    useReportKpis(onKpis, [
        { id: 'records', label: 'Records', value: stats.total },
        { id: 'complete', label: 'Complete', value: stats.complete, tone: 'text-emerald-700' },
        { id: 'missing', label: 'Req. missing', value: stats.requiredMissing, tone: 'text-rose-700' },
        { id: 'pct', label: 'Req. complete', value: `${stats.pct}%`, tone: 'text-blue-700' },
    ], [stats.total, stats.complete, stats.requiredMissing, stats.pct]);

    const categoryTabs = useMemo(() => {
        const present = SAFETY_CATEGORY_ORDER.filter(c => entityRecords.some(r => r.category === c));
        return [
            { id: 'All' as SafetyCategory | 'All', label: 'All', count: entityRecords.length },
            ...present.map(c => ({ id: c as SafetyCategory | 'All', label: c, count: entityRecords.filter(r => r.category === c).length })),
        ];
    }, [entityRecords]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return entityRecords.filter(r => {
            if (category !== 'All' && r.category !== category) return false;
            if (typeFilter !== 'all' && r.type !== typeFilter) return false;
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
    }, [entityRecords, category, typeFilter, statusFilter, tagFilter, search, subjectId, all]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const arr = [...filtered].sort((a, b) =>
            sortValueFor(sort.col, a, getEntry(subjectId, a.id))
                .localeCompare(sortValueFor(sort.col, b, getEntry(subjectId, b.id)), undefined, { numeric: true, sensitivity: 'base' }));
        if (sort.dir === 'desc') arr.reverse();
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, sort, subjectId, all]);

    useEffect(() => { setPage(1); }, [category, typeFilter, statusFilter, tagFilter, search, pageSize, sort, subjectId]);

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
                    detailExtra={detailExtraFor ? detailExtraFor(detailRecord) : detailExtra}
                    onNavigate={onNavigate}
                    showSubject={!embedded}
                    accountId={accountId}
                />
            ) : (
            <>
            {/* Which subject am I looking at — a back button and its name. Only where that is a
                question worth answering: an asset or driver drilled into from a roster. On the
                Carrier tab it named the carrier a third time, under a header and a tab that had
                already said it, so it is gone. `onBack` is what distinguishes the two. */}
            {!embedded && onBack && (
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
            )}

            {/* Subject stats — a compact refined bar when embedded, full KPI cards on the standalone page. */}
            {embedded ? (
                <SubjectStatBar stats={stats} />
            ) : (
            <KpiRow>
                <KpiTile label="Records" value={stats.total} Icon={Layers} accent="slate" />
                <KpiTile label="Complete" value={stats.complete} Icon={Check} accent="emerald" />
                <KpiTile label="Required Missing" value={stats.requiredMissing} Icon={CircleAlert} accent="rose" />
                <KpiTile label="Required Complete" value={`${stats.pct}%`} Icon={CalendarClock} accent="blue" />
            </KpiRow>
            )}

            {/* Enabled / Disabled — which of this subject's records the list is showing. */}
            {/* List card */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Which records am I looking at — the category tabs and the Enabled / Disabled
                    switch answer the same question, so they share the card's top row: the
                    subsets on the left, which SIDE of the list on the right. The row survives
                    the tabs being hidden, because the switch still belongs here.
                    The divider lives on the wrapper and the underline overlaps it via the
                    SCROLL BOX's own -mb-px, never the buttons': a button hanging 1px past its
                    scroll box makes `overflow-x-auto` compute `overflow-y: auto` too, which
                    put a stray vertical scrollbar in this row and clipped the last count. */}
                <div className="border-b border-slate-100">
                    <div className="flex items-end gap-3 px-4 pt-3">
                        {!hideCategoryTabs && (
                        <div className="-mb-px flex min-w-0 flex-1 items-end gap-1 overflow-x-auto">
                            {categoryTabs.map(t => {
                                const active = category === t.id;
                                return (
                                    <button key={String(t.id)} type="button" onClick={() => setCategory(t.id)}
                                        title={`${t.label} — ${t.count} ${t.count === 1 ? 'record' : 'records'}`}
                                        className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors',
                                            active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                                        {t.label}
                                        <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                        )}
                        <div className={cn('shrink-0 pb-2', hideCategoryTabs && 'ml-auto')}>
                            <EnablementSwitch value={enablementView} onChange={setEnablementView}
                                enabledCount={enabledCount} disabledCount={disabledCount} />
                        </div>
                    </div>
                </div>

                {/* Changes waiting on a refresh — a strip across the list they apply to. */}
                {pending.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-amber-100 bg-amber-50/60 px-4 py-2 text-[12px] text-amber-800">
                        <Info size={13} className="shrink-0 text-amber-600" />
                        <span>
                            {pending.length === 1 ? '1 record moves' : `${pending.length} records move`} list on refresh.
                        </span>
                        <button type="button" onClick={refresh}
                            className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-100">
                            <RotateCcw size={11} /> Refresh list
                        </button>
                    </div>
                )}

                {/* Toolbar — two groups: narrowing the list on the left, acting on it at the
                    right. Grouped rather than one long flex row so that when it wraps, the
                    filters stay together and the buttons stay together, instead of the last
                    control being orphaned onto a line of its own.
                    Aligned to the TOP, not the centre: once the filter group wraps to two
                    lines, centring floated the buttons between them, aligned with neither. */}
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 py-3 border-b border-slate-100">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <div className="relative min-w-[200px] flex-1 basis-full sm:basis-auto sm:max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records, numbers, tags, jurisdiction…"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as RecordTypeId | 'all')} className={selectCls} title="Filter by record type">
                        <option value="all">All record types</option>
                        {RECORD_TYPE_ORDER.map(t => <option key={t} value={t}>{RECORD_TYPE_LABEL[t]}</option>)}
                    </select>
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
                    </div>
                </div>

                {pageRows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">
                        {entityRecords.length === 0 && enablementView === 'disabled'
                            ? 'No records are disabled — this driver tracks the whole catalog.'
                            : 'No records match your search / filters.'}
                    </div>
                ) : (
                    <>
                        {/* Mobile / narrow screens — stacked cards */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {pageRows.map(r => (
                                <RecordCard
                                    key={r.id}
                                    r={r}
                                    entry={entryFor(r)}
                                    visibleCols={visibleCols}
                                    onOpen={() => setDetailRecord(r)}
                                    enabled={!disabled.has(r.id)}
                                    onEnabledChange={v => setEnabled(r.id, v)}
                                />
                            ))}
                        </div>
                        {/* Desktop — full table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="pin-first w-full min-w-[1070px]">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr className="text-left">
                                        <SortableTh col="record" label="Record & Fields" sort={sort} onSort={toggleSort} className="pl-5" />
                                        {cols.map(c => <SortableTh key={c.id} col={c.id} label={c.label} sort={sort} onSort={toggleSort} />)}
                                        {/* Always shown — not a toggleable column: it is how you get a record back. */}
                                        <th className="sticky right-0 z-20 w-[92px] border-l border-slate-200 bg-slate-50 py-2.5 pl-4 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap" title="Whether this record is tracked for this driver">Tracked</th>
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
                                            enabled={!disabled.has(r.id)}
                                            onEnabledChange={v => setEnabled(r.id, v)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination footer */}
                <TablePager page={safePage} pageSize={pageSize} total={total}
                    onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1); }} />
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

// ── Aggregated "Records" view (all records across every asset / driver) ──────────────
type RecSubject = { id: string; label: string; sub?: string; initials?: string };

/** Records | Assets(Drivers) view toggle — a subtle segmented control that sits inline with the
 *  entity tabs, matching the app's other segmented controls so it reads as part of the header. */
function SubViewSwitch({ value, onChange, listLabel, ListIcon, listCount, recordCount }: {
    value: 'records' | 'list'; onChange: (v: 'records' | 'list') => void;
    listLabel: string; ListIcon: typeof Truck; listCount: number; recordCount: number;
}) {
    const opts = [
        { id: 'records' as const, label: 'Records', Icon: Layers, count: recordCount },
        { id: 'list' as const, label: listLabel, Icon: ListIcon, count: listCount },
    ];
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5">
            {opts.map(o => {
                const active = value === o.id;
                return (
                    <button key={o.id} type="button" onClick={() => onChange(o.id)}
                        className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                            active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                        <o.Icon size={13} className={active ? 'text-blue-600' : 'text-slate-400'} /> {o.label}
                        <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums', active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500')}>{o.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Enabled / Disabled switch for a subject's record list. Both counts are always visible, so
 * turning something off never looks like losing it — you can see where it went.
 */
function EnablementSwitch({ value, onChange, enabledCount, disabledCount }: {
    value: 'enabled' | 'disabled'; onChange: (v: 'enabled' | 'disabled') => void;
    enabledCount: number; disabledCount: number;
}) {
    const opts = [
        { id: 'enabled' as const, label: 'Enabled', Icon: ToggleRight, count: enabledCount },
        { id: 'disabled' as const, label: 'Disabled', Icon: ToggleLeft, count: disabledCount },
    ];
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5">
            {opts.map(o => {
                const active = value === o.id;
                return (
                    <button key={o.id} type="button" onClick={() => onChange(o.id)}
                        title={o.id === 'enabled' ? `Enabled — ${enabledCount} records this subject tracks` : `Disabled — ${disabledCount} records this subject does not track`}
                        aria-label={o.label}
                        className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                            active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                        <o.Icon size={14} className={cn('shrink-0', active ? 'text-blue-600' : 'text-slate-400')} />
                        <span className="hidden sm:inline">{o.label}</span>
                        <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums', active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500')}>{o.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** A row's on/off control. Compact enough for a table cell, and it never opens the row. */
function RowEnableToggle({ enabled, onChange, recordName }: {
    enabled: boolean; onChange: (v: boolean) => void; recordName: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={enabled}
            title={enabled ? `Stop tracking ${recordName} for this driver` : `Track ${recordName} for this driver`}
            onClick={e => { e.stopPropagation(); onChange(!enabled); }}
            className={cn('inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors',
                enabled ? 'bg-blue-600' : 'bg-slate-300 hover:bg-slate-400')}
        >
            <span className={cn('block h-4 w-4 rounded-full bg-white shadow transition-transform', enabled ? 'translate-x-4' : 'translate-x-0')} />
        </button>
    );
}

/** Leading "Subject" cell — the asset / driver a record row belongs to. */
function SubjectCell({ s }: { s: RecSubject }) {
    return (
        <div className="flex items-center gap-2.5 min-w-[150px]">
            {s.initials
                ? <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold flex items-center justify-center shrink-0">{s.initials}</div>
                : <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Truck size={15} /></div>}
            <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-800 truncate">{s.label}</div>
                {s.sub && <div className="text-[11px] text-slate-400 truncate">{s.sub}</div>}
            </div>
        </div>
    );
}

/**
 * Flat records list across EVERY asset (or driver) of the carrier — one row per subject × record,
 * with the subject name on each row. KPIs + search + type / status / tag / subject filters + column
 * chooser + Load sample data. Rows open that subject's record detail page. Mirrors SubjectDocuments.
 */
function AllRecordsView({ entity, subjects, records, getEntry, setEntry, setEntries, all, onDetailChange, onNavigate, onKpis, onActions }: {
    entity: 'Asset' | 'Driver';
    subjects: RecSubject[];
    records: SafetyRecord[];
    getEntry: EntryGetter;
    setEntry: EntrySetter;
    setEntries: (items: { subjectId: string; recordId: string; entry: RecordDataEntry }[]) => void;
    all: unknown; // store snapshot — changes on every write; forces the memos below to recompute
    onDetailChange?: (open: boolean) => void;
    onNavigate?: (path: string) => void;
    onKpis?: (chips: KpiChip[]) => void;
    onActions?: (a: ListPageActions) => void;
}) {
    const { tags: tagCatalog } = useSafetyTags();
    const entityRecords = useMemo(() => records.filter(r => r.entity === entity), [records, entity]);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<RecordTypeId | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | DataStatus>('all');
    const [tagFilter, setTagFilter] = useState('all');
    const [subjectFilter, setSubjectFilter] = useState('all');
    const [visibleCols, setVisibleCols] = useState<Set<DataColId>>(() => new Set(ALL_DATA_COLS));
    const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' } | null>(null);
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    const [detail, setDetail] = useState<{ subject: RecSubject; record: SafetyRecord } | null>(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const subjectNoun = entity === 'Asset' ? 'assets' : 'drivers';

    useEffect(() => { onDetailChange?.(!!detail); }, [detail, onDetailChange]);
    useEffect(() => () => onDetailChange?.(false), [onDetailChange]);

    const toggleCol = (id: DataColId) => setVisibleCols(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleSort = (col: SortCol) => setSort(prev => (prev && prev.col === col ? (prev.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));

    const allRows = useMemo(() => {
        const rows: { subject: RecSubject; record: SafetyRecord }[] = [];
        for (const s of subjects) for (const r of entityRecords) rows.push({ subject: s, record: r });
        return rows;
    }, [subjects, entityRecords]);

    // Aggregate KPIs across every subject × record.
    const kpis = useMemo(() => {
        let complete = 0, missing = 0;
        for (const { subject, record } of allRows) {
            const st = entryStatus(record, getEntry(subject.id, record.id));
            if (st === 'complete') complete++; else if (st === 'missing') missing++;
        }
        const req = complete + missing;
        return { total: allRows.length, complete, missing, pct: req ? Math.round((complete / req) * 100) : 100 };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allRows, all]);

    useReportKpis(onKpis, [
        { id: 'records', label: 'Records', value: kpis.total },
        { id: 'complete', label: 'Complete', value: kpis.complete, tone: 'text-emerald-700' },
        { id: 'missing', label: 'Req. missing', value: kpis.missing, tone: 'text-rose-700' },
        { id: 'pct', label: 'Req. complete', value: `${kpis.pct}%`, tone: 'text-blue-700' },
    ], [kpis.total, kpis.complete, kpis.missing, kpis.pct]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter(({ subject, record: r }) => {
            if (subjectFilter !== 'all' && subject.id !== subjectFilter) return false;
            if (typeFilter !== 'all' && r.type !== typeFilter) return false;
            const entry = getEntry(subject.id, r.id);
            if (statusFilter !== 'all' && entryStatus(r, entry) !== statusFilter) return false;
            const tags = versionTags(entry);
            if (tagFilter !== 'all' && !tags.some(t => t.toLowerCase() === tagFilter.toLowerCase())) return false;
            if (q) {
                const cur = currentVersion(entry);
                const hay = `${subject.label} ${subject.sub || ''} ${searchBlob(r)} ${cur?.numberValue || ''} ${tags.join(' ')}`.toLowerCase();
                if (!(hay.includes(q) || tags.some(t => smartTagMatch(q, t)))) return false;
            }
            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allRows, subjectFilter, typeFilter, statusFilter, tagFilter, search, all]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const arr = [...filtered].sort((a, b) =>
            sortValueFor(sort.col, a.record, getEntry(a.subject.id, a.record.id))
                .localeCompare(sortValueFor(sort.col, b.record, getEntry(b.subject.id, b.record.id)), undefined, { numeric: true, sensitivity: 'base' }));
        if (sort.dir === 'desc') arr.reverse();
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, sort, all]);

    useEffect(() => { setPage(1); }, [subjectFilter, typeFilter, statusFilter, tagFilter, search, pageSize, sort]);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);
    const cols = DATA_COLUMNS.filter(c => visibleCols.has(c.id));
    const selectCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    const loadSampleData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        for (const s of subjects) entityRecords.forEach((r, i) => items.push({ subjectId: s.id, recordId: r.id, entry: buildSampleEntry(r, i) ?? emptyEntry() }));
        setEntries(items);
        emitToast(`Sample data loaded — ${items.length} records across ${subjects.length} ${subjectNoun}`);
    };
    const clearData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        for (const s of subjects) entityRecords.forEach(r => items.push({ subjectId: s.id, recordId: r.id, entry: emptyEntry() }));
        setEntries(items);
        emitToast('Data cleared');
    };
    const hasData = allRows.some(({ subject, record }) => { const e = getEntry(subject.id, record.id); return e.versions.length > 0 || (e.instances?.length ?? 0) > 0; });

    useReportActions(onActions, {
        loadSample: loadSampleData,
        clear: hasData ? () => setConfirmClear(true) : undefined,
    });

    if (detail) {
        return (
            <RecordDetailPage
                record={detail.record}
                entry={getEntry(detail.subject.id, detail.record.id)}
                entity={entity}
                subjectLabel={detail.subject.label}
                subjectId={detail.subject.id}
                setEntry={setEntry}
                onBack={() => setDetail(null)}
                onNavigate={onNavigate}
            />
        );
    }

    return (
        <div className="space-y-5">
            {/* KPI tiles — aggregated across all subjects */}
            <KpiRow>
                <KpiTile label="Records" value={kpis.total} Icon={Layers} accent="slate" />
                <KpiTile label="Complete" value={kpis.complete} Icon={Check} accent="emerald" />
                <KpiTile label="Required Missing" value={kpis.missing} Icon={CircleAlert} accent="rose" />
                <KpiTile label="Required Complete" value={`${kpis.pct}%`} Icon={CalendarClock} accent="blue" />
            </KpiRow>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
                    <div className="relative flex-1 min-w-[220px] max-w-sm">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${entity === 'Asset' ? 'unit' : 'driver'}, record, number, tag…`}
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>
                    <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className={selectCls} title={`Filter by ${entity.toLowerCase()}`}>
                        <option value="all">All {subjectNoun}</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as RecordTypeId | 'all')} className={selectCls} title="Filter by record type">
                        <option value="all">All record types</option>
                        {RECORD_TYPE_ORDER.map(t => <option key={t} value={t}>{RECORD_TYPE_LABEL[t]}</option>)}
                    </select>
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
                </div>

                {pageRows.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-500">No records match your search / filters.</div>
                ) : (
                    <>
                        {/* Mobile / narrow screens — stacked cards (subject block on top of each) */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {pageRows.map(({ subject, record }) => (
                                <RecordCard
                                    key={`${subject.id}-${record.id}`}
                                    r={record}
                                    entry={getEntry(subject.id, record.id)}
                                    visibleCols={visibleCols}
                                    onOpen={() => setDetail({ subject, record })}
                                    leadCell={<SubjectCell s={subject} />}
                                />
                            ))}
                        </div>
                        {/* Desktop — full table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="pin-first w-full min-w-[1080px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr className="text-left">
                                        <th className="px-4 py-2.5 pl-5 text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{entity}</th>
                                        <SortableTh col="record" label="Record & Fields" sort={sort} onSort={toggleSort} />
                                        {cols.map(c => <SortableTh key={c.id} col={c.id} label={c.label} sort={sort} onSort={toggleSort} />)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(({ subject, record }) => (
                                        <RecordTableRow
                                            key={`${subject.id}-${record.id}`}
                                            r={record}
                                            entry={getEntry(subject.id, record.id)}
                                            visibleCols={visibleCols}
                                            onOpen={() => setDetail({ subject, record })}
                                            leadCell={<SubjectCell s={subject} />}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Pagination */}
                <TablePager page={safePage} pageSize={pageSize} total={total}
                    onPage={setPage} onPageSize={n => { setPageSize(n); setPage(1); }} />
            </div>

            {confirmClear && (
                <ConfirmDialog
                    danger
                    title="Clear all data?"
                    message={`This removes every captured document / version for all ${subjectNoun}. This can't be undone.`}
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
function RecordTableRow({ r, entry, visibleCols, onOpen, leadCell, enabled, onEnabledChange }: {
    r: SafetyRecord; entry: RecordDataEntry; visibleCols: Set<DataColId>;
    onOpen: () => void;
    /** Optional leading cell (the aggregated "Records" view passes the Asset/Driver subject here). */
    leadCell?: ReactNode;
    /** Whether this subject tracks the record. Omitted where enablement does not apply. */
    enabled?: boolean;
    onEnabledChange?: (v: boolean) => void;
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

    // Dimmed the moment the switch is flipped, so the change reads immediately even though
    // the row keeps its place until the list is refreshed.
    const off = enabled === false;
    return (
        <>
            <tr className={cn('group border-b border-slate-100 hover:bg-slate-50/50 align-top', off && 'bg-slate-50/40 opacity-60')}>
                {/* Subject (aggregated Records view only) */}
                {leadCell !== undefined && <td className="px-4 py-3.5 pl-5 align-top">{leadCell}</td>}
                {/* Record & Fields */}
                <td className={cn('px-4 py-3.5', leadCell === undefined && 'pl-5')}>
                    <div className="flex items-start gap-2">
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <button type="button" onClick={onOpen} title="Open details" className="group inline-flex items-center gap-1 text-left text-sm font-semibold text-slate-900 hover:text-blue-600">
                                    {r.recordName}
                                    <ChevronRight size={13} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                </button>
                                {r.custom && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"><Sparkles size={8} /> Custom</span>}
                            </div>
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
                            ) : r.hideStatus ? null : (
                                <div className="flex items-start gap-1.5 leading-snug text-slate-600">
                                    <CircleDashed size={12} className="mt-0.5 shrink-0 text-slate-400" />
                                    <span><span className="text-slate-400">{r.statusLabel ?? r.monitorType}: </span><span className="font-semibold text-slate-700">{cur?.status || '—'}</span></span>
                                </div>
                            )}
                            {recordFields(r).map(f => (
                                <div key={f.key} className="leading-snug text-slate-700">
                                    <span className="text-slate-400">{f.label}: </span>
                                    <span className="font-semibold">{fieldValue(f, cur?.fields) || '—'}</span>
                                </div>
                            ))}
                            {(monitoringOn || isMulti || versionCount > 1) && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {monitoringOn && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                                            <Bell size={9} /> Monitoring on
                                        </span>
                                    )}
                                    {isMulti
                                        ? insts.length > 0 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{insts.length} {nounPl(insts.length)} · all active</span>
                                        : versionCount > 1 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{versionCount} records</span>}
                                </div>
                            )}
                        </div>
                    </td>
                )}
                {/* Status */}
                {visibleCols.has('status') && (
                    <td className="px-4 py-3.5"><StatusPill status={status} /></td>
                )}
                {/* Tracked — only where enablement applies (the aggregated Records view has no
                    single subject to enable a record FOR, so it passes no handler). */}
                {onEnabledChange && (
                    <td className={cn('sticky right-0 z-10 w-[92px] border-l border-slate-100 py-3.5 pl-4 pr-5 text-right align-top',
                        off ? 'bg-slate-50' : 'bg-white group-hover:bg-slate-50')}>
                        <RowEnableToggle enabled={enabled !== false} onChange={onEnabledChange} recordName={r.recordName} />
                    </td>
                )}
            </tr>

        </>
    );
}

// ── Record card — mobile / narrow-screen counterpart of RecordTableRow ──────────────
// Column-driven (mirrors visibleCols) so the Columns chooser affects it just like the table.
function RecordCard({ r, entry, visibleCols, onOpen, leadCell, enabled, onEnabledChange }: {
    r: SafetyRecord; entry: RecordDataEntry; visibleCols: Set<DataColId>;
    onOpen: () => void;
    /** Optional leading block (the aggregated "Records" view passes the Asset/Driver subject here). */
    leadCell?: ReactNode;
    /** Whether this subject tracks the record. Omitted where enablement does not apply. */
    enabled?: boolean;
    onEnabledChange?: (v: boolean) => void;
}) {
    const status = entryStatus(r, entry);
    const isMulti = !!r.multiInstance;
    const insts = instancesOf(entry);
    const noun = r.instanceNoun || 'document';
    const nounPl = (n: number) => (n === 1 ? noun : (noun.endsWith('y') ? noun.slice(0, -1) + 'ies' : noun + 's'));
    const cur = isMulti ? (insts[0]?.versions[0] ?? null) : currentVersion(entry);
    const versionCount = isMulti ? insts.length : entry.versions.length;
    const monitoringOn = isMulti ? insts.some(i => !!i.versions[0]?.monitoring?.enabled) : !!cur?.monitoring?.enabled;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
            className={cn('px-4 py-3.5 cursor-pointer hover:bg-slate-50/60 active:bg-slate-100 transition-colors',
                enabled === false && 'bg-slate-50/40 opacity-60')}
        >
            {leadCell !== undefined && <div className="mb-2.5">{leadCell}</div>}
            {/* Title + status */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900">{r.recordName}</span>
                        {r.custom && <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700"><Sparkles size={8} /> Custom</span>}
                    </div>
                    {r.description && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{r.description}</div>}
                </div>
                <div className="shrink-0 flex items-center gap-1.5 pt-0.5">
                    {visibleCols.has('status') && <StatusPill status={status} />}
                    {onEnabledChange && <RowEnableToggle enabled={enabled !== false} onChange={onEnabledChange} recordName={r.recordName} />}
                    <ChevronRight size={15} className="text-slate-300" />
                </div>
            </div>

            {/* Number / document chips */}
            {(r.numberName || r.documentName) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.numberName && (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-700"><Hash size={9} /> {r.numberName}</span>
                    )}
                    {r.documentName && (
                        <span className="inline-flex items-center gap-1 rounded bg-violet-50 border border-violet-200 px-1.5 py-0.5 text-[10px] font-medium text-violet-700"><FileText size={9} /> {r.documentName}</span>
                    )}
                </div>
            )}

            {/* Category / Record Type chips */}
            {(visibleCols.has('category') || visibleCols.has('type')) && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {visibleCols.has('category') && (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{CATEGORY_SHORT[r.category] ?? r.category}</span>
                    )}
                    {visibleCols.has('type') && (
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', RECORD_TYPE_TONE[r.type])}>{RECORD_TYPE_LABEL[r.type]}</span>
                    )}
                </div>
            )}

            {/* Monitoring values */}
            {visibleCols.has('monitoring') && (
                <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2 flex flex-col gap-1 text-[12px]">
                    {r.numberName && (
                        <div className="leading-snug text-slate-700"><span className="text-slate-400">{r.numberName}: </span><span className="font-semibold">{cur?.numberValue || '—'}</span></div>
                    )}
                    <div className="flex items-start gap-1.5 leading-snug text-slate-600">
                        {isDateMonitored(r) ? <CalendarClock size={12} className="mt-0.5 shrink-0 text-slate-400" /> : <CircleDashed size={12} className="mt-0.5 shrink-0 text-slate-400" />}
                        <span><span className="text-slate-400">{r.monitorType}: </span><span className="font-semibold text-slate-700">{isDateMonitored(r) ? (cur?.expiryDate || '—') : (cur?.status || '—')}</span></span>
                    </div>
                    {(monitoringOn || isMulti || versionCount > 1) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {monitoringOn && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600"><Bell size={9} /> Monitoring on</span>
                            )}
                            {isMulti
                                ? insts.length > 0 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{insts.length} {nounPl(insts.length)} · all active</span>
                                : versionCount > 1 && <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{versionCount} records</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Record detail page (MOTUS-style: header band + info block + tabs + document table) ──
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
    // The current one is whichever version is pinned; with none pinned it is the newest.
    const currentIn = (list: DocVersion[]) => (list.find(v => v.isCurrent) ?? list[0])?.id;
    if (record.multiInstance) {
        for (const inst of instancesOf(entry)) {
            const curId = currentIn(inst.versions);
            inst.versions.forEach(v => rows.push({ key: `${inst.id}-${v.id}`, instanceName: inst.name, instanceId: inst.id, version: v, isCurrent: v.id === curId }));
        }
    } else {
        const curId = currentIn(entry.versions);
        entry.versions.forEach(v => rows.push({ key: v.id, version: v, isCurrent: v.id === curId }));
    }
    return rows;
}

const Dash = () => <span className="font-normal text-slate-400">—</span>;

function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    return (
        <div className={cn('min-w-0', className ?? 'min-w-[8rem]')}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 text-[13px] font-semibold text-slate-800">{children}</div>
        </div>
    );
}

// ── A record is either THE current one or history ──
// There is nothing to pick from a list: the newest record is current, unless another one is
// explicitly pinned (DocVersion.isCurrent). Both values below are derived from that.
type DocState = 'current' | 'historical';
const DOC_STATE_META: Record<DocState, { label: string; tone: string; dot: string }> = {
    current: { label: 'Current', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    historical: { label: 'Historical', tone: 'border-slate-200 bg-slate-50 text-slate-500', dot: 'bg-slate-400' },
};
const DOC_STATE_ORDER: DocState[] = ['current', 'historical'];
const effectiveState = (isCurrent: boolean): DocState => (isCurrent ? 'current' : 'historical');
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
type DocStaticColId = 'insurer' | 'state' | 'issue' | 'expiry' | 'status' | 'tags' | 'notes' | 'document' | 'uploaded';
/** A record's own select fields get a column each, addressed as `sel:<field key>`. */
type DocColId = DocStaticColId | `sel:${string}`;
type DocSortCol = 'number' | 'policy' | 'version' | 'insurer' | 'state' | 'issue' | 'expiry' | 'status' | 'uploaded' | `sel:${string}`;
const DOC_STATIC_COLS: DocStaticColId[] = ['insurer', 'state', 'issue', 'expiry', 'status', 'tags', 'notes', 'document', 'uploaded'];
// Core columns that are always shown — cannot be toggled off (locked in the Columns menu).
const DOC_LOCKED_COLS: DocColId[] = ['state', 'document'];
// Insurance-only columns (shown only for multi-instance records).
const DOC_INSURANCE_COLS: DocColId[] = ['insurer'];
const DOC_COL_LABEL: Record<DocStaticColId, string> = {
    insurer: 'Insurance company',
    state: 'State', issue: 'Issue date', expiry: 'Expiry date', status: 'Status', tags: 'Tags', notes: 'Notes', document: 'Document', uploaded: 'Uploaded by',
};
const selKey = (id: DocColId) => (id.startsWith('sel:') ? id.slice(4) : '');
/** Plural of a filter's field name, for its "All …" option: a bare +'s' gave "All currencys"
 *  and "All statuss". Enough of a rule for field labels, which are short noun phrases. */
function pluralise(word: string): string {
    if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`;
    if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`;
    return `${word}s`;
}
/** Every column this record can show — the select-field columns sit next to the status they qualify. */
function docColsFor(record: SafetyRecord): DocColId[] {
    const sel = recordFields(record).map(f => `sel:${f.key}` as DocColId);
    const at = DOC_STATIC_COLS.indexOf('status') + 1;
    return [...DOC_STATIC_COLS.slice(0, at), ...sel, ...DOC_STATIC_COLS.slice(at)];
}
/** Default visibility — everything except Notes, which stays available in the Columns menu. */
const docDefaultColsFor = (record: SafetyRecord): DocColId[] => docColsFor(record).filter(c => c !== 'notes');
/** Column header, following the record's own wording (a drug test's status IS its "Test result"). */
function docColLabel(record: SafetyRecord, id: DocColId): string {
    if (id.startsWith('sel:')) return recordFields(record).find(f => f.key === selKey(id))?.label ?? 'Field';
    if (id === 'status') return record.statusLabel ?? DOC_COL_LABEL.status;
    // Named by the record wherever "Issue date" is not what the document calls it — a lease
    // starts, it is not issued. Read by the header AND the column picker, so both agree.
    if (id === 'issue') return record.issueLabel ?? DOC_COL_LABEL.issue;
    return DOC_COL_LABEL[id as DocStaticColId];
}
const DOC_TH_CLS = 'px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap';
function docSortValue(col: DocSortCol, row: DocRow, record: SafetyRecord): string {
    const v = row.version;
    switch (col) {
        case 'number': return (v.numberValue || '').toLowerCase();
        case 'policy': return (row.instanceName || '').toLowerCase();
        case 'version': return (v.label || '').toLowerCase();
        case 'state': return String(DOC_STATE_ORDER.indexOf(effectiveState(row.isCurrent))).padStart(2, '0');
        case 'issue': return v.issueDate || '';
        case 'expiry': return v.expiryDate || '';
        case 'status': return (v.status || '').toLowerCase();
        case 'insurer': return (v.insurer || '').toLowerCase();
        case 'uploaded': return `${v.uploadedBy || ''} ${v.uploadedAt || ''}`.toLowerCase();
        default: {
            if (!col.startsWith('sel:')) return '';
            const def = recordFields(record).find(f => f.key === selKey(col));
            return (def ? fieldValue(def, v.fields) : '').toLowerCase();
        }
    }
}
function docSearchBlob(row: DocRow, record: SafetyRecord): string {
    const v = row.version;
    return [v.numberValue, v.label, row.instanceName, v.insurer, v.status, DOC_STATE_META[effectiveState(row.isCurrent)].label, v.issueDate, v.expiryDate, v.uploadedBy, v.notes,
        recordFields(record).map(f => fieldValue(f, v.fields)).join(' '),
        v.tags.join(' '), v.files.map(f => f.name).join(' '), v.files.map(f => f.tag ?? '').join(' ')]
        .filter(Boolean).join(' ').toLowerCase();
}
/** All tags on a record — its version tags + every document tag (used for the tag filter + search). */
function rowAllTags(row: DocRow): string[] {
    return Array.from(new Set([...row.version.tags, ...row.version.files.map(f => f.tag).filter((t): t is string => !!t)]));
}
// Both of these are the shared list furniture (`ListChrome`) with this table's own vocabulary
// filled in. They stay as named wrappers because the call sites read better for it — and
// because there is then exactly one place where a heading or a column picker is drawn, which
// is the point: the insurance filings on the MC certificate are the same kind of list, and
// two hand-rolled copies drift.
/** Sortable header cell for the detail document table. */
function DocTh({ col, label, sortable, sort, onSort, className }: {
    col?: DocSortCol; label: string; sortable?: boolean;
    sort: SortState<DocSortCol> | null; onSort: (c: DocSortCol) => void; className?: string;
}) {
    return <SortTh col={col} label={label} sortable={sortable} sort={sort} onSort={onSort} className={className} />;
}
/** Column-visibility dropdown for the detail document table (lists only the columns that apply to this record). */
function DocColumnsDropdown({ record, cols, visible, onToggle }: { record: SafetyRecord; cols: DocColId[]; visible: Set<DocColId>; onToggle: (id: DocColId) => void }) {
    return (
        <ColumnPicker
            columns={cols.map(id => ({ id, label: docColLabel(record, id), locked: DOC_LOCKED_COLS.includes(id) }))}
            visible={visible} onToggle={onToggle} />
    );
}

/**
 * Shared documents/versions TABLE for one record — search / tag filter / sort / column-select /
 * pagination + a "Show history" toggle, an **Add** button that opens the record form (popup), and
 * per-row **Edit** / **Remove**. Handles multi-instance INSURANCE (one row per policy × version).
 * Rendered in TWO places: the record detail page's Documents tab, and INLINE inside the list's
 * expandable row. Reads `entry` live from the store, so Load-sample / Fill-demo data reflect here.
 */
function DocumentsTable({ record, entry, subjectId, setEntry, compact = false, subjectLabel, entity, onNavigate, showTitle = true, accountId }: {
    record: SafetyRecord; entry: RecordDataEntry; subjectId: string; setEntry: EntrySetter;
    compact?: boolean; subjectLabel?: string; entity?: EntityId; onNavigate?: (path: string) => void;
    /** The carrier — a record whose number is held once for the whole fleet reads it from there. */
    accountId?: string;
    /** False when a tab strip above already names this section. */
    showTitle?: boolean;
}) {
    const [includeHistory, setIncludeHistory] = useState(false);
    const [shareOpen, setShareOpen] = useState(false); // "Share to chat" (record-link) dialog
    // A clickable link back to THIS record (entity|subject|record) — clicking it in Messages reopens it here.
    const shareRef: RecordRef = {
        type: 'compliance',
        id: `${entity ?? 'Carrier'}|${subjectId}|${record.id}`,
        label: record.recordName,
        sublabel: `${subjectLabel ? `${subjectLabel} · ` : ''}${RECORD_TYPE_LABEL[record.type]}`,
        path: '/default-compliance-documents',
    };
    const [editing, setEditing] = useState<{ version: DocVersion; mode: 'add' | 'edit'; instanceId?: string; newPolicy?: boolean } | null>(null);
    const [docSearch, setDocSearch] = useState('');
    const [tagFilter, setTagFilter] = useState('all');
    const [docSort, setDocSort] = useState<{ col: DocSortCol; dir: 'asc' | 'desc' } | null>(null);
    const [visibleDocCols, setVisibleDocCols] = useState<Set<DocColId>>(() => new Set(docDefaultColsFor(record)));
    // Value filters over the record's own fields — the monitored status (e.g. Test result)
    // and each select field (e.g. Test type). Keyed 'status' + the field keys.
    const [valueFilters, setValueFilters] = useState<Record<string, string>>({});
    const setValueFilter = (k: string, val: string) => setValueFilters(prev => ({ ...prev, [k]: val }));
    const [docPageSize, setDocPageSize] = useState(25);
    const [docPage, setDocPage] = useState(1);
    const [pendingDelete, setPendingDelete] = useState<DocRow | null>(null); // → ConfirmDialog "are you sure?"
    const toggleDocSort = (col: DocSortCol) => setDocSort(prev => (prev && prev.col === col ? (prev.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));
    const toggleDocCol = (id: DocColId) => { if (DOC_LOCKED_COLS.includes(id)) return; setVisibleDocCols(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    useEffect(() => { setDocPage(1); }, [docSearch, tagFilter, valueFilters, docSort, docPageSize, includeHistory]);
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
    // Remove ONE uploaded document from a record (used by the per-document extra rows on insurance policies).
    const removeRowFile = (row: DocRow, fileIdx: number) => {
        const updated = { ...row.version, files: row.version.files.filter((_, i) => i !== fileIdx) };
        if (row.instanceId) {
            const instances = (entry.instances ?? []).map(inst => (inst.id === row.instanceId
                ? { ...inst, versions: inst.versions.map(x => (x.id === row.version.id ? updated : x)) } : inst));
            setEntry(subjectId, record.id, { ...entry, instances });
        } else {
            setEntry(subjectId, record.id, { ...entry, versions: entry.versions.map(x => (x.id === row.version.id ? updated : x)) });
        }
        emitToast('Document removed', 'success');
    };
    // Scoped single-version add / edit (opens VersionEditModal — "each row edit only shows that data").
    // A number the carrier holds once for the whole fleet — the auto liability policy on a
    // pink slip — starts filled in rather than retyped per vehicle. Still editable: a truck
    // insured separately says so by overtyping it.
    const freshVersion = () => ({
        ...blankVersion(record, nextVersionLabel(record, entry)),
        numberValue: prefilledNumberFor(record, accountId),
        monitoring: seedMonitoring(record), uploadedBy: currentUserName(),
    });
    // A carrier holds exactly one FEIN, so once it is on file there is nothing left to add:
    // Add closes rather than staying open to capture a second of a number that cannot have one.
    const atRecordLimit = !!record.singleRecord && entry.versions.length > 0;
    const startEdit = (row: DocRow) => setEditing({ version: row.version, mode: 'edit', instanceId: row.instanceId });
    const startAdd = () => setEditing({ version: freshVersion(), mode: 'add' });
    const startAddPolicy = () => setEditing({ version: freshVersion(), mode: 'add', newPolicy: true });
    const startAddToPolicy = (instanceId: string) => setEditing({ version: freshVersion(), mode: 'add', instanceId });
    /**
     * What to call a policy the user was never asked to name: the cover it carries. Two
     * policies of the same kind — a carrier changing insurer mid-term holds both — are told
     * apart by the insurer, because two rows both reading "Auto Liability" are not a list.
     */
    const policyNameFor = (v: DocVersion, ignoreId?: string): string => {
        const base = (record.nameFromField ? v.fields?.[record.nameFromField] : '')?.trim();
        if (!base) return `Policy ${(entry.instances?.length ?? 0) + 1}`;
        const taken = instancesOf(entry).some(i => i.id !== ignoreId && i.name.toLowerCase() === base.toLowerCase());
        return taken && v.insurer?.trim() ? `${base} — ${v.insurer.trim()}` : base;
    };
    const saveVersion = (saved: DocVersion, policyName?: string) => {
        if (!editing) return;
        // Exactly one record can be the pinned current one — pinning this one releases the rest.
        const onlyCurrent = (list: DocVersion[]): DocVersion[] =>
            (saved.isCurrent ? list.map(x => (x.id === saved.id || !x.isCurrent ? x : { ...x, isCurrent: undefined })) : list);
        if (editing.newPolicy) {
            // New insurance policy → a fresh instance holding this version as its current,
            // named after the cover it provides. A carrier can hold two of the same kind, so
            // a name already in use is qualified by the insurer rather than duplicated.
            const inst = { ...newInstance((policyName || '').trim() || policyNameFor(saved)), versions: [saved] };
            setEntry(subjectId, record.id, { ...entry, versions: [], instances: [...(entry.instances ?? []), inst] });
        } else if (editing.instanceId && editing.mode === 'add') {
            // Add-to-policy → prepend as that policy's new current.
            const instances = (entry.instances ?? []).map(inst => (inst.id === editing.instanceId
                ? { ...inst, versions: onlyCurrent([saved, ...inst.versions]) } : inst));
            setEntry(subjectId, record.id, { ...entry, instances });
        } else if (editing.instanceId) {
            // Edit an insurance version → update in place, or REASSIGN to another policy if the Policy field changed.
            const targetName = policyName?.trim();
            const curInst = (entry.instances ?? []).find(i => i.id === editing.instanceId);
            const samePolicy = !targetName || targetName.toLowerCase() === (curInst?.name ?? '').toLowerCase();
            const renamed = record.nameFromField && !policyName ? policyNameFor(saved, editing.instanceId) : null;
            if (samePolicy) {
                const instances = (entry.instances ?? []).map(inst => inst.id === editing.instanceId
                    ? { ...inst, name: targetName || renamed || inst.name, versions: onlyCurrent(inst.versions.map(x => (x.id === saved.id ? saved : x))) }
                    : inst);
                setEntry(subjectId, record.id, { ...entry, instances });
            } else {
                // Pull the version out of its current policy, then drop it into the target (existing by name, else new).
                let instances = (entry.instances ?? []).map(inst => inst.id === editing.instanceId
                    ? { ...inst, versions: inst.versions.filter(x => x.id !== saved.id) } : inst);
                const target = instances.find(i => i.name.toLowerCase() === targetName!.toLowerCase());
                instances = target
                    ? instances.map(i => (i.id === target.id ? { ...i, versions: onlyCurrent([saved, ...i.versions]) } : i))
                    : [...instances, { ...newInstance(targetName!), versions: [saved] }];
                instances = instances.filter(i => i.versions.length > 0);
                setEntry(subjectId, record.id, { ...entry, instances });
            }
        } else if (editing.mode === 'add') {
            setEntry(subjectId, record.id, { ...entry, versions: onlyCurrent([saved, ...entry.versions]) });
        } else {
            setEntry(subjectId, record.id, { ...entry, versions: onlyCurrent(entry.versions.map(x => (x.id === saved.id ? saved : x))) });
        }
        emitToast(editing.mode === 'add' ? 'Record added' : 'Changes saved');
        setEditing(null);
    };

    const isMulti = !!record.multiInstance;
    // Insurer / Producer / Policy Limit are insurance-only columns — shown for the SYSTEM insurance
    // records, never for custom records (custom multi-document is just "several documents", and its
    // table shows only the fields defined in its form).
    const isInsurance = isMulti && !record.customForm;
    const dated = isDateMonitored(record);
    const noun = record.instanceNoun || 'document'; // used for the insurance "Policy" column header
    const showNumber = !!record.numberName;
    const showIssue = !!record.tracksIssueDate;
    const showDate = dated;
    const showStatus = !dated && !record.hideStatus;
    const extraFieldDefs = recordFields(record);
    const selectFieldDefs = record.selectFields ?? [];
    const showCol = (id: DocColId) => (DOC_INSURANCE_COLS.includes(id) ? isInsurance : true) && (DOC_LOCKED_COLS.includes(id) || visibleDocCols.has(id));
    const applicableDocCols = docColsFor(record).filter(id =>
        DOC_INSURANCE_COLS.includes(id) ? isInsurance : id === 'issue' ? showIssue : id === 'expiry' ? showDate : id === 'status' ? showStatus : true);
    /** Values actually present in the data for one filter, so the dropdown never offers an empty result. */
    const presentValues = (get: (v: DocVersion) => string) =>
        Array.from(new Set(allRows.map(r => get(r.version)).filter(Boolean))).sort();

    const allRows = buildDocRows(record, entry);
    // Files across every version → attachments offered in the Share dialog (pdf / image / video).
    const shareItems = allRows.flatMap(r => r.version.files.map(f => ({ name: f.name, group: r.version.label })));
    // "History" = older/previous versions (position-based, newest = current). Independent of the controllable State field.
    const isCurrentRow = (r: DocRow) => r.isCurrent;
    const historyCount = allRows.filter(r => !isCurrentRow(r)).length;
    const tagOptions = Array.from(new Set(allRows.flatMap(rowAllTags))).sort();
    const baseRows = includeHistory ? allRows : allRows.filter(isCurrentRow);
    const q = docSearch.trim().toLowerCase();
    const filteredRows = baseRows.filter(r => {
        if (tagFilter !== 'all' && !rowAllTags(r).some(t => t.toLowerCase() === tagFilter.toLowerCase())) return false;
        if (valueFilters.status && r.version.status !== valueFilters.status) return false;
        for (const f of selectFieldDefs) {
            const want = valueFilters[f.key];
            if (want && (r.version.fields?.[f.key] ?? '') !== want) return false;
        }
        if (q && !docSearchBlob(r, record).includes(q)) return false;
        return true;
    });
    const sortedRows = docSort
        ? [...filteredRows].sort((a, b) => docSortValue(docSort.col, a, record).localeCompare(docSortValue(docSort.col, b, record), undefined, { numeric: true, sensitivity: 'base' }) * (docSort.dir === 'desc' ? -1 : 1))
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
                {showTitle ? (
                    <h3 className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
                        {isMulti ? 'Active filings' : 'Records'}
                        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{allRows.length}</span>
                    </h3>
                ) : <span />}
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Persistent "Show history" toggle — reveals older/historical versions; disabled when there are none yet. */}
                    <HistoryToggle on={includeHistory} onChange={setIncludeHistory} count={historyCount}
                        emptyTitle="No older records yet" />
                    <button type="button" onClick={() => setEntry(subjectId, record.id, buildDetailSample(record))} title="Populate this record with sample data (multiple documents)"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-violet-200 bg-violet-50 text-[12px] font-semibold text-violet-700 hover:bg-violet-100">
                        <Sparkles size={14} /> Sample data
                    </button>
                    <button type="button" onClick={isMulti ? startAddPolicy : startAdd} disabled={atRecordLimit}
                        title={atRecordLimit ? `Only one ${record.recordName} is held — edit the one on file`
                            : isMulti ? 'Add a new policy record' : 'Add a new record'}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                        <Plus size={14} /> Add record
                    </button>
                </div>
            </div>
            {allRows.length === 0 ? (
                <div className="px-5 py-14 text-center">
                    <div className="mx-auto mb-3 h-11 w-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><FileText size={20} /></div>
                    <p className="text-sm font-semibold text-slate-700">No records captured yet</p>
                    <p className="mt-1 text-[13px] text-slate-500">Use <span className="font-semibold text-slate-700">Add</span> to upload a document or record a number / date.</p>
                    <button type="button" onClick={isMulti ? startAddPolicy : startAdd} className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><UploadCloud size={15} /> Add record</button>
                </div>
            ) : (
                <>
                    {/* Toolbar — search + tag filter + column selector (hidden in compact/inline mode) */}
                    {!compact && (() => {
                        const statusOpts = showStatus ? (record.statusOptions ?? presentValues(v => v.status)) : [];
                        const statusLabel = record.statusLabel ?? 'Status';
                        const hasFilters = tagOptions.length > 0 || statusOpts.length > 0 || selectFieldDefs.length > 0;
                        return (
                            <ListToolbar
                                search={docSearch} onSearch={setDocSearch}
                                placeholder="Search records, numbers, tags, files…"
                                filters={hasFilters ? (
                                    <>
                                        {statusOpts.length > 0 && (
                                            <FilterSelect value={valueFilters.status ?? ''} onChange={v => setValueFilter('status', v)}
                                                title={`Filter by ${statusLabel.toLowerCase()}`} allLabel={`All ${pluralise(statusLabel.toLowerCase())}`} options={statusOpts} />
                                        )}
                                        {selectFieldDefs.map(f => (
                                            <FilterSelect key={f.key} value={valueFilters[f.key] ?? ''} onChange={v => setValueFilter(f.key, v)}
                                                title={`Filter by ${f.label.toLowerCase()}`} allLabel={`All ${pluralise(f.label.toLowerCase())}`} options={f.options} />
                                        ))}
                                        {tagOptions.length > 0 && (
                                            <FilterSelect value={tagFilter === 'all' ? '' : tagFilter} onChange={v => setTagFilter(v || 'all')}
                                                title="Filter by tag" allLabel="All tags" options={tagOptions} />
                                        )}
                                    </>
                                ) : undefined}
                                columns={<DocColumnsDropdown record={record} cols={applicableDocCols} visible={visibleDocCols} onToggle={toggleDocCol} />}
                            />
                        );
                    })()}
                    {pageRows.length === 0 ? (
                        <div className="px-5 py-12 text-center text-sm text-slate-500">No documents match your search / filters.</div>
                    ) : (
                        <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className={cn('w-full', isMulti ? 'min-w-[1400px]'
                                : extraFieldDefs.length >= 3 ? 'min-w-[1520px]'
                                : extraFieldDefs.length === 2 ? 'min-w-[1400px]'
                                : extraFieldDefs.length === 1 ? 'min-w-[1280px]' : 'min-w-[1160px]')}>
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr>
                                        {showNumber && <DocTh col="number" label={record.numberName} sortable sort={docSort} onSort={toggleDocSort} className="pl-5" />}
                                        {isMulti && <DocTh col="policy" label={noun.charAt(0).toUpperCase() + noun.slice(1)} sortable sort={docSort} onSort={toggleDocSort} className={cn(!showNumber && 'pl-5')} />}
                                        {showCol('insurer') && <DocTh col="insurer" label="Insurance company" sortable sort={docSort} onSort={toggleDocSort} />}
                                                                                <DocTh col="version" label="Record" sortable sort={docSort} onSort={toggleDocSort} className={cn(!showNumber && !isMulti && 'pl-5')} />
                                        {showCol('state') && <DocTh col="state" label="State" sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showIssue && showCol('issue') && <DocTh col="issue" label={docColLabel(record, 'issue')} sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showDate && showCol('expiry') && <DocTh col="expiry" label="Expiry date" sortable sort={docSort} onSort={toggleDocSort} />}
                                        {showStatus && showCol('status') && <DocTh col="status" label={docColLabel(record, 'status')} sortable sort={docSort} onSort={toggleDocSort} />}
                                        {extraFieldDefs.map(f => showCol(`sel:${f.key}`) && (
                                            <DocTh key={f.key} col={`sel:${f.key}`} label={f.label} sortable sort={docSort} onSort={toggleDocSort} />
                                        ))}
                                        {showCol('tags') && <DocTh label="Tags" sort={docSort} onSort={toggleDocSort} />}
                                        {showCol('notes') && <DocTh label="Notes" sort={docSort} onSort={toggleDocSort} />}
                                        {showCol('document') && <DocTh label="Document" sort={docSort} onSort={toggleDocSort} />}
                                        {showCol('uploaded') && <DocTh col="uploaded" label="Uploaded by" sortable sort={docSort} onSort={toggleDocSort} />}
                                        <th className={cn(DOC_TH_CLS, 'pr-5 text-right')}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.flatMap(row => {
                                        const v = row.version;
                                        const st = effectiveState(row.isCurrent);
                                        // Insurance policies with several documents → one row per document (primary row + "extra" rows).
                                        const splitDocs = isMulti && showCol('document') && v.files.length > 1;
                                        const trs: ReactNode[] = [];
                                        trs.push(
                                            <tr key={row.key} className={cn('align-top', splitDocs ? '' : 'border-b border-slate-100', st === 'current' ? 'bg-emerald-50/40' : 'hover:bg-slate-50/50')}>
                                                {showNumber && <td className={cn('px-4 py-3 whitespace-nowrap text-[13px] font-semibold text-slate-800', 'pl-5')}>{v.numberValue || <span className="font-normal text-slate-400">—</span>}</td>}
                                                {isMulti && <td className={cn('px-4 py-3 whitespace-nowrap text-[13px] font-semibold text-slate-800', !showNumber && 'pl-5')}>{row.instanceName || '—'}</td>}
                                                {showCol('insurer') && <td className="px-4 py-3 text-[13px] text-slate-700 whitespace-nowrap">{v.insurer || <span className="text-slate-400">—</span>}</td>}
                                                <td className={cn('px-4 py-3 whitespace-nowrap', !showNumber && !isMulti && 'pl-5')}>
                                                    <span className="text-[13px] font-medium text-slate-700">{v.label}</span>
                                                </td>
                                                {showCol('state') && <td className="px-4 py-3 whitespace-nowrap"><StateBadge state={st} multi={isMulti} /></td>}
                                                {showIssue && showCol('issue') && <td className="px-4 py-3 text-[13px] text-slate-700 whitespace-nowrap">{v.issueDate || <span className="text-slate-400">—</span>}</td>}
                                                {showDate && showCol('expiry') && <td className="px-4 py-3 text-[13px] text-slate-700 whitespace-nowrap">{v.expiryDate || <span className="text-slate-400">—</span>}</td>}
                                                {showStatus && showCol('status') && <td className="px-4 py-3 whitespace-nowrap">{v.status ? <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{v.status}</span> : <span className="text-[13px] text-slate-400">—</span>}</td>}
                                                {extraFieldDefs.map(f => {
                                                    if (!showCol(`sel:${f.key}`)) return null;
                                                    const text = fieldValue(f, v.fields);
                                                    // The reference of the record this one was filed from opens it (see
                                                    // `fieldSourceLink`); every other field is plain text, as before.
                                                    const link = onNavigate ? fieldSourceLink(f, v) : null;
                                                    return (
                                                        <td key={f.key} className="px-4 py-3 text-[13px] text-slate-700">
                                                            {!text ? <span className="text-slate-400">—</span>
                                                                : link ? (
                                                                    <button type="button" onClick={() => openSourceLink(link, onNavigate!)}
                                                                        title={link.id ? `Open the ${link.source.toLowerCase()} this record was filed from` : `Open ${link.source}`}
                                                                        className="inline-flex max-w-[15rem] items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                                                        <span className="truncate">{text}</span>
                                                                        <ExternalLink size={11} className="shrink-0" />
                                                                    </button>
                                                                ) : <span className="block max-w-[15rem] truncate" title={text}>{text}</span>}
                                                        </td>
                                                    );
                                                })}
                                                {showCol('tags') && (
                                                    <td className="px-4 py-3">
                                                        {/* Insurance is tagged per document — never show record-level tags on its rows. */}
                                                        <DocTagsCell recordTags={isMulti ? [] : v.tags} docTag={v.files[0]?.tag} />
                                                    </td>
                                                )}
                                                {showCol('notes') && (
                                                    <td className="px-4 py-3">
                                                        {v.notes ? <span className="block max-w-[220px] truncate text-[12px] text-slate-600" title={v.notes}>{v.notes}</span> : <span className="text-[13px] text-slate-400">—</span>}
                                                    </td>
                                                )}
                                                {showCol('document') && (
                                                    <td className="px-4 py-3">
                                                        <div className="max-w-[260px]"><DocFilesCell files={splitDocs ? [v.files[0]] : v.files} showTag={false} /></div>
                                                    </td>
                                                )}
                                                {showCol('uploaded') && <UploaderCell name={v.uploadedBy} at={v.uploadedAt} />}
                                                <td className="px-4 py-3 pr-5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {isMulti && row.isCurrent && row.instanceId && (
                                                            <button type="button" onClick={() => startAddToPolicy(row.instanceId!)} title="Add a renewal record to this policy"
                                                                className="inline-flex h-8 items-center gap-1 px-2 rounded-lg border border-blue-200 bg-blue-50 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"><Plus size={13} /> Record</button>
                                                        )}
                                                        <button type="button" onClick={() => startEdit(row)} title="Edit this record"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"><Pencil size={14} /></button>
                                                        <button type="button" onClick={() => setPendingDelete(row)} title="Remove this record"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={14} /></button>
                                                        <KebabMenu title="More actions" items={[{ label: 'Share to chat', icon: Share2, onClick: () => setShareOpen(true) }]} />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                        if (splitDocs) {
                                            const cellPad = 'px-4 py-2';
                                            v.files.slice(1).forEach((f, k) => {
                                                const idx = k + 1;
                                                const last = idx === v.files.length - 1;
                                                trs.push(
                                                    <tr key={`${row.key}-doc${idx}`} className={cn('align-top', last && 'border-b border-slate-100', st === 'current' ? 'bg-emerald-50/20' : 'bg-slate-50/30')}>
                                                        {showNumber && <td className={cn(cellPad, 'pl-5')} />}
                                                        {isMulti && <td className={cn(cellPad, !showNumber && 'pl-5')} />}
                                                        {showCol('insurer') && <td className={cellPad} />}
                                                        <td className={cn(cellPad, 'whitespace-nowrap', !showNumber && !isMulti && 'pl-5')}>
                                                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><CornerDownRight size={12} /> Document {idx + 1}</span>
                                                        </td>
                                                        {showCol('state') && <td className={cellPad} />}
                                                        {showIssue && showCol('issue') && <td className={cellPad} />}
                                                        {showDate && showCol('expiry') && <td className={cellPad} />}
                                                        {showStatus && showCol('status') && <td className={cellPad} />}
                                                        {extraFieldDefs.map(f => showCol(`sel:${f.key}`) && <td key={f.key} className={cellPad} />)}
                                                        {showCol('tags') && <td className={cellPad}><DocTagsCell recordTags={[]} docTag={f.tag} /></td>}
                                                        {showCol('notes') && <td className={cellPad} />}
                                                        {showCol('document') && (
                                                            <td className={cellPad}>
                                                                <div className="max-w-[260px]"><DocFilesCell files={[f]} showTag={false} /></div>
                                                            </td>
                                                        )}
                                                        {showCol('uploaded') && <td className={cellPad} />}
                                                        <td className={cn(cellPad, 'pr-5')}>
                                                            <div className="flex items-center justify-end">
                                                                <button type="button" onClick={() => removeRowFile(row, idx)} title="Remove this document"
                                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={13} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        }
                                        return trs;
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile card list — the table becomes stacked cards on small screens */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {pageRows.map(row => {
                                const v = row.version;
                                const st = effectiveState(row.isCurrent);
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
                                                    <button type="button" onClick={() => startAddToPolicy(row.instanceId!)} title="Add a renewal record to this policy"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"><Plus size={15} /></button>
                                                )}
                                                <button type="button" onClick={() => startEdit(row)} title="Edit this record"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"><Pencil size={14} /></button>
                                                <button type="button" onClick={() => setPendingDelete(row)} title="Remove this record"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"><Trash2 size={14} /></button>
                                                <KebabMenu title="More actions" items={[{ label: 'Share to chat', icon: Share2, onClick: () => setShareOpen(true) }]} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {isInsurance && <MobileFact label="Insurer" value={v.insurer} />}
                                            {showIssue && <MobileFact label={docColLabel(record, 'issue')} value={v.issueDate} />}
                                            {showDate && <MobileFact label="Expiry date" value={v.expiryDate} />}
                                            {showStatus && <MobileFact label={record.statusLabel ?? 'Status'} value={v.status} />}
                                            {extraFieldDefs.map(f => <MobileFact key={f.key} label={f.label} value={fieldValue(f, v.fields)} />)}
                                            <MobileFact label="Uploaded by" value={v.uploadedBy} />
                                        </div>
                                        {v.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {v.tags.map(t => <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium', tagColor(t))}><Tag size={9} /> {t}</span>)}
                                            </div>
                                        )}
                                        {v.notes && (
                                            <div>
                                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Notes</div>
                                                <p className="text-[12px] text-slate-600">{v.notes}</p>
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
                        <TablePager page={docSafePage} pageSize={docPageSize} total={totalDocs}
                            onPage={setDocPage} onPageSize={n => { setDocPageSize(n); setDocPage(1); }} />
                    )}
                </>
            )}
            {editing && (
                <VersionEditModal
                    record={record}
                    subjectLabel={subjectLabel}
                    version={editing.version}
                    mode={editing.mode}
                    // The Policy select appears when creating a policy or moving a version to
                    // another one — but NOT on a record that names itself from a field, which
                    // names its policies from it too: "Motor Truck Cargo" IS the policy, so
                    // asking the user to invent a name for it is asking twice.
                    askPolicyName={(!!editing.newPolicy || (isMulti && editing.mode === 'edit')) && !record.nameFromField}
                    initialPolicyName={editing.instanceId ? (instancesOf(entry).find(i => i.id === editing.instanceId)?.name ?? '') : ''}
                    policyOptions={Array.from(new Set(instancesOf(entry).map(i => i.name)))}
                    policyPrefills={(() => { const m: Record<string, DocVersion> = {}; for (const i of instancesOf(entry)) { const c = i.versions[0]; if (c) m[i.name] = c; } return m; })()}
                    onSave={saveVersion}
                    onClose={() => setEditing(null)}
                    onNavigate={onNavigate}
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
            {shareOpen && (
                <ShareToChat
                    open={shareOpen}
                    onClose={() => setShareOpen(false)}
                    title={`Share ${record.recordName}`}
                    subtitle="Send the record + its documents in a chat, or to an outsider by email"
                    source={{ type: 'manual', id: shareRef.id, label: record.recordName }}
                    items={shareItems}
                    record={shareRef}
                    defaultChannel="in-app"
                    defaultSubject={record.recordName}
                    currentUserName={currentUserName()}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate?.('/messages'); }}
                />
            )}
        </>
    );
}

type DetailTab = 'documents' | 'monitoring' | 'insurance' | 'agent';
function RecordDetailPage({ record, entry, entity, subjectLabel, subjectId, setEntry, onBack, detailExtra, onNavigate, showSubject = true, accountId }: {
    record: SafetyRecord; entry: RecordDataEntry; entity: EntityId; subjectLabel: string;
    subjectId: string; setEntry: EntrySetter;
    /** The carrier — the broker of record on an insurance policy belongs to it, not to a policy. */
    accountId?: string;
    onBack: () => void;
    detailExtra?: ReactNode;
    onNavigate?: (path: string) => void;
    /** Embedded in a driver / asset profile the subject is already named in the page header. */
    showSubject?: boolean;
}) {
    const [tab, setTab] = useState<DetailTab>('documents');
    // ── Pinned identity bar ──
    // The title bar sticks to the top of whatever container scrolls this page (this view is
    // embedded in the driver / asset profile as often as it is standalone), so "Back to list"
    // and the record's identity stay reachable while the document list scrolls past. The bar's
    // HEIGHT never changes — only its shadow and bottom corners. That matters: collapsing a
    // header shortens the content, which on a short page drops the scroll maximum below where
    // the user already is, the browser clamps scrollTop, the header re-expands, and the page
    // fights every scroll. A purely cosmetic change can't do that. The facts below the bar are
    // an ordinary block that simply scrolls away.
    // One sentinel answers both questions: has the view started scrolling (the bar's shadow),
    // and has it gone far enough that the facts should give the table their room back.
    const { ref: topSentinel, barRef, condensed, stuck } = useCondensingAnchor();
    // Records with nothing to alert on carry no monitoring anywhere — no tab, no summary row.
    const showMonitoring = !record.hideMonitoring;
    const status = entryStatus(record, entry);
    const isMulti = !!record.multiInstance;
    const cur = isMulti ? (instancesOf(entry)[0]?.versions[0] ?? null) : currentVersion(entry);
    // The facts below describe the CURRENT document, so they read the record as that document's
    // own kind — an incorporation certificate shows its issue date and no expiry, a business
    // licence the reverse. The tabs and the monitoring summary stay on the whole record.
    const curRec = recordForFields(record, cur?.fields);
    const dated = isDateMonitored(curRec);
    const cfg = cur?.monitoring;
    const monitoringOn = isMulti ? instancesOf(entry).some(i => !!i.versions[0]?.monitoring?.enabled) : !!cfg?.enabled;
    const monitoredDate = cur && cfg ? monitoredDateFor(cfg, cur) : '';
    const EntityIcon = ENTITY_ICON[entity];
    const noun = record.instanceNoun || 'document';
    const showNumber = !!record.numberName;
    const docCount = buildDocRows(record, entry).length;
    /**
     * The MC certificate is two things at once: the document the office filed, and a federal
     * authority whose status, required insurance and insurance filings only FMCSA can answer
     * for. The number on the record is what joins them, so the lookup reads from the current
     * record — and from the newest one filed if that has none.
     */
    const isMc = record.id === 'mc';
    const isInsurance = record.id === 'insurance';
    const mcNumber = isMc
        ? (cur?.numberValue?.trim() || entry.versions.find(v => v.numberValue?.trim())?.numberValue?.trim() || '')
        : '';
    const detailTabs: [DetailTab, string][] = isMc
        ? [['documents', 'Documents'], ['insurance', 'Insurance details'], ['agent', 'Process Agent (BOC-3) Details']]
        : [['documents', isMulti ? `${noun.charAt(0).toUpperCase() + noun.slice(1)} filings` : 'Records'], ['monitoring', 'Monitoring']];
    const showTabs = isMc || showMonitoring;

    return (
        // No `space-y` here: the identity bar and the current-record block must sit flush as
        // ONE card, and the bar has to stay a direct child of this element — wrapping the two
        // in a sub-div would make that wrapper the sticky containing block, un-pinning the bar
        // as soon as the block scrolled past. Spacing is therefore set per child.
        <div>
            {/* Scroll sentinel — tells the bar below when it has become pinned. */}
            <div ref={topSentinel} aria-hidden className="h-px" />
            {/* Identity bar — pinned, fixed height. Back to list and the record's name stay
                reachable for the whole page. */}
            <div ref={barRef} className={cn('sticky top-0 z-20 flex items-center gap-3 rounded-t-xl border border-slate-200 bg-white px-4 transition-shadow duration-200',
                HEADER_TRANSITION,
                // The bar tightens as the block below it folds, so the two read as one movement
                // — the header travelling up and out of the way — rather than as a panel
                // vanishing from under a bar that did not react.
                condensed ? 'py-1.5' : 'py-2.5',
                // Pinned, it is a card floating over the list, so it closes on all four corners.
                // The block below rounds its own top in the same breath — rounding only the bar
                // would leave the block's square corners poking out of the notch.
                stuck ? 'rounded-b-xl shadow-md' : 'shadow-sm')}>
                <button type="button" onClick={onBack} title="Back to list"
                    className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white pl-1.5 pr-2.5 text-[12px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">
                    <ChevronLeft size={15} /> <span className="hidden sm:inline">Back to list</span>
                </button>
                <span aria-hidden className="h-6 w-px shrink-0 bg-slate-200" />
                <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600', HEADER_TRANSITION,
                    condensed ? 'h-7 w-7' : 'h-9 w-9')}>
                    <FileText size={condensed ? 15 : 18} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="truncate text-[15px] font-bold leading-tight text-slate-900">{record.recordName}</h2>
                        {record.custom && <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700"><Sparkles size={10} /> Custom</span>}
                        {/* Condensed, the facts below are gone — so the ones that say whether
                            this record is in order come up here beside the name. */}
                        {condensed && cur && (
                            <span className="hidden min-w-0 items-center gap-2 sm:flex">
                                <span aria-hidden className="h-3.5 w-px shrink-0 bg-slate-200" />
                                <span className="truncate text-[12px] font-semibold text-slate-500">{cur.numberValue || cur.label}</span>
                            </span>
                        )}
                        {condensed && isMc && <McAuthorityFacts mcNumber={mcNumber} condensed />}
                        {condensed && isInsurance && <InsuranceBrokerFacts accountId={accountId} condensed />}
                    </div>
                    {/* Whose record this is and what kind of record it is — one muted line
                        under the name. Both used to be facts in the block below, where they
                        sat among the captured values looking like two more of them. */}
                    {!condensed && (
                        <p className="flex min-w-0 items-center gap-1.5 truncate text-[12px] text-slate-500">
                            {showSubject && (
                                <>
                                    <EntityIcon size={12} className="shrink-0 text-slate-400" />
                                    <span className="truncate font-semibold text-slate-600">{subjectLabel}</span>
                                    <span aria-hidden className="text-slate-300">·</span>
                                </>
                            )}
                            <span className="truncate">{record.description || RECORD_TYPE_LABEL[record.type]}</span>
                        </p>
                    )}
                </div>
                {/* The classification, kept out of the way at the end of the bar: it never
                    changes, and it is the last thing anyone comes to this page for. It gives
                    up its place first — below a wide screen, and while the bar is condensed,
                    the record's own name and subject need the room more. */}
                <p className={cn('hidden min-w-0 max-w-[18rem] shrink truncate text-right text-[11px] text-slate-400', !condensed && 'xl:block')}
                    title={`${RECORD_TYPE_LABEL[record.type]} · ${CATEGORY_SHORT[record.category] ?? record.category} · ${record.jurisdiction}`}>
                    {RECORD_TYPE_LABEL[record.type]} · {CATEGORY_SHORT[record.category] ?? record.category} · {record.jurisdiction}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                    <StatusPill status={status} />
                </div>
            </div>
            {/* Current record — the values actually captured on the newest version, joined
                flush to the bar above. The facts flow instead of sitting on a fixed grid: the
                field set varies per record, and a grid left dead cells on every odd count. */}
            {/*
                Folding away as the page scrolls, on a REAL height rather than a max-height.
                A max-height animation has to be given a number bigger than the block can ever
                be, so most of the transition is spent shrinking through empty space and the
                fold only becomes visible at the end — it reads as a snap. A grid whose single
                row goes from `1fr` to `0fr` interpolates the row's actual height, so the block
                travels the whole way and the content slides up under the pinned bar with it.
            */}
            <div className={cn('grid rounded-b-xl border border-slate-200 bg-white shadow-sm',
                'transition-[grid-template-rows,opacity,box-shadow] duration-300 ease-out',
                // At rest it is the bottom half of the bar's card — no top edge of its own.
                // Once the bar detaches, it becomes a card in its own right and closes its top.
                stuck ? 'rounded-t-xl border-t' : 'border-t-0',
                condensed ? 'grid-rows-[0fr] border-b-0 opacity-0' : 'grid-rows-[1fr] opacity-100')}>
                <div className={cn('overflow-hidden', HEADER_TRANSITION,
                    // A short lift as it goes, so the block reads as tucking up behind the bar
                    // rather than as a panel being squashed flat.
                    condensed && '-translate-y-1')}>
                {cur ? (
                    // The values captured on the record — and nothing that merely says what
                    // page you are on. The record's name, its subject and its classification
                    // are all in the bar above; repeating them here as facts was three rows of
                    // header before the first real value.
                    <div className="flex flex-wrap gap-x-8 gap-y-3 px-4 py-3">
                        {showNumber && <Fact label={curRec.numberName}>{cur.numberValue || <Dash />}</Fact>}
                        {recordFields(curRec).map(f => {
                            const text = fieldValue(f, cur.fields);
                            const link = onNavigate ? fieldSourceLink(f, cur) : null;
                            return (
                                <Fact key={f.key} label={f.label} className="min-w-[10rem] max-w-[16rem]">
                                    {!text ? <Dash />
                                        : link ? (
                                            <button type="button" onClick={() => openSourceLink(link, onNavigate!)}
                                                title={link.id ? `Open the ${link.source.toLowerCase()} this record was filed from` : `Open ${link.source}`}
                                                className="inline-flex max-w-full items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                                                <span className="truncate">{text}</span>
                                                <ExternalLink size={11} className="shrink-0" />
                                            </button>
                                        ) : <span className="block truncate" title={text}>{text}</span>}
                                </Fact>
                            );
                        })}
                        {(dated || !curRec.hideStatus) && (
                            <Fact label={(dated ? curRec.monitorType : curRec.statusLabel ?? curRec.monitorType) || (dated ? 'Monitored date' : 'Status')}>
                                {dated ? (monitoredDate || <Dash />) : (cur.status || <Dash />)}
                            </Fact>
                        )}
                        {curRec.tracksIssueDate && <Fact label={curRec.issueLabel ?? 'Issue date'}>{cur.issueDate || <Dash />}</Fact>}
                        <Fact label="Document" className="min-w-[12rem] max-w-[20rem]">
                            {cur.files.length === 0
                                ? <span className="font-normal text-amber-600">No document</span>
                                : <span className="block truncate" title={cur.files.map(f => f.name).join(', ')}>{cur.files[0].name}{cur.files.length > 1 ? ` +${cur.files.length - 1}` : ''}</span>}
                        </Fact>
                        {showMonitoring && !curRec.hideMonitoring && (
                            <Fact label="Monitoring">
                                {monitoringOn && cfg
                                    ? <span className="inline-flex items-center gap-1 text-blue-600"><Bell size={12} /> On · {basisLabel(curRec, cfg.basis)}</span>
                                    : <span className="font-normal text-slate-400">Off</span>}
                            </Fact>
                        )}
                        <Fact label="Last updated" className="min-w-[11rem]">
                            <span className="block truncate">
                                {cur.uploadedBy || 'Unknown'}
                                <span className="font-normal text-slate-400"> · {fmtDateTime(cur.uploadedAt)}</span>
                            </span>
                        </Fact>
                    </div>
                ) : (
                    <div className="px-4 py-5 text-center">
                        <p className="text-[13px] font-semibold text-slate-600">Nothing captured yet</p>
                        <p className="mt-0.5 text-[12px] text-slate-400">Add a record below to fill in this record’s details.</p>
                    </div>
                )}
                {/* The authority as FMCSA holds it — status, the insurance it requires and the
                    BOC-3 agent on file. Part of THIS header, not a second one: it describes the
                    same authority the facts above were captured for, and two stacked header
                    cards saying "MC-103478" pushed the actual records off the screen. */}
                {isMc && <McAuthorityFacts mcNumber={mcNumber} />}
                {/* Who placed the cover. Part of THIS header for the same reason the MC
                    authority is: it describes every policy listed below, so saying it once
                    above them beats repeating it — differently — on each one. */}
                {isInsurance && <InsuranceBrokerFacts accountId={accountId} />}
                </div>
            </div>

            {/* Optional extra section (e.g. DQ "Fill out the form" card) */}
            {detailExtra && <div className="mt-4">{detailExtra}</div>}

            {/* The tabbed body. With one section there is no tab strip — the table's own
                header is the heading. The strip itself is the app's standard one (`SubTabs`):
                same underline, same count badges, same scrolling rail as every other tab bar,
                so a record's tabs are not a second thing to learn. */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {showTabs && (
                    <SubTabs
                        className="px-2"
                        size="sm"
                        activeId={tab}
                        onChange={id => setTab(id as DetailTab)}
                        tabs={detailTabs.map(([id, label]) => ({
                            id, label, count: id === 'documents' ? docCount : undefined,
                        }))}
                    />
                )}

                {tab === 'insurance' && isMc ? (
                    <McInsuranceTab mcNumber={mcNumber} />
                ) : tab === 'agent' && isMc ? (
                    <McProcessAgentTab mcNumber={mcNumber} />
                ) : tab === 'monitoring' && showMonitoring ? (
                    <MonitoringCalendarTab record={record} cfg={cfg ?? undefined} monitoredDate={monitoredDate} monitoringOn={monitoringOn} />
                ) : (
                    <DocumentsTable record={record} entry={entry} subjectId={subjectId} setEntry={setEntry} subjectLabel={subjectLabel} entity={entity} onNavigate={onNavigate} showTitle={!showTabs} accountId={accountId} />
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
        <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:gap-3 sm:px-4 sm:py-3.5">
            <div className="min-w-0">
                {/* Wraps rather than truncates — see `KpiStatCard`. */}
                <div className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:text-[11px] sm:tracking-wider">{label}</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900 tabular-nums sm:text-2xl">{value}</div>
            </div>
            <div className={cn('hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex sm:h-9 sm:w-9', ACCENT[accent] ?? ACCENT.slate)}>
                <Icon size={18} />
            </div>
        </div>
    );
}

/** Deterministic demo fill for a SINGLE version (mirrors Load-sample / ManageModal's fillV). */
export function fillVersionDemo(record: SafetyRecord, v: DocVersion): DocVersion {
    const { country, stateProv } = sampleJurisdiction(record);
    const merged: DocVersion = {
        ...v,
        numberValue: record.numberName ? sampleNumber(record) : v.numberValue,
        country, stateProv,
        issueDate: record.tracksIssueDate ? '2024-01-15' : v.issueDate,
        expiryDate: isDateMonitored(record) ? (record.configuredDate ?? '2026-12-31') : v.expiryDate,
        status: capturesStatus(record) ? (v.status || sampleStatus(record)) : '',
        fields: { ...sampleFields(record), ...v.fields },
        tags: record.multiInstance ? [] : (v.tags.length ? v.tags : ['Verified', 'Primary']),
        monitoring: { ...v.monitoring, enabled: !record.hideMonitoring },
    };
    if (record.multiInstance) {
        merged.insurer = v.insurer || 'Northbridge Insurance';
        // Motor truck cargo is the policy that carries the two optional covers, so the demo
        // data exercises the conditional limit rather than leaving it permanently hidden.
        const cargo = merged.fields?.insuranceType === 'Motor Truck Cargo';
        merged.fields = {
            ...merged.fields,
            ...(cargo ? { nonOwnedTrailer: CHECKED, reeferBreakdown: CHECKED, nonOwnedLimit: '500,000', nonOwnedCurrency: 'CAD' } : {}),
        };
    }
    if (record.type !== 'C' && record.docRequirement !== 'none' && merged.files.length === 0) merged.files = sampleDocFiles(record);
    // Insurance documents are tagged individually — give each demo document a system tag.
    if (record.multiInstance) merged.files = merged.files.map((f, idx) => (f.tag ? f : { ...f, tag: ['Certificate', 'Endorsement', 'Declaration page', 'Schedule of coverage'][idx] ?? 'Supporting document' }));
    return merged;
}

/** Compact monitoring on/off toggle + reminders/channels for one version (used inside the version form). */
/** The control for one of a record's extra fields — a dropdown, radios, a date, a computed
 *  read-out, a text area or a single line. `value` for a derived field is already computed. */
function ExtraFieldInput({ def, value, onChange, inputCls, name, currency, onCurrency }: {
    def: RecordFieldDef; value: string; onChange: (v: string) => void; inputCls: string; name: string;
    /** For a money field only — the currency the amount is in, and how to change it. */
    currency?: string; onCurrency?: (v: string) => void;
}) {
    // Calculated from other fields — shown, never typed, so there is nothing to edit and
    // nothing to store: it is recomputed from its dates on every render.
    if (def.kind === 'derived') {
        return (
            <div className={cn(inputCls, 'flex items-center bg-slate-50 font-medium text-slate-600')}>
                {value || <span className="font-normal text-slate-400">{def.hint ?? 'Calculated automatically'}</span>}
            </div>
        );
    }
    if (def.kind === 'date') {
        return <input type="date" value={value} onChange={e => onChange(e.target.value)} className={inputCls} />;
    }
    if (def.kind === 'select') {
        // A short either/or set reads better fully visible than hidden behind a dropdown.
        if (def.control === 'radio') {
            return <RadioChoice name={name} value={value} options={def.options} onChange={onChange} />;
        }
        return (
            <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
                <option value="">{def.placeholder ?? `Select ${def.label.toLowerCase()}`}</option>
                {def.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        );
    }
    if (def.kind === 'check') {
        // Rendered by the form as a row of its own (see `CheckRow`) — this branch exists so
        // every field kind has one and the union stays exhaustive.
        return <CheckRow label={def.label} hint={def.hint} checked={value === CHECKED} onChange={on => onChange(on ? CHECKED : '')} />;
    }
    if (def.multiline) {
        return (
            <textarea value={value} onChange={e => onChange(e.target.value)} rows={2}
                placeholder={def.placeholder ?? `Enter ${def.label.toLowerCase()}`}
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        );
    }
    if (def.money) {
        return (
            <MoneyInput value={value} onChange={onChange} placeholder={def.placeholder}
                currencies={def.money.currencies} currency={currency ?? ''} onCurrency={onCurrency ?? (() => {})} />
        );
    }
    return (
        <input value={value} onChange={e => onChange(e.target.value)}
            placeholder={def.placeholder ?? `Enter ${def.label.toLowerCase()}`} className={inputCls} />
    );
}

/**
 * An amount and the currency it is in, as one control.
 *
 * Two separate fields let a policy be filed with a limit and no currency — which on a
 * cross-border carrier is not a limit at all, since 2,000,000 CAD and 2,000,000 USD are
 * different answers to "does this meet the US minimum". Joined, the currency is never the
 * field someone forgot.
 */
function MoneyInput({ value, onChange, placeholder, currencies, currency, onCurrency }: {
    value: string; onChange: (v: string) => void; placeholder?: string;
    currencies: string[]; currency: string; onCurrency: (v: string) => void;
}) {
    return (
        <div className="flex h-9 w-full overflow-hidden rounded-lg border border-slate-300 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/30">
            <span className="flex shrink-0 items-center pl-3 pr-1 text-sm text-slate-400">$</span>
            <input value={value} onChange={e => onChange(e.target.value)} inputMode="decimal"
                placeholder={placeholder ?? 'e.g. 2,000,000'}
                className="min-w-0 flex-1 bg-transparent pr-2 text-sm tabular-nums focus:outline-none" />
            <select value={currency} onChange={e => onCurrency(e.target.value)} aria-label="Currency"
                className="shrink-0 border-l border-slate-200 bg-slate-50 px-2 text-[12px] font-semibold text-slate-600 focus:outline-none">
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
    );
}

/** A yes/no the record captures — the whole row is the target, so it is easy to hit. */
function CheckRow({ label, hint, checked, onChange }: {
    label: string; hint?: string; checked: boolean; onChange: (on: boolean) => void;
}) {
    return (
        <label className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
            checked ? 'border-blue-300 bg-blue-50/60' : 'border-slate-200 bg-white hover:bg-slate-50')}>
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
            <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-slate-800">{label}</span>
                {hint && <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{hint}</span>}
            </span>
        </label>
    );
}

/** Radio group for a short, mutually exclusive value set (e.g. a drug test's Negative / Positive) —
 *  every option is visible at once, so there is nothing to open and nothing to scan. */
function RadioChoice({ name, value, options, onChange }: {
    name: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {options.map(o => {
                const on = value === o;
                return (
                    <label key={o}
                        className={cn('inline-flex h-9 min-w-[7rem] flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors',
                            on ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}>
                        <input type="radio" name={name} value={o} checked={on} onChange={() => onChange(o)}
                            className="h-3.5 w-3.5 shrink-0 border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                        <span className="truncate">{o}</span>
                    </label>
                );
            })}
        </div>
    );
}

// ── A record filed FROM another record: the way back to it ──────────────────
/**
 * The source record a field's value names, when there is one.
 *
 * A warning letter's Event reference is not just text — it is the number of the ticket,
 * accident, hours-of-service violation or safety event the letter was issued on. Reading a
 * letter and asking "what actually happened?" should not mean leaving the file and hunting
 * for that record by hand, so the reference becomes a link.
 *
 * Which page it opens comes from the letter itself (its "Issued for" value), and the id —
 * present when the letter was filed BY a review rather than typed in — opens that exact
 * record. Without the id the link still lands on the right list, which beats nothing.
 * Null for every ordinary text field, so nothing else on any other record changes.
 */
function fieldSourceLink(f: RecordFieldDef, v: DocVersion): { path: string; source: string; id?: string } | null {
    if (f.kind !== 'text' || !f.sourceLink) return null;
    const source = v.fields?.[f.sourceLink.from] ?? '';
    const path = f.sourceLink.paths[source];
    if (!path) return null;
    // Nothing to open: no record was filed from, and no reference was written down.
    if (!v.sourceRecordId && !(v.fields?.[f.key] ?? '').trim()) return null;
    return { path, source, id: v.sourceRecordId };
}

/** Open a linked source record — the destination page picks the id up as it mounts. */
function openSourceLink(link: { path: string; id?: string }, navigate: (path: string) => void) {
    if (link.id) setPendingRecord(link.path, link.id);
    navigate(link.path);
}

// ── Version fields (Details / Document / Monitoring / Tags / Notes) for ONE version — shared by VersionSet + VersionEditModal ──
/** Max documents that can hang off ONE insurance policy record (bulk drag-drop up to this many). */
const MAX_POLICY_DOCS = 10;

export function VersionFields({ record: baseRecord, version, onChange, tagCatalog, addToCatalog, editableLabel, onNavigate }: {
    record: SafetyRecord; version: DocVersion; onChange: (next: DocVersion) => void;
    tagCatalog: string[]; addToCatalog: (t: string) => void; editableLabel?: boolean;
    /** Needed to open a field's source record (a warning letter's ticket / accident). Without
     *  it — the Settings preview, say — the reference is plain text, since there is nowhere to go. */
    onNavigate?: (path: string) => void;
}) {
    const v = version;
    // The form asks for what THIS document has. A record can hold more than one kind — the
    // certificate of incorporation that never expires and the business licence that does — and
    // the whole form follows from the kind: its dates, what its number is called, the name of
    // the document being uploaded, whether there is an alert to set. Records with one kind
    // resolve to themselves, so nothing else here changes.
    const record = recordForFields(baseRecord, v.fields);
    const hasDoc = record.type !== 'C' && record.docRequirement !== 'none';
    const slots = record.slotLabels ?? [];
    // The whole world for a passport, the two countries that run the programme for a FAST
    // certificate, and the three operating countries for everything else.
    const countries = record.allCountries ? ALL_COUNTRIES : (record.countries ?? COUNTRIES);
    // Custom records carry an explicit per-field form definition; system records use the built-in rules.
    const cf = record.customForm;
    const isMultiDoc = cf ? (cf.upload.enabled && cf.upload.multi) : !!record.multiInstance;
    const showNumber = cf ? cf.numberField.enabled && !!record.numberName : !!record.numberName;
    const numberRequired = cf ? cf.numberField.required : (record.type === 'C' || record.type === 'DC');
    const showCountry = cf ? cf.country.enabled : !record.hideCountry;
    const countryRequired = cf ? cf.country.required : false;
    const showState = cf ? cf.state.enabled : !record.hideState;
    const stateRequired = cf ? cf.state.required : false;
    const showIssue = cf ? cf.issueDate.enabled : !!record.tracksIssueDate;
    const issueRequired = cf ? cf.issueDate.required : false;
    const showExpiry = cf ? cf.expiryDate.enabled : isDateMonitored(record);
    // ── Row pairing ──
    // The form is a two-column grid that fills in source order. Some fields read as ONE thing
    // and must not be split across rows by whatever precedes them, so the FIRST of each such
    // pair is forced into column 1, which starts a fresh row:
    //   Record name + the number field   (the record's identity)
    //   Country + State                  (one jurisdiction)
    //   Issue date + expiry / review     (the record's dates)
    // Only when BOTH halves are shown — a lone Country or a lone date should still flow, or it
    // would start a row and sit beside an empty cell for no reason.
    const ROW_START = 'sm:col-start-1';
    const pairJurisdiction = showCountry && showState;
    const pairDates = showIssue && showExpiry;
    // Required unless the record says otherwise — a date the system derives (a next review due
    // from an issue date) must not block filing a record that is complete without it.
    const expiryRequired = cf ? cf.expiryDate.required : !record.expiryOptional;
    const showStatus = cf ? cf.status.enabled : (!isDateMonitored(record) && !record.hideStatus);
    const statusRequired = cf ? cf.status.required : true;
    // A record can rename its monitored status and supply its own values — e.g. a drug test
    // captures a "Test result" of Negative / Positive, not a generic Active / On File.
    const statusLabel = record.statusLabel ?? 'Status';
    const statusChoices = statusOptionsFor(record, STATUS_OPTIONS);
    // Extra fields declared on the record (a drug test's Test type, a licence's class …).
    // Single-line ones join the paired grid next to the number; the multiline ones come after
    // the dates, still paired — a taller box each, not a full-width band each.
    const extraFields = recordFields(record);
    const inlineFields: RecordFieldDef[] = extraFields.filter(f => !(f.kind === 'text' && f.multiline));
    // One field may LEAD the form, ahead of the name and the number: the one everything else
    // hangs off. The name below it is derived from the answer — pick WSIB and the record becomes
    // "WSIB", and its province with it — so asking for the name first asks a question that is
    // about to answer itself, and asking for the number first asks for a number under no
    // heading. A field the record is NAMED after leads for that reason; `leads` says so for the
    // ones that settle the form (which expiry, which documents) without also naming it.
    const leadField = inlineFields.find(f => f.leads || (!!record.nameFromField && f.key === record.nameFromField));
    const trailingFields = leadField ? inlineFields.filter(f => f !== leadField) : inlineFields;
    // Narrowed, not just filtered: only a text field can be multiline, and the block row
    // reads `required` — which a derived field has no notion of.
    const blockFields = extraFields.filter(
        (f): f is Extract<RecordFieldDef, { kind: 'text' }> => f.kind === 'text' && !!f.multiline);
    // Same row-pairing rule as the built-in dates: a record's OWN date pair starts a fresh
    // row so the two never split, and a derived field starts one too — it summarises the
    // dates above it, so it must not drift up beside an unrelated field. Radio groups start
    // a row as well: they stand several lines tall, so one sitting beside a single-line
    // input leaves the pair visibly unbalanced, and a run of them reads as one question set.
    const isRadio = (f: RecordFieldDef) => f.kind === 'select' && f.control === 'radio';
    const firstExtraDate = inlineFields.filter(f => f.kind === 'date').length > 1
        ? inlineFields.find(f => f.kind === 'date')?.key : undefined;
    const firstRadio = inlineFields.find(isRadio)?.key;
    const extraRowStart = (f: RecordFieldDef) =>
        (f.rowStart || f.key === firstExtraDate || f.key === firstRadio || f.kind === 'derived') ? ROW_START : undefined;
    // Writing one of the record's own fields can settle more than that field — see
    // `fieldWritePatch`, which is where all of that lives.
    const setExtra = (key: string, val: string) => patch(fieldWritePatch(baseRecord, v, key, val));
    const showUpload = cf ? cf.upload.enabled : hasDoc;
    const showMonitoring = cf ? cf.monitoring.enabled : !record.hideMonitoring;
    const showNotes = cf ? cf.notes.enabled : true;
    // Tags ↔ upload are interlinked: a single/no-upload record gets ONE record-level tag field;
    // a multi-document record tags each uploaded document individually. Both are governed by the
    // same Tags toggle, so turning Tags off removes tags everywhere.
    const tagsEnabled = cf ? cf.tags.enabled : true;
    const showTags = tagsEnabled && !isMultiDoc;
    const showDocTags = tagsEnabled;
    const inputCls = 'w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';
    // A record whose jurisdiction depends on one of its own fields offers only the provinces
    // that can issue what was chosen — Québec for an NIR, Ontario for a CVOR Level 2, the
    // provinces that issue an NSC for an NSC. Everything else offers the country's full list.
    const allowedStates = statesForRecord(record, v.fields);
    const states = allowedStates ?? STATES_BY_COUNTRY[v.country] ?? [];

    const patch = (p: Partial<DocVersion>) => onChange({ ...v, ...p });
    const setCountry = (val: string) => onChange({ ...v, country: val, stateProv: (STATES_BY_COUNTRY[val] ?? []).includes(v.stateProv) ? v.stateProv : '' });
    const addFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const room = Math.max(0, MAX_POLICY_DOCS - v.files.length);
        if (room === 0) { emitToast(`Up to ${MAX_POLICY_DOCS} documents per record`, 'error'); return; }
        const picked = Array.from(list).slice(0, room);
        const docs: DataDocFile[] = await Promise.all(picked.map(async f => ({ name: f.name, size: f.size, url: await readAsDataUrl(f), uploadedAt: new Date().toISOString() })));
        onChange({ ...v, files: [...v.files, ...docs] });
        if (list.length > room) emitToast(`Added ${room} — max ${MAX_POLICY_DOCS} documents per record`);
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
    // isMultiDoc (computed above) → multiple supporting documents on one record, each tagged
    // (insurance policies: main certificate + endorsements; custom multi-document records).
    const setFileTag = (i: number, tag: string) => onChange({ ...v, files: v.files.map((f, idx) => (idx === i ? { ...f, tag } : f)) });

    /** One of the record's own fields, wherever it sits in the form. */
    const renderInlineField = (f: RecordFieldDef) => {
        // A yes/no is its own label — wrapping it in a Field would print the label
        // twice, once above an empty box and once beside the tick.
        if (f.kind === 'check') {
            return (
                <div key={f.key} className={cn('self-end', extraRowStart(f))}>
                    <ExtraFieldInput def={f} value={fieldValue(f, v.fields)} onChange={val => setExtra(f.key, val)} inputCls={inputCls} name={`${v.id}-${f.key}`} />
                </div>
            );
        }
        const required = f.kind !== 'derived' && !!f.required;
        const money = f.kind === 'text' ? f.money : undefined;
        // A field that names a record elsewhere (a warning letter's Event reference)
        // keeps its input — the number is still editable — and gains a way to open
        // what it points at, which is the whole reason the number is recorded.
        const link = onNavigate ? fieldSourceLink(f, v) : null;
        return (
            <Field key={f.key} label={f.label} required={required}
                optional={f.kind !== 'derived' && !required} auto={f.kind === 'derived'}
                className={extraRowStart(f)}>
                {link ? (
                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <ExtraFieldInput def={f} value={fieldValue(f, v.fields)} onChange={val => setExtra(f.key, val)} inputCls={inputCls} name={`${v.id}-${f.key}`}
                                currency={money ? (v.fields?.[money.currencyKey] ?? money.defaultCurrency ?? money.currencies[0]) : undefined}
                                onCurrency={money ? (val => setExtra(money.currencyKey, val)) : undefined} />
                        </div>
                        <button type="button" onClick={() => openSourceLink(link, onNavigate!)}
                            title={link.id ? `Open the ${link.source.toLowerCase()} this record was filed from` : `Open ${link.source}`}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[12px] font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100">
                            <ExternalLink size={13} /> View
                        </button>
                    </div>
                ) : (
                    <ExtraFieldInput def={f} value={fieldValue(f, v.fields)} onChange={val => setExtra(f.key, val)} inputCls={inputCls} name={`${v.id}-${f.key}`}
                        currency={money ? (v.fields?.[money.currencyKey] ?? money.defaultCurrency ?? money.currencies[0]) : undefined}
                        onCurrency={money ? (val => setExtra(money.currencyKey, val)) : undefined} />
                )}
            </Field>
        );
    };

    return (
        <div className="space-y-3">
            {/* DETAILS */}
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* What the record IS comes before what it is called — see `leadField`. */}
                {leadField && fieldApplies(leadField, v.fields) && renderInlineField(leadField)}
                {editableLabel && !record.hideRecordName && (
                    // Starts its own row when something leads the form, so the identity pair —
                    // the name and the number — still reads as one line rather than the number
                    // being pushed off on its own.
                    <Field label="Record name" required className={leadField ? ROW_START : undefined}>
                        <div className="relative">
                            <input value={v.label} maxLength={MAX_RECORD_NAME}
                                onChange={e => patch({ label: e.target.value })}
                                placeholder={`e.g. ${defaultVersionLabel(record)}`} className={cn(inputCls, 'pr-14')} />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-slate-400">{v.label.length}/{MAX_RECORD_NAME}</span>
                        </div>
                    </Field>
                )}
                {showNumber && (
                    <Field label={record.numberName} required={numberRequired} optional={cf ? !numberRequired : undefined}>
                        <input value={v.numberValue} onChange={e => patch({ numberValue: e.target.value })} placeholder={`Enter ${record.numberName.toLowerCase()}`} className={inputCls} />
                    </Field>
                )}
                {trailingFields.filter(f => fieldApplies(f, v.fields)).map(renderInlineField)}
                {isMultiDoc && !cf && (
                    <Field label="Insurance company" required>
                        <input value={v.insurer ?? ''} onChange={e => patch({ insurer: e.target.value })} placeholder="Insurance carrier — e.g. Northbridge" className={inputCls} />
                    </Field>
                )}
                {/* The producer is NOT asked here. A carrier places its policies through one
                    broker, and asking on every policy invited four spellings of the same
                    brokerage across four rows. It is stated once in the page header, with the
                    agent and how to reach them — see `InsuranceBrokerFacts`. */}
                {/* No general coverage limit: the only limit this record captures is the
                    non-owned-trailer one, and that is asked on the policies that carry that
                    cover — see the record's `nonOwnedLimit` field. */}
                {showCountry && (
                    <Field label="Country" required={countryRequired} optional={cf ? !countryRequired : undefined} className={pairJurisdiction ? ROW_START : undefined}>
                        <select value={v.country} onChange={e => setCountry(e.target.value)} className={inputCls}>
                            <option value="">Select country</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </Field>
                )}
                {showState && (
                    <Field label="State / Province" required={stateRequired} optional={cf ? !stateRequired : undefined}>
                        <select value={v.stateProv} disabled={states.length === 0} onChange={e => patch({ stateProv: e.target.value })} className={inputCls}>
                            <option value="">{states.length ? 'Select state / province' : '—'}</option>
                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </Field>
                )}
                {/* What the record IS comes before WHEN it happened — a status-only record
                    (a test result, an authority status) reads better with its value next to the
                    fields that identify it. Date-monitored records show no status field at all,
                    so their ordering is unchanged. */}
                {showStatus && (
                    <Field label={statusLabel} required={statusRequired} optional={cf ? !statusRequired : undefined}>
                        {record.statusControl === 'radio' ? (
                            <RadioChoice name={`${v.id}-status`} value={v.status ?? ''} options={statusChoices} onChange={val => patch({ status: val })} />
                        ) : (
                            <select value={v.status ?? ''} onChange={e => patch({ status: e.target.value })} className={inputCls}>
                                <option value="">{`Select ${statusLabel.toLowerCase()}`}</option>
                                {statusChoices.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        )}
                    </Field>
                )}
                {showIssue && (
                    <Field label={cf ? 'Issue date' : (record.issueLabel ?? 'Issue date')} required={issueRequired} optional={!issueRequired} className={pairDates ? ROW_START : undefined}>
                        <input type="date" value={v.issueDate} onChange={e => patch({ issueDate: e.target.value })} className={inputCls} />
                    </Field>
                )}
                {/* Marked Optional the same way the issue date is — a field that can be left
                    blank has to say so, or it reads as required and simply broken. */}
                {showExpiry && (
                    <Field label={cf ? 'Expiry date' : record.monitorType} required={expiryRequired} optional={!expiryRequired}>
                        <input type="date" value={v.expiryDate} onChange={e => patch({ expiryDate: e.target.value })} className={inputCls} />
                    </Field>
                )}
                {blockFields.map(f => (
                    <Field key={f.key} label={f.label} required={!!f.required} optional={!f.required}>
                        <ExtraFieldInput def={f} value={fieldValue(f, v.fields)} onChange={val => setExtra(f.key, val)} inputCls={inputCls} name={`${v.id}-${f.key}`} />
                    </Field>
                ))}
                {/* Which record counts as THE current one. Newest wins by default; tick this to
                    keep an older record current — that is the one monitoring reads. */}
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 transition-colors hover:bg-slate-50 sm:col-span-2">
                    <input type="checkbox" checked={!!v.isCurrent} onChange={e => patch({ isCurrent: e.target.checked || undefined })}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                    <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-slate-700">Set as the current record</span>
                        <span className="block text-[11px] leading-snug text-slate-500">The most recent record is the current one by default, and the one monitored. Tick this to keep an older record current instead.</span>
                    </span>
                </label>
            </div>
            {/* UPLOADED DOCUMENT(S) */}
            {showUpload && (
                <div className="border-t border-slate-200 pt-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{isMultiDoc ? 'Uploaded Documents' : 'Uploaded Document'}</div>
                        {isMultiDoc && <span className={cn('text-[10px] font-bold tabular-nums', v.files.length >= MAX_POLICY_DOCS ? 'text-amber-600' : 'text-slate-400')}>{v.files.length}/{MAX_POLICY_DOCS}</span>}
                    </div>
                    <div className="mb-1.5 text-[12px] font-semibold text-slate-600">{record.documentName || 'Document'}</div>
                    {isMultiDoc && <p className="mb-2 text-[11px] text-slate-400">{cf ? `This record can hold up to ${MAX_POLICY_DOCS} documents. Drag several files at once — each becomes its own tagged row.` : `This policy can hold up to ${MAX_POLICY_DOCS} documents (certificate, endorsements, declarations…). Drag several files at once — each becomes its own tagged row; the policy details above are shared.`}</p>}
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
                    ) : isMultiDoc ? (
                        <div className="space-y-2.5">
                            {v.files.map((f, i) => (
                                <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2.5">
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700"><FileText size={11} /> Document {i + 1}</span>
                                    <FileChip f={f} onRemove={() => removeFile(i)} />
                                    {showDocTags && (
                                        <div className="pl-0.5">
                                            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Tag size={11} /> Document tag</div>
                                            <DocTagPicker value={f.tag ?? ''} catalog={tagCatalog}
                                                onChange={val => setFileTag(i, val)} onCreate={addToCatalog} />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {v.files.length < MAX_POLICY_DOCS ? (
                                <UploadZone compact
                                    label={v.files.length ? `Add more documents — drag up to ${MAX_POLICY_DOCS - v.files.length} files` : `Drag up to ${MAX_POLICY_DOCS} documents here — or click`}
                                    hint={v.files.length ? 'Same policy — drop several at once, then tag each' : 'Bulk drop — PDF, image or file'}
                                    multiple onFiles={addFiles} />
                            ) : (
                                <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2 text-center text-[11px] font-semibold text-amber-700">Maximum of {MAX_POLICY_DOCS} documents reached — remove one to add another.</p>
                            )}
                        </div>
                    ) : v.files.length > 0 ? (
                        <div className="space-y-2">{v.files.map((f, i) => <FileChip key={i} f={f} onRemove={() => removeFile(i)} />)}</div>
                    ) : (
                        <UploadZone label="Drag a file here — or click — to upload the document" hint="Captures the document for this record; PDF, image or file" multiple onFiles={addFiles} />
                    )}
                </div>
            )}
            {/* MONITORING (compact toggle), preceded by the record's handling guidance — which
                only appears once monitoring is on, since that is when it is worth acting on. */}
            {showMonitoring && (
                <div className="border-t border-slate-200 pt-3 space-y-2.5">
                    {record.practiceNote && v.monitoring.enabled && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5">
                            <Info size={14} className="mt-px shrink-0 text-amber-600" />
                            <p className="text-[12px] leading-relaxed text-amber-800">{record.practiceNote}</p>
                        </div>
                    )}
                    <MonitoringToggle record={record} monitoring={v.monitoring} issueDate={v.issueDate} expiryDate={v.expiryDate} status={v.status ?? ''}
                        onChange={m => patch({ monitoring: m })} />
                </div>
            )}
            {/* TAGS — record-level tags for single-document records only.
                Multi-document records (insurance policies / custom multi-doc) tag each uploaded
                document individually (above), so the record-level tag editor is hidden for them. */}
            {showTags && (
                <div className="border-t border-slate-200 pt-3">
                    <TagField tags={v.tags} catalog={tagCatalog} onAdd={addTag} onRemove={removeTag} />
                </div>
            )}
            {/* NOTES */}
            {showNotes && (
                <div className="border-t border-slate-200 pt-3">
                    <Field label="Notes">
                        <textarea value={v.notes} onChange={e => patch({ notes: e.target.value })} rows={2} placeholder="Optional notes…"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                    </Field>
                </div>
            )}
        </div>
    );
}

/** Modal that adds or edits ONE version in isolation — "each row edit only shows that data". Compact (no monitoring). */
// Common insurance policy types offered as suggestions when naming a new policy.

/** Searchable single-select with create — pick an existing / suggested option, or type a new one. Used for policy names + document tags. */
function SearchCreateCombo({ value, onChange, onPick, options, placeholder, icon }: {
    value: string; onChange: (v: string) => void; onPick?: (v: string) => void; options: string[]; placeholder?: string; icon?: ReactNode;
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
                        <button key={o} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { (onPick ?? onChange)(o); setOpen(false); }}
                            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50', o.toLowerCase() === q ? 'font-semibold text-blue-700 bg-blue-50/40' : 'text-slate-700')}>
                            {icon ?? <FileText size={13} className="shrink-0 text-slate-400" />} <span className="truncate">{o}</span>
                        </button>
                    ))}
                    {showAdd && (
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { (onPick ?? onChange)(value.trim()); setOpen(false); }}
                            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50', filtered.length > 0 && 'border-t border-slate-100')}>
                            <Plus size={13} className="shrink-0" /> Add &ldquo;{value.trim()}&rdquo;
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/** Single-tag picker for ONE uploaded document — shows the chosen system tag as a coloured
 *  chip, and a searchable "system tags / create new" combo while editing. Keeps its own text
 *  buffer so typing never mangles the committed value (unlike a directly-bound input). */
function DocTagPicker({ value, catalog, onChange, onCreate }: {
    value: string; catalog: string[]; onChange: (t: string) => void; onCreate: (t: string) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [q, setQ] = useState('');
    const query = q.trim();
    const filtered = (query ? catalog.filter(o => smartTagMatch(query, o)) : catalog).slice(0, 8);
    const exists = catalog.some(o => o.toLowerCase() === query.toLowerCase());
    const commit = (t: string) => { const val = t.trim(); if (!val) return; onCreate(val); onChange(val); setEditing(false); setQ(''); };

    if (value && !editing) {
        return (
            <div className="flex flex-wrap items-center gap-2">
                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold', tagColor(value))}>
                    <Tag size={11} /> {value}
                </span>
                <button type="button" onClick={() => { setQ(''); setEditing(true); }} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">Change</button>
                <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-400 hover:text-rose-600" title="Remove tag"><X size={12} /> Remove</button>
            </div>
        );
    }
    // Add / change → the SAME search-and-add UI as the record-level Tags editor.
    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input autoFocus={editing} value={q} onChange={e => setQ(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(q); } else if (e.key === 'Escape' && value) setEditing(false); }}
                        onBlur={() => { if (value) setEditing(false); }}
                        placeholder="Search or add a tag…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commit(q)} disabled={!query}
                    className={cn('inline-flex shrink-0 items-center gap-1 h-9 px-3.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors',
                        query ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-slate-200 bg-white text-slate-400 cursor-not-allowed')}>
                    <Plus size={14} /> Add
                </button>
            </div>
            {(filtered.length > 0 || (query && !exists)) && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1">
                    {filtered.length > 0 && <div className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">System tags</div>}
                    {filtered.map(o => (
                        <button key={o} type="button" onMouseDown={e => e.preventDefault()} onClick={() => commit(o)}
                            className="flex w-full items-center gap-2 px-2 py-1.5 rounded text-left hover:bg-slate-50">
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(o))}>{o}</span>
                        </button>
                    ))}
                    {query && !exists && (
                        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => commit(query)}
                            className={cn('flex w-full items-center gap-1.5 px-2 py-2 rounded text-left text-[13px] font-semibold text-blue-700 hover:bg-blue-50', filtered.length > 0 && 'mt-1 border-t border-slate-100 pt-2')}>
                            <Plus size={13} /> Create &ldquo;{query}&rdquo;
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

function VersionEditModal({ record, subjectLabel, version, mode, askPolicyName, policyOptions, policyPrefills, initialPolicyName, onSave, onClose, onNavigate }: {
    record: SafetyRecord; subjectLabel?: string;
    version: DocVersion; mode: 'add' | 'edit'; askPolicyName?: boolean; policyOptions?: string[];
    policyPrefills?: Record<string, DocVersion>; initialPolicyName?: string;
    onSave: (v: DocVersion, policyName?: string) => void; onClose: () => void;
    onNavigate?: (path: string) => void;
}) {
    const [v, setV] = useState<DocVersion>(version);
    const [policyName, setPolicyName] = useState(initialPolicyName ?? '');
    const { tags: tagCatalog, add: addToCatalog } = useSafetyTags();
    const EntityIcon = ENTITY_ICON[record.entity];
    const unit = 'record';
    // Picking an existing policy prefills the whole form from that policy's current record (add mode only — in edit it just reassigns).
    const handlePickPolicy = (name: string) => {
        setPolicyName(name);
        if (mode === 'add') {
            const pf = policyPrefills?.[name];
            if (pf) setV(prev => ({ ...pf, id: prev.id, uploadedAt: prev.uploadedAt, uploadedBy: prev.uploadedBy }));
        }
    };
    // Opening the record this one was filed from LEAVES this form, and anything typed here
    // goes with it. Following a link to check a source says nothing about wanting to throw
    // the edit away, so a form with changes in it asks first. `v !== version` is the whole
    // test: every edit path replaces the object rather than mutating it.
    const dirty = v !== version || policyName !== (initialPolicyName ?? '');
    const [leaveTo, setLeaveTo] = useState<string | null>(null);
    const guardedNavigate = onNavigate
        ? (path: string) => { if (dirty) setLeaveTo(path); else onNavigate(path); }
        : undefined;
    return (
        <>
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
                    <div className="flex items-center justify-end">
                        <button type="button" onClick={() => { setV(cur => fillVersionDemo(record, cur)); ['Verified', 'Primary'].forEach(addToCatalog); }}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 text-[12px] font-semibold text-blue-700 hover:bg-blue-100"><Sparkles size={13} /> Fill demo data</button>
                    </div>
                    {askPolicyName && (
                        <Field label="Policy" required={mode === 'add'}>
                            <SearchCreateCombo value={policyName} onChange={setPolicyName} onPick={handlePickPolicy} options={policyOptions ?? []} placeholder="Policy name — e.g. Liability — State Farm" />
                            {mode === 'edit' && <p className="mt-1 text-[10px] text-slate-400">Change this to move the record to another policy (or type a new policy name).</p>}
                        </Field>
                    )}
                    <VersionFields record={record} version={v} onChange={setV} tagCatalog={tagCatalog} addToCatalog={addToCatalog} editableLabel onNavigate={guardedNavigate} />
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400"><MapPin size={12} /> {record.jurisdiction}</div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSave(v, askPolicyName ? policyName : undefined)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><Check size={15} /> {mode === 'add' ? `Add ${unit}` : 'Save changes'}</button>
                </div>
            </div>
        </div>
        {leaveTo && (
            <ConfirmDialog
                title="Leave without saving?"
                message="This record has changes that have not been saved. Opening the record it was filed from will discard them."
                confirmLabel="Leave"
                onConfirm={() => { const path = leaveTo; setLeaveTo(null); onNavigate?.(path); }}
                // The id to open was stashed when the link was clicked; consuming it here drops
                // it, so staying does not leave a deep-link waiting to fire on a later visit.
                onCancel={() => { consumePendingRecord(leaveTo); setLeaveTo(null); }}
            />
        )}
        </>
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

    const patchVersion = (id: string, patch: Partial<DocVersion>) => {
        const next = versions.map(v => (v.id === id ? { ...v, ...patch } : v));
        // Pinning one record as current releases whichever one held it before.
        onChange(patch.isCurrent ? next.map(v => (v.id === id || !v.isCurrent ? v : { ...v, isCurrent: undefined })) : next);
    };
    const addVersion = () =>
        onChange([{ ...blankVersion(record, nextVersionLabel(record, { versions })), monitoring: seedMonitoring(record), uploadedBy: currentUserName() }, ...versions]);
    const addVersionWithFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const docs: DataDocFile[] = await Promise.all(Array.from(list).map(async f => ({
            name: f.name, size: f.size, url: await readAsDataUrl(f), uploadedAt: new Date().toISOString(),
        })));
        onChange([{ ...blankVersion(record, nextVersionLabel(record, { versions })), monitoring: seedMonitoring(record), files: docs, uploadedBy: currentUserName() }, ...versions]);
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
    const { country, stateProv } = sampleJurisdiction(record);
    const fillV = (v: DocVersion, over: Partial<DocVersion> = {}): DocVersion => {
        const merged: DocVersion = {
            ...v,
            numberValue: record.numberName ? sampleNumber(record) : v.numberValue,
            country, stateProv,
            issueDate: record.tracksIssueDate ? '2024-01-15' : v.issueDate,
            expiryDate: isDateMonitored(record) ? (record.configuredDate ?? '2026-12-31') : v.expiryDate,
            status: capturesStatus(record) ? (v.status || sampleStatus(record)) : '',
            fields: { ...sampleFields(record), ...v.fields },
            tags: record.multiInstance ? [] : (v.tags.length ? v.tags : ['Verified', 'Primary']),
            files: v.files,
            monitoring: { ...v.monitoring, enabled: !record.hideMonitoring },
            ...over,
        };
        if (hasDoc && merged.files.length === 0) merged.files = sampleDocFiles(record);
        // Insurance documents are tagged individually — give each demo document a system tag.
        if (record.multiInstance) merged.files = merged.files.map((f, idx) => (f.tag ? f : { ...f, tag: ['Certificate', 'Endorsement', 'Declaration page', 'Schedule of coverage'][idx] ?? 'Supporting document' }));
        return merged;
    };
    const fillDemo = () => {
        if (isMulti) {
            const mk = (name: string, num: string, exp: string): DocInstance => ({
                ...newInstance(name),
                versions: [fillV({ ...newVersion(defaultVersionLabel(record, 2026)), monitoring: seedMonitoring(record) }, { numberValue: num, expiryDate: exp })],
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
                            : (multi && versions.length > 0 && <span className="text-[12px] text-slate-500">{versions.length} dated record{versions.length === 1 ? '' : 's'} · newest first</span>)}
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
                                    <p className="text-[11px] text-slate-400">Each renewal / reissue captures its own number, dates, document and tags as a new dated record — upload below. Previous records are retained.</p>
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

function Field({ label, required, optional, auto, children, className }: { label: string; required?: boolean; optional?: boolean; auto?: boolean; children: React.ReactNode; className?: string }) {
    return (
        <label className={cn('block', className)}>
            <span className="mb-1 flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                {required && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
                {optional && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</span>}
                {auto && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">Auto</span>}
            </span>
            {children}
        </label>
    );
}
