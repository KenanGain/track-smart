import { useEffect, useState } from "react";
import { PenLine, Type, Hash, Phone, Mail, Calendar, CheckSquare, User, Baseline } from "lucide-react";

// ── Document templates (DocuSign-style) ──────────────────────────────────────
// An admin uploads a PDF, then drags fields (signature, name, text, …) onto it.
// The layout is saved as a reusable template. Placement is stored as percentages
// of the page so it renders correctly at any zoom / page size.
// localStorage-backed (prototype); PDFs are held as data URLs.

export type DocFieldType =
    | "signature" | "initials" | "fullName" | "text" | "number" | "phone" | "email" | "date" | "checkbox";

// One PDF within a template (a template may bundle several documents).
// A document is either an uploaded PDF (held as a data URL) or a bundled/seeded
// PDF served as a static asset from /public (referenced by pdfUrl).
export type DocFile = {
    id: string;
    fileName: string;
    pdfDataUrl?: string;  // uploaded PDF as a data URL
    pdfUrl?: string;      // OR a served static asset path (seeded templates)
    pageCount: number;
};

export type DocField = {
    id: string;
    type: DocFieldType;
    docId: string;       // which document within the template
    page: number;        // 0-based page index within that document
    xPct: number; yPct: number;   // top-left, as % of the page
    wPct: number; hPct: number;   // size, as % of the page
    label: string;
    required: boolean;
    // When set, this field is the company's own signature already applied to the
    // document (dragged from the account's saved signature). It renders as that
    // image everywhere and is not something the driver fills in.
    stampDataUrl?: string;
};

export type DocTemplate = {
    id: string;
    name: string;
    documents: DocFile[];   // one or many PDFs
    fields: DocField[];
    updatedAt: number;
};

export const totalPages = (t: DocTemplate) => t.documents.reduce((n, d) => n + d.pageCount, 0);

// Migrate older single-PDF templates ({ pdfDataUrl, pageCount, fileName }) to the
// multi-document shape so previously-saved templates keep working.
function normalize(t: DocTemplate & { pdfDataUrl?: string; pageCount?: number; fileName?: string }): DocTemplate {
    const fields = (t.fields ?? []).map((f) => ({ ...f, docId: f.docId ?? "d0" }));
    if (Array.isArray(t.documents)) return { ...t, fields };
    const d0: DocFile = { id: "d0", fileName: t.fileName ?? "Document", pdfDataUrl: t.pdfDataUrl ?? "", pageCount: t.pageCount ?? 1 };
    return { id: t.id, name: t.name, documents: d0.pdfDataUrl ? [d0] : [], fields, updatedAt: t.updatedAt ?? 0 };
}

// ── Seeded template catalog ──────────────────────────────────────────────────
// Bundled PDFs (in /public/doc-templates) turned into ready-to-use templates so
// the Documents & sign tab ships with proper templates for every document.
// These reference the PDF by URL (served statically) rather than storing bytes,
// so they never touch the localStorage quota. A stored copy (once edited) or a
// hidden-id (once deleted) overrides the seed.
const ASSET = "/doc-templates/";
type SeedSpec = { id: string; name: string; sign?: boolean; docs: { file: string; label: string; pages?: number }[] };

