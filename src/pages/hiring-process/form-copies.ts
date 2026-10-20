import { useMemo } from "react";
import {
    newVersion, readComplianceEntry, writeComplianceVersion, patchComplianceVersion, useComplianceData,
    type DocVersion, type FilledForm, type RecordDataEntry,
} from "@/pages/compliance/compliance-data-store";
import { copySource, filedFormVersion, formRecordIdFor, inventoryFormDef, type CopySource } from "@/pages/inventory/inventory-forms";
import type { PolicyFormDef } from "./policy-forms.data";

// ─────────────────────────────────────────────────────────────────────────────
// form-copies — a form on a person's file, as the copies of it actually on file.
//
// The hiring file kept a Received flag per consent, the onboarding file kept a list of
// ids that had been "marked signed", and the driver's profile kept real copies — filled
// in the app or uploaded as a scan — as versions on a compliance record. Three answers
// to "has this driver signed the FCRA disclosure?", and only the last one could show you
// the signature.
//
// So the copies ARE the answer, everywhere. A consent signed during hiring is filed
// under the applicant; the profile reads the applicant's copies alongside the driver's
// own (see `linkedSubjectIds`); and the status every list shows is derived from what is
// on file rather than from a tick somebody remembered to set.
//
// Record ids are the DQ file's — `consent:<id>` / `onbform:<id>` for the form catalogs,
// `doctpl:<id>` for a PDF signing template — so a copy filed from any screen lands on the
// record the driver's Forms tab opens.
// ─────────────────────────────────────────────────────────────────────────────

export { formRecordIdFor };
export const docTemplateRecordId = (templateId: string) => `doctpl:${templateId}`;

/** One copy on the record, as every card and list shows it. */
export interface FormCopy {
    id: string;
    /** YYYY-MM-DD when known. */
    at: string;
    by: string;
    /** How it got here: completed in the app, uploaded as a scan, or recorded by hand. */
    source: CopySource;
    label: string;
    fileName?: string;
    /** The uploaded file itself, where one was actually attached. */
    fileUrl?: string;
    /** The answers, when they were kept — what makes this copy openable as the form. */
    filled?: FilledForm;
    verified?: { by: string; at: string; note?: string };
}

export type FormCopyStatus = "pending" | "requested" | "received" | "verified";

// The same colours the hiring file's DOC_STATUS_META uses, so a status reads the same
// whether the row is in a hiring file, an onboarding file or the driver's own tab.
export const FORM_STATUS_META: Record<FormCopyStatus, { label: string; badge: string; dot: string }> = {
    pending:   { label: "Pending",   badge: "bg-slate-100 text-slate-500",       dot: "bg-slate-300" },
    requested: { label: "Requested", badge: "bg-amber-100 text-amber-700",       dot: "bg-amber-500" },
    received:  { label: "Received",  badge: "bg-blue-100 text-blue-700",         dot: "bg-blue-500" },
    verified:  { label: "Verified",  badge: "bg-emerald-100 text-emerald-700",   dot: "bg-emerald-500" },
};

export const SOURCE_LABEL: Record<CopySource, string> = {
    system: "Filled in system",
    upload: "Uploaded copy",
    recorded: "Recorded",
};

const copyOf = (v: DocVersion): FormCopy => ({
    id: v.id,
    at: v.issueDate || v.uploadedAt?.slice(0, 10) || "",
    by: v.uploadedBy || "",
    source: copySource(v),
    label: v.label,
    fileName: v.files[0]?.name,
    fileUrl: v.files[0]?.url,
    filled: v.formData,
    verified: v.verified,
});

/** Every copy in an entry, newest first (the store already keeps them that way). */
export const copiesOf = (entry: RecordDataEntry): FormCopy[] => (entry.versions ?? []).map(copyOf);

/**
 * Pending → Requested → Received → Verified.
 *
 * Received means a copy is on file, whoever put it there; Verified means a reviewer has
 * looked at the newest one. Requested is the file's own interim state — asked for, not yet
 * back — and only matters while nothing is on file.
 */
export function formCopyStatus(copies: FormCopy[], requested?: boolean): FormCopyStatus {
    if (copies.length === 0) return requested ? "requested" : "pending";
    return copies[0].verified ? "verified" : "received";
}

