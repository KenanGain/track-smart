import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Activity, 
  Info,
  AlertOctagon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Scale,
  Globe,
  Gavel,
  Plus,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Edit2,
  LayoutGrid
} from 'lucide-react';
import { VIOLATION_DATA } from '@/data/violations.data';
import { NSC_CODE_TO_SYSTEM, CCMTA_ALPHA_CODE_MAP, FMCSA_BASIC_MAP, cfr_to_basic } from '@/pages/inspections/nscViolationMap';
import { NSC_VIOLATION_CATALOG } from '@/pages/inspections/NscAnalysis';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// ─── Telematics Tags → CFR mapping ───────────────────────────────────────────
// Each CFR code (exact, after stripping "49 CFR " and parenthetical sub-sections)
// maps to the telematics tags that violation triggers.

// Tab Configuration
const TABS_CONFIG = [
  { key: 'all', label: 'All Violations' },
  { key: 'vehicle_maintenance', label: 'Vehicle Maintenance' },
  { key: 'unsafe_driving', label: 'Unsafe Driving' },
  { key: 'hours_of_service', label: 'Hours-of-service Compliance' },
  { key: 'driver_fitness', label: 'Driver Fitness' },
  { key: 'hazmat_compliance', label: 'Hazmat Compliance' },
  { key: 'controlled_substances_alcohol', label: 'Controlled Substances' },
];

// Normalize text: convert ALL CAPS to sentence case, preserving acronyms
const normalizeText = (text: string): string => {
  if (!text) return text;
  
  // Common acronyms to preserve in uppercase
  const acronyms = new Set([
    'OOS', 'CFR', 'FMCSA', 'DOT', 'BAC', 'DUI', 'DWI', 'OWI', 'CMV', 'DSMS',
    'HOS', 'CDL', 'NSC', 'HTA', 'TDG', 'PHMSA', 'CCMTA', 'CVOR', 'USA', 'ON',
    'BC', 'AB', 'SK', 'MB', 'QC', 'NB', 'NS', 'PE', 'NL', 'YT', 'NT', 'NU'
  ]);
  
  // Convert to lowercase first
  let normalized = text.toLowerCase();
  
  // Capitalize first letter
  normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  
  // Restore acronyms (use word boundaries to match whole words)
  acronyms.forEach(acronym => {
    const regex = new RegExp(`\\b${acronym.toLowerCase()}\\b`, 'gi');
    normalized = normalized.replace(regex, acronym);
  });
  
  return normalized;
};

// ─── NSC / CCMTA helpers ──────────────────────────────────────────────────────
/** Extract leading numeric code from a raw CCMTA string e.g. "1205 UNAUTHORIZED USE REG" → "1205" */
function extractCcmtaNum(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.trim().split(/\s+/)[0] ?? '';
}

/**
 * Returns true when the CCMTA code is a 2-char Schedule of Convictions alpha
 * code (e.g. "OE", "HD", "DQ") rather than a numeric CVSA inspection code
 * (e.g. "601", "1101").
 */
function isAlphaCcmtaCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code.trim());
}

/** Derive NSC risk points from NSC_CODE_TO_SYSTEM: High=3, Medium=2, Low=1 */
function getNscDerivedPoints(ccmtaNum: string): number | null {
  if (isAlphaCcmtaCode(ccmtaNum)) {
    const alpha = CCMTA_ALPHA_CODE_MAP[ccmtaNum];
    if (!alpha) return null;
    return alpha.riskLevel === 'Critical' ? 7 : alpha.riskLevel === 'High' ? 3 : alpha.riskLevel === 'Medium' ? 2 : 1;
  }
  const sys = NSC_CODE_TO_SYSTEM[ccmtaNum];
  if (!sys) return null;
  return sys.riskLevel === 'High' ? 3 : sys.riskLevel === 'Medium' ? 2 : 1;
}

/** Get best FMCSA BASIC key for a violation item */
function getItemFmcsaBasic(item: { regulatoryCodes: { usa: Array<{ cfr: string[] }> }; canadaEnforcement?: { ccmtaCode?: string } }): string | null {
  // Try from CFR codes first
  for (const reg of item.regulatoryCodes?.usa ?? []) {
    for (const c of reg.cfr ?? []) {
      const basic = cfr_to_basic(c);
      if (basic) return basic;
    }
  }
  // Fallback: from CCMTA alpha code's fmcsaBasic field
  const raw = item.canadaEnforcement?.ccmtaCode ?? '';
  const code = extractCcmtaNum(raw);
  if (isAlphaCcmtaCode(code)) return CCMTA_ALPHA_CODE_MAP[code]?.fmcsaBasic ?? null;
  return null;
}

// ─── Column Definitions (grouped for dropdown display) ────────────────────────
const COLUMN_GROUPS = [
  {
    group: 'Core',
    columns: [
      { id: 'code',        label: 'Code',        desc: 'Violation / regulation code' },
      { id: 'description', label: 'Description', desc: 'Full violation description' },
      { id: 'regulatory',  label: 'Regulatory',  desc: 'Authority (FMCSA, DOT, NSC…)' },
      { id: 'group',       label: 'Group',       desc: 'Violation group / sub-category' },
    ],
  },
  {
    group: 'Canadian Codes',
    columns: [
      { id: 'ccmtaCode',   label: 'CCMTA Code',         desc: '2-char conviction code or numeric NSC inspection code' },
      { id: 'nscSystem',   label: 'NSC / CCMTA Mapping', desc: 'System category, section, risk level & pts' },
      { id: 'nscPoints',   label: 'NSC Points',          desc: 'National Safety Code demerit points' },
      { id: 'cvorPoints',  label: 'CVOR Points',         desc: 'Commercial Vehicle Operator Record pts (ON)' },
      { id: 'offenceCode', label: 'Offence Code',        desc: 'Internal offence / conviction code' },
    ],
  },
  {
    group: 'US / FMCSA',
    columns: [
      { id: 'fmcsaBasic', label: 'FMCSA BASIC',    desc: 'Behavior Analysis Safety Improvement Category (SMS)' },
      { id: 'cfrCode',    label: 'CFR Reference',  desc: 'Primary 49 CFR part / section' },
    ],
  },
  {
    group: 'Risk & Scoring',
    columns: [
      { id: 'risk',     label: 'Risk Level',   desc: 'Driver risk category (1=High, 2=Mod, 3=Low)' },
      { id: 'crashPct', label: 'Crash %',      desc: 'Crash likelihood correlation %' },
      { id: 'severity', label: 'Severity D/C', desc: 'Severity weight: Driver / Carrier (0–10)' },
      { id: 'vehPts',   label: 'Vehicle Pts',  desc: 'Carrier severity weight' },
      { id: 'dvrPts',   label: 'Driver Pts',   desc: 'Driver severity weight' },
      { id: 'carPts',   label: 'Carrier Pts',  desc: 'Combined carrier impact score' },
    ],
  },
  {
    group: 'Telematics',
    columns: [
      { id: 'telematicsTag', label: 'Telematics Tags', desc: 'VEDR / ELD event tags that trigger this violation' },
    ],
  },
  {
    group: 'Other',
    columns: [
      { id: 'actions', label: 'Actions', desc: 'Edit / manage violation' },
    ],
  },
];

// Flat list for backwards compatibility
const ALL_COLUMN_OPTIONS = COLUMN_GROUPS.flatMap(g => g.columns);

const DEFAULT_VISIBLE = new Set([
  'code', 'description', 'regulatory',
  'ccmtaCode', 'nscSystem', 'fmcsaBasic',
  'nscPoints', 'cvorPoints',
  'risk', 'severity', 'actions'
]);

