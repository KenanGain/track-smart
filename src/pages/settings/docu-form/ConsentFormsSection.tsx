import { useState } from 'react';
import {
    Plus, Download, Trash2, Lock, ShieldCheck, Eye,
    ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { CONSENT_FORMS, type ConsentForm } from '@/pages/ats/consent-forms.data';
import { useCompanyBranding, type CompanyBranding } from '@/pages/ats/company-branding.data';
import { downloadConsentPdf } from '@/pages/ats/generateConsentPdf';
import { PageHeader } from './PageHeader';
import { StatStrip } from './StatStrip';
import { EmptyState } from './EmptyState';

/**
 * Consent Forms section of the Docu/Form Generator.
 *
 * Seeded with every built-in consent form (`CONSENT_FORMS`) — those are
 * marked as defaults and cannot be deleted. The admin can add more custom
 * consent forms, which are editable and deletable. Every form can be
 * generated as a branded blank PDF.
 */

interface ManagedConsent {
    id: string;
    title: string;
    subtitle: string;
    citation: string;
    body: string[];
    requiresSignature: boolean;
    /** Built-in forms — locked against deletion. */
    isDefault: boolean;
}

const DEFAULT_CONSENTS: ManagedConsent[] = CONSENT_FORMS.map(c => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    citation: c.citation,
    body: c.body,
    requiresSignature: c.requiresSignature,
    isDefault: true,
}));

const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'consent';

const initials = (name: string): string =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'Co';

