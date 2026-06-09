// DQ File checklist PROFILES.
//
// Different drivers need different DQ files: a local/domestic driver, a US
// driver, a Canada driver, and a cross-border (US <-> Canada) driver each carry
// a different required-document set. A profile is a named, editable checklist
// (sections + items) that applies to one or more driver types. Profiles are
// stored in localStorage and seeded with sensible built-ins; the DQ tab/roster
// auto-pick the right profile per driver (with a manual override).

import type { DqChecklistItem, DqChecklistSection } from "./dq-file-checklist";
import type { Applicant } from "./ats.data";

export type DqDriverType = 'local' | 'us' | 'canada' | 'cross_border';

export const DQ_DRIVER_TYPES: { id: DqDriverType; label: string }[] = [
    { id: 'local', label: 'Local / Domestic' },
    { id: 'us', label: 'US Driver' },
    { id: 'canada', label: 'Canada Driver' },
    { id: 'cross_border', label: 'Cross-Border (US ↔ Canada)' },
];

export interface DqProfile {
    id: string;
    name: string;
    description: string;
    /** Driver types this profile auto-applies to. */
    appliesTo: DqDriverType[];
    isDefault?: boolean;
    isBuiltIn?: boolean;
    sections: DqChecklistSection[];
    updatedAt: string;
}

const STORAGE_KEY = 'ats:dq-profiles-v1';
const OVERRIDE_KEY = 'ats:dq-driver-profile-v1';
const today = () => new Date().toISOString().slice(0, 10);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function uidDq(prefix = 'dq'): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

const item = (label: string, keywords: string[], conditional?: boolean): DqChecklistItem => ({
    id: `it-${slug(label)}`, label, keywords, conditional,
});
const section = (title: string, items: DqChecklistItem[]): DqChecklistSection => ({ id: `sec-${slug(title)}`, title, items });

// ── Shared section pieces ────────────────────────────────────────────────────
const monthlyAudit = () => section('Monthly Audit Report', [
    item('Logbook audit violations report', ['logbook', 'log audit', 'hours of service', 'hos']),
    item('Any interventions and roadside events', ['roadside', 'intervention', 'inspection']),
    item('Safety-related violations', ['safety', 'violation']),
]);
const trainings = () => section('Trainings', [
    item('Proactive training certificates', ['proactive']),
    item('Reactive training certificates', ['reactive']),
    item('Orientation training certificates', ['orientation']),
]);
const inspections = () => section('Inspections and Tickets', [
    item('Warning Letters', ['warning']),
    item('Annual Review', ['annual review', 'annual']),
]);

/** The DQ File section — base records plus type-specific identity/eligibility docs. */
function dqFileSection(extra: DqChecklistItem[]): DqChecklistSection {
    return section('DQ File', [
        item('Application', ['application', 'applicant information']),
        item('CVDR', ['cvdr', 'cvor', 'driver abstract', 'driving record']),
        item('MVR', ['mvr', 'motor vehicle record']),
        item("Driver's License", ['license', 'licence', 'cdl', 'driver license', 'driving licence']),
        item('PCC', ['pcc', 'police clearance', 'criminal', 'background']),
        item('PSP', ['psp']),
        ...extra,
        item('Orientation training certificates', ['orientation']),
        item('Road test', ['road test']),
        item('Hazmat card', ['hazmat']),
    ]);
}

function seedProfiles(): DqProfile[] {
    const mk = (id: string, name: string, description: string, appliesTo: DqDriverType[], isDefault: boolean, dqExtra: DqChecklistItem[]): DqProfile => ({
        id, name, description, appliesTo, isDefault, isBuiltIn: true, updatedAt: today(),
        sections: [monthlyAudit(), dqFileSection(dqExtra), trainings(), inspections()],
    });
    return [
        mk('dq-local', 'Local / Domestic Driver', 'Standard DQ file for local and domestic drivers.', ['local'], true, [
            item('Passport', ['passport'], true),
        ]),
        mk('dq-us', 'US Driver', 'DQ file for US-domiciled drivers — passport and US work authorization.', ['us'], false, [
            item('Passport', ['passport']),
            item('US Visa', ['visa'], true),
            item('Work Permit', ['work permit'], true),
        ]),
        mk('dq-canada', 'Canada Driver', 'DQ file for Canada-domiciled drivers — PR / work authorization.', ['canada'], false, [
            item('Passport', ['passport'], true),
            item('PR Card', ['pr card', 'permanent resident'], true),
            item('Work Permit', ['work permit'], true),
        ]),
        mk('dq-cross-border', 'Cross-Border Driver', 'US ↔ Canada drivers — passport, FAST card, and cross-border eligibility.', ['cross_border'], false, [
            item('Passport', ['passport']),
            item('US Visa', ['visa'], true),
            item('FAST Card', ['fast card', 'fast']),
            item('PR Card', ['pr card', 'permanent resident'], true),
            item('Work Permit', ['work permit'], true),
        ]),
    ];
}

// ── Persistence ──────────────────────────────────────────────────────────────
const BUILTIN_IDS = new Set(['dq-local', 'dq-us', 'dq-canada', 'dq-cross-border']);

