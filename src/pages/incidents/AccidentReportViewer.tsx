import { useState } from 'react';
import { ChevronLeft, Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';
import { AccidentReportDocument, type ReportTheme } from './AccidentReportDocument';
import { accidentReportFileName } from './accident-report';
import { type AccidentRecord } from '@/data/accident-records.data';

/**
 * Themed accident-report viewer — mirrors the hiring document viewer (theme tabs + Print +
 * Download PDF via html2canvas + jsPDF). The captured document (#app-doc) is rendered with
 * inline hex colors so html2canvas can rasterize it (Tailwind v4 oklch() is unparseable).
 */
const THEMES: { key: ReportTheme; name: string }[] = [
    { key: 'standard', name: 'Standard' },
    { key: 'compact', name: 'Compact' },
    { key: 'enhanced', name: 'Enhanced' },
    { key: 'traditional', name: 'Traditional' },
    { key: 'bw', name: 'Black & White' },
];

export function AccidentReportViewer({ record, onBack, accountId }: { record: AccidentRecord; onBack: () => void; accountId?: string }) {
    const [theme, setTheme] = useState<ReportTheme>('standard');
    const [downloading, setDownloading] = useState(false);

    const downloadPdf = async () => {
        const el = document.getElementById('app-doc');
        if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL('image/png');
            pdf.addImage(img, 'PNG', 0, position, pageW, imgH); heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, 'PNG', 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(accidentReportFileName(record));
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
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Back to accident</button>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {THEMES.map(t => (
                            <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition', theme === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white')}>{t.name}</button>
                        ))}
                    </div>
                    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print</button>
                    <button type="button" onClick={downloadPdf} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Download className="h-4 w-4" /> {downloading ? 'Generating…' : 'Download PDF'}</button>
                </div>
            </div>

            <div className="px-4 py-8">
                <div className="mx-auto max-w-[860px] overflow-hidden rounded shadow-sm ring-1 ring-slate-200">
                    <AccidentReportDocument record={record} theme={theme} accountId={accountId} />
                </div>
                <p className="no-print mx-auto mt-6 max-w-[860px] text-center text-[12px] text-slate-400">This report covers the accident up to the Claim section — the internal Verification / Review is not included.</p>
            </div>
        </div>
    );
}
