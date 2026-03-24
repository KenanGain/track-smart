import { useState, useMemo, useEffect, Fragment } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  FileText,
  Upload,
  Plus,
  User,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  FileSignature,
  Pencil,
  Gauge,
  Info,
  X,
  Target,
  Building2,
  MapPin
} from 'lucide-react';
import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode, nscRiskBand, nscAnalytics, cvorPeriodicReports } from './inspectionsData';
import { NscAnalysis } from './NscAnalysis';
import { NscCvsaOverview } from './NscCvsaOverview';
import { NscCvsaInspections } from './NscCvsaInspections';
import { InspectionReportPanel } from './InspectionReportPanel';
import { NSC_INSPECTIONS, DEFECT_TO_NSC, NSC_CODE_TO_SYSTEM } from './nscInspectionsData';
import type { NscInspectionRecord } from './nscInspectionsData';
import { NSC_VIOLATION_CATALOG, violationDetailsData, parseCcmtaCode } from './NscAnalysis';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import { useAppData } from '@/context/AppDataContext';
import { VIOLATION_DATA } from '@/data/violations.data';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS } from '@/pages/assets/assets.data';
import { US_STATE_ABBREVS, CA_PROVINCE_ABBREVS } from '@/data/geo-data';

// --- REUSABLE COMPONENTS ---

// Component: Educational Tooltips
const InfoTooltip = ({ text, title }: { text: string; title?: string }) => (
  <div className="group relative inline-flex items-center ml-1.5 cursor-help">
    <Info size={14} className="text-slate-400 hover:text-blue-500 transition-colors" />
    <div className="hidden group-hover:block absolute z-50 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-xl bottom-full left-0 mb-2 pointer-events-none">
      {title && <div className="font-bold text-blue-300 mb-1 tracking-wide uppercase">{title}</div>}
      <div className="leading-relaxed text-slate-200">{text}</div>
      <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-900"></div>
    </div>
  </div>
);

// Component: Mini KPI Filters
const MiniKpiCard = ({ title, value, icon: Icon, active, onClick, color }: { title: string; value: number; icon: any; active: boolean; onClick: () => void; color: "blue" | "emerald" | "red" | "yellow" | "purple" | "orange" | "gray" | "indigo" | "cyan" | "rose" | "teal" }) => {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    red: "text-red-600 bg-red-50 border-red-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    gray: "text-slate-600 bg-slate-50 border-slate-200",
    indigo: "text-indigo-600 bg-indigo-50 border-indigo-200",
    cyan: "text-cyan-600 bg-cyan-50 border-cyan-200",
    rose: "text-rose-600 bg-rose-50 border-rose-200",
    teal: "text-teal-600 bg-teal-50 border-teal-200",
    fuchsia: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200",
    violet: "text-violet-600 bg-violet-50 border-violet-200",
    lime: "text-lime-700 bg-lime-50 border-lime-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    slate: "text-slate-600 bg-slate-50 border-slate-200",
  };

  const activeStylesMap = {
    blue: "ring-2 ring-offset-1 ring-blue-400 border-blue-400 shadow-sm",
    emerald: "ring-2 ring-offset-1 ring-emerald-400 border-emerald-400 shadow-sm",
    red: "ring-2 ring-offset-1 ring-red-400 border-red-400 shadow-sm",
    yellow: "ring-2 ring-offset-1 ring-yellow-400 border-yellow-400 shadow-sm",
    purple: "ring-2 ring-offset-1 ring-purple-400 border-purple-400 shadow-sm",
    orange: "ring-2 ring-offset-1 ring-orange-400 border-orange-400 shadow-sm",
    gray: "ring-2 ring-offset-1 ring-slate-400 border-slate-400 shadow-sm",
    indigo: "ring-2 ring-offset-1 ring-indigo-400 border-indigo-400 shadow-sm",
    cyan: "ring-2 ring-offset-1 ring-cyan-400 border-cyan-400 shadow-sm",
    rose: "ring-2 ring-offset-1 ring-rose-400 border-rose-400 shadow-sm",
    teal: "ring-2 ring-offset-1 ring-teal-400 border-teal-400 shadow-sm",
    fuchsia: "ring-2 ring-offset-1 ring-fuchsia-400 border-fuchsia-400 shadow-sm",
    violet: "ring-2 ring-offset-1 ring-violet-400 border-violet-400 shadow-sm",
    lime: "ring-2 ring-offset-1 ring-lime-400 border-lime-400 shadow-sm",
    amber: "ring-2 ring-offset-1 ring-amber-400 border-amber-400 shadow-sm",
    slate: "ring-2 ring-offset-1 ring-slate-400 border-slate-400 shadow-sm",
  } as const;

  const activeStyles = active
    ? activeStylesMap[color]
    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50";

  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeStyles} bg-white`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-md ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">{title}</span>
      </div>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </div>
  );
};

const getInspectionLevelDescription = (levelStr: string) => {
  const level = levelStr?.replace(/level\s*/i, '') || '1';
  switch (level) {
    case '1': return "Examination of the vehicle and driver (driver's license, medical certificates and hours of service)";
    case '2': return "Walk-around driver and vehicle Inspection (components including those that can be inspected without physically getting under the vehicle, as well as driver's license and hours of service)";
    case '3': return "Only driver's license, vehicle permits, annual inspections and hours of service";
    case '4': return "Special inspections directed to examine a particular driver-related item or vehicle component";
    case '5': return "Vehicle inspection only without the driver present";
    default: return "Standard inspection procedure";
  }
};

const getInspectionTagSpecs = (jurisdiction: string, levelStr: string) => {
  const level = levelStr?.replace(/level\s*/i, '') || '1';
  if (jurisdiction === 'CVOR') {
    switch (level) {
      case '1': return 'bg-rose-100 text-rose-800 border-rose-200';
      case '2': return 'bg-orange-100 text-orange-800 border-orange-200';
      case '3': return 'bg-amber-100 text-amber-800 border-amber-200';
      case '4': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '5': return 'bg-lime-100 text-lime-800 border-lime-200';
      case '6': return 'bg-green-100 text-green-800 border-green-200';
      case '7': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '8': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-red-100 text-red-800 border-red-200';
    }
  } else {
    switch (level) {
      case '1': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '2': return 'bg-blue-100 text-blue-800 border-blue-200';
      case '3': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case '4': return 'bg-sky-100 text-sky-800 border-sky-200';
      case '5': return 'bg-violet-100 text-violet-800 border-violet-200';
      case '6': return 'bg-purple-100 text-purple-800 border-purple-200';
      case '7': return 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200';
      case '8': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }
};

// Component: Expandable Inspection Row
const InspectionRow = ({ record, onEdit, cvorOverride }: { record: any; onEdit?: (record: any) => void; cvorOverride?: { vehPts: number | null; dvrPts: number | null; cvrPts: number } }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedViolIdx, setExpandedViolIdx] = useState<number | null>(null);
  const primaryUnit = record.units?.[0];
  const unitCount = record.units?.length || 0;
  const totalPoints = (record.violations || []).reduce((sum: number, violation: any) => sum + (violation.points || 0), 0);
  const maxSeverity = (record.violations || []).reduce((max: number, violation: any) => Math.max(max, violation.severity || 0), 0);
  const isCvor = !!cvorOverride;

  return (
    <div className="group bg-white hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0">

      {/* ===== DESKTOP MAIN ROW - CVOR LAYOUT ===== */}
      {isCvor ? (
      <div
        className="hidden md:block cursor-pointer border-l-2 border-l-rose-400"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="grid grid-cols-12 gap-x-2 px-4 py-4 items-center hover:bg-rose-50/20 transition-colors">
        {/* Date / Time */}
        <div className="col-span-1 pl-2 flex flex-col justify-center">
          <span className="text-sm font-bold text-slate-800">{record.date}</span>
          {record.startTime && (
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{record.startTime}{record.endTime ? ` – ${record.endTime}` : ''}</span>
          )}
        </div>

        {/* Report ID */}
        <div className="col-span-1 min-w-0 flex flex-col justify-center">
          <span className="text-xs font-bold text-blue-600 block truncate leading-tight">{record.id}</span>
          <span className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${getInspectionTagSpecs('CVOR', record.level)}`}>CVOR L{record.level?.replace(/level\s*/i, '') || '1'}</span>
        </div>

        {/* Location */}
        <div className="col-span-1 flex flex-col justify-center">
          {record.location ? (
            <>
              <span className="text-sm font-medium text-slate-700 truncate">{record.location.city}</span>
              <span className="text-[10px] text-slate-400">{record.location.province}, CAN</span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-700">{record.state}, CAN</span>
          )}
        </div>

        {/* Driver / Licence */}
        <div className="col-span-2 flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
            <User size={12} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{record.driver?.split(',')[0]}</span>
            <span className="text-[10px] text-slate-400 font-mono truncate block">{record.driverLicense || record.driverId}</span>
          </div>
        </div>

        {/* Power Unit / Defects */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-sm font-bold text-slate-800 truncate block leading-tight">
            {primaryUnit?.license || record.vehiclePlate}
          </span>
          {record.powerUnitDefects ? (
            <span className="text-[10px] text-amber-600 font-medium truncate block mt-0.5" title={record.powerUnitDefects}>{record.powerUnitDefects}</span>
          ) : (
            <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">No defects</span>
          )}
        </div>

        {/* Violations Count */}
        <div className="col-span-1 flex justify-center items-center">
          {record.isClean ? (
            <span className="text-[13px] font-bold text-emerald-600">Clean</span>
          ) : (
            <span className="text-[13px] font-bold text-orange-600">{record.violations.length}</span>
          )}
        </div>

        {/* Vehicle Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(cvorOverride.vehPts || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {cvorOverride.vehPts ?? '—'}
          </span>
        </div>

        {/* Driver Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(cvorOverride.dvrPts || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {cvorOverride.dvrPts ?? '—'}
          </span>
        </div>

        {/* CVOR Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${cvorOverride.cvrPts > 0 ? 'text-red-700' : 'text-slate-400'}`}>
            {cvorOverride.cvrPts}
          </span>
        </div>

        {/* Status & Actions */}
        <div className="col-span-1 flex items-center justify-between pr-1">
           <div className="min-w-[48px]">
             {record.hasOOS ? (
               <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">
                 <ShieldAlert size={10} className="text-red-500 flex-shrink-0" /> OOS
               </span>
             ) : record.isClean ? (
               <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600 tracking-wide uppercase whitespace-nowrap">OK</span>
             ) : (
               <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 rounded text-xs font-bold text-amber-600 tracking-wide uppercase whitespace-nowrap">DEFECT</span>
             )}
           </div>
           <div className="ml-auto flex items-center justify-center gap-2">
             {onEdit && (
               <button onClick={(e) => { e.stopPropagation(); onEdit(record); }} className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Edit inspection"><Pencil size={14} /></button>
             )}
             <div className="w-5 h-5 flex items-center justify-center text-slate-400">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
           </div>
        </div>
        </div>
        {/* CVOR Violation Categories strip */}
        {!record.isClean && (record.violations || []).length > 0 && (() => {
          const cats = new Map<string, { isOos: boolean; pts: number }>();
          for (const v of (record.violations as any[])) {
            const cat: string = v.category || 'Other';
            const ex = cats.get(cat);
            if (!ex) cats.set(cat, { isOos: !!v.oos, pts: v.points || 0 });
            else cats.set(cat, { isOos: ex.isOos || !!v.oos, pts: ex.pts + (v.points || 0) });
          }
          const items = Array.from(cats.entries()).map(([label, info]) => ({ label, ...info }));
          if (!items.length) return null;
          return (
            <div className="flex items-center gap-2 px-4 pb-2.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">CVOR Violation Categories:</span>
              {items.map(item => (
                <span key={item.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${item.isOos ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isOos ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {item.label}
                  {item.isOos && <span className="bg-red-200/60 text-red-800 text-[9px] font-black px-1 rounded">OOS</span>}
                  {item.pts > 0 && <span className="text-[9px] font-bold opacity-60">{item.pts}pt</span>}
                </span>
              ))}
            </div>
          );
        })()}
      </div>
      ) : (
      /* ===== DESKTOP MAIN ROW - CSA/SMS LAYOUT ===== */
      <div
        className="hidden md:block cursor-pointer border-l-2 border-l-indigo-400"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="grid grid-cols-12 gap-x-2 px-4 py-4 items-center hover:bg-indigo-50/20 transition-colors">
        {/* Date / Time */}
        <div className="col-span-1 pl-2 flex flex-col justify-center">
          <span className="text-sm font-bold text-slate-800">{record.date}</span>
          {record.startTime && (
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{record.startTime}{record.endTime ? ` – ${record.endTime}` : ''}</span>
          )}
        </div>

        {/* Report ID */}
        <div className="col-span-1 min-w-0 flex flex-col justify-center">
          <span className="text-xs font-bold text-blue-600 block truncate leading-tight">{record.id}</span>
          <span className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${getInspectionTagSpecs('CSA', record.level)}`}>SMS L{record.level?.replace(/level\s*/i, '') || '1'}</span>
        </div>

        {/* Location */}
        <div className="col-span-1 flex flex-col justify-center">
          {record.location ? (
            <>
              <span className="text-sm font-medium text-slate-700 truncate">{record.location.city}</span>
              <span className="text-[10px] text-slate-400">{record.location.province}, USA</span>
            </>
          ) : (
            <span className="text-sm font-medium text-slate-700">{record.state}, USA</span>
          )}
        </div>

        {/* Driver / Licence */}
        <div className="col-span-2 flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
            <User size={12} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{record.driver?.split(',')[0]}</span>
            <span className="text-[10px] text-slate-400 font-mono truncate block">{record.driverLicense || record.driverId}</span>
          </div>
        </div>

        {/* Power Unit / Defects */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-sm font-bold text-slate-800 truncate block leading-tight">
            {primaryUnit?.license || record.vehiclePlate}
          </span>
          {record.powerUnitDefects ? (
            <span className="text-[10px] text-amber-600 font-medium truncate block mt-0.5" title={record.powerUnitDefects}>{record.powerUnitDefects}</span>
          ) : (
            <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">{record.isClean ? 'Clean' : 'No defects'}</span>
          )}
        </div>

        {/* Violations Count */}
        <div className="col-span-1 flex justify-center items-center">
          {record.isClean ? (
            <span className="text-[13px] font-bold text-emerald-600">Clean</span>
          ) : (
            <span className="text-[13px] font-bold text-orange-600">{record.violations.length}</span>
          )}
        </div>

        {/* Vehicle Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(record.smsPoints?.vehicle || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {record.smsPoints?.vehicle ?? '—'}
          </span>
        </div>

        {/* Driver Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(record.smsPoints?.driver || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {record.smsPoints?.driver ?? '—'}
          </span>
        </div>

        {/* Carrier Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(record.smsPoints?.carrier || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {record.smsPoints?.carrier ?? '—'}
          </span>
        </div>

        {/* Status & Actions */}
        <div className="col-span-1 flex items-center justify-between pr-1">
           <div className="min-w-[48px]">
             {record.hasOOS ? (
               <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">
                 <ShieldAlert size={10} className="text-red-500 flex-shrink-0" /> OOS
               </span>
             ) : record.isClean ? (
               <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600 tracking-wide uppercase whitespace-nowrap">OK</span>
             ) : (
               <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 rounded text-xs font-bold text-amber-600 tracking-wide uppercase whitespace-nowrap">DEFECT</span>
             )}
           </div>
           <div className="ml-auto flex items-center justify-center gap-2">
             {onEdit && (
               <button onClick={(e) => { e.stopPropagation(); onEdit(record); }} className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100" title="Edit inspection"><Pencil size={14} /></button>
             )}
             <div className="w-5 h-5 flex items-center justify-center text-slate-400">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
           </div>
        </div>
        </div>
        {/* SMS / FMCSA BASIC Violation Categories strip */}
        {!record.isClean && (record.violations || []).length > 0 && (() => {
          const cats = new Map<string, { isOos: boolean; pts: number }>();
          for (const v of (record.violations as any[])) {
            const cat: string = v.category || 'Other';
            const ex = cats.get(cat);
            if (!ex) cats.set(cat, { isOos: !!v.oos, pts: v.points || 0 });
            else cats.set(cat, { isOos: ex.isOos || !!v.oos, pts: ex.pts + (v.points || 0) });
          }
          const items = Array.from(cats.entries()).map(([label, info]) => ({ label, ...info }));
          if (!items.length) return null;
          return (
            <div className="flex items-center gap-2 px-4 pb-2.5 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">FMCSA BASIC Categories:</span>
              {items.map(item => (
                <span key={item.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${item.isOos ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isOos ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {item.label}
                  {item.isOos && <span className="bg-red-200/60 text-red-800 text-[9px] font-black px-1 rounded">OOS</span>}
                  {item.pts > 0 && <span className="text-[9px] font-bold opacity-60">{item.pts}pt</span>}
                </span>
              ))}
            </div>
          );
        })()}
      </div>
      )}

      {/* ===== MOBILE MAIN ROW ===== */}
      <div
        className="md:hidden flex flex-col gap-3 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start w-full">
          <div className="flex gap-2 items-start">
             <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: record.hasOOS ? '#ef4444' : record.isClean ? '#10b981' : '#f59e0b' }}></span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-blue-700 font-mono leading-tight">{record.id}</span>
                {getJurisdiction(record.state) === 'CVOR' ? (
                  <span className={`px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${getInspectionTagSpecs('CVOR', record.level)}`}>CVOR LEVEL {record.level?.replace(/level\s*/i, '') || '1'}</span>
                ) : (
                  <span className={`px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${getInspectionTagSpecs('CSA', record.level)}`}>SMS LEVEL {record.level?.replace(/level\s*/i, '') || '1'}</span>
                )}
              </div>
              <span className="text-sm text-slate-900 font-medium block mt-0.5">{record.date}</span>
            </div>
          </div>
          <button className="text-slate-400 bg-slate-50 border border-slate-200 p-1.5 rounded-full shadow-sm">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-slate-100">
           <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[13px] font-medium text-slate-600">
            <User size={10}/> {record.driver.split(',')[0]}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[13px] font-mono font-bold text-slate-700">
            <Truck size={10}/> 
            {record.units && record.units.length > 0 ? record.units[0].license.split(' ')[0] : record.vehiclePlate.split(' ')[0]}
            {record.units && record.units.length > 1 && <span className="text-blue-600">+{record.units.length - 1}</span>}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[13px] font-semibold text-slate-700">
            Sev {maxSeverity}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[13px] font-semibold text-slate-700">
            Pts {totalPoints}
          </div>
          {record.hasOOS && (
            <div className="flex items-center gap-1 px-2 py-1 rounded text-[13px] font-bold bg-red-50 text-red-700 border border-red-200">
              OOS
            </div>
          )}
        </div>
        {/* Mobile category strip */}
        {!record.isClean && (record.violations || []).length > 0 && (() => {
          const isCvorJur = getJurisdiction(record.state) === 'CVOR';
          const cats = new Map<string, { isOos: boolean }>();
          for (const v of (record.violations as any[])) {
            const cat: string = v.category || 'Other';
            const ex = cats.get(cat);
            if (!ex) cats.set(cat, { isOos: !!v.oos });
            else if (v.oos) cats.set(cat, { isOos: true });
          }
          const items = Array.from(cats.entries()).map(([label, info]) => ({ label, ...info }));
          if (!items.length) return null;
          return (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">{isCvorJur ? 'CVOR:' : 'FMCSA:'}</span>
              {items.map(item => (
                <span key={item.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${item.isOos ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                  <span className={`w-1 h-1 rounded-full shrink-0 ${item.isOos ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {item.label}
                  {item.isOos && <span className="text-[8px] font-black ml-0.5">OOS</span>}
                </span>
              ))}
            </div>
          );
        })()}
      </div>

      {/* ===== EXPANDED DETAILS (Dropdown View) ===== */}
      {isExpanded && (
        <div className="bg-slate-50/50 p-3 sm:p-4 md:p-6 border-t border-slate-200 shadow-inner flex flex-col gap-4 md:gap-6">
          {record.isClean ? (
            <div className="flex flex-col items-center justify-center py-6 text-emerald-600 bg-white rounded-xl border border-slate-200 shadow-sm">
              <CheckCircle2 size={32} className="mb-2 opacity-80" />
              <p className="text-sm font-bold">Clean Inspection</p>
              <p className="text-sm text-emerald-600/70 mt-1">No violations were recorded during this inspection.</p>
            </div>
          ) : (
            <>
              {/* Jurisdiction Banner */}
              <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-lg border ${
                getJurisdiction(record.state) === 'CVOR'
                  ? 'bg-red-50/60 border-red-200'
                  : 'bg-blue-50/60 border-blue-200'
              }`}>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider self-start border ${
                  getInspectionTagSpecs(getJurisdiction(record.state), record.level)
                }`}>
                  {getJurisdiction(record.state)} LEVEL {record.level?.replace(/level\s*/i, '') || '1'}
                </span>
                <span className="text-[13px] sm:text-sm text-slate-700 leading-relaxed">
                  {getJurisdiction(record.state) === 'CVOR'
                    ? <>Regulated under <span className="font-bold">Ontario CVOR</span> &mdash; HTA, O.Reg.199/07, O.Reg.555/06, TDG Act</>
                    : <>Regulated under <span className="font-bold">FMCSA SMS</span> &mdash; 49 CFR Parts 382-399</>
                  }
                </span>
              </div>

              {/* Unified info bar (time, location, points, severity rate) — shown for BOTH SMS and CVOR */}
              {(record.startTime || record.location || record.severityRate != null) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                  {record.startTime && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-center">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Inspection Time</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{record.startTime} – {record.endTime || '—'}</div>
                    </div>
                  )}
                  {record.location && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-center">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Location</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">{record.location.city}, {record.location.province}</div>
                    </div>
                  )}
                  {record.cvorPoints && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-center">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">CVOR Points</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        Vehicle: <span className={record.cvorPoints.vehicle > 0 ? 'text-red-600' : ''}>{record.cvorPoints.vehicle}</span> | Driver: <span className={record.cvorPoints.driver > 0 ? 'text-red-600' : ''}>{record.cvorPoints.driver}</span> | Carrier: <span className={record.cvorPoints.cvor > 0 ? 'text-orange-600' : ''}>{record.cvorPoints.cvor}</span>
                      </div>
                    </div>
                  )}
                  {record.smsPoints && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-center">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">SMS Points</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                        Vehicle: <span className={record.smsPoints.vehicle > 0 ? 'text-red-600' : ''}>{record.smsPoints.vehicle}</span> | Driver: <span className={record.smsPoints.driver > 0 ? 'text-red-600' : ''}>{record.smsPoints.driver}</span> | Carrier: <span className={record.smsPoints.carrier > 0 ? 'text-orange-600' : ''}>{record.smsPoints.carrier}</span>
                      </div>
                    </div>
                  )}
                  {record.severityRate != null && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-center">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Severity Rate</div>
                      <div className={`font-mono font-bold text-sm mt-0.5 ${record.severityRate >= 5 ? 'text-red-600' : record.severityRate >= 3 ? 'text-amber-600' : 'text-slate-900'}`}>{record.severityRate}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Top Cards: Driver, Asset, Summary, OOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4 md:gap-5 items-stretch">
                <div className="flex flex-col gap-3 h-full">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                    <User size={14} className="text-slate-400" /> Driver
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{record.driver}</p>
                        <p className="text-sm text-slate-500 mt-0.5">Driver ID: {record.driverId}</p>
                        {record.driverLicense && <p className="text-sm text-slate-500 mt-0.5">Licence: <span className="font-mono font-bold">{record.driverLicense}</span></p>}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
                      <div className="bg-slate-50 border border-slate-100 rounded p-2">
                        <div className="flex items-center gap-1.5 justify-start">
                          <p className="text-slate-500 uppercase tracking-wide">Level</p>
                          <InfoTooltip 
                            title={`${getJurisdiction(record.state)} Level ${record.level?.replace(/level\s*/i, '') || '1'}`}
                            text={getInspectionLevelDescription(record.level)}
                          />
                        </div>
                        <p className="text-slate-800 font-semibold mt-0.5">{record.level}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded p-2">
                        <p className="text-slate-500 uppercase tracking-wide">Violations</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{record.violations.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 h-full">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                    <Truck size={14} className="text-slate-400" /> Asset Details
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full">
                    <div className="p-3 border-b border-slate-100">
                      <div className="text-[13px] font-bold text-blue-700 uppercase tracking-wide">
                        {primaryUnit?.type || record.vehicleType}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 font-mono">
                        {primaryUnit?.license || record.vehiclePlate}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        Asset ID: <span className="font-mono">{record.assetId}</span> - Units: {unitCount}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {(record.units || []).map((unit: any, idx: number) => (
                        <div key={idx} className="px-3 py-2.5 text-[13px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-700 font-medium uppercase">{unit.type}</span>
                            <span className="text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 font-mono">{unit.make}</span>
                          </div>
                          <div className="mt-1 flex justify-between text-slate-500">
                            <span>License</span>
                            <span className="text-slate-800 font-semibold">{unit.license}</span>
                          </div>
                          <div className="mt-0.5 flex justify-between text-slate-500">
                            <span>VIN</span>
                            <span className="font-mono text-slate-700">{unit.vin}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* CVOR Power Unit / Trailer Defects */}
                    {record.powerUnitDefects && (
                      <div className="px-3 py-2 border-t border-slate-100 bg-amber-50/50">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Power Unit Defects</div>
                        <div className="text-xs text-amber-700 font-medium">{record.powerUnitDefects}</div>
                      </div>
                    )}
                    {record.trailerDefects && record.trailerDefects !== 'NONE' && (
                      <div className="px-3 py-2 border-t border-slate-100 bg-amber-50/50">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Trailer Defects</div>
                        <div className="text-xs text-amber-700 font-medium">{record.trailerDefects}</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 h-full">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                    <Activity size={14} className="text-slate-400" /> Violation Summary
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full">
                    <div className="divide-y divide-gray-100 text-[13px]">
                      {SUMMARY_CATEGORIES.map(cat => (
                        <div key={cat} className="flex justify-between items-center px-3 py-2.5">
                          <span className="text-slate-700 font-medium">{cat}</span>
                          <span className={`font-bold ${record.violationSummary[cat] ? 'text-red-600' : 'text-slate-400'}`}>
                            {record.violationSummary[cat] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 h-full">
                  <h4 className="text-xs sm:text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                    <AlertTriangle size={14} className="text-slate-400" /> Out of Service (OOS)
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col justify-between h-full">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] text-slate-700 font-medium">Driver OOS</span>
                        {record.oosSummary?.driver === 'PASSED' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">PASSED</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">FAILED</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] text-slate-700 font-medium">Vehicle OOS</span>
                        {record.oosSummary?.vehicle === 'PASSED' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">PASSED</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">FAILED</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                      <span className="text-sm font-bold text-slate-900 uppercase">Total OOS</span>
                      <span className={`text-2xl font-bold leading-none ${record.oosSummary?.total > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        {record.oosSummary?.total || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Panel: Detailed Violations Table */}
              <div className="space-y-4 mt-2">
                <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                  <FileText size={14} className="text-slate-400" /> Detailed Violations
                </h4>
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
                  <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 font-bold">Date</th>
                        <th className="px-3 py-2.5 font-bold">Document / Violation</th>
                        <th className="px-3 py-2.5 font-bold text-center">Code</th>
                        <th className="px-3 py-2.5 font-bold">Category</th>
                        <th className="px-3 py-2.5 font-bold">Description</th>
                        <th className="px-3 py-2.5 font-bold text-center">Risk Level</th>
                        <th className="px-3 py-2.5 font-bold text-center">Severity</th>
                        <th className="px-3 py-2.5 font-bold text-center">Weight</th>
                        <th className="px-3 py-2.5 font-bold text-center">Points</th>
                        <th className="px-3 py-2.5 font-bold text-center">OOS</th>
                        <th className="px-3 py-2.5 font-bold text-center">Jur</th>
                        <th className="px-3 py-2.5 font-bold">Vehicle</th>
                        <th className="px-3 py-2.5 font-bold">Driver</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {record.violations?.map((violation: any, idx: number) => {
                        const rowOpen   = expandedViolIdx === idx;
                        const isOos     = !!violation.oos;
                        const pts       = violation.points ?? 0;
                        const wt        = violation.weight ?? '—';
                        const riskVal   = violation.crashLikelihoodPercent ?? (violation.driverRiskCategory === 1 ? 85 : violation.driverRiskCategory === 2 ? 45 : 15);
                        const riskLabel = riskVal >= 70 ? 'High' : riskVal >= 40 ? 'Medium' : 'Low';
                        const riskCls   = riskLabel === 'High'   ? 'bg-red-50 text-red-700 border-red-200' :
                                          riskLabel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                   'bg-slate-100 text-slate-600 border-slate-200';
                        const sevCls    = violation.severity === 'OOS'   ? 'bg-red-50 text-red-700 border-red-200' :
                                          violation.severity === 'Major'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                            'bg-slate-100 text-slate-600 border-slate-200';
                        const ptsCls    = pts >= 4 ? 'bg-red-600 text-white' :
                                          pts >= 3 ? 'bg-red-500 text-white' :
                                          pts >= 2 ? 'bg-amber-500 text-white' :
                                                     'bg-slate-400 text-white';
                        const jur        = getJurisdiction(record.state);
                        const plate      = primaryUnit?.license || record.vehiclePlate || '—';
                        const driverName = record.driver?.split(',')[0] ?? '—';
                        const initials   = driverName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                        const equivalent = getEquivalentCode(violation.code);
                        // Impact analysis
                        const baseWt     = riskLabel === 'High' ? 3 : riskLabel === 'Medium' ? 2 : 1;
                        const totalPts   = baseWt + (isOos ? 1 : 0);
                        const ptsTotalCls= totalPts >= 4 ? 'bg-red-600 text-white' : totalPts >= 3 ? 'bg-red-500 text-white' : totalPts >= 2 ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white';
                        const impactLabel= totalPts >= 4 ? 'Critical' : totalPts >= 3 ? 'High' : totalPts >= 2 ? 'Moderate' : 'Low';
                        const impactDesc = totalPts >= 4 ? 'OOS violation in a high-risk category. Immediate corrective action required. Significant carrier score impact.'
                                         : totalPts >= 3 ? 'High-risk violation with direct carrier score impact. Corrective action strongly recommended.'
                                         : totalPts >= 2 ? 'Moderate-risk violation. Review compliance procedures.'
                                         : 'Low-risk administrative violation. Monitor for recurrence.';
                        const iBorder    = totalPts >= 3 ? 'border-red-200' : totalPts >= 2 ? 'border-amber-200' : 'border-slate-200';
                        const iBg        = totalPts >= 3 ? 'bg-red-50'      : totalPts >= 2 ? 'bg-amber-50'      : 'bg-slate-50';
                        const iCellCls   = totalPts >= 3 ? 'bg-white border-red-100' : totalPts >= 2 ? 'bg-white border-amber-100' : 'bg-white border-slate-100';
                        const iBadgeCls  = totalPts >= 4 ? 'bg-red-100 text-red-700 border-red-200' : totalPts >= 3 ? 'bg-red-100 text-red-700 border-red-200' : totalPts >= 2 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                        const iIconCls   = totalPts >= 3 ? 'text-red-500' : totalPts >= 2 ? 'text-amber-500' : 'text-slate-400';
                        return (
                          <Fragment key={idx}>
                            <tr
                              className={`group hover:bg-blue-50/30 transition-colors align-middle cursor-pointer ${rowOpen ? 'bg-blue-50/20' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setExpandedViolIdx(rowOpen ? null : idx); }}
                            >
                              {/* Date */}
                              <td className="px-3 py-3">
                                <div className="font-semibold text-slate-900 text-[13px]">{record.date}</div>
                              </td>
                              {/* Document / Violation */}
                              <td className="px-3 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="font-mono font-semibold text-slate-800 text-[13px]">{record.id}</div>
                                    <div className="mt-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">{violation.description?.slice(0,30)}{violation.description?.length > 30 ? '…' : ''}</div>
                                  </div>
                                  <div className={`shrink-0 transition-transform duration-150 ${rowOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                  </div>
                                </div>
                              </td>
                              {/* Code */}
                              <td className="px-3 py-3 text-center">
                                <span className="font-mono font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[12px]">{violation.code ?? '—'}</span>
                              </td>
                              {/* Category */}
                              <td className="px-3 py-3">
                                <span className="text-[12px] font-semibold text-slate-700">{violation.category ?? '—'}</span>
                              </td>
                              {/* Description */}
                              <td className="px-3 py-3">
                                <p className="text-[12px] text-slate-600 leading-snug">{violation.description ?? '—'}</p>
                                {violation.subDescription && <p className="text-[10px] text-blue-500 mt-0.5 font-medium">{violation.subDescription}</p>}
                              </td>
                              {/* Risk Level */}
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${riskCls}`}>{riskLabel}</span>
                              </td>
                              {/* Severity */}
                              <td className="px-3 py-3 text-center">
                                {violation.severity
                                  ? <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${sevCls}`}>{violation.severity}</span>
                                  : <span className="text-slate-300">—</span>}
                              </td>
                              {/* Weight */}
                              <td className="px-3 py-3 text-center">
                                <span className="font-mono font-bold text-slate-700 text-[13px]">{wt}</span>
                              </td>
                              {/* Points */}
                              <td className="px-3 py-3 text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-black ${ptsCls}`}>{pts}</span>
                              </td>
                              {/* OOS */}
                              <td className="px-3 py-3 text-center">
                                {isOos
                                  ? <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold bg-red-50 text-red-700 border-red-200">YES</span>
                                  : <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold bg-slate-50 text-slate-400 border-slate-200">NO</span>}
                              </td>
                              {/* Jur */}
                              <td className="px-3 py-3 text-center">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">{jur}</span>
                              </td>
                              {/* Vehicle */}
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                    <Truck size={10} className="text-slate-500" />
                                  </div>
                                  <span className="font-mono font-bold text-slate-800 text-[12px]">{plate}</span>
                                </div>
                              </td>
                              {/* Driver */}
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[9px] font-bold text-blue-600">{initials}</div>
                                  <span className="text-[12px] font-semibold text-slate-800">{driverName}</span>
                                </div>
                              </td>
                            </tr>

                            {/* ── Expandable detail panel ── */}
                            {rowOpen && (
                              <tr onClick={(e) => e.stopPropagation()}>
                                <td colSpan={13} className="p-0 border-t border-slate-200">
                                  <div className="bg-slate-50/70 px-4 pt-4 pb-5 space-y-4">

                                    {/* Meta grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                                      {/* Date / Location */}
                                      <div className="flex flex-col gap-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <MapPin size={10} /> Date / Time / Location
                                        </div>
                                        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                                          <div>
                                            <div className="text-[13px] font-bold text-slate-900">{record.date}</div>
                                            {record.location && (
                                              <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                                                <MapPin size={10} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{typeof record.location === 'string' ? record.location : record.location.raw || `${record.location.city}, ${record.location.province}`}</span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-auto">
                                            <span className="text-[10px] bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-700">{jur}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{record.id}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Issuing Agency — only if data */}
                                      {record.agency ? (
                                        <div className="flex flex-col gap-1.5">
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                            <Building2 size={10} /> Issuing Agency
                                          </div>
                                          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                                            <div className="flex items-start gap-3">
                                              <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                <ShieldAlert size={15} className="text-blue-500" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="text-[13px] font-bold text-slate-900 leading-snug">{record.agency}</div>
                                                <div className="mt-0.5 text-[11px] text-slate-400">Enforcement Authority</div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : <div />}

                                      {/* Driver / Vehicle */}
                                      <div className="flex flex-col gap-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <User size={10} /> Driver / Vehicle
                                        </div>
                                        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-1">
                                            <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-blue-600">{initials}</div>
                                            <div className="min-w-0">
                                              <div className="text-[13px] font-semibold text-slate-900 truncate">{driverName}</div>
                                              <div className="text-[11px] text-slate-400">{record.driverLicense || record.driverId || 'Driver'}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-3 px-4 py-3 flex-1">
                                            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                              <Truck size={14} className="text-slate-500" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="text-[13px] font-bold font-mono text-slate-900">{plate}</div>
                                              <div className="text-[11px] text-slate-400">{primaryUnit?.type || record.vehicleType || 'Vehicle'}</div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Legislative Reference + System Violation Risk Matrix */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                                      {/* Legislative Reference */}
                                      <div className="flex flex-col gap-1.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <Info size={10} /> Legislative Reference
                                        </div>
                                        <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                          <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{jur === 'CVOR' ? 'Canadian Code' : 'FMCSA Code'}</span>
                                              <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-sm shadow-sm">{violation.code ?? '—'}</span>
                                            </div>
                                            {isOos && <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200">OOS</span>}
                                          </div>
                                          <div className="p-4 space-y-3 flex-1">
                                            {/* CSA / CVOR Equivalent */}
                                            {equivalent && (
                                              <div className={`rounded-lg border p-3 ${jur === 'CVOR' ? 'bg-blue-50/60 border-blue-200' : 'bg-red-50/60 border-red-200'}`}>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${jur === 'CVOR' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                                    {jur === 'CVOR' ? 'CSA Equivalent' : 'CVOR Equivalent'}
                                                  </span>
                                                  <span className="text-[10px] text-slate-400 font-medium">{equivalent.source}</span>
                                                </div>
                                                <div className="font-mono font-bold text-[13px] text-slate-800">{equivalent.code}</div>
                                                <div className="text-[12px] text-slate-500 mt-0.5">{equivalent.shortDescription}</div>
                                              </div>
                                            )}
                                            <div>
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</div>
                                              <div className="text-[13px] font-semibold text-slate-800">{violation.category ?? '—'}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</div>
                                              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-800 leading-snug">{violation.description ?? '—'}</div>
                                              {violation.subDescription && (
                                                <div className="mt-1 text-[11px] text-blue-500 font-medium">{violation.subDescription}</div>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                              {[
                                                { label: 'Severity', value: violation.severity ?? '—' },
                                                { label: 'Weight',   value: wt },
                                                { label: 'Points',   value: pts },
                                                { label: 'OOS',      value: isOos ? 'YES' : 'NO', red: isOos },
                                              ].map(({ label, value, red }) => (
                                                <div key={label} className="bg-slate-50 border border-slate-100 rounded-lg px-2 py-2 text-center">
                                                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                                                  <div className={`mt-1 text-[13px] font-black ${red ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* System Violation Risk Matrix */}
                                      <div className="flex flex-col gap-1.5">
                                        <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5`}>
                                          <ShieldAlert size={10} className={iIconCls} /> System Violation Risk Matrix
                                        </div>
                                        <div className={`flex-1 rounded-xl border shadow-sm overflow-hidden flex flex-col ${iBorder}`}>
                                          <div className={`border-b ${iBorder} ${iBg} px-4 py-2.5 flex items-center justify-between`}>
                                            <span className="text-[11px] font-semibold text-slate-700">Risk Assessment</span>
                                            <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${iBadgeCls}`}>{riskLabel} Risk</span>
                                          </div>
                                          <div className={`flex-1 p-4 ${iBg}`}>
                                            <div className="grid grid-cols-3 gap-2">
                                              <div className={`rounded-lg border px-3 py-3 ${iCellCls}`}>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Risk Level</div>
                                                <div className={`text-[13px] font-bold ${iIconCls}`}>{riskLabel}</div>
                                              </div>
                                              <div className={`rounded-lg border px-3 py-3 ${iCellCls}`}>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Category</div>
                                                <div className="text-[13px] font-bold text-slate-800 leading-tight">{violation.category ?? '—'}</div>
                                              </div>
                                              <div className={`rounded-lg border px-3 py-3 ${iCellCls}`}>
                                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">OOS Eligible</div>
                                                <div className={`text-[13px] font-bold ${isOos ? 'text-red-600' : 'text-slate-500'}`}>{isOos ? 'YES' : 'NO'}</div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Impact Analysis */}
                                    <div>
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                        <ShieldAlert size={10} className={iIconCls} /> Impact Analysis
                                      </div>
                                      <div className={`rounded-xl border shadow-sm overflow-hidden ${iBorder}`}>
                                        <div className={`px-4 py-2.5 border-b ${iBorder} ${iBg} flex items-center justify-between`}>
                                          <span className="text-[11px] font-semibold text-slate-700">Carrier Score Impact</span>
                                          <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${iBadgeCls}`}>{impactLabel} Impact</span>
                                        </div>
                                        <div className={`p-4 ${iBg}`}>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="bg-white border border-slate-200 rounded-lg px-3 py-3">
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Base Points</div>
                                              <div className="flex items-end gap-1.5">
                                                <span className="text-2xl font-black text-slate-800 leading-none">{baseWt}</span>
                                                <span className="text-[11px] text-slate-400 mb-0.5">pts</span>
                                              </div>
                                              <div className="mt-1 text-[10px] text-slate-400">{riskLabel} Risk Level</div>
                                            </div>
                                            <div className={`rounded-lg px-3 py-3 border ${isOos ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">OOS Bonus</div>
                                              <div className="flex items-end gap-1.5">
                                                <span className={`text-2xl font-black leading-none ${isOos ? 'text-red-600' : 'text-slate-300'}`}>+{isOos ? 1 : 0}</span>
                                                <span className={`text-[11px] mb-0.5 ${isOos ? 'text-red-400' : 'text-slate-300'}`}>pts</span>
                                              </div>
                                              <div className={`mt-1 text-[10px] ${isOos ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{isOos ? 'Out-of-Service' : 'Not OOS'}</div>
                                            </div>
                                            <div className={`rounded-lg px-3 py-3 border ${iBorder} ${iBg}`}>
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Total Points</div>
                                              <div className="flex items-center gap-2">
                                                <div className={`w-9 h-9 rounded-lg ${ptsTotalCls} flex items-center justify-center shrink-0`}>
                                                  <span className="font-black text-[15px] leading-none">{totalPts}</span>
                                                </div>
                                                <div className={`text-xl font-black leading-none ${iIconCls}`}>{totalPts} <span className="text-sm font-bold">pts</span></div>
                                              </div>
                                            </div>
                                            <div className="bg-white border border-slate-200 rounded-lg px-3 py-3">
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Score Effect</div>
                                              <div className={`text-[13px] font-bold leading-tight ${iIconCls}`}>{impactLabel}</div>
                                              <div className="mt-1.5 flex gap-0.5">
                                                {[1,2,3,4].map(i => (
                                                  <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= totalPts ? ptsTotalCls.replace(' text-white','') : 'bg-slate-200'}`} />
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="mt-3 flex items-start gap-2 bg-white/70 border border-white rounded-lg px-3 py-2.5">
                                            <Info size={12} className={`mt-0.5 shrink-0 ${iIconCls}`} />
                                            <p className="text-[12px] text-slate-600 leading-relaxed">{impactDesc}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const formatMetricValue = (value: number | string | null | undefined, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// ── NSC Overview Row ──────────────────────────────────────────────────────────
// Renders a single NSC/CVSA inspection record in the unified overview list.
const NscOverviewRow = ({ row }: { row: NscInspectionRecord }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<{
    code: string; description: string; severity: 'Minor' | 'Major' | 'OOS'; isOOS: boolean;
  } | null>(null);

  const oosRows = row.details?.oosRows ?? (row.details?.oos ?? []).map(cat => ({ category: cat, vehicleCounts: [1, null, null, null, null, null, null] }));
  const reqRows = row.details?.reqRows ?? (row.details?.req ?? []).map(cat => ({ category: cat, vehicleCounts: [1, null, null, null, null, null, null] }));
  const rawOosCount = row.details?.oos?.length ?? 0;
  const rawReqCount = row.details?.req?.length ?? 0;

  const isOos = row.result === 'Out Of Service';
  const isReq = row.result === 'Requires Attention';
  const isPassed = row.result === 'Passed';

  const levelColors: Record<number, string> = {
    1: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    2: 'bg-blue-100 text-blue-800 border-blue-200',
    3: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    4: 'bg-sky-100 text-sky-800 border-sky-200',
    5: 'bg-violet-100 text-violet-800 border-violet-200',
  };
  const levelCls = levelColors[row.level] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  // Use violations from the violation list (violationDetailsData), falling back to defect derivation
  const listViolations = violationDetailsData.filter(v => v.document === row.doc);
  const violations: Array<{ code: string; description: string; severity: 'Minor' | 'Major' | 'OOS'; tier: 'OOS' | 'REQ' }> =
    listViolations.length > 0
      ? listViolations.map(v => {
          const numCode = parseCcmtaCode(v.ccmtaCode);
          const catalog = NSC_VIOLATION_CATALOG[numCode];
          const sev = (v.severity ?? catalog?.severity ?? 'Minor') as 'Minor' | 'Major' | 'OOS';
          return { code: numCode, description: catalog?.description ?? v.description, severity: sev, tier: sev === 'OOS' ? 'OOS' : 'REQ' };
        })
      : (() => {
          const derived: Array<{ code: string; description: string; severity: 'Minor' | 'Major' | 'OOS'; tier: 'OOS' | 'REQ' }> = [];
          const seen = new Set<string>();
          for (const defect of oosRows) {
            const prefix = defect.category.split(' - ')[0].trim();
            const code = prefix === '13' ? '702' : (DEFECT_TO_NSC[prefix] ?? null);
            if (code && !seen.has(code)) { const entry = NSC_VIOLATION_CATALOG[code]; if (entry) { seen.add(code); derived.push({ code, ...entry, tier: 'OOS' }); } }
          }
          for (const defect of reqRows) {
            const prefix = defect.category.split(' - ')[0].trim();
            const code = DEFECT_TO_NSC[prefix] ?? null;
            if (code && !seen.has(code)) { const entry = NSC_VIOLATION_CATALOG[code]; if (entry) { seen.add(code); derived.push({ code, ...entry, tier: 'REQ' }); } }
          }
          return derived;
        })();
  const oosCount = listViolations.length > 0 ? violations.filter(v => v.severity === 'OOS').length : rawOosCount;
  const reqCount = listViolations.length > 0 ? violations.filter(v => v.severity !== 'OOS').length : rawReqCount;
  const totalDefects = oosCount + reqCount;

  // NSC risk-level derived points (High=3, Medium=2, Low=1)
  const nscPoints = violations.reduce((sum, v) => {
    const sys = NSC_CODE_TO_SYSTEM[v.code];
    return sum + (sys?.riskLevel === 'High' ? 3 : sys?.riskLevel === 'Medium' ? 2 : sys ? 1 : 0);
  }, 0);
  const NSC_DRIVER_CATS = new Set(['driver_fitness', 'hours_of_service', 'unsafe_driving']);
  const nscDriverPts = violations.reduce((sum, v) => {
    const sys = NSC_CODE_TO_SYSTEM[v.code];
    if (!sys || !NSC_DRIVER_CATS.has(sys.category)) return sum;
    return sum + (sys.riskLevel === 'High' ? 3 : sys.riskLevel === 'Medium' ? 2 : 1);
  }, 0);
  const nscAssetPts = violations.reduce((sum, v) => {
    const sys = NSC_CODE_TO_SYSTEM[v.code];
    if (!sys || sys.category !== 'vehicle_maintenance') return sum;
    return sum + (sys.riskLevel === 'High' ? 3 : sys.riskLevel === 'Medium' ? 2 : 1);
  }, 0);
  const nscCarrierPts = nscPoints; // total across all categories

  return (
    <div className="group bg-white hover:bg-blue-50/20 transition-colors border-b border-slate-100 last:border-0">
      {/* Desktop row — unified 12-col layout matching SMS/CVOR InspectionRow */}
      <div
        className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-4 items-center cursor-pointer border-l-2 border-l-emerald-400 hover:bg-emerald-50/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date / Time */}
        <div className="col-span-1 pl-2 flex flex-col justify-center">
          <span className="text-sm font-bold text-slate-800">{row.date}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.details?.time ?? '—'}</span>
        </div>

        {/* Source + Doc — emerald NSC badge */}
        <div className="col-span-1 min-w-0 flex flex-col justify-center">
          <span className="text-xs font-bold text-emerald-700 block truncate leading-tight" title={row.doc}>{row.doc}</span>
          <span className="mt-0.5 inline-flex w-fit items-center gap-1 px-1.5 py-px rounded text-[10px] font-bold tracking-wider border bg-emerald-100 text-emerald-700 border-emerald-200">
            NSC L{row.level}
          </span>
        </div>

        {/* Location */}
        <div className="col-span-1 flex flex-col justify-center">
          <span className="text-sm font-medium text-slate-700 truncate">{row.details?.location ?? `${row.jur} station`}</span>
          <span className="text-[10px] text-slate-400">{row.jur}, CAN</span>
        </div>

        {/* Driver / Licence */}
        <div className="col-span-2 flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 flex-shrink-0">
            <User size={12} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{row.driverLink.driverName}</span>
            <span className="text-[10px] text-emerald-600 font-mono truncate block">{row.driverLink.driverId}</span>
          </div>
        </div>

        {/* Unit / Vehicle */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{row.primaryVehicle.unitNumber}</span>
          <span className="text-[10px] text-slate-400 font-mono truncate block">{row.primaryVehicle.plate}</span>
          {row.trailerLink ? (
            <span className="text-[10px] text-slate-400 truncate block mt-0.5">+ {row.trailerLink.unitNumber}</span>
          ) : isPassed ? (
            <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">No defects</span>
          ) : (
            <span className="text-[10px] text-amber-600 font-medium truncate block mt-0.5">{oosCount + reqCount} defect{oosCount + reqCount !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Violations count */}
        <div className="col-span-1 flex justify-center items-center">
          {isPassed ? (
            <span className="text-[13px] font-bold text-emerald-600">Clean</span>
          ) : (
            <span className="text-[13px] font-bold text-orange-600">{violations.length || totalDefects}</span>
          )}
        </div>

        {/* NSC Asset Points (Veh Pts column) */}
        <div className="col-span-1 flex justify-center items-center">
          {nscAssetPts > 0 ? (
            <span className={`text-[13px] font-bold ${nscAssetPts >= 5 ? 'text-red-600' : nscAssetPts >= 3 ? 'text-amber-600' : 'text-slate-700'}`}>{nscAssetPts}</span>
          ) : (
            <span className="text-[13px] text-slate-300">—</span>
          )}
        </div>

        {/* NSC Driver Points (Drv Pts column) */}
        <div className="col-span-1 flex justify-center items-center">
          {nscDriverPts > 0 ? (
            <span className={`text-[13px] font-bold ${nscDriverPts >= 3 ? 'text-red-600' : 'text-amber-600'}`}>{nscDriverPts}</span>
          ) : (
            <span className="text-[13px] text-slate-300">—</span>
          )}
        </div>

        {/* NSC Carrier Points (Carr Pts column) */}
        <div className="col-span-1 flex justify-center items-center">
          {nscCarrierPts > 0 ? (
            <span className={`text-[13px] font-bold ${nscCarrierPts >= 6 ? 'text-red-600' : nscCarrierPts >= 3 ? 'text-amber-600' : 'text-slate-700'}`}>{nscCarrierPts}</span>
          ) : (
            <span className="text-[13px] text-slate-300">—</span>
          )}
        </div>

        {/* Status + expand */}
        <div className="col-span-1 flex items-center justify-between pr-1">
          <div>
            {isOos ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">
                <ShieldAlert size={10} className="text-red-500" /> OOS
              </span>
            ) : isReq ? (
              <span className="inline-flex items-center px-2 py-0.5 bg-amber-50 rounded text-xs font-bold text-amber-600 tracking-wide uppercase whitespace-nowrap">DEFECT</span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600 tracking-wide uppercase whitespace-nowrap">OK</span>
            )}
          </div>
          <div className="ml-auto w-5 h-5 flex items-center justify-center text-slate-400">
            {row.details ? (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
          </div>
        </div>
      </div>

      {/* Mobile card */}
      <div
        className="md:hidden flex flex-col gap-3 p-4 cursor-pointer border-l-2 border-l-emerald-300"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-bold text-emerald-700 font-mono">{row.doc}</span>
              <span className={`px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${levelCls}`}>NSC L{row.level}</span>
            </div>
            <span className="text-sm text-slate-900 font-medium block mt-0.5">{row.date}</span>
            <span className="text-xs text-slate-400">{row.jur} · {row.driverLink.driverName}</span>
          </div>
          <div className="flex items-center gap-2">
            {isOos ? (
              <span className="px-2 py-0.5 bg-red-50 rounded text-xs font-bold text-red-600">OOS</span>
            ) : isReq ? (
              <span className="px-2 py-0.5 bg-amber-50 rounded text-xs font-bold text-amber-600">DEFECT</span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600">OK</span>
            )}
            {row.details ? (isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />) : null}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center pt-2 border-t border-slate-100">
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Defects</div>
            <div className="mt-0.5 text-sm font-black text-slate-900">{totalDefects}</div>
          </div>
          <div className="rounded-lg border border-red-100 bg-red-50/60 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">OOS</div>
            <div className="mt-0.5 text-sm font-black text-red-600">{oosCount}</div>
          </div>
          <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-2 py-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">REQ</div>
            <div className="mt-0.5 text-sm font-black text-amber-700">{reqCount}</div>
          </div>
        </div>
      </div>

      {/* Expanded panel */}
      {isExpanded && row.details && (
        <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-5 space-y-4">

          {/* ── NSC Level banner + stat cards ── */}
          {(() => {
            const NSC_LEVEL_MAP: Record<number, string> = {
              1: 'North American Standard Inspection',
              2: 'Walk-Around Driver/Vehicle Inspection',
              3: 'Driver/Credential Inspection',
              4: 'Special Inspection',
              5: 'Vehicle-Only Inspection',
              6: 'Enhanced NAS Inspection',
              7: 'Jurisdictional Mandated Inspection',
              8: 'Electronic Inspection',
            };
            const NSC_LEVEL_DETAIL_MAP: Record<number, string> = {
              1: 'Full inspection — driver, vehicle, HOS, permits, insurance, cargo, TDG, and authorities.',
              2: 'Walk-around inspection — driver and vehicle review including licence, HOS, seat belt, trip inspection and visible mechanical condition.',
              3: 'Driver/Credentials inspection — driver licence, hours of service, seat belt use, credentials and administrative compliance.',
              4: 'Special inspection — focused on a specific item such as cargo securement, placards, brakes, or another identified issue.',
              5: 'Vehicle-only inspection — no driver present, focused on mechanical condition and safety systems.',
              6: 'Enhanced NAS inspection — comprehensive inspection with additional focus on high-risk categories.',
              7: 'Jurisdictional mandated inspection — required by provincial/state authority for specific vehicle or carrier types.',
              8: 'Electronic inspection — roadside review of ELD, credentials, and electronic records without physical vehicle check.',
            };
            const levelDesc = NSC_LEVEL_MAP[row.level] ?? `Level ${row.level} Inspection`;
            const levelDetail = NSC_LEVEL_DETAIL_MAP[row.level];
            const jur = row.jur?.toUpperCase() ?? '';
            const regulation =
              jur === 'AB' ? 'Commercial Vehicle Inspection Regulation — AR 211/06, NSC Standard 11' :
              jur === 'ON' ? 'Highway Traffic Act — O.Reg.199/07, O.Reg.555/06, NSC Standard 13' :
              jur === 'BC' ? 'Motor Vehicle Act — Commercial Transport Regulation, NSC Standard 11' :
              jur === 'SK' ? 'Traffic Safety Act — VSR 116/2014, NSC Standard 11' :
              jur === 'MB' ? 'Highway Traffic Act — MR 189/2010, NSC Standard 11' :
              jur === 'QC' ? 'Highway Safety Code — O.C. 1395-96, NSC Standard 11' :
              'CTACMV Regulations — NSC Standard 11';
            const oosCount = row.details!.oos.length;
            const reqCount = row.details!.req.length;
            const totalDefects = oosCount + reqCount;
            const resultColor =
              row.result === 'Passed'           ? 'text-emerald-700' :
              row.result === 'Out Of Service'   ? 'text-red-700'     :
              'text-amber-700';
            return (false && (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      NSC LEVEL {row.level}
                    </span>
                    <span className="text-xs text-slate-700">
                      <span className="font-semibold">{levelDesc}</span>
                      {' — '}
                      <span className="text-slate-500">{regulation}</span>
                    </span>
                  </div>
                  {levelDetail && (
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-1">{levelDetail}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Time</div>
                    <div className="text-sm font-bold text-slate-900">{row.details!.time || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Issuing Agency</div>
                    <div className="text-sm font-bold text-slate-900 leading-snug">{row.details!.agency || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date Entered</div>
                    <div className="text-sm font-bold text-slate-900">{row.details!.dateEntered || '—'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Result</div>
                    <div className={`text-sm font-bold ${resultColor}`}>{row.result}</div>
                  </div>
                </div>
                {/* Defect counts row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-red-100 bg-red-50/50 px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">OOS Defects</div>
                    <div className={`text-xl font-black ${oosCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{oosCount}</div>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1">Req. Attention</div>
                    <div className={`text-xl font-black ${reqCount > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{reqCount}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Defects</div>
                    <div className="text-xl font-black text-slate-700">{totalDefects}</div>
                  </div>
                </div>
              </div>
            ));
          })()}

          {/* System links — driver profile + asset cards */}
          {(() => {
            const driver = MOCK_DRIVERS.find(d => d.id === row.driverLink.driverId);
            const asset  = row.primaryVehicle.assetId ? INITIAL_ASSETS.find(a => a.id === row.primaryVehicle.assetId) : null;
            const trailer = row.trailerLink?.assetId ? INITIAL_ASSETS.find(a => a.id === row.trailerLink!.assetId) : null;
            const primaryLic = driver?.licenses?.find(l => l.isPrimary) ?? null;
            const statusColor = (s?: string) =>
              s === 'Active'        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
              s === 'Maintenance'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
              s === 'OutOfService'  ? 'bg-red-50 text-red-700 border-red-200' :
              'bg-slate-100 text-slate-600 border-slate-200';
            return (false && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {/* Driver card */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      {driver?.avatarInitials ?? row.driverLink.driverName.slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-blue-900 text-xs truncate">{row.driverLink.driverName}</div>
                      <div className="text-[10px] font-mono text-blue-500">{row.driverLink.driverId}</div>
                    </div>
                    {driver && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(driver?.status)}`}>
                        {driver?.status}
                      </span>
                    )}
                  </div>
                  {driver && (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider font-bold">Type</span>
                        <div className="text-slate-700 font-medium">{driver?.driverType ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider font-bold">Terminal</span>
                        <div className="text-slate-700 font-medium">{driver?.terminal ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider font-bold">Licence</span>
                        <div className="text-slate-700 font-mono">{primaryLic?.licenseNumber ?? driver?.licenseNumber ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider font-bold">State/Prov</span>
                        <div className="text-slate-700 font-medium">{primaryLic?.province ?? driver?.licenseState ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider font-bold">Expiry</span>
                        <div className="text-slate-700 font-medium">{primaryLic?.expiryDate ?? driver?.licenseExpiry ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 uppercase tracking-wider font-bold">Class</span>
                        <div className="text-slate-700 font-medium">{primaryLic?.class ?? '—'}</div>
                      </div>
                    </div>
                  )}
                  {row.driverLink.rawLicence && (
                    <div className="text-[9px] text-slate-400 font-mono border-t border-blue-100 pt-1 truncate" title={row.driverLink.rawLicence}>
                      NSC: {row.driverLink.rawLicence}
                    </div>
                  )}
                </div>

                {/* Asset card — power unit */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck size={14} className="text-indigo-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-indigo-900 text-xs">{row.primaryVehicle.unitNumber}</div>
                      <div className="text-[10px] font-mono text-indigo-500">{row.primaryVehicle.assetId ?? 'unlinked'}</div>
                    </div>
                    {asset && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(asset?.operationalStatus)}`}>
                        {asset?.operationalStatus}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                    {asset ? (
                      <>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider font-bold">Year / Make</span>
                          <div className="text-slate-700 font-medium">{asset?.year} {asset?.make}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider font-bold">Model</span>
                          <div className="text-slate-700 font-medium">{asset?.model}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider font-bold">Plate</span>
                          <div className="text-slate-700 font-mono">{asset?.plateNumber}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider font-bold">Jurisdiction</span>
                          <div className="text-slate-700 font-medium">{asset?.plateJurisdiction}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 uppercase tracking-wider font-bold">VIN</span>
                          <div className="text-slate-700 font-mono text-[9px]">{asset?.vin}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider font-bold">NSC Plate</span>
                          <div className="text-slate-700 font-mono">{row.primaryVehicle.plate}</div>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider font-bold">Make</span>
                          <div className="text-slate-700">{row.primaryVehicle.make}</div>
                        </div>
                        {row.primaryVehicle.vin && (
                          <div className="col-span-2">
                            <span className="text-slate-400 uppercase tracking-wider font-bold">VIN</span>
                            <div className="text-slate-700 font-mono text-[9px]">{row.primaryVehicle.vin}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Trailer card (if present) */}
                {row.trailerLink && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <Truck size={14} className="text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-xs">{row.trailerLink?.unitNumber}</div>
                        <div className="text-[10px] text-slate-400">Trailer</div>
                      </div>
                      {trailer && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColor(trailer?.operationalStatus)}`}>
                          {trailer?.operationalStatus}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
                      {trailer ? (
                        <>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider font-bold">Year / Make</span>
                            <div className="text-slate-700 font-medium">{trailer?.year} {trailer?.make}</div>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider font-bold">Plate</span>
                            <div className="text-slate-700 font-mono">{trailer?.plateNumber}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider font-bold">NSC Plate</span>
                            <div className="text-slate-700 font-mono">{row.trailerLink?.plate}</div>
                          </div>
                          <div>
                            <span className="text-slate-400 uppercase tracking-wider font-bold">Make</span>
                            <div className="text-slate-700">{row.trailerLink?.make}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ));
          })()}

          {/* OOS / REQ defect grids */}
          {(oosRows.length > 0 || reqRows.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="rounded-lg border border-red-100 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-red-100 bg-red-50/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-red-600">Out of Service Defects</div>
                </div>
                {oosRows.length > 0 ? (
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {oosRows.map((d, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-800">{d.category}</td>
                          <td className="px-3 py-2 text-center text-red-600 font-bold">{(d.vehicleCounts.filter(Boolean).length) || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-400">No OOS defects</div>
                )}
              </div>
              <div className="rounded-lg border border-amber-100 bg-white overflow-hidden">
                <div className="px-4 py-2.5 border-b border-amber-100 bg-amber-50/50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Requires Attention Defects</div>
                </div>
                {reqRows.length > 0 ? (
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {reqRows.map((d, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-slate-800">{d.category}</td>
                          <td className="px-3 py-2 text-center text-amber-600 font-bold">{(d.vehicleCounts.filter(Boolean).length) || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-3 text-xs text-slate-400">No req. attention defects</div>
                )}
              </div>
            </div>
          )}

          {/* Violations from NSC catalog */}
          {violations.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                NSC Violations — {row.doc}
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">CCMTA</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Severity</th>
                      <th className="px-3 py-2 text-center font-bold text-slate-400 uppercase tracking-wider">Pts</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Category</th>
                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {violations.map((v, i) => {
                      const sys = NSC_CODE_TO_SYSTEM[v.code];
                      const pts = sys?.riskLevel === 'High' ? 3 : sys?.riskLevel === 'Medium' ? 2 : sys ? 1 : null;
                      return (
                        <tr key={i} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedViolation({ code: v.code, description: v.description, severity: v.severity, isOOS: v.tier === 'OOS' })} title="Click to view violation details">
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{v.code}</td>
                          <td className="px-3 py-2 text-slate-700">{v.description}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${
                              v.severity === 'OOS'   ? 'bg-red-50 text-red-700 border-red-200' :
                              v.severity === 'Major' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>{v.severity}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-black">
                            {pts !== null ? (
                              <span className={pts >= 3 ? 'text-red-600' : pts === 2 ? 'text-amber-600' : 'text-slate-600'}>{pts}</span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            {sys ? (
                              <div>
                                <div className="font-semibold text-slate-800">{sys.categoryLabel}</div>
                                <div className="text-[10px] text-slate-400">{sys.violationGroup}</div>
                              </div>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-2">
                            {sys ? (
                              <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${
                                sys.riskLevel === 'High'   ? 'bg-red-50 text-red-700 border-red-200' :
                                sys.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>{sys.riskLevel}</span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NSC Violation detail modal ── */}
      {selectedViolation && (() => {
        const sys = NSC_CODE_TO_SYSTEM[selectedViolation.code];
        const riskPct   = sys?.riskLevel === 'High' ? 85 : sys?.riskLevel === 'Medium' ? 45 : 15;
        const riskColor = sys?.riskLevel === 'High' ? 'bg-red-500' : sys?.riskLevel === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400';
        const riskText  = sys?.riskLevel === 'High' ? 'text-red-600' : sys?.riskLevel === 'Medium' ? 'text-amber-600' : 'text-slate-600';
        const points    = sys?.riskLevel === 'High' ? 3 : sys?.riskLevel === 'Medium' ? 2 : 1;
        const rawRecord = violationDetailsData.find(r => parseCcmtaCode(r.ccmtaCode) === selectedViolation.code);
        return (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedViolation(null)}>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">Violation Details</h4>
                    <span className="px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">NSC</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Inspection {row.doc}</p>
                </div>
                <button onClick={() => setSelectedViolation(null)} className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="p-4 space-y-4 text-sm">
                {/* CCMTA Code + Act/Section */}
                <div className="flex items-start gap-4">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CCMTA Code</div>
                    <div className="font-mono text-blue-700 font-bold text-base">{selectedViolation.code}</div>
                  </div>
                  {rawRecord?.actSection && (
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Act / Section</div>
                      <div className="text-slate-800 leading-snug text-xs">{rawRecord.actSection}</div>
                    </div>
                  )}
                </div>
                {/* System Category box */}
                {sys && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">NSC System Category</span>
                      <span className="text-xs text-slate-400 font-medium">CCMTA</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-slate-800">{sys.categoryLabel}</div>
                    <div className="text-[13px] text-slate-500 mt-0.5">{sys.violationGroup}</div>
                    <div className="mt-2 space-y-1">
                      <div className={`text-xs font-bold ${riskText}`}>{sys.riskLevel.toUpperCase()} RISK — {riskPct}%</div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${riskColor}`} style={{ width: `${riskPct}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {/* Description */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</div>
                  <div className="text-slate-900 leading-relaxed">{selectedViolation.description}</div>
                  {sys && <div className="mt-1 text-xs text-blue-600/90">{sys.violationGroup}</div>}
                </div>
                {/* Officer Notes */}
                {rawRecord?.text && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                    <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Officer Notes</div>
                    <div className="text-slate-800 leading-relaxed text-[13px] italic">"{rawRecord.text}"</div>
                  </div>
                )}
                {/* Vehicle / Commodity */}
                {(rawRecord?.vehicle || rawRecord?.commodity) && (
                  <div className="grid grid-cols-2 gap-3">
                    {rawRecord.vehicle && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Vehicle</div>
                        <div className="font-mono text-slate-800 font-medium">{rawRecord.vehicle}</div>
                      </div>
                    )}
                    {rawRecord.commodity && rawRecord.commodity !== '—' && rawRecord.commodity !== '' && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Commodity</div>
                        <div className="text-slate-800">{rawRecord.commodity}</div>
                      </div>
                    )}
                  </div>
                )}
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">Severity</div>
                    <div className={`mt-1 font-bold ${
                      selectedViolation.severity === 'OOS'   ? 'text-red-600' :
                      selectedViolation.severity === 'Major' ? 'text-amber-700' : 'text-slate-700'
                    }`}>{selectedViolation.severity}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">Points</div>
                    <div className={`mt-1 font-bold text-lg ${
                      points >= 3 ? 'text-red-600' : points === 2 ? 'text-amber-700' : 'text-slate-700'
                    }`}>{sys ? points : '—'}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">OOS</div>
                    <div className={`mt-1 font-bold ${selectedViolation.isOOS ? 'text-red-600' : 'text-slate-700'}`}>
                      {selectedViolation.isOOS ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">Risk Level</div>
                    <div className={`mt-1 font-bold ${riskText}`}>{sys?.riskLevel ?? '—'}</div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end sticky bottom-0">
                <button onClick={() => setSelectedViolation(null)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const PERIOD_OPTIONS = ['1M', '3M', '6M', '12M', '24M'] as const;
type PeriodLabel =
  | typeof PERIOD_OPTIONS[number]
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-Annual'
  | 'All';
const getPeriodLabel = (period: PeriodLabel) => (
  period === 'All' ? 'All Pulls'
  : period === 'Semi-Annual' ? 'Semi-Annual'
  : period === 'Quarterly' ? 'Quarterly'
  : period === 'Monthly' ? 'Monthly'
  : period === '24M' ? '24 Months'
  : period === '12M' ? '12 Months'
  : period === '6M' ? '6 Months'
  : period === '3M' ? '3 Months'
  : '1 Month'
);

// --- MAIN APP ---
export function InspectionsPage() {
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'sms' | 'cvor' | 'carrier-profile'>('overview');
  const [showReport, setShowReport] = useState(false);
  const [smsPeriod, setSmsPeriod] = useState<'1M' | '3M' | '6M' | '12M' | '24M' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'All'>('All');
  const smsBasicCategory = 'All';
  const [smsTopViolSort, setSmsTopViolSort] = useState<'POINTS' | 'COUNT'>('POINTS');
  const [smsMetricsView, setSmsMetricsView] = useState<'INSPECTIONS' | 'VIOLATIONS' | 'POINTS'>('POINTS');
  const [metricsSort, setMetricsSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });
  // CVOR tab chart states
  const [cvorPeriod, setCvorPeriod] = useState<'1M' | '3M' | '6M' | '12M' | '24M' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'All'>('All');
  const [cvorHoveredPull, setCvorHoveredPull] = useState<{ chart: string; idx: number } | null>(null);
  const [cvorSelectedPull, setCvorSelectedPull] = useState<string | null>(null);
  const [cvorPullFilter, setCvorPullFilter] = useState<'ALL' | 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'SELECTED'>('ALL');
  const [cvorPullSearch, setCvorPullSearch] = useState('');
  const [cvorPullPage, setCvorPullPage] = useState(1);
  const [cvorPullRowsPerPage, setCvorPullRowsPerPage] = useState(10);
  const [cvorPullSort, setCvorPullSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'pullDate', dir: 'desc' });
  const [cvorPullColumns, setCvorPullColumns] = useState<ColumnDef[]>([
    { id: 'pullDate', label: 'Pull Date', visible: true },
    { id: 'window', label: '24-Month Window', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'rating', label: 'Rating', visible: true },
    { id: 'colPct', label: 'Col%', visible: true },
    { id: 'conPct', label: 'Con%', visible: true },
    { id: 'insPct', label: 'Ins%', visible: true },
    { id: 'colCount', label: '#Col', visible: true },
    { id: 'convCount', label: '#Conv', visible: true },
    { id: 'colPts', label: 'Col Pts', visible: true },
    { id: 'convPts', label: 'Conv Pts', visible: true },
    { id: 'oosOverall', label: 'OOS Ov%', visible: true },
    { id: 'oosVehicle', label: 'OOS Veh%', visible: true },
    { id: 'oosDriver', label: 'OOS Drv%', visible: true },
    { id: 'trucks', label: 'Trucks', visible: false },
    { id: 'totalMiles', label: 'Total Mi', visible: false },
  ]);
  const [cvorPullDetailFilter, setCvorPullDetailFilter] = useState<'ALL' | 'CLEAN' | 'OOS' | 'IMPACT' | 'DEFECT'>('ALL');
  const [cvorPullDetailSearch, setCvorPullDetailSearch] = useState('');
  const [cvorPullDetailPage, setCvorPullDetailPage] = useState(1);
  const [cvorPullDetailRowsPerPage, setCvorPullDetailRowsPerPage] = useState(10);
  const [cvorPullDetailSort, setCvorPullDetailSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'desc' });
  const [cvorPullDetailColumns, setCvorPullDetailColumns] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date / Time', visible: true },
    { id: 'report', label: 'Report ID', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'driver', label: 'Driver / Licence', visible: true },
    { id: 'vehicle', label: 'Power Unit / Defects', visible: true },
    { id: 'violations', label: 'Violations', visible: true },
    { id: 'vehPts', label: 'Veh Pts', visible: true },
    { id: 'dvrPts', label: 'Dvr Pts', visible: true },
    { id: 'cvorPts', label: 'CVOR Pts', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ]);
  const [cvorPullDetailExpanded, setCvorPullDetailExpanded] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth
  );
  // Expandable BASIC row states
  const [expandedBasic, setExpandedBasic] = useState<string | null>(null);
  const [basicChartView, setBasicChartView] = useState<Record<string, 'MEASURE' | 'INSPECTIONS'>>({});
  // Expandable CVOR Analysis row states
  const [expandedCvorAnalysis, setExpandedCvorAnalysis] = useState<string | null>(null);
  const [cvorAnalysisChartView, setCvorAnalysisChartView] = useState<Record<string, 'MEASURE' | 'INSPECTIONS'>>({});
  const [expandedCvorLevel, setExpandedCvorLevel] = useState<string | null>(null);
  // Independent period filter for CVOR Level Comparison
  const [cvorLevelPeriod, setCvorLevelPeriod] = useState<'1M' | '3M' | '6M' | '12M' | '24M' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'All'>('All');
  const [smsListPeriod, setSmsListPeriod] = useState<'7d' | '30d' | '90d' | '6mo' | '12mo' | 'custom'>('12mo');
  const [smsCustomFrom, setSmsCustomFrom] = useState('');
  const [smsCustomTo, setSmsCustomTo] = useState('');
  const [smsPopupRecord, setSmsPopupRecord] = useState<any>(null);
  const [smsVisibleCols, setSmsVisibleCols] = useState<Record<string, boolean>>({
    date: true, report: true, location: true, driver: true, vehicle: true,
    violations: true, vehPts: true, drvPts: true, carrPts: true, status: true,
  });
  const [smsColPickerOpen, setSmsColPickerOpen] = useState(false);
  const [mileageUnit, setMileageUnit] = useState<'km' | 'mi'>('km');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setCvorPullPage(1);
  }, [cvorPullFilter, cvorPullSearch, cvorPullSort.col, cvorPullSort.dir, cvorPullRowsPerPage, cvorSelectedPull]);

  useEffect(() => {
    setCvorPullDetailPage(1);
  }, [cvorPullDetailFilter, cvorPullDetailSearch, cvorPullDetailSort.col, cvorPullDetailSort.dir, cvorPullDetailRowsPerPage, cvorSelectedPull]);

  useEffect(() => {
    setCvorPullDetailExpanded(null);
  }, [cvorSelectedPull]);

  const [columns, setColumns] = useState<ColumnDef[]>([
    { id: 'date', label: 'Insp. Date', visible: true },
    { id: 'report', label: 'Report ID', visible: true },
    { id: 'country', label: 'Country', visible: true },
    { id: 'state', label: 'State', visible: true },
    { id: 'driver', label: 'Driver', visible: true },
    { id: 'asset', label: 'Asset', visible: true },
    { id: 'violations', label: 'Violations', visible: true },
    { id: 'severity', label: 'Severity', visible: true },
    { id: 'points', label: 'Points', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ]);
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const { csaThresholds, cvorThresholds, cvorOosThresholds, documents: allDocTypes } = useAppData();

  // FMCSA SMS Time Weight: 3 for 0-6 months, 2 for 6-12 months, 1 for 12-24 months
  const getTimeWeightTop = (inspDate: string, ref: Date): number => {
    const d = new Date(inspDate);
    const diffMonths = (ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    if (diffMonths <= 6) return 3;
    if (diffMonths <= 12) return 2;
    if (diffMonths <= 24) return 1;
    return 0;
  };

  // Compute BASIC measures from actual inspection data (shared across tabs)
  const computedBasicOverview = useMemo(() => {
    const smsInsp = inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA');
    const ref = new Date('2026-01-30');
    const peerThresholds: Record<string, { p50: number; p65: number; p75: number; p80: number; p90: number; p95: number }> = {
      'Unsafe Driving':              { p50: 2.0, p65: 4.0, p75: 6.0, p80: 8.0, p90: 12.0, p95: 18.0 },
      'Hours-of-service Compliance':  { p50: 1.5, p65: 3.0, p75: 5.0, p80: 7.0, p90: 10.0, p95: 15.0 },
      'Vehicle Maintenance':          { p50: 5.0, p65: 10.0, p75: 15.0, p80: 18.0, p90: 22.0, p95: 26.0 },
      'Controlled Substances':        { p50: 0.5, p65: 1.0, p75: 2.0, p80: 3.0, p90: 5.0, p95: 8.0 },
      'Driver Fitness':               { p50: 1.0, p65: 2.0, p75: 4.0, p80: 5.0, p90: 8.0, p95: 12.0 },
      'Hazmat compliance':            { p50: 1.0, p65: 2.0, p75: 3.0, p80: 5.0, p90: 7.0, p95: 10.0 },
      'Crash Indicator':              { p50: 0.5, p65: 1.0, p75: 1.5, p80: 2.0, p90: 3.0, p95: 5.0 },
    };

    return carrierProfile.basicStatus.map(status => {
      const cat = status.category;
      const inspWithCat = smsInsp.filter(insp =>
        insp.violations.some(v => v.category === cat) && getTimeWeightTop(insp.date, ref) > 0
      );
      const numInsp = inspWithCat.length;
      let totalWeightedSev = 0;
      inspWithCat.forEach(insp => {
        const tw = getTimeWeightTop(insp.date, ref);
        insp.violations.filter(v => v.category === cat).forEach(v => {
          totalWeightedSev += (v.severity || 0) * tw;
        });
      });
      const computedMeasure = numInsp > 0 ? Math.round((totalWeightedSev / numInsp) * 100) / 100 : 0;
      const peers = peerThresholds[cat];
      let computedPercentile = 'N/A';
      if (numInsp >= 3 && peers) {
        const m = computedMeasure;
        if (m >= peers.p95) computedPercentile = `${Math.min(99, 95 + Math.round((m - peers.p95) / peers.p95 * 4))}%`;
        else if (m >= peers.p90) computedPercentile = `${90 + Math.round((m - peers.p90) / (peers.p95 - peers.p90) * 5)}%`;
        else if (m >= peers.p80) computedPercentile = `${80 + Math.round((m - peers.p80) / (peers.p90 - peers.p80) * 10)}%`;
        else if (m >= peers.p75) computedPercentile = `${75 + Math.round((m - peers.p75) / (peers.p80 - peers.p75) * 5)}%`;
        else if (m >= peers.p65) computedPercentile = `${65 + Math.round((m - peers.p65) / (peers.p75 - peers.p65) * 10)}%`;
        else if (m >= peers.p50) computedPercentile = `${50 + Math.round((m - peers.p50) / (peers.p65 - peers.p50) * 15)}%`;
        else computedPercentile = `${Math.max(1, Math.round(m / peers.p50 * 50))}%`;
      }
      const isAlert = computedPercentile !== 'N/A' && parseInt(computedPercentile) >= (csaThresholds?.critical || 80);
      return {
        ...status,
        measure: computedMeasure > 0 ? computedMeasure.toString() : '0',
        percentile: computedPercentile,
        alert: isAlert,
        details: numInsp === 0 ? 'No violations'
          : numInsp < 3 ? `< 3 inspections with violations (${numInsp} found)`
          : `${numInsp} inspections with violations | Weighted Severity: ${totalWeightedSev}`,
      };
    });
  }, [csaThresholds]);

  // Form state for Add/Edit
  const emptyForm = {
    id: '', date: '', country: 'US', state: '', locationStreet: '', locationCity: '', locationZip: '',
    startTime: '', endTime: '',
    driverId: '', driver: '', driverLicense: '',
    vehiclePlate: '', vehicleType: 'Truck',
    assetId: '', level: 'Level 1', isClean: true, hasOOS: false,
    hasVehicleViolations: false, hasDriverViolations: false,
    units: [{ type: 'Truck', make: '', license: '', vin: '' }],
    oosSummary: { driver: 'PASSED', vehicle: 'PASSED', total: 0 },
    violations: [] as any[],
    fineAmount: '', currency: 'USD',
    powerUnitDefects: '', trailerDefects: '',
    vehiclePoints: 0, driverPoints: 0, carrierPoints: 0,
  };
  const [inspForm, setInspForm] = useState(emptyForm);
  const [formViolations, setFormViolations] = useState<any[]>([]);

  // Violation document types for inspections
  const violationDocTypes = useMemo(() => allDocTypes.filter(d => d.relatedTo === 'violation' && d.status === 'Active'), [allDocTypes]);
  const requiredDocTypes = useMemo(() => violationDocTypes.filter(d => d.requirementLevel === 'required'), [violationDocTypes]);
  const [inspAttachedDocs, setInspAttachedDocs] = useState<Array<{ id: string; docTypeId: string; docNumber: string; issueDate: string; fileName: string }>>([]);

  const openAddModal = () => {
    setInspForm(emptyForm);
    setFormViolations([]);
    setInspAttachedDocs(requiredDocTypes.map(dt => ({
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      docTypeId: dt.id, docNumber: '', issueDate: '', fileName: ''
    })));
    setEditingInspection(null);
    setShowAddModal(true);
  };
  const openEditModal = (record: any) => {
    const pts = record.smsPoints || record.cvorPoints || {};
    setInspForm({
      id: record.id, date: record.date, country: record.country || (getJurisdiction(record.state) === 'CVOR' ? 'Canada' : 'US'),
      state: record.state, locationStreet: record.locationStreet || '', locationCity: record.location?.city || record.locationCity || '', locationZip: record.locationZip || '',
      startTime: record.startTime || '', endTime: record.endTime || '',
      driverId: record.driverId,
      driver: record.driver, driverLicense: record.driverLicense || '',
      vehiclePlate: record.vehiclePlate, vehicleType: record.vehicleType,
      assetId: record.assetId, level: record.level, isClean: record.isClean, hasOOS: record.hasOOS,
      hasVehicleViolations: record.hasVehicleViolations, hasDriverViolations: record.hasDriverViolations,
      units: record.units || [{ type: 'Truck', make: '', license: '', vin: '' }],
      oosSummary: record.oosSummary || { driver: 'PASSED', vehicle: 'PASSED', total: 0 },
      violations: [],
      fineAmount: record.fineAmount || '', currency: record.currency || 'USD',
      powerUnitDefects: record.powerUnitDefects || '', trailerDefects: record.trailerDefects || '',
      vehiclePoints: pts.vehicle || 0, driverPoints: pts.driver || 0, carrierPoints: pts.carrier || pts.cvor || 0,
    });
    setFormViolations(record.violations || []);
    if (record.attachedDocuments?.length) {
      setInspAttachedDocs(record.attachedDocuments);
    } else {
      setInspAttachedDocs(requiredDocTypes.map(dt => ({
        id: `doc-${Math.random().toString(36).substr(2, 9)}`,
        docTypeId: dt.id, docNumber: '', issueDate: '', fileName: ''
      })));
    }
    setEditingInspection(record);
    setShowAddModal(true);
  };
  const closeFormModal = () => { setShowAddModal(false); setEditingInspection(null); };
  const addFormViolation = () => {
    setFormViolations(prev => [...prev, { code: '', category: 'Vehicle Maintenance', description: '', subDescription: '', severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 }]);
  };
  const updateFormViolation = (idx: number, field: string, value: any) => {
    setFormViolations(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  };
  const removeFormViolation = (idx: number) => {
    setFormViolations(prev => prev.filter((_, i) => i !== idx));
  };
  const updateFormUnit = (idx: number, field: string, value: string) => {
    setInspForm(prev => ({ ...prev, units: prev.units.map((u, i) => i === idx ? { ...u, [field]: value } : u) }));
  };
  const addFormUnit = () => {
    setInspForm(prev => ({ ...prev, units: [...prev.units, { type: 'Trailer', make: '', license: '', vin: '' }] }));
  };
  const removeFormUnit = (idx: number) => {
    setInspForm(prev => ({ ...prev, units: prev.units.filter((_, i) => i !== idx) }));
  };

  // Derived Stats for Filters (includes NSC)
  const stats = useMemo(() => {
    const nscOos = NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length;
    const totalViolations = inspectionsData.reduce((s, i) => s + i.violations.length, 0);
    const smsCvorPoints = inspectionsData.reduce((s, i) => s + (i.violations || []).reduce((ps: number, v: any) => ps + (v.points || 0), 0), 0);
    const nscViolations = NSC_INSPECTIONS.reduce((s, row) => {
      const oosRows = row.details?.oosRows ?? (row.details?.oos ?? []).map((cat: string) => ({ category: cat, vehicleCounts: [1] }));
      const reqRows = row.details?.reqRows ?? (row.details?.req ?? []).map((cat: string) => ({ category: cat, vehicleCounts: [1] }));
      return s + oosRows.length + reqRows.length;
    }, 0);
    // NSC points: OOS defects=5pts, Req.Attn=3pts each
    const nscPoints = NSC_INSPECTIONS.reduce((s, row) => {
      const oosCount = row.details?.oos?.length ?? 0;
      const reqCount = row.details?.req?.length ?? 0;
      return s + (oosCount * 5) + (reqCount * 3);
    }, 0);
    const totalPoints = smsCvorPoints + nscPoints;
    return {
      total: inspectionsData.length + NSC_INSPECTIONS.length,
      clean: inspectionsData.filter(i => i.isClean).length + NSC_INSPECTIONS.filter(r => r.result === 'Passed').length,
      oos: inspectionsData.filter(i => i.hasOOS).length + nscOos,
      vehicle: inspectionsData.filter(i => i.hasVehicleViolations).length,
      driver: inspectionsData.filter(i => i.hasDriverViolations).length,
      severe: inspectionsData.filter(i => i.violations.some(v => v.severity >= 7)).length,
      cvor: inspectionsData.filter(i => getJurisdiction(i.state) === 'CVOR').length,
      sms: inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA').length,
      nsc: NSC_INSPECTIONS.length,
      totalViolations: totalViolations + nscViolations,
      totalPoints,
      smsCvorPoints,
      nscPoints,
    };
  }, []);

  // Unified inspection list: SMS/CVOR (tagged) + NSC records
  // Each entry is either a legacy record (with _source) or an NscInspectionRecord (with _source='NSC')
  const filteredSmsOrCvor = inspectionsData.filter(insp => {
    if (activeFilter === 'NSC') return false;
    const st = searchTerm.toLowerCase();
    const matchesSearch =
      insp.id.toLowerCase().includes(st) ||
      insp.driver.toLowerCase().includes(st) ||
      insp.vehiclePlate.toLowerCase().includes(st) ||
      (insp.driverLicense && insp.driverLicense.toLowerCase().includes(st)) ||
      (insp.location?.city && insp.location.city.toLowerCase().includes(st)) ||
      (insp.location?.raw && insp.location.raw.toLowerCase().includes(st));
    let matchesFilter = true;
    switch(activeFilter) {
      case 'CLEAN':   matchesFilter = insp.isClean; break;
      case 'OOS':     matchesFilter = insp.hasOOS; break;
      case 'VEHICLE': matchesFilter = insp.hasVehicleViolations; break;
      case 'DRIVER':  matchesFilter = insp.hasDriverViolations; break;
      case 'SEVERE':  matchesFilter = insp.violations.some(v => v.severity >= 7); break;
      case 'CVOR':    matchesFilter = getJurisdiction(insp.state) === 'CVOR'; break;
      case 'SMS':     matchesFilter = getJurisdiction(insp.state) === 'CSA'; break;
      default:        matchesFilter = true;
    }
    return matchesSearch && matchesFilter;
  });

  const filteredNsc = (['ALL', 'NSC', 'OOS', 'CLEAN'].includes(activeFilter))
    ? NSC_INSPECTIONS.filter(row => {
        if (activeFilter === 'OOS') return row.result === 'Out Of Service';
        if (activeFilter === 'CLEAN') return row.result === 'Passed';
        const st = searchTerm.toLowerCase();
        if (!st) return true;
        return (
          row.doc.toLowerCase().includes(st) ||
          row.driverLink.driverName.toLowerCase().includes(st) ||
          row.driverLink.driverId.toLowerCase().includes(st) ||
          row.primaryVehicle.unitNumber.toLowerCase().includes(st) ||
          row.primaryVehicle.plate.toLowerCase().includes(st) ||
          row.jur.toLowerCase().includes(st) ||
          (row.details?.location?.toLowerCase().includes(st) ?? false)
        );
      })
    : [];

  // Tagged wrapper for type-safe rendering
  type TaggedLegacy = { _source: 'SMS' | 'CVOR'; record: any };
  type TaggedNsc    = { _source: 'NSC'; record: NscInspectionRecord };
  type TaggedEntry  = TaggedLegacy | TaggedNsc;

  const filteredData: TaggedEntry[] = [
    ...filteredSmsOrCvor.map(r => ({
      _source: (getJurisdiction(r.state) === 'CVOR' ? 'CVOR' : 'SMS') as 'SMS' | 'CVOR',
      record: r,
    })),
    ...filteredNsc.map(r => ({ _source: 'NSC' as const, record: r })),
  ];

  const pagedData = filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="min-h-screen text-slate-900 p-4 md:p-6 pb-20 relative">
      <div className="w-full space-y-6">
        
        {/* ===== TOP HEADER & ACTIONS ===== */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inspections</h1>
            <p className="text-sm text-gray-500">Track and manage roadside inspections and safety events.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <Upload size={16} /> Export
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm shadow-blue-200"
            >
              <Plus size={16} /> Add Inspection
            </button>
          </div>
        </div>

        {/* ===== MAIN TAB NAVIGATION ===== */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            {[
              { id: 'overview' as const, label: 'Full Overview' },
              { id: 'sms' as const, label: 'SMS (FMCSA)' },
              { id: 'cvor' as const, label: 'CVOR (Canadian)' },
              { id: 'carrier-profile' as const, label: 'Carrier Profile (NSC)' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveMainTab(tab.id); setShowReport(false); }}
                className={`px-5 py-2 text-sm font-semibold rounded-md transition-all ${
                  activeMainTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Report button — only for reportable tabs */}
          {activeMainTab !== 'overview' && (
            <button
              onClick={() => setShowReport(p => !p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all shadow-sm ${
                showReport
                  ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  : 'bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <FileText size={14} />
              {showReport ? 'Close Report' : 'Generate Report'}
            </button>
          )}
        </div>

        {/* ===== REPORT PANEL ===== */}
        {showReport && activeMainTab !== 'overview' && (
          <InspectionReportPanel
            variant={activeMainTab === 'sms' ? 'sms' : activeMainTab === 'cvor' ? 'cvor' : 'nsc'}
            basicOverview={computedBasicOverview}
            csaThresholds={csaThresholds}
            cvorThresholds={cvorThresholds}
            cvorOosThresholds={cvorOosThresholds}
            carrierProfile={carrierProfile}
          />
        )}

        {/* ===== TAB: FULL OVERVIEW ===== */}
        {activeMainTab === 'overview' && (
        <>

        {/* ===== NEW SECTION: COMPANY OVERVIEW DASHBOARD ===== */}
        <div className="space-y-4 pt-2">
          
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Overall Carrier Report Card</h2>
            <InfoTooltip 
              title="Company-Wide Scores"
              text="These sections act as a report card for the entire company. They take all the individual events (crashes, inspections, violations) from all drivers and combine them into overall scores." 
            />
          </div>

          {/* Intervention Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertOctagon className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide">Intervention Warning</h4>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                The carrier exceeds the FMCSA Intervention Threshold relative to its safety event grouping based on roadside data. This carrier may be prioritized for an intervention action and roadside inspection. Note: No Acute/Critical Violations were discovered during investigation results.
              </p>
            </div>
          </div>

          {/* Top Row: Safety Rating & OOS and Licensing */}
          {false && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Col 1: Combined Safety Rating & OOS (SMS + CVOR) */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-blue-500"/> Safety Rating & OOS
                <InfoTooltip
                  text="SMS and CVOR safety ratings are calculated differently. This combined card keeps both in one place with clear tags."
                />
              </h3>

              <div className="space-y-4">
                <div className="p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">SMS</span>
                    <span className="text-sm font-medium text-slate-700">
                      Current Rating: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{carrierProfile.rating}</span>
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold text-center">Carrier %</th>
                          <th className="px-3 py-2 font-semibold text-center">Nat Avg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-3 py-2 text-slate-700">Vehicle</td>
                          <td className="px-3 py-2 text-center font-bold text-red-600">{carrierProfile.oosRates.vehicle.carrier}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{carrierProfile.oosRates.vehicle.national}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-slate-700">Driver</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-800">{carrierProfile.oosRates.driver.carrier}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{carrierProfile.oosRates.driver.national}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-slate-700">Hazmat</td>
                          <td className="px-3 py-2 text-center font-bold text-slate-400">{carrierProfile.oosRates.hazmat.carrier}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{carrierProfile.oosRates.hazmat.national}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-600">CVOR</span>
                    <span className="text-sm font-medium text-slate-700">
                      Current Rating: <span className={`font-bold px-2 py-0.5 rounded border ${carrierProfile.cvorAnalysis.rating >= 70 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-green-100 text-green-800 border-green-200'}`}>{carrierProfile.cvorAnalysis.rating >= 70 ? 'CONDITIONAL' : 'OK'}</span>
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold text-center">Carrier %</th>
                          <th className="px-3 py-2 font-semibold text-center">Threshold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="px-3 py-2 text-slate-700">Overall OOS</td>
                          <td className={`px-3 py-2 text-center font-bold ${carrierProfile.cvorAnalysis.counts.oosOverall > cvorOosThresholds.overall ? 'text-red-600' : 'text-slate-800'}`}>{carrierProfile.cvorAnalysis.counts.oosOverall}%</td>
                          <td className="px-3 py-2 text-center text-slate-500">&gt;{cvorOosThresholds.overall}%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-slate-700">Vehicle OOS</td>
                          <td className={`px-3 py-2 text-center font-bold ${carrierProfile.cvorAnalysis.counts.oosVehicle > cvorOosThresholds.vehicle ? 'text-red-600' : 'text-slate-800'}`}>{carrierProfile.cvorAnalysis.counts.oosVehicle}%</td>
                          <td className="px-3 py-2 text-center text-slate-500">&gt;{cvorOosThresholds.vehicle}%</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-slate-700">Driver OOS</td>
                          <td className={`px-3 py-2 text-center font-bold ${carrierProfile.cvorAnalysis.counts.oosDriver > cvorOosThresholds.driver ? 'text-red-600' : 'text-slate-800'}`}>{carrierProfile.cvorAnalysis.counts.oosDriver}%</td>
                          <td className="px-3 py-2 text-center text-slate-500">&gt;{cvorOosThresholds.driver}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">NSC / CVSA</span>
                    {(() => {
                      const nscTotal = NSC_INSPECTIONS.length;
                      const nscOos = NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length;
                      const nscOosRate = nscTotal > 0 ? Math.round((nscOos / nscTotal) * 100) : 0;
                      return (
                        <span className="text-sm font-medium text-slate-700">
                          OOS Rate: <span className={`font-bold px-2 py-0.5 rounded border ${nscOosRate >= 30 ? 'bg-red-100 text-red-800 border-red-200' : nscOosRate >= 20 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-green-100 text-green-800 border-green-200'}`}>{nscOosRate}%</span>
                        </span>
                      );
                    })()}
                  </div>
                  <div className="overflow-x-auto rounded border border-slate-100">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Type</th>
                          <th className="px-3 py-2 font-semibold text-center">Count</th>
                          <th className="px-3 py-2 font-semibold text-center">Rate</th>
                          <th className="px-3 py-2 font-semibold text-center">Threshold</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          const nscTotal = NSC_INSPECTIONS.length;
                          const nscOos = NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length;
                          const nscReqAttn = NSC_INSPECTIONS.filter(r => r.result === 'Requires Attention').length;
                          const nscPassed = NSC_INSPECTIONS.filter(r => r.result === 'Passed').length;
                          const oosRate = nscTotal > 0 ? ((nscOos / nscTotal) * 100).toFixed(1) : '0.0';
                          const reqRate = nscTotal > 0 ? ((nscReqAttn / nscTotal) * 100).toFixed(1) : '0.0';
                          const passRate = nscTotal > 0 ? ((nscPassed / nscTotal) * 100).toFixed(1) : '0.0';
                          return (
                            <>
                              <tr>
                                <td className="px-3 py-2 text-slate-700">Out of Service</td>
                                <td className="px-3 py-2 text-center font-bold text-red-600">{nscOos}</td>
                                <td className={`px-3 py-2 text-center font-bold ${parseFloat(oosRate) >= 30 ? 'text-red-600' : 'text-slate-800'}`}>{oosRate}%</td>
                                <td className="px-3 py-2 text-center text-slate-500">&gt;30%</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 text-slate-700">Requires Attention</td>
                                <td className="px-3 py-2 text-center font-bold text-amber-600">{nscReqAttn}</td>
                                <td className="px-3 py-2 text-center font-bold text-slate-800">{reqRate}%</td>
                                <td className="px-3 py-2 text-center text-slate-500">&gt;20%</td>
                              </tr>
                              <tr>
                                <td className="px-3 py-2 text-slate-700">Passed</td>
                                <td className="px-3 py-2 text-center font-bold text-emerald-600">{nscPassed}</td>
                                <td className="px-3 py-2 text-center font-bold text-emerald-600">{passRate}%</td>
                                <td className="px-3 py-2 text-center text-slate-500">—</td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Col 2: Licensing */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                <FileSignature size={14} className="text-purple-500"/> Licensing
                <InfoTooltip 
                  text="Combined licensing details from SMS and CVOR views for one full company overview." 
                />
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">CVOR Number</span>
                  <span className="font-bold font-mono text-slate-900">{carrierProfile.cvor}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">USDOT Number</span>
                  <span className="font-bold font-mono text-slate-900">{carrierProfile.id}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Property Carrier</span>
                  <span className="font-bold text-slate-900">{carrierProfile.licensing.property.mc} <span className="text-green-600 bg-green-50 px-1 rounded ml-1">Active</span></span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Fleet Size</span>
                  <span className="font-bold text-slate-900">{carrierProfile.cvorAnalysis.counts.trucks} Power Units</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Total Mileage</span>
                  <span className="font-bold font-mono text-blue-600">{((mileageUnit === 'km' ? carrierProfile.cvorAnalysis.counts.totalMiles * 1.60934 : carrierProfile.cvorAnalysis.counts.totalMiles) / 1000000).toFixed(1)}M {mileageUnit === 'km' ? 'km' : 'mi'}</span>
                </div>

                {/* NSC / Federal Details */}
                <div className="pt-2 pb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                    <ShieldAlert size={10}/> NSC / Federal
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">NSC Number</span>
                  <span className="font-bold font-mono text-slate-900">AB320-9327</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">MVID Number</span>
                  <span className="font-bold font-mono text-slate-900">0930-15188</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Certificate Number</span>
                  <span className="font-bold font-mono text-slate-900">002050938</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Status</span>
                  <span className="font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded text-xs">Federal Active</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Passenger</span>
                  <span className="font-medium text-slate-400">No</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Household</span>
                  <span className="font-medium text-slate-400">No</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Broker</span>
                  <span className="font-medium text-slate-400">No</span>
                </div>
              </div>
            </div>

          </div>
          )}

          {/* Compliance Dashboard: US (CSA) | Canada (CVOR) | Canada (NSC) Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* LEFT COLUMN: United States - SMS Analysis */}
            {false && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Gauge size={16} className="text-blue-600"/>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">SMS Analysis</h3>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">SMS</span>
                  <InfoTooltip text="The carrier's overall safety percentile score based on a 2-year period, ranked against other similar companies." />
                </div>
              </div>
              <div className="space-y-0 flex-1">
                {computedBasicOverview.map((status, idx) => {
                  const numericPercentile = parseInt(status.percentile) || 0;
                  let alertClass = 'bg-slate-100 text-slate-600';
                  let textClass = 'text-slate-700';
                  let borderClass = '';

                  if (status.percentile !== 'N/A') {
                      if (numericPercentile >= csaThresholds.critical) {
                          alertClass = 'bg-red-100 text-red-800';
                          textClass = 'text-red-700 font-bold';
                          borderClass = 'border-l-2 border-l-red-400 pl-3';
                      } else if (numericPercentile >= csaThresholds.warning) {
                          alertClass = 'bg-amber-100 text-amber-800';
                          textClass = 'text-amber-700 font-bold';
                          borderClass = 'border-l-2 border-l-amber-400 pl-3';
                      }
                  } else if (status.alert) {
                      alertClass = 'bg-red-100 text-red-800';
                      textClass = 'text-red-700 font-bold';
                      borderClass = 'border-l-2 border-l-red-400 pl-3';
                  }

                  const isExp = expandedBasic === status.category;
                  return (
                  <div key={idx} className={`border-b border-slate-50 last:border-0 ${borderClass}`}>
                    <div
                      className="flex flex-col justify-center py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => setExpandedBasic(isExp ? null : status.category)}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                          <span className={`text-sm font-medium ${textClass}`}>{status.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status.measure !== undefined && <span className="text-xs text-slate-400 font-mono">Msr: {status.measure}</span>}
                          <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{status.percentile}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 truncate pl-5" title={status.details}>{status.details}</span>
                    </div>
                    {isExp && (
                      <div className="pb-3 pl-5 pr-1">
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-xs text-slate-500">
                          <div className="font-bold text-slate-700 mb-1">{status.category}</div>
                          <div>Measure: <span className="font-mono font-bold text-slate-800">{status.measure}</span></div>
                          <div>Percentile: <span className="font-mono font-bold text-slate-800">{status.percentile}</span></div>
                          <div className="mt-1 text-slate-400">{status.details}</div>
                          <div className="mt-2 text-blue-500 text-xs">Switch to SMS tab for detailed charts →</div>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            </div>
            )}

            {/* RIGHT COLUMN: Canada - CVOR Analysis */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Activity size={16} className="text-red-600"/>
                </div>
                <h3 className="text-sm font-bold text-slate-900">CVOR Analysis</h3>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700">CVOR</span>
                <InfoTooltip text="Commercial Vehicle Operator's Registration (CVOR) performance metrics for Ontario-based carriers." />
              </div>

              {/* Overall Rating Row */}
              {(() => {
                const rating = carrierProfile.cvorAnalysis.rating;
                let ratingClass = 'bg-green-100 text-green-800';
                let borderClass = '';
                if (rating >= cvorThresholds.showCause) { ratingClass = 'bg-red-100 text-red-800'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (rating >= cvorThresholds.intervention) { ratingClass = 'bg-amber-100 text-amber-800'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                else if (rating >= cvorThresholds.warning) { ratingClass = 'bg-yellow-100 text-yellow-800'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-sm font-medium ${rating >= cvorThresholds.warning ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>Overall CVOR Rating</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">{rating}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${ratingClass}`}>
                          {rating >= cvorThresholds.showCause && 'Show Cause'}
                          {rating >= cvorThresholds.intervention && rating < cvorThresholds.showCause && 'Audit'}
                          {rating >= cvorThresholds.warning && rating < cvorThresholds.intervention && 'Warning'}
                          {rating < cvorThresholds.warning && 'OK'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">Composite score from collisions, convictions, and inspections</span>
                  </div>
                );
              })()}

              {/* Collisions Row */}
              {(() => {
                const val = carrierProfile.cvorAnalysis.collisions.percentage;
                let alertClass = 'bg-green-100 text-green-800';
                let borderClass = '';
                if (val >= cvorThresholds.intervention) { alertClass = 'bg-red-100 text-red-800'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-amber-100 text-amber-800'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Collisions</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.collisions.weight}% | {val}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>
                          {val >= cvorThresholds.intervention && 'Audit'}
                          {val >= cvorThresholds.warning && val < cvorThresholds.intervention && 'Warning'}
                          {val < cvorThresholds.warning && 'OK'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{carrierProfile.cvorAnalysis.counts.collisions} collisions | {carrierProfile.cvorAnalysis.counts.totalCollisionPoints} points</span>
                  </div>
                );
              })()}

              {/* Convictions Row */}
              {(() => {
                const val = carrierProfile.cvorAnalysis.convictions.percentage;
                let alertClass = 'bg-green-100 text-green-800';
                let borderClass = '';
                if (val >= cvorThresholds.intervention) { alertClass = 'bg-red-100 text-red-800'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-amber-100 text-amber-800'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Convictions</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.convictions.weight}% | {val}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>
                          {val >= cvorThresholds.intervention && 'Audit'}
                          {val >= cvorThresholds.warning && val < cvorThresholds.intervention && 'Warning'}
                          {val < cvorThresholds.warning && 'OK'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{carrierProfile.cvorAnalysis.counts.convictions} convictions | {carrierProfile.cvorAnalysis.counts.convictionPoints} points</span>
                  </div>
                );
              })()}

              {/* Inspections Row */}
              {(() => {
                const val = carrierProfile.cvorAnalysis.inspections.percentage;
                let alertClass = 'bg-green-100 text-green-800';
                let borderClass = '';
                if (val >= cvorThresholds.showCause) { alertClass = 'bg-red-100 text-red-800'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.intervention) { alertClass = 'bg-amber-100 text-amber-800'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-yellow-100 text-yellow-800'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Inspections</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.inspections.weight}% | {val}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>
                          {val >= cvorThresholds.showCause && 'Show Cause'}
                          {val >= cvorThresholds.intervention && val < cvorThresholds.showCause && 'Audit'}
                          {val >= cvorThresholds.warning && val < cvorThresholds.intervention && 'Warning'}
                          {val < cvorThresholds.warning && 'OK'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">OOS: Overall {carrierProfile.cvorAnalysis.counts.oosOverall}% | Vehicle {carrierProfile.cvorAnalysis.counts.oosVehicle}% | Driver {carrierProfile.cvorAnalysis.counts.oosDriver}%</span>
                  </div>
                );
              })()}

              {/* Key Counts */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Collisions</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{carrierProfile.cvorAnalysis.counts.collisions}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Convictions</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{carrierProfile.cvorAnalysis.counts.convictions}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Trucks</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{carrierProfile.cvorAnalysis.counts.trucks}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">{mileageUnit === 'km' ? 'Kms' : 'Miles'}</div>
                  <div className="font-mono font-bold text-blue-600 text-sm mt-0.5">{((mileageUnit === 'km' ? carrierProfile.cvorAnalysis.counts.totalMiles * 1.60934 : carrierProfile.cvorAnalysis.counts.totalMiles) / 1000000).toFixed(1)}M</div>
                </div>
              </div>

              {/* Threshold Legend */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500"><span className="font-bold text-slate-700">{cvorThresholds.warning}%</span> Warning</span>
                  <span className="text-slate-500"><span className="font-bold text-amber-600">{cvorThresholds.intervention}%</span> Audit</span>
                  <span className="text-slate-500"><span className="font-bold text-red-600">{cvorThresholds.showCause}%</span> Show Cause</span>
                  <span className="text-slate-500"><span className="font-bold text-red-800">{cvorThresholds.seizure}%</span> Seizure</span>
                </div>
              </div>
            </div>

            {/* THIRD COLUMN: Canada - NSC Analysis */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShieldAlert size={16} className="text-emerald-600"/>
                </div>
                <h3 className="text-sm font-bold text-slate-900">NSC / CVSA Analysis</h3>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">NSC</span>
                <InfoTooltip text="National Safety Code (NSC) CVSA inspection analysis — covers Canadian cross-border inspections reported under the NSC framework." />
              </div>

              {/* CVSA Inspection Results */}
              {(() => {
                const totalNsc = NSC_INSPECTIONS.length;
                const oosCount = NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length;
                const passedCount = NSC_INSPECTIONS.filter(r => r.result === 'Passed').length;
                const reqAttnCount = NSC_INSPECTIONS.filter(r => r.result === 'Requires Attention').length;
                const oosRate = totalNsc > 0 ? Math.round((oosCount / totalNsc) * 100) : 0;
                const isOosAlert = oosRate >= 30;
                return (
                  <>
                    <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${isOosAlert ? 'border-l-2 border-l-red-400 pl-3' : ''}`}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className={`text-sm font-medium ${isOosAlert ? 'text-red-700 font-bold' : 'text-slate-700'}`}>CVSA Inspections</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">{totalNsc} total</span>
                          <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${oosRate >= 30 ? 'bg-red-100 text-red-800' : oosRate >= 20 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                            {oosRate}% OOS
                          </span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">Passed: {passedCount} | OOS: {oosCount} | Req. Attn: {reqAttnCount}</span>
                    </div>

                    {/* Collisions */}
                    <div className="flex flex-col justify-center py-2.5 border-b border-slate-50">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-medium text-slate-700">Collisions</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">6 events</span>
                          <span className="text-sm font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">OK</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">4 Property Damage | 2 Injury | 0 Fatal</span>
                    </div>

                    {/* Convictions */}
                    <div className="flex flex-col justify-center py-2.5 border-b border-slate-50">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-medium text-slate-700">Convictions</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">5 events</span>
                          <span className="text-sm font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">OK</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">Trip Inspections (2) | Admin (2) | Driving (1)</span>
                    </div>

                    {/* Violations */}
                    <div className="flex flex-col justify-center py-2.5 border-b border-slate-50">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-sm font-medium text-slate-700">Violations</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-mono">24 defects</span>
                          <span className="text-sm font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Monitor</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">Brakes (8) | Lighting (5) | Mechanical (4) | Driver (3)</span>
                    </div>
                  </>
                );
              })()}

              {/* Key Counts */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Inspections</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{NSC_INSPECTIONS.length}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">OOS Rate</div>
                  <div className="font-mono font-bold text-red-600 text-sm mt-0.5">
                    {NSC_INSPECTIONS.length > 0 ? Math.round((NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length / NSC_INSPECTIONS.length) * 100) : 0}%
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Defects</div>
                  <div className="font-mono font-bold text-amber-600 text-sm mt-0.5">
                    {NSC_INSPECTIONS.reduce((s, r) => s + (r.details?.oos?.length ?? 0) + (r.details?.req?.length ?? 0), 0)}
                  </div>
                </div>
              </div>

              {/* Threshold Legend */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span className="text-slate-500"><span className="font-bold text-green-600">&lt;20%</span> OK</span>
                  <span className="text-slate-500"><span className="font-bold text-amber-600">20-30%</span> Monitor</span>
                  <span className="text-slate-500"><span className="font-bold text-red-600">&gt;30%</span> Alert</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===== KPI SUMMARY + FILTER ===== */}
        <div className="mt-8 space-y-4">
          {/* Summary stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* Total Inspections */}
            <div className="bg-white border-2 border-blue-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1 flex items-center gap-1.5"><ClipboardCheck size={12} className="text-blue-500" /> Total Inspections</div>
              <div className="text-2xl font-black text-slate-900">{stats.total}</div>
              <div className="flex gap-2 mt-1.5 text-[10px] font-bold">
                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">SMS {stats.sms}</span>
                <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded">CVOR {stats.cvor}</span>
                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">NSC {stats.nsc}</span>
              </div>
            </div>
            {/* Clean */}
            <div className="bg-white border-2 border-emerald-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1 flex items-center gap-1.5"><CheckCircle2 size={12} /> Clean</div>
              <div className="text-2xl font-black text-emerald-600">{stats.clean}</div>
              <div className="mt-1.5">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.total > 0 ? Math.round((stats.clean / stats.total) * 100) : 0}%` }} />
                </div>
                <div className="text-[10px] text-emerald-600 font-bold mt-1">{stats.total > 0 ? Math.round((stats.clean / stats.total) * 100) : 0}% pass rate</div>
              </div>
            </div>
            {/* OOS Flags */}
            <div className="bg-white border-2 border-red-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1 flex items-center gap-1.5"><ShieldAlert size={12} /> OOS Flags</div>
              <div className="text-2xl font-black text-red-600">{stats.oos}</div>
              <div className="mt-1.5">
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${stats.total > 0 ? Math.round((stats.oos / stats.total) * 100) : 0}%` }} />
                </div>
                <div className="text-[10px] text-red-600 font-bold mt-1">{stats.total > 0 ? Math.round((stats.oos / stats.total) * 100) : 0}% OOS rate</div>
              </div>
            </div>
            {/* Total Violations */}
            <div className="bg-white border-2 border-orange-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-1 flex items-center gap-1.5"><AlertTriangle size={12} /> Total Violations</div>
              <div className="text-2xl font-black text-orange-600">{stats.totalViolations}</div>
              <div className="text-[10px] text-slate-500 mt-1.5">across all inspections</div>
            </div>
            {/* Total Points */}
            <div className={`bg-white border-2 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow ${(stats.totalPoints || 0) > 500 ? 'border-red-200' : (stats.totalPoints || 0) > 200 ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1.5"><Activity size={12} /> Total Points</div>
              <div className={`text-2xl font-black ${(stats.totalPoints || 0) > 500 ? 'text-red-600' : (stats.totalPoints || 0) > 200 ? 'text-amber-600' : 'text-slate-900'}`}>{stats.totalPoints ?? 0}</div>
              <div className="flex gap-2 mt-1.5 text-[10px] font-bold">
                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">SMS+CVOR {stats.smsCvorPoints}</span>
                <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">NSC {stats.nscPoints}</span>
              </div>
            </div>
          </div>

          {/* Filter pills row */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pr-1">Source:</span>
              {([['ALL', 'All Sources', 'bg-slate-100 text-slate-700', 'bg-blue-600 text-white border-blue-600'],
                 ['SMS', 'SMS (FMCSA)', 'bg-slate-50 text-indigo-700 border border-indigo-200', 'bg-indigo-600 text-white border-indigo-600'],
                 ['CVOR', 'CVOR', 'bg-slate-50 text-rose-700 border border-rose-200', 'bg-rose-600 text-white border-rose-600'],
                 ['NSC', 'NSC / CVSA', 'bg-slate-50 text-emerald-700 border border-emerald-200', 'bg-emerald-600 text-white border-emerald-600'],
              ] as [string, string, string, string][]).map(([key, label, idle, active]) => (
                <button key={key} onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === key ? active : idle}`}>
                  {label}
                  <span className={`ml-1.5 px-1.5 py-px rounded text-[10px] ${activeFilter === key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {key === 'ALL' ? stats.total : key === 'SMS' ? stats.sms : key === 'CVOR' ? stats.cvor : stats.nsc}
                  </span>
                </button>
              ))}
              <div className="w-px h-5 bg-slate-200 mx-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pr-1">Status:</span>
              {([['CLEAN', 'Clean', stats.clean, 'text-emerald-700 border-emerald-200', 'bg-emerald-600'],
                 ['OOS', 'OOS', stats.oos, 'text-red-700 border-red-200', 'bg-red-600'],
                 ['VEHICLE', 'Veh. Issues', stats.vehicle, 'text-orange-700 border-orange-200', 'bg-orange-500'],
                 ['DRIVER', 'HOS/Driver', stats.driver, 'text-purple-700 border-purple-200', 'bg-purple-600'],
                 ['SEVERE', 'Severe (7+)', stats.severe, 'text-amber-700 border-amber-200', 'bg-amber-500'],
              ] as [string, string, number, string, string][]).map(([key, label, count, idle, activeBg]) => (
                <button key={key} onClick={() => setActiveFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeFilter === key
                      ? `${activeBg} text-white border-transparent`
                      : `bg-slate-50 ${idle}`
                  }`}>
                  {label} <span className={`ml-1 px-1.5 py-px rounded text-[10px] ${activeFilter === key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== MAIN INSPECTION LIST ===== */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Inspections</h2>
            <InfoTooltip 
              title="Individual Events"
              text="These are single events. They apply to one specific driver and one specific vehicle being pulled over on a specific date and time by law enforcement." 
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-2">
            
            <DataListToolbar 
              searchValue={searchTerm} 
              onSearchChange={setSearchTerm} 
              searchPlaceholder="Search by ID, Driver, or Plate..." 
              columns={columns} 
              onToggleColumn={(id) => setColumns(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} 
              totalItems={filteredData.length} 
              currentPage={page} 
              rowsPerPage={rowsPerPage} 
              onPageChange={setPage} 
              onRowsPerPageChange={setRowsPerPage} 
            />

            {/* Table Header (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-1 pl-2">Date / Time</div>
              <div className="col-span-1">Source / Doc</div>
              <div className="col-span-1">Location</div>
              <div className="col-span-2">Driver / Licence</div>
              <div className="col-span-2">Unit / Vehicle</div>
              <div className="col-span-1 text-center">Violations</div>
              <div className="col-span-1 text-center">Veh Pts</div>
              <div className="col-span-1 text-center">Drv Pts</div>
              <div className="col-span-1 text-center">Carr Pts</div>
              <div className="col-span-1">Status</div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-slate-200">
              {pagedData.length > 0 ? (
                pagedData.map(entry => {
                  if (entry._source === 'NSC') {
                    return <NscOverviewRow key={entry.record.id} row={entry.record} />;
                  }
                  const isCvor = entry._source === 'CVOR';
                  const cvorOverride = isCvor
                    ? { vehPts: entry.record.cvorPoints?.vehicle ?? null, dvrPts: entry.record.cvorPoints?.driver ?? null, cvrPts: entry.record.cvorPoints?.cvor ?? 0 }
                    : undefined;
                  return (
                    <InspectionRow
                      key={entry.record.id}
                      record={entry.record}
                      onEdit={openEditModal}
                      cvorOverride={cvorOverride}
                    />
                  );
                })
              ) : (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center bg-slate-50/50">
                  <div className="bg-white border border-slate-200 p-4 rounded-full mb-4 shadow-sm">
                    <AlertCircle size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-wide">No records found</h3>
                  <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm">No inspections match your current search or filter criteria. Try clearing filters to see all records.</p>
                  <button 
                    onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                    className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors text-sm shadow-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            <PaginationBar 
              totalItems={filteredData.length} 
              currentPage={page} 
              rowsPerPage={rowsPerPage} 
              onPageChange={setPage} 
              onRowsPerPageChange={setRowsPerPage} 
            />

          </div>
        </div>

        </>)}

      </div>

      {/* ===== TAB: SMS (FMCSA) ===== */}
      {activeMainTab === 'sms' && (() => {
        const smsInspections = inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA');
        return (
        <div className="space-y-6">
          {/* Last Updated banner */}
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Info size={14} />
              <span className="font-semibold">Last Updated:</span>
              <span className="font-mono font-bold">December 15, 2025 — 3:42 PM EST</span>
            </div>
          </div>




          {/* ===== COMBINED SMS PERFORMANCE CARD ===== */}
          {(() => {
            // Period-filtered inspections
            const now = new Date('2025-12-31');
            const periodMonths = smsPeriod === '1M' ? 1 : smsPeriod === '3M' ? 3 : smsPeriod === '6M' ? 6 : smsPeriod === '12M' ? 12 : 24;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - periodMonths);
            const periodInspections = smsInspections.filter(i => new Date(i.date) >= cutoff);

            // Filter by selected basic category if not 'All'
            const relevantInspections = smsBasicCategory === 'All'
              ? periodInspections
              : periodInspections.filter(insp => insp.violations.some(v => v.category === smsBasicCategory));

            // BASIC Scores table data
            const basicScoringRows: Array<{ label: string; category: string; threshold: number }> = [
              { label: 'Unsafe Driving', category: 'Unsafe Driving', threshold: 65 },
              { label: 'Crash Indicator', category: 'Crash Indicator', threshold: 65 },
              { label: 'HOS Compliance', category: 'Hours-of-service Compliance', threshold: 65 },
              { label: 'Vehicle Maintenance', category: 'Vehicle Maintenance', threshold: 80 },
              { label: 'Controlled Substances/Alcohol', category: 'Controlled Substances', threshold: 80 },
              { label: 'HM Compliance', category: 'Hazmat compliance', threshold: 80 },
              { label: 'Driver Fitness', category: 'Driver Fitness', threshold: 80 },
            ];

            // SMS Level data
            const smsLevels = [
              { level: 'Level 1', name: 'Level I – North American Standard', desc: 'Full inspection of the driver and vehicle – includes driver credentials (CDL, medical card, HOS), vehicle mechanical fitness, cargo securement, hazmat compliance (if applicable), and all safety systems.' },
              { level: 'Level 2', name: 'Level II – Walk-Around', desc: 'Walk-around driver/vehicle inspection – covers driver credentials, HOS, seat belt use, DVIR, and an exterior examination of the vehicle without going underneath.' },
              { level: 'Level 3', name: 'Level III – Driver/Credential', desc: 'Driver-only inspection – verifies CDL, medical certificate, HOS records, seat belt compliance, DVIR, and carrier credentials. No vehicle mechanical inspection.' },
              { level: 'Level 4', name: 'Level IV – Special Inspections', desc: 'Special one-time inspection or examination – typically a single item of interest (e.g., cargo, hazmat placards, specific regulatory concern).' },
              { level: 'Level 5', name: 'Level V – Vehicle Only', desc: 'Vehicle-only inspection – conducted without the driver present. Covers all mechanical components and safety systems.' },
              { level: 'Level 6', name: 'Level VI – Transuranic Waste / Radioactive', desc: 'Enhanced NAS inspection for transuranic waste and highway-route-controlled radioactive material shipments – includes Level I items plus radiological requirements.' },
              { level: 'Level 7', name: 'Level VII – Jurisdictional Mandated', desc: 'Jurisdiction-mandated commercial vehicle inspection – covers specific items required by the state or province, including credential verification.' },
              { level: 'Level 8', name: 'Level VIII – Electronic Inspection', desc: 'Electronic inspection using wireless roadside technology – verifies driver and vehicle credentials, safety data, and compliance electronically (e.g., ELD, transponder, USDOT data).' },
            ];

            const levelStats = smsLevels.map(l => {
              const levelInsp = periodInspections.filter(i => i.level === l.level);
              const count = levelInsp.length;
              const oosCount = levelInsp.filter(i => i.hasOOS).length;
              const pct = count > 0 ? ((oosCount / count) * 100) : 0;
              return { ...l, count, oosCount, pct };
            });

            const totalInsp = levelStats.reduce((s, l) => s + l.count, 0);
            const totalOos = levelStats.reduce((s, l) => s + l.oosCount, 0);

            // ── Time-trend computation for BASIC Scores ──────────────────────
            const trendRef = new Date('2026-01-30');
            const computeWinMeasure = (category: string, fromM: number, toM: number) => {
              const wEnd = new Date(now); wEnd.setMonth(wEnd.getMonth() - fromM);
              const wStart = new Date(now); wStart.setMonth(wStart.getMonth() - toM);
              const wInsp = smsInspections.filter(i => {
                const d = new Date(i.date);
                return d >= wStart && d <= wEnd && i.violations.some((v: any) => v.category === category);
              });
              if (!wInsp.length) return 0;
              let ws = 0;
              wInsp.forEach(insp => {
                const tw = getTimeWeightTop(insp.date, trendRef);
                insp.violations.filter((v: any) => v.category === category).forEach((v: any) => { ws += (v.severity || 0) * tw; });
              });
              return Math.round((ws / wInsp.length) * 100) / 100;
            };
            const basicSparkData = basicScoringRows.map(row => {
              const s0 = computeWinMeasure(row.category, 18, 24);
              const s1 = computeWinMeasure(row.category, 12, 18);
              const s2 = computeWinMeasure(row.category, 6, 12);
              const s3 = computeWinMeasure(row.category, 0, 6);
              const prev = computeWinMeasure(row.category, periodMonths, Math.min(periodMonths * 2, 24));
              const curr = computeWinMeasure(row.category, 0, periodMonths);
              return { ...row, sparks: [s0, s1, s2, s3], prev, curr, delta: curr - prev };
            });

            // ── OOS / Top Violations ─────────────────────────────────────────
            const totalViolations2 = relevantInspections.reduce((sum, insp) => sum + insp.violations.filter(v => smsBasicCategory === 'All' || v.category === smsBasicCategory).length, 0);
            const oosViolations2 = relevantInspections.reduce((sum, insp) => sum + insp.violations.filter(v => v.oos && (smsBasicCategory === 'All' || v.category === smsBasicCategory)).length, 0);
            const nonOosViolations2 = totalViolations2 - oosViolations2;
            const oosPercent2 = totalViolations2 > 0 ? Math.round((oosViolations2 / totalViolations2) * 100) : 0;
            const nonOosPercent2 = 100 - oosPercent2;
            const circ2 = 2 * Math.PI * 32;
            const nonOosStroke2 = (nonOosPercent2 / 100) * circ2;
            const oosStroke2 = circ2 - nonOosStroke2;

            const violationMap2: Record<string, { points: number; count: number }> = {};
            relevantInspections.forEach(insp => {
              insp.violations.filter((v: any) => smsBasicCategory === 'All' || v.category === smsBasicCategory).forEach((v: any) => {
                const key = v.description.length > 36 ? v.description.substring(0, 36) + '…' : v.description;
                if (!violationMap2[key]) violationMap2[key] = { points: 0, count: 0 };
                violationMap2[key].points += v.points;
                violationMap2[key].count += 1;
              });
            });
            const topViol2 = Object.entries(violationMap2)
              .sort((a, b) => smsTopViolSort === 'POINTS' ? b[1].points - a[1].points : b[1].count - a[1].count)
              .slice(0, 6);
            const maxTopVal2 = Math.max(1, ...topViol2.map(([, d]) => smsTopViolSort === 'POINTS' ? d.points : d.count));

            // ── Monthly bar chart data ────────────────────────────────────────
            const monthMap2: Record<string, { withViol: number; withoutViol: number }> = {};
            relevantInspections.forEach(insp => {
              const d = new Date(insp.date);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              if (!monthMap2[key]) monthMap2[key] = { withViol: 0, withoutViol: 0 };
              const hasCat = smsBasicCategory === 'All' ? insp.violations.length > 0 : insp.violations.some((v: any) => v.category === smsBasicCategory);
              if (hasCat) monthMap2[key].withViol++; else monthMap2[key].withoutViol++;
            });
            const months2: string[] = [];
            const ms2 = new Date(cutoff); ms2.setDate(1);
            for (let m = new Date(ms2); m <= now; m.setMonth(m.getMonth() + 1)) {
              months2.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
            }
            const maxBarVal2 = Math.max(1, ...months2.map(m => (monthMap2[m]?.withViol || 0) + (monthMap2[m]?.withoutViol || 0)));
            const monthNames2 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

            return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

              {/* ── Dark Header ── */}
              <div className="bg-slate-800 px-5 py-3 flex items-center justify-between gap-3" id="sms-combined-period">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert size={16} className="text-white"/>
                  </div>
                  <div className="[&>p:last-child]:hidden">
                    <div className="text-sm font-bold text-white">FMCSA SMS Performance</div>
                    <div className="text-xs text-slate-400">BASIC Scores · Level Analysis · OOS Summary</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">

                  {/* Period filter */}
                  <div className="inline-flex bg-slate-700 rounded-md p-0.5">
                    {(['1M', '3M', '6M', '12M', '24M'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => {
                          const anchor = document.getElementById('sms-combined-period');
                          const top = anchor?.getBoundingClientRect().top ?? 0;
                          setSmsPeriod(p);
                          requestAnimationFrame(() => {
                            const newTop = anchor?.getBoundingClientRect().top ?? 0;
                            if (Math.abs(newTop - top) > 2) window.scrollBy(0, newTop - top);
                          });
                        }}
                        className={`px-2.5 py-1 text-xs font-bold transition-colors rounded ${smsPeriod === p ? 'bg-slate-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── BASIC Scores Table with time sparklines ── */}
              <div className="border-t border-slate-200">
                <div className="px-5 py-3 flex items-center justify-between gap-3 bg-white border-b border-slate-100 [&>span:last-of-type]:hidden">
                  <span className="text-base font-bold text-slate-700">FMCSA SMS BASIC Scores</span>
                  <div className="text-xs text-right text-slate-400 font-medium">Time-weighted · 24-month lookback</div>
                  <span className="text-[11px] text-slate-400 font-medium">Time-weighted · 24-month lookback · Sparkline = 18-24M → 12-18M → 6-12M → 0-6M</span>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-[0.14em] border-b border-slate-100">
                      <th className="px-5 py-3 text-left">BASIC Category</th>
                      <th className="px-4 py-3 text-right">Measure</th>
                      <th className="px-4 py-3 text-left" style={{ minWidth: 180 }}>Percentile</th>
                      <th className="px-4 py-3 text-right">Alert</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {basicSparkData.map((row, i) => {
                      const basicEntry = computedBasicOverview.find(b => b.category === row.category);
                      const percentile = basicEntry?.percentile ?? 'N/A';
                      const measure = basicEntry?.measure ?? '—';
                      const hasSufficientData = percentile !== 'N/A';
                      const pctNum = hasSufficientData ? parseInt(percentile) : 0;
                      const isAlert = hasSufficientData && pctNum >= row.threshold;
                      const isWarn = hasSufficientData && pctNum >= row.threshold * 0.75 && !isAlert;
                      const barColor = isAlert ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';
                      const deltaSign = row.delta > 0.05 ? '▲' : row.delta < -0.05 ? '▼' : '–';
                      const deltaCls = row.delta > 0.05 ? 'text-red-500' : row.delta < -0.05 ? 'text-emerald-600' : 'text-slate-400';
                      const isExpanded = expandedBasic === row.category;
                      const chartTab = basicChartView[row.category] ?? 'MEASURE';

                      // Bucket data by period — max 8 points (monthly ≤6M, bi-monthly 12M, quarterly 24M)
                      const mnNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                      const bucketStep = periodMonths <= 6 ? 1 : periodMonths <= 12 ? 2 : 3;
                      const numBuckets = Math.round(periodMonths / bucketStep);
                      const bubbleMonths: Array<{ label: string; date: Date; measure: number; inspCount: number; violCount: number }> = [];
                      for (let b = numBuckets - 1; b >= 0; b--) {
                        const toM = b * bucketStep;
                        const fromM = toM + bucketStep;
                        const bEnd = new Date(now); bEnd.setMonth(bEnd.getMonth() - toM + 1); bEnd.setDate(0);
                        const bStart = new Date(now); bStart.setMonth(bStart.getMonth() - fromM + 1); bStart.setDate(1);
                        const midDate = new Date(now); midDate.setMonth(midDate.getMonth() - Math.round((toM + fromM) / 2));
                        const mInsp = smsInspections.filter(insp => { const d = new Date(insp.date); return d >= bStart && d <= bEnd; });
                        const mViol = mInsp.flatMap(insp => insp.violations.filter((v: any) => v.category === row.category));
                        let ws = 0;
                        mViol.forEach((v: any) => { ws += (v.severity || 1); });
                        const mMeasure = mInsp.length > 0 ? Math.round((ws / mInsp.length) * 100) / 100 : 0;
                        const lbl = bucketStep === 1
                          ? `${mnNames[midDate.getMonth()]} ${String(midDate.getDate()).padStart(2,'0')}\n${midDate.getFullYear()}`
                          : `${mnNames[bStart.getMonth()]}–${mnNames[bEnd.getMonth()]}\n${bEnd.getFullYear()}`;
                        bubbleMonths.push({ label: lbl, date: midDate, measure: mMeasure, inspCount: mInsp.length, violCount: mViol.length });
                      }
                      const maxBubble = Math.max(1, ...bubbleMonths.map(b => b.measure));
                      const yPad = 30; const xPad = 52; const chartW = 560; const chartH = 220;
                      const yMax = Math.ceil(maxBubble * 1.3 + 0.5);
                      const yMin = -1;
                      const yTicks = [yMax, Math.round((yMax + yMin) * 0.65), Math.round((yMax + yMin) * 0.3), yMin];
                      const yScale = (v: number) => yPad + (chartH - yPad) * (1 - (v - yMin) / (yMax - yMin));
                      const xStep = bubbleMonths.length > 1 ? (chartW - xPad * 0.5) / (bubbleMonths.length - 1) : (chartW - xPad * 0.5) / 2;

                      // Monthly inspection count for INSPECTION RESULTS bar chart
                      const inspBarMax = Math.max(1, ...bubbleMonths.map(b => b.inspCount));

                      return (
                        <Fragment key={i}>
                        <tr
                          onClick={() => setExpandedBasic(isExpanded ? null : row.category)}
                          className={`group/brow cursor-pointer select-none transition-colors ${isExpanded ? 'bg-blue-50' : i % 2 === 0 ? 'bg-white hover:bg-blue-50/30' : 'bg-slate-50/20 hover:bg-blue-50/30'}`}
                        >
                          <td className="px-5 py-3 text-sm font-semibold text-slate-700">
                            <div className="flex items-center gap-2">
                              <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/></svg>
                              {row.label}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-slate-600">{measure}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                {hasSufficientData && pctNum > 0 && <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(pctNum, 100)}%` }}></div>}
                              </div>
                              <span className={`text-sm font-bold w-10 text-right ${isAlert ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-slate-500'}`}>{hasSufficientData ? percentile : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-400">{row.threshold}%</td>
                          <td className="px-5 py-3 text-center">
                            {isAlert ? <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-100 text-red-700">ALERT</span>
                              : !hasSufficientData ? <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-400">Low Data</span>
                              : <span className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-700">OK</span>}
                          </td>
                        </tr>

                        {/* ── Expanded dropdown chart ── */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={5} className="p-0 border-b border-slate-200">
                              <div className="flex border-t-2 border-blue-200 bg-white">

                                {/* Left sidebar */}
                                <div className="w-56 flex-shrink-0 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-3">
                                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold self-start ${isAlert ? 'bg-red-600 text-white' : isWarn ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                                    BASIC: {row.label.toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-slate-700 mb-2">On-Road Performance</p>
                                    <div className="space-y-1 text-xs text-slate-600">
                                      <div className="flex items-center gap-1">
                                        <span>Measure:</span>
                                        <span className="font-bold text-slate-800">{measure}</span>
                                        <span className="text-slate-400 cursor-help" title="Time-weighted violation severity per inspection">?</span>
                                      </div>
                                      <div>
                                        <span>Percentile: </span>
                                        <span className={`font-black text-base ${isAlert ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-slate-700'}`}>{hasSufficientData ? `${percentile}%` : 'N/A'}</span>
                                      </div>
                                    </div>
                                  </div>
                                  {basicEntry?.details && (
                                    <div className="text-[11px] text-blue-600 leading-relaxed">{basicEntry.details}</div>
                                  )}
                                  <div className="text-[11px] text-slate-500 space-y-0.5">
                                    <div>{bubbleMonths.reduce((s, b) => s + b.violCount, 0)} violations across {bubbleMonths.reduce((s, b) => s + b.inspCount, 0)} inspections</div>
                                    <div>{bubbleMonths.filter(b => b.violCount > 0).length} months with violations | Weighted Severity: {measure}</div>
                                  </div>
                                  {isAlert && (
                                    <div className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                                      <span className="font-bold">Investigation Results</span><br/>Alert — carrier exceeds intervention threshold
                                    </div>
                                  )}
                                  <div className="mt-auto">
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                      <span className={`font-bold ${deltaCls}`}>{deltaSign}</span>
                                      <span>{Math.abs(row.delta).toFixed(2)} vs prev period</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right chart area */}
                                <div className="flex-1 p-4 min-w-0">
                                  {/* Tab bar */}
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex gap-0">
                                      {(['MEASURE', 'INSPECTIONS'] as const).map(tab => (
                                        <button
                                          key={tab}
                                          onClick={e => { e.stopPropagation(); setBasicChartView(prev => ({ ...prev, [row.category]: tab })); }}
                                          className={`px-3 py-1.5 text-[11px] font-bold border-b-2 transition-colors ${chartTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                                        >
                                          {tab === 'MEASURE' ? 'CARRIER MEASURE OVER TIME' : 'INSPECTION RESULTS'}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {chartTab === 'MEASURE' ? (
                                    <>
                                      <p className="text-xs font-bold text-slate-700 text-center mb-0.5">CARRIER MEASURE OVER TIME</p>
                                      <p className="text-[11px] text-slate-400 text-center mb-3">Based on last {periodMonths} month{periodMonths > 1 ? 's' : ''} of on-road performance. Zero indicates best performance.</p>
                                      {/* Bubble chart */}
                                      <div className="overflow-x-auto w-full">
                                        <svg width="100%" viewBox={`0 0 ${chartW + xPad + 10} ${chartH + 50}`} style={{ minWidth: 420, display: 'block' }}>
                                          {/* Y-axis grid & labels */}
                                          {yTicks.map((tick, ti) => (
                                            <g key={ti}>
                                              <line x1={xPad} y1={yScale(tick)} x2={chartW + xPad} y2={yScale(tick)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5 4"/>
                                              <text x={xPad - 6} y={yScale(tick) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{tick}</text>
                                            </g>
                                          ))}
                                          {/* X-axis baseline */}
                                          <line x1={xPad} y1={chartH} x2={chartW + xPad} y2={chartH} stroke="#cbd5e1" strokeWidth="1.5"/>
                                          {/* Connecting dashed line */}
                                          <polyline
                                            points={bubbleMonths.map((b, bi) => `${xPad + bi * xStep},${yScale(b.measure)}`).join(' ')}
                                            fill="none" stroke="#93c5fd" strokeWidth="2" strokeDasharray="6 4"
                                          />
                                          {/* Bubbles */}
                                          {bubbleMonths.map((b, bi) => {
                                            const cx = xPad + bi * xStep;
                                            const cy = yScale(b.measure);
                                            const r = Math.max(18, Math.min(34, 18 + (b.measure / (maxBubble || 1)) * 16));
                                            const tipW = 148; const tipH = 68;
                                            const tipX = cx + r + 6 > chartW + xPad - tipW ? cx - r - tipW - 6 : cx + r + 6;
                                            const tipY = Math.max(4, cy - tipH / 2);
                                            return (
                                              <g key={bi} className="group/bubble">
                                                {/* Hit area */}
                                                <circle cx={cx} cy={cy} r={r + 6} fill="transparent"/>
                                                {/* Bubble */}
                                                <circle cx={cx} cy={cy} r={r} fill="#2563eb" opacity="0.88" className="group-hover/bubble:opacity-100 transition-opacity"/>
                                                <text x={cx} y={cy + 5} textAnchor="middle" fontSize={r > 24 ? 13 : 11} fontWeight="700" fill="white">{b.measure}</text>
                                                {/* X-axis label */}
                                                {b.label.split('\n').map((line, li) => (
                                                  <text key={li} x={cx} y={chartH + 16 + li * 13} textAnchor="middle" fontSize="10" fill="#94a3b8">{line}</text>
                                                ))}
                                                {/* Hover tooltip */}
                                                <g className="opacity-0 group-hover/bubble:opacity-100 pointer-events-none transition-opacity" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}>
                                                  <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" fill="#0f172a"/>
                                                  <text x={tipX + 10} y={tipY + 18} fontSize="11" fontWeight="700" fill="#93c5fd">{b.label.replace('\n', ' ')}</text>
                                                  <text x={tipX + 10} y={tipY + 34} fontSize="10" fill="#cbd5e1">Measure: <tspan fontWeight="700" fill="white">{b.measure}</tspan></text>
                                                  <text x={tipX + 10} y={tipY + 48} fontSize="10" fill="#cbd5e1">Inspections: <tspan fontWeight="700" fill="white">{b.inspCount}</tspan></text>
                                                  <text x={tipX + 10} y={tipY + 62} fontSize="10" fill="#cbd5e1">Violations: <tspan fontWeight="700" fill={b.violCount > 0 ? '#fca5a5' : '#86efac'}>{b.violCount}</tspan></text>
                                                </g>
                                              </g>
                                            );
                                          })}
                                        </svg>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <p className="text-xs font-bold text-slate-700 text-center mb-0.5">INSPECTION RESULTS</p>
                                      <p className="text-[11px] text-slate-400 text-center mb-3">Monthly inspection count for this BASIC category · Last {getPeriodLabel(smsPeriod)}</p>
                                      <div className="overflow-x-auto w-full">
                                        <svg width="100%" viewBox={`0 0 ${chartW + xPad + 10} ${chartH + 50}`} style={{ minWidth: 420, display: 'block' }}>
                                          {[inspBarMax, Math.round(inspBarMax / 2), 0].map((tick, ti) => {
                                            const ty = yPad + (chartH - yPad) * (1 - tick / inspBarMax);
                                            return (
                                              <g key={ti}>
                                                <line x1={xPad} y1={ty} x2={chartW + xPad} y2={ty} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="5 4"/>
                                                <text x={xPad - 6} y={ty + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{tick}</text>
                                              </g>
                                            );
                                          })}
                                          <line x1={xPad} y1={chartH} x2={chartW + xPad} y2={chartH} stroke="#cbd5e1" strokeWidth="1.5"/>
                                          {bubbleMonths.map((b, bi) => {
                                            const bW = Math.max(18, xStep * 0.52);
                                            const cx = xPad + bi * xStep;
                                            const bH = inspBarMax > 0 ? ((b.inspCount / inspBarMax) * (chartH - yPad)) : 0;
                                            const vH = b.inspCount > 0 ? ((b.violCount / b.inspCount) * bH) : 0;
                                            const tipW = 148; const tipH = 68;
                                            const tipX = cx + bW / 2 + 6 > chartW + xPad - tipW ? cx - bW / 2 - tipW - 6 : cx + bW / 2 + 6;
                                            const tipY = Math.max(4, chartH - bH - tipH - 8);
                                            return (
                                              <g key={bi} className="group/bar">
                                                {/* Clean inspections */}
                                                <rect x={cx - bW / 2} y={chartH - bH} width={bW} height={bH} fill="#bfdbfe" rx="3"/>
                                                {/* Violations overlay */}
                                                {b.violCount > 0 && <rect x={cx - bW / 2} y={chartH - vH} width={bW} height={vH} fill="#2563eb" rx="3"/>}
                                                {/* X-axis label */}
                                                {b.label.split('\n').map((line, li) => (
                                                  <text key={li} x={cx} y={chartH + 16 + li * 13} textAnchor="middle" fontSize="10" fill="#94a3b8">{line}</text>
                                                ))}
                                                {/* Hit area */}
                                                <rect x={cx - bW / 2} y={chartH - bH - 4} width={bW} height={bH + 4} fill="transparent"/>
                                                {/* Hover tooltip */}
                                                <g className="opacity-0 group-hover/bar:opacity-100 pointer-events-none transition-opacity" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }}>
                                                  <rect x={tipX} y={tipY} width={tipW} height={tipH} rx="8" fill="#0f172a"/>
                                                  <text x={tipX + 10} y={tipY + 18} fontSize="11" fontWeight="700" fill="#93c5fd">{b.label.replace('\n', ' ')}</text>
                                                  <text x={tipX + 10} y={tipY + 34} fontSize="10" fill="#cbd5e1">Total Inspections: <tspan fontWeight="700" fill="white">{b.inspCount}</tspan></text>
                                                  <text x={tipX + 10} y={tipY + 48} fontSize="10" fill="#cbd5e1">w/ Violations: <tspan fontWeight="700" fill={b.violCount > 0 ? '#fca5a5' : '#86efac'}>{b.violCount}</tspan></text>
                                                  <text x={tipX + 10} y={tipY + 62} fontSize="10" fill="#cbd5e1">Clean: <tspan fontWeight="700" fill="#86efac">{b.inspCount - b.violCount}</tspan></text>
                                                </g>
                                              </g>
                                            );
                                          })}
                                        </svg>
                                      </div>
                                      <div className="flex items-center gap-4 justify-center mt-1 text-[11px] text-slate-500">
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block"></span>w/ violations</span>
                                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block"></span>clean</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 [&>p]:hidden">
                  <div className="text-xs text-slate-400">Carrier: General · UD/CI/HOS ≥65% alert · VM/CS/HM/DF ≥80% alert · Percentile 0 = best, 100 = worst</div>
                  <p className="text-[10px] text-slate-400">Carrier: General · UD/CI/HOS ≥65% alert · VM/CS/HM/DF ≥80% alert · Percentile 0 = best, 100 = worst · ▲ worse / ▼ improving vs prev period</p>
                </div>
              </div>

              {/* ── Bento Grid: Bar Chart | OOS Donut | Top Violations | Level Comparison ── */}
              <div className="border-t border-slate-200 bg-slate-50/40 p-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Inspections Bar Chart — col-span-2 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-w-0">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Inspections by Month</p>
                      <p className="text-xs text-slate-400">Last {getPeriodLabel(smsPeriod)}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-900 inline-block"></span>w/ violations</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-200 inline-block"></span>clean</span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-end gap-2 min-h-[160px]">
                    <div className="flex flex-col justify-between h-full pr-2 text-[11px] text-slate-300 font-mono w-7 flex-shrink-0 min-h-[160px]">
                      {[maxBarVal2, Math.round(maxBarVal2/2), 0].map((v, i) => <span key={i}>{v}</span>)}
                    </div>
                    <div className="flex-1 flex items-end gap-1 h-full border-b border-l border-slate-100 relative min-h-[160px]">
                      {months2.map(m => {
                        const data = monthMap2[m] || { withViol: 0, withoutViol: 0 };
                        const hWith = maxBarVal2 > 0 ? (data.withViol / maxBarVal2) * 100 : 0;
                        const hWithout = maxBarVal2 > 0 ? (data.withoutViol / maxBarVal2) * 100 : 0;
                        const [y, mo] = m.split('-');
                        const lbl = `${monthNames2[parseInt(mo)-1]} ${y.slice(2)}`;
                        return (
                          <div key={m} className="group/col2 flex-1 flex items-end justify-center h-full relative gap-1">
                            {data.withViol > 0 && <div className="bg-blue-900/80 rounded-t-sm w-3" style={{ height: `${hWith}%`, minHeight: 4 }}></div>}
                            {data.withoutViol > 0 && <div className="bg-blue-200 rounded-t-sm w-3" style={{ height: `${hWithout}%`, minHeight: 4 }}></div>}
                            {(data.withViol > 0 || data.withoutViol > 0) && (
                              <div className="hidden group-hover/col2:block absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                <div className="bg-slate-900 text-white text-[11px] rounded-lg px-2.5 py-2 shadow-xl whitespace-nowrap">
                                  <div className="font-bold text-blue-300">{lbl}</div>
                                  <div>Violations: <b>{data.withViol}</b></div>
                                  <div>Clean: <b>{data.withoutViol}</b></div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex ml-9 mt-2">
                    {months2.length <= 6 ? months2.map((m, i) => {
                      const [, mo] = m.split('-');
                      return <div key={i} className="flex-1 text-center text-[11px] text-slate-300">{monthNames2[parseInt(mo)-1]}</div>;
                    }) : (
                      <>
                        <div className="text-[11px] text-slate-300">{monthNames2[new Date(cutoff).getMonth()]} {cutoff.getFullYear()}</div>
                        <div className="flex-1"></div>
                        <div className="text-[11px] text-slate-300">Dec 2025</div>
                      </>
                    )}
                  </div>
                </div>

                {/* OOS Donut */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-w-0">
                  <p className="text-sm font-bold text-slate-700 mb-4">Out of Service</p>
                  <div className="flex-1 flex items-center justify-center">
                  <div className="relative">
                    <svg width="120" height="120" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#e2e8f0" strokeWidth="8"/>
                      {totalViolations2 > 0 && <circle cx="40" cy="40" r="32" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray={`${nonOosStroke2} ${oosStroke2}`} strokeLinecap="round" transform="rotate(-90 40 40)"/>}
                      {oosViolations2 > 0 && <circle cx="40" cy="40" r="32" fill="none" stroke="#ef4444" strokeWidth="8" strokeDasharray={`${oosStroke2} ${nonOosStroke2}`} strokeDashoffset={-nonOosStroke2} strokeLinecap="round" transform="rotate(-90 40 40)"/>}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-slate-900">{totalViolations2}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Viol</span>
                    </div>
                  </div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500 flex-shrink-0"></div><span className="font-semibold text-slate-600">Non OOS</span></div>
                      <div className="flex items-end justify-between"><span className="text-2xl font-black text-slate-800">{nonOosPercent2}%</span><span className="text-slate-400 font-semibold">{nonOosViolations2}</span></div>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 mb-2"><div className="w-2.5 h-2.5 rounded-sm bg-red-500 flex-shrink-0"></div><span className="font-semibold text-slate-600">OOS</span></div>
                      <div className="flex items-end justify-between"><span className="text-2xl font-black text-red-600">{oosPercent2}%</span><span className="text-slate-400 font-semibold">{oosViolations2}</span></div>
                    </div>
                  </div>
                </div>

                {/* Top Violations */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-w-0">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Top Violations</p>
                      <p className="text-xs text-slate-400">Sorted by points or count</p>
                    </div>
                    <div className="inline-flex bg-slate-100 rounded-lg p-1">
                      <button onClick={() => setSmsTopViolSort('POINTS')} className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${smsTopViolSort === 'POINTS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>PTS</button>
                      <button onClick={() => setSmsTopViolSort('COUNT')} className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${smsTopViolSort === 'COUNT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>CNT</button>
                    </div>
                  </div>
                  <div className="space-y-3 flex-1">
                    {topViol2.length > 0 ? topViol2.map(([name, data], i) => {
                      const val = smsTopViolSort === 'POINTS' ? data.points : data.count;
                      const pct = maxTopVal2 > 0 ? (val / maxTopVal2) * 100 : 0;
                      return (
                        <div key={i} className="group/tv relative rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-4 flex-shrink-0">{i+1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-slate-700 truncate" title={name}>{name}</div>
                              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-slate-800 flex-shrink-0">{val}</span>
                          </div>
                        </div>
                      );
                    }) : <p className="text-sm text-slate-400 text-center py-8">No violations.</p>}
                  </div>
                </div>

              {/* ── SMS Level Comparison — Bento 2-col card grid ── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-700">SMS Inspection Levels</p>
                    <div className="text-xs text-slate-400">FMCSA Levels I-VIII · Last {getPeriodLabel(smsPeriod)} · Total: <span className="font-bold text-slate-600">{totalInsp}</span> · OOS: <span className="font-bold text-red-600">{totalOos}</span></div>
                    <p className="text-[10px] text-slate-400">FMCSA Levels I–VIII · Last {getPeriodLabel(smsPeriod)} · Total: <span className="font-bold text-slate-600">{totalInsp}</span> · OOS: <span className="font-bold text-red-600">{totalOos}</span></p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 flex-1 content-start">
                  {levelStats.map((l) => {
                    const pctColor = l.pct >= 50 ? 'text-red-600' : l.pct >= 25 ? 'text-amber-600' : 'text-emerald-600';
                    const barColor = l.pct >= 50 ? 'bg-red-500' : l.pct >= 25 ? 'bg-amber-500' : 'bg-emerald-400';
                    const dotColor = l.count > 0 ? barColor : 'bg-slate-200';
                    return (
                      <div key={l.level} className="group/lcard relative rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 hover:bg-blue-50/50 transition-colors">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}></div>
                          <div className="text-[11px] font-bold text-slate-700 truncate min-w-0 flex-1" title={l.name}>
                            {l.name.replace('Level ', 'Lvl ')}
                          </div>
                          <span className={`text-[11px] font-black tabular-nums flex-shrink-0 ${l.count > 0 ? pctColor : 'text-slate-300'}`}>{l.pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(l.pct, 100)}%` }}></div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span><span className="font-bold text-slate-600">{l.count}</span> insp</span>
                          <span><span className={`font-bold ${l.oosCount > 0 ? 'text-red-500' : 'text-slate-300'}`}>{l.oosCount}</span> OOS</span>
                        </div>
                        {/* Hover tooltip */}
                        <div className="pointer-events-none absolute z-30 right-0 bottom-full mb-1 hidden group-hover/lcard:block">
                          <div className="bg-slate-900 text-white text-[10px] rounded-lg px-2.5 py-2 shadow-xl w-48 whitespace-normal">
                            <div className="font-bold text-blue-300 mb-1">{l.name}</div>
                            <p className="text-slate-300 leading-relaxed">{l.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
            );
          })()}

          {/* ===== SECTION 3: BASIC METRICS BY STATE ===== */}
          {(() => {
            const now = new Date('2025-12-31');
            const periodMonths = smsPeriod === '1M' ? 1 : smsPeriod === '3M' ? 3 : smsPeriod === '6M' ? 6 : smsPeriod === '12M' ? 12 : 24;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - periodMonths);
            const periodInspections = smsInspections.filter(i => new Date(i.date) >= cutoff);

            const stateMap: Record<string, { inspections: number; violations: number; points: number; basics: Record<string, { inspections: number; violations: number; points: number }> }> = {};
            periodInspections.forEach(insp => {
              const st = insp.state;
              if (!stateMap[st]) stateMap[st] = { inspections: 0, violations: 0, points: 0, basics: {} };
              stateMap[st].inspections += 1;
              insp.violations.forEach(v => {
                stateMap[st].violations += 1;
                stateMap[st].points += v.points;
                const cat = v.category;
                if (!stateMap[st].basics[cat]) stateMap[st].basics[cat] = { inspections: 0, violations: 0, points: 0 };
                stateMap[st].basics[cat].violations += 1;
                stateMap[st].basics[cat].points += v.points;
              });
              // Count inspections per category
              const cats = new Set(insp.violations.map(v => v.category));
              cats.forEach(cat => {
                if (!stateMap[st].basics[cat]) stateMap[st].basics[cat] = { inspections: 0, violations: 0, points: 0 };
                stateMap[st].basics[cat].inspections += 1;
              });
            });
            const sortKey = smsMetricsView === 'INSPECTIONS' ? 'inspections' : smsMetricsView === 'VIOLATIONS' ? 'violations' : 'points';
            const stateNames: Record<string, string> = {
              'MI': 'Michigan', 'TX': 'Texas', 'OH': 'Ohio', 'NY': 'New York', 'IL': 'Illinois',
              'PA': 'Pennsylvania', 'CA': 'California', 'FL': 'Florida', 'GA': 'Georgia', 'NC': 'North Carolina',
              'IN': 'Indiana', 'NJ': 'New Jersey', 'VA': 'Virginia', 'WI': 'Wisconsin', 'MO': 'Missouri',
              'ON': 'Ontario', 'QC': 'Quebec', 'AB': 'Alberta', 'BC': 'British Columbia',
            };
            const basicCategories = ['Unsafe Driving', 'Crash Indicator', 'HOS comp.', 'Vehicle maint.', 'Cont. substances', 'Haz. materials', 'Driver fitness'];
            const basicCategoryKeys: Record<string, string[]> = {
              'Unsafe Driving': ['Unsafe Driving'],
              'Crash Indicator': ['Crash Indicator'],
              'HOS comp.': ['Hours-of-service Compliance'],
              'Vehicle maint.': ['Vehicle Maintenance'],
              'Cont. substances': ['Controlled Substances'],
              'Haz. materials': ['Hazmat compliance'],
              'Driver fitness': ['Driver Fitness'],
            };

            // Helper to get a category value for a state row
            const getCatVal = (data: typeof stateMap[string], cat: string) => {
              const keys = basicCategoryKeys[cat] || [cat];
              return keys.reduce((sum, k) => sum + ((data.basics[k] || { inspections: 0, violations: 0, points: 0 })[sortKey] || 0), 0);
            };

            // Sort rows based on metricsSort state
            const stateEntries = Object.entries(stateMap);
            const stateRows = stateEntries.sort((a, b) => {
              let aVal: number | string;
              let bVal: number | string;
              if (metricsSort.col === 'state') {
                aVal = stateNames[a[0]] || a[0];
                bVal = stateNames[b[0]] || b[0];
                return metricsSort.dir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
              } else if (metricsSort.col === 'total') {
                aVal = a[1][sortKey];
                bVal = b[1][sortKey];
              } else {
                aVal = getCatVal(a[1], metricsSort.col);
                bVal = getCatVal(b[1], metricsSort.col);
              }
              return metricsSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
            });

            const handleColSort = (col: string) => {
              setMetricsSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
            };
            const sortIcon = (col: string) => metricsSort.col === col ? (metricsSort.dir === 'desc' ? ' ↓' : ' ↑') : '';

            return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-base font-bold text-slate-900">BASIC Metrics by State <span className="text-sm font-normal text-slate-400">/ Last {smsPeriod === '24M' ? '24 Months' : smsPeriod === '12M' ? '12 Months' : smsPeriod === '6M' ? '6 Months' : smsPeriod === '3M' ? '3 Months' : '1 Month'}</span></h3>
                <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                  {(['INSPECTIONS', 'VIOLATIONS', 'POINTS'] as const).map(v => (
                    <button
                      key={v}
                      onClick={() => setSmsMetricsView(v)}
                      className={`px-3 py-1.5 text-sm font-bold transition-colors ${smsMetricsView === v ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                    >{v === 'POINTS' ? 'CSA POINTS' : v}</button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto rounded border border-slate-100">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th
                        className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 select-none transition-colors"
                        onClick={() => handleColSort('state')}
                      >State{sortIcon('state')}</th>
                      {basicCategories.map(cat => (
                        <th
                          key={cat}
                          className="px-2 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap cursor-pointer hover:text-blue-600 select-none transition-colors"
                          onClick={() => handleColSort(cat)}
                        >{cat}{sortIcon(cat)}</th>
                      ))}
                      <th
                        className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-center cursor-pointer hover:text-blue-600 select-none transition-colors"
                        onClick={() => handleColSort('total')}
                      >Total{sortIcon('total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stateRows.length > 0 ? stateRows.map(([st, data]) => (
                      <tr key={st} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-medium text-blue-600">{stateNames[st] || st}</td>
                        {basicCategories.map(cat => {
                          const val = getCatVal(data, cat);
                          return <td key={cat} className="px-2 py-2.5 text-center text-slate-700">{val}</td>;
                        })}
                        <td className="px-3 py-2.5 text-center font-bold text-slate-900">{data[sortKey]}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={basicCategories.length + 2} className="px-3 py-8 text-center text-slate-400">No inspection data available for this period.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}





          {/* CSA BASIC Status - Full Width */}
          {(() => {
            const chartCategories = ['Unsafe Driving', 'Hours-of-service Compliance', 'Vehicle Maintenance', 'Controlled Substances', 'Driver Fitness'];
            const smsInsp = inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const periodMonths = smsPeriod === '1M' ? 1 : smsPeriod === '3M' ? 3 : smsPeriod === '6M' ? 6 : smsPeriod === '12M' ? 12 : 24;
            const periodCutoff = new Date('2025-12-31');
            periodCutoff.setMonth(periodCutoff.getMonth() - periodMonths);
            const smsInspPeriod = smsInsp.filter(insp => new Date(insp.date) >= periodCutoff);

            // Use shared computed BASIC status from useMemo
            // Time weight function for expanded chart computations
            const getTimeWeight = (inspDate: string, ref: Date): number => {
              const d = new Date(inspDate);
              const diffMonths = (ref.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
              if (diffMonths <= 6) return 3;
              if (diffMonths <= 12) return 2;
              if (diffMonths <= 24) return 1;
              return 0;
            };
            const refDate = new Date('2026-01-30');
            const peerThresholds: Record<string, { p50: number; p65: number; p75: number; p80: number; p90: number; p95: number }> = {
              'Unsafe Driving':              { p50: 2.0, p65: 4.0, p75: 6.0, p80: 8.0, p90: 12.0, p95: 18.0 },
              'Hours-of-service Compliance':  { p50: 1.5, p65: 3.0, p75: 5.0, p80: 7.0, p90: 10.0, p95: 15.0 },
              'Vehicle Maintenance':          { p50: 5.0, p65: 10.0, p75: 15.0, p80: 18.0, p90: 22.0, p95: 26.0 },
              'Controlled Substances':        { p50: 0.5, p65: 1.0, p75: 2.0, p80: 3.0, p90: 5.0, p95: 8.0 },
              'Driver Fitness':               { p50: 1.0, p65: 2.0, p75: 4.0, p80: 5.0, p90: 8.0, p95: 12.0 },
              'Hazmat compliance':            { p50: 1.0, p65: 2.0, p75: 3.0, p80: 5.0, p90: 7.0, p95: 10.0 },
              'Crash Indicator':              { p50: 0.5, p65: 1.0, p75: 1.5, p80: 2.0, p90: 3.0, p95: 5.0 },
            };

            const smsBasicOverview = carrierProfile.basicStatus.map(status => {
              const cat = status.category;
              const inspWithCat = smsInspPeriod.filter(insp =>
                insp.violations.some(v => v.category === cat) && getTimeWeight(insp.date, refDate) > 0
              );
              const numInsp = inspWithCat.length;
              let totalWeightedSev = 0;
              inspWithCat.forEach(insp => {
                const tw = getTimeWeight(insp.date, refDate);
                insp.violations.filter(v => v.category === cat).forEach(v => {
                  totalWeightedSev += (v.severity || 0) * tw;
                });
              });
              const computedMeasure = numInsp > 0 ? Math.round((totalWeightedSev / numInsp) * 100) / 100 : 0;
              const peers = peerThresholds[cat];
              let computedPercentile = 'N/A';
              if (numInsp >= 3 && peers) {
                const m = computedMeasure;
                if (m >= peers.p95) computedPercentile = `${Math.min(99, 95 + Math.round((m - peers.p95) / peers.p95 * 4))}%`;
                else if (m >= peers.p90) computedPercentile = `${90 + Math.round((m - peers.p90) / (peers.p95 - peers.p90) * 5)}%`;
                else if (m >= peers.p80) computedPercentile = `${80 + Math.round((m - peers.p80) / (peers.p90 - peers.p80) * 10)}%`;
                else if (m >= peers.p75) computedPercentile = `${75 + Math.round((m - peers.p75) / (peers.p80 - peers.p75) * 5)}%`;
                else if (m >= peers.p65) computedPercentile = `${65 + Math.round((m - peers.p65) / (peers.p75 - peers.p65) * 10)}%`;
                else if (m >= peers.p50) computedPercentile = `${50 + Math.round((m - peers.p50) / (peers.p65 - peers.p50) * 15)}%`;
                else computedPercentile = `${Math.max(1, Math.round(m / peers.p50 * 50))}%`;
              }
              const isAlert = computedPercentile !== 'N/A' && parseInt(computedPercentile) >= (csaThresholds?.critical || 80);
              return {
                ...status,
                measure: computedMeasure > 0 ? computedMeasure.toString() : '0',
                percentile: computedPercentile,
                alert: isAlert,
                details: numInsp === 0 ? 'No violations'
                  : numInsp < 3 ? `< 3 inspections with violations (${numInsp} found)`
                  : `${numInsp} inspections with violations | Weighted Severity: ${totalWeightedSev}`,
              };
            });

            return (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 flex-wrap">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Gauge size={16} className="text-blue-600"/>
                </div>
                <h3 className="text-sm font-bold text-slate-900">SMS Analysis</h3>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">SMS</span>
                <InfoTooltip text="The carrier's FMCSA Safety Measurement System percentile scores based on the selected period. Click a row to expand." />
              </div>
              <div className="inline-flex bg-slate-100 rounded-md p-0.5" id="sms-analysis-period">
                {(['1M', '3M', '6M', '12M', '24M'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => {
                      const anchor = document.getElementById('sms-analysis-period');
                      const top = anchor?.getBoundingClientRect().top ?? 0;
                      setSmsPeriod(p);
                      requestAnimationFrame(() => {
                        const newTop = anchor?.getBoundingClientRect().top ?? 0;
                        if (Math.abs(newTop - top) > 2) {
                          window.scrollBy(0, newTop - top);
                        }
                      });
                    }}
                    className={`px-2.5 py-1 text-xs font-bold transition-colors ${smsPeriod === p ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-0">
              {smsBasicOverview.map((status, idx) => {
                const numericPercentile = parseInt(status.percentile) || 0;
                let alertClass = 'bg-slate-100 text-slate-600';
                let textClass = 'text-slate-700';
                let borderClass = '';
                if (status.percentile !== 'N/A') {
                    if (numericPercentile >= csaThresholds.critical) {
                        alertClass = 'bg-red-100 text-red-800';
                        textClass = 'text-red-700 font-bold';
                        borderClass = 'border-l-2 border-l-red-400 pl-3';
                    } else if (numericPercentile >= csaThresholds.warning) {
                        alertClass = 'bg-amber-100 text-amber-800';
                        textClass = 'text-amber-700 font-bold';
                        borderClass = 'border-l-2 border-l-amber-400 pl-3';
                    }
                } else if (status.alert) {
                    alertClass = 'bg-red-100 text-red-800';
                    textClass = 'text-red-700 font-bold';
                    borderClass = 'border-l-2 border-l-red-400 pl-3';
                }
                const isExpanded = expandedBasic === status.category;
                const hasCharts = chartCategories.includes(status.category);
                const chartView = basicChartView[status.category] || 'MEASURE';

                return (
                  <div key={idx} className={`border-b border-slate-50 last:border-0 ${borderClass}`}>
                    {/* Row header - clickable */}
                    <div
                      className="flex flex-col justify-center py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                      onClick={() => setExpandedBasic(isExpanded ? null : status.category)}
                    >
                      <div className="flex justify-between items-center mb-0.5">
                        <div className="flex items-center gap-2">
                          <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          <span className={`text-sm font-medium ${textClass}`}>{status.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {status.measure !== undefined && <span className="text-xs text-slate-400 font-mono">Msr: {status.measure}</span>}
                          <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{status.percentile}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 truncate pl-6" title={status.details}>{status.details}</span>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (() => {
                      // Compute from actual inspections using proper time weights
                      const inspWithCat = smsInspPeriod.filter(insp =>
                        insp.violations.some(v => v.category === status.category) && getTimeWeight(insp.date, refDate) > 0
                      );
                      const numInsp = inspWithCat.length;

                      // Breakdown by time weight bucket for tooltip
                      let tw3Sev = 0, tw3Count = 0, tw2Sev = 0, tw2Count = 0, tw1Sev = 0, tw1Count = 0;
                      inspWithCat.forEach(insp => {
                        const tw = getTimeWeight(insp.date, refDate);
                        const viols = insp.violations.filter(v => v.category === status.category);
                        const sevSum = viols.reduce((s, v) => s + (v.severity || 0), 0);
                        if (tw === 3) { tw3Sev += sevSum * 3; tw3Count += viols.length; }
                        else if (tw === 2) { tw2Sev += sevSum * 2; tw2Count += viols.length; }
                        else { tw1Sev += sevSum; tw1Count += viols.length; }
                      });
                      const totalWeightedSev = tw3Sev + tw2Sev + tw1Sev;
                      const totalViolCount = tw3Count + tw2Count + tw1Count;
                      const currentMeasure = numInsp > 0 ? Math.round((totalWeightedSev / numInsp) * 100) / 100 : 0;

                      const segLabel = numInsp > 20 ? '21+' : numInsp > 8 ? '9-21' : numInsp > 0 ? '1-8' : '0';
                      const safetyEventGroup = numInsp > 0
                        ? `${segLabel} inspections with ${status.category} violations`
                        : `No inspections with ${status.category} violations`;

                      // Dynamic measure history: compute at each monthly snapshot using proper time weights
                      const dynamicHistory: { date: string; measure: number }[] = [];
                      const histNow = new Date('2026-01-30');
                      for (let i = 5; i >= 0; i--) {
                        const snapDate = new Date(histNow);
                        snapDate.setMonth(snapDate.getMonth() - i);
                        const cutoffN = new Date(snapDate);
                        cutoffN.setMonth(cutoffN.getMonth() - periodMonths);
                        // Find inspections within selected window of this snapshot
                        const windowInsp = smsInsp.filter(insp => {
                          const id = new Date(insp.date);
                          return id >= cutoffN && id <= snapDate && insp.violations.some(v => v.category === status.category);
                        });
                        let wSev = 0;
                        windowInsp.forEach(insp => {
                          const tw = getTimeWeight(insp.date, snapDate);
                          insp.violations.filter(v => v.category === status.category).forEach(v => {
                            wSev += (v.severity || 0) * tw;
                          });
                        });
                        const msr = windowInsp.length > 0 ? Math.round((wSev / windowInsp.length) * 100) / 100 : 0;
                        dynamicHistory.push({ date: snapDate.toISOString().slice(0, 10), measure: msr });
                      }

                      return (
                      <div className="pb-4 pt-1 pl-6 pr-2">
                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                          <div className="flex items-start gap-5">
                            {/* Left: On-Road Performance info */}
                            <div className="w-56 flex-shrink-0 border-r border-slate-200 pr-4">
                              <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 mb-3 w-full">
                                <div className="bg-blue-600 text-white px-3 py-2 rounded-md w-full text-center">
                                  <div className="text-xs font-bold uppercase tracking-wider">BASIC: {status.category.length > 18 ? status.category.substring(0, 18) + '…' : status.category}</div>
                                </div>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 mb-2">On-Road Performance</h4>
                              <div className="text-sm text-slate-600 mb-1 group relative">
                                Measure: <span className="font-bold text-slate-900">{status.measure}</span>
                                <span className="ml-1 text-slate-400 cursor-help">?</span>
                                <div className="hidden group-hover:block absolute z-40 left-0 top-full mt-1 w-72 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl pointer-events-none">
                                  <div className="font-bold text-blue-300 mb-1">FMCSA SMS Measure Calculation</div>
                                  <div className="leading-relaxed text-slate-200 mb-2">
                                    <span className="font-bold">Measure = Σ(Severity × Time Weight) / Number of Inspections</span>
                                  </div>
                                  <div className="text-slate-300 mb-1.5 leading-relaxed">
                                    <span className="font-bold text-blue-300">Time Weights:</span> 3× (0-6 mo), 2× (6-12 mo), 1× (12-24 mo)
                                  </div>
                                  <div className="border-t border-slate-700 pt-1.5 mt-1.5 space-y-0.5">
                                    <div className="text-slate-400">This carrier breakdown:</div>
                                    {tw3Count > 0 && <div className="text-green-400">0-6 mo: {tw3Count} violations × TW 3 = <span className="font-bold">{tw3Sev}</span></div>}
                                    {tw2Count > 0 && <div className="text-yellow-300">6-12 mo: {tw2Count} violations × TW 2 = <span className="font-bold">{tw2Sev}</span></div>}
                                    {tw1Count > 0 && <div className="text-orange-300">12-24 mo: {tw1Count} violations × TW 1 = <span className="font-bold">{tw1Sev}</span></div>}
                                    <div className="border-t border-slate-700 pt-1 mt-1 font-bold text-white">
                                      Total: {totalWeightedSev} / {numInsp} inspections = <span className="text-blue-300">{currentMeasure}</span>
                                    </div>
                                  </div>
                                  <div className="mt-1.5 text-slate-500 text-[10px]">Lower measure = better safety performance</div>
                                  <div className="absolute bottom-full left-4 border-4 border-transparent border-b-slate-900"></div>
                                </div>
                              </div>
                              <div className="text-sm text-slate-600 mb-1">Percentile: <span className="font-bold text-slate-900">{status.percentile}</span></div>
                              <div className="text-xs text-slate-500 mb-1">Safety Event Group: {safetyEventGroup}</div>
                              <div className="text-xs text-slate-500 mb-1">{totalViolCount} violations across {numInsp} inspections</div>
                              <div className="text-xs text-slate-500 mb-3 leading-relaxed">{status.details}</div>
                              <h4 className="text-sm font-bold text-slate-800 mb-1">Investigation Results</h4>
                              <div className="text-xs text-slate-500">
                                {numericPercentile >= csaThresholds.critical
                                  ? 'Alert — carrier exceeds intervention threshold'
                                  : 'No Acute/Critical Violations Discovered'}
                              </div>
                            </div>

                            {/* Right: Chart area */}
                            <div className="flex-1 min-w-0">
                              {hasCharts ? (
                                <>
                                  {/* Chart toggle - pill style */}
                                  <div className="flex justify-center mb-4">
                                    <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setBasicChartView(prev => ({ ...prev, [status.category]: 'MEASURE' })); }}
                                        className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${chartView === 'MEASURE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >CARRIER MEASURE OVER TIME</button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setBasicChartView(prev => ({ ...prev, [status.category]: 'INSPECTIONS' })); }}
                                        className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${chartView === 'INSPECTIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                      >INSPECTION RESULTS</button>
                                    </div>
                                  </div>

                                  {chartView === 'MEASURE' ? (
                                    /* Carrier Measure Over Time - Dynamic Line chart */
                                    (() => {
                                      const history = dynamicHistory;
                                      const measures = history.map(h => h.measure);
                                      const maxMeasure = Math.max(1, ...measures) * 1.3;
                                      const minMeasure = Math.min(0, ...measures) - 1;
                                      const range = maxMeasure - minMeasure || 1;
                                      const yLabels = Array.from({ length: 6 }, (_, i) => Math.round((minMeasure + range * (1 - i / 5)) * 100) / 100);

                                      return (
                                        <div>
                                          <h4 className="text-sm font-bold text-slate-800 text-center uppercase tracking-wide mb-1">Carrier Measure Over Time</h4>
                                          <div className="text-xs text-slate-400 mb-3 text-center leading-relaxed">Based on last {periodMonths} month{periodMonths > 1 ? 's' : ''} of on-road performance. Zero indicates best performance.</div>
                                          <div className="flex items-end" style={{ height: 210 }}>
                                            <div className="flex flex-col justify-between h-full pr-2 text-xs text-slate-400 font-mono w-10 flex-shrink-0 items-end">
                                              {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                                            </div>
                                            <div className="flex-1 relative h-full border-b border-l border-slate-300">
                                              {yLabels.map((_, i) => (
                                                <div key={i} className="absolute left-0 right-0 border-t border-slate-200 border-dashed" style={{ bottom: `${(i / 5) * 100}%` }}></div>
                                              ))}
                                              {/* Connecting line */}
                                              <svg className="absolute inset-0 w-full h-full overflow-visible">
                                                <polyline
                                                  fill="none"
                                                  stroke="#94a3b8"
                                                  strokeWidth="2"
                                                  points={history.map((h, i) => {
                                                    const x = history.length > 1 ? 30 + (i / (history.length - 1)) * (100 - 60) : 50;
                                                    const y = 100 - ((h.measure - minMeasure) / range) * 100;
                                                    return `${x}%,${y}%`;
                                                  }).join(' ')}
                                                />
                                              </svg>
                                              {/* Data points */}
                                              {history.map((h, i) => {
                                                const leftPct = history.length > 1 ? 30 + (i / (history.length - 1)) * (100 - 60) : 50;
                                                const bottomPct = ((h.measure - minMeasure) / range) * 100;
                                                const prev = i > 0 ? history[i - 1].measure : h.measure;
                                                const delta = h.measure - prev;
                                                const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : '—';
                                                return (
                                                  <div key={i} className="absolute group/pt" style={{ left: `${leftPct}%`, bottom: `${bottomPct}%`, transform: 'translate(-50%, 50%)' }}>
                                                    <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                                      <span className="text-[8px] font-bold text-white">{h.measure}</span>
                                                    </div>
                                                    <div className="hidden group-hover/pt:block absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                                      <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                                        <div className="font-bold text-blue-300 mb-0.5">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                        <div>Measure: <span className="font-bold">{h.measure}</span></div>
                                                        <div>Change: <span className={`font-bold ${delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-slate-400'}`}>{deltaStr}</span></div>
                                                        <div>Percentile: <span className="font-bold">{status.percentile}</span></div>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          <div className="flex mt-2" style={{ marginLeft: 40 }}>
                                            {history.map((h, i) => {
                                              const d = new Date(h.date);
                                              return <div key={i} className="flex-1 text-center text-xs text-slate-500 font-medium">{monthNames[d.getMonth()].toUpperCase()} {d.getDate()}<br/><span className="text-slate-400 text-[10px]">{d.getFullYear()}</span></div>;
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    /* Inspection Results - Dynamic monthly bar chart */
                                    (() => {
                                      const now2 = new Date('2025-12-31');
                                      const months: string[] = [];
                                      for (let i = periodMonths - 1; i >= 0; i--) {
                                        const d = new Date(now2);
                                        d.setMonth(d.getMonth() - i);
                                        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                                      }
                                      // Count inspections with AND without violations for this BASIC per month
                                      const monthData: Record<string, { withViol: number; clean: number }> = {};
                                      smsInspPeriod.forEach(insp => {
                                        const d = new Date(insp.date);
                                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                        if (!months.includes(key)) return;
                                        if (!monthData[key]) monthData[key] = { withViol: 0, clean: 0 };
                                        if (insp.violations.some(v => v.category === status.category)) monthData[key].withViol++;
                                        else monthData[key].clean++;
                                      });
                                      const maxVal = Math.max(1, ...months.map(m => (monthData[m]?.withViol || 0) + (monthData[m]?.clean || 0)));
                                      const yLabels = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * (4 - i)));

                                      return (
                                        <div>
                                          <h4 className="text-sm font-bold text-slate-800 text-center uppercase tracking-wide mb-1">Inspection Results</h4>
                                          <div className="text-xs text-slate-400 mb-3 text-center leading-relaxed">Inspections received for this BASIC, with or without violations.</div>
                                          <div className="flex items-end" style={{ height: 210 }}>
                                            <div className="flex flex-col justify-between h-full pr-2 text-xs text-slate-400 font-mono w-8 flex-shrink-0 items-end">
                                              {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                                              <span>0</span>
                                            </div>
                                            <div className="flex-1 flex items-end gap-1 h-full border-b border-l border-slate-300 px-1 pb-0.5 relative">
                                              {yLabels.map((_, i) => (
                                                <div key={i} className="absolute left-0 right-0 border-t border-slate-200 border-dashed" style={{ bottom: `${((4 - i) / 4) * 100}%` }}></div>
                                              ))}
                                              {months.map(m => {
                                                const data = monthData[m] || { withViol: 0, clean: 0 };
                                                const total = data.withViol + data.clean;
                                                const hPct = maxVal > 0 ? (total / maxVal) * 100 : 0;
                                                const [, mo] = m.split('-');
                                                return (
                                                  <div key={m} className="group/col flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer">
                                                    <div className="flex items-end w-full justify-center" style={{ height: '100%' }}>
                                                      {total > 0 && <div className={`rounded-t-sm w-5 group-hover/col:opacity-80 transition-opacity ${data.withViol > 0 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ height: `${hPct}%`, minHeight: 4 }}></div>}
                                                    </div>
                                                    {total > 0 && (
                                                      <div className="hidden group-hover/col:block absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none">
                                                        <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                                          <div className="font-bold text-blue-300 mb-0.5">{monthNames[parseInt(mo) - 1]} {m.split('-')[0]}</div>
                                                          <div>With violations: <span className="font-bold text-amber-400">{data.withViol}</span></div>
                                                          <div>Clean: <span className="font-bold text-green-400">{data.clean}</span></div>
                                                          <div>Total: <span className="font-bold">{total}</span></div>
                                                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          <div className="flex ml-8 mt-1">
                                            {months.map((m, i) => {
                                              const [y, mo] = m.split('-');
                                              return <div key={i} className="flex-1 text-center text-[10px] text-slate-400 font-medium">{monthNames[parseInt(mo) - 1].toUpperCase()}<br/>{y}</div>;
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })()
                                  )}
                                </>
                              ) : (
                                /* Simple categories - no chart, just summary */
                                <div className="flex items-center justify-center h-32 text-sm text-slate-400">
                                  <div className="text-center">
                                    <div className="text-slate-500 font-medium mb-1">{status.category}</div>
                                    <div>{status.details}</div>
                                    <div className="mt-2 text-xs">Measure: <span className="font-mono font-bold">{status.measure}</span> | Percentile: <span className="font-mono font-bold">{status.percentile}</span></div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Threshold Legend */}
            <div className="mt-3 pt-3 border-t border-slate-100">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-slate-500"><span className="font-bold text-slate-700">{csaThresholds.warning}%</span> Warning</span>
                <span className="text-slate-500"><span className="font-bold text-red-600">{csaThresholds.critical}%</span> Critical</span>
              </div>
            </div>
          </div>
            );
          })()}

          {/* ── SMS List Time Period Filter ─────────────────────────── */}
          {(() => {
            const now2 = new Date('2025-12-31');
            // Compute cutoff for list
            const getListCutoff = () => {
              if (smsListPeriod === 'custom' && smsCustomFrom) return new Date(smsCustomFrom);
              const c = new Date(now2);
              if (smsListPeriod === '7d') c.setDate(c.getDate() - 7);
              else if (smsListPeriod === '30d') c.setDate(c.getDate() - 30);
              else if (smsListPeriod === '90d') c.setDate(c.getDate() - 90);
              else if (smsListPeriod === '6mo') c.setMonth(c.getMonth() - 6);
              else c.setMonth(c.getMonth() - 12); // 12mo default
              return c;
            };
            const listCutoff = getListCutoff();
            const listCustomTo = smsListPeriod === 'custom' && smsCustomTo ? new Date(smsCustomTo) : now2;

            const periodFilteredSms = smsInspections.filter(insp => {
              const d = new Date(insp.date);
              return d >= listCutoff && d <= listCustomTo;
            });

            const listStats = {
              total: periodFilteredSms.length,
              clean: periodFilteredSms.filter(i => i.isClean).length,
              oos: periodFilteredSms.filter(i => i.hasOOS).length,
              vehicle: periodFilteredSms.filter(i => i.hasVehicleViolations).length,
              driver: periodFilteredSms.filter(i => i.hasDriverViolations).length,
              severe: periodFilteredSms.filter(i => i.violations.some((v: any) => v.severity >= 7)).length,
            };
            const cleanPct = listStats.total > 0 ? Math.round((listStats.clean / listStats.total) * 100) : 0;
            const oosPct = listStats.total > 0 ? Math.round((listStats.oos / listStats.total) * 100) : 0;

            const listFiltered = periodFilteredSms.filter(insp => {
              const st = searchTerm.toLowerCase();
              const matchesSearch = !st || insp.id.toLowerCase().includes(st) ||
                insp.driver.toLowerCase().includes(st) ||
                insp.vehiclePlate.toLowerCase().includes(st) ||
                (insp.driverLicense && insp.driverLicense.toLowerCase().includes(st)) ||
                (insp.location?.city && insp.location.city.toLowerCase().includes(st));
              let matchesFilter = true;
              switch (activeFilter) {
                case 'CLEAN': matchesFilter = insp.isClean; break;
                case 'OOS': matchesFilter = insp.hasOOS; break;
                case 'VEHICLE': matchesFilter = insp.hasVehicleViolations; break;
                case 'DRIVER': matchesFilter = insp.hasDriverViolations; break;
                case 'SEVERE': matchesFilter = insp.violations.some((v: any) => v.severity >= 7); break;
              }
              return matchesSearch && matchesFilter;
            });

            const listPaged = listFiltered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

            const COL_DEFS = [
              { id: 'date', label: 'Date' },
              { id: 'report', label: 'Report ID' },
              { id: 'location', label: 'Location' },
              { id: 'driver', label: 'Driver' },
              { id: 'vehicle', label: 'Vehicle' },
              { id: 'violations', label: 'Violations' },
              { id: 'vehPts', label: 'Veh Pts' },
              { id: 'drvPts', label: 'Drv Pts' },
              { id: 'carrPts', label: 'Carr Pts' },
              { id: 'status', label: 'Status' },
            ];

            return (
              <div className="space-y-4">

                {/* Time Period Row */}
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center gap-3">
                  <div className="flex items-start gap-1 min-w-[160px]">
                    <div className="w-1 self-stretch rounded-full bg-blue-500 mr-1 flex-shrink-0"/>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Time Period</p>
                      <p className="text-xs text-blue-500">Global date range for all dashboard data</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    {(['7d','30d','90d','6mo','12mo'] as const).map(p => (
                      <button key={p} onClick={() => { setSmsListPeriod(p); setPage(1); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${smsListPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSmsListPeriod('custom')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md border transition-colors ${smsListPeriod === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-300 text-slate-500 hover:border-blue-400'}`}>
                      Custom
                    </button>
                    {smsListPeriod === 'custom' && (
                      <div className="flex items-center gap-2">
                        <input type="date" value={smsCustomFrom} onChange={e => setSmsCustomFrom(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-300 focus:outline-none"/>
                        <span className="text-slate-400 text-xs">–</span>
                        <input type="date" value={smsCustomTo} onChange={e => setSmsCustomTo(e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-300 focus:outline-none"/>
                      </div>
                    )}
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { key: 'ALL', label: 'Total Inspections', value: listStats.total, sub: 'all records', color: 'blue', icon: '📋' },
                    { key: 'CLEAN', label: 'Clean', value: listStats.clean, sub: `${cleanPct}% pass rate`, color: 'emerald', icon: '✓' },
                    { key: 'OOS', label: 'Out of Service', value: listStats.oos, sub: `${oosPct}% OOS rate`, color: 'red', icon: '⛔' },
                    { key: 'VEHICLE', label: 'Veh. Issues', value: listStats.vehicle, sub: 'vehicle violations', color: 'orange', icon: '🚛' },
                    { key: 'DRIVER', label: 'HOS / Driver', value: listStats.driver, sub: 'driver violations', color: 'purple', icon: '👤' },
                    { key: 'SEVERE', label: 'Severe (7+)', value: listStats.severe, sub: 'high severity', color: 'amber', icon: '⚠' },
                  ].map(kpi => {
                    const isActive = activeFilter === kpi.key;
                    const colorMap: Record<string, string> = {
                      blue: 'border-blue-200 bg-blue-50 text-blue-700',
                      emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      red: 'border-red-200 bg-red-50 text-red-700',
                      orange: 'border-orange-200 bg-orange-50 text-orange-700',
                      purple: 'border-purple-200 bg-purple-50 text-purple-700',
                      amber: 'border-amber-200 bg-amber-50 text-amber-700',
                    };
                    const activeMap: Record<string, string> = {
                      blue: 'bg-blue-600 border-blue-600 text-white',
                      emerald: 'bg-emerald-600 border-emerald-600 text-white',
                      red: 'bg-red-600 border-red-600 text-white',
                      orange: 'bg-orange-500 border-orange-500 text-white',
                      purple: 'bg-purple-600 border-purple-600 text-white',
                      amber: 'bg-amber-500 border-amber-500 text-white',
                    };
                    return (
                      <button key={kpi.key} onClick={() => { setActiveFilter(kpi.key); setPage(1); }}
                        className={`rounded-xl border p-3.5 text-left transition-all shadow-sm hover:shadow-md ${isActive ? activeMap[kpi.color] : `bg-white border-slate-200 hover:${colorMap[kpi.color]}`}`}>
                        <div className={`text-2xl font-black leading-tight ${isActive ? 'text-white' : ''}`}>{kpi.value}</div>
                        <div className={`text-xs font-bold mt-0.5 ${isActive ? 'text-white/90' : 'text-slate-700'}`}>{kpi.label}</div>
                        <div className={`text-[11px] mt-0.5 ${isActive ? 'text-white/70' : 'text-slate-400'}`}>{kpi.sub}</div>
                      </button>
                    );
                  })}
                </div>

                {/* List Table */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

                  {/* Toolbar */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative flex-1 max-w-xs">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                      <input
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                        placeholder="Search inspections..."
                        className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-300 focus:outline-none"
                      />
                    </div>
                    <span className="text-xs text-slate-400 ml-auto">
                      Showing <span className="font-bold text-slate-700">{Math.min((page - 1) * rowsPerPage + 1, listFiltered.length)}–{Math.min(page * rowsPerPage, listFiltered.length)}</span> of <span className="font-bold text-slate-700">{listFiltered.length}</span>
                    </span>
                    {/* Column picker */}
                    <div className="relative">
                      <button onClick={() => setSmsColPickerOpen(o => !o)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
                        Columns
                      </button>
                      {smsColPickerOpen && (
                        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 w-44">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Visible Columns</p>
                          {COL_DEFS.map(col => (
                            <label key={col.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                              <input type="checkbox" checked={smsVisibleCols[col.id] !== false}
                                onChange={() => setSmsVisibleCols(prev => ({ ...prev, [col.id]: prev[col.id] === false ? true : false }))}
                                className="rounded border-slate-300 text-blue-600"/>
                              <span className="text-xs text-slate-700">{col.label}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table Header */}
                  <div className="hidden md:flex items-center px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider gap-2">
                    {smsVisibleCols['date'] !== false && <div className="w-24 flex-shrink-0">Date</div>}
                    {smsVisibleCols['report'] !== false && <div className="w-28 flex-shrink-0">Report</div>}
                    {smsVisibleCols['location'] !== false && <div className="w-28 flex-shrink-0">Location</div>}
                    {smsVisibleCols['driver'] !== false && <div className="flex-1 min-w-0">Driver</div>}
                    {smsVisibleCols['vehicle'] !== false && <div className="w-28 flex-shrink-0">Vehicle</div>}
                    {smsVisibleCols['violations'] !== false && <div className="w-20 flex-shrink-0 text-center">Violations</div>}
                    {smsVisibleCols['vehPts'] !== false && <div className="w-16 flex-shrink-0 text-center">Veh Pts</div>}
                    {smsVisibleCols['drvPts'] !== false && <div className="w-16 flex-shrink-0 text-center">Drv Pts</div>}
                    {smsVisibleCols['carrPts'] !== false && <div className="w-20 flex-shrink-0 text-center">Carr Pts</div>}
                    {smsVisibleCols['status'] !== false && <div className="w-20 flex-shrink-0 text-center">Status</div>}
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100">
                    {listPaged.length > 0 ? listPaged.map(record => {
                      const vehPts = (record.violations || []).filter((v: any) => !v.driverViolation).reduce((s: number, v: any) => s + (v.points || 0), 0);
                      const drvPts = (record.violations || []).filter((v: any) => v.driverViolation).reduce((s: number, v: any) => s + (v.points || 0), 0);
                      const carrPts = vehPts + drvPts;
                      const statusColor = record.hasOOS ? 'bg-red-100 text-red-700' : record.isClean ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
                      const statusLabel = record.hasOOS ? 'OOS' : record.isClean ? 'OK' : 'DEFECT';
                      const basicCats = [...new Set((record.violations || []).map((v: any) => v.category).filter(Boolean))] as string[];
                      return (
                        <div key={record.id}
                          onClick={() => setSmsPopupRecord(record)}
                          className="flex items-center px-4 py-3 gap-2 cursor-pointer hover:bg-blue-50/40 transition-colors group">
                          {smsVisibleCols['date'] !== false && (
                            <div className="w-24 flex-shrink-0">
                              <div className="text-sm font-bold text-slate-800">{record.date?.slice(5)}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{record.startTime?.slice(0,5) || ''}</div>
                            </div>
                          )}
                          {smsVisibleCols['report'] !== false && (
                            <div className="w-28 flex-shrink-0">
                              <div className="text-xs font-bold text-blue-600 truncate">{record.id}</div>
                              <span className="inline-flex px-1.5 py-px rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 mt-0.5">SMS L{record.level?.replace(/level\s*/i,'') || '1'}</span>
                            </div>
                          )}
                          {smsVisibleCols['location'] !== false && (
                            <div className="w-28 flex-shrink-0">
                              <div className="text-xs font-semibold text-slate-700 truncate">{record.location?.city || record.state}</div>
                              <div className="text-[10px] text-slate-400">{record.state}, USA</div>
                            </div>
                          )}
                          {smsVisibleCols['driver'] !== false && (
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                                {record.driver?.charAt(0) || '?'}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">{record.driver}</div>
                                <div className="text-[10px] text-slate-400 font-mono truncate">{record.driverLicense}</div>
                              </div>
                            </div>
                          )}
                          {smsVisibleCols['vehicle'] !== false && (
                            <div className="w-28 flex-shrink-0">
                              <div className="text-xs font-bold text-slate-800">{record.vehiclePlate}</div>
                              {record.powerUnitDefects
                                ? <div className="text-[10px] text-amber-600 truncate" title={record.powerUnitDefects}>{record.powerUnitDefects.slice(0,22)}…</div>
                                : <div className="text-[10px] text-emerald-600">No defects</div>}
                            </div>
                          )}
                          {smsVisibleCols['violations'] !== false && (
                            <div className="w-20 flex-shrink-0 text-center">
                              {record.isClean
                                ? <span className="text-xs font-bold text-emerald-600">Clean</span>
                                : <div>
                                    <span className="text-sm font-black text-orange-600">{record.violations.length}</span>
                                    {basicCats.slice(0,1).map((cat: string) => (
                                      <div key={cat} className="text-[9px] text-slate-400 truncate leading-tight" title={cat}>{cat.replace('Hours-of-service','HOS').replace('Compliance','').replace('Vehicle Maintenance','Veh. Maint.').trim()}</div>
                                    ))}
                                  </div>}
                            </div>
                          )}
                          {smsVisibleCols['vehPts'] !== false && (
                            <div className="w-16 flex-shrink-0 text-center">
                              <span className={`text-sm font-bold ${vehPts > 0 ? 'text-red-600' : 'text-slate-300'}`}>{vehPts}</span>
                            </div>
                          )}
                          {smsVisibleCols['drvPts'] !== false && (
                            <div className="w-16 flex-shrink-0 text-center">
                              <span className={`text-sm font-bold ${drvPts > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{drvPts}</span>
                            </div>
                          )}
                          {smsVisibleCols['carrPts'] !== false && (
                            <div className="w-20 flex-shrink-0 text-center">
                              <span className={`text-sm font-black ${carrPts > 100 ? 'text-red-700' : carrPts > 50 ? 'text-orange-600' : carrPts > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{carrPts}</span>
                            </div>
                          )}
                          {smsVisibleCols['status'] !== false && (
                            <div className="w-20 flex-shrink-0 flex justify-center">
                              <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-bold ${statusColor}`}>{statusLabel}</span>
                            </div>
                          )}
                        </div>
                      );
                    }) : (
                      <div className="py-16 text-center">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-sm font-bold text-slate-700">No inspections found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or time period</p>
                        <button onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); setPage(1); }}
                          className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                          Clear filters
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Rows per page:</span>
                      {[10, 25, 50].map(n => (
                        <button key={n} onClick={() => { setRowsPerPage(n); setPage(1); }}
                          className={`px-2 py-1 text-xs font-bold rounded-md transition-colors ${rowsPerPage === n ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                      </button>
                      {Array.from({ length: Math.ceil(listFiltered.length / rowsPerPage) }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === Math.ceil(listFiltered.length / rowsPerPage) || Math.abs(p - page) <= 1)
                        .reduce<Array<number | '...'>>((acc, p, idx, arr) => {
                          if (idx > 0 && typeof arr[idx-1] === 'number' && (p as number) - (arr[idx-1] as number) > 1) acc.push('...');
                          acc.push(p); return acc;
                        }, [])
                        .map((p, idx) => p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs">…</span>
                        ) : (
                          <button key={p} onClick={() => setPage(p as number)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${page === p ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                            {p}
                          </button>
                        ))
                      }
                      <button onClick={() => setPage(p => Math.min(Math.ceil(listFiltered.length / rowsPerPage), p + 1))} disabled={page >= Math.ceil(listFiltered.length / rowsPerPage)}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Inspection Detail Popup ───────────────────────────────── */}
                {smsPopupRecord && (() => {
                  const r = smsPopupRecord;
                  const vehPtsP = (r.violations || []).filter((v: any) => !v.driverViolation).reduce((s: number, v: any) => s + (v.points || 0), 0);
                  const drvPtsP = (r.violations || []).filter((v: any) => v.driverViolation).reduce((s: number, v: any) => s + (v.points || 0), 0);
                  const carrPtsP = vehPtsP + drvPtsP;
                  const maxSev = (r.violations || []).reduce((m: number, v: any) => Math.max(m, v.severity || 0), 0);
                  const avgSev = r.violations?.length ? (r.violations.reduce((s: number, v: any) => s + (v.severity || 0), 0) / r.violations.length).toFixed(1) : '0';
                  const oosViolations = (r.violations || []).filter((v: any) => v.oos);
                  const driverPassed = !r.hasDriverViolations;
                  const vehiclePassed = !r.hasVehicleViolations;
                  const locationStr = r.location?.city ? `${r.location.city}, ${r.state}` : `${r.state}, USA`;
                  const levelNum = r.level?.replace(/level\s*/i, '') || '1';
                  return (
                    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-4 px-4" onClick={() => setSmsPopupRecord(null)}>
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
                      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                        {/* ── Header ── */}
                        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-black text-slate-900">Inspection Detail — {r.id}</h2>
                              <p className="text-sm text-slate-500 mt-0.5">{r.date} • Level {levelNum} • {locationStr}</p>
                            </div>
                            <button onClick={() => setSmsPopupRecord(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        </div>

                        <div className="overflow-y-auto flex-1">

                          {/* ── Info 3-col grid ── */}
                          <div className="grid grid-cols-3 gap-6 px-6 py-5 border-b border-slate-100">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</p>
                              <p className="text-sm font-bold text-slate-900">{r.driver}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">License</p>
                              <p className="text-sm font-bold text-slate-900 font-mono">{r.driverLicense || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</p>
                              <span className="inline-flex px-2.5 py-1 bg-slate-100 text-slate-800 text-sm font-bold rounded-lg border border-slate-200">{r.vehiclePlate}</span>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</p>
                              <p className="text-sm font-semibold text-slate-800">{locationStr}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time</p>
                              <p className="text-sm font-semibold text-slate-800">
                                {r.startTime ? `${r.startTime}${r.endTime ? ` — ${r.endTime}` : ''}` : '—'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity Rate</p>
                              <p className={`text-sm font-black ${maxSev >= 7 ? 'text-red-600' : maxSev >= 4 ? 'text-amber-600' : 'text-slate-800'}`}>{avgSev}</p>
                            </div>
                          </div>

                          {/* ── Status badges ── */}
                          <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-100">
                            {!r.isClean && <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-400 text-amber-700 bg-amber-50">VIOLATIONS FOUND</span>}
                            {r.isClean && <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-400 text-emerald-700 bg-emerald-50">✓ CLEAN</span>}
                            {r.hasOOS && <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border border-red-400 text-red-700 bg-red-50">OOS</span>}
                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border ${driverPassed ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-red-300 text-red-700 bg-red-50'}`}>
                              DRIVER: {driverPassed ? 'PASSED' : 'FAILED'}
                            </span>
                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border ${vehiclePassed ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-red-300 text-red-700 bg-red-50'}`}>
                              VEHICLE: {vehiclePassed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>

                          {/* ── Defects Found ── */}
                          {r.powerUnitDefects && (
                            <div className="mx-6 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5">Defects Found</p>
                              <p className="text-sm text-slate-700"><span className="font-semibold">Power Unit:</span> {r.powerUnitDefects}</p>
                              {r.trailerDefects && <p className="text-sm text-slate-700 mt-0.5"><span className="font-semibold">Trailer:</span> {r.trailerDefects}</p>}
                            </div>
                          )}

                          {/* ── Units Inspected ── */}
                          {r.units && r.units.length > 0 && (
                            <div className="px-6 pb-4">
                              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Units Inspected ({r.units.length})</p>
                              <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      {['Type','Make','License','VIN'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {r.units.map((u: any, ui: number) => (
                                      <tr key={ui} className="hover:bg-slate-50/60">
                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 capitalize">{u.type || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-blue-600">{u.make || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-slate-800">{u.license || '—'}</td>
                                        <td className="px-3 py-2.5 text-[11px] font-mono text-slate-400">{u.vin || '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* ── Violations table ── */}
                          <div className="px-6 pb-4">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Violations ({r.violations?.length || 0})
                            </p>
                            {r.isClean || !r.violations?.length ? (
                              <div className="flex items-center gap-3 py-6 px-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-black text-lg">✓</div>
                                <div>
                                  <p className="font-bold text-sm text-emerald-800">No violations recorded</p>
                                  <p className="text-xs text-emerald-600 mt-0.5">This inspection passed without any defects</p>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-blue-600 uppercase tracking-wider">Code</th>
                                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Severity</th>
                                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Points</th>
                                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">OOS</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(r.violations || []).map((v: any, vi: number) => (
                                      <tr key={vi} className={`${v.oos ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/60'} transition-colors`}>
                                        <td className="px-3 py-2.5 font-mono text-xs text-blue-600 font-bold whitespace-nowrap">{v.code || v.violationCode || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{v.category || '—'}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-700 leading-snug">{v.description}</td>
                                        <td className="px-3 py-2.5 text-center">
                                          <span className={`text-xs font-bold ${v.severity >= 7 ? 'text-red-600' : v.severity >= 4 ? 'text-amber-500' : v.severity > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                                            {v.severity ?? 0}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                          <span className={`text-xs font-bold ${v.points > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{v.points ?? 0}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                          {v.oos
                                            ? <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white">OOS</span>
                                            : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* ── SMS Points ── */}
                          <div className="mx-6 mb-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SMS Points</p>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-slate-600">Vehicle: <span className={`font-black text-base ml-1 ${vehPtsP > 0 ? 'text-red-600' : 'text-slate-400'}`}>{vehPtsP}</span></span>
                              <span className="text-slate-600">Driver: <span className={`font-black text-base ml-1 ${drvPtsP > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{drvPtsP}</span></span>
                              <span className="text-slate-600">Carrier: <span className={`font-black text-base ml-1 ${carrPtsP > 100 ? 'text-red-700' : carrPtsP > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{carrPtsP}</span></span>
                            </div>
                          </div>

                          {/* ── Attached Documents ── */}
                          <div className="px-6 pb-6">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Attached Documents ({1 + oosViolations.length})
                            </p>
                            <div className="space-y-2">
                              {/* Main report */}
                              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800">Inspection Report — {r.id}</p>
                                  <p className="text-[11px] text-slate-500">Level {levelNum} · {r.date} · {locationStr}</p>
                                </div>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors flex-shrink-0">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                  PDF
                                </button>
                              </div>
                              {/* Per-OOS-violation docs */}
                              {oosViolations.map((v: any, vi: number) => (
                                <div key={vi} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                                  <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center flex-shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-bold text-slate-800">Violation: {v.code || v.violationCode || `#${vi + 1}`}</p>
                                      <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white">OOS</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate">{v.category} — {v.description}</p>
                                  </div>
                                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 text-xs font-bold hover:bg-red-600 hover:text-white transition-colors flex-shrink-0">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                    PDF
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            );
          })()}

        </div>
        );
      })()}

      {/* ===== TAB: CVOR (Canadian) ===== */}
      {activeMainTab === 'cvor' && (() => {
        const cvorInspections = inspectionsData.filter(i => getJurisdiction(i.state) === 'CVOR');
        const cvorStats = {
          total: cvorInspections.length,
          clean: cvorInspections.filter(i => i.isClean).length,
          oos: cvorInspections.filter(i => i.hasOOS).length,
          vehicle: cvorInspections.filter(i => i.hasVehicleViolations).length,
          driver: cvorInspections.filter(i => i.hasDriverViolations).length,
          severe: cvorInspections.filter(i => i.violations.some(v => v.severity >= 7)).length,
        };
        const cvorFilteredData = cvorInspections.filter(insp => {
          const st = searchTerm.toLowerCase();
          const matchesSearch = insp.id.toLowerCase().includes(st) ||
            insp.driver.toLowerCase().includes(st) ||
            insp.vehiclePlate.toLowerCase().includes(st) ||
            (insp.driverLicense && insp.driverLicense.toLowerCase().includes(st)) ||
            (insp.location?.city && insp.location.city.toLowerCase().includes(st)) ||
            (insp.location?.raw && insp.location.raw.toLowerCase().includes(st));
          let matchesFilter = true;
          switch(activeFilter) {
            case 'CLEAN': matchesFilter = insp.isClean; break;
            case 'OOS': matchesFilter = insp.hasOOS; break;
            case 'VEHICLE': matchesFilter = insp.hasVehicleViolations; break;
            case 'DRIVER': matchesFilter = insp.hasDriverViolations; break;
            case 'SEVERE': matchesFilter = insp.violations.some(v => v.severity >= 7); break;
            default: matchesFilter = true;
          }
          return matchesSearch && matchesFilter;
        });
        const cvorPagedData = cvorFilteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

        const cvorRating = carrierProfile.cvorAnalysis.rating;
        let overallRatingClass = 'bg-green-100 text-green-800';
        let overallRatingLabel = 'OK';
        if (cvorRating >= cvorThresholds.showCause) { overallRatingClass = 'bg-red-100 text-red-800'; overallRatingLabel = 'CRITICAL'; }
        else if (cvorRating >= cvorThresholds.intervention) { overallRatingClass = 'bg-amber-100 text-amber-800'; overallRatingLabel = 'HIGH'; }
        else if (cvorRating >= cvorThresholds.warning) { overallRatingClass = 'bg-yellow-100 text-yellow-800'; overallRatingLabel = 'ALERT'; }
        // CVOR rating criteria for the Safety Rating card: Conditional starts at 70%.
        const cvorSafetyStatus = cvorRating >= 70 ? 'CONDITIONAL' : 'OK';
        const cvorSafetyStatusClass = cvorRating >= 70
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-green-100 text-green-800 border-green-200';

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const renderCvorAnalysisRow = (key: string, label: string, val: number, detail: string, weight: number) => {
          let alertClass = 'bg-green-100 text-green-800';
          let rowLabel = 'OK';
          let textClass = 'text-slate-700';
          let borderClass = '';
          if (val >= cvorThresholds.showCause) { alertClass = 'bg-red-100 text-red-800'; rowLabel = 'Show Cause'; textClass = 'text-red-700 font-bold'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
          else if (val >= cvorThresholds.intervention) { alertClass = 'bg-amber-100 text-amber-800'; rowLabel = 'Audit'; textClass = 'text-amber-700 font-bold'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
          else if (val >= cvorThresholds.warning) { alertClass = 'bg-yellow-100 text-yellow-800'; rowLabel = 'Warning'; textClass = 'text-yellow-700 font-bold'; borderClass = 'border-l-2 border-l-amber-300 pl-3'; }
          const isExpanded = expandedCvorAnalysis === key;
          const chartView = cvorAnalysisChartView[key] || 'MEASURE';

          // Period-filtered CVOR inspections
          const now = new Date('2025-12-31');
          const periodMonths = cvorPeriod === '1M' ? 1 : cvorPeriod === '3M' ? 3 : cvorPeriod === '6M' ? 6 : cvorPeriod === '12M' ? 12 : 24;
          const cutoff = new Date(now);
          cutoff.setMonth(cutoff.getMonth() - periodMonths);
          const periodInsp = cvorInspections.filter(i => new Date(i.date) >= cutoff);

          // Category-specific stats — computed dynamically from period-filtered data
          let catInspCount = 0;
          let totalPoints = 0;
          let oosCount = 0;
          let violationCount = 0;
          let cleanCount = 0;

          const collisionCategories = ['Vehicle Maintenance', 'Hazmat compliance'];
          const convictionCategories = ['Unsafe Driving', 'Hours-of-service Compliance', 'Driver Fitness', 'Controlled Substances'];

          if (key === 'collisions') {
            // Count inspections that have collision-related violations
            const relevantInsp = periodInsp.filter(i => i.violations.some(v => collisionCategories.includes(v.category)));
            catInspCount = relevantInsp.length;
            totalPoints = relevantInsp.reduce((s, i) => s + i.violations.filter(v => collisionCategories.includes(v.category)).reduce((ps, v) => ps + (v.points || 0), 0), 0);
            violationCount = relevantInsp.reduce((s, i) => s + i.violations.filter(v => collisionCategories.includes(v.category)).length, 0);
            oosCount = relevantInsp.filter(i => i.hasOOS).length;
            cleanCount = periodInsp.filter(i => !i.violations.some(v => collisionCategories.includes(v.category))).length;
          } else if (key === 'convictions') {
            const relevantInsp = periodInsp.filter(i => i.violations.some(v => convictionCategories.includes(v.category)));
            catInspCount = relevantInsp.length;
            totalPoints = relevantInsp.reduce((s, i) => s + i.violations.filter(v => convictionCategories.includes(v.category)).reduce((ps, v) => ps + (v.points || 0), 0), 0);
            violationCount = relevantInsp.reduce((s, i) => s + i.violations.filter(v => convictionCategories.includes(v.category)).length, 0);
            oosCount = relevantInsp.filter(i => i.hasOOS).length;
            cleanCount = periodInsp.filter(i => !i.violations.some(v => convictionCategories.includes(v.category))).length;
          } else if (key === 'inspections') {
            catInspCount = periodInsp.length;
            oosCount = periodInsp.filter(i => i.hasOOS).length;
            violationCount = periodInsp.reduce((s, i) => s + i.violations.length, 0);
            totalPoints = periodInsp.reduce((s, i) => s + i.violations.reduce((ps, v) => ps + (v.points || 0), 0), 0);
            cleanCount = periodInsp.filter(i => i.isClean).length;
          }
          const oosRate = catInspCount > 0 ? Math.round((oosCount / catInspCount) * 100) : 0;

          // Monthly measure history — rolling window approach (same as SMS chart)
          // Each snapshot computes total points / inspections over a rolling periodMonths window
          // As older data drops off and newer data comes in, the measure changes → dynamic chart
          const measureHistory: { date: string; measure: number }[] = [];
          const histNow = new Date('2025-12-31');
          for (let i = 5; i >= 0; i--) {
            const snapDate = new Date(histNow);
            snapDate.setMonth(snapDate.getMonth() - i);
            const snapCutoff = new Date(snapDate);
            snapCutoff.setMonth(snapCutoff.getMonth() - periodMonths);

            // All CVOR inspections within this rolling window
            const windowInsp = cvorInspections.filter(insp => {
              const d = new Date(insp.date);
              return d >= snapCutoff && d <= snapDate;
            });

            let pts = 0;
            let relevantInspCount = 0;
            if (key === 'collisions') {
              const relevant = windowInsp.filter(insp => insp.violations.some(v => collisionCategories.includes(v.category)));
              relevantInspCount = relevant.length;
              relevant.forEach(insp => {
                pts += insp.violations.filter(v => collisionCategories.includes(v.category)).reduce((s, v) => s + (v.points || 0), 0);
              });
            } else if (key === 'convictions') {
              const relevant = windowInsp.filter(insp => insp.violations.some(v => convictionCategories.includes(v.category)));
              relevantInspCount = relevant.length;
              relevant.forEach(insp => {
                pts += insp.violations.filter(v => convictionCategories.includes(v.category)).reduce((s, v) => s + (v.points || 0), 0);
              });
            } else {
              // inspections key: measure = total points / total inspections
              relevantInspCount = windowInsp.length;
              windowInsp.forEach(insp => {
                pts += insp.violations.reduce((s, v) => s + (v.points || 0), 0);
              });
            }
            // Measure = total points / relevant inspections (like SMS weighted severity / inspections)
            const msr = relevantInspCount > 0 ? Math.round((pts / relevantInspCount) * 100) / 100 : 0;
            measureHistory.push({ date: snapDate.toISOString().slice(0, 10), measure: msr });
          }

          return (
            <div key={key} className={`border-b border-slate-50 last:border-0 ${borderClass}`}>
              <div
                className="flex flex-col justify-center py-2.5 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedCvorAnalysis(isExpanded ? null : key)}
              >
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-2">
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    <span className={`text-sm font-medium ${textClass}`}>{label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">Weight: <span className="font-mono font-semibold text-slate-500">{weight}%</span></span>
                    <span className="text-xs text-slate-400">Overall Contribution: <span className="font-mono font-semibold text-slate-500">{val.toFixed(2)}%</span></span>
                    <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{rowLabel}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 pl-6">{detail}</span>
              </div>

              {isExpanded && (
                <div className="pb-4 pt-1 pl-6 pr-2">
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start gap-5">
                      {/* Left: Info Panel */}
                      <div className="w-64 flex-shrink-0 border-r border-slate-200 pr-4">
                        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 mb-3 w-full">
                          <div className="bg-red-600 text-white px-3 py-2 rounded-md w-full text-center">
                            <div className="text-xs font-bold uppercase tracking-wider">CVOR: {label}</div>
                          </div>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mb-2">Performance Summary</h4>

                        {/* CVOR Performance Table */}
                        <div className="rounded-md border border-slate-200 overflow-hidden mb-3">
                          <table className="w-full text-xs">
                            <tbody className="divide-y divide-slate-100">
                              <tr className="bg-slate-50">
                                <td className="px-2 py-1.5 text-slate-500">% of set Threshold</td>
                                <td className="px-2 py-1.5 text-right font-bold text-slate-800">{(val / (weight / 100)).toFixed(2)}%</td>
                              </tr>
                              <tr>
                                <td className="px-2 py-1.5 text-slate-500">% Weight</td>
                                <td className="px-2 py-1.5 text-right font-bold text-slate-800">{weight}%</td>
                              </tr>
                              <tr className="bg-slate-50">
                                <td className="px-2 py-1.5 text-slate-500">% Overall Contribution</td>
                                <td className="px-2 py-1.5 text-right font-bold text-slate-800">{val.toFixed(2)}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-1.5 mb-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">{key === 'inspections' ? 'Total Inspections' : key === 'collisions' ? 'Total Collisions' : 'Total Convictions'}</span>
                            <span className="font-bold text-slate-800">{catInspCount}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Violations Found</span>
                            <span className="font-bold text-slate-800">{violationCount}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Total Points</span>
                            <span className="font-bold text-slate-800">{totalPoints}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Out-of-Service</span>
                            <span className={`font-bold ${oosCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>{oosCount}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">OOS Rate</span>
                            <span className={`font-bold ${oosRate >= 30 ? 'text-red-600' : oosRate >= 15 ? 'text-amber-600' : 'text-emerald-600'}`}>{oosRate}%</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Clean Inspections</span>
                            <span className="font-bold text-emerald-600">{cleanCount}</span>
                          </div>
                        </div>

                        {key === 'inspections' && (
                          <div className="rounded-md border border-slate-200 overflow-hidden mb-3">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-2 py-1.5 text-left text-slate-500 font-semibold">Type</th>
                                  <th className="px-2 py-1.5 text-center text-slate-500 font-semibold">Carrier %</th>
                                  <th className="px-2 py-1.5 text-center text-slate-500 font-semibold">Threshold</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                <tr>
                                  <td className="px-2 py-1.5 text-slate-700">Overall OOS</td>
                                  <td className={`px-2 py-1.5 text-center font-bold ${carrierProfile.cvorAnalysis.counts.oosOverall > cvorOosThresholds.overall ? 'text-red-600' : 'text-slate-800'}`}>{carrierProfile.cvorAnalysis.counts.oosOverall}%</td>
                                  <td className="px-2 py-1.5 text-center text-slate-500">{cvorOosThresholds.overall}%</td>
                                </tr>
                                <tr className="bg-slate-50">
                                  <td className="px-2 py-1.5 text-slate-700">Vehicle OOS</td>
                                  <td className={`px-2 py-1.5 text-center font-bold ${carrierProfile.cvorAnalysis.counts.oosVehicle > cvorOosThresholds.vehicle ? 'text-red-600' : 'text-slate-800'}`}>{carrierProfile.cvorAnalysis.counts.oosVehicle}%</td>
                                  <td className="px-2 py-1.5 text-center text-slate-500">{cvorOosThresholds.vehicle}%</td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-1.5 text-slate-700">Driver OOS</td>
                                  <td className={`px-2 py-1.5 text-center font-bold ${carrierProfile.cvorAnalysis.counts.oosDriver > cvorOosThresholds.driver ? 'text-red-600' : 'text-slate-800'}`}>{carrierProfile.cvorAnalysis.counts.oosDriver}%</td>
                                  <td className="px-2 py-1.5 text-center text-slate-500">{cvorOosThresholds.driver}%</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        <h4 className="text-sm font-bold text-slate-800 mb-1">Threshold Status</h4>
                        <div className="text-xs text-slate-500">
                          {val >= cvorThresholds.showCause
                            ? 'Show Cause — exceeds show cause threshold'
                            : val >= cvorThresholds.intervention
                            ? 'Audit — carrier exceeds intervention threshold'
                            : val >= cvorThresholds.warning
                            ? 'Warning — approaching intervention threshold'
                            : 'OK — within acceptable range'}
                        </div>
                      </div>

                      {/* Right: Chart */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-center mb-4">
                          <div className="inline-flex bg-slate-100 rounded-lg p-1 gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); setCvorAnalysisChartView(prev => ({ ...prev, [key]: 'MEASURE' })); }}
                              className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${chartView === 'MEASURE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >CARRIER MEASURE OVER TIME</button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setCvorAnalysisChartView(prev => ({ ...prev, [key]: 'INSPECTIONS' })); }}
                              className={`px-4 py-1.5 text-xs font-bold transition-all rounded-md ${chartView === 'INSPECTIONS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >INSPECTION RESULTS</button>
                          </div>
                        </div>

                        {chartView === 'MEASURE' ? (() => {
                          const history = measureHistory;
                          const measures = history.map(h => h.measure);
                          const maxMeasure = Math.max(1, ...measures) * 1.3;
                          const minMeasure = Math.min(0, ...measures) - 1;
                          const range = maxMeasure - minMeasure || 1;
                          const yLabels = Array.from({ length: 6 }, (_, i) => Math.round((minMeasure + range * (1 - i / 5)) * 100) / 100);

                          return (
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 text-center uppercase tracking-wide mb-1">Carrier Measure Over Time</h4>
                              <div className="text-xs text-slate-400 mb-3 text-center leading-relaxed">Based on last {periodMonths} month{periodMonths > 1 ? 's' : ''} of on-road performance. Zero indicates best performance.</div>
                              <div className="flex items-end" style={{ height: 210 }}>
                                <div className="flex flex-col justify-between h-full pr-2 text-xs text-slate-400 font-mono w-10 flex-shrink-0 items-end">
                                  {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                                </div>
                                <div className="flex-1 relative h-full border-b border-l border-slate-300">
                                  {yLabels.map((_, i) => (
                                    <div key={i} className="absolute left-0 right-0 border-t border-slate-200 border-dashed" style={{ bottom: `${(i / 5) * 100}%` }}></div>
                                  ))}
                                  {/* Connecting line */}
                                  <svg className="absolute inset-0 w-full h-full overflow-visible">
                                    <polyline
                                      fill="none"
                                      stroke="#94a3b8"
                                      strokeWidth="2"
                                      points={history.map((h, i) => {
                                        const x = history.length > 1 ? 30 + (i / (history.length - 1)) * (100 - 60) : 50;
                                        const y = 100 - ((h.measure - minMeasure) / range) * 100;
                                        return `${x}%,${y}%`;
                                      }).join(' ')}
                                    />
                                  </svg>
                                  {/* Data points */}
                                  {history.map((h, i) => {
                                    const leftPct = history.length > 1 ? 30 + (i / (history.length - 1)) * (100 - 60) : 50;
                                    const bottomPct = ((h.measure - minMeasure) / range) * 100;
                                    const prev = i > 0 ? history[i - 1].measure : h.measure;
                                    const delta = h.measure - prev;
                                    const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : '—';
                                    return (
                                      <div key={i} className="absolute group/pt" style={{ left: `${leftPct}%`, bottom: `${bottomPct}%`, transform: 'translate(-50%, 50%)' }}>
                                        <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                                          <span className="text-[8px] font-bold text-white">{h.measure}</span>
                                        </div>
                                        <div className="hidden group-hover/pt:block absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                          <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                            <div className="font-bold text-blue-300 mb-0.5">{new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                            <div>Measure: <span className="font-bold">{h.measure}</span></div>
                                            <div>Change: <span className={`font-bold ${delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-slate-400'}`}>{deltaStr}</span></div>
                                            <div>Score: <span className="font-bold">{val.toFixed(2)}%</span></div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex mt-2" style={{ marginLeft: 40 }}>
                                {history.map((h, i) => {
                                  const d = new Date(h.date);
                                  return <div key={i} className="flex-1 text-center text-xs text-slate-500 font-medium">{monthNames[d.getMonth()].toUpperCase()} {d.getDate()}<br/><span className="text-slate-400 text-[10px]">{d.getFullYear()}</span></div>;
                                })}
                              </div>
                            </div>
                          );
                        })() : (() => {
                          // Inspection Results - monthly bar chart, capped to 12 months for readability
                          const barMonthCount = Math.min(periodMonths, 12);
                          const months: string[] = [];
                          for (let i = barMonthCount - 1; i >= 0; i--) {
                            const d = new Date(now);
                            d.setMonth(d.getMonth() - i);
                            months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                          }
                          const monthData: Record<string, { withViol: number; clean: number }> = {};
                          periodInsp.forEach(insp => {
                            const d = new Date(insp.date);
                            const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                            if (!months.includes(mk)) return;
                            if (!monthData[mk]) monthData[mk] = { withViol: 0, clean: 0 };
                            if (insp.violations.length > 0) monthData[mk].withViol++;
                            else monthData[mk].clean++;
                          });
                          const maxVal = Math.max(1, ...months.map(m => (monthData[m]?.withViol || 0) + (monthData[m]?.clean || 0)));
                          const yLabels = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * (4 - i)));

                          return (
                            <div>
                              <h4 className="text-sm font-bold text-slate-800 text-center uppercase tracking-wide mb-1">Inspection Results</h4>
                              <div className="text-xs text-slate-400 mb-3 text-center leading-relaxed">Monthly inspections with and without violations.</div>
                              <div className="flex items-end" style={{ height: 210 }}>
                                <div className="flex flex-col justify-between h-full pr-2 text-xs text-slate-400 font-mono w-8 flex-shrink-0 items-end">
                                  {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                                  <span>0</span>
                                </div>
                                <div className="flex-1 flex items-end gap-1 h-full border-b border-l border-slate-300 px-1 pb-0.5 relative">
                                  {yLabels.map((_, i) => (
                                    <div key={i} className="absolute left-0 right-0 border-t border-slate-200 border-dashed" style={{ bottom: `${((4 - i) / 4) * 100}%` }}></div>
                                  ))}
                                  {months.map(m => {
                                    const data = monthData[m] || { withViol: 0, clean: 0 };
                                    const total = data.withViol + data.clean;
                                    const hPct = maxVal > 0 ? (total / maxVal) * 100 : 0;
                                    const [yr, mo] = m.split('-');
                                    return (
                                      <div key={m} className="group/col flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer">
                                        <div className="flex items-end w-full justify-center" style={{ height: '100%' }}>
                                          <div className="relative w-full max-w-[18px]" style={{ height: `${hPct}%` }}>
                                            {data.withViol > 0 && <div className="absolute bottom-0 left-0 right-0 bg-red-400 rounded-t" style={{ height: `${total > 0 ? (data.withViol / total) * 100 : 0}%` }}></div>}
                                            {data.clean > 0 && <div className="absolute top-0 left-0 right-0 bg-blue-400 rounded-t" style={{ height: `${total > 0 ? (data.clean / total) * 100 : 0}%` }}></div>}
                                          </div>
                                        </div>
                                        <div className="text-[9px] text-slate-500 mt-1 whitespace-nowrap">{monthNames[parseInt(mo) - 1]}<br/><span className="text-[8px] text-slate-400">{yr}</span></div>
                                        <div className="hidden group-hover/col:block absolute z-40 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                          <div className="bg-slate-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                            <div className="font-bold text-blue-300 mb-0.5">{monthNames[parseInt(mo) - 1]} {yr}</div>
                                            <div>With violations: <span className="font-bold text-red-400">{data.withViol}</span></div>
                                            <div>Clean: <span className="font-bold text-blue-400">{data.clean}</span></div>
                                            <div>Total: <span className="font-bold">{total}</span></div>
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-400 rounded"></div> With Violations</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-400 rounded"></div> Clean</div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        };

        void [overallRatingClass, overallRatingLabel, cvorSafetyStatus, cvorSafetyStatusClass, renderCvorAnalysisRow];

        return (
        <div className="space-y-6">
          {/* Last Updated + Last Uploaded banner */}
          <div className="flex items-center justify-between bg-rose-50/60 border border-rose-100 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-rose-700">
              <Info size={14} />
              <span className="font-semibold">Last Updated:</span>
              <span className="font-mono font-bold">December 15, 2025 — 3:42 PM EST</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-rose-600">
              <Upload size={14} />
              <span className="font-semibold">Last Uploaded:</span>
              <span className="font-mono font-bold">December 10, 2025 — 11:15 AM EST</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
               CVOR PERFORMANCE SUMMARY — top-of-tab overview card
          ══════════════════════════════════════════════════════════════ */}
          {(() => {
            const col = carrierProfile.cvorAnalysis.collisions;
            const con = carrierProfile.cvorAnalysis.convictions;
            const ins = carrierProfile.cvorAnalysis.inspections;
            const cts = carrierProfile.cvorAnalysis.counts;

            // % of threshold used (what the screenshot shows: 47.6 / 53.9 / 87.8)
            const colPct = +(col.percentage / (col.weight / 100)).toFixed(2);
            const conPct = +(con.percentage / (con.weight / 100)).toFixed(2);
            const insPct = +(ins.percentage / (ins.weight / 100)).toFixed(2);

            // Color helpers (applied to pctOfThresh for category tiles)
            const rc = (v: number) =>
              v >= cvorThresholds.showCause ? '#dc2626'
              : v >= cvorThresholds.intervention ? '#d97706'
              : v >= cvorThresholds.warning ? '#b45309'
              : '#16a34a';
            const rb = (v: number) =>
              v >= cvorThresholds.showCause ? 'bg-red-100 text-red-700 border-red-300'
              : v >= cvorThresholds.intervention ? 'bg-amber-100 text-amber-700 border-amber-300'
              : v >= cvorThresholds.warning ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
              : 'bg-emerald-100 text-emerald-700 border-emerald-300';
            const rl = (v: number) =>
              v >= cvorThresholds.showCause ? 'SHOW CAUSE'
              : v >= cvorThresholds.intervention ? 'AUDIT'
              : v >= cvorThresholds.warning ? 'WARN'
              : 'OK';
            const tileBg = (v: number) =>
              v >= cvorThresholds.showCause ? 'bg-red-50/70 border-red-200'
              : v >= cvorThresholds.intervention ? 'bg-amber-50/70 border-amber-200'
              : v >= cvorThresholds.warning ? 'bg-yellow-50/70 border-yellow-200'
              : 'bg-emerald-50/70 border-emerald-200';

            // Full-spectrum gradient (green → yellow → orange → red → deep red)
            const grad = 'linear-gradient(to right,#22c55e 0%,#eab308 28%,#f97316 45%,#ef4444 70%,#991b1b 100%)';

            // Date range from pulls
            const fmtD = (s: string) => new Date(s).toLocaleDateString('en-US', { month:'short', year:'numeric' });
            const dateRange = `${fmtD(cvorPeriodicReports[0].reportDate)} to ${fmtD(cvorPeriodicReports[cvorPeriodicReports.length-1].reportDate)}`;

            // Recommended actions
            const critActions: {label: string; desc: string}[] = [];
            if (cvorRating >= cvorThresholds.showCause)
              critActions.push({ label:'Show Cause Hearing', desc:'CVOR rating exceeds Show Cause threshold — MTO hearing required immediately' });
            else if (cvorRating >= cvorThresholds.intervention)
              critActions.push({ label:'MTO Audit Scheduled', desc:'Rating exceeds intervention threshold — prepare compliance documentation for audit' });
            if (insPct >= cvorThresholds.showCause)
              critActions.push({ label:'Inspection Score Critical', desc:'Inspection score exceeds Show Cause threshold — review vehicle maintenance program immediately' });
            else if (insPct >= cvorThresholds.intervention)
              critActions.push({ label:'Improve Inspection Pass Rate', desc:'Increase pre-trip inspection quality and frequency to reduce OOS events' });
            if (conPct >= cvorThresholds.intervention)
              critActions.push({ label:'Address HOS & Conviction Violations', desc:'Review Hours-of-Service compliance and implement mandatory driver training' });
            if (cts.oosVehicle > cvorOosThresholds.vehicle)
              critActions.push({ label:'Reduce Vehicle OOS Rate', desc:`Vehicle OOS ${cts.oosVehicle}% exceeds ${cvorOosThresholds.vehicle}% threshold — increase pre-trip inspections` });
            if (cts.oosOverall > cvorOosThresholds.overall)
              critActions.push({ label:'Reduce Overall OOS Rate', desc:`Overall OOS ${cts.oosOverall}% exceeds ${cvorOosThresholds.overall}% threshold` });

            // Level comparison data (all CVOR inspections, no date filter)
            const cvorLvls = [
              { level:'Level 1', name:'Level 1 – Full Inspection' },
              { level:'Level 2', name:'Level 2 – Walk-Around' },
              { level:'Level 3', name:'Level 3 – Driver/Credentials' },
              { level:'Level 4', name:'Level 4 – Special Inspections' },
              { level:'Level 5', name:'Level 5 – Vehicle Only' },
            ];
            const lvlStats = cvorLvls.map(l => {
              const li = cvorInspections.filter(i => i.level === l.level);
              const count = li.length;
              const oosCount = li.filter(i => i.hasOOS).length;
              return { ...l, count, oosCount, pct: count > 0 ? (oosCount/count)*100 : 0 };
            });
            const lvlTotal = lvlStats.reduce((s,l) => s+l.count, 0);
            const lvlOos   = lvlStats.reduce((s,l) => s+l.oosCount, 0);

            return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm">

                {/* ─── HEADER ─────────────────────────────────────────────── */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert size={15} className="text-slate-600"/>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">CVOR Performance</div>
                      <div className="text-[11px] text-slate-500">{dateRange} — {cvorPeriod === 'All' ? 'All Pulls' : cvorPeriod}</div>
                    </div>
                  </div>
                  <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {(['Monthly','Quarterly','Semi-Annual','All'] as const).map(p => (
                      <button key={p} onClick={() => setCvorPeriod(p)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${cvorPeriod===p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">

                  {/* ─── OVERALL CVOR RATING ────────────────────────────── */}
                  <div className="px-5 pt-4 pb-4">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Overall CVOR Rating</div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-[46px] leading-none font-black" style={{ color: rc(cvorRating) }}>
                        {cvorRating.toFixed(2)}%
                      </div>
                      <div className="space-y-1">
                        <span className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${rb(cvorRating)}`}>
                          {rl(cvorRating)}
                        </span>
                        {cvorRating > cvorThresholds.intervention && (
                          <div className="text-[11px] text-slate-500">
                            +{(cvorRating - cvorThresholds.intervention).toFixed(2)}% above Audit
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Gradient bar ── */}
                    {(() => {
                      const hoverZones: { label: string; start: number; end: number; color: string; textColor: string; bg: string; border: string; action: string; desc: string }[] = [
                        { label:'OK',         start:0,                          end:cvorThresholds.warning,      color:'#16a34a', textColor:'#14532d', bg:'bg-emerald-50', border:'border-emerald-300', action:'No MTO action required.', desc:`Performance within acceptable range (0–${cvorThresholds.warning}%). Continue monitoring.` },
                        { label:'WARNING',    start:cvorThresholds.warning,     end:cvorThresholds.intervention, color:'#b45309', textColor:'#78350f', bg:'bg-yellow-50',  border:'border-yellow-300',  action:'Monitor & implement corrective measures.', desc:`Approaching intervention threshold (${cvorThresholds.warning}–${cvorThresholds.intervention}%). MTO may issue advisory letter.` },
                        { label:'AUDIT',      start:cvorThresholds.intervention,end:cvorThresholds.showCause,    color:'#d97706', textColor:'#92400e', bg:'bg-amber-50',   border:'border-amber-300',   action:'Prepare for MTO compliance audit.', desc:`Exceeds intervention threshold (${cvorThresholds.intervention}–${cvorThresholds.showCause}%). MTO will schedule a compliance audit.` },
                        { label:'SHOW CAUSE', start:cvorThresholds.showCause,   end:cvorThresholds.seizure,      color:'#dc2626', textColor:'#7f1d1d', bg:'bg-red-50',     border:'border-red-300',     action:'MTO hearing — CVOR suspension risk.', desc:`Exceeds Show Cause threshold (${cvorThresholds.showCause}–${cvorThresholds.seizure}%). MTO hearing required — CVOR may be suspended.` },
                      ];
                      const currentZone = hoverZones.find(z => cvorRating >= z.start && cvorRating < z.end) ?? hoverZones[hoverZones.length - 1];
                      const markerPct = Math.min(cvorRating, 100);

                      return (
                        <div className="relative" style={{ paddingTop: 26 }}>
                          {/* Floating badge + stem above bar */}
                          <div className="absolute z-10 flex flex-col items-center pointer-events-none"
                            style={{ left:`${markerPct}%`, transform:'translateX(-50%)', top: 0 }}>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white whitespace-nowrap shadow-md"
                              style={{ background: rc(cvorRating) }}>{cvorRating.toFixed(2)}%</span>
                            <div className="w-[2px] h-3" style={{ background: rc(cvorRating) }}/>
                          </div>

                          {/* Bar + hover zones */}
                          <div className="relative">
                            {/* Shadow track underneath for depth */}
                            <div className="absolute inset-0 rounded-full translate-y-0.5 blur-sm opacity-30" style={{ background: grad }}/>
                            {/* Main gradient bar */}
                            <div className="relative h-[22px] rounded-full overflow-hidden" style={{ background: grad, boxShadow:'inset 0 2px 4px rgba(0,0,0,0.25)' }}>
                              {/* Glass highlight top strip */}
                              <div className="absolute top-0 left-0 right-0 h-[8px] rounded-t-full" style={{ background:'linear-gradient(to bottom,rgba(255,255,255,0.30),transparent)' }}/>
                              {/* Threshold dividers */}
                              {[cvorThresholds.warning, cvorThresholds.intervention, cvorThresholds.showCause, cvorThresholds.seizure].map(t => (
                                <div key={t} className="absolute top-0 bottom-0 w-[1.5px] bg-white/50" style={{ left:`${t}%` }}/>
                              ))}
                              {/* Current position marker */}
                              <div className="absolute top-0 bottom-0 w-[3px] rounded-full shadow-xl"
                                style={{ left:`${markerPct}%`, transform:'translateX(-50%)', background:'#fff', boxShadow:'0 0 6px 2px rgba(0,0,0,0.35)' }}/>
                            </div>

                            {/* Hover zone overlays */}
                            <div className="absolute inset-0 rounded-full overflow-hidden">
                              {hoverZones.map(z => {
                                const isCurrent = cvorRating >= z.start && (z.end === cvorThresholds.seizure ? cvorRating <= z.end : cvorRating < z.end);
                                return (
                                  <div key={z.label} className="absolute inset-y-0 group/zone cursor-crosshair"
                                    style={{ left:`${z.start}%`, width:`${z.end - z.start}%` }}>
                                    <div className="absolute inset-0 bg-white/0 group-hover/zone:bg-white/20 transition-colors duration-150 rounded"/>
                                    {/* Tooltip */}
                                    <div className="hidden group-hover/zone:block absolute z-50 pointer-events-none"
                                      style={{ bottom:'calc(100% + 14px)', left:'50%', transform:'translateX(-50%)', width:248 }}>
                                      <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background:'#0f172a' }}>
                                        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: z.color }}>
                                          <span className="text-white font-black text-[13px] tracking-wide">{z.label}</span>
                                          <span className="text-white/80 text-[11px] font-mono font-bold">{z.start}% – {z.end}%</span>
                                        </div>
                                        <div className="px-4 py-3 space-y-2">
                                          {isCurrent && (
                                            <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                                              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Current Rating</span>
                                              <span className="text-[14px] font-black text-white">{cvorRating.toFixed(2)}%</span>
                                            </div>
                                          )}
                                          <div className="text-[11px] text-slate-300 leading-relaxed">{z.desc}</div>
                                          <div className="pt-2 border-t border-slate-700/60">
                                            <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Required Action</div>
                                            <div className="text-[12px] font-semibold" style={{ color: z.color }}>{z.action}</div>
                                          </div>
                                          <div className="pt-2 border-t border-slate-700/60 grid grid-cols-2 gap-x-4 gap-y-1">
                                            {[
                                              { name:'Warning',    val:cvorThresholds.warning,      c:'#fbbf24' },
                                              { name:'Audit',      val:cvorThresholds.intervention, c:'#f97316' },
                                              { name:'Show Cause', val:cvorThresholds.showCause,    c:'#f87171' },
                                              { name:'Seizure',    val:cvorThresholds.seizure,      c:'#fca5a5' },
                                            ].map(th => (
                                              <div key={th.name} className="flex items-center justify-between">
                                                <span className="text-[10px]" style={{ color: th.c }}>{th.name}</span>
                                                <span className="text-[11px] font-bold font-mono text-white">{th.val}%</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                          style={{ borderLeft:'7px solid transparent', borderRight:'7px solid transparent', borderTop:'7px solid #0f172a' }}/>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Threshold labels */}
                          <div className="relative mt-1" style={{ height: 13 }}>
                            {([
                              { label:'WARN',       val:cvorThresholds.warning,      color:'#b45309' },
                              { label:'AUDIT',      val:cvorThresholds.intervention, color:'#d97706' },
                              { label:'SHOW CAUSE', val:cvorThresholds.showCause,    color:'#dc2626' },
                              { label:'SEIZURE',    val:cvorThresholds.seizure,      color:'#7f1d1d' },
                            ] as {label:string;val:number;color:string}[]).map(({ label, val, color }) => (
                              <span key={label} className="absolute text-[9px] font-bold whitespace-nowrap"
                                style={{ left:`${val}%`, transform:'translateX(-50%)', color }}>{label}</span>
                            ))}
                          </div>

                          {/* Current zone strip */}
                          <div className={`mt-2 rounded-lg border px-3 py-1.5 flex items-center justify-between ${currentZone.bg} ${currentZone.border}`}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: currentZone.color }}/>
                              <span className="text-[11px] font-bold" style={{ color: currentZone.textColor }}>
                                Currently in {currentZone.label} zone ({currentZone.start}%–{currentZone.end}%)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">{currentZone.action}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ─── CATEGORY TILES ─────────────────────────────────── */}
                  <div className="px-5 py-4">
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key:'col', label:'Collisions',  pct:colPct, weight:col.weight, detail1:`${cts.collisions} collisions`, detail2:`${cts.totalCollisionPoints} pts` },
                      { key:'con', label:'Convictions', pct:conPct, weight:con.weight, detail1:`${cts.convictions} convictions`, detail2:`${cts.convictionPoints} pts` },
                      { key:'ins', label:'Inspections', pct:insPct, weight:ins.weight, detail1:`OOS rate`, detail2:`${cts.oosOverall}%` },
                    ] as {key:string;label:string;pct:number;weight:number;detail1:string;detail2:string}[]).map(({ key, label, pct, weight, detail1, detail2 }) => (
                      <div key={key} className={`rounded-xl border p-3 ${tileBg(pct)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rb(pct)}`}>{rl(pct)}</span>
                        </div>
                        <div className="text-[30px] leading-none font-black my-1" style={{ color: rc(pct) }}>
                          {pct.toFixed(1)}%
                        </div>
                        <div className="text-[11px] text-slate-600 mb-0.5">{detail1} · {detail2}</div>
                        <div className="text-[10px] text-slate-400 mb-2">{rl(pct)} · {weight}% weight</div>
                        {/* Mini gradient bar with hover tooltip */}
                        <div className="relative group/tileinfo">
                          <div className="relative h-[7px] rounded-full overflow-hidden cursor-pointer" style={{ background: grad, boxShadow:'inset 0 1px 3px rgba(0,0,0,0.20)' }}>
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background:'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                            <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full" style={{ left:`${Math.min(pct,100)}%`, right:0 }}/>
                            <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow" style={{ left:`${Math.min(pct,100)}%`, transform:'translateX(-50%)' }}/>
                            {[cvorThresholds.warning, cvorThresholds.intervention].map(t => (
                              <div key={t} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left:`${t}%` }}/>
                            ))}
                          </div>
                          <div className="flex justify-between text-[8.5px] mt-0.5 text-slate-400">
                            <span>WARN {cvorThresholds.warning}%</span>
                            <span>AUDIT {cvorThresholds.intervention}%</span>
                            <span>SC {cvorThresholds.showCause}%</span>
                          </div>
                          {/* Hover tooltip */}
                          <div className="hidden group-hover/tileinfo:block absolute z-50 pointer-events-none"
                            style={{ bottom:'calc(100% + 32px)', left:'50%', transform:'translateX(-50%)', width:230 }}>
                            <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background:'#0f172a' }}>
                              <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: rc(pct) }}>
                                <span className="text-white font-black text-[12px] uppercase tracking-wide">{label}</span>
                                <span className="text-white/90 text-[12px] font-mono font-bold">{pct.toFixed(1)}%</span>
                              </div>
                              <div className="px-3.5 py-2.5 space-y-1.5">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400">Status</span>
                                  <span className="font-bold" style={{ color: rc(pct) }}>{rl(pct)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400">Category Weight</span>
                                  <span className="font-bold text-white">{weight}%</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400">{detail1}</span>
                                  <span className="font-bold text-white">{detail2}</span>
                                </div>
                                <div className="pt-1.5 border-t border-slate-700/60">
                                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Thresholds</div>
                                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    {([
                                      { n:'Warning',    v:cvorThresholds.warning,      c:'#fbbf24' },
                                      { n:'Audit',      v:cvorThresholds.intervention, c:'#f97316' },
                                      { n:'Show Cause', v:cvorThresholds.showCause,    c:'#f87171' },
                                      { n:'Current',    v:pct,                         c: rc(pct) as string },
                                    ] as {n:string;v:number;c:string}[]).map(th => (
                                      <div key={th.n} className="flex items-center justify-between">
                                        <span className="text-[9px]" style={{ color: th.c }}>{th.n}</span>
                                        <span className="text-[10px] font-bold font-mono text-white">{th.v.toFixed(1)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                style={{ borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid #0f172a' }}/>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Thresholds inline row */}
                  <div className="flex items-center justify-between pt-3 text-[10px]">
                    <span className="text-slate-400">
                      <span className="font-semibold text-slate-500">CVOR Thresholds</span>
                      &nbsp;·&nbsp;<span style={{color:'#b45309'}}>{cvorThresholds.warning}% Warning</span>
                      &nbsp;·&nbsp;<span style={{color:'#d97706'}}>{cvorThresholds.intervention}% Audit</span>
                      &nbsp;·&nbsp;<span style={{color:'#dc2626'}}>{cvorThresholds.showCause}% Show Cause</span>
                      &nbsp;·&nbsp;<span style={{color:'#7f1d1d'}}>{cvorThresholds.seizure}% Seizure</span>
                    </span>
                    <button className="text-[10px] text-blue-500 hover:text-blue-700 font-semibold">Threshold Info</button>
                  </div>
                  </div>

                  {/* ─── OUT-OF-SERVICE RATES ─────────────────────────────── */}
                  <div className="px-5 py-4">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Out-of-Service Rates</div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {([
                        { label:'OVERALL', val: cts.oosOverall, thr: cvorOosThresholds.overall },
                        { label:'VEHICLE', val: cts.oosVehicle, thr: cvorOosThresholds.vehicle },
                        { label:'DRIVER',  val: cts.oosDriver,  thr: cvorOosThresholds.driver  },
                      ] as {label:string;val:number;thr:number}[]).map(({ label, val, thr }) => {
                        const over = val > thr;
                        const barW = Math.min((val / (thr * 1.8)) * 100, 100);
                        const diff = +(val - thr).toFixed(2);
                        return (
                          <div key={label} className={`rounded-xl border p-3 ${over ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${over ? 'bg-red-100 text-red-700 border-red-300' : 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                                {over ? 'OVER' : 'OK'}
                              </span>
                            </div>
                            <div className={`text-[34px] leading-none font-black my-1.5 ${over ? 'text-red-600' : 'text-emerald-600'}`}>
                              {val}%
                            </div>
                            {/* OOS bar with hover tooltip */}
                            <div className="relative group/oosinfo">
                              <div className="h-[6px] rounded-full overflow-hidden cursor-pointer mb-1" style={{ background: over ? '#fecaca' : '#bbf7d0', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.15)' }}>
                                <div className="h-full rounded-full transition-all"
                                  style={{ width:`${barW}%`, backgroundColor: over ? '#dc2626' : '#16a34a' }}/>
                              </div>
                              <div className="text-[10px] text-slate-400">Threshold: {thr}%</div>
                              {/* Hover tooltip */}
                              <div className="hidden group-hover/oosinfo:block absolute z-50 pointer-events-none"
                                style={{ bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', width:210 }}>
                                <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background:'#0f172a' }}>
                                  <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: over ? '#dc2626' : '#16a34a' }}>
                                    <span className="text-white font-black text-[12px] uppercase">{label} OOS Rate</span>
                                    <span className="text-white/90 text-[11px] font-bold">{over ? 'OVER' : 'OK'}</span>
                                  </div>
                                  <div className="px-3.5 py-2.5 space-y-1.5">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-400">Current Rate</span>
                                      <span className="text-[14px] font-black" style={{ color: over ? '#f87171' : '#4ade80' }}>{val}%</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-400">Threshold</span>
                                      <span className="font-bold text-white">{thr}%</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-slate-400">Difference</span>
                                      <span className={`font-bold ${over ? 'text-red-400' : 'text-emerald-400'}`}>{diff > 0 ? '+' : ''}{diff}%</span>
                                    </div>
                                    <div className="pt-1.5 border-t border-slate-700/60 text-[10px] text-slate-400 leading-snug">
                                      {over
                                        ? `${label} OOS exceeds threshold by ${Math.abs(diff).toFixed(2)}%. Immediate action required.`
                                        : `${label} OOS within acceptable range. ${(thr - val).toFixed(2)}% headroom remaining.`}
                                    </div>
                                  </div>
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                    style={{ borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid #0f172a' }}/>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── RECOMMENDED ACTIONS (collapsible) ─────────────── */}
                  <div className="px-5 py-4">
                  <details open>
                    <summary className="flex items-center justify-between mb-2 cursor-pointer list-none select-none">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Recommended Actions</span>
                        {critActions.length > 0 && (
                          <span className="bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {critActions.length} Critical
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-blue-500 font-semibold">View Details ▾</span>
                    </summary>
                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 divide-y divide-slate-100">
                      {critActions.map((a, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-2.5">
                          <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-100 border border-red-200 text-red-700 flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                          <div>
                            <div className="text-[12px] font-semibold text-slate-800">{a.label}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{a.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                  </div>

                  {/* ─── MILEAGE SUMMARY ────────────────────────────────── */}
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mileage Summary</span>
                      <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                        {(['km','mi'] as const).map(u => (
                          <button key={u} onClick={() => setMileageUnit(u)}
                            className={`px-2 py-0.5 text-[10px] font-bold transition-colors rounded ${mileageUnit===u ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {u.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { label:'Ontario',   val: cts.onMiles },
                        { label:'Canada',    val: cts.canadaMiles },
                        { label:'US/Mexico', val: cts.totalUSMiles },
                        { label:'Total',     val: cts.totalMiles },
                      ] as {label:string;val:number}[]).map(({ label, val }) => {
                        const conv = mileageUnit === 'km' ? val * 1.60934 : val;
                        const display = conv >= 1000000 ? `${(conv/1000000).toFixed(1)}M` : conv >= 1000 ? `${(conv/1000).toFixed(0)}K` : String(Math.round(conv));
                        return (
                          <div key={label} className={`rounded-lg border p-2.5 text-center ${label === 'Total' ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                            <div className={`text-[14px] font-black font-mono ${label === 'Total' ? 'text-blue-700' : 'text-slate-800'}`}>{display}</div>
                            <div className="text-[9px] text-slate-400">{mileageUnit}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ─── CVOR RATING COMPARISON ─────────────────────────── */}
                  <div className="px-5 py-4">
                  <div className="rounded-xl border border-slate-200">
                    <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 rounded-t-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <ClipboardCheck size={12} className="text-amber-600"/>
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-slate-900">CVOR Rating Comparison</div>
                          <div className="text-[10px] text-slate-500">All Pulls · Total {lvlTotal} · OOS: {lvlOos}</div>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-slate-100">
                      {lvlStats.map(l => {
                        const lColor = l.pct >= 50 ? '#ef4444' : l.pct >= 25 ? '#f97316' : l.count > 0 ? '#22c55e' : '#cbd5e1';
                        const dotCls = l.count > 0 ? (l.pct >= 50 ? 'bg-red-500' : l.pct >= 25 ? 'bg-orange-400' : 'bg-emerald-500') : 'bg-slate-300';
                        return (
                          <div key={l.level} className="px-3.5 py-3 flex items-center gap-2.5 group/lvl relative">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`}/>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-slate-700 truncate">{l.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden cursor-pointer">
                                  <div className="h-full rounded-full transition-all" style={{ width:`${Math.min(l.pct,100)}%`, backgroundColor: lColor }}/>
                                </div>
                                <span className="text-[10px] font-bold w-7 text-right" style={{ color: lColor }}>{l.pct.toFixed(0)}%</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[11px] font-bold text-slate-700">{l.count} insp</div>
                              <div className="text-[10px] text-slate-400">{l.oosCount} OOS</div>
                            </div>
                            {/* Level hover tooltip */}
                            {l.count > 0 && (
                              <div className="hidden group-hover/lvl:flex absolute z-[100] pointer-events-none flex-col gap-0"
                                style={{ top:'calc(100% + 4px)', left:0, width:200 }}>
                                <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background:'#0f172a' }}>
                                  <div className="px-3 py-1.5 flex items-center justify-between rounded-t-xl" style={{ background: lColor }}>
                                    <span className="text-white font-bold text-[11px] truncate">{l.name}</span>
                                    <span className="text-white/90 text-[11px] font-mono ml-1 flex-shrink-0">{l.pct.toFixed(0)}% OOS</span>
                                  </div>
                                  <div className="px-3 py-2 space-y-1">
                                    {[
                                      { label:'Inspections', val: String(l.count), color:'#e2e8f0' },
                                      { label:'Out-of-Service', val: String(l.oosCount), color:'#f87171' },
                                      { label:'Pass', val: String(l.count - l.oosCount), color:'#4ade80' },
                                      { label:'OOS Rate', val: `${l.pct.toFixed(1)}%`, color: lColor },
                                    ].map(row => (
                                      <div key={row.label} className="flex justify-between items-center">
                                        <span className="text-[11px] text-slate-400">{row.label}</span>
                                        <span className="text-[12px] font-bold" style={{ color: row.color }}>{row.val}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="self-start ml-4 w-0 h-0 -mt-px" style={{ borderLeft:'5px solid transparent', borderRight:'5px solid transparent', borderBottom:`5px solid #1e293b`, order:-1 }}/>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* ===== CVOR Mileage Summary — removed (shown inside CVOR Performance card) ===== */}
          {false && (() => {
            const mp = carrierProfile.cvorAnalysis.counts;
            const conv = (n: number) => mileageUnit === 'km' ? Math.round(n * 1.60934) : n;
            const fmt = (n: number) => conv(n).toLocaleString();
            const unit = mileageUnit === 'km' ? 'Kms' : 'Miles';
            return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Truck size={14} className="text-red-500"/> Mileage Summary
                  </h3>
                  <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                    {(['km', 'mi'] as const).map(u => (
                      <button key={u} onClick={() => setMileageUnit(u)} className={`px-2.5 py-1 text-xs font-bold transition-colors ${mileageUnit === u ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}>
                        {u === 'km' ? 'KM' : 'MI'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">{unit} Travelled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-700">Ontario {unit}* Travelled</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono text-slate-900">{fmt(mp.onMiles)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-700">Rest of Canada {unit}* Travelled</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono text-slate-900">{fmt(mp.canadaMiles)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-slate-700">US / Mexico {unit}* Travelled</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono text-slate-900">{fmt(mp.totalUSMiles)}</td>
                      </tr>
                      <tr className="bg-slate-50 border-t-2 border-slate-300">
                        <td className="px-4 py-3 font-bold text-slate-800">Total {unit}* Travelled</td>
                        <td className="px-4 py-3 text-right font-bold font-mono text-red-700 text-base">{fmt(mp.totalMiles)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">*{mileageUnit === 'km' ? 'Kilometres' : 'Miles'} shown are the current annual rates most recently reported by the operator for the last 12 months (could include actual and estimated travel).</p>
              </div>
            );
          })()}

          {/* ===== CVOR Level Comparison — removed (shown inside CVOR Performance card) ===== */}
          {false && (() => {
            const cvorLevels = [
              { level: 'Level 1', name: 'Level 1 – Full Inspection', desc: 'Full inspection – driver, vehicle full inspection, HOS, permits, insurance, cargo, TDG, permits and authorities' },
              { level: 'Level 2', name: 'Level 2 – Walk-Around', desc: 'Walk around – Driver/vehicle inspection. DL, HOS, Seat belt, DVIR' },
              { level: 'Level 3', name: 'Level 3 – Driver/Credentials', desc: 'Driver/Credentials/Administrative Inspection – DL, HOS, seat belt, DVIR, Carrier credentials' },
              { level: 'Level 4', name: 'Level 4 – Special Inspections', desc: 'Special inspections – particular item (e.g., cargo, TDG placards, one-time issue)' },
              { level: 'Level 5', name: 'Level 5 – Vehicle Only', desc: 'Vehicle only inspection – no driver present, mechanical condition check only' },
            ];

            const now = new Date('2025-12-31');
            const cvorLvlMonths = cvorLevelPeriod === '1M' ? 1 : cvorLevelPeriod === '3M' ? 3 : cvorLevelPeriod === '6M' ? 6 : cvorLevelPeriod === '12M' ? 12 : 24;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - cvorLvlMonths);
            const periodInsp = cvorInspections.filter(i => new Date(i.date) >= cutoff);

            const levelStats = cvorLevels.map(l => {
              const levelInsp = periodInsp.filter(i => i.level === l.level);
              const count = levelInsp.length;
              const oosCount = levelInsp.filter(i => i.hasOOS).length;
              const pct = count > 0 ? ((oosCount / count) * 100) : 0;
              return { ...l, count, oosCount, pct };
            });

            const totalInsp = levelStats.reduce((s, l) => s + l.count, 0);
            const totalOos = levelStats.reduce((s, l) => s + l.oosCount, 0);

            return ((
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <ClipboardCheck size={16} className="text-amber-600"/>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">CVOR Rating Comparison</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Last {cvorLevelPeriod === '24M' ? '24 Months' : cvorLevelPeriod === '12M' ? '12 Months' : cvorLevelPeriod === '6M' ? '6 Months' : cvorLevelPeriod === '3M' ? '3 Months' : '1 Month'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Total: <span className="font-bold text-slate-800">{totalInsp}</span></span>
                      <span className="text-slate-500">OOS: <span className="font-bold text-red-600">{totalOos}</span></span>
                    </div>
                    <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                      {(['1M', '3M', '6M', '12M', '24M'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setCvorLevelPeriod(p)}
                          className={`px-2.5 py-1 text-xs font-bold transition-colors ${cvorLevelPeriod === p ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 px-6 py-2.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-5">Level</div>
                <div className="col-span-2 text-center">Inspections</div>
                <div className="col-span-2 text-center">OOS</div>
                <div className="col-span-2 text-center">OOS %</div>
                <div className="col-span-1"></div>
              </div>

              {/* Level Rows */}
              {levelStats.map((l) => {
                const isExpanded = expandedCvorLevel === l.level;
                const pctColor = l.pct >= 50 ? 'text-red-600' : l.pct >= 25 ? 'text-amber-600' : 'text-emerald-600';
                const barColor = l.pct >= 50 ? 'bg-red-500' : l.pct >= 25 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div key={l.level}>
                    <div
                      className={`grid grid-cols-12 px-6 py-3 items-center cursor-pointer transition-colors hover:bg-slate-50 border-b border-slate-50 ${isExpanded ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setExpandedCvorLevel(isExpanded ? null : l.level)}
                    >
                      <div className="col-span-5 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${l.count > 0 ? barColor : 'bg-slate-300'}`}></div>
                        <span className="text-sm font-medium text-slate-700">{l.name}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className="text-sm font-bold text-slate-800">{l.count}</span>
                      </div>
                      <div className="col-span-2 text-center">
                        <span className={`text-sm font-bold ${l.oosCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{l.oosCount}</span>
                      </div>
                      <div className="col-span-2 text-center flex items-center justify-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(l.pct, 100)}%` }}></div>
                        </div>
                        <span className={`text-sm font-bold ${pctColor}`}>{l.pct.toFixed(l.pct % 1 === 0 ? 0 : 2)}%</span>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
                      </div>
                    </div>

                    {/* Expanded Description */}
                    {isExpanded && (
                      <div className="px-6 py-4 bg-blue-50/30 border-b border-slate-100">
                        <div className="flex items-start gap-3">
                          <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0"/>
                          <div>
                            <div className="text-sm font-semibold text-slate-700 mb-1">{l.name}</div>
                            <p className="text-sm text-slate-600 leading-relaxed">{l.desc}</p>
                            {l.count > 0 && (
                              <div className="mt-3 flex items-center gap-4 text-xs">
                                <span className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-600">
                                  <span className="font-bold text-slate-800">{l.count}</span> inspections
                                </span>
                                <span className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-600">
                                  <span className="font-bold text-red-600">{l.oosCount}</span> out-of-service
                                </span>
                                <span className={`bg-white border border-slate-200 rounded-md px-2.5 py-1 font-bold ${pctColor}`}>
                                  {l.pct.toFixed(l.pct % 1 === 0 ? 0 : 2)}% OOS rate
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            ));
          })()}


              {/* ── PERFORMANCE HISTORY CHARTS ── */}
              {(() => {
                // ─── Cadence filter ────────────────────────────────────────
                const filterByCadence = (all: typeof cvorPeriodicReports) => {
                  if (cvorPeriod === 'Monthly' || cvorPeriod === 'All') return all;
                  const minGapDays = cvorPeriod === 'Quarterly' ? 80 : 170;
                  const out: typeof all = [];
                  let lastMs = 0;
                  for (const d of all) {
                    const ms = new Date(d.reportDate).getTime();
                    if (!lastMs || (ms - lastMs) / 86400000 >= minGapDays) { out.push(d); lastMs = ms; }
                  }
                  return out;
                };
                const histData = filterByCadence(cvorPeriodicReports);
                const n = histData.length;
                if (n < 2) return null;

                const firstPull = histData[0];
                const lastPull  = histData[n - 1];
                const rangeMonths = Math.round(
                  (new Date(lastPull.reportDate).getTime() - new Date(firstPull.reportDate).getTime()) / (1000*60*60*24*30.44)
                );

                // 24-month window for a pull
                const windowOf = (reportDate: string) => {
                  const end = new Date(reportDate);
                  const start = new Date(end);
                  start.setMonth(start.getMonth() - 24);
                  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
                  return { start, end, label: `${fmt(start)} → ${fmt(end)}` };
                };

                // ─── SVG layout (all charts: VW=1200 full-width) ──────────
                const historySize =
                  viewportWidth < 640
                    ? {
                        VW: 760,
                        pL: 56,
                        pR: 92,
                        pT: 20,
                        pB: 52,
                        sectionPad: 'px-3 py-4',
                        overallH: 218,
                        midH: 162,
                        eventH: 154,
                        titleCls: 'text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700',
                        legendCls: 'text-[9px]',
                        helperCls: 'text-[9px]',
                        thresholdLabel: (v: number, label: string) => `${v}% ${label === 'Show Cause' ? 'Show' : label === 'Warning' ? 'Warn' : label}`,
                      }
                    : viewportWidth < 1100
                      ? {
                          VW: 1100,
                          pL: 64,
                          pR: 122,
                          pT: 24,
                          pB: 56,
                          sectionPad: 'px-5 py-5',
                          overallH: 248,
                          midH: 180,
                          eventH: 168,
                          titleCls: 'text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700',
                          legendCls: 'text-[9.5px]',
                          helperCls: 'text-[9.5px]',
                          thresholdLabel: (v: number, label: string) => `${v}% ${label}`,
                        }
                      : viewportWidth < 1600
                        ? {
                            VW: 1440,
                            pL: 74,
                            pR: 158,
                            pT: 30,
                            pB: 62,
                            sectionPad: 'px-6 py-5',
                            overallH: 274,
                            midH: 194,
                            eventH: 176,
                            titleCls: 'text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700',
                            legendCls: 'text-[10px]',
                            helperCls: 'text-[10px]',
                            thresholdLabel: (v: number, label: string) => `${v}% ${label}`,
                          }
                        : {
                            VW: 1800,
                            pL: 84,
                            pR: 188,
                            pT: 32,
                            pB: 66,
                            sectionPad: 'px-7 py-6',
                            overallH: 300,
                            midH: 214,
                            eventH: 194,
                            titleCls: 'text-[13px] font-bold uppercase tracking-[0.18em] text-slate-700',
                            legendCls: 'text-[10.5px]',
                            helperCls: 'text-[10.5px]',
                            thresholdLabel: (v: number, label: string) => `${v}% ${label}`,
                          };
                const { VW, pL, pR, pT, pB } = historySize;
                const cW = VW - pL - pR;

                const xAt = (i: number, total = n) =>
                  pL + (total > 1 ? (i / (total - 1)) * cW : cW / 2);

                const yAt = (v: number, max: number, min: number, chartH: number) =>
                  pT + chartH - ((v - min) / (max - min || 1)) * chartH;

                // Gap-aware path
                const gapDays = cvorPeriod === 'Monthly' ? 60 : cvorPeriod === 'Quarterly' ? 100 : 250;
                const mkPath = (
                  items: typeof histData,
                  getVal: (d: typeof histData[0]) => number,
                  max: number, min: number, chartH: number,
                  total = n
                ) => items.map((d, i) => {
                  const x = xAt(i, total).toFixed(1);
                  const y = yAt(getVal(d), max, min, chartH).toFixed(1);
                  if (i === 0) return `M${x},${y}`;
                  const gap = (new Date(d.reportDate).getTime() - new Date(items[i-1].reportDate).getTime()) / 86400000;
                  return `${gap > gapDays ? 'M' : 'L'}${x},${y}`;
                }).join(' ');

                const mkArea = (items: typeof histData, getVal: (d: typeof histData[0]) => number, max: number, min: number, chartH: number) => {
                  const line = mkPath(items, getVal, max, min, chartH);
                  return `${line} L${xAt(n-1).toFixed(1)},${(pT+chartH).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+chartH).toFixed(1)}Z`;
                };

                // Alert logic
                const alertLevel = (d: typeof histData[0]) => {
                  if (d.oosVehicle > 40 || d.rating >= cvorThresholds.intervention) return 'critical';
                  if (d.oosOverall > 30 || d.rating >= cvorThresholds.warning) return 'warning';
                  return 'ok';
                };
                const ratingColor = (r: number) =>
                  r >= cvorThresholds.showCause   ? '#dc2626' :
                  r >= cvorThresholds.intervention ? '#f97316' :
                  r >= cvorThresholds.warning      ? '#ca8a04' : '#16a34a';

                const selPull = cvorSelectedPull ? cvorPeriodicReports.find(d => d.reportDate === cvorSelectedPull) ?? null : null;

                // ─── Unified tooltip — single column, SVG-scaled fonts ─────
                const Tip = ({
                  cx, cy, d, focusMetric, chartH: tipCH = 240
                }: {
                  cx: number; cy: number;
                  d: typeof histData[0];
                  focusMetric: string;
                  chartH?: number;
                }) => {
                  const win = windowOf(d.reportDate);
                  const rc = ratingColor(d.rating);
                  const al = alertLevel(d);
                  const alertColor = al === 'critical' ? '#dc2626' : al === 'warning' ? '#f59e0b' : '#16a34a';
                  const alertLabel = al==='critical'?'⚠ Critical':al==='warning'?'⚡ Warning':'✓ Healthy';
                  // All fonts scaled for VW=1200 viewBox: ×1.5 vs typical px
                  // → fontSize=18 renders ≈12px at ~900px display width
                  const rows: Array<{label:string;val:string;color:string;bold?:boolean}> = [
                    { label:'CVOR Rating',      val:`${d.rating.toFixed(2)}%`,      color:rc,        bold:focusMetric==='rating' },
                    { label:'Collisions',        val:`${d.colContrib.toFixed(2)}%`,  color:'#3b82f6', bold:focusMetric==='col' },
                    { label:'Convictions',       val:`${d.conContrib.toFixed(2)}%`,  color:'#d97706', bold:focusMetric==='con' },
                    { label:'Inspections',       val:`${d.insContrib.toFixed(2)}%`,  color:'#dc2626', bold:focusMetric==='ins' },
                    { label:'OOS Overall',       val:d.oosOverall>0?`${d.oosOverall.toFixed(1)}%`:'—', color:d.oosOverall>20?'#ef4444':'#94a3b8', bold:focusMetric==='oosOv' },
                    { label:'OOS Vehicle',       val:d.oosVehicle>0?`${d.oosVehicle.toFixed(1)}%`:'—', color:d.oosVehicle>20?'#ef4444':'#94a3b8', bold:focusMetric==='oosVh' },
                    { label:'OOS Driver',        val:d.oosDriver>0?`${d.oosDriver.toFixed(1)}%`:'—',   color:d.oosDriver>5?'#f59e0b':'#10b981',   bold:focusMetric==='oosDr' },
                    { label:'# Col / Conv',      val:`${d.collisionEvents} / ${d.convictionEvents}`,   color:'#94a3b8', bold:focusMetric==='events' },
                    { label:'Col Pts / Conv Pts',val:`${d.totalCollisionPoints} / ${d.convictionPoints}`, color:'#94a3b8' },
                  ];
                  const tw = viewportWidth < 640 ? 206 : viewportWidth < 1100 ? 230 : viewportWidth < 1600 ? 258 : 290;
                  const headerH = viewportWidth < 640 ? 58 : viewportWidth < 1100 ? 62 : viewportWidth < 1600 ? 68 : 74;
                  const rowH = 22;   // 22 SVG units ≈ 15px on screen
                  const footerH = 20;
                  const th = headerH + rows.length * rowH + footerH; // ≈272 SVG units
                  // Horizontal: place tooltip on opposite side of chart from dot
                  const onRight = cx > VW * 0.58;
                  const tx = onRight
                    ? Math.max(pL + 10, cx - tw - 18)
                    : Math.min(cx + 18, VW - pR - tw - 10);
                  // Vertical: pin to top if dot is in bottom half, else pin to bottom
                  const prefersAbove = cy > pT + tipCH * 0.48;
                  const tyRaw = prefersAbove ? cy - th - 16 : cy + 18;
                  const ty = Math.max(pT + 8, Math.min(tyRaw, pT + tipCH - th - 6));
                  return (
                    <g style={{ pointerEvents:'none' }}>
                      {/* Drop shadow */}
                      <rect x={tx+5} y={ty+7} width={tw} height={th} rx={14} fill="#0f172a" opacity="0.13"/>
                      {/* White card */}
                      <rect x={tx} y={ty} width={tw} height={th} rx={14} fill="#ffffff"/>
                      <rect x={tx} y={ty} width={tw} height={th} rx={14} fill="none" stroke={alertColor} strokeWidth="1.6" opacity="0.9"/>
                      {/* Header colour strip */}
                      <rect x={tx+10} y={ty+10} width={tw-20} height={24} rx={8} fill={alertColor} opacity="0.12"/>
                      {/* Period label — fontSize 18 ≈ 13px on screen */}
                      <text x={tx+16} y={ty+27} fontSize={viewportWidth < 640 ? 13 : viewportWidth < 1100 ? 14 : viewportWidth < 1600 ? 16 : 17} fontWeight="700" fill="#0f172a" fontFamily="monospace">{d.periodLabel}</text>
                      {/* Alert badge */}
                      <rect x={tx+tw-84} y={ty+10} width={68} height={20} rx={7} fill={alertColor} opacity="0.18"/>
                      <text x={tx+tw-50} y={ty+24} textAnchor="middle" fontSize={viewportWidth < 640 ? 9 : viewportWidth < 1600 ? 10 : 11} fontWeight="700" fill={alertColor}>{alertLabel}</text>
                      {/* Window */}
                      <text x={tx+16} y={ty+43} fontSize={viewportWidth < 640 ? 8.5 : viewportWidth < 1600 ? 10 : 11} fill="#4f46e5" fontFamily="monospace">{win.label}</text>
                      <text x={tx+16} y={ty+56} fontSize={viewportWidth < 640 ? 8 : viewportWidth < 1600 ? 9 : 10} fill="#94a3b8">24-month rolling window</text>
                      {/* Divider */}
                      <line x1={tx+10} x2={tx+tw-10} y1={ty+62} y2={ty+62} stroke="#e2e8f0" strokeWidth="1"/>
                      {/* Metric rows */}
                      {rows.map((r, ri) => {
                        const top = ty + headerH + ri * rowH;
                        const textY = top + 11;
                        const fs = viewportWidth < 640 ? (r.bold ? 10 : 9) : viewportWidth < 1600 ? (r.bold ? 12 : 11) : (r.bold ? 13 : 12);
                        return (
                          <g key={ri}>
                            {r.bold && <rect x={tx+10} y={top-2} width={tw-20} height={16} rx={4} fill={r.color} opacity="0.08"/>}
                            <text x={tx+16} y={textY} fontSize={fs} fill={r.bold?'#0f172a':'#64748b'} fontWeight={r.bold?'700':'500'}>{r.label}</text>
                            <text x={tx+tw-16} y={textY} textAnchor="end" fontSize={fs} fontWeight="700" fill={r.color} fontFamily="monospace">{r.val}</text>
                          </g>
                        );
                      })}
                      {/* Footer */}
                      <line x1={tx+10} x2={tx+tw-10} y1={ty+th-footerH-2} y2={ty+th-footerH-2} stroke="#e2e8f0" strokeWidth="1"/>
                      <text x={tx+tw/2} y={ty+th-7} textAnchor="middle" fontSize={viewportWidth < 640 ? 10 : viewportWidth < 1600 ? 11 : 12} fill="#4f46e5" fontWeight="600">Click to view inspections</text>
                    </g>
                  );
                };

                // ─── Shared x-axis ─────────────────────────────────────────
                const axisFontSize = viewportWidth < 640 ? 9 : viewportWidth < 1100 ? 11 : viewportWidth < 1600 ? 13 : 14;
                const XAxis = ({ items, chartH, total }: { items: typeof histData; chartH: number; total?: number }) => (
                  <>
                    {/* X-axis baseline */}
                    <line x1={pL} x2={pL+cW} y1={pT+chartH} y2={pT+chartH} stroke="#cbd5e1" strokeWidth="1"/>
                    {items.map((d, i) => {
                      const x = xAt(i, total ?? items.length);
                      const al = alertLevel(d);
                      return (
                        <g key={i}>
                          {/* tick mark */}
                          <line x1={x} x2={x} y1={pT+chartH} y2={pT+chartH+5} stroke="#cbd5e1" strokeWidth="1"/>
                          {al !== 'ok' && (
                            <line x1={x} x2={x} y1={pT} y2={pT+chartH}
                              stroke={al==='critical'?'#dc2626':'#f59e0b'} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.3"/>
                          )}
                          <text x={x} y={pT+chartH+24}
                            textAnchor="end" fontSize={axisFontSize}
                            fill={al==='critical'?'#dc2626':al==='warning'?'#b45309':'#334155'}
                            fontWeight={al!=='ok'?'700':'500'}
                            fontFamily="monospace"
                            transform={`rotate(-32,${x},${pT+chartH+24})`}>
                            {d.periodLabel}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );

                // ─── Y-axis ────────────────────────────────────────────────
                const YGrid = ({ ticks, max, min, chartH, suffix='%' }: { ticks: number[]; max: number; min: number; chartH: number; suffix?: string }) => (
                  <>
                    {/* Y-axis border line */}
                    <line x1={pL} x2={pL} y1={pT} y2={pT+chartH} stroke="#cbd5e1" strokeWidth="1"/>
                    {ticks.map(v => (
                      <g key={v}>
                        <line x1={pL} x2={pL+cW} y1={yAt(v,max,min,chartH)} y2={yAt(v,max,min,chartH)} stroke="#e2e8f0" strokeWidth="0.75"/>
                        {/* tick mark */}
                        <line x1={pL-4} x2={pL} y1={yAt(v,max,min,chartH)} y2={yAt(v,max,min,chartH)} stroke="#cbd5e1" strokeWidth="1"/>
                        <text x={pL-10} y={yAt(v,max,min,chartH)+4} textAnchor="end" fontSize={axisFontSize} fill="#475569" fontFamily="monospace" fontWeight="500">{v}{suffix}</text>
                      </g>
                    ))}
                  </>
                );

                // ─── Dot renderer (shared) ─────────────────────────────────
                const Dots = ({
                  items, getY, chartId, dotFill, focusMetric, total, chartH: dotCH, showTooltip = true
                }: {
                  items: typeof histData;
                  getY: (d: typeof histData[0]) => number;
                  chartH?: number;
                  chartId: string;
                  dotFill: (d: typeof histData[0]) => string;
                  focusMetric: string;
                  total?: number;
                  showTooltip?: boolean;
                }) => {
                  const totalLen = total ?? items.length;
                  // Pre-compute per-item data to avoid repetition
                  const dotItems = items.map((d, i) => {
                    const cx = xAt(i, totalLen);
                    const cy = getY(d);
                    const fill = dotFill(d);
                    const isSel  = d.reportDate === cvorSelectedPull;
                    const isHov  = cvorHoveredPull?.chart === chartId && cvorHoveredPull?.idx === i;
                    const isLast = i === totalLen - 1;
                    const al = alertLevel(d);
                    return { d, i, cx, cy, fill, isSel, isHov, isLast, al };
                  });
                  const hoveredItem = dotItems.find(it => it.isHov) ?? null;
                  return (
                    <>
                      {/* Pass 1: render all dots (non-hovered first, no tooltip) */}
                      {dotItems.map(({ d, i, cx, cy, fill, isSel, isHov, isLast, al }) => (
                        <g key={i} style={{ cursor:'pointer' }}
                          onClick={() => setCvorSelectedPull(isSel ? null : d.reportDate)}
                          onMouseEnter={() => setCvorHoveredPull({ chart: chartId, idx: i })}
                          onMouseLeave={() => setCvorHoveredPull(null)}>
                          {/* Alert pulse ring */}
                          {al === 'critical' && !isSel && (
                            <circle cx={cx} cy={cy} r={11} fill="#dc2626" opacity="0.15"/>
                          )}
                          {/* Selected ring */}
                          {isSel && <circle cx={cx} cy={cy} r={13} fill="none" stroke="#6366f1" strokeWidth="2.5"/>}
                          {(isLast || isHov || isSel) && (
                            <circle cx={cx} cy={cy} r={10} fill={isSel?'#6366f1':fill} opacity="0.18"/>
                          )}
                          {/* Hit area */}
                          <circle cx={cx} cy={cy} r={14} fill="transparent"/>
                          {/* Dot */}
                          <circle cx={cx} cy={cy} r={isSel||isHov||isLast ? 6 : 4}
                            fill={isSel?'#6366f1':fill} stroke="white" strokeWidth="2"
                            style={{ pointerEvents:'none' }}/>
                          {/* Alert exclamation */}
                          {al === 'critical' && !isSel && !isHov && (
                            <text x={cx+5} y={cy-7} fontSize="8" fill="#dc2626" fontWeight="bold" style={{pointerEvents:'none'}}>!</text>
                          )}
                          {/* Value label on last or hovered */}
                          {(isLast || isHov || isSel) && (
                            <text x={cx} y={cy-12} textAnchor="middle" fontSize="12" fontWeight="bold"
                              fill={isSel?'#6366f1':fill} fontFamily="monospace" style={{pointerEvents:'none'}}>
                              {getY(d) < pT + 8 ? '' : ''}
                            </text>
                          )}
                        </g>
                      ))}
                      {/* Pass 2: render hovered dot's tooltip last so it paints on top */}
                      {showTooltip && hoveredItem && (
                        <Tip cx={hoveredItem.cx} cy={hoveredItem.cy} d={hoveredItem.d} focusMetric={focusMetric} chartH={dotCH}/>
                      )}
                    </>
                  );
                };

                return (
                  <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">

                    {/* ── Header ── */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-[17px] font-bold tracking-tight text-slate-800">CVOR Performance History</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} pulls</span>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
                          {firstPull.periodLabel} → {lastPull.periodLabel} · {rangeMonths}mo
                        </span>
                        <span className="text-[10px] italic text-slate-400">Each pull = 24-month rolling window</span>
                        {/* Alert legend */}
                        <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1">
                          {[
                            { c:'#dc2626', label:'Critical pull' },
                            { c:'#f59e0b', label:'Warning pull' },
                            { c:'#16a34a', label:'Healthy pull' },
                          ].map(l => (
                            <div key={l.label} className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{background:l.c}}/>
                              <span className="text-[10px] text-slate-500">{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cadence</span>
                        <div className="inline-flex rounded-xl bg-slate-100 p-0.5 gap-px">
                          {(['Monthly','Quarterly','Semi-Annual','All'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p)}
                              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${cvorPeriod===p?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Selected pull banner ── */}
                    {selPull && (() => {
                      const win = windowOf(selPull.reportDate);
                      const al = alertLevel(selPull);
                      const bannerBg = al==='critical'?'bg-red-600':al==='warning'?'bg-amber-500':'bg-indigo-600';
                      return (
                        <div className={`px-5 py-2.5 ${bannerBg} text-white flex items-center justify-between flex-wrap gap-2`}>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                            <span className="text-sm font-bold">Pull: {selPull.periodLabel}</span>
                            <span className="opacity-80 text-xs font-mono">Window: {win.label}</span>
                            <span className="opacity-70 text-xs">Rating: <strong>{selPull.rating.toFixed(2)}%</strong></span>
                            {al==='critical' && <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">⚠ Above Audit Threshold</span>}
                          </div>
                          <button onClick={() => setCvorSelectedPull(null)}
                            className="opacity-80 hover:opacity-100 text-[11px] font-bold px-2 py-0.5 rounded border border-white/40 hover:border-white transition-all">
                            × Clear
                          </button>
                        </div>
                      );
                    })()}

                    <div className="divide-y divide-slate-100">

                      {/* ══ CHART 1: Overall CVOR Rating ══ */}
                      {(() => {
                        const CH=historySize.overallH, VH=CH+pT+pB;
                        const rMin=0, rMax=100;
                        const zones = [
                          { from:0,                          to:cvorThresholds.warning,      fill:'#bbf7d0', label:'Safe',       labelColor:'#166534' },
                          { from:cvorThresholds.warning,      to:cvorThresholds.intervention, fill:'#fef08a', label:'Warning',    labelColor:'#854d0e' },
                          { from:cvorThresholds.intervention, to:cvorThresholds.showCause,    fill:'#fde68a', label:'Audit',      labelColor:'#92400e' },
                          { from:cvorThresholds.showCause,    to:rMax,                        fill:'#fecaca', label:'Show Cause', labelColor:'#991b1b' },
                        ];
                        return (
                          <div className={historySize.sectionPad}>
                            <div className="mb-4 flex items-center gap-4 flex-wrap">
                              <span className={historySize.titleCls}>Overall CVOR Rating</span>
                              {zones.map(z=>(
                                <div key={z.label} className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded-sm border" style={{background:z.fill,borderColor:z.labelColor+'55'}}/>
                                  <span className="text-[10px] font-mono" style={{color:z.labelColor}}>{z.label}</span>
                                </div>
                              ))}
                              <span className={`ml-auto font-semibold text-indigo-500 ${historySize.helperCls}`}>Hover any dot · click to drill into inspections</span>
                            </div>
                            {selPull && (
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 font-mono text-[10px] text-indigo-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"/>
                                Selected: {windowOf(selPull.reportDate).label}
                              </div>
                            )}
                            <div style={{position:'relative',width:'100%',paddingBottom:`${(VH/VW*100).toFixed(2)}%`}}>
                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block',overflow:'visible'}}>
                                {/* Zone bands with labels */}
                                {zones.map(z=>{
                                  const y1=yAt(Math.min(z.to,rMax),rMax,rMin,CH);
                                  const y2=yAt(z.from,rMax,rMin,CH);
                                  return (
                                    <g key={z.label}>
                                      <rect x={pL} y={y1} width={cW} height={y2-y1} fill={z.fill} opacity="0.40"/>
                                       <text x={pL+10} y={(y1+y2)/2+4} fontSize="12" fill={z.labelColor} fontWeight="700" opacity="0.78">{z.label}</text>
                                    </g>
                                  );
                                })}
                                <YGrid ticks={[0,10,20,30,40,50,60,70,80,90,100]} max={rMax} min={rMin} chartH={CH}/>
                                {/* Threshold lines */}
                                {[
                                  {t:cvorThresholds.warning,     c:'#65a30d',lbl:historySize.thresholdLabel(cvorThresholds.warning, 'Warning')},
                                  {t:cvorThresholds.intervention, c:'#d97706',lbl:historySize.thresholdLabel(cvorThresholds.intervention, 'Audit')},
                                  {t:cvorThresholds.showCause,    c:'#dc2626',lbl:historySize.thresholdLabel(cvorThresholds.showCause, 'Show Cause')},
                                ].map(th=>(
                                  <g key={th.t}>
                                    <line x1={pL} x2={pL+cW} y1={yAt(th.t,rMax,rMin,CH)} y2={yAt(th.t,rMax,rMin,CH)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.90"/>
                                    <text x={pL+cW+8} y={yAt(th.t,rMax,rMin,CH)+3.5} fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>
                                  </g>
                                ))}
                                {/* Area + line */}
                                <path d={mkArea(histData,d=>d.rating,rMax,rMin,CH)} fill="#d97706" opacity="0.08"/>
                                <path d={mkPath(histData,d=>d.rating,rMax,rMin,CH)} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                                {/* Value labels on last/selected */}
                                {histData.map((d,i)=>{
                                  const cx=xAt(i), cy=yAt(d.rating,rMax,rMin,CH);
                                  const isSel=d.reportDate===cvorSelectedPull;
                                  const isLast=i===n-1;
                                  return (isLast||isSel)&&(
                                    <text key={i} x={cx} y={cy-14} textAnchor="middle" fontSize="10" fontWeight="bold"
                                      fill={isSel?'#6366f1':ratingColor(d.rating)} fontFamily="monospace" style={{pointerEvents:'none'}}>
                                      {d.rating.toFixed(2)}%
                                    </text>
                                  );
                                })}
                                <XAxis items={histData} chartH={CH}/>
                                <Dots items={histData} getY={d=>yAt(d.rating,rMax,rMin,CH)} chartId="r"
                                  dotFill={d=>ratingColor(d.rating)} focusMetric="rating" chartH={CH}/>
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ CHART 2: Category Contributions ══ */}
                      {(() => {
                        const CH2=historySize.midH, VH2=CH2+pT+pB;
                        const maxCat=Math.ceil(Math.max(...histData.map(d=>Math.max(d.colContrib,d.conContrib,d.insContrib)))+1);
                        const y2=(v:number)=>yAt(v,maxCat,0,CH2);
                        const cats=[
                          {key:'col',label:'Collisions (40%)',  vals:histData.map(d=>d.colContrib), color:'#3b82f6', focusMetric:'col'},
                          {key:'con',label:'Convictions (40%)', vals:histData.map(d=>d.conContrib), color:'#d97706', focusMetric:'con'},
                          {key:'ins',label:'Inspections (20%)', vals:histData.map(d=>d.insContrib), color:'#dc2626', focusMetric:'ins'},
                        ];
                        return (
                          <div className={historySize.sectionPad}>
                            <div className="mb-4 flex items-center gap-3 flex-wrap">
                              <span className={historySize.titleCls}>Category Contributions to Rating</span>
                              {cats.map(c=>(
                                <div key={c.key} className="flex items-center gap-1.5">
                                  <div className="w-5 h-1 rounded" style={{background:c.color}}/>
                                   <span className="text-[10px] font-medium text-slate-600">{c.label}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[10px] italic text-slate-400">Each line = weighted % contribution to CVOR score</span>
                            </div>
                            <div style={{position:'relative',width:'100%',paddingBottom:`${(VH2/VW*100).toFixed(2)}%`}}>
                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block',overflow:'visible'}}>
                                {[0,2,4,6,8].filter(v=>v<=maxCat).map(v=>(
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW} y1={y2(v)} y2={y2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                     <text x={pL-10} y={y2(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                  </g>
                                ))}
                                {cats.map(c=>(
                                  <path key={c.key}
                                    d={mkPath(histData,d=>c.key==='col'?d.colContrib:c.key==='con'?d.conContrib:d.insContrib,maxCat,0,CH2)}
                                    fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                                ))}
                                <XAxis items={histData} chartH={CH2}/>
                                {cats.map(c=>(
                                  <Dots key={c.key}
                                    items={histData}
                                    getY={d=>y2(c.key==='col'?d.colContrib:c.key==='con'?d.conContrib:d.insContrib)}
                                    chartId={`c-${c.key}`} dotFill={()=>c.color} focusMetric={c.focusMetric} chartH={CH2} showTooltip={false}/>
                                ))}
                                {cvorHoveredPull?.chart?.startsWith('c-') && (() => {
                                  const d = histData[cvorHoveredPull.idx];
                                  if (!d) return null;
                                  const focusMetric =
                                    cvorHoveredPull.chart === 'c-col' ? 'col' :
                                    cvorHoveredPull.chart === 'c-con' ? 'con' :
                                    'ins';
                                  const cy =
                                    focusMetric === 'col' ? y2(d.colContrib) :
                                    focusMetric === 'con' ? y2(d.conContrib) :
                                    y2(d.insContrib);
                                  return <Tip cx={xAt(cvorHoveredPull.idx)} cy={cy} d={d} focusMetric={focusMetric} chartH={CH2} />;
                                })()}
                              </svg>
                          </div>
                          </div>
                        );
                      })()}

                      {/* ══ CHART 3: OOS Rates ══ */}
                      {(() => {
                        const oosD=histData.filter(d=>d.oosOverall>0), no=oosD.length;
                        const CH3=historySize.midH, VH3=CH3+pT+pB;
                        const maxOos=Math.max(50,Math.ceil(Math.max(...oosD.map(d=>Math.max(d.oosOverall,d.oosVehicle)))/10)*10+5);
                        const y3=(v:number)=>yAt(v,maxOos,0,CH3);
                        const xO=(i:number)=>pL+(no>1?(i/(no-1))*cW:cW/2);
                        const mkOos=(vals:number[])=>vals.map((v,i)=>{
                          const gap=i>0?(new Date(oosD[i].reportDate).getTime()-new Date(oosD[i-1].reportDate).getTime())/86400000:0;
                          return `${i===0?'M':(gap>gapDays?'M':'L')}${xO(i).toFixed(1)},${y3(v).toFixed(1)}`;
                        }).join(' ');
                        const oosLines=[
                          {key:'ov',label:'Overall OOS%', vals:oosD.map(d=>d.oosOverall), color:'#6366f1', focusMetric:'oosOv'},
                          {key:'vh',label:'Vehicle OOS%', vals:oosD.map(d=>d.oosVehicle), color:'#ef4444', focusMetric:'oosVh'},
                          {key:'dr',label:'Driver OOS%',  vals:oosD.map(d=>d.oosDriver),  color:'#16a34a', focusMetric:'oosDr'},
                        ];
                        return (
                          <div className={historySize.sectionPad}>
                            <div className="mb-4 flex items-center gap-3 flex-wrap">
                              <span className={historySize.titleCls}>Out-of-Service Rates</span>
                              {oosLines.map(l=>(
                                <div key={l.key} className="flex items-center gap-1.5">
                                  <div className="w-5 h-1 rounded" style={{background:l.color}}/>
                                  <span className="text-[10px] font-medium text-slate-600">{l.label}</span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 border-t border-dashed border-slate-400"/>
                                <span className="text-[10px] text-slate-400">20% MTO threshold</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 border-t border-dashed border-red-400"/>
                                <span className="text-[10px] text-red-400">35% alert</span>
                              </div>
                            </div>
                            {no < 2 ? (
                              <div className="h-20 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No OOS data for selected pulls</div>
                            ) : (
                              <div style={{position:'relative',width:'100%',paddingBottom:`${(VH3/VW*100).toFixed(2)}%`}}>
                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block',overflow:'visible'}}>
                                  {/* Alert zone band above 20% */}
                                  <rect x={pL} y={y3(maxOos)} width={cW} height={y3(20)-y3(maxOos)} fill="#fecaca" opacity="0.15"/>
                                  {[0,10,20,30,40,50].filter(v=>v<=maxOos).map(v=>(
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW} y1={y3(v)} y2={y3(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                       <text x={pL-10} y={y3(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  {/* Threshold lines */}
                                  <line x1={pL} x2={pL+cW} y1={y3(20)} y2={y3(20)} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.8"/>
                                  <text x={pL+cW+8} y={y3(20)+3.5} fontSize="12" fontWeight="700" fill="#94a3b8">20%</text>
                                  <line x1={pL} x2={pL+cW} y1={y3(35)} y2={y3(35)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" opacity="0.6"/>
                                  <text x={pL+cW+8} y={y3(35)+3.5} fontSize="12" fontWeight="700" fill="#ef4444">35%</text>
                                  {oosLines.map(l=><path key={l.key} d={mkOos(l.vals)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>)}
                                  {/* Alert dots on high OOS */}
                                  {oosD.map((d,i)=>d.oosVehicle>35&&(
                                    <g key={i} style={{pointerEvents:'none'}}>
                                      <circle cx={xO(i)} cy={y3(d.oosVehicle)} r={8} fill="#ef4444" opacity="0.15"/>
                                    </g>
                                  ))}
                                  <XAxis items={oosD} chartH={CH3}/>
                                  {oosLines.map(l=>(
                                    <Dots key={l.key}
                                      items={oosD}
                                      getY={d=>y3(l.key==='ov'?d.oosOverall:l.key==='vh'?d.oosVehicle:d.oosDriver)}
                                      chartId={`o-${l.key}`} dotFill={()=>l.color} focusMetric={l.focusMetric} chartH={CH3}
                                      showTooltip={false}
                                      total={no}/>
                                  ))}
                                  {cvorHoveredPull?.chart?.startsWith('o-') && (() => {
                                    const d = oosD[cvorHoveredPull.idx];
                                    if (!d) return null;
                                    const focusMetric =
                                      cvorHoveredPull.chart === 'o-ov' ? 'oosOv' :
                                      cvorHoveredPull.chart === 'o-vh' ? 'oosVh' :
                                      'oosDr';
                                    const cy =
                                      focusMetric === 'oosOv' ? y3(d.oosOverall) :
                                      focusMetric === 'oosVh' ? y3(d.oosVehicle) :
                                      y3(d.oosDriver);
                                    return <Tip cx={xO(cvorHoveredPull.idx)} cy={cy} d={d} focusMetric={focusMetric} chartH={CH3} />;
                                  })()}
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ══ CHART 4: Event Counts & Points ══ */}
                      {(() => {
                        const CH4=historySize.eventH, VH4=CH4+pT+pB;
                        const maxE=Math.max(...histData.map(d=>Math.max(d.collisionEvents,d.convictionEvents)))+4;
                        const maxP=Math.max(...histData.map(d=>Math.max(d.totalCollisionPoints,d.convictionPoints)))+5;
                        const yE=(v:number)=>yAt(v,maxE,0,CH4);
                        const yP=(v:number)=>yAt(v,maxP,0,CH4);
                        const bw=Math.max(9,Math.min(24,cW/n*0.22));
                        const mkPts=(vals:number[],yFn:(v:number)=>number)=>
                          vals.map((v,i)=>{
                            const gap=i>0?(new Date(histData[i].reportDate).getTime()-new Date(histData[i-1].reportDate).getTime())/86400000:0;
                            return `${i===0?'M':(gap>gapDays?'M':'L')}${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`;
                          }).join(' ');
                        return (
                          <div className={historySize.sectionPad}>
                            <div className="mb-4 flex items-center gap-4 flex-wrap">
                              <span className={historySize.titleCls}>Event Counts &amp; Points per Pull</span>
                              {[
                                {lbl:'Collisions (bars)',   color:'#3b82f6', rect:true},
                                {lbl:'Convictions (bars)',  color:'#d97706', rect:true},
                                {lbl:'Col Points (line)',   color:'#6366f1', rect:false},
                                {lbl:'Conv Points (line)',  color:'#ec4899', rect:false},
                              ].map(l=>(
                                <div key={l.lbl} className="flex items-center gap-1.5">
                                  {l.rect
                                    ?<div className="w-3 h-3 rounded-sm border" style={{background:l.color+'22',borderColor:l.color}}/>
                                    :<div className="w-6 border-t-2 border-dashed" style={{borderColor:l.color}}/>
                                  }
                                  <span className="text-[10px] text-slate-600">{l.lbl}</span>
                                </div>
                              ))}
                              <span className={`ml-auto italic text-slate-400 ${historySize.helperCls}`}>Hover bar · full pull details · click to inspections</span>
                            </div>
                            <div style={{position:'relative',width:'100%',paddingBottom:`${(VH4/VW*100).toFixed(2)}%`}}>
                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block',overflow:'visible'}}>
                                {[0,5,10,15,20,25,30].filter(v=>v<=maxE).map(v=>(
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                     <text x={pL-10} y={yE(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
                                  </g>
                                ))}
                                {/* Points lines */}
                                <path d={mkPts(histData.map(d=>d.totalCollisionPoints),yP)} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"/>
                                <path d={mkPts(histData.map(d=>d.convictionPoints),yP)}      fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"/>
                                {/* Bars — pass 1: all bars (no tooltip) */}
                                {histData.map((d,i)=>{
                                  const cx4=xAt(i);
                                  const isSel4=d.reportDate===cvorSelectedPull;
                                  const isHov4=cvorHoveredPull?.chart==='ev'&&cvorHoveredPull?.idx===i;
                                  const al=alertLevel(d);
                                  return (
                                    <g key={i} style={{cursor:'pointer'}}
                                      onClick={()=>setCvorSelectedPull(isSel4?null:d.reportDate)}
                                      onMouseEnter={()=>setCvorHoveredPull({chart:'ev',idx:i})}
                                      onMouseLeave={()=>setCvorHoveredPull(null)}>
                                      {al==='critical'&&<rect x={cx4-bw-3} y={pT} width={bw*2+6} height={CH4} fill="#dc2626" opacity="0.04" rx="2"/>}
                                      {isSel4&&<rect x={cx4-bw-3} y={pT} width={bw*2+6} height={CH4} fill="#6366f1" opacity="0.06" rx="2"/>}
                                      <rect x={cx4-bw-1} y={yE(d.collisionEvents)} width={bw} height={pT+CH4-yE(d.collisionEvents)}
                                        fill={isHov4||isSel4?'#3b82f6':'#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2"/>
                                      <rect x={cx4+1} y={yE(d.convictionEvents)} width={bw} height={pT+CH4-yE(d.convictionEvents)}
                                        fill={isHov4||isSel4?'#d97706':'#d9770622'} stroke="#d97706" strokeWidth="1" rx="2"/>
                                      <text x={cx4-bw/2} y={yE(d.collisionEvents)-4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#1d4ed8" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.collisionEvents}</text>
                                      <text x={cx4+bw/2+1} y={yE(d.convictionEvents)-4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#92400e" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.convictionEvents}</text>
                                    </g>
                                  );
                                })}
                                <XAxis items={histData} chartH={CH4}/>
                                {/* Bars — pass 2: tooltip on top of everything */}
                                {cvorHoveredPull?.chart==='ev' && (() => {
                                  const d=histData[cvorHoveredPull.idx];
                                  if(!d) return null;
                                  return <Tip cx={xAt(cvorHoveredPull.idx)} cy={yE(Math.max(d.collisionEvents,d.convictionEvents))-20} d={d} focusMetric="events" chartH={CH4}/>;
                                })()}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ PULL-BY-PULL DATA TABLE ══ */}
                      <div className="px-6 py-5 pb-2">
                        {(() => {
                          const pullRows = [...histData].reverse().map((d, i) => {
                            const win = windowOf(d.reportDate);
                            const level = alertLevel(d);
                            const inspectionCount = inspectionsData.filter((r) => {
                              const rd = new Date(r.date);
                              return rd >= win.start && rd <= win.end;
                            }).length;
                            return {
                              id: `${d.reportDate}-${i}`,
                              idx: i,
                              pullDate: d.periodLabel,
                              window: win.label,
                              level,
                              rating: d.rating,
                              colPct: d.colContrib,
                              conPct: d.conContrib,
                              insPct: d.insContrib,
                              colCount: d.collisionEvents,
                              convCount: d.convictionEvents,
                              colPts: d.totalCollisionPoints || 0,
                              convPts: d.convictionPoints,
                              oosOverall: d.oosOverall,
                              oosVehicle: d.oosVehicle,
                              oosDriver: d.oosDriver,
                              trucks: d.trucks,
                              totalMiles: d.totalMiles,
                              inspectionCount,
                              isSelected: d.reportDate === cvorSelectedPull,
                              isLatest: i === 0,
                              reportDate: d.reportDate,
                              ts: win.end.getTime(),
                            };
                          });

                          const filteredRows = pullRows.filter((row) => {
                            if (cvorPullFilter === 'HEALTHY' && row.level !== 'healthy') return false;
                            if (cvorPullFilter === 'WARNING' && row.level !== 'warning') return false;
                            if (cvorPullFilter === 'CRITICAL' && row.level !== 'critical') return false;
                            if (cvorPullFilter === 'SELECTED' && !row.isSelected) return false;

                            const query = cvorPullSearch.trim().toLowerCase();
                            if (!query) return true;

                            const haystack = [
                              row.pullDate,
                              row.window,
                              row.level,
                              row.rating.toFixed(2),
                              row.colPct.toFixed(2),
                              row.conPct.toFixed(2),
                              row.insPct.toFixed(2),
                              row.oosOverall.toFixed(1),
                              row.oosVehicle.toFixed(1),
                              row.oosDriver.toFixed(1),
                              row.colCount,
                              row.convCount,
                              row.colPts,
                              row.convPts,
                              row.inspectionCount,
                            ].join(' ').toLowerCase();

                            return haystack.includes(query);
                          });

                          const sortedRows = [...filteredRows].sort((a, b) => {
                            const dir = cvorPullSort.dir === 'asc' ? 1 : -1;
                            const getValue = (row: typeof pullRows[number]) => {
                              switch (cvorPullSort.col) {
                                case 'pullDate': return row.ts;
                                case 'window': return row.window;
                                case 'status': return row.level;
                                case 'rating': return row.rating;
                                case 'colPct': return row.colPct;
                                case 'conPct': return row.conPct;
                                case 'insPct': return row.insPct;
                                case 'colCount': return row.colCount;
                                case 'convCount': return row.convCount;
                                case 'colPts': return row.colPts;
                                case 'convPts': return row.convPts;
                                case 'oosOverall': return row.oosOverall;
                                case 'oosVehicle': return row.oosVehicle;
                                case 'oosDriver': return row.oosDriver;
                                case 'trucks': return row.trucks;
                                case 'totalMiles': return row.totalMiles;
                                default: return row.ts;
                              }
                            };
                            const av = getValue(a);
                            const bv = getValue(b);
                            if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
                            return String(av).localeCompare(String(bv)) * dir;
                          });

                          const totalPages = Math.max(1, Math.ceil(sortedRows.length / cvorPullRowsPerPage));
                          const currentPage = Math.min(cvorPullPage, totalPages);
                          const pagedRows = sortedRows.slice(
                            (currentPage - 1) * cvorPullRowsPerPage,
                            currentPage * cvorPullRowsPerPage,
                          );
                          const visible = (id: string) => cvorPullColumns.find((col) => col.id === id)?.visible !== false;
                          const sortIcon = (id: string) => cvorPullSort.col === id ? (cvorPullSort.dir === 'asc' ? '↑' : '↓') : '';
                          const setSort = (id: string) => {
                            setCvorPullSort((prev) => ({
                              col: id,
                              dir: prev.col === id && prev.dir === 'asc' ? 'desc' : 'asc',
                            }));
                          };
                          const headerBtn = (id: string, label: string, tone = 'text-slate-500') => (
                            <button
                              type="button"
                              onClick={() => setSort(id)}
                              className={`inline-flex items-center gap-1 font-bold uppercase tracking-[0.14em] transition-colors hover:text-slate-800 ${tone}`}
                            >
                              <span>{label}</span>
                              <span className="text-[10px] text-slate-400">{sortIcon(id)}</span>
                            </button>
                          );
                          const statusBadge = (row: typeof pullRows[number]) => {
                            if (row.isSelected) return 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200';
                            if (row.level === 'critical') return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
                            if (row.level === 'warning') return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
                            return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
                          };

                          return (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Pull-by-Pull Data</span>
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[9.5px] font-mono text-slate-500">
                                  {pullRows.length} pulls · newest first · click row → inspection drill-down
                                </span>
                              </div>

                              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <DataListToolbar
                                  searchValue={cvorPullSearch}
                                  onSearchChange={setCvorPullSearch}
                                  searchPlaceholder="Search pull date, 24-month window, status, or metrics..."
                                  columns={cvorPullColumns}
                                  onToggleColumn={(id) => setCvorPullColumns((prev) => prev.map((col) => col.id === id ? { ...col, visible: !col.visible } : col))}
                                  totalItems={sortedRows.length}
                                  currentPage={currentPage}
                                  rowsPerPage={cvorPullRowsPerPage}
                                  onPageChange={setCvorPullPage}
                                  onRowsPerPageChange={setCvorPullRowsPerPage}
                                />

                                <div className="overflow-x-auto">
                                  <table className="w-full min-w-[1460px] border-collapse text-[13px]">
                                    <thead>
                                      <tr className="bg-slate-50/90 text-left text-[11px]">
                                        {visible('pullDate') && <th className="px-4 py-3">{headerBtn('pullDate', 'Pull Date')}</th>}
                                        {visible('window') && <th className="px-4 py-3">{headerBtn('window', '24-Month Window', 'text-indigo-500')}</th>}
                                        {visible('status') && <th className="px-4 py-3">{headerBtn('status', 'Status')}</th>}
                                        {visible('rating') && <th className="px-3 py-3 text-right">{headerBtn('rating', 'Rating')}</th>}
                                        {visible('colPct') && <th className="px-3 py-3 text-right">{headerBtn('colPct', 'Col%', 'text-blue-500')}</th>}
                                        {visible('conPct') && <th className="px-3 py-3 text-right">{headerBtn('conPct', 'Con%', 'text-amber-500')}</th>}
                                        {visible('insPct') && <th className="px-3 py-3 text-right">{headerBtn('insPct', 'Ins%', 'text-red-500')}</th>}
                                        {visible('colCount') && <th className="px-3 py-3 text-right">{headerBtn('colCount', '#Col')}</th>}
                                        {visible('convCount') && <th className="px-3 py-3 text-right">{headerBtn('convCount', '#Conv')}</th>}
                                        {visible('colPts') && <th className="px-3 py-3 text-right">{headerBtn('colPts', 'Col Pts', 'text-indigo-500')}</th>}
                                        {visible('convPts') && <th className="px-3 py-3 text-right">{headerBtn('convPts', 'Conv Pts', 'text-pink-500')}</th>}
                                        {visible('oosOverall') && <th className="px-3 py-3 text-right">{headerBtn('oosOverall', 'OOS Ov%', 'text-violet-500')}</th>}
                                        {visible('oosVehicle') && <th className="px-3 py-3 text-right">{headerBtn('oosVehicle', 'OOS Veh%', 'text-red-500')}</th>}
                                        {visible('oosDriver') && <th className="px-3 py-3 text-right">{headerBtn('oosDriver', 'OOS Drv%', 'text-emerald-500')}</th>}
                                        {visible('trucks') && <th className="px-3 py-3 text-right">{headerBtn('trucks', 'Trucks')}</th>}
                                        {visible('totalMiles') && <th className="px-3 py-3 text-right">{headerBtn('totalMiles', 'Total Mi')}</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                      {pagedRows.length > 0 ? pagedRows.map((row, rowIndex) => (
                                        <tr
                                          key={row.id}
                                          onClick={() => setCvorSelectedPull(row.isSelected ? null : row.reportDate)}
                                          className={`cursor-pointer transition-colors hover:bg-slate-50 ${row.isSelected ? 'bg-indigo-50/70' : rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                                        >
                                          {visible('pullDate') && (
                                            <td className="px-4 py-3.5 align-top">
                                              <div className="flex items-center gap-2">
                                                {row.isLatest && !row.isSelected && (
                                                  <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Latest</span>
                                                )}
                                                <div>
                                                  <div className="font-mono text-[13px] font-semibold text-slate-900">{row.pullDate}</div>
                                                  <div className="text-[11px] text-slate-500">Rolling 24-month pull</div>
                                                </div>
                                              </div>
                                            </td>
                                          )}
                                          {visible('window') && (
                                            <td className="px-4 py-3.5 align-top">
                                              <div className="font-mono text-[12px] font-semibold text-indigo-600">{row.window}</div>
                                              <div className="mt-1 inline-flex rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                                                {row.inspectionCount} inspections
                                              </div>
                                            </td>
                                          )}
                                          {visible('status') && (
                                            <td className="px-4 py-3.5 align-top">
                                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(row)}`}>
                                                {row.isSelected ? 'Selected' : row.level.charAt(0).toUpperCase() + row.level.slice(1)}
                                              </span>
                                            </td>
                                          )}
                                          {visible('rating') && (
                                            <td className="px-3 py-3.5 text-right font-mono text-[13px] font-bold text-emerald-700">{row.rating.toFixed(2)}%</td>
                                          )}
                                          {visible('colPct') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-blue-600">{row.colPct.toFixed(2)}%</td>}
                                          {visible('conPct') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-amber-600">{row.conPct.toFixed(2)}%</td>}
                                          {visible('insPct') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-red-600">{row.insPct.toFixed(2)}%</td>}
                                          {visible('colCount') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-700">{row.colCount}</td>}
                                          {visible('convCount') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-700">{row.convCount}</td>}
                                          {visible('colPts') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-indigo-600">{row.colPts}</td>}
                                          {visible('convPts') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-pink-600">{row.convPts}</td>}
                                          {visible('oosOverall') && (
                                            <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosOverall >= 20 ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                                              {row.oosOverall > 0 ? `${row.oosOverall.toFixed(1)}%` : '—'}
                                            </td>
                                          )}
                                          {visible('oosVehicle') && (
                                            <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosVehicle >= 20 ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                                              {row.oosVehicle > 0 ? `${row.oosVehicle.toFixed(1)}%` : '—'}
                                            </td>
                                          )}
                                          {visible('oosDriver') && (
                                            <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosDriver > 5 ? 'font-semibold text-amber-600' : 'text-emerald-600'}`}>
                                              {row.oosDriver > 0 ? `${row.oosDriver.toFixed(1)}%` : '—'}
                                            </td>
                                          )}
                                          {visible('trucks') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-600">{row.trucks}</td>}
                                          {visible('totalMiles') && <td className="px-3 py-3.5 text-right font-mono text-[12.5px] text-slate-600">{(row.totalMiles / 1_000_000).toFixed(2)}M</td>}
                                        </tr>
                                      )) : (
                                        <tr>
                                          <td colSpan={Math.max(1, cvorPullColumns.filter((col) => col.visible).length)} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center">
                                              <div className="mb-4 rounded-full border border-slate-200 bg-white p-4 shadow-sm">
                                                <AlertCircle size={28} className="text-slate-400" />
                                              </div>
                                              <div className="text-lg font-bold text-slate-900">No pull history matches your filters</div>
                                              <div className="mt-1 max-w-md text-sm text-slate-500">
                                                Search by pull date or 24-month window, or clear the selected KPI filter to view the full history.
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setCvorPullSearch('');
                                                  setCvorPullFilter('ALL');
                                                  setCvorPullSort({ col: 'pullDate', dir: 'desc' });
                                                }}
                                                className="mt-5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
                                              >
                                                Clear filters
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>

                                <PaginationBar
                                  totalItems={sortedRows.length}
                                  currentPage={currentPage}
                                  rowsPerPage={cvorPullRowsPerPage}
                                  onPageChange={setCvorPullPage}
                                  onRowsPerPageChange={setCvorPullRowsPerPage}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="hidden px-6 py-5 pb-2">
                        <div className="mb-4 flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Pull-by-Pull Data</span>
                          <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls · newest first · click row → inspection drill-down</span>
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                          <table className="w-full text-[12px] border-collapse" style={{minWidth:'1200px'}}>
                            <thead>
                              <tr className="bg-slate-800 text-white sticky top-0 z-10 text-[11.5px]">
                                <th className="text-left px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Pull Date</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-indigo-300 whitespace-nowrap">24-Month Window</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-200">Rating</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-blue-300">Col%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-amber-300">Con%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300">Ins%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">#Col</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">#Conv</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-indigo-300">Col Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-pink-300">Conv Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-violet-300">OOS Ov%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300">OOS Veh%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-emerald-300">OOS Drv%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">Trucks</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">Total Mi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...histData].reverse().map((d, i) => {
                                const win = windowOf(d.reportDate);
                                const al = alertLevel(d);
                                const isSel = d.reportDate === cvorSelectedPull;
                                const isLatest = i === 0;
                                const inWin = inspectionsData.filter(r => {
                                  const rd = new Date(r.date); return rd >= win.start && rd <= win.end;
                                });
                                const ratingBadgeCls =
                                  d.rating >= cvorThresholds.showCause   ? 'bg-red-100 text-red-700 font-bold' :
                                  d.rating >= cvorThresholds.intervention ? 'bg-amber-100 text-amber-700 font-bold' :
                                  d.rating >= cvorThresholds.warning      ? 'bg-yellow-100 text-yellow-700 font-semibold' :
                                                                            'bg-emerald-100 text-emerald-700';
                                const rowBg = isSel ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' :
                                  al==='critical' ? 'bg-red-50/60 border-l-[3px] border-l-red-400' :
                                  al==='warning'  ? 'bg-amber-50/40 border-l-[3px] border-l-amber-400' :
                                  isLatest ? 'bg-blue-50 border-l-[3px] border-l-blue-400' :
                                  i%2===0 ? 'bg-white' : 'bg-slate-50/50';
                                return (
                                  <tr key={i} className={`border-b border-slate-100 cursor-pointer transition-colors hover:brightness-95 ${rowBg}`}
                                    onClick={() => setCvorSelectedPull(isSel ? null : d.reportDate)}>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {isSel && <span className="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">▶ ON</span>}
                                        {!isSel && isLatest && <span className="text-[8px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">LATEST</span>}
                                        {!isSel && al==='critical' && <span className="text-[8px] font-bold text-red-600">⚠</span>}
                                        <span className="font-mono font-semibold text-slate-800">{d.periodLabel}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <span className="text-[10px] font-mono text-indigo-600">{win.label}</span>
                                      {inWin.length > 0 && (
                                        <span className="ml-1.5 text-[8.5px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{inWin.length} insp.</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${ratingBadgeCls}`}>{d.rating.toFixed(2)}%</span>
                                    </td>
                                    <td className="px-2 py-2.5 text-right font-mono text-blue-600 whitespace-nowrap">{d.colContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-amber-600 whitespace-nowrap">{d.conContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-red-600 whitespace-nowrap">{d.insContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">{d.collisionEvents}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">{d.convictionEvents}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-indigo-600 whitespace-nowrap">{d.totalCollisionPoints||'—'}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-pink-600 whitespace-nowrap">{d.convictionPoints}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosOverall>20?'text-red-600 font-bold':'text-slate-600'}`}>{d.oosOverall>0?`${d.oosOverall.toFixed(1)}%`:'—'}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosVehicle>20?'text-red-600 font-bold':'text-slate-600'}`}>{d.oosVehicle>0?`${d.oosVehicle.toFixed(1)}%`:'—'}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosDriver>5?'text-amber-600 font-semibold':'text-emerald-600'}`}>{d.oosDriver>0?`${d.oosDriver.toFixed(1)}%`:'—'}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">{d.trucks}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">{(d.totalMiles/1_000_000).toFixed(2)}M</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ══ INSPECTIONS DRILL-DOWN ══ */}
                      {cvorSelectedPull && (() => {
                        const pullObj = cvorPeriodicReports.find(d => d.reportDate === cvorSelectedPull);
                        if (!pullObj) return null;
                        const win = windowOf(cvorSelectedPull);
                        const pullInspections = [...inspectionsData]
                          .filter(r => { const rd = new Date(r.date); return rd >= win.start && rd <= win.end; })
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const calcCvor = (r: any) => {
                          const veh = r.cvorPoints?.vehicle ?? (r.violations||[]).filter((v:any)=>!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
                          const dvr = r.cvorPoints?.driver  ?? (r.violations||[]).filter((v:any)=>!!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
                          return { veh, dvr, cvr: r.cvorPoints?.cvor ?? veh+dvr };
                        };
                        const totalCvrPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).cvr,0);
                        const totalVehPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).veh,0);
                        const totalDvrPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).dvr,0);
                        const oosCount     = pullInspections.filter(r=>r.hasOOS).length;
                        const cleanCount   = pullInspections.filter(r=>r.isClean).length;
                        const withPtsCount = pullInspections.filter(r=>calcCvor(r).cvr>0).length;
                        const al = alertLevel(pullObj);
                        const accentColor = al==='critical'
                          ? 'border-red-200 bg-red-50/60'
                          : al==='warning'
                            ? 'border-amber-200 bg-amber-50/60'
                            : 'border-indigo-200 bg-indigo-50/40';
                        const detailWindowLabel = `${win.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to ${win.end.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                        return (
                          <div className={`mt-4 overflow-hidden rounded-[24px] border shadow-[0_16px_40px_-26px_rgba(15,23,42,0.35)] ${accentColor}`}>
                            <div className="border-b border-white/70 px-5 py-4 sm:px-6">
                              <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex items-start gap-3">
                                  <div className={`mt-0.5 h-11 w-1.5 rounded-full flex-shrink-0 ${al==='critical'?'bg-red-500':al==='warning'?'bg-amber-500':'bg-indigo-500'}`}/>
                                  <div className="space-y-1">
                                    <div className="text-xl font-bold tracking-tight text-slate-900">CVOR Inspections - {pullObj.periodLabel}</div>
                                  <div className="hidden text-sm font-bold text-slate-800">CVOR Inspections — {pullObj.periodLabel}</div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                    <span className="font-semibold text-indigo-600">Window:</span>
                                    <span className="rounded-full bg-white/85 px-2.5 py-0.5 font-mono font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">{detailWindowLabel}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    These inspections drive the <span className="font-bold text-slate-700">{pullObj.rating.toFixed(2)}%</span> CVOR rating for this pull
                                    {al==='critical'&&<span className="ml-2 text-red-600 font-semibold">Above audit threshold</span>}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => setCvorSelectedPull(null)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-semibold text-slate-500 shadow-sm transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-700"
                              >
                                <X size={14} />
                                <span>Close</span>
                              </button>
                            </div>
                            </div>
                            <div className="space-y-5 px-4 py-5 sm:px-6 sm:py-6">
                            {/* Impact summary */}
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
                              {[
                                {label:'Inspections',      val:String(pullInspections.length), sub:'in 24-mo window',  color:'text-slate-800', bg:'bg-slate-50', border:'border-slate-200'},
                                {label:'CVOR Impact',      val:String(withPtsCount),           sub:'have CVOR pts',    color:'text-red-700',   bg:'bg-red-50',   border:'border-red-200'},
                                {label:'OOS',              val:String(oosCount),               sub:'out-of-service',   color:'text-red-700',   bg:'bg-red-50',   border:'border-red-200'},
                                {label:'Clean',            val:String(cleanCount),             sub:'no violations',    color:'text-emerald-700',bg:'bg-emerald-50',border:'border-emerald-200'},
                                {label:'Veh Pts',          val:String(totalVehPts),            sub:'vehicle CVOR',     color:'text-orange-700',bg:'bg-orange-50',border:'border-orange-200'},
                                {label:'Dvr Pts',          val:String(totalDvrPts),            sub:'driver CVOR',      color:'text-amber-700', bg:'bg-amber-50', border:'border-amber-200'},
                                {label:'CVOR Pts',         val:String(totalCvrPts),            sub:'combined impact',  color:'text-indigo-700',bg:'bg-indigo-50',border:'border-indigo-200'},
                              ].map(c=>(
                                <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl px-4 py-3.5 shadow-sm`}>
                                  <div className={`text-[30px] font-black leading-none ${c.color}`}>{c.val}</div>
                                  <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{c.label}</div>
                                  <div className="mt-1 text-[10px] text-slate-500">{c.sub}</div>
                                </div>
                              ))}
                            </div>
                            {/* Category breakdown */}
                            <div className="grid gap-3 md:grid-cols-3">
                              {[
                                {label:'Collisions',  pct:pullObj.colContrib, thresh:pullObj.colPctOfThresh, weight:40, color:'blue',  events:pullObj.collisionEvents,  pts:pullObj.totalCollisionPoints},
                                {label:'Convictions', pct:pullObj.conContrib, thresh:pullObj.conPctOfThresh, weight:40, color:'amber', events:pullObj.convictionEvents, pts:pullObj.convictionPoints},
                                {label:'Inspections', pct:pullObj.insContrib, thresh:pullObj.insPctOfThresh, weight:20, color:'red',   events:pullInspections.length,   pts:totalCvrPts},
                              ].map(cat=>{
                                const barColor=cat.color==='blue'?'#2563eb':cat.color==='amber'?'#d97706':'#dc2626';
                                const borderCls=cat.color==='blue'?'border-blue-200':cat.color==='amber'?'border-amber-200':'border-red-200';
                                const textCls=cat.color==='blue'?'text-blue-700':cat.color==='amber'?'text-amber-700':'text-red-700';
                                const softBg=cat.color==='blue'?'bg-blue-50/70':cat.color==='amber'?'bg-amber-50/70':'bg-red-50/70';
                                const zoneLabel =
                                  cat.thresh >= cvorThresholds.showCause ? 'SHOW CAUSE' :
                                  cat.thresh >= cvorThresholds.intervention ? 'AUDIT' :
                                  cat.thresh >= cvorThresholds.warning ? 'WARN' :
                                  'OK';
                                const zoneBadge =
                                  cat.thresh >= cvorThresholds.showCause
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : cat.thresh >= cvorThresholds.intervention
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : cat.thresh >= cvorThresholds.warning
                                        ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                const grad='linear-gradient(90deg,#fde68a 0%,#facc15 35%,#fb923c 50%,#f87171 85%,#991b1b 100%)';
                                return (
                                  <div key={cat.label} className={`group/tileinfo relative rounded-2xl border p-4 shadow-sm ${softBg} ${borderCls}`}>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{cat.label}</span>
                                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${zoneBadge}`}>{zoneLabel}</span>
                                    </div>
                                    <div className={`text-[42px] font-black leading-none ${textCls}`}>
                                      {cat.thresh.toFixed(1)}%
                                    </div>
                                    <div className="mt-2 text-[12px] text-slate-600">
                                      {cat.events} {cat.label === 'Inspections' ? 'inspections' : cat.label.toLowerCase()} - {cat.pts} pts
                                    </div>
                                    <div className="mt-1 text-[10px] font-medium text-slate-500">
                                      {zoneLabel} - {cat.weight}% weight
                                    </div>
                                    <div className="relative mt-3">
                                      <div
                                        className="relative h-[7px] cursor-pointer overflow-hidden rounded-full"
                                        style={{ background: grad, boxShadow:'inset 0 1px 3px rgba(0,0,0,0.18)' }}
                                      >
                                        <div
                                          className="absolute inset-y-0 right-0 rounded-r-full bg-slate-900/30"
                                          style={{ left:`${Math.min(cat.thresh,100)}%` }}
                                        />
                                        <div
                                          className="absolute inset-y-0 w-[2px] bg-white shadow"
                                          style={{ left:`${Math.min(cat.thresh,100)}%`, transform:'translateX(-50%)' }}
                                        />
                                        {[cvorThresholds.warning, cvorThresholds.intervention, cvorThresholds.showCause].map((t) => (
                                          <div key={t} className="absolute inset-y-0 w-px bg-white/60" style={{ left:`${t}%` }} />
                                        ))}
                                      </div>
                                      <div className="mt-1 flex justify-between text-[8.5px] text-slate-400">
                                        <span>WARN {cvorThresholds.warning}%</span>
                                        <span>AUDIT {cvorThresholds.intervention}%</span>
                                        <span>SC {cvorThresholds.showCause}%</span>
                                      </div>
                                      <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden w-[240px] -translate-x-1/2 -translate-y-[calc(100%+18px)] group-hover/tileinfo:block">
                                        <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-2xl" style={{ background:'#0f172a' }}>
                                          <div className="flex items-center justify-between px-3.5 py-2" style={{ background: barColor }}>
                                            <span className="text-[12px] font-black uppercase tracking-wide text-white">{cat.label}</span>
                                            <span className="font-mono text-[12px] font-bold text-white">{cat.thresh.toFixed(1)}%</span>
                                          </div>
                                          <div className="space-y-1.5 px-3.5 py-2.5">
                                            <div className="flex justify-between text-[11px]">
                                              <span className="text-slate-400">Status</span>
                                              <span className="font-bold" style={{ color: barColor }}>{zoneLabel}</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                              <span className="text-slate-400">Weighted Contribution</span>
                                              <span className="font-bold text-white">{cat.pct.toFixed(2)}%</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                              <span className="text-slate-400">Category Weight</span>
                                              <span className="font-bold text-white">{cat.weight}%</span>
                                            </div>
                                            <div className="flex justify-between text-[11px]">
                                              <span className="text-slate-400">Events / Points</span>
                                              <span className="font-bold text-white">{cat.events} / {cat.pts}</span>
                                            </div>
                                            <div className="border-t border-slate-700/60 pt-1.5">
                                              <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Thresholds</div>
                                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                {([
                                                  { n:'Warning', v:cvorThresholds.warning, c:'#facc15' },
                                                  { n:'Audit', v:cvorThresholds.intervention, c:'#fb923c' },
                                                  { n:'Show Cause', v:cvorThresholds.showCause, c:'#f87171' },
                                                  { n:'Current', v:cat.thresh, c:barColor },
                                                ] as {n:string;v:number;c:string}[]).map((th) => (
                                                  <div key={th.n} className="flex items-center justify-between">
                                                    <span className="text-[9px]" style={{ color: th.c }}>{th.n}</span>
                                                    <span className="font-mono text-[10px] font-bold text-white">{th.v.toFixed(1)}%</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-900" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Inspection list */}
                            {(() => {
                              const detailRows = pullInspections.map((record, ri) => {
                                const pts = calcCvor(record);
                                const primaryUnit = record.units?.[0];
                                const categories = (() => {
                                  const cats = new Map<string, { isOos: boolean; pts: number }>();
                                  for (const violation of (record.violations || [])) {
                                    const label = violation.category || 'Other';
                                    const current = cats.get(label);
                                    if (!current) cats.set(label, { isOos: !!violation.oos, pts: violation.points || 0 });
                                    else cats.set(label, { isOos: current.isOos || !!violation.oos, pts: current.pts + (violation.points || 0) });
                                  }
                                  return Array.from(cats.entries()).map(([label, info]) => ({ label, ...info }));
                                })();
                                const status = record.hasOOS ? 'OOS' : record.isClean ? 'OK' : 'DEFECT';
                                const timestamp = new Date(`${record.date}T${record.startTime || '00:00'}`).getTime();
                                return {
                                  id: `${record.id}-${ri}`,
                                  record,
                                  pts,
                                  date: record.date,
                                  time: record.startTime && record.endTime ? `${record.startTime} - ${record.endTime}` : record.startTime || '--',
                                  timestamp,
                                  report: record.id,
                                  locationCity: record.location?.city || record.state || '--',
                                  locationRegion: record.location ? `${record.location.province}, CAN` : `${record.state}, CAN`,
                                  driverName: record.driver?.split(',')[0] || 'Unknown driver',
                                  driverId: record.driverLicense || record.driverId || '--',
                                  vehicleName: primaryUnit?.license || record.vehiclePlate || '--',
                                  defectText: record.powerUnitDefects || (record.isClean ? 'No defects' : 'No defect details'),
                                  violationCount: (record.violations || []).length,
                                  vehPts: pts.veh ?? 0,
                                  dvrPts: pts.dvr ?? 0,
                                  cvorPts: pts.cvr,
                                  status,
                                  hasOos: !!record.hasOOS,
                                  isClean: !!record.isClean,
                                  categories,
                                  violations: record.violations || [],
                                };
                              });

                              const detailStats = {
                                all: detailRows.length,
                                clean: detailRows.filter((row) => row.isClean).length,
                                oos: detailRows.filter((row) => row.hasOos).length,
                                impact: detailRows.filter((row) => row.cvorPts > 0).length,
                                defect: detailRows.filter((row) => !row.isClean).length,
                              };

                              const filteredRows = detailRows.filter((row) => {
                                if (cvorPullDetailFilter === 'CLEAN' && !row.isClean) return false;
                                if (cvorPullDetailFilter === 'OOS' && !row.hasOos) return false;
                                if (cvorPullDetailFilter === 'IMPACT' && row.cvorPts <= 0) return false;
                                if (cvorPullDetailFilter === 'DEFECT' && row.isClean) return false;

                                const query = cvorPullDetailSearch.trim().toLowerCase();
                                if (!query) return true;

                                const haystack = [
                                  row.date,
                                  row.time,
                                  win.label,
                                  row.report,
                                  row.locationCity,
                                  row.locationRegion,
                                  row.driverName,
                                  row.driverId,
                                  row.vehicleName,
                                  row.defectText,
                                  row.status,
                                  row.violationCount,
                                  row.vehPts,
                                  row.dvrPts,
                                  row.cvorPts,
                                ].join(' ').toLowerCase();

                                return haystack.includes(query);
                              });

                              const sortedRows = [...filteredRows].sort((a, b) => {
                                const dir = cvorPullDetailSort.dir === 'asc' ? 1 : -1;
                                const getValue = (row: typeof detailRows[number]) => {
                                  switch (cvorPullDetailSort.col) {
                                    case 'date': return row.timestamp;
                                    case 'report': return row.report;
                                    case 'location': return `${row.locationCity} ${row.locationRegion}`;
                                    case 'driver': return `${row.driverName} ${row.driverId}`;
                                    case 'vehicle': return `${row.vehicleName} ${row.defectText}`;
                                    case 'violations': return row.violationCount;
                                    case 'vehPts': return row.vehPts;
                                    case 'dvrPts': return row.dvrPts;
                                    case 'cvorPts': return row.cvorPts;
                                    case 'status': return row.status;
                                    default: return row.timestamp;
                                  }
                                };
                                const av = getValue(a);
                                const bv = getValue(b);
                                if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
                                return String(av).localeCompare(String(bv)) * dir;
                              });

                              const totalPages = Math.max(1, Math.ceil(sortedRows.length / cvorPullDetailRowsPerPage));
                              const currentPage = Math.min(cvorPullDetailPage, totalPages);
                              const pagedRows = sortedRows.slice(
                                (currentPage - 1) * cvorPullDetailRowsPerPage,
                                currentPage * cvorPullDetailRowsPerPage,
                              );
                              const visible = (id: string) => cvorPullDetailColumns.find((col) => col.id === id)?.visible !== false;
                              const sortIcon = (id: string) => cvorPullDetailSort.col === id ? (cvorPullDetailSort.dir === 'asc' ? '↑' : '↓') : '';
                              const setSort = (id: string) => {
                                setCvorPullDetailSort((prev) => ({
                                  col: id,
                                  dir: prev.col === id && prev.dir === 'asc' ? 'desc' : 'asc',
                                }));
                              };
                              const headerBtn = (id: string, label: string, tone = 'text-slate-500') => (
                                <button
                                  type="button"
                                  onClick={() => setSort(id)}
                                  className={`inline-flex items-center gap-1 font-bold uppercase tracking-[0.14em] transition-colors hover:text-slate-800 ${tone}`}
                                >
                                  <span>{label}</span>
                                  <span className="text-[10px] text-slate-400">{sortIcon(id)}</span>
                                </button>
                              );
                              const visibleCount = Math.max(1, cvorPullDetailColumns.filter((col) => col.visible).length);

                              return (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                                    <MiniKpiCard title="All" value={detailStats.all} icon={ClipboardCheck} color="gray" active={cvorPullDetailFilter === 'ALL'} onClick={() => setCvorPullDetailFilter('ALL')} />
                                    <MiniKpiCard title="Clean" value={detailStats.clean} icon={CheckCircle2} color="emerald" active={cvorPullDetailFilter === 'CLEAN'} onClick={() => setCvorPullDetailFilter('CLEAN')} />
                                    <MiniKpiCard title="OOS" value={detailStats.oos} icon={ShieldAlert} color="red" active={cvorPullDetailFilter === 'OOS'} onClick={() => setCvorPullDetailFilter('OOS')} />
                                    <MiniKpiCard title="Impact" value={detailStats.impact} icon={Target} color="indigo" active={cvorPullDetailFilter === 'IMPACT'} onClick={() => setCvorPullDetailFilter('IMPACT')} />
                                    <MiniKpiCard title="Defect" value={detailStats.defect} icon={AlertTriangle} color="orange" active={cvorPullDetailFilter === 'DEFECT'} onClick={() => setCvorPullDetailFilter('DEFECT')} />
                                  </div>

                                  <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_34px_-24px_rgba(15,23,42,0.28)]">
                                    <DataListToolbar
                                      searchValue={cvorPullDetailSearch}
                                      onSearchChange={setCvorPullDetailSearch}
                                      searchPlaceholder="Search date, time, window, report, driver, unit, or status..."
                                      columns={cvorPullDetailColumns}
                                      onToggleColumn={(id) => setCvorPullDetailColumns((prev) => prev.map((col) => col.id === id ? { ...col, visible: !col.visible } : col))}
                                      totalItems={sortedRows.length}
                                      currentPage={currentPage}
                                      rowsPerPage={cvorPullDetailRowsPerPage}
                                      onPageChange={setCvorPullDetailPage}
                                      onRowsPerPageChange={setCvorPullDetailRowsPerPage}
                                    />

                                    <div className="overflow-x-auto px-1 pb-1">
                                      <table className="w-full min-w-[1340px] border-separate border-spacing-0 text-[13px]">
                                        <thead>
                                          <tr className="bg-slate-50/90 text-left text-[11px]">
                                            {visible('date') && <th className="px-4 py-3.5">{headerBtn('date', 'Date / Time')}</th>}
                                            {visible('report') && <th className="px-4 py-3.5">{headerBtn('report', 'Report ID', 'text-indigo-500')}</th>}
                                            {visible('location') && <th className="px-4 py-3.5">{headerBtn('location', 'Location')}</th>}
                                            {visible('driver') && <th className="px-4 py-3.5">{headerBtn('driver', 'Driver / Licence')}</th>}
                                            {visible('vehicle') && <th className="px-4 py-3.5">{headerBtn('vehicle', 'Power Unit / Defects')}</th>}
                                            {visible('violations') && <th className="px-3 py-3.5 text-center">{headerBtn('violations', 'Violations')}</th>}
                                            {visible('vehPts') && <th className="px-3 py-3.5 text-center">{headerBtn('vehPts', 'Veh Pts', 'text-orange-500')}</th>}
                                            {visible('dvrPts') && <th className="px-3 py-3.5 text-center">{headerBtn('dvrPts', 'Dvr Pts', 'text-amber-500')}</th>}
                                            {visible('cvorPts') && <th className="px-3 py-3.5 text-center">{headerBtn('cvorPts', 'CVOR Pts', 'text-rose-500')}</th>}
                                            {visible('status') && <th className="px-4 py-3.5">{headerBtn('status', 'Status')}</th>}
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                          {pagedRows.length > 0 ? pagedRows.map((row) => (
                                            <Fragment key={row.id}>
                                              <tr
                                                onClick={() => setCvorPullDetailExpanded((prev) => prev === row.id ? null : row.id)}
                                                className="cursor-pointer bg-white transition-colors hover:bg-slate-50/90"
                                              >
                                                {visible('date') && (
                                                  <td className="px-4 py-4.5 align-top">
                                                    <div className="font-mono text-[13px] font-semibold text-slate-900">{row.date}</div>
                                                    <div className="mt-1 text-[11px] text-slate-500">{row.time}</div>
                                                  </td>
                                                )}
                                                {visible('report') && (
                                                  <td className="px-4 py-4.5 align-top">
                                                    <div className="text-[13px] font-bold text-blue-600">{row.report}</div>
                                                    <div className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide ${getInspectionTagSpecs('CVOR', row.record.level)}`}>
                                                      CVOR L{row.record.level?.replace(/level\s*/i, '') || '1'}
                                                    </div>
                                                  </td>
                                                )}
                                                {visible('location') && (
                                                  <td className="px-4 py-4.5 align-top">
                                                    <div className="text-[13px] font-semibold text-slate-800">{row.locationCity}</div>
                                                    <div className="mt-1 text-[11px] text-slate-500">{row.locationRegion}</div>
                                                  </td>
                                                )}
                                                {visible('driver') && (
                                                  <td className="px-4 py-4.5 align-top">
                                                    <div className="text-[13px] font-semibold text-slate-800">{row.driverName}</div>
                                                    <div className="mt-1 font-mono text-[11px] text-slate-500">{row.driverId}</div>
                                                  </td>
                                                )}
                                                {visible('vehicle') && (
                                                  <td className="px-4 py-4.5 align-top">
                                                    <div className="text-[13px] font-semibold text-slate-800">{row.vehicleName}</div>
                                                    <div className={`mt-1 text-[11px] ${row.record.powerUnitDefects ? 'text-amber-600' : 'text-emerald-600'}`}>{row.defectText}</div>
                                                  </td>
                                                )}
                                                {visible('violations') && (
                                                  <td className="px-3 py-4.5 text-center align-top">
                                                    <span className={`text-[13px] font-bold ${row.isClean ? 'text-emerald-600' : 'text-orange-600'}`}>
                                                      {row.isClean ? 'Clean' : row.violationCount}
                                                    </span>
                                                  </td>
                                                )}
                                                {visible('vehPts') && (
                                                  <td className="px-3 py-4.5 text-center align-top">
                                                    <span className={`text-[13px] font-bold ${row.vehPts > 0 ? 'text-red-600' : 'text-slate-400'}`}>{row.vehPts || 0}</span>
                                                  </td>
                                                )}
                                                {visible('dvrPts') && (
                                                  <td className="px-3 py-4.5 text-center align-top">
                                                    <span className={`text-[13px] font-bold ${row.dvrPts > 0 ? 'text-red-600' : 'text-slate-400'}`}>{row.dvrPts || 0}</span>
                                                  </td>
                                                )}
                                                {visible('cvorPts') && (
                                                  <td className="px-3 py-4.5 text-center align-top">
                                                    <span className={`text-[13px] font-bold ${row.cvorPts > 0 ? 'text-red-700' : 'text-slate-400'}`}>{row.cvorPts}</span>
                                                  </td>
                                                )}
                                                {visible('status') && (
                                                  <td className="px-4 py-4.5 align-top">
                                                    <div className="flex items-center justify-between gap-3">
                                                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                        row.hasOos
                                                          ? 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200'
                                                          : row.isClean
                                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                                                            : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                                                      }`}>
                                                        {row.status}
                                                      </span>
                                                      <span className="text-slate-400">{cvorPullDetailExpanded === row.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                                                    </div>
                                                  </td>
                                                )}
                                              </tr>
                                              {cvorPullDetailExpanded === row.id && (
                                                <tr className="bg-slate-50/80">
                                                  <td colSpan={visibleCount} className="px-5 py-5">
                                                    <div className="space-y-4">
                                                      <div className="grid gap-3 md:grid-cols-4">
                                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                                                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Window</div>
                                                          <div className="mt-1 font-mono text-[12px] font-semibold text-indigo-600">{detailWindowLabel}</div>
                                                        </div>
                                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                                                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Driver</div>
                                                          <div className="mt-1 text-[12px] font-semibold text-slate-800">{row.driverName}</div>
                                                          <div className="text-[11px] text-slate-500">{row.driverId}</div>
                                                        </div>
                                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                                                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Unit / Defects</div>
                                                          <div className="mt-1 text-[12px] font-semibold text-slate-800">{row.vehicleName}</div>
                                                          <div className={`text-[11px] ${row.record.powerUnitDefects ? 'text-amber-600' : 'text-emerald-600'}`}>{row.defectText}</div>
                                                        </div>
                                                        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                                                          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Impact</div>
                                                          <div className="mt-1 text-[12px] font-semibold text-slate-800">{row.cvorPts} CVOR pts</div>
                                                          <div className="text-[11px] text-slate-500">{row.vehPts} vehicle / {row.dvrPts} driver</div>
                                                        </div>
                                                      </div>

                                                      {!row.isClean && row.categories.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">CVOR Violation Categories</span>
                                                          {row.categories.map((item) => (
                                                            <span
                                                              key={item.label}
                                                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${item.isOos ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
                                                            >
                                                              <span className={`h-1.5 w-1.5 rounded-full ${item.isOos ? 'bg-red-500' : 'bg-amber-500'}`} />
                                                              {item.label}
                                                              {item.isOos && <span className="rounded bg-red-100 px-1 text-[9px] font-black text-red-700">OOS</span>}
                                                              {item.pts > 0 && <span className="text-[9px] font-bold opacity-70">{item.pts}pt</span>}
                                                            </span>
                                                          ))}
                                                        </div>
                                                      )}

                                                      {!row.isClean && row.violations.length > 0 && (
                                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                          {row.violations.slice(0, 6).map((violation: any, violationIndex: number) => (
                                                            <div key={`${row.id}-violation-${violationIndex}`} className="rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                                                              <div className="flex items-center justify-between gap-2">
                                                                <div className="text-[12px] font-semibold text-slate-800">{violation.category || 'Violation'}</div>
                                                                <div className="flex items-center gap-1.5">
                                                                  {violation.oos && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-700 ring-1 ring-inset ring-red-200">OOS</span>}
                                                                  <span className="text-[10px] font-bold text-slate-500">{violation.points || 0} pts</span>
                                                                </div>
                                                              </div>
                                                              <div className="mt-1 text-[11px] text-slate-500">{violation.code || violation.description || 'No additional detail'}</div>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </Fragment>
                                          )) : (
                                            <tr>
                                              <td colSpan={visibleCount} className="px-6 py-16 text-center">
                                                <div className="flex flex-col items-center">
                                                  <div className="mb-4 rounded-full border border-slate-200 bg-white p-4 shadow-sm">
                                                    <AlertCircle size={28} className="text-slate-400" />
                                                  </div>
                                                  <div className="text-lg font-bold text-slate-900">No inspections match your filters</div>
                                                  <div className="mt-1 max-w-md text-sm text-slate-500">
                                                    Search by date, time, report, driver, unit, or status, or clear the active filter cards.
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setCvorPullDetailSearch('');
                                                      setCvorPullDetailFilter('ALL');
                                                      setCvorPullDetailSort({ col: 'date', dir: 'desc' });
                                                    }}
                                                    className="mt-5 rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-600 shadow-sm transition-colors hover:bg-blue-50"
                                                  >
                                                    Clear filters
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="hidden md:grid grid-cols-12 gap-x-2 border-t border-slate-200 bg-slate-50/90 px-5 py-3 text-[11px]">
                                      <div className="col-span-6 font-bold text-slate-600">
                                        {sortedRows.length} inspections shown • {withPtsCount} with CVOR impact • {oosCount} OOS • {cleanCount} clean
                                      </div>
                                      <div className="col-span-2" />
                                      <div className="col-span-1 text-center font-bold text-orange-700">{totalVehPts}</div>
                                      <div className="col-span-1 text-center font-bold text-amber-700">{totalDvrPts}</div>
                                      <div className="col-span-1 text-center font-bold text-red-700">{totalCvrPts}</div>
                                      <div className="col-span-1" />
                                    </div>

                                    <PaginationBar
                                      totalItems={sortedRows.length}
                                      currentPage={currentPage}
                                      rowsPerPage={cvorPullDetailRowsPerPage}
                                      onPageChange={setCvorPullDetailPage}
                                      onRowsPerPageChange={setCvorPullDetailRowsPerPage}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="hidden">
                            {pullInspections.length === 0 ? (
                              <div className="py-12 flex flex-col items-center gap-3 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                <div className="text-4xl">📋</div>
                                <div className="text-sm font-semibold">No inspections in this 24-month window</div>
                                <div className="text-xs font-mono text-indigo-400">{win.label}</div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                                  <div className="col-span-1">Date</div>
                                  <div className="col-span-1">Report ID</div>
                                  <div className="col-span-1">Location</div>
                                  <div className="col-span-2">Driver / Licence</div>
                                  <div className="col-span-2">Power Unit / Defects</div>
                                  <div className="col-span-1 text-center">Violations</div>
                                  <div className="col-span-1 text-center text-orange-300">Veh Pts</div>
                                  <div className="col-span-1 text-center text-amber-300">Dvr Pts</div>
                                  <div className="col-span-1 text-center text-red-300">CVOR Pts</div>
                                  <div className="col-span-1">Status</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {pullInspections.map((record, ri) => {
                                    const pts = calcCvor(record);
                                    return (
                                      <InspectionRow key={record.id+'-'+ri} record={record}
                                        cvorOverride={{ vehPts:pts.veh, dvrPts:pts.dvr, cvrPts:pts.cvr }}/>
                                    );
                                  })}
                                </div>
                                <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px]">
                                  <div className="col-span-6 font-bold text-slate-600">
                                    {pullInspections.length} inspections · {withPtsCount} with CVOR impact · {oosCount} OOS · {cleanCount} clean
                                  </div>
                                  <div className="col-span-2"/>
                                  <div className="col-span-1 text-center font-bold text-orange-700">{totalVehPts}</div>
                                  <div className="col-span-1 text-center font-bold text-amber-700">{totalDvrPts}</div>
                                  <div className="col-span-1 text-center font-bold text-red-700">{totalCvrPts}</div>
                                  <div className="col-span-1"/>
                                </div>
                              </div>
                            )}
                            </div>
                          </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                );
              })()}


          {/* CVOR Inspection Filters */}
          <div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">CVOR Inspection Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniKpiCard title="All CVOR" value={cvorStats.total} icon={ClipboardCheck} color="rose" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
              <MiniKpiCard title="Clean" value={cvorStats.clean} icon={CheckCircle2} color="emerald" active={activeFilter === 'CLEAN'} onClick={() => setActiveFilter('CLEAN')} />
              <MiniKpiCard title="OOS Flags" value={cvorStats.oos} icon={ShieldAlert} color="red" active={activeFilter === 'OOS'} onClick={() => setActiveFilter('OOS')} />
              <MiniKpiCard title="Veh. Issues" value={cvorStats.vehicle} icon={Truck} color="orange" active={activeFilter === 'VEHICLE'} onClick={() => setActiveFilter('VEHICLE')} />
              <MiniKpiCard title="HOS/Driver" value={cvorStats.driver} icon={User} color="purple" active={activeFilter === 'DRIVER'} onClick={() => setActiveFilter('DRIVER')} />
              <MiniKpiCard title="Severe (7+)" value={cvorStats.severe} icon={AlertTriangle} color="yellow" active={activeFilter === 'SEVERE'} onClick={() => setActiveFilter('SEVERE')} />
            </div>
          </div>

          {/* CVOR Inspection List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">CVOR Inspections</h2>
              <InfoTooltip title="Canadian Inspections" text="Inspections conducted under Canadian jurisdiction (CVOR / NSC)." />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <DataListToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search CVOR inspections..."
                columns={columns}
                onToggleColumn={(id) => setColumns(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                totalItems={cvorFilteredData.length}
                currentPage={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
              />

              {/* Table Header - CVOR specific with extra fields */}
              <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="col-span-1 pl-2">Date / Time</div>
                <div className="col-span-1">Report</div>
                <div className="col-span-1">Location</div>
                <div className="col-span-2">Driver / Licence</div>
                <div className="col-span-2">Power Unit / Defects</div>
                <div className="col-span-1 text-center">Violations</div>
                <div className="col-span-1 text-center">Veh Pts</div>
                <div className="col-span-1 text-center">Dvr Pts</div>
                <div className="col-span-1 text-center">CVOR Pts</div>
                <div className="col-span-1">Status</div>
              </div>

              <div className="divide-y divide-slate-200">
                {cvorPagedData.length > 0 ? (
                  cvorPagedData.map(record => {
                    const totalPts = (record.violations || []).reduce((s: number, v: any) => s + (v.points || 0), 0);
                    const vehPts = record.cvorPoints?.vehicle ?? null;
                    const dvrPts = record.cvorPoints?.driver ?? null;
                    const cvrPts = record.cvorPoints?.cvor ?? (vehPts !== null && dvrPts !== null ? vehPts + dvrPts : totalPts);
                    return (
                      <InspectionRow key={record.id} record={record} onEdit={openEditModal}
                        cvorOverride={{ vehPts, dvrPts, cvrPts }}
                      />
                    );
                  })
                ) : (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center bg-slate-50/50">
                    <div className="bg-white border border-slate-200 p-4 rounded-full mb-4 shadow-sm">
                      <AlertCircle size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-wide">No CVOR records found</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm">No Canadian inspections match your current search or filter criteria.</p>
                    <button
                      onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                      className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors text-sm shadow-sm"
                    >
                      Clear all filters
                    </button>
                  </div>
                )}
              </div>

              <PaginationBar
                totalItems={cvorFilteredData.length}
                currentPage={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </div>
          </div>

        </div>
        );
      })()}

      {/* ===== TAB: CARRIER PROFILE (NSC) ===== */}
      {activeMainTab === 'carrier-profile' && (
        <div className="space-y-6">

          {/* Last Updated + Last Uploaded banner */}
          <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Info size={14} />
              <span className="font-semibold">Last Updated:</span>
              <span className="font-mono font-bold">December 15, 2025 — 3:42 PM EST</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Upload size={14} />
              <span className="font-semibold">Last Uploaded:</span>
              <span className="font-mono font-bold">December 10, 2025 — 11:15 AM EST</span>
            </div>
          </div>

          {/* ── NSC Top Row: Safety Rating & OOS + Licensing ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safety Rating & OOS */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-emerald-500"/> Safety Rating &amp; OOS
              </h3>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">NSC / CVSA</span>
                  {(() => {
                    const nscTotal = NSC_INSPECTIONS.length;
                    const nscOos = NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length;
                    const nscOosRate = nscTotal > 0 ? Math.round((nscOos / nscTotal) * 100) : 0;
                    return (
                      <span className="text-sm font-medium text-slate-700">
                        OOS Rate: <span className={`font-bold px-2 py-0.5 rounded border ${nscOosRate >= 30 ? 'bg-red-100 text-red-800 border-red-200' : nscOosRate >= 20 ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-green-100 text-green-800 border-green-200'}`}>{nscOosRate}%</span>
                      </span>
                    );
                  })()}
                </div>
                <div className="overflow-x-auto rounded border border-slate-100">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold text-center">Count</th>
                        <th className="px-3 py-2 font-semibold text-center">Rate</th>
                        <th className="px-3 py-2 font-semibold text-center">Threshold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const nscTotal = NSC_INSPECTIONS.length;
                        const nscOos = NSC_INSPECTIONS.filter(r => r.result === 'Out Of Service').length;
                        const nscReqAttn = NSC_INSPECTIONS.filter(r => r.result === 'Requires Attention').length;
                        const nscPassed = NSC_INSPECTIONS.filter(r => r.result === 'Passed').length;
                        const oosRate = nscTotal > 0 ? ((nscOos / nscTotal) * 100).toFixed(1) : '0.0';
                        const reqRate = nscTotal > 0 ? ((nscReqAttn / nscTotal) * 100).toFixed(1) : '0.0';
                        const passRate = nscTotal > 0 ? ((nscPassed / nscTotal) * 100).toFixed(1) : '0.0';
                        return (
                          <>
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Out of Service</td>
                              <td className="px-3 py-2 text-center font-bold text-red-600">{nscOos}</td>
                              <td className={`px-3 py-2 text-center font-bold ${parseFloat(oosRate) >= 30 ? 'text-red-600' : 'text-slate-800'}`}>{oosRate}%</td>
                              <td className="px-3 py-2 text-center text-slate-500">&gt;30%</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Requires Attention</td>
                              <td className="px-3 py-2 text-center font-bold text-amber-600">{nscReqAttn}</td>
                              <td className="px-3 py-2 text-center font-bold text-slate-800">{reqRate}%</td>
                              <td className="px-3 py-2 text-center text-slate-500">&gt;20%</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-slate-700">Passed</td>
                              <td className="px-3 py-2 text-center font-bold text-emerald-600">{nscPassed}</td>
                              <td className="px-3 py-2 text-center font-bold text-emerald-600">{passRate}%</td>
                              <td className="px-3 py-2 text-center text-slate-500">—</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Licensing */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                <FileSignature size={14} className="text-purple-500"/> Licensing
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Certificate Number</span>
                  <span className="font-bold font-mono text-slate-900">002050938</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Status</span>
                  <span className="font-bold text-slate-900">Federal <span className="text-green-600 bg-green-50 px-1.5 rounded ml-1">Active</span></span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Effective</span>
                  <span className="font-bold font-mono text-slate-900">2021 NOV 03</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Expiry</span>
                  <span className="font-bold font-mono text-slate-900">2024 OCT 31</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">NSC Number</span>
                  <span className="font-bold font-mono text-slate-900">AB320-9327</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">MVID Number</span>
                  <span className="font-bold font-mono text-slate-900">0930-15188</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Profile Period Start</span>
                  <span className="font-bold font-mono text-slate-900">2022 OCT 01</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Profile Period End</span>
                  <span className="font-bold font-mono text-slate-900">2024 OCT 15</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Truck size={14} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fleet Size &amp; Exposure</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Power units</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(carrierProfile.cvorAnalysis.counts.trucks)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drivers</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(carrierProfile.drivers)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected-period miles</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(nscAnalytics.periodMiles)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points / MM miles</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(nscAnalytics.pointsPerMillionMiles, 2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg border border-slate-100 bg-red-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">Overall OOS</div>
                    <div className="mt-1 text-sm font-black text-red-700">{carrierProfile.cvorAnalysis.counts.oosOverall}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-orange-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Vehicle OOS</div>
                    <div className="mt-1 text-sm font-black text-orange-700">{carrierProfile.cvorAnalysis.counts.oosVehicle}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-violet-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Driver OOS</div>
                    <div className="mt-1 text-sm font-black text-violet-700">{carrierProfile.cvorAnalysis.counts.oosDriver}%</div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Monitoring / Intervention</h3>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <span className={`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${nscRiskBand.badge}`}>
                    {nscRiskBand.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">{carrierProfile.cvorAnalysis.rating.toFixed(2)}%</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{nscRiskBand.detail}</p>
                <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Warning threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.warning}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Intervention threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.intervention}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Show-cause threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.showCause}%</span>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                  This band is derived from the configured NSC threshold logic already used in the app. An official monitoring dataset is not present in the repo.
                </div>
              </div>

              <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider text-emerald-800">Risk Factor</h3>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 italic">(dynamically calculated based on profile request date)</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 relative overflow-hidden group">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">R-Factor Score</div>
                    <div className="mt-1.5 font-mono text-[16px] font-black text-emerald-600">0.356</div>
                    <div className="text-[9px] text-slate-400 mt-1 opacity-80">(carrier must strive for the lowest score)</div>
                    <div className="absolute top-0 right-0 bottom-0 w-1 bg-emerald-400 rounded-r-lg group-hover:w-1.5 transition-all"></div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Range</div>
                    <div className="mt-2 text-sm font-bold text-slate-900">8.0-13.9</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3 col-span-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Type</div>
                    <div className="mt-1 text-sm font-bold text-slate-900">Truck</div>
                  </div>
                </div>
                <div className="space-y-3 mt-5">
                  <div className="mb-3">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Contribution to R-Factor</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 italic">(dynamically calculated based on profile request date)</div>
                  </div>
                  {[
                    { label: 'Convictions', value: '34.6%', color: 'bg-red-500', bg: 'bg-red-50', events: 5 },
                    { label: 'Administrative Penalties', value: '0.0%', color: 'bg-slate-300', bg: 'bg-slate-50', events: 0 },
                    { label: 'CVSA Inspections', value: '32.3%', color: 'bg-blue-500', bg: 'bg-blue-50', events: 43 },
                    { label: 'Reportable Collisions', value: '33.1%', color: 'bg-amber-500', bg: 'bg-amber-50', events: 6 },
                  ].map((row) => (
                    <div key={row.label} className={`p-2 rounded-lg border border-slate-100 ${row.bg} relative group cursor-pointer overflow-hidden`}>
                      <div className="flex items-center justify-between gap-3 mb-1.5 text-sm transition-opacity group-hover:opacity-0 delay-75">
                        <span className="font-semibold text-slate-700">{row.label}</span>
                        <span className="font-mono font-black text-slate-900">{row.value}</span>
                      </div>
                      <div className="h-2 bg-white rounded-full overflow-hidden border border-slate-200/60 shadow-inner transition-opacity group-hover:opacity-0 delay-75">
                        <div className={`h-full rounded-full ${row.color}`} style={{ width: row.value }} />
                      </div>
                      <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-center px-4 z-10 translate-y-1 group-hover:translate-y-0">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5">
                            <Info size={14} className="text-blue-500" />
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{row.label} Details</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="bg-slate-100 px-2 py-0.5 rounded text-xs font-bold text-slate-600">
                              {row.events} Event{row.events !== 1 ? 's' : ''}
                            </div>
                            <div className={`px-2 py-0.5 rounded text-xs font-bold ${row.color.replace('bg-', 'text-').replace('-500', '-700')} ${row.bg}`}>
                              {row.value} Impact
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          </div>

          <NscCvsaOverview />

          <NscAnalysis />

          <NscCvsaInspections />
        </div>
      )}

      {/* ===== UPLOAD MODAL ===== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg uppercase tracking-wide">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-8 text-center cursor-pointer hover:bg-blue-50 transition-colors group">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} />
                </div>
                <p className="text-sm font-bold text-blue-900 mb-1">Click to upload or drag and drop</p>
                <p className="text-sm text-blue-600/70">PDF, CSV, or XML (max. 10MB)</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900">Cancel</button>
              <button className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD / EDIT INSPECTION MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{editingInspection ? 'Edit Inspection' : 'Add Inspection'}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{editingInspection ? `Editing ${inspForm.id}` : 'Create a new inspection record manually'}</p>
              </div>
              <button onClick={closeFormModal} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">

              {/* Section: Basic Info */}
              <div>
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Basic Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Report Number</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. MIGRAHA00829" value={inspForm.id} onChange={e => setInspForm(p => ({ ...p, id: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Inspection Date</label>
                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.date} onChange={e => setInspForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Country</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.country} onChange={e => setInspForm(p => ({ ...p, country: e.target.value, state: '' }))}>
                      <option value="US">United States</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">State / Province</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.state} onChange={e => setInspForm(p => ({ ...p, state: e.target.value }))}>
                      <option value="">Select...</option>
                      {Object.entries(inspForm.country === 'Canada' ? CA_PROVINCE_ABBREVS : US_STATE_ABBREVS).map(([abbr, name]) => (
                        <option key={abbr} value={abbr}>{abbr} – {name}</option>
                      ))}
                    </select>
                    {inspForm.state && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-1.5 py-px rounded text-[11px] font-bold uppercase tracking-wider ${
                          inspForm.country === 'Canada'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {inspForm.country === 'Canada' ? 'CVOR / NSC' : 'SMS / FMCSA'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {inspForm.country === 'Canada' ? 'Canadian Regulatory' : 'US Federal'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Start Time</label>
                    <input type="time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.startTime} onChange={e => setInspForm(p => ({ ...p, startTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">End Time</label>
                    <input type="time" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.endTime} onChange={e => setInspForm(p => ({ ...p, endTime: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Level</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.level} onChange={e => setInspForm(p => ({ ...p, level: e.target.value }))}>
                      {inspForm.country === 'Canada' ? (
                        <>
                          <option value="Level 1">CVOR Level 1 - Examination of the vehicle and driver</option>
                          <option value="Level 2">CVOR Level 2 - Walk-around driver and vehicle Inspection</option>
                          <option value="Level 3">CVOR Level 3 - Only driver's license, vehicle permits</option>
                          <option value="Level 4">CVOR Level 4 - Special inspections</option>
                          <option value="Level 5">CVOR Level 5 - Vehicle inspection only without driver</option>
                        </>
                      ) : (
                        <>
                          <option value="Level 1">SMS Level I – North American Standard</option>
                          <option value="Level 2">SMS Level II – Walk-Around</option>
                          <option value="Level 3">SMS Level III – Driver/Credential</option>
                          <option value="Level 4">SMS Level IV – Special Inspections</option>
                          <option value="Level 5">SMS Level V – Vehicle-Only</option>
                          <option value="Level 6">SMS Level VI – Transuranic/Radioactive</option>
                          <option value="Level 7">SMS Level VII – Jurisdictional Mandated</option>
                          <option value="Level 8">SMS Level VIII – Electronic Inspection</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Section: Location Address */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Location Address</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-3">
                    <label className="text-sm font-bold text-slate-500 uppercase">Street Address</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 1234 Highway 401" value={inspForm.locationStreet} onChange={e => setInspForm(p => ({ ...p, locationStreet: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">City</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. Toronto" value={inspForm.locationCity} onChange={e => setInspForm(p => ({ ...p, locationCity: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">ZIP / Postal Code</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 90210" value={inspForm.locationZip} onChange={e => setInspForm(p => ({ ...p, locationZip: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Driver */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Driver</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Select Driver</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.driverId} onChange={e => {
                      const d = MOCK_DRIVERS.find(d => d.id === e.target.value);
                      if (d) {
                        setInspForm(p => ({ ...p, driverId: d.id, driver: `${d.lastName}, ${d.firstName}` }));
                      }
                    }}>
                      <option value="">Select Driver...</option>
                      {MOCK_DRIVERS.map(d => (
                        <option key={d.id} value={d.id}>{d.firstName} {d.lastName} ({d.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Driver Licence #</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. PA72341" value={inspForm.driverLicense} onChange={e => setInspForm(p => ({ ...p, driverLicense: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Asset / Vehicle Units */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Asset / Vehicle Units</h4>
                  <button type="button" onClick={addFormUnit} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    <Plus size={14} /> Add Unit
                  </button>
                </div>
                <div className="space-y-3">
                  {inspForm.units.map((unit, idx) => {
                    const unitAny = unit as any;
                    const hasAsset = !!unitAny.assetId;
                    return (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase">Unit #{idx + 1}</span>
                        {inspForm.units.length > 1 && (
                          <button type="button" onClick={() => removeFormUnit(idx)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Select Asset / Vehicle</label>
                        <select
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                          value={unitAny.assetId || ''}
                          onChange={e => {
                            const a = INITIAL_ASSETS.find(a => a.id === e.target.value);
                            const newUnits = [...inspForm.units];
                            if (a) {
                              newUnits[idx] = { type: a.assetType || 'Truck', make: `${a.make} ${a.model}`, license: a.plateNumber, vin: a.vin, assetId: a.id } as any;
                              setInspForm(p => ({ ...p, units: newUnits, ...(idx === 0 ? { assetId: a.id, vehiclePlate: a.plateNumber, vehicleType: a.assetType } : {}) }));
                            } else {
                              newUnits[idx] = { type: 'Truck', make: '', license: '', vin: '' };
                              setInspForm(p => ({ ...p, units: newUnits }));
                            }
                          }}
                        >
                          <option value="">Select Asset / Vehicle...</option>
                          {INITIAL_ASSETS.map(a => (
                            <option key={a.id} value={a.id}>{a.unitNumber} – {a.make} {a.model} ({a.plateNumber})</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Type</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} value={unit.type} onChange={e => !hasAsset && updateFormUnit(idx, 'type', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Make / Model</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} placeholder="e.g. Freightliner" value={unit.make} onChange={e => !hasAsset && updateFormUnit(idx, 'make', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">License</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} placeholder="e.g. P-7762" value={unit.license} onChange={e => !hasAsset && updateFormUnit(idx, 'license', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">VIN</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} placeholder="VIN" value={unit.vin} onChange={e => !hasAsset && updateFormUnit(idx, 'vin', e.target.value)} />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Section: OOS Summary */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Out of Service (OOS) Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Driver OOS</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.oosSummary.driver} onChange={e => setInspForm(p => ({ ...p, oosSummary: { ...p.oosSummary, driver: e.target.value } }))}>
                      <option value="PASSED">PASSED</option><option value="FAILED">FAILED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Vehicle OOS</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.oosSummary.vehicle} onChange={e => setInspForm(p => ({ ...p, oosSummary: { ...p.oosSummary, vehicle: e.target.value } }))}>
                      <option value="PASSED">PASSED</option><option value="FAILED">FAILED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Total OOS Count</label>
                    <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.oosSummary.total} onChange={e => setInspForm(p => ({ ...p, oosSummary: { ...p.oosSummary, total: parseInt(e.target.value) || 0 } }))} />
                  </div>
                </div>
              </div>

              {/* Section: Defects */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Defects</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Power Unit Defects</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. BRAKES, TIRES, LIGHTING" value={inspForm.powerUnitDefects} onChange={e => setInspForm(p => ({ ...p, powerUnitDefects: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Trailer Defects</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. REFLECTIVE SHEETING, LIGHTING" value={inspForm.trailerDefects} onChange={e => setInspForm(p => ({ ...p, trailerDefects: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Points Breakdown */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Points Breakdown</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Vehicle Points</label>
                    <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.vehiclePoints} onChange={e => setInspForm(p => ({ ...p, vehiclePoints: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Driver Points</label>
                    <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.driverPoints} onChange={e => setInspForm(p => ({ ...p, driverPoints: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">{inspForm.country === 'Canada' ? 'CVOR Points' : 'Carrier Points'}</label>
                    <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.carrierPoints} onChange={e => setInspForm(p => ({ ...p, carrierPoints: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </div>

              {/* Section: Violations */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Violations ({formViolations.length})</h4>
                    {inspForm.state && (
                      <span className={`px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wider ${
                        inspForm.country === 'Canada'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {inspForm.country === 'Canada' ? 'Canadian Codes (CVOR/NSC)' : 'FMCSA Codes (SMS)'}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={addFormViolation} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    <Plus size={14} /> Add Violation
                  </button>
                </div>
                {formViolations.length === 0 ? (
                  <div className="text-center py-6 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <CheckCircle2 size={20} className="text-emerald-500 mx-auto mb-1" />
                    <p className="text-sm font-medium text-emerald-700">Clean Inspection - No violations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formViolations.map((v, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400 uppercase">Violation #{idx + 1}</span>
                          <button type="button" onClick={() => removeFormViolation(idx)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                            <select
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 bg-white"
                              value={v.category || ''}
                              onChange={e => {
                                updateFormViolation(idx, 'category', e.target.value);
                                // Clear code when category changes
                                updateFormViolation(idx, 'code', '');
                              }}
                            >
                              <option value="">Select Category...</option>
                              {Object.entries(VIOLATION_DATA.categories).map(([key, _cat]) => (
                                <option key={key} value={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Select Code</label>
                            <input 
                              type="text" 
                              list={`violation-codes-${idx}`}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-blue-500" 
                              placeholder={inspForm.country === 'Canada' ? 'e.g. CC-320.14' : 'e.g. 392.5(c)(2)'} 
                              value={v.code} 
                              onChange={(e) => {
                                const newCode = e.target.value;
                                const isCvor = inspForm.country === 'Canada';
                                // Search within selected category first, then all
                                const selectedCatItems = v.category && VIOLATION_DATA.categories[v.category]
                                  ? VIOLATION_DATA.categories[v.category].items
                                  : Object.values(VIOLATION_DATA.categories).flatMap(cat => cat.items);
                                const match = selectedCatItems.find(item => {
                                  if (isCvor) {
                                    return item.canadaEnforcement?.code === newCode || item.violationCode === newCode;
                                  } else {
                                    return item.violationCode === newCode || item.id === newCode;
                                  }
                                });

                                if (match) {
                                  const severityWt = match.severityWeight.driver || match.severityWeight.carrier || 3;
                                  const points = isCvor ? (match.canadaEnforcement?.points?.cvor?.min || 0) : (severityWt * 3);
                                  
                                  setFormViolations(prev => prev.map((vi, i) => i === idx ? { 
                                    ...vi, 
                                    code: newCode,
                                    category: Object.entries(VIOLATION_DATA.categories).find(([_, cat]) => cat.items.includes(match))?.[0] || v.category,
                                    subDescription: isCvor ? match.canadaEnforcement?.category : match.violationGroup,
                                    description: isCvor ? (match.canadaEnforcement?.descriptions?.full || match.violationDescription) : match.violationDescription,
                                    severity: severityWt,
                                    weight: 3,
                                    points: points,
                                    driverRiskCategory: match.driverRiskCategory || 3,
                                    oos: match.isOos || false
                                  } : vi));
                                } else {
                                  updateFormViolation(idx, 'code', newCode);
                                }
                              }} 
                            />
                            <datalist id={`violation-codes-${idx}`}>
                              {(() => {
                                const isCvor = inspForm.country === 'Canada';
                                const items = v.category && VIOLATION_DATA.categories[v.category]
                                  ? VIOLATION_DATA.categories[v.category].items
                                  : Object.values(VIOLATION_DATA.categories).flatMap(cat => cat.items);
                                return items.map(item => {
                                  if (isCvor && !item.canadaEnforcement) return null;
                                  if (!isCvor && (!item.regulatoryCodes?.usa || item.regulatoryCodes.usa.length === 0)) return null;
                                  const valCode = isCvor ? (item.canadaEnforcement?.code || item.violationCode) : item.violationCode;
                                  const label = isCvor ? item.canadaEnforcement?.descriptions?.shortForm52 : item.violationDescription;
                                  return <option key={item.id} value={valCode}>{label}</option>;
                                });
                              })()}
                            </datalist>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Sub-Category</label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-slate-50 focus:outline-none" readOnly value={v.subDescription || ''} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                          <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" placeholder="Violation description" value={v.description || ''} onChange={e => updateFormViolation(idx, 'description', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Severity</label>
                            <input type="number" min="0" max="10" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" value={v.severity} onChange={e => updateFormViolation(idx, 'severity', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Weight</label>
                            <input type="number" min="0" max="10" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" value={v.weight} onChange={e => updateFormViolation(idx, 'weight', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Points</label>
                            <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" value={v.points} onChange={e => updateFormViolation(idx, 'points', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Risk Cat.</label>
                            <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500" value={v.driverRiskCategory} onChange={e => updateFormViolation(idx, 'driverRiskCategory', parseInt(e.target.value))}>
                              <option value={1}>1 - High</option><option value={2}>2 - Medium</option><option value={3}>3 - Low</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">OOS</label>
                            <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500" value={v.oos ? 'yes' : 'no'} onChange={e => updateFormViolation(idx, 'oos', e.target.value === 'yes')}>
                              <option value="no">No</option><option value="yes">Yes</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section: Fine & Expenses */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3">Fine & Expenses</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Currency</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.currency} onChange={e => setInspForm(p => ({ ...p, currency: e.target.value }))}>
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Fine Amount</label>
                    <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0.00" value={inspForm.fineAmount} onChange={e => setInspForm(p => ({ ...p, fineAmount: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Violation Documents */}
              <div className="border-t border-slate-100 pt-5">
                <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[13px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" /> Violation Documents
                    </h4>
                    <button
                      type="button"
                      onClick={() => setInspAttachedDocs(prev => [...prev, {
                        id: `doc-${Math.random().toString(36).substr(2, 9)}`,
                        docTypeId: '', docNumber: '', issueDate: '', fileName: ''
                      }])}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                    >
                      <Plus size={14} /> Add Document
                    </button>
                  </div>

                  {inspAttachedDocs.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm">
                      No documents attached. Click "+ Add Document" to add one.
                    </div>
                  )}

                  {inspAttachedDocs.map((doc, idx) => (
                    <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Document Type</label>
                          <select
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-blue-500"
                            value={doc.docTypeId}
                            onChange={e => {
                              const newDocs = [...inspAttachedDocs];
                              newDocs[idx] = { ...newDocs[idx], docTypeId: e.target.value };
                              setInspAttachedDocs(newDocs);
                            }}
                          >
                            <option value="">Select type...</option>
                            {violationDocTypes.map(dt => (
                              <option key={dt.id} value={dt.id}>{dt.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Document Number</label>
                          <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                            placeholder="e.g. CIT-2024-00123"
                            value={doc.docNumber}
                            onChange={e => {
                              const newDocs = [...inspAttachedDocs];
                              newDocs[idx] = { ...newDocs[idx], docNumber: e.target.value };
                              setInspAttachedDocs(newDocs);
                            }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400 uppercase">Issue Date</label>
                          <input
                            type="date"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                            value={doc.issueDate}
                            onChange={e => {
                              const newDocs = [...inspAttachedDocs];
                              newDocs[idx] = { ...newDocs[idx], issueDate: e.target.value };
                              setInspAttachedDocs(newDocs);
                            }}
                          />
                        </div>
                      </div>
                      <div className="bg-slate-50/80 rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
                        <span className="text-xs font-bold text-slate-400 uppercase mb-0">Upload Documents</span>
                        <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-blue-200 rounded-lg bg-white hover:bg-blue-50/30 transition-colors cursor-pointer">
                          <Upload size={20} className="text-blue-400 mb-1" />
                          <span className="text-sm text-blue-500 font-medium">Document PDF</span>
                          <label className="mt-2 cursor-pointer">
                            <span className="text-[13px] text-slate-500">Choose File</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const newDocs = [...inspAttachedDocs];
                                  newDocs[idx] = { ...newDocs[idx], fileName: file.name };
                                  setInspAttachedDocs(newDocs);
                                }
                              }}
                            />
                            {doc.fileName ? (
                              <span className="ml-2 text-[13px] text-emerald-600 font-medium">{doc.fileName}</span>
                            ) : (
                              <span className="ml-2 text-[13px] text-slate-400">No file chosen</span>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 flex-shrink-0">
              <button onClick={closeFormModal} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={closeFormModal} className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors">
                <CheckCircle2 size={16} /> {editingInspection ? 'Save Changes' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
