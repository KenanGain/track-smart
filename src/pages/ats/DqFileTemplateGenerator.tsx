import { useState, useMemo, useRef } from "react";
import {
    Download, Printer, Check, AlertCircle, ChevronDown, ChevronUp,
    Search, FileCheck, Shield, Calendar, MapPin, Globe, User, Building2,
    ClipboardList, CheckCircle2, XCircle, Minus, Eye, UploadCloud,
    Layers, Truck, Settings, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Applicant } from "./ats.data";
import { loadApplicants } from "./hiring-application.data";
import { loadDqProfiles, DQ_DRIVER_TYPES, detectDqDriverType, pickDqProfile, type DqProfile } from "./dq-profiles.data";
import { computeDqFile, type DqStatus, type DqFileResult } from "./dq-file-checklist";
import { loadDocumentTypes, type DocumentType } from "./document-types.data";

// ── Carrier info (mock) ──────────────────────────────────────────────────
const CARRIER_INFO = {
    name: "Craig Safety Technologies",
    dotNumber: "2847591",
    mcNumber: "MC-908712",
    address: "1203 Industrial Blvd, North Kansas City, MO 64116",
    phone: "(816) 555-0100",
};

// ── Status helpers ───────────────────────────────────────────────────────
function StatusIcon({ status }: { status: DqStatus }) {
    if (status === 'present') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={13} strokeWidth={3} /></span>;
    if (status === 'missing') return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100 text-rose-600"><XCircle size={13} strokeWidth={3} /></span>;
    return <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-400"><Minus size={13} /></span>;
}

function StatusBadge({ status }: { status: DqStatus }) {
    const [label, cls] = status === 'present' ? ['Present', 'border-emerald-200 bg-emerald-50 text-emerald-700']
        : status === 'missing' ? ['Missing', 'border-rose-200 bg-rose-50 text-rose-700']
            : ['N/A', 'border-slate-200 bg-slate-50 text-slate-400'];
    return <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', cls)}>{label}</span>;
}

