// Driver Hiring Application module — persistence + lifecycle for the hiring flow.
//
// Issue hiring → invite driver (email) → driver completes the assigned hiring
// template's steps in the portal → we track per-step status, request more
// docs/details, approve/return steps, and finally add them as a driver.
//
// Prototype: localStorage-backed. Reuses Applicant / templates / forms / consents.
// See HIRING_MODULE.md for the full design.

import {
    MOCK_APPLICANTS, PIPELINE_BLUEPRINT,
    type Applicant, type LicenseType, type ApplicantType, type WorkflowStep,
} from './ats.data';
import type { FormDocumentUploadValue } from './application-forms.data';
import { loadTemplates, type DriverHiringTemplate } from '@/pages/settings/driver-hiring-templates.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { MOCK_DRIVER_DETAILED_TEMPLATE } from '@/pages/profile/carrier-profile.data';

// ── Types ─────────────────────────────────────────────────────────────────

export type AppStatus = 'draft' | 'invited' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
export type AppStepStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'returned';
export type RequestChannel = 'email' | 'in_app' | 'sms';

export interface StepState {
    status: AppStepStatus;
    submittedAt?: string;
    values?: Record<string, unknown>;
    docs?: Record<string, FormDocumentUploadValue>;
    signature?: string;
    returnNote?: string;
}

export interface ApplicationRequest {
    id: string;
    kind: 'document' | 'detail';
    targetStepId?: string;
    /** The specific thing being requested — a step/form, key number, document, or e-signature. */
    itemKind?: 'keynumber' | 'document' | 'step' | 'signature';
    itemId?: string;
    itemName?: string;
    message: string;
    channel: RequestChannel;
    sentAt: string;
    sentBy: string;
    deadline?: string;
    status: 'open' | 'resolved';
}

export interface AppEvent {
    id: string;
    at: string;
    by: string;
    type: 'created' | 'invited' | 'step_submitted' | 'step_approved' | 'step_returned' | 'requested' | 'added_as_driver' | 'cancelled';
    detail?: string;
}

export interface HiringApplication {
    applicantId: string;
    templateId: string;
    /** Carrier the driver is being hired into (Applicant has no carrierId). */
    carrierId?: string;
    status: AppStatus;
    invite?: { email: string; sentAt: string; link: string };
    /** Keyed by template step id. */
    steps: Record<string, StepState>;
    requests: ApplicationRequest[];
    events: AppEvent[];
}

// ── ids / time ──────────────────────────────────────────────────────────────

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();

// ── Applicants store (ats:applicants-v1) ─────────────────────────────────────

const APPLICANTS_KEY = 'ats:applicants-v1';

