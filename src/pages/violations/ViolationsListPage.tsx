import React, { useState, useMemo } from 'react';
import {
  Search, Download, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, LayoutGrid, FileWarning, Ban, Clock,
  DollarSign, MapPin, Activity, ChevronDown, ChevronUp,
  X, Users, Truck, List,
} from 'lucide-react';
import { MOCK_VIOLATION_RECORDS, getViolation, ALL_VIOLATIONS } from './violations-list.data';
import { violationDetailsData, parseCcmtaCode, NSC_VIOLATION_CATALOG } from '../inspections/NscAnalysis';
import { NSC_CODE_TO_SYSTEM } from '../inspections/nscInspectionsData';
import { inspectionsData } from '../inspections/inspectionsData';
import { MOCK_ASSET_VIOLATION_RECORDS, getAssetViolationDef } from './asset-violations.data';
import { ViolationEditForm } from './ViolationEditForm';

// ─── cn helper ────────────────────────────────────────────────────────────────
const cn = (...classes: (string | boolean | undefined | null)[]) =>
  classes.filter(Boolean).join(' ');

// ─── UnifiedViolation Interface ───────────────────────────────────────────────
interface UnifiedViolation {
  id: string;
  source: 'SMS' | 'NSC' | 'CVOR';
  date: string;
  time: string;
  driverName: string;
  driverId: string;
  vehicleUnit: string;
  vehiclePlate: string;
  code: string;
  description: string;
  category: string;
  group: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  crashLikelihoodPercent: number;
  maintenanceProbability: number;
  isOos: boolean;
  driverPts: number;
  assetPts: number;
  carrierPts: number;
  severity: string;
  fineAmount: number;
  expenseAmount: number;
  currency: 'USD' | 'CAD';
  result: string;
  status: 'Open' | 'Closed' | 'Under Review';
  location: string;
  locationState: string;
  locationCountry: string;
  inspectionId: string;
  regulatoryRef: string;
  notes: string;
}

// ─── Build SMS violations ─────────────────────────────────────────────────────
const smsViolations: UnifiedViolation[] = MOCK_VIOLATION_RECORDS.map(record => {
  const def = getViolation(record.violationDataId);
  const rl: 'High' | 'Medium' | 'Low' =
    record.driverRiskCategory === 1 ? 'High' :
    record.driverRiskCategory === 2 ? 'Medium' : 'Low';
  const cl = Math.min(record.crashLikelihood, 100);
  return {
    id: record.id,
    source: 'SMS',
    date: record.date,
    time: record.time,
    driverName: record.driverName,
    driverId: record.driverId,
    vehicleUnit: record.assetName || '—',
    vehiclePlate: '—',
    code: record.violationCode,
    description: record.violationType,
    category: record.violationGroup,
    group: record.violationGroup,
    riskLevel: rl,
    crashLikelihoodPercent: cl,
    maintenanceProbability: Math.round(cl * 0.45),
    isOos: record.isOos,
    driverPts: def?.severityWeight?.driver ?? 0,
    assetPts: 0,
    carrierPts: def?.severityWeight?.carrier ?? 0,
    severity: record.isOos ? 'OOS' :
      record.driverRiskCategory === 1 ? 'Critical' :
      record.driverRiskCategory === 2 ? 'Serious' : 'Moderate',
    fineAmount: record.fineAmount,
    expenseAmount: record.expenseAmount ?? 0,
    currency: record.currency,
    result: record.result,
    status: record.status,
    location: [record.locationCity, record.locationState].filter(Boolean).join(', ') || record.locationState,
    locationState: record.locationState,
    locationCountry: record.locationCountry || 'US',
    inspectionId: record.inspectionId || '',
    regulatoryRef: record.violationCode,
    notes: '',
  };
});

// ─── Build NSC violations ─────────────────────────────────────────────────────
const NSC_DRIVER_CATS = new Set(['driver_fitness', 'hours_of_service', 'unsafe_driving']);

