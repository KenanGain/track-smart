// ─────────────────────────────────────────────────────────────────────────────
// AI agents — the demo "brain" behind the AI Agent chats.
//
// This is a FRONT-END DEMO. There is no real model call: the user picks (or types)
// a canned prompt and we match it to an intent, then answer with a friendly line
// plus a rich data panel drawn from representative fleet data. It lets you show a
// conversational agent that can pull up drivers, documents, expiring credentials,
// accidents, tickets and the hiring pipeline — with proper widgets — entirely on
// the front end. Wire it up via `askAgent()` in messages-store.ts.
// ─────────────────────────────────────────────────────────────────────────────

export type AiTone = 'rose' | 'amber' | 'emerald' | 'blue' | 'violet' | 'slate';

export type AgentIntent =
  | 'greeting' | 'help'
  | 'drivers' | 'documents' | 'expiring' | 'accidents' | 'tickets' | 'hiring';

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

export interface AgentReply {
  text: string;
  panel?: AiPanel;
  suggestions?: string[];     // follow-up quick prompts shown as chips
}

// Starter quick-prompts shown above the composer before the agent has replied.
export const DEFAULT_AGENT_PROMPTS: string[] = [
  'Hi 👋',
  'Give me driver information',
  'Show documents',
  'Expiring documents',
  'Recent accidents',
  'Open tickets',
  'Hiring process status',
];

// ── demo data panels ─────────────────────────────────────────────────────────
// Representative data consistent with the seeded roster elsewhere in the app.

const DRIVERS_PANEL: AiPanel = {
  intent: 'drivers',
  title: 'Driver roster',
  summary: '24 drivers on this carrier — 21 active, 3 off-duty. 4 need attention.',
  stats: [
    { label: 'Total', value: '24', tone: 'blue' },
    { label: 'Active', value: '21', tone: 'emerald' },
    { label: 'Off-duty', value: '3', tone: 'slate' },
    { label: 'Flagged', value: '4', tone: 'amber' },
  ],
  rows: [
    { title: 'John Smith', subtitle: 'TRK-042 · Houston run', badge: 'Active', tone: 'emerald', meta: 'HOS 6h left' },
    { title: 'Maria Rodriguez', subtitle: 'TRK-118', badge: 'Medical expiring', tone: 'amber', meta: '12 days' },
    { title: 'Robert Chen', subtitle: 'TRK-201', badge: 'Review open', tone: 'amber', meta: 'Harsh-braking' },
    { title: 'Kevin O’Brien', subtitle: 'TRK-310', badge: 'CDL renewal', tone: 'rose', meta: '21 days' },
    { title: 'James Sullivan', subtitle: 'TRK-455 · Reno run', badge: 'Active', tone: 'emerald', meta: 'On time' },
  ],
  footnote: '+19 more drivers',
  link: { label: 'Open driver roster', path: '/account/profile' },
};

const DOCUMENTS_PANEL: AiPanel = {
  intent: 'documents',
  title: 'Documents & compliance',
  summary: '312 documents on file — 268 valid, 31 expiring, 13 missing.',
  stats: [
    { label: 'On file', value: '312', tone: 'blue' },
    { label: 'Valid', value: '268', tone: 'emerald' },
    { label: 'Expiring', value: '31', tone: 'amber' },
    { label: 'Missing', value: '13', tone: 'rose' },
  ],
  rows: [
    { title: 'CDL — Maria Rodriguez', subtitle: 'Driver License', badge: 'Valid', tone: 'emerald', meta: 'exp 2027-04' },
    { title: 'Medical Certificate — Maria Rodriguez', subtitle: 'Medical', badge: 'Expiring', tone: 'amber', meta: '12 days' },
    { title: 'MVR — Robert Chen', subtitle: 'Abstracts', badge: 'Due', tone: 'amber', meta: '5 days' },
    { title: 'Annual Inspection — TRL-455', subtitle: 'Asset · Inspection', badge: 'Due', tone: 'amber', meta: '7 days' },
    { title: 'Drug & Alcohol Policy — John Smith', subtitle: 'Disclosures', badge: 'Missing', tone: 'rose', meta: 'not uploaded' },
  ],
  footnote: 'Across Carrier · Asset · Driver records',
  link: { label: 'Open Compliances & Documents', path: '/default-compliance-documents' },
};

