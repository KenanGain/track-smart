// ── Policy / consent / statement forms ──────────────────────────────────────
// These are signed agreements: fixed legal text + optional Yes/No questions +
// a signature block. They are rendered generically by PolicyForm.tsx.

// A nested list item — sub-items render with a deeper marker style
// (decimal → lower-roman → upper-alpha) so forms like the Drug & Alcohol
// Certificate of Receipt (12 items → i–vii → A–D) render faithfully.
export type ListItem = { text: string; sub?: ListItem[] };

export type PolicyBlock =
    | { p: string }            // paragraph
    | { h: string }            // bold sub-heading
    | { ol: string[] }         // numbered list
    | { ul: string[] }         // bullet list
    | { list: ListItem[] }     // nested / lettered list
    | { callout: string; tone?: "notice" | "info" }   // boxed, tinted disclosure/notice
    | { note: string };        // emphasized note (colored)

export type PolicyField = { key: string; label: string; kind?: "text" | "date" | "state" | "sign" | "choice"; options?: string[] };
export type PolicyQuestion = { key: string; text: string };
export type PolicyTheme = "teal" | "blue" | "orange";

// A labelled group of fill-in fields with optional intro text — used by forms
// (like the §40.25(g) records-release authorization) that collect several
// distinct parties' details rather than a single flat field block.
export type PolicySection = { title: string; note?: string; fields: PolicyField[] };

export interface PolicyFormDef {
    id: string;
    title: string;          // first line (dark)
    accentTitle: string;    // second line (themed colour)
    theme: PolicyTheme;
    kind?: "consent" | "policy"; // "policy" = company/FMCSA policy document (Onboarding), not an application consent
    blurb: string;          // short edit-mode helper
    intro?: PolicyField[];  // inline fields shown before the body (e.g. "I, ____")
    questionsTitle?: string;
    questions?: PolicyQuestion[];
    note?: string;          // emphasized note under the questions
    body: PolicyBlock[];
    fields?: PolicyField[];  // mid-form fields (licence / state / expiration)
    fieldsTitle?: string;
    sections?: PolicySection[]; // grouped field blocks (e.g. applicant / previous-employer / prospective-employer)
    onDuty?: boolean;        // render the §395.8 7-day on-duty grid
    signers: PolicyField[];  // signature block
    footer?: string;         // small compliance line under the signature block
    sample?: Record<string, string>; // fill-sample values keyed by field/question key
}

// Standard signature module — identical on every consent form:
// the Signature pad on top, then Print Name beside Date.
const STANDARD_SIGN: PolicyField[] = [
    { key: "signature", label: "Applicant Signature", kind: "sign" },
    { key: "printName", label: "Print Name", kind: "text" },
    { key: "date", label: "Date", kind: "date" },
];
const SIGN_DATE = STANDARD_SIGN;
const FULL_SIGN_BLOCK = STANDARD_SIGN;