// ─── Column Selector Component (grouped) ──────────────────────────────────────
const ColumnSelector = ({ visibleColumns, onChange }: { visibleColumns: Set<string>, onChange: (cols: Set<string>) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = (id: string) => {
    const next = new Set(visibleColumns);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  const visCount = ALL_COLUMN_OPTIONS.filter(c => visibleColumns.has(c.id)).length;
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
      >
        <LayoutGrid size={14} />
        Columns
        <span className="ml-0.5 bg-blue-100 text-blue-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">{visCount}</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-slate-700">Column Visibility</span>
                <span className="ml-2 text-[10px] text-slate-400">{visCount} of {ALL_COLUMN_OPTIONS.length} shown</span>
              </div>
              <button
                onClick={() => onChange(new Set(DEFAULT_VISIBLE))}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
              >
                Reset defaults
              </button>
            </div>
            {/* Grouped options */}
            <div className="max-h-[420px] overflow-y-auto">
              {COLUMN_GROUPS.map(group => (
                <div key={group.group} className="border-b border-slate-100 last:border-0">
                  <div className="px-4 py-2 bg-slate-50/60">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.group}</span>
                  </div>
                  <div className="px-2 py-1 space-y-0.5">
                    {group.columns.map(col => (
                      <label
                        key={col.id}
                        className="flex items-start gap-2.5 px-2 py-2 hover:bg-slate-50 rounded-lg cursor-pointer select-none group"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 shrink-0"
                          checked={visibleColumns.has(col.id)}
                          onChange={() => toggle(col.id)}
                        />
                        <div className="min-w-0">
                          <div className={`text-xs font-semibold leading-tight ${visibleColumns.has(col.id) ? 'text-slate-800' : 'text-slate-500'}`}>
                            {col.label}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight mt-0.5 group-hover:text-slate-500">
                            {col.desc}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => onChange(new Set(ALL_COLUMN_OPTIONS.map(c => c.id)))}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline"
              >
                Show all
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={() => onChange(new Set(['code', 'description', 'actions']))}
                className="text-[11px] font-bold text-slate-500 hover:text-slate-800 hover:underline"
              >
                Minimal
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export function ViolationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('impact');
  
  // State for Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // State for Filters
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]); // Empty array = ALL
  const [canadaOnly, setCanadaOnly] = useState(false);
  const [fmcsaOnly, setFmcsaOnly] = useState(false);
  const [cvorOnly, setCvorOnly] = useState(false);
  
  // Active Category State
  const [activeCategory, setActiveCategory] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set(DEFAULT_VISIBLE));

  const data = VIOLATION_DATA;

  const currentCategoryData = useMemo(() => {
    if (activeCategory === 'all') {
      const allItems = Object.values(data.categories).flatMap(c => c.items);
      const allStats = {
        total: allItems.length,
        high_risk: allItems.filter(i => i.driverRiskCategory === 1).length,
        moderate_risk: allItems.filter(i => i.driverRiskCategory === 2).length,
        lower_risk: allItems.filter(i => i.driverRiskCategory === 3).length,
      };
      return { _stats: allStats, items: allItems };
    }
    return data.categories[activeCategory] || { _stats: { total: 0, high_risk: 0, moderate_risk: 0, lower_risk: 0 }, items: [] };
  }, [activeCategory, data.categories]);

  // Ultimate deep search: indexes EVERY field in the violation data structure
  const buildSearchableText = (item: typeof currentCategoryData.items[0]): string => {
    const ce = item.canadaEnforcement;
    const parts: string[] = [
      // ─── Core fields ───
      item.id,
      item.violationCode,
      item.violationDescription,
      item.violationGroup,
      item._source || '',

      // ─── Status flags (with aliases) ───
      item.isOos ? 'oos out-of-service out of service' : 'not-oos',
      item.inDsms ? 'dsms in-dsms monitored' : 'not-dsms',

      // ─── Risk category (with human labels) ───
      `risk ${item.driverRiskCategory}`,
      item.driverRiskCategory === 1 ? 'high risk high-risk critical' : '',
      item.driverRiskCategory === 2 ? 'moderate risk moderate-risk medium elevated' : '',
      item.driverRiskCategory === 3 ? 'lower risk lower-risk low minor' : '',

      // ─── Severity & Crash stats ───
      `severity driver:${item.severityWeight.driver} carrier:${item.severityWeight.carrier}`,
      `crash ${item.crashLikelihoodPercent ?? 0}%`,
      (item.crashLikelihoodPercent ?? 0) > 60 ? 'extreme-crash extreme crash danger' : '',

      // ─── USA regulatory (all nested fields) ───
      ...(item.regulatoryCodes?.usa?.flatMap(r => [
        r.authority,
        r.description,
        ...(r.cfr || []),
        ...(r.statute || []),
      ]) || []),

      // ─── Canada regulatory (all nested fields) ───
      ...(item.regulatoryCodes?.canada?.flatMap(r => [
        r.authority,
        r.description,
        ...(r.reference || []),
        ...(r.province || []),
      ]) || []),

      // ─── Canada enforcement (every sub-field) ───
      ce?.act || '',
      ce?.section || '',
      ce?.code || '',
      ce?.ccmtaCode || '',
      ce?.category || '',

      // All description variants
      ce?.descriptions?.full || '',
      ce?.descriptions?.conviction || '',
      ce?.descriptions?.shortForm52 || '',

      // Points (searchable as text)
      ce?.points?.nsc != null ? `nsc:${ce.points.nsc} nsc-points:${ce.points.nsc}` : '',
      ce?.points?.revised != null ? `revised:${ce.points.revised}` : '',
      ce?.points?.cvor ? `cvor:${ce.points.cvor.raw} cvor-min:${ce.points.cvor.min} cvor-max:${ce.points.cvor.max}` : '',

      // CVOR classification
      ce?.cvorClassification?.convictionType || '',
      ce?.cvorClassification?.alternativeGroup || '',

      // Raw source (if available)
      ce?.rawSource?.rawLine || '',
      ce?.rawSource?.rawMatch || '',
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
  };

  // Pre-compute searchable text per item for performance
  const searchableMap = useMemo(() => {
    const map = new Map<string, string>();
    currentCategoryData.items.forEach(item => {
      map.set(item.id, buildSearchableText(item));
    });
    return map;
  }, [currentCategoryData]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    let items = currentCategoryData.items.filter(item => {
      // Deep search across all fields
      if (term) {
        const text = searchableMap.get(item.id) || '';
        const words = term.split(/\s+/).filter(Boolean);
        const matchesSearch = words.every(word => text.includes(word));
        if (!matchesSearch) return false;
      }
      // Multi-select Risk Filter
      if (selectedRisks.length > 0) {
        if (!selectedRisks.includes(String(item.driverRiskCategory))) return false;
      }
      // Source filters
      if (canadaOnly && !item.canadaEnforcement?.ccmtaCode) return false;
      if (fmcsaOnly && !item.regulatoryCodes?.usa?.some(r => r.authority?.toUpperCase().includes('FMCSA'))) return false;
      if (cvorOnly && !item.canadaEnforcement?.points?.cvor) return false;
      return true;
    });

    // Sorting Logic
    if (sortConfig.key) {
      items = [...items].sort((a, b) => {
        let aVal: string | number, bVal: string | number;

        switch(sortConfig.key) {
          case 'code': aVal = a.violationCode; bVal = b.violationCode; break;
          case 'desc': aVal = a.violationDescription; bVal = b.violationDescription; break;
          case 'group': aVal = a.violationGroup; bVal = b.violationGroup; break;
          case 'risk': aVal = a.driverRiskCategory; bVal = b.driverRiskCategory; break;
          case 'sev': aVal = a.severityWeight.driver; bVal = b.severityWeight.driver; break;
          case 'crash': aVal = a.crashLikelihoodPercent || 0; bVal = b.crashLikelihoodPercent || 0; break;
          case 'vehPts': aVal = a.severityWeight.carrier; bVal = b.severityWeight.carrier; break;
          case 'dvrPts': aVal = a.severityWeight.driver; bVal = b.severityWeight.driver; break;
          case 'carPts': aVal = (a.severityWeight.driver || 0) + (a.severityWeight.carrier || 0); bVal = (b.severityWeight.driver || 0) + (b.severityWeight.carrier || 0); break;
          case 'status': aVal = a.inDsms ? 1 : 0; bVal = b.inDsms ? 1 : 0; break;
          default: return 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [currentCategoryData, searchTerm, selectedRisks, sortConfig, searchableMap, canadaOnly, fmcsaOnly, cvorOnly]);

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [filteredItems, currentPage, rowsPerPage]);

  // Reset page when filters change
  const resetPage = () => setCurrentPage(1);


  const handleRiskCardClick = (level: string) => {
    setSelectedRisks(prev => {
      if (prev.includes(level)) {
        return prev.filter(r => r !== level);
      } else {
        return [...prev, level];
      }
    });
    resetPage();
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: string) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-slate-300" />;
    if (sortConfig.direction === 'asc') return <ArrowUp size={14} className="text-indigo-600" />;
    return <ArrowDown size={14} className="text-indigo-600" />;
  };

  const getAuthStyle = (auth: string) => {
    const a = auth.toUpperCase();
    if (a.includes('FMCSA')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (a.includes('DOT')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (a.includes('NSC')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (a.includes('CRIMINAL') || a.includes('CC')) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (a.includes('PROVINCIAL') || a.includes('HTA')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (a.includes('STATE')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (a.includes('TDG')) return 'bg-orange-50 text-orange-800 border-orange-200';
    if (a.includes('PHMSA')) return 'bg-teal-50 text-teal-700 border-teal-200';
    return 'bg-gray-50 text-slate-600 border-gray-200';
  };

  const toggleRow = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setActiveTab('impact');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">

      {/* ── Top Header Bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                Settings / Violations
              </div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Violations Risk Matrix
              </h1>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-w-md">
              <Info size={13} className="text-slate-400 shrink-0" />
              <span>Risk-weighted by crash correlation, severity, and driver risk category (probability to cause crash in next 12 months).</span>
            </div>
          </div>
          <button className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
            <Plus size={15} /> Add Violation
          </button>
        </div>

      </div>

      {/* ── KPI Risk Cards ── */}
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          {/* High Risk */}
          {(() => {
            const active = selectedRisks.includes('1');
            const count = currentCategoryData._stats.high_risk;
            return (
              <button
                onClick={() => handleRiskCardClick('1')}
                className={`relative text-left rounded-xl border-2 p-4 shadow-sm cursor-pointer transition-all duration-150 overflow-hidden group ${
                  active ? 'border-red-500 bg-red-50 ring-2 ring-red-400 ring-offset-1' : 'border-slate-200 bg-white hover:border-red-300 hover:shadow-md'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${active ? 'bg-red-500' : 'bg-red-400'}`} />
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${active ? 'bg-red-100 text-red-700 border-red-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      <AlertTriangle size={9} /> High Risk
                    </span>
                    {active && <X size={13} className="text-red-500 shrink-0" />}
                  </div>
                  <div className={`text-3xl font-black tabular-nums mt-2 ${active ? 'text-red-700' : 'text-red-600'}`}>{count.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-snug group-hover:text-slate-700 transition-colors">Highest crash probability — urgent action required</div>
                </div>
              </button>
            );
          })()}

          {/* Moderate Risk */}
          {(() => {
            const active = selectedRisks.includes('2');
            const count = currentCategoryData._stats.moderate_risk;
            return (
              <button
                onClick={() => handleRiskCardClick('2')}
                className={`relative text-left rounded-xl border-2 p-4 shadow-sm cursor-pointer transition-all duration-150 overflow-hidden group ${
                  active ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-400 ring-offset-1' : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${active ? 'bg-amber-500' : 'bg-amber-400'}`} />
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`inline-flex text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${active ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                      Moderate Risk
                    </span>
                    {active && <X size={13} className="text-amber-500 shrink-0" />}
                  </div>
                  <div className={`text-3xl font-black tabular-nums mt-2 ${active ? 'text-amber-700' : 'text-amber-600'}`}>{count.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-snug group-hover:text-slate-700 transition-colors">Elevated risk — monitoring and corrective training</div>
                </div>
              </button>
            );
          })()}

          {/* Lower Risk */}
          {(() => {
            const active = selectedRisks.includes('3');
            const count = currentCategoryData._stats.lower_risk;
            return (
              <button
                onClick={() => handleRiskCardClick('3')}
                className={`relative text-left rounded-xl border-2 p-4 shadow-sm cursor-pointer transition-all duration-150 overflow-hidden group ${
                  active ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400 ring-offset-1' : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-xl ${active ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
                <div className="pl-3">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`inline-flex text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                      Lower Risk
                    </span>
                    {active && <X size={13} className="text-emerald-500 shrink-0" />}
                  </div>
                  <div className={`text-3xl font-black tabular-nums mt-2 ${active ? 'text-emerald-700' : 'text-emerald-600'}`}>{count.toLocaleString()}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-snug group-hover:text-slate-700 transition-colors">Compliance / maintenance — lower crash correlation</div>
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* ── Category Tabs + Search ── */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="flex items-center gap-0 overflow-x-auto">
          {TABS_CONFIG.map((tab) => {
            const isActiveTab = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveCategory(tab.key); resetPage(); }}
                className={`whitespace-nowrap px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  isActiveTab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search + Filter Row ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-grow min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search code, description, CFR, CCMTA, act, section, province…"
            className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setFmcsaOnly(v => !v); setCanadaOnly(false); setCvorOnly(false); resetPage(); }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap ${
              fmcsaOnly ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
            }`}
          >
            <FileText size={13} /> FMCSA Only
          </button>
          <button
            onClick={() => { setCvorOnly(v => !v); setCanadaOnly(false); setFmcsaOnly(false); resetPage(); }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap ${
              cvorOnly ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50'
            }`}
          >
            <Scale size={13} /> CVOR Only
          </button>
          <button
            onClick={() => { setCanadaOnly(v => !v); setFmcsaOnly(false); setCvorOnly(false); resetPage(); }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg border transition-colors whitespace-nowrap ${
              canadaOnly ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50'
            }`}
          >
            <Globe size={13} /> NSC / CCMTA
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <ColumnSelector visibleColumns={visibleColumns} onChange={setVisibleColumns} />
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap tabular-nums">
            {filteredItems.length.toLocaleString()} / {currentCategoryData._stats.total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Main Table ── */}
      <main className="px-6 py-4">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 select-none">
                <tr className="border-b border-slate-200">
                  {visibleColumns.has('code') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('code')}>
                    <div className="flex items-center gap-1">Code {getSortIcon('code')}</div>
                  </th>}
                  {visibleColumns.has('description') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[220px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('desc')}>
                    <div className="flex items-center gap-1">Description {getSortIcon('desc')}</div>
                  </th>}
                  {visibleColumns.has('regulatory') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">
                    Regulatory
                  </th>}
                  {visibleColumns.has('group') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[120px] cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('group')}>
                    <div className="flex items-center gap-1">Group {getSortIcon('group')}</div>
                  </th>}
                  {visibleColumns.has('ccmtaCode') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-28">
                    CCMTA
                  </th>}
                  {visibleColumns.has('nscSystem') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">
                    <div className="flex items-center gap-1.5">NSC / CCMTA <span className="text-emerald-600 text-[9px] font-bold uppercase tracking-wider border border-emerald-200 bg-emerald-50 px-1 py-px rounded">linked</span></div>
                  </th>}
                  {visibleColumns.has('fmcsaBasic') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[160px]">
                    <div className="flex items-center gap-1.5">FMCSA BASIC <span className="text-blue-600 text-[9px] font-bold uppercase tracking-wider border border-blue-200 bg-blue-50 px-1 py-px rounded">SMS</span></div>
                  </th>}
                  {visibleColumns.has('offenceCode') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">
                    Offence Code
                  </th>}
                  {visibleColumns.has('cfrCode') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider w-32">
                    CFR
                  </th>}
                  {visibleColumns.has('telematicsTag') && <th scope="col" className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[180px]">
                    Telematics
                  </th>}
                  {visibleColumns.has('nscPoints') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">
                    NSC Pts
                  </th>}
                  {visibleColumns.has('cvorPoints') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20">
                    CVOR
                  </th>}
                  {visibleColumns.has('risk') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('risk')}>
                    <div className="flex items-center justify-center gap-1">Risk {getSortIcon('risk')}</div>
                  </th>}
                  {visibleColumns.has('crashPct') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('crash')}>
                    <div className="flex items-center justify-center gap-1">Crash % {getSortIcon('crash')}</div>
                  </th>}
                  {visibleColumns.has('severity') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('sev')}>
                    <div className="flex items-center justify-center gap-1">Sev D/C {getSortIcon('sev')}</div>
                  </th>}
                  {visibleColumns.has('vehPts') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('vehPts')}>
                    <div className="flex items-center justify-center gap-1">Veh {getSortIcon('vehPts')}</div>
                  </th>}
                  {visibleColumns.has('dvrPts') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('dvrPts')}>
                    <div className="flex items-center justify-center gap-1">Dvr {getSortIcon('dvrPts')}</div>
                  </th>}
                  {visibleColumns.has('carPts') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('carPts')}>
                    <div className="flex items-center justify-center gap-1">Car {getSortIcon('carPts')}</div>
                  </th>}
                  {visibleColumns.has('actions') && <th scope="col" className="px-3 py-2.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-16">
                    Actions
                  </th>}
                  <th scope="col" className="px-2 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="px-6 py-12 text-center">
                      <Search className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                      <h3 className="text-slate-900 font-medium">No violations found in this category</h3>
                      <p className="text-slate-500 text-sm mt-1">Try switching categories or adjusting filters.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const isExpanded = expandedId === item.id;
                    
                    const authorities = Array.from(new Set([
                        ...item.regulatoryCodes.usa?.map(r => r.authority) || [],
                        ...(item.regulatoryCodes.canada?.map(r => r.authority) || [])
                    ])).slice(0, 3);
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`group cursor-pointer transition-colors border-l-2 ${
                            item.driverRiskCategory === 1 ? 'border-l-red-400' :
                            item.driverRiskCategory === 2 ? 'border-l-amber-400' :
                            'border-l-emerald-400'
                          } ${isExpanded ? 'bg-blue-50/40' : 'hover:bg-slate-50/80'}`}
                          onClick={() => toggleRow(item.id)}
                        >
                          {visibleColumns.has('code') && <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] tracking-wide">
                                {item.violationCode}
                              </span>
                              {item.isOos && (
                                <span className="text-[9px] font-bold text-red-600 uppercase tracking-wider">OOS</span>
                              )}
                            </div>
                          </td>}

                          {visibleColumns.has('description') && <td className="px-3 py-2">
                            <div className="text-[13px] font-semibold text-slate-900 leading-snug">
                              {normalizeText(item.violationDescription)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{item.violationGroup}</div>
                          </td>}

                          {visibleColumns.has('regulatory') && <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1.5">
                              {authorities.map(auth => (
                                  <span key={auth} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getAuthStyle(auth)}`}>
                                      {auth.replace('_', ' ')}
                                  </span>
                              ))}
                            </div>
                          </td>}

                          {visibleColumns.has('group') && <td className="px-3 py-2 whitespace-nowrap">
                             <span className="text-xs text-slate-600 font-medium">{item.violationGroup}</span>
                          </td>}

                          {/* CCMTA Code */}
                          {visibleColumns.has('ccmtaCode') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            {item.canadaEnforcement?.ccmtaCode ? (() => {
                              const raw = item.canadaEnforcement.ccmtaCode;
                              const code = extractCcmtaNum(raw);
                              const isAlpha = isAlphaCcmtaCode(code);
                              const alphaEntry = isAlpha ? CCMTA_ALPHA_CODE_MAP[code] : null;
                              const numSys = !isAlpha ? NSC_CODE_TO_SYSTEM[code] : null;
                              const riskLevel = alphaEntry?.riskLevel ?? (numSys?.riskLevel === 'High' ? 'High' : numSys?.riskLevel);
                              const badgeCls =
                                riskLevel === 'Critical' ? 'bg-red-100 text-red-700 border-red-300' :
                                riskLevel === 'High'     ? 'bg-amber-100 text-amber-700 border-amber-300' :
                                riskLevel === 'Medium'   ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                isAlpha ? 'bg-violet-100 text-violet-700 border-violet-300' : 'bg-purple-100 text-purple-700 border-purple-300';
                              return (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[12px] font-black font-mono border ${badgeCls}`}>
                                    {code || raw}
                                  </span>
                                  {(alphaEntry?.label ?? numSys?.violationGroup) && (
                                    <span className="text-[9px] text-slate-500 leading-tight text-center max-w-[90px] truncate">
                                      {alphaEntry?.label ?? numSys?.violationGroup}
                                    </span>
                                  )}
                                </div>
                              );
                            })() : <span className="text-slate-300 text-xs">—</span>}
                          </td>}

                          {/* NSC / CCMTA Mapping */}
                          {visibleColumns.has('nscSystem') && <td className="px-3 py-2">
                            {(() => {
                              const raw = item.canadaEnforcement?.ccmtaCode ?? '';
                              const code = extractCcmtaNum(raw);
                              if (!code) return <span className="text-slate-300 text-xs">—</span>;

                              // ── 2-char alpha conviction code ──
                              if (isAlphaCcmtaCode(code)) {
                                const alpha = CCMTA_ALPHA_CODE_MAP[code];
                                if (!alpha) return <span className="text-slate-400 text-xs font-mono">{code}</span>;
                                const riskCls = alpha.riskLevel === 'Critical' ? 'text-red-700 bg-red-50 border-red-200'
                                  : alpha.riskLevel === 'High'   ? 'text-amber-700 bg-amber-50 border-amber-200'
                                  : alpha.riskLevel === 'Medium' ? 'text-blue-700 bg-blue-50 border-blue-200'
                                  : 'text-slate-600 bg-slate-100 border-slate-200';
                                return (
                                  <div className="flex flex-col gap-0.5 min-w-[170px]">
                                    <span className="text-[12px] font-bold text-slate-800 leading-tight">{alpha.nscCategoryLabel}</span>
                                    <span className="text-[10px] text-slate-500 leading-tight">{alpha.label}</span>
                                    {alpha.nscSection && <span className="text-[9px] text-indigo-500 font-mono">{alpha.nscSection}</span>}
                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                      <span className={`text-[9px] font-bold px-1.5 py-px rounded border uppercase ${riskCls}`}>{alpha.riskLevel}</span>
                                      {alpha.pointsTypical && <span className="text-[9px] font-black text-slate-600">~{alpha.pointsTypical} pts</span>}
                                      <span className="text-[8px] font-bold px-1 py-px rounded bg-violet-50 text-violet-600 border border-violet-200 uppercase">Conv.</span>
                                    </div>
                                  </div>
                                );
                              }

                              // ── Numeric CVSA inspection code ──
                              const sys = NSC_CODE_TO_SYSTEM[code];
                              const cat = NSC_VIOLATION_CATALOG[code];
                              if (!sys && !cat) return <span className="text-slate-300 text-xs">—</span>;
                              const pts = sys ? (sys.riskLevel === 'High' ? 3 : sys.riskLevel === 'Medium' ? 2 : 1) : null;
                              const riskCls = sys?.riskLevel === 'High' ? 'text-red-700 bg-red-50 border-red-200'
                                : sys?.riskLevel === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-200'
                                : 'text-slate-600 bg-slate-100 border-slate-200';
                              return (
                                <div className="flex flex-col gap-0.5 min-w-[160px]">
                                  {sys && <span className="text-[12px] font-bold text-slate-800 leading-tight">{sys.categoryLabel}</span>}
                                  {sys && <span className="text-[10px] text-slate-500 leading-tight">{sys.violationGroup}</span>}
                                  {sys?.nscSection && <span className="text-[9px] text-indigo-500 font-mono">{sys.nscSection}</span>}
                                  {cat && !sys && <span className="text-[12px] font-bold text-slate-700 leading-tight">{cat.description}</span>}
                                  {cat && !sys && <span className="text-[10px] text-slate-500 leading-tight">{cat.group}</span>}
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    {sys && <span className={`text-[9px] font-bold px-1.5 py-px rounded border uppercase ${riskCls}`}>{sys.riskLevel}</span>}
                                    {pts !== null && <span className="text-[9px] font-black text-slate-600">{pts} pts</span>}
                                    {sys?.oosEligible && <span className="text-[8px] font-bold px-1 py-px rounded bg-red-50 text-red-600 border border-red-200 uppercase">OOS</span>}
                                    {cat && <span className={`text-[9px] font-bold px-1.5 py-px rounded border uppercase ${cat.severity === 'OOS' ? 'text-red-700 bg-red-50 border-red-200' : cat.severity === 'Major' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-600 bg-slate-100 border-slate-200'}`}>{cat.severity}</span>}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>}

                          {/* FMCSA BASIC */}
                          {visibleColumns.has('fmcsaBasic') && <td className="px-3 py-2">
                            {(() => {
                              const basicKey = getItemFmcsaBasic(item);
                              if (!basicKey) return <span className="text-slate-300 text-xs">—</span>;
                              const basic = FMCSA_BASIC_MAP[basicKey];
                              if (!basic) return <span className="text-slate-300 text-xs">—</span>;
                              return (
                                <div className="flex flex-col gap-0.5 min-w-[140px]">
                                  <span className="text-[12px] font-bold text-blue-700 leading-tight">{basic.label}</span>
                                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                    <span className="text-[9px] font-bold px-1.5 py-px rounded border uppercase bg-blue-50 text-blue-600 border-blue-200">
                                      {basic.smsWeight}% SMS
                                    </span>
                                    {basic.oosThreshold && (
                                      <span className="text-[9px] font-bold px-1.5 py-px rounded border uppercase bg-amber-50 text-amber-700 border-amber-200">
                                        OOS ≥{basic.oosThreshold}%
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </td>}

                          {/* Offence Code */}
                          {visibleColumns.has('offenceCode') && <td className="px-3 py-2 whitespace-nowrap">
                            {item.canadaEnforcement?.code ? (
                              <span className="font-mono text-[11px] font-bold text-slate-700" title={item.canadaEnforcement.descriptions?.full}>
                                {item.canadaEnforcement.code}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>}

                          {/* CFR Code */}
                          {visibleColumns.has('cfrCode') && <td className="px-3 py-2 whitespace-nowrap">
                            {item.regulatoryCodes?.usa?.[0]?.cfr?.[0] ? (
                              <span className="font-mono text-[11px] text-blue-600 font-semibold" title={item.regulatoryCodes.usa[0].description}>
                                {item.regulatoryCodes.usa[0].cfr[0]}
                              </span>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>}

                          {/* Telematics Tags */}
                          {visibleColumns.has('telematicsTag') && (
                            <td className="px-3 py-2">
                              {(item.telematicsTags?.length ?? 0) > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {item.telematicsTags!.map(tag => (
                                    <span key={tag} className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 whitespace-nowrap">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                          )}

                          {/* NSC Points */}
                          {visibleColumns.has('nscPoints') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            {(() => {
                              const nscRaw = item.canadaEnforcement?.points?.nsc;
                              if (nscRaw != null) {
                                const cls = nscRaw >= 5 ? 'text-red-700 bg-red-50 border-red-200' : nscRaw >= 3 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-100 border-slate-200';
                                return <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black border ${cls}`}>{nscRaw}</span>;
                              }
                              const num = extractCcmtaNum(item.canadaEnforcement?.ccmtaCode);
                              const derived = getNscDerivedPoints(num);
                              if (derived !== null) {
                                const cls = derived >= 5 ? 'text-red-600' : derived >= 3 ? 'text-amber-600' : 'text-slate-500';
                                return (
                                  <div className="flex flex-col items-center">
                                    <span className={`text-sm font-black ${cls}`}>{derived}</span>
                                    <span className="text-[8px] text-slate-400 italic">est.</span>
                                  </div>
                                );
                              }
                              return <span className="text-slate-300 text-xs">—</span>;
                            })()}
                          </td>}

                          {/* CVOR Points */}
                          {visibleColumns.has('cvorPoints') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            {item.canadaEnforcement?.points?.cvor ? (() => {
                              const cvor = item.canadaEnforcement!.points.cvor!;
                              const max = cvor.max || 0;
                              const cls = max >= 10 ? 'text-red-700 bg-red-50 border-red-200' : max >= 5 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-700 bg-slate-100 border-slate-200';
                              const display = cvor.min === cvor.max ? String(cvor.min) : `${cvor.min}–${cvor.max}`;
                              return (
                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-black border ${cls}`} title={`Raw: ${cvor.raw}`}>
                                  {display}
                                </span>
                              );
                            })() : <span className="text-slate-300 text-xs">—</span>}
                          </td>}

                          {visibleColumns.has('risk') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            {(() => {
                              const lvl = item.driverRiskCategory;
                              const cls = lvl === 1 ? 'bg-red-100 text-red-700 border-red-200'
                                : lvl === 2 ? 'bg-amber-100 text-amber-700 border-amber-200'
                                : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                              const label = data.riskCategories[String(lvl)]?.label || `Risk ${lvl}`;
                              return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${cls}`}>{label}</span>;
                            })()}
                          </td>}

                          {visibleColumns.has('crashPct') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className={`text-xs font-bold tabular-nums ${(item.crashLikelihoodPercent ?? 0) > 50 ? 'text-red-600' : (item.crashLikelihoodPercent ?? 0) > 20 ? 'text-amber-600' : 'text-slate-600'}`}>
                                {item.crashLikelihoodPercent ?? 0}%
                              </span>
                              <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${(item.crashLikelihoodPercent ?? 0) > 50 ? 'bg-red-500' : (item.crashLikelihoodPercent ?? 0) > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(Math.max(item.crashLikelihoodPercent ?? 0, 4), 100)}%` }} />
                              </div>
                            </div>
                          </td>}

                          {/* Severity */}
                          {visibleColumns.has('severity') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            <div className="inline-flex items-center gap-0.5 font-mono text-xs">
                              <span className={`font-bold ${item.severityWeight.driver >= 7 ? 'text-red-600' : item.severityWeight.driver >= 4 ? 'text-amber-600' : 'text-slate-700'}`}>{item.severityWeight.driver}</span>
                              <span className="text-slate-300">/</span>
                              <span className={`font-bold ${item.severityWeight.carrier >= 7 ? 'text-red-600' : item.severityWeight.carrier >= 4 ? 'text-amber-600' : 'text-slate-700'}`}>{item.severityWeight.carrier}</span>
                            </div>
                          </td>}

                          {/* Vehicle Points */}
                          {visibleColumns.has('vehPts') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            <span className={`text-sm font-bold font-mono ${item.severityWeight.carrier > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {item.severityWeight.carrier || 0}
                            </span>
                          </td>}

                          {/* Driver Points */}
                          {visibleColumns.has('dvrPts') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            <span className={`text-sm font-bold font-mono ${item.severityWeight.driver > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                              {item.severityWeight.driver || 0}
                            </span>
                          </td>}

                          {/* Carrier Points (sum of driver + carrier severity or CVOR points if available) */}
                          {visibleColumns.has('carPts') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            {(() => {
                              const cvorPts = item.canadaEnforcement?.points?.cvor;
                              const total = cvorPts ? (cvorPts.min ?? 0) : (item.severityWeight.driver || 0) + (item.severityWeight.carrier || 0);
                              return (
                                <span className={`text-sm font-bold font-mono ${total > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                                  {total}
                                </span>
                              );
                            })()}
                          </td>}


                          {/* Actions Column */}
                          {visibleColumns.has('actions') && <td className="px-3 py-2 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); console.log('Edit violation:', item.id); }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit violation"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>}

                          {/* Expand Trigger Column */}
                          <td className="px-3 py-2 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end">
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={20} className="p-0 border-t border-blue-100 bg-blue-50/30">
                               <div className="px-6 py-5 animate-in slide-in-from-top-2 duration-150">
                                <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200 w-fit mb-6">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('impact'); }}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'impact' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    <span className="flex items-center gap-2"><Activity size={16}/> Impact Analysis</span>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('usa'); }}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'usa' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    <span className="flex items-center gap-2"><Scale size={16}/> USA Regulations</span>
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('canada'); }}
                                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'canada' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                  >
                                    <span className="flex items-center gap-2"><Globe size={16}/> Canada Enforcement</span>
                                  </button>
                                </div>

                                <div className="min-h-[200px]" onClick={(e) => e.stopPropagation()}>
                                  {activeTab === 'impact' && (() => {
                                    const crashPct = item.crashLikelihoodPercent ?? 0;
                                    const drvSev = item.severityWeight.driver;
                                    const carSev = item.severityWeight.carrier;
                                    const nscPts = item.canadaEnforcement?.points?.nsc;
                                    const cvorPts = item.canadaEnforcement?.points?.cvor;
                                    const basicKey = getItemFmcsaBasic(item);
                                    const basic = basicKey ? FMCSA_BASIC_MAP[basicKey] : null;
                                    const riskCat = item.driverRiskCategory;
                                    // Derived indicators from BASIC / violationGroup
                                    const isHOS = basicKey === 'hos_compliance' || item.violationGroup?.toLowerCase().includes('hour');
                                    const isDriverFitness = basicKey === 'driver_fitness';
                                    const isUnsafeDriving = basicKey === 'unsafe_driving';
                                    const isMaintenance = basicKey === 'vehicle_maintenance' || item.violationGroup?.toLowerCase().includes('vehicle') || item.violationGroup?.toLowerCase().includes('brake') || item.violationGroup?.toLowerCase().includes('tire');
                                    const isHazmat = basicKey === 'hazmat';
                                    const isControlled = basicKey === 'controlled_substances';
                                    // Maintenance prob — rough heuristic: vehicle_maintenance → higher
                                    const maintenanceProb = isMaintenance ? Math.min(100, crashPct * 0.6 + 20) : Math.min(100, crashPct * 0.25);
                                    // Risk label
                                    const riskLabel = riskCat === 1 ? 'High Risk' : riskCat === 2 ? 'Moderate Risk' : 'Lower Risk';
                                    return (
                                    <div className="space-y-3">
                                      {/* Row 1 — Status KPIs */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {/* Risk Category */}
                                        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Risk Category</div>
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${riskCat === 1 ? 'bg-red-500' : riskCat === 2 ? 'bg-amber-400' : 'bg-emerald-500'}`}/>
                                            <span className="text-sm font-semibold text-slate-800">{riskLabel}</span>
                                          </div>
                                          <div className="text-[10px] text-slate-400">Driver risk tier {riskCat} of 3</div>
                                        </div>
                                        {/* Crash Probability */}
                                        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Crash Probability</div>
                                          <div className="flex items-baseline gap-1">
                                            <span className={`text-2xl font-bold tabular-nums ${crashPct >= 100 ? 'text-red-600' : crashPct >= 50 ? 'text-amber-600' : 'text-slate-800'}`}>{crashPct}</span>
                                            <span className="text-sm text-slate-400">%</span>
                                          </div>
                                          <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${crashPct >= 100 ? 'bg-red-400' : crashPct >= 50 ? 'bg-amber-400' : 'bg-slate-400'}`} style={{width:`${Math.min(crashPct,100)}%`}}/>
                                          </div>
                                          {crashPct > 100 && <div className="text-[9px] text-red-500 flex items-center gap-0.5"><AlertTriangle size={9}/> Above 100% — extreme correlation</div>}
                                        </div>
                                        {/* OOS Status */}
                                        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">OOS Status</div>
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.isOos ? 'bg-red-500' : 'bg-emerald-500'}`}/>
                                            <span className="text-sm font-semibold text-slate-800">{item.isOos ? 'OOS Trigger' : 'No OOS'}</span>
                                          </div>
                                          <div className="text-[10px] text-slate-400">{item.isOos ? 'Immediate out-of-service order' : 'Does not trigger OOS'}</div>
                                        </div>
                                        {/* DSMS */}
                                        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col gap-2">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">DSMS Monitoring</div>
                                          <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.inDsms ? 'bg-indigo-500' : 'bg-slate-300'}`}/>
                                            <span className="text-sm font-semibold text-slate-800">{item.inDsms ? 'Active' : 'Not monitored'}</span>
                                          </div>
                                          <div className="text-[10px] text-slate-400">{item.inDsms ? 'Tracked in safety system' : 'Not currently in DSMS'}</div>
                                        </div>
                                      </div>

                                      {/* Row 2 — Points & Severity */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">NSC Points</div>
                                          <div className="flex items-baseline gap-1">
                                            {nscPts != null
                                              ? <><span className="text-2xl font-bold tabular-nums text-slate-800">{nscPts}</span><span className="text-xs text-slate-400 ml-1">pts</span></>
                                              : <span className="text-xl font-semibold text-slate-300">—</span>}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-1">National Safety Code</div>
                                        </div>
                                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">CVOR Points</div>
                                          <div className="flex items-baseline gap-1">
                                            {cvorPts != null
                                              ? <><span className="text-2xl font-bold tabular-nums text-slate-800">{cvorPts.min === cvorPts.max ? cvorPts.min : `${cvorPts.min}–${cvorPts.max}`}</span><span className="text-xs text-slate-400 ml-1">pts</span></>
                                              : <span className="text-xl font-semibold text-slate-300">—</span>}
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-1">Commercial Vehicle Operator</div>
                                        </div>
                                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Driver Severity</div>
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold tabular-nums text-slate-800">{drvSev}</span>
                                            <span className="text-xs text-slate-400">/ 10</span>
                                          </div>
                                          <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full rounded-full bg-slate-500" style={{width:`${drvSev*10}%`}}/>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                                          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Carrier Severity</div>
                                          <div className="flex items-baseline gap-1">
                                            <span className="text-2xl font-bold tabular-nums text-slate-800">{carSev}</span>
                                            <span className="text-xs text-slate-400">/ 10</span>
                                          </div>
                                          <div className="h-1 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                            <div className="h-full rounded-full bg-slate-500" style={{width:`${carSev*10}%`}}/>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Row 3 — FMCSA BASIC Category Indicators */}
                                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">FMCSA BASIC Category Impact</span>
                                          {basic && <span className="text-[10px] font-semibold text-slate-600">{basic.label} · {basic.smsWeight}% SMS Weight</span>}
                                        </div>
                                        <div className="px-4 py-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                                          {([
                                            { key: 'unsafe_driving', label: 'Unsafe Driving', active: isUnsafeDriving },
                                            { key: 'hos_compliance', label: 'HOS Compliance', active: isHOS },
                                            { key: 'driver_fitness', label: 'Driver Fitness', active: isDriverFitness },
                                            { key: 'vehicle_maintenance', label: 'Vehicle Maint.', active: isMaintenance },
                                            { key: 'hazmat', label: 'Hazmat', active: isHazmat },
                                            { key: 'controlled_substances', label: 'Controlled Sub.', active: isControlled },
                                          ] as const).map(ind => {
                                            const bInfo = FMCSA_BASIC_MAP[ind.key];
                                            return (
                                              <div key={ind.key} className={`rounded border py-2 px-2 text-center ${ind.active ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                                                <div className={`text-[9px] font-semibold uppercase tracking-wide ${ind.active ? 'text-white' : 'text-slate-400'}`}>{ind.label}</div>
                                                {ind.active && bInfo && <div className="text-[9px] text-slate-300 mt-0.5">{bInfo.smsWeight}% SMS</div>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>

                                      {/* Row 4 — Probability Bars */}
                                      <div className="grid md:grid-cols-2 gap-3">
                                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                                          <div className="text-xs font-semibold text-slate-600 mb-3">Crash & Incident Probability</div>
                                          <div className="space-y-3">
                                            <div>
                                              <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500">Overall Crash Correlation</span>
                                                <span className="font-semibold text-slate-700 tabular-nums">{crashPct}%</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${crashPct >= 100 ? 'bg-red-400' : 'bg-slate-400'}`} style={{width:`${Math.min(crashPct,100)}%`}}/>
                                              </div>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500">Maintenance-Related Probability</span>
                                                <span className="font-semibold text-slate-700 tabular-nums">{Math.round(maintenanceProb)}%</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-slate-400" style={{width:`${Math.min(maintenanceProb,100)}%`}}/>
                                              </div>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500">OOS Risk Contribution</span>
                                                <span className={`font-semibold tabular-nums ${item.isOos ? 'text-red-600' : 'text-slate-400'}`}>{item.isOos ? '100%' : '0%'}</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${item.isOos ? 'bg-red-400' : 'bg-slate-200'}`} style={{width:item.isOos ? '100%' : '0%'}}/>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="bg-white rounded-lg border border-slate-200 p-4">
                                          <div className="text-xs font-semibold text-slate-600 mb-3">Driver & Carrier Impact</div>
                                          <div className="space-y-3">
                                            <div>
                                              <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500">Driver Severity Score</span>
                                                <span className="font-semibold text-slate-700 tabular-nums">{drvSev} / 10</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-slate-500" style={{width:`${drvSev*10}%`}}/>
                                              </div>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500">Carrier Severity Score</span>
                                                <span className="font-semibold text-slate-700 tabular-nums">{carSev} / 10</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full bg-slate-500" style={{width:`${carSev*10}%`}}/>
                                              </div>
                                            </div>
                                            <div>
                                              <div className="flex justify-between text-xs mb-1.5">
                                                <span className="text-slate-500">HOS Risk Indicator</span>
                                                <span className={`font-semibold tabular-nums ${isHOS ? 'text-slate-700' : 'text-slate-400'}`}>{isHOS ? 'Applicable' : 'N/A'}</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${isHOS ? 'bg-slate-500' : 'bg-slate-200'}`} style={{width:isHOS ? '100%' : '0%'}}/>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Row 5 — Summary Footer */}
                                      <div className="border border-slate-200 rounded-lg px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1 items-center text-xs text-slate-500">
                                        <span><span className="font-semibold text-slate-700">Group:</span> {item.violationGroup}</span>
                                        {basic && <span><span className="font-semibold text-slate-700">FMCSA BASIC:</span> {basic.label}</span>}
                                        {basic?.canadaEquivalent && <span><span className="font-semibold text-slate-700">Canada:</span> {basic.canadaEquivalent}</span>}
                                        {item.isOos && <span className="text-red-600 font-semibold flex items-center gap-1"><AlertOctagon size={11}/>OOS Trigger</span>}
                                        {item.inDsms && <span className="text-slate-600">In DSMS</span>}
                                      </div>
                                    </div>
                                    );
                                  })()}

                                  {activeTab === 'usa' && (
                                    <div className="space-y-4">
                                      {/* FMCSA BASIC Mapping Banner */}
                                      {(() => {
                                        const basicKey = getItemFmcsaBasic(item);
                                        const basic = basicKey ? FMCSA_BASIC_MAP[basicKey] : null;
                                        if (!basic) return null;
                                        // Gather all CFR parts used
                                        const allCfrs = item.regulatoryCodes.usa.flatMap(r => r.cfr ?? []);
                                        return (
                                          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">FMCSA BASIC Mapping</span>
                                              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">{basicKey?.replace(/_/g,' ').toUpperCase()}</span>
                                              <span className="text-sm font-bold text-slate-700">{basic.label}</span>
                                              {basic.canadaEquivalent && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">Canada: {basic.canadaEquivalent}</span>
                                              )}
                                            </div>
                                            <div className="grid md:grid-cols-4 gap-4">
                                              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">BASIC Category</div>
                                                <div className="text-sm font-bold text-blue-800">{basic.label}</div>
                                              </div>
                                              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">SMS Weight</div>
                                                <div className="text-2xl font-black text-blue-700">{basic.smsWeight}<span className="text-sm font-normal text-slate-400">%</span></div>
                                              </div>
                                              <div className={`rounded-lg border p-3 text-center ${basic.oosThreshold ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">OOS Threshold</div>
                                                {basic.oosThreshold ? (
                                                  <div className="text-2xl font-black text-amber-700">≥{basic.oosThreshold}<span className="text-sm font-normal text-amber-500">%</span></div>
                                                ) : <div className="text-slate-400 font-bold">N/A</div>}
                                              </div>
                                              <div className="bg-white rounded-lg border border-blue-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CFR Parts</div>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                  {basic.cfrParts.map(p => (
                                                    <span key={p} className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono">49 CFR {p}</span>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="mt-3 text-xs text-slate-600 bg-white rounded-lg border border-blue-100 px-3 py-2">
                                              <span className="font-bold text-slate-700">BASIC Description:</span> {basic.description}
                                            </div>
                                            {allCfrs.length > 0 && (
                                              <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                                                <span className="font-bold text-slate-600">CFR References on this violation:</span>
                                                {allCfrs.map((c, i) => <span key={i} className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{c}</span>)}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}

                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Federal & State Regulations</h4>
                                      </div>
                                      <div className="divide-y divide-slate-100">
                                        {item.regulatoryCodes.usa.map((reg, idx) => {
                                          // Derive BASIC from this reg entry's CFR codes
                                          const regBasicKey = reg.cfr?.map(c => cfr_to_basic(c)).find(k => k != null) ?? null;
                                          const regBasic = regBasicKey ? FMCSA_BASIC_MAP[regBasicKey] : null;
                                          return (
                                          <div key={idx} className="p-6 hover:bg-slate-50 transition-colors group">
                                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                              <div className="md:w-64 shrink-0">
                                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${getAuthStyle(reg.authority)}`}>
                                                    {reg.authority.replace('_', ' ')}
                                                  </span>
                                                  {regBasic && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
                                                      BASIC: {regBasic.label}
                                                    </span>
                                                  )}
                                                </div>
                                                {regBasic && (
                                                  <div className="flex gap-1.5 mb-2">
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 uppercase">{regBasic.smsWeight}% SMS weight</span>
                                                    {regBasic.oosThreshold && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 uppercase">OOS ≥{regBasic.oosThreshold}%</span>}
                                                  </div>
                                                )}
                                                <div className="flex flex-col gap-1">
                                                  {reg.cfr && reg.cfr.length > 0 && reg.cfr.map(code => (
                                                    <div key={code} className="flex items-center gap-2 text-sm font-mono font-semibold text-slate-700">
                                                       <FileText size={14} className="text-slate-400"/>
                                                       {code}
                                                    </div>
                                                  ))}
                                                  {reg.statute && reg.statute.length > 0 && reg.statute.map(stat => (
                                                    <div key={stat} className="flex items-center gap-2 text-sm font-serif font-semibold text-slate-700 italic">
                                                       <Gavel size={14} className="text-slate-400"/>
                                                       {stat}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                              <div className="flex-1">
                                                <p className="text-sm text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                                                  {reg.description}
                                                </p>
                                                {regBasic && (
                                                  <p className="text-xs text-blue-600 mt-2 leading-relaxed">
                                                    <span className="font-bold">BASIC:</span> {regBasic.description}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    </div>
                                  )}

                                  {activeTab === 'canada' && (
                                    <div className="space-y-6">
                                      {/* CCMTA / NSC System Mapping Banner */}
                                      {(() => {
                                        const rawCode = item.canadaEnforcement?.ccmtaCode ?? '';
                                        const code = extractCcmtaNum(rawCode);
                                        if (!code) return null;

                                        // ── 2-char alpha conviction code ──
                                        if (isAlphaCcmtaCode(code)) {
                                          const alpha = CCMTA_ALPHA_CODE_MAP[code];
                                          if (!alpha) return null;
                                          const nscPts = item.canadaEnforcement?.points?.nsc ?? alpha.pointsTypical;
                                          const ptsCls = nscPts && nscPts >= 5 ? 'text-red-700' : nscPts && nscPts >= 3 ? 'text-amber-700' : 'text-slate-700';
                                          const riskBg = alpha.riskLevel === 'Critical' || alpha.riskLevel === 'High' ? 'bg-red-50 border-red-200' : alpha.riskLevel === 'Medium' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
                                          const riskText = alpha.riskLevel === 'Critical' || alpha.riskLevel === 'High' ? 'text-red-700' : alpha.riskLevel === 'Medium' ? 'text-amber-700' : 'text-slate-700';
                                          const fmcsaBasicKey = alpha.fmcsaBasic;
                                          const fmcsaEntry = fmcsaBasicKey ? FMCSA_BASIC_MAP[fmcsaBasicKey] : null;
                                          return (
                                            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
                                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-violet-600 text-white">CCMTA Conviction Mapping</span>
                                                <span className="font-mono text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">{code}</span>
                                                <span className="text-sm font-bold text-slate-700">{alpha.label}</span>
                                                {fmcsaEntry && (
                                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">FMCSA BASIC: {fmcsaEntry.label}</span>
                                                )}
                                              </div>
                                              <div className="grid md:grid-cols-4 gap-4">
                                                <div className="bg-white rounded-lg border border-violet-100 p-3 text-center">
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NSC Category</div>
                                                  <div className="text-sm font-bold text-slate-800">{alpha.nscCategoryLabel}</div>
                                                </div>
                                                <div className="bg-white rounded-lg border border-violet-100 p-3 text-center">
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NSC Section</div>
                                                  <div className="text-sm font-bold text-slate-800 font-mono">{alpha.nscSection ?? '—'}</div>
                                                </div>
                                                <div className={`rounded-lg border p-3 text-center ${riskBg}`}>
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Level</div>
                                                  <div className={`text-sm font-bold ${riskText}`}>{alpha.riskLevel}</div>
                                                </div>
                                                <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NSC Points</div>
                                                  {item.canadaEnforcement?.points?.nsc != null ? (
                                                    <div className={`text-2xl font-black ${ptsCls}`}>{item.canadaEnforcement.points.nsc}</div>
                                                  ) : alpha.pointsTypical ? (
                                                    <>
                                                      <div className={`text-2xl font-black ${ptsCls}`}>{alpha.pointsTypical}</div>
                                                      <div className="text-[9px] text-slate-400 italic mt-0.5">typical / indicative</div>
                                                    </>
                                                  ) : <div className="text-slate-400">—</div>}
                                                </div>
                                              </div>
                                              <div className="mt-3 text-xs text-slate-600 bg-white rounded-lg border border-violet-100 px-3 py-2">
                                                <span className="font-bold text-slate-700">Conviction description:</span> {alpha.description}
                                              </div>
                                            </div>
                                          );
                                        }

                                        // ── Numeric CVSA inspection code ──
                                        const sys = NSC_CODE_TO_SYSTEM[code];
                                        const cat = NSC_VIOLATION_CATALOG[code];
                                        if (!sys && !cat) return null;
                                        const pts = sys ? (sys.riskLevel === 'High' ? 3 : sys.riskLevel === 'Medium' ? 2 : 1) : null;
                                        const ptsCls = pts && pts >= 3 ? 'text-red-600' : pts === 2 ? 'text-amber-700' : 'text-slate-700';
                                        const riskBg = sys?.riskLevel === 'High' ? 'bg-red-50 border-red-200' : sys?.riskLevel === 'Medium' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200';
                                        const riskText = sys?.riskLevel === 'High' ? 'text-red-700' : sys?.riskLevel === 'Medium' ? 'text-amber-700' : 'text-slate-700';
                                        return (
                                          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white">NSC Inspection Mapping</span>
                                              <span className="font-mono text-sm font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">CCMTA {code}</span>
                                              {sys?.nscSection && <span className="text-[10px] text-indigo-600 font-mono">{sys.nscSection}</span>}
                                              {sys?.oosEligible && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 uppercase">OOS Eligible</span>}
                                            </div>
                                            <div className="grid md:grid-cols-4 gap-4">
                                              <div className="bg-white rounded-lg border border-emerald-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</div>
                                                <div className="text-sm font-bold text-slate-800">{sys?.categoryLabel ?? cat?.group ?? '—'}</div>
                                              </div>
                                              <div className="bg-white rounded-lg border border-emerald-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Violation Group</div>
                                                <div className="text-sm font-bold text-slate-800">{sys?.violationGroup ?? '—'}</div>
                                              </div>
                                              <div className={`rounded-lg border p-3 text-center ${riskBg}`}>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Risk Level</div>
                                                <div className={`text-sm font-bold ${riskText}`}>{sys?.riskLevel ?? '—'}</div>
                                                {cat?.severity && <div className={`text-[10px] font-bold mt-0.5 ${cat.severity === 'OOS' ? 'text-red-600' : cat.severity === 'Major' ? 'text-amber-700' : 'text-slate-500'}`}>{cat.severity}</div>}
                                              </div>
                                              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NSC Points</div>
                                                {item.canadaEnforcement?.points?.nsc != null ? (
                                                  <div className={`text-2xl font-black ${ptsCls}`}>{item.canadaEnforcement.points.nsc}</div>
                                                ) : pts !== null ? (
                                                  <>
                                                    <div className={`text-2xl font-black ${ptsCls}`}>{pts}</div>
                                                    <div className="text-[9px] text-slate-400 italic mt-0.5">derived from risk</div>
                                                  </>
                                                ) : <div className="text-slate-400">—</div>}
                                              </div>
                                            </div>
                                            {cat?.description && (
                                              <div className="mt-3 text-xs text-slate-600 bg-white rounded-lg border border-emerald-100 px-3 py-2">
                                                <span className="font-bold text-slate-700">NSC Description:</span> {cat.description}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}

                                      {/* CVOR Conviction Mapping Banner */}
                                      {item.canadaEnforcement?.cvorClassification && (() => {
                                        const cvor = item.canadaEnforcement!;
                                        const cvorPts = cvor.points?.cvor;
                                        const convType = cvor.cvorClassification!.convictionType;
                                        const altGroup = cvor.cvorClassification!.alternativeGroup;
                                        const ptsMax = cvorPts?.max ?? 0;
                                        const ptsCls = ptsMax >= 5 ? 'text-red-700' : ptsMax >= 3 ? 'text-amber-700' : 'text-slate-700';
                                        const ptsBarWidth = Math.min((ptsMax / 10) * 100, 100);
                                        return (
                                          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
                                            <div className="flex items-center gap-2 mb-3 flex-wrap">
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white">CVOR Conviction Mapping</span>
                                              <span className="text-sm font-bold text-slate-700">Commercial Vehicle Operator Record</span>
                                              {cvorPts?.raw && (
                                                <span className="font-mono text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">{cvorPts.raw}</span>
                                              )}
                                            </div>
                                            <div className="grid md:grid-cols-4 gap-4">
                                              <div className="bg-white rounded-lg border border-rose-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVOR Points</div>
                                                {cvorPts != null ? (
                                                  <>
                                                    <div className={`text-2xl font-black ${ptsCls}`}>
                                                      {cvorPts.min === cvorPts.max ? cvorPts.min : `${cvorPts.min}–${cvorPts.max}`}
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                                                      <div className={`h-full rounded-full ${ptsMax >= 5 ? 'bg-red-500' : ptsMax >= 3 ? 'bg-amber-500' : 'bg-slate-400'}`} style={{width:`${ptsBarWidth}%`}}/>
                                                    </div>
                                                    {cvorPts.min !== cvorPts.max && <div className="text-[9px] text-slate-400 italic mt-0.5">min – max range</div>}
                                                  </>
                                                ) : <div className="text-slate-400">—</div>}
                                              </div>
                                              <div className="bg-white rounded-lg border border-rose-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Conviction Type</div>
                                                <div className="text-sm font-bold text-rose-800">{convType || '—'}</div>
                                              </div>
                                              <div className="bg-white rounded-lg border border-rose-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alternative Group</div>
                                                <div className="text-sm font-bold text-slate-700">{altGroup || '—'}</div>
                                              </div>
                                              <div className="bg-white rounded-lg border border-rose-100 p-3 text-center">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">CVOR Code</div>
                                                <div className="text-sm font-mono font-bold text-slate-700">{cvor.code || '—'}</div>
                                                {cvor.ccmtaCode && <div className="text-[9px] text-violet-600 font-mono mt-0.5">CCMTA: {cvor.ccmtaCode}</div>}
                                              </div>
                                            </div>
                                            {cvor.descriptions?.conviction && (
                                              <div className="mt-3 text-xs text-slate-600 bg-white rounded-lg border border-rose-100 px-3 py-2">
                                                <span className="font-bold text-slate-700">Conviction form:</span> {cvor.descriptions.conviction}
                                              </div>
                                            )}
                                            {cvor.descriptions?.shortForm52 && (
                                              <div className="mt-2 text-xs text-slate-500 bg-white rounded-lg border border-rose-100 px-3 py-2">
                                                <span className="font-bold text-slate-600">Short form (s.52):</span> {cvor.descriptions.shortForm52}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}

                                      <div className="grid md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1 bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                                          {(() => {
                                            const nscRaw = item.canadaEnforcement?.points?.nsc;
                                            const num = extractCcmtaNum(item.canadaEnforcement?.ccmtaCode);
                                            const derived = getNscDerivedPoints(num);
                                            const pts = nscRaw ?? derived;
                                            const ptsCls = pts && pts >= 5 ? 'text-red-700' : pts && pts >= 3 ? 'text-amber-700' : 'text-emerald-700';
                                            return (
                                              <>
                                                <div className={`text-4xl font-bold mb-1 ${ptsCls}`}>{pts ?? '—'}</div>
                                                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">NSC Points</div>
                                                <div className="text-[10px] text-emerald-600 mt-2">
                                                  {nscRaw != null ? 'From enforcement data' : derived !== null ? 'Derived from risk level' : 'National Safety Code Standard'}
                                                </div>
                                                {item.canadaEnforcement?.points?.cvor && (
                                                  <div className="mt-3 pt-3 border-t border-emerald-200 w-full text-center">
                                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">CVOR Points</div>
                                                    <div className="text-lg font-bold text-slate-700">
                                                      {item.canadaEnforcement.points.cvor.min === item.canadaEnforcement.points.cvor.max
                                                        ? item.canadaEnforcement.points.cvor.min
                                                        : `${item.canadaEnforcement.points.cvor.min}–${item.canadaEnforcement.points.cvor.max}`}
                                                    </div>
                                                  </div>
                                                )}
                                              </>
                                            );
                                          })()}
                                        </div>

                                        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                          {item.canadaEnforcement && item.canadaEnforcement.act ? (
                                            <>
                                              <div className="flex items-center gap-2 mb-2">
                                                <Globe className="text-indigo-500 w-4 h-4" />
                                                <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                  Enforcement: {item.canadaEnforcement.act} ({item.canadaEnforcement.section})
                                                </h5>
                                              </div>
                                              <p className="text-lg text-slate-800 font-medium">
                                                &ldquo;{item.canadaEnforcement.descriptions.full}&rdquo;
                                              </p>
                                              <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                                  Code: {item.canadaEnforcement?.code}
                                                </span>
                                                <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded border border-purple-200 font-mono font-bold">
                                                  CCMTA: {item.canadaEnforcement?.ccmtaCode}
                                                </span>
                                                {item.canadaEnforcement.cvorClassification?.convictionType && (
                                                  <span className="text-xs bg-rose-50 text-rose-700 px-2 py-1 rounded border border-rose-200">
                                                    CVOR: {item.canadaEnforcement.cvorClassification.convictionType}
                                                  </span>
                                                )}
                                              </div>
                                              {item.canadaEnforcement.descriptions?.conviction && (
                                                <div className="mt-3 text-xs text-slate-500 italic border-t border-slate-100 pt-3">
                                                  Conviction form: {item.canadaEnforcement.descriptions.conviction}
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <div className="text-slate-500 italic text-center py-4">
                                              No specific provincial enforcement mapping available for this violation.
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                            <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Provincial & Criminal References</h4>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {(item.regulatoryCodes.canada || []).map((reg, idx) => (
                                            <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                                                <div className="flex flex-col md:flex-row md:items-start gap-4">
                                                <div className="md:w-56 shrink-0">
                                                    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-2 ${getAuthStyle(reg.authority)}`}>
                                                    {reg.authority.replace('_', ' ')}
                                                    </span>
                                                    {reg.province && (
                                                      <span className="ml-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                                        {reg.province.join(', ')}
                                                      </span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="mb-2">
                                                        {reg.reference.map(ref => (
                                                            <div key={ref} className="text-sm font-mono font-semibold text-slate-800 flex items-center gap-2 mb-1">
                                                                <Scale size={14} className="text-slate-400"/>
                                                                {ref}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-sm text-slate-600 leading-relaxed">
                                                    {reg.description}
                                                    </p>
                                                </div>
                                                </div>
                                            </div>
                                            ))}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                               </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-t border-slate-200 bg-slate-50/80 rounded-b-xl">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-slate-300 rounded px-2 py-1 text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  {ROWS_PER_PAGE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                <span className="text-slate-400">|</span>
                <span className="tabular-nums font-medium text-slate-700">
                  {Math.min((currentPage - 1) * rowsPerPage + 1, filteredItems.length).toLocaleString()}–{Math.min(currentPage * rowsPerPage, filteredItems.length).toLocaleString()} of {filteredItems.length.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="First"><ChevronLeft size={13} /><ChevronLeft size={13} className="-ml-2" /></button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Previous"><ChevronLeft size={13} /></button>
                <span className="px-2.5 py-1 text-xs font-bold text-slate-700 tabular-nums">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Next"><ChevronRight size={13} /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="inline-flex items-center justify-center w-7 h-7 rounded border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors" title="Last"><ChevronRight size={13} /><ChevronRight size={13} className="-ml-2" /></button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ViolationsPage;
