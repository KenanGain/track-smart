import { useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, Eye, Printer, Download, Sparkles, Info, FileSearch, Flag, Leaf } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { US_STATES, CA_PROVINCES } from "./ApplicationSettingsPage";
import { recordTypesFor, isCommercialType, US_MVR_TYPES } from "./abstract-records.data";
import { usePrefill } from "./application-prefill";
import { Field, Grid, SelectBox, ToggleRow, RevealPanel, PdfUpload } from "./FormKit";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";

/**
 * Driver Abstract / MVR — official driving record, province / state aware.
 *   • US           → Motor Vehicle Record (MVR), by state
 *   • Canada       → province-specific abstract (Ontario CVOR, Alberta 5-Year, …)
 *   • Cross-Border → BOTH a US MVR and a Canadian Abstract, each captured in full
 * Record-type options come from abstract-records.data.ts based on the chosen
 * issuing authority, so each province/state shows its own products.
 */

const STATUSES = ["Clear — no violations", "Violations on record", "Under review"];
const SAFETY_RATINGS = ["Satisfactory", "Satisfactory — Unaudited", "Conditional", "Unsatisfactory"];
const MODES = ["United States", "Canada", "Cross-Border (US & Canada)"];

type Region = "United States" | "Canada";
const authoritiesFor = (region: Region) => (region === "Canada" ? CA_PROVINCES : US_STATES);

type Abstract = { issueDate: string; pdf: string };
const newAbstract = (): Abstract => ({ issueDate: "", pdf: "" });
type Violation = { date: string; description: string; points: string; location: string };
type Accident = { date: string; description: string; atFault: string };
const newViolation = (): Violation => ({ date: "", description: "", points: "", location: "" });
const newAccident = (): Accident => ({ date: "", description: "", atFault: "" });

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

const regionMeta = (r: Region) => r === "Canada"
    ? { Icon: Leaf, accent: "text-rose-600 bg-rose-50", title: "Canada — Driver Abstract / CVOR" }
    : { Icon: Flag, accent: "text-blue-600 bg-blue-50", title: "United States — Motor Vehicle Record (MVR)" };

