/**
 * Export orchestrator — CSV builders + full-bundle ZIP.
 *
 * Spec: docs/SAFETY_EXPORT_PLAN.md §3.
 *
 * Uses jszip (already a dep) for the bundle. PDF generation goes through
 * `generateForecastPdf` with `returnBlob: true` so multiple PDFs can be
 * appended to the zip without triggering individual downloads.
 */

import JSZip from 'jszip';

import type {
    EntityRiskScore,
    RiskConfig,
} from './risk-engine.types';
import type { ForecastSummary } from './risk-forecast';
import type {
    DriverIncidentForecast,
    JurisdictionHotspotForecast,
} from './risk-incident-forecast';
import type { MaintenanceForecastItem } from './risk-maintenance-forecast';
import type { ForecastFilters } from './risk-filters';
import { summarizeFilters } from './risk-filters';
import { generateForecastPdf } from './generateForecastPdf';

// ── Shared CSV helpers ──────────────────────────────────────────────────────

function csvCell(s: string): string {
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

function rowsToCsv(rows: string[][]): string {
    return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace(/[\\/:*?"<>|]/g, '-');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function downloadCsv(rows: string[][], filename: string): void {
    const csv = rowsToCsv(rows);
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename);
}

// ── CSV row builders ────────────────────────────────────────────────────────

interface ExportContext {
    forecast: ForecastSummary;
    drivers: DriverIncidentForecast[];
    hotspots: JurisdictionHotspotForecast[];
    maintenance: MaintenanceForecastItem[];
    filters: ForecastFilters;
    carrierName: string;
    carrierId: string;
}

export function buildForecastPointsRows(ctx: ExportContext): string[][] {
    const rows: string[][] = [
        ['type', 'month', 'date', 'monthsAhead', 'predictedSafety',
         'lowerBound', 'upperBound', 'predictedEvents', 'predictedOos', 'predictedMaintenance'],
    ];
    for (const p of [...ctx.forecast.history, ...ctx.forecast.points]) {
        rows.push([p.type, p.month, p.date, String(p.monthsAhead),
            p.predictedSafety.toFixed(2), p.lowerBound.toFixed(2), p.upperBound.toFixed(2),
            String(p.predictedEvents), String(p.predictedOos), String(p.predictedMaintenance)]);
    }
    rows.push([]);
    rows.push(['# horizonMonths', String(ctx.forecast.horizonMonths)]);
    rows.push(['# trend', ctx.forecast.trend]);
    rows.push(['# slope', ctx.forecast.slope.toFixed(4)]);
    rows.push(['# r2', ctx.forecast.r2.toFixed(4)]);
    rows.push(['# residualStd', ctx.forecast.residualStd.toFixed(4)]);
    rows.push(['# confidence', ctx.forecast.confidence]);
    rows.push(['# baseSafety', ctx.forecast.base.safetyScore.toFixed(2)]);
    rows.push(['# baseRating', ctx.forecast.base.rating]);
    rows.push(['# configHash', ctx.forecast.base.configHash]);
    rows.push(['# filterSummary', summarizeFilters(ctx.filters)]);
    return rows;
}

export function buildDriverRows(ctx: ExportContext): string[][] {
    const rows: string[][] = [
        ['driverId', 'driver', 'licence', 'pastViolations', 'pastAccidents',
         'predictedViolations', 'predictedAccidents', 'trendSlope', 'avgSeverity',
         'riskScore', 'confidence', 'daysSinceLastEvent'],
    ];
    for (const d of ctx.drivers) {
        rows.push([
            d.driverId, d.driverName, d.licenseNumber ?? '',
            String(d.pastViolations), String(d.pastAccidents),
            d.predictedViolations.toFixed(2), d.predictedAccidents.toFixed(2),
            d.trendSlope.toFixed(3), d.avgSeverity.toFixed(2),
            d.riskScore.toFixed(2), d.confidence,
            Number.isFinite(d.daysSinceLastEvent) ? String(d.daysSinceLastEvent) : '',
        ]);
    }
    return rows;
}

export function buildHotspotRows(ctx: ExportContext): string[][] {
    const rows: string[][] = [
        ['code', 'country', 'pastViolations', 'pastAccidents',
         'predictedViolations', 'predictedAccidents', 'avgSeverity',
         'riskScore', 'confidence', 'lastEventDate'],
    ];
    for (const h of ctx.hotspots) {
        rows.push([
            h.code, h.country,
            String(h.pastViolations), String(h.pastAccidents),
            h.predictedViolations.toFixed(2), h.predictedAccidents.toFixed(2),
            h.avgSeverity.toFixed(2),
            h.riskScore.toFixed(2), h.confidence, h.lastEventDate ?? '',
        ]);
    }
    return rows;
}

export function buildMaintenanceRows(ctx: ExportContext): string[][] {
    const rows: string[][] = [
        ['assetId', 'asset', 'taskId', 'services', 'status', 'predictedDue',
         'daysUntilDue', 'method', 'confidence', 'severity',
         'estimatedCost', 'costSampleSize', 'note'],
    ];
    for (const it of ctx.maintenance) {
        rows.push([
            it.assetId, it.assetLabel, it.taskId,
            it.serviceLabels.join('; '),
            it.status, it.predictedDue, String(it.daysUntilDue),
            it.method, it.confidence, String(it.severity),
            String(it.estimatedCost ?? 0),
            String(it.costSampleSize ?? 0),
            it.note ?? '',
        ]);
    }
    return rows;
}

export function buildCombinedRows(ctx: ExportContext): string[][] {
    const rows: string[][] = [];
    const sections: Array<{ name: string; rows: string[][] }> = [
        { name: 'Forecast points', rows: buildForecastPointsRows(ctx) },
        { name: 'Driver incidents', rows: buildDriverRows(ctx) },
        { name: 'Hotspot locations', rows: buildHotspotRows(ctx) },
        { name: 'Maintenance items', rows: buildMaintenanceRows(ctx) },
        { name: 'Forecast alerts', rows: [
            ['severity', 'date', 'title', 'detail'],
            ...ctx.forecast.alerts.map((a) => [a.severity, a.date, a.title, a.detail]),
        ] },
    ];
    for (const s of sections) {
        rows.push(['# Section', s.name]);
        for (const r of s.rows) rows.push(r);
        rows.push([]);
    }
    return rows;
}

// ── Single-file CSV downloads ───────────────────────────────────────────────

export function exportForecastPointsCsv(ctx: ExportContext): void {
    downloadCsv(buildForecastPointsRows(ctx), filename(ctx, 'forecast-points', 'csv'));
}

export function exportDriverIncidentsCsv(ctx: ExportContext): void {
    downloadCsv(buildDriverRows(ctx), filename(ctx, 'driver-incidents', 'csv'));
}

export function exportHotspotCsv(ctx: ExportContext): void {
    downloadCsv(buildHotspotRows(ctx), filename(ctx, 'hotspots', 'csv'));
}

export function exportMaintenanceCsv(ctx: ExportContext): void {
    downloadCsv(buildMaintenanceRows(ctx), filename(ctx, 'maintenance', 'csv'));
}

export function exportCombinedCsv(ctx: ExportContext): void {
    downloadCsv(buildCombinedRows(ctx), filename(ctx, 'combined', 'csv'));
}

// ── PDF download ────────────────────────────────────────────────────────────

export async function exportCarrierForecastPdf(
    ctx: ExportContext,
    carrierScore: EntityRiskScore,
    riskConfig?: RiskConfig,
    accountIdentifiers?: { dot?: string; cvor?: string; nsc?: string },
): Promise<void> {
    await generateForecastPdf({
        carrierName: ctx.carrierName,
        carrierId: ctx.carrierId,
        accountIdentifiers,
        forecast: ctx.forecast,
        drivers: ctx.drivers,
        hotspots: ctx.hotspots,
        maintenance: ctx.maintenance,
        filters: ctx.filters,
        carrierScore,
        riskConfig,
        fileName: filename(ctx, 'forecast-report', 'pdf'),
    });
}

// ── Full-bundle ZIP ─────────────────────────────────────────────────────────

export async function exportFullBundleZip(
    ctx: ExportContext,
    carrierScore: EntityRiskScore,
    riskConfig?: RiskConfig,
    accountIdentifiers?: { dot?: string; cvor?: string; nsc?: string },
): Promise<void> {
    const zip = new JSZip();

    // Forecast CSVs
    const forecastDir = zip.folder('forecast');
    forecastDir!.file('points.csv',           rowsToCsv(buildForecastPointsRows(ctx)));
    forecastDir!.file('driver-incidents.csv', rowsToCsv(buildDriverRows(ctx)));
    forecastDir!.file('hotspots.csv',         rowsToCsv(buildHotspotRows(ctx)));
    forecastDir!.file('maintenance.csv',      rowsToCsv(buildMaintenanceRows(ctx)));
    forecastDir!.file('combined.csv',         rowsToCsv(buildCombinedRows(ctx)));

    // Carrier forecast PDF
    const carrierPdf = await generateForecastPdf({
        carrierName: ctx.carrierName,
        carrierId: ctx.carrierId,
        accountIdentifiers,
        forecast: ctx.forecast,
        drivers: ctx.drivers,
        hotspots: ctx.hotspots,
        maintenance: ctx.maintenance,
        filters: ctx.filters,
        carrierScore,
        riskConfig,
        returnBlob: true,
    });
    if (carrierPdf instanceof Blob) {
        zip.folder('reports')!.file('carrier-forecast.pdf', carrierPdf);
    }

    // Meta
    const meta = zip.folder('meta')!;
    meta.file('filters.json', JSON.stringify(ctx.filters, null, 2));
    meta.file('config-hash.txt', ctx.forecast.base.configHash);
    if (riskConfig) {
        meta.file('risk-config.json', JSON.stringify(riskConfig, null, 2));
    }
    meta.file('summary.txt', [
        `Carrier: ${ctx.carrierName}`,
        `Carrier ID: ${ctx.carrierId}`,
        `Generated: ${new Date().toISOString()}`,
        `Filters: ${summarizeFilters(ctx.filters)}`,
        `Trend: ${ctx.forecast.trend}`,
        `Slope: ${ctx.forecast.slope.toFixed(4)} pts/mo`,
        `R²: ${ctx.forecast.r2.toFixed(4)}`,
        `Residual σ: ${ctx.forecast.residualStd.toFixed(4)}`,
        `Confidence: ${ctx.forecast.confidence}`,
        `Drivers: ${ctx.drivers.length}`,
        `Hotspots: ${ctx.hotspots.length}`,
        `Maintenance items: ${ctx.maintenance.length}`,
        `Alerts: ${ctx.forecast.alerts.length}`,
        `Config hash: ${ctx.forecast.base.configHash}`,
    ].join('\n'));
    meta.file('README.md', readmeFor(ctx));

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    downloadBlob(blob, filename(ctx, 'forecast-bundle', 'zip'));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function filename(ctx: ExportContext, kind: string, ext: string): string {
    const carrier = ctx.carrierName.replace(/\s+/g, '_');
    const date = new Date().toISOString().slice(0, 10);
    const horizon = `${ctx.forecast.horizonMonths}mo`;
    return `${carrier}_${kind}_${horizon}_${date}.${ext}`;
}

function readmeFor(ctx: ExportContext): string {
    return [
        `# Safety Forecast Bundle`,
        ``,
        `**Carrier:** ${ctx.carrierName}`,
        `**Generated:** ${new Date().toISOString()}`,
        `**Forecast horizon:** ${ctx.forecast.horizonMonths} months`,
        `**Config hash:** ${ctx.forecast.base.configHash}`,
        ``,
        `## Layout`,
        ``,
        `- forecast/`,
        `  - points.csv            — history + projection per month`,
        `  - driver-incidents.csv  — predicted violations + accidents per driver`,
        `  - hotspots.csv          — predicted events per US state / CA province`,
        `  - maintenance.csv       — upcoming maintenance items per asset`,
        `  - combined.csv          — all of the above with section markers`,
        `- reports/`,
        `  - carrier-forecast.pdf  — multi-page A4 executive report`,
        `- meta/`,
        `  - filters.json          — filters in effect at generation time`,
        `  - config-hash.txt       — SHA-style hash of risk config used`,
        `  - summary.txt           — human-readable header`,
        ``,
        `## Reproducibility`,
        ``,
        `Re-running the engine with the same risk-config hash and the same`,
        `source data will produce identical numeric output. Filters are`,
        `recorded in \`meta/filters.json\` for re-application.`,
        ``,
        `## Filter snapshot`,
        ``,
        `\`\`\``,
        summarizeFilters(ctx.filters),
        `\`\`\``,
    ].join('\n');
}
