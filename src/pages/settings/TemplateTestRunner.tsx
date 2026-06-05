import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X, Eye, Info, FileText, ShieldCheck, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/pages/ats/SignaturePad";
import { useCompanyBranding } from "@/pages/ats/company-branding.data";
import {
    loadApplicationForms, type ApplicationFormDef,
} from "@/pages/ats/application-forms.data";
import { CONSENT_FORMS, type ConsentForm } from "@/pages/ats/consent-forms.data";
import { FormBody } from "@/pages/ats/CustomFormWizard";
import { prefillByDataKey, type CanonicalPart } from "@/pages/ats/form-data-keys";
import type { DriverHiringTemplate, StepKind } from "./driver-hiring-templates.data";

/**
 * Full-screen overlay that previews a hiring template end-to-end.
 *
 * Layout — sidebar + content (utilises the full viewport width):
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ Header: brand icon · template name · Close                    │
 *   ├──────────────────┬───────────────────────────────────────────┤
 *   │ Sidebar:         │  Content (wide):                          │
 *   │ vertical step    │   • Form title                            │
 *   │ list — every     │   • Optional helper text                  │
 *   │ step visible at  │   • Form fields rendered via FormBody     │
 *   │ once, clickable. │                                            │
 *   ├──────────────────┴───────────────────────────────────────────┤
 *   │ Footer: step indicator · Back · Next / Finish                 │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * The body renders the current step's form fields inline using the exported
 * FormBody helper. Values are kept per-step in local state — this is a
 * preview, not a real flow.
 */
