import { useState } from 'react';
import { Activity } from 'lucide-react';
import { ScoreBandHoverCard } from './ScoreBandHoverCard';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NscStageThreshold {
  stage: number;
  low:   number;
  high:  number | null;
}

export interface NscContributionItem {
  pct:    number;  // 0–100
  events: number;  // raw event count
}

export interface NscContributions {
  convictions:          NscContributionItem;
  adminPenalties:       NscContributionItem;
  cvsaInspections:      NscContributionItem;
  reportableCollisions: NscContributionItem;
}

export interface NscCarrierInfo {
  nscNumber:         string;
  mvidNumber:        string;
  operatingStatus:   string;
  certNumber:        string;
  certEffective:     string;
  certExpiry:        string;
  safetyRating:      string;
  monitoringAsOf:    string;
  monitoringRFactor: number;
  monitoringStage:   string;
  totalCarriersAB:   number;
  fleetAvg:          number;
  fleetCurrent:      number;
  convictionDocs:    number;
  convictionCount:   number;
  convictionPoints:  number;
}

export interface NscPerformanceCardProps {
  carrierName:     string;
  profileDate:     string;
  rFactor:         number;
  monitoringStage: string;
  fleetRange:      string;
  fleetType:       string;
  stageThresholds: NscStageThreshold[];
  statusMessage?:  string;
  contributions:   NscContributions;
  carrierInfo:     NscCarrierInfo;
}

// ─── R-Factor stage helpers ───────────────────────────────────────────────────

function getStageNumber(r: number, thr: NscStageThreshold[]): number {
  for (let i = thr.length - 1; i >= 0; i--)
    if (r >= thr[i].low) return thr[i].stage;
  return 0;
}
const SC = (s: number) =>
  s === 0 ? '#16a34a' : s === 1 ? '#b45309' : s === 2 ? '#d97706' : s === 3 ? '#dc2626' : '#7f1d1d';
const SB = (s: number) =>
  s === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
: s === 1 ? 'bg-yellow-100  text-yellow-800  border-yellow-300'
: s === 2 ? 'bg-amber-100   text-amber-800   border-amber-300'
: s === 3 ? 'bg-red-100     text-red-800     border-red-300'
:           'bg-red-200     text-red-900     border-red-400';
const SBANNER = (s: number) =>
  s === 0 ? 'bg-emerald-50/80 border-emerald-200'
: s === 1 ? 'bg-yellow-50/80  border-yellow-200'
: s === 2 ? 'bg-amber-50/80   border-amber-200'
: s === 3 ? 'bg-red-50/80     border-red-200'
:           'bg-red-100/80    border-red-300';
const SL = (s: number) =>
  s === 0 ? 'NOT MONITORED' : `STAGE ${s}`;

function autoStatus(stage: number, r: number, range: string, thr: NscStageThreshold[]): string {
  const s1 = thr[0]?.low ?? 0;
  if (stage === 0) return `Not on NSC monitoring — performance is within acceptable range for fleet ${range}`;
  if (stage === 1) return `Carrier has entered Stage 1 monitoring (R-Factor ${r.toFixed(3)} \u2265 ${s1.toFixed(3)}) — implement corrective measures`;
  if (stage === 2) return `Carrier is at Stage 2 monitoring — corrective action plan required and must be submitted`;
  if (stage === 3) return `Carrier is at Stage 3 monitoring — compliance review and audit required immediately`;
  return `Carrier is at Stage 4 monitoring — highest risk level, imminent enforcement action`;
}

// ─── Contribution tile helpers (mirrors CVOR rc/rb/rl/tileBg) ────────────────

const C_LOW = 30, C_MOD = 70;
const cc = (p: number) => p >= C_MOD ? '#dc2626' : p >= C_LOW ? '#d97706' : p > 0 ? '#16a34a' : '#94a3b8';
const cb = (p: number) =>
  p >= C_MOD ? 'bg-red-100     text-red-700    border-red-300'
: p >= C_LOW ? 'bg-amber-100   text-amber-700  border-amber-300'
: p >  0     ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
:              'bg-slate-100   text-slate-500  border-slate-300';
const cl = (p: number) => p >= C_MOD ? 'PRIMARY' : p >= C_LOW ? 'MODERATE' : p > 0 ? 'LOW' : 'NONE';
const ctile = (p: number) =>
  p >= C_MOD ? 'bg-red-50/70     border-red-200'
