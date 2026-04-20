import { useState } from 'react';
import { Activity } from 'lucide-react';
import { ScoreBandHoverCard } from './ScoreBandHoverCard';

// ---"---"---"--- Types ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

export interface NsNscData {
  carrierName:          string;
  nscNumber:            string;
  profileAsOf:          string;
  safetyRating:         string;
  safetyRatingExpires?: string;
  certStatus?:          string;

  contactName?:         string;
  contactTitle?:        string;
  phone?:               string;

  mailingAddress?:      string;
  physicalAddress?:     string;
  principalPlace?:      string;

  usDotNumber?:         string;
  irpNumber?:           string;
  mviStnNumber?:        string;

  currentFleetSize:     number;
  avgDailyFleetSize:    number;

  // Three-level threshold system (indexed scores)
  scoreLevel1:          number;
  scoreLevel2:          number;
  scoreLevel3:          number;

  convictionScore:      number;
  inspectionScore:      number;
  collisionScore:       number;

  auditHistory?:    { date: string; type: string; result: string }[];
  interventions?:   { label: string; date: string; type: 'warning' | 'critical' | 'info' }[];

  carrierInfo?: {
    reportFrom?: string;
    reportTo?:   string;
    reportRun?:  string;
  };
}

// ---"---"---"--- Zone helpers - 4 bands mapped to thresholds ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---
// min=0, practical max=Level3, overflow=Critical
// Band:  0=Low (<L1)  1=Moderate (L1-L2)  2=High (L2-L3)  3=Critical (>=L3)

type NsZone = 0 | 1 | 2 | 3;

function getZone(score: number, l1: number, l2: number, l3: number): NsZone {
  if (score >= l3) return 3;
  if (score >= l2) return 2;
  if (score >= l1) return 1;
  return 0;
}

const ZONE_LABEL = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
const ZONE_NAME  = ['Low', 'Moderate', 'High', 'Critical'];

const ZC = (z: NsZone) =>
  (['#16a34a', '#ca8a04', '#ea580c', '#dc2626'] as const)[z];

const ZB = (z: NsZone) => ([
  'bg-emerald-100 text-emerald-800 border-emerald-300',
  'bg-yellow-100  text-yellow-800  border-yellow-300',
  'bg-orange-100  text-orange-800  border-orange-300',
  'bg-red-100     text-red-800     border-red-300',
] as const)[z];

const ZBANNER = (z: NsZone) => ([
  'bg-emerald-50/80 border-emerald-200',
  'bg-yellow-50/80  border-yellow-200',
  'bg-orange-50/80  border-orange-200',
  'bg-red-50/80     border-red-200',
] as const)[z];

// ---"---"---"--- Tile helpers - based on % of Level 3 threshold ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

const T_LOW = 25;  // % of Level 3 -> moderate
const T_MOD = 55;  // % of Level 3 -> primary

const tc  = (p: number) =>
  p >= T_MOD ? '#dc2626' : p >= T_LOW ? '#d97706' : p > 0 ? '#16a34a' : '#94a3b8';

const tb  = (p: number) =>
  p >= T_MOD ? 'bg-red-100    text-red-700    border-red-200'
: p >= T_LOW ? 'bg-amber-100  text-amber-700  border-amber-200'
: p >  0     ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
:               'bg-slate-100   text-slate-500   border-slate-200';

const tl  = (p: number) =>
  p >= T_MOD ? 'PRIMARY' : p >= T_LOW ? 'MODERATE' : p > 0 ? 'LOW' : 'NONE';

const ttile = (p: number) =>
  p >= T_MOD ? 'bg-red-50/70     border-red-200'
: p >= T_LOW ? 'bg-amber-50/70   border-amber-200'
: p >  0     ? 'bg-emerald-50/70 border-emerald-200'
:               'bg-slate-50/70   border-slate-200';

// ---"---"---"--- Gradients ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

const GRAD   = 'linear-gradient(to right,#22c55e 0%,#84cc16 22%,#eab308 35%,#f97316 58%,#ef4444 75%,#991b1b 100%)';
const C_GRAD = 'linear-gradient(to right,#22c55e 0%,#84cc16 22%,#eab308 35%,#f97316 58%,#ef4444 80%,#991b1b 100%)';

