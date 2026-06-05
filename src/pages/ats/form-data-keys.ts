// Canonical driver-data keys — the "capture once, reuse everywhere" layer.
//
// Different hiring forms legitimately need the same facts (license number, DOB,
// CDL state, license country…). Instead of re-typing them on every form, each
// field can carry a `dataKey` (e.g. 'license.number'). The pipeline then:
//   • PREFILLS a field from any earlier-entered field that shares its dataKey, and
//   • EXPORTS one clean canonical JSON ({ dataKey: value }) for the hired driver.
//
// This module is intentionally dependency-free (types only) so it can be used by
// the forms data layer, the applicant portal, the template runner and the
// hire/snapshot code without import cycles.

import type { FormField } from './application-forms.data';

export interface DriverDataKeyDef { key: string; label: string; group: string }

/** The canonical driver-data schema — the JSON shape collected from a filled pipeline. */
export const DRIVER_DATA_KEYS: DriverDataKeyDef[] = [
    { key: 'driver.firstName', label: 'First name', group: 'Driver' },
    { key: 'driver.lastName', label: 'Last name', group: 'Driver' },
    { key: 'driver.fullName', label: 'Full name', group: 'Driver' },
    { key: 'driver.email', label: 'Email', group: 'Driver' },
    { key: 'driver.phone', label: 'Phone', group: 'Driver' },
    { key: 'driver.dob', label: 'Date of birth', group: 'Driver' },
    { key: 'driver.ssn', label: 'SSN / SIN', group: 'Driver' },
    { key: 'license.number', label: 'License number', group: 'License' },
    { key: 'license.state', label: 'License state / province', group: 'License' },
    { key: 'license.country', label: 'License country', group: 'License' },
    { key: 'license.class', label: 'License class', group: 'License' },
    { key: 'license.issue', label: 'License issue date', group: 'License' },
    { key: 'license.expiry', label: 'License expiry date', group: 'License' },
];

/** Built-in form field id → canonical dataKey. Applied as a backfill in normalize(). */
export const KNOWN_DATA_KEYS: Record<string, string> = {
    // Driver identity
    'f-first-name': 'driver.firstName',
    'f-last-name': 'driver.lastName',
    'f-email': 'driver.email',
    'f-phone': 'driver.phone',
    'f-ssn': 'driver.ssn',
    'f-psp-name': 'driver.fullName',
    // Date of birth (asked on Applicant, PSP, Clearinghouse)
    'f-dob': 'driver.dob', 'f-psp-dob': 'driver.dob', 'f-ch-dob': 'driver.dob',
    // License / CDL number (License, PSP, MVR, Clearinghouse)
    'f-lic-number': 'license.number', 'f-psp-cdl': 'license.number',
    'f-mvr-number': 'license.number', 'f-ch-cdl': 'license.number',
    // License state / province
    'f-psp-cdl-state': 'license.state', 'f-mvr-state': 'license.state', 'f-ch-cdl-state': 'license.state',
    // License country
    'f-psp-country': 'license.country', 'f-mvr-country': 'license.country', 'f-ch-country': 'license.country',
    // License class / dates
    'f-mvr-class': 'license.class',
    'f-mvr-issue': 'license.issue',
    'f-mvr-expiry': 'license.expiry',
};

function isEmpty(v: unknown): boolean {
    return v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** Scalar field types we can safely PREFILL with a shared canonical value. */
const SCALAR_TYPES = new Set(['text', 'textarea', 'date', 'number', 'select', 'radio']);

/** The first record of a combined compliance field's value ({ entries:[{number, expiry, …}] }). */
function complianceFirstEntry(raw: unknown): Record<string, unknown> | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const entries = (raw as { entries?: unknown }).entries;
    if (Array.isArray(entries)) return entries[0] as Record<string, unknown> | undefined;
    return raw as Record<string, unknown>;
}

/** A form + its current values, used by the canonical helpers below. */
export interface CanonicalPart { id: string; fields: FormField[]; values: Record<string, unknown> }

/**
 * Build the canonical `{ dataKey: value }` map from a sequence of forms/values.
 * First non-empty value (in order) wins. A combined `compliance` field (a linked
 * key-number + document, e.g. the Driver License) is unpacked: its number → the
 * field's dataKey, and — when that key is a `license.*` key — its issue/expiry/
 * state/country meta → the matching `license.*` keys, so a license entered once
 * fills the License-number / state / dates fields on PSP / MVR / Clearinghouse.
 */
export function collectCanonical(parts: { fields: FormField[]; values: Record<string, unknown> }[]): Record<string, unknown> {
    const canon: Record<string, unknown> = {};
    const set = (k: string | undefined, v: unknown) => { if (k && !isEmpty(v) && isEmpty(canon[k])) canon[k] = v; };
    for (const part of parts) {
        for (const f of part.fields) {
            if (f.type === 'compliance') {
                const entry = complianceFirstEntry(part.values[f.id]);
                if (entry && f.dataKey) {
                    set(f.dataKey, entry.number);
                    if (f.dataKey.startsWith('license.')) {
                        set('license.state', entry.issueState);
                        set('license.country', entry.issueCountry);
                        set('license.issue', entry.issueDate);
                        set('license.expiry', entry.expiry);
                    }
                }
                continue;
            }
            if (f.dataKey) set(f.dataKey, part.values[f.id]);
        }
    }
    return canon;
}

/**
 * Prefill every part's EMPTY scalar dataKey fields from the shared canonical map.
 * Never overwrites entered values, and never writes into structured fields
 * (compliance / document / lists). Parts are keyed by `id` (stepId in the portal,
 * formId in the test runner).
 */
export function prefillByDataKey(
    parts: CanonicalPart[],
    valuesById: Record<string, Record<string, unknown>>,
): Record<string, Record<string, unknown>> {
    const canon = collectCanonical(parts.map(p => ({ fields: p.fields, values: valuesById[p.id] ?? p.values ?? {} })));
    const next: Record<string, Record<string, unknown>> = { ...valuesById };
    for (const part of parts) {
        const vals = { ...(next[part.id] ?? {}) };
        let changed = false;
        for (const f of part.fields) {
            if (!f.dataKey || !SCALAR_TYPES.has(f.type)) continue;
            if (isEmpty(vals[f.id]) && !isEmpty(canon[f.dataKey])) { vals[f.id] = canon[f.dataKey]; changed = true; }
        }
        if (changed) next[part.id] = vals;
    }
    return next;
}