: p >= C_LOW ? 'bg-amber-50/70   border-amber-200'
: p >  0     ? 'bg-emerald-50/70 border-emerald-200'
:              'bg-slate-50/70   border-slate-200';

// ─── Component ────────────────────────────────────────────────────────────────

export function NscPerformanceCard({
  carrierName, profileDate, rFactor, fleetRange, fleetType,
  stageThresholds, statusMessage, contributions, carrierInfo,
}: NscPerformanceCardProps) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [threshOpen, setThreshOpen] = useState(false);

  const stage      = getStageNumber(rFactor, stageThresholds);
  const scoreColor = SC(stage);
  const s4low      = stageThresholds.find(t => t.stage === 4)?.low ?? 1.105;
  const rMax       = s4low * 1.65;
  const markerPct  = Math.min((rFactor / rMax) * 100, 99.5);
  const threshPcts = stageThresholds.map(t => ({ ...t, pct: (t.low / rMax) * 100 }));
  const resolvedStatus = statusMessage ?? autoStatus(stage, rFactor, fleetRange, stageThresholds);
  const certOk = new Date(carrierInfo.certExpiry.replace(/(\d{4}) ([A-Z]{3}) (\d{2})/, '$1-$2-$3')) > new Date();

  const GRAD   = 'linear-gradient(to right,#22c55e 0%,#84cc16 18%,#eab308 32%,#f97316 52%,#ef4444 70%,#991b1b 100%)';
  const C_GRAD = 'linear-gradient(to right,#22c55e 0%,#84cc16 18%,#eab308 32%,#f97316 58%,#ef4444 80%,#991b1b 100%)';

  const monStage  = getStageNumber(carrierInfo.monitoringRFactor, stageThresholds);

  // ── Build recommended actions from live data ──────────────────────────────
  type ActionSeverity = 'critical' | 'warning' | 'info';
  interface RecommendedAction { title: string; desc: string; severity: ActionSeverity; }
  const recommendedActions: RecommendedAction[] = [];

  if (stage >= 3)
    recommendedActions.push({ severity: 'critical', title: 'Compliance Review Required', desc: `R-Factor ${rFactor.toFixed(3)} has reached Stage ${stage} — submit a corrective action plan and prepare for compliance audit.` });
  else if (stage >= 1)
    recommendedActions.push({ severity: 'warning', title: `Stage ${stage} Monitoring Active`, desc: `R-Factor ${rFactor.toFixed(3)} exceeds Stage ${stage} threshold — implement corrective measures to reduce the score.` });

  if (contributions.convictions.pct >= C_MOD)
    recommendedActions.push({ severity: 'critical', title: 'Address Conviction Activity', desc: `Convictions represent ${contributions.convictions.pct.toFixed(1)}% of R-Factor (${contributions.convictions.events} events) — review driver compliance and implement mandatory training.` });

  if (contributions.cvsaInspections.pct >= C_LOW)
    recommendedActions.push({ severity: contributions.cvsaInspections.pct >= C_MOD ? 'critical' : 'warning', title: 'Reduce CVSA Inspection Violations', desc: `CVSA inspections contribute ${contributions.cvsaInspections.pct.toFixed(1)}% to R-Factor across ${contributions.cvsaInspections.events} events — increase pre-trip inspections and vehicle maintenance.` });

  if (contributions.reportableCollisions.pct >= C_LOW)
    recommendedActions.push({ severity: contributions.reportableCollisions.pct >= C_MOD ? 'critical' : 'warning', title: 'Collision Prevention Program', desc: `Reportable collisions account for ${contributions.reportableCollisions.pct.toFixed(1)}% of R-Factor (${contributions.reportableCollisions.events} events) — review driver safety training and telematics data.` });

  if (contributions.adminPenalties.pct >= C_LOW)
    recommendedActions.push({ severity: 'warning', title: 'Resolve Administrative Penalties', desc: `Admin penalties contribute ${contributions.adminPenalties.pct.toFixed(1)}% to R-Factor — ensure all compliance notices and conditions are cleared promptly.` });

  if (!certOk)
    recommendedActions.push({ severity: 'critical', title: 'Safety Fitness Certificate Expired', desc: `Certificate ${carrierInfo.certNumber} expired ${carrierInfo.certExpiry} — renew immediately to maintain operating authority.` });

  if (carrierInfo.convictionPoints > 0)
    recommendedActions.push({ severity: carrierInfo.convictionPoints >= 5 ? 'critical' : 'warning', title: 'Driver Conviction Points Outstanding', desc: `${carrierInfo.convictionPoints} conviction point${carrierInfo.convictionPoints > 1 ? 's' : ''} recorded — review driver abstracts and schedule corrective training sessions.` });

  if (recommendedActions.length === 0)
    recommendedActions.push({ severity: 'info', title: 'Performance Within Acceptable Range', desc: 'No immediate actions required. Continue monitoring R-Factor monthly and maintain current safety programs.' });

  const criticalCount = recommendedActions.filter(a => a.severity === 'critical').length;

  const contribTiles = [
    { key: 'conv', label: 'Convictions',          item: contributions.convictions,          desc: 'Conviction activity from drivers and vehicles contributing to R-Factor.' },
    { key: 'adm',  label: 'Admin Penalties',       item: contributions.adminPenalties,       desc: 'Administrative penalties and compliance notices issued against carrier.' },
    { key: 'cvsa', label: 'CVSA Inspections',      item: contributions.cvsaInspections,      desc: 'CVSA roadside inspection outcomes including OOS orders and defect violations.' },
    { key: 'col',  label: 'Reportable Collisions', item: contributions.reportableCollisions, desc: 'Reportable collisions in the 12-month profile period contributing to R-Factor.' },
  ];

  const contributionThresholdRows = [
    {
      key: 'conv',
      label: 'Convictions',
      desc: 'Conviction activity from drivers and vehicles contributing to R-Factor.',
      low: `<${C_LOW}% contribution. Minor conviction impact; continue monitoring abstracts and coaching.`,
      moderate: `${C_LOW}%–${C_MOD}% contribution. Meaningful conviction pressure; targeted driver compliance action recommended.`,
      high: `>${C_MOD}% contribution. Primary driver of R-Factor; immediate conviction reduction plan required.`,
    },
    {
      key: 'adm',
      label: 'Admin Penalties',
      desc: 'Administrative penalties and compliance notices issued against carrier.',
      low: `<${C_LOW}% contribution. Limited admin pressure; maintain timely closure of notices and filings.`,
      moderate: `${C_LOW}%–${C_MOD}% contribution. Admin issues are materially affecting R-Factor; resolve open conditions quickly.`,
      high: `>${C_MOD}% contribution. Admin penalties are a primary risk source; urgent regulatory follow-up required.`,
    },
    {
      key: 'cvsa',
      label: 'CVSA Inspections',
      desc: 'CVSA roadside inspection outcomes including OOS orders and defect violations.',
      low: `<${C_LOW}% contribution. Inspection defects are controlled; keep preventive maintenance steady.`,
      moderate: `${C_LOW}%–${C_MOD}% contribution. Inspection defects are affecting profile results; increase vehicle and driver checks.`,
      high: `>${C_MOD}% contribution. CVSA defects are the primary R-Factor driver; immediate maintenance and roadside readiness action required.`,
    },
    {
      key: 'col',
      label: 'Reportable Collisions',
      desc: 'Reportable collisions in the 12-month profile period contributing to R-Factor.',
      low: `<${C_LOW}% contribution. Collision exposure is limited; continue current safety controls.`,
      moderate: `${C_LOW}%–${C_MOD}% contribution. Collision history is materially affecting R-Factor; strengthen prevention and coaching.`,
      high: `>${C_MOD}% contribution. Collisions are the primary R-Factor driver; urgent intervention and root-cause review required.`,
    },
  ];
  void contributionThresholdRows;

  const contributionStatusRows = [
    { status: 'Low', color: '#16a34a', conv: `<${C_LOW}%`, adm: `<${C_LOW}%`, cvsa: `<${C_LOW}%`, col: `<${C_LOW}%` },
    { status: 'Moderate', color: '#d97706', conv: `${C_LOW}%-${C_MOD}%`, adm: `${C_LOW}%-${C_MOD}%`, cvsa: `${C_LOW}%-${C_MOD}%`, col: `${C_LOW}%-${C_MOD}%` },
    { status: 'High', color: '#dc2626', conv: `>${C_MOD}%`, adm: `>${C_MOD}%`, cvsa: `>${C_MOD}%`, col: `>${C_MOD}%` },
  ];

  const albertaSafetyStatusCards = [
    {
      label: 'Excellent',
      titleClass: 'bg-emerald-300 text-emerald-950',
      bodyClass: 'border-emerald-200 bg-emerald-50/90',
      lines: [
        'Carrier has passed an NSC facility audit',
        'Carrier consistently demonstrates superior safety performance',
        'Carrier is a member of the Alberta Carrier Excellent Safety Program',
      ],
    },
    {
      label: 'Satisfactory',
      titleClass: 'bg-lime-200 text-lime-950',
      bodyClass: 'border-lime-200 bg-lime-50/90',
      lines: [
        'Carrier has passed an NSC facility audit',
        'Carrier has not been identified on Alberta Transportation and Economic Corridors monitoring report in the past 12 months',
        'Carrier has no outstanding compliance issues',
      ],
    },
    {
      label: 'Satisfactory Unaudited',
      titleClass: 'bg-amber-200 text-amber-950',
      bodyClass: 'border-amber-200 bg-amber-50/90',
      lines: [
        'This rating is generally assigned to all new carriers, where no existing compliance issues are known',
        'Carrier has not had an NSC facility audit',
      ],
    },
    {
      label: 'Conditional',
      titleClass: 'bg-orange-400 text-orange-950',
      bodyClass: 'border-orange-200 bg-orange-50/90',
      lines: [
        'Carrier has an unacceptable safety record and must improve their safety performance',
        'Carrier must meet any conditions set forth by the Registrar of Motor Vehicle Services',
      ],
    },
    {
      label: 'Unsatisfactory',
      titleClass: 'bg-orange-500 text-white',
      bodyClass: 'border-red-200 bg-red-50/90',
      lines: [
        "Carrier's performance has demonstrated an unacceptable risk to the public",
        "Carrier may no longer register or operate a commercial vehicle under Alberta's NSC program",
      ],
    },
  ];

  const stageThresholdRows = [
    {
      stage: 'Not Monitored',
      color: '#16a34a',
      threshold: `< ${stageThresholds[0]?.low.toFixed(3) ?? '0.000'}`,
      action: 'Performance within acceptable range for the fleet band.',
    },
    ...stageThresholds.map((threshold, index) => {
    const upperBound = threshold.high ?? stageThresholds[index + 1]?.low ?? null;
    const range = upperBound != null
      ? `${threshold.low.toFixed(3)} - ${upperBound.toFixed(3)}`
      : `${threshold.low.toFixed(3)} and higher`;
    return {
      stage: `Stage ${threshold.stage}`,
      color: SC(threshold.stage),
      threshold: range,
      action:
        threshold.stage === 1 ? 'Corrective measures required'
        : threshold.stage === 2 ? 'Corrective action plan required'
        : threshold.stage === 3 ? 'Compliance review and audit risk'
        : 'Highest risk, enforcement action likely',
    };
    }),
  ];

  const zones = [
    { label: 'NOT MONITORED', start: 0,                        end: threshPcts[0]?.pct ?? 27, color: '#16a34a', desc: 'Below Stage 1 threshold — performance within acceptable range.' },
    { label: 'STAGE 1',       start: threshPcts[0]?.pct ?? 27, end: threshPcts[1]?.pct ?? 40, color: '#b45309', desc: 'Stage 1: implement corrective measures to reduce R-Factor.' },
    { label: 'STAGE 2',       start: threshPcts[1]?.pct ?? 40, end: threshPcts[2]?.pct ?? 55, color: '#d97706', desc: 'Stage 2: corrective action plan required and must be submitted.' },
    { label: 'STAGE 3',       start: threshPcts[2]?.pct ?? 55, end: threshPcts[3]?.pct ?? 70, color: '#dc2626', desc: 'Stage 3: compliance review required — audit may be initiated.' },
    { label: 'STAGE 4',       start: threshPcts[3]?.pct ?? 70, end: 100,                      color: '#7f1d1d', desc: 'Stage 4: highest risk — imminent enforcement action.' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Activity size={15} className="text-slate-600"/>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">NSC Performance</div>
            <div className="text-[11px] text-slate-500">
              {carrierName} · Alberta NSC Monitoring · 12-Month Profile as of {profileDate}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            Latest Pull {profileDate}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            NSC Summary
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* ── SECTION 1: R-Factor score + spectrum ────────────────────────── */}
        <div className="px-5 pt-5 pb-5">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">R-Factor Score</div>

          <div className="flex items-start gap-4 mb-4">
            <div className="text-[52px] leading-none font-black tracking-tight" style={{ color: scoreColor }}>
              {rFactor.toFixed(3)}
            </div>
            <div className="pt-1 space-y-1.5">
              <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${SB(stage)}`}>
                {SL(stage)}
              </span>
              <div className="text-[11px] text-slate-500 leading-snug">
                Carrier must strive for the <span className="font-semibold text-slate-700">lowest score</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-mono font-bold text-slate-600">Fleet {fleetRange}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                <span className="font-mono font-bold text-slate-600">{fleetType}</span>
              </div>
            </div>
          </div>

          {/* Spectrum bar */}
          <div className="relative" style={{ paddingTop: 28 }}>
            <div className="absolute z-10 flex flex-col items-center pointer-events-none"
              style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', top: 0 }}>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white whitespace-nowrap shadow-md"
                style={{ background: scoreColor }}>{rFactor.toFixed(3)}</span>
              <div className="w-[2px] h-3.5" style={{ background: scoreColor }}/>
            </div>
            <div className="relative">
              <div className="absolute inset-0 rounded-full translate-y-0.5 blur-sm opacity-25" style={{ background: GRAD }}/>
              <div className="relative h-[22px] rounded-full overflow-hidden"
                style={{ background: GRAD, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.22)' }}>
                <div className="absolute top-0 left-0 right-0 h-[8px] rounded-t-full"
                  style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                {threshPcts.map(t => (
                  <div key={t.stage} className="absolute top-0 bottom-0 w-[1.5px] bg-white/50"
                    style={{ left: `${t.pct}%` }}/>
                ))}
                <div className="absolute top-0 bottom-0 w-[3px] rounded-full"
                  style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 0 6px 2px rgba(0,0,0,0.32)' }}/>
              </div>
              {/* Hover zones */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {zones.map(z => {
                  const isCurrent = stage === 0 ? z.label === 'NOT MONITORED' : z.label === `STAGE ${stage}`;
                  const zoneRange =
                    z.label === 'NOT MONITORED'
                      ? `< ${(stageThresholds[0]?.low ?? 0).toFixed(3)}`
                      : (() => {
                          const zoneStage = stageThresholds.find(t => `STAGE ${t.stage}` === z.label);
                          if (!zoneStage) return z.label;
                          const upperBound = zoneStage.high ?? null;
                          return upperBound == null
                            ? `>= ${zoneStage.low.toFixed(3)}`
                            : `${zoneStage.low.toFixed(3)} - ${upperBound.toFixed(3)}`;
                        })();
                  return (
                    <div key={z.label} className="absolute inset-y-0 group/zone cursor-crosshair"
                      style={{ left: `${z.start}%`, width: `${z.end - z.start}%` }}>
                      <div className="absolute inset-0 bg-white/0 group-hover/zone:bg-white/20 transition-colors duration-150 rounded"/>
                      <div className="hidden group-hover/zone:block absolute z-50 pointer-events-none"
                        style={{ bottom: 'calc(100% + 14px)', left: '50%', transform: 'translateX(-50%)', width: 260 }}>
                        <ScoreBandHoverCard
                          title={z.label}
                          range={zoneRange}
                          accentColor={z.color}
                          current={isCurrent ? { label: 'Current R-Factor', value: rFactor.toFixed(3) } : undefined}
                          description={z.desc}
                          detailRows={[
                            { label: 'Fleet', value: fleetRange },
                            { label: 'Type', value: fleetType },
                            { label: 'Status', value: SL(stage), valueColor: scoreColor },
                            { label: 'Profile Date', value: profileDate },
                          ]}
                          thresholdsTitle={`Stage Thresholds · Fleet ${fleetRange}`}
                          thresholds={stageThresholds.map(t => ({
                            label: `Stage ${t.stage}`,
                            value: `>= ${t.low.toFixed(3)}`,
                            color: SC(t.stage),
                          }))}
                          thresholdColumns={2}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Stage labels */}
            <div className="relative mt-1.5" style={{ height: 14 }}>
              <span className="absolute text-[9px] font-bold text-emerald-700 whitespace-nowrap" style={{ left: '0%' }}>SAFE</span>
              {threshPcts.map(t => (
                <span key={t.stage} className="absolute text-[9px] font-bold whitespace-nowrap"
                  style={{ left: `${t.pct}%`, transform: 'translateX(-50%)', color: SC(t.stage) }}>
                  STAGE {t.stage}
                </span>
              ))}
            </div>
          </div>

          {/* Threshold reference */}
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-500">NSC Thresholds</span>
              {stageThresholds.map(t => (
                <span key={t.stage} className="ml-2" style={{ color: SC(t.stage) }}>
                  {'\u00b7'} Stage {t.stage} {'\u2265'} {t.low.toFixed(3)}
                </span>
              ))}
            </span>
            <span className="text-slate-400 font-mono">Fleet {fleetRange} {'\u00b7'} {fleetType}</span>
          </div>

          {/* Status banner */}
          <div className={`mt-3 flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border ${SBANNER(stage)}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: scoreColor }}/>
              <span className="text-[12px] font-bold leading-snug" style={{ color: scoreColor }}>{resolvedStatus}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">{profileDate}</span>
          </div>
        </div>

        {/* ── SECTION 2: Contribution to R-Factor tiles ───────────────────── */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Contribution to R-Factor
            <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
              (dynamically calculated based on profile request date)
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {contribTiles.map(({ key, label, item, desc }) => {
              const { pct, events } = item;
              return (
                <div key={key} className={`relative rounded-xl border p-3 ${ctile(pct)} group/card cursor-pointer transition-shadow hover:shadow-lg`}>
                  {/* Row 1: label + badge */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cb(pct)}`}>{cl(pct)}</span>
                  </div>
                  {/* Big number */}
                  <div className="text-[30px] leading-none font-black my-1 font-mono" style={{ color: cc(pct) }}>
                    {pct.toFixed(1)}%
                  </div>
                  {/* Detail lines */}
                  <div className="text-[11px] text-slate-600 mb-0.5">
                    {events} {events === 1 ? 'event' : 'events'} · {pct.toFixed(1)}% impact
                  </div>
                  <div className="text-[10px] text-slate-400 mb-2">
                    {cl(pct)} contribution to R-Factor
                  </div>
                  {/* Mini gradient bar */}
                  <div className="relative">
                    <div className="relative h-[7px] rounded-full overflow-hidden"
                      style={{ background: C_GRAD, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.20)' }}>
                      <div className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                      <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full"
                        style={{ left: `${Math.min(pct, 100)}%`, right: 0 }}/>
                      <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow"
                        style={{ left: `${Math.min(pct, 100)}%`, transform: 'translateX(-50%)' }}/>
                      {[C_LOW, C_MOD].map(t => (
                        <div key={t} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${t}%` }}/>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8.5px] mt-0.5 text-slate-400">
                      <span>LOW {C_LOW}%</span>
                      <span>MOD {C_MOD}%</span>
                      <span>HIGH</span>
                    </div>
                  </div>
                  {/* Card hover tooltip — dark navy popup */}
                  <div className="hidden group-hover/card:block absolute z-50 pointer-events-none"
                    style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 230 }}>
                      <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                        <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: cc(pct) }}>
                          <span className="text-white font-black text-[12px] uppercase tracking-wide">{label}</span>
                          <span className="text-white/90 text-[12px] font-mono font-bold">{pct.toFixed(1)}%</span>
                        </div>
                        <div className="px-3.5 py-2.5 space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Level</span>
                            <span className="font-bold" style={{ color: cc(pct) }}>{cl(pct)}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Event Count</span>
                            <span className="font-bold text-slate-800">{events}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">R-Factor Impact</span>
                            <span className="font-bold text-slate-800">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">{desc}</div>
                          <div className="pt-1.5 border-t border-slate-100">
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Levels</div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {([
                                { n: 'None',     v:  0,    c: '#94a3b8' },
                                { n: 'Low',      v: C_LOW, c: '#16a34a' },
                                { n: 'Moderate', v: C_MOD, c: '#d97706' },
                                { n: 'Current',  v: pct,   c: cc(pct)   },
                              ] as { n: string; v: number; c: string }[]).map(th => (
                                <div key={th.n} className="flex items-center justify-between">
                                  <span className="text-[9px]" style={{ color: th.c }}>{th.n}</span>
                                  <span className="text-[10px] font-bold font-mono text-slate-700">{th.v.toFixed(1)}%</span>
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
          {/* Level reference row */}
          <div className="flex items-center justify-between pt-3 text-[10px]">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-500">Contribution Levels</span>
              &nbsp;&middot;&nbsp;<span style={{ color: '#16a34a' }}>Low &lt;{C_LOW}%</span>
              &nbsp;&middot;&nbsp;<span style={{ color: '#d97706' }}>Moderate {C_LOW}&ndash;{C_MOD}%</span>
              &nbsp;&middot;&nbsp;<span style={{ color: '#dc2626' }}>High / Primary &gt;{C_MOD}%</span>
            </span>
            <button
              type="button"
              onClick={() => setThreshOpen(open => !open)}
              aria-expanded={threshOpen}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
            >
              NSC Threshold Info {threshOpen ? '▴' : '▾'}
            </button>
          </div>
          {threshOpen && (
            <div className="mt-2">
              <div className="rounded-t-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500">
                Alberta NSC monitoring uses the <span className="font-semibold text-slate-700">R-Factor</span> stage ranges below, while Alberta safety fitness can also be described by the five status categories shown here.
                Contribution tiles show how strongly each category is affecting that R-Factor at the current profile date:
                <span className="font-semibold text-emerald-700"> Low</span> impact is under {C_LOW}%,
                <span className="font-semibold text-amber-600"> Moderate</span> impact is {C_LOW}% to {C_MOD}%,
                and <span className="font-semibold text-red-600"> High / Primary</span> impact is above {C_MOD}%.
              </div>
              <div className="space-y-3 rounded-b-lg border border-t-0 border-slate-200 bg-white p-3">
                <div className="grid gap-3 lg:grid-cols-5">
                  {albertaSafetyStatusCards.map(card => (
                    <div key={card.label} className={`overflow-hidden rounded-lg border ${card.bodyClass}`}>
                      <div className={`px-3 py-2 text-[11px] font-black leading-tight ${card.titleClass}`}>
                        {card.label}
                      </div>
                      <div className="space-y-2 px-3 py-3 text-[10px] leading-relaxed text-slate-700">
                        {card.lines.map(line => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-[1.1fr_1fr_1.6fr] bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                    <div className="px-3 py-1.5">Monitoring Status</div>
                    <div className="px-3 py-1.5">R-Factor Range</div>
                    <div className="px-3 py-1.5">Description</div>
                  </div>
                  {stageThresholdRows.map((row, index) => (
                    <div
                      key={row.stage}
                      className={`grid grid-cols-[1.1fr_1fr_1.6fr] border-t border-slate-100 ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                    >
                      <div className="px-3 py-1.5 font-bold" style={{ color: row.color }}>{row.stage}</div>
                      <div className="px-3 py-1.5 font-mono text-slate-600">{row.threshold}</div>
                      <div className="px-3 py-1.5 text-slate-500">{row.action}</div>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-5 bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                    <div className="px-3 py-1.5">Status</div>
                    <div className="px-3 py-1.5">Convictions</div>
                    <div className="px-3 py-1.5">Admin Penalties</div>
                    <div className="px-3 py-1.5">CVSA Inspections</div>
                    <div className="px-3 py-1.5">Reportable Collisions</div>
                  </div>
                  {contributionStatusRows.map((row, index) => (
                    <div
                      key={row.status}
                      className={`grid grid-cols-5 border-t border-slate-100 ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}
                    >
                      <div className="px-3 py-1.5 font-bold" style={{ color: row.color }}>{row.status}</div>
                      <div className="px-3 py-1.5 font-mono text-slate-600">{row.conv}</div>
                      <div className="px-3 py-1.5 font-mono text-slate-600">{row.adm}</div>
                      <div className="px-3 py-1.5 font-mono text-slate-600">{row.cvsa}</div>
                      <div className="px-3 py-1.5 font-mono text-slate-600">{row.col}</div>{/*
                        {row.low} low · {row.moderate} moderate · {row.high} high
                      */}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

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
            <button
              type="button"
              onClick={() => setActionsOpen(open => !open)}
              aria-expanded={actionsOpen}
              className="text-[11px] font-semibold text-blue-500 transition-colors hover:text-blue-700"
            >
              {actionsOpen ? 'Hide Details ▴' : 'View Details ▾'}
            </button>
          </div>
          {actionsOpen && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
                {recommendedActions.map((action, idx) => {
                  const numColor =
                    action.severity === 'critical' ? 'bg-red-100 text-red-700 border-red-200'
                  : action.severity === 'warning'  ? 'bg-amber-100 text-amber-700 border-amber-200'
                  :                                  'bg-blue-100 text-blue-600 border-blue-200';
                  const descColor =
                    action.severity === 'critical' ? 'text-slate-500'
                  : action.severity === 'warning'  ? 'text-slate-500'
                  :                                  'text-slate-500';
                  return (
                    <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                      <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${numColor}`}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-[12px] font-semibold text-slate-800 leading-snug">{action.title}</div>
                        <div className={`text-[11px] mt-0.5 leading-snug ${descColor}`}>{action.desc}</div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* ── SECTION 4: Blended Info Sections ── */}

        {/* ── NSC Monitoring + Fleet Size (two-column layout) ── */}
        <div className="px-5 py-5 grid grid-cols-2 gap-8 border-t border-slate-100">

          {/* LEFT: NSC Monitoring */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">NSC Monitoring</div>
            <div className="text-[9px] text-slate-400 italic mb-3">As of {carrierInfo.monitoringAsOf}</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">R-Factor (month-end)</span>
                <span className="text-sm font-black font-mono" style={{ color: SC(monStage) }}>
                  {carrierInfo.monitoringRFactor.toFixed(3)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Monitoring Stage</span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${SB(monStage)}`}>
                  {carrierInfo.monitoringStage}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">AB Carriers with SFC</span>
                <span className="text-sm font-bold font-mono text-slate-800">{carrierInfo.totalCarriersAB.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* RIGHT: NSC Fleet Size + Conviction Totals */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              NSC Fleet Size · {carrierInfo.monitoringAsOf}
            </div>
            <div className="space-y-2.5 mb-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Average Fleet Size</span>
                <span className="text-sm font-bold font-mono text-slate-800">{carrierInfo.fleetAvg.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Current Fleet Size</span>
                <span className="text-sm font-bold font-mono text-blue-700">{carrierInfo.fleetCurrent}</span>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Conviction Totals</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Documents</span>
                <span className="text-sm font-bold font-mono text-slate-800">{carrierInfo.convictionDocs}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Convictions</span>
                <span className="text-sm font-bold font-mono text-amber-700">{carrierInfo.convictionCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Points</span>
                <span className="text-sm font-bold font-mono text-red-700">{carrierInfo.convictionPoints}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ── Carrier Identifiers + Safety Fitness Certificate (two-column layout) ── */}
        <div className="px-5 py-5 grid grid-cols-2 gap-8 border-t border-slate-100">

          {/* LEFT: Carrier Identifiers */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Carrier Identifiers</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">NSC Number</span>
                <span className="text-sm font-bold font-mono text-slate-900">{carrierInfo.nscNumber}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">MVID Number</span>
                <span className="text-sm font-bold font-mono text-slate-900">{carrierInfo.mvidNumber}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Operating Status</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
                  {carrierInfo.operatingStatus}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: Safety Fitness Certificate */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Safety Fitness Certificate</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Certificate No.</span>
                <span className="text-sm font-bold font-mono text-slate-900">{carrierInfo.certNumber}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Effective</span>
                <span className="text-sm font-bold font-mono text-slate-700">{carrierInfo.certEffective}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Expiry</span>
                <span className={`text-sm font-bold font-mono ${certOk ? 'text-emerald-700' : 'text-red-600'}`}>
                  {carrierInfo.certExpiry}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Safety Rating</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded border bg-blue-50 text-blue-700 border-blue-200">
                  {carrierInfo.safetyRating}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
