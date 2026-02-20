import { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Search, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  ChevronLeft, 
  ChevronRight,
  Download, 
  Truck, 
  FileText,
  Upload,
  Plus,
  FileUp,
  User,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  FileSignature,
  Gauge,
  Info,
  X
} from 'lucide-react';
import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData } from './inspectionsData';

// --- STYLES & FONTS ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Condensed:wght@400;500;700&display=swap');
    
    body {
      font-family: 'Inter', sans-serif;
      background-color: #F3F4F6;
    }
    
    .font-condensed {
      font-family: 'Roboto Condensed', sans-serif;
    }
    
    /* Custom Scrollbar */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: transparent; 
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1; 
      border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #94a3b8; 
    }

    /* Tooltip Animation */
    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .group:hover .tooltip-content {
      display: block;
      animation: tooltipFadeIn 0.2s ease-out forwards;
    }
  `}</style>
);

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
              <span className="text-[10px] font-bold text-gray-700 uppercase">{label}</span>
              <span className="text-[10px] font-bold text-gray-400">{value}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
          </div>
      </div>
  );
};

// Component: Educational Tooltips
const InfoTooltip = ({ text, title }: { text: string; title?: string }) => (
  <div className="group relative inline-flex items-center ml-1.5 cursor-help">
    <Info size={14} className="text-gray-400 hover:text-blue-500 transition-colors" />
    <div className="tooltip-content hidden absolute z-50 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
      {title && <div className="font-bold text-blue-300 mb-1 font-condensed tracking-wide uppercase">{title}</div>}
      <div className="leading-relaxed text-gray-200">{text}</div>
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
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
    gray: "text-gray-600 bg-gray-50 border-gray-200",
  };

  const activeStyles = active 
    ? `ring-2 ring-offset-1 ring-${color}-400 border-${color}-400 shadow-sm` 
    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50";

  return (
    <div 
      onClick={onClick}
      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeStyles} bg-white`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-1.5 rounded-md ${colorMap[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wide font-condensed">{title}</span>
      </div>
      <span className="text-lg font-bold text-gray-900 font-condensed">{value}</span>
    </div>
  );
};

