import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';

import type { CvsaRow, NscPeriod } from './NscAnalysis';
import { cvsaDetailsData, parseDisplayDate } from './NscAnalysis';
import { NscOosSummaryCard } from './NscOosSummaryCard';
import { NscSummaryCard } from './NscSummaryCard';

const PERIOD_OPTIONS: NscPeriod[] = ['1M', '3M', '6M', '12M', '24M'];

const CVSA_OVERVIEW_GROUPS = [
  { key: 'vehicle', label: 'Vehicle Maintenance', codes: ['3', '4', '11', '12', '13', '15', '16'] },
  { key: 'hours', label: 'Hours-of-Service', codes: ['2'] },
  { key: 'lighting', label: 'Lighting & Visibility', codes: ['9'] },
  { key: 'dangerous', label: 'Dangerous Goods', codes: ['18'] },
  { key: 'driver', label: 'Driver Credentials', codes: ['1'] },
  { key: 'cargo', label: 'Cargo Securement', codes: ['10'] },
] as const;

function getPeriodMonths(period: NscPeriod) {
  return period === '1M' ? 1 : period === '3M' ? 3 : period === '6M' ? 6 : period === '12M' ? 12 : 24;
}

function getPeriodLabel(period: NscPeriod) {
  return period === '24M' ? '24 Months' : period === '12M' ? '12 Months' : period === '6M' ? '6 Months' : period === '3M' ? '3 Months' : '1 Month';
}

function getMetricSummary(rows: CvsaRow[]) {
  const totalDefects = rows.reduce((sum, row) => sum + (row.details?.oos.length ?? 0) + (row.details?.req.length ?? 0), 0);

  return CVSA_OVERVIEW_GROUPS.map((group) => {
    const defectCount = rows.reduce((sum, row) => {
      const defects = [...(row.details?.oos ?? []), ...(row.details?.req ?? [])];
      return sum + defects.filter((defect) => group.codes.some((code) => code === defect.split(' - ')[0])).length;
    }, 0);
    const inspections = rows.filter((row) => {
      const defects = [...(row.details?.oos ?? []), ...(row.details?.req ?? [])];
      return defects.some((defect) => group.codes.some((code) => code === defect.split(' - ')[0]));
    }).length;
    const percent = totalDefects > 0 ? Math.round((defectCount / totalDefects) * 100) : 0;

    return {
      ...group,
      percent,
      inspections,
      alert: percent >= 50,
    };
  });
}

export function NscCvsaOverview() {
  const [activeTime, setActiveTime] = useState<NscPeriod>('24M');

  const latestTimestamp = useMemo(
    () => cvsaDetailsData.reduce((maxTimestamp, row) => Math.max(maxTimestamp, parseDisplayDate(row.date)), 0),
    [],
  );
  const latestDateLabel = useMemo(() => {
    const latestDate = new Date(latestTimestamp);
    return `${latestDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' })} ${latestDate.getUTCFullYear()}`;
  }, [latestTimestamp]);
  const filteredCvsaRows = useMemo(() => {
    const latestDate = new Date(latestTimestamp);
    const cutoffDate = new Date(latestDate);
    cutoffDate.setUTCMonth(cutoffDate.getUTCMonth() - (getPeriodMonths(activeTime) - 1));
    cutoffDate.setUTCDate(1);
    const cutoffTimestamp = cutoffDate.getTime();

    return cvsaDetailsData.filter((row) => {
      const rowTimestamp = parseDisplayDate(row.date);
      return rowTimestamp >= cutoffTimestamp && rowTimestamp <= latestTimestamp;
    });
  }, [activeTime, latestTimestamp]);
  const metricRows = useMemo(() => getMetricSummary(filteredCvsaRows), [filteredCvsaRows]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
            Percentile Formula
            <Info size={12} className="text-slate-400" />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Updated December 2025</span>
            <div className="inline-flex bg-slate-100 rounded-md p-0.5">
              {PERIOD_OPTIONS.map((period) => (
                <button
                  key={period}
                  onClick={() => setActiveTime(period)}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors ${activeTime === period ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {metricRows.map((row) => (
            <div key={row.key} className="text-center">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 truncate" title={row.label}>
                {row.label}
              </div>
              <div className={`mt-2 text-[2rem] leading-none font-black ${row.alert ? 'text-red-600' : 'text-slate-900'}`}>
                {row.percent}%
              </div>
              <div className={`mt-2 text-xs font-bold ${row.alert ? 'text-red-500' : 'text-slate-500'}`}>
                {row.alert ? `▲ ${row.percent}` : `${row.inspections} insp.`}
              </div>
              <div className="mt-1 text-xs text-slate-400">{row.inspections} insp.</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px] items-start">
        <NscSummaryCard
          rows={filteredCvsaRows}
          latestDateLabel={latestDateLabel}
          periodLabel={getPeriodLabel(activeTime)}
        />
        <NscOosSummaryCard rows={cvsaDetailsData} period={activeTime} onPeriodChange={setActiveTime} />
      </div>
    </div>
  );
}
