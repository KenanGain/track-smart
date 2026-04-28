// GVWR (Gross Vehicle Weight Rating) classification.
// Source: FMCSA / DOT vehicle classification table — 8 classes by GVWR.
// Canonical ranges are defined in pounds; kilogram values are the rounded
// equivalents used in the official string values. For kg input we convert
// to lbs and classify against the lb ranges.

export type WeightUnit = 'lbs' | 'kg';

export interface GVWRClass {
    /** 1–8 */
    class: number;
    label: string;
    /** Inclusive lower bound, in lb. */
    minLb: number;
    /** Inclusive upper bound, in lb. Infinity for Class 8. */
    maxLb: number;
    /** Inclusive lower bound, in kg (as published in the official table). */
    minKg: number;
    /** Inclusive upper bound, in kg. Infinity for Class 8. */
    maxKg: number;
    /** Pre-formatted display string matching the official table. */
    rangeLb: string;
    rangeKg: string;
    /** Combined "Class N: X lb (Y kg)" string from the official table. */
    stringValue: string;
}

export const GVWR_CLASSES: readonly GVWRClass[] = [
    {
        class: 1,
        label: 'Class 1',
        minLb: 0, maxLb: 6000,
        minKg: 0, maxKg: 2722,
        rangeLb: '0 – 6,000 lb',
        rangeKg: '0 – 2,722 kg',
        stringValue: 'Class 1: 0 – 6,000 lb (0 – 2,722 kg)',
    },
    {
        class: 2,
        label: 'Class 2',
        minLb: 6001, maxLb: 10000,
        minKg: 2722, maxKg: 4536,
        rangeLb: '6,001 – 10,000 lb',
        rangeKg: '2,722 – 4,536 kg',
        stringValue: 'Class 2: 6,001 – 10,000 lb (2,722 – 4,536 kg)',
    },
    {
        class: 3,
        label: 'Class 3',
        minLb: 10001, maxLb: 14000,
        minKg: 4536, maxKg: 6350,
        rangeLb: '10,001 – 14,000 lb',
        rangeKg: '4,536 – 6,350 kg',
        stringValue: 'Class 3: 10,001 – 14,000 lb (4,536 – 6,350 kg)',
    },
    {
        class: 4,
        label: 'Class 4',
        minLb: 14001, maxLb: 16000,
        minKg: 6351, maxKg: 7257,
        rangeLb: '14,001 – 16,000 lb',
        rangeKg: '6,351 – 7,257 kg',
        stringValue: 'Class 4: 14,001 – 16,000 lb (6,351 – 7,257 kg)',
    },
    {
        class: 5,
        label: 'Class 5',
        minLb: 16001, maxLb: 19500,
        minKg: 7258, maxKg: 8845,
        rangeLb: '16,001 – 19,500 lb',
        rangeKg: '7,258 – 8,845 kg',
        stringValue: 'Class 5: 16,001 – 19,500 lb (7,258 – 8,845 kg)',
    },
    {
        class: 6,
        label: 'Class 6',
        minLb: 19501, maxLb: 26000,
        minKg: 8846, maxKg: 11793,
        rangeLb: '19,501 – 26,000 lb',
        rangeKg: '8,846 – 11,793 kg',
        stringValue: 'Class 6: 19,501 – 26,000 lb (8,846 – 11,793 kg)',
    },
    {
        class: 7,
        label: 'Class 7',
        minLb: 26001, maxLb: 33000,
        minKg: 11794, maxKg: 14969,
        rangeLb: '26,001 – 33,000 lb',
        rangeKg: '11,794 – 14,969 kg',
        stringValue: 'Class 7: 26,001 – 33,000 lb (11,794 – 14,969 kg)',
    },
    {
        class: 8,
        label: 'Class 8',
        minLb: 33001, maxLb: Infinity,
        minKg: 14970, maxKg: Infinity,
        rangeLb: '33,001 lb and above',
        rangeKg: '14,969 kg and above',
        stringValue: 'Class 8: 33,001 lb and above (14,969 kg and above)',
    },
];

const KG_TO_LB = 2.20462;

const toLb = (weight: number, unit: WeightUnit): number =>
    unit === 'kg' ? weight * KG_TO_LB : weight;

/**
 * Resolve the GVWR class for a given weight + unit.
 * Returns null when the weight is missing, zero, or non-positive.
 */
export function getGVWRClass(
    weight: number | null | undefined,
    unit: WeightUnit | null | undefined,
): GVWRClass | null {
    if (weight == null || !Number.isFinite(weight) || weight <= 0) return null;
    const lb = toLb(weight, unit ?? 'lbs');
    return GVWR_CLASSES.find(c => lb >= c.minLb && lb <= c.maxLb) ?? null;
}

/** Short display label, e.g. "Class 7", or em-dash when unknown. */
export function getGVWRClassLabel(
    weight: number | null | undefined,
    unit: WeightUnit | null | undefined,
): string {
    return getGVWRClass(weight, unit)?.label ?? '—';
}

/** Human-readable category bucket used in some FMCSA contexts. */
export function getGVWRCategory(
    weight: number | null | undefined,
    unit: WeightUnit | null | undefined,
): 'Light Duty' | 'Medium Duty' | 'Heavy Duty' | null {
    const c = getGVWRClass(weight, unit);
    if (!c) return null;
    if (c.class <= 2) return 'Light Duty';
    if (c.class <= 6) return 'Medium Duty';
    return 'Heavy Duty';
}
