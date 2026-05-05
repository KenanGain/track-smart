// Helpers for the vendor-portal email flow.
//
// The whole work-order payload is base64url-encoded into the URL hash so the
// link is self-contained and works without a backend. Real production should
// replace this with a signed-token + DB lookup (see docs/vendor-work-order-flow.md).

export type VendorOrderPayload = {
    orderId: string;
    workOrderNumber: string;
    createdBy: { name?: string; email?: string };
    /** Carrier (account) the order is on behalf of — vendors see this in the
     *  email header and on the portal page so they know which fleet sent the
     *  request. */
    carrier?: {
        id: string;
        legalName: string;
        dbaName?: string;
        dotNumber?: string;
        city?: string;
        state?: string;
    };
    vendor: { id: string; name: string; email?: string; companyName?: string };
    createDate: string;
    dueDate?: string;
    notes?: string;
    requirements: {
        odometerRequired: boolean;
        odometerUnit: "miles" | "km";
        engineHoursRequired: boolean;
    };
    tasks: Array<{
        assetId: string;
        unitNumber: string;
        year?: number;
        make?: string;
        model?: string;
        vin?: string;
        services: Array<{ id: string; name: string; group: string }>;
    }>;
};

export type VendorOrderResponse = {
    orderId: string;
    submittedAt: string;
    apptDateTime?: string;
    estLaborDuration?: string;
    expectedReadyDate?: string;
    workSummary?: string;
    labor: Array<{ description: string; techId: string; hours: number; rate: number }>;
    parts: Array<{ partNumber: string; description: string; qty: number; unitCost: number }>;
    odometerOut?: string;
    engineHours?: string;
    totals: { labor: number; parts: number; tax: number; grand: number };
    currency: "USD" | "CAD";
    invoiceFileName?: string;
};

const HASH_PREFIX = "#/vendor/work-order?d=";

function base64UrlEncode(s: string): string {
    return btoa(unescape(encodeURIComponent(s)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

function base64UrlDecode(s: string): string {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return decodeURIComponent(escape(atob(b64)));
}

export function encodePayload(payload: VendorOrderPayload): string {
    return base64UrlEncode(JSON.stringify(payload));
}

export function decodePayload(encoded: string): VendorOrderPayload | null {
    try {
        return JSON.parse(base64UrlDecode(encoded)) as VendorOrderPayload;
    } catch {
        return null;
    }
}

export function buildVendorPortalUrl(payload: VendorOrderPayload): string {
    const base = `${window.location.origin}${window.location.pathname}`;
    return `${base}${HASH_PREFIX}${encodePayload(payload)}`;
}

export function readPayloadFromCurrentUrl(): VendorOrderPayload | null {
    const h = window.location.hash;
    if (!h.startsWith(HASH_PREFIX)) return null;
    return decodePayload(h.slice(HASH_PREFIX.length));
}

export function isVendorPortalUrl(): boolean {
    return window.location.hash.startsWith(HASH_PREFIX);
}

export function buildMailtoLink(args: {
    to: string;
    workOrderNumber: string;
    portalUrl: string;
    senderName?: string;
}): string {
    const subject = `Work Order #${args.workOrderNumber} — Action Required`;
    const lines = [
        `Hi,`,
        ``,
        `A new work order has been assigned to your shop. Please use the link below to review the request and submit your completion details (labor, parts, odometer, invoice).`,
        ``,
        `Open work order:`,
        args.portalUrl,
        ``,
        `Thanks,`,
        args.senderName || `TrackSmart Fleet`,
    ];
    const body = lines.join("\n");
    return `mailto:${encodeURIComponent(args.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const RESPONSES_KEY = "tracksmart_vendor_responses";

export function saveVendorResponse(response: VendorOrderResponse): void {
    const existing = loadVendorResponses();
    existing[response.orderId] = response;
    localStorage.setItem(RESPONSES_KEY, JSON.stringify(existing));
}

export function loadVendorResponses(): Record<string, VendorOrderResponse> {
    try {
        const raw = localStorage.getItem(RESPONSES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}
