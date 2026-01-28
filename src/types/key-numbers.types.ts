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
    category: Category;
    entityType: EntityType;
    hasExpiry: boolean;
    documentRequired: boolean;
    requiredDocumentTypeId?: string;
    status: "Active" | "Inactive";
}

export interface AddNumberFormData {
    numberTypeName: string;
    category: Category;
    entityType: EntityType;
    hasExpiry: boolean;
    documentRequired: boolean;
    requiredDocumentTypeId?: string;
    status: "Active" | "Inactive";
}

// Stores the actual entered values for a key number in the dashboard
export interface KeyNumberValue {
    value: string;
    expiryDate?: string;
    documentFileName?: string; // Stores the name of uploaded document (PDF/DOCX)
}