// ── Section card ─────────────────────────────────────────────────────────
function SectionCard({ title, children, right, defaultOpen = true }: {
    title: string; children: React.ReactNode; right?: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-left">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                <div className="flex items-center gap-2">
                    {right}
                    {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>
            </button>
            {open && children}
        </div>
    );
}

// ── Document manifest row ────────────────────────────────────────────────
function DocumentManifestRow({ docType, status }: { docType: DocumentType; status: 'present' | 'missing' | 'na' }) {
    return (
        <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/50">
            <StatusIcon status={status} />
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-[13px] font-semibold', status === 'missing' ? 'text-slate-800' : 'text-slate-600')}>{docType.name}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{docType.category}</span>
                    {docType.requirementLevel === 'required' && (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600 border border-rose-200">Required</span>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    {docType.expiryRequired && <span className="inline-flex items-center gap-0.5"><Calendar size={9} /> Expiry tracked</span>}
                    {docType.issueDateRequired && <span className="inline-flex items-center gap-0.5"><Calendar size={9} /> Issue date</span>}
                    {docType.issueStateRequired && <span className="inline-flex items-center gap-0.5"><MapPin size={9} /> Issue state</span>}
                    {docType.issueCountryRequired && <span className="inline-flex items-center gap-0.5"><Globe size={9} /> Issue country</span>}
                    {docType.allowMultiple && <span className="inline-flex items-center gap-0.5"><Layers size={9} /> Multiple</span>}
                </div>
            </div>
            <StatusBadge status={status} />
            {status === 'present' && (
                <div className="flex items-center gap-1">
                    <button className="h-6 px-2 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 inline-flex items-center gap-1">
                        <Eye size={10} /> View
                    </button>
                    <button className="h-6 px-2 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 inline-flex items-center gap-1">
                        <Download size={10} /> PDF
                    </button>
                </div>
            )}
            {status === 'missing' && (
                <button className="h-6 px-2 rounded border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1">
                    <UploadCloud size={10} /> Upload
                </button>
            )}
        </div>
    );
}

// ── Print-ready DQ file summary ──────────────────────────────────────────
function PrintableDqFile({ applicant, profile, dqResult, docTypes }: {
    applicant: Applicant; profile: DqProfile | undefined; dqResult: DqFileResult; docTypes: DocumentType[];
}) {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return (
        <div className="space-y-6 text-[13px] text-slate-800 leading-relaxed print:text-[11px]">
            {/* Cover */}
            <div className="rounded-xl border-2 border-blue-600 bg-gradient-to-br from-blue-50 to-white p-8 text-center">
                <div className="inline-flex items-center gap-2 text-blue-600 mb-3">
                    <Shield size={28} />
                    <span className="text-2xl font-extrabold tracking-tight">Driver Qualification File</span>
                </div>
                <div className="text-sm text-slate-600 mt-2">{CARRIER_INFO.name} · DOT #{CARRIER_INFO.dotNumber}</div>
                <div className="mt-6 grid grid-cols-2 gap-4 text-left">
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1"><User size={10} /> Driver</div>
                        <div className="font-bold text-slate-900">{applicant.firstName} {applicant.lastName}</div>
                        <div className="text-[12px] text-slate-500">{applicant.email}</div>
                        <div className="text-[12px] text-slate-500">{applicant.phone}</div>
                        <div className="text-[12px] text-slate-500">DOB: {applicant.dateOfBirth}</div>
                        <div className="text-[12px] text-slate-500">SSN: {applicant.ssnMasked}</div>
                        <div className="text-[12px] text-slate-500">License: {applicant.licenseType}</div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1"><Building2 size={10} /> Carrier</div>
                        <div className="font-bold text-slate-900">{CARRIER_INFO.name}</div>
                        <div className="text-[12px] text-slate-500">DOT# {CARRIER_INFO.dotNumber}</div>
                        <div className="text-[12px] text-slate-500">MC# {CARRIER_INFO.mcNumber}</div>
                        <div className="text-[12px] text-slate-500">{CARRIER_INFO.address}</div>
                        <div className="text-[12px] text-slate-500">{CARRIER_INFO.phone}</div>
                    </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-400">
                    Generated on {today} · Profile: {profile?.name ?? 'Standard'} · Checklist version: v1
                </div>
            </div>

            {/* DQ Checklist summary */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">DQ File Checklist Summary</h3>
                    <div className="mt-2 flex items-center gap-3 text-[12px]">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><Check size={12} /> {dqResult.rollup.present} Present</span>
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold"><XCircle size={12} /> {dqResult.rollup.missing} Missing</span>
                        <span className="text-slate-400">of {dqResult.rollup.required} required</span>
                        <span className="ml-auto tabular-nums font-bold text-slate-600">{dqResult.pct}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full', dqResult.rollup.missing === 0 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${dqResult.pct}%` }} />
                    </div>
                </div>
                {dqResult.sections.map(sec => (
                    <div key={sec.title}>
                        <div className="px-5 py-2 bg-slate-50/30 border-t border-slate-100">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{sec.title}</span>
                        </div>
                        <ul className="divide-y divide-slate-50">
                            {sec.items.map((row, i) => (
                                <li key={i} className="flex items-center gap-3 px-5 py-2">
                                    <StatusIcon status={row.status} />
                                    <span className={cn('flex-1 text-[12px]', row.status === 'missing' ? 'font-semibold text-slate-800' : 'text-slate-600')}>
                                        {row.item.label}
                                        {row.item.conditional && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">if applicable</span>}
                                    </span>
                                    <StatusBadge status={row.status} />
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Document manifest */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">Document Manifest</h3>
                    <p className="text-[11px] text-slate-500">All document types from Settings with their collection status.</p>
                </div>
                <div className="divide-y divide-slate-50">
                    {docTypes.filter(dt => dt.status === 'Active' && dt.usingInHiring).map(dt => {
                        // Simple match against DQ evidence
                        const kw = dt.name.toLowerCase();
                        const matched = dqResult.sections.some(sec =>
                            sec.items.some(row => row.status === 'present' && row.item.keywords.some(k => kw.includes(k) || k.includes(kw)))
                        );
                        return <DocumentManifestRow key={dt.id} docType={dt} status={matched ? 'present' : 'missing'} />;
                    })}
                </div>
            </div>

            {/* Certification block */}
            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">Certification & Signatures</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Driver signature</div>
                        <div className="h-16 rounded-md border border-slate-300 bg-white" />
                        <div className="mt-1 text-[10px] text-slate-400">I certify that all information provided is true and complete.</div>
                        <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                            <span>Print: ______________________________</span>
                            <span>Date: ____________</span>
                        </div>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Carrier representative</div>
                        <div className="h-16 rounded-md border border-slate-300 bg-white" />
                        <div className="mt-1 text-[10px] text-slate-400">I have reviewed this DQ file and confirm all required documents are on file.</div>
                        <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                            <span>Print: ______________________________</span>
                            <span>Date: ____________</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Generator Page ──────────────────────────────────────────────────
export function DqFileTemplateGenerator({ onNavigate }: { onNavigate?: (path: string) => void }) {
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(() => {
        const pre = sessionStorage.getItem('dq:generator-preselect');
        if (pre) sessionStorage.removeItem('dq:generator-preselect');
        return pre ?? null;
    });
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const profiles = useMemo(() => loadDqProfiles(), []);
    const docTypes = useMemo(() => loadDocumentTypes(), []);
    const applicants = useMemo(() => loadApplicants(), []);

    const filteredDrivers = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return applicants.filter(a =>
            !q ||
            `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
            a.email.toLowerCase().includes(q) ||
            a.id.includes(q)
        );
    }, [searchQuery, applicants]);

    const selectedDriver = applicants.find(a => a.id === selectedDriverId);
    const driverType = selectedDriver ? detectDqDriverType(selectedDriver) : 'local';
    const selectedProfile = selectedProfileId
        ? profiles.find(p => p.id === selectedProfileId)
        : pickDqProfile(driverType, profiles);

    // Compute DQ file
    const dqResult: DqFileResult | null = useMemo(() => {
        if (!selectedDriver || !selectedProfile) return null;
        return computeDqFile(selectedDriver, undefined, [], new Map(), selectedProfile.sections);
    }, [selectedDriver, selectedProfile]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-5">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            {onNavigate && (
                                <button type="button" onClick={() => onNavigate('/dq-files')}
                                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5">
                                    <ArrowLeft size={14} /> Back
                                </button>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                                        <FileCheck size={20} />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">DQ File Template Generator</h1>
                                        <p className="text-[12px] text-slate-500">Generate, review, and download complete Driver Qualification files</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedDriver && dqResult && (
                                <>
                                    <button type="button" onClick={() => setShowPreview(!showPreview)}
                                        className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-sm">
                                        <Eye size={14} /> {showPreview ? 'Edit View' : 'Preview'}
                                    </button>
                                    <button type="button" onClick={handlePrint}
                                        className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-sm">
                                        <Printer size={14} /> Print
                                    </button>
                                    <button type="button"
                                        className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-1.5 shadow-sm">
                                        <Download size={14} /> Download PDF
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 py-6">
                {showPreview && selectedDriver && selectedProfile && dqResult ? (
                    <div ref={printRef} className="print:p-0">
                        <PrintableDqFile
                            applicant={selectedDriver}
                            profile={selectedProfile}
                            dqResult={dqResult}
                            docTypes={docTypes}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                        {/* Left panel — driver + profile selection */}
                        <div className="space-y-4">
                            {/* Driver picker */}
                            <SectionCard title="Select Driver">
                                <div className="p-4 space-y-3">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search by name, email, or ID…"
                                            className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none"
                                        />
                                    </div>
                                    <ul className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 rounded-lg border border-slate-200">
                                        {filteredDrivers.map(a => {
                                            const sel = a.id === selectedDriverId;
                                            return (
                                                <li key={a.id}>
                                                    <button type="button" onClick={() => setSelectedDriverId(a.id)}
                                                        className={cn('w-full px-3 py-2.5 text-left flex items-center gap-3 hover:bg-blue-50/50 transition-colors',
                                                            sel && 'bg-blue-50 ring-1 ring-blue-200')}>
                                                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                                                            sel ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}>
                                                            {a.firstName[0]}{a.lastName[0]}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[12px] font-bold text-slate-800 truncate">{a.firstName} {a.lastName}</div>
                                                            <div className="text-[10px] text-slate-500 truncate">{a.email} · {a.licenseType}</div>
                                                        </div>
                                                        {sel && <Check size={14} className="text-blue-600 shrink-0" />}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            </SectionCard>

                            {/* Profile picker */}
                            <SectionCard title="DQ Checklist Profile">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                        <Truck size={12} /> Driver type:
                                        <span className="font-bold text-slate-700">{DQ_DRIVER_TYPES.find(t => t.id === driverType)?.label ?? driverType}</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        {profiles.map(p => {
                                            const sel = p.id === (selectedProfileId ?? selectedProfile?.id);
                                            const auto = !selectedProfileId && p.id === selectedProfile?.id;
                                            return (
                                                <button key={p.id} type="button"
                                                    onClick={() => setSelectedProfileId(p.id)}
                                                    className={cn('w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                                                        sel ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:border-blue-200')}>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn('text-[12px] font-bold', sel ? 'text-blue-700' : 'text-slate-800')}>{p.name}</span>
                                                        {auto && <span className="rounded-full border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">Auto</span>}
                                                        {p.isDefault && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">Default</span>}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5">{p.description}</div>
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {p.appliesTo.map(t => (
                                                            <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                                {DQ_DRIVER_TYPES.find(d => d.id === t)?.label ?? t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {selectedProfileId && (
                                        <button type="button" onClick={() => setSelectedProfileId(null)}
                                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                                            ↩ Reset to auto-detect
                                        </button>
                                    )}
                                </div>
                            </SectionCard>

                            {/* Quick actions */}
                            {selectedDriver && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick Actions</div>
                                    <button className="w-full h-9 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 inline-flex items-center justify-center gap-1.5">
                                        <UploadCloud size={14} /> Upload Missing Documents
                                    </button>
                                    <button className="w-full h-9 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 inline-flex items-center justify-center gap-1.5">
                                        <ClipboardList size={14} /> Request from Driver
                                    </button>
                                    <button className="w-full h-9 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 inline-flex items-center justify-center gap-1.5"
                                        onClick={() => onNavigate?.('/settings/compliance-setup')}>
                                        <Settings size={14} /> Compliance Settings
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Right panel — DQ file content */}
                        <div className="space-y-4">
                            {!selectedDriver ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                                    <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                        <User size={28} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">Select a driver</h3>
                                    <p className="text-sm text-slate-500">Pick a driver from the list to generate their DQ file.</p>
                                </div>
                            ) : !dqResult ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-16 text-center shadow-sm">
                                    <div className="mx-auto h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                                        <ClipboardList size={28} className="text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">No profile selected</h3>
                                    <p className="text-sm text-slate-500">Select a DQ checklist profile to generate the file.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Driver info card */}
                                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
                                            <div className="flex items-center gap-3">
                                                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold">
                                                    {selectedDriver.firstName[0]}{selectedDriver.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="text-lg font-bold">{selectedDriver.firstName} {selectedDriver.lastName}</div>
                                                    <div className="text-[12px] text-blue-100">{selectedDriver.email} · {selectedDriver.licenseType} · {selectedDriver.positionApplied}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</div>
                                                <div className="text-[12px] text-slate-700 mt-0.5">{selectedDriver.city}, {selectedDriver.state}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">DOB</div>
                                                <div className="text-[12px] text-slate-700 mt-0.5 font-mono">{selectedDriver.dateOfBirth}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stage</div>
                                                <div className="text-[12px] text-slate-700 mt-0.5 capitalize">{selectedDriver.stage.replace(/_/g, ' ')}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days in pipeline</div>
                                                <div className="text-[12px] text-slate-700 mt-0.5 tabular-nums">{selectedDriver.daysInPipeline}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DQ Progress summary */}
                                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">DQ File Completion</h3>
                                                <p className="text-[11px] text-slate-500">
                                                    Profile: <span className="font-bold text-blue-700">{selectedProfile?.name}</span> · {dqResult.rollup.required} items required
                                                </p>
                                            </div>
                                            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold',
                                                dqResult.rollup.missing === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                                                {dqResult.rollup.missing === 0 ? <><CheckCircle2 size={13} /> Complete</> : <><AlertCircle size={13} /> {dqResult.rollup.missing} missing</>}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-3 gap-4">
                                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                                                <div className="text-2xl font-extrabold text-emerald-700 tabular-nums">{dqResult.rollup.present}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Present</div>
                                            </div>
                                            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-center">
                                                <div className="text-2xl font-extrabold text-rose-700 tabular-nums">{dqResult.rollup.missing}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Missing</div>
                                            </div>
                                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
                                                <div className="text-2xl font-extrabold text-blue-700 tabular-nums">{dqResult.pct}%</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Complete</div>
                                            </div>
                                        </div>
                                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                                            <div className={cn('h-full rounded-full transition-all', dqResult.rollup.missing === 0 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${dqResult.pct}%` }} />
                                        </div>
                                    </div>

                                    {/* DQ Checklist sections */}
                                    {dqResult.sections.map(sec => {
                                        const present = sec.items.filter(i => i.status === 'present').length;
                                        const required = sec.items.filter(i => i.status !== 'na').length;
                                        const secMissing = required - present;
                                        return (
                                            <SectionCard key={sec.title} title={sec.title}
                                                right={
                                                    secMissing > 0
                                                        ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{secMissing} missing</span>
                                                        : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Complete</span>
                                                }>
                                                <ul className="divide-y divide-slate-100">
                                                    {sec.items.map((row, i) => (
                                                        <li key={i} className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/50">
                                                            <StatusIcon status={row.status} />
                                                            <span className={cn('min-w-0 flex-1 text-[13px]', row.status === 'missing' ? 'font-semibold text-slate-800' : 'text-slate-600')}>
                                                                {row.item.label}
                                                                {row.item.conditional && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">if applicable</span>}
                                                            </span>
                                                            <StatusBadge status={row.status} />
                                                            {row.status === 'missing' && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <button className="h-6 px-2 rounded border border-blue-200 bg-blue-50 text-[10px] font-semibold text-blue-700 hover:bg-blue-100 inline-flex items-center gap-1">
                                                                        <UploadCloud size={10} /> Upload
                                                                    </button>
                                                                </div>
                                                            )}
                                                            {row.status === 'present' && (
                                                                <div className="flex items-center gap-1">
                                                                    <button className="h-6 px-2 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 hover:border-blue-300 inline-flex items-center gap-1">
                                                                        <Eye size={10} /> View
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </SectionCard>
                                        );
                                    })}

                                    {/* Document types from Settings */}
                                    <SectionCard title="Settings Document Types" defaultOpen={false}
                                        right={<span className="text-[10px] font-bold text-slate-400">{docTypes.filter(dt => dt.status === 'Active' && dt.usingInHiring).length} types</span>}>
                                        <div className="divide-y divide-slate-50">
                                            {docTypes.filter(dt => dt.status === 'Active' && dt.usingInHiring).map(dt => {
                                                const kw = dt.name.toLowerCase();
                                                const matched = dqResult.sections.some(sec =>
                                                    sec.items.some(row => row.status === 'present' && row.item.keywords.some(k => kw.includes(k) || k.includes(kw)))
                                                );
                                                return <DocumentManifestRow key={dt.id} docType={dt} status={matched ? 'present' : 'missing'} />;
                                            })}
                                        </div>
                                    </SectionCard>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
