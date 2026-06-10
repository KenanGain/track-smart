import { useState } from "react";
import { Plus, Trash2, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES } from "./ApplicationSettingsPage";
import { Field, Grid, SelectBox, RadioRows, YesNoField, PdfUpload, SignaturePad } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

const DETERMINATIONS = ["Meets §391.15 — qualified to continue driving", "Conditionally qualified — monitoring required", "Disqualified — does not meet requirements"];

type Viol = { date: string; state: string; offense: string; cmv: string };
const newViol = (): Viol => ({ date: "", state: "", offense: "", cmv: "" });

export function AnnualReviewForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const [driver, setDriver] = useState(() => pf?.fullName ?? "");
    const [cdl, setCdl] = useState(() => pf?.licenses[0]?.number ?? "");
    const [reviewDate, setReviewDate] = useState("");
    const [periodFrom, setPeriodFrom] = useState("");
    const [periodTo, setPeriodTo] = useState("");
    const [mvrObtained, setMvrObtained] = useState("");
    const [mvrState, setMvrState] = useState(() => pf?.licenses[0]?.authority ?? "");
    const [licenseValid, setLicenseValid] = useState("");
    const [violations, setViolations] = useState<Viol[]>([]);
    const [determination, setDetermination] = useState("");
    const [comments, setComments] = useState("");
    const [reviewer, setReviewer] = useState("");
    const [reviewerTitle, setReviewerTitle] = useState("");
    const [sig, setSig] = useState("");
    const [pdf, setPdf] = useState("");

    const setViol = (i: number, patch: Partial<Viol>) => setViolations((l) => l.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

    const fillSample = () => {
        setDriver("Jane Doe"); setCdl("D1234-5678-90"); setReviewDate("2026-06-01"); setPeriodFrom("2025-06-01"); setPeriodTo("2026-06-01");
        setMvrObtained("2026-05-28"); setMvrState("Illinois"); setLicenseValid("Yes");
        setViolations([{ date: "2025-11-02", state: "Illinois", offense: "Speeding 11–15 mph over", cmv: "No" }]);
        setDetermination("Meets §391.15 — qualified to continue driving"); setComments("One minor violation; remains qualified."); setReviewer("Robert King"); setReviewerTitle("Safety Manager");
    };

    const sections: DocSection[] = [
        { title: "Driver & Period", groups: [{ rows: [{ label: "Driver", value: driver }, { label: "CDL Number", value: cdl }, { label: "Review Date", value: reviewDate }, { label: "Review Period", value: `${periodFrom} – ${periodTo}` }] }] },
        { title: "Driving Record (MVR)", groups: [{ rows: [{ label: "MVR Obtained", value: mvrObtained }, { label: "Issuing State / Province", value: mvrState }, { label: "License valid & current", value: licenseValid }] }] },
        { title: "Violations in Period", groups: violations.length ? violations.map((v, i) => ({ label: `Violation ${i + 1}`, rows: [{ label: "Date", value: v.date }, { label: "State / Province", value: v.state }, { label: "Offense", value: v.offense }, { label: "In a CMV", value: v.cmv }] })) : [{ rows: [{ label: "Violations", value: "None recorded" }] }] },
        { title: "Determination", groups: [{ rows: [{ label: "Determination", value: determination }, { label: "Comments", value: comments }, { label: "Reviewer", value: reviewer ? `${reviewer}${reviewerTitle ? ` · ${reviewerTitle}` : ""}` : "" }, { label: "MVR Document", value: pdf ? "Attached" : "Not attached" }], images: sig ? [sig] : undefined }] },
    ];

    return (
        <FormScaffold
            title="Annual Review (§391.25)" Icon={CalendarCheck} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="Annual Review of Driving Record" docSubtitle="49 CFR §391.25" badge={determination ? determination.split(" — ")[0] : undefined} sections={sections} branding={branding} fileName="annual-review.pdf"
            intro={<>The carrier’s annual review of the driver’s driving record (§391.25). Record the MVR obtained, list violations in the review period, and make the qualification determination with reviewer signature.</>}
        >
            <div>
                <SectionTitle>Driver &amp; Review Period</SectionTitle>
                <Grid>
                    <Field label="Driver" required><Input value={driver} onChange={(e) => setDriver(e.target.value)} /></Field>
                    <Field label="CDL Number"><Input value={cdl} onChange={(e) => setCdl(e.target.value)} /></Field>
                    <Field label="Review Date"><Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} /></Field>
                    <Field label="Period From"><Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} /></Field>
                    <Field label="Period To"><Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} /></Field>
                </Grid>
            </div>

            <div>
                <SectionTitle>Driving Record (MVR)</SectionTitle>
                <div className="space-y-5">
                    <Grid>
                        <Field label="MVR Obtained Date"><Input type="date" value={mvrObtained} onChange={(e) => setMvrObtained(e.target.value)} /></Field>
                        <Field label="Issuing State / Province"><SelectBox value={mvrState} placeholder="Please choose" items={STATES_PROVINCES} onChange={setMvrState} /></Field>
                    </Grid>
                    <YesNoField label="License valid and current?" value={licenseValid} onChange={setLicenseValid} />
                </div>
            </div>

            <div>
                <SectionTitle>Violations in Review Period</SectionTitle>
                <div className="space-y-4">
                    {violations.map((v, i) => (
                        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">Violation {i + 1}</span>
                                <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setViolations((l) => l.filter((_, idx) => idx !== i))}><Trash2 className="h-3.5 w-3.5" /> Remove</Button>
                            </div>
                            <div className="space-y-4">
                                <Grid>
                                    <Field label="Date"><Input type="date" value={v.date} onChange={(e) => setViol(i, { date: e.target.value })} /></Field>
                                    <Field label="State / Province"><SelectBox value={v.state} placeholder="Please choose" items={STATES_PROVINCES} onChange={(val) => setViol(i, { state: val })} /></Field>
                                </Grid>
                                <Field label="Offense"><Input value={v.offense} onChange={(e) => setViol(i, { offense: e.target.value })} /></Field>
                                <YesNoField label="Occurred while operating a commercial motor vehicle?" value={v.cmv} onChange={(val) => setViol(i, { cmv: val })} />
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={() => setViolations((l) => [...l, newViol()])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Violation</button>
                    <p className="text-xs text-slate-400">Leave empty if there were no violations in the review period.</p>
                </div>
            </div>

            <div>
                <SectionTitle>Determination &amp; Signature</SectionTitle>
                <div className="space-y-5">
                    <Field label="Determination" required><RadioRows items={DETERMINATIONS} value={determination} onChange={setDetermination} /></Field>
                    <Field label="Comments"><textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Field>
                    <Grid>
                        <Field label="Reviewer Name"><Input value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></Field>
                        <Field label="Reviewer Title"><Input value={reviewerTitle} onChange={(e) => setReviewerTitle(e.target.value)} /></Field>
                    </Grid>
                    <SignaturePad label="Reviewer’s Signature" onChange={setSig} />
                    <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">MVR / Abstract Document</p>
                        <PdfUpload value={pdf} onChange={setPdf} />
                    </div>
                </div>
            </div>
        </FormScaffold>
    );
}