export const POLICY_FORMS: PolicyFormDef[] = [
    {
        id: "fcra-disclosure",
        title: "Fair Credit Reporting Act",
        accentTitle: "Disclosure Statement",
        theme: "blue",
        blurb: "FCRA §604(b)(2)(A) disclosure that consumer reports may be obtained for employment purposes.",
        intro: [{ key: "applicant", label: "Applicant name", kind: "text" }],
        body: [
            { p: "I, {applicant}, consent to the collection, use, and disclosure of my personal information by {company} (“the Company”) for the purposes of evaluating my application for employment, verifying the information I have provided, and administering the employment relationship if I am hired." },
            { p: "In accordance with the provisions of Section 604 (b)(2)(A) of the Fair Credit Reporting Act, Public Law 91-508, as amended by the Consumer Credit Reporting Act of 1996 (Title II, Subtitle D, Chapter I, of Public Law 104-208), you are being informed that reports verifying your previous employment, previous drug and alcohol test results, and your driving record may be obtained on you for employment purposes. Your employer may obtain this information from Equifax, TransUnion, Experian or other vendors of information services." },
            { p: "I understand that the Company will protect my personal information with appropriate safeguards and will retain it only as long as necessary for the purposes identified or as required by law." },
        ],
        signers: FULL_SIGN_BLOCK,
        sample: { applicant: "Jane Doe", printName: "Jane Doe", ssn: "***-**-4471", date: "2026-06-05" },
    },
    {
        id: "license-compliance",
        title: "Certification of Compliance With",
        accentTitle: "Driver License Requirements",
        theme: "blue",
        kind: "policy",
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
        sample: { licenseNumber: "D1234-5678-90", state: "Illinois", expiration: "2027-03-04", date: "2026-06-05" },
    },
    {
        id: "insurance-policy",
        title: "Driver Insurance",
        accentTitle: "Policy Acknowledgment",
        theme: "blue",
        kind: "policy",
        blurb: "Driver acknowledges the carrier's insurance coverage requirements and records their insurability details.",
        body: [
            { h: "MOTOR CARRIER INSURANCE POLICY:" },
            { p: "As a condition of operating a commercial motor vehicle for {company} (“the Company”), every driver must be and remain insurable under the Company's motor-vehicle liability and physical-damage insurance. The Company maintains the minimum levels of financial responsibility required by the FMCSA (49 CFR Part 387) and applicable state law." },
            { h: "DRIVER ACKNOWLEDGMENT:" },
            { p: "I understand that my authority to operate a commercial motor vehicle for the Company depends on my remaining insurable under the Company's policy. I authorize the Company to share my driving record and the information below with its insurer for the purpose of determining and maintaining my insurability." },
            { ol: [
                "I will immediately notify the Company of any accident, citation, claim, or change to my driving record or license status that may affect my insurability.",
                "I understand that if the Company's insurer declines to cover me, or rates me as uninsurable, the Company may be unable to continue my employment as a driver.",
                "I certify that the insurance information I have provided below is true and complete to the best of my knowledge.",
            ] },
        ],
        fieldsTitle: "Insurance Details",
        fields: [
            { key: "insurer", label: "Insurance Company", kind: "text" },
            { key: "policyNumber", label: "Policy Number", kind: "text" },
            { key: "coverageType", label: "Coverage Type", kind: "choice", options: ["Liability", "Physical Damage", "Liability + Physical Damage", "Non-Trucking Liability"] },
            { key: "effective", label: "Effective Date", kind: "date" },
            { key: "expiration", label: "Expiration Date", kind: "date" },
        ],
        signers: [
            { key: "signature", label: "Driver Signature", kind: "sign" },
            { key: "date", label: "Date", kind: "date" },
        ],
        sample: { insurer: "Great West Casualty", policyNumber: "GWC-44821-07", coverageType: "Liability + Physical Damage", effective: "2026-01-01", expiration: "2026-12-31", date: "2026-06-05" },
    },
    {
        id: "on-duty-hours",
        title: "Driver Statement of",
        accentTitle: "On-Duty Hours",
        theme: "blue",
        kind: "policy",
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
        sample: { driverName: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Illinois", lastTime: "18:00", lastOn: "2026-05-21", date: "2026-06-05" },
    },
    {
        id: "other-compensated-work",
        title: "Driver Certification for",
        accentTitle: "Other Compensated Work",
        theme: "blue",
        kind: "policy",
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
        sample: { q1: "No", q2: "No", date: "2026-06-05" },
    },
    {
        id: "ctpat-cross-border-security",
        title: "C-TPAT Cross-Border",
        accentTitle: "Security Acknowledgement",
        theme: "blue",
        kind: "policy",
        blurb: "C-TPAT carrier acknowledgement — driver responsibility for shipment security and breach / tamper reporting.",
        body: [
            { p: "The driver must — via satellite, or when not available via telephone — provide detailed information on the breach or tampering. This information should include the following:" },
            { ul: [
                "Location, day, and time the security breach was noticed",
                "Truck or trailer — compartments or structure have been tampered with",
                "Seal tampered with, and whether access to the trailer was gained",
                "Take a photograph whenever possible",
                "Dispatch will record this information and contact the authorities in the local area, or — if en route to the border — notify the A-TCET",
            ] },
            { p: "I, as driver / owner-operator of the company, take full responsibility for ensuring the security of the company’s shipments being hauled across the border. I undertake to perform my duties and obligations seriously as a driver of a C-TPAT carrier. If I have any doubt, questions, or concerns, I will contact dispatch or any other responsible officer for necessary information." },
        ],
        signers: [
            { key: "driverName", label: "Name of the Driver", kind: "text" },
            { key: "driverDate", label: "Date", kind: "date" },
            { key: "driverSignature", label: "Driver signature", kind: "sign" },
            { key: "witnessName", label: "Name of the Witness", kind: "text" },
            { key: "witnessDate", label: "Date", kind: "date" },
            { key: "witnessSignature", label: "Witness signature", kind: "sign" },
        ],
        sample: { driverName: "Jane Doe", driverDate: "2026-06-05", witnessName: "John Smith", witnessDate: "2026-06-05" },
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
        signers: STANDARD_SIGN,
        sample: { company: "Acme Logistics", applicant: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Illinois", date: "2026-06-05" },
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
        signers: STANDARD_SIGN,
        sample: { applicant: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Illinois", date: "2026-06-05" },
    },
    {
        id: "substance-consent-release",
        title: "Alcohol and Controlled Substance",
        accentTitle: "Consent and Release",
        theme: "blue",
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
        sample: { q1: "No", q2: "No", q3: "No", printName: "Jane Doe", ssn: "***-**-4471", date: "2026-06-05", title: "Safety Manager" },
    },
    {
        id: "alcohol-drug-records-release",
        title: "Previous Employer Drug & Alcohol",
        accentTitle: "Testing Records Release Authorization",
        theme: "blue",
        blurb: "§40.25(g) / §391.23(h) authorization to release a previous employer's DOT drug & alcohol testing records — asked for each previous employer where the job was a DOT safety-sensitive function (49 CFR Part 40).",
        sections: [
            {
                title: "Applicant",
                note: "Purpose: this form authorizes a PREVIOUS employer to release my prior DOT alcohol & controlled-substance TESTING RECORDS to the prospective employer named below. (It is separate from the consent to be tested, and from the request to review records.)",
                fields: [
                    { key: "printName", label: "Print Name (First, M.I., Last)", kind: "text" },
                    { key: "ssn", label: "Social Security Number", kind: "text" },
                    { key: "dob", label: "Date of Birth", kind: "date" },
                ],
            },
            {
                title: "Hereby Authorize — Previous Employer",
                note: "To release and forward the information requested by Section 3 of this document concerning my Alcohol and Controlled Substances Testing records within the previous 3 years from the employment application date below.",
                fields: [
                    { key: "prevEmployer", label: "Previous Employer", kind: "text" },
                    { key: "prevEmail", label: "Email", kind: "text" },
                    { key: "prevStreet", label: "Street", kind: "text" },
                    { key: "prevTelephone", label: "Telephone", kind: "text" },
                    { key: "prevCityStateZip", label: "City, State, Zip", kind: "text" },
                    { key: "prevFax", label: "Fax No.", kind: "text" },
                    { key: "appDate", label: "Employment application date", kind: "date" },
                ],
            },
            {
                title: "Release To — Prospective Employer",
                note: "In compliance with §40.25(g) and §391.23(h), release of this information must be made in a written form that ensures confidentiality, such as fax, email, or letter.",
                fields: [
                    { key: "prospEmployer", label: "Prospective Employer", kind: "text" },
                    { key: "prospAttention", label: "Attention", kind: "text" },
                    { key: "prospTelephone", label: "Telephone", kind: "text" },
                    { key: "prospStreet", label: "Street", kind: "text" },
                    { key: "prospCityStateZip", label: "City, State, Zip", kind: "text" },
                    { key: "prospFax", label: "Prospective employer's fax number", kind: "text" },
                    { key: "prospEmail", label: "Prospective employer's email address", kind: "text" },
                ],
            },
        ],
        body: [],
        signers: STANDARD_SIGN,
        footer: "This information is being requested in compliance with §40.25(g) and §391.23.",
        sample: {
            printName: "Jane Doe", ssn: "***-**-4471", dob: "1990-04-12",
            prevEmployer: "Sunrise Freight Lines", prevEmail: "hr@sunrisefreight.com", prevStreet: "1420 Industrial Pkwy",
            prevTelephone: "(555) 412-0098", prevCityStateZip: "Peoria, IL 61602", prevFax: "(555) 412-0099", appDate: "2026-06-05",
            prospEmployer: "Acme Logistics", prospAttention: "Safety Department", prospTelephone: "(555) 900-1200",
            prospStreet: "500 Depot St", prospCityStateZip: "Springfield, IL 62701",
            prospFax: "(555) 900-1201", prospEmail: "safety@acmelogistics.com", date: "2026-06-05",
        },
    },
    {
        id: "sph-records-request",
        title: "Driver's Request to Review",
        accentTitle: "Safety Performance History Records",
        theme: "blue",
        blurb: "§391.23(i)(2) driver's written request to review the safety performance history the prospective employer obtained (Part 1 by the driver, Part 2 by the prospective employer).",
        body: [
            { p: "This request is made by the driver/applicant in compliance with the Department of Transportation regulations." },
            { h: "§391.23(i)(2)" },
            { p: "Drivers who have previous Department of Transportation regulated employment history in the preceding three years, and wish to review previous employer-provided investigative information must submit a written request to the prospective employer, which may be done at any time, including when applying, or as late as thirty (30) days after being employed or being notified of denial of employment. The prospective employer must provide this information to the applicant within five (5) business days of receiving the written request. If the prospective employer has not yet received the requested information from the previous employer(s), then the five-business-days deadline will begin when the prospective employer receives the requested safety-performance history information. If the driver has not arranged to pick up or receive the requested records within thirty (30) days of the prospective employer making them available, the prospective motor carrier may consider the driver to have waived his/her request to review the records." },
        ],
        sections: [
            {
                title: "Part 1 · To — Prospective Employer",
                note: "Completed by the driver/applicant.",
                fields: [
                    { key: "prospEmployer", label: "Prospective Employer", kind: "text" },
                    { key: "prospStreet", label: "Street / P.O. Box", kind: "text" },
                    { key: "prospCityStateZip", label: "City, State, Zip", kind: "text" },
                    { key: "prospTelephone", label: "Telephone #", kind: "text" },
                ],
            },
            {
                title: "Part 1 · From — Driver/Applicant",
                fields: [
                    { key: "driverName", label: "Driver / Applicant", kind: "text" },
                    { key: "ssn", label: "Social Security / I.D. #", kind: "text" },
                    { key: "driverStreet", label: "Street", kind: "text" },
                    { key: "driverCityStateZip", label: "City, State, Zip", kind: "text" },
                    { key: "driverTelephone", label: "Telephone #", kind: "text" },
                ],
            },
            {
                title: "Part 1 · Request & Signature",
                note: "I am submitting this written request to obtain copies of my Department of Transportation Safety Performance History for the preceding three years. I understand, for records requested from a prospective employer, that I must arrange to pick up or receive the requested records within thirty (30) days of the records being made available or I have waived my request to review the records.",
                fields: [
                    { key: "delivery", label: "This information should be:", kind: "choice", options: ["Sent to me at the above address.", "I will arrange to pick up."] },
                    { key: "signature", label: "Driver/Applicant Signature", kind: "sign" },
                    { key: "date", label: "Date", kind: "date" },
                ],
            },
            {
                title: "Part 2 · Completed by the Prospective Employer",
                note: "The information must be provided to the applicant within five (5) business days of receiving the written request. If the prospective employer has not yet received the requested information from the previous employer(s), then the five-business-days deadline will begin when the prospective employer receives the requested safety performance history information.",
                fields: [
                    { key: "suppliedName", label: "Information supplied to — Name", kind: "text" },
                    { key: "suppliedStreet", label: "Street", kind: "text" },
                    { key: "suppliedCityStateZip", label: "City, State, Zip", kind: "text" },
                    { key: "comments", label: "Comments", kind: "text" },
                    { key: "providerSignature", label: "By: Signature / person providing information", kind: "sign" },
                    { key: "providerTelephone", label: "Telephone #", kind: "text" },
                    { key: "releaseDate", label: "Release Date", kind: "date" },
                ],
            },
        ],
        signers: [],
        sample: {
            prospEmployer: "Acme Logistics", prospStreet: "500 Depot St", prospCityStateZip: "Springfield, IL 62701", prospTelephone: "(555) 900-1200",
            driverName: "Jane Doe", ssn: "***-**-4471", driverStreet: "84 Birch Ave", driverCityStateZip: "Peoria, IL 61602", driverTelephone: "(555) 233-7781",
            delivery: "Sent to me at the above address.", date: "2026-06-05",
            suppliedName: "Jane Doe", suppliedStreet: "84 Birch Ave", suppliedCityStateZip: "Peoria, IL 61602",
            comments: "Records for the preceding 3 years provided in full.", providerTelephone: "(555) 900-1200", releaseDate: "2026-06-09",
        },
    },
    {
        id: "sph-investigation-auth",
        title: "Safety Performance History",
        accentTitle: "Investigation Authorization",
        theme: "blue",
        blurb: "Applicant authorization to investigate employment / safety-performance history and release of liability (49 CFR §391.23).",
        body: [
            { p: "I authorize you to make investigations (including contacting current and prior employers) into my personal, employment, financial, medical history, and other related matters as may be necessary in arriving at an employment decision. I hereby release employers, schools, health care providers, and other persons from all liability in responding to inquiries and releasing information in connection with my application." },
            { p: "In the event of employment, I understand that false or misleading information given in my application or interview(s) may result in discharge. I also understand that I am required to abide by all rules and regulations of the Company." },
            { p: "I understand that the information I provide regarding my current and/or prior employers may be used, and those employer(s) will be contacted for the purpose of investigating my safety performance history as required by 49 CFR 391.23. I understand that I have the right to:" },
            { ul: [
                "Review information provided by current/previous employers;",
                "Have errors in the information corrected by previous employers, and for those previous employers to resend the corrected information to the prospective employer; and",
                "Have a rebuttal statement attached to the alleged erroneous information, if the previous employer(s) and I cannot agree on the accuracy of the information.",
            ] },
            { p: "This certifies that I completed this application, and that all entries on it and information in it are true and complete to the best of my knowledge." },
            { note: "Note: A motor carrier may require an applicant to provide more information than that required by the Federal Motor Carrier Safety Regulations." },
        ],
        signers: STANDARD_SIGN,
        sample: { printName: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "psp-disclosure-auth",
        title: "Important Disclosure & Authorization",
        accentTitle: "PSP Online Service Background Reports",
        theme: "blue",
        blurb: "FMCSA Pre-Employment Screening Program (PSP) disclosure + authorization to obtain crash & inspection history. One stand-alone document.",
        body: [
            { callout: "THE BELOW DISCLOSURE AND AUTHORIZATION LANGUAGE IS FOR MANDATORY USE BY ALL ACCOUNT HOLDERS.", tone: "info" },
            { h: "Important Disclosure Regarding Background Reports from the PSP Online Service" },
            { p: "In connection with your application for employment with {prospEmployer} (“Prospective Employer”), Prospective Employer, its employees, agents or contractors may obtain one or more reports regarding your driving, and safety inspection history from the Federal Motor Carrier Safety Administration (FMCSA)." },
            { p: "When the application for employment is submitted in person, if the Prospective Employer uses any information it obtains from FMCSA in a decision to not hire you or to make any other adverse employment decision regarding you, the Prospective Employer will provide you with a copy of the report upon which its decision was based and a written summary of your rights under the Fair Credit Reporting Act before taking any final adverse action. If any final adverse action is taken against you based upon your driving history or safety report, the Prospective Employer will notify you that the action has been taken and that the action was based in part or in whole on this report." },
            { p: "When the application for employment is submitted by mail, telephone, computer, or other similar means, if the Prospective Employer uses any information it obtains from FMCSA in a decision to not hire you or to make any other adverse employment decision regarding you, the Prospective Employer must provide you within three business days of taking adverse action oral, written or electronic notification: that adverse action has been taken based in whole or in part on information obtained from FMCSA; the name, address, and the toll free telephone number of FMCSA; that the FMCSA did not make the decision to take the adverse action and is unable to provide you the specific reasons why the adverse action was taken; and that you may, upon providing proper identification, request a free copy of the report and may dispute with the FMCSA the accuracy or completeness of any information or report. If you request a copy of a driver record from the Prospective Employer who procured the report, then, within 3 business days of receiving your request, together with proper identification, the Prospective Employer must send or provide to you a copy of your report and a summary of your rights under the Fair Credit Reporting Act." },
            { p: "Neither the Prospective Employer nor the FMCSA contractor supplying the crash and safety information has the capability to correct any safety data that appears to be incorrect. You may challenge the accuracy of the data by submitting a request to https://dataqs.fmcsa.dot.gov. If you challenge crash or inspection information reported by a State, FMCSA cannot change or correct this data. Your request will be forwarded by the DataQs system to the appropriate State for adjudication." },
            { p: "Any crash or inspection in which you were involved will display on your PSP report. Since the PSP report does not report, or assign, or imply fault, it will include all Commercial Motor Vehicle (CMV) crashes where you were a driver or co-driver and where those crashes were reported to FMCSA, regardless of fault. Similarly, all inspections, with or without violations, appear on the PSP report. State citations associated with Federal Motor Carrier Safety Regulations (FMCSR) violations that have been adjudicated by a court of law will also appear, and remain, on a PSP report." },
            { p: "The Prospective Employer cannot obtain background reports from FMCSA without your authorization." },
            { h: "Authorization" },
            { p: "If you agree that the Prospective Employer may obtain such background reports, please read the following and sign below:" },
            { p: "I authorize {prospEmployer} (“Prospective Employer”) to access the FMCSA Pre-Employment Screening Program (PSP) system to seek information regarding my commercial driving safety record and information regarding my safety inspection history. I understand that I am authorizing the release of safety performance information including crash data from the previous five (5) years and inspection history from the previous three (3) years. I understand and acknowledge that this release of information may assist the Prospective Employer to make a determination regarding my suitability as an employee." },
            { p: "I have read the above Disclosure Regarding Background Reports provided to me by Prospective Employer and I understand that if I sign this Disclosure and Authorization, Prospective Employer may obtain a report of my crash and inspection history. I hereby authorize Prospective Employer and its employees, authorized agents, and/or affiliates to obtain the information authorized above." },
            { callout: "NOTICE: The prospective employment concept referenced in this form contemplates the definition of “employee” contained at 49 C.F.R. 383.5.", tone: "notice" },
        ],
        signers: STANDARD_SIGN,
        sample: { prospEmployer: "Acme Logistics", printName: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "drug-alcohol-policy-receipt",
        title: "Drug & Alcohol Policy",
        accentTitle: "Certificate of Receipt",
        theme: "blue",
        kind: "policy",
        blurb: "§382 certificate that the driver received the company's controlled-substance & alcohol educational materials and policy.",
        body: [
            { p: "This is to certify I have been provided educational materials that explain the requirements of Part 382 of the Federal Motor Carrier Safety Regulations, regarding the testing of controlled substances and alcohol. I have received information regarding the policies and procedures of this company regarding controlled substance and alcohol testing:" },
            { list: [
                { text: "The identity of the person designated by the employer to answer driver questions about the materials" },
                { text: "The categories of drivers who are subject to the provisions of this part;" },
                { text: "Sufficient information about the safety-sensitive functions performed by those drivers to make clear what period of the work day the driver is required to be in compliance with this part" },
                { text: "Specific information concerning driver conduct that is prohibited by this part" },
                { text: "The circumstances under which a driver will be tested for alcohol and/or controlled substances under this part, including post-accident testing under §382.303(d)" },
                { text: "The procedures that will be used to test for the presence of alcohol and controlled substances, protect the driver and the integrity of the testing processes, safeguard the validity of the test results, and ensure that those results are attributed to the correct driver, including post-accident information, procedures and instructions required by §382.303(d)" },
                { text: "The requirement that a driver submit to alcohol and controlled substances tests administered in accordance with this part" },
                { text: "An explanation of what constitutes a refusal to submit to an alcohol or controlled substances test and the attendant consequences" },
                { text: "The consequences for drivers found to have violated subpart B of this part, including the requirement that the driver be removed immediately from safety-sensitive functions, and the procedures under part 40, subpart O, of this title" },
                { text: "The consequences for drivers found to have an alcohol concentration of 0.02 or greater but less than 0.04" },
                { text: "Information concerning the effects of alcohol and controlled substances use on an individual’s health, work, and personal life; signs and symptoms of an alcohol or a controlled substances problem (the driver’s or a coworker’s); and available methods of intervening when an alcohol or a controlled substances problem is suspected, including confrontation, referral to any employee assistance program and/or referral to management" },
                { text: "The requirement that the following personal information collected and maintained under this part shall be reported to the Clearinghouse:", sub: [
                    { text: "A verified positive, adulterated, or substituted drug test result;" },
                    { text: "An alcohol confirmation test with a concentration of 0.04 or higher;" },
                    { text: "A refusal to submit to any test required by subpart C of this part;" },
                    { text: "An employer’s report of actual knowledge, as defined at §382.107:", sub: [
                        { text: "On duty alcohol use pursuant to §382.205;" },
                        { text: "Pre-duty alcohol use pursuant to §382.207;" },
                        { text: "Alcohol use following an accident pursuant to §382.209; and" },
                        { text: "Controlled substance use pursuant to §382.213;" },
                    ] },
                    { text: "A substance abuse professional (SAP as defined in §40.3 of this title) report of the successful completion of the return-to-duty process;" },
                    { text: "A negative return-to-duty test; and" },
                    { text: "An employer’s report of completion of follow-up testing" },
                ] },
            ] },
        ],
        signers: [
            { key: "signature", label: "Signature", kind: "sign" },
            { key: "date", label: "Date", kind: "date" },
        ],
        sample: { date: "2026-06-05" },
    },
    {
        id: "handbook-acknowledgment",
        title: "Employee Acknowledgment of",
        accentTitle: "Company Policy",
        theme: "blue",
        blurb: "Driver acknowledges receipt of the employee handbook and at-will employment relationship.",
        body: [
            { p: "The employee handbook describes important information about {handbookTopic}, and I understand that I should consult my supervisor or consult the Policies and Procedures Manual regarding any questions not answered in the employee handbook." },
            { p: "Since the information, policies, and benefits described here are necessarily subject to change, I acknowledge that revisions to the employee handbook may occur. All such changes will be communicated in writing by the President, and I understand that revised information may supersede, modify or eliminate existing policies." },
            { p: "I have entered into my employment relationship with {company} voluntarily and acknowledge that there is no specified length of employment. Accordingly, either {terminationParty} or I can terminate the relationship at will, with or without cause, at any time." },
            { p: "Furthermore, I acknowledge that this employee handbook is neither a contract of employment nor a legal document." },
            { p: "I have received the employee handbook, and I understood that it is my responsibility to read and comply with the policies contained in this employee handbook and any revisions made to it." },
        ],
        signers: STANDARD_SIGN,
        sample: { handbookTopic: "the Company’s policies, procedures, and benefits", terminationParty: "the Company", date: "2026-06-05" },
    },
    {
        id: "pipeda-consent",
        title: "Personal Information",
        accentTitle: "Consent (PIPEDA)",
        theme: "blue",
        blurb: "Canada — consent to collect, use and disclose personal information for hiring (Personal Information Protection and Electronic Documents Act).",
        intro: [{ key: "applicant", label: "Applicant name", kind: "text" }],
        body: [
            { p: "I, {applicant}, consent to the collection, use, and disclosure of my personal information by {company} (“the Company”) for the purposes of evaluating my application for employment, verifying the information I have provided, and administering the employment relationship if I am hired." },
            { p: "I understand that my personal information may be collected from, and disclosed to, third parties such as current and former employers, references, educational institutions, licensing and government authorities, and background-check service providers, for the purposes described above." },
            { p: "This consent is given in accordance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and any applicable provincial privacy legislation. I understand that I may withdraw this consent at any time, subject to legal or contractual restrictions and reasonable notice, by contacting the Company, and that withdrawing consent may affect the Company’s ability to consider or continue my employment." },
            { p: "I understand that the Company will protect my personal information with appropriate safeguards and will retain it only as long as necessary for the purposes identified or as required by law." },
        ],
        signers: STANDARD_SIGN,
        sample: { applicant: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "ca-driver-abstract-consent",
        title: "Driver's Abstract",
        accentTitle: "Driving Record Consent",
        theme: "blue",
        blurb: "Canada — written consent to release the provincial Driver's Abstract / CVDR / CDA driving record (counterpart to the US MVR release).",
        intro: [{ key: "applicant", label: "Applicant name", kind: "text" }],
        body: [
            { p: "In conjunction with my application for employment with {company} (“the Company”), I, {applicant}, consent to the release of my provincial Driver’s Abstract / driving record to the Company. I understand the Company will use this record to evaluate my suitability to perform the driving duties related to the position for which I am applying." },
            { p: "I authorize the applicable provincial or territorial licensing authority to release my driving record, including my Commercial Vehicle Driver Record (CVDR) and Commercial Driver Abstract (CDA) where applicable, to the Company and its authorized agents." },
            { p: "I also consent to the review, evaluation, and other use of any driving abstract I may have provided to the Company. This consent is given as written authorization for the release of my driving record under applicable provincial privacy and highway-traffic legislation." },
        ],
        signers: STANDARD_SIGN,
        sample: { applicant: "Jane Doe", licenseNumber: "D1234-5678-90", state: "Ontario", date: "2026-06-05" },
    },
    {
        id: "ca-criminal-record-check",
        title: "Criminal Record Check",
        accentTitle: "Consent",
        theme: "blue",
        blurb: "Consent to a criminal record / background check for the purpose of evaluating the application.",
        intro: [{ key: "applicant", label: "Applicant name", kind: "text" }],
        body: [
            { p: "I, {applicant}, consent to {company} (“the Company”) and its authorized agents conducting a criminal record / background check (including, in Canada, a search of the Canadian Police Information Centre (CPIC) database) for the purpose of evaluating my application for employment." },
            { p: "I understand that the results of this check may be used by the Company in making employment-related decisions, and I release the Company, the police service, and any service provider from liability arising from the lawful collection, use, and disclosure of this information." },
            { p: "I certify that the personal information I have provided to enable this check is true and complete. I understand that I may be required to provide acceptable identification to complete the check, and that a record may require verification of my identity, including fingerprints, in certain circumstances." },
            { note: "A criminal record is not necessarily a bar to employment; results are considered in relation to the duties of the position and applicable law." },
        ],
        signers: STANDARD_SIGN,
        sample: { applicant: "Jane Doe", date: "2026-06-05" },
    },
];

export const THEME_HEX: Record<PolicyTheme, string> = { teal: "#0d9488", blue: "#2563eb", orange: "#ea580c" };

// ── Policy / consent sets per driver type ───────────────────────────────────
// Only the policy forms are used. US-specific statements (FCRA, MVR release,
// clearinghouse, substance) apply to US / cross-border drivers; the universal
// certifications apply to everyone. Report access (PSP / Abstract / CVOR) is
// collected via the hiring-template forms, not as consent signatures.
// NB: "alcohol-drug-records-release" is intentionally NOT here — it is asked
// conditionally, once per previous employer the applicant flagged as a DOT
// safety-sensitive job (49 CFR Part 40). See ConsentPhase.
const US_POLICY = [
    "fcra-disclosure", "mvr-release", "clearinghouse-consent",
    "psp-disclosure-auth", "substance-consent-release",
    "sph-records-request", "sph-investigation-auth",
];
// Form id asked once per safety-sensitive previous employer (driven by the
// application's "DOT safety-sensitive function?" answer per employer).
export const SAFETY_SENSITIVE_RELEASE_ID = "alcohol-drug-records-release";
const UNIVERSAL_POLICY = ["handbook-acknowledgment", "ca-criminal-record-check"];
const CANADA_POLICY = ["pipeda-consent", "ca-driver-abstract-consent"];
const isCanadaType = (id: string) => id === "canada" || id === "canada-owner-operator";

// US-federal report consents — only asked when the driver actually operates in /
// crosses into the United States. Skipped for drivers who stay out of the US.
// (US personal-information consent · MVR · PSP · FMCSA D&A Clearinghouse.)
export const US_FEDERAL_CONSENTS = [
    "fcra-disclosure", "mvr-release", "psp-disclosure-auth", "clearinghouse-consent",
];

// Onboarding policy documents — company / FMCSA policy statements signed during
// onboarding, NOT part of the application consents. Surfaced on the Onboarding
// Setup page rather than the Consent Forms tab.
export const policyDocuments = (): PolicyFormDef[] => POLICY_FORMS.filter((f) => f.kind === "policy");
export const consentForms = (): PolicyFormDef[] => POLICY_FORMS.filter((f) => f.kind !== "policy");

// Ordered list of policy-form ids for a given application/driver type.
// `operatesInUS` (default true) gates the US-federal report consents — when the
// driver does not operate in the US, FCRA / MVR / PSP / Clearinghouse are skipped.
export function consentsForType(typeId: string, operatesInUS = true): string[] {
    const ids = isCanadaType(typeId)
        ? [...UNIVERSAL_POLICY, ...CANADA_POLICY]
        : [...US_POLICY, ...UNIVERSAL_POLICY];
    return operatesInUS ? ids : ids.filter((id) => !US_FEDERAL_CONSENTS.includes(id));
}

// Which region a consent form belongs to — drives the muted tag on the
// Consent Forms list. "All" = universal (signed by every driver type).
export function consentRegion(id: string): "US" | "Canada" | "All" {
    if (CANADA_POLICY.includes(id)) return "Canada";
    if (UNIVERSAL_POLICY.includes(id)) return "All";
    return "US";
}

export function consentDefsForType(typeId: string, operatesInUS = true): PolicyFormDef[] {
    return consentsForType(typeId, operatesInUS)
        .map((id) => POLICY_FORMS.find((f) => f.id === id))
        .filter((f): f is PolicyFormDef => Boolean(f));
}
