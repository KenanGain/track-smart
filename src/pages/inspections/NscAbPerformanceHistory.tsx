import React, { useState } from 'react';
import { Activity, Search, Columns3, ChevronDown, ChevronRight } from 'lucide-react';
import { AB_PULL_DATA } from './NscAbPullByPull';

// ─── AB Conviction data (real) ───────────────────────────────────────────────

interface AbConvictionGroupRow { group: string; count: number; pct: string }
interface AbConvictionSummaryRow { seq:number; date:string; document:string; docket:string; jur:string; vehicle:string; driverName:string; offence:string; pts:number }
interface AbConvictionDetailRow {
  seq:number;
  date:string; time:string; document:string; docket:string; jurisdiction:string; dateEntered:string;
  issuingAgency:string; location:string; driver:string; vehicle:string; commodity:string;
  actSection:string; actDesc:string; ccmtaCode:string; convVehicle:string; convDate:string; activePts:number;
}

const AB_CONV_GROUPS: AbConvictionGroupRow[] = [
  { group:'Speeding',                                                     count:0, pct:'' },
  { group:'Stop signs/Traffic lights',                                    count:0, pct:'' },
  { group:'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)',    count:0, pct:'' },
  { group:'Driving (Passing, Disobey Signs, Signals, etc.)',              count:2, pct:'100.0%' },
  { group:'Hours of Service',                                             count:0, pct:'' },
  { group:'Trip Inspections',                                             count:0, pct:'' },
  { group:'Brakes',                                                       count:0, pct:'' },
  { group:'CVIP',                                                         count:0, pct:'' },
  { group:'Mechanical Defects',                                           count:0, pct:'' },
  { group:'Oversize/Overweight',                                          count:0, pct:'' },
  { group:'Security of Loads',                                            count:0, pct:'' },
  { group:'Dangerous Goods',                                              count:0, pct:'' },
  { group:'Criminal Code',                                                count:0, pct:'' },
  { group:'Permits',                                                      count:0, pct:'' },
  { group:'Miscellaneous',                                                count:0, pct:'' },
  { group:'Administrative Actions',                                       count:0, pct:'' },
];
const AB_CONV_TOTAL = { count: 2, pct: '100%' };

const AB_CONV_SUMMARY: AbConvictionSummaryRow[] = [
  { seq:1, date:'2022 FEB 25', document:'TVT E18718140A', docket:'E18718140A', jur:'AB', vehicle:'A24172 AB', driverName:'IOURI VAKOULENKO', offence:'FAIL TO OBEY DEVICE', pts:0 },
  { seq:2, date:'2020 JUL 03', document:'OPC 16384493',    docket:'16384493',   jur:'ON', vehicle:'U39627 AB', driverName:'',                   offence:'DRIVING CONTRARY TO SIGN', pts:0 },
];

const AB_CONV_DETAILS: AbConvictionDetailRow[] = [
  {
    seq:1,
    date:'2022 FEB 25', time:'14:50', document:'TVT E18718140A', docket:'E18718140A', jurisdiction:'AB', dateEntered:'2022 MAR 11',
    issuingAgency:'INT. TRAF. UNIT - HIGH RIVER', location:'CALGARY',
    driver:'IOURI VAKOULENKO V02233640610414 ON', vehicle:'A24172 AB', commodity:'1',
    actSection:'304/0257', actDesc:'FAIL TO OBEY TRAFFIC CONTROL', ccmtaCode:'317 FAIL TO OBEY DEVICE',
    convVehicle:'A24172 AB', convDate:'2022 FEB 28', activePts:0,
  },
  {
    seq:2,
    date:'2020 JUL 03', time:'15:04', document:'OPC 16384493', docket:'16384493', jurisdiction:'ON', dateEntered:'2021 AUG 31',
    issuingAgency:'', location:'@ABHWY 11 - CLERGUE TWP',
    driver:'', vehicle:'U39627 AB', commodity:'2',
    actSection:'', actDesc:'', ccmtaCode:'330 DRIVING CONTRARY TO SIGN',
    convVehicle:'U39627 AB', convDate:'2021 AUG 19', activePts:0,
  },
];

const AB_CONV_PAGE = 10;

