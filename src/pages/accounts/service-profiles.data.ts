// Service Profile — a parent/aggregator entity that can create and manage
// multiple carrier accounts. Mock data only.

export type BusinessType =
    | "Corporation"
    | "LLC"
    | "Partnership"
    | "Sole Proprietorship"
    | "Non-Profit"
    | "Other";

export const BUSINESS_TYPES: BusinessType[] = [
    "Corporation",
    "LLC",
    "Partnership",
    "Sole Proprietorship",
    "Non-Profit",
    "Other",
];

export type ServiceProfileStatus = "Active" | "Inactive" | "Pending" | "Suspended";

export type Address = {
    country: "United States" | "Canada";
    street: string;
    apt?: string;
    city: string;
    state: string;
    zip: string;
};

export type MailingAddress = {
    streetOrPoBox: string;
    city: string;
    state: string;
    zip: string;
    country: "United States" | "Canada";
};

export type OfficeLocation = {
    id: string;
    label: string;            // "Houston Branch", "Northeast HQ"
    address: string;
    city: string;
    state: string;
    contactName?: string;
    phone?: string;
};

export type ServiceProfile = {
    id: string;
    legalName: string;
    dbaName?: string;
    stateOfInc: string;        // state/province where incorporated
    businessType: BusinessType;
    legalAddress: Address;
    mailingAddress: MailingAddress;
    officeLocations: OfficeLocation[];
    /** -1 means unlimited */
    accountLimit: number;
    accountsCreated: number;
    status: ServiceProfileStatus;
    contactEmail?: string;
    contactPhone?: string;
    createdAt: string;
};

export const ACCOUNT_LIMIT_UNLIMITED = -1;

// ── Seed ────────────────────────────────────────────────────────────────────

