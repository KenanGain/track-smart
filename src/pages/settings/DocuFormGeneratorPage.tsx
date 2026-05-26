import { useState } from 'react';
import { FileSignature, FileText, ShieldCheck, Files } from 'lucide-react';
import { SubTabs, type SubTab } from '@/components/ui/SubTabs';
import {
    loadApplicationForms, saveApplicationForms,
    type ApplicationFormDef,
} from '@/pages/ats/application-forms.data';
import { ApplicationFormsSection } from './docu-form/ApplicationFormsSection';
import { ConsentFormsSection } from './docu-form/ConsentFormsSection';
import { BrandingTab } from './docu-form/BrandingTab';
import { DocumentsTab } from './docu-form/DocumentsTab';

/**
 * Docu/Form Generator (Settings).
 *
 * Form type ("Hiring Driver") with four tabs, each rendered as a dedicated
 * full-width page (no Panel card wrapper):
 *   • Company Branding  — logo + company details printed on every form
 *   • Consent Forms     — the consent-form library
 *   • Application Forms — the form library; each form is edited in a full
 *                         builder (details + steps/fields + documents).
 *   • Documents         — the Document Types library
 */

const FORM_TYPES = [
    { id: 'hiring-driver', label: 'Hiring Driver' },
];

type Tab = 'branding' | 'consents' | 'forms' | 'documents';

export const DocuFormGeneratorPage = () => {
    const [formType, setFormType] = useState('hiring-driver');
    const [forms, setForms] = useState<ApplicationFormDef[]>(loadApplicationForms);
    const [tab, setTab] = useState<Tab>('branding');

    const commit = (next: ApplicationFormDef[]) => {
        setForms(next);
        saveApplicationForms(next);
    };

    const tabs: SubTab<Tab>[] = [
        { id: 'branding',  label: 'Company Branding',  icon: ShieldCheck },
        { id: 'consents',  label: 'Consent Forms',     icon: FileSignature },
        { id: 'forms',     label: 'Application Forms', icon: FileText },
        { id: 'documents', label: 'Documents',         icon: Files },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-8 py-5">
                <nav className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                    <span>Settings</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900">Docu/Form Generator</span>
                </nav>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-sm">
                            <FileSignature size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold text-slate-900">Docu/Form Generator</h1>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Application &amp; consent forms for a line of work — branded with your company details.
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Form type
                        </label>
                        <select
                            value={formType}
                            onChange={e => setFormType(e.target.value)}
                            className="h-9 w-48 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {FORM_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white px-8">
                <SubTabs tabs={tabs} activeId={tab} onChange={setTab} />
            </div>

            {/* Content — every tab is its own dedicated full-width page. */}
            <div className="px-8 py-6">
                {tab === 'branding'  && <BrandingTab />}
                {tab === 'consents'  && <ConsentFormsSection />}
                {tab === 'forms'     && <ApplicationFormsSection forms={forms} onCommit={commit} />}
                {tab === 'documents' && <DocumentsTab />}
            </div>
        </div>
    );
};

export default DocuFormGeneratorPage;