const nscViolations: UnifiedViolation[] = violationDetailsData.map(v => {
  const numCode = parseCcmtaCode(v.ccmtaCode);
  const catalog = NSC_VIOLATION_CATALOG[numCode];
  const sys = NSC_CODE_TO_SYSTEM[numCode];
  const sev = v.severity ?? catalog?.severity ?? 'Minor';
  const rl: 'High' | 'Medium' | 'Low' =
    sys?.riskLevel === 'High' ? 'High' :
    sys?.riskLevel === 'Medium' ? 'Medium' : 'Low';
  const pts = rl === 'High' ? 3 : rl === 'Medium' ? 2 : 1;
  const isDriverCat = sys ? NSC_DRIVER_CATS.has(sys.category) : false;

  return {
    id: `NSC-${v.id}`,
    source: 'NSC',
    date: v.date,
    time: v.time || '00:00',
    driverName: v.driver,
    driverId: '',
    vehicleUnit: v.vehicle,
    vehiclePlate: v.commodity,
    code: numCode || v.ccmtaCode,
    description: catalog?.description ?? v.description,
    category: sys?.categoryLabel ?? v.actSection ?? 'NSC Violation',
    group: sys?.violationGroup ?? catalog?.group ?? 'NSC',
    riskLevel: rl,
    crashLikelihoodPercent: rl === 'High' ? 75 : rl === 'Medium' ? 45 : 20,
    maintenanceProbability:
      sys?.category === 'vehicle_maintenance'
        ? rl === 'High' ? 70 : rl === 'Medium' ? 45 : 25
        : 15,
    isOos: sev === 'OOS',
    driverPts: isDriverCat ? pts : 0,
    assetPts: !isDriverCat ? pts : 0,
    carrierPts: pts,
    severity: sev,
    fineAmount: 0,
    expenseAmount: 0,
    currency: 'CAD',
    result: sev === 'OOS' ? 'OOS Order' : 'Citation Issued',
    status: 'Closed',
    location: v.location,
    locationState: v.jurisdiction,
    locationCountry: 'CA',
    inspectionId: v.document,
    regulatoryRef: v.actSection,
    notes: v.text || '',
  };
});

// ─── Build CVOR violations ────────────────────────────────────────────────────
const CVOR_DRIVER_CATS = new Set(['Unsafe Driving', 'Hours of Service', 'Driver Fitness', 'Controlled Substances']);

const cvorViolations: UnifiedViolation[] = inspectionsData
  .filter((r: any) => r.state === 'ON' && !r.isClean)
  .flatMap((insp: any) => {
    const locRaw = insp.location;
    const locStr = locRaw
      ? typeof locRaw === 'object'
        ? `${locRaw.city}, ${locRaw.province}`
        : locRaw
      : insp.state;

    const plate = insp.units?.[0]?.license || insp.vehiclePlate || '—';

    return (insp.violations ?? []).map((v: any) => {
      const rl: 'High' | 'Medium' | 'Low' =
        (v.driverRiskCategory === 1 || (v.crashLikelihoodPercent ?? 0) >= 65) ? 'High' :
        (v.driverRiskCategory === 2 || (v.crashLikelihoodPercent ?? 0) >= 35) ? 'Medium' : 'Low';
      const cl = v.crashLikelihoodPercent ??
        (v.driverRiskCategory === 1 ? 82 : v.driverRiskCategory === 2 ? 52 : 22);
      const isDrv = CVOR_DRIVER_CATS.has(v.category);
      const sev =
        typeof v.severity === 'number'
          ? v.severity >= 5 ? 'Critical' : v.severity >= 3 ? 'Serious' : 'Moderate'
          : v.oos ? 'OOS' : 'Moderate';

      return {
        id: `CVOR-${insp.id}-${v.code.replace(/[^a-zA-Z0-9]/g, '_')}`,
        source: 'CVOR' as const,
        date: insp.date,
        time: insp.startTime || '00:00',
        driverName: insp.driver?.split(',')[0] ?? '—',
        driverId: insp.driverId ?? '',
        vehicleUnit: plate,
        vehiclePlate: plate,
        code: v.code,
        description: v.description,
        category: v.category,
        group: v.subDescription || v.category,
        riskLevel: rl,
        crashLikelihoodPercent: Math.min(cl, 100),
        maintenanceProbability: !isDrv
          ? (rl === 'High' ? 68 : rl === 'Medium' ? 42 : 22)
          : 12,
        isOos: !!v.oos,
        driverPts: isDrv ? (v.points ?? 0) : 0,
        assetPts: !isDrv ? (v.points ?? 0) : 0,
        carrierPts: v.points ?? 0,
        severity: sev,
        fineAmount: 0,
        expenseAmount: 0,
        currency: 'CAD' as const,
        result: v.oos ? 'OOS Order' : 'Citation Issued',
        status: 'Closed' as const,
        location: locStr,
        locationState: insp.state,
        locationCountry: 'CA',
        inspectionId: insp.id,
        regulatoryRef: v.code,
        notes: '',
      } as UnifiedViolation;
    });
  });

