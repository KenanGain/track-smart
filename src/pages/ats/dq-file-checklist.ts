// Driver Qualification (DQ) File checklist.
//
// Once a driver's application is complete, the DQ file must hold a fixed set of
// documents / records. This is the canonical checklist; the Hiring (ATS) detail
// resolves each item to present / missing / n-a from the driver's actual
// application data + uploaded documents, so it's a live "do we have it?" view.

import type { Applicant } from "./ats.data";
import type { HiringApplication } from "./hiring-application.data";
import type { ApplicationFormDef } from "./application-forms.data";
import type { TemplateStep } from "@/pages/settings/driver-hiring-templates.data";
import { CONSENT_BY_ID } from "./consent-forms.data";

/** 'skipped' = manager explicitly excluded item (excluded from required count, like na). */
export type DqStatus = 'present' | 'missing' | 'na' | 'skipped';

export interface DqChecklistItem {
    /** Stable id (used by the checklist builder). */
    id?: string;
    label: string;
    /** Lowercased substrings — if any appears in the gathered evidence, the item is present. */
    keywords: string[];
    /** "if applicable" rows — shown as N/A (not Missing) when there's no evidence. */
    conditional?: boolean;
}

export interface DqChecklistSection {
    id?: string;
    title: string;
    items: DqChecklistItem[];
}

export const DQ_FILE_CHECKLIST: DqChecklistSection[] = [
    {
        title: 'Monthly Audit Report',
        items: [
            { label: 'Logbook audit violations report', keywords: ['logbook', 'log audit', 'hours of service', 'hos'] },
            { label: 'Any interventions and roadside events', keywords: ['roadside', 'intervention', 'inspection'] },
            { label: 'Safety-related violations', keywords: ['safety', 'violation'] },
        ],
    },
    {
        title: 'DQ File',
        items: [
            { label: 'Application', keywords: ['application', 'applicant information'] },
            { label: 'CVDR', keywords: ['cvdr', 'cvor', 'driver abstract', 'driving record'] },
            { label: 'MVR', keywords: ['mvr', 'motor vehicle record'] },
            { label: 'Passport', keywords: ['passport'] },
            { label: "Driver's License", keywords: ['license', 'licence', 'cdl', 'driver license', 'driving licence'] },
            { label: 'PCC', keywords: ['pcc', 'police clearance', 'criminal', 'background'] },
            { label: 'PSP', keywords: ['psp'] },
            { label: 'Work Permit', keywords: ['work permit'], conditional: true },
            { label: 'US Visa', keywords: ['visa'], conditional: true },
            { label: 'Orientation training certificates', keywords: ['orientation'] },
            { label: 'Road test', keywords: ['road test'] },
            { label: 'PR Card', keywords: ['pr card', 'permanent resident'], conditional: true },
            { label: 'Hazmat card', keywords: ['hazmat'] },
            { label: 'FAST Card', keywords: ['fast card', 'fast'], conditional: true },
        ],
    },
    {
        title: 'Trainings',
        items: [
            { label: 'Proactive training certificates', keywords: ['proactive'] },
            { label: 'Reactive training certificates', keywords: ['reactive'] },
            { label: 'Orientation training certificates', keywords: ['orientation'] },
        ],
    },
    {
        title: 'Inspections and Tickets',
        items: [
            { label: 'Warning Letters', keywords: ['warning'] },
            { label: 'Annual Review', keywords: ['annual review', 'annual'] },
        ],
    },
];

/** Resolve a single checklist item against the gathered (lowercased) evidence strings. */
export function dqItemStatus(item: DqChecklistItem, evidence: string[]): DqStatus {
    const hit = item.keywords.some(k => evidence.some(e => e.includes(k)));
    if (hit) return 'present';
    return item.conditional ? 'na' : 'missing';
}

/** Roll up: present + missing counts. 'na' and 'skipped' are excluded from "required". */
export function dqSummary(sections: { items: { status: DqStatus }[] }[]): { present: number; missing: number; required: number } {
    let present = 0, missing = 0;
    for (const s of sections) {
        for (const it of s.items) {
            if (it.status === 'present') present++;
            else if (it.status === 'missing') missing++;
            // 'na' and 'skipped' excluded
        }
    }
    return { present, missing, required: present + missing };
}

export interface DqResolvedItem { item: DqChecklistItem; status: DqStatus }
export interface DqResolvedSection { title: string; items: DqResolvedItem[] }
export interface DqFileResult { sections: DqResolvedSection[]; rollup: { present: number; missing: number; required: number }; pct: number }

/** Gather lowercased "evidence" strings from a driver's documents, pipeline, and submitted application. */
function gatherEvidence(
    applicant: Applicant,
    app: HiringApplication | undefined,
    steps: TemplateStep[],
    formById: Map<string, ApplicationFormDef>,
): string[] {
    const ev: string[] = [];
    const push = (...xs: (string | undefined)[]) => { for (const x of xs) if (x) ev.push(x); };
    for (const d of applicant.documents) push(d.label, d.category);
    for (const s of applicant.steps) if (s.status === 'completed' || s.status === 'needs_review') push(s.label, ...s.lines);
    if (app) {
        for (const step of steps) {
            const st = app.steps[step.id];
            if (!st) continue;
            const done = st.status === 'submitted' || st.status === 'approved' || !!st.signature;
            if (!done) continue;
            if (step.kind === 'consent') {
                push(CONSENT_BY_ID[step.formId as keyof typeof CONSENT_BY_ID]?.title, step.label);
            } else {
                const f = formById.get(step.formId);
                push(f?.name, f?.displayTitle, step.label);
                for (const field of f?.fields ?? []) {
                    if (field.type === 'document' || field.type === 'compliance') push(field.label);
                }
            }
        }
    }
    return ev.map(s => s.toLowerCase());
}

/** Resolve the full DQ file for a driver against a checklist profile (defaults to the
 *  standard checklist). The single source of truth for the tab AND the roster.
 *  itemOverrides keys are `${sectionTitle}::${itemLabel}` — override wins over evidence. */
export function computeDqFile(
    applicant: Applicant,
    app: HiringApplication | undefined,
    steps: TemplateStep[],
    formById: Map<string, ApplicationFormDef>,
    checklist: DqChecklistSection[] = DQ_FILE_CHECKLIST,
    itemOverrides?: Record<string, { status: 'present' | 'skipped' }>,
): DqFileResult {
    const evidence = gatherEvidence(applicant, app, steps, formById);
    const sections: DqResolvedSection[] = checklist.map(s => ({
        title: s.title,
        items: s.items.map(it => {
            const overrideKey = `${s.title}::${it.label}`;
            const ov = itemOverrides?.[overrideKey];
            const status: DqStatus = ov
                ? (ov.status === 'skipped' ? 'skipped' : 'present')
                : dqItemStatus(it, evidence);
            return { item: it, status };
        }),
    }));
    const rollup = dqSummary(sections);
    const pct = rollup.required ? Math.round((rollup.present / rollup.required) * 100) : 0;
    return { sections, rollup, pct };
}
