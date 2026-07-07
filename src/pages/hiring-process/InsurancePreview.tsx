import { useState } from "react";
import { ChevronLeft, Mail, FileText, CheckCircle2, ExternalLink, Paperclip, Award, PenSquare, Send, Eye, Check, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyBranding } from "../ats/company-branding.data";
import { PrefillProvider, type ApplicantPrefill } from "./application-prefill";
import { HiringFormView } from "./formRegistry";
import { SignaturePad } from "./FormKit";

/**
 * InsurancePreview — compose + preview the package the carrier SENDS to the insurance
 * agent so the agent can add the driver to the policy. Compose tab builds the email;
 * Email tab is what the agent receives (filled forms & data attached); Recipient form
 * is where the agent confirms the driver has been added to the policy.
 */
export function InsurancePreview({ driverName, carrier, prefill, onBack }: {
    driverName: string; carrier: string; prefill: ApplicantPrefill | null; onBack: () => void;
}) {
    const [branding] = useCompanyBranding();
    const company = branding.name || carrier || "Acme Logistics";
    const accent = branding.accentColor || "#2563eb";
    const initials = company.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const nameSlug = driverName.toLowerCase().replace(/\s+/g, "-");
    const formLink = `https://app.tracksmart.com/r/insurance-${nameSlug}-x8f2`;

    // The filled forms & data bundled for the agent. The recent reports are listed as
    // "whichever applies" — the live hiring file narrows these to the workflow's reports.
    // Experience letters — one Employment + one Insurance letter per previous employer.
    const emps = prefill?.employment?.length ? prefill.employment : [{ employer: "Previous Employer", dates: "" }];
    const letterEntries = emps.flatMap((e, i) => [
        { label: `Employment Experience Letter — ${e.employer || `Employer ${i + 1}`}`, note: e.dates || "From previous employer" },
        { label: `Insurance Experience Letter — ${e.employer || `Employer ${i + 1}`}`, note: e.dates || "From previous insurer" },
    ]);
    const PACKAGE: { label: string; note: string; formId?: string }[] = [
        { label: "Employment Application", note: "Completed application", formId: "application" },
        { label: "Consent Forms", note: "Signed authorizations (FCRA, MVR release, Clearinghouse…)", formId: "fcra-disclosure" },
        { label: "MVR — Motor Vehicle Record", note: "Most recent on file", formId: "mvr" },
        { label: "PSP — Pre-Employment Screening", note: "Most recent on file", formId: "psp" },
        { label: "Driver Abstract / CVDR / CDA", note: "Whichever applies to the driver's jurisdiction", formId: "driver-abstract" },
        ...letterEntries,
    ];
    const defaultMessage = [
        "Hi,", "",
        `Please add ${driverName} to our insurance policy. Attached is the completed hiring file:`,
        ...PACKAGE.map((p) => `  • ${p.label}`),
        "", "Please confirm once the driver has been added and provide the policy details.", "",
        "Thank you,", company,
    ].join("\n");

    const [tab, setTab] = useState<"compose" | "email" | "form">("compose");
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState(`Add driver to policy — ${driverName}`);
    const [message, setMessage] = useState(defaultMessage);
    const [sent, setSent] = useState<{ to: string; subject: string; message: string } | null>(null);

    // Agent's confirmation form.
    const [policyNo, setPolicyNo] = useState("");
    const [coverage, setCoverage] = useState("");
    const [effective, setEffective] = useState("");
    const [agentName, setAgentName] = useState("");
    const [agentSig, setAgentSig] = useState("");
    const [agentDate, setAgentDate] = useState("");
    const [confirmed, setConfirmed] = useState(false);

    // Review the attached forms (form view or PDF) + a simple doc preview for the letters.
    const [openForm, setOpenForm] = useState<{ id: string; pdf: boolean } | null>(null);
    const [docView, setDocView] = useState<string | null>(null);

    // The agent's review checklist.
    const CHECKS = [
        "Employment application reviewed",
        "Consent forms reviewed",
        "Driving record (MVR / PSP) reviewed",
        "Experience letters reviewed",
        "Driver meets insurability criteria",
    ];
    const [checked, setChecked] = useState<Record<string, boolean>>({});

    // Supporting documents the agent uploads — multiple, each with an issue & expiry date.
    type Upl = { id: string; name: string; issue: string; expiry: string };
    const [uploads, setUploads] = useState<Upl[]>([]);
    const addUpload = () => setUploads((u) => [...u, { id: `u-${Date.now()}-${u.length}`, name: "", issue: "", expiry: "" }]);
    const nameUpload = (id: string) => setUploads((u) => u.map((x, i) => (x.id === id ? { ...x, name: `document-${i + 1}.pdf` } : x)));
    const patchUpload = (id: string, patch: Partial<Upl>) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const removeUpload = (id: string) => setUploads((u) => u.filter((x) => x.id !== id));

    // The agent can request a document back from the carrier.
    const [reqOpen, setReqOpen] = useState(false);
    const [reqName, setReqName] = useState("");
    const [reqNote, setReqNote] = useState("");
    const [requested, setRequested] = useState<{ id: string; name: string }[]>([]);
    const sendReq = () => { if (!reqName.trim()) return; setRequested((r) => [...r, { id: `r-${Date.now()}`, name: reqName.trim() }]); setReqName(""); setReqNote(""); setReqOpen(false); };

    const toLine = sent?.to || to || "agent@insurer.com";

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
                <p className="mt-2 text-sm text-slate-500">Fill in and send the package to preview the {what}.</p>
                <Button className="mt-6 gap-1.5" onClick={() => setTab("compose")}><PenSquare className="h-4 w-4" /> Go to Compose</Button>
            </div>
        </div>
    );

    const PackageList = ({ tone = "slate", actions, view }: { tone?: "slate" | "accent"; actions?: boolean; view?: boolean }) => (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            <p className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Filled forms &amp; data attached</p>
            <ul className="divide-y divide-slate-100">
                {PACKAGE.map((p) => (
                    <li key={p.label} className="flex items-center gap-3 px-4 py-3">
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone === "accent" ? "text-white" : "bg-slate-100 text-slate-500")} style={tone === "accent" ? { backgroundColor: accent } : undefined}><Paperclip className="h-3.5 w-3.5" /></span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-800">{p.label}</span>
                            <span className="block text-xs text-slate-500">{p.note}</span>
                        </span>
                        {actions && (p.formId ? (
                            <span className="flex shrink-0 items-center gap-1.5">
                                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpenForm({ id: p.formId!, pdf: false })}><Eye className="h-3.5 w-3.5" /> Review</Button>
                                <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setOpenForm({ id: p.formId!, pdf: true })}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                            </span>
                        ) : (
                            <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => setDocView(p.label)}><Eye className="h-3.5 w-3.5" /> View</Button>
                        ))}
                        {view && <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => p.formId ? setOpenForm({ id: p.formId, pdf: false }) : setDocView(p.label)}><Eye className="h-3.5 w-3.5" /> View</Button>}
                    </li>
                ))}
            </ul>
        </div>
    );

    // Review one of the attached forms — as the form (Review) or the PDF document (PDF).
    if (openForm) {
        return (
            <PrefillProvider value={prefill}>
                <HiringFormView formId={openForm.id} startPreview={openForm.pdf} onBack={() => setOpenForm(null)} />
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
                <span className="text-xs font-semibold text-slate-400">Recipient preview · Adding to Insurance</span>
            </div>

            {/* Compose — send the package to the insurance agent */}
            {tab === "compose" && (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-2xl space-y-5">
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white"><Award className="h-4 w-4" /></span>
                                <div>
                                    <h2 className="text-sm font-bold text-slate-900">Send package to insurance agent</h2>
                                    <p className="text-xs text-slate-500">Forward {driverName}'s hiring file so the agent can add the driver to the policy.</p>
                                </div>
                            </div>
                            <div className="space-y-4 px-5 py-5">
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Agent email</Label>
                                    <Input type="email" className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder="agent@insurer.com" />
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</Label>
                                    <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Filled forms &amp; data in this package</Label>
                                    <div className="mt-1.5"><PackageList /></div>
                                </div>
                                <div>
                                    <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</Label>
                                    <Textarea className="mt-1.5 resize-none" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                                <Button variant="outline" onClick={onBack}>Cancel</Button>
                                <Button disabled={!subject.trim()} onClick={() => { setSent({ to, subject, message }); setTab("email"); }}><Send className="h-4 w-4" /> Preview email</Button>
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-400">Build the request here, then preview the <span className="font-semibold text-slate-500">Email</span> the agent receives and the <span className="font-semibold text-slate-500">Recipient form</span> where they confirm the driver is added.</p>
                    </div>
                </div>
            )}

            {tab === "email" && (!sent ? <NeedPreview what="email" /> : (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="space-y-1 border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-sm">
                            <p className="text-slate-500"><span className="font-semibold text-slate-600">From:</span> {company} &lt;no-reply@tracksmart.com&gt;</p>
                            <p className="text-slate-500"><span className="font-semibold text-slate-600">To:</span> Insurance Agent &lt;{toLine}&gt;</p>
                            <p className="text-slate-800"><span className="font-semibold text-slate-600">Subject:</span> {sent.subject}</p>
                        </div>
                        <div className="px-8 py-8">
                            <Brand />
                            <h1 className="mt-6 text-xl font-bold text-slate-900">Add driver to insurance policy</h1>
                            <p className="mt-1 text-sm text-slate-400">{driverName} · hiring file enclosed</p>
                            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{sent.message}</p>

                            <div className="mt-5"><PackageList /></div>

                            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">Confirm the driver is added to the policy</p>
                                    <p className="break-all text-xs text-slate-500">{formLink}</p>
                                </div>
                                <button type="button" onClick={() => setTab("form")} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: accent }}><ExternalLink className="h-3.5 w-3.5" /> Open</button>
                            </div>
                            <p className="mt-6 text-sm text-slate-600">Thank you,<br />{company} — Hiring Team</p>
                        </div>
                    </div>
                    <div className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab("compose")}><PenSquare className="h-3.5 w-3.5" /> Edit request</Button>
                        <p className="text-xs text-slate-400">Preview of the email the agent receives.</p>
                    </div>
                </div>
            ))}

            {tab === "form" && (!sent ? <NeedPreview what="recipient form" /> : confirmed ? (
                <div className="px-4 py-16">
                    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-7 w-7" /></div>
                        <h2 className="mt-5 text-lg font-bold text-slate-900">Driver added to policy</h2>
                        <p className="mt-2 text-sm text-slate-500">Thank you. <span className="font-semibold text-slate-700">{driverName}</span> has been confirmed on the policy and {company} has been notified. You may now close this window.</p>
                        <Button variant="outline" className="mt-6" onClick={() => setConfirmed(false)}>Back to form</Button>
                    </div>
                </div>
            ) : (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="px-6 py-5 text-white sm:px-8" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                            <Brand onDark />
                            <h1 className="mt-4 text-xl font-bold">Add driver to insurance policy</h1>
                            <p className="mt-1 text-sm text-white/80">{driverName} · hiring file enclosed</p>
                        </div>
                        <div className="px-6 py-6 sm:px-8">
                            <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
                                <span className="font-semibold text-slate-800">{company}</span> has sent the completed hiring file for <span className="font-semibold text-slate-800">{driverName}</span>. Please review the attached forms &amp; data, then confirm the driver has been added to the policy below.
                            </div>

                            <div className="mb-7"><PackageList tone="accent" actions /></div>

                            {/* Review checklist */}
                            <div className="mb-7 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                <h2 className="text-sm font-bold text-slate-800">Review checklist</h2>
                                <p className="mt-0.5 text-xs text-slate-500">Confirm you have reviewed each part of the hiring file.</p>
                                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {CHECKS.map((c) => (
                                        <li key={c}>
                                            <button type="button" onClick={() => setChecked((s) => ({ ...s, [c]: !s[c] }))} className="flex w-full items-center gap-2.5 text-left text-sm">
                                                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2", checked[c] ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white")}>{checked[c] && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                                                <span className={checked[c] ? "text-slate-700" : "text-slate-600"}>{c}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Module 1 — Upload supporting documents (multiple, each with issue & expiry) */}
                            <div className="mb-7">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-bold text-slate-800">Upload documents</h2>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={addUpload}><Plus className="h-4 w-4" /> Add document</Button>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Attach the insurance certificate, ID card or any supporting document — each with its issue &amp; expiry date. PDF, JPG or PNG.</p>
                                <div className="mt-3 space-y-3">
                                    {uploads.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No documents added yet. Use <span className="font-semibold text-slate-500">Add document</span> to attach one.</p>
                                    ) : uploads.map((u, idx) => (
                                        <div key={u.id} className="rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Document {idx + 1}</p>
                                                <button type="button" onClick={() => removeUpload(u.id)} title="Remove" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                            {u.name ? (
                                                <div className="mt-2 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><FileText className="h-4 w-4" /></span>
                                                    <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{u.name}</p>
                                                    <button type="button" onClick={() => patchUpload(u.id, { name: "" })} className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700">Replace</button>
                                                </div>
                                            ) : (
                                                <button type="button" onClick={() => nameUpload(u.id)} className="mt-2 flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                                                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400"><Upload className="h-5 w-5" /></span>
                                                    <span className="text-sm font-bold text-blue-600">Click to upload</span>
                                                    <span className="text-xs text-slate-400">PNG, JPG or PDF · max 10MB</span>
                                                </button>
                                            )}
                                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                <div>
                                                    <Label className="text-[11px] font-semibold text-slate-500">Issue Date</Label>
                                                    <Input type="date" className="mt-1 h-9" value={u.issue} onChange={(e) => patchUpload(u.id, { issue: e.target.value })} />
                                                </div>
                                                <div>
                                                    <Label className="text-[11px] font-semibold text-slate-500">Expiry Date</Label>
                                                    <Input type="date" className="mt-1 h-9" value={u.expiry} onChange={(e) => patchUpload(u.id, { expiry: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Module 2 — Request a document from the carrier */}
                            <div className="mb-7">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h2 className="text-sm font-bold text-slate-800">Request documents</h2>
                                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => setReqOpen(true)}><Send className="h-4 w-4" /> Request document</Button>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">Need something from {company}? <span className="font-semibold text-slate-600">Request</span> a document and they will send it back to you here.</p>
                                <div className="mt-3 space-y-2">
                                    {requested.length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">No requests yet. Use <span className="font-semibold text-slate-500">Request document</span> to ask {company} for one.</p>
                                    ) : requested.map((r) => (
                                        <div key={r.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600"><Send className="h-4 w-4" /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-slate-800">{r.name}</p>
                                                <p className="text-xs text-amber-700">Requested from {company} · awaiting</p>
                                            </div>
                                            <button type="button" onClick={() => setRequested((x) => x.filter((y) => y.id !== r.id))} title="Remove" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <h2 className="text-sm font-bold text-slate-800">Confirm the driver is added</h2>
                            <p className="mt-1 text-xs text-slate-500">Enter the policy details so {company} has them on file.</p>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <div>
                                    <Label className="text-xs font-semibold text-slate-600">Policy Number</Label>
                                    <Input className="mt-1.5" value={policyNo} onChange={(e) => setPolicyNo(e.target.value)} placeholder="e.g. GWC-44821-07" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-600">Coverage Type</Label>
                                    <select value={coverage} onChange={(e) => setCoverage(e.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                                        <option value="">Please choose</option>
                                        {["Liability", "Physical Damage", "Liability + Physical Damage", "Non-Trucking Liability"].map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-600">Effective Date</Label>
                                    <Input type="date" className="mt-1.5" value={effective} onChange={(e) => setEffective(e.target.value)} />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-slate-600">Agent Name</Label>
                                    <Input className="mt-1.5" value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Full name" />
                                </div>
                            </div>

                            {/* Insurance agent sign-off */}
                            <div className="mt-7 rounded-xl border border-slate-200 p-4">
                                <h2 className="text-sm font-bold text-slate-800">Insurance Agent Sign-Off</h2>
                                <p className="mt-0.5 text-xs text-slate-500">By signing, you confirm {driverName} has been added to the policy with the details above.</p>
                                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2"><SignaturePad label="Agent Signature" onChange={setAgentSig} /></div>
                                    <div>
                                        <Label className="text-xs font-semibold text-slate-600">Date Signed</Label>
                                        <Input type="date" className="mt-1.5" value={agentDate} onChange={(e) => setAgentDate(e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                                <p className="flex items-center gap-1.5 text-xs text-slate-400"><Award className="h-3.5 w-3.5" /> Your confirmation is shared only with {company}.</p>
                                <Button disabled={!agentSig} onClick={() => setConfirmed(true)}>Confirm driver added</Button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Request a document from the carrier */}
            {reqOpen && (
                <Dialog open onOpenChange={(o) => { if (!o) setReqOpen(false); }}>
                    <DialogContent className="max-w-md p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Send className="h-4 w-4" /></span> Request document</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 px-6 py-5">
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Document needed</Label>
                                <Input className="mt-1.5" value={reqName} onChange={(e) => setReqName(e.target.value)} placeholder="e.g. Certificate of insurance" />
                            </div>
                            <div>
                                <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message (optional)</Label>
                                <Textarea className="mt-1.5 resize-none" rows={3} value={reqNote} onChange={(e) => setReqNote(e.target.value)} placeholder={`Ask ${company} for this document…`} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                            <Button variant="outline" onClick={() => setReqOpen(false)}>Cancel</Button>
                            <Button disabled={!reqName.trim()} onClick={sendReq}><Send className="h-4 w-4" /> Send request</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Document preview — the experience letters (no fillable form) */}
            {docView && (
                <Dialog open onOpenChange={(o) => { if (!o) setDocView(null); }}>
                    <DialogContent className="max-w-lg p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Eye className="h-4 w-4" /></span> {docView}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-2 p-10 text-center">
                            <FileText className="h-10 w-10 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">{docView}</p>
                            <p className="text-xs text-slate-400">Document preview unavailable in this prototype.</p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
