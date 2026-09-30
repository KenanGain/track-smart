// ─────────────────────────────────────────────────────────────────────────────
// Where it happened, looked up rather than typed.
//
// A roadside inspection's location is the one field people type differently
// every time: "I80 mm214", "I-80 WB Mile 214", "Elkhart scale". Three spellings
// of one place is three places as far as any search, filter or count is
// concerned, and the office only finds out months later when a report comes back
// with the same scale house listed four times.
//
// So it is a lookup. This is a demo one — a fixed list of the kinds of place an
// inspection actually happens at, searched locally behind a small delay so the
// screen behaves the way it will when a real geocoder is behind it. Swapping in
// that geocoder means replacing `searchLocations` and nothing else: the field
// hands back a `RoadsideLocation`, and what fills it is not the form's business.
//
// The structured parts come back WITH the label, so the record keeps city, state
// and country as data rather than as a substring somebody has to parse later.
// ─────────────────────────────────────────────────────────────────────────────

export interface RoadsideLocation {
    /** What the field shows, and what the record stores as its location line. */
    label: string;
    city: string;
    /** State or province code. */
    state: string;
    country: "USA" | "Canada";
    /** The road, where the place is on one — a scale house often is. */
    highway?: string;
    /** What kind of place: a scale, an inspection station, a roadside stop. */
    kind: "Weigh station" | "Inspection station" | "Roadside" | "Port of entry" | "Terminal";
}

/**
 * The demo gazetteer.
 *
 * Real scales and crossings on the lanes a North American fleet actually runs,
 * so the suggestions read like the paper report rather than like placeholder
 * text. Nothing here is generated: a fake list of "City 1, City 2" teaches
 * nobody whether the field works.
 */
const LOCATIONS: RoadsideLocation[] = [
    { label: "I-80 WB, Mile 214 — Elkhart, IN", city: "Elkhart", state: "IN", country: "USA", highway: "I-80", kind: "Roadside" },
    { label: "Weigh station — Breezewood, PA", city: "Breezewood", state: "PA", country: "USA", highway: "I-70", kind: "Weigh station" },
    { label: "US-30 — North Platte, NE", city: "North Platte", state: "NE", country: "USA", highway: "US-30", kind: "Roadside" },
    { label: "I-40 EB, Mile 286 — Amarillo, TX", city: "Amarillo", state: "TX", country: "USA", highway: "I-40", kind: "Roadside" },
    { label: "Inspection station — Wytheville, VA", city: "Wytheville", state: "VA", country: "USA", highway: "I-81", kind: "Inspection station" },
    { label: "I-5 NB, Mile 191 — Woodburn, OR", city: "Woodburn", state: "OR", country: "USA", highway: "I-5", kind: "Weigh station" },
    { label: "I-94 WB — Battle Creek, MI", city: "Battle Creek", state: "MI", country: "USA", highway: "I-94", kind: "Weigh station" },
    { label: "I-10 EB, Mile 140 — Eloy, AZ", city: "Eloy", state: "AZ", country: "USA", highway: "I-10", kind: "Inspection station" },
    { label: "I-75 SB — Findlay, OH", city: "Findlay", state: "OH", country: "USA", highway: "I-75", kind: "Weigh station" },
    { label: "I-95 SB — Dunn, NC", city: "Dunn", state: "NC", country: "USA", highway: "I-95", kind: "Weigh station" },
    { label: "Port of entry — Blaine, WA", city: "Blaine", state: "WA", country: "USA", highway: "I-5", kind: "Port of entry" },
    { label: "Port of entry — Pembina, ND", city: "Pembina", state: "ND", country: "USA", highway: "I-29", kind: "Port of entry" },
    { label: "Hwy 401 EB — Cambridge, ON", city: "Cambridge", state: "ON", country: "Canada", highway: "ON-401", kind: "Inspection station" },
    { label: "Hwy 400 NB — Barrie, ON", city: "Barrie", state: "ON", country: "Canada", highway: "ON-400", kind: "Weigh station" },
    { label: "Hwy 1 WB — Golden, BC", city: "Golden", state: "BC", country: "Canada", highway: "BC-1", kind: "Weigh station" },
    { label: "Hwy 2 SB — Leduc, AB", city: "Leduc", state: "AB", country: "Canada", highway: "AB-2", kind: "Weigh station" },
    { label: "Autoroute 20 EB — Drummondville, QC", city: "Drummondville", state: "QC", country: "Canada", highway: "QC-20", kind: "Inspection station" },
    { label: "Peace Bridge — Fort Erie, ON", city: "Fort Erie", state: "ON", country: "Canada", highway: "QEW", kind: "Port of entry" },
    { label: "Ambassador Bridge — Windsor, ON", city: "Windsor", state: "ON", country: "Canada", highway: "ON-401", kind: "Port of entry" },
    { label: "Carrier terminal — Wilmington, DE", city: "Wilmington", state: "DE", country: "USA", kind: "Terminal" },
];

/**
 * Search it.
 *
 * Async and slightly slow on purpose. A lookup that answers instantly from an
 * array hides every problem a real one has — the empty state before the first
 * keystroke, the gap while it thinks, the race when somebody types faster than
 * it answers — and those are exactly the states this field has to get right.
 */
export function searchLocations(query: string, limit = 8): Promise<RoadsideLocation[]> {
    const q = query.trim().toLowerCase();
    return new Promise((resolve) => {
        setTimeout(() => {
            if (!q) return resolve(LOCATIONS.slice(0, limit));
            const scored = LOCATIONS
                .map((l) => {
                    const hay = `${l.label} ${l.city} ${l.state} ${l.country} ${l.highway ?? ""} ${l.kind}`.toLowerCase();
                    if (!hay.includes(q)) return null;
                    // A match at the start of the label is the one they meant.
                    return { l, rank: l.label.toLowerCase().startsWith(q) ? 0 : 1 };
                })
                .filter((x): x is { l: RoadsideLocation; rank: number } => !!x)
                .sort((a, b) => a.rank - b.rank);
            resolve(scored.slice(0, limit).map((x) => x.l));
        }, 180);
    });
}

/** The one-line address a record shows when it has the parts but not the label. */
export const addressLine = (l: Pick<RoadsideLocation, "city" | "state" | "country">): string =>
    [l.city, l.state, l.country].filter(Boolean).join(", ");
