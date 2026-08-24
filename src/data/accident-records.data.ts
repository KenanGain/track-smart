import { useEffect, useState } from 'react';
import type { AccidentRiskType } from '@/data/accident-types.data';
import { buildProfileBundle } from '@/pages/accounts/carrier-datasets.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';

/**
 * Accident RECORDS — actual reported accidents (distinct from the accident-TYPE
 * classification catalog in accident-types.data).
 *
 * Lifecycle: a driver reports an accident from the mobile app (status "reported",
 * source "driver-app"); it lands in the carrier's Default Accidents list where a
 * manager reviews it, adds the additional / verification data and marks it
 * "verified". Managers can also add accidents directly from the office (source
 * "office").
 *
 * CARRIER-SCOPED, localStorage + CustomEvent — same prototype store pattern as the
 * other stores (safety-custom-records, compliance-data, …) so the Default Accidents
 * page and the Driver Mobile App share one live list.
 */

export type AccidentStatus = 'reported' | 'review' | 'verified';
export type AccidentSource = 'driver-app' | 'office';
export type Preventability = 'Preventable' | 'Non-preventable' | 'Undetermined' | '';

/** An uploaded file reference (prototype records name/size only) — same shape as
 *  the shared FileDropZone's DropFile so it can be passed straight through.
 *  `note` + `tags` let each uploaded document be annotated / tagged (reusing the
 *  shared document-tag catalog in safety-tags.data). */
export interface AccidentFile { id: string; fileName: string; fileSize?: number; note?: string; tags?: string[]; uploadedBy?: string; uploadedAt?: string; previewUrl?: string; }

/** One audit-trail entry — who did what, and when. */
export type ActivityRole = 'driver' | 'office' | 'manager' | 'system' | 'adjuster';
export interface AccidentActivity {
    id: string;
    at: string;          // 'YYYY-MM-DDTHH:mm'
    by: string;          // person name
    role: ActivityRole;
    action: string;      // 'Reported', 'Created', 'Updated', 'Verified', …
    detail?: string;
}

/** ── Case communication (ticket) — the back-and-forth with the insurance adjuster ──
 *  We send the accident package (data + documents + evidence up to the police-report step);
 *  the adjuster can request more documents; we respond by sending them. One thread per accident. */