const SEED_SPECS: SeedSpec[] = [
    { id: "tpl-driver-agreement", name: "Driver Agreement", docs: [{ file: "main_driver-agreement-template.pdf", label: "Driver Agreement", pages: 2 }] },
    { id: "tpl-cell-phone-policy", name: "Cell Phone Usage Policy", docs: [{ file: "Cell_Phone_Usage_Policy.pdf", label: "Cell Phone Usage Policy" }] },
    { id: "tpl-dashcam-policy", name: "Dashcam Policy", docs: [{ file: "Dashcam_Policy.pdf", label: "Dashcam Policy" }] },
    { id: "tpl-scale-inspections", name: "Scale Inspections & Tickets", docs: [{ file: "scale_Inspections_Tickets.pdf", label: "Scale Inspections & Tickets" }] },
    { id: "tpl-dq-checklist", name: "Driver's Qualification File Checklist", docs: [{ file: "01_Drivers_Qualification_File_Checklist.pdf", label: "DQ File Checklist" }] },
    { id: "tpl-driver-training-checklist", name: "Driver Training Checklist", docs: [{ file: "02_Driver_Training_Checklist.pdf", label: "Driver Training Checklist" }] },
    { id: "tpl-applicant-authorization", name: "Applicant Authorization & Company Use", docs: [{ file: "03_Applicant_Authorization_and_Company_Use.pdf", label: "Applicant Authorization" }] },
    { id: "tpl-application-employment", name: "Application for Employment", docs: [{ file: "04_Application_for_Employment.pdf", label: "Application for Employment" }] },
    { id: "tpl-accident-convictions", name: "Accident Record & Traffic Convictions", docs: [{ file: "05_Accident_Record_and_Traffic_Convictions.pdf", label: "Accident Record & Convictions" }] },
    { id: "tpl-employment-history", name: "Employment History", docs: [{ file: "06_Employment_History_Page_1.pdf", label: "Employment History — Page 1" }, { file: "07_Employment_History_Page_2.pdf", label: "Employment History — Page 2" }] },
    { id: "tpl-safety-performance-history", name: "Safety Performance History Records Request", docs: [{ file: "08_Safety_Performance_History_Records_Request_Part_1_and_2.pdf", label: "Safety Performance History — Part 1 & 2" }, { file: "09_Safety_Performance_History_Records_Request_Part_3_and_4.pdf", label: "Safety Performance History — Part 3 & 4" }] },
    { id: "tpl-driver-data-sheet", name: "Driver Data Sheet", docs: [{ file: "10_Driver_Data_Sheet.pdf", label: "Driver Data Sheet" }] },
    { id: "tpl-cert-compliance-logbook", name: "Certification of Compliance & Logbook Memo", docs: [{ file: "11_Certification_of_Compliance_and_Logbook_Memo.pdf", label: "Certification of Compliance & Logbook Memo" }] },
    { id: "tpl-load-securement-dvir", name: "Load Securement Policy & DVIR Memo", docs: [{ file: "12_Load_Securement_Policy_and_DVIR_Memo.pdf", label: "Load Securement & DVIR Memo" }] },
    { id: "tpl-eld-hos-dvir-ack", name: "ELD / HOS / DVIR Acknowledgement", docs: [{ file: "13_ELD_HOS_DVIR_Acknowledgement_and_Drivers_Manual.pdf", label: "ELD/HOS/DVIR Acknowledgement & Driver's Manual" }] },
    { id: "tpl-security-awareness", name: "Security Awareness Plan & Seal Policy", docs: [{ file: "14_Security_Awareness_Plan_Seal_Policy.pdf", label: "Security Awareness Plan & Seal Policy" }] },
    { id: "tpl-weights-dimensions", name: "Weights & Dimensions — Limits", docs: [{ file: "15_Weights_and_Dimensions_Dimension_Limits.pdf", label: "Dimension Limits" }, { file: "16_Weights_and_Dimensions_Weight_Limits.pdf", label: "Weight Limits" }] },
    { id: "tpl-cert-violations-annual", name: "Certification of Violations & Annual Review", docs: [{ file: "17_Certification_of_Violations_Annual_Review.pdf", label: "Certification of Violations & Annual Review" }] },
    { id: "tpl-hos-dvi-quiz", name: "HOS & Daily Vehicle Inspection Quiz", sign: false, docs: [{ file: "18_HOS_and_Daily_Vehicle_Inspection_Knowledge_Quiz_Page_1.pdf", label: "Quiz — Page 1" }, { file: "19_HOS_and_Daily_Vehicle_Inspection_Knowledge_Quiz_Page_2.pdf", label: "Quiz — Page 2" }, { file: "20_Daily_Vehicle_Inspection_Quiz_Page_3.pdf", label: "Quiz — Page 3" }] },
    { id: "tpl-driver-acknowledgements", name: "Driver Acknowledgements & Receipt of Items", docs: [{ file: "21_Driver_Acknowledgements_Receipt_of_Items.pdf", label: "Driver Acknowledgements & Receipt" }] },
    { id: "tpl-contractor-agreement", name: "Contractor Agreement", docs: [{ file: "22_Contractor_Agreement_Page_1.pdf", label: "Contractor Agreement — Page 1" }, { file: "23_Contractor_Agreement_Page_2.pdf", label: "Contractor Agreement — Page 2" }, { file: "24_Contractor_Agreement_Page_3.pdf", label: "Contractor Agreement — Page 3" }, { file: "25_Contractor_Agreement_Addendum_Page_4.pdf", label: "Contractor Agreement — Addendum (Page 4)" }] },
];

