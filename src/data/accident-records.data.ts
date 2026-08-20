import { useEffect, useState } from 'react';
import type { AccidentRiskType } from '@/data/accident-types.data';
import { buildProfileBundle } from '@/pages/accounts/carrier-datasets.data';

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
export interface AccidentFile { id: string; fileName: string; fileSize?: number; note?: string; tags?: string[]; }

/** One audit-trail entry — who did what, and when. */
export type ActivityRole = 'driver' | 'office' | 'manager' | 'system';
export interface AccidentActivity {
    id: string;
    at: string;          // 'YYYY-MM-DDTHH:mm'
    by: string;          // person name
    role: ActivityRole;
    action: string;      // 'Reported', 'Created', 'Updated', 'Verified', …
    detail?: string;
}

/** A third-party / other vehicle involved in the collision (dynamic, up to 5). */
export interface OtherVehicle {
    id: string;
    year?: string;
    make?: string;
    colour?: string;
    plate?: string;
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
    accidentTypeId: string;    // ACCIDENT_TYPES id ('' when unknown at report time)
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
    verifiedBy?: string;
    verifiedAt?: string;       // 'YYYY-MM-DD'
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
    tpaAdmin?: string;
    towCompany?: string;
    towBill?: string;
    repairVendor?: string;
    repairStatus?: string;
    repairFiles?: AccidentFile[];
    // ── Audit trail ──
    activity?: AccidentActivity[];
}

/** The auto-fillable Driver + Owner information subsets. */
export type AccidentDriverInfo = Pick<AccidentRecord, 'driverName' | 'driverPhone' | 'driverAddress' | 'driverStreet' | 'driverCity' | 'driverState' | 'driverZip' | 'driverCountry' | 'licenceNumber' | 'licenceExpiry' | 'licenceProvince'>;
export type AccidentOwnerInfo = Pick<AccidentRecord, 'ownerName' | 'ownerAddress' | 'ownerStreet' | 'ownerCity' | 'ownerState' | 'ownerZip' | 'ownerCountry' | 'ownerPhone' | 'policyNumber' | 'nscCvor'>;

