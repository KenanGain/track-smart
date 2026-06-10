// Off-screen render of the ACTUAL ApplicationFormDef → html2canvas per .pdf-page
// → jsPDF compose → download. Mirrors generateFmcsaPdf.ts. Produces a blank form
// when no `values`, or a filled form when values are supplied.

import { createRoot, type Root } from 'react-dom/client';
import { createElement, Fragment } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ApplicationFormPrint, type ApplicationFormPrintProps, type PdfVariant } from './ApplicationFormPrint';
import { applyBrandTokens } from './company-branding.data';
import type { ApplicationFormDef } from './application-forms.data';
import type { CompanyBranding } from './company-branding.data';

/** Resolve {{company}} / {{address}} / … tokens in a form's copy. */
function resolveFormTokens(form: ApplicationFormDef, b: CompanyBranding): ApplicationFormDef {
    return {
        ...form,
        fields: form.fields.map((f) => ({
            ...f,
            label: applyBrandTokens(f.label, b),
            instruction: applyBrandTokens(f.instruction, b),
            options: Array.isArray(f.options) ? f.options.map((o) => applyBrandTokens(o, b)) : f.options,
        })),
    };
}

export interface GenerateApplicationFormPdfOptions extends ApplicationFormPrintProps {
    fileName?: string;
    /** 'download' (default) saves; 'view' opens a new tab; 'blob' returns a blob URL for inline preview. */
    mode?: 'download' | 'view' | 'blob';
}

const waitForPaint = () =>
    new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

export async function generateApplicationFormPdf(options: GenerateApplicationFormPdfOptions): Promise<void | string> {
    const { fileName, mode = 'download', ...printProps } = options;

    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
        'position:fixed', 'left:-10000px', 'top:0', 'width:794px',
        'background:#ffffff', 'z-index:-1', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(host);

    // Resolve branding tokens ({{company}}, {{address}}, …) in the form copy so the
    // printed PDF reads with the carrier's own name, matching the live form.
    const b = printProps.branding;
    const resolvedForm = {
        ...printProps.form,
        fields: printProps.form.fields.map((f) => ({
            ...f,
            label: applyBrandTokens(f.label, b),
            instruction: applyBrandTokens(f.instruction, b),
            options: Array.isArray(f.options) ? f.options.map((o) => applyBrandTokens(o, b)) : f.options,
        })),
    };

    let root: Root | null = null;
    try {
        root = createRoot(host);
        root.render(createElement(ApplicationFormPrint, { ...printProps, form: resolvedForm }));

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

        const base = (fileName || defaultFileName(printProps)).replace(/[\\/:*?"<>|]/g, '-');
        if (mode === 'blob') {
            // Return a blob URL so callers can preview it inline (e.g. in an iframe).
            return pdf.output('bloburl') as unknown as string;
        } else if (mode === 'view') {
            // Open the rendered PDF in a new tab for previewing (no download).
            const url = pdf.output('bloburl');
            const win = window.open(url as unknown as string, '_blank');
            if (!win) pdf.save(base); // popup blocked → fall back to download
        } else {
            pdf.save(base);
        }
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

export interface GenerateTemplatePdfOptions {
    templateName: string;
    forms: ApplicationFormDef[];
    branding: CompanyBranding;
    variant?: PdfVariant;
    fileName?: string;
    /** 'download' saves, 'view' opens a tab, 'blob' returns a blob URL for inline preview. */
    mode?: 'download' | 'view' | 'blob';
}

/**
 * Render an entire hiring template — every form in order — into ONE combined PDF.
 * Each form contributes its own paginated pages (with the shared branded letterhead),
 * concatenated back-to-back so the whole packet downloads as a single document.
 */
export async function generateTemplatePdf(options: GenerateTemplatePdfOptions): Promise<string | void> {
    const { templateName, forms, branding, variant = 'standard', fileName, mode = 'download' } = options;
    if (forms.length === 0) return;

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
        root.render(createElement(Fragment, null,
            forms.map((f) => createElement(ApplicationFormPrint, {
                key: f.id,
                form: resolveFormTokens(f, branding),
                branding,
                variant,
            })),
        ));

        await waitForPaint();
        await new Promise((r) => setTimeout(r, 140));
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
                scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false,
                windowWidth: el.offsetWidth, windowHeight: el.offsetHeight,
            });
            const img = canvas.toDataURL('image/jpeg', 0.92);
            if (i > 0) pdf.addPage();
            pdf.addImage(img, 'JPEG', 0, 0, pageWpt, pageHpt, undefined, 'FAST');
        }

        const base = (fileName || `hiring-template-${templateName.replace(/\s+/g, '-').toLowerCase()}.pdf`).replace(/[\\/:*?"<>|]/g, '-');
        if (mode === 'blob') {
            return pdf.output('bloburl') as unknown as string;
        } else if (mode === 'view') {
            const url = pdf.output('bloburl');
            const win = window.open(url as unknown as string, '_blank');
            if (!win) pdf.save(base);
        } else {
            pdf.save(base);
        }
    } finally {
        try { root?.unmount(); } catch { /* ignore */ }
        try { document.body.removeChild(host); } catch { /* ignore */ }
    }
}
