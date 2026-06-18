import { cn } from "@/lib/utils";
import type { CompanyBranding } from "../ats/company-branding.data";

/**
 * ClassicSphForms — verbatim FMCSA §391.23 Safety Performance History paper forms
 * (Accident History + Drug & Alcohol History), filled with the returned data and signed.
 * Used as the "Traditional / Classic" view of the employer's returned form.
 */

export type ClassicAccident = { date: string; location: string; injuries: string; fatalities: string; hazmat: string };
export type ClassicSphData = {
    applicantName: string;
    // Accident History
    employedByUs: string;                 // "Yes" | "No"
    employedAs: string; fromMY: string; toMY: string;
    droveCMV: string;                     // "Yes" | "No"
    vehicleTypes: string[];               // subset of VEHICLE labels
    otherVehicle: string;
    reasons: string[];                    // subset of REASON labels
    noHistory: boolean;
    noAccidentData: boolean;
    accidents: ClassicAccident[];
    otherAccidents: string; remarks: string;
    // Drug & Alcohol History
    daNotSubject: boolean; daFrom: string; daTo: string;
    answers: string[];                    // 6 answers "Yes"|"No"|""
    // Completed by / signature
    company: string; street: string; cityStateZip: string; telephone: string;
    name: string; title: string; date: string; sig: string;
};

const VEHICLES = ["Straight Truck", "Tractor-Semitrailer", "Bus", "Cargo Tank", "Doubles/Triples"];
const REASONS = ["Discharged", "Resignation", "Lay Off", "Military Duty"];
const QUESTIONS = [
    "Has this person had an alcohol test with the result of 0.04 or higher alcohol concentration?",
    "Has this person tested positive or adulterated or substituted a test specimen for controlled substances?",
    "Has this person refused to submit to a post-accident, random, reasonable suspicion, or follow-up alcohol or controlled substance test?",
    "Has this person committed other violations of Subpart B of Part 382, or Part 40?",
    "If this person has violated a DOT drug and alcohol regulation, did this person complete a SAP-prescribed rehabilitation program in your employ, including return-to-duty and follow-up tests?  If yes, please send documentation back with this form.",
    "For a driver who successfully completed a SAP's rehabilitation referral and remained in your employ, did this driver subsequently have an alcohol test result of 0.04 or greater, a verified positive drug test, or refuse to be tested?",
];

// A square checkbox; shows an ✕ when ticked.
function Box({ on }: { on?: boolean }) {
    return (
        <span className="relative mx-0.5 inline-block h-[11px] w-[11px] border border-black align-middle">
            {on && <span className="absolute -top-[3px] left-[1px] text-[12px] font-bold leading-none">✕</span>}
        </span>
    );
}
// A fill-in blank carrying its value on an underline.
function Blank({ v, w, grow }: { v?: string; w?: string; grow?: boolean }) {
    return <span className={cn("inline-block self-stretch border-b border-black px-1 align-bottom", grow && "flex-1")} style={w ? { minWidth: w } : undefined}>{v || " "}</span>;
}

export function ClassicSphForms({ data, branding, page }: { data: ClassicSphData; branding: CompanyBranding; page?: "accident" | "drug" | "both" }) {
    const show = page ?? "both";
    return (
        <div className="mx-auto max-w-[820px] space-y-6 font-serif text-[12px] leading-snug text-black">
            {(show === "accident" || show === "both") && <AccidentBox data={data} branding={branding} />}
            {(show === "drug" || show === "both") && <DrugBox data={data} branding={branding} />}
        </div>
    );
}

// Letterhead: prospective employer (carrier) + the applicant & previous employer this form is about.
function FormHeader({ data, branding }: { data: ClassicSphData; branding: CompanyBranding }) {
    const contact = [branding.phone, branding.email].filter(Boolean).join("  ·  ");
    return (
        <div className="mb-3 border-b border-black pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-[13px] font-bold">{branding.name}</p>
                    {branding.tagline && <p className="text-[10px]">{branding.tagline}</p>}
                </div>
                {(branding.address || contact) && (
                    <div className="text-right text-[10px] leading-snug">
                        {branding.address && <div>{branding.address}</div>}
                        {contact && <div>{contact}</div>}
                    </div>
                )}
            </div>
            <div className="mt-1.5 flex flex-wrap justify-between gap-x-6 gap-y-0.5 text-[11px]">
                <span>Applicant: <span className="font-bold">{data.applicantName || "—"}</span></span>
                <span>Previous Employer: <span className="font-bold">{data.company || "—"}</span></span>
            </div>
        </div>
    );
}

