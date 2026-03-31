import React, { useState, useMemo, useEffect } from 'react';
import { Activity, AlertCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import { NscPerformanceCard, type NscPerformanceCardProps } from './NscPerformanceCard';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NscSnapshot {
  date: string; label: string; reportStart: string; reportEnd: string;
  rFactor: number; monitoringStage: number; industryAvg: number;
  stage1: number; stage2: number; stage3: number; stage4: number;
  fleetRange: string; fleetType: string; currentFleet: number; avgFleet: number;
  convPct: number; adminPct: number; cvsaPct: number; colPct: number;
  totalInsp: number; passed: number; requiresAttn: number; oosCount: number;
  overallOOS: number; vehicleOOS: number; driverOOS: number;
  l1: number; l2: number; l3: number; l4: number; l5: number; l6: number;
  convDocs: number; convOcc: number; convPts: number;
  adminDocs: number; adminPts: number;
  collCount: number; collPts: number; cvsaPts: number; violOcc: number; totalEvents: number;
  brakes: number; lighting: number; vehStd: number; driverQual: number;
  tires: number; cargo: number; hos: number; dangerous: number;
}

// ─── Mock data ─────────────────────────────────────────────────────────────────

const DATA: NscSnapshot[] = [
  { date:'2025-02-28',label:"FEB '25",reportStart:'2024 FEB 01',reportEnd:'2025 JAN 31',rFactor:0.342,monitoringStage:0,industryAvg:0.251,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:38,avgFleet:39.5,convPct:28.4,adminPct:2.1,cvsaPct:38.2,colPct:31.3,totalInsp:52,passed:41,requiresAttn:8,oosCount:3,overallOOS:5.8,vehicleOOS:4.2,driverOOS:1.6,l1:28,l2:14,l3:6,l4:3,l5:1,l6:0,convDocs:4,convOcc:8,convPts:12,adminDocs:1,adminPts:2,collCount:8,collPts:18,cvsaPts:22,violOcc:16,totalEvents:80,brakes:24.5,lighting:18.3,vehStd:15.2,driverQual:8.4,tires:12.8,cargo:9.6,hos:7.2,dangerous:4.0},
  { date:'2025-03-31',label:"MAR '25",reportStart:'2024 MAR 01',reportEnd:'2025 FEB 28',rFactor:0.328,monitoringStage:0,industryAvg:0.249,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:39,avgFleet:39.3,convPct:29.8,adminPct:1.8,cvsaPct:37.5,colPct:30.9,totalInsp:49,passed:39,requiresAttn:7,oosCount:3,overallOOS:6.1,vehicleOOS:4.5,driverOOS:1.6,l1:26,l2:13,l3:6,l4:3,l5:1,l6:0,convDocs:4,convOcc:7,convPts:11,adminDocs:1,adminPts:2,collCount:8,collPts:17,cvsaPts:21,violOcc:15,totalEvents:76,brakes:23.8,lighting:18.7,vehStd:14.9,driverQual:8.6,tires:13.1,cargo:9.4,hos:7.5,dangerous:4.0},
  { date:'2025-04-30',label:"APR '25",reportStart:'2024 APR 01',reportEnd:'2025 MAR 31',rFactor:0.315,monitoringStage:0,industryAvg:0.247,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:39.4,convPct:31.2,adminPct:1.5,cvsaPct:36.8,colPct:30.5,totalInsp:48,passed:38,requiresAttn:7,oosCount:3,overallOOS:6.3,vehicleOOS:4.6,driverOOS:1.7,l1:25,l2:13,l3:6,l4:3,l5:1,l6:0,convDocs:4,convOcc:7,convPts:10,adminDocs:1,adminPts:1,collCount:7,collPts:16,cvsaPts:21,violOcc:14,totalEvents:73,brakes:23.2,lighting:18.5,vehStd:15.1,driverQual:8.8,tires:13.0,cargo:9.7,hos:7.6,dangerous:4.1},
  { date:'2025-05-31',label:"MAY '25",reportStart:'2024 MAY 01',reportEnd:'2025 APR 30',rFactor:0.302,monitoringStage:0,industryAvg:0.245,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:39.6,convPct:32.1,adminPct:0.8,cvsaPct:35.4,colPct:31.7,totalInsp:47,passed:37,requiresAttn:7,oosCount:3,overallOOS:6.4,vehicleOOS:4.6,driverOOS:1.8,l1:25,l2:12,l3:6,l4:3,l5:1,l6:0,convDocs:3,convOcc:7,convPts:10,adminDocs:0,adminPts:1,collCount:7,collPts:16,cvsaPts:20,violOcc:14,totalEvents:70,brakes:22.8,lighting:18.9,vehStd:15.0,driverQual:9.0,tires:13.2,cargo:9.5,hos:7.6,dangerous:4.0},
  { date:'2025-06-30',label:"JUN '25",reportStart:'2024 JUN 01',reportEnd:'2025 MAY 31',rFactor:0.289,monitoringStage:0,industryAvg:0.243,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:41,avgFleet:39.8,convPct:33.0,adminPct:0.5,cvsaPct:34.2,colPct:32.3,totalInsp:46,passed:37,requiresAttn:6,oosCount:3,overallOOS:6.5,vehicleOOS:4.7,driverOOS:1.8,l1:24,l2:12,l3:5,l4:3,l5:1,l6:0,convDocs:3,convOcc:6,convPts:9,adminDocs:0,adminPts:1,collCount:7,collPts:15,cvsaPts:20,violOcc:13,totalEvents:68,brakes:22.5,lighting:19.0,vehStd:15.3,driverQual:9.1,tires:13.3,cargo:9.3,hos:7.5,dangerous:4.0},
  { date:'2025-07-31',label:"JUL '25",reportStart:'2024 JUL 01',reportEnd:'2025 JUN 30',rFactor:0.274,monitoringStage:0,industryAvg:0.241,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:41,avgFleet:40.0,convPct:33.8,adminPct:0.0,cvsaPct:33.5,colPct:32.7,totalInsp:45,passed:36,requiresAttn:6,oosCount:3,overallOOS:6.7,vehicleOOS:4.8,driverOOS:1.9,l1:24,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:6,convPts:9,adminDocs:0,adminPts:0,collCount:6,collPts:14,cvsaPts:19,violOcc:13,totalEvents:65,brakes:22.1,lighting:19.2,vehStd:15.1,driverQual:9.3,tires:13.4,cargo:9.2,hos:7.7,dangerous:4.0},
  { date:'2025-08-31',label:"AUG '25",reportStart:'2024 AUG 01',reportEnd:'2025 JUL 31',rFactor:0.261,monitoringStage:0,industryAvg:0.242,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:40.1,convPct:34.1,adminPct:0.0,cvsaPct:33.1,colPct:32.8,totalInsp:44,passed:36,requiresAttn:6,oosCount:2,overallOOS:4.5,vehicleOOS:3.2,driverOOS:1.3,l1:23,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:6,convPts:9,adminDocs:0,adminPts:0,collCount:6,collPts:14,cvsaPts:19,violOcc:13,totalEvents:63,brakes:21.8,lighting:19.4,vehStd:15.2,driverQual:9.2,tires:13.5,cargo:9.1,hos:7.8,dangerous:4.0},
  { date:'2025-09-30',label:"SEP '25",reportStart:'2024 SEP 01',reportEnd:'2025 AUG 31',rFactor:0.249,monitoringStage:0,industryAvg:0.240,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:40.1,convPct:34.3,adminPct:0.0,cvsaPct:32.8,colPct:32.9,totalInsp:44,passed:36,requiresAttn:6,oosCount:2,overallOOS:4.5,vehicleOOS:3.2,driverOOS:1.3,l1:23,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:5,convPts:8,adminDocs:0,adminPts:0,collCount:6,collPts:13,cvsaPts:18,violOcc:12,totalEvents:62,brakes:21.5,lighting:19.5,vehStd:15.3,driverQual:9.3,tires:13.3,cargo:9.3,hos:7.8,dangerous:4.0},
  { date:'2025-10-31',label:"OCT '25",reportStart:'2024 OCT 01',reportEnd:'2025 SEP 30',rFactor:0.236,monitoringStage:0,industryAvg:0.240,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:40.2,convPct:34.4,adminPct:0.0,cvsaPct:32.5,colPct:33.1,totalInsp:44,passed:36,requiresAttn:6,oosCount:2,overallOOS:4.5,vehicleOOS:3.2,driverOOS:1.3,l1:23,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:5,convPts:8,adminDocs:0,adminPts:0,collCount:6,collPts:13,cvsaPts:18,violOcc:12,totalEvents:62,brakes:21.3,lighting:19.5,vehStd:15.4,driverQual:9.4,tires:13.4,cargo:9.2,hos:7.8,dangerous:4.0},
  { date:'2025-11-30',label:"NOV '25",reportStart:'2024 NOV 01',reportEnd:'2025 OCT 31',rFactor:0.222,monitoringStage:0,industryAvg:0.239,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:40.1,convPct:34.5,adminPct:0.0,cvsaPct:32.4,colPct:33.1,totalInsp:43,passed:35,requiresAttn:6,oosCount:2,overallOOS:4.7,vehicleOOS:3.4,driverOOS:1.3,l1:22,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:5,convPts:8,adminDocs:0,adminPts:0,collCount:6,collPts:12,cvsaPts:18,violOcc:12,totalEvents:61,brakes:21.0,lighting:19.6,vehStd:15.5,driverQual:9.4,tires:13.5,cargo:9.1,hos:7.9,dangerous:4.0},
  { date:'2025-12-31',label:"DEC '25",reportStart:'2024 DEC 01',reportEnd:'2025 NOV 30',rFactor:0.211,monitoringStage:0,industryAvg:0.239,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:40.0,convPct:34.6,adminPct:0.0,cvsaPct:32.3,colPct:33.1,totalInsp:43,passed:35,requiresAttn:6,oosCount:2,overallOOS:4.7,vehicleOOS:3.4,driverOOS:1.3,l1:22,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:5,convPts:8,adminDocs:0,adminPts:0,collCount:6,collPts:12,cvsaPts:18,violOcc:12,totalEvents:61,brakes:20.8,lighting:19.7,vehStd:15.4,driverQual:9.5,tires:13.5,cargo:9.1,hos:7.9,dangerous:4.1},
  { date:'2026-01-31',label:"JAN '26",reportStart:'2025 JAN 01',reportEnd:'2025 DEC 31',rFactor:0.185,monitoringStage:0,industryAvg:0.241,stage1:0.550,stage2:0.700,stage3:0.850,stage4:1.050,fleetRange:'26-50',fleetType:'For-Hire',currentFleet:40,avgFleet:40.0,convPct:34.6,adminPct:0.0,cvsaPct:32.3,colPct:33.1,totalInsp:43,passed:35,requiresAttn:6,oosCount:2,overallOOS:4.7,vehicleOOS:3.4,driverOOS:1.3,l1:22,l2:12,l3:5,l4:2,l5:1,l6:0,convDocs:3,convOcc:5,convPts:8,adminDocs:0,adminPts:0,collCount:6,collPts:12,cvsaPts:18,violOcc:12,totalEvents:60,brakes:20.5,lighting:19.8,vehStd:15.3,driverQual:9.6,tires:13.6,cargo:9.0,hos:7.8,dangerous:4.3},
];

// ─── Static helpers ─────────────────────────────────────────────────────────────

const stageColor = (s: number) =>
  s === 0 ? '#16a34a' : s === 1 ? '#b45309' : s === 2 ? '#d97706' : s === 3 ? '#dc2626' : '#7f1d1d';

const stageLabel = (s: number) =>
  s === 0 ? 'Not Monitored' : `Stage ${s}`;

function niceYRange(vals: number[], padFrac = 0.12): [number, number, number[]] {
  const dMin = Math.min(...vals);
  const dMax = Math.max(...vals);
  const range = dMax - dMin || dMax * 0.2 || 1;
  const lo = Math.max(0, dMin - range * padFrac);
  const hi = dMax + range * padFrac * 2;
  const rawStep = (hi - lo) / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = Math.ceil(rawStep / mag) * mag;
  const start = Math.floor(lo / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= hi + step * 0.01; t = +(t + step).toFixed(8)) {
    if (t >= lo - step * 0.01) ticks.push(+t.toFixed(5));
    if (ticks.length > 8) break;
  }
  return [lo, hi, ticks];
}

type TimeFilter = '3M' | '6M' | '12M' | '24M' | 'ALL';
const TIME_FILTERS: TimeFilter[] = ['3M', '6M', '12M', '24M', 'ALL'];


// ─── InspListPanel: renders defect summary + level breakdown + inspection list ──

interface InspRow {
  idx: number; date: string; doc: string; jur: string; agency: string;
  plate: string; level: number; result: string;
  // expanded detail fields
  time: string; dateEntered: string; location: string; driver: string;
  vehicles: { type: string; plate: string; jur: string; vin: string; year: string; make: string; decal: string }[];
  oosDefects: { desc: string; counts: number[] }[];
  reqDefects: { desc: string; counts: number[] }[];
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Level 1', 2: 'Level 2', 3: 'Level 3', 4: 'Level 4', 5: 'Level 5', 6: 'Level 6',
};

function InspListPanel({
  snap,
  cvsaDefectRows,
  totalOos,
  totalReq,
  totalDef,
  cvsaLevelRows,
  inspRows,
}: {
  snap: NscSnapshot;
  cvsaDefectRows: { desc: string; oos: number; req: number }[];
  totalOos: number;
  totalReq: number;
  totalDef: number;
  cvsaLevelRows: { label: string; count: number }[];
  inspRows: InspRow[];
}) {
  const [inspPage, setInspPage] = useState(1);
  const [inspPerPage, setInspPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(inspRows.length / inspPerPage));
  const pagedInsp = inspRows.slice((inspPage - 1) * inspPerPage, inspPage * inspPerPage);

  const resultBadge = (r: string) =>
    r === 'Out Of Service' ? 'bg-red-100 text-red-700 border-red-200' :
    r === 'Requires Attention' ? 'bg-amber-100 text-amber-700 border-amber-200' :
    'bg-emerald-100 text-emerald-700 border-emerald-200';

  const COL_COUNT = 9; // 8 data cols + 1 chevron

  // KPI counts
  const kpiPassed = inspRows.filter(r => r.result === 'Passed').length;
  const kpiReqAttn = inspRows.filter(r => r.result === 'Requires Attention').length;
  const kpiOos = inspRows.filter(r => r.result === 'Out Of Service').length;

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-center">
          <div className="text-2xl font-black text-emerald-700">{kpiPassed}</div>
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">Passed</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-center">
          <div className="text-2xl font-black text-amber-700">{kpiReqAttn}</div>
          <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Required Attention</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-center">
          <div className="text-2xl font-black text-red-700">{kpiOos}</div>
          <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mt-0.5">Out of Service</div>
        </div>
      </div>

      {/* ── CVSA Defect Summary ── */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">CVSA Defect Summary</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-center">Number of Out of Service</th>
                <th className="px-4 py-3 font-medium text-center">Defects Requires Attention</th>
                <th className="px-4 py-3 font-medium text-center">Total Defects</th>
                <th className="px-4 py-3 font-medium text-right">Percent of Total</th>
                <th className="px-4 py-3 font-medium text-left">Defect Category / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cvsaDefectRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className={`px-4 py-2 text-center ${row.oos > 0 ? 'font-bold text-red-600' : 'text-slate-300'}`}>{row.oos > 0 ? row.oos : '-'}</td>
                  <td className={`px-4 py-2 text-center ${row.req > 0 ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.req > 0 ? row.req : '-'}</td>
                  <td className={`px-4 py-2 text-center ${(row.oos + row.req) > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.oos + row.req}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-600">{(((row.oos + row.req) / totalDef) * 100).toFixed(1)}%</td>
                  <td className={`px-4 py-2 text-left ${(row.oos + row.req) > 0 ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{row.desc}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200 text-xs">
                <td className="px-4 py-3 text-center text-red-700">{totalOos}</td>
                <td className="px-4 py-3 text-center text-amber-700">{totalReq}</td>
                <td className="px-4 py-3 text-center">{totalOos + totalReq}</td>
                <td className="px-4 py-3 text-right">100%</td>
                <td className="px-4 py-3 text-left uppercase">Grand Total Defects</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Inspection Level Breakdown ── */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Inspection Level Breakdown</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-left">Inspection Level</th>
                <th className="px-4 py-3 font-medium text-center">Count</th>
                <th className="px-4 py-3 font-medium text-center">OOS</th>
                <th className="px-4 py-3 font-medium text-center">Pass</th>
                <th className="px-4 py-3 font-medium text-right">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cvsaLevelRows.map((row) => (
                <tr key={row.label} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{row.count}</td>
                  <td className="px-4 py-3 text-center font-bold text-red-600">{Math.round(row.count * (snap.oosCount / snap.totalInsp))}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-600">{Math.round(row.count * (snap.passed / snap.totalInsp))}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                    {snap.totalInsp > 0 ? ((row.count / snap.totalInsp) * 100).toFixed(1) : '0.0'}%
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="px-4 py-3 uppercase tracking-wide">Total Inspections</td>
                <td className="px-4 py-3 text-center">{snap.totalInsp}</td>
                <td className="px-4 py-3 text-center text-red-700">{snap.oosCount}</td>
                <td className="px-4 py-3 text-center text-emerald-700">{snap.passed}</td>
                <td className="px-4 py-3 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Inspection List ── */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Inspection List</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-center">Inspection</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">CVSA Document</th>
                <th className="px-4 py-3 font-medium text-center">Jur</th>
                <th className="px-4 py-3 font-medium text-center">Agency</th>
                <th className="px-4 py-3 font-medium">Plate</th>
                <th className="px-4 py-3 font-medium text-center">Level</th>
                <th className="px-4 py-3 font-medium text-right">Result</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pagedInsp.map((row) => {
                const isExpanded = expandedRow === row.idx;
                return (
                  <>{/* Fragment for row + expanded detail */}
                    <tr
                      key={row.idx}
                      onClick={() => setExpandedRow(isExpanded ? null : row.idx)}
                      className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{row.idx}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.doc}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{row.jur}</span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500">{row.agency}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{row.plate}</td>
                      <td className="px-4 py-3 text-center font-bold text-slate-700">{row.level}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${resultBadge(row.result)}`}>
                          {row.result}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-400">
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>

                    {/* ── Expanded detail panel ── */}
                    {isExpanded && (
                      <tr key={`${row.idx}-detail`}>
                        <td colSpan={COL_COUNT} className="p-0">
                          <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-5 space-y-5">

                            {/* Row 1: Inspection metadata */}
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Inspection Date</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.date}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.time}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Document / Jur</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.doc}</div>
                                <div className="text-[10px] text-slate-500">{row.jur}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Level / Result</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{LEVEL_LABELS[row.level] ?? `Level ${row.level}`}</div>
                                <div className="text-[10px] text-slate-500">{row.result}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date Entered</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.dateEntered}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Agency</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.agency}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.location}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Driver</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{row.driver}</div>
                              </div>
                            </div>

                            {/* Vehicles table */}
                            {row.vehicles.length > 0 && (
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">Vehicles</div>
                                <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                                  <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                                        <th className="px-4 py-2 font-medium">Type</th>
                                        <th className="px-4 py-2 font-medium">Plate</th>
                                        <th className="px-4 py-2 font-medium text-center">Jur</th>
                                        <th className="px-4 py-2 font-medium">VIN</th>
                                        <th className="px-4 py-2 font-medium text-center">Year</th>
                                        <th className="px-4 py-2 font-medium">Make</th>
                                        <th className="px-4 py-2 font-medium text-center">CVSA Decal #</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.vehicles.map((v, vi) => (
                                        <tr key={vi} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-2 font-bold text-slate-700">{v.type}</td>
                                          <td className="px-4 py-2 font-medium text-slate-800">{v.plate}</td>
                                          <td className="px-4 py-2 text-center text-slate-600">{v.jur}</td>
                                          <td className="px-4 py-2 font-mono text-slate-600 text-[11px]">{v.vin}</td>
                                          <td className="px-4 py-2 text-center text-slate-600">{v.year}</td>
                                          <td className="px-4 py-2 text-slate-800">{v.make}</td>
                                          <td className="px-4 py-2 text-center text-slate-500">{v.decal}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* OOS Defects */}
                            {row.oosDefects.length > 0 && (
                              <div className="rounded-lg border border-red-200 bg-red-50/30 overflow-hidden">
                                <div className="px-4 py-2.5">
                                  <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Out of Service</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Number of out of service defects by vehicle</div>
                                </div>
                                <div className="bg-white border-t border-red-200 overflow-x-auto">
                                  <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                                        <th className="px-4 py-2 font-medium text-left">Defect Category / Description</th>
                                        {row.vehicles.map((_, vi) => (
                                          <th key={vi} className="px-3 py-2 font-medium text-center">{vi + 1}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.oosDefects.map((d, di) => (
                                        <tr key={di} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-2 font-medium text-slate-800">{d.desc}</td>
                                          {d.counts.map((c, ci) => (
                                            <td key={ci} className={`px-3 py-2 text-center ${c > 0 ? 'font-bold text-red-700' : 'text-slate-300'}`}>
                                              {c > 0 ? c : '-'}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* Requires Attention Defects */}
                            {row.reqDefects.length > 0 && (
                              <div className="rounded-lg border border-amber-200 bg-amber-50/30 overflow-hidden">
                                <div className="px-4 py-2.5">
                                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Requires Attention</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Number of requires attention defects by vehicle</div>
                                </div>
                                <div className="bg-white border-t border-amber-200 overflow-x-auto">
                                  <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                                        <th className="px-4 py-2 font-medium text-left">Defect Category / Description</th>
                                        {row.vehicles.map((_, vi) => (
                                          <th key={vi} className="px-3 py-2 font-medium text-center">{vi + 1}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {row.reqDefects.map((d, di) => (
                                        <tr key={di} className="hover:bg-slate-50 transition-colors">
                                          <td className="px-4 py-2 font-medium text-slate-800">{d.desc}</td>
                                          {d.counts.map((c, ci) => (
                                            <td key={ci} className={`px-3 py-2 text-center ${c > 0 ? 'font-bold text-amber-700' : 'text-slate-300'}`}>
                                              {c > 0 ? c : '-'}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {/* No defects message for Passed */}
                            {row.oosDefects.length === 0 && row.reqDefects.length === 0 && (
                              <div className="text-center py-3 text-xs text-emerald-600 font-medium bg-emerald-50/30 border border-emerald-100 rounded-lg">
                                No defects recorded — inspection passed
                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{(inspPage - 1) * inspPerPage + 1}-{Math.min(inspPage * inspPerPage, inspRows.length)} of {inspRows.length}</span>
            <span>Rows:</span>
            <select
              value={inspPerPage}
              onChange={e => { setInspPerPage(+e.target.value); setInspPage(1); }}
              className="border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 bg-white"
            >
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={inspPage <= 1}
              onClick={() => setInspPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >&lt;</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - inspPage) <= 1)
              .map((p, _, arr) => {
                const prev = arr[arr.indexOf(p) - 1];
                const gap = prev !== undefined && p - prev > 1;
                return (
                  <span key={p} className="inline-flex items-center gap-1">
                    {gap && <span className="text-slate-400 px-1">…</span>}
                    <button
                      onClick={() => setInspPage(p)}
                      className={`min-w-[28px] px-1.5 py-1 text-xs rounded border ${p === inspPage ? 'border-blue-400 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >{p}</button>
                  </span>
                );
              })}
            <button
              disabled={inspPage >= totalPages}
              onClick={() => setInspPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CollisionPanel: renders collision totals + summary list + expandable detail ──

interface CollisionRecord {
  idx: number; date: string; time: string; doc: string; jur: string;
  plate: string; status: string; result: string; severity: string;
  points: string; driver: string; driverLic: string;
  location: string; vin: string; dateEntered: string;
}

const COLLISION_RECORDS: CollisionRecord[] = [
  { idx: 1, date: '2025 JAN 22', time: '00:00', doc: '51512747', jur: 'ON', plate: 'A18998 AB', status: 'Not Reviewed', result: 'Damage', severity: 'Damage', points: '', driver: 'JAGDEEP SINGH', driverLic: 'J01330000911103 ON', location: 'ALNWICK/HALDIMAND, 401', vin: '4V4NC9EH6NN286922', dateEntered: '2025 AUG 12' },
  { idx: 2, date: '2022 FEB 22', time: '00:00', doc: '22472661', jur: 'ON', plate: 'A03382 AB', status: 'Not Reviewed', result: 'Damage', severity: 'Damage', points: '', driver: 'SINGH SANDEEP', driverLic: 'S44906890890629 ON', location: 'NIPISSING, 11', vin: '4V4NC9EH7JN890490', dateEntered: '2025 JUL 15' },
  { idx: 3, date: '2021 JAN 19', time: '00:00', doc: 'NYSP40067200', jur: 'NY', plate: 'U73092 AB', status: 'Not Reviewed', result: 'Damage', severity: 'Damage Towable', points: '', driver: 'Sharanjit Singh', driverLic: '169984-713 AB', location: 'Ref Marker:', vin: '4V4NC9EH7JN890490', dateEntered: '2025 SEP 23' },
];

function CollisionPanel({ snap }: { snap: NscSnapshot }) {
  const [expandedColl, setExpandedColl] = useState<number | null>(null);

  return (
    <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">

      {/* Profile Period */}
      <div className="flex items-center gap-6 text-xs text-slate-500">
        <div><span className="font-bold text-slate-600 uppercase tracking-wider">Profile Period Start:</span> <span className="font-bold text-slate-800 ml-1">{snap.reportStart}</span></div>
        <div><span className="font-bold text-slate-600 uppercase tracking-wider">Profile Period End:</span> <span className="font-bold text-slate-800 ml-1">{snap.reportEnd}</span></div>
      </div>

      {/* ── Collision Totals ── */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Collisions Not Reviewed</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-left">Severity</th>
                <th className="px-4 py-3 font-medium text-center">Number Of</th>
                <th className="px-4 py-3 font-medium text-center">Supported</th>
                <th className="px-4 py-3 font-medium text-center">Not Supported / Active</th>
                <th className="px-4 py-3 font-medium text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">Property Damage</td>
                <td className="px-4 py-3 text-center font-bold text-slate-700">3</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-center font-bold text-slate-700">3</td>
                <td className="px-4 py-3 text-right text-slate-300">0</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-400">Injury</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-right text-slate-300">0</td>
              </tr>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-400">Fatal</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-center text-slate-300">0</td>
                <td className="px-4 py-3 text-right text-slate-300">0</td>
              </tr>
              <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                <td className="px-4 py-3 uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-center">3</td>
                <td className="px-4 py-3 text-center">0</td>
                <td className="px-4 py-3 text-center">3</td>
                <td className="px-4 py-3 text-right">0</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Collision Summary List ── */}
      <div>
        <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Collision Summary</h5>
        <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                <th className="px-4 py-3 font-medium text-center">Collision</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium text-center">Jur</th>
                <th className="px-4 py-3 font-medium">Plate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium text-right">Points</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {COLLISION_RECORDS.map((rec) => {
                const isExp = expandedColl === rec.idx;
                return (
                  <React.Fragment key={rec.idx}>
                    <tr
                      onClick={() => setExpandedColl(isExp ? null : rec.idx)}
                      className={`cursor-pointer transition-colors ${isExp ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3 text-center font-bold text-slate-500">{rec.idx}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{rec.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{rec.doc}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{rec.jur}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{rec.plate}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{rec.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700">{rec.result}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase ${rec.severity.includes('Towable') ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{rec.severity}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-500">{rec.points || '—'}</td>
                      <td className="px-3 py-3 text-center text-slate-400">
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExp ? 'rotate-180' : ''}`} />
                      </td>
                    </tr>

                    {/* Expanded collision detail */}
                    {isExp && (
                      <tr>
                        <td colSpan={10} className="p-0">
                          <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-5 space-y-4">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Collision Detail</div>
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Collision Date</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.date}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Time</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.time}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Document / Jur</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.doc}</div>
                                <div className="text-[10px] text-slate-500">{rec.jur}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Plate</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.plate}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Severity</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.severity}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assessment / Active Points</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.status}</div>
                                <div className="text-[10px] text-slate-500">{rec.points || 'No points'}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Driver</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.driver}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{rec.driverLic}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Location</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.location}</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vehicle VIN</div>
                                <div className="text-sm font-bold text-slate-900 mt-1 font-mono">{rec.vin}</div>
                              </div>
                              <div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Date Entered</div>
                                <div className="text-sm font-bold text-slate-900 mt-1">{rec.dateEntered}</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}


// ─── Per-snapshot NSC Analysis accordion ──────────────────────────────────────

function NscSnapshotAnalysis({ snap }: { snap: NscSnapshot }) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggle = (id: string) => setOpenSection(p => p === id ? null : id);

  // ── Derived data ────────────────────────────────────────────────────────────

  const badgeTone = (pct: number) =>
    pct > 40 ? 'bg-red-100 text-red-700' : pct > 20 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  const badgeLabel = (pct: number) => pct > 40 ? 'ELEVATED' : pct > 20 ? 'WATCH' : 'OK';

  // Conviction summary groups (derived proportionally from convOcc)
  const convSummaryRows = [
    { group: 'Speeding',                                                          count: 0 },
    { group: 'Stop signs/Traffic lights',                                         count: 0 },
    { group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)',         count: Math.round(snap.convOcc * 0.40) },
    { group: 'Driving (Passing, Disobey Signs, Signals, etc.)',                   count: Math.round(snap.convOcc * 0.20) },
    { group: 'Hours of Service',                                                  count: 0 },
    { group: 'Trip Inspections',                                                  count: 0 },
    { group: 'Brakes',                                                            count: 0 },
    { group: 'CVIP',                                                              count: Math.round(snap.convOcc * 0.40) },
    { group: 'Mechanical Defects',                                                count: 0 },
    { group: 'Oversize/Overweight',                                               count: 0 },
    { group: 'Security of Loads',                                                 count: 0 },
    { group: 'Dangerous Goods',                                                   count: 0 },
    { group: 'Criminal Code',                                                     count: 0 },
    { group: 'Permits',                                                           count: 0 },
    { group: 'Miscellaneous',                                                     count: 0 },
    { group: 'Administrative Actions',                                            count: 0 },
  ];
  const convTotal = convSummaryRows.reduce((s, r) => s + r.count, 0) || 1;

  // CVSA defect summary — all 20 CVSA categories
  const oosF = snap.oosCount / 10;   // scale factor based on snapshot OOS count
  const reqF = snap.requiresAttn / 14; // scale factor based on snapshot req attn count
  const cvsaDefectRows = [
    { desc: '1 - Driver Credentials',                         oos: 0,                              req: Math.round(13 * reqF) },
    { desc: '2 - Hours Of Service',                           oos: Math.round(1 * oosF),           req: Math.round(6 * reqF) },
    { desc: '3 - Brake Adjustment',                           oos: 0,                              req: 0 },
    { desc: '4 - Brake Systems',                              oos: Math.round(4 * oosF),           req: Math.round(4 * reqF) },
    { desc: '5 - Coupling Devices',                           oos: 0,                              req: 0 },
    { desc: '6 - Exhaust Systems',                            oos: 0,                              req: 0 },
    { desc: '7 - Frames',                                     oos: 0,                              req: 0 },
    { desc: '8 - Fuel Systems',                               oos: 0,                              req: 0 },
    { desc: '9 - Lighting Devices (Part II Section 9 only)',  oos: 0,                              req: Math.round(5 * reqF) },
    { desc: '10 - Cargo Securement',                          oos: 0,                              req: 0 },
    { desc: '11 - Steering Mechanisms',                       oos: 0,                              req: 0 },
    { desc: '12 - Suspensions',                               oos: 0,                              req: 0 },
    { desc: '13 - Tires',                                     oos: Math.round(1 * oosF),           req: Math.round(1 * reqF) },
    { desc: '14 - Van/Open-top Trailer Bodies',               oos: 0,                              req: Math.round(1 * reqF) },
    { desc: '15 - Wheels, Rims & Hubs',                       oos: Math.round(1 * oosF),           req: 0 },
    { desc: '16 - Windshield Wipers',                         oos: 0,                              req: 0 },
    { desc: '17 - Emergency Exits/Electrical System/Seating (Buses)', oos: 0,                      req: 0 },
    { desc: '18 - Dangerous Goods',                           oos: Math.round(1 * oosF),           req: 0 },
    { desc: '19 - Driveline/Driveshaft',                      oos: 0,                              req: 0 },
    { desc: '20 - Driver\'s Seat (Missing)',                   oos: 0,                              req: 0 },
  ];
  const totalOos = cvsaDefectRows.reduce((s, r) => s + r.oos, 0) || 1;
  const totalReq = cvsaDefectRows.reduce((s, r) => s + r.req, 0);
  const totalDef = cvsaDefectRows.reduce((s, r) => s + r.oos + r.req, 0) || 1;

  // CVSA level rows
  const cvsaLevelRows = [
    { label: 'Level I — North American Standard Full Inspection', count: snap.l1 },
    { label: 'Level II — Walk-Around Driver/Vehicle Inspection',  count: snap.l2 },
    { label: 'Level III — Driver-Only Inspection',                count: snap.l3 },
    { label: 'Level IV — Special Study Inspection',               count: snap.l4 },
    { label: 'Level V — Vehicle-Only Inspection',                 count: snap.l5 },
    { label: 'Level VI — Enhanced NAS Inspection',                count: snap.l6 },
  ].filter(r => r.count > 0);

  // Collision summary by severity
  const dmgCount   = Math.ceil(snap.collCount * 0.67);
  const injCount   = snap.collCount - dmgCount;

  // Violation summary table rows (category → group mapping)
  const violSummaryRows = [
    { group: 'Brake Systems',          count: Math.round(snap.violOcc * snap.brakes / 100) },
    { group: 'Lighting Devices',       count: Math.round(snap.violOcc * snap.lighting / 100) },
    { group: 'Vehicle Standards',      count: Math.round(snap.violOcc * snap.vehStd / 100) },
    { group: 'Driver Qualification',   count: Math.round(snap.violOcc * snap.driverQual / 100) },
    { group: 'Tires',                  count: Math.round(snap.violOcc * snap.tires / 100) },
    { group: 'Cargo Securement',       count: Math.round(snap.violOcc * snap.cargo / 100) },
    { group: 'Hours of Service',       count: Math.round(snap.violOcc * snap.hos / 100) },
    { group: 'Dangerous Goods',        count: Math.round(snap.violOcc * snap.dangerous / 100) },
  ].filter(r => r.count > 0);
  const violTotal = violSummaryRows.reduce((s, r) => s + r.count, 0) || 1;

  // Monitoring trend rows (single snapshot)
  const monTrendRow = {
    monthEnd: snap.label,
    fleetType: snap.fleetType,
    currentFleet: snap.currentFleet,
    avgFleet: snap.avgFleet,
    rFactor: snap.rFactor,
    stage: snap.monitoringStage > 0 ? `Stage ${snap.monitoringStage}` : undefined,
    convPct: snap.convPct,
    adminPct: snap.adminPct,
    colPct: snap.colPct,
    cvsaPct: snap.cvsaPct,
    oosOverall: snap.overallOOS,
    oosVehicle: snap.vehicleOOS,
    oosDriver: snap.driverOOS,
  };

  // Historical rows derived from snapshot
  const histRows = [
    { date: snap.reportEnd, type: 'Monitoring', jur: 'AB', description: `Fleet: ${snap.fleetType}, Avg fleet: ${snap.avgFleet.toFixed(1)}; R-Factor: ${snap.rFactor.toFixed(3)}${monTrendRow.stage ? `; Stage: ${monTrendRow.stage}` : ''}` },
    ...Array.from({ length: snap.totalInsp }, (_, i) => ({
      date: snap.reportEnd, type: 'CVSA', jur: 'AB',
      description: `Inspection ${i + 1}; Result: ${i < snap.passed ? 'Passed' : i < snap.passed + snap.requiresAttn ? 'Requires Attention' : 'Out Of Service'}; Window: ${snap.reportStart}–${snap.reportEnd}`,
    })).slice(0, 5),
    ...Array.from({ length: snap.collCount }, (_, i) => ({
      date: snap.reportEnd, type: 'Collision', jur: 'AB',
      description: `Collision ${i + 1}; Severity: ${i < Math.ceil(snap.collCount * 0.67) ? 'Property Damage' : 'Injury'}; Points: ${i === 0 ? snap.collPts : 0}`,
    })),
    ...Array.from({ length: snap.convDocs }, (_, i) => ({
      date: snap.reportEnd, type: 'Conviction', jur: 'AB',
      description: `Conviction doc ${i + 1}; Occurrences: ${snap.convOcc}; Points: ${snap.convPts}`,
    })),
  ];

  // ── Section definitions ──────────────────────────────────────────────────────

  type Section = {
    id: string; title: string; subtitle: string;
    summaryLabel: string; summaryValue: string;
    badgeLabelStr?: string; badgeToneStr?: string;
  };

  const sections: Section[] = [
    {
      id: 'CONVICTION ANALYSIS',
      title: 'CONVICTION ANALYSIS',
      subtitle: `${snap.convDocs} conviction events | offence mix and detailed conviction history`,
      summaryLabel: 'Contribution',
      summaryValue: `${snap.convPct.toFixed(2)}%`,
      badgeLabelStr: badgeLabel(snap.convPct),
      badgeToneStr: badgeTone(snap.convPct),
    },
    {
      id: 'CVSA INSPECTION ANALYSIS',
      title: 'CVSA INSPECTION ANALYSIS',
      subtitle: `${snap.totalInsp} inspections | ${snap.passed} pass, ${snap.requiresAttn} req. attn, ${snap.oosCount} OOS`,
      summaryLabel: 'Contribution',
      summaryValue: `${snap.cvsaPct.toFixed(2)}%`,
      badgeLabelStr: badgeLabel(snap.cvsaPct),
      badgeToneStr: badgeTone(snap.cvsaPct),
    },
    {
      id: 'COLLISION SUMMARY',
      title: 'COLLISION SUMMARY',
      subtitle: `${snap.collCount} events | ${dmgCount} damage, ${injCount} injury`,
      summaryLabel: 'Contribution',
      summaryValue: `${snap.colPct.toFixed(2)}%`,
      badgeLabelStr: badgeLabel(snap.colPct),
      badgeToneStr: badgeTone(snap.colPct),
    },
    {
      id: 'VIOLATION ANALYSIS',
      title: 'VIOLATION ANALYSIS',
      subtitle: `${snap.violOcc} violation occurrences | grouped categories`,
      summaryLabel: 'Grouped Total',
      summaryValue: `${violTotal}`,
      badgeLabelStr: `${snap.violOcc} occurrences`,
      badgeToneStr: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'MONITORING SUMMARY',
      title: 'MONITORING SUMMARY',
      subtitle: `${snap.label} snapshot | fleet trend, stage, and inspection metrics`,
      summaryLabel: 'Latest OOS',
      summaryValue: `${snap.overallOOS.toFixed(1)}%`,
      badgeLabelStr: '12 months',
      badgeToneStr: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'SAFETY FITNESS INFORMATION',
      title: 'SAFETY FITNESS INFORMATION',
      subtitle: `Fleet: ${snap.fleetType}, ${snap.fleetRange} units | report window: ${snap.reportStart} → ${snap.reportEnd}`,
      summaryLabel: 'Fleet Size',
      summaryValue: `${snap.currentFleet}`,
      badgeLabelStr: snap.fleetType.toUpperCase(),
      badgeToneStr: 'bg-slate-100 text-slate-500',
    },
    {
      id: 'HISTORICAL SUMMARY',
      title: 'HISTORICAL SUMMARY',
      subtitle: `${histRows.length} timeline events | monitoring, CVSA, collisions, convictions`,
      summaryLabel: 'CVSA Share',
      summaryValue: `${snap.totalInsp > 0 ? ((snap.totalInsp / histRows.length) * 100).toFixed(2) : '0.00'}%`,
      badgeLabelStr: `${histRows.length} events`,
      badgeToneStr: 'bg-indigo-100 text-indigo-700',
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-slate-900">NSC Analysis</h3>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded uppercase tracking-wide">NSC</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
            R-Factor Formula
            <Info size={12} className="text-slate-400" />
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 px-2">
            {snap.reportEnd}
          </span>
        </div>
      </div>

      {/* ── Accordion sections ── */}
      <div className="p-4 space-y-2">
        {sections.map(section => {
          const isOpen = openSection === section.id;
          return (
            <div key={section.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{section.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5 normal-case tracking-normal font-normal truncate">{section.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                  <span className="text-xs text-slate-500 hidden sm:block">
                    {section.summaryLabel}: <span className="font-bold text-slate-700">{section.summaryValue}</span>
                  </span>
                  {section.badgeLabelStr && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${section.badgeToneStr}`}>
                      {section.badgeLabelStr}
                    </span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {/* ── CONVICTION ANALYSIS ── */}
              {isOpen && section.id === 'CONVICTION ANALYSIS' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Conviction Summary</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                            <th className="px-4 py-3 font-medium text-center">Number of Convictions</th>
                            <th className="px-4 py-3 font-medium text-center">Percent of Total</th>
                            <th className="px-4 py-3 font-medium text-left">Group Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {convSummaryRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className={`px-4 py-2 text-center ${row.count > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}`}>{row.count}</td>
                              <td className={`px-4 py-2 text-center ${row.count > 0 ? 'font-medium text-slate-600' : 'text-slate-400'}`}>
                                {row.count > 0 ? `${((row.count / convTotal) * 100).toFixed(1)}%` : '0.0%'}
                              </td>
                              <td className={`px-4 py-2 text-left ${row.count > 0 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{row.group}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                            <td className="px-4 py-3 text-center">{snap.convDocs}</td>
                            <td className="px-4 py-3 text-center">100%</td>
                            <td className="px-4 py-3 text-left">TOTAL CONVICTIONS</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Occurrence Details</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                            <th className="px-4 py-3 font-medium">Occurrence Date</th>
                            <th className="px-4 py-3 font-medium">Document / Docket #</th>
                            <th className="px-4 py-3 font-medium">Offence Details</th>
                            <th className="px-4 py-3 font-medium">Vehicle / Driver</th>
                            <th className="px-4 py-3 font-medium text-right">Active Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.from({ length: snap.convDocs }, (_, i) => {
                            const groups = convSummaryRows.filter(r => r.count > 0);
                            const grp = groups[i % groups.length] ?? groups[0];
                            const pts = i === 0 ? snap.convPts : 0;
                            return (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 align-top">
                                  <div className="text-slate-900 font-bold">{snap.reportEnd}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">00:00</div>
                                  <div className="text-[10px] text-slate-400 mt-1">AB</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="text-slate-800 font-medium">OPC {1000000 + i + 1}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">Docket: {1000000 + i + 1}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-[200px]">
                                      {grp?.group ?? 'CONVICTION'}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">AB</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1">CCMTA: {500 + i}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="text-slate-800 font-medium">FLEET VEHICLE AB</div>
                                  <div className="text-xs text-slate-500 mt-0.5 max-w-[150px] truncate">UNKNOWN</div>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <div className={`text-lg font-bold ${pts > 0 ? 'text-red-600' : 'text-slate-800'}`}>{pts}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {isOpen && section.id === 'CVSA INSPECTION ANALYSIS' && (() => {
                // ── Real NSC inspection records ──
                const DEFECT_CATS = ['1 - Driver Credentials','2 - Hours Of Service','3 - Brake Adjustment','4 - Brake Systems','5 - Coupling Devices','7 - Frames','9 - Lighting Devices','10 - Cargo Securement','13 - Tires','14 - Van/Open-top Trailer Bodies','15 - Wheels, Rims & Hubs','16 - Windshield Wipers'];
                const LOCATIONS = ['WHITBY TIS','BELLEVILLE WS','PRESCOTT POS','BRANTFORD WS','TRENTON WS','NIPIGON WS','LETHBRIDGE WS','RED DEER WS','CALGARY WS','EDMONTON WS','SUDBURY WS','COCHRANE WS','THUNDER BAY WS','KAPUSKASING WS'];
                const DRIVERS = ['James Sullivan S44907320001231 ON','Maria Rodriguez G43501590910421 ON','Robert Chen 179746-979 AB','Sarah Johnson J07540000010417 ON','Michael Brown S44900720920825 ON','John Smith SINGH161194016 NS','Sarah Miller L68540000000723 ON','Mike Johnson S44903080932013 ON','Elena Rodriguez G58401440820316 ON'];
                const TRAILER_MAKES = ['UTIL','VANGUARD','MANAC','STOUGHTON','WABASH','GREAT DANE'];
                const PLATE_MAKES: Record<string, string> = { '0EF605 AB':'Freightliner','0BB953 AB':'International','A89642 AB':'Mack','0DG208 AB':'Peterbilt','A45469 AB':'Freightliner','U66396 AB':'Freightliner','0DG207 AB':'Kenworth','0DG258 AB':'Volvo','A73381 AB':'Mack','0AP734 AB':'International','0DG257 AB':'Peterbilt','0AP733 AB':'Freightliner','A18998 AB':'Mack','0EF555 AB':'Kenworth','A89614 AB':'International','0EF556 AB':'Volvo','A02842 AB':'Freightliner','A61442 AB':'Peterbilt','0AP712 AB':'Freightliner','0EN161 AB':'Kenworth','0EN158 AB':'Mack','A88956 AB':'Freightliner','0BY280 AB':'International','0BY247 AB':'Volvo','0BY245 AB':'Freightliner' };

                // Seeded pseudo-random
                const seed = snap.date.split('-').reduce((s, v) => s + +v, 0);
                const pseudoRand = (i: number) => ((seed * 31 + i * 7 + 13) * 2654435761) >>> 0;

                // The 36 real inspection records
                const rawRecords: { date: string; doc: string; jur: string; plate: string; level: number; result: string }[] = [
                  { date: '2026 FEB 08', doc: 'OPI ONEA01833080', jur: 'ON', plate: '0EF605 AB', level: 2, result: 'Passed' },
                  { date: '2026 FEB 07', doc: 'OPI ONEA01833002', jur: 'ON', plate: '0BB953 AB', level: 3, result: 'Passed' },
                  { date: '2026 FEB 06', doc: 'OPI ONEA01832937', jur: 'ON', plate: 'A89642 AB', level: 2, result: 'Out Of Service' },
                  { date: '2026 FEB 05', doc: 'OPI ONEA01832657', jur: 'ON', plate: '0DG208 AB', level: 1, result: 'Out Of Service' },
                  { date: '2026 FEB 04', doc: 'OPI ONEA01832226', jur: 'ON', plate: 'A45469 AB', level: 1, result: 'Out Of Service' },
                  { date: '2026 FEB 04', doc: 'OPI 5233002437',   jur: 'VA', plate: 'U66396 AB', level: 3, result: 'Passed' },
                  { date: '2026 FEB 01', doc: 'OPI ONEA01831564', jur: 'ON', plate: '0DG207 AB', level: 1, result: 'Out Of Service' },
                  { date: '2026 JAN 31', doc: 'OPI ONEA01831431', jur: 'ON', plate: '0DG258 AB', level: 2, result: 'Passed' },
                  { date: '2026 JAN 30', doc: 'OPI ONEA01831224', jur: 'ON', plate: 'A73381 AB', level: 3, result: 'Passed' },
                  { date: '2026 JAN 29', doc: 'OPI ONEA01830763', jur: 'ON', plate: '0AP734 AB', level: 2, result: 'Requires Attention' },
                  { date: '2026 JAN 20', doc: 'OPI D507901958',   jur: 'NY', plate: '0DG208 AB', level: 3, result: 'Passed' },
                  { date: '2026 JAN 18', doc: 'OPI ONEA01828216', jur: 'ON', plate: '0DG207 AB', level: 1, result: 'Passed' },
                  { date: '2026 JAN 14', doc: 'OPI 378002018',    jur: 'SC', plate: '0DG257 AB', level: 3, result: 'Passed' },
                  { date: '2025 DEC 19', doc: 'OPI ONEA01823094', jur: 'ON', plate: '0DG257 AB', level: 2, result: 'Passed' },
                  { date: '2025 DEC 19', doc: 'OPI 6831256',      jur: 'NC', plate: '0EF555 AB', level: 3, result: 'Passed' },
                  { date: '2025 DEC 11', doc: 'OPI ONEA01820935', jur: 'ON', plate: '0AP733 AB', level: 3, result: 'Passed' },
                  { date: '2025 DEC 07', doc: 'OPI ONEA01819677', jur: 'ON', plate: 'A18998 AB', level: 1, result: 'Requires Attention' },
                  { date: '2025 DEC 04', doc: 'OPI ONEA01819064', jur: 'ON', plate: '0AP733 AB', level: 3, result: 'Passed' },
                  { date: '2025 NOV 22', doc: 'OPI ONEA01815602', jur: 'ON', plate: '0EF555 AB', level: 1, result: 'Requires Attention' },
                  { date: '2025 NOV 14', doc: 'OPI ONEA01813111', jur: 'ON', plate: 'A89614 AB', level: 2, result: 'Requires Attention' },
                  { date: '2025 NOV 10', doc: 'OPI ONEA01811095', jur: 'ON', plate: '0AP734 AB', level: 2, result: 'Out Of Service' },
                  { date: '2025 NOV 10', doc: 'OPI GRAHA01102',   jur: 'MI', plate: 'A02842 AB', level: 2, result: 'Passed' },
                  { date: '2025 NOV 06', doc: 'OPI ONEA01810176', jur: 'ON', plate: '0EF556 AB', level: 2, result: 'Passed' },
                  { date: '2025 NOV 05', doc: 'OPI C609530929',   jur: 'PA', plate: 'A61442 AB', level: 3, result: 'Passed' },
                  { date: '2025 NOV 04', doc: 'OPI 6815200',      jur: 'NC', plate: '0DG258 AB', level: 3, result: 'Passed' },
                  { date: '2025 NOV 03', doc: 'OPI SPT3041440',   jur: 'NY', plate: 'U66396 AB', level: 3, result: 'Passed' },
                  { date: '2025 OCT 27', doc: 'OPI SPT3041424',   jur: 'NY', plate: '0AP712 AB', level: 2, result: 'Passed' },
                  { date: '2025 OCT 14', doc: 'OPI ONEA01803136', jur: 'ON', plate: 'U66396 AB', level: 1, result: 'Requires Attention' },
                  { date: '2025 OCT 14', doc: 'OPI SPE3080932',   jur: 'NY', plate: '0EN161 AB', level: 2, result: 'Passed' },
                  { date: '2025 OCT 14', doc: 'OPI SPT3041351',   jur: 'NY', plate: '0EN158 AB', level: 2, result: 'Passed' },
                  { date: '2025 OCT 13', doc: 'OPI ONEA01802761', jur: 'ON', plate: 'A88956 AB', level: 2, result: 'Passed' },
                  { date: '2025 OCT 09', doc: 'OPI ONEA01801775', jur: 'ON', plate: '0BY280 AB', level: 3, result: 'Passed' },
                  { date: '2025 OCT 07', doc: 'OPI WILLD03931',   jur: 'MI', plate: 'A89614 AB', level: 2, result: 'Passed' },
                  { date: '2025 SEP 30', doc: 'OPI 5910007017',   jur: 'VA', plate: '0EF556 AB', level: 3, result: 'Passed' },
                  { date: '2025 SEP 07', doc: 'OPI ONEA01791386', jur: 'ON', plate: '0BY247 AB', level: 3, result: 'Passed' },
                  { date: '2025 SEP 02', doc: 'OPI ONEA01790175', jur: 'ON', plate: '0BY245 AB', level: 2, result: 'Requires Attention' },
                ];

                // Build full InspRow from each raw record
                const inspRows: InspRow[] = rawRecords.map((rec, i) => {
                  const r = pseudoRand(i);
                  const r2 = pseudoRand(i + 500);
                  const hours = String(r % 24).padStart(2, '0');
                  const mins = String(r2 % 60).padStart(2, '0');

                  // parse date for dateEntered
                  const months: Record<string, number> = { JAN:0, FEB:1, MAR:2, APR:3, MAY:4, JUN:5, JUL:6, AUG:7, SEP:8, OCT:9, NOV:10, DEC:11 };
                  const dp = rec.date.split(' ');
                  const dateMs = new Date(+dp[0], months[dp[1]] ?? 0, +dp[2]).getTime();
                  const ed = new Date(dateMs + 7 * 86400000);
                  const eMon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][ed.getMonth()];
                  const dateEntered = `${ed.getFullYear()} ${eMon} ${String(ed.getDate()).padStart(2, '0')}`;

                  // VIN
                  const vinChars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
                  let vin = '';
                  for (let v = 0; v < 17; v++) vin += vinChars[pseudoRand(i * 17 + v) % vinChars.length];

                  const hasTrailer = r2 % 3 !== 0;
                  const trailerPlate = `W${String(r2 % 9000 + 1000)}${String.fromCharCode(65 + r2 % 26)}`;
                  const vehicles = [
                    { type: 'P', plate: rec.plate, jur: rec.jur, vin, year: String(2018 + r % 7), make: PLATE_MAKES[rec.plate] || 'Freightliner', decal: '—' },
                    ...(hasTrailer ? [{ type: 'ST', plate: trailerPlate, jur: rec.jur, vin: '-', year: '-', make: TRAILER_MAKES[r2 % TRAILER_MAKES.length], decal: '—' }] : []),
                  ];

                  let oosDefects: { desc: string; counts: number[] }[] = [];
                  let reqDefects: { desc: string; counts: number[] }[] = [];
                  const numVeh = vehicles.length;

                  if (rec.result === 'Out Of Service') {
                    const numDef = 1 + r % 2;
                    for (let di = 0; di < numDef; di++) {
                      const defIdx = (r + di * 3) % DEFECT_CATS.length;
                      const counts = Array(numVeh).fill(0);
                      counts[0] = 1 + pseudoRand(i * 5 + di) % 2;
                      if (numVeh > 1 && pseudoRand(i * 7 + di) % 3 === 0) counts[1] = 1;
                      oosDefects.push({ desc: DEFECT_CATS[defIdx], counts });
                    }
                  }
                  if (rec.result === 'Requires Attention' || (rec.result === 'Out Of Service' && r2 % 2 === 0)) {
                    const numDef = 1 + r2 % 2;
                    for (let di = 0; di < numDef; di++) {
                      const defIdx = (r2 + di * 4) % DEFECT_CATS.length;
                      const counts = Array(numVeh).fill(0);
                      counts[0] = 1;
                      reqDefects.push({ desc: DEFECT_CATS[defIdx], counts });
                    }
                  }

                  return {
                    idx: i + 1,
                    date: rec.date,
                    doc: rec.doc,
                    jur: rec.jur,
                    agency: '—',
                    plate: rec.plate,
                    level: rec.level,
                    result: rec.result,
                    time: `${hours}:${mins}`,
                    dateEntered,
                    location: LOCATIONS[r % LOCATIONS.length],
                    driver: DRIVERS[r % DRIVERS.length],
                    vehicles,
                    oosDefects,
                    reqDefects,
                  };
                });

                return (
                <InspListPanel
                  snap={snap}
                  cvsaDefectRows={cvsaDefectRows}
                  totalOos={totalOos}
                  totalReq={totalReq}
                  totalDef={totalDef}
                  cvsaLevelRows={cvsaLevelRows}
                  inspRows={inspRows}
                />
                );
              })()}

              {/* ── COLLISION SUMMARY ── */}
              {isOpen && section.id === 'COLLISION SUMMARY' && (
                <CollisionPanel snap={snap} />
              )}




              {/* ── VIOLATION ANALYSIS ── */}
              {isOpen && section.id === 'VIOLATION ANALYSIS' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Violation Summary</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                            <th className="px-4 py-3 font-medium text-center">Number of Violations</th>
                            <th className="px-4 py-3 font-medium text-center">Percent of Total</th>
                            <th className="px-4 py-3 font-medium text-left">Group Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {violSummaryRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2 text-center font-mono font-bold text-slate-800">{row.count}</td>
                              <td className="px-4 py-2 text-center font-semibold text-slate-700">{((row.count / violTotal) * 100).toFixed(1)}%</td>
                              <td className="px-4 py-2 text-left font-medium text-slate-900">{row.group}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                            <td className="px-4 py-3 text-center font-black text-slate-900">{violTotal}</td>
                            <td className="px-4 py-3 text-center font-black text-slate-900">100%</td>
                            <td className="px-4 py-3 text-left uppercase tracking-wide">Total Violations</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MONITORING SUMMARY ── */}
              {isOpen && section.id === 'MONITORING SUMMARY' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Monitoring Trend</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                            <th className="px-4 py-3 font-medium">Month End</th>
                            <th className="px-4 py-3 font-medium text-center">Fleet Type</th>
                            <th className="px-4 py-3 font-medium text-center">Avg Fleet</th>
                            <th className="px-4 py-3 font-medium text-center">Current Fleet</th>
                            <th className="px-4 py-3 font-medium text-center">R-Factor</th>
                            <th className="px-4 py-3 font-medium text-center">Conv %</th>
                            <th className="px-4 py-3 font-medium text-center">Admin %</th>
                            <th className="px-4 py-3 font-medium text-center">Coll %</th>
                            <th className="px-4 py-3 font-medium text-center">CVSA %</th>
                            <th className="px-4 py-3 font-medium text-right">Stage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">{monTrendRow.monthEnd}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.fleetType}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.avgFleet.toFixed(1)}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.currentFleet}</td>
                            <td className="px-4 py-3 text-center font-bold" style={{ color: stageColor(snap.monitoringStage) }}>{monTrendRow.rFactor.toFixed(3)}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.convPct.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.adminPct.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.colPct.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.cvsaPct.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-right">
                              {monTrendRow.stage
                                ? <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">{monTrendRow.stage}</span>
                                : <span className="text-slate-400">—</span>}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">OOS Detail</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                            <th className="px-4 py-3 font-medium">Month End</th>
                            <th className="px-4 py-3 font-medium text-center">Avg Fleet</th>
                            <th className="px-4 py-3 font-medium text-center">Total Inspections</th>
                            <th className="px-4 py-3 font-medium text-center">OOS %</th>
                            <th className="px-4 py-3 font-medium text-center">Vehicle OOS %</th>
                            <th className="px-4 py-3 font-medium text-center">Driver OOS %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-900">{monTrendRow.monthEnd}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.avgFleet.toFixed(1)}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{snap.totalInsp}</td>
                            <td className="px-4 py-3 text-center font-bold text-red-600">{monTrendRow.oosOverall.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.oosVehicle.toFixed(1)}%</td>
                            <td className="px-4 py-3 text-center text-slate-600">{monTrendRow.oosDriver.toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SAFETY FITNESS INFORMATION ── */}
              {isOpen && section.id === 'SAFETY FITNESS INFORMATION' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Operating Profile</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                            <th className="px-4 py-3 font-medium">Field</th>
                            <th className="px-4 py-3 font-medium">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {[
                            ['Fleet Type',     snap.fleetType],
                            ['Fleet Range',    snap.fleetRange],
                            ['Current Fleet',  String(snap.currentFleet)],
                            ['Avg Fleet Size', snap.avgFleet.toFixed(1)],
                            ['Report Start',   snap.reportStart],
                            ['Report End',     snap.reportEnd],
                            ['Monitoring Stage', stageLabel(snap.monitoringStage)],
                            ['R-Factor',       snap.rFactor.toFixed(3)],
                            ['Industry Avg',   snap.industryAvg.toFixed(3)],
                          ].map(([field, value]) => (
                            <tr key={field} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-slate-500">{field}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── HISTORICAL SUMMARY ── */}
              {isOpen && section.id === 'HISTORICAL SUMMARY' && (
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Event Timeline</h5>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                            <th className="px-4 py-3 font-medium">Date</th>
                            <th className="px-4 py-3 font-medium">Type</th>
                            <th className="px-4 py-3 font-medium text-center">Jur</th>
                            <th className="px-4 py-3 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {histRows.map((row, idx) => {
                            const typeCls =
                              row.type === 'Collision'  ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              row.type === 'Conviction' ? 'bg-red-50 text-red-700 border-red-200' :
                              row.type === 'CVSA'       ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              row.type === 'Monitoring' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              'bg-slate-100 text-slate-600 border-slate-200';
                            return (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-slate-900">{row.date}</td>
                                <td className="px-4 py-2.5">
                                  <span className={`border text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${typeCls}`}>{row.type}</span>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{row.jur}</span>
                                </td>
                                <td className="px-4 py-2.5 text-slate-600 max-w-xs truncate">{row.description}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function NscMonitoringHistory({ performanceCard }: { performanceCard?: NscPerformanceCardProps }) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [hoveredPull, setHoveredPull] = useState<{ chart: string; idx: number } | null>(null);
  const [selectedPull, setSelectedPull] = useState<string | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [vw, setVw] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));

  // Pull-by-pull table state
  const [pullSearch, setPullSearch] = useState('');
  const [pullSort, setPullSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'desc' });
  const [pullPage, setPullPage] = useState(1);
  const [pullRowsPerPage, setPullRowsPerPage] = useState(10);
  const [pullColumns, setPullColumns] = useState<ColumnDef[]>([
    { id: 'date',       label: 'Snapshot Date',    visible: true },
    { id: 'window',     label: 'Report Window',     visible: true },
    { id: 'status',     label: 'Status',            visible: true },
    { id: 'rFactor',    label: 'R-Factor',          visible: true },
    { id: 'convPct',    label: 'Conv%',             visible: true },
    { id: 'cvsaPct',    label: 'CVSA%',             visible: true },
    { id: 'colPct',     label: 'Col%',              visible: true },
    { id: 'adminPct',   label: 'Admin%',            visible: true },
    { id: 'collCount',  label: '#Coll',             visible: true },
    { id: 'convDocs',   label: '#Conv Docs',        visible: true },
    { id: 'collPts',    label: 'Coll Pts',          visible: true },
    { id: 'convPts',    label: 'Conv Pts',          visible: true },
    { id: 'oosOverall', label: 'OOS Ov%',           visible: true },
    { id: 'oosVehicle', label: 'OOS Veh%',          visible: true },
    { id: 'oosDriver',  label: 'OOS Drv%',          visible: true },
    { id: 'totalInsp',  label: 'Total Insp',        visible: true },
    { id: 'fleet',      label: 'Fleet',             visible: true },
  ]);

  useEffect(() => {
    const h = () => setVw(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  // Responsive chart constants (mirrors CVOR historySize)
  const hs = useMemo(() => vw < 1100
    ? { VW: 1200, pL: 72, pR: 160, pT: 32, pB: 72, sectionPad: 'px-5 py-6', overallH: 300, midH: 240, eventH: 210, titleCls: 'text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700', legendCls: 'text-[10.5px]', axisFontSize: 12 }
    : { VW: 1800, pL: 96, pR: 200, pT: 40, pB: 82, sectionPad: 'px-8 py-7', overallH: 360, midH: 290, eventH: 250, titleCls: 'text-[13px] font-bold uppercase tracking-[0.18em] text-slate-700', legendCls: 'text-[11px]', axisFontSize: 14 },
  [vw]);

  // Filtered data
  const data = useMemo(() => {
    if (timeFilter === 'ALL' || DATA.length === 0) return DATA;
    const months = parseInt(timeFilter);
    const last = new Date(DATA[DATA.length - 1].date);
    const cutoff = new Date(last);
    cutoff.setMonth(cutoff.getMonth() - months);
    return DATA.filter(d => new Date(d.date) > cutoff);
  }, [timeFilter]);

  const { VW, pL, pR, pT, pB, sectionPad, overallH, midH, eventH, titleCls, legendCls, axisFontSize } = hs;
  const cW = VW - pL - pR;
  const n = data.length;

  const xAt = (i: number, total = n) => pL + (total > 1 ? (i / (total - 1)) * cW : cW / 2);
  const yAt = (v: number, lo: number, hi: number, H: number) => pT + H - ((v - lo) / (hi - lo || 1)) * H;

  const mkPath = (items: NscSnapshot[], get: (d: NscSnapshot) => number, lo: number, hi: number, H: number, total = items.length) =>
    items.map((d, i) => `${i === 0 ? 'M' : 'L'}${xAt(i, total).toFixed(1)},${yAt(get(d), lo, hi, H).toFixed(1)}`).join(' ');

  const mkArea = (items: NscSnapshot[], get: (d: NscSnapshot) => number, lo: number, hi: number, H: number) => {
    const line = mkPath(items, get, lo, hi, H);
    const nn = items.length;
    return `${line} L${xAt(nn - 1, nn).toFixed(1)},${(pT + H).toFixed(1)} L${xAt(0, nn).toFixed(1)},${(pT + H).toFixed(1)}Z`;
  };

  // Alert level for x-axis label coloring
  const alertLevel = (d: NscSnapshot) => {
    if (d.rFactor >= d.stage3) return 'critical';
    if (d.rFactor >= d.stage1) return 'warning';
    return 'ok';
  };

  const rFactorFill = (d: NscSnapshot) => stageColor(d.monitoringStage);

  // ── XAxis (with alert coloring, rotated labels) ──────────────────────────────
  const XAxis = ({ items, H, total }: { items: NscSnapshot[]; H: number; total?: number }) => {
    const tot = total ?? items.length;
    return (
      <>
        <line x1={pL} x2={pL + cW} y1={pT + H} y2={pT + H} stroke="#cbd5e1" strokeWidth="1"/>
        {items.map((d, i) => {
          const x = xAt(i, tot);
          const al = alertLevel(d);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={pT + H} y2={pT + H + 5} stroke="#cbd5e1" strokeWidth="1"/>
              {al !== 'ok' && (
                <line x1={x} x2={x} y1={pT} y2={pT + H}
                  stroke={al === 'critical' ? '#dc2626' : '#f59e0b'} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.3"/>
              )}
              <text x={x} y={pT + H + 24}
                textAnchor="end" fontSize={axisFontSize}
                fill={al === 'critical' ? '#dc2626' : al === 'warning' ? '#b45309' : '#334155'}
                fontWeight={al !== 'ok' ? '700' : '500'}
                fontFamily="monospace"
                transform={`rotate(-32,${x},${pT + H + 24})`}>
                {d.label}
              </text>
            </g>
          );
        })}
      </>
    );
  };

  // ── YGrid ────────────────────────────────────────────────────────────────────
  const YGrid = ({ ticks, lo, hi, H, suffix = '', dec = 3 }: { ticks: number[]; lo: number; hi: number; H: number; suffix?: string; dec?: number }) => (
    <>
      <line x1={pL} x2={pL} y1={pT} y2={pT + H} stroke="#cbd5e1" strokeWidth="1"/>
      {ticks.map(v => {
        const y = yAt(v, lo, hi, H);
        if (y < pT - 2 || y > pT + H + 2) return null;
        const label = dec === 0 ? v.toFixed(0) : v < 0.1 && dec >= 3 ? v.toFixed(3) : v.toFixed(dec);
        return (
          <g key={v}>
            <line x1={pL} x2={pL + cW} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.75"/>
            <line x1={pL - 4} x2={pL} y1={y} y2={y} stroke="#cbd5e1" strokeWidth="1"/>
            <text x={pL - 8} y={y + 4} textAnchor="end" fontSize={axisFontSize} fill="#475569" fontFamily="monospace" fontWeight="500">{label}{suffix}</text>
          </g>
        );
      })}
    </>
  );

  // ── SVG Tooltip (CVOR-style white card) ──────────────────────────────────────
  const Tip = ({ cx, cy, H, d, focusKey }: {
    cx: number; cy: number; H: number;
    d: NscSnapshot; focusKey: string;
  }) => {
    const al = alertLevel(d);
    const accentColor = al === 'critical' ? '#dc2626' : al === 'warning' ? '#f59e0b' : '#16a34a';
    const alLabel = al === 'critical' ? '⚠ Elevated' : al === 'warning' ? '⚡ Watched' : '✓ Healthy';
    const rows: { label: string; val: string; color: string; bold?: boolean }[] = [
      { label: 'R-Factor',        val: d.rFactor.toFixed(3),       color: rFactorFill(d),  bold: focusKey === 'rf' },
      { label: 'Industry Avg',    val: d.industryAvg.toFixed(3),   color: '#64748b' },
      { label: 'Stage',           val: stageLabel(d.monitoringStage), color: rFactorFill(d) },
      { label: 'Convictions',     val: `${d.convPct.toFixed(1)}%`, color: '#6366f1',  bold: focusKey === 'conv' },
      { label: 'CVSA Inspections',val: `${d.cvsaPct.toFixed(1)}%`, color: '#3b82f6',  bold: focusKey === 'cvsa' },
      { label: 'Collisions',      val: `${d.colPct.toFixed(1)}%`,  color: '#dc2626',  bold: focusKey === 'col' },
      { label: 'Admin Penalties', val: `${d.adminPct.toFixed(1)}%`,color: '#f97316',  bold: focusKey === 'adm' },
      { label: 'OOS Overall',     val: `${d.overallOOS.toFixed(1)}%`, color: d.overallOOS > 20 ? '#ef4444' : '#94a3b8', bold: focusKey === 'oos' },
      { label: 'Total Events',    val: `${d.totalEvents}`,          color: '#94a3b8' },
    ];
    const tw = vw < 640 ? 210 : vw < 1100 ? 240 : 268;
    const headerH = vw < 1100 ? 62 : 70;
    const rowH = 22;
    const footerH = 22;
    const th = headerH + rows.length * rowH + footerH;
    const onRight = cx > VW * 0.56;
    const tx = onRight ? Math.max(pL + 10, cx - tw - 18) : Math.min(cx + 18, VW - pR - tw - 10);
    const prefersAbove = cy > pT + H * 0.52;
    const tyRaw = prefersAbove ? cy - th - 16 : cy + 18;
    const ty = Math.max(pT + 8, Math.min(tyRaw, pT + H - th - 6));
    const fs = vw < 640 ? 10 : vw < 1100 ? 11 : 12;
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={tx + 5} y={ty + 7} width={tw} height={th} rx={13} fill="#0f172a" opacity="0.13"/>
        <rect x={tx} y={ty} width={tw} height={th} rx={13} fill="#ffffff"/>
        <rect x={tx} y={ty} width={tw} height={th} rx={13} fill="none" stroke={accentColor} strokeWidth="1.6" opacity="0.9"/>
        <rect x={tx + 10} y={ty + 10} width={tw - 20} height={24} rx={8} fill={accentColor} opacity="0.12"/>
        <text x={tx + 16} y={ty + 27} fontSize={vw < 1100 ? 13 : 15} fontWeight="700" fill="#0f172a" fontFamily="monospace">{d.label}</text>
        <rect x={tx + tw - 86} y={ty + 10} width={70} height={20} rx={7} fill={accentColor} opacity="0.18"/>
        <text x={tx + tw - 51} y={ty + 24} textAnchor="middle" fontSize={vw < 1100 ? 9 : 10} fontWeight="700" fill={accentColor}>{alLabel}</text>
        <text x={tx + 16} y={ty + 44} fontSize={vw < 1100 ? 9 : 10} fill="#4f46e5" fontFamily="monospace">{d.reportStart} → {d.reportEnd}</text>
        <line x1={tx + 10} x2={tx + tw - 10} y1={ty + headerH - 6} y2={ty + headerH - 6} stroke="#e2e8f0" strokeWidth="1"/>
        {rows.map((r, ri) => {
          const top = ty + headerH + ri * rowH;
          const textY = top + 12;
          return (
            <g key={ri}>
              {r.bold && <rect x={tx + 10} y={top - 2} width={tw - 20} height={16} rx={4} fill={r.color} opacity="0.08"/>}
              <text x={tx + 16} y={textY} fontSize={r.bold ? fs + 1 : fs} fill={r.bold ? '#0f172a' : '#64748b'} fontWeight={r.bold ? '700' : '500'}>{r.label}</text>
              <text x={tx + tw - 16} y={textY} textAnchor="end" fontSize={r.bold ? fs + 1 : fs} fontWeight="700" fill={r.color} fontFamily="monospace">{r.val}</text>
            </g>
          );
        })}
        <line x1={tx + 10} x2={tx + tw - 10} y1={ty + th - footerH} y2={ty + th - footerH} stroke="#e2e8f0" strokeWidth="1"/>
        <text x={tx + tw / 2} y={ty + th - 7} textAnchor="middle" fontSize={vw < 1100 ? 10 : 11} fill="#4f46e5" fontWeight="600">Click to view snapshot</text>
      </g>
    );
  };

  // ── Dot renderer (CVOR two-pass pattern) ─────────────────────────────────────
  const Dots = ({
    items, getY, getLabel, chartId, dotFill, focusKey, total, H, showTooltip = true,
  }: {
    items: NscSnapshot[]; getY: (d: NscSnapshot) => number; H: number;
    getLabel?: (d: NscSnapshot) => string;
    chartId: string; dotFill: (d: NscSnapshot) => string; focusKey: string;
    total?: number; showTooltip?: boolean;
  }) => {
    const tot = total ?? items.length;
    const dotItems = items.map((d, i) => {
      const cx = xAt(i, tot);
      const cy = getY(d);
      const fill = dotFill(d);
      const isSel = d.date === selectedPull;
      const isHov = hoveredPull?.chart === chartId && hoveredPull?.idx === i;
      const isLast = i === tot - 1;
      const al = alertLevel(d);
      return { d, i, cx, cy, fill, isSel, isHov, isLast, al };
    });
    const hoveredItem = dotItems.find(it => it.isHov) ?? null;
    return (
      <>
        {dotItems.map(({ d, i, cx, cy, fill, isSel, isHov, isLast, al }) => (
          <g key={i} style={{ cursor: 'pointer' }}
            onClick={() => { const next = isSel ? null : d.date; setSelectedPull(next); setExpandedDate(next); }}
            onMouseEnter={() => setHoveredPull({ chart: chartId, idx: i })}
            onMouseLeave={() => setHoveredPull(null)}>
            {al === 'critical' && !isSel && (
              <circle cx={cx} cy={cy} r={12} fill="#dc2626" opacity="0.15"/>
            )}
            {isSel && <circle cx={cx} cy={cy} r={14} fill="none" stroke="#6366f1" strokeWidth="2.5"/>}
            {(isLast || isHov || isSel) && (
              <circle cx={cx} cy={cy} r={11} fill={isSel ? '#6366f1' : fill} opacity="0.18"/>
            )}
            <circle cx={cx} cy={cy} r={16} fill="transparent"/>
            <circle cx={cx} cy={cy} r={isSel || isHov || isLast ? 7 : 4.5}
              fill={isSel ? '#6366f1' : fill} stroke="white" strokeWidth="2.5"
              style={{ pointerEvents: 'none' }}/>
            {(isLast || isHov || isSel) && (
              <text x={cx} y={cy - 15} textAnchor="middle" fontSize={axisFontSize} fontWeight="bold"
                fill={isSel ? '#6366f1' : fill} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                {getLabel ? getLabel(d) : d.rFactor.toFixed(3)}
              </text>
            )}
          </g>
        ))}
        {showTooltip && hoveredItem && (
          <Tip cx={hoveredItem.cx} cy={hoveredItem.cy} H={H} d={hoveredItem.d} focusKey={focusKey}/>
        )}
      </>
    );
  };

  // Derived info for header
  const firstSnap = data[0];
  const lastSnap = data[data.length - 1];
  const selSnap = selectedPull ? data.find(d => d.date === selectedPull) ?? null : null;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (data.length < 2) {
    return (
      <div className="rounded-[22px] border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow">
        Not enough data for selected time range.
      </div>
    );
  }

  return (
    <div className="space-y-6">

    {/* ── NSC Performance Analysis Card ── */}
    {performanceCard && <NscPerformanceCard {...performanceCard}/>}

    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Activity size={14} className="text-slate-400"/>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">NSC Monitoring History</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} snapshots</span>
          {firstSnap && lastSnap && (
            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
              {firstSnap.label} → {lastSnap.label}
            </span>
          )}
          <span className="text-[10px] italic text-slate-400">Rolling 12-month window per snapshot</span>
          <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1">
            {[{ c: '#16a34a', label: 'Not Monitored' }, { c: '#b45309', label: 'Stage 1' }, { c: '#d97706', label: 'Stage 2' }, { c: '#dc2626', label: 'Stage 3+' }].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ background: l.c }}/>
                <span className="text-[10px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Range</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 gap-px">
            {TIME_FILTERS.map(f => (
              <button key={f} onClick={() => setTimeFilter(f)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${timeFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Selected-pull banner ── */}
      {selSnap && (() => {
        const al = alertLevel(selSnap);
        const bg = al === 'critical' ? 'bg-red-600' : al === 'warning' ? 'bg-amber-500' : 'bg-indigo-600';
        return (
          <div className={`px-5 py-2.5 ${bg} text-white flex items-center justify-between flex-wrap gap-2`}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
              <span className="text-sm font-bold">Snapshot: {selSnap.label}</span>
              <span className="opacity-80 text-xs font-mono">{selSnap.reportStart} → {selSnap.reportEnd}</span>
              <span className="opacity-70 text-xs">R-Factor: <strong>{selSnap.rFactor.toFixed(3)}</strong></span>
              <span className="opacity-70 text-xs">{stageLabel(selSnap.monitoringStage)}</span>
            </div>
            <button onClick={() => { setSelectedPull(null); setExpandedDate(null); }}
              className="opacity-80 hover:opacity-100 text-[11px] font-bold px-2 py-0.5 rounded border border-white/40 hover:border-white transition-all">
              × Clear
            </button>
          </div>
        );
      })()}

      <div className="divide-y divide-slate-100">

        {/* ══ CHART 1: R-Factor History ══ */}
        {(() => {
          const CH = overallH;
          const VH = CH + pT + pB;
          // Y range: 0 to just above stage4 threshold with padding
          const allRf = data.map(d => d.rFactor);
          const yMax = Math.max(1.20, Math.max(...allRf) * 1.25);
          const yMin = 0;
          const rfTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].filter(v => v <= yMax);
          const zones = [
            { from: 0,     to: data[0].stage1, fill: '#bbf7d0', label: 'Not Monitored', labelColor: '#166534' },
            { from: data[0].stage1, to: data[0].stage2, fill: '#fef9c3', label: 'Stage 1', labelColor: '#854d0e' },
            { from: data[0].stage2, to: data[0].stage3, fill: '#fde68a', label: 'Stage 2', labelColor: '#92400e' },
            { from: data[0].stage3, to: data[0].stage4, fill: '#fecaca', label: 'Stage 3', labelColor: '#991b1b' },
            { from: data[0].stage4, to: yMax,            fill: '#fee2e2', label: 'Stage 4', labelColor: '#7f1d1d' },
          ];
          const yR = (v: number) => yAt(v, yMin, yMax, CH);
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-4 flex-wrap">
                <span className={titleCls}>R-Factor History</span>
                {zones.map(z => (
                  <div key={z.label} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm border" style={{ background: z.fill, borderColor: z.labelColor + '55' }}/>
                    <span className={`font-mono ${legendCls}`} style={{ color: z.labelColor }}>{z.label}</span>
                  </div>
                ))}
                <span className={`ml-auto font-semibold text-indigo-500 ${legendCls}`}>Hover dot · click to drill down</span>
              </div>
              <div style={{ position: 'relative', width: '100%', paddingBottom: `${((VH / VW) * 100).toFixed(2)}%` }}>
                <svg viewBox={`0 0 ${VW} ${VH}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                  {/* Zone bands */}
                  {zones.map(z => {
                    const y1 = yR(Math.min(z.to, yMax));
                    const y2 = yR(z.from);
                    if (y2 <= y1) return null;
                    return (
                      <g key={z.label}>
                        <rect x={pL} y={y1} width={cW} height={y2 - y1} fill={z.fill} opacity="0.45"/>
                        <text x={pL + 10} y={(y1 + y2) / 2 + 4} fontSize={axisFontSize - 1} fill={z.labelColor} fontWeight="700" opacity="0.75">{z.label}</text>
                      </g>
                    );
                  })}
                  <YGrid ticks={rfTicks} lo={yMin} hi={yMax} H={CH} dec={1}/>
                  {/* Threshold lines */}
                  {[
                    { v: data[0].stage1, c: '#b45309', lbl: `${data[0].stage1.toFixed(2)} Stage 1` },
                    { v: data[0].stage2, c: '#d97706', lbl: `${data[0].stage2.toFixed(2)} Stage 2` },
                    { v: data[0].stage3, c: '#dc2626', lbl: `${data[0].stage3.toFixed(2)} Stage 3` },
                    { v: data[0].stage4, c: '#7f1d1d', lbl: `${data[0].stage4.toFixed(2)} Stage 4` },
                  ].map(th => (
                    <g key={th.v}>
                      <line x1={pL} x2={pL + cW} y1={yR(th.v)} y2={yR(th.v)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.85"/>
                      <text x={pL + cW + 8} y={yR(th.v) + 4} fontSize={axisFontSize - 1} fontWeight="700" fill={th.c}>{th.lbl}</text>
                    </g>
                  ))}
                  {/* Industry avg line */}
                  <path d={mkPath(data, d => d.industryAvg, yMin, yMax, CH)} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.7"/>
                  {/* R-Factor area + line */}
                  <path d={mkArea(data, d => d.rFactor, yMin, yMax, CH)} fill="#4f46e5" opacity="0.07"/>
                  <path d={mkPath(data, d => d.rFactor, yMin, yMax, CH)} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8"/>
                  {/* Selected-point vertical guide */}
                  {selectedPull && (() => {
                    const si = data.findIndex(d => d.date === selectedPull);
                    if (si < 0) return null;
                    return <line x1={xAt(si)} x2={xAt(si)} y1={pT} y2={pT + CH} stroke="#6366f1" strokeWidth="1" strokeDasharray="4,3" opacity="0.45"/>;
                  })()}
                  <XAxis items={data} H={CH}/>
                  <Dots items={data} getY={d => yR(d.rFactor)} getLabel={d => d.rFactor.toFixed(3)} chartId="rf" dotFill={rFactorFill} focusKey="rf" H={CH}/>
                </svg>
              </div>
              {/* Industry avg legend */}
              <div className="mt-2 flex items-center gap-2">
                <div className="w-7 border-t border-dashed border-slate-400 opacity-60"/>
                <span className={`text-slate-400 ${legendCls}`}>Industry average</span>
              </div>
            </div>
          );
        })()}

        {/* ══ CHART 2: R-Factor Contribution ══ */}
        {(() => {
          const CH = midH;
          const VH = CH + pT + pB;
          const cats: { key: string; label: string; get: (d: NscSnapshot) => number; color: string }[] = [
            { key: 'conv', label: 'Convictions',          get: d => d.convPct,  color: '#6366f1' },
            { key: 'cvsa', label: 'CVSA Inspections',     get: d => d.cvsaPct,  color: '#3b82f6' },
            { key: 'col',  label: 'Reportable Collisions',get: d => d.colPct,   color: '#dc2626' },
            { key: 'adm',  label: 'Admin Penalties',      get: d => d.adminPct, color: '#f97316' },
          ];
          const allVals = cats.flatMap(c => data.map(c.get));
          const [lo, hi, ticks] = niceYRange(allVals);
          const yC = (v: number) => yAt(v, lo, hi, CH);
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <span className={titleCls}>R-Factor Contribution</span>
                {cats.map(c => (
                  <div key={c.key} className="flex items-center gap-1.5">
                    <div className="w-5 h-1 rounded" style={{ background: c.color }}/>
                    <span className={`text-slate-600 ${legendCls}`}>{c.label}</span>
                  </div>
                ))}
                <span className={`ml-auto italic text-slate-400 ${legendCls}`}>% contribution to R-Factor</span>
              </div>
              <div style={{ position: 'relative', width: '100%', paddingBottom: `${((VH / VW) * 100).toFixed(2)}%` }}>
                <svg viewBox={`0 0 ${VW} ${VH}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                  <YGrid ticks={ticks} lo={lo} hi={hi} H={CH} suffix="%" dec={1}/>
                  {cats.map(c => (
                    <path key={`a-${c.key}`}
                      d={mkArea(data, c.get, lo, hi, CH)}
                      fill={c.color} opacity="0.06"/>
                  ))}
                  {cats.map(c => (
                    <path key={c.key}
                      d={mkPath(data, c.get, lo, hi, CH)}
                      fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8"/>
                  ))}
                  <XAxis items={data} H={CH}/>
                  {cats.map(c => (
                    <Dots key={c.key}
                      items={data}
                      getY={d => yC(c.get(d))}
                      getLabel={d => `${c.get(d).toFixed(1)}%`}
                      chartId={`c-${c.key}`} dotFill={() => c.color} focusKey={c.key} H={CH} showTooltip={false}/>
                  ))}
                  {hoveredPull?.chart?.startsWith('c-') && (() => {
                    const d = data[hoveredPull.idx];
                    if (!d) return null;
                    const fk = hoveredPull.chart.slice(2);
                    const cat = cats.find(c => c.key === fk);
                    const cy = cat ? yC(cat.get(d)) : 0;
                    return <Tip cx={xAt(hoveredPull.idx)} cy={cy} H={CH} d={d} focusKey={fk}/>;
                  })()}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* ══ CHART 3: Out-of-Service Trend ══ */}
        {(() => {
          const oosData = data.filter(d => d.overallOOS > 0);
          const no = oosData.length;
          const CH = midH;
          const VH = CH + pT + pB;
          if (no < 2) return (
            <div className={sectionPad}>
              <span className={titleCls}>Out-of-Service Trend</span>
              <div className="mt-3 h-16 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No OOS data for selected range</div>
            </div>
          );
          const oosLines = [
            { key: 'ov', label: 'Overall OOS%',  vals: oosData.map(d => d.overallOOS),  color: '#6366f1' },
            { key: 'vh', label: 'Vehicle OOS%',  vals: oosData.map(d => d.vehicleOOS),  color: '#ef4444' },
            { key: 'dr', label: 'Driver OOS%',   vals: oosData.map(d => d.driverOOS),   color: '#10b981' },
          ];
          const allOos = oosLines.flatMap(l => l.vals);
          const oosMax = Math.max(25, Math.ceil(Math.max(...allOos) / 5) * 5 + 5);
          const yO = (v: number) => yAt(v, 0, oosMax, CH);
          const xO = (i: number) => pL + (no > 1 ? (i / (no - 1)) * cW : cW / 2);
          const mkOos = (vals: number[]) =>
            vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xO(i).toFixed(1)},${yO(v).toFixed(1)}`).join(' ');
          const oosTicks = [0, 5, 10, 15, 20, 25, 30, 35].filter(v => v <= oosMax);
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <span className={titleCls}>Out-of-Service Trend</span>
                {oosLines.map(l => (
                  <div key={l.key} className="flex items-center gap-1.5">
                    <div className="w-5 h-1 rounded" style={{ background: l.color }}/>
                    <span className={`text-slate-600 ${legendCls}`}>{l.label}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <div className="w-5 border-t border-dashed border-slate-400"/>
                  <span className={`text-slate-400 ${legendCls}`}>20% MTO threshold</span>
                </div>
              </div>
              <div style={{ position: 'relative', width: '100%', paddingBottom: `${((VH / VW) * 100).toFixed(2)}%` }}>
                <svg viewBox={`0 0 ${VW} ${VH}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                  <rect x={pL} y={yO(oosMax)} width={cW} height={yO(20) - yO(oosMax)} fill="#fecaca" opacity="0.12"/>
                  {/* Y-axis border */}
                  <line x1={pL} x2={pL} y1={pT} y2={pT + CH} stroke="#cbd5e1" strokeWidth="1"/>
                  {oosTicks.map(v => (
                    <g key={v}>
                      <line x1={pL} x2={pL + cW} y1={yO(v)} y2={yO(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                      <line x1={pL - 4} x2={pL} y1={yO(v)} y2={yO(v)} stroke="#cbd5e1" strokeWidth="1"/>
                      <text x={pL - 8} y={yO(v) + 4} textAnchor="end" fontSize={axisFontSize} fill="#475569" fontFamily="monospace">{v}%</text>
                    </g>
                  ))}
                  <line x1={pL} x2={pL + cW} y1={yO(20)} y2={yO(20)} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,3" opacity="0.8"/>
                  <text x={pL + cW + 8} y={yO(20) + 4} fontSize={axisFontSize} fontWeight="700" fill="#94a3b8">20%</text>
                  {oosLines.map(l => (
                    <path key={`a-${l.key}`}
                      d={(() => {
                        const pts = l.vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xO(i).toFixed(1)},${yO(v).toFixed(1)}`).join(' ');
                        return `${pts} L${xO(no - 1).toFixed(1)},${(pT + CH).toFixed(1)} L${xO(0).toFixed(1)},${(pT + CH).toFixed(1)} Z`;
                      })()}
                      fill={l.color} opacity="0.05"/>
                  ))}
                  {oosLines.map(l => (
                    <path key={l.key} d={mkOos(l.vals)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.8"/>
                  ))}
                  <line x1={pL} x2={pL + cW} y1={pT + CH} y2={pT + CH} stroke="#cbd5e1" strokeWidth="1"/>
                  {oosData.map((d, i) => {
                    const x = xO(i);
                    return (
                      <g key={i}>
                        <line x1={x} x2={x} y1={pT + CH} y2={pT + CH + 5} stroke="#cbd5e1" strokeWidth="1"/>
                        <text x={x} y={pT + CH + 24} textAnchor="end" fontSize={axisFontSize} fill="#334155" fontFamily="monospace" fontWeight="500"
                          transform={`rotate(-32,${x},${pT + CH + 24})`}>{d.label}</text>
                      </g>
                    );
                  })}
                  {oosLines.map(l => (
                    <Dots key={l.key}
                      items={oosData}
                      getY={d => yO(l.key === 'ov' ? d.overallOOS : l.key === 'vh' ? d.vehicleOOS : d.driverOOS)}
                      getLabel={d => `${(l.key === 'ov' ? d.overallOOS : l.key === 'vh' ? d.vehicleOOS : d.driverOOS).toFixed(1)}%`}
                      chartId={`o-${l.key}`} dotFill={() => l.color} focusKey={l.key === 'ov' ? 'oos' : l.key}
                      H={CH} showTooltip={false} total={no}/>
                  ))}
                  {hoveredPull?.chart?.startsWith('o-') && (() => {
                    const d = oosData[hoveredPull.idx];
                    if (!d) return null;
                    const ky = hoveredPull.chart.slice(2);
                    const cy = yO(ky === 'ov' ? d.overallOOS : ky === 'vh' ? d.vehicleOOS : d.driverOOS);
                    return <Tip cx={xO(hoveredPull.idx)} cy={cy} H={CH} d={d} focusKey="oos"/>;
                  })()}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* ══ CHART 4: Event Counts vs Points ══ */}
        {(() => {
          const CH = eventH;
          const VH = CH + pT + pB;
          const maxE = Math.max(...data.map(d => Math.max(d.collCount, d.convDocs))) + 4;
          const maxP = Math.max(...data.map(d => Math.max(d.collPts, d.convPts))) + 5;
          const yE = (v: number) => yAt(v, 0, maxE, CH);
          const yP = (v: number) => yAt(v, 0, maxP, CH);
          const bw = Math.max(9, Math.min(24, cW / n * 0.22));
          const eTicks = Array.from({ length: Math.ceil(maxE / 2) + 1 }, (_, i) => i * 2).filter(v => v <= maxE);
          const pTicks = Array.from({ length: Math.ceil(maxP / 5) + 1 }, (_, i) => i * 5).filter(v => v <= maxP);
          const mkPts = (vals: number[], yFn: (v: number) => number) =>
            vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ');
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-4 flex-wrap">
                <span className={titleCls}>Event Counts &amp; Points</span>
                {[
                  { lbl: 'Collisions (bars)', color: '#3b82f6', rect: true },
                  { lbl: 'Convictions (bars)', color: '#d97706', rect: true },
                  { lbl: 'Col Points (line)', color: '#6366f1', rect: false },
                  { lbl: 'Conv Points (line)', color: '#ec4899', rect: false },
                ].map(l => (
                  <div key={l.lbl} className="flex items-center gap-1.5">
                    {l.rect
                      ? <div className="w-3 h-3 rounded-sm border" style={{ background: l.color + '22', borderColor: l.color }}/>
                      : <div className="w-6 border-t-2 border-dashed" style={{ borderColor: l.color }}/>}
                    <span className={`text-slate-600 ${legendCls}`}>{l.lbl}</span>
                  </div>
                ))}
                <span className={`ml-auto italic text-slate-400 ${legendCls}`}>Hover bar · full pull details · click to select</span>
              </div>
              <div style={{ position: 'relative', width: '100%', paddingBottom: `${((VH / VW) * 100).toFixed(2)}%` }}>
                <svg viewBox={`0 0 ${VW} ${VH}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                  {/* Y-axis left (events) */}
                  <line x1={pL} x2={pL} y1={pT} y2={pT + CH} stroke="#cbd5e1" strokeWidth="1"/>
                  {eTicks.map(v => (
                    <g key={v}>
                      <line x1={pL} x2={pL + cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                      <line x1={pL - 4} x2={pL} y1={yE(v)} y2={yE(v)} stroke="#cbd5e1" strokeWidth="1"/>
                      <text x={pL - 8} y={yE(v) + 4} textAnchor="end" fontSize={axisFontSize} fill="#475569" fontFamily="monospace">{v}</text>
                    </g>
                  ))}
                  {/* Y-axis right (points) */}
                  <line x1={pL + cW} x2={pL + cW} y1={pT} y2={pT + CH} stroke="#e2e8f0" strokeWidth="0.75"/>
                  {pTicks.map(v => (
                    <text key={v} x={pL + cW + 8} y={yP(v) + 4} fontSize={axisFontSize} fill="#94a3b8" fontFamily="monospace">{v}</text>
                  ))}
                  <text x={pL + cW + 8} y={pT - 6} fontSize={axisFontSize - 1} fill="#94a3b8" fontFamily="monospace">pts →</text>
                  {/* Points lines (behind bars) */}
                  <path d={mkPts(data.map(d => d.collPts), yP)} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"/>
                  <path d={mkPts(data.map(d => d.convPts), yP)} fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"/>
                  {/* Bars — CVOR style: hover/select highlighting, value labels on every bar */}
                  {data.map((d, i) => {
                    const cx = xAt(i);
                    const isSel = d.date === selectedPull;
                    const isHov = hoveredPull?.chart === 'ev' && hoveredPull?.idx === i;
                    const al = alertLevel(d);
                    return (
                      <g key={i} style={{ cursor: 'pointer' }}
                        onClick={() => { const next = isSel ? null : d.date; setSelectedPull(next); setExpandedDate(next); }}
                        onMouseEnter={() => setHoveredPull({ chart: 'ev', idx: i })}
                        onMouseLeave={() => setHoveredPull(null)}>
                        {/* Background highlight */}
                        {al === 'critical' && <rect x={cx - bw - 3} y={pT} width={bw * 2 + 6} height={CH} fill="#dc2626" opacity="0.04" rx="2"/>}
                        {isSel && <rect x={cx - bw - 3} y={pT} width={bw * 2 + 6} height={CH} fill="#6366f1" opacity="0.06" rx="2"/>}
                        {/* Collision bar */}
                        <rect x={cx - bw - 1} y={yE(d.collCount)} width={bw} height={Math.max(1, pT + CH - yE(d.collCount))}
                          fill={isHov || isSel ? '#3b82f6' : '#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2"/>
                        {/* Conviction bar */}
                        <rect x={cx + 1} y={yE(d.convDocs)} width={bw} height={Math.max(1, pT + CH - yE(d.convDocs))}
                          fill={isHov || isSel ? '#d97706' : '#d9770622'} stroke="#d97706" strokeWidth="1" rx="2"/>
                        {/* Value labels on every bar */}
                        <text x={cx - bw / 2} y={yE(d.collCount) - 4} textAnchor="middle" fontSize={axisFontSize} fontWeight="700" fill="#1d4ed8" fontFamily="monospace" style={{ pointerEvents: 'none' }}>{d.collCount}</text>
                        <text x={cx + bw / 2 + 1} y={yE(d.convDocs) - 4} textAnchor="middle" fontSize={axisFontSize} fontWeight="700" fill="#92400e" fontFamily="monospace" style={{ pointerEvents: 'none' }}>{d.convDocs}</text>
                      </g>
                    );
                  })}
                  <line x1={pL} x2={pL + cW} y1={pT + CH} y2={pT + CH} stroke="#cbd5e1" strokeWidth="1"/>
                  <XAxis items={data} H={CH}/>
                  {/* Tooltip on hover */}
                  {hoveredPull?.chart === 'ev' && (() => {
                    const d = data[hoveredPull.idx];
                    if (!d) return null;
                    return <Tip cx={xAt(hoveredPull.idx)} cy={yE(d.collCount)} H={CH} d={d} focusKey="oos"/>;
                  })()}
                </svg>
              </div>
            </div>
          );
        })()}

        {/* ══ CHART 5: Monitoring Stage Timeline ══ */}
        {(() => {
          const CH = midH;
          const VH = CH + pT + pB;
          const [lo, hi, ticks] = niceYRange(data.map(d => d.rFactor), 0.18);
          const yS = (v: number) => yAt(v, lo, hi, CH);
          // Stage color for each segment
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-4 flex-wrap">
                <span className={titleCls}>Monitoring Stage Timeline</span>
                {[0, 1, 2, 3, 4].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full" style={{ background: stageColor(s) }}/>
                    <span className={`text-slate-600 ${legendCls}`}>{stageLabel(s)}</span>
                  </div>
                ))}
                <span className={`ml-auto italic text-slate-400 ${legendCls}`}>Segment color = monitoring stage</span>
              </div>
              <div style={{ position: 'relative', width: '100%', paddingBottom: `${((VH / VW) * 100).toFixed(2)}%` }}>
                <svg viewBox={`0 0 ${VW} ${VH}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                  {/* Stage threshold horizontal bands */}
                  {[
                    { v: data[0].stage1, c: '#b45309', lbl: `Stage 1 (${data[0].stage1.toFixed(2)})` },
                    { v: data[0].stage2, c: '#d97706', lbl: `Stage 2 (${data[0].stage2.toFixed(2)})` },
                    { v: data[0].stage3, c: '#dc2626', lbl: `Stage 3 (${data[0].stage3.toFixed(2)})` },
                  ].filter(th => th.v <= hi).map(th => (
                    <g key={th.v}>
                      <line x1={pL} x2={pL + cW} y1={yS(th.v)} y2={yS(th.v)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.6"/>
                      <text x={pL + cW + 8} y={yS(th.v) + 4} fontSize={axisFontSize - 1} fontWeight="700" fill={th.c}>{th.lbl}</text>
                    </g>
                  ))}
                  <YGrid ticks={ticks} lo={lo} hi={hi} H={CH} dec={3}/>
                  {/* Colored line segments by stage */}
                  {data.map((d, i) => {
                    if (i === 0) return null;
                    const prev = data[i - 1];
                    const x1 = xAt(i - 1);
                    const x2 = xAt(i);
                    const y1 = yS(prev.rFactor);
                    const y2 = yS(d.rFactor);
                    const color = stageColor(prev.monitoringStage);
                    return (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke={color} strokeWidth="3" strokeLinecap="round"/>
                    );
                  })}
                  {/* Area fill */}
                  <path d={mkArea(data, d => d.rFactor, lo, hi, CH)} fill="#4f46e5" opacity="0.07"/>
                  {/* Selected-point vertical guide */}
                  {selectedPull && (() => {
                    const si = data.findIndex(d => d.date === selectedPull);
                    if (si < 0) return null;
                    return <line x1={xAt(si)} x2={xAt(si)} y1={pT} y2={pT + CH} stroke="#6366f1" strokeWidth="1" strokeDasharray="4,3" opacity="0.45"/>;
                  })()}
                  <XAxis items={data} H={CH}/>
                  <Dots items={data} getY={d => yS(d.rFactor)} getLabel={d => d.rFactor.toFixed(3)} chartId="st" dotFill={rFactorFill} focusKey="rf" H={CH}/>
                </svg>
              </div>
            </div>
          );
        })()}

        {/* ══ CHART 6: Category Summary (bar chart) ══ */}
        {(() => {
          const last = data[data.length - 1];
          const categories = [
            { label: 'Brakes',        val: last.brakes,    color: '#dc2626' },
            { label: 'Lighting',      val: last.lighting,  color: '#f97316' },
            { label: 'Vehicle Std',   val: last.vehStd,    color: '#d97706' },
            { label: 'Driver Qual',   val: last.driverQual,color: '#6366f1' },
            { label: 'Tires',         val: last.tires,     color: '#3b82f6' },
            { label: 'Cargo',         val: last.cargo,     color: '#10b981' },
            { label: 'Hours of Service', val: last.hos,   color: '#8b5cf6' },
            { label: 'Dangerous Goods', val: last.dangerous, color: '#ec4899' },
          ].sort((a, b) => b.val - a.val);
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-3">
                <span className={titleCls}>Category Violation Summary</span>
                <span className={`text-slate-400 ${legendCls}`}>{last.label} snapshot · % of total violations</span>
              </div>
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c.label} className="flex items-center gap-3">
                    <div className="w-28 text-right shrink-0">
                      <span className="text-[11px] font-medium text-slate-600">{c.label}</span>
                    </div>
                    <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(c.val, 100)}%`, background: c.color }}/>
                    </div>
                    <div className="w-12 text-right">
                      <span className="text-[11px] font-black font-mono" style={{ color: c.color }}>{c.val.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ══ CHART 7: CVSA Level Breakdown ══ */}
        {(() => {
          const last = data[data.length - 1];
          const levels = [
            { label: 'Level I — Full Inspection',    val: last.l1, color: '#dc2626', desc: 'North American Standard' },
            { label: 'Level II — Walk-Around',       val: last.l2, color: '#f97316', desc: 'Driver & vehicle check' },
            { label: 'Level III — Driver Only',      val: last.l3, color: '#d97706', desc: 'Driver credentials' },
            { label: 'Level IV — Special Study',     val: last.l4, color: '#6366f1', desc: 'Targeted inspection' },
            { label: 'Level V — Vehicle Only',       val: last.l5, color: '#3b82f6', desc: 'No driver present' },
            { label: 'Level VI — Enhanced NAS',      val: last.l6, color: '#8b5cf6', desc: 'Radioactive materials' },
          ];
          const total = levels.reduce((s, l) => s + l.val, 0) || 1;
          return (
            <div className={sectionPad}>
              <div className="mb-4 flex items-center gap-3">
                <span className={titleCls}>CVSA Inspection Level Breakdown</span>
                <span className={`text-slate-400 ${legendCls}`}>{last.label} snapshot · {total} total inspections</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {levels.map(l => (
                  <div key={l.label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{l.desc}</div>
                      </div>
                      <div className="text-[24px] font-black font-mono leading-none" style={{ color: l.color }}>{l.val}</div>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(l.val / total * 100).toFixed(1)}%`, background: l.color }}/>
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-right" style={{ color: l.color }}>{(l.val / total * 100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ══ PULL-BY-PULL DATA TABLE ══ */}
        {(() => {
          // Build rows from ALL data (not filtered by time range) — show full history
          const allRows = [...DATA].reverse().map((d, i) => ({
            id: `${d.date}-${i}`,
            date: d.date,
            label: d.label,
            window: `${d.reportStart} → ${d.reportEnd}`,
            stage: d.monitoringStage,
            rFactor: d.rFactor,
            industryAvg: d.industryAvg,
            convPct: d.convPct,
            cvsaPct: d.cvsaPct,
            colPct: d.colPct,
            adminPct: d.adminPct,
            collCount: d.collCount,
            convDocs: d.convDocs,
            collPts: d.collPts,
            convPts: d.convPts,
            oosOverall: d.overallOOS,
            oosVehicle: d.vehicleOOS,
            oosDriver: d.driverOOS,
            totalInsp: d.totalInsp,
            passed: d.passed,
            oosCount: d.oosCount,
            fleet: d.currentFleet,
            totalEvents: d.totalEvents,
            isLatest: i === 0,
            isSelected: d.date === selectedPull,
          }));

          const filtered = allRows.filter(row => {
            const q = pullSearch.trim().toLowerCase();
            if (!q) return true;
            return [row.label, row.window, stageLabel(row.stage), row.rFactor.toFixed(3), row.convPct.toFixed(1), row.cvsaPct.toFixed(1), row.colPct.toFixed(1), row.oosOverall.toFixed(1), String(row.totalInsp), String(row.collCount)].join(' ').toLowerCase().includes(q);
          });

          const sorted = [...filtered].sort((a, b) => {
            const dir = pullSort.dir === 'asc' ? 1 : -1;
            const v = (r: typeof allRows[number]) => {
              switch (pullSort.col) {
                case 'date': return new Date(r.date).getTime();
                case 'rFactor': return r.rFactor;
                case 'convPct': return r.convPct;
                case 'cvsaPct': return r.cvsaPct;
                case 'colPct': return r.colPct;
                case 'adminPct': return r.adminPct;
                case 'collCount': return r.collCount;
                case 'convDocs': return r.convDocs;
                case 'collPts': return r.collPts;
                case 'convPts': return r.convPts;
                case 'oosOverall': return r.oosOverall;
                case 'oosVehicle': return r.oosVehicle;
                case 'oosDriver': return r.oosDriver;
                case 'totalInsp': return r.totalInsp;
                case 'fleet': return r.fleet;
                default: return new Date(r.date).getTime();
              }
            };
            const av = v(a), bv = v(b);
            return typeof av === 'number' && typeof bv === 'number' ? (av - bv) * dir : String(av).localeCompare(String(bv)) * dir;
          });

          const totalPages = Math.max(1, Math.ceil(sorted.length / pullRowsPerPage));
          const curPage = Math.min(pullPage, totalPages);
          const paged = sorted.slice((curPage - 1) * pullRowsPerPage, curPage * pullRowsPerPage);
          const vis = (id: string) => pullColumns.find(c => c.id === id)?.visible !== false;
          const si = (id: string) => pullSort.col === id ? (pullSort.dir === 'asc' ? '↑' : '↓') : '';
          const setSort = (id: string) => { setPullPage(1); setPullSort(prev => ({ col: id, dir: prev.col === id && prev.dir === 'asc' ? 'desc' : 'asc' })); };
          const hdr = (id: string, label: string, tone = 'text-slate-500') => (
            <button type="button" onClick={() => setSort(id)}
              className={`inline-flex items-center gap-1 font-bold uppercase tracking-[0.14em] transition-colors hover:text-slate-800 ${tone}`}>
              <span>{label}</span>
              <span className="text-[10px] text-slate-400">{si(id)}</span>
            </button>
          );
          const statusCls = (row: typeof allRows[number]) => {
            if (row.isSelected) return 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200';
            if (row.stage >= 3) return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
            if (row.stage >= 1) return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
            return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
          };
          const statusLabel = (row: typeof allRows[number]) => row.isSelected ? 'Selected' : stageLabel(row.stage);

          return (
            <div className="px-6 py-5 pb-2">
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Snapshot History</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[9.5px] font-mono text-slate-500">
                    {DATA.length} snapshots · newest first · click row → drill-down
                  </span>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <DataListToolbar
                    searchValue={pullSearch}
                    onSearchChange={v => { setPullSearch(v); setPullPage(1); }}
                    searchPlaceholder="Search snapshot date, window, stage, or metrics..."
                    columns={pullColumns}
                    onToggleColumn={id => setPullColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                    totalItems={sorted.length}
                    currentPage={curPage}
                    rowsPerPage={pullRowsPerPage}
                    onPageChange={setPullPage}
                    onRowsPerPageChange={v => { setPullRowsPerPage(v); setPullPage(1); }}
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1500px] border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-slate-50/90 text-left text-[11px]">
                          {vis('date')       && <th className="px-4 py-3">{hdr('date', 'Snapshot Date')}</th>}
                          {vis('window')     && <th className="px-4 py-3">{hdr('window', 'Report Window', 'text-indigo-500')}</th>}
                          {vis('status')     && <th className="px-4 py-3">{hdr('status', 'Status')}</th>}
                          {vis('rFactor')    && <th className="px-3 py-3 text-right">{hdr('rFactor', 'R-Factor')}</th>}
                          {vis('convPct')    && <th className="px-3 py-3 text-right">{hdr('convPct', 'Conv%', 'text-indigo-500')}</th>}
                          {vis('cvsaPct')    && <th className="px-3 py-3 text-right">{hdr('cvsaPct', 'CVSA%', 'text-blue-500')}</th>}
                          {vis('colPct')     && <th className="px-3 py-3 text-right">{hdr('colPct', 'Col%', 'text-red-500')}</th>}
                          {vis('adminPct')   && <th className="px-3 py-3 text-right">{hdr('adminPct', 'Admin%', 'text-orange-500')}</th>}
                          {vis('collCount')  && <th className="px-3 py-3 text-right">{hdr('collCount', '#Coll')}</th>}
                          {vis('convDocs')   && <th className="px-3 py-3 text-right">{hdr('convDocs', '#Conv')}</th>}
                          {vis('collPts')    && <th className="px-3 py-3 text-right">{hdr('collPts', 'Coll Pts', 'text-indigo-500')}</th>}
                          {vis('convPts')    && <th className="px-3 py-3 text-right">{hdr('convPts', 'Conv Pts', 'text-pink-500')}</th>}
                          {vis('oosOverall') && <th className="px-3 py-3 text-right">{hdr('oosOverall', 'OOS Ov%', 'text-violet-500')}</th>}
                          {vis('oosVehicle') && <th className="px-3 py-3 text-right">{hdr('oosVehicle', 'OOS Veh%', 'text-red-500')}</th>}
                          {vis('oosDriver')  && <th className="px-3 py-3 text-right">{hdr('oosDriver', 'OOS Drv%', 'text-emerald-500')}</th>}
                          {vis('totalInsp')  && <th className="px-3 py-3 text-right">{hdr('totalInsp', 'Insp')}</th>}
                          {vis('fleet')      && <th className="px-3 py-3 text-right">{hdr('fleet', 'Fleet')}</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paged.length > 0 ? paged.map((row, ri) => {
                          const isExpanded = expandedDate === row.date;
                          return (
                            <>
                              <tr key={row.id}
                                onClick={() => { const next = isExpanded ? null : row.date; setExpandedDate(next); setSelectedPull(next); }}
                                className={`cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-indigo-50/80' : row.isSelected ? 'bg-indigo-50/70' : ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                                {vis('date') && (
                                  <td className="px-4 py-3.5 align-top">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-slate-400 transition-transform text-[10px] ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                                      {row.isLatest && !isExpanded && (
                                        <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Latest</span>
                                      )}
                                      <div>
                                        <div className="font-mono text-[13px] font-semibold text-slate-900">{row.label}</div>
                                        <div className="text-[11px] text-slate-500">Rolling 12-month snapshot</div>
                                      </div>
                                    </div>
                                  </td>
                                )}
                                {vis('window') && (
                                  <td className="px-4 py-3.5 align-top">
                                    <div className="font-mono text-[12px] font-semibold text-indigo-600">{row.window}</div>
                                    <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                      {row.totalInsp} inspections
                                    </div>
                                  </td>
                                )}
                                {vis('status') && (
                                  <td className="px-4 py-3.5 align-top">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusCls(row)}`}>
                                      {statusLabel(row)}
                                    </span>
                                  </td>
                                )}
                                {vis('rFactor') && (
                                  <td className="px-3 py-3.5 text-right">
                                    <span className="font-mono text-[13px] font-bold" style={{ color: stageColor(row.stage) }}>{row.rFactor.toFixed(3)}</span>
                                    <div className="text-[10px] text-slate-400 font-mono">avg {row.industryAvg.toFixed(3)}</div>
                                  </td>
                                )}
                                {vis('convPct')    && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-indigo-600">{row.convPct.toFixed(1)}%</td>}
                                {vis('cvsaPct')    && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-blue-600">{row.cvsaPct.toFixed(1)}%</td>}
                                {vis('colPct')     && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-red-600">{row.colPct.toFixed(1)}%</td>}
                                {vis('adminPct')   && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-orange-600">{row.adminPct.toFixed(1)}%</td>}
                                {vis('collCount')  && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-700">{row.collCount}</td>}
                                {vis('convDocs')   && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-700">{row.convDocs}</td>}
                                {vis('collPts')    && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-indigo-600">{row.collPts}</td>}
                                {vis('convPts')    && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-pink-600">{row.convPts}</td>}
                                {vis('oosOverall') && (
                                  <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosOverall >= 20 ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                                    {row.oosOverall > 0 ? `${row.oosOverall.toFixed(1)}%` : '—'}
                                  </td>
                                )}
                                {vis('oosVehicle') && (
                                  <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosVehicle >= 20 ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                                    {row.oosVehicle > 0 ? `${row.oosVehicle.toFixed(1)}%` : '—'}
                                  </td>
                                )}
                                {vis('oosDriver') && (
                                  <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosDriver > 5 ? 'font-semibold text-amber-600' : 'text-emerald-600'}`}>
                                    {row.oosDriver > 0 ? `${row.oosDriver.toFixed(1)}%` : '—'}
                                  </td>
                                )}
                                {vis('totalInsp') && (
                                  <td className="px-3 py-3.5 text-right align-top">
                                    <div className="font-mono text-[12.5px] text-slate-700">{row.totalInsp}</div>
                                    <div className="text-[10px] text-emerald-600 font-mono">{row.passed} pass</div>
                                  </td>
                                )}
                                {vis('fleet') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-600">{row.fleet}</td>}
                              </tr>

                            </>
                          );
                        }) : (
                          <tr>
                            <td colSpan={pullColumns.filter(c => c.visible).length || 1} className="px-6 py-16 text-center">
                              <div className="flex flex-col items-center">
                                <div className="mb-4 rounded-full border border-slate-200 bg-white p-4 shadow-sm">
                                  <AlertCircle size={28} className="text-slate-400"/>
                                </div>
                                <div className="text-lg font-bold text-slate-900">No snapshots match your search</div>
                                <div className="mt-1 text-sm text-slate-500">Try clearing the search or adjusting your query.</div>
                                <button type="button" onClick={() => setPullSearch('')}
                                  className="mt-5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm hover:bg-blue-50">
                                  Clear search
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <PaginationBar
                    totalItems={sorted.length}
                    currentPage={curPage}
                    rowsPerPage={pullRowsPerPage}
                    onPageChange={setPullPage}
                    onRowsPerPageChange={v => { setPullRowsPerPage(v); setPullPage(1); }}
                  />
                </div>

                {/* ── NSC Analysis for selected snapshot ── */}
                {(() => {
                  const snap = expandedDate ? DATA.find(d => d.date === expandedDate) : null;
                  if (!snap) return null;
                  return (
                    <div className="mt-4">
                      <NscSnapshotAnalysis snap={snap}/>
                    </div>
                  );
                })()}

              </div>
            </div>
          );
        })()}

      </div>
    </div>
  </div>
  );
}
