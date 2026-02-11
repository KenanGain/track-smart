// Carrier Dashboard Data Constants

export const DIRECTOR_UI = {
    viewModal: {
        title: "Director Details",
        subtitle: "View and manage director information",
        sections: [
            {
                key: "contact",
                label: "CONTACT INFORMATION",
                fields: [
                    { key: "email", label: "Email Address", icon: "Mail" },
                    { key: "phone", label: "Phone Number", icon: "Phone" },
                    { key: "office", label: "Office Location", icon: "MapPin", fullWidth: true }
                ]
            },
            {
                key: "role",
                label: "ROLE & COMPLIANCE",
                fields: [
                    { key: "dateAppointed", label: "Date of Appointment", icon: "Calendar" },
                    { key: "dateResigned", label: "Date of Resignation", icon: "CalendarX" },
                    { key: "responsibility", label: "Primary Responsibility", icon: "Shield" }
                ]
            }
        ]
    },
    editModal: {
        title: "Edit Director",
        subtitle: "Update director profile, contact, and compliance responsibilities.",
        saveLabel: "Save Changes",
        fields: [
            { key: "name", label: "Full Name", type: "text", required: true },
            { key: "role", label: "Role Title", type: "text", required: true },
            { key: "email", label: "Email Address", type: "email", required: true },
            { key: "phone", label: "Phone Number", type: "tel", required: true },
            { key: "stockClass", label: "Stock Class", type: "text", required: true },
            { key: "ownershipPct", label: "Ownership %", type: "number", required: true },
            { key: "office", label: "Office Location", type: "text", required: true },
            { key: "dateAppointed", label: "Date of Appointment", type: "date", required: true },
            { key: "dateResigned", label: "Date of Resignation", type: "date", required: false },
            { key: "responsibility", label: "Primary Responsibility", type: "select", options: ["Operations", "Finance", "Legal", "Compliance"], required: true }
        ],
        layout: [
            ["name", "role"],
            ["email", "phone"],
            ["stockClass", "ownershipPct"],
            ["office"],
            ["dateAppointed", "dateResigned"],
            ["responsibility"]
        ]
    },
    directors: {
        "Johnathan Doe": {
            name: "Johnathan Doe",
            role: "Director of Operations",
            initials: "JD",
            since: "Jan 2019",
            isPrimary: true,
            stockClass: "Class A Common Stock",
            ownershipPct: 65,
            email: "j.doe@acmetrucking.com",
            phone: "+1 (555) 123-4567",
            office: "1200 North Dupont Hwy, Wilmington, DE",
            dateAppointed: "2019-01-15",
            dateResigned: "",
            responsibility: "Operations"
        },
        "Sarah Smith": {
            name: "Sarah Smith",
            role: "VP of Operations",
            initials: "SS",
            since: "Mar 2020",
            isPrimary: false,
            stockClass: "Class B Common Stock",
            ownershipPct: 35,
            email: "s.smith@acmetrucking.com",
            phone: "+1 (555) 987-6543",
            office: "1200 North Dupont Hwy, Wilmington, DE",
            dateAppointed: "2020-03-10",
            dateResigned: "",
            responsibility: "Compliance"
        }
    }
};

