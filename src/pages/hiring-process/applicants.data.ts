import { useCallback, useEffect, useState } from "react";
import { Clock, FileCheck2, Loader2, ShieldCheck, ThumbsUp, X } from "lucide-react";
import { APPLICATION_FORMS, MVR_QUESTIONS } from "./ApplicationSettingsPage";
import { getOnbWorkflow, makeAssignedTraining, type OnboardingState, type AssignedTraining } from "./onboarding.data";

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
export type AppEvent = {
    id: string; type: string; text: string; at: number; author: string;
    /** Why — the reason given when the status was changed. Shown under the entry. */
    detail?: string;
};

export const ACTOR = "Kenan Gain";
const EVENT_TEXT: Record<AppStatus, string> = {
    waiting: "Application issued to the driver",
    "in-progress": "Driver started filling out the application",
    submitted: "Driver submitted the application",
    "under-review": "Moved to Under Review",
    approved: "Application approved",
    rejected: "Application rejected",
};
/*
 * Approving and rejecting are the two decisions on this board that somebody else has to be
 * able to read back, so neither is allowed through without a reason.
 *
 * An approval with no reason is the one nobody questions until an auditor asks what was
 * checked; a rejection with no reason is the one the driver calls about and nobody in the
 * office can answer. Everything else on the pipeline is a step, not a decision, and is
 * logged without being interrogated.
 *
 * The presets are there so the common case is one click rather than a paragraph — they fill
 * the box, and anything can be typed over them.
 */
export const REASON_REQUIRED: AppStatus[] = ["approved", "rejected"];
export const needsReason = (s: AppStatus) => REASON_REQUIRED.includes(s);

export const STATUS_REASONS: Partial<Record<AppStatus, string[]>> = {
    approved: [
        "All checks cleared",
        "Driving record meets policy",
        "Experience and references verified",
        "Road test passed",
    ],
    rejected: [
        "Insufficient verifiable experience",
        "Driving record does not meet policy",
        "Failed drug & alcohol screening",
        "Incomplete application or documents",
        "Did not pass the road test",
        "Position filled",
    ],
};

export type SubField = { label: string; value: string };
export type SubGroup = { label?: string; fields: SubField[] };   // one entry within a section
export type SubSection = { title: string; groups: SubGroup[] };  // a section may hold several entries

// Per-document state inside the hiring file (keyed by the step's form id).
export type DocStatus = "pending" | "requested" | "received" | "verified" | "skipped";

// A recorded reviewer sign-off (who reviewed a form/section, when, with signature).
export type ReviewSignoff = { by: string; role: string; date: string; sig: string; at: number };

// Road Test step — the person assigned to conduct the FMCSA §391.31 road test for
// the driver, and how the requirement is satisfied (certify / license / document).
export type RoadTestMethod = "certify" | "license" | "document";
export type RoadTestDoc = { label: string; fileName?: string; kind: "certificate" | "license" | "document" | "additional" };
export type RoadTestState = { examiner?: string; examinerRole?: string; examinerEmail?: string; assignedAt?: number; method?: RoadTestMethod; documents?: RoadTestDoc[]; formValues?: Record<string, unknown>; equivRequested?: ("license" | "document")[] };

// Test step — quizzes (multiple-choice knowledge tests) assigned to the DRIVER,
// plus the driver's scored result per quiz.
export type QuizAttempt = { score: number; total: number; passed: boolean; answers: Record<string, number>; at: number };
// quizCounts: per assigned quiz, how many questions the assigned test draws (test length).
// attempts: how many chances the driver has used per test (max 3). training: remedial
// training assigned for a test the driver failed after using all chances.
export type QuizState = { assignedQuizIds?: string[]; quizCounts?: Record<string, number>; assignedAt?: number; results?: Record<string, QuizAttempt>; attempts?: Record<string, number>; training?: Record<string, { assignedAt: number }> };

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
export type RequestChannel = "Email" | "In-app" | "External chat";
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
    respondedAttempt?: number;   // index of the request (attempt) the employer's response is logged against
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
    roadTest?: RoadTestState;    // §391.31 road test — assigned examiner + fulfilment method
    quiz?: QuizState;            // Test step — quizzes assigned to the driver + their results
    checklistState?: { fields?: Record<string, string>; items?: Record<string, boolean>; sigs?: Record<string, string> }; // review checklist fill state
    onboarding?: OnboardingState;   // post-hire onboarding progress (forms / contract / quiz / training)
};

export const formName = (id: string) => APPLICATION_FORMS.find((f) => f.id === id)?.name ?? id;
export const formRegion = (id: string) => APPLICATION_FORMS.find((f) => f.id === id)?.region ?? "";

