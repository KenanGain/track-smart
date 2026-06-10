import { useState } from "react";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES } from "./ApplicationSettingsPage";
import { Field, Grid, SelectBox, ToggleRow, RevealPanel, CheckRows, RadioRows, PdfUpload, SignaturePad } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

const CHECKS = [
    "SSN Trace & Address History", "National Criminal Database", "County Criminal (current)",
    "County Criminal (7-yr history)", "Statewide Criminal", "Federal Criminal", "Sex Offender Registry",
    "Global Watchlist / OFAC", "Motor Vehicle Record (MVR)",
];
const STATUSES = ["Clear — no records found", "Records found", "Pending"];
const CLASSIFICATIONS = ["Felony", "Misdemeanor", "Infraction", "Pending charge"];
const DECISIONS = ["Eligible — proceed", "Individualized review", "Pre-adverse action sent", "Adverse action — declined"];
const YEARS = ["7 years", "10 years", "Lifetime"];

type OffenseRec = { date: string; jurisdiction: string; classification: string; charge: string; caseNumber: string; disposition: string };
const newRecord = (): OffenseRec => ({ date: "", jurisdiction: "", classification: "", charge: "", caseNumber: "", disposition: "" });
type Addr = { address: string; from: string; to: string };
const newAddr = (): Addr => ({ address: "", from: "", to: "" });

