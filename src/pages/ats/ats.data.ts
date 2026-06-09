// Mock data + types for the ATS (Application Tracking System) demo.
//
// The shape here roughly mirrors the requirements doc but is intentionally a
// flat in-memory model — there is no backend yet. Replace with real DTOs once
// the API exists.

export type PipelineStepId =
    | 'application_review'
    | 'psp'
    | 'mvr'
    | 'criminal_background'
    | 'substance_testing'
    | 'dot_employment_verification'
    | 'decision';

export type StepStatus =
    | 'not_started'
    | 'ordered'
    | 'in_progress'
    | 'completed'
    | 'skipped'
    | 'failed'
    | 'needs_review';

export type Stage = 'applications_received' | 'in_progress' | 'hired' | 'not_hired';
export type LicenseType = 'CDL-A' | 'CDL-B' | 'CDL' | 'Non-CDL';
export type ApplicantType = 'Driver' | 'Owner-Operator';

export interface WorkflowStep {
    id: PipelineStepId;
    label: string;
    /** Multi-line label for the progress tracker (matches the screenshot). */
    lines: string[];
    status: StepStatus;
    orderedAt?: string;
    completedAt?: string;
    skippedReason?: string;
    /** Per-step note shown in the right-rail "Required Actions" panel. */
    note?: string;
}

export interface CompanyQuestions {
    legallyEligibleUS: boolean;
    currentlyEmployed: boolean;
    lastEmploymentEnd?: string;
    speaksEnglish: boolean;
    workedHereBefore: boolean;
    twicCard: boolean;
    relativesEmployed?: string;
    otherName?: string;
    referralSource?: string;
    emergencyContactName?: string;
    emergencyAddress?: string;
    emergencyPhone?: string;
}

export interface DrivingExperienceRow {
    id: string;
    equipmentClass: 'Straight Truck' | 'Tractor & Semi-Trailer' | 'Tractor - Two Trailers' | 'Other';
    equipmentType: string;
    startDate?: string;
    endDate?: string;
    totalMiles?: number;
    verified: boolean;
}

export interface DocumentRow {
    id: string;
    label: string;
    category: 'Application' | 'Background' | 'MVR' | 'PSP' | 'Substance' | 'DOT' | 'Other';
    uploadedAt: string;
    uploadedBy: string;
    sizeKb: number;
    linkedStepId?: PipelineStepId;
}

export interface NoteRow {
    id: string;
    body: string;
    author: string;
    createdAt: string;
    visibility: 'internal' | 'manager' | 'compliance';
    linkedStepId?: PipelineStepId;
}

export interface AlertRow {
    id: string;
    severity: 'info' | 'warning' | 'critical';
    category: 'Missing data' | 'Compliance' | 'Document' | 'Screening' | 'Duplicate';
    title: string;
    detail: string;
    createdAt: string;
    resolvedAt?: string;
    linkedStepId?: PipelineStepId;
}

export interface EventLogRow {
    id: string;
    type: 'created' | 'field_updated' | 'step_skipped' | 'step_completed' | 'step_ordered'
        | 'document_uploaded' | 'note_added' | 'alert_created' | 'alert_resolved'
        | 'decision_saved' | 'converted_to_employee' | 'substance_scheduled';
    title: string;
    detail?: string;
    user: string;
    timestamp: string;
    linkedStepId?: PipelineStepId;
}

export interface SubstanceTest {
    donorName: string;
    licenseNumber?: string;
    phone?: string;
    employer: string;
    testType?: 'DOT' | 'NON_DOT';
    clinicName?: string;
    orderStatus: 'draft' | 'scheduled' | 'ordered' | 'completed' | 'cancelled' | 'failed';
}

export interface ScreeningOrder {
    id: string;
    type: 'psp' | 'mvr' | 'criminal_background' | 'dot_employment_verification';
    vendor: string;
    status: 'draft' | 'ordered' | 'scheduled' | 'complete' | 'cancelled' | 'failed';
    orderedAt?: string;
    completedAt?: string;
    resultSummary?: string;
}

