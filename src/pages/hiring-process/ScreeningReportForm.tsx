import { useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, Eye, Printer, Download, Sparkles, Info, ShieldCheck } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES } from "./ApplicationSettingsPage";
import { REPORT_TYPES, PSP_YEARS, OTHER_YEARS, INSPECTION_LEVELS, isPspType } from "./screening-reports.data";
import { Field, Grid, SelectBox, ToggleRow, RevealPanel, PdfUpload } from "./FormKit";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";

/**
 * Driver Screening Reports — PSP / CVDR / CDA. For US-only and cross-border
 * drivers. Provide one or more reports (e.g. a US PSP plus a Canadian CVDR),
 * each with its summary, the report PDF, and crash / inspection detail.
 * Built to mirror the Driver Abstract / MVR form.
 */

const FMCSA = "FMCSA (Federal)";

type Crash = { date: string; state: string; description: string; tow: string; fatalInjury: string };
type Inspection = { date: string; level: string; state: string; oos: string; description: string };
const newCrash = (): Crash => ({ date: "", state: "", description: "", tow: "", fatalInjury: "" });
const newInspection = (): Inspection => ({ date: "", level: "", state: "", oos: "", description: "" });

type Report = {
    type: string; reportNumber: string; authority: string; issueDate: string; yearsCovered: string;
    primaryPdf: string; additionalPdf: string;
    orderNumber: string; searchDateTime: string; dateReceived: string;
    crashesCount: string; inspectionsCount: string; violationsCount: string; oosCount: string;
    hasCrashes: boolean; crashes: Crash[];
    hasInspections: boolean; inspections: Inspection[];
};
const newReport = (type = REPORT_TYPES[0]): Report => ({
    type, reportNumber: "", authority: isPspType(type) ? FMCSA : "", issueDate: "", yearsCovered: isPspType(type) ? PSP_YEARS : "3 years",
    primaryPdf: "", additionalPdf: "",
    orderNumber: "", searchDateTime: "", dateReceived: "",
    crashesCount: "", inspectionsCount: "", violationsCount: "", oosCount: "",
    hasCrashes: false, crashes: [], hasInspections: false, inspections: [],
});

