// ─────────────────────────────────────────────────────────────────────────────
// Editing one annual record, in the shape the asset form asks for it.
//
// The Add Asset wizard captures these two — the annual safety inspection and the annual
// preventive-maintenance service — as a block of four questions: when it was done, at what
// reading, when the next one is owed, and the certificate. This is that block, over the
// record already on file, so correcting one does not mean learning a second form.
//
// Everything below the fields is shared rather than re-drawn: the same `UploadZone` the
// wizard uses, and the same `MonitoringToggle` the Compliances tab uses. An alert set here
// is an alert the office can see and change there, because it is the same control writing
// the same config onto the same record.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Wrench, Gauge, FileText, FilePlus2, X, Check } from 'lucide-react';
import { UploadZone } from '@/components/ui/UploadZone';
import { MonitoringToggle } from '@/pages/compliance/MonitoringToggle';
import type { DataDocFile, DocVersion } from '@/pages/compliance/compliance-data-store';
import type { SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';
import { cn } from '@/lib/utils';

/** The odometer and its unit are the record's own extra fields; these are their keys. */
const ODO = 'odometer';
const ODO_UNIT = 'odometerUnit';

export function AnnualRecordDialog({ record, subjectLabel, version, onClose, onSave, onAddNew }: {
    record: SafetyRecord;
    /** The unit this is filed against — "ACM-T0101". */
    subjectLabel: string;
    version: DocVersion;
    onClose: () => void;
    onSave: (next: DocVersion) => void;
    /**
     * File a NEW one instead of correcting this one.
     *
     * The difference matters and is easy to miss: saving here changes the record on file,
     * which is right when a date was typed wrong, and wrong when this year's inspection has
     * been done — that is a new record, and last year's is the history a claim is argued
     * from. So the choice sits in the form, where somebody is already standing.
     */
    onAddNew?: () => void;
}) {
    const [v, setV] = useState<DocVersion>(version);
    const set = (patch: Partial<DocVersion>) => setV((cur) => ({ ...cur, ...patch }));
    const setField = (key: string, value: string) =>
        setV((cur) => ({ ...cur, fields: { ...(cur.fields ?? {}), [key]: value } }));

    const unit = v.fields?.[ODO_UNIT] || 'miles';
    const field = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
    const label = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600';

    /** A dropped file, as the record stores it — readable back after a reload. */
    const take = (files: FileList | null) => {
        const f = files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            const doc: DataDocFile = {
                name: f.name,
                size: f.size,
                url: typeof reader.result === 'string' ? reader.result : undefined,
                uploadedAt: new Date().toISOString(),
            };
            set({ files: [doc, ...v.files.filter((x) => x.name !== f.name)] });
        };
        reader.readAsDataURL(f);
    };

    // A date it was done or a date it is next owed — one of the two, or there is no record.
    const valid = !!v.issueDate || !!v.expiryDate;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-2xl max-h-[88vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Wrench size={16} />
                        </span>
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-slate-900">
                                {record.recordName} <span className="text-[13px] font-medium text-slate-500">· {subjectLabel}</span>
                            </h3>
                            <p className="mt-0.5 text-[13px] text-slate-500">
                                {record.description} — filed against this asset as a Compliance &amp; Documents record.
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Editing the record on file. Had this service done again? Add a new record
                                instead, and this one stays as history.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={label}>{record.issueLabel ?? 'Last done'}</label>
                            <input
                                type="date"
                                value={v.issueDate}
                                onChange={(e) => set({ issueDate: e.target.value })}
                                className={field}
                            />
                        </div>
                        <div>
                            <label className={label}>Odometer</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Gauge size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={v.fields?.[ODO] ?? ''}
                                        onChange={(e) => setField(ODO, e.target.value)}
                                        placeholder="e.g. 412,500"
                                        className={cn(field, 'pl-9 tabular-nums')}
                                    />
                                </div>
                                <select
                                    value={unit}
                                    onChange={(e) => setField(ODO_UNIT, e.target.value)}
                                    className="h-10 shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                                >
                                    <option value="miles">miles</option>
                                    <option value="km">km</option>
                                </select>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">The reading it was done at.</p>
                        </div>
                        <div>
                            <label className={label}>Next due date</label>
                            <input
                                type="date"
                                value={v.expiryDate}
                                onChange={(e) => set({ expiryDate: e.target.value })}
                                className={field}
                            />
                            <p className="mt-1 text-xs text-slate-500">What the alert counts down to.</p>
                        </div>
                    </div>

                    <div>
                        <label className={label}>{record.documentName || 'Document'}</label>
                        {v.files.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                                {v.files.map((f) => (
                                    <span key={f.name} className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-slate-700">
                                        <FileText size={13} className="shrink-0 text-slate-400" />
                                        <span className="truncate">{f.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => set({ files: v.files.filter((x) => x.name !== f.name) })}
                                            className="ml-1 rounded p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"
                                            aria-label={`Remove ${f.name}`}
                                        >
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <UploadZone
                            variant="card"
                            label="Click to upload or drag &amp; drop"
                            hint="Attach the signed copy (PDF, JPG, PNG)"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onFiles={take}
                        />
                    </div>

                    {/* The Compliances tab's own monitoring control, writing the same config. */}
                    <MonitoringToggle
                        record={record}
                        monitoring={v.monitoring}
                        issueDate={v.issueDate}
                        expiryDate={v.expiryDate}
                        status={v.status ?? ''}
                        onChange={(monitoring) => set({ monitoring })}
                    />
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    {onAddNew && (
                        <button
                            type="button"
                            onClick={onAddNew}
                            className="mr-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-700"
                        >
                            <FilePlus2 size={15} className="text-slate-400" /> Add new record
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!valid}
                        onClick={() => onSave(v)}
                        className={cn(
                            'inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white',
                            valid ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300',
                        )}
                    >
                        <Check size={15} /> Save changes
                    </button>
                </div>
            </div>
        </div>
    );
}
