
// --- Imports ---
// Per-carrier generated tasks + orders are appended at the bottom of this file
// to the canonical INITIAL_TASKS / INITIAL_ORDERS exports so the existing
// maintenance UI sees them without any frontend changes.

// --- Types & Interfaces ---

export type ServiceCategory = "cmv_only" | "non_cmv_only" | "both_cmv_and_non_cmv";

/**
 * 8 categories that any maintenance / inspection task naturally falls into.
 * Drives the group-filter tabs on the Create Schedule + Create Task Order forms.
 *
 *   Engine                  fuel system, oil & filter, reefer / APU
 *   Brakes                  hydraulic, air, ABS, ESC, drum, disc, performance
 *   Tires & Wheels          tread, sidewall, pressure, rims, hubs, fasteners
 *   Suspension & Steering   springs, axles, shocks, kingpin, steering linkage
 *   Body & Coupling         cargo body, frame, doors, hitches, fifth wheel,
 *                           landing gear, fenders, fire extinguisher, RIG
 *   Lamps & Electrical      required lamps, reflectors, wiring, trailer cord
 *   Inspections             annual / safety / interior / docs / post-repair
 *   Other                   catch-all for custom or one-off work that doesn't
 *                           fit any of the above (e.g. cosmetic detailing,
 *                           accessory install, special-request shop work)
 */
