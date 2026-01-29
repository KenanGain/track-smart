// Asset Directory data types and mock data

// --- Types ---
export interface DriverAssignment {
    driverId: string;
    startDate: string;
    endDate?: string;
}

export interface Asset {
    id: string;
    unitNumber: string;
    assetCategory: "CMV" | "Non-CMV";
    assetType: string;
    vehicleType: string;
    operationalStatus: "Active" | "Deactivated" | "Maintenance" | "OutOfService" | "Drafted";
    vin: string;
    year: number;
    make: string;
    model: string;
    color: string;
    financialStructure: "Owned" | "Leased" | "Rented" | "Financed";
    plateNumber: string;
    plateJurisdiction: string;
    plateType?: string;
    plateCountry?: "USA" | "Canada";
    registrationIssueDate?: string;
    registrationExpiryDate: string;
    insuranceAddedDate: string;
    insuranceRemovedDate?: string;

    // Monitoring fields
    plateMonitoringEnabled?: boolean;
    plateMonitorBasedOn?: "expiry_date" | "issue_date";
    plateRenewalRecurrence?: "annually" | "quarterly" | "custom";
    plateReminderSchedule?: number[];
    plateNotificationChannels?: string[];

    // Transponder
    transponderNumber?: string;
    transponderIssueDate?: string;
    transponderExpiryDate?: string;
    transponderMonitoringEnabled?: boolean;
    transponderMonitorBasedOn?: "expiry_date" | "issue_date";
    transponderRenewalRecurrence?: "annually" | "quarterly" | "custom";
    transponderReminderSchedule?: number[];
    transponderNotificationChannels?: string[];

    // Weights
    gcwr?: number;
    grossWeight?: number;
    unloadedWeight?: number;

    // Financial
    marketValue?: number;
    notes?: string;
    ownerName?: string;
    leasingName?: string;
    lessorCompanyName?: string;
    rentalAgencyName?: string;
    lienHolderBusiness?: string;
    lienHolderName?: string;

    // Address
    streetAddress?: string;
    city?: string;
    country?: "USA" | "Canada";
    stateProvince?: string;
    zipCode?: string;

    // Assignments
    driverAssignments?: DriverAssignment[];
    yardId?: string;

    permits?: any[];
}

// --- Constants ---
export const USA_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming"
];

export const CANADA_PROVINCES = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Northwest Territories", "Nunavut", "Yukon"
];

export const MOCK_DRIVERS = [
    { id: "drv_1", name: "John Smith" },
    { id: "drv_2", name: "Sarah Miller" },
    { id: "drv_3", name: "Mike Johnson" },
    { id: "drv_4", name: "Elena Rodriguez" },
];

export const MOCK_YARDS = [
    { id: "yard_1", name: "Dallas Main Terminal" },
    { id: "yard_2", name: "Houston Logistics Center" },
    { id: "yard_3", name: "Austin Yard North" },
    { id: "yard_4", name: "San Antonio Terminal" },
];

