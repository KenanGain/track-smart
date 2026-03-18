import { useMemo, useState } from 'react';
import type { CvsaRow } from './NscAnalysis';

// CVOR-aligned category groupings (using Ontario CVOR / NSC Standard terminology)
const CVOR_SUMMARY_GROUPS = [
  { key: 'brakes',    label: 'Brake Systems',        nscStd: 'NSC 6',  codes: ['3', '4'] },
  { key: 'tires',     label: 'Tires',                nscStd: 'NSC 7',  codes: ['13'] },
  { key: 'lighting',  label: 'Lighting Devices',     nscStd: 'NSC 8',  codes: ['9', '16'] },
  { key: 'cargo',     label: 'Cargo Securement',     nscStd: 'NSC 9',  codes: ['10'] },
  { key: 'driver',    label: 'Driver Qualification', nscStd: 'NSC 10', codes: ['1'] },
  { key: 'hos',       label: 'Hours of Service',     nscStd: 'NSC 11', codes: ['2'] },
  { key: 'vehicle',   label: 'Vehicle Standards',    nscStd: 'NSC 13', codes: ['5', '7', '11', '12', '14', '15', '19', '20'] },
  { key: 'dangerous', label: 'Dangerous Goods',      nscStd: 'NSC 12', codes: ['18'] },
] as const;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthKey(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function getMonthKey(row: CvsaRow) {
  const [yearToken, monthTokenRaw] = row.date.trim().split(/\s+/);
  const monthIndex = MONTH_LABELS.findIndex((l) => l.toUpperCase() === monthTokenRaw.slice(0, 3).toUpperCase());
  return `${yearToken}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export function NscSummaryCard({
  rows,
  latestDateLabel,
  periodLabel,
}: {
  rows: CvsaRow[];
  latestDateLabel: string;
  periodLabel: string;
}) {
  const [summaryView, setSummaryView] = useState<'PERCENTILES' | 'INSPECTIONS'>('PERCENTILES');

  const summaryRows = useMemo(() => {
    const totalDefects = rows.reduce(
      (sum, row) => sum + (row.details?.oos.length ?? 0) + (row.details?.req.length ?? 0),
      0,
    );
    return CVOR_SUMMARY_GROUPS.map((group) => {
      const count = rows.reduce((sum, row) => {
        const defects = [...(row.details?.oos ?? []), ...(row.details?.req ?? [])];
        return sum + defects.filter((d) => group.codes.some((c) => c === d.split(' - ')[0])).length;
      }, 0);
      const percent = totalDefects > 0 ? Math.round((count / totalDefects) * 100) : 0;
      return { ...group, count, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [rows]);

  const inspectionTrend = useMemo(() => {
    const monthKeys = Array.from(new Set(rows.map(getMonthKey))).sort(
      (a, b) => parseMonthKey(a).getTime() - parseMonthKey(b).getTime(),
    );
    return monthKeys.map((key) => {
      const monthRows = rows.filter((row) => getMonthKey(row) === key);
      const date = parseMonthKey(key);
      const withViolations = monthRows.filter(
        (row) => (row.details?.oos.length ?? 0) + (row.details?.req.length ?? 0) > 0 || row.result !== 'Passed',
      ).length;
      return {
        key,
        label: `${MONTH_LABELS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`,
        total: monthRows.length,
        withViolations,
        clean: monthRows.length - withViolations,
      };
    });
  }, [rows]);

  const maxInspectionColumn = useMemo(
    () => Math.max(1, ...inspectionTrend.map((m) => m.total)),
    [inspectionTrend],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-bold text-slate-900">
          NSC Summary <span className="text-sm font-normal text-slate-400">/ {latestDateLabel}</span>
        </h3>
        <div className="inline-flex bg-slate-100 rounded-md p-0.5">
          {(['PERCENTILES', 'INSPECTIONS'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSummaryView(view)}
              className={`px-3.5 py-1.5 text-sm font-bold transition-colors rounded ${summaryView === view ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {/* ── PERCENTILES view ─────────────────────────────────────────────────── */}
      {summaryView === 'PERCENTILES' && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />Under Threshold</span>
            <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Over Threshold</span>
            <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />Intervention Threshold</span>
          </div>
          <div className="mt-5 space-y-3.5">
            {summaryRows.map((row) => {
              const tone = row.percent >= 50 ? 'bg-red-500' : row.percent >= 25 ? 'bg-amber-500' : 'bg-blue-500';
              const textTone = row.percent >= 50 ? 'text-red-600' : row.percent >= 25 ? 'text-amber-600' : 'text-slate-600';
              return (
                <div key={row.key} className="grid grid-cols-[minmax(160px,210px)_minmax(0,1fr)_56px] items-center gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-slate-800 truncate" title={row.label}>{row.label}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{row.nscStd} · {row.count} defects</span>
                  </div>
                  <div className="relative h-6 rounded-full bg-slate-100 overflow-hidden">
                    <div className="absolute inset-y-0 left-[35%] w-px bg-slate-300" />
                    <div className="absolute inset-y-0 left-[50%] w-0.5 bg-red-400/80" />
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.max(row.percent, row.count > 0 ? 8 : 0)}%` }} />
                    {row.count > 0 && (
                      <span
                        className={`absolute top-1/2 w-3.5 h-3.5 -translate-y-1/2 rounded-full border-2 border-white shadow ${tone}`}
                        style={{ left: `calc(${Math.max(row.percent, 8)}% - 7px)` }}
                      />
                    )}
                  </div>
                  <div className={`text-right text-sm font-bold tabular-nums ${textTone}`}>{row.percent}%</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── INSPECTIONS view ─────────────────────────────────────────────────── */}
      {summaryView === 'INSPECTIONS' && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded bg-red-700" />With Violations</span>
            <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded bg-rose-200" />Clean</span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-200">{rows.length} INSPECTIONS</div>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-5">
              <div className="flex items-end gap-3 min-h-[220px]">
                {inspectionTrend.map((month) => (
                  <div key={month.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
                    <div className="w-full max-w-[42px] flex flex-col justify-end gap-1 min-h-[180px]">
                      <div className="w-full rounded-t-md bg-rose-200" style={{ height: `${month.total > 0 ? Math.max((month.clean / maxInspectionColumn) * 180, month.clean > 0 ? 6 : 0) : 0}px` }} title={`${month.label}: ${month.clean} clean`} />
                      <div className="w-full rounded-t-md bg-red-700" style={{ height: `${month.total > 0 ? Math.max((month.withViolations / maxInspectionColumn) * 180, month.withViolations > 0 ? 6 : 0) : 0}px` }} title={`${month.label}: ${month.withViolations} with violations`} />
                    </div>
                    <div className="text-xs text-slate-400 text-center">{month.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="mt-4 text-xs text-slate-400">
        Showing NSC CVSA inspection outcomes for the last {periodLabel.toLowerCase()}.
      </div>
    </div>
  );
}
