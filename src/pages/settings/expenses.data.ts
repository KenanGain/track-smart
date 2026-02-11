
export type ExpenseCategory = "variable" | "fixed";
export type ExpenseSubCategory = "operational" | "compliance" | "recurring" | "other";
export type ExpenseEntityType = "Carrier" | "Asset" | "Driver";
export type ExpenseFrequency = "monthly" | "annually" | "quarterly" | "weekly";

export interface ExpenseType {
    id: string;
    name: string;
    entityType: ExpenseEntityType;
    category: ExpenseCategory;
    subCategory: ExpenseSubCategory;
    isRecurring: boolean;
    frequency: ExpenseFrequency | null;
    dateRequired: boolean;
    description: string;
    documentRequired: boolean;
    documentTypeId: string | null;
}

export interface AssetExpense {
    id: string;
    assetId: string;
    expenseTypeId: string; // References ExpenseType.id
    amount: number;
    currency: 'USD' | 'CAD';
    date: string;
    isRecurring: boolean;
    frequency?: ExpenseFrequency;
    recurrenceStartDate?: string;
    recurrenceEndDate?: string;
    documentUrl?: string;
    source: 'manual' | 'maintenance' | 'system';
    referenceId?: string;
    notes?: string;
}

// --- Seed Data ---

export const INITIAL_EXPENSE_TYPES: ExpenseType[] = [
    {
      "id": "fuel",
      "name": "Fuel",
      "entityType": "Asset",
      "category": "variable",
      "subCategory": "operational",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Fuel purchases including diesel, gas, and DEF additives.",
      "documentRequired": true,
      "documentTypeId": "fuel_receipt"
    },
    {
      "id": "maintenance_repairs",
      "name": "Maintenance & Repairs",
      "entityType": "Asset",
      "category": "variable",
      "subCategory": "operational",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Tires, oil changes, breakdown repairs, parts and labor costs.",
      "documentRequired": true,
      "documentTypeId": "repair_invoice"
    },
    {
      "id": "tolls",
      "name": "Tolls",
      "entityType": "Asset",
      "category": "variable",
      "subCategory": "operational",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Road tolls and bridge fees.",
      "documentRequired": true,
      "documentTypeId": "toll_receipt"
    },
    {
      "id": "parking",
      "name": "Parking",
      "entityType": "Asset",
      "category": "variable",
      "subCategory": "operational",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Truck stop, terminal, and paid parking fees.",
      "documentRequired": true,
      "documentTypeId": "parking_receipt"
    },
    {
      "id": "loading_unloading",
      "name": "Loading & Unloading Fees",
      "entityType": "Carrier",
      "category": "variable",
      "subCategory": "other",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Lumper fees, dock fees, and cargo handling charges.",
      "documentRequired": true,
      "documentTypeId": "lumper_receipt"
    },
    {
      "id": "cleaning",
      "name": "Vehicle Cleaning",
      "entityType": "Asset",
      "category": "variable",
      "subCategory": "other",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Truck wash, trailer wash, and other vehicle cleaning services.",
      "documentRequired": true,
      "documentTypeId": "cleaning_receipt"
    },
    {
      "id": "lease_payments",
      "name": "Depreciation / Lease Payments",
      "entityType": "Asset",
      "category": "fixed",
      "subCategory": "recurring",
      "isRecurring": true,
      "frequency": "monthly",
      "dateRequired": true,
      "description": "Lease or finance payments for trucks and trailers.",
      "documentRequired": true,
      "documentTypeId": "lease_payment_statement"
    },
    {
      "id": "insurance",
      "name": "Insurance",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "recurring",
      "isRecurring": true,
      "frequency": "monthly",
      "dateRequired": true,
      "description": "Liability, cargo, and workers compensation insurance premiums.",
      "documentRequired": true,
      "documentTypeId": "insurance_premium_invoice"
    },
    {
      "id": "vehicle_registration",
      "name": "Vehicle Registration",
      "entityType": "Asset",
      "category": "fixed",
      "subCategory": "compliance",
      "isRecurring": true,
      "frequency": "annually",
      "dateRequired": true,
      "description": "Annual vehicle registration renewal fees.",
      "documentRequired": true,
      "documentTypeId": "vehicle_registration"
    },
    {
      "id": "permits",
      "name": "Permits",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "compliance",
      "isRecurring": true,
      "frequency": "annually",
      "dateRequired": true,
      "description": "Operating permits and regulatory permits.",
      "documentRequired": true,
      "documentTypeId": "permit_document"
    },
    {
      "id": "ifta",
      "name": "IFTA",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "compliance",
      "isRecurring": true,
      "frequency": "quarterly",
      "dateRequired": true,
      "description": "IFTA filings and fuel tax reporting expenses.",
      "documentRequired": true,
      "documentTypeId": "ifta_return"
    },
    {
      "id": "irp",
      "name": "IRP",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "compliance",
      "isRecurring": true,
      "frequency": "annually",
      "dateRequired": true,
      "description": "IRP renewals and apportioned registration fees.",
      "documentRequired": true,
      "documentTypeId": "irp_receipt"
    },
    {
      "id": "ucr",
      "name": "UCR",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "compliance",
      "isRecurring": true,
      "frequency": "annually",
      "dateRequired": true,
      "description": "Unified Carrier Registration (UCR) compliance costs.",
      "documentRequired": true,
      "documentTypeId": "ucr_receipt"
    },
    {
      "id": "driver_payroll",
      "name": "Driver Payroll",
      "entityType": "Driver",
      "category": "fixed",
      "subCategory": "recurring",
      "isRecurring": true,
      "frequency": "weekly",
      "dateRequired": true,
      "description": "Driver wages and payroll records.",
      "documentRequired": true,
      "documentTypeId": "payroll_statement"
    },
    {
      "id": "driver_travel",
      "name": "Driver Travel Expenses",
      "entityType": "Driver",
      "category": "variable",
      "subCategory": "operational",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Meals, lodging, and per diem on the road.",
      "documentRequired": true,
      "documentTypeId": "travel_receipt"
    },
    {
      "id": "office_expenses",
      "name": "Office Expenses",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "recurring",
      "isRecurring": true,
      "frequency": "monthly",
      "dateRequired": true,
      "description": "Terminal/office rent, dispatch office, software licenses, telematics/GPS fees.",
      "documentRequired": true,
      "documentTypeId": "software_invoice"
    },
    {
      "id": "sales_marketing",
      "name": "Sales & Marketing",
      "entityType": "Carrier",
      "category": "variable",
      "subCategory": "other",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Advertising and sales-related expenses.",
      "documentRequired": true,
      "documentTypeId": "marketing_invoice"
    },
    {
      "id": "legal_professional_fees",
      "name": "Legal & Professional Fees",
      "entityType": "Carrier",
      "category": "fixed",
      "subCategory": "compliance",
      "isRecurring": false,
      "frequency": null,
      "dateRequired": true,
      "description": "Accounting, legal services, audits, and compliance support.",
      "documentRequired": true,
      "documentTypeId": "professional_services_invoice"
    }
];

