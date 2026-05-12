// Accident Type catalogue used by the Settings → Accidents config page
// and by the Beta Safety Analysis → Accident/Collision sub-menu.
//
// Each accident type carries a `defaultClassMapping` that maps it onto the
// regulatory / behavioural taxonomies the platform reports against:
//
//   • FMCSA Inspection levels  (United States)
//   • CVOR Collision classes   (Ontario CVOR)
//   • NSC Alberta Assessment   (Carrier Profile, AB)
//   • NSC BC Accident classes  (Carrier Profile, BC)
//   • PEI Collision            (Collisions / Severity / Fault / Injured)
//   • NS Collision             (Collision / Severity)
//   • Driver-action triggers   (telematics / event-based)
//   • Vehicle-action triggers  (mechanical / equipment-based)
//
// The Beta Safety Analysis page reads this catalogue and renders accident
// data grouped by whichever jurisdiction or trigger lens the user picks.
// The Accident Settings page lets admins edit these mappings per type.

export type AccidentRiskType = 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';

export type AccidentGroup =
    | 'Severity'
    | 'Outcome'
    | 'Cause'
    | 'Context'
    | 'Collision'
    | 'Compliance';

// ── Regulatory / behavioural class taxonomies ──────────────────────────────

export const FMCSA_INSPECTION_CLASSES = [
    'Post-Crash Inspection',
    'Level I — Full',
    'Level II — Walk-Around',
    'Level III — Driver-Only',
    'Level IV — Special Study',
    'Level V — Vehicle-Only',
    'Level VI — Enhanced NAS HM',
] as const;

export const CVOR_COLLISION_CLASSES = [
    'Fatal',
    'Personal Injury',
    'Property Damage',
    'Reportable',
    'Non-Reportable',
] as const;

export const NSC_AB_ASSESSMENT_CLASSES = [
    'Reviewable Collision',
    'Non-Reviewable Collision',
    'At-Fault',
    'Not-At-Fault',
    'Major',
    'Minor',
] as const;

export const NSC_BC_ACCIDENT_CLASSES = [
    'Reportable Accident',
    'Casualty Accident',
    'Property Damage Only',
    'Hit-and-Run',
] as const;

export const NSC_PEI_COLLISION = {
    Collisions: ['Reportable', 'Non-Reportable'],
    Severity:   ['Fatal', 'Injury', 'Property Damage Only'],
    Fault:      ['At-Fault', 'Not-At-Fault', 'Shared / Pending'],
    Injured:    ['Driver', 'Passenger', 'Pedestrian / Cyclist', 'Other'],
} as const;

export const NSC_NS_COLLISION = {
    Collision: ['Reportable', 'Non-Reportable'],
    Severity:  ['Fatal', 'Injury', 'Property Damage Only'],
} as const;

export const DRIVER_ACTION_TRIGGERS = [
    'Harsh Brake',
    'Harsh Acceleration',
    'Harsh Cornering',
    'Speeding',
    'Lane Departure',
    'Following Too Close',
    'Distracted Driving',
    'Drowsy / Fatigued',
    'Mobile Phone Use',
    'Seat-Belt Off',
] as const;

export const VEHICLE_ACTION_TRIGGERS = [
    'Brake Failure',
    'Tire Blowout',
    'Engine Failure',
    'Steering Failure',
    'Lighting Failure',
    'Coupling / Trailer Failure',
    'ABS / Stability Fault',
    'Cargo Shift',
] as const;

export interface AccidentClassMapping {
    fmcsaInspection?: string[];
    cvorCollision?: string[];
    nscAbAssessment?: string[];
    nscBcAccidents?: string[];
    peiCollision?: {
        Collisions?: string[];
        Severity?: string[];
        Fault?: string[];
        Injured?: string[];
    };
    nsCollision?: {
        Collision?: string[];
        Severity?: string[];
    };
    driverActions?: string[];
    vehicleActions?: string[];
}

