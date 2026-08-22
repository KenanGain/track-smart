import { useEffect, useState } from 'react';

/**
 * Reusable document-tag catalog for the "New Compliance & Documents" feature.
 *
 * A single flat list of tags, persisted to localStorage, that:
 *   • powers the "Add a saved tag…" dropdown on every document / version in SafetyCatalogView, and
 *   • is managed (add / remove / view) from Settings ▸ Tags (SafetyTagsPage).
 *
 * Kept intentionally SEPARATE from the Docu/Form tag-section store
 * (docu-form/document-tags.data.ts) — this is scoped to the safety-software catalog only.
 */

const STORAGE_KEY = 'safety-doc-tags-v4';
const EVENT = 'safety-doc-tags-change';

/**
 * Default tag catalog, grouped by section (imported from the Document Tags page).
 * Group titles are searchable — searching a title surfaces all of that section's tags.
 * Default tags are protected: they cannot be deleted, only added to.
 */
export const DEFAULT_TAG_GROUPS: { title: string; tags: string[] }[] = [
    { title: 'Status & Handling', tags: ['Verified', 'Primary', 'Original', 'Copy', 'Certified', 'Signed', 'Notarized', 'Renewed', 'Superseded', 'Pending Review', 'Expired'] },
    { title: 'Accident & Damage', tags: ['Vehicle damaged', 'Other vehicle damage', 'Trailer damage', 'Cargo damage', 'Cargo spill picture', 'Vehicle - Front', 'Vehicle - Rear', 'Vehicle - Left', 'Vehicle - Right'] },
    { title: 'Insurance', tags: ['Cargo Insurance', 'Liability Insurance', 'Physical Damage Insurance', 'Auto Liability', 'General Liability', 'Workers Compensation', 'Umbrella / Excess', 'Non-Trucking Liability', 'Bobtail Insurance', 'Trailer Interchange'] },
    { title: 'Policies and Procedures', tags: ['Contract Agreements', 'Driver Manuals', 'Drug and Alcohol Policy', 'Preventive Maintenance Policy', 'Vehicle Maintenance Policy', 'General Health and Safety Policy', 'Hazard Prevention Program / Policy', 'Hours of Service Policy', 'ELD Policy', 'Cargo Securement Policy', 'Accident Procedure', 'Anti-Harassment Policy', 'Workplace Violence Policy'] },
    { title: 'Document Year', tags: ['Year'] },
    { title: 'Quarter', tags: ['Q1', 'Q2', 'Q3', 'Q4'] },
    { title: 'CVOR Level', tags: ['CVOR Level 1', 'CVOR Level 2', 'CVOR Level 3'] },
    { title: 'Compliance & Safety', tags: ['DOT Compliance', 'FMCSA Filing', 'CSA Score', 'Safety Audit', 'Hours of Service', 'Vehicle Inspection', 'Drug & Alcohol Testing', 'FMCSA Clearinghouse'] },
    { title: 'Driver Qualification', tags: ['Medical Certificate', 'Motor Vehicle Record (MVR)', 'PSP Report', 'Background Check', 'Road Test', 'Employment Verification', 'Training Certificate', "Driver's License / CDL"] },
    { title: 'Permits & Authority', tags: ['USDOT Number', 'MC Authority', 'IFTA License', 'IRP Registration', 'UCR Registration', 'Hazmat Permit', 'Oversize / Overweight Permit', 'Fuel / Trip Permit'] },
    { title: 'Tax & Financial', tags: ['Invoice', 'Receipt', 'Tax Return', 'W-9 / W-2', '1099', 'IFTA Filing', 'Settlement Statement', 'Fuel Tax'] },
];

export const DEFAULT_SAFETY_TAGS = DEFAULT_TAG_GROUPS.flatMap(g => g.tags);

/** Lower-cased tag → its default group title (drives group-title search + default protection). */
const TAG_GROUP_OF = new Map<string, string>();
for (const g of DEFAULT_TAG_GROUPS) for (const t of g.tags) TAG_GROUP_OF.set(t.toLowerCase(), g.title);

/** Default (seeded) tags are protected — they cannot be deleted from the catalog. */
export function isDefaultTag(tag: string): boolean {
    return TAG_GROUP_OF.has(tag.trim().toLowerCase());
}

/** The default group/section title a tag belongs to (undefined for custom tags). */
export function groupTitleOf(tag: string): string | undefined {
    return TAG_GROUP_OF.get(tag.trim().toLowerCase());
}

/** Maximum tags allowed on a single document / version. */
export const MAX_DOC_TAGS = 5;

