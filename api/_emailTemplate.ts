// HTML email template for the vendor work order.
// Inline CSS only — Gmail/Outlook strip <style> tags and external CSS.
// Tested visual targets: Gmail web (light + dark), Apple Mail, Outlook 365.

import type { VendorEmailRequest } from './send-vendor-email';

const COLORS = {
    primary: '#2563eb',       // blue-600
    primaryDark: '#1d4ed8',   // blue-700
    primaryLight: '#dbeafe',  // blue-100
    primaryFaint: '#eff6ff',  // blue-50
    slate900: '#0f172a',
    slate700: '#334155',
    slate600: '#475569',
    slate500: '#64748b',
    slate400: '#94a3b8',
    slate300: '#cbd5e1',
    slate200: '#e2e8f0',
    slate100: '#f1f5f9',
    slate50: '#f8fafc',
    amber50: '#fffbeb',
    amber200: '#fde68a',
    amber700: '#b45309',
    amber800: '#92400e',
    emerald50: '#ecfdf5',
    emerald600: '#059669',
};

const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const fmtDate = (iso?: string): string => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Group → palette mapping so service chips are visually scannable in the email.
const GROUP_PALETTE: Record<string, { bg: string; fg: string }> = {
    'Engine': { bg: '#fef3c7', fg: '#92400e' },              // amber
    'Tires & Brakes': { bg: '#fee2e2', fg: '#991b1b' },     // red
    'Inspections': { bg: '#dbeafe', fg: '#1e40af' },        // blue
    'General': { bg: '#e0e7ff', fg: '#3730a3' },            // indigo
};

const chipForGroup = (group: string): { bg: string; fg: string } =>
    GROUP_PALETTE[group] || { bg: COLORS.slate100, fg: COLORS.slate700 };

const carrierInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

