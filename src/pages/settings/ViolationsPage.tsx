import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
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
  Edit2
} from 'lucide-react';
import { VIOLATION_DATA } from '@/data/violations.data';

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Tab Configuration
const TABS_CONFIG = [
  { key: 'all', label: 'All Violations' },
  { key: 'vehicle_maintenance', label: 'Vehicle Maintenance' },
  { key: 'unsafe_driving', label: 'Unsafe Driving' },
  { key: 'hours_of_service', label: 'Hours-of-service Compliance' },
  { key: 'driver_fitness', label: 'Driver Fitness' },
  { key: 'hazmat_compliance', label: 'Hazmat compliance' },
  { key: 'controlled_substances_alcohol', label: 'Controlled Substances' },
  { key: 'other', label: 'Other' }
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

export function ViolationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('impact');
  
  // State for Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // State for Filters
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]); // Empty array = ALL
  
  // Active Category State
  const [activeCategory, setActiveCategory] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);

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

  // Deep search: build a flat searchable string for each item (all nested fields)
  const buildSearchableText = (item: typeof currentCategoryData.items[0]): string => {
    const parts: string[] = [
      item.violationCode,
      item.violationDescription,
      item.violationGroup,
      item.id,
      item.isOos ? 'oos out-of-service' : '',
      item.inDsms ? 'dsms' : '',
      `risk ${item.driverRiskCategory}`,
      // USA regulatory
      ...(item.regulatoryCodes?.usa?.flatMap(r => [
        r.authority,
        r.description,
        ...(r.cfr || []),
        ...(r.statute || []),
      ]) || []),
      // Canada regulatory
      ...(item.regulatoryCodes?.canada?.flatMap(r => [
        r.authority,
        r.description,
        ...(r.reference || []),
        ...(r.province || []),
      ]) || []),
      // Canada enforcement
      item.canadaEnforcement?.act || '',
      item.canadaEnforcement?.section || '',
      item.canadaEnforcement?.code || '',
      item.canadaEnforcement?.ccmtaCode || '',
      item.canadaEnforcement?.descriptions?.full || '',
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
        // Support multi-word search: every word must match somewhere
        const words = term.split(/\s+/).filter(Boolean);
        const matchesSearch = words.every(word => text.includes(word));
        if (!matchesSearch) return false;
      }
      
      // Multi-select Risk Filter
      if (selectedRisks.length > 0) {
        if (!selectedRisks.includes(String(item.driverRiskCategory))) return false;
      }
      
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
          case 'status': aVal = a.inDsms ? 1 : 0; bVal = b.inDsms ? 1 : 0; break;
          default: return 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [currentCategoryData, searchTerm, selectedRisks, sortConfig, searchableMap]);

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

  const getRiskColor = (level: number) => {
    switch (String(level)) {
      case '1': return { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-800', border: 'border-red-200' };
      case '2': return { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800', border: 'border-orange-200' };
      case '3': return { bg: 'bg-blue-50', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800', border: 'border-blue-200' };
      default: return { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800', border: 'border-gray-200' };
    }
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

  const getRiskCardClass = (level: string, baseColor: string) => {
    const isActive = selectedRisks.includes(level);
    let classes = "border rounded-lg p-4 shadow-sm cursor-pointer transition-all duration-200 relative overflow-hidden group ";
    
    if (isActive) {
      if (baseColor === 'red') classes += "bg-red-50 border-red-200 ring-2 ring-red-500 ring-offset-2";
      else if (baseColor === 'amber') classes += "bg-amber-50 border-amber-200 ring-2 ring-amber-500 ring-offset-2";
      else if (baseColor === 'emerald') classes += "bg-emerald-50 border-emerald-200 ring-2 ring-emerald-500 ring-offset-2";
    } else {
      classes += "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md opacity-80 hover:opacity-100";
      if (selectedRisks.length > 0) classes += " opacity-60"; 
    }
    return classes;
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
    <div className="min-h-screen bg-white font-sans text-slate-800 pb-12">
      {/* Violations Risk Matrix Header Section */}
      <div className="max-w-[1400px] mx-auto px-4 pt-6 pb-2">
        <div className="flex flex-col gap-6">
          
          {/* Breadcrumbs & Title */}
          <div>
            <div className="text-xs font-medium text-slate-500 mb-1">
              Settings <span className="mx-1">/</span> <span className="text-slate-700">Violations</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Violations Risk Matrix
            </h1>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <p className="text-sm text-slate-500 max-w-3xl">
                Risk configuration grouped by violation category. Each violation has a severity weight, a crash likelihood percentage, and a driver risk category (probability to cause crash in next 12 months).
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded flex items-center gap-2 transition-colors">
                <Plus size={16} /> ADD VIOLATION
              </button>
            </div>
          </div>

          {/* Risk Summary Cards (Interactive Multi-Select Filters) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* High Risk Card */}
            <div 
              className={getRiskCardClass('1', 'red')}
              onClick={() => handleRiskCardClick('1')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="inline-block bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded border border-red-100 uppercase tracking-wide">
                  <AlertTriangle size={12} className="inline mr-1" /> High Risk
                </span>
                {selectedRisks.includes('1') && <div className="bg-red-100 text-red-600 rounded-full p-1"><X size={12} /></div>}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                Highest crash probability — requires urgent action, coaching, or restriction.
              </p>
            </div>

            {/* Moderate Risk Card */}
            <div 
              className={getRiskCardClass('2', 'amber')}
              onClick={() => handleRiskCardClick('2')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="inline-block bg-amber-50 text-amber-600 text-xs font-bold px-2 py-1 rounded border border-amber-100 uppercase tracking-wide">
                  Moderate Risk
                </span>
                {selectedRisks.includes('2') && <div className="bg-amber-100 text-amber-600 rounded-full p-1"><X size={12} /></div>}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                Elevated risk — requires monitoring and corrective training.
              </p>
            </div>

            {/* Lower Risk Card */}
            <div 
              className={getRiskCardClass('3', 'emerald')}
              onClick={() => handleRiskCardClick('3')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="inline-block bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded border border-emerald-100 uppercase tracking-wide">
                  Lower Risk
                </span>
                {selectedRisks.includes('3') && <div className="bg-emerald-100 text-emerald-600 rounded-full p-1"><X size={12} /></div>}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-700 transition-colors">
                Mostly compliance/maintenance-related or lower crash correlation (still important).
              </p>
            </div>

          </div>

          {/* Tabs Navigation */}
          <div className="mt-4 border-b border-slate-200">
            <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
              {TABS_CONFIG.map((tab) => {
                const isActiveTab = activeCategory === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveCategory(tab.key)}
                    className={`
                      whitespace-nowrap pb-3 border-b-2 font-medium text-sm transition-colors
                      ${isActiveTab 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                    `}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Deep search — code, description, CFR, authority, province..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Main Table Content */}
      <main className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 select-none">
                <tr>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-32 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('code')}
                  >
                    <div className="flex items-center gap-1">Code {getSortIcon('code')}</div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[200px] cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('desc')}
                  >
                    <div className="flex items-center gap-1">Description {getSortIcon('desc')}</div>
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[120px]">
                    Regulatory
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[120px] cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('group')}
                  >
                    <div className="flex items-center gap-1">Group {getSortIcon('group')}</div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('risk')}
                  >
                    <div className="flex items-center justify-center gap-1">Risk {getSortIcon('risk')}</div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('sev')}
                  >
                    <div className="flex items-center justify-center gap-1">Sev (D/C) {getSortIcon('sev')}</div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-24 cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => requestSort('crash')}
                  >
                    <div className="flex items-center justify-center gap-1">Crash % {getSortIcon('crash')}</div>
                  </th>

                  <th scope="col" className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-20">
                    Actions
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider w-10">
                    
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Search className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                      <h3 className="text-slate-900 font-medium">No violations found in this category</h3>
                      <p className="text-slate-500 text-sm mt-1">Try switching categories or adjusting filters.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => {
                    const styles = getRiskColor(item.driverRiskCategory);
                    const isExpanded = expandedId === item.id;
                    
                    const authorities = Array.from(new Set([
                        ...item.regulatoryCodes.usa.map(r => r.authority),
                        ...item.regulatoryCodes.canada.map(r => r.authority)
                    ])).slice(0, 3);
                    
                    return (
                      <React.Fragment key={item.id}>
                        <tr 
                          className={`group hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
                          onClick={() => toggleRow(item.id)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">
                              {item.violationCode}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-slate-900 leading-tight">
                              { normalizeText(item.violationDescription)}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {authorities.map(auth => (
                                  <span key={auth} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getAuthStyle(auth)}`}>
                                      {auth.replace('_', ' ')}
                                  </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                             <span className="text-xs text-slate-600 font-medium">{item.violationGroup}</span>
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap text-center">
                             <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles.badge} border-transparent uppercase tracking-wide`}>
                               {data.riskCategories[String(item.driverRiskCategory)]?.label || `Risk ${item.driverRiskCategory}`}
                             </span>
                          </td>

                          {/* Simplified Severity (No Charts) */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="text-xs font-mono text-slate-600">
                                <span className="font-bold text-slate-800">{item.severityWeight.driver}</span>
                                <span className="mx-1 text-slate-300">/</span>
                                <span className="font-bold text-slate-800">{item.severityWeight.carrier}</span>
                            </div>
                          </td>

                          {/* Simplified Crash Probability (No Charts) */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <span className={`text-xs font-bold ${(item.crashLikelihoodPercent ?? 0) > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                                {item.crashLikelihoodPercent ? `${item.crashLikelihoodPercent}%` : '-'}
                            </span>
                          </td>



                          {/* Actions Column */}
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); console.log('Edit violation:', item.id); }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Edit violation"
                            >
                              <Edit2 size={14} />
                            </button>
                          </td>

                          {/* Expand Trigger Column */}
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end">
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </td>
                        </tr>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0 border-t border-slate-100 bg-slate-50/50">
                               <div className="px-6 py-6 animate-in slide-in-from-top-2 duration-200">
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
                                  {activeTab === 'impact' && (
                                    <div className="grid md:grid-cols-2 gap-8">
                                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">
                                            Risk & Liability Profile
                                        </h4>
                                        <div className="space-y-6">
                                          <div>
                                            <div className="flex justify-between text-sm mb-2">
                                              <span className="text-slate-600 font-medium">Crash Probability Correlation</span>
                                              <span className={`font-bold ${(item.crashLikelihoodPercent ?? 0) > 100 ? 'text-red-600' : 'text-slate-800'}`}>{item.crashLikelihoodPercent ?? 0}%</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                              <div className={`h-full rounded-full ${(item.crashLikelihoodPercent ?? 0) > 100 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-indigo-500'}`} style={{width: `${Math.min(item.crashLikelihoodPercent ?? 0, 100)}%`}}></div>
                                            </div>
                                            {(item.crashLikelihoodPercent ?? 0) > 100 && <p className="text-xs text-red-600 mt-2 font-medium flex items-center gap-1"><AlertTriangle size={12}/> Extreme crash correlation detected.</p>}
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Driver Severity</div>
                                              <div className="flex items-center gap-2">
                                                 <span className="text-2xl font-bold text-slate-800">{item.severityWeight.driver}</span>
                                                 <span className="text-xs text-slate-400">/ 10</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
                                                 <div className="h-full bg-indigo-500 rounded-full" style={{width: `${(item.severityWeight.driver/10)*100}%`}}></div>
                                              </div>
                                            </div>
                                            
                                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Carrier Severity</div>
                                              <div className="flex items-center gap-2">
                                                 <span className="text-2xl font-bold text-slate-800">{item.severityWeight.carrier}</span>
                                                 <span className="text-xs text-slate-400">/ 10</span>
                                              </div>
                                              <div className="h-1.5 w-full bg-slate-200 rounded-full mt-2 overflow-hidden">
                                                 <div className="h-full bg-slate-500 rounded-full" style={{width: `${(item.severityWeight.carrier/10)*100}%`}}></div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
                                        <div className="flex items-start gap-4">
                                          <div className="p-3 bg-indigo-50 rounded-lg shrink-0">
                                            <Info className="text-indigo-600 w-6 h-6" />
                                          </div>
                                          <div>
                                            <h5 className="font-bold text-slate-900 text-base">Violation Analysis</h5>
                                            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                                              This violation is categorized under <span className="font-semibold text-slate-800">{item.violationGroup}</span>. 
                                              Current enforcement data indicates this infraction {item.inDsms ? 'is actively monitored in DSMS' : 'is not currently in DSMS'}.
                                            </p>
                                            <div className={`mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold ${item.isOos ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                                {item.isOos ? <AlertOctagon size={14}/> : <ShieldAlert size={14}/>}
                                                {item.isOos ? 'Triggers Immediate Out-of-Service Order' : 'Does Not Trigger Immediate OOS'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {activeTab === 'usa' && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Federal & State Regulations</h4>
                                      </div>
                                      <div className="divide-y divide-slate-100">
                                        {item.regulatoryCodes.usa.map((reg, idx) => (
                                          <div key={idx} className="p-6 hover:bg-slate-50 transition-colors group">
                                            <div className="flex flex-col md:flex-row md:items-start gap-4">
                                              <div className="md:w-56 shrink-0">
                                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mb-2 ${getAuthStyle(reg.authority)}`}>
                                                  {reg.authority.replace('_', ' ')}
                                                </span>
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
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {activeTab === 'canada' && (
                                    <div className="space-y-6">
                                      <div className="grid md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1 bg-emerald-50 border border-emerald-100 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                                          <div className="text-4xl font-bold text-emerald-700 mb-1">{item.canadaEnforcement.points.nsc}</div>
                                          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">NSC Points</div>
                                          <div className="text-[10px] text-emerald-600 mt-2">National Safety Code Standard</div>
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
                                              <div className="mt-2 flex gap-2">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                                  Code: {item.canadaEnforcement.code}
                                                </span>
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                                                  CCMTA: {item.canadaEnforcement.ccmtaCode}
                                                </span>
                                              </div>
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
                                            {item.regulatoryCodes.canada.map((reg, idx) => (
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              {/* Rows per page */}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  {ROWS_PER_PAGE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Page info & controls */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                  {Math.min((currentPage - 1) * rowsPerPage + 1, filteredItems.length)}–{Math.min(currentPage * rowsPerPage, filteredItems.length)} of {filteredItems.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 py-1 text-sm font-medium text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ViolationsPage;