/** Branded, page-style preview of a consent form. */
function ConsentPreviewModal({ consent, branding, onClose }: {
    consent: ManagedConsent;
    branding: CompanyBranding;
    onClose: () => void;
}) {
    const contact = [branding.address, branding.phone, branding.email].filter(Boolean).join('   ·   ');
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Consent Form Preview</DialogTitle>
                </DialogHeader>

                <div className="max-h-[72vh] overflow-y-auto">
                    <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                        {/* Branded header */}
                        <div className="flex items-center gap-3 px-5 py-3" style={{ backgroundColor: branding.accentColor }}>
                            <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-white/95">
                                {branding.logoDataUrl
                                    ? <img src={branding.logoDataUrl} alt="" className="max-h-full max-w-full object-contain" />
                                    : <span className="text-sm font-black text-slate-400">{initials(branding.name)}</span>}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-[15px] font-bold leading-tight text-white">
                                    {branding.name}
                                </div>
                                {branding.tagline && (
                                    <div className="truncate text-[11px] text-white/85">{branding.tagline}</div>
                                )}
                            </div>
                        </div>
                        {contact && (
                            <div className="border-b border-slate-100 bg-slate-50 px-5 py-1.5 text-[10px] text-slate-500">
                                {contact}
                            </div>
                        )}

                        {/* Consent body */}
                        <div className="bg-white px-6 py-6">
                            <h2 className="text-lg font-bold text-slate-900">{consent.title}</h2>
                            {consent.subtitle && (
                                <p className="mt-0.5 text-sm text-slate-500">{consent.subtitle}</p>
                            )}
                            {consent.citation && (
                                <p className="mt-0.5 font-mono text-[11px] text-slate-400">{consent.citation}</p>
                            )}
                            <div className="mt-2 h-[3px] w-24 rounded" style={{ backgroundColor: branding.accentColor }} />

                            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
                                {consent.body.map((p, i) => <p key={i}>{p}</p>)}
                            </div>

                            {consent.requiresSignature && (
                                <div className="mt-9 grid grid-cols-2 gap-x-8 gap-y-7">
                                    {['Applicant Signature', 'Date', 'Print Name'].map(label => (
                                        <div key={label}>
                                            <div className="h-7 border-b border-slate-400" />
                                            <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                                {label}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function ConsentFormsSection() {
    const [branding] = useCompanyBranding();
    const [forms, setForms] = useState<ManagedConsent[]>(DEFAULT_CONSENTS);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [previewing, setPreviewing] = useState<ManagedConsent | null>(null);

    const updateForm = (id: string, patch: Partial<ManagedConsent>) =>
        setForms(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));

    const addForm = () => {
        const existing = new Set(forms.map(f => f.id));
        let id = `custom-${slugify('new consent')}`;
        while (existing.has(id)) id = `${id}-${Math.random().toString(36).slice(2, 5)}`;
        const created: ManagedConsent = {
            id,
            title: 'New Consent Form',
            subtitle: '',
            citation: '',
            body: [''],
            requiresSignature: true,
            isDefault: false,
        };
        // Prepend so the new consent shows at the top, expanded for immediate editing.
        setForms(prev => [created, ...prev]);
        setExpandedId(id);
    };

    const remove = (e: React.MouseEvent, c: ManagedConsent) => {
        e.stopPropagation();
        if (c.isDefault) return;
        setForms(prev => prev.filter(f => f.id !== c.id));
        if (expandedId === c.id) setExpandedId(null);
    };

    const generate = (e: React.MouseEvent, c: ManagedConsent) => {
        e.stopPropagation();
        const consent: ConsentForm = {
            id: c.id as ConsentForm['id'],
            title: c.title,
            subtitle: c.subtitle,
            citation: c.citation,
            body: c.body,
            requiresSignature: c.requiresSignature,
            defaultStep: 'application_review',
        };
        downloadConsentPdf({ consent, branding, mode: 'blank' });
    };

    const preview = (e: React.MouseEvent, c: ManagedConsent) => {
        e.stopPropagation();
        setPreviewing(c);
    };

    const defaultCount = forms.filter(f => f.isDefault).length;
    const customCount = forms.length - defaultCount;

    return (
        <div>
            <PageHeader
                icon={ShieldCheck}
                title="Consent Forms"
                description="The consent-form library applicants sign during hiring. Built-in forms can be generated and edited but not deleted."
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
                        <Plus className="h-4 w-4" /> Add Consent Form
                    </Button>
                )}
            />

            {forms.length === 0 && (
                <EmptyState
                    icon={ShieldCheck}
                    title="No consent forms yet"
                    description="Consent forms collect applicant acknowledgements before driving — drug-testing policies, background checks, FCRA disclosures, and more."
                    action={(
                        <Button
                            size="sm"
                            onClick={addForm}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" /> Add Consent Form
                        </Button>
                    )}
                />
            )}

            <ul className="space-y-2">
                {forms.map(c => {
                    const expanded = expandedId === c.id;
                    return (
                        <li
                            key={c.id}
                            className={cn(
                                'overflow-hidden rounded-lg border bg-white',
                                expanded ? 'border-blue-300 shadow-sm' : 'border-slate-200',
                            )}
                        >
                            {/* Row header — click to expand */}
                            <div
                                onClick={() => setExpandedId(expanded ? null : c.id)}
                                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                            >
                                {expanded
                                    ? <ChevronDown size={16} className="shrink-0 text-slate-400" />
                                    : <ChevronRight size={16} className="shrink-0 text-slate-400" />}
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-sm font-medium text-slate-900">
                                            {c.title}
                                        </p>
                                        {c.isDefault ? (
                                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                                Default
                                            </span>
                                        ) : (
                                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600">
                                                Custom
                                            </span>
                                        )}
                                        {c.requiresSignature && (
                                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600">
                                                Signature
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-xs text-slate-400">
                                        {c.subtitle || c.citation || 'No description'}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={(e) => preview(e, c)} className="text-slate-500" title="Preview">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={(e) => generate(e, c)} className="text-slate-500" title="Generate PDF">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    {c.isDefault ? (
                                        <span className="flex h-9 w-9 items-center justify-center text-slate-300" title="Default form — cannot be deleted">
                                            <Lock className="h-4 w-4" />
                                        </span>
                                    ) : (
                                        <Button variant="ghost" size="sm" onClick={(e) => remove(e, c)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="Delete">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Inline editor */}
                            {expanded && (
                                <div className="space-y-4 border-t border-slate-100 bg-slate-50/40 p-5">
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Title <span className="text-rose-500">*</span>
                                        </label>
                                        <Input
                                            value={c.title}
                                            onChange={e => updateForm(c.id, { title: e.target.value })}
                                            placeholder="e.g. Drug & Alcohol Policy Acknowledgement"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Subtitle
                                        </label>
                                        <Input
                                            value={c.subtitle}
                                            onChange={e => updateForm(c.id, { subtitle: e.target.value })}
                                            placeholder="Short one-line description"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Citation
                                        </label>
                                        <Input
                                            value={c.citation}
                                            onChange={e => updateForm(c.id, { citation: e.target.value })}
                                            placeholder="e.g. 49 CFR Part 382"
                                            className="font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                                            Body <span className="text-rose-500">*</span>
                                        </label>
                                        <Textarea
                                            value={c.body.join('\n\n')}
                                            onChange={e => updateForm(c.id, {
                                                body: e.target.value.split(/\n\n+/).map(p => p.trim()).filter(Boolean),
                                            })}
                                            placeholder="Paragraphs of the consent text. Separate paragraphs with a blank line."
                                            className="min-h-[160px]"
                                        />
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            Separate paragraphs with a blank line.
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Requires signature</p>
                                            <p className="text-[11px] text-slate-400">
                                                Applicant signs at the bottom of the form.
                                            </p>
                                        </div>
                                        <Toggle
                                            checked={c.requiresSignature}
                                            onCheckedChange={v => updateForm(c.id, { requiresSignature: v })}
                                        />
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            {previewing && (
                <ConsentPreviewModal
                    consent={previewing}
                    branding={branding}
                    onClose={() => setPreviewing(null)}
                />
            )}
        </div>
    );
}
