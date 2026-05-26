// Driver Application wizard — types, step blueprint, and option constants.
//
// Backs the 13-step applicant-facing form opened from the ATS "Add Applicant"
// action. Intentionally a flat in-memory model — no backend yet.

export type CountryId = 'Canada' | 'United States' | '';

// ── Reusable composite address ────────────────────────────────────────────
// One address shape rendered by the shared `AddressField` component, so every
// place that captures an address (residence history, employer address, …)
// uses the exact same five inputs.

export interface AddressValue {
    street: string;
    unitNumber: string;
    city: string;
    country: CountryId;
    stateProvince: string;
    postalCode: string;
}

export function emptyAddress(): AddressValue {
    return { street: '', unitNumber: '', city: '', country: '', stateProvince: '', postalCode: '' };
}

// ── Per-record types (the "+" list sections) ──────────────────────────────

export interface AddressRecord {
    id: string;
    address: AddressValue;
    fromDate: string;
    toDate: string;
    isCurrent: boolean;
}

export interface LicenseRecord {
    id: string;
    licenseNumber: string;
    licenseClass: string;
    country: CountryId;
    stateProvince: string;
    issueDate: string;
    expiryDate: string;
    endorsements: string[];
    restrictions: string[];
}

export interface DisqualificationRecord {
    id: string;
    offenceTypes: string[];
    disqualificationDate: string;
    durationDays: string;
    explanation: string;
}

export interface AccidentRecord {
    id: string;
    accidentDate: string;
    natureOfAccident: string;
    country: CountryId;
    stateProvince: string;
    locationCity: string;
    fatalities: string;
    injuries: string;
    cargoDamage: boolean;
}

export interface ViolationRecord {
    id: string;
    charge: string;
    issuingAgency: string;
    violationDate: string;
    country: CountryId;
    stateProvince: string;
    city: string;
    penalty: string;
    penaltyAmount: string;
    description: string;
    pointsDeducted: boolean;
}

export interface DrivingExperienceRecord {
    id: string;
    equipmentClass: string;
    freightTypes: string[];
    drivingRegions: string[];
    fromDate: string;
    toDate: string;
    approximateMiles: string;
}

export interface EmploymentRecord {
    id: string;
    employerName: string;
    phone: string;
    address: AddressValue;
    positionHeld: string;
    fromDate: string;
    toDate: string;
    currentlyEmployed: boolean;
    reasonForLeaving: string;
    subjectToFMCSR: boolean;
    safetySensitiveDOT: boolean;
}

export interface EducationRecord {
    id: string;
    schoolName: string;
    city: string;
    stateProvince: string;
    level: string;
    fieldOfStudy: string;
    graduated: boolean;
    completionYear: string;
}

// ── The whole application ─────────────────────────────────────────────────

export interface DriverApplicationForm {
    // 1 — Applicant Information
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    ssn: string;
    legalRightToWorkUS: boolean;
    positionType: string;
    // 2 — Address Details
    currentAddress: AddressValue;
    currentAddressFromDate: string;
    livedHere3PlusYears: boolean;
    addresses: AddressRecord[];
    // 3 — License Details (current license shown in-page; `licenses` holds prior records)
    licenseNumber: string;
    licenseCountry: CountryId;
    licenseStateProvince: string;
    licenseIssueDate: string;
    licenseExpiryDate: string;
    hasEndorsements: boolean;
    endorsements: string[];
    hasRestrictions: boolean;
    restrictions: string[];
    licenseFrontFileName: string;
    licenseBackFileName: string;
    hasOtherLicenses: boolean;
    licenses: LicenseRecord[];
    // 4 — License Disqualification Details
    everDeniedLicense: boolean;
    denialDetails: string;
    disqualifications: DisqualificationRecord[];
    // 5 — Accident Details
    hasAccidentHistory: boolean;
    accidents: AccidentRecord[];
    // 6 — Violation Details
    hasViolationHistory: boolean;
    violations: ViolationRecord[];
    // 7 — Medical Details
    hasValidMedCert: boolean;
    medCertNumber: string;
    medExaminerName: string;
    medRegistryNumber: string;
    medCertIssueDate: string;
    medCertExpiryDate: string;
    medicalConditions: string;
    // 8 — Driving Experience
    drivingExperience: DrivingExperienceRecord[];
    // 9 — Employment Details
    employment: EmploymentRecord[];
    // 10 — Education Details
    education: EducationRecord[];
    // 11 — Cross Border Details
    crossesBorder: boolean;
    fastCardNumber: string;
    fastCardExpiry: string;
    passportNumber: string;
    passportCountry: string;
    passportExpiry: string;
    hasTwicCard: boolean;
    twicCardNumber: string;
    twicCardExpiry: string;
    // 12 — Additional Details & Documents
    emergencyContactName: string;
    emergencyContactPhone: string;
    emergencyContactRelationship: string;
    referralSource: string;
    additionalNotes: string;
    // 13 — Acknowledgment
    certified: boolean;
    signatureDataUrl: string | null;
    signaturePrintName: string;
    signatureDate: string;
}

