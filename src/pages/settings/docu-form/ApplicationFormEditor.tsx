import { useState } from 'react';
import { Lock, Eye, FileText, FileEdit, ListChecks, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ApplicationFormDef } from '@/pages/ats/application-forms.data';
import { DriverApplicationWizard } from '@/pages/ats/DriverApplicationWizard';
import { CustomFormWizard } from '@/pages/ats/CustomFormWizard';
import { FormFieldsEditor } from './FormFieldsEditor';
import { StandardStepsView } from './StandardStepsView';
import { FormPrintView } from './FormPrintView';

/**
 * Inline Application Form builder — rendered inside an expanded accordion row
 * in the Application Forms list. Edits the form live via `onChange`; details,
 * steps & fields, and documents in one view, with Preview and Print.
 */

/** Bordered section card used to group form-builder inputs. */
function SectionCard({ icon: Icon, title, subtitle, action, children }: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                    <Icon size={14} className="text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                    {subtitle && <p className="mt-0.5 text-[12px] leading-snug text-slate-500">{subtitle}</p>}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export function ApplicationFormBuilder({ form, onChange }: {
    form: ApplicationFormDef;
    onChange: (form: ApplicationFormDef) => void;
}) {
    const [previewing, setPreviewing] = useState(false);
    const [printing, setPrinting] = useState(false);

    const up = (patch: Partial<ApplicationFormDef>) =>
        onChange({ ...form, ...patch, updatedAt: new Date().toISOString().slice(0, 10) });

    return (
        <>
            <div className="space-y-5">
                {/* Details */}
                <SectionCard
                    icon={FileEdit}
                    title="Form details"
                    subtitle="Internal name, applicant-facing title, and description."
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Form name <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    value={form.name}
                                    onChange={e => up({ name: e.target.value })}
                                    placeholder="e.g. Owner-Operator Application"
                                    className="h-10"
                                />
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Internal label shown in the form list.
                                </p>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                    Display title <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    value={form.displayTitle}
                                    onChange={e => up({ displayTitle: e.target.value })}
                                    placeholder="e.g. Driver Application"
                                    className="h-10"
                                />
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Heading the applicant sees at the top of the form.
                                </p>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                            <Textarea
                                value={form.description}
                                onChange={e => up({ description: e.target.value })}
                                placeholder="Short internal description of when to use this form."
                                className="min-h-[64px]"
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Applicant intro */}
                <SectionCard
                    icon={Sparkles}
                    title="Applicant intro"
                    subtitle="Instructions shown to the applicant before they start step 1."
                >
                    <Textarea
                        value={form.introText}
                        onChange={e => up({ introText: e.target.value })}
                        placeholder="e.g. Please complete every section. Have your CDL, recent employer details, and medical card ready."
                        className="min-h-[88px]"
                    />
                </SectionCard>

                {/* Subform-only: button label */}
                {form.isSubform && (
                    <div className="rounded-xl border border-violet-200 bg-violet-50/30 shadow-sm">
                        <div className="flex items-start gap-3 border-b border-violet-100 px-5 py-3.5">
                            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                                <FileText size={14} className="text-violet-700" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-bold text-slate-900">Subform configuration</h4>
                                <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                                    Label shown on the button that opens this subform from any parent Application Form.
                                </p>
                            </div>
                        </div>
                        <div className="p-5">
                            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                Button name
                            </label>
                            <Input
                                value={form.buttonName ?? ''}
                                onChange={e => up({ buttonName: e.target.value })}
                                placeholder={`e.g. Add ${form.name}`}
                                className="h-10"
                            />
                            <p className="mt-2 text-[11px] text-slate-500">
                                For example, "Add Employer" or "Add Address". Leave blank to fall back to the form's name.
                            </p>
                        </div>
                    </div>
                )}

                {/* Fields */}
                <SectionCard
                    icon={ListChecks}
                    title="Fields"
                    subtitle="The fields the applicant fills in. Click any field to edit it; toggles support follow-up rules."
                    action={(
                        <div className="flex items-center gap-2">
                            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:inline">
                                Preview
                            </span>
                            <Button variant="outline" size="sm" onClick={() => setPreviewing(true)} className="gap-1.5">
                                <Eye className="h-3.5 w-3.5" /> Web Form
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setPrinting(true)} className="gap-1.5">
                                <FileText className="h-3.5 w-3.5" /> PDF
                            </Button>
                        </div>
                    )}
                >
                    {form.kind === 'standard' ? (
                        <div>
                            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900">
                                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                <span>
                                    <strong>Standard Driver Application</strong> — its 13 steps are fixed. Expand a
                                    step below to view its fields, or create a custom form to build your own from scratch.
                                </span>
                            </div>
                            <StandardStepsView />
                        </div>
                    ) : (
                        <FormFieldsEditor fields={form.fields} onChange={(fields) => up({ fields })} />
                    )}
                </SectionCard>
            </div>

            {previewing && (
                form.kind === 'standard'
                    ? <DriverApplicationWizard appForm={form} onClose={() => setPreviewing(false)} />
                    : <CustomFormWizard appForm={form} onClose={() => setPreviewing(false)} />
            )}
            {printing && (
                <FormPrintView form={form} onClose={() => setPrinting(false)} />
            )}
        </>
    );
}
