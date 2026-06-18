import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, RadioRows, PdfUpload, CheckLine, ReviewSignOff, newSignOff, type SignOffData } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import type { DocSection } from "./FormDocument";

const STATUSES = ["Negative — no substances detected", "Positive", "Pending"];
const RESULTS = ["Pass", "Fail"];

export function SubstanceTestingForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const [requested, setRequested] = useState("");
    const [completed, setCompleted] = useState("");
    const [status, setStatus] = useState("");
    const [passFail, setPassFail] = useState("");
    const [pdf, setPdf] = useState("");
    const [comments, setComments] = useState("");
    const [signoff, setSignoff] = useState<SignOffData>(newSignOff());

    const fillSample = () => {
        setRequested("2026-05-22"); setCompleted("2026-05-24");
        setStatus("Negative — no substances detected");
        setPassFail("Pass"); setPdf("uploaded");
        setComments("Drug & alcohol test returned negative. Eligible to proceed.");
    };

    const checks = [
        { label: "Date requested recorded", ok: !!requested },
        { label: "Date completed recorded", ok: !!completed },
        { label: "Status recorded", ok: !!status },
        { label: "Pass / fail determined", ok: !!passFail },
        { label: "Report document uploaded", ok: !!pdf },
        { label: "Reviewer sign-off completed", ok: signoff.done },
    ];

    const sections: DocSection[] = [
        { title: "Substance Test", groups: [{ rows: [
            { label: "Date Requested", value: requested },
            { label: "Date Completed", value: completed },
            { label: "Status", value: status },
            { label: "Pass / Fail", value: passFail },
            { label: "Report Document", value: pdf ? "Attached" : "Not attached" },
        ] }] },
        ...(comments ? [{ title: "Comments", groups: [{ rows: [{ label: "Comments", value: comments }] }] }] : []),
        { title: "Review Checklist", groups: [{ rows: checks.map((c) => ({ label: c.label, value: c.ok ? "✓ Complete" : "Pending" })) }] },
        { title: "Reviewer Sign-Off", groups: [signoff.done
            ? { rows: [{ label: "Reviewed by", value: signoff.name }, { label: "Title", value: signoff.role }, { label: "Date", value: signoff.date }, { label: "Status", value: "Reviewed & signed" }], images: signoff.sig ? [signoff.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending review — not yet signed" }] }] },
    ];

    return (
        <FormScaffold
            title="Substance Testing" Icon={FlaskConical} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="Drug & Alcohol Test" docSubtitle={status || undefined} badge={passFail || undefined} sections={sections} branding={branding} fileName="substance-testing.pdf"
            intro={<>Record the drug &amp; alcohol test — request &amp; completion dates, the status and result, the pass / fail determination, and upload the provider’s report. Add comments and complete the review checklist below.</>}
        >
            <div>
                <SectionTitle>Substance Test</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Date Requested" required><Input type="date" value={requested} onChange={(e) => setRequested(e.target.value)} /></Field>
                        <Field label="Date Completed"><Input type="date" value={completed} onChange={(e) => setCompleted(e.target.value)} /></Field>
                    </Grid>
                    <Field label="Status" required><RadioRows items={STATUSES} value={status} onChange={setStatus} /></Field>
                    <Field label="Pass / Fail" required><RadioRows items={RESULTS} value={passFail} onChange={setPassFail} cols={2} /></Field>
                </div>
            </div>

            <div>
                <SectionTitle>Test Report</SectionTitle>
                <PdfUpload value={pdf} onChange={setPdf} />
            </div>

            <div>
                <SectionTitle>Comments</SectionTitle>
                <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add a comment…" className="resize-none" />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review Checklist</p>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{checks.map((c, i) => <CheckLine key={i} ok={c.ok} label={c.label} />)}</ul>
            </div>

            <ReviewSignOff heading="I have reviewed the substance test above." value={signoff} onChange={setSignoff} />
        </FormScaffold>
    );
}
