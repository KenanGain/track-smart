import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import type { Asset } from "@/pages/assets/assets.data";
import type { Driver } from "@/data/mock-app-data";
// Type only: the alert on an inventory item is the same shape a compliance record uses,
// so the two cannot drift. No runtime dependency on the compliance store.
import type { MonitoringConfig } from "@/pages/compliance/compliance-data-store";

// Side-effect-free import of the per-carrier vendor seed. Combined with the
// static VENDORS list at the bottom of this file via a re-export.
import { GENERATED_VENDORS } from "./carrier-vendor-seed.data";

// ── Legacy Acme shortcuts ────────────────────────────────────────────────────
// Older inventory forms still default to Acme. Carrier-scoped inventory below
// uses CARRIER_ASSETS / CARRIER_DRIVERS directly for every carrier.

export const ACME_CARRIER_ID = "acct-001";
export const CARRIER_NAME = "Acme Trucking Inc.";

export const ACME_ASSETS: Asset[] = CARRIER_ASSETS[ACME_CARRIER_ID] ?? [];
export const ACME_DRIVERS: Driver[] = CARRIER_DRIVERS[ACME_CARRIER_ID] ?? [];

// Convenience subsets — multi-asset vendor types target trucks (CMV power units)
export const ACME_TRUCKS: Asset[] = ACME_ASSETS.filter(
    (a) => a.assetCategory === "CMV" && a.assetType === "Truck"
);

export const ACME_ACTIVE_DRIVERS: Driver[] = ACME_DRIVERS.filter((d) => d.status === "Active");

// ── Vendor categories (single concept — types collapsed into categories) ────

export type VendorCategory = {
    id: string;
    name: string;
    description?: string;
};

export type VendorAddress = {
    country?: "United States" | "Canada";
    street?: string;
    apt?: string;
    city?: string;
    state?: string;
    zip?: string;
};

export type Vendor = {
    id: string;
    name: string;
    companyName?: string;
    /** The category this vendor belongs to. */
    categoryId: string;
    /** Carrier (account) that owns this vendor record. Vendors are scoped per
     *  carrier so each carrier sees only their own vendor list. */
    accountId: string;
    address?: VendorAddress;
    email?: string;
    phone?: string;
    contactName?: string;
    contactInfo?: string;
    status: "Active" | "Inactive";
};

export function getCategoryById(categoryId: string, categories: VendorCategory[]): VendorCategory | undefined {
    return categories.find((c) => c.id === categoryId);
}

export function getCategoryLabel(categoryId: string, categories: VendorCategory[]): string {
    return categories.find((c) => c.id === categoryId)?.name ?? categoryId;
}

export const ADDRESS_COUNTRIES = ["United States", "Canada"] as const;

export const US_STATES = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA",
    "ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK",
    "OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
] as const;

export const CA_PROVINCES = [
    "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
] as const;

export function formatVendorAddress(addr?: VendorAddress): string {
    if (!addr) return "";
    const line1 = [addr.street, addr.apt].filter(Boolean).join(", ");
    const cityState = [addr.city, addr.state].filter(Boolean).join(", ");
    const tail = [cityState, addr.zip].filter(Boolean).join(" ");
    return [line1, tail].filter(Boolean).join(", ");
}

// ── Inventory item types ─────────────────────────────────────────────────────

export type Recurrence = "None" | "Monthly" | "Quarterly" | "Yearly";
export type Reminder = "None" | "1 day" | "1 week" | "1 month";
export type InventoryStatus = "Active" | "Expired" | "Expiring Soon";

export type AssignmentKind = "cmv" | "non-cmv" | "driver";

export type Assignment = {
    kind: AssignmentKind;
    /** id of the CMV asset, Non-CMV asset, or driver. */
    targetId: string;
    /**
     * The item goes with the VEHICLE, and is in the hands of whoever drives it.
     *
     * A fuel card issued to a truck is carried by that truck's driver; a spare key lives in the
     * yard. Both are assigned to the vehicle, and only one of them is a person's
     * responsibility — which is the difference this records. The driver is never stored: it is
     * read off the vehicle, so a change of driver cannot leave the item pointing at the one
     * who handed it back.
     */
    alsoDriverOfAsset?: boolean;
};

