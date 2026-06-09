import { useMemo, useState } from 'react';
import { Plus, Download, Trash2, Lock, FileText, ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCompanyBranding } from '@/pages/ats/company-branding.data';
import { generateApplicationFormPdf } from '@/pages/ats/generateApplicationFormPdf';
import { newApplicationForm, type ApplicationFormDef } from '@/pages/ats/application-forms.data';
import { CustomFormWizard } from '@/pages/ats/CustomFormWizard';
import { PDF_TEMPLATES, type PdfVariant } from '@/pages/ats/ApplicationFormPrint';
import { ApplicationFormBuilder } from './ApplicationFormEditor';
import { PageHeader } from './PageHeader';
import { StatStrip } from './StatStrip';
import { EmptyState } from './EmptyState';

/**
 * Application Forms tab of the Docu/Form Generator.
 *
 * The form library — each form is an expand/collapse accordion: click a row
 * to open the full builder inline (details + steps/fields + documents).
 */

export function ApplicationFormsSection({ forms, onCommit, mode = 'main', formType = 'hiring-driver' }: {
    forms: ApplicationFormDef[];
    onCommit: (forms: ApplicationFormDef[]) => void;
    /** Whether to show only main forms or only subforms — driven by the top-level tab. */
    mode?: 'main' | 'subform';
    /** Line of work selected in the "Form type" dropdown — scopes the form list. */
    formType?: string;
}) {
    const [branding] = useCompanyBranding();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    // Front-end preview — renders the form the way an applicant sees it.
    const [previewForm, setPreviewForm] = useState<ApplicationFormDef | null>(null);

    const preview = (e: React.MouseEvent, f: ApplicationFormDef) => {
        e.stopPropagation();
        setPreviewForm(f);
    };

    const updateForm = (next: ApplicationFormDef) =>
        onCommit(forms.map(f => f.id === next.id ? next : f));

    const addForm = () => {
        // Tag the new form with the active line of work so it stays in this form type.
        const f = { ...newApplicationForm(), isSubform: mode === 'subform', formType };
        // Prepend so the new form shows at the top of the list, expanded for immediate editing.
        onCommit([f, ...forms]);
        setExpandedId(f.id);
    };

    const remove = (e: React.MouseEvent, f: ApplicationFormDef) => {
        e.stopPropagation();
        if (f.isDefault) return;
        onCommit(forms.filter(x => x.id !== f.id));
        if (expandedId === f.id) setExpandedId(null);
    };

    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [pdfMenuId, setPdfMenuId] = useState<string | null>(null);
    const generate = async (e: React.MouseEvent, f: ApplicationFormDef, variant: PdfVariant) => {
        e.stopPropagation();
        setPdfMenuId(null);
        if (generatingId) return; // in-flight guard against double-click
        setGeneratingId(f.id);
        try {
            await generateApplicationFormPdf({ form: f, branding, variant });
        } finally {
            setGeneratingId(null);
        }
    };

    const visibleForms = useMemo(
        () => forms.filter(f =>
            (mode === 'subform' ? f.isSubform : !f.isSubform) &&
            (f.formType ?? 'hiring-driver') === formType,
        ),
        [forms, mode, formType],
    );

    const defaultCount = visibleForms.filter(f => f.isDefault).length;
    const customCount = visibleForms.length - defaultCount;

    return (
        <div>
            <PageHeader
                icon={FileText}
                title={mode === 'subform' ? 'Subforms' : 'Application Forms'}
                description={mode === 'subform'
                    ? "Subforms are application forms embedded inside another form's popup (e.g. Employer Details inside Employment Details). They behave like any other form — fields, documents, all editable."
                    : 'The form library — each form is edited in a full builder (details, steps & fields, documents). Click a form to open its builder.'}
                stats={(
                    <StatStrip stats={[
                        { label: 'total', value: visibleForms.length, tone: 'default' },
                        { label: 'built-in', value: defaultCount, tone: 'muted' },
                        { label: 'custom', value: customCount, tone: 'accent' },
                    ]} />
                )}
                actions={(
                    <Button
                        size="sm"
                        onClick={addForm}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4" />
                        {mode === 'subform' ? 'Add Subform' : 'Add Application Form'}
                    </Button>
                )}
            />

            {visibleForms.length === 0 && (
                <EmptyState
                    icon={FileText}
                    title={mode === 'subform' ? 'No subforms yet' : 'No application forms yet'}
                    description={mode === 'subform'
                        ? "Subforms are application forms embedded inside another form's popup picker (e.g. Employer Details inside Employment Details). They behave like any other form — fields, documents, all editable."
                        : 'Application forms collect what you need from each applicant — identity, license, work history, accidents, violations, and more.'}
                    action={(
                        <Button
                            size="sm"
                            onClick={addForm}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" />
                            {mode === 'subform' ? 'Add Subform' : 'Add Application Form'}
                        </Button>
                    )}
                />
            )}

            <ul className="space-y-2">
                {visibleForms.map(f => {
                    const expanded = expandedId === f.id;
                    return (
                        <li key={f.id} className={cn(
                            'overflow-hidden rounded-lg border bg-white',
                            expanded ? 'border-blue-300 shadow-sm' : 'border-slate-200',
                        )}>
                            {/* Row header — click to expand */}
                            <div
                                onClick={() => setExpandedId(expanded ? null : f.id)}
                                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                            >
                                {expanded
                                    ? <ChevronDown size={16} className="shrink-0 text-slate-400" />
                                    : <ChevronRight size={16} className="shrink-0 text-slate-400" />}
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-sm font-medium text-slate-900">{f.name}</p>
                                        {f.isDefault ? (
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                                Default
                                            </span>
                                        ) : (
                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600">
                                                Custom
                                            </span>
                                        )}
                                        {f.isSubform && (
                                            <>
                                                <span className="inline-flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-700">
                                                    Subform
                                                </span>
                                                {f.buttonName && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                                        Button: "{f.buttonName}"
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <p className="truncate text-xs text-slate-400">
                                        {f.description || (f.kind === 'standard' ? 'Standard 13-step form' : 'Custom form')}
                                        {' · '}
                                        {f.kind === 'standard'
                                            ? '13 fixed steps'
                                            : `${f.fields.length} field${f.fields.length === 1 ? '' : 's'}`}
                                        {' · '}
                                        {f.documents.length} document{f.documents.length === 1 ? '' : 's'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={(e) => preview(e, f)} className="text-slate-500 hover:text-blue-700" title="View — how this looks to the applicant">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <div className="relative">
                                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setPdfMenuId(pdfMenuId === f.id ? null : f.id); }} className="text-slate-500" title="Download PDF — pick a template" disabled={generatingId === f.id}>
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        {pdfMenuId === f.id && (
                                            <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">PDF template</p>
                                                {PDF_TEMPLATES.map(t => (
                                                    <button key={t.id} type="button" onClick={(e) => generate(e, f, t.id)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">
                                                        <span className="block text-[13px] font-semibold text-slate-800">{t.label}</span>
                                                        <span className="block text-[11px] text-slate-500">{t.description}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {f.isDefault ? (
                                        <span className="flex h-9 w-9 items-center justify-center text-slate-300" title="Default form — cannot be deleted">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                    ) : (
                                        <Button variant="ghost" size="sm" onClick={(e) => remove(e, f)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Expanded builder */}
                            {expanded && (
                                <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                                    <ApplicationFormBuilder form={f} onChange={updateForm} />
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {/* Front-end preview — exactly how the applicant sees this form. */}
            {previewForm && (
                <CustomFormWizard appForm={previewForm} onClose={() => setPreviewForm(null)} />
            )}
        </div>
    );
}