/**
 * The copies of one form across every subject that is this person.
 *
 * Newest first across all of them, because to the reviewer it is one person's file — the
 * consent they signed as applicant a3 and the one they re-signed as driver DRV-0010 are
 * two copies of the same form, not two records.
 */
export function useFormCopies(accountId: string | undefined, subjectIds: string[], recordId: string): FormCopy[] {
    const { getEntry, all } = useComplianceData(accountId);
    // `all` is the store snapshot — the dep that makes this re-read after a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => mergeNewestFirst(subjectIds.map((s) => copiesOf(getEntry(s, recordId)))), [all, subjectIds.join("|"), recordId]);
}

/**
 * Several forms at once, keyed by record id — one store subscription for a whole step
 * table rather than a hook per row.
 */
export function useFormCopiesMap(accountId: string | undefined, subjectIds: string[], recordIds: string[]): Record<string, FormCopy[]> {
    const { getEntry, all } = useComplianceData(accountId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => Object.fromEntries(recordIds.map((rid) => [rid, mergeNewestFirst(subjectIds.map((s) => copiesOf(getEntry(s, rid))))])), [all, subjectIds.join("|"), recordIds.join("|")]);
}

/** Same, outside a component. */
export function readFormCopies(accountId: string | undefined, subjectIds: string[], recordId: string): FormCopy[] {
    return mergeNewestFirst(subjectIds.map((s) => copiesOf(readComplianceEntry(accountId, s, recordId))));
}

function mergeNewestFirst(lists: FormCopy[][]): FormCopy[] {
    return lists.flat().sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}

// ── Writing copies ───────────────────────────────────────────────────────────

/** A form completed and signed in the app, filed as a copy. */
export function fileFormCopy(input: {
    accountId: string | undefined; subjectId: string; defId: string;
    values: Record<string, string>; sigs: Record<string, string>;
    /** Who signed it — defaults to the name typed on the form. */
    signedBy?: string;
}): DocVersion | null {
    const { values, sigs } = input;
    const v = filedFormVersion({
        defId: input.defId,
        signedBy: input.signedBy || values.printName || values.applicant || values.driverName || "",
        date: values.date || values.issueDate || undefined,
        filled: { values, sigs },
    });
    if (v) writeComplianceVersion(input.accountId, input.subjectId, formRecordIdFor(input.defId), v);
    return v;
}

/** A scanned, signed copy somebody uploaded — the other half of "on file". */
export async function uploadFormCopy(input: {
    accountId: string | undefined; subjectId: string; recordId: string; label: string; file: File; by: string;
}): Promise<DocVersion> {
    const url = await readAsDataUrl(input.file);
    const v = newVersion(input.label);
    v.issueDate = todayIso();
    v.uploadedBy = input.by;
    v.files = [{ name: input.file.name, size: input.file.size, url, uploadedAt: new Date().toISOString() }];
    writeComplianceVersion(input.accountId, input.subjectId, input.recordId, v);
    return v;
}

/**
 * A copy the office has but did not file — paper in a cabinet. Recorded so the status
 * says Received, with nothing behind it, which is the truth.
 */
export function recordFormCopy(input: { accountId: string | undefined; subjectId: string; recordId: string; label: string; by: string; note?: string }): DocVersion {
    const v = newVersion(input.label);
    v.issueDate = todayIso();
    v.uploadedBy = input.by;
    v.notes = input.note ?? "Marked received — copy held outside the system.";
    writeComplianceVersion(input.accountId, input.subjectId, input.recordId, v);
    return v;
}

/** A reviewer's check of one copy. */
export function verifyFormCopy(input: { accountId: string | undefined; subjectId: string; recordId: string; copyId: string; by: string; date?: string; note?: string }): void {
    patchComplianceVersion(input.accountId, input.subjectId, input.recordId, input.copyId, {
        verified: { by: input.by, at: input.date || todayIso(), note: input.note?.trim() || undefined },
    });
}

/**
 * The same, on every subject that holds this copy.
 *
 * A copy adopted from the hiring file onto the driver's record exists under both ids with
 * the same version id; verifying it on one and not the other would have the hiring file
 * and the profile disagree about the same piece of paper.
 */
