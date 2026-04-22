import { useState } from 'react';
import { AnalysisRow } from './NscBcPerformanceHistory';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollisionRow { seq:number; date:string; severity:string; caseNum:string; fault:string; vehicles:number; killed:number; injured:number; pts:number }
interface ConvictionRow { seq:number; date:string; loc:string; charge:string; natCode:string; pts:number }
interface InspectionRow { seq:number; date:string; cvsaLevel:number; log:string; tdg:string; loadSecurity:string; driverName:string; status:string }
interface AuditRow { seq:number; date:string; result:string; auditType:string }

// ─── Data (from carrier profile abstract images) ─────────────────────────────

const COLLISIONS: CollisionRow[] = [
  { seq:1, date:'2021/05/12', severity:'Property Damage', caseNum:'BC2021-0583',  fault:'At Fault',      vehicles:2, killed:0, injured:0, pts:2 },
  { seq:2, date:'2021/02/18', severity:'Injury',          caseNum:'AB2021-1147',  fault:'At Fault',      vehicles:2, killed:0, injured:1, pts:4 },
  { seq:3, date:'2020/11/03', severity:'Property Damage', caseNum:'ON2020-8822',  fault:'Not at Fault',  vehicles:1, killed:0, injured:0, pts:0 },
  { seq:4, date:'2020/08/27', severity:'Property Damage', caseNum:'QC2020-5519',  fault:'Fault Unknown', vehicles:2, killed:0, injured:0, pts:2 },
];

const CONVICTIONS: ConvictionRow[] = [
  { seq:1, date:'2021/03/04', loc:'QC', charge:'SIGNALISATION NON RESPECT\u00C9E',   natCode:'317', pts:3 },
  { seq:2, date:'2021/01/14', loc:'BC', charge:'DISOBEY TRAFFIC CONTROL DEVICE',     natCode:'317', pts:3 },
];

