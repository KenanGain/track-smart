import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, SelectBox, RadioRows, PdfUpload } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

const TEST_TYPES = ["Pre-Employment", "Random", "Post-Accident", "Reasonable Suspicion", "Return-to-Duty", "Follow-Up"];
const REGULATIONS = ["DOT — 49 CFR Part 40", "Non-DOT (Company Policy)"];
const RESULTS = ["Passed", "Failed", "Pending"];

export function SubstanceTestingForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const [driver, setDriver] = useState(() => pf?.fullName ?? "");
    const [testType, setTestType] = useState("Pre-Employment");
    const [regulation, setRegulation] = useState(REGULATIONS[0]);
    const [provider, setProvider] = useState("");
    const [testDate, setTestDate] = useState("");
    const [resultDate, setResultDate] = useState("");
    const [result, setResult] = useState("");
    const [notes, setNotes] = useState("");
    const [pdf, setPdf] = useState("");

    const fillSample = () => {
        setDriver("Jane Doe"); setTestType("Pre-Employment"); setRegulation(REGULATIONS[0]);
        setProvider("Quest Diagnostics"); setTestDate("2026-05-22"); setResultDate("2026-05-24");
        setResult("Passed"); setNotes("");
    };

    const sections: DocSection[] = [
        { title: "Test", groups: [{ rows: [
            { label: "Driver", value: driver },
            { label: "Test Type", value: testType },
            { label: "Regulation", value: regulation },
            { label: "Testing Provider (3rd party)", value: provider },
            { label: "Test Date", value: testDate },
            { label: "Result Date", value: resultDate },
        ] }] },
        { title: "Result", groups: [{ rows: [
            { label: "Result", value: result },
            ...(result === "Failed" && notes ? [{ label: "Notes", value: notes }] : []),
            { label: "Report", value: pdf ? "Attached" : "Not attached" },
        ] }] },
    ];

    return (
        <FormScaffold
            title="Substance Testing" Icon={FlaskConical} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="Drug & Alcohol Test" docSubtitle={`${testType} · ${regulation}`} badge={result || undefined} sections={sections} branding={branding} fileName="substance-testing.pdf"
            intro={<>Drug &amp; alcohol testing is performed by a third-party provider. Record the test details and the <span className="font-medium text-slate-700">Pass / Fail</span> result, then attach the provider’s report.</>}
        >
            <div>
                <SectionTitle>Test Details</SectionTitle>
                <Grid>
                    <Field label="Driver" required><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
                    <Field label="Test Type"><SelectBox value={testType} items={TEST_TYPES} onChange={setTestType} /></Field>
                    <Field label="Regulation"><SelectBox value={regulation} items={REGULATIONS} onChange={setRegulation} /></Field>
                    <Field label="Testing Provider" hint="Third-party lab / clinic."><Input value={provider} onChange={(e) => setProvider(e.target.value)} /></Field>
                    <Field label="Test Date"><Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></Field>
                    <Field label="Result Date"><Input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} /></Field>
                </Grid>
            </div>

            <div>
                <SectionTitle>Result</SectionTitle>
                <div className="space-y-5">
                    <Field label="Result" required><RadioRows items={RESULTS} value={result} onChange={setResult} /></Field>
                    {result === "Failed" && (
                        <Field label="Notes" hint="Optional — substances, dilute, refusal, etc.">
                            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                        </Field>
                    )}
                </div>
            </div>

            <div>
                <SectionTitle>Test Report</SectionTitle>
                <PdfUpload value={pdf} onChange={setPdf} />
                <p className="mt-2 text-xs text-slate-400">Upload the report provided by the third-party testing provider.</p>
            </div>
        </FormScaffold>
    );
}
