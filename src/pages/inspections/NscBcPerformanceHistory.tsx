import React, { useState } from 'react';
import { Activity, Search, Columns3, ChevronDown, ChevronRight } from 'lucide-react';
import { BC_PULL_DATA } from './NscBcPullByPull';

// ─── Driver Contraventions (Guilty) — flat row-per-violation list ─────────────

interface DriverContraventionRow {
  driverName: string;
  dl: string;
  dlJur: string;
  date: string;
  time: string;
  ticket: string;
  plate: string;
  plateJur: string;
  location: string;
  juris: string;
  dispDate: string;
  act: string;
  section: string;
  desc: string;
  equiv: string;
  pts: number;
}

const DRIVER_CONTRA_ROWS: DriverContraventionRow[] = [
  { driverName:'', dl:'J31813088980916', dlJur:'ON', date:'2024-01-03', time:'14:00', ticket:'EA601652661', plate:'68042P', plateJur:'BC', location:'FIELD', juris:'BC', dispDate:'2024-07-17', act:'MVA', section:'150.1', desc:'FAIL TO KEEP RIGHT', equiv:'0303', pts:3 },
  { driverName:'', dl:'I80575606810102', dlJur:'ON', date:'2023-06-13', time:'10:39', ticket:'AJ224046021', plate:'56267P', plateJur:'BC', location:'KAMLOOPS', juris:'BC', dispDate:'2023-07-14', act:'MVR', section:'4.173B', desc:'STOP LAMP IMPROPER LIGHTING', equiv:'0600', pts:0 },
  { driverName:'', dl:'B72070568940815', dlJur:'ON', date:'2022-11-22', time:'16:59', ticket:'EA600878881', plate:'75520P', plateJur:'BC', location:'DONALD', juris:'BC', dispDate:'2023-09-06', act:'MVA', section:'144.1C', desc:'SPEED RELATIVE TO CONDITIONS', equiv:'0001', pts:0 },
  { driverName:'BAJWA, MANJOT', dl:'B0209516098126', dlJur:'ON', date:'2024-12-24', time:'00:00', ticket:'1333765', plate:'72843P', plateJur:'BC', location:'BALGONIE', juris:'SK', dispDate:'2025-01-16', act:'HT', section:'6; b', desc:'Improper or inappropriate use of lights or lighting devices', equiv:'0323', pts:2 },
  { driverName:'BHULLAR, GURWINDER SINGH', dl:'179420971', dlJur:'AB', date:'2025-01-26', time:'20:32', ticket:'2099880', plate:'72843P', plateJur:'BC', location:'SHERWOOD PARK', juris:'AB', dispDate:'2025-02-03', act:'122/0924(1)', section:'', desc:'UNAUTHORIZED FLASHING LAMP ON', equiv:'0610', pts:1 },
  { driverName:'BHULLAR, GURWINDER SINGH', dl:'179420971', dlJur:'AB', date:'2025-01-26', time:'20:32', ticket:'2099879', plate:'72843P', plateJur:'BC', location:'SHERWOOD PARK', juris:'AB', dispDate:'2025-02-03', act:'304/0255.2(1)', section:'', desc:'OPERATE VEHICLE WITH UNAUTHORIZED LAMP ALIGHT', equiv:'0323', pts:2 },
  { driverName:'DHALIWAL, TEJINDER SINGH', dl:'D31607328781228', dlJur:'ON', date:'2023-05-24', time:'00:00', ticket:'1433354', plate:'70365P', plateJur:'BC', location:'WPG - BROOKSIDE BV / NOTRE DAM', juris:'MB', dispDate:'2023-11-08', act:'HTA85OT', section:'', desc:'MB ACT: HTA - SEC.: 85OT - TO WIT: DISOBEY TRAFFIC CONTROL DEVICE NOT', equiv:'0317', pts:0 },
  { driverName:'GURNEET SINGH, GURNEET', dl:'G93850000981103', dlJur:'ON', date:'2023-10-27', time:'00:40', ticket:'2076387', plate:'67496P', plateJur:'BC', location:'MEDICINE HAT', juris:'AB', dispDate:'2023-11-16', act:'304/0244(N)', section:'', desc:'PARK IN PROHIBITED AREA', equiv:'0218', pts:0 },
  { driverName:'GURNEET SINGH, GURNEET', dl:'G93850000981103', dlJur:'ON', date:'2023-07-21', time:'00:00', ticket:'1427937', plate:'57380P', plateJur:'BC', location:'ELTON (RM)', juris:'MB', dispDate:'2023-10-11', act:'HTA951C', section:'', desc:'MB ACT: HTA - SEC.: 951C - TO WIT: SPEEDING', equiv:'0004', pts:0 },
  { driverName:'GURWINDER, SINGH', dl:'G94190000000229', dlJur:'ON', date:'2023-09-09', time:'00:00', ticket:'1431882', plate:'69077P', plateJur:'BC', location:'WINNIPEG (CITY)', juris:'MB', dispDate:'2023-11-01', act:'HTA1415', section:'', desc:'MB ACT: HTA - SEC.: 1415 - TO WIT: PARK ON A PEDESTRIAN CORRIDOR', equiv:'0218', pts:0 },
  { driverName:'HUSSEIN, HANAD ABDULQADI', dl:'173885906', dlJur:'AB', date:'2022-12-03', time:'21:49', ticket:'2066891', plate:'57380P', plateJur:'BC', location:'GLEICHEN', juris:'AB', dispDate:'2023-06-26', act:'', section:'', desc:'DRIVE VEHICLE IN EXCESS OF SPEED', equiv:'0005', pts:0 },
  { driverName:'JASHANDEEP SINGH', dl:'J07360000991120', dlJur:'ON', date:'2022-09-14', time:'13:40', ticket:'6694567', plate:'72890P', plateJur:'BC', location:'HWY 11/17 TH BAY DIST', juris:'ON', dispDate:'2023-11-01', act:'HTA', section:'128', desc:'SPEEDING 110 KMH IN 090 KMH ZONE', equiv:'0004', pts:0 },
  { driverName:'KAUR, GURJEET', dl:'K08903080906104', dlJur:'ON', date:'2024-09-05', time:'00:00', ticket:'1337644', plate:'86141P', plateJur:'BC', location:'ERNFOLD', juris:'SK', dispDate:'2025-02-27', act:'TS', section:'199;1 b', desc:'Exceeding posted speed limit.', equiv:'0004', pts:1 },
  { driverName:'', dl:'G43507098991003', dlJur:'ON', date:'2022-05-16', time:'10:27', ticket:'AJ223567961', plate:'57380P', plateJur:'BC', location:'KAMLOOPS', juris:'BC', dispDate:'2022-06-16', act:'MVA', section:'220.4',  desc:'FAIL TO WEAR SEAT BELT',       equiv:'0212', pts:2 },
  { driverName:'', dl:'P007956167970825', dlJur:'ON', date:'2022-04-21', time:'07:50', ticket:'AJ266808861', plate:'58857P', plateJur:'BC', location:'SICAMOUS', juris:'BC', dispDate:'2022-05-22', act:'MVA', section:'146.3',  desc:'SPEED AGAINST HIGHWAY SIGN',   equiv:'0004', pts:4 },
  { driverName:'', dl:'K05350000971811', dlJur:'ON', date:'2022-01-11', time:'08:20', ticket:'AJ189733061', plate:'68041P', plateJur:'BC', location:'SICAMOUS', juris:'BC', dispDate:'2022-02-11', act:'MVA', section:'146.3',  desc:'SPEED AGAINST HIGHWAY SIGN',   equiv:'0004', pts:0 },
  { driverName:'', dl:'SINGHA195BA',      dlJur:'MB', date:'2021-11-27', time:'15:40', ticket:'AJ190313851', plate:'66658P', plateJur:'BC', location:'QUILCHENA', juris:'BC', dispDate:'2022-09-12', act:'MVA', section:'146.3',  desc:'SPEED AGAINST HIGHWAY SIGN',   equiv:'0004', pts:4 },
  { driverName:'', dl:'M05910055730101', dlJur:'ON', date:'2021-05-28', time:'14:36', ticket:'AJ020400701', plate:'62203P', plateJur:'BC', location:'HOPE',     juris:'BC', dispDate:'2021-06-28', act:'CTA', section:'12.1B',  desc:'VEHICLE EXCEEDS AXLE WEIGHT',  equiv:'0705', pts:0 },
  { driverName:'', dl:'B32290000930812', dlJur:'ON', date:'2021-04-27', time:'05:26', ticket:'AJ204376131', plate:'57380P', plateJur:'BC', location:'KAMLOOPS', juris:'BC', dispDate:'2021-05-28', act:'MVA', section:'146.3',  desc:'SPEED AGAINST HIGHWAY SIGN',   equiv:'0004', pts:0 },
];

const DRIVER_CONTRA_PAGE = 10;

function ptsColor(pts: number) {
  return pts >= 3 ? '#dc2626' : pts >= 1 ? '#d97706' : '#94a3b8';
}