// Lens / jurisdiction registry — drives the class-mapping editor in the
// settings modal AND the grouping options on the Beta Safety Analysis page.
export const CLASS_MAPPING_LENSES: Array<{
    key: keyof AccidentClassMapping;
    label: string;
    short: string;
    description: string;
    /** Either a flat list, or a map of sub-fields → values. */
    options: readonly string[] | Record<string, readonly string[]>;
}> = [
    { key: 'fmcsaInspection', label: 'FMCSA Inspection',         short: 'FMCSA',  description: 'Inspection level / post-crash classification (US).',                       options: FMCSA_INSPECTION_CLASSES },
    { key: 'cvorCollision',   label: 'CVOR Collision (Ontario)', short: 'CVOR',   description: 'Ontario CVOR collision classification used in the Carrier Profile.',       options: CVOR_COLLISION_CLASSES },
    { key: 'nscAbAssessment', label: 'NSC Alberta Assessment',   short: 'NSC AB', description: 'Alberta carrier-profile assessment of collisions.',                          options: NSC_AB_ASSESSMENT_CLASSES },
    { key: 'nscBcAccidents',  label: 'NSC BC Accidents',         short: 'NSC BC', description: 'BC carrier-profile accident class.',                                          options: NSC_BC_ACCIDENT_CLASSES },
    { key: 'peiCollision',    label: 'NSC PEI Collision',        short: 'PEI',    description: 'PEI collision report — Collisions, Severity, Fault, Injured.',               options: NSC_PEI_COLLISION },
    { key: 'nsCollision',     label: 'NSC Nova Scotia Collision', short: 'NS',    description: 'Nova Scotia collision report — Collision and Severity.',                     options: NSC_NS_COLLISION },
    { key: 'driverActions',   label: 'Driver Action Triggers',   short: 'Driver', description: 'Telematics / behavioural events that should also surface this accident type.', options: DRIVER_ACTION_TRIGGERS },
    { key: 'vehicleActions',  label: 'Vehicle Action Triggers',  short: 'Vehicle',description: 'Mechanical / equipment-based events that surface this accident type.',         options: VEHICLE_ACTION_TRIGGERS },
];

export const LENS_TONE: Record<keyof AccidentClassMapping, string> = {
    fmcsaInspection:  'bg-blue-50 text-blue-700 border-blue-200',
    cvorCollision:    'bg-rose-50 text-rose-700 border-rose-200',
    nscAbAssessment:  'bg-amber-50 text-amber-700 border-amber-200',
    nscBcAccidents:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    peiCollision:     'bg-violet-50 text-violet-700 border-violet-200',
    nsCollision:      'bg-indigo-50 text-indigo-700 border-indigo-200',
    driverActions:    'bg-pink-50 text-pink-700 border-pink-200',
    vehicleActions:   'bg-orange-50 text-orange-700 border-orange-200',
};

// Helper: count total mapped values across all lenses.
export function classMappingCount(m?: AccidentClassMapping): number {
    if (!m) return 0;
    let n = 0;
    n += (m.fmcsaInspection?.length ?? 0);
    n += (m.cvorCollision?.length ?? 0);
    n += (m.nscAbAssessment?.length ?? 0);
    n += (m.nscBcAccidents?.length ?? 0);
    n += (m.peiCollision?.Collisions?.length ?? 0);
    n += (m.peiCollision?.Severity?.length ?? 0);
    n += (m.peiCollision?.Fault?.length ?? 0);
    n += (m.peiCollision?.Injured?.length ?? 0);
    n += (m.nsCollision?.Collision?.length ?? 0);
    n += (m.nsCollision?.Severity?.length ?? 0);
    n += (m.driverActions?.length ?? 0);
    n += (m.vehicleActions?.length ?? 0);
    return n;
}

// Helper: count distinct lenses that have any value (used for column badges).
export function classMappingLensCount(m?: AccidentClassMapping): number {
    if (!m) return 0;
    let n = 0;
    if (m.fmcsaInspection?.length) n++;
    if (m.cvorCollision?.length) n++;
    if (m.nscAbAssessment?.length) n++;
    if (m.nscBcAccidents?.length) n++;
    if ((m.peiCollision?.Collisions?.length ?? 0) + (m.peiCollision?.Severity?.length ?? 0) + (m.peiCollision?.Fault?.length ?? 0) + (m.peiCollision?.Injured?.length ?? 0) > 0) n++;
    if ((m.nsCollision?.Collision?.length ?? 0) + (m.nsCollision?.Severity?.length ?? 0) > 0) n++;
    if (m.driverActions?.length) n++;
    if (m.vehicleActions?.length) n++;
    return n;
}

// ── Type definition ────────────────────────────────────────────────────────

export interface AccidentTypeDef {
    id: string;
    group: AccidentGroup;
    displayName: string;
    description: string;
    defaultRiskType: AccidentRiskType;
    defaultRiskPoints: number;
    /** Default mapping into the regulatory / behavioural taxonomies. */
    defaultClassMapping?: AccidentClassMapping;
    /** True for rows sourced from the FMCSA SMS doc — shown as a badge. */
    fromFmcsa: boolean;
}

