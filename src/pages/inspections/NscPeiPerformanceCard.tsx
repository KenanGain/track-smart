import { useState } from 'react';
import { Activity } from 'lucide-react';
import { ScoreBandHoverCard } from './ScoreBandHoverCard';

// ---"---"---"--- Types ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

export interface PeiNscData {
  carrierName:      string;
  nscNumber:        string;
  profileAsOf:      string;
  jurisdiction:     string;
  safetyRating:     string;
  certStatus:       string;
  auditStatus:      string;
  phone?:           string;
  contactName?:     string;
  collisionPoints:  number;
  convictionPoints: number;
  inspectionPoints: number;
  currentActiveVehicles:                 number;
  currentActiveVehiclesAtLastAssessment: number;
  interventions?: { label: string; date: string; type: 'warning' | 'critical' | 'info' }[];
  carrierInfo?: {
    primaryBusiness:  string;
    extraProvincial:  boolean;
    premiumCarrier:   boolean;
    mailingAddress:   string;
    licensedVehicles: number;
    certIssueDate:    string;
    jurisdiction:     string;
    reportFrom:       string;
    reportTo:         string;
    reportRun:        string;
  };
}

// ---"---"---"--- Schedule 3 - Max Allowable Points by Fleet Size ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

const SCHEDULE_3 = [
  { minFleet: 1,   maxFleet: 2,        maxPts: 10  },
  { minFleet: 3,   maxFleet: 5,        maxPts: 18  },
  { minFleet: 6,   maxFleet: 9,        maxPts: 28  },
  { minFleet: 10,  maxFleet: 14,       maxPts: 40  },
  { minFleet: 15,  maxFleet: 19,       maxPts: 55  },
  { minFleet: 20,  maxFleet: 24,       maxPts: 68  },
  { minFleet: 25,  maxFleet: 29,       maxPts: 80  },
  { minFleet: 30,  maxFleet: 39,       maxPts: 95  },
  { minFleet: 40,  maxFleet: 49,       maxPts: 115 },
  { minFleet: 50,  maxFleet: 59,       maxPts: 130 },
  { minFleet: 60,  maxFleet: 79,       maxPts: 150 },
  { minFleet: 80,  maxFleet: 99,       maxPts: 165 },
  { minFleet: 100, maxFleet: Infinity, maxPts: 185 },
];
function getMaxPoints(fleet: number) {
  return SCHEDULE_3.find(r => fleet >= r.minFleet && fleet <= r.maxFleet)?.maxPts ?? 55;
}

// Fixed zone thresholds (% of maxPts)
const Z_ADV  = 0.25;   // Advisory
const Z_WARN = 0.60;   // Warning
const Z_INTV = 0.85;   // Interview
const Z_SANC = 1.00;   // Sanction

// ---"---"---"--- Color/label helpers matching NscPerformanceCard pattern ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

// Zone by raw pct (0-1+)
type PeiZone = 0 | 1 | 2 | 3 | 4;  // 0=Low, 1=Adv, 2=Warn, 3=Intv, 4=Sanc

function getZone(p: number): PeiZone {
  if (p > Z_SANC) return 4;
  if (p > Z_INTV) return 3;
  if (p > Z_WARN) return 2;
  if (p > Z_ADV)  return 1;
  return 0;
}
const ZONE_LABEL = ['LOW',      'ADVISORY', 'WARNING', 'INTERVIEW', 'SANCTION'];
const ZONE_NAME  = ['Low',      'Advisory', 'Warning', 'Interview', 'Sanction'];
const ZC = (z: PeiZone) => (['#16a34a','#ca8a04','#ea580c','#dc2626','#7f1d1d'] as const)[z];
const ZB = (z: PeiZone) => ([
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-yellow-100  text-yellow-800  border-yellow-300',
  'bg-orange-100  text-orange-800  border-orange-300',
  'bg-red-100     text-red-800     border-red-300',
  'bg-red-200     text-red-900     border-red-400',
] as const)[z];
const ZBANNER = (z: PeiZone) => ([
  'bg-emerald-50/80 border-emerald-200',
  'bg-yellow-50/80  border-yellow-200',
  'bg-orange-50/80  border-orange-200',
  'bg-red-50/80     border-red-200',
  'bg-red-100/80    border-red-300',
] as const)[z];

