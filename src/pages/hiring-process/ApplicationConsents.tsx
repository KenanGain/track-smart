import { useMemo, useState } from "react";
import { ChevronLeft, ChevronDown, Check, PenLine, FileSignature, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyBranding } from "../ats/company-branding.data";
import { SignaturePad } from "./FormKit";
import { PolicyForm } from "./PolicyForm";
import { consentDefsForType, THEME_HEX } from "./policy-forms.data";

/**
 * Consent phase of the driver application. After the 13 application sections the
 * driver works through a driver-type-specific set of consent/authorization
 * forms. They can SIGN ONCE and approve every form at once, but can still open
 * and review each one individually before final submission.
 */
export function ConsentPhase({ typeId, typeName, onBack, onSubmit }: {
    typeId: string; typeName: string; onBack: () => void; onSubmit: () => void;
}) {
    const [branding] = useCompanyBranding();
    const forms = consentDefsForType(typeId);

    // Shared signer details — applied to every consent form at once.
    const [signature, setSignature] = useState("");
    const [printName, setPrintName] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [province, setProvince] = useState("");
    const [date, setDate] = useState("");

    const [approved, setApproved] = useState<Record<string, boolean>>({});
    const [openId, setOpenId] = useState<string | null>(null);

    const canApply = Boolean(signature && printName.trim());
    const approvedCount = forms.filter((f) => approved[f.id]).length;
    const allApproved = forms.length > 0 && approvedCount === forms.length;

    // Memoised so PolicyForm only re-syncs when a field actually changes.
    const sharedValues = useMemo<Record<string, string>>(() => ({
        company: branding.name, applicant: printName, printName, driverName: printName,
        licenseNumber, state: province, date,
    }), [branding.name, printName, licenseNumber, province, date]);

    const applyAll = () => {
        if (!canApply) return;
        setApproved(Object.fromEntries(forms.map((f) => [f.id, true])));
    };
    const toggle = (id: string) => setApproved((a) => ({ ...a, [id]: !a[id] }));

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Back to application
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> {approvedCount} / {forms.length} approved
                </span>
            </div>

            <div className="mx-auto max-w-3xl px-6 py-8">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Consent &amp; Authorizations</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Review &amp; sign your consents</h1>
                <p className="mt-1 text-sm text-slate-500">{typeName} · {forms.length} consent form{forms.length === 1 ? "" : "s"} required before submitting.</p>

                {/* Sign once — apply to all */}
                <div className="mt-6 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/60 px-5 py-3">
                        <FileSignature className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">Sign once — approve every form</span>
                    </div>
                    <div className="space-y-5 p-5">
                        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                            <div>
                                <Label className="text-slate-700">Print Name</Label>
                                <div className="mt-1.5"><Input value={printName} onChange={(e) => setPrintName(e.target.value)} placeholder="Full legal name" /></div>
                            </div>
                            <div>
                                <Label className="text-slate-700">Date</Label>
                                <div className="mt-1.5"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                            </div>
                            <div>
                                <Label className="text-slate-700">Driving License #</Label>
                                <div className="mt-1.5"><Input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} /></div>
                            </div>
                            <div>
                                <Label className="text-slate-700">State / Province</Label>
                                <div className="mt-1.5"><Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="e.g. Illinois / Ontario" /></div>
                            </div>
                        </div>
                        <div>
                            <Label className="text-slate-700">Signature</Label>
                            <div className="mt-1.5"><SignaturePad onChange={setSignature} /></div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">Applies your signature to all {forms.length} forms. You can still open and review each one below.</p>
                            <Button type="button" onClick={applyAll} disabled={!canApply}>
                                <PenLine className="h-4 w-4" /> Apply signature &amp; approve all
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Per-form list */}
                <div className="mt-6 space-y-3">
                    {forms.map((def, i) => {
                        const isOpen = openId === def.id;
                        const isApproved = !!approved[def.id];
                        const hex = THEME_HEX[def.theme];
                        return (
                            <div key={def.id} className={cn("overflow-hidden rounded-2xl border bg-white shadow-sm transition", isApproved ? "border-emerald-200" : "border-slate-200")}>
                                <div className="flex items-center gap-3 px-5 py-3.5">
                                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold", isApproved ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500")}>
                                        {isApproved ? <Check className="h-4 w-4" /> : i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-slate-800">{def.title} <span style={{ color: hex }}>{def.accentTitle}</span></p>
                                        <p className="truncate text-xs text-slate-400">{def.blurb}</p>
                                    </div>
                                    <span className={cn("hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block", isApproved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                                        {isApproved ? "Approved" : "Pending"}
                                    </span>
                                    <button type="button" onClick={() => setOpenId(isOpen ? null : def.id)} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                        {isOpen ? "Hide" : "Review"} <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                                    </button>
                                </div>
                                {isOpen && (
                                    <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-5">
                                        <div className="rounded-xl border border-slate-200 bg-white p-5">
                                            <PolicyForm def={def} embedded onBack={() => {}} sharedSignature={signature} sharedValues={sharedValues} />
                                        </div>
                                        <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <input type="checkbox" checked={isApproved} onChange={() => toggle(def.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <span className="text-sm font-medium text-slate-700">I have read and agree to this {def.title.replace(/[—-]\s*$/, "").trim()} form.</span>
                                        </label>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="mt-7 flex items-center justify-between">
                    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                        <ChevronLeft className="h-4 w-4" /> Back
                    </button>
                    <button type="button" onClick={onSubmit} disabled={!allApproved}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition",
                            allApproved ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300"
                        )}>
                        Submit Application <Check className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
