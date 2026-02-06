
export type ExpenseCategory = "Operational" | "Compliance" | "Recurring" | "Other";
export type ExpenseFrequency = "Monthly" | "Annual";

export interface ExpenseType {
    id: string;
    name: string;
    category: ExpenseCategory;
    isRecurringAllowed: boolean;
    defaultFrequency?: ExpenseFrequency;
    requiresDocument: boolean;
    isSystem: boolean; // true for "Maintenance" type, prevents deletion
    description?: string;
}

export interface AssetExpense {
    id: string;
    assetId: string;
    expenseTypeId: string;
    amount: number;
    currency: 'USD' | 'CAD';
    date: string;
    isRecurring: boolean;
    frequency?: ExpenseFrequency;
    recurrenceStartDate?: string;
    recurrenceEndDate?: string;
    documentUrl?: string; // Mock URL if document attached
    source: 'manual' | 'maintenance' | 'system';
    referenceId?: string; // e.g., Work Order ID
    notes?: string;
}

// --- Seed Data ---

export const INITIAL_EXPENSE_TYPES: ExpenseType[] = [
    {
        id: "exp_maint",
        name: "Maintenance",
        category: "Operational",
        isRecurringAllowed: false,
        requiresDocument: false,
        isSystem: true,
        description: "Automatically generated from Work Orders."
    },
    {
        id: "exp_fuel",
        name: "Fuel",
        category: "Operational",
        isRecurringAllowed: false,
        requiresDocument: true, // Receipts usually required
        isSystem: false,
        description: "Fuel purchases and additives."
    },
    {
        id: "exp_ins",
        name: "Insurance",
        category: "Recurring",
        isRecurringAllowed: true,
        defaultFrequency: "Monthly",
        requiresDocument: true,
        isSystem: false,
        description: "Vehicle insurance premiums."
    },
    {
        id: "exp_reg",
        name: "Registration",
        category: "Compliance",
        isRecurringAllowed: true,
        defaultFrequency: "Annual",
        requiresDocument: true,
        isSystem: false,
        description: "Annual vehicle registration fees."
    },
    {
        id: "exp_toll",
        name: "Tolls & Parking",
        category: "Operational",
        isRecurringAllowed: false,
        requiresDocument: false,
        isSystem: false,
        description: "Road tolls, bridges, and parking fees."
    }
];

export const INITIAL_ASSET_EXPENSES: AssetExpense[] = [
    {
        id: "ae_001",
        assetId: "veh_001",
        expenseTypeId: "exp_ins",
        amount: 350.00,
        currency: "USD",
        date: "2026-02-01",
        isRecurring: true,
        frequency: "Monthly",
        source: "manual",
        notes: "Monthly Premium"
    },
    {
        id: "ae_002",
        assetId: "veh_001",
        expenseTypeId: "exp_fuel",
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
        expenseTypeId: "exp_reg",
        amount: 1200.00,
        currency: "CAD",
        date: "2025-06-15",
        isRecurring: true,
        frequency: "Annual",
        recurrenceStartDate: "2025-06-15",
        recurrenceEndDate: "2030-06-15",
        source: "manual",
        notes: "Annual Registration Renewal"
    },
    {
        id: "ae_demo_2",
        assetId: "veh_001",
        expenseTypeId: "exp_toll",
        amount: 45.25,
        currency: "USD",
        date: "2026-01-25",
        isRecurring: false,
        source: "manual",
        notes: "Bridge Toll - NY Trip"
    }
];