// ── Step blueprint ────────────────────────────────────────────────────────
// Labels keep their literal casing so the progress tracker matches the
// product (steps 11 and 13 are deliberately mixed-case there).

export const APPLICATION_STEPS: { id: number; label: string }[] = [
    { id: 1,  label: 'APPLICANT INFORMATION' },
    { id: 2,  label: 'ADDRESS DETAILS' },
    { id: 3,  label: 'LICENSE DETAILS' },
    { id: 4,  label: 'LICENSE DISQUALIFICATION DETAILS' },
    { id: 5,  label: 'ACCIDENT DETAILS' },
    { id: 6,  label: 'VIOLATION DETAILS' },
    { id: 7,  label: 'MEDICAL DETAILS' },
    { id: 8,  label: 'DRIVING EXPERIENCE' },
    { id: 9,  label: 'EMPLOYMENT DETAILS' },
    { id: 10, label: 'EDUCATION DETAILS' },
    { id: 11, label: 'Cross Border Details' },
    { id: 12, label: 'ADDITIONAL DETAILS & DOCUMENTS' },
    { id: 13, label: 'Acknowledgment' },
];

export const TOTAL_STEPS = APPLICATION_STEPS.length;

// ── Option constants ──────────────────────────────────────────────────────

export const POSITION_TYPES = [
    'Local', 'Regional', 'OTR (Over the Road)', 'Owner-Operator', 'Casual / Part-time',
];

export const LICENSE_CLASSES = [
    'Class A', 'Class B', 'Class C', 'Class D',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
];

export const LICENSE_ENDORSEMENTS = [
    'H - Placarded Hazmat',
    'N - Tank Vehicles',
    'P - Passengers',
    'S - School Bus',
    'T - Double/Triple Trailers',
    'X - Placarded Hazmat & Tank Vehicles',
    'AZ - Tractor-trailer with air-brake',
];

export const LICENSE_RESTRICTIONS = [
    'B - Corrective Lenses',
    'C - Mechanical aid',
    'D - Prosthetic aid',
    'E - The driver may only operate a commercial vehicle with an automatic transmission.',
    'F - An outside mirror is required on the commercial vehicle',
    'G - The driver of a commercial vehicle is only allowed to operate during daylight hours',
    'H - Hazardous-materials prohibition (U.S. only)',
    'K - Drivers are authorized to drive a commercial vehicle within the state of issue (intrastate) only',
    'L - Drivers are restricted from operating a commercial vehicle with air brakes',
    'M - CDL-A holders may operate CDL-B school buses only',
    'N - CDL-A and CDL-B holders may operate CDL-C school buses only',
    'O - Driver limited to pintle hook trailers only',
    'Q - Power steering / air-assist required',
    'R - Farm-vehicle-only restriction',
    'S - No air-brake CMV (Ontario equivalent of L)',
    'T - 60-day temporary license',
    'V - Medical variance / skill-performance evaluation (FMCSA medical waiver)',
    'Z - Alcohol Interlock Device required in the commercial vehicle',
];

/** FMCSA §383.51 disqualifying offences — shown as checkboxes in the modal. */
export const DISQUALIFICATION_OFFENCES = [
    'Causing a fatality through the negligent operation of a CMV.',
    'Driving a CMV while revoked, suspended, canceled or disqualified as a result of prior violations committed while operating a CMV.',
    "Driving a CMV without obtaining a CLP or CDL or without a CLP or CDL in the driver's possession.",
    'Driving a CMV without the proper class license and/or endorsements.',
    'Driving recklessly.',
    'Driving under the influence of a controlled substance.',
    'Driving under the influence of alcohol as prescribed by State law.',
    'Following the vehicle ahead too closely.',
    'Having an alcohol concentration of .04 or greater while operating a CMV.',
    'Leaving the scene of an accident.',
    'Making improper or erratic traffic lane changes.',
    'Refusing to take an alcohol test as required by implied consent laws or regulations.',
    'Speeding excessively (15 mph or more over the speed limit).',
    'Using the vehicle in the commission of a felony involving the manufacturing, distributing, or dispensing of a controlled substance.',
    'Using the vehicle to commit a felony.',
    'Violating State or local law relating to motor vehicle traffic control arising in connection with a fatal accident.',
    'Violating laws relating to prohibiting texting or using a handheld mobile telephone while driving a CMV.',
];

export const ACCIDENT_NATURES = [
    'Head-on', 'Hit fixed object', 'Jackknife', 'Other', 'Rear-end',
    'Rear-to-rear', 'Rollover', 'Side-impact', 'Sideswipe', 'Upset',
];

