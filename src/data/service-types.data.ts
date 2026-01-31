import type { ServiceType } from "@/types/service-types";

// Helper type for groups - in a real app this might be in the types file
type ServiceGroup = "Engine" | "Tires & Brakes" | "Inspections" | "General";

export const INITIAL_SERVICE_TYPES: (ServiceType & { group: ServiceGroup })[] = [
    // CMV Only
    { id: "transmission_fluid_filter", name: "Transmission Fluid & Filter", category: "cmv_only", group: "Engine" },
    { id: "engine_coolant", name: "Engine Coolant", category: "cmv_only", group: "Engine" },
    { id: "cooling_system_flush", name: "Cooling System Flush", category: "cmv_only", group: "Engine" },
    { id: "front_end_alignment", name: "Front End Alignment", category: "cmv_only", group: "Tires & Brakes" },
    { id: "power_steering_brake_fluid", name: "Power Steering / Brake Fluid", category: "cmv_only", group: "Tires & Brakes" },
    { id: "engine_repair", name: "Engine", category: "cmv_only", group: "Engine" },

    // Non-CMV Only
    { id: "wash_wax", name: "Wash & Wax", category: "non_cmv_only", group: "General" },
    { id: "tune_up", name: "Tune-Up", category: "non_cmv_only", group: "Engine" },

    // Both
    { id: "oil_filter_change", name: "Oil & Filter Change", category: "both_cmv_and_non_cmv", group: "Engine" },
    { id: "air_filter_change", name: "Air Filter Change", category: "both_cmv_and_non_cmv", group: "Engine" },
    { id: "fuel_filter_change", name: "Fuel Filter Change", category: "both_cmv_and_non_cmv", group: "Engine" },
    { id: "tire_repair_replacement", name: "Tire Repair or Replacement", category: "both_cmv_and_non_cmv", group: "Tires & Brakes" },
    { id: "tire", name: "Tire", category: "both_cmv_and_non_cmv", group: "Tires & Brakes" },
    { id: "rotation_balance", name: "Rotation or Balance", category: "both_cmv_and_non_cmv", group: "Tires & Brakes" },
    { id: "hose", name: "Hose", category: "both_cmv_and_non_cmv", group: "Engine" },
    { id: "replacement", name: "Replacement", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "brake_repair", name: "Brake Repair", category: "both_cmv_and_non_cmv", group: "Tires & Brakes" },
    { id: "ac_heater_repair", name: "A/C or Heater Repair", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "replace_belts", name: "Replace Belts", category: "both_cmv_and_non_cmv", group: "Engine" },
    { id: "electrical_repairs", name: "Electrical Repairs", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "battery_replacement", name: "Battery Replacement", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "battery_cables_terminals", name: "Battery Cables / Terminals", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "headlights_bulbs", name: "Headlights or Light Bulbs", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "wiper_blades", name: "Windshield Wiper Blades", category: "both_cmv_and_non_cmv", group: "General" },
    { id: "misc_service", name: "Miscellaneous Service", category: "both_cmv_and_non_cmv", group: "General" }
];
