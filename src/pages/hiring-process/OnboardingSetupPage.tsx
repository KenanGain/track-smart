import { ArrowRight, FileText, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { policyDocuments } from "./policy-forms.data";

/**
 * Settings → Hiring Process → Onboarding Setup
 *
 * Configures what a newly-hired driver completes during onboarding. The first
 * section is Policy Documents — company / FMCSA policy statements the driver
 * reviews and signs at onboarding (these are NOT application consents).
 */
export function OnboardingSetupPage({ onNavigate }: { onNavigate: (path: string) => void }) {
    const docs = policyDocuments();
    const openDoc = (id: string) => onNavigate(`/settings/hiring-process/policy/${id}`);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Hiring · Onboarding</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Onboarding Setup</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Configure what a newly-hired driver completes during onboarding.</p>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-8">
                {/* Section: Policy Documents */}
                <section>
                    <div className="mb-3 flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                            <ScrollText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-800">Policy Documents</h2>
                            <p className="text-xs text-slate-500">Company &amp; FMCSA policy statements the driver reviews and signs during onboarding — not part of the application consents.</p>
                        </div>
                        <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{docs.length} documents</span>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="divide-y divide-slate-100">
                            {docs.map((d) => (
                                <div key={d.id} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-slate-900">{d.title} {d.accentTitle}</p>
                                        <p className="truncate text-sm text-slate-500">{d.blurb}</p>
                                    </div>
                                    <Button size="sm" onClick={() => openDoc(d.id)}>
                                        Open document <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
