export type Status = 'Active' | 'Draft' | 'Inactive';
export type RelatedTo = 'carrier' | 'asset' | 'driver';

export const MOCK_DRIVERS = [
    { id: 'd1', name: 'John Doe', license: 'CDL-A-12345' },
    { id: 'd2', name: 'Jane Smith', license: 'CDL-A-67890' },
    { id: 'd3', name: 'Robert Johnson', license: 'CDL-B-11223' },
    { id: 'd4', name: 'Emily Davis', license: 'CDL-A-44556' },
];

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
    { id: '1', name: 'CVOR Level 2', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '2', name: 'Safety Fitness Certificate', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '3', name: 'Liability Insurance', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '4', name: 'Operating Authority', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Draft', selectedTags: {}, requirementLevel: 'optional' },
    { id: '5', name: 'IFTA License', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    // Asset Docs
    { id: '6', name: 'Vehicle Registration', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '7', name: 'Annual Safety Inspection', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '8', name: 'Lease Agreement', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Draft', selectedTags: {}, requirementLevel: 'required' },
    // Driver Docs
    { id: '9', name: 'Driver License', relatedTo: 'driver', expiryRequired: true, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '10', name: 'Medical Examiner Certificate', relatedTo: 'driver', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '11', name: 'Training Certificate', relatedTo: 'driver', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'optional' },
    { id: '12', name: 'USDOT Number', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '13', name: 'MX Number', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '14', name: 'NSC Carrier Profile', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '15', name: 'COPR Profile', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '16', name: 'EIN Document', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '17', name: 'GST/HST Registration', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '18', name: 'PST/QST Registration', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '19', name: 'State Tax ID', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '20', name: 'WSIB/WCB Clearance', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '21', name: 'Workers Comp Policy', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '22', name: 'SCAC Assignment', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '23', name: 'CBSA Carrier Code', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '24', name: 'ACE/SCAC Document', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '25', name: 'BOC-3 Filing', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '26', name: 'Surety Bond', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '27', name: 'IRP Account', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '28', name: 'UCR Registration', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '29', name: 'HVUT 2290 Schedule 1', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '30', name: 'State Operating Permit', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '31', name: 'KYU License', relatedTo: 'carrier', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '32', name: 'NM Weight Permit', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '33', name: 'NY HUT Certificate', relatedTo: 'asset', expiryRequired: false, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '34', name: 'Hazmat Permit', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '35', name: 'FAST/C-TPAT Cert', relatedTo: 'carrier', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '36', name: 'Drug Consortium', relatedTo: 'driver', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '37', name: 'CVSA Inspection', relatedTo: 'asset', expiryRequired: true, issueDateRequired: true, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '38', name: 'IFTA Decal Copy', relatedTo: 'asset', expiryRequired: true, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
    { id: '39', name: 'Transponder Doc', relatedTo: 'asset', expiryRequired: true, issueDateRequired: false, status: 'Active', selectedTags: {}, requirementLevel: 'required' },
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
                { id: "driver_tickets", name: "Tickets", type: 'folder', parentId: "driver_root", counts: { files: 1 } },
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
