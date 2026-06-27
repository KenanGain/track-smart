import { useRef, useState } from "react";
import { ShieldCheck, Plus, Trash2, Pencil, Check, CarFront, Gavel } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCompanyBranding } from "../ats/company-branding.data";
import {
    Field, Grid, SelectBox, YesNo, MonthYear, CheckRows, CheckLine,
    CompletedByCertification, newCompletedBy, formatAddress, type CompletedBy,
} from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill, primaryLicense } from "./application-prefill";
import type { DocSection } from "./FormDocument";

/**
 * Safety & Performance History — the consolidated previous-employer safety reference.
 * Header (reference / verification status), previous-employer details, the driver's
 * employment summary, driving-experience regions, equipment operated, a U/S/G/E
 * performance evaluation, plus repeatable INCIDENTS (accidents) and VIOLATIONS the
 * previous employer adds. Completed by the previous employer / reviewed internally.
 */

const STATUSES = ["Pending", "Sent", "Responded", "Verified"];
const EMPLOYMENT_TYPES = ["Full Time", "Part Time", "Casual", "Owner Operator", "Seasonal"];
const REHIRE = ["Yes", "No", "Upon Review"];
const REASONS_LEAVING = ["Resignation", "Discharged", "Lay Off", "Contract Ended", "Better Opportunity", "Retired", "Other"];
const EQUIPMENT = ["Tractor Semi Trailer", "Straight Truck", "Cargo Tank", "Doubles / Triples", "Flatbed", "Reefer", "Dump Truck", "Bus", "Other"];
const DRIVING_EXPERIENCE = ["Canada", "Canada Only", "Local", "Local Only", "Mountain", "USA Central", "USA Eastern", "USA Midwest", "USA Northern", "USA Only", "USA Southern", "USA Western"];

const EVAL_LEFT = ["Takes Care of Assigned Equipment", "Aptitude", "Time Loss", "Logbook", "Client Courtesy", "Follows Instructions", "Equipment Cleanliness"];
const EVAL_RIGHT = ["Attitude", "Compliance", "Reliability", "Dependability", "Communication", "Equipment Handling", "Conflicts (Resolution/Handling)"];
const EVAL_CRITERIA = [...EVAL_LEFT, ...EVAL_RIGHT];

const INCIDENT_TYPES = ["Property Damage Only", "Injury", "Fatality", "Rollover", "Jackknife", "Rear-End Collision", "Cargo Spill", "Other"];
const VIOLATION_CATEGORIES = ["Speeding", "Moving Violation", "Equipment / Defect", "Logbook / Hours of Service", "Licensing", "Size & Weight", "Other"];
const CHARGES = ["Speeding", "Improper Lane Change", "Failure to Yield", "Following Too Closely", "Running Red Light / Stop Sign", "Distracted Driving", "Improper Turn", "Failure to Obey Traffic Control", "Other"];
const PENALTIES = ["Fine", "Suspension", "Revocation", "Community Service", "Other"];
const FINE_RANGES = ["Under $100", "$100 – $250", "$250 – $500", "$500 – $1,000", "Over $1,000"];
const REGIONS = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan",
    "California", "Florida", "Illinois", "Indiana", "Michigan", "New York", "Ohio", "Pennsylvania", "Texas", "Washington", "Other",
];
const COUNTRIES = ["Canada", "United States"];

const RATING_OPTS = [
    { k: "U", name: "Unsatisfactory", on: "bg-rose-500" },
    { k: "S", name: "Satisfactory", on: "bg-amber-500" },
    { k: "G", name: "Good", on: "bg-blue-500" },
    { k: "E", name: "Excellent", on: "bg-emerald-500" },
];
const RATING_NAME: Record<string, string> = Object.fromEntries(RATING_OPTS.map((o) => [o.k, o.name]));

type Incident = { id: number; date: string; type: string; location: string; city: string; region: string; commercial: string; atFault: string; ticketed: string; towed: string; hazmat: string; chemicalSpill: string; fatalities: string; injuries: string; details: string };
type Violation = { id: number; date: string; region: string; category: string; oos: string; charges: string[]; commercial: string; demerits: string; penalties: string[]; fineAmount: string; comments: string };

const toggleArr = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const mY = (v: string) => { const [y = "", m = ""] = (v || "").split("-"); return m && y ? `${m}/${y}` : ""; };

