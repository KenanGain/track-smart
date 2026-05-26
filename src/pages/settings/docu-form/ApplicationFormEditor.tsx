import { useState } from 'react';
import { Lock, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ApplicationFormDef } from '@/pages/ats/application-forms.data';
import { DriverApplicationWizard } from '@/pages/ats/DriverApplicationWizard';
import { CustomFormWizard } from '@/pages/ats/CustomFormWizard';
import { FormFieldsEditor } from './FormFieldsEditor';
import { FormDocumentsEditor } from './FormDocumentsEditor';
import { StandardStepsView } from './StandardStepsView';
import { FormPrintView } from './FormPrintView';

/**
 * Inline Application Form builder — rendered inside an expanded accordion row
 * in the Application Forms list. Edits the form live via `onChange`; details,
 * steps & fields, and documents in one view, with Preview and Print.
 */

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <div className="border-t border-slate-100 pt-4">
            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
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
                {/* Action bar — Preview has two options */}
                <div className="flex items-center justify-end gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Preview
                    </span>
                    <Button variant="outline" size="sm" onClick={() => setPreviewing(true)} className="gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Web Form
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPrinting(true)} className="gap-1.5">
                        <FileText className="h-3.5 w-3.5" /> PDF
                    </Button>
                </div>

                {/* Details */}
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Form name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                        value={form.name}
                        onChange={e => up({ name: e.target.value })}
                        placeholder="e.g. Owner-Operator Application"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Display title <span className="text-rose-500">*</span>
                    </label>
                    <Input
                        value={form.displayTitle}
                        onChange={e => up({ displayTitle: e.target.value })}
                        placeholder="e.g. Driver Application"
                    />
                    <p className="mt-1 text-xs text-slate-400">
                        The heading the applicant sees at the top of the form.
                    </p>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                    <Textarea
                        value={form.description}
                        onChange={e => up({ description: e.target.value })}
                        placeholder="Short internal description of when to use this form."
                        className="min-h-[56px]"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Intro / instructions for applicants
                    </label>
                    <Textarea
                        value={form.introText}
                        onChange={e => up({ introText: e.target.value })}
                        placeholder="Instructions shown to the applicant before they start step 1."
                        className="min-h-[64px]"
                    />
                </div>

                {/* Steps & fields */}
                <SectionTitle title="Fields" subtitle="The fields the applicant fills in." />
                {form.kind === 'standard' ? (
                    <div>
                        <div className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
                            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                Standard Driver Application — its 13 steps are fixed. Expand a
                                step to view its fields, or create a custom form to build your own.
                            </span>
                        </div>
                        <StandardStepsView />
                    </div>
                ) : (
                    <FormFieldsEditor fields={form.fields} onChange={(fields) => up({ fields })} />
                )}

                {/* Documents */}
                <SectionTitle title="Required documents" subtitle="Uploads the applicant must provide for this form. Pick from your Document Types library." />
                <FormDocumentsEditor
                    documents={form.documents}
                    fields={form.fields}
                    onChange={(documents) => up({ documents })}
                />
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
