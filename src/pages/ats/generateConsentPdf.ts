import jsPDF from "jspdf";
import type { ConsentForm } from "./consent-forms.data";
import type { CompanyBranding } from "./company-branding.data";

/**
 * Generate a printable consent PDF.
 *
 * Layout (US Letter, 612 × 792 pt):
 *   1. Header bar — accent-coloured background with the company logo,
 *      company name + tagline + contact line. Logo defaults to a coloured
 *      square if no upload exists.
 *   2. Form title block — consent title, subtitle, citation.
 *   3. Consent body — paragraphs justified to the column width.
 *   4. Signature block — applicant name + signature image (when supplied) +
 *      date. When no signature is provided, an empty box is printed so the
 *      applicant can sign on paper.
 *   5. Footer — company address + page number.
 */

export interface ConsentPdfOptions {
    consent: ConsentForm;
    branding: CompanyBranding;
    /** Optional applicant name printed under the signature block. */
    applicantName?: string;
    /** Signature PNG data URL — when null, an empty signature box is printed. */
    signatureDataUrl?: string | null;
    /** ISO date when the form was signed. Defaults to today. */
    signedAt?: string;
    /** Whether to mark the document as a blank (no signature) or signed copy. */
    mode: 'blank' | 'signed';
}

export function generateConsentPdf(opts: ConsentPdfOptions): jsPDF {
    const { consent, branding, applicantName, signatureDataUrl, signedAt, mode } = opts;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 48;
    let y = 0;

    // ── 1. Header bar ───────────────────────────────────────────────
    const headerH = 84;
    const accent = hexToRgb(branding.accentColor) ?? { r: 37, g: 99, b: 235 };
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(0, 0, pageW, headerH, 'F');

    // Logo
    if (branding.logoDataUrl) {
        try {
            // jsPDF auto-detects format from the data URL prefix.
            doc.addImage(branding.logoDataUrl, 'PNG', marginX, 18, 48, 48, undefined, 'FAST');
        } catch {
            drawLogoFallback(doc, marginX, 18, accent);
        }
    } else {
        drawLogoFallback(doc, marginX, 18, accent);
    }

    // Company name + tagline
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(branding.name, marginX + 64, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (branding.tagline) {
        doc.setTextColor(255, 255, 255);
        doc.text(branding.tagline, marginX + 64, 56);
    }
    // Contact line (right-aligned)
    const contact = [branding.phone, branding.email].filter(Boolean).join('  ·  ');
    if (contact) {
        doc.setFontSize(9);
        doc.text(contact, pageW - marginX, 40, { align: 'right' });
    }
    if (branding.address) {
        doc.setFontSize(9);
        doc.text(branding.address, pageW - marginX, 56, { align: 'right' });
    }

    y = headerH + 28;

    // ── 2. Form title block ────────────────────────────────────────
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(consent.title, marginX, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(consent.subtitle, marginX, y);
    y += 14;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Regulatory citation: ' + consent.citation, marginX, y);
    y += 8;

    // Mode pill (Blank / Signed)
    const pillX = pageW - marginX - 90;
    doc.setFillColor(mode === 'signed' ? 16  : 148, mode === 'signed' ? 185 : 163, mode === 'signed' ? 129 : 184);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.roundedRect(pillX, y - 24, 90, 20, 4, 4, 'F');
    doc.text(mode === 'signed' ? 'SIGNED COPY' : 'BLANK COPY', pillX + 45, y - 11, { align: 'center' });

    // Divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.line(marginX, y + 8, pageW - marginX, y + 8);
    y += 26;

    // ── 3. Consent body ─────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const lineHeight = 14;
    const bodyWidth = pageW - marginX * 2;

    for (const paragraph of consent.body) {
        const lines = doc.splitTextToSize(paragraph, bodyWidth);
        for (const line of lines) {
            if (y > pageH - 200) { // leave room for the signature block
                doc.addPage();
                y = 56;
            }
            doc.text(line, marginX, y);
            y += lineHeight;
        }
        y += 4; // paragraph gap
    }

    // ── 4. Signature block ─────────────────────────────────────────
    if (y > pageH - 200) {
        doc.addPage();
        y = 56;
    }

    y += 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, y, pageW - marginX, y);
    y += 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Applicant signature', marginX, y);
    y += 6;

    const sigBoxX = marginX;
    const sigBoxY = y + 4;
    const sigBoxW = 280;
    const sigBoxH = 72;

    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(1);
    doc.rect(sigBoxX, sigBoxY, sigBoxW, sigBoxH);

    if (signatureDataUrl) {
        try {
            doc.addImage(signatureDataUrl, 'PNG', sigBoxX + 8, sigBoxY + 8, sigBoxW - 16, sigBoxH - 16, undefined, 'FAST');
        } catch { /* ignore */ }
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text('Sign within the box.', sigBoxX + sigBoxW / 2, sigBoxY + sigBoxH / 2, { align: 'center' });
    }

    // Right column — name + date
    const rightX = pageW - marginX - 220;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Print name', rightX, sigBoxY + 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(applicantName ?? '__________________________________', rightX, sigBoxY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Date', rightX, sigBoxY + 50);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const dateStr = signedAt ?? (mode === 'signed' ? new Date().toISOString().slice(0, 10) : '____________________');
    doc.text(dateStr, rightX, sigBoxY + 64);

    // ── 5. Footer ───────────────────────────────────────────────────
    const footerY = pageH - 32;
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, footerY - 12, pageW - marginX, footerY - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    if (branding.address) doc.text(branding.address, marginX, footerY);
    doc.text(`${branding.name} · ${consent.title}`, pageW / 2, footerY, { align: 'center' });
    doc.text(`Page ${doc.getNumberOfPages()}`, pageW - marginX, footerY, { align: 'right' });

    return doc;
}

export function downloadConsentPdf(opts: ConsentPdfOptions, filenameSuffix = '') {
    const doc = generateConsentPdf(opts);
    const baseName = opts.consent.id.replace(/_/g, '-');
    const mode = opts.mode === 'signed' ? 'signed' : 'blank';
    const name = `${baseName}-${mode}${filenameSuffix ? '-' + filenameSuffix : ''}.pdf`;
    doc.save(name);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function drawLogoFallback(doc: jsPDF, x: number, yPos: number, accent: { r: number; g: number; b: number }) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, yPos, 48, 48, 6, 6, 'F');
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('★', x + 24, yPos + 31, { align: 'center' });
}
