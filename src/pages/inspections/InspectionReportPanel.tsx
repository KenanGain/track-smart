import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { cvsaDetailsData } from './NscAnalysis';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BasicItem {
  category: string;
  measure: string;
  percentile: string;
  alert: boolean;
  details: string;
}

interface CarrierProfile {
  rating: string;
  oosRates: {
    vehicle: { carrier: string; national: string };
    driver:  { carrier: string; national: string };
  };
  cvorAnalysis: {
    rating: number;
    collisions:  { percentage: number; weight: number };
    convictions: { percentage: number; weight: number };
    inspections: { percentage: number; weight: number };
    counts: {
      oosOverall: number; oosVehicle: number; oosDriver: number;
      collisions: number; convictions: number;
    };
  };
}

export interface InspectionReportPanelProps {
  variant: 'sms' | 'cvor' | 'nsc';
  basicOverview:   BasicItem[];
  csaThresholds:   { warning: number; critical: number };
  cvorThresholds:  { warning: number; intervention: number; showCause: number };
  cvorOosThresholds: { overall: number; vehicle: number; driver: number };
  carrierProfile:  CarrierProfile;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const RISK_COLORS = { Low: '#10b981', Moderate: '#f59e0b', High: '#f97316', Critical: '#ef4444' };
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function riskLabel(score: number): keyof typeof RISK_COLORS {
  if (score <= 25) return 'Low';
  if (score <= 50) return 'Moderate';
  if (score <= 75) return 'High';
  return 'Critical';
}

function RiskGauge({ score, label }: { score: number; label: string }) {
  const level = riskLabel(score);
  const color = RISK_COLORS[level];
  const arc = (score / 100) * 180;
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Semi-circle gauge */}
      <div className="relative w-36 h-18 overflow-hidden" style={{ height: 72 }}>
        <svg viewBox="0 0 120 60" className="w-full h-full">
          {/* Track */}
          <path d="M 10,60 A 50,50 0 0,1 110,60" fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
          {/* Filled */}
          <path
            d={`M 10,60 A 50,50 0 ${arc > 90 ? 1 : 0},1 ${10 + 100 * Math.cos((1 - arc / 180) * Math.PI)},${60 - 100 * Math.sin((1 - arc / 180) * Math.PI) * 0.5}`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <text x="60" y="55" textAnchor="middle" fontSize="18" fontWeight="900" fill={color}>{score}</text>
        </svg>
      </div>
      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color }}>{level}</span>
      <span className="text-[10px] text-slate-400">{label}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-3">{children}</h4>
  );
}