// Compact builders used in the catalog below.
const m = {
    fatalitySet: {
        fmcsaInspection:  ['Post-Crash Inspection'],
        cvorCollision:    ['Fatal', 'Reportable'],
        nscAbAssessment:  ['Reviewable Collision', 'Major'],
        nscBcAccidents:   ['Reportable Accident', 'Casualty Accident'],
        peiCollision:     { Collisions: ['Reportable'], Severity: ['Fatal'] },
        nsCollision:      { Collision: ['Reportable'], Severity: ['Fatal'] },
        driverActions:    ['Speeding', 'Distracted Driving', 'Drowsy / Fatigued'],
        vehicleActions:   ['Brake Failure'],
    } as AccidentClassMapping,
    injurySet: {
        fmcsaInspection:  ['Post-Crash Inspection'],
        cvorCollision:    ['Personal Injury', 'Reportable'],
        nscAbAssessment:  ['Reviewable Collision'],
        nscBcAccidents:   ['Reportable Accident', 'Casualty Accident'],
        peiCollision:     { Collisions: ['Reportable'], Severity: ['Injury'] },
        nsCollision:      { Collision: ['Reportable'], Severity: ['Injury'] },
        driverActions:    ['Speeding', 'Distracted Driving', 'Following Too Close'],
        vehicleActions:   ['Brake Failure'],
    } as AccidentClassMapping,
    propertyDmgSet: {
        cvorCollision:    ['Property Damage', 'Reportable'],
        nscAbAssessment:  ['Non-Reviewable Collision'],
        nscBcAccidents:   ['Reportable Accident', 'Property Damage Only'],
        peiCollision:     { Collisions: ['Reportable'], Severity: ['Property Damage Only'] },
        nsCollision:      { Collision: ['Reportable'], Severity: ['Property Damage Only'] },
        driverActions:    ['Harsh Brake', 'Lane Departure', 'Distracted Driving'],
    } as AccidentClassMapping,
};

// ── Catalog ────────────────────────────────────────────────────────────────