export function DriverContraventionsList() {
  const [page, setPage] = useState(1);
  const total = DRIVER_CONTRA_ROWS.length;
  const pages = Math.max(1, Math.ceil(total / DRIVER_CONTRA_PAGE));
  const rows  = DRIVER_CONTRA_ROWS.slice((page - 1) * DRIVER_CONTRA_PAGE, page * DRIVER_CONTRA_PAGE);

  return (
    <div className="bg-white">
      {/* Intro */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          This section lists all violation tickets issued and deemed guilty for drivers operating under the carrier&apos;s safety certificate during the requested time period. Contraventions are sorted alphabetically by driver name and are listed by violation date beginning with the most recent contravention.
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          NSC Points are assigned for 12 months from the disposition date. Active points are only displayed for contraventions that impact the carrier&apos;s profile scores.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Driver &middot; DL#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Location &middot; Jur.</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Disp. Date</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Act &middot; Section</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Equiv</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{r.driverName || <span className="text-slate-400 italic font-normal">Name not on file</span>}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.dl} <span className="font-bold">{r.dlJur}</span></div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-800">{r.date}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.time}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.ticket}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{r.location}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{r.juris}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">{r.dispDate}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-700">{r.act || <span className="text-slate-300">&mdash;</span>}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.section || <span className="text-slate-300">&mdash;</span>}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{r.desc}</td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600 whitespace-nowrap">{r.equiv}</td>
                <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: ptsColor(r.pts) }}>
                  {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {total === 0 ? 0 : (page - 1) * DRIVER_CONTRA_PAGE + 1}&ndash;{Math.min(page * DRIVER_CONTRA_PAGE, total)} of {total}
        </span>
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

// ─── Pending Driver Contraventions — flat row-per-violation list ─────────────

interface PendingDriverContraventionRow {
  driverName: string;
  dl: string;
  dlJur: string;
  cls: string;
  status: string;
  date: string;
  time: string;
  ticket: string;
  plate: string;
  plateJur: string;
  location: string;
  juris: string;
  act: string;
  section: string;
  desc: string;
  equiv: string;
}

const PENDING_DRIVER_CONTRA_ROWS: PendingDriverContraventionRow[] = [
  { driverName:'BANSAL, SHANKY',                   dl:'9886876',   dlJur:'MB', cls:'000', status:'NORMAL', date:'2023-02-26', time:'12:21', ticket:'AJ238015181', plate:'77517P', plateJur:'BC', location:'MERRITT',     juris:'BC', act:'MVA', section:'125',      desc:'DISOBEY TRAFFIC CONTROL DEVICE',   equiv:'0317' },
  { driverName:'BRAR, ARASHPINDER SINGH',          dl:'9761233',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-11-22', time:'16:59', ticket:'EA600878881', plate:'75520P', plateJur:'BC', location:'DONALD',      juris:'BC', act:'MVA', section:'144.1C',   desc:'SPEED RELATIVE TO CONDITIONS',     equiv:'0001' },
  { driverName:'BRAR, ARASHPINDER SINGH',          dl:'9761233',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-11-22', time:'16:59', ticket:'EA600878882', plate:'75520P', plateJur:'BC', location:'DONALD',      juris:'BC', act:'MVA', section:'155.1A',   desc:'CROSS SOLID DOUBLE LINE',          equiv:'0308' },
  { driverName:'BRAR, ARASHPINDER SINGH',          dl:'9761233',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-11-22', time:'16:59', ticket:'EA600878883', plate:'75520P', plateJur:'BC', location:'DONALD',      juris:'BC', act:'MVA', section:'125',      desc:'DISOBEY TRAFFIC CONTROL DEVICE',   equiv:'0317' },
  { driverName:'BRAR, ARASHPINDER SINGH',          dl:'9761233',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-10-07', time:'06:54', ticket:'AJ223804301', plate:'68041P', plateJur:'BC', location:'KAMLOOPS',    juris:'BC', act:'MVR', section:'37.18061', desc:'MAINTAIN MORE THAN ONE LOG',       equiv:'0402' },
  { driverName:'BRAR, VARINDERPAL SINGH',          dl:'2710575',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2023-02-21', time:'07:47', ticket:'AJ223842761', plate:'72842P', plateJur:'BC', location:'KAMLOOPS',    juris:'BC', act:'MVA', section:'125',      desc:'DISOBEY TRAFFIC CONTROL DEVICE',   equiv:'0317' },
  { driverName:'DHALIWAL, TARWINDER',              dl:'9761243',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-10-07', time:'06:54', ticket:'AJ223804221', plate:'68041P', plateJur:'BC', location:'KAMLOOPS',    juris:'BC', act:'MVR', section:'37.18061', desc:'MAINTAIN MORE THAN ONE LOG',       equiv:'0402' },
  { driverName:'DHILLON, BAKHSHIS SINGH',          dl:'2957414',   dlJur:'MB', cls:'000', status:'NORMAL', date:'2022-08-29', time:'10:56', ticket:'AJ224178791', plate:'57381P', plateJur:'BC', location:'ASPEN GROVE', juris:'BC', act:'MVA', section:'146.3',    desc:'SPEED AGAINST HIGHWAY SIGN',       equiv:'0004' },
  { driverName:'GILL, GURPREET SINGH',             dl:'8135090',   dlJur:'BC', cls:'100', status:'NORMAL', date:'2023-02-15', time:'13:30', ticket:'AJ227293491', plate:'57354P', plateJur:'BC', location:'SALMON ARM',  juris:'BC', act:'MVA', section:'129.1',    desc:'RED LIGHT AT INTERSECTION',        equiv:'0104' },
  { driverName:'GILL, GURPREET SINGH',             dl:'8135090',   dlJur:'BC', cls:'100', status:'NORMAL', date:'2023-01-10', time:'10:35', ticket:'AJ224010881', plate:'57354P', plateJur:'BC', location:'CHASE',       juris:'BC', act:'MVA', section:'146.3',    desc:'SPEED AGAINST HIGHWAY SIGN',       equiv:'0004' },
  { driverName:'GURBAJ SINGH',                     dl:'9781944',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-10-01', time:'01:45', ticket:'AJ236554601', plate:'56267P', plateJur:'BC', location:'GOLDEN',      juris:'BC', act:'MVA', section:'187.1',    desc:'FAIL TO PARK OFF ROADWAY',         equiv:'0218' },
  { driverName:'JOBANDEEP SINGH',                  dl:'4117704',   dlJur:'ON', cls:'100', status:'HOLD',   date:'2022-12-11', time:'14:22', ticket:'EA600897651', plate:'72075P', plateJur:'BC', location:'SALMON ARM',  juris:'BC', act:'MVA', section:'129.1',    desc:'RED LIGHT AT INTERSECTION',        equiv:'0104' },
  { driverName:'PATEL, NAINESHKUMAR MANHARKUMAR',  dl:'9609476',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-09-21', time:'13:29', ticket:'EA600763651', plate:'69076P', plateJur:'BC', location:'LAC LE JEUNE', juris:'BC', act:'MVA', section:'214.21',   desc:'USE ELECTRONIC DEVICE/DRIVING',    equiv:'0226' },
  { driverName:'PATEL, NAINESHKUMAR MANHARKUMAR',  dl:'9609476',   dlJur:'ON', cls:'000', status:'NORMAL', date:'2022-06-16', time:'12:26', ticket:'EA003302161', plate:'69076P', plateJur:'BC', location:'COQUIHALLA', juris:'BC', act:'MVA', section:'140',      desc:'DISOBEY CONSTRUCTION SIGNS',       equiv:'0317' },
  { driverName:'SIDHU, GURBAX',                    dl:'9761240',   dlJur:'MB', cls:'000', status:'NORMAL', date:'2022-10-05', time:'08:20', ticket:'AJ223803231', plate:'69603P', plateJur:'BC', location:'KAMLOOPS',    juris:'BC', act:'MVR', section:'37.18062', desc:'FAIL TO MAINTAIN ACCURATE LOGS',   equiv:'0402' },
];

const PENDING_DRIVER_CONTRA_PAGE = 10;

function statusBadgeCls(status: string) {
  if (status === 'HOLD')   return 'bg-rose-50 text-rose-700 border-rose-200';
  if (status === 'NORMAL') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-500 border-slate-200';
}

export function PendingDriverContraventionsList() {
  const [page, setPage] = useState(1);
  const total = PENDING_DRIVER_CONTRA_ROWS.length;
  const pages = Math.max(1, Math.ceil(total / PENDING_DRIVER_CONTRA_PAGE));
  const rows  = PENDING_DRIVER_CONTRA_ROWS.slice((page - 1) * PENDING_DRIVER_CONTRA_PAGE, page * PENDING_DRIVER_CONTRA_PAGE);

  return (
    <div className="bg-white">
      {/* Intro */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          This section lists all pending violations issued in BC to drivers operating under the carrier&apos;s safety certificate. These violations are in dispute and have not been deemed guilty or cancelled. NSC points are not assigned to a violation ticket until it has been deemed guilty.
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Contraventions are sorted alphabetically by driver name and are listed by violation date beginning with the most recent contravention.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Driver &middot; DL#</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Class</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Location &middot; Jur.</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Act &middot; Section</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Equiv</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{r.driverName}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.dl} <span className="font-bold">{r.dlJur}</span></div>
                </td>
                <td className="px-4 py-2.5 text-center font-mono text-slate-700">{r.cls}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeCls(r.status)}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-800">{r.date}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.time}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.ticket}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{r.location}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{r.juris}</div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-700">{r.act}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.section}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{r.desc}</td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600 whitespace-nowrap">{r.equiv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {total === 0 ? 0 : (page - 1) * PENDING_DRIVER_CONTRA_PAGE + 1}&ndash;{Math.min(page * PENDING_DRIVER_CONTRA_PAGE, total)} of {total}
        </span>
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

// ─── CVSA Inspection Summaries — two tables shown above the inspection list ──

const CVSA_INSPECTION_TYPES = [
  { type: 'Driver/Vehicle Inspections', count: 18, oos: 3, fail: 3, pass: 12 },
  { type: 'Vehicle Only Inspections',   count: 1,  oos: 0, fail: 0, pass: 1 },
  { type: 'Driver Only Inspections',    count: 14, oos: 0, fail: 5, pass: 9 },
];

const CVSA_DEFECT_TYPES: { code:string; label:string; oos?:number; oosPct?:number; fail?:number; failPct?:number; total?:number; totalPct?:number }[] = [
  { code:'40', label:'Driver',              oos:1, oosPct:6.25,  fail:7, failPct:43.75, total:8, totalPct:50.00 },
  { code:'41', label:'Lighting Devices',    oos:1, oosPct:6.25,                          total:1, totalPct:6.25 },
  { code:'42', label:'Windshield, Wipers',                      fail:1, failPct:6.25,   total:1, totalPct:6.25 },
  { code:'43', label:'Steering' },
  { code:'44', label:'Braking System',                          fail:3, failPct:18.75,  total:3, totalPct:18.75 },
  { code:'45', label:'Brake Adjustment' },
  { code:'46', label:'Suspension',          oos:1, oosPct:6.25, fail:1, failPct:6.25,   total:2, totalPct:12.50 },
  { code:'47', label:'Tires, Wheels, Rims' },
  { code:'48', label:'Fuel System' },
  { code:'49', label:'Exhaust System' },
  { code:'50', label:'Coupling Devices' },
  { code:'51', label:'Body, Frame',                             fail:1, failPct:6.25,   total:1, totalPct:6.25 },
  { code:'52', label:'Load Security' },
  { code:'53', label:'Emergency Exits' },
  { code:'54', label:'Dangerous Goods' },
  { code:'55', label:'Miscellaneous' },
];

// ─── CVIP Vehicle Inspection History ─────────────────────────────────────────

interface CvipRow {
  regi: string;
  plate: string;
  vehicle: string;
  date: string;
  type: string;
  facility: string;
  confirmation: string;
  decal: string;
  expiry: string;
  result: string;
}

const CVIP_ROWS: CvipRow[] = [
  { regi:'10537552', plate:'69124P', vehicle:'2006 FREIGHTLIN', date:'2022-04-20', type:'N&O',  facility:'',       confirmation:'FR66236',  decal:'',        expiry:'',           result:'N&O 2' },
  { regi:'11081163', plate:'68012P', vehicle:'2015 VOLVO',      date:'2022-01-05', type:'CVIP', facility:'S6903',  confirmation:'15934668', decal:'FR17405', expiry:'2022-07-31', result:'Pass (Repair Same Day)' },
  { regi:'11081163', plate:'68012P', vehicle:'2015 VOLVO',      date:'2021-06-01', type:'CVIP', facility:'S2225',  confirmation:'15408411', decal:'FP85965', expiry:'2021-12-31', result:'Pass' },
  { regi:'11848566', plate:'71085P', vehicle:'2016 VOLVO',      date:'2021-12-27', type:'CVIP', facility:'S15780', confirmation:'15920322', decal:'FR38592', expiry:'2022-06-30', result:'Pass' },
  { regi:'11848566', plate:'71085P', vehicle:'2016 VOLVO',      date:'2021-06-25', type:'CVIP', facility:'S15780', confirmation:'15476439', decal:'FP89266', expiry:'2021-12-31', result:'Pass' },
  { regi:'12584392', plate:'57354P', vehicle:'2018 FREIGHTLIN', date:'2021-10-18', type:'CVIP', facility:'S13560', confirmation:'15758356', decal:'FO71439', expiry:'2022-04-30', result:'Pass' },
  { regi:'12793166', plate:'60145P', vehicle:'2018 VOLVO',      date:'2021-10-25', type:'CVIP', facility:'S15370', confirmation:'15773773', decal:'FO55493', expiry:'2022-04-30', result:'Pass (Repair Same Day)' },
  { regi:'13041801', plate:'52569P', vehicle:'2020 VOLVO',      date:'2021-08-23', type:'CVIP', facility:'S4432',  confirmation:'15616677', decal:'FO31408', expiry:'2022-02-28', result:'Pass (Repair Same Day)' },
  { regi:'13155243', plate:'60938P', vehicle:'2020 VOLVO',      date:'2022-02-17', type:'CVIP', facility:'S5708',  confirmation:'16037046', decal:'FR82453', expiry:'2022-08-31', result:'Pass (Repair Same Day)' },
  { regi:'13155243', plate:'60938P', vehicle:'2020 VOLVO',      date:'2021-08-29', type:'CVIP', facility:'S14470', confirmation:'15633171', decal:'FO13485', expiry:'2022-02-28', result:'Pass' },
  { regi:'13257556', plate:'72250P', vehicle:'2020 VOLVO',      date:'2021-09-28', type:'CVIP', facility:'S3371',  confirmation:'15709712', decal:'FO61597', expiry:'2022-03-31', result:'Pass' },
  { regi:'13322983', plate:'57381P', vehicle:'2021 VOLVO',      date:'2021-11-22', type:'CVIP', facility:'S13920', confirmation:'15844346', decal:'FR02012', expiry:'2022-05-31', result:'Pass' },
  { regi:'13322983', plate:'57381P', vehicle:'2021 VOLVO',      date:'2021-05-25', type:'CVIP', facility:'S13920', confirmation:'15386940', decal:'FP98757', expiry:'2021-11-30', result:'Pass (Repair Same Day)' },
  { regi:'13322984', plate:'57380P', vehicle:'2021 VOLVO',      date:'2021-05-17', type:'CVIP', facility:'S14470', confirmation:'15369435', decal:'FP33296', expiry:'2021-11-30', result:'Pass' },
];

const CVIP_PAGE = 10;

function cvipResultBadge(result: string) {
  if (result.startsWith('N&O'))     return 'bg-red-50 text-red-700 border-red-200';
  if (result.includes('Repair'))    return 'bg-amber-50 text-amber-700 border-amber-200';
  if (result === 'Pass')            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (result === 'Fail')            return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function cvipTypeBadge(type: string) {
  if (type === 'N&O')  return 'bg-rose-50 text-rose-700 border-rose-200';
  if (type === 'CVIP') return 'bg-slate-50 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function CvipInspectionList() {
  const [page, setPage] = useState(1);
  const total = CVIP_ROWS.length;
  const pages = Math.max(1, Math.ceil(total / CVIP_PAGE));
  const rows  = CVIP_ROWS.slice((page - 1) * CVIP_PAGE, page * CVIP_PAGE);

  return (
    <div className="bg-white">
      {/* Intro */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          This section lists all commercial vehicle inspections (CVIP) conducted on and all outstanding Notice &amp; Orders (N&amp;O Box 1 or Box 2) issued to vehicles operating under the safety certificate during the requested period. CVIP inspections and Notice &amp; Orders are listed for informational purposes only. NSC points are not assigned based on inspection results.
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          If vehicles are regularly failing CVIP inspections, NSC recommends that the carrier review their vehicle maintenance and trip inspection programs to ensure that defects are being resolved in a timely manner and vehicles are being properly maintained throughout the year.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Regi # &middot; Plate</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Vehicle</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Facility #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Confirmation #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Decal #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Expiry Date</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 font-mono text-slate-800 whitespace-nowrap">{r.date}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${cvipTypeBadge(r.type)}`}>{r.type}</span>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono font-semibold text-slate-800">{r.regi}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.plate}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">{r.vehicle}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.facility || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.confirmation || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.decal || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">{r.expiry || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-4 py-2.5 text-center whitespace-nowrap">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${cvipResultBadge(r.result)}`}>{r.result}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {(page - 1) * CVIP_PAGE + 1}&ndash;{Math.min(page * CVIP_PAGE, total)} of {total}
        </span>
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

// ─── Accident Details list (shown after summary) ─────────────────────────────

interface AccidentDetailRow {
  date: string; time: string; report: string; location: string; jur: string;
  driverName: string; dl: string; dlJur: string;
  plate: string; plateJur: string; regi: string; vehDesc: string;
  type: string; fault: string; charges: string; pts: number;
}

const ACCIDENT_DETAIL_ROWS: AccidentDetailRow[] = [
  { date:'2023-03-03', time:'09:48', report:'6653022', location:'PICKERING, BAYLY ST',         jur:'ON', driverName:'KHAIRA, EKAMPREET SINGH', dl:'K31462008981001', dlJur:'ON', plate:'76118P', plateJur:'BC', regi:'14199432', vehDesc:'', type:'Property', fault:'At Fault', charges:'No', pts:2 },
  { date:'2023-01-07', time:'23:53', report:'6636812', location:'THUNDER BAY, 11',             jur:'ON', driverName:'PUREWAL, MANJEET K',      dl:'P93585165625620', dlJur:'ON', plate:'66581P', plateJur:'BC', regi:'13379226', vehDesc:'', type:'Property', fault:'No Fault', charges:'No', pts:0 },
  { date:'2022-12-12', time:'09:16', report:'6631431', location:'BLIND RIVER, CAUSLEY',        jur:'ON', driverName:'HANAD, HUSSEIN',          dl:'173885906',       dlJur:'AB', plate:'57380P', plateJur:'BC', regi:'13322984', vehDesc:'', type:'Property', fault:'At Fault', charges:'No', pts:2 },
  { date:'2022-12-03', time:'00:00', report:'6652780', location:'KENORA, 17',                  jur:'ON', driverName:'HARJOT SINGH',            dl:'H00670000970520', dlJur:'ON', plate:'74162P', plateJur:'BC', regi:'13379228', vehDesc:'', type:'Injury',   fault:'At Fault', charges:'No', pts:4 },
  { date:'2022-08-18', time:'21:45', report:'6614519', location:'MISSISSAUGA, 401',            jur:'ON', driverName:'HAROON, MOHAMMAD',        dl:'170551428',       dlJur:'AB', plate:'70365P', plateJur:'BC', regi:'13948198', vehDesc:'', type:'Property', fault:'No Fault', charges:'No', pts:0 },
  { date:'2022-01-05', time:'11:15', report:'6590210', location:'SOUTH GLENGARRY, BOUNDARY RD', jur:'ON', driverName:'GURSIMRAN SINGH',         dl:'G94100000970707', dlJur:'ON', plate:'63612P', plateJur:'BC', regi:'13633577', vehDesc:'', type:'Property', fault:'No Fault', charges:'No', pts:0 },
  { date:'2021-10-02', time:'17:20', report:'6577241', location:'THUNDER BAY, 11',             jur:'ON', driverName:'AMANJEET SINGH',          dl:'A57090000980111', dlJur:'ON', plate:'63604P', plateJur:'BC', regi:'13630372', vehDesc:'', type:'Property', fault:'No Fault', charges:'No', pts:0 },
  { date:'2021-09-27', time:'06:12', report:'6576601', location:'THUNDER BAY, 17',             jur:'ON', driverName:'DAMANJIT SINGH',          dl:'D03370000980108', dlJur:'ON', plate:'58264P', plateJur:'BC', regi:'13411583', vehDesc:'', type:'Property', fault:'No Fault', charges:'No', pts:0 },
  { date:'2021-08-04', time:'16:02', report:'6570273', location:'BLACK RIVER-MATHESON, 11',    jur:'ON', driverName:'ADARSHPREET SINGH',       dl:'A17970000940408', dlJur:'ON', plate:'60139P', plateJur:'BC', regi:'13493007', vehDesc:'', type:'Injury',   fault:'At Fault', charges:'No', pts:0 },
  { date:'2021-06-24', time:'00:16', report:'6567003', location:'THUNDER BAY, 11',             jur:'ON', driverName:'SANDHU, KAMALPREET',      dl:'SANDHK5064W4',    dlJur:'MB', plate:'57352P', plateJur:'BC', regi:'13365200', vehDesc:'', type:'Property', fault:'No Fault', charges:'No', pts:0 },
  { date:'2021-06-13', time:'01:00', report:'6564120', location:'THUNDER BAY, 11',             jur:'ON', driverName:'SAHOTA, KALWINDER',       dl:'S00502107403',    dlJur:'QC', plate:'57434P', plateJur:'BC', regi:'13147505', vehDesc:'', type:'Property', fault:'At Fault', charges:'No', pts:0 },
];

const ACCIDENT_LIST_PAGE = 10;

function accidentFaultBadge(fault: string) {
  if (fault === 'At Fault')      return 'bg-red-50 text-red-700 border-red-200';
  if (fault === 'Fault Unknown') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (fault === 'No Fault')      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

function accidentTypeBadge(type: string) {
  if (type === 'Fatality') return 'bg-red-50 text-red-700 border-red-200';
  if (type === 'Injury')   return 'bg-amber-50 text-amber-700 border-amber-200';
  if (type === 'Property') return 'bg-slate-50 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function AccidentDetailsList() {
  const [page, setPage] = useState(1);
  const total = ACCIDENT_DETAIL_ROWS.length;
  const pages = Math.max(1, Math.ceil(total / ACCIDENT_LIST_PAGE));
  const rows  = ACCIDENT_DETAIL_ROWS.slice((page - 1) * ACCIDENT_LIST_PAGE, page * ACCIDENT_LIST_PAGE);

  return (
    <div className="bg-white border-t border-slate-200">
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Details</span>
        <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">{total} accidents</span>
        <span className="ml-auto text-[9px] text-slate-400">Newest first &middot; driver, vehicle, fault, and charges laid</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Report #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Location &middot; Jur.</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver &middot; DL#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Vehicle</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Type</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Fault</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Charges</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-800">{r.date}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.time}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.report}</td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{r.location}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{r.jur}</div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-slate-800">{r.driverName}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.dl} <span className="font-bold">{r.dlJur}</span></div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-700">{r.plate} <span className="text-slate-400">{r.plateJur}</span></div>
                  <div className="text-[10px] font-mono text-slate-500">Regi {r.regi}</div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${accidentTypeBadge(r.type)}`}>{r.type}</span>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${accidentFaultBadge(r.fault)}`}>{r.fault}</span>
                </td>
                <td className="px-4 py-2.5 text-center font-mono text-slate-600">{r.charges}</td>
                <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: r.pts >= 3 ? '#dc2626' : r.pts >= 1 ? '#d97706' : '#94a3b8' }}>
                  {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {(page - 1) * ACCIDENT_LIST_PAGE + 1}&ndash;{Math.min(page * ACCIDENT_LIST_PAGE, total)} of {total}
        </span>
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

// ─── Accident Summary (Pull-by-Pull drill-down) ──────────────────────────────

const ACCIDENT_SUMMARY_ROWS = [
  { type:'Fatality', count:0, atFault:0, faultUnknown:0, notAtFault:0, pts:0 },
  { type:'Injury',   count:1, atFault:1, faultUnknown:0, notAtFault:0, pts:4 },
  { type:'Property', count:4, atFault:2, faultUnknown:0, notAtFault:2, pts:4 },
];

export function AccidentSummaryTable() {
  const totals = ACCIDENT_SUMMARY_ROWS.reduce(
    (a, r) => ({ count:a.count+r.count, atFault:a.atFault+r.atFault, faultUnknown:a.faultUnknown+r.faultUnknown, notAtFault:a.notAtFault+r.notAtFault, pts:a.pts+r.pts }),
    { count:0, atFault:0, faultUnknown:0, notAtFault:0, pts:0 }
  );

  return (
    <div className="bg-white">
      {/* Intro */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          This section lists all police-reported accidents involving commercial vehicles operating under this safety certificate during the requested time period.
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          NSC points are assigned to accidents where the driver was 50% or more at fault, or if fault is unknown. The number of points assigned is based on the accident type. NSC points are valid for 1 year from the Accident Date. Active points are only displayed for accidents that impact the carrier&apos;s profile scores.
        </p>
      </div>

      {/* Summary table */}
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Summary</div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 text-left  font-bold">Accident Type</th>
                <th className="px-3 py-2 text-center font-bold">Accidents (Last 12 Mo.)</th>
                <th className="px-3 py-2 text-center font-bold">At Fault</th>
                <th className="px-3 py-2 text-center font-bold">Fault Unknown</th>
                <th className="px-3 py-2 text-center font-bold">Not at Fault</th>
                <th className="px-3 py-2 text-center font-bold text-amber-500">Active Points</th>
              </tr>
            </thead>
            <tbody>
              {ACCIDENT_SUMMARY_ROWS.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-3 py-2 font-medium text-slate-800">{row.type}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.count > 0 ? 'font-semibold text-slate-700' : 'text-slate-300'}`}>{row.count}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.atFault > 0 ? 'font-bold text-red-600' : 'text-slate-300'}`}>{row.atFault}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.faultUnknown > 0 ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.faultUnknown}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.notAtFault > 0 ? 'font-bold text-emerald-600' : 'text-slate-300'}`}>{row.notAtFault}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.pts > 0 ? 'font-black text-amber-600' : 'text-slate-300'}`}>{row.pts}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900">
                <td className="px-3 py-2 text-[10px] uppercase tracking-wider">Total Accidents</td>
                <td className="px-3 py-2 text-center font-mono">{totals.count}</td>
                <td className="px-3 py-2 text-center font-mono text-red-700">{totals.atFault}</td>
                <td className="px-3 py-2 text-center font-mono text-amber-700">{totals.faultUnknown}</td>
                <td className="px-3 py-2 text-center font-mono text-emerald-700">{totals.notAtFault}</td>
                <td className="px-3 py-2 text-center font-mono text-amber-700">{totals.pts}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface CvsaUnit { kind:string; plate:string; plateJur:string; regi:string; desc:string; result:string; defect?:string }
interface CvsaInspectionRec {
  date:string; time:string; doc:string; location:string; jur:string; level:number; result:string; pts?:number;
  driverName:string; dl:string; dlJur:string;
  units: CvsaUnit[];
}

const CVSA_INSPECTION_LIST: CvsaInspectionRec[] = [
  { date:'2023-03-16', time:'10:50', doc:'0019851', location:'D8 NORTH',              jur:'NB', level:3, result:'Pass',
    driverName:'GHAT, HARDEEP',              dl:'G32503140951025', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'58857P', plateJur:'BC', regi:'13155227', desc:'VOLVO 2020', result:'Pass' },
            { kind:'Semi-Trailer', plate:'V8881L', plateJur:'ON', regi:'',         desc:'',           result:'Pass' } ] },
  { date:'2023-03-08', time:'10:20', doc:'0416901', location:'KELLY LAKE SCALE',      jur:'NS', level:3, result:'Pass',
    driverName:'SINGH, MANPREET',            dl:'M04670000990212', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'74785P', plateJur:'BC', regi:'13379227', desc:'VOLVO', result:'Pass' },
            { kind:'Semi-Trailer', plate:'W7693V', plateJur:'ON', regi:'',         desc:'MANA',  result:'Pass' } ] },
  { date:'2023-03-06', time:'12:45', doc:'6648881', location:'BOWMANVILLE TIS',       jur:'ON', level:2, result:'Pass',
    driverName:'DHALIWAL, GURPREET S',       dl:'DHALIGS242JC',    dlJur:'MB',
    units:[ { kind:'Power Unit',   plate:'77489P', plateJur:'BC', regi:'14239431', desc:'VOLV', result:'Pass' },
            { kind:'Semi-Trailer', plate:'V6032Z', plateJur:'ON', regi:'',         desc:'STOU', result:'Pass' } ] },
  { date:'2023-02-23', time:'00:23', doc:'6646725', location:'LANCASTER TIS',         jur:'ON', level:2, result:'OOS', pts:3,
    driverName:'CHAUDHRY, NAEEM TAHIR MOHAMMAD', dl:'C32575778740825', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'74752P', plateJur:'BC', regi:'14124468', desc:'FRTH', result:'Pass' },
            { kind:'Semi-Trailer', plate:'V6373B', plateJur:'ON', regi:'',         desc:'MANA', result:'OOS',  defect:'41' } ] },
  { date:'2023-02-21', time:'08:21', doc:'9035309', location:'Kamloops',              jur:'BC', level:3, result:'Fail',
    driverName:'BRAR, VARINDERPAL SINGH',    dl:'B72077638930501', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'72842P', plateJur:'BC', regi:'14037117', desc:'VOLVO', result:'Fail', defect:'40' },
            { kind:'Trailer 1',    plate:'X8520H', plateJur:'ON', regi:'',         desc:'UTIL',  result:'Pass' } ] },
  { date:'2023-02-04', time:'10:50', doc:'6638588', location:'LANCASTER TIS',         jur:'ON', level:2, result:'Pass',
    driverName:'PARMAR, TANUJ',              dl:'P06307320010922', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'69602P', plateJur:'BC', regi:'13925304', desc:'VOLV', result:'Pass' },
            { kind:'Semi-Trailer', plate:'V8867L', plateJur:'ON', regi:'',         desc:'MANA', result:'Pass' } ] },
  { date:'2023-01-07', time:'19:30', doc:'6643801', location:'BOWMANVILLE TIS',       jur:'ON', level:3, result:'Pass',
    driverName:'KHAIRA, EKAMPREET SINGH',    dl:'K31462008981001', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'76118P', plateJur:'BC', regi:'14199432', desc:'INTL', result:'Pass' },
            { kind:'Semi-Trailer', plate:'V4156Y', plateJur:'ON', regi:'',         desc:'MANA', result:'Pass' } ] },
  { date:'2023-01-04', time:'22:38', doc:'2052337', location:'HWY 1 AND GARDEN RD',   jur:'AB', level:3, result:'Fail',
    driverName:'MANDER, PAWANDEEP SINGH',    dl:'176158046',       dlJur:'TX',
    units:[ { kind:'Power Unit',   plate:'66657P', plateJur:'BC', regi:'13810162', desc:'VOLVO N/A', result:'Fail', defect:'40' },
            { kind:'Semi-Trailer', plate:'P1060D', plateJur:'ON', regi:'',         desc:'MANA N/A',  result:'Pass' } ] },
  { date:'2022-12-30', time:'10:30', doc:'6645144', location:'COCHRANE TIS',          jur:'ON', level:2, result:'Pass',
    driverName:'PARMAR, TANUJ',              dl:'P06307320010922', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'69602P', plateJur:'BC', regi:'13925304', desc:'VOLV', result:'Pass' },
            { kind:'Semi-Trailer', plate:'V6370B', plateJur:'ON', regi:'',         desc:'MANA', result:'Pass' } ] },
  { date:'2022-12-27', time:'11:30', doc:'0289312', location:'0 LANGHAM SCALE',       jur:'SK', level:3, result:'Pass',
    driverName:'KHAIRA, EKAMPREET SINGH',    dl:'K31462008981001', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'76118P', plateJur:'BC', regi:'14199432', desc:'555 3193', result:'Pass' },
            { kind:'Semi-Trailer', plate:'T2134W', plateJur:'ON', regi:'',         desc:'701 4248', result:'Pass' } ] },
  { date:'2022-12-23', time:'07:18', doc:'6642675', location:'WHITBY TIS',            jur:'ON', level:2, result:'OOS', pts:3,
    driverName:'VIRK, KAMALPREET SINGH',     dl:'V46044248990708', dlJur:'ON',
    units:[ { kind:'Power Unit',   plate:'56267P', plateJur:'BC', regi:'13280659', desc:'VOLV', result:'Pass' },
            { kind:'Semi-Trailer', plate:'S4826K', plateJur:'ON', regi:'',         desc:'MANA', result:'OOS', defect:'46' } ] },
  { date:'2022-12-09', time:'15:34', doc:'0289040', location:'0 CS00107',             jur:'SK', level:3, result:'Pass',
    driverName:'SINGH, KARANBIR',            dl:'316485',          dlJur:'PE',
    units:[ { kind:'Power Unit',   plate:'72075P', plateJur:'BC', regi:'13339308', desc:'', result:'Pass' },
            { kind:'Semi-Trailer', plate:'W8795E', plateJur:'ON', regi:'', desc:'', result:'Pass' } ] },
];

const CVSA_LIST_PAGE = 10;

function cvsaResultBadge(result: string) {
  if (result === 'OOS')  return 'bg-red-50 text-red-700 border-red-200';
  if (result === 'Fail') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (result === 'Pass') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-100 text-slate-500 border-slate-200';
}

export function CvsaInspectionDetailsList() {
  const [page, setPage] = useState(1);
  const total = CVSA_INSPECTION_LIST.length;
  const pages = Math.max(1, Math.ceil(total / CVSA_LIST_PAGE));
  const rows  = CVSA_INSPECTION_LIST.slice((page - 1) * CVSA_LIST_PAGE, page * CVSA_LIST_PAGE);

  return (
    <div className="bg-white border-t border-slate-200">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Document #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Location &middot; Jur.</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Level</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Driver &middot; DL#</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Power Unit</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Trailer</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Result</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Defect</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((rec, i) => {
              const pu  = rec.units.find(u => u.kind === 'Power Unit');
              const tr  = rec.units.find(u => u.kind === 'Semi-Trailer' || u.kind === 'Trailer 1');
              const defects = rec.units.map(u => u.defect).filter(Boolean).join(', ');
              return (
                <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="font-mono text-slate-800">{rec.date}</div>
                    <div className="text-[10px] font-mono text-slate-500">{rec.time}</div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{rec.doc}</td>
                  <td className="px-4 py-2.5">
                    <div className="text-slate-700">{rec.location}</div>
                    <div className="text-[10px] font-semibold text-slate-500">{rec.jur}</div>
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">{rec.level}</td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-slate-800">{rec.driverName}</div>
                    <div className="text-[10px] font-mono text-slate-500">{rec.dl} <span className="font-bold">{rec.dlJur}</span></div>
                  </td>
                  <td className="px-4 py-2.5">
                    {pu ? (
                      <>
                        <div className="font-mono text-slate-700">{pu.plate} <span className="text-slate-400">{pu.plateJur}</span></div>
                        <div className="text-[10px] text-slate-500">{pu.desc || <span className="text-slate-300">&mdash;</span>}</div>
                      </>
                    ) : <span className="text-slate-300">&mdash;</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {tr ? (
                      <>
                        <div className="font-mono text-slate-700">{tr.plate} <span className="text-slate-400">{tr.plateJur}</span></div>
                        <div className="text-[10px] text-slate-500">{tr.kind} &middot; {tr.desc || <span className="text-slate-300">&mdash;</span>}</div>
                      </>
                    ) : <span className="text-slate-300">&mdash;</span>}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${cvsaResultBadge(rec.result)}`}>{rec.result}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono font-bold text-red-600 whitespace-nowrap">{defects || <span className="text-slate-300 font-normal">&mdash;</span>}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: rec.pts && rec.pts >= 3 ? '#dc2626' : rec.pts ? '#d97706' : '#94a3b8' }}>
                    {rec.pts ? rec.pts : <span className="text-slate-300">&mdash;</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {(page - 1) * CVSA_LIST_PAGE + 1}&ndash;{Math.min(page * CVSA_LIST_PAGE, total)} of {total}
        </span>
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

export function CvsaInspectionSummaries() {
  const itTotals = CVSA_INSPECTION_TYPES.reduce(
    (a, r) => ({ count:a.count+r.count, oos:a.oos+r.oos, fail:a.fail+r.fail, pass:a.pass+r.pass }),
    { count:0, oos:0, fail:0, pass:0 }
  );

  return (
    <div className="bg-white divide-y divide-slate-100">
      {/* Summary — Inspection Types */}
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Summary &mdash; Inspection Types (Past 12 Months)</div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 text-left font-bold">Inspection Type</th>
                <th className="px-3 py-2 text-center font-bold">Inspections (Past 12 Mo.)</th>
                <th className="px-3 py-2 text-center font-bold">Out of Service (OOS)</th>
                <th className="px-3 py-2 text-center font-bold">Violations Present (Fail)</th>
                <th className="px-3 py-2 text-center font-bold">Pass</th>
              </tr>
            </thead>
            <tbody>
              {CVSA_INSPECTION_TYPES.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'} hover:bg-blue-50/20 transition-colors`}>
                  <td className="px-3 py-2 font-medium text-slate-800">{row.type}</td>
                  <td className="px-3 py-2 text-center font-mono font-semibold text-slate-700">{row.count}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.oos > 0 ? 'font-bold text-red-600' : 'text-slate-300'}`}>{row.oos}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.fail > 0 ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.fail}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.pass > 0 ? 'font-bold text-emerald-600' : 'text-slate-300'}`}>{row.pass}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900">
                <td className="px-3 py-2 text-[10px] uppercase tracking-wider">Total Inspections</td>
                <td className="px-3 py-2 text-center font-mono">{itTotals.count}</td>
                <td className="px-3 py-2 text-center font-mono text-red-700">{itTotals.oos}</td>
                <td className="px-3 py-2 text-center font-mono text-amber-700">{itTotals.fail}</td>
                <td className="px-3 py-2 text-center font-mono text-emerald-700">{itTotals.pass}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary — CVSA Defect Type */}
      <div className="p-4 space-y-3">
        <div className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Summary &mdash; CVSA Defect Type</div>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2 text-left font-bold">CVSA Defect Type</th>
                <th className="px-3 py-2 text-center font-bold">OOS</th>
                <th className="px-3 py-2 text-center font-bold">% of Defects</th>
                <th className="px-3 py-2 text-center font-bold">Fail</th>
                <th className="px-3 py-2 text-center font-bold">% of Defects</th>
                <th className="px-3 py-2 text-center font-bold">Total Defects</th>
                <th className="px-3 py-2 text-center font-bold">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {CVSA_DEFECT_TYPES.map((row, i) => (
                <tr key={i} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                  <td className={`px-3 py-2 ${row.total ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                    <span className="font-mono text-slate-500 mr-2">{row.code} -</span>{row.label}
                  </td>
                  <td className={`px-3 py-2 text-center font-mono ${row.oos ? 'font-bold text-red-600' : 'text-slate-300'}`}>{row.oos ?? ''}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.oosPct ? 'text-slate-600' : 'text-slate-300'}`}>{row.oosPct ? row.oosPct.toFixed(2) : ''}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.fail ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.fail ?? ''}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.failPct ? 'text-slate-600' : 'text-slate-300'}`}>{row.failPct ? row.failPct.toFixed(2) : ''}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.total ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.total ?? ''}</td>
                  <td className={`px-3 py-2 text-center font-mono ${row.totalPct ? 'text-slate-600' : 'text-slate-300'}`}>{row.totalPct ? row.totalPct.toFixed(2) : ''}</td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t border-slate-300 font-bold text-slate-900">
                <td className="px-3 py-2 text-[10px] uppercase tracking-wider">Total Defects</td>
                <td className="px-3 py-2 text-center font-mono text-red-700">3</td>
                <td className="px-3 py-2 text-center font-mono">18.75</td>
                <td className="px-3 py-2 text-center font-mono text-amber-700">13</td>
                <td className="px-3 py-2 text-center font-mono">81.25</td>
                <td className="px-3 py-2 text-center font-mono">16</td>
                <td className="px-3 py-2 text-center font-mono">100.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Pending Carrier Contraventions — flat row-per-violation list ────────────

interface PendingCarrierContraventionRow {
  date: string;
  time: string;
  ticket: string;
  plate: string;
  plateJur: string;
  location: string;
  juris: string;
  act: string;
  section: string;
  desc: string;
  equiv: string;
  status: string;
}

const PENDING_CARRIER_CONTRA_ROWS: PendingCarrierContraventionRow[] = [
  { date:'2023-03-18', time:'11:42', ticket:'EA601205811', plate:'72075P', plateJur:'BC', location:'LANGLEY',     juris:'BC', act:'MVA', section:'198',     desc:'OPERATE UNSAFE VEHICLE',              equiv:'0605', status:'NORMAL' },
  { date:'2023-01-09', time:'09:15', ticket:'ST052840132', plate:'57380P', plateJur:'BC', location:'KAMLOOPS',    juris:'BC', act:'MVA', section:'37.05',   desc:'FAIL TO DISPLAY NSC',                 equiv:'0815', status:'NORMAL' },
  { date:'2022-12-05', time:'14:28', ticket:'AJ224500921', plate:'66581P', plateJur:'BC', location:'SURREY',      juris:'BC', act:'MVA', section:'220.4',   desc:'FAIL TO WEAR SEAT BELT',              equiv:'0212', status:'HOLD' },
];

const PENDING_CARRIER_CONTRA_PAGE = 10;

export function PendingCarrierContraventionsList() {
  const [page, setPage] = useState(1);
  const total = PENDING_CARRIER_CONTRA_ROWS.length;
  const pages = Math.max(1, Math.ceil(total / PENDING_CARRIER_CONTRA_PAGE));
  const rows  = PENDING_CARRIER_CONTRA_ROWS.slice((page - 1) * PENDING_CARRIER_CONTRA_PAGE, page * PENDING_CARRIER_CONTRA_PAGE);

  return (
    <div className="bg-white">
      {/* Intro */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          This section lists all pending violations issued in BC to the carrier. These violations are in dispute and have not been deemed guilty or cancelled. NSC points are not assigned to a violation ticket until it has been deemed guilty.
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Contraventions are listed in date order by violation date beginning with the most recent contravention.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Location &middot; Jur.</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Act &middot; Section</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Equiv</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-800">{r.date}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.time}</div>
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeCls(r.status)}`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.ticket}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{r.location}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{r.juris}</div>
                </td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-700">{r.act}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.section}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{r.desc}</td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600 whitespace-nowrap">{r.equiv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {total === 0 ? 0 : (page - 1) * PENDING_CARRIER_CONTRA_PAGE + 1}&ndash;{Math.min(page * PENDING_CARRIER_CONTRA_PAGE, total)} of {total}
        </span>
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

// ─── Carrier Contraventions (Guilty) — flat row-per-violation list ───────────

interface CarrierContraventionRow {
  date: string;
  time: string;
  ticket: string;
  plate: string;
  plateJur: string;
  location: string;
  juris: string;
  dispDate: string;
  act: string;
  section: string;
  desc: string;
  equiv: string;
  pts: number;
}

const CARRIER_CONTRA_ROWS: CarrierContraventionRow[] = [
  { date:'2022-04-06', time:'15:10', ticket:'EA600435161', plate:'69603P', plateJur:'BC', location:'CLEARWATER', juris:'BC', dispDate:'2022-05-07', act:'MVA', section:'220.4', desc:'FAIL TO WEAR SEAT BELT',     equiv:'0212', pts:2 },
  { date:'2022-01-14', time:'08:13', ticket:'ST052609061', plate:'60938P', plateJur:'BC', location:'DELTA',      juris:'BC', dispDate:'2022-10-20', act:'MVA', section:'129.1', desc:'RED LIGHT AT INTERSECTION',  equiv:'0104', pts:4 },
];

const CARRIER_CONTRA_PAGE = 10;

export function CarrierContraventionsList() {
  const [page, setPage] = useState(1);
  const total = CARRIER_CONTRA_ROWS.length;
  const pages = Math.max(1, Math.ceil(total / CARRIER_CONTRA_PAGE));
  const rows  = CARRIER_CONTRA_ROWS.slice((page - 1) * CARRIER_CONTRA_PAGE, page * CARRIER_CONTRA_PAGE);

  return (
    <div className="bg-white">
      {/* Intro */}
      <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
        <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
          This section lists all violation tickets issued to the carrier and deemed guilty during the requested time period. Contraventions are listed in date order by violation date beginning with the most recent contravention.
        </p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          NSC Points are assigned for 12 months from the disposition date. Active points are only displayed for contraventions that impact the carrier&apos;s profile scores.
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Date &middot; Time</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Location &middot; Jur.</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Disp. Date</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Act &middot; Section</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Equiv</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/30' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-800">{r.date}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.time}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.ticket}</td>
                <td className="px-4 py-2.5 font-mono text-slate-700 whitespace-nowrap">{r.plate} <span className="text-slate-400">{r.plateJur}</span></td>
                <td className="px-4 py-2.5">
                  <div className="text-slate-700">{r.location}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{r.juris}</div>
                </td>
                <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">{r.dispDate}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">
                  <div className="font-mono text-slate-700">{r.act || <span className="text-slate-300">&mdash;</span>}</div>
                  <div className="text-[10px] font-mono text-slate-500">{r.section || <span className="text-slate-300">&mdash;</span>}</div>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{r.desc}</td>
                <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-600 whitespace-nowrap">{r.equiv}</td>
                <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: ptsColor(r.pts) }}>
                  {r.pts > 0 ? r.pts : <span className="text-slate-300">&mdash;</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {total === 0 ? 0 : (page - 1) * CARRIER_CONTRA_PAGE + 1}&ndash;{Math.min(page * CARRIER_CONTRA_PAGE, total)} of {total}
        </span>
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

// ─── Active Fleet data ────────────────────────────────────────────────────────

interface BcFleetRow { regi: string; plate: string; year: number; make: string; owner: string; gvw: number | '' }

const BC_FLEET_ROWS: BcFleetRow[] = [
  { regi:'10988354', plate:'58226P', year:2015, make:'VOLVO',      owner:'BENNINGTON FINANCIAL CORP.',      gvw:47000 },
  { regi:'11081163', plate:'',       year:2015, make:'VOLVO',      owner:'',                                gvw:'' },
  { regi:'11848566', plate:'',       year:2016, make:'VOLVO',      owner:'',                                gvw:'' },
  { regi:'12584392', plate:'79997P', year:2018, make:'FREIGHTLIN', owner:'INERTIA CARRIER LTD.',            gvw:47000 },
  { regi:'12593082', plate:'58284P', year:2019, make:'VOLVO',      owner:'TPINE LEASING CAPITAL CORPO',     gvw:47000 },
  { regi:'12793166', plate:'60145P', year:2018, make:'VOLVO',      owner:'VFS CANADA INC.',                 gvw:47000 },
  { regi:'12875630', plate:'49434P', year:2013, make:'FREIGHTLIN', owner:'MITSUBISHI HC CAPITAL CANAD',     gvw:47000 },
  { regi:'12995683', plate:'46314P', year:2018, make:'FREIGHTLIN', owner:'TPINE LEASING CAPITAL CORPO',     gvw:47000 },
  { regi:'13147505', plate:'',       year:2014, make:'VOLVO',      owner:'',                                gvw:'' },
  { regi:'13155227', plate:'58857P', year:2020, make:'VOLVO',      owner:'MERCADO CAPITAL CORPORATION',     gvw:47000 },
  { regi:'13155243', plate:'60938P', year:2020, make:'VOLVO',      owner:'MERCADO CAPITAL CORPORATION',     gvw:47000 },
  { regi:'13280659', plate:'56267P', year:2021, make:'VOLVO',      owner:'VFS CANADA INC.',                 gvw:47000 },
  { regi:'13283319', plate:'',       year:2019, make:'MACK',       owner:'',                                gvw:'' },
  { regi:'13322982', plate:'57382P', year:2021, make:'VOLVO',      owner:'VFS CANADA INC.',                 gvw:47000 },
  { regi:'13322983', plate:'57381P', year:2021, make:'VOLVO',      owner:'VFS CANADA INC.',                 gvw:47000 },
  { regi:'13322984', plate:'57380P', year:2021, make:'VOLVO',      owner:'VFS CANADA INC.',                 gvw:47000 },
  { regi:'13339308', plate:'72075P', year:2020, make:'FREIGHTLIN', owner:'ARUNDEL CAPITAL CORPORATION',     gvw:47000 },
  { regi:'13365870', plate:'58006P', year:2006, make:'PETERBILT',  owner:'INERTIA CARRIER LTD.',            gvw:47000 },
  { regi:'13379226', plate:'66581P', year:2021, make:'VOLVO',      owner:'CANADIAN WESTERN BANK LEASI',     gvw:47000 },
  { regi:'13379227', plate:'74785P', year:2021, make:'VOLVO',      owner:'CWB NATIONAL LEASING INC.',       gvw:47000 },
  { regi:'13379228', plate:'74162P', year:2021, make:'VOLVO',      owner:'CWB NATIONAL LEASING INC.',       gvw:47000 },
  { regi:'13384125', plate:'58770P', year:2016, make:'VOLVO',      owner:'VFS CANADA INC.',                 gvw:47000 },
  { regi:'13399973', plate:'70362P', year:2016, make:'VOLVO',      owner:'INERTIA CARRIER LTD.',            gvw:47000 },
];

const FLEET_PAGE = 10;

export function BcActiveFleetTable() {
  const [page, setPage] = useState(1);
  const n     = BC_FLEET_ROWS.length;
  const pages = Math.max(1, Math.ceil(n / FLEET_PAGE));
  const rows  = BC_FLEET_ROWS.slice((page - 1) * FLEET_PAGE, page * FLEET_PAGE);
  return (
    <div className="bg-white">
      <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100">
        <p className="text-[10px] text-slate-500 leading-relaxed">Active Fleet from 17-Apr-2023 to 17-Apr-2025 &middot; this section identifies all commercial vehicles operating under this Safety Certificate during the requested report period.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="px-3 py-2 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Regi #</th>
              <th className="px-3 py-2 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Plate #</th>
              <th className="px-3 py-2 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Year</th>
              <th className="px-3 py-2 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Make</th>
              <th className="px-3 py-2 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Owner Name</th>
              <th className="px-3 py-2 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">GVW</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.regi} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''} hover:bg-blue-50/20 transition-colors`}>
                <td className="px-3 py-2.5 font-mono text-[11px] font-semibold text-slate-800">{r.regi}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{r.plate || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">{r.year}</td>
                <td className="px-3 py-2.5 text-[11px] font-semibold text-slate-700">{r.make}</td>
                <td className="px-3 py-2.5 text-[11px] text-slate-600">{r.owner || <span className="text-slate-300">&mdash;</span>}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[11px] text-slate-600">{r.gvw ? r.gvw.toLocaleString() : <span className="text-slate-300">&mdash;</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">{(page-1)*FLEET_PAGE+1}&ndash;{Math.min(page*FLEET_PAGE,n)} of {n}</span>
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

// ─── Pull-by-Pull monthly history table (shown under Profile Scores) ──────────

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

export function BcMonthHistoryTable() {
  const [page, setPage] = useState(1);
  const n     = BC_MONTH_ROWS.length;
  const pages = Math.max(1, Math.ceil(n / PBP_PAGE));
  const rows  = BC_MONTH_ROWS.slice((page - 1) * PBP_PAGE, page * PBP_PAGE);
  return (
    <div className="bg-white">
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

// ─── Pull-by-pull helpers ─────────────────────────────────────────────────────

type BcSt = 'Satisfactory' | 'Conditional' | 'Unsatisfactory';

function bcSt(total: number): BcSt {
  if (total >= 3.65) return 'Unsatisfactory';
  if (total >= 2.13) return 'Conditional';
  return 'Satisfactory';
}

const bcStColor = (st: BcSt) =>
  st === 'Unsatisfactory' ? '#dc2626' : st === 'Conditional' ? '#d97706' : '#16a34a';

const bcStBadgeCls = (st: BcSt) =>
  st === 'Unsatisfactory' ? 'bg-red-100 text-red-700 border-red-300'
: st === 'Conditional'    ? 'bg-amber-100 text-amber-700 border-amber-300'
:                           'bg-emerald-100 text-emerald-700 border-emerald-300';

const BC_CAT_THRESH: Record<string, [number, number]> = {
  contra: [1.76, 2.98], cvsa: [0.93, 1.08], acc: [0.23, 0.27], total: [2.13, 3.64],
};
function bcCatColor(cat: string, val: number): string {
  const [sat, cond] = BC_CAT_THRESH[cat] ?? [1, 2];
  if (val >= cond) return '#dc2626';
  if (val >= sat)  return '#d97706';
  return '#16a34a';
}

const BC_DRILL_CATS = [
  { key: 'contra' as const, label: 'Contraventions',        sat: 1.76, cond: 2.98 },
  { key: 'cvsa'   as const, label: 'CVSA (Out of Service)', sat: 0.93, cond: 1.08 },
  { key: 'acc'    as const, label: 'Accidents',             sat: 0.23, cond: 0.27 },
  { key: 'total'  as const, label: 'Total Score',           sat: 2.13, cond: 3.64 },
];

// ─── Label helper ─────────────────────────────────────────────────────────────

function shortLabel(pullDate: string): string {
  // "31-Mar-2025" → "Mar '25"
  const parts = pullDate.split('-');
  if (parts.length === 3) return `${parts[1]} '${parts[2].slice(2)}`;
  return pullDate;
}

// ─── BC Thresholds ────────────────────────────────────────────────────────────

const BC_TOTAL_SAT  = 2.13;
const BC_TOTAL_COND = 3.64;
const CAT_SAT: Record<string, number> = { contra: 1.76, cvsa: 0.93, acc: 0.23 };

// ─── SVG layout constants (matches CVOR sizing) ───────────────────────────────

const VW  = 1440;
const pL  = 74;
const pR  = 158;
const pT  = 30;
const pB  = 62;
const cW  = VW - pL - pR;

// ─── Mock data generators (deterministic per pull) ───────────────────────────

const CONTRA_ACTS = [
  { act: 'Commercial Transport Act', section: '37(1)', desc: 'Overweight — Single Axle',   weight: 3 },
  { act: 'Commercial Transport Act', section: '24(2)', desc: 'Log Book Deficiency',         weight: 2 },
  { act: 'Motor Vehicle Act',        section: '183',   desc: 'Speeding — 1–20 km/h over',  weight: 1 },
  { act: 'Motor Vehicle Act',        section: '144(1)',desc: 'Failure to Stop — Red Light', weight: 3 },
  { act: 'Commercial Transport Act', section: '7(1)',  desc: 'Operating Without Permit',    weight: 4 },
  { act: 'Motor Vehicle Act',        section: '25(1)', desc: 'Driving Without Licence',     weight: 5 },
  { act: 'Commercial Transport Act', section: '16(3)', desc: 'Hours of Service Violation',  weight: 2 },
  { act: 'Motor Vehicle Act',        section: '140',   desc: 'Improper Lane Change',        weight: 1 },
];
const CVSA_VIOLATIONS = [
  'Brake Adjustment Out of Tolerance',
  'Lighting Equipment Defect',
  'Tire Defect — Tread Depth',
  'Driver Hours of Service Exceeded',
  'Cargo Securement Deficiency',
  'Steering Defect',
  'Coupling Device Defect',
];
const ACCIDENT_TYPES = [
  { type: 'Rear-End Collision',    severity: 'Property Damage', at_fault: 'Driver' },
  { type: 'Lane Change Collision', severity: 'Injury',          at_fault: 'Driver' },
  { type: 'Intersection Collision',severity: 'Property Damage', at_fault: 'Unknown' },
  { type: 'Single Vehicle',        severity: 'Property Damage', at_fault: 'Driver' },
];

function seedRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0xffffffff; };
}

function genMockData(r: typeof BC_PULL_DATA[0]) {
  const seed = r.pullDate.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng  = seedRand(seed);

  const driverContraCount   = Math.max(0, Math.round(r.contra * 4 + rng() * 2));
  const carrierContraCount  = Math.max(0, Math.round(r.contra * 2 + rng() * 1.5));
  const pendingDriverCount  = Math.round(rng() * 2);
  const pendingCarrierCount = Math.round(rng() * 1);

  const [startYear, startMonth] = r.windowLabel.split(' → ')[0].split(' ');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const makeDate = () => {
    const mIdx = Math.floor(rng() * 12);
    const day  = Math.floor(rng() * 28) + 1;
    return `${String(day).padStart(2,'0')}-${months[mIdx]}-2024`;
  };

  const driverContras = Array.from({ length: driverContraCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate(), driver: `Driver ${String(Math.floor(rng() * 90) + 10)}` };
  });

  const carrierContras = Array.from({ length: carrierContraCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate() };
  });

  const pendingDriver = Array.from({ length: pendingDriverCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate(), driver: `Driver ${String(Math.floor(rng() * 90) + 10)}`, status: 'Pending' };
  });

  const pendingCarrier = Array.from({ length: pendingCarrierCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate(), status: 'Pending' };
  });

  const passCount = Math.round(r.inspections * (0.55 + rng() * 0.3));
  const oosCount  = r.cvsa > 0.5 ? Math.max(1, Math.round(r.inspections * 0.15)) : 0;
  const cvsaInspections = Array.from({ length: r.inspections }, (_, i) => {
    const isPas = i < passCount;
    const isOos = !isPas && i < passCount + oosCount;
    const vio   = isOos ? CVSA_VIOLATIONS[Math.floor(rng() * CVSA_VIOLATIONS.length)] : isPas ? 'None' : CVSA_VIOLATIONS[Math.floor(rng() * CVSA_VIOLATIONS.length)];
    const day   = Math.floor(rng() * 28) + 1;
    const mon   = months[Math.floor(rng() * 12)];
    return {
      date:   `${String(day).padStart(2,'0')}-${mon}-2024`,
      result: isOos ? 'Out of Service' : isPas ? 'Pass' : 'Fail',
      level:  `Level ${Math.floor(rng() * 3) + 1}`,
      violation: vio,
      location: ['Surrey, BC', 'Abbotsford, BC', 'Kamloops, BC', 'Prince George, BC', 'Kelowna, BC'][Math.floor(rng() * 5)],
    };
  });

  const accidentCount = r.acc > 0 ? Math.max(1, Math.round(r.acc * 10)) : 0;
  const accidents     = Array.from({ length: accidentCount }, () => {
    const a = ACCIDENT_TYPES[Math.floor(rng() * ACCIDENT_TYPES.length)];
    return { ...a, date: makeDate(), vehicles: Math.floor(rng() * 2) + 2 };
  });

  const auditDate = r.total > 2.0 ? makeDate() : null;

  const cvipCount = Math.floor(rng() * 5) + 2;
  const cvipInspections = Array.from({ length: cvipCount }, () => {
    const pass = rng() > 0.25;
    return {
      date:   makeDate(),
      unit:   `Unit ${String(Math.floor(rng() * 900) + 100)}`,
      result: pass ? 'Pass' : 'Fail',
      defects: pass ? 0 : Math.floor(rng() * 4) + 1,
      inspector: `CVIP-${String(Math.floor(rng() * 9000) + 1000)}`,
    };
  });

  return { driverContras, carrierContras, pendingDriver, pendingCarrier, cvsaInspections, accidents, auditDate, cvipInspections, startYear, startMonth };
}