export interface Applicant {
    id: string;
    // Identity
    firstName: string;
    middleName?: string;
    lastName: string;
    dateOfBirth: string;
    ssnMasked: string;
    email: string;
    phone?: string;
    cellPhone?: string;
    // Address
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    // Application meta
    licenseType: LicenseType;
    applicantType: ApplicantType;
    /** Geographic driver type captured at invite — drives the DQ profile and
     *  reflects through to the Hiring ATS / DQ Files after the application is submitted. */
    dqDriverType?: 'local' | 'us' | 'canada' | 'cross_border';
    positionApplied: string;
    appliedDate: string;
    daysInPipeline: number;
    stage: Stage;
    decisionStatus: 'pending' | 'hired' | 'not_hired';
    decisionReason?: string;
    preferredContactMethod?: string;
    bestTimeToContact?: string;
    addressesLast3Years?: string;
    /** Active hiring template — controls the consents, documents, and bookings
     *  surfaced on every step. Admins configure the templates in Settings. */
    assignedTemplateId: string;
    /** Headshot URL / data-URL. Optional — uploaded on the applicant detail. */
    photoUrl?: string;
    // Workflow
    steps: WorkflowStep[];
    activeStepId: PipelineStepId;
    // Application sections
    companyQuestions: CompanyQuestions;
    drivingExperience: DrivingExperienceRow[];
    substanceTest: SubstanceTest;
    screeningOrders: ScreeningOrder[];
    // Sidebar attachments
    documents: DocumentRow[];
    notes: NoteRow[];
    alerts: AlertRow[];
    eventLog: EventLogRow[];
}

// ── Pipeline step blueprint ───────────────────────────────────────────────

export const PIPELINE_BLUEPRINT: { id: PipelineStepId; label: string; lines: string[] }[] = [
    { id: 'application_review',          label: 'Application Review',            lines: ['Application', 'Review'] },
    { id: 'psp',                         label: 'PSP',                           lines: ['PSP'] },
    { id: 'mvr',                         label: 'MVR',                           lines: ['MVR'] },
    { id: 'criminal_background',         label: 'Criminal Background Check',     lines: ['Criminal', 'Background', 'Check'] },
    { id: 'substance_testing',           label: 'Substance Testing',             lines: ['Substance', 'Testing'] },
    { id: 'dot_employment_verification', label: 'DOT / Employment Verification', lines: ['DOT / Employment', 'Verification'] },
    { id: 'decision',                    label: 'Decision',                      lines: ['Decision'] },
];

// ── Helpers for building seed data ────────────────────────────────────────

function buildSteps(states: StepStatus[]): WorkflowStep[] {
    return PIPELINE_BLUEPRINT.map((b, i) => ({
        ...b,
        status: states[i] ?? 'not_started',
    }));
}

function findActive(steps: WorkflowStep[]): PipelineStepId {
    // First step that is in_progress, ordered, needs_review, failed, or not_started
    const active = steps.find(s => s.status === 'in_progress' || s.status === 'ordered' || s.status === 'needs_review' || s.status === 'failed' || s.status === 'not_started');
    return (active ?? steps[steps.length - 1]).id;
}

// ── Mock applicants ───────────────────────────────────────────────────────

const baseEvent = (id: string, type: EventLogRow['type'], title: string, days: number, user = 'Sarah Chen', detail?: string, linkedStepId?: PipelineStepId): EventLogRow => ({
    id,
    type,
    title,
    detail,
    user,
    timestamp: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
    linkedStepId,
});

