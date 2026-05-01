import { useState, useMemo, useEffect, Fragment, type ReactNode } from 'react';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Truck,
  FileText,
  Ticket,
  Receipt,
  Scale,
  Upload,
  Plus,
  User,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  Pencil,
  Gauge,
  Info,
  X,
  Building2,
  MapPin
} from 'lucide-react';
import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode, cvorPeriodicReports } from './inspectionsData';
import { cvorInterventionEvents, cvorTravelKm, CVOR_INTERVENTION_PERIOD, type CvorInterventionEvent } from './cvorInterventionEvents.data';
import { NscPerformanceCard, type NscPerformanceCardProps } from './NscPerformanceCard';
import { InspectionReportPanel } from './InspectionReportPanel';
import { NscBcCarrierProfile, INERTIA_CARRIER_BC_DATA } from './NscBcCarrierProfile';
import {
  NscBcPerformanceHistory,
  AnalysisRow,
  BcMonthHistoryTable,
  BcActiveFleetTable as BcActiveFleetRealTable,
  DriverContraventionsList,
  CarrierContraventionsList,
  PendingDriverContraventionsList,
  PendingCarrierContraventionsList,
  CvsaInspectionSummaries,
  CvsaInspectionDetailsList,
  AccidentSummaryTable,
  AccidentDetailsList,
  CvipInspectionList,
} from './NscBcPerformanceHistory';
import {
  NscAbPerformanceHistory,
  AbAnalysisRow,
  AbConvSub,
  AbConvictionAnalysisTable,
  AbConvictionSummaryList,
  AbConvictionDetailsList,
  AbCvsaInspectionAnalysisTable,
  AbCvsaInspectionSummaryList,
  AbCvsaInspectionDetailsList,
  AbCollisionInformationPanel,
  AbCollisionSummaryList,
  AbCollisionDetailsList,
  AbViolationInformationPanel,
  AbViolationSummaryList,
  AbViolationDetailsList,
  AbMonitoringInformationPanel,
  AbMonitoringSummaryList,
  AbMonitoringDetailsList,
  AbFacilityLicenceInformationPanel,
  AbFacilityLicenceDetailsList,
  AbSafetyFitnessInformationPanel,
  AbSafetyFitnessSummaryList,
  AbHistoricalSummaryPanel,
  AbHistoricalEventsList,
} from './NscAbPerformanceHistory';
import { NscMonitoringHistory } from './NscMonitoringHistory';
import { NscPeiPerformanceCard } from './NscPeiPerformanceCard';
import { NscGenericPerformanceBlock } from './NscGenericPerformanceBlock';
import { NscPeiPerformanceHistory } from './NscPeiPerformanceHistory';
import { NscNsPerformanceBlock } from './NscNsPerformanceBlock';
import { NscNsPerformanceHistory } from './NscNsPerformanceHistory';
import { NscNsPerformanceCard } from './NscNsPerformanceCard';
import {
  InspectionKindSelector,
  ReportUploadDropzone,
  FmcsaApiFetchBlock,
  FmcsaInspectionForm,
  CvorInspectionForm,
  AbNscInspectionForm,
  BcNscInspectionForm,
  PeiNscInspectionForm,
  NsNscInspectionForm,
  EMPTY_FMCSA,
  EMPTY_CVOR,
  EMPTY_AB,
  EMPTY_BC,
  EMPTY_PEI,
  EMPTY_NS,
  type InspectionKind,
  type UploadedReportFile,
  type FmcsaFormData,
  type CvorFormData,
  type AbNscFormData,
  type BcNscFormData,
  type PeiNscFormData,
  type NsNscFormData,
} from './AddInspectionForms';
import { ScoreBandHoverCard } from './ScoreBandHoverCard';
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

const ALBERTA_NSC_PERFORMANCE_CARD: NscPerformanceCardProps = {
  carrierName: 'VM Motors Inc.',
  profileDate: '2026 FEB 23',
  rFactor: 0.062,
  monitoringStage: 'Not Monitored',
  fleetRange: '30.0-44.9',
  fleetType: 'Truck',
  stageThresholds: [
    { stage: 1, low: 0.42, high: 0.617 },
    { stage: 2, low: 0.618, high: 0.849 },
    { stage: 3, low: 0.85, high: 1.104 },
    { stage: 4, low: 1.105, high: null },
  ],
  statusMessage: 'Not on NSC monitoring - performance is within acceptable range for fleet 30.0-44.9',
  contributions: {
    convictions: { pct: 34.6, events: 5 },
    adminPenalties: { pct: 0.0, events: 0 },
    cvsaInspections: { pct: 32.3, events: 43 },
    reportableCollisions: { pct: 33.1, events: 6 },
  },
  carrierInfo: {
    nscNumber: 'AB257-4556',
    mvidNumber: '0895-41544',
    operatingStatus: 'Federal',
    certNumber: '002449387',
    certEffective: '2026 JAN 07',
    certExpiry: '2028 DEC 31',
    safetyRating: 'Satisfactory Unaudited',
    monitoringAsOf: '2026 JAN 31',
    monitoringRFactor: 0.185,
    monitoringStage: 'Not on Monitoring',
    totalCarriersAB: 17704,
    fleetAvg: 40.0,
    fleetCurrent: 40,
    convictionDocs: 3,
    convictionCount: 3,
    convictionPoints: 3,
  },
};

const NOVA_SCOTIA_NSC_PROFILE = {
  carrierName:           'MAPLE LEAF FORCE LIMITED',
  nscNumber:             'MAPLE739646000',
  profileAsOf:           '19/08/2022',
  safetyRating:          'SATISFACTORY - UNAUDITED',
  safetyRatingExpires:   '08/2023',
  contactName:           'JAGJIT SINGH JEOR',
  contactTitle:          'DIRECTOR',
  phone:                 '647-588-6667',
  mailingAddress:        '99 WYSE ROAD UNIT 1100\nDARTMOUTH NS\nB3A4S5',
  physicalAddress:       '99 WYSE ROAD UNIT 1100\nDARTMOUTH NS\nB3A4S5',
  principalPlace:        '99 WYSE RD, DARTMOUTH',
  currentFleetSize:      14,
  avgDailyFleetSize:     14.79,
  scoreLevel1:           39.7531,
  scoreLevel2:           45.9602,
  scoreLevel3:           60.1836,
  convictionScore:       6.2510,
  inspectionScore:       13.4179,
  collisionScore:        0.0000,
} as const;

const PRINCE_EDWARD_ISLAND_NSC_PROFILE = {
  jurisdiction: 'Prince Edward Island',
  profileAsOf: '2021/07/14',
  nscNumber: 'PE316583',
  safetyRating: 'Conditional',
  summary: {
    collisionPoints: 8,
    convictionPoints: 6,
    inspectionPoints: 9,
    currentActiveVehiclesAtLastAssessment: 19,
    currentActiveVehicles: 19,
  },
} as const;

export const BcReportAccordionItem = ({
  title,
  description,
  meta,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  meta?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-800">{title}</div>
          <div className="mt-1 text-sm text-slate-500">{description}</div>
        </div>
        <div className="flex items-center gap-3">
          {meta && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700">
              {meta}
            </span>
          )}
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && children}
    </div>
  );
};

const getBcStatusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();
  if (normalized.includes('unsatisfactory') || normalized.includes('triggered')) return 'border-red-200 bg-red-50 text-red-700';
  if (normalized.includes('conditional') || normalized.includes('pending')) return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
};

const BC_CONTRAVENTION_SECTIONS = [
  {
    title: 'Driver Contraventions (Guilty)',
    rows: [
      { date: '13-Mar-2025', document: 'DRV-20984', party: 'Harjit Sandhu', offence: 'Hours of service record incomplete', points: 2, status: 'Guilty' },
      { date: '18-Dec-2024', document: 'DRV-20166', party: 'Baljinder Gill', offence: 'Failure to produce daily log on demand', points: 1, status: 'Guilty' },
    ],
  },
  {
    title: 'Carrier Contraventions (Guilty)',
    rows: [
      { date: '04-Nov-2024', document: 'CAR-77810', party: 'INERTIA CARRIER LTD.', offence: 'Vehicle operated with expired inspection interval', points: 2, status: 'Guilty' },
    ],
  },
  {
    title: 'Pending Driver Contraventions',
    rows: [
      { date: '21-Feb-2025', document: 'DRV-21241', party: 'Gurpreet Mann', offence: 'Inaccurate duty status entry under review', points: 0, status: 'Pending' },
    ],
  },
  {
    title: 'Pending Carrier Contraventions',
    rows: [
      { date: '27-Jan-2025', document: 'CAR-78112', party: 'INERTIA CARRIER LTD.', offence: 'Preventive maintenance documentation review pending', points: 0, status: 'Pending' },
    ],
  },
];

function NscPerfomate() {
  return <NscBcCarrierProfile {...INERTIA_CARRIER_BC_DATA} />;
}

