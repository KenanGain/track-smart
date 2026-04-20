import { useState } from 'react';
import { Activity } from 'lucide-react';
import { ScoreBandHoverCard } from './ScoreBandHoverCard';

// ─── Pull-by-Pull monthly history ────────────────────────────────────────────

interface BcMonthRow { month:string; vd:number; ad:number; avg:number; contra:number; cvsa:number; acc:number; total:number; }

const BC_MONTH_ROWS: BcMonthRow[] = [
  { month:'2025-03', vd:28308, ad:365, avg:77.56, contra:0.30, cvsa:0.31, acc:0.00, total:0.61 },
  { month:'2025-02', vd:28186, ad:365, avg:77.22, contra:0.30, cvsa:0.31, acc:0.05, total:0.66 },
  { month:'2025-01', vd:28080, ad:366, avg:76.72, contra:0.20, cvsa:0.23, acc:0.05, total:0.48 },
  { month:'2024-12', vd:27815, ad:366, avg:76.00, contra:0.17, cvsa:0.24, acc:0.05, total:0.46 },
  { month:'2024-11', vd:27517, ad:366, avg:75.18, contra:0.17, cvsa:0.28, acc:0.05, total:0.50 },
  { month:'2024-10', vd:27229, ad:366, avg:74.40, contra:0.16, cvsa:0.32, acc:0.05, total:0.53 },
  { month:'2024-09', vd:26943, ad:366, avg:73.61, contra:0.22, cvsa:0.29, acc:0.05, total:0.56 },
  { month:'2024-08', vd:26644, ad:366, avg:72.80, contra:0.34, cvsa:0.29, acc:0.05, total:0.68 },
  { month:'2024-07', vd:26170, ad:366, avg:71.50, contra:0.39, cvsa:0.29, acc:0.06, total:0.74 },
  { month:'2024-06', vd:25647, ad:366, avg:70.07, contra:0.37, cvsa:0.26, acc:0.06, total:0.69 },
  { month:'2024-05', vd:25139, ad:366, avg:68.69, contra:0.39, cvsa:0.39, acc:0.06, total:0.84 },
  { month:'2024-04', vd:24638, ad:366, avg:67.32, contra:0.45, cvsa:0.45, acc:0.06, total:0.96 },
  { month:'2024-03', vd:24330, ad:366, avg:66.48, contra:0.45, cvsa:0.41, acc:0.12, total:0.98 },
  { month:'2024-02', vd:24249, ad:366, avg:66.25, contra:0.63, cvsa:0.36, acc:0.09, total:1.08 },
];

const PBP_THRESH: Record<string,[number,number]> = {
  contra:[1.76,2.98], cvsa:[0.93,1.08], acc:[0.23,0.27], total:[2.13,3.64],
};
function pbpColor(cat:string, v:number) {
  const [s,c] = PBP_THRESH[cat] ?? [1,2];
  return v >= c ? '#dc2626' : v >= s ? '#d97706' : '#16a34a';
}

const PBP_PAGE = 10;

