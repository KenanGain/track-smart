// Off-screen render of the ACTUAL ApplicationFormDef → html2canvas per .pdf-page
// → jsPDF compose → download. Mirrors generateFmcsaPdf.ts. Produces a blank form
// when no `values`, or a filled form when values are supplied.

import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ApplicationFormPrint, type ApplicationFormPrintProps } from './ApplicationFormPrint';

export interface GenerateApplicationFormPdfOptions extends ApplicationFormPrintProps {
    fileName?: string;
}

const waitForPaint = () =>
    new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

export async function generateApplicationFormPdf(options: GenerateApplicationFormPdfOptions): Promise<void> {
    const { fileName, ...printProps } = options;

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
        'position:fixed', 'left:-10000px', 'top:0', 'width:794px',
        'background:#ffffff', 'z-index:-1', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(host);

    let root: Root | null = null;
    try {
        root = createRoot(host);
        root.render(createElement(ApplicationFormPrint, printProps));

        await waitForPaint();
        // Give the logo <img> and webfonts a moment to paint before capture.
        await new Promise((r) => setTimeout(r, 120));
        await waitForPaint();
        if ((document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready) {
            try { await (document as { fonts: { ready: Promise<unknown> } }).fonts.ready; } catch { /* ignore */ }
        }

        const pages = host.querySelectorAll<HTMLElement>('.pdf-page');
        if (pages.length === 0) throw new Error('No PDF pages rendered.');

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
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
            const img = canvas.toDataURL('image/jpeg', 0.92);
            if (i > 0) pdf.addPage();
            pdf.addImage(img, 'JPEG', 0, 0, pageWpt, pageHpt, undefined, 'FAST');
        }

        const base = fileName || defaultFileName(printProps);
        pdf.save(base.replace(/[\\/:*?"<>|]/g, '-'));
    } finally {
        try { root?.unmount(); } catch { /* ignore */ }
        try { document.body.removeChild(host); } catch { /* ignore */ }
    }
}

function defaultFileName(props: ApplicationFormPrintProps): string {
    const name = (props.form.name || 'application').replace(/\s+/g, '-').toLowerCase();
    const mode = props.values && Object.keys(props.values).length ? 'filled' : 'blank';
    return `application-${name}-${mode}.pdf`;
}