export type InventoryItem = {
    id: string;
    vendorId: string;
    /**
     * What this item is CALLED. Defaults to the vendor and the category it falls under
     * ("Comdata — Fuel Card"), which is what tells one row from another where a carrier holds
     * four cards from the same vendor. Editable; empty means the default (see `itemName`).
     */
    name?: string;
    serial: string;
    pin: string;
    issueDate: string; // YYYY-MM-DD
    expiryDate: string;
    /** @deprecated The old two-field schedule, kept so seeded items still read. New items carry
     *  a full `monitoring` config instead — see `inventoryMonitoring`. */
    recurrence: Recurrence;
    /** @deprecated See `recurrence`. */
    reminder: Reminder;
    /**
     * The alert on this item — the same block, bases and reminder days the compliance records
     * use, because a fuel card expiring is the same kind of event as a permit expiring and the
     * office should not have to learn two of them.
     */
    monitoring?: MonitoringConfig;
    status: InventoryStatus;
    contactName?: string;
    contactInfo?: string;
    /** One-to-one assignment to a CMV / Non-CMV asset or a driver. */
    assignedTo?: Assignment;
    notes?: string;
};

// ── What an item is called ───────────────────────────────────────

/** The name a new item starts with: the vendor, and what kind of thing it issues. */
export function defaultItemName(vendor: Vendor | undefined, categories: VendorCategory[] = VENDOR_CATEGORIES): string {
    if (!vendor) return "";
    const category = getCategoryLabel(vendor.categoryId, categories);
    return category && category !== vendor.name ? `${vendor.name} — ${category}` : vendor.name;
}

/** What to show for an item: the name it was given, else the default for its vendor. */
export function itemName(item: InventoryItem, vendors: Vendor[] = VENDORS, categories: VendorCategory[] = VENDOR_CATEGORIES): string {
    const typed = (item.name ?? "").trim();
    return typed || defaultItemName(vendors.find((v) => v.id === item.vendorId), categories);
}

/**
 * True while the name is still the one the vendor chose — so picking a different vendor
 * renames the item, and a name the user typed themselves is never overwritten.
 */
export function isAutoItemName(name: string | undefined, vendor: Vendor | undefined): boolean {
    const typed = (name ?? "").trim();
    return !typed || typed === defaultItemName(vendor);
}

// ── The alert on an item ────────────────────────────────────────

/**
 * The record the monitoring block reads its labels from. An inventory item is not a compliance
 * record, but it has the same two dates and the same alert, so it borrows the block rather than
 * growing a second one that drifts from it.
 */
export const INVENTORY_MONITOR_RECORD = {
    id: "inventory-item",
    monitorType: "Expiry date",
    tracksIssueDate: true,
    issueLabel: "Issue date",
} as const;

/** How many days before the date the old one-word reminder meant. */
const LEGACY_REMINDER_DAYS: Record<Reminder, number[]> = {
    None: [],
    "1 day": [1],
    "1 week": [7],
    "1 month": [30],
};

/** The recurrence ids the monitoring block offers, from the old word. */
const LEGACY_RECURRENCE: Record<Recurrence, string> = {
    None: "none", Monthly: "monthly", Quarterly: "quarterly", Yearly: "annually",
};

export function defaultInventoryMonitoring(): MonitoringConfig {
    return { enabled: false, basis: "expiry", customDate: "", recurrence: "annually", reminders: [30], channels: { email: true, inApp: true } };
}

/**
 * The alert on an item, in whichever shape it was saved.
 *
 * Items captured before this block existed carry the old recurrence + reminder pair, and they
 * are READ rather than rewritten, so a seeded card still shows the schedule it was given. An
 * item with no expiry has nothing to count down to, so it reads as off rather than as an alert
 * armed against a blank date.
 */
export function inventoryMonitoring(item: InventoryItem): MonitoringConfig {
    if (item.monitoring) return item.monitoring;
    const reminders = LEGACY_REMINDER_DAYS[item.reminder] ?? [];
    return {
        ...defaultInventoryMonitoring(),
        enabled: !!item.expiryDate && reminders.length > 0,
        recurrence: LEGACY_RECURRENCE[item.recurrence] ?? "annually",
        reminders,
    };
}

// ── Who is actually holding it ────────────────────────────────────

/** One driver, as much of them as a label needs. */
export type AssignedDriver = { id: string; name: string };

/**
 * The driver of a vehicle, right now — the assignment that has not ended, else the most recent
 * one. Read live rather than stored on the item: a truck changes hands, and an item that
 * remembered the old driver would be filed against somebody who handed it back.
 */
