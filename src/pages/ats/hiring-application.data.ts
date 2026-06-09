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
import { getApplicationForm, type FormDocumentUploadValue } from './application-forms.data';
import { collectCanonical } from './form-data-keys';
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
    /** The attached signature has been verified by the hiring manager. */
    signatureVerified?: boolean;
    returnNote?: string;
    /** Admin marked this step optional/removed for THIS driver — excluded from progress. */
    skipped?: boolean;
    skippedReason?: string;
}

/** Who an Ask/Order request is directed to. */
export type RequestRecipient = 'driver' | 'hiring_manager' | 'employer';

export interface ApplicationRequest {
    id: string;
    kind: 'document' | 'detail';
    targetStepId?: string;
    /** The specific thing being requested — a step/form, key number, document, or e-signature. */
    itemKind?: 'keynumber' | 'document' | 'step' | 'signature';
    itemId?: string;
    itemName?: string;
    /** Who the request goes to (defaults to the driver). */
    recipient?: RequestRecipient;
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
    type: 'created' | 'invited' | 'step_submitted' | 'step_approved' | 'step_returned' | 'requested' | 'added_as_driver' | 'cancelled' | 'reminder_sent' | 'step_skipped' | 'step_restored';
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
    /** Unified document + compliance fulfilment state, keyed by requirement id. */
    requirements_v2?: Record<string, {
        status?: 'missing' | 'uploaded' | 'verified' | 'ordered';
        files?: { name: string; uploadedAt: string }[];
        meta?: { number?: string; issue?: string; expiry?: string; state?: string; country?: string };
    }>;
    /** The driver's master e-signature on file — the hiring manager attaches this to forms. */
    signatureOnFile?: string;
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
        if (Array.isArray(parsed) && parsed.length > 0) {
            const stored = parsed as Applicant[];
            // Append any built-in seed applicants the user doesn't have yet (new test
            // data) without wiping invited/created applicants.
            const have = new Set(stored.map(a => a.id));
            const missing = MOCK_APPLICANTS.filter(a => !have.has(a.id));
            return [...stored, ...missing];
        }
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
export type IssueDriverType = 'local' | 'us' | 'canada' | 'cross_border';

export interface IssueHiringInput {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    licenseType?: LicenseType;
    applicantType?: ApplicantType;
    positionApplied?: string;
    templateId: string;
    carrierId?: string;
    /** Geographic driver type — captured at invite, stored on the applicant, and
     *  reflected in the Hiring ATS / DQ Files. Also seeds the country. */
    driverType?: IssueDriverType;
    /** Drives the DQ driver-type auto-detection (e.g. 'United States' → US Driver). */
    country?: string;
}

const DRIVER_TYPE_COUNTRY: Record<IssueDriverType, string> = {
    local: 'United States', us: 'United States', canada: 'Canada', cross_border: 'United States',
};

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
        streetAddress: '', city: '', state: '', postalCode: '',
        country: input.country || (input.driverType ? DRIVER_TYPE_COUNTRY[input.driverType] : 'United States'),
        licenseType: input.licenseType ?? 'CDL-A',
        applicantType: input.applicantType ?? 'Driver',
        dqDriverType: input.driverType,
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
    // Skipped steps don't block completion or count as "started".
    const live = stepIds.filter(id => !app.steps[id]?.skipped);
    const states = live.map(id => app.steps[id]?.status ?? 'not_started');
    const allDone = states.length === 0 || states.every(s => s === 'submitted' || s === 'approved');
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

/** Manually set the whole application's status (recruiter override — bypasses
 *  the per-step recompute). Used by the single status selector in the detail header. */
export function setApplicationStatus(applicantId: string, status: AppStatus): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.status = status;
    logEvent(app, status === 'approved' ? 'step_approved' : status === 'rejected' ? 'cancelled' : 'step_submitted',
        `Status set to ${APP_STATUS_META[status].label}`);
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
    const allIds = (tpl?.steps ?? []).map(s => s.id);
    if (!app || allIds.length === 0) return { completed: 0, total: allIds.length, pct: 0 };
    // Skipped steps are excluded from the count entirely.
    const stepIds = allIds.filter(id => !app.steps[id]?.skipped);
    const total = stepIds.length;
    const done = stepIds.filter(id => { const s = app.steps[id]?.status; return s === 'submitted' || s === 'approved'; }).length;
    const current = stepIds.find(id => { const s = app.steps[id]?.status ?? 'not_started'; return s !== 'submitted' && s !== 'approved'; });
    return { completed: done, total, pct: total ? Math.round((done / total) * 100) : 0, currentStepId: current };
}