export const ACCIDENT_STATUS_META: Record<AccidentStatus, { label: string; tone: string; dot: string }> = {
    reported: { label: 'Reported',     tone: 'border-amber-200 bg-amber-50 text-amber-700',       dot: 'bg-amber-500' },
    review:   { label: 'Under review', tone: 'border-blue-200 bg-blue-50 text-blue-700',          dot: 'bg-blue-500' },
    verified: { label: 'Verified',     tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

export const SOURCE_META: Record<AccidentSource, { label: string; tone: string }> = {
    'driver-app': { label: 'Driver app', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
    'office':     { label: 'Office',     tone: 'border-slate-200 bg-slate-50 text-slate-600' },
};

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

const KEY = 'accident-records-v1';
const SEEDED_KEY = 'accident-records-seeded-v1';
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
    driver:  { label: 'Driver',  tone: 'bg-violet-100 text-violet-700',   ring: 'bg-violet-500' },
    office:  { label: 'Office',  tone: 'bg-slate-100 text-slate-600',     ring: 'bg-slate-400' },
    manager: { label: 'Manager', tone: 'bg-blue-100 text-blue-700',       ring: 'bg-blue-500' },
    system:  { label: 'System',  tone: 'bg-emerald-100 text-emerald-700', ring: 'bg-emerald-500' },
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
    licenses?: Array<{ province?: string; expiryDate?: string; licenseNumber?: string }>;
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
    };
}

type Store = Record<string, AccidentRecord[]>;

const DEMO_RECORDS: AccidentRecord[] = [
    {
        id: 'acc-seed-1',
        driverId: 'DRV-001-0022', driverName: 'Barbara Cox',
        dateTime: '2026-07-28T14:20', location: 'I-94 W, Mile 172 · Battle Creek, MI',
        accidentTypeId: 'property_damage', unitId: 'ACM-T0103',
        description: 'Backed into a loading dock post at the receiver; minor damage to rear bumper. No other vehicle involved.',
        injuries: false, photoCount: 3,
        status: 'verified', source: 'office',
        reportedBy: 'Dispatch (office)', reportedAt: '2026-07-28',
        severity: 'Low', points: 2, preventable: 'Preventable',
        claimNumber: 'CLM-2026-0417', policeReport: '—', insurer: 'Great West Casualty',
        thirdParty: 'None', managerNotes: 'Reviewed dashcam. Coaching scheduled.',
        verifiedBy: 'Kenan Gain', verifiedAt: '2026-07-29',
    },
    {
        id: 'acc-seed-2',
        driverId: 'DRV-001-0002', driverName: 'Anthony Foster',
        dateTime: '2026-08-17T08:05', location: 'Hwy 401 EB near Cambridge, ON',
        accidentTypeId: 'tow_away', unitId: 'ACM-T0100',
        description: 'Rear-ended in slow traffic by a passenger vehicle. Truck driveable but trailer light bar damaged.',
        injuries: false, photoCount: 4,
        status: 'reported', source: 'driver-app',
        reportedBy: 'Anthony Foster', reportedAt: '2026-08-17',
        severity: '', points: '', preventable: '',
        claimNumber: '', policeReport: '', insurer: '', thirdParty: '', managerNotes: '',
    },
    {
        id: 'acc-seed-3',
        driverId: 'DRV-001-0016', driverName: 'Donald Jackson',
        dateTime: '2026-08-11T19:40', location: 'US-23 N · Toledo, OH',
        accidentTypeId: 'injuries', unitId: 'ACM-T0106',
        description: 'Side-swipe merging onto ramp. Other driver reported minor neck pain, EMS on scene.',
        injuries: true, injuryNotes: 'Third-party occupant — precautionary EMS check.', photoCount: 6,
        status: 'review', source: 'driver-app',
        reportedBy: 'Donald Jackson', reportedAt: '2026-08-11',
        severity: 'High', points: 7, preventable: 'Undetermined',
        claimNumber: 'CLM-2026-0431', policeReport: 'OH-88213', insurer: '', thirdParty: 'Silver sedan, 1 occupant',
        managerNotes: 'Awaiting police report + third-party insurer details.',
    },
];

/** Sample file helper — a named prototype upload reference (optional note / tags). */
function sf(prefix: string, name: string, i: number, extra?: { note?: string; tags?: string[] }): AccidentFile {
    return { id: `${prefix}-${i}`, fileName: name, fileSize: 220 + i * 37, ...extra };
}

/**
 * Rich, fully-populated sample accident records for demo / testing — every section
 * filled (other vehicles, witnesses, police, evidence, cargo, tow/repair, audit
 * trail) so the list + detail page can be exercised end-to-end. Ids are stable so
 * loading twice never duplicates.
 */
export function buildSampleAccidents(owner?: Partial<AccidentOwnerInfo>): AccidentRecord[] {
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
            insuranceCarrier: 'Great West Casualty', insurancePolicyNumber: 'GW-88231-04', adjusterName: 'Priya Nair', adjusterPhone: '(800) 555-0110',
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
            activity: [
                { id: 'a1a', at: '2026-08-03T17:10', by: 'Marcus Reyes', role: 'driver', action: 'Reported', detail: 'Submitted from the mobile app at the scene.' },
                { id: 'a1b', at: '2026-08-04T09:20', by: 'Dana Whitfield', role: 'office', action: 'Updated', detail: 'Added third-party and insurance details.' },
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
            activity: [
                { id: 'a3a', at: '2026-08-18T21:38', by: 'Tyrone Bell', role: 'driver', action: 'Reported', detail: 'Submitted from the mobile app at the scene.' },
            ],
        },
    ];
    return samples.map(r => ({ ...r, ...o }));
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
    let seeded: Record<string, boolean> = {};
    try { seeded = JSON.parse(localStorage.getItem(SEEDED_KEY) || '{}'); } catch { /* ignore */ }
    if (seeded[acct]) return;
    const store = loadStore();
    const existing = new Set((store[acct] ?? []).map(r => r.id));
    const fresh = DEMO_RECORDS.filter(d => !existing.has(d.id));
    if (fresh.length) {
        store[acct] = [...fresh, ...(store[acct] ?? [])];
        try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* ignore */ }
    }
    seeded[acct] = true;
    try { localStorage.setItem(SEEDED_KEY, JSON.stringify(seeded)); } catch { /* ignore */ }
}

function loadFor(acct: string): AccidentRecord[] {
    seedInto(acct);
    return loadStore()[acct] ?? [];
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
        const samples = buildSampleAccidents(carrierOwnerInfo(accountId));
        const sampleIds = new Set(samples.map(s => s.id));
        const kept = cur.filter(r => !sampleIds.has(r.id));
        persistFor(acct, [...samples, ...kept]);
        return samples.length;
    };

    return { records: sorted, add, update, remove, loadSample };
}
