import { Fragment, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  BarChart3,
  Info,
  Layers3,
  ShieldAlert,
  Truck,
  User,
  Activity,
  FileText,
  Building2,
  X,
} from 'lucide-react';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import type { CvsaDefectRow, CvsaRow } from './NscAnalysis';
import { NSC_VIOLATION_CATALOG, violationDetailsData, parseCcmtaCode } from './NscAnalysis';
import { NSC_INSPECTIONS, DEFECT_TO_NSC, NSC_CODE_TO_SYSTEM } from './nscInspectionsData';
import type { NscInspectionRecord } from './nscInspectionsData';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS } from '@/pages/assets/assets.data';

// ── Inspection level descriptions ─────────────────────────────────────────────
const INSPECTION_LEVEL_MAP: Record<number, string> = {
  1: 'North American Standard Inspection',
  2: 'Walk-Around Driver/Vehicle Inspection',
  3: 'Driver/Credential Inspection',
  4: 'Special Inspection',
  5: 'Vehicle-Only Inspection',
  6: 'Enhanced NAS Inspection',
  7: 'Jurisdictional Mandated Inspection',
  8: 'Electronic Inspection',
};

const INSPECTION_LEVEL_DETAIL_MAP: Record<number, string> = {
  1: 'Full inspection - driver, vehicle full inspection, HOS, permits, insurance, cargo, TDG, permits and authorities.',
  2: 'Walk-around inspection - driver and vehicle review including licence, HOS, seat belt, trip inspection and visible mechanical condition.',
  3: 'Driver/Credentials inspection - driver licence, hours of service, seat belt use, credentials and administrative compliance.',
  4: 'Special inspection - a focused inspection on a specific item such as cargo securement, placards, brakes, or another identified issue.',
  5: 'Vehicle-only inspection - no driver present, focused on the vehicle\'s mechanical condition and safety systems.',
  6: 'Hazmat inspection - CVSA inspection for dangerous goods or hazardous material transport requirements.',
  7: 'Jurisdictional inspection - inspection scope defined by the province, state, or local enforcement program.',
  8: 'Electronic inspection - compliance verified through roadside electronic systems and transmitted vehicle or carrier data.',
};


// Document prefix detection
function getDocType(doc: string): { label: string; title: string } {
  if (/^ONEA|^ON\d/.test(doc)) return { label: 'OPI', title: 'Ontario Provincial Inspection' };
  if (/^CVR/.test(doc))        return { label: 'CVR', title: 'Commercial Vehicle Report' };
  if (/^TVR/.test(doc))        return { label: 'TVR', title: 'Traffic Violation Report' };
  if (/^(ASP|WATTR|HOULD|SPA)/.test(doc)) return { label: 'ASP', title: 'Police / ASP Inspection' };
  return { label: 'DOT', title: 'DOT / Police Inspection Report' };
}

function getReportPrefix(row: CvsaRow): Exclude<ReportPrefixFilter, 'ALL'> {
  const doc = row.doc.trim().toUpperCase();

  if (/^CVSA/.test(doc)) return 'CVSA';
  if (/^ONEA|^ON\d/.test(doc)) return 'OPI';
  if (/^(INS|CVR|TVR)/.test(doc)) return 'INS';
  if (!CANADIAN_JURISDICTIONS.has(row.jur.toUpperCase())) return 'DOT';

  return 'INS';
}

type CvsaFilter = 'ALL' | 'PASSED' | 'OOS' | 'REQ_ATTN' | 'L1' | 'L2' | 'L3';
type CardColor = 'blue' | 'emerald' | 'red' | 'amber' | 'indigo' | 'violet' | 'slate';
type LevelMetric = 'OOS' | 'REQ';
type ReportPrefixFilter = 'ALL' | 'DOT' | 'OPI' | 'INS' | 'CVSA';

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'date', label: 'Date / Time', visible: true },
  { id: 'report', label: 'Report', visible: true },
  { id: 'location', label: 'Location', visible: true },
  { id: 'driver', label: 'Driver / Licence', visible: true },
  { id: 'unit', label: 'Power Unit / Defects', visible: true },
  { id: 'defects', label: 'Defects', visible: true },
  { id: 'oos', label: 'OOS Defects', visible: true },
  { id: 'req', label: 'Req. Attn.', visible: true },
  { id: 'status', label: 'Status', visible: true },
];

const CANADIAN_JURISDICTIONS = new Set(['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT']);

const REPORT_PREFIX_META: Record<Exclude<ReportPrefixFilter, 'ALL'>, {
  label: string;
  activeClass: string;
  color: CardColor;
}> = {
  DOT: {
    label: 'DOT',
    activeClass: 'border-blue-300 bg-blue-50/70 text-blue-700',
    color: 'blue',
  },
  OPI: {
    label: 'OPI',
    activeClass: 'border-indigo-300 bg-indigo-50/70 text-indigo-700',
    color: 'indigo',
  },
  INS: {
    label: 'INS',
    activeClass: 'border-slate-300 bg-slate-100 text-slate-700',
    color: 'slate',
  },
  CVSA: {
    label: 'CVSA',
    activeClass: 'border-emerald-300 bg-emerald-50/70 text-emerald-700',
    color: 'emerald',
  },
};

const cardStyles: Record<CardColor, { active: string; idle: string; icon: string }> = {
  blue: {
    active: 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-100',
    idle: 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40',
    icon: 'text-blue-600 bg-blue-100',
  },
  emerald: {
    active: 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-100',
    idle: 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40',
    icon: 'text-emerald-600 bg-emerald-100',
  },
  red: {
    active: 'border-red-500 bg-red-50/80 ring-2 ring-red-100',
    idle: 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40',
    icon: 'text-red-600 bg-red-100',
  },
  amber: {
    active: 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-100',
    idle: 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/40',
    icon: 'text-amber-600 bg-amber-100',
  },
  indigo: {
    active: 'border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-100',
    idle: 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40',
    icon: 'text-indigo-600 bg-indigo-100',
  },
  violet: {
    active: 'border-violet-500 bg-violet-50/80 ring-2 ring-violet-100',
    idle: 'border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40',
    icon: 'text-violet-600 bg-violet-100',
  },
  slate: {
    active: 'border-slate-500 bg-slate-100/90 ring-2 ring-slate-200',
    idle: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60',
    icon: 'text-slate-600 bg-slate-100',
  },
};

