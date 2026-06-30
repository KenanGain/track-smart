import { useMemo, useState } from "react";
import { ChevronLeft, Mail, FileText, CheckCircle2, ExternalLink, ShieldCheck, Paperclip, UploadCloud, ClipboardCheck, PenSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HiringFormView } from "./formRegistry";
import { PrefillProvider, type ApplicantPrefill } from "./application-prefill";
import { useCompanyBranding } from "../ats/company-branding.data";
import { EmployerRequestDialog, type EmployerRequestPayload } from "./EmployerRequestDialog";

export type RecipientDoc = { key: string; label: string; note?: string };

/**
 * RecipientFormPreview — compose + preview the request the previous employer receives.
 * The Compose tab is the shared "Request documents" form (the same one used in the hiring
 * file / Workflows). Sending it produces the Email the recipient sees and the Recipient
 * form where they attach the requested documents and complete the §391.23 form.
 */
export function RecipientFormPreview({ formId, label, applicantName, prefill, requestDocs = [], forms, onBack }: {
    formId: string;
    label: string;
    applicantName: string;
    prefill: ApplicantPrefill | null;
    requestDocs?: RecipientDoc[];
    forms?: { key: string; label: string }[];   // forms the employer can be asked to complete (each gets its own link)
    onBack: () => void;
}) {
    const [branding] = useCompanyBranding();
    const [tab, setTab] = useState<"compose" | "email" | "form">("compose");
    const [sent, setSent] = useState<EmployerRequestPayload | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [uploaded, setUploaded] = useState<Record<string, boolean>>({});
    const [activeFormId, setActiveFormId] = useState(formId);
    const [viewConsent, setViewConsent] = useState(false);   // view the driver's signed §391.23 authorization

    // The driver's signed Safety Performance History authorization — attached to every request.
    const CONSENT_FORM_ID = "sph-investigation-auth";
    const CONSENT_LABEL = "Safety Performance History — Investigation Authorization";

    const formsList = forms && forms.length ? forms : [{ key: formId, label }];
    const company = branding.name || "Acme Logistics";
    const initials = company.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const accent = branding.accentColor || "#2563eb";
    const nameSlug = applicantName.toLowerCase().replace(/\s+/g, "-");
    const formLink = (key: string) => `https://app.tracksmart.com/r/${key}-${nameSlug}-x8f2`;
    const docsLink = `https://app.tracksmart.com/r/docs-${nameSlug}-x8f2`;

    const emp = prefill?.employment?.[0];
    const employerName = emp?.employer || "Previous Employer";
    const period = emp ? (emp.dates || [emp.from, emp.to].filter(Boolean).join(" – ")) : undefined;
    const dataRows = emp ? [
        { label: "Employer", value: emp.employer || "" },
        { label: "Position", value: emp.position || "" },
        { label: "Employment dates", value: period || "" },
        { label: "Reason for leaving", value: emp.reason || "" },
    ] : undefined;

    // Documents/form chosen in the compose form, used to render the email + recipient page.
    const noteFor = useMemo(() => Object.fromEntries(requestDocs.map((d) => [d.key, d.note])), [requestDocs]);
    const activeDocs: RecipientDoc[] = sent ? sent.docKeys.map((k, i) => ({ key: k, label: sent.docLabels[i], note: noteFor[k] })) : [];
    const selForms = sent ? sent.formKeys.map((k, i) => ({ key: k, label: sent.formLabels[i] })) : [];
    const includeForm = selForms.length > 0;
    const toLine = sent?.to || "hr@previous-employer.com";
    const contactLine = sent?.contact || "Previous Employer";
    const renderFormId = includeForm ? (sent!.formKeys.includes(activeFormId) ? activeFormId : sent!.formKeys[0]) : formId;
    const renderFormLabel = selForms.find((f) => f.key === renderFormId)?.label ?? label;
    const openForm = (key: string) => { setActiveFormId(key); setTab("form"); };

    const Brand = ({ onDark }: { onDark?: boolean }) => (
        <div className="flex items-center gap-3">
            {branding.logoDataUrl
                ? <img src={branding.logoDataUrl} alt={company} className="h-9 w-auto rounded object-contain" />
                : <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: onDark ? "rgba(255,255,255,0.2)" : accent }}>{initials}</div>}
            <div>
                <p className={cn("text-sm font-bold leading-tight", onDark ? "text-white" : "text-slate-900")}>{company}</p>
                {branding.tagline && <p className={cn("text-[11px]", onDark ? "text-white/80" : "text-slate-500")}>{branding.tagline}</p>}
            </div>
        </div>
    );

    const NeedPreview = ({ what }: { what: string }) => (
        <div className="px-4 py-16">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><PenSquare className="h-7 w-7" /></div>
                <h2 className="mt-5 text-lg font-bold text-slate-900">Compose the request first</h2>
                <p className="mt-2 text-sm text-slate-500">Fill in and send the request to preview the {what}.</p>
                <Button className="mt-6 gap-1.5" onClick={() => setTab("compose")}><PenSquare className="h-4 w-4" /> Go to Compose</Button>
            </div>
        </div>
    );

    // The driver's signed authorization — opened read-only from the request / email / recipient form.
    if (viewConsent) {
        return (
            <PrefillProvider value={prefill}>
                <HiringFormView formId={CONSENT_FORM_ID} startPreview onBack={() => setViewConsent(false)} />
            </PrefillProvider>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Testing Forms</button>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {([["compose", "Compose", PenSquare], ["email", "Email", Mail], ["form", "Recipient form", FileText]] as const).map(([key, lbl, Icon]) => (
                        <button key={key} type="button" onClick={() => setTab(key)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition", tab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}><Icon className="h-3.5 w-3.5" /> {lbl}</button>
                    ))}
                </div>
                <span className="text-xs font-semibold text-slate-400">Recipient preview · {label}</span>
            </div>

            {/* Compose — the shared Request-documents form. Kept mounted so edits persist across tabs. */}
            <div className={cn("px-4 py-8", tab !== "compose" && "hidden")}>
                <div className="mx-auto max-w-2xl">
                    <EmployerRequestDialog
                        inline
                        sendLabel="Preview email"
                        defaultSubject={`Safety Performance History request — ${applicantName}`}
                        intro={`${company} is completing a Safety Performance History review (FMCSA §391.23) for ${applicantName}, who has listed your company as a previous employer. To complete our records, we are requesting the following:`}
                        employerName={employerName}
                        applicantName={applicantName}
                        period={period}
                        brandName={company}
                        docs={requestDocs.map((d) => ({ key: d.key, label: d.label, preselected: true }))}
                        forms={formsList.map((f) => ({ key: f.key, label: f.label, preselected: true }))}
                        dataRows={dataRows}
                        prefill={{ email: "hr@previous-employer.com", phone: emp?.telephone, address: emp?.address }}
                        consent={{ label: `${CONSENT_LABEL} (signed)`, note: `Signed by ${applicantName} · 49 CFR §391.23`, onView: () => setViewConsent(true) }}
                        onClose={onBack}
                        onSend={(payload) => { setSent(payload); setTab("email"); }}
                    />
                    <p className="mt-4 text-center text-xs text-slate-400">Build the request here, then preview the <span className="font-semibold text-slate-500">Email</span> and the <span className="font-semibold text-slate-500">Recipient form</span> to test the full flow.</p>
                </div>
            </div>

            {tab === "email" && (!sent ? <NeedPreview what="email" /> : (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Mail envelope meta */}
                        <div className="space-y-1 border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-sm">
                            <p className="text-slate-500"><span className="font-semibold text-slate-600">From:</span> {company} &lt;no-reply@tracksmart.com&gt;</p>
                            <p className="text-slate-500"><span className="font-semibold text-slate-600">To:</span> {contactLine} &lt;{toLine}&gt;</p>
                            <p className="text-slate-800"><span className="font-semibold text-slate-600">Subject:</span> {sent.subject}</p>
                        </div>
                        {/* Mail body */}
                        <div className="px-8 py-8">
                            <Brand />
                            <h1 className="mt-6 text-xl font-bold text-slate-900">Safety Performance History request</h1>
                            <p className="mt-1 text-sm text-slate-400">FMCSA §391.23 · {applicantName}</p>
                            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{sent.message}</p>

                            {/* What we need from you — documents + the form */}
                            {(activeDocs.length > 0 || includeForm) && (
                                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                                    <p className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">What we need from you</p>
                                    <ul className="divide-y divide-slate-100">
                                        {activeDocs.map((d) => (
                                            <li key={d.key} className="flex items-start gap-3 px-4 py-3">
                                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Paperclip className="h-3.5 w-3.5" /></span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-slate-800">{d.label}</span>
                                                    <span className="block text-xs text-slate-500">{d.note || "Attach a copy when you open the secure link."}</span>
                                                </span>
                                            </li>
                                        ))}
                                        {selForms.map((f) => (
                                            <li key={f.key} className="flex items-start gap-3 px-4 py-3">
                                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: accent }}><ClipboardCheck className="h-3.5 w-3.5" /></span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-slate-800">Complete the {f.label} form</span>
                                                    <span className="block text-xs text-slate-500">Fill and certify online — opens its own secure link below.</span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Attached — the driver's signed §391.23 authorization */}
                            <div className="mt-5 overflow-hidden rounded-xl border border-emerald-200">
                                <p className="border-b border-emerald-100 bg-emerald-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Attached — driver's authorization</p>
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-800">{CONSENT_LABEL} (signed)</p>
                                        <p className="truncate text-xs text-slate-500">{applicantName} authorized this release · 49 CFR §391.23</p>
                                    </div>
                                    <button type="button" onClick={() => setViewConsent(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" /> View</button>
                                </div>
                            </div>

                            {/* Secure links — one per form; documents are attached on its own link */}
                            <div className="mt-6 space-y-2.5">
                                {selForms.map((f) => (
                                    <div key={f.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                                            <p className="break-all text-xs text-slate-500">{formLink(f.key)}</p>
                                        </div>
                                        <button type="button" onClick={() => openForm(f.key)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: accent }}><ExternalLink className="h-3.5 w-3.5" /> Open</button>
                                    </div>
                                ))}
                                {selForms.length === 0 && activeDocs.length > 0 && (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">Attach the requested documents</p>
                                            <p className="break-all text-xs text-slate-500">{docsLink}</p>
                                        </div>
                                        <button type="button" onClick={() => setTab("form")} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: accent }}><ExternalLink className="h-3.5 w-3.5" /> Open</button>
                                    </div>
                                )}
                            </div>
                            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> {selForms.length > 1 ? "Each link is unique to you and expires in 14 days. Do not forward them." : "This link is unique to you and expires in 14 days. Do not forward it."}</p>
                            <p className="mt-6 text-sm text-slate-600">Thank you,<br />{company} — Hiring Team</p>
                        </div>
                    </div>
                    <div className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab("compose")}><PenSquare className="h-3.5 w-3.5" /> Edit request</Button>
                        <p className="text-xs text-slate-400">Preview of the email the recipient receives.</p>
                    </div>
                </div>
            ))}

            {tab === "form" && (!sent ? <NeedPreview what="recipient form" /> : submitted ? (
                <div className="px-4 py-16">
                    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
                        <h2 className="mt-5 text-lg font-bold text-slate-900">Submitted</h2>
                        <p className="mt-2 text-sm text-slate-500">Thank you. Your {includeForm ? <><span className="font-semibold text-slate-700">{label}</span>{activeDocs.length ? " and the attached documents" : ""}</> : "attached documents"} have been securely returned to {company}. You may now close this window.</p>
                        <Button variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>Back to form</Button>
                    </div>
                </div>
            ) : (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Recipient header */}
                        <div className="px-6 py-5 text-white sm:px-8" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                            <Brand onDark />
                            <h1 className="mt-4 text-xl font-bold">{includeForm ? renderFormLabel : "Requested documents"}</h1>
                            <p className="mt-1 text-sm text-white/80">Safety Performance History request · FMCSA §391.23</p>
                        </div>
                        <div className="px-6 py-6 sm:px-8">
                            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">{company}</span> has asked you to complete this for <span className="font-semibold text-slate-800">{applicantName}</span>, who has listed your company as a previous employer. Please attach the requested documents{includeForm ? " and complete the form" : ""} below.
                            </div>

                            {/* Driver's signed authorization — viewable proof of release */}
                            <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><ShieldCheck className="h-4 w-4" /></span>
                                <p className="min-w-0 flex-1 text-sm text-slate-600"><span className="font-semibold text-slate-800">{applicantName}</span> has signed an authorization releasing this safety-performance history (49 CFR §391.23).</p>
                                <button type="button" onClick={() => setViewConsent(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"><ExternalLink className="h-3.5 w-3.5" /> View authorization</button>
                            </div>

                            {/* Requested documents — attach the letters/records */}
                            {activeDocs.length > 0 && (
                                <div className="mb-7">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-800">Requested documents</h2>
                                        <span className="text-xs font-semibold text-slate-400">{activeDocs.filter((d) => uploaded[d.key]).length}/{activeDocs.length} attached</span>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">Attach a copy of each document {company} requested. PDF, JPG or PNG.</p>
                                    <div className="mt-3 space-y-2.5">
                                        {activeDocs.map((d) => {
                                            const done = !!uploaded[d.key];
                                            return (
                                                <div key={d.key} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 transition", done ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white")}>
                                                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", done ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                                                        {done ? <CheckCircle2 className="h-5 w-5" /> : <Paperclip className="h-4 w-4" />}
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-semibold text-slate-800">{d.label}</p>
                                                        <p className="truncate text-xs text-slate-500">{done ? `${d.key}.pdf · attached` : (d.note || "Required")}</p>
                                                    </div>
                                                    {done ? (
                                                        <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => setUploaded((u) => ({ ...u, [d.key]: false }))}>Remove</Button>
                                                    ) : (
                                                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setUploaded((u) => ({ ...u, [d.key]: true }))}><UploadCloud className="h-4 w-4" /> Upload</Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {includeForm && (
                                <>
                                    {activeDocs.length > 0 && (
                                        <div className="mb-6 flex items-center gap-3">
                                            <div className="h-px flex-1 bg-slate-200" />
                                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Complete the form</span>
                                            <div className="h-px flex-1 bg-slate-200" />
                                        </div>
                                    )}
                                    {selForms.length > 1 && (
                                        <div className="mb-5 flex flex-wrap gap-2">
                                            {selForms.map((f) => (
                                                <button key={f.key} type="button" onClick={() => setActiveFormId(f.key)} className={cn("rounded-lg border px-3.5 py-2 text-xs font-semibold transition", f.key === renderFormId ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>{f.label}</button>
                                            ))}
                                        </div>
                                    )}
                                    <PrefillProvider value={prefill}>
                                        <HiringFormView key={renderFormId} formId={renderFormId} embedded onBack={onBack} />
                                    </PrefillProvider>
                                </>
                            )}
                            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                                <p className="flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Your response is encrypted and shared only with {company}.</p>
                                <Button onClick={() => setSubmitted(true)}>Submit</Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