export const UI_DATA = {
    editModals: {
        corporateIdentity: {
            id: "editCorporateIdentity",
            title: "Edit Corporate Identity",
            subtitle: "Update your company's official registration details.",
            icon: "Building2",
            saveLabel: "Save Changes",
            fields: [
                { key: "legalName", label: "Legal Name", type: "text", required: true, placeholder: "Acme Trucking Inc." },
                { key: "dbaName", label: "DBA Name", type: "text", required: false, placeholder: "Acme Logistics" },
                { key: "businessType", label: "Business Type", type: "select", required: true, options: ["Corporation", "LLC", "Sole Proprietor", "Partnership"] },
                { key: "stateOfInc", label: "State of Inc.", type: "select", required: true, options: ["Delaware", "California", "Texas", "Florida", "New York"] }
            ],
            layout: [["legalName"], ["dbaName"], ["businessType", "stateOfInc"]],
            values: { legalName: "Acme Trucking Inc.", dbaName: "Acme Logistics", businessType: "Corporation", stateOfInc: "Delaware" }
        },
        legalMainAddress: {
            id: "editLegalMainAddress",
            title: "Edit Legal / Main Address",
            subtitle: "Update your primary business location.",
            icon: "MapPin",
            saveLabel: "Save Changes",
            fields: [
                { key: "country", label: "Country", type: "select", required: false, options: ["United States", "Canada"] },
                { key: "street", label: "Street Address", type: "text", required: false, placeholder: "1200 North Dupont Highway" },
                { key: "apt", label: "Apartment, suite, etc.", type: "text", required: false, placeholder: "(Optional)" },
                { key: "city", label: "City", type: "text", required: false, placeholder: "Wilmington" },
                { key: "state", label: "State", type: "select", required: false, options: ["DE", "NY", "CA", "TX"] },
                { key: "zip", label: "ZIP Code", type: "text", required: false, placeholder: "19801" }
            ],
            layout: [["country"], ["street"], ["apt"], ["city", "state"], ["zip"]],
            values: { country: "United States", street: "1200 North Dupont Highway", apt: "", city: "Wilmington", state: "DE", zip: "19801" }
        },
        fleetDriverOverview: {
            id: "editFleetDriverOverview",
            title: "Edit Fleet & Driver Overview",
            subtitle: "Update your fleet statistics below.",
            icon: "Truck",
            saveLabel: "Save Changes",
            fields: [
                { key: "powerUnits", label: "Power Units", type: "number", required: true, info: true },
                { key: "drivers", label: "Drivers", type: "number", required: true, info: true },
                { key: "nonCmv", label: "Non-CMV Vehicles", type: "number", required: false, info: true, helperText: "Vehicles under 10,001 lbs." }
            ],
            layout: [["powerUnits", "drivers"], ["nonCmv"]],
            values: { powerUnits: 80, drivers: 120, nonCmv: 0 }
        },
        mailingAddress: {
            id: "editMailingAddress",
            title: "Edit Mailing Address",
            subtitle: "",
            icon: "Mail",
            saveLabel: "Save Changes",
            fields: [
                { key: "streetOrPo", label: "Street Address or PO Box", type: "text", required: true, placeholder: "PO Box 8890" },
                { key: "city", label: "City", type: "text", required: true, placeholder: "Wilmington" },
                { key: "state", label: "State", type: "select", required: true, options: ["DE", "NY", "CA", "TX"] },
                { key: "zip", label: "ZIP Code", type: "text", required: true, placeholder: "19899" },
                { key: "country", label: "Country", type: "select", required: true, options: ["United States", "Canada"] }
            ],
            layout: [["streetOrPo"], ["city", "state"], ["zip", "country"]],
            values: { streetOrPo: "PO Box 8890", city: "Wilmington", state: "DE", zip: "19899", country: "United States" }
        },
        operationsAuthority: {
            id: "editOperationsAuthority",
            title: "Operations & Authority",
            subtitle: "Edit your company's operational details.",
            icon: "ShieldCheck",
            saveLabel: "Save Changes",
            fields: [
                { key: "operationClassification", label: "Operation Classification", type: "select", required: false, options: ["Authorized for Hire", "Private Carrier", "Exempt For Hire"] },
                { key: "carrierOperation", label: "Carrier Operation", type: "radioCards", required: false, options: [{ value: "Interstate" }, { value: "Intrastate Only (Hazmat)" }, { value: "Intrastate Only (Non-Hazmat)" }] },
                { key: "fmcsaAuthorityType", label: "FMCSA Operating Authority Types", type: "radioList", required: false, options: ["Motor Carrier of Property", "Motor Carrier of Household Goods", "Broker of Property"] }
            ],
            layout: [["operationClassification"], ["carrierOperation"], ["fmcsaAuthorityType"]],
            values: { operationClassification: "Authorized for Hire", carrierOperation: "Intrastate Only (Non-Hazmat)", fmcsaAuthorityType: "Motor Carrier of Property" }
        },
        addOfficeLocation: {
            id: "addOfficeLocation",
            title: "Add Office Location",
            subtitle: "Enter the details for the new corporate office.",
            icon: "MapPin",
            saveLabel: "Add Location",
            fields: [
                { key: "label", label: "Location Label", type: "text", required: true, placeholder: "e.g. Phoenix Branch" },
                { key: "address", label: "Full Address", type: "text", required: true, placeholder: "123 Main St, Phoenix, AZ 85001" },
                { key: "contact", label: "Contact Person", type: "text", required: true, placeholder: "Manager Name" },
                { key: "phone", label: "Phone Number", type: "tel", required: true, placeholder: "+1 (555) 000-0000" }
            ],
            layout: [["label"], ["address"], ["contact", "phone"]],
            values: { label: "", address: "", contact: "", phone: "" }
        }
    },
    cargoEditor: {
        searchPlaceholder: "Search cargo type...",
        selectedLabel: "Selected",
        selectCommonLabel: "Select Common Types",
        clearAllLabel: "Clear All",
        commonTypes: ["General Freight", "Building Materials", "Fresh Produce", "Refrigerated Food", "Beverages", "Paper Products"],
        sections: [
            { key: "generalFreight", label: "GENERAL FREIGHT & HOUSEHOLD", items: ["General Freight", "Household Goods", "Furniture", "Paper Products", "Utility"] },
            { key: "foodTemp", label: "FOOD & TEMPERATURE CONTROLLED", items: ["Fresh Produce", "Meat", "Refrigerated Food", "Beverages"] },
            { key: "constructionIndustrial", label: "CONSTRUCTION & INDUSTRIAL", items: ["Building Materials", "Metal: sheets, coils, rolls", "Logs, Poles, Beams, Lumber", "Garbage/Refuse", "Construction"] }
        ],
        hazmat: { label: "HAZARDOUS MATERIALS", items: ["Explosives", "Gases", "Flammable Liquids", "Radioactive", "Corrosives"] },
        values: { selected: ["General Freight", "Household Goods", "Building Materials", "Fresh Produce", "Refrigerated Food", "Beverages"] }
    },
    addComplianceNumberModal: {
        id: "addComplianceNumber",
        title: "Add New Compliance Number",
        footer: { cancelLabel: "Cancel", saveLabel: "Save Number" }
    },
    keyNumberCatalog: {
        categories: [
            { key: "regulatorySafety", label: "REGULATORY AND SAFETY NUMBER", types: ["DOT Number", "MC Number", "Safety Status", "CVOR"] },
            { key: "taxBusiness", label: "TAX AND BUSINESS IDENTIFICATION NUMBERS", types: ["EIN Number", "Tax ID", "IFTA", "UCR Number"] },
            { key: "carrierIndustry", label: "CARRIER & INDUSTRY CODES", types: ["SCAC Code", "Carrier Code Number"] },
            { key: "bondRegistration", label: "BOND AND REGISTRATION NUMBERS", types: ["Fleet Bond Number", "Surety Bond Number"] },
            { key: "other", label: "OTHER", types: ["Company Registration #", "Incorporation #"] }
        ]
    }
};

