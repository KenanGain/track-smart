import { useRef, useState } from "react";
import { ChevronLeft, Check, Printer, Download, Send, RotateCcw } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCompanyBranding } from "../ats/company-branding.data";
import { FormDocument, THEMES, type ThemeKey, type DocSection, type DocRow } from "./FormDocument";
import { buildPrefill, type ApplicantPrefill } from "./application-prefill";
import { stepName, type HiringTemplate } from "./hiring-templates.data";
import { DOC_STATUS_META, EMP_MAX_ATTEMPTS, formName, formRegion, type Applicant, type DocStatus } from "./applicants.data";

const DONE_STATES: DocStatus[] = ["received", "verified", "skipped"];

// Build the reviewable document rows for one form, from the application data.
function formRows(fid: string, pf: ApplicantPrefill, status: DocStatus): DocRow[] {
    const n = stepName(fid).toLowerCase();
    const lic = pf.licenses[0];
    const emp = pf.employment[0];
    const rows: DocRow[] = [{ label: "Driver", value: pf.fullName }];
    if (/license|abstract|mvr|clearinghouse|medical|annual|psp|cvdr|cda|record|driving/.test(n) && lic) {
        rows.push({ label: "License Number", value: lic.number });
        if (lic.cls) rows.push({ label: "Class", value: lic.cls });
        if (lic.authority) rows.push({ label: "Issuing Authority", value: lic.authority });
        if (lic.exp) rows.push({ label: "Expiration", value: lic.exp });
    }
    if (/employ|verif/.test(n) && emp) {
        rows.push({ label: "Previous Employer", value: emp.employer });
        if (emp.position) rows.push({ label: "Position", value: emp.position });
        if (emp.dates) rows.push({ label: "Dates", value: emp.dates });
    }
    if (/criminal/.test(n)) { if (pf.dob) rows.push({ label: "Date of Birth", value: pf.dob }); if (pf.ssn) rows.push({ label: "SSN / SIN", value: pf.ssn }); }
    rows.push({ label: "Status", value: DOC_STATUS_META[status].label });
    return rows;
}

function sectionsForStep(step: HiringTemplate["steps"][number] | undefined, a: Applicant, pf: ApplicantPrefill, docOf: (f: string) => DocStatus): DocSection[] {
    if (!step) return [];
    // Application step → the full submitted application + a consent summary.
    if (step.kind === "app" || step.formIds.includes("application")) {
        const appSections: DocSection[] = (a.submission ?? []).map((s) => ({ title: s.title, groups: s.groups.map((g) => ({ label: g.label, rows: g.fields.map((f) => ({ label: f.label, value: f.value })) })) }));
        const consentFids = step.formIds.filter((f) => f !== "application");
        const consents: DocSection[] = consentFids.length ? [{ title: "Signed Consents", groups: [{ rows: consentFids.map((f) => ({ label: stepName(f), value: DOC_STATUS_META[docOf(f)].label })) }] }] : [];
        return appSections.length ? [...appSections, ...consents] : consents;
    }
    // Employment verification → one section per previous employer with its status.
    if (step.formIds.some((f) => f === "dot-verification" || f === "employment-verification") && pf.employment.length) {
        return pf.employment.map((e, i) => {
            const check = (a.empChecks ?? []).find((c) => c.id === `emp-${i}`);
            const status = check?.status ?? "pending";
            return {
                title: `Employer — ${e.employer}`,
                groups: [{ rows: [
                    { label: "Employer", value: e.employer },
                    ...(e.position ? [{ label: "Position", value: e.position }] : []),
                    ...(e.dates ? [{ label: "Dates", value: e.dates }] : []),
                    { label: "Verification", value: status.charAt(0).toUpperCase() + status.slice(1) },
                    ...(check?.attempts.length ? [{ label: "Requests sent", value: `${check.attempts.length}/${EMP_MAX_ATTEMPTS}` }] : []),
                ] }],
            };
        });
    }
    return step.formIds.map((fid) => ({ title: stepName(fid), groups: [{ rows: formRows(fid, pf, docOf(fid)) }] }));
}