export function BcProfileScoresContent() {
  const thresholdRows = [
    {
      status: 'Satisfactory',
      statusClass: 'text-emerald-600',
      contraventions: '0.00 - 1.76',
      cvsa: '0.00 - 0.93',
      accidents: '0.00 - 0.23',
      total: '0.00 - 2.13',
    },
    {
      status: 'Conditional',
      statusClass: 'text-amber-600',
      contraventions: '1.77 - 2.98',
      cvsa: '0.94 - 1.08',
      accidents: '0.24 - 0.27',
      total: '2.14 - 3.64',
    },
    {
      status: 'Unsatisfactory',
      statusClass: 'text-red-600',
      contraventions: '2.99 and above',
      cvsa: '1.09 and above',
      accidents: '0.28 and above',
      total: '3.65 and above',
    },
  ];

  return (
    <div className="space-y-5 border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">As Of Date</div>
          <div className="mt-2 text-lg font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.complianceReview.asOfDate}</div>
          <div className="mt-1 text-xs text-slate-500">Current profile scores loaded for BC carrier monitoring.</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Average Fleet Size</div>
          <div className="mt-2 text-lg font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.complianceReview.averageFleetSize.toFixed(2)}</div>
          <div className="mt-1 text-xs text-slate-500">24 month snapshot history ending 31-Mar-2025.</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Profile Status</div>
          <div className="mt-2 text-lg font-black text-emerald-700">{INERTIA_CARRIER_BC_DATA.certificate.profileStatus}</div>
          <div className="mt-1 text-xs text-slate-500">All current BC profile scores remain in the satisfactory range.</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Total Score</div>
          <div className="mt-2 text-lg font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.complianceReview.totalScore.toFixed(2)}</div>
          <div className="mt-1 text-xs text-slate-500">Combined contraventions, CVSA, and accident score.</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Current Profile Scores as of 31-Mar-2025</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Carrier</th>
                <th className="px-4 py-3 text-right">Average Fleet Size</th>
                <th className="px-4 py-3 text-right">Contraventions</th>
                <th className="px-4 py-3 text-right">CVSA (Out of Service)</th>
                <th className="px-4 py-3 text-right">Accidents</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100">
                <td className="px-4 py-3 font-semibold text-slate-900">{INERTIA_CARRIER_BC_DATA.demographics.carrierName}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-800">{INERTIA_CARRIER_BC_DATA.complianceReview.averageFleetSize.toFixed(2)}</td>
                {INERTIA_CARRIER_BC_DATA.complianceReview.scores.map(score => (
                  <td key={score.category} className="px-4 py-3 text-right font-mono text-slate-800">{score.score.toFixed(2)}</td>
                ))}
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{INERTIA_CARRIER_BC_DATA.complianceReview.totalScore.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm leading-relaxed text-slate-600">
          The carrier&apos;s profile status is set based on the score ranges listed below. If scores in all areas are in the{' '}
          <span className="font-semibold text-emerald-600">Satisfactory</span> range, the profile status will be Satisfactory. If any score is in the{' '}
          <span className="font-semibold text-amber-600">Conditional</span> range, the profile status will be Conditional. If any score is in the{' '}
          <span className="font-semibold text-red-600">Unsatisfactory</span> range, the profile status will be Unsatisfactory.
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Profile Status</th>
                <th className="px-4 py-3 text-right">Contraventions</th>
                <th className="px-4 py-3 text-right">CVSA (Out of Service)</th>
                <th className="px-4 py-3 text-right">Accidents</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {thresholdRows.map(range => (
                <tr key={range.status} className="border-t border-slate-100">
                  <td className={`px-4 py-3 font-semibold ${range.statusClass}`}>{range.status}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{range.contraventions}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{range.cvsa}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{range.accidents}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-700">{range.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <NscMonitoringHistory />
    </div>
  );
}

export function BcActiveFleetTable() {
  const fleetRows = INITIAL_ASSETS.filter(asset => asset.operationalStatus === 'Active').slice(0, 8);

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Licensed Vehicles</div>
          <div className="mt-2 text-2xl font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.demographics.numberOfLicensedVehicles}</div>
          <div className="mt-1 text-xs text-slate-500">Vehicles actively registered to this BC carrier.</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Business Type</div>
          <div className="mt-2 text-lg font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.demographics.primaryBusinessType}</div>
          <div className="mt-1 text-xs text-slate-500">Jurisdiction: {INERTIA_CARRIER_BC_DATA.demographics.jurisdiction}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Certificate Issued</div>
          <div className="mt-2 text-lg font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.demographics.certificateIssueDate}</div>
          <div className="mt-1 text-xs text-slate-500">{INERTIA_CARRIER_BC_DATA.demographics.extraProvincial ? 'Extra-provincial carrier' : 'Intraprovinical carrier'}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Active Fleet Sample</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Plate</th>
                <th className="px-4 py-3">VIN</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {fleetRows.map(asset => (
                <tr key={asset.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{asset.unitNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{asset.assetType}</td>
                  <td className="px-4 py-3 text-slate-700">{asset.year} {asset.make} {asset.model}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{asset.plateNumber} ({asset.plateJurisdiction})</td>
                  <td className="px-4 py-3 font-mono text-slate-500">{asset.vin}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                      {asset.operationalStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function BcContraventionsContent() {
  return (
    <div className="space-y-5 border-t border-slate-100 bg-slate-50/60 p-4">
      {BC_CONTRAVENTION_SECTIONS.map(section => (
        <div key={section.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">{section.title}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Party</th>
                  <th className="px-4 py-3">Offence</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {section.rows.map(row => (
                  <tr key={`${section.title}-${row.document}`} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-slate-700">{row.date}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.document}</td>
                    <td className="px-4 py-3 text-slate-700">{row.party}</td>
                    <td className="px-4 py-3 text-slate-600">{row.offence}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getBcStatusBadgeClass(row.status)}`}>
                        {row.status}{row.points > 0 ? `  ·  ${row.points} pts` : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function BcAuditSummaryPanel() {
  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Audit Status</div>
          <div className="mt-2 text-lg font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.certificate.auditStatus}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Profile Status</div>
          <div className="mt-2 text-lg font-black text-emerald-700">{INERTIA_CARRIER_BC_DATA.certificate.profileStatus}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Safety Rating</div>
          <div className="mt-2 text-base font-black text-slate-900">{INERTIA_CARRIER_BC_DATA.certificate.safetyRating}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Certificate Status</div>
          <div className="mt-2 text-lg font-black text-emerald-700">{INERTIA_CARRIER_BC_DATA.certificate.certificateStatus}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">Intervention Trigger History</div>
        </div>
        <div className="divide-y divide-slate-100">
          {INERTIA_CARRIER_BC_DATA.interventions.map(intervention => (
            <div key={`${intervention.type}-${intervention.date}`} className="flex items-start justify-between gap-4 px-4 py-4">
              <div>
                <div className="text-sm font-bold text-slate-900">{intervention.type}</div>
                <div className="mt-1 text-sm text-slate-600">{intervention.description}</div>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getBcStatusBadgeClass(intervention.type)}`}>
                {intervention.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BcCvipHistoryPanel() {
  const cvipRows = INITIAL_ASSETS.filter(asset => asset.operationalStatus === 'Active').slice(0, 6).map((asset, index) => ({
    id: asset.id,
    unit: asset.unitNumber,
    plate: `${asset.plateNumber} (${asset.plateJurisdiction})`,
    inspectionDate: ['10-Jan-2025', '22-Feb-2025', '18-Mar-2025', '29-Mar-2025', '04-Apr-2025', '19-Apr-2025'][index] ?? '19-Apr-2025',
    expiryDate: asset.registrationExpiryDate,
    status: index < 4 ? 'Current' : 'Upcoming',
  }));

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm text-slate-600">
          Periodic inspection history placeholder tied to the active-fleet records currently loaded in the workspace. This section can be swapped to live CVIP records once a BC inspection feed is attached.
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700">CVIP Vehicle Inspection History</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Plate</th>
                <th className="px-4 py-3">Last Inspection</th>
                <th className="px-4 py-3">Document Expiry</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {cvipRows.map(row => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.unit}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.plate}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.inspectionDate}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.expiryDate}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getBcStatusBadgeClass(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

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
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{record.startTime}{record.endTime ? ` - ${record.endTime}` : ''}</span>
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

        {/* Violations Count + ticket badge */}
        <div className="col-span-1 flex flex-col justify-center items-center gap-1">
          {record.isClean ? (
            <span className="text-[13px] font-bold text-emerald-600">Clean</span>
          ) : (
            <span className="text-[13px] font-bold text-orange-600">{record.violations.length}</span>
          )}
          {(record.tickets || []).length > 0 && (() => {
            const tk = record.tickets as any[];
            const fines = tk.reduce((s, t) => s + (t.fineAmount || 0), 0);
            return (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-rose-700"
                title={`${tk.length} ticket${tk.length === 1 ? '' : 's'} · $${fines.toLocaleString()}`}
              >
                <Ticket size={10} /> {tk.length}
              </span>
            );
          })()}
        </div>

        {/* Vehicle Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(cvorOverride.vehPts || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {cvorOverride.vehPts ?? '-'}
          </span>
        </div>

        {/* Driver Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(cvorOverride.dvrPts || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {cvorOverride.dvrPts ?? '-'}
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
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{record.startTime}{record.endTime ? ` - ${record.endTime}` : ''}</span>
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
            {record.smsPoints?.vehicle ?? '-'}
          </span>
        </div>

        {/* Driver Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(record.smsPoints?.driver || 0) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
            {record.smsPoints?.driver ?? '-'}
          </span>
        </div>

        {/* Carrier Points */}
        <div className="col-span-1 flex justify-center items-center">
          <span className={`text-[13px] font-bold ${(record.smsPoints?.carrier || 0) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {record.smsPoints?.carrier ?? '-'}
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

              {/* Unified info bar (time, location, points, severity rate) - shown for BOTH SMS and CVOR */}
              {(record.startTime || record.location || record.severityRate != null) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
                  {record.startTime && (
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-center">
                      <div className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Inspection Time</div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">{record.startTime} - {record.endTime || '-'}</div>
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
                        const wt        = violation.weight ?? '-';
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
                        const plate      = primaryUnit?.license || record.vehiclePlate || '-';
                        const driverName = record.driver?.split(',')[0] ?? '-';
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
                                    <div className="mt-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">{violation.description?.slice(0,30)}{violation.description?.length > 30 ? '...' : ''}</div>
                                  </div>
                                  <div className={`shrink-0 transition-transform duration-150 ${rowOpen ? 'rotate-180' : ''}`}>
                                    <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                  </div>
                                </div>
                              </td>
                              {/* Code */}
                              <td className="px-3 py-3 text-center">
                                <span className="font-mono font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[12px]">{violation.code ?? '-'}</span>
                              </td>
                              {/* Category */}
                              <td className="px-3 py-3">
                                <span className="text-[12px] font-semibold text-slate-700">{violation.category ?? '-'}</span>
                              </td>
                              {/* Description */}
                              <td className="px-3 py-3">
                                <p className="text-[12px] text-slate-600 leading-snug">{violation.description ?? '-'}</p>
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
                                  : <span className="text-slate-300">-</span>}
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

                            {/* â"€â"€ Expandable detail panel â"€â"€ */}
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

                                      {/* Issuing Agency - only if data */}
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
                                              <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-sm shadow-sm">{violation.code ?? '-'}</span>
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
                                              <div className="text-[13px] font-semibold text-slate-800">{violation.category ?? '-'}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</div>
                                              <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-800 leading-snug">{violation.description ?? '-'}</div>
                                              {violation.subDescription && (
                                                <div className="mt-1 text-[11px] text-blue-500 font-medium">{violation.subDescription}</div>
                                              )}
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                              {[
                                                { label: 'Severity', value: violation.severity ?? '-' },
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
                                                <div className="text-[13px] font-bold text-slate-800 leading-tight">{violation.category ?? '-'}</div>
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

              {/* ── Inspection Flags + Tickets (CVOR-only, mirrors PDF event) ── */}
              {(record.coDriver != null || record.impoundment != null || record.charged != null
                || (record as any).categoriesOos != null || (record as any).totalDefects != null
                || ((record as any).tickets || []).length > 0) && (
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Inspection Flags card */}
                    <div className="flex flex-col gap-3 h-full">
                      <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                        <Info size={14} className="text-slate-400" /> Inspection Flags
                      </h4>
                      <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full">
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { label: 'Co-Driver',  v: record.coDriver  },
                            { label: 'Impoundment', v: record.impoundment },
                            { label: 'Charged',    v: record.charged   },
                          ].map((f) => (
                            <div key={f.label} className="bg-slate-50 border border-slate-100 rounded p-2">
                              <p className="text-[11px] text-slate-500 uppercase tracking-wide">{f.label}</p>
                              <p className={`mt-0.5 font-bold text-sm ${f.v === true ? 'text-red-600' : f.v === false ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {f.v === true ? 'Yes' : f.v === false ? 'No' : '—'}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-[13px]">
                          <div>
                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Categories OOS</p>
                            <p className="mt-0.5 font-bold text-slate-800">{(record as any).categoriesOos ?? record.oosSummary?.total ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Defects</p>
                            <p className="mt-0.5 font-bold text-slate-800">{(record as any).totalDefects ?? (record.violations || []).length}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tickets summary card */}
                    {((record as any).tickets || []).length > 0 ? (
                      <div className="flex flex-col gap-3 h-full">
                        <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                          <Ticket size={14} className="text-rose-500" /> Tickets Issued
                        </h4>
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 h-full flex flex-col">
                          {(() => {
                            const tk = (record as any).tickets as any[];
                            const fines = tk.reduce((s, t) => s + (t.fineAmount || 0), 0);
                            const driverCt  = tk.filter(t => t.chargedTo === 'Driver').length;
                            const carrierCt = tk.filter(t => t.chargedTo === 'Carrier').length;
                            const cur = tk[0]?.currency || 'CAD';
                            return (
                              <div className="grid grid-cols-3 gap-3 text-[13px]">
                                <div className="bg-rose-50 border border-rose-100 rounded p-2">
                                  <p className="text-[11px] text-rose-600 uppercase tracking-wide">Tickets</p>
                                  <p className="mt-0.5 font-bold text-rose-700 text-lg">{tk.length}</p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">Total Fines</p>
                                  <p className="mt-0.5 font-bold text-slate-800 font-mono">${fines.toLocaleString()} <span className="text-[10px] text-slate-500">{cur}</span></p>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">Driver / Carrier</p>
                                  <p className="mt-0.5 font-bold text-slate-800">{driverCt} / {carrierCt}</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 h-full">
                        <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider leading-tight">
                          <Ticket size={14} className="text-slate-300" /> Tickets Issued
                        </h4>
                        <div className="bg-white border border-dashed border-slate-200 rounded-lg p-4 h-full flex items-center justify-center text-[13px] text-slate-400">
                          No tickets issued for this inspection.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticket detail cards (one per ticket) */}
                  {((record as any).tickets || []).length > 0 && (
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-500 flex items-center gap-2 uppercase tracking-wider mb-3">
                        <Receipt size={14} className="text-rose-500" /> Ticket Details
                      </h4>
                      <div className="grid gap-3 md:grid-cols-2">
                        {((record as any).tickets as any[]).map((t, ti) => {
                          const statusTone =
                            t.status === 'Convicted' ? 'bg-red-100 text-red-700 ring-red-200' :
                            t.status === 'Paid'      ? 'bg-emerald-100 text-emerald-700 ring-emerald-200' :
                            t.status === 'Dismissed' || t.status === 'Withdrawn' ? 'bg-slate-100 text-slate-600 ring-slate-200' :
                            'bg-amber-100 text-amber-700 ring-amber-200';
                          const partyTone = t.chargedTo === 'Driver'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-violet-50 text-violet-700 border-violet-200';
                          return (
                            <div key={`${record.id}-tk-${ti}`} className="bg-white border border-rose-100 rounded-xl shadow-sm p-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-mono text-[12px] font-bold text-rose-700">{t.ticketNumber}</div>
                                  <div className="mt-0.5 text-[12px] text-slate-700 leading-snug">{t.offenceDescription}</div>
                                </div>
                                <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${statusTone}`}>
                                  {t.status}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px]">
                                <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-bold ${partyTone}`}>
                                  {t.chargedTo === 'Driver' ? 'DRIVER' : 'CARRIER'}
                                </span>
                                <span className="font-mono text-indigo-700">{t.offenceCode}</span>
                                <span className="ml-auto inline-flex items-center gap-1 font-bold text-slate-700">
                                  <Receipt size={10} className="text-slate-400" />
                                  ${(t.fineAmount || 0).toLocaleString()} {t.currency}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-500">
                                <span>Issued <span className="font-mono text-slate-700">{t.issueDate}</span></span>
                                {t.courtDate && (
                                  <span className="inline-flex items-center gap-1">
                                    <Scale size={9} className="text-slate-400" />
                                    Court <span className="font-mono text-slate-700">{t.courtDate}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export const formatMetricValue = (value: number | string | null | undefined, decimals = 0) => {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// â"€â"€ NSC Overview Row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Renders a single NSC/CVSA inspection record in the unified overview list.
export const NscOverviewRow = ({ row }: { row: NscInspectionRecord }) => {
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
      {/* Desktop row - unified 12-col layout matching SMS/CVOR InspectionRow */}
      <div
        className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-4 items-center cursor-pointer border-l-2 border-l-emerald-400 hover:bg-emerald-50/20 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Date / Time */}
        <div className="col-span-1 pl-2 flex flex-col justify-center">
          <span className="text-sm font-bold text-slate-800">{row.date}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.details?.time ?? '-'}</span>
        </div>

        {/* Source + Doc - emerald NSC badge */}
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
            <span className="text-[13px] text-slate-300">-</span>
          )}
        </div>

        {/* NSC Driver Points (Drv Pts column) */}
        <div className="col-span-1 flex justify-center items-center">
          {nscDriverPts > 0 ? (
            <span className={`text-[13px] font-bold ${nscDriverPts >= 3 ? 'text-red-600' : 'text-amber-600'}`}>{nscDriverPts}</span>
          ) : (
            <span className="text-[13px] text-slate-300">-</span>
          )}
        </div>

        {/* NSC Carrier Points (Carr Pts column) */}
        <div className="col-span-1 flex justify-center items-center">
          {nscCarrierPts > 0 ? (
            <span className={`text-[13px] font-bold ${nscCarrierPts >= 6 ? 'text-red-600' : nscCarrierPts >= 3 ? 'text-amber-600' : 'text-slate-700'}`}>{nscCarrierPts}</span>
          ) : (
            <span className="text-[13px] text-slate-300">-</span>
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
            <span className="text-xs text-slate-400">{row.jur}  ·  {row.driverLink.driverName}</span>
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

          {/* â"€â"€ NSC Level banner + stat cards â"€â"€ */}
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
              1: 'Full inspection - driver, vehicle, HOS, permits, insurance, cargo, TDG, and authorities.',
              2: 'Walk-around inspection - driver and vehicle review including licence, HOS, seat belt, trip inspection and visible mechanical condition.',
              3: 'Driver/Credentials inspection - driver licence, hours of service, seat belt use, credentials and administrative compliance.',
              4: 'Special inspection - focused on a specific item such as cargo securement, placards, brakes, or another identified issue.',
              5: 'Vehicle-only inspection - no driver present, focused on mechanical condition and safety systems.',
              6: 'Enhanced NAS inspection - comprehensive inspection with additional focus on high-risk categories.',
              7: 'Jurisdictional mandated inspection - required by provincial/state authority for specific vehicle or carrier types.',
              8: 'Electronic inspection - roadside review of ELD, credentials, and electronic records without physical vehicle check.',
            };
            const levelDesc = NSC_LEVEL_MAP[row.level] ?? `Level ${row.level} Inspection`;
            const levelDetail = NSC_LEVEL_DETAIL_MAP[row.level];
            const jur = row.jur?.toUpperCase() ?? '';
            const regulation =
              jur === 'AB' ? 'Commercial Vehicle Inspection Regulation - AR 211/06, NSC Standard 11' :
              jur === 'ON' ? 'Highway Traffic Act - O.Reg.199/07, O.Reg.555/06, NSC Standard 13' :
              jur === 'BC' ? 'Motor Vehicle Act - Commercial Transport Regulation, NSC Standard 11' :
              jur === 'SK' ? 'Traffic Safety Act - VSR 116/2014, NSC Standard 11' :
              jur === 'MB' ? 'Highway Traffic Act - MR 189/2010, NSC Standard 11' :
              jur === 'QC' ? 'Highway Safety Code - O.C. 1395-96, NSC Standard 11' :
              'CTACMV Regulations - NSC Standard 11';
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
                      {' - '}
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
                    <div className="text-sm font-bold text-slate-900">{row.details!.time || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Issuing Agency</div>
                    <div className="text-sm font-bold text-slate-900 leading-snug">{row.details!.agency || '-'}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Date Entered</div>
                    <div className="text-sm font-bold text-slate-900">{row.details!.dateEntered || '-'}</div>
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

          {/* System links - driver profile + asset cards */}
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
                        <div className="text-slate-700 font-medium">{primaryLic?.class ?? '-'}</div>
                      </div>
                    </div>
                  )}
                  {row.driverLink.rawLicence && (
                    <div className="text-[9px] text-slate-400 font-mono border-t border-blue-100 pt-1 truncate" title={row.driverLink.rawLicence}>
                      NSC: {row.driverLink.rawLicence}
                    </div>
                  )}
                </div>

                {/* Asset card - power unit */}
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
                NSC Violations - {row.doc}
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
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {sys ? (
                              <div>
                                <div className="font-semibold text-slate-800">{sys.categoryLabel}</div>
                                <div className="text-[10px] text-slate-400">{sys.violationGroup}</div>
                              </div>
                            ) : <span className="text-slate-400">-</span>}
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

      {/* â"€â"€ NSC Violation detail modal â"€â"€ */}
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
                      <div className={`text-xs font-bold ${riskText}`}>{sys.riskLevel.toUpperCase()} RISK - {riskPct}%</div>
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
                    {rawRecord.commodity && rawRecord.commodity !== '-' && rawRecord.commodity !== '' && (
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
                    }`}>{sys ? points : '-'}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">OOS</div>
                    <div className={`mt-1 font-bold ${selectedViolation.isOOS ? 'text-red-600' : 'text-slate-700'}`}>
                      {selectedViolation.isOOS ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="text-[11px] text-slate-500 uppercase tracking-wider">Risk Level</div>
                    <div className={`mt-1 font-bold ${riskText}`}>{sys?.riskLevel ?? '-'}</div>
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

void MiniKpiCard;
void InspectionRow;

const PERIOD_OPTIONS = ['1M', '3M', '6M', '12M', '24M'] as const;
type PeriodLabel =
  | typeof PERIOD_OPTIONS[number]
  | 'Monthly'
  | 'Quarterly'
  | 'Semi-Annual'
  | 'Annual'
  | 'All';
const getPeriodLabel = (period: PeriodLabel) => (
  period === 'All' ? 'All Pulls'
  : period === 'Annual' ? 'Annual'
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
  const [activeMainTab, setActiveMainTab] = useState<'sms' | 'cvor' | 'carrier-profile-ab' | 'carrier-profile-bc' | 'carrier-profile-pe' | 'carrier-profile-ns'>('sms');
  const [bcMainOpen, setBcMainOpen] = useState<Record<string, boolean>>({});
  const bcMainTog = (k: string) => setBcMainOpen(p => ({ ...p, [k]: !p[k] }));
  const [abMainOpen, setAbMainOpen] = useState<Record<string, boolean>>({});
  const abMainTog = (k: string) => setAbMainOpen(p => ({ ...p, [k]: !p[k] }));
  const [showReport, setShowReport] = useState(false);
  const [smsPeriod, setSmsPeriod] = useState<'1M' | '3M' | '6M' | '12M' | '24M' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All'>('All');
  const smsBasicCategory = 'All';
  const [smsTopViolSort, setSmsTopViolSort] = useState<'POINTS' | 'COUNT'>('POINTS');
  const [smsMetricsView, setSmsMetricsView] = useState<'INSPECTIONS' | 'VIOLATIONS' | 'POINTS'>('POINTS');
  const [metricsSort, setMetricsSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'total', dir: 'desc' });
  // CVOR tab chart states
  const [cvorPeriod, setCvorPeriod] = useState<'1M' | '3M' | '6M' | '12M' | '24M' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All'>('All');
  const [cvorThreshOpen, setCvorThreshOpen] = useState(false);
  const [cvorCollBreakdownOpen, setCvorCollBreakdownOpen] = useState(false);
  const [cvorConvBreakdownOpen, setCvorConvBreakdownOpen] = useState(false);
  const [cvorInspStatsOpen, setCvorInspStatsOpen] = useState(false);
  const [cvorEventKpiFilter, setCvorEventKpiFilter] = useState<'ALL' | 'CLEAN' | 'OOS' | 'VEHICLE' | 'HOS_DRIVER' | 'SEVERE' | 'TICKETS'>('ALL');
  const [cvorEventTypeFilter, setCvorEventTypeFilter] = useState<'ALL' | 'inspection' | 'collision' | 'conviction'>('ALL');
  const [cvorEventExpanded, setCvorEventExpanded] = useState<string | null>(null);
  const [cvorEventSearch, setCvorEventSearch] = useState('');
  const [cvorEventSort, setCvorEventSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'desc' });
  const [cvorEventPage, setCvorEventPage] = useState(1);
  const [cvorEventRowsPerPage, setCvorEventRowsPerPage] = useState(10);
  const [cvorEventColumns, setCvorEventColumns] = useState<ColumnDef[]>([
    { id: 'type',          label: 'Type',          visible: true },
    { id: 'date',          label: 'Date',          visible: true },
    { id: 'time',          label: 'Time',          visible: true },
    { id: 'cvirOrTicket',  label: 'CVIR / Ticket', visible: true },
    { id: 'location',      label: 'Location',      visible: true },
    { id: 'driver',        label: 'Driver',        visible: true },
    { id: 'driverLicence', label: 'Driver Licence',visible: true },
    { id: 'vehicle1',      label: 'Vehicle 1',     visible: true },
    { id: 'vehicle2',      label: 'Vehicle 2',     visible: true },
    { id: 'level',         label: 'Level',         visible: true },
    { id: 'vPts',          label: 'V Pts',         visible: true },
    { id: 'dPts',          label: 'D Pts',         visible: true },
    { id: 'oos',           label: 'OOS',           visible: true },
    { id: 'defects',       label: 'Defects',       visible: true },
    { id: 'charged',       label: 'Charged',       visible: true },
  ]);

  // Reset pagination when filter / search / rows-per-page changes
  useEffect(() => {
    setCvorEventPage(1);
    setCvorEventExpanded(null);
  }, [cvorEventKpiFilter, cvorEventTypeFilter, cvorEventSearch, cvorEventRowsPerPage]);

  // Travel Kilometric Information state
  const [cvorTravelType, setCvorTravelType] = useState<'ALL' | 'Estimated' | 'Actual'>('ALL');
  const [cvorTravelSort, setCvorTravelSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'fromDate', dir: 'desc' });
  const [cvorTravelSearch, setCvorTravelSearch] = useState('');
  const [cvorTravelPage, setCvorTravelPage] = useState(1);
  const [cvorTravelRowsPerPage, setCvorTravelRowsPerPage] = useState(5);
  const [cvorTravelColumns, setCvorTravelColumns] = useState<ColumnDef[]>([
    { id: 'type',           label: 'E/A',              visible: true },
    { id: 'fromDate',       label: 'From',             visible: true },
    { id: 'toDate',         label: 'To',               visible: true },
    { id: 'vehicles',       label: '# Vehicles',       visible: true },
    { id: 'doubleShifted',  label: '# Double Shifted', visible: true },
    { id: 'totalVehicles',  label: 'Total Vehicles',   visible: true },
    { id: 'ontarioKm',      label: 'Ontario KM',       visible: true },
    { id: 'restOfCanadaKm', label: 'Rest of Canada KM',visible: true },
    { id: 'usMexicoKm',     label: 'US/Mexico KM',     visible: true },
    { id: 'drivers',        label: '# Drivers',        visible: true },
    { id: 'totalKm',        label: 'Total KM',         visible: true },
  ]);
  useEffect(() => { setCvorTravelPage(1); }, [cvorTravelType, cvorTravelSearch, cvorTravelRowsPerPage]);
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
  void setCvorPullDetailFilter;
  void setCvorPullDetailSearch;
  void cvorPullDetailPage;
  void setCvorPullDetailRowsPerPage;
  void setCvorPullDetailSort;
  void cvorPullDetailColumns;
  void setCvorPullDetailColumns;
  void cvorPullDetailExpanded;
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
  const [cvorLevelPeriod, setCvorLevelPeriod] = useState<'1M' | '3M' | '6M' | '12M' | '24M' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All'>('All');
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
  }, [cvorPullFilter, cvorPullSearch, cvorPullSort.col, cvorPullSort.dir, cvorPullRowsPerPage]);

  // ── Mini-CVOR (pull drill-down) panel state ─────────────────────────────────
  type MiniSectionKey =
    | 'performance' | 'mileage' | 'collisionDetails' | 'convictionDetails'
    | 'comparison' | 'collisionBd' | 'convictionBd'
    | 'inspStats' | 'events' | 'travel';
  const [miniOpen, setMiniOpen] = useState<Record<MiniSectionKey, boolean>>({
    performance: true, mileage: false, collisionDetails: false, convictionDetails: false,
    comparison: false, collisionBd: false, convictionBd: false,
    inspStats: false, events: false, travel: false,
  });
  const toggleMini = (k: MiniSectionKey) => setMiniOpen(p => ({ ...p, [k]: !p[k] }));

  // Collision Breakdown (mini)
  const [miniColBdPage, setMiniColBdPage] = useState(1);
  const [miniColBdRowsPerPage, setMiniColBdRowsPerPage] = useState(5);
  const [miniColBdColumns, setMiniColBdColumns] = useState<ColumnDef[]>([
    { id: 'period',     label: 'Period',     visible: true },
    { id: 'fromDate',   label: 'From',       visible: true },
    { id: 'toDate',     label: 'To',         visible: true },
    { id: 'months',     label: 'Months',     visible: true },
    { id: 'kmPerMonth', label: 'KM/Month',   visible: true },
    { id: 'events',     label: 'Events',     visible: true },
    { id: 'points',     label: 'Points',     visible: true },
    { id: 'threshold',  label: 'Threshold',  visible: true },
    { id: 'pctSet',     label: '% Set',      visible: true },
  ]);
  useEffect(() => { setMiniColBdPage(1); }, [miniColBdRowsPerPage]);

  // Conviction Breakdown (mini)
  const [miniConBdPage, setMiniConBdPage] = useState(1);
  const [miniConBdRowsPerPage, setMiniConBdRowsPerPage] = useState(5);
  const [miniConBdColumns, setMiniConBdColumns] = useState<ColumnDef[]>([
    { id: 'period',     label: 'Period',     visible: true },
    { id: 'fromDate',   label: 'From',       visible: true },
    { id: 'toDate',     label: 'To',         visible: true },
    { id: 'months',     label: 'Months',     visible: true },
    { id: 'kmPerMonth', label: 'KM/Month',   visible: true },
    { id: 'events',     label: 'Events',     visible: true },
    { id: 'points',     label: 'Points',     visible: true },
    { id: 'threshold',  label: 'Threshold',  visible: true },
    { id: 'pctSet',     label: '% Set',      visible: true },
  ]);
  useEffect(() => { setMiniConBdPage(1); }, [miniConBdRowsPerPage]);

  // Intervention & Event Details (mini)
  const [miniEventsKpiFilter, setMiniEventsKpiFilter] = useState<'ALL' | 'CLEAN' | 'OOS' | 'VEHICLE' | 'HOS_DRIVER' | 'SEVERE' | 'TICKETS'>('ALL');
  const [miniEventsTypeFilter, setMiniEventsTypeFilter] = useState<'ALL' | 'inspection' | 'collision' | 'conviction'>('ALL');
  const [miniEventsSearch, setMiniEventsSearch] = useState('');
  const [miniEventsSort, setMiniEventsSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'desc' });
  const [miniEventsPage, setMiniEventsPage] = useState(1);
  const [miniEventsRowsPerPage, setMiniEventsRowsPerPage] = useState(5);
  const [miniEventsColumns, setMiniEventsColumns] = useState<ColumnDef[]>([
    { id: 'type',          label: 'Type',           visible: true },
    { id: 'date',          label: 'Date',           visible: true },
    { id: 'time',          label: 'Time',           visible: false },
    { id: 'cvirOrTicket',  label: 'CVIR / Ticket',  visible: true },
    { id: 'location',      label: 'Location',       visible: false },
    { id: 'driver',        label: 'Driver',         visible: true },
    { id: 'driverLicence', label: 'Driver Licence', visible: false },
    { id: 'vehicle1',      label: 'Vehicle 1',      visible: false },
    { id: 'vehicle2',      label: 'Vehicle 2',      visible: false },
    { id: 'level',         label: 'Level',          visible: true },
    { id: 'vPts',          label: 'V Pts',          visible: true },
    { id: 'dPts',          label: 'D Pts',          visible: true },
    { id: 'oos',           label: 'OOS',            visible: true },
    { id: 'defects',       label: 'Defects',        visible: false },
    { id: 'charged',       label: 'Charged',        visible: false },
  ]);
  useEffect(() => { setMiniEventsPage(1); }, [miniEventsKpiFilter, miniEventsTypeFilter, miniEventsSearch, miniEventsRowsPerPage]);

  // Travel Kilometric Information (mini)
  const [miniTravelType, setMiniTravelType] = useState<'ALL' | 'Estimated' | 'Actual'>('ALL');
  const [miniTravelSearch, setMiniTravelSearch] = useState('');
  const [miniTravelSort, setMiniTravelSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'fromDate', dir: 'desc' });
  const [miniTravelPage, setMiniTravelPage] = useState(1);
  const [miniTravelRowsPerPage, setMiniTravelRowsPerPage] = useState(5);
  const [miniTravelColumns, setMiniTravelColumns] = useState<ColumnDef[]>([
    { id: 'type',           label: 'E/A',               visible: true },
    { id: 'fromDate',       label: 'From',              visible: true },
    { id: 'toDate',         label: 'To',                visible: true },
    { id: 'vehicles',       label: '# Vehicles',        visible: true },
    { id: 'doubleShifted',  label: '# Double Shifted',  visible: false },
    { id: 'totalVehicles',  label: 'Total Vehicles',    visible: false },
    { id: 'ontarioKm',      label: 'Ontario KM',        visible: true },
    { id: 'restOfCanadaKm', label: 'Rest of Canada KM', visible: true },
    { id: 'usMexicoKm',     label: 'US/Mexico KM',      visible: false },
    { id: 'drivers',        label: '# Drivers',         visible: true },
    { id: 'totalKm',        label: 'Total KM',          visible: true },
  ]);
  useEffect(() => { setMiniTravelPage(1); }, [miniTravelType, miniTravelSearch, miniTravelRowsPerPage]);

  // ── All-pulls Intervention & Event Details (bottom of CVOR tab) ─────────────
  const [allEventsTimePeriod, setAllEventsTimePeriod] = useState<'12M' | '24M' | '36M' | 'ALL' | 'CUSTOM'>('24M');
  const [allEventsDateFrom, setAllEventsDateFrom] = useState('');
  const [allEventsDateTo,   setAllEventsDateTo]   = useState('');
  const [allEventsType, setAllEventsType] = useState<'ALL' | 'inspection' | 'collision' | 'conviction'>('ALL');
  const [allEventsKpi, setAllEventsKpi] = useState<'ALL' | 'CLEAN' | 'OOS' | 'VEHICLE' | 'HOS_DRIVER' | 'SEVERE' | 'TICKETS'>('ALL');
  const [allEventsSearch, setAllEventsSearch] = useState('');
  const [allEventsSort, setAllEventsSort] = useState<{ col: string; dir: 'asc' | 'desc' }>({ col: 'date', dir: 'desc' });
  const [allEventsPage, setAllEventsPage] = useState(1);
  const [allEventsRowsPerPage, setAllEventsRowsPerPage] = useState(10);
  const [allEventsExpanded, setAllEventsExpanded] = useState<string | null>(null);
  const [allEventsChartOpen, setAllEventsChartOpen] = useState(false);
  const [allEventsColumns, setAllEventsColumns] = useState<ColumnDef[]>([
    { id: 'type',          label: 'Type',           visible: true },
    { id: 'date',          label: 'Date',           visible: true },
    { id: 'time',          label: 'Time',           visible: false },
    { id: 'cvirOrTicket',  label: 'CVIR / Ticket',  visible: true },
    { id: 'location',      label: 'Location',       visible: true },
    { id: 'driver',        label: 'Driver',         visible: true },
    { id: 'driverLicence', label: 'Driver Licence', visible: false },
    { id: 'vehicle1',      label: 'Vehicle 1',      visible: true },
    { id: 'vehicle2',      label: 'Vehicle 2',      visible: false },
    { id: 'level',         label: 'Level',          visible: true },
    { id: 'vPts',          label: 'V Pts',          visible: true },
    { id: 'dPts',          label: 'D Pts',          visible: true },
    { id: 'oos',           label: 'OOS',            visible: true },
    { id: 'defects',       label: 'Defects',        visible: false },
    { id: 'charged',       label: 'Charged',        visible: false },
    { id: 'sourcePulls',   label: 'Pull Coverage',  visible: true },
  ]);
  useEffect(() => {
    setAllEventsPage(1);
    setAllEventsExpanded(null);
  }, [allEventsTimePeriod, allEventsDateFrom, allEventsDateTo, allEventsType, allEventsKpi, allEventsSearch, allEventsRowsPerPage]);

  useEffect(() => {
    setCvorPullDetailPage(1);
  }, [cvorPullDetailFilter, cvorPullDetailSearch, cvorPullDetailSort.col, cvorPullDetailSort.dir, cvorPullDetailRowsPerPage, cvorSelectedPull]);

  useEffect(() => {
    setCvorPullDetailExpanded(null);
  }, [cvorSelectedPull]);

  const [columns, setColumns] = useState<ColumnDef[]>([
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
  // Sort + expand state for the All-CVOR list (mirrors pull-by-pull)
  const [cvorListSort, setCvorListSort] = useState<{col:string;dir:'asc'|'desc'}>({col:'date',dir:'desc'});
  const [cvorListExpanded, setCvorListExpanded] = useState<string | null>(null);
  void columns;
  void setColumns;
  void setCvorListSort;
  void cvorListExpanded;
  void setCvorListExpanded;
  
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

  // Add-inspection: jurisdiction kind + per-kind latest-pull form data + uploaded report file
  const [inspectionKind, setInspectionKind] = useState<InspectionKind>('fmcsa');
  const [fmcsaForm,  setFmcsaForm]  = useState<FmcsaFormData>(EMPTY_FMCSA);
  const [cvorForm,   setCvorForm]   = useState<CvorFormData>(EMPTY_CVOR);
  const [abNscForm,  setAbNscForm]  = useState<AbNscFormData>(EMPTY_AB);
  const [bcNscForm,  setBcNscForm]  = useState<BcNscFormData>(EMPTY_BC);
  const [peiNscForm, setPeiNscForm] = useState<PeiNscFormData>(EMPTY_PEI);
  const [nsNscForm,  setNsNscForm]  = useState<NsNscFormData>(EMPTY_NS);
  const [uploadedReport, setUploadedReport] = useState<UploadedReportFile | null>(null);

  const defaultKindFromTab = (tab: string): InspectionKind => {
    if (tab === 'carrier-profile-ab') return 'ab';
    if (tab === 'carrier-profile-bc') return 'bc';
    if (tab === 'carrier-profile-pe') return 'pe';
    if (tab === 'carrier-profile-ns') return 'ns';
    if (tab === 'cvor')               return 'cvor';
    return 'fmcsa';
  };

  const openAddModal = () => {
    setInspForm(emptyForm);
    setFormViolations([]);
    setInspAttachedDocs(requiredDocTypes.map(dt => ({
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      docTypeId: dt.id, docNumber: '', issueDate: '', fileName: ''
    })));
    setInspectionKind(defaultKindFromTab(activeMainTab));
    setFmcsaForm(EMPTY_FMCSA);
    setCvorForm(EMPTY_CVOR);
    setAbNscForm(EMPTY_AB);
    setBcNscForm(EMPTY_BC);
    setPeiNscForm(EMPTY_PEI);
    setNsNscForm(EMPTY_NS);
    setUploadedReport(null);
    setEditingInspection(null);
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
  void stats;

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
  void pagedData;

  return (
    <div className="min-h-screen text-slate-900 p-4 md:p-6 pb-20 relative">
      <div className="w-full space-y-6">
        
        {/* ===== TOP HEADER & ACTIONS ===== */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Safety and Compliance</h1>
            <p className="text-sm text-gray-500">Track and manage roadside inspections, carrier profiles, and safety events.</p>
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
              <Plus size={16} /> Add Compliance
            </button>
          </div>
        </div>

        {/* ===== MAIN TAB NAVIGATION ===== */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 gap-1">
            {[
              { id: 'sms' as const, label: 'FMCSA' },
              { id: 'cvor' as const, label: 'CVOR' },
              { id: 'carrier-profile-ab' as const, label: 'Alberta NSC' },
              { id: 'carrier-profile-bc' as const, label: 'BC NSC' },
              { id: 'carrier-profile-pe' as const, label: 'PEI NSC' },
              { id: 'carrier-profile-ns' as const, label: 'Nova Scotia NSC' },
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

          {/* Report button - only for reportable tabs */}
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
        </div>

        {/* ===== REPORT PANEL ===== */}
        {showReport && (
          <InspectionReportPanel
            variant={activeMainTab === 'sms' ? 'sms' : activeMainTab === 'cvor' ? 'cvor' : 'nsc'}
            basicOverview={computedBasicOverview}
            csaThresholds={csaThresholds}
            cvorThresholds={cvorThresholds}
            cvorOosThresholds={cvorOosThresholds}
            carrierProfile={carrierProfile}
          />
        )}


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
              <span className="font-mono font-bold">December 15, 2025 - 3:42 PM EST</span>
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
              { level: 'Level 1', name: 'Level I - North American Standard', desc: 'Full inspection of the driver and vehicle - includes driver credentials (CDL, medical card, HOS), vehicle mechanical fitness, cargo securement, hazmat compliance (if applicable), and all safety systems.' },
              { level: 'Level 2', name: 'Level II - Walk-Around', desc: 'Walk-around driver/vehicle inspection - covers driver credentials, HOS, seat belt use, DVIR, and an exterior examination of the vehicle without going underneath.' },
              { level: 'Level 3', name: 'Level III - Driver/Credential', desc: 'Driver-only inspection - verifies CDL, medical certificate, HOS records, seat belt compliance, DVIR, and carrier credentials. No vehicle mechanical inspection.' },
              { level: 'Level 4', name: 'Level IV - Special Inspections', desc: 'Special one-time inspection or examination - typically a single item of interest (e.g., cargo, hazmat placards, specific regulatory concern).' },
              { level: 'Level 5', name: 'Level V - Vehicle Only', desc: 'Vehicle-only inspection - conducted without the driver present. Covers all mechanical components and safety systems.' },
              { level: 'Level 6', name: 'Level VI - Transuranic Waste / Radioactive', desc: 'Enhanced NAS inspection for transuranic waste and highway-route-controlled radioactive material shipments - includes Level I items plus radiological requirements.' },
              { level: 'Level 7', name: 'Level VII - Jurisdictional Mandated', desc: 'Jurisdiction-mandated commercial vehicle inspection - covers specific items required by the state or province, including credential verification.' },
              { level: 'Level 8', name: 'Level VIII - Electronic Inspection', desc: 'Electronic inspection using wireless roadside technology - verifies driver and vehicle credentials, safety data, and compliance electronically (e.g., ELD, transponder, USDOT data).' },
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

            // â"€â"€ Time-trend computation for BASIC Scores â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

            // â"€â"€ OOS / Top Violations â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
                const key = v.description.length > 36 ? v.description.substring(0, 36) + '...' : v.description;
                if (!violationMap2[key]) violationMap2[key] = { points: 0, count: 0 };
                violationMap2[key].points += v.points;
                violationMap2[key].count += 1;
              });
            });
            const topViol2 = Object.entries(violationMap2)
              .sort((a, b) => smsTopViolSort === 'POINTS' ? b[1].points - a[1].points : b[1].count - a[1].count)
              .slice(0, 6);
            const maxTopVal2 = Math.max(1, ...topViol2.map(([, d]) => smsTopViolSort === 'POINTS' ? d.points : d.count));

            // â"€â"€ Monthly bar chart data â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

              {/* â"€â"€ Dark Header â"€â"€ */}
              <div className="bg-slate-800 px-5 py-3 flex items-center justify-between gap-3" id="sms-combined-period">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert size={16} className="text-white"/>
                  </div>
                  <div className="[&>p:last-child]:hidden">
                    <div className="text-sm font-bold text-white">FMCSA SMS Performance</div>
                    <div className="text-xs text-slate-400">BASIC Scores  ·  Level Analysis  ·  OOS Summary</div>
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

              {/* â"€â"€ BASIC Scores Table with time sparklines â"€â"€ */}
              <div className="border-t border-slate-200">
                <div className="px-5 py-3 flex items-center justify-between gap-3 bg-white border-b border-slate-100 [&>span:last-of-type]:hidden">
                  <span className="text-base font-bold text-slate-700">FMCSA SMS BASIC Scores</span>
                  <div className="text-xs text-right text-slate-400 font-medium">Time-weighted  ·  24-month lookback</div>
                  <span className="text-[11px] text-slate-400 font-medium">Time-weighted  ·  24-month lookback  ·  Sparkline = 18-24M →' 12-18M →' 6-12M →' 0-6M</span>
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
                      const measure = basicEntry?.measure ?? '-';
                      const hasSufficientData = percentile !== 'N/A';
                      const pctNum = hasSufficientData ? parseInt(percentile) : 0;
                      const isAlert = hasSufficientData && pctNum >= row.threshold;
                      const isWarn = hasSufficientData && pctNum >= row.threshold * 0.75 && !isAlert;
                      const barColor = isAlert ? 'bg-red-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';
                      const deltaSign = row.delta > 0.05 ? '▲' : row.delta < -0.05 ? '▼' : '-';
                      const deltaCls = row.delta > 0.05 ? 'text-red-500' : row.delta < -0.05 ? 'text-emerald-600' : 'text-slate-400';
                      const isExpanded = expandedBasic === row.category;
                      const chartTab = basicChartView[row.category] ?? 'MEASURE';

                      // Bucket data by period - max 8 points (monthly <=6M, bi-monthly 12M, quarterly 24M)
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
                          : `${mnNames[bStart.getMonth()]}-${mnNames[bEnd.getMonth()]}\n${bEnd.getFullYear()}`;
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

                        {/* â"€â"€ Expanded dropdown chart â"€â"€ */}
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
                                      <span className="font-bold">Investigation Results</span><br/>Alert - carrier exceeds intervention threshold
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
                                      <p className="text-[11px] text-slate-400 text-center mb-3">Monthly inspection count for this BASIC category  ·  Last {getPeriodLabel(smsPeriod)}</p>
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
                  <div className="text-xs text-slate-400">Carrier: General  ·  UD/CI/HOS {'>='}65% alert  ·  VM/CS/HM/DF {'>='}80% alert  ·  Percentile 0 = best, 100 = worst</div>
                  <p className="text-[10px] text-slate-400">Carrier: General  ·  UD/CI/HOS {'>='}65% alert  ·  VM/CS/HM/DF {'>='}80% alert  ·  Percentile 0 = best, 100 = worst  ·  up = worse / down = improving vs prev period</p>
                </div>
              </div>

              {/* â"€â"€ Bento Grid: Bar Chart | OOS Donut | Top Violations | Level Comparison â"€â"€ */}
              <div className="border-t border-slate-200 bg-slate-50/40 p-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

                {/* Inspections Bar Chart - col-span-2 */}
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

              {/* â"€â"€ SMS Level Comparison - Bento 2-col card grid â"€â"€ */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-bold text-slate-700">SMS Inspection Levels</p>
                    <div className="text-xs text-slate-400">FMCSA Levels I-VIII  ·  Last {getPeriodLabel(smsPeriod)}  ·  Total: <span className="font-bold text-slate-600">{totalInsp}</span>  ·  OOS: <span className="font-bold text-red-600">{totalOos}</span></div>
                    <p className="text-[10px] text-slate-400">FMCSA Levels I-VIII  ·  Last {getPeriodLabel(smsPeriod)}  ·  Total: <span className="font-bold text-slate-600">{totalInsp}</span>  ·  OOS: <span className="font-bold text-red-600">{totalOos}</span></p>
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
            const sortIcon = (col: string) => metricsSort.col === col ? (metricsSort.dir === 'desc' ? ' →"' : ' ->') : '';

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
                                  <div className="text-xs font-bold uppercase tracking-wider">BASIC: {status.category.length > 18 ? status.category.substring(0, 18) + '...' : status.category}</div>
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
                                  ? 'Alert - carrier exceeds intervention threshold'
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
                                                const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : '-';
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

          {/* â"€â"€ SMS List Time Period Filter â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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
                        <span className="text-slate-400 text-xs">-</span>
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
                    { key: 'CLEAN', label: 'Clean', value: listStats.clean, sub: `${cleanPct}% pass rate`, color: 'emerald', icon: '✓"' },
                    { key: 'OOS', label: 'Out of Service', value: listStats.oos, sub: `${oosPct}% OOS rate`, color: 'red', icon: '⛔"' },
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
                      Showing <span className="font-bold text-slate-700">{Math.min((page - 1) * rowsPerPage + 1, listFiltered.length)}-{Math.min(page * rowsPerPage, listFiltered.length)}</span> of <span className="font-bold text-slate-700">{listFiltered.length}</span>
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
                                ? <div className="text-[10px] text-amber-600 truncate" title={record.powerUnitDefects}>{record.powerUnitDefects.slice(0,22)}...</div>
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
                          <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 text-xs">...</span>
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

                {/* â"€â"€ Inspection Detail Popup â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

                        {/* â"€â"€ Header â"€â"€ */}
                        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h2 className="text-xl font-black text-slate-900">Inspection Detail - {r.id}</h2>
                              <p className="text-sm text-slate-500 mt-0.5">{r.date} · Level {levelNum} · {locationStr}</p>
                            </div>
                            <button onClick={() => setSmsPopupRecord(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        </div>

                        <div className="overflow-y-auto flex-1">

                          {/* â"€â"€ Info 3-col grid â"€â"€ */}
                          <div className="grid grid-cols-3 gap-6 px-6 py-5 border-b border-slate-100">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Driver</p>
                              <p className="text-sm font-bold text-slate-900">{r.driver}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">License</p>
                              <p className="text-sm font-bold text-slate-900 font-mono">{r.driverLicense || '-'}</p>
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
                                {r.startTime ? `${r.startTime}${r.endTime ? ` - ${r.endTime}` : ''}` : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Severity Rate</p>
                              <p className={`text-sm font-black ${maxSev >= 7 ? 'text-red-600' : maxSev >= 4 ? 'text-amber-600' : 'text-slate-800'}`}>{avgSev}</p>
                            </div>
                          </div>

                          {/* â"€â"€ Status badges â"€â"€ */}
                          <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-slate-100">
                            {!r.isClean && <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border border-amber-400 text-amber-700 bg-amber-50">VIOLATIONS FOUND</span>}
                            {r.isClean && <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-400 text-emerald-700 bg-emerald-50">✓" CLEAN</span>}
                            {r.hasOOS && <span className="inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border border-red-400 text-red-700 bg-red-50">OOS</span>}
                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border ${driverPassed ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-red-300 text-red-700 bg-red-50'}`}>
                              DRIVER: {driverPassed ? 'PASSED' : 'FAILED'}
                            </span>
                            <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-bold border ${vehiclePassed ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-red-300 text-red-700 bg-red-50'}`}>
                              VEHICLE: {vehiclePassed ? 'PASSED' : 'FAILED'}
                            </span>
                          </div>

                          {/* â"€â"€ Defects Found â"€â"€ */}
                          {r.powerUnitDefects && (
                            <div className="mx-6 my-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1.5">Defects Found</p>
                              <p className="text-sm text-slate-700"><span className="font-semibold">Power Unit:</span> {r.powerUnitDefects}</p>
                              {r.trailerDefects && <p className="text-sm text-slate-700 mt-0.5"><span className="font-semibold">Trailer:</span> {r.trailerDefects}</p>}
                            </div>
                          )}

                          {/* â"€â"€ Units Inspected â"€â"€ */}
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
                                        <td className="px-3 py-2.5 text-xs font-semibold text-slate-700 capitalize">{u.type || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-blue-600">{u.make || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold text-slate-800">{u.license || '-'}</td>
                                        <td className="px-3 py-2.5 text-[11px] font-mono text-slate-400">{u.vin || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {/* â"€â"€ Violations table â"€â"€ */}
                          <div className="px-6 pb-4">
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                              Violations ({r.violations?.length || 0})
                            </p>
                            {r.isClean || !r.violations?.length ? (
                              <div className="flex items-center gap-3 py-6 px-4 rounded-xl bg-emerald-50 border border-emerald-200">
                                <div className="w-9 h-9 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-black text-lg">✓"</div>
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
                                        <td className="px-3 py-2.5 font-mono text-xs text-blue-600 font-bold whitespace-nowrap">{v.code || v.violationCode || '-'}</td>
                                        <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{v.category || '-'}</td>
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
                                            : <span className="text-slate-300 text-xs">-</span>}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* â"€â"€ SMS Points â"€â"€ */}
                          <div className="mx-6 mb-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SMS Points</p>
                            <div className="flex items-center gap-6 text-sm">
                              <span className="text-slate-600">Vehicle: <span className={`font-black text-base ml-1 ${vehPtsP > 0 ? 'text-red-600' : 'text-slate-400'}`}>{vehPtsP}</span></span>
                              <span className="text-slate-600">Driver: <span className={`font-black text-base ml-1 ${drvPtsP > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{drvPtsP}</span></span>
                              <span className="text-slate-600">Carrier: <span className={`font-black text-base ml-1 ${carrPtsP > 100 ? 'text-red-700' : carrPtsP > 0 ? 'text-slate-800' : 'text-slate-400'}`}>{carrPtsP}</span></span>
                            </div>
                          </div>

                          {/* â"€â"€ Attached Documents â"€â"€ */}
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
                                  <p className="text-sm font-bold text-slate-800">Inspection Report - {r.id}</p>
                                  <p className="text-[11px] text-slate-500">Level {levelNum}  ·  {r.date}  ·  {locationStr}</p>
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
                                    <p className="text-[11px] text-slate-500 truncate">{v.category} - {v.description}</p>
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
          tickets:    cvorInspections.filter(i => (((i as any).tickets || []).length > 0)).length,
          ticketsCount: cvorInspections.reduce((s, i) => s + (((i as any).tickets || []).length), 0),
          ticketsTotal: cvorInspections.reduce((s, i) => s + ((i as any).tickets || []).reduce((a: number, t: any) => a + (t.fineAmount || 0), 0), 0),
        };
        void cvorStats;
        // Cross-pull context: how many of our pulls "see" these inspections + the
        // overall inspection date range. Each pull is a 24-month rolling window
        // ending on its reportDate; an inspection is in the pull if its date is
        // inside that window.
        const cvorListContext = (() => {
          const dates = cvorInspections.map(i => i.date).filter(Boolean).sort();
          const earliest = dates[0] || null;
          const latest = dates[dates.length - 1] || null;
          const pullsCovering = cvorPeriodicReports.filter(p => {
            const end = new Date(p.reportDate);
            const start = new Date(end); start.setMonth(start.getMonth() - 24);
            return cvorInspections.some(i => {
              const d = new Date(i.date);
              return d >= start && d <= end;
            });
          });
          return {
            earliest,
            latest,
            pullsCount: pullsCovering.length,
            totalPulls: cvorPeriodicReports.length,
          };
        })();
        void cvorListContext;
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
            case 'CLEAN':   matchesFilter = insp.isClean; break;
            case 'OOS':     matchesFilter = insp.hasOOS; break;
            case 'VEHICLE': matchesFilter = insp.hasVehicleViolations; break;
            case 'DRIVER':  matchesFilter = insp.hasDriverViolations; break;
            case 'SEVERE':  matchesFilter = insp.violations.some(v => v.severity >= 7); break;
            case 'TICKETS': matchesFilter = (((insp as any).tickets || []).length > 0); break;
            default: matchesFilter = true;
          }
          return matchesSearch && matchesFilter;
        });
        // ── Build PDF-faithful detail rows for the All-CVOR list (mirrors pull-by-pull) ──
        const cvorListDetailRows = cvorFilteredData.map((record, ri) => {
          const veh = record.cvorPoints?.vehicle ?? (record.violations||[]).filter((v:any)=>!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
          const dvr = record.cvorPoints?.driver  ?? (record.violations||[]).filter((v:any)=>!!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
          const cvr = record.cvorPoints?.cvor ?? veh + dvr;
          const primaryUnit = (record as any).units?.[0];
          const cats = new Map<string, { isOos: boolean; pts: number }>();
          for (const violation of (record.violations || [])) {
            const label = (violation as any).category || 'Other';
            const cur = cats.get(label);
            if (!cur) cats.set(label, { isOos: !!(violation as any).oos, pts: violation.points || 0 });
            else cats.set(label, { isOos: cur.isOos || !!(violation as any).oos, pts: cur.pts + (violation.points || 0) });
          }
          const categories = Array.from(cats.entries()).map(([label, info]) => ({ label, ...info }));
          const status = record.hasOOS ? 'OOS' : record.isClean ? 'OK' : 'DEFECT';
          const timestamp = new Date(`${record.date}T${(record as any).startTime || '00:00'}`).getTime();
          return {
            id: `cvlist-${record.id}-${ri}`,
            record,
            pts: { veh, dvr, cvr },
            date: record.date,
            time: (record as any).startTime && (record as any).endTime
              ? `${(record as any).startTime} - ${(record as any).endTime}`
              : (record as any).startTime || '--',
            timestamp,
            report: record.id,
            locationCity: (record as any).location?.city || record.state || '--',
            locationRegion: (record as any).location ? `${(record as any).location.province}, CAN` : `${record.state}, CAN`,
            driverName: record.driver?.split(',')[0] || 'Unknown driver',
            driverId: (record as any).driverLicense || (record as any).driverId || '--',
            vehicleName: primaryUnit?.license || record.vehiclePlate || '--',
            defectText: (record as any).powerUnitDefects || (record.isClean ? 'No defects' : 'No defect details'),
            violationCount: (record.violations || []).length,
            vehPts: veh ?? 0,
            dvrPts: dvr ?? 0,
            cvorPts: cvr,
            status,
            hasOos: !!record.hasOOS,
            isClean: !!record.isClean,
            categories,
            violations: record.violations || [],
            tickets: (record as any).tickets || [],
            ticketCount: ((record as any).tickets || []).length,
            totalFine: ((record as any).tickets || []).reduce((s:number,t:any)=>s+(t.fineAmount||0), 0),
          };
        });
        const cvorListSortedRows = [...cvorListDetailRows].sort((a, b) => {
          const dir = cvorListSort.dir === 'asc' ? 1 : -1;
          const get = (r: typeof cvorListDetailRows[number]): string | number => {
            switch (cvorListSort.col) {
              case 'date': return r.timestamp;
              case 'report': return r.report;
              case 'location': return `${r.locationCity} ${r.locationRegion}`;
              case 'driver': return `${r.driverName} ${r.driverId}`;
              case 'vehicle': return `${r.vehicleName} ${r.defectText}`;
              case 'violations': return r.violationCount;
              case 'vehPts': return r.vehPts;
              case 'dvrPts': return r.dvrPts;
              case 'cvorPts': return r.cvorPts;
              case 'status': return r.status;
              default: return r.timestamp;
            }
          };
          const av = get(a); const bv = get(b);
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
          return String(av).localeCompare(String(bv)) * dir;
        });
        const cvorListPagedRows = cvorListSortedRows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
        void cvorListPagedRows;

        // Latest pull drives the headline CVOR rating + numbers shown on the main card,
        // so the "Latest Pull" banner above stays consistent with the data displayed below.
        const _latestPull = cvorPeriodicReports[cvorPeriodicReports.length - 1];
        const cvorRating = _latestPull?.rating ?? carrierProfile.cvorAnalysis.rating;
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

          // Category-specific stats - computed dynamically from period-filtered data
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

          // Monthly measure history - rolling window approach (same as SMS chart)
          // Each snapshot computes total points / inspections over a rolling periodMonths window
          // As older data drops off and newer data comes in, the measure changes →' dynamic chart
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
                            ? 'Show Cause - exceeds show cause threshold'
                            : val >= cvorThresholds.intervention
                            ? 'Audit - carrier exceeds intervention threshold'
                            : val >= cvorThresholds.warning
                            ? 'Warning - approaching intervention threshold'
                            : 'OK - within acceptable range'}
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
                                    const deltaStr = delta > 0 ? `+${delta.toFixed(2)}` : delta < 0 ? delta.toFixed(2) : '-';
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
              <span className="font-mono font-bold">December 15, 2025 - 3:42 PM EST</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-rose-600">
              <Upload size={14} />
              <span className="font-semibold">Last Uploaded:</span>
              <span className="font-mono font-bold">December 10, 2025 - 11:15 AM EST</span>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════
               LATEST PULL SNAPSHOT — single merged card containing CVOR
               Performance, Intervention & Event Details, and Travel
               Kilometric Information. Inner sections sit flush with no gap
               and a shared border so the three look like one component.
          ══════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-200">
            {/* Latest-pull banner — tight, single line, white-on-blue */}
            <div className="flex items-center justify-between gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert size={14} className="shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">Latest Pull</span>
                <span className="h-3 w-px bg-white/40"/>
                <span className="text-[12px] font-semibold truncate">CVOR Performance · Intervention &amp; Event Details · Travel Kilometric Information</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider opacity-80 font-semibold whitespace-nowrap">All sections below reflect the most recent pull</span>
            </div>

          {/* ══════════════════════════════════════════════════════════════
               CVOR PERFORMANCE SUMMARY - top-of-tab overview card
          ══════════════════════════════════════════════════════════════ */}
          {(() => {
            // Drive the main CVOR Performance card from the latest pull so it matches the
            // "Latest Pull" banner above it. Fall back to carrierProfile if (somehow) no pulls.
            const lp = cvorPeriodicReports[cvorPeriodicReports.length - 1];
            const carrierCounts = carrierProfile.cvorAnalysis.counts;

            const col = lp
              ? { percentage: lp.colContrib, weight: 40 }
              : carrierProfile.cvorAnalysis.collisions;
            const con = lp
              ? { percentage: lp.conContrib, weight: 40 }
              : carrierProfile.cvorAnalysis.convictions;
            const ins = lp
              ? { percentage: lp.insContrib, weight: 20 }
              : carrierProfile.cvorAnalysis.inspections;

            // Per-pull counts replace the hard-coded carrierProfile counts. We keep the
            // milesByPeriod map from the carrier profile (used by the Mileage period filter)
            // since pulls only carry their own 24-month totals, not per-period breakdowns.
            const cts = lp
              ? {
                  ...carrierCounts,
                  collisions:                lp.collisionEvents,
                  convictions:               lp.convictionEvents,
                  oosOverall:                lp.oosOverall,
                  oosVehicle:                lp.oosVehicle,
                  oosDriver:                 lp.oosDriver,
                  trucks:                    lp.trucks,
                  onMiles:                   lp.onMiles,
                  canadaMiles:               lp.canadaMiles,
                  totalCanadaMiles:          lp.onMiles + lp.canadaMiles,
                  totalMiles:                lp.totalMiles,
                  collisionPointsWithPoints: lp.collWithPoints,
                  collisionPointsWithoutPoints: lp.collWithoutPoints,
                  totalCollisionPoints:      lp.totalCollisionPoints,
                  convictionPoints:          lp.convictionPoints,
                }
              : carrierCounts;

            // % of threshold used — taken directly from the pull when available so it
            // exactly matches the Pull Snapshot tiles below.
            const colPct = lp ? lp.colPctOfThresh : +(col.percentage / (col.weight / 100)).toFixed(2);
            const conPct = lp ? lp.conPctOfThresh : +(con.percentage / (con.weight / 100)).toFixed(2);
            const insPct = lp ? lp.insPctOfThresh : +(ins.percentage / (ins.weight / 100)).toFixed(2);

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

            // Full-spectrum gradient (green →' yellow →' orange →' red →' deep red)
            const grad = 'linear-gradient(to right,#22c55e 0%,#eab308 28%,#f97316 45%,#ef4444 70%,#991b1b 100%)';

            // Date range from pulls
            const fmtD = (s: string) => new Date(s).toLocaleDateString('en-US', { month:'short', year:'numeric' });
            const dateRange = `${fmtD(cvorPeriodicReports[0].reportDate)} to ${fmtD(cvorPeriodicReports[cvorPeriodicReports.length-1].reportDate)}`;

            // Recommended actions
            const critActions: {label: string; desc: string}[] = [];
            if (cvorRating >= cvorThresholds.showCause)
              critActions.push({ label:'Show Cause Hearing', desc:'CVOR rating exceeds Show Cause threshold - MTO hearing required immediately' });
            else if (cvorRating >= cvorThresholds.intervention)
              critActions.push({ label:'MTO Audit Scheduled', desc:'Rating exceeds intervention threshold - prepare compliance documentation for audit' });
            if (insPct >= cvorThresholds.showCause)
              critActions.push({ label:'Inspection Score Critical', desc:'Inspection score exceeds Show Cause threshold - review vehicle maintenance program immediately' });
            else if (insPct >= cvorThresholds.intervention)
              critActions.push({ label:'Improve Inspection Pass Rate', desc:'Increase pre-trip inspection quality and frequency to reduce OOS events' });
            if (conPct >= cvorThresholds.intervention)
              critActions.push({ label:'Address HOS & Conviction Violations', desc:'Review Hours-of-Service compliance and implement mandatory driver training' });
            if (cts.oosVehicle > cvorOosThresholds.vehicle)
              critActions.push({ label:'Reduce Vehicle OOS Rate', desc:`Vehicle OOS ${cts.oosVehicle}% exceeds ${cvorOosThresholds.vehicle}% threshold - increase pre-trip inspections` });
            if (cts.oosOverall > cvorOosThresholds.overall)
              critActions.push({ label:'Reduce Overall OOS Rate', desc:`Overall OOS ${cts.oosOverall}% exceeds ${cvorOosThresholds.overall}% threshold` });

            const cvorStatusRows = [
              { status: 'OK', color: '#16a34a', overall: `< ${cvorThresholds.warning}%`, desc: 'Performance within acceptable range. No MTO action required.' },
              { status: 'Warning', color: '#b45309', overall: `${cvorThresholds.warning}% - ${(cvorThresholds.intervention - 0.1).toFixed(1)}%`, desc: 'Approaching intervention threshold. Monitor closely and implement corrective measures.' },
              { status: 'Audit', color: '#d97706', overall: `${cvorThresholds.intervention}% - ${(cvorThresholds.showCause - 0.1).toFixed(1)}%`, desc: 'Exceeds intervention threshold. Prepare for MTO compliance audit.' },
              { status: 'Show Cause', color: '#dc2626', overall: `${cvorThresholds.showCause}% - ${(cvorThresholds.seizure - 0.1).toFixed(1)}%`, desc: 'Critical threshold band. MTO hearing and suspension risk.' },
              { status: 'Seizure', color: '#7f1d1d', overall: `${cvorThresholds.seizure}% and above`, desc: 'Highest enforcement band. Registration seizure risk and immediate action required.' },
            ];

            const cvorCategoryStatusRows = [
              { status: 'OK', color: '#16a34a', col: `< ${cvorThresholds.warning}%`, con: `< ${cvorThresholds.warning}%`, ins: `< ${cvorThresholds.warning}%` },
              { status: 'Warning', color: '#b45309', col: `${cvorThresholds.warning}% - ${(cvorThresholds.intervention - 0.1).toFixed(1)}%`, con: `${cvorThresholds.warning}% - ${(cvorThresholds.intervention - 0.1).toFixed(1)}%`, ins: `${cvorThresholds.warning}% - ${(cvorThresholds.intervention - 0.1).toFixed(1)}%` },
              { status: 'Audit', color: '#d97706', col: `${cvorThresholds.intervention}% - ${(cvorThresholds.showCause - 0.1).toFixed(1)}%`, con: `${cvorThresholds.intervention}% - ${(cvorThresholds.showCause - 0.1).toFixed(1)}%`, ins: `${cvorThresholds.intervention}% - ${(cvorThresholds.showCause - 0.1).toFixed(1)}%` },
              { status: 'Show Cause', color: '#dc2626', col: `${cvorThresholds.showCause}% - ${(cvorThresholds.seizure - 0.1).toFixed(1)}%`, con: `${cvorThresholds.showCause}% - ${(cvorThresholds.seizure - 0.1).toFixed(1)}%`, ins: `${cvorThresholds.showCause}% - ${(cvorThresholds.seizure - 0.1).toFixed(1)}%` },
              { status: 'Seizure', color: '#7f1d1d', col: `${cvorThresholds.seizure}% and above`, con: `${cvorThresholds.seizure}% and above`, ins: `${cvorThresholds.seizure}% and above` },
            ];

            // Level comparison data (all CVOR inspections, no date filter)
            const cvorLvls = [
              { level:'Level 1', name:'Level 1 - Full Inspection' },
              { level:'Level 2', name:'Level 2 - Walk-Around' },
              { level:'Level 3', name:'Level 3 - Driver/Credentials' },
              { level:'Level 4', name:'Level 4 - Special Inspections' },
              { level:'Level 5', name:'Level 5 - Vehicle Only' },
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
              <div className="bg-white">

                {/* â"€â"€â"€ HEADER â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <ShieldAlert size={15} className="text-slate-600"/>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">CVOR Performance</div>
                      <div className="text-[11px] text-slate-500">{dateRange} - {cvorPeriod === 'All' ? 'All Pulls' : cvorPeriod}</div>
                    </div>
                  </div>
                  <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                    {(['Monthly','Quarterly','Semi-Annual','Annual','All'] as const).map(p => (
                      <button key={p} onClick={() => setCvorPeriod(p)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all ${cvorPeriod===p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-slate-100">

                  {/* â"€â"€â"€ OVERALL CVOR RATING â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

                    {/* â"€â"€ Gradient bar â"€â"€ */}
                    {(() => {
                      const hoverZones: { label: string; start: number; end: number; color: string; textColor: string; bg: string; border: string; action: string; desc: string }[] = [
                        { label:'OK',         start:0,                          end:cvorThresholds.warning,      color:'#16a34a', textColor:'#14532d', bg:'bg-emerald-50', border:'border-emerald-300', action:'No MTO action required.', desc:`Performance within acceptable range (0-${cvorThresholds.warning}%). Continue monitoring.` },
                        { label:'WARNING',    start:cvorThresholds.warning,     end:cvorThresholds.intervention, color:'#b45309', textColor:'#78350f', bg:'bg-yellow-50',  border:'border-yellow-300',  action:'Monitor & implement corrective measures.', desc:`Approaching intervention threshold (${cvorThresholds.warning}-${cvorThresholds.intervention}%). MTO may issue advisory letter.` },
                        { label:'AUDIT',      start:cvorThresholds.intervention,end:cvorThresholds.showCause,    color:'#d97706', textColor:'#92400e', bg:'bg-amber-50',   border:'border-amber-300',   action:'Prepare for MTO compliance audit.', desc:`Exceeds intervention threshold (${cvorThresholds.intervention}-${cvorThresholds.showCause}%). MTO will schedule a compliance audit.` },
                        { label:'SHOW CAUSE', start:cvorThresholds.showCause,   end:cvorThresholds.seizure,      color:'#dc2626', textColor:'#7f1d1d', bg:'bg-red-50',     border:'border-red-300',     action:'MTO hearing - CVOR suspension risk.', desc:`Exceeds Show Cause threshold (${cvorThresholds.showCause}-${cvorThresholds.seizure}%). MTO hearing required - CVOR may be suspended.` },
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
                                    <div className="hidden group-hover/zone:block absolute z-50 pointer-events-none"
                                      style={{ bottom:'calc(100% + 14px)', left:'50%', transform:'translateX(-50%)', width:248 }}>
                                      <ScoreBandHoverCard
                                        title={z.label}
                                        range={`${z.start}% - ${z.end}%`}
                                        accentColor={z.color}
                                        current={isCurrent ? { label: 'Current Rating', value: `${cvorRating.toFixed(2)}%` } : undefined}
                                        description={z.desc}
                                        detailRows={[
                                          { label: 'Required Action', value: z.action, valueColor: z.color },
                                          { label: 'Current Status', value: rl(cvorRating), valueColor: rc(cvorRating) as string },
                                          { label: 'Audit Threshold', value: `${cvorThresholds.intervention}%` },
                                          { label: 'Show Cause', value: `${cvorThresholds.showCause}%` },
                                        ]}
                                        thresholdsTitle="CVOR Thresholds"
                                        thresholds={[
                                          { label: 'Warning', value: `${cvorThresholds.warning}%`, color: '#fbbf24' },
                                          { label: 'Audit', value: `${cvorThresholds.intervention}%`, color: '#f97316' },
                                          { label: 'Show Cause', value: `${cvorThresholds.showCause}%`, color: '#f87171' },
                                          { label: 'Seizure', value: `${cvorThresholds.seizure}%`, color: '#fca5a5' },
                                        ]}
                                        thresholdColumns={2}
                                      />
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
                                Currently in {currentZone.label} zone ({currentZone.start}%-{currentZone.end}%)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500">{currentZone.action}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* â"€â"€â"€ CATEGORY BLOCKS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                  <div className="px-5 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {([
                      { key:'col', label:'Collisions',  pct:colPct, weight:col.weight, detail1:`${cts.collisions} collisions`, detail2:`${cts.totalCollisionPoints} pts` },
                      { key:'con', label:'Convictions', pct:conPct, weight:con.weight, detail1:`${cts.convictions} convictions`, detail2:`${cts.convictionPoints} pts` },
                      { key:'ins', label:'Inspections', pct:insPct, weight:ins.weight, detail1:`OOS rate`, detail2:`${cts.oosOverall}%` },
                    ] as {key:string;label:string;pct:number;weight:number;detail1:string;detail2:string}[]).map(({ key, label, pct, weight, detail1, detail2 }) => (
                      <div key={key} className={`relative rounded-2xl border p-5 ${tileBg(pct)} group/card cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5`}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${rb(pct)}`}>{rl(pct)}</span>
                        </div>
                        <div className="text-[48px] leading-none font-black mb-3 tabular-nums" style={{ color: rc(pct) }}>
                          {pct.toFixed(1)}%
                        </div>
                        <div className="text-[12px] text-slate-600 mb-1">{detail1}  -  {detail2}</div>
                        <div className="text-[11px] text-slate-500 mb-3">{rl(pct)}  -  {weight}% weight</div>
                        <div className="relative">
                          <div className="relative h-[8px] rounded-full overflow-hidden" style={{ background: grad, boxShadow:'inset 0 1px 3px rgba(0,0,0,0.20)' }}>
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background:'linear-gradient(to bottom,rgba(255,255,255,0.30),transparent)' }}/>
                            <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full" style={{ left:`${Math.min(pct,100)}%`, right:0 }}/>
                            <div className="absolute top-0 bottom-0 w-[2.5px] bg-white shadow" style={{ left:`${Math.min(pct,100)}%`, transform:'translateX(-50%)' }}/>
                            {[cvorThresholds.warning, cvorThresholds.intervention].map(t => (
                              <div key={t} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left:`${t}%` }}/>
                            ))}
                          </div>
                          <div className="flex justify-between text-[9px] mt-1 text-slate-400 font-semibold">
                            <span>WARN {cvorThresholds.warning}%</span>
                            <span>AUDIT {cvorThresholds.intervention}%</span>
                            <span>SC {cvorThresholds.showCause}%</span>
                          </div>
                        </div>
                        {/* Card hover tooltip - dark navy popup */}
                        <div className="hidden group-hover/card:block absolute z-50 pointer-events-none"
                          style={{ bottom:'calc(100% + 8px)', left:'50%', transform:'translateX(-50%)', width:230 }}>
                            <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
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
                                  <span className="font-bold text-slate-800">{weight}%</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-400">{detail1}</span>
                                  <span className="font-bold text-slate-800">{detail2}</span>
                                </div>
                                <div className="pt-1.5 border-t border-slate-100">
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
                                        <span className="text-[10px] font-bold font-mono text-slate-700">{th.v.toFixed(1)}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                style={{ borderLeft:'6px solid transparent', borderRight:'6px solid transparent', borderTop:'6px solid white' }}/>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Thresholds inline row */}
                  <div className="flex items-center justify-between pt-3 text-[10px]">
                    <span className="text-slate-400">
                      <span className="font-semibold text-slate-500">CVOR Thresholds</span>
                      &nbsp; · &nbsp;<span style={{color:'#b45309'}}>{cvorThresholds.warning}% Warning</span>
                      &nbsp; · &nbsp;<span style={{color:'#d97706'}}>{cvorThresholds.intervention}% Audit</span>
                      &nbsp; · &nbsp;<span style={{color:'#dc2626'}}>{cvorThresholds.showCause}% Show Cause</span>
                      &nbsp; · &nbsp;<span style={{color:'#7f1d1d'}}>{cvorThresholds.seizure}% Seizure</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setCvorThreshOpen(open => !open)}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      Threshold Info {cvorThreshOpen ? '▴' : '▾'}
                    </button>
                  </div>
                  {cvorThreshOpen && (
                    <div className="mt-2">
                      <div className="rounded-t-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-[10px] leading-relaxed text-slate-500">
                        CVOR status is determined by the overall rating thresholds below. Category tiles also use the same warning, audit, show-cause, and seizure bands when showing how strongly
                        <span className="font-semibold text-slate-700"> Collisions</span>, <span className="font-semibold text-slate-700"> Convictions</span>, and <span className="font-semibold text-slate-700"> Inspections</span> are affecting the carrier&apos;s CVOR profile.
                      </div>
                      <div className="space-y-3 rounded-b-lg border border-t-0 border-slate-200 bg-white p-3">
                        <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                          <div className="grid grid-cols-[0.9fr_1fr_1.8fr] bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                            <div className="px-3 py-1.5">CVOR Status</div>
                            <div className="px-3 py-1.5">Overall Rating</div>
                            <div className="px-3 py-1.5">Description</div>
                          </div>
                          {cvorStatusRows.map((row, index) => (
                            <div key={row.status} className={`grid grid-cols-[0.9fr_1fr_1.8fr] border-t border-slate-100 ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                              <div className="px-3 py-1.5 font-bold" style={{ color: row.color }}>{row.status}</div>
                              <div className="px-3 py-1.5 font-mono text-slate-600">{row.overall}</div>
                              <div className="px-3 py-1.5 text-slate-500">{row.desc}</div>
                            </div>
                          ))}
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-200 text-[10px]">
                          <div className="grid grid-cols-4 bg-slate-100 font-bold uppercase tracking-wider text-slate-500">
                            <div className="px-3 py-1.5">Status</div>
                            <div className="px-3 py-1.5">Collisions</div>
                            <div className="px-3 py-1.5">Convictions</div>
                            <div className="px-3 py-1.5">Inspections</div>
                          </div>
                          {cvorCategoryStatusRows.map((row, index) => (
                            <div key={row.status} className={`grid grid-cols-4 border-t border-slate-100 ${index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                              <div className="px-3 py-1.5 font-bold" style={{ color: row.color }}>{row.status}</div>
                              <div className="px-3 py-1.5 font-mono text-slate-600">{row.col}</div>
                              <div className="px-3 py-1.5 font-mono text-slate-600">{row.con}</div>
                              <div className="px-3 py-1.5 font-mono text-slate-600">{row.ins}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  </div>

                  {/* â"€â"€â"€ OUT-OF-SERVICE RATES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

                  {/* â"€â"€â"€ RECOMMENDED ACTIONS (collapsible) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

                  {/* â"€â"€â"€ MILEAGE SUMMARY â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
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

                  {/* â"€â"€â"€ CVOR RATING COMPARISON â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€ */}
                  <div className="px-5 py-4 space-y-4">
                  {/* â"€â"€â"€ COLLISION + CONVICTION DETAIL BOXES (hover to reveal breakdown) â"€â"€â"€ */}
                  {(() => {
                    const cd = carrierProfile.cvorAnalysis.collisionDetails;
                    const cv = carrierProfile.cvorAnalysis.convictionDetails;
                    const collRows: { label: string; value: number; color: string }[] = [
                      { label: 'With Points',     value: cd.withPoints,     color: '#dc2626' },
                      { label: 'Not Pointed',     value: cd.notPointed,     color: '#94a3b8' },
                      { label: 'Fatal',           value: cd.fatal,          color: '#e2e8f0' },
                      { label: 'Personal Injury', value: cd.personalInjury, color: '#f59e0b' },
                      { label: 'Property Damage', value: cd.propertyDamage, color: '#3b82f6' },
                    ];
                    const convRows: { label: string; value: number; color: string }[] = [
                      { label: 'With Points', value: cv.withPoints, color: '#f59e0b' },
                      { label: 'Not Pointed', value: cv.notPointed, color: '#94a3b8' },
                      { label: 'Driver',      value: cv.driver,     color: '#a855f7' },
                      { label: 'Vehicle',     value: cv.vehicle,    color: '#6366f1' },
                      { label: 'Load',        value: cv.load,       color: '#10b981' },
                      { label: 'Other',       value: cv.other,      color: '#e2e8f0' },
                    ];

                    type Box = {
                      title: string;
                      total: number;
                      totalLabel: string;
                      monthsLabel: string;
                      fromDate: string;
                      toDate: string;
                      IconCmp: React.ComponentType<{ size?: number; className?: string }>;
                      iconBg: string;
                      iconColor: string;
                      headerBg: string;
                      totalColor: string;
                      rows: { label: string; value: number; color: string }[];
                    };
                    const boxes: Box[] = [
                      {
                        title: 'Collision Details', total: cd.total, totalLabel: 'Total Collisions',
                        monthsLabel: cd.monthsLabel, fromDate: cd.fromDate, toDate: cd.toDate,
                        IconCmp: Truck, iconBg: 'bg-red-50', iconColor: 'text-red-600', headerBg: '#dc2626',
                        totalColor: 'text-red-600', rows: collRows,
                      },
                      {
                        title: 'Conviction Details', total: cv.total, totalLabel: 'Total Convictions',
                        monthsLabel: cv.monthsLabel, fromDate: cv.fromDate, toDate: cv.toDate,
                        IconCmp: Scale, iconBg: 'bg-amber-50', iconColor: 'text-amber-600', headerBg: '#d97706',
                        totalColor: 'text-amber-600', rows: convRows,
                      },
                    ];

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {boxes.map(b => (
                          <div
                            key={b.title}
                            className="group/detail relative rounded-xl border border-slate-200 bg-white px-4 py-3 cursor-help hover:border-slate-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-8 h-8 rounded-lg ${b.iconBg} flex items-center justify-center flex-shrink-0`}>
                                  <b.IconCmp size={14} className={b.iconColor} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[12px] font-bold text-slate-900 truncate">{b.title}</div>
                                  <div className="text-[10px] text-slate-500">{b.monthsLabel}  ·  Hover for breakdown</div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className={`text-2xl font-black tabular-nums ${b.totalColor}`}>{b.total}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{b.totalLabel}</div>
                              </div>
                            </div>

                            {/* Hover popup - matches existing CVOR Rating Comparison tooltip pattern */}
                            <div
                              className="hidden group-hover/detail:flex absolute z-[100] pointer-events-none flex-col gap-0"
                              style={{ top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', width: 260 }}
                            >
                              <div
                                className="self-center w-0 h-0"
                                style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: '6px solid #0f172a' }}
                              />
                              <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background: '#0f172a' }}>
                                <div className="px-3 py-2 flex items-center justify-between" style={{ background: b.headerBg }}>
                                  <span className="text-white font-bold text-[11px] truncate">{b.title}</span>
                                  <span className="text-white/90 text-[11px] font-mono ml-1 flex-shrink-0">{b.total} total</span>
                                </div>
                                <div className="px-3 py-1.5 text-[10px] text-slate-400 border-b border-slate-700/60">
                                  {b.fromDate} â†' {b.toDate} ({b.monthsLabel})
                                </div>
                                <div className="px-3 py-2 space-y-1.5">
                                  {b.rows.map(r => (
                                    <div key={r.label} className="flex justify-between items-center">
                                      <span className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: r.color }} />
                                        {r.label}
                                      </span>
                                      <span className="text-[12px] font-bold tabular-nums" style={{ color: r.color }}>{r.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="rounded-xl border border-slate-200">
                    <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 rounded-t-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                          <ClipboardCheck size={12} className="text-amber-600"/>
                        </div>
                        <div>
                          <div className="text-[12px] font-bold text-slate-900">CVOR Rating Comparison</div>
                          <div className="text-[10px] text-slate-500">All Pulls  ·  Total {lvlTotal}  ·  OOS: {lvlOos}</div>
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

                  {/* â"€â"€â"€ COLLISION + CONVICTION BREAKDOWNS (two separate collapsible inner subsections) â"€â"€â"€ */}
                  {(() => {
                    const fmtNum = (n: number) => n.toLocaleString('en-US');
                    const fmt2 = (n: number) => n.toFixed(2);
                    const collisionRows = [
                      { period: 1, from: '2025-04-01', to: '2026-01-26', months: 9.87,  kmPerMonth: 1334629, events: 3, points: 6,  threshold: 79.04, pctSet: 7.59 },
                      { period: 2, from: '2024-05-07', to: '2025-03-31', months: 10.83, kmPerMonth: 1355579, events: 8, points: 10, threshold: 88.09, pctSet: 11.35 },
                      { period: 3, from: '2024-01-27', to: '2024-05-06', months: 3.33,  kmPerMonth: 1312112, events: 2, points: 4,  threshold: 26.22, pctSet: 15.26 },
                    ];
                    const convictionRows = [
                      { period: 1, from: '2025-04-01', to: '2026-01-26', months: 9.87,  kmPerMonth: 1334629, events: 8,  points: 18, threshold: 181.67, pctSet: 9.91 },
                      { period: 2, from: '2024-05-07', to: '2025-03-31', months: 10.83, kmPerMonth: 1355579, events: 17, points: 42, threshold: 202.47, pctSet: 20.74 },
                      { period: 3, from: '2024-01-27', to: '2024-05-06', months: 3.33,  kmPerMonth: 1312112, events: 4,  points: 11, threshold: 60.26,  pctSet: 18.25 },
                    ];
                    const sumTotals = (rows: typeof collisionRows) =>
                      rows.reduce(
                        (acc, r) => ({ months: acc.months + r.months, events: acc.events + r.events, points: acc.points + r.points }),
                        { months: 0, events: 0, points: 0 }
                      );
                    const weightedPct = (rows: typeof collisionRows, totalMonths: number) =>
                      +(rows.reduce((s, r) => s + r.pctSet * r.months, 0) / totalMonths).toFixed(2);
                    const colTotals = sumTotals(collisionRows);
                    const conTotals = sumTotals(convictionRows);
                    const colTotalPctSet = weightedPct(collisionRows, colTotals.months);
                    const conTotalPctSet = weightedPct(convictionRows, conTotals.months);

                    type Row = typeof collisionRows[number];
                    const renderBreakdownCard = (
                      title: string,
                      subtitle: string,
                      IconCmp: React.ComponentType<{ size?: number; className?: string }>,
                      iconBg: string,
                      iconColor: string,
                      isOpen: boolean,
                      setOpen: (fn: (o: boolean) => boolean) => void,
                      rows: Row[],
                      totals: { months: number; events: number; points: number },
                      totalPct: number,
                      accent: 'red' | 'amber',
                    ) => {
                      const accentText = accent === 'red' ? 'text-red-600' : 'text-amber-600';
                      return (
                        <div className="rounded-xl border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setOpen(o => !o)}
                            aria-expanded={isOpen}
                            className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-6 h-6 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                <IconCmp size={12} className={iconColor} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] font-bold text-slate-900">{title}</div>
                                <div className="text-[10px] text-slate-500">{subtitle}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {isOpen ? 'Hide' : 'Show'}
                              </span>
                              {isOpen
                                ? <ChevronUp size={14} className="text-slate-400" />
                                : <ChevronDown size={14} className="text-slate-400" />}
                            </div>
                          </button>
                          {isOpen && (
                            <>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      <th className="px-3 py-2 text-left">Period</th>
                                      <th className="px-3 py-2 text-left">From</th>
                                      <th className="px-3 py-2 text-left">To</th>
                                      <th className="px-3 py-2 text-right">Months</th>
                                      <th className="px-3 py-2 text-right">KM/Month</th>
                                      <th className="px-3 py-2 text-right">Events</th>
                                      <th className="px-3 py-2 text-right">Points</th>
                                      <th className="px-3 py-2 text-right">Threshold</th>
                                      <th className="px-3 py-2 text-right">% Set</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {rows.map(r => (
                                      <tr key={r.period} className="hover:bg-slate-50/60">
                                        <td className="px-3 py-2 font-bold text-blue-600 tabular-nums">{r.period}</td>
                                        <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.from}</td>
                                        <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.to}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-blue-600 tabular-nums">{fmt2(r.months)}</td>
                                        <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{fmtNum(r.kmPerMonth)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{r.events}</td>
                                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${accentText}`}>{r.points}</td>
                                        <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{fmt2(r.threshold)}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{fmt2(r.pctSet)}%</td>
                                      </tr>
                                    ))}
                                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                                      <td className="px-3 py-2 text-slate-900" colSpan={3}>Total</td>
                                      <td className="px-3 py-2 text-right text-slate-900 tabular-nums">{fmt2(totals.months)}</td>
                                      <td className="px-3 py-2 text-right text-slate-400">â€"</td>
                                      <td className="px-3 py-2 text-right text-slate-900 tabular-nums">{totals.events}</td>
                                      <td className={`px-3 py-2 text-right tabular-nums ${accentText}`}>{totals.points}</td>
                                      <td className="px-3 py-2 text-right text-slate-400">â€"</td>
                                      <td className={`px-3 py-2 text-right tabular-nums ${accentText}`}>{fmt2(totalPct)}%</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                              <p className="px-4 py-2 text-[10px] text-slate-500 italic border-t border-slate-100 bg-slate-50/40">
                                *Based on actual/estimated km rate per month reported by carrier
                              </p>
                            </>
                          )}
                        </div>
                      );
                    };

                    return (
                      <>
                        {renderBreakdownCard(
                          'Collision Breakdown by Kilometre Rate',
                          `${colTotals.events} events  ·  ${colTotals.points} points  ·  ${fmt2(colTotalPctSet)}% of threshold`,
                          AlertTriangle, 'bg-red-50', 'text-red-600',
                          cvorCollBreakdownOpen, setCvorCollBreakdownOpen,
                          collisionRows, colTotals, colTotalPctSet, 'red'
                        )}
                        {renderBreakdownCard(
                          'Conviction Breakdown by Kilometre Rate',
                          `${conTotals.events} events  ·  ${conTotals.points} points  ·  ${fmt2(conTotalPctSet)}% of threshold`,
                          Scale, 'bg-amber-50', 'text-amber-600',
                          cvorConvBreakdownOpen, setCvorConvBreakdownOpen,
                          convictionRows, conTotals, conTotalPctSet, 'amber'
                        )}
                      </>
                    );
                  })()}

                  {/* â"€â"€â"€ INSPECTION STATISTICS (collapsible inner subsection) â"€â"€â"€ */}
                  {(() => {
                    const inspStats = {
                      fromDate: '2024-01-27',
                      toDate: '2026-01-26',
                      monthsLabel: '24 Months',
                      cvsaInspections: 149,
                      vehiclesInspected: 220,
                      driversInspected: 149,
                      totalUnits: 369,
                      driverPoints: 2,
                      vehiclePoints: 45,
                      totalPoints: 46.37,
                      setThreshold: 59.08,
                      pctSetThreshold: 78.50,
                    };

                    const rows: { label: string; value: string | number; emphasis?: boolean; tone?: 'red' | 'amber' | 'default' }[] = [
                      { label: '# of CVSA inspections conducted',           value: inspStats.cvsaInspections },
                      { label: '# of Vehicles inspected',                   value: inspStats.vehiclesInspected },
                      { label: '# of Drivers inspected',                    value: inspStats.driversInspected },
                      { label: 'Total units inspected',                     value: inspStats.totalUnits, emphasis: true },
                      { label: '# of Driver points assigned (D)',           value: inspStats.driverPoints },
                      { label: '# of Vehicle points assigned (V)',          value: inspStats.vehiclePoints },
                      { label: 'Total inspection points (0.6875 Ã— D + V)',  value: inspStats.totalPoints.toFixed(2), emphasis: true },
                      { label: '# of Set inspection threshold points**',    value: inspStats.setThreshold.toFixed(2) },
                      { label: '% of Set Threshold',                        value: `${inspStats.pctSetThreshold.toFixed(1)}%`, emphasis: true, tone: inspStats.pctSetThreshold >= 70 ? 'red' : inspStats.pctSetThreshold >= 50 ? 'amber' : 'default' },
                    ];

                    return (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setCvorInspStatsOpen(o => !o)}
                          aria-expanded={cvorInspStatsOpen}
                          className="w-full px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <ClipboardCheck size={12} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12px] font-bold text-slate-900">Inspection Statistics</div>
                              <div className="text-[10px] text-slate-500">From {inspStats.fromDate} to {inspStats.toDate} ({inspStats.monthsLabel})</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {cvorInspStatsOpen ? 'Hide' : 'Show'}
                            </span>
                            {cvorInspStatsOpen
                              ? <ChevronUp size={14} className="text-slate-400" />
                              : <ChevronDown size={14} className="text-slate-400" />}
                          </div>
                        </button>
                        {cvorInspStatsOpen && (
                          <>
                            <table className="w-full text-xs">
                              <tbody className="divide-y divide-slate-100">
                                {rows.map(r => {
                                  const tone = r.tone ?? 'default';
                                  const valueColor =
                                    tone === 'red'   ? 'text-red-600'
                                    : tone === 'amber' ? 'text-amber-600'
                                    : r.emphasis ? 'text-slate-900' : 'text-slate-700';
                                  const isPct = r.label.startsWith('% of');
                                  return (
                                    <tr key={r.label} className={`hover:bg-slate-50/60 ${isPct ? 'bg-orange-50/40' : ''}`}>
                                      <td className={`px-4 py-2.5 ${isPct ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{r.label}</td>
                                      <td className={`px-4 py-2.5 text-right tabular-nums font-bold ${valueColor}`}>{r.value}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            <p className="px-4 py-2 text-[10px] text-slate-500 italic border-t border-slate-100 bg-slate-50/40">
                              **Inspection threshold value is based on number of drivers and vehicles inspected during the entire performance period.
                            </p>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  </div>

                </div>
              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════════
               INTERVENTION & EVENT DETAILS - PDF-faithful event table
               (Inspection / Collision / Conviction) - expandable rows
               + KPI cards, search, sortable columns, column toggles, pagination
          ══════════════════════════════════════════════════════════════ */}
          {(() => {
            const allEvents = cvorInterventionEvents;

            // KPI helpers
            const VEH_DEFECT_CATS = ['BRAKE SYSTEM', 'WHEELS/RIMS', 'COUPLING DEVICES', 'BODY', 'LOAD SECURITY', 'REGISTRATION', 'OFFICER DIRECTION'];
            const DRV_DEFECT_CATS = ['HOURS OF SERVICE', 'DRIVERS LICENCES', 'TRIP INSPECTION', 'CVOR/NSC'];
            const isClean = (e: CvorInterventionEvent) =>
              e.type === 'inspection' && (e.oosCount ?? 0) === 0 && (e.totalDefects ?? 0) === 0 &&
              (e.vehiclePoints ?? 0) === 0 && (e.driverPoints ?? 0) === 0;
            const hasOos = (e: CvorInterventionEvent) => (e.oosCount ?? 0) > 0;
            const hasVehIssue = (e: CvorInterventionEvent) =>
              (e.vehiclePoints ?? 0) > 0 || (e.defects ?? []).some(d => VEH_DEFECT_CATS.includes(d.category));
            const hasDriverIssue = (e: CvorInterventionEvent) =>
              (e.driverPoints ?? 0) > 0 || (e.defects ?? []).some(d => DRV_DEFECT_CATS.includes(d.category));
            const isSevere = (e: CvorInterventionEvent) => {
              const totalPts = (e.vehiclePoints ?? 0) + (e.driverPoints ?? 0) + (e.pointsTotal ?? 0);
              return totalPts >= 7 || (e.totalDefects ?? 0) >= 7;
            };
            const hasTicket = (e: CvorInterventionEvent) =>
              !!e.ticket || e.charged === 'Y' || e.collision?.driverCharged === 'Y';

            const kpiCounts = {
              all:        allEvents.length,
              clean:      allEvents.filter(isClean).length,
              oos:        allEvents.filter(hasOos).length,
              vehicle:    allEvents.filter(hasVehIssue).length,
              hosDriver:  allEvents.filter(hasDriverIssue).length,
              severe:     allEvents.filter(isSevere).length,
              tickets:    allEvents.filter(hasTicket).length,
            };

            const matchesKpi = (e: CvorInterventionEvent) => {
              switch (cvorEventKpiFilter) {
                case 'ALL':        return true;
                case 'CLEAN':      return isClean(e);
                case 'OOS':        return hasOos(e);
                case 'VEHICLE':    return hasVehIssue(e);
                case 'HOS_DRIVER': return hasDriverIssue(e);
                case 'SEVERE':     return isSevere(e);
                case 'TICKETS':    return hasTicket(e);
              }
            };

            const matchesSearch = (e: CvorInterventionEvent) => {
              const q = cvorEventSearch.trim().toLowerCase();
              if (!q) return true;
              const haystack = [
                e.cvir, e.ticket, e.location, e.driverName, e.driverLicence,
                e.vehicle1?.make, e.vehicle1?.unit, e.vehicle1?.plate,
                e.vehicle2?.make, e.vehicle2?.unit, e.vehicle2?.plate,
                e.type, e.date,
                e.collision?.collisionClass, e.collision?.microfilm,
                e.conviction?.offence, e.conviction?.microfilm, e.conviction?.ccmtaEquivalency,
                ...(e.defects ?? []).flatMap(d => [d.category, d.defect]),
              ].filter(Boolean).join(' ').toLowerCase();
              return haystack.includes(q);
            };

            const matchesType = (e: CvorInterventionEvent) =>
              cvorEventTypeFilter === 'ALL' ? true : e.type === cvorEventTypeFilter;

            const filtered = allEvents.filter(e => matchesKpi(e) && matchesType(e) && matchesSearch(e));

            // Sorting
            const getSortVal = (r: CvorInterventionEvent): string | number => {
              switch (cvorEventSort.col) {
                case 'date':          return new Date(r.date).getTime();
                case 'time':          return r.startTime ?? r.time ?? '';
                case 'type':          return r.type;
                case 'cvirOrTicket':  return r.cvir ?? r.ticket ?? '';
                case 'location':      return r.location ?? '';
                case 'driver':        return r.driverName ?? '';
                case 'driverLicence': return r.driverLicence ?? '';
                case 'vehicle1':      return r.vehicle1?.plate ?? '';
                case 'vehicle2':      return r.vehicle2?.plate ?? '';
                case 'level':         return r.level ?? -1;
                case 'vPts':          return r.vehiclePoints ?? 0;
                case 'dPts':          return (r.driverPoints ?? 0) + (r.pointsTotal ?? 0);
                case 'oos':           return r.oosCount ?? 0;
                case 'defects':       return r.totalDefects ?? 0;
                case 'charged':       return (r.charged === 'Y' || r.collision?.driverCharged === 'Y') ? 1 : 0;
                default:              return 0;
              }
            };
            const sorted = [...filtered].sort((a, b) => {
              const dir = cvorEventSort.dir === 'asc' ? 1 : -1;
              const av = getSortVal(a), bv = getSortVal(b);
              if (av < bv) return -1 * dir;
              if (av > bv) return 1 * dir;
              return 0;
            });

            // Pagination
            const totalPages = Math.max(1, Math.ceil(sorted.length / cvorEventRowsPerPage));
            const safePage = Math.min(cvorEventPage, totalPages);
            const paged = sorted.slice((safePage - 1) * cvorEventRowsPerPage, safePage * cvorEventRowsPerPage);

            const isVis = (id: string) => cvorEventColumns.find(c => c.id === id)?.visible !== false;

            const onSort = (col: string) => {
              setCvorEventSort(prev => prev.col === col
                ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { col, dir: 'asc' });
            };
            const SortIcon = ({ col }: { col: string }) => {
              if (cvorEventSort.col !== col) return <ChevronDown size={11} className="text-slate-300 inline -mt-0.5" />;
              return cvorEventSort.dir === 'asc'
                ? <ChevronUp size={11} className="text-blue-500 inline -mt-0.5" />
                : <ChevronDown size={11} className="text-blue-500 inline -mt-0.5" />;
            };
            const SortableTh = ({ col, label, className }: { col: string; label: string; className?: string }) => (
              <th className={`px-3 py-2.5 text-left ${className ?? ''}`}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSort(col); }}
                  className={`inline-flex items-center gap-1 hover:text-slate-700 transition-colors ${cvorEventSort.col === col ? 'text-slate-700' : ''}`}
                >
                  {label} <SortIcon col={col} />
                </button>
              </th>
            );

            const typeBadge = (t: CvorInterventionEvent['type']) => {
              if (t === 'inspection') return { cls: 'bg-blue-50 text-blue-700 border-blue-200',     IconCmp: ClipboardCheck, label: 'Inspection' };
              if (t === 'collision')  return { cls: 'bg-red-50 text-red-700 border-red-200',        IconCmp: Truck,         label: 'Collision'  };
              return                       { cls: 'bg-amber-50 text-amber-700 border-amber-200',   IconCmp: Scale,         label: 'Conviction' };
            };

            const fmtVeh = (v?: { make: string; unit: string; plate: string }) => {
              if (!v || (!v.make && !v.unit && !v.plate)) return '—';
              const top = [v.make, v.unit].filter(Boolean).join(' ');
              return { top: top || '—', plate: v.plate || '' };
            };

            const renderExpand = (e: CvorInterventionEvent) => {
              if (e.type === 'inspection') {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inspection Summary</div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">CVIR #</span><span className="font-mono font-bold text-slate-800">{e.cvir ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-mono text-slate-700">{e.date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-mono text-slate-700">{e.startTime} - {e.endTime}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Level</span><span className="font-bold text-slate-800">{e.level}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500"># of Vehicles</span><span className="font-bold text-slate-800">{e.numVehicles}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Co-Driver</span><span className="font-bold text-slate-800">{e.coDriver}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Impoundment</span><span className="font-bold text-slate-800">{e.impoundment}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Charged</span><span className={`font-bold ${e.charged === 'Y' ? 'text-red-600' : 'text-emerald-600'}`}>{e.charged}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Categories OOS*</span><span className={`font-bold ${(e.oosCount ?? 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>{e.oosCount ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Total Defects</span><span className={`font-bold ${(e.totalDefects ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{e.totalDefects ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Vehicle Points</span><span className={`font-bold ${(e.vehiclePoints ?? 0) > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{e.vehiclePoints ?? 0}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Driver Points</span><span className={`font-bold ${(e.driverPoints ?? 0) > 0 ? 'text-red-600' : 'text-slate-800'}`}>{e.driverPoints ?? 0}</span></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Driver &amp; Vehicles</div>
                      <div className="text-xs space-y-2">
                        <div>
                          <div className="text-slate-500">Driver</div>
                          <div className="font-bold text-slate-800">{e.driverName ?? '—'}</div>
                          <div className="font-mono text-slate-600 text-[11px]">{e.driverLicence ?? '—'} <span className="text-slate-400">({e.driverLicenceJurisdiction ?? '—'})</span></div>
                        </div>
                        {e.vehicle1 && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500">Vehicle 1</div>
                            <div className="font-bold text-slate-800">{e.vehicle1.make} {e.vehicle1.unit}</div>
                            <div className="font-mono text-slate-600 text-[11px]">{e.vehicle1.plate} <span className="text-slate-400">({e.vehicle1.jurisdiction})</span></div>
                          </div>
                        )}
                        {e.vehicle2 && (e.vehicle2.make || e.vehicle2.unit || e.vehicle2.plate) && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500">Vehicle 2</div>
                            <div className="font-bold text-slate-800">{e.vehicle2.make} {e.vehicle2.unit}</div>
                            <div className="font-mono text-slate-600 text-[11px]">{e.vehicle2.plate} <span className="text-slate-400">({e.vehicle2.jurisdiction})</span></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Defects ({e.defects?.length ?? 0})</div>
                      {e.defects && e.defects.length > 0 ? (
                        <ul className="space-y-1.5 text-xs">
                          {e.defects.map((d, i) => (
                            <li key={i} className="flex items-start gap-2">
                              {d.oos
                                ? <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">OOS</span>
                                : <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />}
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d.category}</div>
                                <div className={`text-[12px] font-medium ${d.oos ? 'text-red-700' : 'text-slate-700'}`}>{d.defect}</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-xs text-slate-500 italic">No defects recorded.</div>
                      )}
                    </div>
                  </div>
                );
              }
              if (e.type === 'collision' && e.collision) {
                const c = e.collision;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Collision Details</div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">Incident Date</span><span className="font-mono text-slate-700">{e.date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Incident Time</span><span className="font-mono text-slate-700">{e.time}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Class</span><span className="font-bold text-slate-800">{c.collisionClass}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Jurisdiction</span><span className="font-bold text-slate-800">{c.jurisdiction}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Location</span><span className="font-bold text-slate-800 text-right max-w-[60%] truncate">{e.location ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Ticket #</span><span className="font-mono text-slate-700">{e.ticket ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Microfilm #</span><span className="font-mono text-slate-700">{c.microfilm}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Driver Charged</span><span className={`font-bold ${c.driverCharged === 'Y' ? 'text-red-600' : 'text-emerald-600'}`}>{c.driverCharged}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Points</span><span className="font-bold text-red-600">{c.points}</span></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle &amp; Driver Action</div>
                      <div className="text-xs space-y-2">
                        <div>
                          <div className="text-slate-500">Vehicle</div>
                          <div className="font-mono text-slate-700">{e.vehicle1?.plate ?? '—'} <span className="text-slate-400">({e.vehicle1?.jurisdiction ?? '—'})</span></div>
                          <div className="text-slate-700">{c.vehicleAction}</div>
                          <div className="text-slate-500 text-[11px]">{c.vehicleCondition}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-slate-500">Driver</div>
                          <div className="font-bold text-slate-800">{e.driverName ?? '—'}</div>
                          <div className="font-mono text-slate-600 text-[11px]">{e.driverLicence ?? '—'} <span className="text-slate-400">({e.driverLicenceJurisdiction ?? '—'})</span></div>
                          <div className="text-slate-700 mt-1">{c.driverAction}</div>
                          <div className="text-slate-500 text-[11px]">{c.driverCondition}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (e.type === 'conviction' && e.conviction) {
                const c = e.conviction;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Conviction Details</div>
                      <div className="text-xs space-y-1.5">
                        <div className="flex justify-between"><span className="text-slate-500">Event Date</span><span className="font-mono text-slate-700">{e.date}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Event Time</span><span className="font-mono text-slate-700">{e.time ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Conviction Date</span><span className="font-mono text-slate-700">{c.convictionDate}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Jurisdiction</span><span className="font-bold text-slate-800">{c.jurisdiction}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Ticket #</span><span className="font-mono text-slate-700">{e.ticket ?? '—'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Microfilm #</span><span className="font-mono text-slate-700">{c.microfilm}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Charged Carrier</span><span className="font-bold text-slate-800">{c.chargedCarrier}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Points</span><span className="font-bold text-amber-600">{c.points}</span></div>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Offence &amp; Vehicle</div>
                      <div className="text-xs space-y-2">
                        <div>
                          <div className="text-slate-500">Vehicle Plate</div>
                          <div className="font-mono text-slate-700">{e.vehicle1?.plate ?? '—'} <span className="text-slate-400">({e.vehicle1?.jurisdiction ?? '—'})</span></div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                          <div className="text-slate-500">Offence</div>
                          <div className="font-bold text-slate-800">{c.offence}</div>
                          {c.ccmtaEquivalency && <div className="text-slate-500 text-[11px] mt-0.5"><span className="font-semibold">CCMTA:</span> {c.ccmtaEquivalency}</div>}
                        </div>
                        {c.offenceLocation && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500">Offence Location</div>
                            <div className="text-slate-700">{c.offenceLocation}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            };

            const visibleColCount = cvorEventColumns.filter(c => c.visible).length + 1; // +1 for chevron col

            return (
              <div className="bg-white overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Intervention &amp; Event Details</div>
                      <div className="text-[11px] text-slate-500">From {CVOR_INTERVENTION_PERIOD.fromDate} to {CVOR_INTERVENTION_PERIOD.toDate}  ·  {sorted.length} of {kpiCounts.all} events</div>
                    </div>
                  </div>
                </div>

                {/* KPI cards (stacked layout - works well at 7 across) */}
                {(() => {
                  type Tone = 'rose' | 'emerald' | 'red' | 'orange' | 'blue' | 'purple' | 'yellow';
                  const toneMap: Record<Tone, { iconBg: string; iconText: string; ring: string; valueText: string; activeBg: string }> = {
                    rose:    { iconBg: 'bg-rose-100',    iconText: 'text-rose-600',    ring: 'ring-rose-300 border-rose-300',       valueText: 'text-rose-700',    activeBg: 'bg-rose-50/40' },
                    emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', ring: 'ring-emerald-300 border-emerald-300', valueText: 'text-emerald-700', activeBg: 'bg-emerald-50/40' },
                    red:     { iconBg: 'bg-red-100',     iconText: 'text-red-600',     ring: 'ring-red-300 border-red-300',         valueText: 'text-red-700',     activeBg: 'bg-red-50/40' },
                    orange:  { iconBg: 'bg-orange-100',  iconText: 'text-orange-600',  ring: 'ring-orange-300 border-orange-300',   valueText: 'text-orange-700',  activeBg: 'bg-orange-50/40' },
                    blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    ring: 'ring-blue-300 border-blue-300',       valueText: 'text-blue-700',    activeBg: 'bg-blue-50/40' },
                    purple:  { iconBg: 'bg-purple-100',  iconText: 'text-purple-600',  ring: 'ring-purple-300 border-purple-300',   valueText: 'text-purple-700',  activeBg: 'bg-purple-50/40' },
                    yellow:  { iconBg: 'bg-yellow-100',  iconText: 'text-yellow-700',  ring: 'ring-yellow-300 border-yellow-300',   valueText: 'text-yellow-700',  activeBg: 'bg-yellow-50/40' },
                  };

                  type KpiDef = { id: typeof cvorEventKpiFilter; title: string; value: number; IconCmp: React.ComponentType<{ size?: number; className?: string }>; tone: Tone };
                  const kpis: KpiDef[] = [
                    { id: 'ALL',        title: 'All CVOR',    value: kpiCounts.all,       IconCmp: ClipboardCheck, tone: 'rose' },
                    { id: 'CLEAN',      title: 'Clean',       value: kpiCounts.clean,     IconCmp: CheckCircle2,   tone: 'emerald' },
                    { id: 'OOS',        title: 'OOS Flags',   value: kpiCounts.oos,       IconCmp: ShieldAlert,    tone: 'red' },
                    { id: 'VEHICLE',    title: 'Veh. Issues', value: kpiCounts.vehicle,   IconCmp: Truck,          tone: 'orange' },
                    { id: 'HOS_DRIVER', title: 'HOS/Driver',  value: kpiCounts.hosDriver, IconCmp: User,           tone: 'blue' },
                    { id: 'SEVERE',     title: 'Severe (7+)', value: kpiCounts.severe,    IconCmp: AlertTriangle,  tone: 'purple' },
                    { id: 'TICKETS',    title: 'Tickets',     value: kpiCounts.tickets,   IconCmp: Ticket,         tone: 'yellow' },
                  ];

                  return (
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {kpis.map(k => {
                        const t = toneMap[k.tone];
                        const isActive = cvorEventKpiFilter === k.id;
                        return (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => setCvorEventKpiFilter(k.id)}
                            className={`group/kpi flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white text-left transition-all ${
                              isActive
                                ? `ring-2 ring-offset-1 ${t.ring} ${t.activeBg} shadow-sm`
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
                              <k.IconCmp size={16} className={t.iconText} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate leading-tight">{k.title}</div>
                              <div className={`text-xl font-black tabular-nums leading-tight mt-0.5 ${isActive ? t.valueText : 'text-slate-900'}`}>{k.value}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Type filter row */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <FileText size={12} className="text-slate-400" />
                    <span className="font-semibold">Filter by type:</span>
                    <select
                      value={cvorEventTypeFilter}
                      onChange={(e) => setCvorEventTypeFilter(e.target.value as typeof cvorEventTypeFilter)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="ALL">All Types</option>
                      <option value="inspection">Inspections</option>
                      <option value="collision">Collisions</option>
                      <option value="conviction">Convictions</option>
                    </select>
                  </label>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {sorted.length} record{sorted.length === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Toolbar: search + column toggles */}
                <DataListToolbar
                  searchValue={cvorEventSearch}
                  onSearchChange={setCvorEventSearch}
                  searchPlaceholder="Search CVIR, ticket, driver, licence, location, vehicle, defect..."
                  columns={cvorEventColumns}
                  onToggleColumn={(id) => setCvorEventColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                  totalItems={sorted.length}
                  currentPage={safePage}
                  rowsPerPage={cvorEventRowsPerPage}
                  onPageChange={setCvorEventPage}
                  onRowsPerPageChange={setCvorEventRowsPerPage}
                />

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-2.5 w-8" />
                        {isVis('type')          && <SortableTh col="type"          label="Type" />}
                        {isVis('date')          && <SortableTh col="date"          label="Date" />}
                        {isVis('time')          && <SortableTh col="time"          label="Time" />}
                        {isVis('cvirOrTicket')  && <SortableTh col="cvirOrTicket"  label="CVIR / Ticket" />}
                        {isVis('location')      && <SortableTh col="location"      label="Location" />}
                        {isVis('driver')        && <SortableTh col="driver"        label="Driver" />}
                        {isVis('driverLicence') && <SortableTh col="driverLicence" label="Driver Licence" />}
                        {isVis('vehicle1')      && <SortableTh col="vehicle1"      label="Vehicle 1" />}
                        {isVis('vehicle2')      && <SortableTh col="vehicle2"      label="Vehicle 2" />}
                        {isVis('level')         && <SortableTh col="level"         label="Level"   className="!text-center" />}
                        {isVis('vPts')          && <SortableTh col="vPts"          label="V Pts"   className="!text-center" />}
                        {isVis('dPts')          && <SortableTh col="dPts"          label="D Pts"   className="!text-center" />}
                        {isVis('oos')           && <SortableTh col="oos"           label="OOS"     className="!text-center" />}
                        {isVis('defects')       && <SortableTh col="defects"       label="Defects" className="!text-center" />}
                        {isVis('charged')       && <SortableTh col="charged"       label="Charged" className="!text-center" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paged.map(e => {
                        const tb = typeBadge(e.type);
                        const isOpen = cvorEventExpanded === e.id;
                        const v1 = fmtVeh(e.vehicle1);
                        const v2 = fmtVeh(e.vehicle2);
                        const vPts = e.type === 'inspection' ? (e.vehiclePoints ?? 0) : 0;
                        const dPts = e.type === 'inspection'
                          ? (e.driverPoints ?? 0)
                          : (e.pointsTotal ?? 0);
                        const time = e.type === 'inspection'
                          ? `${e.startTime ?? ''}${e.endTime ? '-' + e.endTime : ''}`
                          : (e.time ?? '—');
                        const cvirOrTicket = e.cvir ?? e.ticket ?? '—';
                        const charged = e.type === 'collision'
                          ? (e.collision?.driverCharged === 'Y' ? 'Yes' : 'No')
                          : e.type === 'inspection'
                            ? (e.charged === 'Y' ? 'Yes' : 'No')
                            : 'No';

                        return (
                          <Fragment key={e.id}>
                            <tr
                              onClick={() => setCvorEventExpanded(isOpen ? null : e.id)}
                              className={`cursor-pointer transition-colors ${isOpen ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
                            >
                              <td className="px-2 py-2.5 text-center">
                                {isOpen ? <ChevronUp size={14} className="text-slate-400 inline" /> : <ChevronDown size={14} className="text-slate-400 inline" />}
                              </td>
                              {isVis('type') && (
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold ${tb.cls}`}>
                                    <tb.IconCmp size={11} />
                                    {tb.label}
                                  </span>
                                </td>
                              )}
                              {isVis('date')          && <td className="px-3 py-2.5 font-mono text-slate-700 tabular-nums">{e.date}</td>}
                              {isVis('time')          && <td className="px-3 py-2.5 font-mono text-slate-600 tabular-nums">{time}</td>}
                              {isVis('cvirOrTicket')  && <td className="px-3 py-2.5 font-mono text-slate-700">{cvirOrTicket}</td>}
                              {isVis('location')      && <td className="px-3 py-2.5 text-slate-700 max-w-[180px] truncate">{e.location ?? '—'}</td>}
                              {isVis('driver')        && <td className="px-3 py-2.5 text-slate-700 font-medium max-w-[180px] truncate">{e.driverName ?? '—'}</td>}
                              {isVis('driverLicence') && <td className="px-3 py-2.5 font-mono text-slate-600 max-w-[160px] truncate">{e.driverLicence ?? '—'}</td>}
                              {isVis('vehicle1') && (
                                <td className="px-3 py-2.5">
                                  {typeof v1 === 'string'
                                    ? <span className="text-slate-400">{v1}</span>
                                    : <div><div className="font-bold text-slate-800">{v1.top}</div>{v1.plate && <div className="font-mono text-[10px] text-blue-600">{v1.plate}</div>}</div>}
                                </td>
                              )}
                              {isVis('vehicle2') && (
                                <td className="px-3 py-2.5">
                                  {typeof v2 === 'string'
                                    ? <span className="text-slate-400">{v2}</span>
                                    : <div><div className="font-bold text-slate-800">{v2.top}</div>{v2.plate && <div className="font-mono text-[10px] text-blue-600">{v2.plate}</div>}</div>}
                                </td>
                              )}
                              {isVis('level') && (
                                <td className="px-3 py-2.5 text-center text-slate-700 tabular-nums">
                                  {e.type === 'inspection' ? e.level : <span className="text-slate-400">—</span>}
                                </td>
                              )}
                              {isVis('vPts') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  {e.type === 'inspection'
                                    ? <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 rounded ${vPts > 0 ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-400'}`}>{vPts}</span>
                                    : <span className="text-slate-400">0</span>}
                                </td>
                              )}
                              {isVis('dPts') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 rounded ${dPts > 0 ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-400'}`}>{dPts}</span>
                                </td>
                              )}
                              {isVis('oos') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  {e.type === 'inspection' && (e.oosCount ?? 0) > 0
                                    ? <span className="inline-flex items-center gap-1 px-1.5 rounded border bg-amber-50 text-amber-700 border-amber-200 font-bold"><AlertTriangle size={10} />{e.oosCount}</span>
                                    : <span className="text-slate-400">—</span>}
                                </td>
                              )}
                              {isVis('defects') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  {e.type === 'inspection'
                                    ? <span className={(e.totalDefects ?? 0) > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>{e.totalDefects ?? 0}</span>
                                    : <span className="text-slate-400">—</span>}
                                </td>
                              )}
                              {isVis('charged') && (
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${charged === 'Yes' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-400'}`}>{charged}</span>
                                </td>
                              )}
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={visibleColCount} className="px-5 py-4 bg-slate-50/60 border-t border-slate-100">
                                  {renderExpand(e)}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      {paged.length === 0 && (
                        <tr>
                          <td colSpan={visibleColCount} className="px-5 py-10 text-center text-sm text-slate-500">
                            No events match the selected filter or search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <PaginationBar
                  totalItems={sorted.length}
                  currentPage={safePage}
                  rowsPerPage={cvorEventRowsPerPage}
                  onPageChange={setCvorEventPage}
                  onRowsPerPageChange={setCvorEventRowsPerPage}
                />
              </div>
            );
          })()}

          {/* ══════════════════════════════════════════════════════════════
               TRAVEL KILOMETRIC INFORMATION - period list with type filter,
               sortable headers, search, column toggles, pagination
          ══════════════════════════════════════════════════════════════ */}
          {(() => {
            const fmtNum = (n: number) => n.toLocaleString('en-US');
            const isVis = (id: string) => cvorTravelColumns.find(c => c.id === id)?.visible !== false;

            const matchesSearch = (r: typeof cvorTravelKm[number]) => {
              const q = cvorTravelSearch.trim().toLowerCase();
              if (!q) return true;
              return [r.fromDate, r.toDate, r.type].join(' ').toLowerCase().includes(q);
            };
            const filtered = cvorTravelKm
              .filter(r => cvorTravelType === 'ALL' ? true : r.type === cvorTravelType)
              .filter(matchesSearch);

            const getSortVal = (r: typeof cvorTravelKm[number]): string | number => {
              switch (cvorTravelSort.col) {
                case 'type':           return r.type;
                case 'fromDate':       return r.fromDate;
                case 'toDate':         return r.toDate;
                case 'vehicles':       return r.vehicles;
                case 'doubleShifted':  return r.doubleShifted;
                case 'totalVehicles':  return r.totalVehicles;
                case 'ontarioKm':      return r.ontarioKm;
                case 'restOfCanadaKm': return r.restOfCanadaKm;
                case 'usMexicoKm':     return r.usMexicoKm;
                case 'drivers':        return r.drivers;
                case 'totalKm':        return r.totalKm;
                default:               return 0;
              }
            };
            const sorted = [...filtered].sort((a, b) => {
              const dir = cvorTravelSort.dir === 'asc' ? 1 : -1;
              const av = getSortVal(a), bv = getSortVal(b);
              if (av < bv) return -1 * dir;
              if (av > bv) return 1 * dir;
              return 0;
            });

            // Pagination
            const totalPages = Math.max(1, Math.ceil(sorted.length / cvorTravelRowsPerPage));
            const safePage = Math.min(cvorTravelPage, totalPages);
            const paged = sorted.slice((safePage - 1) * cvorTravelRowsPerPage, safePage * cvorTravelRowsPerPage);

            const onSort = (col: string) => {
              setCvorTravelSort(prev => prev.col === col
                ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { col, dir: 'desc' });
            };
            const SortIcon = ({ col }: { col: string }) => {
              if (cvorTravelSort.col !== col) return <ChevronDown size={11} className="text-slate-300 inline -mt-0.5" />;
              return cvorTravelSort.dir === 'asc'
                ? <ChevronUp size={11} className="text-blue-500 inline -mt-0.5" />
                : <ChevronDown size={11} className="text-blue-500 inline -mt-0.5" />;
            };
            const SortableTh = ({ col, label, align = 'left' }: { col: string; label: string; align?: 'left' | 'right' | 'center' }) => (
              <th className={`px-3 py-2.5 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
                <button
                  type="button"
                  onClick={() => onSort(col)}
                  className={`inline-flex items-center gap-1 hover:text-slate-700 transition-colors ${cvorTravelSort.col === col ? 'text-slate-700' : ''}`}
                >
                  {label} <SortIcon col={col} />
                </button>
              </th>
            );

            const typeBadge = (t: 'Estimated' | 'Actual') =>
              t === 'Estimated'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200';

            const visibleColCount = cvorTravelColumns.filter(c => c.visible).length;

            return (
              <div className="bg-white overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Activity size={15} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">Travel Kilometric Information</div>
                      <div className="text-[11px] text-slate-500">Per-period vehicle / driver counts &amp; kilometres travelled</div>
                    </div>
                  </div>
                </div>

                {/* Type filter + legend row */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <Activity size={12} className="text-slate-400" />
                      <span className="font-semibold">Filter by type:</span>
                      <select
                        value={cvorTravelType}
                        onChange={(e) => setCvorTravelType(e.target.value as typeof cvorTravelType)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="ALL">All Periods</option>
                        <option value="Estimated">Estimated only</option>
                        <option value="Actual">Actual only</option>
                      </select>
                    </label>
                    <span className="text-xs text-slate-500">{sorted.length} period{sorted.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    *E: Estimated &nbsp;·&nbsp; A: Actual
                  </div>
                </div>

                {/* Toolbar: search + column toggles */}
                <DataListToolbar
                  searchValue={cvorTravelSearch}
                  onSearchChange={setCvorTravelSearch}
                  searchPlaceholder="Search by date or type..."
                  columns={cvorTravelColumns}
                  onToggleColumn={(id) => setCvorTravelColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                  totalItems={sorted.length}
                  currentPage={safePage}
                  rowsPerPage={cvorTravelRowsPerPage}
                  onPageChange={setCvorTravelPage}
                  onRowsPerPageChange={setCvorTravelRowsPerPage}
                />

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        {isVis('type')           && <SortableTh col="type"           label="E/A" />}
                        {isVis('fromDate')       && <SortableTh col="fromDate"       label="From" />}
                        {isVis('toDate')         && <SortableTh col="toDate"         label="To" />}
                        {isVis('vehicles')       && <SortableTh col="vehicles"       label="# Vehicles"        align="right" />}
                        {isVis('doubleShifted')  && <SortableTh col="doubleShifted"  label="# Double Shifted"  align="right" />}
                        {isVis('totalVehicles')  && <SortableTh col="totalVehicles"  label="Total Vehicles"    align="right" />}
                        {isVis('ontarioKm')      && <SortableTh col="ontarioKm"      label="Ontario KM"        align="right" />}
                        {isVis('restOfCanadaKm') && <SortableTh col="restOfCanadaKm" label="Rest of Canada KM" align="right" />}
                        {isVis('usMexicoKm')     && <SortableTh col="usMexicoKm"     label="US/Mexico KM"      align="right" />}
                        {isVis('drivers')        && <SortableTh col="drivers"        label="# Drivers"         align="right" />}
                        {isVis('totalKm')        && <SortableTh col="totalKm"        label="Total KM"          align="right" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paged.map((r, i) => (
                        <tr key={`${r.fromDate}-${r.toDate}-${r.type}-${i}`} className="hover:bg-slate-50/60 transition-colors">
                          {isVis('type') && (
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${typeBadge(r.type)}`}>
                                {r.type}
                              </span>
                            </td>
                          )}
                          {isVis('fromDate')      && <td className="px-3 py-2.5 font-mono text-slate-700 tabular-nums">{r.fromDate}</td>}
                          {isVis('toDate')        && <td className="px-3 py-2.5 font-mono text-slate-700 tabular-nums">{r.toDate}</td>}
                          {isVis('vehicles')      && <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">{fmtNum(r.vehicles)}</td>}
                          {isVis('doubleShifted') && (
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              <span className={r.doubleShifted > 0 ? 'font-semibold text-blue-600' : 'text-slate-400'}>{r.doubleShifted}</span>
                            </td>
                          )}
                          {isVis('totalVehicles')  && <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-900">{fmtNum(r.totalVehicles)}</td>}
                          {isVis('ontarioKm')      && <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmtNum(r.ontarioKm)}</td>}
                          {isVis('restOfCanadaKm') && <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{fmtNum(r.restOfCanadaKm)}</td>}
                          {isVis('usMexicoKm') && (
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              <span className={r.usMexicoKm > 0 ? 'text-slate-700' : 'text-slate-400'}>{fmtNum(r.usMexicoKm)}</span>
                            </td>
                          )}
                          {isVis('drivers') && (
                            <td className="px-3 py-2.5 text-right tabular-nums">
                              <span className={r.drivers > 0 ? 'font-bold text-slate-900' : 'text-slate-400'}>{fmtNum(r.drivers)}</span>
                            </td>
                          )}
                          {isVis('totalKm') && <td className="px-3 py-2.5 text-right tabular-nums font-bold text-blue-600">{fmtNum(r.totalKm)}</td>}
                        </tr>
                      ))}
                      {paged.length === 0 && (
                        <tr>
                          <td colSpan={visibleColCount} className="px-5 py-10 text-center text-sm text-slate-500">
                            No periods match the selected filter or search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <PaginationBar
                  totalItems={sorted.length}
                  currentPage={safePage}
                  rowsPerPage={cvorTravelRowsPerPage}
                  onPageChange={setCvorTravelPage}
                  onRowsPerPageChange={setCvorTravelRowsPerPage}
                />
              </div>
            );
          })()}

          </div>
          {/* end LATEST PULL SNAPSHOT wrapper */}

          {/* ===== CVOR Mileage Summary - removed (shown inside CVOR Performance card) ===== */}
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

          {/* ===== CVOR Level Comparison - removed (shown inside CVOR Performance card) ===== */}
          {false && (() => {
            const cvorLevels = [
              { level: 'Level 1', name: 'Level 1 - Full Inspection', desc: 'Full inspection - driver, vehicle full inspection, HOS, permits, insurance, cargo, TDG, permits and authorities' },
              { level: 'Level 2', name: 'Level 2 - Walk-Around', desc: 'Walk around - Driver/vehicle inspection. DL, HOS, Seat belt, DVIR' },
              { level: 'Level 3', name: 'Level 3 - Driver/Credentials', desc: 'Driver/Credentials/Administrative Inspection - DL, HOS, seat belt, DVIR, Carrier credentials' },
              { level: 'Level 4', name: 'Level 4 - Special Inspections', desc: 'Special inspections - particular item (e.g., cargo, TDG placards, one-time issue)' },
              { level: 'Level 5', name: 'Level 5 - Vehicle Only', desc: 'Vehicle only inspection - no driver present, mechanical condition check only' },
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


              {/* â"€â"€ PERFORMANCE HISTORY CHARTS â"€â"€ */}
              {(() => {
                // â"€â"€â"€ Cadence filter â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
                const filterByCadence = (all: typeof cvorPeriodicReports) => {
                  if (cvorPeriod === 'Monthly' || cvorPeriod === 'All') return all;
                  const minGapDays =
                    cvorPeriod === 'Quarterly' ? 80 :
                    cvorPeriod === 'Semi-Annual' ? 170 :
                    340;
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
                  return { start, end, label: `${fmt(start)} →' ${fmt(end)}` };
                };

                // â"€â"€â"€ SVG layout (all charts: VW=1200 full-width) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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
                const gapDays =
                  cvorPeriod === 'Monthly' ? 60 :
                  cvorPeriod === 'Quarterly' ? 100 :
                  cvorPeriod === 'Semi-Annual' ? 250 :
                  380;
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

                // â"€â"€â"€ Unified tooltip - single column, SVG-scaled fonts â"€â"€â"€â"€â"€
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
                  const alertLabel = al==='critical'?'⚠ Critical':al==='warning'?'⚡ Warning':'✓" Healthy';
                  // All fonts scaled for VW=1200 viewBox: ×1.5 vs typical px
                  // →' fontSize=18 renders ≈12px at ~900px display width
                  const rows: Array<{label:string;val:string;color:string;bold?:boolean}> = [
                    { label:'CVOR Rating',      val:`${d.rating.toFixed(2)}%`,      color:rc,        bold:focusMetric==='rating' },
                    { label:'Collisions',        val:`${d.colContrib.toFixed(2)}%`,  color:'#3b82f6', bold:focusMetric==='col' },
                    { label:'Convictions',       val:`${d.conContrib.toFixed(2)}%`,  color:'#d97706', bold:focusMetric==='con' },
                    { label:'Inspections',       val:`${d.insContrib.toFixed(2)}%`,  color:'#dc2626', bold:focusMetric==='ins' },
                    { label:'OOS Overall',       val:d.oosOverall>0?`${d.oosOverall.toFixed(1)}%`:'-', color:d.oosOverall>20?'#ef4444':'#94a3b8', bold:focusMetric==='oosOv' },
                    { label:'OOS Vehicle',       val:d.oosVehicle>0?`${d.oosVehicle.toFixed(1)}%`:'-', color:d.oosVehicle>20?'#ef4444':'#94a3b8', bold:focusMetric==='oosVh' },
                    { label:'OOS Driver',        val:d.oosDriver>0?`${d.oosDriver.toFixed(1)}%`:'-',   color:d.oosDriver>5?'#f59e0b':'#10b981',   bold:focusMetric==='oosDr' },
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
                      {/* Period label - fontSize 18 ≈ 13px on screen */}
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

                // â"€â"€â"€ Shared x-axis â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

                // â"€â"€â"€ Y-axis â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

                // â"€â"€â"€ Dot renderer (shared) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
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

                    {/* â"€â"€ Header â"€â"€ */}
                    <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-[17px] font-bold tracking-tight text-slate-800">CVOR Performance History</span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} pulls</span>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
                          {firstPull.periodLabel} →' {lastPull.periodLabel}  ·  {rangeMonths}mo
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
                          {(['Monthly','Quarterly','Semi-Annual','Annual','All'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p)}
                              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${cvorPeriod===p?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* â"€â"€ Selected pull banner â"€â"€ */}
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
                              <span className={`ml-auto font-semibold text-indigo-500 ${historySize.helperCls}`}>Hover any dot  ·  click to drill into inspections</span>
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
                              <span className={`ml-auto italic text-slate-400 ${historySize.helperCls}`}>Hover bar  ·  full pull details  ·  click to inspections</span>
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
                                {/* Bars - pass 1: all bars (no tooltip) */}
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
                                {/* Bars - pass 2: tooltip on top of everything */}
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
                          const sortIcon = (id: string) => cvorPullSort.col === id ? (cvorPullSort.dir === 'asc' ? '->' : '→"') : '';
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
                                  {pullRows.length} pulls  ·  newest first  ·  click row →' inspection drill-down
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
                                          className={`cursor-pointer transition-colors ${row.isSelected ? 'bg-indigo-100 hover:bg-indigo-100 ring-2 ring-inset ring-indigo-400 shadow-[inset_4px_0_0_0_rgb(79,70,229)]' : `hover:bg-slate-50 ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}`}
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
                                              {row.oosOverall > 0 ? `${row.oosOverall.toFixed(1)}%` : '-'}
                                            </td>
                                          )}
                                          {visible('oosVehicle') && (
                                            <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosVehicle >= 20 ? 'font-bold text-red-600' : 'text-slate-600'}`}>
                                              {row.oosVehicle > 0 ? `${row.oosVehicle.toFixed(1)}%` : '-'}
                                            </td>
                                          )}
                                          {visible('oosDriver') && (
                                            <td className={`px-3 py-3.5 text-right font-mono text-[12.5px] ${row.oosDriver > 5 ? 'font-semibold text-amber-600' : 'text-emerald-600'}`}>
                                              {row.oosDriver > 0 ? `${row.oosDriver.toFixed(1)}%` : '-'}
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
                          <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls  ·  newest first  ·  click row →' inspection drill-down</span>
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
                                        {isSel && <span className="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">â-¶ ON</span>}
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
                                    <td className="px-2 py-2.5 text-right font-mono text-indigo-600 whitespace-nowrap">{d.totalCollisionPoints||'-'}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-pink-600 whitespace-nowrap">{d.convictionPoints}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosOverall>20?'text-red-600 font-bold':'text-slate-600'}`}>{d.oosOverall>0?`${d.oosOverall.toFixed(1)}%`:'-'}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosVehicle>20?'text-red-600 font-bold':'text-slate-600'}`}>{d.oosVehicle>0?`${d.oosVehicle.toFixed(1)}%`:'-'}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosDriver>5?'text-amber-600 font-semibold':'text-emerald-600'}`}>{d.oosDriver>0?`${d.oosDriver.toFixed(1)}%`:'-'}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">{d.trucks}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">{(d.totalMiles/1_000_000).toFixed(2)}M</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ══ MINI-CVOR PANEL FOR SELECTED PULL ══ */}
                      {cvorSelectedPull && (() => {
                        const pull = cvorPeriodicReports.find(d => d.reportDate === cvorSelectedPull);
                        if (!pull) return null;
                        const winSel = windowOf(pull.reportDate);

                        const rcMini = (v: number) =>
                          v >= cvorThresholds.showCause ? '#dc2626'
                          : v >= cvorThresholds.intervention ? '#d97706'
                          : v >= cvorThresholds.warning ? '#b45309'
                          : '#16a34a';
                        const rbMini = (v: number) =>
                          v >= cvorThresholds.showCause ? 'bg-red-100 text-red-700 border-red-300'
                          : v >= cvorThresholds.intervention ? 'bg-amber-100 text-amber-700 border-amber-300'
                          : v >= cvorThresholds.warning ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-300';
                        const rlMini = (v: number) =>
                          v >= cvorThresholds.showCause ? 'SHOW CAUSE'
                          : v >= cvorThresholds.intervention ? 'AUDIT'
                          : v >= cvorThresholds.warning ? 'WARN'
                          : 'OK';
                        const tileBgMini = (v: number) =>
                          v >= cvorThresholds.showCause ? 'bg-red-50/70 border-red-200'
                          : v >= cvorThresholds.intervention ? 'bg-amber-50/70 border-amber-200'
                          : v >= cvorThresholds.warning ? 'bg-yellow-50/70 border-yellow-200'
                          : 'bg-emerald-50/70 border-emerald-200';
                        const gradMini = 'linear-gradient(to right,#22c55e 0%,#eab308 28%,#f97316 45%,#ef4444 70%,#991b1b 100%)';

                        const inWinMini = inspectionsData.filter((r: any) => {
                          const rd = new Date(r.date);
                          return rd >= winSel.start && rd <= winSel.end;
                        });
                        // Per-pull events (source of truth — generated to match all summary fields)
                        const eventsInWin = pull.events ?? [];
                        // Per-pull travel km records (Estimated recent 12 mo + Actual older 12 mo)
                        const travelInWin = pull.travelKm ?? [];

                        const _emptyLvl = { count: 0, oosCount: 0 };
                        const _ls = pull.levelStats ?? { level1: _emptyLvl, level2: _emptyLvl, level3: _emptyLvl, level4: _emptyLvl, level5: _emptyLvl };
                        const cvorLvlsMini: { level: string; name: string; data: { count: number; oosCount: number } }[] = [
                          { level: 'Level 1', name: 'Level 1 - Full Inspection',          data: _ls.level1 ?? _emptyLvl },
                          { level: 'Level 2', name: 'Level 2 - Walk-Around',              data: _ls.level2 ?? _emptyLvl },
                          { level: 'Level 3', name: 'Level 3 - Driver/Credentials',       data: _ls.level3 ?? _emptyLvl },
                          { level: 'Level 4', name: 'Level 4 - Special Inspections',      data: _ls.level4 ?? _emptyLvl },
                          { level: 'Level 5', name: 'Level 5 - Vehicle Only',             data: _ls.level5 ?? _emptyLvl },
                        ];
                        const lvlStatsMini = cvorLvlsMini.map(l => {
                          const count = l.data.count;
                          const oosCount = l.data.oosCount;
                          return { level: l.level, name: l.name, count, oosCount, pct: count > 0 ? (oosCount / count) * 100 : 0 };
                        });
                        const lvlTotalMini = lvlStatsMini.reduce((s, l) => s + l.count, 0);
                        const lvlOosMini = lvlStatsMini.reduce((s, l) => s + l.oosCount, 0);

                        const fmtNumMini = (n: number) => n.toLocaleString('en-US');
                        const fmtMiMini = (n: number) =>
                          n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
                          : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K`
                          : String(Math.round(n));

                        const colPctMini = pull.colPctOfThresh;
                        const conPctMini = pull.conPctOfThresh;
                        const insPctMini = pull.insPctOfThresh;

                        // ── 3-period breakdowns from real cvorInterventionEvents ──
                        const PERIOD_MONTHS = 8;
                        const THRESHOLD_DIVISOR = 166666.67;
                        const kmPerMonth = pull.totalMiles / 24;
                        const thresholdPerPeriod = +(kmPerMonth * PERIOD_MONTHS / THRESHOLD_DIVISOR).toFixed(2);
                        type BdRow = {
                          period: number; fromDate: string; toDate: string; months: number;
                          kmPerMonth: number; events: number; points: number; threshold: number; pctSet: number;
                        };
                        // Build per-pull breakdown rows from the pull's own collisionBreakdown/convictionBreakdown.
                        // Period 1 = most recent 8 mo, Period 2 = middle 8 mo, Period 3 = earliest 8 mo.
                        const buildSubPeriods = (slices: { events: number; points: number }[]): BdRow[] =>
                          slices.map((slice, i) => {
                            const to = new Date(winSel.end);
                            to.setMonth(to.getMonth() - i * PERIOD_MONTHS);
                            const from = new Date(to);
                            from.setMonth(from.getMonth() - PERIOD_MONTHS);
                            return {
                              period: i + 1,
                              fromDate: from.toISOString().split('T')[0],
                              toDate: to.toISOString().split('T')[0],
                              months: PERIOD_MONTHS,
                              kmPerMonth: Math.round(kmPerMonth),
                              events: slice.events,
                              points: slice.points,
                              threshold: thresholdPerPeriod,
                              pctSet: thresholdPerPeriod > 0 ? +((slice.points / thresholdPerPeriod) * 100).toFixed(2) : 0,
                            };
                          });
                        const _emptyBd = [{ events: 0, points: 0 }, { events: 0, points: 0 }, { events: 0, points: 0 }];
                        const colBdRowsAll = buildSubPeriods(pull.collisionBreakdown ?? _emptyBd);
                        const conBdRowsAll = buildSubPeriods(pull.convictionBreakdown ?? _emptyBd);

                        const filterAndPageBd = (rows: BdRow[], search: string, page: number, rpp: number) => {
                          const q = search.trim().toLowerCase();
                          const filtered = q
                            ? rows.filter(r => [r.period, r.fromDate, r.toDate, r.months, r.kmPerMonth, r.events, r.points, r.threshold, r.pctSet].join(' ').toLowerCase().includes(q))
                            : rows;
                          const totalPages = Math.max(1, Math.ceil(filtered.length / rpp));
                          const safe = Math.min(page, totalPages);
                          return { filtered, paged: filtered.slice((safe - 1) * rpp, safe * rpp), safe };
                        };
                        const colBd = filterAndPageBd(colBdRowsAll, '', miniColBdPage, miniColBdRowsPerPage);
                        const conBd = filterAndPageBd(conBdRowsAll, '', miniConBdPage, miniConBdRowsPerPage);

                        // ── Inspection statistics rows (from per-pull inspectionStats) ──
                        const _is = pull.inspectionStats ?? { cvsaInspections: 0, vehiclesInspected: 0, driversInspected: 0, driverPoints: 0, vehiclePoints: 0, totalInspectionPoints: 0, setThreshold: 0 };
                        const cvsaCount        = _is.cvsaInspections;
                        const driversInsp      = _is.driversInspected;
                        const vehiclesInsp     = _is.vehiclesInspected;
                        const totalUnitsInsp   = driversInsp + vehiclesInsp;
                        const totalDriverPts   = _is.driverPoints;
                        const totalVehPts      = _is.vehiclePoints;
                        const totalInspPts     = _is.totalInspectionPoints;
                        const insThreshold     = _is.setThreshold;

                        // ── Top-of-panel KPI counts (derived from per-pull events) ──
                        const inspectionEventsMini = pull.events.filter(e => e.type === 'inspection');
                        const oosCountMini     = inspectionEventsMini.filter(e => (e.oosCount ?? 0) > 0).length;
                        const cleanCountMini   = inspectionEventsMini.filter(e => (e.oosCount ?? 0) === 0 && (e.totalDefects ?? 0) === 0 && (e.vehiclePoints ?? 0) === 0 && (e.driverPoints ?? 0) === 0).length;
                        const withPtsCountMini = inspectionEventsMini.filter(e => (e.vehiclePoints ?? 0) + (e.driverPoints ?? 0) > 0).length
                                                + pull.events.filter(e => e.type !== 'inspection' && (e.collision?.points ?? e.conviction?.points ?? 0) > 0).length;
                        const ticketsCountMini = pull.events.filter(e => !!e.ticket || e.charged === 'Y' || e.collision?.driverCharged === 'Y').length;
                        const ticketsTotalMini = ticketsCountMini * 250; // illustrative average fine — keeps the "$ fines" subtitle non-zero
                        const totalCvrPtsMini  = totalVehPts + totalDriverPts;
                        const inspRowsAll: { label: string; value: string | number; emphasis?: boolean; tone?: 'red' | 'amber' | 'default' }[] = [
                          { label: '# of CVSA inspections conducted', value: cvsaCount },
                          { label: '# of Vehicles inspected', value: vehiclesInsp },
                          { label: '# of Drivers inspected', value: driversInsp },
                          { label: 'Total units inspected', value: totalUnitsInsp, emphasis: true },
                          { label: '# of Driver points assigned (D)', value: totalDriverPts },
                          { label: '# of Vehicle points assigned (V)', value: totalVehPts },
                          { label: 'Total inspection points (0.6875 × D + V)', value: totalInspPts.toFixed(2), emphasis: true },
                          { label: '# of Set inspection threshold points', value: insThreshold.toFixed(2) },
                          { label: '% of Set Threshold', value: `${insPctMini.toFixed(1)}%`, emphasis: true, tone: insPctMini >= 70 ? 'red' : insPctMini >= 50 ? 'amber' : 'default' },
                        ];
                        const inspRowsFiltered = inspRowsAll;

                        // ── Events filtering / sorting / paging ──
                        const VEH_DEFECT_CATS = ['BRAKE SYSTEM', 'WHEELS/RIMS', 'COUPLING DEVICES', 'BODY', 'LOAD SECURITY', 'REGISTRATION', 'OFFICER DIRECTION'];
                        const DRV_DEFECT_CATS = ['HOURS OF SERVICE', 'DRIVERS LICENCES', 'TRIP INSPECTION', 'CVOR/NSC'];
                        const isClean = (e: CvorInterventionEvent) =>
                          e.type === 'inspection' && (e.oosCount ?? 0) === 0 && (e.totalDefects ?? 0) === 0 &&
                          (e.vehiclePoints ?? 0) === 0 && (e.driverPoints ?? 0) === 0;
                        const hasOos = (e: CvorInterventionEvent) => (e.oosCount ?? 0) > 0;
                        const hasVehIssue = (e: CvorInterventionEvent) =>
                          (e.vehiclePoints ?? 0) > 0 || (e.defects ?? []).some(d => VEH_DEFECT_CATS.includes(d.category));
                        const hasDriverIssue = (e: CvorInterventionEvent) =>
                          (e.driverPoints ?? 0) > 0 || (e.defects ?? []).some(d => DRV_DEFECT_CATS.includes(d.category));
                        const isSevere = (e: CvorInterventionEvent) => {
                          const totalPts = (e.vehiclePoints ?? 0) + (e.driverPoints ?? 0) + (e.pointsTotal ?? 0);
                          return totalPts >= 7 || (e.totalDefects ?? 0) >= 7;
                        };
                        const hasTicket = (e: CvorInterventionEvent) =>
                          !!e.ticket || e.charged === 'Y' || e.collision?.driverCharged === 'Y';

                        const eventKpiCounts = {
                          all: eventsInWin.length,
                          clean: eventsInWin.filter(isClean).length,
                          oos: eventsInWin.filter(hasOos).length,
                          vehicle: eventsInWin.filter(hasVehIssue).length,
                          hosDriver: eventsInWin.filter(hasDriverIssue).length,
                          severe: eventsInWin.filter(isSevere).length,
                          tickets: eventsInWin.filter(hasTicket).length,
                        };
                        const matchesEventKpi = (e: CvorInterventionEvent) => {
                          switch (miniEventsKpiFilter) {
                            case 'ALL':        return true;
                            case 'CLEAN':      return isClean(e);
                            case 'OOS':        return hasOos(e);
                            case 'VEHICLE':    return hasVehIssue(e);
                            case 'HOS_DRIVER': return hasDriverIssue(e);
                            case 'SEVERE':     return isSevere(e);
                            case 'TICKETS':    return hasTicket(e);
                          }
                        };
                        const matchesEventSearch = (e: CvorInterventionEvent) => {
                          const q = miniEventsSearch.trim().toLowerCase();
                          if (!q) return true;
                          const hay = [
                            e.cvir, e.ticket, e.location, e.driverName, e.driverLicence,
                            e.vehicle1?.make, e.vehicle1?.unit, e.vehicle1?.plate,
                            e.vehicle2?.make, e.vehicle2?.unit, e.vehicle2?.plate,
                            e.type, e.date,
                            e.collision?.collisionClass, e.collision?.microfilm,
                            e.conviction?.offence, e.conviction?.microfilm, e.conviction?.ccmtaEquivalency,
                            ...(e.defects ?? []).flatMap(d => [d.category, d.defect]),
                          ].filter(Boolean).join(' ').toLowerCase();
                          return hay.includes(q);
                        };
                        const matchesEventType = (e: CvorInterventionEvent) =>
                          miniEventsTypeFilter === 'ALL' ? true : e.type === miniEventsTypeFilter;
                        const eventsFilteredAll = eventsInWin.filter(e => matchesEventType(e) && matchesEventKpi(e) && matchesEventSearch(e));
                        const getEventSortVal = (r: CvorInterventionEvent): string | number => {
                          switch (miniEventsSort.col) {
                            case 'date':          return new Date(r.date).getTime();
                            case 'time':          return r.startTime ?? r.time ?? '';
                            case 'type':          return r.type;
                            case 'cvirOrTicket':  return r.cvir ?? r.ticket ?? '';
                            case 'location':      return r.location ?? '';
                            case 'driver':        return r.driverName ?? '';
                            case 'driverLicence': return r.driverLicence ?? '';
                            case 'vehicle1':      return r.vehicle1?.plate ?? '';
                            case 'vehicle2':      return r.vehicle2?.plate ?? '';
                            case 'level':         return r.level ?? -1;
                            case 'vPts':          return r.vehiclePoints ?? 0;
                            case 'dPts':          return (r.driverPoints ?? 0) + (r.pointsTotal ?? 0);
                            case 'oos':           return r.oosCount ?? 0;
                            case 'defects':       return r.totalDefects ?? 0;
                            case 'charged':       return (r.charged === 'Y' || r.collision?.driverCharged === 'Y') ? 1 : 0;
                            default:              return 0;
                          }
                        };
                        const eventsSortedAll = [...eventsFilteredAll].sort((a, b) => {
                          const dir = miniEventsSort.dir === 'asc' ? 1 : -1;
                          const av = getEventSortVal(a), bv = getEventSortVal(b);
                          if (av < bv) return -1 * dir;
                          if (av > bv) return 1 * dir;
                          return 0;
                        });
                        const eventsTotalPages = Math.max(1, Math.ceil(eventsSortedAll.length / miniEventsRowsPerPage));
                        const eventsSafePage = Math.min(miniEventsPage, eventsTotalPages);
                        const eventsPaged = eventsSortedAll.slice((eventsSafePage - 1) * miniEventsRowsPerPage, eventsSafePage * miniEventsRowsPerPage);
                        const isEventVis = (id: string) => miniEventsColumns.find(c => c.id === id)?.visible !== false;
                        const sortEvent = (col: string) => setMiniEventsSort(p => p.col === col ? { col, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });

                        // ── Travel KM filtering / sorting / paging ──
                        const matchesTravelSearch = (r: typeof cvorTravelKm[number]) => {
                          const q = miniTravelSearch.trim().toLowerCase();
                          if (!q) return true;
                          return [r.fromDate, r.toDate, r.type].join(' ').toLowerCase().includes(q);
                        };
                        const travelFilteredAll = travelInWin
                          .filter(r => miniTravelType === 'ALL' ? true : r.type === miniTravelType)
                          .filter(matchesTravelSearch);
                        const getTravelSortVal = (r: typeof cvorTravelKm[number]): string | number => {
                          switch (miniTravelSort.col) {
                            case 'type':           return r.type;
                            case 'fromDate':       return r.fromDate;
                            case 'toDate':         return r.toDate;
                            case 'vehicles':       return r.vehicles;
                            case 'doubleShifted':  return r.doubleShifted;
                            case 'totalVehicles':  return r.totalVehicles;
                            case 'ontarioKm':      return r.ontarioKm;
                            case 'restOfCanadaKm': return r.restOfCanadaKm;
                            case 'usMexicoKm':     return r.usMexicoKm;
                            case 'drivers':        return r.drivers;
                            case 'totalKm':        return r.totalKm;
                            default:               return 0;
                          }
                        };
                        const travelSortedAll = [...travelFilteredAll].sort((a, b) => {
                          const dir = miniTravelSort.dir === 'asc' ? 1 : -1;
                          const av = getTravelSortVal(a), bv = getTravelSortVal(b);
                          if (av < bv) return -1 * dir;
                          if (av > bv) return 1 * dir;
                          return 0;
                        });
                        const travelTotalPages = Math.max(1, Math.ceil(travelSortedAll.length / miniTravelRowsPerPage));
                        const travelSafePage = Math.min(miniTravelPage, travelTotalPages);
                        const travelPaged = travelSortedAll.slice((travelSafePage - 1) * miniTravelRowsPerPage, travelSafePage * miniTravelRowsPerPage);
                        const isTravelVis = (id: string) => miniTravelColumns.find(c => c.id === id)?.visible !== false;
                        const sortTravel = (col: string) => setMiniTravelSort(p => p.col === col ? { col, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });

                        const SortIndicator = ({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) =>
                          active
                            ? (dir === 'asc' ? <ChevronUp size={11} className="text-blue-500 inline -mt-0.5" /> : <ChevronDown size={11} className="text-blue-500 inline -mt-0.5" />)
                            : <ChevronDown size={11} className="text-slate-300 inline -mt-0.5" />;

                        const Section = ({ k, title, subtitle, IconCmp, iconBg, iconColor, headerExtra, children }: {
                          k: MiniSectionKey;
                          title: string;
                          subtitle?: string;
                          IconCmp: React.ComponentType<{ size?: number; className?: string }>;
                          iconBg: string;
                          iconColor: string;
                          headerExtra?: React.ReactNode;
                          children: React.ReactNode;
                        }) => (
                          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <button
                              type="button"
                              onClick={() => toggleMini(k)}
                              aria-expanded={miniOpen[k]}
                              className="w-full px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-left"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                  <IconCmp size={13} className={iconColor}/>
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[12px] font-bold text-slate-900 truncate">{title}</div>
                                  {subtitle && <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {headerExtra}
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{miniOpen[k] ? 'Hide' : 'Show'}</span>
                                {miniOpen[k] ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                              </div>
                            </button>
                            {miniOpen[k] && <div className="border-t border-slate-100">{children}</div>}
                          </div>
                        );

                        const expandAll = () => setMiniOpen({ performance: true, mileage: true, collisionDetails: true, convictionDetails: true, comparison: true, collisionBd: true, convictionBd: true, inspStats: true, events: true, travel: true });
                        const collapseAll = () => setMiniOpen({ performance: false, mileage: false, collisionDetails: false, convictionDetails: false, comparison: false, collisionBd: false, convictionBd: false, inspStats: false, events: false, travel: false });

                        return (
                          <div className="mt-4 rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/40 to-white shadow-sm">
                            {/* Mini header */}
                            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-indigo-100 flex-wrap">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                  <ShieldAlert size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.18em]">Pull Snapshot</div>
                                  <div className="text-base font-bold text-slate-900 truncate">{pull.periodLabel}</div>
                                  <div className="text-[11px] text-slate-500">24-month window: <span className="font-mono text-indigo-600">{winSel.label}</span></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={expandAll}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                                >Expand all</button>
                                <button
                                  type="button"
                                  onClick={collapseAll}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                                >Collapse all</button>
                              </div>
                            </div>

                            <div className="p-4 space-y-3">
                              {/* Top KPI summary — mirrors CVOR Inspections drill-down impact cards */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                                {([
                                  { label: 'Inspections', val: String(inWinMini.length),  sub: 'in 24-mo window',                       color: 'text-slate-800',  bg: 'bg-slate-50',   border: 'border-slate-200' },
                                  { label: 'CVOR Impact', val: String(withPtsCountMini),  sub: 'have CVOR pts',                         color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
                                  { label: 'OOS',         val: String(oosCountMini),      sub: 'out-of-service',                        color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-200' },
                                  { label: 'Clean',       val: String(cleanCountMini),    sub: 'no violations',                         color: 'text-emerald-700',bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                  { label: 'Tickets',     val: String(ticketsCountMini),  sub: `$${ticketsTotalMini.toLocaleString()} fines`, color: 'text-rose-700',  bg: 'bg-rose-50',    border: 'border-rose-200' },
                                  { label: 'Veh Pts',     val: String(totalVehPts),       sub: 'vehicle CVOR',                          color: 'text-orange-700', bg: 'bg-orange-50',  border: 'border-orange-200' },
                                  { label: 'Dvr Pts',     val: String(totalDriverPts),    sub: 'driver CVOR',                           color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-200' },
                                  { label: 'CVOR Pts',    val: String(totalCvrPtsMini),   sub: 'combined impact',                       color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-200' },
                                ] as { label: string; val: string; sub: string; color: string; bg: string; border: string }[]).map(c => (
                                  <div key={c.label} className={`${c.bg} border ${c.border} rounded-2xl px-4 py-3 shadow-sm`}>
                                    <div className={`text-[26px] font-black leading-none ${c.color}`}>{c.val}</div>
                                    <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">{c.label}</div>
                                    <div className="mt-1 text-[10px] text-slate-500">{c.sub}</div>
                                  </div>
                                ))}
                              </div>

                              {/* 1. CVOR Performance — open by default */}
                              <Section
                                k="performance"
                                title="CVOR Performance"
                                subtitle={`Rating ${pull.rating.toFixed(2)}%`}
                                IconCmp={ShieldAlert}
                                iconBg="bg-slate-100"
                                iconColor="text-slate-600"
                                headerExtra={<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${rbMini(pull.rating)}`}>{rlMini(pull.rating)}</span>}
                              >
                                <div className="px-4 py-3.5">
                                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Overall CVOR Rating</div>
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="text-[36px] leading-none font-black" style={{ color: rcMini(pull.rating) }}>
                                      {pull.rating.toFixed(2)}%
                                    </div>
                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${rbMini(pull.rating)}`}>{rlMini(pull.rating)}</span>
                                  </div>
                                  <div className="relative" style={{ paddingTop: 22 }}>
                                    <div className="absolute z-10 flex flex-col items-center pointer-events-none"
                                      style={{ left: `${Math.min(pull.rating, 100)}%`, transform: 'translateX(-50%)', top: 0 }}>
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white whitespace-nowrap shadow-sm" style={{ background: rcMini(pull.rating) }}>{pull.rating.toFixed(2)}%</span>
                                      <div className="w-[2px] h-2.5" style={{ background: rcMini(pull.rating) }}/>
                                    </div>
                                    <div className="relative h-[18px] rounded-full overflow-hidden" style={{ background: gradMini, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.25)' }}>
                                      <div className="absolute top-0 left-0 right-0 h-[7px] rounded-t-full" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.30),transparent)' }}/>
                                      {[cvorThresholds.warning, cvorThresholds.intervention, cvorThresholds.showCause, cvorThresholds.seizure].map(t => (
                                        <div key={t} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: `${t}%` }}/>
                                      ))}
                                      <div className="absolute top-0 bottom-0 w-[3px] rounded-full"
                                        style={{ left: `${Math.min(pull.rating, 100)}%`, transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 0 6px 2px rgba(0,0,0,0.35)' }}/>
                                    </div>
                                    <div className="relative mt-1" style={{ height: 12 }}>
                                      {([
                                        { label: 'WARN', val: cvorThresholds.warning, color: '#b45309' },
                                        { label: 'AUDIT', val: cvorThresholds.intervention, color: '#d97706' },
                                        { label: 'SC', val: cvorThresholds.showCause, color: '#dc2626' },
                                        { label: 'SZR', val: cvorThresholds.seizure, color: '#7f1d1d' },
                                      ] as { label: string; val: number; color: string }[]).map(({ label, val, color }) => (
                                        <span key={label} className="absolute text-[8.5px] font-bold whitespace-nowrap"
                                          style={{ left: `${val}%`, transform: 'translateX(-50%)', color }}>{label}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 mt-4">
                                    {([
                                      { key: 'col', label: 'Collisions', pct: colPctMini, weight: 40, detail1: `${pull.collisionEvents} collisions`, detail2: `${pull.totalCollisionPoints} pts` },
                                      { key: 'con', label: 'Convictions', pct: conPctMini, weight: 40, detail1: `${pull.convictionEvents} convictions`, detail2: `${pull.convictionPoints} pts` },
                                      { key: 'ins', label: 'Inspections', pct: insPctMini, weight: 20, detail1: 'OOS rate', detail2: `${pull.oosOverall.toFixed(1)}%` },
                                    ] as { key: string; label: string; pct: number; weight: number; detail1: string; detail2: string }[]).map(({ key, label, pct, weight, detail1, detail2 }) => (
                                      <div key={key} className={`group/minitile relative rounded-lg border p-2.5 ${tileBgMini(pct)} cursor-pointer transition-shadow hover:shadow-lg`}>
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                                          <span className={`text-[9px] font-bold px-1 py-px rounded border ${rbMini(pct)}`}>{rlMini(pct)}</span>
                                        </div>
                                        <div className="text-[22px] leading-none font-black my-0.5" style={{ color: rcMini(pct) }}>{pct.toFixed(1)}%</div>
                                        <div className="text-[10px] text-slate-600">{detail1}  ·  {detail2}</div>
                                        <div className="text-[9px] text-slate-400">{weight}% weight</div>
                                        <div className="relative h-[5px] rounded-full overflow-hidden mt-1.5" style={{ background: gradMini }}>
                                          <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full" style={{ left: `${Math.min(pct, 100)}%`, right: 0 }}/>
                                          <div className="absolute top-0 bottom-0 w-[2px] bg-white" style={{ left: `${Math.min(pct, 100)}%`, transform: 'translateX(-50%)' }}/>
                                        </div>
                                        {/* Hover tooltip — mirrors main-page CVOR Performance tile popup */}
                                        <div className="hidden group-hover/minitile:block absolute z-50 pointer-events-none"
                                          style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 230 }}>
                                          <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                                            <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: rcMini(pct) }}>
                                              <span className="text-white font-black text-[12px] uppercase tracking-wide">{label}</span>
                                              <span className="text-white/90 text-[12px] font-mono font-bold">{pct.toFixed(1)}%</span>
                                            </div>
                                            <div className="px-3.5 py-2.5 space-y-1.5">
                                              <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Status</span>
                                                <span className="font-bold" style={{ color: rcMini(pct) }}>{rlMini(pct)}</span>
                                              </div>
                                              <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">Category Weight</span>
                                                <span className="font-bold text-slate-800">{weight}%</span>
                                              </div>
                                              <div className="flex justify-between text-[11px]">
                                                <span className="text-slate-400">{detail1}</span>
                                                <span className="font-bold text-slate-800">{detail2}</span>
                                              </div>
                                              <div className="pt-1.5 border-t border-slate-100">
                                                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Thresholds</div>
                                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                  {([
                                                    { n: 'Warning',    v: cvorThresholds.warning,      c: '#fbbf24' },
                                                    { n: 'Audit',      v: cvorThresholds.intervention, c: '#f97316' },
                                                    { n: 'Show Cause', v: cvorThresholds.showCause,    c: '#f87171' },
                                                    { n: 'Current',    v: pct,                         c: rcMini(pct) },
                                                  ] as { n: string; v: number; c: string }[]).map(th => (
                                                    <div key={th.n} className="flex items-center justify-between">
                                                      <span className="text-[9px]" style={{ color: th.c }}>{th.n}</span>
                                                      <span className="text-[10px] font-bold font-mono text-slate-700">{th.v.toFixed(1)}%</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                                              style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid white' }}/>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </Section>

                              {/* 2. Mileage Summary */}
                              <Section
                                k="mileage"
                                title="Mileage Summary"
                                subtitle={`${fmtMiMini(pull.totalMiles)} mi total · ${pull.trucks} trucks`}
                                IconCmp={Truck}
                                iconBg="bg-slate-100"
                                iconColor="text-slate-600"
                              >
                                <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {([
                                    { label: 'Ontario', val: pull.onMiles },
                                    { label: 'Rest of Canada', val: pull.canadaMiles },
                                    { label: 'Trucks', val: pull.trucks, raw: true },
                                    { label: 'Total', val: pull.totalMiles, total: true },
                                  ] as { label: string; val: number; total?: boolean; raw?: boolean }[]).map(({ label, val, total, raw }) => (
                                    <div key={label} className={`rounded-lg border p-2.5 text-center ${total ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
                                      <div className="text-[9px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                                      <div className={`text-[14px] font-black font-mono ${total ? 'text-blue-700' : 'text-slate-800'}`}>
                                        {raw ? fmtNumMini(val) : fmtMiMini(val)}
                                      </div>
                                      <div className="text-[9px] text-slate-400">{raw ? 'units' : 'mi'}</div>
                                    </div>
                                  ))}
                                </div>
                              </Section>

                              {/* 3. Collision Details — granular per-pull breakdown */}
                              <Section
                                k="collisionDetails"
                                title="Collision Details"
                                subtitle={`${pull.collisionEvents} collisions · ${pull.totalCollisionPoints} pts`}
                                IconCmp={Truck}
                                iconBg="bg-red-50"
                                iconColor="text-red-600"
                                headerExtra={<span className="text-[10px] font-bold text-red-600 tabular-nums">{pull.collisionEvents}</span>}
                              >
                                <div className="px-4 py-3 space-y-3">
                                  {/* Severity breakdown */}
                                  <div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">By Severity</div>
                                    <div className="space-y-1">
                                      {[
                                        { label: 'Fatal',           value: pull.collisionDetails.fatal,           color: '#7f1d1d' },
                                        { label: 'Personal Injury', value: pull.collisionDetails.personalInjury,  color: '#f59e0b' },
                                        { label: 'Property Damage', value: pull.collisionDetails.propertyDamage,  color: '#3b82f6' },
                                      ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between text-[12px]">
                                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: r.color }}/>
                                            {r.label}
                                          </span>
                                          <span className="font-bold tabular-nums" style={{ color: r.color }}>{r.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Points status + totals */}
                                  <div className="pt-2 border-t border-slate-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">By Points Status</div>
                                    <div className="space-y-1">
                                      {[
                                        { label: 'With Points',     value: pull.collWithPoints,        color: '#dc2626' },
                                        { label: 'Not Pointed',     value: pull.collWithoutPoints,     color: '#94a3b8' },
                                        { label: 'Total Points',    value: pull.totalCollisionPoints,  color: '#dc2626', emphasis: true },
                                        { label: 'Total Collisions',value: pull.collisionEvents,       color: '#0f172a', emphasis: true },
                                      ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between text-[12px]">
                                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: r.color }}/>
                                            {r.label}
                                          </span>
                                          <span className={`font-bold tabular-nums ${'emphasis' in r && r.emphasis ? 'text-base' : ''}`} style={{ color: r.color }}>{r.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </Section>

                              {/* 4. Conviction Details — granular per-pull breakdown */}
                              <Section
                                k="convictionDetails"
                                title="Conviction Details"
                                subtitle={`${pull.convictionEvents} convictions · ${pull.convictionPoints} pts`}
                                IconCmp={Scale}
                                iconBg="bg-amber-50"
                                iconColor="text-amber-600"
                                headerExtra={<span className="text-[10px] font-bold text-amber-600 tabular-nums">{pull.convictionEvents}</span>}
                              >
                                <div className="px-4 py-3 space-y-3">
                                  {/* Category breakdown */}
                                  <div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">By Category</div>
                                    <div className="space-y-1">
                                      {[
                                        { label: 'Driver',  value: pull.convictionDetails.driver,  color: '#a855f7' },
                                        { label: 'Vehicle', value: pull.convictionDetails.vehicle, color: '#6366f1' },
                                        { label: 'Load',    value: pull.convictionDetails.load,    color: '#10b981' },
                                        { label: 'Other',   value: pull.convictionDetails.other,   color: '#94a3b8' },
                                      ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between text-[12px]">
                                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: r.color }}/>
                                            {r.label}
                                          </span>
                                          <span className="font-bold tabular-nums" style={{ color: r.color }}>{r.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Points status + totals */}
                                  <div className="pt-2 border-t border-slate-100">
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">By Points Status</div>
                                    <div className="space-y-1">
                                      {[
                                        { label: 'With Points',       value: pull.convictionDetails.withPoints, color: '#f59e0b' },
                                        { label: 'Not Pointed',       value: pull.convictionDetails.notPointed, color: '#94a3b8' },
                                        { label: 'Total Points',      value: pull.convictionPoints,             color: '#d97706', emphasis: true },
                                        { label: 'Total Convictions', value: pull.convictionEvents,             color: '#0f172a', emphasis: true },
                                      ].map(r => (
                                        <div key={r.label} className="flex items-center justify-between text-[12px]">
                                          <span className="inline-flex items-center gap-1.5 text-slate-500">
                                            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: r.color }}/>
                                            {r.label}
                                          </span>
                                          <span className={`font-bold tabular-nums ${'emphasis' in r && r.emphasis ? 'text-base' : ''}`} style={{ color: r.color }}>{r.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </Section>

                              {/* 5. CVOR Rating Comparison */}
                              <Section
                                k="comparison"
                                title="CVOR Rating Comparison"
                                subtitle={`Total ${lvlTotalMini} · OOS: ${lvlOosMini}`}
                                IconCmp={ClipboardCheck}
                                iconBg="bg-amber-50"
                                iconColor="text-amber-600"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                                  {lvlStatsMini.map(l => {
                                    const lColor = l.pct >= 50 ? '#ef4444' : l.pct >= 25 ? '#f97316' : l.count > 0 ? '#22c55e' : '#cbd5e1';
                                    const dotCls = l.count > 0 ? (l.pct >= 50 ? 'bg-red-500' : l.pct >= 25 ? 'bg-orange-400' : 'bg-emerald-500') : 'bg-slate-300';
                                    return (
                                      <div key={l.level} className="px-3.5 py-2.5 flex items-center gap-2.5">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotCls}`}/>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-[11px] font-semibold text-slate-700 truncate">{l.name}</div>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(l.pct, 100)}%`, backgroundColor: lColor }}/>
                                            </div>
                                            <span className="text-[10px] font-bold w-7 text-right" style={{ color: lColor }}>{l.pct.toFixed(0)}%</span>
                                          </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <div className="text-[11px] font-bold text-slate-700">{l.count} insp</div>
                                          <div className="text-[9.5px] text-slate-400">{l.oosCount} OOS</div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </Section>

                              {/* 6. Collision Breakdown by Kilometre Rate */}
                              <Section
                                k="collisionBd"
                                title="Collision Breakdown by Kilometre Rate"
                                subtitle={`${pull.collisionEvents} events · ${pull.totalCollisionPoints} pts · ${pull.colPctOfThresh.toFixed(2)}% of threshold`}
                                IconCmp={AlertTriangle}
                                iconBg="bg-red-50"
                                iconColor="text-red-600"
                              >
                                <DataListToolbar
                                  searchValue=""
                                  onSearchChange={() => {}}
                                  hideSearch
                                  columns={miniColBdColumns}
                                  onToggleColumn={(id) => setMiniColBdColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                                  totalItems={colBd.filtered.length}
                                  currentPage={colBd.safe}
                                  rowsPerPage={miniColBdRowsPerPage}
                                  onPageChange={setMiniColBdPage}
                                  onRowsPerPageChange={setMiniColBdRowsPerPage}
                                />
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {miniColBdColumns.find(c => c.id === 'period')?.visible     && <th className="px-3 py-2 text-left">Period</th>}
                                        {miniColBdColumns.find(c => c.id === 'fromDate')?.visible   && <th className="px-3 py-2 text-left">From</th>}
                                        {miniColBdColumns.find(c => c.id === 'toDate')?.visible     && <th className="px-3 py-2 text-left">To</th>}
                                        {miniColBdColumns.find(c => c.id === 'months')?.visible     && <th className="px-3 py-2 text-right">Months</th>}
                                        {miniColBdColumns.find(c => c.id === 'kmPerMonth')?.visible && <th className="px-3 py-2 text-right">KM/Month</th>}
                                        {miniColBdColumns.find(c => c.id === 'events')?.visible     && <th className="px-3 py-2 text-right">Events</th>}
                                        {miniColBdColumns.find(c => c.id === 'points')?.visible     && <th className="px-3 py-2 text-right">Points</th>}
                                        {miniColBdColumns.find(c => c.id === 'threshold')?.visible  && <th className="px-3 py-2 text-right">Threshold</th>}
                                        {miniColBdColumns.find(c => c.id === 'pctSet')?.visible     && <th className="px-3 py-2 text-right">% Set</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {colBd.paged.length > 0 ? colBd.paged.map(r => (
                                        <tr key={r.period} className="hover:bg-slate-50/60">
                                          {miniColBdColumns.find(c => c.id === 'period')?.visible     && <td className="px-3 py-2 font-bold text-blue-600 tabular-nums">{r.period}</td>}
                                          {miniColBdColumns.find(c => c.id === 'fromDate')?.visible   && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.fromDate}</td>}
                                          {miniColBdColumns.find(c => c.id === 'toDate')?.visible     && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.toDate}</td>}
                                          {miniColBdColumns.find(c => c.id === 'months')?.visible     && <td className="px-3 py-2 text-right font-semibold text-blue-600 tabular-nums">{r.months}</td>}
                                          {miniColBdColumns.find(c => c.id === 'kmPerMonth')?.visible && <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{fmtNumMini(r.kmPerMonth)}</td>}
                                          {miniColBdColumns.find(c => c.id === 'events')?.visible     && <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{r.events}</td>}
                                          {miniColBdColumns.find(c => c.id === 'points')?.visible     && <td className="px-3 py-2 text-right font-bold text-red-600 tabular-nums">{r.points}</td>}
                                          {miniColBdColumns.find(c => c.id === 'threshold')?.visible  && <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{r.threshold.toFixed(2)}</td>}
                                          {miniColBdColumns.find(c => c.id === 'pctSet')?.visible     && <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{r.pctSet.toFixed(2)}%</td>}
                                        </tr>
                                      )) : (
                                        <tr><td colSpan={miniColBdColumns.filter(c => c.visible).length || 1} className="px-4 py-6 text-center text-slate-500 text-xs">No matching periods.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                <PaginationBar
                                  totalItems={colBd.filtered.length}
                                  currentPage={colBd.safe}
                                  rowsPerPage={miniColBdRowsPerPage}
                                  onPageChange={setMiniColBdPage}
                                  onRowsPerPageChange={setMiniColBdRowsPerPage}
                                />
                                <p className="px-4 py-2 text-[10px] text-slate-500 italic border-t border-slate-100 bg-slate-50/40">
                                  *Periods derived from this pull's 24-month window (3 × 8 mo). Events/points sourced from CVOR Intervention Events.
                                </p>
                              </Section>

                              {/* 7. Conviction Breakdown by Kilometre Rate */}
                              <Section
                                k="convictionBd"
                                title="Conviction Breakdown by Kilometre Rate"
                                subtitle={`${pull.convictionEvents} events · ${pull.convictionPoints} pts · ${pull.conPctOfThresh.toFixed(2)}% of threshold`}
                                IconCmp={Scale}
                                iconBg="bg-amber-50"
                                iconColor="text-amber-600"
                              >
                                <DataListToolbar
                                  searchValue=""
                                  onSearchChange={() => {}}
                                  hideSearch
                                  columns={miniConBdColumns}
                                  onToggleColumn={(id) => setMiniConBdColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                                  totalItems={conBd.filtered.length}
                                  currentPage={conBd.safe}
                                  rowsPerPage={miniConBdRowsPerPage}
                                  onPageChange={setMiniConBdPage}
                                  onRowsPerPageChange={setMiniConBdRowsPerPage}
                                />
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-slate-50/40 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        {miniConBdColumns.find(c => c.id === 'period')?.visible     && <th className="px-3 py-2 text-left">Period</th>}
                                        {miniConBdColumns.find(c => c.id === 'fromDate')?.visible   && <th className="px-3 py-2 text-left">From</th>}
                                        {miniConBdColumns.find(c => c.id === 'toDate')?.visible     && <th className="px-3 py-2 text-left">To</th>}
                                        {miniConBdColumns.find(c => c.id === 'months')?.visible     && <th className="px-3 py-2 text-right">Months</th>}
                                        {miniConBdColumns.find(c => c.id === 'kmPerMonth')?.visible && <th className="px-3 py-2 text-right">KM/Month</th>}
                                        {miniConBdColumns.find(c => c.id === 'events')?.visible     && <th className="px-3 py-2 text-right">Events</th>}
                                        {miniConBdColumns.find(c => c.id === 'points')?.visible     && <th className="px-3 py-2 text-right">Points</th>}
                                        {miniConBdColumns.find(c => c.id === 'threshold')?.visible  && <th className="px-3 py-2 text-right">Threshold</th>}
                                        {miniConBdColumns.find(c => c.id === 'pctSet')?.visible     && <th className="px-3 py-2 text-right">% Set</th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {conBd.paged.length > 0 ? conBd.paged.map(r => (
                                        <tr key={r.period} className="hover:bg-slate-50/60">
                                          {miniConBdColumns.find(c => c.id === 'period')?.visible     && <td className="px-3 py-2 font-bold text-blue-600 tabular-nums">{r.period}</td>}
                                          {miniConBdColumns.find(c => c.id === 'fromDate')?.visible   && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.fromDate}</td>}
                                          {miniConBdColumns.find(c => c.id === 'toDate')?.visible     && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.toDate}</td>}
                                          {miniConBdColumns.find(c => c.id === 'months')?.visible     && <td className="px-3 py-2 text-right font-semibold text-blue-600 tabular-nums">{r.months}</td>}
                                          {miniConBdColumns.find(c => c.id === 'kmPerMonth')?.visible && <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{fmtNumMini(r.kmPerMonth)}</td>}
                                          {miniConBdColumns.find(c => c.id === 'events')?.visible     && <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">{r.events}</td>}
                                          {miniConBdColumns.find(c => c.id === 'points')?.visible     && <td className="px-3 py-2 text-right font-bold text-amber-600 tabular-nums">{r.points}</td>}
                                          {miniConBdColumns.find(c => c.id === 'threshold')?.visible  && <td className="px-3 py-2 text-right text-slate-700 tabular-nums">{r.threshold.toFixed(2)}</td>}
                                          {miniConBdColumns.find(c => c.id === 'pctSet')?.visible     && <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">{r.pctSet.toFixed(2)}%</td>}
                                        </tr>
                                      )) : (
                                        <tr><td colSpan={miniConBdColumns.filter(c => c.visible).length || 1} className="px-4 py-6 text-center text-slate-500 text-xs">No matching periods.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                <PaginationBar
                                  totalItems={conBd.filtered.length}
                                  currentPage={conBd.safe}
                                  rowsPerPage={miniConBdRowsPerPage}
                                  onPageChange={setMiniConBdPage}
                                  onRowsPerPageChange={setMiniConBdRowsPerPage}
                                />
                                <p className="px-4 py-2 text-[10px] text-slate-500 italic border-t border-slate-100 bg-slate-50/40">
                                  *Periods derived from this pull's 24-month window (3 × 8 mo). Events/points sourced from CVOR Intervention Events.
                                </p>
                              </Section>

                              {/* 8. Inspection Statistics */}
                              <Section
                                k="inspStats"
                                title="Inspection Statistics"
                                subtitle={`${cvsaCount} CVSA · ${vehiclesInsp} vehicles · ${driversInsp} drivers`}
                                IconCmp={ClipboardCheck}
                                iconBg="bg-blue-50"
                                iconColor="text-blue-600"
                                headerExtra={<span className={`text-[10px] font-bold tabular-nums ${insPctMini >= 70 ? 'text-red-600' : insPctMini >= 50 ? 'text-amber-600' : 'text-slate-500'}`}>{insPctMini.toFixed(1)}%</span>}
                              >
                                <table className="w-full text-xs">
                                  <tbody className="divide-y divide-slate-100">
                                    {inspRowsFiltered.length > 0 ? inspRowsFiltered.map(r => {
                                      const tone = r.tone ?? 'default';
                                      const valueColor =
                                        tone === 'red' ? 'text-red-600'
                                        : tone === 'amber' ? 'text-amber-600'
                                        : r.emphasis ? 'text-slate-900' : 'text-slate-700';
                                      const isPct = r.label.startsWith('% of');
                                      return (
                                        <tr key={r.label} className={`hover:bg-slate-50/60 ${isPct ? 'bg-orange-50/40' : ''}`}>
                                          <td className={`px-4 py-2 ${isPct ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{r.label}</td>
                                          <td className={`px-4 py-2 text-right tabular-nums font-bold ${valueColor}`}>{r.value}</td>
                                        </tr>
                                      );
                                    }) : (
                                      <tr><td colSpan={2} className="px-4 py-6 text-center text-slate-500 text-xs">No rows match your search.</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </Section>

                              {/* 9. Intervention & Event Details */}
                              <Section
                                k="events"
                                title="Intervention & Event Details"
                                subtitle={`${eventsSortedAll.length} of ${eventKpiCounts.all} events in window`}
                                IconCmp={FileText}
                                iconBg="bg-slate-100"
                                iconColor="text-slate-600"
                              >
                                {/* KPI strip */}
                                {(() => {
                                  type Tone = 'rose' | 'emerald' | 'red' | 'orange' | 'blue' | 'purple' | 'yellow';
                                  const toneMap: Record<Tone, { iconBg: string; iconText: string; ring: string; valueText: string; activeBg: string }> = {
                                    rose:    { iconBg: 'bg-rose-100',    iconText: 'text-rose-600',    ring: 'ring-rose-300 border-rose-300',       valueText: 'text-rose-700',    activeBg: 'bg-rose-50/40' },
                                    emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', ring: 'ring-emerald-300 border-emerald-300', valueText: 'text-emerald-700', activeBg: 'bg-emerald-50/40' },
                                    red:     { iconBg: 'bg-red-100',     iconText: 'text-red-600',     ring: 'ring-red-300 border-red-300',         valueText: 'text-red-700',     activeBg: 'bg-red-50/40' },
                                    orange:  { iconBg: 'bg-orange-100',  iconText: 'text-orange-600',  ring: 'ring-orange-300 border-orange-300',   valueText: 'text-orange-700',  activeBg: 'bg-orange-50/40' },
                                    blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    ring: 'ring-blue-300 border-blue-300',       valueText: 'text-blue-700',    activeBg: 'bg-blue-50/40' },
                                    purple:  { iconBg: 'bg-purple-100',  iconText: 'text-purple-600',  ring: 'ring-purple-300 border-purple-300',   valueText: 'text-purple-700',  activeBg: 'bg-purple-50/40' },
                                    yellow:  { iconBg: 'bg-yellow-100',  iconText: 'text-yellow-700',  ring: 'ring-yellow-300 border-yellow-300',   valueText: 'text-yellow-700',  activeBg: 'bg-yellow-50/40' },
                                  };
                                  type KpiDef = { id: typeof miniEventsKpiFilter; title: string; value: number; IconCmp: React.ComponentType<{ size?: number; className?: string }>; tone: Tone };
                                  const kpis: KpiDef[] = [
                                    { id: 'ALL',        title: 'All',         value: eventKpiCounts.all,       IconCmp: ClipboardCheck, tone: 'rose' },
                                    { id: 'CLEAN',      title: 'Clean',       value: eventKpiCounts.clean,     IconCmp: CheckCircle2,   tone: 'emerald' },
                                    { id: 'OOS',        title: 'OOS',         value: eventKpiCounts.oos,       IconCmp: ShieldAlert,    tone: 'red' },
                                    { id: 'VEHICLE',    title: 'Veh',         value: eventKpiCounts.vehicle,   IconCmp: Truck,          tone: 'orange' },
                                    { id: 'HOS_DRIVER', title: 'HOS/Drv',     value: eventKpiCounts.hosDriver, IconCmp: User,           tone: 'blue' },
                                    { id: 'SEVERE',     title: 'Severe',      value: eventKpiCounts.severe,    IconCmp: AlertTriangle,  tone: 'purple' },
                                    { id: 'TICKETS',    title: 'Tickets',     value: eventKpiCounts.tickets,   IconCmp: Ticket,         tone: 'yellow' },
                                  ];
                                  return (
                                    <div className="px-4 pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                      {kpis.map(k => {
                                        const t = toneMap[k.tone];
                                        const isActive = miniEventsKpiFilter === k.id;
                                        return (
                                          <button
                                            key={k.id}
                                            type="button"
                                            onClick={() => setMiniEventsKpiFilter(k.id)}
                                            className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border bg-white text-left transition-all ${
                                              isActive
                                                ? `ring-2 ring-offset-1 ${t.ring} ${t.activeBg} shadow-sm`
                                                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                            }`}
                                          >
                                            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
                                              <k.IconCmp size={13} className={t.iconText} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate leading-tight">{k.title}</div>
                                              <div className={`text-base font-black tabular-nums leading-tight mt-0.5 ${isActive ? t.valueText : 'text-slate-900'}`}>{k.value}</div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                                {/* Type filter (Inspection / Collision / Conviction) */}
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3 flex-wrap">
                                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                    <FileText size={12} className="text-slate-400" />
                                    <span className="font-semibold">Filter by type:</span>
                                    <select
                                      value={miniEventsTypeFilter}
                                      onChange={(e) => setMiniEventsTypeFilter(e.target.value as typeof miniEventsTypeFilter)}
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                      <option value="ALL">All Types</option>
                                      <option value="inspection">Inspection</option>
                                      <option value="collision">Collision</option>
                                      <option value="conviction">Conviction</option>
                                    </select>
                                  </label>
                                  <span className="text-xs text-slate-500">{eventsSortedAll.length} event{eventsSortedAll.length === 1 ? '' : 's'}</span>
                                </div>
                                <DataListToolbar
                                  searchValue={miniEventsSearch}
                                  onSearchChange={setMiniEventsSearch}
                                  searchPlaceholder="Search CVIR, ticket, driver, licence, location, vehicle, defect..."
                                  columns={miniEventsColumns}
                                  onToggleColumn={(id) => setMiniEventsColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                                  totalItems={eventsSortedAll.length}
                                  currentPage={eventsSafePage}
                                  rowsPerPage={miniEventsRowsPerPage}
                                  onPageChange={setMiniEventsPage}
                                  onRowsPerPageChange={setMiniEventsRowsPerPage}
                                />
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      <tr>
                                        {isEventVis('type')          && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('type')} className="inline-flex items-center gap-1 hover:text-slate-700">Type <SortIndicator active={miniEventsSort.col === 'type'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('date')          && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('date')} className="inline-flex items-center gap-1 hover:text-slate-700">Date <SortIndicator active={miniEventsSort.col === 'date'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('time')          && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('time')} className="inline-flex items-center gap-1 hover:text-slate-700">Time <SortIndicator active={miniEventsSort.col === 'time'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('cvirOrTicket')  && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('cvirOrTicket')} className="inline-flex items-center gap-1 hover:text-slate-700">CVIR / Ticket <SortIndicator active={miniEventsSort.col === 'cvirOrTicket'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('location')      && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('location')} className="inline-flex items-center gap-1 hover:text-slate-700">Location <SortIndicator active={miniEventsSort.col === 'location'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('driver')        && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('driver')} className="inline-flex items-center gap-1 hover:text-slate-700">Driver <SortIndicator active={miniEventsSort.col === 'driver'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('driverLicence') && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('driverLicence')} className="inline-flex items-center gap-1 hover:text-slate-700">Driver Licence <SortIndicator active={miniEventsSort.col === 'driverLicence'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('vehicle1')      && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('vehicle1')} className="inline-flex items-center gap-1 hover:text-slate-700">Vehicle 1 <SortIndicator active={miniEventsSort.col === 'vehicle1'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('vehicle2')      && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortEvent('vehicle2')} className="inline-flex items-center gap-1 hover:text-slate-700">Vehicle 2 <SortIndicator active={miniEventsSort.col === 'vehicle2'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('level')         && <th className="px-3 py-2 text-center"><button type="button" onClick={() => sortEvent('level')} className="inline-flex items-center gap-1 hover:text-slate-700">Level <SortIndicator active={miniEventsSort.col === 'level'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('vPts')          && <th className="px-3 py-2 text-center"><button type="button" onClick={() => sortEvent('vPts')} className="inline-flex items-center gap-1 hover:text-slate-700">V Pts <SortIndicator active={miniEventsSort.col === 'vPts'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('dPts')          && <th className="px-3 py-2 text-center"><button type="button" onClick={() => sortEvent('dPts')} className="inline-flex items-center gap-1 hover:text-slate-700">D Pts <SortIndicator active={miniEventsSort.col === 'dPts'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('oos')           && <th className="px-3 py-2 text-center"><button type="button" onClick={() => sortEvent('oos')} className="inline-flex items-center gap-1 hover:text-slate-700">OOS <SortIndicator active={miniEventsSort.col === 'oos'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('defects')       && <th className="px-3 py-2 text-center"><button type="button" onClick={() => sortEvent('defects')} className="inline-flex items-center gap-1 hover:text-slate-700">Defects <SortIndicator active={miniEventsSort.col === 'defects'} dir={miniEventsSort.dir}/></button></th>}
                                        {isEventVis('charged')       && <th className="px-3 py-2 text-center"><button type="button" onClick={() => sortEvent('charged')} className="inline-flex items-center gap-1 hover:text-slate-700">Charged <SortIndicator active={miniEventsSort.col === 'charged'} dir={miniEventsSort.dir}/></button></th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {eventsPaged.length > 0 ? eventsPaged.map(e => {
                                        const tb = e.type === 'inspection'
                                          ? { cls: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Inspection' }
                                          : e.type === 'collision'
                                            ? { cls: 'bg-red-50 text-red-700 border-red-200', label: 'Collision' }
                                            : { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Conviction' };
                                        const vPts = e.type === 'inspection' ? (e.vehiclePoints ?? 0) : 0;
                                        const dPts = e.type === 'inspection' ? (e.driverPoints ?? 0) : (e.pointsTotal ?? 0);
                                        const time = e.type === 'inspection'
                                          ? `${e.startTime ?? ''}${e.endTime ? '-' + e.endTime : ''}`
                                          : (e.time ?? '—');
                                        const charged = e.type === 'collision'
                                          ? (e.collision?.driverCharged === 'Y' ? 'Yes' : 'No')
                                          : e.type === 'inspection'
                                            ? (e.charged === 'Y' ? 'Yes' : 'No')
                                            : 'No';
                                        return (
                                          <tr key={e.id} className="hover:bg-slate-50/60">
                                            {isEventVis('type')          && <td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-bold ${tb.cls}`}>{tb.label}</span></td>}
                                            {isEventVis('date')          && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{e.date}</td>}
                                            {isEventVis('time')          && <td className="px-3 py-2 font-mono text-slate-600 tabular-nums">{time}</td>}
                                            {isEventVis('cvirOrTicket')  && <td className="px-3 py-2 font-mono text-slate-700">{e.cvir ?? e.ticket ?? '—'}</td>}
                                            {isEventVis('location')      && <td className="px-3 py-2 text-slate-700 truncate max-w-[180px]">{e.location ?? '—'}</td>}
                                            {isEventVis('driver')        && <td className="px-3 py-2 text-slate-700 font-medium truncate max-w-[180px]">{e.driverName ?? '—'}</td>}
                                            {isEventVis('driverLicence') && <td className="px-3 py-2 font-mono text-slate-600 truncate max-w-[160px]">{e.driverLicence ?? '—'}</td>}
                                            {isEventVis('vehicle1')      && <td className="px-3 py-2 text-slate-700">{e.vehicle1 ? `${e.vehicle1.make ?? ''} ${e.vehicle1.unit ?? ''}`.trim() || e.vehicle1.plate : '—'}</td>}
                                            {isEventVis('vehicle2')      && <td className="px-3 py-2 text-slate-700">{e.vehicle2 ? `${e.vehicle2.make ?? ''} ${e.vehicle2.unit ?? ''}`.trim() || e.vehicle2.plate : '—'}</td>}
                                            {isEventVis('level')         && <td className="px-3 py-2 text-center text-slate-700 tabular-nums">{e.type === 'inspection' ? e.level : <span className="text-slate-400">—</span>}</td>}
                                            {isEventVis('vPts')          && <td className="px-3 py-2 text-center tabular-nums"><span className={vPts > 0 ? 'font-bold text-amber-700' : 'text-slate-400'}>{vPts}</span></td>}
                                            {isEventVis('dPts')          && <td className="px-3 py-2 text-center tabular-nums"><span className={dPts > 0 ? 'font-bold text-red-700' : 'text-slate-400'}>{dPts}</span></td>}
                                            {isEventVis('oos')           && <td className="px-3 py-2 text-center tabular-nums">{e.type === 'inspection' && (e.oosCount ?? 0) > 0 ? <span className="font-bold text-amber-700">{e.oosCount}</span> : <span className="text-slate-400">—</span>}</td>}
                                            {isEventVis('defects')       && <td className="px-3 py-2 text-center tabular-nums">{e.type === 'inspection' ? <span className={(e.totalDefects ?? 0) > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>{e.totalDefects ?? 0}</span> : <span className="text-slate-400">—</span>}</td>}
                                            {isEventVis('charged')       && <td className="px-3 py-2 text-center"><span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${charged === 'Yes' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-400'}`}>{charged}</span></td>}
                                          </tr>
                                        );
                                      }) : (
                                        <tr><td colSpan={miniEventsColumns.filter(c => c.visible).length || 1} className="px-4 py-6 text-center text-slate-500 text-xs">No events match the selected filter or search.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                <PaginationBar
                                  totalItems={eventsSortedAll.length}
                                  currentPage={eventsSafePage}
                                  rowsPerPage={miniEventsRowsPerPage}
                                  onPageChange={setMiniEventsPage}
                                  onRowsPerPageChange={setMiniEventsRowsPerPage}
                                />
                              </Section>

                              {/* 10. Travel Kilometric Information */}
                              <Section
                                k="travel"
                                title="Travel Kilometric Information"
                                subtitle={`${travelSortedAll.length} of ${travelInWin.length} period${travelInWin.length === 1 ? '' : 's'} overlapping window`}
                                IconCmp={Activity}
                                iconBg="bg-slate-100"
                                iconColor="text-slate-600"
                              >
                                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center gap-3 flex-wrap">
                                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                                    <Activity size={12} className="text-slate-400" />
                                    <span className="font-semibold">Filter by type:</span>
                                    <select
                                      value={miniTravelType}
                                      onChange={(e) => setMiniTravelType(e.target.value as typeof miniTravelType)}
                                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    >
                                      <option value="ALL">All Periods</option>
                                      <option value="Estimated">Estimated only</option>
                                      <option value="Actual">Actual only</option>
                                    </select>
                                  </label>
                                  <span className="text-xs text-slate-500">{travelSortedAll.length} period{travelSortedAll.length === 1 ? '' : 's'}</span>
                                </div>
                                <DataListToolbar
                                  searchValue={miniTravelSearch}
                                  onSearchChange={setMiniTravelSearch}
                                  searchPlaceholder="Search by date or type..."
                                  columns={miniTravelColumns}
                                  onToggleColumn={(id) => setMiniTravelColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                                  totalItems={travelSortedAll.length}
                                  currentPage={travelSafePage}
                                  rowsPerPage={miniTravelRowsPerPage}
                                  onPageChange={setMiniTravelPage}
                                  onRowsPerPageChange={setMiniTravelRowsPerPage}
                                />
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                      <tr>
                                        {isTravelVis('type')           && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortTravel('type')} className="inline-flex items-center gap-1 hover:text-slate-700">E/A <SortIndicator active={miniTravelSort.col === 'type'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('fromDate')       && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortTravel('fromDate')} className="inline-flex items-center gap-1 hover:text-slate-700">From <SortIndicator active={miniTravelSort.col === 'fromDate'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('toDate')         && <th className="px-3 py-2 text-left"><button type="button" onClick={() => sortTravel('toDate')} className="inline-flex items-center gap-1 hover:text-slate-700">To <SortIndicator active={miniTravelSort.col === 'toDate'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('vehicles')       && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('vehicles')} className="inline-flex items-center gap-1 hover:text-slate-700"># Vehicles <SortIndicator active={miniTravelSort.col === 'vehicles'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('doubleShifted')  && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('doubleShifted')} className="inline-flex items-center gap-1 hover:text-slate-700"># Double Shifted <SortIndicator active={miniTravelSort.col === 'doubleShifted'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('totalVehicles')  && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('totalVehicles')} className="inline-flex items-center gap-1 hover:text-slate-700">Total Vehicles <SortIndicator active={miniTravelSort.col === 'totalVehicles'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('ontarioKm')      && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('ontarioKm')} className="inline-flex items-center gap-1 hover:text-slate-700">Ontario KM <SortIndicator active={miniTravelSort.col === 'ontarioKm'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('restOfCanadaKm') && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('restOfCanadaKm')} className="inline-flex items-center gap-1 hover:text-slate-700">Rest of Canada KM <SortIndicator active={miniTravelSort.col === 'restOfCanadaKm'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('usMexicoKm')     && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('usMexicoKm')} className="inline-flex items-center gap-1 hover:text-slate-700">US/Mexico KM <SortIndicator active={miniTravelSort.col === 'usMexicoKm'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('drivers')        && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('drivers')} className="inline-flex items-center gap-1 hover:text-slate-700"># Drivers <SortIndicator active={miniTravelSort.col === 'drivers'} dir={miniTravelSort.dir}/></button></th>}
                                        {isTravelVis('totalKm')        && <th className="px-3 py-2 text-right"><button type="button" onClick={() => sortTravel('totalKm')} className="inline-flex items-center gap-1 hover:text-slate-700">Total KM <SortIndicator active={miniTravelSort.col === 'totalKm'} dir={miniTravelSort.dir}/></button></th>}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {travelPaged.length > 0 ? travelPaged.map((r, i) => (
                                        <tr key={`${r.fromDate}-${r.toDate}-${r.type}-${i}`} className="hover:bg-slate-50/60">
                                          {isTravelVis('type')           && <td className="px-3 py-2"><span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold ${r.type === 'Estimated' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{r.type}</span></td>}
                                          {isTravelVis('fromDate')       && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.fromDate}</td>}
                                          {isTravelVis('toDate')         && <td className="px-3 py-2 font-mono text-slate-700 tabular-nums">{r.toDate}</td>}
                                          {isTravelVis('vehicles')       && <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900">{fmtNumMini(r.vehicles)}</td>}
                                          {isTravelVis('doubleShifted')  && <td className="px-3 py-2 text-right tabular-nums"><span className={r.doubleShifted > 0 ? 'font-semibold text-blue-600' : 'text-slate-400'}>{r.doubleShifted}</span></td>}
                                          {isTravelVis('totalVehicles')  && <td className="px-3 py-2 text-right tabular-nums font-bold text-slate-900">{fmtNumMini(r.totalVehicles)}</td>}
                                          {isTravelVis('ontarioKm')      && <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtNumMini(r.ontarioKm)}</td>}
                                          {isTravelVis('restOfCanadaKm') && <td className="px-3 py-2 text-right tabular-nums text-slate-700">{fmtNumMini(r.restOfCanadaKm)}</td>}
                                          {isTravelVis('usMexicoKm')     && <td className="px-3 py-2 text-right tabular-nums"><span className={r.usMexicoKm > 0 ? 'text-slate-700' : 'text-slate-400'}>{fmtNumMini(r.usMexicoKm)}</span></td>}
                                          {isTravelVis('drivers')        && <td className="px-3 py-2 text-right tabular-nums"><span className={r.drivers > 0 ? 'font-bold text-slate-900' : 'text-slate-400'}>{fmtNumMini(r.drivers)}</span></td>}
                                          {isTravelVis('totalKm')        && <td className="px-3 py-2 text-right tabular-nums font-bold text-blue-600">{fmtNumMini(r.totalKm)}</td>}
                                        </tr>
                                      )) : (
                                        <tr><td colSpan={miniTravelColumns.filter(c => c.visible).length || 1} className="px-4 py-6 text-center text-slate-500 text-xs">No travel km records match.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                                <PaginationBar
                                  totalItems={travelSortedAll.length}
                                  currentPage={travelSafePage}
                                  rowsPerPage={miniTravelRowsPerPage}
                                  onPageChange={setMiniTravelPage}
                                  onRowsPerPageChange={setMiniTravelRowsPerPage}
                                />
                              </Section>
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                );
              })()}

          {/* ══════════════════════════════════════════════════════════════
               ALL-PULLS INTERVENTION & EVENT DETAILS
               Aggregates events from every pull (deduped on type/date/driver/CVIR-or-ticket).
               Filters: time period, type, KPI, search · Sortable columns ·
               Column toggle · Pagination · Expandable rows · Hidden chart toggle.
          ══════════════════════════════════════════════════════════════ */}
          {(() => {
            // ── Aggregate + dedupe events from all pulls ──
            type AggregatedEvent = CvorInterventionEvent & {
              sourcePulls: string[]; // pull periodLabels this event appears in
            };
            const dedupKey = (e: CvorInterventionEvent) =>
              `${e.type}|${e.date}|${e.driverName ?? ''}|${e.cvir ?? e.ticket ?? ''}|${e.vehicle1?.plate ?? ''}|${e.level ?? ''}`;
            const aggregateMap = new Map<string, AggregatedEvent>();
            cvorPeriodicReports.forEach(p => {
              (p.events ?? []).forEach(e => {
                const key = dedupKey(e);
                const existing = aggregateMap.get(key);
                if (existing) {
                  if (!existing.sourcePulls.includes(p.periodLabel)) existing.sourcePulls.push(p.periodLabel);
                } else {
                  aggregateMap.set(key, { ...e, sourcePulls: [p.periodLabel] });
                }
              });
            });
            const allEvents: AggregatedEvent[] = Array.from(aggregateMap.values());

            // ── Time period / date range filter ──
            const today = new Date();
            let timeFiltered: AggregatedEvent[];
            let activeRangeLabel = 'All Time';
            if (allEventsTimePeriod === 'CUSTOM' && (allEventsDateFrom || allEventsDateTo)) {
              const fromDate = allEventsDateFrom ? new Date(allEventsDateFrom) : null;
              const toDate   = allEventsDateTo   ? new Date(allEventsDateTo)   : null;
              if (toDate) toDate.setHours(23, 59, 59, 999); // include the entire end day
              timeFiltered = allEvents.filter(e => {
                const ed = new Date(e.date);
                if (fromDate && ed < fromDate) return false;
                if (toDate   && ed > toDate)   return false;
                return true;
              });
              activeRangeLabel = `${allEventsDateFrom || '…'} → ${allEventsDateTo || '…'}`;
            } else {
              const cutoffMonths =
                allEventsTimePeriod === '12M' ? 12 :
                allEventsTimePeriod === '24M' ? 24 :
                allEventsTimePeriod === '36M' ? 36 :
                undefined;
              if (cutoffMonths !== undefined) {
                const cutoffDate = new Date(today);
                cutoffDate.setMonth(cutoffDate.getMonth() - cutoffMonths);
                timeFiltered = allEvents.filter(e => new Date(e.date) >= cutoffDate);
                activeRangeLabel = `Last ${cutoffMonths} months`;
              } else {
                timeFiltered = allEvents;
              }
            }

            // ── KPI helpers ──
            const VEH_DEFECT_CATS = ['BRAKE SYSTEM', 'WHEELS/RIMS', 'COUPLING DEVICES', 'BODY', 'LOAD SECURITY', 'REGISTRATION', 'OFFICER DIRECTION'];
            const DRV_DEFECT_CATS = ['HOURS OF SERVICE', 'DRIVERS LICENCES', 'TRIP INSPECTION', 'CVOR/NSC'];
            const isCleanFn = (e: CvorInterventionEvent) =>
              e.type === 'inspection' && (e.oosCount ?? 0) === 0 && (e.totalDefects ?? 0) === 0 &&
              (e.vehiclePoints ?? 0) === 0 && (e.driverPoints ?? 0) === 0;
            const hasOosFn = (e: CvorInterventionEvent) => (e.oosCount ?? 0) > 0;
            const hasVehIssueFn = (e: CvorInterventionEvent) =>
              (e.vehiclePoints ?? 0) > 0 || (e.defects ?? []).some(d => VEH_DEFECT_CATS.includes(d.category));
            const hasDriverIssueFn = (e: CvorInterventionEvent) =>
              (e.driverPoints ?? 0) > 0 || (e.defects ?? []).some(d => DRV_DEFECT_CATS.includes(d.category));
            const isSevereFn = (e: CvorInterventionEvent) => {
              const tp = (e.vehiclePoints ?? 0) + (e.driverPoints ?? 0) + (e.pointsTotal ?? 0);
              return tp >= 7 || (e.totalDefects ?? 0) >= 7;
            };
            const hasTicketFn = (e: CvorInterventionEvent) =>
              !!e.ticket || e.charged === 'Y' || e.collision?.driverCharged === 'Y';

            const kpiCounts = {
              all:        timeFiltered.length,
              clean:      timeFiltered.filter(isCleanFn).length,
              oos:        timeFiltered.filter(hasOosFn).length,
              vehicle:    timeFiltered.filter(hasVehIssueFn).length,
              hosDriver:  timeFiltered.filter(hasDriverIssueFn).length,
              severe:     timeFiltered.filter(isSevereFn).length,
              tickets:    timeFiltered.filter(hasTicketFn).length,
            };

            // ── Apply type + KPI + search filters ──
            const matchesType = (e: AggregatedEvent) => allEventsType === 'ALL' ? true : e.type === allEventsType;
            const matchesKpi = (e: AggregatedEvent) => {
              switch (allEventsKpi) {
                case 'ALL':        return true;
                case 'CLEAN':      return isCleanFn(e);
                case 'OOS':        return hasOosFn(e);
                case 'VEHICLE':    return hasVehIssueFn(e);
                case 'HOS_DRIVER': return hasDriverIssueFn(e);
                case 'SEVERE':     return isSevereFn(e);
                case 'TICKETS':    return hasTicketFn(e);
              }
            };
            const matchesSearch = (e: AggregatedEvent) => {
              const q = allEventsSearch.trim().toLowerCase();
              if (!q) return true;
              const hay = [
                e.cvir, e.ticket, e.location, e.driverName, e.driverLicence,
                e.vehicle1?.make, e.vehicle1?.unit, e.vehicle1?.plate,
                e.vehicle2?.make, e.vehicle2?.unit, e.vehicle2?.plate,
                e.type, e.date,
                e.collision?.collisionClass, e.collision?.microfilm,
                e.conviction?.offence, e.conviction?.microfilm,
                ...e.sourcePulls,
                ...(e.defects ?? []).flatMap(d => [d.category, d.defect]),
              ].filter(Boolean).join(' ').toLowerCase();
              return hay.includes(q);
            };
            const filteredEvents = timeFiltered.filter(e => matchesType(e) && matchesKpi(e) && matchesSearch(e));

            // ── Sort ──
            const sortVal = (r: AggregatedEvent): string | number => {
              switch (allEventsSort.col) {
                case 'date':          return new Date(r.date).getTime();
                case 'time':          return r.startTime ?? r.time ?? '';
                case 'type':          return r.type;
                case 'cvirOrTicket':  return r.cvir ?? r.ticket ?? '';
                case 'location':      return r.location ?? '';
                case 'driver':        return r.driverName ?? '';
                case 'driverLicence': return r.driverLicence ?? '';
                case 'vehicle1':      return r.vehicle1?.plate ?? '';
                case 'vehicle2':      return r.vehicle2?.plate ?? '';
                case 'level':         return r.level ?? -1;
                case 'vPts':          return r.vehiclePoints ?? 0;
                case 'dPts':          return (r.driverPoints ?? 0) + (r.pointsTotal ?? 0);
                case 'oos':           return r.oosCount ?? 0;
                case 'defects':       return r.totalDefects ?? 0;
                case 'charged':       return (r.charged === 'Y' || r.collision?.driverCharged === 'Y') ? 1 : 0;
                case 'sourcePulls':   return r.sourcePulls.length;
                default:              return 0;
              }
            };
            const sortedEvents = [...filteredEvents].sort((a, b) => {
              const dir = allEventsSort.dir === 'asc' ? 1 : -1;
              const av = sortVal(a), bv = sortVal(b);
              if (av < bv) return -1 * dir;
              if (av > bv) return 1 * dir;
              return 0;
            });

            const totalPages = Math.max(1, Math.ceil(sortedEvents.length / allEventsRowsPerPage));
            const safePage = Math.min(allEventsPage, totalPages);
            const pagedEvents = sortedEvents.slice((safePage - 1) * allEventsRowsPerPage, safePage * allEventsRowsPerPage);
            const isVis = (id: string) => allEventsColumns.find(c => c.id === id)?.visible !== false;
            const onSort = (col: string) => setAllEventsSort(p => p.col === col ? { col, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' });
            const SortIcon = ({ col }: { col: string }) =>
              allEventsSort.col === col
                ? (allEventsSort.dir === 'asc'
                    ? <ChevronUp size={11} className="text-blue-500 inline -mt-0.5" />
                    : <ChevronDown size={11} className="text-blue-500 inline -mt-0.5" />)
                : <ChevronDown size={11} className="text-slate-300 inline -mt-0.5" />;

            // ── Chart data: events per month, by type ──
            const chartBuckets = new Map<string, { collision: number; conviction: number; inspection: number }>();
            timeFiltered.forEach(e => {
              const key = e.date.slice(0, 7); // YYYY-MM
              const b = chartBuckets.get(key) ?? { collision: 0, conviction: 0, inspection: 0 };
              b[e.type]++;
              chartBuckets.set(key, b);
            });
            const chartKeys = Array.from(chartBuckets.keys()).sort();
            const chartMax = chartKeys.length > 0
              ? Math.max(...chartKeys.map(k => {
                  const b = chartBuckets.get(k)!;
                  return b.collision + b.conviction + b.inspection;
                }))
              : 1;

            const typeBadge = (t: CvorInterventionEvent['type']) => {
              if (t === 'inspection') return { cls: 'bg-blue-50 text-blue-700 border-blue-200', IconCmp: ClipboardCheck, label: 'Inspection' };
              if (t === 'collision')  return { cls: 'bg-red-50 text-red-700 border-red-200',     IconCmp: Truck,          label: 'Collision'  };
              return                       { cls: 'bg-amber-50 text-amber-700 border-amber-200', IconCmp: Scale,          label: 'Conviction' };
            };

            const fmtVeh = (v?: { make: string; unit: string; plate: string }) => {
              if (!v || (!v.make && !v.unit && !v.plate)) return '—';
              const top = [v.make, v.unit].filter(Boolean).join(' ');
              return { top: top || '—', plate: v.plate || '' };
            };

            const visibleColCount = allEventsColumns.filter(c => c.visible).length + 1;

            return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header + Show chart toggle */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText size={15} className="text-slate-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-slate-900">Intervention &amp; Event Details</div>
                        <InfoTooltip title="All-pulls aggregate" text="Events deduplicated across every uploaded pull. Same physical event is shown once even when it falls inside multiple pulls' overlapping 12/24-month windows. The Pull Coverage column shows which pulls referenced each event." />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {allEvents.length} unique events across {cvorPeriodicReports.length} pulls  ·  {filteredEvents.length} match current filters
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllEventsChartOpen(o => !o)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-sm transition-colors ${
                      allEventsChartOpen
                        ? 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Activity size={13} />
                    {allEventsChartOpen ? 'Hide Chart' : 'Show Chart'}
                  </button>
                </div>

                {/* Chart (collapsible) — responsive SVG with axes + legend */}
                {allEventsChartOpen && (() => {
                  if (chartKeys.length === 0) {
                    return (
                      <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mb-2">Events by Month</div>
                        <div className="text-xs text-slate-500 py-6 text-center italic">No events in the selected time period.</div>
                      </div>
                    );
                  }

                  // SVG layout — uses viewBox so it scales smoothly across small/large screens.
                  const VW = 800;
                  const VH = 280;
                  const M = { top: 16, right: 24, bottom: 56, left: 44 };
                  const plotW = VW - M.left - M.right;
                  const plotH = VH - M.top - M.bottom;
                  const n = chartKeys.length;
                  // Cap bar width so a small data range doesn't stretch absurdly wide on big screens.
                  const slotW = plotW / n;
                  const barW = Math.min(slotW * 0.7, 56);
                  // Y-axis: build 4–5 nice round ticks up to chartMax.
                  const niceMax = Math.max(1, Math.ceil(chartMax / 5) * 5);
                  const ticks: number[] = [];
                  const tickStep = niceMax / 4;
                  for (let i = 0; i <= 4; i++) ticks.push(Math.round(i * tickStep));
                  const yScale = (v: number) => M.top + plotH - (v / niceMax) * plotH;
                  // X labels: thin out if too many buckets to avoid overlap.
                  const xLabelEvery = n <= 12 ? 1 : n <= 24 ? 2 : n <= 36 ? 3 : Math.ceil(n / 12);

                  return (
                    <div className="border-b border-slate-100 bg-slate-50/50 px-3 sm:px-5 py-4">
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em]">
                          Events by Month  ·  {n} bucket{n === 1 ? '' : 's'}  ·  peak {chartMax}/mo
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-600">
                          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block"/>Collisions</span>
                          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block"/>Convictions</span>
                          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block"/>Inspections</span>
                        </div>
                      </div>
                      <div className="w-full">
                        <svg
                          viewBox={`0 0 ${VW} ${VH}`}
                          preserveAspectRatio="xMidYMid meet"
                          className="w-full h-auto"
                          style={{ maxHeight: 360 }}
                        >
                          {/* Y grid + tick labels */}
                          {ticks.map(t => (
                            <g key={t}>
                              <line x1={M.left} x2={VW - M.right} y1={yScale(t)} y2={yScale(t)} stroke="#e2e8f0" strokeWidth={1} strokeDasharray={t === 0 ? '0' : '3 3'} />
                              <text x={M.left - 8} y={yScale(t) + 4} textAnchor="end" fontSize="11" fill="#64748b" fontFamily="ui-monospace, monospace">{t}</text>
                            </g>
                          ))}
                          {/* Y axis line */}
                          <line x1={M.left} x2={M.left} y1={M.top} y2={M.top + plotH} stroke="#cbd5e1" strokeWidth={1} />
                          {/* Y axis title */}
                          <text x={14} y={M.top + plotH / 2} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold" transform={`rotate(-90, 14, ${M.top + plotH / 2})`}>Events</text>

                          {/* Stacked bars */}
                          {chartKeys.map((k, i) => {
                            const b = chartBuckets.get(k)!;
                            const total = b.collision + b.conviction + b.inspection;
                            const cx = M.left + slotW * i + slotW / 2;
                            const x = cx - barW / 2;
                            // Stack bottom→top: inspection (blue), conviction (amber), collision (red)
                            const insY = yScale(b.inspection);
                            const insH = (M.top + plotH) - insY;
                            const conY = yScale(b.inspection + b.conviction);
                            const conH = insY - conY;
                            const colY = yScale(total);
                            const colH = conY - colY;
                            const showLabel = (i % xLabelEvery) === 0 || i === n - 1;
                            return (
                              <g key={k}>
                                {b.inspection > 0 && (
                                  <rect x={x} y={insY} width={barW} height={insH} fill="#60a5fa" rx={1}>
                                    <title>{`${k} · Inspections: ${b.inspection}`}</title>
                                  </rect>
                                )}
                                {b.conviction > 0 && (
                                  <rect x={x} y={conY} width={barW} height={conH} fill="#fbbf24" rx={1}>
                                    <title>{`${k} · Convictions: ${b.conviction}`}</title>
                                  </rect>
                                )}
                                {b.collision > 0 && (
                                  <rect x={x} y={colY} width={barW} height={colH} fill="#f87171" rx={1}>
                                    <title>{`${k} · Collisions: ${b.collision}`}</title>
                                  </rect>
                                )}
                                {/* Total label above bar */}
                                {total > 0 && (
                                  <text x={cx} y={colY - 4} textAnchor="middle" fontSize="10" fill="#0f172a" fontWeight="600">{total}</text>
                                )}
                                {/* X label */}
                                {showLabel && (
                                  <text
                                    x={cx}
                                    y={M.top + plotH + 14}
                                    textAnchor="end"
                                    fontSize="10"
                                    fill="#64748b"
                                    fontFamily="ui-monospace, monospace"
                                    transform={`rotate(-45, ${cx}, ${M.top + plotH + 14})`}
                                  >{k}</text>
                                )}
                              </g>
                            );
                          })}

                          {/* X axis line */}
                          <line x1={M.left} x2={VW - M.right} y1={M.top + plotH} y2={M.top + plotH} stroke="#cbd5e1" strokeWidth={1} />
                          {/* X axis title */}
                          <text x={M.left + plotW / 2} y={VH - 6} textAnchor="middle" fontSize="10" fill="#64748b" fontWeight="bold">Month</text>
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {/* Time Period + Custom Date Range + Type filter row */}
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Time Period</span>
                      <div className="inline-flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm flex-wrap">
                        {(['12M', '24M', '36M', 'ALL', 'CUSTOM'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setAllEventsTimePeriod(p)}
                            className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all whitespace-nowrap ${
                              allEventsTimePeriod === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >{p === 'ALL' ? 'All Time' : p === 'CUSTOM' ? 'Custom' : p}</button>
                        ))}
                      </div>
                      <span className="h-4 w-px bg-slate-300 hidden sm:inline-block"/>
                      <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                        <FileText size={12} className="text-slate-400" />
                        <span className="font-semibold">Type:</span>
                        <select
                          value={allEventsType}
                          onChange={(e) => setAllEventsType(e.target.value as typeof allEventsType)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="ALL">All Types</option>
                          <option value="inspection">Inspection</option>
                          <option value="collision">Collision</option>
                          <option value="conviction">Conviction</option>
                        </select>
                      </label>
                    </div>
                    <span className="text-[11px] text-slate-500 whitespace-nowrap">
                      <span className="hidden md:inline">{activeRangeLabel} · </span>
                      Showing <span className="font-bold text-slate-800">{filteredEvents.length}</span> of <span className="font-bold text-slate-800">{timeFiltered.length}</span>
                    </span>
                  </div>
                  {/* Custom date range row — only when Custom is active */}
                  {allEventsTimePeriod === 'CUSTOM' && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-200/70">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Date Range</span>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-semibold">From:</span>
                        <input
                          type="date"
                          value={allEventsDateFrom}
                          onChange={(e) => setAllEventsDateFrom(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </label>
                      <label className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-semibold">To:</span>
                        <input
                          type="date"
                          value={allEventsDateTo}
                          onChange={(e) => setAllEventsDateTo(e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                      </label>
                      {(allEventsDateFrom || allEventsDateTo) && (
                        <button
                          type="button"
                          onClick={() => { setAllEventsDateFrom(''); setAllEventsDateTo(''); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm"
                        >
                          <X size={10} /> Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* KPI cards */}
                {(() => {
                  type Tone = 'rose' | 'emerald' | 'red' | 'orange' | 'blue' | 'purple' | 'yellow';
                  const toneMap: Record<Tone, { iconBg: string; iconText: string; ring: string; valueText: string; activeBg: string }> = {
                    rose:    { iconBg: 'bg-rose-100',    iconText: 'text-rose-600',    ring: 'ring-rose-300 border-rose-300',       valueText: 'text-rose-700',    activeBg: 'bg-rose-50/40' },
                    emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', ring: 'ring-emerald-300 border-emerald-300', valueText: 'text-emerald-700', activeBg: 'bg-emerald-50/40' },
                    red:     { iconBg: 'bg-red-100',     iconText: 'text-red-600',     ring: 'ring-red-300 border-red-300',         valueText: 'text-red-700',     activeBg: 'bg-red-50/40' },
                    orange:  { iconBg: 'bg-orange-100',  iconText: 'text-orange-600',  ring: 'ring-orange-300 border-orange-300',   valueText: 'text-orange-700',  activeBg: 'bg-orange-50/40' },
                    blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    ring: 'ring-blue-300 border-blue-300',       valueText: 'text-blue-700',    activeBg: 'bg-blue-50/40' },
                    purple:  { iconBg: 'bg-purple-100',  iconText: 'text-purple-600',  ring: 'ring-purple-300 border-purple-300',   valueText: 'text-purple-700',  activeBg: 'bg-purple-50/40' },
                    yellow:  { iconBg: 'bg-yellow-100',  iconText: 'text-yellow-700',  ring: 'ring-yellow-300 border-yellow-300',   valueText: 'text-yellow-700',  activeBg: 'bg-yellow-50/40' },
                  };
                  type KpiDef = { id: typeof allEventsKpi; title: string; value: number; IconCmp: React.ComponentType<{ size?: number; className?: string }>; tone: Tone };
                  const kpis: KpiDef[] = [
                    { id: 'ALL',        title: 'All CVOR',    value: kpiCounts.all,       IconCmp: ClipboardCheck, tone: 'rose' },
                    { id: 'CLEAN',      title: 'Clean',       value: kpiCounts.clean,     IconCmp: CheckCircle2,   tone: 'emerald' },
                    { id: 'OOS',        title: 'OOS Flags',   value: kpiCounts.oos,       IconCmp: ShieldAlert,    tone: 'red' },
                    { id: 'VEHICLE',    title: 'Veh. Issues', value: kpiCounts.vehicle,   IconCmp: Truck,          tone: 'orange' },
                    { id: 'HOS_DRIVER', title: 'HOS/Driver',  value: kpiCounts.hosDriver, IconCmp: User,           tone: 'blue' },
                    { id: 'SEVERE',     title: 'Severe (7+)', value: kpiCounts.severe,    IconCmp: AlertTriangle,  tone: 'purple' },
                    { id: 'TICKETS',    title: 'Tickets',     value: kpiCounts.tickets,   IconCmp: Ticket,         tone: 'yellow' },
                  ];
                  return (
                    <div className="px-5 pt-4 pb-3 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {kpis.map(k => {
                        const t = toneMap[k.tone];
                        const isActive = allEventsKpi === k.id;
                        return (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => setAllEventsKpi(k.id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border bg-white text-left transition-all ${
                              isActive
                                ? `ring-2 ring-offset-1 ${t.ring} ${t.activeBg} shadow-sm`
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.iconBg}`}>
                              <k.IconCmp size={16} className={t.iconText} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate leading-tight">{k.title}</div>
                              <div className={`text-xl font-black tabular-nums leading-tight mt-0.5 ${isActive ? t.valueText : 'text-slate-900'}`}>{k.value}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Search + columns toolbar */}
                <DataListToolbar
                  searchValue={allEventsSearch}
                  onSearchChange={setAllEventsSearch}
                  searchPlaceholder="Search CVIR, ticket, driver, licence, location, vehicle, defect, pull..."
                  columns={allEventsColumns}
                  onToggleColumn={(id) => setAllEventsColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))}
                  totalItems={sortedEvents.length}
                  currentPage={safePage}
                  rowsPerPage={allEventsRowsPerPage}
                  onPageChange={setAllEventsPage}
                  onRowsPerPageChange={setAllEventsRowsPerPage}
                />

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-2 py-2.5 w-8" />
                        {isVis('type')          && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('type')} className="inline-flex items-center gap-1 hover:text-slate-700">Type <SortIcon col="type"/></button></th>}
                        {isVis('date')          && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('date')} className="inline-flex items-center gap-1 hover:text-slate-700">Date <SortIcon col="date"/></button></th>}
                        {isVis('time')          && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('time')} className="inline-flex items-center gap-1 hover:text-slate-700">Time <SortIcon col="time"/></button></th>}
                        {isVis('cvirOrTicket')  && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('cvirOrTicket')} className="inline-flex items-center gap-1 hover:text-slate-700">CVIR / Ticket <SortIcon col="cvirOrTicket"/></button></th>}
                        {isVis('location')      && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('location')} className="inline-flex items-center gap-1 hover:text-slate-700">Location <SortIcon col="location"/></button></th>}
                        {isVis('driver')        && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('driver')} className="inline-flex items-center gap-1 hover:text-slate-700">Driver <SortIcon col="driver"/></button></th>}
                        {isVis('driverLicence') && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('driverLicence')} className="inline-flex items-center gap-1 hover:text-slate-700">Driver Licence <SortIcon col="driverLicence"/></button></th>}
                        {isVis('vehicle1')      && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('vehicle1')} className="inline-flex items-center gap-1 hover:text-slate-700">Vehicle 1 <SortIcon col="vehicle1"/></button></th>}
                        {isVis('vehicle2')      && <th className="px-3 py-2.5 text-left"><button type="button" onClick={() => onSort('vehicle2')} className="inline-flex items-center gap-1 hover:text-slate-700">Vehicle 2 <SortIcon col="vehicle2"/></button></th>}
                        {isVis('level')         && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('level')} className="inline-flex items-center gap-1 hover:text-slate-700">Level <SortIcon col="level"/></button></th>}
                        {isVis('vPts')          && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('vPts')} className="inline-flex items-center gap-1 hover:text-slate-700">V Pts <SortIcon col="vPts"/></button></th>}
                        {isVis('dPts')          && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('dPts')} className="inline-flex items-center gap-1 hover:text-slate-700">D Pts <SortIcon col="dPts"/></button></th>}
                        {isVis('oos')           && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('oos')} className="inline-flex items-center gap-1 hover:text-slate-700">OOS <SortIcon col="oos"/></button></th>}
                        {isVis('defects')       && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('defects')} className="inline-flex items-center gap-1 hover:text-slate-700">Defects <SortIcon col="defects"/></button></th>}
                        {isVis('charged')       && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('charged')} className="inline-flex items-center gap-1 hover:text-slate-700">Charged <SortIcon col="charged"/></button></th>}
                        {isVis('sourcePulls')   && <th className="px-3 py-2.5 text-center"><button type="button" onClick={() => onSort('sourcePulls')} className="inline-flex items-center gap-1 hover:text-slate-700">Pull Coverage <SortIcon col="sourcePulls"/></button></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pagedEvents.length === 0 ? (
                        <tr>
                          <td colSpan={visibleColCount} className="px-5 py-10 text-center text-sm text-slate-500">
                            No events match the selected filters.
                          </td>
                        </tr>
                      ) : pagedEvents.map(e => {
                        const tb = typeBadge(e.type);
                        const rowKey = e.id + '|' + e.date;
                        const isOpen = allEventsExpanded === rowKey;
                        const v1 = fmtVeh(e.vehicle1);
                        const v2 = fmtVeh(e.vehicle2);
                        const vPts = e.type === 'inspection' ? (e.vehiclePoints ?? 0) : 0;
                        const dPts = e.type === 'inspection' ? (e.driverPoints ?? 0) : (e.pointsTotal ?? 0);
                        const time = e.type === 'inspection'
                          ? `${e.startTime ?? ''}${e.endTime ? '-' + e.endTime : ''}`
                          : (e.time ?? '—');
                        const charged = e.type === 'collision'
                          ? (e.collision?.driverCharged === 'Y' ? 'Yes' : 'No')
                          : e.type === 'inspection'
                            ? (e.charged === 'Y' ? 'Yes' : 'No')
                            : 'No';

                        return (
                          <Fragment key={rowKey}>
                            <tr
                              onClick={() => setAllEventsExpanded(isOpen ? null : rowKey)}
                              className={`cursor-pointer transition-colors ${isOpen ? 'bg-blue-50/40' : 'hover:bg-slate-50/60'}`}
                            >
                              <td className="px-2 py-2.5 text-center">
                                {isOpen ? <ChevronUp size={14} className="text-slate-400 inline" /> : <ChevronDown size={14} className="text-slate-400 inline" />}
                              </td>
                              {isVis('type') && (
                                <td className="px-3 py-2.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-bold ${tb.cls}`}>
                                    <tb.IconCmp size={11} />
                                    {tb.label}
                                  </span>
                                </td>
                              )}
                              {isVis('date')          && <td className="px-3 py-2.5 font-mono text-slate-700 tabular-nums">{e.date}</td>}
                              {isVis('time')          && <td className="px-3 py-2.5 font-mono text-slate-600 tabular-nums">{time}</td>}
                              {isVis('cvirOrTicket')  && <td className="px-3 py-2.5 font-mono text-slate-700">{e.cvir ?? e.ticket ?? '—'}</td>}
                              {isVis('location')      && <td className="px-3 py-2.5 text-slate-700 max-w-[180px] truncate">{e.location ?? '—'}</td>}
                              {isVis('driver')        && <td className="px-3 py-2.5 text-slate-700 font-medium max-w-[180px] truncate">{e.driverName ?? '—'}</td>}
                              {isVis('driverLicence') && <td className="px-3 py-2.5 font-mono text-slate-600 max-w-[160px] truncate">{e.driverLicence ?? '—'}</td>}
                              {isVis('vehicle1') && (
                                <td className="px-3 py-2.5">
                                  {typeof v1 === 'string'
                                    ? <span className="text-slate-400">{v1}</span>
                                    : <div><div className="font-bold text-slate-800">{v1.top}</div>{v1.plate && <div className="font-mono text-[10px] text-blue-600">{v1.plate}</div>}</div>}
                                </td>
                              )}
                              {isVis('vehicle2') && (
                                <td className="px-3 py-2.5">
                                  {typeof v2 === 'string'
                                    ? <span className="text-slate-400">{v2}</span>
                                    : <div><div className="font-bold text-slate-800">{v2.top}</div>{v2.plate && <div className="font-mono text-[10px] text-blue-600">{v2.plate}</div>}</div>}
                                </td>
                              )}
                              {isVis('level') && (
                                <td className="px-3 py-2.5 text-center text-slate-700 tabular-nums">
                                  {e.type === 'inspection' ? e.level : <span className="text-slate-400">—</span>}
                                </td>
                              )}
                              {isVis('vPts') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  {e.type === 'inspection'
                                    ? <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 rounded ${vPts > 0 ? 'bg-amber-50 text-amber-700 font-bold' : 'text-slate-400'}`}>{vPts}</span>
                                    : <span className="text-slate-400">0</span>}
                                </td>
                              )}
                              {isVis('dPts') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  <span className={`inline-flex items-center justify-center min-w-[20px] px-1.5 rounded ${dPts > 0 ? 'bg-red-50 text-red-700 font-bold' : 'text-slate-400'}`}>{dPts}</span>
                                </td>
                              )}
                              {isVis('oos') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  {e.type === 'inspection' && (e.oosCount ?? 0) > 0
                                    ? <span className="inline-flex items-center gap-1 px-1.5 rounded border bg-amber-50 text-amber-700 border-amber-200 font-bold"><AlertTriangle size={10} />{e.oosCount}</span>
                                    : <span className="text-slate-400">—</span>}
                                </td>
                              )}
                              {isVis('defects') && (
                                <td className="px-3 py-2.5 text-center tabular-nums">
                                  {e.type === 'inspection'
                                    ? <span className={(e.totalDefects ?? 0) > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}>{e.totalDefects ?? 0}</span>
                                    : <span className="text-slate-400">—</span>}
                                </td>
                              )}
                              {isVis('charged') && (
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${charged === 'Yes' ? 'bg-red-50 text-red-700 border border-red-200' : 'text-slate-400'}`}>{charged}</span>
                                </td>
                              )}
                              {isVis('sourcePulls') && (
                                <td className="px-3 py-2.5 text-center">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200" title={e.sourcePulls.join(', ')}>
                                    {e.sourcePulls.length} pull{e.sourcePulls.length === 1 ? '' : 's'}
                                  </span>
                                </td>
                              )}
                            </tr>
                            {isOpen && (
                              <tr>
                                <td colSpan={visibleColCount} className="px-5 py-3 bg-slate-50/60 border-t border-slate-100">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                    <div className="bg-white rounded-lg border border-slate-200 p-3">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pull Coverage</div>
                                      <div className="flex flex-wrap gap-1">
                                        {e.sourcePulls.map(label => (
                                          <span key={label} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">{label}</span>
                                        ))}
                                      </div>
                                    </div>
                                    {e.type === 'inspection' && (
                                      <div className="bg-white rounded-lg border border-slate-200 p-3 md:col-span-2">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Inspection Detail</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                          <div className="flex justify-between"><span className="text-slate-500">Level</span><span className="font-bold text-slate-800">{e.level}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">CVIR #</span><span className="font-mono text-slate-700">{e.cvir ?? '—'}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Vehicle Pts</span><span className={`font-bold ${(e.vehiclePoints ?? 0) > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{e.vehiclePoints ?? 0}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Driver Pts</span><span className={`font-bold ${(e.driverPoints ?? 0) > 0 ? 'text-red-700' : 'text-slate-700'}`}>{e.driverPoints ?? 0}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">OOS</span><span className={`font-bold ${(e.oosCount ?? 0) > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{e.oosCount ?? 0}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Total Defects</span><span className="font-bold text-slate-700">{e.totalDefects ?? 0}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Charged</span><span className={`font-bold ${e.charged === 'Y' ? 'text-red-700' : 'text-emerald-700'}`}>{e.charged ?? 'N'}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Co-Driver</span><span className="font-bold text-slate-700">{e.coDriver ?? 'N'}</span></div>
                                        </div>
                                      </div>
                                    )}
                                    {e.type === 'collision' && e.collision && (
                                      <div className="bg-white rounded-lg border border-slate-200 p-3 md:col-span-2">
                                        <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Collision Detail</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                          <div className="flex justify-between"><span className="text-slate-500">Class</span><span className="font-bold text-slate-800">{e.collision.collisionClass}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Jurisdiction</span><span className="font-bold text-slate-800">{e.collision.jurisdiction}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Vehicle Action</span><span className="text-slate-700 text-[10px]">{e.collision.vehicleAction}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Driver Action</span><span className="text-slate-700 text-[10px]">{e.collision.driverAction}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Microfilm #</span><span className="font-mono text-slate-700">{e.collision.microfilm}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Driver Charged</span><span className={`font-bold ${e.collision.driverCharged === 'Y' ? 'text-red-700' : 'text-emerald-700'}`}>{e.collision.driverCharged}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Points</span><span className="font-bold text-red-700">{e.collision.points}</span></div>
                                        </div>
                                      </div>
                                    )}
                                    {e.type === 'conviction' && e.conviction && (
                                      <div className="bg-white rounded-lg border border-slate-200 p-3 md:col-span-2">
                                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">Conviction Detail</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                          <div className="flex justify-between"><span className="text-slate-500">Offence</span><span className="font-bold text-slate-800 text-[10px]">{e.conviction.offence}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Conviction Date</span><span className="font-mono text-slate-700">{e.conviction.convictionDate}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Jurisdiction</span><span className="font-bold text-slate-800">{e.conviction.jurisdiction}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Microfilm #</span><span className="font-mono text-slate-700">{e.conviction.microfilm}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Charged Carrier</span><span className="font-bold text-slate-800">{e.conviction.chargedCarrier}</span></div>
                                          <div className="flex justify-between"><span className="text-slate-500">Points</span><span className="font-bold text-amber-700">{e.conviction.points}</span></div>
                                        </div>
                                      </div>
                                    )}
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

                {/* Pagination */}
                <PaginationBar
                  totalItems={sortedEvents.length}
                  currentPage={safePage}
                  rowsPerPage={allEventsRowsPerPage}
                  onPageChange={setAllEventsPage}
                  onRowsPerPageChange={setAllEventsRowsPerPage}
                />
              </div>
            );
          })()}

        </div>
        );
      })()}

      {/* ===== TAB: CARRIER PROFILE (NSC ALBERTA) ===== */}
      {activeMainTab === 'carrier-profile-ab' && (
        <div className="space-y-6">

          {/* Last Updated + Last Uploaded banner */}
          <div className="flex items-center justify-between bg-emerald-50/60 border border-emerald-100 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-emerald-700">
              <Info size={14} />
              <span className="font-semibold">Last Updated:</span>
              <span className="font-mono font-bold">December 15, 2025 - 3:42 PM EST</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <Upload size={14} />
              <span className="font-semibold">Last Uploaded:</span>
              <span className="font-mono font-bold">December 10, 2025 - 11:15 AM EST</span>
            </div>
          </div>

          {/* â"€â"€ NSC Top Row: Safety Rating & OOS + Licensing â"€â"€ */}
          <div className="hidden grid grid-cols-1 md:grid-cols-2 gap-4">
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
                              <td className="px-3 py-2 text-center text-slate-500">-</td>
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

          <NscPerformanceCard {...ALBERTA_NSC_PERFORMANCE_CARD} />

          {/* ── Latest-pull data (inline, always visible) ── */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">NSC Performance</span>
              <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Latest pull</span>
              <span className="ml-auto text-[10px] text-slate-400">conviction &middot; CVSA &middot; summaries &middot; details</span>
            </div>
            <div className="p-4 space-y-2.5">

              <AbAnalysisRow
                title="Conviction Analysis"
                subtitle="2 conviction events | analysis, summary, and detailed conviction history"
                statLabel="Contribution"
                statVal="34.60%"
                badge="OK"
                badgeCls="bg-emerald-100 text-emerald-700 border-emerald-300"
                open={!!abMainOpen.conv}
                onToggle={() => abMainTog('conv')}
              >
                <div>
                  <AbConvictionAnalysisTable />
                  <AbConvSub
                    title="Conviction Summary"
                    badge="2 RECORDS"
                    open={!!abMainOpen.convSummary}
                    onToggle={() => abMainTog('convSummary')}
                  >
                    <AbConvictionSummaryList />
                  </AbConvSub>
                  <AbConvSub
                    title="Conviction Details"
                    badge="2 RECORDS"
                    open={!!abMainOpen.convDetails}
                    onToggle={() => abMainTog('convDetails')}
                  >
                    <AbConvictionDetailsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="CVSA Inspection Analysis"
                subtitle="9 inspections | 3 OOS, 5 req. attn | defect analysis, summary, and detailed records"
                statLabel="Contribution"
                statVal="32.30%"
                badge="OK"
                badgeCls="bg-emerald-100 text-emerald-700 border-emerald-300"
                open={!!abMainOpen.cvsa}
                onToggle={() => abMainTog('cvsa')}
              >
                <div>
                  <AbCvsaInspectionAnalysisTable />
                  <AbConvSub
                    title="CVSA Inspection Summary"
                    badge="9 RECORDS"
                    open={!!abMainOpen.cvsaSummary}
                    onToggle={() => abMainTog('cvsaSummary')}
                  >
                    <AbCvsaInspectionSummaryList />
                  </AbConvSub>
                  <AbConvSub
                    title="CVSA Inspection Detail"
                    badge="9 RECORDS"
                    open={!!abMainOpen.cvsaDetails}
                    onToggle={() => abMainTog('cvsaDetails')}
                  >
                    <AbCvsaInspectionDetailsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="Collision Information"
                subtitle="1 event | property damage, injury, fatal breakdown with summary and detailed records"
                statLabel="Contribution"
                statVal="33.10%"
                badge="OK"
                badgeCls="bg-emerald-100 text-emerald-700 border-emerald-300"
                open={!!abMainOpen.coll}
                onToggle={() => abMainTog('coll')}
              >
                <div>
                  <AbCollisionInformationPanel />
                  <AbConvSub
                    title="Collision Summary"
                    badge="1 RECORD"
                    open={!!abMainOpen.collSummary}
                    onToggle={() => abMainTog('collSummary')}
                  >
                    <AbCollisionSummaryList />
                  </AbConvSub>
                  <AbConvSub
                    title="Collision Detail"
                    badge="1 RECORD"
                    open={!!abMainOpen.collDetails}
                    onToggle={() => abMainTog('collDetails')}
                  >
                    <AbCollisionDetailsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="Violation Information"
                subtitle="1 offence across 1 document | analysis, summary, and detailed records"
                statLabel="Grouped Total"
                statVal="100%"
                badge="1 OCCURRENCE"
                badgeCls="bg-indigo-50 text-indigo-600 border-indigo-200"
                open={!!abMainOpen.viol}
                onToggle={() => abMainTog('viol')}
              >
                <div>
                  <AbViolationInformationPanel />
                  <AbConvSub
                    title="Violation Summary"
                    badge="1 RECORD"
                    open={!!abMainOpen.violSummary}
                    onToggle={() => abMainTog('violSummary')}
                  >
                    <AbViolationSummaryList />
                  </AbConvSub>
                  <AbConvSub
                    title="Violation Detail"
                    badge="1 RECORD"
                    open={!!abMainOpen.violDetails}
                    onToggle={() => abMainTog('violDetails')}
                  >
                    <AbViolationDetailsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="Monitoring Information"
                subtitle="21 month-end snapshots | fleet trends, R-Factor stages, and detailed inspection metrics"
                statLabel="Latest R-Factor"
                statVal="2.314"
                badge="21 MONTHS"
                badgeCls="bg-blue-50 text-blue-600 border-blue-200"
                open={!!abMainOpen.mon}
                onToggle={() => abMainTog('mon')}
              >
                <div>
                  <AbMonitoringInformationPanel />
                  <AbConvSub
                    title="Monitoring Summary"
                    badge="21 MONTHS"
                    open={!!abMainOpen.monSummary}
                    onToggle={() => abMainTog('monSummary')}
                  >
                    <AbMonitoringSummaryList />
                  </AbConvSub>
                  <AbConvSub
                    title="Monitoring Details"
                    badge="24 MONTHS"
                    open={!!abMainOpen.monDetails}
                    onToggle={() => abMainTog('monDetails')}
                  >
                    <AbMonitoringDetailsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="Facility Licence Information"
                subtitle="0 inspection facilities on record for selected period"
                statLabel="Facilities"
                statVal="0"
                badge="0 RECORDS"
                badgeCls="bg-slate-100 text-slate-500 border-slate-200"
                open={!!abMainOpen.fac}
                onToggle={() => abMainTog('fac')}
              >
                <div>
                  <AbFacilityLicenceInformationPanel />
                  <AbConvSub
                    title="Facility Licence Detail"
                    badge="0 RECORDS"
                    open={!!abMainOpen.facDetail}
                    onToggle={() => abMainTog('facDetail')}
                  >
                    <AbFacilityLicenceDetailsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="Safety Fitness Information"
                subtitle="2 safety ratings | 1 operating status | 0 suspensions"
                statLabel="Current Rating"
                statVal="Conditional"
                badge="3 RECORDS"
                badgeCls="bg-emerald-50 text-emerald-700 border-emerald-200"
                open={!!abMainOpen.fit}
                onToggle={() => abMainTog('fit')}
              >
                <div>
                  <AbSafetyFitnessInformationPanel />
                  <AbConvSub
                    title="Safety Fitness Summary"
                    badge="3 RECORDS"
                    open={!!abMainOpen.fitSummary}
                    onToggle={() => abMainTog('fitSummary')}
                  >
                    <AbSafetyFitnessSummaryList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

              <AbAnalysisRow
                title="Historical Summary"
                subtitle="35 timeline events | monitoring, CVSA, collisions, convictions, and safety actions"
                statLabel="Total Events"
                statVal="61"
                badge="61 EVENTS"
                badgeCls="bg-slate-100 text-slate-600 border-slate-200"
                open={!!abMainOpen.hist}
                onToggle={() => abMainTog('hist')}
              >
                <div>
                  <AbHistoricalSummaryPanel />
                  <AbConvSub
                    title="Historical Events"
                    badge="35 EVENTS"
                    open={!!abMainOpen.histEvents}
                    onToggle={() => abMainTog('histEvents')}
                  >
                    <AbHistoricalEventsList />
                  </AbConvSub>
                </div>
              </AbAnalysisRow>

            </div>
          </div>

          <NscAbPerformanceHistory />

        </div>
      )}

      {/* ===== TAB: CARRIER PROFILE (NSC BC) ===== */}
      {activeMainTab === 'carrier-profile-bc' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-sky-100 bg-sky-50/70 px-4 py-2">
            <div className="flex items-center gap-2 text-sm text-sky-700">
              <Info size={14} />
              <span className="font-semibold">BC profile snapshot:</span>
              <span className="font-mono font-bold">31-Mar-2025</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-sky-600">
              <Upload size={14} />
              <span className="font-semibold">Jurisdiction:</span>
              <span className="font-mono font-bold">British Columbia</span>
            </div>
          </div>

          <NscPerfomate />

          {/* ── Latest-pull data (Mar 2025) — shown inline on the main page ── */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">NSC Performance</span>
              <span className="bg-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-full">Latest pull &middot; 31-Mar-2025</span>
              <span className="ml-auto text-[10px] text-slate-400">profile scores &middot; fleet &middot; contraventions &middot; CVSA &middot; accidents &middot; audit &middot; CVIP</span>
            </div>
            <div className="p-4 space-y-2.5">

            <AnalysisRow
              title="Profile Scores as of Mar 2025"
              subtitle="14 monthly pulls · vehicle days, fleet size, contraventions/CVSA/accident scores"
              statLabel="Total Score"
              statVal={INERTIA_CARRIER_BC_DATA.complianceReview.totalScore.toFixed(2)}
              badge="14 MONTHS"
              badgeCls="bg-blue-50 text-blue-600 border-blue-200"
              open={!!bcMainOpen.profileScores}
              onToggle={() => bcMainTog('profileScores')}
            >
              <BcMonthHistoryTable />
            </AnalysisRow>

            <AnalysisRow
              title="Active Fleet"
              subtitle="Apr 2024 → Mar 2025 · all commercial vehicles under this Safety Certificate"
              statLabel="Avg Fleet"
              statVal={INERTIA_CARRIER_BC_DATA.complianceReview.averageFleetSize.toFixed(2)}
              badge="23 VEHICLES"
              badgeCls="bg-blue-50 text-blue-600 border-blue-200"
              open={!!bcMainOpen.activeFleet}
              onToggle={() => bcMainTog('activeFleet')}
            >
              <BcActiveFleetRealTable />
            </AnalysisRow>

            <AnalysisRow
              title="Contraventions"
              subtitle="19 driver guilty · 2 carrier guilty · 15 driver pending · 3 carrier pending"
              statLabel="Grouped Total"
              statVal="0.30"
              badge="4 SECTIONS"
              badgeCls="bg-amber-50 text-amber-600 border-amber-200"
              open={!!bcMainOpen.contraventions}
              onToggle={() => bcMainTog('contraventions')}
            >
              <div className="divide-y divide-slate-100">
                <div className="px-5 py-2.5 bg-slate-50 flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Section 4.1 &mdash; Driver Contraventions (Guilty)</span>
                  <span className="ml-auto text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">19 EVENTS</span>
                </div>
                <DriverContraventionsList />
                <div className="px-5 py-2.5 bg-slate-50 flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Section 4.2 &mdash; Carrier Contraventions (Guilty)</span>
                  <span className="ml-auto text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">2 EVENTS</span>
                </div>
                <CarrierContraventionsList />
                <div className="px-5 py-2.5 bg-slate-50 flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Section 4.3 &mdash; Driver Contraventions (Pending)</span>
                  <span className="ml-auto text-[9px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">15 PENDING</span>
                </div>
                <PendingDriverContraventionsList />
                <div className="px-5 py-2.5 bg-slate-50 flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Section 4.4 &mdash; Carrier Contraventions (Pending)</span>
                  <span className="ml-auto text-[9px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">3 PENDING</span>
                </div>
                <PendingCarrierContraventionsList />
              </div>
            </AnalysisRow>

            <AnalysisRow
              title="CVSA Inspection Results"
              subtitle="12 inspections · inspection-type summary, defect-category summary, detailed records"
              statLabel="CVSA Score"
              statVal="0.31"
              badge="12 INSPECTIONS"
              badgeCls="bg-blue-50 text-blue-600 border-blue-200"
              open={!!bcMainOpen.cvsa}
              onToggle={() => bcMainTog('cvsa')}
            >
              <div>
                <CvsaInspectionSummaries />
                <CvsaInspectionDetailsList />
              </div>
            </AnalysisRow>

            <AnalysisRow
              title="Accident Information"
              subtitle="5 reportable accidents · 11 event records · at-fault, fault-unknown, not at fault"
              statLabel="Accident Score"
              statVal="0.00"
              badge="11 ACCIDENTS"
              badgeCls="bg-red-50 text-red-600 border-red-200"
              open={!!bcMainOpen.accidents}
              onToggle={() => bcMainTog('accidents')}
            >
              <div>
                <AccidentSummaryTable />
                <AccidentDetailsList />
              </div>
            </AnalysisRow>

            <AnalysisRow
              title="Audit Summary"
              subtitle="quantifiable facility audit history · compliance reviews not included"
              statLabel="Safety Rating"
              statVal="Satisfactory"
              badge="UNAUDITED"
              badgeCls="bg-slate-100 text-slate-500 border-slate-200"
              open={!!bcMainOpen.audit}
              onToggle={() => bcMainTog('audit')}
            >
              <BcAuditSummaryPanel />
            </AnalysisRow>

            <AnalysisRow
              title="CVIP Vehicle Inspection History"
              subtitle="14 records · commercial vehicle inspections and outstanding Notice & Orders"
              statLabel="Pass Rate"
              statVal="93%"
              badge="14 RECORDS"
              badgeCls="bg-slate-100 text-slate-600 border-slate-200"
              open={!!bcMainOpen.cvip}
              onToggle={() => bcMainTog('cvip')}
            >
              <CvipInspectionList />
            </AnalysisRow>

            </div>
          </div>

          {/* ── Pull-by-Pull Data — archive of previous pulls ── */}
          <NscBcPerformanceHistory />

        </div>
      )}

      {/* ===== TAB: CARRIER PROFILE (NSC PE) ===== */}
      {activeMainTab === 'carrier-profile-pe' && (
        <div className="space-y-6">
          <NscPeiPerformanceCard data={{
            carrierName:    'BUSINESS PORTERS INC.',
            nscNumber:      PRINCE_EDWARD_ISLAND_NSC_PROFILE.nscNumber,
            profileAsOf:    PRINCE_EDWARD_ISLAND_NSC_PROFILE.profileAsOf,
            jurisdiction:   PRINCE_EDWARD_ISLAND_NSC_PROFILE.jurisdiction,
            safetyRating:   PRINCE_EDWARD_ISLAND_NSC_PROFILE.safetyRating,
            certStatus:     'Active',
            auditStatus:    'Unaudited',
            phone:          '(902)932-7076',
            contactName:    'Same As Above Same As Above',
            collisionPoints:  PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.collisionPoints,
            convictionPoints: PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.convictionPoints,
            inspectionPoints: PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.inspectionPoints,
            currentActiveVehicles:                PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.currentActiveVehicles,
            currentActiveVehiclesAtLastAssessment: PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.currentActiveVehiclesAtLastAssessment,
            interventions: [
              { label: 'Conditional Rating - Issued', date: '14-Jul-2021', type: 'warning' },
            ],
            carrierInfo: {
              primaryBusiness:  'General Freight',
              extraProvincial:  true,
              premiumCarrier:   false,
              mailingAddress:   '149 SHERWOOD RD UNIT 4 CHARL\nBox 40025 CHARLOTTETOWN\nPrince Edward Island  C1E 0J2',
              licensedVehicles: 19,
              certIssueDate:    '11-Jan-2016',
              jurisdiction:     'PE',
              reportFrom:       '14-Jul-2019',
              reportTo:         '14-Jul-2021',
              reportRun:        '14-Jul-2021',
            },
          }}/>

          <NscGenericPerformanceBlock
            latestPullDate="14-Jul-2021"
            collisionPoints={PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.collisionPoints}
            convictionPoints={PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.convictionPoints}
            inspectionPoints={PRINCE_EDWARD_ISLAND_NSC_PROFILE.summary.inspectionPoints}
            maxPoints={55}
          />

          <NscPeiPerformanceHistory />
        </div>
      )}

      {/* ===== TAB: CARRIER PROFILE (NSC NS) ===== */}
      {activeMainTab === 'carrier-profile-ns' && (
        <div className="space-y-6">
          <NscNsPerformanceCard data={{
            carrierName:          NOVA_SCOTIA_NSC_PROFILE.carrierName,
            nscNumber:            NOVA_SCOTIA_NSC_PROFILE.nscNumber,
            profileAsOf:          NOVA_SCOTIA_NSC_PROFILE.profileAsOf,
            safetyRating:         NOVA_SCOTIA_NSC_PROFILE.safetyRating,
            safetyRatingExpires:  NOVA_SCOTIA_NSC_PROFILE.safetyRatingExpires,
            contactName:          NOVA_SCOTIA_NSC_PROFILE.contactName,
            contactTitle:         NOVA_SCOTIA_NSC_PROFILE.contactTitle,
            phone:                NOVA_SCOTIA_NSC_PROFILE.phone,
            mailingAddress:       NOVA_SCOTIA_NSC_PROFILE.mailingAddress,
            physicalAddress:      NOVA_SCOTIA_NSC_PROFILE.physicalAddress,
            principalPlace:       NOVA_SCOTIA_NSC_PROFILE.principalPlace,
            currentFleetSize:     NOVA_SCOTIA_NSC_PROFILE.currentFleetSize,
            avgDailyFleetSize:    NOVA_SCOTIA_NSC_PROFILE.avgDailyFleetSize,
            scoreLevel1:          NOVA_SCOTIA_NSC_PROFILE.scoreLevel1,
            scoreLevel2:          NOVA_SCOTIA_NSC_PROFILE.scoreLevel2,
            scoreLevel3:          NOVA_SCOTIA_NSC_PROFILE.scoreLevel3,
            convictionScore:      NOVA_SCOTIA_NSC_PROFILE.convictionScore,
            inspectionScore:      NOVA_SCOTIA_NSC_PROFILE.inspectionScore,
            collisionScore:       NOVA_SCOTIA_NSC_PROFILE.collisionScore,
            auditHistory:         [],
            interventions:        [],
            carrierInfo: {
              reportFrom: '19/08/2020',
              reportTo:   '19/08/2022',
              reportRun:  '19/08/2022',
            },
          }}/>

          <NscNsPerformanceBlock latestPullDate="19-Aug-2022" />

          <NscNsPerformanceHistory />
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
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

              {/* Section: Inspection Type (locked to active tab) */}
              <InspectionKindSelector value={inspectionKind} />

              {/* Section: FMCSA API fetch (FMCSA only — populates the form below) */}
              {inspectionKind === 'fmcsa' && (
                <FmcsaApiFetchBlock
                  onFetched={r => setFmcsaForm(p => ({
                    ...p,
                    reportNumber:   r.reportNumber,
                    inspectionDate: r.inspectionDate,
                    state:          r.state,
                    level:          r.level,
                    driver:         r.driver,
                    driverLicense:  r.driverLicense,
                    vehiclePlate:   r.vehiclePlate,
                  }))}
                />
              )}

              {/* Section: Attach Report (all kinds). For NSC kinds, uploading + extracting fills the form below. */}
              <ReportUploadDropzone
                file={uploadedReport}
                onChange={setUploadedReport}
                extractLabel="Extract NSC Data"
                onExtract={
                  inspectionKind === 'ab' ? () => setAbNscForm({
                    carrierName:       'VM Motors Inc.',
                    nscNumber:         'AB257-4556',
                    mvidNumber:        '0895-41544',
                    operatingStatus:   'Federal',
                    fleetType:         'Truck',
                    fleetRange:        '30.0-44.9',
                    profileDate:       '2026 FEB 23',
                    rFactor:           '0.062',
                    monitoringStage:   'Not Monitored',
                    fleetCurrent:      '40',
                    fleetAvg:          '40.0',
                    convictionsPct:         '34.6',
                    convictionsEvents:      '5',
                    adminPenaltiesPct:      '0.0',
                    adminPenaltiesEvents:   '0',
                    cvsaPct:                '32.3',
                    cvsaEvents:             '43',
                    collisionsPct:          '33.1',
                    collisionsEvents:       '6',
                    certNumber:        '002449387',
                    certEffective:     '2026 JAN 07',
                    certExpiry:        '2028 DEC 31',
                    safetyRating:      'Satisfactory Unaudited',
                    monitoringAsOf:        '2026 JAN 31',
                    monitoringRFactor:     '0.185',
                    monitoringStageLatest: 'Not on Monitoring',
                    totalCarriersAB:       '17704',
                    convictionDocs:    '3',
                    convictionCount:   '3',
                    convictionPoints:  '3',
                    convictions: [
                      { id: 'seed-ab-c1', date: '2025-11-18', documentNo: 'CNV-40231', docketNo: 'DKT-9912', jurisdiction: 'AB', plate: 'PLT-001', driver: 'S. Thompson', offence: 'HTA s.128(1) Speeding', points: '3' },
                      { id: 'seed-ab-c2', date: '2025-08-03', documentNo: 'CNV-40110', docketNo: 'DKT-9807', jurisdiction: 'AB', plate: 'PLT-004', driver: 'R. Patel',    offence: 'HTA s.154(1) Improper lane use', points: '2' },
                    ],
                    cvsaInspections: [
                      { id: 'seed-ab-i1', date: '2026-01-14', documentNo: 'CVSA-12931', jurisdiction: 'AB', agency: 'Alberta Sheriff', plate: 'PLT-001', level: 'Level 2', result: 'Pass' },
                      { id: 'seed-ab-i2', date: '2025-10-22', documentNo: 'CVSA-12801', jurisdiction: 'AB', agency: 'RCMP',            plate: 'PLT-003', level: 'Level 1', result: 'Out of Service' },
                    ],
                    collisions: [
                      { id: 'seed-ab-col1', date: '2025-09-07', documentNo: 'COL-8812', plate: 'PLT-002', severity: 'Property Damage', preventable: 'Preventable', points: '2', driver: 'M. Lee' },
                    ],
                    adminPenalties: [],
                    historicalEvents: [
                      { id: 'seed-ab-h1', date: '2026 JAN 31', type: 'MONT (Monitoring)', description: 'R-Factor snapshot 0.185' },
                      { id: 'seed-ab-h2', date: '2025 OCT 22', type: 'CVSA (Inspection)', description: 'OOS — brake defect'      },
                    ],
                  })
                  : inspectionKind === 'bc' ? () => setBcNscForm({
                    carrierName:         'INERTIA CARRIER LTD.',
                    nscNumber:           'BC123456',
                    asOfDate:            '31-Mar-2025',
                    averageFleetSize:    '77.56',
                    contraventionScore:  '0.30',
                    contraventionEvents: '39',
                    cvsaScore:           '0.31',
                    cvsaEvents:          '12',
                    accidentScore:       '0.00',
                    accidentEvents:      '11',
                    totalScore:          '0.61',
                    safetyRating:        'Satisfactory',
                    certificateStatus:   'Active',
                    profileScores: [
                      { id: 'seed-bc-ps01', month: '2025-03', vd: '28308', ad: '365', avg: '77.56', contra: '0.30', cvsa: '0.31', acc: '0.00', total: '0.61' },
                      { id: 'seed-bc-ps02', month: '2025-02', vd: '28186', ad: '365', avg: '77.22', contra: '0.30', cvsa: '0.31', acc: '0.05', total: '0.66' },
                      { id: 'seed-bc-ps03', month: '2025-01', vd: '28080', ad: '366', avg: '76.72', contra: '0.20', cvsa: '0.23', acc: '0.05', total: '0.48' },
                      { id: 'seed-bc-ps04', month: '2024-12', vd: '27815', ad: '366', avg: '76.00', contra: '0.17', cvsa: '0.24', acc: '0.05', total: '0.46' },
                      { id: 'seed-bc-ps05', month: '2024-11', vd: '27517', ad: '366', avg: '75.18', contra: '0.17', cvsa: '0.28', acc: '0.05', total: '0.50' },
                      { id: 'seed-bc-ps06', month: '2024-10', vd: '27229', ad: '366', avg: '74.40', contra: '0.16', cvsa: '0.32', acc: '0.05', total: '0.53' },
                      { id: 'seed-bc-ps07', month: '2024-09', vd: '26943', ad: '366', avg: '73.61', contra: '0.22', cvsa: '0.29', acc: '0.05', total: '0.56' },
                      { id: 'seed-bc-ps08', month: '2024-08', vd: '26644', ad: '366', avg: '72.80', contra: '0.34', cvsa: '0.29', acc: '0.05', total: '0.68' },
                      { id: 'seed-bc-ps09', month: '2024-07', vd: '26170', ad: '366', avg: '71.50', contra: '0.39', cvsa: '0.29', acc: '0.06', total: '0.74' },
                      { id: 'seed-bc-ps10', month: '2024-06', vd: '25647', ad: '366', avg: '70.07', contra: '0.37', cvsa: '0.26', acc: '0.06', total: '0.69' },
                      { id: 'seed-bc-ps11', month: '2024-05', vd: '25139', ad: '366', avg: '68.69', contra: '0.39', cvsa: '0.39', acc: '0.06', total: '0.84' },
                      { id: 'seed-bc-ps12', month: '2024-04', vd: '24638', ad: '366', avg: '67.32', contra: '0.45', cvsa: '0.45', acc: '0.06', total: '0.96' },
                      { id: 'seed-bc-ps13', month: '2024-03', vd: '24330', ad: '366', avg: '66.48', contra: '0.45', cvsa: '0.41', acc: '0.12', total: '0.98' },
                      { id: 'seed-bc-ps14', month: '2024-02', vd: '24249', ad: '366', avg: '66.25', contra: '0.63', cvsa: '0.36', acc: '0.09', total: '1.08' },
                    ],
                    activeFleet: [
                      { id: 'seed-bc-fl1', regi: '10537552', plate: '69124P', year: '2006', make: 'FREIGHTLIN', owner: 'Inertia', gvw: '0' },
                      { id: 'seed-bc-fl2', regi: '11081163', plate: '68012P', year: '2015', make: 'VOLVO',     owner: 'Inertia', gvw: '0' },
                      { id: 'seed-bc-fl3', regi: '11848566', plate: '71085P', year: '2016', make: 'VOLVO',     owner: 'Inertia', gvw: '0' },
                      { id: 'seed-bc-fl4', regi: '12584392', plate: '57354P', year: '2018', make: 'FREIGHTLIN', owner: 'Inertia', gvw: '0' },
                      { id: 'seed-bc-fl5', regi: '12793166', plate: '60145P', year: '2018', make: 'VOLVO',     owner: 'Inertia', gvw: '0' },
                    ],
                    driverGuilty: [
                      { id: 'seed-bc-dg1', driverName: 'BAJWA, MANJOT',             dl: 'B0209516098126', dlJur: 'ON', date: '2024-12-24', ticket: '1333765',    plate: '72843P', location: 'BALGONIE',      juris: 'SK', act: 'HT',  section: '6;b',    desc: 'Improper or inappropriate use of lights',         pts: '2' },
                      { id: 'seed-bc-dg2', driverName: 'BHULLAR, GURWINDER SINGH',  dl: '179420971',      dlJur: 'AB', date: '2025-01-26', ticket: '2099880',    plate: '72843P', location: 'SHERWOOD PARK', juris: 'AB', act: '122', section: '0924(1)', desc: 'Unauthorized flashing lamp on',                 pts: '1' },
                    ],
                    carrierGuilty: [
                      { id: 'seed-bc-cg1', driverName: '', dl: '', dlJur: 'BC', date: '2024-11-05', ticket: 'C-45203', plate: '', location: 'KAMLOOPS', juris: 'BC', act: 'MVA', section: '37.27(1)', desc: 'Carrier failed to maintain records', pts: '2' },
                    ],
                    driverPending: [
                      { id: 'seed-bc-dp1', driverName: 'SINGH, AMRITPAL', dl: 'S4490169094', dlJur: 'ON', date: '2025-02-14', ticket: 'P-118822', plate: '68042P', location: 'VANCOUVER', juris: 'BC', act: 'MVA', section: '150.1',  desc: 'Fail to keep right (pending disposition)',    pts: '0' },
                    ],
                    carrierPending: [
                      { id: 'seed-bc-cp1', driverName: '', dl: '', dlJur: 'BC', date: '2025-03-02', ticket: 'C-58440', plate: '', location: 'BURNABY',    juris: 'BC', act: 'MVA', section: '234',     desc: 'Logbook audit discrepancy (pending disposition)', pts: '0' },
                    ],
                    cvsaInspections: [
                      { id: 'seed-bc-cv1', date: '2025-01-22', inspectionNo: 'EA602200100', level: 'Level 1', plate: '68042P', driver: 'Singh, A.',    defects: 'Brakes',    result: 'Out of Service' },
                      { id: 'seed-bc-cv2', date: '2024-11-14', inspectionNo: 'EA602012990', level: 'Level 2', plate: '72843P', driver: 'Bhullar',      defects: 'Lighting',  result: 'Warning' },
                      { id: 'seed-bc-cv3', date: '2024-09-03', inspectionNo: 'EA601899127', level: 'Level 3', plate: '57380P', driver: 'Khaira',       defects: '',          result: 'Pass' },
                    ],
                    accidents: [
                      { id: 'seed-bc-acc1', date: '2023-03-03', time: '09:48', report: '6653022', location: 'PICKERING, BAYLY ST',     jur: 'ON', driverName: 'KHAIRA, EKAMPREET SINGH', plate: '76118P', vehDesc: '', type: 'Property', fault: 'At Fault',     charges: 'No', pts: '2' },
                      { id: 'seed-bc-acc2', date: '2023-01-07', time: '23:53', report: '6636812', location: 'THUNDER BAY, 11',        jur: 'ON', driverName: 'PUREWAL, MANJEET K',      plate: '66581P', vehDesc: '', type: 'Property', fault: 'No Fault',     charges: 'No', pts: '0' },
                      { id: 'seed-bc-acc3', date: '2022-12-12', time: '09:16', report: '6631431', location: 'BLIND RIVER, CAUSLEY',   jur: 'ON', driverName: 'HANAD, HUSSEIN',          plate: '57380P', vehDesc: '', type: 'Property', fault: 'At Fault',     charges: 'No', pts: '2' },
                      { id: 'seed-bc-acc4', date: '2022-12-03', time: '00:00', report: '6652780', location: 'KENORA, 17',             jur: 'ON', driverName: 'HARJOT SINGH',            plate: '74162P', vehDesc: '', type: 'Injury',   fault: 'At Fault',     charges: 'No', pts: '4' },
                      { id: 'seed-bc-acc5', date: '2022-08-18', time: '21:45', report: '6614519', location: 'MISSISSAUGA, 401',       jur: 'ON', driverName: 'HAROON, MOHAMMAD',        plate: '70365P', vehDesc: '', type: 'Property', fault: 'No Fault',     charges: 'No', pts: '0' },
                    ],
                    auditSummary: [],
                    cvip: [
                      { id: 'seed-bc-cvip1', regi: '10537552', plate: '69124P', vehicle: '2006 FREIGHTLIN', date: '2022-04-20', type: 'N&O',  facility: '',       expiry: '',           result: 'N&O 2' },
                      { id: 'seed-bc-cvip2', regi: '11081163', plate: '68012P', vehicle: '2015 VOLVO',      date: '2022-01-05', type: 'CVIP', facility: 'S6903',  expiry: '2022-07-31', result: 'Pass (Repair Same Day)' },
                      { id: 'seed-bc-cvip3', regi: '11081163', plate: '68012P', vehicle: '2015 VOLVO',      date: '2021-06-01', type: 'CVIP', facility: 'S2225',  expiry: '2021-12-31', result: 'Pass' },
                      { id: 'seed-bc-cvip4', regi: '11848566', plate: '71085P', vehicle: '2016 VOLVO',      date: '2021-12-27', type: 'CVIP', facility: 'S15780', expiry: '2022-06-30', result: 'Pass' },
                    ],
                  })
                  : inspectionKind === 'pe' ? () => setPeiNscForm({
                    carrierName:       'BUSINESS PORTERS INC.',
                    nscNumber:         'PE316583',
                    profileAsOf:       '2021/07/14',
                    collisionPoints:   '8',
                    convictionPoints:  '6',
                    inspectionPoints:  '9',
                    currentActiveVehicles:                '19',
                    currentActiveVehiclesAtLastAssessment: '19',
                    safetyRating:      'Conditional',
                    certStatus:        'Active',
                    auditStatus:       'Unaudited',
                    collisions: [
                      { id: 'seed-pe-col1', date: '2021-05-12', severity: 'Property Damage', caseNum: 'BC2021-0583', fault: 'At Fault',      vehicles: '2', killed: '0', injured: '0', pts: '2' },
                      { id: 'seed-pe-col2', date: '2021-02-18', severity: 'Injury',          caseNum: 'AB2021-1147', fault: 'At Fault',      vehicles: '2', killed: '0', injured: '1', pts: '4' },
                      { id: 'seed-pe-col3', date: '2020-11-03', severity: 'Property Damage', caseNum: 'ON2020-8822', fault: 'Not at Fault',  vehicles: '1', killed: '0', injured: '0', pts: '0' },
                      { id: 'seed-pe-col4', date: '2020-08-27', severity: 'Property Damage', caseNum: 'QC2020-5519', fault: 'Fault Unknown', vehicles: '2', killed: '0', injured: '0', pts: '2' },
                    ],
                    convictions: [
                      { id: 'seed-pe-con1', date: '2021-03-04', loc: 'QC', charge: 'SIGNALISATION NON RESPECTÉE',   natCode: '317', pts: '3' },
                      { id: 'seed-pe-con2', date: '2021-01-14', loc: 'BC', charge: 'DISOBEY TRAFFIC CONTROL DEVICE', natCode: '317', pts: '3' },
                    ],
                    inspections: [
                      { id: 'seed-pe-ins1',  date: '2022-11-22', cvsaLevel: '3', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'SINGH',            status: 'P' },
                      { id: 'seed-pe-ins2',  date: '2022-10-07', cvsaLevel: '3', log: 'Warning', tdg: 'Passed', loadSecurity: 'Passed', driverName: 'NAVJOT SINGH',     status: 'W' },
                      { id: 'seed-pe-ins3',  date: '2021-06-21', cvsaLevel: '2', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'PANESAR',          status: 'P' },
                      { id: 'seed-pe-ins4',  date: '2021-06-11', cvsaLevel: '3', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'BOWLAN J',         status: 'P' },
                      { id: 'seed-pe-ins5',  date: '2021-06-10', cvsaLevel: '1', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'RATTEA SINGH',     status: 'P' },
                      { id: 'seed-pe-ins6',  date: '2021-05-19', cvsaLevel: '3', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'SIDHU S',          status: 'W' },
                      { id: 'seed-pe-ins7',  date: '2021-05-18', cvsaLevel: '1', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'SAINI S',          status: 'W' },
                      { id: 'seed-pe-ins8',  date: '2021-04-06', cvsaLevel: '2', log: 'Warning', tdg: 'Passed', loadSecurity: 'Passed', driverName: 'SINGH',            status: 'W' },
                      { id: 'seed-pe-ins9',  date: '2021-03-23', cvsaLevel: '1', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'SINGH',            status: 'O' },
                      { id: 'seed-pe-ins10', date: '2021-03-17', cvsaLevel: '2', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'SINGH',            status: 'O' },
                      { id: 'seed-pe-ins11', date: '2020-07-29', cvsaLevel: '1', log: 'Passed',  tdg: 'Passed', loadSecurity: 'Passed', driverName: 'INDERJEET',        status: 'O' },
                    ],
                    audits: [
                      { id: 'seed-pe-aud1', date: '2021-01-13', result: 'NON-COMPLIANT', auditType: 'Compliance' },
                    ],
                  })
                  : inspectionKind === 'ns' ? () => setNsNscForm({
                    carrierName:           'MAPLE LEAF FORCE LIMITED',
                    nscNumber:             'MAPLE739646000',
                    profileAsOf:           '19-Aug-2022',
                    currentFleetSize:      '14',
                    avgDailyFleetSize:     '14.79',
                    convictionScore:       '6.2510',
                    inspectionScore:       '13.4179',
                    collisionScore:        '0.0000',
                    scoreLevel1:           '39.7531',
                    scoreLevel2:           '45.9602',
                    scoreLevel3:           '60.1836',
                    safetyRating:          'Satisfactory - Unaudited',
                    safetyRatingExpires:   '',
                    cvsaInspections: [
                      { id: 'seed-ns-cv01', date: '2022-11-29', cvsaNumber: '445131-1',     jur: 'NB', plates: 'PR45273 / MB',            driverMaster: 'D4391-00009-90407 / ON',  result: 'Passed',         demeritPts: '0' },
                      { id: 'seed-ns-cv02', date: '2022-12-11', cvsaNumber: '449597',       jur: 'NB', plates: 'PR49497 / ON',            driverMaster: '3225823 / NB',             result: 'Passed',         demeritPts: '0' },
                      { id: 'seed-ns-cv03', date: '2023-01-17', cvsaNumber: 'ONEA01539682', jur: 'ON', plates: 'PR48472 / NS',            driverMaster: '175546217 / AB',           result: 'Passed',         demeritPts: '0' },
                      { id: 'seed-ns-cv04', date: '2023-03-16', cvsaNumber: '666079',       jur: 'NS', plates: 'PR49343 / NS',            driverMaster: 'J64570000940315 / ON',     result: 'Defect Noted',   demeritPts: '0' },
                      { id: 'seed-ns-cv05', date: '2023-04-25', cvsaNumber: '667415',       jur: 'NS', plates: 'TC1771 / MB',             driverMaster: 'SINGH210898005 / NS',      result: 'Out-of-Service', demeritPts: '3' },
                    ],
                    auditHistory: [
                      { id: 'seed-ns-a1', date: '2023-04-28', auditNum: '34843', sequence: '1', result: 'Compliant' },
                    ],
                    convictions: [
                      { id: 'seed-ns-k1', offenceDate: '2020-11-19', convDate: '2021-01-19', ticket: '5488801', offence: 'OPER VEH NOT CONFORMING WITH SPECIAL PERMIT', driverMaster: 'CZIPP141270003', sectionActReg: '11 9 WDVR', pts: '3' },
                    ],
                    collisions: [
                      { id: 'seed-ns-col1', date: '2020-09-04', severity: 'PROPERTY DAMAGE', location: 'MONTREAL / QC', driverMaster: '', driverJur: 'ON', plate: 'PR42409', plateJur: 'NS', pts: '0' },
                    ],
                    trafficOffences: [
                      { id: 'seed-ns-t1', offenceDate: '2023-09-05', plate: 'PR45273', driverMaster: 'SINGH120992005',  statute: 'CVDH 7 1 A', description: 'FAILING TO TAKE 8 CONSECUTIVE OFF-DUTY HOURS AFTER 13 HOURS OF DRIVING TIME' },
                      { id: 'seed-ns-t2', offenceDate: '2024-06-20', plate: 'PR45276', driverMaster: 'S04036398930615', statute: 'MVA 20 2',   description: 'LICENSE PLATE NOT CLEARLY LEGIBLE (NUMBERS WEARING OFF)' },
                    ],
                  })
                  : undefined
                }
              />

              {/* Section: Jurisdiction-specific forms */}
              {inspectionKind === 'fmcsa' && <FmcsaInspectionForm value={fmcsaForm} onChange={setFmcsaForm} />}
              {inspectionKind === 'cvor'  && <CvorInspectionForm  value={cvorForm}  onChange={setCvorForm}  />}
              {inspectionKind === 'ab'    && <AbNscInspectionForm  value={abNscForm}  onChange={setAbNscForm}  />}
              {inspectionKind === 'bc'    && <BcNscInspectionForm  value={bcNscForm}  onChange={setBcNscForm}  />}
              {inspectionKind === 'pe'    && <PeiNscInspectionForm value={peiNscForm} onChange={setPeiNscForm} />}
              {inspectionKind === 'ns'    && <NsNscInspectionForm  value={nsNscForm}  onChange={setNsNscForm}  />}

              {/* Legacy kitchen-sink form — now disabled (replaced by per-kind focused forms) */}
              {false && (<>

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
                        <option key={abbr} value={abbr}>{abbr} - {name}</option>
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
                          <option value="Level 1">SMS Level I - North American Standard</option>
                          <option value="Level 2">SMS Level II - Walk-Around</option>
                          <option value="Level 3">SMS Level III - Driver/Credential</option>
                          <option value="Level 4">SMS Level IV - Special Inspections</option>
                          <option value="Level 5">SMS Level V - Vehicle-Only</option>
                          <option value="Level 6">SMS Level VI - Transuranic/Radioactive</option>
                          <option value="Level 7">SMS Level VII - Jurisdictional Mandated</option>
                          <option value="Level 8">SMS Level VIII - Electronic Inspection</option>
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
                            <option key={a.id} value={a.id}>{a.unitNumber} - {a.make} {a.model} ({a.plateNumber})</option>
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

              </>)}

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
