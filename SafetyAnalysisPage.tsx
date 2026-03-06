import { useState } from 'react';
import { INCIDENTS } from '../incidents/incidents.data';
import { MOCK_DRIVERS } from '../../data/mock-app-data';
import { inspectionsData, getJurisdiction } from '../inspections/inspectionsData';
import { INITIAL_ASSETS, type Asset } from '../assets/assets.data';
import {
  FLEET_SAFETY_SCORES,
  COMPUTED_INCIDENT_STATS,
  INCIDENT_FILTER_TYPES,
  DRIVER_SAFETY_SCORES,
  DRIVER_KEY_INDICATORS,
  LOWEST_DRIVERS,
  HIGHEST_DRIVERS,
  NUM_ACTIVE_DRIVERS,
  FLEET_AVERAGE,
  HOS_VIOLATION_EVENTS,
  VEDR_VIOLATION_EVENTS,
} from './safety-analysis.data';
import { VIOLATION_DATA } from '@/data/violations.data';
import { SAFETY_EVENTS_RESULTS } from '../safety-events/SafetyEventsPage';
import {
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Search,
  X,
  FileText,
  Download,
  MapPin,
  Shield,
  Eye,
  Filter,
  Printer,
  Share2,
  Mail,
  FileDown,
  CheckCheck,
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

const getRiskMeta = (score: number) => {
  const clamped = Math.max(0, Math.min(score, 100));
  if (clamped >= 90) {
    return {
      label: 'Excellent',
      shortLabel: 'Low Risk',
    };
  }
  if (clamped >= 80) {
    return {
      label: 'Acceptable',
      shortLabel: 'Low Risk',
    };
  }
  if (clamped >= 70) {
    return {
      label: 'Conditional',
      shortLabel: 'Moderate Risk',
    };
  }
  return {
    label: 'Unsatisfactory',
    shortLabel: 'High Risk',
  };
};

const getAssetRiskScore = (asset: Asset, today = new Date()) => {
  const baseByStatus: Record<Asset['operationalStatus'], number> = {
    Active: 95,
    Maintenance: 78,
    OutOfService: 62,
    Deactivated: 70,
    Drafted: 74,
  };

  let score = baseByStatus[asset.operationalStatus] ?? 70;

  const age = today.getFullYear() - asset.year;
  if (age >= 10) score -= 10;
  else if (age >= 7) score -= 6;
  else if (age >= 5) score -= 3;

  const odo = asset.odometer ?? 0;
  const isHighMileage = asset.odometerUnit === 'km' ? odo >= 700000 : odo >= 430000;
  const isMediumMileage = asset.odometerUnit === 'km' ? odo >= 500000 : odo >= 310000;
  if (isHighMileage) score -= 8;
  else if (isMediumMileage) score -= 4;

  const expiry = new Date(asset.registrationExpiryDate);
  if (!Number.isNaN(expiry.getTime())) {
    const daysToExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry < 0) score -= 12;
    else if (daysToExpiry <= 30) score -= 8;
    else if (daysToExpiry <= 90) score -= 4;
  }

  return Math.max(30, Math.min(100, score));
};

const getAssetSubScores = (asset: Asset) => {
  const today = new Date();
  const baseByStatus: Record<Asset['operationalStatus'], number> = {
    Active: 95, Maintenance: 78, OutOfService: 62, Deactivated: 70, Drafted: 74,
  };
  const statusScore = baseByStatus[asset.operationalStatus] ?? 70;

  const age = today.getFullYear() - asset.year;
  const ageScore = age >= 10 ? 60 : age >= 7 ? 72 : age >= 5 ? 82 : 95;

  const odo = asset.odometer ?? 0;
  const isHighMileage = asset.odometerUnit === 'km' ? odo >= 700000 : odo >= 430000;
  const isMediumMileage = asset.odometerUnit === 'km' ? odo >= 500000 : odo >= 310000;
  const mileageScore = isHighMileage ? 60 : isMediumMileage ? 75 : 95;

  const expiry = new Date(asset.registrationExpiryDate);
  let regScore = 95;
  if (!Number.isNaN(expiry.getTime())) {
    const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
    regScore = days < 0 ? 50 : days <= 30 ? 62 : days <= 90 ? 78 : 95;
  }

  const overall = getAssetRiskScore(asset, today);
  return { overall, statusScore, ageScore, mileageScore, regScore };
};

const SafetyRingChart = ({
  label,
  score,
  size = 'small',
  subtitle,
  palette = 'auto',
}: {
  label: string;
  score: number;
  size?: 'large' | 'small';
  subtitle?: string;
  palette?: 'auto' | 'blue' | 'green';
}) => {
  const clamped = Math.max(0, Math.min(score, 100));
  const risk = getRiskMeta(clamped);
  const ringSize = size === 'large' ? 'w-40 h-40 lg:w-44 lg:h-44' : 'w-24 h-24';
  const numberSize = size === 'large' ? 'text-4xl lg:text-5xl' : 'text-3xl';
  const paletteClasses = palette === 'blue'
    ? {
        ringClass: 'text-blue-600',
        pillClass: 'bg-blue-100 text-blue-700',
        textClass: 'text-blue-700',
      }
    : palette === 'green'
      ? {
          ringClass: 'text-emerald-500',
          pillClass: 'bg-emerald-100 text-emerald-700',
          textClass: 'text-emerald-700',
        }
      : clamped >= 90
        ? {
            ringClass: 'text-emerald-500',
            pillClass: 'bg-emerald-100 text-emerald-700',
            textClass: 'text-emerald-700',
          }
        : clamped >= 80
          ? {
              ringClass: 'text-blue-600',
              pillClass: 'bg-blue-100 text-blue-700',
              textClass: 'text-blue-700',
            }
          : clamped >= 70
            ? {
                ringClass: 'text-amber-500',
                pillClass: 'bg-amber-100 text-amber-700',
                textClass: 'text-amber-700',
              }
            : {
                ringClass: 'text-red-500',
                pillClass: 'bg-red-100 text-red-700',
                textClass: 'text-red-700',
              };

  return (
    <div className="w-full flex flex-col items-center text-center">
      <div className={`text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 leading-tight ${size === 'large' ? '' : 'min-h-[2.5rem] flex items-center justify-center px-1'}`}>
        {label}
      </div>
      <div className={`relative ${ringSize} flex items-center justify-center`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
          <path
            className="text-slate-200"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth={size === 'large' ? 3 : 4}
          />
          <path
            className={paletteClasses.ringClass}
            strokeDasharray={`${clamped.toFixed(2)}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="currentColor"
            strokeWidth={size === 'large' ? 3 : 4}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`${numberSize} font-black text-slate-900 leading-none`}>{Math.round(clamped)}</span>
          {size === 'large' && <span className="text-xs font-bold text-slate-400">/ 100</span>}
        </div>
      </div>
      {size === 'large' ? (
        <>
          <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${paletteClasses.pillClass}`}>
            <Shield size={13} />
            {risk.label}
          </div>
          {subtitle && <div className="mt-2 text-xs font-semibold text-slate-500 text-center">{subtitle}</div>}
        </>
      ) : (
        <div className={`mt-2 text-xs font-bold uppercase tracking-wide ${paletteClasses.textClass}`}>{risk.shortLabel}</div>
      )}
    </div>
  );
};

const MiniRiskRing = ({
  score,
  palette = 'green',
}: {
  score: number;
  palette?: 'blue' | 'green' | 'auto';
}) => {
  const clamped = Math.max(0, Math.min(score, 100));
  const ringClass = palette === 'auto'
    ? (clamped >= 90 ? 'text-emerald-500' : clamped >= 80 ? 'text-blue-600' : clamped >= 70 ? 'text-amber-500' : 'text-red-500')
    : palette === 'blue' ? 'text-blue-600' : 'text-emerald-500';
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
        <path
          className="text-slate-200"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className={ringClass}
          strokeDasharray={`${clamped.toFixed(2)}, 100`}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-sm font-black text-slate-900 leading-none">{Math.round(clamped)}</span>
    </div>
  );
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

// ===== VIOLATION DERIVED DATA =====
const HOS_VIOLATIONS = VIOLATION_DATA.categories['hours_of_service']?.items ?? [];
const DRIVER_FITNESS_VIOLATIONS = VIOLATION_DATA.categories['driver_fitness']?.items ?? [];
const UNSAFE_DRIVING_VIOLATIONS = VIOLATION_DATA.categories['unsafe_driving']?.items ?? [];

// Build reverse map: telematics tag → top violation codes (max 3 per tag)
const TAG_TO_VIOLATIONS: Record<string, { code: string; desc: string }[]> = {};
[...HOS_VIOLATIONS, ...DRIVER_FITNESS_VIOLATIONS, ...UNSAFE_DRIVING_VIOLATIONS].forEach(item => {
  item.telematicsTags?.forEach(tag => {
    if (!TAG_TO_VIOLATIONS[tag]) TAG_TO_VIOLATIONS[tag] = [];
    if (TAG_TO_VIOLATIONS[tag].length < 3) {
      TAG_TO_VIOLATIONS[tag].push({ code: item.violationCode, desc: item.violationDescription });
    }
  });
});

// Safety event type → telematics tags
const EVENT_TYPE_TO_TAGS: Record<string, string[]> = {
  harsh_brake: ['harsh_brake'], harsh_acceleration: ['harsh_acceleration'],
  harsh_cornering: ['harsh_turn'], harsh_turn: ['harsh_turn'],
  over_speed: ['speeding'], crash: ['crash'], near_crash: ['near_crash'],
  tailgating: ['tailgating'], cell_phone: ['cell_phone'], distracted: ['distracted'],
  drowsiness: ['drowsiness'], smoking: ['smoking'], seat_belt_violation: ['seat_belt_violation'],
  stop_sign_violation: ['stop_sign_violation'], red_light_violation: ['red_light_violation'],
  unsafe_lane_change: ['unsafe_lane_change'], camera_obstruction: ['camera_obstruction'],
  eating_and_drinking: ['eating_and_drinking'], rolling_stop: ['rolling_stop'],
  unsafe_parking: ['unsafe_parking'], collision_warning: ['crash', 'near_crash'],
};