export function driverOfAsset(assetId: string, accountId?: string): AssignedDriver | null {
    const assets = (accountId && CARRIER_ASSETS[accountId]) || ACME_ASSETS;
    const asset = assets.find((a) => a.id === assetId) ?? ACME_ASSETS.find((a) => a.id === assetId);
    const list = asset?.driverAssignments ?? [];
    if (!list.length) return null;
    const current = list.find((a) => !a.endDate)
        ?? [...list].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""))[0];
    if (!current?.driverId) return null;
    const drivers = (accountId && CARRIER_DRIVERS[accountId]) || ACME_DRIVERS;
    const driver = drivers.find((d) => d.id === current.driverId) ?? ACME_DRIVERS.find((d) => d.id === current.driverId);
    if (!driver) return null;
    const name = driver.name || [driver.firstName, driver.lastName].filter(Boolean).join(" ");
    return { id: driver.id, name: name || "—" };
}

export const ACME_NON_CMV_ASSETS = ACME_ASSETS.filter((a) => a.assetCategory === "Non-CMV");

// ── Vendors ──────────────────────────────────────────────────────────────────

export const VENDOR_CATEGORIES: VendorCategory[] = [
    { id: "cat-fuel-card",          name: "Fuel Card",              description: "Vendors issuing fuel cards." },
    { id: "cat-transponder",        name: "Transponder",            description: "Toll transponder providers." },
    { id: "cat-eld-provider",       name: "ELD Provider",           description: "Electronic logging device providers." },
    { id: "cat-gps-tracking",       name: "GPS Tracking",           description: "GPS / telematics providers." },
    { id: "cat-dashcam",            name: "Dashcam",                description: "In-cab camera providers." },
    { id: "cat-repair-maintenance", name: "Repair and Maintenance", description: "Repair shops and service vendors." },
    // Company-issued physical accessories (keys, PPE, equipment, devices, docs).
    { id: "cat-keys",               name: "Keys & Access",          description: "Keys, fobs and yard / gate access cards issued for the truck." },
    { id: "cat-safety-ppe",         name: "Safety & PPE",           description: "Personal protective equipment issued to the driver." },
    { id: "cat-equipment",          name: "Equipment & Supplies",   description: "Load securement, uniforms and seasonal gear." },
    { id: "cat-devices",            name: "Devices & Electronics",  description: "In-cab devices, sensors and company phone." },
    { id: "cat-cards-docs",         name: "Cards & Documents",      description: "Insurance, registration and permit documents." },
    { id: "cat-other",              name: "Others",                 description: "Any other vendor that doesn't fit the categories above." },
];