function buildSeed(s: SeedSpec): DocTemplate {
    const documents: DocFile[] = s.docs.map((d, i) => ({ id: `${s.id}-d${i}`, fileName: d.label, pdfUrl: ASSET + d.file, pageCount: d.pages ?? 1 }));
    const last = documents[documents.length - 1];
    const fields: DocField[] = s.sign === false ? [] : [{
        id: `${s.id}-sig`, type: "signature", docId: last.id, page: last.pageCount - 1,
        xPct: 10, yPct: 86, wPct: 30, hPct: 8, label: "Signature", required: true,
    }];
    return { id: s.id, name: s.name, documents, fields, updatedAt: 0 };
}

export const SEED_DOC_TEMPLATES: DocTemplate[] = SEED_SPECS.map(buildSeed);

// Field palette — type → label, icon, and default size (% of page).
// Sizes give real input-box proportions (not thin strips) once placed.
export const FIELD_TYPES: { type: DocFieldType; label: string; Icon: React.ElementType; w: number; h: number }[] = [
    { type: "signature", label: "Signature", Icon: PenLine, w: 26, h: 9 },
    { type: "initials", label: "Initials", Icon: Baseline, w: 12, h: 7 },
    { type: "fullName", label: "Full name", Icon: User, w: 26, h: 6 },
    { type: "text", label: "Text", Icon: Type, w: 26, h: 6 },
    { type: "number", label: "Number", Icon: Hash, w: 16, h: 6 },
    { type: "phone", label: "Phone number", Icon: Phone, w: 22, h: 6 },
    { type: "email", label: "Email", Icon: Mail, w: 26, h: 6 },
    { type: "date", label: "Date", Icon: Calendar, w: 18, h: 6 },
    { type: "checkbox", label: "Checkbox", Icon: CheckSquare, w: 5, h: 4 },
];

export const fieldMeta = (t: DocFieldType) => FIELD_TYPES.find((f) => f.type === t)!;

const KEY = "onb_doc_templates_v1";
const HIDE_KEY = "onb_doc_templates_hidden_v1";
const EVENT = "onb-doc-templates-change";

// User-created / edited templates only (localStorage).
function loadStored(): DocTemplate[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return (JSON.parse(raw) as DocTemplate[]).map(normalize);
    } catch { /* ignore */ }
    return [];
}
function loadHidden(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(HIDE_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
function persistHidden(s: Set<string>) {
    try { localStorage.setItem(HIDE_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

// Full catalog = stored templates + seeded templates (a stored copy overrides a
// seed of the same id; a deleted id is remembered so seeds stay removed).
function load(): DocTemplate[] {
    const hidden = loadHidden();
    const stored = loadStored().filter((t) => !hidden.has(t.id));
    const ids = new Set(stored.map((t) => t.id));
    const seeds = SEED_DOC_TEMPLATES.filter((t) => !ids.has(t.id) && !hidden.has(t.id));
    return [...stored, ...seeds];
}

// Returns true if the list was stored; false if the browser rejected it
// (usually the localStorage quota — large scanned PDFs held as data URLs).
function persist(list: DocTemplate[]): boolean {
    let ok = true;
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { ok = false; }
    window.dispatchEvent(new CustomEvent(EVENT));
    return ok;
}

export function useDocTemplates() {
    const [templates, setTemplates] = useState<DocTemplate[]>(load);
    useEffect(() => {
        const h = () => setTemplates(load());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);
    const save = (t: DocTemplate): boolean => {
        const cur = loadStored();
        const idx = cur.findIndex((x) => x.id === t.id);
        return persist(idx >= 0 ? cur.map((x) => (x.id === t.id ? t : x)) : [t, ...cur]);
    };
    const remove = (id: string) => {
        const hidden = loadHidden();
        hidden.add(id);
        persistHidden(hidden);
        persist(loadStored().filter((x) => x.id !== id));
    };
    return { templates, save, remove };
}

export function getDocTemplate(id: string): DocTemplate | undefined {
    const t = load().find((x) => x.id === id);
    return t ? normalize(t) : undefined;
}
