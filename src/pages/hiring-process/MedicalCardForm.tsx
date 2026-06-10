import { useState } from "react";
import { HeartPulse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, SelectBox, RadioRows, CheckRows, PdfUpload } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

const RESULTS = ["Qualified", "Qualified — with restrictions", "Temporarily disqualified", "Not qualified"];
const RESTRICTIONS = ["Wearing corrective lenses", "Wearing hearing aid", "Accompanied by a waiver / exemption", "Driving within an exempt intracity zone", "Qualified by operation of 49 CFR 391.64", "Wearing corrective lenses & hearing aid"];
const TERMS = ["2 years (24 months)", "1 year", "6 months", "3 months", "Other"];

export function MedicalCardForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const [driver, setDriver] = useState(() => pf?.fullName ?? "");
    const [cdl, setCdl] = useState(() => pf?.licenses[0]?.number ?? "");
    const [examiner, setExaminer] = useState("");
    const [registryNo, setRegistryNo] = useState("");
    const [examDate, setExamDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [term, setTerm] = useState("2 years (24 months)");
    const [result, setResult] = useState("");
    const [restrictions, setRestrictions] = useState<string[]>([]);
    const [pdf, setPdf] = useState("");

    const toggleR = (s: string) => setRestrictions((l) => (l.includes(s) ? l.filter((x) => x !== s) : [...l, s]));
    const restricted = result === "Qualified — with restrictions";

    const fillSample = () => {
        setDriver("Jane Doe"); setCdl("D1234-5678-90"); setExaminer("Dr. Alan Reyes, DC"); setRegistryNo("1234567890");
        setExamDate("2026-05-20"); setExpiryDate("2028-05-20"); setTerm("2 years (24 months)");
        setResult("Qualified"); setRestrictions([]);
    };

    const sections: DocSection[] = [
        { title: "Driver", groups: [{ rows: [{ label: "Driver", value: driver }, { label: "CDL Number", value: cdl }] }] },
        { title: "Medical Examiner", groups: [{ rows: [{ label: "Examiner", value: examiner }, { label: "National Registry #", value: registryNo }, { label: "Exam Date", value: examDate }, { label: "Expiration Date", value: expiryDate }, { label: "Certificate Term", value: term }] }] },
        { title: "Determination", groups: [{ rows: [{ label: "Result", value: result }, ...(restricted ? [{ label: "Restrictions", value: restrictions.length ? restrictions.join(", ") : "—" }] : []), { label: "Medical Card", value: pdf ? "Attached" : "Not attached" }] }] },
    ];

    return (
        <FormScaffold
            title="Medical Card Renewal" Icon={HeartPulse} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="Medical Examiner’s Certificate" docSubtitle="DOT Medical Card · 49 CFR 391.41" badge={result || undefined} sections={sections} branding={branding} fileName="medical-card-renewal.pdf"
            intro={<>Record the driver’s DOT medical certification (MEC, Form MCSA-5876). Capture the examiner, exam and expiration dates, qualification result and any restrictions, then attach the medical card.</>}
        >
            <div>
                <SectionTitle>Driver</SectionTitle>
                <Grid>
                    <Field label="Driver" required><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
                    <Field label="CDL Number"><Input value={cdl} onChange={(e) => setCdl(e.target.value)} /></Field>
                </Grid>
            </div>

            <div>
                <SectionTitle>Medical Examiner</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Examiner Name"><Input value={examiner} onChange={(e) => setExaminer(e.target.value)} /></Field>
                        <Field label="National Registry Number" hint="FMCSA National Registry of Certified Medical Examiners."><Input value={registryNo} onChange={(e) => setRegistryNo(e.target.value)} /></Field>
                        <Field label="Exam Date"><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></Field>
                        <Field label="Expiration Date"><Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} /></Field>
                    </Grid>
                    <Field label="Certificate Term"><SelectBox value={term} items={TERMS} onChange={setTerm} /></Field>
                </div>
            </div>

            <div>
                <SectionTitle>Determination</SectionTitle>
                <div className="space-y-5">
                    <Field label="Result" required><RadioRows items={RESULTS} value={result} onChange={setResult} cols={2} /></Field>
                    {restricted && (
                        <Field label="Restrictions"><CheckRows items={RESTRICTIONS} selected={restrictions} onToggle={toggleR} cols={1} /></Field>
                    )}
                </div>
            </div>

            <div>
                <SectionTitle>Medical Card</SectionTitle>
                <PdfUpload value={pdf} onChange={setPdf} />
                <p className="mt-2 text-xs text-slate-400">Upload the Medical Examiner’s Certificate (medical card) PDF or image.</p>
            </div>
        </FormScaffold>
    );
}
