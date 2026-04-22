import { useRef, useState } from 'react';
import { Upload, FileText, X, FileSpreadsheet, Download, Loader2, CheckCircle2, Lock, Plus, Trash2 } from 'lucide-react';
import { US_STATE_ABBREVS, CA_PROVINCE_ABBREVS } from '@/data/geo-data';

// ───────────────────────────── Shared types ─────────────────────────────

export type InspectionKind = 'fmcsa' | 'cvor' | 'ab' | 'bc' | 'pe' | 'ns';

export interface UploadedReportFile {
  name: string;
  size: number;
  type: string;
}

// ───────────────────────────── Jurisdiction form data shapes ─────────────────────────────

export interface AbNscFormData {
  // Carrier identity
  carrierName:       string;
  nscNumber:         string;
  mvidNumber:        string;
  operatingStatus:   string;    // "Federal" | "Provincial"
  fleetType:         string;    // "Truck" | "Bus" | ...
  fleetRange:        string;    // e.g. "30.0-44.9"

  // Latest pull
  profileDate:       string;    // "YYYY MMM DD"
  rFactor:           string;
  monitoringStage:   string;    // Stage on the profile
  fleetCurrent:      string;
  fleetAvg:          string;

  // Contributions
  convictionsPct:          string;
  convictionsEvents:       string;
  adminPenaltiesPct:       string;
  adminPenaltiesEvents:    string;
  cvsaPct:                 string;
  cvsaEvents:              string;
  collisionsPct:           string;
  collisionsEvents:        string;

  // Safety Fitness Certificate
  certNumber:        string;
  certEffective:     string;
  certExpiry:        string;
  safetyRating:      string;

  // Monitoring snapshot (month-end)
  monitoringAsOf:       string;
  monitoringRFactor:    string;
  monitoringStageLatest:string;
  totalCarriersAB:      string;

  // Conviction totals
  convictionDocs:    string;
  convictionCount:   string;
  convictionPoints:  string;

  // Event lists
  convictions:        AbConvictionEvent[];
  cvsaInspections:    AbCvsaEvent[];
  collisions:         AbCollisionEvent[];
  adminPenalties:     AbAdminPenaltyEvent[];
  historicalEvents:   AbHistoricalEvent[];
}

export interface AbConvictionEvent    { id: string; date: string; documentNo: string; docketNo: string; jurisdiction: string; plate: string; driver: string; offence: string; points: string; }
export interface AbCvsaEvent          { id: string; date: string; documentNo: string; jurisdiction: string; agency: string; plate: string; level: string; result: string; }
export interface AbCollisionEvent     { id: string; date: string; documentNo: string; plate: string; severity: string; preventable: string; points: string; driver: string; }
export interface AbAdminPenaltyEvent  { id: string; date: string; documentNo: string; description: string; points: string; }
export interface AbHistoricalEvent    { id: string; date: string; type: string; description: string; }

export interface BcNscFormData {
  carrierName: string;
  nscNumber: string;
  asOfDate: string;             // "DD-MMM-YYYY"
  averageFleetSize: string;
  contraventionScore: string;
  contraventionEvents: string;
  cvsaScore: string;
  cvsaEvents: string;
  accidentScore: string;
  accidentEvents: string;
  totalScore: string;
  safetyRating: string;
  certificateStatus: string;

  // Event lists (aligned to BC NSC Performance page)
  profileScores:    BcProfileScoreRow[];
  activeFleet:      BcFleetRow[];
  driverGuilty:     BcContraventionRow[];
  carrierGuilty:    BcContraventionRow[];
  driverPending:    BcContraventionRow[];
  carrierPending:   BcContraventionRow[];
  cvsaInspections:  BcCvsaRecRow[];
  accidents:        BcAccidentRow[];
  auditSummary:     BcAuditRow[];
  cvip:             BcCvipRow[];
}

export interface BcProfileScoreRow { id: string; month: string; vd: string; ad: string; avg: string; contra: string; cvsa: string; acc: string; total: string; }
export interface BcFleetRow        { id: string; regi: string; plate: string; year: string; make: string; owner: string; gvw: string; }
export interface BcContraventionRow{ id: string; driverName: string; dl: string; dlJur: string; date: string; ticket: string; plate: string; location: string; juris: string; act: string; section: string; desc: string; pts: string; }
export interface BcCvsaRecRow      { id: string; date: string; inspectionNo: string; level: string; plate: string; driver: string; defects: string; result: string; }
export interface BcAccidentRow     { id: string; date: string; time: string; report: string; location: string; jur: string; driverName: string; plate: string; vehDesc: string; type: string; fault: string; charges: string; pts: string; }
export interface BcAuditRow        { id: string; date: string; auditType: string; result: string; notes: string; }
export interface BcCvipRow         { id: string; regi: string; plate: string; vehicle: string; date: string; type: string; facility: string; expiry: string; result: string; }

export interface PeiNscFormData {
  carrierName: string;
  nscNumber: string;
  profileAsOf: string;          // "YYYY/MM/DD"
  collisionPoints: string;
  convictionPoints: string;
  inspectionPoints: string;
  currentActiveVehicles: string;
  currentActiveVehiclesAtLastAssessment: string;
  safetyRating: string;
  certStatus: string;
  auditStatus: string;

  // Event lists (aligned to PEI NSC Performance page)
  collisions:   PeiCollisionEvent[];
  convictions:  PeiConvictionEvent[];
  inspections:  PeiInspectionEvent[];
  audits:       PeiAuditEvent[];
}

export interface PeiCollisionEvent  { id: string; date: string; severity: string; caseNum: string; fault: string; vehicles: string; killed: string; injured: string; pts: string; }
export interface PeiConvictionEvent { id: string; date: string; loc: string; charge: string; natCode: string; pts: string; }
export interface PeiInspectionEvent { id: string; date: string; cvsaLevel: string; log: string; tdg: string; loadSecurity: string; driverName: string; status: string; }
export interface PeiAuditEvent      { id: string; date: string; result: string; auditType: string; }

export interface NsNscFormData {
  carrierName: string;
  nscNumber: string;
  profileAsOf: string;          // "DD/MM/YYYY"
  currentFleetSize: string;
  avgDailyFleetSize: string;
  convictionScore: string;
  inspectionScore: string;
  collisionScore: string;
  scoreLevel1: string;
  scoreLevel2: string;
  scoreLevel3: string;
  safetyRating: string;
  safetyRatingExpires: string;

  // Event lists (aligned to NS NSC Performance page)
  cvsaInspections: NsCvsaEvent[];
  auditHistory:    NsAuditEvent[];
  convictions:     NsConvictionEvent[];
  collisions:      NsCollisionEvent[];
  trafficOffences: NsTrafficOffenceEvent[];
}

export interface NsCvsaEvent           { id: string; date: string; cvsaNumber: string; jur: string; plates: string; driverMaster: string; result: string; demeritPts: string; }
export interface NsAuditEvent          { id: string; date: string; auditNum: string; sequence: string; result: string; }
export interface NsConvictionEvent     { id: string; offenceDate: string; convDate: string; ticket: string; offence: string; driverMaster: string; sectionActReg: string; pts: string; }
export interface NsCollisionEvent      { id: string; date: string; severity: string; location: string; driverMaster: string; driverJur: string; plate: string; plateJur: string; pts: string; }
export interface NsTrafficOffenceEvent { id: string; offenceDate: string; plate: string; driverMaster: string; statute: string; description: string; }

// ───────────────────────────── Empty defaults ─────────────────────────────

export const EMPTY_AB: AbNscFormData = {
  carrierName: '', nscNumber: '', mvidNumber: '', operatingStatus: 'Federal',
  fleetType: 'Truck', fleetRange: '',
  profileDate: '', rFactor: '', monitoringStage: 'Not Monitored',
  fleetCurrent: '', fleetAvg: '',
  convictionsPct: '', convictionsEvents: '',
  adminPenaltiesPct: '', adminPenaltiesEvents: '',
  cvsaPct: '', cvsaEvents: '',
  collisionsPct: '', collisionsEvents: '',
  certNumber: '', certEffective: '', certExpiry: '',
  safetyRating: 'Satisfactory',
  monitoringAsOf: '', monitoringRFactor: '', monitoringStageLatest: 'Not on Monitoring',
  totalCarriersAB: '',
  convictionDocs: '', convictionCount: '', convictionPoints: '',
  convictions: [], cvsaInspections: [], collisions: [], adminPenalties: [], historicalEvents: [],
};

export const EMPTY_BC: BcNscFormData = {
  carrierName: '', nscNumber: '', asOfDate: '', averageFleetSize: '',
  contraventionScore: '', contraventionEvents: '',
  cvsaScore: '', cvsaEvents: '',
  accidentScore: '', accidentEvents: '',
  totalScore: '', safetyRating: 'Satisfactory', certificateStatus: 'Active',
  profileScores: [], activeFleet: [],
  driverGuilty: [], carrierGuilty: [], driverPending: [], carrierPending: [],
  cvsaInspections: [], accidents: [], auditSummary: [], cvip: [],
};

export const EMPTY_PEI: PeiNscFormData = {
  carrierName: '', nscNumber: '', profileAsOf: '',
  collisionPoints: '', convictionPoints: '', inspectionPoints: '',
  currentActiveVehicles: '', currentActiveVehiclesAtLastAssessment: '',
  safetyRating: 'Satisfactory', certStatus: 'Active', auditStatus: 'Unaudited',
  collisions: [], convictions: [], inspections: [], audits: [],
};

export const EMPTY_NS: NsNscFormData = {
  carrierName: '', nscNumber: '', profileAsOf: '',
  currentFleetSize: '', avgDailyFleetSize: '',
  convictionScore: '', inspectionScore: '', collisionScore: '',
  scoreLevel1: '', scoreLevel2: '', scoreLevel3: '',
  safetyRating: 'Satisfactory', safetyRatingExpires: '',
  cvsaInspections: [], auditHistory: [], convictions: [], collisions: [], trafficOffences: [],
};

// ───────────────────────────── Inline UI helpers ─────────────────────────────

const INPUT_CLS = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const LABEL_CLS = 'text-[11px] font-bold text-slate-500 uppercase tracking-wider';
const SECTION_TITLE_CLS = 'text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-3';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={LABEL_CLS}>{label}</label>
      {children}
    </div>
  );
}

// ───────────────────────────── PDF / DOC upload dropzone ─────────────────────────────