export function loadApplicants(): Applicant[] {
    try {
        const raw = localStorage.getItem(APPLICANTS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as Applicant[];
    } catch { /* fall through to seed */ }
    return MOCK_APPLICANTS;
}

export function saveApplicants(list: Applicant[]): void {
    try { localStorage.setItem(APPLICANTS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function getApplicant(id: string): Applicant | undefined {
    return loadApplicants().find(a => a.id === id);
}

/** Initial details captured on the Issue-Hiring page. */
export interface IssueHiringInput {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    licenseType: LicenseType;
    applicantType?: ApplicantType;
    positionApplied?: string;
    templateId: string;
    carrierId?: string;
}

/** Build a valid, mostly-empty Applicant from the issue-hiring details. */
export function createApplicant(input: IssueHiringInput): Applicant {
    const steps: WorkflowStep[] = PIPELINE_BLUEPRINT.map(b => ({ ...b, status: 'not_started' }));
    const applicant: Applicant = {
        id: uid('app'),
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: '',
        ssnMasked: '•••-••-••••',
        email: input.email,
        phone: input.phone,
        streetAddress: '', city: '', state: '', postalCode: '', country: 'United States',
        licenseType: input.licenseType,
        applicantType: input.applicantType ?? 'Driver',
        positionApplied: input.positionApplied || 'Driver',
        appliedDate: now().slice(0, 10),
        daysInPipeline: 0,
        stage: 'applications_received',
        decisionStatus: 'pending',
        assignedTemplateId: input.templateId,
        steps,
        activeStepId: steps[0].id,
        companyQuestions: {
            legallyEligibleUS: false, currentlyEmployed: false, speaksEnglish: true,
            workedHereBefore: false, twicCard: false,
        },
        drivingExperience: [],
        substanceTest: { donorName: `${input.firstName} ${input.lastName}`, employer: '', orderStatus: 'draft' },
        screeningOrders: [],
        documents: [], notes: [], alerts: [], eventLog: [],
    };
    const list = loadApplicants();
    saveApplicants([applicant, ...list]);
    upsertApplication({
        applicantId: applicant.id,
        templateId: input.templateId,
        carrierId: input.carrierId,
        status: 'draft',
        steps: {},
        requests: [],
        events: [{ id: uid('ev'), at: now(), by: 'You', type: 'created', detail: 'Hiring issued' }],
    });
    return applicant;
}

// ── Applications store (ats:hiring-applications-v1) ───────────────────────────

const APPLICATIONS_KEY = 'ats:hiring-applications-v1';

function loadAll(): Record<string, HiringApplication> {
    try {
        const raw = localStorage.getItem(APPLICATIONS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') return parsed as Record<string, HiringApplication>;
    } catch { /* ignore */ }
    return {};
}
function saveAll(map: Record<string, HiringApplication>): void {
    try { localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function getApplication(applicantId: string): HiringApplication | undefined {
    return loadAll()[applicantId];
}

export function upsertApplication(app: HiringApplication): void {
    const map = loadAll();
    map[app.applicantId] = app;
    saveAll(map);
}

/** Ensure an application exists for an applicant (seeded applicants have none). */
export function ensureApplication(applicantId: string, templateId: string): HiringApplication {
    const existing = getApplication(applicantId);
    if (existing) return existing;
    const app: HiringApplication = {
        applicantId, templateId, status: 'draft', steps: {}, requests: [], events: [],
    };
    upsertApplication(app);
    return app;
}

function templateFor(app: HiringApplication): DriverHiringTemplate | undefined {
    return loadTemplates().find(t => t.id === app.templateId);
}

/** Recompute the overall application status from its step states. */
function recompute(app: HiringApplication): AppStatus {
    if (app.status === 'approved' || app.status === 'rejected') return app.status;
    const tpl = templateFor(app);
    const stepIds = (tpl?.steps ?? []).map(s => s.id);
    if (stepIds.length === 0) return app.status === 'draft' ? 'draft' : app.status;
    const states = stepIds.map(id => app.steps[id]?.status ?? 'not_started');
    const allDone = states.every(s => s === 'submitted' || s === 'approved');
    if (allDone) return 'submitted';
    const anyStarted = states.some(s => s !== 'not_started');
    if (anyStarted) return 'in_progress';
    return app.invite ? 'invited' : 'draft';
}

const logEvent = (app: HiringApplication, type: AppEvent['type'], detail?: string, by = 'You') => {
    app.events = [{ id: uid('ev'), at: now(), by, type, detail }, ...app.events];
};

/** Send the application invite to the driver (mock email). */
export function inviteDriver(applicantId: string, email: string): HiringApplication {
    const app = getApplication(applicantId) ?? ensureApplication(applicantId, getApplicant(applicantId)?.assignedTemplateId ?? '');
    const tpl = templateFor(app);
    for (const s of tpl?.steps ?? []) {
        if (!app.steps[s.id]) app.steps[s.id] = { status: 'not_started' };
    }
    app.invite = { email, sentAt: now(), link: `https://apply.tracksmart.app/${applicantId}` };
    app.status = recompute(app);
    if (app.status === 'draft') app.status = 'invited';
    logEvent(app, 'invited', `Invite emailed to ${email}`);
    upsertApplication(app);
    return app;
}

/** Driver submits a step in the portal. */
export function submitStep(
    applicantId: string, stepId: string,
    payload: { values?: Record<string, unknown>; docs?: Record<string, FormDocumentUploadValue>; signature?: string },
): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.steps[stepId] = { status: 'submitted', submittedAt: now(), ...payload };
    app.status = recompute(app);
    logEvent(app, 'step_submitted', `Step submitted`, app.invite?.email ?? 'Driver');
    upsertApplication(app);
}

/** Internal user marks a step start (driver opened it). */
export function markStepInProgress(applicantId: string, stepId: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    const cur = app.steps[stepId]?.status ?? 'not_started';
    if (cur === 'not_started' || cur === 'returned') {
        app.steps[stepId] = { ...(app.steps[stepId] ?? {}), status: 'in_progress' };
        app.status = recompute(app);
        upsertApplication(app);
    }
}

/** Approve or return a submitted step (internal review). */
export function setStepStatus(applicantId: string, stepId: string, status: AppStepStatus, note?: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.steps[stepId] = { ...(app.steps[stepId] ?? { status: 'not_started' }), status, returnNote: note };
    app.status = recompute(app);
    logEvent(app, status === 'approved' ? 'step_approved' : status === 'returned' ? 'step_returned' : 'step_submitted',
        note ? `Returned: ${note}` : undefined);
    upsertApplication(app);
}

/** Ask the driver for a document or detail (mock email/in-app). */
export function addRequest(applicantId: string, req: Omit<ApplicationRequest, 'id' | 'sentAt' | 'status'>): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.requests = [{ id: uid('req'), sentAt: now(), status: 'open', ...req }, ...app.requests];
    logEvent(app, 'requested', `${req.kind === 'document' ? 'Requested document' : 'Requested detail'} via ${req.channel}`);
    upsertApplication(app);
}

export function resolveRequest(applicantId: string, requestId: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.requests = app.requests.map(r => r.id === requestId ? { ...r, status: 'resolved' } : r);
    upsertApplication(app);
}

/** Cancel an application — soft stop. Keeps the record (status → rejected). */
export function cancelApplication(applicantId: string, reason?: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.status = 'rejected';
    logEvent(app, 'cancelled', reason ? `Application cancelled — ${reason}` : 'Application cancelled');
    upsertApplication(app);
}

/** Delete an application AND its applicant — removes the candidate from the pipeline. */
export function deleteApplication(applicantId: string): void {
    const map = loadAll();
    delete map[applicantId];
    saveAll(map);
    saveApplicants(loadApplicants().filter(a => a.id !== applicantId));
}

export interface Progress { completed: number; total: number; pct: number; currentStepId?: string; }

export function applicationProgress(app: HiringApplication | undefined, tpl: DriverHiringTemplate | undefined): Progress {
    const stepIds = (tpl?.steps ?? []).map(s => s.id);
    const total = stepIds.length;
    if (!app || total === 0) return { completed: 0, total, pct: 0 };
    const done = stepIds.filter(id => { const s = app.steps[id]?.status; return s === 'submitted' || s === 'approved'; }).length;
    const current = stepIds.find(id => { const s = app.steps[id]?.status ?? 'not_started'; return s !== 'submitted' && s !== 'approved'; });
    return { completed: done, total, pct: total ? Math.round((done / total) * 100) : 0, currentStepId: current };
}

/** Convert a completed applicant into a carrier driver. */
export function addAsDriver(applicantId: string, carrierId: string): void {
    const applicant = getApplicant(applicantId);
    const app = getApplication(applicantId);
    if (!applicant) return;
    const driver = {
        ...MOCK_DRIVER_DETAILED_TEMPLATE,
        id: `drv_${applicantId}`,
        name: `${applicant.firstName} ${applicant.lastName}`,
        status: 'Active',
    } as (typeof CARRIER_DRIVERS)[string][number];
    CARRIER_DRIVERS[carrierId] = [driver, ...(CARRIER_DRIVERS[carrierId] ?? [])];
    // Mark applicant hired + application approved.
    const list = loadApplicants().map(a => a.id === applicantId
        ? { ...a, stage: 'hired' as const, decisionStatus: 'hired' as const }
        : a);
    saveApplicants(list);
    if (app) { app.status = 'approved'; logEvent(app, 'added_as_driver', `Added to ${carrierId}`); upsertApplication(app); }
}

// ── Status display metadata ───────────────────────────────────────────────

export const APP_STATUS_META: Record<AppStatus, { label: string; cls: string }> = {
    draft:       { label: 'Draft',       cls: 'bg-slate-100 text-slate-600 border-slate-200' },
    invited:     { label: 'Invited',     cls: 'bg-violet-50 text-violet-700 border-violet-200' },
    in_progress: { label: 'In progress', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    submitted:   { label: 'Submitted',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    approved:    { label: 'Approved',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected:    { label: 'Rejected',    cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const STEP_STATUS_META: Record<AppStepStatus, { label: string; cls: string }> = {
    not_started: { label: 'Not started', cls: 'bg-white text-slate-400 border-slate-300' },
    in_progress: { label: 'In progress', cls: 'bg-blue-500 text-white border-blue-500' },
    submitted:   { label: 'Submitted',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    approved:    { label: 'Approved',    cls: 'bg-emerald-500 text-white border-emerald-500' },
    returned:    { label: 'Returned',    cls: 'bg-rose-500 text-white border-rose-500' },
};
