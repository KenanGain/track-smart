// Off-screen, data-driven print view of an ApplicationFormDef. Rendered by
// generateApplicationFormPdf.ts → html2canvas per .pdf-page → jsPDF. This is
// the SAME form the admin builds (fields, lists, documents, signature) — blank
// when no `values`, filled when values are supplied. Styled with inline styles
// (not Tailwind) so html2canvas rasterizes it faithfully off-screen.

import {
    chunkFieldRows, getApplicationForm, showWhenSatisfied,
    type ApplicationFormDef, type FormField, type FormDocumentUploadValue,
} from './application-forms.data';
import { resolveFormDocType, complianceFieldConfig } from './form-doc-resolver';
import type { CompanyBranding } from './company-branding.data';
import type { FieldValue } from './CustomFormWizard';

export const A4_W = 794;
export const A4_H = 1123;
const PAD_X = 48;
const CONTENT_CAPACITY = 900; // usable vertical space per page (px) after header/footer

const C = {
    ink: '#1e293b',
    sub: '#475569',
    muted: '#64748b',
    faint: '#94a3b8',
    line: '#e2e8f0',
    labelBg: '#f1f5f9',
    cardLine: '#e5e7eb',
};
const FONT = "'Inter','Helvetica Neue',Arial,sans-serif";

export type PdfVariant = 'standard' | 'compact' | 'classic';

export const PDF_TEMPLATES: { id: PdfVariant; label: string; description: string }[] = [
    { id: 'standard', label: 'Standard', description: 'Clean section cards — the default, branded layout.' },
    { id: 'compact', label: 'Compact', description: 'Denser spacing, more fields per page.' },
    { id: 'classic', label: 'Classic', description: 'FMCSA-style ruled section blocks.' },
];

export interface ApplicationFormPrintProps {
    form: ApplicationFormDef;
    branding: CompanyBranding;
    values?: Record<string, FieldValue>;
    reviewer?: string;
    reviewedDate?: Date;
    variant?: PdfVariant;
}