export const ACCIDENT_TYPES: AccidentTypeDef[] = [
    // ─── Severity (FMCSA SMS) ─────────────────────────────────────────────
    { id: 'fatalities',          group: 'Severity', displayName: 'Accidents w/Fatalities',     description: 'Total count of accidents involving a fatality in the last rolling 24 months.', defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: true,  defaultClassMapping: m.fatalitySet },
    { id: 'total_fatalities',    group: 'Severity', displayName: 'Accidents Total Fatalities', description: 'Total fatality count in the last rolling 24 months.',                           defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: true,  defaultClassMapping: m.fatalitySet },
    { id: 'injuries',            group: 'Severity', displayName: 'Accidents w/Injuries',       description: 'Total count of accidents involving an injury in the last rolling 24 months.',   defaultRiskType: 'High',     defaultRiskPoints: 7,  fromFmcsa: true,  defaultClassMapping: m.injurySet },
    { id: 'total_injuries',      group: 'Severity', displayName: 'Accidents Total Injuries',   description: 'Total injury count in the last rolling 24 months.',                              defaultRiskType: 'High',     defaultRiskPoints: 7,  fromFmcsa: true,  defaultClassMapping: m.injurySet },
    { id: 'rollover',            group: 'Severity', displayName: 'Accidents w/Rollover',       description: 'Total count of rollover accidents in the last 24 months.',                       defaultRiskType: 'High',     defaultRiskPoints: 8,  fromFmcsa: true,  defaultClassMapping: { ...m.injurySet, driverActions: ['Speeding', 'Harsh Cornering'], vehicleActions: ['ABS / Stability Fault', 'Cargo Shift', 'Tire Blowout'] } },
    { id: 'pedestrian_cyclist',  group: 'Severity', displayName: 'Accidents w/Pedestrian or Cyclist', description: 'Accidents involving a pedestrian, cyclist, scooter rider, or other vulnerable road user.', defaultRiskType: 'Critical', defaultRiskPoints: 9, fromFmcsa: false, defaultClassMapping: { ...m.injurySet, peiCollision: { Collisions: ['Reportable'], Severity: ['Injury'], Injured: ['Pedestrian / Cyclist'] }, driverActions: ['Distracted Driving', 'Mobile Phone Use', 'Speeding', 'Following Too Close'], vehicleActions: [] } },
    { id: 'motorcycle_involved', group: 'Severity', displayName: 'Accidents w/Motorcycle Involved', description: 'Accidents involving a motorcycle as the other party.',                       defaultRiskType: 'High',     defaultRiskPoints: 8,  fromFmcsa: false, defaultClassMapping: { ...m.injurySet, driverActions: ['Lane Departure', 'Following Too Close', 'Distracted Driving'], vehicleActions: [] } },

    // ─── Outcome ──────────────────────────────────────────────────────────
    { id: 'property_damage',     group: 'Outcome',  displayName: 'Accidents w/Property Damage', description: 'Total count of accidents involving property damage in the last rolling 24 months.', defaultRiskType: 'Medium', defaultRiskPoints: 4, fromFmcsa: true,  defaultClassMapping: { ...m.propertyDmgSet, vehicleActions: ['Brake Failure', 'Tire Blowout'] } },
    { id: 'tow_away',            group: 'Outcome',  displayName: 'Accidents w/Tow-Away',       description: 'Total count of accidents involving a tow-away in the last 24 months.',           defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: true,  defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Following Too Close', 'Lane Departure'], vehicleActions: ['Brake Failure', 'Tire Blowout'] } },
    { id: 'hazmat_release',      group: 'Outcome',  displayName: 'Accidents w/HazMat Release', description: 'Accidents resulting in any release of hazardous materials from cargo or fuel systems. Triggers PHMSA / TDG reporting.', defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: false, defaultClassMapping: { fmcsaInspection: ['Post-Crash Inspection', 'Level VI — Enhanced NAS HM'], cvorCollision: ['Reportable'], driverActions: ['Speeding', 'Harsh Brake'], vehicleActions: ['Coupling / Trailer Failure', 'Cargo Shift'] } },
    { id: 'fire_involved',       group: 'Outcome',  displayName: 'Accidents w/Fire',           description: 'Accidents involving fire on the CMV or surrounding vehicles.',                    defaultRiskType: 'High',     defaultRiskPoints: 8,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Distracted Driving'], vehicleActions: ['Engine Failure', 'Brake Failure', 'Tire Blowout', 'Lighting Failure'] } },
    { id: 'trailer_decoupling',  group: 'Outcome',  displayName: 'Accidents w/Trailer Decoupling', description: 'Trailer decoupling, kingpin failure, or fifth-wheel disengagement.',          defaultRiskType: 'High',     defaultRiskPoints: 7,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Speeding', 'Harsh Cornering'], vehicleActions: ['Coupling / Trailer Failure'] } },
    { id: 'load_loss',           group: 'Outcome',  displayName: 'Accidents w/Load Loss',      description: 'Accidents resulting in lost or shifted cargo on the roadway.',                    defaultRiskType: 'Medium',   defaultRiskPoints: 5,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Harsh Brake', 'Speeding'], vehicleActions: ['Cargo Shift', 'Coupling / Trailer Failure'] } },
    { id: 'cargo_shift',         group: 'Outcome',  displayName: 'Cargo Shift Incident',       description: 'Cargo shifting in transit causing instability or load-securement failure.',     defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Harsh Brake', 'Harsh Cornering'], vehicleActions: ['Cargo Shift'] } },
    { id: 'near_miss',           group: 'Outcome',  displayName: 'Near-Miss Incidents',        description: 'Telematics-flagged near-miss events that did not result in a crash but trigger a corrective-action workflow.', defaultRiskType: 'Low', defaultRiskPoints: 1, fromFmcsa: false, defaultClassMapping: { driverActions: ['Harsh Brake', 'Harsh Cornering', 'Following Too Close', 'Lane Departure'] } },
    { id: 'minor_incident',      group: 'Outcome',  displayName: 'Minor Incidents (No-Tow)',   description: 'Low-impact incidents not requiring tow-away, fatality, injury, or property damage thresholds.', defaultRiskType: 'Low', defaultRiskPoints: 1, fromFmcsa: false, defaultClassMapping: { cvorCollision: ['Non-Reportable'], nscAbAssessment: ['Non-Reviewable Collision'], driverActions: ['Distracted Driving', 'Harsh Brake', 'Lane Departure'] } },

    // ─── Cause ────────────────────────────────────────────────────────────
    { id: 'weather_related',     group: 'Cause',    displayName: 'Weather-Related Accidents',  description: 'Accidents where snow, ice, rain, fog, or wind was a primary factor.',           defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Speeding', 'Following Too Close', 'Harsh Brake'], vehicleActions: ['ABS / Stability Fault'] } },
    { id: 'driver_fatigue',      group: 'Cause',    displayName: 'Driver-Fatigue Accidents',   description: 'Accidents attributed to driver fatigue, drowsiness, or HOS-related impairment.', defaultRiskType: 'High',     defaultRiskPoints: 7,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Drowsy / Fatigued', 'Lane Departure', 'Harsh Brake'] } },
    { id: 'distracted_driver',   group: 'Cause',    displayName: 'Distracted-Driver Accidents', description: 'Accidents involving cell-phone use, texting, eating, or other in-cab distractions.', defaultRiskType: 'High', defaultRiskPoints: 7, fromFmcsa: false, defaultClassMapping: { driverActions: ['Distracted Driving', 'Mobile Phone Use', 'Lane Departure', 'Harsh Brake'] } },
    { id: 'dui_dwi',             group: 'Cause',    displayName: 'DUI / DWI Accidents',        description: 'Accidents where driver was under the influence of alcohol or controlled substances.', defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: false, defaultClassMapping: { fmcsaInspection: ['Post-Crash Inspection'], driverActions: ['Speeding', 'Lane Departure', 'Distracted Driving', 'Drowsy / Fatigued', 'Harsh Cornering', 'Harsh Acceleration'] } },
    { id: 'speeding_factor',     group: 'Cause',    displayName: 'Speeding-as-Factor Accidents', description: 'Accidents where speeding was a contributing factor.',                          defaultRiskType: 'High',     defaultRiskPoints: 6,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Speeding', 'Harsh Acceleration', 'Harsh Cornering', 'Harsh Brake'] } },
    { id: 'mechanical_failure',  group: 'Cause',    displayName: 'Mechanical-Failure Accidents', description: 'Accidents caused by brake, tire, steering, lighting, or other equipment failure.', defaultRiskType: 'High', defaultRiskPoints: 6, fromFmcsa: false, defaultClassMapping: { vehicleActions: ['Brake Failure', 'Tire Blowout', 'Steering Failure', 'Lighting Failure', 'Engine Failure', 'ABS / Stability Fault'] } },
    { id: 'brake_failure',       group: 'Cause',    displayName: 'Brake-Failure Accident',     description: 'Sub-set of mechanical failure where service or parking brake malfunction was the primary cause.', defaultRiskType: 'High', defaultRiskPoints: 7, fromFmcsa: false, defaultClassMapping: { driverActions: ['Harsh Brake'], vehicleActions: ['Brake Failure', 'ABS / Stability Fault'] } },
    { id: 'tire_blowout',        group: 'Cause',    displayName: 'Tire-Blowout Accident',      description: 'Sudden tire failure leading to loss of control or crash.',                      defaultRiskType: 'High',     defaultRiskPoints: 6,  fromFmcsa: false, defaultClassMapping: { vehicleActions: ['Tire Blowout', 'Steering Failure'] } },

    // ─── Context (where / how) ────────────────────────────────────────────
    { id: 'multi_vehicle',       group: 'Context',  displayName: 'Multi-Vehicle Accidents',    description: 'Accidents involving two or more vehicles.',                                      defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { cvorCollision: ['Reportable'], driverActions: ['Following Too Close', 'Lane Departure', 'Distracted Driving'] } },
    { id: 'single_vehicle',      group: 'Context',  displayName: 'Single-Vehicle Accidents',   description: 'Single-vehicle incidents — run-off-road, lane departure, jack-knife, etc.',     defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Lane Departure', 'Drowsy / Fatigued', 'Speeding'] } },
    { id: 'intersection',        group: 'Context',  displayName: 'Intersection Accidents',     description: 'Accidents occurring at signal-controlled or stop-sign intersections.',           defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Distracted Driving', 'Speeding', 'Mobile Phone Use', 'Harsh Brake', 'Following Too Close'] } },
    { id: 'construction_zone',   group: 'Context',  displayName: 'Construction-Zone Accidents', description: 'Accidents occurring inside marked construction or work zones.',                  defaultRiskType: 'High',     defaultRiskPoints: 6,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Speeding', 'Distracted Driving', 'Following Too Close'] } },
    { id: 'parked_vehicle',      group: 'Context',  displayName: 'Accidents w/Parked Vehicle', description: 'Accidents involving a parked or stopped vehicle.',                                defaultRiskType: 'Low',      defaultRiskPoints: 2,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Distracted Driving', 'Mobile Phone Use'] } },
    { id: 'animal_strike',       group: 'Context',  displayName: 'Animal-Strike Accidents',    description: 'Collisions involving wildlife or livestock.',                                     defaultRiskType: 'Low',      defaultRiskPoints: 2,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: [] } },
    { id: 'yard_low_speed',      group: 'Context',  displayName: 'Yard / Low-Speed Maneuver',  description: 'Low-speed in-yard or dock incidents.',                                            defaultRiskType: 'Low',      defaultRiskPoints: 2,  fromFmcsa: false, defaultClassMapping: { cvorCollision: ['Non-Reportable'], driverActions: ['Distracted Driving'] } },
    { id: 'highway_interstate',  group: 'Context',  displayName: 'Highway / Interstate Accident', description: 'Accidents occurring on limited-access highways or interstates.',               defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Speeding', 'Drowsy / Fatigued', 'Following Too Close'] } },
    { id: 'urban_local',         group: 'Context',  displayName: 'Urban / Local Road Accident', description: 'Accidents on city streets, suburban roads, or other low-speed-limit corridors.', defaultRiskType: 'Medium', defaultRiskPoints: 3, fromFmcsa: false, defaultClassMapping: { driverActions: ['Distracted Driving', 'Following Too Close', 'Mobile Phone Use'] } },
    { id: 'rural_road',          group: 'Context',  displayName: 'Rural Road Accident',        description: 'Accidents on undivided two-lane rural roads.',                                   defaultRiskType: 'Medium',   defaultRiskPoints: 3,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Drowsy / Fatigued', 'Speeding', 'Lane Departure'] } },
    { id: 'mountain_grade',      group: 'Context',  displayName: 'Mountain / Steep-Grade Accident', description: 'Accidents on mountain passes or steep descents.',                              defaultRiskType: 'High',     defaultRiskPoints: 6,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Speeding', 'Following Too Close'], vehicleActions: ['Brake Failure'] } },

    // ─── Collision Type ───────────────────────────────────────────────────
    { id: 'rear_end',            group: 'Collision', displayName: 'Rear-End Collision',        description: 'CMV strikes the vehicle in front, or is struck from behind.',                   defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { cvorCollision: ['Reportable'], driverActions: ['Following Too Close', 'Distracted Driving', 'Harsh Brake', 'Mobile Phone Use'] } },
    { id: 'head_on',             group: 'Collision', displayName: 'Head-On Collision',         description: 'Front-to-front impact with another vehicle.',                                    defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: false, defaultClassMapping: { ...m.fatalitySet, driverActions: ['Lane Departure', 'Drowsy / Fatigued', 'Distracted Driving'], vehicleActions: ['Steering Failure'] } },
    { id: 'side_swipe',          group: 'Collision', displayName: 'Side-Swipe Collision',      description: 'Parallel-direction side contact between two vehicles.',                          defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { cvorCollision: ['Reportable'], driverActions: ['Lane Departure', 'Distracted Driving', 'Harsh Cornering'] } },
    { id: 't_bone',              group: 'Collision', displayName: 'T-Bone (Right-Angle)',      description: 'Right-angle impact, typically at intersections.',                                 defaultRiskType: 'High',     defaultRiskPoints: 7,  fromFmcsa: false, defaultClassMapping: { ...m.injurySet, driverActions: ['Speeding', 'Distracted Driving', 'Mobile Phone Use'] } },
    { id: 'backing_accident',    group: 'Collision', displayName: 'Backing Accident',          description: 'CMV in reverse strikes another vehicle, object, pedestrian, or fixed structure.', defaultRiskType: 'Medium',   defaultRiskPoints: 3,  fromFmcsa: false, defaultClassMapping: { cvorCollision: ['Property Damage'], driverActions: ['Distracted Driving', 'Mobile Phone Use'] } },
    { id: 'lane_change',         group: 'Collision', displayName: 'Lane-Change Accident',      description: 'Collision during lane change or merge.',                                          defaultRiskType: 'Medium',   defaultRiskPoints: 4,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Lane Departure', 'Distracted Driving'] } },
    { id: 'bridge_strike',       group: 'Collision', displayName: 'Bridge / Overpass Strike',  description: 'CMV strikes a bridge, overpass, or other low-clearance structure.',                defaultRiskType: 'High',     defaultRiskPoints: 7,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Distracted Driving', 'Mobile Phone Use', 'Speeding'] } },
    { id: 'railroad_crossing',   group: 'Collision', displayName: 'Railroad-Crossing Accident', description: 'Accident at a highway-rail grade crossing, including train strike.',              defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: false, defaultClassMapping: { ...m.fatalitySet, driverActions: ['Distracted Driving', 'Speeding', 'Following Too Close'] } },
    { id: 'fixed_object',        group: 'Collision', displayName: 'Fixed-Object Strike',       description: 'CMV strikes guardrail, sign, light pole, jersey barrier, or other fixed object.', defaultRiskType: 'Medium',   defaultRiskPoints: 3,  fromFmcsa: false, defaultClassMapping: { ...m.propertyDmgSet, driverActions: ['Lane Departure', 'Distracted Driving', 'Drowsy / Fatigued'] } },

    // ─── Compliance / Reporting ───────────────────────────────────────────
    { id: 'hit_and_run',         group: 'Compliance', displayName: 'Hit-and-Run (Driver Fled)', description: 'Driver leaves the scene of an accident without exchanging information or reporting.', defaultRiskType: 'Critical', defaultRiskPoints: 9, fromFmcsa: false, defaultClassMapping: { nscBcAccidents: ['Hit-and-Run'], driverActions: ['Distracted Driving'] } },
    { id: 'post_crash_positive', group: 'Compliance', displayName: 'Post-Crash Drug/Alcohol Positive', description: 'Post-accident drug or alcohol test returned a positive result.',           defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: false, defaultClassMapping: { fmcsaInspection: ['Post-Crash Inspection'], driverActions: ['Speeding', 'Lane Departure'] } },
    { id: 'post_crash_refusal',  group: 'Compliance', displayName: 'Post-Crash Test Refusal',  description: 'Driver refused the post-accident drug or alcohol test.',                          defaultRiskType: 'Critical', defaultRiskPoints: 10, fromFmcsa: false, defaultClassMapping: { fmcsaInspection: ['Post-Crash Inspection'] } },
    { id: 'driver_citation',     group: 'Compliance', displayName: 'Driver Citation Issued',   description: 'Police issued a citation to the CMV driver at the scene.',                        defaultRiskType: 'High',     defaultRiskPoints: 5,  fromFmcsa: false, defaultClassMapping: { driverActions: ['Speeding', 'Distracted Driving', 'Mobile Phone Use', 'Seat-Belt Off'] } },
    { id: 'reportable_dot',      group: 'Compliance', displayName: 'DOT-Reportable Accident',  description: 'Accident meets the DOT reportable definition (fatality, injury treated away from scene, or any vehicle towed).', defaultRiskType: 'High', defaultRiskPoints: 6, fromFmcsa: false, defaultClassMapping: { fmcsaInspection: ['Post-Crash Inspection'], cvorCollision: ['Reportable'], driverActions: ['Speeding', 'Distracted Driving'], vehicleActions: ['Brake Failure'] } },
    { id: 'preventable',         group: 'Compliance', displayName: 'Preventable Accident',     description: 'Carrier safety review classified the accident as preventable per ANSI / NSC criteria.', defaultRiskType: 'High',     defaultRiskPoints: 6,  fromFmcsa: false, defaultClassMapping: { nscAbAssessment: ['At-Fault'], peiCollision: { Fault: ['At-Fault'] }, driverActions: ['Speeding', 'Following Too Close', 'Distracted Driving', 'Lane Departure'] } },
];

// ── Ordering helpers ───────────────────────────────────────────────────────

export const ACCIDENT_GROUPS: AccidentGroup[] = [
    'Severity',
    'Outcome',
    'Cause',
    'Context',
    'Collision',
    'Compliance',
];

export const ACCIDENT_GROUP_TONE: Record<AccidentGroup, string> = {
    Severity:   'bg-red-50 text-red-700 border-red-200',
    Outcome:    'bg-orange-50 text-orange-700 border-orange-200',
    Cause:      'bg-violet-50 text-violet-700 border-violet-200',
    Context:    'bg-blue-50 text-blue-700 border-blue-200',
    Collision:  'bg-amber-50 text-amber-700 border-amber-200',
    Compliance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export const RISK_TYPE_DEFAULT_POINTS: Record<AccidentRiskType, number> = {
    Critical: 10,
    High:     7,
    Medium:   4,
    Low:      2,
    Info:     0,
};

export const RISK_TYPE_TONE: Record<AccidentRiskType, string> = {
    Critical: 'bg-red-50 text-red-700 border-red-200',
    High:     'bg-rose-50 text-rose-700 border-rose-200',
    Medium:   'bg-amber-50 text-amber-700 border-amber-200',
    Low:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    Info:     'bg-slate-50 text-slate-600 border-slate-200',
};

export const RISK_TYPES: AccidentRiskType[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

// ── Main-page categories ───────────────────────────────────────────────────
//
// These mirror the SubTabs on the Accidents list (`all / hazmat / tow / injuries
// / fatalities`). Each accident type declares zero or more of these tags so
// the Settings page tabs and the main list filters speak the same language.

export type MainCategory = 'hazmat' | 'tow_away' | 'injuries' | 'fatalities';

export const MAIN_CATEGORIES: Array<{ id: MainCategory; label: string }> = [
    { id: 'hazmat',     label: 'Hazmat' },
    { id: 'tow_away',   label: 'Tow Away' },
    { id: 'injuries',   label: 'Injuries' },
    { id: 'fatalities', label: 'Fatalities' },
];

export const MAIN_CATEGORY_TONE: Record<MainCategory, string> = {
    hazmat:     'bg-orange-50 text-orange-700 border-orange-200',
    tow_away:   'bg-amber-50 text-amber-700 border-amber-200',
    injuries:   'bg-rose-50 text-rose-700 border-rose-200',
    fatalities: 'bg-red-50 text-red-700 border-red-200',
};

// Map each built-in accident-type id → which main categories it belongs to.
// Items not in the map default to no main-category tag (they only appear under
// "All Accidents"). Custom user-created types carry their own `mainCategories`
// field on the record itself.
const BUILTIN_ID_TO_MAIN_CATEGORIES: Record<string, MainCategory[]> = {
    // Severity
    fatalities:          ['fatalities', 'injuries', 'tow_away'],
    total_fatalities:    ['fatalities'],
    injuries:            ['injuries'],
    total_injuries:      ['injuries'],
    rollover:            ['tow_away', 'injuries'],
    pedestrian_cyclist:  ['injuries', 'fatalities'],
    motorcycle_involved: ['injuries'],

    // Outcome
    property_damage:     ['tow_away'],
    tow_away:            ['tow_away'],
    hazmat_release:      ['hazmat', 'tow_away'],
    fire_involved:       ['tow_away'],
    trailer_decoupling:  ['tow_away'],
    load_loss:           [],
    cargo_shift:         [],
    near_miss:           [],
    minor_incident:      [],

    // Cause — actions/causes don't inherently imply a severity bucket
    weather_related:     [],
    driver_fatigue:      [],
    distracted_driver:   [],
    dui_dwi:             ['fatalities', 'injuries'],
    speeding_factor:     [],
    mechanical_failure:  ['tow_away'],
    brake_failure:       ['tow_away'],
    tire_blowout:        ['tow_away'],

    // Context
    multi_vehicle:       ['tow_away'],
    single_vehicle:      [],
    intersection:        ['injuries'],
    construction_zone:   ['injuries'],
    parked_vehicle:      [],
    animal_strike:       [],
    yard_low_speed:      [],
    highway_interstate:  [],
    urban_local:         [],
    rural_road:          [],
    mountain_grade:      ['tow_away'],

    // Collision
    rear_end:            ['injuries', 'tow_away'],
    head_on:             ['fatalities', 'injuries', 'tow_away'],
    side_swipe:          ['tow_away'],
    t_bone:              ['injuries', 'tow_away'],
    backing_accident:    [],
    lane_change:         [],
    bridge_strike:       ['tow_away'],
    railroad_crossing:   ['fatalities', 'injuries', 'tow_away'],
    fixed_object:        ['tow_away'],

    // Compliance
    hit_and_run:         [],
    post_crash_positive: [],
    post_crash_refusal:  [],
    driver_citation:     [],
    reportable_dot:      ['fatalities', 'injuries', 'tow_away'],
    preventable:         [],
};

/**
 * Returns the main categories for an accident type. For built-in types the
 * mapping comes from the table above; custom types may carry their own
 * `mainCategories` field on the record.
 */
export function getMainCategories(t: AccidentTypeDef | { id: string; mainCategories?: MainCategory[] }): MainCategory[] {
    const explicit = (t as any).mainCategories as MainCategory[] | undefined;
    if (explicit && explicit.length > 0) return explicit;
    return BUILTIN_ID_TO_MAIN_CATEGORIES[t.id] ?? [];
}
