import { useState } from "react";
import { ChevronLeft, Mail, FileText, PenSquare, ExternalLink, ShieldCheck, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AssignExaminerDialog, type AssignExaminerPayload } from "./AssignExaminerDialog";
import { HiringFormView } from "./formRegistry";
import { PrefillProvider, type ApplicantPrefill } from "./application-prefill";
import { useCompanyBranding } from "../ats/company-branding.data";

/**
 * RoadTestPreview — the Road Test mirror of RecipientFormPreview, with the same
 * Compose · Email · Recipient form tabs. Compose assigns the examiner, Email
 * previews the assignment they receive, and Recipient form is the actual
 * Road Test Evaluation the examiner fills.
 */
export function RoadTestPreview({ driverName, carrier, prefill, onBack }: {
    driverName: string; carrier: string; prefill: ApplicantPrefill | null; onBack: () => void;
}) {
    const [branding] = useCompanyBranding();
    const [tab, setTab] = useState<"compose" | "email" | "form">("compose");
    const [sent, setSent] = useState<AssignExaminerPayload | null>(null);
    const company = branding.name || "Acme Logistics";
    const accent = branding.accentColor || "#2563eb";
    const initials = company.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

    const Brand = () => (
        <div className="flex items-center gap-3">
            {branding.logoDataUrl
                ? <img src={branding.logoDataUrl} alt={company} className="h-9 w-auto rounded object-contain" />
                : <div className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>{initials}</div>}
            <div>
                <p className="text-sm font-bold leading-tight text-slate-900">{company}</p>
                {branding.tagline && <p className="text-[11px] text-slate-500">{branding.tagline}</p>}
            </div>
        </div>
    );

    const NeedAssign = ({ what }: { what: string }) => (
        <div className="px-4 py-16">
            <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><PenSquare className="h-7 w-7" /></div>
                <h2 className="mt-5 text-lg font-bold text-slate-900">Assign the examiner first</h2>
                <p className="mt-2 text-sm text-slate-500">Complete and send the assignment to preview the {what}.</p>
                <Button className="mt-6 gap-1.5" onClick={() => setTab("compose")}><PenSquare className="h-4 w-4" /> Go to Compose</Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Testing Forms</button>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {([["compose", "Compose", PenSquare], ["email", "Email", Mail], ["form", "Recipient form", FileText]] as const).map(([key, lbl, Icon]) => (
                        <button key={key} type="button" onClick={() => setTab(key)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition", tab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}><Icon className="h-3.5 w-3.5" /> {lbl}</button>
                    ))}
                </div>
                <span className="text-xs font-semibold text-slate-400">Recipient preview · Road Test Evaluation</span>
            </div>

            {/* Compose — assign the examiner (kept mounted so edits persist across tabs). */}
            <div className={cn("px-4 py-8", tab !== "compose" && "hidden")}>
                <div className="mx-auto max-w-2xl">
                    <AssignExaminerDialog
                        inline
                        sendLabel="Preview email"
                        driverName={driverName}
                        carrier={carrier}
                        onClose={onBack}
                        onAssign={(v) => { setSent(v); setTab("email"); }}
                    />
                    <p className="mt-4 text-center text-xs text-slate-400">Assign here, then preview the <span className="font-semibold text-slate-500">Email</span> the examiner receives and the <span className="font-semibold text-slate-500">Recipient form</span> they complete.</p>
                </div>
            </div>

            {tab === "email" && (!sent ? <NeedAssign what="email" /> : (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="space-y-1 border-b border-slate-100 bg-slate-50/70 px-6 py-4 text-sm">
                            <p className="text-slate-500"><span className="font-semibold text-slate-600">From:</span> {company} &lt;no-reply@tracksmart.com&gt;</p>
                            <p className="text-slate-500"><span className="font-semibold text-slate-600">To:</span> {sent.name} &lt;{sent.email}&gt;</p>
                            <p className="text-slate-800"><span className="font-semibold text-slate-600">Subject:</span> {sent.subject}</p>
                        </div>
                        <div className="px-8 py-8">
                            <Brand />
                            <h1 className="mt-6 text-xl font-bold text-slate-900">Road Test Assignment</h1>
                            <p className="mt-1 text-sm text-slate-400">FMCSA §391.31 · {driverName}</p>
                            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{sent.message}</p>

                            <div className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">Road Test Evaluation</p>
                                    <p className="break-all text-xs text-slate-500">{sent.formLink}</p>
                                </div>
                                <button type="button" onClick={() => setTab("form")} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90" style={{ backgroundColor: accent }}><ExternalLink className="h-3.5 w-3.5" /> Open form</button>
                            </div>
                            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> This link is unique to the examiner and expires in 14 days.</p>
                            <p className="mt-6 text-sm text-slate-600">Thank you,<br />{company} — Hiring Team</p>
                        </div>
                    </div>
                    <div className="mx-auto mt-4 flex max-w-2xl items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTab("compose")}><PenSquare className="h-3.5 w-3.5" /> Edit assignment</Button>
                        <p className="text-xs text-slate-400">Preview of the email the examiner receives.</p>
                    </div>
                </div>
            ))}

            {tab === "form" && (!sent ? <NeedAssign what="recipient form" /> : (
                <div className="px-4 py-8">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-slate-600">
                            <ClipboardCheck className="h-4 w-4 shrink-0 text-blue-500" />
                            <span><span className="font-semibold text-slate-800">{sent.name}</span> opens this Road Test Evaluation for <span className="font-semibold text-slate-800">{driverName}</span> — scores each section, then certifies the result.</span>
                        </div>
                        <PrefillProvider value={prefill}>
                            <HiringFormView formId="road-test" embedded onBack={onBack} />
                        </PrefillProvider>
                    </div>
                </div>
            ))}
        </div>
    );
}