/** Per-variant style tokens controlling section chrome + density. */
function variantTheme(variant: PdfVariant, accent: string) {
    if (variant === 'compact') {
        return {
            sectionStyle: { marginBottom: 10, border: `1px solid ${C.cardLine}`, borderRadius: 6, overflow: 'hidden' as const },
            headerStyle: { background: '#fff', padding: '5px 10px', fontSize: 11, fontWeight: 800 as const, color: C.ink, borderBottom: `1px solid ${C.cardLine}` },
            bodyPad: 8, rowGap: 6, capacity: 960,
        };
    }
    if (variant === 'classic') {
        return {
            sectionStyle: { marginBottom: 14, border: `1px solid ${C.ink}`, borderRadius: 0, overflow: 'hidden' as const },
            headerStyle: { background: accent, padding: '6px 12px', fontSize: 12, fontWeight: 800 as const, color: '#fff', letterSpacing: 0.4 },
            bodyPad: 12, rowGap: 10, capacity: 880,
        };
    }
    return {
        sectionStyle: { marginBottom: 15, border: `1px solid ${C.cardLine}`, borderRadius: 8, overflow: 'hidden' as const, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
        headerStyle: { background: '#f8fafc', padding: '9px 14px', fontSize: 13, fontWeight: 800 as const, color: C.ink, borderBottom: `2px solid ${accent}`, letterSpacing: 0.2 },
        bodyPad: 0, rowGap: 10, capacity: 885,
    };
}

// ── Layout model ────────────────────────────────────────────────────────────

interface Row { fields: FormField[]; deps: FormField[]; }
interface Section { title?: string; intro?: string; rows: Row[]; }

const DISPLAY_TYPES = new Set<FormField['type']>(['heading', 'paragraph', 'bullet-list', 'alert']);

function isVisible(f: FormField, values: Record<string, FieldValue>): boolean {
    return showWhenSatisfied(f.showWhen, values);
}

/** Group the form's fields into sections (split on `heading`) and rows (half-width pairing). */
function buildSections(form: ApplicationFormDef, values: Record<string, FieldValue>): Section[] {
    const visible = form.fields.filter(f => isVisible(f, values));
    const depsByController = new Map<string, FormField[]>();
    for (const f of visible) {
        if (!f.showWhen) continue;
        const list = depsByController.get(f.showWhen.fieldId) ?? [];
        list.push(f);
        depsByController.set(f.showWhen.fieldId, list);
    }
    const topLevel = visible.filter(f => !f.showWhen);

    const sections: Section[] = [];
    let current: Section = { rows: [] };
    let bucket: FormField[] = [];
    const flush = () => {
        if (bucket.length) {
            const rows = chunkFieldRows(bucket, (f) => (depsByController.get(f.id)?.length ?? 0) > 0);
            for (const r of rows) current.rows.push({ fields: r, deps: r.length === 1 ? (depsByController.get(r[0].id) ?? []) : [] });
            bucket = [];
        }
    };
    for (const f of topLevel) {
        if (f.type === 'heading') {
            flush();
            if (current.title || current.rows.length) sections.push(current);
            current = { title: f.label || 'Section', intro: f.instruction || undefined, rows: [] };
        } else {
            bucket.push(f);
        }
    }
    flush();
    if (current.title || current.rows.length) sections.push(current);
    return sections;
}

// ── Height estimation (for pagination — generous to avoid clipping) ─────────

/** Height of a label/value row, accounting for text wrapping in each column
 *  (label ≈ 52 chars/line, value ≈ 58 chars/line at 10.5px). */
function scalarRowHeight(label: string, value: string): number {
    const labelLines = Math.max(1, Math.ceil(label.length / 52));
    const valueLines = Math.max(1, Math.ceil((value || '—').length / 58));
    return 14 + Math.max(labelLines, valueLines) * 15;
}
function fieldHeight(f: FormField, values: Record<string, FieldValue>): number {
    switch (f.type) {
        case 'paragraph': return 6 + Math.max(1, Math.ceil((f.instruction?.length ?? 0) / 95)) * 15;
        case 'bullet-list': return 24 + (f.options?.length ?? 0) * 16;
        case 'alert': return 14 + Math.max(1, Math.ceil((f.label?.length ?? 0) / 80)) * 15;
        case 'signature': return 96;
        case 'document': {
            const dt = resolveFormDocType(f.documentTypeId);
            const meta = [dt?.expiryRequired, dt?.issueDateRequired, dt?.issueStateRequired, dt?.issueCountryRequired].filter(Boolean).length;
            const slots = dt?.numberOfSlots && dt.numberOfSlots >= 2 ? 92 : 50;
            return 34 + slots + Math.ceil(meta / 2) * 40;
        }
        case 'compliance': {
            const { docType } = complianceFieldConfig(f.complianceKeyNumberId);
            const meta = [docType?.expiryRequired, docType?.issueDateRequired, docType?.issueStateRequired, docType?.issueCountryRequired].filter(Boolean).length;
            const slots = docType?.numberOfSlots && docType.numberOfSlots >= 2 ? 92 : 50;
            return 60 + (docType ? slots : 0) + Math.ceil(meta / 2) * 40;
        }
        case 'license-list': case 'address-list': case 'disqualification-list':
        case 'accident-list': case 'violation-list': case 'driving-experience-list':
        case 'employment-list': case 'education-list': case 'subform-button': {
            const v = values[f.id];
            const n = Array.isArray(v) ? v.length : 0;
            return 34 + Math.max(n, 1) * 58;
        }
        // text / number / date / select / radio / checklist / toggle / textarea all
        // render as a single label/value row showing the entered/selected value.
        default: return scalarRowHeight(f.label ?? '', asText(values[f.id]));
    }
}
/** Row height. `stack` (Standard variant) renders each field as its own full-width
 *  row, so a 2-field row stacks (sum); other variants keep them side by side (max). */
function rowHeight(row: Row, values: Record<string, FieldValue>, stack: boolean): number {
    const fieldHs = row.fields.map(f => fieldHeight(f, values));
    const base = stack ? fieldHs.reduce((a, b) => a + b, 0) : Math.max(...fieldHs);
    const deps = row.deps.reduce((s, d) => s + fieldHeight(d, values) + (stack ? 0 : 6), 0);
    return base + deps + (stack ? 2 : 8);
}

/** Paginate sections into pages, splitting a tall section's rows across pages. */
function paginate(sections: Section[], values: Record<string, FieldValue>, capacity: number = CONTENT_CAPACITY, stack = false): Section[][] {
    const CONTENT_CAP = capacity;
    const pages: Section[][] = [];
    let page: Section[] = [];
    let used = 0;
    const pushPage = () => { if (page.length) pages.push(page); page = []; used = 0; };

    for (const section of sections) {
        const titleH = section.title ? 40 : 8;
        let partRows: Row[] = [];
        let partUsed = titleH;
        let firstPart = true;
        const flushPart = (cont: boolean) => {
            if (!partRows.length && firstPart && !section.title) return;
            page.push({ title: section.title ? section.title + (cont ? ' (continued)' : '') : undefined, intro: firstPart ? section.intro : undefined, rows: partRows });
            used += partUsed;
            partRows = [];
            partUsed = 0;
            firstPart = false;
        };

        if (used + titleH > CONTENT_CAP) pushPage();
        used += titleH;
        partUsed = 0;

        for (const row of section.rows) {
            const h = rowHeight(row, values, stack);
            if (used + partUsed + h > CONTENT_CAP && (partRows.length || page.length)) {
                flushPart(true);
                pushPage();
                used += titleH; // repeat title room on the new page
            }
            partRows.push(row);
            partUsed += h;
        }
        flushPart(false);
        used += 16; // section card border + marginBottom
    }
    pushPage();
    return pages.length ? pages : [[]];
}

// ── Field renderers (read-only) ─────────────────────────────────────────────

function asText(v: FieldValue | undefined): string {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    if (Array.isArray(v)) return (v as unknown[]).filter(x => typeof x === 'string').join(', ');
    return String(v);
}

function LabelRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
    return (
        <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: last ? 'none' : `1px dotted ${C.cardLine}` }}>
            <div style={{ flex: '0 0 48%', background: C.labelBg, padding: '7px 12px', fontSize: 10.5, fontWeight: 700, color: C.sub }}>{label}</div>
            <div style={{ flex: 1, padding: '7px 12px', fontSize: 10.5, fontWeight: 600, color: value ? C.ink : C.faint }}>{value || '—'}</div>
        </div>
    );
}