export function AbConvictionAnalysisTable() {
  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Number of Convictions</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Percent of Total</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Group Description</th>
            </tr>
          </thead>
          <tbody>
            {AB_CONV_GROUPS.map((row, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                <td className={`px-4 py-2 text-center font-mono ${row.count > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.count > 0 ? row.count : ''}</td>
                <td className={`px-4 py-2 text-center font-mono ${row.pct ? 'font-semibold text-slate-600' : 'text-slate-300'}`}>{row.pct || ''}</td>
                <td className={`px-4 py-2 ${row.count > 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{row.group}</td>
              </tr>
            ))}
            <tr className="bg-slate-100 border-t border-slate-300 font-bold">
              <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{AB_CONV_TOTAL.count}</td>
              <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{AB_CONV_TOTAL.pct}</td>
              <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Total Convictions</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AbConvictionSummaryList() {
  const [page, setPage] = useState(1);
  const total = AB_CONV_SUMMARY.length;
  const pages = Math.max(1, Math.ceil(total / AB_CONV_PAGE));
  const rows  = AB_CONV_SUMMARY.slice((page - 1) * AB_CONV_PAGE, page * AB_CONV_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Document #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Docket #</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Vehicle</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver Name &middot; Offence</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Active Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.document}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.docket}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.jur}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.vehicle}</td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{r.driverName || <span className="text-slate-400 italic font-normal">Name not on file</span>}</div>
                  <div className="text-[10px] text-slate-500">{r.offence}</div>
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 3 ? '#dc2626' : r.pts >= 1 ? '#d97706' : '#94a3b8' }}>
                  {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_CONV_PAGE + 1}&ndash;{Math.min(page * AB_CONV_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

export function AbConvictionDetailsList() {
  const [page, setPage] = useState(1);
  const total = AB_CONV_DETAILS.length;
  const pages = Math.max(1, Math.ceil(total / AB_CONV_PAGE));
  const rows  = AB_CONV_DETAILS.slice((page - 1) * AB_CONV_PAGE, page * AB_CONV_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Document &middot; Docket</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur &middot; Entered</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Issuing Agency &middot; Location</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver &middot; Vehicle</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Act/Section &middot; CCMTA Code</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Conv Date</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500 align-top">{r.seq}</td>
                <td className="px-4 py-2.5 whitespace-nowrap align-top">
                  <div className="font-mono text-slate-800">{r.date}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.time}</div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap align-top">
                  <div className="font-mono text-slate-700">{r.document}</div>
                  <div className="text-[10px] font-mono text-slate-500">Docket {r.docket}</div>
                </td>
                <td className="px-4 py-2.5 text-center align-top whitespace-nowrap">
                  <div className="font-semibold text-slate-700">{r.jurisdiction}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.dateEntered}</div>
                </td>
                <td className="px-4 py-2.5 align-top">
                  <div className="text-slate-700">{r.issuingAgency || <span className="text-slate-300">&mdash;</span>}</div>
                  <div className="text-[10px] text-slate-500">{r.location || <span className="text-slate-300">&mdash;</span>}</div>
                </td>
                <td className="px-4 py-2.5 align-top">
                  <div className="font-semibold text-slate-800">{r.driver || <span className="text-slate-400 italic font-normal">Name not on file</span>}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.vehicle} &middot; Commodity {r.commodity}</div>
                </td>
                <td className="px-4 py-2.5 align-top">
                  <div className="font-mono text-slate-700">{r.actSection || <span className="text-slate-300">&mdash;</span>}</div>
                  <div className="text-[10px] text-slate-500">{r.actDesc || ''}</div>
                  <div className="text-[10px] font-mono font-bold text-slate-600 mt-0.5">{r.ccmtaCode}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap align-top">{r.convDate}</td>
                <td className="px-4 py-2.5 text-right font-mono font-black align-top" style={{ color: r.activePts >= 3 ? '#dc2626' : r.activePts >= 1 ? '#d97706' : '#94a3b8' }}>
                  {r.activePts > 0 ? r.activePts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_CONV_PAGE + 1}&ndash;{Math.min(page * AB_CONV_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── AB CVSA Inspection data (Part 3) ────────────────────────────────────────

interface AbCvsaDefectRow { code:string; label:string; oos?:number; req?:number; total?:number; pct?:string }
interface AbCvsaSummaryRow { seq:number; date:string; document:string; jur:string; agency:string; plate:string; plateJur:string; level:number; result:string }
interface AbCvsaVehicle { type:string; plate:string; jur:string; vin?:string; year?:string; make?:string; decal?:string }
interface AbCvsaDefect { cat:string; vehicle:number; kind:'OOS' | 'REQ' }
interface AbCvsaDetailRow {
  seq:number;
  date:string; time:string; document:string; jur:string; level:number; result:string; dateEntered:string;
  agency:string; location:string; driver:string;
  vehicles: AbCvsaVehicle[];
  defects: AbCvsaDefect[];
}

const AB_CVSA_DEFECTS: AbCvsaDefectRow[] = [
  { code:'1',  label:'Driver Credentials',                                oos:1, req:2, total:3, pct:'37.5%' },
  { code:'2',  label:'Hours Of Service',                                  oos:1, req:1, total:2, pct:'25.0%' },
  { code:'3',  label:'Brake Adjustment' },
  { code:'4',  label:'Brake Systems',                                            req:1, total:1, pct:'12.5%' },
  { code:'5',  label:'Coupling Devices' },
  { code:'6',  label:'Exhaust Systems' },
  { code:'7',  label:'Frames' },
  { code:'8',  label:'Fuel Systems' },
  { code:'9',  label:'Lighting Devices (Part II Section 8 OOSC only)',    oos:1,        total:1, pct:'12.5%' },
  { code:'10', label:'Cargo Securement' },
  { code:'11', label:'Steering Mechanisms' },
  { code:'12', label:'Suspensions' },
  { code:'13', label:'Tires' },
  { code:'14', label:'Van/Open-top Trailer Bodies' },
  { code:'15', label:'Wheels, Rims & Hubs' },
  { code:'16', label:'Windshield Wipers' },
  { code:'17', label:'Emergency Exits/Wiring & Electrical Systems (Buses)' },
  { code:'18', label:'Dangerous Goods',                                          req:1, total:1, pct:'12.5%' },
  { code:'19', label:'Driveline/Driveshaft' },
];
const AB_CVSA_DEFECT_TOTAL = { oos:3, req:5, total:8, pct:'100%' };

const AB_CVSA_SUMMARY: AbCvsaSummaryRow[] = [
  { seq:1, date:'2018 DEC 12', document:'OPI ONEA01273068', jur:'ON', agency:'', plate:'U04031', plateJur:'AB', level:2, result:'Out of Service' },
  { seq:2, date:'2018 NOV 27', document:'OPI ONEA01263997', jur:'ON', agency:'', plate:'U04031', plateJur:'AB', level:2, result:'Out of Service' },
  { seq:3, date:'2018 NOV 10', document:'OPI 8628393',      jur:'BC', agency:'', plate:'N3759S', plateJur:'ON', level:2, result:'Out of Service' },
  { seq:4, date:'2018 OCT 17', document:'OPI ONEA01251954', jur:'ON', agency:'', plate:'E77384', plateJur:'AB', level:2, result:'Passed' },
  { seq:5, date:'2018 SEP 25', document:'OPI ONEA01249644', jur:'ON', agency:'', plate:'E80652', plateJur:'AB', level:2, result:'Passed' },
  { seq:6, date:'2018 AUG 16', document:'OPI ONEA01237362', jur:'ON', agency:'', plate:'E75062', plateJur:'AB', level:2, result:'Passed' },
  { seq:7, date:'2018 JUN 13', document:'OPI ONEA01215795', jur:'ON', agency:'', plate:'E65114', plateJur:'AB', level:2, result:'Passed' },
  { seq:8, date:'2018 JUN 05', document:'OPI ONEA01219694', jur:'ON', agency:'', plate:'E65208', plateJur:'AB', level:1, result:'Requires Attention' },
  { seq:9, date:'2018 JUN 01', document:'OPI ONEA01211359', jur:'ON', agency:'', plate:'E65114', plateJur:'AB', level:2, result:'Requires Attention' },
];

const AB_CVSA_DETAILS: AbCvsaDetailRow[] = [
  {
    seq:1, date:'2018 DEC 12', time:'19:25', document:'OPI ONEA01273068', jur:'ON', level:2, result:'Out of Service', dateEntered:'2018 DEC 18',
    agency:'', location:'HEYDEN TIS', driver:'Gursharan Singh Grewal G73663088800917 ON',
    vehicles:[
      { type:'P',  plate:'U04031', jur:'AB', vin:'4V4NC9EH9GN928469', year:'2016', make:'Volvo' },
      { type:'ST', plate:'N9446R', jur:'ON', make:'CIMC' },
    ],
    defects:[ { cat:'9 - Lighting Devices (Part II Section 8 OOSC only)', vehicle:2, kind:'OOS' } ],
  },
  {
    seq:2, date:'2018 NOV 27', time:'13:11', document:'OPI ONEA01263997', jur:'ON', level:2, result:'Out of Service', dateEntered:'2018 DEC 04',
    agency:'', location:'HEYDEN TIS', driver:'Gursharan Singh Grewal G73663088800917 ON',
    vehicles:[
      { type:'P',  plate:'U04031', jur:'AB', vin:'4V4NC9EH9GN928469', year:'2016', make:'Volvo' },
      { type:'ST', plate:'M5787W', jur:'ON', make:'VANG' },
    ],
    defects:[
      { cat:'2 - Hours Of Service', vehicle:2, kind:'OOS' },
      { cat:'1 - Driver Credentials', vehicle:1, kind:'REQ' },
      { cat:'18 - Dangerous Goods',   vehicle:2, kind:'REQ' },
    ],
  },
  {
    seq:3, date:'2018 NOV 10', time:'13:11', document:'OPI 8628393', jur:'BC', level:2, result:'Out of Service', dateEntered:'2018 NOV 13',
    agency:'', location:'KAMLOOPS', driver:'SIVALOGANATHAN NADESU 6550853 BC',
    vehicles:[
      { type:'ST', plate:'N3759S', jur:'ON', make:'UTIL' },
      { type:'P',  plate:'E77384', jur:'AB', vin:'4V4NC9EH4GN929559', year:'2016', make:'Volvo' },
    ],
    defects:[ { cat:'1 - Driver Credentials', vehicle:2, kind:'OOS' } ],
  },
  {
    seq:4, date:'2018 OCT 17', time:'12:40', document:'OPI ONEA01251954', jur:'ON', level:2, result:'Passed', dateEntered:'2018 OCT 23',
    agency:'', location:'WASSI NORTH TIS', driver:'SIVALOGANATHAN NADESU 6550853 BC',
    vehicles:[
      { type:'P',  plate:'E77384', jur:'AB', vin:'4V4NC9EH4GN929559', year:'2016', make:'Volvo' },
      { type:'ST', plate:'R8098J', jur:'ON', make:'UTIL' },
    ],
    defects:[],
  },
  {
    seq:5, date:'2018 SEP 25', time:'13:56', document:'OPI ONEA01249644', jur:'ON', level:2, result:'Passed', dateEntered:'2018 OCT 02',
    agency:'', location:'NEW LISKEARD TIS', driver:'MOHAN SINGH M61600000720815 ON',
    vehicles:[
      { type:'P',  plate:'E80652', jur:'AB', vin:'4V4NC9EH7EN152680', year:'2014', make:'Volvo' },
      { type:'ST', plate:'P8978W', jur:'ON', make:'UTIL' },
    ],
    defects:[],
  },
  {
    seq:6, date:'2018 AUG 16', time:'21:45', document:'OPI ONEA01237362', jur:'ON', level:2, result:'Passed', dateEntered:'2018 AUG 28',
    agency:'', location:'GANANOQUE SOUTH TIS', driver:'MIAN NISAR AHMED M500620055600 QC',
    vehicles:[
      { type:'P',  plate:'E75062', jur:'AB', vin:'4V4NC9EH6DN133195', year:'2013', make:'Volvo' },
      { type:'ST', plate:'P6331S', jur:'ON', make:'UTIL' },
    ],
    defects:[],
  },
  {
    seq:7, date:'2018 JUN 13', time:'22:30', document:'OPI ONEA01215795', jur:'ON', level:2, result:'Passed', dateEntered:'2018 JUN 26',
    agency:'', location:'WASSI SOUTH TIS', driver:'Harjinder Singh Gill 168548-543 AB',
    vehicles:[
      { type:'P',  plate:'E65114', jur:'AB', vin:'4V4NC9EJ7FN180094', year:'2015', make:'Volvo' },
      { type:'ST', plate:'P3361X', jur:'ON', make:'UTIL' },
    ],
    defects:[],
  },
  {
    seq:8, date:'2018 JUN 05', time:'08:50', document:'OPI ONEA01219694', jur:'ON', level:1, result:'Requires Attention', dateEntered:'2018 JUN 12',
    agency:'', location:'COCHRANE TIS', driver:'AMRINDER SINGH GILL G43500408841006 ON',
    vehicles:[
      { type:'P',  plate:'E65208', jur:'AB', vin:'1XPXD49X1JD467897', year:'2018', make:'Peterbilt' },
      { type:'ST', plate:'R8066J', jur:'ON', make:'UTIL' },
    ],
    defects:[],
  },
  {
    seq:9, date:'2018 JUN 01', time:'', document:'OPI ONEA01211359', jur:'ON', level:2, result:'Requires Attention', dateEntered:'',
    agency:'', location:'', driver:'',
    vehicles:[
      { type:'P',  plate:'E65114', jur:'AB' },
    ],
    defects:[],
  },
];

const AB_CVSA_PAGE = 10;

function cvsaResultBadgeAb(result: string) {
  if (result === 'Out of Service')    return 'bg-red-50 text-red-700 border-red-200';
  if (result === 'Requires Attention') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (result === 'Passed')            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function AbCvsaInspectionAnalysisTable() {
  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Out of Service</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Requires Attention</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total Defects</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Percent of Total</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Defect Category / Description</th>
            </tr>
          </thead>
          <tbody>
            {AB_CVSA_DEFECTS.map((row, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                <td className={`px-4 py-2 text-center font-mono ${row.oos ? 'font-bold text-red-600' : 'text-slate-300'}`}>{row.oos ?? ''}</td>
                <td className={`px-4 py-2 text-center font-mono ${row.req ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.req ?? ''}</td>
                <td className={`px-4 py-2 text-center font-mono ${row.total ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.total ?? ''}</td>
                <td className={`px-4 py-2 text-center font-mono ${row.pct ? 'font-semibold text-slate-600' : 'text-slate-300'}`}>{row.pct ?? ''}</td>
                <td className={`px-4 py-2 ${row.total ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                  <span className="font-mono text-slate-500 mr-2">{row.code} -</span>{row.label}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 border-t border-slate-300 font-bold">
              <td className="px-4 py-2.5 text-center font-mono font-black text-red-700">{AB_CVSA_DEFECT_TOTAL.oos}</td>
              <td className="px-4 py-2.5 text-center font-mono font-black text-amber-700">{AB_CVSA_DEFECT_TOTAL.req}</td>
              <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{AB_CVSA_DEFECT_TOTAL.total}</td>
              <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{AB_CVSA_DEFECT_TOTAL.pct}</td>
              <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Grand Total Defects</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AbCvsaInspectionSummaryList() {
  const [page, setPage] = useState(1);
  const total = AB_CVSA_SUMMARY.length;
  const pages = Math.max(1, Math.ceil(total / AB_CVSA_PAGE));
  const rows  = AB_CVSA_SUMMARY.slice((page - 1) * AB_CVSA_PAGE, page * AB_CVSA_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">CVSA Document</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur</th>
              <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider">Agency</th>
              <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Level</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.document}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.jur}</td>
                <td className="px-4 py-2.5 text-slate-600">{r.agency || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">{r.level}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${cvsaResultBadgeAb(r.result)}`}>{r.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_CVSA_PAGE + 1}&ndash;{Math.min(page * AB_CVSA_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

export function AbCvsaInspectionDetailsList() {
  const [page, setPage] = useState(1);
  const total = AB_CVSA_DETAILS.length;
  const pages = Math.max(1, Math.ceil(total / AB_CVSA_PAGE));
  const rows  = AB_CVSA_DETAILS.slice((page - 1) * AB_CVSA_PAGE, page * AB_CVSA_PAGE);

  return (
    <div className="bg-white">
      <div className="divide-y divide-slate-200">
        {rows.map(rec => {
          const oosDefects = rec.defects.filter(d => d.kind === 'OOS');
          const reqDefects = rec.defects.filter(d => d.kind === 'REQ');
          return (
            <div key={rec.seq} className="p-4">
              {/* Row 1: Date/Time/Doc/Jur/Level/Result/DateEntered */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-slate-200 rounded">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">#</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Date</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Time</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Document</th>
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Jur</th>
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Level</th>
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Result</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500">Date Entered</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-white">
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{rec.seq}</td>
                      <td className="px-3 py-2 font-mono text-slate-800 border-r border-slate-100 whitespace-nowrap">{rec.date}</td>
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">{rec.time || <span className="text-slate-300">&mdash;</span>}</td>
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100 whitespace-nowrap">{rec.document}</td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-100">{rec.jur}</td>
                      <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-100">{rec.level}</td>
                      <td className="px-3 py-2 text-center border-r border-slate-100">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${cvsaResultBadgeAb(rec.result)}`}>{rec.result}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{rec.dateEntered || <span className="text-slate-300">&mdash;</span>}</td>
                    </tr>
                    {/* Agency / Location / Driver row */}
                    <tr className="bg-slate-50/60 border-t border-slate-200">
                      <th colSpan={2} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Agency</th>
                      <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Location</th>
                      <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">Driver</th>
                    </tr>
                    <tr className="bg-white">
                      <td colSpan={2} className="px-3 py-2 text-slate-700 border-r border-slate-100">{rec.agency || <span className="text-slate-300">&mdash;</span>}</td>
                      <td colSpan={3} className="px-3 py-2 text-slate-700 border-r border-slate-100">{rec.location || <span className="text-slate-300">&mdash;</span>}</td>
                      <td colSpan={3} className="px-3 py-2 text-slate-700 font-mono text-[10px]">{rec.driver || <span className="text-slate-300">&mdash;</span>}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Vehicles sub-table */}
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-[11px] border-collapse border border-slate-200 rounded">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">#</th>
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Type</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Plate</th>
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Jur</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">VIN</th>
                      <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Year</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Make</th>
                      <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500">CVSA Decal #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rec.vehicles.map((v, j) => (
                      <tr key={j} className={j % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{j + 1}</td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-100">{v.type}</td>
                        <td className="px-3 py-2 font-mono text-slate-800 border-r border-slate-100">{v.plate}</td>
                        <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-100">{v.jur}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-600 border-r border-slate-100">{v.vin || <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600 border-r border-slate-100">{v.year || <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-3 py-2 text-slate-700 border-r border-slate-100">{v.make || <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{v.decal || <span className="text-slate-300">&mdash;</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Defects summary */}
              {(oosDefects.length > 0 || reqDefects.length > 0) && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                  {oosDefects.length > 0 && (
                    <div className="rounded border border-red-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-red-50 border-b border-red-200 text-[9px] font-black text-red-700 uppercase tracking-wider">Out of Service Defects (O)</div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-white border-b border-red-100">
                            <th className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">Defect Category / Description</th>
                            <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500">By Vehicle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {oosDefects.map((d, k) => (
                            <tr key={k} className="bg-white">
                              <td className="px-3 py-1.5 text-slate-700 text-[11px]">{d.cat}</td>
                              <td className="px-3 py-1.5 text-center font-mono font-bold text-red-600">V{d.vehicle}: 1</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {reqDefects.length > 0 && (
                    <div className="rounded border border-amber-200 overflow-hidden">
                      <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-[9px] font-black text-amber-700 uppercase tracking-wider">Requires Attention Defects (X)</div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-white border-b border-amber-100">
                            <th className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">Defect Category / Description</th>
                            <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500">By Vehicle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reqDefects.map((d, k) => (
                            <tr key={k} className="bg-white">
                              <td className="px-3 py-1.5 text-slate-700 text-[11px]">{d.cat}</td>
                              <td className="px-3 py-1.5 text-center font-mono font-bold text-amber-600">V{d.vehicle}: 1</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_CVSA_PAGE + 1}&ndash;{Math.min(page * AB_CVSA_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── AB Collision Information data (Part 4) ──────────────────────────────────

interface AbCollisionTotalRow { type:string; count:number; nonPrev:number; prevOrNot:number; pts:number }
interface AbCollisionSummaryRow { seq:number; date:string; document:string; jur:string; plate:string; plateJur:string; status:string; preventable:string; severity:string; pts:number; driver:string }
interface AbCollisionDetailRow {
  seq:number;
  date:string; time:string; document:string; jur:string; plate:string; plateJur:string; severity:string;
  assessment:string; driver:string; location:string; vehicle:string; vin:string; activePts:number;
}

const AB_COLLISION_TOTALS: AbCollisionTotalRow[] = [
  { type:'Property Damage', count:1, nonPrev:0, prevOrNot:1, pts:2 },
  { type:'Injury',          count:0, nonPrev:0, prevOrNot:0, pts:0 },
  { type:'Fatal',           count:0, nonPrev:0, prevOrNot:0, pts:0 },
];

const AB_COLLISION_META = {
  nscNumber: 'AB243-8992',
  carrierName: 'Carry Freight Ltd.',
  periodStart: '2018 JAN 10',
  periodEnd:   '2020 JAN 09',
  datePrinted: '2020 JAN 09',
  pages: '1 To 3',
};

const AB_COLLISION_SUMMARY: AbCollisionSummaryRow[] = [
  { seq:1, date:'2019 APR 27', document:'1113033', jur:'AB', plate:'E80642', plateJur:'AB', status:'Not Evaluated', preventable:'', severity:'Damage', pts:2, driver:'HARJOT S SIDHU' },
];

const AB_COLLISION_DETAILS: AbCollisionDetailRow[] = [
  {
    seq:1, date:'2019 APR 27', time:'16:00', document:'1113033', jur:'AB', plate:'E80642', plateJur:'AB', severity:'Damage',
    assessment:'Not Evaluated', driver:'HARJOT S SIDHU SIDHUH*117RP MB', location:'RURAL', vehicle:'2016 FREIGHTLINER', vin:'1FUJGLD54GLGZ6616', activePts:2,
  },
];

const AB_COLLISION_PAGE = 10;

function collSeverityBadge(sev: string) {
  if (sev === 'Fatal')  return 'bg-red-50 text-red-700 border-red-200';
  if (sev === 'Injury') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (sev === 'Damage') return 'bg-slate-50 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function AbCollisionInformationPanel() {
  const totals = AB_COLLISION_TOTALS.reduce(
    (a, r) => ({ count:a.count+r.count, nonPrev:a.nonPrev+r.nonPrev, prevOrNot:a.prevOrNot+r.prevOrNot, pts:a.pts+r.pts }),
    { count:0, nonPrev:0, prevOrNot:0, pts:0 }
  );
  return (
    <div className="bg-white">
      {/* Totals table */}
      <div className="p-4 space-y-3">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
            <span><strong className="text-slate-700">Profile Period:</strong> <span className="font-mono">{AB_COLLISION_META.periodStart}</span> &ndash; <span className="font-mono">{AB_COLLISION_META.periodEnd}</span></span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-700">Date Printed:</strong> <span className="font-mono">{AB_COLLISION_META.datePrinted}</span> &middot; Pages {AB_COLLISION_META.pages}</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 text-left  font-bold">Collision Type</th>
                <th className="px-4 py-2.5 text-center font-bold">Number of Collisions</th>
                <th className="px-4 py-2.5 text-center font-bold">Non-Preventable</th>
                <th className="px-4 py-2.5 text-center font-bold">Preventable or Not Evaluated</th>
                <th className="px-4 py-2.5 text-center font-bold text-amber-500">Active Points</th>
              </tr>
            </thead>
            <tbody>
              {AB_COLLISION_TOTALS.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className="px-4 py-2 font-medium text-slate-800">{row.type}</td>
                  <td className={`px-4 py-2 text-center font-mono ${row.count > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.count}</td>
                  <td className={`px-4 py-2 text-center font-mono ${row.nonPrev > 0 ? 'font-bold text-emerald-600' : 'text-slate-300'}`}>{row.nonPrev}</td>
                  <td className={`px-4 py-2 text-center font-mono ${row.prevOrNot > 0 ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.prevOrNot}</td>
                  <td className={`px-4 py-2 text-center font-mono ${row.pts > 0 ? 'font-black text-amber-600' : 'text-slate-300'}`}>{row.pts}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Totals</td>
                <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{totals.count}</td>
                <td className="px-4 py-2.5 text-center font-mono font-black text-emerald-700">{totals.nonPrev}</td>
                <td className="px-4 py-2.5 text-center font-mono font-black text-amber-700">{totals.prevOrNot}</td>
                <td className="px-4 py-2.5 text-center font-mono font-black text-amber-700">{totals.pts}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Collision Note */}
        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
          <div className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Collision Note</div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            The information in this Part is based on collisions considered &quot;reportable&quot; by the jurisdiction in which they occurred. Collisions are displayed in the order in which they occurred with the most recent date shown first. Points will be assigned to each collision depending on the collision severity &mdash; the highest appropriate point value will be assigned.
          </p>
          <div className="flex flex-wrap gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span><strong className="text-slate-700">Property Damage</strong> <span className="font-mono text-slate-500">2 points</span></span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span><strong className="text-slate-700">Personal Injury</strong> <span className="font-mono text-slate-500">4 points</span></span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-600"></span><strong className="text-slate-700">Fatality</strong> <span className="font-mono text-slate-500">6 points</span></span>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Conviction points, CVSA Failure Rate, Collision points (12 months), and the carrier&apos;s average fleet size (24 months) establish the R-Factor score. Where a carrier has requested a collision evaluation and it was determined to be &quot;non-preventable&quot;, the points will be removed from the Carrier Profile and the event will not be considered in determining the R-Factor score.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AbCollisionSummaryList() {
  const [page, setPage] = useState(1);
  const total = AB_COLLISION_SUMMARY.length;
  const pages = Math.max(1, Math.ceil(total / AB_COLLISION_PAGE));
  const rows  = AB_COLLISION_SUMMARY.slice((page - 1) * AB_COLLISION_PAGE, page * AB_COLLISION_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Document</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Preventable</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Severity</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.document}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.jur}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5 text-slate-700">{r.driver || <span className="text-slate-400 italic">Name not on file</span>}</td>
                <td className="px-4 py-2.5 text-center text-[10px] text-slate-600">{r.status}</td>
                <td className="px-4 py-2.5 text-center text-[10px] text-slate-600">{r.preventable || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${collSeverityBadge(r.severity)}`}>{r.severity}</span>
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 4 ? '#dc2626' : r.pts >= 2 ? '#d97706' : '#94a3b8' }}>
                  {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_COLLISION_PAGE + 1}&ndash;{Math.min(page * AB_COLLISION_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

export function AbCollisionDetailsList() {
  const [page, setPage] = useState(1);
  const total = AB_COLLISION_DETAILS.length;
  const pages = Math.max(1, Math.ceil(total / AB_COLLISION_PAGE));
  const rows  = AB_COLLISION_DETAILS.slice((page - 1) * AB_COLLISION_PAGE, page * AB_COLLISION_PAGE);

  return (
    <div className="bg-white">
      <div className="divide-y divide-slate-200">
        {rows.map(rec => (
          <div key={rec.seq} className="p-4">
            {/* Top row */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse border border-slate-200 rounded">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">#</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Date</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Time</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Document</th>
                    <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Jur</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Plate</th>
                    <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Severity</th>
                    <th className="px-3 py-1.5 text-right text-[9px] italic font-normal text-amber-500">Active Points</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-3 py-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{rec.seq}</td>
                    <td className="px-3 py-2 font-mono text-slate-800 border-r border-slate-100 whitespace-nowrap">{rec.date}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">{rec.time}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">{rec.document}</td>
                    <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-100">{rec.jur}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100 whitespace-nowrap">{rec.plate} <span className="text-slate-400">{rec.plateJur}</span></td>
                    <td className="px-3 py-2 text-center border-r border-slate-100">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${collSeverityBadge(rec.severity)}`}>{rec.severity}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black" style={{ color: rec.activePts >= 4 ? '#dc2626' : rec.activePts >= 2 ? '#d97706' : '#94a3b8' }}>
                      {rec.activePts > 0 ? rec.activePts : <span className="text-slate-300">&mdash;</span>}
                    </td>
                  </tr>
                  <tr className="bg-slate-50/60 border-t border-slate-200">
                    <th colSpan={2} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Assessment</th>
                    <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Driver</th>
                    <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">Location</th>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={2} className="px-3 py-2 text-slate-700 border-r border-slate-100">{rec.assessment}</td>
                    <td colSpan={3} className="px-3 py-2 text-slate-700 font-mono text-[10px] border-r border-slate-100">{rec.driver || <span className="text-slate-300">&mdash;</span>}</td>
                    <td colSpan={3} className="px-3 py-2 text-slate-700">{rec.location || <span className="text-slate-300">&mdash;</span>}</td>
                  </tr>
                  <tr className="bg-slate-50/60 border-t border-slate-200">
                    <th colSpan={4} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Vehicle</th>
                    <th colSpan={4} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">VIN</th>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={4} className="px-3 py-2 text-slate-700 font-semibold border-r border-slate-100">{rec.vehicle}</td>
                    <td colSpan={4} className="px-3 py-2 font-mono text-[10px] text-slate-600">{rec.vin}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_COLLISION_PAGE + 1}&ndash;{Math.min(page * AB_COLLISION_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── AB Violation Information data (Part 5) ──────────────────────────────────

interface AbViolGroupRow { group: string; count: number; pct: string }
interface AbViolSummaryRow { seq:number; date:string; document:string; jur:string; plate:string; plateJur:string; driverName:string; offence:string }
interface AbViolOffence { num:number; actSection:string; actDesc:string; ccmtaCode:string; ccmtaLabel:string; vehicle:string; text:string }
interface AbViolDetailRow {
  seq:number;
  date:string; time:string; document:string; jurisdiction:string; dateEntered:string;
  issuingAgency:string; location:string; driver:string; vehicle:string; commodity:string;
  offences: AbViolOffence[];
}

const AB_VIOL_GROUPS: AbViolGroupRow[] = [
  { group:'Speeding',                                                     count:0, pct:'' },
  { group:'Stop signs/Traffic lights',                                    count:0, pct:'' },
  { group:'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)',    count:0, pct:'' },
  { group:'Driving (Passing, Disobey Signs, Signals, etc.)',              count:0, pct:'' },
  { group:'Hours of Service',                                             count:0, pct:'' },
  { group:'Trip Inspections',                                             count:0, pct:'' },
  { group:'Brakes',                                                       count:0, pct:'' },
  { group:'CVIP',                                                         count:0, pct:'' },
  { group:'Mechanical Defects',                                           count:0, pct:'' },
  { group:'Oversize/Overweight',                                          count:0, pct:'' },
  { group:'Security of Loads',                                            count:0, pct:'' },
  { group:'Dangerous Goods',                                              count:0, pct:'' },
  { group:'Criminal Code',                                                count:0, pct:'' },
  { group:'Permits',                                                      count:0, pct:'' },
  { group:'Miscellaneous',                                                count:1, pct:'100.0%' },
  { group:'Administrative Actions',                                       count:0, pct:'' },
];
const AB_VIOL_TOTAL = { count: 1, pct: '100%' };

const AB_VIOL_META = {
  periodStart: '2018 JAN 10',
  periodEnd:   '2020 JAN 09',
  datePrinted: '2020 JAN 09',
  pages: '1 To 4',
  documents: 1,
  offences: 1,
};

const AB_VIOL_SUMMARY: AbViolSummaryRow[] = [
  { seq:1, date:'2019 AUG 21', document:'TVR 118300EI', jur:'AB', plate:'U11096', plateJur:'AB', driverName:'Jagseer singh BATTH', offence:'HINDER/MISLEAD OFFICER' },
];

const AB_VIOL_DETAILS: AbViolDetailRow[] = [
  {
    seq:1, date:'2019 AUG 21', time:'15:48', document:'TVR 118300EI', jurisdiction:'Alberta', dateEntered:'2019 AUG 31',
    issuingAgency:'GOVERNMENT ALBERTA - COMM VEH ENF - DUNMORE',
    location:'Dunmore - VIS',
    driver:'Jagseer singh BATTH BA-TT-HJ-S114QK MB',
    vehicle:'U11096 AB',
    commodity:'',
    offences:[
      {
        num:1,
        actSection:'TSA140(1)',
        actDesc:'DRIVER/CARRIER FAIL TO PRODUCE DOCUMENTS FOR INSPEC',
        ccmtaCode:'1202',
        ccmtaLabel:'Miscellaneous',
        vehicle:'',
        text:'-Photocopies of truck-tractor registration, cab card and insurance carried/produced. -Registration and cab card must be original government issued documents. -Insurance must be pink copy.',
      },
    ],
  },
];

const AB_VIOL_PAGE = 10;

export function AbViolationInformationPanel() {
  return (
    <div className="bg-white">
      <div className="p-4 space-y-3">
        {/* Info header */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
            <span><strong className="text-slate-700">Profile Period:</strong> <span className="font-mono">{AB_VIOL_META.periodStart}</span> &ndash; <span className="font-mono">{AB_VIOL_META.periodEnd}</span></span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-700">Date Printed:</strong> <span className="font-mono">{AB_VIOL_META.datePrinted}</span> &middot; Pages {AB_VIOL_META.pages}</span>
            <span className="ml-auto flex items-center gap-3">
              <span><strong className="text-slate-700">Documents:</strong> <span className="font-mono font-bold text-slate-900">{AB_VIOL_META.documents}</span></span>
              <span className="text-slate-300">|</span>
              <span><strong className="text-slate-700">Offences:</strong> <span className="font-mono font-bold text-slate-900">{AB_VIOL_META.offences}</span></span>
            </span>
          </div>

          {/* Group description table */}
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 text-center font-bold">Number of Violations</th>
                <th className="px-4 py-2.5 text-center font-bold">Percent of Total</th>
                <th className="px-4 py-2.5 text-left  font-bold">Group Description</th>
              </tr>
            </thead>
            <tbody>
              {AB_VIOL_GROUPS.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className={`px-4 py-2 text-center font-mono ${row.count > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.count > 0 ? row.count : ''}</td>
                  <td className={`px-4 py-2 text-center font-mono ${row.pct ? 'font-semibold text-slate-600' : 'text-slate-300'}`}>{row.pct || ''}</td>
                  <td className={`px-4 py-2 ${row.count > 0 ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{row.group}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{AB_VIOL_TOTAL.count}</td>
                <td className="px-4 py-2.5 text-center font-mono font-black text-slate-900">{AB_VIOL_TOTAL.pct}</td>
                <td className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-700">Total Violations</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Note */}
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
          <div className="text-[10px] font-black text-indigo-700 uppercase tracking-widest mb-1">Violation Note</div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Violations are grouped by CCMTA offence category. No NSC points are assigned directly on violations, but repeated offences may impact the R-Factor score through related conviction points. Use the detailed record below to review the act, section, and offence text.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AbViolationSummaryList() {
  const [page, setPage] = useState(1);
  const total = AB_VIOL_SUMMARY.length;
  const pages = Math.max(1, Math.ceil(total / AB_VIOL_PAGE));
  const rows  = AB_VIOL_SUMMARY.slice((page - 1) * AB_VIOL_PAGE, page * AB_VIOL_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Document</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Vehicle</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver Name &middot; Offence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.document}</td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.jur}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{r.driverName || <span className="text-slate-400 italic font-normal">Name not on file</span>}</div>
                  <div className="text-[10px] text-slate-500">{r.offence}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_VIOL_PAGE + 1}&ndash;{Math.min(page * AB_VIOL_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

export function AbViolationDetailsList() {
  const [page, setPage] = useState(1);
  const total = AB_VIOL_DETAILS.length;
  const pages = Math.max(1, Math.ceil(total / AB_VIOL_PAGE));
  const rows  = AB_VIOL_DETAILS.slice((page - 1) * AB_VIOL_PAGE, page * AB_VIOL_PAGE);

  return (
    <div className="bg-white">
      <div className="divide-y divide-slate-200">
        {rows.map(rec => (
          <div key={rec.seq} className="p-4 space-y-2">
            {/* Header row */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse border border-slate-200 rounded">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-1.5 text-center text-[9px] italic font-normal text-slate-500 border-r border-slate-100">#</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Date</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Time</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Document</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Jurisdiction</th>
                    <th className="px-3 py-1.5 text-left  text-[9px] italic font-normal text-slate-500">Date Entered</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-3 py-2 text-center font-mono font-bold text-slate-500 border-r border-slate-100">{rec.seq}</td>
                    <td className="px-3 py-2 font-mono text-slate-800 border-r border-slate-100 whitespace-nowrap">{rec.date}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">{rec.time}</td>
                    <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100 whitespace-nowrap">{rec.document}</td>
                    <td className="px-3 py-2 font-semibold text-slate-700 border-r border-slate-100">{rec.jurisdiction}</td>
                    <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{rec.dateEntered}</td>
                  </tr>
                  <tr className="bg-slate-50/60 border-t border-slate-200">
                    <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Issuing Agency</th>
                    <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">Location</th>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={3} className="px-3 py-2 text-slate-700 border-r border-slate-100">{rec.issuingAgency || <span className="text-slate-300">&mdash;</span>}</td>
                    <td colSpan={3} className="px-3 py-2 text-slate-700">{rec.location || <span className="text-slate-300">&mdash;</span>}</td>
                  </tr>
                  <tr className="bg-slate-50/60 border-t border-slate-200">
                    <th colSpan={3} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Driver</th>
                    <th colSpan={2} className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500 border-r border-slate-100">Vehicle</th>
                    <th className="px-3 py-1.5 text-left text-[9px] italic font-normal text-slate-500">Commodity</th>
                  </tr>
                  <tr className="bg-white">
                    <td colSpan={3} className="px-3 py-2 font-mono text-[10px] text-slate-700 border-r border-slate-100">{rec.driver || <span className="text-slate-300">&mdash;</span>}</td>
                    <td colSpan={2} className="px-3 py-2 font-mono text-slate-700 border-r border-slate-100">{rec.vehicle}</td>
                    <td className="px-3 py-2 text-slate-600">{rec.commodity || <span className="text-slate-300">&mdash;</span>}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Offences */}
            {rec.offences.map(off => (
              <div key={off.num} className="rounded border border-indigo-200 overflow-hidden">
                <div className="px-3 py-1.5 bg-indigo-50 border-b border-indigo-200 flex items-center gap-2">
                  <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wider">Offence #{off.num}</span>
                  <span className="ml-auto text-[9px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">{off.ccmtaLabel}</span>
                </div>
                <table className="w-full text-[11px]">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-white">
                      <td className="px-3 py-2 text-[9px] italic text-slate-500 w-36">Act/Section</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{off.actSection}</td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="px-3 py-2 text-[9px] italic text-slate-500">Description</td>
                      <td className="px-3 py-2 text-slate-700">{off.actDesc}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-2 text-[9px] italic text-slate-500">CCMTA Code</td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-700">{off.ccmtaCode} &middot; <span className="font-sans font-semibold text-slate-600">{off.ccmtaLabel}</span></td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="px-3 py-2 text-[9px] italic text-slate-500">Vehicle</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{off.vehicle || <span className="text-slate-300">&mdash;</span>}</td>
                    </tr>
                    <tr className="bg-white">
                      <td className="px-3 py-2 text-[9px] italic text-slate-500 align-top">Text</td>
                      <td className="px-3 py-2 text-[11px] text-slate-600 leading-relaxed">{off.text}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_VIOL_PAGE + 1}&ndash;{Math.min(page * AB_VIOL_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── AB Monitoring data (Part 6) ─────────────────────────────────────────────

interface AbMonSummaryRow {
  date: string; type: string; trkPct: string; busPct: string; avg: number; cur: number;
  score: string; convPct: string; inspPct: string; collPct: string; stage: string;
}
interface AbMonDetailRow {
  date: string; avgFleet: number | '';
  convPtsVeh: string; totalInsp: number | ''; oosDefInsp: string; totalDefInsp: string;
  oosPct: string; oosVeh: string; failureRate: string; collPtsVeh: string;
}
interface AbMonThresholdRow { stage: string; range: string }

const AB_MON_META = {
  periodStart: '2018 JAN 10',
  periodEnd:   '2020 JAN 09',
  datePrinted: '2020 JAN 09',
  pages: '1 To 5',
};

const AB_MON_INDUSTRY = {
  asOf: '2019 DEC 31',
  fleetRange: '11',
  fleetType: 'TRK',
  avgRFactor: '0.364',
  avgConvPts: '0.39',
  avgOosDef: '0.4',
  avgTotalDef: '1.2',
  avgOosVeh: '0.10',
  avgFailure: '0.090',
  avgCollPts: '0.05',
};

const AB_MON_THRESHOLDS: AbMonThresholdRow[] = [
  { stage:'Stage 1', range:'0.976 - 1.197' },
  { stage:'Stage 2', range:'1.198 - 1.399' },
  { stage:'Stage 3', range:'1.400 - 1.999' },
  { stage:'Stage 4', range:'2.000 and higher' },
];

const AB_MON_SUMMARY: AbMonSummaryRow[] = [
  { date:'2019 DEC', type:'TRK', trkPct:'100%', busPct:'0%', avg:11, cur:14, score:'2.314', convPct:'93.8%', inspPct:'3.1%',  collPct:'3.1%', stage:'4' },
  { date:'2019 NOV', type:'TRK', trkPct:'100%', busPct:'0%', avg:11, cur:15, score:'2.097', convPct:'92.8%', inspPct:'3.8%',  collPct:'3.4%', stage:'4' },
  { date:'2019 OCT', type:'TRK', trkPct:'100%', busPct:'0%', avg:11, cur:16, score:'2.111', convPct:'92.1%', inspPct:'4.5%',  collPct:'3.4%', stage:'4' },
  { date:'2019 SEP', type:'TRK', trkPct:'100%', busPct:'0%', avg:10, cur:19, score:'2.559', convPct:'91.0%', inspPct:'4.6%',  collPct:'4.4%', stage:'2' },
  { date:'2019 AUG', type:'TRK', trkPct:'100%', busPct:'0%', avg:10, cur:16, score:'1.209', convPct:'81.5%', inspPct:'9.2%',  collPct:'9.3%', stage:'' },
  { date:'2019 JUL', type:'TRK', trkPct:'100%', busPct:'0%', avg:9,  cur:15, score:'1.633', convPct:'85.4%', inspPct:'7.0%',  collPct:'7.6%', stage:'' },
  { date:'2019 JUN', type:'TRK', trkPct:'100%', busPct:'0%', avg:9,  cur:14, score:'1.637', convPct:'85.1%', inspPct:'7.3%',  collPct:'7.6%', stage:'' },
  { date:'2019 MAY', type:'TRK', trkPct:'100%', busPct:'0%', avg:9,  cur:13, score:'1.300', convPct:'91.9%', inspPct:'8.1%',  collPct:'0.0%', stage:'' },
  { date:'2019 APR', type:'TRK', trkPct:'100%', busPct:'0%', avg:8,  cur:12, score:'1.442', convPct:'93.2%', inspPct:'6.8%',  collPct:'0.0%', stage:'' },
  { date:'2019 MAR', type:'TRK', trkPct:'100%', busPct:'0%', avg:8,  cur:11, score:'0.997', convPct:'89.9%', inspPct:'10.1%', collPct:'0.0%', stage:'' },
  { date:'2019 FEB', type:'TRK', trkPct:'100%', busPct:'0%', avg:8,  cur:10, score:'0.773', convPct:'87.0%', inspPct:'13.0%', collPct:'0.0%', stage:'' },
  { date:'2019 JAN', type:'TRK', trkPct:'100%', busPct:'0%', avg:7,  cur:10, score:'0.857', convPct:'89.6%', inspPct:'10.4%', collPct:'0.0%', stage:'' },
  { date:'2018 DEC', type:'TRK', trkPct:'100%', busPct:'0%', avg:7,  cur:10, score:'0.460', convPct:'83.5%', inspPct:'16.5%', collPct:'0.0%', stage:'' },
  { date:'2018 NOV', type:'TRK', trkPct:'100%', busPct:'0%', avg:7,  cur:10, score:'0.046', convPct:'0.0%',  inspPct:'100.0%',collPct:'0.0%', stage:'' },
  { date:'2018 OCT', type:'TRK', trkPct:'100%', busPct:'0%', avg:6,  cur:10, score:'0.018', convPct:'0.0%',  inspPct:'100.0%',collPct:'0.0%', stage:'' },
  { date:'2018 SEP', type:'TRK', trkPct:'100%', busPct:'0%', avg:5,  cur:8,  score:'0.022', convPct:'0.0%',  inspPct:'100.0%',collPct:'0.0%', stage:'' },
  { date:'2018 AUG', type:'TRK', trkPct:'100%', busPct:'0%', avg:5,  cur:8,  score:'0.027', convPct:'0.0%',  inspPct:'100.0%',collPct:'0.0%', stage:'' },
  { date:'2018 JUL', type:'TRK', trkPct:'100%', busPct:'0%', avg:4,  cur:7,  score:'0.000', convPct:'0.0%',  inspPct:'0.0%',  collPct:'0.0%', stage:'' },
  { date:'2018 JUN', type:'TRK', trkPct:'100%', busPct:'0%', avg:3,  cur:5,  score:'0.000', convPct:'0.0%',  inspPct:'0.0%',  collPct:'0.0%', stage:'' },
  { date:'2018 MAY', type:'TRK', trkPct:'100%', busPct:'0%', avg:3,  cur:4,  score:'No Data', convPct:'', inspPct:'', collPct:'', stage:'' },
  { date:'2018 APR', type:'TRK', trkPct:'100%', busPct:'0%', avg:2,  cur:2,  score:'No Data', convPct:'', inspPct:'', collPct:'', stage:'' },
];

const AB_MON_DETAILS: AbMonDetailRow[] = [
  { date:'2019 DEC', avgFleet:11, convPtsVeh:'2.63', totalInsp:25, oosDefInsp:'0.3', totalDefInsp:'1.4', oosPct:'32%', oosVeh:'0.72', failureRate:'0.420', collPtsVeh:'0.18' },
  { date:'2019 NOV', avgFleet:11, convPtsVeh:'2.36', totalInsp:21, oosDefInsp:'0.3', totalDefInsp:'1.5', oosPct:'38%', oosVeh:'0.72', failureRate:'0.464', collPtsVeh:'0.18' },
  { date:'2019 OCT', avgFleet:11, convPtsVeh:'2.36', totalInsp:21, oosDefInsp:'0.4', totalDefInsp:'1.5', oosPct:'47%', oosVeh:'0.90', failureRate:'0.548', collPtsVeh:'0.18' },
  { date:'2019 SEP', avgFleet:10, convPtsVeh:'2.60', totalInsp:19, oosDefInsp:'0.4', totalDefInsp:'1.6', oosPct:'47%', oosVeh:'0.90', failureRate:'0.539', collPtsVeh:'0.20' },
  { date:'2019 AUG', avgFleet:10, convPtsVeh:'1.10', totalInsp:18, oosDefInsp:'0.4', totalDefInsp:'1.6', oosPct:'44%', oosVeh:'0.80', failureRate:'0.514', collPtsVeh:'0.20' },
  { date:'2019 JUL', avgFleet:9,  convPtsVeh:'1.55', totalInsp:17, oosDefInsp:'0.4', totalDefInsp:'1.7', oosPct:'47%', oosVeh:'0.88', failureRate:'0.529', collPtsVeh:'0.22' },
  { date:'2019 JUN', avgFleet:9,  convPtsVeh:'1.55', totalInsp:16, oosDefInsp:'0.5', totalDefInsp:'1.6', oosPct:'50%', oosVeh:'0.88', failureRate:'0.547', collPtsVeh:'0.22' },
  { date:'2019 MAY', avgFleet:9,  convPtsVeh:'1.33', totalInsp:16, oosDefInsp:'0.4', totalDefInsp:'1.4', oosPct:'43%', oosVeh:'0.77', failureRate:'0.484', collPtsVeh:'' },
  { date:'2019 APR', avgFleet:8,  convPtsVeh:'1.50', totalInsp:15, oosDefInsp:'0.4', totalDefInsp:'1.4', oosPct:'40%', oosVeh:'0.75', failureRate:'0.450', collPtsVeh:'' },
  { date:'2019 MAR', avgFleet:8,  convPtsVeh:'1.00', totalInsp:14, oosDefInsp:'0.4', totalDefInsp:'1.2', oosPct:'42%', oosVeh:'0.75', failureRate:'0.464', collPtsVeh:'' },
  { date:'2019 FEB', avgFleet:8,  convPtsVeh:'0.75', totalInsp:14, oosDefInsp:'0.4', totalDefInsp:'1.2', oosPct:'42%', oosVeh:'0.75', failureRate:'0.464', collPtsVeh:'' },
  { date:'2019 JAN', avgFleet:7,  convPtsVeh:'0.85', totalInsp:11, oosDefInsp:'0.3', totalDefInsp:'1.1', oosPct:'36%', oosVeh:'0.57', failureRate:'0.409', collPtsVeh:'' },
  { date:'2018 DEC', avgFleet:7,  convPtsVeh:'0.42', totalInsp:10, oosDefInsp:'0.3', totalDefInsp:'0.8', oosPct:'30%', oosVeh:'0.42', failureRate:'0.350', collPtsVeh:'' },
  { date:'2018 NOV', avgFleet:7,  convPtsVeh:'',     totalInsp:7,  oosDefInsp:'0.1', totalDefInsp:'0.5', oosPct:'14%', oosVeh:'0.14', failureRate:'0.214', collPtsVeh:'' },
  { date:'2018 OCT', avgFleet:6,  convPtsVeh:'',     totalInsp:6,  oosDefInsp:'0.0', totalDefInsp:'0.5', oosPct:'0%',  oosVeh:'',     failureRate:'0.083', collPtsVeh:'' },
  { date:'2018 SEP', avgFleet:5,  convPtsVeh:'',     totalInsp:5,  oosDefInsp:'0.0', totalDefInsp:'0.6', oosPct:'0%',  oosVeh:'',     failureRate:'0.100', collPtsVeh:'' },
  { date:'2018 AUG', avgFleet:5,  convPtsVeh:'',     totalInsp:4,  oosDefInsp:'0.0', totalDefInsp:'0.7', oosPct:'0%',  oosVeh:'',     failureRate:'0.125', collPtsVeh:'' },
  { date:'2018 JUL', avgFleet:4,  convPtsVeh:'',     totalInsp:3,  oosDefInsp:'0.0', totalDefInsp:'1.0', oosPct:'0%',  oosVeh:'',     failureRate:'0.000', collPtsVeh:'' },
  { date:'2018 JUN', avgFleet:3,  convPtsVeh:'',     totalInsp:3,  oosDefInsp:'0.0', totalDefInsp:'1.0', oosPct:'0%',  oosVeh:'',     failureRate:'0.000', collPtsVeh:'' },
  { date:'2018 MAY', avgFleet:3,  convPtsVeh:'',     totalInsp:'', oosDefInsp:'',    totalDefInsp:'',    oosPct:'',    oosVeh:'',     failureRate:'',      collPtsVeh:'' },
  { date:'2018 APR', avgFleet:2,  convPtsVeh:'',     totalInsp:'', oosDefInsp:'',    totalDefInsp:'',    oosPct:'',    oosVeh:'',     failureRate:'',      collPtsVeh:'' },
  { date:'2018 MAR', avgFleet:1,  convPtsVeh:'',     totalInsp:'', oosDefInsp:'',    totalDefInsp:'',    oosPct:'',    oosVeh:'',     failureRate:'',      collPtsVeh:'' },
  { date:'2018 FEB', avgFleet:0,  convPtsVeh:'',     totalInsp:'', oosDefInsp:'',    totalDefInsp:'',    oosPct:'',    oosVeh:'',     failureRate:'',      collPtsVeh:'' },
  { date:'2018 JAN', avgFleet:0,  convPtsVeh:'',     totalInsp:'', oosDefInsp:'',    totalDefInsp:'',    oosPct:'',    oosVeh:'',     failureRate:'',      collPtsVeh:'' },
];

const AB_MON_PAGE = 10;

function monStageBadge(stage: string) {
  if (stage === '4') return 'bg-red-50 text-red-700 border-red-200';
  if (stage === '3') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (stage === '2') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  if (stage === '1') return 'bg-blue-50 text-blue-700 border-blue-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function AbMonitoringInformationPanel() {
  return (
    <div className="bg-white">
      <div className="p-4 space-y-3">
        {/* Info header */}
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
            <span><strong className="text-slate-700">Profile Period:</strong> <span className="font-mono">{AB_MON_META.periodStart}</span> &ndash; <span className="font-mono">{AB_MON_META.periodEnd}</span></span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-700">Date Printed:</strong> <span className="font-mono">{AB_MON_META.datePrinted}</span> &middot; Pages {AB_MON_META.pages}</span>
          </div>
        </div>

        {/* Industry averages + Stage thresholds */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <div className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Industry Monitoring Information</div>
            <div className="space-y-1 text-[11px] text-slate-600">
              <div className="flex justify-between"><span>As of</span><span className="font-mono font-bold text-slate-800">{AB_MON_INDUSTRY.asOf}</span></div>
              <div className="flex justify-between"><span>Fleet Range</span><span className="font-mono font-bold text-slate-800">{AB_MON_INDUSTRY.fleetRange}</span></div>
              <div className="flex justify-between"><span>Fleet Type</span><span className="font-mono font-bold text-slate-800">{AB_MON_INDUSTRY.fleetType}</span></div>
              <div className="flex justify-between border-t border-blue-100 pt-1 mt-1"><span className="font-semibold">Industry Avg R-Factor</span><span className="font-mono font-black text-blue-700">{AB_MON_INDUSTRY.avgRFactor}</span></div>
            </div>
            <p className="text-[9px] text-slate-500 mt-2 italic">Industry Average is calculated for carriers with one or more NSC events.</p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/40 p-3">
            <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">Monitoring Stage R-Factor Thresholds &middot; Fleet Range {AB_MON_INDUSTRY.fleetRange}</div>
            <div className="space-y-1 text-[11px]">
              {AB_MON_THRESHOLDS.map(t => (
                <div key={t.stage} className="flex justify-between">
                  <span className="font-semibold text-slate-700">{t.stage}</span>
                  <span className="font-mono text-slate-700">{t.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AbMonitoringSummaryList() {
  const [page, setPage] = useState(1);
  const total = AB_MON_SUMMARY.length;
  const pages = Math.max(1, Math.ceil(total / AB_MON_PAGE));
  const rows  = AB_MON_SUMMARY.slice((page - 1) * AB_MON_PAGE, page * AB_MON_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-3 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Month-End Date</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">TRK%</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">BUS%</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Avg</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Cur</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-blue-500 uppercase tracking-wider whitespace-nowrap">R-Factor Score</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Conv%</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Insp%</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Coll%</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isNoData = r.score === 'No Data';
              return (
                <tr key={r.date} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-3 py-2 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                  <td className="px-3 py-2 text-center font-semibold text-slate-700">{r.type}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-700">{r.trkPct}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-500">{r.busPct}</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">{r.avg}</td>
                  <td className="px-3 py-2 text-center font-mono text-slate-600">{r.cur}</td>
                  <td className={`px-3 py-2 text-right font-mono font-black ${isNoData ? 'text-slate-400 italic' : 'text-blue-700'}`}>{r.score}</td>
                  <td className={`px-3 py-2 text-right font-mono ${r.convPct && r.convPct !== '0.0%' ? 'text-slate-700' : 'text-slate-300'}`}>{r.convPct || <span className="text-slate-300">&mdash;</span>}</td>
                  <td className={`px-3 py-2 text-right font-mono ${r.inspPct && r.inspPct !== '0.0%' ? 'text-slate-700' : 'text-slate-300'}`}>{r.inspPct || <span className="text-slate-300">&mdash;</span>}</td>
                  <td className={`px-3 py-2 text-right font-mono ${r.collPct && r.collPct !== '0.0%' ? 'text-slate-700' : 'text-slate-300'}`}>{r.collPct || <span className="text-slate-300">&mdash;</span>}</td>
                  <td className="px-3 py-2 text-center">
                    {r.stage ? (
                      <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-full border ${monStageBadge(r.stage)}`}>{r.stage}</span>
                    ) : <span className="text-slate-300">&mdash;</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_MON_PAGE + 1}&ndash;{Math.min(page * AB_MON_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

export function AbMonitoringDetailsList() {
  const [page, setPage] = useState(1);
  const total = AB_MON_DETAILS.length;
  const pages = Math.max(1, Math.ceil(total / AB_MON_PAGE));
  const rows  = AB_MON_DETAILS.slice((page - 1) * AB_MON_PAGE, page * AB_MON_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-3 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Month-End</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Avg Fleet</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Conv Pts/Veh</th>
              <th className="px-3 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total Insp</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">OOS Def/Insp</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Total Def/Insp</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-red-500 uppercase tracking-wider whitespace-nowrap">OOS%</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">OOS/Veh</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Failure Rate</th>
              <th className="px-3 py-2.5 text-right text-[9px] font-bold text-rose-400 uppercase tracking-wider whitespace-nowrap">Coll Pts/Veh</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.date} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-3 py-2 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">{r.avgFleet === '' || r.avgFleet === 0 ? <span className="text-slate-300">0</span> : r.avgFleet}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.convPtsVeh ? 'text-slate-700' : 'text-slate-300'}`}>{r.convPtsVeh || <span className="text-slate-300">&mdash;</span>}</td>
                <td className={`px-3 py-2 text-center font-mono ${r.totalInsp !== '' ? 'text-slate-700 font-semibold' : 'text-slate-300'}`}>{r.totalInsp === '' ? <span className="text-slate-300">&mdash;</span> : r.totalInsp}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.oosDefInsp ? 'text-slate-700' : 'text-slate-300'}`}>{r.oosDefInsp || <span className="text-slate-300">&mdash;</span>}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.totalDefInsp ? 'text-slate-700' : 'text-slate-300'}`}>{r.totalDefInsp || <span className="text-slate-300">&mdash;</span>}</td>
                <td className={`px-3 py-2 text-right font-mono font-bold ${
                  r.oosPct && r.oosPct !== '0%' ? (parseFloat(r.oosPct) >= 40 ? 'text-red-600' : parseFloat(r.oosPct) >= 20 ? 'text-amber-600' : 'text-slate-700') : 'text-slate-300'
                }`}>{r.oosPct || <span className="text-slate-300">&mdash;</span>}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.oosVeh ? 'text-slate-700' : 'text-slate-300'}`}>{r.oosVeh || <span className="text-slate-300">&mdash;</span>}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.failureRate ? 'font-semibold text-slate-700' : 'text-slate-300'}`}>{r.failureRate || <span className="text-slate-300">&mdash;</span>}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.collPtsVeh ? 'text-slate-700' : 'text-slate-300'}`}>{r.collPtsVeh || <span className="text-slate-300">&mdash;</span>}</td>
              </tr>
            ))}
          </tbody>
          {page === pages && (
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="px-3 py-2 text-[10px] font-black text-slate-700 uppercase tracking-wider whitespace-nowrap">Industry Avg</td>
                <td className="px-3 py-2 text-center text-slate-300">&mdash;</td>
                <td className="px-3 py-2 text-right font-mono font-black text-slate-800">{AB_MON_INDUSTRY.avgConvPts}</td>
                <td className="px-3 py-2 text-center text-slate-300">&mdash;</td>
                <td className="px-3 py-2 text-right font-mono font-black text-slate-800">{AB_MON_INDUSTRY.avgOosDef}</td>
                <td className="px-3 py-2 text-right font-mono font-black text-slate-800">{AB_MON_INDUSTRY.avgTotalDef}</td>
                <td className="px-3 py-2 text-center text-slate-300">&mdash;</td>
                <td className="px-3 py-2 text-right font-mono font-black text-slate-800">{AB_MON_INDUSTRY.avgOosVeh}</td>
                <td className="px-3 py-2 text-right font-mono font-black text-slate-800">{AB_MON_INDUSTRY.avgFailure}</td>
                <td className="px-3 py-2 text-right font-mono font-black text-slate-800">{AB_MON_INDUSTRY.avgCollPts}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/40 text-[9px] text-slate-500 italic">
        * Industry Average Information is as of {AB_MON_INDUSTRY.asOf} &middot; Fleet Range {AB_MON_INDUSTRY.fleetRange} &middot; Fleet Type {AB_MON_INDUSTRY.fleetType} &middot; calculated for carriers with one or more NSC events
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_MON_PAGE + 1}&ndash;{Math.min(page * AB_MON_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── AB Facility Licence Information (Part 7) ────────────────────────────────

const AB_FACILITY_META = {
  periodStart: '2018 JAN 10',
  periodEnd:   '2020 JAN 09',
  datePrinted: '2020 JAN 09',
  pages: '1 To 2',
  total: 0,
};

interface AbFacilityLicenceRow { seq:number; date:string; document:string; jur:string; facility:string; status:string; expiry:string }

const AB_FACILITY_LICENCES: AbFacilityLicenceRow[] = []; // none on record

export function AbFacilityLicenceInformationPanel() {
  return (
    <div className="bg-white">
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
            <span><strong className="text-slate-700">Profile Period:</strong> <span className="font-mono">{AB_FACILITY_META.periodStart}</span> &ndash; <span className="font-mono">{AB_FACILITY_META.periodEnd}</span></span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-700">Date Printed:</strong> <span className="font-mono">{AB_FACILITY_META.datePrinted}</span> &middot; Pages {AB_FACILITY_META.pages}</span>
            <span className="ml-auto"><strong className="text-slate-700">Inspection Facilities:</strong> <span className="font-mono font-black text-slate-900">{AB_FACILITY_META.total}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AbFacilityLicenceDetailsList() {
  if (AB_FACILITY_LICENCES.length === 0) {
    return (
      <div className="bg-white px-5 py-6 flex items-center gap-3 bg-emerald-50/30 border-t border-slate-100">
        <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">&#10003;</span>
        <span className="text-[11px] text-slate-600 font-medium italic">No Facility Licences on Record for period selected</span>
      </div>
    );
  }
  return (
    <div className="bg-white">
      {/* Table would go here when licences exist */}
    </div>
  );
}

// ─── AB Safety Fitness Information (Part 8) ──────────────────────────────────

interface AbSafetyRatingRow { seq:number; effective:string; expiry:string; description:string; comments:string }
interface AbOperatingStatusRow { seq:number; effective:string; inactive:string; description:string }

const AB_SAFETY_FITNESS_META = {
  periodStart: '2018 JAN 10',
  periodEnd:   '2020 JAN 09',
  datePrinted: '2020 JAN 09',
  pages: '1 To 2',
};

const AB_SAFETY_RATINGS: AbSafetyRatingRow[] = [
  { seq:1, effective:'2019 NOV 13', expiry:'',             description:'Conditional',            comments:'' },
  { seq:2, effective:'2018 MAR 23', expiry:'2019 NOV 13',  description:'Satisfactory Unaudited', comments:'' },
];

const AB_OPERATING_STATUS: AbOperatingStatusRow[] = [
  { seq:1, effective:'2018 MAR 20', inactive:'', description:'Federal' },
];

const AB_SAFETY_SUSPENSIONS: { seq:number; effective:string; expiry:string; description:string }[] = []; // none on record

export function AbSafetyFitnessInformationPanel() {
  return (
    <div className="bg-white">
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
            <span><strong className="text-slate-700">Profile Period:</strong> <span className="font-mono">{AB_SAFETY_FITNESS_META.periodStart}</span> &ndash; <span className="font-mono">{AB_SAFETY_FITNESS_META.periodEnd}</span></span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-700">Date Printed:</strong> <span className="font-mono">{AB_SAFETY_FITNESS_META.datePrinted}</span> &middot; Pages {AB_SAFETY_FITNESS_META.pages}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border border-rose-100 bg-rose-50/30 p-3">
            <div className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-1">Safety Fitness Certificate Suspension Note</div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Certificate suspensions, if any, will be shown. Where the description is &quot;Suspended&quot;, the suspension remains in effect. Where the description is &quot;Suspension&quot;, the suspension has been lifted as of the Expiry Date.
            </p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3">
            <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Safety Rating Note</div>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
              The information in this part relates to one or more Safety Fitness Ratings that were issued during the period for which the Profile was requested. All carriers operating NSC vehicles are issued a certificate that shows their Safety Fitness Rating. There are 5 ratings that could be assigned:
            </p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {['Excellent','Satisfactory','Satisfactory Unaudited','Conditional','Unsatisfactory'].map(r => (
                <span key={r} className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AbSafetyFitnessSummaryList() {
  return (
    <div className="bg-white divide-y divide-slate-100">
      {/* Certificate Suspension */}
      <div className="p-4">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Certificate Suspension</div>
        {AB_SAFETY_SUSPENSIONS.length === 0 ? (
          <div className="px-4 py-3 bg-emerald-50/40 rounded-lg border border-emerald-100 flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[11px]">&#10003;</span>
            <span className="text-[11px] text-slate-600 font-medium italic">No Certificate Suspension on Record for period selected</span>
          </div>
        ) : null}
      </div>

      {/* Safety Rating */}
      <div className="p-4">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Safety Rating</div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 text-center font-bold whitespace-nowrap">#</th>
                <th className="px-4 py-2 text-left  font-bold whitespace-nowrap">Effective Date</th>
                <th className="px-4 py-2 text-left  font-bold whitespace-nowrap">Expiry Date</th>
                <th className="px-4 py-2 text-left  font-bold">Description</th>
                <th className="px-4 py-2 text-left  font-bold">Comments</th>
              </tr>
            </thead>
            <tbody>
              {AB_SAFETY_RATINGS.map((r, i) => (
                <tr key={r.seq} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className="px-4 py-2 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                  <td className="px-4 py-2 font-mono text-slate-800 whitespace-nowrap">{r.effective}</td>
                  <td className="px-4 py-2 font-mono text-slate-700 whitespace-nowrap">{r.expiry || <span className="text-slate-300">&mdash;</span>}</td>
                  <td className="px-4 py-2 font-semibold text-slate-800">
                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      r.description === 'Conditional'            ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      r.description === 'Unsatisfactory'         ? 'bg-red-50 text-red-700 border-red-200' :
                      r.description === 'Excellent'              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                   'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>{r.description}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.comments || <span className="text-slate-300">&mdash;</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operating Status */}
      <div className="p-4">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-2">Operating Status</div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 text-center font-bold whitespace-nowrap">#</th>
                <th className="px-4 py-2 text-left  font-bold whitespace-nowrap">Effective Date</th>
                <th className="px-4 py-2 text-left  font-bold whitespace-nowrap">Inactive Date</th>
                <th className="px-4 py-2 text-left  font-bold">Description</th>
              </tr>
            </thead>
            <tbody>
              {AB_OPERATING_STATUS.map((r, i) => (
                <tr key={r.seq} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className="px-4 py-2 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                  <td className="px-4 py-2 font-mono text-slate-800 whitespace-nowrap">{r.effective}</td>
                  <td className="px-4 py-2 font-mono text-slate-700 whitespace-nowrap">{r.inactive || <span className="text-slate-300">&mdash;</span>}</td>
                  <td className="px-4 py-2 font-semibold text-slate-700">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── AB Historical Summary (Part 10) ─────────────────────────────────────────

interface AbHistoricalEventRow { seq:number; date:string; type:string; jur:string; description:string }

const AB_HISTORICAL_EVENTS: AbHistoricalEventRow[] = [
  { seq:1,  date:'2019 DEC 31', type:'MONT', jur:'AB', description:'FLEET SIZE: AVG 11, CUR 14; R-Factor: 2.314; STAGE: 4' },
  { seq:2,  date:'2019 DEC 28', type:'CVSA', jur:'BC', description:'E65208  AB; Out of Service' },
  { seq:3,  date:'2019 DEC 18', type:'CVSA', jur:'ON', description:'U11095  AB; Requires Attention' },
  { seq:4,  date:'2019 DEC 12', type:'CVSA', jur:'ON', description:'U04707  AB; Passed' },
  { seq:5,  date:'2019 DEC 05', type:'CVSA', jur:'ON', description:'E77384  AB; Requires Attention' },
  { seq:6,  date:'2019 DEC 02', type:'CVSA', jur:'ON', description:'U17985  AB; Requires Attention' },
  { seq:7,  date:'2019 NOV 30', type:'MONT', jur:'AB', description:'FLEET SIZE: AVG 11, CUR 15; R-Factor: 2.097; STAGE: 4' },
  { seq:8,  date:'2019 NOV 26', type:'CVSA', jur:'ON', description:'U39627  AB; Passed' },
  { seq:9,  date:'2019 NOV 13', type:'SAFE', jur:'AB', description:'Conditional' },
  { seq:10, date:'2019 NOV 03', type:'CVSA', jur:'BC', description:'E77384  AB; Requires Attention' },
  { seq:11, date:'2019 OCT 31', type:'MONT', jur:'AB', description:'FLEET SIZE: AVG 11, CUR 16; R-Factor: 2.111; STAGE: 4' },
  { seq:12, date:'2019 OCT 24', type:'CVSA', jur:'ON', description:'U04707  AB; Passed' },
  { seq:13, date:'2019 OCT 18', type:'CVSA', jur:'ON', description:'E65208  AB; Out of Service' },
  { seq:14, date:'2019 OCT 17', type:'CVSA', jur:'ON', description:'U17985  AB; Requires Attention' },
  { seq:15, date:'2019 SEP 30', type:'MONT', jur:'AB', description:'FLEET SIZE: AVG 10, CUR 19; R-Factor: 2.559; STAGE: 2' },
  { seq:16, date:'2019 SEP 28', type:'CVSA', jur:'MB', description:'U04031  AB; Passed' },
  { seq:17, date:'2019 SEP 19', type:'CONV', jur:'BC', description:'OPC BCAJ171045301;' },
  { seq:18, date:'2019 SEP 12', type:'CVSA', jur:'BC', description:'U11096  AB; Out of Service' },
  { seq:19, date:'2019 AUG 22', type:'CVSA', jur:'ON', description:'E75062  AB; Passed' },
  { seq:20, date:'2019 AUG 21', type:'CVSA', jur:'AB', description:'U11096  AB; Out of Service' },
  { seq:21, date:'2019 AUG 21', type:'VIOL', jur:'AB', description:'TVR 118300EI; TSA140(1)' },
  { seq:22, date:'2019 AUG 20', type:'CVSA', jur:'BC', description:'E75062  AB; Requires Attention' },
  { seq:23, date:'2019 AUG 16', type:'CVSA', jur:'ON', description:'U11099  AB; Passed' },
  { seq:24, date:'2019 JUL 08', type:'CVSA', jur:'BC', description:'M1767S  ON; Requires Attention' },
  { seq:51, date:'2018 JUN 13', type:'CVSA', jur:'ON', description:'E65114  AB; Passed' },
  { seq:52, date:'2018 JUN 10', type:'CONV', jur:'ON', description:'OPC ON96622956;' },
  { seq:53, date:'2018 JUN 10', type:'CONV', jur:'ON', description:'OPC ON96622957;' },
  { seq:54, date:'2018 JUN 10', type:'CONV', jur:'ON', description:'OPC ON96622958;' },
  { seq:55, date:'2018 JUN 10', type:'CONV', jur:'ON', description:'OPC ON96622961;' },
  { seq:56, date:'2018 JUN 10', type:'CONV', jur:'ON', description:'OPC ON96622962;' },
  { seq:57, date:'2018 JUN 05', type:'CONV', jur:'ON', description:'OPC ON96002105;' },
  { seq:58, date:'2018 JUN 05', type:'CVSA', jur:'ON', description:'E65208  AB; Requires Attention' },
  { seq:59, date:'2018 JUN 01', type:'CVSA', jur:'ON', description:'E65114  AB; Requires Attention' },
  { seq:60, date:'2018 MAR 23', type:'SAFE', jur:'AB', description:'Satisfactory Unaudited; EXPIRY 2019 NOV 13' },
  { seq:61, date:'2018 MAR 20', type:'OPST', jur:'AB', description:'Federal' },
];

const AB_HIST_TOTALS: { code:string; label:string; count:number; color:string }[] = [
  { code:'MONT', label:'Monitoring',           count:4,  color:'#3b82f6' },
  { code:'CVSA', label:'CVSA Inspections',     count:36, color:'#0ea5e9' },
  { code:'SAFE', label:'Safety Ratings',       count:2,  color:'#10b981' },
  { code:'CONV', label:'Conviction Documents', count:16, color:'#6366f1' },
  { code:'VIOL', label:'Violation Documents',  count:1,  color:'#8b5cf6' },
  { code:'COLL', label:'Collisions',           count:1,  color:'#ef4444' },
  { code:'OPST', label:'Operating Status',     count:1,  color:'#64748b' },
];

const AB_HIST_PAGE = 10;

function histTypeBadge(type: string) {
  if (type === 'MONT') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (type === 'CVSA') return 'bg-sky-50 text-sky-700 border-sky-200';
  if (type === 'SAFE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (type === 'CONV') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (type === 'VIOL') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (type === 'COLL') return 'bg-red-50 text-red-700 border-red-200';
  if (type === 'OPST') return 'bg-slate-50 text-slate-700 border-slate-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function AbHistoricalSummaryPanel() {
  const total = AB_HIST_TOTALS.reduce((a, r) => a + r.count, 0);
  return (
    <div className="bg-white">
      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-4 flex-wrap text-[10px] text-slate-500">
            <span><strong className="text-slate-700">Total Timeline Events:</strong> <span className="font-mono font-black text-slate-900">{total}</span></span>
            <span className="ml-auto text-slate-400">breakdown by event type below</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2 text-center font-bold whitespace-nowrap">Code</th>
                <th className="px-4 py-2 text-left  font-bold">Event Type</th>
                <th className="px-4 py-2 text-right font-bold whitespace-nowrap">Count</th>
                <th className="px-4 py-2 text-right font-bold whitespace-nowrap">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {AB_HIST_TOTALS.map((row, i) => {
                const pct = ((row.count / total) * 100).toFixed(1);
                return (
                  <tr key={row.code} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${histTypeBadge(row.code)}`}>{row.code}</span>
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">{row.label}</td>
                    <td className="px-4 py-2 text-right font-mono font-black text-slate-800">{row.count}</td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600">{pct}%</td>
                  </tr>
                );
              })}
              <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                <td className="px-4 py-2 text-center text-[9px] uppercase tracking-wider text-slate-700">&mdash;</td>
                <td className="px-4 py-2 text-[10px] uppercase tracking-wider text-slate-700">Totals</td>
                <td className="px-4 py-2 text-right font-mono font-black text-slate-900">{total}</td>
                <td className="px-4 py-2 text-right font-mono font-black text-slate-900">100.0%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AbHistoricalEventsList() {
  const [page, setPage] = useState(1);
  const total = AB_HISTORICAL_EVENTS.length;
  const pages = Math.max(1, Math.ceil(total / AB_HIST_PAGE));
  const rows  = AB_HISTORICAL_EVENTS.slice((page - 1) * AB_HIST_PAGE, page * AB_HIST_PAGE);

  return (
    <div className="bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Jur</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.seq} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-500">{r.seq}</td>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${histTypeBadge(r.type)}`}>{r.type}</span>
                </td>
                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.jur}</td>
                <td className="px-4 py-2.5 font-mono text-[10px] text-slate-700">{r.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page - 1) * AB_HIST_PAGE + 1}&ndash;{Math.min(page * AB_HIST_PAGE, total)} of {total}</span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// Reusable compact sub-dropdown used inside the parent Conviction section
export function AbConvSub({ title, badge, open, onToggle, children }: {
  title: string; badge?: string; open: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  return (
    <div className="border-t border-slate-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-slate-50/70 transition-colors"
      >
        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex-1">{title}</span>
        {badge && <span className="text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">{badge}</span>}
        {open ? <ChevronDown size={13} className="text-slate-400"/> : <ChevronRight size={13} className="text-slate-400"/>}
      </button>
      {open && children && <div className="border-t border-slate-100">{children}</div>}
    </div>
  );
}

// ─── Pull-by-pull helpers ─────────────────────────────────────────────────────

type AbStatus = 'Ok' | 'Warning' | 'Critical';

const abStColor = (s: AbStatus) =>
  s === 'Critical' ? '#dc2626' : s === 'Warning' ? '#d97706' : '#16a34a';

const abStBadgeCls = (s: AbStatus) =>
  s === 'Critical' ? 'bg-red-100 text-red-700 border-red-300'
: s === 'Warning'  ? 'bg-amber-100 text-amber-700 border-amber-300'
:                    'bg-emerald-100 text-emerald-700 border-emerald-300';

function abRfColor(v: number): string {
  if (v >= 0.085) return '#dc2626';
  if (v >= 0.070) return '#d97706';
  return '#16a34a';
}

// ─── Label helper ─────────────────────────────────────────────────────────────

function shortLabel(pullDate: string): string {
  // "Apr 2/26" → "Apr '26"
  const parts = pullDate.trim().split(' ');
  if (parts.length >= 2) {
    const yearPart = parts[parts.length - 1].split('/')[1];
    return `${parts[0]} '${yearPart ?? '??'}`;
  }
  return pullDate;
}

// ─── AB Thresholds ────────────────────────────────────────────────────────────

const AB_RF_OK   = 0.070;
const AB_RF_WARN = 0.085;

// ─── Mock data for AB drill-down ──────────────────────────────────────────────

function seedRandAb(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function genAbMockData(r: typeof AB_PULL_DATA[0]) {
  const seed = r.pullDate.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng  = seedRandAb(seed);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const makeDate = () => {
    const m = Math.floor(rng() * 12);
    const d = Math.floor(rng() * 28) + 1;
    return `${String(d).padStart(2,'0')}-${months[m]}-2024`;
  };

  // Convictions
  const AB_OFFENCES = [
    { act: 'TSA',   section: 'S.115(2)',  desc: 'Speeding — commercial vehicle',                  pts: 3 },
    { act: 'TSA',   section: 'S.71',      desc: 'Fail to obey traffic control device',             pts: 2 },
    { act: 'HOS',   section: 'S.12',      desc: 'Log book not completed or unavailable',           pts: 4 },
    { act: 'HOS',   section: 'S.7',       desc: 'Hours of service exceeded',                       pts: 5 },
    { act: 'CVCIA', section: 'S.4(1)',    desc: 'Operating without valid CVCA certificate',        pts: 4 },
    { act: 'W&D',   section: 'S.9(1)',    desc: 'Overweight — single axle',                       pts: 3 },
    { act: 'W&D',   section: 'S.16',      desc: 'Oversize load — no permit',                      pts: 3 },
    { act: 'TSA',   section: 'S.18(1)',   desc: 'Defective equipment — brakes',                   pts: 5 },
    { act: 'HOS',   section: 'S.19',      desc: 'Off-duty time falsified',                        pts: 5 },
    { act: 'CVCIA', section: 'S.22',      desc: 'Fail to produce certificate on demand',          pts: 2 },
  ];
  const convEvents = Array.from({ length: r.convictions }, () => {
    const o = AB_OFFENCES[Math.floor(rng() * AB_OFFENCES.length)];
    return { ...o, date: makeDate(), driver: `Driver ${String(Math.floor(rng() * 90) + 10)}` };
  });

  // CVSA
  const AB_CVSA_VIOS = [
    'Brake adjustment out of spec', 'Tire tread below minimum', 'Lighting deficiency',
    'Load securement violation', 'Coupling defect', 'Steering play excessive',
    'None', 'None', 'None',
  ];
  const cvsaPass = Math.round(r.cvsaInspections * (0.55 + rng() * 0.25));
  const cvsaOos  = r.cvsaInspections > 0 ? Math.max(0, Math.round(r.cvsaInspections * 0.12)) : 0;
  const cvsaFail = Math.max(0, r.cvsaInspections - cvsaPass - cvsaOos);
  const cvsaEvents = Array.from({ length: r.cvsaInspections }, (_, i) => {
    const isPas = i < cvsaPass;
    const isOos = !isPas && i < cvsaPass + cvsaOos;
    return {
      date:      makeDate(),
      level:     `Level ${Math.floor(rng() * 3) + 1}`,
      location:  ['Edmonton, AB', 'Calgary, AB', 'Red Deer, AB', 'Lethbridge, AB', 'Grande Prairie, AB'][Math.floor(rng() * 5)],
      violation: isOos || !isPas ? AB_CVSA_VIOS[Math.floor(rng() * (AB_CVSA_VIOS.length - 3))] : 'None',
      result:    isOos ? 'Out of Service' : isPas ? 'Pass' : 'Req. Attn',
    };
  });

  // Collisions
  const AB_COLL_TYPES = [
    { type: 'Rear-End',       severity: 'Property Damage' },
    { type: 'Side-Swipe',     severity: 'Property Damage' },
    { type: 'Jackknife',      severity: 'Injury'          },
    { type: 'Run-Off-Road',   severity: 'Property Damage' },
    { type: 'Head-On',        severity: 'Injury'          },
    { type: 'Backing',        severity: 'Property Damage' },
    { type: 'Intersection',   severity: 'Injury'          },
  ];
  const injuryCount  = Math.round(r.reportableCollisions * 0.33);
  const damageCount  = r.reportableCollisions - injuryCount;
  const collisions   = Array.from({ length: r.reportableCollisions }, () => {
    const c = AB_COLL_TYPES[Math.floor(rng() * AB_COLL_TYPES.length)];
    return { ...c, date: makeDate(), vehicles: Math.floor(rng() * 2) + 2, atFault: rng() > 0.45 ? 'Yes' : 'No' };
  });

  // Violations (grouped)
  const AB_VIOL_CATS = [
    { cat: 'Hours of Service',     count: Math.max(0, Math.round(r.convictions * 0.35 + rng() * 2)) },
    { cat: 'Vehicle Maintenance',  count: Math.max(0, Math.round(r.cvsaInspections * 0.2 + rng() * 2)) },
    { cat: 'Driver Qualifications',count: Math.max(0, Math.round(r.convictions * 0.15 + rng() * 1)) },
    { cat: 'Load Securement',      count: Math.max(0, Math.round(r.cvsaInspections * 0.1 + rng() * 1)) },
    { cat: 'Dangerous Goods',      count: Math.max(0, Math.round(rng() * 2)) },
  ];
  const totalViolOccurrences = AB_VIOL_CATS.reduce((s, c) => s + c.count, 0) || 1;
  const groupedViolPct = +(totalViolOccurrences / Math.max(r.convictions + r.cvsaInspections, 1) * 100).toFixed(1);

  // Monitoring (24 monthly snapshots)
  const monitoringSnaps = Array.from({ length: 24 }, (_, i) => {
    const m = months[(new Date().getMonth() - 23 + i + 24) % 12];
    const fleetSize = Math.max(1, Math.round(15 + rng() * 20));
    const oosPct    = Math.round((r.cvsaInspections > 0 ? cvsaOos / r.cvsaInspections : rng() * 0.15) * 100);
    return { label: `${m}'${String(new Date().getFullYear() - (i < 12 ? 1 : 0)).slice(2)}`, fleetSize, oosPct };
  });
  const latestOosPct = monitoringSnaps[monitoringSnaps.length - 1].oosPct;

  // Safety fitness
  const certCount     = Math.max(1, Math.round(r.adminPenalties + 1 + rng() * 1));
  const ratingCount   = Math.max(1, Math.round(certCount * 0.6 + rng()));
  const condCount     = Math.max(0, Math.round(rng() * 1));
  const opStatusCount = Math.max(1, Math.round(certCount * 0.4 + rng()));
  const activeCertPct = +(certCount / Math.max(certCount + condCount, 1) * 100).toFixed(1);

  // Historical timeline
  const totalEvents = r.convictions + r.cvsaInspections + r.reportableCollisions + r.adminPenalties + 2;
  const cvsaShare   = +(r.cvsaInspections / Math.max(totalEvents, 1) * 100).toFixed(2);

  // Contribution pcts for the 3 main categories
  const total3 = r.convictions + r.cvsaInspections + r.reportableCollisions || 1;
  const convContrib  = +((r.convictions          / total3) * 100).toFixed(1);
  const cvsaContrib  = +((r.cvsaInspections      / total3) * 100).toFixed(1);
  const collContrib  = +((r.reportableCollisions  / total3) * 100).toFixed(1);

  return {
    convEvents, cvsaEvents, cvsaPass, cvsaOos, cvsaFail,
    collisions, injuryCount, damageCount,
    AB_VIOL_CATS, totalViolOccurrences, groupedViolPct,
    monitoringSnaps, latestOosPct,
    certCount, ratingCount, condCount, opStatusCount, activeCertPct,
    totalEvents, cvsaShare,
    convContrib, cvsaContrib, collContrib,
  };
}

// ─── NSC Analysis–style row component ────────────────────────────────────────

export function AbAnalysisRow({ title, subtitle, statLabel, statVal, badge, badgeCls, open, onToggle, children }: {
  title: string; subtitle: string;
  statLabel?: string; statVal?: string;
  badge?: string; badgeCls?: string;
  open: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-800 leading-tight">{title}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
          {statLabel && statVal && (
            <span className="text-[11px] text-slate-500">
              {statLabel}: <strong className="text-slate-700">{statVal}</strong>
            </span>
          )}
          {badge && (
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeCls ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {badge}
            </span>
          )}
          {open
            ? <ChevronDown  size={14} className="text-slate-400"/>
            : <ChevronRight size={14} className="text-slate-400"/>
          }
        </div>
      </button>
      {open && children && (
        <div className="border-t border-slate-100">{children}</div>
      )}
    </div>
  );
}

// ─── AB Pull Drill-Down ───────────────────────────────────────────────────────

type AbSectionKey = 'conv'|'convSummary'|'convDetails'|'cvsa'|'cvsaSummary'|'cvsaDetails'|'coll'|'collSummary'|'collDetails'|'viol'|'violSummary'|'violDetails'|'mon'|'monSummary'|'monDetails'|'fac'|'facDetail'|'fit'|'fitSummary'|'hist'|'histEvents';

function AbPullDrillDown({ r }: { r: typeof AB_PULL_DATA[0] }) {
  const [open, setOpen] = useState<Partial<Record<AbSectionKey, boolean>>>({});
  const tog = (k: AbSectionKey) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const mock = genAbMockData(r);
  const sc   = abStColor(r.status);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* Pull header */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap border-b border-slate-100"
        style={{ background: sc + '0d', borderLeftWidth: 3, borderLeftColor: sc }}>
        <span className="text-[13px] font-black text-slate-800">{r.pullDate}</span>
        <span className="text-[11px] text-slate-400">{r.windowLabel}</span>
        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${abStBadgeCls(r.status)}`}>{r.status}</span>
        <span className="text-[10px] text-slate-400 ml-auto">NSC AB Profile Report · R-Factor {r.rFactor.toFixed(3)}</span>
      </div>

      <div className="p-4 space-y-2.5">

        {/* ── Conviction Analysis (Part 2) ── */}
        <AbAnalysisRow
          title="Conviction Analysis"
          subtitle={`${AB_CONV_TOTAL.count} conviction event${AB_CONV_TOTAL.count !== 1 ? 's' : ''} | analysis, summary, and detailed conviction history`}
          statLabel="Contribution"
          statVal={`${mock.convContrib}%`}
          badge={r.status}
          badgeCls={abStBadgeCls(r.status)}
          open={!!open.conv}
          onToggle={() => tog('conv')}
        >
          <div>
            {/* Always-visible: Conviction Analysis group table */}
            <AbConvictionAnalysisTable />

            {/* Dropdown: Conviction Summary */}
            <AbConvSub
              title="Conviction Summary"
              badge={`${AB_CONV_SUMMARY.length} RECORDS`}
              open={!!open.convSummary}
              onToggle={() => tog('convSummary')}
            >
              <AbConvictionSummaryList />
            </AbConvSub>

            {/* Dropdown: Conviction Details */}
            <AbConvSub
              title="Conviction Details"
              badge={`${AB_CONV_DETAILS.length} RECORDS`}
              open={!!open.convDetails}
              onToggle={() => tog('convDetails')}
            >
              <AbConvictionDetailsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── CVSA Inspection Analysis (Part 3) ── */}
        <AbAnalysisRow
          title="CVSA Inspection Analysis"
          subtitle={`${AB_CVSA_SUMMARY.length} inspection${AB_CVSA_SUMMARY.length !== 1 ? 's' : ''} | ${AB_CVSA_DEFECT_TOTAL.oos} OOS, ${AB_CVSA_DEFECT_TOTAL.req} req. attn | defect analysis, summary, and detailed records`}
          statLabel="Contribution"
          statVal={`${mock.cvsaContrib}%`}
          badge={r.status}
          badgeCls={abStBadgeCls(r.status)}
          open={!!open.cvsa}
          onToggle={() => tog('cvsa')}
        >
          <div>
            {/* Always-visible: CVSA Inspection Analysis defect table */}
            <AbCvsaInspectionAnalysisTable />

            {/* Dropdown: CVSA Inspection Summary */}
            <AbConvSub
              title="CVSA Inspection Summary"
              badge={`${AB_CVSA_SUMMARY.length} RECORDS`}
              open={!!open.cvsaSummary}
              onToggle={() => tog('cvsaSummary')}
            >
              <AbCvsaInspectionSummaryList />
            </AbConvSub>

            {/* Dropdown: CVSA Inspection Detail */}
            <AbConvSub
              title="CVSA Inspection Detail"
              badge={`${AB_CVSA_DETAILS.length} RECORDS`}
              open={!!open.cvsaDetails}
              onToggle={() => tog('cvsaDetails')}
            >
              <AbCvsaInspectionDetailsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── Collision Information (Part 4) ── */}
        <AbAnalysisRow
          title="Collision Information"
          subtitle={`${AB_COLLISION_SUMMARY.length} event${AB_COLLISION_SUMMARY.length !== 1 ? 's' : ''} | property damage, injury, fatal breakdown with collision summary and detailed records`}
          statLabel="Contribution"
          statVal={`${mock.collContrib}%`}
          badge={r.status}
          badgeCls={abStBadgeCls(r.status)}
          open={!!open.coll}
          onToggle={() => tog('coll')}
        >
          <div>
            {/* Always-visible: Collision Information totals + note */}
            <AbCollisionInformationPanel />

            {/* Dropdown: Collision Summary */}
            <AbConvSub
              title="Collision Summary"
              badge={`${AB_COLLISION_SUMMARY.length} RECORD${AB_COLLISION_SUMMARY.length !== 1 ? 'S' : ''}`}
              open={!!open.collSummary}
              onToggle={() => tog('collSummary')}
            >
              <AbCollisionSummaryList />
            </AbConvSub>

            {/* Dropdown: Collision Detail */}
            <AbConvSub
              title="Collision Detail"
              badge={`${AB_COLLISION_DETAILS.length} RECORD${AB_COLLISION_DETAILS.length !== 1 ? 'S' : ''}`}
              open={!!open.collDetails}
              onToggle={() => tog('collDetails')}
            >
              <AbCollisionDetailsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── Violation Information (Part 5) ── */}
        <AbAnalysisRow
          title="Violation Information"
          subtitle={`${AB_VIOL_META.offences} offence${AB_VIOL_META.offences !== 1 ? 's' : ''} across ${AB_VIOL_META.documents} document${AB_VIOL_META.documents !== 1 ? 's' : ''} | analysis, summary, and detailed records`}
          statLabel="Grouped Total"
          statVal={`${AB_VIOL_TOTAL.pct}`}
          badge={`${AB_VIOL_TOTAL.count} OCCURRENCE${AB_VIOL_TOTAL.count !== 1 ? 'S' : ''}`}
          badgeCls="bg-indigo-50 text-indigo-600 border-indigo-200"
          open={!!open.viol}
          onToggle={() => tog('viol')}
        >
          <div>
            {/* Always-visible: Violation Analysis group table + note */}
            <AbViolationInformationPanel />

            {/* Dropdown: Violation Summary */}
            <AbConvSub
              title="Violation Summary"
              badge={`${AB_VIOL_SUMMARY.length} RECORD${AB_VIOL_SUMMARY.length !== 1 ? 'S' : ''}`}
              open={!!open.violSummary}
              onToggle={() => tog('violSummary')}
            >
              <AbViolationSummaryList />
            </AbConvSub>

            {/* Dropdown: Violation Detail */}
            <AbConvSub
              title="Violation Detail"
              badge={`${AB_VIOL_DETAILS.length} RECORD${AB_VIOL_DETAILS.length !== 1 ? 'S' : ''}`}
              open={!!open.violDetails}
              onToggle={() => tog('violDetails')}
            >
              <AbViolationDetailsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── Monitoring Information (Part 6) ── */}
        <AbAnalysisRow
          title="Monitoring Information"
          subtitle={`${AB_MON_SUMMARY.length} month-end snapshots | fleet trends, R-Factor stages, and detailed inspection metrics`}
          statLabel="Latest R-Factor"
          statVal={AB_MON_SUMMARY[0]?.score ?? '—'}
          badge={`${AB_MON_SUMMARY.length} MONTHS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.mon}
          onToggle={() => tog('mon')}
        >
          <div>
            {/* Always-visible: Monitoring Info panel + Industry thresholds */}
            <AbMonitoringInformationPanel />

            {/* Dropdown: Monitoring Summary */}
            <AbConvSub
              title="Monitoring Summary"
              badge={`${AB_MON_SUMMARY.length} MONTHS`}
              open={!!open.monSummary}
              onToggle={() => tog('monSummary')}
            >
              <AbMonitoringSummaryList />
            </AbConvSub>

            {/* Dropdown: Monitoring Details */}
            <AbConvSub
              title="Monitoring Details"
              badge={`${AB_MON_DETAILS.length} MONTHS`}
              open={!!open.monDetails}
              onToggle={() => tog('monDetails')}
            >
              <AbMonitoringDetailsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── Safety Fitness Information ── */}
        {/* ── Facility Licence Information (Part 7) ── */}
        <AbAnalysisRow
          title="Facility Licence Information"
          subtitle="0 inspection facilities on record for selected period"
          statLabel="Facilities"
          statVal={`${AB_FACILITY_META.total}`}
          badge={`${AB_FACILITY_META.total} RECORDS`}
          badgeCls="bg-slate-100 text-slate-500 border-slate-200"
          open={!!open.fac}
          onToggle={() => tog('fac')}
        >
          <div>
            <AbFacilityLicenceInformationPanel />
            <AbConvSub
              title="Facility Licence Detail"
              badge={`${AB_FACILITY_LICENCES.length} RECORD${AB_FACILITY_LICENCES.length !== 1 ? 'S' : ''}`}
              open={!!open.facDetail}
              onToggle={() => tog('facDetail')}
            >
              <AbFacilityLicenceDetailsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── Safety Fitness Information (Part 8) ── */}
        <AbAnalysisRow
          title="Safety Fitness Information"
          subtitle={`${AB_SAFETY_RATINGS.length} safety rating${AB_SAFETY_RATINGS.length !== 1 ? 's' : ''} | ${AB_OPERATING_STATUS.length} operating status | ${AB_SAFETY_SUSPENSIONS.length} suspension${AB_SAFETY_SUSPENSIONS.length !== 1 ? 's' : ''}`}
          statLabel="Current Rating"
          statVal={AB_SAFETY_RATINGS[0]?.description ?? '—'}
          badge={`${AB_SAFETY_RATINGS.length + AB_OPERATING_STATUS.length} RECORDS`}
          badgeCls="bg-emerald-50 text-emerald-700 border-emerald-200"
          open={!!open.fit}
          onToggle={() => tog('fit')}
        >
          <div>
            <AbSafetyFitnessInformationPanel />
            <AbConvSub
              title="Safety Fitness Summary"
              badge={`${AB_SAFETY_RATINGS.length + AB_OPERATING_STATUS.length} RECORDS`}
              open={!!open.fitSummary}
              onToggle={() => tog('fitSummary')}
            >
              <AbSafetyFitnessSummaryList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

        {/* ── Historical Summary (Part 10) ── */}
        <AbAnalysisRow
          title="Historical Summary"
          subtitle={`${AB_HISTORICAL_EVENTS.length} timeline events | monitoring, CVSA, collisions, convictions, and safety actions`}
          statLabel="Total Events"
          statVal={`${AB_HIST_TOTALS.reduce((a, r) => a + r.count, 0)}`}
          badge={`${AB_HISTORICAL_EVENTS.length} EVENTS`}
          badgeCls="bg-slate-100 text-slate-600 border-slate-200"
          open={!!open.hist}
          onToggle={() => tog('hist')}
        >
          <div>
            <AbHistoricalSummaryPanel />
            <AbConvSub
              title="Historical Events"
              badge={`${AB_HISTORICAL_EVENTS.length} EVENTS`}
              open={!!open.histEvents}
              onToggle={() => tog('histEvents')}
            >
              <AbHistoricalEventsList />
            </AbConvSub>
          </div>
        </AbAnalysisRow>

      </div>
    </div>
  );
}

// ─── SVG layout constants (matches CVOR sizing) ───────────────────────────────

const VW  = 1440;
const pL  = 74;
const pR  = 158;
const pT  = 30;
const pB  = 62;
const cW  = VW - pL - pR;

// ─── Component ────────────────────────────────────────────────────────────────

type Cadence = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All';

export function NscAbPerformanceHistory() {
  const [cadence,    setCadence]    = useState<Cadence>('All');
  const [tbSearch,   setTbSearch]   = useState('');
  const [tbPage,     setTbPage]     = useState(1);
  const [tbRpp,      setTbRpp]      = useState(10);
  const [tbExpanded, setTbExpanded] = useState<string | null>(null);
  const [hovered,    setHovered]    = useState<{ chart: string; idx: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = [...AB_PULL_DATA].reverse();

  const filterByCadence = (rows: typeof all): typeof all => {
    if (cadence === 'Monthly' || cadence === 'All') return rows;
    const minStep =
      cadence === 'Quarterly' ? 3 :
      cadence === 'Semi-Annual' ? 6 :
      12;
    const out: typeof rows = [];
    let lastIdx = -99;
    rows.forEach((r, i) => {
      if (i === 0 || i - lastIdx >= minStep) { out.push(r); lastIdx = i; }
    });
    return out;
  };

  const data = filterByCadence(all);
  const n    = data.length;

  const handleDotClick = (d: typeof data[0], rpp = tbRpp) => {
    const newId = selectedId === d.id ? null : d.id;
    setSelectedId(newId);
    if (newId) {
      setTbExpanded(newId);
      const rowIdx = AB_PULL_DATA.findIndex(r => r.id === newId);
      if (rowIdx >= 0) setTbPage(Math.floor(rowIdx / rpp) + 1);
    }
  };

  const xAt = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW : cW / 2);

  const yAt = (v: number, max: number, min: number, chartH: number) =>
    pT + chartH - ((v - min) / (max - min || 1)) * chartH;

  const mkPath = (getVal: (d: typeof data[0]) => number, max: number, min: number, chartH: number) =>
    data.map((d, i) => {
      const x = xAt(i).toFixed(1);
      const y = yAt(getVal(d), max, min, chartH).toFixed(1);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

  const mkArea = (getVal: (d: typeof data[0]) => number, max: number, min: number, chartH: number) =>
    `${mkPath(getVal, max, min, chartH)} L${xAt(n-1).toFixed(1)},${(pT+chartH).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+chartH).toFixed(1)}Z`;

  const XAxis = ({ chartH }: { chartH: number }) => (
    <>
      {data.map((d, i) => (
        <text key={d.id} x={xAt(i)} y={pT+chartH+18} fontSize="10" fill="#64748b" textAnchor="middle"
          transform={`rotate(-40,${xAt(i)},${pT+chartH+18})`}>
          {shortLabel(d.pullDate)}
        </text>
      ))}
    </>
  );

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  const AbTip = ({ cx, cy, d, chart, chartH }: {
    cx: number; cy: number; d: typeof data[0]; chart: string; chartH: number;
  }) => {
    const sc  = abStColor(d.status);
    const rfc = abRfColor(d.rFactor);
    const TW  = 262;
    const TH  = 200;
    const tx  = cx > pL + cW * 0.62 ? cx - TW - 18 : cx + 18;
    const ty  = cy > pT + chartH * 0.55 ? cy - TH - 10 : cy + 14;
    const rows = [
      { label: 'R-Factor',              val: d.rFactor.toFixed(3),          color: rfc, bold: chart === 'rf'  },
      { label: 'Convictions',           val: String(d.convictions),          color: d.convictions >= 16 ? '#dc2626' : d.convictions >= 12 ? '#d97706' : '#16a34a', bold: chart === 'con' },
      { label: 'Admin Penalties',       val: String(d.adminPenalties),       color: d.adminPenalties >= 3 ? '#dc2626' : d.adminPenalties >= 1 ? '#d97706' : '#16a34a', bold: chart === 'ap'  },
      { label: 'CVSA Inspections',      val: String(d.cvsaInspections),      color: '#3b82f6', bold: chart === 'cvsa' },
      { label: 'Reportable Collisions', val: String(d.reportableCollisions), color: d.reportableCollisions >= 9 ? '#dc2626' : d.reportableCollisions >= 7 ? '#d97706' : '#16a34a', bold: chart === 'col' },
      { label: 'Window',               val: d.windowLabel,                   color: '#64748b', bold: false },
    ];
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={tx+3} y={ty+3} width={TW} height={TH} rx="10" fill="rgba(15,23,42,0.13)"/>
        <rect x={tx} y={ty} width={TW} height={TH} rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.2"/>
        <rect x={tx} y={ty} width={TW} height={36} rx="10" fill={sc} opacity="0.13"/>
        <rect x={tx} y={ty+20} width={TW} height={16} fill={sc} opacity="0.13"/>
        <text x={tx+12} y={ty+15} fontSize="14" fontWeight="800" fill={sc}>{d.pullDate}</text>
        <text x={tx+12} y={ty+30} fontSize="10" fill="#64748b">24-month window</text>
        <rect x={tx+TW-74} y={ty+7} width={66} height={18} rx="7" fill={sc} opacity="0.18"/>
        <text x={tx+TW-41} y={ty+19} fontSize="10" fontWeight="800" fill={sc} textAnchor="middle">{d.status}</text>
        <line x1={tx+10} x2={tx+TW-10} y1={ty+38} y2={ty+38} stroke="#e2e8f0" strokeWidth="0.8"/>
        {rows.map((r, ri) => (
          <g key={r.label}>
            <text x={tx+12} y={ty+55+ri*22} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '400'} fill={r.bold ? '#1e293b' : '#64748b'}>{r.label}</text>
            <text x={tx+TW-12} y={ty+55+ri*22} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '600'} fill={r.color} textAnchor="end" fontFamily="monospace">{r.val}</text>
          </g>
        ))}
        <line x1={tx+10} x2={tx+TW-10} y1={ty+TH-20} y2={ty+TH-20} stroke="#e2e8f0" strokeWidth="0.8"/>
        <text x={tx+12} y={ty+TH-8} fontSize="10" fill="#94a3b8">{d.inspections} CVSA inspections · click to select row</text>
      </g>
    );
  };

  const first = data[0];
  const last  = data[data.length - 1];

  // ── Chart 1: R-Factor ────────────────────────────────────────────────────────
  const CH1   = 274;
  const VH1   = CH1 + pT + pB;
  const rfMax = Math.max(Math.ceil(Math.max(...data.map(d => d.rFactor)) * 1.22 * 1000) / 1000, 0.13);
  const rfMin = 0;
  const yt1   = (v: number) => yAt(v, rfMax, rfMin, CH1);

  const rfZones = [
    { from: 0,          to: AB_RF_OK,   fill: '#bbf7d0', label: 'Ok',      lc: '#166534' },
    { from: AB_RF_OK,   to: AB_RF_WARN, fill: '#fef08a', label: 'Warning',  lc: '#854d0e' },
    { from: AB_RF_WARN, to: rfMax,      fill: '#fecaca', label: 'Critical', lc: '#991b1b' },
  ];

  const rfTickStep = +(rfMax / 5).toFixed(3);
  const rfTicks    = Array.from({ length: 6 }, (_, i) => +(i * rfTickStep).toFixed(3));

  const rfColor = (v: number) =>
    v >= AB_RF_WARN ? '#dc2626' : v >= AB_RF_OK ? '#d97706' : '#16a34a';

  // ── Chart 2: Category Events ─────────────────────────────────────────────────
  const CH2  = 194;
  const VH2  = CH2 + pT + pB;
  const cats = [
    { key: 'convictions'          as const, label: 'Convictions',          color: '#7c3aed' },
    { key: 'adminPenalties'       as const, label: 'Admin Penalties',       color: '#d97706' },
    { key: 'cvsaInspections'      as const, label: 'CVSA Inspections',      color: '#3b82f6' },
    { key: 'reportableCollisions' as const, label: 'Reportable Collisions', color: '#dc2626' },
  ];

  const catMax = Math.max(
    Math.ceil(Math.max(...data.map(d => Math.max(d.convictions, d.adminPenalties, d.cvsaInspections, d.reportableCollisions))) * 1.22),
    25,
  );
  const yt2     = (v: number) => yAt(v, catMax, 0, CH2);
  const catStep = Math.ceil(catMax / 5);
  const catTicks = Array.from({ length: 6 }, (_, i) => i * catStep).filter(v => v <= catMax);

  // ── Chart 3: R-Factor + Event Counts bar combo ────────────────────────────────
  // (mirrors CVOR Chart 4: bars for events, line for R-Factor)
  const CH3    = 176;
  const VH3    = CH3 + pT + pB;
  const maxEv  = Math.max(...data.map(d => Math.max(d.convictions, d.cvsaInspections))) + 4;
  const yE     = (v: number) => yAt(v, maxEv, 0, CH3);
  const evTicks = [0, 5, 10, 15, 20, 25, 30].filter(v => v <= maxEv);
  const bw     = Math.max(9, Math.min(24, cW / n * 0.22));

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Activity size={14} className="text-slate-400"/>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">NSC Alberta Performance History</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} pulls</span>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
            {shortLabel(first.pullDate)} → {shortLabel(last.pullDate)} · {n}mo
          </span>
          <span className="text-[10px] italic text-slate-400">Each pull = 24-month rolling window</span>
          {/* Status legend */}
          <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1">
            {[
              { c: '#dc2626', label: 'Critical pull' },
              { c: '#d97706', label: 'Warning pull'  },
              { c: '#16a34a', label: 'Ok pull'        },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ background: l.c }}/>
                <span className="text-[10px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cadence</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 gap-px">
            {(['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'All'] as Cadence[]).map(c => (
              <button key={c} onClick={() => setCadence(c)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${cadence === c ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* ══ CHART 1: R-Factor History (Overall CVOR Rating equivalent) ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">R-Factor History (CVOR Risk Score)</span>
            {rfZones.map(z => (
              <div key={z.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border" style={{ background: z.fill, borderColor: z.lc + '55' }}/>
                <span className="text-[10px] font-mono" style={{ color: z.lc }}>{z.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Lower is better · Alberta CVOR Risk Factor</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH1 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Zone bands */}
              {rfZones.map(z => {
                const clTo   = Math.min(z.to, rfMax);
                const clFrom = Math.max(z.from, rfMin);
                if (clTo <= clFrom) return null;
                const y1 = yt1(clTo);
                const y2 = yt1(clFrom);
                return (
                  <g key={z.label}>
                    <rect x={pL} y={y1} width={cW} height={y2-y1} fill={z.fill} opacity="0.40"/>
                    <text x={pL+10} y={(y1+y2)/2+4} fontSize="12" fill={z.lc} fontWeight="700" opacity="0.78">{z.label}</text>
                  </g>
                );
              })}

              {/* Y-grid */}
              {rfTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt1(v)} y2={yt1(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt1(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v.toFixed(3)}</text>
                </g>
              ))}

              {/* Threshold lines */}
              {[{ t: AB_RF_OK,   c: '#16a34a', lbl: `${AB_RF_OK.toFixed(3)} — Ok limit`       },
                { t: AB_RF_WARN, c: '#dc2626', lbl: `${AB_RF_WARN.toFixed(3)} — Critical limit` }].map(th => (
                <g key={th.t}>
                  <line x1={pL} x2={pL+cW} y1={yt1(th.t)} y2={yt1(th.t)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.90"/>
                  <text x={pL+cW+8} y={yt1(th.t)+3.5} fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>
                </g>
              ))}

              {/* Area + line */}
              <path d={mkArea(d => d.rFactor, rfMax, rfMin, CH1)} fill="#2563eb" opacity="0.08"/>
              <path d={mkPath(d => d.rFactor, rfMax, rfMin, CH1)} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

              {/* Value label on last */}
              {(() => {
                const d  = data[n - 1];
                const cx = xAt(n - 1);
                const cy = yt1(d.rFactor);
                const col = rfColor(d.rFactor);
                return (
                  <text x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fontWeight="bold"
                    fill={col} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d.rFactor.toFixed(3)}
                  </text>
                );
              })()}

              <XAxis chartH={CH1}/>

              {/* Dots — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const cy    = yt1(d.rFactor);
                const col   = rfColor(d.rFactor);
                const isHov = hovered?.chart === 'c1' && hovered.idx === i;
                const isSel = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c1', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <circle cx={cx} cy={cy} r="14" fill={col} opacity="0.12"/>}
                    <circle cx={cx} cy={cy} r={isHov || isSel ? 7 : i === n-1 ? 5.5 : 4}
                      fill={col} stroke="white" strokeWidth={isSel ? 3 : 1.5}
                      style={{ filter: isHov ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : 'none' }}/>
                    <circle cx={cx} cy={cy} r="14" fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c1' && (() => {
                const d = data[hovered.idx];
                if (!d) return null;
                return <AbTip cx={xAt(hovered.idx)} cy={yt1(d.rFactor)} d={d} chart="rf" chartH={CH1}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 2: Category Events Over Time ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Category Events Over Time</span>
            {cats.map(c => (
              <div key={c.key} className="flex items-center gap-1.5">
                <div className="w-5 h-1 rounded" style={{ background: c.color }}/>
                <span className="text-[10px] font-medium text-slate-600">{c.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">24-month rolling window cumulative counts</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH2 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH2}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid */}
              {catTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt2(v)} y2={yt2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt2(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
                </g>
              ))}

              {/* Lines */}
              {cats.map(c => (
                <path key={c.key}
                  d={mkPath(d => d[c.key], catMax, 0, CH2)}
                  fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              ))}

              {/* Value labels on last */}
              {cats.map(c => {
                const d  = data[n - 1];
                const cx = xAt(n - 1);
                const cy = yt2(d[c.key]);
                return (
                  <text key={c.key} x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill={c.color} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d[c.key]}
                  </text>
                );
              })}

              <XAxis chartH={CH2}/>

              {/* Dots — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const isHov = hovered?.chart === 'c2' && hovered.idx === i;
                const isSel = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c2', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {cats.map(c => (
                      <circle key={c.key} cx={cx} cy={yt2(d[c.key])} r={isHov || isSel ? 6 : i === n-1 ? 5 : 3.5}
                        fill={c.color} stroke="white" strokeWidth="1.5"
                        style={{ filter: isHov ? 'drop-shadow(0 0 3px rgba(0,0,0,0.25))' : 'none' }}/>
                    ))}
                    {isSel && <circle cx={cx} cy={yt2(Math.max(d.convictions, d.cvsaInspections))} r="16" fill="#6366f1" opacity="0.08"/>}
                    <rect x={cx - 12} y={pT} width={24} height={CH2} fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c2' && (() => {
                const d  = data[hovered.idx];
                if (!d) return null;
                const cy = yt2(Math.max(d.convictions, d.cvsaInspections));
                return <AbTip cx={xAt(hovered.idx)} cy={cy} d={d} chart="con" chartH={CH2}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 3: Event Counts & R-Factor per Pull ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Event Counts &amp; R-Factor per Pull</span>
            {[
              { lbl: 'Convictions (bars)',        color: '#7c3aed', rect: true  },
              { lbl: 'CVSA Inspections (bars)',    color: '#3b82f6', rect: true  },
              { lbl: 'Reportable Collisions (bars)', color: '#dc2626', rect: true },
              { lbl: 'R-Factor (line)',            color: '#2563eb', rect: false },
            ].map(l => (
              <div key={l.lbl} className="flex items-center gap-1.5">
                {l.rect
                  ? <div className="w-3 h-3 rounded-sm border" style={{ background: l.color + '22', borderColor: l.color }}/>
                  : <div className="w-6 border-t-2 border-dashed" style={{ borderColor: l.color }}/>
                }
                <span className="text-[10px] text-slate-600">{l.lbl}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Bars = raw count · line = R-Factor score</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH3 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH3}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid (event count axis) */}
              {evTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yE(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
                </g>
              ))}

              {/* R-Factor line (scaled to event axis) */}
              <path
                d={mkPath(d => d.rFactor * (maxEv / rfMax), maxEv, 0, CH3)}
                fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6,3" opacity="0.80"/>

              {/* Bars — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const isHov = hovered?.chart === 'c3' && hovered.idx === i;
                const isSel = selectedId === d.id;
                const opa   = isHov || isSel ? 1 : 0.7;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c3', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <rect x={cx - bw * 2} y={pT} width={bw * 4} height={CH3} fill="#6366f1" opacity="0.05" rx="3"/>}
                    <rect x={cx - bw * 1.55} y={yE(d.convictions)} width={bw} height={pT + CH3 - yE(d.convictions)}
                      fill={isHov || isSel ? '#7c3aed' : '#7c3aed22'} stroke="#7c3aed" strokeWidth="1" rx="2" opacity={opa}/>
                    <rect x={cx - bw * 0.5}  y={yE(d.cvsaInspections)} width={bw} height={pT + CH3 - yE(d.cvsaInspections)}
                      fill={isHov || isSel ? '#3b82f6' : '#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2" opacity={opa}/>
                    <rect x={cx + bw * 0.55} y={yE(d.reportableCollisions)} width={bw} height={pT + CH3 - yE(d.reportableCollisions)}
                      fill={isHov || isSel ? '#dc2626' : '#dc262622'} stroke="#dc2626" strokeWidth="1" rx="2" opacity={opa}/>
                    <text x={cx - bw * 1.05} y={yE(d.convictions) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#6d28d9" fontFamily="monospace">{d.convictions}</text>
                    <text x={cx + bw * 0.0}  y={yE(d.cvsaInspections) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1d4ed8" fontFamily="monospace">{d.cvsaInspections}</text>
                    <text x={cx + bw * 1.05} y={yE(d.reportableCollisions) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#991b1b" fontFamily="monospace">{d.reportableCollisions}</text>
                    {/* Hit area */}
                    <rect x={cx - bw * 2} y={pT} width={bw * 4} height={CH3} fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c3' && (() => {
                const d = data[hovered.idx];
                if (!d) return null;
                const cy = yE(Math.max(d.convictions, d.cvsaInspections));
                return <AbTip cx={xAt(hovered.idx)} cy={cy} d={d} chart="con" chartH={CH3}/>;
              })()}

              <XAxis chartH={CH3}/>

            </svg>
          </div>
        </div>

        {/* ══ PULL-BY-PULL DATA TABLE ══ */}
        {(() => {
          const tbFiltered = AB_PULL_DATA.filter(r =>
            r.pullDate.toLowerCase().includes(tbSearch.toLowerCase())    ||
            r.windowLabel.toLowerCase().includes(tbSearch.toLowerCase()) ||
            r.status.toLowerCase().includes(tbSearch.toLowerCase())
          );
          const tbTotal   = tbFiltered.length;
          const tbPages   = Math.max(1, Math.ceil(tbTotal / tbRpp));
          const tbVisible = tbFiltered.slice((tbPage - 1) * tbRpp, tbPage * tbRpp);
          const tbNums    = Array.from({ length: tbPages }, (_, i) => i + 1);

          return (
            <div className="px-0">
              {/* Section title bar */}
              <div className="px-6 py-3 border-t border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Pull-by-Pull Data</span>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{AB_PULL_DATA.length} pulls</span>
                <span className="text-[10px] text-slate-400">newest first · click row → inspection drill-down</span>
                <div className="relative ml-auto max-w-xs w-full">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    value={tbSearch}
                    onChange={e => { setTbSearch(e.target.value); setTbPage(1); }}
                    placeholder="Search date, window, status…"
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {Math.min(tbRpp, tbVisible.length)} of {tbTotal}
                </span>
                <button className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                  <Columns3 size={12}/>Columns
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40">
                      <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Pull Date ↓</th>
                      <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">24-Month Window</th>
                      <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-amber-500  uppercase tracking-wider whitespace-nowrap">Convictions</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400  uppercase tracking-wider whitespace-nowrap">Admin Penalties</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-blue-500   uppercase tracking-wider whitespace-nowrap">CVSA Inspections</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-rose-400   uppercase tracking-wider whitespace-nowrap">Reportable Collisions</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-500  uppercase tracking-wider whitespace-nowrap">R-Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbVisible.map((r, idx) => {
                      const isFirst    = tbPage === 1 && idx === 0;
                      const isExpanded = tbExpanded === r.id;
                      const isSel      = selectedId === r.id;
                      return (
                        <>
                          <tr key={r.id}
                            onClick={() => setTbExpanded(isExpanded ? null : r.id)}
                            className={`border-b border-slate-50 cursor-pointer transition-colors ${isSel ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                {isFirst && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Latest</span>}
                                <span className="font-semibold text-slate-800">{r.pullDate}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="text-slate-700">{r.windowLabel}</div>
                              <div className="text-[10px] text-slate-400">{r.inspections} inspection{r.inspections !== 1 ? 's' : ''}</div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${abStBadgeCls(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.convictions >= 16 ? '#dc2626' : r.convictions >= 12 ? '#d97706' : '#16a34a' }}>
                              {r.convictions}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.adminPenalties >= 3 ? '#dc2626' : r.adminPenalties >= 1 ? '#d97706' : '#16a34a' }}>
                              {r.adminPenalties}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.cvsaInspections}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.reportableCollisions >= 9 ? '#dc2626' : r.reportableCollisions >= 7 ? '#d97706' : '#16a34a' }}>
                              {r.reportableCollisions}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: abRfColor(r.rFactor) }}>
                              {r.rFactor.toFixed(3)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${r.id}-drill`}>
                              <td colSpan={8} className="p-4 bg-slate-50 border-b border-slate-100">
                                <AbPullDrillDown r={r}/>
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
              <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{(tbPage-1)*tbRpp+1}–{Math.min(tbPage*tbRpp, tbTotal)} of {tbTotal}</span>
                  <span className="ml-1">Rows:</span>
                  <select value={tbRpp} onChange={e => { setTbRpp(+e.target.value); setTbPage(1); }}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white">
                    {[5,10,15].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTbPage(p => Math.max(1, p-1))} disabled={tbPage===1}
                    className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">‹</button>
                  {tbNums.map(p => (
                    <button key={p} onClick={() => setTbPage(p)}
                      className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p===tbPage?'bg-blue-600 text-white border-blue-600':'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setTbPage(p => Math.min(tbPages, p+1))} disabled={tbPage===tbPages}
                    className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">›</button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
