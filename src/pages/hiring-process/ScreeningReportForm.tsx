import { useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, Eye, Printer, Download, Sparkles, Info, ShieldCheck } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES, InlineCollector, ViolationFields, AccidentFields, newIncident, newAccident as newAppAccident, violationCard, violationTitle, accidentCard, type Incident, type Accident as AppAccident } from "./ApplicationSettingsPage";
import { REPORT_TYPES, INSPECTION_LEVELS, isPspType } from "./screening-reports.data";
import { Field, Grid, SelectBox, ToggleRow, RevealPanel, PdfUpload, CheckLine, ReviewRemarks, ReviewSignOff, newSignOff, type RemarkItem, type SignOffData } from "./FormKit";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";

/**
 * Driver Screening Reports — PSP / CVDR / CDA. Country + dates + one report PDF,
 * a quick summary, and crash / inspection detail. Built to mirror the MVR form.
 */

type Inspection = { date: string; level: string; state: string; oos: string; description: string };
const newInspection = (): Inspection => ({ date: "", level: "", state: "", oos: "", description: "" });

type Report = {
    type: string; region: string; reportNumber: string; issueDate: string; dateReceived: string;
    primaryPdf: string;
    crashesCount: string; inspectionsCount: string; violationsCount: string; oosCount: string; demeritPoints: string;
    hasViolations: boolean; violations: Incident[];
    hasAccidents: boolean; accidents: AppAccident[];
    hasInspections: boolean; inspections: Inspection[];
};
const newReport = (type = REPORT_TYPES[0]): Report => ({
    type, region: "United States", reportNumber: "", issueDate: "", dateReceived: "",
    primaryPdf: "",
    crashesCount: "", inspectionsCount: "", violationsCount: "", oosCount: "", demeritPoints: "",
    hasViolations: false, violations: [], hasAccidents: false, accidents: [],
    hasInspections: false, inspections: [],
});

