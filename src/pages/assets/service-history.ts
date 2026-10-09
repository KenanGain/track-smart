// ─────────────────────────────────────────────────────────────────────────────
// service-history.ts — what has actually been done to a unit, kept once.
//
// The problem this solves
// ───────────────────────
// Closing a work order used to write to three places at once: the task list, the
// interval's enrolment for that asset (its "last service"), and the compliance record
// where an annual inspection files its certificate. Three writes mean three ways to
// drift, and undoing one meant keeping a snapshot of what it overwrote so the undo could
// put it back — a fourth copy of the same facts.
//
// It also had no memory. The enrolment holds ONE last service, so "when was this truck
// last greased, and the time before that, and what did it cost" had no answer anywhere in
// the app. A fleet's maintenance record IS that history; everything else is derived from
// it.
//
// The model
// ─────────
// One append-only ledger of SERVICE EVENTS. An event says: this interval was performed on
// this asset, at these readings, on this date, by this order, for this money.
//
//   · Every write is an append. Nothing is updated in place.
//   · "Last service" is DERIVED — the newest event for that (asset, interval) pair. The
//     enrolment keeps only what the ledger cannot know: whether the rule is switched on,
//     and the reminders.
//   · Undo is a withdrawal, not a restore. Marking an order not-done deletes the events
//     that order wrote; the previous reading reappears because it is simply the
//     next-newest event. There is no snapshot to keep in step.
//   · The next service is counted from the newest event, so the countdown and the history
//     cannot disagree — they are the same fact read two ways.
//
// Every event carries all five keys this module's screens are organised by: asset,
// interval, service type, work order and vendor. So the asset's history, the rule's
// history, a vendor's work and a service type's record are one list with a different
// filter in front of it.
// ─────────────────────────────────────────────────────────────────────────────

import type { ServiceIntervalMeta } from './service-intervals';
import { SAMPLE_DOC_URL } from './sample-doc';

/**
 * One file filed with a service.
 *
 * A name and a link was enough while every record had exactly one invoice on it. It is
 * not enough once a visit comes back with six: an invoice, a brake measurement sheet, a
 * safety certificate, two photos of the worn part and the shop's own work order. Opened
 * from a list a year later those are six PDFs with machine names, and the only way to
 * find the certificate is to open all six.
 *
 * So each one says what it is, in the carrier's own words, out of the SAME tag catalog
 * the compliance documents use — a second vocabulary for the same job is how "Invoice"
 * and "invoice" and "Bill" end up being three different things.
 */
export interface ServiceDocument {
    name: string;
    url?: string;
    size?: number;
    /** What it is. Capped per document by the shared tag control. */
    tags?: string[];
    /** When it was attached, which is not when the work was done. */
    addedAt?: string;
}

/**
 * How many documents one service record may carry.
 *
 * Ten is not an arbitrary number: it is about the most paper one visit to a shop
 * generates, and a cap is the thing that stops a record becoming a dumping ground that
 * nobody can read. It is enforced where the files are taken in, not where they are
 * saved, so the form can say what it did rather than silently dropping the eleventh.
 */
export const MAX_RECORD_DOCS = 10;

