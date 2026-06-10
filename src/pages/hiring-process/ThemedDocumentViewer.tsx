import { useRef, useState } from "react";
import { ChevronLeft, Printer, Download, FileText } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCompanyBranding } from "../ats/company-branding.data";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";

/** Themed, printable document shell (theme tabs + Print + Download PDF). */
export function ThemedDocumentViewer({ title, subtitle, badge, sections, fileName, onBack, backLabel = "Back", emptyTitle = "Nothing to show", emptyText = "" }: {
    title: string;
    subtitle?: string;
    badge?: string;
    sections: DocSection[];
    fileName: string;
    onBack: () => void;
    backLabel?: string;
    emptyTitle?: string;
    emptyText?: string;
}) {
    const [branding] = useCompanyBranding();
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
            pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(fileName);
        } finally { setDownloading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> {backLabel}</button>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {THEMES.map((t) => (
                            <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                    <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                </div>
            </div>

            {sections.length ? (
                <div className="px-6 py-8">
                    <FormDocument ref={docRef} title={title} subtitle={subtitle} badge={badge} sections={sections} theme={theme} branding={branding} />
                </div>
            ) : (
                <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500"><FileText className="h-7 w-7" /></div>
                    <h2 className="mt-5 text-lg font-semibold text-slate-800">{emptyTitle}</h2>
                    {emptyText && <p className="mt-1.5 text-sm text-slate-500">{emptyText}</p>}
                    <Button variant="outline" className="mt-6" onClick={onBack}>Back</Button>
                </div>
            )}
        </div>
    );
}