// Vendors are scoped per carrier (accountId). Super-admins see only the
// vendors of the carrier they've selected from the CarrierSwitcher. The
// CreateOrderModal filters by accountId; new vendors added inline inherit
// the active carrier's id automatically.
//
// Hand-curated entries for acct-001/002/003 sit below; vendors for the other
// 27 carriers are generated by `carrier-vendor-seed.data.ts` and concatenated
// into the exported `VENDORS` array at the very bottom of this section.
const STATIC_VENDORS: Vendor[] = [
    // ── Acme Trucking Inc. (acct-001) ───────────────────────────────────────
    {
        id: "v-001",
        name: "Comdata",
        companyName: "Comdata Inc.",
        categoryId: "cat-fuel-card",
        accountId: "acct-001",
        address: { country: "United States", street: "5301 Maryland Way", city: "Brentwood", state: "TN", zip: "37027" },
        email: "support@comdata.com",
        phone: "(800) 749-7166",
        contactName: "Lisa Howard",
        contactInfo: "lisa.h@comdata.com",
        status: "Active",
    },
    {
        id: "v-002",
        name: "EZPass",
        companyName: "E-ZPass Group",
        categoryId: "cat-transponder",
        accountId: "acct-001",
        address: { country: "United States", street: "375 N Front St", city: "Wilmington", state: "DE", zip: "19801" },
        email: "fleet@ezpass.com",
        phone: "(888) 288-6865",
        contactName: "Mark Reed",
        contactInfo: "(302) 555-0118",
        status: "Active",
    },
    {
        id: "v-003",
        name: "Samsara",
        companyName: "Samsara Inc.",
        categoryId: "cat-eld-provider",
        accountId: "acct-001",
        address: { country: "United States", street: "1 De Haro St", city: "San Francisco", state: "CA", zip: "94103" },
        email: "fleet-support@samsara.com",
        phone: "(415) 985-2400",
        contactName: "Priya Patel",
        contactInfo: "priya@samsara.com",
        status: "Active",
    },
    {
        id: "v-acme-shop-01",
        name: "Wilmington Truck Service",
        companyName: "Wilmington Truck Service Inc.",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-001",
        address: { country: "United States", street: "1200 Maryland Ave", city: "Wilmington", state: "DE", zip: "19805" },
        email: "service@wilmtruck.com",
        phone: "(302) 555-0184",
        contactName: "Greg Bailey",
        contactInfo: "greg@wilmtruck.com",
        status: "Active",
    },
    {
        id: "v-test-01",
        name: "Kenan Test Shop",
        companyName: "Kenan Test Shop LLC",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-001",
        address: { country: "United States", street: "1 Test Way", city: "Houston", state: "TX", zip: "77001" },
        email: "kenangain2910@gmail.com",
        phone: "(555) 100-0001",
        contactName: "Kenan",
        contactInfo: "kenangain2910@gmail.com",
        status: "Active",
    },

    // ── Cascade Freight Systems LLC (acct-002) ──────────────────────────────
    {
        id: "v-004",
        name: "Geotab",
        companyName: "Geotab Inc.",
        categoryId: "cat-gps-tracking",
        accountId: "acct-002",
        address: { country: "Canada", street: "2440 Winston Park Dr", city: "Oakville", state: "ON", zip: "L6H 7V2" },
        email: "support@geotab.com",
        phone: "(877) 436-8221",
        contactName: "Tom Becker",
        contactInfo: "tom@geotab.com",
        status: "Active",
    },
    {
        id: "v-005",
        name: "Lytx",
        companyName: "Lytx Inc.",
        categoryId: "cat-dashcam",
        accountId: "acct-002",
        address: { country: "United States", street: "9785 Towne Centre Dr", city: "San Diego", state: "CA", zip: "92121" },
        email: "service@lytx.com",
        phone: "(866) 419-5861",
        contactName: "Angela Cruz",
        contactInfo: "angela.cruz@lytx.com",
        status: "Active",
    },
    {
        id: "v-cascade-shop-01",
        name: "Pacific Diesel Repair",
        companyName: "Pacific Diesel Repair Co.",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-002",
        address: { country: "United States", street: "8902 Cascade Way", city: "Seattle", state: "WA", zip: "98101" },
        email: "ops@pacificdiesel.com",
        phone: "(206) 555-0190",
        contactName: "Marcus Liu",
        contactInfo: "marcus@pacificdiesel.com",
        status: "Active",
    },
    {
        id: "v-cascade-tire-01",
        name: "Cascade Tire Center",
        companyName: "Cascade Tire & Wheel",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-002",
        address: { country: "United States", street: "215 Industrial Pkwy", city: "Tacoma", state: "WA", zip: "98401" },
        email: "fleet@cascadetire.com",
        phone: "(253) 555-0177",
        contactName: "Janet Park",
        contactInfo: "janet@cascadetire.com",
        status: "Active",
    },
    {
        id: "v-test-02",
        name: "Kadvani Diesel",
        companyName: "Kadvani Diesel Repair",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-002",
        address: { country: "United States", street: "2 Sample St", city: "Dallas", state: "TX", zip: "75201" },
        email: "kenangain2910@gmail.com",
        phone: "(555) 100-0002",
        contactName: "V. Kadvani",
        contactInfo: "kenangain2910@gmail.com",
        status: "Active",
    },

    // ── acct-003 (next carrier in ACCOUNTS_DB) ──────────────────────────────
    {
        id: "v-006",
        name: "Midwest Diesel Repair",
        companyName: "Midwest Diesel Repair LLC",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-003",
        address: { country: "United States", street: "421 Industrial Dr", city: "Indianapolis", state: "IN", zip: "46202" },
        email: "service@midwestdiesel.com",
        phone: "(317) 555-0142",
        contactName: "Dave O'Connor",
        contactInfo: "(317) 555-0144",
        status: "Active",
    },
    {
        id: "v-acct3-fuel-01",
        name: "Heartland Fuel",
        companyName: "Heartland Fuel Network",
        categoryId: "cat-fuel-card",
        accountId: "acct-003",
        address: { country: "United States", street: "990 Heartland Ave", city: "Indianapolis", state: "IN", zip: "46225" },
        email: "support@heartlandfuel.com",
        phone: "(317) 555-0150",
        contactName: "Renee Foster",
        contactInfo: "renee@heartlandfuel.com",
        status: "Active",
    },
    {
        id: "v-acct3-shop-02",
        name: "Hoosier Truck Works",
        companyName: "Hoosier Truck Works LLC",
        categoryId: "cat-repair-maintenance",
        accountId: "acct-003",
        address: { country: "United States", street: "55 Capitol Way", city: "Indianapolis", state: "IN", zip: "46204" },
        email: "shop@hoosiertw.com",
        phone: "(317) 555-0166",
        contactName: "Pat Whitman",
        contactInfo: "pat@hoosiertw.com",
        status: "Active",
    },
];

