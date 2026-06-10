import { useRef, useState } from "react";
import { ChevronLeft, Eye, Printer, Download, Sparkles, Info } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CompanyBranding } from "../ats/company-branding.data";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";

/**
 * Shared shell for hiring-process forms: consistent top bar (Fill sample data /
 * PDF Preview), themed document preview (Standard / Compact / Enhanced / B&W)
 * with Print + Download, and a titled edit body. Each form supplies its fields
 * (children) and the computed preview `sections`.
 */
export function FormScaffold({ title, Icon, intro, onBack, onFillSample, docTitle, docSubtitle, badge, sections, branding, fileName, children, embedded, startPreview }: {
    title: string;
    Icon: React.ElementType;
    intro?: React.ReactNode;
    onBack: () => void;
    onFillSample: () => void;
    docTitle: string;
    docSubtitle?: string;
    badge?: string;
    sections: DocSection[];
    branding: CompanyBranding;
    fileName: string;
    children: React.ReactNode;
    /** Applicant-mode: render only the fields inline (no admin bar, preview or footer). */
    embedded?: boolean;
    /** Open directly in the themed PDF preview. */
    startPreview?: boolean;
}) {
    const [preview, setPreview] = useState(!!startPreview);
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const downloadPdf = async () => {
        const el = docRef.current;
        if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(fileName);
        } finally { setDownloading(false); }
    };

    // Applicant-mode: just the fields, framed by the wizard around it.
    if (embedded) {
        return (
            <div className="space-y-6">
                {intro && (
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                        <p className="text-sm text-slate-600">{intro}</p>
                    </div>
                )}
                {children}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Forms
                </button>
                {preview ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {THEMES.map((t) => (
                                <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                        <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onFillSample}><Sparkles className="h-4 w-4" /> Fill sample data</Button>
                        <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                    </div>
                )}
            </div>

            {preview ? (
                <div className="px-6 py-8">
                    <FormDocument ref={docRef} title={docTitle} subtitle={docSubtitle} badge={badge} sections={sections} theme={theme} branding={branding} />
                </div>
            ) : (
                <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><Icon className="h-6 w-6 text-blue-600" /> {title}</h1>
                    </div>
                    {intro && (
                        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                            <p className="text-sm text-slate-600">{intro}</p>
                        </div>
                    )}
                    {children}
                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button>Save form</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

/** Section heading used inside form bodies. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">{children}</h2>;
}
