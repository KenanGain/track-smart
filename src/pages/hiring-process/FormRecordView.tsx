import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { PolicyForm } from "./PolicyForm";
import { FormRecordCard } from "./FormRecordCard";
import { VerifyCopyDialog } from "./VerifyCopyDialog";
import { PrefillProvider, type ApplicantPrefill } from "./application-prefill";
import { ACTOR } from "./applicants.data";
import {
    FORM_STATUS_META, fileFormCopy, formCopyStatus, formRecordIdFor, recordFormCopy, uploadFormCopy, useFormCopies, verifyFormCopyAcross,
    type FormCopy,
} from "./form-copies";
import type { PolicyFormDef } from "./policy-forms.data";

/**
 * One form on one person's file, as a page: the card with its copies, and the viewer the
 * card's actions open — a signed copy to read, or the blank form to fill in and file.
 *
 * The hiring file and the onboarding file open this for a consent, a policy form or an
 * onboarding form; the driver's profile reaches the same card through its record page.
 * What they share is everything that matters: where the copies are read from, where a new
 * one is filed, and what "Verified" means.
 */
export function FormRecordView({ def, title, subtitle, backLabel, subject, accountId, subjectIds, writeSubjectId, requested, prefill, onBack, onShare, onAsk, onRemark, onFiled, onVerified, onReceived, startFilling, children }: {
    def: PolicyFormDef;
    title: string;
    subtitle?: string;
    backLabel: string;
    /** Whose file: "Jane Doe · Hiring file". */
    subject: string;
    accountId: string | undefined;
    /** Every subject that is this person (see form-copies `useFormCopies`). */
    subjectIds: string[];
    /** Where a copy filed here goes. */
    writeSubjectId: string;
    requested?: boolean;
    /** The person's details, so a form filled here starts with their name and licence. */
    prefill?: ApplicantPrefill | null;
    onBack: () => void;
    onShare?: (copies: FormCopy[]) => void;
    onAsk?: () => void;
    onRemark?: () => void;
    /** Hooks for the file's own activity log. */
    onFiled?: (copy: { by: string }) => void;
    onVerified?: (r: { by: string }) => void;
    onReceived?: () => void;
    /** Open straight into the blank form — the row's "Fill out & sign". */
    startFilling?: boolean;
    children?: React.ReactNode;
}) {
    const recordId = formRecordIdFor(def.id);
    const copies = useFormCopies(accountId, subjectIds, recordId);
    const [open, setOpen] = useState<FormCopy | null>(null);
    const [filling, setFilling] = useState(!!startFilling);
    const [blank, setBlank] = useState(false);
    const [verifying, setVerifying] = useState<FormCopy | null>(null);
    const status = FORM_STATUS_META[formCopyStatus(copies, requested)];

    const verify = (copy: FormCopy, r: { by: string; date: string; note?: string }) => {
        verifyFormCopyAcross({ accountId, subjectIds: Array.from(new Set([...subjectIds, writeSubjectId])), recordId, copyId: copy.id, by: r.by, date: r.date, note: r.note });
        onVerified?.({ by: r.by });
        setVerifying(null);
        // The copy being read is the one just verified — show it verified.
        if (open?.id === copy.id) setOpen({ ...copy, verified: { by: r.by, at: r.date, note: r.note } });
    };

    const verifyDialog = verifying && (
        <VerifyCopyDialog copy={verifying} formName={title} onClose={() => setVerifying(null)} onConfirm={(r) => verify(verifying, r)} />
    );

    if (open) {
        return (
            <>
                <PolicyForm def={def} mode="filed" copy={open} subject={subject} backLabel={title}
                    sharedValues={open.filled?.values} sharedSignatures={open.filled?.sigs}
                    onBack={() => setOpen(null)} onVerify={() => setVerifying(open)} />
                {verifyDialog}
            </>
        );
    }
    if (filling) {
        const form = (
            <PolicyForm def={def} mode="fill" subject={subject} backLabel={title} onBack={() => setFilling(false)}
                onComplete={(r) => {
                    const v = fileFormCopy({ accountId, subjectId: writeSubjectId, defId: def.id, values: r.values, sigs: r.sigs });
                    onFiled?.({ by: v?.uploadedBy ?? r.values.printName ?? "" });
                    setFilling(false);
                }} completeLabel="Save & file" />
        );
        return prefill ? <PrefillProvider value={prefill}>{form}</PrefillProvider> : form;
    }
    if (blank) {
        return <PolicyForm def={def} mode="template" readOnly startPreview backLabel={title} onBack={() => setBlank(false)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> {backLabel}</button>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", status.badge)}>{status.label}</span>
            </div>
            <div className="mx-auto max-w-4xl space-y-5 px-6 py-6">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{def.kind === "policy" ? "Policy form" : "Consent form"} · {subject}</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
                    {(subtitle ?? def.blurb) && <p className="mt-1 text-sm text-slate-500">{subtitle ?? def.blurb}</p>}
                </div>

                <FormRecordCard
                    title="Copies on file"
                    copies={copies}
                    requested={requested}
                    onOpen={setOpen}
                    onFill={() => setFilling(true)}
                    onUpload={async (file) => {
                        await uploadFormCopy({ accountId, subjectId: writeSubjectId, recordId, label: `${title} — uploaded copy`, file, by: ACTOR });
                        onFiled?.({ by: ACTOR });
                    }}
                    onPdf={() => setBlank(true)}
                    onShare={onShare ? () => onShare(copies) : undefined}
                    onAsk={onAsk}
                    onRemark={onRemark}
                    onVerify={setVerifying}
                    onMarkReceived={() => { recordFormCopy({ accountId, subjectId: writeSubjectId, recordId, label: `${title} — paper copy`, by: ACTOR }); onReceived?.(); }}
                />

                {children}
            </div>
            {verifyDialog}
        </div>
    );
}
