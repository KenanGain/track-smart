export type Status = 'Active' | 'Draft' | 'Inactive' | 'On Leave' | 'Terminated';
export type RelatedTo = 'carrier' | 'asset' | 'driver';

export type ColorTheme = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'indigo' | 'cyan';

export interface Tag {
    id: string;
    label: string;
}

export interface SelectedTag {
    id: string;
    required: boolean;
}

export interface TagSection {
    id: string;
    title: string;
    description: string;
    icon: 'Shield' | 'FileText' | 'Calendar' | 'PieChart' | 'Award' | 'Tag' | 'Bookmark' | 'Layers' | 'Hash';
    multiSelect: boolean;
    colorTheme: ColorTheme;
    allowCustomTags: boolean;
    tags: Tag[];
}

export interface DocumentType {
    id: string;
    name: string;
    relatedTo: RelatedTo;
    description?: string;

    // Config
    requirementLevel: 'required' | 'optional' | 'not_required';
    expiryRequired: boolean;
    issueDateRequired: boolean;
    issueStateRequired?: boolean;
    issueCountryRequired?: boolean;
    status: Status;

    // Tags
    selectedTags?: Record<string, SelectedTag[]>; // sectionId -> array of SelectedTag objects

    destination?: {
        root?: string;
        mode?: 'name' | 'folder';
        folderId?: string;
        folderName?: string;
        driverId?: string;
    };
    monitoring?: {
        enabled: boolean;
        basedOn: string;
        recurrence: string;
        reminders: { d90: boolean; d60: boolean; d30: boolean; d7: boolean };
        channels: { email: boolean; inapp: boolean; sms: boolean };
    };
    isSystem?: boolean; // If true, cannot be deleted
}

export type FolderCounts = { subfolders?: number; files?: number };

export interface FolderNode {
    id: string;
    name: string;
    type?: 'root' | 'folder';
    metaLine?: string;
    counts?: FolderCounts;
    children?: FolderNode[];
    parentId?: string | null;
}

// --- DRIVER DATA ---

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

export const INITIAL_TAG_SECTIONS: TagSection[] = [
    {
        id: 'sec_insurance',
        title: 'Insurance',
        description: 'Select applicable insurance document tags.',
        icon: 'Shield',
        multiSelect: true,
        colorTheme: 'blue',
        allowCustomTags: true,
        tags: [
            { id: 'ins_cargo', label: 'Cargo Insurance' },
            { id: 'ins_liability', label: 'Liability Insurance' },
            { id: 'ins_physical', label: 'Physical Damage Insurance' }
        ]
    },
    {
        id: 'sec_policies',
        title: 'Policies and Procedures',
        description: 'Select policy document types used in your organization.',
        icon: 'FileText',
        multiSelect: true,
        colorTheme: 'emerald',
        allowCustomTags: true,
        tags: [
            { id: 'pol_contract', label: 'Contract Agreements' },
            { id: 'pol_manual', label: 'Driver Manuals' },
            { id: 'pol_drug', label: 'Drug and Alcohol Policy' },
            { id: 'pol_prev', label: 'Preventive Maintenance Policy' },
            { id: 'pol_veh', label: 'Vehicle Maintenance Policy' },
            { id: 'pol_safety', label: 'General Health and Safety Policy' },
            { id: 'pol_hazard', label: 'Hazard Prevention Program / Policy' }
        ]
    },
    {
        id: 'sec_year',
        title: 'Document Year',
        description: 'Assign applicable document year attribute.',
        icon: 'Calendar',
        multiSelect: false,
        colorTheme: 'amber',
        allowCustomTags: false,
        tags: [
            { id: 'tag_year_generic', label: 'Year' }
        ]
    },
    {
        id: 'sec_quarter',
        title: 'Quarter',
        description: 'Select applicable quarters.',
        icon: 'PieChart',
        multiSelect: true,
        colorTheme: 'violet',
        allowCustomTags: false,
        tags: [
            { id: 'q1', label: 'Q1' },
            { id: 'q2', label: 'Q2' },
            { id: 'q3', label: 'Q3' },
            { id: 'q4', label: 'Q4' }
        ]
    },
    {
        id: 'sec_cvor',
        title: 'CVOR Level',
        description: 'Select compliance level.',
        icon: 'Award',
        multiSelect: false,
        colorTheme: 'rose',
        allowCustomTags: false,
        tags: [
            { id: 'cvor_1', label: 'CVOR Level 1' },
            { id: 'cvor_2', label: 'CVOR Level 2' },
            { id: 'cvor_3', label: 'CVOR Level 3' }
        ]
    }
];

