import { useState } from "react";
import { CreditCard, FileCheck2, Upload, Send, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ComplianceUploadModal } from "@/components/compliance/ComplianceUploadModal";
import type { UploadedDocument } from "@/types/key-numbers.types";
import type { RoadTestDoc } from "./applicants.data";

export type EquivalentResult = {
    method: "license" | "document";
    documents: RoadTestDoc[];
    values: Record<string, unknown>;
};
type Kind = "license" | "document";
const tiny = "h-7 gap-1 px-2 text-xs";

const EQUIVS: { kind: Kind; icon: typeof CreditCard; title: string; sub: string }[] = [
    { kind: "license", icon: CreditCard, title: "License accepted as equivalent", sub: "Driver's valid CDL · §391.33(a)(1)" },
    { kind: "document", icon: FileCheck2, title: "Prior certificate accepted as equivalent", sub: "Prior §391.31 certificate (last 3 years) · §391.33(a)(2)" },
];

/**
 * §391.33 road-test equivalents — collected on the hiring page (asked of the driver):
 *   (a)(1) a valid CDL, or (a)(2) a prior §391.31 certificate.
 * Each is an EmployerCard-style row with Review · Upload/Replace · Send request. Upload opens a
 * front/back popup (licence) or single upload (prior cert); Send request opens the Ask / Order
 * dialog (handled by the parent); Review opens the uploaded document(s) with a Reviewer Sign-Off.
 */
export function RoadTestEquivalent({ captured, requested, onCapture, onRequest, onReview }: {
    captured?: { kind: Kind; documents: RoadTestDoc[] };
    requested: Kind[];
    onCapture: (r: EquivalentResult) => void;
    onRequest: (kind: Kind) => void;
    onReview: (kind: Kind) => void;
}) {
    const [uploadKind, setUploadKind] = useState<Kind | null>(null);

    const saveUpload = (kind: Kind) => (docs: UploadedDocument[]) => {
        setUploadKind(null);
        if (docs.length === 0) return;
        if (kind === "license") {
            const documents: RoadTestDoc[] = docs.map((d) => ({ label: `Driver's licence — ${d.slotLabel ?? "copy"}`, fileName: d.fileName, kind: "license" }));
            onCapture({ method: "license", documents, values: { "f-ats-rt-equiv-method": "License accepted as equivalent", "f-ats-rt-lic-docs": docs } });
        } else {
            const documents: RoadTestDoc[] = docs.map((d) => ({ label: "Prior road-test certificate", fileName: d.fileName, kind: "document" }));
            onCapture({ method: "document", documents, values: { "f-ats-rt-equiv-method": "Prior certificate accepted as equivalent", "f-ats-rt-prior-docs": docs } });
        }
    };

    return (
        <div className="mt-3">
            <div className="mb-2.5 flex items-center gap-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">or accept an equivalent (§391.33) — provided by the driver</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="space-y-3">
                {EQUIVS.map(({ kind, icon: Icon, title, sub }) => {
                    const isCaptured = captured?.kind === kind;
                    const docs = isCaptured ? captured!.documents : [];
                    return (
                        <div key={kind} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500"><Icon className="h-4 w-4" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                                    <p className="text-xs text-slate-500">{sub}</p>
                                </div>
                                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", isCaptured ? "bg-emerald-100 text-emerald-700" : requested.includes(kind) ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{isCaptured ? "Uploaded" : requested.includes(kind) ? "Requested" : "Not requested"}</span>
                            </div>

                            {isCaptured && (
                                <div className="mt-3 space-y-1.5">
                                    {docs.map((d, i) => (
                                        <div key={i} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-3.5 w-3.5" /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px] font-medium text-slate-800">{d.label}</p>
                                                {d.fileName && <p className="truncate text-xs text-slate-500">{d.fileName}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-3 flex flex-wrap gap-1.5">
                                <Button variant="outline" className={tiny} disabled={!isCaptured} onClick={() => onReview(kind)}><Eye className="h-3.5 w-3.5" /> Review</Button>
                                <Button className={tiny} onClick={() => setUploadKind(kind)}>{isCaptured ? <><RotateCcw className="h-3.5 w-3.5" /> Replace</> : <><Upload className="h-3.5 w-3.5" /> Upload</>}</Button>
                                <Button variant="outline" className={tiny} onClick={() => onRequest(kind)}><Send className="h-3.5 w-3.5" /> Send request</Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Upload popup — front & back */}
            <ComplianceUploadModal
                isOpen={uploadKind === "license"}
                onClose={() => setUploadKind(null)}
                title="Driver's Licence — accepted as road-test equivalent (§391.33)"
                numberOfSlots={2}
                slotLabels={["Front", "Back"]}
                issueDateRequired
                expiryRequired
                issueStateRequired
                issueCountryRequired
                existing={[]}
                onSave={saveUpload("license")}
            />
            <ComplianceUploadModal
                isOpen={uploadKind === "document"}
                onClose={() => setUploadKind(null)}
                title="Prior Road-Test Certificate — accepted as equivalent (§391.33)"
                numberOfSlots={1}
                existing={[]}
                onSave={saveUpload("document")}
            />
        </div>
    );
}
