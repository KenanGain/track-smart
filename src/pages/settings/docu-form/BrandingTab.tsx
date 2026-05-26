import { Upload, ImageOff, ShieldCheck, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCompanyBranding, type CompanyBranding } from '@/pages/ats/company-branding.data';
import { PageHeader } from './PageHeader';

/**
 * Company Branding tab — compact branding form on the left, a live preview of
 * the generated form's page header on the right so the admin sees exactly how
 * the logo + details will print.
 */

function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'Co';
}

function FormHeaderPreview({ branding }: { branding: CompanyBranding }) {
    const contact = [branding.address, branding.phone, branding.email].filter(Boolean).join('   ·   ');
    return (
        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
            {/* Accent header bar */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: branding.accentColor }}>
                <div className="flex h-11 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-white/95">
                    {branding.logoDataUrl
                        ? <img src={branding.logoDataUrl} alt="" className="max-h-full max-w-full object-contain" />
                        : <span className="text-sm font-black text-slate-400">{initials(branding.name)}</span>}
                </div>
                <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold leading-tight text-white">
                        {branding.name || 'Company name'}
                    </div>
                    {branding.tagline && (
                        <div className="truncate text-[11px] text-white/85">{branding.tagline}</div>
                    )}
                </div>
            </div>

            {/* Contact line */}
            {contact && (
                <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[10px] text-slate-500">
                    {contact}
                </div>
            )}

            {/* Sample form body */}
            <div className="bg-white px-4 py-5">
                <div className="text-base font-bold text-slate-900">Driver Application</div>
                <div className="mt-1 h-[3px] w-24 rounded" style={{ backgroundColor: branding.accentColor }} />
                <div className="mt-4 space-y-2.5">
                    {[68, 52, 60].map((w, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-2.5 w-20 rounded bg-slate-200" />
                            <div className="h-7 rounded border border-slate-200 bg-slate-50" style={{ width: `${w}%` }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function BrandingTab() {
    const [branding, update] = useCompanyBranding();

    const onLogoFile = (file: File | undefined) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => update({ logoDataUrl: String(reader.result) });
        reader.readAsDataURL(file);
    };

    return (
        <div>
            <PageHeader
                icon={ShieldCheck}
                title="Company Branding"
                description="Logo and company details printed on the header of every generated form. Changes auto-save and the preview on the right updates live."
                actions={(
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        <Check className="h-3 w-3" /> Auto-saved
                    </span>
                )}
            />
            <div className="grid gap-6 lg:grid-cols-2">
                {/* ── Branding form ─────────────────────────────────────── */}
                <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Identity
                    </p>
                    {/* Logo — compact */}
                    <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        Company logo
                    </label>
                    <div className="flex items-center gap-3">
                        <div className="flex h-16 w-28 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                            {branding.logoDataUrl
                                ? <img src={branding.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                                : <ImageOff className="h-5 w-5 text-slate-300" />}
                        </div>
                        <div className="space-y-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                <Upload className="h-3.5 w-3.5" />
                                {branding.logoDataUrl ? 'Replace logo' : 'Upload logo'}
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/svg+xml"
                                    className="hidden"
                                    onChange={e => onLogoFile(e.target.files?.[0])}
                                />
                            </label>
                            {branding.logoDataUrl && (
                                <button
                                    type="button"
                                    onClick={() => update({ logoDataUrl: undefined })}
                                    className="block text-xs font-medium text-rose-600 hover:text-rose-700"
                                >
                                    Remove logo
                                </button>
                            )}
                        </div>
                    </div>
                    <p className="mt-1.5 text-[11px] text-slate-400">PNG / JPG / SVG. Shows in the header of every generated form.</p>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Company name</label>
                    <Input value={branding.name} onChange={e => update({ name: e.target.value })} />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Tagline</label>
                    <Input
                        value={branding.tagline ?? ''}
                        onChange={e => update({ tagline: e.target.value })}
                        placeholder="Safety. Compliance. Driven."
                    />
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Contact
                    </p>
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
                            <Input
                                value={branding.address ?? ''}
                                onChange={e => update({ address: e.target.value })}
                                placeholder="1240 Logistics Way · Aberdeen, MD 21001"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
                                <Input type="tel" value={branding.phone ?? ''} onChange={e => update({ phone: e.target.value })} className="font-mono" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
                                <Input type="email" value={branding.email ?? ''} onChange={e => update({ email: e.target.value })} className="font-mono" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Style
                    </p>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Accent colour</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={branding.accentColor}
                                onChange={e => update({ accentColor: e.target.value })}
                                className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-slate-200 bg-white"
                            />
                            <Input value={branding.accentColor} onChange={e => update({ accentColor: e.target.value })} className="font-mono" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Used as the form header bar colour.</p>
                    </div>
                </div>
            </div>

                {/* ── Live preview ──────────────────────────────────────── */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6 lg:self-start">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Live Preview
                        </p>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                            Updates as you type
                        </span>
                    </div>
                    <FormHeaderPreview branding={branding} />
                    <p className="text-[11px] text-slate-400">
                        How the header of every generated form will look with the branding above.
                    </p>
                </div>
            </div>
        </div>
    );
}