export const INITIAL_VIEW_DATA = {
    app: {
        brand: { name: "Tracksmart fleet solution", logoLetter: "T" },
        user: { initials: "JD" },
        search: { placeholder: "Search carriers, DOT..." }
    },
    page: {
        breadcrumb: ["Account", "Carrier Profile"],
        carrierHeader: {
            name: "Acme Trucking Inc.",
            statusBadge: { text: "Active", tone: "success" },
            meta: [
                { label: "DOT:", badge: { text: "Active", tone: "success" } },
                { label: "CVOR/RIN/NSC:", badge: { text: "Valid", tone: "success" } },
                { label: "Location:", text: "Wilmington, DE" }
            ],
            actions: [{ key: "exportPdf", label: "Export PDF", icon: "FileDown" }]
        },
        cards: {
            keyNumbers: {
                title: "Key Numbers",
                icon: "FileKey",
                groups: [
                    {
                        key: "regulatorySafety", label: "REGULATORY AND SAFETY NUMBER", collapsed: false, canAdd: true, items: [
                            { type: "DOT Number", value: "1234567", status: { text: "Active", tone: "success" }, expiryDate: null },
                            { type: "Safety Status", value: "Satisfactory", status: { text: "Verified", tone: "success" }, expiryDate: "2024-12-01" }
                        ]
                    },
                    {
                        key: "taxBusiness", label: "TAX AND BUSINESS IDENTIFICATION NUMBERS", collapsed: false, canAdd: true, items: [
                            { type: "IFTA", value: "IFTA-DE-990", status: { text: "Active", tone: "success" }, expiryDate: "2024-12-31" }
                        ]
                    },
                    { key: "carrierIndustry", label: "CARRIER & INDUSTRY CODES", collapsed: true, canAdd: true, items: [] },
                    { key: "bondRegistration", label: "BOND AND REGISTRATION NUMBERS", collapsed: true, canAdd: true, items: [] },
                    { key: "other", label: "OTHER", collapsed: false, canAdd: true, items: [{ type: "DTOPS Number", value: "DT-556677", status: { text: "Active", tone: "success" }, expiryDate: null }] }
                ]
            },
            directorsOfficers: {
                title: "Directors & Officers",
                icon: "Users",
                addButton: { label: "Add Director" },
                rows: [
                    { name: "Johnathan Doe", title: "President / CEO", ownershipPct: 65, actionLabel: "View More" },
                    { name: "Sarah Smith", title: "VP of Operations", ownershipPct: 35, actionLabel: "View More" }
                ]
            }
        }
    }
};

