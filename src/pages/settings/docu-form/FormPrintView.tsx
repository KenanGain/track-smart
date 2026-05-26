import { Printer, X } from 'lucide-react';
import { useCompanyBranding } from '@/pages/ats/company-branding.data';
import { printableStepsFor, type ApplicationFormDef } from '@/pages/ats/application-forms.data';
import { FieldPreview } from './FormFieldPreview';

/**
 * Full-form printable document — renders the whole form (branded header +
 * every step + every field) as one page and opens the browser print dialog.
 */
export function FormPrintView({ form, onClose }: {
    form: ApplicationFormDef;
    onClose: () => void;
}) {
    const [branding] = useCompanyBranding();
    const steps = printableStepsFor(form);
    const contact = [branding.address, branding.phone, branding.email].filter(Boolean).join('   ·   ');

    return (
        <div className="fixed inset-0 z-[80] overflow-auto bg-slate-100 print:static print:overflow-visible print:bg-white">
            {/* Toolbar — not printed */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 print:hidden">
                <h2 className="text-sm font-bold text-slate-900">Print — {form.name}</h2>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        <Printer size={14} /> Print
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <X size={14} /> Close
                    </button>
                </div>
            </div>

            {/* Document */}
            <div className="mx-auto my-6 max-w-3xl bg-white p-8 shadow-sm print:my-0 print:max-w-none print:p-0 print:shadow-none">
                {/* Branded header */}
                <div className="flex items-center gap-3 border-b-[3px] pb-3" style={{ borderColor: branding.accentColor }}>
                    {branding.logoDataUrl && (
                        <img src={branding.logoDataUrl} alt="" className="h-12 max-w-[150px] object-contain" />
                    )}
                    <div className="min-w-0">
                        <div className="text-lg font-bold text-slate-900">{branding.name}</div>
                        {branding.tagline && (
                            <div className="text-xs text-slate-500">{branding.tagline}</div>
                        )}
                    </div>
                </div>
                {contact && <div className="mt-1 text-[10px] text-slate-500">{contact}</div>}

                <h1 className="mt-5 text-xl font-bold text-slate-900">{form.displayTitle}</h1>
                {form.introText && (
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{form.introText}</p>
                )}

                {/* Steps */}
                {steps.map((s) => (
                    <div key={s.id} className="mt-7 break-inside-avoid">
                        <h2
                            className="text-sm font-bold uppercase tracking-wide"
                            style={{ color: branding.accentColor }}
                        >
                            {s.id}. {s.title}
                        </h2>
                        <div className="mt-1 h-0.5" style={{ backgroundColor: branding.accentColor }} />
                        {s.fields.length > 0 && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                {s.fields.map((f, j) => <FieldPreview key={j} field={f} />)}
                            </div>
                        )}
                        {s.note && (
                            <p className="mt-2 text-[11px] italic text-slate-400">{s.note}</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
