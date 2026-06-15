import { useCallback, useEffect, useState } from "react";
import { Clock, FileCheck2, Loader2, ShieldCheck, ThumbsUp, X } from "lucide-react";
import { APPLICATION_FORMS } from "./ApplicationSettingsPage";

// Hiring Process applicants — localStorage-backed so the list board and the
// applicant detail page stay in sync (status changes, remarks, reissue).

export type AppStatus = "waiting" | "in-progress" | "submitted" | "under-review" | "approved" | "rejected";

export const STATUS_ORDER: AppStatus[] = ["waiting", "in-progress", "submitted", "under-review", "approved", "rejected"];

export const STATUS_META: Record<AppStatus, { label: string; badge: string; Icon: React.ElementType }> = {
    waiting: { label: "Waiting", badge: "bg-amber-100 text-amber-700", Icon: Clock },
    "in-progress": { label: "In Progress", badge: "bg-blue-100 text-blue-700", Icon: Loader2 },
    submitted: { label: "Submitted", badge: "bg-indigo-100 text-indigo-700", Icon: FileCheck2 },
    "under-review": { label: "Under Review", badge: "bg-violet-100 text-violet-700", Icon: ShieldCheck },
    approved: { label: "Approved", badge: "bg-emerald-100 text-emerald-700", Icon: ThumbsUp },
    rejected: { label: "Rejected", badge: "bg-rose-100 text-rose-700", Icon: X },
};

// What each status reads as in the activity column (from the hiring manager's view).
export const STATUS_VERB: Record<AppStatus, string> = {
    waiting: "Issued",
    "in-progress": "Started",
    submitted: "Submitted",
    "under-review": "In review",
    approved: "Approved",
    rejected: "Rejected",
};

