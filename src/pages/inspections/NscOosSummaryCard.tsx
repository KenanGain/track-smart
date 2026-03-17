import { useMemo, useState } from 'react';

import type { CvsaRow } from './NscAnalysis';

export type OosPeriod = '1M' | '3M' | '6M' | '12M' | '24M';

const OOS_PERIOD_OPTIONS: OosPeriod[] = ['1M', '3M', '6M', '12M', '24M'];

function getPeriodLabel(period: OosPeriod) {
  return period === '24M' ? '24 Months' : period === '12M' ? '12 Months' : period === '6M' ? '6 Months' : period === '3M' ? '3 Months' : '1 Month';
}

function getPeriodMonths(period: OosPeriod) {
  return period === '1M' ? 1 : period === '3M' ? 3 : period === '6M' ? 6 : period === '12M' ? 12 : 24;
}

function parseDisplayDate(value: string) {
  const [yearToken, monthTokenRaw, dayTokenRaw] = value.trim().split(/\s+/);
  const monthMap: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const monthToken = monthTokenRaw.slice(0, 3).toUpperCase();
  const dayToken = Number(dayTokenRaw);
  return Date.UTC(Number(yearToken), monthMap[monthToken], dayToken);
}

export function NscOosSummaryCard({
  rows,
  period: controlledPeriod,
  onPeriodChange,
}: {
  rows: CvsaRow[];
  period?: OosPeriod;
  onPeriodChange?: (period: OosPeriod) => void;
}) {
  const [uncontrolledPeriod, setUncontrolledPeriod] = useState<OosPeriod>('24M');
  const period = controlledPeriod ?? uncontrolledPeriod;
  const handlePeriodChange = onPeriodChange ?? setUncontrolledPeriod;

  const summary = useMemo(() => {
    const latestTimestamp = rows.reduce((maxTimestamp, row) => Math.max(maxTimestamp, parseDisplayDate(row.date)), 0);
    const cutoffDate = new Date(latestTimestamp);
    cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - getPeriodMonths(period));
    const cutoffTimestamp = cutoffDate.getTime();

    const rowsInPeriod = rows.filter((row) => {
      const rowTimestamp = parseDisplayDate(row.date);
      return rowTimestamp >= cutoffTimestamp && rowTimestamp <= latestTimestamp;
    });

    const totalInspections = rowsInPeriod.length;
    const oosInspections = rowsInPeriod.filter((row) => row.result === 'Out Of Service').length;
    const nonOosInspections = totalInspections - oosInspections;
    const oosPercent = totalInspections > 0 ? Math.round((oosInspections / totalInspections) * 100) : 0;
    const nonOosPercent = totalInspections > 0 ? 100 - oosPercent : 0;
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const nonOosStroke = (nonOosPercent / 100) * circumference;
    const oosStroke = circumference - nonOosStroke;

    return {
      totalInspections,
      oosInspections,
      nonOosInspections,
      oosPercent,
      nonOosPercent,
      nonOosStroke,
      oosStroke,
    };
  }, [period, rows]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 h-full">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-base font-bold text-slate-900">
          Out of Service Summary <span className="text-sm font-normal text-slate-400">/ NSC / Last {getPeriodLabel(period)}</span>
        </h3>
        <div className="inline-flex bg-slate-100 rounded-md p-0.5">
          {OOS_PERIOD_OPTIONS.map((value) => (
            <button
              key={value}
              onClick={() => handlePeriodChange(value)}
              className={`px-2.5 py-1 text-xs font-bold transition-colors ${period === value ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-8 flex-wrap">
        <div className="relative flex-shrink-0">
          <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true">
            <circle cx="56" cy="56" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
            {summary.nonOosInspections > 0 && (
              <circle
                cx="56"
                cy="56"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="10"
                strokeDasharray={`${summary.nonOosStroke} ${summary.oosStroke}`}
                strokeLinecap="round"
                transform="rotate(-90 56 56)"
              />
            )}
            {summary.oosInspections > 0 && (
              <circle
                cx="56"
                cy="56"
                r="45"
                fill="none"
                stroke="#ef4444"
                strokeWidth="10"
                strokeDasharray={`${summary.oosStroke} ${summary.nonOosStroke}`}
                strokeDashoffset={-summary.nonOosStroke}
                strokeLinecap="round"
                transform="rotate(-90 56 56)"
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[2rem] leading-none font-black text-slate-900">{summary.totalInspections}</span>
            <span className="mt-1 text-[11px] text-slate-500 uppercase tracking-[0.18em] font-bold">Inspections</span>
          </div>
        </div>

        <div className="min-w-[220px] space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-500" />
            <span className="text-slate-700">Non OOS</span>
            <span className="ml-auto font-bold text-slate-700">{summary.nonOosPercent}%</span>
            <span className="w-10 text-right text-slate-500">{summary.nonOosInspections}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500" />
            <span className="text-slate-700">Out-of-service</span>
            <span className="ml-auto font-bold text-slate-700">{summary.oosPercent}%</span>
            <span className="w-10 text-right text-slate-500">{summary.oosInspections}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
