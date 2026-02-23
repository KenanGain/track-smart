import { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  MapPin, 
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
const MiniKpiCard = ({ title, value, icon: Icon, active, onClick, color }: { title: string; value: number; icon: any; active: boolean; onClick: () => void; color: "blue" | "emerald" | "red" | "yellow" | "purple" | "orange" | "gray" }) => {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-200",
    emerald: "text-emerald-600 bg-emerald-50 border-emerald-200",
    red: "text-red-600 bg-red-50 border-red-200",
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-200",
    purple: "text-purple-600 bg-purple-50 border-purple-200",
    orange: "text-orange-600 bg-orange-50 border-orange-200",
    gray: "text-slate-600 bg-slate-50 border-slate-200",
  };

  const activeStylesMap = {
    blue: "ring-2 ring-offset-1 ring-blue-400 border-blue-400 shadow-sm",
    emerald: "ring-2 ring-offset-1 ring-emerald-400 border-emerald-400 shadow-sm",
    red: "ring-2 ring-offset-1 ring-red-400 border-red-400 shadow-sm",
    yellow: "ring-2 ring-offset-1 ring-yellow-400 border-yellow-400 shadow-sm",
    purple: "ring-2 ring-offset-1 ring-purple-400 border-purple-400 shadow-sm",
    orange: "ring-2 ring-offset-1 ring-orange-400 border-orange-400 shadow-sm",
    gray: "ring-2 ring-offset-1 ring-slate-400 border-slate-400 shadow-sm",
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
        className="hidden md:grid grid-cols-12 gap-5 px-4 py-4 items-center cursor-pointer border-l-2 border-transparent hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date */}
        <div className="col-span-2 pl-2">
          <span className="text-[13px] font-bold text-slate-800">{record.date}</span>
        </div>

        {/* Report ID & State */}
        <div className="col-span-2 min-w-0 flex flex-col justify-center">
          <span className="text-[13px] font-bold text-blue-600 block truncate leading-tight">{record.id}</span>
          <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 flex items-center gap-1.5">
            <MapPin size={10}/> {record.state}
            {getJurisdiction(record.state) === 'CVOR' ? (
              <span className="px-1.5 py-px rounded text-[8px] font-bold tracking-wider bg-red-100 text-red-700 border border-red-200">CVOR</span>
            ) : (
              <span className="px-1.5 py-px rounded text-[8px] font-bold tracking-wider bg-blue-100 text-blue-700 border border-blue-200">CSA</span>
            )}
          </span>
        </div>

        {/* Driver */}
        <div className="col-span-2 flex items-center gap-3 min-w-0">
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
            <User size={14} fill="currentColor" />
          </div>
          <div className="min-w-0 flex flex-col justify-center">
            <span className="text-[13px] font-bold text-slate-800 truncate block leading-tight">{record.driver}</span>
            <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">{record.driverId}</span>
          </div>
        </div>

        {/* Asset */}
        <div className="col-span-2 flex flex-col justify-center min-w-0">
          <span className="text-[13px] font-bold text-slate-800 truncate block leading-tight">
            {primaryUnit?.license || record.vehiclePlate}
          </span>
          <span className="text-[10px] text-slate-500 font-medium truncate block mt-0.5">
            {primaryUnit?.type || record.vehicleType} - Level {record.level?.split(' ')[1] || record.level?.replace('Level ', '') || '1'}
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
        <div className="col-span-1 flex items-center justify-between pl-2 pr-4">
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
                  <span className="px-1.5 py-px rounded text-[8px] font-bold tracking-wider bg-red-100 text-red-700 border border-red-200">CVOR</span>
                ) : (
                  <span className="px-1.5 py-px rounded text-[8px] font-bold tracking-wider bg-blue-100 text-blue-700 border border-blue-200">CSA</span>
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
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider self-start ${
                  getJurisdiction(record.state) === 'CVOR'
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                }`}>
                  {getJurisdiction(record.state)}
                </span>
                <span className="text-[11px] sm:text-xs text-slate-700 leading-relaxed">
                  {getJurisdiction(record.state) === 'CVOR'
                    ? <>Regulated under <span className="font-bold">Ontario CVOR</span> &mdash; HTA, O.Reg.199/07, O.Reg.555/06, TDG Act</>
                    : <>Regulated under <span className="font-bold">FMCSA CSA/SMS</span> &mdash; 49 CFR Parts 382-399</>
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
    { id: 'report', label: 'Report ID & State', visible: true },
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
  const { csaThresholds, cvorThresholds } = useAppData();

  // Form state for Add/Edit
  const emptyForm = {
    id: '', date: '', state: '', driverId: '', driver: '', vehiclePlate: '', vehicleType: 'Truck',
    assetId: '', level: 'Level 1', isClean: true, hasOOS: false,
    hasVehicleViolations: false, hasDriverViolations: false,
    units: [{ type: 'Truck', make: '', license: '', vin: '' }],
    oosSummary: { driver: 'PASSED', vehicle: 'PASSED', total: 0 },
    violations: [] as any[],
  };
  const [inspForm, setInspForm] = useState(emptyForm);
  const [formViolations, setFormViolations] = useState<any[]>([]);

  const openAddModal = () => {
    setInspForm(emptyForm);
    setFormViolations([]);
    setEditingInspection(null);
    setShowAddModal(true);
  };
  const openEditModal = (record: any) => {
    setInspForm({
      id: record.id, date: record.date, state: record.state, driverId: record.driverId,
      driver: record.driver, vehiclePlate: record.vehiclePlate, vehicleType: record.vehicleType,
      assetId: record.assetId, level: record.level, isClean: record.isClean, hasOOS: record.hasOOS,
      hasVehicleViolations: record.hasVehicleViolations, hasDriverViolations: record.hasDriverViolations,
      units: record.units || [{ type: 'Truck', make: '', license: '', vin: '' }],
      oosSummary: record.oosSummary || { driver: 'PASSED', vehicle: 'PASSED', total: 0 },
      violations: [],
    });
    setFormViolations(record.violations || []);
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
      severe: inspectionsData.filter(i => i.violations.some(v => v.severity >= 7)).length
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
                <h3 className="text-sm font-bold text-slate-900">CSA BASIC Status</h3>
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
          </div>
        </div>

        {/* ===== MAIN INSPECTION LIST ===== */}
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Specific Roadside Inspections</h2>
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
            <div className="hidden md:grid grid-cols-12 gap-5 px-4 py-3 bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-2 pl-2">Insp. Date</div>
              <div className="col-span-2">Report ID & State</div>
              <div className="col-span-2">Driver</div>
              <div className="col-span-2">Asset</div>
              <div className="col-span-1 text-center">Violations</div>
              <div className="col-span-1 text-center">Severity</div>
              <div className="col-span-1 text-center">Points</div>
              <div className="col-span-1 pl-2">Status</div>
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
                    <label className="text-xs font-bold text-slate-500 uppercase">State/Province</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.state} onChange={e => setInspForm(p => ({ ...p, state: e.target.value }))}>
                      <option value="">Select State</option>
                      <optgroup label="United States">
                        <option value="MI">MI - Michigan</option>
                        <option value="TX">TX - Texas</option>
                        <option value="OH">OH - Ohio</option>
                        <option value="IN">IN - Indiana</option>
                        <option value="IL">IL - Illinois</option>
                        <option value="NY">NY - New York</option>
                        <option value="PA">PA - Pennsylvania</option>
                        <option value="CA">CA - California</option>
                        <option value="FL">FL - Florida</option>
                      </optgroup>
                      <optgroup label="Canada">
                        <option value="ON">ON - Ontario</option>
                        <option value="QC">QC - Quebec</option>
                        <option value="AB">AB - Alberta</option>
                        <option value="BC">BC - British Columbia</option>
                        <option value="MB">MB - Manitoba</option>
                        <option value="SK">SK - Saskatchewan</option>
                      </optgroup>
                    </select>
                    {inspForm.state && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className={`px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider ${
                          getJurisdiction(inspForm.state) === 'CVOR'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {getJurisdiction(inspForm.state)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {getJurisdiction(inspForm.state) === 'CVOR' ? 'Canadian Regulatory' : 'US Federal (FMCSA)'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Level</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.level} onChange={e => setInspForm(p => ({ ...p, level: e.target.value }))}>
                      <option value="Level 1">Level 1 - Full</option>
                      <option value="Level 2">Level 2 - Walk-Around</option>
                      <option value="Level 3">Level 3 - Driver Only</option>
                      <option value="Level 4">Level 4 - Special</option>
                      <option value="Level 5">Level 5 - Vehicle Only</option>
                      <option value="Level 6">Level 6 - Enhanced NAS</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vehicle Type</label>
                    <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white" value={inspForm.vehicleType} onChange={e => setInspForm(p => ({ ...p, vehicleType: e.target.value }))}>
                      <option value="Truck">Truck</option>
                      <option value="Trailer">Trailer</option>
                      <option value="Non-CMV Vehicle">Non-CMV Vehicle</option>
                      <option value="Bus">Bus</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Asset ID</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. a1" value={inspForm.assetId} onChange={e => setInspForm(p => ({ ...p, assetId: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Driver */}
              <div className="border-t border-slate-100 pt-5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">Driver</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Driver ID</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. DRV-2001" value={inspForm.driverId} onChange={e => setInspForm(p => ({ ...p, driverId: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Driver Name</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Last, First" value={inspForm.driver} onChange={e => setInspForm(p => ({ ...p, driver: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Vehicle Plate</label>
                    <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. P-7762" value={inspForm.vehiclePlate} onChange={e => setInspForm(p => ({ ...p, vehiclePlate: e.target.value }))} />
                  </div>
                </div>
              </div>

              {/* Section: Units Inspected */}
              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Units Inspected</h4>
                  <button type="button" onClick={addFormUnit} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                    <Plus size={14} /> Add Unit
                  </button>
                </div>
                <div className="space-y-3">
                  {inspForm.units.map((unit, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-3 items-end bg-slate-50 border border-slate-100 rounded-lg p-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                        <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500" value={unit.type} onChange={e => updateFormUnit(idx, 'type', e.target.value)}>
                          <option>Truck</option><option>Trailer</option><option>SEMI-TRAILER</option><option>Non-CMV Vehicle</option><option>Bus</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Make</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="e.g. Freightliner" value={unit.make} onChange={e => updateFormUnit(idx, 'make', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">License</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="e.g. P-7762" value={unit.license} onChange={e => updateFormUnit(idx, 'license', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">VIN</label>
                        <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" placeholder="VIN" value={unit.vin} onChange={e => updateFormUnit(idx, 'vin', e.target.value)} />
                      </div>
                      <div className="flex justify-end">
                        {inspForm.units.length > 1 && (
                          <button type="button" onClick={() => removeFormUnit(idx)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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
                        getJurisdiction(inspForm.state) === 'CVOR'
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : 'bg-blue-50 text-blue-600 border border-blue-200'
                      }`}>
                        {getJurisdiction(inspForm.state) === 'CVOR' ? 'Canadian Codes' : 'FMCSA Codes'}
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
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Code</label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500" placeholder={inspForm.state && getJurisdiction(inspForm.state) === 'CVOR' ? 'e.g. HTA s.84(1)' : 'e.g. 393.47(e)'} value={v.code} onChange={e => updateFormViolation(idx, 'code', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                            <select className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-blue-500" value={v.category} onChange={e => updateFormViolation(idx, 'category', e.target.value)}>
                              {SUMMARY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sub-Category</label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="e.g. Brakes" value={v.subDescription} onChange={e => updateFormViolation(idx, 'subDescription', e.target.value)} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                          <input type="text" className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-500" placeholder="Violation description" value={v.description} onChange={e => updateFormViolation(idx, 'description', e.target.value)} />
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