export const INITIAL_ASSET_EXPENSES: AssetExpense[] = [
    {
        id: "ae_001",
        assetId: "veh_001",
        expenseTypeId: "maintenance_repairs",
        amount: 350.00,
        currency: "USD",
        date: "2026-02-01",
        isRecurring: true,
        frequency: "monthly",
        source: "manual",
        notes: "Monthly Maintenance Program"
    },
    {
        id: "ae_002",
        assetId: "veh_001",
        expenseTypeId: "fuel",
        amount: 85.50,
        currency: "USD",
        date: "2026-02-03",
        isRecurring: false,
        source: "manual",
        documentUrl: "receipt_fuel_123.pdf",
        notes: "Pilot Flying J"
    },
    {
        id: "ae_demo_1",
        assetId: "veh_001",
        expenseTypeId: "vehicle_registration",
        amount: 1200.00,
        currency: "CAD",
        date: "2025-06-15",
        isRecurring: true,
        frequency: "annually",
        recurrenceStartDate: "2025-06-15",
        recurrenceEndDate: "2030-06-15",
        source: "manual",
        notes: "Annual Registration Renewal"
    },
    {
        id: "ae_demo_2",
        assetId: "veh_001",
        expenseTypeId: "tolls",
        amount: 45.25,
        currency: "USD",
        date: "2026-01-25",
        isRecurring: false,
        source: "manual",
        notes: "Bridge Toll - NY Trip"
    }
];