/*
 * The application form, as the driver type it stands for.
 *
 * Three types are offered and exactly one is picked per applicant, so that is what the list
 * column, the breadcrumb and the header chip all say. It lives here rather than on a page
 * because two screens naming the same fact differently is how "US Only Driver / United
 * States" ended up on one and "local" on the other.
 *
 * `local` and `us-owner-operator` are older ids from before the catalog settled on three;
 * both are US-domestic forms, so they read as US rather than leaking an id into the UI.
 */
const FORM_SHORT: Record<string, string> = {
    us: "US",
    "us-owner-operator": "US",
    local: "US",
    canada: "Canada",
    "cross-border": "Cross-border",
};
export const DRIVER_TYPES = ["US", "Canada", "Cross-border"];
export const formShort = (id: string) => FORM_SHORT[id] ?? formName(id);

// ---- submission profile (supports multiple licenses / addresses / jobs / etc.) ----
type Addr = { street: string; unit?: string; street2?: string; city: string; state: string; zip: string; country?: string; dates?: string };
type Lic = { number: string; cls: string; authority: string; exp: string; cdl: string; endorsements: string; frontImage?: string; backImage?: string; country?: string; current?: string; medCardExp?: string };
type Emp = {
    employer: string; position: string; dates: string; reason: string; verifications?: string;
    telephone?: string; addr1?: string; addr2?: string; city?: string; state?: string; zip?: string; country?: string;
    terminated?: string; current?: string; operatedCMV?: string;
    /** The two DOT attestations the form asks of every previous employer. */
    fmcsr?: string; safetySensitive?: string;
};
type Edu = { school: string; study: string; dates: string; city?: string; state?: string; country?: string; telephone?: string; graduation?: string };
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
    /** Older seeds keep both in one list; `accidents` / `violations` override it. */
    record: Rec[];
    accidents?: Rec[];
    violations?: Rec[];
    /** The form's US-operation question, which replaced the old right-to-work one. */
    operatesInUS?: string;
    signedAt: string;
    // Optional sections — surfaced in Submitted Data even when the seed omits
    // them (they render a sensible "None reported" / "Not provided" fallback).
    contact?: { cell?: string; preferred?: string; bestTime?: string };
    disqualification?: Rec[];
    military?: { branch?: string; country?: string; from?: string; to?: string; rank?: string; dd214File?: string };
    /** Re-asked on the declaration step, where the driver attests to their own identity. */
    middleName?: string;
    suffix?: string;
    travelDocs?: { citizenship?: string; passport?: string; passportCountry?: string; passportExp?: string; passportFile?: string; visaType?: string; visaNumber?: string; visaExp?: string; visaFile?: string; workPermitType?: string; workPermitNumber?: string; workPermitExp?: string; workPermitFile?: string };
};

export type UploadedFile = {
    id: string; label: string; file: string; category: string;
    /** Asked for by the form, not supplied. Listed so the gap is visible to a reviewer. */
    missing?: boolean;
};

/*
 * The review, as the form was actually filled in.
 *
 * The order and the headings were reconciled with the form's fourteen steps earlier; the
 * FIELDS inside them had not been, and that is where a review stops being a record. Going
 * through them one at a time against `dataSteps` in ApplicationSettingsPage:
 *
 *   - the wording was this file's own, not the form's. "Commercial (CDL)" for "Is this a
 *     commercial driver license?", "Approx. Miles" for "Approximate miles", "Terminated /
 *     discharged / laid off" for "Were you terminated / discharged / laid off?" — a
 *     reviewer comparing the two screens had to work out which question each line answered.
 *   - every gate question was missing. The form asks "Were there any gaps in your
 *     employment during the last 3 years?" and the review printed the gaps; asked "Were you
 *     involved in any accidents…" and printed the accidents. The answer "No" is a thing the
 *     driver said, and it was nowhere.
 *   - questions were missing outright: the licence's issuing country, whether it is their
 *     current one, the DOT medical card expiry; the employer's FMCSR and safety-sensitive
 *     attestations; the school's address and graduation date; the confirmed email; all six
 *     licence-disqualification questions, which were collapsed into one line reading "None
 *     reported".
 *   - ranges were printed as one value where the form asks for two ends ("Dates" for Start
 *     Date / End Date).
 *
 * Where the form asks something the file does not hold, the question is listed and marked
 * Not provided rather than dropped. That is the same rule the Uploaded Documents tab
 * follows, and for the same reason: a question that was asked and not answered is the most
 * useful thing a reviewer can be told.
 */