/** Send a reminder/notification to the driver (mock) — logged on the application. */
export function sendReminder(applicantId: string, message?: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    logEvent(app, 'reminder_sent', message?.trim() || 'Reminder sent to finish the application');
    upsertApplication(app);
}

type ReqState = NonNullable<HiringApplication['requirements_v2']>[string];

/** Patch a single document/compliance requirement's fulfilment state. */
export function setRequirementState(applicantId: string, reqId: string, patch: Partial<ReqState>): void {
    const app = getApplication(applicantId);
    if (!app) return;
    const cur = app.requirements_v2 ?? {};
    cur[reqId] = { ...cur[reqId], ...patch };
    app.requirements_v2 = cur;
    upsertApplication(app);
}

/** Attach a (mock) uploaded file and mark the requirement uploaded. */
export function uploadRequirement(applicantId: string, reqId: string, label: string, fileName?: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    const cur = app.requirements_v2 ?? {};
    const existing = cur[reqId] ?? {};
    const files = [...(existing.files ?? []), { name: fileName || `${label.replace(/\s+/g, '-')}.pdf`, uploadedAt: now() }];
    cur[reqId] = { ...existing, files, status: 'uploaded' };
    app.requirements_v2 = cur;
    logEvent(app, 'requested', `Uploaded ${label}`);
    upsertApplication(app);
}

/** Set a driver's geographic driver type (and matching country) on the applicant. */
export function setApplicantDriverType(applicantId: string, driverType: IssueDriverType): void {
    const list = loadApplicants();
    let changed = false;
    const next = list.map(a => {
        if (a.id !== applicantId) return a;
        changed = true;
        return { ...a, dqDriverType: driverType, country: DRIVER_TYPE_COUNTRY[driverType] };
    });
    if (changed) saveApplicants(next);
}

/** Record a lightweight requirement action (e.g. "Sent") in the activity log. */
export function logRequirementAction(applicantId: string, label: string, action: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    logEvent(app, 'requested', `${action} — ${label}`);
    upsertApplication(app);
}

// ── E-signature setup (attach the driver's on-file signature to forms) ────────

/** Set / replace the driver's master signature on file. */
export function setSignatureOnFile(applicantId: string, signature: string | undefined): void {
    const app = getApplication(applicantId);
    if (!app) return;
    app.signatureOnFile = signature;
    logEvent(app, 'requested', signature ? 'Signature captured on file' : 'Signature removed from file');
    upsertApplication(app);
}

/** Attach the on-file signature to a specific consent/signature step. */
export function attachSignature(applicantId: string, stepId: string, label: string): void {
    const app = getApplication(applicantId);
    if (!app || !app.signatureOnFile) return;
    const cur = app.steps[stepId] ?? { status: 'not_started' as AppStepStatus };
    app.steps[stepId] = { ...cur, signature: app.signatureOnFile, signatureVerified: false, submittedAt: cur.submittedAt ?? now() };
    logEvent(app, 'requested', `Signature attached to ${label}`);
    upsertApplication(app);
}

/** Remove the attached signature from a step. */
export function detachSignature(applicantId: string, stepId: string, label: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    const cur = app.steps[stepId];
    if (!cur) return;
    app.steps[stepId] = { ...cur, signature: undefined, signatureVerified: false };
    logEvent(app, 'requested', `Signature removed from ${label}`);
    upsertApplication(app);
}

/** Mark / unmark an attached signature as verified. */
export function setSignatureVerified(applicantId: string, stepId: string, verified: boolean, label: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    const cur = app.steps[stepId];
    if (!cur) return;
    app.steps[stepId] = { ...cur, signatureVerified: verified };
    logEvent(app, 'requested', `${verified ? 'Verified' : 'Unverified'} signature on ${label}`);
    upsertApplication(app);
}

/** Mark a step optional/removed (or restore it) for THIS driver only. */
export function setStepSkipped(applicantId: string, stepId: string, skipped: boolean, reason?: string): void {
    const app = getApplication(applicantId);
    if (!app) return;
    const cur = app.steps[stepId] ?? { status: 'not_started' as AppStepStatus };
    app.steps[stepId] = { ...cur, skipped, skippedReason: skipped ? (reason?.trim() || undefined) : undefined };
    app.status = recompute(app);
    logEvent(app, skipped ? 'step_skipped' : 'step_restored', skipped ? (reason?.trim() ? `Step removed — ${reason}` : 'Step removed for this driver') : 'Step restored');
    upsertApplication(app);
}

