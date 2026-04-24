// Per-carrier Asset Database
//
// Dedicated data file for carrier assets (trucks / trailers / non-CMV vans).
// Builds `CARRIER_ASSETS` keyed by account id at module load, with exactly
// `account.assets` records per carrier. Records have proper 17-char VINs,
// jurisdiction-specific plate formats, make/model-specific year ranges,
// weights, odometer, financial structure, and transponder / registration
// details — enough to populate the Asset Detail view.

import { ACCOUNTS_DB, type AccountRecord } from './accounts.data';
import { type Asset } from '@/pages/assets/assets.data';
import { hash, mulberry32, pick, pad } from './carrier-fleet-shared.data';

// Alias so consumers that previously imported CarrierAsset still compile.
export type CarrierAsset = Asset;

// ─── Make / Model matrices ──────────────────────────────────────────────────

const TRUCK_MODELS: Record<string, { models: string[]; minYear: number; maxYear: number }> = {
    Freightliner: { models: ['Cascadia', 'Cascadia 126', 'Coronado', 'Columbia', 'M2 106'], minYear: 2017, maxYear: 2025 },
    Kenworth: { models: ['T680', 'T880', 'W990', 'T800', 'T370'], minYear: 2016, maxYear: 2025 },
    Peterbilt: { models: ['579', '389', '567', '520', '337'], minYear: 2016, maxYear: 2025 },
    Volvo: { models: ['VNL 760', 'VNL 860', 'VNR 640', 'VNL 300', 'VNL 740'], minYear: 2017, maxYear: 2025 },
    Mack: { models: ['Anthem', 'Pinnacle', 'Granite', 'TerraPro', 'LR'], minYear: 2016, maxYear: 2025 },
    International: { models: ['LT625', 'HX520', 'RH613', 'MV607', 'HV507'], minYear: 2016, maxYear: 2025 },
};
const TRAILER_MODELS: Record<string, { models: string[]; minYear: number; maxYear: number }> = {
    Utility: { models: ['3000R', '4000D-X', '4000AE', 'VS2RA'], minYear: 2015, maxYear: 2025 },
    'Great Dane': { models: ['Everest', 'Champion', 'Freedom', 'Alpine'], minYear: 2015, maxYear: 2025 },
    Wabash: { models: ['DuraPlate', 'AeroSkirt', 'ArcticLite', 'Plate Wall'], minYear: 2015, maxYear: 2025 },
    'Hyundai Translead': { models: ['Composite', 'Hybrid', 'Dry Van', 'Reefer'], minYear: 2016, maxYear: 2025 },
    Stoughton: { models: ['PureBlue', 'Z-Plus', 'Ultra Light'], minYear: 2015, maxYear: 2025 },
};
const VAN_MODELS: Record<string, { models: string[]; minYear: number; maxYear: number }> = {
    Ford: { models: ['Transit 250', 'Transit 350', 'E-Transit'], minYear: 2018, maxYear: 2025 },
    'Mercedes-Benz': { models: ['Sprinter 2500', 'Sprinter 3500', 'Sprinter 4500'], minYear: 2018, maxYear: 2025 },
    Ram: { models: ['ProMaster 1500', 'ProMaster 2500', 'ProMaster 3500'], minYear: 2018, maxYear: 2025 },
    Chevrolet: { models: ['Express 2500', 'Express 3500'], minYear: 2018, maxYear: 2025 },
};
const COLORS = ['White', 'Black', 'Silver', 'Red', 'Blue', 'Gray', 'Green'];
const FINANCIAL: Asset['financialStructure'][] = ['Owned', 'Leased', 'Financed'];

// ─── VIN generator (17-char, deterministic, simplified — not checksum-valid)

const VIN_CHARS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'; // I, O, Q excluded per SAE J853
const YEAR_CODES: Record<number, string> = {
    2015: 'F', 2016: 'G', 2017: 'H', 2018: 'J', 2019: 'K',
    2020: 'L', 2021: 'M', 2022: 'N', 2023: 'P', 2024: 'R',
    2025: 'S', 2026: 'T',
};
function makeVin(seed: string, year: number): string {
    const rng = mulberry32(hash(seed));
    const char = () => VIN_CHARS[Math.floor(rng() * VIN_CHARS.length)];
    const wmi = char() + char() + char();
    const vds = char() + char() + char() + char() + char() + char();
    const check = VIN_CHARS[Math.floor(rng() * VIN_CHARS.length)];
    const yr = YEAR_CODES[year] ?? 'X';
    const plant = char();
    const serial = String(Math.floor(rng() * 999999)).padStart(6, '0');
    return (wmi + vds + check + yr + plant + serial).slice(0, 17).toUpperCase();
}