// --- COMPLIANCE NUMBERS DATA STRUCTURE ---
export const COMPLIANCE_NUMBERS = {
    groups: [
        {
            key: "regulatory",
            label: "REGULATORY AND SAFETY NUMBERS",
            items: [
                { type: "USDOT Number", value: "3920192", status: "Active", expiry: "-", docStatus: "Uploaded" },
                { type: "MC Number", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
                { type: "USDOT Legal Name", value: "Acme Trucking Inc.", status: "Active", expiry: "-", docStatus: "Uploaded" },
                { type: "Safety Fitness Rating", value: "Satisfactory", status: "Active", expiry: "2024-12-01", docStatus: "Uploaded" },
                { type: "CVOR Level", value: "Not entered", status: "Missing", expiry: "Not set", docStatus: "N/A" },
            ]
        },
        {
            key: "tax",
            label: "TAX AND BUSINESS IDENTIFICATION NUMBERS",
            items: [
                { type: "EIN", value: "88-1234567", status: "Incomplete", expiry: "-", docStatus: "Missing" },
                { type: "DUNS Number", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
                { type: "IFTA License", value: "IFTA-9902", status: "Expiring Soon", expiry: "2024-02-28", docStatus: "Uploaded" },
                { type: "State Tax ID", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
            ]
        },
        {
            key: "carrier",
            label: "CARRIER & INDUSTRY CODES",
            items: [
                { type: "SCAC Code", value: "ACME", status: "Active", expiry: "2026-06-30", docStatus: "Uploaded" },
                { type: "Carrier Code", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
            ]
        },
        {
            key: "bond",
            label: "BOND AND REGISTRATION NUMBERS",
            items: [
                { type: "Surety Bond", value: "SB-998877", status: "Expired", expiry: "2023-12-31", docStatus: "Uploaded" },
                { type: "Cargo Insurance", value: "POL-555", status: "Incomplete", expiry: "-", docStatus: "Missing" },
            ]
        },
        {
            key: "other",
            label: "OTHER",
            items: [
                { type: "Company Registration", value: "Not entered", status: "Missing", expiry: "-", docStatus: "N/A" },
            ]
        }
    ]
};

// --- OFFICE LOCATIONS DATA ---
export const OFFICE_LOCATIONS = [
    {
        id: "LOC-2001",
        label: "Corporate HQ - Wilmington",
        address: "1200 North Dupont Hwy, Wilmington, DE 19801",
        contact: "Head Office",
        phone: "+1 (555) 123-4567",
        operatingHours: [
            { day: "Mon - Fri", hours: "08:00 - 18:00" },
            { day: "Sat", hours: "10:00 - 14:00" },
            { day: "Sun", hours: "Closed" }
        ]
    },
    {
        id: "LOC-2002",
        label: "Denver Regional Office",
        address: "101 Broadway, Denver, CO 80203",
        contact: "Regional Manager",
        phone: "+1 (303) 555-0199",
        operatingHours: [
            { day: "Mon - Fri", hours: "09:00 - 17:00" },
            { day: "Sat", hours: "Closed" },
            { day: "Sun", hours: "Closed" }
        ]
    }
];

// --- DRIVER TYPES ---
export const DRIVER_TYPES = [
    { id: 1, code: 'LONG_HAUL_DRIVER', name: 'Long Haul Driver', description: 'Driver operating long distance routes across states or regions', active: true },
    { id: 2, code: 'LOCAL_DRIVER', name: 'Local Driver', description: 'Driver operating within a local or regional area', active: true },
    { id: 3, code: 'OWNER_OPERATOR', name: 'Owner Operator', description: 'Independent driver who owns and operates their own truck', active: true },
    { id: 4, code: 'OWNER_OPERATOR_DRIVER', name: 'Owner Operator Driver', description: 'Driver working under an owner operator', active: true },
    { id: 5, code: 'DRIVER_SERVICE_LEASE', name: 'Driver Service/Lease', description: 'Driver provided through a leasing or driver service agreement', active: true },
    { id: 6, code: 'OTHER_COMPANY_EMPLOYEE', name: 'Other Company Employee', description: 'Employee from another company operating vehicle', active: true },
    { id: 7, code: 'UNAUTHORIZED_DRIVER', name: 'Unauthorized Driver', description: 'Driver not authorized under company policy', active: true },
    { id: 8, code: 'OTHER', name: 'Other', description: 'Any driver type not categorized above', active: true }
];

// --- DRIVER MOCK DATA ---
export interface Driver {
    id: string;
    // Basic Info
    name: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    avatarInitials: string;
    status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
    
    // Contact
    phone: string;
    email: string;
    
    // Employment
    hiredDate: string;
    dateAdded: string; // usually same or close to hired
    terminal: string;
    carrierCode: string; // e.g., WEST-001
    driverType?: string; // e.g., 'Long Haul Driver'
    
    // Personal Config
    dob: string;
    gender: string;
    ssn: string;
    citizenship: string;
    authorizedToWork: boolean;
    
    // Address
    address: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
    country: string;

    // Emergency Contacts
    emergencyContacts: Array<{ name: string; relation: string; phone: string; email: string }>;
    
    // Previous Residences
    previousResidences: Array<{
        country: string; 
        address: string; 
        unit?: string; 
        city: string; 
        state: string; 
        zip: string; 
        startDate: string; 
        endDate: string;
    }>;

    // Licenses (Summary and Detailed)
    licenseNumber: string; // Primary
    licenseState: string;  // Primary
    licenseExpiry: string; // Primary
    licenses: Array<{
        id: number;
        type: string;
        licenseNumber: string;
        province: string;
        country: string;
        class: string;
        issueDate: string;
        expiryDate: string;
        status: string;
        conditions: string;
        endorsements: string[];
        restrictions: string[];
        isPrimary: boolean;
        suspended: boolean;
        uploadType: string;
    }>;

    // Employment History
    employmentHistory: Array<{
        employerName: string;
        address: string;
        startDate: string;
        endDate: string;
        operatingZone: string;
        terminationStatus: string;
    }>;

    // Compliance
    keyNumbers?: any[];
    documents?: any[];
    certificates?: any[];
}

export const MOCK_DRIVERS: Driver[] = [
    // --- User Requested Drivers (with missing items) ---
    {
        id: "DRV-2001",
        name: "John Smith",
        firstName: "John",
        lastName: "Smith",
        middleName: "Andrew",
        status: "Active",
        avatarInitials: "JS",
        phone: "(555) 000-0001",
        email: "john.smith@example.com",
        hiredDate: "2023-01-15",
        dateAdded: "2023-01-20",
        terminal: "Chicago, IL",
        carrierCode: "WEST-006",
        driverType: "Long Haul Driver",
        dob: "1990-01-01",
        gender: "Male",
        ssn: "000-00-0001",
        citizenship: "USA",
        authorizedToWork: true,
        address: "100 Main St",
        unit: "3A",
        city: "Chicago",
        state: "IL",
        zip: "60601",
        country: "USA",
        licenseNumber: "SMI90228811",
        licenseState: "IL",
        licenseExpiry: "2027-01-10",
        emergencyContacts: [
            { name: "Jane Smith", relation: "Spouse", phone: "(555) 000-1010", email: "jane.smith@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '50 Lake Shore Dr', unit: '', city: 'Milwaukee', state: 'WI', zip: '53202', startDate: '2019-06-01', endDate: '2022-12-31' }
        ],
        licenses: [
            { id: 1, type: 'CDL', licenseNumber: 'SMI90228811', province: 'IL', country: 'USA', class: 'Class A', issueDate: '2022-01-10', expiryDate: '2027-01-10', status: 'Valid', conditions: '', endorsements: ['T - Double/Triple Trailers'], restrictions: [], isPrimary: true, suspended: false, uploadType: 'images' }
        ],
        employmentHistory: [
            { employerName: 'Midwest Freight Co.', address: 'Chicago, IL', startDate: '2020-03-01', endDate: '2022-12-31', operatingZone: 'Interstate', terminationStatus: 'Voluntary' },
            { employerName: 'Rapid Dispatch LLC', address: 'Milwaukee, WI', startDate: '2018-05-01', endDate: '2020-02-28', operatingZone: 'Interstate', terminationStatus: 'Voluntary' }
        ],
        keyNumbers: [],
        documents: [],
        certificates: []
    },
    {
        id: "DRV-2002",
        name: "Sarah Miller",
        firstName: "Sarah",
        lastName: "Miller",
        middleName: "Elizabeth",
        status: "Active",
        avatarInitials: "SM",
        phone: "(555) 000-0002",
        email: "sarah.miller@example.com",
        hiredDate: "2023-02-20",
        dateAdded: "2023-02-25",
        terminal: "Dallas, TX",
        carrierCode: "WEST-007",
        driverType: "Local Driver",
        dob: "1992-02-02",
        gender: "Female",
        ssn: "000-00-0002",
        citizenship: "USA",
        authorizedToWork: true,
        address: "200 Second St",
        unit: "B2",
        city: "Dallas",
        state: "TX",
        zip: "75001",
        country: "USA",
        licenseNumber: "MIL92003322",
        licenseState: "TX",
        licenseExpiry: "2028-02-15",
        emergencyContacts: [
            { name: "Tom Miller", relation: "Father", phone: "(555) 000-2020", email: "tom.miller@example.com" },
            { name: "Amy Miller", relation: "Sister", phone: "(555) 000-2021", email: "amy.miller@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '88 Greenville Ave', unit: '', city: 'Houston', state: 'TX', zip: '77001', startDate: '2018-09-01', endDate: '2022-01-31' }
        ],
        licenses: [
            { id: 1, type: 'CDL', licenseNumber: 'MIL92003322', province: 'TX', country: 'USA', class: 'Class A', issueDate: '2023-02-15', expiryDate: '2028-02-15', status: 'Valid', conditions: '', endorsements: [], restrictions: [], isPrimary: true, suspended: false, uploadType: 'images' }
        ],
        employmentHistory: [
            { employerName: 'Lone Star Logistics', address: 'Houston, TX', startDate: '2019-01-01', endDate: '2023-01-31', operatingZone: 'Intrastate', terminationStatus: 'Voluntary' }
        ],
        keyNumbers: [],
        documents: [],
        certificates: []
    },
    {
        id: "DRV-2003",
        name: "Mike Johnson",
        firstName: "Mike",
        lastName: "Johnson",
        middleName: "David",
        status: "On Leave",
        avatarInitials: "MJ",
        phone: "(555) 000-0003",
        email: "mike.johnson@example.com",
        hiredDate: "2022-11-10",
        dateAdded: "2022-11-15",
        terminal: "Miami, FL",
        carrierCode: "WEST-008",
        driverType: "Owner Operator",
        dob: "1988-03-03",
        gender: "Male",
        ssn: "000-00-0003",
        citizenship: "USA",
        authorizedToWork: true,
        address: "300 Third St",
        city: "Miami",
        state: "FL",
        zip: "33101",
        country: "USA",
        licenseNumber: "JOH88001133",
        licenseState: "FL",
        licenseExpiry: "2026-03-20",
        emergencyContacts: [
            { name: "Lisa Johnson", relation: "Spouse", phone: "(555) 000-3030", email: "lisa.j@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '1500 Coral Way', unit: '12C', city: 'Fort Lauderdale', state: 'FL', zip: '33316', startDate: '2016-08-01', endDate: '2021-10-31' },
            { country: 'USA', address: '22 Pine Rd', unit: '', city: 'Orlando', state: 'FL', zip: '32801', startDate: '2013-03-01', endDate: '2016-07-31' }
        ],
        licenses: [
            { id: 1, type: 'CDL', licenseNumber: 'JOH88001133', province: 'FL', country: 'USA', class: 'Class A', issueDate: '2021-03-20', expiryDate: '2026-03-20', status: 'Valid', conditions: 'Corrective Lenses', endorsements: ['H - Hazardous Materials'], restrictions: [], isPrimary: true, suspended: false, uploadType: 'images' }
        ],
        employmentHistory: [
            { employerName: 'Sunshine Transport Inc.', address: 'Miami, FL', startDate: '2017-04-01', endDate: '2022-10-31', operatingZone: 'Interstate', terminationStatus: 'Voluntary' },
            { employerName: 'Atlantic Haulers LLC', address: 'Fort Lauderdale, FL', startDate: '2013-06-01', endDate: '2017-03-31', operatingZone: 'Interstate', terminationStatus: 'Voluntary' }
        ],
        keyNumbers: [],
        documents: [],
        certificates: []
    },
    {
        id: "DRV-2004",
        name: "Elena Rodriguez",
        firstName: "Elena",
        lastName: "Rodriguez",
        middleName: "Maria",
        status: "Active",
        avatarInitials: "ER",
        phone: "(555) 000-0004",
        email: "elena.rodriguez@example.com",
        hiredDate: "2023-05-05",
        dateAdded: "2023-05-10",
        terminal: "Sacramento, CA",
        carrierCode: "WEST-009",
        driverType: "Driver Service/Lease",
        dob: "1995-04-04",
        gender: "Female",
        ssn: "000-00-0004",
        citizenship: "USA",
        authorizedToWork: true,
        address: "400 Fourth St",
        unit: "1D",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
        country: "USA",
        licenseNumber: "ROD95221144",
        licenseState: "CA",
        licenseExpiry: "2027-04-01",
        emergencyContacts: [
            { name: "Carlos Rodriguez", relation: "Brother", phone: "(555) 000-4040", email: "carlos.r@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '75 River Rd', unit: '', city: 'San Francisco', state: 'CA', zip: '94102', startDate: '2020-01-01', endDate: '2023-04-30' }
        ],
        licenses: [
            { id: 1, type: 'CDL', licenseNumber: 'ROD95221144', province: 'CA', country: 'USA', class: 'Class A', issueDate: '2022-04-01', expiryDate: '2027-04-01', status: 'Valid', conditions: '', endorsements: ['N - Tank Vehicles'], restrictions: [], isPrimary: true, suspended: false, uploadType: 'images' }
        ],
        employmentHistory: [
            { employerName: 'Pacific Coast Carriers', address: 'San Francisco, CA', startDate: '2020-06-01', endDate: '2023-04-30', operatingZone: 'Interstate', terminationStatus: 'Voluntary' }
        ],
        keyNumbers: [],
        documents: [],
        certificates: []
    },
    
    // --- Existing Drivers ---
    {
        id: "DRV-1001",
        name: "James Sullivan",
        firstName: "James",
        lastName: "Sullivan",
        middleName: "Robert",
        status: "Active",
        avatarInitials: "JS",
        
        phone: "(555) 123-4567",
        email: "james.sullivan@example.com",
        
        hiredDate: "2020-03-10",
        dateAdded: "2020-03-15",
        terminal: "Springfield, IL",
        carrierCode: "WEST-001",
        driverType: "Long Haul Driver",
        
        dob: "1985-05-15",
        gender: "Male",
        ssn: "123-45-6789",
        citizenship: "USA",
        authorizedToWork: true,
        
        address: "123 Maple Avenue",
        unit: "4B",
        city: "Springfield",
        state: "IL",
        zip: "62704",
        country: "USA",
        
        emergencyContacts: [
            { name: "Sarah Sullivan", relation: "Spouse", phone: "(555) 987-6543", email: "sarah.s@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '450 Oak Street', unit: '202', city: 'Chicago', state: 'IL', zip: '60614', startDate: '2018-01-01', endDate: '2020-03-10' }
        ],
        
        licenseNumber: "SUL88291022",
        licenseState: "IL",
        licenseExpiry: "2025-05-15",
        licenses: [
            {
                id: 1,
                type: 'CDL',
                licenseNumber: 'SUL88291022',
                province: 'IL',
                country: 'USA',
                class: 'Class A',
                issueDate: '2020-05-15',
                expiryDate: '2025-05-15',
                status: 'Valid',
                conditions: 'Corrective Lenses',
                endorsements: ['H - Hazardous Materials', 'T - Double/Triple Trailers'],
                restrictions: ['L - No Air Brake'],
                isPrimary: true,
                suspended: false,
                uploadType: 'images'
            }
        ],
        
        employmentHistory: [
            {
                employerName: 'Logistics West LLC',
                address: 'Sacramento, CA',
                startDate: '2015-01-01',
                endDate: '2020-02-28',
                operatingZone: 'Interstate',
                terminationStatus: 'Voluntary', 
            }
        ],

        keyNumbers: [
            { configId: "kn-driver-license", value: "SUL88291022", expiryDate: "2025-05-15" }
        ],
        documents: [
            { typeId: "doc-driver-license", hasUpload: true }
        ],
        certificates: []
    },
    {
        id: "DRV-1002",
        name: "Maria Rodriguez",
        firstName: "Maria",
        lastName: "Rodriguez",
        status: "Active",
        avatarInitials: "MR",
        
        phone: "(555) 987-6543",
        email: "m.rodriguez@example.com",
        
        hiredDate: "2021-06-15",
        dateAdded: "2021-06-20",
        terminal: "Dallas, TX",
        carrierCode: "WEST-002",
        driverType: "Local Driver",
        
        dob: "1988-11-22",
        gender: "Female",
        ssn: "987-65-4321",
        citizenship: "USA",
        authorizedToWork: true,
        
        address: "789 Cactus Drive",
        unit: "",
        city: "Dallas",
        state: "TX",
        zip: "75001",
        country: "USA",
        
        emergencyContacts: [
            { name: "Jose Rodriguez", relation: "Father", phone: "(555) 111-2222", email: "jose.r@example.com" }
        ],
        previousResidences: [],
        
        licenseNumber: "ROD77382911",
        licenseState: "TX",
        licenseExpiry: "2026-08-22",
        licenses: [
            {
                id: 1,
                type: 'CDL',
                licenseNumber: 'ROD77382911',
                province: 'TX',
                country: 'USA',
                class: 'Class A',
                issueDate: '2021-08-22',
                expiryDate: '2026-08-22',
                status: 'Valid',
                conditions: '',
                endorsements: [],
                restrictions: [],
                isPrimary: true,
                suspended: false,
                uploadType: 'images'
            }
        ],
        
        employmentHistory: [],

        keyNumbers: [], 
        documents: [],
        certificates: []
    },
    {
        id: "DRV-1003",
        name: "Robert Chen",
        firstName: "Robert",
        lastName: "Chen",
        status: "On Leave",
        avatarInitials: "RC",
        
        phone: "(555) 456-7890",
        email: "r.chen@example.com",
        
        hiredDate: "2019-11-01",
        dateAdded: "2019-11-05",
        terminal: "Sacramento, CA",
        carrierCode: "WEST-003",
        driverType: "Owner Operator",

        dob: "1990-02-14",
        gender: "Male",
        ssn: "456-78-9012",
        citizenship: "USA",
        authorizedToWork: true,
        
        address: "456 Golden Gate Blvd",
        city: "Sacramento",
        state: "CA",
        zip: "95814",
        country: "USA",
        
        emergencyContacts: [
            { name: "Wei Chen", relation: "Mother", phone: "(555) 456-0001", email: "wei.chen@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '123 Market St', unit: '', city: 'San Jose', state: 'CA', zip: '95113', startDate: '2016-01-01', endDate: '2019-10-31' }
        ],
        
        licenseNumber: "CHE99283321",
        licenseState: "CA",
        licenseExpiry: "2024-11-30",
        licenses: [
            {
                id: 1,
                type: 'CDL',
                licenseNumber: 'CHE99283321',
                province: 'CA',
                country: 'USA',
                class: 'Class B',
                issueDate: '2019-11-30',
                expiryDate: '2024-11-30',
                status: 'Valid',
                conditions: '',
                endorsements: [],
                restrictions: [],
                isPrimary: true,
                suspended: false,
                uploadType: 'images'
            }
        ],
        
        employmentHistory: [],

        keyNumbers: [
             { configId: "kn-driver-license", value: "CHE99283321", expiryDate: "2024-11-30" }
        ],
        documents: [],
        certificates: []
    },
    {
        id: "DRV-1004",
        name: "Sarah Johnson",
        firstName: "Sarah",
        lastName: "Johnson",
        status: "Active",
        avatarInitials: "SJ",
        
        phone: "(555) 222-3333",
        email: "s.johnson@example.com",
        
        hiredDate: "2022-02-20",
        dateAdded: "2022-02-25",
        terminal: "Albany, NY",
        carrierCode: "WEST-004",
        driverType: "Owner Operator Driver",

        dob: "1992-07-08",
        gender: "Female",
        ssn: "222-33-4444",
        citizenship: "USA",
        authorizedToWork: true,
        
        address: "789 Empire State Rd",
        city: "Albany",
        state: "NY",
        zip: "12207",
        country: "USA",
        
        emergencyContacts: [
            { name: "David Johnson", relation: "Spouse", phone: "(555) 222-0001", email: "david.j@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '55 Broadway', unit: '15F', city: 'New York', state: 'NY', zip: '10006', startDate: '2017-05-01', endDate: '2021-12-31' }
        ],
        
        licenseNumber: "JOH55667788",
        licenseState: "NY",
        licenseExpiry: "2025-01-10",
        licenses: [
            {
                id: 1,
                type: 'CDL',
                licenseNumber: 'JOH55667788',
                province: 'NY',
                country: 'USA',
                class: 'Class A',
                issueDate: '2022-01-10',
                expiryDate: '2025-01-10',
                status: 'Valid',
                conditions: '',
                endorsements: [],
                restrictions: [],
                isPrimary: true,
                suspended: false,
                uploadType: 'images'
            }
        ],
        
        employmentHistory: [],

        keyNumbers: [
            { configId: "kn-driver-license", value: "JOH55667788", expiryDate: "2025-01-10" }
        ],
        documents: [
            { typeId: "doc-driver-license", hasUpload: true }
        ],
        certificates: []
    },
    {
        id: "DRV-1005",
        name: "Michael Brown",
        firstName: "Michael",
        lastName: "Brown",
        status: "Terminated",
        avatarInitials: "MB",
        
        phone: "(555) 777-8888",
        email: "m.brown@example.com",
        
        hiredDate: "2018-05-12",
        dateAdded: "2018-05-15",
        terminal: "Miami, FL",
        carrierCode: "WEST-005",
        driverType: "Other",

        dob: "1980-09-30",
        gender: "Male",
        ssn: "777-88-9999",
        citizenship: "USA",
        authorizedToWork: true,
        
        address: "321 Ocean Drive",
        city: "Miami",
        state: "FL",
        zip: "33101",
        country: "USA",
        
        emergencyContacts: [
            { name: "Patricia Brown", relation: "Sister", phone: "(555) 777-0001", email: "pat.brown@example.com" }
        ],
        previousResidences: [
            { country: 'USA', address: '200 Palm Ave', unit: '', city: 'Tampa', state: 'FL', zip: '33602', startDate: '2014-01-01', endDate: '2018-04-30' }
        ],
        
        licenseNumber: "BRO44556677",
        licenseState: "FL",
        licenseExpiry: "2023-09-15",
        licenses: [
            {
                id: 1,
                type: 'CDL',
                licenseNumber: 'BRO44556677',
                province: 'FL',
                country: 'USA',
                class: 'Class A',
                issueDate: '2018-09-15',
                expiryDate: '2023-09-15',
                status: 'Expired',
                conditions: '',
                endorsements: [],
                restrictions: [],
                isPrimary: true,
                suspended: false,
                uploadType: 'images'
            }
        ],
        
        employmentHistory: [],

        keyNumbers: [],
        documents: [],
        certificates: []
    }
];

export const MOCK_DRIVER_DETAILED_TEMPLATE: Driver = {
    id: "",
    name: "",
    firstName: "",
    lastName: "",
    status: "Active",
    avatarInitials: "",
    phone: "",
    email: "",
    hiredDate: "",
    dateAdded: "",
    terminal: "",
    carrierCode: "",
    dob: "",
    gender: "",
    ssn: "",
    citizenship: "USA",
    authorizedToWork: true,
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
    licenseNumber: "",
    licenseState: "",
    licenseExpiry: "",
    emergencyContacts: [],
    previousResidences: [],
    licenses: [],
    employmentHistory: [],
    keyNumbers: [],
    documents: [],
    certificates: []
};
