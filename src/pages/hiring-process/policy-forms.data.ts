// ── Policy / consent / statement forms ──────────────────────────────────────
// These are signed agreements: fixed legal text + optional Yes/No questions +
// a signature block. They are rendered generically by PolicyForm.tsx.

export type PolicyBlock =
    | { p: string }            // paragraph
    | { h: string }            // bold sub-heading
    | { ol: string[] }         // numbered list
    | { ul: string[] }         // bullet list
    | { note: string };        // emphasized note (colored)

export type PolicyField = { key: string; label: string; kind?: "text" | "date" | "state" | "sign" };
export type PolicyQuestion = { key: string; text: string };
export type PolicyTheme = "teal" | "blue" | "orange";

export interface PolicyFormDef {
    id: string;
    title: string;          // first line (dark)
    accentTitle: string;    // second line (themed colour)
    theme: PolicyTheme;
    blurb: string;          // short edit-mode helper
    intro?: PolicyField[];  // inline fields shown before the body (e.g. "I, ____")
    questionsTitle?: string;
    questions?: PolicyQuestion[];
    note?: string;          // emphasized note under the questions
    body: PolicyBlock[];
    fields?: PolicyField[];  // mid-form fields (licence / state / expiration)
    fieldsTitle?: string;
    onDuty?: boolean;        // render the §395.8 7-day on-duty grid
    signers: PolicyField[];  // signature block
    sample?: Record<string, string>; // fill-sample values keyed by field/question key
}

const SIGN_DATE: PolicyField[] = [
    { key: "signature", label: "Applicant Signature", kind: "sign" },
    { key: "date", label: "Date", kind: "date" },
];
const FULL_SIGN_BLOCK: PolicyField[] = [
    { key: "signature", label: "Applicant Signature", kind: "sign" },
    { key: "date", label: "Date", kind: "date" },
    { key: "printName", label: "Print Name", kind: "text" },
    { key: "ssn", label: "Social Security #", kind: "text" },
    { key: "witness", label: "Employer Witness", kind: "sign" },
    { key: "title", label: "Title", kind: "text" },
];