export function renderWorkOrderEmail(p: VendorEmailRequest): string {
    const vendorDisplay = escapeHtml(p.vendor.name || p.vendor.companyName || 'Vendor');
    const carrierName = p.carrier?.dbaName || p.carrier?.legalName;
    const carrierLegal = p.carrier?.legalName;
    const carrierLocation = [p.carrier?.city, p.carrier?.state].filter(Boolean).join(', ');

    // Carrier identity card — always at top, between greeting and asset list.
    const carrierCard = p.carrier ? `
        <tr>
            <td style="padding:16px 24px 0 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.primaryFaint};border:1px solid ${COLORS.primaryLight};border-radius:10px;">
                    <tr>
                        <td style="padding:14px 16px;width:54px;vertical-align:top;">
                            <div style="width:42px;height:42px;border-radius:10px;background:${COLORS.primary};color:#ffffff;font-weight:700;font-size:14px;text-align:center;line-height:42px;letter-spacing:0.02em;">
                                ${escapeHtml(carrierInitials(carrierName || carrierLegal || 'CR'))}
                            </div>
                        </td>
                        <td style="padding:14px 16px 14px 0;vertical-align:top;">
                            <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.primaryDark};font-weight:600;">From Carrier</div>
                            <div style="font-size:15px;color:${COLORS.slate900};font-weight:700;margin-top:2px;">${escapeHtml(carrierName || carrierLegal || '')}</div>
                            ${carrierName && carrierLegal && carrierName !== carrierLegal ? `<div style="font-size:12px;color:${COLORS.slate500};margin-top:1px;">${escapeHtml(carrierLegal)}</div>` : ''}
                            <div style="font-size:11px;color:${COLORS.slate600};margin-top:4px;">
                                ${p.carrier.dotNumber ? `<span style="display:inline-block;background:#ffffff;border:1px solid ${COLORS.primaryLight};border-radius:4px;padding:1px 6px;font-weight:600;color:${COLORS.primaryDark};margin-right:6px;">DOT #${escapeHtml(p.carrier.dotNumber)}</span>` : ''}
                                ${carrierLocation ? `<span>${escapeHtml(carrierLocation)}</span>` : ''}
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>` : '';

    // Asset rows — each asset gets its own card with year/make/model + colored
    // service chips grouped by category.
    const taskRows = p.tasks
        .map((t) => {
            const meta = [t.year, t.make, t.model].filter(Boolean).join(' ');
            const vin = t.vin ? `VIN •••${t.vin.slice(-4)}` : '';
            const serviceChips = t.services
                .map((s) => {
                    const c = chipForGroup(s.group);
                    return `<span style="display:inline-block;font-size:11px;font-weight:600;padding:4px 10px;border-radius:999px;background:${c.bg};color:${c.fg};margin:2px 4px 2px 0;">${escapeHtml(s.name)}</span>`;
                })
                .join('');
            return `
                <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid ${COLORS.slate100};">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="vertical-align:top;width:40px;">
                                    <div style="width:32px;height:32px;border-radius:6px;background:${COLORS.slate100};color:${COLORS.slate600};text-align:center;line-height:32px;font-size:11px;font-weight:700;">
                                        ${t.services.length}
                                    </div>
                                </td>
                                <td style="vertical-align:top;padding-left:8px;">
                                    <div style="font-size:14px;font-weight:700;color:${COLORS.slate900};">${escapeHtml(t.unitNumber)}</div>
                                    ${meta ? `<div style="color:${COLORS.slate500};font-size:12px;margin-top:2px;">${escapeHtml(meta)}${vin ? ` · ${escapeHtml(vin)}` : ''}</div>` : (vin ? `<div style="color:${COLORS.slate500};font-size:12px;margin-top:2px;">${escapeHtml(vin)}</div>` : '')}
                                    <div style="margin-top:8px;">${serviceChips}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>`;
        })
        .join('');

    const requirementRows: string[] = [];
    if (p.requirements.odometerRequired) {
        requirementRows.push(
            `<span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:${COLORS.primary};margin-right:8px;vertical-align:middle;"></span>Outbound odometer reading <strong style="color:${COLORS.slate900};">required</strong> <span style="color:${COLORS.slate500};">(${p.requirements.odometerUnit})</span>`
        );
    }
    if (p.requirements.engineHoursRequired) {
        requirementRows.push(
            `<span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:${COLORS.primary};margin-right:8px;vertical-align:middle;"></span>Engine hours reading <strong style="color:${COLORS.slate900};">required</strong>`
        );
    }
    if (requirementRows.length === 0) {
        requirementRows.push(
            `<span style="display:inline-block;width:6px;height:6px;border-radius:999px;background:${COLORS.slate300};margin-right:8px;vertical-align:middle;"></span><span style="color:${COLORS.slate500};">No mandatory readings.</span>`
        );
    }

    const notesBlock = p.notes
        ? `
            <tr>
                <td style="padding:0 24px 16px 24px;">
                    <div style="background:${COLORS.amber50};border:1px solid ${COLORS.amber200};border-radius:8px;padding:12px 14px;">
                        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${COLORS.amber800};font-weight:700;margin-bottom:4px;">Fleet Remarks</div>
                        <div style="font-size:13px;color:${COLORS.slate700};font-style:italic;line-height:1.5;">"${escapeHtml(p.notes)}"</div>
                    </div>
                </td>
            </tr>`
        : '';

    const recipientName = p.vendor.contactName || vendorDisplay;
    const senderLabel = escapeHtml(p.senderName || carrierName || 'TrackSmart Fleet');

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Work Order #${escapeHtml(p.workOrderNumber)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.slate100};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${COLORS.slate700};">
<!-- Hidden preheader: shows in inbox preview line under the subject -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ffffff;opacity:0;">
    ${carrierName ? `${escapeHtml(carrierName)} requested service` : 'New work order assigned'} · ${p.tasks.length} asset${p.tasks.length === 1 ? '' : 's'} · WO #${escapeHtml(p.workOrderNumber)}
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.slate100};padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,0.06);">

                <!-- Top banner -->
                <tr>
                    <td style="background:linear-gradient(135deg,${COLORS.primary} 0%,${COLORS.primaryDark} 100%);padding:24px 28px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                                <td style="vertical-align:middle;">
                                    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#bfdbfe;font-weight:700;">TrackSmart Fleet</div>
                                    <div style="font-size:24px;color:#ffffff;font-weight:700;margin-top:6px;letter-spacing:-0.01em;">Work Order #${escapeHtml(p.workOrderNumber)}</div>
                                    <div style="font-size:13px;color:#dbeafe;margin-top:4px;">${p.tasks.length} asset${p.tasks.length === 1 ? '' : 's'} · ${p.tasks.reduce((sum, t) => sum + t.services.length, 0)} service${p.tasks.reduce((sum, t) => sum + t.services.length, 0) === 1 ? '' : 's'} requested</div>
                                </td>
                                <td align="right" style="vertical-align:middle;">
                                    <div style="display:inline-block;background:rgba(255,255,255,0.15);color:#ffffff;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);">
                                        Action Required
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                ${carrierCard}

                <!-- Greeting -->
                <tr>
                    <td style="padding:20px 24px 4px 24px;">
                        <div style="font-size:15px;color:${COLORS.slate900};font-weight:600;">Hi ${escapeHtml(recipientName)},</div>
                        <div style="font-size:14px;color:${COLORS.slate700};line-height:1.6;margin-top:8px;">
                            A new work order has been assigned to <strong style="color:${COLORS.slate900};">${vendorDisplay}</strong>${carrierName ? ` by <strong style="color:${COLORS.slate900};">${escapeHtml(carrierName)}</strong>` : ''}.
                            Please review the asset(s) and services below, then submit your completion details (labor, parts, odometer, invoice) using the button at the bottom of this email.
                        </div>
                    </td>
                </tr>

                <!-- Schedule + Due -->
                <tr>
                    <td style="padding:18px 24px 0 24px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLORS.slate200};border-radius:10px;background:${COLORS.slate50};">
                            <tr>
                                <td style="padding:14px 16px;border-right:1px solid ${COLORS.slate200};width:50%;">
                                    <div style="font-size:10px;text-transform:uppercase;color:${COLORS.slate500};letter-spacing:0.08em;font-weight:700;">Create Date</div>
                                    <div style="font-size:15px;color:${COLORS.slate900};font-weight:700;margin-top:4px;">${fmtDate(p.createDate)}</div>
                                </td>
                                <td style="padding:14px 16px;width:50%;">
                                    <div style="font-size:10px;text-transform:uppercase;color:${COLORS.slate500};letter-spacing:0.08em;font-weight:700;">Order Due Date</div>
                                    <div style="font-size:15px;color:${p.dueDate ? COLORS.slate900 : COLORS.slate400};font-weight:700;margin-top:4px;">${fmtDate(p.dueDate)}</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>

                <!-- Asset list -->
                <tr>
                    <td style="padding:18px 24px 0 24px;">
                        <div style="font-size:11px;text-transform:uppercase;color:${COLORS.slate500};font-weight:700;letter-spacing:0.08em;margin-bottom:8px;">Asset(s) &amp; Services</div>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${COLORS.slate200};border-radius:10px;overflow:hidden;background:#ffffff;">
                            ${taskRows}
                        </table>
                    </td>
                </tr>

                <!-- Completion requirements -->
                <tr>
                    <td style="padding:18px 24px 0 24px;">
                        <div style="font-size:11px;text-transform:uppercase;color:${COLORS.slate500};font-weight:700;letter-spacing:0.08em;margin-bottom:8px;">Completion Requirements</div>
                        <div style="background:${COLORS.slate50};border:1px solid ${COLORS.slate200};border-radius:10px;padding:12px 16px;font-size:13px;color:${COLORS.slate700};line-height:2;">
                            ${requirementRows.join('<br>')}
                        </div>
                    </td>
                </tr>

                ${notesBlock}

                <!-- CTA -->
                <tr>
                    <td style="padding:24px 24px 8px 24px;text-align:center;">
                        <a href="${p.portalUrl}" style="display:inline-block;background:${COLORS.primary};color:#ffffff !important;text-decoration:none;font-weight:700;font-size:15px;padding:14px 36px;border-radius:10px;box-shadow:0 1px 2px rgba(37,99,235,0.3);">
                            Open Work Order &amp; Submit Update →
                        </a>
                        <div style="font-size:11px;color:${COLORS.slate500};margin-top:14px;line-height:1.5;">
                            Or paste this link into your browser:<br>
                            <a href="${p.portalUrl}" style="color:${COLORS.primary};word-break:break-all;text-decoration:underline;">${p.portalUrl}</a>
                        </div>
                    </td>
                </tr>

                <!-- Footer -->
                <tr>
                    <td style="padding:24px;border-top:1px solid ${COLORS.slate100};margin-top:8px;">
                        <div style="font-size:11px;color:${COLORS.slate500};text-align:center;line-height:1.6;">
                            Sent by <strong style="color:${COLORS.slate700};">${senderLabel}</strong> via TrackSmart · This message was generated automatically.<br>
                            Reply to this email if you have questions about the work order.
                        </div>
                    </td>
                </tr>
            </table>
            <div style="font-size:10px;color:${COLORS.slate400};margin-top:12px;">
                You're receiving this because ${carrierName ? escapeHtml(carrierName) : 'a fleet'} assigned a work order to ${vendorDisplay}.
            </div>
        </td>
    </tr>
</table>
</body>
</html>`;
}
