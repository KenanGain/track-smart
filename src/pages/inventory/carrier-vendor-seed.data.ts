// Per-carrier Vendor Seed (auto-generated)
//
// Vendors for carriers acct-004 → acct-030 generated deterministically from
// each carrier's location. Carriers acct-001, acct-002, acct-003 keep the
// existing hand-curated entries in `inventory.data.ts`.
//
// Seed coverage per carrier (5 vendors each):
//   1. Local truck repair shop      (cat-repair-maintenance)
//   2. Local tire centre            (cat-repair-maintenance)
//   3. Fuel-card vendor             (cat-fuel-card)
//   4. ELD provider                 (cat-eld-provider)
//   5. Dashcam / GPS                (cat-dashcam OR cat-gps-tracking)
//
// Acts as backend data for the Inventory > Vendors page. The Vendor schema
// matches the canonical `Vendor` type in `inventory.data.ts` exactly.

import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import type { Vendor } from "./inventory.data";

// ── Static national vendors (rotated across carriers) ───────────────────────

const FUEL_CARD_VENDORS = [
    { name: "Comdata",       company: "Comdata Inc.",       email: "support@comdata.com",   phone: "(800) 749-7166", contact: "Lisa Howard",   info: "lisa.h@comdata.com",   street: "5301 Maryland Way",   city: "Brentwood",      state: "TN", zip: "37027", country: "United States" as const },
    { name: "EFS",           company: "EFS LLC",             email: "fleet@efsllc.com",      phone: "(888) 824-7378", contact: "Marcus Reilly", info: "marcus.r@efsllc.com",   street: "100 Westfield Pl",   city: "Murfreesboro",   state: "TN", zip: "37129", country: "United States" as const },
    { name: "WEX Fleet",     company: "WEX Inc.",            email: "fleet@wexinc.com",      phone: "(866) 939-3933", contact: "Tyrone Banks",  info: "tyrone.b@wexinc.com",   street: "1 Hancock St",       city: "Portland",        state: "ME", zip: "04101", country: "United States" as const },
    { name: "RTS Carrier",   company: "RTS Financial",       email: "support@rtsinc.com",    phone: "(800) 860-2370", contact: "Jenna Ortiz",   info: "jenna.o@rtsinc.com",    street: "9001 State Line Rd", city: "Leawood",         state: "KS", zip: "66206", country: "United States" as const },
    { name: "Esso Fleet",    company: "Imperial Oil Ltd.",   email: "fleet@essofleet.ca",    phone: "(800) 567-3776", contact: "Henri Caron",   info: "h.caron@essofleet.ca",  street: "505 Quarry Park Blvd",city:"Calgary",          state: "AB", zip: "T2C 5N1", country: "Canada" as const },
];

const ELD_VENDORS = [
    { name: "Samsara",        company: "Samsara Inc.",         email: "fleet-support@samsara.com", phone: "(415) 985-2400", contact: "Priya Patel",  info: "priya@samsara.com",       street: "1 De Haro St",        city: "San Francisco",  state: "CA", zip: "94103", country: "United States" as const },
    { name: "Motive",         company: "Motive Technologies",  email: "fleet@gomotive.com",        phone: "(855) 434-3564", contact: "Hugo Reyes",    info: "h.reyes@gomotive.com",   street: "55 Hawthorne St",     city: "San Francisco",  state: "CA", zip: "94105", country: "United States" as const },
    { name: "Geotab",         company: "Geotab Inc.",          email: "support@geotab.com",        phone: "(877) 436-8221", contact: "Tom Becker",    info: "tom@geotab.com",          street: "2440 Winston Park Dr", city: "Oakville",      state: "ON", zip: "L6H 7V2", country: "Canada" as const },
    { name: "Verizon Connect",company: "Verizon Connect Inc.", email: "fleet@verizonconnect.com",  phone: "(866) 844-2235", contact: "Sandra Webb",   info: "s.webb@verizonconnect.com",street: "8001 Irvine Center Dr",city: "Irvine",       state: "CA", zip: "92618", country: "United States" as const },
];