export const POLICY_FORMS: PolicyFormDef[] = [
    {
        id: "fcra-disclosure",
        title: "Fair Credit Reporting Act",
        accentTitle: "Disclosure Statement",
        theme: "teal",
        blurb: "FCRA §604(b)(2)(A) disclosure that consumer reports may be obtained for employment purposes.",
        body: [
            { p: "In accordance with the provisions of Section 604 (b)(2)(A) of the Fair Credit Reporting Act, Public Law 91-508, as amended by the Consumer Credit Reporting Act of 1996 (Title II, Subtitle D, Chapter I, of Public Law 104-208), you are being informed that reports verifying your previous employment, previous drug and alcohol test results, and your driving record may be obtained on you for employment purposes. Your employer may obtain this information from Equifax, TransUnion, Experian or other vendors of information services." },
        ],
        signers: FULL_SIGN_BLOCK,
        sample: { printName: "Jane Doe", ssn: "***-**-4471", date: "2026-05-22", title: "Safety Manager" },
    },
    {
        id: "license-compliance",
        title: "Certification of Compliance With",
        accentTitle: "Driver License Requirements",
        theme: "teal",
        blurb: "FMCSR Parts 383 & 391 single-license certification signed by the driver.",
        body: [
            { h: "MOTOR CARRIER INSTRUCTIONS:" },
            { p: "The requirements in Part 383 apply to every driver who operates in intrastate, interstate, or foreign commerce and operates a vehicle weighing 26,001 pounds or more, can transport more than 15 people, or transports hazardous materials that require placarding." },
            { p: "The requirements in Part 391 apply to every driver who operates in interstate commerce and operates a vehicle weighing 10,001 pounds or more, can transport more than 15 people, or transports hazardous materials that require placarding." },
            { h: "DRIVER REQUIREMENTS:" },
            { p: "Parts 383 and 391 of the Federal Motor Carrier Safety Regulations contain some requirements that you as a driver must comply with. These requirements are in effect as of July 1, 1987. They are as follows:" },
            { ol: [
                "You, as a commercial vehicle driver, may not possess more than one license.",
                "If you currently have more than one license, you should keep the license from your state of residence, and return the additional licenses to the states that issued them. Destroying a license does not close the record in the state that issued it; you must notify the state. If a multiple license has been lost, stolen, or destroyed, you should close your record by notifying the state of issuance that you no longer want to be licensed by that state.",
                "Sections 392.42 and 383.33 of the Federal Motor Carrier Safety Regulations require that you notify your employer the NEXT BUSINESS DAY of any revocation or suspension of your driver's license. In addition, Section 383.31 requires that any time you violate a state or local traffic law (other than parking), you must report it to your employing motor carrier and the state that issued your license within 30 days.",
            ] },
            { h: "DRIVER CERTIFICATION:" },
            { p: "I certify that I have read and understand the above requirements. The following license is the only one I will possess:" },
        ],
        fieldsTitle: "License",
        fields: [
            { key: "licenseNumber", label: "Driving License #", kind: "text" },
            { key: "state", label: "State", kind: "state" },
            { key: "expiration", label: "Expiration", kind: "date" },
        ],
        signers: [
            { key: "signature", label: "Driver Signature", kind: "sign" },
            { key: "date", label: "Date", kind: "date" },
        ],
        sample: { licenseNumber: "D1234-5678-90", state: "Illinois", expiration: "2028-05-20", date: "2026-05-22" },
    },
    {
        id: "on-duty-hours",
        title: "Driver Statement of",
        accentTitle: "On-Duty Hours",
        theme: "teal",
        blurb: "§395.8(j)(2) signed statement of the prior 7 days on-duty and last relief time.",
        body: [
            { h: "INSTRUCTIONS:" },
            { p: "Motor carriers, when using a driver for the first time, must obtain from the driver a signed statement giving the total time on-duty during the immediately preceding 7 days and the time at which the driver was last relieved from duty prior to beginning work for the carrier, as required by Section 395.8(j)(2) of the Federal Motor Carrier Safety Regulations." },
            { p: "This form should be completed on the day the driver is scheduled to begin driving a commercial motor vehicle, and must be kept on file for at least 6 months." },
        ],
        onDuty: true,
        signers: [
            { key: "signature", label: "Signature", kind: "sign" },
            { key: "date", label: "Date", kind: "date" },
        ],
        sample: { driverName: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Illinois", lastTime: "18:00", lastOn: "2026-05-21", date: "2026-05-22" },
    },
    {
        id: "other-compensated-work",
        title: "Driver Certification for",
        accentTitle: "Other Compensated Work",
        theme: "teal",
        blurb: "Driver certifies whether they perform / intend to perform compensated work for another employer.",
        questionsTitle: "PLEASE ANSWER QUESTIONS",
        questions: [
            { key: "q1", text: "Are you currently working for another employer?" },
            { key: "q2", text: "At this time do you intend to work for another employer while still employed by this carrier?" },
        ],
        body: [
            { p: "I hereby certify that the information given above is true and I understand that once I become employed with this company, if I begin working for any additional employer(s) for compensation that I must inform this company immediately of such employment activity." },
        ],
        signers: SIGN_DATE,
        sample: { q1: "No", q2: "No", date: "2026-05-22" },
    },
    {
        id: "mvr-release",
        title: "MVR Release",
        accentTitle: "Consent Form",
        theme: "blue",
        blurb: "Driver Privacy Protection Act (18 USC 2721) written consent to release Motor Vehicle Records.",
        intro: [
            { key: "company", label: "Company name", kind: "text" },
            { key: "applicant", label: "Applicant name", kind: "text" },
        ],
        body: [
            { p: "In conjunction with my potential employment at {company} (“the company”), I {applicant} (applicant) consent to the release of my Motor Vehicle Records (MVR) to the company. I understand the company will use these records to evaluate my suitability to fulfill driving duties that may be related to the position for which I am applying. I also consent to the review, evaluation, and other use of any MVR I may have provided to the company." },
            { p: "This consent is given in satisfaction of Public Law 18 USC 2721 et. Seq., “Federal Drivers Privacy Protection Act”, and is intended to constitute “written consent” as required by this Act." },
        ],
        signers: [
            { key: "signature", label: "Applicant Signature", kind: "sign" },
            { key: "date", label: "Date", kind: "date" },
            { key: "licenseNumber", label: "Driving License #", kind: "text" },
            { key: "state", label: "State", kind: "state" },
        ],
        sample: { company: "Acme Trucking Inc.", applicant: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Illinois", date: "2026-05-22" },
    },
    {
        id: "clearinghouse-consent",
        title: "Consent for Queries of the",
        accentTitle: "FMCSA Drug and Alcohol Clearinghouse",
        theme: "blue",
        blurb: "General consent for limited Clearinghouse queries throughout employment.",
        intro: [{ key: "applicant", label: "Applicant name", kind: "text" }],
        body: [
            { p: "I, {applicant}, hereby provide consent to conduct a limited query of the FMCSA Commercial Driver's License Drug and Alcohol Clearinghouse (Clearinghouse) to determine whether drug or alcohol violation information about me exists in the Clearinghouse." },
            { p: "This consent applies to any and all Drug and Alcohol Clearinghouse queries that may be conducted throughout the duration of my employment relationship with this motor carrier." },
            { p: "I understand that if the limited query conducted indicates that drug or alcohol violation information about me exists in the Clearinghouse, the FMCSA will not disclose that information to this company without first obtaining additional specific consent from me." },
            { p: "I further understand that if I refuse to provide consent for this motor carrier to conduct a limited query of the Clearinghouse, then the company must prohibit me from performing safety-sensitive functions, including driving a commercial motor vehicle, as required by the FMCSA's drug and alcohol program regulations." },
        ],
        signers: [
            { key: "signature", label: "Applicant Signature", kind: "sign" },
            { key: "date", label: "Date", kind: "date" },
            { key: "licenseNumber", label: "Driving License #", kind: "text" },
            { key: "state", label: "State", kind: "state" },
        ],
        sample: { applicant: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Illinois", date: "2026-05-22" },
    },
    {
        id: "substance-consent-release",
        title: "Alcohol and Controlled Substance",
        accentTitle: "Consent and Release",
        theme: "orange",
        blurb: "Applicant consent & release to alcohol / controlled-substance testing as a condition of employment.",
        questionsTitle: "APPLICANT MUST ANSWER:",
        questions: [
            { key: "q1", text: "Have you ever refused to be tested for drugs or alcohol?" },
            { key: "q2", text: "Have you ever tested positive for drugs or alcohol?" },
            { key: "q3", text: "Have you ever tested positive for any pre-employment drug or alcohol test for a job which you applied for but did not obtain?" },
        ],
        note: "If ‘Yes’ to any of the above questions, applicant must attach a statement of explanation and provide proof of Return to Duty Process.",
        body: [
            { p: "I understand that, as required by the Federal Motor Carrier Safety Regulations or company policy, all drivers must submit to alcohol and controlled-substance testing as a condition of employment. I also understand that any offer of employment will be contingent upon the results of an alcohol and controlled substance test." },
            { p: "Applicants for positions that require driving a commercial motor vehicle (CMV) requiring a CDL at any time will be required to undergo controlled substances and at our discretion, alcohol testing prior to employment and will be subject to further testing throughout their period of employment." },
            { p: "The company's policy is that if a person has ever been in violation of the rules in part 40 (DOT) or 382 (FMCSA) they will NOT be considered eligible for any job which includes operation of a CMV (Greater than 10,000 GVWR) unless they have completed the return to duty process." },
            { p: "CDL drivers will be subject to random and reasonable suspicion drug testing each day they report for work." },
            { p: "Therefore, I agree to submit to the following alcohol and controlled substance tests in accordance and as defined by the Federal Motor Carrier Safety Regulation and this company's policies:" },
            { ul: ["Pre-Employment, to determine employment eligibility", "Random", "Reasonable Suspicion", "Post Accident", "Follow Up (see company policy)", "Return-to-duty (see company policy)"] },
            { p: "I certify that I have read, understand, and agree to abide by the condition of this consent and release form." },
            { note: "Failure to sign this form will prevent this employer from using you as a CMV driver." },
        ],
        signers: FULL_SIGN_BLOCK,
        sample: { q1: "No", q2: "No", q3: "No", printName: "Jane Doe", ssn: "***-**-4471", date: "2026-05-22", title: "Safety Manager" },
    },
];

export const THEME_HEX: Record<PolicyTheme, string> = { teal: "#0d9488", blue: "#2563eb", orange: "#ea580c" };