const EXPIRING_PANEL: AiPanel = {
  intent: 'expiring',
  title: 'Expiring documents',
  summary: '11 credentials expire in the next 30 days — 3 are due within a week.',
  stats: [
    { label: '≤ 7 days', value: '3', tone: 'rose' },
    { label: '≤ 30 days', value: '11', tone: 'amber' },
    { label: '≤ 90 days', value: '24', tone: 'blue' },
  ],
  rows: [
    { title: 'MVR — Robert Chen', subtitle: 'Motor Vehicle Record', badge: 'Overdue soon', tone: 'rose', meta: '5 days' },
    { title: 'Annual Inspection — TRL-455', subtitle: 'Asset inspection', badge: 'Due', tone: 'rose', meta: '7 days' },
    { title: 'Medical Certificate — Maria Rodriguez', subtitle: 'DOT medical', badge: 'Due', tone: 'amber', meta: '12 days' },
    { title: 'CDL — Kevin O’Brien', subtitle: 'Driver license', badge: 'Renewal', tone: 'amber', meta: '21 days' },
    { title: 'IFTA decal — TRK-088', subtitle: 'Permits', badge: 'Renewal', tone: 'amber', meta: '28 days' },
  ],
  footnote: 'Reminders auto-scheduled to each driver',
  link: { label: 'Open Compliance Monitoring', path: '/default-compliance-monitoring' },
};

const ACCIDENTS_PANEL: AiPanel = {
  intent: 'accidents',
  title: 'Accidents',
  summary: '7 accidents this year — 2 open, 1 under review, 4 closed.',
  stats: [
    { label: 'This year', value: '7', tone: 'blue' },
    { label: 'Open', value: '2', tone: 'rose' },
    { label: 'Under review', value: '1', tone: 'amber' },
    { label: 'Closed', value: '4', tone: 'emerald' },
  ],
  rows: [
    { title: 'ACC-2026-0021', subtitle: 'Jacob Carter · Aug 20 · rear-end', badge: 'Under review', tone: 'amber', meta: 'Adjuster: Priya' },
    { title: 'ACC-2026-0019', subtitle: 'John Smith · I-40 · no-fault', badge: 'Open', tone: 'rose', meta: 'Awaiting report' },
    { title: 'ACC-2026-0018', subtitle: 'Robert Chen · lot · minor', badge: 'Closed', tone: 'emerald', meta: 'Settled' },
    { title: 'ACC-2026-0015', subtitle: 'Mike Johnson · weather', badge: 'Closed', tone: 'emerald', meta: 'No injury' },
  ],
  footnote: '1 report waiting on a police report number',
  link: { label: 'Open Accidents', path: '/default-accidents' },
};

const TICKETS_PANEL: AiPanel = {
  intent: 'tickets',
  title: 'Tickets & citations',
  summary: '5 open tickets — 2 in review. 18 resolved this quarter.',
  stats: [
    { label: 'Open', value: '5', tone: 'rose' },
    { label: 'In review', value: '2', tone: 'amber' },
    { label: 'Resolved', value: '18', tone: 'emerald' },
  ],
  rows: [
    { title: 'OFF-84729', subtitle: 'Speeding · Jacob Carter', badge: 'Open', tone: 'rose', meta: '$185' },
    { title: 'OFF-84701', subtitle: 'Logbook · Kevin O’Brien', badge: 'In review', tone: 'amber', meta: 'Contesting' },
    { title: 'OFF-84688', subtitle: 'Overweight · James Sullivan', badge: 'Open', tone: 'rose', meta: '$320' },
    { title: 'OFF-84650', subtitle: 'Signal · Maria Rodriguez', badge: 'Resolved', tone: 'emerald', meta: 'Paid' },
  ],
  footnote: '2 tickets are approaching their response deadline',
  link: { label: 'Open Tickets', path: '/tickets' },
};

const HIRING_PANEL: AiPanel = {
  intent: 'hiring',
  title: 'Hiring pipeline',
  summary: '9 applicants in progress — 2 ready to approve, 3 onboarding.',
  stats: [
    { label: 'Applicants', value: '9', tone: 'blue' },
    { label: 'In progress', value: '6', tone: 'amber' },
    { label: 'Ready', value: '2', tone: 'emerald' },
    { label: 'Onboarding', value: '3', tone: 'violet' },
  ],
  rows: [
    { title: 'Daniel Reed', subtitle: 'Cross-border · Application', badge: 'Step 6 / 13', tone: 'amber', meta: 'PSP pending' },
    { title: 'Sophia Nguyen', subtitle: 'US only · Reports', badge: 'Step 9 / 13', tone: 'amber', meta: 'MVR ordered' },
    { title: 'Marcus Hall', subtitle: 'Canada · Road test', badge: 'Ready', tone: 'emerald', meta: 'Awaiting approval' },
    { title: 'Ava Thompson', subtitle: 'Onboarding · Training', badge: 'Onboarding', tone: 'violet', meta: '2 / 4 steps' },
  ],
  footnote: '2 applicants are ready for your final approval',
  link: { label: 'Open Hiring', path: '/hiring-process/hiring' },
};

