import { useEffect, useState } from "react";
import { FlaskConical, FileText, ArrowRight, Briefcase, ClipboardCheck, Trash2, Eye, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { buildPrefill } from "./application-prefill";
import { RecipientFormPreview, type RecipientDoc } from "./RecipientFormPreview";
import { RoadTestPreview } from "./RoadTestPreview";
import { useApplicants } from "./applicants.data";
import { useSavedTestForms, type SavedTestForm } from "./testing-saved-forms.data";

// The Safety Performance History (§391.23) forms an admin can open and test from Settings.
// Each form is emailed with a checklist of supporting documents the previous employer is
// asked to attach, alongside the secure form link.
const TESTING_FORMS: { id: string; label: string; desc: string; Icon: typeof FlaskConical; group: string; docs: RecipientDoc[] }[] = [
    { id: "employment-verification", label: "Employment Verification", desc: "§391.23 employment verification — previous employer confirmation.", Icon: Briefcase, group: "Employment", docs: [
        { key: "experience-letter", label: "Employer Experience Letter", note: "Signed letter confirming the driver's employment and experience." },
        { key: "insurance-letter", label: "Insurance Experience Letter", note: "Letter confirming insurance / loss history while employed." },
    ] },
    { id: "road-test", label: "Road Test Evaluation", desc: "FMCSA §391.31 — open and fill the examiner's evaluation form (scored sections + certification).", Icon: ClipboardCheck, group: "Road Test", docs: [
        { key: "road-test-certificate", label: "Road Test Certificate", note: "Signed §391.31 record / certificate of road test." },
    ] },
];

const GROUPS = ["Employment", "Road Test"];

export function TestingFormsPage() {
    const { applicants } = useApplicants();
    const { saved, save, remove } = useSavedTestForms();
    const [tab, setTab] = useState<"testing" | "saved">("testing");
    const [openForm, setOpenForm] = useState<string | null>(null);
    const [reopen, setReopen] = useState<SavedTestForm | null>(null);   // saved entry being reopened (restores values)

    // Use the first applicant's data to pre-fill forms so they show realistic content.
    const prefill = applicants[0] ? buildPrefill(applicants[0]) : null;
    const driverName = prefill?.fullName ?? "the applicant";
    const closeForm = () => { setOpenForm(null); setReopen(null); };

    // Seed a default Road Test Evaluation copy into Saved forms once, so the examiner's
    // §391.31 evaluation form is always available to reopen straight from this page.
    // Saving from a test re-uses the same (formId + driverName) key, so this seed is
    // updated in place rather than duplicated.
    useEffect(() => {
        if (!prefill) return;                                              // wait for applicant data
        if (window.localStorage.getItem("hp_testing_saved_seeded_v1")) return;
        window.localStorage.setItem("hp_testing_saved_seeded_v1", "1");
        if (!saved.some((s) => s.formId === "road-test")) {
            save({ formId: "road-test", label: "Road Test Evaluation", driverName, status: "draft", values: {} });
        }
    }, [prefill, driverName, save, saved]);

    // Road Test is conducted internally by an examiner — Compose (assign) · Email · Recipient form.
    if (openForm === "road-test") {
        return <RoadTestPreview driverName={driverName} carrier={applicants[0]?.carrier ?? "Acme Logistics"} prefill={prefill}
            initialValues={reopen?.formId === "road-test" ? reopen.values : undefined}
            onSave={(info) => save({ formId: "road-test", label: "Road Test Evaluation", driverName, examiner: info.examiner, status: info.status, values: info.values })}
            onBack={closeForm} />;
    }

    if (openForm) {
        const meta = TESTING_FORMS.find((f) => f.id === openForm);
        return (
            <RecipientFormPreview
                formId={openForm}
                label={meta?.label ?? "Form"}
                applicantName={driverName}
                prefill={prefill}
                requestDocs={meta?.docs ?? []}
                forms={TESTING_FORMS.filter((f) => f.group === meta?.group).map((f) => ({ key: f.id, label: f.label }))}
                onBack={closeForm}
            />
        );
    }

    const openTest = (formId: string) => { setReopen(null); setOpenForm(formId); };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto max-w-5xl px-6 py-8">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Hiring Setup</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">Testing Forms</h1>
                <p className="mt-1.5 text-sm text-slate-500">Open a form to preview the <span className="font-semibold text-slate-600">email</span> the recipient receives and the <span className="font-semibold text-slate-600">form</span> they complete. Saved drafts and submissions appear under <span className="font-semibold text-slate-600">Saved forms</span>.</p>

                {/* Tabs — Testing list vs Saved forms */}
                <div className="mt-5 inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                    {([["testing", "Testing", FlaskConical], ["saved", "Saved forms", Inbox]] as const).map(([key, lbl, Icon]) => (
                        <button key={key} type="button" onClick={() => setTab(key)}
                            className={cn("inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition", tab === key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50")}>
                            <Icon className="h-4 w-4" /> {lbl}
                            {key === "saved" && saved.length > 0 && <span className={cn("ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold", tab === key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600")}>{saved.length}</span>}
                        </button>
                    ))}
                </div>

                {tab === "testing" ? (
                    <>
                        {GROUPS.map((group) => (
                            <div key={group} className="mt-7">
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
                                                <Button size="sm" onClick={() => openTest(f.id)}>Test form <ArrowRight className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            <p>Opening a form shows the <span className="font-semibold text-slate-600">Email</span> tab (what the recipient receives) and the <span className="font-semibold text-slate-600">Recipient form</span> tab (what they fill in and submit), pre-filled with the applicant's details. The <span className="font-semibold text-slate-600">Road Test</span> first assigns an examiner, then opens the evaluation form.</p>
                        </div>
                    </>
                ) : (
                    <div className="mt-7">
                        {saved.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox className="h-7 w-7" /></div>
                                <h3 className="mt-4 text-base font-bold text-slate-800">No saved forms yet</h3>
                                <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">When you save a draft or submit a form while testing, it shows up here so you can reopen it.</p>
                                <Button variant="outline" size="sm" className="mt-5" onClick={() => setTab("testing")}>Go to Testing</Button>
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="divide-y divide-slate-100">
                                    {saved.map((s) => (
                                        <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><ClipboardCheck className="h-5 w-5" /></div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate font-semibold text-slate-900">{s.label}</p>
                                                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", s.status === "submitted" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{s.status === "submitted" ? "Submitted" : "Draft"}</span>
                                                </div>
                                                <p className="truncate text-sm text-slate-500">{s.driverName}{s.examiner ? ` · ${s.examiner}` : ""} · saved {new Date(s.savedAt).toLocaleString()}</p>
                                            </div>
                                            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setReopen(s); setOpenForm(s.formId); }}><Eye className="h-4 w-4" /> Reopen</Button>
                                            <button type="button" onClick={() => remove(s.id)} title="Remove" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