export function ScreeningReportForm({ onBack, embedded, fixedType, startPreview, onSignOff }: { onBack: () => void; embedded?: boolean; fixedType?: string; startPreview?: boolean; onSignOff?: () => void }) {
    const [branding] = useCompanyBranding();
    // When `fixedType` is set the form is locked to a single product (PSP / CVDR / CDA).
    const [reports, setReports] = useState<Report[]>([newReport(fixedType ?? REPORT_TYPES[0])]);

    const [preview, setPreview] = useState(Boolean(startPreview));
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    // Review remarks + reviewer sign-off — lifted here so they appear in the PDF document.
    const [remarks, setRemarks] = useState<RemarkItem[]>([]);
    const [signoff, setSignoff] = useState<SignOffData>(newSignOff());

    const setReport = (i: number, patch: Partial<Report>) => setReports((l) => l.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const fillSample = () => {
        const psp: Report = {
            ...newReport(fixedType ?? "PSP — Pre-Employment Screening Program"), region: "United States", reportNumber: "PSP-2026-554120",
            issueDate: "2026-05-20", dateReceived: "2026-05-21", primaryPdf: "uploaded",
            crashesCount: "1", inspectionsCount: "6", violationsCount: "3", oosCount: "0", demeritPoints: "4",
            hasInspections: true, inspections: [{ date: "2024-02-11", level: "Level I — Full", state: "Indiana", oos: "No", description: "Logbook form & manner — minor" }],
        };
        const cvdr: Report = {
            ...newReport(fixedType && !isPspType(fixedType) ? fixedType : "CVDR — Commercial Vehicle Driver Record"), region: "Canada", reportNumber: "CVDR-Ontario-99214",
            issueDate: "2026-05-18", dateReceived: "2026-05-19", primaryPdf: "uploaded",
            crashesCount: "0", inspectionsCount: "2", violationsCount: "1", oosCount: "0", demeritPoints: "2",
            hasInspections: true, inspections: [{ date: "2023-08-03", level: "Level II — Walk-Around", state: "Ontario", oos: "No", description: "Minor — marker lamp" }],
        };
        if (fixedType) { setReports([isPspType(fixedType) ? psp : cvdr]); return; }
        setReports([psp, cvdr]);
    };

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

    const reportSections = (r: Report, prefixed: boolean): DocSection[] => {
        const short = r.type.split(" ")[0];
        const p = prefixed ? `${short} · ` : "";
        const attached = (s: string) => (s ? "Attached" : "Not attached");
        return [
            { title: `${p}Report`, groups: [{ rows: [{ label: "Type", value: r.type }, { label: "Issuing Country", value: r.region }, { label: "Report Number", value: r.reportNumber }, { label: "Issue Date", value: r.issueDate }, { label: "Date Received", value: r.dateReceived }, { label: "Document", value: attached(r.primaryPdf) }] }] },
            { title: `${p}Summary`, groups: [{ rows: [{ label: "Total Accidents / Crashes", value: r.crashesCount }, { label: "Total Inspections", value: r.inspectionsCount }, { label: "Total Violations", value: r.violationsCount }, { label: "Total Out-of-Service (OOS)", value: r.oosCount }, { label: "Current Demerit Points", value: r.demeritPoints }] }] },
            ...(r.hasInspections ? [{ title: `${p}Inspections / Violations`, groups: r.inspections.map((ins, i) => ({ label: r.inspections.length > 1 ? `Inspection ${i + 1}` : undefined, rows: [{ label: "Date", value: ins.date }, { label: "Level", value: ins.level }, { label: "State / Province", value: ins.state }, { label: "OOS", value: ins.oos }, { label: "Description", value: ins.description }] })) }] : []),
        ];
    };
    const checkVal = (ok: boolean) => (ok ? "✓ Complete" : "Pending");
    const reportChecks = (r: Report) => [
        { label: `${r.type.split(" ")[0]} report uploaded`, ok: !!r.primaryPdf },
        { label: "Issuing country provided", ok: !!r.region },
        { label: "Report number provided", ok: !!r.reportNumber },
        { label: "Issue date provided", ok: !!r.issueDate },
        { label: "Date received provided", ok: !!r.dateReceived },
        { label: "Total accidents / crashes recorded", ok: !!r.crashesCount },
        { label: "Total violations recorded", ok: !!r.violationsCount },
        { label: "Total inspections recorded", ok: !!r.inspectionsCount },
        { label: "Total out-of-service recorded", ok: !!r.oosCount },
        { label: "Current demerit points recorded", ok: !!r.demeritPoints },
    ];
    // Document sections: per-report detail → review checklist → remarks → reviewer sign-off.
    const reviewSections: DocSection[] = [
        { title: "Review Checklist", groups: reports.map((r) => ({ label: reports.length > 1 ? `${r.type.split(" ")[0]} Report` : undefined, rows: reportChecks(r).map((c) => ({ label: c.label, value: checkVal(c.ok) })) })) },
        ...(remarks.length ? [{ title: "Remarks & Comments", groups: [{ rows: remarks.slice().reverse().map((r, i) => ({ label: `Remark ${i + 1}`, value: r.text })) }] }] : []),
        { title: "Reviewer Sign-Off", groups: [signoff.done
            ? { rows: [{ label: "Reviewed by", value: signoff.name }, { label: "Title", value: signoff.role }, { label: "Date", value: signoff.date }, { label: "Status", value: "Reviewed & signed" }], images: signoff.sig ? [signoff.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending review — not yet signed" }] }] },
    ];
    const sections = [...reports.flatMap((r) => reportSections(r, reports.length > 1)), ...reviewSections];

    const editBody = (
        <>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                <p className="text-sm text-slate-600">{fixedType
                    ? <>Capture the <span className="font-medium text-slate-700">{fixedType}</span> — country &amp; dates, the report PDF, a quick summary and crash / inspection detail, then complete the review checklist and sign off below.</>
                    : <>Add a screening report for each jurisdiction — the US <span className="font-medium text-slate-700">PSP</span> and, for cross-border drivers, a Canadian <span className="font-medium text-slate-700">CVDR / CDA</span>.</>}</p>
            </div>

            {reports.map((r, i) => (
                <div key={i}>
                    {reports.length > 1 && (
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-bold text-slate-900">{r.type.split(" ")[0]} Report</h2>
                            <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setReports((l) => l.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                        </div>
                    )}
                    <ReportCard value={r} onChange={(patch) => setReport(i, patch)} locked={!!fixedType} />
                </div>
            ))}

            {!fixedType && <button type="button" onClick={() => setReports((l) => [...l, newReport("CVDR — Commercial Vehicle Driver Record")])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Another Report</button>}

            {/* Review checklist */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                {reports.map((r, i) => {
                    const short = r.type.split(" ")[0];
                    const checks = [
                        { label: `${short} report uploaded`, ok: !!r.primaryPdf },
                        { label: "Issuing country provided", ok: !!r.region },
                        { label: "Report number provided", ok: !!r.reportNumber },
                        { label: "Issue date provided", ok: !!r.issueDate },
                        { label: "Date received provided", ok: !!r.dateReceived },
                    ];
                    const summaryChecks = [
                        { label: "Total accidents / crashes recorded", ok: !!r.crashesCount },
                        { label: "Total violations recorded", ok: !!r.violationsCount },
                        { label: "Total inspections recorded", ok: !!r.inspectionsCount },
                        { label: "Total out-of-service recorded", ok: !!r.oosCount },
                        { label: "Current demerit points recorded", ok: !!r.demeritPoints },
                    ];
                    return (
                        <div key={i} className="mt-2">
                            {reports.length > 1 && <p className="mb-1 text-sm font-semibold text-slate-700">{short} Report</p>}
                            <ul className="grid gap-1.5 sm:grid-cols-2">{checks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} />)}</ul>
                            <ul className="mt-1.5 grid gap-1.5 border-t border-slate-100 pt-2 sm:grid-cols-2">{summaryChecks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} />)}</ul>
                        </div>
                    );
                })}
            </div>

            <ReviewRemarks value={remarks} onChange={setRemarks} />
            <ReviewSignOff heading="I have reviewed the screening report(s) above." value={signoff} onChange={(v) => { setSignoff(v); if (v.done && !signoff.done) onSignOff?.(); }} />
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
                    <FormDocument ref={docRef} title={fixedType ?? "Driver Screening Reports"} subtitle="PSP / CVDR / CDA" badge={reports.length > 1 ? "Cross-Border" : reports[0]?.type.split(" ")[0]} sections={sections} theme={theme} branding={branding} />
                </div>
            ) : (
                <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><ShieldCheck className="h-6 w-6 text-blue-600" /> {fixedType ?? "PSP / CVDR / CDA"}</h1>
                    </div>

                    {editBody}

                    {/* Footer — the sign-off block above is the single confirm/save action. */}
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Small label/value row used inside the collector's collapsed card.
const KV = ({ k, v }: { k: string; v: string }) => (
    <div className="flex justify-between gap-3 text-sm"><span className="text-slate-500">{k}</span><span className="font-medium text-slate-800">{v || "-"}</span></div>
);
const inspectionCard = (ins: Inspection) => <><KV k="Date" v={ins.date} /><KV k="Level" v={ins.level} /><KV k="State / Prov" v={ins.state} /><KV k="OOS" v={ins.oos} /></>;

function InspectionFields({ d, set }: { d: Inspection; set: (patch: Partial<Inspection>) => void }) {
    return (
        <Grid>
            <Field label="Date" required><Input type="date" value={d.date} onChange={(e) => set({ date: e.target.value })} /></Field>
            <Field label="Level"><SelectBox value={d.level} placeholder="Select level" items={INSPECTION_LEVELS} onChange={(v) => set({ level: v })} /></Field>
            <Field label="State / Province"><SelectBox value={d.state} placeholder="Please choose" items={STATES_PROVINCES} onChange={(v) => set({ state: v })} /></Field>
            <Field label="Out-of-Service?"><SelectBox value={d.oos} placeholder="Select" items={["Yes", "No"]} onChange={(v) => set({ oos: v })} /></Field>
            <Field className="sm:col-span-2" label="Description"><Input value={d.description} onChange={(e) => set({ description: e.target.value })} /></Field>
        </Grid>
    );
}

// ----------------------------- one report (editable, one continuous block) -----------------------------
function ReportCard({ value, onChange, locked }: { value: Report; onChange: (patch: Partial<Report>) => void; locked?: boolean }) {
    const short = value.type.split(" ")[0];
    const setViolations: React.Dispatch<React.SetStateAction<Incident[]>> = (a) => onChange({ violations: typeof a === "function" ? a(value.violations) : a });
    const setAccidents: React.Dispatch<React.SetStateAction<AppAccident[]>> = (a) => onChange({ accidents: typeof a === "function" ? a(value.accidents) : a });
    const setInspections: React.Dispatch<React.SetStateAction<Inspection[]>> = (a) => onChange({ inspections: typeof a === "function" ? a(value.inspections) : a });

    return (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Report details */}
            <div className="p-5">
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <p className="text-base font-bold text-slate-900">{short} Report</p>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{value.region}</span>
                </div>
                <Grid>
                    {!locked && <Field label="Report Type" required><SelectBox value={value.type} items={REPORT_TYPES} onChange={(t) => onChange({ type: t })} /></Field>}
                    <Field label="Issuing Country" required><SelectBox value={value.region} items={["United States", "Canada"]} onChange={(v) => onChange({ region: v })} /></Field>
                    <Field label="Report Number" required><Input placeholder="Enter number…" value={value.reportNumber} onChange={(e) => onChange({ reportNumber: e.target.value })} /></Field>
                    <Field label="Issue Date" required><Input type="date" value={value.issueDate} onChange={(e) => onChange({ issueDate: e.target.value })} /></Field>
                    <Field label="Date Received"><Input type="date" value={value.dateReceived} onChange={(e) => onChange({ dateReceived: e.target.value })} /></Field>
                </Grid>
                <div className="mt-5">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{short} Report (PDF)</p>
                    <PdfUpload value={value.primaryPdf} onChange={(pdf) => onChange({ primaryPdf: pdf })} />
                    <p className="mt-2 text-xs text-slate-400">Upload the official {short} report PDF.</p>
                </div>
            </div>

            {/* Summary */}
            <div className="p-5">
                <h2 className="mb-3 text-base font-bold text-slate-900">Summary</h2>
                <Grid>
                    <Field label="Total Accidents / Crashes"><Input type="number" value={value.crashesCount} onChange={(e) => onChange({ crashesCount: e.target.value })} /></Field>
                    <Field label="Total Violations"><Input type="number" value={value.violationsCount} onChange={(e) => onChange({ violationsCount: e.target.value })} /></Field>
                    <Field label="Total Inspections"><Input type="number" value={value.inspectionsCount} onChange={(e) => onChange({ inspectionsCount: e.target.value })} /></Field>
                    <Field label="Total Out-of-Service (OOS)"><Input type="number" value={value.oosCount} onChange={(e) => onChange({ oosCount: e.target.value })} /></Field>
                    <Field label="Current Demerit Points"><Input type="number" value={value.demeritPoints} onChange={(e) => onChange({ demeritPoints: e.target.value })} /></Field>
                </Grid>
            </div>

            {/* Violations & Accidents */}
            <div className="space-y-5 p-5">
                <h2 className="text-base font-bold text-slate-900">Violations &amp; Accidents</h2>
                <ToggleRow label="Any violations or convictions on record?" checked={value.hasViolations} onChange={(b) => onChange({ hasViolations: b })} />
                {value.hasViolations && (
                    <RevealPanel title="Violations / Convictions">
                        <InlineCollector items={value.violations} setItems={setViolations} factory={newIncident} addLabel="Add Violation" cardTitle={violationTitle} renderCard={violationCard} renderForm={(d, set) => <ViolationFields d={d} set={set} />} />
                    </RevealPanel>
                )}
                <ToggleRow label="Any accidents or collisions on record?" checked={value.hasAccidents} onChange={(b) => onChange({ hasAccidents: b })} />
                {value.hasAccidents && (
                    <RevealPanel title="Accidents / Collisions">
                        <InlineCollector items={value.accidents} setItems={setAccidents} factory={newAppAccident} addLabel="Add Accident" cardTitle={(a) => a.type || "New Accident"} renderCard={accidentCard} renderForm={(d, set) => <AccidentFields d={d} set={set} />} />
                    </RevealPanel>
                )}
            </div>

            {/* Inspections */}
            <div className="space-y-5 p-5">
                <h2 className="text-base font-bold text-slate-900">Inspections</h2>
                <ToggleRow label="Any inspections on record?" checked={value.hasInspections} onChange={(b) => onChange({ hasInspections: b })} />
                {value.hasInspections && (
                    <RevealPanel title="Inspections / Violations">
                        <InlineCollector items={value.inspections} setItems={setInspections} factory={newInspection} addLabel="Add Inspection" cardTitle={(ins) => ins.date ? `Inspection · ${ins.date}` : "New Inspection"} renderCard={inspectionCard} renderForm={(d, set) => <InspectionFields d={d} set={set} />} />
                    </RevealPanel>
                )}
            </div>
        </div>
    );
}
