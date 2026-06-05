import {
    Eye, Download, UploadCloud, BadgeCheck, AlertCircle, Clock,
    MessageSquarePlus, KeyRound, FileText, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { requirementSummary, type Requirement, type RequirementStatus } from "./hiring-requirements";

const STATUS_META: Record<RequirementStatus, { label: string; cls: string; Icon: React.ElementType }> = {
    missing: { label: 'Missing', cls: 'border-rose-200 bg-rose-50 text-rose-700', Icon: AlertCircle },
    uploaded: { label: 'Uploaded', cls: 'border-blue-200 bg-blue-50 text-blue-700', Icon: UploadCloud },
    verified: { label: 'Verified', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: BadgeCheck },
    ordered: { label: 'Ordered', cls: 'border-amber-200 bg-amber-50 text-amber-700', Icon: Clock },
};

function ReqBtn({ Icon, label, onClick, tone = 'ghost' }: { Icon: React.ElementType; label: string; onClick?: () => void; tone?: 'ghost' | 'primary' | 'good' }) {
    return (
        <button type="button" onClick={onClick}
            className={cn('inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors',
                tone === 'primary' ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700')}>
            <Icon size={12} /> {label}
        </button>
    );
}

/**
 * The single Document + Compliance requirement list, used across Application
 * Tracking / Hiring ATS / DQ. Each row = one requirement with live status and
 * Upload / View / Download / Order / Verify actions.
 */
export function RequirementList({ requirements, onUpload, onOrder, onVerify, title = 'Documents & Compliance' }: {
    requirements: Requirement[];
    onUpload: (r: Requirement) => void;
    onOrder?: (r: Requirement) => void;
    onVerify?: (r: Requirement) => void;
    title?: string;
}) {
    const sum = requirementSummary(requirements);
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Header + progress */}
            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                        <p className="text-[11px] text-slate-500">One list for every document and key-number the driver must provide.</p>
                    </div>
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold',
                        sum.missing === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                        {sum.missing === 0 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {sum.fulfilled}/{sum.total} fulfilled
                    </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', sum.missing === 0 ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${sum.pct}%` }} />
                </div>
            </div>

            {requirements.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-slate-400">No document or compliance requirements for this application yet.</div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {requirements.map(r => {
                        const sm = STATUS_META[r.status];
                        const metaBits = [
                            r.meta.number && `No. ${r.meta.number}`,
                            r.meta.issue && `Issued ${r.meta.issue}`,
                            r.meta.expiry && `Exp ${r.meta.expiry}`,
                            r.meta.state, r.meta.country,
                        ].filter(Boolean);
                        const has = r.files.length > 0 || r.status === 'uploaded' || r.status === 'verified';
                        return (
                            <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                                <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                    r.kind === 'compliance' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600')}>
                                    {r.kind === 'compliance' ? <KeyRound size={15} /> : <FileText size={15} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[13px] font-bold text-slate-800">{r.label}</span>
                                        {r.required && <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600">Required</span>}
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{r.kind === 'compliance' ? 'Key number' : 'Document'}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500">
                                        {metaBits.length ? metaBits.join(' · ') : r.source}
                                        {r.files.length > 0 && <span className="text-slate-400"> · {r.files.length} file{r.files.length === 1 ? '' : 's'}</span>}
                                    </p>
                                </div>
                                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', sm.cls)}>
                                    <sm.Icon size={11} /> {sm.label}
                                </span>
                                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                                    {has && <ReqBtn Icon={Eye} label="View" />}
                                    {has && <ReqBtn Icon={Download} label="Download" />}
                                    <ReqBtn Icon={UploadCloud} label={has ? 'Replace' : 'Upload'} onClick={() => onUpload(r)} tone={has ? 'ghost' : 'primary'} />
                                    {has && r.status !== 'verified' && onVerify && <ReqBtn Icon={BadgeCheck} label="Verify" onClick={() => onVerify(r)} tone="good" />}
                                    {onOrder && <ReqBtn Icon={MessageSquarePlus} label="Order" onClick={() => onOrder(r)} />}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
