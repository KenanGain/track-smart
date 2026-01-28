// Location data types

// Location data types
export interface LocationAddress {
    street: string;
    city: string;
    state: string;
    zip: string;
}

export interface LocationSecurity {
    fenced: boolean;
    gated: boolean;
    cctv: boolean;
    guard: boolean;
    restricted: boolean;
}

export interface Location {
    id: string;
    type: "Yard" | "Office";
    name: string;
    address: LocationAddress;
    security: LocationSecurity;
    score: number;
    status: "Active" | "Maintenance";
}

export interface LocationGroup {
    key: string;
    label: string;
    typeFilter: "Yard" | "Office";
    collapsed: boolean;
    items: Location[];
}

export interface LocationsTableData {
    groups: LocationGroup[];
}

// UI Configuration
export const LOCATIONS_UI = {
    locationsPage: {
        title: "Location Security Management",
        subtitle: "Manage security protocols and compliance across all fleet locations.",
        primaryAction: { label: "Add New Location", icon: "Plus" },
        filters: {
            searchPlaceholder: "Search by name, address, or ID...",
            type: { label: "Type", default: "All", options: ["All", "Yard", "Office"] },
            status: { label: "Status", default: "All", options: ["All", "Active", "Maintenance"] },
            security: { label: "Security", default: "All", options: ["All", "High (90+)", "Medium (70-89)", "Low (<70)"] }
        },
        table: {
            columns: [
                "LOCATION NAME",
                "ADDRESS",
                "FENCED",
                "GATED",
                "CAMERAS",
                "GUARD",
                "RESTRICTED",
                "SCORE",
                "STATUS",
                "ACTIONS"
            ]
        }
    },
    addLocationModal: {
        id: "addNewLocation",
        title: "Add New Location",
        newLocationDefaults: {
            name: "",
            locationId: "LOC-",
            type: "Yard" as "Yard" | "Office",
            street: "",
            city: "",
            state: "",
            zip: "",
            timezone: "EST (UTC-5)",
            initialStatus: "Active" as "Active" | "Maintenance",
            fenced: true,
            gated: true,
            cctv: true,
            guard: false,
            restricted: false,
            mapPin: { lat: null as number | null, lng: null as number | null },
            certificates: [] as { name: string; size: string }[]
        }
    }
};

// Initial locations data
export const INITIAL_LOCATIONS_DATA: LocationsTableData = {
    groups: [
        {
            key: "office",
            label: "Office Locations",
            typeFilter: "Office",
            collapsed: false,
            items: [
                {
                    id: "LOC-2001",
                    type: "Office",
                    name: "Corporate HQ - Wilmington",
                    address: { street: "1200 North Dupont Hwy", city: "Wilmington", state: "DE", zip: "19801" },
                    security: { fenced: false, gated: true, cctv: true, guard: true, restricted: true },
                    score: 98,
                    status: "Active"
                },
                {
                    id: "LOC-2002",
                    type: "Office",
                    name: "Denver Regional Office",
                    address: { street: "101 Broadway", city: "Denver", state: "CO", zip: "80203" },
                    security: { fenced: false, gated: true, cctv: true, guard: false, restricted: true },
                    score: 94,
                    status: "Active"
                }
            ]
        },
        {
            key: "yard_terminal",
            label: "Yard / Terminal Locations",
            typeFilter: "Yard",
            collapsed: false,
            items: [
                {
                    id: "LOC-1001",
                    type: "Yard",
                    name: "Atlanta Distribution Center",
                    address: { street: "123 Peachtree St", city: "Atlanta", state: "GA", zip: "30303" },
                    security: { fenced: true, gated: true, cctv: true, guard: true, restricted: false },
                    score: 92,
                    status: "Active"
                },
                {
                    id: "LOC-1002",
                    type: "Yard",
                    name: "Dallas Terminal Hub",
                    address: { street: "456 Commerce St", city: "Dallas", state: "TX", zip: "75201" },
                    security: { fenced: true, gated: true, cctv: false, guard: false, restricted: true },
                    score: 75,
                    status: "Active"
                },
                {
                    id: "LOC-1003",
                    type: "Yard",
                    name: "Chicago West Yard",
                    address: { street: "789 Wacker Dr", city: "Chicago", state: "IL", zip: "60606" },
                    security: { fenced: true, gated: true, cctv: true, guard: false, restricted: false },
                    score: 82,
                    status: "Maintenance"
                }
            ]
        }
    ]
};