const _Robert: Applicant = (() => {
    const steps = buildSteps(['needs_review','not_started','not_started','not_started','not_started','not_started','not_started']);
    return {
        id: 'app-001',
        firstName: 'Billy Bob', lastName: 'Thornton', middleName: '',
        dateOfBirth: '1980-01-16',
        ssnMasked: '452-45-****',
        email: 'atta.s@allshorestaffing.com',
        phone: '(436) 788-3223', cellPhone: '(436) 788-3223',
        streetAddress: 'QA', city: 'QA', state: 'Alabama', postalCode: '35006', country: 'USA',
        licenseType: 'CDL', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL',
        appliedDate: '2026-05-10', daysInPipeline: 5,
        stage: 'applications_received', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        bestTimeToContact: 'Any',
        steps, activeStepId: findActive(steps),
        companyQuestions: {
            legallyEligibleUS: false,
            currentlyEmployed: true,
            speaksEnglish: false,
            workedHereBefore: false,
            twicCard: false,
            referralSource: 'Word of Mouth',
        },
        drivingExperience: [
            { id: 'de-1', equipmentClass: 'Straight Truck',          equipmentType: 'QA', verified: false },
            { id: 'de-2', equipmentClass: 'Tractor & Semi-Trailer',  equipmentType: 'QA', verified: false },
            { id: 'de-3', equipmentClass: 'Tractor - Two Trailers',  equipmentType: 'QA', verified: false },
            { id: 'de-4', equipmentClass: 'Other',                   equipmentType: 'QA', verified: false },
        ],
        substanceTest: { donorName: 'Billy Bob Thornton', employer: 'Craig Safety Technologies - North Kansas City', orderStatus: 'draft' },
        screeningOrders: [],
        documents: [
            { id: 'doc-1', label: 'Driver Application.pdf', category: 'Application', uploadedAt: '2026-05-10', uploadedBy: 'Self-service', sizeKb: 412 },
        ],
        notes: [],
        alerts: [
            { id: 'al-1', severity: 'critical', category: 'Compliance',  title: 'Not legally eligible for US employment', detail: 'Applicant answered "No" on legal-eligibility company question. Final hiring decision blocked.', createdAt: '2026-05-10', linkedStepId: 'application_review' },
            { id: 'al-2', severity: 'warning',  category: 'Missing data', title: 'Placeholder data on address fields',     detail: 'Street, City, and several driving-experience fields contain "QA" placeholders. Update before approval.', createdAt: '2026-05-10', linkedStepId: 'application_review' },
        ],
        eventLog: [
            baseEvent('ev-1', 'created',       'Application created',         5, 'Self-service'),
            baseEvent('ev-2', 'alert_created', 'Critical alert: Not legally eligible', 5, 'Compliance Monitor', undefined, 'application_review'),
            baseEvent('ev-3', 'alert_created', 'Warning: Placeholder data',   5, 'Compliance Monitor', undefined, 'application_review'),
        ],
    };
})();

const _Tiger: Applicant = (() => {
    const steps = buildSteps(['needs_review','not_started','not_started','not_started','not_started','not_started','not_started']);
    return {
        id: 'app-002',
        firstName: 'Tiger', lastName: 'Woods',
        dateOfBirth: '1975-12-30', ssnMasked: '231-87-****',
        email: 'tiger@example.com', phone: '(512) 555-1212', cellPhone: '(512) 555-1212',
        streetAddress: '801 Magnolia Lane', city: 'Austin', state: 'Texas', postalCode: '78701', country: 'USA',
        licenseType: 'CDL', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL',
        appliedDate: '2026-05-09', daysInPipeline: 6,
        stage: 'applications_received', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: false, lastEmploymentEnd: '2026-03-12', speaksEnglish: true, workedHereBefore: false, twicCard: false, referralSource: 'Indeed' },
        drivingExperience: [], substanceTest: { donorName: 'Tiger Woods', employer: 'Craig Safety Technologies', orderStatus: 'draft' },
        screeningOrders: [], documents: [], notes: [], alerts: [],
        eventLog: [baseEvent('e2-1', 'created', 'Application created', 6, 'Self-service')],
    };
})();

const _Dale: Applicant = (() => {
    const steps = buildSteps(['needs_review','not_started','not_started','not_started','not_started','not_started','not_started']);
    return {
        id: 'app-003',
        firstName: 'Dale', lastName: 'Earnhardt',
        dateOfBirth: '1972-04-29', ssnMasked: '199-22-****',
        email: 'dale@example.com', phone: '(704) 555-9988', cellPhone: '(704) 555-9988',
        streetAddress: '300 Mooresville Rd', city: 'Mooresville', state: 'North Carolina', postalCode: '28115', country: 'USA',
        licenseType: 'CDL', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL',
        appliedDate: '2026-05-08', daysInPipeline: 7,
        stage: 'applications_received', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: true, speaksEnglish: true, workedHereBefore: false, twicCard: true, referralSource: 'Word of Mouth' },
        drivingExperience: [], substanceTest: { donorName: 'Dale Earnhardt', employer: 'Craig Safety Technologies', orderStatus: 'draft' },
        screeningOrders: [], documents: [], notes: [], alerts: [],
        eventLog: [baseEvent('e3-1', 'created', 'Application created', 7, 'Self-service')],
    };
})();

