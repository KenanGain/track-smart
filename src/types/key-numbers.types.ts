export type Category =
    | "Regulatory and Safety Numbers"
    | "Tax and Business Identification Numbers"
    | "Carrier & Industry Codes"
    | "Bond and Registration Numbers"
    | "Other";

export type EntityType = "Carrier" | "Asset" | "Driver";

export interface MasterNumberType {
    id: string;
    name: string;
    description: string;
    defaultCategory: Category;
}

export interface KeyNumberConfig {
    id: string;
    numberTypeId: string; // References MasterNumberType
    numberTypeName: string;
    numberTypeDescription: string;
    description: string;
    category: Category;
    entityType: EntityType;
    numberRequired?: boolean; // defaults to true if not specified
    hasExpiry: boolean;
    issueDateRequired?: boolean;
    issueStateRequired?: boolean;
    issueCountryRequired?: boolean;
    documentRequired?: boolean;
    requiredDocumentTypeId?: string;
    status: "Active" | "Inactive";
    isSystem?: boolean;
    // Monitoring & Notifications
    monitoringEnabled?: boolean;
    monitorBasedOn?: 'expiry' | 'issue_date';
    renewalRecurrence?: string;
    reminderDays?: Record<number, boolean>;
    notificationChannels?: {
        email: boolean;
        inApp: boolean;
        sms: boolean;
    };
}

export interface AddNumberFormData {
    category: Category;
    entityType: "Carrier" | "Asset" | "Driver";
    numberTypeName: string;
    description: string;
    numberRequired: boolean;
    hasExpiry: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
    documentRequired: boolean;
    requiredDocumentTypeId?: string;
    status: "Active" | "Inactive";
    // Monitoring
    monitoringEnabled: boolean;
    monitorBasedOn: 'expiry' | 'issue_date';
    renewalRecurrence:  'annually' | 'biannually' | 'quarterly' | 'monthly' | 'none';
    reminderDays: Record<number, boolean>;
    notificationChannels: {
        email: boolean;
        inApp: boolean;
        sms: boolean;
    };
}

// Stores an uploaded document associated with a key number
export interface UploadedDocument {
    id: string;
    fileName: string;
    fileSize?: number;              // File size in bytes
    uploadedAt: string;
    expiryDate?: string;            // Can differ from key number expiry
    issueDate?: string;
    selectedTags?: Record<string, string[]>;  // sectionId -> array of tagIds
    notes?: string;
}

// Stores the actual entered values for a key number in the dashboard
export interface KeyNumberValue {
    keyNumberConfigId?: string;     // Reference to KeyNumberConfig
    value: string;
    expiryDate?: string;
    issueDate?: string;
    issuingState?: string;
    issuingCountry?: string;
    tags?: string[];                // Union of selected tags (tag IDs)
    documents?: UploadedDocument[];
}