// Safety event type labels + colors
const EVENT_TYPE_LABEL: Record<string, string> = {
  harsh_brake: 'Harsh Brake', harsh_acceleration: 'Harsh Accel.', harsh_cornering: 'Harsh Turn',
  harsh_turn: 'Harsh Turn', over_speed: 'Over Speed', crash: 'Crash', near_crash: 'Near Crash',
  tailgating: 'Tailgating', cell_phone: 'Cell Phone', distracted: 'Distracted',
  drowsiness: 'Drowsiness', smoking: 'Smoking', seat_belt_violation: 'Seat Belt',
  stop_sign_violation: 'Stop Sign', red_light_violation: 'Red Light',
  unsafe_lane_change: 'Lane Change', camera_obstruction: 'Cam. Block',
  eating_and_drinking: 'Eating/Drink', rolling_stop: 'Rolling Stop',
  unsafe_parking: 'Unsafe Park', collision_warning: 'Collision Warn',
};
const EVENT_TYPE_COLOR: Record<string, string> = {
  harsh_brake: 'bg-red-50 text-red-600 border-red-200',
  harsh_acceleration: 'bg-red-50 text-red-600 border-red-200',
  over_speed: 'bg-amber-50 text-amber-600 border-amber-200',
  harsh_cornering: 'bg-orange-50 text-orange-600 border-orange-200',
  harsh_turn: 'bg-orange-50 text-orange-600 border-orange-200',
  unsafe_lane_change: 'bg-orange-50 text-orange-600 border-orange-200',
  collision_warning: 'bg-rose-50 text-rose-600 border-rose-200',
  near_crash: 'bg-rose-50 text-rose-600 border-rose-200',
  crash: 'bg-rose-50 text-rose-700 border-rose-300',
  cell_phone: 'bg-purple-50 text-purple-600 border-purple-200',
  distracted: 'bg-purple-50 text-purple-600 border-purple-200',
  eating_and_drinking: 'bg-purple-50 text-purple-600 border-purple-200',
  drowsiness: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  tailgating: 'bg-orange-50 text-orange-700 border-orange-300',
  smoking: 'bg-slate-50 text-slate-600 border-slate-200',
  seat_belt_violation: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  stop_sign_violation: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  red_light_violation: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  rolling_stop: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  camera_obstruction: 'bg-teal-50 text-teal-600 border-teal-200',
  unsafe_parking: 'bg-teal-50 text-teal-600 border-teal-200',
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
  const [pageTab, setPageTab] = useState<'dashboard' | 'overview'>('overview');
  const [activeTab, setActiveTab] = useState<TabId>('scoring');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('All Accidents');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [driverSubTab, setDriverSubTab] = useState<'lowest' | 'highest'>('lowest');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [eldVedrSubTab, setEldVedrSubTab] = useState<'ELD' | 'VEDR'>('ELD');
  const [inspectionJurFilter, setInspectionJurFilter] = useState<'All' | 'SMS' | 'CVOR'>('All');

  // ELD filters
  const [eldSearch, setEldSearch] = useState('');
  const [eldStatusFilter, setEldStatusFilter] = useState('All');
  const [eldOosFilter, setEldOosFilter] = useState('All');
  const [eldGroupFilter, setEldGroupFilter] = useState('All');
  const [selectedHosEvent, setSelectedHosEvent] = useState<typeof HOS_VIOLATION_EVENTS[0] | null>(null);

  // VEDR violation filters
  const [vedrSearch, setVedrSearch] = useState('');
  const [vedrCategoryFilter, setVedrCategoryFilter] = useState('All');
  const [vedrStatusFilter, setVedrStatusFilter] = useState('All');
  const [vedrOosFilter, setVedrOosFilter] = useState('All');
  const [selectedVedrViolation, setSelectedVedrViolation] = useState<typeof VEDR_VIOLATION_EVENTS[0] | null>(null);

  // VEDR safety event filters
  const [vedrEventSearch, setVedrEventSearch] = useState('');
  const [vedrEventTypeFilter, setVedrEventTypeFilter] = useState('All');
  const [vedrEventSeverityFilter, setVedrEventSeverityFilter] = useState('All');
  const [selectedSafetyEvent, setSelectedSafetyEvent] = useState<Record<string, unknown> | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [selectedDashboardDriverId, setSelectedDashboardDriverId] = useState<string | null>(null);
  const [selectedDashboardAssetId, setSelectedDashboardAssetId] = useState<string | null>(null);

  const selectedDriver = selectedDriverId ? MOCK_DRIVERS.find(d => d.id === selectedDriverId) ?? null : null;
  const selectedInspection = selectedInspectionId ? inspectionsData.find(i => i.id === selectedInspectionId) ?? null : null;
  const selectedIncident = selectedIncidentId ? INCIDENTS.find(i => i.incidentId === selectedIncidentId) ?? null : null;
  const selectedDashboardDriver = selectedDashboardDriverId ? MOCK_DRIVERS.find(d => d.id === selectedDashboardDriverId) ?? null : null;
  const selectedDashboardAsset = selectedDashboardAssetId ? INITIAL_ASSETS.find(a => a.id === selectedDashboardAssetId) ?? null : null;

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

  // Pre-compute dashboard driver popup scores
  const _dashDrvScores = selectedDashboardDriverId ? DRIVER_SAFETY_SCORES.find(d => d.driverId === selectedDashboardDriverId) : undefined;
  const dashDrvSafetyScore = _dashDrvScores?.overall ?? 83.33;
  const dashDrvAccidentScore = _dashDrvScores?.accidents ?? 100;
  const dashDrvEldScore = _dashDrvScores?.eld ?? 100;
  const dashDrvVedrScore = _dashDrvScores?.vedr ?? 100;
  const dashDrvInspectionScore = _dashDrvScores?.inspections ?? 100;
  const dashDrvViolationScore = _dashDrvScores?.violations ?? 100;
  const dashDrvTrainingScore = _dashDrvScores?.trainings ?? 0;
  const dashDrvSafetyLevel = dashDrvSafetyScore >= 90 ? 'Satisfactory' : dashDrvSafetyScore >= 80 ? 'Acceptable' : dashDrvSafetyScore >= 70 ? 'Conditional' : 'Unsatisfactory';

  // Pre-compute dashboard asset sub-scores
  const dashboardAssetScores = selectedDashboardAsset ? getAssetSubScores(selectedDashboardAsset) : null;

  // ELD/VEDR stats banner data
  const validEldCount = HOS_VIOLATION_EVENTS.length;
  const validVedrCount = VEDR_VIOLATION_EVENTS.length;
  const allEventDriverIds = new Set([
    ...HOS_VIOLATION_EVENTS.map(e => e.driverId),
    ...VEDR_VIOLATION_EVENTS.map(e => e.driverId),
  ]);
  const driversWithValidEvents = allEventDriverIds.size;

  // ELD filtered
  const ELD_GROUPS = ['All', ...Array.from(new Set(HOS_VIOLATION_EVENTS.map(e => e.violationGroup)))];
  const filteredEld = HOS_VIOLATION_EVENTS.filter(evt => {
    const matchSearch = !eldSearch || evt.driverName.toLowerCase().includes(eldSearch.toLowerCase()) || evt.violationCode.toLowerCase().includes(eldSearch.toLowerCase()) || evt.vehicleId.toLowerCase().includes(eldSearch.toLowerCase());
    const matchStatus = eldStatusFilter === 'All' || evt.status === eldStatusFilter;
    const matchOos = eldOosFilter === 'All' || (eldOosFilter === 'OOS Only' ? evt.isOos : !evt.isOos);
    const matchGroup = eldGroupFilter === 'All' || evt.violationGroup === eldGroupFilter;
    return matchSearch && matchStatus && matchOos && matchGroup;
  });

  // VEDR violations filtered
  const filteredVedrViolations = VEDR_VIOLATION_EVENTS.filter(evt => {
    const matchSearch = !vedrSearch || evt.driverName.toLowerCase().includes(vedrSearch.toLowerCase()) || evt.violationCode.toLowerCase().includes(vedrSearch.toLowerCase()) || evt.vehicleId.toLowerCase().includes(vedrSearch.toLowerCase());
    const matchCat = vedrCategoryFilter === 'All' || evt.category === vedrCategoryFilter;
    const matchStatus = vedrStatusFilter === 'All' || evt.status === vedrStatusFilter;
    const matchOos = vedrOosFilter === 'All' || (vedrOosFilter === 'OOS Only' ? evt.isOos : !evt.isOos);
    return matchSearch && matchCat && matchStatus && matchOos;
  });

  // VEDR safety events filtered
  const ALL_EVENT_TYPES = ['All', ...Array.from(new Set(SAFETY_EVENTS_RESULTS.map((e: Record<string, unknown>) => e.type as string)))];
  const filteredSafetyEvents = SAFETY_EVENTS_RESULTS.filter((evt: Record<string, unknown>) => {
    const matchSearch = !vedrEventSearch || (evt.driverName as string ?? '').toLowerCase().includes(vedrEventSearch.toLowerCase()) || (evt.vehiclePlate as string ?? '').toLowerCase().includes(vedrEventSearch.toLowerCase());
    const matchType = vedrEventTypeFilter === 'All' || evt.type === vedrEventTypeFilter;
    const matchSev = vedrEventSeverityFilter === 'All' || evt.severity === vedrEventSeverityFilter;
    return matchSearch && matchType && matchSev;
  });

  // Inspections filtered (extracted to component level for export)
  const filteredInspections = inspectionJurFilter === 'All'
    ? inspectionsData
    : inspectionsData.filter(i => {
        const jur = getJurisdiction(i.state);
        return inspectionJurFilter === 'SMS' ? jur === 'CSA' : jur === 'CVOR';
      });

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

  // ── Dashboard computed stats ──
  const hosOosCount = HOS_VIOLATION_EVENTS.filter(e => e.isOos).length;
  const vedrOosCount = VEDR_VIOLATION_EVENTS.filter(e => e.isOos).length;
  const totalOosCount = hosOosCount + vedrOosCount;
  const hosOpenCount = HOS_VIOLATION_EVENTS.filter(e => e.status === 'Open' || e.status === 'Under Review').length;
  const vedrOpenCount = VEDR_VIOLATION_EVENTS.filter(e => e.status === 'Open' || e.status === 'Under Review').length;
  const totalOpenCount = hosOpenCount + vedrOpenCount;
  const cleanInspectionsCount = inspectionsData.filter(i => i.isClean).length;
  const cleanInspectionsRate = inspectionsData.length > 0 ? Math.round((cleanInspectionsCount / inspectionsData.length) * 100) : 0;
  const incidentTowAway = INCIDENTS.filter(i => i.severity.towAway).length;
  const incidentHazmat = INCIDENTS.filter(i => i.severity.hazmatReleased).length;
  const hosGroupStats = HOS_VIOLATION_EVENTS.reduce<Record<string, { count: number; oos: number }>>((acc, e) => {
    if (!acc[e.violationGroup]) acc[e.violationGroup] = { count: 0, oos: 0 };
    acc[e.violationGroup].count++;
    if (e.isOos) acc[e.violationGroup].oos++;
    return acc;
  }, {});
  const vedrGroupStats = VEDR_VIOLATION_EVENTS.reduce<Record<string, { count: number; oos: number }>>((acc, e) => {
    if (!acc[e.violationGroup]) acc[e.violationGroup] = { count: 0, oos: 0 };
    acc[e.violationGroup].count++;
    if (e.isOos) acc[e.violationGroup].oos++;
    return acc;
  }, {});
  const driverHosCounts = HOS_VIOLATION_EVENTS.reduce<Record<string, number>>((acc, e) => { acc[e.driverId] = (acc[e.driverId] || 0) + 1; return acc; }, {});
  const driverVedrCounts = VEDR_VIOLATION_EVENTS.reduce<Record<string, number>>((acc, e) => { acc[e.driverId] = (acc[e.driverId] || 0) + 1; return acc; }, {});
  const recentCombinedEvents = [
    ...HOS_VIOLATION_EVENTS.map(e => ({ id: e.id, date: e.date, driverName: e.driverName, vehicleId: e.vehicleId, category: 'ELD/HOS', description: e.violationDescription, severity: e.driverSeverity, isOos: e.isOos, status: e.status })),
    ...VEDR_VIOLATION_EVENTS.map(e => ({ id: e.id, date: e.date, driverName: e.driverName, vehicleId: e.vehicleId, category: 'VEDR', description: e.violationDescription, severity: e.driverSeverity, isOos: e.isOos, status: e.status })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

  // ── Tab labels for export ──
  const TAB_LABELS: Record<TabId, string> = {
    scoring: 'Scoring Overview',
    incidents: 'Incidents',
    drivers: 'Drivers',
    'eld-vedr': eldVedrSubTab === 'ELD' ? 'ELD – HOS Violations' : 'VEDR Events',
    inspections: 'Inspections',
  };

  // ── CSV export ──
  const exportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number | boolean)[][] = [];
    let filename = 'safety-analysis';

    if (activeTab === 'scoring') {
      filename = 'safety-scores';
      headers = ['Score Type', 'Value'];
      rows = [
        ['Fleet Safety Score', `${FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(2)}%`],
        ['Fleet Safety Rating', FLEET_SAFETY_SCORES.fleetSafetyRating],
        ['Accident Score', `${FLEET_SAFETY_SCORES.accidentScore.toFixed(2)}%`],
        ['ELD Score', `${FLEET_SAFETY_SCORES.eldScore.toFixed(2)}%`],
        ['Inspection Score', `${FLEET_SAFETY_SCORES.inspectionScore.toFixed(2)}%`],
        ['Driver Score', `${FLEET_SAFETY_SCORES.driverScore.toFixed(2)}%`],
        ['VEDR Score', `${FLEET_SAFETY_SCORES.vedrScore.toFixed(2)}%`],
        ['Roadside Violation Score', `${FLEET_SAFETY_SCORES.roadsideViolationScore.toFixed(2)}%`],
      ];
    } else if (activeTab === 'incidents') {
      filename = 'incidents';
      headers = ['Incident ID', 'Date', 'Driver', 'City', 'State', 'Type', 'Fatalities', 'Injuries', 'Tow Away', 'Hazmat', 'Preventable', 'Total Cost'];
      rows = filteredIncidents.map(inc => {
        const incType = inc.severity.fatalities > 0 ? 'Fatality' : inc.severity.hazmatReleased ? 'Hazmat' : inc.severity.towAway ? 'Tow Away' : inc.severity.injuriesNonFatal > 0 ? 'Injury' : 'Accident';
        return [inc.incidentId, inc.occurredDate, inc.driver.name, inc.location.city, inc.location.stateOrProvince, incType, inc.severity.fatalities, inc.severity.injuriesNonFatal, inc.severity.towAway ? 'Yes' : 'No', inc.severity.hazmatReleased ? 'Yes' : 'No', inc.preventability.isPreventable === null ? 'TBD' : inc.preventability.isPreventable ? 'Yes' : 'No', inc.costs.totalAccidentCosts];
      });
    } else if (activeTab === 'drivers') {
      filename = `driver-scores-${driverSubTab}`;
      headers = ['Driver', 'License #', 'Overall %', 'Accidents %', 'ELD %', 'Inspections %', 'Violations %', 'Trainings %', 'VEDR %'];
      const drvs = driverSubTab === 'lowest' ? LOWEST_DRIVERS : HIGHEST_DRIVERS;
      rows = drvs.map(d => [d.name, d.licenseNumber, d.overall.toFixed(2), d.accidents.toFixed(2), d.eld.toFixed(2), d.inspections.toFixed(2), d.violations.toFixed(2), d.trainings.toFixed(2), d.vedr.toFixed(2)]);
    } else if (activeTab === 'eld-vedr') {
      if (eldVedrSubTab === 'ELD') {
        filename = 'eld-hos-violations';
        headers = ['ID', 'Date', 'Driver', 'Vehicle', 'CFR Code', 'Violation', 'Group', 'OOS', 'Severity', 'Status'];
        rows = filteredEld.map(e => [e.id, e.date, e.driverName, e.vehicleId, e.violationCode, e.violationDescription, e.violationGroup, e.isOos ? 'OOS' : 'No', e.driverSeverity, e.status]);
      } else {
        filename = 'vedr-violations';
        headers = ['ID', 'Date', 'Driver', 'Vehicle', 'Category', 'CFR Code', 'Violation', 'OOS', 'Severity', 'Status'];
        rows = filteredVedrViolations.map(e => [e.id, e.date, e.driverName, e.vehicleId, e.category, e.violationCode, e.violationDescription, e.isOos ? 'OOS' : 'No', e.driverSeverity, e.status]);
      }
    } else if (activeTab === 'inspections') {
      filename = `inspections-${inspectionJurFilter.toLowerCase()}`;
      headers = ['ID', 'Date', 'Driver', 'City', 'State', 'Level', 'OOS', 'Clean', 'Violations Count'];
      rows = filteredInspections.map(i => [i.id, i.date, i.driver, i.location.city, i.state, i.level, i.hasOOS ? 'Yes' : 'No', i.isClean ? 'Yes' : 'No', i.violations?.length ?? 0]);
    }

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── PDF export (print dialog) ──
  const exportPDF = () => window.print();

  // ── Print ──
  const handlePrint = () => window.print();

  // ── Share (copy URL to clipboard) ──
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  // ── Mail To ──
  const handleMailTo = () => {
    const subject = `Safety Analysis – ${TAB_LABELS[activeTab]}`;
    const body = `Please review the Safety Analysis report:\n\nSection: ${TAB_LABELS[activeTab]}\nFleet Safety Score: ${FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(2)}%\nRating: ${FLEET_SAFETY_SCORES.fleetSafetyRating}\n\nView the full report in S.A.F.E.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const carrierRiskInfo = {
    purpose: 'Overall fleet safety health based on accidents, drivers, inspections, ELD and VEDR performance.',
    focus: 'Use this score as your top KPI. Any decline should trigger immediate review of the lower cards.',
  };

  const dashboardScores = [
    {
      id: 'accident',
      label: 'Accident Score',
      value: FLEET_SAFETY_SCORES.accidentScore,
      purpose: 'Measures preventable and reportable accidents against fleet exposure.',
      focus: 'Improve by challenging non-preventable rulings and reducing high-severity events.',
    },
    {
      id: 'eld',
      label: 'ELD Score',
      value: FLEET_SAFETY_SCORES.eldScore,
      purpose: 'Tracks Hours of Service compliance, ELD integrity, and logbook discipline.',
      focus: 'Keep unassigned miles, form-and-manner errors, and HOS violations near zero.',
    },
    {
      id: 'inspection',
      label: 'Inspection Score',
      value: FLEET_SAFETY_SCORES.inspectionScore,
      purpose: 'Reflects clean roadside inspection outcomes over the scoring period.',
      focus: 'Increase clean inspections by improving pre-trip checks and defect resolution.',
    },
    {
      id: 'driver',
      label: 'Driver Score',
      value: FLEET_SAFETY_SCORES.driverScore,
      purpose: 'Aggregates individual driver behavior, incidents, and compliance consistency.',
      focus: 'Target coaching and training on the lowest half of drivers first.',
    },
    {
      id: 'vedr',
      label: 'VEDR Score',
      value: FLEET_SAFETY_SCORES.vedrScore,
      purpose: 'Scores camera and telematics events such as distraction, following distance, and speeding.',
      focus: 'Review events quickly and close corrective actions for repeat trigger patterns.',
    },
    {
      id: 'roadside',
      label: 'Roadside Violation Score',
      value: FLEET_SAFETY_SCORES.roadsideViolationScore,
      purpose: 'Measures violation-free inspection rate with heavier impact for OOS findings.',
      focus: 'Prioritize OOS root-cause fixes to prevent severe point impact.',
    },
  ] as const;

  const RISK_GRID_COLUMNS = 8;
  const RISK_GRID_ROWS = 2;
  const RISK_GRID_SIZE = RISK_GRID_COLUMNS * RISK_GRID_ROWS;

  const driverRiskItemsRaw = DRIVER_SAFETY_SCORES
    .map(drv => ({
      id: drv.driverId,
      title: drv.name,
      subtitle: drv.licenseNumber || drv.driverId,
      score: drv.overall,
      riskLabel: getRiskMeta(drv.overall).shortLabel,
      placeholder: false,
    }))
    .sort((a, b) => b.score - a.score);

  const driverRiskItems = Array.from({ length: RISK_GRID_SIZE }, (_, idx) => {
    const existing = driverRiskItemsRaw[idx];
    if (existing) return existing;
    return {
      id: `driver-empty-${idx}`,
      title: 'No Driver',
      subtitle: 'N/A',
      score: 0,
      riskLabel: 'N/A',
      placeholder: true,
    };
  });

  const assetRiskItemsRaw = INITIAL_ASSETS
    .map(asset => {
      const score = getAssetRiskScore(asset);
      return {
        id: asset.id,
        title: asset.unitNumber,
        subtitle: `${asset.make} ${asset.model}`,
        score,
        riskLabel: getRiskMeta(score).shortLabel,
        placeholder: false,
      };
    })
    .sort((a, b) => b.score - a.score);

  const assetRiskItems = Array.from({ length: RISK_GRID_SIZE }, (_, idx) => {
    const existing = assetRiskItemsRaw[idx];
    if (existing) return existing;
    return {
      id: `asset-empty-${idx}`,
      title: 'No Asset',
      subtitle: 'N/A',
      score: 0,
      riskLabel: 'N/A',
      placeholder: true,
    };
  });

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">

        {/* ===== PAGE HEADER ===== */}
        <div className="mb-6 flex items-start justify-between gap-6">

          {/* Left — icon + two text rows */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              {/* Row 1 — same visual line as the toggle */}
              <h1 className="text-xl font-bold text-slate-900 h-8 flex items-center">Safety Analysis</h1>
              {/* Row 2 — same visual line as the action buttons */}
              <p className="text-slate-500 text-sm h-8 flex items-center">Fleet safety scoring, incident tracking, and compliance analytics</p>
            </div>
          </div>

          {/* Right — two stacked rows, right-aligned */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">

            {/* Row 1 — page view toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/50 h-10">
              <button
                onClick={() => setPageTab('dashboard')}
                className={`text-sm font-semibold px-5 rounded-lg transition-all ${
                  pageTab === 'dashboard'
                    ? 'bg-white text-blue-700 shadow ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Safety Dashboard
              </button>
              <button
                onClick={() => setPageTab('overview')}
                className={`text-sm font-semibold px-5 rounded-lg transition-all ${
                  pageTab === 'overview'
                    ? 'bg-white text-blue-700 shadow ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                }`}
              >
                Overview
              </button>
            </div>

            {/* Row 2 — action buttons (aligns with subtitle) */}
            <div className="flex items-center gap-2 h-8">

              {/* Share group */}
              <div className="flex items-center h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <button onClick={handlePrint} title="Print"
                  className="flex items-center gap-1.5 px-3 h-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  <Printer size={13} /> Print
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button onClick={handleShare} title="Copy link"
                  className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-colors ${
                    showCopied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-100'
                  }`}>
                  {showCopied ? <CheckCheck size={13} /> : <Share2 size={13} />}
                  {showCopied ? 'Copied!' : 'Share'}
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button onClick={handleMailTo} title="Send by email"
                  className="flex items-center gap-1.5 px-3 h-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                  <Mail size={13} /> Mail To
                </button>
              </div>

              {/* Export group */}
              <div className="flex items-center h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5">Export</span>
                <div className="w-px h-4 bg-slate-200" />
                <button onClick={exportCSV} title="Download CSV"
                  className="flex items-center gap-1.5 px-3 h-full text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">
                  <FileDown size={13} /> CSV
                </button>
                <div className="w-px h-4 bg-slate-200" />
                <button onClick={exportPDF} title="Export PDF"
                  className="flex items-center gap-1.5 px-3 h-full text-xs font-medium text-red-600 hover:bg-red-50 transition-colors">
                  <FileText size={13} /> PDF
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* ===== SAFETY DASHBOARD TAB ===== */}
        {pageTab === 'dashboard' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Safety Dashboard</h2>
                <p className="text-sm text-slate-500">Carrier Risk is blue. All supporting charts are green and include quick hover insights.</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fleet Safety Rating</span>
                <span className={getRatingStyle(FLEET_SAFETY_SCORES.fleetSafetyRating)}>{FLEET_SAFETY_SCORES.fleetSafetyRating}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 lg:gap-6 items-stretch">
              <div className="relative group h-full bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
                <SafetyRingChart
                  size="large"
                  label="Carrier Risk Score"
                  score={FLEET_SAFETY_SCORES.fleetSafetyScore}
                  palette="blue"
                  subtitle={`${FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(2)}% Fleet Safety Score`}
                />
                <div className="mt-3 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hover for more details</div>

                <div className="hidden md:block pointer-events-none absolute left-4 right-4 bottom-4 z-10 rounded-xl border border-blue-200 bg-white/95 backdrop-blur-sm p-3 shadow-sm opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">Carrier Risk Insight</div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{carrierRiskInfo.purpose}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{carrierRiskInfo.focus}</p>
                </div>

                <div className="md:hidden mt-4 rounded-xl border border-blue-200 bg-white p-3">
                  <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">Carrier Risk Insight</div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">{carrierRiskInfo.purpose}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{carrierRiskInfo.focus}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                {dashboardScores.map(metric => (
                  <div key={metric.id} className="relative group h-full bg-gradient-to-b from-emerald-50/70 to-slate-50 border border-emerald-100 rounded-2xl p-4 min-h-[250px] flex flex-col justify-start">
                    <SafetyRingChart label={metric.label} score={metric.value} palette="green" />
                    <div className={`mt-2 text-center text-sm font-bold ${getScoreColor(metric.value)}`}>
                      {metric.value.toFixed(2)}%
                    </div>
                    <div className="mt-1 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hover for more details</div>

                    <div className="hidden md:block pointer-events-none absolute left-3 right-3 top-3 z-10 rounded-xl border border-emerald-200 bg-white/95 backdrop-blur-sm p-3 shadow-sm opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{metric.label}</div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{metric.purpose}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{metric.focus}</p>
                    </div>

                    <div className="md:hidden mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                      <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{metric.label}</div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{metric.purpose}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{metric.focus}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4">

              {/* ── Driver Risk Grid ── */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">Individual Driver Risk Grid</div>
                    <div className="text-xs text-slate-500">{driverRiskItemsRaw.length} drivers — click any card to view risk profile</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">8 × 2</span>
                </div>
                <div className="overflow-x-auto p-4">
                  <div className="min-w-[1120px] grid grid-cols-8 gap-3">
                    {driverRiskItems.map(item => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3 flex flex-col items-center transition-all ${item.placeholder ? 'border-slate-100 bg-slate-50/50 opacity-30' : 'border-slate-200 bg-slate-50 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md'}`}
                        onClick={() => !item.placeholder && setSelectedDashboardDriverId(item.id)}
                      >
                        <MiniRiskRing score={item.score} palette="auto" />
                        <div className="mt-2 text-[11px] font-semibold text-slate-700 text-center leading-tight line-clamp-2">{item.title}</div>
                        <div className="text-[10px] text-slate-400 text-center line-clamp-1 mt-0.5">{item.subtitle}</div>
                        <div className={`mt-1 text-[10px] font-bold uppercase ${
                          item.score >= 90 ? 'text-emerald-600' : item.score >= 80 ? 'text-blue-600' : item.score >= 70 ? 'text-amber-600' : 'text-red-500'
                        }`}>{item.riskLabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Asset Risk Grid ── */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-800">Individual Asset Risk Grid</div>
                    <div className="text-xs text-slate-500">{assetRiskItemsRaw.length} assets — click any card to view risk profile</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">8 × 2</span>
                </div>
                <div className="overflow-x-auto p-4">
                  <div className="min-w-[1120px] grid grid-cols-8 gap-3">
                    {assetRiskItems.map(item => (
                      <div
                        key={item.id}
                        className={`rounded-xl border p-3 flex flex-col items-center transition-all ${item.placeholder ? 'border-slate-100 bg-slate-50/50 opacity-30' : 'border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'}`}
                        onClick={() => !item.placeholder && setSelectedDashboardAssetId(item.id)}
                      >
                        <MiniRiskRing score={item.score} palette="auto" />
                        <div className="mt-2 text-[11px] font-semibold text-slate-700 text-center leading-tight line-clamp-2">{item.title}</div>
                        <div className="text-[10px] text-slate-400 text-center line-clamp-1 mt-0.5">{item.subtitle}</div>
                        <div className={`mt-1 text-[10px] font-bold uppercase ${
                          item.score >= 90 ? 'text-emerald-600' : item.score >= 80 ? 'text-blue-600' : item.score >= 70 ? 'text-amber-600' : 'text-red-500'
                        }`}>{item.riskLabel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 1 — FLEET KPI BANNER
            ══════════════════════════════════════════════════════════ */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { label: 'Fleet Safety Score', value: `${FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(1)}%`, sub: FLEET_SAFETY_SCORES.fleetSafetyRating, color: 'blue', icon: '🛡️' },
                { label: 'Total Accidents', value: String(COMPUTED_INCIDENT_STATS.totalAccidents), sub: `${COMPUTED_INCIDENT_STATS.preventableCount} preventable`, color: 'red', icon: '⚠️' },
                { label: 'OOS Violations', value: String(totalOosCount), sub: `${hosOosCount} HOS · ${vedrOosCount} VEDR`, color: 'amber', icon: '🚫' },
                { label: 'Open Cases', value: String(totalOpenCount), sub: `${hosOpenCount} HOS · ${vedrOpenCount} VEDR`, color: totalOpenCount > 0 ? 'orange' : 'green', icon: '📋' },
                { label: 'Clean Inspections', value: `${cleanInspectionsRate}%`, sub: `${cleanInspectionsCount} of ${inspectionsData.length}`, color: 'emerald', icon: '✅' },
              ].map(kpi => (
                <div key={kpi.label} className={`bg-white border rounded-2xl p-4 flex flex-col gap-1 ${
                  kpi.color === 'blue' ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white' :
                  kpi.color === 'red' ? 'border-red-200 bg-gradient-to-br from-red-50 to-white' :
                  kpi.color === 'amber' ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white' :
                  kpi.color === 'orange' ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white' :
                  kpi.color === 'green' ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white' :
                  'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
                }`}>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                  <div className={`text-2xl font-black leading-tight ${
                    kpi.color === 'blue' ? 'text-blue-700' : kpi.color === 'red' ? 'text-red-600' :
                    kpi.color === 'amber' ? 'text-amber-600' : kpi.color === 'orange' ? 'text-orange-600' : 'text-emerald-700'
                  }`}>{kpi.value}</div>
                  <div className="text-[11px] text-slate-500 font-medium">{kpi.sub}</div>
                </div>
              ))}
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 2 — INCIDENT BREAKDOWN + DRIVER COMPLIANCE
            ══════════════════════════════════════════════════════════ */}
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Incident Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="text-sm font-bold text-slate-800">Incident Breakdown</div>
                  <div className="text-xs text-slate-500">Last 12 months · {COMPUTED_INCIDENT_STATS.totalAccidents} total accidents · ${COMPUTED_INCIDENT_STATS.totalCost.toLocaleString()} total cost</div>
                </div>
                <div className="p-5 space-y-3">
                  {[
                    { label: 'Preventable', count: COMPUTED_INCIDENT_STATS.preventableCount, total: COMPUTED_INCIDENT_STATS.totalAccidents, color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' },
                    { label: 'Non-Preventable', count: COMPUTED_INCIDENT_STATS.totalAccidents - COMPUTED_INCIDENT_STATS.preventableCount, total: COMPUTED_INCIDENT_STATS.totalAccidents, color: 'bg-slate-400', textColor: 'text-slate-600', bgColor: 'bg-slate-50' },
                    { label: 'Injuries', count: COMPUTED_INCIDENT_STATS.injuries, total: COMPUTED_INCIDENT_STATS.totalAccidents, color: 'bg-amber-500', textColor: 'text-amber-700', bgColor: 'bg-amber-50' },
                    { label: 'Tow-Away', count: incidentTowAway, total: COMPUTED_INCIDENT_STATS.totalAccidents, color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50' },
                    { label: 'Fatalities', count: COMPUTED_INCIDENT_STATS.fatalities, total: COMPUTED_INCIDENT_STATS.totalAccidents, color: 'bg-red-800', textColor: 'text-red-900', bgColor: 'bg-red-50' },
                    { label: 'Hazmat Released', count: incidentHazmat, total: COMPUTED_INCIDENT_STATS.totalAccidents, color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50' },
                  ].map(row => {
                    const pct = row.total > 0 ? (row.count / row.total) * 100 : 0;
                    return (
                      <div key={row.label} className="flex items-center gap-3">
                        <div className="w-28 text-xs font-semibold text-slate-600 flex-shrink-0">{row.label}</div>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: `${Math.max(pct, row.count > 0 ? 5 : 0)}%` }} />
                        </div>
                        <div className={`w-16 text-right text-xs font-bold ${row.textColor}`}>{row.count} <span className="font-normal text-slate-400">({pct.toFixed(0)}%)</span></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Driver Compliance Summary */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="text-sm font-bold text-slate-800">Driver Compliance Summary</div>
                  <div className="text-xs text-slate-500">{DRIVER_SAFETY_SCORES.length} drivers · Fleet avg {FLEET_AVERAGE.toFixed(1)}%</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Ind.</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">HOS</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">VEDR</th>
                        <th className="px-3 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">vs Avg</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {DRIVER_SAFETY_SCORES.sort((a, b) => a.overall - b.overall).map(drv => {
                        const ki = DRIVER_KEY_INDICATORS.find(k => k.driverId === drv.driverId);
                        const hosCount = driverHosCounts[drv.driverId] || 0;
                        const vedrCount = driverVedrCounts[drv.driverId] || 0;
                        const diff = drv.overall - FLEET_AVERAGE;
                        return (
                          <tr key={drv.driverId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-2">
                              <div className="text-xs font-semibold text-slate-800 leading-tight">{drv.name}</div>
                              <div className="text-[10px] text-slate-400">{drv.status}</div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-bold ${getScoreColor(drv.overall)}`}>{drv.overall.toFixed(1)}%</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ki?.status === 'PASS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {ki?.status ?? 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-bold ${hosCount > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{hosCount}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-xs font-bold ${vedrCount > 0 ? 'text-purple-600' : 'text-slate-400'}`}>{vedrCount}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{diff >= 0 ? '+' : ''}{diff.toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 3 — ELD/HOS + VEDR VIOLATION ANALYSIS
            ══════════════════════════════════════════════════════════ */}
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* ELD / HOS Violations by Group */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="text-sm font-bold text-slate-800">ELD / HOS Violations by Group</div>
                  <div className="text-xs text-slate-500">{HOS_VIOLATION_EVENTS.length} total violations · {hosOosCount} OOS · {hosOpenCount} open</div>
                </div>
                <div className="p-5 space-y-3">
                  {Object.entries(hosGroupStats).sort((a, b) => b[1].count - a[1].count).map(([group, stats]) => {
                    const pct = (stats.count / HOS_VIOLATION_EVENTS.length) * 100;
                    return (
                      <div key={group}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700">{group}</span>
                          <div className="flex items-center gap-2">
                            {stats.oos > 0 && <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">{stats.oos} OOS</span>}
                            <span className="text-xs font-bold text-slate-700">{stats.count}</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    {[
                      { label: 'Resolved', count: HOS_VIOLATION_EVENTS.filter(e => e.status === 'Resolved').length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                      { label: 'Open', count: HOS_VIOLATION_EVENTS.filter(e => e.status === 'Open').length, color: 'text-red-700 bg-red-50 border-red-200' },
                      { label: 'Under Review', count: HOS_VIOLATION_EVENTS.filter(e => e.status === 'Under Review').length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    ].map(s => (
                      <div key={s.label} className={`text-center rounded-lg p-2 border ${s.color}`}>
                        <div className="text-lg font-black">{s.count}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* VEDR Violations by Group */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100">
                  <div className="text-sm font-bold text-slate-800">VEDR Violations by Group</div>
                  <div className="text-xs text-slate-500">{VEDR_VIOLATION_EVENTS.length} total violations · {vedrOosCount} OOS · {vedrOpenCount} open</div>
                </div>
                <div className="p-5 space-y-3">
                  {Object.entries(vedrGroupStats).sort((a, b) => b[1].count - a[1].count).map(([group, stats]) => {
                    const pct = (stats.count / VEDR_VIOLATION_EVENTS.length) * 100;
                    return (
                      <div key={group}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700">{group}</span>
                          <div className="flex items-center gap-2">
                            {stats.oos > 0 && <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">{stats.oos} OOS</span>}
                            <span className="text-xs font-bold text-slate-700">{stats.count}</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-4 grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    {[
                      { label: 'Resolved', count: VEDR_VIOLATION_EVENTS.filter(e => e.status === 'Resolved').length, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                      { label: 'Open', count: VEDR_VIOLATION_EVENTS.filter(e => e.status === 'Open').length, color: 'text-red-700 bg-red-50 border-red-200' },
                      { label: 'Under Review', count: VEDR_VIOLATION_EVENTS.filter(e => e.status === 'Under Review').length, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                    ].map(s => (
                      <div key={s.label} className={`text-center rounded-lg p-2 border ${s.color}`}>
                        <div className="text-lg font-black">{s.count}</div>
                        <div className="text-[10px] font-bold uppercase tracking-wide">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
                SECTION 4 — RECENT VIOLATION EVENTS
            ══════════════════════════════════════════════════════════ */}
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-800">Recent Violation Events</div>
                  <div className="text-xs text-slate-500">Latest 10 across ELD/HOS and VEDR — most recent first</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">ELD/HOS</span>
                  <span className="text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded">VEDR</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider w-64">Violation</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severity</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">OOS</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentCombinedEvents.map(evt => (
                      <tr key={evt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{evt.id}</td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{evt.date}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <DriverAvatar name={evt.driverName} />
                            <span className="text-xs font-medium text-slate-800">{evt.driverName}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-slate-600">{evt.vehicleId}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${evt.category === 'ELD/HOS' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                            {evt.category}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700 max-w-[240px] truncate">{evt.description}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-bold ${evt.severity >= 8 ? 'text-red-600' : evt.severity >= 6 ? 'text-amber-600' : 'text-slate-500'}`}>{evt.severity}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {evt.isOos ? <span className="text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded">OOS</span> : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">{getStatusBadge(evt.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ===== DASHBOARD DRIVER DETAIL POPUP ===== */}
        {selectedDashboardDriver && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDashboardDriverId(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[780px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
                <div>
                  <h3 className="text-lg font-bold text-blue-700">{selectedDashboardDriver.name} &ndash; Driver Risk Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Status: {selectedDashboardDriver.status} &bull; ID: {selectedDashboardDriver.id}</p>
                </div>
                <button onClick={() => setSelectedDashboardDriverId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-blue-600">Driver Scores</h4>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    dashDrvSafetyLevel === 'Satisfactory' ? 'bg-emerald-100 text-emerald-700' :
                    dashDrvSafetyLevel === 'Acceptable' ? 'bg-blue-100 text-blue-700' :
                    dashDrvSafetyLevel === 'Conditional' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Safety Level: {dashDrvSafetyLevel}
                  </span>
                </div>
                {/* Row 1: 7 score rings + Key Indicator */}
                <div className="grid grid-cols-8 gap-2 mb-3">
                  {[
                    { label: 'Safety', score: dashDrvSafetyScore },
                    { label: 'Accident', score: dashDrvAccidentScore },
                    { label: 'ELD', score: dashDrvEldScore },
                    { label: 'Camera', score: dashDrvVedrScore },
                    { label: 'Inspection', score: dashDrvInspectionScore },
                    { label: 'Violation', score: dashDrvViolationScore },
                    { label: 'Training', score: dashDrvTrainingScore },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                      <MiniRiskRing score={item.score} palette="auto" />
                      <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">{item.label}</div>
                      <div className={`text-[10px] font-bold ${getScoreColor(item.score)}`}>{item.score.toFixed(0)}%</div>
                    </div>
                  ))}
                  <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
                    <Shield size={26} className="text-emerald-500 mb-1" />
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">Key Ind.</div>
                    <div className="text-[10px] font-bold text-emerald-600">PASS</div>
                  </div>
                </div>
                {/* Row 2: Key Indicator Events */}
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Indicator Events — This Month</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Status: PASS</span>
                  </div>
                  <div className="grid grid-cols-8 gap-2">
                    {[
                      { label: 'Cell Phone', count: 0 },
                      { label: 'Speeding', count: 0 },
                      { label: 'Following Dist.', count: 0 },
                      { label: 'Seat Belt', count: 0 },
                      { label: 'Camera Block', count: 0 },
                    ].map(item => (
                      <div key={item.label} className="flex flex-col items-center bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
                        <div className="text-lg font-black text-emerald-700 leading-tight">{item.count}</div>
                        <div className="text-[9px] font-semibold text-slate-500 text-center leading-tight mt-0.5">{item.label}</div>
                        <div className="text-[9px] font-bold text-emerald-600 uppercase">PASS</div>
                      </div>
                    ))}
                    {[0, 1, 2].map(i => (
                      <div key={`dashev-empty-${i}`} className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 opacity-40" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== DASHBOARD ASSET DETAIL POPUP ===== */}
        {selectedDashboardAsset && dashboardAssetScores && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDashboardAssetId(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[700px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-xl z-10">
                <div>
                  <h3 className="text-lg font-bold text-blue-700">{selectedDashboardAsset.unitNumber} &ndash; Asset Risk Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedDashboardAsset.year} {selectedDashboardAsset.make} {selectedDashboardAsset.model} &bull; Status: {selectedDashboardAsset.operationalStatus}</p>
                </div>
                <button onClick={() => setSelectedDashboardAssetId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <X size={18} className="text-slate-500" />
                </button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-base font-bold text-blue-600">Asset Risk Scores</h4>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      dashboardAssetScores.overall >= 90 ? 'bg-emerald-100 text-emerald-700' :
                      dashboardAssetScores.overall >= 80 ? 'bg-blue-100 text-blue-700' :
                      dashboardAssetScores.overall >= 70 ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {getRiskMeta(dashboardAssetScores.overall).label}
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: 'Overall', score: dashboardAssetScores.overall },
                      { label: 'Status', score: dashboardAssetScores.statusScore },
                      { label: 'Age', score: dashboardAssetScores.ageScore },
                      { label: 'Mileage', score: dashboardAssetScores.mileageScore },
                      { label: 'Registration', score: dashboardAssetScores.regScore },
                    ].map(item => (
                      <div key={item.label} className="flex flex-col items-center bg-slate-50 rounded-lg p-2 border border-slate-100">
                        <MiniRiskRing score={item.score} palette="auto" />
                        <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">{item.label}</div>
                        <div className={`text-[10px] font-bold ${getScoreColor(item.score)}`}>{item.score.toFixed(0)}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-x-5 gap-y-3">
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit Number</div><div className="text-sm font-semibold text-slate-800">{selectedDashboardAsset.unitNumber}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Make / Model</div><div className="text-sm text-slate-700">{selectedDashboardAsset.make} {selectedDashboardAsset.model}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Year</div><div className="text-sm text-slate-700">{selectedDashboardAsset.year}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div><div className="text-sm text-slate-700">{selectedDashboardAsset.operationalStatus}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Odometer</div><div className="text-sm text-slate-700">{(selectedDashboardAsset.odometer ?? 0).toLocaleString()} {selectedDashboardAsset.odometerUnit}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reg. Expiry</div><div className="text-sm text-slate-700">{selectedDashboardAsset.registrationExpiryDate || 'N/A'}</div></div>
                  {selectedDashboardAsset.vin && <div className="col-span-3"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">VIN</div><div className="text-sm font-mono text-slate-700">{selectedDashboardAsset.vin}</div></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== OVERVIEW TAB ===== */}
        {pageTab === 'overview' && <>

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

                {/* Violations Summary */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Monitored Violation Categories</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                      <div className="text-[11px] text-blue-500 font-bold uppercase tracking-wider mb-1">ELD Monitored</div>
                      <div className="text-xs text-blue-700 font-semibold mb-2">Hours of Service</div>
                      <div className="text-3xl font-bold text-blue-700">{HOS_VIOLATIONS.length}</div>
                      <div className="text-[11px] text-blue-500 mt-1">violation codes</div>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded border border-blue-200">HOS</span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold rounded border border-blue-200">Logbook</span>
                      </div>
                    </div>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-center">
                      <div className="text-[11px] text-violet-500 font-bold uppercase tracking-wider mb-1">VEDR Monitored</div>
                      <div className="text-xs text-violet-700 font-semibold mb-2">Driver Fitness</div>
                      <div className="text-3xl font-bold text-violet-700">{DRIVER_FITNESS_VIOLATIONS.length}</div>
                      <div className="text-[11px] text-violet-500 mt-1">violation codes</div>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded border border-violet-200">DQ</span>
                        <span className="px-1.5 py-0.5 bg-violet-100 text-violet-600 text-[10px] font-bold rounded border border-violet-200">Fitness</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                      <div className="text-[11px] text-amber-500 font-bold uppercase tracking-wider mb-1">VEDR Monitored</div>
                      <div className="text-xs text-amber-700 font-semibold mb-2">Unsafe Driving</div>
                      <div className="text-3xl font-bold text-amber-700">{UNSAFE_DRIVING_VIOLATIONS.length}</div>
                      <div className="text-[11px] text-amber-500 mt-1">violation codes</div>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded border border-amber-200">Speeding</span>
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded border border-amber-200">Reckless</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- INCIDENTS TAB --- */}
            {activeTab === 'incidents' && (
              <div>
                {/* Incident Overview Banner */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Preventable Accidents — Last 12 Months</div>
                      <div className="text-3xl font-bold text-blue-700">{COMPUTED_INCIDENT_STATS.preventableCount}</div>
                      <div className="text-[11px] text-blue-400 mt-0.5">of {COMPUTED_INCIDENT_STATS.totalAccidents} total accidents</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Active Power Units</div>
                      <div className="text-3xl font-bold text-violet-700">{COMPUTED_INCIDENT_STATS.activePowerUnits}</div>
                      <div className="text-[11px] text-violet-400 mt-0.5">units in service</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Preventable Accident Rate</div>
                      <div className="text-3xl font-bold text-slate-800">{COMPUTED_INCIDENT_STATS.preventableRate}%</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">fleet-wide this period</div>
                    </div>
                  </div>

                  <p className="text-center text-sm text-slate-600 italic flex items-center justify-center gap-1.5 mb-2">
                    <Shield size={14} className="text-emerald-500" />
                    Your accident score reflects that your fleet had more accidents than permissible for the number of active trucks you have.
                  </p>
                  <p className="text-center text-sm text-slate-500 leading-relaxed">
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredIncidents.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-sm">No incidents found</td>
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
                          <tr key={inc.incidentId} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedIncidentId(inc.incidentId)}>
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
                {/* Driver Summary Banner */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Driver Safety Score</div>
                      <div className="text-3xl font-bold text-blue-700">{FLEET_SAFETY_SCORES.driverScore.toFixed(2)}%</div>
                      <div className="text-[11px] text-blue-400 mt-0.5">fleet-wide score</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Number of Active Drivers</div>
                      <div className="text-3xl font-bold text-violet-700">{NUM_ACTIVE_DRIVERS}</div>
                      <div className="text-[11px] text-violet-400 mt-0.5">currently active</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Drivers Below Fleet Average</div>
                      <div className="text-3xl font-bold text-slate-800">{LOWEST_DRIVERS.length}<span className="text-lg text-slate-400">/{LOWEST_DRIVERS.length + HIGHEST_DRIVERS.length}</span></div>
                      <div className="text-[11px] text-slate-400 mt-0.5">focus group this month</div>
                    </div>
                  </div>

                  <p className="text-center text-sm text-slate-600 italic flex items-center justify-center gap-1.5 mb-2">
                    <Shield size={14} className="text-emerald-500" />
                    The report below shows the bottom 50% of your fleet's active drivers. Use this list to focus attention and training towards these drivers to improve.
                  </p>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    The driver safety score factors in multiple sub-scores, as outlined below. Based on the percentages below, a driver may be able to show quick improvement in a few areas.
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>To raise the inspection score, the driver can request additional roadside inspections. If the inspections come back clean, the inspection score will rise.</li>
                      <li>To raise the training score, the driver can complete their required training by any assigned due dates. On time training can raise the training score.</li>
                      <li>As a reminder, ELD and VEDR scores for drivers reset on the first day of each month.</li>
                    </ul>
                  </div>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(driverSubTab === 'lowest' ? LOWEST_DRIVERS : HIGHEST_DRIVERS).map(drv => (
                        <tr key={drv.driverId} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedDriverId(drv.driverId)}>
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
                        <button onClick={() => setSelectedDriverId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                          <X size={18} className="text-slate-500" />
                        </button>
                      </div>
                    </div>

                    <div className="px-6 py-5 space-y-6">

                      {/* ── DRIVER SCORES — 8×2 chart grid ── */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-bold text-blue-600">Driver Scores</h4>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            drvPopupSafetyLevel === 'Satisfactory' ? 'bg-emerald-100 text-emerald-700' :
                            drvPopupSafetyLevel === 'Acceptable' ? 'bg-blue-100 text-blue-700' :
                            drvPopupSafetyLevel === 'Conditional' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            Safety Level: {drvPopupSafetyLevel}
                          </span>
                        </div>
                        {/* Row 1: 7 score ring charts + Key Indicator status */}
                        <div className="grid grid-cols-8 gap-2">
                          {[
                            { label: 'Safety', score: drvPopupSafetyScore },
                            { label: 'Accident', score: drvPopupAccidentScore },
                            { label: 'ELD', score: drvPopupEldScore },
                            { label: 'Camera', score: drvPopupVedrScore },
                            { label: 'Inspection', score: drvPopupInspectionScore },
                            { label: 'Violation', score: drvPopupViolationScore },
                            { label: 'Training', score: drvPopupTrainingScore },
                          ].map(item => (
                            <div key={item.label} className="flex flex-col items-center bg-slate-50 rounded-lg p-1.5 border border-slate-100">
                              <MiniRiskRing score={item.score} palette="auto" />
                              <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">{item.label}</div>
                              <div className={`text-[10px] font-bold ${getScoreColor(item.score)}`}>{item.score.toFixed(0)}%</div>
                            </div>
                          ))}
                          <div className="flex flex-col items-center justify-center bg-emerald-50 rounded-lg p-1.5 border border-emerald-200">
                            <Shield size={26} className="text-emerald-500 mb-1" />
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">Key Ind.</div>
                            <div className="text-[10px] font-bold text-emerald-600">PASS</div>
                          </div>
                        </div>
                        {/* Row 2: Key Indicator Events */}
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Key Indicator Events — This Month</span>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Status: PASS</span>
                          </div>
                          <div className="grid grid-cols-8 gap-2">
                            {[
                              { label: 'Cell Phone', count: 0 },
                              { label: 'Speeding', count: 0 },
                              { label: 'Following Dist.', count: 0 },
                              { label: 'Seat Belt', count: 0 },
                              { label: 'Camera Block', count: 0 },
                            ].map(item => (
                              <div key={item.label} className="flex flex-col items-center bg-emerald-50 rounded-lg p-1.5 border border-emerald-100">
                                <div className="text-lg font-black text-emerald-700 leading-tight">{item.count}</div>
                                <div className="text-[9px] font-semibold text-slate-500 text-center leading-tight mt-0.5">{item.label}</div>
                                <div className="text-[9px] font-bold text-emerald-600 uppercase">PASS</div>
                              </div>
                            ))}
                            {[0, 1, 2].map(i => (
                              <div key={`ev-empty-${i}`} className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 opacity-40" />
                            ))}
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
                {/* Stats Banner */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Valid ELD Events — Last 12 Months</div>
                      <div className="text-3xl font-bold text-blue-700">{validEldCount}</div>
                      <div className="text-[11px] text-blue-400 mt-0.5">HOS violations recorded</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Valid VEDR Events — Last 12 Months</div>
                      <div className="text-3xl font-bold text-violet-700">{validVedrCount}</div>
                      <div className="text-[11px] text-violet-400 mt-0.5">VEDR violations recorded</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Ratio of Drivers with Valid Events</div>
                      <div className="text-3xl font-bold text-slate-800">{driversWithValidEvents}<span className="text-lg text-slate-400">/{NUM_ACTIVE_DRIVERS}</span></div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{((driversWithValidEvents / NUM_ACTIVE_DRIVERS) * 100).toFixed(0)}% of active drivers</div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-slate-600 italic flex items-center justify-center gap-1.5">
                    <Shield size={14} className="text-emerald-500" />
                    {validEldCount + validVedrCount <= 15
                      ? 'Your ELD and VEDR scores look acceptable right now. You can review any event records below.'
                      : 'Your ELD and VEDR events require attention. Please review all records below and take action.'}
                  </p>
                </div>

                {/* Sub-tab toggle */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    {(['ELD', 'VEDR'] as const).map(tab => (
                      <button key={tab} onClick={() => setEldVedrSubTab(tab)}
                        className={`px-6 py-2 text-sm font-semibold transition-colors ${eldVedrSubTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-white'}`}>
                        {tab}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {eldVedrSubTab === 'ELD' ? `${filteredEld.length} of ${HOS_VIOLATION_EVENTS.length} HOS violations` : `${filteredVedrViolations.length} violations · ${filteredSafetyEvents.length} telematics events`}
                  </span>
                </div>

                {/* ── ELD TAB ── */}
                {eldVedrSubTab === 'ELD' && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">ELD</span>
                      <h3 className="text-sm font-bold text-slate-900">Hours of Service Violations</h3>
                    </div>

                    {/* ELD Filters */}
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" placeholder="Search driver, code, vehicle..." value={eldSearch} onChange={e => setEldSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56" />
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium"><Filter size={11} />Filter:</div>
                      <select value={eldStatusFilter} onChange={e => setEldStatusFilter(e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {['All', 'Open', 'Resolved', 'Reviewed', 'Under Review'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      <select value={eldOosFilter} onChange={e => setEldOosFilter(e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {['All', 'OOS Only', 'No OOS'].map(s => <option key={s}>{s}</option>)}
                      </select>
                      <select value={eldGroupFilter} onChange={e => setEldGroupFilter(e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        {ELD_GROUPS.map(g => <option key={g}>{g}</option>)}
                      </select>
                      {(eldSearch || eldStatusFilter !== 'All' || eldOosFilter !== 'All' || eldGroupFilter !== 'All') && (
                        <button onClick={() => { setEldSearch(''); setEldStatusFilter('All'); setEldOosFilter('All'); setEldGroupFilter('All'); }}
                          className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1">
                          <X size={10} />Clear
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">CFR Code</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Violation</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Group</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">OOS</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Sev.</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredEld.length === 0 ? (
                            <tr><td colSpan={11} className="px-4 py-8 text-center text-slate-400 text-sm">No violations match your filters</td></tr>
                          ) : filteredEld.map(evt => (
                            <tr key={evt.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setSelectedHosEvent(evt)}>
                              <td className="px-4 py-2.5 text-xs font-bold text-blue-600 font-mono">{evt.id}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap">{evt.date}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <DriverAvatar name={evt.driverName} />
                                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{evt.driverName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{evt.vehicleId}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">{evt.violationCode}</span>
                              </td>
                              <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[220px] truncate">{evt.violationDescription}</td>
                              <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{evt.violationGroup}</td>
                              <td className="px-4 py-2.5 text-center">
                                {evt.isOos ? <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">OOS</span> : <span className="text-slate-300 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${evt.driverSeverity >= 7 ? 'bg-red-50 text-red-600 border-red-100' : evt.driverSeverity >= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{evt.driverSeverity}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center">{getStatusBadge(evt.status)}</td>
                              <td className="px-4 py-2.5 text-center">
                                <button onClick={e => { e.stopPropagation(); setSelectedHosEvent(evt); }} className="p-1.5 rounded-lg hover:bg-blue-100 transition-colors text-blue-500 hover:text-blue-700">
                                  <Eye size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── VEDR TAB ── */}
                {eldVedrSubTab === 'VEDR' && (
                  <div className="space-y-8">

                    {/* LIST 1 — Violations */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded uppercase tracking-wider">VEDR</span>
                        <h3 className="text-sm font-bold text-slate-900">Violations</h3>
                      </div>

                      {/* VEDR Violation Filters */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" placeholder="Search driver, code, vehicle..." value={vedrSearch} onChange={e => setVedrSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 w-56" />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium"><Filter size={11} />Filter:</div>
                        <select value={vedrCategoryFilter} onChange={e => setVedrCategoryFilter(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                          {['All', 'Driver Fitness', 'Unsafe Driving'].map(s => <option key={s}>{s}</option>)}
                        </select>
                        <select value={vedrStatusFilter} onChange={e => setVedrStatusFilter(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                          {['All', 'Open', 'Resolved', 'Reviewed', 'Under Review'].map(s => <option key={s}>{s}</option>)}
                        </select>
                        <select value={vedrOosFilter} onChange={e => setVedrOosFilter(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white">
                          {['All', 'OOS Only', 'No OOS'].map(s => <option key={s}>{s}</option>)}
                        </select>
                        {(vedrSearch || vedrCategoryFilter !== 'All' || vedrStatusFilter !== 'All' || vedrOosFilter !== 'All') && (
                          <button onClick={() => { setVedrSearch(''); setVedrCategoryFilter('All'); setVedrStatusFilter('All'); setVedrOosFilter('All'); }}
                            className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1">
                            <X size={10} />Clear
                          </button>
                        )}
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">CFR Code</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Violation</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tags</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">OOS</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Sev.</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredVedrViolations.length === 0 ? (
                              <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400 text-sm">No violations match your filters</td></tr>
                            ) : filteredVedrViolations.map(evt => (
                              <tr key={evt.id} className="hover:bg-violet-50/30 transition-colors cursor-pointer" onClick={() => setSelectedVedrViolation(evt)}>
                                <td className="px-4 py-2.5 text-xs font-bold text-violet-600 font-mono">{evt.id}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap">{evt.date}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <DriverAvatar name={evt.driverName} />
                                    <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{evt.driverName}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{evt.vehicleId}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border whitespace-nowrap ${evt.category === 'Driver Fitness' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                    {evt.category}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="font-mono text-xs font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-100 whitespace-nowrap">{evt.violationCode}</span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-700 max-w-[200px] truncate">{evt.violationDescription}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex flex-wrap gap-1">
                                    {evt.telematicsTags.length > 0 ? evt.telematicsTags.map(tag => (
                                      <span key={tag} className={`px-1 py-0.5 text-[9px] font-bold rounded border whitespace-nowrap ${EVENT_TYPE_COLOR[tag] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{tag.replace(/_/g, ' ')}</span>
                                    )) : <span className="text-slate-300 text-xs">—</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  {evt.isOos ? <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100">OOS</span> : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${evt.driverSeverity >= 7 ? 'bg-red-50 text-red-600 border-red-100' : evt.driverSeverity >= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>{evt.driverSeverity}</span>
                                </td>
                                <td className="px-4 py-2.5 text-center">{getStatusBadge(evt.status)}</td>
                                <td className="px-4 py-2.5 text-center">
                                  <button onClick={e => { e.stopPropagation(); setSelectedVedrViolation(evt); }} className="p-1.5 rounded-lg hover:bg-violet-100 transition-colors text-violet-500 hover:text-violet-700">
                                    <Eye size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* LIST 2 — Telematics Safety Events */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase tracking-wider">Telematics</span>
                        <h3 className="text-sm font-bold text-slate-900">Safety Events</h3>
                      </div>

                      {/* Safety Event Filters */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="text" placeholder="Search driver or plate..." value={vedrEventSearch} onChange={e => setVedrEventSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48" />
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium"><Filter size={11} />Filter:</div>
                        <select value={vedrEventTypeFilter} onChange={e => setVedrEventTypeFilter(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                          {ALL_EVENT_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : (EVENT_TYPE_LABEL[t] ?? t)}</option>)}
                        </select>
                        <select value={vedrEventSeverityFilter} onChange={e => setVedrEventSeverityFilter(e.target.value)}
                          className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                          {['All', 'critical', 'high', 'medium'].map(s => <option key={s} value={s}>{s === 'All' ? 'All Severity' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                        {(vedrEventSearch || vedrEventTypeFilter !== 'All' || vedrEventSeverityFilter !== 'All') && (
                          <button onClick={() => { setVedrEventSearch(''); setVedrEventTypeFilter('All'); setVedrEventSeverityFilter('All'); }}
                            className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg flex items-center gap-1">
                            <X size={10} />Clear
                          </button>
                        )}
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event Type</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Plate</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Road</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Severity</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Provider</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Related Violations</th>
                              <th className="px-4 py-2.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">View</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredSafetyEvents.length === 0 ? (
                              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">No events match your filters</td></tr>
                            ) : filteredSafetyEvents.map((evt: Record<string, unknown>) => {
                              const evtType = evt.type as string;
                              const colorCls = EVENT_TYPE_COLOR[evtType] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                              const evtDate = evt.startedAt as string;
                              const tags = EVENT_TYPE_TO_TAGS[evtType] ?? [];
                              const relatedViolations = tags.flatMap(tag => TAG_TO_VIOLATIONS[tag] ?? []).slice(0, 2);
                              return (
                                <tr key={evt.id as string} className="hover:bg-indigo-50/20 transition-colors cursor-pointer" onClick={() => setSelectedSafetyEvent(evt)}>
                                  <td className="px-4 py-2.5 text-xs text-slate-700 whitespace-nowrap">{new Date(evtDate).toLocaleDateString()}</td>
                                  <td className="px-4 py-2.5">
                                    <span className={`px-1.5 py-0.5 rounded border text-[11px] font-bold whitespace-nowrap ${colorCls}`}>
                                      {EVENT_TYPE_LABEL[evtType] ?? evtType}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs font-medium text-slate-700 whitespace-nowrap">{evt.driverName as string}</td>
                                  <td className="px-4 py-2.5 text-xs font-mono font-bold text-slate-600">{evt.vehiclePlate as string}</td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[120px] truncate">{(evt.extensions as Record<string, Record<string, string>>)?.here?.roadName}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    {(evt.severity as string) === 'critical'
                                      ? <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100 uppercase">Critical</span>
                                      : (evt.severity as string) === 'high'
                                        ? <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded border border-amber-100 uppercase">High</span>
                                        : <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 text-[10px] font-bold rounded border border-yellow-100 uppercase">Medium</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{evt.provider as string}</td>
                                  <td className="px-4 py-2.5">
                                    {relatedViolations.length > 0 ? (
                                      <div className="flex flex-col gap-0.5">
                                        {relatedViolations.map((v, i) => (
                                          <span key={i} className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 whitespace-nowrap" title={v.desc}>{v.code}</span>
                                        ))}
                                      </div>
                                    ) : <span className="text-slate-300 text-xs">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button onClick={e => { e.stopPropagation(); setSelectedSafetyEvent(evt); }} className="p-1.5 rounded-lg hover:bg-indigo-100 transition-colors text-indigo-500 hover:text-indigo-700">
                                      <Eye size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── HOS Violation Detail Modal ── */}
                {selectedHosEvent && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedHosEvent(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[580px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">ELD</span>
                          <h3 className="text-base font-bold text-slate-900">HOS Violation — {selectedHosEvent.id}</h3>
                        </div>
                        <button onClick={() => setSelectedHosEvent(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X size={16} className="text-slate-500" /></button>
                      </div>
                      <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</div><div className="text-sm font-semibold text-slate-800">{selectedHosEvent.date}</div></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</div>
                            <div className="flex items-center gap-2"><DriverAvatar name={selectedHosEvent.driverName} /><span className="text-sm font-semibold text-slate-800">{selectedHosEvent.driverName}</span></div>
                          </div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</div><span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedHosEvent.vehicleId}</span></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CFR Code</div><span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{selectedHosEvent.violationCode}</span></div>
                          <div className="col-span-2"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Violation Description</div><div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{selectedHosEvent.violationDescription}</div></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Violation Group</div><div className="text-sm text-slate-700">{selectedHosEvent.violationGroup}</div></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>{getStatusBadge(selectedHosEvent.status)}</div>
                        </div>
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Out of Service</div>
                            {selectedHosEvent.isOos ? <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100">YES — OOS</span> : <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded border border-emerald-100">No</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Severity</div>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${selectedHosEvent.driverSeverity >= 7 ? 'bg-red-50 text-red-600 border-red-100' : selectedHosEvent.driverSeverity >= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              {selectedHosEvent.driverSeverity} / 10
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Severity %</div>
                            <span className="text-sm font-bold text-slate-700">{(selectedHosEvent.driverSeverity / 10 * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                        <button onClick={() => setSelectedHosEvent(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">Close</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── VEDR Violation Detail Modal ── */}
                {selectedVedrViolation && (
                  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedVedrViolation(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-[600px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] font-bold rounded uppercase">VEDR</span>
                          <h3 className="text-base font-bold text-slate-900">Violation — {selectedVedrViolation.id}</h3>
                        </div>
                        <button onClick={() => setSelectedVedrViolation(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X size={16} className="text-slate-500" /></button>
                      </div>
                      <div className="px-6 py-5 space-y-4">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date</div><div className="text-sm font-semibold text-slate-800">{selectedVedrViolation.date}</div></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</div>
                            <div className="flex items-center gap-2"><DriverAvatar name={selectedVedrViolation.driverName} /><span className="text-sm font-semibold text-slate-800">{selectedVedrViolation.driverName}</span></div>
                          </div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle</div><span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedVedrViolation.vehicleId}</span></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</div>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${selectedVedrViolation.category === 'Driver Fitness' ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{selectedVedrViolation.category}</span>
                          </div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CFR Code</div><span className="font-mono text-sm font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100">{selectedVedrViolation.violationCode}</span></div>
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Group</div><div className="text-sm text-slate-700">{selectedVedrViolation.violationGroup}</div></div>
                          <div className="col-span-2"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Violation Description</div><div className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">{selectedVedrViolation.violationDescription}</div></div>
                          {selectedVedrViolation.telematicsTags.length > 0 && (
                            <div className="col-span-2"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Telematics Tags</div>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedVedrViolation.telematicsTags.map(tag => (
                                  <span key={tag} className={`px-1.5 py-0.5 text-xs font-bold rounded border ${EVENT_TYPE_COLOR[tag] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>{tag.replace(/_/g, ' ')}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>{getStatusBadge(selectedVedrViolation.status)}</div>
                        </div>
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Out of Service</div>
                            {selectedVedrViolation.isOos ? <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100">YES — OOS</span> : <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded border border-emerald-100">No</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Driver Severity</div>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${selectedVedrViolation.driverSeverity >= 7 ? 'bg-red-50 text-red-600 border-red-100' : selectedVedrViolation.driverSeverity >= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                              {selectedVedrViolation.driverSeverity} / 10 &nbsp;({(selectedVedrViolation.driverSeverity / 10 * 100).toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                        <button onClick={() => setSelectedVedrViolation(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">Close</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Safety Event Detail Modal ── */}
                {selectedSafetyEvent && (() => {
                  const evtType = selectedSafetyEvent.type as string;
                  const colorCls = EVENT_TYPE_COLOR[evtType] ?? 'bg-slate-50 text-slate-600 border-slate-200';
                  const tags = EVENT_TYPE_TO_TAGS[evtType] ?? [];
                  const relatedViolations = tags.flatMap(tag => TAG_TO_VIOLATIONS[tag] ?? []).slice(0, 3);
                  const evtDate = selectedSafetyEvent.startedAt as string;
                  const sevStr = selectedSafetyEvent.severity as string;
                  return (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedSafetyEvent(null)}>
                      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[580px]" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">Telematics</span>
                            <span className={`px-2 py-0.5 rounded border text-xs font-bold ${colorCls}`}>{EVENT_TYPE_LABEL[evtType] ?? evtType}</span>
                            <h3 className="text-base font-bold text-slate-900">Safety Event</h3>
                          </div>
                          <button onClick={() => setSelectedSafetyEvent(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X size={16} className="text-slate-500" /></button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Date / Time</div><div className="text-sm font-semibold text-slate-800">{new Date(evtDate).toLocaleString()}</div></div>
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</div>
                              <div className="flex items-center gap-2"><DriverAvatar name={selectedSafetyEvent.driverName as string} /><span className="text-sm font-semibold text-slate-800">{selectedSafetyEvent.driverName as string}</span></div>
                            </div>
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle Plate</div><span className="text-sm font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{selectedSafetyEvent.vehiclePlate as string}</span></div>
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Provider</div><div className="text-sm text-slate-700 capitalize">{selectedSafetyEvent.provider as string}</div></div>
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Road</div><div className="text-sm text-slate-700">{(selectedSafetyEvent.extensions as Record<string, Record<string, string>>)?.here?.roadName ?? '—'}</div></div>
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity</div>
                              {sevStr === 'critical' ? <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded border border-red-100 uppercase">Critical</span>
                                : sevStr === 'high' ? <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-bold rounded border border-amber-100 uppercase">High</span>
                                : <span className="px-2 py-0.5 bg-yellow-50 text-yellow-600 text-xs font-bold rounded border border-yellow-100 uppercase">Medium</span>}
                            </div>
                            <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity %</div>
                              <div className="text-sm font-bold text-slate-700">{sevStr === 'critical' ? '100%' : sevStr === 'high' ? '66%' : '33%'}</div>
                            </div>
                          </div>
                          {relatedViolations.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Related CFR Violations</div>
                              <div className="space-y-1.5">
                                {relatedViolations.map((v, i) => (
                                  <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                    <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap">{v.code}</span>
                                    <span className="text-xs text-slate-600">{v.desc}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                          <button onClick={() => setSelectedSafetyEvent(null)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors">Close</button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* --- INSPECTIONS TAB --- */}
            {activeTab === 'inspections' && (
              <div>
                {/* Inspection Overview Stats */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Inspection Overview &mdash; Last 2 Years</h3>
                </div>

                {/* Jurisdiction filter toggle */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                    {(['All', 'SMS', 'CVOR'] as const).map(jur => (
                      <button
                        key={jur}
                        onClick={() => setInspectionJurFilter(jur)}
                        className={`px-5 py-2 text-sm font-semibold transition-colors ${
                          inspectionJurFilter === jur
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-white'
                        }`}
                      >
                        {jur}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {filteredInspections.length} {inspectionJurFilter === 'All' ? 'total' : inspectionJurFilter} inspections
                  </span>
                </div>

                {(() => { const filtered = filteredInspections; return (
                    <>
                <div className="mb-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border border-blue-100 rounded-xl p-5">
                  <div className="flex items-center justify-center gap-8 mb-4">
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Clean Inspections</div>
                      <div className="text-3xl font-bold text-blue-700">{filtered.filter(i => i.isClean).length}</div>
                      <div className="text-[11px] text-blue-400 mt-0.5">passed without violations</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Inspections with Violations</div>
                      <div className="text-3xl font-bold text-violet-700">{filtered.filter(i => !i.isClean).length}</div>
                      <div className="text-[11px] text-violet-400 mt-0.5">requiring follow-up</div>
                    </div>
                    <div className="w-px h-14 bg-blue-200" />
                    <div className="text-center">
                      <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Inspections</div>
                      <div className="text-3xl font-bold text-slate-800">{filtered.length}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">records in view</div>
                    </div>
                  </div>
                  <p className="text-center text-sm text-slate-600 italic flex items-center justify-center gap-1.5">
                    <Shield size={14} className="text-emerald-500" />
                    Your inspection scores look acceptable right now. You can review any inspection records below.
                  </p>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map(ins => (
                        <tr key={ins.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedInspectionId(ins.id)}>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Info */}
                <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
                  <span>Showing <strong>1</strong> to <strong>{filtered.length}</strong> of <strong>{filtered.length}</strong> results</span>
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
                </>
                  );
                })()}
              </div>
            )}

          </div>
        </div>

        </>}

      </div>
    </div>
  );
}