const _Patrick: Applicant = (() => {
    const steps = buildSteps(['needs_review','not_started','not_started','not_started','not_started','not_started','not_started']);
    return {
        id: 'app-004',
        firstName: 'Patrick', lastName: 'Mahomes',
        dateOfBirth: '1995-09-17', ssnMasked: '500-99-****',
        email: 'pat15@example.com', phone: '(816) 555-1500', cellPhone: '(816) 555-1500',
        streetAddress: '1 Arrowhead Dr', city: 'Kansas City', state: 'Missouri', postalCode: '64129', country: 'USA',
        licenseType: 'CDL-A', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL-A',
        appliedDate: '2026-05-07', daysInPipeline: 8,
        stage: 'applications_received', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: true, speaksEnglish: true, workedHereBefore: false, twicCard: false, referralSource: 'LinkedIn' },
        drivingExperience: [], substanceTest: { donorName: 'Patrick Mahomes', employer: 'Craig Safety Technologies', orderStatus: 'draft' },
        screeningOrders: [], documents: [], notes: [], alerts: [],
        eventLog: [baseEvent('e4-1', 'created', 'Application created', 8, 'Self-service')],
    };
})();

const _Clint: Applicant = (() => {
    const steps = buildSteps(['completed','in_progress','not_started','not_started','not_started','not_started','not_started']);
    return {
        id: 'app-005',
        firstName: 'Clint', lastName: 'Eastwood',
        dateOfBirth: '1965-05-31', ssnMasked: '432-11-****',
        email: 'clint@example.com', phone: '(415) 555-2255', cellPhone: '(415) 555-2255',
        streetAddress: '15 Sea Cliff', city: 'San Francisco', state: 'California', postalCode: '94121', country: 'USA',
        licenseType: 'CDL', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL',
        appliedDate: '2026-05-02', daysInPipeline: 13,
        stage: 'in_progress', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: true, speaksEnglish: true, workedHereBefore: false, twicCard: false, referralSource: 'Career Fair' },
        drivingExperience: [
            { id: 'de-c1', equipmentClass: 'Tractor & Semi-Trailer', equipmentType: 'Reefer', startDate: '2020-01-01', endDate: '2026-05-02', totalMiles: 540000, verified: true },
        ],
        substanceTest: { donorName: 'Clint Eastwood', employer: 'Craig Safety Technologies', orderStatus: 'draft' },
        screeningOrders: [
            { id: 'or-c1', type: 'psp', vendor: 'HireRight PSP', status: 'ordered', orderedAt: '2026-05-04' },
        ],
        documents: [
            { id: 'd-c1', label: 'Driver Application.pdf', category: 'Application', uploadedAt: '2026-05-02', uploadedBy: 'Self-service', sizeKb: 421 },
            { id: 'd-c2', label: 'Background Disclosure.pdf', category: 'Background', uploadedAt: '2026-05-04', uploadedBy: 'Sarah Chen',  sizeKb: 92 },
        ],
        notes: [],
        alerts: [],
        eventLog: [
            baseEvent('ev-c1', 'created',         'Application created',          13, 'Self-service'),
            baseEvent('ev-c2', 'step_completed',  'Application Review completed',  9, 'Sarah Chen', 'All required fields validated.', 'application_review'),
            baseEvent('ev-c3', 'step_ordered',    'PSP ordered',                   9, 'Sarah Chen', 'Vendor: HireRight PSP', 'psp'),
        ],
    };
})();