// Tile-level helpers (pct here = % of max for that category)
// Re-use same LOW=25 / MOD=60 breakpoints as BC/AB card
const T_LOW = 25;
const T_MOD = 60;
const tc  = (p: number) => p >= T_MOD ? '#dc2626' : p >= T_LOW ? '#d97706' : p > 0 ? '#16a34a' : '#94a3b8';
const tb  = (p: number) =>
  p >= T_MOD ? 'bg-red-100 text-red-700 border-red-200'
: p >= T_LOW ? 'bg-amber-100 text-amber-700 border-amber-200'
: p >  0     ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
:              'bg-slate-100 text-slate-500 border-slate-200';
const tl  = (p: number) => p >= T_MOD ? 'PRIMARY' : p >= T_LOW ? 'MODERATE' : p > 0 ? 'LOW' : 'NONE';
const ttile = (p: number) =>
  p >= T_MOD ? 'bg-red-50/70     border-red-200'
: p >= T_LOW ? 'bg-amber-50/70   border-amber-200'
: p >  0     ? 'bg-emerald-50/70 border-emerald-200'
:              'bg-slate-50/70   border-slate-200';

// ---"---"---"--- Gradients ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---
const GRAD   = 'linear-gradient(to right,#22c55e 0%,#84cc16 20%,#eab308 33%,#f97316 55%,#ef4444 70%,#991b1b 100%)';
const C_GRAD = 'linear-gradient(to right,#22c55e 0%,#84cc16 20%,#eab308 33%,#f97316 58%,#ef4444 80%,#991b1b 100%)';

// ---"---"---"--- PEI demerit point values reference ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---
const PEI_POINT_VALUES = [
  { label: 'Collision - Not At Fault',              pts: 0, color: '#16a34a' },
  { label: 'Collision - At Fault, Property Damage', pts: 2, color: '#d97706' },
  { label: 'Collision - At Fault, Injury',          pts: 4, color: '#ea580c' },
  { label: 'Collision - At Fault, Fatality',        pts: 6, color: '#dc2626' },
  { label: 'CVSA - Pass / Warning',                 pts: 0, color: '#16a34a' },
  { label: 'CVSA - Out of Service',                 pts: 3, color: '#dc2626' },
  { label: 'Facility Audit - Compliant',            pts: 0, color: '#16a34a' },
  { label: 'Facility Audit - Action Required',      pts: 1, color: '#d97706' },
  { label: 'Facility Audit - Non-Compliant',        pts: 3, color: '#dc2626' },
];

// ---"---"---"--- Component ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