// ─── Plate format helpers ────────────────────────────────────────────────────

function makePlate(jurisdiction: string, idx: number): string {
    const L = (n: number) => String.fromCharCode(65 + Math.abs(n) % 26);
    switch (jurisdiction) {
        case 'TX': return `${L(idx)}${L(idx + 3)}${L(idx + 7)} ${1000 + idx % 9000}`;
        case 'CA': return `${8 + idx % 2}${L(idx)}${L(idx + 2)}${L(idx + 5)}${pad(100 + idx % 900, 3)}`;
        case 'NY': return `${L(idx)}${L(idx + 1)}${L(idx + 2)} ${1000 + idx % 9000}`;
        case 'FL': return `${L(idx)}${L(idx + 4)}${L(idx + 8)} ${pad(10 + idx % 90, 2)}${L(idx + 11)}`;
        case 'IL': return `P${idx}${pad(1000 + idx % 9000, 4)}`;
        case 'OR': return `${pad(100 + idx % 900, 3)}${L(idx)}${L(idx + 2)}${L(idx + 5)}`;
        case 'WA': return `${L(idx)}${pad(1000 + idx % 9000, 4)}${L(idx + 3)}${L(idx + 7)}`;
        case 'GA': return `${L(idx)}${L(idx + 2)}${L(idx + 5)}${pad(1000 + idx % 9000, 4)}`;
        case 'ON': return `${L(idx)}${L(idx + 1)}${L(idx + 2)} ${1000 + idx % 9000}`;
        case 'QC': return `${L(idx)}${pad(100 + idx % 900, 3)} ${L(idx + 2)}${L(idx + 5)}`;
        case 'AB': return `${L(idx)}${L(idx + 3)}${L(idx + 6)} ${pad(1000 + idx % 9000, 4)}`;
        case 'BC': return `${L(idx)}${L(idx + 2)} ${pad(1000 + idx % 9000, 4)}`;
        default: return `${L(idx)}${L(idx + 2)}${L(idx + 4)} ${pad(1000 + idx % 9000, 4)}`;
    }
}

// ─── Asset builder ─────────────────────────────────────────────────────────