// --- Mock Assets Data ---
export const INITIAL_ASSETS: Asset[] = [
    {
        id: "a1",
        unitNumber: "TR-1049",
        assetCategory: "CMV",
        assetType: "Truck",
        vehicleType: "Power Unit",
        operationalStatus: "Active",
        vin: "1M8GDM9A6HP05X12",
        year: 2021,
        make: "Freightliner",
        model: "Cascadia",
        color: "White",
        financialStructure: "Owned",
        plateNumber: "P-7762",
        plateJurisdiction: "Texas",
        plateCountry: "USA",
        registrationExpiryDate: "2026-05-12",
        insuranceAddedDate: "2021-06-15",
        plateMonitoringEnabled: true,
        plateMonitorBasedOn: "expiry_date",
        plateReminderSchedule: [90, 60, 30],
        plateNotificationChannels: ["email", "in_app"],
        permits: [],
        driverAssignments: []
    },
    {
        id: "a2",
        unitNumber: "TR-2088",
        assetCategory: "CMV",
        assetType: "Trailer",
        vehicleType: "Flatbed",
        operationalStatus: "Active",
        vin: "1A2B3C4D5E6F7G8H9",
        year: 2023,
        make: "Kenworth",
        model: "T680",
        color: "Blue",
        financialStructure: "Leased",
        plateNumber: "ABC-1234",
        plateJurisdiction: "Ontario",
        plateCountry: "Canada",
        registrationExpiryDate: "2025-11-20",
        insuranceAddedDate: "2023-01-10",
        leasingName: "TruckLease Pro",
        lessorCompanyName: "Fleet Leasing Corp",
        plateMonitoringEnabled: true,
        plateMonitorBasedOn: "expiry_date",
        plateReminderSchedule: [90, 60, 30],
        plateNotificationChannels: ["email", "in_app"],
        permits: [],
        driverAssignments: []
    },
    {
        id: "a3",
        unitNumber: "TR-3055",
        assetCategory: "CMV",
        assetType: "Truck",
        vehicleType: "Straight Truck",
        operationalStatus: "Maintenance",
        vin: "3GCP51C9XKG192837",
        year: 2020,
        make: "Peterbilt",
        model: "389",
        color: "Red",
        financialStructure: "Financed",
        plateNumber: "HAUL-55",
        plateJurisdiction: "Nevada",
        plateCountry: "USA",
        registrationExpiryDate: "2024-11-01",
        insuranceAddedDate: "2020-03-15",
        lienHolderBusiness: "Fleet Finance LLC",
        lienHolderName: "James Peterson",
        plateMonitoringEnabled: true,
        plateMonitorBasedOn: "expiry_date",
        plateReminderSchedule: [90, 60, 30],
        plateNotificationChannels: ["email", "in_app"],
        permits: [],
        driverAssignments: []
    },
    {
        id: "a4",
        unitNumber: "TR-4102",
        assetCategory: "Non-CMV",
        assetType: "Non-CMV Vehicle",
        vehicleType: "Pickup",
        operationalStatus: "Active",
        vin: "1GC4KYEY9KF192847",
        year: 2019,
        make: "Chevrolet",
        model: "Silverado 1500",
        color: "Black",
        financialStructure: "Owned",
        plateNumber: "WRK-4422",
        plateJurisdiction: "Arizona",
        plateCountry: "USA",
        registrationExpiryDate: "2024-08-20",
        insuranceAddedDate: "2019-05-20",
        ownerName: "TrackSmart Logistics Inc.",
        plateMonitoringEnabled: true,
        plateMonitorBasedOn: "expiry_date",
        plateReminderSchedule: [90, 60, 30],
        plateNotificationChannels: ["email", "in_app"],
        permits: [],
        driverAssignments: []
    },
    {
        id: "a5",
        unitNumber: "TR-5200",
        assetCategory: "CMV",
        assetType: "Trailer",
        vehicleType: "Reefer",
        operationalStatus: "Active",
        vin: "5NPE24AF8FH123456",
        year: 2022,
        make: "Great Dane",
        model: "Everest",
        color: "White",
        financialStructure: "Rented",
        plateNumber: "COLD-88",
        plateJurisdiction: "California",
        plateCountry: "USA",
        registrationExpiryDate: "2025-03-15",
        insuranceAddedDate: "2022-06-01",
        rentalAgencyName: "National Trailer Rentals",
        plateMonitoringEnabled: true,
        plateMonitorBasedOn: "expiry_date",
        plateReminderSchedule: [90, 60, 30],
        plateNotificationChannels: ["email", "in_app"],
        permits: [],
        driverAssignments: []
    },
    {
        id: "a6",
        unitNumber: "TR-6001",
        assetCategory: "CMV",
        assetType: "Truck",
        vehicleType: "Tanker",
        operationalStatus: "OutOfService",
        vin: "2FMZA5147XBA98765",
        year: 2018,
        make: "Mack",
        model: "Granite",
        color: "Silver",
        financialStructure: "Owned",
        plateNumber: "TANK-01",
        plateJurisdiction: "Florida",
        plateCountry: "USA",
        registrationExpiryDate: "2024-01-10",
        insuranceAddedDate: "2018-09-20",
        insuranceRemovedDate: "2024-01-15",
        ownerName: "TrackSmart Logistics Inc.",
        plateMonitoringEnabled: false,
        permits: [],
        driverAssignments: []
    }
];

// --- UI Configuration ---
export const ASSET_DIRECTORY_UI = {
    page: {
        title: "Asset Directory",
        subtitle: "Manage fleet vehicles, trailers, and equipment",
        breadcrumb: ["Assets", "Directory"]
    },
    tabs: [
        { id: 'all', label: 'All Assets' },
        { id: 'trucks', label: 'Trucks (CMV)' },
        { id: 'trailers', label: 'Trailers (Non-CMV)' }
    ],
    statusFilters: [
        { id: 'all', label: 'All Statuses' },
        { id: 'Active', label: 'Active' },
        { id: 'Deactivated', label: 'Deactivated' },
        { id: 'Maintenance', label: 'Maintenance' },
        { id: 'OutOfService', label: 'Out of Service' },
        { id: 'Drafted', label: 'Draft' }
    ],
    tableColumns: [
        "Unit #", "Type", "Plate (No. / State)", "Plate Expiry",
        "VIN", "Make / Model / Year", "Date Added", "Ownership", "Status", "Actions"
    ]
};