const DASHCAM_VENDORS = [
    { name: "Lytx",        company: "Lytx Inc.",         email: "service@lytx.com",   phone: "(866) 419-5861", contact: "Angela Cruz",  info: "angela.cruz@lytx.com",   street: "9785 Towne Centre Dr", city: "San Diego",   state: "CA", zip: "92121", country: "United States" as const, category: "cat-dashcam" },
    { name: "Netradyne",   company: "Netradyne Inc.",    email: "fleet@netradyne.com",phone: "(858) 381-1500", contact: "Ravi Sharma",  info: "r.sharma@netradyne.com", street: "5005 Wateridge Vista Dr",city: "San Diego", state: "CA", zip: "92121", country: "United States" as const, category: "cat-dashcam" },
    { name: "Trimble Maps",company: "Trimble Inc.",      email: "fleet@trimble.com",  phone: "(800) 874-6253", contact: "Stuart McKay", info: "stuart.m@trimble.com",   street: "10368 Westmoor Dr",   city: "Westminster",  state: "CO", zip: "80021", country: "United States" as const, category: "cat-gps-tracking" },
];

// ── Local-shop name pool keyed on carrier state/province ────────────────────

interface LocalShopName {
    repairShop: string;
    repairCompany: string;
    tireCenter: string;
    tireCompany: string;
}

function localShopsFor(account: AccountRecord, seed: number): LocalShopName {
    // Use city + state to give each local shop a regional flavour.
    const city = account.city || "Local";
    const province = account.country === "CA"
        ? `${city} Diesel Service`
        : `${city} Diesel Repair`;
    return {
        repairShop:    province,
        repairCompany: `${province} Ltd.${account.country === "CA" ? "" : ""}`.replace("Ltd. ", "Ltd."),
        tireCenter:    `${city} Tire & Wheel`,
        tireCompany:   `${city} Tire & Wheel ${account.country === "CA" ? "Inc." : "LLC"}`,
        // seed used to vary fake addresses below — kept here in case we extend.
    } as LocalShopName & { _seed?: number } as LocalShopName;
    void seed;
}

function fakeStreet(seed: number): string {
    const streets = [
        "Industrial Pkwy", "Commerce Way", "Service Rd", "Trade Center Dr",
        "Logistics Blvd", "Fleet Ave", "Truckers Way", "Transport Rd",
        "Highway 401 Service Rd", "Cross-Dock Cir",
    ];
    return `${1000 + (seed % 9000)} ${streets[seed % streets.length]}`;
}

function fakeZip(state: string, seed: number): string {
    if (["ON","QC","BC","AB","MB","SK","NB","NS","PE","NL"].includes(state.toUpperCase())) {
        const letters = "ABCEGHJKLMNPRSTVXY";
        const L = (n: number) => letters[Math.abs(n) % letters.length];
        const D = (n: number) => Math.abs(n) % 10;
        return `${L(seed)}${D(seed)}${L(seed + 7)} ${D(seed + 1)}${L(seed + 13)}${D(seed + 3)}`;
    }
    return String(10000 + (seed % 89999));
}

function hash(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h = (h ^ s.charCodeAt(i)) >>> 0;
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}

// ── Per-carrier vendor builder ──────────────────────────────────────────────