export const EQUIPMENT_CLASSES = [
    'Bus', 'Doubles/Triples', 'Other', 'Straight truck', 'Tanker', 'Tractor-trailer',
];

export const FREIGHT_TYPES = [
    'Auto', 'Bulk', 'Flat', 'Hazmat', 'Other', 'Reefer', 'Tank', 'Van',
];

export const DRIVING_REGIONS = [
    'Border', 'Canada', 'Canada-only', 'USA', 'USA-only', 'local',
];

export const VIOLATION_PENALTIES = [
    'Fine', 'Demerit Points', 'Licence Suspension', 'Licence Revocation',
    'Jail Time', 'Community Service', 'Warning', 'Other',
];

export const EDUCATION_LEVELS = [
    'Less than High School', 'High School / GED', 'Some College',
    'Trade / Vocational', 'Associate Degree', "Bachelor's Degree", 'Graduate Degree',
];

export const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
    'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
    'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

export const CA_PROVINCES = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
    'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan',
    'Yukon',
];

/** State / province options scoped to the selected country. */
export function regionsFor(country: CountryId): string[] {
    if (country === 'Canada') return CA_PROVINCES;
    if (country === 'United States') return US_STATES;
    return [...US_STATES, ...CA_PROVINCES];
}

// ── Factories ─────────────────────────────────────────────────────────────

export const uid = (): string => Math.random().toString(36).slice(2, 9);

export function emptyApplicationForm(): DriverApplicationForm {
    return {
        firstName: '', lastName: '', email: '', phone: '',
        dateOfBirth: '', ssn: '', legalRightToWorkUS: false, positionType: 'Local',
        currentAddress: emptyAddress(),
        currentAddressFromDate: '',
        livedHere3PlusYears: false,
        addresses: [],
        licenseNumber: '', licenseCountry: '', licenseStateProvince: '',
        licenseIssueDate: '', licenseExpiryDate: '',
        hasEndorsements: false, endorsements: [],
        hasRestrictions: false, restrictions: [],
        licenseFrontFileName: '', licenseBackFileName: '',
        hasOtherLicenses: false,
        licenses: [],
        everDeniedLicense: false, denialDetails: '', disqualifications: [],
        hasAccidentHistory: false, accidents: [],
        hasViolationHistory: false, violations: [],
        hasValidMedCert: false, medCertNumber: '', medExaminerName: '',
        medRegistryNumber: '', medCertIssueDate: '', medCertExpiryDate: '',
        medicalConditions: '',
        drivingExperience: [],
        employment: [],
        education: [],
        crossesBorder: false, fastCardNumber: '', fastCardExpiry: '',
        passportNumber: '', passportCountry: '', passportExpiry: '',
        hasTwicCard: false, twicCardNumber: '', twicCardExpiry: '',
        emergencyContactName: '', emergencyContactPhone: '',
        emergencyContactRelationship: '', referralSource: '', additionalNotes: '',
        certified: false, signatureDataUrl: null, signaturePrintName: '',
        signatureDate: '',
    };
}

export function newAddress(): AddressRecord {
    return { id: uid(), address: emptyAddress(), fromDate: '', toDate: '', isCurrent: false };
}
export function newLicense(): LicenseRecord {
    return { id: uid(), licenseNumber: '', licenseClass: '', country: '', stateProvince: '', issueDate: '', expiryDate: '', endorsements: [], restrictions: [] };
}
export function newDisqualification(): DisqualificationRecord {
    return { id: uid(), offenceTypes: [], disqualificationDate: '', durationDays: '', explanation: '' };
}
export function newAccident(): AccidentRecord {
    return { id: uid(), accidentDate: '', natureOfAccident: '', country: '', stateProvince: '', locationCity: '', fatalities: '', injuries: '', cargoDamage: false };
}
export function newViolation(): ViolationRecord {
    return { id: uid(), charge: '', issuingAgency: '', violationDate: '', country: '', stateProvince: '', city: '', penalty: '', penaltyAmount: '', description: '', pointsDeducted: false };
}
export function newDrivingExperience(): DrivingExperienceRecord {
    return { id: uid(), equipmentClass: '', freightTypes: [], drivingRegions: [], fromDate: '', toDate: '', approximateMiles: '' };
}
export function newEmployment(): EmploymentRecord {
    return { id: uid(), employerName: '', phone: '', address: emptyAddress(), positionHeld: '', fromDate: '', toDate: '', currentlyEmployed: false, reasonForLeaving: '', subjectToFMCSR: false, safetySensitiveDOT: false };
}
export function newEducation(): EducationRecord {
    return { id: uid(), schoolName: '', city: '', stateProvince: '', level: '', fieldOfStudy: '', graduated: false, completionYear: '' };
}