/** Canonical vendor list — static hand-curated entries for acct-001/002/003
 *  + auto-generated entries for acct-004 → acct-030 (5 vendors per carrier). */
export const VENDORS: Vendor[] = [...STATIC_VENDORS, ...GENERATED_VENDORS];

// ── Inventory item seed (assigned to real carrier assets/drivers) ───────────
// Asset and driver IDs are generated at module load by the carrier datasets,
// so every item below is assigned by accountId instead of hardcoded IDs.

const SERIAL_PREFIX_BY_CATEGORY: Record<string, string> = {
    "cat-fuel-card": "FC",
    "cat-transponder": "TP",
    "cat-eld-provider": "ELD",
    "cat-gps-tracking": "GPS",
    "cat-dashcam": "CAM",
    "cat-repair-maintenance": "RMO",
    "cat-keys": "KEY",
    "cat-safety-ppe": "PPE",
    "cat-equipment": "EQP",
    "cat-devices": "DEV",
    "cat-cards-docs": "DOC",
};

const CATEGORY_RECURRENCE: Record<string, Recurrence> = {
    "cat-repair-maintenance": "Quarterly",
    "cat-fuel-card": "Yearly",
    "cat-transponder": "Yearly",
    "cat-eld-provider": "Monthly",
    "cat-gps-tracking": "Monthly",
    "cat-dashcam": "Yearly",
    // Physical keys / PPE / equipment have no renewal; cards & devices renew yearly.
    "cat-keys": "None",
    "cat-safety-ppe": "None",
    "cat-equipment": "None",
    "cat-devices": "Yearly",
    "cat-cards-docs": "Yearly",
};

function inventoryHash(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h = (h ^ s.charCodeAt(i)) >>> 0;
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}