export function TemplateTestRunner({ template, onClose }: {
    template: DriverHiringTemplate;
    onClose: () => void;
}) {
    const [branding] = useCompanyBranding();
    const accent = branding.accentColor;

    const forms = useMemo(() => loadApplicationForms(), []);
    const formById = useMemo(() => new Map(forms.map(f => [f.id, f])), [forms]);
    const consentById = useMemo(() => new Map(CONSENT_FORMS.map(c => [c.id as string, c])), []);

    type LinkedStep = {
        step: typeof template.steps[number];
        kind: StepKind;
        form?: ApplicationFormDef;
        consent?: ConsentForm;
    };

    const linkedSteps: LinkedStep[] = useMemo(
        () => (template.steps
            .map(s => {
                const kind: StepKind = s.kind ?? 'form';
                if (kind === 'consent') {
                    const consent = consentById.get(s.formId);
                    return consent ? ({ step: s, kind, consent } as LinkedStep) : null;
                }
                const form = formById.get(s.formId);
                return form ? ({ step: s, kind, form } as LinkedStep) : null;
            })
            .filter(Boolean) as LinkedStep[]),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [template.steps, formById, consentById],
    );

    // Per-step field-value state (object keyed by formId → { fieldId → value }).
    const [valuesByForm, setValuesByForm] = useState<Record<string, Record<string, unknown>>>({});
    const setValueForCurrent = (formId: string) => (fieldId: string, v: unknown) =>
        setValuesByForm(s => ({ ...s, [formId]: { ...(s[formId] ?? {}), [fieldId]: v } }));

    // Per-consent signed state — keyed by consent id.
    const [consentSignatures, setConsentSignatures] = useState<Record<string, { signed: boolean; dataUrl: string | null }>>({});

    const [stepIdx, setStepIdx] = useState(0);
    const total = linkedSteps.length;

    if (total === 0) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xl">
                    <Info className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">
                        This template has no steps to preview yet.
                    </p>
                    <Button variant="outline" onClick={onClose} className="mt-4">Close</Button>
                </div>
            </div>
        );
    }

    const current = linkedSteps[stepIdx];
    const stepLabel = (s: LinkedStep) =>
        s.step.label?.trim() || s.consent?.title || s.form?.name || 'Step';
    // Canonical "capture once": auto-fill shared facts (license number, DOB…) that
    // were entered on an earlier form in this template into the current one.
    const formParts: CanonicalPart[] = linkedSteps
        .filter(ls => ls.form)
        .map(ls => ({ id: ls.form!.id, fields: ls.form!.fields, values: valuesByForm[ls.form!.id] ?? {} }));
    const prefilledByForm = prefillByDataKey(formParts, valuesByForm);
    const currentValues = current.form ? (prefilledByForm[current.form.id] ?? {}) : {};
    const headerTitle = stepLabel(current);
    const currentConsentSig = current.consent ? consentSignatures[current.consent.id] : undefined;

    const completedCount = stepIdx;
    const progressPct = Math.round(((stepIdx + 1) / total) * 100);

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 print:static print:bg-white">
            {/* ── Header band ───────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white px-6 py-3 print:hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white shadow-sm"
                            style={{ backgroundColor: accent }}
                        >
                            <Eye size={16} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                Preview · Test run
                            </div>
                            <h1 className="truncate text-base font-bold text-slate-900">{template.name}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="gap-1.5"
                            title="Print this step (browser print dialog)"
                        >
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={onClose} className="gap-1.5">
                            <X className="h-4 w-4" /> Close
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Main: sidebar + content ───────────────────────────── */}
            <div className="flex flex-1 overflow-hidden print:block print:overflow-visible">
                {/* Left sidebar — full step list */}
                <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white print:hidden">
                    <div className="border-b border-slate-100 px-5 py-3.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Steps
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-blue-500 transition-all"
                                    style={{ width: `${progressPct}%` }}
                                />
                            </div>
                            <span className="text-[11px] font-semibold text-slate-600">
                                {completedCount}/{total}
                            </span>
                        </div>
                    </div>
                    <ul className="flex-1 space-y-0.5 overflow-y-auto p-2">
                        {linkedSteps.map((s, i) => {
                            const done = i < stepIdx;
                            const active = i === stepIdx;
                            return (
                                <li key={s.step.id}>
                                    <button
                                        type="button"
                                        onClick={() => setStepIdx(i)}
                                        className={cn(
                                            "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                                            active
                                                ? "bg-blue-50 ring-1 ring-blue-300"
                                                : done
                                                    ? "hover:bg-slate-50"
                                                    : "hover:bg-slate-50",
                                        )}
                                    >
                                        <span className={cn(
                                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors",
                                            active
                                                ? "bg-blue-600 text-white ring-2 ring-blue-200"
                                                : done
                                                    ? "bg-blue-500 text-white"
                                                    : "bg-slate-100 text-slate-500",
                                        )}>
                                            {done ? <Check size={13} /> : i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5">
                                                {s.kind === 'consent'
                                                    ? <ShieldCheck size={11} className="shrink-0 text-amber-600" />
                                                    : <FileText size={11} className="shrink-0 text-blue-500" />}
                                                <p className={cn(
                                                    "truncate text-sm",
                                                    active ? "font-semibold text-slate-900"
                                                        : done ? "font-medium text-slate-700"
                                                        : "text-slate-600",
                                                )}>
                                                    {stepLabel(s)}
                                                </p>
                                            </div>
                                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                                {s.kind === 'consent'
                                                    ? `Consent${s.consent?.requiresSignature ? ' · signature' : ''}`
                                                    : `${s.form?.fields.length ?? 0} field${(s.form?.fields.length ?? 0) === 1 ? '' : 's'}`}
                                                {s.step.required && <span className="ml-1.5 text-rose-500">· required</span>}
                                            </p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </aside>

                {/* Right side — form / consent content. Uses the full remaining width. */}
                <main className="flex-1 overflow-y-auto print:overflow-visible">
                    <div className="w-full px-8 py-8 lg:px-12 print:px-0 print:py-0">
                        {/* Step title block */}
                        <div className="mb-6 print:mb-4">
                            <div className={cn(
                                "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider",
                                current.kind === 'consent' ? "text-amber-700" : "text-blue-600",
                            )}>
                                {current.kind === 'consent' ? <ShieldCheck size={12} /> : <FileText size={12} />}
                                Step {stepIdx + 1} of {total} · {current.kind === 'consent' ? 'Consent' : 'Form'}
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 print:text-xl">{headerTitle}</h2>
                            {current.kind === 'form' && current.form?.introText && (
                                <p className="mt-2 whitespace-pre-line text-sm text-slate-500">
                                    {current.form.introText}
                                </p>
                            )}
                            {current.kind === 'consent' && current.consent?.subtitle && (
                                <p className="mt-2 text-sm text-slate-500">
                                    {current.consent.subtitle}
                                </p>
                            )}
                            {current.kind === 'consent' && current.consent?.citation && (
                                <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                                    {current.consent.citation}
                                </p>
                            )}
                            {current.step.helperText && (
                                <div className="mt-3 flex items-start gap-2 rounded-md border-l-4 border-blue-400 bg-blue-50/60 px-3 py-2 text-sm text-blue-900 print:hidden">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>{current.step.helperText}</span>
                                </div>
                            )}
                        </div>

                        {/* Body — Form fields render as divided section cards; Consent as a single card */}
                        {current.kind === 'form' && current.form && (
                            current.form.fields.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
                                    This form has no fields yet.
                                </div>
                            ) : (
                                <FormBody
                                    sectioned
                                    fields={current.form.fields}
                                    values={currentValues as Parameters<typeof FormBody>[0]['values']}
                                    setValue={setValueForCurrent(current.form.id) as Parameters<typeof FormBody>[0]['setValue']}
                                />
                            )
                        )}

                        {current.kind === 'consent' && current.consent && (
                            <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none lg:p-10">
                                <div className="space-y-6">
                                    {/* Consent body */}
                                    <div className="space-y-3 text-sm leading-relaxed text-slate-700">
                                        {current.consent.body.map((p, i) => <p key={i}>{p}</p>)}
                                    </div>

                                    {/* Acknowledgement */}
                                    <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/40 p-5 print:border-slate-300 print:bg-white">
                                        <label className="flex cursor-pointer items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={!!currentConsentSig?.signed}
                                                onChange={(e) => current.consent && setConsentSignatures(s => ({
                                                    ...s,
                                                    [current.consent!.id]: { ...(s[current.consent!.id] ?? {}), signed: e.target.checked, dataUrl: s[current.consent!.id]?.dataUrl ?? null },
                                                }))}
                                                className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                                            />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">
                                                    I have read and agree to this consent
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-slate-500">
                                                    {current.consent.requiresSignature
                                                        ? 'Acknowledge then sign below.'
                                                        : 'Acknowledge to continue.'}
                                                </p>
                                            </div>
                                        </label>
                                        {current.consent.requiresSignature && (
                                            <SignaturePad
                                                value={currentConsentSig?.dataUrl ?? null}
                                                onChange={(v) => current.consent && setConsentSignatures(s => ({
                                                    ...s,
                                                    [current.consent!.id]: { signed: s[current.consent!.id]?.signed ?? false, dataUrl: v },
                                                }))}
                                                label="Applicant Signature"
                                                helper="Draw your signature above using your mouse or finger."
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* ── Footer nav ────────────────────────────────────────── */}
            <div className="border-t border-slate-200 bg-white px-6 py-3 print:hidden">
                <div className="flex items-center justify-between gap-4">
                    <div className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Step {stepIdx + 1}</span>
                        <span className="text-slate-400"> of {total}</span>
                        {current.step.required && (
                            <span className="ml-3 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                                Required
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            disabled={stepIdx === 0}
                            onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                            className="gap-1.5"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </Button>
                        {stepIdx < total - 1 ? (
                            <Button
                                onClick={() => setStepIdx(i => Math.min(total - 1, i + 1))}
                                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={onClose}
                                className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <Check className="h-4 w-4" /> Finish preview
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
