import React from 'react';
import { Clock, MapPin, Truck, User, Route, Navigation, Flag, Fuel, X, MessageSquare, Eye } from 'lucide-react';
import type { HosDailyLog, HosLog, HosTrip, HosStatus } from './hos.data';

// ── Formatters ─────────────────────────────────────────────────────────────────
export const fmtMs = (ms: number) => { if (!ms) return '0h 0m'; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return `${h}h ${m}m`; };
export const fmtDatetime = (s: string) => { if (!s) return '—'; return new Date(s).toISOString().replace('T', ' ').substring(0, 19); };
export const fmtDuration = (ms: number) => { if (!ms) return '—'; const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000); return h > 0 ? `${h}h ${m}m` : `${m}m`; };
export const miToKm = (mi: number) => +(mi * 1.60934).toFixed(1);
export const mphToKmh = (mph: number) => +(mph * 1.60934).toFixed(0);

// ── Status Badge ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  off_duty: 'bg-slate-100 text-slate-600 border-slate-200',
  driving: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  on_duty: 'bg-amber-50 text-amber-700 border-amber-200',
  sleeper_berth: 'bg-blue-50 text-blue-700 border-blue-200',
};
export function StatusBadge({ status }: { status: HosStatus }) {
  return <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.off_duty}`}>{(status || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>;
}

// ── Duration Bar ───────────────────────────────────────────────────────────────
const DUR_ITEMS = [
  { k: 'driving', c: '#10b981', l: 'Driving' }, { k: 'onDuty', c: '#f59e0b', l: 'On Duty' },
  { k: 'offDuty', c: '#94a3b8', l: 'Off Duty' }, { k: 'sleeperBed', c: '#6366f1', l: 'Sleeper' },
  { k: 'personalConveyance', c: '#8b5cf6', l: 'Personal' }, { k: 'yardMove', c: '#ec4899', l: 'Yard' },
  { k: 'waiting', c: '#d1d5db', l: 'Waiting' },
];
export function DurationBar({ durations }: { durations: any }) {
  const total = DUR_ITEMS.reduce((a, i) => a + (durations[i.k] || 0), 0);
  if (!total) return null;
  return (
    <div>
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100">
        {DUR_ITEMS.map(i => { const v = durations[i.k] || 0; if (!v) return null; return <div key={i.k} style={{ width: `${(v / total) * 100}%`, backgroundColor: i.c }} title={`${i.l}: ${fmtMs(v)}`} />; })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {DUR_ITEMS.map(i => { const v = durations[i.k] || 0; if (!v) return null; return <span key={i.k} className="flex items-center gap-1 text-xs text-slate-500"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: i.c }} />{i.l}: {fmtMs(v)}</span>; })}
      </div>
    </div>
  );
}

// ── Map Embed ──────────────────────────────────────────────────────────────────
export function MapEmbed({ location }: { location?: { latitude: number; longitude: number } | null }) {
  if (!location || typeof location.latitude !== 'number') return (
    <div className="bg-slate-50 rounded-lg p-8 text-center text-slate-400 border border-dashed border-slate-200">
      <MapPin className="mx-auto mb-2" size={20} /><p className="text-sm">No coordinates</p>
    </div>
  );
  const { latitude: lat, longitude: lng } = location; const o = 0.04;
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><MapPin size={14} className="text-blue-600" />Location</span>
        <span className="font-mono text-xs text-slate-400">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
      <div className="h-44 bg-slate-100">
        <iframe width="100%" height="100%" frameBorder="0" scrolling="no"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - o},${lat - o},${lng + o},${lat + o}&layer=mapnik&marker=${lat},${lng}`}
          title="Map" className="w-full h-full" />
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────
export function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div>
        <div className={`p-2.5 rounded-xl ${color}`}><Icon size={18} /></div>
      </div>
      {sub && <p className="text-xs text-slate-400 mt-3">{sub}</p>}
    </div>
  );
}

// ── View Icon Button ───────────────────────────────────────────────────────────
export function ViewBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="View details">
      <Eye size={16} />
    </button>
  );
}