export function loadDqProfiles(): DqProfile[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
            const stored = parsed as DqProfile[];
            // Keep user edits to built-ins AND custom profiles; only add missing built-ins.
            const haveBuiltins = new Set(stored.filter(p => BUILTIN_IDS.has(p.id)).map(p => p.id));
            const missing = seedProfiles().filter(p => !haveBuiltins.has(p.id));
            return [...stored, ...missing];
        }
    } catch { /* fall through */ }
    return seedProfiles();
}

export function saveDqProfiles(profiles: DqProfile[]): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)); } catch { /* ignore */ }
}

export function upsertDqProfile(profile: DqProfile): DqProfile[] {
    const list = loadDqProfiles();
    const idx = list.findIndex(p => p.id === profile.id);
    const next = { ...profile, updatedAt: today() };
    const out = idx >= 0 ? list.map(p => p.id === profile.id ? next : p) : [next, ...list];
    saveDqProfiles(out);
    return out;
}

export function deleteDqProfile(id: string): DqProfile[] {
    const out = loadDqProfiles().filter(p => p.id !== id);
    saveDqProfiles(out);
    return out;
}

export function newDqProfile(): DqProfile {
    return {
        id: uidDq('dqp'), name: 'New DQ Checklist', description: '', appliesTo: [], isDefault: false, isBuiltIn: false,
        sections: [section('DQ File', [item('Application', ['application'])])],
        updatedAt: today(),
    };
}

// ── Per-driver override (admin manually picks a profile for a driver) ─────────
export function loadDqOverrides(): Record<string, string> {
    try { const raw = localStorage.getItem(OVERRIDE_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
export function setDqOverride(applicantId: string, profileId: string | null): void {
    const m = loadDqOverrides();
    if (profileId) m[applicantId] = profileId; else delete m[applicantId];
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

// ── Auto driver-type detection + profile selection ───────────────────────────
export function detectDqDriverType(applicant: Applicant, templateName?: string): DqDriverType {
    // An explicit driver type chosen at invite always wins.
    if (applicant.dqDriverType) return applicant.dqDriverType;
    const t = (templateName ?? '').toLowerCase();
    if (t.includes('cross')) return 'cross_border';
    const country = (applicant.country ?? '').toLowerCase();
    if (country.includes('canada')) return 'canada';
    if (country.includes('united states') || country === 'usa' || country === 'us') return 'us';
    return 'local';
}

export function pickDqProfile(type: DqDriverType, profiles: DqProfile[]): DqProfile | undefined {
    return profiles.find(p => p.appliesTo.includes(type)) ?? profiles.find(p => p.isDefault) ?? profiles[0];
}

// ── Per-driver per-item overrides ────────────────────────────────────────────
// Key: `${driverId}::${sectionTitle}::${itemLabel}`

const ITEM_OVERRIDE_KEY = 'ats:dq-item-overrides-v1';

export interface DqItemOverride {
    status: 'present' | 'skipped';
    reason?: string;
    note?: string;
    updatedAt: string;
}

export function loadDqItemOverrides(): Record<string, DqItemOverride> {
    try { return JSON.parse(localStorage.getItem(ITEM_OVERRIDE_KEY) ?? '{}'); } catch { return {}; }
}

export function setDqItemOverride(
    driverId: string, sectionTitle: string, itemLabel: string, override: DqItemOverride,
): void {
    const m = loadDqItemOverrides();
    m[`${driverId}::${sectionTitle}::${itemLabel}`] = override;
    try { localStorage.setItem(ITEM_OVERRIDE_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

export function clearDqItemOverride(driverId: string, sectionTitle: string, itemLabel: string): void {
    const m = loadDqItemOverrides();
    delete m[`${driverId}::${sectionTitle}::${itemLabel}`];
    try { localStorage.setItem(ITEM_OVERRIDE_KEY, JSON.stringify(m)); } catch { /* ignore */ }
}

/** Extract the section+item keyed overrides for a single driver (strips the driverId prefix). */
export function driverItemOverrides(allOverrides: Record<string, DqItemOverride>, driverId: string): Record<string, { status: 'present' | 'skipped' }> {
    const prefix = driverId + '::';
    const out: Record<string, { status: 'present' | 'skipped' }> = {};
    for (const [k, v] of Object.entries(allOverrides)) {
        if (k.startsWith(prefix)) out[k.slice(prefix.length)] = { status: v.status };
    }
    return out;
}

/** Resolve which profile applies to a driver — manual override wins, else auto by type. */
export function resolveDqProfile(
    applicant: Applicant,
    templateName: string | undefined,
    profiles: DqProfile[],
    overrides: Record<string, string>,
): { profile: DqProfile | undefined; auto: boolean; type: DqDriverType } {
    const type = detectDqDriverType(applicant, templateName);
    const overrideId = overrides[applicant.id];
    if (overrideId) {
        const o = profiles.find(p => p.id === overrideId);
        if (o) return { profile: o, auto: false, type };
    }
    return { profile: pickDqProfile(type, profiles), auto: true, type };
}
