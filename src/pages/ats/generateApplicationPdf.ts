import jsPDF from "jspdf";
import type { HiringTemplate, TemplateFormField } from "./hiring-templates.data";
import type { CompanyBranding } from "./company-branding.data";

/**
 * Generate a printable, blank Driver Employment Application PDF.
 *
 * The field list is driven by a hiring template's `formFields`, so the
 * generated form always matches what the ATS asks an applicant on-screen.
 *
 * Layout (US Letter, 612 × 792 pt):
 *   1. Header bar — accent-coloured, with logo / company name / contact line
 *      (same visual language as the consent PDF).
 *   2. Title block — "Driver Employment Application" + template name.
 *   3. Section groups — fields grouped by `section`, laid out two-up with a
 *      blank input box (or checkboxes for short select fields).
 *   4. Applicant certification + signature / print-name / date block.
 *   5. Footer — company address + page x of y, on every page.
 */

export interface ApplicationPdfOptions {
    template: HiringTemplate;
    branding: CompanyBranding;
    /** Only blank (hand-completed) forms are produced for now. */
    mode: 'blank';
}

const SECTION_ORDER: TemplateFormField['section'][] = [
    'Identity', 'Contact', 'Address', 'Employment', 'Driving Experience', 'Other',
];

export function generateApplicationPdf(opts: ApplicationPdfOptions): jsPDF {
    const { template, branding } = opts;

    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 48;
    const accent = hexToRgb(branding.accentColor) ?? { r: 37, g: 99, b: 235 };

    let y = drawHeader(doc, branding, accent, pageW, marginX);

    // ── 2. Title block ─────────────────────────────────────────────
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Driver Employment Application', marginX, y);
    y += 16;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(template.name, marginX, y);
    y += 12;

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Complete every field marked with an asterisk (*). Print clearly in black ink.', marginX, y);

    // Blank-copy pill
    const pillX = pageW - marginX - 90;
    doc.setFillColor(148, 163, 184);
    doc.roundedRect(pillX, y - 24, 90, 20, 4, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('BLANK COPY', pillX + 45, y - 11, { align: 'center' });

    // Divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.line(marginX, y + 8, pageW - marginX, y + 8);
    y += 26;

    // ── 3. Section groups ──────────────────────────────────────────
    const bodyW = pageW - marginX * 2;
    const colGap = 18;
    const colW = (bodyW - colGap) / 2;

    for (const section of SECTION_ORDER) {
        const fields = template.formFields.filter(f => f.section === section);
        if (fields.length === 0) continue;

        if (y > pageH - 130) { doc.addPage(); y = 56; }

        // Section header bar
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(marginX, y, bodyW, 20, 'F');
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(section.toUpperCase(), marginX + 8, y + 13.5);
        y += 32;

        // Pair fields into rows; full-width types take a whole row.
        const rows: TemplateFormField[][] = [];
        let pending: TemplateFormField | null = null;
        for (const f of fields) {
            if (isFullWidth(f)) {
                if (pending) { rows.push([pending]); pending = null; }
                rows.push([f]);
            } else if (pending) {
                rows.push([pending, f]);
                pending = null;
            } else {
                pending = f;
            }
        }
        if (pending) rows.push([pending]);

        for (const row of rows) {
            const rowH = rowHeight(row);
            if (y + rowH > pageH - 60) { doc.addPage(); y = 56; }

            if (row.length === 1 && isFullWidth(row[0])) {
                drawField(doc, marginX, y, bodyW, row[0]);
            } else {
                drawField(doc, marginX, y, colW, row[0]);
                if (row[1]) drawField(doc, marginX + colW + colGap, y, colW, row[1]);
            }
            y += rowH;
        }
        y += 6;
    }

    // ── 4. Certification + signature ───────────────────────────────
    const certText =
        'I certify that all statements made on this application are true and complete to the best ' +
        'of my knowledge. I authorize the company and its agents to investigate the information ' +
        'provided, including my driving and employment record. I understand that any ' +
        'misrepresentation or omission of fact is sufficient cause for rejection of this ' +
        'application or, if hired, dismissal.';
    const certLines = doc.splitTextToSize(certText, bodyW);
    const certBlockH = 30 + certLines.length * 12 + 90;
    if (y + certBlockH > pageH - 50) { doc.addPage(); y = 56; }

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(marginX, y, pageW - marginX, y);
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Applicant Certification', marginX, y);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-700
    for (const line of certLines) {
        doc.text(line, marginX, y);
        y += 12;
    }
    y += 14;

    // Signature box (left) + print name / date (right)
    const sigBoxW = 280;
    const sigBoxH = 64;
    doc.setDrawColor(148, 163, 184); // slate-400
    doc.setLineWidth(1);
    doc.rect(marginX, y, sigBoxW, sigBoxH);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Applicant signature', marginX + sigBoxW / 2, y + sigBoxH - 8, { align: 'center' });

    const rightX = pageW - marginX - 220;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Print name', rightX, y + 14);
    doc.setDrawColor(148, 163, 184);
    doc.line(rightX, y + 30, rightX + 200, y + 30);
    doc.text('Date', rightX, y + 48);
    doc.line(rightX + 34, y + 48, rightX + 200, y + 48);

    // ── 5. Footer (every page) ─────────────────────────────────────
    drawFooter(doc, branding, pageW, pageH, marginX);

    return doc;
}

export function downloadApplicationPdf(opts: ApplicationPdfOptions) {
    const doc = generateApplicationPdf(opts);
    const slug = opts.template.id.replace(/^tpl-/, '').replace(/[^a-z0-9]+/gi, '-');
    doc.save(`driver-application-${slug}-blank.pdf`);
}

// ── Field rendering ───────────────────────────────────────────────────────

/** Address + textarea fields span the full body width. */
function isFullWidth(field: TemplateFormField): boolean {
    return field.type === 'textarea' || field.type === 'address';
}

function inputHeight(field: TemplateFormField): number {
    return field.type === 'textarea' ? 46 : 20;
}

function rowHeight(row: TemplateFormField[]): number {
    const tallest = Math.max(...row.map(inputHeight));
    return 4 + tallest + 14; // label gap + input + row gap
}

function drawField(doc: jsPDF, x: number, y: number, w: number, field: TemplateFormField) {
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text((field.label + (field.required ? '  *' : '')).toUpperCase(), x, y);

    const inputY = y + 4;
    const inputH = inputHeight(field);

    // Short select fields print as checkboxes when they fit; otherwise a box.
    const shortSelect =
        field.type === 'select' &&
        !!field.options &&
        field.options.length > 0 &&
        field.options.length <= 4;

    if (shortSelect && field.options && checkboxRowWidth(doc, field.options) <= w) {
        let cx = x;
        const box = 9;
        for (const opt of field.options) {
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.75);
            doc.rect(cx, inputY + 4, box, box);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            doc.text(opt, cx + box + 4, inputY + 12);
            cx += box + 4 + doc.getTextWidth(opt) + 16;
        }
        return;
    }

    // Default: a blank input box.
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setLineWidth(0.75);
    doc.rect(x, inputY, w, inputH);
}