function buildAssetsForCarrier(account: AccountRecord, count: number): Asset[] {
    if (count <= 0) return [];
    const rng = mulberry32(hash('assets:' + account.id));

    // Fleet mix aligned 1:1 with the MCS-150 overview:
    //   - Trucks = CMV Power Units
    //   - Vans   = Non-CMV
    // No trailers are generated, so: Power Units + Non-CMV == total assets,
    // and the Assets tab count matches the Fleet Overview exactly.
    //
    // Ratio: 80% Power Units / 20% Non-CMV, with small-fleet guard clauses
    // so the non-CMV count never rounds up past the total.
    const vans = count <= 2 ? (count === 2 ? 1 : 0) : Math.max(1, Math.round(count * 0.20));
    const trucks = Math.max(1, count - vans);
    const trailers = 0;

    const shortId = account.id.replace('acct-', '');
    const prefix = (account.dbaName.replace(/[^A-Za-z]/g, '').slice(0, 3) || 'UNK').toUpperCase();
    const plateCountry: 'USA' | 'Canada' = account.country === 'CA' ? 'Canada' : 'USA';

    const out: Asset[] = [];
    let idx = 0;

    const pushAsset = (
        type: 'Truck' | 'Trailer' | 'Van',
        category: 'CMV' | 'Non-CMV',
        vehicleType: string,
        matrix: typeof TRUCK_MODELS
    ) => {
        const makes = Object.keys(matrix);
        const make = pick(rng, makes);
        const spec = matrix[make];
        const model = pick(rng, spec.models);
        const year = spec.minYear + Math.floor(rng() * (spec.maxYear - spec.minYear + 1));
        const unit = `${prefix}-${type === 'Truck' ? 'T' : type === 'Trailer' ? 'TR' : 'V'}${pad(100 + idx, 4)}`;
        const id = `AST-${shortId}-${pad(idx + 1, 4)}`;

        const rStatus = rng();
        const operationalStatus: Asset['operationalStatus'] =
            rStatus < 0.85 ? 'Active' :
            rStatus < 0.93 ? 'Maintenance' :
            rStatus < 0.98 ? 'OutOfService' :
            'Deactivated';

        const regIssueYear = 2022 + Math.floor(rng() * 3);
        const regIssueDate = `${regIssueYear}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 27), 2)}`;
        const regExpiryDate = `${regIssueYear + 2}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 27), 2)}`;
        const dateAdded = `${2016 + Math.floor(rng() * 9)}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 27), 2)}`;

        const gross = type === 'Truck' ? 52000 + Math.floor(rng() * 28000)
            : type === 'Trailer' ? 65000 + Math.floor(rng() * 15000)
            : 10000 + Math.floor(rng() * 4000);

        const unloaded = type === 'Truck' ? 18000 + Math.floor(rng() * 4000)
            : type === 'Trailer' ? 14000 + Math.floor(rng() * 3000)
            : 5000 + Math.floor(rng() * 1500);

        // ~60% of trucks have a transponder (PrePass, BestPass, etc.).
        const hasTransponder = type === 'Truck' && rng() < 0.6;

        out.push({
            id,
            unitNumber: unit,
            assetCategory: category,
            assetType: type,
            vehicleType,
            operationalStatus,
            vin: makeVin(`${account.id}:${id}`, year),
            year,
            make,
            model,
            color: pick(rng, COLORS),
            financialStructure: FINANCIAL[idx % FINANCIAL.length],
            plateNumber: makePlate(account.state, idx),
            plateJurisdiction: account.state,
            plateCountry,
            plateType: type === 'Trailer' ? 'Apportioned' : 'Commercial',
            registrationIssueDate: regIssueDate,
            registrationExpiryDate: regExpiryDate,
            insuranceAddedDate: dateAdded,
            dateAdded,
            grossWeight: gross,
            grossWeightUnit: account.country === 'CA' ? 'kg' : 'lbs',
            unloadedWeight: unloaded,
            unloadedWeightUnit: account.country === 'CA' ? 'kg' : 'lbs',
            odometer: type === 'Trailer' ? undefined : 40000 + Math.floor(rng() * 400000),
            odometerUnit: account.country === 'CA' ? 'km' : 'mi',
            transponderNumber: hasTransponder ? `PP-${pad((hash(id + 'tx') % 9999999), 7)}` : undefined,
            transponderIssueDate: hasTransponder ? regIssueDate : undefined,
            transponderExpiryDate: hasTransponder
                ? `${regIssueYear + 3}-${pad(1 + Math.floor(rng() * 12), 2)}-${pad(1 + Math.floor(rng() * 27), 2)}`
                : undefined,
            ownerName: account.legalName,
            notes: '',
            city: account.city,
            stateProvince: account.state,
            country: account.country === 'CA' ? 'Canada' : 'USA',
        });
        idx++;
    };

    for (let i = 0; i < trucks; i++) pushAsset('Truck', 'CMV', 'Power Unit', TRUCK_MODELS);
    for (let i = 0; i < trailers; i++) pushAsset('Trailer', 'CMV', 'Dry Van Trailer', TRAILER_MODELS);
    for (let i = 0; i < vans; i++) pushAsset('Van', 'Non-CMV', 'Cargo Van', VAN_MODELS);

    return out;
}

// ─── Eagerly build the per-carrier asset map ─────────────────────────────────

export const CARRIER_ASSETS: Record<string, Asset[]> = {};

for (const account of ACCOUNTS_DB) {
    CARRIER_ASSETS[account.id] = buildAssetsForCarrier(account, account.assets);
}

export const getAssetsForAccount = (accountId: string): Asset[] =>
    CARRIER_ASSETS[accountId] ?? [];

export const getAssetById = (accountId: string, assetId: string): Asset | undefined =>
    CARRIER_ASSETS[accountId]?.find(a => a.id === assetId);

export const getFleetCountsForAccount = (accountId: string) => {
    const assets = CARRIER_ASSETS[accountId] ?? [];
    return {
        powerUnits: assets.filter(a => a.assetType === 'Truck').length,
        trailers: assets.filter(a => a.assetType === 'Trailer').length,
        nonCmv: assets.filter(a => a.assetType === 'Van').length,
        totalAssets: assets.length,
    };
};
