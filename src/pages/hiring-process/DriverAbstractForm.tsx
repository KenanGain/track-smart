import { useRef, useState } from "react";
import { ChevronLeft, Eye, Printer, Download, Sparkles, Info, FileSearch } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { US_STATES, CA_PROVINCES, InlineCollector, ViolationFields, AccidentFields, newIncident, newAccident as newAppAccident, violationCard, violationTitle, accidentCard, type Incident, type Accident as AppAccident } from "./ApplicationSettingsPage";
import { US_MVR_TYPES } from "./abstract-records.data";
import { usePrefill } from "./application-prefill";
import { Field, Grid, SelectBox, ToggleRow, RevealPanel, PdfUpload, CheckLine, ReviewRemarks, ReviewSignOff, newSignOff, type RemarkItem, type SignOffData } from "./FormKit";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";

/**
 * Driver Abstract / MVR — official driving record, province / state aware.
 *   • US           → Motor Vehicle Record (MVR), by state
 *   • Canada       → province-specific abstract (Ontario CVOR, Alberta 5-Year, …)
 *   • Cross-Border → BOTH a US MVR and a Canadian Abstract, each captured in full
 * Record-type options come from abstract-records.data.ts based on the chosen
 * issuing authority, so each province/state shows its own products.
 */

const MODES = ["United States", "Canada", "Cross-Border (US & Canada)"];

type Region = "United States" | "Canada";
const authoritiesFor = (region: Region) => (region === "Canada" ? CA_PROVINCES : US_STATES);

type Abstract = { issueDate: string; pdf: string };
const newAbstract = (): Abstract => ({ issueDate: "", pdf: "" });
type Violation = { date: string; description: string; points: string; location: string };
type Accident = { date: string; description: string; atFault: string };

type DrivingRecord = {
    region: Region; authority: string; recordType: string; licenseNumber: string; status: string;
    primary: Abstract; additional: Abstract;
    orderNumber: string; searchDateTime: string; dateIssued: string; dateReceived: string;
    abstractNumber: string; abstractIssueDate: string;
    carrierName: string; safetyRating: string;
    hasViolations: boolean; violations: Violation[];
    hasAccidents: boolean; accidents: Accident[];
};
const newRecord = (region: Region): DrivingRecord => ({
    region, authority: "", recordType: region === "Canada" ? "" : US_MVR_TYPES[0], licenseNumber: "", status: "",
    primary: newAbstract(), additional: newAbstract(),
    orderNumber: "", searchDateTime: "", dateIssued: "", dateReceived: "",
    abstractNumber: "", abstractIssueDate: "",
    carrierName: "", safetyRating: "",
    hasViolations: false, violations: [], hasAccidents: false, accidents: [],
});

