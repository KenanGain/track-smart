
// --- Types & Interfaces ---

export type ServiceCategory = "cmv_only" | "non_cmv_only" | "both_cmv_and_non_cmv";

export type ServiceGroup = "Engine" | "Tires & Brakes" | "Inspections" | "General";

export type ServiceType = {
    id: string;
    name: string;
    category: ServiceCategory;
    group: ServiceGroup;
    description?: string;
    complexity?: "Basic" | "Moderate" | "Extensive";
};

export type FrequencyUnit = "miles" | "days" | "engine_hours";

export type MaintenanceTaskStatus = "upcoming" | "due" | "overdue" | "in_progress" | "completed" | "cancelled";

export type MaintenanceTask = {
    id: string;
    assetId: string;
    scheduleId: string;
    serviceTypeIds: string[];
    status: MaintenanceTaskStatus;
    meterSnapshot: {
        odometer: number;
        engineHours: number;
        capturedAt: string;
    };
    dueRule: {
        unit: FrequencyUnit;
        frequencyEvery: number;
        upcomingThreshold: number;
        dueAtOdometer?: number;
        dueAtEngineHours?: number;
        dueAtDate?: string;
    };
    cancelDetails?: {
        reason: string;
        cancelledAt: string;
        cancelledBy: string;
    };
    createdAt: string;
    batchId?: string; // Links tasks created together
};

// New types for Granular Completion
export type AssetCostBreakdown = {
    assetId: string;
    finalOdometer?: number;
    finalEngineHours?: number;
    costs: {
        partsAndSupplies: number;
        labour: number;
        tax: number;
        totalPaid: number;
    };
    remarks?: string;
}

export type OrderCompletionEvent = {
    id: string;
    completedAt: string;
    invoiceNumber?: string;
    invoiceDate: string;
    currency: "CAD" | "USD";
    taskIds: string[]; // Tasks completed in this event
    assetBreakdowns: AssetCostBreakdown[]; // Individual cost breakdown per asset
};

export type TaskOrder = {
    id: string;
    taskIds: string[];
    vendorId: string;
    customVendor?: {
        name: string;
        email: string;
        phone: string;
    };
    status: "open" | "completed" | "cancelled";
    createdAt: string;
    dueDate?: string;
    meta?: {
        odometerRequired: boolean;
        odometer?: number;
        odometerUnit: 'miles' | 'km';
        engineHoursRequired: boolean;
        engineHours?: number;
    }
    notes?: string;
    completions: OrderCompletionEvent[];
    batchId?: string; // Links orders created together
};

// --- Seed Data ---

export const INITIAL_SERVICE_TYPES: ServiceType[] = [
    { id: "oil_filter", name: "Oil & Filter Change", category: "both_cmv_and_non_cmv", group: "Engine" },
    { id: "tire_rotation", name: "Tire Rotation", category: "both_cmv_and_non_cmv", group: "Tires & Brakes" },
    { id: "brake_inspection", name: "Brake Inspection", category: "cmv_only", group: "Tires & Brakes" },
    { id: "annual_inspection", name: "Annual Inspection", category: "cmv_only", group: "Inspections" },
    { id: "wiper_fluid", name: "Wiper Fluid Top-up", category: "non_cmv_only", group: "General" },
    { id: "reefer_service", name: "Reefer Unit Service", category: "non_cmv_only", group: "Engine" },
    { id: "grease_fifth_wheel", name: "Grease Fifth Wheel", category: "cmv_only", group: "General" },
    
    // --- New Types ---
    { 
        id: "insp_safety_annual", 
        name: "Annual Vehicle Safety Inspection", 
        category: "non_cmv_only", 
        group: "Inspections", 
        description: "Perform an annual safety inspection to verify the vehicle is roadworthy and meets local safety regulations.",
        complexity: "Basic"
    },
    { 
        id: "insp_safety_interior", 
        name: "Interior Safety Inspection", 
        category: "non_cmv_only", 
        group: "Inspections", 
        description: "Inspect seats, seat belts, dashboard indicators, mirrors, and interior controls for safe operation.",
        complexity: "Basic"
    },
    { 
        id: "serv_brake_annual", 
        name: "Annual Brake System Inspection", 
        category: "non_cmv_only", 
        group: "Tires & Brakes", 
        description: "Inspect brake pads, rotors, calipers, and brake fluid condition during the annual service interval.",
        complexity: "Moderate"
    },
    { 
        id: "serv_elec_annual", 
        name: "Annual Electrical System Inspection", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Inspect vehicle wiring, battery condition, fuses, sensors, and warning systems for proper operation.",
        complexity: "Moderate"
    },
    { 
        id: "serv_suspension_annual", 
        name: "Annual Suspension and Steering Inspection", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Inspect suspension components, steering linkage, bushings, and alignment for wear or damage.",
        complexity: "Extensive"
    },
    { 
        id: "insp_body_corrosion", 
        name: "Body and Corrosion Inspection", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Inspect vehicle body panels, underbody, and frame areas for corrosion, damage, or previous repairs.",
        complexity: "Extensive"
    },
    { 
        id: "doc_verification", 
        name: "Documentation Verification", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Verify vehicle registration, insurance, inspection records, and warranty documents are current.",
        complexity: "Basic"
    },
    { 
        id: "insp_post_repair", 
        name: "Post-Repair Quality Inspection", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Inspect vehicle after maintenance or repair work to ensure all items were completed correctly.",
        complexity: "Basic"
    },
    { 
        id: "serv_seasonal_prep", 
        name: "Seasonal Vehicle Preparation", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Prepare vehicle for seasonal conditions such as winter readiness or summer heat operation.",
        complexity: "Moderate"
    },
    { 
        id: "insp_interior_sanitation", 
        name: "Interior Sanitation Inspection", 
        category: "non_cmv_only", 
        group: "General", 
        description: "Inspect interior cleanliness and hygiene standards for passenger or company vehicle use.",
        complexity: "Basic"
    }
];

