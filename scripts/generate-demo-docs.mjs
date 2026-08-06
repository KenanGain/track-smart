/**
 * Generates the demo document PDFs used by "Load sample data" / "Fill demo data"
 * on the Default Compliances & Documents page.
 *
 * Output → public/demo-docs/*.pdf (served by Vite at /demo-docs/*.pdf, a real URL
 * that opens reliably in the browser's PDF viewer — unlike inline data: URLs, which
 * modern browsers block from top-level navigation).
 *
 * Run:  node scripts/generate-demo-docs.mjs
 */
import { jsPDF } from 'jspdf';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo-docs');
mkdirSync(OUT, { recursive: true });

const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function drawFieldBox(doc, x, y, w, rows) {
    const cols = 2, colW = w / cols, rowH = 46;
    const lines = Math.ceil(rows.length / cols);
    const h = lines * rowH + 20;
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(1);
    doc.roundedRect(x, y, w, h, 8, 8, 'S');
    rows.forEach(([label, value], i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const cx = x + 20 + c * (colW - 8), cy = y + 30 + r * rowH;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 116, 139);
        doc.text(String(label).toUpperCase(), cx, cy);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(15, 23, 42);
        doc.text(trunc(String(value || '—'), 34), cx, cy + 17);
    });
    return y + h;
}
function statusBadge(doc, x, y, text) {
    const w = doc.getTextWidth(text.toUpperCase()) + 22;
    doc.setFillColor(220, 252, 231); doc.roundedRect(x, y - 13, w, 20, 10, 10, 'F');
    doc.setTextColor(21, 128, 61); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(text.toUpperCase(), x + 11, y);
}
function footer(doc, W, H) {
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.8); doc.line(48, H - 70, W - 48, H - 70);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text('SAMPLE DOCUMENT — generated for demonstration purposes only. Not a valid or official record.', 48, H - 52);
    let bx = 48; doc.setFillColor(15, 23, 42);
    for (let i = 0; i < 60 && bx < W - 60; i++) {
        const bw = (i * 7) % 3 === 0 ? 3 : 1.2;
        doc.rect(bx, H - 42, bw, 16, 'F'); bx += bw + ((i * 5) % 4 === 0 ? 3 : 1.6);
    }
}

function certificate({ authority, title, subtitle, ref, rows }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 48;
    doc.setFillColor(30, 58, 138); doc.rect(0, 0, W, 96, 'F');
    doc.setFillColor(37, 99, 235); doc.rect(0, 92, W, 4, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
    doc.text(trunc(authority.toUpperCase(), 52), M, 42);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(191, 219, 254);
    doc.text('OFFICIAL DOCUMENT · SAMPLE', M, 60);
    doc.setFontSize(8); doc.text(`Ref: ${ref}`, W - M, 42, { align: 'right' });
    doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(24);
    doc.text(trunc(title, 40), M, 156);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(71, 85, 105);
    doc.text(trunc(subtitle, 72), M, 178);
    statusBadge(doc, M, 206, 'Valid');
    const boxBottom = drawFieldBox(doc, M, 232, W - 2 * M, rows);
    const sx = W - M - 54, sy = boxBottom + 96;
    doc.setDrawColor(30, 58, 138); doc.setLineWidth(2); doc.circle(sx, sy, 40, 'S');
    doc.setLineWidth(0.8); doc.circle(sx, sy, 32, 'S');
    doc.setTextColor(30, 58, 138); doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('OFFICIAL', sx, sy - 4, { align: 'center' }); doc.text('SEAL', sx, sy + 8, { align: 'center' });
    doc.setDrawColor(148, 163, 184); doc.setLineWidth(1); doc.line(M, boxBottom + 110, M + 200, boxBottom + 110);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text('Authorized Signature', M, boxBottom + 126);
    footer(doc, W, H);
    return doc;
}

function licenseCard() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4', compress: true });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 48;
    doc.setFillColor(241, 245, 249); doc.rect(0, 0, W, H, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
    doc.text('Driver License', M, 70);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text('Commercial Driver License (CDL)', M, 90);
    const cx = M, cy = 116, cw = W - 2 * M, ch = 300;
    doc.setFillColor(255, 255, 255); doc.roundedRect(cx, cy, cw, ch, 14, 14, 'F');
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(1); doc.roundedRect(cx, cy, cw, ch, 14, 14, 'S');
    doc.setFillColor(6, 78, 59); doc.roundedRect(cx, cy, cw, 56, 14, 14, 'F'); doc.rect(cx, cy + 28, cw, 28, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('COMMERCIAL DRIVER LICENSE', cx + 20, cy + 26);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(167, 243, 208);
    doc.text('State of Illinois · USA', cx + 20, cy + 44);
    doc.setFillColor(255, 255, 255); doc.roundedRect(cx + cw - 62, cy + 14, 44, 30, 6, 6, 'F');
    doc.setTextColor(6, 78, 59); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('CLASS', cx + cw - 40, cy + 26, { align: 'center' });
    doc.setFontSize(15); doc.text('A', cx + cw - 40, cy + 40, { align: 'center' });
    const px = cx + 20, py = cy + 74, pw = 108, ph = 140;
    doc.setFillColor(226, 232, 240); doc.roundedRect(px, py, pw, ph, 8, 8, 'F');
    doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('PHOTO', px + pw / 2, py + ph / 2, { align: 'center' });
    const fx = px + pw + 22;
    const rows = [['Name', 'Jason Cooper'], ['License No.', 'CDL-198347'], ['Class / Endorsements', 'A · H, N, T'],
        ['Issued', '2024-01-15'], ['Expires', '2028-01-14'], ['Country / State', 'Illinois, United States']];
    let fy = cy + 88;
    rows.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
        doc.text(label.toUpperCase(), fx, fy);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
        doc.text(trunc(value, 30), fx, fy + 14); fy += 35;
    });
    doc.setDrawColor(148, 163, 184); doc.setLineWidth(1); doc.line(cx + 20, cy + ch + 44, cx + 220, cy + ch + 44);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text('Holder Signature', cx + 20, cy + ch + 60);
    footer(doc, W, H);
    return doc;
}

