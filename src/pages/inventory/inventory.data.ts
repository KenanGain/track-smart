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

// ── Vendor types ─────────────────────────────────────────────────────────────
// Vendor types belong to a category (hierarchical relationship). The seed
// keys below are the well-known type ids, but the type field on Vendor is
// `string` so users can add custom types via the Categories manager.

export type VendorTypeKey =
    | "fuel-card"
    | "transponder"
    | "eld-provider"
    | "gps-tracking"
    | "dashcam"
    | "repair-maintenance"
    | string;

export type VendorType = {
    key: string;
    label: string;
    /** Owning category id. */
    categoryId: string;
    /** Whether this type can apply to multiple assets/trucks at once. */
    multiAsset: boolean;
};

export const VENDOR_TYPES: VendorType[] = [
    { key: "fuel-card", label: "Fuel Card", categoryId: "cat-fuel", multiAsset: true },
    { key: "transponder", label: "Transponder", categoryId: "cat-fuel", multiAsset: true },
    { key: "eld-provider", label: "ELD Provider", categoryId: "cat-fleet-tech", multiAsset: true },
    { key: "gps-tracking", label: "GPS Tracking", categoryId: "cat-fleet-tech", multiAsset: true },
    { key: "dashcam", label: "Dashcam", categoryId: "cat-fleet-tech", multiAsset: true },
    { key: "repair-maintenance", label: "Repair and Maintenance", categoryId: "cat-maintenance", multiAsset: false },
];

export const VENDOR_TYPE_LABELS: Record<string, string> = VENDOR_TYPES.reduce(
    (acc, t) => ({ ...acc, [t.key]: t.label }),
    {} as Record<string, string>
);

export function getTypesByCategory(categoryId: string, types: VendorType[] = VENDOR_TYPES): VendorType[] {
    return types.filter((t) => t.categoryId === categoryId);
}

export function getTypeLabel(typeKey: string, types: VendorType[] = VENDOR_TYPES): string {
    return types.find((t) => t.key === typeKey)?.label ?? typeKey;
}

// ── Categories & Address types ───────────────────────────────────────────────

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
    type: VendorTypeKey;
    categoryId: string;
    address?: VendorAddress;
    email?: string;
    phone?: string;
    contactName?: string;
    contactInfo?: string;
    status: "Active" | "Inactive";
};

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
    assignedAssetIds: string[];
    assignedDriverIds: string[];
    notes?: string;
};

// ── Vendors ──────────────────────────────────────────────────────────────────

export const VENDOR_CATEGORIES: VendorCategory[] = [
    { id: "cat-fleet-tech", name: "Fleet Technology", description: "ELD, GPS, dashcam, telematics" },
    { id: "cat-fuel", name: "Fuel & Tolls", description: "Fuel cards and toll transponders" },
    { id: "cat-maintenance", name: "Maintenance", description: "Repair shops and service vendors" },
];

export const VENDORS: Vendor[] = [
    {
        id: "v-001",
        name: "Comdata",
        companyName: "Comdata Inc.",
        type: "fuel-card",
        categoryId: "cat-fuel",
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
        type: "transponder",
        categoryId: "cat-fuel",
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
        type: "eld-provider",
        categoryId: "cat-fleet-tech",
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
        type: "gps-tracking",
        categoryId: "cat-fleet-tech",
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
        type: "dashcam",
        categoryId: "cat-fleet-tech",
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
        type: "repair-maintenance",
        categoryId: "cat-maintenance",
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

const truckIds = ACME_TRUCKS.map((a) => a.id);
const activeDriverIds = ACME_ACTIVE_DRIVERS.map((d) => d.id);

const pickN = <T,>(arr: T[], n: number): T[] => arr.slice(0, Math.min(n, arr.length));

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
        assignedAssetIds: pickN(truckIds, 2),
        assignedDriverIds: pickN(activeDriverIds, 2),
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
        assignedAssetIds: pickN(truckIds, 3),
        assignedDriverIds: pickN(activeDriverIds, 1),
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
        assignedAssetIds: truckIds, // fleet-wide ELD
        assignedDriverIds: pickN(activeDriverIds, 5),
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
        assignedAssetIds: pickN(truckIds.slice(1), 2),
        assignedDriverIds: pickN(activeDriverIds.slice(2), 1),
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
        assignedAssetIds: pickN(truckIds, 2),
        assignedDriverIds: pickN(activeDriverIds.slice(1), 2),
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
        assignedAssetIds: [],
        assignedDriverIds: [],
        notes: "On-call repair and maintenance vendor for fleet emergencies.",
    },
];

// ── Public lookup helpers used by Asset / Driver detail views ───────────────

export function getInventoryByAssetId(assetId: string): InventoryItem[] {
    return INVENTORY_ITEMS.filter((it) => it.assignedAssetIds.includes(assetId));
}

export function getInventoryByDriverId(driverId: string): InventoryItem[] {
    return INVENTORY_ITEMS.filter((it) => it.assignedDriverIds.includes(driverId));
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