const _Maria: Applicant = (() => {
    const steps = buildSteps(['completed','completed','in_progress','not_started','not_started','not_started','not_started']);
    return {
        id: 'app-006',
        firstName: 'Maria', lastName: 'Sharapova',
        dateOfBirth: '1987-04-19', ssnMasked: '309-15-****',
        email: 'msharapova@example.com', phone: '(305) 555-4747', cellPhone: '(305) 555-4747',
        streetAddress: '2400 Collins Ave', city: 'Miami Beach', state: 'Florida', postalCode: '33140', country: 'USA',
        licenseType: 'CDL-A', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL-A',
        appliedDate: '2026-04-30', daysInPipeline: 15,
        stage: 'in_progress', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: false, lastEmploymentEnd: '2026-02-01', speaksEnglish: true, workedHereBefore: false, twicCard: true, referralSource: 'Driver Recruiting Agency' },
        drivingExperience: [
            { id: 'd-m1', equipmentClass: 'Tractor & Semi-Trailer', equipmentType: 'Dry Van', startDate: '2018-04-01', endDate: '2026-02-01', totalMiles: 680000, verified: true },
        ],
        substanceTest: { donorName: 'Maria Sharapova', employer: 'Craig Safety Technologies', orderStatus: 'draft' },
        screeningOrders: [
            { id: 'or-m1', type: 'psp', vendor: 'HireRight PSP', status: 'complete',  orderedAt: '2026-05-02', completedAt: '2026-05-05', resultSummary: 'No PSP violations on record.' },
            { id: 'or-m2', type: 'mvr', vendor: 'Samba MVR',     status: 'ordered',   orderedAt: '2026-05-10' },
        ],
        documents: [], notes: [],
        alerts: [],
        eventLog: [
            baseEvent('ev-m1', 'created',        'Application created', 15, 'Self-service'),
            baseEvent('ev-m2', 'step_completed', 'Application Review completed', 13, 'Sarah Chen', undefined, 'application_review'),
            baseEvent('ev-m3', 'step_completed', 'PSP completed', 10, 'Compliance Monitor', 'No violations', 'psp'),
            baseEvent('ev-m4', 'step_ordered',   'MVR ordered', 5, 'Sarah Chen', 'Vendor: Samba MVR', 'mvr'),
        ],
    };
})();

const _LeBron: Applicant = (() => {
    const steps = buildSteps(['completed','skipped','completed','completed','in_progress','not_started','not_started']);
    steps[1].skippedReason = 'PSP not required for intrastate-only positions per company policy.';
    return {
        id: 'app-007',
        firstName: 'LeBron', lastName: 'James',
        dateOfBirth: '1984-12-30', ssnMasked: '617-44-****',
        email: 'lj23@example.com', phone: '(216) 555-2323', cellPhone: '(216) 555-2323',
        streetAddress: '1 Center Court', city: 'Cleveland', state: 'Ohio', postalCode: '44115', country: 'USA',
        licenseType: 'CDL-A', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL-A',
        appliedDate: '2026-04-15', daysInPipeline: 30,
        stage: 'in_progress', decisionStatus: 'pending', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: true, speaksEnglish: true, workedHereBefore: true, twicCard: true, referralSource: 'Word of Mouth' },
        drivingExperience: [
            { id: 'd-l1', equipmentClass: 'Tractor & Semi-Trailer', equipmentType: 'Flatbed', startDate: '2015-06-01', endDate: '2026-04-15', totalMiles: 1_120_000, verified: true },
        ],
        substanceTest: { donorName: 'LeBron James', licenseNumber: '987776543', phone: '(216) 555-2323', employer: 'Craig Safety Technologies - North Kansas City', orderStatus: 'scheduled', testType: 'DOT', clinicName: 'Concentra · Cleveland Downtown' },
        screeningOrders: [
            { id: 'or-l1', type: 'mvr', vendor: 'Samba MVR', status: 'complete', orderedAt: '2026-04-22', completedAt: '2026-04-24', resultSummary: 'Clean — no violations in 3 years.' },
            { id: 'or-l2', type: 'criminal_background', vendor: 'Checkr', status: 'complete', orderedAt: '2026-04-26', completedAt: '2026-04-30', resultSummary: 'No reportable records.' },
        ],
        documents: [
            { id: 'd-l1', label: 'Driver Application.pdf', category: 'Application', uploadedAt: '2026-04-15', uploadedBy: 'Self-service', sizeKb: 458, linkedStepId: 'application_review' },
            { id: 'd-l2', label: 'MVR Report.pdf', category: 'MVR', uploadedAt: '2026-04-24', uploadedBy: 'Samba MVR', sizeKb: 132, linkedStepId: 'mvr' },
            { id: 'd-l3', label: 'Background Check Report.pdf', category: 'Background', uploadedAt: '2026-04-30', uploadedBy: 'Checkr', sizeKb: 219, linkedStepId: 'criminal_background' },
        ],
        notes: [
            { id: 'n-l1', body: 'Driver has 11 years of clean accident-free experience — strong candidate.', author: 'Sarah Chen', createdAt: '2026-04-25', visibility: 'internal' },
        ],
        alerts: [
            { id: 'al-l1', severity: 'info', category: 'Screening', title: 'Substance test scheduled', detail: 'Concentra · Cleveland Downtown · 2026-05-16', createdAt: '2026-05-12', linkedStepId: 'substance_testing' },
        ],
        eventLog: [
            baseEvent('ev-l1', 'created',          'Application created', 30, 'Self-service'),
            baseEvent('ev-l2', 'step_completed',   'Application Review completed', 28, 'Sarah Chen', undefined, 'application_review'),
            baseEvent('ev-l3', 'step_skipped',     'PSP skipped',                  28, 'Sarah Chen', 'Intrastate-only position', 'psp'),
            baseEvent('ev-l4', 'step_completed',   'MVR completed',                21, 'Compliance Monitor', undefined, 'mvr'),
            baseEvent('ev-l5', 'step_completed',   'Criminal Background completed',15, 'Compliance Monitor', undefined, 'criminal_background'),
            baseEvent('ev-l6', 'substance_scheduled', 'Substance test scheduled',  3,  'Sarah Chen', 'Concentra · Cleveland Downtown · 2026-05-16', 'substance_testing'),
        ],
    };
})();

