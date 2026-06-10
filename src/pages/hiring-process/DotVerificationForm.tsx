import { useState } from "react";
import { Plus, Trash2, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES } from "./ApplicationSettingsPage";
import { Field, Grid, SelectBox, YesNoField, ToggleRow, RevealPanel, FilesUpload, SignaturePad } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

const YESNONA = ["Yes", "No", "N/A"];

type Accident = { date: string; state: string; description: string; fatal: string };
const newAccident = (): Accident => ({ date: "", state: "", description: "", fatal: "" });

export function DotVerificationForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const pfEmp = pf?.employment[0];
    // Applicant
    const [driver, setDriver] = useState(() => pf?.fullName ?? "");
    const [dob, setDob] = useState(() => pf?.dob ?? "");
    const [cdl, setCdl] = useState(() => pf?.licenses[0]?.number ?? "");
    const [appDate, setAppDate] = useState("");
    // Verification request & method
    const [method, setMethod] = useState("Email");
    const [sentDate, setSentDate] = useState("");
    const [attempt2, setAttempt2] = useState("");
    const [attempt3, setAttempt3] = useState("");
    const [responseDate, setResponseDate] = useState("");
    // Previous DOT employer
    const [employer, setEmployer] = useState(() => pfEmp?.employer ?? "");
    const [dotNumber, setDotNumber] = useState("");
    const [contact, setContact] = useState("");
    const [phone, setPhone] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [safetySensitive, setSafetySensitive] = useState("");
    // §40.25 drug & alcohol history (3 yrs prior)
    const [alcohol04, setAlcohol04] = useState("");
    const [verifiedPositive, setVerifiedPositive] = useState("");
    const [refusals, setRefusals] = useState("");
    const [otherViolations, setOtherViolations] = useState("");
    const [completedRTD, setCompletedRTD] = useState("");
    // §391.23 accidents
    const [hasAccidents, setHasAccidents] = useState(false);
    const [accidents, setAccidents] = useState<Accident[]>([]);
    // Response
    const [files, setFiles] = useState<string[]>([]);
    // Verified by
    const [verName, setVerName] = useState("");
    const [verTitle, setVerTitle] = useState("");
    const [sig, setSig] = useState("");
    const [sigDate, setSigDate] = useState("");

    const setAcc = (i: number, patch: Partial<Accident>) => setAccidents((l) => l.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

    const fillSample = () => {
        setDriver("Jane Doe"); setDob("1988-03-14"); setCdl("D1234-5678-90"); setAppDate("2026-05-15");
        setMethod("Email"); setSentDate("2026-05-16"); setAttempt2("2026-05-21"); setAttempt3(""); setResponseDate("2026-06-02");
        setEmployer("Roadrunner Freight"); setDotNumber("US DOT 1234567"); setContact("Robert King"); setPhone("(312) 555-0190"); setFrom("2021-01"); setTo("2024-03"); setSafetySensitive("Yes");
        setAlcohol04("No"); setVerifiedPositive("No"); setRefusals("No"); setOtherViolations("No"); setCompletedRTD("N/A");
        setHasAccidents(true); setAccidents([{ date: "2023-06-18", state: "Illinois", description: "Rear-end, non-preventable", fatal: "None" }]);
        setVerName("Robert King"); setVerTitle("Safety Manager"); setSigDate("2026-06-02");
    };

    const sections: DocSection[] = [
        { title: "Applicant", groups: [{ rows: [{ label: "Driver", value: driver }, { label: "Date of Birth", value: dob }, { label: "CDL Number", value: cdl }, { label: "Application Date", value: appDate }] }] },
        { title: "Verification Request", groups: [{ rows: [{ label: "Method", value: method }, { label: "Sent", value: sentDate }, { label: "2nd attempt", value: attempt2 }, { label: "3rd attempt", value: attempt3 }, { label: "Response received", value: responseDate }] }] },
        { title: "Previous DOT Employer", groups: [{ rows: [{ label: "Employer", value: employer }, { label: "US DOT Number", value: dotNumber }, { label: "Contact", value: contact }, { label: "Telephone", value: phone }, { label: "Employment Dates", value: `${from} – ${to}` }, { label: "Safety-sensitive function", value: safetySensitive }] }] },
        { title: "DOT Drug & Alcohol History (§40.25 — 3 yrs prior)", groups: [{ rows: [
            { label: "Alcohol test ≥ 0.04", value: alcohol04 },
            { label: "Verified positive drug test", value: verifiedPositive },
            { label: "Refused to test", value: refusals },
            { label: "Other §40 violations", value: otherViolations },
            { label: "Completed return-to-duty process", value: completedRTD },
        ] }] },
        ...(hasAccidents && accidents.length ? [{ title: "Accidents (§391.23)", groups: accidents.map((a, i) => ({ label: accidents.length > 1 ? `Accident ${i + 1}` : undefined, rows: [{ label: "Date", value: a.date }, { label: "State / Province", value: a.state }, { label: "Fatality / Injury", value: a.fatal }, { label: "Description", value: a.description }] })) }] : []),
        { title: "Verified By", groups: [{ rows: [{ label: "Name", value: verName }, { label: "Title", value: verTitle }, { label: "Date Signed", value: sigDate }, { label: "Completed response", value: files.length ? `${files.length} file(s) attached` : "Not attached" }], images: sig ? [sig] : undefined }] },
    ];

    return (
        <FormScaffold
            title="DOT / Employment Verification" Icon={BadgeCheck} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="DOT / Employment Verification" docSubtitle="§40.25 Drug & Alcohol History · §391.23 Safety History" sections={sections} branding={branding} fileName="dot-employment-verification.pdf"
            intro={<>Sent to a previous <span className="font-medium text-slate-700">DOT-regulated</span> employer to verify employment and obtain the driver’s DOT drug &amp; alcohol testing history (§40.25) and safety/accident history (§391.23).</>}
        >
            <div>
                <SectionTitle>Applicant</SectionTitle>
                <Grid>
                    <Field label="Driver Name" required><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
                    <Field label="Date of Birth"><Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
                    <Field label="CDL Number"><Input value={cdl} onChange={(e) => setCdl(e.target.value)} /></Field>
                    <Field label="Application Date" hint="Reference point for the 3-year lookback."><Input type="date" value={appDate} onChange={(e) => setAppDate(e.target.value)} /></Field>
                </Grid>
            </div>

            <div>
                <SectionTitle>Verification Request &amp; Follow-Up</SectionTitle>
                <p className="mb-4 text-sm text-slate-500">Sent to the previous DOT employer — up to three attempts are tracked before escalation.</p>
                <Grid>
                    <Field label="Method"><SelectBox value={method} items={["Email", "Fax", "Mail", "Phone"]} onChange={setMethod} /></Field>
                    <Field label="Date Sent"><Input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></Field>
                    <Field label="2nd Attempt"><Input type="date" value={attempt2} onChange={(e) => setAttempt2(e.target.value)} /></Field>
                    <Field label="3rd Attempt"><Input type="date" value={attempt3} onChange={(e) => setAttempt3(e.target.value)} /></Field>
                    <Field label="Response Received"><Input type="date" value={responseDate} onChange={(e) => setResponseDate(e.target.value)} /></Field>
                </Grid>
            </div>

            <div>
                <SectionTitle>Previous DOT Employer</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Employer" required><Input value={employer} onChange={(e) => setEmployer(e.target.value)} /></Field>
                        <Field label="US DOT Number"><Input value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} /></Field>
                        <Field label="Contact"><Input value={contact} onChange={(e) => setContact(e.target.value)} /></Field>
                        <Field label="Telephone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
                        <Field label="Employed From"><Input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="MM-YYYY" /></Field>
                        <Field label="Employed To"><Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="MM-YYYY" /></Field>
                    </Grid>
                    <YesNoField label="Did the driver perform safety-sensitive functions?" value={safetySensitive} onChange={setSafetySensitive} />
                </div>
            </div>

            <div>
                <SectionTitle>DOT Drug &amp; Alcohol Testing History (§40.25)</SectionTitle>
                <p className="mb-4 text-sm text-slate-500">In the 3 years prior to the application date:</p>
                <div className="space-y-4">
                    <YesNoField label="Alcohol test result of 0.04 or higher?" value={alcohol04} onChange={setAlcohol04} />
                    <YesNoField label="Verified positive controlled-substance test?" value={verifiedPositive} onChange={setVerifiedPositive} />
                    <YesNoField label="Refused to be tested?" value={refusals} onChange={setRefusals} />
                    <YesNoField label="Any other §40 drug & alcohol violation?" value={otherViolations} onChange={setOtherViolations} />
                    <YesNoField label="Completed the return-to-duty process (if applicable)?" value={completedRTD} onChange={setCompletedRTD} options={YESNONA} />
                </div>
            </div>

            <div>
                <SectionTitle>Accidents (§391.23)</SectionTitle>
                <div className="space-y-5">
                    <ToggleRow label="Any DOT-recordable accidents in the last 3 years?" checked={hasAccidents} onChange={setHasAccidents} />
                    {hasAccidents && (
                        <RevealPanel title="Accidents">
                            {accidents.map((a, i) => (
                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-sm font-semibold text-slate-700">Accident {i + 1}</span>
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setAccidents((l) => l.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                                    </div>
                                    <Grid>
                                        <Field label="Date"><Input type="date" value={a.date} onChange={(e) => setAcc(i, { date: e.target.value })} /></Field>
                                        <Field label="State / Province"><SelectBox value={a.state} placeholder="Please choose" items={STATES_PROVINCES} onChange={(val) => setAcc(i, { state: val })} /></Field>
                                        <Field label="Fatality / Injury"><SelectBox value={a.fatal} placeholder="Select" items={["None", "Injury", "Fatality"]} onChange={(val) => setAcc(i, { fatal: val })} /></Field>
                                        <Field label="Description"><Input value={a.description} onChange={(e) => setAcc(i, { description: e.target.value })} /></Field>
                                    </Grid>
                                </div>
                            ))}
                            <button type="button" onClick={() => setAccidents((l) => [...l, newAccident()])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Accident</button>
                        </RevealPanel>
                    )}
                </div>
            </div>

            <div>
                <SectionTitle>Verified By</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Name"><Input value={verName} onChange={(e) => setVerName(e.target.value)} /></Field>
                        <Field label="Title"><Input value={verTitle} onChange={(e) => setVerTitle(e.target.value)} /></Field>
                    </Grid>
                    <SignaturePad label="Verifier’s Signature" onChange={setSig} />
                    <Field className="max-w-xs" label="Date Signed"><Input type="date" value={sigDate} onChange={(e) => setSigDate(e.target.value)} /></Field>
                    <div className="rounded-xl border border-slate-200 p-5">
                        <h3 className="mb-3 text-sm font-semibold text-slate-800">Completed employer response</h3>
                        <FilesUpload value={files} onChange={setFiles} />
                        <p className="mt-2 text-xs text-slate-400">Attach the completed, signed DOT verification response.</p>
                    </div>
                </div>
            </div>
        </FormScaffold>
    );
}