function BcMonthHistoryTable() {
  const [page, setPage] = useState(1);
  const n     = BC_MONTH_ROWS.length;
  const pages = Math.max(1, Math.ceil(n / PBP_PAGE));
  const rows  = BC_MONTH_ROWS.slice((page - 1) * PBP_PAGE, page * PBP_PAGE);
  return (
    <div className="mt-4 rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Pull-by-Pull Monthly History</span>
        <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">{n} months</span>
        <span className="ml-auto text-[9px] text-slate-400">Newest first &middot; scores color-coded to BC thresholds</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="px-3 py-2 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Month</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total Active<br/>Vehicle Days</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Active<br/>Monthly Days</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Average<br/>Fleet Size</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Contraventions<br/>Score</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-blue-500  uppercase tracking-wider whitespace-nowrap">CVSA<br/>Score</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-rose-400  uppercase tracking-wider whitespace-nowrap">Accident<br/>Score</th>
              <th className="px-3 py-2 text-right  text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Total<br/>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i) => (
              <tr key={r.month} className={`border-b border-slate-50 ${i%2===1?'bg-slate-50/40':''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-slate-800">{r.month}</span>
                    {page===1&&i===0&&<span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Latest</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-600">{r.vd.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-600">{r.ad.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-600">{r.avg.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] font-bold" style={{color:pbpColor('contra',r.contra)}}>{r.contra.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] font-bold" style={{color:pbpColor('cvsa',  r.cvsa  )}}>{r.cvsa.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] font-bold" style={{color:pbpColor('acc',   r.acc   )}}>{r.acc.toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] font-bold" style={{color:pbpColor('total', r.total )}}>{r.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page-1)*PBP_PAGE+1}&ndash;{Math.min(page*PBP_PAGE,n)} of {n}</span>
        <div className="flex items-center gap-1">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100 text-slate-600">&#8249;</button>
          {Array.from({length:pages},(_,i)=>i+1).map(p=>(
            <button key={p} onClick={()=>setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p===page?'bg-blue-600 text-white border-blue-600':'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-100 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NscBcDemographics {
  carrierName: string;
  jurisdiction: string;
  primaryBusinessType: string;
  certificateIssueDate: string;
  extraProvincial: boolean;
  mailingAddress: string;
  premiumCarrier: boolean;
  weigh2GoBC: boolean;
  preventativeMaintenance: boolean;
  numberOfLicensedVehicles: number;
  nscNumber: string;
  reportRunDate: string;
  profileFrom: string;
  profileTo: string;
}

export interface NscBcCertificate {
  certificateStatus: string;
  safetyRating: string;
  profileStatus: string;
  auditStatus: string;
}

export interface NscBcProfileScore {
  category: string;
  score: number;
  events: number;
}

export interface NscBcComplianceReview {
  asOfDate: string;
  averageFleetSize: number;
  scores: NscBcProfileScore[];
  totalScore: number;
}

export interface NscBcThresholdRange {
  status: string;
  contraventions: string;
  cvsa: string;
  accidents: string;
  total: string;
}

export interface NscBcIntervention {
  type: string;
  date: string;
  description?: string;
}

export interface NscBcCarrierProfileProps {
  demographics: NscBcDemographics;
  certificate: NscBcCertificate;
  complianceReview: NscBcComplianceReview;
  thresholds: NscBcThresholdRange[];
  interventions: NscBcIntervention[];
}

// ─── Default Data ─────────────────────────────────────────────────────────────

export const INERTIA_CARRIER_BC_DATA: NscBcCarrierProfileProps = {
  demographics: {
    carrierName: 'INERTIA CARRIER LTD.',
    jurisdiction: 'BC',
    primaryBusinessType: 'General Freight',
    certificateIssueDate: '11-Jan-2016',
    extraProvincial: true,
    mailingAddress: '101-17564 56A AVE, SURREY BC V3S 1G3',
    premiumCarrier: false,
    weigh2GoBC: false,
    preventativeMaintenance: false,
    numberOfLicensedVehicles: 73,
    nscNumber: '202-422-480',
    reportRunDate: '17-Apr-2025',
    profileFrom: '17-Apr-2023',
    profileTo: '17-Apr-2025',
  },
  certificate: {
    certificateStatus: 'Active',
    safetyRating: 'Satisfactory - Unaudited',
    profileStatus: 'Satisfactory',
    auditStatus: 'Unaudited',
  },
  complianceReview: {
    asOfDate: '31-Mar-2025',
    averageFleetSize: 77.56,
    scores: [
      { category: 'Contraventions',        score: 0.30, events: 5  },
      { category: 'CVSA (Out of Service)', score: 0.31, events: 8  },
      { category: 'Accidents',             score: 0.00, events: 0  },
    ],
    totalScore: 0.61,
  },
  thresholds: [
    { status: 'Satisfactory',   contraventions: '0.00 – 1.76', cvsa: '0.00 – 0.93', accidents: '0.00 – 0.23', total: '0.00 – 2.13' },
    { status: 'Conditional',    contraventions: '1.77 – 2.98', cvsa: '0.94 – 1.08', accidents: '0.24 – 0.27', total: '2.14 – 3.64' },
    { status: 'Unsatisfactory', contraventions: '2.99+',       cvsa: '1.09+',       accidents: '0.28+',       total: '3.65+'      },
  ],
  interventions: [
    {
      type: 'Audit - Triggered',
      date: '01-Jun-2023',
      description: 'Triggered interventions occur due to the carrier\'s profile scores exceeding the thresholds set by the NSC program office in any one of the four categories.',
    },
  ],
};

// ─── BC stage thresholds (total score) ───────────────────────────────────────

const BC_STAGES = [
  { stage: 1, low: 2.13 },
  { stage: 2, low: 2.98 },
  { stage: 3, low: 3.64 },
  { stage: 4, low: 4.50 },
];

// BC per-category limits  { sat, cond, max }
const CAT_LIM: Record<string, { sat: number; cond: number; max: number; desc: string }> = {
  'Contraventions':        { sat: 1.76, cond: 2.98, max: 4.0, desc: 'Contravention score from violations and convictions against the carrier.' },
  'CVSA (Out of Service)': { sat: 0.93, cond: 1.08, max: 1.6, desc: 'CVSA roadside inspection OOS orders and defect violations.' },
  'Accidents':             { sat: 0.23, cond: 0.27, max: 0.5, desc: 'Reportable collision and accident score from the profile period.' },
};

// Total score thresholds
const TOTAL_LIM = { sat: 2.13, cond: 3.64, max: 7.0, desc: 'Combined total of all category scores. Determines the carrier\'s overall NSC profile status and monitoring stage.' };

// ─── Color helpers — IDENTICAL to NscPerformanceCard ─────────────────────────

function bcStageNum(total: number): number {
  for (let i = BC_STAGES.length - 1; i >= 0; i--)
    if (total >= BC_STAGES[i].low) return BC_STAGES[i].stage;
  return 0;
}

// Stage colors — exact copy from NscPerformanceCard SC()
const SC = (s: number) =>
  s === 0 ? '#16a34a' : s === 1 ? '#b45309' : s === 2 ? '#d97706' : s === 3 ? '#dc2626' : '#7f1d1d';

// Stage badge — exact copy from NscPerformanceCard SB()
const SB = (s: number) =>
  s === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
: s === 1 ? 'bg-yellow-100  text-yellow-800  border-yellow-300'
: s === 2 ? 'bg-amber-100   text-amber-800   border-amber-300'
: s === 3 ? 'bg-red-100     text-red-800     border-red-300'
:           'bg-red-200     text-red-900     border-red-400';

// Stage banner — exact copy from NscPerformanceCard SBANNER()
const SBANNER = (s: number) =>
  s === 0 ? 'bg-emerald-50/80 border-emerald-200'
: s === 1 ? 'bg-yellow-50/80  border-yellow-200'
: s === 2 ? 'bg-amber-50/80   border-amber-200'
: s === 3 ? 'bg-red-50/80     border-red-200'
:           'bg-red-100/80    border-red-300';

// ─── Contribution tile helpers — mirrors cc/cb/cl/ctile from NscPerformanceCard
// For BC: map score status → same color scheme (SAT=LOW-green, COND=MODERATE-amber, UNSAT=HIGH-red)

type BcScoreSt = 'satisfactory' | 'conditional' | 'unsatisfactory';

function bcScoreSt(cat: string, val: number): BcScoreSt {
  const t = CAT_LIM[cat];
  if (!t) return 'satisfactory';
  if (val >= t.cond) return 'unsatisfactory';
  if (val >= t.sat)  return 'conditional';
  return 'satisfactory';
}

function bcTotalStatus(total: number): BcScoreSt {
  if (total >= TOTAL_LIM.cond) return 'unsatisfactory';
  if (total >= TOTAL_LIM.sat) return 'conditional';
  return 'satisfactory';
}

// Score color (mirrors cc — green/amber/red)
const bcc = (st: BcScoreSt) =>
  st === 'unsatisfactory' ? '#dc2626' : st === 'conditional' ? '#d97706' : '#16a34a';

// Badge class (mirrors cb)
const bcb = (st: BcScoreSt) =>
  st === 'unsatisfactory' ? 'bg-red-100     text-red-700    border-red-300'
: st === 'conditional'    ? 'bg-amber-100   text-amber-700  border-amber-300'
:                           'bg-emerald-100 text-emerald-700 border-emerald-300';

// Badge label (mirrors cl — NONE/LOW/MODERATE/PRIMARY → SATISFACTORY/CONDITIONAL/UNSATISFACTORY)
const bcl = (st: BcScoreSt) =>
  st === 'unsatisfactory' ? 'UNSATISFACTORY' : st === 'conditional' ? 'CONDITIONAL' : 'SATISFACTORY';

// Tile background (mirrors ctile)
const bctile = (st: BcScoreSt) =>
  st === 'unsatisfactory' ? 'bg-red-50/70     border-red-200'
: st === 'conditional'    ? 'bg-amber-50/70   border-amber-200'
:                           'bg-emerald-50/70 border-emerald-200';

// ─── Gradients — exact copy from NscPerformanceCard ──────────────────────────

const GRAD   = 'linear-gradient(to right,#22c55e 0%,#84cc16 18%,#eab308 32%,#f97316 52%,#ef4444 70%,#991b1b 100%)';
const C_GRAD = 'linear-gradient(to right,#22c55e 0%,#84cc16 18%,#eab308 32%,#f97316 58%,#ef4444 80%,#991b1b 100%)';

// ─── Component ────────────────────────────────────────────────────────────────

export function NscBcCarrierProfile({
  demographics, certificate, complianceReview, interventions,
}: NscBcCarrierProfileProps) {
  const [actionsOpen, setActionsOpen]   = useState(false);
  const [threshOpen,  setThreshOpen]    = useState(false);

  // ── Main score bar (same math as NscPerformanceCard) ──
  const stage       = bcStageNum(complianceReview.totalScore);
  const totalStatus = bcTotalStatus(complianceReview.totalScore);
  const scoreColor  = SC(stage);
  const s4low       = TOTAL_LIM.max / 1.55;
  const rMax       = s4low * 1.55;                           // ≈ 6.975 → keeps bar proportions similar
  const markerPct  = Math.min((complianceReview.totalScore / rMax) * 100, 99.5);
  const threshPcts = BC_STAGES.map(t => ({ ...t, pct: (t.low / rMax) * 100 }));
  const totalThreshPcts = [
    { key: 'sat', low: TOTAL_LIM.sat, pct: (TOTAL_LIM.sat / rMax) * 100, color: '#16a34a' },
    { key: 'cond', low: TOTAL_LIM.cond, pct: (TOTAL_LIM.cond / rMax) * 100, color: '#dc2626' },
  ];
  void threshPcts;

  const statusMsg =
    stage === 0
      ? `Not on NSC monitoring — performance is within acceptable range for fleet 30.0-44.9`
      : stage === 1 ? `Carrier has entered Stage 1 monitoring (Total ${complianceReview.totalScore.toFixed(3)} ≥ ${BC_STAGES[0].low.toFixed(3)}) — implement corrective measures`
      : stage === 2 ? 'Carrier is at Stage 2 monitoring — corrective action plan required and must be submitted'
      : stage === 3 ? 'Carrier is at Stage 3 monitoring — compliance review and audit required immediately'
      :               'Carrier is at Stage 4 monitoring — highest risk level, imminent enforcement action';

  // ── Recommended actions ──
  type Sev = 'critical' | 'warning' | 'info';
  interface Action { title: string; desc: string; severity: Sev }
  const recommendedActions: Action[] = [];

  if (stage >= 3)
    recommendedActions.push({ severity: 'critical', title: 'Compliance Review Required', desc: `Total score ${complianceReview.totalScore.toFixed(3)} has reached Stage ${stage} — submit a corrective action plan and prepare for compliance audit.` });
  else if (stage >= 1)
    recommendedActions.push({ severity: 'warning', title: `Stage ${stage} Monitoring Active`, desc: `Total score ${complianceReview.totalScore.toFixed(3)} exceeds Stage ${stage} threshold — implement corrective measures to reduce the score.` });

  complianceReview.scores.forEach(s => {
    const st = bcScoreSt(s.category, s.score);
    const t  = CAT_LIM[s.category];
    if (st === 'unsatisfactory')
      recommendedActions.push({ severity: 'critical', title: `Address ${s.category} Score`, desc: `Score ${s.score.toFixed(2)} exceeds the Unsatisfactory threshold (${t?.cond}) — immediate corrective action required.` });
    else if (st === 'conditional')
      recommendedActions.push({ severity: 'warning', title: `${s.category} in Conditional Range`, desc: `Score ${s.score.toFixed(2)} is in the Conditional range — corrective measures recommended to return to Satisfactory.` });
  });

  if (interventions.length > 0)
    recommendedActions.push({ severity: 'warning', title: 'Active NSC Interventions', desc: `${interventions.length} intervention(s) on record in the past 25 months — review compliance history and follow-up actions.` });

  if (recommendedActions.length === 0)
    recommendedActions.push({ severity: 'info', title: 'Performance Within Acceptable Range', desc: `All scores are Satisfactory as of ${complianceReview.asOfDate}. Continue monitoring monthly and maintain current safety programs.` });

  const criticalCount = recommendedActions.filter(a => a.severity === 'critical').length;

  // ── Hover zones (same as NscPerformanceCard) ──
  const zones = [
    { label: 'SATISFACTORY', start: 0, end: totalThreshPcts[0].pct, color: '#16a34a', range: '0.00 - 2.13', current: totalStatus === 'satisfactory' },
    { label: 'CONDITIONAL', start: totalThreshPcts[0].pct, end: totalThreshPcts[1].pct, color: '#d97706', range: '2.14 - 3.64', current: totalStatus === 'conditional' },
    { label: 'UNSATISFACTORY', start: totalThreshPcts[1].pct, end: 100, color: '#dc2626', range: '3.65 and above', current: totalStatus === 'unsatisfactory' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* ── HEADER ── */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Activity size={15} className="text-slate-600"/>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">NSC Performance</div>
            <div className="text-[11px] text-slate-500">
              {demographics.carrierName} · British Columbia · 12-Month Profile as of {complianceReview.asOfDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            Latest Pull {demographics.reportRunDate}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            NSC Summary
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* ── Certificate Status Bar ── */}
        <div className="px-5 py-3 bg-slate-50/60 border-b border-slate-100">
          <div className="grid grid-cols-4 gap-4">
            {([
              { label: 'Certificate Status', value: certificate.certificateStatus },
              { label: 'Safety Rating',      value: certificate.safetyRating      },
              { label: 'Profile Status',     value: certificate.profileStatus     },
              { label: 'Audit Status',       value: certificate.auditStatus       },
            ] as { label: string; value: string }[]).map(item => {
              const isActive = item.value === 'Active';
              const isSat    = item.value.toLowerCase().startsWith('satisfactory');
              const valueColor = isActive || isSat ? '#16a34a' : '#d97706';
              return (
                <div key={item.label}>
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</div>
                  <div className="text-[12px] font-bold" style={{ color: valueColor }}>{item.value}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── SECTION 1: NSC Profile Score + spectrum ── */}
        <div className="px-5 pt-5 pb-5">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">NSC Profile Score</div>

          <div className="flex items-start gap-4 mb-4">
            <div className="text-[52px] leading-none font-black tracking-tight" style={{ color: scoreColor }}>
              {complianceReview.totalScore.toFixed(3)}
            </div>
            <div className="pt-1 space-y-1.5">
              <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${SB(stage)}`}>
                {stage === 0 ? 'NOT MONITORED' : `STAGE ${stage}`}
              </span>
              <div className="text-[11px] text-slate-500 leading-snug">
                Carrier must strive for the <span className="font-semibold text-slate-700">lowest score</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-mono font-bold text-slate-600">Fleet 30.0-44.9</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                <span className="font-mono font-bold text-slate-600">Truck</span>
              </div>
            </div>
          </div>

          {/* Spectrum bar — identical markup to NscPerformanceCard */}
          <div className="relative" style={{ paddingTop: 28 }}>
            <div className="absolute z-10 flex flex-col items-center pointer-events-none"
              style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', top: 0 }}>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white whitespace-nowrap shadow-md"
                style={{ background: scoreColor }}>{complianceReview.totalScore.toFixed(3)}</span>
              <div className="w-[2px] h-3.5" style={{ background: scoreColor }}/>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full translate-y-0.5 blur-sm opacity-25" style={{ background: GRAD }}/>
              <div className="relative h-[22px] rounded-full overflow-hidden"
                style={{ background: GRAD, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.22)' }}>
                <div className="absolute top-0 left-0 right-0 h-[8px] rounded-t-full"
                  style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                {totalThreshPcts.map(t => (
                  <div key={t.key} className="absolute top-0 bottom-0 w-[1.5px] bg-white/50"
                    style={{ left: `${t.pct}%` }}/>
                ))}
                <div className="absolute top-0 bottom-0 w-[3px] rounded-full"
                  style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 0 6px 2px rgba(0,0,0,0.32)' }}/>
              </div>
              {/* Hover zones — identical to NscPerformanceCard */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {zones.map(z => {
                  return (
                    <div key={z.label} className="absolute inset-y-0 group/zone cursor-crosshair"
                      style={{ left: `${z.start}%`, width: `${z.end - z.start}%` }}>
                      <div className="absolute inset-0 bg-white/0 group-hover/zone:bg-white/20 transition-colors duration-150 rounded"/>
                      <div className="hidden group-hover/zone:block absolute z-50 pointer-events-none"
                        style={{ bottom: 'calc(100% + 14px)', left: '50%', transform: 'translateX(-50%)', width: 260 }}>
                        <ScoreBandHoverCard
                          title={z.label}
                          range={z.range}
                          accentColor={z.color}
                          current={z.current ? { label: 'Current Score', value: complianceReview.totalScore.toFixed(3) } : undefined}
                          description={
                            z.label === 'SATISFACTORY'
                              ? 'Profile remains within the satisfactory band for the current fleet range.'
                              : z.label === 'CONDITIONAL'
                                ? 'Profile has entered the conditional band and needs corrective attention.'
                                : 'Profile is in the unsatisfactory band and requires immediate regulatory action.'
                          }
                          detailRows={[
                            { label: 'Fleet', value: '30.0-44.9' },
                            { label: 'Vehicle Type', value: 'Truck' },
                            { label: 'Profile Date', value: complianceReview.asOfDate },
                            { label: 'Report Run', value: demographics.reportRunDate },
                          ]}
                          thresholdsTitle="BC Profile Bands"
                          thresholds={[
                            { label: 'Satisfactory', value: '0.00 - 2.13', color: '#16a34a' },
                            { label: 'Conditional', value: '2.14 - 3.64', color: '#d97706' },
                            { label: 'Unsatisfactory', value: '>= 3.65', color: '#dc2626' },
                          ]}
                          thresholdColumns={1}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Threshold value labels — actual numeric values at each tick */}
            <div className="relative mt-1" style={{ height: 18 }}>
              <span className="absolute text-[9px] font-mono font-semibold text-emerald-700 whitespace-nowrap" style={{ left: '0%' }}>
                0.00
              </span>
              {totalThreshPcts.map(t => (
                <span key={t.key} className="absolute text-[9px] font-mono font-semibold whitespace-nowrap"
                  style={{ left: `${t.pct}%`, transform: 'translateX(-50%)', color: t.color }}>
                  {t.low.toFixed(2)}
                </span>
              ))}
              {/* Satisfactory / Conditional / Unsatisfactory zone labels */}
              <span className="absolute text-[8px] font-bold text-emerald-600 whitespace-nowrap"
                style={{ left: `${totalThreshPcts[0].pct / 2}%`, transform: 'translateX(-50%)', top: 10 }}>
                SATISFACTORY
              </span>
              <span className="absolute text-[8px] font-bold text-amber-600 whitespace-nowrap"
                style={{ left: `${(totalThreshPcts[0].pct + totalThreshPcts[1].pct) / 2}%`, transform: 'translateX(-50%)', top: 10 }}>
                CONDITIONAL
              </span>
              <span className="absolute text-[8px] font-bold text-red-600 whitespace-nowrap"
                style={{ left: `${(totalThreshPcts[1].pct + 100) / 2}%`, transform: 'translateX(-50%)', top: 10 }}>
                UNSATISFACTORY
              </span>
            </div>
          </div>

          {/* Status banner — identical to NscPerformanceCard */}
          <div className={`mt-3 flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border ${SBANNER(stage)}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: scoreColor }}/>
              <span className="text-[12px] font-bold leading-snug" style={{ color: scoreColor }}>{statusMsg}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">{complianceReview.asOfDate}</span>
          </div>
        </div>

        {/* ── SECTION 2: Contribution tiles — mirrors NscPerformanceCard tile layout ── */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Current Profile Scores
            <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
              as of {complianceReview.asOfDate}
            </span>
          </div>

          {/* ── 3 category tiles ── */}
          <div className="grid grid-cols-3 gap-3">
            {complianceReview.scores.map(s => {
              const st      = bcScoreSt(s.category, s.score);
              const lim     = CAT_LIM[s.category] ?? { sat: 1, cond: 2, max: 3, desc: '' };
              const barPct  = Math.min((s.score / lim.max) * 100, 100);
              const satPct  = Math.round((lim.sat  / lim.max) * 100);
              const condPct = Math.round((lim.cond / lim.max) * 100);

              return (
                <div key={s.category} className={`relative rounded-xl border p-3.5 ${bctile(st)} group/card cursor-pointer transition-shadow hover:shadow-lg`}>
                  {/* Row 1: category label + status badge pill */}
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-snug flex-1">{s.category}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap flex-shrink-0 ${bcb(st)}`}>{bcl(st)}</span>
                  </div>

                  {/* Score value — actual profile score points */}
                  <div className="text-[32px] leading-none font-black mt-1 mb-0.5 font-mono" style={{ color: bcc(st) }}>
                    {s.score.toFixed(2)}
                  </div>

                  {/* Events · impact line */}
                  <div className="text-[11px] text-slate-500 mb-0.5">
                    {s.events} event{s.events !== 1 ? 's' : ''} · {barPct.toFixed(1)}% impact
                  </div>

                  {/* Colored status line */}
                  <div className="text-[11px] font-semibold mb-3" style={{ color: bcc(st) }}>
                    {bcl(st)} contribution to Profile
                  </div>

                  {/* Mini gradient bar with hover tooltip — dark navy style matching Alberta/CVOR/PEI/NS */}
                  <div className="relative">
                    <div className="relative h-[7px] rounded-full overflow-hidden"
                      style={{ background: C_GRAD, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.20)' }}>
                      <div className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                      <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full"
                        style={{ left: `${barPct}%`, right: 0 }}/>
                      <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow"
                        style={{ left: `${barPct}%`, transform: 'translateX(-50%)' }}/>
                      {[lim.sat, lim.cond].map(v => (
                        <div key={v} className="absolute top-0 bottom-0 w-px bg-white/60"
                          style={{ left: `${(v / lim.max) * 100}%` }}/>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8.5px] mt-0.5 text-slate-400">
                      <span style={{ color: '#16a34a' }}>SAT {satPct}%</span>
                      <span style={{ color: '#d97706' }}>COND {condPct}%</span>
                      <span style={{ color: '#dc2626' }}>HIGH</span>
                    </div>

                  </div>

                  {/* Card hover tooltip — dark navy popup */}
                  <div className="hidden group-hover/card:block absolute z-50 pointer-events-none"
                    style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 236 }}>
                      <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                        <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: bcc(st) }}>
                          <span className="text-white font-black text-[12px] uppercase tracking-wide">{s.category}</span>
                          <span className="text-white/90 text-[13px] font-mono font-black">{s.score.toFixed(2)}</span>
                        </div>
                        <div className="px-3.5 py-2.5 space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Profile Score</span>
                            <span className="font-black text-slate-800 font-mono">{s.score.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Profile Impact</span>
                            <span className="font-bold text-slate-800">{barPct.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Events</span>
                            <span className="font-bold text-slate-800">{s.events}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Level</span>
                            <span className="font-bold" style={{ color: bcc(st) }}>{bcl(st)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">{lim.desc}</div>
                          <div className="pt-1.5 border-t border-slate-100">
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Profile Levels</div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {([
                                { n: 'Satisfactory',   v: `0.00 – ${lim.sat.toFixed(2)}`, c: '#16a34a' },
                                { n: 'Conditional',    v: `${lim.sat.toFixed(2)} – ${lim.cond.toFixed(2)}`, c: '#d97706' },
                                { n: 'Unsatisfactory', v: `≥ ${lim.cond.toFixed(2)}`, c: '#dc2626' },
                                { n: 'Current',        v: s.score.toFixed(2), c: bcc(st) },
                              ] as { n: string; v: string; c: string }[]).map(r => (
                                <div key={r.n} className="flex items-center justify-between">
                                  <span className="text-[9px]" style={{ color: r.c }}>{r.n}</span>
                                  <span className="text-[10px] font-bold font-mono text-slate-700">{r.v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                          style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }}/>
                      </div>
                  </div>
                </div>
              );
            })}

          </div>

          {/* Compact footer — matches image 2 style */}
          <div className="flex items-center justify-between pt-3 text-[10px]">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-500">Profile Status</span>
              &nbsp;·&nbsp;<span className="font-semibold" style={{ color: '#16a34a' }}>Satisfactory 0.00–2.13</span>
              &nbsp;·&nbsp;<span className="font-semibold" style={{ color: '#d97706' }}>Conditional 2.14–3.64</span>
              &nbsp;·&nbsp;<span className="font-semibold" style={{ color: '#dc2626' }}>Unsatisfactory ≥3.65</span>
            </span>
            <button
              type="button"
              onClick={() => setThreshOpen(o => !o)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
            >
              NSC Threshold Info {threshOpen ? '▴' : '▾'}
            </button>
          </div>

          {/* Expandable threshold panel */}
          {threshOpen && (
            <div className="mt-2">
              <div className="px-3 py-2.5 rounded-t-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-500 leading-relaxed">
                The carrier's profile status is set based on the score ranges listed below. If scores in all areas are in the
                <span className="font-semibold text-emerald-700"> Satisfactory</span> range, the profile status will be Satisfactory.
                If any score is in the <span className="font-semibold text-amber-600"> Conditional</span> range, the profile status will be Conditional.
                If any score is in the <span className="font-semibold text-red-600"> Unsatisfactory</span> range, the profile status will be Unsatisfactory.
              </div>
              <div className="rounded-b-lg border border-t-0 border-slate-200 overflow-hidden text-[10px]">
                <div className="grid grid-cols-5 bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <div className="px-3 py-1.5">Profile Status</div>
                  <div className="px-3 py-1.5">Contraventions</div>
                  <div className="px-3 py-1.5">CVSA (Out of Service)</div>
                  <div className="px-3 py-1.5">Accidents</div>
                  <div className="px-3 py-1.5">Total</div>
                </div>
                {([
                  { status: 'Satisfactory',   color: '#16a34a', conv: '0.00 – 1.76', cvsa: '0.00 – 0.93', acc: '0.00 – 0.23', total: '0.00 – 2.13' },
                  { status: 'Conditional',    color: '#d97706', conv: '1.77 – 2.98', cvsa: '0.94 – 1.08', acc: '0.24 – 0.27', total: '2.14 – 3.64' },
                  { status: 'Unsatisfactory', color: '#dc2626', conv: '2.99 and above', cvsa: '1.09 and above', acc: '0.28 and above', total: '3.65 and above' },
                ] as { status: string; color: string; conv: string; cvsa: string; acc: string; total: string }[]).map((row, i) => (
                  <div key={row.status} className={`grid grid-cols-5 border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                    <div className="px-3 py-1.5 font-bold" style={{ color: row.color }}>{row.status}</div>
                    <div className="px-3 py-1.5 text-slate-600 font-mono">{row.conv}</div>
                    <div className="px-3 py-1.5 text-slate-600 font-mono">{row.cvsa}</div>
                    <div className="px-3 py-1.5 text-slate-600 font-mono">{row.acc}</div>
                    <div className="px-3 py-1.5 text-slate-600 font-mono">{row.total}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 3: Recommended Actions — identical structure to NscPerformanceCard ── */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recommended Actions</span>
              {criticalCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                  {criticalCount} Critical
                </span>
              )}
            </div>
            <button type="button" onClick={() => setActionsOpen(o => !o)}
              aria-expanded={actionsOpen}
              className="text-[11px] font-semibold text-blue-500 transition-colors hover:text-blue-700">
              {actionsOpen ? 'Hide Details ▴' : 'View Details ▾'}
            </button>
          </div>
          {actionsOpen && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
              {recommendedActions.map((a, idx) => {
                const numColor =
                  a.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200'
                : a.severity === 'warning'  ? 'bg-amber-100 text-amber-700 border-amber-200'
                :                             'bg-blue-100 text-blue-600 border-blue-200';
                return (
                  <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${numColor}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-[12px] font-semibold text-slate-800 leading-snug">{a.title}</div>
                      <div className="text-[11px] mt-0.5 leading-snug text-slate-500">{a.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION 4: NSC Interventions ── */}
        {interventions.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">NSC Interventions</span>
              <span className="text-[10px] text-slate-400">Past 25 months</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {interventions.length} Event{interventions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {interventions.map((iv, i) => (
                <div key={i} className="flex items-center justify-between bg-amber-50/70 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"/>
                    <span className="text-[13px] font-bold text-amber-800">{iv.type}</span>
                  </div>
                  <span className="text-[12px] font-mono font-bold text-amber-700">{iv.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SECTION 5: Carrier Information ── */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Carrier Information</div>

          {/* Report date band */}
          <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px]">
            <div className="flex items-center gap-4">
              <span className="text-slate-400">National Safety Code Carrier Profile Report</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 font-semibold">From: <span className="font-mono text-slate-700">{demographics.profileFrom}</span></span>
              <span className="text-slate-400">→</span>
              <span className="text-slate-500 font-semibold">To: <span className="font-mono text-slate-700">{demographics.profileTo}</span></span>
            </div>
            <div className="flex items-center gap-3 text-slate-400">
              <span>NSC #: <span className="font-mono font-bold text-slate-600">{demographics.nscNumber}</span></span>
              <span>·</span>
              <span>Report Run: <span className="font-mono font-bold text-slate-600">{demographics.reportRunDate}</span></span>
            </div>
          </div>

          {/* Two-column key-value grid */}
          <div className="grid grid-cols-2 gap-x-10 gap-y-2">
            {([
              { label: 'Primary Types of Business',          value: demographics.primaryBusinessType },
              { label: 'Number of Currently Licensed Vehicles', value: String(demographics.numberOfLicensedVehicles) },
              { label: 'Extra-Provincial',                   value: demographics.extraProvincial ? 'Yes' : 'No' },
              { label: 'Mailing Address',                    value: demographics.mailingAddress },
              { label: 'Premium Carrier',                    value: demographics.premiumCarrier ? 'Yes' : 'No' },
              { label: 'Certificate Issue Date',             value: demographics.certificateIssueDate },
              { label: 'Weigh2GoBC',                         value: demographics.weigh2GoBC ? 'Yes' : 'No' },
              { label: 'Jurisdiction',                       value: demographics.jurisdiction },
              { label: 'Preventative Maintenance',           value: demographics.preventativeMaintenance ? 'Yes' : 'No' },
            ] as { label: string; value: string }[]).map(item => (
              <div key={item.label} className="flex items-baseline justify-between gap-2 py-1 border-b border-slate-100">
                <span className="text-[11px] text-slate-500 flex-shrink-0">{item.label}:</span>
                <span className="text-[11px] font-semibold text-slate-800 text-right">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
