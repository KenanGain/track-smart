import { ChevronLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriverLicenseForm } from "./DriverLicenseForm";
import { DriverAbstractForm } from "./DriverAbstractForm";
import { EmploymentVerificationForm } from "./EmploymentVerificationForm";
import { ScreeningReportForm } from "./ScreeningReportForm";
import { CVDR_CDA_TYPE } from "./screening-reports.data";
import { CriminalBackgroundForm } from "./CriminalBackgroundForm";
import { SubstanceTestingForm } from "./SubstanceTestingForm";
import { AccidentHistoryForm } from "./AccidentHistoryForm";
import { DrugAlcoholHistoryForm } from "./DrugAlcoholHistoryForm";
import { DotVerificationForm } from "./DotVerificationForm";
import { MedicalCardForm } from "./MedicalCardForm";
import { AnnualReviewForm } from "./AnnualReviewForm";
import { ClearinghouseQueryForm } from "./ClearinghouseQueryForm";
import { PolicyForm } from "./PolicyForm";
import { POLICY_FORMS } from "./policy-forms.data";
import { RoadTestForm } from "../ats/RoadTestForm";
import { loadApplicationForms } from "../ats/application-forms.data";

function StepPlaceholder({ title, desc, onBack }: { title: string; desc: string; onBack: () => void }) {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Back</button>
            </div>
            <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500"><FileText className="h-7 w-7" /></div>
                <h2 className="mt-5 text-lg font-semibold text-slate-800">{title}</h2>
                <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
                <Button variant="outline" className="mt-6" onClick={onBack}>Back</Button>
            </div>
        </div>
    );
}

/** Renders the right form component for any catalog id. Always returns an element.
 *  `embedded` strips the admin chrome so the form renders inline as the applicant sees it. */
export function HiringFormView({ formId, onBack, embedded, startPreview, onSignOff }: { formId: string; onBack: () => void; embedded?: boolean; startPreview?: boolean; onSignOff?: () => void }) {
    if (formId === "driver-license") return <DriverLicenseForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "mvr") return <DriverAbstractForm variant="mvr" onBack={onBack} embedded={embedded} startPreview={startPreview} onSignOff={onSignOff} />;
    if (formId === "driver-abstract") return <DriverAbstractForm variant="abstract" onBack={onBack} embedded={embedded} startPreview={startPreview} onSignOff={onSignOff} />;
    if (formId === "employment-verification") return <EmploymentVerificationForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "psp") return <ScreeningReportForm fixedType="PSP — Pre-Employment Screening Program" onBack={onBack} embedded={embedded} startPreview={startPreview} onSignOff={onSignOff} />;
    // CVDR and CDA are captured together as one combined Canadian record. Legacy ids kept for saved data.
    if (formId === "cvdr-cda") return <ScreeningReportForm fixedType={CVDR_CDA_TYPE} onBack={onBack} embedded={embedded} startPreview={startPreview} onSignOff={onSignOff} />;
    if (formId === "cvdr") return <ScreeningReportForm fixedType="CVDR — Commercial Vehicle Driver Record" onBack={onBack} embedded={embedded} startPreview={startPreview} onSignOff={onSignOff} />;
    if (formId === "cda") return <ScreeningReportForm fixedType="CDA — Commercial Driver Abstract" onBack={onBack} embedded={embedded} startPreview={startPreview} onSignOff={onSignOff} />;
    if (formId === "criminal-background") return <CriminalBackgroundForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "substance-testing") return <SubstanceTestingForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "accident-history") return <AccidentHistoryForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "drug-alcohol-history") return <DrugAlcoholHistoryForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "dot-verification") return <DotVerificationForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "medical-card") return <MedicalCardForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "annual-review") return <AnnualReviewForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;
    if (formId === "clearinghouse-query") return <ClearinghouseQueryForm onBack={onBack} embedded={embedded} startPreview={startPreview} />;

    const policyDef = POLICY_FORMS.find((p) => p.id === formId);
    if (policyDef) return <PolicyForm def={policyDef} onBack={onBack} embedded={embedded} />;

    if (formId === "road-test") {
        const appForm = loadApplicationForms().find((f) => f.id === "form-ats-road-test");
        if (appForm) return <RoadTestForm appForm={appForm} onClose={onBack} />;
    }

    if (formId === "application") return <StepInfo embedded={embedded} title="Application" desc="The applicant completes the application form. The four application types are configured under Settings → Hiring Process → Applications." onBack={onBack} />;
    if (formId === "review") return <StepInfo embedded={embedded} title="Review" desc="Internal review of the submitted application and documents before moving the applicant forward." onBack={onBack} />;
    return <StepInfo embedded={embedded} title="Form" desc="This form isn’t available to preview yet." onBack={onBack} />;
}

function StepInfo({ title, desc, onBack, embedded }: { title: string; desc: string; onBack: () => void; embedded?: boolean }) {
    if (embedded) {
        return (
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500"><FileText className="h-4 w-4" /></div>
                <div><p className="font-semibold text-slate-800">{title}</p><p className="mt-0.5 text-sm text-slate-500">{desc}</p></div>
            </div>
        );
    }
    return <StepPlaceholder title={title} desc={desc} onBack={onBack} />;
}