/** Render a section's rows as a clean document: consecutive scalar fields collapse
 *  into one bordered label/value table (dotted separators); document / signature /
 *  list / compliance blocks render as their own padded blocks, preserving order. */
const SCALAR_PRINT_TYPES = new Set<FormField['type']>(['text', 'number', 'date', 'select', 'radio', 'checklist', 'toggle', 'textarea']);
function SectionBody({ rows, values }: { rows: Row[]; values: Record<string, FieldValue> }) {
    const seq: FormField[] = [];
    for (const row of rows) { for (const f of row.fields) seq.push(f); for (const d of row.deps) seq.push(d); }

    // Scalar fields render as flush label/value rows (dotted separators) directly
    // inside the section card; document / signature / list blocks get their own pad.
    return (
        <>
            {seq.map((f, i) => {
                const isScalar = SCALAR_PRINT_TYPES.has(f.type);
                const nextIsBlockOrEnd = i === seq.length - 1 || !SCALAR_PRINT_TYPES.has(seq[i + 1].type);
                if (isScalar) {
                    return <LabelRow key={f.id} label={f.label} value={asText(values[f.id])} last={nextIsBlockOrEnd} />;
                }
                return (
                    <div key={f.id} style={{ padding: '10px 14px', borderTop: i > 0 ? `1px solid ${C.line}` : 'none' }}>
                        <PrintField field={f} values={values} />
                    </div>
                );
            })}
        </>
    );
}

