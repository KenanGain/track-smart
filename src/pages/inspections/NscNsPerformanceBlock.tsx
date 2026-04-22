import { useState } from 'react';
import { AnalysisRow } from './NscBcPerformanceHistory';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NsCvsaRow {
  seq: number;
  date: string;
  cvsaNumber: string;
  jur: string;
  plates: string[];
  driverMaster: string;
  result: string;
  demeritPts: number;
}

interface NsAuditRow { seq:number; date:string; auditNum:string; sequence:string; result:string }
interface NsConvictionRow { seq:number; offenceDate:string; convDate:string; ticket:string; offence:string; driverMaster:string; sectionActReg:string; pts:number }
interface NsCollisionRow { seq:number; date:string; severity:string; location:string; driverMaster:string; driverJur:string; plate:string; plateJur:string; pts:number }
interface NsWarningRow { seq:number; offenceDate:string; plate:string; driverMaster:string; statute:string; description:string }

// ─── Data ────────────────────────────────────────────────────────────────────

const NS_CVSA: NsCvsaRow[] = [
  { seq:1,  date:'29/11/2022', cvsaNumber:'445131-1',      jur:'NB', plates:['PR45273 / MB', 'PR45273 / NS'], driverMaster:'D4391-00009-90407 / ON',  result:'Passed',         demeritPts:0 },
  { seq:2,  date:'11/12/2022', cvsaNumber:'449597',        jur:'NB', plates:['PR49497 / ON', 'PR49497 / NS'], driverMaster:'3225823 / NB',             result:'Passed',         demeritPts:0 },
  { seq:3,  date:'17/01/2023', cvsaNumber:'ONEA01539682',  jur:'ON', plates:['PR48472 / NS', 'PR48472 / MB'], driverMaster:'175546217 / AB',           result:'Passed',         demeritPts:0 },
  { seq:4,  date:'31/01/2023', cvsaNumber:'448208',        jur:'NB', plates:['PR49497 / NS', 'PT82987 / NS'], driverMaster:'A58340000770805 / ON',     result:'Passed',         demeritPts:0 },
  { seq:5,  date:'23/02/2023', cvsaNumber:'665463',        jur:'NS', plates:['PR44654 / NS', 'T4357W / ON'],  driverMaster:'SINGH210898005 / NS',      result:'Passed',         demeritPts:0 },
  { seq:6,  date:'16/03/2023', cvsaNumber:'666079',        jur:'NS', plates:['PR49343 / NS', 'X5728P / ON'],  driverMaster:'J64570000940315 / ON',     result:'Defect Noted',   demeritPts:0 },
  { seq:7,  date:'22/03/2023', cvsaNumber:'666292',        jur:'NS', plates:['PR49497 / NS', 'TH9321 / MB'],  driverMaster:'A58340000770805 / ON',     result:'Defect Noted',   demeritPts:0 },
  { seq:8,  date:'24/03/2023', cvsaNumber:'449276',        jur:'NB', plates:['PT82569 / NS'],                  driverMaster:'A58340000770805 / ON',     result:'Passed',         demeritPts:0 },
  { seq:9,  date:'28/03/2023', cvsaNumber:'666467',        jur:'NS', plates:['PT82466 / NS', 'PR44654 / NS'], driverMaster:'SINGH210898005 / NS',      result:'Passed',         demeritPts:0 },
  { seq:10, date:'12/04/2023', cvsaNumber:'ONEA01555539',  jur:'ON', plates:['PR47116 / ON', 'PR47116 / NS'], driverMaster:'SINGH120992005 / NS',      result:'Passed',         demeritPts:0 },
  { seq:11, date:'13/04/2023', cvsaNumber:'ONEA01555996',  jur:'ON', plates:['PR48472 / NS', 'PR48472 / MB'], driverMaster:'S44901690940101 / ON',     result:'Passed',         demeritPts:0 },
  { seq:12, date:'15/04/2023', cvsaNumber:'452679',        jur:'NB', plates:['PR45276 / NS'],                  driverMaster:'D43910000990407 / ON',     result:'Passed',         demeritPts:0 },
  { seq:13, date:'25/04/2023', cvsaNumber:'667415',        jur:'NS', plates:['TC1771 / MB', 'PR49497 / NS'],  driverMaster:'SINGH210898005 / NS',      result:'Out-of-Service', demeritPts:3 },
  { seq:14, date:'19/05/2023', cvsaNumber:'668953',        jur:'NS', plates:['PR45273 / NS', 'TC4581 / MB'],  driverMaster:'SINGH120992005 / NS',      result:'Passed',         demeritPts:0 },
  { seq:15, date:'07/06/2023', cvsaNumber:'669542',        jur:'NS', plates:['PT82947 / NS', 'PR45276 / NS'], driverMaster:'D43910000990407 / ON',     result:'Passed',         demeritPts:0 },
  { seq:16, date:'15/06/2023', cvsaNumber:'669846',        jur:'NS', plates:['PR47116 / NS', 'T1087C / ON'],  driverMaster:'SINGH210898005 / NS',      result:'Defect Noted',   demeritPts:0 },
  { seq:17, date:'24/06/2023', cvsaNumber:'670266',        jur:'NS', plates:['W7664P / ON', 'PR44654 / NS'],  driverMaster:'A58340000770805 / ON',     result:'Defect Noted',   demeritPts:0 },
  { seq:18, date:'30/06/2023', cvsaNumber:'ONEA01571114',  jur:'ON', plates:['PT82489 / NS', 'PR45273 / NS'], driverMaster:'S04036398930615 / ON',     result:'Passed',         demeritPts:0 },
];