/** Whole-number days between an ISO timestamp and now (min 0). */
export function daysSince(iso: string | undefined): number {
    if (!iso) return 0;
    const ms = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
}

/** A short "5d" / "today" elapsed label since a timestamp. */
export function elapsedLabel(iso: string | undefined): string {
    if (!iso) return '—';
    const d = daysSince(iso);
    return d === 0 ? 'today' : `${d}d`;
}

// ── Driver application snapshot (what data came from which form) ─────────────
// On hire we capture the submitted form data and keep it keyed by driver id so
// the Driver profile can show exactly which data came from which application form.

export interface DriverApplicationForm {
    stepId: string;
    formId?: string;
    name: string;
    kind: 'form' | 'consent';
    values?: Record<string, unknown>;
    docs?: Record<string, FormDocumentUploadValue>;
    signature?: string;
    submittedAt?: string;
}
export interface DriverApplicationSnapshot {
    driverId: string;
    applicantId: string;
    templateId: string;
    capturedAt: string;
    forms: DriverApplicationForm[];
    /** Canonical driver-data JSON ({ dataKey: value }) collected across all forms —
     *  the deduped, reusable shape (license number / DOB / dates captured once). */
    canonical?: Record<string, unknown>;
}

const SNAPSHOTS_KEY = 'ats:driver-application-snapshots-v1';

function loadSnapshots(): Record<string, DriverApplicationSnapshot> {
    try {
        const raw = localStorage.getItem(SNAPSHOTS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && typeof parsed === 'object') return parsed as Record<string, DriverApplicationSnapshot>;
    } catch { /* ignore */ }
    return {};
}
/** The captured application data for a hired driver (by driver id), if any. */
export function getDriverApplicationSnapshot(driverId: string | undefined | null): DriverApplicationSnapshot | undefined {
    if (!driverId) return undefined;
    return loadSnapshots()[driverId];
}

/** Build the per-form snapshot from an application's submitted steps. */
function buildSnapshot(driverId: string, app: HiringApplication): DriverApplicationSnapshot {
    const tpl = templateFor(app);
    const forms: DriverApplicationForm[] = [];
    for (const step of tpl?.steps ?? []) {
        const st = app.steps[step.id];
        if (!st) continue;
        if ((step.kind ?? 'form') === 'consent') {
            forms.push({ stepId: step.id, name: step.label || 'Consent', kind: 'consent', signature: st.signature, submittedAt: st.submittedAt });
        } else {
            const form = getApplicationForm(step.formId);
            forms.push({
                stepId: step.id, formId: form.id, kind: 'form',
                name: step.label || form.displayTitle || form.name,
                values: st.values, docs: st.docs, signature: st.signature, submittedAt: st.submittedAt,
            });
        }
    }
    // Collect the canonical { dataKey: value } JSON from every form's values.
    const canonical = collectCanonical(
        forms.filter(f => f.kind === 'form' && f.formId).map(f => ({
            fields: getApplicationForm(f.formId!).fields,
            values: (f.values ?? {}) as Record<string, unknown>,
        })),
    );
    return { driverId, applicantId: app.applicantId, templateId: app.templateId, capturedAt: now(), forms, canonical };
}

/** Convert a completed applicant into a carrier driver — carrying the submitted form data. */
export function addAsDriver(applicantId: string, carrierId: string): void {
    const applicant = getApplicant(applicantId);
    const app = getApplication(applicantId);
    if (!applicant) return;
    const driverId = `drv_${applicantId}`;
    const driver = {
        ...MOCK_DRIVER_DETAILED_TEMPLATE,
        id: driverId,
        name: `${applicant.firstName} ${applicant.lastName}`,
        status: 'Active',
    } as (typeof CARRIER_DRIVERS)[string][number];
    CARRIER_DRIVERS[carrierId] = [driver, ...(CARRIER_DRIVERS[carrierId] ?? [])];

    // Capture the submitted form data against the new driver (data ↔ form ↔ driver).
    if (app) {
        const snap = buildSnapshot(driverId, app);
        try { const all = loadSnapshots(); all[driverId] = snap; localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
    }

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
