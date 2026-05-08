// Per-carrier Yard Terminal / Location Database
//
// Carrier-scoped location registry. Mirrors the shape used by `LocationsPage`
// (`LocationsTableData`) so any existing UI that already understands locations
// can be pointed at the per-carrier list with no schema work.
//
// Carriers seeded so far: acct-002, acct-003. Carriers without an entry fall
// back to the global `INITIAL_LOCATIONS_DATA` list via the helper below.

import { INITIAL_LOCATIONS_DATA, type LocationsTableData } from "./locations.data";

// ── Carrier-scoped seed data ─────────────────────────────────────────────────

export const CARRIER_LOCATIONS: Record<string, LocationsTableData> = {
    // ── acct-002 — Cascade Freight Systems LLC (Portland, OR · US) ───────────
    "acct-002": {
        groups: [
            {
                key: "yard_terminal",
                label: "Yard / Terminal Locations",
                collapsed: false,
                items: [
                    {
                        id: "LOC-CF-101",
                        name: "Portland HQ Yard",
                        address: { street: "4200 SE Powell Blvd", city: "Portland", state: "OR", zip: "97206" },
                        security: { fenced: true, gated: true, cctv: true, guard: true, restricted: false },
                        score: 91,
                        status: "Active",
                    },
                    {
                        id: "LOC-CF-102",
                        name: "Seattle Cross-Dock",
                        address: { street: "1500 S Spokane St", city: "Seattle", state: "WA", zip: "98134" },
                        security: { fenced: true, gated: true, cctv: true, guard: false, restricted: true },
                        score: 84,
                        status: "Active",
                    },
                    {
                        id: "LOC-CF-103",
                        name: "Eugene Satellite",
                        address: { street: "2400 W 11th Ave", city: "Eugene", state: "OR", zip: "97402" },
                        security: { fenced: true, gated: false, cctv: true, guard: false, restricted: false },
                        score: 72,
                        status: "Active",
                    },
                ],
            },
        ],
    },

    // ── acct-003 — Northern Lights Transport Ltd. (Mississauga, ON · CA) ─────
    "acct-003": {
        groups: [
            {
                key: "yard_terminal",
                label: "Yard / Terminal Locations",
                collapsed: false,
                items: [
                    {
                        id: "LOC-NL-201",
                        name: "Mississauga HQ Yard",
                        address: { street: "2500 Meadowvale Blvd", city: "Mississauga", state: "ON", zip: "L5N 6C2" },
                        security: { fenced: true, gated: true, cctv: true, guard: true, restricted: true },
                        score: 95,
                        status: "Active",
                    },
                    {
                        id: "LOC-NL-202",
                        name: "Brampton Cross-Dock",
                        address: { street: "120 Walker Dr", city: "Brampton", state: "ON", zip: "L6T 5K5" },
                        security: { fenced: true, gated: true, cctv: true, guard: false, restricted: false },
                        score: 87,
                        status: "Active",
                    },
                    {
                        id: "LOC-NL-203",
                        name: "Montreal Terminal",
                        address: { street: "400 Rue Saint-Jacques", city: "Montreal", state: "QC", zip: "H2Y 1S1" },
                        security: { fenced: true, gated: true, cctv: true, guard: true, restricted: false },
                        score: 89,
                        status: "Active",
                    },
                    {
                        id: "LOC-NL-204",
                        name: "Windsor Border Yard",
                        address: { street: "1500 Provincial Rd", city: "Windsor", state: "ON", zip: "N8W 5V7" },
                        security: { fenced: true, gated: true, cctv: false, guard: false, restricted: true },
                        score: 78,
                        status: "Maintenance",
                    },
                ],
            },
        ],
    },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the location/yard table scoped to a specific carrier. Falls back
 *  to the global `INITIAL_LOCATIONS_DATA` when the carrier has no dedicated
 *  entry. */
export function getLocationsForCarrier(accountId: string): LocationsTableData {
    return CARRIER_LOCATIONS[accountId] ?? INITIAL_LOCATIONS_DATA;
}