export const INITIAL_TASKS: MaintenanceTask[] = [
    // --- UPCOMING ---
    {
        id: "task_1",
        assetId: "veh_001",
        scheduleId: "sch_1",
        serviceTypeIds: ["oil_filter", "brake_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 45231, engineHours: 8120, capturedAt: "2026-01-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 10000, upcomingThreshold: 3000, dueAtOdometer: 50000 },
        createdAt: "2026-01-30T10:00:00Z"
    },
    {
        id: "task_4",
        assetId: "veh_004",
        scheduleId: "sch_4",
        serviceTypeIds: ["annual_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 12000, engineHours: 500, capturedAt: "2026-01-25T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2026-02-15T10:00:00Z" },
        createdAt: "2025-02-15T10:00:00Z"
    },
    {
        id: "task_5",
        assetId: "veh_005",
        scheduleId: "sch_5",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "upcoming",
        meterSnapshot: { odometer: 298000, engineHours: 18000, capturedAt: "2026-01-28T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 1000, dueAtOdometer: 300000 },
        createdAt: "2026-01-10T10:00:00Z"
    },
    // Mock Data for Demo
    {
        id: "task_demo_1",
        assetId: "veh_001",
        scheduleId: "sch_demo_1",
        serviceTypeIds: ["wiper_fluid"],
        status: "upcoming",
        meterSnapshot: { odometer: 45300, engineHours: 8125, capturedAt: "2026-02-05T08:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 30, upcomingThreshold: 7, dueAtDate: "2026-02-15T00:00:00Z" },
        createdAt: "2026-01-15T00:00:00Z"
    },

    // --- DUE ---
    {
        id: "task_2",
        assetId: "veh_001",
        scheduleId: "sch_2",
        serviceTypeIds: ["tire_rotation"],
        status: "due",
        meterSnapshot: { odometer: 45200, engineHours: 8110, capturedAt: "2026-01-20T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 1000, dueAtOdometer: 46000 },
        createdAt: "2026-01-15T10:00:00Z"
    },
    {
        id: "task_6",
        assetId: "veh_006",
        scheduleId: "sch_6",
        serviceTypeIds: ["reefer_service"],
        status: "due",
        meterSnapshot: { odometer: 65000, engineHours: 4200, capturedAt: "2026-01-29T10:00:00Z" },
        dueRule: { unit: "engine_hours", frequencyEvery: 1000, upcomingThreshold: 100, dueAtEngineHours: 4250 },
        createdAt: "2025-08-15T10:00:00Z"
    },
    // Mock Data for Demo
    {
        id: "task_demo_2",
        assetId: "veh_001",
        scheduleId: "sch_demo_2",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "due",
        meterSnapshot: { odometer: 45400, engineHours: 8130, capturedAt: "2026-02-05T09:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 500, dueAtOdometer: 45500 },
        createdAt: "2026-01-01T00:00:00Z"
    },

    // --- OVERDUE ---
    {
        id: "task_3",
        assetId: "veh_003",
        scheduleId: "sch_1",
        serviceTypeIds: ["oil_filter"],
        status: "overdue",
        meterSnapshot: { odometer: 152400, engineHours: 12500, capturedAt: "2026-01-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 2000, dueAtOdometer: 152000 },
        createdAt: "2025-10-01T10:00:00Z"
    },
    {
        id: "task_7",
        assetId: "veh_002",
        scheduleId: "sch_7",
        serviceTypeIds: ["annual_inspection"],
        status: "overdue",
        meterSnapshot: { odometer: 89210, engineHours: 2100, capturedAt: "2026-01-15T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2026-01-10T10:00:00Z" },
        createdAt: "2025-01-10T10:00:00Z"
    },

    // --- CANCELLED ---
    {
        id: "task_8",
        assetId: "veh_005",
        scheduleId: "sch_8",
        serviceTypeIds: ["wiper_fluid"],
        status: "cancelled",
        meterSnapshot: { odometer: 290000, engineHours: 17500, capturedAt: "2025-12-20T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 30, upcomingThreshold: 5, dueAtDate: "2026-01-01T10:00:00Z" },
        cancelDetails: { reason: "Driver performed top-up manually on road.", cancelledAt: "2025-12-28T14:00:00Z", cancelledBy: "Safety Manager" },
        createdAt: "2025-12-01T10:00:00Z"
    },

    // --- COMPLETED ---
    {
        id: "task_9",
        assetId: "veh_003",
        scheduleId: "sch_2",
        serviceTypeIds: ["tire_rotation"],
        status: "completed",
        meterSnapshot: { odometer: 145000, engineHours: 12000, capturedAt: "2025-11-15T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 1000, dueAtOdometer: 146000 },
        createdAt: "2025-11-01T10:00:00Z"
    },
    // --- SAMPLE BULK SCHEDULED TASKS ---
    {
        id: "task_bulk_1",
        assetId: "veh_001",
        scheduleId: "sch_bulk_1",
        batchId: "batch_sample_1",
        serviceTypeIds: ["oil_filter"],
        status: "upcoming",
        meterSnapshot: { odometer: 45231, engineHours: 8120, capturedAt: "2026-02-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 3000, dueAtOdometer: 60000 },
        createdAt: "2026-02-01T10:00:00Z"
    },
    {
        id: "task_bulk_2",
        assetId: "veh_003",
        scheduleId: "sch_bulk_1",
        batchId: "batch_sample_1",
        serviceTypeIds: ["oil_filter"],
        status: "upcoming",
        meterSnapshot: { odometer: 152400, engineHours: 12500, capturedAt: "2026-02-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 3000, dueAtOdometer: 167000 },
        createdAt: "2026-02-01T10:00:00Z"
    },
    {
        id: "task_bulk_3",
        assetId: "veh_005",
        scheduleId: "sch_bulk_1",
        batchId: "batch_sample_1",
        serviceTypeIds: ["oil_filter"],
        status: "upcoming",
        meterSnapshot: { odometer: 298000, engineHours: 18000, capturedAt: "2026-02-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 3000, dueAtOdometer: 313000 },
        createdAt: "2026-02-01T10:00:00Z"
    }
];

export const INITIAL_ORDERS: TaskOrder[] = [
    {
        id: "wo_001",
        taskIds: ["task_2", "task_3"],
        vendorId: "ven_1",
        status: "open",
        createdAt: "2026-01-28T10:00:00Z",
        dueDate: "2026-02-05T10:00:00Z",
        completions: []
    },
    // Mock Open Order for veh_001
    {
        id: "wo_demo_1",
        taskIds: ["task_demo_2"],
        vendorId: "ven_2",
        status: "open",
        createdAt: "2026-02-04T11:00:00Z",
        dueDate: "2026-02-11T10:00:00Z",
        completions: []
    },
    {
        id: "wo_002",
        taskIds: ["task_6"],
        vendorId: "ven_2",
        status: "open",
        createdAt: "2026-01-29T14:30:00Z",
        dueDate: "2026-02-10T10:00:00Z",
        completions: []
    },
    {
        id: "wo_003",
        taskIds: ["task_9"],
        vendorId: "ven_3",
        status: "completed",
        createdAt: "2025-11-10T10:00:00Z",
        dueDate: "2025-11-20T10:00:00Z",
        completions: [{
            id: "comp_001",
            completedAt: "2025-11-18T09:00:00Z",
            invoiceNumber: "INV-2025-1234",
            invoiceDate: "2025-11-18",
            currency: "USD",
            taskIds: ["task_9"],
            assetBreakdowns: [{
                assetId: "veh_003",
                finalOdometer: 145500,
                finalEngineHours: 12050,
                costs: { partsAndSupplies: 150, labour: 75, tax: 18, totalPaid: 243 }
            }]
        }]
    },
    // Mock Completed Order for veh_001 (Should appear in Expenses)
    {
        id: "wo_demo_2",
        taskIds: ["task_1"], // Assume task_1 was completed previously for this history
        vendorId: "ven_1",
        status: "completed",
        createdAt: "2025-12-15T08:00:00Z",
        dueDate: "2025-12-20T08:00:00Z",
        completions: [{
            id: "comp_demo_1",
            completedAt: "2025-12-18T14:00:00Z",
            invoiceNumber: "INV-999",
            invoiceDate: "2025-12-18",
            currency: "CAD",
            taskIds: ["task_1"],
            assetBreakdowns: [{
                assetId: "veh_001",
                finalOdometer: 44000,
                finalEngineHours: 8000,
                costs: { partsAndSupplies: 450, labour: 200, tax: 84.50, totalPaid: 734.50 }
            }]
        }]
    }
];
