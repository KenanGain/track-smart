import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import type { Asset } from "@/pages/assets/assets.data";
import type { Driver } from "@/data/mock-app-data";

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
};

export type InventoryItem = {
    id: string;
    vendorId: string;
    serial: string;
    pin: string;
    issueDate: string; // YYYY-MM-DD
    expiryDate: string;
    recurrence: Recurrence;
    reminder: Reminder;
    status: InventoryStatus;
    contactName?: string;
    contactInfo?: string;
    /** One-to-one assignment to a CMV / Non-CMV asset or a driver. */
    assignedTo?: Assignment;
    notes?: string;
};

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
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addYears(date: string, years: number): string {
    const [y, m, d] = date.split("-").map(Number);
    return dateString((y || 2026) + years, m || 1, d || 1);
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
    if (truck) return { kind: "cmv", targetId: truck.id };

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
    const issueYear = 2023 + (seed % 3);
    const issueMonth = 1 + ((seed >> 4) % 12);
    const issueDay = 1 + ((seed >> 9) % 27);
    const issueDate = dateString(issueYear, issueMonth, issueDay);
    const yearsOut = vendor.categoryId === "cat-repair-maintenance" ? 1 : 2 + (seed % 2);
    const status: InventoryStatus =
        index % 11 === 0 ? "Expired" :
        index % 5 === 0 ? "Expiring Soon" :
        "Active";

    return {
        id: `inv-${vendor.accountId.replace("acct-", "")}-${String(index + 1).padStart(3, "0")}`,
        vendorId: vendor.id,
        serial: `${prefix}-${String(seed % 999999).padStart(6, "0")}`,
        pin: String(1000 + (seed % 9000)),
        issueDate,
        expiryDate: addYears(issueDate, yearsOut),
        recurrence: CATEGORY_RECURRENCE[vendor.categoryId] ?? "Yearly",
        reminder: status === "Expired" ? "None" : status === "Expiring Soon" ? "1 week" : "1 month",
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
type AccessorySeed = { catId: string; name: string };
const COMPANY_ACCESSORIES: AccessorySeed[] = [
    // Keys & Access
    { catId: "cat-keys", name: "Truck Keys" },
    { catId: "cat-keys", name: "Trailer / Padlock Keys" },
    { catId: "cat-keys", name: "Fuel Cap Key" },
    { catId: "cat-keys", name: "Key Fob / Remote" },
    { catId: "cat-keys", name: "Yard / Gate Access Card" },
    // Safety & PPE
    { catId: "cat-safety-ppe", name: "Hi-Vis Safety Vest" },
    { catId: "cat-safety-ppe", name: "Safety Gloves" },
    { catId: "cat-safety-ppe", name: "Safety Boots" },
    { catId: "cat-safety-ppe", name: "First-Aid Kit" },
    // Equipment & Supplies
    { catId: "cat-equipment", name: "Company Uniform" },
    { catId: "cat-equipment", name: "Load Bars" },
    { catId: "cat-equipment", name: "Load Straps / Chains" },
    { catId: "cat-equipment", name: "Winter Emergency Kit" },
    // Devices & Electronics
    { catId: "cat-devices", name: "Reefer Temperature Sensor" },
    { catId: "cat-devices", name: "Tire Pressure Sensor (TPMS)" },
    { catId: "cat-devices", name: "Company Phone" },
    // Cards & Documents
    { catId: "cat-cards-docs", name: "Insurance Card" },
    { catId: "cat-cards-docs", name: "Vehicle Registration & Permits" },
    { catId: "cat-cards-docs", name: "IFTA / IRP Documents" },
];

for (const accountId of Object.keys(CARRIER_ASSETS)) {
    const assets = CARRIER_ASSETS[accountId] ?? [];
    const trucks = assets.filter((a) => a.assetCategory === "CMV" && a.assetType === "Truck");
    if (trucks.length === 0) continue;
    const list = CARRIER_INVENTORY_ITEMS[accountId] ??= [];
    COMPANY_ACCESSORIES.forEach((def, i) => {
        const vendorId = `v-acc-${accountId}-${i}`;
        VENDORS.push({ id: vendorId, name: def.name, companyName: "Company Issued", categoryId: def.catId, accountId, status: "Active" });
        const seed = inventoryHash(`${accountId}:acc:${def.name}`);
        const issueDate = dateString(2024 + (seed % 2), 1 + ((seed >> 4) % 12), 1 + ((seed >> 9) % 27));
        const rec = CATEGORY_RECURRENCE[def.catId] ?? "None";
        const hasExpiry = rec !== "None";
        const truck = trucks[i % trucks.length];
        const prefix = SERIAL_PREFIX_BY_CATEGORY[def.catId] ?? "ACC";
        list.push({
            id: `inv-acc-${accountId.replace("acct-", "")}-${String(i + 1).padStart(3, "0")}`,
            vendorId,
            serial: `${prefix}-${String(seed % 999999).padStart(6, "0")}`,
            pin: def.catId === "cat-keys" || def.catId === "cat-cards-docs" ? String(1000 + (seed % 9000)) : "",
            issueDate,
            expiryDate: hasExpiry ? addYears(issueDate, 1 + (seed % 2)) : "",
            recurrence: rec,
            reminder: hasExpiry ? "1 month" : "None",
            status: "Active",
            assignedTo: { kind: "cmv", targetId: truck.id },
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
