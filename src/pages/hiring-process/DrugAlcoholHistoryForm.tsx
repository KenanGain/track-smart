import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, YesNo, MonthYear, FilesUpload, formatAddress, ToggleRow, CheckLine, CompletedByCertification, newCompletedBy, type CompletedBy } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

/**
 * Drug & Alcohol History — Part 3 of the §391.23 Safety Performance History request
 * (DOT-regulated drug & alcohol testing history), completed by a previous employer.
 */

const QUESTIONS = [
    "1. Has this person had an alcohol test with the result of 0.04 or higher alcohol concentration?",
    "2. Has this person tested positive, or adulterated or substituted a test specimen for controlled substances?",
    "3. Has this person refused to submit to a post-accident, random, reasonable suspicion, or follow-up alcohol or controlled substance test?",
    "4. Has this person committed other violations of Subpart B of Part 382, or Part 40?",
    "5. If this person has violated a DOT drug and alcohol regulation, did this person complete a SAP-prescribed rehabilitation program (including return-to-duty and follow-up tests) in your employ?",
    "6. For a driver who completed a SAP's rehabilitation referral and remained in your employ, did this driver subsequently have an alcohol test result of 0.04 or greater, a verified positive drug test, or refuse to be tested?",
];

export function DrugAlcoholHistoryForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();

    const [notSubject, setNotSubject] = useState(false);
    const [subjFrom, setSubjFrom] = useState("");
    const [subjTo, setSubjTo] = useState("");
    const [answers, setAnswers] = useState<string[]>(() => QUESTIONS.map(() => ""));
    const [qDocs, setQDocs] = useState<Record<number, string[]>>({});   // supporting docs per "Yes" answer
    const [completed, setCompleted] = useState<CompletedBy>(newCompletedBy());

    const setAnswer = (i: number, v: string) => {
        setAnswers((a) => a.map((x, idx) => (idx === i ? v : x)));
        if (v !== "Yes") setQDocs((p) => { const n = { ...p }; delete n[i]; return n; });
    };
    const setQDoc = (i: number, v: string[]) => setQDocs((p) => ({ ...p, [i]: v }));

    const toMonth = (s?: string) => {
        if (!s) return "";
        const p = s.split(/[-/]/);
        if (p.length === 2) { const [a, b] = p; return b.length === 4 ? `${b}-${a.padStart(2, "0")}` : `${a}-${b.padStart(2, "0")}`; }
        return "";
    };

    const fillSample = () => {
        setNotSubject(false);
        setSubjFrom(toMonth(pf?.employment?.[0]?.from) || "2021-01"); setSubjTo(toMonth(pf?.employment?.[0]?.to) || "2024-03");
        setAnswers(QUESTIONS.map(() => "No"));
        setCompleted((c) => ({ ...c, company: branding.name, telephone: "(555) 900-1200", address: { street: "500 Depot St", city: "Springfield", state: "IL", zip: "62701", country: "United States" } }));
    };

    const addrOk = !!completed.address.street && !!completed.address.city && !!completed.address.state;
    const checks = [
        { label: notSubject ? "Marked not subject to DOT testing" : "Testing period dates recorded", ok: notSubject ? true : (!!subjFrom && !!subjTo) },
        { label: "All six questions answered", ok: notSubject || answers.every((a) => !!a) },
        { label: "Company & address recorded", ok: !!completed.company && addrOk },
        { label: embedded ? "Certified & signed" : "Reviewer sign-off completed", ok: completed.done },
    ];

    const sections: DocSection[] = [
        { title: "DOT Testing Coverage", groups: [{ rows: notSubject
            ? [{ label: "Subject to DOT testing", value: "No — not subject while employed" }]
            : [{ label: "Subject to DOT testing", value: "Yes" }, { label: "From", value: subjFrom }, { label: "To", value: subjTo }] }] },
        ...(notSubject ? [] : [{ title: "Drug & Alcohol History", groups: [{ rows: QUESTIONS.map((q, i) => ({ label: q, value: answers[i] ? (qDocs[i]?.length ? `${answers[i]} — ${qDocs[i].length} document(s) attached` : answers[i]) : "—" })) }] }]),
        { title: "Completed By", groups: [{ rows: [
            { label: "Company", value: completed.company }, { label: "Address", value: formatAddress(completed.address) }, { label: "Telephone", value: completed.telephone },
        ] }] },
        { title: "Review Checklist", groups: [{ rows: checks.map((c) => ({ label: c.label, value: c.ok ? "✓ Complete" : "Pending" })) }] },
        { title: embedded ? "Certification" : "Reviewer Sign-Off", groups: [completed.done
            ? { rows: [{ label: embedded ? "Completed by" : "Reviewed by", value: completed.name }, { label: "Title", value: completed.role }, { label: "Date", value: completed.date }, { label: "Status", value: embedded ? "Completed & signed" : "Reviewed & signed" }], images: completed.sig ? [completed.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending — not yet signed" }] }] },
    ];

    const reviewChecklist = (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review Checklist</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{checks.map((c, i) => <CheckLine key={i} ok={c.ok} label={c.label} />)}</ul>
        </div>
    );

    return (
        <FormScaffold
            title="Drug & Alcohol History" Icon={FlaskConical} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview} sheet
            docTitle="Safety Performance History — Drug & Alcohol History" docSubtitle={pf?.fullName || undefined} sections={sections} branding={branding} fileName="drug-alcohol-history.pdf"
            intro={<>Part 3 of the §391.23 Safety Performance History — DOT-regulated drug &amp; alcohol testing history, completed by the previous employer. Include any required information obtained from prior employers in the 3 years before the application.</>}
        >
            <div>
                <SectionTitle>DOT Testing Coverage</SectionTitle>
                <div className="space-y-4">
                    <ToggleRow label="Driver was NOT subject to DOT testing requirements while employed by this employer (complete the bottom, sign and return)." checked={notSubject} onChange={setNotSubject} />
                    {!notSubject && (
                        <Grid>
                            <Field label="Subject to DOT testing — from" required><MonthYear value={subjFrom} onChange={setSubjFrom} /></Field>
                            <Field label="Subject to DOT testing — to" required><MonthYear value={subjTo} onChange={setSubjTo} /></Field>
                        </Grid>
                    )}
                </div>
            </div>

            {!notSubject && (
                <div>
                    <SectionTitle>Drug & Alcohol History</SectionTitle>
                    <div className="space-y-5">
                        {QUESTIONS.map((q, i) => (
                            <Field key={i} label={q} required>
                                <YesNo value={answers[i]} onChange={(v) => setAnswer(i, v)} />
                                {answers[i] === "Yes" && (
                                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3">
                                        <p className="mb-2 text-xs font-semibold text-amber-700">Yes — please attach supporting documentation (you can add multiple files).</p>
                                        <FilesUpload value={qDocs[i] ?? []} onChange={(v) => setQDoc(i, v)} />
                                    </div>
                                )}
                            </Field>
                        ))}
                    </div>
                </div>
            )}

            {embedded ? (
                <CompletedByCertification value={completed} onChange={setCompleted} />
            ) : (
                <CompletedByCertification
                    value={completed} onChange={setCompleted} checklist={reviewChecklist}
                    kicker="Completed By"
                    certKicker="Reviewer Sign-Off"
                    certHeading="Part 3 completed — I have reviewed and completed the drug & alcohol history above."
                    certSubtext="Confirm you have reviewed the form above. Your name, title, date and signature are recorded on file."
                    nameLabel="Reviewer name" buttonLabel="Confirm review & sign" signedLabel="Reviewed & signed" signedByLabel="Reviewed by"
                />
            )}
        </FormScaffold>
    );
}
