import { useState } from "react";
import { ChevronLeft, Eye, FlaskConical, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DqFileDocument } from "@/pages/dq-files/DqFileDocument";
import { emptyFill, type DqFileFill } from "@/pages/dq-files/dq-driver-files.data";
import { getDqChecklist } from "./settings-dq-checklists.data";

/**
 * DQ Checklist runner — the same checklist rendered two ways (matches the
 * Application Forms "Test" + "PDF view" actions):
 *   • "test" — interactive fill.
 *   • "pdf"  — read-only printable document (Download PDF = print).
 * This is the Settings-side preview: fill state is session-only (not persisted).
 * The document body + sign-off come from the shared <DqFileDocument>.
 */
export function SettingsDqChecklistRunner({ checklistId, initialMode, onBack }: {
    checklistId: string;
    initialMode: "test" | "pdf";
    onBack: () => void;
}) {
    const checklist = getDqChecklist(checklistId);
    const [mode, setMode] = useState<"test" | "pdf">(initialMode);
    const [fill, setFill] = useState<DqFileFill>(emptyFill);

    if (!checklist) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <Button variant="outline" size="sm" onClick={onBack}><ChevronLeft className="h-4 w-4" /> Back</Button>
                <p className="mt-6 text-sm text-slate-500">Checklist not found.</p>
            </div>
        );
    }

    const isPdf = mode === "pdf";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar (hidden when printing) */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Checklists
                </button>
                <div className="flex items-center gap-2">
                    {isPdf ? (
                        <>
                            <Button variant="outline" size="sm" onClick={() => setMode("test")}><FlaskConical className="h-4 w-4" /> Test</Button>
                            <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Download PDF</Button>
                        </>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setMode("pdf")}><Eye className="h-4 w-4" /> PDF view</Button>
                    )}
                </div>
            </div>

            <div className={cn("mx-auto max-w-4xl px-4 py-8 sm:px-6", isPdf && "print:px-0 print:py-0")}>
                {!isPdf && (
                    <p className="mb-3 text-xs text-slate-400">Test mode — set each item's verification, add notes, then switch to PDF view to print.</p>
                )}
                <DqFileDocument checklist={checklist} mode={mode} fill={fill} onFillChange={setFill} />
            </div>
        </div>
    );
}