const _Serena: Applicant = (() => {
    const steps = buildSteps(['completed','completed','completed','completed','completed','completed','completed']);
    return {
        id: 'app-008',
        firstName: 'Serena', lastName: 'Williams',
        dateOfBirth: '1981-09-26', ssnMasked: '728-55-****',
        email: 'swilliams@example.com', phone: '(305) 555-8181', cellPhone: '(305) 555-8181',
        streetAddress: '120 Palmetto Dr', city: 'Palm Beach Gardens', state: 'Florida', postalCode: '33418', country: 'USA',
        licenseType: 'CDL', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL',
        appliedDate: '2026-04-04', daysInPipeline: 41,
        stage: 'hired', decisionStatus: 'hired', assignedTemplateId: 'tpl-default-cdl',
        steps, activeStepId: 'decision',
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: false, speaksEnglish: true, workedHereBefore: false, twicCard: true, referralSource: 'Indeed' },
        drivingExperience: [
            { id: 'd-s1', equipmentClass: 'Tractor & Semi-Trailer', equipmentType: 'Dry Van', startDate: '2017-04-01', endDate: '2026-04-04', totalMiles: 720_000, verified: true },
        ],
        substanceTest: { donorName: 'Serena Williams', licenseNumber: '447128920', phone: '(305) 555-8181', employer: 'Craig Safety Technologies', orderStatus: 'completed', testType: 'DOT', clinicName: 'Concentra · West Palm Beach' },
        screeningOrders: [
            { id: 'or-s1', type: 'psp', vendor: 'HireRight PSP', status: 'complete', orderedAt: '2026-04-08', completedAt: '2026-04-10', resultSummary: 'No PSP violations.' },
            { id: 'or-s2', type: 'mvr', vendor: 'Samba MVR',     status: 'complete', orderedAt: '2026-04-10', completedAt: '2026-04-12', resultSummary: 'Clean.' },
            { id: 'or-s3', type: 'criminal_background', vendor: 'Checkr', status: 'complete', orderedAt: '2026-04-12', completedAt: '2026-04-18', resultSummary: 'No reportable records.' },
            { id: 'or-s4', type: 'dot_employment_verification', vendor: 'EmployerOne', status: 'complete', orderedAt: '2026-04-20', completedAt: '2026-04-30', resultSummary: 'All prior employers verified.' },
        ],
        documents: [],
        notes: [],
        alerts: [],
        eventLog: [
            baseEvent('ev-s1', 'created',              'Application created', 41, 'Self-service'),
            baseEvent('ev-s2', 'decision_saved',       'Decision: Hired',      1, 'Sarah Chen', undefined, 'decision'),
            baseEvent('ev-s3', 'converted_to_employee','Converted to employee profile', 1, 'Sarah Chen'),
        ],
    };
})();

