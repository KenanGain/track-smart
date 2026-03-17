import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { type InspectionForSMS } from './sms-engine';
import { type SafetySettings } from './safetySettings';

interface Props {
  scoringMode: 'time' | 'distance';
  smsSettings: SafetySettings;
  inspections: InspectionForSMS[];
}

const BAND_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  { bg: 'bg-blue-500',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700'       },
  { bg: 'bg-amber-500',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700'     },
];

export function InspectionBandDistribution({ scoringMode, smsSettings, inspections }: Props) {
  const bands = useMemo(() => {
    const miPerMonth = smsSettings.smsAnnualVmtPerPU / 12;
    const lookback   = smsSettings.smsLookbackMonths;

    const defs = scoringMode === 'time'
      ? [
          { label: '0 – 6 months',   range: '×3.0  (0% decay)',  band: 1, weight: 3, lo: 0,   hi: 6   },
          { label: '6 – 12 months',  range: '×2.0  (5% decay)',  band: 2, weight: 2, lo: 6,   hi: 12  },
          { label: '12 – 24 months', range: '×1.0  (40% decay)', band: 3, weight: 1, lo: 12,  hi: 24  },
        ]
      : [
          { label: '0 – 50k mi',     range: '×3.0  (0% decay)',  band: 1, weight: 3, lo: 0,      hi: 50000   },
          { label: '50k – 150k mi',  range: '×2.0  (5% decay)',  band: 2, weight: 2, lo: 50000,  hi: 150000  },
          { label: '150k – 300k mi', range: '×1.0  (40% decay)', band: 3, weight: 1, lo: 150000, hi: 300000  },
        ];

    return defs.map(d => {
      const inBand = inspections.filter(i => {
        const ageMo = (Date.now() - new Date(i.date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        if (ageMo > lookback || ageMo < 0) return false;
        const val = scoringMode === 'time' ? ageMo : ageMo * miPerMonth;
        return val >= d.lo && val < d.hi;
      });

      const violations = inBand.reduce((s, i) => s + i.violations.length, 0);
      const oos        = inBand.reduce((s, i) => s + i.violations.filter(v => v.oos).length, 0);
      const wSeverity  = Math.round(
        inBand.reduce((s, i) => s + i.violations.reduce((vs, v) => vs + v.severity, 0) * d.weight, 0)
      );
      return { ...d, inspections: inBand.length, violations, oos, wSeverity };
    });
  }, [scoringMode, smsSettings, inspections]);

  const maxWS    = Math.max(...bands.map(b => b.wSeverity), 1);
  const totInsp  = bands.reduce((s, b) => s + b.inspections, 0);
  const totViol  = bands.reduce((s, b) => s + b.violations,  0);
  const totOos   = bands.reduce((s, b) => s + b.oos,         0);
  const totWS    = bands.reduce((s, b) => s + b.wSeverity,   0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2.5">
        <Activity size={14} className="text-violet-300" />
        <span className="text-sm font-bold text-white">Inspection Band Distribution</span>
        <span className="ml-2 text-[10px] text-slate-400">
          {scoringMode === 'time' ? 'Grouped by calendar age' : 'Grouped by estimated miles driven'}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all ${scoringMode === 'time' ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
            Time
          </span>
          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full transition-all ${scoringMode === 'distance' ? 'bg-violet-500 text-white' : 'bg-slate-600 text-slate-300'}`}>
            Distance
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_2fr] gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
        <div>Band</div>
        <div>{scoringMode === 'time' ? 'Age Range' : 'Distance Range'}</div>
        <div className="text-center">Insp.</div>
        <div className="text-center">Viol.</div>
        <div className="text-center">OOS</div>
        <div className="text-right">Wtd. Severity</div>
      </div>

      {/* Data rows */}
      {bands.map((b, idx) => {
        const c = BAND_COLORS[idx];
        return (
          <div
            key={b.band}
            className={`grid grid-cols-[2fr_2fr_1fr_1fr_1fr_2fr] gap-2 px-4 py-2.5 items-center border-b border-slate-100 last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
          >
            {/* Band number + label */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black text-white ${c.bg}`}>
                {b.band}
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{b.label}</span>
            </div>

            {/* Weight badge */}
            <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md inline-block ${c.badge}`}>
              {b.range}
            </div>

            {/* Inspections */}
            <div className="text-center">
              <span className={`text-sm font-black ${b.inspections > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                {b.inspections}
              </span>
            </div>

            {/* Violations */}
            <div className="text-center">
              <span className={`text-sm font-black ${b.violations > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                {b.violations}
              </span>
            </div>

            {/* OOS */}
            <div className="text-center">
              <span className={`text-sm font-black ${b.oos > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
                {b.oos}
              </span>
            </div>

            {/* Weighted severity bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${c.bg}`}
                  style={{ width: `${(b.wSeverity / maxWS) * 100}%` }}
                />
              </div>
              <span className={`text-[10px] font-bold w-8 text-right ${c.text}`}>{b.wSeverity}</span>
            </div>
          </div>
        );
      })}

      {/* Totals footer */}
      <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr_2fr] gap-2 px-4 py-2 bg-slate-800 text-[9px] font-bold text-slate-300">
        <div>TOTALS</div>
        <div className="text-slate-400 font-normal">
          {scoringMode === 'time'
            ? `VMT: ${(smsSettings.smsAnnualVmtPerPU / 1000).toFixed(0)}k mi/yr`
            : `${(smsSettings.smsAnnualVmtPerPU / 1000).toFixed(0)}k mi/yr · ${(smsSettings.smsAnnualVmtPerPU / 12000).toFixed(1)}k mi/mo`}
        </div>
        <div className="text-center text-white">{totInsp}</div>
        <div className="text-center text-red-300">{totViol}</div>
        <div className="text-center text-orange-300">{totOos}</div>
        <div className="text-right text-violet-300">{totWS}</div>
      </div>
    </div>
  );
}
