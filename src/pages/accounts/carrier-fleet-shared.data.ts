// Shared utilities for carrier-drivers.data.ts + carrier-assets.data.ts.
// Pure, deterministic helpers — no carrier-specific data lives here.

// ─── Deterministic PRNG (mulberry32) ─────────────────────────────────────────

export function hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function mulberry32(seed: number) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function pickWeighted<T>(rng: () => number, items: T[][], weights: number[]): T[] {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = rng() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
    }
    return items[items.length - 1];
}

export function pick<T>(rng: () => number, arr: T[]): T {
    return arr[Math.floor(rng() * arr.length) % arr.length];
}

export function pad(n: number, len: number) {
    return String(n).padStart(len, '0');
}

// ─── Regional area codes (used by driver + asset plate generators) ───────────

export const AREA_CODE_BY_STATE: Record<string, string> = {
    TX: '214', CA: '510', FL: '904', IL: '312', NY: '212', MI: '313', GA: '912',
    OR: '503', WA: '206', CO: '303', UT: '801', NM: '505', NC: '704', MA: '617',
    MO: '314', IN: '317', IA: '515', LA: '504', NE: '402', ID: '208', OH: '614',
    PA: '215', DE: '302', AZ: '602',
    ON: '905', QC: '514', BC: '604', AB: '403', MB: '204', SK: '306',
};

export function areaCodeFor(state: string): string {
    return AREA_CODE_BY_STATE[state] ?? '555';
}
