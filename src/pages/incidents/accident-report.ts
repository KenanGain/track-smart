import { ACCIDENT_TYPES } from '@/data/accident-types.data';
import { type AccidentRecord } from '@/data/accident-records.data';

/** Title / subtitle / filename helpers for the accident report, rendered by
 *  AccidentReportDocument + AccidentReportViewer (themed, printable, downloadable PDF). */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDateTime(dt?: string): string {
    if (!dt) return '—';
    const [d, t] = dt.split('T');
    const [y, m, day] = (d || '').split('-');
    if (!y) return dt;
    return `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}${t ? ` · ${t}` : ''}`;
}
const compose = (...parts: (string | undefined | false)[]) => parts.filter(Boolean).join(', ');

export function accidentTypesLabel(r: AccidentRecord): string {
    const ids = r.accidentTypeIds?.length ? r.accidentTypeIds : (r.accidentTypeId ? [r.accidentTypeId] : []);
    return ids.map(id => ACCIDENT_TYPES.find(t => t.id === id)?.displayName ?? '').filter(Boolean).join(', ');
}
export function accidentReportTitle(r: AccidentRecord): string {
    return `Accident Report — ${accidentTypesLabel(r) || 'Report'}`;
}
export function accidentReportSubtitle(r: AccidentRecord): string {
    return compose(r.driverName, r.unitId) + ` · ${fmtDateTime(r.dateTime)} · ${r.location || '—'}` + (r.claimNumber ? ` · Claim ${r.claimNumber}` : '');
}
export function accidentReportFileName(r: AccidentRecord): string {
    const slug = (r.driverName || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `accident-report-${slug || 'report'}.pdf`;
}
