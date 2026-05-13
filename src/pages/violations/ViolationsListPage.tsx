import React, { useState, useMemo } from 'react';
import {
  Search, Download, Plus, ChevronLeft, ChevronRight,
  AlertTriangle, LayoutGrid, FileWarning, Ban, Clock,
  MapPin, Activity, ChevronDown, ChevronUp,
  X, Users, Truck, List, ShieldCheck, ShieldAlert, BellRing,
  Calendar, Pencil, RefreshCw, Trash2, AlertOctagon,
} from 'lucide-react';
import { getViolation, ALL_VIOLATIONS, type ViolationRecord } from './violations-list.data';
import { syncTicketFromViolation } from '@/pages/tickets/tickets.store';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { ViolationEditForm } from './ViolationEditForm';
import { getViolationsForCarrier, type CarrierViolationRecord } from './carrier-violations.data';
import {
  getExternalViolationsForCarrier,
  generateLiveFeedBatch,
  VIOLATION_SOURCE_META,
  VIOLATION_SOURCE_TONE,
  matchInternalToExternalViolations,
  type ExternalViolationSource,
  type ExternalViolationRecord,
} from './external-violation-feeds.data';

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

// ─── Per-carrier unified violations ──────────────────────────────────────────
// Every record on the page comes from the active carrier-profile's own
// drivers / assets / jurisdiction so the violations list is properly scoped
// (US-only carriers never see NSC/CVOR violations; ON-based carriers see
// CVOR-flavoured ones; AB/PEI/NS carriers see NSC variants; etc.).
function sourceForRecord(rec: CarrierViolationRecord): 'SMS' | 'NSC' | 'CVOR' {
  const isCA = rec.locationCountry === 'CA' || rec.locationCountry === 'Canada';
  if (!isCA) return 'SMS';
  if (rec.locationState === 'ON') return 'CVOR';
  return 'NSC';
}

function toUnified(rec: CarrierViolationRecord, accountId: string): UnifiedViolation {
  const def = getViolation(rec.violationDataId);
  const asset = rec.assetId
    ? (CARRIER_ASSETS[accountId] ?? []).find(a => a.id === rec.assetId)
    : undefined;
  const rl: 'High' | 'Medium' | 'Low' =
    rec.driverRiskCategory === 1 ? 'High' :
    rec.driverRiskCategory === 2 ? 'Medium' : 'Low';
  const cl = Math.min(rec.crashLikelihood, 100);
  const source = sourceForRecord(rec);
  const isCA = source !== 'SMS';

  // Prefer the master-chart category when available so the row's category
  // column reads e.g. "Hours-of-service" instead of just the FMCSA group.
  const category = def?.violationGroup || rec.violationGroup;
  const group = rec.violationGroup;

  return {
    id: rec.id,
    source,
    date: rec.date,
    time: rec.time,
    driverName: rec.driverName,
    driverId: rec.driverId,
    vehicleUnit: rec.assetName || asset?.unitNumber || '—',
    vehiclePlate: asset?.plateNumber || '—',
    code: rec.violationCode,
    description: def?.violationDescription || rec.violationType,
    category,
    group,
    riskLevel: rl,
    crashLikelihoodPercent: cl,
    maintenanceProbability: Math.round(cl * 0.45),
    isOos: rec.isOos,
    driverPts: def?.severityWeight?.driver ?? (rl === 'High' ? 3 : rl === 'Medium' ? 2 : 1),
    assetPts: asset ? (rl === 'High' ? 2 : rl === 'Medium' ? 1 : 0) : 0,
    carrierPts: def?.severityWeight?.carrier ?? (rl === 'High' ? 3 : rl === 'Medium' ? 2 : 1),
    severity: rec.isOos ? 'OOS' :
      rec.driverRiskCategory === 1 ? 'Critical' :
      rec.driverRiskCategory === 2 ? 'Serious' : 'Moderate',
    fineAmount: rec.fineAmount,
    expenseAmount: rec.expenseAmount ?? 0,
    currency: rec.currency,
    result: rec.result,
    status: rec.status,
    location: [rec.locationCity, rec.locationState].filter(Boolean).join(', ') || rec.locationState,
    locationState: rec.locationState,
    locationCountry: isCA ? 'CA' : (rec.locationCountry || 'US'),
    inspectionId: rec.inspectionId || '',
    regulatoryRef: rec.violationCode,
    notes: '',
  };
}


// ─── Formatting helpers ───────────────────────────────────────────────────────

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

// CrashBar was removed — the Crash % column is no longer in the table.
// Crash Likelihood is still surfaced in the FMCSA SMS section of the
// expanded panel for records that originate from FMCSA SMS.

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
const ExpandedPanel = ({
  v,
  verifiedBy = [],
}: {
  v: UnifiedViolation;
  verifiedBy?: ExternalViolationSource[];
}) => {
  const regRef = fmtRegulatoryRef(v);

  return (
    <div className="bg-slate-50/70 border-t border-slate-100">
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
      {/* Left — Violation Details */}
      <div className="p-4 border-r border-slate-100 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Violation Details</span>
        </div>

        {/* Code + Regulatory */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="px-2 py-1 bg-slate-900 text-white rounded text-xs font-mono font-bold tracking-wide">{v.code}</code>
            <Badge label={v.source} cls={SOURCE_BADGE[v.source] ?? 'bg-slate-100 text-slate-600'} />
            {/* Verified-by regulator-feed badges (FMCSA SMS / CVOR conv. / NSC AB·PEI·NS conv. / Contraventions) */}
            {verifiedBy.map(src => (
              <span
                key={src}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border',
                  VIOLATION_SOURCE_TONE[src],
                )}
                title={`Verified by ${VIOLATION_SOURCE_META[src].agency}`}
              >
                <ShieldCheck className="w-3 h-3" />
                {VIOLATION_SOURCE_META[src].short}
              </span>
            ))}
            {verifiedBy.length === 0 && v.source === 'SMS' && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border bg-slate-50 text-slate-500 border-slate-200"
                title="No external regulator feed has reported this violation yet"
              >
                <ShieldAlert className="w-3 h-3" />
                Internal only
              </span>
            )}
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

      {/* Right — Source-specific regulator data
          Different fields are surfaced depending on whether the violation
          came from FMCSA SMS (US), Ontario CVOR, or any NSC profile (CA). */}
      <div className="p-4 space-y-3">
        <SourceSpecificBlock v={v} />
      </div>
    </div>
    </div>
  );
};

