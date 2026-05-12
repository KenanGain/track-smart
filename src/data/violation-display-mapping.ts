// Display-level Category / Sub-category mapping for the Violations chart.
//
// The canonical Category and Sub-category labels are taken verbatim from
// `docs/inspection_violations_display_description_only_combined.txt`.
//
//   • Category      = the txt-file headings (Hours-of-Service, Driver Fitness,
//                     Controlled Substance, Unsafe Driving, Vehicle Maintenance,
//                     Hazardous Materials, Other).
//   • Sub-category  = the per-section "Display Name" rows (e.g. "Driver -
//                     Speeding", "Vehicle - Brakes out of adjustment", etc.).
//
// `resolveViolationDisplay()` accepts an item from `VIOLATION_DATA` plus its
// internal category key and returns the canonical pair. The resolver runs a
// per-category set of matchers in priority order (most-specific first), with
// a per-internal-category fallback so every item always has a Sub-category.

import type { ViolationItem } from '@/types/violations.types';

// ── Canonical labels ───────────────────────────────────────────────────────

export type DisplayCategory =
    | 'Hours-of-Service'
    | 'Driver Fitness'
    | 'Controlled Substance'
    | 'Unsafe Driving'
    | 'Vehicle Maintenance'
    | 'Hazardous Materials'
    | 'Other';

export const DISPLAY_CATEGORIES: DisplayCategory[] = [
    'Vehicle Maintenance',
    'Driver Fitness',
    'Hours-of-Service',
    'Unsafe Driving',
    'Controlled Substance',
    'Hazardous Materials',
    'Other',
];

export const DISPLAY_SUBCATEGORIES_BY_CATEGORY: Record<DisplayCategory, string[]> = {
    'Hours-of-Service': [
        'Driver - 10/15 Hours',
        'Driver - 60/70/80 Hours',
        'Driver - All Other Hours of Service',
        'Driver - False Log Book',
        'Driver - No Log Book/Log Not Current',
        'Driver - State/Local Hours of Service',
    ],
    'Driver Fitness': [
        'Driver - Medical Certificate',
        'Driver - Disqualified Drivers',
    ],
    'Controlled Substance': [
        'Driver - Alcohol',
        'Driver - Drugs',
    ],
    'Unsafe Driving': [
        'Driver - Failure to Obey Traffic Control Device',
        'Driver - Failure to Yield Right of Way',
        'Driver - Following Too Close',
        'Driver - Improper Lane Change',
        'Driver - Improper Passing',
        'Driver - Improper Turns',
        'Driver - Radar Detectors',
        'Driver - Reckless Driving',
        'Driver - Seat Belt',
        'Driver - Speeding',
        'Driver - Traffic Enforcement',
    ],
    'Vehicle Maintenance': [
        'Vehicle - All Other Brake Violations',
        'Vehicle - All Other Vehicle Defects',
        'Vehicle - Brakes out of adjustment',
        'Vehicle - Coupling Devices',
        'Vehicle - Emergency Equipment',
        'Vehicle - Exhaust Discharge',
        'Vehicle - Frames',
        'Vehicle - Fuel Systems',
        'Vehicle - Lighting',
        'Vehicle - Load Securement',
        'Vehicle - Periodic Inspection',
        'Vehicle - Steering Mechanism',
        'Vehicle - Suspension',
        'Vehicle - Tires',
        'Vehicle - Wheels/Studs/Clamps',
        'Vehicle - Windshield',
    ],
    'Hazardous Materials': [
        'Hazmat - Accepting Shipment Improperly Marked',
        'Hazmat - All Other Hazmat Violations',
        'Hazmat - Emergency Response',
        'Hazmat - Improper Blocking and Bracing',
        'Hazmat - Improper Placarding',
        'Hazmat - No Remote Shutoff Control',
        'Hazmat - No Retest and Inspection (Cargo Tank)',
        'Hazmat - Shipping Paper',
        'Hazmat - Use of Non-Specification Container',
    ],
    'Other': [
        'Driver - Size and Weight',
        'Driver - All Other Driver Violations',
        'Unknown',
    ],
};

// ── Tone palette for category badges ───────────────────────────────────────

