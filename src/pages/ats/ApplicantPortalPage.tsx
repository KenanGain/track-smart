import { useMemo, useState } from 'react';
import { FileText, Check, Save, ChevronRight, ShieldCheck, AlertCircle, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormBody, type FieldValue } from './CustomFormWizard';
import { SignaturePad } from './SignaturePad';
import { loadApplicationForms, type ApplicationFormDef } from './application-forms.data';
import { CONSENT_BY_ID, type ConsentCategory } from './consent-forms.data';
import { loadTemplates, type DriverHiringTemplate, type TemplateStep } from '@/pages/settings/driver-hiring-templates.data';
import {
    getApplicant, getApplication, markStepInProgress, submitStep,
    type HiringApplication, type AppStepStatus,
} from './hiring-application.data';

/**
 * Driver-facing application portal — the page behind the invite link
 * (`/apply/:id`). No auth in the prototype: the link is the token. The driver
 * walks the assigned hiring template's steps; each Save persists the step and
 * marks it submitted, which drives our internal status.
 */
export function ApplicantPortalPage({ applicantId, onNavigate }: { applicantId: string; onNavigate?: (path: string) => void }) {
    const applicant = useMemo(() => getApplicant(applicantId), [applicantId]);
    const template = useMemo<DriverHiringTemplate | undefined>(() => {
        const app = getApplication(applicantId);
        return loadTemplates().find(t => t.id === app?.templateId);
    }, [applicantId]);
    const formById = useMemo(() => {
        const m = new Map<string, ApplicationFormDef>();
        for (const f of loadApplicationForms()) m.set(f.id, f);
        return m;
    }, []);

    // Live application snapshot (re-read after each save to reflect persisted status).
    const [app, setApp] = useState<HiringApplication | undefined>(() => getApplication(applicantId));
    const refresh = () => setApp(getApplication(applicantId));

    const steps = template?.steps ?? [];
    const [activeIdx, setActiveIdx] = useState(() => {
        const a = getApplication(applicantId);
        const firstOpen = steps.findIndex(s => {
            const st = a?.steps[s.id]?.status ?? 'not_started';
            return st !== 'submitted' && st !== 'approved';
        });
        return firstOpen < 0 ? 0 : firstOpen;
    });

    // Per-step working values + signatures, seeded from any persisted submission
    // (so a returned step re-opens with the driver's previous answers).
    const [valuesByStep, setValuesByStep] = useState<Record<string, Record<string, FieldValue>>>(() => {
        const seed: Record<string, Record<string, FieldValue>> = {};
        const a = getApplication(applicantId);
        for (const s of steps) if (a?.steps[s.id]?.values) seed[s.id] = a.steps[s.id]!.values as Record<string, FieldValue>;
        return seed;
    });
    const [sigByStep, setSigByStep] = useState<Record<string, string | null>>(() => {
        const seed: Record<string, string | null> = {};
        const a = getApplication(applicantId);
        for (const s of steps) if (a?.steps[s.id]?.signature) seed[s.id] = a.steps[s.id]!.signature ?? null;
        return seed;
    });

    if (!applicant || !template) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
                <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <AlertCircle className="mx-auto mb-3 text-amber-500" size={36} />
                    <h1 className="text-lg font-bold text-slate-900">Application not found</h1>
                    <p className="mt-1 text-sm text-slate-500">This invite link is invalid or has expired. Please contact your recruiter.</p>
                </div>
            </div>
        );
    }

    const stepStatus = (id: string): AppStepStatus => app?.steps[id]?.status ?? 'not_started';
    const allSubmitted = steps.length > 0 && steps.every(s => { const st = stepStatus(s.id); return st === 'submitted' || st === 'approved'; });
    const activeStep = steps[activeIdx];

    const openStep = (idx: number) => {
        setActiveIdx(idx);
        const s = steps[idx];
        if (s) { markStepInProgress(applicantId, s.id); refresh(); }
    };

    const setValue = (stepId: string, fieldId: string, v: FieldValue) =>
        setValuesByStep(prev => ({ ...prev, [stepId]: { ...(prev[stepId] ?? {}), [fieldId]: v } }));

    const saveStep = (s: TemplateStep) => {
        submitStep(applicantId, s.id, {
            values: valuesByStep[s.id] as Record<string, unknown> | undefined,
            signature: sigByStep[s.id] ?? undefined,
        });
        refresh();
        // Advance to the next not-yet-submitted step, if any.
        const nextOpen = steps.findIndex((st, i) => i > activeIdx && stepStatusAfter(st.id) !== 'submitted' && stepStatusAfter(st.id) !== 'approved');
        if (nextOpen >= 0) openStep(nextOpen);
    };
    // After submitStep the persisted status updates; read fresh for navigation.
    const stepStatusAfter = (id: string): AppStepStatus => getApplication(applicantId)?.steps[id]?.status ?? 'not_started';

    const labelFor = (s: TemplateStep): string => {
        if (s.label) return s.label;
        if (s.kind === 'consent') return CONSENT_BY_ID[s.formId as ConsentCategory]?.title ?? 'Consent';
        const f = formById.get(s.formId);
        return f?.displayTitle || f?.name || 'Form';
    };

    const completedCount = steps.filter(s => { const st = stepStatus(s.id); return st === 'submitted' || st === 'approved'; }).length;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <header className="border-b border-slate-200 bg-white px-6 py-4">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm"><ShieldCheck size={20} /></div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900">{template.name}</h1>
                            <p className="text-[12px] text-slate-500">Hi {applicant.firstName} — complete each step below to finish your application.</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Progress</div>
                        <div className="text-sm font-bold text-slate-900 tabular-nums">{completedCount}/{steps.length} steps</div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-5xl px-6 py-6">
                {allSubmitted ? (
                    <div className="rounded-xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
                        <PartyPopper className="mx-auto mb-3 text-emerald-500" size={40} />
                        <h2 className="text-xl font-bold text-slate-900">Application submitted 🎉</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                            Thanks, {applicant.firstName}. All steps are complete and submitted to the hiring team. We'll reach out if anything else is needed.
                        </p>
                        <button type="button" onClick={() => setActiveIdx(0)} className="mt-5 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                            Review my answers
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
                        {/* Step nav */}
                        <nav className="space-y-1.5">
                            {steps.map((s, i) => {
                                const st = stepStatus(s.id);
                                const active = i === activeIdx;
                                const done = st === 'submitted' || st === 'approved';
                                const returned = st === 'returned';
                                return (
                                    <button key={s.id} type="button" onClick={() => openStep(i)}
                                        className={cn('flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                                            active ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300')}>
                                        <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                            done ? 'bg-emerald-500 text-white' : returned ? 'bg-rose-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}>
                                            {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[13px] font-semibold text-slate-800">{labelFor(s)}</span>
                                            <span className={cn('text-[10px] font-bold uppercase tracking-wide',
                                                done ? 'text-emerald-600' : returned ? 'text-rose-600' : 'text-slate-400')}>
                                                {returned ? 'Returned — redo' : done ? 'Submitted' : s.kind === 'consent' ? 'Consent' : 'Form'}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>

                        {/* Step body */}
                        <div>
                            {activeStep && <StepCard
                                key={activeStep.id}
                                step={activeStep}
                                title={labelFor(activeStep)}
                                returnNote={app?.steps[activeStep.id]?.returnNote}
                                appForm={activeStep.kind === 'consent' ? undefined : formById.get(activeStep.formId)}
                                consent={activeStep.kind === 'consent' ? CONSENT_BY_ID[activeStep.formId as ConsentCategory] : undefined}
                                values={valuesByStep[activeStep.id] ?? {}}
                                setValue={(fid, v) => setValue(activeStep.id, fid, v)}
                                signature={sigByStep[activeStep.id] ?? null}
                                setSignature={(v) => setSigByStep(prev => ({ ...prev, [activeStep.id]: v }))}
                                onSave={() => saveStep(activeStep)}
                            />}
                        </div>
                    </div>
                )}

                {onNavigate && (
                    <div className="mt-6 text-center">
                        <button type="button" onClick={() => onNavigate(`/ats/application/${applicantId}`)} className="text-[11px] font-semibold text-slate-400 hover:text-slate-600">
                            (Recruiter view — open application)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function StepCard({ step, title, returnNote, appForm, consent, values, setValue, signature, setSignature, onSave }: {
    step: TemplateStep;
    title: string;
    returnNote?: string;
    appForm?: ApplicationFormDef;
    consent?: { title: string; subtitle: string; body: string[] };
    values: Record<string, FieldValue>;
    setValue: (fieldId: string, v: FieldValue) => void;
    signature: string | null;
    setSignature: (v: string | null) => void;
    onSave: () => void;
}) {
    const isConsent = step.kind === 'consent';
    const [agreed, setAgreed] = useState(false);
    const canSave = isConsent ? (agreed && !!signature) : true;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                    {isConsent ? <ShieldCheck size={16} /> : <FileText size={16} />}
                </div>
                <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    {(consent?.subtitle || appForm?.description || step.helperText) && (
                        <p className="mt-0.5 text-xs text-slate-500">{consent?.subtitle || step.helperText || appForm?.description}</p>
                    )}
                </div>
            </div>

            {returnNote && (
                <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-500" />
                    <div className="text-[12px] text-rose-700"><span className="font-bold">Returned for changes:</span> {returnNote}</div>
                </div>
            )}

            <div className="p-6">
                {isConsent && consent ? (
                    <div className="space-y-4">
                        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-[13px] leading-relaxed text-slate-700">
                            {consent.body.map((p, i) => <p key={i}>{p}</p>)}
                        </div>
                        <label className="flex cursor-pointer items-start gap-2.5">
                            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                            <span className="text-[13px] text-slate-700">I have read and agree to the terms above, and my signature below is legally binding.</span>
                        </label>
                        <SignaturePad value={signature} onChange={setSignature} label="Sign here" />
                    </div>
                ) : appForm ? (
                    <FormBody fields={appForm.fields} values={values} setValue={setValue} />
                ) : (
                    <p className="py-8 text-center text-sm text-slate-400">This step's form is unavailable.</p>
                )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
                <p className="text-[11px] text-slate-400">{isConsent ? 'Agree and sign to submit this step.' : 'Your answers are saved when you submit.'}</p>
                <button type="button" disabled={!canSave} onClick={onSave}
                    className={cn('inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-sm',
                        canSave ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300')}>
                    <Save size={15} /> Submit step <ChevronRight size={15} />
                </button>
            </div>
        </div>
    );
}