export function HiringPdfReview({ a, tpl, initialStep = 0, onBack, onRequest, onToggleComplete }: { a: Applicant; tpl?: HiringTemplate; initialStep?: number; onBack: () => void; onRequest?: (fid: string) => void; onToggleComplete?: (stepIndex: number) => void }) {
    const [branding] = useCompanyBranding();
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const [sel, setSel] = useState(initialStep);
    const docRef = useRef<HTMLDivElement>(null);

    const steps = tpl?.steps ?? [];
    const docOf = (fid: string): DocStatus => a.docs?.[fid] ?? "pending";
    const stepDone = (s: HiringTemplate["steps"][number]) => s.formIds.length > 0 && s.formIds.every((f) => DONE_STATES.includes(docOf(f)));
    const currentIdx = steps.findIndex((s) => !stepDone(s));
    const step = steps[Math.min(sel, steps.length - 1)];
    const pf = buildPrefill(a);
    const sections = sectionsForStep(step, a, pf, docOf);
    const stepStatus = step ? (stepDone(step) ? "Complete" : "In progress") : "";

    const downloadPdf = async () => {
        const el = docRef.current;
        if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(`${a.firstName}-${a.lastName}-${step?.title ?? "step"}.pdf`.replace(/\s+/g, "-"));
        } finally { setDownloading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Bar */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Hiring file</button>
                    {(() => {
                        const reqFid = step?.formIds.find((f) => f !== "application" && f !== "review");
                        if (!reqFid) return null;
                        const done = step ? stepDone(step) : false;
                        return (
                            <>
                                <span className="mx-1 h-5 w-px bg-slate-200" />
                                {onRequest && <Button variant="outline" size="sm" onClick={() => onRequest(reqFid)}><Send className="h-4 w-4" /> Request</Button>}
                                {onToggleComplete && <Button variant="outline" size="sm" onClick={() => onToggleComplete(sel)}>{done ? <><RotateCcw className="h-4 w-4" /> Mark incomplete</> : <><Check className="h-4 w-4" /> Mark complete</>}</Button>}
                            </>
                        );
                    })()}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {THEMES.map((t) => <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>)}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                    <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                </div>
            </div>

            {/* Stepper — select which step's PDF to view */}
            <div className="no-print border-b border-slate-200 bg-white px-6 py-4">
                <div className="mx-auto max-w-4xl overflow-x-auto pb-1">
                    <div className="flex min-w-max items-start">
                        {steps.map((s, i) => {
                            const done = stepDone(s);
                            const isSel = i === sel;
                            const isCurrent = i === currentIdx;
                            return (
                                <button key={s.id} type="button" onClick={() => setSel(i)} className="relative flex min-w-[120px] flex-1 flex-col items-center px-1 outline-none">
                                    {i > 0 && <span className="absolute left-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: i <= currentIdx || currentIdx === -1 ? "#10b981" : "#e2e8f0" }} />}
                                    {i < steps.length - 1 && <span className="absolute right-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: (i < currentIdx || currentIdx === -1) ? "#10b981" : "#e2e8f0" }} />}
                                    <span className={cn("z-10 flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold transition", done ? "bg-emerald-500 text-white" : isCurrent ? "bg-amber-500 text-white ring-4 ring-amber-100" : isSel ? "bg-blue-600 text-white ring-4 ring-blue-100" : "border-2 border-slate-200 bg-white text-slate-400")}>
                                        {done ? <Check className="h-4 w-4" /> : isCurrent ? <span className="h-2 w-2 rounded-full bg-white" /> : i + 1}
                                    </span>
                                    <span className={cn("mt-2 line-clamp-2 max-w-[112px] text-center text-[10px] font-bold uppercase leading-tight tracking-wide", isSel ? "text-blue-700" : "text-slate-500")}>{s.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* PDF document */}
            <div className="px-6 py-8">
                {sections.length ? (
                    <FormDocument ref={docRef} title={`${formName(a.formId)} — ${step?.title ?? ""}`} subtitle={`${a.firstName} ${a.lastName} · ${a.email}`} badge={(step?.kind === "app" ? formRegion(a.formId) : stepStatus).toUpperCase() || undefined} sections={sections} theme={theme} branding={branding} />
                ) : (
                    <p className="py-20 text-center text-sm text-slate-400">No documents to review in this step yet.</p>
                )}
            </div>
        </div>
    );
}