function DocBlock({ field, value }: { field: FormField; value?: FieldValue }) {
    const dt = resolveFormDocType(field.documentTypeId);
    const v = (value && typeof value === 'object' && 'files' in (value as object) ? value : undefined) as FormDocumentUploadValue | undefined;
    const rawFiles = v?.files ?? [];
    const files = rawFiles.filter(Boolean);
    const slotCount = dt?.numberOfSlots && dt.numberOfSlots >= 2 ? dt.numberOfSlots : 0;
    const groupCount = slotCount > 0 ? Math.max(1, Math.ceil(rawFiles.length / slotCount)) : 0;
    const slotLabel = (i: number) => dt?.slotLabels?.[i]?.trim() || (i === 0 ? 'Front' : i === 1 ? 'Back' : `Slot ${i + 1}`);
    const perSetMeta = !!dt?.allowMultiple && slotCount > 0;
    const metaFor = (src: { expiry?: string; issueDate?: string; issueState?: string; issueCountry?: string } | undefined): { label: string; val: string }[] => {
        const m: { label: string; val: string }[] = [];
        if (dt?.issueDateRequired) m.push({ label: 'Issue date', val: src?.issueDate ?? '' });
        if (dt?.expiryRequired) m.push({ label: 'Expiry date', val: src?.expiry ?? '' });
        if (dt?.issueStateRequired) m.push({ label: 'Issue state / province', val: src?.issueState ?? '' });
        if (dt?.issueCountryRequired) m.push({ label: 'Issue country', val: src?.issueCountry ?? '' });
        return m;
    };
    const globalMeta = perSetMeta ? [] : metaFor(v);

    return (
        <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>
                {field.label}{dt ? <span style={{ fontWeight: 500, color: C.faint }}> · {dt.name}</span> : null}
            </div>
            {slotCount > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Array.from({ length: groupCount }).map((_, g) => {
                        const gMeta = perSetMeta ? metaFor(v?.groups?.[g]) : [];
                        return (
                            <div key={g}>
                                {dt?.allowMultiple && <div style={{ fontSize: 9, fontWeight: 700, color: C.faint, marginBottom: 3 }}>Set {g + 1}</div>}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {Array.from({ length: slotCount }).map((_, i) => {
                                        const fname = rawFiles[g * slotCount + i];
                                        return (
                                            <div key={i} style={{ border: `1px dashed ${C.cardLine}`, borderRadius: 6, padding: '8px 10px', minHeight: 40 }}>
                                                <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{slotLabel(i)}</div>
                                                <div style={{ fontSize: 10.5, color: fname ? C.ink : C.faint, marginTop: 2 }}>{fname || 'No file uploaded'}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {gMeta.length > 0 && (
                                    <div style={{ marginTop: 4, border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden' }}>
                                        {gMeta.map(m => <LabelRow key={m.label} label={m.label} value={m.val} />)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ border: `1px dashed ${C.cardLine}`, borderRadius: 6, padding: '8px 10px', fontSize: 10.5, color: files.length ? C.ink : C.faint }}>
                    {files.length ? files.join(', ') : 'No file uploaded'}
                </div>
            )}
            {globalMeta.length > 0 && (
                <div style={{ marginTop: 6, border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden' }}>
                    {globalMeta.map(m => <LabelRow key={m.label} label={m.label} value={m.val} />)}
                </div>
            )}
            {(v?.historical?.length ?? 0) > 0 && (
                <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 }}>Previous / historical documents</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {(v?.historical ?? []).map((h, i) => {
                            const hFiles = (h.files ?? []).filter(Boolean);
                            const hMeta = metaFor(h);
                            return (
                                <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden' }}>
                                    <div style={{ background: C.labelBg, padding: '4px 10px', fontSize: 9.5, fontWeight: 700, color: C.muted }}>Previous #{i + 1}</div>
                                    <LabelRow label="Files" value={hFiles.length ? hFiles.join(', ') : 'No file uploaded'} />
                                    {hMeta.map(m => <LabelRow key={m.label} label={m.label} value={m.val} />)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Expand a list / subform field into per-entry sub-tables. Handles both the
 *  data-driven subform shape ({id,values}) and legacy flat entry objects. */
function ListBlock({ field, value }: { field: FormField; value?: FieldValue }) {
    const entries = Array.isArray(value) ? (value as unknown[]) : [];
    const sub = field.subformId ? getApplicationForm(field.subformId) : undefined;
    const subFields = sub?.fields?.filter(f => !DISPLAY_TYPES.has(f.type)) ?? [];

    return (
        <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{field.label}</div>
            {entries.length === 0 ? (
                <div style={{ border: `1px dashed ${C.cardLine}`, borderRadius: 6, padding: '8px 10px', fontSize: 10.5, color: C.faint }}>No entries</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {entries.map((entry, idx) => {
                        const ev = (entry && typeof entry === 'object' && 'values' in (entry as object))
                            ? (entry as { values: Record<string, FieldValue> }).values
                            : (entry as Record<string, FieldValue>);
                        const pairs = subFields.length
                            ? subFields.map(sf => ({ label: sf.label, val: sf.type === 'document' ? '' : asText(ev?.[sf.id]) }))
                            : Object.entries(ev ?? {}).map(([k, val]) => ({ label: k, val: asText(val as FieldValue) }));
                        return (
                            <div key={idx} style={{ border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{ background: C.labelBg, padding: '4px 10px', fontSize: 9.5, fontWeight: 700, color: C.muted }}>#{idx + 1}</div>
                                {pairs.map((p, i) => <LabelRow key={i} label={p.label} value={p.val} />)}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ComplianceBlock({ field, value }: { field: FormField; value?: FieldValue }) {
    const { keyNumber, docType } = complianceFieldConfig(field.complianceKeyNumberId);
    const raw = (value && typeof value === 'object' && !Array.isArray(value)) ? (value as unknown as Record<string, unknown>) : {};
    const entries: Record<string, unknown>[] = Array.isArray(raw.entries)
        ? (raw.entries as Record<string, unknown>[])
        : (('files' in raw || 'number' in raw) ? [raw] : [{}]);
    const list = entries.length ? entries : [{}];
    const slotCount = docType?.numberOfSlots && docType.numberOfSlots >= 2 ? docType.numberOfSlots : 0;
    const slotLabel = (i: number) => docType?.slotLabels?.[i]?.trim() || (i === 0 ? 'Front' : i === 1 ? 'Back' : `Slot ${i + 1}`);
    const flags = docType ?? (keyNumber && { issueDateRequired: keyNumber.issueDateRequired, expiryRequired: keyNumber.hasExpiry, issueStateRequired: keyNumber.issueStateRequired, issueCountryRequired: keyNumber.issueCountryRequired });

    const entryNode = (entry: Record<string, unknown>, idx: number) => {
        const number = typeof entry.number === 'string' ? entry.number : '';
        const rawFiles = Array.isArray((entry as { files?: unknown }).files) ? ((entry as { files: string[] }).files) : [];
        const meta: { label: string; val: string }[] = [];
        if (flags?.issueDateRequired)    meta.push({ label: 'Issue date',             val: (entry.issueDate as string) ?? '' });
        if (flags?.expiryRequired)       meta.push({ label: 'Expiry date',            val: (entry.expiry as string) ?? '' });
        if (flags?.issueStateRequired)   meta.push({ label: 'Issue state / province', val: (entry.issueState as string) ?? '' });
        if (flags?.issueCountryRequired) meta.push({ label: 'Issue country',          val: (entry.issueCountry as string) ?? '' });
        return (
            <div key={idx} style={{ marginBottom: 8 }}>
                {list.length > 1 && <div style={{ fontSize: 9, fontWeight: 700, color: C.faint, marginBottom: 3 }}>{keyNumber?.name || field.label} #{idx + 1}</div>}
                <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden', marginBottom: docType || meta.length ? 6 : 0 }}>
                    <LabelRow label="Number" value={number} />
                </div>
                {docType && (slotCount > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {Array.from({ length: slotCount }).map((_, i) => (
                            <div key={i} style={{ border: `1px dashed ${C.cardLine}`, borderRadius: 6, padding: '8px 10px', minHeight: 40 }}>
                                <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: 'uppercase' }}>{slotLabel(i)}</div>
                                <div style={{ fontSize: 10.5, color: rawFiles[i] ? C.ink : C.faint, marginTop: 2 }}>{rawFiles[i] || 'No file uploaded'}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ border: `1px dashed ${C.cardLine}`, borderRadius: 6, padding: '8px 10px', fontSize: 10.5, color: rawFiles.length ? C.ink : C.faint }}>
                        {rawFiles.length ? rawFiles.join(', ') : 'No file uploaded'}
                    </div>
                ))}
                {meta.length > 0 && (
                    <div style={{ marginTop: 6, border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden' }}>
                        {meta.map(m => <LabelRow key={m.label} label={m.label} value={m.val} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>{keyNumber?.name || field.label}</div>
            {list.map(entryNode)}
        </div>
    );
}

function PrintField({ field, values }: { field: FormField; values: Record<string, FieldValue> }) {
    const value = values[field.id];
    switch (field.type) {
        case 'paragraph':
            return <p style={{ fontSize: 10.5, color: C.sub, whiteSpace: 'pre-line', margin: 0 }}>{field.instruction}</p>;
        case 'alert':
            return <div style={{ fontSize: 10.5, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px' }}>{field.label}</div>;
        case 'bullet-list':
            return (
                <div>
                    {field.label && <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{field.label}</div>}
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 10.5, color: C.sub }}>
                        {(field.options ?? []).map((o, i) => <li key={i} style={{ marginBottom: 2 }}>{o}</li>)}
                    </ul>
                </div>
            );
        case 'signature': {
            const sig = typeof value === 'string' ? value : '';
            return (
                <div>
                    {sig
                        ? <img src={sig} alt="signature" style={{ height: 70, maxWidth: 280, objectFit: 'contain', border: `1px solid ${C.line}`, borderRadius: 4, background: '#fff' }} />
                        : <div style={{ height: 70, borderBottom: `1px solid ${C.ink}`, width: 280 }} />}
                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4 }}>{field.label || 'Signature'}</div>
                </div>
            );
        }
        case 'document':
            return <DocBlock field={field} value={value} />;
        case 'compliance':
            return <ComplianceBlock field={field} value={value} />;
        case 'license-list': case 'address-list': case 'disqualification-list':
        case 'accident-list': case 'violation-list': case 'driving-experience-list':
        case 'employment-list': case 'education-list': case 'subform-button':
            return <ListBlock field={field} value={value} />;
        default:
            return <div style={{ border: `1px solid ${C.line}`, borderRadius: 6, overflow: 'hidden' }}><LabelRow label={field.label} value={asText(value)} /></div>;
    }
}

function RowView({ row, values, gap = 10 }: { row: Row; values: Record<string, FieldValue>; gap?: number }) {
    return (
        <div style={{ marginBottom: gap }}>
            {row.fields.length === 2 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {row.fields.map(f => <div key={f.id}><PrintField field={f} values={values} /></div>)}
                </div>
            ) : (
                <PrintField field={row.fields[0]} values={values} />
            )}
            {row.deps.length > 0 && (
                <div style={{ marginTop: 8, borderLeft: `2px solid ${C.line}`, paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {row.deps.map(d => <PrintField key={d.id} field={d} values={values} />)}
                </div>
            )}
        </div>
    );
}

// ── Page chrome ─────────────────────────────────────────────────────────────

function PageHeader({ branding, title }: { branding: CompanyBranding; title: string }) {
    const accent = branding.accentColor;
    return (
        <div style={{ marginBottom: 18 }}>
            {/* Letterhead: logo + company (left), contact block (right) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {branding.logoDataUrl
                        ? <img src={branding.logoDataUrl} alt="" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
                        : <div style={{ width: 40, height: 40, borderRadius: 8, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18 }}>{(branding.name || 'C').slice(0, 1).toUpperCase()}</div>}
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: 0.2 }}>{branding.name}</div>
                        {branding.tagline && <div style={{ fontSize: 9, color: C.muted, marginTop: 1, fontStyle: 'italic' }}>{branding.tagline}</div>}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 8.5, color: C.muted, lineHeight: 1.6 }}>
                    {branding.address && <div>{branding.address}</div>}
                    {branding.phone && <div>{branding.phone}</div>}
                    {branding.email && <div>{branding.email}</div>}
                </div>
            </div>
            {/* Accent rule */}
            <div style={{ height: 3, background: accent, borderRadius: 2 }} />
            {/* Document title band */}
            <div style={{ marginTop: 11, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: 0.2 }}>{title}</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.8 }}>Driver Qualification File</div>
            </div>
        </div>
    );
}

function PageFooter({ branding, page, total, reviewer, reviewedDate }: {
    branding: CompanyBranding; page: number; total: number; reviewer?: string; reviewedDate?: Date;
}) {
    const dateStr = (reviewedDate ?? undefined)?.toLocaleDateString('en-US', { dateStyle: 'long' as const });
    return (
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${C.line}` }}>
            {reviewer && (
                <div style={{ fontSize: 9, fontWeight: 700, color: C.sub, marginBottom: 4 }}>
                    This information has been reviewed{dateStr ? ` as of ${dateStr}` : ''} by {reviewer}.
                </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5, color: C.faint }}>
                <span>{branding.address || branding.name}</span>
                <span>{[branding.phone, branding.email].filter(Boolean).join('  ·  ') || branding.name}</span>
                <span>Page {page} of {total}</span>
            </div>
        </div>
    );
}

// ── Root print component ────────────────────────────────────────────────────

export function ApplicationFormPrint({ form, branding, values = {}, reviewer, reviewedDate, variant = 'standard' }: ApplicationFormPrintProps) {
    const theme = variantTheme(variant, branding.accentColor);
    const sections = buildSections(form, values);
    const pages = paginate(sections, values, theme.capacity, variant === 'standard');
    const total = pages.length;
    const title = form.displayTitle || form.name || 'Driver Application';

    return (
        <div style={{ fontFamily: FONT, fontSize: 10.5, lineHeight: 1.4, color: C.ink, WebkitFontSmoothing: 'antialiased', textRendering: 'geometricPrecision' as const }}>
            {pages.map((pageSections, pi) => (
                <div
                    key={pi}
                    className="pdf-page"
                    style={{
                        width: A4_W, height: A4_H, background: '#fff', color: C.ink,
                        boxSizing: 'border-box', padding: `34px ${PAD_X}px 28px`,
                        display: 'flex', flexDirection: 'column', position: 'relative',
                        pageBreakAfter: 'always', breakAfter: 'page',
                    }}
                >
                    <PageHeader branding={branding} title={title} />

                    {pi === 0 && form.introText && (
                        <div style={{ marginBottom: 14, marginTop: -6 }}>
                            <div style={{ fontSize: 10, color: C.muted, whiteSpace: 'pre-line' }}>{form.introText}</div>
                        </div>
                    )}

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        {pageSections.map((section, si) => (
                            <div key={si} style={theme.sectionStyle}>
                                {section.title && <div style={theme.headerStyle}>{section.title}</div>}
                                <div style={{ padding: theme.bodyPad }}>
                                    {section.intro && (
                                        <p style={{ fontSize: 10, color: C.muted, margin: 0, padding: variant === 'standard' ? '9px 14px 4px' : '0 0 8px', whiteSpace: 'pre-line', lineHeight: 1.5 }}>{section.intro}</p>
                                    )}
                                    {variant === 'standard'
                                        ? <SectionBody rows={section.rows} values={values} />
                                        : section.rows.map((row, ri) => <RowView key={ri} row={row} values={values} gap={theme.rowGap} />)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <PageFooter branding={branding} page={pi + 1} total={total} reviewer={reviewer} reviewedDate={reviewedDate} />
                </div>
            ))}
        </div>
    );
}