// ── Tag colours ───────────────────────────────────────────────────────
// Deterministic palette so a given tag always renders in the same colour.
const TAG_COLORS = [
    'border-blue-200 bg-blue-50 text-blue-700',
    'border-emerald-200 bg-emerald-50 text-emerald-700',
    'border-amber-200 bg-amber-50 text-amber-700',
    'border-violet-200 bg-violet-50 text-violet-700',
    'border-rose-200 bg-rose-50 text-rose-700',
    'border-cyan-200 bg-cyan-50 text-cyan-700',
    'border-indigo-200 bg-indigo-50 text-indigo-700',
    'border-teal-200 bg-teal-50 text-teal-700',
    'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    'border-orange-200 bg-orange-50 text-orange-700',
];

export function tagColor(name: string): string {
    let h = 0;
    for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return TAG_COLORS[h % TAG_COLORS.length];
}

// ── Smart search ──────────────────────────────────────────────────────
// Related-term groups: a query matches a tag when both touch the same group,
// so searching "permit" surfaces "Authority", "License", "Registration", etc.
const TAG_SYNONYM_GROUPS: string[][] = [
    ['permit', 'authority', 'operating authority', 'license', 'cdl', 'registration', 'mc', 'usdot', 'dot', 'scac', 'cvor', 'irp', 'ucr', 'hazmat', 'oversize', 'overweight', 'trip'],
    ['driver qualification', 'dq', 'driver', 'qualification', 'medical', 'medical card', 'medical certificate', 'mvr', 'motor vehicle record', 'abstract', 'psp', 'cdl', 'road test', 'background check', 'employment verification', 'training'],
    ['insurance', 'coverage', 'liability', 'cargo', 'auto liability', 'general liability', 'workers compensation', 'umbrella', 'excess', 'bobtail', 'non-trucking', 'trailer interchange', 'physical damage', 'pink slip', 'mcs-90', 'certificate of insurance'],
    ['tax', 'financial', 'ifta', 'fuel tax', 'invoice', 'receipt', 'tax return', 'w-9', 'w-2', '1099', 'settlement', 'weight distance', 'hut', 'kyu', 'oregon', 'fein'],
    ['bond', 'surety', 'customs', 'boc-3', 'carrier code'],
    ['policy', 'procedure', 'manual', 'drug and alcohol', 'maintenance', 'health and safety', 'hazard', 'hours of service', 'eld', 'cargo securement', 'accident', 'anti-harassment', 'workplace violence'],
    ['compliance', 'safety', 'dot compliance', 'fmcsa', 'csa', 'safety audit', 'inspection', 'clearinghouse', 'drug'],
    ['expiry', 'expiration', 'renewal', 'renewed', 'expired', 'due', 'superseded'],
    ['verified', 'approved', 'confirmed', 'validated', 'certified', 'notarized', 'signed'],
    ['original', 'copy', 'duplicate', 'scan', 'primary'],
];

/** True when `tag` should appear for the given search `query` — direct match OR related term. */
export function smartTagMatch(query: string, tag: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const t = tag.toLowerCase();
    if (t.includes(q) || q.includes(t)) return true;
    // Group-title search: querying a section title surfaces every tag in that section.
    const groupTitle = TAG_GROUP_OF.get(t);
    if (groupTitle && (groupTitle.toLowerCase().includes(q) || q.includes(groupTitle.toLowerCase()))) return true;
    for (const group of TAG_SYNONYM_GROUPS) {
        const qIn = group.some(g => g.includes(q) || q.includes(g));
        const tIn = group.some(g => t.includes(g) || g.includes(t));
        if (qIn && tIn) return true;
    }
    return false;
}

function read(): string[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [...DEFAULT_SAFETY_TAGS];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch {
        /* fall through to defaults */
    }
    return [...DEFAULT_SAFETY_TAGS];
}

function write(tags: string[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
    window.dispatchEvent(new CustomEvent(EVENT));
}

export function loadSafetyTags(): string[] {
    return read();
}

/** Add a tag (case-insensitive de-dupe). No-op for blanks / existing tags. */
export function addSafetyTag(tag: string): void {
    const t = tag.trim();
    if (!t) return;
    const cur = read();
    if (cur.some(x => x.toLowerCase() === t.toLowerCase())) return;
    write([...cur, t]);
}

export function removeSafetyTag(tag: string): void {
    if (isDefaultTag(tag)) return; // default tags are protected — cannot be deleted
    write(read().filter(x => x !== tag));
}

/** Live-subscribing hook — reflects add/remove from anywhere (this tab or another). */
export function useSafetyTags() {
    const [tags, setTags] = useState<string[]>(() => read());
    useEffect(() => {
        const refresh = () => setTags(read());
        window.addEventListener(EVENT, refresh);
        window.addEventListener('storage', refresh);
        return () => {
            window.removeEventListener(EVENT, refresh);
            window.removeEventListener('storage', refresh);
        };
    }, []);
    return { tags, add: addSafetyTag, remove: removeSafetyTag };
}
