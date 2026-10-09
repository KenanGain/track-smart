export type ServiceCategory = 'cmv_only' | 'non_cmv_only' | 'both_cmv_and_non_cmv';

export type ServiceComplexity = "Basic" | "Moderate" | "Extensive" | "Intensive";

/**
 * How often a service comes round.
 *
 * Three independent clocks, because a fleet does not run on one: oil goes by distance, a
 * reefer by the hours its engine actually turned, an annual inspection by the calendar.
 * Each is optional and any mix is valid — whichever comes first is what falls due.
 *
 * This belongs to a service INTERVAL, not to a service type: the same oil change is every
 * 15,000 miles on a long-haul tractor and every 90 days on a yard truck that barely moves,
 * and a default on the type would be wrong for one of them wherever it was set.
 *
 * Distance carries its own unit rather than a global setting: a carrier running both sides
 * of the border has trucks measured in miles and trailers in kilometres, and silently
 * reinterpreting 12,000 as the other one is a service either half a year late or half a
 * year early.
 */
export interface ServiceIntervals {
    mileage?: { every: number; unit: DistanceUnit };
    engineHours?: { every: number };
    days?: { every: number };
}

export type DistanceUnit = 'miles' | 'km';

export const DISTANCE_UNIT_LABELS: Record<DistanceUnit, string> = { miles: 'mi', km: 'km' };

export interface ServiceType {
    id: string;
    name: string; // "Maintenance Type"
    category: ServiceCategory; // "Applicability"
    group: string; // "Maintenance Class" — one of the 7 ServiceGroup values
    /** @deprecated Dropped from the catalog form. Seed data still carries it. */
    complexity?: ServiceComplexity;
    description?: string;
}

/**
 * Which kinds of asset a service applies to, as the two ticks the form actually asks for.
 * Both ticked is "all vehicles"; it is not a third thing to choose.
 */
export const applicabilityTicks = (c: ServiceCategory) => ({
    truck: c === 'cmv_only' || c === 'both_cmv_and_non_cmv',
    trailer: c === 'non_cmv_only' || c === 'both_cmv_and_non_cmv',
});

/** The inverse. Neither ticked has no meaning, so the form refuses to save it. */
export const categoryFromTicks = (truck: boolean, trailer: boolean): ServiceCategory | undefined =>
    truck && trailer ? 'both_cmv_and_non_cmv' : truck ? 'cmv_only' : trailer ? 'non_cmv_only' : undefined;

/** One line for a table cell: "12,000 mi · 500 h · 180 d", or nothing at all. */
export function intervalSummary(i?: ServiceIntervals): string[] {
    if (!i) return [];
    const out: string[] = [];
    if (i.mileage) out.push(`${i.mileage.every.toLocaleString()} ${DISTANCE_UNIT_LABELS[i.mileage.unit]}`);
    if (i.engineHours) out.push(`${i.engineHours.every.toLocaleString()} h`);
    if (i.days) out.push(`${i.days.every.toLocaleString()} d`);
    return out;
}

/**
 * What people call them.
 *
 * The ids still say CMV, because that is the regulatory class a record is filed under and
 * renaming it would mean a migration. The labels do not: nobody in a yard asks whether a
 * service is for "non-CMV" assets, they ask whether it is for the trailers.
 */
export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
    'cmv_only': 'Trucks',
    'non_cmv_only': 'Trailers',
    'both_cmv_and_non_cmv': 'Both'
};
