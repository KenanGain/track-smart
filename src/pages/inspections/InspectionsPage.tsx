import { useState, useMemo } from 'react';
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
  Gauge,
  Info,
  X
} from 'lucide-react';
import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode } from './inspectionsData';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import { useAppData } from '@/context/AppDataContext';
import { VIOLATION_DATA } from '@/data/violations.data';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS } from '@/pages/assets/assets.data';
import { US_STATE_ABBREVS, CA_PROVINCE_ABBREVS } from '@/data/geo-data';

// --- REUSABLE COMPONENTS ---

const CrashLikelihoodBar = ({ value }: { value: number }) => {
  const width = Math.min(Math.max(value, 5), 100);
  let color = 'bg-emerald-500';
  let label = 'Low Risk';
  
  if (value > 30) { color = 'bg-amber-500'; label = 'Medium Risk'; }
  if (value > 60) { color = 'bg-red-500'; label = 'High Risk'; }
  
  return (
      <div className="w-24">
          <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] font-bold text-slate-700 uppercase">{label}</span>
              <span className="text-[10px] font-bold text-slate-400">{value}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
          </div>
      </div>
  );
};

// Component: Educational Tooltips
const InfoTooltip = ({ text, title }: { text: string; title?: string }) => (
  <div className="group relative inline-flex items-center ml-1.5 cursor-help">
    <Info size={14} className="text-slate-400 hover:text-blue-500 transition-colors" />
    <div className="hidden group-hover:block absolute z-50 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
      {title && <div className="font-bold text-blue-300 mb-1 tracking-wide uppercase">{title}</div>}
      <div className="leading-relaxed text-slate-200">{text}</div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
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
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{title}</span>
      </div>
      <span className="text-lg font-bold text-slate-900">{value}</span>
    </div>
  );
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
const InspectionRow = ({ record, onEdit }: { record: any; onEdit?: (record: any) => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<any | null>(null);
  const primaryUnit = record.units?.[0];
  const unitCount = record.units?.length || 0;
  const totalPoints = (record.violations || []).reduce((sum: number, violation: any) => sum + (violation.points || 0), 0);
  const maxSeverity = (record.violations || []).reduce((max: number, violation: any) => Math.max(max, violation.severity || 0), 0);
  
  return (
    <div className="group bg-white hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0">
      
      {/* ===== DESKTOP MAIN ROW ===== */}
      <div 
        className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-4 items-center cursor-pointer border-l-2 border-transparent hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date */}
        <div className="col-span-1 pl-2">
          <span className="text-[12px] font-bold text-slate-800">{record.date}</span>
        </div>

        {/* Report ID */}
        <div className="col-span-2 min-w-0 flex flex-col justify-center">
          <span className="text-[12px] font-bold text-blue-600 block truncate leading-tight">{record.id}</span>
          {getJurisdiction(record.state) === 'CVOR' ? (
            <span className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[8px] font-bold tracking-wider border ${getInspectionTagSpecs('CVOR', record.level)}`}>CVOR L{record.level?.replace(/level\s*/i, '') || '1'}</span>
          ) : (
            <span className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[8px] font-bold tracking-wider border ${getInspectionTagSpecs('CSA', record.level)}`}>SMS L{record.level?.replace(/level\s*/i, '') || '1'}</span>
          )}
        </div>

        {/* Country + State */}
        <div className="col-span-1 flex flex-col justify-center">
          <span className="text-[12px] font-medium text-slate-700">
            {record.state}, {getJurisdiction(record.state) === 'CVOR' ? 'CAN' : 'USA'}
          </span>
        </div>

        {/* Driver */}
        <div className="col-span-2 flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
            <User size={12} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-[12px] font-bold text-slate-800 truncate block leading-tight">{record.driver?.split(',')[0]}</span>
            <span className="text-[9px] text-slate-400 font-medium truncate block">{record.driverId}</span>
          </div>
        </div>

        {/* Asset */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-[12px] font-bold text-slate-800 truncate block leading-tight">
            {primaryUnit?.license || record.vehiclePlate}
          </span>
          <span className="text-[9px] text-slate-500 font-medium truncate block mt-0.5">
            {primaryUnit?.type || record.vehicleType}
            {unitCount > 1 && <span className="font-bold text-blue-600 ml-1">(+{unitCount - 1})</span>}
          </span>
        </div>

        {/* Violations Count */}
        <div className="col-span-1 flex justify-center items-center">
          {record.isClean ? (
            <span className="text-[13px] font-bold text-emerald-600">
              Clean
            </span>
          ) : (
            <span className="text-[13px] font-bold text-orange-600">
              {record.violations.length}
            </span>
          )}
        </div>

        {/* Max Severity */}
        <div className="col-span-1 flex justify-center items-center">
             <span className={`text-[13px] font-bold ${maxSeverity >= 7 ? 'text-red-600' : 'text-slate-500'}`}>
               {record.isClean ? 0 : maxSeverity}
             </span>
        </div>

        {/* Points */}
        <div className="col-span-1 flex justify-center items-center text-[13px] font-bold text-slate-900">
          {totalPoints}
        </div>

        {/* OOS Status & Actions */}
        <div className="col-span-1 flex items-center justify-between pr-2">
           <div className="min-w-[48px]">
             {record.hasOOS && (
               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50/80 rounded text-[10px] font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">
                 <ShieldAlert size={10} className="text-red-500 flex-shrink-0" /> OOS
               </span>
             )}
           </div>

           <div className="flex items-center gap-1">
             {onEdit && (
               <button
                 onClick={(e) => { e.stopPropagation(); onEdit(record); }}
                 className="p-1 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                 title="Edit inspection"
               >
                 <FileSignature size={14} />
               </button>
             )}
             <div className="text-slate-400">
               {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
             </div>
           </div>
        </div>
      </div>

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
                  <span className={`px-1.5 py-px rounded text-[8px] font-bold tracking-wider border ${getInspectionTagSpecs('CVOR', record.level)}`}>CVOR LEVEL {record.level?.replace(/level\s*/i, '') || '1'}</span>
                ) : (
                  <span className={`px-1.5 py-px rounded text-[8px] font-bold tracking-wider border ${getInspectionTagSpecs('CSA', record.level)}`}>SMS LEVEL {record.level?.replace(/level\s*/i, '') || '1'}</span>
                )}
              </div>
              <span className="text-xs text-slate-900 font-medium block mt-0.5">{record.date}</span>
            </div>
          </div>
          <button className="text-slate-400 bg-slate-50 border border-slate-200 p-1.5 rounded-full shadow-sm">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-slate-100">
           <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[11px] font-medium text-slate-600">
            <User size={10}/> {record.driver.split(',')[0]}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[11px] font-mono font-bold text-slate-700">
            <Truck size={10}/> 
            {record.units && record.units.length > 0 ? record.units[0].license.split(' ')[0] : record.vehiclePlate.split(' ')[0]}
            {record.units && record.units.length > 1 && <span className="text-blue-600">+{record.units.length - 1}</span>}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[11px] font-semibold text-slate-700">
            Sev {maxSeverity}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[11px] font-semibold text-slate-700">
            Pts {totalPoints}
          </div>
          {record.hasOOS && (
            <div className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
              OOS
            </div>
          )}
        </div>
      </div>

      {/* ===== EXPANDED DETAILS (Dropdown View) ===== */}
      {isExpanded && (
        <div className="bg-slate-50/50 p-5 md:p-8 border-t border-slate-200 shadow-inner flex flex-col gap-8">
          {record.isClean ? (
            <div className="flex flex-col items-center justify-center py-6 text-emerald-600 bg-white rounded-xl border border-slate-200 shadow-sm">
              <CheckCircle2 size={32} className="mb-2 opacity-80" />
              <p className="text-sm font-bold">Clean Inspection</p>
              <p className="text-xs text-emerald-600/70 mt-1">No violations were recorded during this inspection.</p>
            </div>
          ) : (
            <>
              {/* Jurisdiction Banner */}
              <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 rounded-lg border ${
                getJurisdiction(record.state) === 'CVOR'
                  ? 'bg-red-50/60 border-red-200'
                  : 'bg-blue-50/60 border-blue-200'
              }`}>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider self-start border ${
                  getInspectionTagSpecs(getJurisdiction(record.state), record.level)
                }`}>
                  {getJurisdiction(record.state)} LEVEL {record.level?.replace(/level\s*/i, '') || '1'}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                  {getJurisdiction(record.state) === 'CVOR'
                    ? <>Regulated under <span className="font-bold">Ontario CVOR</span> &mdash; HTA, O.Reg.199/07, O.Reg.555/06, TDG Act</>
                    : <>Regulated under <span className="font-bold">FMCSA SMS</span> &mdash; 49 CFR Parts 382-399</>
                  }
                </span>
              </div>

              {/* Top Cards: Driver, Asset, Summary, OOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                    <User size={14} className="text-slate-400" /> Driver
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{record.driver}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Driver ID: {record.driverId}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-50 border border-slate-100 rounded p-2">
                        <p className="text-slate-500 uppercase tracking-wide">Level</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{record.level}</p>
                      </div>
                      <div className="bg-slate-50 border border-slate-100 rounded p-2">
                        <p className="text-slate-500 uppercase tracking-wide">Violations</p>
                        <p className="text-slate-800 font-semibold mt-0.5">{record.violations.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                    <Truck size={14} className="text-slate-400" /> Asset Details
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full">
                    <div className="p-3 border-b border-slate-100">
                      <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                        {primaryUnit?.type || record.vehicleType}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900 font-mono">
                        {primaryUnit?.license || record.vehiclePlate}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Asset ID: <span className="font-mono">{record.assetId}</span> - Units: {unitCount}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {(record.units || []).map((unit: any, idx: number) => (
                        <div key={idx} className="px-3 py-2.5 text-[11px]">
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
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                    <Activity size={14} className="text-slate-400" /> Violation Summary
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full">
                    <div className="divide-y divide-gray-100 text-[11px]">
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

                <div className="space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle size={14} className="text-slate-400" /> Out of Service (OOS)
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-700 font-medium">Driver OOS</span>
                        {record.oosSummary?.driver === 'PASSED' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">PASSED</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">FAILED</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-700 font-medium">Vehicle OOS</span>
                        {record.oosSummary?.vehicle === 'PASSED' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">PASSED</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">FAILED</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                      <span className="text-xs font-bold text-slate-900 uppercase">Total OOS</span>
                      <span className={`text-2xl font-bold leading-none ${record.oosSummary?.total > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                        {record.oosSummary?.total || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Panel: Detailed Violations Table */}
              <div className="space-y-4 mt-2">
                <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                  <FileText size={14} className="text-slate-400" /> Detailed Violations
                </h4>
                <div className="bg-white border border-slate-200 rounded shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3.5">Code</th>
                        <th className="px-5 py-3.5">Category</th>
                        <th className="px-5 py-3.5">Description</th>
                        <th className="px-5 py-3.5 text-center">Risk Level</th>
                        <th className="px-5 py-3.5 text-center">Severity</th>
                        <th className="px-5 py-3.5 text-center">Weight</th>
                        <th className="px-5 py-3.5 text-center">Points</th>
                        <th className="px-5 py-3.5 text-center">OOS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {record.violations?.map((violation: any, idx: number) => (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 cursor-pointer"
                          onClick={() => setSelectedViolation(violation)}
                          title="Click to view violation details"
                        >
                          <td className="px-5 py-4 text-slate-600 font-mono">{violation.code}</td>
                          <td className="px-5 py-4 text-slate-700">{violation.category}</td>
                          <td className="px-5 py-4">
                            <p className="text-slate-800 font-medium leading-snug">{violation.description}</p>
                            {violation.subDescription && (
                              <p className="text-[10px] text-blue-400/90 mt-1 font-medium">{violation.subDescription}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 flex justify-center"><CrashLikelihoodBar value={violation.crashLikelihoodPercent || (violation.driverRiskCategory === 1 ? 85 : violation.driverRiskCategory === 2 ? 45 : 15)} /></td>
                          <td className="px-5 py-4 text-center text-slate-500">{violation.severity}</td>
                          <td className="px-5 py-4 text-center text-slate-500">{violation.weight}</td>
                          <td className="px-5 py-4 text-center font-bold text-slate-900">{violation.points}</td>
                          <td className="px-5 py-4 text-center text-slate-400">
                            {violation.oos ? (
                              <span className="font-bold text-red-600">YES</span>
                            ) : (
                              <span>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedViolation && (() => {
                const jurisdiction = getJurisdiction(record.state);
                const equivalent = getEquivalentCode(selectedViolation.code);
                return (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">Violation Details</h4>
                          <span className={`px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wider ${
                            jurisdiction === 'CVOR'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>{jurisdiction}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Inspection {record.id}</p>
                      </div>
                      <button
                        onClick={() => setSelectedViolation(null)}
                        className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition-colors"
                        aria-label="Close violation details"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="p-4 space-y-4 text-sm">
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {jurisdiction === 'CVOR' ? 'Canadian Code' : 'FMCSA Code'}
                        </div>
                        <div className="mt-1 font-mono text-blue-700 font-bold">{selectedViolation.code}</div>
                      </div>

                      {/* Cross-reference equivalent */}
                      {equivalent && (
                        <div className={`rounded-lg border p-3 ${
                          jurisdiction === 'CVOR'
                            ? 'bg-blue-50/50 border-blue-200'
                            : 'bg-red-50/50 border-red-200'
                        }`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wider ${
                              jurisdiction === 'CVOR'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {jurisdiction === 'CVOR' ? 'CSA' : 'CVOR'} Equivalent
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{equivalent.source}</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-slate-800">{equivalent.code}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{equivalent.shortDescription}</div>
                        </div>
                      )}

                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</div>
                        <div className="mt-1 text-slate-800">{selectedViolation.category}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</div>
                        <div className="mt-1 text-slate-900 leading-relaxed">{selectedViolation.description}</div>
                        {selectedViolation.subDescription && (
                          <div className="mt-1 text-xs text-blue-600/90">{selectedViolation.subDescription}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider">Severity</div>
                          <div className="mt-1 font-bold text-slate-900">{selectedViolation.severity}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider">Weight</div>
                          <div className="mt-1 font-bold text-slate-900">{selectedViolation.weight}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider">Points</div>
                          <div className="mt-1 font-bold text-slate-900">{selectedViolation.points}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[11px] text-slate-500 uppercase tracking-wider">OOS</div>
                          <div className={`mt-1 font-bold ${selectedViolation.oos ? 'text-red-600' : 'text-slate-700'}`}>
                            {selectedViolation.oos ? 'YES' : 'NO'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                      <button
                        onClick={() => setSelectedViolation(null)}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// --- MAIN APP ---
export function InspectionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
  const { csaThresholds, cvorThresholds, documents: allDocTypes } = useAppData();

  // Form state for Add/Edit
  const emptyForm = {
    id: '', date: '', country: 'US', state: '', locationStreet: '', locationCity: '', locationZip: '',
    driverId: '', driver: '', vehiclePlate: '', vehicleType: 'Truck',
    assetId: '', level: 'Level 1', isClean: true, hasOOS: false,
    hasVehicleViolations: false, hasDriverViolations: false,
    units: [{ type: 'Truck', make: '', license: '', vin: '' }],
    oosSummary: { driver: 'PASSED', vehicle: 'PASSED', total: 0 },
    violations: [] as any[],
    fineAmount: '', currency: 'USD',
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
    setInspForm({
      id: record.id, date: record.date, country: record.country || (getJurisdiction(record.state) === 'CVOR' ? 'Canada' : 'US'),
      state: record.state, locationStreet: record.locationStreet || '', locationCity: record.locationCity || '', locationZip: record.locationZip || '',
      driverId: record.driverId,
      driver: record.driver, vehiclePlate: record.vehiclePlate, vehicleType: record.vehicleType,
      assetId: record.assetId, level: record.level, isClean: record.isClean, hasOOS: record.hasOOS,
      hasVehicleViolations: record.hasVehicleViolations, hasDriverViolations: record.hasDriverViolations,
      units: record.units || [{ type: 'Truck', make: '', license: '', vin: '' }],
      oosSummary: record.oosSummary || { driver: 'PASSED', vehicle: 'PASSED', total: 0 },
      violations: [],
      fineAmount: record.fineAmount || '', currency: record.currency || 'USD',
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

  // Derived Stats for Filters
  const stats = useMemo(() => {
    return {
      total: inspectionsData.length,
      clean: inspectionsData.filter(i => i.isClean).length,
      oos: inspectionsData.filter(i => i.hasOOS).length,
      vehicle: inspectionsData.filter(i => i.hasVehicleViolations).length,
      driver: inspectionsData.filter(i => i.hasDriverViolations).length,
      severe: inspectionsData.filter(i => i.violations.some(v => v.severity >= 7)).length,
      cvor: inspectionsData.filter(i => getJurisdiction(i.state) === 'CVOR').length,
      sms: inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA').length,
    };
  }, []);

  // Filter Logic
  const filteredData = inspectionsData.filter(insp => {
    const matchesSearch = 
      insp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insp.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    switch(activeFilter) {
      case 'CLEAN': matchesFilter = insp.isClean; break;
      case 'OOS': matchesFilter = insp.hasOOS; break;
      case 'VEHICLE': matchesFilter = insp.hasVehicleViolations; break;
      case 'DRIVER': matchesFilter = insp.hasDriverViolations; break;
      case 'SEVERE': matchesFilter = insp.violations.some(v => v.severity >= 7); break;
      case 'CVOR': matchesFilter = getJurisdiction(insp.state) === 'CVOR'; break;
      case 'SMS': matchesFilter = getJurisdiction(insp.state) === 'CSA'; break;
      default: matchesFilter = true;
    }

    return matchesSearch && matchesFilter;
  });

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
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                The carrier exceeds the FMCSA Intervention Threshold relative to its safety event grouping based on roadside data. This carrier may be prioritized for an intervention action and roadside inspection. Note: No Acute/Critical Violations were discovered during investigation results.
              </p>
            </div>
          </div>

          {/* Top Row: Safety Rating & OOS and Licensing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Col 1: Safety Rating & OOS */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-blue-500"/> Safety Rating & OOS
                <InfoTooltip 
                  text="Safety Rating is a company-wide grade. OOS Rates show how often the carrier's vehicles/drivers are pulled off the road compared to the national average." 
                />
              </h3>
              <div className="mb-4 text-sm font-medium text-slate-700">
                Current Rating: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{carrierProfile.rating}</span>
              </div>
              <div className="overflow-x-auto rounded border border-slate-100 mt-auto">
                <table className="w-full text-left text-xs">
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

            {/* Col 2: Licensing */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                <FileSignature size={14} className="text-purple-500"/> Licensing
                <InfoTooltip 
                  text="Applies exclusively to the whole company. Dictates whether the business has the legal authority and financial backing to operate." 
                />
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                  <span className="text-slate-600">Property</span>
                  <span className="font-bold text-slate-900">{carrierProfile.licensing.property.mc} <span className="text-green-600 bg-green-50 px-1 rounded ml-1">Active</span></span>
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

          {/* Compliance Dashboard: US (CSA) | Canada (CVOR) Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* LEFT COLUMN: United States - CSA BASIC Status */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Gauge size={16} className="text-blue-600"/>
                </div>
                <h3 className="text-sm font-bold text-slate-900">SMS BASIC Status</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">SMS</span>
                <InfoTooltip text="The carrier's overall safety percentile score based on a 2-year period, ranked against other similar companies." />
              </div>
              <div className="space-y-0 flex-1">
                {carrierProfile.basicStatus.map((status, idx) => {
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

                  return (
                  <div key={idx} className={`flex flex-col justify-center py-2.5 border-b border-slate-50 last:border-0 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-xs font-medium ${textClass}`}>
                        {status.category}
                      </span>
                      <div className="flex items-center gap-2">
                          {status.measure !== undefined && <span className="text-[10px] text-slate-400 font-mono">Msr: {status.measure}</span>}
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${alertClass}`}>
                          {status.percentile}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate" title={status.details}>{status.details}</span>
                  </div>
                )})}
              </div>
            </div>

            {/* RIGHT COLUMN: Canada - CVOR Analysis */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col">
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Activity size={16} className="text-red-600"/>
                </div>
                <h3 className="text-sm font-bold text-slate-900">CVOR Analysis</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700">CVOR</span>
                <InfoTooltip text="Commercial Vehicle Operator's Registration (CVOR) performance metrics for Ontario-based carriers." />
              </div>

              {/* Overall Rating Row */}
              {(() => {
                const rating = carrierProfile.cvorAnalysis.rating;
                let ratingClass = 'bg-green-100 text-green-800';
                let ratingLabel = 'OK';
                let borderClass = '';
                if (rating >= cvorThresholds.showCause) { ratingClass = 'bg-red-100 text-red-800'; ratingLabel = 'CRITICAL'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (rating >= cvorThresholds.intervention) { ratingClass = 'bg-amber-100 text-amber-800'; ratingLabel = 'HIGH'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                else if (rating >= cvorThresholds.warning) { ratingClass = 'bg-yellow-100 text-yellow-800'; ratingLabel = 'ALERT'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-xs font-medium ${rating >= cvorThresholds.warning ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>Overall CVOR Rating</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">{rating}%</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${ratingClass}`}>{ratingLabel}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">Composite score from collisions, convictions, and inspections</span>
                  </div>
                );
              })()}

              {/* Collisions Row */}
              {(() => {
                const val = carrierProfile.cvorAnalysis.collisions.percentage;
                let alertClass = 'bg-green-100 text-green-800';
                let label = 'OK';
                let borderClass = '';
                if (val >= cvorThresholds.intervention) { alertClass = 'bg-red-100 text-red-800'; label = 'HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-amber-100 text-amber-800'; label = 'ALERT'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-slate-700">Collisions</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.collisions.weight} | {val}%</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{label}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{carrierProfile.cvorAnalysis.counts.collisions} collisions | {carrierProfile.cvorAnalysis.counts.totalCollisionPoints} points</span>
                  </div>
                );
              })()}

              {/* Convictions Row */}
              {(() => {
                const val = carrierProfile.cvorAnalysis.convictions.percentage;
                let alertClass = 'bg-green-100 text-green-800';
                let label = 'OK';
                let borderClass = '';
                if (val >= cvorThresholds.intervention) { alertClass = 'bg-red-100 text-red-800'; label = 'HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-amber-100 text-amber-800'; label = 'ALERT'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-slate-700">Convictions</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.convictions.weight} | {val}%</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{label}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">{carrierProfile.cvorAnalysis.counts.convictions} convictions | {carrierProfile.cvorAnalysis.counts.convictionPoints} points</span>
                  </div>
                );
              })()}

              {/* Inspections Row */}
              {(() => {
                const val = carrierProfile.cvorAnalysis.inspections.percentage;
                let alertClass = 'bg-green-100 text-green-800';
                let label = 'OK';
                let borderClass = '';
                if (val >= cvorThresholds.showCause) { alertClass = 'bg-red-100 text-red-800'; label = 'VERY HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.intervention) { alertClass = 'bg-amber-100 text-amber-800'; label = 'HIGH'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-yellow-100 text-yellow-800'; label = 'ALERT'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs font-medium text-slate-700">Inspections</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.inspections.weight} | {val}%</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{label}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500">OOS: Overall {carrierProfile.cvorAnalysis.counts.oosOverall}% | Vehicle {carrierProfile.cvorAnalysis.counts.oosVehicle}% | Driver {carrierProfile.cvorAnalysis.counts.oosDriver}%</span>
                  </div>
                );
              })()}

              {/* Key Counts */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Collisions</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{carrierProfile.cvorAnalysis.counts.collisions}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Convictions</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{carrierProfile.cvorAnalysis.counts.convictions}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Trucks</div>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{carrierProfile.cvorAnalysis.counts.trucks}</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Miles</div>
                  <div className="font-mono font-bold text-blue-600 text-sm mt-0.5">{(carrierProfile.cvorAnalysis.counts.totalMiles / 1000000).toFixed(1)}M</div>
                </div>
              </div>

              {/* Threshold Legend */}
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
                  <span className="text-slate-500"><span className="font-bold text-slate-700">{cvorThresholds.warning}%</span> Warning</span>
                  <span className="text-slate-500"><span className="font-bold text-amber-600">{cvorThresholds.intervention}%</span> Audit</span>
                  <span className="text-slate-500"><span className="font-bold text-red-600">{cvorThresholds.showCause}%</span> Show Cause</span>
                  <span className="text-slate-500"><span className="font-bold text-red-800">{cvorThresholds.seizure}%</span> Seizure</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ===== KPI FILTERS (Mini Rectangles) ===== */}
        <div className="mt-8">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Inspection Filters</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <MiniKpiCard 
              title="All Insps." value={stats.total} icon={ClipboardCheck} color="blue"
              active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} 
            />
            <MiniKpiCard 
              title="Clean" value={stats.clean} icon={CheckCircle2} color="emerald"
              active={activeFilter === 'CLEAN'} onClick={() => setActiveFilter('CLEAN')} 
            />
            <MiniKpiCard 
              title="OOS Flags" value={stats.oos} icon={ShieldAlert} color="red"
              active={activeFilter === 'OOS'} onClick={() => setActiveFilter('OOS')} 
            />
            <MiniKpiCard 
              title="Veh. Issues" value={stats.vehicle} icon={Truck} color="orange"
              active={activeFilter === 'VEHICLE'} onClick={() => setActiveFilter('VEHICLE')} 
            />
            <MiniKpiCard 
              title="HOS/Driver" value={stats.driver} icon={User} color="purple"
              active={activeFilter === 'DRIVER'} onClick={() => setActiveFilter('DRIVER')} 
            />
            <MiniKpiCard 
              title="Severe (7+)" value={stats.severe} icon={AlertTriangle} color="yellow"
              active={activeFilter === 'SEVERE'} onClick={() => setActiveFilter('SEVERE')} 
            />
            <MiniKpiCard 
              title="CVOR" value={stats.cvor} icon={ClipboardCheck} color="rose"
              active={activeFilter === 'CVOR'} onClick={() => setActiveFilter('CVOR')} 
            />
            <MiniKpiCard 
              title="SMS" value={stats.sms} icon={ClipboardCheck} color="indigo"
              active={activeFilter === 'SMS'} onClick={() => setActiveFilter('SMS')} 
            />
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
            <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="col-span-1 pl-2">Date</div>
              <div className="col-span-2">Report ID</div>
              <div className="col-span-1">Location</div>
              <div className="col-span-2">Driver</div>
              <div className="col-span-2">Asset</div>
              <div className="col-span-1 text-center">Violations</div>
              <div className="col-span-1 text-center">Severity</div>
              <div className="col-span-1 text-center">Points</div>
              <div className="col-span-1">Status</div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-slate-200">
              {pagedData.length > 0 ? (
                pagedData.map(record => (
                  <InspectionRow key={record.id} record={record} onEdit={openEditModal} />
                ))
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

      </div>

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
                <p className="text-xs text-blue-600/70">PDF, CSV, or XML (max. 10MB)</p>
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
                <p className="text-xs text-slate-500 mt-0.5">{editingInspection ? `Editing ${inspForm.id}` : 'Create a new inspection record manually'}</p>
              </div>
              <button onClick={closeFormModal} className="text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">

              {/* Section: Basic Info */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Basic Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Report Number</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. MIGRAHA00829" value={inspForm.id} onChange={e => setInspForm(p => ({ ...p, id: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Inspection Date</label>
                    <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.date} onChange={e => setInspForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Country</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.country} onChange={e => setInspForm(p => ({ ...p, country: e.target.value, state: '' }))}>
                      <option value="US">United States</option>
                      <option value="Canada">Canada</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">State / Province</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.state} onChange={e => setInspForm(p => ({ ...p, state: e.target.value }))}>
                      <option value="">Select...</option>
                      {Object.entries(inspForm.country === 'Canada' ? CA_PROVINCE_ABBREVS : US_STATE_ABBREVS).map(([abbr, name]) => (
                        <option key={abbr} value={abbr}>{abbr} – {name}</option>
                      ))}
                    </select>
                    {inspForm.state && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider ${
                          inspForm.country === 'Canada'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {inspForm.country === 'Canada' ? 'CVOR / NSC' : 'SMS / FMCSA'}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {inspForm.country === 'Canada' ? 'Canadian Regulatory' : 'US Federal'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Level</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.level} onChange={e => setInspForm(p => ({ ...p, level: e.target.value }))}>
                      {inspForm.country === 'Canada' ? (
                        <>
                          <option value="Level 1">CVOR Level 1 – Full Inspection</option>
                          <option value="Level 2">CVOR Level 2 – Partial Inspection</option>
                          <option value="NSC">NSC – National Safety Code</option>
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
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Location Address</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5 col-span-3">
                    <label className="text-xs font-bold text-slate-500 uppercase">Street Address</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 1234 Highway 401" value={inspForm.locationStreet} onChange={e => setInspForm(p => ({ ...p, locationStreet: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">City</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. Toronto" value={inspForm.locationCity} onChange={e => setInspForm(p => ({ ...p, locationCity: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">ZIP / Postal Code</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. 90210" value={inspForm.locationZip} onChange={e => setInspForm(p => ({ ...p, locationZip: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Driver */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Driver</h4>
                <div className="space-y-1.5">
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
              </div>

              {/* Section: Asset / Vehicle Units */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asset / Vehicle Units</h4>
                  <button type="button" onClick={addFormUnit} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Unit #{idx + 1}</span>
                        {inspForm.units.length > 1 && (
                          <button type="button" onClick={() => removeFormUnit(idx)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Select Asset / Vehicle</label>
                        <select
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} value={unit.type} onChange={e => !hasAsset && updateFormUnit(idx, 'type', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Make / Model</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} placeholder="e.g. Freightliner" value={unit.make} onChange={e => !hasAsset && updateFormUnit(idx, 'make', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">License</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} placeholder="e.g. P-7762" value={unit.license} onChange={e => !hasAsset && updateFormUnit(idx, 'license', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">VIN</label>
                          <input type="text" readOnly={hasAsset} className={`w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono ${hasAsset ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:outline-none focus:border-blue-500'}`} placeholder="VIN" value={unit.vin} onChange={e => !hasAsset && updateFormUnit(idx, 'vin', e.target.value)} />
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Section: OOS Summary */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Out of Service (OOS) Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Driver OOS</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.oosSummary.driver} onChange={e => setInspForm(p => ({ ...p, oosSummary: { ...p.oosSummary, driver: e.target.value } }))}>
                      <option value="PASSED">PASSED</option><option value="FAILED">FAILED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vehicle OOS</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.oosSummary.vehicle} onChange={e => setInspForm(p => ({ ...p, oosSummary: { ...p.oosSummary, vehicle: e.target.value } }))}>
                      <option value="PASSED">PASSED</option><option value="FAILED">FAILED</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Total OOS Count</label>
                    <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.oosSummary.total} onChange={e => setInspForm(p => ({ ...p, oosSummary: { ...p.oosSummary, total: parseInt(e.target.value) || 0 } }))} />
                  </div>
                </div>
              </div>

              {/* Section: Violations */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Violations ({formViolations.length})</h4>
                    {inspForm.state && (
                      <span className={`px-1.5 py-px rounded text-[8px] font-bold uppercase tracking-wider ${
                        inspForm.country === 'Canada'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {inspForm.country === 'Canada' ? 'Canadian Codes (CVOR/NSC)' : 'FMCSA Codes (SMS)'}
                      </span>
                    )}
                  </div>
                  <button type="button" onClick={addFormViolation} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    <Plus size={14} /> Add Violation
                  </button>
                </div>
                {formViolations.length === 0 ? (
                  <div className="text-center py-6 bg-emerald-50/50 rounded-lg border border-emerald-100">
                    <CheckCircle2 size={20} className="text-emerald-500 mx-auto mb-1" />
                    <p className="text-xs font-medium text-emerald-700">Clean Inspection - No violations</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formViolations.map((v, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Violation #{idx + 1}</span>
                          <button type="button" onClick={() => removeFormViolation(idx)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                            <select
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500 bg-white"
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Select Code</label>
                            <input 
                              type="text" 
                              list={`violation-codes-${idx}`}
                              className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" 
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sub-Category</label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 focus:outline-none" readOnly value={v.subDescription || ''} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                          <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="Violation description" value={v.description || ''} onChange={e => updateFormViolation(idx, 'description', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-5 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Severity</label>
                            <input type="number" min="0" max="10" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" value={v.severity} onChange={e => updateFormViolation(idx, 'severity', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Weight</label>
                            <input type="number" min="0" max="10" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" value={v.weight} onChange={e => updateFormViolation(idx, 'weight', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Points</label>
                            <input type="number" min="0" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" value={v.points} onChange={e => updateFormViolation(idx, 'points', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Risk Cat.</label>
                            <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500" value={v.driverRiskCategory} onChange={e => updateFormViolation(idx, 'driverRiskCategory', parseInt(e.target.value))}>
                              <option value={1}>1 - High</option><option value={2}>2 - Medium</option><option value={3}>3 - Low</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">OOS</label>
                            <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500" value={v.oos ? 'yes' : 'no'} onChange={e => updateFormViolation(idx, 'oos', e.target.value === 'yes')}>
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
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Fine & Expenses</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Currency</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" value={inspForm.currency} onChange={e => setInspForm(p => ({ ...p, currency: e.target.value }))}>
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD (C$)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Fine Amount</label>
                    <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="0.00" value={inspForm.fineAmount} onChange={e => setInspForm(p => ({ ...p, fineAmount: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Violation Documents */}
              <div className="border-t border-slate-100 pt-5">
                <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={14} className="text-blue-500" /> Violation Documents
                    </h4>
                    <button
                      type="button"
                      onClick={() => setInspAttachedDocs(prev => [...prev, {
                        id: `doc-${Math.random().toString(36).substr(2, 9)}`,
                        docTypeId: '', docNumber: '', issueDate: '', fileName: ''
                      }])}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Document Type</label>
                          <select
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500"
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Document Number</label>
                          <input
                            type="text"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
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
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Issue Date</label>
                          <input
                            type="date"
                            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500"
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
                        <span className="text-[10px] font-bold text-slate-400 uppercase mb-0">Upload Documents</span>
                        <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-blue-200 rounded-lg bg-white hover:bg-blue-50/30 transition-colors cursor-pointer">
                          <Upload size={20} className="text-blue-400 mb-1" />
                          <span className="text-xs text-blue-500 font-medium">Document PDF</span>
                          <label className="mt-2 cursor-pointer">
                            <span className="text-[11px] text-slate-500">Choose File</span>
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
                              <span className="ml-2 text-[11px] text-emerald-600 font-medium">{doc.fileName}</span>
                            ) : (
                              <span className="ml-2 text-[11px] text-slate-400">No file chosen</span>
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