function dateString(year: number, month: number, day: number): string {
    // Clamped, so a bad calculation upstream produces a real date rather than a string
    // like "2023--5--20" that every reader downstream has to cope with.
    const m = Math.min(12, Math.max(1, Math.round(month) || 1));
    const d = Math.min(28, Math.max(1, Math.round(day) || 1));
    return `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addYears(date: string, years: number): string {
    const [y, m, d] = date.split("-").map(Number);
    return dateString((y || 2026) + years, m || 1, d || 1);
}

/** Midnight today, fixed once per session so a list cannot re-bucket itself as you use it. */
const TODAY = (() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; })();

/** A calendar date `days` from today (negative for the past), as YYYY-MM-DD. */
function daysFromToday(days: number): string {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + days);
    return dateString(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * How far from today a seeded expiry falls.
 *
 * The dates used to be pinned to 2023-2025, so the demo aged: run it in 2026 and every
 * renewable item read as expired, with nothing in the "expiring soon" or "upcoming"
 * windows the alerts and the Monitoring tab exist to show. Anchoring to today keeps one
 * of each in view whenever the prototype is opened.
 */
function expiryOffsetDays(seed: number): number {
    const bucket = seed % 10;
    if (bucket < 2) return -(10 + (seed >>> 3) % 380);   // already overdue
    if (bucket < 4) return 3 + (seed >>> 5) % 27;        // due within a month
    if (bucket < 6) return 35 + (seed >>> 7) % 55;       // due within a quarter
    return 120 + (seed >>> 9) % 580;                     // comfortably ahead
}

/** The pill on the row, read off the date it is about rather than off the row number. */
function statusForExpiry(expiryDate: string): InventoryStatus {
    if (!expiryDate) return "Active";
    const days = Math.round((new Date(expiryDate + "T00:00:00").getTime() - TODAY.getTime()) / 86_400_000);
    return days < 0 ? "Expired" : days <= 30 ? "Expiring Soon" : "Active";
}

function assignmentForVendor(vendor: Vendor, offset: number): Assignment | undefined {
    const assets = CARRIER_ASSETS[vendor.accountId] ?? [];
    const drivers = CARRIER_DRIVERS[vendor.accountId] ?? [];
    const trucks = assets.filter((a) => a.assetCategory === "CMV" && a.assetType === "Truck");
    const nonCmv = assets.filter((a) => a.assetCategory === "Non-CMV");
    const activeDrivers = drivers.filter((d) => d.status === "Active");

    if (vendor.categoryId === "cat-dashcam") {
        const driver = activeDrivers[offset % Math.max(activeDrivers.length, 1)];
        return driver ? { kind: "driver", targetId: driver.id } : undefined;
    }

    if (vendor.categoryId === "cat-gps-tracking") {
        const nonCmvAsset = nonCmv[offset % Math.max(nonCmv.length, 1)];
        if (nonCmvAsset) return { kind: "non-cmv", targetId: nonCmvAsset.id };
    }

    const truck = trucks[offset % Math.max(trucks.length, 1)];
    // A fuel card and a toll transponder are assigned to the truck but used by whoever is
    // driving it, so they carry the "also the driver of this vehicle" flag. A GPS unit bolted
    // to a trailer is not in anybody's hands, and does not.
    if (truck) return {
        kind: "cmv",
        targetId: truck.id,
        alsoDriverOfAsset: vendor.categoryId === "cat-fuel-card" || vendor.categoryId === "cat-transponder",
    };

    const anyAsset = assets[offset % Math.max(assets.length, 1)];
    if (anyAsset) {
        return {
            kind: anyAsset.assetCategory === "Non-CMV" ? "non-cmv" : "cmv",
            targetId: anyAsset.id,
        };
    }

    const driver = activeDrivers[offset % Math.max(activeDrivers.length, 1)];
    return driver ? { kind: "driver", targetId: driver.id } : undefined;
}

function buildInventoryItem(vendor: Vendor, index: number): InventoryItem {
    const seed = inventoryHash(`${vendor.accountId}:${vendor.id}:${index}`);
    const prefix = SERIAL_PREFIX_BY_CATEGORY[vendor.categoryId] ?? "INV";
    // The expiry is placed first, relative to today, and the issue date is the term before
    // it — so issue + term = expiry actually holds, which it did not when the two were
    // hashed independently.
    const yearsOut = vendor.categoryId === "cat-repair-maintenance" ? 1 : 2 + (seed % 2);
    const expiryDate = daysFromToday(expiryOffsetDays(seed));
    const issueDate = addYears(expiryDate, -yearsOut);
    const status = statusForExpiry(expiryDate);

    return {
        id: `inv-${vendor.accountId.replace("acct-", "")}-${String(index + 1).padStart(3, "0")}`,
        vendorId: vendor.id,
        serial: `${prefix}-${String(seed % 999999).padStart(6, "0")}`,
        pin: String(1000 + (seed % 9000)),
        issueDate,
        expiryDate,
        recurrence: CATEGORY_RECURRENCE[vendor.categoryId] ?? "Yearly",
        // One renewable item is deliberately left with no reminder: an expiry date that
        // nobody is alerted about is the row the Monitoring tab exists to surface, and a
        // demo where every item is watched never shows it.
        reminder: index % 5 === 2 ? "None" : status === "Expiring Soon" ? "1 week" : "1 month",
        status,
        contactName: vendor.contactName,
        contactInfo: vendor.contactInfo ?? vendor.email ?? vendor.phone,
        assignedTo: assignmentForVendor(vendor, index),
        notes: vendor.categoryId === "cat-repair-maintenance"
            ? "Service vendor inventory record tied to fleet maintenance coverage."
            : undefined,
    };
}

export const CARRIER_INVENTORY_ITEMS: Record<string, InventoryItem[]> = {};

for (const vendor of VENDORS) {
    const list = CARRIER_INVENTORY_ITEMS[vendor.accountId] ??= [];
    list.push(buildInventoryItem(vendor, list.length));
}

// ── Company-issued accessories (keys, PPE, equipment, devices, documents) ─────
// Physical items handed to the driver / assigned to a truck. Unlike vendor
// inventory these have no external supplier, so a synthetic "Company Issued"
// vendor carries the item name for the list's Vendor column. Each carrier gets
// its own copies assigned to that carrier's trucks (CMV) or active drivers.
// Every accessory is assigned to the VEHICLE (CMV) it belongs to. The driver
// hand-over that issues these to a person is handled separately (onboarding) and
// wired in at a later stage.
/**
 * `toDriver`   — issued to a PERSON. PPE and a uniform are sized to a driver, not to a truck,
 *                and go back when they leave rather than staying with the vehicle.
 * `withDriver` — the item rides in the cab and is in the hands of whoever is driving. The
 *                driver is read off the vehicle, never stored on the item.
 * `yardStock`  — spare kit that belongs to the yard, not to any vehicle or person.
 *
 * Without these every accessory sat on a truck and nothing else: the Driver column had
 * nothing to say, and the "assigned to driver" and "unassigned" filters matched no rows.
 */
type AccessorySeed = { catId: string; name: string; toDriver?: boolean; withDriver?: boolean; yardStock?: boolean };
const COMPANY_ACCESSORIES: AccessorySeed[] = [
    // Keys & Access
    { catId: "cat-keys", name: "Truck Keys", withDriver: true },
    { catId: "cat-keys", name: "Trailer / Padlock Keys", withDriver: true },
    { catId: "cat-keys", name: "Fuel Cap Key", withDriver: true },
    { catId: "cat-keys", name: "Key Fob / Remote", withDriver: true },
    { catId: "cat-keys", name: "Yard / Gate Access Card" },
    // Safety & PPE — sized to a person, so issued to one.
    { catId: "cat-safety-ppe", name: "Hi-Vis Safety Vest", toDriver: true },
    { catId: "cat-safety-ppe", name: "Safety Gloves", toDriver: true },
    { catId: "cat-safety-ppe", name: "Safety Boots", toDriver: true },
    { catId: "cat-safety-ppe", name: "First-Aid Kit" },
    // Equipment & Supplies
    { catId: "cat-equipment", name: "Company Uniform", toDriver: true },
    { catId: "cat-equipment", name: "Load Bars", yardStock: true },
    { catId: "cat-equipment", name: "Load Straps / Chains", yardStock: true },
    { catId: "cat-equipment", name: "Winter Emergency Kit", yardStock: true },
    // Devices & Electronics
    { catId: "cat-devices", name: "Reefer Temperature Sensor" },
    { catId: "cat-devices", name: "Tire Pressure Sensor (TPMS)" },
    { catId: "cat-devices", name: "Company Phone", withDriver: true },
    // Cards & Documents
    { catId: "cat-cards-docs", name: "Insurance Card", withDriver: true },
    { catId: "cat-cards-docs", name: "Vehicle Registration & Permits", withDriver: true },
    { catId: "cat-cards-docs", name: "IFTA / IRP Documents" },

    // ── Yard stock ───────────────────────────────────────────────────────────
    // Spares the office holds and issues as they are needed. These are what the assign and
    // hand-over pickers offer: with only three of them the pools were too thin to tell
    // whether the filters, the category rule and the take-back actually worked.
    { catId: "cat-keys", name: "Spare Truck Keys (set)", yardStock: true },
    { catId: "cat-keys", name: "Spare Yard Gate Fob", yardStock: true },
    { catId: "cat-safety-ppe", name: "Spare Hi-Vis Vests (box)", yardStock: true },
    { catId: "cat-safety-ppe", name: "Spare Safety Gloves (box)", yardStock: true },
    { catId: "cat-safety-ppe", name: "Spare First-Aid Kits", yardStock: true },
    { catId: "cat-equipment", name: "Wheel Chocks", yardStock: true },
    { catId: "cat-equipment", name: "Spare Ratchet Straps", yardStock: true },
    { catId: "cat-equipment", name: "Snow Chains", yardStock: true },
    { catId: "cat-devices", name: "Spare Dashcam", yardStock: true },
    { catId: "cat-devices", name: "Spare Tablet", yardStock: true },
    { catId: "cat-cards-docs", name: "Blank Logbooks", yardStock: true },

    // ── Personal issue ───────────────────────────────────────────────────────
    // Sized to a person, so filed against one. Without a few more of these the Drivers tab
    // showed a single item on most rows and nothing to compare.
    { catId: "cat-safety-ppe", name: "Hard Hat", toDriver: true },
    { catId: "cat-safety-ppe", name: "Safety Glasses", toDriver: true },
    { catId: "cat-safety-ppe", name: "Hearing Protection", toDriver: true },
    { catId: "cat-equipment", name: "Winter Jacket", toDriver: true },
    { catId: "cat-devices", name: "Driver Tablet", toDriver: true },
    { catId: "cat-cards-docs", name: "Fuel Card PIN Sleeve", toDriver: true },
];

for (const accountId of Object.keys(CARRIER_ASSETS)) {
    const assets = CARRIER_ASSETS[accountId] ?? [];
    const trucks = assets.filter((a) => a.assetCategory === "CMV" && a.assetType === "Truck");
    if (trucks.length === 0) continue;
    const activeDrivers = (CARRIER_DRIVERS[accountId] ?? []).filter((d) => d.status === "Active");
    const list = CARRIER_INVENTORY_ITEMS[accountId] ??= [];
    COMPANY_ACCESSORIES.forEach((def, i) => {
        const vendorId = `v-acc-${accountId}-${i}`;
        VENDORS.push({ id: vendorId, name: def.name, companyName: "Company Issued", categoryId: def.catId, accountId, status: "Active" });
        const seed = inventoryHash(`${accountId}:acc:${def.name}`);
        const rec = CATEGORY_RECURRENCE[def.catId] ?? "None";
        const hasExpiry = rec !== "None";
        // Keys and PPE never run out, so they keep a plain issue date in the past. Anything
        // renewable is placed against today the same way vendor inventory is.
        const expiryDate = hasExpiry ? daysFromToday(expiryOffsetDays(seed)) : "";
        const issueDate = hasExpiry
            ? addYears(expiryDate, -(1 + (seed % 2)))
            : daysFromToday(-(30 + (seed >>> 4) % 900));
        const truck = trucks[i % trucks.length];
        const prefix = SERIAL_PREFIX_BY_CATEGORY[def.catId] ?? "ACC";
        list.push({
            id: `inv-acc-${accountId.replace("acct-", "")}-${String(i + 1).padStart(3, "0")}`,
            vendorId,
            serial: `${prefix}-${String(seed % 999999).padStart(6, "0")}`,
            pin: def.catId === "cat-keys" || def.catId === "cat-cards-docs" ? String(1000 + (seed % 9000)) : "",
            issueDate,
            expiryDate,
            recurrence: rec,
            reminder: hasExpiry && i % 8 !== 5 ? "1 month" : "None",
            status: statusForExpiry(expiryDate),
            // Yard stock is on nobody; personal issue is on a driver; everything else is on
            // a truck, and some of that is in the hands of whoever drives it.
            assignedTo: def.yardStock
                ? undefined
                : def.toDriver && activeDrivers.length
                    ? { kind: "driver", targetId: activeDrivers[i % activeDrivers.length].id }
                    : { kind: "cmv", targetId: truck.id, alsoDriverOfAsset: !!def.withDriver },
        });
    });
}

export const INVENTORY_ITEMS: InventoryItem[] = Object.values(CARRIER_INVENTORY_ITEMS).flat();

// ── Public lookup helpers used by Asset / Driver detail views ───────────────

export function getInventoryByAssetId(assetId: string): InventoryItem[] {
    return INVENTORY_ITEMS.filter(
        (it) => it.assignedTo && (it.assignedTo.kind === "cmv" || it.assignedTo.kind === "non-cmv") && it.assignedTo.targetId === assetId
    );
}

export function getInventoryByDriverId(driverId: string): InventoryItem[] {
    return INVENTORY_ITEMS.filter((it) => it.assignedTo?.kind === "driver" && it.assignedTo.targetId === driverId);
}

export function getInventoryForCarrier(accountId: string): InventoryItem[] {
    return CARRIER_INVENTORY_ITEMS[accountId] ?? [];
}

export function getVendorById(vendorId: string): Vendor | undefined {
    return VENDORS.find((v) => v.id === vendorId);
}

export function getInventoryAssetById(assetId: string): Asset | undefined {
    return Object.values(CARRIER_ASSETS).flat().find((a) => a.id === assetId);
}

export function getInventoryDriverById(driverId: string): Driver | undefined {
    return Object.values(CARRIER_DRIVERS).flat().find((d) => d.id === driverId);
}