function MetricCard({ label, value, sub, tone = 'slate' }: { label: string; value: string | number; sub?: string; tone?: 'red' | 'amber' | 'green' | 'slate' | 'indigo' }) {
  const tones = {
    red:    'bg-red-50 border-red-100 text-red-700',
    amber:  'bg-amber-50 border-amber-100 text-amber-700',
    green:  'bg-emerald-50 border-emerald-100 text-emerald-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    slate:  'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${tones[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`text-xl font-black mt-0.5 ${tones[tone].split(' ')[2]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <div className="font-bold text-slate-700 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}: <span className="font-bold text-slate-800">{p.value}</span></span>
        </div>
      ))}
    </div>
  );
};

// ── SMS Report ─────────────────────────────────────────────────────────────────

function SmsReport({ basicOverview, csaThresholds, carrierProfile }: {
  basicOverview: BasicItem[];
  csaThresholds: { warning: number; critical: number };
  carrierProfile: CarrierProfile;
}) {
  const { riskScore, alertCount, validCount, avgPercentile } = useMemo(() => {
    const valid = basicOverview.filter(b => b.percentile !== 'N/A');
    const pcts = valid.map(b => parseInt(b.percentile) || 0);
    const avg = pcts.length ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length) : 0;
    const alerts = basicOverview.filter(b => b.alert).length;
    const score = Math.min(100, Math.round((alerts / 7) * 50 + (avg / 100) * 50));
    return { riskScore: score, alertCount: alerts, validCount: valid.length, avgPercentile: avg };
  }, [basicOverview]);

  const radarData = useMemo(() => basicOverview.map(b => ({
    subject: b.category
      .replace('Hours-of-service Compliance', 'HOS')
      .replace('Controlled Substances', 'Ctrl Sub')
      .replace('Vehicle Maintenance', 'Veh Maint')
      .replace('Driver Fitness', 'Drv Fit')
      .replace('Unsafe Driving', 'Unsafe Drv')
      .replace('Hazmat compliance', 'Hazmat')
      .replace('Crash Indicator', 'Crash'),
    Percentile: b.percentile !== 'N/A' ? parseInt(b.percentile) || 0 : 0,
    Threshold: csaThresholds.critical,
  })), [basicOverview, csaThresholds]);

  const barData = useMemo(() => basicOverview.map(b => ({
    name: b.category.length > 16 ? b.category.slice(0, 14) + '…' : b.category,
    fullName: b.category,
    percentile: b.percentile !== 'N/A' ? parseInt(b.percentile) || 0 : 0,
    measure: parseFloat(b.measure) || 0,
    alert: b.alert,
  })), [basicOverview]);

  return (
    <div className="space-y-6">

      {/* Top: Risk + metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
        <div className="col-span-2 md:col-span-1 flex justify-center">
          <RiskGauge score={riskScore} label="SMS Risk Score" />
        </div>
        <div className="col-span-2 md:col-span-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Safety Rating" value={carrierProfile.rating} tone="slate" />
          <MetricCard label="BASIC Alerts" value={alertCount} sub={`of ${basicOverview.length} categories`} tone={alertCount > 0 ? 'red' : 'green'} />
          <MetricCard label="Avg Percentile" value={validCount > 0 ? `${avgPercentile}%` : 'N/A'} sub={`from ${validCount} scored categories`} tone={avgPercentile >= csaThresholds.critical ? 'red' : avgPercentile >= csaThresholds.warning ? 'amber' : 'green'} />
          <MetricCard label="Vehicle OOS" value={carrierProfile.oosRates.vehicle.carrier} sub={`National: ${carrierProfile.oosRates.vehicle.national}`} tone="indigo" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* Radar */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>BASIC Percentile Overview — Radar</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <Radar name="Percentile" dataKey="Percentile" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
              <Radar name="Alert Threshold" dataKey="Threshold" stroke="#ef4444" fill="none" strokeDasharray="4 4" strokeWidth={1.5} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Bar */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>Percentile by BASIC Category</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} angle={-35} textAnchor="end" interval={0} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="percentile" name="Percentile %" radius={[3, 3, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.alert ? '#ef4444' : entry.percentile >= csaThresholds.warning ? '#f59e0b' : '#6366f1'} />
                ))}
              </Bar>
              <Bar dataKey="measure" name="Measure" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BASIC category table */}
      <div>
        <SectionTitle>BASIC Category Detail</SectionTitle>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="px-4 py-2.5 text-center font-bold text-slate-400 uppercase tracking-wider">Measure</th>
                <th className="px-4 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider">Percentile</th>
                <th className="px-4 py-2.5 text-center font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2.5 text-left font-bold text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {basicOverview.map((item, i) => {
                const pct = item.percentile !== 'N/A' ? parseInt(item.percentile) : null;
                return (
                  <tr key={i} className={item.alert ? 'bg-red-50/40' : ''}>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{item.category}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">{item.measure}</td>
                    <td className="px-4 py-2.5">
                      {pct !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: item.alert ? '#ef4444' : pct >= csaThresholds.warning ? '#f59e0b' : '#6366f1' }} />
                          </div>
                          <span className="font-bold text-slate-700 w-8 text-right">{pct}%</span>
                        </div>
                      ) : <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {item.alert
                        ? <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase bg-red-50 text-red-700 border-red-200">ALERT</span>
                        : <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border-emerald-200">OK</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{item.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── CVOR Report ────────────────────────────────────────────────────────────────

function CvorReport({ carrierProfile, cvorThresholds, cvorOosThresholds }: {
  carrierProfile: CarrierProfile;
  cvorThresholds: { warning: number; intervention: number; showCause: number };
  cvorOosThresholds: { overall: number; vehicle: number; driver: number };
}) {
  const cvorRating = carrierProfile.cvorAnalysis.rating;
  const riskScore = Math.min(100, Math.round((cvorRating / 100) * 100));

  const rFactorData = useMemo(() => [
    { name: 'Collisions',   value: carrierProfile.cvorAnalysis.collisions.percentage,  weight: carrierProfile.cvorAnalysis.collisions.weight },
    { name: 'Convictions',  value: carrierProfile.cvorAnalysis.convictions.percentage, weight: carrierProfile.cvorAnalysis.convictions.weight },
    { name: 'Inspections',  value: carrierProfile.cvorAnalysis.inspections.percentage, weight: carrierProfile.cvorAnalysis.inspections.weight },
  ], [carrierProfile]);

  const oosData = useMemo(() => [
    {
      name: 'Vehicle OOS',
      carrier: parseFloat(carrierProfile.oosRates.vehicle.carrier),
      national: parseFloat(carrierProfile.oosRates.vehicle.national),
      threshold: cvorOosThresholds.vehicle,
    },
    {
      name: 'Driver OOS',
      carrier: parseFloat(carrierProfile.oosRates.driver.carrier),
      national: parseFloat(carrierProfile.oosRates.driver.national),
      threshold: cvorOosThresholds.driver,
    },
  ], [carrierProfile, cvorOosThresholds]);

  const ratingStatus =
    cvorRating >= cvorThresholds.showCause   ? { label: 'SHOW CAUSE', color: '#ef4444' } :
    cvorRating >= cvorThresholds.intervention ? { label: 'INTERVENTION', color: '#f97316' } :
    cvorRating >= cvorThresholds.warning      ? { label: 'WARNING', color: '#fbbf24' } :
    { label: 'OK', color: '#10b981' };

  return (
    <div className="space-y-6">

      {/* Top row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
        <div className="col-span-2 md:col-span-1 flex justify-center">
          <RiskGauge score={riskScore} label="CVOR Risk Score" />
        </div>
        <div className="col-span-2 md:col-span-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="CVOR Rating" value={cvorRating.toFixed(2)} sub={ratingStatus.label} tone={ratingStatus.color === '#ef4444' ? 'red' : ratingStatus.color === '#f97316' ? 'amber' : ratingStatus.color === '#fbbf24' ? 'amber' : 'green'} />
          <MetricCard label="Overall OOS" value={`${carrierProfile.cvorAnalysis.counts.oosOverall}%`} sub={`Threshold: ${cvorOosThresholds.overall}%`} tone={carrierProfile.cvorAnalysis.counts.oosOverall > cvorOosThresholds.overall ? 'red' : 'green'} />
          <MetricCard label="Vehicle OOS" value={carrierProfile.oosRates.vehicle.carrier} sub={`National: ${carrierProfile.oosRates.vehicle.national}`} tone="indigo" />
          <MetricCard label="Driver OOS" value={carrierProfile.oosRates.driver.carrier} sub={`National: ${carrierProfile.oosRates.driver.national}`} tone="indigo" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* CVOR Rating threshold */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>CVOR Rating vs Thresholds</SectionTitle>
          <div className="space-y-3 mt-2">
            {[
              { label: 'Warning', threshold: cvorThresholds.warning, color: '#fbbf24' },
              { label: 'Intervention', threshold: cvorThresholds.intervention, color: '#f97316' },
              { label: 'Show Cause', threshold: cvorThresholds.showCause, color: '#ef4444' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-3 text-xs">
                <span className="w-24 font-bold text-slate-500">{t.label}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative">
                  <div className="h-full rounded-full opacity-30" style={{ width: `${(t.threshold / 100) * 100}%`, background: t.color }} />
                  <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: `${(t.threshold / 100) * 100}%` }} />
                </div>
                <span className="font-mono font-bold text-slate-600 w-8">{t.threshold}</span>
              </div>
            ))}
            {/* Current rating bar */}
            <div className="flex items-center gap-3 text-xs border-t border-slate-200 pt-3">
              <span className="w-24 font-black text-indigo-600">Current</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, cvorRating)}%`, background: ratingStatus.color }} />
              </div>
              <span className="font-mono font-black text-slate-800 w-8">{cvorRating.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* OOS comparison bar chart */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>OOS Rate — Carrier vs National</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={oosData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" domain={[0, 50]} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="carrier" name="Carrier %" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="national" name="National %" fill="#cbd5e1" radius={[0, 4, 4, 0]} barSize={14} />
              <Bar dataKey="threshold" name="Threshold %" fill="#fca5a5" radius={[0, 4, 4, 0]} barSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* R-Factor donut */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>R-Factor Component Breakdown</SectionTitle>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={rFactorData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {rFactorData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? '')} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {rFactorData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-slate-600 flex-1">{d.name}</span>
                  <span className="font-black text-slate-800 ml-2">{d.value.toFixed(1)}%</span>
                  <span className="text-slate-400">(w: {d.weight})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Conviction & collision counts */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>Conviction & Collision Counts</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={[
              { name: 'Convictions', value: carrierProfile.cvorAnalysis.counts.convictions, fill: '#6366f1' },
              { name: 'Collisions',  value: carrierProfile.cvorAnalysis.counts.collisions,  fill: '#ef4444' },
            ]} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[4, 4, 0, 0]}>
                {[0, 1].map(i => <Cell key={i} fill={i === 0 ? '#6366f1' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Threshold legend */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {[
          { label: 'Warning Threshold', value: cvorThresholds.warning, color: '#fbbf24' },
          { label: 'Intervention Threshold', value: cvorThresholds.intervention, color: '#f97316' },
          { label: 'Show Cause Threshold', value: cvorThresholds.showCause, color: '#ef4444' },
          { label: 'Current CVOR Rating', value: cvorRating.toFixed(2), color: ratingStatus.color },
        ].map(t => (
          <div key={t.label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color }} />
            <div>
              <div className="font-bold text-slate-700">{t.value}</div>
              <div className="text-slate-400">{t.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NSC Report ─────────────────────────────────────────────────────────────────

function NscReport() {
  const R_FACTOR = 0.339;
  const STAGE_THRESHOLDS = [
    { stage: 'Stage 1', min: 0.930, color: '#fbbf24' },
    { stage: 'Stage 2', min: 1.194, color: '#f97316' },
    { stage: 'Stage 3', min: 1.641, color: '#ef4444' },
    { stage: 'Stage 4', min: 2.134, color: '#991b1b' },
  ];
  const MAX_FACTOR = 2.134;
  const riskScore = Math.min(100, Math.round((R_FACTOR / MAX_FACTOR) * 100));

  const levelData = useMemo(() => {
    return [1, 2, 3, 4].map(level => {
      const rows = cvsaDetailsData.filter(r => r.level === level);
      return {
        level: `Level ${level}`,
        total: rows.length,
        OOS: rows.filter(r => r.result === 'Out Of Service').length,
        Passed: rows.filter(r => r.result === 'Passed').length,
        'Req. Attn': rows.filter(r => r.result === 'Requires Attention').length,
      };
    }).filter(d => d.total > 0);
  }, []);

  const nscComponents = [
    { name: 'Convictions',          value: 34.6, fill: '#ef4444' },
    { name: 'CVSA Inspections',     value: 32.3, fill: '#6366f1' },
    { name: 'Collisions',           value: 33.1, fill: '#f59e0b' },
    { name: 'Admin Penalties',      value: 0.0,  fill: '#cbd5e1' },
  ];

  const resultSummary = useMemo(() => {
    const total = cvsaDetailsData.length;
    const oos = cvsaDetailsData.filter(r => r.result === 'Out Of Service').length;
    const passed = cvsaDetailsData.filter(r => r.result === 'Passed').length;
    const req = cvsaDetailsData.filter(r => r.result === 'Requires Attention').length;
    return [
      { name: 'OOS',          value: oos,    pct: Math.round((oos / total) * 100),    fill: '#ef4444' },
      { name: 'Passed',       value: passed, pct: Math.round((passed / total) * 100), fill: '#10b981' },
      { name: 'Req. Attn.',   value: req,    pct: Math.round((req / total) * 100),    fill: '#f59e0b' },
    ];
  }, []);

  return (
    <div className="space-y-6">

      {/* Top row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
        <div className="col-span-2 md:col-span-1 flex justify-center">
          <RiskGauge score={riskScore} label="NSC Risk Score" />
        </div>
        <div className="col-span-2 md:col-span-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="R-Factor Score" value={R_FACTOR} sub="Current month-end" tone="indigo" />
          <MetricCard label="Stage 1 Threshold" value="0.930" sub="Monitoring triggered" tone="slate" />
          <MetricCard label="CVSA Total" value={cvsaDetailsData.length} sub="43 inspections" tone="slate" />
          <MetricCard label="OOS Rate" value={`${resultSummary[0].pct}%`} sub={`${resultSummary[0].value} of ${cvsaDetailsData.length}`} tone={resultSummary[0].pct > 30 ? 'red' : resultSummary[0].pct > 20 ? 'amber' : 'green'} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        {/* CVSA by level stacked bar */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>CVSA Inspection Outcomes by Level</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={levelData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="level" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Passed"     stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Req. Attn" stackId="a" fill="#f59e0b" />
              <Bar dataKey="OOS"        stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* R-Factor donut */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
          <SectionTitle>R-Factor Component Contribution</SectionTitle>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={nscComponents.filter(d => d.value > 0)} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {nscComponents.filter(d => d.value > 0).map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip formatter={(value) => typeof value === 'number' ? `${value.toFixed(1)}%` : String(value ?? '')} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {nscComponents.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.fill }} />
                  <span className="text-slate-600 flex-1">{d.name}</span>
                  <span className="font-black text-slate-800 ml-2">{d.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* R-Factor stage gauge */}
      <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4">
        <SectionTitle>R-Factor vs Monitoring Stage Thresholds</SectionTitle>
        <div className="space-y-2 mt-1">
          {STAGE_THRESHOLDS.map(t => (
            <div key={t.stage} className="flex items-center gap-3 text-xs">
              <span className="w-20 font-bold text-slate-500">{t.stage}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="h-full rounded-full opacity-25" style={{ width: `${(t.min / MAX_FACTOR) * 100}%`, background: t.color }} />
                <div className="absolute top-0 h-full w-0.5" style={{ left: `${(t.min / MAX_FACTOR) * 100}%`, background: t.color }} />
              </div>
              <span className="font-mono font-bold text-slate-500 w-10">{t.min}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 text-xs border-t border-slate-200 pt-2">
            <span className="w-20 font-black text-emerald-600">Current</span>
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(R_FACTOR / MAX_FACTOR) * 100}%` }} />
            </div>
            <span className="font-mono font-black text-emerald-700 w-10">{R_FACTOR}</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-3">Current R-Factor of {R_FACTOR} is below Stage 1 threshold (0.930) — carrier is not in a monitoring stage.</p>
      </div>

      {/* CVSA result summary */}
      <div className="grid grid-cols-3 gap-3">
        {resultSummary.map(r => (
          <div key={r.name} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{r.name}</div>
            <div className="text-2xl font-black mt-1" style={{ color: r.fill }}>{r.value}</div>
            <div className="text-xs text-slate-400">{r.pct}% of total</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────────

export function InspectionReportPanel(props: InspectionReportPanelProps) {
  const titles: Record<InspectionReportPanelProps['variant'], string> = {
    sms:  'SMS (FMCSA) Safety Report',
    cvor: 'CVOR (Canadian) Safety Report',
    nsc:  'NSC Carrier Profile Report',
  };

  return (
    <div className="bg-white border border-indigo-200 rounded-2xl shadow-md overflow-hidden mt-2 mb-2">
      {/* Header */}
      <div className="px-6 py-4 bg-indigo-50/60 border-b border-indigo-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">{titles[props.variant]}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Generated {new Date().toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
          Live Data
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        {props.variant === 'sms' && (
          <SmsReport
            basicOverview={props.basicOverview}
            csaThresholds={props.csaThresholds}
            carrierProfile={props.carrierProfile}
          />
        )}
        {props.variant === 'cvor' && (
          <CvorReport
            carrierProfile={props.carrierProfile}
            cvorThresholds={props.cvorThresholds}
            cvorOosThresholds={props.cvorOosThresholds}
          />
        )}
        {props.variant === 'nsc' && (
          <NscReport />
        )}
      </div>
    </div>
  );
}
