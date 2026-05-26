import { useState } from 'react';
import { Plus, Download, Trash2, Lock, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DEFAULT_TEMPLATE } from '@/pages/ats/hiring-templates.data';
import { useCompanyBranding } from '@/pages/ats/company-branding.data';
import { downloadApplicationPdf } from '@/pages/ats/generateApplicationPdf';
import { newApplicationForm, type ApplicationFormDef } from '@/pages/ats/application-forms.data';
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

export function ApplicationFormsSection({ forms, onCommit }: {
    forms: ApplicationFormDef[];
    onCommit: (forms: ApplicationFormDef[]) => void;
}) {
    const [branding] = useCompanyBranding();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const updateForm = (next: ApplicationFormDef) =>
        onCommit(forms.map(f => f.id === next.id ? next : f));

    const addForm = () => {
        const f = newApplicationForm();
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

    const generate = (e: React.MouseEvent, f: ApplicationFormDef) => {
        e.stopPropagation();
        downloadApplicationPdf({
            template: { ...DEFAULT_TEMPLATE, name: f.name },
            branding,
            mode: 'blank',
        });
    };

    const defaultCount = forms.filter(f => f.isDefault).length;
    const customCount = forms.length - defaultCount;

    return (
        <div>
            <PageHeader
                icon={FileText}
                title="Application Forms"
                description="The form library — each form is edited in a full builder (details, steps & fields, documents). Click a form to open its builder."
                stats={(
                    <StatStrip stats={[
                        { label: 'total', value: forms.length, tone: 'default' },
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
                        <Plus className="h-4 w-4" /> Add Application Form
                    </Button>
                )}
            />

            {forms.length === 0 && (
                <EmptyState
                    icon={FileText}
                    title="No application forms yet"
                    description="Application forms collect what you need from each applicant — identity, license, work history, accidents, violations, and more."
                    action={(
                        <Button
                            size="sm"
                            onClick={addForm}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" /> Add Application Form
                        </Button>
                    )}
                />
            )}

            <ul className="space-y-2">
                {forms.map(f => {
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
                                    <Button variant="ghost" size="sm" onClick={(e) => generate(e, f)} className="text-slate-500" title="Generate PDF">
                                        <Download className="h-4 w-4" />
                                    </Button>
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

        </div>
    );
}