export type ServiceGroup =
    | "Engine"
    | "Brakes"
    | "Tires & Wheels"
    | "Suspension & Steering"
    | "Body & Coupling"
    | "Lamps & Electrical"
    | "Inspections"
    | "Other";

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
    /** Optional — schedules created without a frequency rule have no dueRule. */
    dueRule?: {
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
    { id: "oil_filter",         name: "Oil & Filter Change",  category: "both_cmv_and_non_cmv", group: "Engine",          description: "Drain old engine oil and replace the oil filter at the recommended service interval.",            complexity: "Basic" },
    { id: "tire_rotation",      name: "Tire Rotation",        category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Rotate tires per the recommended pattern to balance wear across all positions.",               complexity: "Basic" },
    { id: "brake_inspection",   name: "Brake Inspection",     category: "cmv_only",            group: "Brakes",          description: "Inspect brake pads, drums, rotors, calipers, and brake fluid condition.",                       complexity: "Moderate" },
    { id: "annual_inspection",  name: "Annual Inspection",    category: "cmv_only",            group: "Inspections",     description: "Full annual safety inspection per regulatory requirements; sticker / certificate issued.",      complexity: "Extensive" },
    { id: "wiper_fluid",        name: "Wiper Fluid Top-up",   category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Top up windshield washer fluid reservoir.",                                                       complexity: "Basic" },
    { id: "reefer_service",     name: "Reefer Unit Service",  category: "both_cmv_and_non_cmv", group: "Engine",          description: "Service refrigeration unit including refrigerant level, belts, and oil change.",                  complexity: "Moderate" },
    { id: "grease_fifth_wheel", name: "Grease Fifth Wheel",   category: "cmv_only",            group: "Body & Coupling", description: "Apply fresh grease to the fifth-wheel plate, jaw mechanism and pivot pins.",                     complexity: "Basic" },
    
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
        group: "Brakes",
        description: "Inspect brake pads, rotors, calipers, and brake fluid condition during the annual service interval.",
        complexity: "Moderate"
    },
    { 
        id: "serv_elec_annual",
        name: "Annual Electrical System Inspection",
        category: "non_cmv_only",
        group: "Lamps & Electrical",
        description: "Inspect vehicle wiring, battery condition, fuses, sensors, and warning systems for proper operation.",
        complexity: "Moderate"
    },
    { 
        id: "serv_suspension_annual",
        name: "Annual Suspension and Steering Inspection",
        category: "non_cmv_only",
        group: "Suspension & Steering",
        description: "Inspect suspension components, steering linkage, bushings, and alignment for wear or damage.",
        complexity: "Extensive"
    },
    { 
        id: "insp_body_corrosion",
        name: "Body and Corrosion Inspection",
        category: "non_cmv_only",
        group: "Inspections",
        description: "Inspect vehicle body panels, underbody, and frame areas for corrosion, damage, or previous repairs.",
        complexity: "Extensive"
    },
    { 
        id: "doc_verification",
        name: "Documentation Verification",
        category: "non_cmv_only",
        group: "Inspections",
        description: "Verify vehicle registration, insurance, inspection records, and warranty documents are current.",
        complexity: "Basic"
    },
    { 
        id: "insp_post_repair",
        name: "Post-Repair Quality Inspection",
        category: "non_cmv_only",
        group: "Inspections",
        description: "Inspect vehicle after maintenance or repair work to ensure all items were completed correctly.",
        complexity: "Basic"
    },
    { 
        id: "serv_seasonal_prep",
        name: "Seasonal Vehicle Preparation",
        category: "non_cmv_only",
        group: "Body & Coupling",
        description: "Prepare vehicle for seasonal conditions such as winter readiness or summer heat operation.",
        complexity: "Moderate"
    },
    {
        id: "insp_interior_sanitation",
        name: "Interior Sanitation Inspection",
        category: "non_cmv_only",
        group: "Inspections",
        description: "Inspect interior cleanliness and hygiene standards for passenger or company vehicle use.",
        complexity: "Basic"
    },

    // ────────────────────────────────────────────────────────────────────
    //  Schedule 1 inspection items — Non-CMV (Sections 1-10).
    //
    //  These mirror the periodic-inspection schedule that mechanics work
    //  through during an annual inspection. Each is its own selectable
    //  "maintenance type" in the Create Task Order form so the operator
    //  can scope a visit to specific inspection items rather than a single
    //  catch-all "Annual Inspection".
    //
    //  All entries are tagged `non_cmv_only` per the data ask. Section
    //  numbers are encoded in the id (`sched1_s2_*`, `sched1_s3a_*`, …)
    //  and the description, since the existing ServiceGroup enum has only
    //  4 values.
    // ────────────────────────────────────────────────────────────────────

    // ── Section 1 — Power Train ──────────────────────────────────────
    { id: "sched1_s1_fuel_gas_diesel", name: "Gasoline or Diesel Fuel System", category: "both_cmv_and_non_cmv", group: "Engine", description: "Section 1 Power Train — inspect gasoline/diesel fuel lines, tanks, filler caps and pump assemblies for leaks and damage.", complexity: "Moderate" },
    { id: "sched1_s1_fuel_pressurized", name: "Pressurized or Liquefied Fuel System (LPG, CNG, LNG)", category: "both_cmv_and_non_cmv", group: "Engine", description: "Section 1 Power Train — inspect LPG / CNG / LNG fuel system, tanks, regulators and lines for leaks and certification.", complexity: "Extensive" },

    // ── Section 2 — Suspension ───────────────────────────────────────
    { id: "sched1_s2_susp_frame_attach", name: "Suspension and Frame Attachments", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect suspension-to-frame attaching components for cracks, looseness, and wear.", complexity: "Moderate" },
    { id: "sched1_s2_axle_attaching", name: "Axle Attaching and Tracking Components", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect axle attaching parts and tracking components (radius rods, torque rods, etc.).", complexity: "Moderate" },
    { id: "sched1_s2_axle_assembly", name: "Axle and Axle Assembly", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect axle housing, beam, ends and assembly for cracks, leaks, or distortion.", complexity: "Moderate" },
    { id: "sched1_s2_spring", name: "Spring and Spring Attachments", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect leaf / coil springs, U-bolts, hangers, shackles and bushings.", complexity: "Moderate" },
    { id: "sched1_s2_air_suspension", name: "Air Suspension", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect air bags, height-control valves, air lines, and ride-height adjustment.", complexity: "Moderate" },
    { id: "sched1_s2_self_steer_axle", name: "Self-Steer and Controlled Steer Axle", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect self-steer / controlled-steer axles for proper articulation and lock-out function.", complexity: "Extensive" },
    { id: "sched1_s2_shock_strut", name: "Shock Absorber / Strut Assembly", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 2 Suspension — inspect shock absorbers and strut assemblies for leaks, damage and mounting integrity.", complexity: "Basic" },

    // ── Section 3H — Hydraulic Brakes ────────────────────────────────
    { id: "sched1_s3h_hydraulic_components", name: "Hydraulic System Components", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect master cylinder, lines, hoses and reservoirs for leaks and condition.", complexity: "Moderate" },
    { id: "sched1_s3h_air_over_hydraulic", name: "Air Over Hydraulic Brake System", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect air-over-hydraulic boosters and conversion components.", complexity: "Moderate" },
    { id: "sched1_s3h_surge_brake_trailer", name: "Surge Brake Controller on Trailer", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect trailer surge-brake actuator, master cylinder and breakaway cable.", complexity: "Moderate" },
    { id: "sched1_s3h_vacuum_trailer", name: "Vacuum System on Trailer", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect trailer vacuum reservoir, lines and warning device.", complexity: "Basic" },
    { id: "sched1_s3h_air_boosted_trailer", name: "Air-Boosted Trailer Brake System", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect air-boosted trailer brake components and warning system.", complexity: "Moderate" },
    { id: "sched1_s3h_electric_brake_trailer", name: "Electric Brake System on Trailer", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect trailer electric brake actuators, magnets, wiring and breakaway switch.", complexity: "Moderate" },
    { id: "sched1_s3h_drum_brake", name: "Drum Brake System Components (Hydraulic)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect drums, shoes, wheel cylinders, return springs and hardware.", complexity: "Moderate" },
    { id: "sched1_s3h_disc_brake", name: "Disc Brake System Components (Hydraulic)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes — inspect rotors, calipers, pads, slides and bleed function.", complexity: "Moderate" },
    { id: "sched1_s3h_brake_performance", name: "Brake Performance (Hydraulic — Optional)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3H Hydraulic Brakes (optional) — perform a brake-performance test on a roller dynamometer or by road test.", complexity: "Extensive" },

    // ── Section 3A — Air Brakes ──────────────────────────────────────
    { id: "sched1_s3a_leakage_trailer", name: "Air System Leakage on a Trailer", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — perform a static leakage test on the trailer's air system, glad-hand seals included.", complexity: "Moderate" },
    { id: "sched1_s3a_air_tank", name: "Air Tank", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — inspect air reservoirs (tanks) for damage, mounting, drain valves and date markings.", complexity: "Basic" },
    { id: "sched1_s3a_park_emerg_trailer", name: "Parking Brake & Emergency Application on Trailer", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — verify trailer parking-brake hold and emergency-application function on supply-line loss.", complexity: "Moderate" },
    { id: "sched1_s3a_air_components", name: "Air System Components", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — inspect compressor, governor, dryer, lines, fittings, valves and warning systems.", complexity: "Moderate" },
    { id: "sched1_s3a_brake_chamber", name: "Brake Chamber", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — inspect service and spring brake chambers for cracks, leaks, mounting and clamp ring integrity.", complexity: "Moderate" },
    { id: "sched1_s3a_drum_brake", name: "Drum Brake System Components (Air)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — inspect drums, shoes, return springs and hardware on air-actuated drum brakes.", complexity: "Moderate" },
    { id: "sched1_s3a_s_cam", name: "S-Cam Drum Brake System", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — inspect S-cams, slack adjusters, push-rod stroke, anchor pins and bushings.", complexity: "Moderate" },
    { id: "sched1_s3a_wedge_travel", name: "Brake Shoe Travel (Wedge Brakes)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — measure wedge-brake shoe travel and verify auto-adjuster operation.", complexity: "Moderate" },
    { id: "sched1_s3a_disc_brake", name: "Disc Brake System Components (Air)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — inspect rotors, calipers, pads and air-disc actuator function.", complexity: "Moderate" },
    { id: "sched1_s3a_abs_trailer", name: "Anti-Lock Brake System (ABS) on Trailer", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — verify trailer ABS warning lamp, modulator function and wheel-speed sensors.", complexity: "Moderate" },
    { id: "sched1_s3a_stability_control", name: "Stability Control System (ESC / RSS)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes — verify Electronic Stability Control or Roll Stability System fault lamps and self-test.", complexity: "Moderate" },
    { id: "sched1_s3a_brake_performance", name: "Brake Performance (Air — Optional)", category: "both_cmv_and_non_cmv", group: "Brakes", description: "Section 3A Air Brakes (optional) — perform a brake-performance test on roller dynamometer or by road test.", complexity: "Extensive" },

    // ── Section 4 — Steering ─────────────────────────────────────────
    { id: "sched1_s4_steering_linkage", name: "Steering Control & Linkage", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 4 Steering — inspect steering wheel, column, gear box, drag link, tie-rods and pitman arm for play and damage.", complexity: "Moderate" },
    { id: "sched1_s4_kingpin", name: "Kingpin", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 4 Steering — inspect kingpin and bushings for wear, lubrication, and excessive play.", complexity: "Moderate" },
    { id: "sched1_s4_self_steer", name: "Self-Steer & Controlled Steer Axle (Steering check)", category: "both_cmv_and_non_cmv", group: "Suspension & Steering", description: "Section 4 Steering — verify self-steer / controlled-steer axles unlock, steer and re-centre correctly.", complexity: "Extensive" },

    // ── Section 5 — Instruments & Auxiliary Equipment ────────────────
    { id: "sched1_s5_fire_extinguisher", name: "Fire Extinguisher", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 5 Auxiliary Equipment — verify fire extinguisher presence, charge, mounting, inspection tag and accessibility.", complexity: "Basic" },

    // ── Section 6 — Lamps ────────────────────────────────────────────
    { id: "sched1_s6_required_lamps", name: "Required Lamps", category: "both_cmv_and_non_cmv", group: "Lamps & Electrical", description: "Section 6 Lamps — verify all required lamps (head, tail, stop, turn, marker, identification, licence) operate.", complexity: "Basic" },
    { id: "sched1_s6_reflex_reflector", name: "Reflex Reflector", category: "both_cmv_and_non_cmv", group: "Lamps & Electrical", description: "Section 6 Lamps — inspect reflex reflectors for presence, condition and visibility from required angles.", complexity: "Basic" },
    { id: "sched1_s6_retro_reflective", name: "Retro-Reflective Marking", category: "both_cmv_and_non_cmv", group: "Lamps & Electrical", description: "Section 6 Lamps — inspect retro-reflective tape / sheeting on trailers for coverage, condition and adhesion.", complexity: "Basic" },

    // ── Section 7 — Electrical System ────────────────────────────────
    { id: "sched1_s7_wiring", name: "Wiring", category: "both_cmv_and_non_cmv", group: "Lamps & Electrical", description: "Section 7 Electrical System — inspect wiring, harnesses, connectors and grounds for chafing, damage and security.", complexity: "Moderate" },
    { id: "sched1_s7_trailer_cord", name: "Trailer Cord (output to towed vehicle)", category: "both_cmv_and_non_cmv", group: "Lamps & Electrical", description: "Section 7 Electrical System — inspect 7-way / 4-way trailer cord, plug, socket and breakaway-switch wiring.", complexity: "Basic" },

    // ── Section 8 — Body ─────────────────────────────────────────────
    { id: "sched1_s8_cargo_body", name: "Cargo Body", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect cargo body / box for structural condition, securement, doors and locking devices.", complexity: "Moderate" },
    { id: "sched1_s8_frame_rails", name: "Frame Rails & Mounts", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect frame rails, cross-members and body / engine / transmission mounts for cracks and corrosion.", complexity: "Extensive" },
    { id: "sched1_s8_unitized_body", name: "Unitized Body Elements", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect unitized-body structural elements for damage, corrosion or compromised welds.", complexity: "Extensive" },
    { id: "sched1_s8_cab_cargo_door", name: "Cab or Cargo Door", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect cab and cargo doors, hinges, latches and secondary safety devices.", complexity: "Basic" },
    { id: "sched1_s8_cargo_tank", name: "Cargo Tank or Vessel", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect cargo tank / pressure vessel for damage, mounting, valves and certification markings.", complexity: "Extensive" },
    { id: "sched1_s8_body_device", name: "Body Device or Equipment Attached / Mounted", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect body-mounted equipment (lift gates, ramps, tool boxes, etc.) for securement and condition.", complexity: "Moderate" },
    { id: "sched1_s8_reefer_apu", name: "Refrigeration / Heater / Reefer / APU", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect reefer / heater unit fuel system or auxiliary power unit (APU) for leaks and securement.", complexity: "Moderate" },
    { id: "sched1_s8_fender_mudflap", name: "Fender / Mud Flap", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect fenders and mud flaps for presence, height and condition.", complexity: "Basic" },
    { id: "sched1_s8_landing_gear", name: "Landing Gear on Trailer", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect trailer landing gear, crank handle, foot pads and cross-shaft for operation and damage.", complexity: "Basic" },
    { id: "sched1_s8_sliding_axle", name: "Sliding Axle Assembly (Sliding Bogie) on Trailer", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect trailer sliding-axle / sliding bogie release pins, locking mechanism and slide rails.", complexity: "Moderate" },
    { id: "sched1_s8_aerodynamic", name: "Aerodynamic Device & Attachment", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect aerodynamic skirts, fairings and tails for securement, damage and missing fasteners.", complexity: "Basic" },
    { id: "sched1_s8_rig_trailer", name: "Rear Impact Guard (RIG) on Trailer", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 8 Body — inspect trailer rear impact guard for height, width, mounting and structural condition.", complexity: "Basic" },

    // ── Section 9 — Tires & Wheels ───────────────────────────────────
    { id: "sched1_s9_tire_tread_depth", name: "Tire Tread Depth", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — measure tread depth across each tire and compare to minimum legal requirements.", complexity: "Basic" },
    { id: "sched1_s9_tire_tread_cond", name: "Tire Tread Condition", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect tread for cuts, chunking, exposed cord/belt and irregular wear patterns.", complexity: "Basic" },
    { id: "sched1_s9_tire_sidewall", name: "Tire Sidewall and Manufacturer Markings", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect sidewalls for damage and verify legibility of manufacturer / DOT markings.", complexity: "Basic" },
    { id: "sched1_s9_tire_pressure", name: "Tire Inflation Pressure", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — measure cold tire pressure on every position and compare to placard / sidewall.", complexity: "Basic" },
    { id: "sched1_s9_wheel_hub", name: "Wheel Hub", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect wheel hubs for leaks, fluid level, cracks and seal condition.", complexity: "Moderate" },
    { id: "sched1_s9_wheel_bearing", name: "Wheel Bearing", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect wheel bearings for play, roughness, noise and proper adjustment.", complexity: "Moderate" },
    { id: "sched1_s9_wheel_rim", name: "Wheel and Rim", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect wheels and rims for cracks, distortion, severe corrosion and signs of repair.", complexity: "Basic" },
    { id: "sched1_s9_multi_piece_rim", name: "Multi-Piece Wheel and Rim", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect multi-piece wheel and rim assemblies for matching components and seating.", complexity: "Moderate" },
    { id: "sched1_s9_spoke_wheel", name: "Spoke Wheel and Demountable Rim System", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect spoke wheels, demountable rims, clamps, side rings and lock rings.", complexity: "Moderate" },
    { id: "sched1_s9_disc_wheel", name: "Disc Wheel System", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — inspect disc wheels for cracks at hand holes, bolt-hole elongation and corrosion.", complexity: "Moderate" },
    { id: "sched1_s9_wheel_fasteners", name: "Wheel Fasteners (Nuts, Bolts & Studs)", category: "both_cmv_and_non_cmv", group: "Tires & Wheels", description: "Section 9 Tires & Wheels — verify lug nut torque pattern, presence of all fasteners, and stud condition.", complexity: "Basic" },

    // ── Section 10 — Coupling Devices ────────────────────────────────
    { id: "sched1_s10_hitch_assembly", name: "Hitch Assembly, Structure & Attaching Components", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect hitch assembly, frame attaching welds / bolts and structural condition.", complexity: "Moderate" },
    { id: "sched1_s10_safety_chain", name: "Secondary Attachment, Safety Chain or Cable", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect safety chains / cables, hooks, attaching points and crossover routing.", complexity: "Basic" },
    { id: "sched1_s10_pintle_hook", name: "Pintle Hook, Pin Hitch or Coupler Hitch", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect pintle / pin / coupler hitch for wear, latch operation and locking pin.", complexity: "Basic" },
    { id: "sched1_s10_ball_hitch", name: "Ball Type Hitch", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect ball-type hitch for wear, correct ball size and coupler latch operation.", complexity: "Basic" },
    { id: "sched1_s10_roll_coupling", name: "Roll-Coupling Hitch", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect roll-coupling hitch for free articulation and locking-mechanism integrity.", complexity: "Moderate" },
    { id: "sched1_s10_automated_coupling", name: "Automated Coupling Device", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect automated coupling device for self-test, lock indicator and damage.", complexity: "Moderate" },
    { id: "sched1_s10_fifth_wheel", name: "Fifth Wheel Coupler", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect fifth-wheel coupler, jaw, lock, release handle, mounting and cross-member.", complexity: "Moderate" },
    { id: "sched1_s10_oscillating_fw", name: "Oscillating Fifth Wheel Coupler", category: "both_cmv_and_non_cmv", group: "Body & Coupling", description: "Section 10 Coupling — inspect oscillating fifth-wheel coupler for free movement, pivot pins and stops.", complexity: "Moderate" },

    // ── Other — catch-all for one-off work that doesn't fit any of the
    //    structured categories above. Picked when the operator wants to
    //    schedule "shop work" without locking it to a specific inspection
    //    item (cosmetic, accessory install, custom request, etc.).
    { id: "other_custom_service", name: "Custom Service", category: "both_cmv_and_non_cmv", group: "Other", description: "Other — generic custom work (detail in the schedule's Remarks field). Use when no standard maintenance type fits.", complexity: "Basic" },
    { id: "other_misc_service",   name: "Miscellaneous Service", category: "both_cmv_and_non_cmv", group: "Other", description: "Other — miscellaneous shop work or one-off task (specify in Remarks).", complexity: "Basic" },
    { id: "other_accessory_install", name: "Accessory / Add-On Install", category: "both_cmv_and_non_cmv", group: "Other", description: "Other — install or remove an accessory / add-on (radio, ELD, dashcam, mud flaps kit, telematics, etc.).", complexity: "Moderate" },
    { id: "other_cosmetic_detail",   name: "Cosmetic / Detailing Work",  category: "both_cmv_and_non_cmv", group: "Other", description: "Other — body / paint / decal / detailing work that isn't a regulatory inspection or repair.", complexity: "Basic" },
];

// Per-Acme-asset maintenance tasks. Each task ties to an asset id from
// `assets.data.ts` (a1..a7) so the Create Task Order modal's asset → task
// lookup matches what the user sees in the asset dropdown.
//
// Status mix per asset (upcoming / due / overdue / in_progress / completed)
// is intentionally varied so the page renders something interesting on
// every tab. Dates are anchored to early-mid 2026 so they're current
// relative to the demo.
//
//  a1  TR-1049  CMV  Freightliner Cascadia  ~245k mi   ▸ 4 tasks
//  a2  TR-2088  CMV  Kenworth T680 (trailer) ~120k km  ▸ 3 tasks
//  a3  TR-3055  CMV  Peterbilt 389 (in maint) ~310k mi ▸ 4 tasks
//  a4  TR-4102  Non-CMV                                ▸ 2 tasks
//  a5  TR-5200  CMV trailer                            ▸ 2 tasks
//  a6  TR-6001  CMV truck                              ▸ 3 tasks
//  a7  TR-7044  CMV truck                              ▸ 3 tasks
//
const ACME_INITIAL_TASKS: MaintenanceTask[] = [
    // ── a1 — TR-1049 (Freightliner Cascadia, CMV, 245k mi) ─────────
    {
        id: "task_a1_oil",
        assetId: "a1",
        scheduleId: "sch_a1_oil",
        serviceTypeIds: ["oil_filter"],
        status: "upcoming",
        meterSnapshot: { odometer: 245000, engineHours: 8120, capturedAt: "2026-04-25T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 5000, dueAtOdometer: 250000 },
        createdAt: "2026-02-15T10:00:00Z",
    },
    {
        id: "task_a1_tire",
        assetId: "a1",
        scheduleId: "sch_a1_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "due",
        meterSnapshot: { odometer: 245200, engineHours: 8125, capturedAt: "2026-04-28T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 10000, upcomingThreshold: 1000, dueAtOdometer: 247000 },
        createdAt: "2026-03-20T10:00:00Z",
    },
    {
        id: "task_a1_brake",
        assetId: "a1",
        scheduleId: "sch_a1_brake",
        serviceTypeIds: ["brake_inspection"],
        status: "overdue",
        meterSnapshot: { odometer: 245500, engineHours: 8130, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 25000, upcomingThreshold: 3000, dueAtOdometer: 240000 },
        createdAt: "2026-01-10T10:00:00Z",
    },
    {
        id: "task_a1_annual",
        assetId: "a1",
        scheduleId: "sch_a1_annual",
        serviceTypeIds: ["annual_inspection"],
        status: "completed",
        meterSnapshot: { odometer: 232000, engineHours: 7800, capturedAt: "2025-09-12T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2025-09-15T10:00:00Z" },
        createdAt: "2025-08-20T10:00:00Z",
    },

    // ── a2 — TR-2088 (Kenworth T680, CMV trailer, 120k km) ─────────
    {
        id: "task_a2_tire",
        assetId: "a2",
        scheduleId: "sch_a2_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "upcoming",
        meterSnapshot: { odometer: 120000, engineHours: 0, capturedAt: "2026-04-20T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 8000, upcomingThreshold: 1500, dueAtOdometer: 125000 },
        createdAt: "2026-03-01T10:00:00Z",
    },
    {
        id: "task_a2_annual",
        assetId: "a2",
        scheduleId: "sch_a2_annual",
        serviceTypeIds: ["annual_inspection"],
        status: "due",
        meterSnapshot: { odometer: 120100, engineHours: 0, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2026-05-10T10:00:00Z" },
        createdAt: "2025-05-05T10:00:00Z",
    },
    {
        id: "task_a2_brake",
        assetId: "a2",
        scheduleId: "sch_a2_brake",
        serviceTypeIds: ["brake_inspection"],
        status: "completed",
        meterSnapshot: { odometer: 110000, engineHours: 0, capturedAt: "2026-01-18T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 25000, upcomingThreshold: 3000, dueAtOdometer: 110000 },
        createdAt: "2025-12-12T10:00:00Z",
    },

    // ── a3 — TR-3055 (Peterbilt 389, CMV, 310k mi, IN MAINTENANCE) ──
    {
        id: "task_a3_oil",
        assetId: "a3",
        scheduleId: "sch_a3_oil",
        serviceTypeIds: ["oil_filter"],
        status: "upcoming",
        meterSnapshot: { odometer: 310000, engineHours: 16200, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 5000, dueAtOdometer: 320000 },
        createdAt: "2026-04-01T10:00:00Z",
    },
    {
        id: "task_a3_brake",
        assetId: "a3",
        scheduleId: "sch_a3_brake",
        serviceTypeIds: ["brake_inspection"],
        status: "overdue",
        meterSnapshot: { odometer: 310500, engineHours: 16210, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 25000, upcomingThreshold: 3000, dueAtOdometer: 305000 },
        createdAt: "2026-02-01T10:00:00Z",
    },
    {
        id: "task_a3_annual",
        assetId: "a3",
        scheduleId: "sch_a3_annual",
        serviceTypeIds: ["annual_inspection"],
        status: "overdue",
        meterSnapshot: { odometer: 311000, engineHours: 16220, capturedAt: "2026-05-02T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2026-03-30T10:00:00Z" },
        createdAt: "2025-03-15T10:00:00Z",
    },
    {
        id: "task_a3_grease",
        assetId: "a3",
        scheduleId: "sch_a3_grease",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "in_progress",
        meterSnapshot: { odometer: 311500, engineHours: 16230, capturedAt: "2026-05-04T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 1000, dueAtOdometer: 311000 },
        createdAt: "2026-04-22T10:00:00Z",
    },

    // ── a4 — TR-4102 (Non-CMV) ─────────────────────────────────────
    {
        id: "task_a4_wiper",
        assetId: "a4",
        scheduleId: "sch_a4_wiper",
        serviceTypeIds: ["wiper_fluid"],
        status: "upcoming",
        meterSnapshot: { odometer: 38000, engineHours: 0, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 30, upcomingThreshold: 7, dueAtDate: "2026-05-12T10:00:00Z" },
        createdAt: "2026-04-12T10:00:00Z",
    },
    {
        id: "task_a4_tire",
        assetId: "a4",
        scheduleId: "sch_a4_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "due",
        meterSnapshot: { odometer: 38200, engineHours: 0, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 8000, upcomingThreshold: 1000, dueAtOdometer: 39000 },
        createdAt: "2026-03-25T10:00:00Z",
    },

    // ── a5 — TR-5200 (CMV trailer) ─────────────────────────────────
    {
        id: "task_a5_annual",
        assetId: "a5",
        scheduleId: "sch_a5_annual",
        serviceTypeIds: ["annual_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 78000, engineHours: 0, capturedAt: "2026-04-25T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2026-06-01T10:00:00Z" },
        createdAt: "2025-06-01T10:00:00Z",
    },
    {
        id: "task_a5_tire",
        assetId: "a5",
        scheduleId: "sch_a5_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "completed",
        meterSnapshot: { odometer: 70000, engineHours: 0, capturedAt: "2026-02-20T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 10000, upcomingThreshold: 1000, dueAtOdometer: 70000 },
        createdAt: "2026-01-15T10:00:00Z",
    },

    // ── a6 — TR-6001 (CMV truck) ───────────────────────────────────
    {
        id: "task_a6_oil",
        assetId: "a6",
        scheduleId: "sch_a6_oil",
        serviceTypeIds: ["oil_filter"],
        status: "upcoming",
        meterSnapshot: { odometer: 165000, engineHours: 5400, capturedAt: "2026-04-28T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 5000, dueAtOdometer: 175000 },
        createdAt: "2026-03-08T10:00:00Z",
    },
    {
        id: "task_a6_tire",
        assetId: "a6",
        scheduleId: "sch_a6_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "upcoming",
        meterSnapshot: { odometer: 165200, engineHours: 5410, capturedAt: "2026-04-29T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 10000, upcomingThreshold: 1500, dueAtOdometer: 170000 },
        createdAt: "2026-03-08T10:00:00Z",
    },
    {
        id: "task_a6_brake",
        assetId: "a6",
        scheduleId: "sch_a6_brake",
        serviceTypeIds: ["brake_inspection"],
        status: "due",
        meterSnapshot: { odometer: 165500, engineHours: 5415, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 25000, upcomingThreshold: 3000, dueAtOdometer: 165000 },
        createdAt: "2026-02-15T10:00:00Z",
    },

    // ── a7 — TR-7044 (CMV truck) ───────────────────────────────────
    {
        id: "task_a7_brake",
        assetId: "a7",
        scheduleId: "sch_a7_brake",
        serviceTypeIds: ["brake_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 92000, engineHours: 3100, capturedAt: "2026-04-22T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 25000, upcomingThreshold: 3000, dueAtOdometer: 100000 },
        createdAt: "2026-04-01T10:00:00Z",
    },
    {
        id: "task_a7_oil",
        assetId: "a7",
        scheduleId: "sch_a7_oil",
        serviceTypeIds: ["oil_filter"],
        status: "due",
        meterSnapshot: { odometer: 92500, engineHours: 3110, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 1500, dueAtOdometer: 92000 },
        createdAt: "2026-03-28T10:00:00Z",
    },
    {
        id: "task_a7_annual",
        assetId: "a7",
        scheduleId: "sch_a7_annual",
        serviceTypeIds: ["annual_inspection"],
        status: "completed",
        meterSnapshot: { odometer: 80000, engineHours: 2700, capturedAt: "2025-11-08T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 30, dueAtDate: "2025-11-10T10:00:00Z" },
        createdAt: "2025-10-12T10:00:00Z",
    },

    // ── Top-up tasks so every asset has at least 3 *available* tasks
    //    (i.e. not completed, not cancelled, not already in an order)
    //    in the Create Task Order → "Existing Scheduled Tasks" list.

    // a1 (TR-1049) — adds 3 more so the panel reads: Oil & Filter Change,
    // Wiper Fluid Top-up, Grease Fifth Wheel, Annual Inspection (next).
    {
        id: "task_a1_grease",
        assetId: "a1",
        scheduleId: "sch_a1_grease",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "due",
        meterSnapshot: { odometer: 245000, engineHours: 8120, capturedAt: "2026-04-29T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 800, dueAtOdometer: 245500 },
        createdAt: "2026-04-10T10:00:00Z",
    },
    {
        id: "task_a1_annual_next",
        assetId: "a1",
        scheduleId: "sch_a1_annual_next",
        serviceTypeIds: ["annual_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 245000, engineHours: 8120, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 60, dueAtDate: "2026-09-10T10:00:00Z" },
        createdAt: "2026-04-15T10:00:00Z",
    },

    // a3 (TR-3055) — adds 3 more so even with 3 in the open WO, there's
    // still Oil Change + Tire Rotation + a fresh annual on the menu.
    {
        id: "task_a3_tire",
        assetId: "a3",
        scheduleId: "sch_a3_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "due",
        meterSnapshot: { odometer: 311500, engineHours: 16230, capturedAt: "2026-05-02T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 10000, upcomingThreshold: 1500, dueAtOdometer: 311000 },
        createdAt: "2026-04-12T10:00:00Z",
    },
    {
        id: "task_a3_oil_extra",
        assetId: "a3",
        scheduleId: "sch_a3_oil_extra",
        serviceTypeIds: ["oil_filter", "tire_rotation"],
        status: "upcoming",
        meterSnapshot: { odometer: 311500, engineHours: 16230, capturedAt: "2026-05-03T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 5000, dueAtOdometer: 325000 },
        createdAt: "2026-04-22T10:00:00Z",
    },
    {
        id: "task_a3_safety_followup",
        assetId: "a3",
        scheduleId: "sch_a3_safety_followup",
        serviceTypeIds: ["brake_inspection", "annual_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 311500, engineHours: 16230, capturedAt: "2026-05-03T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 30, upcomingThreshold: 7, dueAtDate: "2026-06-01T10:00:00Z" },
        createdAt: "2026-05-01T10:00:00Z",
    },

    // a5 (TR-5200) — adds 2 more so even with the open annual there's a
    // brake inspection + grease available to demo.
    {
        id: "task_a5_brake",
        assetId: "a5",
        scheduleId: "sch_a5_brake",
        serviceTypeIds: ["brake_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 78000, engineHours: 0, capturedAt: "2026-04-25T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 25000, upcomingThreshold: 3000, dueAtOdometer: 80000 },
        createdAt: "2026-04-05T10:00:00Z",
    },
    {
        id: "task_a5_grease",
        assetId: "a5",
        scheduleId: "sch_a5_grease",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "due",
        meterSnapshot: { odometer: 78000, engineHours: 0, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 700, dueAtOdometer: 78500 },
        createdAt: "2026-04-15T10:00:00Z",
    },

    // a4 (TR-4102, Non-CMV) — adds 2 more so the panel has 4 entries
    // (wiper, tire, reefer, doc verification).
    {
        id: "task_a4_reefer",
        assetId: "a4",
        scheduleId: "sch_a4_reefer",
        serviceTypeIds: ["reefer_service"],
        status: "upcoming",
        meterSnapshot: { odometer: 38000, engineHours: 0, capturedAt: "2026-04-22T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 90, upcomingThreshold: 14, dueAtDate: "2026-05-22T10:00:00Z" },
        createdAt: "2026-04-01T10:00:00Z",
    },
    {
        id: "task_a4_doc",
        assetId: "a4",
        scheduleId: "sch_a4_doc",
        serviceTypeIds: ["doc_verification"],
        status: "upcoming",
        meterSnapshot: { odometer: 38000, engineHours: 0, capturedAt: "2026-04-22T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 180, upcomingThreshold: 30, dueAtDate: "2026-06-15T10:00:00Z" },
        createdAt: "2026-03-20T10:00:00Z",
    },

    // a2 (TR-2088) — one extra so the panel reads 3 even after the open
    // bundle picks one off.
    {
        id: "task_a2_oil",
        assetId: "a2",
        scheduleId: "sch_a2_oil",
        serviceTypeIds: ["oil_filter"],
        status: "due",
        meterSnapshot: { odometer: 120100, engineHours: 0, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 15000, upcomingThreshold: 1500, dueAtOdometer: 120000 },
        createdAt: "2026-04-08T10:00:00Z",
    },
    {
        id: "task_a2_grease",
        assetId: "a2",
        scheduleId: "sch_a2_grease",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "upcoming",
        meterSnapshot: { odometer: 120100, engineHours: 0, capturedAt: "2026-05-01T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 800, dueAtOdometer: 122000 },
        createdAt: "2026-04-12T10:00:00Z",
    },

    // a6 (TR-6001) — one extra so even with the open brake WO, there's
    // 3+ tasks visible.
    {
        id: "task_a6_grease",
        assetId: "a6",
        scheduleId: "sch_a6_grease",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "upcoming",
        meterSnapshot: { odometer: 165200, engineHours: 5410, capturedAt: "2026-04-25T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 1000, dueAtOdometer: 168000 },
        createdAt: "2026-04-08T10:00:00Z",
    },
    {
        id: "task_a6_annual",
        assetId: "a6",
        scheduleId: "sch_a6_annual",
        serviceTypeIds: ["annual_inspection"],
        status: "upcoming",
        meterSnapshot: { odometer: 165200, engineHours: 5410, capturedAt: "2026-04-25T10:00:00Z" },
        dueRule: { unit: "days", frequencyEvery: 365, upcomingThreshold: 45, dueAtDate: "2026-08-12T10:00:00Z" },
        createdAt: "2026-04-15T10:00:00Z",
    },

    // a7 (TR-7044) — one extra so the panel always has a 3rd row.
    {
        id: "task_a7_tire",
        assetId: "a7",
        scheduleId: "sch_a7_tire",
        serviceTypeIds: ["tire_rotation"],
        status: "upcoming",
        meterSnapshot: { odometer: 92500, engineHours: 3110, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 10000, upcomingThreshold: 1500, dueAtOdometer: 100000 },
        createdAt: "2026-04-08T10:00:00Z",
    },
    {
        id: "task_a7_grease",
        assetId: "a7",
        scheduleId: "sch_a7_grease",
        serviceTypeIds: ["grease_fifth_wheel"],
        status: "due",
        meterSnapshot: { odometer: 92500, engineHours: 3110, capturedAt: "2026-04-30T10:00:00Z" },
        dueRule: { unit: "miles", frequencyEvery: 5000, upcomingThreshold: 700, dueAtOdometer: 92800 },
        createdAt: "2026-04-12T10:00:00Z",
    },
];

// Per-Acme-asset task orders. Mix of open (in flight with vendors) and
// completed (with full cost breakdowns so the expenses tab has data).
// Every taskIds[] entry references a task in INITIAL_TASKS above.
const ACME_INITIAL_ORDERS: TaskOrder[] = [
    // ── Open: a1 TR-1049 — bundled tire-rotation + overdue brake job ──
    {
        id: "wo_a1_open",
        taskIds: ["task_a1_tire", "task_a1_brake"],
        vendorId: "ven_1",
        status: "open",
        createdAt: "2026-04-29T10:00:00Z",
        dueDate: "2026-05-12T10:00:00Z",
        meta: {
            odometerRequired: true,
            odometerUnit: 'miles',
            engineHoursRequired: false,
        },
        notes: "Driver flagged a soft brake pedal on the morning pre-trip — please prioritise the brake check.",
        completions: [],
    },

    // ── Open: a3 TR-3055 — heavy maintenance bundle (in maint status) ──
    {
        id: "wo_a3_open",
        taskIds: ["task_a3_brake", "task_a3_annual", "task_a3_grease"],
        vendorId: "ven_2",
        status: "open",
        createdAt: "2026-04-22T08:30:00Z",
        dueDate: "2026-05-08T10:00:00Z",
        meta: {
            odometerRequired: true,
            odometerUnit: 'miles',
            engineHoursRequired: true,
        },
        notes: "Truck staged at the shop. Annual + overdue brake + greasing. Driver: Harvey Specter.",
        completions: [],
    },

    // ── Open: a6 TR-6001 — single brake inspection ──
    {
        id: "wo_a6_open",
        taskIds: ["task_a6_brake"],
        vendorId: "ven_2",
        status: "open",
        createdAt: "2026-05-01T14:30:00Z",
        dueDate: "2026-05-15T10:00:00Z",
        meta: {
            odometerRequired: true,
            odometerUnit: 'miles',
            engineHoursRequired: false,
        },
        completions: [],
    },

    // ── Completed: a1 TR-1049 — last year's annual inspection ──
    {
        id: "wo_a1_done",
        taskIds: ["task_a1_annual"],
        vendorId: "ven_1",
        status: "completed",
        createdAt: "2025-08-25T08:00:00Z",
        dueDate: "2025-09-15T08:00:00Z",
        meta: {
            odometerRequired: true,
            odometerUnit: 'miles',
            engineHoursRequired: true,
        },
        completions: [{
            id: "comp_a1_annual",
            completedAt: "2025-09-12T14:00:00Z",
            invoiceNumber: "INV-2025-0942",
            invoiceDate: "2025-09-12",
            currency: "USD",
            taskIds: ["task_a1_annual"],
            assetBreakdowns: [{
                assetId: "a1",
                finalOdometer: 232100,
                finalEngineHours: 7820,
                costs: { partsAndSupplies: 180, labour: 320, tax: 40, totalPaid: 540 },
                remarks: "All systems pass. New CVOR sticker affixed.",
            }],
        }],
    },

    // ── Completed: a2 TR-2088 — winter brake inspection ──
    {
        id: "wo_a2_done",
        taskIds: ["task_a2_brake"],
        vendorId: "ven_3",
        status: "completed",
        createdAt: "2025-12-15T09:00:00Z",
        dueDate: "2026-01-20T10:00:00Z",
        meta: {
            odometerRequired: true,
            odometerUnit: 'km',
            engineHoursRequired: false,
        },
        completions: [{
            id: "comp_a2_brake",
            completedAt: "2026-01-18T11:30:00Z",
            invoiceNumber: "INV-2026-0118",
            invoiceDate: "2026-01-18",
            currency: "CAD",
            taskIds: ["task_a2_brake"],
            assetBreakdowns: [{
                assetId: "a2",
                finalOdometer: 110050,
                costs: { partsAndSupplies: 95, labour: 140, tax: 30.55, totalPaid: 265.55 },
                remarks: "Pads measured 6mm — within spec. No replacement needed.",
            }],
        }],
    },

    // ── Completed: a5 TR-5200 — early-2026 tire rotation ──
    {
        id: "wo_a5_done",
        taskIds: ["task_a5_tire"],
        vendorId: "ven_1",
        status: "completed",
        createdAt: "2026-02-10T10:00:00Z",
        dueDate: "2026-02-25T10:00:00Z",
        meta: {
            odometerRequired: true,
            odometerUnit: 'miles',
            engineHoursRequired: false,
        },
        completions: [{
            id: "comp_a5_tire",
            completedAt: "2026-02-20T13:00:00Z",
            invoiceNumber: "INV-2026-0220",
            invoiceDate: "2026-02-20",
            currency: "USD",
            taskIds: ["task_a5_tire"],
            assetBreakdowns: [{
                assetId: "a5",
                finalOdometer: 70080,
                costs: { partsAndSupplies: 0, labour: 110, tax: 9.90, totalPaid: 119.90 },
            }],
        }],
    },
];

// ── Final exports — Acme's hand-curated tasks/orders + per-carrier generated ─
// Tasks reference real per-carrier asset ids (CARRIER_ASSETS); orders
// reference real per-carrier vendor ids (VENDORS). See the generator at
// `src/pages/assets/carrier-work-orders.data.ts`.

import {
    CARRIER_GENERATED_TASKS,
    CARRIER_GENERATED_ORDERS,
    CARRIER_WORK_ORDERS_BY_CARRIER,
} from "./carrier-work-orders.data";

export const INITIAL_TASKS: MaintenanceTask[] = [
    ...ACME_INITIAL_TASKS,
    ...CARRIER_GENERATED_TASKS,
];

export const INITIAL_ORDERS: TaskOrder[] = [
    ...ACME_INITIAL_ORDERS,
    ...CARRIER_GENERATED_ORDERS,
];

const ACME_ID = "acct-001";

/** Returns the maintenance tasks scoped to a single carrier. Acme keeps its
 *  hand-curated demo rows and also receives generated rows for real asset ids. */
export function getTasksForCarrier(accountId: string): MaintenanceTask[] {
    const generated = CARRIER_WORK_ORDERS_BY_CARRIER[accountId]?.tasks ?? [];
    if (accountId === ACME_ID) return [...ACME_INITIAL_TASKS, ...generated];
    return generated;
}

/** Returns the work orders scoped to a single carrier. Mirrors getTasksForCarrier. */
export function getOrdersForCarrier(accountId: string): TaskOrder[] {
    const generated = CARRIER_WORK_ORDERS_BY_CARRIER[accountId]?.orders ?? [];
    if (accountId === ACME_ID) return [...ACME_INITIAL_ORDERS, ...generated];
    return generated;
}