function buildVendorsForCarrier(account: AccountRecord): Vendor[] {
    const seed = hash(account.id);
    const shops = localShopsFor(account, seed);
    const fuelCard = FUEL_CARD_VENDORS[seed % FUEL_CARD_VENDORS.length]!;
    const eld      = ELD_VENDORS[(seed + 3) % ELD_VENDORS.length]!;
    const dashcam  = DASHCAM_VENDORS[(seed + 7) % DASHCAM_VENDORS.length]!;

    const localCountry = account.country === "CA" ? "Canada" : "United States";
    const shortId = account.id.replace("acct-", "");

    return [
        // 1 — Local repair shop
        {
            id: `v-${shortId}-repair`,
            name: shops.repairShop,
            companyName: shops.repairCompany,
            categoryId: "cat-repair-maintenance",
            accountId: account.id,
            address: {
                country: localCountry,
                street: fakeStreet(seed),
                city: account.city,
                state: account.state,
                zip: fakeZip(account.state, seed),
            },
            email: `service@${shortId}-diesel.${account.country === "CA" ? "ca" : "com"}`,
            phone: `(${500 + (seed % 400)}) 555-${String(1000 + (seed % 9000)).padStart(4, "0")}`,
            contactName: ["Marcus Webb","Erika Liu","Diego Vega","Sasha Patel","Eli Cooper","Maya Brooks"][seed % 6]!,
            contactInfo: `service@${shortId}-diesel.${account.country === "CA" ? "ca" : "com"}`,
            status: "Active",
        },

        // 2 — Local tire centre
        {
            id: `v-${shortId}-tire`,
            name: shops.tireCenter,
            companyName: shops.tireCompany,
            categoryId: "cat-repair-maintenance",
            accountId: account.id,
            address: {
                country: localCountry,
                street: fakeStreet(seed + 11),
                city: account.city,
                state: account.state,
                zip: fakeZip(account.state, seed + 11),
            },
            email: `fleet@${shortId}-tire.${account.country === "CA" ? "ca" : "com"}`,
            phone: `(${500 + ((seed + 7) % 400)}) 555-${String(1000 + ((seed + 11) % 9000)).padStart(4, "0")}`,
            contactName: ["Janet Park","Carlos Ruiz","Hannah Schmidt","Owen Tanaka","Priya Singh","Liam Foster"][(seed + 11) % 6]!,
            contactInfo: `fleet@${shortId}-tire.${account.country === "CA" ? "ca" : "com"}`,
            status: "Active",
        },

        // 3 — Fuel card (national chain)
        {
            id: `v-${shortId}-fuelcard`,
            name: fuelCard.name,
            companyName: fuelCard.company,
            categoryId: "cat-fuel-card",
            accountId: account.id,
            address: {
                country: fuelCard.country,
                street: fuelCard.street,
                city: fuelCard.city,
                state: fuelCard.state,
                zip: fuelCard.zip,
            },
            email: fuelCard.email,
            phone: fuelCard.phone,
            contactName: fuelCard.contact,
            contactInfo: fuelCard.info,
            status: "Active",
        },

        // 4 — ELD provider
        {
            id: `v-${shortId}-eld`,
            name: eld.name,
            companyName: eld.company,
            categoryId: "cat-eld-provider",
            accountId: account.id,
            address: {
                country: eld.country,
                street: eld.street,
                city: eld.city,
                state: eld.state,
                zip: eld.zip,
            },
            email: eld.email,
            phone: eld.phone,
            contactName: eld.contact,
            contactInfo: eld.info,
            status: "Active",
        },

        // 5 — Dashcam / GPS
        {
            id: `v-${shortId}-dashcam`,
            name: dashcam.name,
            companyName: dashcam.company,
            categoryId: dashcam.category,
            accountId: account.id,
            address: {
                country: dashcam.country,
                street: dashcam.street,
                city: dashcam.city,
                state: dashcam.state,
                zip: dashcam.zip,
            },
            email: dashcam.email,
            phone: dashcam.phone,
            contactName: dashcam.contact,
            contactInfo: dashcam.info,
            status: "Active",
        },
    ];
}

// ── Build for every carrier that doesn't already have static entries ────────

const CARRIERS_WITH_STATIC_VENDORS = new Set(["acct-001", "acct-002", "acct-003"]);

export const GENERATED_VENDORS: Vendor[] = [];

for (const account of ACCOUNTS_DB) {
    if (CARRIERS_WITH_STATIC_VENDORS.has(account.id)) continue;
    GENERATED_VENDORS.push(...buildVendorsForCarrier(account));
}

/** Per-carrier vendor lookup. Returns the generated vendors keyed by accountId.
 *  Carriers with static entries return [] from this helper — call sites should
 *  consult `VENDORS` from `inventory.data.ts` for the full union. */
export const GENERATED_VENDORS_BY_CARRIER: Record<string, Vendor[]> = (() => {
    const map: Record<string, Vendor[]> = {};
    for (const v of GENERATED_VENDORS) {
        (map[v.accountId] ??= []).push(v);
    }
    return map;
})();
