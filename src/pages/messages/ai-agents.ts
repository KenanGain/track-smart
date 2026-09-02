// ─────────────────────────────────────────────────────────────────────────────
// AI agents — the demo "brain" behind the AI Agent chats.
//
// FRONT-END DEMO. There is no real model call. Each agent is SPECIALIZED to a
// domain (hiring, safety, hours of service, violations, DQ files, account,
// payroll). The user asks in natural language OR runs a slash command; we match
// it to an intent / command and answer with a friendly line plus a rich data
// panel or an action-result card. Two console-style helpers:
//   • `@name`  → target a contact (a driver / person) for an action
//   • `/task`  → run one of the agent's tasks (e.g. /send-application @John)
// Actions that target a contact are delivered into that contact's chat by the
// store (see askAgent in messages-store.ts).
// ─────────────────────────────────────────────────────────────────────────────

export type AiTone = 'rose' | 'amber' | 'emerald' | 'blue' | 'violet' | 'slate';

export type AgentIntent =
  | 'greeting' | 'help'
  | 'drivers' | 'documents' | 'expiring' | 'accidents' | 'tickets' | 'hiring'
  | 'onboarding' | 'safety' | 'hos' | 'violations' | 'dqfiles' | 'account' | 'paystub';

/** Intents that have a data panel (everything except greeting/help). */
export type DataIntent = Exclude<AgentIntent, 'greeting' | 'help'>;

/** A KPI tile inside a panel (label + big number, colored by tone). */
export interface AiStat { label: string; value: string; tone?: AiTone }

/** A list row inside a panel (a driver / document / accident / …). */
export interface AiRow { title: string; subtitle?: string; badge?: string; tone?: AiTone; meta?: string }

/** A deep-link button that opens the matching page in the app. */
export interface AiLink { label: string; path: string }

/** The structured data card an agent attaches to its reply. */
export interface AiPanel {
  intent: AgentIntent;        // drives the panel icon + accent color
  title: string;
  summary?: string;
  stats?: AiStat[];
  rows?: AiRow[];
  footnote?: string;
  link?: AiLink;
}

/** Icon keys mapped to lucide icons in MessagesPage. */
export type AiActionIcon =
  | 'mail' | 'send' | 'check' | 'bell' | 'upload' | 'graduation' | 'file' | 'user' | 'dollar' | 'clipboard';

/** A compact "the agent did something" result card. */
export interface AiAction {
  icon: AiActionIcon;
  tone: AiTone;
  title: string;
  detail?: string;
  status?: string;            // e.g. 'Delivered', 'Queued', 'Draft'
  openLabel?: string;         // e.g. 'Open chat with John' (filled when delivered)
  openConvId?: string;        // target conversation id (filled by the store)
}

/** A tappable "resource" widget the agent attaches to a delivered message — the
 *  recipient (a driver or another user) taps it to upload a document, open a
 *  form, sign, or view a link. Rendered as an AiResourceCard in the chat. */
export type AiResourceKind = 'upload' | 'form' | 'sign' | 'view' | 'link';
export interface AiResource {
  kind: AiResourceKind;
  title: string;              // 'Upload your Medical Certificate'
  detail?: string;            // 'Required for your DQ file · expires in 12 days'
  actionLabel: string;        // 'Upload document'
  url: string;                // 'tracksmart.app/upload/•••'
}

/** What the store should deliver into a contact's chat for an action. */
export interface AgentDeliver { toToken: string; text: string; resource?: AiResource }

export interface AgentReply {
  text: string;
  panel?: AiPanel;
  action?: AiAction;
  resource?: AiResource;      // a resource widget the agent attached (preview + delivered)
  deliver?: AgentDeliver;     // store posts `text` (+ resource) into the `toToken` contact's chat
  suggestions?: string[];     // follow-up quick prompts shown as chips
}

// ── agent slash commands ─────────────────────────────────────────────────────
export interface AgentCommand {
  id: string;                 // used as /id
  label: string;              // menu label
  hint: string;               // menu description
  icon: AiActionIcon;
  intent?: DataIntent;        // → show this panel
  action?: Omit<AiAction, 'openConvId'>; // → static result card
  needsContact?: boolean;     // requires an @contact; delivers a message
  deliver?: (firstName: string) => string; // message posted into the contact's chat
  resource?: (firstName: string) => AiResource; // resource widget attached to the delivered message
  reply?: string;             // lead-in text
}

// ── agent catalog ────────────────────────────────────────────────────────────
export interface AgentDef {
  key: string;                // 'ai-hiring'
  name: string;               // 'Hiring & Onboarding'
  role: string;               // sidebar/profile line
  domainLabel: string;        // 'the hiring pipeline'
  blurb: string;              // one-line intro
  color: string;              // avatar bg
  email: string;
  primaryIntent: Exclude<AgentIntent, 'greeting' | 'help'>;
  greeting: string;
  prompts: string[];          // starter quick prompts
  commands: AgentCommand[];
}