export function NscPeiPerformanceCard({ data }: { data: PeiNscData }) {
  const [actionsOpen,  setActionsOpen]  = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const total    = data.collisionPoints + data.convictionPoints + data.inspectionPoints;
  const maxPts   = getMaxPoints(data.currentActiveVehicles);
  const rawPct   = total / maxPts;
  const scorePct = +(rawPct * 100).toFixed(1);
  const zone     = getZone(rawPct);
  const zColor   = ZC(zone);

  // Bar display - clamp to 130% so "over max" is still visible
  const BAR_MAX    = 1.30;
  const markerPct  = Math.min(rawPct / BAR_MAX * 100, 99);

  // Threshold positions on bar (relative to BAR_MAX)
  const advPts  = Math.round(maxPts * Z_ADV);
  const warnPts = Math.round(maxPts * Z_WARN);
  const intvPts = Math.round(maxPts * Z_INTV);

  const thrPcts = [
    { zone: 1 as PeiZone, pts: advPts,  pct: Z_ADV  / BAR_MAX * 100, label: 'ADVISORY'  },
    { zone: 2 as PeiZone, pts: warnPts, pct: Z_WARN / BAR_MAX * 100, label: 'WARNING'   },
    { zone: 3 as PeiZone, pts: intvPts, pct: Z_INTV / BAR_MAX * 100, label: 'INTERVIEW' },
    { zone: 4 as PeiZone, pts: maxPts,  pct: Z_SANC / BAR_MAX * 100, label: 'SANCTION'  },
  ];

  // Hover zones on bar
  const barZones = [
    { zone: 0 as PeiZone, label: 'LOW',       start: 0,                           end: thrPcts[0].pct },
    { zone: 1 as PeiZone, label: 'ADVISORY',  start: thrPcts[0].pct,              end: thrPcts[1].pct },
    { zone: 2 as PeiZone, label: 'WARNING',   start: thrPcts[1].pct,              end: thrPcts[2].pct },
    { zone: 3 as PeiZone, label: 'INTERVIEW', start: thrPcts[2].pct,              end: thrPcts[3].pct },
    { zone: 4 as PeiZone, label: 'SANCTION',  start: thrPcts[3].pct,              end: 100           },
  ];

  // Contribution tiles - pct of max for each category
  const tiles = [
    { key: 'col',  label: 'Collision Points',  val: data.collisionPoints,  pctOfMax: +(data.collisionPoints  / maxPts * 100).toFixed(1), pctOfTotal: total > 0 ? +(data.collisionPoints  / total * 100).toFixed(1) : 0, desc: 'At-fault collision points from property damage, injury, and fatality events.' },
    { key: 'conv', label: 'Conviction Points', val: data.convictionPoints, pctOfMax: +(data.convictionPoints / maxPts * 100).toFixed(1), pctOfTotal: total > 0 ? +(data.convictionPoints / total * 100).toFixed(1) : 0, desc: 'Demerit points from driver and carrier traffic conviction records.'            },
    { key: 'insp', label: 'Inspection Points', val: data.inspectionPoints, pctOfMax: +(data.inspectionPoints / maxPts * 100).toFixed(1), pctOfTotal: total > 0 ? +(data.inspectionPoints / total * 100).toFixed(1) : 0, desc: 'Points from CVSA out-of-service inspection results and facility audit outcomes.'  },
  ];

  // Recommended actions
  type Sev = 'critical' | 'warning' | 'info';
  const actions: { title: string; desc: string; sev: Sev }[] = [];

  if (zone >= 3)
    actions.push({ sev: 'critical', title: `${ZONE_NAME[zone]} Level - Regulatory Action Required`, desc: `Total demerit points (${total}) are at ${scorePct}% of the ${maxPts}-point maximum (fleet ${data.currentActiveVehicles}). An NSC compliance interview or show-cause hearing may be required.` });
  else if (zone === 2)
    actions.push({ sev: 'warning', title: 'Warning Level - Written Warning Issued', desc: `Points (${total}) have reached ${scorePct}% of max - a written warning has been issued. Submit a corrective action plan to reduce demerit accumulation.` });
  else if (zone === 1)
    actions.push({ sev: 'warning', title: 'Advisory Level - Corrective Measures Needed', desc: `Points (${total}) are at ${scorePct}% of the ${maxPts}-point maximum - above the 25% advisory threshold. Implement corrective measures before reaching the 60% warning level.` });

  if (+tiles[1].pctOfMax > T_LOW)
    actions.push({ sev: +tiles[1].pctOfMax >= T_MOD ? 'critical' : 'warning', title: 'Driver Conviction Points Outstanding', desc: `Conviction points (${data.convictionPoints}) represent ${tiles[1].pctOfMax}% of the allowable maximum - review driver abstracts and schedule corrective training.` });
  if (+tiles[2].pctOfMax > T_LOW)
    actions.push({ sev: +tiles[2].pctOfMax >= T_MOD ? 'critical' : 'warning', title: 'CVSA Inspection Points Present', desc: `Inspection points (${data.inspectionPoints}) represent ${tiles[2].pctOfMax}% of allowable max - increase pre-trip inspections and vehicle maintenance scheduling.` });
  if (+tiles[0].pctOfMax > 0)
    actions.push({ sev: +tiles[0].pctOfMax >= T_LOW ? 'warning' : 'info', title: 'At-Fault Collision Points Present', desc: `Collision points (${data.collisionPoints}) represent ${tiles[0].pctOfMax}% of allowable max - review driver safety training and collision prevention protocols.` });
  if (actions.length === 0)
    actions.push({ sev: 'info', title: 'Performance Within Acceptable Range', desc: `Total demerit points (${total}) are ${scorePct}% of the ${maxPts}-point maximum for a ${data.currentActiveVehicles}-vehicle fleet. Continue current safety programs.` });

  const criticalCount = actions.filter(a => a.sev === 'critical').length;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

      {/* HEADER */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Activity size={15} className="text-slate-600"/>
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">NSC Performance</div>
            <div className="text-[11px] text-slate-500">
              {data.carrierName}  &middot;  {data.jurisdiction}  &middot;  Carrier Profile as of {data.profileAsOf}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            Latest Pull {data.profileAsOf}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            NSC Summary
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* SECTION 1: S */}
        <div className="px-5 pt-5 pb-5">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">NSC Profile Score</div>

          <div className="flex items-start gap-4 mb-4">
            <div>
              <div className="text-[56px] leading-none font-black tracking-tight font-mono" style={{ color: zColor }}>
                {total}
              </div>
              <div className="text-[13px] font-bold font-mono mt-0.5" style={{ color: zColor }}>
                {scorePct}% of max
              </div>
            </div>
            <div className="pt-1 space-y-1.5">
              <span className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-md border ${ZB(zone)}`}>
                {ZONE_LABEL[zone]}
              </span>
              <div className="text-[11px] text-slate-500 leading-snug">
                Carrier must strive for the <span className="font-semibold text-slate-700">lowest score</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-mono font-bold text-slate-600">Fleet {data.currentActiveVehicles}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                <span className="font-mono font-bold text-slate-600">Max {maxPts} pts</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                <span className="font-mono font-bold text-slate-600">{data.jurisdiction}</span>
              </div>
            </div>
          </div>

          {/* Spectrum bar */}
          <div className="relative" style={{ paddingTop: 28 }}>
            {/* Floating score label */}
            <div className="absolute z-10 flex flex-col items-center pointer-events-none"
              style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', top: 0 }}>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white whitespace-nowrap shadow-md"
                style={{ background: zColor }}>{total} pts ({scorePct}%)</span>
              <div className="w-[2px] h-3.5" style={{ background: zColor }}/>
            </div>

            <div className="relative">
              {/* Glow */}
              <div className="absolute inset-0 rounded-full translate-y-0.5 blur-sm opacity-25" style={{ background: GRAD }}/>
              {/* Bar */}
              <div className="relative h-[22px] rounded-full overflow-hidden"
                style={{ background: GRAD, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.22)' }}>
                <div className="absolute top-0 left-0 right-0 h-[8px] rounded-t-full"
                  style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                {/* Threshold tick lines */}
                {thrPcts.map(t => (
                  <div key={t.label} className="absolute top-0 bottom-0 w-[1.5px] bg-white/50"
                    style={{ left: `${t.pct}%` }}/>
                ))}
                {/* Position marker */}
                <div className="absolute top-0 bottom-0 w-[3px] rounded-full"
                  style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 0 6px 2px rgba(0,0,0,0.32)' }}/>
              </div>

              {/* Hover zones - dark tooltip popup like AB/BC */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {barZones.map(z => {
                  const isCurrent = z.zone === zone;
                  const zoneRange =
                    z.zone === 0 ? `0 - ${advPts - 1} pts`
                    : z.zone === 1 ? `${advPts} - ${warnPts - 1} pts`
                    : z.zone === 2 ? `${warnPts} - ${intvPts - 1} pts`
                    : z.zone === 3 ? `${intvPts} - ${maxPts - 1} pts`
                    : `>= ${maxPts} pts`;
                  const zoneDescription =
                    z.zone === 0 ? 'Below advisory threshold - performance is within acceptable range for this fleet size.'
                    : z.zone === 1 ? 'Advisory level - carrier has been notified. Implement corrective measures to prevent escalation.'
                    : z.zone === 2 ? 'Warning level - written warning issued. A corrective action plan must be submitted.'
                    : z.zone === 3 ? 'Interview level - compliance interview required. Corrective plan must be submitted and actioned.'
                    : 'Sanction threshold exceeded - show-cause hearing or sanctions may apply. Immediate action required.';
                  return (
                    <div key={z.label}
                      className="absolute inset-y-0 group/zone cursor-crosshair"
                      style={{ left: `${z.start}%`, width: `${z.end - z.start}%` }}>
                      <div className="absolute inset-0 bg-white/0 group-hover/zone:bg-white/20 transition-colors duration-150 rounded"/>
                      <div className="hidden group-hover/zone:block absolute z-50 pointer-events-none"
                        style={{ bottom: 'calc(100% + 14px)', left: '50%', transform: 'translateX(-50%)', width: 268 }}>
                        <ScoreBandHoverCard
                          title={z.label}
                          range={zoneRange}
                          accentColor={ZC(z.zone)}
                          current={isCurrent ? { label: 'Current Points', value: `${total} pts (${scorePct}%)` } : undefined}
                          description={zoneDescription}
                          detailRows={[
                            { label: 'Fleet', value: `${data.currentActiveVehicles}` },
                            { label: 'Max Allowable', value: `${maxPts} pts` },
                            { label: 'Safety Rating', value: data.safetyRating, valueColor: '#fbbf24' },
                            { label: 'Profile Date', value: data.profileAsOf },
                          ]}
                          thresholdsTitle={`Schedule 3 Thresholds  \u00B7  Fleet ${data.currentActiveVehicles}`}
                          thresholds={thrPcts.map(t => ({
                            label: t.label,
                            value: `>= ${t.pts} pts`,
                            color: ZC(t.zone),
                          }))}
                          thresholdColumns={2}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Zone labels below bar */}
            <div className="relative mt-1.5" style={{ height: 14 }}>
              <span className="absolute text-[9px] font-bold text-emerald-700 whitespace-nowrap" style={{ left: '0%' }}>SAFE</span>
              {thrPcts.map(t => (
                <span key={t.label} className="absolute text-[9px] font-bold whitespace-nowrap"
                  style={{ left: `${t.pct}%`, transform: 'translateX(-50%)', color: ZC(t.zone) }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Threshold reference row */}
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-500">PEI Thresholds</span>
              {thrPcts.map(t => (
                <span key={t.label} className="ml-2" style={{ color: ZC(t.zone) }}>
                  &middot; {t.label} {'>='} {t.pts}
                </span>
              ))}
            </span>
            <span className="text-slate-400 font-mono">Fleet {data.currentActiveVehicles} &middot; Max {maxPts} pts</span>
          </div>

          {/* Status banner */}
          <div className={`mt-3 flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border ${ZBANNER(zone)}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: zColor }}/>
              <span className="text-[12px] font-bold leading-snug" style={{ color: zColor }}>
                {zone === 0 && `Not on NSC monitoring - performance is within acceptable range for fleet ${data.currentActiveVehicles}`}
                {zone === 1 && `Carrier has entered Advisory level (${total} pts >= ${advPts}) - implement corrective measures`}
                {zone === 2 && `Carrier is at Warning level (${total} pts >= ${warnPts}) - written warning issued, corrective plan required`}
                {zone === 3 && `Carrier is at Interview level (${total} pts >= ${intvPts}) - compliance interview required`}
                {zone === 4 && `Carrier has exceeded the sanction threshold (${total} pts >= ${maxPts}) - show-cause may apply`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">{data.profileAsOf}</span>
          </div>
        </div>

        {/* SECTION 2: A */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Assessment Points
            <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
              (as of {data.profileAsOf}  &middot;  {total} of {maxPts} max  &middot;  {scorePct}%)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {tiles.map(tile => {
              const p = +tile.pctOfMax;
              return (
                <div key={tile.key} className={`relative rounded-xl border p-3 ${ttile(p)} group/card cursor-pointer transition-shadow hover:shadow-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{tile.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tb(p)}`}>{tl(p)}</span>
                  </div>
                  <div className="flex items-baseline gap-2 my-1">
                    <span className="text-[36px] leading-none font-black font-mono" style={{ color: tc(p) }}>
                      {tile.val}
                    </span>
                    <span className="text-[13px] font-bold font-mono" style={{ color: tc(p) }}>
                      {tile.val === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>
                  <div className="text-[12px] font-bold font-mono mb-0.5" style={{ color: tc(p) }}>
                    {tile.pctOfMax}% of max
                  </div>
                  <div className="text-[10px] text-slate-400 mb-2">
                    {tile.pctOfTotal}% of total {total} pts
                  </div>
                  <div className="relative">
                    <div className="relative h-[7px] rounded-full overflow-hidden"
                      style={{ background: C_GRAD, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.20)' }}>
                      <div className="absolute top-0 left-0 right-0 h-[3px]"
                        style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                      <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full"
                        style={{ left: `${Math.min(p, 100)}%`, right: 0 }}/>
                      <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow"
                        style={{ left: `${Math.min(p, 100)}%`, transform: 'translateX(-50%)' }}/>
                      {[T_LOW, T_MOD].map(t => (
                        <div key={t} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${t}%` }}/>
                      ))}
                    </div>
                    <div className="flex justify-between text-[8.5px] mt-0.5 text-slate-400">
                      <span>LOW {T_LOW}%</span>
                      <span>MOD {T_MOD}%</span>
                      <span>HIGH</span>
                    </div>
                  </div>
                  {/* Card hover tooltip - dark navy popup */}
                  <div className="hidden group-hover/card:block absolute z-50 pointer-events-none"
                    style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 230 }}>
                      <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                        <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: tc(p) }}>
                          <span className="text-white font-black text-[12px] uppercase tracking-wide">{tile.label}</span>
                          <span className="text-white/90 text-[13px] font-mono font-black">{tile.val} pts</span>
                        </div>
                        <div className="px-3.5 py-2.5 space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Points</span>
                            <span className="font-black text-slate-800 font-mono">{tile.val} / {maxPts}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">% of Max</span>
                            <span className="font-bold text-slate-800">{tile.pctOfMax}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">% of Total ({total} pts)</span>
                            <span className="font-bold text-slate-800">{tile.pctOfTotal}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Level</span>
                            <span className="font-bold" style={{ color: tc(p) }}>{tl(p)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">{tile.desc}</div>
                          <div className="pt-1.5 border-t border-slate-100">
                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Contribution Levels</div>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                              {([
                                { n: 'None',     v: 0,     c: '#94a3b8' },
                                { n: 'Low',      v: T_LOW, c: '#16a34a' },
                                { n: 'Moderate', v: T_MOD, c: '#d97706' },
                                { n: 'Current',  v: p,     c: tc(p)     },
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

          {/* Level reference + schedule toggle */}
          <div className="flex items-center justify-between pt-3 text-[10px]">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-500">Contribution Levels</span>
              &nbsp; &middot; &nbsp;<span style={{ color: '#16a34a' }}>Low &lt;{T_LOW}%</span>
              &nbsp; &middot; &nbsp;<span style={{ color: '#d97706' }}>Moderate {T_LOW}-{T_MOD}%</span>
              &nbsp; &middot; &nbsp;<span style={{ color: '#dc2626' }}>High / Primary &gt;{T_MOD}%</span>
            </span>
            <button type="button" onClick={() => setScheduleOpen(p => !p)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-50">
              PEI Schedule 3 Info {scheduleOpen ? '\u25B4' : '\u25BE'}
            </button>
          </div>

          {scheduleOpen && (
            <div className="mt-2">
              <div className="rounded-t-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500">
                PEI NSC uses a <span className="font-semibold text-slate-700">demerit point threshold system</span> based on fleet size per Schedule 3.
                A carrier's total points are compared to the maximum allowable points for their fleet size. The score percentage is{' '}
                <span className="font-semibold text-slate-700">totalPoints / maxPoints × 100</span>. Four alert levels apply:
                <span className="font-semibold text-yellow-700"> Advisory</span> at 25%,
                <span className="font-semibold text-orange-700"> Warning</span> at 60%,
                <span className="font-semibold text-red-700"> Interview</span> at 85%, and
                <span className="font-semibold text-red-900"> Sanction</span> at 100%.
              </div>
              {/* Point values */}
              <div className="border border-t-0 border-slate-200 bg-white p-3 space-y-3">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Demerit Point Values</div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-[2fr_auto] bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                    <div className="px-3 py-1.5">Event Type</div>
                    <div className="px-3 py-1.5 text-center">Points</div>
                  </div>
                  {PEI_POINT_VALUES.map((p, i) => (
                    <div key={p.label} className={`grid grid-cols-[2fr_auto] border-t border-slate-100 ${i % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
                      <div className="px-3 py-1.5 text-slate-600">{p.label}</div>
                      <div className="px-3 py-1.5 text-center font-bold font-mono" style={{ color: p.color }}>{p.pts}</div>
                    </div>
                  ))}
                </div>
                {/* Schedule 3 table */}
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Schedule 3 - Fleet Thresholds</div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-5 bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                    <div className="px-3 py-1.5">Fleet</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(1) }}>Advisory</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(2) }}>Warning</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(3) }}>Interview</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(4) }}>Sanction</div>
                  </div>
                  {SCHEDULE_3.map((row, i) => {
                    const isActive = data.currentActiveVehicles >= row.minFleet && data.currentActiveVehicles <= row.maxFleet;
                    return (
                      <div key={i} className={`grid grid-cols-5 border-t border-slate-100 ${isActive ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : i % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
                        <div className="px-3 py-1.5 font-semibold text-slate-700">
                          {row.maxFleet === Infinity ? `${row.minFleet}+` : `${row.minFleet}-${row.maxFleet}`}
                          {isActive && <span className="ml-1.5 text-[8px] font-bold bg-blue-100 text-blue-700 border border-blue-200 px-1 py-0.5 rounded-full">this fleet</span>}
                        </div>
                        <div className="px-3 py-1.5 text-center font-mono font-bold" style={{ color: ZC(1) }}>{Math.round(row.maxPts * Z_ADV)}</div>
                        <div className="px-3 py-1.5 text-center font-mono font-bold" style={{ color: ZC(2) }}>{Math.round(row.maxPts * Z_WARN)}</div>
                        <div className="px-3 py-1.5 text-center font-mono font-bold" style={{ color: ZC(3) }}>{Math.round(row.maxPts * Z_INTV)}</div>
                        <div className="px-3 py-1.5 text-center font-mono font-bold" style={{ color: ZC(4) }}>{row.maxPts}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: R */}
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
            <button type="button" onClick={() => setActionsOpen(p => !p)}
              className="text-[11px] font-semibold text-blue-500 transition-colors hover:text-blue-700">
              {actionsOpen ? 'Hide Details \u25B4' : 'View Details \u25BE'}
            </button>
          </div>
          {actionsOpen && (
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
              {actions.map((a, idx) => {
                const numCls =
                  a.sev === 'critical' ? 'bg-red-100    text-red-700    border-red-200'
                : a.sev === 'warning'  ? 'bg-amber-100  text-amber-700  border-amber-200'
                :                        'bg-blue-100   text-blue-600   border-blue-200';
                return (
                  <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                    <span className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${numCls}`}>
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

        {/* SECTION 4: C */}
        <div className="px-5 py-5 grid grid-cols-2 gap-8 border-t border-slate-100">
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Carrier Identifiers</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">NSC #</span>
                <span className="text-sm font-bold font-mono text-slate-900">{data.nscNumber}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs text-slate-500 shrink-0">Company</span>
                <span className="text-xs font-bold text-slate-900 text-right">{data.carrierName}</span>
              </div>
              {data.contactName && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-500 shrink-0">Name</span>
                  <span className="text-xs font-semibold text-slate-700 text-right">{data.contactName}</span>
                </div>
              )}
              {data.carrierInfo && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-500 shrink-0">Address</span>
                  <span className="text-xs font-semibold text-slate-700 text-right leading-snug">{data.carrierInfo.mailingAddress}</span>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Phone</span>
                  <span className="text-sm font-bold font-mono text-slate-800">{data.phone}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Jurisdiction</span>
                <span className="text-sm font-bold font-mono text-slate-900">{data.jurisdiction}</span>
              </div>
              {data.carrierInfo && (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">Primary Business</span>
                    <span className="text-sm font-bold text-slate-800">{data.carrierInfo.primaryBusiness}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500">Extra-Provincial</span>
                    <span className="text-sm font-bold text-slate-800">{data.carrierInfo.extraProvincial ? 'Yes' : 'No'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Safety Fitness Certificate</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Safety Rating</span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                  data.safetyRating === 'Satisfactory' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : data.safetyRating === 'Conditional'  ? 'bg-amber-50  text-amber-700  border-amber-200'
                :                                         'bg-red-50    text-red-700    border-red-200'
                }`}>{data.safetyRating}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Certificate Status</span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${data.certStatus === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                  {data.certStatus}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Audit Status</span>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded border bg-slate-50 text-slate-600 border-slate-200">{data.auditStatus}</span>
              </div>
              {data.carrierInfo && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Cert. Issue Date</span>
                  <span className="text-sm font-bold font-mono text-slate-800">{data.carrierInfo.certIssueDate}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Active Vehicles</span>
                <span className="text-sm font-bold font-mono text-blue-700">{data.currentActiveVehicles}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Vehicles at Last Assessment</span>
                <span className="text-sm font-bold font-mono text-slate-800">{data.currentActiveVehiclesAtLastAssessment}</span>
              </div>
            </div>
          </div>
        </div>

        {/* NSC Interventions */}
        {data.interventions && data.interventions.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">NSC Interventions</span>
              <span className="text-[9px] text-slate-400">Past 25 months</span>
              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                {data.interventions.length} Event{data.interventions.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              {data.interventions.map((iv, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  iv.type === 'critical' ? 'bg-red-50/70 border-red-200' : iv.type === 'warning' ? 'bg-amber-50/70 border-amber-200' : 'bg-blue-50/70 border-blue-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${iv.type === 'critical' ? 'bg-red-500' : iv.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}/>
                    <span className={`text-[12px] font-bold ${iv.type === 'critical' ? 'text-red-800' : iv.type === 'warning' ? 'text-amber-800' : 'text-blue-800'}`}>{iv.label}</span>
                  </div>
                  <span className={`text-[11px] font-mono font-semibold ${iv.type === 'critical' ? 'text-red-600' : iv.type === 'warning' ? 'text-amber-600' : 'text-blue-600'}`}>{iv.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Carrier Information R */}
        {data.carrierInfo && (
          <div className="px-5 py-4 border-t border-slate-100">
            <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700">National Safety Code Carrier Profile Report</span>
              <span className="text-slate-300"> &middot; </span>
              <span>From: <strong className="text-slate-700 font-mono">{data.carrierInfo.reportFrom}</strong></span>
              <span className="text-slate-300">&#x2192;</span>
              <strong className="text-slate-700 font-mono">{data.carrierInfo.reportTo}</strong>
              <span className="ml-auto">Report Run: <strong className="font-mono">{data.carrierInfo.reportRun}</strong></span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