export const DISPLAY_CATEGORY_TONE: Record<DisplayCategory, string> = {
    'Vehicle Maintenance':  'bg-blue-50 text-blue-700 border-blue-200',
    'Driver Fitness':       'bg-violet-50 text-violet-700 border-violet-200',
    'Hours-of-Service':     'bg-amber-50 text-amber-700 border-amber-200',
    'Unsafe Driving':       'bg-rose-50 text-rose-700 border-rose-200',
    'Controlled Substance': 'bg-red-50 text-red-700 border-red-200',
    'Hazardous Materials':  'bg-orange-50 text-orange-700 border-orange-200',
    'Other':                'bg-slate-50 text-slate-700 border-slate-200',
};

// ── Matcher rules ──────────────────────────────────────────────────────────

interface MatchRule {
    category: DisplayCategory;
    subCategory: string;
    /** Tested against `violationGroup` (case-insensitive). */
    group?: RegExp;
    /** Tested against `violationDescription` (case-insensitive). */
    desc?: RegExp;
}

// Per-internal-category rule sets. First match wins inside a category.
// Each rule needs at least one of `group` / `desc`.

const RULES_VEHICLE_MAINTENANCE: MatchRule[] = [
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Brakes out of adjustment', group: /Brakes Out of Adjustment/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - All Other Brake Violations', group: /Brakes, All Others/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - All Other Brake Violations', desc: /\bbrake/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Frames', group: /Cab,? Body,? Frame/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Coupling Devices', group: /Coupling/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Emergency Equipment', group: /Emergency Equipment/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Exhaust Discharge', group: /Exhaust/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Fuel Systems', group: /Fuel/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Lighting', group: /Lighting|Reflective Sheeting|Clearance Identification Lamps/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Load Securement', group: /Load Securement|General Securement|Tiedown|Securement Device|Failure to Prevent Movement|Warning Flags/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Periodic Inspection', group: /Inspection Reports/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Steering Mechanism', group: /Steering/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Suspension', group: /Suspension/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Tires', group: /Tires|Tire vs\.? Load/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Wheels/Studs/Clamps', group: /Wheels,? Studs,? Clamps/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Windshield', group: /Windshield/i },
];