export function relativeTime(ms: number): string {
    const diff = Date.now() - ms;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d}d ago`;
    return `${Math.floor(d / 30)}mo ago`;
}

export type Remark = { id: string; text: string; at: string; author: string; stepId?: string; stepTitle?: string; formId?: string; formLabel?: string };
export type AppEvent = { id: string; type: string; text: string; at: number; author: string };

export const ACTOR = "Kenan Gain";
const EVENT_TEXT: Record<AppStatus, string> = {
    waiting: "Application issued to the driver",
    "in-progress": "Driver started filling out the application",
    submitted: "Driver submitted the application",
    "under-review": "Moved to Under Review",
    approved: "Application approved",
    rejected: "Application rejected",
};
export type SubField = { label: string; value: string };
export type SubGroup = { label?: string; fields: SubField[] };   // one entry within a section
export type SubSection = { title: string; groups: SubGroup[] };  // a section may hold several entries

// Per-document state inside the hiring file (keyed by the step's form id).
export type DocStatus = "pending" | "requested" | "received" | "verified" | "skipped";

// A recorded reviewer sign-off (who reviewed a form/section, when, with signature).
export type ReviewSignoff = { by: string; role: string; date: string; sig: string; at: number };

// Per-step review lifecycle: initial → waiting for review → reviewed → complete / incomplete
export type StepStatus = "initial" | "waiting" | "reviewed" | "complete" | "incomplete";
export const STEP_STATUS_META: Record<StepStatus, { label: string; tone: string; dot: string }> = {
    initial:    { label: "Initial",            tone: "bg-slate-100 text-slate-600",     dot: "bg-slate-400" },
    waiting:    { label: "Waiting for review", tone: "bg-amber-100 text-amber-700",     dot: "bg-amber-500" },
    reviewed:   { label: "Reviewed",           tone: "bg-blue-100 text-blue-700",       dot: "bg-blue-500" },
    complete:   { label: "Complete",           tone: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    incomplete: { label: "Incomplete",         tone: "bg-rose-100 text-rose-700",       dot: "bg-rose-500" },
};
export const DOC_STATUS_META: Record<DocStatus, { label: string; badge: string; dot: string }> = {
    pending: { label: "Pending", badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
    requested: { label: "Requested", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    received: { label: "Received", badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    verified: { label: "Verified", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    skipped: { label: "Skipped", badge: "bg-slate-100 text-slate-400", dot: "bg-slate-300" },
};

// A request the hiring manager raises — to the driver, an employer, HR, etc.
export type RequestAction = "Request" | "Order" | "Review" | "Alert";
export type RequestRecipient = "Driver" | "Hiring Manager" | "Previous Employer" | "Provider / Agency" | "Other";
export type RequestChannel = "Email" | "In-app";
export const REQUEST_ACTIONS: { id: RequestAction; label: string; hint: string }[] = [
    { id: "Request", label: "Request document", hint: "Ask someone to complete or upload a document" },
    { id: "Order", label: "Order report", hint: "Order a report from a provider / agency" },
    { id: "Review", label: "Assign review", hint: "Assign a review task to HR / a hiring manager" },
    { id: "Alert", label: "Alert / Notify", hint: "Send a reminder or notification" },
];
export type AppRequest = {
    id: string; fid?: string; subject: string; action?: RequestAction;
    recipient: RequestRecipient; to?: string;
    channel: RequestChannel; message: string; dueDate?: string;
    status: "open" | "resolved"; at: number; by: string;
};

// Per previous-employer verification tracking (gov allows 3 attempts; we allow 5).
export type EmpStatus = "pending" | "sent" | "responded" | "verified";
export type EmpAttempt = { at: number; method: string; to: string };
export type EmpCheck = {
    id: string; employer: string; position: string; dates: string; email: string;
    attempts: EmpAttempt[]; status: EmpStatus; respondedAt?: number; verifiedAt?: number;
    verifierSig?: string;   // hiring-manager signature captured when verifying on the dashboard
};
export const EMP_MAX_ATTEMPTS = 5;

export type Applicant = {
    id: string;
    firstName: string; lastName: string; email: string;
    formId: string; carrier: string; carrierId?: string; template: string;
    status: AppStatus; stepsDone: number; stepsTotal: number;
    invitedAt: string; updatedAt: number; phone?: string; position?: string;
    submission?: SubSection[];   // present once the driver has filled the form
    uploads?: UploadedFile[];    // files the applicant uploaded (license front/back, etc.)
    remarks: Remark[];           // notes & comments
    events: AppEvent[];          // activity log — newest first
    currentStep?: number;        // index into the template's steps
    docs?: Record<string, DocStatus>;  // hiring-file item state, keyed by form id / upload id / doc id
    stepStatus?: Record<string, StepStatus>;  // per-step review lifecycle, keyed by step id
    reviews?: Record<string, ReviewSignoff>;   // reviewer sign-offs, keyed by target (e.g. "application", "consents")
    docSource?: Record<string, "driver" | "employer">;  // per item: driver-uploaded vs ask-from-employer
    employerDocModes?: Record<string, "off" | "upload" | "ask">;  // per verification-doc type, from the application builder
    requests?: AppRequest[];     // open / resolved requests raised on the file
    empChecks?: EmpCheck[];      // employment-verification state per previous employer
    checklistState?: { fields?: Record<string, string>; items?: Record<string, boolean>; sigs?: Record<string, string> }; // review checklist fill state
};

export const formName = (id: string) => APPLICATION_FORMS.find((f) => f.id === id)?.name ?? id;
export const formRegion = (id: string) => APPLICATION_FORMS.find((f) => f.id === id)?.region ?? "";

// ---- submission profile (supports multiple licenses / addresses / jobs / etc.) ----
type Addr = { street: string; unit?: string; city: string; state: string; zip: string; dates?: string };
type Lic = { number: string; cls: string; authority: string; exp: string; cdl: string; endorsements: string; frontImage?: string; backImage?: string };
type Emp = { employer: string; position: string; dates: string; reason: string; verifications?: string };
type Edu = { school: string; study: string; dates: string };
type Rec = { label: string; detail: string };
type DrivExp = { equipment: string; freight: string; regions: string; dates: string; miles: string; ownerOperator: string };
type Profile = {
    phone: string; dob: string; idNumber: string;
    addresses: Addr[];      // [0] = current
    licenses: Lic[];
    drivingExperience?: DrivExp[];
    employment: Emp[];
    unemployment?: { dates: string; comments: string }[];
    education: Edu[];
    record: Rec[];          // accidents + violations
    signedAt: string;
};

export type UploadedFile = { id: string; label: string; file: string; category: string };

function build(a: Pick<Applicant, "firstName" | "lastName" | "email" | "formId" | "position">, p: Profile): SubSection[] {
    const cfg = APPLICATION_FORMS.find((f) => f.id === a.formId);
    const idLabel = cfg?.idLabel ?? "SSN / SIN";
    const country = cfg?.defaultCountry ?? "United States";
    const naGroup = (label: string): SubGroup => ({ fields: [{ label, value: "Not provided" }] });

    return [
        { title: "Applicant Information", groups: [{ fields: [
            { label: "First Name", value: a.firstName },
            { label: "Last Name", value: a.lastName },
            { label: "Email", value: a.email },
            { label: "Phone", value: p.phone },
            { label: "Date of Birth", value: p.dob },
            { label: idLabel, value: p.idNumber },
            { label: `Legal right to work in ${country === "Canada" ? "Canada" : "the U.S."}`, value: "Yes" },
            { label: "Position Type", value: a.position ?? "Driver" },
        ] }] },
        { title: "Address History", groups: p.addresses.length ? p.addresses.map((ad, i) => ({
            label: i === 0 ? "Current Address" : `Previous Address ${i}`,
            fields: [
                { label: "Street Address", value: ad.street },
                ...(ad.unit ? [{ label: "Unit / Suite / Apt #", value: ad.unit }] : []),
                { label: "City", value: ad.city },
                { label: "State / Province", value: ad.state },
                { label: "Zip / Postal Code", value: ad.zip },
                { label: "Country", value: country },
                ...(ad.dates ? [{ label: "Dates", value: ad.dates }] : []),
            ],
        })) : [naGroup("Address")] },
        { title: "License Details", groups: p.licenses.length ? p.licenses.map((l, i) => ({
            label: p.licenses.length > 1 ? `License ${i + 1}` : undefined,
            fields: [
                { label: "License Number", value: l.number },
                { label: "Class", value: l.cls },
                { label: "Issuing State / Province", value: l.authority },
                { label: "Expiration", value: l.exp },
                { label: "Commercial (CDL)", value: l.cdl },
                { label: "Endorsements", value: l.endorsements },
                { label: "License Images", value: l.frontImage || l.backImage ? "Front & back uploaded" : "Not uploaded" },
            ],
        })) : [naGroup("License")] },
        { title: "Driving Experience", groups: p.drivingExperience?.length ? p.drivingExperience.map((d, i) => ({
            label: p.drivingExperience!.length > 1 ? `Experience ${i + 1}` : undefined,
            fields: [
                { label: "Equipment Class", value: d.equipment },
                { label: "Freight Types", value: d.freight },
                { label: "Driving Regions", value: d.regions },
                { label: "Dates", value: d.dates },
                { label: "Approx. Miles", value: d.miles },
                { label: "Owner-operator", value: d.ownerOperator },
            ],
        })) : [naGroup("Driving Experience")] },
        { title: "Employment History", groups: p.employment.length ? p.employment.map((e, i) => ({
            label: p.employment.length > 1 ? `Employer ${i + 1}` : undefined,
            fields: [
                { label: "Employer", value: e.employer },
                { label: "Position", value: e.position },
                { label: "Dates", value: e.dates },
                { label: "Reason for leaving", value: e.reason },
                ...(e.verifications ? [{ label: "Verification (ask at hiring)", value: e.verifications }] : []),
            ],
        })) : [naGroup("Employment")] },
        { title: "Unemployment History", groups: p.unemployment?.length ? p.unemployment.map((u, i) => ({
            label: p.unemployment!.length > 1 ? `Period ${i + 1}` : undefined,
            fields: [
                { label: "Dates", value: u.dates },
                { label: "Comments", value: u.comments },
            ],
        })) : [{ fields: [{ label: "Unemployment", value: "None reported" }] }] },
        { title: "Education", groups: p.education.length ? p.education.map((s, i) => ({
            label: p.education.length > 1 ? `School ${i + 1}` : undefined,
            fields: [
                { label: "School", value: s.school },
                { label: "Studied", value: s.study },
                { label: "Dates", value: s.dates },
            ],
        })) : [{ fields: [{ label: "Education", value: "None reported" }] }] },
        { title: "Driving Record", groups: [{ fields: p.record.length ? p.record.map((r) => ({ label: r.label, value: r.detail })) : [{ label: "Record", value: "None reported" }] }] },
        { title: "Signature", groups: [{ fields: [
            { label: "Signed By", value: `${a.firstName} ${a.lastName}` },
            { label: "Date Signed", value: p.signedAt },
        ] }] },
    ];
}

// Reconstruct a plausible activity timeline from the applicant's current status.
function genEvents(a: Omit<Applicant, "submission" | "remarks" | "events">): AppEvent[] {
    const HOUR = 3_600_000;
    const order: AppStatus[] = ["waiting", "in-progress", "submitted", "under-review", a.status === "rejected" ? "rejected" : "approved"];
    const reached = Math.max(0, order.indexOf(a.status));
    const evs: AppEvent[] = [];
    for (let i = 0; i <= reached; i++) {
        const s = order[i];
        const at = a.updatedAt - (reached - i) * 6 * HOUR;
        const author = i === 0 || i >= 3 ? ACTOR : `${a.firstName} ${a.lastName}`;
        evs.push({ id: `se-${a.id}-${i}`, type: i === 0 ? "invited" : s, text: EVENT_TEXT[s], at, author });
    }
    return evs.reverse();
}

// Collect the files an applicant uploaded as part of their submission.
function buildUploads(p: Profile): UploadedFile[] {
    const ups: UploadedFile[] = [];
    p.licenses.forEach((l, i) => {
        const tag = p.licenses.length > 1 ? ` (License ${i + 1})` : "";
        if (l.frontImage) ups.push({ id: `lic-${i}-front`, label: `License front${tag}`, file: l.frontImage, category: "License" });
        if (l.backImage) ups.push({ id: `lic-${i}-back`, label: `License back${tag}`, file: l.backImage, category: "License" });
    });
    return ups;
}

const seedApplicant = (a: Omit<Applicant, "submission" | "remarks" | "events">, p?: Profile): Applicant => ({
    ...a,
    submission: p ? build(a, p) : undefined,
    uploads: p ? buildUploads(p) : undefined,
    remarks: [],
    events: genEvents(a),
});

const MIN = 60_000, H = 3_600_000, D = 86_400_000;
const NOW = Date.now();

const SEED: Applicant[] = [
    seedApplicant(
        { id: "a1", firstName: "Jane", lastName: "Doe", email: "jane.doe@example.com", formId: "us", carrier: "Acme Logistics", carrierId: "acct-001", template: "Complete Driver Hiring (Default)", status: "under-review", stepsDone: 12, stepsTotal: 12, invitedAt: "Jun 2, 2026", updatedAt: NOW - 6 * H, position: "OTR Driver", phone: "(312) 555-0148", employerDocModes: { performance: "upload", experience: "upload", insurance: "ask" } },
        {
            phone: "(312) 555-0148", dob: "03/14/1988", idNumber: "***-**-4471",
            addresses: [
                { street: "18 Maple Ridge Rd", unit: "4", city: "Springfield", state: "Illinois", zip: "62704", dates: "2021 - present" },
                { street: "402 Cedar Ave", city: "Decatur", state: "Illinois", zip: "62521", dates: "2018 - 2021" },
            ],
            licenses: [
                { number: "D1234-5678-90", cls: "Class A", authority: "Illinois", exp: "03-04-2027", cdl: "Yes", endorsements: "HazMat, Tanker", frontImage: "license-1-front.jpg", backImage: "license-1-back.jpg" },
                { number: "D9988-1122-33", cls: "Class B", authority: "Indiana", exp: "07-15-2024", cdl: "Yes", endorsements: "None", frontImage: "license-2-front.jpg", backImage: "license-2-back.jpg" },
            ],
            drivingExperience: [
                { equipment: "Tractor and Semi-trailer", freight: "Van, Reefer", regions: "USA, Border", dates: "01-2021 - 03-2024", miles: "250,000", ownerOperator: "No" },
            ],
            employment: [
                { employer: "Roadrunner Freight", position: "OTR Driver", dates: "01-2021 - 03-2024", reason: "Career advancement", verifications: "Performance Verification, Experience Letter" },
                { employer: "Prairie Haul Co.", position: "Regional Driver", dates: "05-2018 - 12-2020", reason: "Relocated", verifications: "Experience Letter" },
            ],
            unemployment: [{ dates: "01-2021 - 04-2021", comments: "Short gap between roles while relocating." }],
            education: [{ school: "Lincoln Technical Institute", study: "Diesel Mechanics", dates: "2019 - 2020" }],
            record: [
                { label: "Accident (2023)", detail: "Minor rear-end, not at fault, no injuries" },
                { label: "Violation (2024)", detail: "Speeding — 12 mph over" },
            ],
            signedAt: "06/05/2026",
        },
    ),
    seedApplicant(
        { id: "a2", firstName: "Marcus", lastName: "Reed", email: "marcus.reed@example.com", formId: "local", carrier: "Acme Logistics", carrierId: "acct-001", template: "Fast-Track Hiring", status: "submitted", stepsDone: 12, stepsTotal: 12, invitedAt: "Jun 4, 2026", updatedAt: NOW - 2 * H, position: "Local Driver", phone: "(773) 555-0192" },
        {
            phone: "(773) 555-0192", dob: "07/22/1991", idNumber: "***-**-7781",
            addresses: [{ street: "920 Oak Street", city: "Joliet", state: "Illinois", zip: "60435", dates: "2019 - present" }],
            licenses: [{ number: "R8821-1140-22", cls: "Class B", authority: "Illinois", exp: "11-30-2028", cdl: "Yes", endorsements: "None", frontImage: "marcus-license-front.jpg", backImage: "marcus-license-back.jpg" }],
            employment: [{ employer: "Midwest Distribution", position: "Local Delivery Driver", dates: "06-2019 - 05-2024", reason: "Seeking local route", verifications: "Employer Experience Letter, Insurance Experience Letter" }],
            education: [{ school: "Joliet Community College", study: "Logistics", dates: "2017 - 2019" }],
            record: [],
            signedAt: "06/06/2026",
        },
    ),
    seedApplicant(
        { id: "a3", firstName: "Priya", lastName: "Patel", email: "priya.patel@example.com", formId: "canada", carrier: "NL Transport", carrierId: "acct-003", template: "Complete Driver Hiring (Default)", status: "in-progress", stepsDone: 5, stepsTotal: 12, invitedAt: "Jun 5, 2026", updatedAt: NOW - 35 * MIN, phone: "(416) 555-0173" },
        {
            phone: "(416) 555-0173", dob: "01/09/1990", idNumber: "***-***-902",
            addresses: [{ street: "55 Lakeshore Blvd", city: "Toronto", state: "Ontario", zip: "M5J 2N8", dates: "2020 - present" }],
            licenses: [{ number: "ON-44821-9920", cls: "Class 1", authority: "Ontario", exp: "08-15-2027", cdl: "Yes", endorsements: "Air Brake (Z)" }],
            employment: [],
            education: [],
            record: [],
            signedAt: "—",
        },
    ),
    seedApplicant(
        { id: "a4", firstName: "Tom", lastName: "Bell", email: "tom.bell@example.com", formId: "us", carrier: "Acme Logistics", carrierId: "acct-001", template: "Complete Driver Hiring (Default)", status: "waiting", stepsDone: 0, stepsTotal: 12, invitedAt: "Jun 7, 2026", updatedAt: NOW - 1 * H },
    ),
    seedApplicant(
        { id: "a5", firstName: "Sofia", lastName: "Nguyen", email: "sofia.nguyen@example.com", formId: "cross-border", carrier: "Cascade Freight", carrierId: "acct-002", template: "Complete Driver Hiring (Default)", status: "approved", stepsDone: 12, stepsTotal: 12, invitedAt: "May 28, 2026", updatedAt: NOW - 3 * D, position: "Cross-Border Driver", phone: "(206) 555-0120" },
        {
            phone: "(206) 555-0120", dob: "05/30/1985", idNumber: "***-**-3320",
            addresses: [
                { street: "412 Border Way", city: "Blaine", state: "Washington", zip: "98230", dates: "2019 - present" },
                { street: "77 Harbor St", city: "Bellingham", state: "Washington", zip: "98225", dates: "2016 - 2019" },
            ],
            licenses: [
                { number: "WA-93021-7741", cls: "Class A", authority: "Washington", exp: "09-12-2027", cdl: "Yes", endorsements: "HazMat, FAST" },
            ],
            employment: [
                { employer: "Pacific Cross Carriers", position: "Cross-Border Driver", dates: "03-2018 - 04-2024", reason: "Company restructuring" },
                { employer: "Cascade Freightways", position: "Line Haul Driver", dates: "01-2015 - 02-2018", reason: "Career growth" },
            ],
            education: [{ school: "Bellingham Technical College", study: "Commercial Driving", dates: "2016 - 2017" }],
            record: [],
            signedAt: "05/29/2026",
        },
    ),
    seedApplicant(
        { id: "a6", firstName: "Derek", lastName: "Olsen", email: "derek.olsen@example.com", formId: "us-owner-operator", carrier: "Cascade Freight", carrierId: "acct-002", template: "Owner-Operator Hiring", status: "in-progress", stepsDone: 8, stepsTotal: 12, invitedAt: "Jun 6, 2026", updatedAt: NOW - 5 * H, position: "Owner-Operator", phone: "(503) 555-0166" },
        {
            phone: "(503) 555-0166", dob: "11/03/1982", idNumber: "***-**-5567",
            addresses: [{ street: "77 Industrial Pkwy", city: "Portland", state: "Oregon", zip: "97209", dates: "2016 - present" }],
            licenses: [{ number: "OR-55120-3349", cls: "Class A", authority: "Oregon", exp: "02-28-2027", cdl: "Yes", endorsements: "Doubles / Triples" }],
            employment: [{ employer: "Self (Owner-Operator)", position: "Owner-Operator", dates: "01-2016 - present", reason: "—" }],
            education: [],
            record: [{ label: "Violation (2022)", detail: "Logbook / HOS violation" }],
            signedAt: "—",
        },
    ),
    seedApplicant(
        { id: "a7", firstName: "Hassan", lastName: "Ali", email: "hassan.ali@example.com", formId: "local", carrier: "Acme Logistics", carrierId: "acct-001", template: "Fast-Track Hiring", status: "rejected", stepsDone: 9, stepsTotal: 12, invitedAt: "May 30, 2026", updatedAt: NOW - 2 * D, phone: "(312) 555-0188" },
        {
            phone: "(312) 555-0188", dob: "09/18/1994", idNumber: "***-**-2210",
            addresses: [{ street: "300 Halsted St", city: "Chicago", state: "Illinois", zip: "60607", dates: "2022 - present" }],
            licenses: [{ number: "C2290-7781-04", cls: "Class C", authority: "Illinois", exp: "04-10-2026", cdl: "No", endorsements: "None" }],
            employment: [{ employer: "City Couriers", position: "Courier", dates: "02-2022 - 03-2024", reason: "Company closed" }],
            education: [],
            record: [
                { label: "Accident (2023)", detail: "At-fault collision, vehicle towed" },
                { label: "Accident (2024)", detail: "At-fault, minor property damage" },
                { label: "Violations", detail: "3 - speeding, red light, following too close" },
            ],
            signedAt: "05/31/2026",
        },
    ),
];

const KEY = "hp_applicants_v9";

function read(): Applicant[] {
    if (typeof window === "undefined") return SEED;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return SEED;
        return JSON.parse(raw) as Applicant[];
    } catch {
        return SEED;
    }
}

function write(list: Applicant[]) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(KEY, JSON.stringify(list));
        window.dispatchEvent(new CustomEvent("hp-applicants-updated"));
    } catch { /* ignore */ }
}

export function useApplicants() {
    const [applicants, setApplicants] = useState<Applicant[]>(() => read());

    useEffect(() => {
        const onUpdate = () => setApplicants(read());
        window.addEventListener("hp-applicants-updated", onUpdate);
        return () => window.removeEventListener("hp-applicants-updated", onUpdate);
    }, []);

    const addMany = useCallback((created: Applicant[]) => {
        write([...created, ...read()]);
    }, []);

    const updateOne = useCallback((id: string, patch: Partial<Applicant> | ((a: Applicant) => Partial<Applicant>)) => {
        write(read().map((a) => {
            if (a.id !== id) return a;
            let p = typeof patch === "function" ? patch(a) : patch;
            const statusChanged = "status" in p && p.status !== a.status;
            // A plain status change (no explicit events) is auto-logged.
            if (statusChanged && !("events" in p)) {
                const ev: AppEvent = { id: `e-${Date.now()}`, type: "status", text: `Status changed to ${STATUS_META[p.status as AppStatus].label}`, at: Date.now(), author: ACTOR };
                p = { ...p, events: [ev, ...a.events] };
            }
            // Any logged activity bumps the "last updated" time the list shows.
            if (("events" in p || statusChanged) && !("updatedAt" in p)) {
                p = { ...p, updatedAt: Date.now() };
            }
            return { ...a, ...p };
        }));
    }, []);

    return { applicants, addMany, updateOne };
}