// ---"---"---"--- Component ---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---"---

export function NscNsPerformanceCard({ data }: { data: NsNscData }) {
  const [actionsOpen,  setActionsOpen]  = useState(false);
  const [threshOpen,   setThreshOpen]   = useState(false);

  const total  = +(data.convictionScore + data.inspectionScore + data.collisionScore).toFixed(4);
  const zone   = getZone(total, data.scoreLevel1, data.scoreLevel2, data.scoreLevel3);
  const zColor = ZC(zone);

  // Scaling: Level 3 = 100% (practical max). Overflow capped at 99% visually.
  // scaledPct shows where carrier sits on the 0---'Level3 scale.
  const scaledPct  = +(Math.min(total / data.scoreLevel3 * 100, 100)).toFixed(1);
  const markerPct  = Math.min(total / data.scoreLevel3 * 100, 99);

  // Threshold positions on bar - Level 3 is at 100%
  const thrPcts = [
    { zone: 1 as NsZone, val: data.scoreLevel1, pct: data.scoreLevel1 / data.scoreLevel3 * 100, label: 'MODERATE' },
    { zone: 2 as NsZone, val: data.scoreLevel2, pct: data.scoreLevel2 / data.scoreLevel3 * 100, label: 'HIGH'     },
    { zone: 3 as NsZone, val: data.scoreLevel3, pct: 100,                                        label: 'CRITICAL' },
  ];

  // Hover zones on bar
  const barZones = [
    { zone: 0 as NsZone, label: 'LOW',      start: 0,                    end: thrPcts[0].pct },
    { zone: 1 as NsZone, label: 'MODERATE', start: thrPcts[0].pct,       end: thrPcts[1].pct },
    { zone: 2 as NsZone, label: 'HIGH',     start: thrPcts[1].pct,       end: thrPcts[2].pct },
    { zone: 3 as NsZone, label: 'CRITICAL', start: thrPcts[2].pct,       end: 100            },
  ];

  // Contribution tiles - each component's % of Level3 (practical max)
  const tiles = [
    {
      key: 'conv', label: 'Convictions',
      val: data.convictionScore,
      pctOfL3:    +(data.convictionScore / data.scoreLevel3 * 100).toFixed(1),
      pctOfTotal: total > 0 ? +(data.convictionScore / total * 100).toFixed(1) : 0,
      desc: 'Indexed score from driver and carrier traffic conviction records, weighted by severity and recency.',
    },
    {
      key: 'insp', label: 'Inspections',
      val: data.inspectionScore,
      pctOfL3:    +(data.inspectionScore / data.scoreLevel3 * 100).toFixed(1),
      pctOfTotal: total > 0 ? +(data.inspectionScore / total * 100).toFixed(1) : 0,
      desc: 'Indexed score from CVSA and MVI inspection results, including out-of-service designations.',
    },
    {
      key: 'coll', label: 'Collisions',
      val: data.collisionScore,
      pctOfL3:    +(data.collisionScore / data.scoreLevel3 * 100).toFixed(1),
      pctOfTotal: total > 0 ? +(data.collisionScore / total * 100).toFixed(1) : 0,
      desc: 'Indexed score from at-fault collision records, weighted by injury/fatality severity.',
    },
  ];

  // Recommended actions
  type Sev = 'critical' | 'warning' | 'info';
  const actions: { title: string; desc: string; sev: Sev }[] = [];

  if (zone >= 3)
    actions.push({ sev: 'critical', title: 'Critical Band - Immediate Regulatory Action Required', desc: `Total indexed score (${total}) has reached the Critical threshold (>= ${data.scoreLevel3}). A compliance audit or show-cause hearing is required. Carrier must demonstrate immediate corrective action.` });
  else if (zone === 2)
    actions.push({ sev: 'critical', title: 'High Band - Compliance Interview Required', desc: `Total indexed score (${total}) is in the High band (${data.scoreLevel2}-${data.scoreLevel3}). A compliance interview has been triggered. A corrective action plan must be submitted and actioned.` });
  else if (zone === 1)
    actions.push({ sev: 'warning', title: 'Moderate Band - Enhanced Monitoring in Effect', desc: `Total indexed score (${total}) has entered the Moderate band (${data.scoreLevel1}-${data.scoreLevel2}). Enhanced monitoring is in effect. Implement corrective measures to reduce the indexed score.` });

  if (tiles[0].pctOfL3 >= T_LOW)
    actions.push({ sev: tiles[0].pctOfL3 >= T_MOD ? 'critical' : 'warning', title: 'Conviction Score Elevated', desc: `Conviction indexed score (${data.convictionScore}) is ${tiles[0].pctOfL3}% of the Level 3 cap (${data.scoreLevel3}). Review driver abstracts and schedule corrective safety training.` });
  if (tiles[1].pctOfL3 >= T_LOW)
    actions.push({ sev: tiles[1].pctOfL3 >= T_MOD ? 'critical' : 'warning', title: 'Inspection Score Elevated', desc: `Inspection indexed score (${data.inspectionScore}) is ${tiles[1].pctOfL3}% of the Level 3 cap. Increase pre-trip inspections and scheduled vehicle maintenance.` });
  if (tiles[2].pctOfL3 > 0)
    actions.push({ sev: tiles[2].pctOfL3 >= T_LOW ? 'warning' : 'info', title: 'Collision Score Present', desc: `Collision indexed score (${data.collisionScore}) is above zero. Review driver safety training and collision prevention protocols.` });
  if (actions.length === 0)
    actions.push({ sev: 'info', title: 'Low Band - Performance Within Acceptable Range', desc: `Total indexed demerit score (${total}) is ${scaledPct}% of the Level 3 cap - carrier is in the Low band, below the Moderate threshold (${data.scoreLevel1}). Continue current safety programs.` });

  const criticalCount = actions.filter(a => a.sev === 'critical').length;

  // Safety rating display
  const isUnaudited   = data.safetyRating.toLowerCase().includes('unaudited');
  const safetyLabel   = data.safetyRating.split(' - ')[0] ?? data.safetyRating;
  const auditLabel    = data.safetyRating.split(' - ')[1];

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
              {data.carrierName}  &middot;  Nova Scotia  &middot;  Carrier Profile as of {data.profileAsOf}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
            Latest Pull {data.profileAsOf}
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${ZB(zone)}`}>
            {ZONE_NAME[zone]}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* SECTION 1: S */}
        <div className="px-5 pt-5 pb-5">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">NS NSC Indexed Demerit Score</div>

          <div className="flex items-start gap-5 mb-4">
            {/* Primary: raw score / level3 */}
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-[52px] leading-none font-black tracking-tight font-mono" style={{ color: zColor }}>
                  {total.toFixed(2)}
                </span>
                <span className="text-[20px] font-bold font-mono text-slate-400 leading-none">
                  / {data.scoreLevel3.toFixed(2)}
                </span>
              </div>
              {/* Secondary: scaled % */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[15px] font-black font-mono" style={{ color: zColor }}>{scaledPct}%</span>
                <span className="text-[11px] text-slate-400 font-mono">of Level 3 cap</span>
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
                <span className="font-mono font-bold text-slate-600">Fleet {data.currentFleetSize}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                <span className="font-mono font-bold text-slate-600">Avg {data.avgDailyFleetSize}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 inline-block"/>
                <span className="font-mono font-bold text-slate-600">Nova Scotia</span>
              </div>
            </div>
          </div>

          {/* Spectrum bar */}
          <div className="relative" style={{ paddingTop: 28 }}>
            {/* Floating score label */}
            <div className="absolute z-10 flex flex-col items-center pointer-events-none"
              style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', top: 0 }}>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white whitespace-nowrap shadow-md"
                style={{ background: zColor }}>{total.toFixed(2)} ({scaledPct}%)</span>
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
                {/* Threshold ticks */}
                {thrPcts.map(t => (
                  <div key={t.label} className="absolute top-0 bottom-0 w-[1.5px] bg-white/50"
                    style={{ left: `${t.pct}%` }}/>
                ))}
                {/* Position marker */}
                <div className="absolute top-0 bottom-0 w-[3px] rounded-full"
                  style={{ left: `${markerPct}%`, transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 0 6px 2px rgba(0,0,0,0.32)' }}/>
              </div>

              {/* Hover zones - dark tooltip popup */}
              <div className="absolute inset-0 rounded-full overflow-hidden">
                {barZones.map(bz => {
                  const isCurrent = bz.zone === zone;
                  const zoneRange =
                    bz.zone === 0 ? `< ${data.scoreLevel1}`
                    : bz.zone === 1 ? `${data.scoreLevel1} - ${data.scoreLevel2}`
                    : bz.zone === 2 ? `${data.scoreLevel2} - ${data.scoreLevel3}`
                    : `>= ${data.scoreLevel3}`;
                  const zoneDescription =
                    bz.zone === 0 ? 'Below Level 1 threshold - carrier is in the satisfactory range. No mandatory intervention required.'
                    : bz.zone === 1 ? 'Level 1 reached - carrier is under enhanced monitoring. Corrective action is expected.'
                    : bz.zone === 2 ? 'Level 2 reached - compliance interview required. Carrier must submit a corrective action plan.'
                    : 'Level 3 reached - serious deficiency. Compliance audit or show-cause hearing required. Immediate action mandatory.';
                  return (
                    <div key={bz.label}
                      className="absolute inset-y-0 group/zone cursor-crosshair"
                      style={{ left: `${bz.start}%`, width: `${bz.end - bz.start}%` }}>
                      <div className="absolute inset-0 bg-white/0 group-hover/zone:bg-white/20 transition-colors duration-150 rounded"/>
                      <div className="hidden group-hover/zone:block absolute z-50 pointer-events-none"
                        style={{ bottom: 'calc(100% + 14px)', left: '50%', transform: 'translateX(-50%)', width: 272 }}>
                        <ScoreBandHoverCard
                          title={bz.label}
                          range={zoneRange}
                          accentColor={ZC(bz.zone)}
                          current={isCurrent ? { label: 'Current Score', value: total.toFixed(4) } : undefined}
                          description={zoneDescription}
                          detailRows={[
                            { label: 'Fleet', value: `${data.currentFleetSize}` },
                            { label: 'Avg Daily Fleet', value: `${data.avgDailyFleetSize}` },
                            { label: 'Safety Rating', value: safetyLabel, valueColor: '#86efac' },
                            { label: 'Profile Date', value: data.profileAsOf },
                          ]}
                          thresholdsTitle={`NS Safety Rating Thresholds  \u00B7  Fleet ${data.currentFleetSize}`}
                          thresholds={thrPcts.map(t => ({
                            label: t.label,
                            value: `>= ${t.val}`,
                            color: ZC(t.zone),
                          }))}
                          thresholdColumns={1}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Zone labels below bar */}
            <div className="relative mt-1.5" style={{ height: 14 }}>
              <span className="absolute text-[9px] font-bold text-emerald-700 whitespace-nowrap" style={{ left: '0%' }}>LOW</span>
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
              <span className="font-semibold text-slate-500">NS Thresholds</span>
              <span className="ml-2" style={{ color: ZC(1) }}> &middot; Moderate {'>='} {data.scoreLevel1}</span>
              <span className="ml-2" style={{ color: ZC(2) }}> &middot; High {'>='} {data.scoreLevel2}</span>
              <span className="ml-2" style={{ color: ZC(3) }}> &middot; Critical {'>='} {data.scoreLevel3}</span>
            </span>
            <span className="text-slate-400 font-mono">Score: {total.toFixed(2)} / {data.scoreLevel3.toFixed(2)} &middot; {scaledPct}%</span>
          </div>

          {/* Status banner */}
          <div className={`mt-3 flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg border ${ZBANNER(zone)}`}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: zColor }}/>
              <span className="text-[12px] font-bold leading-snug" style={{ color: zColor }}>
                {zone === 0 && `Low band - score ${total.toFixed(4)} is ${scaledPct}% of Level 3 cap (${data.scoreLevel3}), below Moderate threshold (${data.scoreLevel1})`}
                {zone === 1 && `Moderate band - score ${total.toFixed(4)} (${scaledPct}%) >= ${data.scoreLevel1} - enhanced monitoring in effect`}
                {zone === 2 && `High band - score ${total.toFixed(4)} (${scaledPct}%) >= ${data.scoreLevel2} - compliance interview required`}
                {zone === 3 && `Critical band - score ${total.toFixed(4)} >= Level 3 cap (${data.scoreLevel3}) - immediate regulatory action required`}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">{data.profileAsOf}</span>
          </div>
        </div>

        {/* SECTION 2: C */}
        <div className="px-5 py-4">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Indexed Score Breakdown
            <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
              ({total.toFixed(4)} total  &middot;  {scaledPct}% of Level 3 cap  &middot;  Band: {ZONE_NAME[zone]})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {tiles.map(tile => {
              const p = +tile.pctOfL3;
              return (
                <div key={tile.key} className={`relative rounded-xl border p-3 ${ttile(p)} group/card cursor-pointer transition-shadow hover:shadow-lg`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{tile.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${tb(p)}`}>{tl(p)}</span>
                  </div>
                  {/* Primary: indexed score */}
                  <div className="flex items-baseline gap-1.5 my-1">
                    <span className="text-[34px] leading-none font-black font-mono" style={{ color: tc(p) }}>
                      {tile.val.toFixed(4)}
                    </span>
                  </div>
                  {/* Secondary: % of Level 3 */}
                  <div className="text-[12px] font-bold font-mono mb-0.5" style={{ color: tc(p) }}>
                    {tile.pctOfL3}% of L3 cap
                  </div>
                  <div className="text-[10px] text-slate-400 mb-2">
                    {tile.pctOfTotal}% of total score
                  </div>
                  {/* Mini bar */}
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
                    style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 236 }}>
                      <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                        <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: tc(p) }}>
                          <span className="text-white font-black text-[12px] uppercase tracking-wide">{tile.label}</span>
                          <span className="text-white/90 text-[13px] font-mono font-black">{tile.val.toFixed(4)}</span>
                        </div>
                        <div className="px-3.5 py-2.5 space-y-1.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Indexed Score</span>
                            <span className="font-black text-slate-800 font-mono">{tile.val.toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">% of Level 3 ({data.scoreLevel3})</span>
                            <span className="font-bold text-slate-800">{tile.pctOfL3}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">% of Total ({total.toFixed(4)})</span>
                            <span className="font-bold text-slate-800">{tile.pctOfTotal}%</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Level</span>
                            <span className="font-bold" style={{ color: tc(p) }}>{tl(p)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 leading-relaxed pt-1 border-t border-slate-100">{tile.desc}</div>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                          style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }}/>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Threshold dropdown toggle */}
          <div className="flex items-center justify-between pt-3 text-[10px]">
            <span className="text-slate-400">
              <span className="font-semibold text-slate-500">Contribution Levels</span>
              &nbsp; &middot; &nbsp;<span style={{ color: '#16a34a' }}>Low &lt;{T_LOW}%</span>
              &nbsp; &middot; &nbsp;<span style={{ color: '#d97706' }}>Moderate {T_LOW}-{T_MOD}%</span>
              &nbsp; &middot; &nbsp;<span style={{ color: '#dc2626' }}>Primary &gt;{T_MOD}%</span>
              <span className="ml-2 text-slate-300">(% of Level 3 threshold)</span>
            </span>
            <button type="button" onClick={() => setThreshOpen(p => !p)}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-50">
              NS Rating Score Info {threshOpen ? '\u25B4' : '\u25BE'}
            </button>
          </div>

          {/* THRESHOLD DROPDOWN - */}
          {threshOpen && (
            <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500 border-b border-slate-200">
                Nova Scotia NSC uses an <span className="font-semibold text-slate-700">indexed demerit scoring system</span>. Scores are weighted by event severity, fleet size, and recency.
                The <span className="font-semibold text-slate-700">minimum is always 0</span>. Level 3 is used as the practical max (100% scaled). A <span className="font-semibold text-slate-700">lower score is better</span>.
                Scores above Level 3 are treated as overflow / Critical.
              </div>
              <div className="bg-white p-3 space-y-3">
                {/* Risk Band Thresholds */}
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Risk Band Thresholds</div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-4 bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                    <div className="px-3 py-1.5 text-center text-emerald-600">Low</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(1) }}>Moderate</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(2) }}>High</div>
                    <div className="px-3 py-1.5 text-center" style={{ color: ZC(3) }}>Critical</div>
                  </div>
                  <div className="grid grid-cols-4 border-t border-slate-100">
                    <div className="px-3 py-2 text-center font-mono font-bold text-emerald-600">0 - {data.scoreLevel1}</div>
                    <div className="px-3 py-2 text-center font-mono font-black" style={{ color: ZC(1) }}>{'>='} {data.scoreLevel1}</div>
                    <div className="px-3 py-2 text-center font-mono font-black" style={{ color: ZC(2) }}>{'>='} {data.scoreLevel2}</div>
                    <div className="px-3 py-2 text-center font-mono font-black" style={{ color: ZC(3) }}>{'>='} {data.scoreLevel3}</div>
                  </div>
                  <div className="grid grid-cols-4 border-t border-slate-100 bg-slate-50/50 text-[9px] text-slate-400">
                    <div className="px-3 py-1.5 text-center">{+(0/data.scoreLevel3*100).toFixed(0)}%</div>
                    <div className="px-3 py-1.5 text-center">{+(data.scoreLevel1/data.scoreLevel3*100).toFixed(0)}%</div>
                    <div className="px-3 py-1.5 text-center">{+(data.scoreLevel2/data.scoreLevel3*100).toFixed(0)}%</div>
                    <div className="px-3 py-1.5 text-center">100%</div>
                  </div>
                </div>

                {/* Indexed Score Table */}
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Indexed Score Table</div>
                <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                  <div className="grid grid-cols-2 bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                    <div className="px-3 py-1.5">Area</div>
                    <div className="px-3 py-1.5 text-right">Indexed Score</div>
                  </div>
                  {tiles.map((t, i) => (
                    <div key={t.key} className={`grid grid-cols-2 border-t border-slate-100 ${i % 2 ? 'bg-slate-50/50' : 'bg-white'}`}>
                      <div className="px-3 py-1.5 text-slate-600">{t.label}</div>
                      <div className="px-3 py-1.5 text-right font-mono font-bold" style={{ color: tc(+t.pctOfL3) }}>{t.val.toFixed(4)}</div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 border-t border-slate-200 bg-slate-50">
                    <div className="px-3 py-1.5 font-bold text-slate-700">Total Demerit Score</div>
                    <div className="px-3 py-1.5 text-right font-mono font-black" style={{ color: zColor }}>{total.toFixed(4)}</div>
                  </div>
                </div>

                {/* NS Safety Rating Status Cards */}
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">NS Safety Rating Statuses</div>
                <div className="grid gap-3 lg:grid-cols-4">
                  {([
                    {
                      label: 'Satisfactory',
                      titleClass: 'bg-emerald-300 text-emerald-950',
                      bodyClass: 'border-emerald-200 bg-emerald-50/90',
                      lines: [
                        'Carrier has passed an NSC facility audit or has no known compliance concerns',
                        'Demerit score is in the Low range',
                      ],
                    },
                    {
                      label: 'Satisfactory Unaudited',
                      titleClass: 'bg-amber-200 text-amber-950',
                      bodyClass: 'border-amber-200 bg-amber-50/90',
                      lines: [
                        'Generally assigned to new carriers with no known compliance issues',
                        'Carrier has not yet had an NSC facility audit',
                      ],
                    },
                    {
                      label: 'Conditional',
                      titleClass: 'bg-orange-400 text-orange-950',
                      bodyClass: 'border-orange-200 bg-orange-50/90',
                      lines: [
                        'Carrier has an unacceptable safety record and must improve performance',
                        'Conditions set by the Registrar must be met',
                      ],
                    },
                    {
                      label: 'Unsatisfactory',
                      titleClass: 'bg-orange-500 text-white',
                      bodyClass: 'border-red-200 bg-red-50/90',
                      lines: [
                        "Carrier's performance demonstrates unacceptable risk to the public",
                        "Carrier may no longer register or operate a commercial vehicle under the NSC program",
                      ],
                    },
                  ]).map(card => (
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
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: R */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recommended Actions</span>
              {criticalCount > 0 && (
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
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
        <div className="px-5 py-5 grid grid-cols-2 gap-8">

          {/* Left: Carrier Details */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Carrier Details</div>
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
                  <span className="text-xs text-slate-500 shrink-0">Contact</span>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700">{data.contactName}</div>
                    {data.contactTitle && <div className="text-[10px] text-slate-500">{data.contactTitle}</div>}
                  </div>
                </div>
              )}
              {data.phone && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Phone</span>
                  <span className="text-sm font-bold font-mono text-slate-800">{data.phone}</span>
                </div>
              )}
              {data.mailingAddress && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-500 shrink-0">Mailing</span>
                  <span className="text-xs font-semibold text-slate-700 text-right leading-snug whitespace-pre-line">{data.mailingAddress}</span>
                </div>
              )}
              {data.principalPlace && (
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs text-slate-500 shrink-0">Principal</span>
                  <span className="text-xs font-semibold text-slate-700 text-right">{data.principalPlace}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Safety Certificate */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Safety Certificate</div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Safety Rating</span>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${
                  safetyLabel === 'SATISFACTORY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : safetyLabel === 'CONDITIONAL'  ? 'bg-amber-50  text-amber-700  border-amber-200'
                :                                   'bg-red-50    text-red-700    border-red-200'
                }`}>{safetyLabel}</span>
              </div>
              {auditLabel && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Audit Status</span>
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${isUnaudited ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {auditLabel}
                  </span>
                </div>
              )}
              {data.safetyRatingExpires && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">Expires</span>
                  <span className="text-sm font-bold font-mono text-slate-800">{data.safetyRatingExpires}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Current Fleet Size</span>
                <span className="text-sm font-bold font-mono text-blue-700">{data.currentFleetSize}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Avg. Daily Fleet</span>
                <span className="text-sm font-bold font-mono text-slate-800">{data.avgDailyFleetSize}</span>
              </div>
              {data.usDotNumber && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">U.S. DOT #</span>
                  <span className="text-sm font-bold font-mono text-slate-800">{data.usDotNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ---"---"--- Audit History ---"---"--- */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Audit History</span>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              data.auditHistory && data.auditHistory.length > 0
                ? 'border-amber-200 bg-amber-100 text-amber-700'
                : 'border-slate-200 bg-slate-100 text-slate-500'
            }`}>
              {data.auditHistory && data.auditHistory.length > 0 ? `${data.auditHistory.length} Record${data.auditHistory.length > 1 ? 's' : ''}` : 'No Records'}
            </span>
          </div>
          {(!data.auditHistory || data.auditHistory.length === 0) ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-[12px] text-slate-400 text-center">
              There are no Audit History records.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 divide-y divide-slate-100">
              {data.auditHistory.map((a, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 bg-white text-[11px]">
                  <span className="font-bold text-slate-800">{a.type}</span>
                  <span className="text-slate-500">{a.result}</span>
                  <span className="font-mono text-slate-400">{a.date}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ---"---"--- NSC Interventions ---"---"--- */}
        {data.interventions && data.interventions.length > 0 && (
          <div className="px-5 py-4">
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

        {/* Carrier Info */}
        {data.carrierInfo && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700">NS Carrier Profile Abstract</span>
              <span className="text-slate-300"> &middot; </span>
              {data.carrierInfo.reportFrom && <>
                <span>From: <strong className="text-slate-700 font-mono">{data.carrierInfo.reportFrom}</strong></span>
                <span className="text-slate-300">&#x2192;</span>
                <strong className="text-slate-700 font-mono">{data.carrierInfo.reportTo}</strong>
              </>}
              <span className="ml-auto">NSC #: <strong className="font-mono">{data.nscNumber}</strong></span>
              {data.carrierInfo.reportRun && <>
                <span className="text-slate-300"> &middot; </span>
                <span>Report Run: <strong className="font-mono">{data.carrierInfo.reportRun}</strong></span>
              </>}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