// ── demo data panels ─────────────────────────────────────────────────────────
const PANELS: Record<Exclude<AgentIntent, 'greeting' | 'help'>, AiPanel> = {
  drivers: {
    intent: 'drivers', title: 'Driver roster',
    summary: '24 drivers on this carrier — 21 active, 3 off-duty. 4 need attention.',
    stats: [
      { label: 'Total', value: '24', tone: 'blue' }, { label: 'Active', value: '21', tone: 'emerald' },
      { label: 'Off-duty', value: '3', tone: 'slate' }, { label: 'Flagged', value: '4', tone: 'amber' },
    ],
    rows: [
      { title: 'John Smith', subtitle: 'TRK-042 · Houston run', badge: 'Active', tone: 'emerald', meta: 'HOS 6h left' },
      { title: 'Maria Rodriguez', subtitle: 'TRK-118', badge: 'Medical expiring', tone: 'amber', meta: '12 days' },
      { title: 'Robert Chen', subtitle: 'TRK-201', badge: 'Review open', tone: 'amber', meta: 'Harsh-braking' },
      { title: 'Kevin O’Brien', subtitle: 'TRK-310', badge: 'CDL renewal', tone: 'rose', meta: '21 days' },
    ],
    footnote: '+20 more drivers', link: { label: 'Open driver roster', path: '/account/profile' },
  },
  documents: {
    intent: 'documents', title: 'Documents & compliance',
    summary: '312 documents on file — 268 valid, 31 expiring, 13 missing.',
    stats: [
      { label: 'On file', value: '312', tone: 'blue' }, { label: 'Valid', value: '268', tone: 'emerald' },
      { label: 'Expiring', value: '31', tone: 'amber' }, { label: 'Missing', value: '13', tone: 'rose' },
    ],
    rows: [
      { title: 'CDL — Maria Rodriguez', subtitle: 'Driver License', badge: 'Valid', tone: 'emerald', meta: 'exp 2027-04' },
      { title: 'Medical Certificate — Maria Rodriguez', subtitle: 'Medical', badge: 'Expiring', tone: 'amber', meta: '12 days' },
      { title: 'MVR — Robert Chen', subtitle: 'Abstracts', badge: 'Due', tone: 'amber', meta: '5 days' },
      { title: 'Drug & Alcohol Policy — John Smith', subtitle: 'Disclosures', badge: 'Missing', tone: 'rose', meta: 'not uploaded' },
    ],
    footnote: 'Across Carrier · Asset · Driver records', link: { label: 'Open Compliances & Documents', path: '/default-compliance-documents' },
  },
  expiring: {
    intent: 'expiring', title: 'Expiring documents',
    summary: '11 credentials expire in the next 30 days — 3 are due within a week.',
    stats: [
      { label: '≤ 7 days', value: '3', tone: 'rose' }, { label: '≤ 30 days', value: '11', tone: 'amber' }, { label: '≤ 90 days', value: '24', tone: 'blue' },
    ],
    rows: [
      { title: 'MVR — Robert Chen', subtitle: 'Motor Vehicle Record', badge: 'Due soon', tone: 'rose', meta: '5 days' },
      { title: 'Annual Inspection — TRL-455', subtitle: 'Asset inspection', badge: 'Due', tone: 'rose', meta: '7 days' },
      { title: 'Medical Certificate — Maria Rodriguez', subtitle: 'DOT medical', badge: 'Due', tone: 'amber', meta: '12 days' },
      { title: 'CDL — Kevin O’Brien', subtitle: 'Driver license', badge: 'Renewal', tone: 'amber', meta: '21 days' },
    ],
    footnote: 'Reminders auto-scheduled to each driver', link: { label: 'Open Compliance Monitoring', path: '/default-compliance-monitoring' },
  },
  accidents: {
    intent: 'accidents', title: 'Accidents',
    summary: '7 accidents this year — 2 open, 1 under review, 4 closed.',
    stats: [
      { label: 'This year', value: '7', tone: 'blue' }, { label: 'Open', value: '2', tone: 'rose' },
      { label: 'Under review', value: '1', tone: 'amber' }, { label: 'Closed', value: '4', tone: 'emerald' },
    ],
    rows: [
      { title: 'ACC-2026-0021', subtitle: 'Jacob Carter · Aug 20 · rear-end', badge: 'Under review', tone: 'amber', meta: 'Adjuster: Priya' },
      { title: 'ACC-2026-0019', subtitle: 'John Smith · I-40 · no-fault', badge: 'Open', tone: 'rose', meta: 'Awaiting report' },
      { title: 'ACC-2026-0018', subtitle: 'Robert Chen · lot · minor', badge: 'Closed', tone: 'emerald', meta: 'Settled' },
    ],
    footnote: '1 report waiting on a police report number', link: { label: 'Open Accidents', path: '/default-accidents' },
  },
  tickets: {
    intent: 'tickets', title: 'Tickets & citations',
    summary: '5 open tickets — 2 in review. 18 resolved this quarter.',
    stats: [
      { label: 'Open', value: '5', tone: 'rose' }, { label: 'In review', value: '2', tone: 'amber' }, { label: 'Resolved', value: '18', tone: 'emerald' },
    ],
    rows: [
      { title: 'OFF-84729', subtitle: 'Speeding · Jacob Carter', badge: 'Open', tone: 'rose', meta: '$185' },
      { title: 'OFF-84701', subtitle: 'Logbook · Kevin O’Brien', badge: 'In review', tone: 'amber', meta: 'Contesting' },
      { title: 'OFF-84688', subtitle: 'Overweight · James Sullivan', badge: 'Open', tone: 'rose', meta: '$320' },
    ],
    footnote: '2 tickets are approaching their response deadline', link: { label: 'Open Tickets', path: '/tickets' },
  },
  hiring: {
    intent: 'hiring', title: 'Hiring pipeline',
    summary: '9 applicants in progress — 2 ready to approve, 3 onboarding.',
    stats: [
      { label: 'Applicants', value: '9', tone: 'blue' }, { label: 'In progress', value: '6', tone: 'amber' },
      { label: 'Ready', value: '2', tone: 'emerald' }, { label: 'Onboarding', value: '3', tone: 'violet' },
    ],
    rows: [
      { title: 'Daniel Reed', subtitle: 'Cross-border · Application', badge: 'Step 6 / 13', tone: 'amber', meta: 'PSP pending' },
      { title: 'Sophia Nguyen', subtitle: 'US only · Reports', badge: 'Step 9 / 13', tone: 'amber', meta: 'MVR ordered' },
      { title: 'Marcus Hall', subtitle: 'Canada · Road test', badge: 'Ready', tone: 'emerald', meta: 'Awaiting approval' },
    ],
    footnote: '2 applicants are ready for your final approval', link: { label: 'Open Hiring', path: '/hiring-process/hiring' },
  },
  onboarding: {
    intent: 'onboarding', title: 'Onboarding',
    summary: '3 drivers onboarding — Ava Thompson is 2 of 4 steps done.',
    stats: [
      { label: 'Onboarding', value: '3', tone: 'violet' }, { label: 'Forms done', value: '2', tone: 'emerald' },
      { label: 'Training', value: '1', tone: 'amber' }, { label: 'Complete', value: '1', tone: 'blue' },
    ],
    rows: [
      { title: 'Ava Thompson', subtitle: 'Forms & contract', badge: '2 / 4 steps', tone: 'amber', meta: 'Contract pending' },
      { title: 'Liam Carter', subtitle: 'Training', badge: '3 / 4 steps', tone: 'amber', meta: 'Quiz left' },
      { title: 'Noah West', subtitle: 'Company forms', badge: '1 / 4 steps', tone: 'rose', meta: 'Just started' },
    ],
    footnote: 'Approved drivers move here automatically', link: { label: 'Open Onboarding', path: '/hiring-process/onboarding' },
  },
  safety: {
    intent: 'safety', title: 'Safety events',
    summary: '6 events this week — 2 high severity need coaching.',
    stats: [
      { label: 'This week', value: '6', tone: 'blue' }, { label: 'High', value: '2', tone: 'rose' },
      { label: 'Medium', value: '3', tone: 'amber' }, { label: 'Coached', value: '4', tone: 'emerald' },
    ],
    rows: [
      { title: 'Harsh braking', subtitle: 'John Smith · TRK-042', badge: 'High', tone: 'rose', meta: 'I-40' },
      { title: 'Harsh braking', subtitle: 'Robert Chen · TRK-201', badge: 'High', tone: 'rose', meta: 'Coaching due' },
      { title: 'Speeding', subtitle: 'James Sullivan · TRK-455', badge: 'Medium', tone: 'amber', meta: '9 mph over' },
    ],
    footnote: '2 events awaiting coaching disposition', link: { label: 'Open Safety Events', path: '/safety-events' },
  },
  hos: {
    intent: 'hos', title: 'Hours of Service',
    summary: '2 drivers within 1 hour of their 14-hour limit; 1 in violation.',
    stats: [
      { label: 'On duty', value: '12', tone: 'blue' }, { label: 'Near limit', value: '2', tone: 'amber' },
      { label: 'Violation', value: '1', tone: 'rose' }, { label: 'Resting', value: '5', tone: 'emerald' },
    ],
    rows: [
      { title: 'John Smith', subtitle: 'TRK-042', badge: 'OK', tone: 'emerald', meta: '6h 10m left' },
      { title: 'Robert Chen', subtitle: 'TRK-201', badge: 'Near limit', tone: 'amber', meta: '0h 55m left' },
      { title: 'Kevin O’Brien', subtitle: 'TRK-310', badge: 'Break due', tone: 'rose', meta: '30-min break' },
    ],
    footnote: '1 driver needs a 30-minute break now', link: { label: 'Open Hours of Service', path: '/hours-of-service' },
  },
  violations: {
    intent: 'violations', title: 'Violations',
    summary: '4 open violations — 1 roadside inspection this week.',
    stats: [
      { label: 'Open', value: '4', tone: 'rose' }, { label: 'Roadside', value: '1', tone: 'amber' },
      { label: 'DataQ', value: '1', tone: 'blue' }, { label: 'Resolved', value: '12', tone: 'emerald' },
    ],
    rows: [
      { title: 'Logbook form & manner', subtitle: 'Kevin O’Brien', badge: 'Open', tone: 'rose', meta: '2 pts' },
      { title: 'Brake out of adjustment', subtitle: 'TRL-455', badge: 'Roadside', tone: 'amber', meta: 'OOS' },
      { title: 'Speeding 12 mph over', subtitle: 'Jacob Carter', badge: 'Open', tone: 'rose', meta: '4 pts' },
    ],
    footnote: '1 violation eligible for a DataQ challenge', link: { label: 'Open Violations', path: '/violations' },
  },
  dqfiles: {
    intent: 'dqfiles', title: 'DQ files',
    summary: '24 DQ files — 19 complete, 5 have gaps, 7 have expiring items.',
    stats: [
      { label: 'Files', value: '24', tone: 'blue' }, { label: 'Complete', value: '19', tone: 'emerald' },
      { label: 'Gaps', value: '5', tone: 'amber' }, { label: 'Expiring', value: '7', tone: 'rose' },
    ],
    rows: [
      { title: 'Maria Rodriguez', subtitle: 'Cross-border DQ', badge: '96%', tone: 'amber', meta: 'Medical expiring' },
      { title: 'John Smith', subtitle: 'US DQ', badge: '92%', tone: 'amber', meta: 'Drug policy missing' },
      { title: 'Kevin O’Brien', subtitle: 'US DQ', badge: '88%', tone: 'rose', meta: 'CDL renewal' },
      { title: 'Robert Chen', subtitle: 'Cross-border DQ', badge: '100%', tone: 'emerald', meta: 'Complete' },
    ],
    footnote: '5 files need a document to be complete', link: { label: 'Open DQ Files', path: '/dq-files' },
  },
  account: {
    intent: 'account', title: 'Account overview',
    summary: 'Acme Logistics — 24 drivers, 30 assets, 91% compliant.',
    stats: [
      { label: 'Drivers', value: '24', tone: 'blue' }, { label: 'Assets', value: '30', tone: 'violet' },
      { label: 'Compliance', value: '91%', tone: 'emerald' }, { label: 'Alerts', value: '6', tone: 'amber' },
    ],
    rows: [
      { title: 'Active drivers', subtitle: 'On the road today', badge: '21', tone: 'emerald' },
      { title: 'Tractors', subtitle: 'Power units', badge: '18', tone: 'blue' },
      { title: 'Trailers', subtitle: 'Assets', badge: '12', tone: 'blue' },
      { title: 'Open alerts', subtitle: 'Across compliance & safety', badge: '6', tone: 'amber' },
    ],
    footnote: 'US DOT 1234567 · MC-987654', link: { label: 'Open Carrier Profile', path: '/account/profile' },
  },
  paystub: {
    intent: 'paystub', title: 'Payroll',
    summary: 'Last run Aug 25 — 24 drivers paid, $148,320 total. 2 pending.',
    stats: [
      { label: 'Paid', value: '24', tone: 'emerald' }, { label: 'Total', value: '$148k', tone: 'blue' },
      { label: 'Avg', value: '$6.2k', tone: 'violet' }, { label: 'Pending', value: '2', tone: 'amber' },
    ],
    rows: [
      { title: 'John Smith', subtitle: 'Aug 18 – Aug 24', badge: 'Paid', tone: 'emerald', meta: '$6,480' },
      { title: 'Maria Rodriguez', subtitle: 'Aug 18 – Aug 24', badge: 'Paid', tone: 'emerald', meta: '$5,920' },
      { title: 'James Sullivan', subtitle: 'Aug 18 – Aug 24', badge: 'Paid', tone: 'emerald', meta: '$7,210' },
      { title: 'Kevin O’Brien', subtitle: 'Aug 18 – Aug 24', badge: 'Pending', tone: 'amber', meta: '$6,050' },
    ],
    footnote: 'Next run closes Sep 1', link: { label: 'Open Pay Stubs', path: '/paystubs' },
  },
};

