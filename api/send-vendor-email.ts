// Vercel serverless function — sends the work-order email via Resend.
//
// Local dev: routed through src/server/devApi.ts loaded by vite.config.ts.
// Production: Vercel auto-detects /api/*.ts files as serverless functions.
//
// Env: RESEND_API_KEY must be set (Vercel dashboard → Settings → Environment Variables).

import { Resend } from 'resend';
import { renderWorkOrderEmail } from './_emailTemplate';

export interface VendorEmailRequest {
    to: string;
    workOrderNumber: string;
    portalUrl: string;
    /** Carrier this work order is from — rendered prominently in the email
     *  so the vendor knows which fleet sent the request. */
    carrier?: {
        legalName: string;
        dbaName?: string;
        dotNumber?: string;
        city?: string;
        state?: string;
    };
    vendor: { name: string; companyName?: string; contactName?: string };
    createDate: string;
    dueDate?: string;
    notes?: string;
    requirements: {
        odometerRequired: boolean;
        odometerUnit: 'miles' | 'km';
        engineHoursRequired: boolean;
    };
    tasks: Array<{
        unitNumber: string;
        year?: number;
        make?: string;
        model?: string;
        vin?: string;
        services: Array<{ name: string; group: string }>;
    }>;
    senderName?: string;
}

export interface VendorEmailResponse {
    ok: boolean;
    id?: string;
    error?: string;
}

// The handler is shape-compatible with both Vercel's serverless runtime and
// the lightweight dev shim in src/server/devApi.ts.
export default async function handler(
    req: { method?: string; body?: unknown },
    res: {
        status: (code: number) => { json: (data: unknown) => unknown; end: () => unknown };
    }
): Promise<unknown> {
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return res.status(500).json({
            ok: false,
            error: 'RESEND_API_KEY is not set. Add it to .env.local (dev) or Vercel env vars (prod).',
        });
    }

    const body = (req.body ?? {}) as Partial<VendorEmailRequest>;
    if (!body.to || !body.workOrderNumber || !body.portalUrl || !body.vendor || !body.tasks) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
    }

    const html = renderWorkOrderEmail(body as VendorEmailRequest);
    const subject = `Work Order #${body.workOrderNumber} — Action Required`;

    try {
        const resend = new Resend(apiKey);
        // Show the carrier name in the From label when available so the vendor
        // sees "Acme Logistics via TrackSmart" instead of a generic system sender.
        const carrierLabel = body.carrier?.dbaName || body.carrier?.legalName;
        const fromName = carrierLabel ? `${carrierLabel} via TrackSmart` : 'TrackSmart Fleet';
        const result = await resend.emails.send({
            // onboarding@resend.dev works without domain verification, but recipients
            // are restricted to the Resend account owner's signup email until a
            // domain is verified.
            from: `${fromName} <onboarding@resend.dev>`,
            to: body.to,
            subject,
            html,
        });

        if (result.error) {
            return res.status(502).json({ ok: false, error: result.error.message });
        }
        return res.status(200).json({ ok: true, id: result.data?.id });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return res.status(500).json({ ok: false, error: message });
    }
}