export function DriverAbstractForm({ onBack, embedded }: { onBack: () => void; embedded?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const [mode, setMode] = useState(() => (pf?.country === "Canada" ? "Canada" : "United States"));
    const [records, setRecords] = useState<DrivingRecord[]>(() => {
        const country = pf?.country === "Canada" ? "Canada" : "United States";
        return [{ ...newRecord(country), licenseNumber: pf?.licenses[0]?.number ?? "", authority: pf?.licenses[0]?.authority ?? "" }];
    });

    const [preview, setPreview] = useState(false);
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const onMode = (m: string) => {
        setMode(m);
        setRecords(m.startsWith("Cross-Border") ? [newRecord("United States"), newRecord("Canada")] : [newRecord(m as Region)]);
    };
    const setRecord = (i: number, patch: Partial<DrivingRecord>) => setRecords((l) => l.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    const fillSample = () => {
        setMode("Cross-Border (US & Canada)");
        setRecords([
            {
                ...newRecord("United States"), authority: "Illinois", recordType: "Motor Vehicle Record (MVR)", licenseNumber: "D1234-5678-90", status: "Violations on record",
                primary: { issueDate: "2026-05-20", pdf: "" }, orderNumber: "MVR-55210", searchDateTime: "2026-05-20T09:15", dateIssued: "2026-05-20", dateReceived: "2026-05-21",
                abstractNumber: "IL-MVR-77410", abstractIssueDate: "2026-05-20",
                hasViolations: true, violations: [{ date: "2024-02-11", description: "Speeding 12 mph over limit", points: "3", location: "Illinois" }],
            },
            {
                ...newRecord("Canada"), authority: "Ontario", recordType: "CVOR Abstract (Commercial)", licenseNumber: "O123-45678-90123", status: "Violations on record",
                primary: { issueDate: "2026-05-18", pdf: "" }, additional: { issueDate: "2026-05-18", pdf: "" }, orderNumber: "ORD-99214", searchDateTime: "2026-05-18T10:30", dateIssued: "2026-05-18", dateReceived: "2026-05-19",
                abstractNumber: "CVOR-7741203", abstractIssueDate: "2026-05-18", carrierName: "Northwind Transport", safetyRating: "Satisfactory",
                hasViolations: true, violations: [{ date: "2023-08-03", description: "Failure to obey traffic control device", points: "2", location: "Ontario" }],
                hasAccidents: true, accidents: [{ date: "2023-06-18", description: "Rear-end collision, minor damage", atFault: "No" }],
            },
        ]);
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

    const fmtDateTime = (s: string) => (s ? s.replace("T", " ") : "");
    const recordSections = (r: DrivingRecord, prefixed: boolean): DocSection[] => {
        const isCanada = r.region === "Canada";
        const isCvor = isCommercialType(r.recordType);
        const authLabel = isCanada ? "Issuing Province" : "Issuing State";
        const pointsLabel = isCanada ? "Demerit Points" : "Points";
        const attached = (a: Abstract) => (a.pdf ? "Attached" : "Not attached");
        const p = prefixed ? `${isCanada ? "CA" : "US"} · ` : "";
        return [
            { title: `${p}Driving Record`, groups: [{ rows: [{ label: "Country", value: r.region }, { label: authLabel, value: r.authority }, { label: "Record / Abstract Type", value: r.recordType }, { label: "License Number", value: r.licenseNumber }, { label: "Status", value: r.status }] }] },
            {
                title: `${p}Driver ${isCanada ? "Abstract" : "MVR"} (PDF)`,
                groups: [
                    { label: "Primary", rows: [{ label: "Issue Date", value: r.primary.issueDate }, { label: "Document", value: attached(r.primary) }] },
                    ...(r.additional.issueDate || r.additional.pdf ? [{ label: "Additional", rows: [{ label: "Issue Date", value: r.additional.issueDate }, { label: "Document", value: attached(r.additional) }] }] : []),
                    { rows: [{ label: "Order / Ministry Number", value: r.orderNumber }, { label: "Search Date & Time", value: fmtDateTime(r.searchDateTime) }, { label: "Date Issued", value: r.dateIssued }, { label: "Date Received", value: r.dateReceived }] },
                ],
            },
            { title: `${p}${isCanada ? "CVOR / Abstract" : "Abstract / Record"} Number`, groups: [{ rows: [{ label: "Abstract Number", value: r.abstractNumber }, { label: "Issue Date", value: r.abstractIssueDate }, { label: "Issuing Authority", value: r.authority }, ...(isCvor ? [{ label: "Carrier Name", value: r.carrierName }, { label: "Safety Rating", value: r.safetyRating }] : [])] }] },
            ...(r.hasViolations ? [{ title: `${p}Violations / Convictions`, groups: r.violations.map((vi, i) => ({ label: r.violations.length > 1 ? `Violation ${i + 1}` : undefined, rows: [{ label: "Date", value: vi.date }, { label: "Charge / Description", value: vi.description }, { label: pointsLabel, value: vi.points }, { label: "State / Location", value: vi.location }] })) }] : []),
            ...(r.hasAccidents ? [{ title: `${p}Accidents / Collisions`, groups: r.accidents.map((a, i) => ({ label: r.accidents.length > 1 ? `Accident ${i + 1}` : undefined, rows: [{ label: "Date", value: a.date }, { label: "Description", value: a.description }, { label: "At Fault", value: a.atFault }] })) }] : []),
        ];
    };
    const sections = records.flatMap((r) => recordSections(r, records.length > 1));

    const editBody = (
        <>
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                <p className="text-sm text-slate-600">Choose the issuing province/state and the record types update to that jurisdiction’s products. A <span className="font-medium text-slate-700">cross-border</span> driver supplies <span className="font-medium text-slate-700">both</span> a US MVR and a Canadian abstract.</p>
            </div>

            {/* Mode */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Field label="Driver operates in" required hint="Cross-border drivers must provide a record for each country.">
                    <SelectBox value={mode} items={MODES} onChange={onMode} />
                </Field>
            </div>

            {/* Records */}
            {records.map((r, i) => {
                const m = regionMeta(r.region);
                return (
                    <div key={i} className={records.length > 1 ? "rounded-2xl border border-slate-200 bg-white/60 p-5" : ""}>
                        {records.length > 1 && (
                            <div className="mb-4 flex items-center gap-2">
                                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", m.accent)}><m.Icon className="h-4 w-4" /></span>
                                <h2 className="text-base font-bold text-slate-900">{m.title}</h2>
                            </div>
                        )}
                        <RecordCard value={r} onChange={(patch) => setRecord(i, patch)} />
                    </div>
                );
            })}
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
                    <FormDocument ref={docRef} title="Driver Abstract / MVR" subtitle={mode} badge={mode.startsWith("Cross") ? "US · Canada" : mode} sections={sections} theme={theme} branding={branding} />
                </div>
            ) : (
                <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><FileSearch className="h-6 w-6 text-blue-600" /> Driver Abstract / MVR</h1>
                    </div>

                    {editBody}

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                        <Button>Save record</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Abstract document block (issue date + PDF upload). Module-level so it isn't
// remounted on every keystroke (which would drop input focus).
function AbstractBlock({ title, hint, value, onChange }: { title: string; hint: string; value: Abstract; onChange: (a: Abstract) => void }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-800">{title}</h3>
            <Field className="max-w-xs" label="Issue Date" required><Input type="date" value={value.issueDate} onChange={(e) => onChange({ ...value, issueDate: e.target.value })} /></Field>
            <div className="mt-4"><PdfUpload value={value.pdf} onChange={(pdf) => onChange({ ...value, pdf })} /></div>
            <p className="mt-2 text-xs text-slate-400">{hint}</p>
        </div>
    );
}

// ----------------------------- one jurisdiction's record -----------------------------
function RecordCard({ value, onChange }: { value: DrivingRecord; onChange: (patch: Partial<DrivingRecord>) => void }) {
    const isCanada = value.region === "Canada";
    const isCvor = isCommercialType(value.recordType);
    const authLabel = isCanada ? "Issuing Province" : "Issuing State";
    const pointsLabel = isCanada ? "Demerit Points" : "Points";
    const docNoun = isCanada ? "abstract" : "MVR";
    const pdfHint = isCanada ? "Upload the driver abstract PDF for the selected province." : "Upload the Motor Vehicle Record (MVR) PDF.";
    const auth = authoritiesFor(value.region);
    const recTypes = recordTypesFor(value.region, value.authority);

    const onAuthority = (a: string) => onChange(isCanada ? { authority: a, recordType: recordTypesFor("Canada", a)[0] ?? "" } : { authority: a });
    const setViol = (i: number, patch: Partial<Violation>) => onChange({ violations: value.violations.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });
    const setAcc = (i: number, patch: Partial<Accident>) => onChange({ accidents: value.accidents.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });

    return (
        <div className="space-y-6">
            {/* Driving record */}
            <div>
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Driving Record</h2>
                <Grid>
                    <Field label={authLabel} required><SelectBox value={value.authority} placeholder="Please choose" items={auth} onChange={onAuthority} /></Field>
                    <Field label="Record / Abstract Type" required><SelectBox value={value.recordType} placeholder={isCanada && !value.authority ? "Choose province first" : "Select type"} items={recTypes} disabled={isCanada && !value.authority} onChange={(v) => onChange({ recordType: v })} /></Field>
                    <Field label="License Number" required><Input value={value.licenseNumber} onChange={(e) => onChange({ licenseNumber: e.target.value })} /></Field>
                    <Field label="Record Status" required><SelectBox value={value.status} placeholder="Select status" items={STATUSES} onChange={(v) => onChange({ status: v })} /></Field>
                </Grid>
            </div>

            {/* Abstract documents */}
            <div>
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Driver {isCanada ? "Abstract" : "MVR"} (PDF)</h2>
                <div className="space-y-5">
                    <AbstractBlock title={`Driver ${isCanada ? "Abstract" : "MVR"} (PDF)`} hint={pdfHint} value={value.primary} onChange={(a) => onChange({ primary: a })} />
                    <AbstractBlock title={`Additional ${isCanada ? "Abstract" : "MVR"} (PDF)`} hint={`Optional — attach a second ${docNoun} PDF (e.g. both the CVOR and the 3-Year Driver Record).`} value={value.additional} onChange={(a) => onChange({ additional: a })} />
                    <Grid>
                        <Field label="Order / Ministry Number"><Input value={value.orderNumber} onChange={(e) => onChange({ orderNumber: e.target.value })} /></Field>
                        <Field label="Search Date & Time" hint="Date & time the abstract was pulled."><Input type="datetime-local" value={value.searchDateTime} onChange={(e) => onChange({ searchDateTime: e.target.value })} /></Field>
                        <Field label="Date Issued"><Input type="date" value={value.dateIssued} onChange={(e) => onChange({ dateIssued: e.target.value })} /></Field>
                        <Field label="Date Received"><Input type="date" value={value.dateReceived} onChange={(e) => onChange({ dateReceived: e.target.value })} /></Field>
                    </Grid>
                </div>
            </div>

            {/* Abstract number */}
            <div>
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">{isCanada ? "CVOR / Abstract Number" : "Abstract / Record Number"}</h2>
                <Grid>
                    <Field className="sm:col-span-2" label="Abstract Number"><Input placeholder="Enter number…" value={value.abstractNumber} onChange={(e) => onChange({ abstractNumber: e.target.value })} /></Field>
                    <Field label="Issue Date"><Input type="date" value={value.abstractIssueDate} onChange={(e) => onChange({ abstractIssueDate: e.target.value })} /></Field>
                    <Field label="Issuing Authority"><Input value={value.authority} disabled placeholder="From record above" /></Field>
                    {isCvor && (
                        <>
                            <Field label="Carrier Name"><Input value={value.carrierName} onChange={(e) => onChange({ carrierName: e.target.value })} /></Field>
                            <Field label="Safety Rating"><SelectBox value={value.safetyRating} placeholder="Select rating" items={SAFETY_RATINGS} onChange={(v) => onChange({ safetyRating: v })} /></Field>
                        </>
                    )}
                </Grid>
            </div>

            {/* Violations & accidents */}
            <div>
                <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Violations &amp; Accidents</h2>
                <div className="space-y-5">
                    <ToggleRow label="Any violations or convictions on record?" checked={value.hasViolations} onChange={(b) => onChange({ hasViolations: b })} />
                    {value.hasViolations && (
                        <RevealPanel title="Violations / Convictions">
                            {value.violations.map((vi, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Violation {i + 1}</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => onChange({ violations: value.violations.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                                    </div>
                                    <Grid>
                                        <Field label="Date" required><Input type="date" value={vi.date} onChange={(e) => setViol(i, { date: e.target.value })} /></Field>
                                        <Field label={pointsLabel}><Input type="number" value={vi.points} onChange={(e) => setViol(i, { points: e.target.value })} /></Field>
                                        <Field className="sm:col-span-2" label="Charge / Description" required><Input value={vi.description} onChange={(e) => setViol(i, { description: e.target.value })} /></Field>
                                        <Field label="State / Location"><SelectBox value={vi.location} placeholder="Please choose" items={auth} onChange={(val) => setViol(i, { location: val })} /></Field>
                                    </Grid>
                                </div>
                            ))}
                            <button type="button" onClick={() => onChange({ violations: [...value.violations, newViolation()] })} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Violation</button>
                        </RevealPanel>
                    )}

                    <ToggleRow label="Any accidents or collisions on record?" checked={value.hasAccidents} onChange={(b) => onChange({ hasAccidents: b })} />
                    {value.hasAccidents && (
                        <RevealPanel title="Accidents / Collisions">
                            {value.accidents.map((ac, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Accident {i + 1}</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => onChange({ accidents: value.accidents.filter((_, idx) => idx !== i) })}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                                    </div>
                                    <Grid>
                                        <Field label="Date" required><Input type="date" value={ac.date} onChange={(e) => setAcc(i, { date: e.target.value })} /></Field>
                                        <Field label="At Fault?" required><SelectBox value={ac.atFault} placeholder="Select" items={["Yes", "No"]} onChange={(val) => setAcc(i, { atFault: val })} /></Field>
                                        <Field className="sm:col-span-2" label="Description" required><Input value={ac.description} onChange={(e) => setAcc(i, { description: e.target.value })} /></Field>
                                    </Grid>
                                </div>
                            ))}
                            <button type="button" onClick={() => onChange({ accidents: [...value.accidents, newAccident()] })} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Accident</button>
                        </RevealPanel>
                    )}
                </div>
            </div>
        </div>
    );
}