/** A label + four U/S/G/E rating buttons (colour-coded). */
function RatingRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{label}</span>
            <div className="flex shrink-0 gap-1">
                {RATING_OPTS.map((o) => {
                    const sel = value === o.k;
                    return (
                        <button key={o.k} type="button" title={o.name} onClick={() => onChange(sel ? "" : o.k)}
                            className={cn("flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold transition", sel ? `${o.on} text-white shadow-sm` : "border border-slate-200 bg-white text-slate-400 hover:border-slate-300")}>
                            {o.k}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Multi-select chips ("select all that apply"). */
function Chips({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((it) => {
                const on = selected.includes(it);
                return (
                    <button key={it} type="button" onClick={() => onToggle(it)}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                            on ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
                        {on && <Check className="h-3.5 w-3.5" />}{it}
                    </button>
                );
            })}
        </div>
    );
}

const Summary = ({ label, value }: { label: string; value: string }) => (
    <span className="text-xs text-slate-600"><span className="text-slate-400">{label}: </span><span className="font-medium text-slate-700">{value || "—"}</span></span>
);

export function SafetyPerformanceHistoryForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const idRef = useRef(1);

    // Header / verification
    const [referenceNo, setReferenceNo] = useState("");
    const [status, setStatus] = useState("");
    const [dadProcessed, setDadProcessed] = useState("");
    const [dadRequestNo, setDadRequestNo] = useState("");

    // Previous employer
    const [employer, setEmployer] = useState("");
    const [attention, setAttention] = useState("");
    const [contactTitle, setContactTitle] = useState("");
    const [phone, setPhone] = useState("");
    const [fax, setFax] = useState("");
    const [email, setEmail] = useState("");
    const [address1, setAddress1] = useState("");
    const [address2, setAddress2] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [city, setCity] = useState("");
    const [province, setProvince] = useState("");
    const [country, setCountry] = useState("Canada");

    // Driver employment
    const [applicantName, setApplicantName] = useState(pf?.fullName ?? "");
    const [wasEmployed, setWasEmployed] = useState("");
    const [licence, setLicence] = useState(primaryLicense(pf)?.number ?? "");
    const [approxMiles, setApproxMiles] = useState("");
    const [workStart, setWorkStart] = useState("");
    const [workEnd, setWorkEnd] = useState("");
    const [yearsExp, setYearsExp] = useState("");
    const [positionDesc, setPositionDesc] = useState("");
    const [employmentType, setEmploymentType] = useState("");
    const [rehire, setRehire] = useState("");
    const [reasonLeaving, setReasonLeaving] = useState("");
    const [reasonOther, setReasonOther] = useState("");

    // Experience / equipment / evaluation
    const [experience, setExperience] = useState<string[]>([]);
    const [equipment, setEquipment] = useState("");
    const [evaluation, setEvaluation] = useState<Record<string, string>>({});

    // Repeatable incidents & violations
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [editing, setEditing] = useState<number[]>([]);
    const [remarks, setRemarks] = useState("");
    const [completed, setCompleted] = useState<CompletedBy>(newCompletedBy());

    const isEditing = (id: number) => editing.includes(id);
    const startEdit = (id: number) => setEditing((p) => [...p, id]);
    const stopEdit = (id: number) => setEditing((p) => p.filter((x) => x !== id));

    const setEval = (k: string, v: string) => setEvaluation((e) => ({ ...e, [k]: v }));

    const setInc = (id: number, patch: Partial<Incident>) => setIncidents((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const addInc = () => { const it: Incident = { id: idRef.current++, date: "", type: "", location: "", city: "", region: "", commercial: "", atFault: "", ticketed: "", towed: "", hazmat: "", chemicalSpill: "", fatalities: "0", injuries: "0", details: "" }; setIncidents((p) => [...p, it]); startEdit(it.id); };
    const removeInc = (id: number) => { setIncidents((p) => p.filter((a) => a.id !== id)); stopEdit(id); };

    const setVio = (id: number, patch: Partial<Violation>) => setViolations((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const addVio = () => { const v: Violation = { id: idRef.current++, date: "", region: "", category: "", oos: "", charges: [], commercial: "", demerits: "", penalties: [], fineAmount: "", comments: "" }; setViolations((p) => [...p, v]); startEdit(v.id); };
    const removeVio = (id: number) => { setViolations((p) => p.filter((a) => a.id !== id)); stopEdit(id); };

    const reasonLabel = reasonLeaving === "Other" && reasonOther ? `Other — ${reasonOther}` : reasonLeaving;

    const fillSample = () => {
        setReferenceNo("10893"); setStatus("Verified"); setDadProcessed("No"); setDadRequestNo("");
        setEmployer("Emterra Environmental"); setAttention("Zo T."); setContactTitle("Safety Coordinator");
        setPhone("778 401 4431"); setFax(""); setEmail("safety@emterra.example");
        setAddress1("411 Glendale Ave"); setAddress2(""); setPostalCode("L2P 3Y1"); setCity("St Catharines"); setProvince("Ontario"); setCountry("Canada");
        setApplicantName(pf?.fullName ?? "Amarjeet Rozra"); setWasEmployed("Yes"); setLicence(primaryLicense(pf)?.number ?? "R69340370011019");
        setApproxMiles("120,000"); setWorkStart("2021-02"); setWorkEnd("2024-01"); setYearsExp("3.00"); setPositionDesc("AZ Driver");
        setEmploymentType("Full Time"); setRehire("Upon Review"); setReasonLeaving("Other"); setReasonOther("Relocated");
        setExperience(["Canada", "Local", "USA Eastern"]); setEquipment("Tractor Semi Trailer");
        setEvaluation(Object.fromEntries(EVAL_CRITERIA.map((c, i) => [c, ["G", "E", "S", "G", "E", "G", "S"][i % 7]])));
        setIncidents([{ id: idRef.current++, date: "2023-06", type: "Property Damage Only", location: "I-80 near mile 210", city: "Des Moines", region: "Other", commercial: "Yes", atFault: "No", ticketed: "No", towed: "No", hazmat: "No", chemicalSpill: "No", fatalities: "0", injuries: "0", details: "Minor backing incident in yard; no injuries." }]);
        setViolations([{ id: idRef.current++, date: "2022-11", region: "Ontario", category: "Speeding", oos: "No", charges: ["Speeding"], commercial: "Yes", demerits: "3", penalties: ["Fine"], fineAmount: "$100 – $250", comments: "" }]);
        setEditing([]);
        setRemarks("Driver maintained a good safety record during employment.");
        setCompleted((c) => ({ ...c, company: "Emterra Environmental", telephone: "778 401 4431", address: { street: "411 Glendale Ave", city: "St Catharines", state: "Ontario", zip: "L2P 3Y1", country: "Canada" } }));
    };

    const addrOk = !!completed.address.street && !!completed.address.city && !!completed.address.state;
    const ratedCount = EVAL_CRITERIA.filter((c) => evaluation[c]).length;
    const checks = [
        { label: "Previous employer recorded", ok: !!employer },
        { label: "Driver employment confirmed", ok: !!wasEmployed },
        { label: "Employment dates recorded", ok: !!workStart && !!workEnd },
        { label: "Reason for leaving & rehire recorded", ok: !!reasonLeaving && !!rehire },
        { label: "Performance evaluation completed", ok: ratedCount === EVAL_CRITERIA.length },
        { label: "Incidents & violations reviewed", ok: editing.length === 0 },
        { label: "Company & address recorded", ok: !!completed.company && addrOk },
        { label: embedded ? "Certified & signed" : "Reviewer sign-off completed", ok: completed.done },
    ];

    const sections: DocSection[] = [
        { title: "Safety & Performance History", groups: [{ rows: [
            { label: "Reference #", value: referenceNo }, { label: "Status of the Verification", value: status },
            { label: "D.A.D Processed", value: dadProcessed }, { label: "D.A.D Request #", value: dadRequestNo },
        ] }] },
        { title: "Previous Employer Information", groups: [{ rows: [
            { label: "Employer / Contractor", value: employer }, { label: "Attention", value: attention }, { label: "Contact Title", value: contactTitle },
            { label: "Phone", value: phone }, { label: "Fax", value: fax }, { label: "Email", value: email },
            { label: "Address 1", value: address1 }, { label: "Address 2", value: address2 },
            { label: "Postal Code", value: postalCode }, { label: "City", value: city }, { label: "Province", value: province }, { label: "Country", value: country },
        ] }] },
        { title: "Driver Information", groups: [{ rows: [
            { label: "Applicant Name", value: applicantName }, { label: "Was employed here?", value: wasEmployed },
            { label: "Driver's Licence", value: licence }, { label: "Approximate Number of Miles", value: approxMiles },
            { label: "Work Start Date", value: mY(workStart) }, { label: "Work End Date", value: mY(workEnd) }, { label: "Years Of Experience", value: yearsExp },
            { label: "Position Description", value: positionDesc }, { label: "The employment was", value: employmentType },
            { label: "Would You Rehire?", value: rehire }, { label: "Reason For Leaving", value: reasonLabel },
        ] }] },
        { title: "Driving Experience", groups: [{ rows: [{ label: "Regions", value: experience.join(", ") || "—" }] }] },
        { title: "Equipment Operated", groups: [{ rows: [{ label: "Equipment Operated Most", value: equipment }] }] },
        { title: "Evaluation (U / S / G / E)", groups: [{ rows: EVAL_CRITERIA.map((c) => ({ label: c, value: evaluation[c] ? RATING_NAME[evaluation[c]] : "—" })) }] },
        { title: "Incidents", groups: incidents.length ? [{ table: {
            headers: ["#", "Date", "Type", "Location", "At Fault", "Ticketed", "Injuries", "Fatalities"],
            rows: incidents.map((a, i) => [String(i + 1), mY(a.date), a.type, [a.location, a.city, a.region].filter(Boolean).join(", "), a.atFault, a.ticketed, a.injuries || "0", a.fatalities || "0"]),
        } }] : [{ rows: [{ label: "Incidents", value: "None reported" }] }] },
        { title: "Violations", groups: violations.length ? [{ table: {
            headers: ["#", "Date", "Region", "Category", "Charges", "OOS", "Demerits", "Penalty"],
            rows: violations.map((v, i) => [String(i + 1), mY(v.date), v.region, v.category, v.charges.join(", "), v.oos, v.demerits || "—", v.penalties.join(", ")]),
        } }] : [{ rows: [{ label: "Violations", value: "None reported" }] }] },
        ...(remarks ? [{ title: "Remarks", groups: [{ rows: [{ label: "Remarks", value: remarks }] }] }] : []),
        { title: "Completed By", groups: [{ rows: [
            { label: "Company", value: completed.company }, { label: "Address", value: formatAddress(completed.address) }, { label: "Telephone", value: completed.telephone },
        ] }] },
        { title: embedded ? "Certification" : "Reviewer Sign-Off", groups: [completed.done
            ? { rows: [{ label: embedded ? "Completed by" : "Reviewed by", value: completed.name }, { label: "Title", value: completed.role }, { label: "Date", value: completed.date }, { label: "Status", value: embedded ? "Completed & signed" : "Reviewed & signed" }], images: completed.sig ? [completed.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending — not yet signed" }] }] },
    ];

    const reviewChecklist = (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review Checklist</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{checks.map((c, i) => <CheckLine key={i} ok={c.ok} label={c.label} />)}</ul>
        </div>
    );

    return (
        <FormScaffold
            title="Safety & Performance History" Icon={ShieldCheck} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview} sheet
            docTitle="Safety and Performance History" docSubtitle={applicantName || pf?.fullName || undefined} sections={sections} branding={branding} fileName="safety-performance-history.pdf"
            intro={<>Consolidated previous-employer safety reference. Confirm the employer &amp; employment details, rate the driver's performance, then add any <span className="font-semibold">incidents</span> and <span className="font-semibold">violations</span> on file. Completed by the previous employer and reviewed internally.</>}
        >
            {/* Header / verification */}
            <div>
                <SectionTitle>Safety &amp; Performance History</SectionTitle>
                <Grid>
                    <Field label="Reference #"><Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="e.g. 10893" /></Field>
                    <Field label="Status of the Verification"><SelectBox value={status} onChange={setStatus} items={STATUSES} placeholder="Choose status" /></Field>
                    <Field label="D.A.D Processed"><YesNo value={dadProcessed} onChange={setDadProcessed} /></Field>
                    <Field label="D.A.D Request #"><Input value={dadRequestNo} onChange={(e) => setDadRequestNo(e.target.value)} placeholder="Request number" /></Field>
                </Grid>
            </div>

            {/* Previous employer */}
            <div>
                <SectionTitle>Previous Employer Information</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Employer / Contractor" required><Input value={employer} onChange={(e) => setEmployer(e.target.value)} placeholder="Company name" /></Field>
                        <Field label="Attention"><Input value={attention} onChange={(e) => setAttention(e.target.value)} placeholder="Contact name" /></Field>
                        <Field label="Contact Title"><Input value={contactTitle} onChange={(e) => setContactTitle(e.target.value)} placeholder="e.g. Safety Coordinator" /></Field>
                        <Field label="Phone"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 000-0000" /></Field>
                        <Field label="Fax"><Input value={fax} onChange={(e) => setFax(e.target.value)} placeholder="Fax number" /></Field>
                        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" /></Field>
                        <Field label="Address 1"><Input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Street address" /></Field>
                        <Field label="Address 2"><Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Suite / unit (optional)" /></Field>
                        <Field label="Postal Code"><Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="A1A 1A1" /></Field>
                        <Field label="City"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" /></Field>
                        <Field label="Province / State"><SelectBox value={province} onChange={setProvince} items={REGIONS} placeholder="Choose region" /></Field>
                        <Field label="Country"><SelectBox value={country} onChange={setCountry} items={COUNTRIES} placeholder="Choose country" /></Field>
                    </Grid>
                </div>
            </div>

            {/* Driver information */}
            <div>
                <SectionTitle>Driver Information</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Applicant Name" required><Input value={applicantName} onChange={(e) => setApplicantName(e.target.value)} placeholder="Driver name" /></Field>
                        <Field label="Was employed here?" required><YesNo value={wasEmployed} onChange={setWasEmployed} /></Field>
                        <Field label="Driver's Licence"><Input value={licence} onChange={(e) => setLicence(e.target.value)} placeholder="Licence number" /></Field>
                        <Field label="Approximate Number of Miles"><Input value={approxMiles} onChange={(e) => setApproxMiles(e.target.value)} placeholder="e.g. 120,000" /></Field>
                        <Field label="Work Start Date"><MonthYear value={workStart} onChange={setWorkStart} /></Field>
                        <Field label="Work End Date"><MonthYear value={workEnd} onChange={setWorkEnd} /></Field>
                        <Field label="Years Of Experience"><Input value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} placeholder="e.g. 3.00" /></Field>
                        <Field label="Position Description"><Input value={positionDesc} onChange={(e) => setPositionDesc(e.target.value)} placeholder="e.g. AZ Driver" /></Field>
                        <Field label="The employment was"><SelectBox value={employmentType} onChange={setEmploymentType} items={EMPLOYMENT_TYPES} placeholder="Choose type" /></Field>
                        <Field label="Would You Rehire?"><SelectBox value={rehire} onChange={setRehire} items={REHIRE} placeholder="Choose" /></Field>
                        <Field label="Reason For Leaving"><SelectBox value={reasonLeaving} onChange={setReasonLeaving} items={REASONS_LEAVING} placeholder="Choose reason" /></Field>
                        {reasonLeaving === "Other" && <Field label="Reason — specify"><Input value={reasonOther} onChange={(e) => setReasonOther(e.target.value)} placeholder="Specify reason" /></Field>}
                    </Grid>
                </div>
            </div>

            {/* Driving experience */}
            <div>
                <SectionTitle>Driving Experience</SectionTitle>
                <p className="mb-3 text-xs text-slate-500">Select all the regions the driver has experience in.</p>
                <CheckRows items={DRIVING_EXPERIENCE} selected={experience} onToggle={(v) => setExperience((a) => toggleArr(a, v))} cols={2} />
            </div>

            {/* Equipment operated */}
            <div>
                <SectionTitle>Equipment Operated</SectionTitle>
                <Field label="Equipment Operated Most"><SelectBox value={equipment} onChange={setEquipment} items={EQUIPMENT} placeholder="Choose equipment" /></Field>
            </div>

            {/* Evaluation */}
            <div>
                <SectionTitle>Evaluation</SectionTitle>
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                    {RATING_OPTS.map((o) => (
                        <span key={o.k} className="inline-flex items-center gap-1.5"><span className={cn("flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white", o.on)}>{o.k}</span>{o.name}</span>
                    ))}
                    <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">{ratedCount}/{EVAL_CRITERIA.length} rated</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                    {EVAL_CRITERIA.map((c) => <RatingRow key={c} label={c} value={evaluation[c] ?? ""} onChange={(v) => setEval(c, v)} />)}
                </div>
            </div>

            {/* Incidents */}
            <div>
                <SectionTitle>Incidents</SectionTitle>
                <p className="mb-3 text-xs text-slate-500">Add any accidents or incidents involving the driver during their employment.</p>
                <div className="space-y-4">
                    {incidents.map((a, i) => isEditing(a.id) ? (
                        <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600"><CarFront className="h-3.5 w-3.5" /></span>
                                    <h3 className="text-sm font-bold text-slate-800">Incident {i + 1}</h3>
                                </div>
                                <button type="button" onClick={() => removeInc(a.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                            </div>
                            <div className="mt-4 space-y-5">
                                <Grid>
                                    <Field label="Date of Accident / Incident" required><MonthYear value={a.date} onChange={(v) => setInc(a.id, { date: v })} /></Field>
                                    <Field label="Type of Accident / Incident" required><SelectBox value={a.type} onChange={(v) => setInc(a.id, { type: v })} items={INCIDENT_TYPES} placeholder="Please choose" /></Field>
                                </Grid>
                                <Field label="Location for the accident (complete address)" required><Textarea rows={2} value={a.location} onChange={(e) => setInc(a.id, { location: e.target.value })} placeholder="Street, City, State / Prov, ZIP / Postal" className="resize-none" /></Field>
                                <Grid>
                                    <Field label="City"><Input value={a.city} onChange={(e) => setInc(a.id, { city: e.target.value })} placeholder="City" /></Field>
                                    <Field label="State / Prov" required><SelectBox value={a.region} onChange={(v) => setInc(a.id, { region: v })} items={REGIONS} placeholder="Please choose" /></Field>
                                </Grid>
                                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                                    <Field label="Were you in a commercial vehicle?" required><YesNo value={a.commercial} onChange={(v) => setInc(a.id, { commercial: v })} /></Field>
                                    <Field label="Were you at fault?" required><YesNo value={a.atFault} onChange={(v) => setInc(a.id, { atFault: v })} /></Field>
                                    <Field label="Were you ticketed?" required><YesNo value={a.ticketed} onChange={(v) => setInc(a.id, { ticketed: v })} /></Field>
                                    <Field label="Was any vehicle towed away?"><YesNo value={a.towed} onChange={(v) => setInc(a.id, { towed: v })} /></Field>
                                    <Field label="Hazmat accident / incident"><YesNo value={a.hazmat} onChange={(v) => setInc(a.id, { hazmat: v })} /></Field>
                                    <Field label="Chemical spill?"><YesNo value={a.chemicalSpill} onChange={(v) => setInc(a.id, { chemicalSpill: v })} /></Field>
                                </div>
                                <Grid>
                                    <Field label="Total number of fatalities"><Input type="number" min={0} value={a.fatalities} onChange={(e) => setInc(a.id, { fatalities: e.target.value })} placeholder="0" /></Field>
                                    <Field label="Total number of injuries"><Input type="number" min={0} value={a.injuries} onChange={(e) => setInc(a.id, { injuries: e.target.value })} placeholder="0" /></Field>
                                </Grid>
                                <Field label="Please enter detailed information about this accident" required><Textarea rows={3} value={a.details} onChange={(e) => setInc(a.id, { details: e.target.value })} placeholder="Describe what happened…" className="resize-none" /></Field>
                            </div>
                            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                                <Button size="sm" className="gap-1.5" onClick={() => stopEdit(a.id)}><Check className="h-4 w-4" /> Save</Button>
                            </div>
                        </div>
                    ) : (
                        <div key={a.id} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-blue-700">Incident {i + 1}</p>
                                    <div className="mt-1.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                                        <Summary label="Date" value={mY(a.date)} />
                                        <Summary label="Type" value={a.type} />
                                        <Summary label="Location" value={[a.location, a.city, a.region].filter(Boolean).join(", ")} />
                                        <Summary label="At fault" value={a.atFault} />
                                        <Summary label="Ticketed" value={a.ticketed} />
                                        <Summary label="Injuries / Fatalities" value={`${a.injuries || "0"} / ${a.fatalities || "0"}`} />
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <button type="button" onClick={() => startEdit(a.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-blue-600" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button type="button" onClick={() => removeInc(a.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-rose-600" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" className="w-full gap-1.5 border-dashed" onClick={addInc}><Plus className="h-4 w-4" /> Add incident</Button>
                </div>
            </div>

            {/* Violations */}
            <div>
                <SectionTitle>Violations</SectionTitle>
                <p className="mb-3 text-xs text-slate-500">Add any traffic or regulatory violations on file for the driver.</p>
                <div className="space-y-4">
                    {violations.map((v, i) => isEditing(v.id) ? (
                        <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Gavel className="h-3.5 w-3.5" /></span>
                                    <h3 className="text-sm font-bold text-slate-800">Violation {i + 1}</h3>
                                </div>
                                <button type="button" onClick={() => removeVio(v.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                            </div>
                            <div className="mt-4 space-y-5">
                                <Grid>
                                    <Field label="Violation Date" required><MonthYear value={v.date} onChange={(val) => setVio(v.id, { date: val })} /></Field>
                                    <Field label="State / Province" required><SelectBox value={v.region} onChange={(val) => setVio(v.id, { region: val })} items={REGIONS} placeholder="Please choose" /></Field>
                                    <Field label="Violation Category" required><SelectBox value={v.category} onChange={(val) => setVio(v.id, { category: val })} items={VIOLATION_CATEGORIES} placeholder="Please choose" /></Field>
                                    <Field label="Out of Service?" required><YesNo value={v.oos} onChange={(val) => setVio(v.id, { oos: val })} /></Field>
                                </Grid>
                                <Field label="Charge / Description (select all that apply)" required><Chips items={CHARGES} selected={v.charges} onToggle={(c) => setVio(v.id, { charges: toggleArr(v.charges, c) })} /></Field>
                                <Grid>
                                    <Field label="Were you in a commercial vehicle?" required><YesNo value={v.commercial} onChange={(val) => setVio(v.id, { commercial: val })} /></Field>
                                    <Field label="Demerit points"><Input type="number" min={0} value={v.demerits} onChange={(e) => setVio(v.id, { demerits: e.target.value })} placeholder="e.g. 2" /></Field>
                                </Grid>
                                <Field label="Penalty / Fine (select all that apply)" required><Chips items={PENALTIES} selected={v.penalties} onToggle={(p) => setVio(v.id, { penalties: toggleArr(v.penalties, p) })} /></Field>
                                <Field label="Fine amount (if applicable)"><SelectBox value={v.fineAmount} onChange={(val) => setVio(v.id, { fineAmount: val })} items={FINE_RANGES} placeholder="Please choose" /></Field>
                                <Field label="Comments" hint="If you answered &quot;Other&quot; to any question, please provide additional detail."><Textarea rows={3} value={v.comments} onChange={(e) => setVio(v.id, { comments: e.target.value })} placeholder="Additional detail…" className="resize-none" /></Field>
                            </div>
                            <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                                <Button size="sm" className="gap-1.5" onClick={() => stopEdit(v.id)}><Check className="h-4 w-4" /> Save</Button>
                            </div>
                        </div>
                    ) : (
                        <div key={v.id} className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-amber-700">Violation {i + 1}</p>
                                    <div className="mt-1.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                                        <Summary label="Date" value={mY(v.date)} />
                                        <Summary label="Region" value={v.region} />
                                        <Summary label="Category" value={v.category} />
                                        <Summary label="Charges" value={v.charges.join(", ")} />
                                        <Summary label="Out of Service" value={v.oos} />
                                        <Summary label="Demerits" value={v.demerits} />
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <button type="button" onClick={() => startEdit(v.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-blue-600" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                                    <button type="button" onClick={() => removeVio(v.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-rose-600" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <Button variant="outline" className="w-full gap-1.5 border-dashed" onClick={addVio}><Plus className="h-4 w-4" /> Add violation</Button>
                </div>
            </div>

            {/* Remarks */}
            <div>
                <SectionTitle>Any Other Remarks</SectionTitle>
                <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any other remarks…" className="resize-none" />
            </div>

            {embedded ? (
                <CompletedByCertification value={completed} onChange={setCompleted} />
            ) : (
                <CompletedByCertification
                    value={completed} onChange={setCompleted} checklist={reviewChecklist}
                    kicker="Completed By"
                    certKicker="Reviewer Sign-Off"
                    certHeading="I have reviewed and completed the safety & performance history above."
                    certSubtext="Confirm you have reviewed the form above. Your name, title, date and signature are recorded on file."
                    nameLabel="Reviewer name" buttonLabel="Confirm review & sign" signedLabel="Reviewed & signed" signedByLabel="Reviewed by"
                />
            )}
        </FormScaffold>
    );
}
