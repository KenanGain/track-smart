// Per-carrier Accidents (deterministic mock data)
//
// For every carrier in `ACCOUNTS_DB` (other than the demo Acme account, which
// keeps the hand-curated INCIDENTS list verbatim) this file synthesises a
// small set of accident records keyed to that carrier's drivers, assets, and
// home jurisdiction. The records use the same shape as `INCIDENTS`, plus an
// `accountId` field so the AccidentsPage can filter by selected carrier.

import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-fleet.data";
import { hash, mulberry32, pick } from "@/pages/accounts/carrier-fleet-shared.data";
import { ACCIDENT_TYPES } from "@/data/accident-types.data";
import { INCIDENTS } from "./incidents.data";

const PRIMARY_CAUSES = [
    "Fatigue", "Load Securement", "Mechanical Failure",
    "Unsafe Behaviour", "Cargo Transfer", "Driver Health",
    "Third Party", "Unknown",
];
const ROAD_TYPES   = ["Urban", "Interstate", "Rural", "Highway", "Industrial"];
const TRAFFIC_CTRL = ["Stop Sign", "Traffic Signal", "Yield", "None"];
const WEATHER      = ["Clear", "Rain", "Snow", "Fog", "Wind", "Overcast"];
const ROAD_COND    = ["Dry", "Wet", "Icy", "Snow-Covered", "Slush"];
const LIGHT        = ["Daylight", "Dawn", "Dusk", "Dark - Lighted", "Dark - Unlit"];
const TERRAIN      = ["Straight and Flat", "Curved", "Hilly", "Mountainous"];
const STATUS_VALS  = [
    { value: "active",   label: "Active"   },
    { value: "closed",   label: "Closed"   },
    { value: "open",     label: "Open"     },
    { value: "review",   label: "In Review"},
];
const PREVENTABILITY = [
    { value: "tbd",             isPreventable: null,  notes: "" },
    { value: "preventable",     isPreventable: true,  notes: "Carrier safety review classified preventable." },
    { value: "non_preventable", isPreventable: false, notes: "Other party at fault." },
];

// ── Per-country location pools ─────────────────────────────────────────────

const LOCATIONS_US = [
    { city: "Dallas",        state: "TX", zip: "75201", lat: 32.78, lng: -96.80 },
    { city: "Atlanta",       state: "GA", zip: "30303", lat: 33.75, lng: -84.39 },
    { city: "Phoenix",       state: "AZ", zip: "85003", lat: 33.45, lng: -112.07 },
    { city: "Chicago",       state: "IL", zip: "60601", lat: 41.88, lng: -87.63 },
    { city: "Charlotte",     state: "NC", zip: "28202", lat: 35.23, lng: -80.84 },
    { city: "Memphis",       state: "TN", zip: "38103", lat: 35.15, lng: -90.05 },
    { city: "Indianapolis",  state: "IN", zip: "46204", lat: 39.77, lng: -86.16 },
    { city: "Kansas City",   state: "MO", zip: "64106", lat: 39.10, lng: -94.58 },
    { city: "Salt Lake City",state: "UT", zip: "84101", lat: 40.76, lng: -111.89 },
    { city: "Denver",        state: "CO", zip: "80202", lat: 39.74, lng: -104.99 },
];

const LOCATIONS_CA = [
    { city: "Mississauga",  state: "ON", zip: "L5T 2G9", lat: 43.60, lng: -79.65 },
    { city: "Brampton",     state: "ON", zip: "L6T 5M1", lat: 43.73, lng: -79.76 },
    { city: "Calgary",      state: "AB", zip: "T2A 6R7", lat: 51.04, lng: -114.07 },
    { city: "Edmonton",     state: "AB", zip: "T5J 0K7", lat: 53.55, lng: -113.49 },
    { city: "Vancouver",    state: "BC", zip: "V5K 0A1", lat: 49.28, lng: -123.12 },
    { city: "Surrey",       state: "BC", zip: "V3R 0H8", lat: 49.19, lng: -122.85 },
    { city: "Winnipeg",     state: "MB", zip: "R3C 1A6", lat: 49.90, lng: -97.14 },
    { city: "Halifax",      state: "NS", zip: "B3J 1S1", lat: 44.65, lng: -63.58 },
    { city: "Charlottetown",state: "PE", zip: "C1A 1J3", lat: 46.24, lng: -63.13 },
    { city: "Montreal",     state: "QC", zip: "H2X 3X8", lat: 45.50, lng: -73.57 },
];

