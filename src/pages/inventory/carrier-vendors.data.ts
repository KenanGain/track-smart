// Per-carrier Vendor Database
//
// Carrier-scoped vendor registry. Each carrier in ACCOUNTS_DB can have its own
// list of vendors (mechanics, tire shops, body shops, fuel suppliers, etc.).
// The schema is the existing `Vendor` interface from src/data/vendors.data.ts —
// nothing new for the UI to learn.
//
// Seeded one-or-two carriers at a time; carriers without an entry fall back
// to the global `INITIAL_VENDORS` list. Helpers below let pages opt into
// carrier-scoped lookups without changing the rest of the app.

import { INITIAL_VENDORS, type Vendor } from "@/data/vendors.data";

// ── Carrier-scoped seed data ─────────────────────────────────────────────────

export const CARRIER_VENDORS: Record<string, Vendor[]> = {
    // ── acct-002 — Cascade Freight Systems LLC (Portland, OR · US) ───────────
    "acct-002": [
        {
            id: "v-cf-001",
            companyName: "Cascadia Diesel Repair",
            address: { country: "USA", unit: "", street: "1820 NE Cornfoot Rd", city: "Portland", stateProvince: "Oregon", postalCode: "97218" },
            email: "service@cascadiadiesel.com",
            phone: "(503) 555-2210",
            contactName: "Erik Thorson",
        },
        {
            id: "v-cf-002",
            companyName: "Pacific Tire Service Pro",
            address: { country: "USA", unit: "Bay 4", street: "5500 NE Columbia Blvd", city: "Portland", stateProvince: "Oregon", postalCode: "97218" },
            email: "dispatch@pactirepro.com",
            phone: "(503) 555-2245",
            contactName: "Marisol Avila",
        },
        {
            id: "v-cf-003",
            companyName: "Northwest Body & Paint LLC",
            address: { country: "USA", unit: "", street: "10500 SW Allen Blvd", city: "Beaverton", stateProvince: "Oregon", postalCode: "97005" },
            email: "estimates@nwbodypaint.com",
            phone: "(503) 555-2280",
            contactName: "Caleb Whitman",
        },
        {
            id: "v-cf-004",
            companyName: "Olympia Truck Wash",
            address: { country: "USA", unit: "", street: "3801 Pacific Ave SE", city: "Olympia", stateProvince: "Washington", postalCode: "98501" },
            email: "ops@olytruckwash.com",
            phone: "(360) 555-1101",
            contactName: "Bree Sandoval",
        },
        {
            id: "v-cf-005",
            companyName: "Rose City Auto Glass",
            address: { country: "USA", unit: "Suite 110", street: "4400 SE Foster Rd", city: "Portland", stateProvince: "Oregon", postalCode: "97206" },
            email: "schedule@rosecityglass.com",
            phone: "(503) 555-2310",
            contactName: "Daniel Kovacs",
        },
    ],

    // ── acct-003 — Northern Lights Transport Ltd. (Mississauga, ON · CA) ─────
    "acct-003": [
        {
            id: "v-nl-001",
            companyName: "Mississauga Truck Centre",
            address: { country: "Canada", unit: "", street: "6555 Northam Dr", city: "Mississauga", stateProvince: "Ontario", postalCode: "L4V 1J2" },
            email: "service@mississaugatruckcentre.ca",
            phone: "(905) 555-3120",
            contactName: "Sukhdev Brar",
        },
        {
            id: "v-nl-002",
            companyName: "GTA Tire & Rim Inc.",
            address: { country: "Canada", unit: "Unit 7", street: "275 Royal Crest Crt", city: "Markham", stateProvince: "Ontario", postalCode: "L3R 9X6" },
            email: "fleet@gtatirerim.ca",
            phone: "(905) 555-3144",
            contactName: "Hassan Mansoor",
        },
        {
            id: "v-nl-003",
            companyName: "Quebec Carrosserie Inc.",
            address: { country: "Canada", unit: "", street: "9450 Boul. Saint-Laurent", city: "Montreal", stateProvince: "Quebec", postalCode: "H2N 1R2" },
            email: "estimes@qccarrosserie.ca",
            phone: "(514) 555-3170",
            contactName: "Émilie Tremblay",
        },
        {
            id: "v-nl-004",
            companyName: "St-Hubert Diesel Service",
            address: { country: "Canada", unit: "", street: "5070 Boul. Cousineau", city: "Saint-Hubert", stateProvince: "Quebec", postalCode: "J3Y 7L1" },
            email: "service@sthubertdiesel.ca",
            phone: "(450) 555-3185",
            contactName: "Marc Bergeron",
        },
        {
            id: "v-nl-005",
            companyName: "Brampton Mobile Lube",
            address: { country: "Canada", unit: "", street: "70 Rutherford Rd S", city: "Brampton", stateProvince: "Ontario", postalCode: "L6W 3J3" },
            email: "dispatch@bramptonlube.ca",
            phone: "(905) 555-3192",
            contactName: "Anil Patel",
        },
    ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the vendor list scoped to a specific carrier. Falls back to the
 *  global `INITIAL_VENDORS` list when the carrier has no dedicated entries. */
export function getVendorsForCarrier(accountId: string): Vendor[] {
    return CARRIER_VENDORS[accountId] ?? INITIAL_VENDORS;
}

/** Flat union of every per-carrier vendor — useful for the global Vendors
 *  list page so it shows everything at once. Order: existing global entries
 *  first, then carrier-scoped entries in account-id order. */
export const ALL_VENDORS: Vendor[] = (() => {
    const seen = new Set(INITIAL_VENDORS.map((v) => v.id));
    const extra: Vendor[] = [];
    for (const accountId of Object.keys(CARRIER_VENDORS).sort()) {
        for (const v of CARRIER_VENDORS[accountId]) {
            if (!seen.has(v.id)) {
                extra.push(v);
                seen.add(v.id);
            }
        }
    }
    return [...INITIAL_VENDORS, ...extra];
})();