function getResultBadge(result: string) {
  if (result === 'Out Of Service') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50/80 rounded text-xs font-bold text-red-600 tracking-wide uppercase whitespace-nowrap">OOS</span>;
  }
  if (result === 'Requires Attention') {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50/80 rounded text-xs font-bold text-amber-600 tracking-wide uppercase whitespace-nowrap">DEFECT</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 bg-emerald-50 rounded text-xs font-bold text-emerald-600 tracking-wide uppercase whitespace-nowrap">OK</span>;
}

function getInspectionTag(level: number) {
  const levelTone = level === 1
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : level === 2
      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
      : 'bg-violet-50 text-violet-700 border-violet-200';
  const desc = INSPECTION_LEVEL_MAP[level] ?? 'Inspection';
  return (
    <span
      className={`mt-0.5 inline-flex w-fit px-1.5 py-px rounded text-[10px] font-bold tracking-wider border cursor-help ${levelTone}`}
      title={desc}
    >
      CVSA L{level}
    </span>
  );
}


function getPrimaryVehicle(row: NscInspectionRecord) {
  return row.primaryVehicle.unitNumber;
}

function getDefectSummary(row: NscInspectionRecord) {
  const defects = [...(row.details?.oos ?? []), ...(row.details?.req ?? [])];
  if (defects.length === 0) {
    return row.result === 'Passed' ? 'Clean' : 'No detailed defects recorded';
  }
  return defects.join(', ');
}

function getLocationSummary(row: NscInspectionRecord) {
  return row.details?.location || `${row.jur} inspection record`;
}

function getAgencySummary(row: NscInspectionRecord) {
  const agency = row.details?.agency?.replace(/[\u2013\u2014]/g, '-').trim() ?? '';
  return agency && agency !== '-' ? agency : 'Agency not listed';
}

function getCvsaFilterSummaryLabel(filter: CvsaFilter) {
  switch (filter) {
    case 'PASSED': return 'Passed';
    case 'OOS': return 'OOS Flags';
    case 'REQ_ATTN': return 'Requires Attention';
    case 'L1': return 'Level 1';
    case 'L2': return 'Level 2';
    case 'L3': return 'Level 3+';
    default: return null;
  }
}

function getDetailRows(rows?: CvsaDefectRow[], fallback?: string[]) {
  if (rows && rows.length > 0) {
    return rows;
  }
  return (fallback ?? []).map((category) => ({
    category,
    vehicleCounts: [1, null, null, null, null, null, null],
  }));
}