export function verifyFormCopyAcross(input: { accountId: string | undefined; subjectIds: string[]; recordId: string; copyId: string; by: string; date?: string; note?: string }): void {
    for (const subjectId of input.subjectIds) verifyFormCopy({ ...input, subjectId });
}

/**
 * The subject a copy was filed under, found again from the copy's id.
 *
 * A merged list does not say which of a person's subjects a copy came from, and the
 * verify call needs to know — so look for it.
 */
export function subjectOfCopy(accountId: string | undefined, subjectIds: string[], recordId: string, copyId: string): string | undefined {
    return subjectIds.find((s) => readComplianceEntry(accountId, s, recordId).versions.some((v) => v.id === copyId));
}

// ── Seeding ──────────────────────────────────────────────────────────────────

/**
 * Signed copies for the demo files, written once.
 *
 * A seeded applicant who "submitted" with every consent "received" had nothing on file to
 * open — Review showed a blank form with an empty signature line. These are the copies
 * that submission would have produced, with the driver's details and a signature in their
 * name. Once per subject, so a copy the user deletes stays deleted.
 */
export function seedFormCopiesOnce(input: {
    accountId: string | undefined; subjectId: string;
    forms: { defId: string; values: Record<string, string>; signedBy: string; date?: string }[];
    /** PDF signing templates the driver has "signed" — filed as a recorded copy with a signature file name. */
    templates?: { templateId: string; name: string; signedBy: string; date?: string }[];
}): void {
    const flag = `form-copies-seeded::${input.accountId ?? "acct-001"}::${input.subjectId}`;
    try { if (localStorage.getItem(flag)) return; } catch { /* ignore */ }
    for (const f of input.forms) {
        const def = inventoryFormDef(f.defId);
        if (!def) continue;
        if (readComplianceEntry(input.accountId, input.subjectId, formRecordIdFor(f.defId)).versions.length) continue;
        const sig = makeSignatureImage(f.signedBy);
        const sigs = Object.fromEntries(signKeysOf(def).map((k) => [k, sig]));
        const values = { ...f.values, printName: f.values.printName ?? f.signedBy, applicant: f.values.applicant ?? f.signedBy, driverName: f.values.driverName ?? f.signedBy, date: f.date ?? f.values.date ?? todayIso() };
        const v = filedFormVersion({ defId: f.defId, signedBy: f.signedBy, date: values.date, filled: { values, sigs } });
        if (v) writeComplianceVersion(input.accountId, input.subjectId, formRecordIdFor(f.defId), v);
    }
    for (const t of input.templates ?? []) {
        const rid = docTemplateRecordId(t.templateId);
        if (readComplianceEntry(input.accountId, input.subjectId, rid).versions.length) continue;
        const v = newVersion(`${t.name} — signed`);
        v.issueDate = t.date ?? todayIso();
        v.uploadedBy = t.signedBy;
        v.notes = "E-signed in the driver app.";
        v.files = [{ name: `${t.name.replace(/[^\w]+/g, "_")}_signed.pdf`, size: 0, uploadedAt: new Date().toISOString() }];
        writeComplianceVersion(input.accountId, input.subjectId, rid, v);
    }
    try { localStorage.setItem(flag, "1"); } catch { /* ignore */ }
}

/** Every signature field a form draws, wherever it sits. */
export function signKeysOf(def: PolicyFormDef): string[] {
    return [...def.signers, ...(def.sections?.flatMap((s) => s.fields) ?? []), ...(def.fields ?? []), ...(def.intro ?? [])]
        .filter((f) => f.kind === "sign").map((f) => f.key);
}

/** A typed name as a script-font signature image — "Fill sample data", and the seeds. */
export function makeSignatureImage(name: string): string {
    if (typeof document === "undefined") return "";
    const c = document.createElement("canvas");
    c.width = 440; c.height = 140;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#1e293b";
    ctx.font = "48px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(name || "Jane Doe", 16, c.height / 2);
    return c.toDataURL("image/png");
}

// ── helpers ──────────────────────────────────────────────────────────────────

export const todayIso = () => new Date().toISOString().slice(0, 10);

function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result ?? ""));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
    });
}