const NS_AUDITS: NsAuditRow[] = [
  { seq:1, date:'28/04/2023', auditNum:'34843', sequence:'1', result:'Compliant' },
];

const NS_CONVICTIONS: NsConvictionRow[] = [
  { seq:1, offenceDate:'19/11/2020', convDate:'19/01/2021', ticket:'5488801', offence:'OPER VEH NOT CONFORMING WITH SPECIAL PERMIT', driverMaster:'CZIPP141270003', sectionActReg:'11 9 WDVR', pts:3 },
];

const NS_COLLISIONS: NsCollisionRow[] = [
  { seq:1, date:'04/09/2020', severity:'PROPERTY DAMAGE', location:'MONTREAL / QC', driverMaster:'', driverJur:'ON', plate:'PR42409', plateJur:'NS', pts:0 },
];

const NS_WARNINGS: NsWarningRow[] = [
  { seq:1, offenceDate:'05/09/2023', plate:'PR45273', driverMaster:'SINGH120992005',   statute:'CVDH 7 1 A', description:'FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME' },
  { seq:2, offenceDate:'20/06/2024', plate:'PR45276', driverMaster:'S04036398930615',  statute:'MVA 20 2',   description:'LICENSE PLATE NOT CLEARLY LEGIBLE (NUMBERS WEARING OFF)' },
];

const PAGE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cvsaResultBadge(r: string) {
  if (r === 'Out-of-Service') return 'bg-red-50 text-red-700 border-red-200';
  if (r === 'Defect Noted')   return 'bg-amber-50 text-amber-700 border-amber-200';
  if (r === 'Passed')         return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function auditResultBadge(r: string) {
  if (r === 'Compliant')      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (r === 'Non-Compliant')  return 'bg-red-50 text-red-700 border-red-200';
  if (r === 'Conditional')    return 'bg-amber-50 text-amber-700 border-amber-200';
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

function NsCvsaList() {
  const [page, setPage] = useState(1);
  const total = NS_CVSA.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = NS_CVSA.slice((page - 1) * PAGE, page * PAGE);
  const totalPts = NS_CVSA.reduce((a, r) => a + r.demeritPts, 0);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date (dd/mm/yyyy)</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">CVSA Number</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Plate Number(s)</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Driver Master No.</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">CVSA Result</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Demerit Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.cvsaNumber}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.jur}</td>
                <td className="px-4 py-2.5">
                  {r.plates.map((p, j) => (
                    <div key={j} className="font-mono text-[10px] text-slate-700 whitespace-nowrap">{p}</div>
                  ))}
                </td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-slate-700 whitespace-nowrap">{r.driverMaster}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${cvsaResultBadge(r.result)}`}>{r.result}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.demeritPts >= 3 ? '#dc2626' : r.demeritPts >= 1 ? '#d97706' : '#94a3b8' }}>
                  {r.demeritPts > 0 ? r.demeritPts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t border-slate-300 font-bold">
              <td colSpan={7} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Total Demerit Points</td>
              <td className="px-4 py-2.5 text-right font-mono font-black text-amber-700">{totalPts}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Pagination page={page} pages={pages} total={total} onPage={setPage} />
    </div>
  );
}