function checkboxRowWidth(doc: jsPDF, options: string[]): number {
    const box = 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    return options.reduce((sum, opt) => sum + box + 4 + doc.getTextWidth(opt) + 16, 0);
}

// ── Shared chrome ─────────────────────────────────────────────────────────

function drawHeader(
    doc: jsPDF,
    branding: CompanyBranding,
    accent: { r: number; g: number; b: number },
    pageW: number,
    marginX: number,
): number {
    const headerH = 84;
    doc.setFillColor(accent.r, accent.g, accent.b);
    doc.rect(0, 0, pageW, headerH, 'F');

    if (branding.logoDataUrl) {
        try {
            doc.addImage(branding.logoDataUrl, 'PNG', marginX, 18, 48, 48, undefined, 'FAST');
        } catch {
            drawLogoFallback(doc, marginX, 18, accent);
        }
    } else {
        drawLogoFallback(doc, marginX, 18, accent);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(branding.name, marginX + 64, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    if (branding.tagline) doc.text(branding.tagline, marginX + 64, 56);

    const contact = [branding.phone, branding.email].filter(Boolean).join('  ·  ');
    if (contact) {
        doc.setFontSize(9);
        doc.text(contact, pageW - marginX, 40, { align: 'right' });
    }
    if (branding.address) {
        doc.setFontSize(9);
        doc.text(branding.address, pageW - marginX, 56, { align: 'right' });
    }

    return headerH + 28;
}

function drawFooter(
    doc: jsPDF,
    branding: CompanyBranding,
    pageW: number,
    pageH: number,
    marginX: number,
) {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        const footerY = pageH - 32;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(marginX, footerY - 12, pageW - marginX, footerY - 12);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        if (branding.address) doc.text(branding.address, marginX, footerY);
        doc.text(`${branding.name} · Driver Employment Application`, pageW / 2, footerY, { align: 'center' });
        doc.text(`Page ${p} of ${total}`, pageW - marginX, footerY, { align: 'right' });
    }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

function drawLogoFallback(
    doc: jsPDF,
    x: number,
    yPos: number,
    accent: { r: number; g: number; b: number },
) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, yPos, 48, 48, 6, 6, 'F');
    doc.setTextColor(accent.r, accent.g, accent.b);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('★', x + 24, yPos + 31, { align: 'center' });
}
