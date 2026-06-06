// Unified Document + Compliance requirement model.
//
// "Document" and "Compliance (key number)" are ONE thing across the whole app:
// every requirement a driver must fulfil — a document upload or a key-number +
// its document — is a `Requirement`. One resolver builds the full set for a
// driver from their application forms, and merges the fulfilment state stored on
// the HiringApplication so Application Tracking / Hiring ATS / DQ Files all agree.

import type { Applicant } from "./ats.data";
import type { HiringApplication } from "./hiring-application.data";
import type { ApplicationFormDef } from "./application-forms.data";
import type { TemplateStep } from "@/pages/settings/driver-hiring-templates.data";

export type RequirementKind = 'document' | 'compliance';
export type RequirementStatus = 'missing' | 'uploaded' | 'verified' | 'ordered' | 'skipped';

export interface RequirementMeta {
    number?: string;
    issue?: string;
    expiry?: string;
    state?: string;
    country?: string;
}

export interface RequirementFile {
    name: string;
    uploadedAt: string;
}

export interface Requirement {
    id: string;
    kind: RequirementKind;
    label: string;
    /** Compliance key-number name (for kind === 'compliance'). */
    keynumber?: string;
    meta: RequirementMeta;
    files: RequirementFile[];
    status: RequirementStatus;
    required: boolean;
    /** Form / source the requirement came from. */
    source: string;
}

/** Persisted per-requirement fulfilment state (lives on HiringApplication.requirements_v2). */
export interface RequirementState {
    status?: RequirementStatus;
    files?: RequirementFile[];
    meta?: RequirementMeta;
}

function filesFromDocValue(v: unknown): RequirementFile[] {
    if (!v || typeof v !== 'object') return [];
    const files = (v as { files?: unknown }).files;
    if (!Array.isArray(files)) return [];
    return files.map((f, i) => {
        if (f && typeof f === 'object' && 'name' in f) return { name: String((f as { name: unknown }).name), uploadedAt: '' };
        return { name: `File ${i + 1}`, uploadedAt: '' };
    });
}

function deriveStatus(r: Pick<Requirement, 'files' | 'meta'>): RequirementStatus {
    if (r.files.length > 0 || (r.meta.number && r.meta.number !== '—')) return 'uploaded';
    return 'missing';
}

/**
 * Build the full, deduped requirement set for a driver — documents + compliance
 * key-numbers pulled from the application's form fields, then merged with the
 * fulfilment state stored on the application.
 */
export function buildRequirements(
    applicant: Applicant,
    app: HiringApplication | undefined,
    steps: TemplateStep[],
    formById: Map<string, ApplicationFormDef>,
): Requirement[] {
    void applicant;
    const out: Requirement[] = [];
    const seen = new Set<string>();
    const state = app?.requirements_v2 ?? {};

    for (const step of steps) {
        if (step.kind === 'consent') continue;
        const form = formById.get(step.formId);
        const values = (app?.steps[step.id]?.values ?? {}) as Record<string, unknown>;
        for (const f of form?.fields ?? []) {
            if (f.type === 'document') {
                const id = `doc:${f.id}`;
                if (seen.has(id)) continue;
                seen.add(id);
                out.push({
                    id, kind: 'document', label: f.label, meta: {},
                    files: filesFromDocValue(values[f.id]),
                    status: 'missing', required: !!f.required, source: form?.displayTitle || form?.name || step.label || 'Form',
                });
            } else if (f.type === 'compliance') {
                const id = `kn:${f.id}`;
                if (seen.has(id)) continue;
                seen.add(id);
                const v = values[f.id] as { entries?: Array<Record<string, unknown>> } | Record<string, unknown> | undefined;
                const entry = (v && 'entries' in v && Array.isArray(v.entries) ? v.entries[0] : v) as Record<string, unknown> | undefined;
                const meta: RequirementMeta = {
                    number: entry?.number != null && entry.number !== '' ? String(entry.number) : undefined,
                    issue: entry?.issue ? String(entry.issue) : undefined,
                    expiry: entry?.expiry ? String(entry.expiry) : undefined,
                    state: entry?.state ? String(entry.state) : undefined,
                    country: entry?.country ? String(entry.country) : undefined,
                };
                out.push({
                    id, kind: 'compliance', label: f.label, keynumber: f.label, meta,
                    files: Array.isArray(entry?.files) ? entry!.files.map((_, i) => ({ name: `File ${i + 1}`, uploadedAt: '' })) : [],
                    status: 'missing', required: !!f.required, source: form?.displayTitle || form?.name || step.label || 'Form',
                });
            }
        }
    }

    // Merge persisted fulfilment state (uploads / orders / verify / extra meta).
    return out.map(r => {
        const st = state[r.id];
        const files = st?.files ?? r.files;
        const meta = { ...r.meta, ...(st?.meta ?? {}) };
        const status = st?.status ?? deriveStatus({ files, meta });
        return { ...r, files, meta, status };
    });
}

export interface RequirementSummary { total: number; fulfilled: number; missing: number; pct: number }
export function requirementSummary(reqs: Requirement[]): RequirementSummary {
    const active = reqs.filter(r => r.status !== 'skipped');
    const total = active.length;
    const fulfilled = active.filter(r => r.status === 'uploaded' || r.status === 'verified').length;
    const missing = active.filter(r => r.status === 'missing' || r.status === 'ordered').length;
    return { total, fulfilled, missing, pct: total ? Math.round((fulfilled / total) * 100) : 0 };
}