function AccidentBox({ data, branding }: { data: ClassicSphData; branding: CompanyBranding }) {
    const acc = (i: number): ClassicAccident => data.accidents[i] ?? { date: "", location: "", injuries: "", fatalities: "", hazmat: "" };
    return (
        <div className="overflow-hidden break-words border border-black bg-white p-4">
            <FormHeader data={data} branding={branding} />
            <p className="text-center text-[13px] font-bold">ACCIDENT HISTORY</p>
            <p className="mt-1">The applicant named above was employed by us. Yes <Box on={data.employedByUs === "Yes"} /> No <Box on={data.employedByUs === "No"} /></p>
            <div className="mt-2 flex flex-wrap items-baseline gap-1">
                <span>Employed as</span><Blank v={data.employedAs} w="200px" />
                <span>from (m/y)</span><Blank v={data.fromMY} w="110px" />
                <span>to (m/y)</span><Blank v={data.toMY} w="110px" />
            </div>
            <p className="mt-2">
                1. Did he/she drive motor vehicle for you? Yes <Box on={data.droveCMV === "Yes"} /> No <Box on={data.droveCMV === "No"} /> If yes, what type? {VEHICLES.map((v) => (
                    <span key={v} className="whitespace-nowrap">{v} <Box on={data.vehicleTypes.includes(v)} /> </span>
                ))}Other (Specify) <Blank v={data.otherVehicle} w="160px" />
            </p>
            <p className="mt-2">2. Reason for leaving your employ: {REASONS.map((r) => (
                <span key={r} className="whitespace-nowrap">{r} <Box on={data.reasons.includes(r)} /> </span>
            ))}</p>
            <p className="mt-1">If there is no safety performance history to report, check here <Box on={data.noHistory} />, sign below and return.</p>
            <p className="mt-2"><span className="font-bold">ACCIDENTS:</span> Complete the following for any accidents included on your accident register (§390.15(b)) that involved the applicant in the 3 years prior to the application date shown above, or check <Box on={data.noAccidentData} /> here if there is no accident register data for this driver.</p>
            <div className="mt-2">
                <div className="grid grid-cols-[18px_1fr_1.4fr_1fr_1fr_1fr] gap-x-3 text-center font-medium">
                    <div /><div>Date</div><div>Location</div><div># Injuries</div><div># Fatalities</div><div>Hazmat Spill</div>
                </div>
                {[0, 1, 2].map((i) => {
                    const a = acc(i);
                    return (
                        <div key={i} className="mt-3 grid grid-cols-[18px_1fr_1.4fr_1fr_1fr_1fr] items-end gap-x-3">
                            <div>{i + 1}.</div>
                            <Blank v={a.date} grow /><Blank v={a.location} grow /><Blank v={a.injuries} grow /><Blank v={a.fatalities} grow /><Blank v={a.hazmat} grow />
                        </div>
                    );
                })}
            </div>
            <p className="mt-3">Please provide information concerning any other accidents involving the applicant that were reported to government agencies or insurers or retained under internal company policies:</p>
            <p className="mt-1 border-b border-black px-1">{data.otherAccidents || " "}</p>
            <p className="mt-3 border-b border-black px-1">&nbsp;</p>
            <p className="mt-4">Any other remarks:</p>
            <p className="mt-1 border-b border-black px-1">{data.remarks || " "}</p>
            <p className="mt-3 border-b border-black px-1">&nbsp;</p>
            <div className="mt-6 flex items-end justify-center gap-2">
                <span>Signature:</span>
                <span className="relative inline-block w-64 border-b border-black text-center">
                    {data.sig && <img src={data.sig} alt="signature" className="mx-auto h-8 object-contain" />}
                </span>
            </div>
            <div className="mt-3 flex flex-wrap items-end justify-center gap-x-8 gap-y-2">
                <span className="flex items-baseline gap-1">Title: <Blank v={data.title} w="200px" /></span>
                <span className="flex items-baseline gap-1">Date: <Blank v={data.date} w="140px" /></span>
            </div>
        </div>
    );
}

function DrugBox({ data, branding }: { data: ClassicSphData; branding: CompanyBranding }) {
    return (
        <div className="overflow-hidden break-words border border-black bg-white p-4">
            <FormHeader data={data} branding={branding} />
            <p className="text-center text-[13px] font-bold">DRUG AND ALCOHOL HISTORY</p>
            <p className="mt-1 flex flex-wrap items-baseline gap-1">
                <span>If driver was not subject to Department of Transportation testing requirements while employed by this employer, please check here</span>
                <Box on={data.daNotSubject} />
                <span>, fill in the dates of employment from</span><Blank v={data.daNotSubject ? data.daFrom : ""} w="120px" />
                <span>to</span><Blank v={data.daNotSubject ? data.daTo : ""} w="120px" /><span>, complete bottom of Part 3, sign, and return.</span>
            </p>
            <p className="mt-2 flex flex-wrap items-baseline gap-1">
                <span>Driver was subject to Department of Transportation testing requirements from</span>
                <Blank v={!data.daNotSubject ? data.daFrom : ""} w="120px" /><span>to</span><Blank v={!data.daNotSubject ? data.daTo : ""} w="120px" /><span>.</span>
            </p>
            <ol className="mt-2 space-y-2 pl-5">
                {QUESTIONS.map((q, i) => (
                    <li key={i} className="list-decimal">
                        <span>{q}</span>
                        <div className="mt-0.5">YES <Box on={data.answers[i] === "Yes"} /> &nbsp;&nbsp; NO <Box on={data.answers[i] === "No"} /></div>
                    </li>
                ))}
            </ol>
            <p className="mt-3">In answering these questions, include any required DOT drug or alcohol testing information obtained from prior previous employers in the previous 3 years prior to the application date shown on page 1.</p>
            <div className="mt-3 space-y-2">
                <div className="flex items-baseline gap-1"><span className="shrink-0">Name:</span><Blank v={data.name} grow /></div>
                <div className="flex items-baseline gap-1"><span className="shrink-0">Company:</span><Blank v={data.company} grow /></div>
                <div className="flex items-baseline gap-1"><span className="shrink-0">Street:</span><Blank v={data.street} grow /></div>
                <div className="flex items-baseline gap-1">
                    <span className="shrink-0">City, State, Zip:</span><Blank v={data.cityStateZip} grow />
                    <span className="shrink-0">Telephone:</span><Blank v={data.telephone} w="180px" />
                </div>
                <div className="flex flex-wrap items-end gap-1">
                    <span className="shrink-0">Part 3 Completed by (Signature):</span>
                    <span className="relative inline-block min-w-[200px] flex-1 border-b border-black text-center">
                        {data.sig && <img src={data.sig} alt="signature" className="mx-auto h-8 object-contain" />}
                    </span>
                    <span className="shrink-0">Date:</span><Blank v={data.date} w="140px" />
                </div>
            </div>
        </div>
    );
}