function build(a: Pick<Applicant, "firstName" | "lastName" | "email" | "formId" | "position">, p: Profile): SubSection[] {
    const cfg = APPLICATION_FORMS.find((f) => f.id === a.formId);
    const idLabel = cfg?.idLabel ?? "SSN / SIN";
    const country = cfg?.defaultCountry ?? "United States";

    const NP = "Not provided";
    /** A value, or the mark that says the form asked and the file does not hold it. */
    const v = (x?: string) => (x && x.trim() ? x.trim() : NP);
    const yn = (b: boolean) => (b ? "Yes" : "No");
    /*
     * The form asks for two ends; the file keeps one string. Split it at the join.
     *
     * Only at a separator with a space on either side: these are written "01-2015 -
     * 02-2018", and a rule that split on any hyphen turned the start date into "01".
     */
    const ends = (s?: string): [string, string] => {
        const parts = (s ?? "").split(/\s+(?:–|—|-|to)\s+/i).filter(Boolean);
        return parts.length >= 2 ? [parts[0].trim(), parts.slice(1).join(" ").trim()] : [v(s), NP];
    };
    /** The form relabels these by the country of the row it is on. */
    const regionLabel = (c: string) => (c === "Canada" ? "Province" : "State");
    const postalLabel = (c: string) => (c === "Canada" ? "Postal Code" : "Zip Code");

    const accidents = p.accidents ?? p.record.filter((r) => /^accident/i.test(r.label));
    const violations = p.violations ?? p.record.filter((r) => !/^accident/i.test(r.label));

    return [
        // ── 1 ──────────────────────────────────────────────────────────────────
        { title: "Applicant Information", groups: [{ fields: [
            { label: "First Name", value: a.firstName },
            { label: "Last Name", value: a.lastName },
            { label: "Email", value: a.email },
            { label: "Phone Number", value: v(p.phone) },
            { label: "Date of Birth", value: v(p.dob) },
            { label: idLabel, value: v(p.idNumber) },
            { label: "Position Type", value: a.position ?? "Driver" },
            { label: "Will this driver operate in or cross into the United States?", value: p.operatesInUS ?? "Yes" },
        ] }] },

        // ── 2 ──────────────────────────────────────────────────────────────────
        // The current address is asked with the three-year question on it; every earlier
        // one is asked with the dates they lived there. Two shapes, as on the form.
        { title: "Address Details", groups: p.addresses.length ? p.addresses.map((ad, i) => {
            const c = ad.country ?? country;
            const [from, to] = ends(ad.dates);
            return {
                label: i === 0 ? "Current Address" : `Previous Address ${i}`,
                fields: i === 0 ? [
                    { label: "Street Address (line 1)", value: v(ad.street) },
                    { label: "Unit / Suite / Apt #", value: v(ad.unit) },
                    { label: "Street Address (line 2)", value: v(ad.street2) },
                    { label: "Country", value: c },
                    { label: "City", value: v(ad.city) },
                    { label: regionLabel(c), value: v(ad.state) },
                    { label: postalLabel(c), value: v(ad.zip) },
                    // Asked on the form; answered by whether an earlier address was needed.
                    { label: "Have you lived at this address for 3 or more years?", value: yn(p.addresses.length === 1) },
                ] : [
                    { label: "Street Address", value: v(ad.street) },
                    { label: "Unit / Suite / Apt #", value: v(ad.unit) },
                    { label: "Country", value: c },
                    { label: "City", value: v(ad.city) },
                    { label: regionLabel(c), value: v(ad.state) },
                    { label: postalLabel(c), value: v(ad.zip) },
                    { label: "Lived here from", value: from },
                    { label: "Lived here to", value: to },
                ],
            };
        }) : [{ fields: [{ label: "Street Address (line 1)", value: NP }] }] },

        // ── 3 ──────────────────────────────────────────────────────────────────
        { title: "Contact Details", groups: [{ fields: [
            { label: "Cell Phone", value: v(p.contact?.cell ?? p.phone) },
            { label: "Confirm Email Address", value: a.email },
            { label: "Preferred method of contact", value: p.contact?.preferred ?? "Primary Phone" },
            { label: "Best time to contact you", value: p.contact?.bestTime ?? "Any" },
        ] }] },

        // ── 4 ──────────────────────────────────────────────────────────────────
        { title: "License Details", groups: p.licenses.length ? p.licenses.map((l, i) => {
            const c = l.country ?? country;
            return {
                label: p.licenses.length > 1 ? `License ${i + 1}` : undefined,
                fields: [
                    { label: "License Number", value: v(l.number) },
                    { label: "Country", value: c },
                    { label: `Issuing ${regionLabel(c)}`, value: v(l.authority) },
                    { label: "License Expiration Date", value: v(l.exp) },
                    // The first licence listed is the one they drive on today.
                    { label: "Is this your current driver license?", value: l.current ?? yn(i === 0) },
                    { label: "Is this a commercial driver license?", value: v(l.cdl) },
                    { label: "License Class", value: v(l.cls) },
                    { label: "DOT Medical Card Expiration Date", value: v(l.medCardExp) },
                    { label: "Endorsements", value: v(l.endorsements) },
                    // Kept under this name because the review card swaps it for the real
                    // front/back tiles by matching on it.
                    { label: "License Images", value: l.frontImage || l.backImage ? "Front & back uploaded" : "Not uploaded" },
                ],
            };
        }) : [{ fields: [{ label: "License Number", value: NP }] }] },

        // ── 5 ──────────────────────────────────────────────────────────────────
        // Citizenship first, because on the form it settles the rest: a US or Canadian
        // citizen needs no work authorization and no visa, and is asked for neither.
        { title: "Travel Documents", groups: [{ fields: [
            { label: "Which country are they a citizen of?", value: v(p.travelDocs?.citizenship ?? p.travelDocs?.passportCountry) },
            { label: "Passport Number", value: v(p.travelDocs?.passport) },
            { label: "Passport Issuing Country", value: v(p.travelDocs?.passportCountry) },
            { label: "Passport Expiration", value: v(p.travelDocs?.passportExp) },
            { label: `Work authorization in ${country}`, value: p.travelDocs?.workPermitType
                || ((p.travelDocs?.citizenship ?? p.travelDocs?.passportCountry) === country ? `Not required — citizen of ${country}` : NP) },
            ...(p.travelDocs?.workPermitType ? [
                { label: "Work permit number", value: v(p.travelDocs?.workPermitNumber) },
                { label: "Work permit expiry", value: v(p.travelDocs?.workPermitExp) },
            ] : []),
            { label: "Holds an entry visa", value: yn(!!p.travelDocs?.visaType) },
            ...(p.travelDocs?.visaType ? [
                { label: "Visa type", value: v(p.travelDocs?.visaType) },
                { label: "Visa number", value: v(p.travelDocs?.visaNumber) },
                { label: "Visa expiry", value: v(p.travelDocs?.visaExp) },
            ] : []),
        ] }] },

        // ── 6 ──────────────────────────────────────────────────────────────────
        // All six questions, each with its answer. One line reading "None reported" stood
        // for six separate attestations a driver signed — and a reviewer cannot tell from
        // it whether the alcohol-offence question was answered at all.
        { title: "License Disqualification", groups: [{ fields: MVR_QUESTIONS
            .filter((q) => !q.showWhen)
            .map((q) => {
                const hit = p.disqualification?.find((r) => r.label === q.id || r.label === q.label);
                return { label: q.label, value: hit ? `Yes — ${hit.detail}` : "No" };
            }) }] },

        // ── 7 ──────────────────────────────────────────────────────────────────
        { title: "Driving Experience", groups: p.drivingExperience?.length ? p.drivingExperience.map((d, i) => {
            const [from, to] = ends(d.dates);
            return {
                label: p.drivingExperience!.length > 1 ? `Experience ${i + 1}` : undefined,
                fields: [
                    { label: "Equipment Class", value: v(d.equipment) },
                    { label: "Freight Types", value: v(d.freight) },
                    { label: "Driving Regions", value: v(d.regions) },
                    { label: "From date", value: from },
                    { label: "To date", value: to },
                    { label: "Approximate miles", value: v(d.miles) },
                    { label: "Owner-operator on this experience?", value: v(d.ownerOperator) },
                ],
            };
        }) : [{ fields: [{ label: "Equipment Class", value: NP }] }] },

        // ── 8 ──────────────────────────────────────────────────────────────────
        { title: "Employment Details", groups: [
            { fields: [{ label: "Have you been employed, contracted, or attended a company orientation in the last 3 years?", value: yn(p.employment.length > 0) }] },
            ...p.employment.map((e, i) => {
                const [start, end] = ends(e.dates);
                const c = e.country ?? country;
                return {
                    label: p.employment.length > 1 ? `Employer ${i + 1}` : "Employer",
                    fields: [
                        { label: "Company Name", value: v(e.employer) },
                        { label: "Start Date", value: start },
                        { label: "End Date", value: end },
                        { label: "Position Held", value: v(e.position) },
                        { label: "Telephone", value: v(e.telephone) },
                        { label: "Street Address", value: v(e.addr1) },
                        { label: "Street Address (line 2)", value: v(e.addr2) },
                        { label: "Country", value: c },
                        { label: "City", value: v(e.city) },
                        { label: regionLabel(c), value: v(e.state) },
                        { label: postalLabel(c), value: v(e.zip) },
                        { label: "Reason for leaving?", value: v(e.reason) },
                        { label: "Were you terminated / discharged / laid off?", value: v(e.terminated) },
                        { label: "Is this your current employer?", value: v(e.current) },
                        { label: "Did you operate a commercial motor vehicle?", value: v(e.operatedCMV) },
                        { label: "Were you subject to FMCSRs while employed?", value: v(e.fmcsr) },
                        { label: "Was your job designated as a Safety-Sensitive function in any DOT-regulated mode subject to the drug and alcohol testing requirements of 49 CFR Part 40?", value: v(e.safetySensitive) },
                        ...(e.verifications ? [{ label: "Verification (ask at hiring)", value: e.verifications }] : []),
                    ],
                };
            }),
        ] },

        // ── 9 ──────────────────────────────────────────────────────────────────
        { title: "Employment Gaps", groups: [
            { fields: [{ label: "Were there any gaps in your employment during the last 3 years?", value: yn(!!p.unemployment?.length) }] },
            ...(p.unemployment ?? []).map((u, i) => {
                const [start, end] = ends(u.dates);
                return {
                    label: (p.unemployment ?? []).length > 1 ? `Gap ${i + 1}` : "Gap",
                    fields: [
                        { label: "Start Date", value: start },
                        { label: "End Date", value: end },
                        { label: "Comments", value: v(u.comments) },
                    ],
                };
            }),
        ] },

        // ── 10 ─────────────────────────────────────────────────────────────────
        { title: "Education Details", groups: [
            { fields: [{ label: "Have you attended a school (not related to truck driving) in the last 3 years?", value: yn(p.education.length > 0) }] },
            ...p.education.map((s, i) => {
                const [start, end] = ends(s.dates);
                return {
                    label: p.education.length > 1 ? `School ${i + 1}` : "School",
                    fields: [
                        { label: "School name", value: v(s.school) },
                        { label: "Start Date", value: start },
                        { label: "End Date", value: end },
                        { label: "City", value: v(s.city) },
                        { label: "State / Province", value: v(s.state) },
                        { label: "Country", value: v(s.country) },
                        { label: "Telephone", value: v(s.telephone) },
                        { label: "What did you study? (accounting, mechanic, etc.)", value: v(s.study) },
                        { label: "Graduation Date (leave blank if no graduation)", value: v(s.graduation) },
                    ],
                };
            }),
        ] },

        // ── 11 ─────────────────────────────────────────────────────────────────
        { title: "Accident Details", groups: [
            { fields: [{ label: "Were you involved in any accidents/incidents with any vehicle in the last 5 years (even if not at fault)?", value: yn(accidents.length > 0) }] },
            ...accidents.map((r, i) => ({
                label: accidents.length > 1 ? `Accident ${i + 1}` : "Accident",
                fields: [
                    { label: "Type of Accident / Incident", value: r.label },
                    { label: "Please enter detailed information about this accident", value: r.detail },
                ],
            })),
        ] },

        // ── 12 ─────────────────────────────────────────────────────────────────
        { title: "Traffic Violation Details", groups: [
            { fields: [{ label: "Have you had any moving violations or traffic convictions in the past 3 Years?", value: yn(violations.length > 0) }] },
            ...violations.map((r, i) => ({
                label: violations.length > 1 ? `Violation ${i + 1}` : "Violation",
                fields: [
                    { label: "Charge / Description", value: r.label },
                    { label: "Comments", value: r.detail },
                ],
            })),
        ] },

        // ── 13 ─────────────────────────────────────────────────────────────────
        { title: "Military Service", groups: [{ fields: p.military ? [
            { label: "Were you ever in the military?", value: "Yes" },
            { label: "Country", value: v(p.military.country) },
            { label: "Branch of Service", value: v(p.military.branch) },
            { label: "Start Date", value: v(p.military.from) },
            { label: "End Date", value: v(p.military.to) },
            { label: "Rank at discharge", value: v(p.military.rank) },
            { label: "Can you obtain your DD214?", value: p.military.dd214File ? "Yes" : NP },
        ] : [
            { label: "Were you ever in the military?", value: "No" },
        ] }] },

        // ── 14 ─────────────────────────────────────────────────────────────────
        // The declaration re-asks who is signing, which is the point of it: the driver
        // attests that the identity on the form is theirs.
        { title: "Signature & Declarations", groups: [{ fields: [
            { label: "First Name", value: a.firstName },
            { label: "Last Name", value: a.lastName },
            { label: "Middle Name", value: v(p.middleName) },
            { label: "Suffix", value: v(p.suffix) },
            { label: idLabel, value: v(p.idNumber) },
            { label: "Date of Birth", value: v(p.dob) },
            { label: "Email Address", value: a.email },
            { label: "Signed By", value: `${a.firstName} ${a.lastName}` },
            { label: "Date Signed", value: v(p.signedAt) },
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
/*
 * Every document the application asked this applicant for — including the ones they did
 * not supply.
 *
 * This used to return license images and nothing else, so an application that asks for a
 * passport, a visa, a work permit and a discharge certificate showed a reviewer four files
 * and no sign that anything else had been requested. A document that was asked for and
 * never arrived is the single most useful thing on this tab, and it was the one thing the
 * tab could not say.
 *
 * What gets listed is driven by what the applicant was ASKED, which the profile records by
 * holding the number: a passport number means a passport was asked for, so the passport
 * belongs on this list whether or not its scan came with it.
 */
function buildUploads(p: Profile): UploadedFile[] {
    const ups: UploadedFile[] = [];
    const add = (id: string, label: string, category: string, file?: string) =>
        ups.push(file
            ? { id, label, file, category }
            : { id, label, file: "—", category, missing: true });

    p.licenses.forEach((l, i) => {
        const tag = p.licenses.length > 1 ? ` (License ${i + 1})` : "";
        add(`lic-${i}-front`, `License front${tag}`, "License", l.frontImage);
        add(`lic-${i}-back`, `License back${tag}`, "License", l.backImage);
    });

    const t = p.travelDocs;
    if (t?.passport) add("travel-passport", "Passport", "Travel Documents", t.passportFile);
    if (t?.visaNumber || (t?.visaType && t.visaType !== "None")) add("travel-visa", "Visa", "Travel Documents", t.visaFile);
    if (t?.workPermitNumber || (t?.workPermitType && t.workPermitType !== "None")) {
        add("travel-permit", "Work Permit", "Travel Documents", t.workPermitFile);
    }
    if (p.military) add("military-dd214", "Discharge Certificate (DD214)", "Military Service", p.military.dd214File);

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

/** The seeded applicants, exported so the submission shape can be checked outside React. */
export const SEED: Applicant[] = [
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
                { employer: "Roadrunner Freight", position: "OTR Driver", dates: "01-2021 - 03-2024", reason: "Career advancement", telephone: "(555) 900-1200", addr1: "500 Depot St", city: "Springfield", state: "Illinois", zip: "62701", country: "United States", terminated: "No", current: "No", operatedCMV: "Yes", verifications: "Experience Letter" },
                { employer: "Prairie Haul Co.", position: "Regional Driver", dates: "05-2018 - 12-2020", reason: "Relocated", telephone: "(555) 412-7788", addr1: "88 Prairie Rd", city: "Peoria", state: "Illinois", zip: "61602", country: "United States", terminated: "No", current: "No", operatedCMV: "Yes", verifications: "Insurance Experience Letter" },
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
        {
            id: "a2", firstName: "Marcus", lastName: "Reed", email: "marcus.reed@example.com", formId: "local", carrier: "Acme Logistics", carrierId: "acct-001", template: "Fast-Track Hiring", status: "submitted", stepsDone: 12, stepsTotal: 12, invitedAt: "Jun 4, 2026", updatedAt: NOW - 2 * H, position: "Local Driver", phone: "(773) 555-0192",
            // Road test already conducted — Step 2 shows the completed view with a filled, viewable evaluation.
            docs: { "road-test": "received" },
            roadTest: {
                examiner: "Ravi Sharma", examinerRole: "Road Test Examiner", examinerEmail: "ravi.sharma@acmetrucking.com", assignedAt: NOW - 2 * D, method: "certify",
                documents: [
                    { label: "Certificate of Road Test (§391.31)", kind: "certificate" },
                    { label: "Additional document", fileName: "medical-card.pdf", kind: "additional" },
                ],
                formValues: {
                    "f-ats-rt-driver": "Marcus Reed", "f-ats-rt-address": "920 Oak Street, Joliet, Illinois 60435", "f-ats-rt-ssn": "***-**-7781",
                    "f-ats-rt-license": "R8821-1140-22", "f-ats-rt-state": "Illinois", "f-ats-rt-class": "Class B",
                    "f-ats-rt-tractor": "Freightliner M2 106", "f-ats-rt-trailer": "26' Box / Straight Truck", "f-ats-rt-length": "75 minutes",
                    "f-ats-rt-miles-from": "Joliet Terminal", "f-ats-rt-miles-to": "Bolingbrook DC", "f-ats-rt-weather": "Clear, dry",
                    "f-ats-rt-start": "09:00", "f-ats-rt-finish": "10:15", "f-ats-rt-date": "2026-06-18",
                    "f-ats-rt-ev1-score": 4, "f-ats-rt-ev2-score": 5, "f-ats-rt-ev3-score": 4,
                    "f-ats-rt-qualified": ["Straight Truck"],
                    "f-ats-rt-cert-driver": "Marcus Reed", "f-ats-rt-cert-ssn": "***-**-7781", "f-ats-rt-cert-license": "R8821-1140-22", "f-ats-rt-cert-state": "Illinois",
                    "f-ats-rt-power-unit": "Freightliner M2 106", "f-ats-rt-trailer-type": "26' Box / Straight Truck", "f-ats-rt-cert-date": "2026-06-18", "f-ats-rt-approx-miles": "18",
                    "f-ats-rt-examiner": "Ravi Sharma", "f-ats-rt-examiner-title": "Road Test Examiner", "f-ats-rt-examiner-date": "2026-06-18",
                    "f-ats-rt-org": "Acme Logistics · 1240 Logistics Way, Aberdeen, MD 21001",
                    "f-ats-rt-equiv-method": "Road test conducted (§391.31)",
                },
            },
        },
        {
            phone: "(773) 555-0192", dob: "07/22/1991", idNumber: "***-**-7781",
            addresses: [{ street: "920 Oak Street", city: "Joliet", state: "Illinois", zip: "60435", dates: "2019 - present" }],
            licenses: [{ number: "R8821-1140-22", cls: "Class B", authority: "Illinois", exp: "11-30-2028", cdl: "Yes", endorsements: "None", frontImage: "marcus-license-front.jpg", backImage: "marcus-license-back.jpg" }],
            employment: [{ employer: "Midwest Distribution", position: "Local Delivery Driver", dates: "06-2019 - 05-2024", reason: "Seeking local route", telephone: "(773) 444-9080", addr1: "1400 Industrial Ave", city: "Joliet", state: "Illinois", zip: "60436", country: "United States", terminated: "No", current: "No", operatedCMV: "Yes", verifications: "Employer Experience Letter, Insurance Experience Letter" }],
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
            /*
             * A cross-border driver IS asked for travel documents — that is what the step is
             * for — and this one has completed all twelve. Her file carried none, so the
             * section read "Not provided" nine times on an approved application. The permit
             * scan is deliberately absent: a reviewer should be able to see the difference
             * between a document that was not asked for and one that never arrived.
             */
            travelDocs: {
                passport: "C04129886", passportCountry: "Canada", passportExp: "11/04/2031",
                passportFile: "nguyen-passport.pdf",
                visaType: "None", visaNumber: "", visaExp: "",
                workPermitType: "FAST / TN", workPermitNumber: "TN-88143-WA", workPermitExp: "06/30/2028",
            },
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
    ...onboardingSeed(),
];

// ── Hired drivers currently in Onboarding ────────────────────────────────────
// Approved applicants (status "approved") with an onboarding state at various
// stages, so the Onboarding monitor list has real data to work with.
function onboardingSeed(): Applicant[] {
    // Each seeded driver is assigned a concrete workflow; their signed sets are
    // built from THAT workflow so the workflow-driven steps show real progress.
    const WF_FOR: Record<string, string> = { us: "onbwf-us", canada: "onbwf-canada", "cross-border": "onbwf-owner-op", local: "onbwf-standard" };
    const passResults = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, { score: 20, total: 20, passed: true, at: NOW - 3 * D }]));
    const passAttempts = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, 1]));
    const review = { by: ACTOR, role: "Hiring Manager", date: "2026-07-06", at: NOW - 1 * D };

    const mk = (id: string, first: string, last: string, carrier: string, carrierId: string, position: string, formId: string, phone: string, invitedAt: string,
        stage: "start" | "policy" | "mid" | "complete") => {
        const wfId = WF_FOR[formId] ?? "onbwf-standard";
        const wf = getOnbWorkflow(wfId);
        const onb: OnboardingState = { startedAt: NOW - 4 * D, workflowId: wfId };
        if (wf) {
            if (stage === "policy" || stage === "mid" || stage === "complete") onb.signedContracts = [...wf.policyForms];
            if (stage === "mid" || stage === "complete") { onb.signedForms = [...wf.forms]; onb.signedDocs = [...wf.documents]; onb.quizResults = passResults(wf.quizzes); onb.quizAttempts = passAttempts(wf.quizzes); }
            const training = (st: AssignedTraining["status"], at: number) => wf.trainings.map((id) => makeAssignedTraining(id, st, at)).filter((t): t is AssignedTraining => !!t);
            if (stage === "mid") onb.trainings = training("assigned", NOW - 2 * D).map((t, i) => (i === 0 ? { ...t, status: "in_progress" } : t));
            if (stage === "complete") onb.trainings = training("completed", NOW - 1 * D);
            if (stage === "complete") onb.reviews = { checklist: review };
        }
        return seedApplicant({ id, firstName: first, lastName: last, email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`, formId, carrier, carrierId, template: "Complete Driver Hiring (Default)", status: "approved", stepsDone: 12, stepsTotal: 12, invitedAt, updatedAt: NOW - 1 * D, position, phone, onboarding: onb });
    };

    return [
        mk("onb1", "Ethan", "Brooks", "Acme Logistics", "acct-001", "OTR Driver", "us", "(312) 555-0201", "Jun 20, 2026", "start"),
        mk("onb2", "Maria", "Lopez", "Acme Logistics", "acct-001", "Regional Driver", "us", "(312) 555-0202", "Jun 18, 2026", "policy"),
        mk("onb3", "David", "Kim", "Acme Logistics", "acct-001", "Local Driver", "local", "(312) 555-0203", "Jun 15, 2026", "mid"),
        mk("onb4", "Aisha", "Rahman", "Acme Logistics", "acct-001", "OTR Driver", "us", "(312) 555-0204", "Jun 10, 2026", "complete"),
        mk("onb5", "Liam", "Carter", "Cascade Freight", "acct-002", "Cross-Border Driver", "cross-border", "(206) 555-0205", "Jun 17, 2026", "policy"),
    ];
}

/*
 * v19: the submission now mirrors the application form — its fourteen steps, in their
 * order, including the two the review never showed. The retitling below carries headings
 * across, but it cannot invent sections an older stored submission was never built with,
 * so the seed is rebuilt once here rather than leaving demo applicants half-migrated.
 */
/*
 * v20: the fields inside every section were reconciled with the form's own questions, so a
 * stored application carries answers under labels the form no longer uses. The retitle
 * migration below can move a heading; it cannot rebuild a section's fields, so this one
 * reseeds.
 */
const KEY = "hp_applicants_v20";

function read(): Applicant[] {
    if (typeof window === "undefined") return SEED;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return SEED;
        const list = JSON.parse(raw) as Applicant[];
        /*
         * Headings drift; stored applications do not.
         *
         * Every one of these was a section whose title changed to match the step the form
         * actually asks, and an application submitted before the change carries the old
         * heading in its stored submission. They are retitled on read rather than reseeded,
         * which keeps every applicant and their answers.
         *
         * Sections the form gained are NOT back-filled here — an old application genuinely
         * was not asked those questions, and inventing an empty "Accident Details" on it
         * would claim it was.
         */
        const RETITLED: Record<string, string> = {
            "Unemployment History": "Employment Gaps",
            "Contact": "Contact Details",
            "Address History": "Address Details",
            "Employment History": "Employment Details",
            "Education": "Education Details",
            "Signature": "Signature & Declarations",
        };
        for (const a of list) {
            for (const s of a.submission ?? []) {
                const next = RETITLED[s.title];
                if (next) s.title = next;
            }
        }
        return list;
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

/**
 * The patch a status change makes, wherever it is made from.
 *
 * The list rows, the phone cards and the applicant header all change status, and each of
 * them used to hand `{ status }` to `updateOne` and let it invent an entry reading "Status
 * changed to Approved" — which says less than the seeded trail beside it ("Application
 * approved"), and could not carry a reason at all. One function now, so the entry a reader
 * sees does not depend on which control was used.
 */
export function statusPatch(prev: Applicant, status: AppStatus, reason?: string): Partial<Applicant> {
    const now = Date.now();
    const detail = reason?.trim() || undefined;
    return {
        status,
        updatedAt: now,
        events: [
            { id: `e-${now}`, type: status, text: EVENT_TEXT[status], detail, at: now, author: ACTOR },
            ...prev.events,
        ],
    };
}

/** Every applicant, outside a component — for linking a driver back to their hiring file. */
export function readApplicants(): Applicant[] { return read(); }

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