export const MOCK_DOCUMENTS: DocumentType[] = [
    // Carrier Docs
    { id: '1', name: 'CVOR Level 2', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_safety', folderName: 'Safety Rating' } },
    { id: '2', name: 'Safety Fitness Certificate', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_safety', folderName: 'Safety Rating' } },
    {
        id: '3',
        name: 'Liability Insurance',
        relatedTo: 'carrier',
        expiryRequired: true,
        issueDateRequired: false,
        status: 'Active',
        selectedTags: {
            'sec_insurance': [
                { id: 'ins_cargo', required: false },
                { id: 'ins_liability', required: false },
                { id: 'ins_physical', required: false }
            ]
        },
        requirementLevel: 'required',
        destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' }
    },
    { id: '4', name: 'Operating Authority', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Draft', selectedTags: {}, requirementLevel: 'optional', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '5', name: 'IFTA License', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_ifta', folderName: 'IFTA' } },
    // Asset Docs (Defaulting to Asset Root as they are unit specific)
    { id: '6', name: 'Vehicle Registration', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '7', name: 'Annual Safety Inspection', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '8', name: 'Lease Agreement', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Draft', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    // Driver Docs
    { 
        id: 'DT-PAYSTUB', 
        name: 'Paystub', 
        relatedTo: 'driver', 
        expiryRequired: false, 
        issueDateRequired: false, 
        status: 'Active', 
        isSystem: true, 
        selectedTags: {}, 
        requirementLevel: 'optional', 
        destination: { mode: 'folder', folderId: 'driver_ev', folderName: 'Employment Verification' },
        monitoring: {
            enabled: false,
            basedOn: 'expiryDate',
            recurrence: 'once',
            reminders: { d90: false, d60: false, d30: false, d7: false },
            channels: { email: false, inapp: false, sms: false }
        }
    },
    { id: '9', name: 'Driver License', relatedTo: 'driver', expiryRequired: true, issueDateRequired: false, status: 'Active', isSystem: true, selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'driver_cdls', folderName: 'CDLS Records' } },
    { id: '10', name: 'Medical Examiner Certificate', relatedTo: 'driver', expiryRequired: true, issueDateRequired: true, status: 'Active', isSystem: true, selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'driver_app', folderName: 'Driver Application' } },
    { id: '11', name: 'Training Certificate', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'optional', destination: { mode: 'folder', folderId: 'driver_train', folderName: 'Training Certificates' } },
    { id: '12', name: 'USDOT Number', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '13', name: 'MX Number', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '14', name: 'NSC Carrier Profile', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '15', name: 'COPR Profile', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '16', name: 'EIN Document', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: '17', name: 'GST/HST Registration', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: '18', name: 'PST/QST Registration', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: '19', name: 'State Tax ID', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: '20', name: 'WSIB/WCB Clearance', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: '21', name: 'Workers Comp Policy', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: '22', name: 'SCAC Assignment', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '23', name: 'CBSA Carrier Code', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '24', name: 'ACE/SCAC Document', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '25', name: 'BOC-3 Filing', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '26', name: 'Surety Bond', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '27', name: 'IRP Account', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '28', name: 'UCR Registration', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '29', name: 'HVUT 2290 Schedule 1', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '30', name: 'State Operating Permit', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '31', name: 'KYU License', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '32', name: 'NM Weight Permit', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '33', name: 'NY HUT Certificate', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '34', name: 'Hazmat Permit', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '35', name: 'FAST/C-TPAT Cert', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: '36', name: 'Drug Consortium', relatedTo: 'driver', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'driver_app', folderName: 'Driver Application' } },
    { id: '37', name: 'CVSA Inspection', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '38', name: 'IFTA Decal Copy', relatedTo: 'asset', expiryRequired: true, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: '39', name: 'Transponder Doc', relatedTo: 'asset', expiryRequired: true, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    
    // Expense Related Documents
    { id: 'fuel_receipt', name: 'Fuel Receipt', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'repair_invoice', name: 'Repair Invoice', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'toll_receipt', name: 'Toll Receipt', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'parking_receipt', name: 'Parking Receipt', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'lumper_receipt', name: 'Lumper Receipt', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: 'cleaning_receipt', name: 'Cleaning Receipt', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'lease_payment_statement', name: 'Lease Payment Statement', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'insurance_premium_invoice', name: 'Insurance Premium Invoice', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: 'vehicle_registration', name: 'Vehicle Registration', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { root: 'Asset' } },
    { id: 'permit_document', name: 'Permit Document', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: 'ifta_return', name: 'IFTA Return', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_ifta', folderName: 'IFTA' } },
    { id: 'irp_receipt', name: 'IRP Receipt', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: 'ucr_receipt', name: 'UCR Receipt', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_auth', folderName: 'Authorities and Permits' } },
    { id: 'payroll_statement', name: 'Payroll Statement', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'driver_ev', folderName: 'Employment Verification' } },
    { id: 'travel_receipt', name: 'Travel Receipt', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'driver_app', folderName: 'Driver Application' } },
    { id: 'software_invoice', name: 'Software Invoice', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: 'marketing_invoice', name: 'Marketing Invoice', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    { id: 'professional_services_invoice', name: 'Professional Services Invoice', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required', destination: { mode: 'folder', folderId: 'carrier_company_docs', folderName: 'Company Documents' } },
    
    // Tickets / Offenses
    { id: 'offense_ticket', name: 'Offense Ticket', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'optional', destination: { mode: 'folder', folderId: 'driver_tickets', folderName: 'Tickets / Offenses' } },
    { id: 'payment_receipt', name: 'Payment Receipt', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'optional', destination: { mode: 'folder', folderId: 'driver_tickets', folderName: 'Tickets / Offenses' } },
    { id: 'notice_of_trial', name: 'Notice of Trial', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'optional', destination: { mode: 'folder', folderId: 'driver_tickets', folderName: 'Tickets / Offenses' } },
];

export const MOCK_FOLDER_TREE: FolderNode = {
    id: "root_company",
    name: "Acme Trucking Inc.",
    type: 'root',
    metaLine: "Root • 12 Subfolders",
    counts: { subfolders: 12, files: 328 },
    children: [
        {
            id: "carrier_root",
            name: "Carrier Name",
            type: 'folder',
            metaLine: "Public to Safety Dept",
            parentId: "root_company",
            counts: { subfolders: 8, files: 245 },
            children: [
                { id: "carrier_company_docs", name: "Company Documents", type: 'folder', parentId: "carrier_root", counts: { files: 6 } },
                { id: "carrier_auth", name: "Authorities and Permits", type: 'folder', parentId: "carrier_root", counts: { files: 1 } },
                {
                    id: "carrier_ifta",
                    name: "IFTA",
                    type: 'folder',
                    parentId: "carrier_root",
                    counts: { subfolders: 1, files: 1 },
                    children: [
                        {
                            id: "carrier_ifta_year",
                            name: "IFTA Year",
                            type: 'folder',
                            parentId: "carrier_ifta",
                            counts: { subfolders: 4, files: 4 },
                            children: [
                                { id: "carrier_ifta_q1", name: "Q1", type: 'folder', parentId: "carrier_ifta_year", counts: { files: 8 } },
                                { id: "carrier_ifta_q2", name: "Q2", type: 'folder', parentId: "carrier_ifta_year", counts: { files: 7 } },
                                { id: "carrier_ifta_q3", name: "Q3", type: 'folder', parentId: "carrier_ifta_year", counts: { files: 3 } },
                                { id: "carrier_ifta_q4", name: "Q4", type: 'folder', parentId: "carrier_ifta_year", counts: { files: 9 } },
                            ],
                        },
                    ],
                },
                {
                    id: "carrier_policies",
                    name: "Policies and Procedures",
                    type: 'folder',
                    parentId: "carrier_root",
                    counts: { subfolders: 5, files: 9 },
                    children: [
                        { id: "carrier_contracts", name: "Contract Agreements", type: 'folder', parentId: "carrier_policies", counts: { files: 4 } },
                        { id: "carrier_manuals", name: "Driver Manuals", type: 'folder', parentId: "carrier_policies", counts: { files: 2 } },
                        { id: "carrier_drug", name: "Drug and Alcohol Policy", type: 'folder', parentId: "carrier_policies", counts: { files: 6 } },
                        { id: "carrier_pm", name: "Preventive Maintenance Policy", type: 'folder', parentId: "carrier_policies", counts: { files: 0 } },
                        { id: "carrier_vm", name: "Vehicle Maintenance Policy", type: 'folder', parentId: "carrier_policies", counts: { files: 5 } },
                    ],
                },
                {
                    id: "carrier_safety",
                    name: "Safety Rating",
                    type: 'folder',
                    parentId: "carrier_root",
                    counts: { subfolders: 1, files: 1 },
                    children: [{ id: "carrier_safety_year", name: "Year", type: 'folder', parentId: "carrier_safety", counts: { files: 7 } }],
                },
            ],
        },
        {
            id: "driver_root",
            name: "Driver Name",
            type: 'folder',
            parentId: "root_company",
            counts: { subfolders: 12, files: 120 },
            children: [
                { id: "driver_app", name: "Driver Application", type: 'folder', parentId: "driver_root", counts: { files: 5 } },
                { id: "driver_ev", name: "Employment Verification", type: 'folder', parentId: "driver_root", counts: { files: 1 } },
                { id: "driver_bc", name: "Background Check", type: 'folder', parentId: "driver_root", counts: { files: 2 } },
                { id: "driver_abs", name: "Driver Abstract", type: 'folder', parentId: "driver_root", counts: { files: 5 } },
                { id: "driver_cdls", name: "CDLS Records", type: 'folder', parentId: "driver_root", counts: { files: 5 } },
                { id: "driver_acc", name: "Accidents", type: 'folder', parentId: "driver_root", counts: { files: 8 } },
                { id: "driver_insp", name: "Inspections", type: 'folder', parentId: "driver_root", counts: { files: 0 } },
                { id: 'driver_tickets', name: "Tickets / Offenses", type: 'folder', parentId: "driver_root", counts: { files: 1 } },
                { id: "driver_review", name: "Annual Review", type: 'folder', parentId: "driver_root", counts: { files: 2 } },
                { id: "driver_ppd", name: "Procedure and Policy Documents", type: 'folder', parentId: "driver_root", counts: { files: 3 } },
                { id: "driver_warn", name: "Warning Letters", type: 'folder', parentId: "driver_root", counts: { files: 1 } },
                { id: "driver_train", name: "Training Certificates", type: 'folder', parentId: "driver_root", counts: { files: 4 } },
            ],
        },
        {
            id: "assets_root",
            name: "Assets",
            type: 'folder',
            parentId: "root_company",
            counts: { subfolders: 2, files: 0 },
            children: [
                {
                    id: "assets_trucks",
                    name: "Trucks",
                    type: 'folder',
                    parentId: "assets_root",
                    counts: { subfolders: 1 },
                    children: [{ id: "assets_trucks_unit", name: "Unit#", type: 'folder', parentId: "assets_trucks", counts: { files: 0 } }],
                },
                {
                    id: "assets_noncmv",
                    name: "Non-CMV",
                    type: 'folder',
                    parentId: "assets_root",
                    counts: { subfolders: 1 },
                    children: [{ id: "assets_noncmv_unit", name: "Unit#", type: 'folder', parentId: "assets_noncmv", counts: { files: 0 } }],
                },
            ],
        },
    ],
};