// ─── Source-specific data block ─────────────────────────────────────────
// Surfaces the regulator-specific fields that matter for the violation's
// origin: FMCSA SMS → BASIC + CFR + severity weights; Ontario CVOR → HTA
// section + CVOR points/conviction type; NSC (any province) → CCMTA NAT
// code + NSC standard + provincial Act/section.
const SourceSpecificBlock = ({ v }: { v: UnifiedViolation }) => {
  const def = useMemo(() => {
    const norm = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const wantedCode = norm(v.code);
    return ALL_VIOLATIONS.find(item =>
      norm(item.violationCode) === wantedCode ||
      norm(item.canadaEnforcement?.code || '') === wantedCode,
    );
  }, [v.code]);

  if (v.source === 'SMS') {
    const cfrEntries = def?.regulatoryCodes?.usa ?? [];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-bold text-blue-700 uppercase tracking-widest">FMCSA SMS Data</span>
        </div>
        <div className="bg-white border border-blue-100 rounded-lg p-3 space-y-2">
          <KV k="BASIC" val={v.category} />
          <KV k="Severity Weight (Driver / Carrier)" val={`${def?.severityWeight.driver ?? '—'} / ${def?.severityWeight.carrier ?? '—'}`} />
          <KV k="Crash Likelihood" val={`${v.crashLikelihoodPercent}%`} />
          <KV k="DSMS Indicator" val={def?.inDsms ? 'Yes' : 'No'} />
          <KV k="OOS Qualifying" val={v.isOos ? 'Yes' : 'No'} highlight={v.isOos} />
        </div>
        {cfrEntries.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">49 CFR / FMCSA Regulatory Codes</p>
            {cfrEntries.map((e, i) => (
              <div key={i} className="space-y-1">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">{e.authority}</span>
                <div className="flex flex-wrap gap-1">
                  {e.cfr.map((c, j) => (
                    <code key={j} className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">{c}</code>
                  ))}
                </div>
                {e.description && <p className="text-[10px] text-slate-500">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (v.source === 'CVOR') {
    const ce = def?.canadaEnforcement;
    const cvor = ce?.cvorClassification;
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-3.5 h-3.5 text-rose-600" />
          <span className="text-xs font-bold text-rose-700 uppercase tracking-widest">CVOR (Ontario) Data</span>
        </div>
        <div className="bg-white border border-rose-100 rounded-lg p-3 space-y-2">
          <KV k="HTA Act" val={ce?.act || 'Highway Traffic Act'} />
          <KV k="Section" val={ce?.section} />
          <KV k="CCMTA Code" val={ce?.ccmtaCode} />
          <KV k="CVOR Conviction Type" val={cvor?.convictionType} />
          <KV k="Alternative Group" val={cvor?.alternativeGroup} />
          <KV k="CVOR Points (raw)" val={ce?.points.cvor?.raw} />
          <KV k="CVOR Points (range)" val={ce?.points.cvor ? `${ce.points.cvor.min ?? '?'} – ${ce.points.cvor.max ?? '?'}` : undefined} />
          <KV k="OOS Qualifying" val={v.isOos ? 'Yes' : 'No'} highlight={v.isOos} />
        </div>
        {ce?.descriptions?.full && (
          <div className="bg-rose-50/40 border border-rose-100 rounded-lg p-3 space-y-1">
            <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Full Description</p>
            <p className="text-xs text-slate-700">{ce.descriptions.full}</p>
            {ce.descriptions.conviction && (
              <p className="text-[10px] text-slate-500 italic">As-convicted: {ce.descriptions.conviction}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // NSC (any province)
  const ce = def?.canadaEnforcement;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">NSC Data</span>
      </div>
      <div className="bg-white border border-emerald-100 rounded-lg p-3 space-y-2">
        <KV k="Act" val={ce?.act || 'National Safety Code'} />
        <KV k="Section" val={ce?.section} />
        <KV k="CCMTA NAT Code" val={ce?.ccmtaCode} />
        <KV k="NSC Standard / Category" val={ce?.category} />
        <KV k="NSC Points" val={ce?.points.nsc} />
        <KV k="Revised Points" val={ce?.points.revised} />
        <KV k="OOS Qualifying" val={v.isOos ? 'Yes' : 'No'} highlight={v.isOos} />
      </div>
      {ce?.descriptions?.full && (
        <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-3 space-y-1">
          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Full Description</p>
          <p className="text-xs text-slate-700">{ce.descriptions.full}</p>
          {ce.descriptions.conviction && (
            <p className="text-[10px] text-slate-500 italic">As-convicted: {ce.descriptions.conviction}</p>
          )}
        </div>
      )}
    </div>
  );
};

const KV = ({ k, val, highlight }: { k: string; val?: string | number | null; highlight?: boolean }) => {
  if (val === undefined || val === null || val === '') return null;
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-slate-500 shrink-0">{k}</span>
      <span className={cn('font-semibold text-right', highlight ? 'text-red-700' : 'text-slate-800')}>{val}</span>
    </div>
  );
};

// ─── Per-carrier reconciliation + prefill helpers ────────────────────────
// Both helpers are scoped to the active carrier so the violations page only
// shows that carrier's data and the Add-to-log form picks drivers/assets
// from the carrier's actual fleet.

function reconcileForCarrier(
  accountId: string,
  internalOverride?: CarrierViolationRecord[],
  extraFeeds: ExternalViolationRecord[] = [],
) {
  const internal = internalOverride ?? getViolationsForCarrier(accountId);
  const external = [...getExternalViolationsForCarrier(accountId), ...extraFeeds];
  const result = matchInternalToExternalViolations(internal, external);
  const verifiedByRowId: Record<string, ExternalViolationSource[]> = {};
  result.verifiedById.forEach((sources, id) => { verifiedByRowId[id] = sources; });
  return { ...result, verifiedByRowId };
}

function buildPrefillFromExternal(m: ExternalViolationRecord, accountId: string): Partial<ViolationRecord> & { id: string } {
  const isCanada = m.country === 'CA';
  const drivers = CARRIER_DRIVERS[accountId] ?? [];
  const assets  = CARRIER_ASSETS[accountId] ?? [];

  const driverName = (m.driverName || '').toLowerCase();
  const driver = drivers.find(d => (d as any).name?.toLowerCase() === driverName);
  const asset = m.vehicleUnit
    ? assets.find(a => a.unitNumber === m.vehicleUnit)
    : undefined;

  // Look up the violation definition so the form's Combobox auto-selects it.
  // For US/SMS we match on violationCode; for Canada we still try the same
  // because most ALL_VIOLATIONS entries also carry the FMCSA code that the
  // CVOR/NSC feeds reference.
  const normalize = (s: string) => (s || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const wantedCode = normalize(m.violationCode);
  const def = ALL_VIOLATIONS.find(v => normalize(v.violationCode) === wantedCode);

  return {
    // Synthetic id — the form treats `record.id` truthy as "prefill from
    // existing data" but the field name still reads "Add Driver Violation"
    // because the form's header reads `record?.id ? 'Edit' : 'Add'` — so we
    // intentionally keep it falsy by passing an empty string in the wrapper
    // below (see onClick handler). Here we just return a fully shaped object.
    id: `V-FEED-${m.externalId}`,
    date: m.date,
    time: m.time,
    driverId: driver?.id ?? '',
    driverName: m.driverName,
    driverType: (driver as any)?.driverType || 'Long Haul Driver',
    driverExperience: '',
    assetId: asset?.id,
    assetName: asset?.unitNumber ?? m.vehicleUnit,
    locationState: m.state,
    locationCity: m.city,
    locationStreet: '',
    locationZip: '',
    locationCountry: isCanada ? 'Canada' : 'US',
    violationCode: m.violationCode,
    violationDataId: def?.id ?? '',
    violationType: def?.violationDescription ?? m.violationDescription,
    violationGroup: def?.violationGroup ?? '',
    crashLikelihood: def?.crashLikelihoodPercent ?? 0,
    driverRiskCategory: def?.driverRiskCategory ?? (m.severity === 'OOS' || m.severity === 'Critical' ? 1 : m.severity === 'Serious' ? 2 : 3),
    isOos: m.severity === 'OOS' || (def?.isOos ?? false),
    result: m.severity === 'OOS' ? 'OOS Order' : 'Citation Issued',
    fineAmount: m.fineAmount,
    expenseAmount: 0,
    currency: m.currency,
    expenses: m.fineAmount,
    status: 'Open',
    // Regulator-feed identifiers — carry through so the saved record stays
    // linked to the feed entry it reconciles. (USDOT / CVOR / NSC carrier
    // numbers are NOT mapped here — they belong on the carrier profile.)
    citationNumber:   m.citationNumber,
    convictionNumber: m.convictionNumber,
    convictionDate:   m.convictionDate,
    // Court / regulator paperwork — populated from the feed payload so the
    // References & Identifiers section opens fully filled.
    microfilmNumber:    m.externalId,
    ticketNumber:       m.citationNumber,
    offence:            m.violationDescription,
    docketNumber:       m.convictionNumber,
    // Driver master no. is the provincial abstract; the feed carries the
    // licence number for the driver involved, which is the closest 1:1.
    driverMasterNumber: m.driverLicense,
    // "Charge" is the formal wording the prosecuting body uses — the feed's
    // raw description is the closest match; otherwise fall back to the
    // human-readable violation description.
    charge:             m.rawDescription || m.violationDescription,
    // NAT code (CCMTA) maps to the violation code for the Canadian feeds;
    // for FMCSA SMS we leave it blank so the user can fill the CFR section.
    natCode:            isCanada ? m.violationCode : '',
    actSection:         m.violationCode,
    // Issuing agency is carried on the feed source metadata.
    issuingAgency:      VIOLATION_SOURCE_META[m.source]?.agency || '',
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// ── BASIC category tab strip — mirrors the Accidents sub-categories pattern ──
//
// Each tab declares a regex that decides whether a unified violation belongs
// to that BASIC. `all` always matches; `other` matches everything that doesn't
// fall into the named BASICs.
const BASIC_CATEGORY_RE = /vehicle\s*maintenance|unsafe\s*driving|hours[-\s]?of[-\s]?service|driver\s*fitness|hazmat|hazardous|controlled\s*substance|alcohol|crash/i;

const BASIC_TABS: Array<{
  key: 'all' | 'vehicle_maintenance' | 'unsafe_driving' | 'hos' | 'driver_fitness' | 'hazmat' | 'controlled_substances' | 'other';
  label: string;
  match: (category: string) => boolean;
  /** Tone palette used by the sub-category cards when this tab is active. */
  tone: 'slate' | 'blue' | 'rose' | 'amber' | 'violet' | 'orange' | 'red' | 'teal';
}> = [
  { key: 'all',                   label: 'All Violations',          match: () => true,                                                                          tone: 'slate'  },
  { key: 'vehicle_maintenance',   label: 'Vehicle Maintenance',     match: c => /vehicle\s*maintenance/i.test(c),                                                tone: 'blue'   },
  { key: 'unsafe_driving',        label: 'Unsafe Driving',          match: c => /unsafe\s*driving|speeding|reckless|texting|cell\s*phone|seat\s*belt/i.test(c),  tone: 'rose'   },
  { key: 'hos',                   label: 'Hours-of-service',        match: c => /hours[-\s]?of[-\s]?service|hos/i.test(c),                                       tone: 'amber'  },
  { key: 'driver_fitness',        label: 'Driver Fitness',          match: c => /driver\s*fitness|fitness/i.test(c),                                             tone: 'violet' },
  { key: 'hazmat',                label: 'Hazmat Compliance',       match: c => /hazmat|hazardous/i.test(c),                                                     tone: 'orange' },
  { key: 'controlled_substances', label: 'Controlled Substances',   match: c => /controlled\s*substance|alcohol|drug/i.test(c),                                 tone: 'red'    },
  { key: 'other',                 label: 'Other',                   match: c => !BASIC_CATEGORY_RE.test(c),                                                       tone: 'teal'   },
];

interface ViolationsListPageProps {
  /** Active carrier profile — drives data scope, fleet dropdowns, and feeds.
   *  Falls back to acct-001 (Acme demo) when omitted so the page still works
   *  if rendered without an explicit selection. */
  accountId?: string;
}

export function ViolationsListPage({ accountId }: ViolationsListPageProps = {}) {
  const carrierId = accountId ?? (ACCOUNTS_DB[0]?.id ?? 'acct-001');
  const carrier = useMemo(() => ACCOUNTS_DB.find(a => a.id === carrierId) ?? null, [carrierId]);

  // ── Local edits + adds keyed by record id. These overlay the static
  // per-carrier data so saved records appear immediately in the list.
  // (carrier-violations.data is a synthesized source — we don't mutate it.)
  const [userEdits, setUserEdits] = useState<Record<string, CarrierViolationRecord>>({});
  const [userAdds,  setUserAdds]  = useState<CarrierViolationRecord[]>([]);
  // Locally-deleted ids — overlay the source data so removed records drop
  // off the list (carrier-violations.data itself is read-only).
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  // ── Live external feed entries pulled at runtime by the Sync button.
  // Each entry is an ExternalViolationRecord that augments the static
  // EXTERNAL_VIOLATION_FEEDS_BY_CARRIER baseline so admins can simulate a
  // refresh from FMCSA / CVOR / NSC and watch the "missing" notification
  // grow live. Stored per-carrier because feeds are jurisdictional.
  const [liveFeedsByCarrier, setLiveFeedsByCarrier] = useState<Record<string, ExternalViolationRecord[]>>({});
  const [lastSyncedAt, setLastSyncedAt] = useState<Record<string, number>>({});
  void lastSyncedAt;
  const liveFeeds = liveFeedsByCarrier[carrierId] ?? [];

  // Merged per-carrier records (user edits applied over static data; user
  // adds prepended). Rebuilds whenever the carrier or local state changes.
  const carrierRecords = useMemo(() => {
    const base = getViolationsForCarrier(carrierId)
      .filter(r => !removedIds.has(r.id))
      .map(r => userEdits[r.id] ? { ...userEdits[r.id], accountId: carrierId } : r);
    const adds = userAdds.filter(r => r.accountId === carrierId && !removedIds.has(r.id));
    return [...adds, ...base];
  }, [carrierId, userEdits, userAdds, removedIds]);

  // Quick lookup by id so the Edit button can hand the original record back
  // to the form in the right shape (ViolationRecord), not the unified one.
  const recordsById = useMemo(() => {
    const map = new Map<string, CarrierViolationRecord>();
    for (const r of carrierRecords) map.set(r.id, r);
    return map;
  }, [carrierRecords]);

  // Per-carrier unified datasets — rebuilt whenever the carrier or its
  // user-edited record set changes.
  const carrierUnified = useMemo(() => {
    const unified = carrierRecords
      .map(r => toUnified(r, carrierId))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return {
      all:    unified,
      driver: unified.filter(v => v.driverPts > 0 || !!v.driverId || !!v.driverName),
      asset:  unified.filter(v => v.vehicleUnit !== '—'),
    };
  }, [carrierRecords, carrierId]);

  // Per-carrier reconciliation against the external regulator feeds.
  // Includes live (runtime-synced) feed entries so newly arrived regulator
  // records show up in the "missing from system" notification instantly.
  const reconciliation = useMemo(
    () => reconcileForCarrier(carrierId, carrierRecords, liveFeeds),
    [carrierId, carrierRecords, liveFeeds],
  );
  const VERIFIED_BY_ROW_ID = reconciliation.verifiedByRowId;

  // Pull one batch of fresh feed entries for this carrier.
  const handleSyncFeeds = () => {
    const batch = generateLiveFeedBatch(carrierId);
    if (batch.length === 0) return;
    setLiveFeedsByCarrier(prev => ({
      ...prev,
      [carrierId]: [...batch, ...(prev[carrierId] ?? [])],
    }));
    setLastSyncedAt(prev => ({ ...prev, [carrierId]: Date.now() }));
    setShowMissing(true);
  };

  const [search, setSearch]               = useState('');
  const [showMissing, setShowMissing]     = useState(false);
  // Missing-records notification: selection + pagination state.
  const [selectedMissingIds, setSelectedMissingIds] = useState<Set<string>>(new Set());
  const [missingPage, setMissingPage]     = useState(1);
  const [missingPerPage, setMissingPerPage] = useState(10);
  const [pageView, setPageView]           = useState<'all' | 'drivers' | 'assets'>('all');
  const [basicTab, setBasicTab]           = useState<(typeof BASIC_TABS)[number]['key']>('all');
  const [subCatFilter, setSubCatFilter]   = useState<string | null>(null);
  const [sourceFilter, setSourceFilter]   = useState<'all' | 'SMS' | 'NSC' | 'CVOR'>('all');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom]           = useState<string>('');
  const [dateTo, setDateTo]               = useState<string>('');
  const [riskFilter, setRiskFilter]       = useState<'all' | 'High' | 'Medium' | 'Low'>('all');
  const [statusFilter, setStatusFilter]   = useState<'all' | 'Open' | 'Closed' | 'Under Review'>('all');
  const [resultFilter, setResultFilter]   = useState<'all' | 'Citation Issued' | 'Warning' | 'OOS Order' | 'Clean Inspection' | 'Under Review'>('all');
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [perPage, setPerPage]             = useState(20);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  // Violation pending a Remove confirmation. Null when the dialog is closed.
  const [removeCandidate, setRemoveCandidate] = useState<CarrierViolationRecord | null>(null);

  // Active dataset based on pageView — always scoped to the active carrier.
  const activeDataset = pageView === 'drivers' ? carrierUnified.driver
    : pageView === 'assets' ? carrierUnified.asset
    : carrierUnified.all;

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

  // Per-source counts — drives which Source filter pills appear so a US
  // carrier never sees a "CVOR (0)" pill it can't usefully click.
  const sourceCounts = useMemo(() => {
    const out: Record<'SMS' | 'NSC' | 'CVOR', number> = { SMS: 0, NSC: 0, CVOR: 0 };
    for (const v of carrierUnified.all) out[v.source]++;
    return out;
  }, [carrierUnified]);

  const availableSources = useMemo(() => {
    const list: Array<'all' | 'SMS' | 'NSC' | 'CVOR'> = ['all'];
    if (sourceCounts.SMS  > 0) list.push('SMS');
    if (sourceCounts.NSC  > 0) list.push('NSC');
    if (sourceCounts.CVOR > 0) list.push('CVOR');
    return list;
  }, [sourceCounts]);

  // ── Jurisdictions present in the active dataset — drives the
  // Jurisdiction dropdown. Grouped by country (USA first, Canada second)
  // and counts shown per state/province so the user can see at a glance
  // where the violations occurred.
  const jurisdictions = useMemo(() => {
    const byKey = new Map<string, { state: string; country: string; count: number }>();
    for (const v of carrierUnified.all) {
      const key = `${v.locationCountry}|${v.locationState}`;
      const cur = byKey.get(key);
      if (cur) cur.count++;
      else byKey.set(key, { state: v.locationState, country: v.locationCountry, count: 1 });
    }
    return Array.from(byKey.values()).sort((a, b) => {
      // USA states first, then CA provinces; alphabetical within group.
      if (a.country !== b.country) return a.country === 'US' ? -1 : 1;
      return a.state.localeCompare(b.state);
    });
  }, [carrierUnified]);

  // ─── Counts per BASIC tab (drives the badges in the tab strip) ──────────
  const basicCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of BASIC_TABS) {
      out[t.key] = t.key === 'all'
        ? activeDataset.length
        : activeDataset.filter(v => t.match(v.category)).length;
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageView]);

  // ─── Sub-categories within the active BASIC tab ─────────────────────────
  // Aggregates by `v.group` (the most-specific code grouping) so the KPI
  // cards mirror the Accidents-page sub-category UX.
  const subCategoryBreakdown = useMemo(() => {
    const tab = BASIC_TABS.find(t => t.key === basicTab) ?? BASIC_TABS[0];
    const scoped = activeDataset.filter(v => tab.match(v.category));
    const counts = new Map<string, number>();
    for (const v of scoped) {
      // Prefer a finer group label; fall back to category when no group.
      const key = (v.group?.trim() || v.category).trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12); // cap at 12 — keeps the grid scannable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicTab, pageView]);

  // ─── Filtered data ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const tab = BASIC_TABS.find(t => t.key === basicTab) ?? BASIC_TABS[0];
    return activeDataset.filter(v => {
      if (!tab.match(v.category)) return false;
      if (subCatFilter) {
        const groupKey = (v.group?.trim() || v.category).trim();
        if (groupKey !== subCatFilter) return false;
      }
      if (sourceFilter !== 'all' && v.source !== sourceFilter) return false;
      if (jurisdictionFilter !== 'all' && v.locationState !== jurisdictionFilter) return false;
      if (riskFilter !== 'all' && v.riskLevel !== riskFilter) return false;
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (resultFilter !== 'all' && v.result !== resultFilter) return false;
      if (dateFrom && v.date < dateFrom) return false;
      if (dateTo && v.date > dateTo) return false;
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
  }, [search, sourceFilter, jurisdictionFilter, riskFilter, statusFilter, resultFilter, pageView, basicTab, subCatFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePageNum = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePageNum - 1) * perPage, safePageNum * perPage);

  const anyFilter = search || sourceFilter !== 'all' || jurisdictionFilter !== 'all' || riskFilter !== 'all' || statusFilter !== 'all' || resultFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = () => {
    setSearch('');
    setSourceFilter('all');
    setJurisdictionFilter('all');
    setRiskFilter('all');
    setStatusFilter('all');
    setResultFilter('all');
    setDateFrom('');
    setDateTo('');
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

  // ── Dedicated Add/Edit page mode ───────────────────────────────────────
  // When the user clicks the inline pencil (edit) or the Add Violation
  // button, the list is hidden and the form takes over the entire page.
  // The form's Back button calls our onClose, which restores the list.
  if (isEditModalOpen) {
    return (
      <ViolationEditForm
        isOpen={true}
        presentation="page"
        onClose={() => { setEditModalOpen(false); setEditingRecord(null); }}
        record={editingRecord}
        mode="driver"
        accountId={carrierId}
        onSave={(updated: any) => {
          const id = updated?.id || `V-USER-${Date.now()}`;
          const next: CarrierViolationRecord = { ...updated, id, accountId: carrierId };
          if (recordsById.has(id)) {
            setUserEdits(prev => ({ ...prev, [id]: next }));
          } else {
            setUserAdds(prev => [next, ...prev]);
          }
          // Promote any citation / ticket document attached to this
          // violation into the Tickets page so finance / dispatch sees
          // it on their list. No-op when the violation has no citation
          // evidence (no doc, no fine, no ticket number).
          syncTicketFromViolation({ ...updated, id });
          setEditModalOpen(false);
          setEditingRecord(null);
          setExpandedId(id);
        }}
      />
    );
  }

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
            {carrier ? <><span className="font-semibold text-slate-700">{carrier.legalName}</span> · </> : null}
            {activeDataset.length.toLocaleString()} records · {availableSources.filter(s => s !== 'all').join(' · ') || 'No regulator feeds'}
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
          </div>

          {/* ── Regulator-Feed Reconciliation Notification ─────────────── */}
          {/* Tells safety / compliance which violations are present in the
              external regulator feeds (FMCSA SMS, CVOR conviction, NSC AB /
              PEI / NS conviction, federal Contraventions) and which feed
              entries are MISSING from the carrier's internal violation log. */}
          {(() => {
            const verifiedCount = reconciliation.verifiedById.size;
            const missing = reconciliation.missing;
            const missingCount = missing.length;

            const perSourceBreakdown = (Object.keys(VIOLATION_SOURCE_META) as ExternalViolationSource[]).map(src => {
              const ver = [...reconciliation.verifiedById.values()].filter(arr => arr.includes(src)).length;
              const miss = missing.filter(m => m.source === src).length;
              return { src, ver, miss, total: ver + miss };
            }).filter(b => b.total > 0);

            // Neutral white card with a thin amber/emerald accent strip —
            // same shape as the KPI cards above so the page reads as one
            // visual system. Mirrors the Tickets + Accidents banners.
            return (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex overflow-hidden">
                <div className={cn('w-1.5 shrink-0', missingCount > 0 ? 'bg-amber-500' : 'bg-emerald-500')} />
                <div className="flex-1 min-w-0">
                  <div className="px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        missingCount > 0 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
                      )}>
                        {missingCount > 0 ? <BellRing className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight">
                          {missingCount > 0
                            ? `${missingCount} regulator-feed violation${missingCount === 1 ? '' : 's'} missing`
                            : 'All regulator-feed violations reconciled'}
                        </h3>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700 tabular-nums">{verifiedCount}</span> verified by external feeds
                          {perSourceBreakdown.length > 0 && (
                            <>
                              <span className="mx-1.5 text-slate-300">·</span>
                              Found in{' '}
                              {perSourceBreakdown.map((b, i) => (
                                <React.Fragment key={b.src}>
                                  {i > 0 && <span className="text-slate-300">, </span>}
                                  <span
                                    className="text-slate-700"
                                    title={`${VIOLATION_SOURCE_META[b.src].agency} — ${b.ver} verified, ${b.miss} missing`}
                                  >
                                    {VIOLATION_SOURCE_META[b.src].short}
                                  </span>
                                  <span className="text-slate-400 tabular-nums"> ({b.total})</span>
                                </React.Fragment>
                              ))}
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={handleSyncFeeds}
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                        title="Pull a fresh batch of regulator-feed entries"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Sync feeds
                      </button>
                      {missingCount > 0 && (
                        <button
                          onClick={() => setShowMissing(s => !s)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                          {showMissing ? 'Hide' : 'Show'} missing
                          {showMissing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                {/* Missing list — selectable rows with pagination */}
                {missingCount > 0 && showMissing && (() => {
                  const totalMissing  = missing.length;
                  const totalPagesM   = Math.max(1, Math.ceil(totalMissing / missingPerPage));
                  const safePageM     = Math.min(missingPage, totalPagesM);
                  const startIdx      = (safePageM - 1) * missingPerPage;
                  const pageSlice     = missing.slice(startIdx, startIdx + missingPerPage);
                  const pageIds       = pageSlice.map(m => m.externalId);
                  const allSelectedOnPage = pageIds.length > 0 && pageIds.every(id => selectedMissingIds.has(id));
                  const someSelectedOnPage = pageIds.some(id => selectedMissingIds.has(id));
                  const selectedCount = selectedMissingIds.size;

                  const toggleOne = (id: string) => {
                    setSelectedMissingIds(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id);
                      else next.add(id);
                      return next;
                    });
                  };
                  const toggleAllOnPage = () => {
                    setSelectedMissingIds(prev => {
                      const next = new Set(prev);
                      if (allSelectedOnPage) pageIds.forEach(id => next.delete(id));
                      else pageIds.forEach(id => next.add(id));
                      return next;
                    });
                  };
                  const addSelectedToLog = () => {
                    const selected = missing.filter(m => selectedMissingIds.has(m.externalId));
                    if (selected.length === 0) return;
                    setUserAdds(prev => {
                      const additions: CarrierViolationRecord[] = selected.map(m => {
                        const prefill = buildPrefillFromExternal(m, carrierId);
                        return { ...(prefill as CarrierViolationRecord), accountId: carrierId };
                      });
                      return [...additions, ...prev];
                    });
                    setSelectedMissingIds(new Set());
                  };

                  return (
                    <div className="border-t border-amber-200 bg-white/60">
                      {/* Bulk action bar — appears when at least one row is selected. */}
                      {selectedCount > 0 && (
                        <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-blue-800">
                            {selectedCount} record{selectedCount === 1 ? '' : 's'} selected
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedMissingIds(new Set())}
                              className="text-xs font-medium text-blue-700 hover:text-blue-900"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={addSelectedToLog}
                              className="inline-flex items-center gap-1 px-3 h-7 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                              Add {selectedCount} to log
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Compact 5-column table — only renders the data each
                          regulator feed actually carries. Severity, fine, and
                          conviction live inside the Reference cell so the
                          row stays narrow regardless of source. */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-amber-50/95">
                            <tr className="text-left text-amber-800">
                              <th className="w-8 px-2 py-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-amber-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                  checked={allSelectedOnPage}
                                  ref={el => { if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage; }}
                                  onChange={toggleAllOnPage}
                                  aria-label="Select all on page"
                                />
                              </th>
                              <th className="px-3 py-2 font-semibold w-[140px]">Source / Date</th>
                              <th className="px-3 py-2 font-semibold">Driver</th>
                              <th className="px-3 py-2 font-semibold">Violation</th>
                              <th className="px-3 py-2 font-semibold">Reference</th>
                              <th className="px-3 py-2 font-semibold text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pageSlice.map((m: ExternalViolationRecord) => {
                              const meta = VIOLATION_SOURCE_META[m.source];
                              const checked = selectedMissingIds.has(m.externalId);
                              // Pick the strongest reference the source carries.
                              const primaryRef = m.citationNumber
                                ? { label: 'Citation #', value: m.citationNumber }
                                : m.convictionNumber
                                  ? { label: 'Conviction #', value: m.convictionNumber }
                                  : null;
                              return (
                                <tr
                                  key={m.externalId}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => {
                                    setEditingRecord(buildPrefillFromExternal(m, carrierId));
                                    setEditModalOpen(true);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setEditingRecord(buildPrefillFromExternal(m, carrierId));
                                      setEditModalOpen(true);
                                    }
                                  }}
                                  title="Click to log this violation with pre-filled details"
                                  className={cn(
                                    'border-t border-amber-100 align-top cursor-pointer transition-colors',
                                    checked ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-amber-50/60',
                                  )}
                                >
                                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      className="rounded border-amber-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                      checked={checked}
                                      onChange={() => toggleOne(m.externalId)}
                                      aria-label={`Select ${m.externalId}`}
                                    />
                                  </td>
                                  {/* Source + Date */}
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    <span
                                      className={cn(
                                        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
                                        VIOLATION_SOURCE_TONE[m.source],
                                      )}
                                      title={meta.agency}
                                    >
                                      {meta.short}
                                    </span>
                                    <p className="text-[11px] text-slate-600 mt-1">{fmtDate(m.date)}</p>
                                    {m.time && <p className="text-[10px] text-slate-400">{m.time}</p>}
                                  </td>
                                  {/* Driver */}
                                  <td className="px-3 py-2.5 max-w-[160px]">
                                    <p className="text-slate-700 truncate" title={m.driverName}>{m.driverName}</p>
                                    {m.driverLicense && (
                                      <p className="text-slate-400 font-mono text-[10px] truncate" title={m.driverLicense}>DL {m.driverLicense}</p>
                                    )}
                                  </td>
                                  {/* Violation — code + severity + description */}
                                  <td className="px-3 py-2.5 max-w-[280px]">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold whitespace-nowrap">
                                        {m.violationCode}
                                      </code>
                                      <span className={cn(
                                        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                                        m.severity === 'OOS' ? 'bg-red-100 text-red-700 border-red-200'
                                          : m.severity === 'Critical' ? 'bg-rose-100 text-rose-700 border-rose-200'
                                          : m.severity === 'Serious' ? 'bg-amber-100 text-amber-700 border-amber-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200',
                                      )}>
                                        {m.severity}
                                      </span>
                                    </div>
                                    <p className="text-slate-700 mt-1 truncate" title={m.violationDescription}>
                                      {m.violationDescription}
                                    </p>
                                  </td>
                                  {/* Reference + secondary fields the source carried */}
                                  <td className="px-3 py-2.5 whitespace-nowrap">
                                    {primaryRef ? (
                                      <>
                                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{primaryRef.label}</p>
                                        <p className="font-mono text-[11px] text-slate-800">{primaryRef.value}</p>
                                      </>
                                    ) : (
                                      <span className="text-slate-300 text-[11px]">No reference #</span>
                                    )}
                                    {(m.city || m.state) && (
                                      <p className="text-[10px] text-slate-500 mt-1">
                                        {[m.city, m.state].filter(Boolean).join(', ')}
                                      </p>
                                    )}
                                    {m.convictionDate && primaryRef?.label !== 'Conviction #' && (
                                      <p className="text-[10px] text-slate-400">Convicted {fmtDate(m.convictionDate)}</p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={() => {
                                        setEditingRecord(buildPrefillFromExternal(m, carrierId));
                                        setEditModalOpen(true);
                                      }}
                                      className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination footer */}
                      <div className="border-t border-amber-200 px-3 py-2 flex items-center justify-between gap-3 flex-wrap bg-amber-50/40">
                        <div className="flex items-center gap-2 text-[11px] text-slate-600">
                          <span>Rows per page:</span>
                          <select
                            className="h-6 px-1.5 border border-slate-200 rounded bg-white text-[11px] focus:outline-none"
                            value={missingPerPage}
                            onChange={e => { setMissingPerPage(Number(e.target.value)); setMissingPage(1); }}
                          >
                            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <span className="ml-2 text-slate-400">
                            {startIdx + 1}-{Math.min(startIdx + missingPerPage, totalMissing)} of {totalMissing}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            disabled={safePageM <= 1}
                            onClick={() => setMissingPage(p => Math.max(1, p - 1))}
                            className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] text-slate-600 tabular-nums">
                            {safePageM} / {totalPagesM}
                          </span>
                          <button
                            disabled={safePageM >= totalPagesM}
                            onClick={() => setMissingPage(p => Math.min(totalPagesM, p + 1))}
                            className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                </div>
              </div>
            );
          })()}

          {/* ── BASIC category tab strip + sub-category KPI cards ─────────
              Same UX pattern as the Accidents page: top tabs partition the
              ledger by BASIC, and a grid of coloured KPI cards underneath
              narrows the table to a specific sub-category. */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Tab strip */}
            <div className="flex items-center gap-0.5 px-2 pt-2 overflow-x-auto border-b border-slate-200">
              {BASIC_TABS.map(t => {
                const active = basicTab === t.key;
                const count = basicCounts[t.key] ?? 0;
                const toneActive: Record<typeof t.tone, string> = {
                  slate:  'border-slate-900 text-slate-900',
                  blue:   'border-blue-600 text-blue-700',
                  rose:   'border-rose-600 text-rose-700',
                  amber:  'border-amber-600 text-amber-700',
                  violet: 'border-violet-600 text-violet-700',
                  orange: 'border-orange-600 text-orange-700',
                  red:    'border-red-600 text-red-700',
                  teal:   'border-teal-600 text-teal-700',
                };
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setBasicTab(t.key);
                      setSubCatFilter(null);
                      setPage(1);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px',
                      active
                        ? toneActive[t.tone]
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {t.label}
                    <span className={cn(
                      'inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                      active
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600',
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sub-category KPI cards */}
            {(() => {
              if (subCategoryBreakdown.length === 0) {
                return (
                  <div className="px-4 py-6 text-center text-[12px] text-slate-400 italic bg-slate-50/40">
                    No violations in this category for the current dataset.
                  </div>
                );
              }
              // Each card cycles through a coordinated palette so they read
              // as distinct sub-categories without competing with the page.
              const palette = [
                { bar: 'bg-sky-500',     bg: 'bg-sky-50/60',     count: 'text-sky-700',     chip: 'bg-sky-50 text-sky-700 ring-sky-200',         barBg: 'bg-sky-100',     barFill: 'bg-sky-500' },
                { bar: 'bg-violet-500',  bg: 'bg-violet-50/60',  count: 'text-violet-700',  chip: 'bg-violet-50 text-violet-700 ring-violet-200', barBg: 'bg-violet-100',  barFill: 'bg-violet-500' },
                { bar: 'bg-emerald-500', bg: 'bg-emerald-50/60', count: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', barBg: 'bg-emerald-100', barFill: 'bg-emerald-500' },
                { bar: 'bg-amber-500',   bg: 'bg-amber-50/60',   count: 'text-amber-700',   chip: 'bg-amber-50 text-amber-700 ring-amber-200',   barBg: 'bg-amber-100',   barFill: 'bg-amber-500' },
                { bar: 'bg-rose-500',    bg: 'bg-rose-50/60',    count: 'text-rose-700',    chip: 'bg-rose-50 text-rose-700 ring-rose-200',      barBg: 'bg-rose-100',    barFill: 'bg-rose-500' },
                { bar: 'bg-indigo-500',  bg: 'bg-indigo-50/60',  count: 'text-indigo-700',  chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', barBg: 'bg-indigo-100',  barFill: 'bg-indigo-500' },
                { bar: 'bg-teal-500',    bg: 'bg-teal-50/60',    count: 'text-teal-700',    chip: 'bg-teal-50 text-teal-700 ring-teal-200',      barBg: 'bg-teal-100',    barFill: 'bg-teal-500' },
                { bar: 'bg-fuchsia-500', bg: 'bg-fuchsia-50/60', count: 'text-fuchsia-700', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', barBg: 'bg-fuchsia-100', barFill: 'bg-fuchsia-500' },
              ];
              const tabCount = basicCounts[basicTab] ?? 1;
              return (
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Sub-categories — violation groups in this view
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Click a card to narrow the table to that violation group
                      </div>
                    </div>
                    {subCatFilter && (
                      <button
                        type="button"
                        onClick={() => setSubCatFilter(null)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                      >
                        Clear sub-filter <X size={11} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {subCategoryBreakdown.map(([type, count], i) => {
                      const selected = subCatFilter === type;
                      const sharePct = tabCount > 0 ? (count / tabCount) * 100 : 0;
                      const c = palette[i % palette.length];
                      return (
                        <button
                          type="button"
                          key={type}
                          onClick={() => {
                            setSubCatFilter(selected ? null : type);
                            setPage(1);
                          }}
                          title={`${type} — ${count} violation${count === 1 ? '' : 's'}`}
                          className={cn(
                            'group text-left rounded-lg border overflow-hidden shadow-sm transition-all flex flex-col h-full',
                            selected
                              ? 'border-slate-900 ring-2 ring-slate-900/20 bg-white'
                              : `border-slate-200 hover:border-slate-300 hover:shadow-md ${c.bg}`,
                          )}
                        >
                          <div className={cn('h-1 w-full', selected ? 'bg-slate-900' : c.bar)} />
                          <div className="px-3 py-2.5 flex-1 flex flex-col">
                            <div
                              className="text-[11px] font-semibold text-slate-700 leading-snug line-clamp-2 min-h-[2.6em]"
                              title={type}
                            >
                              {type}
                            </div>
                            <div className="flex items-end justify-between gap-2 mt-2">
                              <span
                                className={cn(
                                  'text-[22px] font-bold tabular-nums leading-none',
                                  selected ? 'text-slate-900' : c.count,
                                )}
                              >
                                {count}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-md ring-1',
                                  selected
                                    ? 'text-slate-900 bg-white ring-slate-300'
                                    : c.chip,
                                )}
                              >
                                {sharePct.toFixed(0)}%
                              </span>
                            </div>
                            <div className={cn(
                              'mt-2 h-1 rounded-full overflow-hidden',
                              selected ? 'bg-slate-200' : c.barBg,
                            )}>
                              <div
                                className={cn('h-full rounded-full transition-all', selected ? 'bg-slate-900' : c.barFill)}
                                style={{ width: `${Math.min(100, sharePct)}%` }}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Divider between sub-category cards and the search / filter row.
                Both sections live inside ONE rounded card so they read as a
                single component — no gap. */}
            <div className="border-t border-slate-200" />

            {/* Filters — search, source pills, date range, status / risk / result */}
            <div className="p-3 space-y-2.5">
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
                {availableSources.map(s => {
                  const count = s === 'all' ? carrierUnified.all.length : sourceCounts[s];
                  return (
                    <button
                      key={s}
                      onClick={() => { setSourceFilter(s); setPage(1); }}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border transition-colors',
                        sourceFilter === s
                          ? s === 'SMS' ? 'bg-blue-600 text-white border-blue-600'
                            : s === 'NSC' ? 'bg-emerald-600 text-white border-emerald-600'
                            : s === 'CVOR' ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      )}
                    >
                      {s === 'all' ? 'All Sources' : s}
                      <span className={cn(
                        'inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded text-[10px] font-bold tabular-nums',
                        sourceFilter === s ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                      )}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Row 2: Date range + dropdowns + Reset link
                Date pickers mirror the Accidents page: two separate inputs
                with a Calendar icon inside each, dash separator, white bg. */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                    aria-label="From date"
                    className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  />
                </div>
                <span className="text-slate-400">-</span>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={e => { setDateTo(e.target.value); setPage(1); }}
                    aria-label="To date"
                    className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                  />
                </div>
              </div>

              <select
                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={jurisdictionFilter}
                onChange={e => { setJurisdictionFilter(e.target.value); setPage(1); }}
                title="Filter by state / province"
              >
                <option value="all">All Jurisdictions</option>
                {/* USA group */}
                {jurisdictions.some(j => j.country === 'US') && (
                  <optgroup label="🇺🇸 United States (FMCSA SMS)">
                    {jurisdictions.filter(j => j.country === 'US').map(j => (
                      <option key={`US-${j.state}`} value={j.state}>{j.state} · {j.count}</option>
                    ))}
                  </optgroup>
                )}
                {/* Canada group */}
                {jurisdictions.some(j => j.country === 'CA') && (
                  <optgroup label="🇨🇦 Canada (CVOR / NSC)">
                    {jurisdictions.filter(j => j.country === 'CA').map(j => (
                      <option key={`CA-${j.state}`} value={j.state}>{j.state} · {j.count}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <select
                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={riskFilter}
                onChange={e => { setRiskFilter(e.target.value as typeof riskFilter); setPage(1); }}
              >
                <option value="all">All Risk Levels</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select
                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                <>
                  <div className="h-6 w-px bg-slate-300 mx-1 hidden sm:block" />
                  <button
                    onClick={clearFilters}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    Reset filters
                  </button>
                </>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {filtered.length.toLocaleString()} results
              </span>
            </div>
            </div>

            {/* Divider between the filter row and the table — keeps the
                table inside the SAME card so there's no gap between filters
                and results. */}
            <div className="border-t border-slate-200" />

            {/* Table — sits flush inside the combined card. */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date/Time</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Driver / Asset</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">OOS</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</th>
                    <th className="w-8" />
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-slate-400 text-sm">
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
                          <td className="px-3 py-2.5 max-w-[190px]">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-3 h-3 text-slate-400 shrink-0" />
                              <p className="font-semibold text-slate-700 text-xs truncate">{v.driverName || '—'}</p>
                            </div>
                            {v.driverId && (
                              <p className="text-[10px] text-slate-400 font-mono ml-4 truncate">{v.driverId}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                              <p className="text-xs text-slate-500 font-mono truncate">{v.vehicleUnit}</p>
                              {v.vehiclePlate && v.vehiclePlate !== '—' && (
                                <span className="text-[10px] text-slate-400 font-mono shrink-0">· {v.vehiclePlate}</span>
                              )}
                            </div>
                          </td>
                          {/* Location */}
                          <td className="px-3 py-2.5 max-w-[140px]">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <p className="text-xs text-slate-700 truncate">{v.location || '—'}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 ml-4">{v.locationCountry}</p>
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
                          {/* Inline edit (pencil) + remove (trash) */}
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Edit violation"
                                aria-label="Edit violation"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const original = recordsById.get(v.id);
                                  if (original) {
                                    setEditingRecord(original);
                                    setEditModalOpen(true);
                                  }
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Remove violation"
                                aria-label="Remove violation"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const original = recordsById.get(v.id);
                                  if (original) setRemoveCandidate(original);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
                              <ExpandedPanel
                                v={v}
                                verifiedBy={VERIFIED_BY_ROW_ID[v.id] ?? []}
                              />
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

      {/* Add/Edit form is rendered as a dedicated page above (early return). */}

      {/* ── Remove confirmation dialog — asks the user to confirm before
          destructively removing a violation from the carrier ledger. */}
      {removeCandidate && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setRemoveCandidate(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900">Remove this violation?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="font-mono font-semibold">{removeCandidate.violationCode}</span>
                  {removeCandidate.ticketNumber && (
                    <> (ticket <span className="font-mono">{removeCandidate.ticketNumber}</span>)</>
                  )} will be removed from your violation log. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveCandidate(null)}
                className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setRemovedIds(prev => {
                    const next = new Set(prev);
                    next.add(removeCandidate.id);
                    return next;
                  });
                  setRemoveCandidate(null);
                  setExpandedId(null);
                }}
                className="h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 shadow-sm inline-flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Remove violation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
