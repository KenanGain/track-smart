import { useState } from "react";
import { DatabaseZap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, SelectBox, RadioRows, YesNoField, RevealPanel, PdfUpload } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

const QUERY_TYPES = ["Annual — Limited Query", "Pre-Employment — Full Query"];
const LIMITED_RESULT = ["No information found — driver not prohibited", "Information found — Full Query required"];
const FULL_RESULT = ["No prohibitions — driver eligible", "Prohibited — driver not eligible to operate a CMV"];

export function ClearinghouseQueryForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const [driver, setDriver] = useState(() => pf?.fullName ?? "");
    const [cdl, setCdl] = useState(() => pf?.licenses[0]?.number ?? "");
    const [cdlState, setCdlState] = useState(() => pf?.licenses[0]?.authority ?? "");
    const [queryType, setQueryType] = useState("Annual — Limited Query");
    const [consent, setConsent] = useState("");
    const [queryDate, setQueryDate] = useState("");
    const [limitedResult, setLimitedResult] = useState("");
    // Escalation to full query
    const [fullConsent, setFullConsent] = useState("");
    const [fullDate, setFullDate] = useState("");
    const [fullResult, setFullResult] = useState("");
    const [pdf, setPdf] = useState("");

    const needsFull = limitedResult.startsWith("Information found");
    const isFullType = queryType.startsWith("Pre-Employment");

    const fillSample = () => {
        setDriver("Jane Doe"); setCdl("D1234-5678-90"); setCdlState("Illinois"); setQueryType("Annual — Limited Query");
        setConsent("Yes"); setQueryDate("2026-05-30"); setLimitedResult("No information found — driver not prohibited");
        setFullConsent(""); setFullDate(""); setFullResult("");
    };

    const sections: DocSection[] = [
        { title: "Driver", groups: [{ rows: [{ label: "Driver", value: driver }, { label: "CDL Number", value: cdl }, { label: "CDL State / Province", value: cdlState }] }] },
        { title: isFullType ? "Full Query" : "Limited Query", groups: [{ rows: [
            { label: "Query Type", value: queryType },
            { label: "Driver consent", value: consent },
            { label: "Query Date", value: queryDate },
            ...(isFullType ? [] : [{ label: "Result", value: limitedResult }]),
        ] }] },
        ...((needsFull || isFullType) ? [{ title: isFullType ? "Full Query Result" : "Full Query (escalated)", groups: [{ rows: [
            ...(isFullType ? [] : [{ label: "Full-query consent", value: fullConsent }, { label: "Full Query Date", value: fullDate }]),
            { label: "Result", value: fullResult },
        ] }] }] : []),
        { title: "Document", groups: [{ rows: [{ label: "Query Result PDF", value: pdf ? "Attached" : "Not attached" }] }] },
    ];

    return (
        <FormScaffold
            title="Clearinghouse Query" Icon={DatabaseZap} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="FMCSA Drug & Alcohol Clearinghouse Query" docSubtitle={queryType} badge={(isFullType ? fullResult : limitedResult).split(" — ")[0] || undefined} sections={sections} branding={branding} fileName="clearinghouse-query.pdf"
            intro={<>FMCSA Drug &amp; Alcohol Clearinghouse query. The <span className="font-medium text-slate-700">annual limited query</span> checks if any information exists; if anything comes back, a <span className="font-medium text-slate-700">full query</span> (with the driver’s electronic consent) is required within 24 hours.</>}
        >
            <div>
                <SectionTitle>Driver</SectionTitle>
                <Grid>
                    <Field label="Driver" required><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
                    <Field label="CDL Number"><Input value={cdl} onChange={(e) => setCdl(e.target.value)} /></Field>
                    <Field label="CDL State / Province"><Input value={cdlState} onChange={(e) => setCdlState(e.target.value)} /></Field>
                </Grid>
            </div>

            <div>
                <SectionTitle>Query</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="Query Type" required><SelectBox value={queryType} items={QUERY_TYPES} onChange={setQueryType} /></Field>
                        <Field label="Query Date"><Input type="date" value={queryDate} onChange={(e) => setQueryDate(e.target.value)} /></Field>
                    </Grid>
                    <YesNoField label={isFullType ? "Driver electronic consent obtained in the Clearinghouse?" : "General consent on file for limited queries?"} value={consent} onChange={setConsent} />
                    {!isFullType && (
                        <Field label="Limited Query Result" required><RadioRows items={LIMITED_RESULT} value={limitedResult} onChange={setLimitedResult} /></Field>
                    )}
                </div>
            </div>

            {(needsFull || isFullType) && (
                <div>
                    <SectionTitle>Full Query{isFullType ? "" : " — Escalated"}</SectionTitle>
                    <RevealPanel title={isFullType ? "Full Query Result" : "Information came back — Full Query required within 24 hours"}>
                        <div className="space-y-4">
                            {!isFullType && (
                                <>
                                    <YesNoField label="Driver electronic consent obtained for the full query?" value={fullConsent} onChange={setFullConsent} />
                                    <Field label="Full Query Date"><Input type="date" value={fullDate} onChange={(e) => setFullDate(e.target.value)} /></Field>
                                </>
                            )}
                            <Field label="Full Query Result" required><RadioRows items={FULL_RESULT} value={fullResult} onChange={setFullResult} /></Field>
                        </div>
                    </RevealPanel>
                </div>
            )}

            <div>
                <SectionTitle>Query Document</SectionTitle>
                <PdfUpload value={pdf} onChange={setPdf} />
                <p className="mt-2 text-xs text-slate-400">Upload the Clearinghouse query result PDF.</p>
            </div>
        </FormScaffold>
    );
}