export function DriverAbstractForm({ onBack, embedded, variant, startPreview, onSignOff }: { onBack: () => void; embedded?: boolean; variant?: "mvr" | "abstract"; startPreview?: boolean; onSignOff?: () => void }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    // When a variant is given the form is locked to a single country (MVR = US, Abstract = Canada).
    const lockedRegion: Region | null = variant === "mvr" ? "United States" : variant === "abstract" ? "Canada" : null;
    const formTitle = variant === "mvr" ? "Motor Vehicle Record (MVR)" : variant === "abstract" ? "Driver Abstract" : "Driver Abstract / MVR";
    const [mode, setMode] = useState<string>(() => lockedRegion ?? (pf?.country === "Canada" ? "Canada" : "United States"));
    const [records, setRecords] = useState<DrivingRecord[]>(() => {
        const country = lockedRegion ?? (pf?.country === "Canada" ? "Canada" : "United States");
        return [{ ...newRecord(country), licenseNumber: pf?.licenses[0]?.number ?? "", authority: pf?.licenses[0]?.authority ?? "" }];
    });

    // Shared application Violation & Accident forms.
    const [hasVr, setHasVr] = useState(false);
    const [vrIncidents, setVrIncidents] = useState<Incident[]>([]);
    const [hasAcc, setHasAcc] = useState(false);
    const [vrAccidents, setVrAccidents] = useState<AppAccident[]>([]);

    // Record summary (drives the review checklist).
    const [summary, setSummary] = useState({ medicalExpiry: "", airBrake: "", roadTestClassA: "", demeritPoints: "", accidents: "", violations: "", inspections: "", outOfService: "" });
    const setSum = (patch: Partial<typeof summary>) => setSummary((s) => ({ ...s, ...patch }));

    // Review remarks + reviewer sign-off — lifted here so they appear in the PDF document.
    const [remarks, setRemarks] = useState<RemarkItem[]>([]);
    const [signoff, setSignoff] = useState<SignOffData>(newSignOff());

    const [preview, setPreview] = useState(Boolean(startPreview));
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const onMode = (m: string) => {
        setMode(m);
        setRecords(m.startsWith("Cross-Border") ? [newRecord("United States"), newRecord("Canada")] : [newRecord(m as Region)]);
    };
    const setRecord = (i: number, patch: Partial<DrivingRecord>) => setRecords((l) => l.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const fillSample = () => {
        const sample: DrivingRecord[] = [
            {
                ...newRecord("United States"), authority: "Illinois", recordType: "Motor Vehicle Record (MVR)", licenseNumber: "D1234-5678-90", status: "Violations on record",
                primary: { issueDate: "2026-05-20", pdf: "uploaded" }, orderNumber: "MVR-55210", searchDateTime: "2026-05-20T09:15", dateIssued: "2026-05-20", dateReceived: "2026-05-21",
                abstractNumber: "IL-MVR-77410", abstractIssueDate: "2026-05-20",
                hasViolations: true, violations: [{ date: "2024-02-11", description: "Speeding 12 mph over limit", points: "3", location: "Illinois" }],
            },
            {
                ...newRecord("Canada"), authority: "Ontario", recordType: "CVOR Abstract (Commercial)", licenseNumber: "O123-45678-90123", status: "Violations on record",
                primary: { issueDate: "2026-05-18", pdf: "uploaded" }, additional: { issueDate: "2026-05-18", pdf: "" }, orderNumber: "ORD-99214", searchDateTime: "2026-05-18T10:30", dateIssued: "2026-05-18", dateReceived: "2026-05-19",
                abstractNumber: "CVOR-7741203", abstractIssueDate: "2026-05-18", carrierName: "Northwind Transport", safetyRating: "Satisfactory",
                hasViolations: true, violations: [{ date: "2023-08-03", description: "Failure to obey traffic control device", points: "2", location: "Ontario" }],
                hasAccidents: true, accidents: [{ date: "2023-06-18", description: "Rear-end collision, minor damage", atFault: "No" }],
            },
        ];
        if (lockedRegion) { setRecords(sample.filter((r) => r.region === lockedRegion)); return; }
        setMode("Cross-Border (US & Canada)");
        setRecords(sample);
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
            pdf.save("driver-abstract-mvr.pdf");
        } finally { setDownloading(false); }
    };

    const recordSections = (r: DrivingRecord, prefixed: boolean): DocSection[] => {
        const isCanada = r.region === "Canada";
        const authLabel = isCanada ? "Issuing Province" : "Issuing State";
        const pointsLabel = isCanada ? "Demerit Points" : "Points";
        const attached = (a: Abstract) => (a.pdf ? "Attached" : "Not attached");
        const p = prefixed ? `${isCanada ? "CA" : "US"} · ` : "";
        return [
            { title: `${p}Driving Record`, groups: [{ rows: [
                { label: "Issuing Country", value: r.region }, { label: authLabel, value: r.authority },
                { label: "Date Issued", value: r.dateIssued }, { label: "Date Received", value: r.dateReceived },
                { label: `Driver ${isCanada ? "Abstract" : "MVR"} (PDF)`, value: attached(r.primary) },
            ] }] },
            ...(r.hasViolations ? [{ title: `${p}Violations / Convictions`, groups: r.violations.map((vi, i) => ({ label: r.violations.length > 1 ? `Violation ${i + 1}` : undefined, rows: [{ label: "Date", value: vi.date }, { label: "Charge / Description", value: vi.description }, { label: pointsLabel, value: vi.points }, { label: "State / Location", value: vi.location }] })) }] : []),
            ...(r.hasAccidents ? [{ title: `${p}Accidents / Collisions`, groups: r.accidents.map((a, i) => ({ label: r.accidents.length > 1 ? `Accident ${i + 1}` : undefined, rows: [{ label: "Date", value: a.date }, { label: "Description", value: a.description }, { label: "At Fault", value: a.atFault }] })) }] : []),
        ];
    };
    // Checklist rows (shared shape with the on-screen checklist) → document.
    const summaryChecks = [
        { label: "Medical expiry date provided", ok: !!summary.medicalExpiry },
        { label: "Air brake endorsement recorded", ok: !!summary.airBrake },
        { label: "Road test (Class A) passed", ok: !!summary.roadTestClassA },
        { label: "Current demerit points recorded", ok: !!summary.demeritPoints },
        { label: "Total accidents / crashes recorded", ok: !!summary.accidents },
        { label: "Total violations recorded", ok: !!summary.violations },
        { label: "Total inspections recorded", ok: !!summary.inspections },
        { label: "Total out-of-service recorded", ok: !!summary.outOfService },
    ];
    const recordChecks = (r: DrivingRecord) => {
        const noun = r.region === "Canada" ? "Abstract" : "MVR";
        return [
            { label: `${noun} report uploaded`, ok: !!r.primary.pdf },
            { label: "Issuing state / province provided", ok: !!r.authority },
            { label: "Date issued provided", ok: !!r.dateIssued },
            { label: "Date received provided", ok: !!r.dateReceived },
        ];
    };
    const checkVal = (ok: boolean) => (ok ? "✓ Complete" : "Pending");

    // Document sections: records → summary → review checklist → remarks → reviewer sign-off.
    const reviewSections: DocSection[] = [
        { title: "Summary", groups: [{ rows: [
            { label: "Medical Expiry Date", value: summary.medicalExpiry },
            { label: "Air Brake Endorsement", value: summary.airBrake },
            { label: "Road Test Passed (Class A)", value: summary.roadTestClassA },
            { label: "Current Demerit Points", value: summary.demeritPoints },
            { label: "Total Accidents / Crashes", value: summary.accidents },
            { label: "Total Violations", value: summary.violations },
            { label: "Total Inspections", value: summary.inspections },
            { label: "Total Out-of-Service (OOS)", value: summary.outOfService },
        ] }] },
        { title: "Review Checklist", groups: [
            ...records.map((r) => ({ label: records.length > 1 ? `Driver ${r.region === "Canada" ? "Abstract" : "MVR"} Record` : undefined, rows: recordChecks(r).map((c) => ({ label: c.label, value: checkVal(c.ok) })) })),
            { label: records.length > 1 ? "Summary" : undefined, rows: summaryChecks.map((c) => ({ label: c.label, value: checkVal(c.ok) })) },
        ] },
        ...(remarks.length ? [{ title: "Remarks & Comments", groups: [{ rows: remarks.slice().reverse().map((r, i) => ({ label: `Remark ${i + 1}`, value: r.text })) }] }] : []),
        { title: "Reviewer Sign-Off", groups: [signoff.done
            ? { rows: [{ label: "Reviewed by", value: signoff.name }, { label: "Title", value: signoff.role }, { label: "Date", value: signoff.date }, { label: "Status", value: "Reviewed & signed" }], images: signoff.sig ? [signoff.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending review — not yet signed" }] }] },
    ];
    const sections = [...records.flatMap((r) => recordSections(r, records.length > 1)), ...reviewSections];

    const editBody = (
        <>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                <p className="text-sm text-slate-600">{lockedRegion
                    ? <>Choose the issuing {lockedRegion === "Canada" ? "province" : "state"}, enter the dates and upload the report, then complete the review checklist and sign off below.</>
                    : <>Choose the issuing province/state, enter the record details, then complete the review checklist and sign off below. A <span className="font-medium text-slate-700">cross-border</span> driver supplies <span className="font-medium text-slate-700">both</span> a US MVR and a Canadian abstract.</>}</p>
            </div>

            {/* Mode — hidden when the form is locked to one country via `variant`. */}
            {!lockedRegion && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <Field label="Driver operates in" required hint="Cross-border drivers must provide a record for each country.">
                        <SelectBox value={mode} items={MODES} onChange={onMode} />
                    </Field>
                </div>
            )}

            {/* One continuous block — record, summary, then violations & accidents */}
            <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {records.map((r, i) => <RecordCard key={i} value={r} onChange={(patch) => setRecord(i, patch)} />)}

                {/* Summary */}
                <div className="p-5">
                    <h2 className="mb-3 text-base font-bold text-slate-900">Summary</h2>
                    <Grid>
                        <Field label="Medical Expiry Date"><Input type="date" value={summary.medicalExpiry} onChange={(e) => setSum({ medicalExpiry: e.target.value })} /></Field>
                        <Field label="Air Brake Endorsement"><SelectBox value={summary.airBrake} placeholder="Select" items={["Yes", "No"]} onChange={(v) => setSum({ airBrake: v })} /></Field>
                        <Field label="Road Test Passed (Class A)"><Input type="date" value={summary.roadTestClassA} onChange={(e) => setSum({ roadTestClassA: e.target.value })} /></Field>
                        <Field label="Current Demerit Points"><Input type="number" value={summary.demeritPoints} onChange={(e) => setSum({ demeritPoints: e.target.value })} /></Field>
                        <Field label="Total Accidents / Crashes"><Input type="number" value={summary.accidents} onChange={(e) => setSum({ accidents: e.target.value })} /></Field>
                        <Field label="Total Violations"><Input type="number" value={summary.violations} onChange={(e) => setSum({ violations: e.target.value })} /></Field>
                        <Field label="Total Inspections"><Input type="number" value={summary.inspections} onChange={(e) => setSum({ inspections: e.target.value })} /></Field>
                        <Field label="Total Out-of-Service (OOS)"><Input type="number" value={summary.outOfService} onChange={(e) => setSum({ outOfService: e.target.value })} /></Field>
                    </Grid>
                </div>

                {/* Violations & Accidents */}
                <div className="space-y-5 p-5">
                    <h2 className="text-base font-bold text-slate-900">Violations &amp; Accidents</h2>
                    <ToggleRow label="Any violations or convictions on record?" checked={hasVr} onChange={(b) => setHasVr(b)} />
                    {hasVr && (
                        <RevealPanel title="Violations / Convictions">
                            <InlineCollector items={vrIncidents} setItems={setVrIncidents} factory={newIncident} addLabel="Add Violation" cardTitle={violationTitle} renderCard={violationCard} renderForm={(d, set) => <ViolationFields d={d} set={set} />} />
                        </RevealPanel>
                    )}
                    <ToggleRow label="Any accidents or collisions on record?" checked={hasAcc} onChange={(b) => setHasAcc(b)} />
                    {hasAcc && (
                        <RevealPanel title="Accidents / Collisions">
                            <InlineCollector items={vrAccidents} setItems={setVrAccidents} factory={newAppAccident} addLabel="Add Accident" cardTitle={(a) => a.type || "New Accident"} renderCard={accidentCard} renderForm={(d, set) => <AccidentFields d={d} set={set} />} />
                        </RevealPanel>
                    )}
                </div>
            </div>

            {/* Review checklist */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                {records.map((r, i) => {
                    const noun = r.region === "Canada" ? "Abstract" : "MVR";
                    const checks = [
                        { label: `${noun} report uploaded`, ok: !!r.primary.pdf },
                        { label: "Issuing state / province provided", ok: !!r.authority },
                        { label: "Date issued provided", ok: !!r.dateIssued },
                        { label: "Date received provided", ok: !!r.dateReceived },
                    ];
                    return (
                        <div key={i} className="mt-2">
                            {records.length > 1 && <p className="mb-1 text-sm font-semibold text-slate-700">Driver {noun} Record</p>}
                            <ul className="grid gap-1.5 sm:grid-cols-2">{checks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} />)}</ul>
                        </div>
                    );
                })}
                <div className="mt-3 border-t border-slate-100 pt-3">
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                        <CheckLine ok={!!summary.medicalExpiry} label="Medical expiry date provided" />
                        <CheckLine ok={!!summary.airBrake} label="Air brake endorsement recorded" />
                        <CheckLine ok={!!summary.roadTestClassA} label="Road test (Class A) passed" />
                        <CheckLine ok={!!summary.demeritPoints} label="Current demerit points recorded" />
                        <CheckLine ok={!!summary.accidents} label="Total accidents / crashes recorded" />
                        <CheckLine ok={!!summary.violations} label="Total violations recorded" />
                        <CheckLine ok={!!summary.inspections} label="Total inspections recorded" />
                        <CheckLine ok={!!summary.outOfService} label="Total out-of-service recorded" />
                    </ul>
                </div>
            </div>

            <ReviewRemarks value={remarks} onChange={setRemarks} />
            <ReviewSignOff heading="I have reviewed the driving record(s) above." value={signoff} onChange={(v) => { setSignoff(v); if (v.done && !signoff.done) onSignOff?.(); }} />
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
                    <FormDocument ref={docRef} title={formTitle} subtitle={mode} badge={mode.startsWith("Cross") ? "US · Canada" : mode} sections={sections} theme={theme} branding={branding} />
                </div>
            ) : (
                <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><FileSearch className="h-6 w-6 text-blue-600" /> {formTitle}</h1>
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

// ----------------------------- one jurisdiction's record (editable) -----------------------------
function RecordCard({ value, onChange }: { value: DrivingRecord; onChange: (patch: Partial<DrivingRecord>) => void }) {
    const isCanada = value.region === "Canada";
    const noun = isCanada ? "Abstract" : "MVR";
    const authLabel = isCanada ? "Issuing Province" : "Issuing State";
    const pdfHint = isCanada ? "Upload the driver abstract PDF for the selected province." : "Upload the Motor Vehicle Record (MVR) PDF.";
    const auth = authoritiesFor(value.region);

    const onCountry = (c: string) => onChange({ region: c as Region, authority: "" });
    const onAuthority = (a: string) => onChange({ authority: a });

    return (
        <div className="p-5">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <p className="text-base font-bold text-slate-900">Driver {noun} Record</p>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{value.region}</span>
            </div>
            <Grid>
                <Field label="Issuing Country" required><SelectBox value={value.region} items={["United States", "Canada"]} onChange={onCountry} /></Field>
                <Field label={authLabel} required><SelectBox value={value.authority} placeholder="Please choose" items={auth} onChange={onAuthority} /></Field>
                <Field label="Date Issued"><Input type="date" value={value.dateIssued} onChange={(e) => onChange({ dateIssued: e.target.value })} /></Field>
                <Field label="Date Received"><Input type="date" value={value.dateReceived} onChange={(e) => onChange({ dateReceived: e.target.value })} /></Field>
            </Grid>
            <div className="mt-5">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Driver {noun} (PDF)</p>
                <PdfUpload value={value.primary.pdf} onChange={(pdf) => onChange({ primary: { ...value.primary, pdf } })} />
                <p className="mt-2 text-xs text-slate-400">{pdfHint}</p>
            </div>
        </div>
    );
}

