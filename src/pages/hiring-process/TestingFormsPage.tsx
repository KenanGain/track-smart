import { useState } from "react";
import { FlaskConical, CarFront, FileText, ArrowRight, Briefcase, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPrefill, PrefillProvider } from "./application-prefill";
import { RecipientFormPreview, type RecipientDoc } from "./RecipientFormPreview";
import { HiringFormView } from "./formRegistry";
import { useApplicants } from "./applicants.data";

// The Safety Performance History (§391.23) forms an admin can open and test from Settings.
// Each form is emailed with a checklist of supporting documents the previous employer is
// asked to attach, alongside the secure form link.
const TESTING_FORMS: { id: string; label: string; desc: string; Icon: typeof FlaskConical; group: string; docs: RecipientDoc[] }[] = [
    { id: "accident-history", label: "Accident History", desc: "§391.23 safety performance — accident history.", Icon: CarFront, group: "Safety Performance History", docs: [
        { key: "experience-letter", label: "Employer Experience Letter", note: "Signed letter confirming the driver's employment and experience." },
        { key: "insurance-letter", label: "Insurance Experience Letter", note: "Letter confirming insurance / loss history while employed." },
    ] },
    { id: "drug-alcohol-history", label: "Drug & Alcohol History", desc: "§391.23 safety performance — DOT testing history.", Icon: FlaskConical, group: "Safety Performance History", docs: [
        { key: "experience-letter", label: "Employer Experience Letter", note: "Signed letter confirming the driver's employment and experience." },
        { key: "insurance-letter", label: "Insurance Experience Letter", note: "Letter confirming insurance / loss history while employed." },
    ] },
    { id: "employment-verification", label: "Employment Verification", desc: "§391.23 employment verification — previous employer confirmation.", Icon: Briefcase, group: "Employment", docs: [
        { key: "experience-letter", label: "Employer Experience Letter", note: "Signed letter confirming the driver's employment and experience." },
        { key: "insurance-letter", label: "Insurance Experience Letter", note: "Letter confirming insurance / loss history while employed." },
    ] },
    { id: "road-test", label: "Road Test Evaluation", desc: "FMCSA §391.31 — open and fill the examiner's evaluation form (scored sections + certification).", Icon: ClipboardCheck, group: "Road Test", docs: [
        { key: "road-test-certificate", label: "Road Test Certificate", note: "Signed §391.31 record / certificate of road test." },
    ] },
];

const GROUPS = ["Safety Performance History", "Employment", "Road Test"];

export function TestingFormsPage() {
    const { applicants } = useApplicants();
    const [openForm, setOpenForm] = useState<string | null>(null);

    // Use the first applicant's data to pre-fill forms so they show realistic content.
    const prefill = applicants[0] ? buildPrefill(applicants[0]) : null;

    if (openForm) {
        const meta = TESTING_FORMS.find((f) => f.id === openForm);
        // Road Test is conducted internally by an examiner (not emailed to a previous
        // employer) — open the actual Road Test Evaluation so it can be filled & tested.
        if (openForm === "road-test") {
            return (
                <PrefillProvider value={prefill}>
                    <HiringFormView formId="road-test" onBack={() => setOpenForm(null)} />
                </PrefillProvider>
            );
        }
        return (
            <RecipientFormPreview
                formId={openForm}
                label={meta?.label ?? "Form"}
                applicantName={prefill?.fullName ?? "the applicant"}
                prefill={prefill}
                requestDocs={meta?.docs ?? []}
                forms={TESTING_FORMS.filter((f) => f.group === meta?.group).map((f) => ({ key: f.id, label: f.label }))}
                onBack={() => setOpenForm(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Hiring Setup</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Testing Forms</h1>
                <p className="mt-1.5 text-sm text-slate-500">These forms are emailed to the previous employer as a secure form link. Open one to preview the <span className="font-semibold text-slate-600">email</span> the recipient receives and the <span className="font-semibold text-slate-600">form</span> they complete.</p>

                {GROUPS.map((group) => (
                    <div key={group} className="mt-8">
                        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{group}</h2>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="divide-y divide-slate-100">
                                {TESTING_FORMS.filter((f) => f.group === group).map((f) => (
                                    <div key={f.id} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><f.Icon className="h-5 w-5" /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-900">{f.label}</p>
                                            <p className="truncate text-sm text-slate-500">{f.desc}</p>
                                        </div>
                                        <Button size="sm" onClick={() => setOpenForm(f.id)}>Test form <ArrowRight className="h-4 w-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <p>Opening a form shows the <span className="font-semibold text-slate-600">Email</span> tab (what the previous employer receives) and the <span className="font-semibold text-slate-600">Recipient form</span> tab (what they fill in and submit), pre-filled with the applicant's details.</p>
                </div>
            </div>
        </div>
    );
}
