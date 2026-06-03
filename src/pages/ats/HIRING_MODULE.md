# Driver Hiring Application — module documentation

End-to-end driver hiring: **issue a hiring → invite the driver by email → driver completes the assigned template in a portal → we review per step, request more info, and add them as a driver.**

## Flow
1. **Issue hiring** (internal) — fill the driver's initial details + pick a hiring template + send the invite. Creates an `Applicant` (`stage: applications_received`) and a `HiringApplication` (`status: invited`).
2. **Driver portal** (`/apply/<applicantId>`) — the invite link. The driver walks the assigned template's steps (forms via `CustomFormWizard`, consents with a signature, document uploads). Each step they Save persists and marks that step **submitted**.
3. **Internal review** (Application detail) — see overall status + per-step status; open a submitted step to view what was entered; **Approve** or **Return for changes**; **Request** an extra document/detail from the driver; watch the activity log.
4. **Add as driver** — once all steps are submitted/approved, convert the applicant into a carrier `Driver`.

## Status lifecycle
- **Application** (`AppStatus`): `draft → invited → in_progress → submitted → approved | rejected`. Derived from step states (`recompute`), never set blindly.
- **Step** (`AppStepStatus`): `not_started → in_progress → submitted → approved | returned`. A **returned** step re-opens for the driver in the portal.

## Data model — `hiring-application.data.ts`
- **Applicants** store `ats:applicants-v1` = `Applicant[]` (seeded from `MOCK_APPLICANTS`). `loadApplicants` / `saveApplicants` / `getApplicant` / `createApplicant(IssueHiringInput)`.
- **Applications** store `ats:hiring-applications-v1` = `Record<applicantId, HiringApplication>`:
  - `HiringApplication { applicantId, templateId, status, invite?, steps: Record<stepId, StepState>, requests: ApplicationRequest[], events: AppEvent[] }`
  - `StepState { status, submittedAt?, values?, docs?, signature?, returnNote? }`
  - `ApplicationRequest { id, kind: 'document'|'detail', targetStepId?, message, channel, sentAt, sentBy, deadline?, status }`
  - `AppEvent { id, at, by, type, detail? }` — appended on every mutation (audit trail).
- **Helpers**: `inviteDriver`, `ensureApplication`, `getApplication`/`upsertApplication`, `markStepInProgress`, `submitStep`, `setStepStatus` (approve/return), `addRequest`/`resolveRequest`, `applicationProgress`, `addAsDriver`. Display metadata: `APP_STATUS_META`, `STEP_STATUS_META`.

## Pages / routes
- `/ats/issue-hiring` → `IssueHiringPage` (create + invite).
- `/apply/:id` → `ApplicantPortalPage` (driver-facing; no auth in prototype).
- `/ats/application/:id` → `ApplicationDetailPage` (internal review).
- `AtsAssignmentsPage` reads the real application status (replaces the hashed `templateProgressFor` mock) and links rows to the detail.

## Reuse
`CustomFormWizard` (form rendering, uploads, list controls, signature), `loadApplicationForms` / `CONSENT_BY_ID` / `loadTemplates`, `Applicant` + `PIPELINE_BLUEPRINT` (`ats.data`), `FormDocumentUploadValue`, `CARRIER_DRIVERS` + `MOCK_DRIVER_DETAILED_TEMPLATE` (add-as-driver).

## Prototype limits / extension points
- **Email** is mocked (we surface the `/apply/<id>` link); wire a real mailer for invites + request notifications.
- **No auth** on the portal — the link is the token; add a signed token + expiry for production.
- **Persistence** is localStorage; swap the two stores for API DTOs.
- **add-as-driver** spreads `MOCK_DRIVER_DETAILED_TEMPLATE`; map real applicant→driver fields when the backend exists.