// ── Builder ────────────────────────────────────────────────────────────────

function isoOffset(daysAgo: number, hour = 9): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, Math.floor(Math.random() * 0), 0, 0); // wall-clock noise off — deterministic
    return d.toISOString();
}

function buildForCarrier(account: AccountRecord) {
    const r = mulberry32(hash(`accidents:${account.id}`));
    const assets   = CARRIER_ASSETS[account.id] ?? [];
    const drivers  = CARRIER_DRIVERS[account.id] ?? [];
    if (assets.length === 0 || drivers.length === 0) return [];

    // 0–6 records depending on the carrier size and PRNG seed.
    const baseCount = Math.min(6, Math.max(0, Math.floor(assets.length / 8)));
    const count = Math.max(0, baseCount + (r() < 0.5 ? 0 : 1));
    if (count === 0) return [];

    const isCanada = account.country === "CA";
    const locations = isCanada ? LOCATIONS_CA : LOCATIONS_US;

    const out: any[] = [];
    for (let i = 0; i < count; i++) {
        const accidentType = pick(r, ACCIDENT_TYPES);
        // Cast to `any` for field access — the demo seed reads optional
        // properties (driverId, ageBand, experienceYears, tenureYears,
        // licenseStateProvince, licensePlate, commodityType, etc.) that
        // are not on the Driver / Asset public types but exist on the
        // generated seed records.
        const driver = pick(r, drivers) as any;
        const asset  = pick(r, assets)  as any;
        const loc    = pick(r, locations);
        const cause  = pick(r, PRIMARY_CAUSES);
        const status = pick(r, STATUS_VALS);
        const prev   = pick(r, PREVENTABILITY);
        const daysAgo = 14 + Math.floor(r() * 700); // last ~2 years
        const occurredAt = isoOffset(daysAgo);
        const occurredDate = occurredAt.slice(0, 10);

        const fatalities = accidentType.group === "Severity" && r() < 0.3 ? 1 : 0;
        const injuries   = accidentType.group === "Severity" || r() < 0.35 ? 1 + Math.floor(r() * 3) : 0;
        const towAway    = r() < 0.55;
        const vehiclesTowed = towAway ? 1 + Math.floor(r() * 2) : 0;
        const hazmat = accidentType.id === "hazmat_release";

        const companyCost   = 1000 + Math.floor(r() * 9000);
        const insurancePaid = 5000 + Math.floor(r() * 30000);
        const reserves      = 1000 + Math.floor(r() * 12000);

        out.push({
            accountId: account.id,
            incidentId: `INC-${account.id.toUpperCase().replace("ACCT-", "C")}-${String(i + 1).padStart(3, "0")}`,
            insuranceClaimNumber: `CLM-${account.id.replace("acct-", "")}${1000 + Math.floor(r() * 9000)}`,
            occurredAt,
            occurredDate,
            incidentKind: [r() < 0.5 ? "crash_report" : "operational_accident"],
            driver: {
                driverId: driver.driverId,
                name: driver.name,
                ageBand: driver.ageBand ?? "31 - 35",
                driverType: driver.driverType ?? "Long Haul Driver",
                drivingExperience: driver.experienceYears ? `${driver.experienceYears} Years` : "4 Years",
                lengthOfEmployment: driver.tenureYears ? `${driver.tenureYears} Year${driver.tenureYears === 1 ? "" : "s"}` : "1 Year",
                hrsDriving: 2 + Math.floor(r() * 9),
                hrsOnDuty: 3 + Math.floor(r() * 9),
                email: driver.email ?? `${(driver.name || "driver").toLowerCase().replace(/\s+/g, ".")}@${account.id}.example`,
                phone: driver.phone ?? "(555) 000-0000",
                license: driver.licenseNumber ?? `${(driver.name || "DRV").slice(0, 3).toUpperCase()}${Math.floor(r() * 99999999)}`,
                licenseState: driver.licenseStateProvince ?? loc.state,
            },
            location: {
                unit: "",
                streetAddress: `${100 + Math.floor(r() * 9000)} ${pick(r, ["Industrial", "Highway", "Centre", "Main", "Commerce"])} ${pick(r, ["Rd", "Ave", "Blvd", "Dr"])}`,
                city: loc.city,
                stateOrProvince: loc.state,
                country: isCanada ? "Canada" : "USA",
                zip: loc.zip,
                full: `${loc.city}, ${loc.state}`,
                geo: { lat: loc.lat, lng: loc.lng },
                locationType: pick(r, ["Industrial Area", "Urban Area", "Rural Area", "Highway", "Parking Lot"]),
            },
            vehicles: [
                {
                    assetId: asset.id,
                    vin: asset.vin ?? "1XXXXXXXXXXXXXXXX",
                    licenseNumber: asset.licensePlate ?? `${loc.state}-${1000 + Math.floor(r() * 9000)}`,
                    licenseStateOrProvince: asset.licenseStateOrProvince ?? loc.state,
                    vehicleType: asset.vehicleType ?? asset.assetType ?? "Power Unit",
                    make: asset.make ?? "Freightliner",
                    model: asset.model ?? "Cascadia",
                    year: asset.year ?? 2021,
                    commodityType: asset.commodityType ?? "General Dry Freight",
                    assetCategory: asset.assetCategory ?? "CMV",
                },
            ],
            severity: {
                fatalities,
                injuriesNonFatal: injuries,
                towAway,
                vehiclesTowed,
                hazmatReleased: hazmat,
                hazardousCommodity:    hazmat ? "Class 3 Flammable Liquid" : "",
                hazmatClass:           hazmat ? "3 — Flammable Liquids" : "",
                hazmatUnNumber:        hazmat ? `UN${1200 + Math.floor(r() * 800)}` : "",
                hazmatQuantityReleased: hazmat ? `${50 + Math.floor(r() * 450)} L` : "",
                hazmatPlacarded:       hazmat,
            },
            roadway: {
                postedSpeedLimitKmh: pick(r, [40, 50, 60, 70, 80, 90, 100, 110]),
                roadType:        pick(r, ROAD_TYPES),
                trafficControl:  pick(r, TRAFFIC_CTRL),
                weatherConditions: pick(r, WEATHER),
                roadConditions:  pick(r, ROAD_COND),
                light:           pick(r, LIGHT),
                terrain:         pick(r, TERRAIN),
            },
            classification: {
                fmcsaReportable: fatalities > 0 || injuries > 0 || towAway,
                accidentType: towAway ? "Tow Away" : (injuries > 0 ? "Injury" : "Property Damage Only"),
                policeReport: r() < 0.7,
            },
            preventability: { value: prev.value, isPreventable: prev.isPreventable, notes: prev.notes },
            cause: {
                primaryCause: cause,
                incidentType: accidentType.displayName,
            },
            costs: {
                currency: isCanada ? "CAD" : "USD",
                companyCostsFromDollarOne: companyCost,
                insuranceCostsPaid: insurancePaid,
                insuranceReserves: reserves,
                totalAccidentCosts: companyCost + insurancePaid + reserves,
            },
            followUp: {
                action:   "Driver retraining scheduled; vehicle inspected and returned to service.",
                comments: "Telematics review completed.",
            },
            status: { value: status.value, label: status.label },
            sources: ["fmcsa_crash_feed", "ui_accident_table"],
            documents: [] as string[],

            // ── References & Identifiers (new) ──────────────────────────
            references: {
                microfilmNumber:      `MF-${(account.country === "CA" ? "CA" : "US")}${1000000 + Math.floor(r() * 8999999)}`,
                policeReportNumber:   `PR-${loc.state}-${100000 + Math.floor(r() * 899999)}`,
                policeAgency:         pick(r, [
                    `${loc.city} Police Service`, `${loc.state} State Patrol`,
                    `${loc.state} Highway Patrol`, "Royal Canadian Mounted Police",
                    "County Sheriff's Office",
                ]),
                investigatingOfficer: pick(r, [
                    "Officer M. Reynolds", "Officer J. Patel", "Officer S. O'Brien",
                    "Sgt. R. Cohen", "Cst. T. Nguyen", "Tpr. K. Williams",
                ]),
                officerBadge:         `B-${1000 + Math.floor(r() * 8999)}`,
                citationNumber:       r() < 0.55 ? `CT-${loc.state}-${10000 + Math.floor(r() * 89999)}` : "",
                usdotNumber:          isCanada ? "" : String(1000000 + Math.floor(r() * 8999999)),
                cvorNumber:           loc.state === "ON" ? `${100000000 + Math.floor(r() * 899999999)}` : "",
                nscNumber:            isCanada ? `NSC-${100000 + Math.floor(r() * 899999)}` : "",
                mcNumber:             isCanada ? "" : `MC-${100000 + Math.floor(r() * 899999)}`,
                firstNoticeOfLoss:    isoOffset(daysAgo - 1, 8 + Math.floor(r() * 4)),
                reportingSource:      pick(r, ["Driver", "Dispatcher", "Police", "Insurance", "Telematics"]),
            },

            // ── Trailer & Trip Details (new) ────────────────────────────
            equipment: {
                trailer1UnitNumber: `T-${1000 + Math.floor(r() * 8999)}`,
                trailer1Plate:      `${loc.state}-${1000 + Math.floor(r() * 8999)}`,
                trailer1Vin:        `1T${(Math.floor(r() * 1e15)).toString(36).toUpperCase().padEnd(15, "X").slice(0, 15)}`,
                trailer2UnitNumber: r() < 0.25 ? `T-${1000 + Math.floor(r() * 8999)}` : "",
                trailer2Plate:      "",
                trailer2Vin:        "",
                odometer:           80000 + Math.floor(r() * 600000),
                gvw:                40000 + Math.floor(r() * 40000),
                axles:              pick(r, [3, 4, 5, 5, 6]),
                tripStatus:         pick(r, ["Loaded", "Loaded", "Empty", "Bobtail", "Deadhead"]),
                originCity:         pick(r, locations).city,
                originState:        pick(r, locations).state,
                destinationCity:    loc.city,
                destinationState:   loc.state,
                lastDutyStatus:     pick(r, ["Driving", "On-Duty (not driving)", "Sleeper Berth"]),
                lastDvirStatus:     pick(r, ["Pre-Trip Pass", "Pre-Trip Pass", "Pre-Trip Pass", "Pre-Trip Fail", "Not Performed"]),
            },

            // ── Insurance, Tow & Repair (new) ───────────────────────────
            insurance: {
                carrierName:        pick(r, [
                    "Northbridge Insurance", "Intact Insurance", "Travelers", "Great West Casualty",
                    "Sentry Insurance", "Echelon Insurance", "Old Republic", "Berkshire Hathaway GUARD",
                ]),
                policyNumber:       `POL-${100000 + Math.floor(r() * 899999)}`,
                adjusterName:       pick(r, [
                    "Maria Chen", "David Singh", "Priya Patel", "John Mitchell",
                    "Jacques Tremblay", "Anita Brown", "Kevin Walsh",
                ]),
                adjusterPhone:      `(${200 + Math.floor(r() * 700)}) ${100 + Math.floor(r() * 899)}-${1000 + Math.floor(r() * 8999)}`,
                tpaName:            r() < 0.4 ? pick(r, ["Sedgwick", "Crawford & Company", "Gallagher Bassett"]) : "",
                towCompany:         pick(r, [
                    `${loc.city} Towing Co.`, "AAA Heavy Tow", "Big Rig Recovery",
                    "Reliable Towing & Salvage", "Highway Heroes Towing",
                ]),
                towBill:            500 + Math.floor(r() * 4500),
                repairVendor:       pick(r, [
                    "Acme Truck Body & Repair", "Premier Collision", "Pro Truck Service Center",
                    "Anderson Heavy Duty", "Capitol Truck Service",
                ]),
                repairStatus:       pick(r, ["Pending", "In Progress", "Completed", "Awaiting Parts"]),
                totalLoss:          r() < 0.15,
                subrogationPending: r() < 0.4,
            },

            // ── Other Party (new) ───────────────────────────────────────
            otherParty: r() < 0.65 ? {
                driverName:        pick(r, [
                    "Alex Murphy", "Jordan Khan", "Taylor Brown", "Sam Wilson", "Morgan Lee",
                    "Riley Davis", "Casey Martinez", "Jamie Thompson",
                ]),
                driverPhone:       `(${200 + Math.floor(r() * 700)}) ${100 + Math.floor(r() * 899)}-${1000 + Math.floor(r() * 8999)}`,
                driverLicense:     `${pick(r, ["A", "B", "C", "D"])}${100000000 + Math.floor(r() * 899999999)}`,
                driverLicenseState: loc.state,
                vehicleMake:       pick(r, ["Honda", "Toyota", "Ford", "Chevrolet", "Nissan", "Hyundai", "Mazda", "Subaru"]),
                vehicleModel:      pick(r, ["Civic", "Corolla", "Focus", "Silverado", "Sentra", "Elantra", "CX-5", "Outback"]),
                vehicleYear:       2014 + Math.floor(r() * 12),
                vehiclePlate:      `${loc.state}-${100 + Math.floor(r() * 8999)}`,
                insuranceCarrier:  pick(r, ["State Farm", "GEICO", "Progressive", "Allstate", "Liberty Mutual", "TD Insurance", "Belairdirect"]),
                insurancePolicy:   `OP-${100000 + Math.floor(r() * 899999)}`,
                atFault:           r() < 0.55,
                citationIssued:    r() < 0.4,
            } : {},
        });
    }
    return out;
}

// ── Public API ─────────────────────────────────────────────────────────────

const built = (() => {
    const all: any[] = [];
    const byCarrier: Record<string, any[]> = {};
    // Acme (acct-001) keeps the hand-curated demo records.
    const acmeId = "acct-001";
    const acme = INCIDENTS.map((rec) => ({ ...rec, accountId: acmeId }));
    byCarrier[acmeId] = acme;
    all.push(...acme);
    for (const account of ACCOUNTS_DB) {
        if (account.id === acmeId) continue;
        const list = buildForCarrier(account);
        byCarrier[account.id] = list;
        all.push(...list);
    }
    return { all, byCarrier };
})();

/** All accident records across every carrier, with `accountId` set. */
export const CARRIER_INCIDENTS_ALL = built.all;

/** Per-carrier breakdown: `{ [accountId]: incidents[] }`. */
export const CARRIER_INCIDENTS_BY_CARRIER: Record<string, any[]> = built.byCarrier;

/** Get accident records for a specific carrier. */
export function getAccidentsForCarrier(accountId: string): any[] {
    return built.byCarrier[accountId] ?? [];
}