function KpiFilterCard({
  title,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  title: string;
  value: number;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: CardColor;
  active: boolean;
  onClick: () => void;
}) {
  const style = cardStyles[color];
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all shadow-sm ${active ? style.active : style.idle}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${style.icon}`}>
            <Icon size={14} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 leading-tight">{title}</div>
          </div>
        </div>
        <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
      </div>
    </button>
  );
}

function DefectDetailTable({
  title,
  tone,
  rows,
  emptyMessage,
}: {
  title: string;
  tone: 'red' | 'amber';
  rows: CvsaDefectRow[];
  emptyMessage: string;
}) {
  const borderClass = tone === 'red' ? 'border-red-100' : 'border-amber-100';
  const headerClass = tone === 'red' ? 'text-red-600 bg-red-50/60' : 'text-amber-600 bg-amber-50/60';

  return (
    <div className={`rounded-lg border bg-white ${borderClass}`}>
      <div className={`border-b px-4 py-3 ${borderClass}`}>
        <div className={`text-[10px] uppercase font-bold tracking-wider ${tone === 'red' ? 'text-red-600' : 'text-amber-600'}`}>{title}</div>
        <div className="mt-1 text-xs text-slate-500">Number of defects by vehicle position</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className={headerClass}>
            <tr>
              <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-slate-500">Defect Category / Description</th>
              {Array.from({ length: 7 }, (_, index) => (
                <th key={index} className="px-3 py-2 text-center font-bold uppercase tracking-wider text-slate-500">{index + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length > 0 ? rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                <td className="px-3 py-2 font-medium text-slate-800">{row.category}</td>
                {Array.from({ length: 7 }, (_, index) => (
                  <td key={index} className="px-3 py-2 text-center text-slate-600">{row.vehicleCounts[index] ?? '-'}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-3 py-4 text-center text-slate-400">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LevelComparisonCard({
  metric,
  onMetricChange,
  expandedLevel,
  onExpandedLevelChange,
  rows,
  totalInspections,
  totalFlagged,
}: {
  metric: LevelMetric;
  onMetricChange: (metric: LevelMetric) => void;
  expandedLevel: number | null;
  onExpandedLevelChange: (level: number | null) => void;
  rows: Array<{
    level: number;
    label: string;
    inspections: number;
    count: number;
    percent: number;
  }>;
  totalInspections: number;
  totalFlagged: number;
}) {
  const isOos = metric === 'OOS';
  const accentText = isOos ? 'text-red-600' : 'text-amber-600';
  const accentBg = isOos ? 'bg-red-500' : 'bg-amber-500';
  const accentSoft = isOos ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100';
  const toggleBase = 'px-3 py-1.5 text-xs font-bold rounded-md transition-colors';

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-xl border flex items-center justify-center ${accentSoft}`}>
            <BarChart3 size={16} className={accentText} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">CVSA Level Comparison</h3>
            <div className="text-xs text-slate-500">Distribution of NSC inspection outcomes by CVSA level</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs text-slate-500">
            Total: <span className="font-bold text-slate-800">{totalInspections}</span>
            <span className={`ml-3 font-bold ${accentText}`}>{metric === 'OOS' ? 'OOS' : 'Req. Attn.'}: {totalFlagged}</span>
          </div>
          <div className="inline-flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => onMetricChange('OOS')}
              className={`${toggleBase} ${metric === 'OOS' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Out of Service
            </button>
            <button
              onClick={() => onMetricChange('REQ')}
              className={`${toggleBase} ${metric === 'REQ' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Requires Attention
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto xl:overflow-visible">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[54%]" />
            <col className="w-[13%]" />
            <col className="w-[10%]" />
            <col className="w-[17%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="bg-slate-50/70 border-b border-slate-200">
            <tr className="text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 text-left font-bold">Level</th>
              <th className="px-4 py-3 text-center font-bold">Inspections</th>
              <th className="px-4 py-3 text-center font-bold">{metric === 'OOS' ? 'OOS' : 'Req. Attn.'}</th>
              <th className="px-5 py-3 text-left font-bold">{metric === 'OOS' ? 'OOS %' : 'Req. %'}</th>
              <th className="px-5 py-3 text-right font-bold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const isExpanded = expandedLevel === row.level;
              const toneText = row.count > 0 ? accentText : 'text-emerald-600';
              const dotTone = row.count > 0 ? (isOos ? 'bg-red-500' : 'bg-amber-500') : 'bg-emerald-500';
              const barWidth = `${Math.max(row.percent, row.count > 0 ? 8 : 0)}%`;
              const flaggedLabel = metric === 'OOS' ? 'out-of-service' : 'requires attention';

              return (
                <Fragment key={row.level}>
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-slate-50/60 ${isExpanded ? 'bg-blue-50/40' : ''}`}
                    onClick={() => onExpandedLevelChange(isExpanded ? null : row.level)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${dotTone}`} />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 leading-snug break-words">Level {row.level} - {row.label}</div>
                          <div className="text-[11px] text-slate-400 leading-snug break-words">{INSPECTION_LEVEL_MAP[row.level] ?? 'Inspection'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-bold text-slate-800">{row.inspections}</td>
                    <td className={`px-4 py-4 text-center font-bold ${row.count > 0 ? toneText : 'text-slate-300'}`}>{row.count}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                          <div className={`h-full rounded-full ${accentBg}`} style={{ width: barWidth }} />
                        </div>
                        <span className={`min-w-[54px] text-sm font-bold ${toneText}`}>{row.percent.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isExpanded ? <ChevronUp size={16} className="ml-auto text-slate-400" /> : <ChevronDown size={16} className="ml-auto text-slate-400" />}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-5 py-4 bg-blue-50/30 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                          <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-slate-700 mb-1 break-words">Level {row.level} - {row.label}</div>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {INSPECTION_LEVEL_DETAIL_MAP[row.level] ?? INSPECTION_LEVEL_MAP[row.level] ?? 'Inspection details unavailable.'}
                            </p>
                            <div className="mt-3 flex items-center gap-4 flex-wrap text-xs">
                              <span className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-600">
                                <span className="font-bold text-slate-800">{row.inspections}</span> inspections
                              </span>
                              <span className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-600">
                                <span className={`font-bold ${toneText}`}>{row.count}</span> {flaggedLabel}
                              </span>
                              <span className={`bg-white border border-slate-200 rounded-md px-2.5 py-1 font-bold ${toneText}`}>
                                {row.percent.toFixed(row.percent % 1 === 0 ? 0 : 2)}% {metric === 'OOS' ? 'OOS' : 'Req.'} rate
                              </span>
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
  );
}

export function NscCvsaInspections() {
  const [activeFilter, setActiveFilter] = useState<CvsaFilter>('ALL');
  const [levelMetric, setLevelMetric] = useState<LevelMetric>('OOS');
  const [reportPrefixFilter, setReportPrefixFilter] = useState<ReportPrefixFilter>('ALL');
  const [expandedLevel, setExpandedLevel] = useState<number | null>(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<{
    code: string; description: string; severity: 'Minor' | 'Major' | 'OOS';
    isOOS: boolean; docId: string;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const visibleColumns = useMemo(() => columns.filter((column) => column.visible), [columns]);
  const desktopGridTemplate = useMemo(() => {
    const widthMap: Record<string, string> = {
      date: 'minmax(132px, 1.05fr)',
      report: 'minmax(156px, 1.1fr)',
      location: 'minmax(180px, 1.25fr)',
      driver: 'minmax(220px, 1.45fr)',
      unit: 'minmax(260px, 1.65fr)',
      defects: 'minmax(92px, 0.7fr)',
      oos: 'minmax(92px, 0.7fr)',
      req: 'minmax(92px, 0.7fr)',
      status: 'minmax(220px, 1.2fr)',
    };

    return (
      visibleColumns
      .map((column) => widthMap[column.id] ?? 'minmax(160px, 1fr)')
      .join(' ')
    ) || 'minmax(160px, 1fr)';
  }, [visibleColumns]);

  const stats = useMemo(() => ({
    total: NSC_INSPECTIONS.length,
    passed: NSC_INSPECTIONS.filter((row) => row.result === 'Passed').length,
    oos: NSC_INSPECTIONS.filter((row) => row.result === 'Out Of Service').length,
    reqAttn: NSC_INSPECTIONS.filter((row) => row.result === 'Requires Attention').length,
    l1: NSC_INSPECTIONS.filter((row) => row.level === 1).length,
    l2: NSC_INSPECTIONS.filter((row) => row.level === 2).length,
    l3: NSC_INSPECTIONS.filter((row) => row.level >= 3).length,
  }), []);

  const levelComparisonRows = useMemo(() => {
    const levelMap = new Map<number, { level: number; inspections: number; oos: number; req: number }>();

    for (const row of NSC_INSPECTIONS) {
      const current = levelMap.get(row.level) ?? { level: row.level, inspections: 0, oos: 0, req: 0 };
      current.inspections += 1;
      if (row.result === 'Out Of Service') current.oos += 1;
      if (row.result === 'Requires Attention') current.req += 1;
      levelMap.set(row.level, current);
    }

    return Array.from({ length: 8 }, (_, index) => index + 1)
      .map((level) => {
        const row = levelMap.get(level) ?? { level, inspections: 0, oos: 0, req: 0 };
        const count = levelMetric === 'OOS' ? row.oos : row.req;
        const percent = row.inspections > 0 ? (count / row.inspections) * 100 : 0;
        return {
          level,
          label: INSPECTION_LEVEL_MAP[level] ?? 'Inspection',
          inspections: row.inspections,
          count,
          percent,
        };
      });
  }, [levelMetric]);

  const totalLevelFlagged = useMemo(
    () => levelComparisonRows.reduce((sum, row) => sum + row.count, 0),
    [levelComparisonRows],
  );

  const activeFilterSummary = useMemo(() => {
    const summary: string[] = [];
    if (activeFilter !== 'ALL') {
      const current = getCvsaFilterSummaryLabel(activeFilter);
      if (current) summary.push(current);
    }
    if (reportPrefixFilter !== 'ALL') {
      summary.push(`Prefix: ${reportPrefixFilter}`);
    }
    return summary;
  }, [activeFilter, reportPrefixFilter]);

  const prefixStats = useMemo(() => ({
    DOT: NSC_INSPECTIONS.filter((row) => getReportPrefix(row) === 'DOT').length,
    OPI: NSC_INSPECTIONS.filter((row) => getReportPrefix(row) === 'OPI').length,
    INS: NSC_INSPECTIONS.filter((row) => getReportPrefix(row) === 'INS').length,
    CVSA: NSC_INSPECTIONS.filter((row) => getReportPrefix(row) === 'CVSA').length,
  }), []);

  const filteredRows = useMemo(() => {
    let rows = NSC_INSPECTIONS;

    switch (activeFilter) {
      case 'PASSED':
        rows = rows.filter((row) => row.result === 'Passed');
        break;
      case 'OOS':
        rows = rows.filter((row) => row.result === 'Out Of Service');
        break;
      case 'REQ_ATTN':
        rows = rows.filter((row) => row.result === 'Requires Attention');
        break;
      case 'L1':
        rows = rows.filter((row) => row.level === 1);
        break;
      case 'L2':
        rows = rows.filter((row) => row.level === 2);
        break;
      case 'L3':
        rows = rows.filter((row) => row.level >= 3);
        break;
      default:
        break;
    }

    if (reportPrefixFilter !== 'ALL') {
      rows = rows.filter((row) => getReportPrefix(row) === reportPrefixFilter);
    }

    if (!searchTerm.trim()) {
      return rows;
    }

    const query = searchTerm.trim().toLowerCase();
    return rows.filter((row) => {
      const rawDriver  = row.details?.driver?.toLowerCase() ?? '';
      const location   = row.details?.location?.toLowerCase() ?? '';
      const agency     = row.details?.agency?.toLowerCase() ?? '';
      const driverName = row.driverLink.driverName.toLowerCase();
      const driverId   = row.driverLink.driverId.toLowerCase();
      const unitNum    = row.primaryVehicle.unitNumber.toLowerCase();
      const assetId    = (row.primaryVehicle.assetId ?? '').toLowerCase();
      return row.date.toLowerCase().includes(query)
        || row.doc.toLowerCase().includes(query)
        || row.jur.toLowerCase().includes(query)
        || row.plate.toLowerCase().includes(query)
        || rawDriver.includes(query)
        || location.includes(query)
        || agency.includes(query)
        || driverName.includes(query)
        || driverId.includes(query)
        || unitNum.includes(query)
        || assetId.includes(query);
    });
  }, [activeFilter, reportPrefixFilter, searchTerm]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, page, rowsPerPage]);

  useEffect(() => {
    setPage(1);
    setExpandedRow(null);
  }, [activeFilter, reportPrefixFilter, searchTerm, rowsPerPage]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredRows.length, page, rowsPerPage]);

  const filterCards: Array<{
    id: CvsaFilter;
    title: string;
    value: number;
    icon: ComponentType<{ size?: number; className?: string }>;
    color: CardColor;
  }> = [
    { id: 'ALL', title: 'All CVSA', value: stats.total, icon: ClipboardCheck, color: 'blue' },
    { id: 'PASSED', title: 'Passed', value: stats.passed, icon: CheckCircle2, color: 'emerald' },
    { id: 'OOS', title: 'OOS Flags', value: stats.oos, icon: ShieldAlert, color: 'red' },
    { id: 'REQ_ATTN', title: 'Req. Attn.', value: stats.reqAttn, icon: AlertTriangle, color: 'amber' },
    { id: 'L1', title: 'Level 1', value: stats.l1, icon: Layers3, color: 'indigo' },
    { id: 'L2', title: 'Level 2', value: stats.l2, icon: Layers3, color: 'violet' },
    { id: 'L3', title: 'Level 3+', value: stats.l3, icon: Layers3, color: 'slate' },
  ];

  const prefixCards: Array<{
    id: Exclude<ReportPrefixFilter, 'ALL'>;
    title: string;
    value: number;
    icon: ComponentType<{ size?: number; className?: string }>;
    color: CardColor;
  }> = [
    { id: 'DOT', title: 'DOT', value: prefixStats.DOT, icon: ClipboardCheck, color: REPORT_PREFIX_META.DOT.color },
    { id: 'OPI', title: 'OPI', value: prefixStats.OPI, icon: ClipboardCheck, color: REPORT_PREFIX_META.OPI.color },
    { id: 'INS', title: 'INS', value: prefixStats.INS, icon: Layers3, color: REPORT_PREFIX_META.INS.color },
    { id: 'CVSA', title: 'CVSA', value: prefixStats.CVSA, icon: ShieldAlert, color: REPORT_PREFIX_META.CVSA.color },
  ];

  return (
    <>
    <div className="space-y-6">
      <LevelComparisonCard
        metric={levelMetric}
        onMetricChange={setLevelMetric}
        expandedLevel={expandedLevel}
        onExpandedLevelChange={setExpandedLevel}
        rows={levelComparisonRows}
        totalInspections={NSC_INSPECTIONS.length}
        totalFlagged={totalLevelFlagged}
      />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h3 className="text-[13px] font-bold text-slate-500 uppercase tracking-[0.18em]">CVSA Inspection Filters</h3>
            <p className="text-xs text-slate-500 mt-1">Filter by outcome, level, and report prefix in one compact strip.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {activeFilterSummary.length > 0 ? activeFilterSummary.map((item) => (
              <span key={item} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                {item}
              </span>
            )) : (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                Showing all inspections
              </span>
            )}
            {(activeFilter !== 'ALL' || reportPrefixFilter !== 'ALL') && (
              <button
                onClick={() => {
                  setActiveFilter('ALL');
                  setReportPrefixFilter('ALL');
                }}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">All Filters</div>
            <div className="text-xs text-slate-500">Tap a card to filter.</div>
          </div>
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}
          >
            {filterCards.map((card) => (
              <KpiFilterCard
                key={card.id}
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                active={activeFilter === card.id}
                onClick={() => setActiveFilter(card.id)}
              />
            ))}
            {prefixCards.map((card) => (
              <KpiFilterCard
                key={card.id}
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                active={reportPrefixFilter === card.id}
                onClick={() => setReportPrefixFilter(card.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">CVSA Inspections</h2>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded uppercase tracking-wide">NSC</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden md:overflow-x-auto">
          <DataListToolbar
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search CVSA inspections..."
            columns={columns}
            onToggleColumn={(id) => setColumns((prev) => prev.map((column) => column.id === id ? { ...column, visible: !column.visible } : column))}
            totalItems={filteredRows.length}
            currentPage={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />

          <div
            className="hidden md:grid gap-x-4 px-5 py-3.5 bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-[0.16em]"
            style={{ gridTemplateColumns: desktopGridTemplate, minWidth: 'max(100%, 1320px)' }}
          >
            {visibleColumns.map((column) => (
              <div
                key={column.id}
                className={[
                  column.id === 'date' ? 'pl-1' : '',
                  column.id === 'defects' || column.id === 'oos' || column.id === 'req' ? 'text-center' : '',
                ].join(' ').trim()}
              >
                {column.label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-200">
            {pagedRows.length > 0 ? pagedRows.map((row) => {
              const isExpanded = expandedRow === row.id;
              const driver = row.driverLink;
              const primaryVehicle = getPrimaryVehicle(row);
              const totalDefects = (row.details?.oos.length ?? 0) + (row.details?.req.length ?? 0);
              const oosCount = row.details?.oos.length ?? 0;
              const reqCount = row.details?.req.length ?? 0;
              const oosRows = getDetailRows(row.details?.oosRows, row.details?.oos);
              const reqRows = getDetailRows(row.details?.reqRows, row.details?.req);

              return (
                <Fragment key={row.id}>
                  <div
                    className="group bg-white hover:bg-blue-50/30 transition-colors border-b border-slate-100 last:border-0"
                  >
                    <div
                      className="hidden md:grid gap-x-4 px-5 py-4 items-center cursor-pointer border-l-2 border-transparent hover:bg-slate-50/60 transition-colors"
                      style={{ gridTemplateColumns: desktopGridTemplate, minWidth: 'max(100%, 1320px)' }}
                      onClick={() => row.details && setExpandedRow(isExpanded ? null : row.id)}
                    >
                      {visibleColumns.map((column) => {
                        switch (column.id) {
                          case 'date':
                            return (
                              <div key={column.id} className="pl-1 flex flex-col justify-center">
                                <span className="text-sm font-bold text-slate-800">{row.date}</span>
                                <span className="text-[10px] text-slate-400 font-mono mt-0.5">{row.details?.time ?? '-'}</span>
                              </div>
                            );
                          case 'report': {
                            const dt = getDocType(row.doc);
                            return (
                              <div key={column.id} className="min-w-0 flex flex-col justify-center">
                                <span className="text-xs font-bold text-blue-600 block truncate leading-tight" title={`${dt.title}: ${row.doc}`}>
                                  {dt.label} {row.doc}
                                </span>
                                {getInspectionTag(row.level)}
                              </div>
                            );
                          }
                          case 'location':
                            return (
                              <div key={column.id} className="flex flex-col justify-center min-w-0">
                                <span className="text-sm font-medium text-slate-700 truncate">{getLocationSummary(row)}</span>
                                <span className="text-[10px] text-slate-400">{row.jur}, CAN</span>
                              </div>
                            );
                          case 'driver':
                            return (
                              <div key={column.id} className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-400 flex-shrink-0">
                                  <User size={14} fill="currentColor" />
                                </div>
                                <div className="min-w-0 flex flex-col justify-center">
                                  <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{driver.driverName}</span>
                                  <span className="text-[10px] text-blue-500 font-mono truncate block">{driver.driverId}</span>
                                </div>
                              </div>
                            );
                          case 'unit':
                            return (
                              <div key={column.id} className="flex flex-col justify-center min-w-0">
                                <span className="text-sm font-bold text-slate-800 truncate block leading-tight">{primaryVehicle}</span>
                                <span className="text-[10px] text-slate-400 font-mono truncate block">{row.primaryVehicle.plate}</span>
                                {totalDefects > 0 && (
                                  <span className="text-[10px] font-medium truncate block mt-0.5 text-amber-600" title={getDefectSummary(row)}>
                                    {getDefectSummary(row)}
                                  </span>
                                )}
                              </div>
                            );
                          case 'defects':
                            return (
                              <div key={column.id} className="flex justify-center items-center">
                                {totalDefects > 0 ? (
                                  <span className="inline-flex min-w-[58px] justify-center rounded-full bg-orange-50 px-3 py-1 text-[13px] font-bold text-orange-600">
                                    {totalDefects}
                                  </span>
                                ) : (
                                  <span className="inline-flex min-w-[58px] justify-center rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-600">
                                    Clean
                                  </span>
                                )}
                              </div>
                            );
                          case 'oos':
                            return (
                              <div key={column.id} className="flex justify-center items-center">
                                <span className={`inline-flex min-w-[48px] justify-center rounded-full px-3 py-1 text-[13px] font-bold ${oosCount > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                  {oosCount || '-'}
                                </span>
                              </div>
                            );
                          case 'req':
                            return (
                              <div key={column.id} className="flex justify-center items-center">
                                <span className={`inline-flex min-w-[48px] justify-center rounded-full px-3 py-1 text-[13px] font-bold ${reqCount > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                                  {reqCount || '-'}
                                </span>
                              </div>
                            );
                          case 'status':
                            return (
                              <div key={column.id} className="flex items-center justify-between gap-3">
                                <div className="min-w-0 flex flex-col items-start gap-1">
                                  {getResultBadge(row.result)}
                                  <span className="text-[10px] text-slate-400 truncate">{getAgencySummary(row)}</span>
                                </div>
                                <div className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400">
                                  {row.details ? (isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />) : null}
                                </div>
                              </div>
                            );
                          default:
                            return null;
                        }
                      })}
                    </div>

                    <div
                      className="md:hidden px-4 py-4 space-y-3 cursor-pointer"
                      onClick={() => row.details && setExpandedRow(isExpanded ? null : row.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs font-bold text-blue-600">{getDocType(row.doc).label} {row.doc}</div>
                          <div className="mt-1 text-sm font-bold text-slate-900">{row.date}</div>
                          <div className="text-[11px] text-slate-400">{row.details?.time ?? '-'} | {row.jur}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getResultBadge(row.result)}
                          {row.details ? (isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />) : null}
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Driver</div>
                          <div className="font-semibold text-slate-800">{driver.driverName}</div>
                          <div className="text-[11px] text-blue-500 font-mono">{driver.driverId}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</div>
                          <div className="font-medium text-slate-700">{getLocationSummary(row)}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Defects</div>
                            <div className="mt-1 text-sm font-black text-slate-900">{totalDefects}</div>
                          </div>
                          <div className="rounded-lg border border-red-100 bg-red-50/60 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">OOS</div>
                            <div className="mt-1 text-sm font-black text-red-600">{row.details?.oos.length ?? 0}</div>
                          </div>
                          <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Req</div>
                            <div className="mt-1 text-sm font-black text-amber-700">{row.details?.req.length ?? 0}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && row.details && (() => {
                    // ── Pre-compute everything needed for the panel ──────────────
                    const jur = row.jur?.toUpperCase() ?? '';
                    const levelDesc   = INSPECTION_LEVEL_MAP[row.level] ?? `Level ${row.level} Inspection`;
                    const levelDetail = INSPECTION_LEVEL_DETAIL_MAP[row.level];
                    const regulation  =
                      jur === 'AB' ? 'Commercial Vehicle Inspection Regulation — AR 211/06, NSC Standard 11' :
                      jur === 'ON' ? 'Highway Traffic Act — O.Reg.199/07, O.Reg.555/06, NSC Standard 13' :
                      jur === 'BC' ? 'Motor Vehicle Act — Commercial Transport Regulation, NSC Standard 11' :
                      jur === 'SK' ? 'Traffic Safety Act — VSR 116/2014, NSC Standard 11' :
                      jur === 'MB' ? 'Highway Traffic Act — MR 189/2010, NSC Standard 11' :
                      jur === 'QC' ? 'Highway Safety Code — O.C. 1395-96, NSC Standard 11' :
                      'CTACMV Regulations — NSC Standard 11';

                    const oosCount   = row.details.oos.length;
                    const reqCount   = row.details.req.length;
                    const totalDef   = oosCount + reqCount;
                    const defScore   = oosCount * 3 + reqCount;
                    const severityRate = totalDef > 0 ? +(defScore / totalDef).toFixed(1) : 0;

                    // Driver vs Vehicle OOS determination
                    const DRIVER_PREFIXES = ['1', '2'];
                    const hasDriverOOS  = oosRows.some(d => DRIVER_PREFIXES.includes(d.category.split(/[\s-]/)[0].trim()));
                    const hasVehicleOOS = oosRows.some(d => !DRIVER_PREFIXES.includes(d.category.split(/[\s-]/)[0].trim()));

                    // Resolve system driver + asset links
                    const driver      = MOCK_DRIVERS.find(d => d.id === row.driverLink.driverId);
                    const asset       = row.primaryVehicle.assetId ? INITIAL_ASSETS.find(a => a.id === row.primaryVehicle.assetId) : null;
                    const trailerAsset = row.trailerLink?.assetId  ? INITIAL_ASSETS.find(a => a.id === row.trailerLink!.assetId)  : null;
                    const primaryLic  = driver?.licenses?.find(l => l.isPrimary) ?? null;

                    // Build all violations (OOS first, then REQ) deduped by code
                    const seen = new Set<string>();
                    const allViolations: Array<{
                      code: string; description: string;
                      severity: 'Minor' | 'Major' | 'OOS'; isOOS: boolean;
                    }> = [];
                    for (const defect of oosRows) {
                      const prefix = defect.category.split(' - ')[0].trim();
                      const code = prefix === '13' ? '702' : (DEFECT_TO_NSC[prefix] ?? null);
                      if (code && !seen.has(code)) {
                        const entry = NSC_VIOLATION_CATALOG[code];
                        if (entry) { seen.add(code); allViolations.push({ code, ...entry, isOOS: true }); }
                      }
                    }
                    for (const defect of reqRows) {
                      const prefix = defect.category.split(' - ')[0].trim();
                      const code = DEFECT_TO_NSC[prefix] ?? null;
                      if (code && !seen.has(code)) {
                        const entry = NSC_VIOLATION_CATALOG[code];
                        if (entry) { seen.add(code); allViolations.push({ code, ...entry, isOOS: false }); }
                      }
                    }

                    // Violation summary by system category
                    const SUMMARY_CATS = ['Vehicle Maintenance', 'Hours of Service', 'Driver Fitness', 'Hazmat Compliance', 'Other'];
                    const violSummary: Record<string, number> = {};
                    for (const v of allViolations) {
                      const sys = NSC_CODE_TO_SYSTEM[v.code];
                      const label = sys?.categoryLabel ?? 'Other';
                      const key = SUMMARY_CATS.includes(label) ? label : 'Other';
                      violSummary[key] = (violSummary[key] || 0) + 1;
                    }

                    const resultColor =
                      row.result === 'Passed'         ? 'text-emerald-700' :
                      row.result === 'Out Of Service' ? 'text-red-700'     : 'text-amber-700';

                    return (
                      <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-5 flex flex-col gap-5">

                        {/* ── 1. Regulation Banner ── */}
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="shrink-0 rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                              NSC LEVEL {row.level}
                            </span>
                            <span className="text-xs text-slate-700">
                              <span className="font-semibold">{levelDesc}</span>
                              {' — '}
                              <span className="text-slate-500">{regulation}</span>
                            </span>
                          </div>
                          {levelDetail && <p className="text-[11px] text-slate-500 leading-relaxed">{levelDetail}</p>}
                        </div>

                        {/* ── 2. Stat cards ── */}
                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Inspection Time</div>
                            <div className="font-mono font-bold text-slate-900 text-sm">{row.details.time || '—'}</div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</div>
                            <div className="font-bold text-slate-900 text-sm uppercase">{row.details.location || '—'}, {jur}</div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">NSC Defects</div>
                            <div className="font-mono font-bold text-slate-900 text-sm">
                              OOS: <span className={oosCount > 0 ? 'text-red-600' : 'text-slate-400'}>{oosCount}</span>
                              {' | '}REQ: <span className={reqCount > 0 ? 'text-amber-600' : 'text-slate-400'}>{reqCount}</span>
                              {' | '}Total: {totalDef}
                            </div>
                          </div>
                          <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Severity Rate</div>
                            <div className={`font-mono font-bold text-sm ${severityRate >= 2.5 ? 'text-red-600' : severityRate >= 1.5 ? 'text-amber-600' : 'text-slate-900'}`}>
                              {severityRate > 0 ? severityRate : '—'}
                            </div>
                          </div>
                        </div>

                        {/* ── 3. Four-card grid: Driver | Asset | Violation Summary | OOS ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4 items-stretch">

                          {/* DRIVER */}
                          <div className="flex flex-col gap-2 h-full">
                            <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                              <User size={13} className="text-slate-400" /> Driver
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col gap-3 h-full">
                              <div className="flex items-start gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                  {driver?.avatarInitials ?? row.driverLink.driverName.slice(0,2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 truncate">{row.driverLink.driverName}</p>
                                  <p className="text-xs text-slate-500">Driver ID: <span className="font-mono">{row.driverLink.driverId}</span></p>
                                  <p className="text-xs text-slate-500">Licence: <span className="font-mono font-bold">{primaryLic?.licenseNumber ?? driver?.licenseNumber ?? '—'}</span></p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px] font-bold">Level</div>
                                  <div className="text-slate-800 font-semibold mt-0.5">Level {row.level}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px] font-bold">Violations</div>
                                  <div className="text-slate-800 font-semibold mt-0.5">{allViolations.length}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px] font-bold">Prov / State</div>
                                  <div className="text-slate-800 font-semibold mt-0.5">{primaryLic?.province ?? driver?.licenseState ?? '—'}</div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded p-2">
                                  <div className="text-slate-400 uppercase tracking-wide text-[10px] font-bold">Expiry</div>
                                  <div className="text-slate-800 font-semibold mt-0.5">{primaryLic?.expiryDate ?? driver?.licenseExpiry ?? '—'}</div>
                                </div>
                              </div>
                              {row.driverLink.rawLicence && (
                                <div className="text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-2 truncate" title={row.driverLink.rawLicence}>
                                  NSC Record: {row.driverLink.rawLicence}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ASSET DETAILS */}
                          <div className="flex flex-col gap-2 h-full">
                            <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                              <Truck size={13} className="text-slate-400" /> Asset Details
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full overflow-hidden">
                              {/* Power unit header */}
                              <div className="px-3 py-2.5 border-b border-slate-100">
                                <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Truck</div>
                                <div className="text-sm font-semibold text-slate-900 font-mono">{row.primaryVehicle.unitNumber}</div>
                                <div className="text-xs text-slate-500">Asset ID: {row.primaryVehicle.assetId ?? 'unlinked'}</div>
                              </div>
                              {/* Power unit details */}
                              <div className="px-3 py-2.5 border-b border-slate-100 text-xs">
                                <div className="flex justify-between text-slate-500">
                                  <span className="font-semibold uppercase">{row.details.vehicles[0]?.type ?? 'P'}</span>
                                  <span className="text-slate-500 bg-slate-100 rounded px-1.5 font-mono">{asset?.make ?? row.primaryVehicle.make}</span>
                                </div>
                                <div className="mt-1.5 flex justify-between">
                                  <span className="text-slate-400">License</span>
                                  <span className="font-semibold font-mono text-slate-800">{asset?.plateNumber ?? row.primaryVehicle.plate}</span>
                                </div>
                                <div className="mt-0.5 flex justify-between">
                                  <span className="text-slate-400">VIN</span>
                                  <span className="font-mono text-slate-600 text-[11px]">{asset?.vin ?? row.primaryVehicle.vin ?? '—'}</span>
                                </div>
                                {asset && (
                                  <div className="mt-0.5 flex justify-between">
                                    <span className="text-slate-400">Year / Model</span>
                                    <span className="text-slate-700">{asset.year} {asset.model}</span>
                                  </div>
                                )}
                              </div>
                              {/* Trailer */}
                              {row.trailerLink && (
                                <div className="px-3 py-2.5 border-b border-slate-100 text-xs">
                                  <div className="flex justify-between text-slate-500">
                                    <span className="font-semibold uppercase">Trailer</span>
                                    <span className="text-slate-500 bg-slate-100 rounded px-1.5 font-mono">{trailerAsset?.make ?? row.trailerLink.make}</span>
                                  </div>
                                  <div className="mt-1.5 flex justify-between">
                                    <span className="text-slate-400">License</span>
                                    <span className="font-semibold font-mono text-slate-800">{trailerAsset?.plateNumber ?? row.trailerLink.plate}</span>
                                  </div>
                                  {trailerAsset?.vin && (
                                    <div className="mt-0.5 flex justify-between">
                                      <span className="text-slate-400">VIN</span>
                                      <span className="font-mono text-slate-600 text-[11px]">{trailerAsset.vin}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Power unit defects */}
                              {oosRows.length > 0 && (
                                <div className="px-3 py-2 bg-red-50/60 border-t border-red-100">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Power Unit Defects</div>
                                  <div className="text-xs text-red-700 font-medium">
                                    {oosRows.map(d => d.category.split(' - ').slice(1).join(' - ') || d.category).join(', ')}
                                  </div>
                                </div>
                              )}
                              {reqRows.length > 0 && (
                                <div className="px-3 py-2 bg-amber-50/60 border-t border-amber-100">
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Requires Attention</div>
                                  <div className="text-xs text-amber-700 font-medium">
                                    {reqRows.map(d => d.category.split(' - ').slice(1).join(' - ') || d.category).join(', ')}
                                  </div>
                                </div>
                              )}
                              {/* Agency */}
                              <div className="px-3 py-2 border-t border-slate-100 flex items-start gap-1.5">
                                <Building2 size={11} className="text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Issuing Agency</div>
                                  <div className="text-[11px] font-medium text-slate-700 leading-snug mt-0.5">{getAgencySummary(row)}</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* VIOLATION SUMMARY */}
                          <div className="flex flex-col gap-2 h-full">
                            <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                              <Activity size={13} className="text-slate-400" /> Violation Summary
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm h-full">
                              <div className="divide-y divide-slate-100 text-[13px]">
                                {SUMMARY_CATS.map(cat => (
                                  <div key={cat} className="flex justify-between items-center px-4 py-2.5">
                                    <span className="text-slate-700 font-medium text-xs">{cat}</span>
                                    <span className={`font-bold text-sm ${violSummary[cat] ? 'text-red-600' : 'text-slate-400'}`}>
                                      {violSummary[cat] || 0}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-700 uppercase tracking-wide">Total</span>
                                <span className="font-black text-base text-slate-900">{allViolations.length}</span>
                              </div>
                            </div>
                          </div>

                          {/* OUT OF SERVICE */}
                          <div className="flex flex-col gap-2 h-full">
                            <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                              <AlertTriangle size={13} className="text-slate-400" /> Out of Service (OOS)
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col justify-between h-full">
                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-700 font-medium">Driver OOS</span>
                                  {hasDriverOOS
                                    ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-200">FAILED</span>
                                    : <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200">PASSED</span>
                                  }
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-700 font-medium">Vehicle OOS</span>
                                  {hasVehicleOOS
                                    ? <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-red-200">FAILED</span>
                                    : <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-200">PASSED</span>
                                  }
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs text-slate-700 font-medium">Result</span>
                                  <span className={`text-xs font-bold ${resultColor}`}>{row.result}</span>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-end">
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Total OOS</span>
                                <span className={`text-2xl font-black leading-none ${oosCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>{oosCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ── 4. Defect tables by vehicle position ── */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <DefectDetailTable title="Out of Service"    tone="red"   rows={oosRows} emptyMessage="No out of service defects on this inspection." />
                          <DefectDetailTable title="Requires Attention" tone="amber" rows={reqRows} emptyMessage="No requires attention defects on this inspection." />
                        </div>

                        {/* ── 5. Detailed violations table ── */}
                        {allViolations.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                              <FileText size={13} className="text-slate-400" /> Detailed Violations — {getDocType(row.doc).label} {row.doc}
                            </h4>
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-x-auto">
                              <table className="w-full text-left text-sm">
                                <thead className="bg-white border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  <tr>
                                    <th className="px-4 py-3">CCMTA Code</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3 text-center">Risk Level</th>
                                    <th className="px-4 py-3 text-center">Severity</th>
                                    <th className="px-4 py-3 text-center">OOS</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {allViolations.map((v, i) => {
                                    const sys = NSC_CODE_TO_SYSTEM[v.code];
                                    const riskPct = sys?.riskLevel === 'High' ? 85 : sys?.riskLevel === 'Medium' ? 45 : 15;
                                    const riskColor = sys?.riskLevel === 'High' ? 'bg-red-500' : sys?.riskLevel === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400';
                                    const riskText  = sys?.riskLevel === 'High' ? 'text-red-700' : sys?.riskLevel === 'Medium' ? 'text-amber-700' : 'text-slate-600';
                                    return (
                                      <tr key={i} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedViolation({ ...v, docId: row.doc })} title="Click to view violation details">
                                        <td className="px-4 py-3.5 font-mono font-bold text-slate-700">{v.code}</td>
                                        <td className="px-4 py-3.5 text-slate-700">
                                          {sys ? (
                                            <div>
                                              <div className="font-medium text-slate-800">{sys.categoryLabel}</div>
                                              <div className="text-[10px] text-blue-400 font-medium mt-0.5">{sys.violationGroup}</div>
                                            </div>
                                          ) : <span className="text-slate-400">—</span>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                          <div className="font-medium text-slate-800 leading-snug">{v.description}</div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                          {sys ? (
                                            <div className="flex flex-col items-center gap-1 min-w-[90px]">
                                              <span className={`text-xs font-bold ${riskText}`}>{sys.riskLevel.toUpperCase()} RISK {riskPct}%</span>
                                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                <div className={`h-full rounded-full ${riskColor}`} style={{ width: `${riskPct}%` }} />
                                              </div>
                                            </div>
                                          ) : null}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                          <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${
                                            v.severity === 'OOS'   ? 'bg-red-50 text-red-700 border-red-200' :
                                            v.severity === 'Major' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                          }`}>{v.severity}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                          {v.isOOS
                                            ? <span className="font-bold text-red-600 text-sm">YES</span>
                                            : <span className="text-slate-400">—</span>
                                          }
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
                    );
                  })()}
                </Fragment>
              );
            }) : (
              <div className="p-16 text-center text-slate-500 flex flex-col items-center bg-slate-50/50">
                <div className="bg-white border border-slate-200 p-4 rounded-full mb-4 shadow-sm">
                  <AlertCircle size={32} className="text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-wide">No CVSA records found</h3>
                <p className="text-sm text-slate-500 mt-1 mb-5 max-w-sm">No CVSA inspections match your current search or filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveFilter('ALL');
                    setPage(1);
                  }}
                  className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition-colors text-sm shadow-sm"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>

          <PaginationBar
            totalItems={filteredRows.length}
            currentPage={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </div>
      </div>
    </div>

    {/* ── Violation detail modal ── */}
    {selectedViolation && (() => {
      const sys = NSC_CODE_TO_SYSTEM[selectedViolation.code];
      const riskPct   = sys?.riskLevel === 'High' ? 85 : sys?.riskLevel === 'Medium' ? 45 : 15;
      const riskColor = sys?.riskLevel === 'High' ? 'bg-red-500' : sys?.riskLevel === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400';
      const riskText  = sys?.riskLevel === 'High' ? 'text-red-600' : sys?.riskLevel === 'Medium' ? 'text-amber-600' : 'text-slate-600';
      const points    = sys?.riskLevel === 'High' ? 3 : sys?.riskLevel === 'Medium' ? 2 : 1;
      // Look up raw NSC document record by matching CCMTA numeric code
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
                <p className="text-sm text-slate-500 mt-0.5">Inspection {selectedViolation.docId}</p>
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

              {/* System Category — styled like CVOR cross-reference box */}
              {sys && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-1.5 py-px rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">NSC System Category</span>
                    <span className="text-xs text-slate-400 font-medium">CCMTA</span>
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-800">{sys.categoryLabel}</div>
                  <div className="text-[13px] text-slate-500 mt-0.5">{sys.violationGroup}</div>
                  {/* Risk bar */}
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

              {/* Officer Text / Notes */}
              {rawRecord?.text && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Officer Notes</div>
                  <div className="text-slate-800 leading-relaxed text-[13px] italic">"{rawRecord.text}"</div>
                </div>
              )}

              {/* Vehicle / Commodity row */}
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

              {/* Stats grid — Severity / Points / OOS / Risk */}
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
    </>
  );
}
