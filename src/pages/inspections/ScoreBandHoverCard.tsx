export interface ScoreBandDetailRow {
  label: string;
  value: string;
  valueColor?: string;
}

export interface ScoreBandThresholdRow {
  label: string;
  value: string;
  color?: string;
}

interface ScoreBandHoverCardProps {
  title: string;
  range: string;
  accentColor: string;
  current?: {
    label: string;
    value: string;
  };
  description: string;
  detailRows?: ScoreBandDetailRow[];
  thresholdsTitle: string;
  thresholds: ScoreBandThresholdRow[];
  thresholdColumns?: 1 | 2;
}

export function ScoreBandHoverCard({
  title,
  range,
  accentColor,
  current,
  description,
  detailRows = [],
  thresholdsTitle,
  thresholds,
  thresholdColumns = 2,
}: ScoreBandHoverCardProps) {
  const thresholdGridClass =
    thresholdColumns === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: accentColor }}
      >
        <span className="text-white font-black text-[13px] tracking-wide">{title}</span>
        <span className="text-white/90 text-[11px] font-mono font-bold">{range}</span>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {current && (
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">{current.label}</span>
            <span className="text-[14px] font-black text-white">{current.value}</span>
          </div>
        )}

        <div className="text-[11px] leading-relaxed text-slate-300">{description}</div>

        {detailRows.length > 0 && (
          <div className="border-t border-slate-700/60 pt-2">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {detailRows.map((row) => (
                <div key={`${row.label}-${row.value}`} className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-400">{row.label}</span>
                  <span
                    className="text-[11px] font-bold font-mono text-right"
                    style={{ color: row.valueColor ?? '#ffffff' }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-700/60 pt-2">
          <div className="mb-1.5 text-[9px] uppercase tracking-wider text-slate-500">{thresholdsTitle}</div>
          <div className={`grid gap-x-4 gap-y-1 ${thresholdGridClass}`}>
            {thresholds.map((threshold) => (
              <div key={`${threshold.label}-${threshold.value}`} className="flex items-center justify-between gap-3">
                <span className="text-[10px]" style={{ color: threshold.color ?? '#cbd5e1' }}>
                  {threshold.label}
                </span>
                <span className="text-[11px] font-bold font-mono text-white">{threshold.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
        style={{
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '7px solid #0f172a',
        }}
      />
    </div>
  );
}