// ── Mini ELD Chart for Modal ───────────────────────────────────────────────────
function ModalEldChart({ dailyLog, dist, unit }: { dailyLog: HosDailyLog; dist: (v: number) => number; unit: string }) {
  const dur = dailyLog.statusDurations;
  const dayMs = 24 * 3600000;
  const laneLabels = ['Off Duty', 'Sleeper', 'Driving', 'On Duty'];
  const laneColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981'];
  const laneMs = [dur.offDuty, dur.sleeperBed, dur.driving, dur.onDuty];

  const segs: { lane: number; startPct: number; widthPct: number; color: string }[] = [];
  let cursor = 0;
  const push = (lane: number, ms: number, color: string) => {
    if (ms > 0) { segs.push({ lane, startPct: (cursor / dayMs) * 100, widthPct: (ms / dayMs) * 100, color }); cursor += ms; }
  };
  push(0, dur.offDuty * 0.3, laneColors[0]);
  push(1, dur.sleeperBed * 0.6, laneColors[1]);
  push(2, dur.driving * 0.6, laneColors[2]);
  push(3, dur.onDuty * 0.5, laneColors[3]);
  push(2, dur.driving * 0.4, laneColors[2]);
  push(3, dur.onDuty * 0.5, laneColors[3]);
  push(1, dur.sleeperBed * 0.4, laneColors[1]);
  push(0, dur.offDuty * 0.7, laneColors[0]);

  const hours = Array.from({ length: 25 }, (_, i) => i);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">24-Hour Duty Status</div>
      {/* Hour labels */}
      <div className="flex border-b border-slate-200" style={{ marginLeft: 80, marginRight: 60 }}>
        {hours.map(h => (
          <div key={h} className="text-[8px] text-slate-400 font-mono text-center" style={{ width: `${100 / 24}%`, minWidth: 0 }}>
            {h === 0 ? 'MID' : h === 12 ? 'NOON' : h}
          </div>
        ))}
      </div>
      {/* Lanes */}
      {laneLabels.map((label, idx) => (
        <div key={label} className="flex items-stretch border-b border-slate-100" style={{ height: 24 }}>
          <div className="w-[80px] shrink-0 flex items-center px-2 text-[9px] font-bold text-slate-500 bg-slate-50/80 border-r border-slate-200">{label}</div>
          <div className="flex-1 relative" style={{ background: `repeating-linear-gradient(90deg, transparent, transparent calc(${100/24}% - 1px), #e2e8f0 calc(${100/24}% - 1px), #e2e8f0 calc(${100/24}%))` }}>
            <div className="absolute inset-0" style={{ backgroundColor: laneColors[idx], opacity: 0.08 }} />
            {segs.filter(s => s.lane === idx).map((seg, i) => (
              <div key={i} className="absolute top-0.5 bottom-0.5 rounded-sm" style={{
                left: `${Math.min(seg.startPct, 100)}%`,
                width: `${Math.min(seg.widthPct, 100 - seg.startPct)}%`,
                backgroundColor: seg.color, opacity: 0.85,
                minWidth: seg.widthPct > 0.2 ? 2 : 0,
              }} />
            ))}
          </div>
          <div className="w-[60px] shrink-0 flex items-center justify-end px-1.5 text-[10px] font-mono font-bold border-l border-slate-200 bg-slate-50/50" style={{ color: laneColors[idx] }}>
            {fmtMs(laneMs[idx])}
          </div>
        </div>
      ))}
      {/* Legend */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-[9px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-[2px] rounded bg-violet-500 inline-block" /> PC / Yard Moves</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-[2px] rounded bg-red-400 inline-block" /> Exemption Mode</span>
        </div>
        <div className="flex items-center gap-3 text-[9px] text-slate-400 font-medium">
          <span>Distance: <span className="font-bold text-slate-700">{dist(dailyLog.distances.total)} {unit}</span></span>
          {dur.personalConveyance > 0 && <span>PC: <span className="font-bold text-violet-600">{fmtMs(dur.personalConveyance)}</span></span>}
          {dur.yardMove > 0 && <span>YM: <span className="font-bold text-pink-600">{fmtMs(dur.yardMove)}</span></span>}
        </div>
      </div>
    </div>
  );
}

// ── Detail Modal (popup) ───────────────────────────────────────────────────────
export function DetailModal({ item, type, onClose, useKm }: {
  item: HosDailyLog | HosLog | HosTrip; type: 'daily' | 'log' | 'trip'; onClose: () => void; useKm?: boolean;
}) {
  const hosLog = item as HosLog;
  const dailyLog = item as HosDailyLog;
  const trip = item as HosTrip;
  const [modalUseKm, setModalUseKm] = React.useState(Boolean(useKm));
  React.useEffect(() => { setModalUseKm(Boolean(useKm)); }, [useKm]);
  const unit = modalUseKm ? 'km' : 'mi';
  const speedUnit = modalUseKm ? 'km/h' : 'mph';
  const dist = (v: number) => modalUseKm ? miToKm(v) : v;
  const spd = (v: number) => modalUseKm ? mphToKmh(v) : v;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900">{type === 'daily' ? 'Daily Log' : type === 'log' ? 'HOS Log' : 'Trip'} Details</h2>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{item.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
              <button onClick={() => setModalUseKm(false)} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!modalUseKm ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Miles</button>
              <button onClick={() => setModalUseKm(true)} className={`px-3 py-1.5 text-xs font-semibold transition-colors ${modalUseKm ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Km</button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg"><X size={18} className="text-slate-500" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {type === 'log' && <div className="flex items-center gap-2 flex-wrap"><StatusBadge status={hosLog.status} /></div>}

          {/* Daily Log */}
          {type === 'daily' && (
            <>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Date</p><p className="text-sm font-medium">{dailyLog.date}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Total Distance</p><p className="text-sm font-medium">{dist(dailyLog.distances?.total)} {unit}</p></div>
              </div>

              {/* ELD 24h Chart */}
              <ModalEldChart dailyLog={dailyLog} dist={dist} unit={unit} />

              <div><h3 className="text-sm font-bold text-slate-900 mb-3">Status Durations</h3><DurationBar durations={dailyLog.statusDurations} /></div>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(dailyLog.distances).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                    <p className="text-xs text-slate-400 capitalize mb-1">{k.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-base font-bold text-slate-900">{dist(v as number)}<span className="text-xs text-slate-400 ml-0.5">{unit}</span></p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* HOS Log */}
          {type === 'log' && (
            <>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Started</p><p className="font-mono text-xs">{fmtDatetime(hosLog.startedAt)}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Ended</p><p className="font-mono text-xs">{fmtDatetime(hosLog.endedAt)}</p></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-400 font-semibold uppercase mb-1">Location</p>
                <p className="text-sm font-medium">{hosLog.location.name}, {hosLog.location.state}</p>
                <p className="text-xs text-slate-400">{hosLog.location.country}</p>
              </div>
              <MapEmbed location={hosLog.location} />
              {hosLog.remarks?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><MessageSquare size={14} />Remarks ({hosLog.remarks.length})</h3>
                  {hosLog.remarks.map((r, i) => (
                    <div key={i} className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm mb-2">
                      <p className="font-medium text-amber-900">{r.notes}</p>
                      <p className="text-xs text-amber-600 font-mono mt-1">{fmtDatetime(r.submittedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Trip */}
          {type === 'trip' && (
            <>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Started</p><p className="font-mono text-xs">{fmtDatetime(trip.startedAt)}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold uppercase mb-1">Ended</p><p className="font-mono text-xs">{fmtDatetime(trip.endedAt)}</p></div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Route size={16} className="text-blue-600" />Route</h3>
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center mt-1"><div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" /><div className="w-0.5 h-10 bg-slate-200" /><div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow" /></div>
                  <div className="flex-1 space-y-4">
                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Origin</p><p className="text-sm font-medium text-slate-900">{trip.startLocation?.name || '—'}</p></div>
                    <div><p className="text-xs text-slate-400 font-semibold uppercase">Destination</p><p className="text-sm font-medium text-slate-900">{trip.endLocation?.name || '—'}</p></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { l: 'Distance', v: `${dist(trip.distance)} ${unit}`, icon: MapPin, c: 'text-blue-600 bg-blue-50' },
                  { l: 'Duration', v: fmtDuration(trip.duration), icon: Clock, c: 'text-emerald-600 bg-emerald-50' },
                  { l: 'Fuel Used', v: `${trip.fuelConsumed} gal`, icon: Fuel, c: 'text-amber-600 bg-amber-50' },
                  { l: 'Avg Speed', v: `${spd(trip.averageSpeed)} ${speedUnit}`, icon: Navigation, c: 'text-violet-600 bg-violet-50' },
                  { l: 'Max Speed', v: `${spd(trip.maxSpeed)} ${speedUnit}`, icon: Flag, c: 'text-rose-600 bg-rose-50' },
                  { l: 'Idle Time', v: fmtDuration(trip.idleDuration), icon: Clock, c: 'text-slate-600 bg-slate-100' },
                ] as const).map(s => (
                  <div key={s.l} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1"><div className={`p-1 rounded-md ${s.c}`}><s.icon size={12} /></div><p className="text-xs text-slate-400 font-semibold">{s.l}</p></div>
                    <p className="text-lg font-bold text-slate-900">{s.v}</p>
                  </div>
                ))}
              </div>
              <MapEmbed location={trip.startLocation} />
            </>
          )}

          {/* Driver / Vehicle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><User size={14} />Driver</h3>
              <p className="font-medium text-slate-900 text-sm">{item.driver.firstName} {item.driver.lastName}</p>
              <p className="font-mono text-xs text-slate-400">{item.driver.id}</p>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${item.driver.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.driver.status}</span>
            </div>
            {(type === 'log' || type === 'trip') && (
              <div className="border border-slate-200 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Truck size={14} />Vehicle</h3>
                <p className="font-medium text-slate-900 text-sm">{(item as HosLog | HosTrip).vehicle.name}</p>
                <p className="text-xs text-slate-400">{(item as HosLog | HosTrip).vehicle.make} {(item as HosLog | HosTrip).vehicle.model} ({(item as HosLog | HosTrip).vehicle.year})</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