// ─── Build Asset violations ───────────────────────────────────────────────────
const assetUnifiedViolations: UnifiedViolation[] = MOCK_ASSET_VIOLATION_RECORDS.map(record => {
  const def = getAssetViolationDef(record.violationDefId);
  const rl: 'High' | 'Medium' | 'Low' =
    record.crashLikelihoodPercent >= 65 ? 'High' :
    record.crashLikelihoodPercent >= 35 ? 'Medium' : 'Low';
  return {
    id: `ASSET-${record.id}`,
    source: 'SMS' as const,
    date: record.date,
    time: record.time,
    driverName: record.linkedDriverName || '—',
    driverId: record.linkedDriverId || '',
    vehicleUnit: record.assetUnitNumber,
    vehiclePlate: record.assetPlate,
    code: record.violationCode,
    description: def?.description ?? record.violationType,
    category: record.violationCategory,
    group: record.violationCategory,
    riskLevel: rl,
    crashLikelihoodPercent: record.crashLikelihoodPercent,
    maintenanceProbability: rl === 'High' ? 72 : rl === 'Medium' ? 45 : 20,
    isOos: record.isOos,
    driverPts: 0,
    assetPts: record.severity === 'Critical' ? 3 : record.severity === 'Serious' ? 2 : 1,
    carrierPts: record.severity === 'Critical' ? 3 : record.severity === 'Serious' ? 2 : 1,
    severity: record.severity,
    fineAmount: record.fineAmount,
    expenseAmount: record.expenseAmount,
    currency: record.currency,
    result: record.result,
    status: record.status,
    location: [record.locationCity, record.locationState].filter(Boolean).join(', ') || record.locationState,
    locationState: record.locationState,
    locationCountry: record.locationCountry || 'US',
    inspectionId: record.inspectionId || '',
    regulatoryRef: `49 CFR §${record.violationCode}`,
    notes: record.notes || '',
  };
});

// ─── Combined dataset ─────────────────────────────────────────────────────────
const ALL_UNIFIED: UnifiedViolation[] = [
  ...smsViolations,
  ...nscViolations,
  ...cvorViolations,
].sort((a, b) => (a.date < b.date ? 1 : -1));

const ALL_ASSET_UNIFIED: UnifiedViolation[] = [
  ...assetUnifiedViolations,
  ...nscViolations.filter(v => v.assetPts > 0),
  ...cvorViolations.filter(v => v.assetPts > 0),
].sort((a, b) => (a.date < b.date ? 1 : -1));

const ALL_DRIVER_UNIFIED: UnifiedViolation[] = ALL_UNIFIED.filter(v => v.driverPts > 0 || v.source === 'SMS');

// ─── Formatting helpers ───────────────────────────────────────────────────────
const fmt = (n: number, cur: string) =>
  `${cur === 'CAD' ? 'CA$' : '$'}${n.toLocaleString()}`;

const fmtDate = (d: string) => {
  if (!d) return '—';
  const parts = d.split(' ');
  if (parts.length === 3) {
    const months: Record<string, string> = {
      JAN:'Jan',FEB:'Feb',MAR:'Mar',APR:'Apr',MAY:'May',JUN:'Jun',
      JUL:'Jul',AUG:'Aug',SEP:'Sep',OCT:'Oct',NOV:'Nov',DEC:'Dec',
    };
    return `${parts[0]} ${months[parts[1]] || parts[1]} ${parts[2]}`;
  }
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: '2-digit' });
};

// ─── Badge helpers ────────────────────────────────────────────────────────────
const SOURCE_BADGE: Record<string, string> = {
  SMS:  'bg-blue-100 text-blue-700 border border-blue-200',
  NSC:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
  CVOR: 'bg-rose-100 text-rose-700 border border-rose-200',
};
const RISK_BADGE: Record<string, string> = {
  High:   'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low:    'bg-slate-100 text-slate-600 border border-slate-200',
};
const RESULT_BADGE: Record<string, string> = {
  'OOS Order':       'bg-red-100 text-red-700 border border-red-200',
  'Citation Issued': 'bg-amber-100 text-amber-700 border border-amber-200',
  'Warning':         'bg-yellow-100 text-yellow-700 border border-yellow-200',
  'Clean Inspection':'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'Under Review':    'bg-blue-100 text-blue-700 border border-blue-200',
};
const STATUS_BADGE: Record<string, string> = {
  Open:           'bg-orange-100 text-orange-700 border border-orange-200',
  Closed:         'bg-slate-100 text-slate-600 border border-slate-200',
  'Under Review': 'bg-blue-100 text-blue-700 border border-blue-200',
};

