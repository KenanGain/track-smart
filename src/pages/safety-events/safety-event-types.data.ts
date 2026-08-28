// Telematics & Video safety-event type catalog.
// Defines each detected event type with a Risk Weight (0–10) and a Severity.
// Editable + persisted via the Safety Events settings page; seeded with the
// carrier's standard VEDR/telematics event set.
import { useCallback, useEffect, useState } from 'react';

export type EventSeverity = 'High' | 'Medium' | 'Low';

export interface TelematicsEventType {
  id: string;         // machine key, e.g. 'harsh_brake'
  label: string;      // display name, e.g. 'Harsh Brake'
  riskWeight: number; // 0–10 contribution to a driver's risk score
  severity: EventSeverity;
  custom?: boolean;   // user-added (vs. seeded default)
}

export const EVENT_SEVERITIES: EventSeverity[] = ['High', 'Medium', 'Low'];

export const EVENT_SEVERITY_TONE: Record<EventSeverity, string> = {
  High: 'border-red-200 bg-red-50 text-red-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  Low: 'border-slate-200 bg-slate-50 text-slate-600',
};

export const SEED_TELEMATICS_EVENT_TYPES: TelematicsEventType[] = [
  { id: 'harsh_brake', label: 'Harsh Brake', riskWeight: 10, severity: 'High' },
  { id: 'harsh_acceleration', label: 'Harsh Acceleration', riskWeight: 10, severity: 'High' },
  { id: 'harsh_turn', label: 'Harsh Turn', riskWeight: 10, severity: 'High' },
  { id: 'speeding', label: 'Speeding', riskWeight: 10, severity: 'High' },
  { id: 'crash', label: 'Crash', riskWeight: 10, severity: 'High' },
  { id: 'near_crash', label: 'Near Crash', riskWeight: 10, severity: 'High' },
  { id: 'tailgating', label: 'Tailgating', riskWeight: 10, severity: 'High' },
  { id: 'cell_phone', label: 'Cell Phone', riskWeight: 5, severity: 'Medium' },
  { id: 'distracted', label: 'Distracted', riskWeight: 7, severity: 'Medium' },
  { id: 'drowsiness', label: 'Drowsiness', riskWeight: 7, severity: 'Medium' },
  { id: 'smoking', label: 'Smoking', riskWeight: 2, severity: 'Low' },
  { id: 'seat_belt_violation', label: 'Seat Belt Violation', riskWeight: 8, severity: 'High' },
  { id: 'stop_sign_violation', label: 'Stop Sign Violation', riskWeight: 7, severity: 'Medium' },
  { id: 'red_light_violation', label: 'Red Light Violation', riskWeight: 10, severity: 'High' },
  { id: 'unsafe_lane_change', label: 'Unsafe Lane Change', riskWeight: 5, severity: 'Medium' },
  { id: 'camera_obstruction', label: 'Camera Obstruction', riskWeight: 5, severity: 'Medium' },
  { id: 'eating_and_drinking', label: 'Eating & Drinking', riskWeight: 1, severity: 'Low' },
  { id: 'rolling_stop', label: 'Rolling Stop', riskWeight: 2, severity: 'Low' },
  { id: 'unsafe_parking', label: 'Unsafe Parking', riskWeight: 2, severity: 'Low' },
];

const STORAGE_KEY = 'safety-events:telematics-types-v1';

export function loadTelematicsEventTypes(): TelematicsEventType[] {
  if (typeof window === 'undefined') return SEED_TELEMATICS_EVENT_TYPES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TelematicsEventType[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignore */ }
  return SEED_TELEMATICS_EVENT_TYPES;
}

export function saveTelematicsEventTypes(list: TelematicsEventType[]): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
}

function slugify(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `event_${Date.now()}`;
}

/** React store hook for the telematics event-type catalog (localStorage-backed). */
export function useTelematicsEventTypes() {
  const [types, setTypes] = useState<TelematicsEventType[]>(loadTelematicsEventTypes);

  useEffect(() => { saveTelematicsEventTypes(types); }, [types]);

  const update = useCallback((id: string, patch: Partial<TelematicsEventType>) => {
    setTypes(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const add = useCallback((label = 'New event type') => {
    setTypes(prev => {
      let id = slugify(label);
      while (prev.some(t => t.id === id)) id = `${id}_x`;
      return [...prev, { id, label, riskWeight: 5, severity: 'Medium', custom: true }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTypes(prev => prev.filter(t => t.id !== id));
  }, []);

  const reset = useCallback(() => setTypes(SEED_TELEMATICS_EVENT_TYPES), []);

  return { types, update, add, remove, reset };
}