/** One thing that was done to one unit. */
export interface ServiceEvent {
    id: string;
    assetId: string;
    /** The rule it satisfies. Absent for a one-off repair, which resets no clock. */
    intervalId?: string;
    /** The rule's name as it stood, so history still reads if the rule is renamed later. */
    intervalName?: string;
    serviceTypeIds: string[];
    /** When the work was signed off. */
    performedAt: string;
    /** The readings taken at the visit. */
    odometer?: number;
    engineHours?: number;
    /**
     * Where the figures came from.
     *
     * A fallback is not a measurement: when the shop gave no odometer we use the asset's
     * own meter, and the record should say so rather than implying somebody read it.
     */
    readingSource: 'shop' | 'meter' | 'typed';
    /** How the event got here. */
    source: 'work_order' | 'manual' | 'seed';
    /** The order that produced it — the handle a withdrawal is made by. */
    orderId?: string;
    /** The task it closed, and the one it raised in its place. */
    taskId?: string;
    raisedTaskId?: string;
    /** A certificate this visit filed, so withdrawing the visit withdraws that too. */
    certificateVersionId?: string;
    certificateReplacedId?: string;
    vendorId?: string;
    vendorName?: string;
    /**
     * Who turned the spanner, which is a separate question from where it was done.
     *
     * The vendor is the shop that billed for it; this is the person. They are not the
     * same fact and they do not always both exist: a driver can have an oil change done
     * at a truck stop (both), the yard mechanic can do it on a Saturday (person, no
     * shop), and a shop can invoice for work nobody here watched (shop, no person). A
     * record with one field for the two of them loses whichever it was not told about.
     */
    performedBy?: 'driver' | 'mechanic';
    /** The person's name, so the record reads without a lookup. */
    performedByName?: string;
    /** The driver, where they are on the roster rather than typed. */
    driverId?: string;
    /**
     * The invoice's own two lines, and their sum.
     *
     * Kept apart as well as added up, because an edit has to be able to put the form back
     * the way it was filled in. A record that keeps only the total can be corrected once
     * and then only ever shows one box where there were two.
     */
    labour?: number;
    parts?: number;
    cost?: number;
    currency?: string;
    invoiceNumber?: string;
    notes?: string;
    /**
     * What the shop said to watch.
     *
     * Not the same field as the note: a note is about THIS visit (what was done, what it
     * cost, why it was late), and a remark is about the NEXT one — brake linings at 30%,
     * a seal starting to weep, a part on back-order. They were being typed into one box
     * and read back as one thing, and the half that mattered next quarter was the half
     * that got lost in it.
     */
    remarks?: string;
    files?: ServiceDocument[];
    /**
     * When this entry was last corrected, and what it said before.
     *
     * A correction is not a second service — filing one as a new event would have the
     * truck serviced twice. So the entry is rewritten and keeps its own trail: the record
     * still shows that somebody changed it, and what they changed.
     */
    editedAt?: string;
    corrections?: {
        at: string;
        was: Pick<ServiceEvent, 'performedAt' | 'odometer' | 'engineHours' | 'cost' | 'invoiceNumber' | 'notes'>;
    }[];
}

/** What can be corrected on an entry after the fact. */
export type ServiceEventPatch = Partial<Pick<ServiceEvent,
    'performedAt' | 'odometer' | 'engineHours' | 'labour' | 'parts' | 'cost' | 'currency'
    | 'invoiceNumber' | 'notes' | 'remarks' | 'vendorId' | 'vendorName'
    | 'performedBy' | 'performedByName' | 'driverId' | 'files'>>;

/**
 * Correct one entry.
 *
 * Everything downstream follows on its own: the enrolment's last service is the newest
 * event for that pair, so changing the reading here changes what the countdown is measured
 * from. The caller is responsible for one thing this function cannot see — the task this
 * visit raised, whose due figure was worked out from the old reading.
 */
export function correctEvent(
    events: ServiceEvent[], id: string, patch: ServiceEventPatch, at = new Date().toISOString(),
): ServiceEvent[] {
    return events.map((e) => {
        if (e.id !== id) return e;
        return {
            ...e,
            ...patch,
            // A figure typed in the office is typed in the office, whatever it said before.
            readingSource: (patch.odometer !== undefined && patch.odometer !== e.odometer)
                || (patch.engineHours !== undefined && patch.engineHours !== e.engineHours)
                ? 'typed' : e.readingSource,
            editedAt: at,
            corrections: [
                ...(e.corrections ?? []),
                {
                    at,
                    was: {
                        performedAt: e.performedAt,
                        odometer: e.odometer,
                        engineHours: e.engineHours,
                        cost: e.cost,
                        invoiceNumber: e.invoiceNumber,
                        notes: e.notes,
                    },
                },
            ],
        };
    });
}

/** What a (asset, interval) pair was last serviced at. */
export interface LastService {
    odometer?: number;
    engineHours?: number;
    date?: string;
}

const newest = (a: ServiceEvent, b: ServiceEvent) =>
    String(b.performedAt).localeCompare(String(a.performedAt));