const _Tom: Applicant = (() => {
    const steps = buildSteps(['completed','completed','completed','failed','not_started','not_started','not_started']);
    return {
        id: 'app-010',
        firstName: 'Tom', lastName: 'Brady',
        dateOfBirth: '1977-08-03', ssnMasked: '301-77-****',
        email: 'tbrady@example.com', phone: '(508) 555-1212', cellPhone: '(508) 555-1212',
        streetAddress: '1 Patriot Pl', city: 'Foxborough', state: 'Massachusetts', postalCode: '02035', country: 'USA',
        licenseType: 'CDL-B', applicantType: 'Driver',
        positionApplied: 'e-DOT Driver Application - CDL-B',
        appliedDate: '2026-04-02', daysInPipeline: 43,
        stage: 'not_hired', decisionStatus: 'not_hired', assignedTemplateId: 'tpl-default-cdl',
        decisionReason: 'Failed criminal background check.',
        steps, activeStepId: 'criminal_background',
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: true, speaksEnglish: true, workedHereBefore: false, twicCard: false, referralSource: 'Indeed' },
        drivingExperience: [],
        substanceTest: { donorName: 'Tom Brady', employer: 'Craig Safety Technologies', orderStatus: 'cancelled' },
        screeningOrders: [
            { id: 'or-t1', type: 'criminal_background', vendor: 'Checkr', status: 'complete', orderedAt: '2026-04-10', completedAt: '2026-04-20', resultSummary: 'Reportable felony record within DOT exclusion window.' },
        ],
        documents: [], notes: [],
        alerts: [
            { id: 'al-t1', severity: 'critical', category: 'Compliance', title: 'Failed criminal background check', detail: 'Reportable record within DOT exclusion window.', createdAt: '2026-04-20', resolvedAt: '2026-04-21', linkedStepId: 'criminal_background' },
        ],
        eventLog: [
            baseEvent('ev-t1', 'created',         'Application created', 43, 'Self-service'),
            baseEvent('ev-t2', 'decision_saved',  'Decision: Not Hired',  24, 'Sarah Chen', 'Failed background check', 'decision'),
        ],
    };
})();

// ── Generated applicants — fills out every carrier / stage / template so the
//    Assignments list, carrier filter, and detail tabs have rich test data. ──
const GEN_TEMPLATE_IDS = [
    'tpl-complete-hiring', 'tpl-all-forms', 'tpl-quick-hire', 'tpl-cdl-a-otr', 'tpl-cross-border',
    'tpl-owner-operator', 'tpl-local-regional', 'tpl-hazmat-tanker', 'tpl-non-cdl', 'tpl-rehire', 'tpl-seasonal',
];
const GEN_FIRST = ['Aaron', 'Blake', 'Cody', 'Derek', 'Evan', 'Felix', 'Grant', 'Hank', 'Ivan', 'Jamal', 'Kyle', 'Liam', 'Mason', 'Nate', 'Owen', 'Pete'];
const GEN_LAST = ['Carter', 'Diaz', 'Ellis', 'Foster', 'Greer', 'Hayes', 'Irwin', 'Jensen', 'Knox', 'Lowe', 'Mills', 'Nash', 'Owens', 'Park', 'Reyes', 'Stone'];
const GEN_LICENSE: LicenseType[] = ['CDL-A', 'CDL-B', 'CDL', 'Non-CDL'];
const GEN_STAGE: Stage[] = ['applications_received', 'in_progress', 'in_progress', 'hired', 'not_hired'];

