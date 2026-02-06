import type { ServiceType } from "@/types/service-types";

export const INITIAL_SERVICE_TYPES: ServiceType[] = [
    // Safety Inspection
    { 
        id: "safety_brakes_inspection",
        name: "Brakes Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect brake pads, discs, drums, and brake lines for wear and proper operation."
    },
    { 
        id: "safety_lights_inspection",
        name: "Lights Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect headlights, brake lights, turn signals, and hazard lights for proper functionality."
    },
    { 
        id: "safety_tire_inspection",
        name: "Tire Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Check tire pressure, tread depth, and overall tire condition."
    },
    { 
        id: "safety_fluid_level",
        name: "Fluid Level Check",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect and top off engine oil, coolant, brake fluid, power steering fluid, and windshield washer fluid."
    },
    { 
        id: "safety_belts_hoses",
        name: "Belts and Hoses",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect belts and hoses for signs of wear, cracking, or leaks."
    },
    { 
        id: "safety_battery_inspection",
        name: "Battery Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect battery terminals for corrosion and ensure secure connections."
    },
    { 
        id: "safety_wipers_washers",
        name: "Wipers and Washers",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Check windshield wiper blades and washer system functionality."
    },
    { 
        id: "safety_mirrors_glass",
        name: "Mirrors and Glass",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect mirrors and glass for cracks or damage that may impair visibility."
    },
    { 
        id: "safety_emergency_equipment",
        name: "Emergency Equipment",
        category: "cmv_only",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Ensure all emergency equipment such as fire extinguishers, first aid kits, and reflective triangles are present and in good condition."
    },
    { 
        id: "safety_safety_equipment",
        name: "Safety Equipment",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: "Inspect seat belts and other safety devices for proper operation."
    },

    // Intermediate Service
    { 
        id: "inter_oil_filter",
        name: "Oil and Filter Change",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Replace engine oil and oil filter."
    },
    { 
        id: "inter_fuel_system",
        name: "Fuel System Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect fuel lines, connections, and fuel filter and replace if necessary."
    },
    { 
        id: "inter_cooling_system",
        name: "Cooling System Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect radiator, hoses, and cooling system for leaks and coolant condition."
    },
    { 
        id: "inter_driveline",
        name: "Driveline Inspection",
        category: "cmv_only",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect driveshaft, U-joints, and axles for wear and proper operation."
    },
    { 
        id: "inter_suspension_steering",
        name: "Suspension and Steering",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect suspension components and steering system for wear, play, and alignment issues."
    },
    { 
        id: "inter_brake_detailed",
        name: "Brake System Detailed Inspection",
        category: "cmv_only",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Perform detailed inspection of brake system including ABS and air brake components."
    },
    { 
        id: "inter_exhaust",
        name: "Exhaust System Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect exhaust system for leaks, damage, or excessive wear."
    },
    { 
        id: "inter_transmission",
        name: "Transmission Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Check transmission fluid level, condition, mounts, and connections."
    },
    { 
        id: "inter_electrical",
        name: "Electrical System Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect alternator, starter, wiring, and electrical connections."
    },
    { 
        id: "inter_fluid_condition",
        name: "Fluid Condition Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Intermediate Service",
        complexity: "Moderate",
        description: "Inspect all vehicle fluids for contamination and replace if required."
    },

    // Comprehensive Service
    { 
        id: "comp_wheel_alignment",
        name: "Wheel Alignment",
        category: "both_cmv_and_non_cmv",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Perform full wheel alignment and adjustment."
    },
    { 
        id: "comp_wear_component",
        name: "Wear Component Replacement",
        category: "both_cmv_and_non_cmv",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Replace wear items such as brake pads, belts, hoses, and filters."
    },
    { 
        id: "comp_engine_detailed",
        name: "Engine Detailed Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Conduct detailed engine inspection including timing components, spark plugs, and fuel injectors."
    },
    { 
        id: "comp_transmission_service",
        name: "Transmission Service",
        category: "both_cmv_and_non_cmv",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Perform complete transmission service including fluid and filter replacement."
    },
    { 
        id: "comp_differential_axle",
        name: "Differential and Axle Inspection",
        category: "cmv_only",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Inspect differential fluid and axle components for wear or damage."
    },
    { 
        id: "comp_dot_inspection",
        name: "Annual DOT Inspection",
        category: "cmv_only",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Perform a full vehicle inspection to meet DOT compliance requirements."
    },
    { 
        id: "comp_hydraulic",
        name: "Hydraulic System Service",
        category: "cmv_only",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Inspect and service all hydraulic systems on the vehicle."
    },
    { 
        id: "comp_ac_system",
        name: "Air Conditioning System",
        category: "both_cmv_and_non_cmv",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Inspect AC system for leaks, refrigerant levels, and performance."
    },
    { 
        id: "comp_chassis_lube",
        name: "Chassis Lubrication",
        category: "cmv_only",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Lubricate all chassis points including ball joints, tie rods, and sway bars."
    },
    { 
        id: "comp_electrical_comprehensive",
        name: "Comprehensive Electrical Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Comprehensive Service",
        complexity: "Extensive",
        description: "Inspect all electrical systems including sensors and control units."
    },

    // Major Overhaul
    { 
        id: "major_engine_rebuild",
        name: "Engine Rebuild or Replacement",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Rebuild or replace engine including all internal components."
    },
    { 
        id: "major_transmission_rebuild",
        name: "Transmission Rebuild or Replacement",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Rebuild or replace the transmission assembly."
    },
    { 
        id: "major_axle_overhaul",
        name: "Axle and Differential Overhaul",
        category: "cmv_only",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Perform complete overhaul of axles and differential components."
    },
    { 
        id: "major_suspension_overhaul",
        name: "Suspension System Overhaul",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Replace all suspension components including springs, shocks, struts, and bushings."
    },
    { 
        id: "major_electrical_overhaul",
        name: "Electrical System Overhaul",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Replace or upgrade major electrical components and vehicle wiring."
    },
    { 
        id: "major_body_work",
        name: "Cab and Body Work",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Perform cab and body repairs including structural work and repainting if required."
    },
    { 
        id: "major_cooling_overhaul",
        name: "Cooling System Overhaul",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Replace radiator, water pump, thermostat, and all cooling system components."
    },
    { 
        id: "major_brake_overhaul",
        name: "Brake System Overhaul",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Replace all brake system components including calipers, rotors, drums, and lines."
    },
    { 
        id: "major_fuel_overhaul",
        name: "Fuel System Overhaul",
        category: "both_cmv_and_non_cmv",
        group: "Major Overhaul",
        complexity: "Intensive",
        description: "Replace or rebuild fuel tank, pumps, and fuel injectors."
    },

    // Other
    {
        id: "other_unscheduled_inspection",
        name: "Unscheduled Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Basic",
        description: "Perform an unscheduled inspection based on driver feedback or observed issues."
    },
    {
        id: "other_roadside_repair",
        name: "Roadside Repair",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Moderate",
        description: "Perform roadside repair to address unexpected mechanical or safety issues."
    },
    {
        id: "other_post_incident_inspection",
        name: "Post-Incident Inspection",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Moderate",
        description: "Inspect vehicle after an accident or incident to assess damage and safety compliance."
    },
    {
        id: "other_seasonal_preparation",
        name: "Seasonal Preparation",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Moderate",
        description: "Prepare vehicle for seasonal conditions such as winterization or summer readiness."
    },
    {
        id: "other_recall_campaign",
        name: "Recall or Manufacturer Campaign",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Extensive",
        description: "Perform repairs or inspections related to manufacturer recalls or service campaigns."
    },
    {
        id: "other_diagnostic_scan",
        name: "Diagnostic Scan",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Moderate",
        description: "Run diagnostic scans to identify fault codes and system issues."
    },
    {
        id: "other_custom_maintenance",
        name: "Custom Maintenance Task",
        category: "both_cmv_and_non_cmv",
        group: "Other",
        complexity: "Basic",
        description: "Perform a custom maintenance task defined by fleet management or maintenance staff."
    }
];