const RULES_HAZMAT: MatchRule[] = [
    { category: 'Hazardous Materials', subCategory: 'Hazmat - Improper Placarding', group: /Markings.{0,4}HM/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - Shipping Paper', group: /Documentation.{0,4}HM/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - Improper Blocking and Bracing', group: /Cargo Protection.{0,4}HM|Load Securement.{0,4}HM/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - Use of Non-Specification Container', group: /Package Integrity/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - No Retest and Inspection (Cargo Tank)', desc: /cargo tank.{0,40}(retest|periodic|inspection)|(retest|periodic test).{0,30}cargo tank/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - No Remote Shutoff Control', desc: /remote shut.?off|remote shutdown/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - Accepting Shipment Improperly Marked', desc: /accept.{0,40}shipment|improperly marked/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - Emergency Response', desc: /emergency response/i },
    { category: 'Hazardous Materials', subCategory: 'Hazmat - All Other Hazmat Violations', group: /HM Other|HM Related|HM Route|Fire Hazard.{0,4}HM/i },
];

const RULES_DRIVER_FITNESS: MatchRule[] = [
    { category: 'Driver Fitness', subCategory: 'Driver - Medical Certificate', group: /Medical Certificate|Physical/i },
    { category: 'Driver Fitness', subCategory: 'Driver - Medical Certificate', desc: /medical (cert|examiner|qualif)|physical exam/i },
    { category: 'Driver Fitness', subCategory: 'Driver - Disqualified Drivers', group: /License-related|General Driver Qualification|Compulsory Automobile Insurance|Fitness\/ Jumping OOS|Ontario – MVR/i },
    { category: 'Driver Fitness', subCategory: 'Driver - Disqualified Drivers', desc: /disqualif|cdl|driver.?s license|suspended license|expired license/i },
    // Size & Weight items mis-categorised under driver_fitness in the source data:
    { category: 'Other', subCategory: 'Driver - Size and Weight', group: /Ontario – CTA/i },
    { category: 'Other', subCategory: 'Driver - Size and Weight', desc: /size and weight|axle weight|gross weight|over.?weight|over.?length|over.?width|over.?size/i },
];

const RULES_CONTROLLED: MatchRule[] = [
    // Impaired-driving items first — desc keywords beat the generic group rule.
    { category: 'Controlled Substance', subCategory: 'Driver - Alcohol', desc: /\balcohol\b|\bbac\b|intoxicat|impaired (faculties|driv|abil)/i },
    { category: 'Controlled Substance', subCategory: 'Driver - Drugs', desc: /\bdrug|controlled subst|narcotic|impaired by drug/i },
    { category: 'Controlled Substance', subCategory: 'Driver - Alcohol', group: /Alcohol/i },
    { category: 'Controlled Substance', subCategory: 'Driver - Drugs', group: /Drugs/i },
];

const RULES_HOS: MatchRule[] = [
    { category: 'Hours-of-Service', subCategory: 'Driver - False Log Book', desc: /false (log|record|entry|report)|falsif(y|ied|ication)/i },
    { category: 'Hours-of-Service', subCategory: 'Driver - State/Local Hours of Service', desc: /state\/local hours|state\/local laws? hours/i },
    { category: 'Hours-of-Service', subCategory: 'Driver - 10/15 Hours', desc: /\b(10|11|14|15)[-\s]?hour\b|11 consecutive|maximum (driving|on-duty)|driving (after|past) (10|11|14|15)/i },
    { category: 'Hours-of-Service', subCategory: 'Driver - 60/70/80 Hours', desc: /\b(60|70|80)[-\s]?hour\b|cycle.{0,15}(60|70|80)/i },
    { category: 'Hours-of-Service', subCategory: 'Driver - No Log Book/Log Not Current', group: /Logbook/i },
    { category: 'Hours-of-Service', subCategory: 'Driver - No Log Book/Log Not Current', desc: /(no|missing|not current|not up to date).{0,30}(log|record of duty|rods)|\bRODS\b|fail.{0,15}log/i },
];

const RULES_UNSAFE: MatchRule[] = [
    // Specific behaviour-based matches first, then generic group fallbacks.
    { category: 'Unsafe Driving', subCategory: 'Driver - Speeding', group: /Speeding/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Speeding', desc: /\bspeeding\b|speed.{0,10}limit/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Following Too Close', desc: /follow.{0,15}too clos|tailgat/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Failure to Yield Right of Way', desc: /fail.{0,30}(to )?yield/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Failure to Obey Traffic Control Device', desc: /(traffic control device|disobey traffic|disobey.{0,15}signal|fail.{0,15}stop.{0,15}(sign|signal|light))/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Improper Lane Change', desc: /lane change|improper lane|unsafe lane/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Improper Passing', desc: /improper pass|unsafe pass/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Improper Turns', desc: /improper turn|unsafe turn/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Radar Detectors', desc: /radar detector/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Reckless Driving', group: /Dangerous Driving|Reckless Driving|Criminal Code/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Reckless Driving', desc: /reckless driv|dangerous driv|negligen|criminal negligence/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Seat Belt', group: /Seat Belt/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Seat Belt', desc: /seat belt|safety belt/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Traffic Enforcement', group: /Texting|Phone Call/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Traffic Enforcement', desc: /text(ing)? while|hand.?held (mobile|phone|tel)|cell.?phone|using a mobile/i },
];

// canada_provincial items mix everything. Description-keyword rules first
// (cross-category), with Other / All-Other as the fallback.
const RULES_CANADA_PROVINCIAL: MatchRule[] = [
    // Hazmat first (specific keywords)
    { category: 'Hazardous Materials', subCategory: 'Hazmat - All Other Hazmat Violations', desc: /\bhazmat|hazardous (materials|goods|wastes?)|dangerous goods|tdg|placard/i },
    // Controlled substance
    { category: 'Controlled Substance', subCategory: 'Driver - Alcohol', desc: /\balcohol\b|\bbac\b|intoxicat|impaired (faculties|driv|abil)/i },
    { category: 'Controlled Substance', subCategory: 'Driver - Drugs', desc: /\bdrug|controlled subst|narcotic|cannabis|marijuana/i },
    // Unsafe driving
    { category: 'Unsafe Driving', subCategory: 'Driver - Speeding', desc: /\bspeed/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Following Too Close', desc: /follow.{0,15}too clos|tailgat/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Failure to Yield Right of Way', desc: /fail.{0,30}(to )?yield/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Failure to Obey Traffic Control Device', desc: /traffic control device|disobey traffic|disobey.{0,15}signal/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Improper Lane Change', desc: /lane change|improper lane|unsafe lane/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Improper Passing', desc: /improper pass|unsafe pass/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Improper Turns', desc: /improper turn|unsafe turn/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Reckless Driving', desc: /reckless|dangerous driv|criminal negligence/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Seat Belt', desc: /seat belt|safety belt/i },
    { category: 'Unsafe Driving', subCategory: 'Driver - Traffic Enforcement', desc: /text(ing)? while|hand.?held (mobile|phone)|cell.?phone/i },
    // Driver fitness / qualifications
    { category: 'Driver Fitness', subCategory: 'Driver - Disqualified Drivers', desc: /disqualif|driver.?s license|suspended license|expired license|insurance|cdl/i },
    { category: 'Driver Fitness', subCategory: 'Driver - Medical Certificate', desc: /medical cert|physical exam/i },
    // Size & weight
    { category: 'Other', subCategory: 'Driver - Size and Weight', desc: /size and weight|axle weight|gross weight|over.?weight|over.?length|over.?width|over.?size|exceeds.{0,15}(weight|length|dimension)/i },
    // Vehicle defects (only if obviously vehicle-related)
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Tires', desc: /\btire\b/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Lighting', desc: /\blighting|lamps?|headlamp|reflective sheeting/i },
    { category: 'Vehicle Maintenance', subCategory: 'Vehicle - Load Securement', desc: /load secur|tiedown/i },
];

