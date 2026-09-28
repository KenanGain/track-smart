// ─────────────────────────────────────────────────────────────────────────────
// "Show me this driver's phone."
//
// The office cannot answer a collection card on a driver's behalf — its copy of
// the card is deliberately read-only — but it does need to see the driver's end
// of it: to check what a message actually looks like before sending more of
// them, and to chase somebody who has not replied.
//
// A one-shot handover, the same shape as the Messages focus: the sender leaves
// a driver id behind and navigates, the driver app picks it up once and clears
// it. Nothing is subscribed to it, so arriving at the page any other way starts
// where it always did.
// ─────────────────────────────────────────────────────────────────────────────

let pendingDriverId: string | null = null;

/** Open the driver app on this driver. Cleared by the first read. */
export function setDriverAppFocus(driverId: string): void {
    pendingDriverId = driverId || null;
}

/** The driver to open on, if somebody asked. Reading it consumes it. */
export function consumeDriverAppFocus(): string | null {
    const id = pendingDriverId;
    pendingDriverId = null;
    return id;
}
