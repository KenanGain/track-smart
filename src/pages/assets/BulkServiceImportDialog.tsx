// ─────────────────────────────────────────────────────────────────────────────
// BulkServiceImportDialog — six years of history in one go.
//
// Three steps, in the order somebody actually does them: take the template, drop the
// filled file back, look at what it understood before anything is written. The middle
// step is the one that matters — an importer that writes first and reports afterwards is
// an importer nobody trusts twice.
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react';
import { Download, Upload, Table2, TriangleAlert, Check, FileSpreadsheet } from 'lucide-react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { ServiceIntervals } from '@/types/service-types';
import {
    parseBulkServices, bulkTemplateFor, templateCsv, downloadText,
    type BulkParseResult, type BulkServiceRow,
} from './bulk-service-import';
import { cn } from '@/lib/utils';

const shortDate = (iso?: string) => (iso
    ? new Date(`${iso}T08:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—');

export function BulkServiceImportDialog({
    intervalName, assetLabel, intervals, meter, onClose, onImport,
}: {
    intervalName: string;
    assetLabel: string;
    /** The rule's clocks — they decide which columns the template has. */
    intervals?: ServiceIntervals;
    /** What the unit reads now, so the example row is a plausible one. */
    meter?: { odometer?: number; engineHours?: number };
    onClose: () => void;
    onImport: (rows: BulkServiceRow[]) => void;
}) {
    const [result, setResult] = useState<BulkParseResult | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    const template = bulkTemplateFor(intervals, meter);
    const good = (result?.rows ?? []).filter((r) => r.problems.length === 0);
    const bad = (result?.rows ?? []).filter((r) => r.problems.length > 0);

    const take = (file: File | undefined) => {
        if (!file) return;
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = () => setResult(parseBulkServices(String(reader.result ?? '')));
        reader.readAsText(file);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-[920px]">
                <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-6 py-5 pr-12">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <FileSpreadsheet size={18} />
                    </span>
                    <div className="min-w-0">
                        <DialogHeader>
                            <DialogTitle>Bulk upload services</DialogTitle>
                            <DialogDescription>
                                The record a carrier already has is a spreadsheet. Bring it in whole.
                            </DialogDescription>
                        </DialogHeader>
                        <p className="mt-1 text-xs text-slate-500">
                            <span className="font-semibold text-slate-700">{intervalName}</span>
                            {' · '}
                            <span className="font-semibold text-slate-700">{assetLabel}</span>
                        </p>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-6 py-5">
                    {/* 1. The template, built from this rule's own clocks. */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h3 className="text-sm font-bold text-slate-900">1. Take the template</h3>
                                <p className="mt-0.5 text-[12px] text-slate-500">
                                    Built for this rule: a column for every clock it counts, and none for
                                    the ones it does not. Documents are not part of a bulk upload — attach
                                    those per record, where there is somebody to say which bill is which.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => downloadText(
                                    `${intervalName}-${assetLabel}-services.csv`.replace(/\s+/g, '-'),
                                    templateCsv(template),
                                )}
                                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-[12px] font-bold text-slate-700 transition-colors hover:bg-slate-50"
                            >
                                <Download size={14} className="text-blue-600" /> Download CSV template
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {template.headers.map((h) => (
                                <span key={h} className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                    {h}
                                </span>
                            ))}
                        </div>
                    </section>

                    {/* 2. The file back. */}
                    <section className="rounded-xl border border-slate-200 bg-white p-4">
                        <h3 className="text-sm font-bold text-slate-900">2. Drop the filled file back</h3>
                        <p className="mt-0.5 text-[12px] text-slate-500">
                            Your own export works too — the columns are detected, not dictated. "Date",
                            "Service Date", "ODO", "Invoice Total" and the rest are all understood.
                        </p>
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".csv,text/csv,text/plain"
                            className="hidden"
                            onChange={(e) => take(e.target.files?.[0])}
                        />
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="mt-3 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
                        >
                            <Upload size={18} className="text-blue-600" />
                            <span className="text-[13px] font-bold text-slate-700">
                                {fileName || 'Click to choose a CSV'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Nothing is written until you have seen what it read.
                            </span>
                        </button>
                    </section>

                    {/* 3. What it understood, before anything is written. */}
                    {result && (
                        <section className="rounded-xl border border-slate-200 bg-white p-4">
                            <h3 className="text-sm font-bold text-slate-900">3. What it read</h3>

                            {result.fatal ? (
                                <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                                    <TriangleAlert size={14} className="mt-0.5 shrink-0" /> {result.fatal}
                                </p>
                            ) : (
                                <>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] font-bold text-emerald-700">
                                            <Check size={13} /> {good.length} ready
                                        </span>
                                        {bad.length > 0 && (
                                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[12px] font-bold text-amber-700">
                                                <TriangleAlert size={13} /> {bad.length} skipped
                                            </span>
                                        )}
                                    </div>

                                    {/* The mapping it chose, said out loud. An importer that
                                        decides silently is one nobody can correct. */}
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {result.mapped.map((m) => (
                                            <span key={m.header} className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                                {m.header} <span className="text-blue-300">→</span> {m.field}
                                            </span>
                                        ))}
                                        {result.ignored.map((h) => (
                                            <span key={h} title="Not understood — this column was left out" className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-400 line-through">
                                                {h}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                                        <div className="max-h-56 overflow-y-auto">
                                            <table className="w-full min-w-[640px]">
                                                <thead className="sticky top-0 bg-slate-50">
                                                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                        <th className="px-3 py-2">Performed</th>
                                                        <th className="px-3 py-2 text-right">Odometer</th>
                                                        <th className="px-3 py-2 text-right">Hours</th>
                                                        <th className="px-3 py-2">Vendor</th>
                                                        <th className="px-3 py-2">Person</th>
                                                        <th className="px-3 py-2 text-right">Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {result.rows.slice(0, 50).map((r) => (
                                                        <tr key={r.line} className={cn('text-[12px]', r.problems.length > 0 && 'bg-amber-50/60 text-slate-400')}>
                                                            <td className="whitespace-nowrap px-3 py-1.5 font-semibold text-slate-700">
                                                                {r.problems.length > 0
                                                                    ? <span title={r.problems.join(', ')}>Row {r.line} — {r.problems[0]}</span>
                                                                    : shortDate(r.performedAt)}
                                                            </td>
                                                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{r.odometer?.toLocaleString() ?? '—'}</td>
                                                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{r.engineHours?.toLocaleString() ?? '—'}</td>
                                                            <td className="max-w-[12rem] truncate px-3 py-1.5">{r.vendorName ?? '—'}</td>
                                                            <td className="max-w-[10rem] truncate px-3 py-1.5">{r.performedByName ?? '—'}</td>
                                                            <td className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">
                                                                {r.cost ? `${r.currency ?? 'USD'} ${r.cost.toFixed(2)}` : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    {result.rows.length > 50 && (
                                        <p className="mt-2 text-[11px] text-slate-400">
                                            Showing the first 50 of {result.rows.length}. All of them import.
                                        </p>
                                    )}
                                    {/* The newest row is the one that moves the countdown. */}
                                    {good.length > 0 && (
                                        <p className="mt-2 flex items-start gap-2 text-[12px] text-slate-500">
                                            <Table2 size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                            The newest of these is {shortDate(good[0].performedAt)}. If that is
                                            later than the service this rule is counting from, importing moves
                                            the countdown to it.
                                        </p>
                                    )}
                                </>
                            )}
                        </section>
                    )}
                </div>

                <DialogFooter className="mt-0 shrink-0 border-t border-slate-200 bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={good.length === 0}
                        onClick={() => onImport(good)}
                        className={cn(
                            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
                            good.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300',
                        )}
                    >
                        <Check size={15} />
                        {good.length > 0 ? `Import ${good.length} service${good.length === 1 ? '' : 's'}` : 'Import'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
