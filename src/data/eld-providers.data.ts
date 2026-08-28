// ELD / telematics provider catalog + per-carrier API-key connections.
// Drives the Settings ▸ Integrations page and the "Company" source shown on
// the Hours of Service logs & violations lists.
import { useCallback, useEffect, useState } from 'react';

export type EldProviderId = 'samsara' | 'motive' | 'geotab' | 'lytx' | 'azuga';

export interface EldProvider {
  id: EldProviderId;
  name: string;
  /** Short one-liner describing the provider. */
  tagline: string;
  /** HOS log fields this provider syncs. */
  logsFields: string;
  /** HOS violation fields this provider syncs (blank when it only sends logs). */
  violationFields: string;
  /** Tailwind accent token used on the provider card + company chip. */
  accent: string;
}

export const ELD_PROVIDERS: EldProvider[] = [
  {
    id: 'samsara',
    name: 'Samsara',
    tagline: 'ELD, dashcam & fleet telematics',
    logsFields: 'Driver, date/time, driving, on-duty, off-duty, sleeper, yard move, personal conveyance, distance, vehicle, ruleset, certification',
    violationFields: 'Driver, violation type, description, violation start time, day start/end, duration',
    accent: 'blue',
  },
  {
    id: 'motive',
    name: 'Motive',
    tagline: 'ELD & AI dashcam (formerly KeepTruckin)',
    logsFields: 'Driver, date, driving, on-duty, off-duty, sleeper, waiting, vehicle, trailer, shipping docs, cycle, certification',
    violationFields: 'Violation type, name, start time, end time, driver/log reference',
    accent: 'orange',
  },
  {
    id: 'geotab',
    name: 'Geotab',
    tagline: 'Open telematics platform',
    logsFields: 'Driver, date/time, duty status, vehicle, location, yard move, personal conveyance, certification, annotations',
    violationFields: 'Driver, violation type, start time, end time, driving duration, hours limit, days limit',
    accent: 'emerald',
  },
  {
    id: 'lytx',
    name: 'Lytx',
    tagline: 'Video safety & DriveCam',
    logsFields: 'Driver, duty-status/HOS activity, vehicle, dates/times, HOS-related records',
    violationFields: 'HOS violation / compliance information',
    accent: 'violet',
  },
  {
    id: 'azuga',
    name: 'Azuga',
    tagline: 'Fleet tracking & ELD',
    logsFields: 'Driver, on-duty, off-duty, driving, sleeper, waiting, yard move, personal conveyance, certification',
    violationFields: '',
    accent: 'sky',
  },
];

export const ELD_PROVIDER_BY_ID: Record<string, EldProvider> =
  Object.fromEntries(ELD_PROVIDERS.map(p => [p.id, p]));

/** Company display names, in provider order — used to label log/violation rows. */
export const HOS_COMPANIES = ELD_PROVIDERS.map(p => p.name);

/** Deterministic company assignment for a driver (a driver's truck runs one ELD). */
export function companyForDriver(driverId: string): string {
  let h = 0;
  const s = driverId || 'x';
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HOS_COMPANIES[h % HOS_COMPANIES.length];
}

export const COMPANY_TONE: Record<string, string> = {
  Samsara: 'border-blue-200 bg-blue-50 text-blue-700',
  Motive: 'border-orange-200 bg-orange-50 text-orange-700',
  Geotab: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  Lytx: 'border-violet-200 bg-violet-50 text-violet-700',
  Azuga: 'border-sky-200 bg-sky-50 text-sky-700',
};

// ── Per-carrier connection store (localStorage) ──────────────────────────────
export interface EldConnection {
  apiKey: string;
  connectedAt: string; // YYYY-MM-DD
}

const STORAGE_KEY = 'eld-integrations-v1';

function keyFor(accountId?: string): string {
  return `${STORAGE_KEY}:${accountId ?? 'default'}`;
}

export function loadEldConnections(accountId?: string): Record<string, EldConnection> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(keyFor(accountId));
    if (raw) return JSON.parse(raw) as Record<string, EldConnection>;
  } catch { /* ignore */ }
  return {};
}

function saveEldConnections(accountId: string | undefined, map: Record<string, EldConnection>): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(keyFor(accountId), JSON.stringify(map)); } catch { /* ignore */ }
}

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** React store hook for a carrier's ELD provider connections. */
export function useEldIntegrations(accountId?: string) {
  const [connections, setConnections] = useState<Record<string, EldConnection>>(() => loadEldConnections(accountId));
  useEffect(() => { setConnections(loadEldConnections(accountId)); }, [accountId]);
  useEffect(() => { saveEldConnections(accountId, connections); }, [accountId, connections]);

  const connect = useCallback((id: EldProviderId, apiKey: string) => {
    setConnections(prev => ({ ...prev, [id]: { apiKey: apiKey.trim(), connectedAt: todayStr() } }));
  }, []);
  const disconnect = useCallback((id: EldProviderId) => {
    setConnections(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, []);

  return { connections, connect, disconnect };
}