function NsAuditHistoryList() {
  const total = NS_AUDITS.length;

  return (
    <div className="bg-white">
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">There are no Audit History records.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Audit Date</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Audit # / Sequence #</th>
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">Audit Result</th>
              </tr>
            </thead>
            <tbody>
              {NS_AUDITS.map((r, i) => (
                <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.auditNum} / {r.sequence}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${auditResultBadge(r.result)}`}>{r.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NsConvictionsList() {
  const total = NS_CONVICTIONS.length;
  const totalPts = NS_CONVICTIONS.reduce((a, r) => a + r.pts, 0);

  return (
    <div className="bg-white">
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">There are no Conviction records.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Offence Date / Conv Date</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticket No.</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Offence</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Driver Master No.</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Section Act/Reg.</th>
                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Demerit Points</th>
              </tr>
            </thead>
            <tbody>
              {NS_CONVICTIONS.map((r, i) => (
                <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="font-mono text-slate-800">{r.offenceDate}</div>
                    <div className="font-mono text-[10px] text-slate-500">{r.convDate}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.ticket}</td>
                  <td className="px-4 py-2.5 text-slate-700">{r.offence}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-700 whitespace-nowrap">{r.driverMaster}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.sectionActReg}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 3 ? '#dc2626' : r.pts >= 1 ? '#d97706' : '#94a3b8' }}>
                    {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                <td colSpan={6} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Totals &middot; {total} record{total !== 1 ? 's' : ''}</td>
                <td className="px-4 py-2.5 text-right font-mono font-black text-amber-700">{totalPts}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function NsCollisionsList() {
  const total = NS_COLLISIONS.length;
  const totalPts = NS_COLLISIONS.reduce((a, r) => a + r.pts, 0);

  return (
    <div className="bg-white">
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">There are no Collision records.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Collision Date</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Severity</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Driver Master # / Jur.</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate # / Jur.</th>
                <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Demerit Points</th>
              </tr>
            </thead>
            <tbody>
              {NS_COLLISIONS.map((r, i) => (
                <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      r.severity === 'FATAL'                          ? 'bg-red-50 text-red-700 border-red-200'   :
                      r.severity.includes('INJURY') || r.severity.includes('Injury') ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                       'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>{r.severity}</span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-700">{r.location}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                    {r.driverMaster || <span className="text-slate-300">&mdash;</span>} / <span className="font-bold">{r.driverJur}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} / <span className="font-bold">{r.plateJur}</span></td>
                  <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 4 ? '#dc2626' : r.pts >= 2 ? '#d97706' : '#94a3b8' }}>
                    {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                <td colSpan={6} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Totals &middot; {total} record{total !== 1 ? 's' : ''}</td>
                <td className="px-4 py-2.5 text-right font-mono font-black text-amber-700">{totalPts}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function NsWarningsList() {
  const total = NS_WARNINGS.length;

  return (
    <div className="bg-white">
      {total === 0 ? (
        <div className="px-5 py-6 flex items-center gap-3 bg-emerald-50/30">
          <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
          <span className="text-[11px] text-slate-600 font-medium italic">There are no Traffic Offence Report records.</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Offence Date (dd/mm/yyyy)</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate Number</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Driver Master No.</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Statute / Sect. Sub-Sect / Clause</th>
                <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {NS_WARNINGS.map((r, i) => (
                <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.offenceDate}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate}</td>
                  <td className="px-4 py-2.5 font-mono text-[10px] text-slate-700 whitespace-nowrap">{r.driverMaster}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.statute}</td>
                  <td className="px-4 py-2.5 text-slate-700">{r.description}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                <td colSpan={5} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Totals</td>
                <td className="px-4 py-2.5 font-mono font-black text-slate-800">{total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main block ──────────────────────────────────────────────────────────────

export function NscNsPerformanceBlock({ latestPullDate = '19-Aug-2022' }: { latestPullDate?: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const tog = (k: string) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const cvsaOos    = NS_CVSA.filter(r => r.result === 'Out-of-Service').length;
  const cvsaDefect = NS_CVSA.filter(r => r.result === 'Defect Noted').length;
  const cvsaPass   = NS_CVSA.filter(r => r.result === 'Passed').length;
  const cvsaPts    = NS_CVSA.reduce((a, r) => a + r.demeritPts, 0);
  const convPts    = NS_CONVICTIONS.reduce((a, r) => a + r.pts, 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">NSC Performance</span>
        <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Latest pull &middot; {latestPullDate}</span>
        <span className="ml-auto text-[10px] text-slate-400">CVSA &middot; audits &middot; convictions &middot; collisions &middot; warnings</span>
      </div>
      <div className="p-4 space-y-2.5">

        <AnalysisRow
          title="CVSA Inspection"
          subtitle={`${NS_CVSA.length} inspection${NS_CVSA.length !== 1 ? 's' : ''} | ${cvsaPass} passed, ${cvsaDefect} defect noted, ${cvsaOos} out-of-service`}
          statLabel="Demerit Pts"
          statVal={`${cvsaPts}`}
          badge={`${NS_CVSA.length} RECORDS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.cvsa}
          onToggle={() => tog('cvsa')}
        >
          <NsCvsaList />
        </AnalysisRow>

        <AnalysisRow
          title="Audit History"
          subtitle={`${NS_AUDITS.length} audit${NS_AUDITS.length !== 1 ? 's' : ''} on record for period selected`}
          statLabel="Latest Result"
          statVal={NS_AUDITS[0]?.result ?? '—'}
          badge={`${NS_AUDITS.length} RECORD${NS_AUDITS.length !== 1 ? 'S' : ''}`}
          badgeCls={NS_AUDITS.some(a => a.result !== 'Compliant') ? 'bg-red-50 text-red-700 border-red-200' : NS_AUDITS.length > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.audit}
          onToggle={() => tog('audit')}
        >
          <NsAuditHistoryList />
        </AnalysisRow>

        <AnalysisRow
          title="Convictions"
          subtitle={NS_CONVICTIONS.length > 0 ? `${NS_CONVICTIONS.length} conviction record${NS_CONVICTIONS.length !== 1 ? 's' : ''} | offence, ticket, act/section, and points` : 'There are no Conviction records.'}
          statLabel="Demerit Pts"
          statVal={`${convPts}`}
          badge={`${NS_CONVICTIONS.length} RECORD${NS_CONVICTIONS.length !== 1 ? 'S' : ''}`}
          badgeCls={NS_CONVICTIONS.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.conv}
          onToggle={() => tog('conv')}
        >
          <NsConvictionsList />
        </AnalysisRow>

        <AnalysisRow
          title="Collisions"
          subtitle={NS_COLLISIONS.length > 0 ? `${NS_COLLISIONS.length} collision record${NS_COLLISIONS.length !== 1 ? 's' : ''} | severity, location, driver, vehicle` : 'There are no Collision records.'}
          statLabel="Demerit Pts"
          statVal={`${NS_COLLISIONS.reduce((a, r) => a + r.pts, 0)}`}
          badge={`${NS_COLLISIONS.length} RECORD${NS_COLLISIONS.length !== 1 ? 'S' : ''}`}
          badgeCls={NS_COLLISIONS.length > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.coll}
          onToggle={() => tog('coll')}
        >
          <NsCollisionsList />
        </AnalysisRow>

        <AnalysisRow
          title="Traffic Offence Reports"
          subtitle={`${NS_WARNINGS.length} warning ticket${NS_WARNINGS.length !== 1 ? 's' : ''} | plate, driver, statute, description`}
          statLabel="Warnings"
          statVal={`${NS_WARNINGS.length}`}
          badge={`${NS_WARNINGS.length} RECORD${NS_WARNINGS.length !== 1 ? 'S' : ''}`}
          badgeCls={NS_WARNINGS.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.warn}
          onToggle={() => tog('warn')}
        >
          <NsWarningsList />
        </AnalysisRow>

      </div>
    </div>
  );
}
