// ─────────────────────────────────────────────────────────────────────────────
// Bringing a service history in from a spreadsheet.
//
// The record every carrier already has is a spreadsheet, and typing six years of it one
// visit at a time through the Add record form is the reason nobody does it. So: a
// template they can fill, and an importer that reads it back.
//
// Two things make this worth more than a generic CSV upload.
//
//   The template is built from THIS rule. A rule that counts miles and days gets an
//   odometer column and no hour meter; PM-D, which runs on days alone, gets neither. A
//   column somebody cannot fill is a column they will fill with something.
//
//   The columns are detected, not dictated. Real spreadsheets say "Date", "Service
//   Date", "Performed On", "ODO", "Mileage", "Invoice Total". Refusing them all because
//   the header does not match a fixed string is a way of making people retype a file
//   they already have. Anything recognisable is mapped; anything else is reported.
//
// Documents are deliberately not part of this. A bulk import brings the facts; the paper
// is attached per record, where there is somebody to say which bill belongs to which
// visit.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceIntervals } from '@/types/service-types';

/** One row of the file, as this module understands it. */
export interface BulkServiceRow {
    /** 1-based, as the spreadsheet counts — the number in the error message. */
    line: number;
    performedAt?: string;
    odometer?: number;
    engineHours?: number;
    vendorName?: string;
    performedBy?: 'driver' | 'mechanic';
    performedByName?: string;
    labour?: number;
    parts?: number;
    cost?: number;
    currency?: string;
    notes?: string;
    remarks?: string;
    /** What stops this row being imported. Empty means it is good. */
    problems: string[];
}

export interface BulkParseResult {
    rows: BulkServiceRow[];
    /** Header → the field it was taken for. What "auto-detect" actually decided. */
    mapped: { header: string; field: string }[];
    /** Headers nothing was made of, so somebody can see what was ignored. */
    ignored: string[];
    /** Nothing usable at all — an empty file, or one with no date column. */
    fatal?: string;
}

/** Every field the importer knows, with the headings a real spreadsheet uses for it. */
const FIELDS: { field: keyof BulkServiceRow | 'ignore'; label: string; aliases: string[] }[] = [
    { field: 'performedAt', label: 'Performed on', aliases: ['performed on', 'performed', 'performed at', 'date', 'service date', 'date performed', 'completed', 'completed on', 'day'] },
    { field: 'odometer', label: 'Odometer', aliases: ['odometer', 'odo', 'mileage', 'miles', 'km', 'kms', 'kilometers', 'kilometres', 'reading', 'meter'] },
    { field: 'engineHours', label: 'Engine hours', aliases: ['engine hours', 'hours', 'hour meter', 'hrs', 'operating hours', 'engine hrs'] },
    { field: 'vendorName', label: 'Vendor', aliases: ['vendor', 'shop', 'supplier', 'garage', 'service provider', 'provider', 'company'] },
    { field: 'performedBy', label: 'Performed by', aliases: ['performed by', 'done by type', 'who', 'driver or mechanic', 'type'] },
    { field: 'performedByName', label: 'Person', aliases: ['person', 'mechanic', 'driver', 'technician', 'name', 'mechanic name', 'driver name'] },
    { field: 'labour', label: 'Labour', aliases: ['labour', 'labor', 'labour cost', 'labor cost'] },
    { field: 'parts', label: 'Parts', aliases: ['parts', 'parts cost', 'materials'] },
    { field: 'cost', label: 'Cost', aliases: ['cost', 'total', 'amount', 'invoice total', 'total cost', 'price'] },
    { field: 'currency', label: 'Currency', aliases: ['currency', 'ccy'] },
    { field: 'notes', label: 'Notes', aliases: ['notes', 'note', 'comment', 'comments', 'description'] },
    { field: 'remarks', label: 'Remarks', aliases: ['remarks', 'remark', 'follow up', 'follow-up', 'recommendations', 'recommended'] },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ')
    // "Odometer (mi)" and "Odometer" are the same column.
    .replace(/\s*\([^)]*\)\s*/g, '').trim();

/** Which field a heading is, or nothing. */
function fieldFor(header: string): string | undefined {
    const h = norm(header);
    if (!h) return undefined;
    for (const f of FIELDS) if (f.aliases.includes(h)) return f.field as string;
    // A heading nobody wrote down exactly: "odometer start", "total amount (usd)".
    for (const f of FIELDS) {
        if (f.aliases.some((a) => h === a || h.startsWith(`${a} `) || h.endsWith(` ${a}`))) {
            return f.field as string;
        }
    }
    return undefined;
}

/**
 * Split one CSV line, respecting quotes.
 *
 * Written out rather than `split(',')` because a notes column with a comma in it is the
 * single commonest thing in a real maintenance export, and it silently shifts every
 * column after it.
 */
function splitLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (quoted) {
            if (c === '"') {
                if (line[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
            } else cur += c;
        } else if (c === '"') quoted = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
    }
    out.push(cur);
    return out.map((v) => v.trim());
}

const money = (v: string) => {
    const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) && n !== 0 ? n : undefined;
};

/**
 * A date, however the spreadsheet wrote it.
 *
 * Accepts yyyy-mm-dd, mm/dd/yyyy and d-mmm-yyyy, which is what the three programs people
 * actually export from produce. Anything else is reported rather than guessed at: a date
 * read wrong moves a countdown, which is worse than a row that did not import.
 */
export function parseDate(raw: string): string | undefined {
    const v = String(raw ?? '').trim();
    if (!v) return undefined;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
    const us = /^(\d{1,2})[/](\d{1,2})[/](\d{4})$/.exec(v);
    if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
    const txt = Date.parse(v);
    if (!Number.isNaN(txt)) {
        const d = new Date(txt);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return undefined;
}

/** Read a file the carrier already had. */
export function parseBulkServices(text: string, opts?: { today?: string }): BulkParseResult {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) return { rows: [], mapped: [], ignored: [], fatal: 'The file is empty.' };

    const headers = splitLine(lines[0]);
    const mapped: { header: string; field: string }[] = [];
    const ignored: string[] = [];
    const byIndex: (string | undefined)[] = headers.map((h) => {
        const f = fieldFor(h);
        if (f) mapped.push({ header: h, field: f });
        else if (h) ignored.push(h);
        return f;
    });

    if (!byIndex.includes('performedAt')) {
        return {
            rows: [], mapped, ignored,
            fatal: 'No date column found. One column has to say when each service was done — "Performed on", "Date" and "Service date" are all recognised.',
        };
    }

    const today = opts?.today ?? new Date().toISOString().slice(0, 10);
    const rows: BulkServiceRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const cells = splitLine(lines[i]);
        const row: BulkServiceRow = { line: i + 1, problems: [] };
        byIndex.forEach((field, c) => {
            const raw = cells[c] ?? '';
            if (!field || raw === '') return;
            switch (field) {
                case 'performedAt': row.performedAt = parseDate(raw); break;
                case 'odometer': row.odometer = money(raw); break;
                case 'engineHours': row.engineHours = money(raw); break;
                case 'labour': row.labour = money(raw); break;
                case 'parts': row.parts = money(raw); break;
                case 'cost': row.cost = money(raw); break;
                case 'currency': row.currency = raw.toUpperCase().slice(0, 3); break;
                case 'performedBy': row.performedBy = /driv/i.test(raw) ? 'driver' : 'mechanic'; break;
                default: (row as any)[field] = raw; break;
            }
        });

        // The bill is labour + parts where both are given, and whatever was in the total
        // column otherwise — one definition, the same one the record form uses.
        const split = (row.labour ?? 0) + (row.parts ?? 0);
        if (split > 0) row.cost = split;

        if (!row.performedAt) row.problems.push('no date, or a date that could not be read');
        else if (row.performedAt > today) row.problems.push('dated in the future');
        rows.push(row);
    }

    if (rows.length === 0) return { rows, mapped, ignored, fatal: 'The file has a header and no rows.' };
    // Newest first, as the record reads.
    rows.sort((a, b) => String(b.performedAt ?? '').localeCompare(String(a.performedAt ?? '')));
    return { rows, mapped, ignored };
}

/**
 * The template for THIS rule.
 *
 * Only the columns it can actually use: a rule that does not count hours has no hour
 * meter column, because a column somebody cannot fill is a column they will fill with
 * something.
 */
export function bulkTemplateFor(
    intervals: ServiceIntervals | undefined,
    sample?: { odometer?: number; engineHours?: number },
): { headers: string[]; example: string[] } {
    const unit = intervals?.mileage?.unit === 'km' ? 'km' : 'mi';
    const headers = ['Performed on'];
    const example = [new Date().toISOString().slice(0, 10)];

    if (intervals?.mileage) {
        headers.push(`Odometer (${unit})`);
        example.push(String(sample?.odometer ?? 145000));
    }
    if (intervals?.engineHours) {
        headers.push('Engine hours');
        example.push(String(sample?.engineHours ?? 4800));
    }
    headers.push('Vendor', 'Performed by', 'Person', 'Labour', 'Parts', 'Currency', 'Notes', 'Remarks');
    example.push('Elkhart Truck Center', 'mechanic', 'Dale Foster', '280.00', '132.60', 'USD',
        'Oil and filters, brakes checked', 'Linings at 30% - quote before the next PM');
    return { headers, example };
}

const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function templateCsv(t: { headers: string[]; example: string[] }): string {
    return `${t.headers.map(cell).join(',')}\n${t.example.map(cell).join(',')}\n`;
}

/** Hand the browser a file. */
export function downloadText(name: string, text: string, type = 'text/csv;charset=utf-8;') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