export function ScreeningReportForm({ onBack, embedded }: { onBack: () => void; embedded?: boolean }) {
    const [branding] = useCompanyBranding();
    const [reports, setReports] = useState<Report[]>([newReport()]);

    const [preview, setPreview] = useState(false);
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const setReport = (i: number, patch: Partial<Report>) => setReports((l) => l.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const fillSample = () => setReports([
        {
            ...newReport("PSP — Pre-Employment Screening Program"), reportNumber: "PSP-2026-554120", issueDate: "2026-05-20",
            orderNumber: "ORD-77410", searchDateTime: "2026-05-20T09:15", dateReceived: "2026-05-21",
            crashesCount: "1", inspectionsCount: "6", violationsCount: "3", oosCount: "0",
            hasCrashes: true, crashes: [{ date: "2023-06-18", state: "Illinois", description: "Rear-end, non-preventable, no injuries", tow: "No", fatalInjury: "None" }],
            hasInspections: true, inspections: [{ date: "2024-02-11", level: "Level I — Full", state: "Indiana", oos: "No", description: "Logbook form & manner — minor" }],
        },
        {
            ...newReport("CVDR — Commercial Vehicle Driver Record"), authority: "Ontario", reportNumber: "CVDR-Ontario-99214", issueDate: "2026-05-18", yearsCovered: "5 years",
            orderNumber: "ORD-99214", searchDateTime: "2026-05-18T10:30", dateReceived: "2026-05-19",
            crashesCount: "0", inspectionsCount: "2", violationsCount: "1", oosCount: "0",
            hasInspections: true, inspections: [{ date: "2023-08-03", level: "Level II — Walk-Around", state: "Ontario", oos: "No", description: "Minor — marker lamp" }],
        },
    ]);

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
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save("screening-reports.pdf");
        } finally { setDownloading(false); }
    };

    const fmtDateTime = (s: string) => (s ? s.replace("T", " ") : "");
    const reportSections = (r: Report, prefixed: boolean): DocSection[] => {
        const short = r.type.split(" ")[0];
        const p = prefixed ? `${short} · ` : "";
        const attached = (s: string) => (s ? "Attached" : "Not attached");
        return [
            { title: `${p}Report`, groups: [{ rows: [{ label: "Type", value: r.type }, { label: "Report Number", value: r.reportNumber }, { label: "Issuing Authority", value: r.authority }, { label: "Issue Date", value: r.issueDate }, { label: "Years Covered", value: r.yearsCovered }, { label: "Document", value: attached(r.primaryPdf) }, { label: "Additional Document", value: attached(r.additionalPdf) }, { label: "Order Number", value: r.orderNumber }, { label: "Search Date & Time", value: fmtDateTime(r.searchDateTime) }, { label: "Date Received", value: r.dateReceived }] }] },
            { title: `${p}Summary`, groups: [{ rows: [{ label: "Crashes", value: r.crashesCount }, { label: "Inspections", value: r.inspectionsCount }, { label: "Violations", value: r.violationsCount }, { label: "Out-of-Service (OOS)", value: r.oosCount }] }] },
            ...(r.hasCrashes ? [{ title: `${p}Crashes`, groups: r.crashes.map((c, i) => ({ label: r.crashes.length > 1 ? `Crash ${i + 1}` : undefined, rows: [{ label: "Date", value: c.date }, { label: "State / Province", value: c.state }, { label: "Tow-away", value: c.tow }, { label: "Fatality / Injury", value: c.fatalInjury }, { label: "Description", value: c.description }] })) }] : []),
            ...(r.hasInspections ? [{ title: `${p}Inspections / Violations`, groups: r.inspections.map((ins, i) => ({ label: r.inspections.length > 1 ? `Inspection ${i + 1}` : undefined, rows: [{ label: "Date", value: ins.date }, { label: "Level", value: ins.level }, { label: "State / Province", value: ins.state }, { label: "OOS", value: ins.oos }, { label: "Description", value: ins.description }] })) }] : []),
        ];
    };
    const sections = reports.flatMap((r) => reportSections(r, reports.length > 1));

    const editBody = (
        <>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                <p className="text-sm text-slate-600">For <span className="font-medium text-slate-700">US-only</span> and <span className="font-medium text-slate-700">cross-border</span> drivers. The US <span className="font-medium text-slate-700">PSP</span> is the FMCSA Pre-Employment Screening report (5-year crash · 3-year inspection); add a <span className="font-medium text-slate-700">CVDR / CDA</span> for the Canadian side. Add a report for each.</p>
            </div>

            {reports.map((r, i) => {
                const isPsp = isPspType(r.type);
                return (
                    <div key={i} className={reports.length > 1 ? "rounded-2xl border border-slate-200 bg-white/60 p-5" : ""}>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900">{reports.length > 1 ? `Report ${i + 1}` : "Screening Report"}</h2>
                            {reports.length > 1 && (
                                <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setReports((l) => l.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                            )}
                        </div>
                        <ReportCard value={r} onChange={(patch) => setReport(i, patch)} isPsp={isPsp} />
                    </div>
                );
            })}

            <button type="button" onClick={() => setReports((l) => [...l, newReport("CVDR — Commercial Vehicle Driver Record")])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Another Report</button>
        </>
    );

    if (embedded) return <div className="space-y-6">{editBody}</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Top bar */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Forms
                </button>
                {preview ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {THEMES.map((t) => (
                                <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                        <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fillSample}><Sparkles className="h-4 w-4" /> Fill sample data</Button>
                        <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                    </div>
                )}
            </div>

            {preview ? (
                <div className="px-6 py-8">
                    <FormDocument ref={docRef} title="Driver Screening Reports" subtitle="PSP / CVDR / CDA" badge={reports.length > 1 ? "Cross-Border" : reports[0]?.type.split(" ")[0]} sections={sections} theme={theme} branding={branding} />
                </div>
            ) : (
                <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><ShieldCheck className="h-6 w-6 text-blue-600" /> PSP / CVDR / CDA</h1>
                    </div>

                    {editBody}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                        <Button>Save reports</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------- one report -----------------------------
function ReportCard({ value, onChange, isPsp }: { value: Report; onChange: (patch: Partial<Report>) => void; isPsp: boolean }) {
    const setCrash = (i: number, patch: Partial<Crash>) => onChange({ crashes: value.crashes.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
    const setIns = (i: number, patch: Partial<Inspection>) => onChange({ inspections: value.inspections.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
    const onType = (t: string) => onChange({ type: t, authority: isPspType(t) ? FMCSA : "", yearsCovered: isPspType(t) ? PSP_YEARS : "3 years" });

    return (
        <div className="space-y-6">
            {/* Report details */}
            <div>
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Report Details</h3>
                <Grid>
                    <Field label="Report Type" required><SelectBox value={value.type} items={REPORT_TYPES} onChange={onType} /></Field>
                    <Field label="Report Number" required><Input placeholder="Enter number…" value={value.reportNumber} onChange={(e) => onChange({ reportNumber: e.target.value })} /></Field>
                    <Field label="Issuing Authority" required>
                        {isPsp ? <Input value={value.authority} disabled /> : <SelectBox value={value.authority} placeholder="State / Province" items={STATES_PROVINCES} onChange={(v) => onChange({ authority: v })} />}
                    </Field>
                    <Field label="Issue Date" required><Input type="date" value={value.issueDate} onChange={(e) => onChange({ issueDate: e.target.value })} /></Field>
                    <Field label="Years Covered">{isPsp ? <Input value={value.yearsCovered} disabled /> : <SelectBox value={value.yearsCovered} items={OTHER_YEARS} onChange={(v) => onChange({ yearsCovered: v })} />}</Field>
                    <Field label="Order Number"><Input value={value.orderNumber} onChange={(e) => onChange({ orderNumber: e.target.value })} /></Field>
                    <Field label="Search Date & Time" hint="When the report was pulled."><Input type="datetime-local" value={value.searchDateTime} onChange={(e) => onChange({ searchDateTime: e.target.value })} /></Field>
                    <Field label="Date Received"><Input type="date" value={value.dateReceived} onChange={(e) => onChange({ dateReceived: e.target.value })} /></Field>
                </Grid>
            </div>

            {/* Documents */}
            <div>
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Report Document (PDF)</h3>
                <div className="space-y-5">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h4 className="mb-3 text-sm font-semibold text-slate-800">{value.type.split(" ")[0]} Report (PDF)</h4>
                        <PdfUpload value={value.primaryPdf} onChange={(pdf) => onChange({ primaryPdf: pdf })} />
                        <p className="mt-2 text-xs text-slate-400">Upload the official {value.type.split(" ")[0]} report PDF.</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h4 className="mb-3 text-sm font-semibold text-slate-800">Additional Document (PDF)</h4>
                        <PdfUpload value={value.additionalPdf} onChange={(pdf) => onChange({ additionalPdf: pdf })} />
                        <p className="mt-2 text-xs text-slate-400">Optional — attach a supporting document.</p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div>
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Summary</h3>
                <Grid>
                    <Field label="Crashes"><Input type="number" value={value.crashesCount} onChange={(e) => onChange({ crashesCount: e.target.value })} /></Field>
                    <Field label="Inspections"><Input type="number" value={value.inspectionsCount} onChange={(e) => onChange({ inspectionsCount: e.target.value })} /></Field>
                    <Field label="Violations"><Input type="number" value={value.violationsCount} onChange={(e) => onChange({ violationsCount: e.target.value })} /></Field>
                    <Field label="Out-of-Service (OOS)"><Input type="number" value={value.oosCount} onChange={(e) => onChange({ oosCount: e.target.value })} /></Field>
                </Grid>
            </div>

            {/* Crashes & inspections */}
            <div>
                <h3 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Crashes &amp; Inspections</h3>
                <div className="space-y-5">
                    <ToggleRow label="Any crashes on record?" checked={value.hasCrashes} onChange={(b) => onChange({ hasCrashes: b })} />
                    {value.hasCrashes && (
                        <RevealPanel title="Crashes">
                            {value.crashes.map((c, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Crash {i + 1}</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => onChange({ crashes: value.crashes.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                                    </div>
                                    <Grid>
                                        <Field label="Date" required><Input type="date" value={c.date} onChange={(e) => setCrash(i, { date: e.target.value })} /></Field>
                                        <Field label="State / Province"><SelectBox value={c.state} placeholder="Please choose" items={STATES_PROVINCES} onChange={(val) => setCrash(i, { state: val })} /></Field>
                                        <Field label="Tow-away?"><SelectBox value={c.tow} placeholder="Select" items={["Yes", "No"]} onChange={(val) => setCrash(i, { tow: val })} /></Field>
                                        <Field label="Fatality / Injury"><SelectBox value={c.fatalInjury} placeholder="Select" items={["None", "Injury", "Fatality"]} onChange={(val) => setCrash(i, { fatalInjury: val })} /></Field>
                                        <Field className="sm:col-span-2" label="Description"><Input value={c.description} onChange={(e) => setCrash(i, { description: e.target.value })} /></Field>
                                    </Grid>
                                </div>
                            ))}
                            <button type="button" onClick={() => onChange({ crashes: [...value.crashes, newCrash()] })} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Crash</button>
                        </RevealPanel>
                    )}

                    <ToggleRow label="Any inspections / violations on record?" checked={value.hasInspections} onChange={(b) => onChange({ hasInspections: b })} />
                    {value.hasInspections && (
                        <RevealPanel title="Inspections / Violations">
                            {value.inspections.map((ins, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Inspection {i + 1}</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => onChange({ inspections: value.inspections.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                                    </div>
                                    <Grid>
                                        <Field label="Date" required><Input type="date" value={ins.date} onChange={(e) => setIns(i, { date: e.target.value })} /></Field>
                                        <Field label="Level"><SelectBox value={ins.level} placeholder="Select level" items={INSPECTION_LEVELS} onChange={(val) => setIns(i, { level: val })} /></Field>
                                        <Field label="State / Province"><SelectBox value={ins.state} placeholder="Please choose" items={STATES_PROVINCES} onChange={(val) => setIns(i, { state: val })} /></Field>
                                        <Field label="Out-of-Service?"><SelectBox value={ins.oos} placeholder="Select" items={["Yes", "No"]} onChange={(val) => setIns(i, { oos: val })} /></Field>
                                        <Field className="sm:col-span-2" label="Description"><Input value={ins.description} onChange={(e) => setIns(i, { description: e.target.value })} /></Field>
                                    </Grid>
                                </div>
                            ))}
                            <button type="button" onClick={() => onChange({ inspections: [...value.inspections, newInspection()] })} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Inspection</button>
                        </RevealPanel>
                    )}
                </div>
            </div>
        </div>
    );
}