// Lead-in line for each data panel (used by natural-language intent matches).
const REPLY_TEXT: Partial<Record<AgentIntent, string>> = {
  drivers: 'Here’s a snapshot of your driver roster — 4 need attention:',
  documents: 'Here’s where your documents stand across carrier, assets and drivers:',
  expiring: 'These credentials are expiring soon — start with the ones due this week:',
  accidents: 'Here are your recent accidents. One is waiting on a police report number:',
  tickets: 'Here are your open tickets and citations — two are near their deadline:',
  hiring: 'Here’s your hiring pipeline. Two applicants are ready for final approval:',
  onboarding: 'Here’s onboarding progress for your approved drivers:',
  safety: 'Here are this week’s safety events — two high-severity need coaching:',
  hos: 'Here’s live Hours-of-Service status — two drivers are near their limit:',
  violations: 'Here are your open violations, including one roadside inspection:',
  dqfiles: 'Here’s DQ-file completeness — five files still have gaps:',
  account: 'Here’s your account at a glance:',
  paystub: 'Here’s your latest payroll run:',
};

// ── resource-widget builders (attached to delivered messages) ────────────────
const uploadRes = (title: string, detail: string): AiResource =>
  ({ kind: 'upload', title, detail, actionLabel: 'Upload document', url: 'tracksmart.app/upload/•••' });
