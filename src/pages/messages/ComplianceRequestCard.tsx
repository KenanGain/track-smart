// ─────────────────────────────────────────────────────────────────────────────
// Compliance request — the interactive card an AI agent delivers into a driver's
// chat when you tag them with `@`, pick a compliance / document record with `/`,
// and ask the agent to send it.
//
// The driver opens it right in the chat and gets the SAME field set the office sees
// on the Default Compliances & Documents data form for that record: the number/code
// field (only when that record has one), country + state, issue date, the monitored
// expiry date (or a status, for status-only records), labelled upload slots (Front /
// Back …) or a single/multi upload, and notes. Submitting writes a real version onto
// that driver's compliance record.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
    Upload, UploadCloud, X, Check, CheckCircle2, FileText, Trash2, ClipboardList,
    Hash, MapPin, CalendarClock, ShieldCheck, AlertCircle, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES, ALL_COUNTRIES, STATES_BY_COUNTRY } from '@/pages/compliance/jurisdiction.data';
import type { DataDocFile } from '@/pages/compliance/compliance-data-store';
import { askChecklist, type ComplianceAsk, type ComplianceRequest, type ComplianceSubmission } from './ai-agents';
import { readAsDataUrl } from './compliance-picker';

const STATUS_OPTIONS = ['Active', 'Pending', 'On File', 'Complete', 'Incomplete', 'Expired', 'Inactive'];
const MAX_FILES = 6;

const inputCls = 'w-full h-9 px-3 rounded-lg border border-slate-300 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400';

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 flex items-baseline gap-1 text-[11px] font-bold text-slate-600">
                {label}
                {required ? <span className="text-rose-500">*</span> : <span className="text-[10px] font-semibold text-slate-400">optional</span>}
            </span>
            {children}
            {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
        </label>
    );
}

