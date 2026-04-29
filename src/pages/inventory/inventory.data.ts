import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import type { Asset } from "@/pages/assets/assets.data";
import type { Driver } from "@/data/mock-app-data";

// ── Carrier scope ────────────────────────────────────────────────────────────
// All inventory data on this page belongs to Acme Trucking Inc. We pull its
// real assets and drivers from the carrier datasets so that every other page
// referencing the same IDs (asset detail, driver profile) stays consistent.

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
];

export const VENDORS: Vendor[] = [
    {
        id: "v-001",
        name: "Comdata",
        companyName: "Comdata Inc.",
        categoryId: "cat-fuel-card",
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
        address: { country: "United States", street: "1 De Haro St", city: "San Francisco", state: "CA", zip: "94103" },
        email: "fleet-support@samsara.com",
        phone: "(415) 985-2400",
        contactName: "Priya Patel",
        contactInfo: "priya@samsara.com",
        status: "Active",
    },
    {
        id: "v-004",
        name: "Geotab",
        companyName: "Geotab Inc.",
        categoryId: "cat-gps-tracking",
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
        address: { country: "United States", street: "9785 Towne Centre Dr", city: "San Diego", state: "CA", zip: "92121" },
        email: "service@lytx.com",
        phone: "(866) 419-5861",
        contactName: "Angela Cruz",
        contactInfo: "angela.cruz@lytx.com",
        status: "Active",
    },
    {
        id: "v-006",
        name: "Midwest Diesel Repair",
        companyName: "Midwest Diesel Repair LLC",
        categoryId: "cat-repair-maintenance",
        address: { country: "United States", street: "421 Industrial Dr", city: "Indianapolis", state: "IN", zip: "46202" },
        email: "service@midwestdiesel.com",
        phone: "(317) 555-0142",
        contactName: "Dave O'Connor",
        contactInfo: "(317) 555-0144",
        status: "Active",
    },
];

// ── Inventory item seed (assigned to real Acme assets/drivers) ──────────────
// Asset and driver IDs are generated at module load by the carrier datasets,
// so we sample them here rather than hardcoding.

const cmvAssetIds = ACME_TRUCKS.map((a) => a.id);
const nonCmvAssetIds = ACME_NON_CMV_ASSETS.map((a) => a.id);
const activeDriverIds = ACME_ACTIVE_DRIVERS.map((d) => d.id);

export const INVENTORY_ITEMS: InventoryItem[] = [
    {
        id: "inv-1001",
        vendorId: "v-001",
        serial: "FC-558271",
        pin: "4421",
        issueDate: "2024-03-12",
        expiryDate: "2026-03-12",
        recurrence: "Yearly",
        reminder: "1 month",
        status: "Active",
        contactName: "Lisa Howard",
        contactInfo: "lisa.h@comdata.com",
        assignedTo: cmvAssetIds[0] ? { kind: "cmv", targetId: cmvAssetIds[0] } : undefined,
    },
    {
        id: "inv-1002",
        vendorId: "v-002",
        serial: "EZ-99812",
        pin: "8870",
        issueDate: "2024-08-01",
        expiryDate: "2026-08-01",
        recurrence: "Yearly",
        reminder: "1 week",
        status: "Active",
        contactName: "Mark Reed",
        contactInfo: "(302) 555-0118",
        assignedTo: cmvAssetIds[1] ? { kind: "cmv", targetId: cmvAssetIds[1] } : undefined,
    },
    {
        id: "inv-1003",
        vendorId: "v-003",
        serial: "SM-AG-77123",
        pin: "1290",
        issueDate: "2025-01-20",
        expiryDate: "2026-05-20",
        recurrence: "Yearly",
        reminder: "1 month",
        status: "Expiring Soon",
        contactName: "Priya Patel",
        contactInfo: "priya@samsara.com",
        assignedTo: cmvAssetIds[2] ? { kind: "cmv", targetId: cmvAssetIds[2] } : undefined,
    },
    {
        id: "inv-1004",
        vendorId: "v-004",
        serial: "GT-G09-42218",
        pin: "5523",
        issueDate: "2023-06-15",
        expiryDate: "2026-01-15",
        recurrence: "Yearly",
        reminder: "1 week",
        status: "Expired",
        contactName: "Tom Becker",
        contactInfo: "tom@geotab.com",
        assignedTo: nonCmvAssetIds[0] ? { kind: "non-cmv", targetId: nonCmvAssetIds[0] } : undefined,
    },
    {
        id: "inv-1005",
        vendorId: "v-005",
        serial: "LX-DC4-31882",
        pin: "7741",
        issueDate: "2024-11-10",
        expiryDate: "2027-11-10",
        recurrence: "Yearly",
        reminder: "1 month",
        status: "Active",
        contactName: "Angela Cruz",
        contactInfo: "angela.cruz@lytx.com",
        assignedTo: activeDriverIds[0] ? { kind: "driver", targetId: activeDriverIds[0] } : undefined,
    },
    {
        id: "inv-1006",
        vendorId: "v-006",
        serial: "MDR-INV-22019",
        pin: "0033",
        issueDate: "2026-02-04",
        expiryDate: "2026-08-04",
        recurrence: "Quarterly",
        reminder: "1 week",
        status: "Active",
        contactName: "Dave O'Connor",
        contactInfo: "(317) 555-0144",
        assignedTo: activeDriverIds[1] ? { kind: "driver", targetId: activeDriverIds[1] } : undefined,
        notes: "On-call repair and maintenance vendor for fleet emergencies.",
    },
];

// ── Public lookup helpers used by Asset / Driver detail views ───────────────

export function getInventoryByAssetId(assetId: string): InventoryItem[] {
    return INVENTORY_ITEMS.filter(
        (it) => it.assignedTo && (it.assignedTo.kind === "cmv" || it.assignedTo.kind === "non-cmv") && it.assignedTo.targetId === assetId
    );
}

export function getInventoryByDriverId(driverId: string): InventoryItem[] {
    return INVENTORY_ITEMS.filter((it) => it.assignedTo?.kind === "driver" && it.assignedTo.targetId === driverId);
}

export function getVendorById(vendorId: string): Vendor | undefined {
    return VENDORS.find((v) => v.id === vendorId);
}

export function getInventoryAssetById(assetId: string): Asset | undefined {
    return ACME_ASSETS.find((a) => a.id === assetId);
}

export function getInventoryDriverById(driverId: string): Driver | undefined {
    return ACME_DRIVERS.find((d) => d.id === driverId);
}
