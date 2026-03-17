import { useMemo, useState } from 'react';

import type { CvsaRow } from './NscAnalysis';

const NSC_SUMMARY_GROUPS = [
  { key: 'vehicle', label: 'Vehicle Maintenance', codes: ['3', '4', '11', '12', '13', '15', '16'] },
  { key: 'hours', label: 'Hours-of-Service', codes: ['2'] },
  { key: 'driver', label: 'Driver Credentials', codes: ['1'] },
  { key: 'lighting', label: 'Lighting & Visibility', codes: ['9'] },
  { key: 'cargo', label: 'Cargo Securement', codes: ['10'] },
  { key: 'trailer', label: 'Trailer / Coupling', codes: ['5', '7', '14', '19', '20'] },
  { key: 'dangerous', label: 'Dangerous Goods', codes: ['18'] },
] as const;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthKey(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function getMonthKey(row: CvsaRow) {
  const [yearToken, monthTokenRaw] = row.date.trim().split(/\s+/);
  const monthIndex = MONTH_LABELS.findIndex((label) => label.toUpperCase() === monthTokenRaw.slice(0, 3).toUpperCase());
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
    const totalDefects = rows.reduce((sum, row) => sum + (row.details?.oos.length ?? 0) + (row.details?.req.length ?? 0), 0);

    return NSC_SUMMARY_GROUPS.map((group) => {
      const count = rows.reduce((sum, row) => {
        const defects = [...(row.details?.oos ?? []), ...(row.details?.req ?? [])];
        return sum + defects.filter((defect) => group.codes.some((code) => code === defect.split(' - ')[0])).length;
      }, 0);
      const percent = totalDefects > 0 ? Math.round((count / totalDefects) * 100) : 0;

      return {
        ...group,
        count,
        percent,
        toneClass: percent >= 50 ? 'bg-red-500' : percent >= 25 ? 'bg-amber-500' : 'bg-blue-500',
        dotClass: percent >= 50 ? 'bg-red-500' : percent >= 25 ? 'bg-amber-500' : 'bg-blue-500',
      };
    }).sort((a, b) => b.percent - a.percent);
  }, [rows]);

  const inspectionTrend = useMemo(() => {
    const monthKeys = Array.from(new Set(rows.map(getMonthKey))).sort((a, b) => parseMonthKey(a).getTime() - parseMonthKey(b).getTime());

    return monthKeys.map((key) => {
      const monthRows = rows.filter((row) => getMonthKey(row) === key);
      const date = parseMonthKey(key);
      const withViolations = monthRows.filter((row) => (row.details?.oos.length ?? 0) + (row.details?.req.length ?? 0) > 0 || row.result !== 'Passed').length;
      const clean = monthRows.length - withViolations;

      return {
        key,
        label: `${MONTH_LABELS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`,
        total: monthRows.length,
        withViolations,
        clean,
      };
    });
  }, [rows]);

  const maxInspectionColumn = useMemo(
    () => Math.max(1, ...inspectionTrend.map((month) => month.total)),
    [inspectionTrend],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-bold text-slate-900">
          NSC Summary <span className="text-sm font-normal text-slate-400">/ {latestDateLabel}</span>
        </h3>
        <div className="inline-flex bg-slate-100 rounded-md p-0.5">
          {(['PERCENTILES', 'INSPECTIONS'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setSummaryView(view)}
              className={`px-3.5 py-1.5 text-sm font-bold transition-colors ${summaryView === view ? 'bg-white text-indigo-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {view}
            </button>
          ))}
        </div>
      </div>

      {summaryView === 'PERCENTILES' ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Under Threshold
            </span>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              Over Threshold
            </span>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Intervention Threshold
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {summaryRows.map((row) => (
              <div key={row.key} className="grid grid-cols-[minmax(170px,220px)_minmax(240px,1fr)_60px] items-center gap-4">
                <div className="text-sm font-semibold text-slate-800 truncate" title={row.label}>{row.label}</div>
                <div className="relative h-7 rounded-full bg-slate-100 overflow-hidden">
                  <div className="absolute inset-y-0 left-[35%] w-px bg-slate-300" />
                  <div className="absolute inset-y-0 left-[50%] w-0.5 bg-red-400/90" />
                  <div className={`h-full rounded-full ${row.toneClass}`} style={{ width: `${Math.max(row.percent, row.count > 0 ? 10 : 0)}%` }} />
                  {row.count > 0 && (
                    <span
                      className={`absolute top-1/2 w-4 h-4 -translate-y-1/2 rounded-full border-2 border-white shadow ${row.dotClass}`}
                      style={{ left: `calc(${Math.max(row.percent, 10)}% - 8px)` }}
                    />
                  )}
                </div>
                <div className={`text-right text-sm font-bold ${row.percent >= 50 ? 'text-red-600' : row.percent >= 25 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {row.percent}%
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded bg-red-700" />
              Inspections with Violations
            </span>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-3 h-3 rounded bg-rose-200" />
              Clean Inspections
            </span>
          </div>

          <div className="mt-6">
            <div className="text-2xl font-black text-slate-300">{rows.length} INSPECTIONS</div>
            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-5">
              <div className="flex items-end gap-3 min-h-[260px]">
                {inspectionTrend.map((month) => (
                  <div key={month.key} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-2">
                    <div className="w-full max-w-[42px] flex flex-col justify-end gap-1 min-h-[220px]">
                      <div
                        className="w-full rounded-t-md bg-rose-200"
                        style={{ height: `${month.total > 0 ? Math.max((month.clean / maxInspectionColumn) * 220, month.clean > 0 ? 8 : 0) : 0}px` }}
                        title={`${month.label}: ${month.clean} clean inspections`}
                      />
                      <div
                        className="w-full rounded-t-md bg-red-700"
                        style={{ height: `${month.total > 0 ? Math.max((month.withViolations / maxInspectionColumn) * 220, month.withViolations > 0 ? 8 : 0) : 0}px` }}
                        title={`${month.label}: ${month.withViolations} inspections with violations`}
                      />
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