const formRes = (title: string, detail: string): AiResource =>
  ({ kind: 'form', title, detail, actionLabel: 'Open form', url: 'tracksmart.app/form/•••' });
const signRes = (title: string, detail: string): AiResource =>
  ({ kind: 'sign', title, detail, actionLabel: 'Review & sign', url: 'tracksmart.app/sign/•••' });
const viewRes = (title: string, detail: string): AiResource =>
  ({ kind: 'view', title, detail, actionLabel: 'Open link', url: 'tracksmart.app/view/•••' });

// ── the agents ───────────────────────────────────────────────────────────────
export const AGENTS: AgentDef[] = [
  {
    key: 'ai-hiring', name: 'Hiring & Onboarding', role: 'AI Agent · Hiring & onboarding',
    domainLabel: 'the hiring pipeline', color: 'bg-violet-600', email: 'hiring@tracksmart.ai',
    primaryIntent: 'hiring',
    blurb: 'applicants, reports and onboarding',
    greeting: 'I track applicants from application through onboarding — I can pull pipeline status, order reports, send applications and start onboarding.',
    prompts: ['Hiring pipeline status', 'Who’s ready to approve?', 'Onboarding progress', 'Send an application', 'Request a document', 'Order MVR + PSP'],
    commands: [
      { id: 'pipeline', label: 'Pipeline status', hint: 'Show the hiring pipeline', icon: 'user', intent: 'hiring' },
      { id: 'onboarding', label: 'Onboarding progress', hint: 'Show onboarding steps', icon: 'clipboard', intent: 'onboarding' },
      { id: 'send-application', label: 'Send application', hint: 'Email an application link to a contact', icon: 'send', needsContact: true,
        deliver: (n) => `Hi ${n}, please complete your driver application using the secure link below. It takes about 15 minutes.`,
        resource: () => viewRes('Start your driver application', 'Secure link · about 15 minutes'),
        action: { icon: 'send', tone: 'blue', title: 'Application sent', detail: 'Driver application link', status: 'Delivered' } },
      { id: 'request-doc', label: 'Request a document', hint: 'Ask an applicant to upload a document', icon: 'upload', needsContact: true,
        deliver: (n) => `Hi ${n}, we need one more document to continue your application. Please upload it using the secure link below.`,
        resource: (n) => uploadRes('Upload a required document', `Requested for ${n}’s driver application`),
        action: { icon: 'upload', tone: 'emerald', title: 'Document requested', detail: 'Secure upload link attached', status: 'Delivered' } },
      { id: 'send-form', label: 'Send a form to fill', hint: 'Send a form for the driver to complete', icon: 'clipboard', needsContact: true,
        deliver: (n) => `Hi ${n}, please complete this form so we can move your application forward.`,
        resource: () => formRes('Complete your application form', 'About 10 minutes'),
        action: { icon: 'clipboard', tone: 'blue', title: 'Form sent', detail: 'Application form to complete', status: 'Delivered' } },
      { id: 'order-report', label: 'Order MVR + PSP', hint: 'Request screening reports', icon: 'clipboard',
        action: { icon: 'clipboard', tone: 'amber', title: 'MVR + PSP ordered', detail: 'Requested from the screening provider', status: 'Queued' } },
      { id: 'approve', label: 'Approve applicant', hint: 'Approve & move to onboarding', icon: 'check',
        action: { icon: 'check', tone: 'emerald', title: 'Applicant approved', detail: 'Marcus Hall moved to onboarding', status: 'Done' } },
    ],
  },
  {
    key: 'ai-safety', name: 'Safety Agent', role: 'AI Agent · Safety & events',
    domainLabel: 'safety events', color: 'bg-rose-600', email: 'safety@tracksmart.ai',
    primaryIntent: 'safety',
    blurb: 'safety events, coaching and accidents',
    greeting: 'I watch telematics and safety events — I can summarize events, assign coaching, send warning letters and pull accident status.',
    prompts: ['Recent safety events', 'High-severity events', 'Recent accidents', 'Assign coaching', 'Request acknowledgement', 'Send a coaching video'],
    commands: [
      { id: 'events', label: 'Safety events', hint: 'Show this week’s events', icon: 'bell', intent: 'safety' },
      { id: 'accidents', label: 'Accidents', hint: 'Show recent accidents', icon: 'file', intent: 'accidents' },
      { id: 'assign-training', label: 'Assign coaching', hint: 'Assign a training to a driver', icon: 'graduation', needsContact: true,
        deliver: (n) => `Hi ${n}, you’ve been assigned a Defensive Driving refresher after a recent harsh-braking event. Please complete it within 7 days.`,
        resource: () => viewRes('Defensive Driving refresher', 'Assigned training · due in 7 days'),
        action: { icon: 'graduation', tone: 'violet', title: 'Training assigned', detail: 'Defensive Driving refresher', status: 'Sent' } },
      { id: 'send-video', label: 'Send a coaching video', hint: 'Share a coaching clip with a driver', icon: 'graduation', needsContact: true,
        deliver: (n) => `Hi ${n}, here’s a short coaching clip on smooth braking from your recent event. Please watch it before your next trip.`,
        resource: () => viewRes('Coaching clip · Smooth braking', '2-minute video · watch before next trip'),
        action: { icon: 'graduation', tone: 'blue', title: 'Coaching video sent', detail: 'Smooth braking clip', status: 'Delivered' } },
      { id: 'request-ack', label: 'Request acknowledgement', hint: 'Ask a driver to review & sign', icon: 'file', needsContact: true,
        deliver: (n) => `Hi ${n}, please review and sign the acknowledgement for your recent safety event.`,
        resource: () => signRes('Safety event acknowledgement', 'Review & sign · harsh-braking event'),
        action: { icon: 'file', tone: 'amber', title: 'Acknowledgement requested', detail: 'Review & sign attached', status: 'Sent' } },
      { id: 'send-warning', label: 'Send warning letter', hint: 'Send a warning to a driver', icon: 'file', needsContact: true,
        deliver: (n) => `Hi ${n}, this is a formal warning letter regarding a repeated harsh-braking safety event. Please acknowledge and sign.`,
        resource: () => signRes('Warning letter — Harsh braking', 'Formal notice · acknowledgement required'),
        action: { icon: 'file', tone: 'amber', title: 'Warning letter sent', detail: 'Harsh-braking · acknowledgement required', status: 'Sent' } },
    ],
  },
  {
    key: 'ai-hos', name: 'Hours of Service', role: 'AI Agent · Hours of Service',
    domainLabel: 'Hours-of-Service', color: 'bg-orange-500', email: 'hos@tracksmart.ai',
    primaryIntent: 'hos',
    blurb: 'duty status, limits and rest',
    greeting: 'I monitor ELD hours — I can show who’s near their limit, flag violations, suggest rest stops and alert a driver.',
    prompts: ['Who’s near their limit?', 'Drivers on duty', 'Suggest rest stops', 'Alert a driver'],
    commands: [
      { id: 'hours', label: 'HOS status', hint: 'Show live duty status', icon: 'bell', intent: 'hos' },
      { id: 'rest', label: 'Suggest rest stops', hint: 'Send nearest safe stops to dispatch', icon: 'check',
        action: { icon: 'check', tone: 'blue', title: 'Rest stops suggested', detail: '2 drivers near their 14-hour limit — nearest safe stops sent to dispatch', status: 'Done' } },
      { id: 'notify', label: 'Alert a driver', hint: 'Send an HOS alert to a driver', icon: 'bell', needsContact: true,
        deliver: (n) => `Hi ${n}, you’re within 1 hour of your 14-hour limit. Please plan your next rest break now — nearest safe stops are in the link below.`,
        resource: () => viewRes('Nearest safe rest stops', 'Live map · within 20 miles of your route'),
        action: { icon: 'bell', tone: 'amber', title: 'HOS alert sent', detail: 'Approaching 14-hour limit', status: 'Delivered' } },
    ],
  },
  {
    key: 'ai-violations', name: 'Violations Agent', role: 'AI Agent · Violations & tickets',
    domainLabel: 'violations', color: 'bg-amber-500', email: 'violations@tracksmart.ai',
    primaryIntent: 'violations',
    blurb: 'violations, inspections and tickets',
    greeting: 'I track roadside inspections, violations and tickets — I can list open items, log a violation, or notify a driver.',
    prompts: ['Open violations', 'Tickets & citations', 'Log a violation', 'Notify a driver', 'Request driver response'],
    commands: [
      { id: 'violations', label: 'Open violations', hint: 'Show open violations', icon: 'file', intent: 'violations' },
      { id: 'tickets', label: 'Tickets', hint: 'Show tickets & citations', icon: 'clipboard', intent: 'tickets' },
      { id: 'log-violation', label: 'Log a violation', hint: 'Create a draft violation', icon: 'clipboard',
        action: { icon: 'clipboard', tone: 'amber', title: 'Violation logged', detail: 'Draft created for review', status: 'Draft' } },
      { id: 'notify', label: 'Notify a driver', hint: 'Send a violation notice to a driver', icon: 'bell', needsContact: true,
        deliver: (n) => `Hi ${n}, a new violation was recorded on your file. Please review and respond using the link below.`,
        resource: () => viewRes('Violation notice', 'Review the recorded violation on your file'),
        action: { icon: 'bell', tone: 'amber', title: 'Notice sent', detail: 'Violation notice', status: 'Delivered' } },
      { id: 'request-response', label: 'Request driver response', hint: 'Ask a driver to explain a violation', icon: 'clipboard', needsContact: true,
        deliver: (n) => `Hi ${n}, please complete the driver-response form for the recent roadside violation.`,
        resource: () => formRes('Driver response form', 'Explain the roadside violation · required'),
        action: { icon: 'clipboard', tone: 'blue', title: 'Response requested', detail: 'Driver-response form attached', status: 'Delivered' } },
      { id: 'request-doc', label: 'Request a document', hint: 'Ask a driver to upload proof', icon: 'upload', needsContact: true,
        deliver: (n) => `Hi ${n}, please upload proof of repair / correction for the roadside violation.`,
        resource: () => uploadRes('Upload proof of correction', 'Roadside violation · required for DataQ'),
        action: { icon: 'upload', tone: 'emerald', title: 'Document requested', detail: 'Proof-of-correction upload link', status: 'Delivered' } },
    ],
  },
  {
    key: 'ai-dq', name: 'DQ Files Agent', role: 'AI Agent · Driver Qualification',
    domainLabel: 'DQ files', color: 'bg-blue-600', email: 'dq@tracksmart.ai',
    primaryIntent: 'dqfiles',
    blurb: 'DQ files, documents and expirations',
    greeting: 'I keep driver-qualification files complete — I can show completeness, expiring items, missing documents, and request an upload.',
    prompts: ['DQ file completeness', 'Expiring documents', 'Missing documents', 'Request a document', 'Request medical certificate'],
    commands: [
      { id: 'dqfiles', label: 'DQ completeness', hint: 'Show DQ file status', icon: 'clipboard', intent: 'dqfiles' },
      { id: 'expiring', label: 'Expiring items', hint: 'Show expiring documents', icon: 'bell', intent: 'expiring' },
      { id: 'missing', label: 'Missing documents', hint: 'Show documents that need attention', icon: 'file', intent: 'documents' },
      { id: 'request-doc', label: 'Request a document', hint: 'Ask a driver to upload a document', icon: 'upload', needsContact: true,
        deliver: (n) => `Hi ${n}, your DQ file is missing a current document. Please upload it using the secure link below.`,
        resource: (n) => uploadRes('Upload a missing DQ document', `Required to complete ${n}’s DQ file`),
        action: { icon: 'upload', tone: 'emerald', title: 'Document requested', detail: 'Secure upload link attached', status: 'Delivered' } },
      { id: 'request-medical', label: 'Request medical certificate', hint: 'Ask a driver to upload their DOT medical', icon: 'upload', needsContact: true,
        deliver: (n) => `Hi ${n}, your DOT medical certificate is expiring soon. Please upload your renewed certificate below.`,
        resource: () => uploadRes('Upload your Medical Certificate', 'DOT medical (MCSA-5876) · expires in 12 days'),
        action: { icon: 'upload', tone: 'amber', title: 'Medical cert requested', detail: 'Expiring in 12 days', status: 'Delivered' } },
      { id: 'send-dq-link', label: 'Send DQ file link', hint: 'Share the driver’s DQ file with them', icon: 'file', needsContact: true,
        deliver: (n) => `Hi ${n}, here’s a link to your driver-qualification file so you can see what’s still needed.`,
        resource: () => viewRes('Your DQ file', 'See completed & missing items'),
        action: { icon: 'file', tone: 'blue', title: 'DQ file shared', detail: 'Read-only link', status: 'Delivered' } },
    ],
  },
  {
    key: 'ai-account', name: 'Account Agent', role: 'AI Agent · Account & fleet',
    domainLabel: 'the account', color: 'bg-teal-600', email: 'account@tracksmart.ai',
    primaryIntent: 'account',
    blurb: 'account, drivers and assets',
    greeting: 'I know your carrier account inside out — drivers, assets, compliance and alerts. I can also message a driver for you.',
    prompts: ['Account overview', 'Driver roster', 'Open alerts', 'Message a driver', 'Request a document', 'Send a notification'],
    commands: [
      { id: 'account', label: 'Account overview', hint: 'Show account at a glance', icon: 'user', intent: 'account' },
      { id: 'drivers', label: 'Driver roster', hint: 'Show all drivers', icon: 'user', intent: 'drivers' },
      { id: 'message', label: 'Message a driver', hint: 'Send a message to a driver', icon: 'mail', needsContact: true,
        deliver: (n) => `Hi ${n}, checking in from the office — let me know if you need anything on your current run.`,
        action: { icon: 'mail', tone: 'blue', title: 'Message sent', detail: 'Office check-in', status: 'Delivered' } },
      { id: 'notify', label: 'Send a notification', hint: 'Send a text notification to a driver or user', icon: 'bell', needsContact: true,
        deliver: (n) => `Hi ${n}, a quick notification from the office — please check the app when you have a moment.`,
        action: { icon: 'bell', tone: 'amber', title: 'Notification sent', detail: 'Office notification', status: 'Delivered' } },
      { id: 'request-doc', label: 'Request a document', hint: 'Ask a driver or user to upload a document', icon: 'upload', needsContact: true,
        deliver: (n) => `Hi ${n}, please upload the requested document using the secure link below.`,
        resource: () => uploadRes('Upload a document', 'Requested by the office'),
        action: { icon: 'upload', tone: 'emerald', title: 'Document requested', detail: 'Secure upload link attached', status: 'Delivered' } },
    ],
  },
];