/** Every event for one asset, newest first. */
export function historyForAsset(events: ServiceEvent[], assetId: string): ServiceEvent[] {
    return events.filter((e) => e.assetId === assetId).sort(newest);
}

/** Every event against one rule, whichever unit it was on. */
export function historyForInterval(events: ServiceEvent[], intervalId: string): ServiceEvent[] {
    return events.filter((e) => e.intervalId === intervalId).sort(newest);
}

/** One unit's record against one rule — the countdown's own history. */
export function historyForPair(events: ServiceEvent[], assetId: string, intervalId: string): ServiceEvent[] {
    return events.filter((e) => e.assetId === assetId && e.intervalId === intervalId).sort(newest);
}

/** Everything a vendor has done. */
export function historyForVendor(events: ServiceEvent[], vendorId: string): ServiceEvent[] {
    return events.filter((e) => e.vendorId === vendorId).sort(newest);
}

/** Everything done under one service type, whoever did it. */
export function historyForService(events: ServiceEvent[], serviceTypeId: string): ServiceEvent[] {
    return events.filter((e) => e.serviceTypeIds.includes(serviceTypeId)).sort(newest);
}

/** The newest event for a pair — the single figure every countdown is measured from. */
export function lastServiceFor(
    events: ServiceEvent[], assetId: string, intervalId: string,
): ServiceEvent | undefined {
    return historyForPair(events, assetId, intervalId)[0];
}

/**
 * The enrolment, with its last service read off the ledger.
 *
 * The stored enrolment keeps the switch and the reminders, which are settings; the three
 * last-service figures are facts about what happened, and those live in the ledger. This
 * is where the two meet, and it is the only place they do.
 */