function UploadZone({ label, hint, multiple, onFiles }: {
    label: string; hint?: string; multiple?: boolean; onFiles: (list: FileList | null) => void;
}) {
    const [over, setOver] = useState(false);
    return (
        <label
            onDragOver={e => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={e => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer.files); }}
            className={cn('flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center transition-colors',
                over ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50/60 hover:border-blue-300 hover:bg-blue-50/40')}
        >
            <UploadCloud size={18} className={over ? 'text-blue-500' : 'text-slate-400'} />
            <span className="text-[11.5px] font-semibold text-slate-600">{label}</span>
            {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
            <input type="file" multiple={multiple} className="hidden" onChange={e => { onFiles(e.target.files); e.currentTarget.value = ''; }} />
        </label>
    );
}

function FileChip({ f, onRemove }: { f: DataDocFile; onRemove?: () => void }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-2.5 py-1.5">
            <FileText size={13} className="shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-700" title={f.name}>{f.name}</span>
            {f.slot && <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-emerald-700">{f.slot}</span>}
            {onRemove && (
                <button type="button" onClick={onRemove} title="Remove"
                    className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"><Trash2 size={12} /></button>
            )}
        </div>
    );
}

// ── the fill & upload sheet ──────────────────────────────────────────────────

function SubmitSheet({ ask, forName, onClose, onSubmit }: {
    ask: ComplianceAsk; forName: string;
    onClose: () => void;
    onSubmit: (submission: ComplianceSubmission, files: DataDocFile[]) => void;
}) {
    const countries = ask.allCountries ? ALL_COUNTRIES : COUNTRIES;
    const [numberValue, setNumberValue] = useState('');
    const [country, setCountry] = useState('');
    const [stateProv, setStateProv] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [statusValue, setStatusValue] = useState('');
    /** Values for the ask's extra select fields (e.g. a drug test's Test type), keyed by field key. */
    const [extra, setExtra] = useState<Record<string, string>>({});
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<DataDocFile[]>([]);
    const [touched, setTouched] = useState(false);

    const states = STATES_BY_COUNTRY[country] ?? [];
    const slots = ask.slotLabels ?? [];

    const addFiles = async (list: FileList | null, slot?: string) => {
        if (!list || !list.length) return;
        const room = Math.max(0, MAX_FILES - files.length);
        const picked = Array.from(list).slice(0, slot ? 1 : Math.max(1, room));
        const docs: DataDocFile[] = await Promise.all(picked.map(async f => ({
            name: f.name, size: f.size, url: await readAsDataUrl(f), slot, uploadedAt: new Date().toISOString(),
        })));
        setFiles(prev => (slot ? [...prev.filter(p => p.slot !== slot), ...docs] : [...prev, ...docs].slice(0, MAX_FILES)));
    };

    const missing = useMemo(() => {
        const m: string[] = [];
        if (ask.needsNumber && ask.numberRequired && !numberValue.trim()) m.push(ask.numberName);
        for (const f of ask.selects ?? []) if (f.required && !extra[f.key]) m.push(f.label);
        if (ask.needsExpiryDate && !expiryDate) m.push(ask.monitorType || 'Expiry date');
        if (ask.needsStatus && !statusValue) m.push(ask.statusLabel ?? 'Status');
        if (ask.needsUpload) {
            if (slots.length) {
                const open = slots.filter(s => !files.some(f => f.slot === s));
                if (open.length) m.push(...open.map(s => `${s} upload`));
            } else if (!files.length) m.push(ask.documentName || 'Document');
        }
        return m;
    }, [ask, numberValue, extra, expiryDate, statusValue, files, slots]);

    const submit = () => {
        setTouched(true);
        if (missing.length) return;
        const at = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        onSubmit({
            numberValue: numberValue.trim() || undefined,
            country: country || undefined,
            stateProv: stateProv || undefined,
            issueDate: issueDate || undefined,
            expiryDate: expiryDate || undefined,
            statusValue: statusValue || undefined,
            fields: Object.keys(extra).length ? extra : undefined,
            notes: notes.trim() || undefined,
            files: files.map(f => ({ name: f.name, slot: f.slot, size: f.size })),
            at,
        }, files);
    };

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-6" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
            >
                {/* header */}
                <div className="flex items-start gap-3 border-b border-slate-200 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Upload size={17} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold text-slate-900">{ask.recordName}</p>
                        <p className="truncate text-[11.5px] text-slate-500">{ask.documentName || ask.description}</p>
                    </div>
                    <button type="button" onClick={onClose} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
                </div>

                {/* body */}
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
                    <div className="flex items-center gap-2 rounded-lg bg-blue-50/70 px-3 py-2">
                        <ShieldCheck size={14} className="shrink-0 text-blue-500" />
                        <p className="text-[11px] font-medium text-slate-600">
                            Requested from <span className="font-bold text-slate-800">{forName}</span> · goes straight onto their {ask.entity.toLowerCase()} compliance record.
                        </p>
                    </div>

                    {/* DETAILS */}
                    {(ask.needsNumber || !!ask.selects?.length || ask.needsCountry || ask.needsState || ask.needsIssueDate || ask.needsExpiryDate || ask.needsStatus) && (
                        <>
                            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><Hash size={11} /> Details</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {ask.needsNumber && (
                                    <Field label={ask.numberName} required={ask.numberRequired}>
                                        <input value={numberValue} onChange={e => setNumberValue(e.target.value)}
                                            placeholder={`Enter ${ask.numberName.toLowerCase()}`} className={inputCls} />
                                    </Field>
                                )}
                                {(ask.selects ?? []).map(f => (
                                    <Field key={f.key} label={f.label} required={!!f.required}>
                                        <select value={extra[f.key] ?? ''} onChange={e => setExtra(prev => ({ ...prev, [f.key]: e.target.value }))} className={inputCls}>
                                            <option value="">{f.placeholder ?? `Select ${f.label.toLowerCase()}`}</option>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </Field>
                                ))}
                                {ask.needsCountry && (
                                    <Field label="Country">
                                        <select value={country} onChange={e => { setCountry(e.target.value); setStateProv(''); }} className={inputCls}>
                                            <option value="">Select country</option>
                                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </Field>
                                )}
                                {ask.needsState && (
                                    <Field label="State / Province">
                                        <select value={stateProv} disabled={!states.length} onChange={e => setStateProv(e.target.value)} className={inputCls}>
                                            <option value="">{states.length ? 'Select state / province' : 'Pick a country first'}</option>
                                            {states.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </Field>
                                )}
                                {/* Same order as the office form: what the record is, then its dates. */}
                                {ask.needsStatus && (
                                    <Field label={ask.statusLabel ?? 'Status'} required>
                                        {ask.statusControl === 'radio' ? (
                                            <div className="flex flex-wrap items-center gap-2">
                                                {(ask.statusOptions ?? STATUS_OPTIONS).map(o => {
                                                    const on = statusValue === o;
                                                    return (
                                                        <label key={o}
                                                            className={cn('inline-flex h-9 min-w-[6.5rem] flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                                                                on ? 'border-blue-400 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50')}>
                                                            <input type="radio" name="cr-status" value={o} checked={on} onChange={() => setStatusValue(o)}
                                                                className="h-3.5 w-3.5 shrink-0 border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                            <span className="truncate">{o}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <select value={statusValue} onChange={e => setStatusValue(e.target.value)} className={inputCls}>
                                                <option value="">{`Select ${(ask.statusLabel ?? 'status').toLowerCase()}`}</option>
                                                {(ask.statusOptions ?? STATUS_OPTIONS).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        )}
                                    </Field>
                                )}
                                {ask.needsIssueDate && (
                                    <Field label="Issue date">
                                        <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={inputCls} />
                                    </Field>
                                )}
                                {ask.needsExpiryDate && (
                                    <Field label={ask.monitorType || 'Expiry date'} required hint={ask.recurring ? `Renewal: ${ask.recurring}` : undefined}>
                                        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className={inputCls} />
                                    </Field>
                                )}
                            </div>
                        </>
                    )}

                    {/* UPLOAD */}
                    {ask.needsUpload && (
                        <div className="border-t border-slate-100 pt-3">
                            <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"><UploadCloud size={11} /> {ask.multi ? 'Documents' : 'Document'}</p>
                            <p className="mb-2 text-[12px] font-semibold text-slate-600">{ask.documentName || 'Document'}</p>
                            {slots.length ? (
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {slots.map(slot => {
                                        const f = files.find(x => x.slot === slot);
                                        return (
                                            <div key={slot}>
                                                <p className="mb-1 text-[11px] font-semibold text-slate-500">{slot}</p>
                                                {f
                                                    ? <FileChip f={f} onRemove={() => setFiles(prev => prev.filter(x => x.slot !== slot))} />
                                                    : <UploadZone label={`Add ${slot}`} hint="Photo or PDF" onFiles={l => addFiles(l, slot)} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {files.map((f, i) => <FileChip key={i} f={f} onRemove={() => setFiles(prev => prev.filter((_, x) => x !== i))} />)}
                                    {files.length < MAX_FILES && (
                                        <UploadZone
                                            multiple={ask.multi}
                                            label={files.length ? 'Add another file' : 'Take a photo or attach a file'}
                                            hint={ask.multi ? `Up to ${MAX_FILES} files · PDF or image` : 'PDF or image'}
                                            onFiles={l => addFiles(l)} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border-t border-slate-100 pt-3">
                        <Field label="Notes">
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Anything the office should know…"
                                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-[13px] focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                        </Field>
                    </div>

                    {touched && missing.length > 0 && (
                        <div className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2">
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-500" />
                            <p className="text-[11.5px] font-medium text-rose-700">Still needed: {missing.join(', ')}.</p>
                        </div>
                    )}
                </div>

                {/* footer */}
                <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-slate-400">
                        {missing.length ? `${missing.length} item${missing.length > 1 ? 's' : ''} left` : 'Ready to submit'}
                    </span>
                    <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-[12.5px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700">Cancel</button>
                    <button type="button" onClick={submit} disabled={touched && missing.length > 0}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[12.5px] font-bold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <Check size={14} /> Submit
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ── the chat card ────────────────────────────────────────────────────────────

export function ComplianceRequestCard({ request, preview, onSubmit, onOpenRecord }: {
    request: ComplianceRequest;
    /** Office-side mirror of what was sent — no fill button. */
    preview?: boolean;
    onSubmit?: (submission: ComplianceSubmission, files: DataDocFile[]) => void;
    onOpenRecord?: () => void;
}) {
    const [open, setOpen] = useState(false);
    const { ask } = request;
    const done = request.status === 'submitted';
    const checklist = askChecklist(ask);
    const sub = request.submission;

    const captured: { label: string; value: string }[] = sub
        ? [
            ...(sub.numberValue ? [{ label: ask.numberName || 'Number', value: sub.numberValue }] : []),
            ...(ask.selects ?? []).flatMap(f => (sub.fields?.[f.key] ? [{ label: f.label, value: sub.fields[f.key] }] : [])),
            ...(sub.country ? [{ label: 'Country', value: sub.country }] : []),
            ...(sub.stateProv ? [{ label: 'State / Province', value: sub.stateProv }] : []),
            ...(sub.issueDate ? [{ label: 'Issue date', value: sub.issueDate }] : []),
            ...(sub.expiryDate ? [{ label: ask.monitorType || 'Expiry date', value: sub.expiryDate }] : []),
            ...(sub.statusValue ? [{ label: ask.statusLabel ?? 'Status', value: sub.statusValue }] : []),
        ]
        : [];

    return (
        <div className={cn('mt-3 overflow-hidden rounded-xl border shadow-sm',
            done ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-200 bg-blue-50/30')}>
            {/* header */}
            <div className="flex items-start gap-2.5 p-3">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    done ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}>
                    {done ? <CheckCircle2 size={17} /> : ask.needsUpload ? <Upload size={17} /> : <ClipboardList size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn('rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide',
                            done ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                            {done ? 'Submitted' : ask.needsUpload ? 'Document request' : 'Data request'}
                        </span>
                        <span className="rounded bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">{ask.entity}</span>
                        {request.dueLabel && !done && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-amber-700"><Clock size={9} /> {request.dueLabel}</span>
                        )}
                    </div>
                    <p className="mt-1 truncate text-[13px] font-bold text-slate-800">{ask.recordName}</p>
                    <p className="truncate text-[11px] text-slate-500">{ask.documentName || ask.description}</p>
                </div>
            </div>

            {/* what's needed / what came back */}
            {!done ? (
                <div className="border-t border-blue-100 bg-white/70 px-3 py-2.5">
                    <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">What’s needed</p>
                    <ul className="space-y-1">
                        {checklist.map(c => (
                            <li key={c} className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-600">
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" /> {c}
                            </li>
                        ))}
                        {!checklist.length && <li className="text-[11.5px] text-slate-400">Just a confirmation — no fields to fill.</li>}
                    </ul>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] font-medium text-slate-400">
                        <span className="inline-flex items-center gap-1"><MapPin size={10} /> {ask.category}</span>
                        {ask.monitorType && <span className="inline-flex items-center gap-1"><CalendarClock size={10} /> {ask.monitorType}</span>}
                    </div>
                </div>
            ) : (
                <div className="border-t border-emerald-100 bg-white/70 px-3 py-2.5">
                    {captured.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {captured.map(c => (
                                <div key={c.label} className="min-w-0">
                                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{c.label}</p>
                                    <p className="truncate text-[11.5px] font-semibold text-slate-700" title={c.value}>{c.value}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    {sub && sub.files.length > 0 && (
                        <div className={cn('space-y-1.5', captured.length > 0 && 'mt-2.5 border-t border-slate-100 pt-2.5')}>
                            {sub.files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 rounded-lg bg-emerald-50/70 px-2.5 py-1.5">
                                    <FileText size={13} className="shrink-0 text-emerald-600" />
                                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-slate-700">{f.name}</span>
                                    {f.slot && <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-emerald-700">{f.slot}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                    {sub?.notes && <p className="mt-2 text-[11.5px] italic text-slate-500">“{sub.notes}”</p>}
                </div>
            )}

            {/* action */}
            <div className="flex items-center gap-2 border-t px-3 py-2.5"
                 style={{ borderColor: done ? 'rgb(209 250 229)' : 'rgb(219 234 254)' }}>
                {done ? (
                    <>
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-[12px] font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Submitted{sub?.at ? ` · ${sub.at}` : ''}
                        </span>
                        {onOpenRecord && (
                            <button type="button" onClick={onOpenRecord}
                                className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-blue-700">
                                Open record <FileText size={11} />
                            </button>
                        )}
                    </>
                ) : preview ? (
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-500">
                        <Clock size={12} /> Waiting on {request.forName.split(/\s+/)[0] || 'the driver'} to fill it in
                    </span>
                ) : (
                    <button type="button" onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-blue-700">
                        {ask.needsUpload ? <Upload size={13} /> : <ClipboardList size={13} />} Fill in & upload
                    </button>
                )}
            </div>

            {open && !done && onSubmit && (
                <SubmitSheet
                    ask={ask}
                    forName={request.forName || 'you'}
                    onClose={() => setOpen(false)}
                    onSubmit={(s, files) => { setOpen(false); onSubmit(s, files); }}
                />
            )}
        </div>
    );
}