// Component: Expandable Inspection Row
const InspectionRow = ({ record }: { record: any }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="group bg-white hover:bg-blue-50/30 transition-colors border-b border-gray-100 last:border-0">
      
      {/* ===== DESKTOP MAIN ROW ===== */}
      <div 
        className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date */}
        <div className="col-span-2 flex items-center gap-2 text-sm font-medium text-gray-900">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: record.hasOOS ? '#ef4444' : record.isClean ? '#10b981' : '#f59e0b' }}></span>
          {record.date}
        </div>

        {/* Report ID & State */}
        <div className="col-span-2">
          <span className="text-sm font-bold text-blue-700 font-mono block">{record.id}</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-1 mt-0.5">
            <MapPin size={10}/> {record.state} &bull; {record.level}
          </span>
        </div>

        {/* Driver */}
        <div className="col-span-2 flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <User size={12} />
          </div>
          <span className="text-xs font-medium text-gray-700 truncate" title={record.driver}>{record.driver}</span>
        </div>

        {/* Vehicle */}
        <div className="col-span-2 flex flex-col justify-center">
          <span className="text-xs font-bold text-gray-800 font-mono">
            {record.units && record.units.length > 0 ? record.units[0].license : record.vehiclePlate}
          </span>
          <span className="text-[10px] text-gray-500 truncate">
            {record.units && record.units.length > 0 ? record.units[0].type : record.vehicleType}
            {record.units && record.units.length > 1 && <span className="font-bold text-blue-600 ml-1">(+{record.units.length - 1} Unit)</span>}
          </span>
        </div>

        {/* Violations Count */}
        <div className="col-span-1 text-center">
          {record.isClean ? (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              CLEAN
            </span>
          ) : (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
              {record.violations.length}
            </span>
          )}
        </div>

        {/* OOS Status */}
        <div className="col-span-2 text-center">
          {record.hasOOS ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert size={12} /> OOS ISSUED
            </span>
          ) : (
            <span className="text-xs text-gray-400 font-medium">-</span>
          )}
        </div>

        {/* Action */}
        <div className="col-span-1 flex justify-end pr-2">
          <button className="text-gray-400 group-hover:text-blue-600 transition-colors bg-white border border-gray-200 group-hover:bg-blue-50 group-hover:border-blue-200 p-1.5 rounded-full shadow-sm">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
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
              <span className="text-sm font-bold text-blue-700 font-mono block leading-tight">{record.id}</span>
              <span className="text-xs text-gray-900 font-medium block mt-0.5">{record.date}</span>
            </div>
          </div>
          <button className="text-gray-400 bg-gray-50 border border-gray-200 p-1.5 rounded-full shadow-sm">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-1 pt-2 border-t border-gray-100">
           <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-[11px] font-medium text-gray-600">
            <User size={10}/> {record.driver.split(',')[0]}
          </div>
          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-[11px] font-mono font-bold text-gray-700">
            <Truck size={10}/> 
            {record.units && record.units.length > 0 ? record.units[0].license.split(' ')[0] : record.vehiclePlate.split(' ')[0]}
            {record.units && record.units.length > 1 && <span className="text-blue-600">+{record.units.length - 1}</span>}
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
        <div className="bg-gray-50/50 p-5 md:p-8 border-t border-gray-200 shadow-inner flex flex-col gap-8">
          {record.isClean ? (
            <div className="flex flex-col items-center justify-center py-6 text-emerald-600 bg-white rounded-xl border border-gray-200 shadow-sm">
              <CheckCircle2 size={32} className="mb-2 opacity-80" />
              <p className="text-sm font-bold">Clean Inspection</p>
              <p className="text-xs text-emerald-600/70 mt-1">No violations were recorded during this inspection.</p>
            </div>
          ) : (
            <>
              {/* Top 3 Panels (Units, Summary, OOS) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Panel 1: Units Inspected */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                    <Truck size={14} className="text-gray-400" /> Units Inspected
                  </h4>
                  <div className="bg-white border border-gray-200 rounded shadow-sm">
                    <div className="divide-y divide-gray-100">
                      {record.units?.map((unit: any, idx: number) => (
                        <div key={idx} className="p-3.5 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-blue-600 text-[11px] tracking-wide uppercase">{unit.type}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono font-bold uppercase">{unit.make}</span>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-gray-500">License:</span>
                              <span className="font-bold text-gray-800">{unit.license}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">VIN:</span>
                              <span className="font-mono text-gray-600">{unit.vin}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Panel 2: Violation Summary */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                    <Activity size={14} className="text-gray-400" /> Violation Summary
                  </h4>
                  <div className="bg-white border border-gray-200 rounded shadow-sm">
                    <div className="divide-y divide-gray-100 text-[11px]">
                      {SUMMARY_CATEGORIES.map(cat => (
                        <div key={cat} className="flex justify-between items-center px-4 py-2.5">
                          <span className="text-gray-700 font-medium">{cat}</span>
                          <span className={`font-bold ${record.violationSummary[cat] ? 'text-red-600' : 'text-gray-400'}`}>
                            {record.violationSummary[cat] || 0}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Panel 3: Out of Service (OOS) */}
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                    <AlertTriangle size={14} className="text-gray-400" /> Out of Service (OOS)
                  </h4>
                  <div className="bg-white border border-gray-200 rounded shadow-sm p-4 flex flex-col justify-between h-[155px]">
                    <div className="space-y-4 flex-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-gray-700 font-medium">Driver OOS</span>
                        {record.oosSummary?.driver === 'PASSED' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">PASSED</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">FAILED</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-gray-700 font-medium">Vehicle OOS</span>
                        {record.oosSummary?.vehicle === 'PASSED' ? (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">PASSED</span>
                        ) : (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">FAILED</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-end">
                      <span className="text-xs font-bold text-gray-900 uppercase">TOTAL OOS</span>
                      <span className={`text-2xl font-bold leading-none ${record.oosSummary?.total > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {record.oosSummary?.total || 0}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Bottom Panel: Detailed Violations Table */}
              <div className="space-y-4 mt-2">
                <h4 className="text-[11px] font-bold text-gray-500 flex items-center gap-2 uppercase tracking-wider">
                  <FileText size={14} className="text-gray-400" /> Detailed Violations
                  <InfoTooltip 
                    title="Specific Inspection Data"
                    text="The specific infractions (like a broken tail light or a chafing brake hose) found during this single roadside stop." 
                  />
                </h4>
                <div className="bg-white border border-gray-200 rounded shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
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
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-5 py-4 text-gray-600 font-mono">{violation.code}</td>
                          <td className="px-5 py-4 text-gray-700">{violation.category}</td>
                          <td className="px-5 py-4">
                            <p className="text-gray-800 font-medium leading-snug">{violation.description}</p>
                            {violation.subDescription && (
                              <p className="text-[10px] text-blue-400/90 mt-1 font-medium">{violation.subDescription}</p>
                            )}
                          </td>
                          <td className="px-5 py-4 flex justify-center"><CrashLikelihoodBar value={violation.crashLikelihoodPercent || (violation.driverRiskCategory === 1 ? 85 : violation.driverRiskCategory === 2 ? 45 : 15)} /></td>
                          <td className="px-5 py-4 text-center text-gray-500">{violation.severity}</td>
                          <td className="px-5 py-4 text-center text-gray-500">{violation.weight}</td>
                          <td className="px-5 py-4 text-center font-bold text-gray-900">{violation.points}</td>
                          <td className="px-5 py-4 text-center text-gray-400">
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
  
  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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

  return (
    <div className="min-h-screen text-gray-900 p-4 md:p-6 pb-20 relative">
      <GlobalStyles />
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ===== TOP HEADER & ACTIONS ===== */}
        <div className="flex flex-col lg:flex-row justify-end items-start gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
             <button 
              onClick={() => setShowUploadModal(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all text-sm shadow-sm"
             >
              <Upload size={16} /> Upload CVOR/SMS
            </button>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-all text-sm shadow-sm"
            >
              <FileUp size={16} /> Bulk Upload
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all text-sm shadow-sm"
            >
              <Plus size={16} /> Add Inspection
            </button>
          </div>
        </div>

        {/* ===== NEW SECTION: COMPANY OVERVIEW DASHBOARD ===== */}
        <div className="space-y-4 pt-2">
          
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-bold text-gray-900 font-condensed uppercase tracking-tight">Overall Carrier Report Card</h2>
            <InfoTooltip 
              title="Company-Wide Scores"
              text="These sections act as a report card for the entire company. They take all the individual events (crashes, inspections, violations) from all drivers and combine them into overall scores." 
            />
          </div>

          {/* Intervention Warning Banner */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
            <AlertOctagon className="text-red-600 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h4 className="text-sm font-bold text-red-800 uppercase font-condensed tracking-wide">Intervention Warning</h4>
              <p className="text-xs text-red-700 mt-1 leading-relaxed">
                The carrier exceeds the FMCSA Intervention Threshold relative to its safety event grouping based on roadside data. This carrier may be prioritized for an intervention action and roadside inspection. Note: No Acute/Critical Violations were discovered during investigation results.
              </p>
            </div>
          </div>

          {/* Top Row: Safety Rating & OOS and Licensing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Col 1: Safety Rating & OOS */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-condensed flex items-center gap-2 mb-4">
                <ShieldAlert size={14} className="text-blue-500"/> Safety Rating & OOS
                <InfoTooltip 
                  text="Safety Rating is a company-wide grade. OOS Rates show how often the carrier's vehicles/drivers are pulled off the road compared to the national average." 
                />
              </h3>
              <div className="mb-4 text-sm font-medium text-gray-700">
                Current Rating: <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{carrierProfile.rating}</span>
              </div>
              <div className="overflow-x-auto rounded border border-gray-100 mt-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold text-center">Carrier %</th>
                      <th className="px-3 py-2 font-semibold text-center">Nat Avg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="px-3 py-2 text-gray-700">Vehicle</td>
                      <td className="px-3 py-2 text-center font-bold text-red-600">{carrierProfile.oosRates.vehicle.carrier}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{carrierProfile.oosRates.vehicle.national}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700">Driver</td>
                      <td className="px-3 py-2 text-center font-bold text-gray-800">{carrierProfile.oosRates.driver.carrier}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{carrierProfile.oosRates.driver.national}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-gray-700">Hazmat</td>
                      <td className="px-3 py-2 text-center font-bold text-gray-400">{carrierProfile.oosRates.hazmat.carrier}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{carrierProfile.oosRates.hazmat.national}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Col 2: Licensing */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col">
              <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-condensed flex items-center gap-2 mb-3">
                <FileSignature size={14} className="text-purple-500"/> Licensing
                <InfoTooltip 
                  text="Applies exclusively to the whole company. Dictates whether the business has the legal authority and financial backing to operate." 
                />
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-600">Property</span>
                  <span className="font-bold text-gray-900">{carrierProfile.licensing.property.mc} <span className="text-green-600 bg-green-50 px-1 rounded ml-1">Active</span></span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-600">Passenger</span>
                  <span className="font-medium text-gray-400">No</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                  <span className="text-gray-600">Household</span>
                  <span className="font-medium text-gray-400">No</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Broker</span>
                  <span className="font-medium text-gray-400">No</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Row: CSA BASIC Status (Full Width) */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-condensed flex items-center gap-2 mb-4">
              <Gauge size={14} className="text-emerald-500"/> CSA BASIC Status
              <InfoTooltip 
                text="The carrier’s overall safety percentile score based on a 2-year period, ranked against other similar companies." 
              />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              {carrierProfile.basicStatus.map((status, idx) => (
                <div key={idx} className="flex flex-col justify-center py-2 border-b border-gray-50 sm:border-0 last:border-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-medium ${status.alert ? 'text-red-700 font-bold' : 'text-gray-700'}`}>
                      {status.category}
                    </span>
                    <div className="flex items-center gap-2">
			{status.measure !== undefined && <span className="text-[10px] text-gray-400 font-mono">Msr: {status.measure}</span>}
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${status.alert ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                        {status.percentile}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 truncate" title={status.details}>{status.details}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== KPI FILTERS (Mini Rectangles) ===== */}
        <div className="mt-8">
          <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-condensed mb-3">Inspection Filters</h3>
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
            <h2 className="text-lg font-bold text-gray-900 font-condensed uppercase tracking-tight">Specific Roadside Inspections</h2>
            <InfoTooltip 
              title="Individual Events"
              text="These are single events. They apply to one specific driver and one specific vehicle being pulled over on a specific date and time by law enforcement." 
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-2">
            
            {/* Toolbar */}
            <div className="p-3 md:p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-gray-400" />
                </div>
                <input 
                  className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                  placeholder="Search by ID, Driver, or Plate..." 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                <div className="text-sm text-gray-500 font-medium px-2 bg-white border border-gray-200 rounded-md py-1.5 shadow-sm">
                  Showing <span className="font-bold text-gray-900">{filteredData.length}</span> records
                </div>
                <button className="p-2 text-gray-500 hover:text-blue-600 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-200 rounded-lg transition-all shadow-sm">
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Table Header (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-3 bg-gray-100 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider font-condensed">
              <div className="col-span-2">Insp. Date</div>
              <div className="col-span-2">Report ID & State</div>
              <div className="col-span-2">Driver Name</div>
              <div className="col-span-2">Vehicle Info</div>
              <div className="col-span-1 text-center">Violations</div>
              <div className="col-span-2 text-center">OOS Status</div>
              <div className="col-span-1 text-right pr-2">Action</div>
            </div>

            {/* List Items */}
            <div className="divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map(record => (
                  <InspectionRow key={record.id} record={record} />
                ))
              ) : (
                <div className="p-16 text-center text-gray-500 flex flex-col items-center bg-gray-50/50">
                  <div className="bg-white border border-gray-200 p-4 rounded-full mb-4 shadow-sm">
                    <AlertCircle size={32} className="text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 font-condensed tracking-wide">No records found</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-5 max-w-sm">No inspections match your current search or filter criteria. Try clearing filters to see all records.</p>
                  <button 
                    onClick={() => { setSearchTerm(''); setActiveFilter('ALL'); }}
                    className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors text-sm shadow-sm"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <button className="text-xs font-medium text-gray-400 flex items-center gap-1 cursor-not-allowed">
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex gap-1">
                <button className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-600 text-white text-xs font-bold shadow-sm">1</button>
              </div>
              <button className="text-xs font-medium text-gray-400 flex items-center gap-1 cursor-not-allowed">
                Next <ChevronRight size={16} />
              </button>
            </div>

          </div>
        </div>

      </div>

      {/* ===== UPLOAD MODAL ===== */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg font-condensed uppercase tracking-wide">Upload Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-md transition-colors">
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
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">Cancel</button>
              <button className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD INSPECTION MODAL ===== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="font-bold text-lg font-condensed uppercase tracking-wide">Add Manual Inspection</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <form className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Report Number</label>
                    <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. MI12345678" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Inspection Date</label>
                    <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">State/Province</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                      <option>Select State</option>
                      <option>MI - Michigan</option>
                      <option>ON - Ontario</option>
                      <option>TX - Texas</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase">Level</label>
                    <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                      <option>Level 1 - Full</option>
                      <option>Level 2 - Walk-Around</option>
                      <option>Level 3 - Driver Only</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-5 space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Driver Name</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Last Name, First Name" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Vehicle License Plate</label>
                  <input type="text" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="e.g. PA53989 (ON)" />
                </div>
              </form>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">Cancel</button>
              <button className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Save Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