export function applyHistoryToMeta(
    meta: Record<string, ServiceIntervalMeta>,
    events: ServiceEvent[],
    /** Miles to kilometres where the rule is set in km, because the form asks in its own unit. */
    unitOf: (intervalId: string) => 'miles' | 'km',
): Record<string, ServiceIntervalMeta> {
    if (events.length === 0) return meta;
    const out: Record<string, ServiceIntervalMeta> = { ...meta };
    // Newest first, so the first event seen for a pair is the one that counts.
    const seen = new Set<string>();
    for (const e of [...events].sort(newest)) {
        if (!e.intervalId) continue;
        const key = `${e.intervalId}::${e.assetId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const base = out[e.intervalId];
        if (!base) continue;
        const was = base.assets?.[e.assetId];
        const km = unitOf(e.intervalId) === 'km';
        out[e.intervalId] = {
            ...base,
            assets: {
                ...(base.assets ?? {}),
                [e.assetId]: {
                    // The switch and the reminders are settings and stay as they were; a
                    // unit that has been serviced is being tracked, so it switches on.
                    ...(was ?? {}),
                    enabled: was?.enabled ?? true,
                    lastOdometer: e.odometer == null ? was?.lastOdometer
                        : km ? Math.round(e.odometer / 0.621371) : e.odometer,
                    lastEngineHours: e.engineHours ?? was?.lastEngineHours,
                    lastServiceDate: e.performedAt.slice(0, 10),
                    updatedAt: e.performedAt,
                },
            },
        };
    }
    return out;
}

/** Drop everything one work order wrote. The reading before it becomes current again. */
export function withdrawOrder(events: ServiceEvent[], orderId: string): ServiceEvent[] {
    return events.filter((e) => e.orderId !== orderId);
}

/**
 * Drop what ONE job on an order wrote, leaving the lines beside it standing.
 *
 * An order with four intervals on it gets four answers, and they are not always the same
 * answer. Taking the brake job back off must not disturb the oil change that was signed
 * off on the same visit — which is why every entry carries the task it came from.
 */
export function withdrawJob(events: ServiceEvent[], orderId: string, taskIds: string[]): ServiceEvent[] {
    const scope = new Set(taskIds);
    return events.filter((e) => !(e.orderId === orderId && e.taskId != null && scope.has(e.taskId)));
}

/** A readable id that does not pretend to be meaningful. */
export const newEventId = () => `svc_${Math.random().toString(36).slice(2, 11)}`;

/**
 * The ledger a fleet would already have.
 *
 * A real maintenance record is not one line per unit. A truck on a 25,000-mile PM has
 * been through it half a dozen times, each one at a shop, with an invoice — and the
 * questions this module exists to answer ("how often does this one actually get done",
 * "what has this trailer cost us this year", "who did it last time") need more than the
 * most recent visit to be worth asking.
 *
 * So each enrolment gets a back-series: the service it is counting from, and the ones
 * before that, stepped back by the rule’s own interval so the spacing is plausible. They
 * are marked `seed` — the opening record a fleet carries in from paper — rather than
 * dressed up as work orders that were never raised here.
 */
export function seedHistory(
    meta: Record<string, ServiceIntervalMeta>,
    unitOf: (intervalId: string) => 'miles' | 'km',
    nameOf: (intervalId: string) => string | undefined,
    /** The carrier’s own vendors, so the record names shops that exist. */
    vendors: { id: string; name: string }[] = [],
): ServiceEvent[] {
    const out: ServiceEvent[] = [];
    // Stable per pair rather than random: a history that reshuffles on every render is
    // not a history.
    const hash = (sv: string) => {
        let h = 0;
        for (let i = 0; i < sv.length; i++) h = (h * 31 + sv.charCodeAt(i)) | 0;
        return Math.abs(h);
    };

    for (const [intervalId, m] of Object.entries(meta)) {
        const km = unitOf(intervalId) === 'km';
        const everyMiles = m.intervals?.mileage
            ? (m.intervals.mileage.unit === 'km'
                ? Math.round(m.intervals.mileage.every * 0.621371)
                : m.intervals.mileage.every)
            : undefined;
        const everyHours = m.intervals?.engineHours?.every;
        const everyDays = m.intervals?.days?.every ?? 180;

        for (const [assetId, enrolled] of Object.entries(m.assets ?? {})) {
            if (!enrolled?.lastServiceDate && enrolled?.lastOdometer == null) continue;
            const seed = hash(`${intervalId}:${assetId}`);
            // Two to four visits on record, including the one it is counting from.
            const visits = 2 + (seed % 3);
            const baseOdo = enrolled.lastOdometer == null ? undefined
                : km ? Math.round(enrolled.lastOdometer * 0.621371) : enrolled.lastOdometer;
            const baseDate = enrolled.lastServiceDate
                ? new Date(`${enrolled.lastServiceDate}T09:00:00.000Z`)
                : new Date(enrolled.updatedAt ?? Date.now());

            for (let back = 0; back < visits; back++) {
                // Each step back is one interval earlier, give or take, so the gaps read
                // like a fleet that mostly keeps to its schedule and sometimes does not.
                const drift = ((hash(`${intervalId}:${assetId}:${back}`) % 21) - 10) / 100;
                const odo = baseOdo == null || everyMiles == null
                    ? baseOdo
                    : Math.max(0, Math.round(baseOdo - back * everyMiles * (1 + drift)));
                const hours = enrolled.lastEngineHours == null || everyHours == null
                    ? enrolled.lastEngineHours
                    : Math.max(0, Math.round(enrolled.lastEngineHours - back * everyHours * (1 + drift)));
                const when = new Date(baseDate.getTime() - back * everyDays * 86400000);
                const vendor = vendors.length ? vendors[hash(`${assetId}:${back}`) % vendors.length] : undefined;
                // The opening record carries what the paper invoice said; only the oldest
                // few are thin, the way a real one is.
                const billed = back < visits - 1 || visits === 2;

                out.push({
                    id: newEventId(),
                    assetId,
                    intervalId,
                    intervalName: nameOf(intervalId) ?? m.name,
                    serviceTypeIds: m.serviceTypeIds ?? [],
                    performedAt: when.toISOString(),
                    odometer: odo,
                    engineHours: hours,
                    readingSource: 'typed',
                    source: 'seed',
                    vendorId: billed ? vendor?.id : undefined,
                    vendorName: billed ? vendor?.name : undefined,
                    cost: billed ? 180 + (hash(`${intervalId}:${assetId}:${back}:cost`) % 1400) : undefined,
                    currency: 'USD',
                    invoiceNumber: billed
                        ? `INV-${1000 + (hash(`${assetId}:${intervalId}:${back}`) % 9000)}`
                        : undefined,
                    files: billed
                        ? seededDocs(
                            hash(`${intervalId}:${assetId}:${back}:docs`),
                            when,
                            48_000 + (hash(`${intervalId}:${assetId}:${back}:size`) % 90_000),
                        )
                        : undefined,
                });
            }
        }
    }
    return out.sort(newest);
}

/** A stand-in document, so "View" on a filed invoice opens something. */
const SAMPLE_INVOICE = SAMPLE_DOC_URL;

/**
 * The paper one visit leaves behind.
 *
 * Not one invoice. A truck that goes in for a PM comes back with the bill, usually a
 * sheet of what was measured, sometimes a certificate, and sometimes a photograph of the
 * part that was replaced. Seeding every visit with a single file called invoice-<date>
 * made the document list and its tag grouping untestable: one tag, one band, nothing to
 * find. The spread is deterministic — it is a seeded record, not a random one — and a
 * couple of them carry two tags, because a brake measurement sheet genuinely is both an
 * inspection sheet and about brakes.
 */
/**
 * The kinds of paper a shop visit produces.
 *
 * A catalogue rather than a pile of ifs, because the thing being seeded is VARIETY: the
 * document list, its tags, its grouping and the ten-per-record ceiling are all invisible
 * when every record carries one file called invoice-<date>. The last entry has no tags on
 * purpose — an unlabelled scan is the thing the Untagged filter exists to find, and a
 * demo where everything is labelled cannot show it.
 */
const DOC_KINDS: { name: string; ext: string; scale: number; tags?: string[] }[] = [
    { name: 'inspection-sheet', ext: 'pdf', scale: 0.6, tags: ['Inspection sheet', 'Brakes'] },
    { name: 'safety-certificate', ext: 'pdf', scale: 1.8, tags: ['Certificate', 'Annual inspection'] },
    { name: 'parts-list', ext: 'pdf', scale: 0.5, tags: ['Parts'] },
    { name: 'replaced-part', ext: 'jpg', scale: 3.2, tags: ['Photo'] },
    { name: 'road-test', ext: 'pdf', scale: 0.7, tags: ['Road test'] },
    { name: 'warranty-claim', ext: 'pdf', scale: 0.9, tags: ['Warranty'] },
    { name: 'tyre-depths', ext: 'pdf', scale: 0.45, tags: ['Inspection sheet', 'Tires'] },
    { name: 'shop-scan-001', ext: 'pdf', scale: 0.4 },
];

/** A stable number from a string, so a seeded record never reshuffles between renders. */
export function docSeed(sv: string): number {
    let h = 0;
    for (let i = 0; i < sv.length; i++) h = (h * 31 + sv.charCodeAt(i)) | 0;
    return Math.abs(h);
}

/**
 * The paper one visit leaves behind: the bill, plus two to five other things.
 *
 * Never just the invoice. A truck that goes in for a PM comes back with the bill, a sheet
 * of what was measured, often a certificate, sometimes a photograph of the part that was
 * replaced — and the whole point of filing them against ONE service record is that they
 * arrive together and are read together a year later.
 *
 * Deterministic, not random: the same visit produces the same documents on every render,
 * and two different visits produce different ones, because a record where every entry
 * carries an identical set teaches you as little as one where they all carry a single
 * file.
 */
function seededDocs(seed: number, when: Date, size: number): ServiceDocument[] {
    const day = when.toISOString().slice(0, 10);
    const at = when.toISOString();
    const out: ServiceDocument[] = [{
        name: `invoice-${day}.pdf`,
        url: SAMPLE_INVOICE,
        size,
        tags: ['Invoice'],
        addedAt: at,
    }];
    // Two to five more, walked off a different place in the catalogue each time so the
    // same kinds do not always travel together.
    const extra = 2 + (seed % 4);
    for (let i = 0; i < extra; i++) {
        const kind = DOC_KINDS[(seed + i * 3) % DOC_KINDS.length];
        if (out.some((f) => f.name.startsWith(kind.name))) continue;
        out.push({
            name: `${kind.name}-${day}.${kind.ext}`,
            url: SAMPLE_INVOICE,
            size: Math.max(8_000, Math.round(size * kind.scale)),
            tags: kind.tags,
            addedAt: at,
        });
    }
    return out;
}

/**
 * A back-series for ONE pair, on demand.
 *
 * A pair with nothing on record shows an empty table, three dashes where the averages go
 * and no way to tell whether any of it works. That is fine for a fleet whose first
 * service is still ahead of it and useless for looking at the screen — so the screen
 * offers to fill itself.
 *
 * The newest entry lands EXACTLY where the countdown is already measured from, and the
 * ones before it step back by the rule's own interval. So loading it does not move the
 * due date, change the status or make an overdue unit suddenly current: it adds the past
 * this unit would have had, and leaves the present alone.
 */
export function sampleHistoryFor(spec: {
    assetId: string;
    intervalId: string;
    intervalName?: string;
    serviceTypeIds: string[];
    /** The rule's own clocks, so the gaps read like the rule and not like a guess. */
    every?: { miles?: number; hours?: number; days?: number };
    /** Where the countdown is measured from now. The newest entry sits on it. */
    anchor: { date: string; odometer?: number; engineHours?: number };
    /** The carrier's own shops, so the record names ones that exist. */
    vendors: { id: string; name: string }[];
    /** And its own drivers, for the same reason. */
    drivers?: { id: string; name: string }[];
    visits?: number;
}): ServiceEvent[] {
    const { assetId, intervalId, anchor, vendors } = spec;
    const drivers = spec.drivers ?? [];
    // Enough names that the "performed by" column is not one name repeated — a demo
    // record where every visit was the same mechanic teaches the wrong thing about it.
    const MECHANICS = ['Dale Foster', 'Marcus Webb', 'Tony Alvarez', 'Ray Whitfield', 'Owen Pryce'];
    const hash = (sv: string) => {
        let h = 0;
        for (let i = 0; i < sv.length; i++) h = (h * 31 + sv.charCodeAt(i)) | 0;
        return Math.abs(h);
    };
    const seed = hash(`${intervalId}:${assetId}`);
    /*
     * Enough visits to BE a record.
     *
     * Three rows is a table with three rows in it: the averages have one gap to average,
     * the pager never pages, and the page cannot be scrolled, so none of what this screen
     * does under load can be seen at all. A unit that has been on a 180-day rule for five
     * years has had about ten, so it generates about ten — and stops early rather than
     * stepping a truck back to a negative odometer.
     */
    const visits = spec.visits ?? 9 + (seed % 4);
    const everyDays = spec.every?.days ?? 180;
    const base = new Date(anchor.date.length === 10 ? `${anchor.date}T09:00:00.000Z` : anchor.date);

    const out: ServiceEvent[] = [];
    for (let back = 0; back < visits; back++) {
        // Each step back is one interval earlier, give or take a tenth — so "average gap"
        // has something to actually average, and reads like a fleet that mostly keeps to
        // its schedule and sometimes does not.
        const drift = ((hash(`${intervalId}:${assetId}:${back}`) % 21) - 10) / 100;
        /*
         * A clock the rule does not run cannot be stepped back, so it is left off.
         *
         * Carrying the anchor's reading down the column instead would put the same hour
         * meter against four visits eighteen months apart — a figure that is not wrong so
         * much as untrue, and the sort of thing somebody later averages.
         */
        /* Stepped back off the start of the clock is not a zero: it is a figure nobody
           recorded, and "0 mi" on a truck delivered with 400 on it is a lie a later
           average would believe. */
        const stepBack = (from: number | undefined, every: number | undefined) => {
            if (!every || from == null) return undefined;
            const v = Math.round(from - back * every * (1 + drift));
            return v > 0 ? v : undefined;
        };
        const odometer = stepBack(anchor.odometer, spec.every?.miles);
        const engineHours = stepBack(anchor.engineHours, spec.every?.hours);
        const when = new Date(base.getTime() - Math.round(back * everyDays * (1 + drift)) * 86400000);
        // Seeded on the leading character, so consecutive visits land far apart in the
        // list rather than on the shop next door to the last one.
        const vendor = vendors.length
            ? vendors[hash(`v${back}:${intervalId}:${assetId}`) % vendors.length]
            : undefined;

        out.push({
            id: newEventId(),
            assetId,
            intervalId,
            intervalName: spec.intervalName,
            serviceTypeIds: spec.serviceTypeIds,
            performedAt: when.toISOString(),
            // Only the newest carries this unit's real readings; the rest are stepped back
            // from it, which is a reconstruction and says so.
            odometer: back === 0 ? anchor.odometer : odometer,
            engineHours: back === 0 ? anchor.engineHours : engineHours,
            readingSource: back === 0 ? 'shop' : 'typed',
            // The newest is the one somebody filed; the rest are the paper the carrier
            // came in with. Two sources, so the record's own filters have something to do.
            source: back === 0 ? 'manual' : 'seed',
            vendorId: vendor?.id,
            vendorName: vendor?.name,
            // Most work is a mechanic's; the odd one is the driver, on the road.
            ...(drivers.length && back % 3 === 1
                ? {
                    performedBy: 'driver' as const,
                    driverId: drivers[hash(`d${back}:${assetId}`) % drivers.length].id,
                    performedByName: drivers[hash(`d${back}:${assetId}`) % drivers.length].name,
                }
                : {
                    performedBy: 'mechanic' as const,
                    performedByName: MECHANICS[hash(`m${back}:${intervalId}:${assetId}`) % MECHANICS.length],
                }),
            // Split the way a real invoice is, so an edit opens on two lines rather
            // than guessing which one a lone total belonged to.
            ...(() => {
                const cost = 180 + (hash(`${intervalId}:${assetId}:${back}:cost`) % 1400);
                const labour = Math.round(cost * (0.4 + (hash(`l${back}:${assetId}`) % 31) / 100));
                return { labour, parts: cost - labour, cost };
            })(),
            currency: 'USD',
            invoiceNumber: `INV-${1000 + (hash(`i${back}:${assetId}:${intervalId}`) % 9000)}`,
            files: seededDocs(back, when, 52_000),
        });
    }
    return out.sort(newest);
}

/**
 * The record a completed work order would have left behind.
 *
 * The seeded orders were written before there was a ledger, so the work they closed is
 * missing from the record. This reads it back out of them — same shape, same keys, and
 * with the order id on each entry so the Order button works and a reopen can withdraw it.
 */
export function historyFromClosedOrders(rows: {
    orderId: string;
    assetId: string;
    intervalId?: string;
    intervalName?: string;
    serviceTypeIds: string[];
    taskId: string;
    performedAt: string;
    odometer?: number;
    engineHours?: number;
    fromShop: boolean;
    vendorId?: string;
    vendorName?: string;
    cost?: number;
    currency?: string;
    invoiceNumber?: string;
    files?: ServiceDocument[];
}[]): ServiceEvent[] {
    return rows.map((r): ServiceEvent => ({
        id: newEventId(),
        assetId: r.assetId,
        intervalId: r.intervalId,
        intervalName: r.intervalName,
        serviceTypeIds: r.serviceTypeIds,
        performedAt: r.performedAt,
        odometer: r.odometer,
        engineHours: r.engineHours,
        readingSource: r.fromShop ? 'shop' : 'meter',
        source: 'work_order',
        orderId: r.orderId,
        taskId: r.taskId,
        vendorId: r.vendorId,
        vendorName: r.vendorName,
        cost: r.cost,
        currency: r.currency ?? 'USD',
        invoiceNumber: r.invoiceNumber,
        // Per LINE, not per order: two services closed on one visit are two records,
        // and giving both the same four files makes the Filed-with column meaningless.
        files: r.files?.length ? r.files : seededDocs(
            docSeed(`${r.orderId}:${r.taskId}`), new Date(r.performedAt), 64_000,
        ),
    })).sort(newest);
}