const AGENT_BY_KEY = new Map(AGENTS.map(a => [a.key, a]));
export function getAgent(key?: string): AgentDef | undefined { return key ? AGENT_BY_KEY.get(key) : undefined; }

// Starter quick-prompts for an AI chat that has no agent-specific prompts.
export const DEFAULT_AGENT_PROMPTS: string[] = [
  'Hi 👋', 'Give me driver information', 'Show documents', 'Expiring documents',
];

// ── natural-language intent matching ─────────────────────────────────────────
// Whole-word matching so prompts route cleanly. Order: most specific first.
const INTENT_RULES: { intent: Exclude<AgentIntent, 'greeting' | 'help'>; re: RegExp }[] = [
  { intent: 'onboarding', re: /\b(onboard\w*)\b/i },
  { intent: 'hiring',     re: /\b(hiring|hire|applicant|application|recruit\w*|candidate|pipeline)\b/i },
  { intent: 'expiring',   re: /\b(expir\w*|expiry|renew\w*|due soon|coming up)\b/i },
  { intent: 'dqfiles',    re: /\b(dq files?|dq file|dq|qualification)\b/i },
  { intent: 'hos',        re: /\b(hours of service|hos|duty status|14-?hour|rest|eld)\b/i },
  { intent: 'safety',     re: /\b(safety|harsh|coaching|coach|braking|telematics)\b/i },
  { intent: 'violations', re: /\b(violation|violations|roadside|inspection|dataq)\b/i },
  { intent: 'tickets',    re: /\b(ticket|tickets|citation|citations|fine|offence|offense)\b/i },
  { intent: 'accidents',  re: /\b(accident|accidents|crash|collision|incident|incidents)\b/i },
  { intent: 'documents',  re: /\b(document|documents|docs?|paperwork|credential|certificate|compliance)\b/i },
  { intent: 'drivers',    re: /\b(driver|drivers|roster|fleet|who'?s driving)\b/i },
  { intent: 'account',    re: /\b(account|carrier|overview|company|asset|assets)\b/i },
];

const GREETING_RE = /\b(hi|hey+|hello|yo|howdy|thanks|thank you|how are you|good (morning|afternoon|evening)|what'?s up|sup)\b/i;

function greetingReply(agent: AgentDef): AgentReply {
  return { text: `Hi! I’m ${agent.name} — ${agent.greeting} What would you like to see?`, suggestions: agent.prompts };
}

/** Build the reply for a resolved slash command (contact already resolved in text). */
function commandReply(agent: AgentDef, cmd: AgentCommand, contactToken: string | null): AgentReply {
  const suggestions = agent.prompts;
  // A command that just shows a panel.
  if (cmd.intent && !cmd.needsContact) {
    return { text: cmd.reply ?? REPLY_TEXT[cmd.intent] ?? cmd.label, panel: PANELS[cmd.intent], suggestions };
  }
  // A command that delivers a message to a contact.
  if (cmd.needsContact) {
    if (!contactToken) {
      return { text: `Who should I send this to? Type “@” to pick a driver — e.g. \`/${cmd.id} @John\`.`, suggestions };
    }
    const first = contactToken.replace(/^@/, '');
    const resource = cmd.resource?.(first);
    return {
      text: cmd.reply ?? `Done — ${cmd.label.toLowerCase()} to ${first}.`,
      action: cmd.action ? { ...cmd.action } : { icon: cmd.icon, tone: 'blue', title: cmd.label, status: 'Delivered' },
      resource,
      deliver: cmd.deliver ? { toToken: contactToken, text: cmd.deliver(first), resource } : undefined,
      suggestions,
    };
  }
  // A static action command.
  return {
    text: cmd.reply ?? `Done — ${cmd.label.toLowerCase()}.`,
    action: cmd.action ? { ...cmd.action } : { icon: cmd.icon, tone: 'emerald', title: cmd.label, status: 'Done' },
    suggestions,
  };
}

/** Free-text action that targets an `@contact` — e.g. "ask @Maria to upload her
 *  medical certificate", "notify @John to sign", "send @Ava a form". Delivers the
 *  message (with a resource widget where relevant) into the contact's chat. */
function freeTextDeliver(agent: AgentDef, token: string, first: string, kind: 'upload' | 'form' | 'sign' | 'notify'): AgentReply {
  const map: Record<typeof kind, { res?: AiResource; icon: AiActionIcon; tone: AiTone; title: string; text: string }> = {
    upload: { res: uploadRes('Upload a document', `Requested by ${agent.name}`), icon: 'upload', tone: 'emerald', title: 'Document requested', text: `Hi ${first}, please upload the requested document using the secure link below.` },
    form:   { res: formRes('Complete a form', `Sent by ${agent.name}`), icon: 'clipboard', tone: 'blue', title: 'Form sent', text: `Hi ${first}, please complete this form when you have a moment.` },
    sign:   { res: signRes('Review & sign', `Sent by ${agent.name}`), icon: 'file', tone: 'amber', title: 'Signature requested', text: `Hi ${first}, please review and sign the document below.` },
    notify: { icon: 'bell', tone: 'amber', title: 'Notification sent', text: `Hi ${first}, a quick notification from the office — please check the app when you have a moment.` },
  };
  const m = map[kind];
  return {
    text: `Done — I’ve messaged ${first}.`,
    action: { icon: m.icon, tone: m.tone, title: m.title, status: 'Delivered' },
    resource: m.res,
    deliver: { toToken: token, text: m.text, resource: m.res },
    suggestions: agent.prompts,
  };
}

/** Detect the kind of contact-targeted action a free-text message is asking for. */
function freeTextKind(raw: string): 'upload' | 'form' | 'sign' | 'notify' | null {
  if (/\b(upload|document|docs?|proof|medical|cdl|licen[cs]e|certificate|dq|file)\b/i.test(raw)) return 'upload';
  if (/\b(form|fill|complete|questionnaire|response)\b/i.test(raw)) return 'form';
  if (/\b(sign|signature|acknowledg\w*|consent)\b/i.test(raw)) return 'sign';
  if (/\b(notify|remind|alert|message|text|tell|send|ping|check in)\b/i.test(raw)) return 'notify';
  return null;
}

/**
 * Interpret a message to an agent. Handles `/command [@contact]` and free text.
 * `agentKey` selects the specialized agent; falls back to a generic responder.
 */
export function interpretAgent(agentKey: string | undefined, text: string): AgentReply {
  const agent = getAgent(agentKey) ?? AGENTS[0];
  const raw = text.trim();

  // 1. Slash command?  /id  (optionally with @contact)
  const cmdMatch = raw.match(/^\/([\w-]+)/);
  if (cmdMatch) {
    const id = cmdMatch[1].toLowerCase();
    const cmd = agent.commands.find(c => c.id === id)
      ?? AGENTS.flatMap(a => a.commands).find(c => c.id === id);
    const contact = raw.match(/@([\w'’.-]+)/)?.[0] ?? null; // includes the leading @
    if (cmd) return commandReply(agent, cmd, contact);
    return { text: `I don’t know the command \`/${id}\`. Type “/” to see what I can do.`, suggestions: agent.prompts };
  }

  // 1b. Free-text action targeting an @contact (upload / form / sign / notify).
  const atToken = raw.match(/@([\w'’.-]+)/)?.[0] ?? null;
  if (atToken) {
    const kind = freeTextKind(raw);
    if (kind) return freeTextDeliver(agent, atToken, atToken.replace(/^@/, ''), kind);
  }

  // 2. Greeting?
  if (GREETING_RE.test(raw) && !INTENT_RULES.some(r => r.re.test(raw))) return greetingReply(agent);

  // 3. Natural-language intent.
  for (const rule of INTENT_RULES) {
    if (rule.re.test(raw)) {
      return { text: REPLY_TEXT[rule.intent] ?? agent.name, panel: PANELS[rule.intent], suggestions: agent.prompts };
    }
  }

  // 4. Fallback → the agent's own domain.
  return {
    text: `I focus on ${agent.domainLabel}. Here’s the latest — or try one of these:`,
    panel: PANELS[agent.primaryIntent],
    suggestions: agent.prompts,
  };
}