const docs = {
    'cvor-certificate.pdf': certificate({
        authority: 'Ontario, Canada', title: 'CVOR Certificate', subtitle: "Commercial Vehicle Operator's Registration (CVOR)", ref: 'CVO-466262',
        rows: [['Issued To', 'Acme Logistics'], ['CVOR Number', 'CVO-466262'], ['Issue Date', '2024-01-15'], ['Expiry Date', '2026-12-31'], ['Jurisdiction', 'Ontario, Canada'], ['Country / Region', 'Ontario, Canada']],
    }),
    'insurance-certificate.pdf': certificate({
        authority: 'State Farm Insurance', title: 'Certificate of Insurance', subtitle: 'Commercial Auto Liability Coverage', ref: 'POL-100',
        rows: [['Insured', 'Acme Logistics'], ['Policy Number', 'POL-100'], ['Effective Date', '2025-01-01'], ['Expiry Date', '2026-12-31'], ['Coverage', 'Liability — $2,000,000'], ['Country / Region', 'Alberta, Canada']],
    }),
    'compliance-document.pdf': certificate({
        authority: 'Government / Regulatory Authority', title: 'Compliance Document', subtitle: 'Official compliance & registration record', ref: 'REG-582104',
        rows: [['Issued To', 'Acme Logistics'], ['Reference Number', 'REG-582104'], ['Issue Date', '2024-03-01'], ['Expiry Date', '2026-11-30'], ['Jurisdiction', 'Federal'], ['Country / Region', 'United States']],
    }),
    'medical-certificate.pdf': certificate({
        authority: 'FMCSA — DOT Medical Examiner', title: "Medical Examiner's Certificate", subtitle: 'DOT Physical Examination — Driver Qualification', ref: 'MED-774213',
        rows: [['Driver', 'Jason Cooper'], ['Certificate No.', 'MED-774213'], ['Exam Date', '2025-06-10'], ['Expiry Date', '2027-06-10'], ['Examiner', 'Dr. L. Nguyen, CME'], ['Restrictions', 'None']],
    }),
    'drug-test.pdf': certificate({
        authority: 'Certified Testing Laboratory', title: 'Drug & Alcohol Test Result', subtitle: 'DOT 49 CFR Part 40 — Pre-Employment', ref: 'DT-559002',
        rows: [['Donor', 'Jason Cooper'], ['Specimen ID', 'DT-559002'], ['Collection Date', '2025-05-28'], ['Result', 'Negative'], ['MRO', 'Dr. P. Alvarez'], ['Panel', '5-Panel + Alcohol']],
    }),
    'mvr.pdf': certificate({
        authority: 'Department of Motor Vehicles', title: 'Motor Vehicle Record (MVR)', subtitle: 'Driving Abstract & Violation History', ref: 'MVR-330871',
        rows: [['Driver', 'Jason Cooper'], ['License No.', 'CDL-198347'], ['State / Province', 'Illinois, USA'], ['Status', 'Valid'], ['Violations (36mo)', 'None'], ['Report Date', '2025-07-01']],
    }),
    'psp-report.pdf': certificate({
        authority: 'FMCSA — Pre-Employment Screening', title: 'PSP Report', subtitle: 'Crash & Roadside Inspection History', ref: 'PSP-901245',
        rows: [['Driver', 'Jason Cooper'], ['DL Number', 'CDL-198347'], ['Crashes (5yr)', '0'], ['Inspections (3yr)', '4'], ['Report Date', '2025-07-02'], ['Period', '2020–2025']],
    }),
    'safety-fitness.pdf': certificate({
        authority: 'Ministry of Transportation', title: 'Safety Fitness Certificate', subtitle: 'National Safety Code (NSC) Registration', ref: 'NSC-681997',
        rows: [['Carrier', 'Acme Logistics'], ['NSC Number', 'NSC-681997'], ['Safety Rating', 'Satisfactory'], ['Issue Date', '2024-05-01'], ['Expiry Date', '2026-04-30'], ['Jurisdiction', 'Ontario, Canada']],
    }),
    'mc-authority.pdf': certificate({
        authority: 'FMCSA', title: 'Operating Authority (MC)', subtitle: 'Motor Carrier Operating Authority', ref: 'MC-103478',
        rows: [['Carrier', 'Acme Logistics'], ['MC Number', 'MC-103478'], ['USDOT', 'DOT-7693121'], ['Status', 'Active'], ['Effective Date', '2023-08-10'], ['Authority Type', 'Common / Contract']],
    }),
    'ifta.pdf': certificate({
        authority: 'International Fuel Tax Agreement', title: 'IFTA License', subtitle: 'Fuel Tax Registration', ref: 'IFTA-45120',
        rows: [['Carrier', 'Acme Logistics'], ['IFTA Number', 'IFTA-45120'], ['Base Jurisdiction', 'Ontario, Canada'], ['Issue Date', '2025-01-01'], ['Expiry Date', '2025-12-31'], ['Decals', '2']],
    }),
    'irp.pdf': certificate({
        authority: 'International Registration Plan', title: 'IRP Cab Card', subtitle: 'Apportioned Vehicle Registration', ref: 'IRP-88213',
        rows: [['Carrier', 'Acme Logistics'], ['Plate', 'AB-77120'], ['Unit / VIN', '104 · 1FUJGLDR8'], ['Registered Weight', '80,000 lb'], ['Issue Date', '2025-03-01'], ['Expiry Date', '2026-02-28']],
    }),
    'annual-inspection.pdf': certificate({
        authority: 'Certified Inspection Facility', title: 'Annual Vehicle Inspection', subtitle: 'DOT / CVOR Periodic Inspection Report', ref: 'INS-220945',
        rows: [['Unit', '104'], ['VIN', '1FUJGLDR8'], ['Inspector', 'M. Reed, Lic. #4471'], ['Inspection Date', '2025-04-12'], ['Result', 'Pass'], ['Next Due', '2026-04-12']],
    }),
    'business-registration.pdf': certificate({
        authority: 'Secretary of State', title: 'Business Registration', subtitle: 'Articles of Incorporation / Business License', ref: 'BR-201884',
        rows: [['Entity', 'Acme Logistics Inc.'], ['Registration No.', 'BR-201884'], ['Formed', '2019-02-14'], ['Status', 'Active / Good Standing'], ['State', 'Delaware, USA'], ['Type', 'Corporation']],
    }),
    'driver-license.pdf': licenseCard(),
};

for (const [name, doc] of Object.entries(docs)) {
    const buf = Buffer.from(doc.output('arraybuffer'));
    writeFileSync(join(OUT, name), buf);
    console.log(`wrote public/demo-docs/${name} (${buf.length} bytes)`);
}
console.log('done.');