export const SERVICE_PROFILES_DB: ServiceProfile[] = [
    {
        id: "svc-001",
        legalName: "TrackSmart Fleet Services LLC",
        dbaName: "TrackSmart",
        stateOfInc: "DE",
        businessType: "LLC",
        legalAddress: {
            country: "United States",
            street: "1200 North Dupont Highway",
            apt: "Suite 200",
            city: "Wilmington",
            state: "DE",
            zip: "19801",
        },
        mailingAddress: {
            streetOrPoBox: "PO Box 8890",
            city: "Wilmington",
            state: "DE",
            zip: "19899",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "Headquarters",  address: "1200 N Dupont Hwy",   city: "Wilmington",  state: "DE", contactName: "Pat Singh",  phone: "(302) 555-0110" },
            { id: "loc-2", label: "Houston Branch", address: "5500 Energy Pkwy",   city: "Houston",     state: "TX", contactName: "Kim Reyes",  phone: "(713) 555-0233" },
            { id: "loc-3", label: "Northeast Hub", address: "55 Liberty Plaza",    city: "Newark",      state: "NJ", contactName: "Devon Park", phone: "(973) 555-0117" },
        ],
        accountLimit: ACCOUNT_LIMIT_UNLIMITED,
        accountsCreated: 3,
        status: "Active",
        contactEmail: "billing@tracksmart.com",
        contactPhone: "(800) 555-0101",
        createdAt: "2023-04-12",
    },
    {
        id: "svc-002",
        legalName: "Rocky Mountain Logistics Group, Inc.",
        dbaName: "RMLG",
        stateOfInc: "CO",
        businessType: "Corporation",
        legalAddress: {
            country: "United States",
            street: "1801 California St",
            apt: "Suite 1900",
            city: "Denver",
            state: "CO",
            zip: "80202",
        },
        mailingAddress: {
            streetOrPoBox: "1801 California St, Suite 1900",
            city: "Denver",
            state: "CO",
            zip: "80202",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "Denver HQ",   address: "1801 California St", city: "Denver",       state: "CO", contactName: "Carlos Mendez", phone: "(303) 555-0801" },
            { id: "loc-2", label: "Salt Lake",   address: "299 S Main",         city: "Salt Lake City", state: "UT", contactName: "Emma Hansen",   phone: "(801) 555-0444" },
        ],
        accountLimit: 8,
        accountsCreated: 4,
        status: "Active",
        contactEmail: "ops@rmlg.com",
        contactPhone: "(303) 555-0800",
        createdAt: "2024-01-08",
    },
    {
        id: "svc-003",
        legalName: "Cascade Transport Holdings LLC",
        dbaName: "Cascade Holdings",
        stateOfInc: "OR",
        businessType: "LLC",
        legalAddress: {
            country: "United States",
            street: "401 Cascade Pkwy",
            city: "Portland",
            state: "OR",
            zip: "97204",
        },
        mailingAddress: {
            streetOrPoBox: "401 Cascade Pkwy",
            city: "Portland",
            state: "OR",
            zip: "97204",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "Portland HQ", address: "401 Cascade Pkwy", city: "Portland", state: "OR", contactName: "Diego Alvarez", phone: "(503) 555-0900" },
        ],
        accountLimit: 10,
        accountsCreated: 1,
        status: "Active",
        contactEmail: "diego.a@cascadefreight.com",
        contactPhone: "(503) 555-0901",
        createdAt: "2024-06-22",
    },
    {
        id: "svc-004",
        legalName: "Pinecrest Operations LP",
        dbaName: "Pinecrest",
        stateOfInc: "TX",
        businessType: "Partnership",
        legalAddress: {
            country: "United States",
            street: "8200 Pinecrest Dr",
            city: "Austin",
            state: "TX",
            zip: "78759",
        },
        mailingAddress: {
            streetOrPoBox: "PO Box 4421",
            city: "Austin",
            state: "TX",
            zip: "78765",
            country: "United States",
        },
        officeLocations: [],
        accountLimit: 5,
        accountsCreated: 0,
        status: "Pending",
        createdAt: "2026-04-01",
    },
    {
        id: "svc-005",
        legalName: "Atlantic Carrier Solutions Inc.",
        dbaName: "ACS",
        stateOfInc: "FL",
        businessType: "Corporation",
        legalAddress: {
            country: "United States",
            street: "2155 Coral Way",
            city: "Miami",
            state: "FL",
            zip: "33145",
        },
        mailingAddress: {
            streetOrPoBox: "2155 Coral Way",
            city: "Miami",
            state: "FL",
            zip: "33145",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "Miami HQ",   address: "2155 Coral Way",    city: "Miami",   state: "FL", contactName: "Marisol Ortiz", phone: "(305) 555-0440" },
            { id: "loc-2", label: "Tampa Hub",  address: "601 Channelside Dr", city: "Tampa",  state: "FL", contactName: "Owen Reyes",    phone: "(813) 555-0118" },
        ],
        accountLimit: 6,
        accountsCreated: 5,
        status: "Active",
        contactEmail: "ops@atlanticcarrier.com",
        contactPhone: "(305) 555-0441",
        createdAt: "2022-09-30",
    },
    {
        id: "svc-006",
        legalName: "Maple Leaf Logistics Cooperative",
        dbaName: "Maple Leaf Logistics",
        stateOfInc: "ON",
        businessType: "Non-Profit",
        legalAddress: {
            country: "Canada",
            street: "1100 Yonge St",
            city: "Toronto",
            state: "ON",
            zip: "M4W 1B2",
        },
        mailingAddress: {
            streetOrPoBox: "PO Box 1100, Stn A",
            city: "Toronto",
            state: "ON",
            zip: "M5W 1A0",
            country: "Canada",
        },
        officeLocations: [
            { id: "loc-1", label: "Toronto HQ",  address: "1100 Yonge St",     city: "Toronto",   state: "ON", contactName: "Jean Tremblay", phone: "(416) 555-0210" },
            { id: "loc-2", label: "Calgary",     address: "639 5th Ave SW",    city: "Calgary",   state: "AB", contactName: "Sarah Macdonald", phone: "(403) 555-0719" },
            { id: "loc-3", label: "Vancouver",   address: "1090 W Georgia St", city: "Vancouver", state: "BC", contactName: "David Wong",     phone: "(604) 555-0382" },
        ],
        accountLimit: 10,
        accountsCreated: 6,
        status: "Active",
        contactEmail: "ops@mapleleaf.ca",
        contactPhone: "(416) 555-0211",
        createdAt: "2021-05-12",
    },
    {
        id: "svc-007",
        legalName: "Sunbelt Hauling Group LLC",
        dbaName: "Sunbelt Hauling",
        stateOfInc: "AZ",
        businessType: "LLC",
        legalAddress: {
            country: "United States",
            street: "4400 N Scottsdale Rd",
            apt: "Suite 800",
            city: "Scottsdale",
            state: "AZ",
            zip: "85251",
        },
        mailingAddress: {
            streetOrPoBox: "PO Box 5588",
            city: "Scottsdale",
            state: "AZ",
            zip: "85261",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "Scottsdale",  address: "4400 N Scottsdale Rd", city: "Scottsdale", state: "AZ", contactName: "Luis Ramirez", phone: "(480) 555-0303" },
        ],
        accountLimit: 5,
        accountsCreated: 4,
        status: "Active",
        contactEmail: "ops@sunbelthauling.com",
        contactPhone: "(480) 555-0300",
        createdAt: "2024-11-04",
    },
    {
        id: "svc-008",
        legalName: "Heartland Freight Holdings",
        dbaName: "Heartland",
        stateOfInc: "IL",
        businessType: "Corporation",
        legalAddress: {
            country: "United States",
            street: "200 W Madison St",
            apt: "Floor 18",
            city: "Chicago",
            state: "IL",
            zip: "60606",
        },
        mailingAddress: {
            streetOrPoBox: "200 W Madison St, Floor 18",
            city: "Chicago",
            state: "IL",
            zip: "60606",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "Chicago HQ",  address: "200 W Madison St",  city: "Chicago",   state: "IL", contactName: "Erin Ferraro", phone: "(312) 555-0660" },
            { id: "loc-2", label: "St. Louis",   address: "611 Olive St",       city: "St. Louis", state: "MO", contactName: "Cory Bell",   phone: "(314) 555-0144" },
        ],
        accountLimit: ACCOUNT_LIMIT_UNLIMITED,
        accountsCreated: 3,
        status: "Active",
        contactEmail: "billing@heartlandfreight.com",
        contactPhone: "(312) 555-0661",
        createdAt: "2023-02-18",
    },
    {
        id: "svc-009",
        legalName: "Bayview Express Partners",
        dbaName: "Bayview Express",
        stateOfInc: "CA",
        businessType: "Partnership",
        legalAddress: {
            country: "United States",
            street: "320 Embarcadero",
            city: "San Francisco",
            state: "CA",
            zip: "94105",
        },
        mailingAddress: {
            streetOrPoBox: "320 Embarcadero",
            city: "San Francisco",
            state: "CA",
            zip: "94105",
            country: "United States",
        },
        officeLocations: [
            { id: "loc-1", label: "SF HQ",  address: "320 Embarcadero", city: "San Francisco", state: "CA", contactName: "Priya Nguyen", phone: "(415) 555-0190" },
        ],
        accountLimit: 5,
        accountsCreated: 3,
        status: "Suspended",
        contactEmail: "ops@bayviewexpress.com",
        contactPhone: "(415) 555-0191",
        createdAt: "2025-07-08",
    },
    {
        id: "svc-010",
        legalName: "Northstar Distribution Co.",
        stateOfInc: "MN",
        businessType: "Sole Proprietorship",
        legalAddress: {
            country: "United States",
            street: "44 South 9th St",
            city: "Minneapolis",
            state: "MN",
            zip: "55402",
        },
        mailingAddress: {
            streetOrPoBox: "44 South 9th St",
            city: "Minneapolis",
            state: "MN",
            zip: "55402",
            country: "United States",
        },
        officeLocations: [],
        accountLimit: 3,
        accountsCreated: 0,
        status: "Inactive",
        contactPhone: "(612) 555-0501",
        createdAt: "2026-03-22",
    },
];

export function isUnlimitedLimit(limit: number): boolean {
    return limit === ACCOUNT_LIMIT_UNLIMITED;
}

export function formatLimit(limit: number): string {
    return isUnlimitedLimit(limit) ? "Unlimited" : limit.toLocaleString();
}

export function getServiceProfileById(id?: string): ServiceProfile | undefined {
    if (!id) return undefined;
    return SERVICE_PROFILES_DB.find((s) => s.id === id);
}

/**
 * Slots remaining for the given service profile. Returns Infinity for
 * unlimited, the actual remaining count otherwise.
 */
export function getRemainingSlots(profile: ServiceProfile): number {
    if (isUnlimitedLimit(profile.accountLimit)) return Infinity;
    return Math.max(0, profile.accountLimit - profile.accountsCreated);
}
