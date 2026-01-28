import type { ServiceType } from "@/types/service-types";

export const INITIAL_SERVICE_TYPES: ServiceType[] = [
    // CMV Only
    { id: "transmission_fluid_filter", name: "Transmission Fluid & Filter", category: "cmv_only" },
    { id: "engine_coolant", name: "Engine Coolant", category: "cmv_only" },
    { id: "cooling_system_flush", name: "Cooling System Flush", category: "cmv_only" },
    { id: "front_end_alignment", name: "Front End Alignment", category: "cmv_only" },
    { id: "power_steering_brake_fluid", name: "Power Steering / Brake Fluid", category: "cmv_only" },
    { id: "engine_repair", name: "Engine", category: "cmv_only" },

    // Non-CMV Only
    { id: "wash_wax", name: "Wash & Wax", category: "non_cmv_only" },
    { id: "tune_up", name: "Tune-Up", category: "non_cmv_only" },

    // Both
    { id: "oil_filter_change", name: "Oil & Filter Change", category: "both_cmv_and_non_cmv" },
    { id: "air_filter_change", name: "Air Filter Change", category: "both_cmv_and_non_cmv" },
    { id: "fuel_filter_change", name: "Fuel Filter Change", category: "both_cmv_and_non_cmv" },
    { id: "tire_repair_replacement", name: "Tire Repair or Replacement", category: "both_cmv_and_non_cmv" },
    { id: "tire", name: "Tire", category: "both_cmv_and_non_cmv" },
    { id: "rotation_balance", name: "Rotation or Balance", category: "both_cmv_and_non_cmv" },
    { id: "hose", name: "Hose", category: "both_cmv_and_non_cmv" },
    { id: "replacement", name: "Replacement", category: "both_cmv_and_non_cmv" },
    { id: "brake_repair", name: "Brake Repair", category: "both_cmv_and_non_cmv" },
    { id: "ac_heater_repair", name: "A/C or Heater Repair", category: "both_cmv_and_non_cmv" },
    { id: "replace_belts", name: "Replace Belts", category: "both_cmv_and_non_cmv" },
    { id: "electrical_repairs", name: "Electrical Repairs", category: "both_cmv_and_non_cmv" },
    { id: "battery_replacement", name: "Battery Replacement", category: "both_cmv_and_non_cmv" },
    { id: "battery_cables_terminals", name: "Battery Cables / Terminals", category: "both_cmv_and_non_cmv" },
    { id: "headlights_bulbs", name: "Headlights or Light Bulbs", category: "both_cmv_and_non_cmv" },
    { id: "wiper_blades", name: "Windshield Wiper Blades", category: "both_cmv_and_non_cmv" },
    { id: "misc_service", name: "Miscellaneous Service", category: "both_cmv_and_non_cmv" }
];
