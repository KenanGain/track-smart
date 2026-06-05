// Driver profile → "Application" section. Shows the data captured from the
// driver's hiring application, grouped by the form it came from (data ↔ form ↔
// driver). Read-only; sourced from the snapshot written on Add-as-driver.

import { Inbox, FileText, ShieldCheck, PenTool } from 'lucide-react';
import { getDriverApplicationSnapshot, type DriverApplicationForm } from '@/pages/ats/hiring-application.data';
import { getApplicationForm, type FormField } from '@/pages/ats/application-forms.data';
import { resolveFormDocType, resolveKeyNumber } from '@/pages/ats/form-doc-resolver';

const DISPLAY = new Set<FormField['type']>(['heading', 'paragraph', 'bullet-list', 'alert']);

function fmt(v: unknown): string {
    if (v == null || v === '') return '—';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) {
        if (v.length === 0) return '—';
        if (typeof v[0] === 'string') return (v as string[]).join(', ');
        return `${v.length} record${v.length === 1 ? '' : 's'}`;
    }
    if (typeof v === 'object') {
        const o = v as Record<string, unknown>;
        const files = Array.isArray(o.files) ? (o.files as string[]).filter(Boolean) : [];
        const bits = [typeof o.number === 'string' ? o.number : '', files.join(', '), o.expiry as string, o.issueDate as string]
            .filter(Boolean);
        return bits.length ? bits.join(' · ') : '—';
    }
    return String(v);
}

function FormCard({ form }: { form: DriverApplicationForm }) {
    const def = form.formId ? getApplicationForm(form.formId) : undefined;
    const fields = (def?.fields ?? []).filter(f => !DISPLAY.has(f.type));
    const values = form.values ?? {};
    const Icon = form.kind === 'consent' ? ShieldCheck : FileText;

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <Icon size={15} className="text-blue-500" />
                <span className="text-sm font-bold text-slate-800">{form.name}</span>
                {form.submittedAt && <span className="ml-auto text-[11px] text-slate-400">{new Date(form.submittedAt).toLocaleDateString()}</span>}
            </div>
            <div className="p-4">
                {form.kind === 'consent' ? (
                    <div className="flex items-center gap-2 text-[13px] text-slate-600">
                        <PenTool size={14} className="text-slate-400" />
                        {form.signature
                            ? <><span>Signed</span><img src={form.signature} alt="signature" className="h-10 rounded border border-slate-200 bg-white object-contain p-0.5" /></>
                            : <span className="text-slate-400">Acknowledged (no signature)</span>}
                    </div>
                ) : fields.length === 0 ? (
                    <p className="text-[13px] text-slate-400">No fields captured.</p>
                ) : (
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
                        {fields.map(f => {
                            const label = f.type === 'compliance' ? (resolveKeyNumber(f.complianceKeyNumberId)?.name ?? f.label)
                                : f.type === 'document' ? (resolveFormDocType(f.documentTypeId)?.name ?? f.label)
                                    : f.label;
                            return (
                                <div key={f.id} className="min-w-0">
                                    <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
                                    <dd className="truncate text-[13px] text-slate-800">{fmt(values[f.id])}</dd>
                                </div>
                            );
                        })}
                    </dl>
                )}
            </div>
        </div>
    );
}

export function DriverApplicationData({ driverId }: { driverId: string }) {
    const snap = getDriverApplicationSnapshot(driverId);

    if (!snap || snap.forms.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                <Inbox className="mx-auto mb-3 text-slate-300" size={36} />
                <p className="text-sm font-medium text-slate-700">No hiring-application data for this driver</p>
                <p className="mt-1 text-[12px] text-slate-500">When a driver is hired from an application, the data they submitted on each form is captured here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Hiring Application Data</h3>
                    <p className="text-[12px] text-slate-500">Captured from {snap.forms.length} form{snap.forms.length === 1 ? '' : 's'} — exactly what the driver submitted, grouped by form.</p>
                </div>
                <span className="text-[11px] text-slate-400">Captured {new Date(snap.capturedAt).toLocaleDateString()}</span>
            </div>
            {snap.forms.map(form => <FormCard key={form.stepId} form={form} />)}
        </div>
    );
}