// ─── Nested Accordion for each pull row ──────────────────────────────────────

type SectionKey = 's2'|'s3'|'s4'|'s5'|'s6'|'s7'|'s8';
type SubKey     = 's41'|'s42'|'s43'|'s44';

// NSC-Analysis-style row — title + subtitle left, stat + badge + chevron right
export function AnalysisRow({ title, subtitle, statLabel, statVal, badge, badgeCls, open, onToggle, children }: {
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

// Sub-row inside Contraventions (slightly indented style)
function SubRow({ title, subtitle, badge, badgeCls, open, onToggle, children }: {
  title: string; subtitle: string;
  badge?: string; badgeCls?: string;
  open: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-0.5"/>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-700 leading-tight">{title}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeCls ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {badge}
            </span>
          )}
          {open
            ? <ChevronDown  size={12} className="text-slate-400"/>
            : <ChevronRight size={12} className="text-slate-400"/>
          }
        </div>
      </button>
      {open && children && (
        <div className="border-t border-slate-100 bg-white">{children}</div>
      )}
    </div>
  );
}

function BcPullDrillDown({ r }: { r: typeof BC_PULL_DATA[0] }) {
  const [open,    setOpen]    = useState<Partial<Record<SectionKey, boolean>>>({ s2: true });
  const [openSub, setOpenSub] = useState<Partial<Record<SubKey, boolean>>>({});
  const tog    = (k: SectionKey) => setOpen(p => ({ ...p, [k]: !p[k] }));
  const togSub = (k: SubKey)     => setOpenSub(p => ({ ...p, [k]: !p[k] }));

  const mock = genMockData(r);
  const st   = bcSt(r.total);
  const sc   = bcStColor(st);

  const totalContras = mock.driverContras.length + mock.carrierContras.length + mock.pendingDriver.length + mock.pendingCarrier.length;
  const cvsaPass     = mock.cvsaInspections.filter(c => c.result === 'Pass').length;
  const cvsaOos      = mock.cvsaInspections.filter(c => c.result === 'Out of Service').length;
  const cvsaFail     = mock.cvsaInspections.filter(c => c.result === 'Fail').length;
  const cvipPass     = mock.cvipInspections.filter(c => c.result === 'Pass').length;
  const cvipFail     = mock.cvipInspections.filter(c => c.result === 'Fail').length;
  const cvipPassPct  = mock.cvipInspections.length > 0 ? Math.round((cvipPass / mock.cvipInspections.length) * 100) : 100;
  void cvipFail;
  void cvipPassPct;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* Pull header */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap border-b border-slate-100"
        style={{ background: sc + '0d', borderLeftWidth: 3, borderLeftColor: sc }}>
        <span className="text-[13px] font-black text-slate-800">{r.pullDate}</span>
        <span className="text-[11px] text-slate-400">{r.windowLabel}</span>
        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${bcStBadgeCls(st)}`}>{st}</span>
        <span className="text-[10px] text-slate-400 ml-auto">NSC BC Profile Report · {r.inspections} CVSA inspections</span>
      </div>

      {/* Analysis rows */}
      <div className="p-4 space-y-2.5">

        {/* ── Profile Scores ── */}
        <AnalysisRow
          title="Profile Scores"
          subtitle={`4 score categories · contraventions, CVSA (OOS), accidents, total · as of ${r.pullDate}`}
          statLabel="Total Score"
          statVal={r.total.toFixed(2)}
          badge={st.toUpperCase()}
          badgeCls={bcStBadgeCls(st)}
          open={!!open.s2}
          onToggle={() => tog('s2')}
        >
          <div className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-4 gap-3 mb-3">
              {BC_DRILL_CATS.map(cat => {
                const val   = r[cat.key];
                const catSt = val >= cat.cond ? 'Unsatisfactory' : val >= cat.sat ? 'Conditional' : 'Satisfactory';
                const color = bcCatColor(cat.key, val);
                const pct   = Math.min((val / (cat.cond * 1.5)) * 100, 100);
                return (
                  <div key={cat.key} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{cat.label}</div>
                    <div className="text-[28px] font-black font-mono leading-none" style={{ color }}>{val.toFixed(2)}</div>
                    <div className="text-[10px] font-semibold mt-0.5 mb-2.5" style={{ color }}>{catSt}</div>
                    <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                    <div className="flex justify-between text-[8px] mt-1.5 text-slate-400">
                      <span>0.00</span>
                      <span style={{ color: '#16a34a' }}>Sat {cat.sat}</span>
                      <span style={{ color: '#d97706' }}>Cond {cat.cond}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Total Profile Score: <strong style={{ color: sc }}>{r.total.toFixed(2)}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Satisfactory Limit: <strong className="text-emerald-600">2.130</strong></span>
              <span className="text-slate-300">·</span>
              <span>Conditional Limit: <strong className="text-amber-600">3.640</strong></span>
            </div>
            <BcMonthHistoryTable />
          </div>
        </AnalysisRow>

        {/* ── Active Fleet ── */}
        <AnalysisRow
          title="Active Fleet"
          subtitle={`${r.windowLabel} · vehicle days, monthly active days, average fleet size`}
          statLabel="Avg Fleet"
          statVal={r.avgFleet.toFixed(2)}
          badge={`${r.vehicleDays.toLocaleString()} VEHICLE DAYS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.s3}
          onToggle={() => tog('s3')}
        >
          <div className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Average Fleet Size',   val: r.avgFleet.toFixed(2),              unit: 'vehicles' },
                { label: 'Total Vehicle Days',    val: r.vehicleDays.toLocaleString(),     unit: '12-month window' },
                { label: 'Monthly Active Days',   val: r.monthlyActiveDays.toLocaleString(), unit: 'days this month' },
              ].map(item => (
                <div key={item.label} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-[26px] font-black font-mono text-blue-600 leading-none">{item.val}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{item.unit}</div>
                </div>
              ))}
            </div>
            <BcActiveFleetTable />
          </div>
        </AnalysisRow>

        {/* ── Contraventions ── */}
        <AnalysisRow
          title="Contraventions"
          subtitle={`${mock.driverContras.length} driver guilty · ${mock.carrierContras.length} carrier guilty · ${mock.pendingDriver.length + mock.pendingCarrier.length} pending`}
          statLabel="Grouped Total"
          statVal={`${r.contra.toFixed(2)}`}
          badge={`${totalContras} EVENTS`}
          badgeCls={totalContras > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.s4}
          onToggle={() => tog('s4')}
        >
          <div className="divide-y divide-slate-100">

            {/* ── Contravention Summary ── */}
            <div className="p-4 bg-slate-50/50">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Summary &mdash; Group Description and Equivalency Codes</div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <th className="px-3 py-2 text-left  text-[9px] font-bold text-slate-500 uppercase tracking-wider">Group Description and Equivalency Codes</th>
                      <th className="px-3 py-2 text-right text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Violations<br/>Last 12 Mo.</th>
                      <th className="px-3 py-2 text-right text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">% of<br/>Violations</th>
                      <th className="px-3 py-2 text-right text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Active<br/>Points</th>
                      <th className="px-3 py-2 text-right text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">% of Total<br/>Active Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { group:'Speeding (0001-0099)',                        viol:3,  violPct:'27.27%', pts:4,  ptsPct:'17.39%' },
                      { group:'Stop Signs and Traffic Lights (0100-0199)',   viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                      { group:"Driver's Liabilities (0200-0299)",           viol:1,  violPct:'9.09%',  pts:1,  ptsPct:'4.35%' },
                      { group:'Driving (0300-0399)',                         viol:4,  violPct:'36.36%', pts:11, ptsPct:'47.83%' },
                      { group:'Hours of Service (0400-0499)',                viol:1,  violPct:'9.09%',  pts:3,  ptsPct:'13.04%' },
                      { group:'Trip Inspection (0500-0599)',                 viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                      { group:'Mechanical Defects (0600-0699)',              viol:2,  violPct:'18.18%', pts:4,  ptsPct:'17.39%' },
                      { group:'Oversize & Overweight (0700-0799)',           viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                      { group:'Security of Loads (0900-0999)',               viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                      { group:'Dangerous Goods (1000)',                      viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                      { group:'Criminal Code (1100-1199)',                   viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                      { group:'Miscellaneous (1200-1299)',                   viol:0,  violPct:'',       pts:0,  ptsPct:'' },
                    ] as { group:string; viol:number; violPct:string; pts:number; ptsPct:string }[]).map((row, i) => (
                      <tr key={row.group} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}`}>
                        <td className="px-3 py-2 text-slate-700">{row.group}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">{row.viol > 0 ? row.viol : <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{row.violPct || <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: row.pts > 0 ? '#d97706' : undefined }}>{row.pts > 0 ? row.pts : <span className="text-slate-300">&mdash;</span>}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">{row.ptsPct || <span className="text-slate-300">&mdash;</span>}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100 border-t border-slate-300 font-bold">
                      <td className="px-3 py-2 text-[10px] font-black text-slate-700 uppercase tracking-wider">Totals</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-800">11</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">100.00%</td>
                      <td className="px-3 py-2 text-right font-mono font-black text-amber-600">23</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">100.00%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <SubRow
              title="Driver Contraventions (Guilty)"
              subtitle={`${DRIVER_CONTRA_ROWS.length} conviction events · offence act, section, equiv code, and active points`}
              badge={`${DRIVER_CONTRA_ROWS.length} EVENTS`}
              badgeCls="bg-amber-50 text-amber-600 border-amber-200"
              open={!!openSub.s41}
              onToggle={() => togSub('s41')}
            >
              <DriverContraventionsList />
            </SubRow>

            <SubRow
              title="Carrier Contraventions (Guilty)"
              subtitle={`${CARRIER_CONTRA_ROWS.length} carrier event${CARRIER_CONTRA_ROWS.length !== 1 ? 's' : ''} · act, section, equiv code, and active points`}
              badge={`${CARRIER_CONTRA_ROWS.length} EVENTS`}
              badgeCls={CARRIER_CONTRA_ROWS.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}
              open={!!openSub.s42}
              onToggle={() => togSub('s42')}
            >
              <CarrierContraventionsList />
            </SubRow>

            <SubRow
              title="Pending Driver Contraventions"
              subtitle={`${PENDING_DRIVER_CONTRA_ROWS.length} pending event${PENDING_DRIVER_CONTRA_ROWS.length !== 1 ? 's' : ''} · awaiting court decision, no points assigned`}
              badge={`${PENDING_DRIVER_CONTRA_ROWS.length} PENDING`}
              badgeCls="bg-yellow-50 text-yellow-700 border-yellow-200"
              open={!!openSub.s43}
              onToggle={() => togSub('s43')}
            >
              <PendingDriverContraventionsList />
            </SubRow>

            <SubRow
              title="Pending Carrier Contraventions"
              subtitle={`${PENDING_CARRIER_CONTRA_ROWS.length} pending event${PENDING_CARRIER_CONTRA_ROWS.length !== 1 ? 's' : ''} · awaiting court decision, no points assigned`}
              badge={`${PENDING_CARRIER_CONTRA_ROWS.length} PENDING`}
              badgeCls="bg-yellow-50 text-yellow-700 border-yellow-200"
              open={!!openSub.s44}
              onToggle={() => togSub('s44')}
            >
              <PendingCarrierContraventionsList />
            </SubRow>
          </div>
        </AnalysisRow>

        {/* ── CVSA Inspection Results ── */}
        <AnalysisRow
          title="CVSA Inspection Results"
          subtitle={`${r.inspections} inspections · ${cvsaPass} pass, ${cvsaFail} req. attn, ${cvsaOos} out of service`}
          statLabel="CVSA Score"
          statVal={r.cvsa.toFixed(2)}
          badge={`${r.inspections} INSPECTIONS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.s5}
          onToggle={() => tog('s5')}
        >
          <div>
            <CvsaInspectionSummaries />
            <CvsaInspectionDetailsList />
            <div className="px-5 py-3 bg-blue-50/40 border-b border-t border-slate-100 flex items-center gap-6 flex-wrap">
              {[
                { label: 'Pass',          val: cvsaPass, color: '#16a34a' },
                { label: 'Req. Attn',     val: cvsaFail, color: '#d97706' },
                { label: 'Out of Service',val: cvsaOos,  color: '#dc2626' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }}/>
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>
            {r.inspections === 0 ? (
              <div className="px-5 py-4 text-[11px] text-slate-400 italic">No CVSA inspections in this period</div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Date','Level','Location','Primary Violation','Result'].map(h => (
                      <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Result' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mock.cvsaInspections.map((c, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{c.date}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.level}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.location}</td>
                      <td className="px-4 py-2.5 text-slate-700">{c.violation}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          c.result === 'Out of Service' ? 'bg-red-50 text-red-700 border-red-200' :
                          c.result === 'Pass'           ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                         'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{c.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </AnalysisRow>

        {/* ── Accident Information ── */}
        <AnalysisRow
          title="Accident Information"
          subtitle={mock.accidents.length > 0
            ? `${mock.accidents.length} reportable accident${mock.accidents.length > 1 ? 's' : ''} · collision type, severity, and at-fault status`
            : 'No reportable accidents in this 12-month window'}
          statLabel="Accident Score"
          statVal={r.acc.toFixed(2)}
          badge={`${mock.accidents.length} ACCIDENTS`}
          badgeCls={mock.accidents.length > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.s6}
          onToggle={() => tog('s6')}
        >
          <AccidentSummaryTable />
          <AccidentDetailsList />
          {mock.accidents.length === 0 ? (
            <div className="px-5 py-4 flex items-center gap-3 bg-emerald-50/40 border-t border-slate-100">
              <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">✓</span>
              <span className="text-[11px] text-emerald-700 font-medium">No reportable accidents in this 12-month period</span>
            </div>
          ) : (
            <>
              <div className="px-5 py-2.5 bg-red-50/60 border-b border-red-100 flex items-center gap-4">
                <span className="text-[11px] font-bold text-red-700">{mock.accidents.length} reportable accident{mock.accidents.length > 1 ? 's' : ''}</span>
                <span className="text-[10px] text-red-400 ml-auto">Accident Score: <strong>{r.acc.toFixed(2)}</strong></span>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Date','Accident Type','Severity','At Fault','Vehicles'].map(h => (
                      <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Vehicles' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mock.accidents.map((a, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{a.date}</td>
                      <td className="px-4 py-2.5 text-slate-700">{a.type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${a.severity === 'Injury' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{a.at_fault}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{a.vehicles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </AnalysisRow>

        {/* ── Audit Summary ── */}
        <AnalysisRow
          title="Audit Summary"
          subtitle="compliance review history · safety rating basis and audit outcome"
          statLabel="Safety Rating"
          statVal={r.total < 2.13 ? 'Satisfactory' : r.total < 3.64 ? 'Conditional' : 'Unsatisfactory'}
          badge={mock.auditDate ? 'AUDITED' : 'UNAUDITED'}
          badgeCls={mock.auditDate ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.s7}
          onToggle={() => tog('s7')}
        >
          {/* Intro */}
          <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-200">
            <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
              This section summarizes the quantifiable facility audits that have been conducted on this carrier during the requested time period. Compliance Reviews are not included in this summary.
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
              As of June 1, 2015, NSC implemented a new set of questions and scoring criteria for quantifiable facility audits.
            </p>
            {!mock.auditDate && (
              <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
                No Audits conducted for this carrier during the report period.
              </p>
            )}
          </div>
          <div className="p-5 grid grid-cols-2 gap-5 bg-slate-50/40">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Audit Status</div>
              {mock.auditDate ? (
                <div className="space-y-2">
                  {[
                    { label: 'Last Audit Date', val: mock.auditDate, mono: true },
                    { label: 'Audit Type',       val: 'Compliance Review', color: '#d97706' },
                    { label: 'Outcome',          val: r.total >= 3.64 ? 'Show Cause' : 'Conditional', badge: true, color: r.total >= 3.64 ? '#dc2626' : '#d97706' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{row.label}</span>
                      {row.badge ? (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${r.total >= 3.64 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{row.val}</span>
                      ) : (
                        <span className={`text-[11px] font-semibold ${row.mono ? 'font-mono text-slate-700' : ''}`} style={{ color: row.color }}>{row.val}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">✓</span>
                  Profile within acceptable range — no audit on record
                </div>
              )}
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Safety Rating Basis</div>
              <div className="space-y-2">
                {[
                  { label: 'Safety Rating',  value: r.total < 2.13 ? 'Satisfactory — Unaudited' : r.total < 3.64 ? 'Conditional' : 'Unsatisfactory', color: sc },
                  { label: 'Profile Status', value: bcSt(r.total), color: sc },
                  { label: 'Audit Status',   value: mock.auditDate ? 'Audited' : 'Unaudited', color: '#64748b' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{row.label}</span>
                    <span className="text-[11px] font-semibold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnalysisRow>

        {/* ── CVIP Vehicle Inspection History ── */}
        <AnalysisRow
          title="CVIP Vehicle Inspection History"
          subtitle={`${CVIP_ROWS.length} inspections · commercial vehicle inspections and notice & orders`}
          statLabel="Pass Rate"
          statVal={`${Math.round((CVIP_ROWS.filter(r => r.result.startsWith('Pass')).length / CVIP_ROWS.length) * 100)}%`}
          badge={`${CVIP_ROWS.length} RECORDS`}
          badgeCls="bg-slate-100 text-slate-600 border-slate-200"
          open={!!open.s8}
          onToggle={() => tog('s8')}
        >
          <CvipInspectionList />
        </AnalysisRow>

      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Cadence = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All';

export function NscBcPerformanceHistory() {
  const [cadence,     setCadence]     = useState<Cadence>('All');
  const [tbSearch,    setTbSearch]    = useState('');
  const [tbPage,      setTbPage]      = useState(1);
  const [tbRpp,       setTbRpp]       = useState(10);
  const [tbExpanded,  setTbExpanded]  = useState<string | null>(null);
  const [hovered,     setHovered]     = useState<{ chart: string; idx: number } | null>(null);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

  const all = [...BC_PULL_DATA].reverse();

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
      const rowIdx = BC_PULL_DATA.findIndex(r => r.id === newId);
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

  const YGrid = ({ ticks, max, min, chartH }: { ticks: number[]; max: number; min: number; chartH: number }) => (
    <>
      {ticks.filter(v => v >= min && v <= max).map(v => (
        <g key={v}>
          <line x1={pL} x2={pL+cW} y1={yAt(v,max,min,chartH)} y2={yAt(v,max,min,chartH)} stroke="#e2e8f0" strokeWidth="0.75"/>
          <text x={pL-10} y={yAt(v,max,min,chartH)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
        </g>
      ))}
    </>
  );

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
  const BcTip = ({ cx, cy, d, chart, chartH }: {
    cx: number; cy: number; d: typeof data[0]; chart: string; chartH: number;
  }) => {
    const st  = bcSt(d.total);
    const sc  = bcStColor(st);
    const TW  = 252;
    const TH  = 188;
    const tx  = cx > pL + cW * 0.62 ? cx - TW - 18 : cx + 18;
    const ty  = cy > pT + chartH * 0.55 ? cy - TH - 10 : cy + 14;
    const rows = [
      { label: 'Total Score',    val: d.total.toFixed(2),             color: sc,                             bold: chart === 'total'  },
      { label: 'Contraventions', val: d.contra.toFixed(2),            color: bcCatColor('contra', d.contra), bold: chart === 'contra' },
      { label: 'CVSA (OOS)',     val: d.cvsa.toFixed(2),              color: bcCatColor('cvsa',   d.cvsa),   bold: chart === 'cvsa'   },
      { label: 'Accidents',      val: d.acc.toFixed(2),               color: bcCatColor('acc',    d.acc),    bold: chart === 'acc'    },
      { label: 'Vehicle Days',   val: d.vehicleDays.toLocaleString(), color: '#475569',                      bold: chart === 'fleet'  },
      { label: 'Avg Fleet',      val: d.avgFleet.toFixed(1),          color: '#16a34a',                      bold: chart === 'fleet'  },
      { label: 'Monthly Days',   val: d.monthlyActiveDays.toLocaleString(), color: '#818cf8',                bold: false              },
    ];
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={tx+3} y={ty+3} width={TW} height={TH} rx="10" fill="rgba(15,23,42,0.13)"/>
        <rect x={tx} y={ty} width={TW} height={TH} rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.2"/>
        <rect x={tx} y={ty} width={TW} height={36} rx="10" fill={sc} opacity="0.13"/>
        <rect x={tx} y={ty+20} width={TW} height={16} fill={sc} opacity="0.13"/>
        <text x={tx+12} y={ty+15} fontSize="14" fontWeight="800" fill={sc}>{d.pullDate}</text>
        <text x={tx+12} y={ty+30} fontSize="10" fill="#64748b">{d.windowLabel}</text>
        <rect x={tx+TW-74} y={ty+7} width={66} height={18} rx="7" fill={sc} opacity="0.18"/>
        <text x={tx+TW-41} y={ty+19} fontSize="10" fontWeight="800" fill={sc} textAnchor="middle">{st}</text>
        <line x1={tx+10} x2={tx+TW-10} y1={ty+38} y2={ty+38} stroke="#e2e8f0" strokeWidth="0.8"/>
        {rows.map((r, ri) => (
          <g key={r.label}>
            <text x={tx+12} y={ty+55+ri*19} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '400'} fill={r.bold ? '#1e293b' : '#64748b'}>{r.label}</text>
            <text x={tx+TW-12} y={ty+55+ri*19} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '600'} fill={r.color} textAnchor="end" fontFamily="monospace">{r.val}</text>
          </g>
        ))}
        <line x1={tx+10} x2={tx+TW-10} y1={ty+TH-20} y2={ty+TH-20} stroke="#e2e8f0" strokeWidth="0.8"/>
        <text x={tx+12} y={ty+TH-8} fontSize="10" fill="#94a3b8">{d.inspections} inspections · click to select row</text>
      </g>
    );
  };

  const first = data[0];
  const last  = data[data.length - 1];

  // ── Chart 1 ─────────────────────────────────────────────────────────────────
  const CH1    = 274;
  const VH1    = CH1 + pT + pB;
  const totMax = Math.max(Math.ceil(Math.max(...data.map(d => d.total)) * 1.18 * 10) / 10, 2.8);
  const totMin = 0;
  const yt1    = (v: number) => yAt(v, totMax, totMin, CH1);

  const totalZones = [
    { from: 0,            to: BC_TOTAL_SAT,  fill: '#bbf7d0', label: 'Satisfactory', lc: '#166534' },
    { from: BC_TOTAL_SAT, to: BC_TOTAL_COND, fill: '#fef08a', label: 'Conditional',  lc: '#854d0e' },
    { from: BC_TOTAL_COND, to: totMax,       fill: '#fecaca', label: 'Unsatisfactory', lc: '#991b1b' },
  ];

  const totTicks = Array.from({ length: 6 }, (_, i) => +(i * (totMax / 5)).toFixed(2));

  // ── Chart 2 ─────────────────────────────────────────────────────────────────
  const CH2   = 194;
  const VH2   = CH2 + pT + pB;
  const cats  = [
    { key: 'contra' as const, label: 'Contraventions',        color: '#d97706', satKey: 'contra' },
    { key: 'cvsa'   as const, label: 'CVSA (Out of Service)', color: '#3b82f6', satKey: 'cvsa'   },
    { key: 'acc'    as const, label: 'Accidents',             color: '#dc2626', satKey: 'acc'    },
  ];
  const catMax = Math.max(
    Math.ceil(Math.max(...data.map(d => Math.max(d.contra, d.cvsa, d.acc))) * 1.25 * 10) / 10,
    1.5,
  );
  const yt2 = (v: number) => yAt(v, catMax, 0, CH2);
  const cat2Ticks = Array.from({ length: 5 }, (_, i) => +(i * (catMax / 4)).toFixed(2));

  // ── Chart 3 ─────────────────────────────────────────────────────────────────
  const CH3      = 176;
  const VH3      = CH3 + pT + pB;
  const vdMax    = Math.max(...data.map(d => d.vehicleDays)) * 1.12;
  const fleetMax = Math.max(...data.map(d => d.avgFleet)) * 1.1;
  const fleetScale = vdMax / fleetMax;
  const yt3 = (v: number) => yAt(v, vdMax, 0, CH3);
  const vdTickStep = Math.ceil(vdMax / 3 / 1000) * 1000;
  const vdTicks = [0, vdTickStep, vdTickStep * 2, vdTickStep * 3].filter(v => v <= vdMax * 1.05);

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Activity size={14} className="text-slate-400"/>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">NSC BC Performance History</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} pulls</span>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
            {shortLabel(first.pullDate)} → {shortLabel(last.pullDate)} · {n}mo
          </span>
          <span className="text-[10px] italic text-slate-400">Each pull = 12-month rolling window</span>
          {/* Status legend */}
          <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1">
            {[
              { c: '#dc2626', label: 'Unsatisfactory pull' },
              { c: '#d97706', label: 'Conditional pull'    },
              { c: '#16a34a', label: 'Satisfactory pull'   },
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

        {/* ══ CHART 1: NSC Profile Score History ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">NSC Profile Score History</span>
            {totalZones.map(z => (
              <div key={z.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border" style={{ background: z.fill, borderColor: z.lc + '55' }}/>
                <span className="text-[10px] font-mono" style={{ color: z.lc }}>{z.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Lower is better · BC NSC Profile Score (0–7+)</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH1 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Zone bands */}
              {totalZones.map(z => {
                const clTo   = Math.min(z.to, totMax);
                const clFrom = Math.max(z.from, totMin);
                if (clTo <= clFrom) return null;
                const y1 = yt1(clTo);
                const y2 = yt1(clFrom);
                return (
                  <g key={z.label}>
                    <rect x={pL} y={y1} width={cW} height={y2 - y1} fill={z.fill} opacity="0.40"/>
                    <text x={pL + 10} y={(y1 + y2) / 2 + 4} fontSize="12" fill={z.lc} fontWeight="700" opacity="0.78">{z.label}</text>
                  </g>
                );
              })}

              {/* Y-grid */}
              <YGrid ticks={totTicks} max={totMax} min={totMin} chartH={CH1}/>

              {/* Threshold lines */}
              {[{ t: BC_TOTAL_SAT,  c: '#16a34a', lbl: `${BC_TOTAL_SAT} — Satisfactory limit`  },
                { t: BC_TOTAL_COND, c: '#dc2626', lbl: `${BC_TOTAL_COND} — Unsatisfactory limit` }].map(th => (
                <g key={th.t}>
                  <line x1={pL} x2={pL+cW} y1={yt1(th.t)} y2={yt1(th.t)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.90"/>
                  <text x={pL+cW+8} y={yt1(th.t)+3.5} fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>
                </g>
              ))}

              {/* Area + line */}
              <path d={mkArea(d => d.total, totMax, totMin, CH1)} fill="#16a34a" opacity="0.08"/>
              <path d={mkPath(d => d.total, totMax, totMin, CH1)} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

              {/* Value labels on last */}
              {data.map((d, i) => {
                const cx   = xAt(i);
                const cy   = yt1(d.total);
                const isLast = i === n - 1;
                const col  = d.total >= BC_TOTAL_COND ? '#dc2626' : d.total >= BC_TOTAL_SAT ? '#d97706' : '#16a34a';
                return isLast ? (
                  <text key={i} x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fontWeight="bold"
                    fill={col} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d.total.toFixed(2)}
                  </text>
                ) : null;
              })}

              <XAxis chartH={CH1}/>

              {/* Dots — interactive */}
              {data.map((d, i) => {
                const cx     = xAt(i);
                const cy     = yt1(d.total);
                const col    = d.total >= BC_TOTAL_COND ? '#dc2626' : d.total >= BC_TOTAL_SAT ? '#d97706' : '#16a34a';
                const isHov  = hovered?.chart === 'c1' && hovered.idx === i;
                const isSel  = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c1', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <circle cx={cx} cy={cy} r="14" fill={col} opacity="0.12"/>}
                    <circle cx={cx} cy={cy} r={isHov || isSel ? 7 : i === n-1 ? 5.5 : 4}
                      fill={isSel ? col : col} stroke={isSel ? 'white' : 'white'}
                      strokeWidth={isSel ? 3 : 1.5}
                      style={{ filter: isHov ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : 'none' }}/>
                    {/* Hit area */}
                    <circle cx={cx} cy={cy} r="14" fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c1' && (() => {
                const d  = data[hovered.idx];
                if (!d) return null;
                return <BcTip cx={xAt(hovered.idx)} cy={yt1(d.total)} d={d} chart="total" chartH={CH1}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 2: Category Scores Over Time ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Category Scores Over Time</span>
            {cats.map(c => (
              <div key={c.key} className="flex items-center gap-1.5">
                <div className="w-5 h-1 rounded" style={{ background: c.color }}/>
                <span className="text-[10px] font-medium text-slate-600">{c.label}</span>
              </div>
            ))}
            {cats.map(c => (
              <div key={`sat-${c.key}`} className="flex items-center gap-1.5">
                <div className="w-5 border-t border-dashed" style={{ borderColor: c.color }}/>
                <span className="text-[10px] text-slate-400">{c.label.split(' ')[0]} sat. limit</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Dashed = satisfactory threshold per category</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH2 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH2}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid */}
              {cat2Ticks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt2(v)} y2={yt2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt2(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v.toFixed(2)}</text>
                </g>
              ))}

              {/* Sat threshold dashes per category */}
              {cats.map(c => (
                <line key={`sat-${c.key}`}
                  x1={pL} x2={pL+cW}
                  y1={yt2(CAT_SAT[c.satKey])} y2={yt2(CAT_SAT[c.satKey])}
                  stroke={c.color} strokeWidth="1.2" strokeDasharray="5,4" opacity="0.55"/>
              ))}

              {/* Lines */}
              {cats.map(c => (
                <path key={c.key}
                  d={mkPath(d => d[c.key], catMax, 0, CH2)}
                  fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              ))}

              {/* Value labels on last */}
              {cats.map(c => {
                const d = data[n - 1];
                const cx = xAt(n - 1);
                const cy = yt2(d[c.key]);
                return (
                  <text key={c.key} x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill={c.color} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d[c.key].toFixed(2)}
                  </text>
                );
              })}

              <XAxis chartH={CH2}/>

              {/* Dots — interactive (one hit zone per time point covering all 3 cats) */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const isHov = hovered?.chart === 'c2' && hovered.idx === i;
                const isSel = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c2', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {cats.map(c => {
                      const cy = yt2(d[c.key]);
                      return (
                        <circle key={c.key} cx={cx} cy={cy} r={isHov || isSel ? 6 : i === n-1 ? 5 : 3.5}
                          fill={c.color} stroke="white" strokeWidth="1.5"
                          style={{ filter: isHov ? 'drop-shadow(0 0 3px rgba(0,0,0,0.25))' : 'none' }}/>
                      );
                    })}
                    {isSel && <circle cx={cx} cy={yt2(Math.max(d.contra, d.cvsa, d.acc))} r="16" fill="#6366f1" opacity="0.08"/>}
                    {/* Hit area */}
                    <rect x={cx - 12} y={pT} width={24} height={CH2} fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c2' && (() => {
                const d  = data[hovered.idx];
                if (!d) return null;
                const cy = yt2(Math.max(d.contra, d.cvsa, d.acc));
                return <BcTip cx={xAt(hovered.idx)} cy={cy} d={d} chart="contra" chartH={CH2}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 3: Vehicle Activity ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Vehicle Activity</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border" style={{ background: '#6366f122', borderColor: '#6366f1' }}/>
              <span className="text-[10px] font-medium text-slate-600">Vehicle Days (bars)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-emerald-500"/>
              <span className="text-[10px] font-medium text-slate-600">Avg Fleet Size (line)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-indigo-400"/>
              <span className="text-[10px] font-medium text-slate-600">Monthly Active Days (line)</span>
            </div>
            <span className="ml-auto text-[10px] italic text-slate-400">Fleet size plotted on same scale as vehicle days</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH3 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH3}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid */}
              {vdTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt3(v)} y2={yt3(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt3(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">
                    {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  </text>
                </g>
              ))}

              {/* Bars — vehicle days */}
              {data.map((d, i) => {
                const bw   = Math.max(10, Math.min(30, cW / n * 0.45));
                const bx   = xAt(i) - bw / 2;
                const barH = ((d.vehicleDays) / vdMax) * CH3;
                return (
                  <rect key={d.id} x={bx} y={pT + CH3 - barH} width={bw} height={barH}
                    fill="#6366f1" opacity="0.22" stroke="#6366f1" strokeWidth="1" rx="2"/>
                );
              })}

              {/* Avg fleet line */}
              <path d={mkPath(d => d.avgFleet * fleetScale, vdMax, 0, CH3)}
                fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6,3"/>

              {/* Monthly active days line */}
              <path d={mkPath(d => (d.monthlyActiveDays ?? 0) * (vdMax / Math.max(...data.map(x => x.monthlyActiveDays ?? 1))), vdMax, 0, CH3)}
                fill="none" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4,4"/>

              {/* Fleet dots — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const cy    = yt3(d.avgFleet * fleetScale);
                const isHov = hovered?.chart === 'c3' && hovered.idx === i;
                const isSel = selectedId === d.id;
                const isLast = i === n - 1;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c3', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <circle cx={cx} cy={cy} r="14" fill="#16a34a" opacity="0.12"/>}
                    <circle cx={cx} cy={cy} r={isHov || isSel ? 7 : isLast ? 5 : 3.5}
                      fill="#16a34a" stroke="white" strokeWidth="1.5"
                      style={{ filter: isHov ? 'drop-shadow(0 0 4px rgba(0,0,0,0.25))' : 'none' }}/>
                    {isLast && (
                      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#16a34a" fontFamily="monospace">
                        {d.avgFleet.toFixed(1)}
                      </text>
                    )}
                    {/* Hit area */}
                    <circle cx={cx} cy={cy} r="14" fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c3' && (() => {
                const d = data[hovered.idx];
                if (!d) return null;
                return <BcTip cx={xAt(hovered.idx)} cy={yt3(d.avgFleet * fleetScale)} d={d} chart="fleet" chartH={CH3}/>;
              })()}

              <XAxis chartH={CH3}/>

            </svg>
          </div>
        </div>

        {/* ══ PULL-BY-PULL DATA TABLE ══ */}
        {(() => {
          const tbFiltered = BC_PULL_DATA.filter(r =>
            r.pullDate.toLowerCase().includes(tbSearch.toLowerCase())    ||
            r.windowLabel.toLowerCase().includes(tbSearch.toLowerCase()) ||
            bcSt(r.total).toLowerCase().includes(tbSearch.toLowerCase())
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
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{BC_PULL_DATA.length} pulls</span>
                <span className="text-[10px] text-slate-400">newest first · click row → profile drill-down</span>
                {/* Search */}
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
                      <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">12-Month Window</th>
                      <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Vehicle Days</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Monthly Days</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Avg Fleet</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-amber-500  uppercase tracking-wider whitespace-nowrap">Contra</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-blue-500   uppercase tracking-wider whitespace-nowrap">CVSA</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-rose-400   uppercase tracking-wider whitespace-nowrap">Accidents</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-500  uppercase tracking-wider whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbVisible.map((r, idx) => {
                      const st         = bcSt(r.total);
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
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${bcStBadgeCls(st)}`}>{st}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.vehicleDays.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.monthlyActiveDays.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.avgFleet.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcCatColor('contra', r.contra) }}>{r.contra.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcCatColor('cvsa',   r.cvsa)   }}>{r.cvsa.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcCatColor('acc',    r.acc)    }}>{r.acc.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcStColor(st) }}>{r.total.toFixed(2)}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${r.id}-drill`}>
                              <td colSpan={10} className="p-4 bg-slate-50 border-b border-slate-100">
                                <BcPullDrillDown r={r}/>
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