const INSPECTIONS: InspectionRow[] = [
  { seq:1,  date:'2022/11/22', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'P' },
  { seq:2,  date:'2022/10/07', cvsaLevel:3, log:'Warning', tdg:'Passed', loadSecurity:'Passed', driverName:'NAVJOT SINGH',        status:'W' },
  { seq:3,  date:'2021/06/21', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'PANESAR',             status:'P' },
  { seq:4,  date:'2021/06/11', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'BOWLAN J',            status:'P' },
  { seq:5,  date:'2021/06/10', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'RATTEA SINGH',        status:'P' },
  { seq:6,  date:'2021/06/09', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SAINI S',             status:'P' },
  { seq:7,  date:'2021/06/06', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'PANESAR S',           status:'P' },
  { seq:8,  date:'2021/06/01', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'VASANTHAN PRAGASH',   status:'P' },
  { seq:9,  date:'2021/05/19', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SIDHU S',             status:'W' },
  { seq:10, date:'2021/05/18', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SAINI S',             status:'W' },
  { seq:11, date:'2021/05/17', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'RANA -',              status:'P' },
  { seq:12, date:'2021/05/17', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'DHANDLI',             status:'P' },
  { seq:13, date:'2021/05/11', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'RAHUL -',             status:'P' },
  { seq:14, date:'2021/04/28', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'DHIMAN',              status:'P' },
  { seq:15, date:'2021/04/21', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'KAPIL',               status:'P' },
  { seq:16, date:'2021/04/20', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'P' },
  { seq:17, date:'2021/04/07', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'MANJINDER',           status:'P' },
  { seq:18, date:'2021/04/07', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'HARPREET SINGH,',     status:'W' },
  { seq:19, date:'2021/04/06', cvsaLevel:2, log:'Warning', tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'W' },
  { seq:20, date:'2021/03/31', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'W' },
  { seq:21, date:'2021/03/28', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'P' },
  { seq:22, date:'2021/03/25', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'P' },
  { seq:23, date:'2021/03/23', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'O' },
  { seq:24, date:'2021/03/17', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'O' },
  { seq:25, date:'2021/03/10', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'P' },
  { seq:26, date:'2021/03/04', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'KALSI S',             status:'P' },
  { seq:27, date:'2021/02/23', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'W' },
  { seq:28, date:'2021/02/06', cvsaLevel:4, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'NUTAN PRAKASH',       status:'P' },
  { seq:29, date:'2021/01/19', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'RAWALA S',            status:'P' },
  { seq:30, date:'2021/01/09', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'W' },
  { seq:31, date:'2020/12/14', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SANDHU',              status:'P' },
  { seq:32, date:'2020/12/11', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'W' },
  { seq:33, date:'2020/12/07', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'MEHRA P',             status:'P' },
  { seq:34, date:'2020/10/08', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'MEHRA P',             status:'W' },
  { seq:35, date:'2020/09/25', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'KINCH E',             status:'P' },
  { seq:36, date:'2020/09/01', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'GILL S',              status:'W' },
  { seq:37, date:'2020/07/29', cvsaLevel:1, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'INDERJEET',           status:'O' },
  { seq:38, date:'2020/07/09', cvsaLevel:2, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'SINGH',               status:'P' },
  { seq:39, date:'2020/06/19', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'KULWANT',             status:'P' },
  { seq:40, date:'2020/06/18', cvsaLevel:3, log:'Passed',  tdg:'Passed', loadSecurity:'Passed', driverName:'RANDHAWA S',          status:'P' },
];

const AUDITS: AuditRow[] = [
  { seq:1, date:'2021/01/13', result:'NON-COMPLIANT', auditType:'Compliance' },
];

const PAGE = 10;

// ─── Small compact sub-section dropdown (mirrors AbConvSub pattern) ──────────

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inspStatusBadge(s: string) {
  if (s === 'P') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'W') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'O') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function inspStatusLabel(s: string) {
  if (s === 'P') return 'Pass';
  if (s === 'W') return 'Warning';
  if (s === 'O') return 'Out of Service';
  return s;
}

function collSeverityBadge(s: string) {
  if (s === 'Fatality' || s === 'Fatal')  return 'bg-red-50 text-red-700 border-red-200';
  if (s === 'Injury')                      return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'Property Damage')             return 'bg-slate-50 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function collFaultBadge(f: string) {
  if (f === 'At Fault')      return 'bg-red-50 text-red-700 border-red-200';
  if (f === 'Fault Unknown') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (f === 'Not at Fault')  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function auditResultBadge(r: string) {
  if (r === 'COMPLIANT')      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (r === 'NON-COMPLIANT')  return 'bg-red-50 text-red-700 border-red-200';
  if (r === 'CONDITIONAL')    return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function Pagination({ page, pages, total, onPage }: { page:number; pages:number; total:number; onPage:(p:number)=>void }) {
  return (
    <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
      <span className="text-[10px] text-slate-500">{total === 0 ? 0 : (page - 1) * PAGE + 1}&ndash;{Math.min(page * PAGE, total)} of {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
        {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
          <button key={p} onClick={() => onPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
        ))}
        <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
      </div>
    </div>
  );
}

// ─── Sub-lists ───────────────────────────────────────────────────────────────

function CollisionsList() {
  const [page, setPage] = useState(1);
  const total = COLLISIONS.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = COLLISIONS.slice((page - 1) * PAGE, page * PAGE);
  const totalPts = COLLISIONS.reduce((a, r) => a + r.pts, 0);

  return (
    <div className="bg-white">
      <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 space-y-2">
        <p className="text-[11px] text-slate-600 leading-relaxed italic">
          Any accident appearing on this abstract does not indicate fault on behalf of this client.
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest mr-1">Point scale:</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span><strong className="text-slate-700">Property Damage</strong> <span className="font-mono text-slate-500">2 pts</span></span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span><strong className="text-slate-700">Personal Injury</strong> <span className="font-mono text-slate-500">4 pts</span></span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span><strong className="text-slate-700">Fatality</strong> <span className="font-mono text-slate-500">6 pts</span></span>
          <span className="ml-auto text-[10px] text-slate-500">Total active points: <strong className="font-mono text-amber-600">{totalPts}</strong></span>
        </div>
      </div>
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">No collisions on record for period selected</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Collision Date</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Severity</th>
                  <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Case #</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Fault</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"># Vehicles</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"># Killed</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"># Injured</th>
                  <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${collSeverityBadge(r.severity)}`}>{r.severity}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.caseNum}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${collFaultBadge(r.fault)}`}>{r.fault}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-slate-700">{r.vehicles}</td>
                    <td className={`px-4 py-2.5 text-center font-mono ${r.killed > 0 ? 'font-black text-red-600' : 'text-slate-400'}`}>{r.killed}</td>
                    <td className={`px-4 py-2.5 text-center font-mono ${r.injured > 0 ? 'font-bold text-amber-600' : 'text-slate-400'}`}>{r.injured}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 4 ? '#dc2626' : r.pts >= 2 ? '#d97706' : '#94a3b8' }}>
                      {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                  <td colSpan={7} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Total</td>
                  <td className="px-4 py-2.5 text-center font-mono font-black text-amber-700">{COLLISIONS.reduce((a, r) => a + r.injured, 0)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-black text-amber-700">{totalPts}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function ConvictionsList() {
  const [page, setPage] = useState(1);
  const total = CONVICTIONS.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = CONVICTIONS.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="bg-white">
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">No convictions on record for period selected</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Conviction Date</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Loc</th>
                  <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Charge</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Nat Code</th>
                  <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Conviction Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.loc}</td>
                    <td className="px-4 py-2.5 text-slate-700">{r.charge}</td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">{r.natCode}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 3 ? '#dc2626' : r.pts >= 1 ? '#d97706' : '#94a3b8' }}>
                      {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function InspectionsList() {
  const [page, setPage] = useState(1);
  const total = INSPECTIONS.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = INSPECTIONS.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Inspection Date</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">CVSA Level</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Log</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">TDG</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Load Security</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver Name</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">{r.cvsaLevel}</td>
                <td className={`px-4 py-2.5 text-center font-semibold ${r.log === 'Warning' ? 'text-amber-600' : r.log === 'Failed' ? 'text-red-600' : 'text-emerald-600'}`}>{r.log}</td>
                <td className={`px-4 py-2.5 text-center ${r.tdg === 'Passed' ? 'text-emerald-600' : 'text-red-600'}`}>{r.tdg}</td>
                <td className={`px-4 py-2.5 text-center ${r.loadSecurity === 'Passed' ? 'text-emerald-600' : 'text-red-600'}`}>{r.loadSecurity}</td>
                <td className="px-4 py-2.5 font-semibold text-slate-800">{r.driverName}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${inspStatusBadge(r.status)}`} title={inspStatusLabel(r.status)}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={total} onPage={setPage} />
    </div>
  );
}

function AuditsList() {
  const [page, setPage] = useState(1);
  const total = AUDITS.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = AUDITS.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="bg-white">
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">No audits on record for period selected</span>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Audit Date</th>
                  <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Result</th>
                  <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Audit Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${auditResultBadge(r.result)}`}>{r.result}</span>
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">{r.auditType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ─── Main block ──────────────────────────────────────────────────────────────

export function NscGenericPerformanceBlock({
  latestPullDate = '14-Jul-2021',
  collisionPoints,
  convictionPoints,
  inspectionPoints,
  maxPoints,
}: {
  latestPullDate?: string;
  collisionPoints?: number;
  convictionPoints?: number;
  inspectionPoints?: number;
  maxPoints?: number;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const tog = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const inspPass = INSPECTIONS.filter(r => r.status === 'P').length;
  const inspWarn = INSPECTIONS.filter(r => r.status === 'W').length;
  const inspOos  = INSPECTIONS.filter(r => r.status === 'O').length;
  const collRowPts  = COLLISIONS.reduce((a, r) => a + r.pts, 0);
  const convRowPts  = CONVICTIONS.reduce((a, r) => a + r.pts, 0);
  const collInjury = COLLISIONS.filter(r => r.severity === 'Injury' || r.severity === 'Fatal' || r.severity === 'Fatality').length;

  // Prefer the profile-level point values when provided (keeps this block in sync with the top card)
  const collPts = collisionPoints ?? collRowPts;
  const convPts = convictionPoints ?? convRowPts;
  const inspPts = inspectionPoints ?? 0;
  const totalPts = collPts + convPts + inspPts;
  const maxPts   = maxPoints ?? 0;
  const pctOfMax = maxPts > 0 ? ((totalPts / maxPts) * 100).toFixed(1) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">NSC Performance</span>
        <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Latest pull &middot; {latestPullDate}</span>
        {maxPts > 0 && (
          <span className="text-[10px] text-slate-500">
            Total <strong className="font-mono text-slate-800">{totalPts}</strong> / <span className="font-mono">{maxPts}</span> pts
            {pctOfMax && <span className="ml-1 text-slate-400">({pctOfMax}% of max)</span>}
          </span>
        )}
        <span className="ml-auto text-[10px] text-slate-400">collisions &middot; convictions &middot; inspections &middot; audits</span>
      </div>
      <div className="p-4 space-y-2.5">

        <AnalysisRow
          title="Collisions"
          subtitle={COLLISIONS.length > 0
            ? `${COLLISIONS.length} collision${COLLISIONS.length !== 1 ? 's' : ''} | ${COLLISIONS.length - collInjury} property damage, ${collInjury} injury/fatal`
            : 'any accident appearing on this abstract does not indicate fault on behalf of this client'}
          statLabel="Points"
          statVal={`${collPts}`}
          badge={`${COLLISIONS.length} RECORD${COLLISIONS.length !== 1 ? 'S' : ''}`}
          badgeCls={COLLISIONS.length > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.coll}
          onToggle={() => tog('coll')}
        >
          <CollisionsList />
        </AnalysisRow>

        <AnalysisRow
          title="Convictions"
          subtitle={`${CONVICTIONS.length} conviction record${CONVICTIONS.length !== 1 ? 's' : ''} | charge, jurisdiction, and points`}
          statLabel="Points"
          statVal={`${convPts}`}
          badge={`${CONVICTIONS.length} RECORDS`}
          badgeCls={CONVICTIONS.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.conv}
          onToggle={() => tog('conv')}
        >
          <ConvictionsList />
        </AnalysisRow>

        <AnalysisRow
          title="Inspections"
          subtitle={`${INSPECTIONS.length} inspection${INSPECTIONS.length !== 1 ? 's' : ''} | ${inspPass} pass, ${inspWarn} warning, ${inspOos} out of service`}
          statLabel="Points"
          statVal={`${inspPts}`}
          badge={`${INSPECTIONS.length} INSPECTIONS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.insp}
          onToggle={() => tog('insp')}
        >
          <InspectionsList />
        </AnalysisRow>

        <AnalysisRow
          title="Audits"
          subtitle={`${AUDITS.length} audit${AUDITS.length !== 1 ? 's' : ''} on record for period selected`}
          statLabel="Latest Result"
          statVal={AUDITS[0]?.result ?? '—'}
          badge={`${AUDITS.length} RECORD${AUDITS.length !== 1 ? 'S' : ''}`}
          badgeCls={AUDITS.some(a => a.result === 'NON-COMPLIANT') ? 'bg-red-50 text-red-700 border-red-200' : AUDITS.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.aud}
          onToggle={() => tog('aud')}
        >
          <AuditsList />
        </AnalysisRow>

      </div>
    </div>
  );
}