export type CaseParty = 'carrier' | 'adjuster';
export type CaseMessageKind = 'send' | 'request' | 'response' | 'note';
export interface CaseAttachment { name: string; group?: string; }
export interface CaseMessage {
    id: string;
    kind: CaseMessageKind;
    from: CaseParty;
    by: string;                    // person name
    at: string;                    // 'YYYY-MM-DDTHH:mm'
    subject?: string;
    body: string;
    attachments?: CaseAttachment[];
    requestedItems?: string[];     // for an adjuster 'request'
}
export type CaseStatus = 'not_started' | 'sent' | 'info_requested' | 'responded' | 'closed';
export interface AccidentCase {
    status: CaseStatus;
    adjusterName?: string;
    adjusterEmail?: string;
    messages: CaseMessage[];
}
export const CASE_STATUS_META: Record<CaseStatus, { label: string; tone: string; dot: string }> = {
    not_started:   { label: 'Not started',      tone: 'border-slate-200 bg-slate-50 text-slate-500',    dot: 'bg-slate-400' },
    sent:          { label: 'Sent to adjuster',  tone: 'border-blue-200 bg-blue-50 text-blue-700',       dot: 'bg-blue-500' },
    info_requested:{ label: 'Info requested',    tone: 'border-amber-200 bg-amber-50 text-amber-700',    dot: 'bg-amber-500' },
    responded:     { label: 'Responded',         tone: 'border-violet-200 bg-violet-50 text-violet-700', dot: 'bg-violet-500' },
    closed:        { label: 'Closed',            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

/** A notification / alert raised against an accident. The rules that create these are
 *  TBD (provided later) — the list surfaces whatever alert a record carries. */
export type AccidentAlertLevel = 'critical' | 'warning' | 'info';
export interface AccidentAlert {
    level: AccidentAlertLevel;
    label?: string;      // short chip label (defaults to the level label)
    message: string;     // full text shown on hover
    at?: string;         // 'YYYY-MM-DDTHH:mm' — when the notification fired
}

/** A third-party / other vehicle involved in the collision (dynamic, up to 5). */
export interface OtherVehicle {
    id: string;
    year?: string;
    make?: string;
    model?: string;
    colour?: string;
    plate?: string;
    plateJurisdiction?: string;  // plate issuing jurisdiction
    driverName?: string;
    driverAddress?: string;
    driverPhone?: string;
    licenceNumber?: string;
    licenceProvince?: string;    // Prov./State of issue
    licenceExpiry?: string;      // Date of expiration
    vehicleVin?: string;
    trailerVin?: string;
    unitNumber?: string;
    trailerNumbers?: string;
    ownerName?: string;          // Owner/employer's name
    ownerAddress?: string;
    ownerPhone?: string;
    personsInVehicle?: string;   // No. of persons in vehicle
    injured?: boolean;           // Was anyone in the vehicle injured?
    injuredDriver?: boolean;
    injuredPassenger?: boolean;
    insuranceCompany?: string;
    policyNumber?: string;
    coiFiles?: AccidentFile[];   // certificate of insurance copy
    actions?: string[];          // action / movement checklist
    actionsOther?: string;       // "Other (describe)"
}

/** A witness to the collision (dynamic add-card). */
export interface Witness {
    id: string;
    name?: string;
    address?: string;
    province?: string;           // Prov./State
    phone?: string;
    sawAccident?: boolean;       // Did you see the accident occur?
    whereWhen?: string;          // Where you were when the accident occurred
    cause?: string;              // What you think caused this accident
    statementFiles?: AccidentFile[];  // this witness's uploaded statement
}

export interface AccidentRecord {
    id: string;
    // ── Report (driver / office) ─────────────────────────────
    driverId: string;
    driverName: string;
    dateTime: string;          // 'YYYY-MM-DDTHH:mm' — when the accident happened
    location: string;
    accidentTypeId: string;    // ACCIDENT_TYPES id ('' when unknown at report time) — legacy single
    accidentTypeIds?: string[]; // classified in Internal Review (multi-select)
    unitId: string;            // assigned vehicle unit
    description: string;
    injuries: boolean;
    injuryNotes?: string;
    photoCount: number;        // illustrative — number of photos the reporter attached
    // ── Lifecycle ────────────────────────────────────────────
    status: AccidentStatus;
    source: AccidentSource;
    reportedBy: string;
    reportedAt: string;        // 'YYYY-MM-DD'
    // ── Manager verification / additional data ───────────────
    severity?: AccidentRiskType | '';
    points?: number | '';
    preventable?: Preventability;
    claimNumber?: string;
    policeReport?: string;
    insurer?: string;
    thirdParty?: string;
    managerNotes?: string;
    verifiedBy?: string;       // reviewer who verified the record ("Reviewed by")
    verifiedAt?: string;       // 'YYYY-MM-DD'
    claimedBy?: string;        // adjuster / person who owns the insurance claim ("Claimed by")
    claimedAt?: string;        // 'YYYY-MM-DD' — when the claim was opened / claimed
    // ── Driver information (auto-filled from the driver record) ──
    driverPhone?: string;
    driverAddress?: string;   // composed convenience string
    driverStreet?: string;
    driverCity?: string;
    driverState?: string;
    driverZip?: string;
    driverCountry?: string;
    licenceNumber?: string;
    licenceExpiry?: string;
    licenceProvince?: string;
    // Source dates for the auto-calculated driver profile (age band, experience, tenure)
    driverDob?: string;              // 'YYYY-MM-DD'
    driverHiredDate?: string;        // 'YYYY-MM-DD'
    driverLicenceIssueDate?: string; // 'YYYY-MM-DD'
    // Driver profile — auto-populated from the source dates on driver pick, then editable
    driverAgeBand?: string;             // e.g. "31 - 35"
    driverDrivingExperience?: string;   // e.g. "4 Years"
    driverLengthOfEmployment?: string;  // e.g. "1 Year"
    // ── Owner information (auto-filled from the carrier) ──
    ownerName?: string;
    ownerAddress?: string;    // composed convenience string
    ownerStreet?: string;
    ownerCity?: string;
    ownerState?: string;
    ownerZip?: string;
    ownerCountry?: string;
    ownerPhone?: string;
    policyNumber?: string;
    nscCvor?: string;
    dotNumber?: string;
    // ── Police report (shown when police were present) ──
    policePresent?: boolean;
    officer1Name?: string;
    officer1Badge?: string;
    officer2Name?: string;
    officer2Badge?: string;
    policeAgency?: string;
    policeAgencyPhone?: string;
    citationIssued?: boolean;
    citationNumber?: string;
    citationFiles?: AccidentFile[];
    arrested?: boolean;
    arrestedName?: string;
    policeNote?: string;
    policeReportFiles?: AccidentFile[];
    // ── Accident location (structured) ──
    accUnit?: string;
    accStreet?: string;
    accCity?: string;
    accState?: string;
    accCountry?: string;
    accZip?: string;
    locationType?: string;
    // ── Road & environment (multi-select checklists, combined collision-report form) ──
    roadType?: string;
    postedSpeed?: string;
    roadCondsList?: string[];
    gradePercent?: string;
    roadCondsOther?: string;
    trafficControlsList?: string[];
    trafficControlsOther?: string;
    trafficCondsList?: string[];
    trafficCondsOther?: string;
    weatherList?: string[];
    weatherOther?: string;
    visibilityList?: string[];
    visibilityOther?: string;
    // ── Collision information ──
    landmarks?: string;
    directionOfTravel?: string;
    travelSpeed?: string;
    travelSpeedUnit?: string;   // 'km/h' | 'mph'
    headlightsOn?: boolean;
    laneNumber?: string;
    lanesWide?: string;
    warningSignals?: boolean;
    warningSignalDesc?: string;
    // ── Severity (DOT-recordable outcome) ──
    numFatalities?: string;
    numInjuries?: string;
    numVehiclesTowed?: string;
    towAway?: boolean;
    hazmatSpill?: boolean;
    // ── HAZMAT details (shown when HAZMAT spilled/released is Yes) ──
    hazardousCommodity?: string;
    hazmatClass?: string;
    unNaNumber?: string;
    quantityReleased?: string;
    placarded?: boolean;
    // ── Third-party / other vehicles + witnesses ──
    otherVehicles?: OtherVehicle[];
    witnesses?: Witness[];
    witnessNotes?: string;        // Additional notes
    // ── Evidence & documents (each holds up to MAX_UPLOAD_FILES files) ──
    photoFiles?: AccidentFile[];             // photos of the scene
    videoFiles?: AccidentFile[];             // evidence video
    driverStatementFiles?: AccidentFile[];
    // ── At the time of the crash ──
    odometerAfter?: string;
    hrsDrivingAtCrash?: string;
    hrsOnDutyAtCrash?: string;
    lastDutyStatus?: string;
    lastDvirStatus?: string;
    // ── Cargo ──
    commodityLost?: string;
    cargoLost?: string;
    cargoDamaged?: boolean;
    cargoDamageValue?: string;
    cargoDamageDesc?: string;
    // ── Insurance, tow & repair (shown when Tow Away is on) ──
    insuranceCarrier?: string;
    insurancePolicyNumber?: string;
    adjusterName?: string;
    adjusterPhone?: string;
    adjusterEmail?: string;
    tpaAdmin?: string;
    totalLoss?: boolean;
    subrogation?: boolean;
    amountPaid?: string;
    cashReserve?: string;
    totalIncurred?: string;
    claimCurrency?: string;
    claimStatus?: string;
    towCompany?: string;
    towBill?: string;
    repairVendor?: string;
    repairStatus?: string;
    repairFiles?: AccidentFile[];
    // ── Vehicle & trailer involved (selected from the fleet DB) ──
    vehicleAssetId?: string;
    vehiclePlate?: string;
    vehicleJurisdiction?: string;
    vehicleVin?: string;
    trailerUnit?: string;
    trailerAssetId?: string;
    trailerPlate?: string;
    trailerJurisdiction?: string;
    trailerVin?: string;
    // ── Commodity / cargo damage (new model) ──
    commodityDamaged?: boolean;
    commodityDescription?: string;
    commodityQty?: string;
    commodityValue?: string;
    commodityValueCurrency?: string;   // 'USD' | 'CAD'
    commodityLoss?: string;            // 'Total' | 'Partial'
    hazmatValue?: string;
    hazmatValueCurrency?: string;
    // ── Collision severity ──
    vehiclesInCollision?: string;
    // ── Towing (shown when # vehicles towed > 0) ──
    towingCompany?: string;
    towingBill?: string;
    towingBillCurrency?: string;
    towingAddress?: string;
    towingContact?: string;
    towingPhone?: string;
    towingEmail?: string;
    towingInvoiceFiles?: AccidentFile[];
    // ── Environment ──
    vehicleSpeed?: string;
    // ── Uploads ──
    driverStatementText?: string;
    vehicleDamageFiles?: AccidentFile[];
    dashcamFiles?: AccidentFile[];
    elogFiles?: AccidentFile[];
    // ── Repair ──
    estimatedRepair?: string;
    totalRepairAmount?: string;
    repairCurrency?: string;
    // ── Verification ──
    adjusterNote?: string;
    // ── Claim ledger ──
    attachLedger?: boolean;
    ledgerFiles?: AccidentFile[];
    claimDocsFiles?: AccidentFile[];
    // ── Medical report (injury documentation) ──
    medicalReportFiles?: AccidentFile[];
    // ── Internal review ──
    internalNotes?: string;
    additionalDocsFiles?: AccidentFile[];
    // ── Notification / alert (rules provided later) ──
    alert?: AccidentAlert;
    // ── Case communication with the adjuster ──
    case?: AccidentCase;
    // ── Audit trail ──
    activity?: AccidentActivity[];
}

/** The auto-fillable Driver + Owner information subsets. */
export type AccidentDriverInfo = Pick<AccidentRecord, 'driverName' | 'driverPhone' | 'driverAddress' | 'driverStreet' | 'driverCity' | 'driverState' | 'driverZip' | 'driverCountry' | 'licenceNumber' | 'licenceExpiry' | 'licenceProvince' | 'driverDob' | 'driverHiredDate' | 'driverLicenceIssueDate'>;
export type AccidentOwnerInfo = Pick<AccidentRecord, 'ownerName' | 'ownerAddress' | 'ownerStreet' | 'ownerCity' | 'ownerState' | 'ownerZip' | 'ownerCountry' | 'ownerPhone' | 'policyNumber' | 'nscCvor' | 'dotNumber'>;

export const ACCIDENT_STATUS_META: Record<AccidentStatus, { label: string; tone: string; dot: string }> = {
    reported: { label: 'Reported',     tone: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-500' },
    review:   { label: 'Under review', tone: 'border-blue-200 bg-blue-50 text-blue-700',          dot: 'bg-blue-500' },
    verified: { label: 'Verified',     tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

export const SOURCE_META: Record<AccidentSource, { label: string; tone: string }> = {
    'driver-app': { label: 'Driver app', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
    'office':     { label: 'Office',     tone: 'border-slate-200 bg-slate-50 text-slate-600' },
};

export const ALERT_META: Record<AccidentAlertLevel, { label: string; tone: string; dot: string }> = {
    critical: { label: 'Critical', tone: 'border-red-200 bg-red-50 text-red-700',     dot: 'bg-red-500' },
    warning:  { label: 'Warning',  tone: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    info:     { label: 'Info',     tone: 'border-sky-200 bg-sky-50 text-sky-700',       dot: 'bg-sky-500' },
};

/** Who logged this record and when — taken from the first audit-trail entry, else the
 *  report fields. Used by the list's "Added by" column. */
export function addedInfo(r: AccidentRecord): { by: string; role: ActivityRole; at: string } {
    const first = r.activity?.[0];
    if (first) return { by: first.by, role: first.role, at: first.at };
    return { by: r.reportedBy, role: r.source === 'driver-app' ? 'driver' : 'office', at: r.reportedAt };
}

export const PREVENTABILITY_OPTIONS: Exclude<Preventability, ''>[] = ['Preventable', 'Non-preventable', 'Undetermined'];

/**
 * Driver Accident Report disclosure — the at-the-scene instructions shown on the
 * accident report form (driver mobile app) and the office Add-accident modal.
 */
export const DRIVER_ACCIDENT_DISCLOSURE = {
    title: 'Driver Accident Report',
    intro: 'This report is to be completed at the scene of the collision by the driver.',
    note: "This driver's collision report is for your internal records only. After any collision or loss, notify your employer and have them call your insurer.",
    stepsTitle: 'Steps to follow in the event of a collision',
    steps: [
        'Remain at the scene. Turn on four-way flashers, set out flares or reflectors.',
        'Check for immediate danger, such as fuel spills.',
        'Ensure that seriously injured parties are cared for. If necessary, call an ambulance.',
        'Notify the police.',
        'Notify your employer, and have your employer notify your insurer immediately.',
        'Complete this report at the scene of the collision.',
        'If possible, take pictures of the scene. Do not take photographs of victims.',
        'Do not discuss the collision with anyone except the police or your insurance representative.',
        'Submit this report to your supervisor as soon as possible. Do not distribute or copy this report to others.',
    ],
} as const;

const KEY = 'accident-records-v2';
const SEEDED_KEY = 'accident-records-seeded-v3';   // per-account seed version marker: { [acct]: version }
const SEED_VERSION = 6;                             // bump when the sample set changes → demo rows refresh (user rows kept)
const EVENT = 'accident-records-change';
const NO_ACCOUNT = '_noacct';

export function newAccidentId(): string {
    return `acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Blank third-party vehicle / witness cards (unique id per card). */
export function newOtherVehicle(): OtherVehicle {
    return { id: `ov-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, actions: [] };
}
export function newWitness(): Witness {
    return { id: `wit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
}
export const MAX_OTHER_VEHICLES = 5;
export const MAX_WITNESSES = 6;
/** One document can hold multiple uploads — capped at this many files. */
export const MAX_UPLOAD_FILES = 10;

/** Append a browser FileList onto an existing upload list, capped at MAX_UPLOAD_FILES. */
export function appendUploads(current: AccidentFile[], list: FileList | null): AccidentFile[] {
    if (!list || list.length === 0) return current;
    const room = Math.max(0, MAX_UPLOAD_FILES - current.length);
    const incoming = Array.from(list).slice(0, room).map((file, i) => ({
        id: `af-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: file.name,
        fileSize: file.size,
    }));
    return [...current, ...incoming];
}

/** 'YYYY-MM-DDTHH:mm' timestamp for right now (local). */
export function nowStamp(): string {
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, '0');
    return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}T${p(n.getHours())}:${p(n.getMinutes())}`;
}

/** Build an activity entry (unique id). */
export function newActivity(a: Omit<AccidentActivity, 'id'>): AccidentActivity {
    return { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ...a };
}

export const ACTIVITY_ROLE_META: Record<ActivityRole, { label: string; tone: string; ring: string }> = {
    driver:   { label: 'Driver',   tone: 'bg-violet-100 text-violet-700',   ring: 'bg-violet-500' },
    office:   { label: 'Office',   tone: 'bg-slate-100 text-slate-600',     ring: 'bg-slate-400' },
    manager:  { label: 'Manager',  tone: 'bg-blue-100 text-blue-700',       ring: 'bg-blue-500' },
    system:   { label: 'System',   tone: 'bg-emerald-100 text-emerald-700', ring: 'bg-emerald-500' },
    adjuster: { label: 'Adjuster', tone: 'bg-amber-100 text-amber-700',     ring: 'bg-amber-500' },
};

/** The action / movement checklist for the other vehicle(s) involved. */
export const VEHICLE_ACTION_OPTS = [
    'Driving straight ahead', 'Turning right', 'Turning left', 'Making a U-turn', 'Lost control',
    'Stopped or parked', 'Backing up', 'Jack-knifed trailer', 'Passing right side', 'Passing left side',
    'Weaving', 'Skidding', 'On the wrong side', 'Other (describe)',
] as const;

/** A blank driver-reported accident, pre-filled with the driver + vehicle + now
 *  plus the auto-populated Driver information and Owner (carrier) information. */
export function blankAccidentReport(opts: {
    driverId: string; driverName: string; unitId: string; now: string; today: string;
    driverInfo?: Partial<AccidentDriverInfo>;
    ownerInfo?: Partial<AccidentOwnerInfo>;
}): AccidentRecord {
    return {
        id: newAccidentId(),
        driverId: opts.driverId,
        driverName: opts.driverName,
        dateTime: opts.now,
        location: '',
        accidentTypeId: '',
        unitId: opts.unitId,
        description: '',
        injuries: false,
        injuryNotes: '',
        photoCount: 0,
        status: 'reported',
        source: 'driver-app',
        reportedBy: opts.driverName,
        reportedAt: opts.today,
        severity: '',
        points: '',
        preventable: '',
        claimNumber: '',
        policeReport: '',
        insurer: '',
        thirdParty: '',
        managerNotes: '',
        // Auto-filled sections
        driverPhone: '', driverAddress: '', driverStreet: '', driverCity: '', driverState: '', driverZip: '', driverCountry: '',
        licenceNumber: '', licenceExpiry: '', licenceProvince: '',
        ...opts.driverInfo,
        ownerName: '', ownerAddress: '', ownerStreet: '', ownerCity: '', ownerState: '', ownerZip: '', ownerCountry: '',
        ownerPhone: '', policyNumber: '', nscCvor: '',
        ...opts.ownerInfo,
    };
}

/** Auto-populate Driver information from a driver record (name, phone, structured address, licence). */
export function driverAccidentInfo(driver: {
    name: string; phone?: string; address?: string; city?: string; state?: string; zip?: string; country?: string;
    licenseNumber?: string; licenseState?: string; licenseExpiry?: string;
    dob?: string; hiredDate?: string; dateAdded?: string;
    licenses?: Array<{ province?: string; expiryDate?: string; licenseNumber?: string; issueDate?: string }>;
}): AccidentDriverInfo {
    const lic = driver.licenses?.[0];
    const addr = [driver.address, driver.city, [driver.state, driver.zip].filter(Boolean).join(' '), driver.country].filter(Boolean).join(', ');
    return {
        driverName: driver.name,
        driverPhone: driver.phone ?? '',
        driverAddress: addr,
        driverStreet: driver.address ?? '',
        driverCity: driver.city ?? '',
        driverState: driver.state ?? '',
        driverZip: driver.zip ?? '',
        driverCountry: driver.country ?? '',
        licenceNumber: driver.licenseNumber ?? lic?.licenseNumber ?? '',
        licenceExpiry: driver.licenseExpiry ?? lic?.expiryDate ?? '',
        licenceProvince: lic?.province ?? driver.licenseState ?? '',
        driverDob: driver.dob,
        driverHiredDate: driver.hiredDate ?? driver.dateAdded,
        driverLicenceIssueDate: lic?.issueDate,
    };
}

// ── Auto-calculated driver profile (age band, driving experience, tenure) ──

/** Parse a 'YYYY-MM-DD' (or ISO) date string to a local Date, or null. */
function parseDateSafe(s?: string): Date | null {
    if (!s) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/** Whole years between a start date and a reference date (default now), floored, never negative. */
function wholeYearsBetween(start?: string, asOf?: string): number | null {
    const s = parseDateSafe(start);
    if (!s) return null;
    const ref = parseDateSafe(asOf) ?? new Date();
    let y = ref.getFullYear() - s.getFullYear();
    const m = ref.getMonth() - s.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < s.getDate())) y--;
    return y < 0 ? 0 : y;
}

/** Format a year count as "1 Year" / "4 Years" / "< 1 Year". */
export function formatYears(n: number | null | undefined): string | undefined {
    if (n == null) return undefined;
    if (n <= 0) return '< 1 Year';
    return `${n} ${n === 1 ? 'Year' : 'Years'}`;
}

/** 5-year age band ("31 - 35") for a date-of-birth, as of a reference date. */
export function ageBandFromDob(dob?: string, asOf?: string): string | undefined {
    const born = parseDateSafe(dob);
    if (!born) return undefined;
    const ref = parseDateSafe(asOf) ?? new Date();
    let age = ref.getFullYear() - born.getFullYear();
    const m = ref.getMonth() - born.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < born.getDate())) age--;
    if (age < 16 || age > 100) return undefined;
    const lo = Math.floor((age - 1) / 5) * 5 + 1;
    return `${lo} - ${lo + 4}`;
}

export interface DriverProfileStats { ageBand?: string; drivingExperience?: string; lengthOfEmployment?: string; }

/** Auto-calculated driver profile shown in the accident file — computed as of the
 *  accident date (falls back to today) from the captured driver source dates. */
export function driverProfileStats(r: Pick<AccidentRecord, 'driverDob' | 'driverLicenceIssueDate' | 'driverHiredDate' | 'dateTime'>): DriverProfileStats {
    const asOf = r.dateTime;
    return {
        ageBand: ageBandFromDob(r.driverDob, asOf),
        drivingExperience: formatYears(wholeYearsBetween(r.driverLicenceIssueDate, asOf)),
        lengthOfEmployment: formatYears(wholeYearsBetween(r.driverHiredDate, asOf)),
    };
}

/** Auto-populate Owner information from the carrier profile bundle for an account. */
export function carrierOwnerInfo(accountId?: string): AccidentOwnerInfo {
    let b: any;
    try { b = buildProfileBundle(accountId); } catch { b = null; }
    const id = b?.uiData?.editModals?.corporateIdentity?.values ?? {};
    const ad = b?.uiData?.editModals?.legalMainAddress?.values ?? {};
    const street = [ad.street, ad.apt].filter(Boolean).join(', ');
    const addr = [street, ad.city, [ad.state, ad.zip].filter(Boolean).join(' '), ad.country].filter(Boolean).join(', ');
    const nscCvor = [id.cvorNumber, id.nscNumber, id.rinNumber].filter(Boolean).join(' / ') || id.dotNumber || '';
    return {
        ownerName: id.legalName || b?.viewData?.page?.carrierHeader?.name || '',
        ownerAddress: addr,
        ownerStreet: street,
        ownerCity: ad.city ?? '',
        ownerState: ad.state ?? '',
        ownerZip: ad.zip ?? '',
        ownerCountry: ad.country ?? '',
        ownerPhone: b?.officeLocations?.[0]?.phone ?? '',
        policyNumber: '',
        nscCvor,
        dotNumber: id.dotNumber ?? '',
    };
}

type Store = Record<string, AccidentRecord[]>;

/** Sample file helper — a named prototype upload reference (optional note / tags / uploader). */
function sf(prefix: string, name: string, i: number, extra?: Partial<AccidentFile>): AccidentFile {
    return { id: `${prefix}-${i}`, fileName: name, fileSize: 220 + i * 37, ...extra };
}

/** A small adjuster case thread for a seeded record — kind decides how far the conversation got:
 *  'sent' (we sent the package), 'requested' (adjuster replied asking for more), 'responded'
 *  (we then sent the requested docs). Drives the list's Case column + the "adjuster replied" flag. */
function caseThread(id: string, kind: 'sent' | 'requested' | 'responded', adjuster: string, driver: string, unit: string, at: string): AccidentCase {
    const adjEmail = `${adjuster.toLowerCase().replace(/[^a-z]+/g, '.')}@greatwestcasualty.com`;
    const messages: CaseMessage[] = [
        { id: `${id}-c1`, kind: 'send', from: 'carrier', by: 'Kenan Gain', at: `${at}T10:00`,
          subject: `Accident report — ${driver}`,
          body: `Hi ${adjuster},\n\nPlease find attached our accident report for ${driver} (unit ${unit}), with the supporting documents and evidence.\n\nRegards,\nKenan Gain`,
          attachments: [{ name: 'accident-report.pdf', group: 'Accident report' }, { name: 'driver-statement.pdf', group: 'Driver statement' }] },
    ];
    let status: CaseStatus = 'sent';
    if (kind === 'requested' || kind === 'responded') {
        messages.push({ id: `${id}-c2`, kind: 'request', from: 'adjuster', by: adjuster, at: `${at}T14:20`,
            body: 'Thanks for the file. To progress the claim please also send:',
            requestedItems: ['Repair estimate / invoice', 'Police report / exchange of information', 'Third-party certificate of insurance (COI)'] });
        status = 'info_requested';
    }
    if (kind === 'responded') {
        messages.push({ id: `${id}-c3`, kind: 'response', from: 'carrier', by: 'Kenan Gain', at: `${at}T16:05`,
            subject: 'Re: Requested documents', body: 'Hi,\n\nPlease find the requested documents attached.\n\nThanks,\nKenan Gain',
            attachments: [{ name: 'repair-estimate.pdf', group: 'Repairs document' }, { name: 'police-report.pdf', group: 'Police report' }] });
        status = 'responded';
    }
    return { status, adjusterName: adjuster, adjusterEmail: adjEmail, messages };
}

/** Compact accident factory — enough fields to populate the list (driver, date, location,
 *  type, severity, source, added-by / reviewed-by / claimed-by, alert, case, status) plus a short
 *  audit trail. Used to bulk-seed historical records so the list can be exercised at scale. */
function qa(p: {
    id: string; driverId: string; driverName: string; unit: string; dt: string; loc: string;
    type: string; sev?: AccidentRiskType | ''; pts?: number | ''; inj?: boolean;
    status: AccidentStatus; source: AccidentSource; by: string; at: string;
    prev?: Preventability; claim?: string; vBy?: string; vAt?: string; cBy?: string; cAt?: string;
    alert?: AccidentAlert; caseKind?: 'sent' | 'requested' | 'responded'; adjuster?: string;
    haz?: boolean; tow?: boolean; fatal?: number; injCount?: number; desc: string;
}): AccidentRecord {
    const role: ActivityRole = p.source === 'driver-app' ? 'driver' : 'office';
    const activity: AccidentActivity[] = [
        { id: `${p.id}-a1`, at: `${p.at}T08:00`, by: p.by, role, action: role === 'driver' ? 'Reported' : 'Created', detail: role === 'driver' ? 'Submitted from the mobile app at the scene.' : 'Entered from the office.' },
    ];
    if (p.cBy) activity.push({ id: `${p.id}-ac`, at: `${p.cAt ?? p.at}T09:30`, by: p.cBy, role: 'office', action: 'Claim opened', detail: `Insurance claim ${p.claim || ''} assigned to ${p.cBy}.`.trim() });
    // Case thread + matching audit entries.
    let caseData: AccidentCase | undefined;
    if (p.caseKind) {
        const adj = p.adjuster ?? 'Priya Nair';
        const base = p.cAt ?? p.vAt ?? p.at;
        caseData = caseThread(p.id, p.caseKind, adj, p.driverName, p.unit, base);
        activity.push({ id: `${p.id}-cs`, at: `${base}T10:00`, by: 'Kenan Gain', role: 'office', action: 'Sent case to adjuster', detail: 'Accident report package sent.' });
        if (p.caseKind !== 'sent') activity.push({ id: `${p.id}-cr`, at: `${base}T14:20`, by: adj, role: 'adjuster', action: 'Adjuster requested documents', detail: 'Repair estimate · Police report · Third-party COI.' });
        if (p.caseKind === 'responded') activity.push({ id: `${p.id}-crp`, at: `${base}T16:05`, by: 'Kenan Gain', role: 'office', action: 'Responded to adjuster', detail: 'Requested documents sent.' });
    }
    if (p.vBy) activity.push({ id: `${p.id}-av`, at: `${p.vAt ?? p.at}T11:00`, by: p.vBy, role: 'manager', action: 'Verified', detail: 'Reviewed and verified.' });
    // Deterministic driver profile source-dates (age band, driving experience, tenure) from the id.
    const h = [...p.driverId].reduce((s, c) => s + c.charCodeAt(0), 0);
    const accYear = Number(p.dt.slice(0, 4)) || 2026;
    const mm = (n: number) => String((((n % 12) + 12) % 12) + 1).padStart(2, '0'); // 01..12
    const dd = (n: number) => String((((n % 27) + 27) % 27) + 1).padStart(2, '0'); // 01..27
    const age = 26 + (h % 30);            // 26..55 at the time of the accident
    const experience = 2 + (h % 17);      // 2..18 years holding the licence
    const tenure = 1 + ((h >> 1) % 12);   // 1..12 years with the carrier
    return {
        id: p.id, driverId: p.driverId, driverName: p.driverName, dateTime: p.dt, location: p.loc,
        driverDob: `${accYear - age}-${mm(h)}-${dd(h * 3)}`,
        driverLicenceIssueDate: `${accYear - experience}-${mm(h + 5)}-${dd(h * 7)}`,
        driverHiredDate: `${accYear - tenure}-${mm(h + 2)}-${dd(h * 5)}`,
        accidentTypeId: p.type, unitId: p.unit, description: p.desc, injuries: !!p.inj, photoCount: 0,
        status: p.status, source: p.source, reportedBy: p.by, reportedAt: p.at,
        severity: p.sev ?? '', points: p.pts ?? '', preventable: p.prev ?? '',
        claimNumber: p.claim ?? '', verifiedBy: p.vBy, verifiedAt: p.vAt, claimedBy: p.cBy, claimedAt: p.cAt,
        adjusterName: p.caseKind ? (p.adjuster ?? 'Priya Nair') : undefined,
        hazmatSpill: p.haz, towAway: p.tow,
        numFatalities: p.fatal != null ? String(p.fatal) : undefined,
        numInjuries: p.injCount != null ? String(p.injCount) : undefined,
        alert: p.alert, case: caseData, activity,
    };
}

/** ~20 additional records — mostly historical / verified, spread across 2025–2026 so the list,
 *  filters, sorting, pagination and the "Historical" toggle all have data to work against. */
const MORE_SAMPLES: AccidentRecord[] = [
    // ── Historical (verified) ──
    qa({ id: 'acc-sample-4', driverId: 'DRV-001-0031', driverName: 'Rachel Nguyen', unit: 'ACM-T0102', dt: '2026-07-22T14:10', loc: 'I-70 W, Mile 210 · Columbia, MO', type: 'rear_end', sev: 'Medium', pts: 4, status: 'verified', source: 'office', by: 'Dispatch (office)', at: '2026-07-22', prev: 'Preventable', claim: 'CLM-2026-0488', vBy: 'Kenan Gain', vAt: '2026-07-24', cBy: 'Priya Nair', cAt: '2026-07-23', caseKind: 'responded', adjuster: 'Priya Nair', desc: 'Rear-ended a sedan at a construction slowdown; minor front-bumper damage.' }),
    qa({ id: 'acc-sample-5', driverId: 'DRV-001-0033', driverName: 'Victor Cruz', unit: 'ACM-T0104', dt: '2026-07-05T09:25', loc: 'Hwy 400 NB · Barrie, ON', type: 'side_swipe', sev: 'Low', pts: 3, status: 'verified', source: 'driver-app', by: 'Victor Cruz', at: '2026-07-05', prev: 'Non-preventable', claim: 'CLM-2026-0461', vBy: 'Dana Whitfield', vAt: '2026-07-07', caseKind: 'sent', adjuster: 'Priya Nair', desc: 'Side-swiped by a merging car; scuff on the left fairing.' }),
    qa({ id: 'acc-sample-6', driverId: 'DRV-001-0035', driverName: 'Amara Okafor', unit: 'ACM-T0107', dt: '2026-06-18T17:40', loc: 'I-35 S, Mile 402 · Waco, TX', type: 'tire_blowout', sev: 'High', pts: 6, status: 'verified', source: 'driver-app', by: 'Amara Okafor', at: '2026-06-18', prev: 'Non-preventable', claim: 'CLM-2026-0432', vBy: 'Kenan Gain', vAt: '2026-06-20', cBy: 'Marcus Webb', cAt: '2026-06-19', caseKind: 'requested', adjuster: 'Marcus Webb', tow: true, alert: { level: 'warning', message: 'Awaiting third-party COI before the claim can close.', at: '2026-06-20T09:00' }, desc: 'Steer-tire blowout; regained control and stopped on the shoulder.' }),
    qa({ id: 'acc-sample-7', driverId: 'DRV-001-0037', driverName: "Liam O'Brien", unit: 'ACM-T0109', dt: '2026-06-02T06:15', loc: 'Trans-Canada Hwy · Kamloops, BC', type: 'animal_strike', sev: 'Low', pts: 2, status: 'verified', source: 'driver-app', by: "Liam O'Brien", at: '2026-06-02', prev: 'Non-preventable', vBy: 'Dana Whitfield', vAt: '2026-06-03', desc: 'Struck a deer at dawn; grille and bumper damage, no injuries.' }),
    qa({ id: 'acc-sample-8', driverId: 'DRV-001-0039', driverName: 'Priya Patel', unit: 'ACM-T0112', dt: '2026-05-20T13:05', loc: 'I-90 E, Mile 55 · Billings, MT', type: 'rollover', sev: 'High', pts: 8, inj: true, status: 'verified', source: 'driver-app', by: 'Priya Patel', at: '2026-05-20', prev: 'Preventable', claim: 'CLM-2026-0398', vBy: 'Kenan Gain', vAt: '2026-05-23', cBy: 'Priya Nair', cAt: '2026-05-21', caseKind: 'responded', adjuster: 'Priya Nair', tow: true, haz: true, injCount: 1, alert: { level: 'critical', message: 'Injury rollover — DOT-recordable; claim and review in progress.', at: '2026-05-20T14:00' }, desc: 'Trailer rolled on an off-ramp curve; driver treated and released.' }),
    qa({ id: 'acc-sample-9', driverId: 'DRV-001-0041', driverName: 'Gary Schultz', unit: 'ACM-T0115', dt: '2026-05-04T11:30', loc: 'US-101 N · Santa Rosa, CA', type: 'property_damage', sev: 'Medium', pts: 4, status: 'verified', source: 'office', by: 'Dispatch (office)', at: '2026-05-04', prev: 'Preventable', claim: 'CLM-2026-0377', vBy: 'Dana Whitfield', vAt: '2026-05-06', cBy: 'Marcus Webb', cAt: '2026-05-05', desc: 'Clipped a parked trailer at a truck stop; mirror and door damage.' }),
    qa({ id: 'acc-sample-10', driverId: 'DRV-001-0043', driverName: 'Elena Duarte', unit: 'ACM-T0118', dt: '2026-04-19T08:50', loc: 'I-10 W, Mile 140 · Tucson, AZ', type: 'backing_accident', sev: 'Low', pts: 3, status: 'verified', source: 'driver-app', by: 'Elena Duarte', at: '2026-04-19', prev: 'Preventable', vBy: 'Kenan Gain', vAt: '2026-04-21', desc: 'Backed into a dock plate; rear door dented. No other party.' }),
    qa({ id: 'acc-sample-11', driverId: 'DRV-001-0045', driverName: 'Devon Clarke', unit: 'ACM-T0120', dt: '2026-04-02T15:20', loc: 'QEW · Hamilton, ON', type: 'rear_end', sev: 'Medium', pts: 4, status: 'verified', source: 'driver-app', by: 'Devon Clarke', at: '2026-04-02', prev: 'Preventable', claim: 'CLM-2026-0321', vBy: 'Dana Whitfield', vAt: '2026-04-04', cBy: 'Dana Whitfield', cAt: '2026-04-03', caseKind: 'requested', adjuster: 'Dana Whitfield', desc: 'Rear-ended a pickup in stop-and-go traffic; hood damage to the other vehicle.' }),
    qa({ id: 'acc-sample-12', driverId: 'DRV-001-0047', driverName: 'Hana Kim', unit: 'ACM-T0122', dt: '2026-03-15T19:10', loc: 'I-5 N, Mile 260 · Redding, CA', type: 'weather_related', sev: 'Medium', pts: 4, status: 'verified', source: 'driver-app', by: 'Hana Kim', at: '2026-03-15', prev: 'Non-preventable', claim: 'CLM-2026-0288', vBy: 'Kenan Gain', vAt: '2026-03-18', desc: 'Hydroplaned in heavy rain into the median; no other vehicle involved.' }),
    qa({ id: 'acc-sample-13', driverId: 'DRV-001-0049', driverName: 'Omar Haddad', unit: 'ACM-T0124', dt: '2026-02-27T22:40', loc: 'I-80 E, Mile 12 · Wendover, UT', type: 'fixed_object', sev: 'Medium', pts: 3, status: 'verified', source: 'driver-app', by: 'Omar Haddad', at: '2026-02-27', prev: 'Preventable', vBy: 'Dana Whitfield', vAt: '2026-03-01', desc: 'Struck a guardrail on an icy curve; fairing and step damage.' }),
    qa({ id: 'acc-sample-14', driverId: 'DRV-001-0051', driverName: 'Nathan Brooks', unit: 'ACM-T0126', dt: '2026-02-10T07:05', loc: 'I-94 W · Fargo, ND', type: 'single_vehicle', sev: 'Medium', pts: 4, status: 'verified', source: 'office', by: 'Dispatch (office)', at: '2026-02-10', prev: 'Preventable', claim: 'CLM-2026-0233', vBy: 'Kenan Gain', vAt: '2026-02-12', cBy: 'Marcus Webb', cAt: '2026-02-11', tow: true, desc: 'Trailer jackknifed on black ice; recovered with no other vehicle involved.' }),
    qa({ id: 'acc-sample-15', driverId: 'DRV-001-0053', driverName: 'Carla Mendez', unit: 'ACM-T0128', dt: '2026-01-22T16:35', loc: 'I-25 N · Pueblo, CO', type: 'multi_vehicle', sev: 'High', pts: 5, inj: true, status: 'verified', source: 'driver-app', by: 'Carla Mendez', at: '2026-01-22', prev: 'Undetermined', claim: 'CLM-2026-0190', vBy: 'Dana Whitfield', vAt: '2026-01-26', cBy: 'Priya Nair', cAt: '2026-01-23', caseKind: 'responded', adjuster: 'Priya Nair', tow: true, fatal: 1, injCount: 2, alert: { level: 'warning', message: 'Multi-vehicle with injury and a fatality — liability split pending.', at: '2026-01-23T09:00' }, desc: 'Chain-reaction collision in fog; three vehicles, injuries and one fatality.' }),
    qa({ id: 'acc-sample-16', driverId: 'DRV-001-0055', driverName: 'Steve Larsson', unit: 'ACM-T0130', dt: '2025-12-30T10:15', loc: 'Hwy 1 · Regina, SK', type: 'parked_vehicle', sev: 'Low', pts: 2, status: 'verified', source: 'office', by: 'Dispatch (office)', at: '2025-12-30', prev: 'Preventable', vBy: 'Kenan Gain', vAt: '2026-01-02', desc: 'Contacted a parked flatbed while maneuvering in a yard; minor scrape.' }),
    qa({ id: 'acc-sample-17', driverId: 'DRV-001-0057', driverName: 'Yvette Rousseau', unit: 'ACM-T0101', dt: '2025-12-11T18:20', loc: 'A-20 E · Montreal, QC', type: 'intersection', sev: 'Medium', pts: 4, status: 'verified', source: 'driver-app', by: 'Yvette Rousseau', at: '2025-12-11', prev: 'Preventable', claim: 'CLM-2025-0912', vBy: 'Dana Whitfield', vAt: '2025-12-14', cBy: 'Dana Whitfield', cAt: '2025-12-12', desc: 'Failed to fully stop at a controlled intersection; low-speed contact.' }),
    qa({ id: 'acc-sample-18', driverId: 'DRV-001-0059', driverName: 'Ibrahim Ali', unit: 'ACM-T0105', dt: '2025-11-24T05:45', loc: 'I-40 E, Mile 140 · Amarillo, TX', type: 'driver_fatigue', sev: 'High', pts: 7, inj: true, status: 'verified', source: 'driver-app', by: 'Ibrahim Ali', at: '2025-11-24', prev: 'Preventable', claim: 'CLM-2025-0855', vBy: 'Kenan Gain', vAt: '2025-11-27', cBy: 'Priya Nair', cAt: '2025-11-25', caseKind: 'requested', adjuster: 'Priya Nair', tow: true, fatal: 1, injCount: 1, alert: { level: 'critical', message: 'Fatigue-related crash with a fatality — safety review required.', at: '2025-11-24T06:30' }, desc: 'Drifted off the roadway near end of shift; struck a sign — one fatality.' }),
    qa({ id: 'acc-sample-23', driverId: 'DRV-001-0045', driverName: 'Devon Clarke', unit: 'ACM-T0121', dt: '2026-07-29T11:15', loc: 'Hwy 401 W · Toronto, ON', type: 'distracted_driver', sev: 'High', pts: 6, status: 'verified', source: 'driver-app', by: 'Devon Clarke', at: '2026-07-29', prev: 'Preventable', claim: 'CLM-2026-0555', vBy: 'Kenan Gain', vAt: '2026-08-01', cBy: 'Marcus Webb', cAt: '2026-07-30', caseKind: 'sent', adjuster: 'Marcus Webb', desc: 'Momentary distraction led to a lane-change contact; other vehicle scuffed.' }),
    // ── Recent, still open (review / reported) — some with alerts ──
    qa({ id: 'acc-sample-19', driverId: 'DRV-001-0061', driverName: 'Jenna Frost', unit: 'ACM-T0110', dt: '2026-08-16T12:30', loc: 'I-90 W · Spokane, WA', type: 'rear_end', status: 'review', source: 'driver-app', by: 'Jenna Frost', at: '2026-08-16', prev: 'Undetermined', claim: 'CLM-2026-0611', cBy: 'Dana Whitfield', cAt: '2026-08-16', alert: { level: 'warning', message: 'Third-party insurer not yet contacted.', at: '2026-08-16T13:00' }, caseKind: 'sent', adjuster: 'Dana Whitfield', desc: 'Rear-ended a car at a light; awaiting third-party details.' }),
    qa({ id: 'acc-sample-20', driverId: 'DRV-001-0063', driverName: 'Cody Ramsey', unit: 'ACM-T0113', dt: '2026-08-13T20:05', loc: 'US-59 S · Houston, TX', type: 'construction_zone', inj: true, status: 'review', source: 'driver-app', by: 'Cody Ramsey', at: '2026-08-13', prev: 'Undetermined', alert: { level: 'critical', message: 'Injury reported in a work zone — needs immediate review.', at: '2026-08-13T20:20' }, caseKind: 'requested', adjuster: 'Priya Nair', desc: 'Struck an attenuator in a work zone; one occupant complained of pain.' }),
    qa({ id: 'acc-sample-21', driverId: 'DRV-001-0031', driverName: 'Rachel Nguyen', unit: 'ACM-T0116', dt: '2026-08-10T09:00', loc: 'I-70 E · Denver, CO', type: 'minor_incident', sev: 'Low', status: 'reported', source: 'office', by: 'Dispatch (office)', at: '2026-08-10', alert: { level: 'info', message: 'Low-severity report — pending classification.', at: '2026-08-10T09:15' }, desc: 'Low-speed contact with a bollard at a fuel island.' }),
    qa({ id: 'acc-sample-22', driverId: 'DRV-001-0049', driverName: 'Omar Haddad', unit: 'ACM-T0119', dt: '2026-08-06T14:50', loc: 'I-15 N · Las Vegas, NV', type: 'cargo_shift', status: 'reported', source: 'driver-app', by: 'Omar Haddad', at: '2026-08-06', haz: true, alert: { level: 'warning', message: 'Dangerous-goods load shifted — placarding and securement under review.', at: '2026-08-06T15:10' }, desc: 'Dangerous-goods load shifted after hard braking; drum seepage checked, securement re-done.' }),
];

/**
 * The showcase record — EVERY field filled, every upload group populated (with uploader +
 * date + tags), other vehicles, witnesses, police, claim, case thread and audit trail. Newest
 * reportedAt so it sorts to the top of the list, for testing the detail page + PDF end-to-end.
 */
function buildShowcaseAccident(accountId?: string): AccidentRecord {
    const AT = '2026-08-20T16:20';
    const f = (id: string, name: string, tags: string[], uploadedBy: string, note?: string): AccidentFile =>
        ({ id, fileName: name, fileSize: 240 + name.length * 17, tags, note, uploadedBy, uploadedAt: AT });
    // Reference REAL fleet assets so the report can show full vehicle detail (make/model/year…).
    const assets = accountId ? getAssetsForAccount(accountId) : [];
    const truck = assets.find(a => a.assetType === 'Truck');
    const trailer = assets.find(a => a.assetType === 'Trailer');
    return {
        id: 'acc-sample-0',
        driverId: 'DRV-001-0003', driverName: 'Michael Reeves',
        dateTime: '2026-08-20T14:35', location: 'I-90 W, Mile 47 · Snoqualmie Pass, WA',
        accidentTypeId: 'injuries', accidentTypeIds: ['injuries', 'rollover', 'tow_away', 'reportable_dot'],
        unitId: truck?.unitNumber ?? 'ACM-T0140',
        description: 'Descending Snoqualmie Pass in heavy rain, traffic braked suddenly for a stalled car. The tractor-trailer hydroplaned, jackknifed and the trailer rolled onto its side across two lanes, clipping a pickup and a sedan. HAZMAT drum breached; westbound lanes closed ~3 hours for recovery and cleanup.',
        injuries: true, injuryNotes: 'Company driver: seatbelt bruising, treated and released. Pickup passenger: transported for precautionary neck evaluation.', photoCount: 9,
        status: 'verified', source: 'driver-app',
        reportedBy: 'Michael Reeves', reportedAt: '2026-08-20',
        severity: 'High', points: 9, preventable: 'Preventable',
        claimNumber: 'CLM-2026-0640', insurer: 'Great West Casualty', thirdParty: 'Ford F-150 (pickup) + Toyota Camry (sedan)',
        managerNotes: 'Dashcam shows following distance too short for the wet grade. Coaching + wet-weather refresher assigned.',
        verifiedBy: 'Kenan Gain', verifiedAt: '2026-08-22',
        claimedBy: 'Priya Nair', claimedAt: '2026-08-20',
        driverPhone: '(206) 555-0173', driverStreet: '5120 Rainier Ave S', driverCity: 'Seattle', driverState: 'WA', driverZip: '98118', driverCountry: 'USA',
        driverDob: '1992-06-18', driverHiredDate: '2025-04-02', driverLicenceIssueDate: '2022-08-11',
        licenceNumber: 'WA-RVMCK-8841', licenceExpiry: '2029-03-14', licenceProvince: 'WA',
        // vehicle & trailer — from the fleet DB (with fallbacks if the fleet is empty)
        vehicleAssetId: truck?.id, vehiclePlate: truck?.plateNumber ?? 'WA-C84512', vehicleJurisdiction: truck?.plateJurisdiction ?? 'WA', vehicleVin: truck?.vin ?? '1FUJGLDR9CLBP1234',
        trailerUnit: trailer?.unitNumber ?? 'ACM-TR220', trailerAssetId: trailer?.id, trailerPlate: trailer?.plateNumber ?? 'WA-T22190', trailerJurisdiction: trailer?.plateJurisdiction ?? 'WA', trailerVin: trailer?.vin ?? '1JJV532W1FL987654',
        // police
        policePresent: true, officer1Name: 'Trooper D. Sorensen', officer1Badge: '3391', officer2Name: 'Trooper A. Lin', officer2Badge: '4102',
        policeAgency: 'Washington State Patrol', policeAgencyPhone: '(360) 555-0142',
        citationIssued: true, citationNumber: 'WSP-2026-55210', arrested: false, policeNote: 'Collision report WSP-2026-55210 filed; HAZMAT team + DOT notified. Copy requested from WSP records.',
        citationFiles: [f('acc-sample-0-cit', 'citation-following-too-close.pdf', ['Original'], 'Michael Reeves')],
        policeReportFiles: [f('acc-sample-0-pol', 'wsp-collision-report.pdf', ['Verified', 'Certified'], 'Dispatch (office)', 'Official WSP collision report.')],
        // location (structured)
        accStreet: 'Interstate 90 Westbound', accCity: 'Snoqualmie Pass', accState: 'WA', accCountry: 'USA', accZip: '98068', locationType: 'Mountain / steep grade',
        // road & environment
        roadType: 'Highway / Freeway', postedSpeed: '60', gradePercent: '6',
        roadCondsList: ['Curve', 'Downgrade', 'Wet'], trafficControlsList: [], trafficCondsList: ['Heavy', 'Stop & go'], weatherList: ['Rain', 'Fog'], visibilityList: ['Daylight'],
        vehicleSpeed: '58',
        // collision
        landmarks: 'Just west of the Snoqualmie Pass summit rest area', directionOfTravel: 'Westbound', travelSpeed: '58', travelSpeedUnit: 'mph', headlightsOn: true, laneNumber: '2', lanesWide: '3',
        warningSignals: true, warningSignalDesc: 'Four-way flashers on; reflective triangles set out behind the wreck.',
        // severity
        numFatalities: '0', numInjuries: '2', numVehiclesTowed: '2', towAway: true, hazmatSpill: true, vehiclesInCollision: '3',
        // hazmat
        hazardousCommodity: 'Paint & resin (flammable liquid)', hazmatClass: 'Class 3 — Flammable Liquids', unNaNumber: 'UN1263', quantityReleased: '~40 L', placarded: true, hazmatValue: '6,800', hazmatValueCurrency: 'USD',
        // crash-time
        odometerAfter: '284,910', hrsDrivingAtCrash: '7.5', hrsOnDutyAtCrash: '9.5', lastDutyStatus: 'Driving', lastDvirStatus: 'No defects reported',
        // cargo (legacy + new model)
        commodityLost: 'Palletized paint & industrial resin', cargoLost: 'approx. 3 pallets', cargoDamaged: true, cargoDamageValue: '$18,500', cargoDamageDesc: 'Drums crushed and breached in the rollover; product unsalvageable.',
        commodityDamaged: true, commodityDescription: 'Paint & industrial resin (palletized)', commodityQty: '3 pallets', commodityValue: '18,500', commodityValueCurrency: 'USD', commodityLoss: 'Total',
        // towing
        towingCompany: 'Cascade Heavy Recovery', towingBill: '7,250', towingBillCurrency: 'USD', towingContact: 'R. Delgado', towingPhone: '(425) 555-0198', towingEmail: 'dispatch@cascaderecovery.com', towingAddress: '900 Industrial Way, North Bend, WA 98045',
        towCompany: 'Cascade Heavy Recovery', towBill: '$7,250',
        towingInvoiceFiles: [f('acc-sample-0-tow', 'towing-invoice-cascade.pdf', ['Original'], 'Dispatch (office)')],
        // repair
        repairVendor: 'Evergreen Fleet Repair', repairStatus: 'In repair', estimatedRepair: '46,000', totalRepairAmount: '52,300', repairCurrency: 'USD',
        repairFiles: [f('acc-sample-0-rep', 'repair-estimate-evergreen.pdf', ['Primary'], 'Dispatch (office)', 'Estimate pending adjuster approval.')],
        // claim
        insuranceCarrier: 'Great West Casualty', insurancePolicyNumber: 'GW-88231-04', adjusterName: 'Priya Nair', adjusterPhone: '(800) 555-0110', adjusterEmail: 'priya.nair@greatwestcasualty.com',
        tpaAdmin: 'Sedgwick CMS', totalLoss: false, subrogation: true, amountPaid: '12,000', cashReserve: '60,000', totalIncurred: '72,000', claimCurrency: 'USD', claimStatus: 'Partially Paid',
        adjusterNote: 'Reserve set at $60k pending third-party liability split. Subrogation opened against the stalled-vehicle owner.',
        attachLedger: true,
        ledgerFiles: [f('acc-sample-0-led', 'claim-ledger.pdf', ['Primary'], 'Priya Nair')],
        claimDocsFiles: [f('acc-sample-0-cd', 'proof-of-loss.pdf', ['Signed'], 'Priya Nair'), f('acc-sample-0-cd2', 'coverage-confirmation.pdf', ['Copy'], 'Priya Nair')],
        // internal review
        internalNotes: 'Preventable per NSC criteria — following distance for the wet 6% downgrade. Refresher + telematics coaching assigned; recordable DOT accident logged.',
        additionalDocsFiles: [f('acc-sample-0-add', 'internal-investigation-notes.pdf', ['Pending Review'], 'Kenan Gain')],
        // driver statement
        driverStatementText: 'Traffic stopped suddenly on the wet downgrade. I braked and the trailer began to slide; I tried to steer out of it but the rig jackknifed and the trailer went over. I turned off the engine, set out triangles and called it in.',
        driverStatementFiles: [f('acc-sample-0-ds', 'driver-statement-reeves.pdf', ['Signed', 'Primary'], 'Michael Reeves', 'Signed at the scene.')],
        // evidence
        photoFiles: [
            f('acc-sample-0-ph1', 'scene-overview.jpg', ['Primary'], 'Michael Reeves', 'Trailer on its side across lanes 1–2.'),
            f('acc-sample-0-ph2', 'hazmat-spill.jpg', ['Cargo spill picture'], 'Michael Reeves'),
            f('acc-sample-0-ph3', 'roadway-skid-marks.jpg', ['Original'], 'Michael Reeves'),
        ],
        vehicleDamageFiles: [
            f('acc-sample-0-vd1', 'tractor-front.jpg', ['Vehicle damaged', 'Vehicle - Front'], 'Michael Reeves'),
            f('acc-sample-0-vd2', 'trailer-roof.jpg', ['Trailer damage'], 'Michael Reeves'),
            f('acc-sample-0-vd3', 'left-side.jpg', ['Vehicle - Left'], 'Michael Reeves'),
        ],
        videoFiles: [f('acc-sample-0-vid', 'scene-walkaround.mp4', ['Original'], 'Michael Reeves')],
        dashcamFiles: [f('acc-sample-0-dc', 'dashcam-forward.mp4', ['Verified'], 'Michael Reeves', 'Forward dashcam, 30s before impact.')],
        elogFiles: [f('acc-sample-0-el', 'eld-hos-log.pdf', ['Certified'], 'Dispatch (office)')],
        // other vehicles
        otherVehicles: [
            {
                id: 'acc-sample-0-ov1', year: '2020', make: 'Ford', model: 'F-150', colour: 'Blue', plate: 'WA-BKT4471', plateJurisdiction: 'WA', vehicleVin: '1FTFW1E50LFA12345',
                driverName: 'Greg Sauer', driverAddress: '77 Cedar St, North Bend, WA', driverPhone: '(425) 555-0233', licenceNumber: 'WA-SAUER-2201', licenceProvince: 'WA', licenceExpiry: '2028-06-01',
                ownerName: 'Sauer Contracting', personsInVehicle: '2', injured: true, injuredPassenger: true, insuranceCompany: 'Intact', policyNumber: 'INT-90112',
                actions: ['Slowing or stopping', 'Struck by trailer'], actionsOther: '',
                coiFiles: [f('acc-sample-0-coi1', 'coi-sauer-contracting.pdf', ['Copy'], 'Greg Sauer')],
            },
            {
                id: 'acc-sample-0-ov2', year: '2018', make: 'Toyota', model: 'Camry', colour: 'Silver', plate: 'WA-JHP882', plateJurisdiction: 'WA', vehicleVin: '4T1B11HK5JU556677',
                driverName: 'Alicia Monroe', driverPhone: '(206) 555-0311', licenceNumber: 'WA-MONRO-5521', licenceProvince: 'WA',
                ownerName: 'Alicia Monroe', personsInVehicle: '1', injured: false, insuranceCompany: 'State Farm', policyNumber: 'SF-4410923',
                actions: ['Stopped or parked'], actionsOther: '',
                coiFiles: [f('acc-sample-0-coi2', 'coi-monroe.pdf', ['Copy'], 'Alicia Monroe')],
            },
        ],
        // witnesses
        witnesses: [
            { id: 'acc-sample-0-w1', name: 'Roy Kensington', phone: '(425) 555-0271', address: '12 Summit View Dr, Snoqualmie, WA', province: 'WA', sawAccident: true, whereWhen: 'Two vehicles behind in the right lane.', cause: 'Rig was going too fast for the wet downgrade and stopped traffic.', statementFiles: [f('acc-sample-0-ws1', 'witness-kensington.pdf', ['Signed'], 'Roy Kensington')] },
            { id: 'acc-sample-0-w2', name: 'Dana Whitfield', phone: '(206) 555-0410', province: 'WA', sawAccident: true, whereWhen: 'Oncoming, eastbound.', cause: 'Sudden stop, then the trailer slid and rolled.', statementFiles: [f('acc-sample-0-ws2', 'witness-whitfield.pdf', ['Signed'], 'Dana Whitfield')] },
        ],
        witnessNotes: 'Both witnesses provided contact details and agreed to follow-up statements if needed.',
        // case communication
        case: {
            status: 'responded',
            adjusterName: 'Priya Nair', adjusterEmail: 'priya.nair@greatwestcasualty.com',
            messages: [
                { id: 'acc-sample-0-c1', kind: 'send', from: 'carrier', by: 'Kenan Gain', at: '2026-08-20T18:00', subject: 'Accident report — Accidents w/Injuries (Michael Reeves)', body: 'Hi Priya,\n\nPlease find attached our accident report for Michael Reeves (unit ACM-T0140) on Aug 20 at I-90 W, Snoqualmie Pass WA, with the supporting documents, photos and evidence.\n\nRegards,\nKenan Gain', attachments: [{ name: 'accident-report-michael-reeves.pdf', group: 'Accident report' }, { name: 'driver-statement-reeves.pdf', group: 'Driver statement' }, { name: 'wsp-collision-report.pdf', group: 'Police report' }, { name: 'scene-overview.jpg', group: 'Evidence pictures' }, { name: 'dashcam-forward.mp4', group: 'Dashcam video' }] },
                { id: 'acc-sample-0-c2', kind: 'request', from: 'adjuster', by: 'Priya Nair', at: '2026-08-21T10:20', body: 'Thanks for the complete file. To progress the claim please also send:', requestedItems: ['Repair estimate / invoice', 'HAZMAT cleanup invoice', 'Third-party COIs'] },
                { id: 'acc-sample-0-c3', kind: 'response', from: 'carrier', by: 'Kenan Gain', at: '2026-08-21T14:05', subject: 'Re: Requested documents — Accidents w/Injuries', body: 'Hi Priya,\n\nRequested documents attached.\n\nThanks,\nKenan Gain', attachments: [{ name: 'repair-estimate-evergreen.pdf', group: 'Repairs document' }, { name: 'towing-invoice-cascade.pdf', group: 'Towing invoice' }, { name: 'coi-sauer-contracting.pdf', group: 'COI — Other vehicle 1' }, { name: 'coi-monroe.pdf', group: 'COI — Other vehicle 2' }] },
            ],
        },
        // alert
        alert: { level: 'critical', message: 'HAZMAT + injury rollover — DOT-recordable; claim and cleanup in progress.', at: '2026-08-20T15:00' },
        // activity
        activity: [
            { id: 'acc-sample-0-a1', at: '2026-08-20T15:05', by: 'Michael Reeves', role: 'driver', action: 'Reported', detail: 'Submitted from the mobile app at the scene.' },
            { id: 'acc-sample-0-a2', at: '2026-08-20T17:30', by: 'Dana Whitfield', role: 'office', action: 'Updated', detail: 'Added police, HAZMAT, towing and third-party details.' },
            { id: 'acc-sample-0-a3', at: '2026-08-20T18:00', by: 'Kenan Gain', role: 'office', action: 'Sent case to adjuster', detail: '5 items via Email — accident report package.' },
            { id: 'acc-sample-0-a4', at: '2026-08-20T09:30', by: 'Priya Nair', role: 'office', action: 'Claim opened', detail: 'Insurance claim CLM-2026-0640 assigned to Priya Nair.' },
            { id: 'acc-sample-0-a5', at: '2026-08-21T10:20', by: 'Priya Nair', role: 'adjuster', action: 'Adjuster requested documents', detail: 'Repair estimate · HAZMAT cleanup invoice · Third-party COIs.' },
            { id: 'acc-sample-0-a6', at: '2026-08-21T14:05', by: 'Kenan Gain', role: 'office', action: 'Responded to adjuster', detail: '4 items sent.' },
            { id: 'acc-sample-0-a7', at: '2026-08-22T11:15', by: 'Kenan Gain', role: 'manager', action: 'Verified', detail: 'Classified High / preventable; DOT-recordable logged.' },
        ],
    };
}

/**
 * Rich, fully-populated sample accident records for demo / testing — every section
 * filled (other vehicles, witnesses, police, evidence, cargo, tow/repair, audit
 * trail) so the list + detail page can be exercised end-to-end. Ids are stable so
 * loading twice never duplicates.
 */
export function buildSampleAccidents(owner?: Partial<AccidentOwnerInfo>, accountId?: string): AccidentRecord[] {
    const o = owner ?? {};
    const samples: AccidentRecord[] = [
        {
            id: 'acc-sample-1',
            driverId: 'DRV-001-0007', driverName: 'Marcus Reyes',
            dateTime: '2026-08-03T16:42', location: 'I-80 W, Mile 284 · Elko, NV',
            accidentTypeId: 'tow_away', unitId: 'ACM-T0111',
            description: 'Lost traction on a wet curve, tractor jackknifed and struck the median barrier. Trailer overturned partially; lane closed for recovery.',
            injuries: true, injuryNotes: 'Driver treated for minor lacerations at scene, released.', photoCount: 0,
            status: 'verified', source: 'driver-app',
            reportedBy: 'Marcus Reyes', reportedAt: '2026-08-03',
            severity: 'High', points: 8, preventable: 'Preventable',
            claimNumber: 'CLM-2026-0502', insurer: 'Great West Casualty', thirdParty: 'None',
            managerNotes: 'Dashcam confirms excessive speed for conditions. Coaching + refresher assigned.',
            verifiedBy: 'Kenan Gain', verifiedAt: '2026-08-05',
            claimedBy: 'Priya Nair', claimedAt: '2026-08-04',
            driverPhone: '(775) 555-0148', driverStreet: '410 Idaho St', driverCity: 'Elko', driverState: 'NV', driverZip: '89801', driverCountry: 'USA',
            licenceNumber: 'NV-9920184', licenceExpiry: '2028-04-30', licenceProvince: 'NV',
            lastDutyStatus: 'Driving', lastDvirStatus: 'No defects reported',
            numFatalities: '0', numInjuries: '1', numVehiclesTowed: '1', towAway: true, hazmatSpill: false,
            odometerAfter: '512,340', hrsDrivingAtCrash: '6.5', hrsOnDutyAtCrash: '9.0',
            commodityLost: 'Palletized canned goods', cargoLost: 'approx. 2 pallets', cargoDamaged: true,
            cargoDamageValue: '$4,200', cargoDamageDesc: 'Crushed cartons from trailer roll; product unsalvageable.',
            directionOfTravel: 'Westbound', travelSpeed: '96', travelSpeedUnit: 'km/h', headlightsOn: true,
            laneNumber: '1', lanesWide: '2', landmarks: 'Just past the Elko rest area on-ramp',
            accStreet: 'Interstate 80 WB', accCity: 'Elko', accState: 'NV', accCountry: 'USA', accZip: '89801', locationType: 'Highway / Freeway',
            roadType: 'Highway / Freeway', postedSpeed: '105',
            roadCondsList: ['Curve', 'Wet'], trafficControlsList: [], trafficCondsList: ['Light'], weatherList: ['Rain'], visibilityList: ['Daylight'],
            insuranceCarrier: 'Great West Casualty', insurancePolicyNumber: 'GW-88231-04', adjusterName: 'Priya Nair', adjusterPhone: '(800) 555-0110', adjusterEmail: 'priya.nair@greatwestcasualty.com',
            tpaAdmin: 'Sedgwick CMS', towCompany: 'Elko Heavy Recovery', towBill: '$3,850', repairVendor: 'Silver State Truck Repair', repairStatus: 'In repair',
            repairFiles: [sf('acc-sample-1-rep', 'repair-estimate.pdf', 1, { note: 'Silver State estimate — pending adjuster approval.', tags: ['Primary'] })],
            policePresent: true, officer1Name: 'Trooper J. Alvarez', officer1Badge: '4471', policeAgency: 'Nevada Highway Patrol', policeAgencyPhone: '(775) 555-0199',
            citationIssued: true, citationNumber: 'NHP-2026-77120', citationFiles: [sf('acc-sample-1-cit', 'citation-ticket.pdf', 1, { note: 'Speed too fast for conditions.', tags: ['Original'] })],
            arrested: false, policeNote: 'Report filed; copy requested from NHP records.',
            policeReportFiles: [sf('acc-sample-1-pol', 'nhp-collision-report.pdf', 1, { note: 'Official NHP collision report.', tags: ['Verified', 'Certified'] })],
            otherVehicles: [{
                id: 'acc-sample-1-ov1', year: '2019', make: 'Honda', colour: 'Grey', plate: 'NV-7KZ221',
                driverName: 'Linda Park', driverAddress: '88 Spring St, Elko, NV', driverPhone: '(775) 555-0233',
                licenceNumber: 'NV-5521099', licenceProvince: 'NV', licenceExpiry: '2027-11-15',
                ownerName: 'Linda Park', personsInVehicle: '1', injured: false,
                insuranceCompany: 'State Farm', policyNumber: 'SF-4410923',
                actions: ['Stopped or parked'], actionsOther: '',
            }],
            witnesses: [{
                id: 'acc-sample-1-w1', name: 'Roy Kensington', phone: '(775) 555-0271', address: '12 Ruby View Dr, Elko, NV', province: 'NV',
                sawAccident: true, whereWhen: 'Following two vehicles behind in the right lane.', cause: 'Truck was going too fast for the wet curve.',
                statementFiles: [sf('acc-sample-1-ws', 'witness-statement-kensington.pdf', 1)],
            }],
            photoFiles: [sf('acc-sample-1-ph', 'scene-front.jpg', 1, { note: 'Front of tractor against barrier.', tags: ['Primary'] }), sf('acc-sample-1-ph', 'trailer-damage.jpg', 2, { tags: ['Original'] }), sf('acc-sample-1-ph', 'barrier.jpg', 3)],
            videoFiles: [sf('acc-sample-1-vid', 'dashcam-clip.mp4', 1, { note: 'Forward dashcam, 30s before impact.', tags: ['Verified'] })],
            driverStatementFiles: [sf('acc-sample-1-ds', 'driver-statement.pdf', 1, { note: 'Signed at the scene.', tags: ['Signed', 'Primary'] })],
            case: {
                status: 'responded',
                adjusterName: 'Priya Nair', adjusterEmail: 'priya.nair@greatwestcasualty.com',
                messages: [
                    { id: 'acc-sample-1-c1', kind: 'send', from: 'carrier', by: 'Kenan Gain', at: '2026-08-04T10:15', subject: 'Accident report — Accidents w/Tow-Away (Marcus Reyes)', body: 'Hi Priya,\n\nPlease find attached our accident report for Marcus Reyes (unit ACM-T0111) on Aug 3 at I-80 W, Elko NV, with the supporting documents and evidence.\n\nRegards,\nKenan Gain', attachments: [{ name: 'driver-statement.pdf', group: 'Driver statement' }, { name: 'nhp-collision-report.pdf', group: 'Police report' }, { name: 'citation-ticket.pdf', group: 'Citation / ticket' }, { name: 'scene-front.jpg', group: 'Evidence pictures' }, { name: 'dashcam-clip.mp4', group: 'Video' }] },
                    { id: 'acc-sample-1-c2', kind: 'request', from: 'adjuster', by: 'Priya Nair', at: '2026-08-04T15:40', body: 'Thanks for the file. To progress the claim please send the following:', requestedItems: ['Repair estimate / invoice', 'Additional trailer damage photos'] },
                    { id: 'acc-sample-1-c3', kind: 'response', from: 'carrier', by: 'Kenan Gain', at: '2026-08-05T09:05', subject: 'Re: Requested documents — Accidents w/Tow-Away', body: 'Hi Priya,\n\nPlease find the requested documents attached.\n\nThanks,\nKenan Gain', attachments: [{ name: 'repair-estimate.pdf', group: 'Repairs document' }, { name: 'trailer-damage.jpg', group: 'Evidence pictures' }] },
                ],
            },
            activity: [
                { id: 'a1a', at: '2026-08-03T17:10', by: 'Marcus Reyes', role: 'driver', action: 'Reported', detail: 'Submitted from the mobile app at the scene.' },
                { id: 'a1b', at: '2026-08-04T09:20', by: 'Dana Whitfield', role: 'office', action: 'Updated', detail: 'Added third-party and insurance details.' },
                { id: 'a1d', at: '2026-08-04T10:15', by: 'Kenan Gain', role: 'office', action: 'Sent case to adjuster', detail: '5 attachments — accident report package.' },
                { id: 'a1e', at: '2026-08-04T15:40', by: 'Priya Nair', role: 'adjuster', action: 'Adjuster requested documents', detail: 'Repair estimate / invoice · Additional trailer damage photos.' },
                { id: 'a1f', at: '2026-08-05T09:05', by: 'Kenan Gain', role: 'office', action: 'Responded to adjuster', detail: '2 attachments sent.' },
                { id: 'a1c', at: '2026-08-05T11:05', by: 'Kenan Gain', role: 'manager', action: 'Verified', detail: 'Classified High / preventable after dashcam review.' },
            ],
        },
        {
            id: 'acc-sample-2',
            driverId: 'DRV-001-0011', driverName: 'Sofia Alvarez',
            dateTime: '2026-08-14T07:55', location: 'Hwy 401 EB, Milton, ON',
            accidentTypeId: 'property_damage', unitId: 'ACM-T0108',
            description: 'Clipped a merging pickup in stop-and-go traffic. Minor damage to right fairing; other vehicle bumper scuffed.',
            injuries: false, photoCount: 0,
            status: 'review', source: 'office',
            reportedBy: 'Dispatch (office)', reportedAt: '2026-08-14',
            severity: 'Low', points: 2, preventable: 'Undetermined',
            claimNumber: 'CLM-2026-0514', insurer: '', thirdParty: 'Red Ford F-150',
            managerNotes: 'Waiting on driver statement and third-party insurer.',
            claimedBy: 'Dana Whitfield', claimedAt: '2026-08-15',
            driverPhone: '(905) 555-0166', driverStreet: '77 Derry Rd', driverCity: 'Milton', driverState: 'ON', driverZip: 'L9T 7K2', driverCountry: 'Canada',
            licenceNumber: 'ON-A1122-33445', licenceExpiry: '2029-02-20', licenceProvince: 'ON',
            lastDutyStatus: 'On-duty (not driving)', lastDvirStatus: 'No defects reported',
            numFatalities: '0', numInjuries: '0', numVehiclesTowed: '0', towAway: false, hazmatSpill: false,
            directionOfTravel: 'Eastbound', travelSpeed: '15', travelSpeedUnit: 'km/h', headlightsOn: true,
            laneNumber: '2', lanesWide: '4', landmarks: 'Near the James Snow Pkwy exit',
            roadType: 'Highway / Freeway', postedSpeed: '100',
            roadCondsList: ['Straight', 'Dry'], trafficControlsList: [], trafficCondsList: ['Stop & go'], weatherList: ['Clear'], visibilityList: ['Daylight'],
            otherVehicles: [{
                id: 'acc-sample-2-ov1', year: '2021', make: 'Ford', colour: 'Red', plate: 'ON-BXPT 442',
                driverName: 'Greg Sauer', driverPhone: '(905) 555-0288', ownerName: 'Sauer Contracting', personsInVehicle: '2',
                injured: false, insuranceCompany: 'Intact', policyNumber: 'INT-90112',
                actions: ['Merging', 'Driving straight ahead'], actionsOther: '',
            }],
            witnesses: [],
            photoFiles: [sf('acc-sample-2-ph', 'right-fairing.jpg', 1, { note: 'Scuff on right fairing.', tags: ['Primary'] }), sf('acc-sample-2-ph', 'other-vehicle-bumper.jpg', 2)],
            videoFiles: [sf('acc-sample-2-vid', 'dashcam-forward.mp4', 1, { tags: ['Original'] })],
            driverStatementFiles: [sf('acc-sample-2-ds', 'sofia-statement.pdf', 1, { note: 'Driver statement, emailed.', tags: ['Signed'] })],
            policeReportFiles: [sf('acc-sample-2-pol', 'exchange-of-info.pdf', 1, { note: 'No police attended — info exchange only.', tags: ['Copy'] })],
            alert: { level: 'warning', message: 'Driver statement overdue by 3 days — follow up required.', at: '2026-08-17T09:00' },
            activity: [
                { id: 'a2a', at: '2026-08-14T08:40', by: 'Dispatch (office)', role: 'office', action: 'Created', detail: 'Entered from a phoned-in report.' },
                { id: 'a2b', at: '2026-08-15T10:15', by: 'Kenan Gain', role: 'manager', action: 'Updated', detail: 'Requested driver statement.' },
            ],
        },
        {
            id: 'acc-sample-3',
            driverId: 'DRV-001-0019', driverName: 'Tyrone Bell',
            dateTime: '2026-08-18T21:15', location: 'US-75 S · Dallas, TX',
            accidentTypeId: 'injuries', unitId: 'ACM-T0114',
            description: 'Rear-ended at a sudden slowdown near a work zone. Airbag deployed in the following car; occupant transported.',
            injuries: true, injuryNotes: 'Third-party driver transported with neck/back complaints.', photoCount: 0,
            status: 'reported', source: 'driver-app',
            reportedBy: 'Tyrone Bell', reportedAt: '2026-08-18',
            severity: '', points: '', preventable: '',
            claimNumber: '', insurer: '', thirdParty: '', managerNotes: '',
            driverPhone: '(214) 555-0132', driverStreet: '2200 Ross Ave', driverCity: 'Dallas', driverState: 'TX', driverZip: '75201', driverCountry: 'USA',
            licenceNumber: 'TX-31882044', licenceExpiry: '2027-09-10', licenceProvince: 'TX',
            lastDutyStatus: 'Driving', lastDvirStatus: 'Defects corrected',
            numFatalities: '0', numInjuries: '1', numVehiclesTowed: '1', towAway: false, hazmatSpill: false,
            directionOfTravel: 'Southbound', travelSpeed: '70', travelSpeedUnit: 'km/h', headlightsOn: true,
            laneNumber: '3', lanesWide: '4', landmarks: 'Approaching the Mockingbird Ln work zone',
            roadType: 'Highway / Freeway', postedSpeed: '95',
            roadCondsList: ['Straight', 'Dry', 'Debris/construction'], trafficControlsList: [], trafficCondsList: ['Stop & go'], weatherList: ['Clear'], visibilityList: ['Darkness'],
            photoFiles: [sf('acc-sample-3-ph', 'rear-of-car.jpg', 1, { note: 'Rear of the third-party car.', tags: ['Primary'] }), sf('acc-sample-3-ph', 'work-zone.jpg', 2, { tags: ['Original'] }), sf('acc-sample-3-ph', 'truck-front.jpg', 3)],
            videoFiles: [sf('acc-sample-3-vid', 'dashcam-rear.mp4', 1, { note: 'Rear dashcam of the slowdown.', tags: ['Verified'] })],
            driverStatementFiles: [sf('acc-sample-3-ds', 'tyrone-statement.pdf', 1, { note: 'Written at the scene.', tags: ['Signed', 'Primary'] })],
            policeReportFiles: [sf('acc-sample-3-pol', 'dpd-report.pdf', 1, { note: 'Dallas PD report pending case number.', tags: ['Pending Review'] })],
            citationIssued: false,
            witnesses: [{
                id: 'acc-sample-3-w1', name: 'Marta Ruiz', phone: '(214) 555-0177', province: 'TX',
                sawAccident: true, whereWhen: 'Stopped one lane over.', cause: 'Sudden slowdown at the work zone.',
                statementFiles: [sf('acc-sample-3-ws', 'witness-ruiz.pdf', 1, { tags: ['Signed'] })],
            }],
            alert: { level: 'critical', message: 'Injury report awaiting review — third party transported, police report still pending.', at: '2026-08-18T21:40' },
            activity: [
                { id: 'a3a', at: '2026-08-18T21:38', by: 'Tyrone Bell', role: 'driver', action: 'Reported', detail: 'Submitted from the mobile app at the scene.' },
            ],
        },
    ];
    // Seed the full demo set: the exhaustively-filled showcase record first, then the three
    // detailed samples, then the ~20 historical/recent MORE_SAMPLES so the list, filters, sorting,
    // pagination, case-response indicator and the Historical toggle all have data to work against.
    return [buildShowcaseAccident(accountId), ...samples, ...MORE_SAMPLES].map(r => ({ ...r, ...o }));
}

function loadStore(): Store {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw) as Store;
    } catch { /* ignore */ }
    return {};
}

function seedInto(acct: string) {
    if (acct === NO_ACCOUNT) return;
    let seeded: Record<string, number> = {};
    try { seeded = JSON.parse(localStorage.getItem(SEEDED_KEY) || '{}'); } catch { /* ignore */ }
    if (seeded[acct] === SEED_VERSION) return;
    const store = loadStore();
    const samples = buildSampleAccidents(carrierOwnerInfo(acct), acct);
    const sampleIds = new Set(samples.map(s => s.id));
    // Refresh the demo rows to the latest definitions (new case threads / alerts show up);
    // anything the user added or a non-sample row is kept untouched.
    const userRows = (store[acct] ?? []).filter(r => !sampleIds.has(r.id));
    store[acct] = [...samples, ...userRows];
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
    seeded[acct] = SEED_VERSION;
    try { localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded)); } catch { /* ignore */ }
}

/** Fill the Owner information from the carrier for any record that's missing it (demo seeds,
 *  or records saved before the owner was auto-populated). Non-destructive: records that
 *  already carry an owner name are left untouched. */
function backfillOwner(list: AccidentRecord[], acct: string): AccidentRecord[] {
    const owner = carrierOwnerInfo(acct === NO_ACCOUNT ? undefined : acct);
    if (!owner.ownerName) return list;               // carrier has no name to fill in
    let changed = false;
    const next = list.map(r => {
        if (r.ownerName) return r;                   // already populated
        changed = true;
        return { ...r, ...owner };
    });
    return changed ? next : list;
}

function loadFor(acct: string): AccidentRecord[] {
    seedInto(acct);
    return backfillOwner(loadStore()[acct] ?? [], acct);
}

function persistFor(acct: string, list: AccidentRecord[]) {
    const store = loadStore();
    store[acct] = list;
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* best-effort */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

/** Hook: this carrier's accident records + add / update / remove. */
export function useAccidentRecords(accountId?: string) {
    const acct = accountId || NO_ACCOUNT;
    const [records, setRecords] = useState<AccidentRecord[]>(() => loadFor(acct));

    useEffect(() => {
        const h = () => setRecords(loadFor(acct));
        h();
        window.addEventListener(EVENT, h);
        window.addEventListener('storage', h);
        return () => {
            window.removeEventListener(EVENT, h);
            window.removeEventListener('storage', h);
        };
    }, [acct]);

    /** Newest first (by report date, then when-it-happened). */
    const sorted = [...records].sort((a, b) => (b.reportedAt).localeCompare(a.reportedAt) || (b.dateTime).localeCompare(a.dateTime));

    const add = (r: AccidentRecord) => persistFor(acct, [r, ...loadFor(acct)]);
    const update = (r: AccidentRecord) => persistFor(acct, loadFor(acct).map(x => (x.id === r.id ? r : x)));
    const remove = (id: string) => persistFor(acct, loadFor(acct).filter(x => x.id !== id));

    /** Load / refresh the rich sample records. Existing sample rows are replaced with the
     *  latest definitions (so new demo docs/photos show up); user records are preserved. */
    const loadSample = (): number => {
        const cur = loadFor(acct);
        const samples = buildSampleAccidents(carrierOwnerInfo(accountId), accountId);
        const sampleIds = new Set(samples.map(s => s.id));
        const kept = cur.filter(r => !sampleIds.has(r.id));
        persistFor(acct, [...samples, ...kept]);
        return samples.length;
    };

    return { records: sorted, add, update, remove, loadSample };
}
