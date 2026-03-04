import { useState } from 'react';
import { INCIDENTS } from '../incidents/incidents.data';
import { MOCK_DRIVERS } from '../../data/mock-app-data';
import { inspectionsData } from '../inspections/inspectionsData';
import {
  FLEET_SAFETY_SCORES,
  COMPUTED_INCIDENT_STATS,
  INCIDENT_FILTER_TYPES,
  DRIVER_SAFETY_SCORES,
  ELD_VEDR_EVENTS,
  LOWEST_DRIVERS,
  HIGHEST_DRIVERS,
  NUM_ACTIVE_DRIVERS,
} from './safety-analysis.data';
import {
  TrendingUp,
  AlertOctagon,
  Radio,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  FileText,
  Download,
  MapPin,
  Shield,
} from 'lucide-react';


// ===== HELPERS =====
const getScoreColor = (score: number) => {
  if (score >= 95) return 'text-green-700';
  if (score >= 85) return 'text-green-600';
  if (score >= 75) return 'text-yellow-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
};

const getRatingStyle = (rating: string) => {
  if (rating === 'Satisfactory') return 'text-green-700 font-semibold italic';
  if (rating === 'Acceptable') return 'text-yellow-700 font-semibold italic';
  if (rating === 'Conditional') return 'text-amber-600 font-semibold italic';
  return 'text-red-600 font-semibold italic';
};


const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'closed': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase">Closed</span>;
    case 'open': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200 uppercase">Open</span>;
    case 'under review': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase">Under Review</span>;
    case 'resolved': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase">Resolved</span>;
    case 'reviewed': return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase">Reviewed</span>;
    default: return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase">{status}</span>;
  }
};





const DriverAvatar = ({ name }: { name: string }) => {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
      {initials}
    </div>
  );
};

// ===== TAB DEFINITIONS =====
type TabId = 'scoring' | 'incidents' | 'drivers' | 'eld-vedr' | 'inspections';

const TABS: { id: TabId; label: string }[] = [
  { id: 'scoring', label: 'Scoring Overview' },
  { id: 'incidents', label: 'Incidents' },
  { id: 'drivers', label: 'Drivers' },
  { id: 'eld-vedr', label: 'ELD/VEDR' },
  { id: 'inspections', label: 'Inspections' },
];

