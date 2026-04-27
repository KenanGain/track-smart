// Compliance roll-up utilities for the Accounts and Inventory views.
// Calculates expiring/missing items per carrier, asset, and driver.

import { CARRIER_ASSETS } from './carrier-assets.data';
import { CARRIER_DRIVERS } from './carrier-drivers.data';
import { hash, mulberry32 } from './carrier-fleet-shared.data';
import type { Driver } from '@/data/mock-app-data';
import type { Asset } from '@/pages/assets/assets.data';

export type ComplianceLevel = 'Compliant' | 'At Risk' | 'Non-Compliant';

export interface CarrierCompliance {
    assetIssues: number;
    assetTotal: number;
    driverIssues: number;
    driverTotal: number;
    docsMissing: number;
    docsRequired: number;
    keyNumbersMissing: number;
    keyNumbersRequired: number;
    totalIssues: number;
    overall: ComplianceLevel;
}

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

const daysUntil = (iso?: string): number => {
    if (!iso) return Infinity;
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return Infinity;
    return Math.floor((dt.getTime() - Date.now()) / ONE_DAY_MS);
};

// ── Per-asset / per-driver classification ───────────────────────────────────

export type ComplianceState = 'Compliant' | 'Expiring' | 'Expired';

export const getAssetComplianceState = (asset: Asset): ComplianceState => {
    const expiry = (asset as any).registrationExpiryDate as string | undefined;
    const d = daysUntil(expiry);
    if (d < 0) return 'Expired';
    if (d < 30) return 'Expiring';
    return 'Compliant';
};

export const getDriverComplianceState = (driver: Driver): ComplianceState => {
    const license = (driver as any).licenses?.[0];
    const expiry = license?.licenseExpiryDate as string | undefined;
    const d = daysUntil(expiry);
    if (d < 0) return 'Expired';
    if (d < 30) return 'Expiring';
    return 'Compliant';
};

// ── Per-carrier roll-up ─────────────────────────────────────────────────────

// Document and key-number requirements aren't stored per-carrier in the prototype
// data, so derive a deterministic count from the account id. Same id → same numbers.
const TOTAL_DOC_REQUIRED = 8;
const TOTAL_KN_REQUIRED = 6;

const mockMissing = (accountId: string, salt: string, max: number): number => {
    const rng = mulberry32(hash(`${accountId}:${salt}`));
    return Math.floor(rng() * (max + 1));
};

export const getCarrierCompliance = (accountId: string): CarrierCompliance => {
    const assets = CARRIER_ASSETS[accountId] ?? [];
    const drivers = CARRIER_DRIVERS[accountId] ?? [];

    const assetIssues = assets.filter((a) => getAssetComplianceState(a) !== 'Compliant').length;
    const driverIssues = drivers.filter((d) => getDriverComplianceState(d) !== 'Compliant').length;

    const docsMissing = mockMissing(accountId, 'docs', 4);
    const keyNumbersMissing = mockMissing(accountId, 'kn', 3);

    const totalIssues = assetIssues + driverIssues + docsMissing + keyNumbersMissing;

    let overall: ComplianceLevel = 'Compliant';
    if (totalIssues >= 6) overall = 'Non-Compliant';
    else if (totalIssues >= 1) overall = 'At Risk';

    return {
        assetIssues,
        assetTotal: assets.length,
        driverIssues,
        driverTotal: drivers.length,
        docsMissing,
        docsRequired: TOTAL_DOC_REQUIRED,
        keyNumbersMissing,
        keyNumbersRequired: TOTAL_KN_REQUIRED,
        totalIssues,
        overall,
    };
};

// ── UI styling maps (shared by columns and badges) ──────────────────────────

export const COMPLIANCE_LEVEL_BADGE: Record<ComplianceLevel, string> = {
    Compliant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'At Risk': 'bg-amber-50 text-amber-700 border-amber-200',
    'Non-Compliant': 'bg-red-50 text-red-700 border-red-200',
};

export const COMPLIANCE_LEVEL_DOT: Record<ComplianceLevel, string> = {
    Compliant: 'bg-emerald-500',
    'At Risk': 'bg-amber-500',
    'Non-Compliant': 'bg-red-500',
};

export const COMPLIANCE_STATE_BADGE: Record<ComplianceState, string> = {
    Compliant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Expiring: 'bg-amber-50 text-amber-700 border-amber-200',
    Expired: 'bg-red-50 text-red-700 border-red-200',
};

export const COMPLIANCE_STATE_DOT: Record<ComplianceState, string> = {
    Compliant: 'bg-emerald-500',
    Expiring: 'bg-amber-500',
    Expired: 'bg-red-500',
};