const Badge = ({ label, cls }: { label: string; cls: string }) => (
  <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', cls)}>
    {label}
  </span>
);

// ─── Crash Likelihood Mini Bar ────────────────────────────────────────────────
const CrashBar = ({ pct }: { pct: number }) => {
  const color =
    pct >= 65 ? 'bg-red-500' :
    pct >= 40 ? 'bg-amber-400' :
    'bg-blue-400';
  return (
    <div className="flex items-center gap-1.5 min-w-[70px]">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-600 tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
};

// ─── Regulatory Reference formatter ──────────────────────────────────────────
function fmtRegulatoryRef(v: UnifiedViolation): string {
  if (v.source === 'NSC') {
    const ref = v.regulatoryRef || v.code;
    return ref.startsWith('NSC') || ref.startsWith('Sch') ? ref : `NSC Act / ${ref}`;
  }
  if (v.source === 'CVOR') {
    return `HTA / CVOR — ${v.regulatoryRef || v.code}`;
  }
  // SMS / asset
  const ref = v.regulatoryRef || v.code;
  if (ref.startsWith('49 CFR') || ref.startsWith('CFR')) return ref;
  return `49 CFR §${ref}`;
}

// ─── Lookup regulatory codes from VIOLATION_DATA master chart ────────────────
function lookupRegulatoryCodes(v: UnifiedViolation) {
  const codeNorm = v.code.replace(/[^a-zA-Z0-9.()]/g, '').toLowerCase();
  const match = ALL_VIOLATIONS.find(item => {
    const itemNorm = item.violationCode.replace(/[^a-zA-Z0-9.()]/g, '').toLowerCase();
    return itemNorm === codeNorm;
  });
  return match?.regulatoryCodes ?? null;
}

// ─── Regulatory Codes Section (cross-jurisdictional) ─────────────────────────
const RegulatoryCodesSection = ({ v }: { v: UnifiedViolation }) => {
  const codes = lookupRegulatoryCodes(v);
  if (!codes) return null;

  const hasUSA = codes.usa && codes.usa.length > 0;
  const hasCanada = codes.canada && codes.canada.length > 0;
  if (!hasUSA && !hasCanada) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-bold mb-2">Equivalent Regulatory Codes</p>

      <div className={cn('grid gap-3', hasUSA && hasCanada ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
        {/* USA Regulatory Codes */}
        {hasUSA && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">🇺🇸 USA</span>
            </div>
            {codes.usa.map((entry, i) => (
              <div key={i} className="bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-100 px-1.5 py-0.5 rounded">{entry.authority}</span>
                </div>
                {entry.cfr && entry.cfr.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.cfr.map((ref, j) => (
                      <code key={j} className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                        {ref}
                      </code>
                    ))}
                  </div>
                )}
                {entry.statute && entry.statute.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.statute.map((ref, j) => (
                      <span key={j} className="text-[10px] font-medium bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
                {entry.description && (
                  <p className="text-[10px] text-slate-500 leading-relaxed">{entry.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Canada Regulatory Codes */}
        {hasCanada && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">🇨🇦 Canada</span>
            </div>
            {codes.canada!.map((entry, i) => (
              <div key={i} className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100 px-1.5 py-0.5 rounded">{entry.authority}</span>
                  {entry.province && entry.province.length > 0 && (
                    <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                      {entry.province.join(', ')}
                    </span>
                  )}
                </div>
                {entry.reference && entry.reference.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.reference.map((ref, j) => (
                      <code key={j} className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                        {ref}
                      </code>
                    ))}
                  </div>
                )}
                {entry.description && (
                  <p className="text-[10px] text-slate-500 leading-relaxed">{entry.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Expanded Row Panel ───────────────────────────────────────────────────────
const ExpandedPanel = ({ v }: { v: UnifiedViolation }) => {
  const clColor =
    v.crashLikelihoodPercent >= 65 ? 'bg-red-500' :
    v.crashLikelihoodPercent >= 40 ? 'bg-amber-400' :
    'bg-blue-500';
  const clTextColor =
    v.crashLikelihoodPercent >= 65 ? 'text-red-600' :
    v.crashLikelihoodPercent >= 40 ? 'text-amber-600' :
    'text-blue-600';
  const mpColor =
    v.maintenanceProbability >= 55 ? 'bg-rose-500' :
    v.maintenanceProbability >= 35 ? 'bg-amber-400' :
    'bg-blue-400';
  const mpTextColor =
    v.maintenanceProbability >= 55 ? 'text-rose-600' :
    v.maintenanceProbability >= 35 ? 'text-amber-600' :
    'text-blue-600';

  const totalCost = v.fineAmount + v.expenseAmount;
  const finePct   = totalCost > 0 ? Math.round((v.fineAmount / totalCost) * 100) : 0;
  const expPct    = 100 - finePct;

  const regRef = fmtRegulatoryRef(v);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 bg-slate-50/70 border-t border-slate-100">
      {/* Left — Violation Details */}
      <div className="p-4 border-r border-slate-100 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Violation Details</span>
        </div>

        {/* Code + Regulatory */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <code className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-mono font-bold tracking-wide">{v.code}</code>
            <Badge label={v.source} cls={SOURCE_BADGE[v.source] ?? 'bg-slate-100 text-slate-600'} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Regulatory Reference</p>
            <p className="text-sm font-semibold text-slate-700">{regRef}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Description</p>
            <p className="text-sm text-slate-600 leading-relaxed">{v.description}</p>
          </div>
          {/* Category + Group — only show group if different from category */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Badge label={v.category} cls="bg-blue-50 text-blue-700 border border-blue-200" />
            {v.group && v.group !== v.category && (
              <Badge label={v.group} cls="bg-slate-100 text-slate-600 border border-slate-200" />
            )}
            <Badge label={v.severity} cls={RISK_BADGE[v.riskLevel] ?? 'bg-slate-100 text-slate-600'} />
          </div>
          {v.notes && (
            <div className="border-t border-slate-100 pt-2">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Notes</p>
              <p className="text-xs text-slate-500 italic leading-relaxed">{v.notes}</p>
            </div>
          )}
        </div>

        {/* Equivalent Regulatory Codes */}
        <RegulatoryCodesSection v={v} />

        {/* Official Outcome */}
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Official Outcome</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge label={v.result} cls={RESULT_BADGE[v.result] ?? 'bg-slate-100 text-slate-600'} />
            {v.isOos && <Badge label="OOS Order Issued" cls="bg-red-100 text-red-700 border border-red-200" />}
            <Badge label={v.status} cls={STATUS_BADGE[v.status] ?? 'bg-slate-100 text-slate-600'} />
          </div>
        </div>
      </div>

      {/* Middle — Event Info */}
      <div className="p-4 border-r border-slate-100 space-y-2.5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Event Info</p>

        {/* Date / Time / Location */}
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">Date & Time</p>
              <p className="text-sm font-semibold text-slate-700">{fmtDate(v.date)} · {v.time}</p>
              {v.location && <p className="text-xs text-slate-500 mt-1">{v.location}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{v.locationState}{v.locationState && v.locationCountry ? ' · ' : ''}{v.locationCountry}</p>
            </div>
          </div>
        </div>

        {/* Driver */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 mb-0.5">Driver</p>
            <p className="text-sm font-semibold text-slate-700 truncate">{v.driverName || '—'}</p>
            {v.driverId && <p className="text-xs text-slate-400 font-mono">{v.driverId}</p>}
          </div>
        </div>

        {/* Asset */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
            <Truck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400 mb-0.5">Asset / Vehicle</p>
            <p className="text-sm font-semibold text-slate-700 font-mono truncate">{v.vehicleUnit || '—'}</p>
            {v.vehiclePlate && v.vehiclePlate !== '—' && (
              <p className="text-xs text-slate-400">Plate: {v.vehiclePlate}</p>
            )}
          </div>
        </div>

        {v.inspectionId && (
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Inspection Report</p>
            <p className="text-sm font-mono text-slate-600">{v.inspectionId}</p>
          </div>
        )}
      </div>

      {/* Right — Impact Analysis */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Impact Analysis</span>
        </div>

        {/* Crash Likelihood */}
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-600">Crash Likelihood</span>
            <span className={cn('text-sm font-bold tabular-nums', clTextColor)}>{v.crashLikelihoodPercent}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', clColor)}
              style={{ width: `${v.crashLikelihoodPercent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {v.crashLikelihoodPercent >= 65 ? 'High crash risk — immediate action required'
              : v.crashLikelihoodPercent >= 40 ? 'Elevated crash risk — monitor closely'
              : 'Low crash risk — standard monitoring'}
          </p>
        </div>

        {/* Maintenance Probability */}
        <div className="bg-white border border-slate-200 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-slate-600">Maintenance Probability</span>
            <span className={cn('text-sm font-bold tabular-nums', mpTextColor)}>{v.maintenanceProbability}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', mpColor)}
              style={{ width: `${v.maintenanceProbability}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            {v.maintenanceProbability >= 55 ? 'Vehicle maintenance event likely'
              : v.maintenanceProbability >= 35 ? 'Moderate maintenance risk'
              : 'Low maintenance impact'}
          </p>
        </div>

        {/* Points breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-blue-700 leading-none">{v.driverPts}</p>
            <p className="text-xs text-blue-500 mt-1 font-medium">Driver</p>
          </div>
          <div className="bg-slate-100 border border-slate-200 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-slate-600 leading-none">{v.assetPts}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Asset</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-lg p-2.5 text-center">
            <p className="text-xl font-black text-purple-700 leading-none">{v.carrierPts}</p>
            <p className="text-xs text-purple-500 mt-1 font-medium">Carrier</p>
          </div>
        </div>

        {/* Financial breakdown */}
        {totalCost > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Financial Impact</p>
            {/* Proportional bar */}
            <div className="h-3 rounded-full overflow-hidden flex bg-slate-100">
              {v.fineAmount > 0 && (
                <div className="bg-red-400 h-full" style={{ width: `${finePct}%` }} title={`Fine: ${fmt(v.fineAmount, v.currency)}`} />
              )}
              {v.expenseAmount > 0 && (
                <div className="bg-blue-400 h-full" style={{ width: `${expPct}%` }} title={`Expenses: ${fmt(v.expenseAmount, v.currency)}`} />
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              {v.fineAmount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-400 shrink-0" />
                  <span className="text-slate-500">Fine:</span>
                  <span className="font-bold text-slate-700">{fmt(v.fineAmount, v.currency)}</span>
                </div>
              )}
              {v.expenseAmount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-sm bg-blue-400 shrink-0" />
                  <span className="text-slate-500">Repair:</span>
                  <span className="font-bold text-slate-700">{fmt(v.expenseAmount, v.currency)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 pt-1.5 flex justify-between items-center">
              <span className="text-xs text-slate-400">Total Exposure</span>
              <span className="text-sm font-black text-slate-800">{fmt(totalCost, v.currency)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ViolationsListPage() {
  const [search, setSearch]               = useState('');
  const [pageView, setPageView]           = useState<'all' | 'drivers' | 'assets'>('all');
  const [sourceFilter, setSourceFilter]   = useState<'all' | 'SMS' | 'NSC' | 'CVOR'>('all');
  const [riskFilter, setRiskFilter]       = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'Open' | 'Closed' | 'Under Review'>('all');
  const [resultFilter, setResultFilter]   = useState<'all' | 'Citation Issued' | 'Warning' | 'OOS Order' | 'Clean Inspection' | 'Under Review'>('all');
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [perPage, setPerPage]             = useState(20);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // Active dataset based on pageView
  const activeDataset = pageView === 'drivers' ? ALL_DRIVER_UNIFIED
    : pageView === 'assets' ? ALL_ASSET_UNIFIED
    : ALL_UNIFIED;

  // ─── KPI calculations ────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const total       = activeDataset.length;
    const oos         = activeDataset.filter(v => v.isOos || v.result === 'OOS Order').length;
    const highRisk    = activeDataset.filter(v => v.riskLevel === 'High').length;
    const citations   = activeDataset.filter(v => v.result === 'Citation Issued').length;
    const openCases   = activeDataset.filter(v => v.status === 'Open').length;
    const totalFines  = activeDataset.reduce((s, v) => s + v.fineAmount, 0);
    return { total, oos, highRisk, citations, openCases, totalFines };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageView]);

  // ─── Filtered data ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeDataset.filter(v => {
      if (sourceFilter !== 'all' && v.source !== sourceFilter) return false;
      if (riskFilter !== 'all' && v.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (resultFilter !== 'all' && v.result !== resultFilter) return false;
      if (q) {
        return (
          v.driverName.toLowerCase().includes(q) ||
          v.code.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.location.toLowerCase().includes(q) ||
          v.vehicleUnit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sourceFilter, riskFilter, statusFilter, resultFilter, pageView]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePageNum = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePageNum - 1) * perPage, safePageNum * perPage);

  const anyFilter = search || sourceFilter !== 'all' || riskFilter !== 'all' || statusFilter !== 'all' || resultFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('all');
    setRiskFilter('all');
    setStatusFilter('all');
    setResultFilter('all');
    setPage(1);
  };

  // ─── KPI Cards ────────────────────────────────────────────────────────────
  const KPICard = ({
    label, value, subtitle, icon: Icon, barColor, textColor,
  }: {
    label: string; value: string | number; subtitle?: string;
    icon: React.ElementType; barColor: string; textColor: string;
  }) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex overflow-hidden">
      <div className={cn('w-1.5 shrink-0', barColor)} />
      <div className="flex-1 p-3 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">{label}</p>
            <p className={cn('text-2xl font-bold mt-0.5', textColor)}>{value}</p>
            {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
          </div>
          <div className={cn('rounded-lg p-1.5 shrink-0', barColor.replace('bg-', 'bg-').replace('-500', '-100').replace('-600', '-100'))}>
            <Icon className={cn('w-4 h-4', textColor)} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
          <nav className="flex items-center gap-2 mb-1 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
            <span>Safety</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900">Violations</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Violations</h1>
          <p className="mt-1 text-xs text-slate-500">
            {activeDataset.length.toLocaleString()} records · SMS · NSC · CVOR
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-4">
          {/* Driver / Assets toggle */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
            {([
              { key: 'all',     label: 'All',     Icon: List },
              { key: 'drivers', label: 'Drivers', Icon: Users },
              { key: 'assets',  label: 'Assets',  Icon: Truck },
            ] as const).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => { setPageView(key); setPage(1); setExpandedId(null); }}
                className={cn(
                  'flex items-center gap-2 text-xs font-medium px-4 py-1.5 rounded-md transition-all',
                  pageView === key
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition-all"
              onClick={() => {}}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
              onClick={() => { setEditingRecord(null); setEditModalOpen(true); }}
            >
              <Plus className="w-4 h-4" />
              Add Violation
            </button>
          </div>
        </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <KPICard
              label="Total Violations"
              value={kpi.total.toLocaleString()}
              icon={LayoutGrid}
              barColor="bg-blue-500"
              textColor="text-blue-700"
            />
            <KPICard
              label="OOS Orders"
              value={kpi.oos}
              subtitle="vehicles/drivers halted"
              icon={Ban}
              barColor="bg-red-500"
              textColor="text-red-700"
            />
            <KPICard
              label="High Risk"
              value={kpi.highRisk}
              subtitle="crash likelihood ≥65%"
              icon={AlertTriangle}
              barColor="bg-rose-500"
              textColor="text-rose-700"
            />
            <KPICard
              label="Citations Issued"
              value={kpi.citations}
              icon={FileWarning}
              barColor="bg-amber-500"
              textColor="text-amber-700"
            />
            <KPICard
              label="Open Cases"
              value={kpi.openCases}
              icon={Clock}
              barColor="bg-orange-500"
              textColor="text-orange-700"
            />
            <KPICard
              label="Total Fines"
              value={`$${kpi.totalFines.toLocaleString()}`}
              subtitle="USD + CAD combined"
              icon={DollarSign}
              barColor="bg-emerald-500"
              textColor="text-emerald-700"
            />
          </div>

          {/* Filters */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 space-y-2.5">
            {/* Row 1: Search + Source pills */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className="w-full h-8 pl-8 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  placeholder="Search driver, code, description, location…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <div className="flex items-center gap-1">
                {(['all', 'SMS', 'NSC', 'CVOR'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setSourceFilter(s); setPage(1); }}
                    className={cn(
                      'px-3 h-8 rounded-lg text-xs font-semibold border transition-colors',
                      sourceFilter === s
                        ? s === 'SMS' ? 'bg-blue-600 text-white border-blue-600'
                          : s === 'NSC' ? 'bg-emerald-600 text-white border-emerald-600'
                          : s === 'CVOR' ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-slate-700 text-white border-slate-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {s === 'all' ? 'All Sources' : s}
                  </button>
                ))}
              </div>
            </div>
            {/* Row 2: Dropdowns + Clear */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={riskFilter}
                onChange={e => { setRiskFilter(e.target.value as typeof riskFilter); setPage(1); }}
              >
                <option value="all">All Risk Levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select
                className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
              >
                <option value="all">All Statuses</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Under Review">Under Review</option>
              </select>
              <select
                className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={resultFilter}
                onChange={e => { setResultFilter(e.target.value as typeof resultFilter); setPage(1); }}
              >
                <option value="all">All Results</option>
                <option value="Citation Issued">Citation Issued</option>
                <option value="Warning">Warning</option>
                <option value="OOS Order">OOS Order</option>
                <option value="Clean Inspection">Clean Inspection</option>
                <option value="Under Review">Under Review</option>
              </select>
              {anyFilter && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1 h-8 px-2.5 text-xs font-medium border border-slate-200 rounded-lg bg-white hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear filters
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {filtered.length.toLocaleString()} results
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date/Time</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Driver / Asset</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Crash %</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Points</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">OOS</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fine</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={13} className="text-center py-12 text-slate-400 text-sm">
                        No violations match the current filters.
                      </td>
                    </tr>
                  )}
                  {pageRows.map(v => {
                    const isExpanded = expandedId === v.id;
                    return (
                      <React.Fragment key={v.id}>
                        <tr
                          className={cn(
                            'border-b border-slate-100 cursor-pointer transition-colors',
                            isExpanded
                              ? 'bg-blue-50/10 border-l-2 border-l-blue-400'
                              : 'hover:bg-blue-50/20'
                          )}
                          onClick={() => setExpandedId(isExpanded ? null : v.id)}
                        >
                          {/* Date/Time */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <p className="font-medium text-slate-700 text-xs">{fmtDate(v.date)}</p>
                            <p className="text-xs text-slate-400">{v.time}</p>
                          </td>
                          {/* Driver / Asset */}
                          <td className="px-3 py-2.5 max-w-[160px]">
                            <p className="font-semibold text-slate-700 text-xs truncate">{v.driverName || '—'}</p>
                            <p className="text-xs text-slate-400 font-mono truncate">{v.vehicleUnit}</p>
                          </td>
                          {/* Source */}
                          <td className="px-3 py-2.5">
                            <Badge label={v.source} cls={SOURCE_BADGE[v.source] ?? 'bg-slate-100 text-slate-600'} />
                          </td>
                          {/* Code */}
                          <td className="px-3 py-2.5">
                            <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold font-mono whitespace-nowrap">
                              {v.code}
                            </code>
                          </td>
                          {/* Category */}
                          <td className="px-3 py-2.5 max-w-[150px]">
                            <p className="text-xs text-slate-700 truncate">{v.category}</p>
                            <p className="text-xs text-slate-400 truncate">{v.group}</p>
                          </td>
                          {/* Risk */}
                          <td className="px-3 py-2.5">
                            <Badge label={v.riskLevel} cls={RISK_BADGE[v.riskLevel]} />
                          </td>
                          {/* Crash % */}
                          <td className="px-3 py-2.5">
                            <CrashBar pct={v.crashLikelihoodPercent} />
                          </td>
                          {/* Points */}
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                                D:{v.driverPts}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">
                                A:{v.assetPts}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded font-medium">
                                C:{v.carrierPts}
                              </span>
                            </div>
                          </td>
                          {/* OOS */}
                          <td className="px-3 py-2.5">
                            {v.isOos
                              ? <Badge label="YES" cls="bg-red-100 text-red-700 border border-red-200" />
                              : <span className="text-slate-300">—</span>
                            }
                          </td>
                          {/* Result */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Badge label={v.result} cls={RESULT_BADGE[v.result] ?? 'bg-slate-100 text-slate-600'} />
                          </td>
                          {/* Fine */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {v.fineAmount > 0
                              ? <span className="font-bold text-slate-700 text-xs">{fmt(v.fineAmount, v.currency)}</span>
                              : <span className="text-slate-300 text-xs">—</span>
                            }
                          </td>
                          {/* Status */}
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <Badge label={v.status} cls={STATUS_BADGE[v.status] ?? 'bg-slate-100 text-slate-600'} />
                          </td>
                          {/* Chevron */}
                          <td className="px-2 py-2.5">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 text-blue-500" />
                              : <ChevronDown className="w-4 h-4 text-slate-400" />
                            }
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-blue-100">
                            <td colSpan={13} className="p-0">
                              <ExpandedPanel v={v} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Rows per page:</span>
                <select
                  className="h-7 px-2 border border-slate-200 rounded bg-white text-xs focus:outline-none"
                  value={perPage}
                  onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                >
                  {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Page {safePageNum} of {totalPages}
                  {' '}· {filtered.length.toLocaleString()} total
                </span>
                <button
                  disabled={safePageNum <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={safePageNum >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ViolationEditForm
        isOpen={isEditModalOpen}
        onClose={() => setEditModalOpen(false)}
        record={editingRecord}
        mode="driver"
        onSave={(_updated: any) => { setEditModalOpen(false); }}
      />
    </div>
  );
}
