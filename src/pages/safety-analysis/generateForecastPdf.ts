/**
 * Safety Forecast PDF generator.
 *
 * Spec: docs/SAFETY_EXPORT_PLAN.md §3.5.
 *
 * Mirrors `generateFmcsaPdf.ts` exactly:
 *   off-screen mount → wait for paint + fonts → html2canvas at 2× → jsPDF compose.
 *
 * The only difference is the React component being rendered.
 */

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
    SafetyForecastPdfReport,
    type SafetyForecastPdfReportProps,
} from './SafetyForecastPdfReport';

export interface GenerateForecastPdfOptions extends SafetyForecastPdfReportProps {
    fileName?: string;
    /** When true, returns the Blob instead of triggering a download — used by
     *  the ZIP exporter to bundle multiple PDFs. */
    returnBlob?: boolean;
}

/** Wait for fonts and chart layout to settle. Recharts needs ~2 frames. */
const waitForPaint = () =>
    new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );

export async function generateForecastPdf(
    options: GenerateForecastPdfOptions,
): Promise<Blob | void> {
    const { fileName, returnBlob, ...reportProps } = options;

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
        'position:fixed',
        'left:-10000px',
        'top:0',
        'width:794px',
        'background:#ffffff',
        'z-index:-1',
        'pointer-events:none',
    ].join(';');
    document.body.appendChild(host);

    let root: Root | null = null;
    try {
        root = createRoot(host);
        root.render(createElement(SafetyForecastPdfReport, reportProps));

        await waitForPaint();
        await new Promise((r) => setTimeout(r, 350));
        await waitForPaint();
        const fonts = (document as unknown as { fonts?: { ready?: Promise<unknown> } }).fonts;
        if (fonts?.ready) {
            try { await fonts.ready; } catch { /* ignore */ }
        }

        const pages = host.querySelectorAll<HTMLElement>('.pdf-page');
        if (pages.length === 0) throw new Error('No PDF pages rendered.');

        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'pt',
            format: 'a4',
            compress: true,
        });
        const pageWpt = pdf.internal.pageSize.getWidth();
        const pageHpt = pdf.internal.pageSize.getHeight();

        for (let i = 0; i < pages.length; i++) {
            const el = pages[i];
            // eslint-disable-next-line no-await-in-loop
            const canvas = await html2canvas(el, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                logging: false,
                windowWidth: el.offsetWidth,
                windowHeight: el.offsetHeight,
            });
            // PNG keeps text edges crisp (no JPEG artifacting) at the cost of
            // a larger file. The premium-feel boost is worth it for executive
            // reports — text is readable at 100% zoom on a retina screen.
            const img = canvas.toDataURL('image/png');
            if (i > 0) pdf.addPage();
            pdf.addImage(img, 'PNG', 0, 0, pageWpt, pageHpt, undefined, 'FAST');
        }

        const safeName = (fileName || defaultFileName(reportProps)).replace(/[\\/:*?"<>|]/g, '-');
        if (returnBlob) {
            return pdf.output('blob');
        }
        pdf.save(safeName);
    } finally {
        try { root?.unmount(); } catch { /* ignore */ }
        try { document.body.removeChild(host); } catch { /* ignore */ }
    }
}

function defaultFileName(p: SafetyForecastPdfReportProps): string {
    const carrier = (p.carrierName || 'Carrier').replace(/\s+/g, '_');
    const horizon = `${p.forecast.horizonMonths}mo`;
    const d = (p.reportDate || new Date()).toISOString().slice(0, 10);
    return `Safety-Forecast_${carrier}_${horizon}_${d}.pdf`;
}