export function ReportUploadDropzone({
  file, onChange, onExtract, extractLabel,
}: {
  file: UploadedReportFile | null;
  onChange: (f: UploadedReportFile | null) => void;
  onExtract?: () => void;
  extractLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [extractStatus, setExtractStatus] = useState<'idle' | 'extracting' | 'extracted'>('idle');

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    onChange({ name: f.name, size: f.size, type: f.type });
    setExtractStatus('idle');
  };

  const runExtract = async () => {
    if (!onExtract) return;
    setExtractStatus('extracting');
    await new Promise(res => setTimeout(res, 900));
    onExtract();
    setExtractStatus('extracted');
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div>
      <h4 className={SECTION_TITLE_CLS}>Attach Report (PDF / DOC)</h4>
      {file ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50/60 rounded-xl p-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={18}/> : <FileSpreadsheet size={18}/>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate">{file.name}</div>
              <div className="text-[11px] text-slate-500">{formatBytes(file.size)} &middot; {file.type || 'unknown'}</div>
            </div>
            {onExtract && (
              <button
                type="button"
                onClick={runExtract}
                disabled={extractStatus === 'extracting'}
                className="h-[34px] px-3 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {extractStatus === 'extracting'
                  ? (<><Loader2 size={12} className="animate-spin"/> Extracting&hellip;</>)
                  : extractStatus === 'extracted'
                    ? (<><CheckCircle2 size={12}/> Re-extract</>)
                    : (<><Download size={12}/> {extractLabel ?? 'Extract Data'}</>)}
              </button>
            )}
            <button
              type="button"
              onClick={() => { onChange(null); setExtractStatus('idle'); if (inputRef.current) inputRef.current.value = ''; }}
              className="text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 p-1.5 rounded-md transition-colors"
            >
              <X size={16}/>
            </button>
          </div>
          {extractStatus === 'extracted' && (
            <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 size={12}/> Form fields populated from the uploaded document. Review values below and adjust as needed.
            </div>
          )}
        </div>
      ) : (
        <label
          htmlFor="report-upload-input"
          className="border-2 border-dashed border-blue-200 bg-blue-50/50 rounded-xl p-6 text-center cursor-pointer hover:bg-blue-50 transition-colors group block"
        >
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
            <Upload size={18}/>
          </div>
          <p className="text-sm font-bold text-blue-900">Click to upload or drag and drop</p>
          <p className="text-[12px] text-blue-600/70">PDF, DOC, DOCX (max 10MB)</p>
        </label>
      )}
      <input
        ref={inputRef}
        id="report-upload-input"
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx"
        onChange={e => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ───────────────────────────── Generic EventListSection ─────────────────────────────

export type EventColumn<T> =
  | { key: keyof T & string; label: string; type: 'text' | 'date' | 'number'; placeholder?: string }
  | { key: keyof T & string; label: string; type: 'select'; options: string[] };

export function makeEventId() {
  return `ev-${Math.random().toString(36).slice(2, 10)}`;
}

export function EventListSection<T extends { id: string }>({
  title,
  subtitle,
  columns,
  value,
  onChange,
  makeEmpty,
  emptyHint,
  addLabel = 'Add Entry',
}: {
  title: string;
  subtitle?: string;
  columns: EventColumn<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  makeEmpty: () => T;
  emptyHint?: string;
  addLabel?: string;
}) {
  const add = () => onChange([...value, makeEmpty()]);
  const update = (i: number, key: keyof T, v: string) =>
    onChange(value.map((row, idx) => idx === i ? { ...row, [key]: v } : row));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className={SECTION_TITLE_CLS + ' mb-0'}>{title}</h4>
          {subtitle && <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2">
          {value.length > 0 && (
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{value.length} {value.length === 1 ? 'RECORD' : 'RECORDS'}</span>
          )}
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={12}/> {addLabel}
          </button>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-4 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          {emptyHint ?? 'No entries yet.'}
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((row, i) => (
            <div key={row.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="grid grid-cols-4 gap-3 flex-1 min-w-0">
                  {columns.map(col => (
                    <div key={col.key} className="space-y-1 min-w-0">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block truncate">{col.label}</label>
                      {col.type === 'select' ? (
                        <select
                          className={INPUT_CLS + ' bg-white'}
                          value={(row[col.key] as unknown as string) ?? ''}
                          onChange={e => update(i, col.key, e.target.value)}
                        >
                          <option value="">Select&hellip;</option>
                          {col.options.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={col.type}
                          className={INPUT_CLS}
                          placeholder={col.placeholder}
                          value={(row[col.key] as unknown as string) ?? ''}
                          onChange={e => update(i, col.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="mt-[22px] h-[38px] w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg bg-white hover:bg-red-50 transition-colors flex-shrink-0"
                  title="Remove entry"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── FMCSA (SMS) form ─────────────────────────────

export interface FmcsaViolationRow {
  code:        string;
  category:    string;  // BASIC category
  description: string;
  severity:    string;  // numeric string
  weight:      string;  // numeric string (default "3")
  points:      string;  // numeric string
  oos:         boolean;
  driverRiskCategory: string; // numeric string 1-3
}

export interface FmcsaFormData {
  reportNumber:     string;
  inspectionDate:   string;   // YYYY-MM-DD
  state:            string;   // US abbr
  level:            string;   // "Level 1" .. "Level 8"
  startTime:        string;   // HH:MM
  endTime:          string;   // HH:MM
  locationCity:     string;
  locationStreet:   string;
  locationZip:      string;
  driverId:         string;   // free-form or dropdown
  driver:           string;
  driverLicense:    string;
  vehiclePlate:     string;
  vehicleType:      string;
  assetId:          string;
  powerUnitDefects: string;
  trailerDefects:   string;
  violations:       FmcsaViolationRow[];
}

export const EMPTY_FMCSA: FmcsaFormData = {
  reportNumber: '', inspectionDate: '', state: '', level: '',
  startTime: '', endTime: '',
  locationCity: '', locationStreet: '', locationZip: '',
  driverId: '', driver: '', driverLicense: '',
  vehiclePlate: '', vehicleType: 'Truck', assetId: '',
  powerUnitDefects: '', trailerDefects: '',
  violations: [],
};

const FMCSA_LEVELS = [
  'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8',
];

const BASIC_CATEGORIES = [
  'Unsafe Driving',
  'Crash Indicator',
  'Hours-of-service Compliance',
  'Vehicle Maintenance',
  'Controlled Substances/Alcohol',
  'Hazardous Materials Compliance',
  'Driver Fitness',
];

export function FmcsaInspectionForm({
  value, onChange,
}: {
  value: FmcsaFormData;
  onChange: (next: FmcsaFormData) => void;
}) {
  const set = <K extends keyof FmcsaFormData>(k: K, v: FmcsaFormData[K]) => onChange({ ...value, [k]: v });

  const addViolation = () => set('violations', [
    ...value.violations,
    { code: '', category: 'Vehicle Maintenance', description: '', severity: '1', weight: '3', points: '3', oos: false, driverRiskCategory: '3' },
  ]);
  const updateViolation = (i: number, patch: Partial<FmcsaViolationRow>) =>
    set('violations', value.violations.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  const removeViolation = (i: number) =>
    set('violations', value.violations.filter((_, idx) => idx !== i));

  // Auto-summary of SMS points (driver vs vehicle vs carrier)
  const driverCats = new Set(['Unsafe Driving', 'Hours-of-service Compliance', 'Driver Fitness', 'Controlled Substances/Alcohol']);
  const vehicleCats = new Set(['Vehicle Maintenance', 'Hazardous Materials Compliance']);
  let driverPts = 0, vehiclePts = 0, carrierPts = 0;
  for (const v of value.violations) {
    const p = +v.points || 0;
    if (driverCats.has(v.category))       driverPts  += p;
    else if (vehicleCats.has(v.category)) vehiclePts += p;
    else                                   carrierPts += p;
  }
  const totalOos = value.violations.filter(v => v.oos).length;

  return (
    <div className="space-y-6">
      <div>
        <h4 className={SECTION_TITLE_CLS}>FMCSA &middot; Inspection Basics</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Report Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. MIGRAHA00829" value={value.reportNumber} onChange={e => set('reportNumber', e.target.value)}/>
          </Field>
          <Field label="Inspection Date">
            <input type="date" className={INPUT_CLS} value={value.inspectionDate} onChange={e => set('inspectionDate', e.target.value)}/>
          </Field>
          <Field label="Level">
            <select className={INPUT_CLS + ' bg-white'} value={value.level} onChange={e => set('level', e.target.value)}>
              <option value="">Select&hellip;</option>
              {FMCSA_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="State">
            <select className={INPUT_CLS + ' bg-white'} value={value.state} onChange={e => set('state', e.target.value)}>
              <option value="">Select&hellip;</option>
              {Object.entries(US_STATE_ABBREVS).map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{abbr} &mdash; {name}</option>
              ))}
            </select>
          </Field>
          <Field label="Start Time">
            <input type="time" className={INPUT_CLS} value={value.startTime} onChange={e => set('startTime', e.target.value)}/>
          </Field>
          <Field label="End Time">
            <input type="time" className={INPUT_CLS} value={value.endTime} onChange={e => set('endTime', e.target.value)}/>
          </Field>
          <Field label="Street">
            <input type="text" className={INPUT_CLS} placeholder="e.g. I-94 Mile 178" value={value.locationStreet} onChange={e => set('locationStreet', e.target.value)}/>
          </Field>
          <Field label="City">
            <input type="text" className={INPUT_CLS} placeholder="e.g. Battle Creek" value={value.locationCity} onChange={e => set('locationCity', e.target.value)}/>
          </Field>
          <Field label="ZIP">
            <input type="text" className={INPUT_CLS} placeholder="e.g. 49015" value={value.locationZip} onChange={e => set('locationZip', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Driver &amp; Vehicle</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Driver ID">
            <input type="text" className={INPUT_CLS} placeholder="e.g. DRV-2001" value={value.driverId} onChange={e => set('driverId', e.target.value)}/>
          </Field>
          <Field label="Driver Name">
            <input type="text" className={INPUT_CLS} placeholder="Full name as on license" value={value.driver} onChange={e => set('driver', e.target.value)}/>
          </Field>
          <Field label="Driver License #">
            <input type="text" className={INPUT_CLS} placeholder="e.g. D1234-5678-9012" value={value.driverLicense} onChange={e => set('driverLicense', e.target.value)}/>
          </Field>
          <Field label="Asset ID">
            <input type="text" className={INPUT_CLS} placeholder="e.g. a1" value={value.assetId} onChange={e => set('assetId', e.target.value)}/>
          </Field>
          <Field label="Vehicle Plate">
            <input type="text" className={INPUT_CLS} placeholder="e.g. ABC-123" value={value.vehiclePlate} onChange={e => set('vehiclePlate', e.target.value)}/>
          </Field>
          <Field label="Vehicle Type">
            <select className={INPUT_CLS + ' bg-white'} value={value.vehicleType} onChange={e => set('vehicleType', e.target.value)}>
              <option>Truck</option>
              <option>Truck Tractor</option>
              <option>Trailer</option>
              <option>Bus</option>
            </select>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Defects Found</h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Power Unit Defects">
            <textarea className={INPUT_CLS + ' min-h-[72px]'} placeholder="Free-form text from the report" value={value.powerUnitDefects} onChange={e => set('powerUnitDefects', e.target.value)}/>
          </Field>
          <Field label="Trailer Defects">
            <textarea className={INPUT_CLS + ' min-h-[72px]'} placeholder="Free-form text from the report" value={value.trailerDefects} onChange={e => set('trailerDefects', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className={SECTION_TITLE_CLS + ' mb-0'}>Violations</h4>
          <button
            type="button"
            onClick={addViolation}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={12}/> Add Violation
          </button>
        </div>

        {value.violations.length === 0 ? (
          <div className="text-center py-5 text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            No violations. Click "Add Violation" if the inspection had any.
          </div>
        ) : (
          <div className="space-y-2">
            {value.violations.map((v, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-[1fr_1.6fr_auto] gap-3 mb-2">
                  <Field label="Code">
                    <input type="text" className={INPUT_CLS} placeholder="e.g. 393.47A-BSF" value={v.code} onChange={e => updateViolation(i, { code: e.target.value })}/>
                  </Field>
                  <Field label="BASIC Category">
                    <select className={INPUT_CLS + ' bg-white'} value={v.category} onChange={e => updateViolation(i, { category: e.target.value })}>
                      {BASIC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeViolation(i)}
                    className="self-end h-[38px] w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg bg-white hover:bg-red-50 transition-colors"
                    title="Remove violation"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
                <Field label="Description">
                  <input type="text" className={INPUT_CLS} placeholder="Full description from the report" value={v.description} onChange={e => updateViolation(i, { description: e.target.value })}/>
                </Field>
                <div className="grid grid-cols-5 gap-3 mt-2">
                  <Field label="Severity">
                    <input type="number" className={INPUT_CLS} placeholder="1" value={v.severity} onChange={e => updateViolation(i, { severity: e.target.value })}/>
                  </Field>
                  <Field label="Weight">
                    <input type="number" className={INPUT_CLS} placeholder="3" value={v.weight} onChange={e => updateViolation(i, { weight: e.target.value })}/>
                  </Field>
                  <Field label="Points">
                    <input type="number" className={INPUT_CLS} placeholder="3" value={v.points} onChange={e => updateViolation(i, { points: e.target.value })}/>
                  </Field>
                  <Field label="Driver Risk (1-3)">
                    <input type="number" min={1} max={3} className={INPUT_CLS} value={v.driverRiskCategory} onChange={e => updateViolation(i, { driverRiskCategory: e.target.value })}/>
                  </Field>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLS}>OOS</label>
                    <label className="inline-flex items-center gap-2 h-[38px] px-3 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={v.oos} onChange={e => updateViolation(i, { oos: e.target.checked })}/>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{v.oos ? 'Out of Service' : 'In Service'}</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>SMS Points Summary (auto)</h4>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Driver Points',  value: driverPts,  color: '#d97706' },
            { label: 'Vehicle Points', value: vehiclePts, color: '#dc2626' },
            { label: 'Carrier Points', value: carrierPts, color: '#2563eb' },
            { label: 'OOS Violations', value: totalOos,   color: '#991b1b' },
          ].map(b => (
            <div key={b.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{b.label}</div>
              <div className="text-[22px] font-black font-mono" style={{ color: b.color }}>{b.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── CVOR (Ontario) form ─────────────────────────────

export interface CvorViolationRow {
  code:        string;    // HTA / O.Reg / TDG / Criminal Code reference
  category:    string;    // CVOR category
  description: string;
  severity:    string;
  weight:      string;
  points:      string;
  oos:         boolean;
  driverRiskCategory: string;
}

export interface AttachedDocument {
  id:         string;
  docType:    string;
  docNumber:  string;
  issueDate:  string;
  fileName:   string;
  fileSize:   number;
}
export type CvorAttachedDocument = AttachedDocument;

// Generic attached-documents editor. Reusable across CVOR/AB/BC/PEI/NS forms.
export function AttachedDocumentsSection({
  title = 'Attached Documents',
  docTypes,
  value,
  onChange,
  emptyHint,
}: {
  title?: string;
  docTypes: string[];
  value: AttachedDocument[];
  onChange: (next: AttachedDocument[]) => void;
  emptyHint?: string;
}) {
  const add = () => onChange([
    ...value,
    { id: `doc-${Math.random().toString(36).substr(2, 9)}`, docType: docTypes[0] ?? '', docNumber: '', issueDate: '', fileName: '', fileSize: 0 },
  ]);
  const update = (i: number, patch: Partial<AttachedDocument>) =>
    onChange(value.map((d, idx) => idx === i ? { ...d, ...patch } : d));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className={SECTION_TITLE_CLS + ' mb-0'}>{title}</h4>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Plus size={12}/> Add Document
        </button>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-5 text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          {emptyHint ?? 'No documents attached.'}
        </div>
      ) : (
        <div className="space-y-2">
          {value.map((d, i) => (
            <div key={d.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_auto] gap-3 mb-2">
                <Field label="Document Type">
                  <select className={INPUT_CLS + ' bg-white'} value={d.docType} onChange={e => update(i, { docType: e.target.value })}>
                    {docTypes.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Document #">
                  <input type="text" className={INPUT_CLS} placeholder="Reference / ID" value={d.docNumber} onChange={e => update(i, { docNumber: e.target.value })}/>
                </Field>
                <Field label="Issue Date">
                  <input type="date" className={INPUT_CLS} value={d.issueDate} onChange={e => update(i, { issueDate: e.target.value })}/>
                </Field>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="self-end h-[38px] w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg bg-white hover:bg-red-50 transition-colors"
                  title="Remove document"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL_CLS}>File</label>
                <label className="flex items-center gap-3 border-2 border-dashed border-slate-200 rounded-lg p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                    {d.fileName ? <FileText size={16}/> : <Upload size={16}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    {d.fileName ? (
                      <>
                        <div className="text-[12px] font-bold text-slate-800 truncate">{d.fileName}</div>
                        <div className="text-[10px] text-slate-500">{(d.fileSize / 1024).toFixed(1)} KB</div>
                      </>
                    ) : (
                      <>
                        <div className="text-[12px] font-bold text-slate-700">Click to upload</div>
                        <div className="text-[10px] text-slate-500">PDF, DOC, DOCX, JPG, PNG</div>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) update(i, { fileName: f.name, fileSize: f.size });
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface CvorFormData {
  reportNumber:     string;
  inspectionDate:   string;
  province:         string;   // CA abbr — ON/QC/etc.
  level:            string;   // "Level 1" .. "Level 5"
  startTime:        string;
  endTime:          string;
  locationCity:     string;
  locationStreet:   string;
  locationPostal:   string;
  driverId:         string;
  driver:           string;
  driverLicense:    string;
  vehiclePlate:     string;
  vehicleType:      string;
  assetId:          string;
  vin:              string;
  powerUnitDefects: string;
  trailerDefects:   string;
  oosDriver:        'PASSED' | 'FAILED';
  oosVehicle:       'PASSED' | 'FAILED';
  fineAmount:       string;
  currency:         'CAD' | 'USD';
  violations:       CvorViolationRow[];
  attachedDocs:     CvorAttachedDocument[];
}

export const EMPTY_CVOR: CvorFormData = {
  reportNumber: '', inspectionDate: '', province: 'ON', level: '',
  startTime: '', endTime: '',
  locationCity: '', locationStreet: '', locationPostal: '',
  driverId: '', driver: '', driverLicense: '',
  vehiclePlate: '', vehicleType: 'Truck', assetId: '', vin: '',
  powerUnitDefects: '', trailerDefects: '',
  oosDriver: 'PASSED', oosVehicle: 'PASSED',
  fineAmount: '', currency: 'CAD',
  violations: [],
  attachedDocs: [],
};

const CVOR_LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'];

const CVOR_CATEGORIES = [
  'Vehicle Maintenance',
  'Unsafe Driving',
  'Hours-of-service Compliance',
  'Driver Fitness',
  'Hazardous Materials Compliance',
  'Controlled Substances/Alcohol',
];

const CVOR_DOC_TYPES = [
  'Inspection Report',
  'Driver Statement',
  'Vehicle Inspection Report (VIR)',
  'Work Order / Repair Invoice',
  'Bill of Lading',
  'Driver Log / ELD Record',
  'Proof of Insurance',
  'Permit / Registration',
  'Photograph Evidence',
  'MTO Correspondence',
  'Other',
];

export function CvorInspectionForm({
  value, onChange,
}: {
  value: CvorFormData;
  onChange: (next: CvorFormData) => void;
}) {
  const set = <K extends keyof CvorFormData>(k: K, v: CvorFormData[K]) => onChange({ ...value, [k]: v });

  const addViolation = () => set('violations', [
    ...value.violations,
    { code: '', category: 'Vehicle Maintenance', description: '', severity: '1', weight: '3', points: '3', oos: false, driverRiskCategory: '3' },
  ]);
  const updateViolation = (i: number, patch: Partial<CvorViolationRow>) =>
    set('violations', value.violations.map((v, idx) => idx === i ? { ...v, ...patch } : v));
  const removeViolation = (i: number) =>
    set('violations', value.violations.filter((_, idx) => idx !== i));

  // CVOR points split by violation category: driver-side vs vehicle-side
  const driverCats = new Set(['Unsafe Driving', 'Hours-of-service Compliance', 'Driver Fitness', 'Controlled Substances/Alcohol']);
  let driverPts = 0, vehiclePts = 0;
  for (const v of value.violations) {
    const p = +v.points || 0;
    if (driverCats.has(v.category)) driverPts  += p;
    else                            vehiclePts += p;
  }
  const totalCvorPts = driverPts + vehiclePts;

  return (
    <div className="space-y-6">
      <div>
        <h4 className={SECTION_TITLE_CLS}>CVOR &middot; Inspection Basics</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Report Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. ONWINDS16001" value={value.reportNumber} onChange={e => set('reportNumber', e.target.value)}/>
          </Field>
          <Field label="Inspection Date">
            <input type="date" className={INPUT_CLS} value={value.inspectionDate} onChange={e => set('inspectionDate', e.target.value)}/>
          </Field>
          <Field label="Level">
            <select className={INPUT_CLS + ' bg-white'} value={value.level} onChange={e => set('level', e.target.value)}>
              <option value="">Select&hellip;</option>
              {CVOR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Province">
            <select className={INPUT_CLS + ' bg-white'} value={value.province} onChange={e => set('province', e.target.value)}>
              {Object.entries(CA_PROVINCE_ABBREVS).map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{abbr} &mdash; {name}</option>
              ))}
            </select>
          </Field>
          <Field label="Start Time">
            <input type="time" className={INPUT_CLS} value={value.startTime} onChange={e => set('startTime', e.target.value)}/>
          </Field>
          <Field label="End Time">
            <input type="time" className={INPUT_CLS} value={value.endTime} onChange={e => set('endTime', e.target.value)}/>
          </Field>
          <Field label="Street / Highway">
            <input type="text" className={INPUT_CLS} placeholder="e.g. Hwy 401 Eastbound" value={value.locationStreet} onChange={e => set('locationStreet', e.target.value)}/>
          </Field>
          <Field label="City">
            <input type="text" className={INPUT_CLS} placeholder="e.g. Windsor" value={value.locationCity} onChange={e => set('locationCity', e.target.value)}/>
          </Field>
          <Field label="Postal Code">
            <input type="text" className={INPUT_CLS} placeholder="e.g. N9A 4J6" value={value.locationPostal} onChange={e => set('locationPostal', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Driver &amp; Vehicle</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Driver ID">
            <input type="text" className={INPUT_CLS} placeholder="e.g. DRV-3001" value={value.driverId} onChange={e => set('driverId', e.target.value)}/>
          </Field>
          <Field label="Driver Name">
            <input type="text" className={INPUT_CLS} placeholder="Full name as on licence" value={value.driver} onChange={e => set('driver', e.target.value)}/>
          </Field>
          <Field label="Driver Licence #">
            <input type="text" className={INPUT_CLS} placeholder="e.g. S1234-56789-01234" value={value.driverLicense} onChange={e => set('driverLicense', e.target.value)}/>
          </Field>
          <Field label="Asset ID">
            <input type="text" className={INPUT_CLS} placeholder="e.g. a1" value={value.assetId} onChange={e => set('assetId', e.target.value)}/>
          </Field>
          <Field label="Vehicle Plate">
            <input type="text" className={INPUT_CLS} placeholder="e.g. AB 12 345" value={value.vehiclePlate} onChange={e => set('vehiclePlate', e.target.value)}/>
          </Field>
          <Field label="Vehicle Type">
            <select className={INPUT_CLS + ' bg-white'} value={value.vehicleType} onChange={e => set('vehicleType', e.target.value)}>
              <option>Truck</option>
              <option>Truck Tractor</option>
              <option>Trailer</option>
              <option>Semi-Trailer</option>
              <option>Bus</option>
            </select>
          </Field>
          <Field label="VIN">
            <input type="text" className={INPUT_CLS} placeholder="17-char VIN" value={value.vin} onChange={e => set('vin', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>OOS &amp; Defects</h4>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <Field label="Driver OOS">
            <select className={INPUT_CLS + ' bg-white'} value={value.oosDriver} onChange={e => set('oosDriver', e.target.value as 'PASSED' | 'FAILED')}>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed (Out of Service)</option>
            </select>
          </Field>
          <Field label="Vehicle OOS">
            <select className={INPUT_CLS + ' bg-white'} value={value.oosVehicle} onChange={e => set('oosVehicle', e.target.value as 'PASSED' | 'FAILED')}>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed (Out of Service)</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Power Unit Defects">
            <textarea className={INPUT_CLS + ' min-h-[72px]'} placeholder="Free-form text from the report" value={value.powerUnitDefects} onChange={e => set('powerUnitDefects', e.target.value)}/>
          </Field>
          <Field label="Trailer Defects">
            <textarea className={INPUT_CLS + ' min-h-[72px]'} placeholder="Free-form text from the report" value={value.trailerDefects} onChange={e => set('trailerDefects', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Fine</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Fine Amount">
            <input type="number" step="0.01" className={INPUT_CLS} placeholder="0.00" value={value.fineAmount} onChange={e => set('fineAmount', e.target.value)}/>
          </Field>
          <Field label="Currency">
            <select className={INPUT_CLS + ' bg-white'} value={value.currency} onChange={e => set('currency', e.target.value as 'CAD' | 'USD')}>
              <option value="CAD">CAD</option>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className={SECTION_TITLE_CLS + ' mb-0'}>Violations (HTA / O.Reg / TDG / Criminal Code)</h4>
          <button
            type="button"
            onClick={addViolation}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={12}/> Add Violation
          </button>
        </div>

        {value.violations.length === 0 ? (
          <div className="text-center py-5 text-[12px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
            No violations. Click "Add Violation" if the inspection had any.
          </div>
        ) : (
          <div className="space-y-2">
            {value.violations.map((v, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="grid grid-cols-[1fr_1.6fr_auto] gap-3 mb-2">
                  <Field label="Code">
                    <input type="text" className={INPUT_CLS} placeholder="e.g. HTA s.128(1) / O.Reg.199/07 s.6(1)" value={v.code} onChange={e => updateViolation(i, { code: e.target.value })}/>
                  </Field>
                  <Field label="CVOR Category">
                    <select className={INPUT_CLS + ' bg-white'} value={v.category} onChange={e => updateViolation(i, { category: e.target.value })}>
                      {CVOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <button
                    type="button"
                    onClick={() => removeViolation(i)}
                    className="self-end h-[38px] w-[38px] flex items-center justify-center text-slate-400 hover:text-red-600 border border-slate-200 rounded-lg bg-white hover:bg-red-50 transition-colors"
                    title="Remove violation"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
                <Field label="Description">
                  <input type="text" className={INPUT_CLS} placeholder="Full description from the report" value={v.description} onChange={e => updateViolation(i, { description: e.target.value })}/>
                </Field>
                <div className="grid grid-cols-5 gap-3 mt-2">
                  <Field label="Severity">
                    <input type="number" className={INPUT_CLS} placeholder="1" value={v.severity} onChange={e => updateViolation(i, { severity: e.target.value })}/>
                  </Field>
                  <Field label="Weight">
                    <input type="number" className={INPUT_CLS} placeholder="3" value={v.weight} onChange={e => updateViolation(i, { weight: e.target.value })}/>
                  </Field>
                  <Field label="CVOR Points">
                    <input type="number" className={INPUT_CLS} placeholder="3" value={v.points} onChange={e => updateViolation(i, { points: e.target.value })}/>
                  </Field>
                  <Field label="Driver Risk (1-3)">
                    <input type="number" min={1} max={3} className={INPUT_CLS} value={v.driverRiskCategory} onChange={e => updateViolation(i, { driverRiskCategory: e.target.value })}/>
                  </Field>
                  <div className="space-y-1.5">
                    <label className={LABEL_CLS}>OOS</label>
                    <label className="inline-flex items-center gap-2 h-[38px] px-3 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer">
                      <input type="checkbox" checked={v.oos} onChange={e => updateViolation(i, { oos: e.target.checked })}/>
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{v.oos ? 'Out of Service' : 'In Service'}</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>CVOR Points Summary (auto)</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Driver Points',  value: driverPts,     color: '#d97706' },
            { label: 'Vehicle Points', value: vehiclePts,    color: '#dc2626' },
            { label: 'Total CVOR',     value: totalCvorPts,  color: '#2563eb' },
          ].map(b => (
            <div key={b.label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{b.label}</div>
              <div className="text-[22px] font-black font-mono" style={{ color: b.color }}>{b.value}</div>
            </div>
          ))}
        </div>
      </div>

      <AttachedDocumentsSection
        docTypes={CVOR_DOC_TYPES}
        value={value.attachedDocs}
        onChange={v => set('attachedDocs', v)}
        emptyHint="No documents attached. Add inspection reports, bills of lading, driver statements, etc."
      />
    </div>
  );
}

// ───────────────────────────── Alberta NSC form ─────────────────────────────

const AB_CVSA_RESULTS    = ['Pass', 'Warning', 'Out of Service'];
const AB_CVSA_LEVELS     = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8'];
const AB_SEVERITIES      = ['Property Damage', 'Injury', 'Fatal'];
const AB_PREVENTABLE     = ['Preventable', 'Non-Preventable', 'Not Evaluated'];
const AB_HIST_EVENT_TYPE = ['MONT (Monitoring)', 'CVSA (Inspection)', 'CONV (Conviction)', 'VIOL (Violation)', 'SAFE (Safety Rating)', 'COLL (Collision)'];

export function AbNscInspectionForm({
  value, onChange,
}: {
  value: AbNscFormData;
  onChange: (next: AbNscFormData) => void;
}) {
  const set = <K extends keyof AbNscFormData>(k: K, v: AbNscFormData[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h4 className={SECTION_TITLE_CLS}>Alberta NSC &middot; Carrier Identity</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Carrier Name">
            <input type="text" className={INPUT_CLS} placeholder="e.g. VM Motors Inc." value={value.carrierName} onChange={e => set('carrierName', e.target.value)}/>
          </Field>
          <Field label="NSC Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. AB257-4556" value={value.nscNumber} onChange={e => set('nscNumber', e.target.value)}/>
          </Field>
          <Field label="MVID Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. 0895-41544" value={value.mvidNumber} onChange={e => set('mvidNumber', e.target.value)}/>
          </Field>
          <Field label="Operating Status">
            <select className={INPUT_CLS + ' bg-white'} value={value.operatingStatus} onChange={e => set('operatingStatus', e.target.value)}>
              <option>Federal</option>
              <option>Provincial</option>
            </select>
          </Field>
          <Field label="Fleet Type">
            <select className={INPUT_CLS + ' bg-white'} value={value.fleetType} onChange={e => set('fleetType', e.target.value)}>
              <option>Truck</option>
              <option>Bus</option>
              <option>Truck &amp; Bus</option>
            </select>
          </Field>
          <Field label="Fleet Range">
            <input type="text" className={INPUT_CLS} placeholder="e.g. 30.0-44.9" value={value.fleetRange} onChange={e => set('fleetRange', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Latest Pull &middot; Profile Summary</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Profile Date">
            <input type="text" className={INPUT_CLS} placeholder="2026 FEB 23" value={value.profileDate} onChange={e => set('profileDate', e.target.value)}/>
          </Field>
          <Field label="R-Factor">
            <input type="number" step="0.001" className={INPUT_CLS} placeholder="0.062" value={value.rFactor} onChange={e => set('rFactor', e.target.value)}/>
          </Field>
          <Field label="Monitoring Stage (on profile)">
            <select className={INPUT_CLS + ' bg-white'} value={value.monitoringStage} onChange={e => set('monitoringStage', e.target.value)}>
              <option>Not Monitored</option>
              <option>Stage 1</option>
              <option>Stage 2</option>
              <option>Stage 3</option>
              <option>Stage 4</option>
            </select>
          </Field>
          <Field label="Current Fleet">
            <input type="number" className={INPUT_CLS} placeholder="30" value={value.fleetCurrent} onChange={e => set('fleetCurrent', e.target.value)}/>
          </Field>
          <Field label="Avg Fleet Size">
            <input type="number" step="0.1" className={INPUT_CLS} placeholder="30.0" value={value.fleetAvg} onChange={e => set('fleetAvg', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>R-Factor Contributions</h4>
        <div className="grid grid-cols-4 gap-3 text-center mb-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">%</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Events</div>
          <div></div>
        </div>
        {([
          ['Convictions',          'convictionsPct',     'convictionsEvents'],
          ['Admin Penalties',      'adminPenaltiesPct',  'adminPenaltiesEvents'],
          ['CVSA Inspections',     'cvsaPct',            'cvsaEvents'],
          ['Reportable Collisions','collisionsPct',      'collisionsEvents'],
        ] as const).map(([label, pctKey, evKey]) => (
          <div key={label} className="grid grid-cols-4 gap-3 items-center mb-2">
            <div className="text-[12px] font-semibold text-slate-700">{label}</div>
            <input type="number" step="0.1" className={INPUT_CLS} placeholder="0.0" value={value[pctKey]} onChange={e => set(pctKey, e.target.value)}/>
            <input type="number" className={INPUT_CLS} placeholder="0" value={value[evKey]} onChange={e => set(evKey, e.target.value)}/>
            <div className="text-[10px] text-slate-400">% of R-Factor &middot; events in window</div>
          </div>
        ))}
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Safety Fitness Certificate</h4>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Certificate Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. 002449387" value={value.certNumber} onChange={e => set('certNumber', e.target.value)}/>
          </Field>
          <Field label="Effective">
            <input type="text" className={INPUT_CLS} placeholder="2026 JAN 07" value={value.certEffective} onChange={e => set('certEffective', e.target.value)}/>
          </Field>
          <Field label="Expiry">
            <input type="text" className={INPUT_CLS} placeholder="2028 DEC 31" value={value.certExpiry} onChange={e => set('certExpiry', e.target.value)}/>
          </Field>
          <Field label="Safety Rating">
            <select className={INPUT_CLS + ' bg-white'} value={value.safetyRating} onChange={e => set('safetyRating', e.target.value)}>
              <option>Excellent</option>
              <option>Satisfactory</option>
              <option>Satisfactory Unaudited</option>
              <option>Conditional</option>
              <option>Unsatisfactory</option>
            </select>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Monitoring Snapshot (month-end)</h4>
        <div className="grid grid-cols-4 gap-4">
          <Field label="As-Of Date">
            <input type="text" className={INPUT_CLS} placeholder="2026 JAN 31" value={value.monitoringAsOf} onChange={e => set('monitoringAsOf', e.target.value)}/>
          </Field>
          <Field label="R-Factor (latest)">
            <input type="number" step="0.001" className={INPUT_CLS} placeholder="0.185" value={value.monitoringRFactor} onChange={e => set('monitoringRFactor', e.target.value)}/>
          </Field>
          <Field label="Monitoring Stage (latest)">
            <select className={INPUT_CLS + ' bg-white'} value={value.monitoringStageLatest} onChange={e => set('monitoringStageLatest', e.target.value)}>
              <option>Not on Monitoring</option>
              <option>Stage 1</option>
              <option>Stage 2</option>
              <option>Stage 3</option>
              <option>Stage 4</option>
            </select>
          </Field>
          <Field label="Total AB Carriers">
            <input type="number" className={INPUT_CLS} placeholder="17704" value={value.totalCarriersAB} onChange={e => set('totalCarriersAB', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Conviction Totals</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Documents">
            <input type="number" className={INPUT_CLS} placeholder="3" value={value.convictionDocs} onChange={e => set('convictionDocs', e.target.value)}/>
          </Field>
          <Field label="Convictions">
            <input type="number" className={INPUT_CLS} placeholder="3" value={value.convictionCount} onChange={e => set('convictionCount', e.target.value)}/>
          </Field>
          <Field label="Points">
            <input type="number" className={INPUT_CLS} placeholder="3" value={value.convictionPoints} onChange={e => set('convictionPoints', e.target.value)}/>
          </Field>
        </div>
      </div>

      <EventListSection<AbConvictionEvent>
        title="Convictions"
        addLabel="Add Conviction"
        emptyHint="No convictions recorded in this pull."
        value={value.convictions}
        onChange={v => set('convictions', v)}
        makeEmpty={() => ({ id: makeEventId(), date: '', documentNo: '', docketNo: '', jurisdiction: 'AB', plate: '', driver: '', offence: '', points: '' })}
        columns={[
          { key: 'date',         label: 'Date',       type: 'date'   },
          { key: 'documentNo',   label: 'Doc #',      type: 'text',   placeholder: 'Doc #' },
          { key: 'docketNo',     label: 'Docket #',   type: 'text',   placeholder: 'Docket #' },
          { key: 'jurisdiction', label: 'Jur',        type: 'text',   placeholder: 'AB' },
          { key: 'plate',        label: 'Plate',      type: 'text',   placeholder: 'ABC-123' },
          { key: 'driver',       label: 'Driver',     type: 'text',   placeholder: 'Driver name' },
          { key: 'offence',      label: 'Offence',    type: 'text',   placeholder: 'e.g. HTA s.128(1)' },
          { key: 'points',       label: 'Points',     type: 'number', placeholder: '0' },
        ]}
      />

      <EventListSection<AbCvsaEvent>
        title="CVSA Inspections"
        addLabel="Add Inspection"
        emptyHint="No CVSA inspections recorded."
        value={value.cvsaInspections}
        onChange={v => set('cvsaInspections', v)}
        makeEmpty={() => ({ id: makeEventId(), date: '', documentNo: '', jurisdiction: 'AB', agency: '', plate: '', level: 'Level 2', result: 'Pass' })}
        columns={[
          { key: 'date',         label: 'Date',    type: 'date'   },
          { key: 'documentNo',   label: 'Doc #',   type: 'text',   placeholder: 'Doc #' },
          { key: 'jurisdiction', label: 'Jur',     type: 'text',   placeholder: 'AB' },
          { key: 'agency',       label: 'Agency',  type: 'text',   placeholder: 'Sheriff / RCMP' },
          { key: 'plate',        label: 'Plate',   type: 'text',   placeholder: 'Plate' },
          { key: 'level',        label: 'Level',   type: 'select', options: AB_CVSA_LEVELS },
          { key: 'result',       label: 'Result',  type: 'select', options: AB_CVSA_RESULTS },
        ]}
      />

      <EventListSection<AbCollisionEvent>
        title="Reportable Collisions"
        addLabel="Add Collision"
        emptyHint="No collisions recorded."
        value={value.collisions}
        onChange={v => set('collisions', v)}
        makeEmpty={() => ({ id: makeEventId(), date: '', documentNo: '', plate: '', severity: 'Property Damage', preventable: 'Preventable', points: '', driver: '' })}
        columns={[
          { key: 'date',         label: 'Date',        type: 'date'   },
          { key: 'documentNo',   label: 'Doc #',       type: 'text',   placeholder: 'Doc #' },
          { key: 'plate',        label: 'Plate',       type: 'text',   placeholder: 'Plate' },
          { key: 'severity',     label: 'Severity',    type: 'select', options: AB_SEVERITIES },
          { key: 'preventable',  label: 'Preventable', type: 'select', options: AB_PREVENTABLE },
          { key: 'driver',       label: 'Driver',      type: 'text',   placeholder: 'Driver name' },
          { key: 'points',       label: 'Points',      type: 'number', placeholder: '0' },
        ]}
      />

      <EventListSection<AbAdminPenaltyEvent>
        title="Administrative Penalties"
        addLabel="Add Penalty"
        emptyHint="No administrative penalties."
        value={value.adminPenalties}
        onChange={v => set('adminPenalties', v)}
        makeEmpty={() => ({ id: makeEventId(), date: '', documentNo: '', description: '', points: '' })}
        columns={[
          { key: 'date',        label: 'Date',        type: 'date'   },
          { key: 'documentNo',  label: 'Doc #',       type: 'text',   placeholder: 'Doc #' },
          { key: 'description', label: 'Description', type: 'text',   placeholder: 'Penalty description' },
          { key: 'points',      label: 'Points',      type: 'number', placeholder: '0' },
        ]}
      />

      <EventListSection<AbHistoricalEvent>
        title="Historical / Intervention Events"
        addLabel="Add Event"
        emptyHint="No historical events logged."
        value={value.historicalEvents}
        onChange={v => set('historicalEvents', v)}
        makeEmpty={() => ({ id: makeEventId(), date: '', type: 'MONT (Monitoring)', description: '' })}
        columns={[
          { key: 'date',        label: 'Date',        type: 'date'   },
          { key: 'type',        label: 'Type',        type: 'select', options: AB_HIST_EVENT_TYPE },
          { key: 'description', label: 'Description', type: 'text',   placeholder: 'Short description' },
        ]}
      />
    </div>
  );
}

// ───────────────────────────── BC NSC form ─────────────────────────────

export function BcNscInspectionForm({
  value, onChange,
}: {
  value: BcNscFormData;
  onChange: (next: BcNscFormData) => void;
}) {
  const set = <K extends keyof BcNscFormData>(k: K, v: BcNscFormData[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h4 className={SECTION_TITLE_CLS}>BC NSC &middot; Carrier Identity</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Carrier Name">
            <input type="text" className={INPUT_CLS} placeholder="e.g. INERTIA CARRIER LTD." value={value.carrierName} onChange={e => set('carrierName', e.target.value)}/>
          </Field>
          <Field label="NSC Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. BC123456" value={value.nscNumber} onChange={e => set('nscNumber', e.target.value)}/>
          </Field>
          <Field label="As-Of Date">
            <input type="text" className={INPUT_CLS} placeholder="31-Mar-2025" value={value.asOfDate} onChange={e => set('asOfDate', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Latest Pull &middot; Compliance Scores</h4>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <Field label="Average Fleet Size">
            <input type="number" step="0.1" className={INPUT_CLS} placeholder="25.0" value={value.averageFleetSize} onChange={e => set('averageFleetSize', e.target.value)}/>
          </Field>
          <Field label="Total Score">
            <input type="number" step="0.01" className={INPUT_CLS} placeholder="0.61" value={value.totalScore} onChange={e => set('totalScore', e.target.value)}/>
          </Field>
          <Field label="Safety Rating">
            <select className={INPUT_CLS + ' bg-white'} value={value.safetyRating} onChange={e => set('safetyRating', e.target.value)}>
              <option>Satisfactory</option>
              <option>Conditional</option>
              <option>Unsatisfactory</option>
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center mb-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Score</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Events</div>
        </div>
        {([
          ['Contraventions',         'contraventionScore', 'contraventionEvents'],
          ['CVSA (Out of Service)',  'cvsaScore',          'cvsaEvents'],
          ['Accidents',              'accidentScore',      'accidentEvents'],
        ] as const).map(([label, sKey, eKey]) => (
          <div key={label} className="grid grid-cols-3 gap-3 items-center mb-2">
            <div className="text-[12px] font-semibold text-slate-700">{label}</div>
            <input type="number" step="0.01" className={INPUT_CLS} placeholder="0.00" value={value[sKey]} onChange={e => set(sKey, e.target.value)}/>
            <input type="number" className={INPUT_CLS} placeholder="0" value={value[eKey]} onChange={e => set(eKey, e.target.value)}/>
          </div>
        ))}
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Certificate Status</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Certificate Status">
            <select className={INPUT_CLS + ' bg-white'} value={value.certificateStatus} onChange={e => set('certificateStatus', e.target.value)}>
              <option>Active</option>
              <option>Expired</option>
              <option>Suspended</option>
            </select>
          </Field>
        </div>
      </div>

      {/* --- Profile Scores (Pull-by-Pull monthly history) --- */}
      {(() => {
        const latestTotal = value.profileScores[0]?.total ?? value.totalScore;
        const sub = value.profileScores.length === 0
          ? 'No monthly pulls logged.'
          : `${value.profileScores.length} monthly pull${value.profileScores.length !== 1 ? 's' : ''} · vehicle days, fleet size, contraventions/CVSA/accident scores · Total Score: ${latestTotal || '—'}`;
        return (
          <EventListSection<BcProfileScoreRow>
            title="Profile Scores"
            subtitle={sub}
            addLabel="Add Month"
            emptyHint="No monthly pulls logged."
            value={value.profileScores}
            onChange={v => set('profileScores', v)}
            makeEmpty={() => ({ id: makeEventId(), month: '', vd: '', ad: '', avg: '', contra: '', cvsa: '', acc: '', total: '' })}
            columns={[
              { key: 'month',  label: 'Month',    type: 'text',   placeholder: '2025-03' },
              { key: 'vd',     label: 'VehDays',  type: 'number', placeholder: '28308' },
              { key: 'ad',     label: 'ActDays',  type: 'number', placeholder: '365' },
              { key: 'avg',    label: 'Avg Fleet',type: 'number', placeholder: '77.56' },
              { key: 'contra', label: 'Contra',   type: 'number', placeholder: '0.30' },
              { key: 'cvsa',   label: 'CVSA',     type: 'number', placeholder: '0.31' },
              { key: 'acc',    label: 'Accident', type: 'number', placeholder: '0.00' },
              { key: 'total',  label: 'Total',    type: 'number', placeholder: '0.61' },
            ]}
          />
        );
      })()}

      {/* --- Active Fleet --- */}
      {(() => {
        const avg = value.profileScores[0]?.avg ?? value.averageFleetSize;
        const sub = value.activeFleet.length === 0
          ? 'No fleet vehicles listed.'
          : `${value.activeFleet.length} vehicle${value.activeFleet.length !== 1 ? 's' : ''} · all commercial vehicles under this Safety Certificate${avg ? ` · Avg Fleet: ${avg}` : ''}`;
        return (
          <EventListSection<BcFleetRow>
            title="Active Fleet"
            subtitle={sub}
            addLabel="Add Vehicle"
            emptyHint="No fleet vehicles listed."
            value={value.activeFleet}
            onChange={v => set('activeFleet', v)}
            makeEmpty={() => ({ id: makeEventId(), regi: '', plate: '', year: '', make: '', owner: '', gvw: '' })}
            columns={[
              { key: 'regi',  label: 'Regi',  type: 'text',   placeholder: '10537552' },
              { key: 'plate', label: 'Plate', type: 'text',   placeholder: '69124P' },
              { key: 'year',  label: 'Year',  type: 'number', placeholder: '2022' },
              { key: 'make',  label: 'Make',  type: 'text',   placeholder: 'VOLVO' },
              { key: 'owner', label: 'Owner', type: 'text',   placeholder: 'Carrier' },
              { key: 'gvw',   label: 'GVW',   type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Contraventions (4 sub-lists: driver/carrier × guilty/pending) --- */}
      {(() => {
        const dg = value.driverGuilty.length;
        const cg = value.carrierGuilty.length;
        const dp = value.driverPending.length;
        const cp = value.carrierPending.length;
        const sub = (dg + cg + dp + cp) === 0
          ? 'No contraventions recorded.'
          : `${dg} driver guilty · ${cg} carrier guilty · ${dp} driver pending · ${cp} carrier pending · Grouped Total: ${value.contraventionScore || '—'}`;
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className={SECTION_TITLE_CLS + ' mb-0'}>Contraventions</h4>
                <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">4 SECTIONS</span>
            </div>
            <div className="space-y-4 pl-3 border-l-2 border-slate-100">
              {([
                ['driverGuilty',   'Driver Contraventions (Guilty)',   value.driverGuilty],
                ['carrierGuilty',  'Carrier Contraventions (Guilty)',  value.carrierGuilty],
                ['driverPending',  'Pending Driver Contraventions',    value.driverPending],
                ['carrierPending', 'Pending Carrier Contraventions',   value.carrierPending],
              ] as const).map(([key, title, rows]) => (
                <EventListSection<BcContraventionRow>
                  key={key}
                  title={title}
                  addLabel="Add Row"
                  emptyHint={`No ${title.toLowerCase()} recorded.`}
                  value={rows as BcContraventionRow[]}
                  onChange={v => set(key, v)}
                  makeEmpty={() => ({ id: makeEventId(), driverName: '', dl: '', dlJur: 'BC', date: '', ticket: '', plate: '', location: '', juris: 'BC', act: '', section: '', desc: '', pts: '0' })}
                  columns={[
                    { key: 'date',       label: 'Date',       type: 'date'   },
                    { key: 'driverName', label: 'Driver',     type: 'text',   placeholder: 'Driver name' },
                    { key: 'dl',         label: 'DL #',       type: 'text',   placeholder: 'Driver licence' },
                    { key: 'ticket',     label: 'Ticket',     type: 'text',   placeholder: 'Ticket #' },
                    { key: 'plate',      label: 'Plate',      type: 'text',   placeholder: 'Plate' },
                    { key: 'location',   label: 'Location',   type: 'text',   placeholder: 'City' },
                    { key: 'act',        label: 'Act',        type: 'text',   placeholder: 'e.g. MVA' },
                    { key: 'section',    label: 'Section',    type: 'text',   placeholder: 'e.g. 150.1' },
                    { key: 'desc',       label: 'Description',type: 'text',   placeholder: 'Offence' },
                    { key: 'pts',        label: 'Points',     type: 'number', placeholder: '0' },
                  ]}
                />
              ))}
            </div>
          </div>
        );
      })()}

      {/* --- CVSA Inspection Results --- */}
      {(() => {
        const sub = value.cvsaInspections.length === 0
          ? 'No CVSA inspection records.'
          : `${value.cvsaInspections.length} inspection${value.cvsaInspections.length !== 1 ? 's' : ''} · inspection-type summary, defect-category summary, detailed records · CVSA Score: ${value.cvsaScore || '—'}`;
        return (
          <EventListSection<BcCvsaRecRow>
            title="CVSA Inspection Results"
            subtitle={sub}
            addLabel="Add Inspection"
            emptyHint="No CVSA inspection records."
            value={value.cvsaInspections}
            onChange={v => set('cvsaInspections', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', inspectionNo: '', level: 'Level 1', plate: '', driver: '', defects: '', result: 'Pass' })}
            columns={[
              { key: 'date',         label: 'Date',         type: 'date'   },
              { key: 'inspectionNo', label: 'Insp #',       type: 'text',   placeholder: 'Inspection #' },
              { key: 'level',        label: 'Level',        type: 'select', options: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'] },
              { key: 'plate',        label: 'Plate',        type: 'text',   placeholder: 'Plate' },
              { key: 'driver',       label: 'Driver',       type: 'text',   placeholder: 'Driver' },
              { key: 'defects',      label: 'Defects',      type: 'text',   placeholder: 'Defect category' },
              { key: 'result',       label: 'Result',       type: 'select', options: ['Pass', 'Warning', 'Out of Service'] },
            ]}
          />
        );
      })()}

      {/* --- Accident Information --- */}
      {(() => {
        const faulted = value.accidents.filter(r => r.fault === 'At Fault').length;
        const unk     = value.accidents.filter(r => r.fault === 'Fault Unknown').length;
        const nofault = value.accidents.filter(r => r.fault === 'No Fault').length;
        const reportableTypes = new Set(value.accidents.filter(r => r.type === 'Injury' || r.type === 'Fatality').map(r => r.report));
        const sub = value.accidents.length === 0
          ? 'No accidents recorded.'
          : `${reportableTypes.size || Math.min(value.accidents.length, 5)} reportable accident${(reportableTypes.size || 1) !== 1 ? 's' : ''} · ${value.accidents.length} event record${value.accidents.length !== 1 ? 's' : ''} · ${faulted} at-fault, ${unk} fault-unknown, ${nofault} no-fault · Accident Score: ${value.accidentScore || '—'}`;
        return (
          <EventListSection<BcAccidentRow>
            title="Accident Information"
            subtitle={sub}
            addLabel="Add Accident"
            emptyHint="No accidents recorded."
            value={value.accidents}
            onChange={v => set('accidents', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', time: '', report: '', location: '', jur: 'BC', driverName: '', plate: '', vehDesc: '', type: 'Property', fault: 'No Fault', charges: 'No', pts: '0' })}
            columns={[
              { key: 'date',       label: 'Date',     type: 'date'   },
              { key: 'time',       label: 'Time',     type: 'text',   placeholder: 'HH:MM' },
              { key: 'report',     label: 'Report #', type: 'text',   placeholder: 'Report #' },
              { key: 'location',   label: 'Location', type: 'text',   placeholder: 'City / Hwy' },
              { key: 'jur',        label: 'Jur',      type: 'select', options: ['BC', 'AB', 'SK', 'MB', 'ON', 'QC', 'NB', 'NS', 'PE', 'NL', 'NT', 'YT', 'NU'] },
              { key: 'driverName', label: 'Driver',   type: 'text',   placeholder: 'Driver name' },
              { key: 'plate',      label: 'Plate',    type: 'text',   placeholder: 'Plate' },
              { key: 'type',       label: 'Type',     type: 'select', options: ['Property', 'Injury', 'Fatality'] },
              { key: 'fault',      label: 'Fault',    type: 'select', options: ['At Fault', 'No Fault', 'Fault Unknown'] },
              { key: 'charges',    label: 'Charges',  type: 'select', options: ['Yes', 'No'] },
              { key: 'pts',        label: 'Points',   type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Audit Summary --- */}
      {(() => {
        const sub = value.auditSummary.length === 0
          ? `quantifiable facility audit history · compliance reviews not included · Safety Rating: ${value.safetyRating || '—'}`
          : `${value.auditSummary.length} audit${value.auditSummary.length !== 1 ? 's' : ''} · quantifiable facility audit history · Safety Rating: ${value.safetyRating || '—'}`;
        return (
          <EventListSection<BcAuditRow>
            title="Audit Summary"
            subtitle={sub}
            addLabel="Add Audit"
            emptyHint="UNAUDITED — no audits on record."
            value={value.auditSummary}
            onChange={v => set('auditSummary', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', auditType: 'Facility', result: 'Satisfactory', notes: '' })}
            columns={[
              { key: 'date',      label: 'Date',       type: 'date'   },
              { key: 'auditType', label: 'Audit Type', type: 'select', options: ['Facility', 'Compliance Review', 'Safety', 'Investigative'] },
              { key: 'result',    label: 'Result',     type: 'select', options: ['Satisfactory', 'Conditional', 'Unsatisfactory'] },
              { key: 'notes',     label: 'Notes',      type: 'text',   placeholder: 'Notes' },
            ]}
          />
        );
      })()}

      {/* --- CVIP Vehicle Inspection History --- */}
      {(() => {
        const sub = value.cvip.length === 0
          ? 'No CVIP records.'
          : `${value.cvip.length} record${value.cvip.length !== 1 ? 's' : ''} · commercial vehicle inspections and outstanding Notice & Orders`;
        return (
          <EventListSection<BcCvipRow>
            title="CVIP Vehicle Inspection History"
            subtitle={sub}
            addLabel="Add CVIP"
            emptyHint="No CVIP records."
            value={value.cvip}
            onChange={v => set('cvip', v)}
            makeEmpty={() => ({ id: makeEventId(), regi: '', plate: '', vehicle: '', date: '', type: 'CVIP', facility: '', expiry: '', result: 'Pass' })}
            columns={[
              { key: 'regi',     label: 'Regi',     type: 'text',   placeholder: 'Regi' },
              { key: 'plate',    label: 'Plate',    type: 'text',   placeholder: 'Plate' },
              { key: 'vehicle',  label: 'Vehicle',  type: 'text',   placeholder: 'Year Make' },
              { key: 'date',     label: 'Date',     type: 'date'   },
              { key: 'type',     label: 'Type',     type: 'select', options: ['CVIP', 'N&O'] },
              { key: 'facility', label: 'Facility', type: 'text',   placeholder: 'Facility' },
              { key: 'expiry',   label: 'Expiry',   type: 'date'   },
              { key: 'result',   label: 'Result',   type: 'select', options: ['Pass', 'Pass (Repair Same Day)', 'Fail', 'N&O 1', 'N&O 2'] },
            ]}
          />
        );
      })()}
    </div>
  );
}

// ───────────────────────────── PEI NSC form ─────────────────────────────

export function PeiNscInspectionForm({
  value, onChange,
}: {
  value: PeiNscFormData;
  onChange: (next: PeiNscFormData) => void;
}) {
  const set = <K extends keyof PeiNscFormData>(k: K, v: PeiNscFormData[K]) => onChange({ ...value, [k]: v });

  const coll = +value.collisionPoints || 0;
  const conv = +value.convictionPoints || 0;
  const insp = +value.inspectionPoints || 0;
  const total = coll + conv + insp;

  return (
    <div className="space-y-6">
      <div>
        <h4 className={SECTION_TITLE_CLS}>PEI NSC &middot; Carrier Identity</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Carrier Name">
            <input type="text" className={INPUT_CLS} placeholder="e.g. BUSINESS PORTERS INC." value={value.carrierName} onChange={e => set('carrierName', e.target.value)}/>
          </Field>
          <Field label="NSC Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. PE316583" value={value.nscNumber} onChange={e => set('nscNumber', e.target.value)}/>
          </Field>
          <Field label="Profile As Of">
            <input type="text" className={INPUT_CLS} placeholder="2021/07/14" value={value.profileAsOf} onChange={e => set('profileAsOf', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Latest Pull &middot; Demerit Points</h4>
        <div className="grid grid-cols-4 gap-4">
          <Field label="Collision Pts">
            <input type="number" className={INPUT_CLS} placeholder="0" value={value.collisionPoints} onChange={e => set('collisionPoints', e.target.value)}/>
          </Field>
          <Field label="Conviction Pts">
            <input type="number" className={INPUT_CLS} placeholder="0" value={value.convictionPoints} onChange={e => set('convictionPoints', e.target.value)}/>
          </Field>
          <Field label="Inspection Pts">
            <input type="number" className={INPUT_CLS} placeholder="0" value={value.inspectionPoints} onChange={e => set('inspectionPoints', e.target.value)}/>
          </Field>
          <div className="space-y-1.5">
            <label className={LABEL_CLS}>Total (auto)</label>
            <div className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm font-bold font-mono text-slate-700">{total}</div>
          </div>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Fleet</h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Active Vehicles">
            <input type="number" className={INPUT_CLS} placeholder="19" value={value.currentActiveVehicles} onChange={e => set('currentActiveVehicles', e.target.value)}/>
          </Field>
          <Field label="Active Vehicles at Last Assessment">
            <input type="number" className={INPUT_CLS} placeholder="19" value={value.currentActiveVehiclesAtLastAssessment} onChange={e => set('currentActiveVehiclesAtLastAssessment', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Certificate &amp; Audit</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Safety Rating">
            <select className={INPUT_CLS + ' bg-white'} value={value.safetyRating} onChange={e => set('safetyRating', e.target.value)}>
              <option>Satisfactory</option>
              <option>Conditional</option>
              <option>Unsatisfactory</option>
            </select>
          </Field>
          <Field label="Certificate Status">
            <select className={INPUT_CLS + ' bg-white'} value={value.certStatus} onChange={e => set('certStatus', e.target.value)}>
              <option>Active</option>
              <option>Expired</option>
              <option>Suspended</option>
            </select>
          </Field>
          <Field label="Audit Status">
            <select className={INPUT_CLS + ' bg-white'} value={value.auditStatus} onChange={e => set('auditStatus', e.target.value)}>
              <option>Unaudited</option>
              <option>Audited - Compliant</option>
              <option>Audited - Action Required</option>
              <option>Audited - Non-Compliant</option>
            </select>
          </Field>
        </div>
      </div>

      {/* --- Collisions --- */}
      {(() => {
        const collInjury = value.collisions.filter(r => r.severity === 'Injury' || r.severity === 'Fatality' || r.severity === 'Fatal').length;
        const collPd     = value.collisions.length - collInjury;
        const pts        = value.collisions.reduce((s, r) => s + (+r.pts || 0), 0);
        const sub = value.collisions.length === 0
          ? 'There are no Collision records.'
          : `${value.collisions.length} collision${value.collisions.length !== 1 ? 's' : ''} | ${collPd} property damage, ${collInjury} injury/fatal · Points: ${pts}`;
        return (
          <EventListSection<PeiCollisionEvent>
            title="Collisions"
            subtitle={sub}
            addLabel="Add Collision"
            emptyHint="There are no Collision records."
            value={value.collisions}
            onChange={v => set('collisions', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', severity: 'Property Damage', caseNum: '', fault: 'At Fault', vehicles: '1', killed: '0', injured: '0', pts: '0' })}
            columns={[
              { key: 'date',     label: 'Date',      type: 'date'   },
              { key: 'severity', label: 'Severity',  type: 'select', options: ['Property Damage', 'Injury', 'Fatality'] },
              { key: 'caseNum',  label: 'Case #',    type: 'text',   placeholder: 'e.g. BC2021-0583' },
              { key: 'fault',    label: 'Fault',     type: 'select', options: ['At Fault', 'Not at Fault', 'Fault Unknown'] },
              { key: 'vehicles', label: 'Vehicles',  type: 'number', placeholder: '1' },
              { key: 'killed',   label: 'Killed',    type: 'number', placeholder: '0' },
              { key: 'injured',  label: 'Injured',   type: 'number', placeholder: '0' },
              { key: 'pts',      label: 'Points',    type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Convictions --- */}
      {(() => {
        const pts = value.convictions.reduce((s, r) => s + (+r.pts || 0), 0);
        const sub = value.convictions.length === 0
          ? 'There are no Conviction records.'
          : `${value.convictions.length} conviction record${value.convictions.length !== 1 ? 's' : ''} | charge, jurisdiction, and points · Points: ${pts}`;
        return (
          <EventListSection<PeiConvictionEvent>
            title="Convictions"
            subtitle={sub}
            addLabel="Add Conviction"
            emptyHint="There are no Conviction records."
            value={value.convictions}
            onChange={v => set('convictions', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', loc: 'PE', charge: '', natCode: '', pts: '0' })}
            columns={[
              { key: 'date',    label: 'Date',           type: 'date'   },
              { key: 'loc',     label: 'Jurisdiction',   type: 'select', options: ['PE', 'NS', 'NB', 'ON', 'QC', 'MB', 'AB', 'BC', 'SK', 'NL', 'NT', 'YT', 'NU'] },
              { key: 'charge',  label: 'Charge',         type: 'text',   placeholder: 'Offence description' },
              { key: 'natCode', label: 'Nat Code',       type: 'text',   placeholder: 'e.g. 317' },
              { key: 'pts',     label: 'Points',         type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Inspections --- */}
      {(() => {
        const inspPass = value.inspections.filter(r => r.status === 'P').length;
        const inspWarn = value.inspections.filter(r => r.status === 'W').length;
        const inspOos  = value.inspections.filter(r => r.status === 'O').length;
        const sub = value.inspections.length === 0
          ? 'There are no Inspection records.'
          : `${value.inspections.length} inspection${value.inspections.length !== 1 ? 's' : ''} | ${inspPass} pass, ${inspWarn} warning, ${inspOos} out of service`;
        return (
          <EventListSection<PeiInspectionEvent>
            title="Inspections"
            subtitle={sub}
            addLabel="Add Inspection"
            emptyHint="There are no Inspection records."
            value={value.inspections}
            onChange={v => set('inspections', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', cvsaLevel: '2', log: 'Passed', tdg: 'Passed', loadSecurity: 'Passed', driverName: '', status: 'P' })}
            columns={[
              { key: 'date',         label: 'Date',          type: 'date'   },
              { key: 'cvsaLevel',    label: 'CVSA Level',    type: 'select', options: ['1', '2', '3', '4', '5'] },
              { key: 'driverName',   label: 'Driver',        type: 'text',   placeholder: 'Driver name' },
              { key: 'log',          label: 'Log',           type: 'select', options: ['Passed', 'Warning', 'Failed'] },
              { key: 'tdg',          label: 'TDG',           type: 'select', options: ['Passed', 'Warning', 'Failed', 'N/A'] },
              { key: 'loadSecurity', label: 'Load Security', type: 'select', options: ['Passed', 'Warning', 'Failed'] },
              { key: 'status',       label: 'Status',        type: 'select', options: ['P', 'W', 'O'] },
            ]}
          />
        );
      })()}

      {/* --- Audits --- */}
      {(() => {
        const latest = value.audits[value.audits.length - 1];
        const sub = value.audits.length === 0
          ? 'There are no Audit records for period selected.'
          : `${value.audits.length} audit${value.audits.length !== 1 ? 's' : ''} on record for period selected${latest ? ` · Latest Result: ${latest.result}` : ''}`;
        return (
          <EventListSection<PeiAuditEvent>
            title="Audits"
            subtitle={sub}
            addLabel="Add Audit"
            emptyHint="There are no Audit records for period selected."
            value={value.audits}
            onChange={v => set('audits', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', result: 'COMPLIANT', auditType: 'Compliance' })}
            columns={[
              { key: 'date',      label: 'Date',      type: 'date'   },
              { key: 'result',    label: 'Result',    type: 'select', options: ['COMPLIANT', 'CONDITIONAL', 'NON-COMPLIANT'] },
              { key: 'auditType', label: 'Audit Type',type: 'select', options: ['Compliance', 'Facility', 'Safety', 'Investigative'] },
            ]}
          />
        );
      })()}
    </div>
  );
}

// ───────────────────────────── Nova Scotia NSC form ─────────────────────────────

export function NsNscInspectionForm({
  value, onChange,
}: {
  value: NsNscFormData;
  onChange: (next: NsNscFormData) => void;
}) {
  const set = <K extends keyof NsNscFormData>(k: K, v: NsNscFormData[K]) => onChange({ ...value, [k]: v });

  return (
    <div className="space-y-6">
      <div>
        <h4 className={SECTION_TITLE_CLS}>Nova Scotia NSC &middot; Carrier Identity</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Carrier Name">
            <input type="text" className={INPUT_CLS} placeholder="e.g. MAPLE LEAF FORCE LIMITED" value={value.carrierName} onChange={e => set('carrierName', e.target.value)}/>
          </Field>
          <Field label="NSC Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. MAPLE739646000" value={value.nscNumber} onChange={e => set('nscNumber', e.target.value)}/>
          </Field>
          <Field label="Profile As Of">
            <input type="text" className={INPUT_CLS} placeholder="19/08/2022" value={value.profileAsOf} onChange={e => set('profileAsOf', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Latest Pull &middot; Indexed Scores</h4>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Collision Score">
            <input type="number" step="0.0001" className={INPUT_CLS} placeholder="0.0000" value={value.collisionScore} onChange={e => set('collisionScore', e.target.value)}/>
          </Field>
          <Field label="Conviction Score">
            <input type="number" step="0.0001" className={INPUT_CLS} placeholder="0.0000" value={value.convictionScore} onChange={e => set('convictionScore', e.target.value)}/>
          </Field>
          <Field label="Inspection Score">
            <input type="number" step="0.0001" className={INPUT_CLS} placeholder="0.0000" value={value.inspectionScore} onChange={e => set('inspectionScore', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Fleet</h4>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Fleet Size">
            <input type="number" className={INPUT_CLS} placeholder="14" value={value.currentFleetSize} onChange={e => set('currentFleetSize', e.target.value)}/>
          </Field>
          <Field label="Avg Daily Fleet Size">
            <input type="number" step="0.01" className={INPUT_CLS} placeholder="14.79" value={value.avgDailyFleetSize} onChange={e => set('avgDailyFleetSize', e.target.value)}/>
          </Field>
        </div>
      </div>

      <div>
        <h4 className={SECTION_TITLE_CLS}>Thresholds &amp; Rating</h4>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <Field label="Score Level 1 (Moderate)">
            <input type="number" step="0.0001" className={INPUT_CLS} placeholder="39.7531" value={value.scoreLevel1} onChange={e => set('scoreLevel1', e.target.value)}/>
          </Field>
          <Field label="Score Level 2 (High)">
            <input type="number" step="0.0001" className={INPUT_CLS} placeholder="45.9602" value={value.scoreLevel2} onChange={e => set('scoreLevel2', e.target.value)}/>
          </Field>
          <Field label="Score Level 3 (Critical)">
            <input type="number" step="0.0001" className={INPUT_CLS} placeholder="60.1836" value={value.scoreLevel3} onChange={e => set('scoreLevel3', e.target.value)}/>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Safety Rating">
            <select className={INPUT_CLS + ' bg-white'} value={value.safetyRating} onChange={e => set('safetyRating', e.target.value)}>
              <option>Satisfactory</option>
              <option>Satisfactory - Unaudited</option>
              <option>Conditional</option>
              <option>Unsatisfactory</option>
            </select>
          </Field>
          <Field label="Safety Rating Expires">
            <input type="text" className={INPUT_CLS} placeholder="DD/MM/YYYY" value={value.safetyRatingExpires} onChange={e => set('safetyRatingExpires', e.target.value)}/>
          </Field>
        </div>
      </div>

      {/* --- CVSA Inspection --- */}
      {(() => {
        const passed = value.cvsaInspections.filter(r => r.result === 'Passed').length;
        const defect = value.cvsaInspections.filter(r => r.result === 'Defect Noted').length;
        const oos    = value.cvsaInspections.filter(r => r.result === 'Out-of-Service').length;
        const pts    = value.cvsaInspections.reduce((s, r) => s + (+r.demeritPts || 0), 0);
        const sub = value.cvsaInspections.length === 0
          ? 'No CVSA inspections recorded'
          : `${value.cvsaInspections.length} inspection${value.cvsaInspections.length !== 1 ? 's' : ''} | ${passed} passed, ${defect} defect noted, ${oos} out-of-service · Demerit Pts: ${pts}`;
        return (
          <EventListSection<NsCvsaEvent>
            title="CVSA Inspection"
            subtitle={sub}
            addLabel="Add Inspection"
            emptyHint="No CVSA inspections recorded."
            value={value.cvsaInspections}
            onChange={v => set('cvsaInspections', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', cvsaNumber: '', jur: 'NS', plates: '', driverMaster: '', result: 'Passed', demeritPts: '0' })}
            columns={[
              { key: 'date',         label: 'Date',          type: 'date'   },
              { key: 'cvsaNumber',   label: 'CVSA #',        type: 'text',   placeholder: 'e.g. 445131-1' },
              { key: 'jur',          label: 'Jur',           type: 'select', options: ['NS', 'NB', 'ON', 'QC', 'MB', 'AB', 'BC', 'SK', 'PE', 'NL', 'NT', 'YT', 'NU'] },
              { key: 'plates',       label: 'Plates',        type: 'text',   placeholder: 'e.g. PR45273 / NS' },
              { key: 'driverMaster', label: 'Driver Master', type: 'text',   placeholder: 'e.g. SINGH210898005 / NS' },
              { key: 'result',       label: 'Result',        type: 'select', options: ['Passed', 'Defect Noted', 'Out-of-Service'] },
              { key: 'demeritPts',   label: 'Demerit Pts',   type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Audit History --- */}
      {(() => {
        const latest = value.auditHistory[value.auditHistory.length - 1];
        const sub = value.auditHistory.length === 0
          ? 'There are no Audit History records.'
          : `${value.auditHistory.length} audit${value.auditHistory.length !== 1 ? 's' : ''} on record for period selected${latest ? ` · Latest Result: ${latest.result}` : ''}`;
        return (
          <EventListSection<NsAuditEvent>
            title="Audit History"
            subtitle={sub}
            addLabel="Add Audit"
            emptyHint="There are no Audit History records."
            value={value.auditHistory}
            onChange={v => set('auditHistory', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', auditNum: '', sequence: '1', result: 'Compliant' })}
            columns={[
              { key: 'date',     label: 'Date',     type: 'date'   },
              { key: 'auditNum', label: 'Audit #',  type: 'text',   placeholder: 'e.g. 34843' },
              { key: 'sequence', label: 'Sequence', type: 'text',   placeholder: '1' },
              { key: 'result',   label: 'Result',   type: 'select', options: ['Compliant', 'Conditional', 'Non-Compliant'] },
            ]}
          />
        );
      })()}

      {/* --- Convictions --- */}
      {(() => {
        const pts = value.convictions.reduce((s, r) => s + (+r.pts || 0), 0);
        const sub = value.convictions.length === 0
          ? 'There are no Conviction records.'
          : `${value.convictions.length} conviction record${value.convictions.length !== 1 ? 's' : ''} | offence, ticket, act/section, and points · Demerit Pts: ${pts}`;
        return (
          <EventListSection<NsConvictionEvent>
            title="Convictions"
            subtitle={sub}
            addLabel="Add Conviction"
            emptyHint="There are no Conviction records."
            value={value.convictions}
            onChange={v => set('convictions', v)}
            makeEmpty={() => ({ id: makeEventId(), offenceDate: '', convDate: '', ticket: '', offence: '', driverMaster: '', sectionActReg: '', pts: '' })}
            columns={[
              { key: 'offenceDate',   label: 'Offence Date',  type: 'date'   },
              { key: 'convDate',      label: 'Conv. Date',    type: 'date'   },
              { key: 'ticket',        label: 'Ticket #',      type: 'text',   placeholder: 'e.g. 5488801' },
              { key: 'offence',       label: 'Offence',       type: 'text',   placeholder: 'Offence description' },
              { key: 'driverMaster',  label: 'Driver Master', type: 'text',   placeholder: 'e.g. CZIPP141270003' },
              { key: 'sectionActReg', label: 'Act/Section',   type: 'text',   placeholder: 'e.g. 11 9 WDVR' },
              { key: 'pts',           label: 'Points',        type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Collisions --- */}
      {(() => {
        const pts = value.collisions.reduce((s, r) => s + (+r.pts || 0), 0);
        const sub = value.collisions.length === 0
          ? 'There are no Collision records.'
          : `${value.collisions.length} collision record${value.collisions.length !== 1 ? 's' : ''} | severity, location, driver, vehicle · Demerit Pts: ${pts}`;
        return (
          <EventListSection<NsCollisionEvent>
            title="Collisions"
            subtitle={sub}
            addLabel="Add Collision"
            emptyHint="There are no Collision records."
            value={value.collisions}
            onChange={v => set('collisions', v)}
            makeEmpty={() => ({ id: makeEventId(), date: '', severity: 'PROPERTY DAMAGE', location: '', driverMaster: '', driverJur: 'NS', plate: '', plateJur: 'NS', pts: '0' })}
            columns={[
              { key: 'date',         label: 'Date',          type: 'date'   },
              { key: 'severity',     label: 'Severity',      type: 'select', options: ['PROPERTY DAMAGE', 'INJURY', 'FATAL'] },
              { key: 'location',     label: 'Location',      type: 'text',   placeholder: 'e.g. MONTREAL / QC' },
              { key: 'driverMaster', label: 'Driver Master', type: 'text',   placeholder: 'Driver master #' },
              { key: 'driverJur',    label: 'Driver Jur',    type: 'select', options: ['NS', 'NB', 'ON', 'QC', 'MB', 'AB', 'BC', 'SK', 'PE', 'NL', 'NT', 'YT', 'NU'] },
              { key: 'plate',        label: 'Plate',         type: 'text',   placeholder: 'e.g. PR42409' },
              { key: 'plateJur',     label: 'Plate Jur',     type: 'select', options: ['NS', 'NB', 'ON', 'QC', 'MB', 'AB', 'BC', 'SK', 'PE', 'NL', 'NT', 'YT', 'NU'] },
              { key: 'pts',          label: 'Points',        type: 'number', placeholder: '0' },
            ]}
          />
        );
      })()}

      {/* --- Traffic Offence Reports --- */}
      {(() => {
        const sub = value.trafficOffences.length === 0
          ? 'There are no Traffic Offence Report records.'
          : `${value.trafficOffences.length} warning ticket${value.trafficOffences.length !== 1 ? 's' : ''} | plate, driver, statute, description`;
        return (
          <EventListSection<NsTrafficOffenceEvent>
            title="Traffic Offence Reports"
            subtitle={sub}
            addLabel="Add Warning Ticket"
            emptyHint="There are no Traffic Offence Report records."
            value={value.trafficOffences}
            onChange={v => set('trafficOffences', v)}
            makeEmpty={() => ({ id: makeEventId(), offenceDate: '', plate: '', driverMaster: '', statute: '', description: '' })}
            columns={[
              { key: 'offenceDate',  label: 'Offence Date',  type: 'date'   },
              { key: 'plate',        label: 'Plate',         type: 'text',   placeholder: 'e.g. PR45273' },
              { key: 'driverMaster', label: 'Driver Master', type: 'text',   placeholder: 'Driver master #' },
              { key: 'statute',      label: 'Statute',       type: 'text',   placeholder: 'e.g. CVDH 7 1 A' },
              { key: 'description',  label: 'Description',   type: 'text',   placeholder: 'Offence description' },
            ]}
          />
        );
      })()}
    </div>
  );
}

// ───────────────────────────── Inspection kind (locked to current tab) ─────────────────────────────

const KIND_OPTIONS: { id: InspectionKind; label: string; sub: string }[] = [
  { id: 'fmcsa', label: 'FMCSA',         sub: 'US / SMS' },
  { id: 'cvor',  label: 'CVOR',          sub: 'Ontario' },
  { id: 'ab',    label: 'Alberta NSC',   sub: 'R-Factor' },
  { id: 'bc',    label: 'BC NSC',        sub: 'Compliance Score' },
  { id: 'pe',    label: 'PEI NSC',       sub: 'Demerit Points' },
  { id: 'ns',    label: 'Nova Scotia NSC', sub: 'Indexed Score' },
];

export function InspectionKindSelector({ value }: { value: InspectionKind }) {
  const opt = KIND_OPTIONS.find(o => o.id === value) ?? KIND_OPTIONS[0];
  return (
    <div>
      <h4 className={SECTION_TITLE_CLS}>Inspection Type</h4>
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
          <Lock size={14}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-black text-blue-900">{opt.label}</div>
          <div className="text-[10px] text-blue-700/80 uppercase tracking-wider">{opt.sub}</div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-white border border-blue-200 rounded-full px-2 py-0.5">Locked to current tab</span>
      </div>
    </div>
  );
}

// ───────────────────────────── FMCSA API fetch block ─────────────────────────────

export interface FmcsaApiFetchResult {
  reportNumber: string;
  inspectionDate: string;
  state: string;
  level: string;
  driver: string;
  driverLicense: string;
  carrier: string;
  dotNumber: string;
  vehiclePlate: string;
  vehicleVin: string;
  violationCount: number;
  oosCount: number;
}

export function FmcsaApiFetchBlock({
  onFetched,
}: {
  onFetched?: (result: FmcsaApiFetchResult) => void;
}) {
  const [dot, setDot] = useState('');
  const [report, setReport] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<FmcsaApiFetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchFromFmcsa = async () => {
    if (!dot && !report) {
      setError('Enter a DOT number or Report Number to fetch.');
      setStatus('error');
      return;
    }
    setError(null);
    setStatus('loading');
    // Simulated API call — replace with real fetch('/api/fmcsa/...') when wired up
    await new Promise(res => setTimeout(res, 1100));
    const stub: FmcsaApiFetchResult = {
      reportNumber: report || 'FMCSA-SIM-00001',
      inspectionDate: '2025-08-14',
      state: 'MI',
      level: 'Level 2',
      driver: 'SAMPLE DRIVER',
      driverLicense: 'D1234-5678-9012',
      carrier: 'SAMPLE CARRIER INC.',
      dotNumber: dot || '1234567',
      vehiclePlate: 'ABC-123',
      vehicleVin: '1HGCM82633A000000',
      violationCount: 3,
      oosCount: 1,
    };
    setResult(stub);
    setStatus('success');
    onFetched?.(stub);
  };

  return (
    <div>
      <h4 className={SECTION_TITLE_CLS}>FMCSA API &middot; Fetch Latest Inspection</h4>
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <Field label="USDOT Number">
            <input type="text" className={INPUT_CLS} placeholder="e.g. 1234567" value={dot} onChange={e => setDot(e.target.value)}/>
          </Field>
          <Field label="Report Number (optional)">
            <input type="text" className={INPUT_CLS} placeholder="e.g. MIGRAHA00829" value={report} onChange={e => setReport(e.target.value)}/>
          </Field>
          <button
            type="button"
            onClick={fetchFromFmcsa}
            disabled={status === 'loading'}
            className="h-[38px] px-4 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status === 'loading'
              ? (<><Loader2 size={14} className="animate-spin"/> Fetching…</>)
              : (<><Download size={14}/> Fetch from FMCSA</>)}
          </button>
        </div>

        {status === 'error' && error && (
          <div className="mt-3 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
        )}

        {status === 'success' && result && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2">
              <CheckCircle2 size={14}/> Fetched &middot; form below pre-populated
            </div>
            <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 text-[11px]">
              <div><span className="text-slate-500">Report:</span> <span className="font-bold font-mono text-slate-800">{result.reportNumber}</span></div>
              <div><span className="text-slate-500">Date:</span> <span className="font-bold font-mono text-slate-800">{result.inspectionDate}</span></div>
              <div><span className="text-slate-500">State:</span> <span className="font-bold font-mono text-slate-800">{result.state}</span></div>
              <div><span className="text-slate-500">Level:</span> <span className="font-bold font-mono text-slate-800">{result.level}</span></div>
              <div className="col-span-2"><span className="text-slate-500">Carrier:</span> <span className="font-bold text-slate-800">{result.carrier}</span></div>
              <div><span className="text-slate-500">DOT:</span> <span className="font-bold font-mono text-slate-800">{result.dotNumber}</span></div>
              <div><span className="text-slate-500">Driver:</span> <span className="font-bold text-slate-800">{result.driver}</span></div>
              <div><span className="text-slate-500">Plate:</span> <span className="font-bold font-mono text-slate-800">{result.vehiclePlate}</span></div>
              <div><span className="text-slate-500">VIN:</span> <span className="font-bold font-mono text-slate-800">{result.vehicleVin}</span></div>
              <div><span className="text-slate-500">Violations:</span> <span className="font-bold font-mono text-slate-800">{result.violationCount}</span></div>
              <div><span className="text-slate-500">OOS:</span> <span className={`font-bold font-mono ${result.oosCount > 0 ? 'text-red-700' : 'text-slate-800'}`}>{result.oosCount}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
