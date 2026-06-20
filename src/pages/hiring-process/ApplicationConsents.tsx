import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check, PenLine, FileSignature, ShieldCheck, Sparkles, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyBranding } from "../ats/company-branding.data";
import { SignaturePad } from "./FormKit";
import { PolicyForm, type PolicyFormHandle } from "./PolicyForm";
import { consentDefsForType, POLICY_FORMS, SAFETY_SENSITIVE_RELEASE_ID, THEME_HEX, type PolicyFormDef } from "./policy-forms.data";

/**
 * Consent phase of the driver application. Laid out like the application form
 * wizard: a left step sidebar + one consent form at a time in the main panel
 * (big, readable, with its own PDF view). Step 0 is "Sign once" — the driver
 * applies one signature to approve every form, then can review each on its own.
 */
export type SafetySensitiveEmployer = { company: string; cityStateZip?: string; telephone?: string };

export function ConsentPhase({ typeId, typeName, onBack, onSubmit, safetySensitiveEmployers = [], operatesInUS = true }: {
    typeId: string; typeName: string; onBack: () => void; onSubmit: () => void;
    safetySensitiveEmployers?: SafetySensitiveEmployer[];
    operatesInUS?: boolean;
}) {
    const [branding] = useCompanyBranding();
    const releaseDef = POLICY_FORMS.find((f) => f.id === SAFETY_SENSITIVE_RELEASE_ID);

    // The base driver-type consents, plus one Testing-Records-Release per previous
    // employer the applicant flagged as a DOT safety-sensitive job (49 CFR Part 40).
    type ConsentItem = { key: string; def: PolicyFormDef; extra?: Record<string, string>; subtitle?: string };
    const items: ConsentItem[] = [
        ...consentDefsForType(typeId, operatesInUS).map((def) => ({ key: def.id, def } as ConsentItem)),
        ...(releaseDef ? safetySensitiveEmployers.map((e, i): ConsentItem => ({
            key: `${SAFETY_SENSITIVE_RELEASE_ID}--${i}`,
            def: releaseDef,
            extra: { prevEmployer: e.company, prevCityStateZip: e.cityStateZip ?? "", prevTelephone: e.telephone ?? "" },
            subtitle: e.company ? `Previous employer: ${e.company}` : "Previous employer",
        })) : []),
    ];

    // Shared signer details — applied to every consent form at once.
    const [signature, setSignature] = useState("");
    const [printName, setPrintName] = useState("");
    const [licenseNumber, setLicenseNumber] = useState("");
    const [province, setProvince] = useState("");
    const [date, setDate] = useState("");

    const [approved, setApproved] = useState<Record<string, boolean>>({});
    // Wizard cursor: 0 = "Sign once" step; 1..N = the consent forms.
    const [step, setStep] = useState(0);
    // The active form drives the navbar's Fill-sample control; PDF view opens a dedicated page.
    const formRef = useRef<PolicyFormHandle>(null);
    const [pdfView, setPdfView] = useState(false);

    const canApply = Boolean(signature && printName.trim());
    const approvedCount = items.filter((it) => approved[it.key]).length;
    const allApproved = items.length > 0 && approvedCount === items.length;
    const totalSteps = items.length + 1;

    const sharedValues = useMemo<Record<string, string>>(() => ({
        company: branding.name, applicant: printName, printName, driverName: printName,
        licenseNumber, state: province, date,
    }), [branding.name, printName, licenseNumber, province, date]);

    const applyAll = () => {
        if (!canApply) return;
        setApproved(Object.fromEntries(items.map((it) => [it.key, true])));
        setStep(1);
    };
    const toggle = (key: string) => setApproved((a) => ({ ...a, [key]: !a[key] }));

    const onSignStep = step === 0;
    const item = onSignStep ? null : items[step - 1];

    // PDF view opens the same dedicated full-page document UI used everywhere else
    // (theme tabs · Edit · Share · Print · Download), with Back returning to the wizard.
    if (pdfView && item) {
        return (
            <PolicyForm
                def={item.def}
                startPreview
                onBack={() => setPdfView(false)}
                sharedSignature={signature}
                sharedValues={item.extra ? { ...sharedValues, ...item.extra } : sharedValues}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Back to application
                </button>
                <div className="flex flex-wrap items-center gap-2.5">
                    {!onSignStep && (
                        <>
                            <Button type="button" variant="outline" size="sm" onClick={() => formRef.current?.fillSample()}>
                                <Sparkles className="h-4 w-4" /> Fill sample data
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setPdfView(true)}>
                                <Eye className="h-4 w-4" /> PDF view
                            </Button>
                        </>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        <ShieldCheck className="h-3.5 w-3.5 text-blue-600" /> {approvedCount} / {items.length} approved
                    </span>
                </div>
            </div>

            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6 lg:flex-row">
                {/* Steps sidebar */}
                <aside className="lg:w-80 lg:shrink-0">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
                        <div className="flex items-center justify-between px-1 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Consents</span>
                            <span className="text-xs font-semibold text-slate-500">{approvedCount}/{items.length}</span>
                        </div>
                        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${items.length ? (approvedCount / items.length) * 100 : 0}%` }} />
                        </div>
                        <nav className="max-h-[64vh] space-y-1 overflow-y-auto pr-1">
                            {/* Step 0 — sign once */}
                            <button type="button" onClick={() => setStep(0)}
                                className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-left transition", onSignStep ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50")}>
                                <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", canApply ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
                                    <FileSignature className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                    <span className={cn("block text-sm font-semibold", onSignStep ? "text-blue-700" : "text-slate-700")}>Sign once</span>
                                    <span className="block text-xs text-slate-400">Approve every form &middot; <span className="text-rose-400">signature</span></span>
                                </span>
                            </button>

                            {items.map((it, i) => {
                                const active = step === i + 1;
                                const isApproved = !!approved[it.key];
                                const hex = THEME_HEX[it.def.theme];
                                return (
                                    <button key={it.key} type="button" onClick={() => setStep(i + 1)}
                                        className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-left transition", active ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50")}>
                                        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", isApproved ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}>
                                            {isApproved ? <Check className="h-4 w-4" /> : i + 1}
                                        </span>
                                        <span className="min-w-0">
                                            <span className={cn("block truncate text-sm font-semibold", active ? "text-blue-700" : "text-slate-700")}>{it.def.title} <span style={{ color: hex }}>{it.def.accentTitle}</span></span>
                                            <span className="block truncate text-xs text-slate-400">{isApproved ? "Approved" : (it.subtitle ?? "Pending")}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main panel */}
                <main className="min-w-0 flex-1">
                    {onSignStep ? (
                        <>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Consent &amp; Authorizations</p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900">Review &amp; sign your consents</h1>
                            <p className="mt-1 text-sm text-slate-500">{typeName} &middot; {items.length} consent form{items.length === 1 ? "" : "s"} required before submitting.</p>

                            <div className="mt-5 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50/60 px-5 py-3">
                                    <FileSignature className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-semibold text-blue-900">Sign once — approve every form</span>
                                </div>
                                <div className="space-y-5 p-6">
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
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                        <p className="text-xs text-slate-500">Applies your signature to all {items.length} forms. You can still open and review each one.</p>
                                        <Button type="button" onClick={applyAll} disabled={!canApply}>
                                            <PenLine className="h-4 w-4" /> Apply signature &amp; approve all
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : item && (
                        <>
                            <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Consent {step} of {items.length}{item.subtitle ? ` · ${item.subtitle}` : ""}</p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900">{item.def.title} <span style={{ color: THEME_HEX[item.def.theme] }}>{item.def.accentTitle}</span></h1>

                            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <PolicyForm key={item.key} ref={formRef} def={item.def} embedded onBack={() => {}} sharedSignature={signature}
                                    sharedValues={item.extra ? { ...sharedValues, ...item.extra } : sharedValues}
                                    agree={{ checked: !!approved[item.key], onChange: () => toggle(item.key), label: `I have read and agree to this ${item.def.title.replace(/[—-]\s*$/, "").trim()} form${item.subtitle ? ` (${item.subtitle.replace("Previous employer: ", "")})` : ""}.` }} />
                            </div>
                        </>
                    )}

                    {/* Nav */}
                    <div className="mt-5 flex items-center justify-between">
                        <button type="button" onClick={() => (step === 0 ? onBack() : setStep((s) => Math.max(0, s - 1)))}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                            <ChevronLeft className="h-4 w-4" /> Back
                        </button>
                        {step < totalSteps - 1 ? (
                            <button type="button" onClick={() => setStep((s) => Math.min(totalSteps - 1, s + 1))}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
                                {onSignStep ? "Review forms" : "Next"} <ChevronRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={onSubmit} disabled={!allApproved}
                                className={cn("inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition", allApproved ? "bg-emerald-600 hover:bg-emerald-700" : "cursor-not-allowed bg-slate-300")}>
                                Submit Application <Check className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {!allApproved && step === totalSteps - 1 && (
                        <p className="mt-2 text-right text-xs text-amber-600">{items.length - approvedCount} form{items.length - approvedCount === 1 ? "" : "s"} still need approval before you can submit.</p>
                    )}
                </main>
            </div>
        </div>
    );
}