const PANELS: Record<Exclude<AgentIntent, 'greeting' | 'help'>, AiPanel> = {
  drivers: DRIVERS_PANEL,
  documents: DOCUMENTS_PANEL,
  expiring: EXPIRING_PANEL,
  accidents: ACCIDENTS_PANEL,
  tickets: TICKETS_PANEL,
  hiring: HIRING_PANEL,
};

// A short lead-in line + a couple of follow-up chips for each data answer.
const REPLY_TEXT: Record<Exclude<AgentIntent, 'greeting' | 'help'>, string> = {
  drivers: 'Here’s a snapshot of your driver roster. 4 drivers need attention right now:',
  documents: 'Here’s where your documents stand across the carrier, assets and drivers:',
  expiring: 'These credentials are expiring soon — I’d start with the ones due this week:',
  accidents: 'Here are your recent accidents. One is still waiting on a police report number:',
  tickets: 'Here are your open tickets and citations — two are near their response deadline:',
  hiring: 'Here’s your hiring pipeline. Two applicants are ready for final approval:',
};

const FOLLOW_UPS: Record<Exclude<AgentIntent, 'greeting' | 'help'>, string[]> = {
  drivers: ['Expiring documents', 'Open tickets', 'Hiring process status'],
  documents: ['Expiring documents', 'Give me driver information', 'Recent accidents'],
  expiring: ['Show documents', 'Give me driver information', 'Notify the drivers'],
  accidents: ['Open tickets', 'Give me driver information', 'Show documents'],
  tickets: ['Recent accidents', 'Give me driver information', 'Expiring documents'],
  hiring: ['Give me driver information', 'Show documents', 'Recent accidents'],
};

// ── intent matching ──────────────────────────────────────────────────────────
// Whole-word matching so canned prompts route cleanly. Order matters: "expiring
// documents" should resolve to `expiring`, not `documents`.
const INTENT_RULES: { intent: Exclude<AgentIntent, 'greeting' | 'help'>; re: RegExp }[] = [
  { intent: 'expiring',  re: /\b(expir\w*|expiry|renew\w*|due|about to expire|coming up)\b/i },
  { intent: 'drivers',   re: /\b(driver|drivers|roster|fleet|who'?s driving)\b/i },
  { intent: 'documents', re: /\b(document|documents|docs?|dq file|paperwork|credential|certificate|compliance)\b/i },
  { intent: 'accidents', re: /\b(accident|accidents|crash|collision|incident|incidents)\b/i },
  { intent: 'tickets',   re: /\b(ticket|tickets|citation|citations|violation|fine|offence|offense)\b/i },
  { intent: 'hiring',    re: /\b(hiring|hire|applicant|application|onboard\w*|recruit\w*|candidate)\b/i },
];

const GREETING_RE = /\b(hi|hey+|hello|yo|howdy|thanks|thank you|how are you|good (morning|afternoon|evening)|what'?s up|sup)\b/i;

function greetingReply(agentName: string): AgentReply {
  return {
    text: `Hi! I’m ${agentName}. I can pull up live info from across TrackSmart — drivers, documents, expiring credentials, accidents, tickets and the hiring pipeline. What would you like to see?`,
    suggestions: ['Give me driver information', 'Show documents', 'Expiring documents', 'Recent accidents', 'Open tickets', 'Hiring process status'],
  };
}

function helpReply(): AgentReply {
  return {
    text: 'I can help you look things up across the fleet. Try one of these:',
    suggestions: ['Give me driver information', 'Show documents', 'Expiring documents', 'Recent accidents', 'Open tickets', 'Hiring process status'],
  };
}

/**
 * Match a user message to a demo reply. `agentName` personalizes the greeting.
 * Returns a friendly line, an optional data panel and follow-up quick prompts.
 */
export function buildAgentReply(agentName: string, text: string): AgentReply {
  const q = text.trim();
  for (const rule of INTENT_RULES) {
    if (rule.re.test(q)) {
      return {
        text: REPLY_TEXT[rule.intent],
        panel: PANELS[rule.intent],
        suggestions: FOLLOW_UPS[rule.intent],
      };
    }
  }
  if (GREETING_RE.test(q)) return greetingReply(agentName);
  return helpReply();
}