// ===== MAIN PAGE =====
export function SafetyAnalysisPage() {
  const [activeTab, setActiveTab] = useState<TabId>('scoring');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('All Accidents');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [driverSubTab, setDriverSubTab] = useState<'lowest' | 'highest'>('lowest');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  const selectedDriver = selectedDriverId ? MOCK_DRIVERS.find(d => d.id === selectedDriverId) ?? null : null;
  const selectedInspection = selectedInspectionId ? inspectionsData.find(i => i.id === selectedInspectionId) ?? null : null;
  const selectedIncident = selectedIncidentId ? INCIDENTS.find(i => i.incidentId === selectedIncidentId) ?? null : null;

  // Pre-compute driver popup scores for selected driver
  const _drvScores = selectedDriverId ? DRIVER_SAFETY_SCORES.find(d => d.driverId === selectedDriverId) : undefined;
  const drvPopupSafetyScore = _drvScores?.overall ?? 83.33;
  const drvPopupAccidentScore = _drvScores?.accidents ?? 100;
  const drvPopupEldScore = _drvScores?.eld ?? 100;
  const drvPopupInspectionScore = _drvScores?.inspections ?? 100;
  const drvPopupViolationScore = _drvScores?.violations ?? 100;
  const drvPopupTrainingScore = _drvScores?.trainings ?? 0;
  const drvPopupVedrScore = _drvScores?.vedr ?? 100;
  const drvPopupSafetyLevel = drvPopupSafetyScore >= 90 ? 'Satisfactory' : drvPopupSafetyScore >= 80 ? 'Acceptable' : drvPopupSafetyScore >= 70 ? 'Conditional' : 'Unsatisfactory';

  const filteredIncidents = INCIDENTS.filter(inc => {
    const matchSearch = !incidentSearch ||
      inc.incidentId.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.driver.name.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      inc.location.city.toLowerCase().includes(incidentSearch.toLowerCase()) ||
      (inc.insuranceClaimNumber && inc.insuranceClaimNumber.toLowerCase().includes(incidentSearch.toLowerCase()));
    let matchType = true;
    if (incidentTypeFilter === 'Hazmat') matchType = inc.severity.hazmatReleased;
    else if (incidentTypeFilter === 'Tow Away') matchType = inc.severity.towAway;
    else if (incidentTypeFilter === 'Injuries') matchType = inc.severity.injuriesNonFatal > 0;
    else if (incidentTypeFilter === 'Fatalities') matchType = inc.severity.fatalities > 0;
    return matchSearch && matchType;
  });

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">

        {/* ===== PAGE HEADER (matches Safety Events / Inspections pattern) ===== */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            Safety Analysis
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Fleet safety scoring, incident tracking, and compliance analytics</p>
        </div>

        {/* ===== SAFETY OVERVIEW CARD ===== */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6">
          {/* Title */}
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 text-center">Safety Overview</h2>
          </div>

          {/* Fleet Safety Score + Rating Row */}
          <div className="flex items-center justify-between px-8 py-3 border-b border-slate-100">
            <div>
              <span className="text-sm text-slate-600 font-medium">Fleet Safety Score: </span>
              <span className={`text-sm font-bold ${getScoreColor(FLEET_SAFETY_SCORES.fleetSafetyScore)}`}>
                {FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(2)}%
              </span>
            </div>
            <div>
              <span className="text-sm text-slate-600 font-medium">Fleet Safety Rating: </span>
              <span className={`text-sm ${getRatingStyle(FLEET_SAFETY_SCORES.fleetSafetyRating)}`}>
                {FLEET_SAFETY_SCORES.fleetSafetyRating}
              </span>
            </div>
          </div>

          {/* 6 Sub-Scores: 3 across x 2 rows */}
          <div className="grid grid-cols-3 gap-y-3 gap-x-4 px-8 py-4">
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Accident Score</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.accidentScore)}`}>{FLEET_SAFETY_SCORES.accidentScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">ELD Score</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.eldScore)}`}>{FLEET_SAFETY_SCORES.eldScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Inspection Score</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.inspectionScore)}`}>{FLEET_SAFETY_SCORES.inspectionScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Driver Score:</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.driverScore)}`}>{FLEET_SAFETY_SCORES.driverScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">VEDR Score:</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.vedrScore)}`}>{FLEET_SAFETY_SCORES.vedrScore.toFixed(2)}%</div>
            </div>
            <div className="text-center">
              <div className="text-[13px] text-slate-600 font-medium">Roadside Violation Score:</div>
              <div className={`text-[13px] font-bold ${getScoreColor(FLEET_SAFETY_SCORES.roadsideViolationScore)}`}>{FLEET_SAFETY_SCORES.roadsideViolationScore.toFixed(2)}%</div>
            </div>
          </div>
        </div>

        {/* ===== TABS + CONTENT CARD ===== */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Tab Navigation */}
          <div className="border-b border-slate-200 px-4">
            <div className="flex gap-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">

            {/* --- SCORING OVERVIEW TAB --- */}
            {activeTab === 'scoring' && (
              <div className="max-w-[900px]">
                <h2 className="text-base font-bold text-slate-900 mb-3">Overview of Scoring Types</h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Maintaining high safety and operational standards is crucial. To assess and monitor these aspects, S.A.F.E. utilizes a combination of scoring types to determine the overall safety health of an operation. Here's a general overview of the key scoring types used by S.A.F.E.:
                </p>

                <ul className="space-y-5 text-sm text-slate-600 leading-relaxed">
                  <li>
                    <p className="font-bold text-slate-900">Fleet Safety Score and Safety Rating:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Provides a comprehensive view of the company's overall safety health.</li>
                      <li><span className="font-semibold">Calculation:</span> Based on a proprietary model, this score considers factors such as accidents, driver behaviors, roadside inspections and violations, and telematic events (ELD and VEDR events).</li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-bold text-slate-900">Accident Score:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Measures the impact and frequency of accidents.</li>
                      <li><span className="font-semibold">Calculation:</span> Counts the total number of accidents in the last 12 months, including those deemed non-preventable, and uses a proprietary model to assess the frequency against a fleet's total active trucks.</li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-bold text-slate-900">Driver Score:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Assesses the safety performance of active drivers.</li>
                      <li><span className="font-semibold">Calculation:</span> The average of all active driver scores. Each individual driver score is based on their accident history, violations, inspections, and telematic event data (e.g., harsh braking, speeding).</li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-bold text-slate-900">VEDR Score:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Evaluates the fleet's Video Event Data Recorder compliance and review rate.</li>
                      <li><span className="font-semibold">Calculation:</span> Considers VEDR camera uptime, the percentage of triggered events that have been reviewed, and the severity/frequency of detected events across the fleet.</li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-bold text-slate-900">ELD Score:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Monitors Electronic Logging Device compliance.</li>
                      <li><span className="font-semibold">Calculation:</span> Evaluates ELD malfunction rates, unassigned driving time, data transfer compliance, and overall Hours of Service (HOS) adherence across all active drivers.</li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-bold text-slate-900">Inspection Score:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Measures the fleet's roadside inspection performance.</li>
                      <li><span className="font-semibold">Calculation:</span> Clean inspection rate across all roadside inspections in the scoring period (last 24 months), weighted by inspection level and recency.</li>
                    </ul>
                  </li>

                  <li>
                    <p className="font-bold text-slate-900">Roadside Violation Score:</p>
                    <ul className="list-disc ml-6 mt-1 space-y-1">
                      <li><span className="font-semibold">Purpose:</span> Tracks the frequency and severity of roadside violations.</li>
                      <li><span className="font-semibold">Calculation:</span> Percentage of inspections without roadside violations in the last 24 months. Out-of-Service (OOS) violations carry a heavier weight in the calculation.</li>
                    </ul>
                  </li>
                </ul>
              </div>
            )}

            {/* --- INCIDENTS TAB --- */}
            {activeTab === 'incidents' && (
              <div>
                {/* Incident Overview Banner */}
                <div className="mb-8 text-center max-w-4xl mx-auto">
                  <div className="flex items-center justify-center gap-32 mb-6 mt-4">
                    <div className="text-center">
                      <div className="text-sm text-slate-700 font-medium mb-1">Preventable Accidents Last 12 Months</div>
                      <div className="text-xl font-bold text-slate-900">{COMPUTED_INCIDENT_STATS.preventableCount}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-slate-700 font-medium mb-1">Active Power Units</div>
                      <div className="text-xl font-bold text-slate-900">{COMPUTED_INCIDENT_STATS.activePowerUnits}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-red-700 font-medium italic text-sm mb-4">
                    <AlertOctagon size={16} />
                    Your accident score reflects that your fleet had more accidents than permissible for the number of active trucks you have.
                  </div>
                  
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Be sure to review the accidents below for accuracy. If any accidents below were non-preventable, be sure to challenge the ruling to remove that accident from your score calculation. If you need assistance challenging an accident, please contact us.
                  </p>
                </div>



                {/* Search & Info Row */}
                <div className="flex items-center justify-between mb-4 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search incident ID, driver, city, asset..."
                        value={incidentSearch}
                        onChange={(e) => setIncidentSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
                      />
                    </div>
                    {/* Accident Category Dropdown */}
                    <div className="relative">
                      <select
                        value={incidentTypeFilter}
                        onChange={(e) => setIncidentTypeFilter(e.target.value)}
                        className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        {INCIDENT_FILTER_TYPES.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                  <span className="text-sm text-slate-400 font-medium">{filteredIncidents.length} Records Found</span>
                </div>

                {/* Table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 w-8"><input type="checkbox" className="rounded border-slate-300" disabled /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Incident ID <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Incident Date <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Person Involved <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">City <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">State <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Incident Type <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Docs</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIncidents.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">No incidents found</td>
                        </tr>
                      ) : filteredIncidents.map(inc => {
                        const dateObj = new Date(inc.occurredDate);
                        const dateStr = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}/${dateObj.getFullYear()}`;
                        // Derive incident type from classification
                        const incType = inc.severity.fatalities > 0 ? 'Fatality'
                          : inc.severity.hazmatReleased ? 'Hazmat'
                          : inc.severity.towAway ? 'Tow Away'
                          : inc.severity.injuriesNonFatal > 0 ? 'Injury'
                          : 'Accident';
                        return (
                          <tr key={inc.incidentId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-3"><input type="checkbox" className="rounded border-slate-300" /></td>
                            <td className="px-3 py-3 text-sm font-mono font-semibold text-blue-600">{inc.incidentId}</td>
                            <td className="px-3 py-3 text-sm text-slate-700">{dateStr}</td>
                            <td className="px-3 py-3 text-sm font-medium text-slate-800">{inc.driver.name}</td>
                            <td className="px-3 py-3 text-sm text-slate-600">{inc.location.city}</td>
                            <td className="px-3 py-3 text-sm text-slate-600">{inc.location.stateOrProvince}</td>
                            <td className="px-3 py-3">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase border ${
                                incType === 'Fatality' ? 'bg-red-50 text-red-600 border-red-200'
                                : incType === 'Hazmat' ? 'bg-orange-50 text-orange-600 border-orange-200'
                                : incType === 'Tow Away' ? 'bg-purple-50 text-purple-600 border-purple-200'
                                : incType === 'Injury' ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>{incType}</span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              {inc.documents.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                                  <FileText size={12} className="text-slate-400" />
                                  {inc.documents.length}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-300">&mdash;</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => setSelectedIncidentId(inc.incidentId)}
                                className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Info */}
                <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                  <span>Showing <strong>1</strong> to <strong>{Math.min(filteredIncidents.length, 10)}</strong> of <strong>{filteredIncidents.length}</strong> results</span>
                </div>

                {/* ===== INCIDENT DETAIL POPUP ===== */}
                {selectedIncident && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedIncidentId(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[750px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Header */}
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Incident Detail &mdash; {selectedIncident.incidentId}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{selectedIncident.insuranceClaimNumber ? `Claim #${selectedIncident.insuranceClaimNumber}` : 'No insurance claim filed'}</p>
                        </div>
                        <button onClick={() => setSelectedIncidentId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <X size={18} className="text-slate-500" />
                        </button>
                      </div>

                      <div className="px-6 py-5 space-y-5">
                        {/* Key Info Grid */}
                        <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date of Loss</div>
                            <div className="text-sm font-semibold text-slate-800">{new Date(selectedIncident.occurredDate).toLocaleDateString('en-US')}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</div>
                            <div className="text-sm font-semibold text-slate-800">{selectedIncident.driver.name}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver Type</div>
                            <div className="text-sm text-slate-700">{selectedIncident.driver.driverType}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</div>
                            <div className="text-sm font-semibold text-slate-800">{selectedIncident.location.city}, {selectedIncident.location.stateOrProvince}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</div>
                            <div className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{selectedIncident.vehicles[0]?.assetId || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Accident Type</div>
                            <div className="text-sm font-semibold text-slate-800">{selectedIncident.classification.accidentType || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Cause</div>
                            <div className="text-sm text-slate-700">{selectedIncident.cause.primaryCause}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Incident Type</div>
                            <div className="text-sm text-slate-700">{selectedIncident.cause.incidentType}</div>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Cost</div>
                            <div className="text-sm font-bold text-slate-800">${selectedIncident.costs.totalAccidentCosts.toLocaleString()}</div>
                          </div>
                        </div>

                        {/* Flags Row */}
                        <div className="flex flex-wrap gap-2">
                          {selectedIncident.preventability.isPreventable === true && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">Preventable</span>}
                          {selectedIncident.preventability.isPreventable === false && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">Non-Preventable</span>}
                          {selectedIncident.preventability.isPreventable === null && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">TBD</span>}
                          {selectedIncident.severity.hazmatReleased && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-600 border border-orange-200">Hazmat</span>}
                          {selectedIncident.severity.towAway && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-200">Tow Away ({selectedIncident.severity.vehiclesTowed})</span>}
                          {selectedIncident.severity.injuriesNonFatal > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">Injuries: {selectedIncident.severity.injuriesNonFatal}</span>}
                          {selectedIncident.severity.fatalities > 0 && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-300">Fatalities: {selectedIncident.severity.fatalities}</span>}
                          {selectedIncident.classification.fmcsaReportable && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">FMCSA Reportable</span>}
                          {selectedIncident.classification.policeReport && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">Police Report</span>}
                        </div>

                        {/* Preventability Notes */}
                        {selectedIncident.preventability.notes && (
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Preventability Notes</div>
                            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                              {selectedIncident.preventability.notes}
                            </p>
                          </div>
                        )}

                        {/* Follow Up */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Follow-Up Action</div>
                            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{selectedIncident.followUp.action || 'None'}</p>
                          </div>
                          <div>
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Comments</div>
                            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{selectedIncident.followUp.comments || 'No comments'}</p>
                          </div>
                        </div>

                        {/* Vehicles */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicles ({selectedIncident.vehicles.length})</div>
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase">Asset</th>
                                  <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase">Type</th>
                                  <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase">Make/Model</th>
                                  <th className="px-3 py-2 text-[11px] font-bold text-slate-500 uppercase">Year</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedIncident.vehicles.map((v, i) => (
                                  <tr key={i}>
                                    <td className="px-3 py-2 text-xs font-mono font-bold text-blue-600">{v.assetId}</td>
                                    <td className="px-3 py-2 text-sm text-slate-700">{v.vehicleType}</td>
                                    <td className="px-3 py-2 text-sm text-slate-700">{v.make} {v.model}</td>
                                    <td className="px-3 py-2 text-sm text-slate-700">{v.year}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Documents */}
                        <div>
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Documents ({selectedIncident.documents.length})</div>
                          {selectedIncident.documents.length === 0 ? (
                            <p className="text-sm text-slate-400 italic">No documents attached.</p>
                          ) : (
                            <div className="space-y-2">
                              {selectedIncident.documents.map((doc, i) => {
                                const docLabels: Record<string, string> = {
                                  policeReport: 'Police Report',
                                  insuranceClaim: 'Insurance Claim',
                                  medicalReport: 'Medical Report',
                                  towReceipt: 'Tow Receipt',
                                  accidentPhoto: 'Accident Photo',
                                };
                                const docName = docLabels[doc] || doc;
                                return (
                                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                                        <FileText size={14} className="text-red-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">{docName}</p>
                                        <p className="text-[11px] text-slate-400">PDF Document</p>
                                      </div>
                                    </div>
                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                      <Download size={12} />
                                      View
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- DRIVERS TAB --- */}
            {activeTab === 'drivers' && (
              <>
              <div>
                {/* Top Stats */}
                <div className="flex items-center justify-between mb-5">
                  <div className="text-center flex-1">
                    <div className="text-sm text-slate-600 font-medium">Driver Safety Score</div>
                    <div className="text-2xl font-bold text-slate-900">{FLEET_SAFETY_SCORES.driverScore.toFixed(2)}%</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-sm text-slate-600 font-medium">Number of Active Drivers</div>
                    <div className="text-2xl font-bold text-slate-900">{NUM_ACTIVE_DRIVERS}</div>
                  </div>
                </div>

                {/* Info Text */}
                <div className="text-sm text-slate-600 mb-3 leading-relaxed">
                  The report below shows the bottom 50% of your fleet's active drivers. Use this list to focus attention and training towards these drivers to improve. If improvement is not possible, S.A.F.E. recommends termination and hiring new drivers.
                </div>
                <div className="text-sm text-slate-600 mb-5 leading-relaxed">
                  The driver safety score factors in multiple sub-scores, as outlined below. Based on the percentages below, a driver may be able to show quick improvement in a few areas.
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>To raise the inspection score, the driver can request additional roadside inspections. If the inspections come back clean, the inspection score will rise.</li>
                    <li>To raise the training score, the driver can complete their required training by any assigned due dates. On time training can raise the training score.</li>
                    <li>As a reminder, ELD and VEDR scores for drivers reset on the first day of each month.</li>
                  </ul>
                </div>

                {/* Lowest / Highest Sub-tabs */}
                <div className="border-b border-slate-200 mb-5">
                  <div className="flex gap-0">
                    <button
                      onClick={() => setDriverSubTab('lowest')}
                      className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                        driverSubTab === 'lowest'
                          ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      Lowest Drivers ({LOWEST_DRIVERS.length})
                      <span className="block text-[11px] font-normal text-slate-400">Below Fleet Average</span>
                    </button>
                    <button
                      onClick={() => setDriverSubTab('highest')}
                      className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                        driverSubTab === 'highest'
                          ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      Highest Drivers ({HIGHEST_DRIVERS.length})
                      <span className="block text-[11px] font-normal text-slate-400">Above Fleet Average</span>
                    </button>
                  </div>
                </div>

                {/* Driver Scores Table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Driver</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Driver ID <ChevronDown size={10} className="inline ml-0.5 text-blue-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Overall <ChevronUp size={10} className="inline ml-0.5 text-blue-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Accidents</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">ELD</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Inspections</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Violations</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">Trainings</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-blue-600 uppercase tracking-wider">VEDR</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(driverSubTab === 'lowest' ? LOWEST_DRIVERS : HIGHEST_DRIVERS).map(drv => (
                        <tr key={drv.driverId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-3 text-sm font-medium text-slate-800">{drv.name}</td>
                          <td className="px-3 py-3 text-sm font-mono text-slate-600">{drv.licenseNumber || '—'}</td>
                          <td className="px-3 py-3 text-sm font-semibold">
                            <span className={getScoreColor(drv.overall)}>{drv.overall.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={getScoreColor(drv.accidents)}>{drv.accidents.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={getScoreColor(drv.eld)}>{drv.eld.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={getScoreColor(drv.inspections)}>{drv.inspections.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={getScoreColor(drv.violations)}>{drv.violations.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={drv.trainings === 0 ? 'text-red-600 font-semibold' : getScoreColor(drv.trainings)}>{drv.trainings.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-sm">
                            <span className={getScoreColor(drv.vedr)}>{drv.vedr.toFixed(2)}%</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => setSelectedDriverId(drv.driverId)} className="text-blue-600 text-sm font-medium cursor-pointer hover:underline">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ===== DRIVER DETAIL POPUP ===== */}
              {selectedDriver && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDriverId(null)}>
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
                      <div>
                        <h3 className="text-lg font-bold text-blue-700">{selectedDriver.name} &ndash; ID: {selectedDriver.id}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Driver Status: {selectedDriver.status}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="px-4 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">Change Driver Status</button>
                        <button onClick={() => setSelectedDriverId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <X size={18} className="text-slate-500" />
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 space-y-6">

                      {/* ── DRIVER SCORES ── */}
                      <div>
                        <h4 className="text-base font-bold text-blue-600 text-center mb-4">Driver Scores</h4>
                        <div className="flex items-start justify-between mb-4 px-4">
                          <div className="text-center">
                            <div className="text-sm font-bold text-slate-800">Safety Score</div>
                            <div className={`text-lg font-bold ${getScoreColor(drvPopupSafetyScore)}`}>{drvPopupSafetyScore.toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold text-slate-800">Safety Level</div>
                            <div className={`text-base ${getRatingStyle(drvPopupSafetyLevel)}`}>{drvPopupSafetyLevel}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-y-3 gap-x-4 px-4">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Accident Score</div>
                            <div className={`text-sm font-bold ${getScoreColor(drvPopupAccidentScore)}`}>{drvPopupAccidentScore.toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">ELD Score</div>
                            <div className={`text-sm font-bold ${getScoreColor(drvPopupEldScore)}`}>{drvPopupEldScore.toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Camera Score</div>
                            <div className={`text-sm font-bold ${getScoreColor(drvPopupVedrScore)}`}>{drvPopupVedrScore.toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Roadside Inspection Score</div>
                            <div className={`text-sm font-bold ${getScoreColor(drvPopupInspectionScore)}`}>{drvPopupInspectionScore.toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Roadside Violation Score</div>
                            <div className={`text-sm font-bold ${getScoreColor(drvPopupViolationScore)}`}>{drvPopupViolationScore.toFixed(2)}%</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Training Score</div>
                            <div className={`text-sm font-bold ${drvPopupTrainingScore === 0 ? 'text-red-600' : getScoreColor(drvPopupTrainingScore)}`}>{drvPopupTrainingScore.toFixed(2)}%</div>
                          </div>
                        </div>
                      </div>

                      {/* ── DRIVER KEY INDICATOR EVENTS ── */}
                      <div>
                        <h4 className="text-base font-bold text-blue-600 text-center mb-1">Driver Key Indicator Events</h4>
                        <p className="text-center text-xs text-slate-500 italic mb-3">Valid Events This Month</p>
                        <p className="text-center text-sm font-bold text-slate-800 mb-4">
                          Key Indicator Status: <span className="text-green-600 italic">PASS</span>
                        </p>
                        <div className="grid grid-cols-3 gap-y-3 gap-x-4 px-4">
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Cell Phone Events</div>
                            <div className="text-sm font-bold text-slate-900">0</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Speeding Events</div>
                            <div className="text-sm font-bold text-slate-900">0</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Following Distance Events</div>
                            <div className="text-sm font-bold text-slate-900">0</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Seat Belt Events</div>
                            <div className="text-sm font-bold text-slate-900">0</div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold text-slate-700">Obstructed Camera Events</div>
                            <div className="text-sm font-bold text-slate-900">0</div>
                          </div>
                        </div>
                      </div>

                      <hr className="border-slate-200" />

                      {/* ── DETAIL INFO ── */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</div><div className="text-sm font-semibold text-slate-800">{selectedDriver.firstName} {selectedDriver.middleName ? selectedDriver.middleName + ' ' : ''}{selectedDriver.lastName}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Email</div><div className="text-sm text-slate-700">{selectedDriver.email}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Phone</div><div className="text-sm text-slate-700">{selectedDriver.phone}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">DOB</div><div className="text-sm text-slate-700">{selectedDriver.dob}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Gender</div><div className="text-sm text-slate-700">{selectedDriver.gender}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Citizenship</div><div className="text-sm text-slate-700">{selectedDriver.citizenship}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hired Date</div><div className="text-sm text-slate-700">{selectedDriver.hiredDate}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Terminal</div><div className="text-sm text-slate-700">{selectedDriver.terminal}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver Type</div><div className="text-sm text-slate-700">{selectedDriver.driverType || 'N/A'}</div></div>
                        </div>

                        {/* Address */}
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={11} />Address</div>
                          <div className="text-sm text-slate-700">{selectedDriver.address}{selectedDriver.unit ? `, Unit ${selectedDriver.unit}` : ''}, {selectedDriver.city}, {selectedDriver.state} {selectedDriver.zip}, {selectedDriver.country}</div>
                        </div>

                        {/* License */}
                        {selectedDriver.licenses.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Licenses</h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Type</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Number</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Class</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Province</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Expiry</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {selectedDriver.licenses.map(lic => (
                                    <tr key={lic.id}>
                                      <td className="px-3 py-2 text-sm text-slate-700">{lic.type}</td>
                                      <td className="px-3 py-2 text-sm font-mono text-slate-700">{lic.licenseNumber}</td>
                                      <td className="px-3 py-2 text-sm text-slate-700">{lic.class}</td>
                                      <td className="px-3 py-2 text-sm text-slate-700">{lic.province}, {lic.country}</td>
                                      <td className="px-3 py-2 text-sm text-slate-700">{lic.expiryDate}</td>
                                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${lic.status === 'Valid' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{lic.status}</span></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Travel Documents */}
                        {selectedDriver.travelDocuments && selectedDriver.travelDocuments.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Travel Documents</h4>
                            <div className="space-y-2">
                              {selectedDriver.travelDocuments.map(td => (
                                <div key={td.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">{td.type}</span>
                                    <span className="text-xs font-mono text-slate-400">{td.number}</span>
                                  </div>
                                  <span className="text-xs text-slate-500">Exp: {td.expiryDate}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Emergency Contacts */}
                        {selectedDriver.emergencyContacts.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Emergency Contacts</h4>
                            <div className="space-y-2">
                              {selectedDriver.emergencyContacts.map((ec, i) => (
                                <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                  <div className="text-sm font-semibold text-slate-800">{ec.name} <span className="text-xs font-normal text-slate-400">({ec.relation})</span></div>
                                  <div className="text-xs text-slate-500">{ec.phone} &bull; {ec.email}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Employment History */}
                        {selectedDriver.employmentHistory.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Employment History</h4>
                            <div className="space-y-2">
                              {selectedDriver.employmentHistory.map((eh, i) => (
                                <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                                  <div className="text-sm font-semibold text-slate-800">{eh.employerName}</div>
                                  <div className="text-xs text-slate-500">{eh.startDate} — {eh.endDate} &bull; {eh.operatingZone} &bull; {eh.terminationStatus}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Safety & Compliance Documents */}
                        {(() => {
                          const driverInspections = inspectionsData.filter(ins => ins.driverId === selectedDriver.id);
                          const totalViolations = driverInspections.reduce((sum, ins) => sum + (ins.violations?.length || 0), 0);
                          if (driverInspections.length === 0) return null;
                          return (
                            <div>
                              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Safety & Compliance Documents</h4>
                              <p className="text-xs text-slate-500 mb-3">{driverInspections.length} inspection report{driverInspections.length !== 1 ? 's' : ''} • {totalViolations} violation{totalViolations !== 1 ? 's' : ''} found</p>
                              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {driverInspections.map(ins => (
                                  <div key={ins.id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                                    {/* Inspection report row */}
                                    <div className="flex items-center justify-between px-3 py-2.5">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${ins.hasOOS ? 'bg-red-100' : ins.isClean ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                                          <FileText size={14} className={ins.hasOOS ? 'text-red-600' : ins.isClean ? 'text-emerald-600' : 'text-amber-600'} />
                                        </div>
                                        <div>
                                          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                                            Inspection Report — {ins.id}
                                            {ins.hasOOS && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase">OOS</span>}
                                            {ins.isClean && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-600 border border-emerald-200 uppercase">Clean</span>}
                                          </div>
                                          <div className="text-[10px] text-slate-400">{ins.date} • {ins.level} • {ins.location.city}, {ins.state}</div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => setSelectedInspectionId(ins.id)}
                                        className="px-2.5 py-1 rounded text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transition-colors"
                                      >
                                        View
                                      </button>
                                    </div>

                                    {/* Violation docs under each inspection */}
                                    {ins.violations && ins.violations.length > 0 && (
                                      <div className="border-t border-slate-200 bg-white">
                                        {ins.violations.slice(0, 5).map((v: any, vi: number) => (
                                          <div key={vi} className="flex items-center justify-between px-3 py-1.5 border-b border-slate-50 last:border-0">
                                            <div className="flex items-center gap-2">
                                              <div className="h-5 w-5 rounded flex items-center justify-center bg-slate-100">
                                                <FileText size={10} className="text-slate-400" />
                                              </div>
                                              <span className="text-[11px] font-mono font-semibold text-slate-600">{v.code}</span>
                                              <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{v.category}</span>
                                              {v.oos && <span className="px-1 py-0 rounded text-[8px] font-bold bg-red-50 text-red-500 border border-red-200">OOS</span>}
                                            </div>
                                            <span className="text-[10px] text-slate-400">{v.points} pts</span>
                                          </div>
                                        ))}
                                        {ins.violations.length > 5 && (
                                          <div className="px-3 py-1.5 text-center">
                                            <span className="text-[10px] text-blue-500 font-semibold">+{ins.violations.length - 5} more violations</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}

            {/* --- ELD/VEDR TAB --- */}
            {activeTab === 'eld-vedr' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Radio size={16} className="text-indigo-500" />
                    ELD & VEDR Events
                  </h3>
                  <span className="text-xs text-slate-400 font-semibold">{ELD_VEDR_EVENTS.length} events</span>
                </div>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Duration</th>
                        <th className="px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ELD_VEDR_EVENTS.map(evt => (
                        <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs font-bold text-blue-600 font-mono">{evt.id}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{evt.date}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border ${
                              evt.type === 'ELD'
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                : 'bg-violet-50 text-violet-600 border-violet-200'
                            }`}>
                              {evt.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <DriverAvatar name={evt.driverName} />
                              <span className="text-sm font-medium text-slate-700">{evt.driverName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{evt.vehicleId}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700 font-medium">{evt.event}</td>
                          <td className="px-4 py-3 text-center text-sm font-mono font-bold text-slate-600">{evt.duration}</td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(evt.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* --- INSPECTIONS TAB --- */}
            {activeTab === 'inspections' && (
              <div>
                {/* Inspection Overview Stats */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Inspection Overview &mdash; Last 2 Years</h3>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <div className="text-sm text-slate-600 font-medium">Clean Inspections</div>
                    <div className="text-2xl font-bold text-slate-900">{inspectionsData.filter(i => i.isClean).length}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-sm text-slate-600 font-medium">Inspections with Violations</div>
                    <div className="text-2xl font-bold text-slate-900">{inspectionsData.filter(i => !i.isClean).length}</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="text-sm text-slate-600 font-medium">Total Inspections</div>
                    <div className="text-2xl font-bold text-slate-900">{inspectionsData.length}</div>
                  </div>
                </div>

                {/* Status Message */}
                <div className="text-center text-sm text-emerald-600 mb-5">
                  <span className="inline-flex items-center gap-1"><Shield size={14} /> Your inspection scores look acceptable right now. You can review any inspection records below.</span>
                </div>

                {/* Inspections Table */}
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-3 w-8"><input type="checkbox" className="rounded border-slate-300" disabled /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inspection ID <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">City <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">State <ChevronDown size={10} className="inline ml-0.5 text-slate-400" /></th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Level</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Result</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inspectionsData.map(ins => (
                        <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-3"><input type="checkbox" className="rounded border-slate-300" /></td>
                          <td className="px-3 py-3 text-sm font-mono font-semibold text-blue-600">{ins.id}</td>
                          <td className="px-3 py-3 text-sm text-slate-700">{ins.date}</td>
                          <td className="px-3 py-3 text-sm font-medium text-slate-800">{ins.driver}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{ins.location.city}</td>
                          <td className="px-3 py-3 text-sm text-slate-600">{ins.state}</td>
                          <td className="px-3 py-3 text-center">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 uppercase">{ins.level}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {ins.hasOOS ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase">OOS</span>
                            ) : ins.isClean ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 uppercase">Clean</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-200 uppercase">Violations</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => setSelectedInspectionId(ins.id)} className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Info */}
                <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                  <span>Showing <strong>1</strong> to <strong>{inspectionsData.length}</strong> of <strong>{inspectionsData.length}</strong> results</span>
                </div>

                {/* ===== INSPECTION DETAIL POPUP ===== */}
                {selectedInspection && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedInspectionId(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[800px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Inspection Detail &mdash; {selectedInspection.id}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">{selectedInspection.date} &bull; {selectedInspection.level} &bull; {selectedInspection.location.raw}</p>
                        </div>
                        <button onClick={() => setSelectedInspectionId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <X size={18} className="text-slate-500" />
                        </button>
                      </div>
                      <div className="px-6 py-5 space-y-5">
                        {/* Key Info */}
                        <div className="grid grid-cols-3 gap-x-5 gap-y-3">
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</div><div className="text-sm font-semibold text-slate-800">{selectedInspection.driver}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">License</div><div className="text-sm font-mono text-slate-700">{selectedInspection.driverLicense}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</div><div className="text-sm font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">{selectedInspection.vehiclePlate}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Location</div><div className="text-sm text-slate-700">{selectedInspection.location.raw}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Time</div><div className="text-sm text-slate-700">{selectedInspection.startTime} — {selectedInspection.endTime}</div></div>
                          <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity Rate</div><div className="text-sm font-bold text-slate-800">{selectedInspection.severityRate ?? 'N/A'}</div></div>
                        </div>

                        {/* Status Flags */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase border ${selectedInspection.isClean ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>{selectedInspection.isClean ? 'Clean' : 'Violations Found'}</span>
                          {selectedInspection.hasOOS && <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-600 border border-red-200 uppercase">OOS</span>}
                          <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase border ${selectedInspection.oosSummary.driver === 'PASSED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>Driver: {selectedInspection.oosSummary.driver}</span>
                          <span className={`px-2 py-1 rounded-md text-[11px] font-bold uppercase border ${selectedInspection.oosSummary.vehicle === 'PASSED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>Vehicle: {selectedInspection.oosSummary.vehicle}</span>
                        </div>

                        {/* Defects */}
                        {(selectedInspection.powerUnitDefects || selectedInspection.trailerDefects) && (
                          <div className="bg-red-50/50 rounded-lg p-3 border border-red-200">
                            <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-1">Defects Found</div>
                            {selectedInspection.powerUnitDefects && <div className="text-sm text-slate-700"><strong>Power Unit:</strong> {selectedInspection.powerUnitDefects}</div>}
                            {selectedInspection.trailerDefects && <div className="text-sm text-slate-700 mt-1"><strong>Trailer:</strong> {selectedInspection.trailerDefects}</div>}
                          </div>
                        )}

                        {/* Units */}
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Units Inspected ({selectedInspection.units.length})</h4>
                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Type</th>
                                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Make</th>
                                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">License</th>
                                  <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">VIN</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {selectedInspection.units.map((u, i) => (
                                  <tr key={i}>
                                    <td className="px-3 py-2 text-sm text-slate-700">{u.type}</td>
                                    <td className="px-3 py-2 text-sm text-slate-700">{u.make}</td>
                                    <td className="px-3 py-2 text-sm font-mono text-slate-700">{u.license}</td>
                                    <td className="px-3 py-2 text-xs font-mono text-slate-400">{u.vin}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Violations */}
                        {selectedInspection.violations.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Violations ({selectedInspection.violations.length})</h4>
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                  <tr>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Code</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Category</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase">Description</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Severity</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">Points</th>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase text-center">OOS</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {selectedInspection.violations.map((v, i) => (
                                    <tr key={i} className={v.oos ? 'bg-red-50/30' : ''}>
                                      <td className="px-3 py-2 text-xs font-mono font-bold text-blue-600">{v.code}</td>
                                      <td className="px-3 py-2 text-xs text-slate-600">{v.category}</td>
                                      <td className="px-3 py-2 text-xs text-slate-700">{v.description}</td>
                                      <td className="px-3 py-2 text-center"><span className={`text-xs font-bold ${v.severity >= 7 ? 'text-red-600' : v.severity >= 4 ? 'text-amber-600' : 'text-slate-500'}`}>{v.severity}</span></td>
                                      <td className="px-3 py-2 text-center text-xs font-bold text-slate-700">{v.points}</td>
                                      <td className="px-3 py-2 text-center">{v.oos ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">OOS</span> : <span className="text-xs text-slate-400">&mdash;</span>}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Points Summary */}
                        {'smsPoints' in selectedInspection && selectedInspection.smsPoints && (
                          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">SMS Points</div>
                            <div className="flex gap-6">
                              <div><span className="text-xs text-slate-500">Vehicle:</span> <span className="text-sm font-bold text-slate-800">{selectedInspection.smsPoints.vehicle}</span></div>
                              <div><span className="text-xs text-slate-500">Driver:</span> <span className="text-sm font-bold text-slate-800">{selectedInspection.smsPoints.driver}</span></div>
                              <div><span className="text-xs text-slate-500">Carrier:</span> <span className="text-sm font-bold text-slate-800">{selectedInspection.smsPoints.carrier}</span></div>
                            </div>
                          </div>
                        )}

                        {/* ── ATTACHED DOCUMENTS ── */}
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Attached Documents ({1 + selectedInspection.violations.length})
                          </h4>
                          <div className="space-y-2">
                            {/* Inspection Report */}
                            <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2.5 border border-blue-200">
                              <div className="flex items-center gap-2">
                                <FileText size={15} className="text-blue-500" />
                                <div>
                                  <div className="text-sm font-semibold text-slate-800">Inspection Report — {selectedInspection.id}</div>
                                  <div className="text-[11px] text-slate-500">{selectedInspection.level} • {selectedInspection.date} • {selectedInspection.location.raw}</div>
                                </div>
                              </div>
                              <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transition-colors">
                                <Download size={12} /> PDF
                              </button>
                            </div>

                            {/* Violation Documents */}
                            {selectedInspection.violations.map((v, i) => (
                              <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${v.oos ? 'bg-red-50/50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                  <FileText size={15} className={v.oos ? 'text-red-400' : 'text-slate-400'} />
                                  <div>
                                    <div className="text-sm font-semibold text-slate-800">
                                      Violation: {v.code} {v.oos && <span className="ml-1 text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">OOS</span>}
                                    </div>
                                    <div className="text-[11px] text-slate-500">{v.category} — {v.description}</div>
                                  </div>
                                </div>
                                <button className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                                  <Download size={12} /> PDF
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