const RULES_BY_INTERNAL_CAT: Record<string, MatchRule[]> = {
    vehicle_maintenance:           RULES_VEHICLE_MAINTENANCE,
    hazmat_compliance:             RULES_HAZMAT,
    driver_fitness:                RULES_DRIVER_FITNESS,
    controlled_substances_alcohol: RULES_CONTROLLED,
    hours_of_service:              RULES_HOS,
    unsafe_driving:                RULES_UNSAFE,
    canada_provincial:             RULES_CANADA_PROVINCIAL,
};

// ── Resolver ───────────────────────────────────────────────────────────────

interface DisplayMapping {
    category: DisplayCategory;
    subCategory: string;
}

const FALLBACK_BY_INTERNAL_CAT: Record<string, DisplayMapping> = {
    vehicle_maintenance:           { category: 'Vehicle Maintenance',   subCategory: 'Vehicle - All Other Vehicle Defects' },
    driver_fitness:                { category: 'Driver Fitness',        subCategory: 'Driver - Disqualified Drivers' },
    hours_of_service:              { category: 'Hours-of-Service',      subCategory: 'Driver - All Other Hours of Service' },
    unsafe_driving:                { category: 'Unsafe Driving',        subCategory: 'Driver - Traffic Enforcement' },
    controlled_substances_alcohol: { category: 'Controlled Substance',  subCategory: 'Driver - Drugs' },
    hazmat_compliance:             { category: 'Hazardous Materials',   subCategory: 'Hazmat - All Other Hazmat Violations' },
    canada_provincial:             { category: 'Other',                 subCategory: 'Driver - All Other Driver Violations' },
};

const DEFAULT_FALLBACK: DisplayMapping = { category: 'Other', subCategory: 'Unknown' };

export function resolveViolationDisplay(
    item: Pick<ViolationItem, 'violationGroup' | 'violationDescription'>,
    internalCategoryKey: string,
): DisplayMapping {
    const group = item.violationGroup ?? '';
    const desc = item.violationDescription ?? '';
    const rules = RULES_BY_INTERNAL_CAT[internalCategoryKey] ?? [];

    for (const rule of rules) {
        if (rule.group && !rule.group.test(group)) continue;
        if (rule.desc && !rule.desc.test(desc)) continue;
        if (!rule.group && !rule.desc) continue;
        return { category: rule.category, subCategory: rule.subCategory };
    }
    return FALLBACK_BY_INTERNAL_CAT[internalCategoryKey] ?? DEFAULT_FALLBACK;
}