function genApplicant(i: number): Applicant {
    const stage = GEN_STAGE[i % GEN_STAGE.length];
    const stepStates = (
        stage === 'hired' ? Array(7).fill('completed')
            : stage === 'applications_received' ? Array(7).fill('not_started')
                : stage === 'not_hired' ? ['completed', 'completed', 'failed', 'not_started', 'not_started', 'not_started', 'not_started']
                    : ['completed', 'completed', 'in_progress', 'not_started', 'not_started', 'not_started', 'not_started']
    ) as StepStatus[];
    const steps = buildSteps(stepStates);
    const fn = GEN_FIRST[i % GEN_FIRST.length];
    const ln = GEN_LAST[(i + 3) % GEN_LAST.length];
    const day = 1 + (i % 27);
    return {
        id: `app-g${String(i + 1).padStart(2, '0')}`,
        firstName: fn, lastName: ln,
        dateOfBirth: '1986-07-12', ssnMasked: '•••-••-••••',
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        phone: `(555) 02${String(10 + i).slice(-2)}-${String(1000 + i).slice(-4)}`,
        streetAddress: `${120 + i} Maple Ave`, city: 'Springfield', state: 'Illinois', postalCode: `627${String(10 + i).slice(-2)}`, country: 'USA',
        licenseType: GEN_LICENSE[i % GEN_LICENSE.length], applicantType: 'Driver',
        positionApplied: 'Company Driver',
        appliedDate: `2026-04-${String(day).padStart(2, '0')}`,
        daysInPipeline: 30 - (i % 27),
        stage,
        decisionStatus: stage === 'hired' ? 'hired' : stage === 'not_hired' ? 'not_hired' : 'pending',
        assignedTemplateId: GEN_TEMPLATE_IDS[i % GEN_TEMPLATE_IDS.length],
        steps, activeStepId: findActive(steps),
        companyQuestions: { legallyEligibleUS: true, currentlyEmployed: false, speaksEnglish: true, workedHereBefore: false, twicCard: false },
        drivingExperience: [],
        substanceTest: { donorName: `${fn} ${ln}`, employer: '', orderStatus: 'draft' },
        screeningOrders: [], documents: [], notes: [], alerts: [],
        eventLog: [baseEvent(`ev-g${i}`, 'created', 'Application created', 30 - (i % 27), 'Self-service')],
    };
}

export const MOCK_APPLICANTS: Applicant[] = [
    _Robert, _Tiger, _Dale, _Patrick, _Clint, _Maria, _LeBron, _Serena, _Tom,
    ...Array.from({ length: 28 }, (_, i) => genApplicant(i)),
];

// ── Display metadata for stages / step statuses ──────────────────────────

export const STAGE_META: Record<Stage, { label: string; tone: 'blue' | 'amber' | 'emerald' | 'rose'; description: string }> = {
    applications_received: { label: 'Applications Received', tone: 'blue',    description: 'New applications awaiting review' },
    in_progress:           { label: 'In Progress',           tone: 'amber',   description: 'Currently moving through DOT screening' },
    hired:                 { label: 'Hired',                 tone: 'emerald', description: 'Offer accepted · onboarding triggered' },
    not_hired:             { label: 'Not Hired',             tone: 'rose',    description: 'Rejected, withdrew, or failed screening' },
};

export const STEP_STATUS_META: Record<StepStatus, { label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' | 'blue' }> = {
    not_started:  { label: 'Not started',  tone: 'slate' },
    ordered:      { label: 'Ordered',      tone: 'amber' },
    in_progress:  { label: 'In progress',  tone: 'blue' },
    completed:    { label: 'Completed',    tone: 'emerald' },
    skipped:      { label: 'Skipped',      tone: 'emerald' },
    failed:       { label: 'Failed',       tone: 'rose' },
    needs_review: { label: 'Needs review', tone: 'amber' },
};

export const TONE_CLS = {
    blue:    { ring: 'border-l-blue-500',    chip: 'bg-blue-50 text-blue-700',       text: 'text-blue-700',    dot: 'bg-blue-500',    border: 'border-blue-300' },
    amber:   { ring: 'border-l-amber-500',   chip: 'bg-amber-50 text-amber-700',     text: 'text-amber-700',   dot: 'bg-amber-500',   border: 'border-amber-300' },
    emerald: { ring: 'border-l-emerald-500', chip: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', dot: 'bg-emerald-500', border: 'border-emerald-300' },
    rose:    { ring: 'border-l-rose-500',    chip: 'bg-rose-50 text-rose-700',       text: 'text-rose-700',    dot: 'bg-rose-500',    border: 'border-rose-300' },
    slate:   { ring: 'border-l-slate-400',   chip: 'bg-slate-100 text-slate-600',    text: 'text-slate-600',   dot: 'bg-slate-400',   border: 'border-slate-300' },
} as const;