export function CriminalBackgroundForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    // FCRA consent
    const [disclosure, setDisclosure] = useState(false);
    const [authorization, setAuthorization] = useState(false);
    // Applicant + identity
    const [name, setName] = useState(() => pf?.fullName ?? "");
    const [dob, setDob] = useState(() => pf?.dob ?? "");
    const [ssn, setSsn] = useState(() => pf?.ssn ?? "");
    const [idType, setIdType] = useState("Driver's License");
    const [idNumber, setIdNumber] = useState(() => pf?.licenses[0]?.number ?? "");
    const [aliases, setAliases] = useState("");
    // Address history (drives counties searched)
    const [addresses, setAddresses] = useState<Addr[]>(() => pf?.address.full ? [{ address: pf.address.full, from: "", to: "Present" }] : [newAddr()]);
    // Provider + scope
    const [provider, setProvider] = useState("");
    const [requested, setRequested] = useState("");
    const [completed, setCompleted] = useState("");
    const [checks, setChecks] = useState<string[]>([]);
    const [years, setYears] = useState("7 years");
    // Results
    const [status, setStatus] = useState("");
    const [records, setRecords] = useState<OffenseRec[]>([]);
    // Adjudication
    const [decision, setDecision] = useState("");
    const [preAdverseDate, setPreAdverseDate] = useState("");
    const [adverseDate, setAdverseDate] = useState("");
    // Report + signature
    const [pdf, setPdf] = useState("");
    const [sig, setSig] = useState("");
    const [sigDate, setSigDate] = useState("");

    const hasRecords = status === "Records found";
    const isAdverse = decision.startsWith("Pre-adverse") || decision.startsWith("Adverse");
    const toggleCheck = (s: string) => setChecks((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));
    const setRec = (i: number, patch: Partial<OffenseRec>) => setRecords((l) => l.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    const setAddr = (i: number, patch: Partial<Addr>) => setAddresses((l) => l.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

    const fillSample = () => {
        setDisclosure(true); setAuthorization(true);
        setName("Jane Doe"); setDob("1988-03-14"); setSsn("***-**-4471"); setIdType("Driver's License"); setIdNumber("D1234-5678-90"); setAliases("Jane M. Doe");
        setAddresses([{ address: "18 Maple Ridge Rd, Springfield, IL 62704", from: "2019-04", to: "Present" }, { address: "9 Birch Ln, Peoria, IL 61602", from: "2016-01", to: "2019-03" }]);
        setProvider("HireRight"); setRequested("2026-05-22"); setCompleted("2026-05-24");
        setChecks(["SSN Trace & Address History", "National Criminal Database", "County Criminal (7-yr history)", "Sex Offender Registry", "Global Watchlist / OFAC"]); setYears("7 years");
        setStatus("Clear — no records found"); setRecords([]);
        setDecision("Eligible — proceed"); setSigDate("2026-05-24");
    };

    const sections: DocSection[] = [
        { title: "FCRA Authorization", groups: [{ rows: [{ label: "Disclosure provided", value: disclosure ? "Yes" : "No" }, { label: "Applicant authorization", value: authorization ? "Yes" : "No" }] }] },
        { title: "Applicant", groups: [{ rows: [{ label: "Full Name", value: name }, { label: "Date of Birth", value: dob }, { label: "SSN / SIN", value: ssn }, { label: "ID", value: idNumber ? `${idType} · ${idNumber}` : "" }, { label: "Other names / aliases", value: aliases }] }] },
        { title: "Address History", groups: [{ rows: addresses.filter((a) => a.address).map((a, i) => ({ label: `Address ${i + 1}`, value: `${a.address} (${a.from} – ${a.to})` })) }] },
        { title: "Search Scope", groups: [{ rows: [{ label: "Provider / Agency", value: provider }, { label: "Date Requested", value: requested }, { label: "Date Completed", value: completed }, { label: "Checks performed", value: checks.length ? checks.join(", ") : "—" }, { label: "Years Covered", value: years }] }] },
        { title: "Results", groups: [{ rows: [{ label: "Status", value: status }, { label: "Report Document", value: pdf ? "Attached" : "Not attached" }] }, ...(hasRecords && records.length ? records.map((r, i) => ({ label: `Record ${i + 1}`, rows: [{ label: "Date", value: r.date }, { label: "Jurisdiction", value: r.jurisdiction }, { label: "Classification", value: r.classification }, { label: "Charge", value: r.charge }, { label: "Case #", value: r.caseNumber }, { label: "Disposition", value: r.disposition }] })) : [])] },
        { title: "Adjudication", groups: [{ rows: [{ label: "Decision", value: decision }, ...(isAdverse ? [{ label: "Pre-adverse notice", value: preAdverseDate }, { label: "Adverse action", value: adverseDate }] : []), { label: "Date Signed", value: sigDate }], images: sig ? [sig] : undefined }] },
    ];

    return (
        <FormScaffold
            title="Criminal Background Check" Icon={ShieldAlert} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="Criminal Background Check" docSubtitle={status || undefined} badge={decision ? decision.split(" — ")[0] : undefined} sections={sections} branding={branding} fileName="criminal-background-check.pdf"
            intro={<>FCRA-compliant criminal background check. Provide the disclosure &amp; authorization, capture address history (drives the counties searched), record the checks performed and results, then adjudicate the decision.</>}
        >
            <div>
                <SectionTitle>FCRA Disclosure &amp; Authorization</SectionTitle>
                <div className="space-y-3">
                    <ToggleRow label="A clear & conspicuous FCRA disclosure was provided to the applicant in a standalone document." checked={disclosure} onChange={setDisclosure} />
                    <ToggleRow label="The applicant signed written authorization to obtain a consumer report (background check)." checked={authorization} onChange={setAuthorization} />
                </div>
            </div>

            <div>
                <SectionTitle>Applicant &amp; Identity</SectionTitle>
                <div className="space-y-5">
                    <Field label="Full Name" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
                    <Grid>
                        <Field label="Date of Birth"><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
                        <Field label="SSN / SIN"><Input value={ssn} onChange={(e) => setSsn(e.target.value)} /></Field>
                        <Field label="ID Type"><SelectBox value={idType} items={["Driver's License", "Passport", "State ID", "Permanent Resident Card"]} onChange={setIdType} /></Field>
                        <Field label="ID Number"><Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} /></Field>
                    </Grid>
                    <Field label="Other names / aliases" hint="Comma-separated, if any."><Input value={aliases} onChange={(e) => setAliases(e.target.value)} /></Field>
                </div>
            </div>

            <div>
                <SectionTitle>Address History</SectionTitle>
                <p className="mb-4 text-sm text-slate-500">Counties searched are derived from where the applicant has lived.</p>
                <div className="space-y-4">
                    {addresses.map((a, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">Address {i + 1}</span>
                                {addresses.length > 1 && <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setAddresses((l) => l.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>}
                            </div>
                            <div className="space-y-4">
                                <Field label="Address"><Input value={a.address} onChange={(e) => setAddr(i, { address: e.target.value })} /></Field>
                                <Grid>
                                    <Field label="From"><Input value={a.from} onChange={(e) => setAddr(i, { from: e.target.value })} placeholder="MM-YYYY" /></Field>
                                    <Field label="To"><Input value={a.to} onChange={(e) => setAddr(i, { to: e.target.value })} placeholder="MM-YYYY / Present" /></Field>
                                </Grid>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => setAddresses((l) => [...l, newAddr()])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Address</button>
                </div>
            </div>

            <div>
                <SectionTitle>Search Scope</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Provider / Agency (CRA)"><Input value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>
                        <Field label="Years Covered"><SelectBox value={years} items={YEARS} onChange={setYears} /></Field>
                        <Field label="Date Requested"><Input type="date" value={requested} onChange={(e) => setRequested(e.target.value)} /></Field>
                        <Field label="Date Completed"><Input type="date" value={completed} onChange={(e) => setCompleted(e.target.value)} /></Field>
                    </Grid>
                    <Field label="Checks Performed"><CheckRows items={CHECKS} selected={checks} onToggle={toggleCheck} cols={2} /></Field>
                </div>
            </div>

            <div>
                <SectionTitle>Results</SectionTitle>
                <div className="space-y-5">
                    <Field label="Status" required><RadioRows items={STATUSES} value={status} onChange={setStatus} /></Field>
                    {hasRecords && (
                        <RevealPanel title="Records Found">
                            {records.map((r, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Record {i + 1}</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setRecords((l) => l.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                                    </div>
                                    <div className="space-y-4">
                                        <Grid>
                                            <Field label="Date"><Input type="date" value={r.date} onChange={(e) => setRec(i, { date: e.target.value })} /></Field>
                                            <Field label="Jurisdiction"><SelectBox value={r.jurisdiction} placeholder="State / Province" items={STATES_PROVINCES} onChange={(val) => setRec(i, { jurisdiction: val })} /></Field>
                                            <Field label="Classification"><SelectBox value={r.classification} placeholder="Select" items={CLASSIFICATIONS} onChange={(val) => setRec(i, { classification: val })} /></Field>
                                            <Field label="Case Number"><Input value={r.caseNumber} onChange={(e) => setRec(i, { caseNumber: e.target.value })} /></Field>
                                        </Grid>
                                        <Field label="Charge / Offense"><Input value={r.charge} onChange={(e) => setRec(i, { charge: e.target.value })} /></Field>
                                        <Field label="Disposition"><Input value={r.disposition} onChange={(e) => setRec(i, { disposition: e.target.value })} placeholder="e.g. Convicted / Dismissed / Nolle prosequi" /></Field>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={() => setRecords((l) => [...l, newRecord()])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Record</button>
                        </RevealPanel>
                    )}
                    <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Report Document</p>
                        <PdfUpload value={pdf} onChange={setPdf} />
                    </div>
                </div>
            </div>

            <div>
                <SectionTitle>Adjudication &amp; Signature</SectionTitle>
                <div className="space-y-5">
                    <Field label="Decision" required><RadioRows items={DECISIONS} value={decision} onChange={setDecision} cols={2} /></Field>
                    {isAdverse && (
                        <RevealPanel title="Adverse Action (FCRA two-step)">
                            <Grid>
                                <Field label="Pre-adverse notice sent"><Input type="date" value={preAdverseDate} onChange={(e) => setPreAdverseDate(e.target.value)} /></Field>
                                <Field label="Adverse action notice sent"><Input type="date" value={adverseDate} onChange={(e) => setAdverseDate(e.target.value)} /></Field>
                            </Grid>
                        </RevealPanel>
                    )}
                    <SignaturePad label="Adjudicator’s Signature" onChange={setSig} />
                    <Field className="max-w-xs" label="Date Signed"><Input type="date" value={sigDate} onChange={(e) => setSigDate(e.target.value)} /></Field>
                </div>
            </div>
        </FormScaffold>
    );
}
