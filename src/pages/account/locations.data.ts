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
    name: string;
    address: LocationAddress;
    security: LocationSecurity;
    score: number;
    status: "Active" | "Maintenance";
    assignedAssets?: string[]; // IDs of assigned assets
}

export interface LocationGroup {
    key: string;
    label: string;
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
            certificates: [] as { name: string; size: string }[],
            assignedAssets: [] as string[]
        }
    }
};

// Initial locations data
export const INITIAL_LOCATIONS_DATA: LocationsTableData = {
    groups: [
        {
            key: "yard_terminal",
            label: "Yard / Terminal Locations",
            collapsed: false,
            items: [
                {
                    id: "LOC-1001",
                    name: "Atlanta Distribution Center",
                    address: { street: "123 Peachtree St", city: "Atlanta", state: "GA", zip: "30303" },
                    security: { fenced: true, gated: true, cctv: true, guard: true, restricted: false },
                    score: 92,
                    status: "Active",
                    assignedAssets: ['a1', 'a3'] // Mock initial assignment
                },
                {
                    id: "LOC-1002",
                    name: "Dallas Terminal Hub",
                    address: { street: "456 Commerce St", city: "Dallas", state: "TX", zip: "75201" },
                    security: { fenced: true, gated: true, cctv: false, guard: false, restricted: true },
                    score: 75,
                    status: "Active"
                },
                {
                    id: "LOC-1003",
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
