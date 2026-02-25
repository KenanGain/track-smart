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
              <span className="text-xs font-bold text-slate-700 uppercase">{label}</span>
              <span className="text-xs font-bold text-slate-400">{value}%</span>
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
    <div className="hidden group-hover:block absolute z-50 w-64 p-3 bg-slate-900 text-white text-sm rounded-lg shadow-xl bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
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
        <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">{title}</span>
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
          <span className="text-sm font-bold text-slate-800">{record.date}</span>
        </div>

        {/* Report ID */}
        <div className="col-span-2 min-w-0 flex flex-col justify-center">
          <span className="text-sm font-bold text-blue-600 block truncate leading-tight">{record.id}</span>
          {getJurisdiction(record.state) === 'CVOR' ? (
            <span className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${getInspectionTagSpecs('CVOR', record.level)}`}>CVOR L{record.level?.replace(/level\s*/i, '') || '1'}</span>
          ) : (
            <span className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[10px] font-bold tracking-wider border ${getInspectionTagSpecs('CSA', record.level)}`}>SMS L{record.level?.replace(/level\s*/i, '') || '1'}</span>
          )}
        </div>

        {/* Country + State */}
        <div className="col-span-1 flex flex-col justify-center">
          <span className="text-sm font-medium text-slate-700">
            {record.state}, {getJurisdiction(record.state) === 'CVOR' ? 'CAN' : 'USA'}
          </span>
        </div>

        {/* Driver */}
        <div className="col-span-2 flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
            <User size={12} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{record.driver?.split(',')[0]}</span>
            <span className="text-[11px] text-slate-400 font-medium truncate block">{record.driverId}</span>
          </div>
        </div>

        {/* Asset */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-sm font-bold text-slate-800 truncate block leading-tight">
            {primaryUnit?.license || record.vehiclePlate}
          </span>
          <span className="text-[11px] text-slate-500 font-medium truncate block mt-0.5">
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
               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">
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
      </div>

      {/* ===== EXPANDED DETAILS (Dropdown View) ===== */}
      {isExpanded && (
        <div className="bg-slate-50/50 p-5 md:p-8 border-t border-slate-200 shadow-inner flex flex-col gap-8">
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

              {/* Top Cards: Driver, Asset, Summary, OOS */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="space-y-3">
                  <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
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
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[13px]">
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
                  <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
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
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
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

                <div className="space-y-3">
                  <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle size={14} className="text-slate-400" /> Out of Service (OOS)
                  </h4>
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full flex flex-col justify-between">
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
                <div className="bg-white border border-slate-200 rounded shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
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
                              <p className="text-xs text-blue-400/90 mt-1 font-medium">{violation.subDescription}</p>
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
                          <span className={`px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wider ${
                            jurisdiction === 'CVOR'
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-blue-100 text-blue-700 border border-blue-200'
                          }`}>{jurisdiction}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Inspection {record.id}</p>
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
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
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
                            <span className={`px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wider ${
                              jurisdiction === 'CVOR'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {jurisdiction === 'CVOR' ? 'CSA' : 'CVOR'} Equivalent
                            </span>
                            <span className="text-xs text-slate-400 font-medium">{equivalent.source}</span>
                          </div>
                          <div className="font-mono text-sm font-bold text-slate-800">{equivalent.code}</div>
                          <div className="text-[13px] text-slate-500 mt-0.5">{equivalent.shortDescription}</div>
                        </div>
                      )}

                      <div>
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Category</div>
                        <div className="mt-1 text-slate-800">{selectedViolation.category}</div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Description</div>
                        <div className="mt-1 text-slate-900 leading-relaxed">{selectedViolation.description}</div>
                        {selectedViolation.subDescription && (
                          <div className="mt-1 text-sm text-blue-600/90">{selectedViolation.subDescription}</div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[13px] text-slate-500 uppercase tracking-wider">Severity</div>
                          <div className="mt-1 font-bold text-slate-900">{selectedViolation.severity}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[13px] text-slate-500 uppercase tracking-wider">Weight</div>
                          <div className="mt-1 font-bold text-slate-900">{selectedViolation.weight}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[13px] text-slate-500 uppercase tracking-wider">Points</div>
                          <div className="mt-1 font-bold text-slate-900">{selectedViolation.points}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                          <div className="text-[13px] text-slate-500 uppercase tracking-wider">OOS</div>
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
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'sms' | 'cvor'>('overview');
  const [smsPeriod, setSmsPeriod] = useState<'1M' | '3M' | '12M' | '24M'>('24M');
  const smsBasicCategory = 'All';
  const [smsSummaryView, setSmsSummaryView] = useState<'PERCENTILES' | 'INSPECTIONS'>('PERCENTILES');
  const [smsTopViolSort, setSmsTopViolSort] = useState<'POINTS' | 'COUNT'>('POINTS');
  const [smsMetricsView, setSmsMetricsView] = useState<'INSPECTIONS' | 'VIOLATIONS' | 'POINTS'>('POINTS');
  const [metricsSort, setMetricsSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });
  // CVOR tab chart states
  const [cvorPeriod, setCvorPeriod] = useState<'1M' | '3M' | '12M' | '24M'>('24M');
  const [cvorSummaryView, setCvorSummaryView] = useState<'CATEGORIES' | 'INSPECTIONS'>('CATEGORIES');
  const [cvorTopViolSort, setCvorTopViolSort] = useState<'POINTS' | 'COUNT'>('POINTS');
  const [cvorMetricsView, setCvorMetricsView] = useState<'INSPECTIONS' | 'VIOLATIONS' | 'POINTS'>('POINTS');
  const [cvorMetricsSort, setCvorMetricsSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });
  // Expandable BASIC row states
  const [expandedBasic, setExpandedBasic] = useState<string | null>(null);
  const [basicChartView, setBasicChartView] = useState<Record<string, 'MEASURE' | 'INSPECTIONS'>>({});
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

        {/* ===== MAIN TAB NAVIGATION ===== */}
        <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 gap-1 mb-2">
          {[
            { id: 'overview' as const, label: 'Full Overview' },
            { id: 'sms' as const, label: 'SMS (FMCSA)' },
            { id: 'cvor' as const, label: 'CVOR (Canadian)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Col 1: Safety Rating & OOS */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-blue-500"/> Safety Rating & OOS
                <InfoTooltip 
                  text="Safety Rating is a company-wide grade. OOS Rates show how often the carrier's vehicles/drivers are pulled off the road compared to the national average." 
                />
              </h3>
              <div className="mb-4 text-sm font-medium text-slate-700">
                Current Rating: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{carrierProfile.rating}</span>
              </div>
              <div className="overflow-x-auto rounded border border-slate-100 mt-auto">
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

            {/* Col 2: Licensing */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                <FileSignature size={14} className="text-purple-500"/> Licensing
                <InfoTooltip 
                  text="Applies exclusively to the whole company. Dictates whether the business has the legal authority and financial backing to operate." 
                />
              </h3>
              <div className="space-y-2 text-sm">
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
                <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">SMS</span>
                <InfoTooltip text="The carrier's overall safety percentile score based on a 2-year period, ranked against other similar companies." />
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
                let ratingLabel = 'OK';
                let borderClass = '';
                if (rating >= cvorThresholds.showCause) { ratingClass = 'bg-red-100 text-red-800'; ratingLabel = 'CRITICAL'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (rating >= cvorThresholds.intervention) { ratingClass = 'bg-amber-100 text-amber-800'; ratingLabel = 'HIGH'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                else if (rating >= cvorThresholds.warning) { ratingClass = 'bg-yellow-100 text-yellow-800'; ratingLabel = 'ALERT'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`text-sm font-medium ${rating >= cvorThresholds.warning ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>Overall CVOR Rating</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">{rating}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${ratingClass}`}>{ratingLabel}</span>
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
                let label = 'OK';
                let borderClass = '';
                if (val >= cvorThresholds.intervention) { alertClass = 'bg-red-100 text-red-800'; label = 'HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-amber-100 text-amber-800'; label = 'ALERT'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Collisions</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.collisions.weight} | {val}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{label}</span>
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
                let label = 'OK';
                let borderClass = '';
                if (val >= cvorThresholds.intervention) { alertClass = 'bg-red-100 text-red-800'; label = 'HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-amber-100 text-amber-800'; label = 'ALERT'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Convictions</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.convictions.weight} | {val}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{label}</span>
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
                let label = 'OK';
                let borderClass = '';
                if (val >= cvorThresholds.showCause) { alertClass = 'bg-red-100 text-red-800'; label = 'VERY HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
                else if (val >= cvorThresholds.intervention) { alertClass = 'bg-amber-100 text-amber-800'; label = 'HIGH'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
                else if (val >= cvorThresholds.warning) { alertClass = 'bg-yellow-100 text-yellow-800'; label = 'ALERT'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
                return (
                  <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-sm font-medium text-slate-700">Inspections</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-mono">Wt: {carrierProfile.cvorAnalysis.inspections.weight} | {val}%</span>
                        <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{label}</span>
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
                  <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Miles</div>
                  <div className="font-mono font-bold text-blue-600 text-sm mt-0.5">{(carrierProfile.cvorAnalysis.counts.totalMiles / 1000000).toFixed(1)}M</div>
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

          </div>
        </div>

        {/* ===== KPI FILTERS (Mini Rectangles) ===== */}
        <div className="mt-8">
          <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">Inspection Filters</h3>
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
            <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
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

        </>)}

      </div>

      {/* ===== TAB: SMS (FMCSA) ===== */}
      {activeMainTab === 'sms' && (() => {
        const smsInspections = inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA');
        const smsStats = {
          total: smsInspections.length,
          clean: smsInspections.filter(i => i.isClean).length,
          oos: smsInspections.filter(i => i.hasOOS).length,
          vehicle: smsInspections.filter(i => i.hasVehicleViolations).length,
          driver: smsInspections.filter(i => i.hasDriverViolations).length,
          severe: smsInspections.filter(i => i.violations.some(v => v.severity >= 7)).length,
        };
        const smsFilteredData = smsInspections.filter(insp => {
          const matchesSearch = insp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            insp.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
            insp.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
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
        const smsPagedData = smsFilteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);

        return (
        <div className="space-y-6">
          {/* Top Row: Safety Rating & OOS + Licensing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safety Rating & OOS */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-blue-500"/> Safety Rating & OOS Rates
              </h3>
              <div className="mb-4 text-sm font-medium text-slate-700">
                Current Rating: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{carrierProfile.rating}</span>
              </div>
              <div className="overflow-x-auto rounded border border-slate-100 mt-auto">
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

            {/* Licensing */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-3">
                <FileSignature size={14} className="text-purple-500"/> Licensing
              </h3>
              <div className="space-y-2 text-sm">
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

          {/* ===== SECTION 1: BASIC CATEGORIES SUMMARY BAR ===== */}
          {(() => {
            const basics = computedBasicOverview.filter(b => b.category !== 'Others');
            const displayedBasics = smsBasicCategory === 'All' ? basics : basics.filter(b => b.category === smsBasicCategory);

            // Period-filtered SMS inspections for chart data
            const now = new Date('2025-12-31'); // reference date matching "Updated December 2025"
            const periodMonths = smsPeriod === '1M' ? 1 : smsPeriod === '3M' ? 3 : smsPeriod === '12M' ? 12 : 24;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - periodMonths);
            const periodInspections = smsInspections.filter(i => new Date(i.date) >= cutoff);

            return (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-end mb-4 flex-wrap gap-3">
                {/* Period selector */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Updated December 2025</span>
                  <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                    {(['1M', '3M', '12M', '24M'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setSmsPeriod(p)}
                        className={`px-2.5 py-1 text-xs font-bold transition-colors ${smsPeriod === p ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category percentile cards */}
              <div className={`grid gap-3 ${displayedBasics.length === 1 ? 'grid-cols-1 max-w-[200px]' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'}`}>
                {displayedBasics.map((b, i) => {
                  const pct = parseInt(b.percentile) || 0;
                  const isAlert = b.percentile !== 'N/A' && pct >= csaThresholds.warning;
                  // Compute actual count from period-filtered data
                  const catInspections = periodInspections.filter(insp =>
                    insp.violations.some(v => v.category === b.category)
                  ).length;
                  return (
                    <div key={i} className="group relative text-center p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 truncate" title={b.category}>{b.category}</div>
                      <div className={`text-lg font-bold ${isAlert ? 'text-red-600' : 'text-slate-800'}`}>
                        {b.percentile === 'N/A' ? '0%' : b.percentile}
                      </div>
                      {isAlert && <span className="text-[11px] text-red-500 font-bold">▲ {pct}</span>}
                      <div className="text-[11px] text-slate-400 mt-0.5">{catInspections} insp.</div>
                      <div className="pointer-events-none absolute z-20 left-1/2 top-full mt-2 -translate-x-1/2 w-56 rounded-lg border border-slate-200 bg-white p-2.5 text-left shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        <div className="text-[11px] font-bold text-slate-700">{b.category}</div>
                        <div className="mt-1 text-[11px] text-slate-500">Percentile: <span className="font-semibold text-slate-700">{b.percentile === 'N/A' ? '0%' : b.percentile}</span></div>
                        <div className="text-[11px] text-slate-500">Inspections: <span className="font-semibold text-slate-700">{catInspections}</span></div>
                        <div className="text-[11px] text-slate-500">Status: <span className={`font-semibold ${isAlert ? 'text-red-600' : 'text-emerald-600'}`}>{isAlert ? 'Over Threshold' : 'Within Threshold'}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {/* ===== SECTION 2: BASIC SUMMARY + OOS DONUT + TOP VIOLATIONS ===== */}
          {(() => {
            // Period-filtered inspections
            const now = new Date('2025-12-31');
            const periodMonths = smsPeriod === '1M' ? 1 : smsPeriod === '3M' ? 3 : smsPeriod === '12M' ? 12 : 24;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - periodMonths);
            const periodInspections = smsInspections.filter(i => new Date(i.date) >= cutoff);

            // Filter by selected basic category if not 'All'
            const relevantInspections = smsBasicCategory === 'All'
              ? periodInspections
              : periodInspections.filter(insp => insp.violations.some(v => v.category === smsBasicCategory));

            return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* LEFT: BASIC Summary Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">BASIC Summary <span className="text-sm font-normal text-slate-400">/ December 2025</span></h3>
                  <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                    <button
                      onClick={() => setSmsSummaryView('PERCENTILES')}
                      className={`px-3 py-1.5 text-sm font-bold transition-colors ${smsSummaryView === 'PERCENTILES' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                    >PERCENTILES</button>
                    <button
                      onClick={() => setSmsSummaryView('INSPECTIONS')}
                      className={`px-3 py-1.5 text-sm font-bold transition-all ${smsSummaryView === 'INSPECTIONS' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                    >INSPECTIONS</button>
                  </div>
                </div>

                {smsSummaryView === 'PERCENTILES' ? (
                  <>
                    {/* Legend */}
                    <div className="flex items-center gap-5 mb-5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-slate-600">Under Threshold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-slate-600">Over Threshold</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-600">Intervention Threshold</span>
                      </div>
                    </div>

                    {/* Horizontal Bars */}
                    <div className="space-y-5">
                      {computedBasicOverview
                        .filter(b => b.category !== 'Others')
                        .filter(b => smsBasicCategory === 'All' || b.category === smsBasicCategory)
                        .map((b, i) => {
                        const pct = parseInt(b.percentile) || 0;
                        const isNA = b.percentile === 'N/A';
                        let barColor = 'bg-blue-500';
                        let dotColor = 'bg-blue-500';
                        let statusLabel = 'Under Threshold';
                        if (!isNA && pct >= csaThresholds.critical) { barColor = 'bg-red-500'; dotColor = 'bg-red-500'; statusLabel = 'Intervention Threshold'; }
                        else if (!isNA && pct >= csaThresholds.warning) { barColor = 'bg-amber-500'; dotColor = 'bg-amber-500'; statusLabel = 'Over Threshold'; }
                        return (
                          <div key={i} className="group/bar flex items-center gap-3 relative">
                            <div className="w-40 text-sm font-semibold text-slate-700 truncate" title={b.category}>{b.category}</div>
                            <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${dotColor}`}></div>
                            <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-visible cursor-pointer">
                              {!isNA && pct > 0 && (
                                <div className={`absolute left-0 top-0 h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                              )}
                              <div className="absolute top-0 h-full border-l border-slate-300" style={{ left: `${csaThresholds.warning}%` }}></div>
                              <div className="absolute top-0 h-full border-l-2 border-red-400" style={{ left: `${csaThresholds.critical}%` }}></div>
                              {!isNA && pct > 0 && (
                                <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow ${barColor}`} style={{ left: `calc(${Math.min(pct, 100)}% - 8px)` }}></div>
                              )}
                              {/* Hover tooltip */}
                              <div className="hidden group-hover/bar:block absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                <div className="bg-slate-900 text-white text-sm rounded-lg px-3.5 py-2.5 shadow-xl whitespace-nowrap">
                                  <div className="font-bold text-blue-300 mb-0.5">{b.category}</div>
                                  <div>Percentile: <span className="font-bold">{b.percentile}</span></div>
                                  <div>Measure: <span className="font-bold">{b.measure}</span></div>
                                  <div>Status: <span className="font-bold">{isNA ? 'Insufficient Data' : statusLabel}</span></div>
                                  <div className="text-slate-400 mt-0.5 max-w-[220px] whitespace-normal">{b.details}</div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                </div>
                              </div>
                            </div>
                            <span className={`text-sm font-bold w-12 text-right ${pct >= csaThresholds.critical ? 'text-red-600' : pct >= csaThresholds.warning ? 'text-amber-600' : 'text-slate-500'}`}>
                              {isNA ? '0%' : b.percentile}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    {/* INSPECTIONS view - Vertical bar chart by month */}
                    <div className="flex items-center gap-5 mb-5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-blue-900"></div>
                        <span className="text-slate-600">Inspections with Violations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-blue-300"></div>
                        <span className="text-slate-600">Inspections without Violations</span>
                      </div>
                    </div>
                    {(() => {
                      // Group period inspections by month
                      const monthMap: Record<string, { withViol: number; withoutViol: number }> = {};
                      relevantInspections.forEach(insp => {
                        const d = new Date(insp.date);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (!monthMap[key]) monthMap[key] = { withViol: 0, withoutViol: 0 };
                        const hasCategory = smsBasicCategory === 'All'
                          ? insp.violations.length > 0
                          : insp.violations.some(v => v.category === smsBasicCategory);
                        if (hasCategory) monthMap[key].withViol++;
                        else monthMap[key].withoutViol++;
                      });

                      // Fill missing months
                      const months: string[] = [];
                      const start = new Date(cutoff);
                      start.setDate(1);
                      for (let m = new Date(start); m <= now; m.setMonth(m.getMonth() + 1)) {
                        months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
                      }
                      const maxVal = Math.max(1, ...months.map(m => (monthMap[m]?.withViol || 0) + (monthMap[m]?.withoutViol || 0)));
                      const yLabels = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * (4 - i) * 10) / 10);
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                      return (
                        <div className="mt-3">
                          <div className="text-sm text-slate-400 font-bold uppercase mb-3">{maxVal} inspections</div>
                          <div className="flex items-end gap-px" style={{ height: 260 }}>
                            {/* Y-axis labels */}
                            <div className="flex flex-col justify-between h-full pr-2 text-xs text-slate-400 font-mono w-10 flex-shrink-0">
                              {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                              <span>0</span>
                            </div>
                            {/* Bars */}
                            <div className="flex-1 flex items-end gap-1 h-full border-b border-l border-slate-200 px-1 pb-0.5 relative">
                              {/* Horizontal grid lines */}
                              {yLabels.map((_, i) => (
                                <div key={i} className="absolute left-0 right-0 border-t border-slate-100" style={{ bottom: `${((4 - i) / 4) * 100}%` }}></div>
                              ))}
                              {months.map(m => {
                                const data = monthMap[m] || { withViol: 0, withoutViol: 0 };
                                const hWith = maxVal > 0 ? (data.withViol / maxVal) * 100 : 0;
                                const hWithout = maxVal > 0 ? (data.withoutViol / maxVal) * 100 : 0;
                                const [y, mo] = m.split('-');
                                const label = periodMonths <= 3
                                  ? `${monthNames[parseInt(mo) - 1]}`
                                  : `${monthNames[parseInt(mo) - 1]} ${y.slice(2)}`;
                                return (
                                  <div key={m} className="group/col flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer">
                                    <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: '100%' }}>
                                      {data.withViol > 0 && <div className="bg-blue-900 rounded-t-sm w-4 group-hover/col:opacity-80 transition-opacity" style={{ height: `${hWith}%`, minHeight: data.withViol > 0 ? 4 : 0 }}></div>}
                                      {data.withoutViol > 0 && <div className="bg-blue-300 rounded-t-sm w-4 group-hover/col:opacity-80 transition-opacity" style={{ height: `${hWithout}%`, minHeight: data.withoutViol > 0 ? 4 : 0 }}></div>}
                                    </div>
                                    {(data.withViol > 0 || data.withoutViol > 0) && (
                                      <div className="hidden group-hover/col:block absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none">
                                        <div className="bg-slate-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                          <div className="font-bold text-blue-300 mb-0.5">{label}</div>
                                          <div>With violations: <span className="font-bold">{data.withViol}</span></div>
                                          <div>Clean: <span className="font-bold">{data.withoutViol}</span></div>
                                          <div>Total: <span className="font-bold">{data.withViol + data.withoutViol}</span></div>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* X-axis labels */}
                          <div className="flex ml-10 mt-1">
                            {months.length <= 12 ? (
                              months.map((m, i) => {
                                const [y, mo] = m.split('-');
                                return <div key={i} className="flex-1 text-center text-xs text-slate-400">{monthNames[parseInt(mo) - 1]} {y.slice(2)}</div>;
                              })
                            ) : (
                              <>
                                <div className="flex-none text-xs text-slate-400">{monthNames[new Date(cutoff).getMonth()]} {cutoff.getFullYear()}</div>
                                <div className="flex-1"></div>
                                <div className="flex-none text-xs text-slate-400">Dec 2025</div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* RIGHT: OOS Donut + Top Violations */}
              <div className="space-y-4">

                {/* Out of Service Summary */}
                {(() => {
                  const totalViolations = relevantInspections.reduce((sum, insp) => sum + insp.violations.filter(v => smsBasicCategory === 'All' || v.category === smsBasicCategory).length, 0);
                  const oosViolations = relevantInspections.reduce((sum, insp) => sum + insp.violations.filter(v => v.oos && (smsBasicCategory === 'All' || v.category === smsBasicCategory)).length, 0);
                  const nonOosViolations = totalViolations - oosViolations;
                  const oosPercent = totalViolations > 0 ? Math.round((oosViolations / totalViolations) * 100) : 0;
                  const nonOosPercent = 100 - oosPercent;
                  const circumference = 2 * Math.PI * 45;
                  const nonOosStroke = (nonOosPercent / 100) * circumference;
                  const oosStroke = circumference - nonOosStroke;

                  return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Out of Service Summary <span className="text-sm font-normal text-slate-400">/ Last {smsPeriod === '24M' ? '24 Months' : smsPeriod === '12M' ? '12 Months' : smsPeriod === '3M' ? '3 Months' : '1 Month'}</span></h3>
                    <div className="flex items-center gap-6">
                      <div className="relative flex-shrink-0">
                        <svg width="110" height="110" viewBox="0 0 110 110">
                          <circle cx="55" cy="55" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                          {totalViolations > 0 && (
                            <circle cx="55" cy="55" r="45" fill="none" stroke="#3b82f6" strokeWidth="10"
                              strokeDasharray={`${nonOosStroke} ${oosStroke}`}
                              strokeLinecap="round"
                              transform="rotate(-90 55 55)" />
                          )}
                          {oosViolations > 0 && (
                            <circle cx="55" cy="55" r="45" fill="none" stroke="#ef4444" strokeWidth="10"
                              strokeDasharray={`${oosStroke} ${nonOosStroke}`}
                              strokeDashoffset={-nonOosStroke}
                              strokeLinecap="round"
                              transform="rotate(-90 55 55)" />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-slate-900">{totalViolations}</span>
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Violations</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div>
                          <span className="text-slate-600">Non OOS</span>
                          <span className="ml-auto font-bold text-slate-700">{nonOosPercent}%</span>
                          <span className="text-slate-500 w-6 text-right">{nonOosViolations}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
                          <span className="text-slate-600">Out-of-service</span>
                          <span className="ml-auto font-bold text-slate-700">{oosPercent}%</span>
                          <span className="text-slate-500 w-6 text-right">{oosViolations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* Top Violations */}
                {(() => {
                  const violationMap: Record<string, { points: number; count: number }> = {};
                  relevantInspections.forEach(insp => {
                    insp.violations
                      .filter(v => smsBasicCategory === 'All' || v.category === smsBasicCategory)
                      .forEach(v => {
                        const key = v.description.length > 40 ? v.description.substring(0, 40) + '…' : v.description;
                        if (!violationMap[key]) violationMap[key] = { points: 0, count: 0 };
                        violationMap[key].points += v.points;
                        violationMap[key].count += 1;
                      });
                  });
                  const topViolations = Object.entries(violationMap)
                    .sort((a, b) => smsTopViolSort === 'POINTS' ? b[1].points - a[1].points : b[1].count - a[1].count)
                    .slice(0, 5);

                  return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900">Top Violations</h3>
                      <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                        <button
                          onClick={() => setSmsTopViolSort('POINTS')}
                          className={`px-2.5 py-1.5 text-sm font-bold transition-colors ${smsTopViolSort === 'POINTS' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                        >POINTS</button>
                        <button
                          onClick={() => setSmsTopViolSort('COUNT')}
                          className={`px-2.5 py-1.5 text-sm font-bold transition-colors ${smsTopViolSort === 'COUNT' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                        >COUNT</button>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {topViolations.length > 0 ? topViolations.map(([name, data], i) => (
                        <div key={i} className="flex items-center justify-between text-sm gap-2">
                          <span className="text-slate-700 truncate" title={name}>{name}</span>
                          <span className="font-bold text-slate-900 flex-shrink-0">{smsTopViolSort === 'POINTS' ? data.points : data.count}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-400 text-center py-4">No violations in this period.</p>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            </div>
            );
          })()}

          {/* ===== SECTION 3: BASIC METRICS BY STATE ===== */}
          {(() => {
            const now = new Date('2025-12-31');
            const periodMonths = smsPeriod === '1M' ? 1 : smsPeriod === '3M' ? 3 : smsPeriod === '12M' ? 12 : 24;
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
                <h3 className="text-base font-bold text-slate-900">BASIC Metrics by State <span className="text-sm font-normal text-slate-400">/ Last {smsPeriod === '24M' ? '24 Months' : smsPeriod === '12M' ? '12 Months' : smsPeriod === '3M' ? '3 Months' : '1 Month'}</span></h3>
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



          {/* Intervention Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertOctagon className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide">FMCSA Intervention Warning</h4>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                The carrier exceeds the FMCSA Intervention Threshold relative to its safety event grouping based on roadside data. This carrier may be prioritized for an intervention action and roadside inspection.
              </p>
            </div>
          </div>

          {/* CSA BASIC Status - Full Width */}
          {(() => {
            const chartCategories = ['Unsafe Driving', 'Hours-of-service Compliance', 'Vehicle Maintenance', 'Controlled Substances', 'Driver Fitness'];
            const smsInsp = inspectionsData.filter(i => getJurisdiction(i.state) === 'CSA');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

            return (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Gauge size={16} className="text-blue-600"/>
              </div>
              <h3 className="text-sm font-bold text-slate-900">SMS BASIC Status</h3>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">SMS</span>
              <InfoTooltip text="The carrier's FMCSA Safety Measurement System percentile scores based on a 2-year period, ranked against similar carriers. Click a row to expand." />
            </div>
            <div className="space-y-0">
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
                      const inspWithCat = smsInsp.filter(insp =>
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
                        const cutoff24 = new Date(snapDate);
                        cutoff24.setMonth(cutoff24.getMonth() - 24);
                        // Find inspections within 24-month window of this snapshot
                        const windowInsp = smsInsp.filter(insp => {
                          const id = new Date(insp.date);
                          return id >= cutoff24 && id <= snapDate && insp.violations.some(v => v.category === status.category);
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
                                          <div className="text-xs text-slate-400 mb-3 text-center leading-relaxed">Based on 24 months of on-road performance. Zero indicates best performance.</div>
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
                                      for (let i = 11; i >= 0; i--) {
                                        const d = new Date(now2);
                                        d.setMonth(d.getMonth() - i);
                                        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                                      }
                                      // Count inspections with AND without violations for this BASIC per month
                                      const monthData: Record<string, { withViol: number; clean: number }> = {};
                                      smsInsp.forEach(insp => {
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

          {/* SMS Inspection Filters */}
          <div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3">SMS Inspection Filters</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MiniKpiCard title="All SMS" value={smsStats.total} icon={ClipboardCheck} color="blue" active={activeFilter === 'ALL'} onClick={() => setActiveFilter('ALL')} />
              <MiniKpiCard title="Clean" value={smsStats.clean} icon={CheckCircle2} color="emerald" active={activeFilter === 'CLEAN'} onClick={() => setActiveFilter('CLEAN')} />
              <MiniKpiCard title="OOS Flags" value={smsStats.oos} icon={ShieldAlert} color="red" active={activeFilter === 'OOS'} onClick={() => setActiveFilter('OOS')} />
              <MiniKpiCard title="Veh. Issues" value={smsStats.vehicle} icon={Truck} color="orange" active={activeFilter === 'VEHICLE'} onClick={() => setActiveFilter('VEHICLE')} />
              <MiniKpiCard title="HOS/Driver" value={smsStats.driver} icon={User} color="purple" active={activeFilter === 'DRIVER'} onClick={() => setActiveFilter('DRIVER')} />
              <MiniKpiCard title="Severe (7+)" value={smsStats.severe} icon={AlertTriangle} color="yellow" active={activeFilter === 'SEVERE'} onClick={() => setActiveFilter('SEVERE')} />
            </div>
          </div>

          {/* SMS Inspection List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">SMS Inspections</h2>
              <InfoTooltip title="US Inspections" text="Inspections conducted under US federal jurisdiction (FMCSA / SMS)." />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <DataListToolbar
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Search SMS inspections..."
                columns={columns}
                onToggleColumn={(id) => setColumns(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                totalItems={smsFilteredData.length}
                currentPage={page}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
              />

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
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

              <div className="divide-y divide-slate-200">
                {smsPagedData.length > 0 ? (
                  smsPagedData.map(record => (
                    <InspectionRow key={record.id} record={record} onEdit={openEditModal} />
                  ))
                ) : (
                  <div className="p-16 text-center text-slate-500 flex flex-col items-center bg-slate-50/50">
                    <div className="bg-white border border-slate-200 p-4 rounded-full mb-4 shadow-sm">
                      <AlertCircle size={32} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-wide">No SMS records found</h3>
                    <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm">No US/FMCSA inspections match your current search or filter criteria.</p>
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
                totalItems={smsFilteredData.length}
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
          const matchesSearch = insp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            insp.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
            insp.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase());
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

        const renderCvorRow = (label: string, val: number, detail: string, weight?: number) => {
          let alertClass = 'bg-green-100 text-green-800';
          let rowLabel = 'OK';
          let borderClass = '';
          if (val >= cvorThresholds.showCause) { alertClass = 'bg-red-100 text-red-800'; rowLabel = 'VERY HIGH'; borderClass = 'border-l-2 border-l-red-400 pl-3'; }
          else if (val >= cvorThresholds.intervention) { alertClass = 'bg-amber-100 text-amber-800'; rowLabel = 'HIGH'; borderClass = 'border-l-2 border-l-amber-400 pl-3'; }
          else if (val >= cvorThresholds.warning) { alertClass = 'bg-yellow-100 text-yellow-800'; rowLabel = 'ALERT'; borderClass = 'border-l-2 border-l-yellow-400 pl-3'; }
          return (
            <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${borderClass}`}>
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-sm font-medium text-slate-700">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">{weight !== undefined ? `Wt: ${weight} | ` : ''}{val}%</span>
                  <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${alertClass}`}>{rowLabel}</span>
                </div>
              </div>
              <span className="text-xs text-slate-500">{detail}</span>
            </div>
          );
        };

        return (
        <div className="space-y-6">

          {/* CVOR Analysis Panel - Full Width */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                <Activity size={16} className="text-red-600"/>
              </div>
              <h3 className="text-sm font-bold text-slate-900">CVOR Analysis</h3>
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-red-100 text-red-700">CVOR</span>
              <InfoTooltip text="Commercial Vehicle Operator's Registration (CVOR) performance metrics for Ontario-based carriers." />
            </div>

            {/* Overall Rating */}
            <div className={`flex flex-col justify-center py-2.5 border-b border-slate-50 ${cvorRating >= cvorThresholds.warning ? 'border-l-2 border-l-amber-400 pl-3' : ''}`}>
              <div className="flex justify-between items-center mb-0.5">
                <span className={`text-sm font-medium ${cvorRating >= cvorThresholds.warning ? 'text-amber-700 font-bold' : 'text-slate-700'}`}>Overall CVOR Rating</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">{cvorRating}%</span>
                  <span className={`text-sm font-bold px-1.5 py-0.5 rounded ${overallRatingClass}`}>{overallRatingLabel}</span>
                </div>
              </div>
              <span className="text-xs text-slate-500">Composite score from collisions, convictions, and inspections</span>
            </div>

            {/* Collisions */}
            {renderCvorRow(
              'Collisions',
              carrierProfile.cvorAnalysis.collisions.percentage,
              `${carrierProfile.cvorAnalysis.counts.collisions} collisions | ${carrierProfile.cvorAnalysis.counts.totalCollisionPoints} points`,
              carrierProfile.cvorAnalysis.collisions.weight
            )}

            {/* Convictions */}
            {renderCvorRow(
              'Convictions',
              carrierProfile.cvorAnalysis.convictions.percentage,
              `${carrierProfile.cvorAnalysis.counts.convictions} convictions | ${carrierProfile.cvorAnalysis.counts.convictionPoints} points`,
              carrierProfile.cvorAnalysis.convictions.weight
            )}

            {/* Inspections */}
            {renderCvorRow(
              'Inspections',
              carrierProfile.cvorAnalysis.inspections.percentage,
              `OOS: Overall ${carrierProfile.cvorAnalysis.counts.oosOverall}% | Vehicle ${carrierProfile.cvorAnalysis.counts.oosVehicle}% | Driver ${carrierProfile.cvorAnalysis.counts.oosDriver}%`,
              carrierProfile.cvorAnalysis.inspections.weight
            )}

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
                <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Miles</div>
                <div className="font-mono font-bold text-blue-600 text-sm mt-0.5">{(carrierProfile.cvorAnalysis.counts.totalMiles / 1000000).toFixed(1)}M</div>
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

          {/* ===== CVOR SECTION 2: VIOLATION SUMMARY CHARTS ===== */}
          {(() => {
            const now = new Date('2025-12-31');
            const periodMonths = cvorPeriod === '1M' ? 1 : cvorPeriod === '3M' ? 3 : cvorPeriod === '12M' ? 12 : 24;
            const cutoff = new Date(now);
            cutoff.setMonth(cutoff.getMonth() - periodMonths);
            const periodInspections = cvorInspections.filter(i => new Date(i.date) >= cutoff);

            // Category breakdown for CVOR inspections
            const categoryMap: Record<string, { violations: number; points: number; inspections: number; oosCount: number }> = {};
            periodInspections.forEach(insp => {
              const cats = new Set<string>();
              insp.violations.forEach(v => {
                if (!categoryMap[v.category]) categoryMap[v.category] = { violations: 0, points: 0, inspections: 0, oosCount: 0 };
                categoryMap[v.category].violations += 1;
                categoryMap[v.category].points += v.points;
                if (v.oos) categoryMap[v.category].oosCount += 1;
                cats.add(v.category);
              });
              cats.forEach(cat => { categoryMap[cat].inspections += 1; });
            });
            const categoryRows = Object.entries(categoryMap).sort((a, b) => b[1].points - a[1].points);
            const maxPoints = Math.max(1, ...categoryRows.map(([, d]) => d.points));

            return (
            <>
            {/* Period Toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">CVOR Violation Analysis</h2>
              <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                {(['1M', '3M', '12M', '24M'] as const).map(p => (
                  <button key={p} onClick={() => setCvorPeriod(p)}
                    className={`px-3 py-1.5 text-sm font-bold transition-colors ${cvorPeriod === p ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                  >{p === '1M' ? '1 Mo' : p === '3M' ? '3 Mo' : p === '12M' ? '12 Mo' : '24 Mo'}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* LEFT: Category Summary Chart */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-slate-900">Violation Categories <span className="text-sm font-normal text-slate-400">/ CVOR</span></h3>
                  <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                    <button onClick={() => setCvorSummaryView('CATEGORIES')}
                      className={`px-3 py-1.5 text-sm font-bold transition-colors ${cvorSummaryView === 'CATEGORIES' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                    >CATEGORIES</button>
                    <button onClick={() => setCvorSummaryView('INSPECTIONS')}
                      className={`px-3 py-1.5 text-sm font-bold transition-all ${cvorSummaryView === 'INSPECTIONS' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                    >INSPECTIONS</button>
                  </div>
                </div>

                {cvorSummaryView === 'CATEGORIES' ? (
                  <>
                    {/* Legend */}
                    <div className="flex items-center gap-5 mb-5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-600">High Severity</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-slate-600">Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-slate-600">Low</span>
                      </div>
                    </div>

                    {/* Horizontal Bars */}
                    <div className="space-y-5">
                      {categoryRows.length > 0 ? categoryRows.map(([cat, data], i) => {
                        const pct = maxPoints > 0 ? (data.points / maxPoints) * 100 : 0;
                        let barColor = 'bg-blue-500';
                        let dotColor = 'bg-blue-500';
                        if (data.oosCount > 0 && data.points > 30) { barColor = 'bg-red-500'; dotColor = 'bg-red-500'; }
                        else if (data.points > 15) { barColor = 'bg-amber-500'; dotColor = 'bg-amber-500'; }
                        return (
                          <div key={i} className="group/bar flex items-center gap-3 relative">
                            <div className="w-40 text-sm font-semibold text-slate-700 truncate" title={cat}>{cat}</div>
                            <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${dotColor}`}></div>
                            <div className="flex-1 relative h-6 bg-slate-100 rounded-full overflow-visible cursor-pointer">
                              {pct > 0 && (
                                <div className={`absolute left-0 top-0 h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                              )}
                              {pct > 0 && (
                                <div className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow ${barColor}`} style={{ left: `calc(${Math.min(pct, 100)}% - 8px)` }}></div>
                              )}
                              {/* Hover tooltip */}
                              <div className="hidden group-hover/bar:block absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                                <div className="bg-slate-900 text-white text-sm rounded-lg px-3.5 py-2.5 shadow-xl whitespace-nowrap">
                                  <div className="font-bold text-red-300 mb-0.5">{cat}</div>
                                  <div>Violations: <span className="font-bold">{data.violations}</span></div>
                                  <div>Points: <span className="font-bold">{data.points}</span></div>
                                  <div>OOS: <span className="font-bold">{data.oosCount}</span></div>
                                  <div>Inspections: <span className="font-bold">{data.inspections}</span></div>
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                </div>
                              </div>
                            </div>
                            <span className={`text-sm font-bold w-12 text-right ${data.oosCount > 0 ? 'text-red-600' : 'text-slate-500'}`}>
                              {data.points} pts
                            </span>
                          </div>
                        );
                      }) : (
                        <p className="text-sm text-slate-400 text-center py-6">No violations in this period.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* INSPECTIONS view - Monthly bar chart */}
                    <div className="flex items-center gap-5 mb-5 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-red-800"></div>
                        <span className="text-slate-600">Inspections with Violations</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-red-300"></div>
                        <span className="text-slate-600">Clean Inspections</span>
                      </div>
                    </div>
                    {(() => {
                      const monthMap: Record<string, { withViol: number; withoutViol: number }> = {};
                      periodInspections.forEach(insp => {
                        const d = new Date(insp.date);
                        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (!monthMap[key]) monthMap[key] = { withViol: 0, withoutViol: 0 };
                        if (insp.violations.length > 0) monthMap[key].withViol++;
                        else monthMap[key].withoutViol++;
                      });

                      const months: string[] = [];
                      const start = new Date(cutoff);
                      start.setDate(1);
                      for (let m = new Date(start); m <= now; m.setMonth(m.getMonth() + 1)) {
                        months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
                      }
                      const maxVal = Math.max(1, ...months.map(m => (monthMap[m]?.withViol || 0) + (monthMap[m]?.withoutViol || 0)));
                      const yLabels = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * (4 - i) * 10) / 10);
                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                      return (
                        <div className="mt-3">
                          <div className="text-sm text-slate-400 font-bold uppercase mb-3">{periodInspections.length} inspections</div>
                          <div className="flex items-end gap-px" style={{ height: 260 }}>
                            <div className="flex flex-col justify-between h-full pr-2 text-xs text-slate-400 font-mono w-10 flex-shrink-0">
                              {yLabels.map((v, i) => <span key={i}>{v}</span>)}
                              <span>0</span>
                            </div>
                            <div className="flex-1 flex items-end gap-1 h-full border-b border-l border-slate-200 px-1 pb-0.5 relative">
                              {yLabels.map((_, i) => (
                                <div key={i} className="absolute left-0 right-0 border-t border-slate-100" style={{ bottom: `${((4 - i) / 4) * 100}%` }}></div>
                              ))}
                              {months.map(m => {
                                const data = monthMap[m] || { withViol: 0, withoutViol: 0 };
                                const hWith = maxVal > 0 ? (data.withViol / maxVal) * 100 : 0;
                                const hWithout = maxVal > 0 ? (data.withoutViol / maxVal) * 100 : 0;
                                const [y, mo] = m.split('-');
                                const label = periodMonths <= 3 ? `${monthNames[parseInt(mo) - 1]}` : `${monthNames[parseInt(mo) - 1]} ${y.slice(2)}`;
                                return (
                                  <div key={m} className="group/col flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer">
                                    <div className="flex gap-0.5 items-end w-full justify-center" style={{ height: '100%' }}>
                                      {data.withViol > 0 && <div className="bg-red-800 rounded-t-sm w-4 group-hover/col:opacity-80 transition-opacity" style={{ height: `${hWith}%`, minHeight: 4 }}></div>}
                                      {data.withoutViol > 0 && <div className="bg-red-300 rounded-t-sm w-4 group-hover/col:opacity-80 transition-opacity" style={{ height: `${hWithout}%`, minHeight: 4 }}></div>}
                                    </div>
                                    {(data.withViol > 0 || data.withoutViol > 0) && (
                                      <div className="hidden group-hover/col:block absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-1 pointer-events-none">
                                        <div className="bg-slate-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                                          <div className="font-bold text-red-300 mb-0.5">{label}</div>
                                          <div>With violations: <span className="font-bold">{data.withViol}</span></div>
                                          <div>Clean: <span className="font-bold">{data.withoutViol}</span></div>
                                          <div>Total: <span className="font-bold">{data.withViol + data.withoutViol}</span></div>
                                          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900"></div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex ml-12 mt-1">
                            {months.length <= 12 ? (
                              months.map((m, i) => {
                                const [y, mo] = m.split('-');
                                return <div key={i} className="flex-1 text-center text-xs text-slate-400">{monthNames[parseInt(mo) - 1]} {y.slice(2)}</div>;
                              })
                            ) : (
                              <>
                                <div className="flex-none text-xs text-slate-400">{monthNames[new Date(cutoff).getMonth()]} {cutoff.getFullYear()}</div>
                                <div className="flex-1"></div>
                                <div className="flex-none text-xs text-slate-400">Dec 2025</div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* RIGHT: OOS Donut + Top Violations */}
              <div className="space-y-4">

                {/* Out of Service Summary */}
                {(() => {
                  const totalViolations = periodInspections.reduce((sum, insp) => sum + insp.violations.length, 0);
                  const oosViolations = periodInspections.reduce((sum, insp) => sum + insp.violations.filter(v => v.oos).length, 0);
                  const nonOosViolations = totalViolations - oosViolations;
                  const oosPercent = totalViolations > 0 ? Math.round((oosViolations / totalViolations) * 100) : 0;
                  const nonOosPercent = 100 - oosPercent;
                  const circumference = 2 * Math.PI * 45;
                  const nonOosStroke = (nonOosPercent / 100) * circumference;
                  const oosStroke = circumference - nonOosStroke;

                  return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-900 mb-4">OOS Summary <span className="text-sm font-normal text-slate-400">/ CVOR</span></h3>
                    <div className="flex items-center gap-6">
                      <div className="relative flex-shrink-0">
                        <svg width="110" height="110" viewBox="0 0 110 110">
                          <circle cx="55" cy="55" r="45" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                          {totalViolations > 0 && (
                            <circle cx="55" cy="55" r="45" fill="none" stroke="#ef4444" strokeWidth="10"
                              strokeDasharray={`${nonOosStroke} ${oosStroke}`}
                              strokeLinecap="round"
                              transform="rotate(-90 55 55)" />
                          )}
                          {oosViolations > 0 && (
                            <circle cx="55" cy="55" r="45" fill="none" stroke="#991b1b" strokeWidth="10"
                              strokeDasharray={`${oosStroke} ${nonOosStroke}`}
                              strokeDashoffset={-nonOosStroke}
                              strokeLinecap="round"
                              transform="rotate(-90 55 55)" />
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-bold text-slate-900">{totalViolations}</span>
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">Violations</span>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-red-500"></div>
                          <span className="text-slate-600">Non OOS</span>
                          <span className="ml-auto font-bold text-slate-700">{nonOosPercent}%</span>
                          <span className="text-slate-500 w-6 text-right">{nonOosViolations}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm bg-red-900"></div>
                          <span className="text-slate-600">Out-of-service</span>
                          <span className="ml-auto font-bold text-slate-700">{oosPercent}%</span>
                          <span className="text-slate-500 w-6 text-right">{oosViolations}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })()}

                {/* Top Violations */}
                {(() => {
                  const violationMap: Record<string, { points: number; count: number }> = {};
                  periodInspections.forEach(insp => {
                    insp.violations.forEach(v => {
                      const key = v.description.length > 40 ? v.description.substring(0, 40) + '…' : v.description;
                      if (!violationMap[key]) violationMap[key] = { points: 0, count: 0 };
                      violationMap[key].points += v.points;
                      violationMap[key].count += 1;
                    });
                  });
                  const topViolations = Object.entries(violationMap)
                    .sort((a, b) => cvorTopViolSort === 'POINTS' ? b[1].points - a[1].points : b[1].count - a[1].count)
                    .slice(0, 5);

                  return (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-slate-900">Top Violations</h3>
                      <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                        <button onClick={() => setCvorTopViolSort('POINTS')}
                          className={`px-2.5 py-1.5 text-sm font-bold transition-colors ${cvorTopViolSort === 'POINTS' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                        >POINTS</button>
                        <button onClick={() => setCvorTopViolSort('COUNT')}
                          className={`px-2.5 py-1.5 text-sm font-bold transition-colors ${cvorTopViolSort === 'COUNT' ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                        >COUNT</button>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {topViolations.length > 0 ? topViolations.map(([name, data], i) => (
                        <div key={i} className="flex items-center justify-between text-sm gap-2">
                          <span className="text-slate-700 truncate" title={name}>{name}</span>
                          <span className="font-bold text-slate-900 flex-shrink-0">{cvorTopViolSort === 'POINTS' ? data.points : data.count}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-400 text-center py-4">No violations in this period.</p>
                      )}
                    </div>
                  </div>
                  );
                })()}
              </div>
            </div>

            {/* ===== CVOR SECTION 3: METRICS BY PROVINCE ===== */}
            {(() => {
              const sortKey2 = cvorMetricsView === 'INSPECTIONS' ? 'inspections' : cvorMetricsView === 'VIOLATIONS' ? 'violations' : 'points';
              const provinceNames: Record<string, string> = {
                'ON': 'Ontario', 'QC': 'Quebec', 'AB': 'Alberta', 'BC': 'British Columbia',
                'MB': 'Manitoba', 'SK': 'Saskatchewan', 'NB': 'New Brunswick', 'NS': 'Nova Scotia',
                'PE': 'Prince Edward Island', 'NL': 'Newfoundland', 'NT': 'Northwest Territories', 'YT': 'Yukon', 'NU': 'Nunavut',
              };
              const cvorCategories = ['Vehicle Maintenance', 'HOS Compliance', 'Driver Fitness', 'Unsafe Driving', 'Hazmat'];
              const cvorCategoryKeys: Record<string, string[]> = {
                'Vehicle Maintenance': ['Vehicle Maintenance'],
                'HOS Compliance': ['Hours-of-service Compliance'],
                'Driver Fitness': ['Driver Fitness'],
                'Unsafe Driving': ['Unsafe Driving'],
                'Hazmat': ['Hazmat compliance'],
              };

              const provMap: Record<string, { inspections: number; violations: number; points: number; basics: Record<string, { inspections: number; violations: number; points: number }> }> = {};
              periodInspections.forEach(insp => {
                const st = insp.state;
                if (!provMap[st]) provMap[st] = { inspections: 0, violations: 0, points: 0, basics: {} };
                provMap[st].inspections += 1;
                insp.violations.forEach(v => {
                  provMap[st].violations += 1;
                  provMap[st].points += v.points;
                  const cat = v.category;
                  if (!provMap[st].basics[cat]) provMap[st].basics[cat] = { inspections: 0, violations: 0, points: 0 };
                  provMap[st].basics[cat].violations += 1;
                  provMap[st].basics[cat].points += v.points;
                });
                const cats = new Set(insp.violations.map(v => v.category));
                cats.forEach(cat => {
                  if (!provMap[st].basics[cat]) provMap[st].basics[cat] = { inspections: 0, violations: 0, points: 0 };
                  provMap[st].basics[cat].inspections += 1;
                });
              });

              const getCatVal2 = (data: typeof provMap[string], cat: string) => {
                const keys = cvorCategoryKeys[cat] || [cat];
                return keys.reduce((sum, k) => sum + ((data.basics[k] || { inspections: 0, violations: 0, points: 0 })[sortKey2] || 0), 0);
              };

              const provEntries = Object.entries(provMap);
              const provRows = provEntries.sort((a, b) => {
                let aVal: number | string;
                let bVal: number | string;
                if (cvorMetricsSort.col === 'state') {
                  aVal = provinceNames[a[0]] || a[0];
                  bVal = provinceNames[b[0]] || b[0];
                  return cvorMetricsSort.dir === 'asc' ? (aVal as string).localeCompare(bVal as string) : (bVal as string).localeCompare(aVal as string);
                } else if (cvorMetricsSort.col === 'total') {
                  aVal = a[1][sortKey2];
                  bVal = b[1][sortKey2];
                } else {
                  aVal = getCatVal2(a[1], cvorMetricsSort.col);
                  bVal = getCatVal2(b[1], cvorMetricsSort.col);
                }
                return cvorMetricsSort.dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
              });

              const handleCvorColSort = (col: string) => {
                setCvorMetricsSort(prev => prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' });
              };
              const cvorSortIcon = (col: string) => cvorMetricsSort.col === col ? (cvorMetricsSort.dir === 'desc' ? ' ↓' : ' ↑') : '';

              return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="text-base font-bold text-slate-900">Metrics by Province <span className="text-sm font-normal text-slate-400">/ Last {cvorPeriod === '24M' ? '24 Months' : cvorPeriod === '12M' ? '12 Months' : cvorPeriod === '3M' ? '3 Months' : '1 Month'}</span></h3>
                  <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                    {(['INSPECTIONS', 'VIOLATIONS', 'POINTS'] as const).map(v => (
                      <button key={v} onClick={() => setCvorMetricsView(v)}
                        className={`px-3 py-1.5 text-sm font-bold transition-colors ${cvorMetricsView === v ? 'bg-white text-blue-600 shadow-sm rounded' : 'text-slate-500 hover:text-slate-700'}`}
                      >{v}</button>
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto rounded border border-slate-100">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-blue-600 select-none transition-colors"
                          onClick={() => handleCvorColSort('state')}>Province{cvorSortIcon('state')}</th>
                        {cvorCategories.map(cat => (
                          <th key={cat} className="px-2 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap cursor-pointer hover:text-blue-600 select-none transition-colors"
                            onClick={() => handleCvorColSort(cat)}>{cat}{cvorSortIcon(cat)}</th>
                        ))}
                        <th className="px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wider text-center cursor-pointer hover:text-blue-600 select-none transition-colors"
                          onClick={() => handleCvorColSort('total')}>Total{cvorSortIcon('total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {provRows.length > 0 ? provRows.map(([st, data]) => (
                        <tr key={st} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-medium text-blue-600">{provinceNames[st] || st}</td>
                          {cvorCategories.map(cat => {
                            const val = getCatVal2(data, cat);
                            return <td key={cat} className="px-2 py-2.5 text-center text-slate-700">{val}</td>;
                          })}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-900">{data[sortKey2]}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={cvorCategories.length + 2} className="px-3 py-8 text-center text-slate-400">No CVOR inspection data for this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })()}
            </>
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

              {/* Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-3 bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
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

              <div className="divide-y divide-slate-200">
                {cvorPagedData.length > 0 ? (
                  cvorPagedData.map(record => (
                    <InspectionRow key={record.id} record={record} onEdit={openEditModal} />
                  ))
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
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-500 uppercase">Level</label>
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

