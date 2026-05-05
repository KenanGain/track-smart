# Vendor Work Order Email Flow

End-to-end design for sending a maintenance work order to an external repair shop, having them fill out a web form, and capturing the response.

This doc covers two layers:

1. **Frontend-only test path** that's already wired up in this prototype.
2. **Production path** with real email + backend persistence.

---

## 1. What's wired up today (frontend-only)

### Files

| Path | Purpose |
|---|---|
| `src/data/vendors.data.ts` | Original vendor mock |
| `src/pages/inventory/inventory.data.ts` | Extended vendor list (CreateOrderModal pulls from here). Two test vendors `v-test-01` (kenangain350@gmail.com) and `v-test-02` (vkadvani@gmail.com) added. |
| `src/pages/vendor-portal/vendorPortal.utils.ts` | URL encoder/decoder + mailto helper + localStorage persistence |
| `src/pages/vendor-portal/VendorWorkOrderFormPage.tsx` | Public form page mirroring the mechanic-portal HTML |
| `src/pages/assets/CreateOrderModal.tsx` | Added "Create & Send to Vendor" button + post-create email panel |
| `src/App.tsx` | Short-circuits to the vendor page when URL hash matches `#/vendor/work-order` |

### Flow

```
Fleet user creates work order in CreateOrderModal
  → clicks "Create & Send to Vendor"
  → modal generates orderId + base64url-encodes the entire payload into the hash URL
       e.g. https://app.example.com/#/vendor/work-order?d=<base64-payload>
  → modal shows the URL + a "Open Email to Vendor" button
       → button opens mailto:<vendor>?subject=...&body=...<URL>...
       → user's mail client (Gmail web, Outlook, Apple Mail) takes over
  → vendor clicks the link in the email
  → App.tsx detects the hash → renders VendorWorkOrderFormPage standalone
       (no sidebar, no auth, no app shell)
  → vendor fills appointment time, labor lines, parts lines, odometer, invoice file
  → on submit: response saved to localStorage under `tracksmart_vendor_responses`
       and logged to console
```

### Why URL-encoding the payload (not a backend lookup)

For pure frontend testing, two devices/browsers can't share a database. Encoding the work order into the link itself makes every email self-contained — the vendor can open the link from any browser and see the right asset, services, requirements, and remarks without any server.

Tradeoffs:
- **OK for testing**: payload size is small (~1–3 KB even with several tasks).
- **Not OK for production**: data is in the URL clear-text, the link can't be revoked, and you have no audit trail of who opened what when.

---

## 2. Production path

### 2.1 Backend pieces you'll need

1. **A `work_orders` table** holding the order, vendor, asset, services, requirements, due date, and current status (`sent` / `viewed` / `submitted`).
2. **A `work_order_responses` table** holding the vendor's submitted form (labor lines, parts lines, odometer, engine hours, invoice file URL, totals).
3. **An object store** (S3 / Supabase Storage / GCS) for the uploaded invoice file.
4. **A signed-link generator** — a short-lived JWT or HMAC-signed token that resolves to one work order ID and one vendor ID.
5. **An email send endpoint** that calls SES / Mailgun / Postmark / Resend with a templated email containing the signed link.
6. **A public `GET /api/vendor/work-order/:token` endpoint** that returns the order if the token is valid and not yet expired.
7. **A public `POST /api/vendor/work-order/:token/submit` endpoint** that accepts the form payload + invoice file.

### 2.2 Drop-in replacements for the prototype helpers

In `vendorPortal.utils.ts`, swap the helpers with API calls:

```ts
// Today (encoded in URL):
export function buildVendorPortalUrl(payload) {
    return `${origin}${path}#/vendor/work-order?d=${encodePayload(payload)}`;
}

// Production:
export async function buildVendorPortalUrl(orderId, vendorId) {
    const { token, expiresAt } = await api.post('/work-orders/sign-link', {
        orderId, vendorId, ttlSeconds: 60 * 60 * 24 * 7,
    });
    return `${PUBLIC_PORTAL_URL}/${token}`;
}
```

`VendorWorkOrderFormPage` becomes:

```ts
const { token } = useParams();
const { data: payload } = useQuery(['vendor-order', token],
    () => api.get(`/vendor/work-order/${token}`));
// …same form…
const onSubmit = async (form) => {
    const fileRef = await uploadInvoice(form.invoiceFile, token);
    await api.post(`/vendor/work-order/${token}/submit`, { ...form, invoiceUrl: fileRef });
};
```

### 2.3 Sending the email

Replace the `mailto:` button with a backend call:

```ts
async function sendWorkOrderEmail(orderId, vendorId) {
    await api.post('/work-orders/email', { orderId, vendorId });
    // Backend uses Resend / SES / Postmark with a transactional template
    // that interpolates the vendor name and signed link.
}
```

A typical SES + Node template:

```ts
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const ses = new SESv2Client({ region: 'us-east-1' });
await ses.send(new SendEmailCommand({
    FromEmailAddress: 'orders@tracksmart.app',
    Destination: { ToAddresses: [vendor.email] },
    Content: {
        Template: {
            TemplateName: 'work-order-vendor',
            TemplateData: JSON.stringify({
                vendorName: vendor.contactName,
                workOrderNumber: order.number,
                portalUrl: signedUrl,
                dueDate: order.dueDate,
            }),
        },
    },
    ConfigurationSetName: 'tracksmart-transactional', // for bounce/complaint tracking
}));
```

### 2.4 Security checklist

- **Sign every link.** Use a HMAC-signed JWT with `{ orderId, vendorId, exp }`. Reject tampered tokens server-side.
- **Expire links** after 7–14 days (you can re-issue if the vendor needs more time).
- **Single-vendor scoping.** The signed token must scope the response to the assigned vendor — never let a stray click submit for a different shop.
- **Rate limit** the public `submit` endpoint per token + IP.
- **Validate file uploads**: enforce a max size (e.g. 10 MB), restrict mime types (PDF, JPG, PNG), virus-scan if your storage supports it (S3 + GuardDuty Malware Protection, or Supabase + clamav).
- **Audit log** every link send, view, and submission with timestamps and the actor's IP/user-agent.
- **CSRF / origin check** on submit (this is a public form, but you can still pin to a single referrer if you embed the form on `vendor.tracksmart.app`).

### 2.5 Tracking states

Update the work order's `status` as the vendor moves through the funnel:

| Event | New status |
|---|---|
| Email sent | `sent` |
| First GET on `/vendor/work-order/:token` | `viewed` (also stamp `firstViewedAt`) |
| Successful POST | `submitted` |
| Token expires without submit | `expired` |

The fleet user sees this lifecycle in the Maintenance page as a colored chip on each order row.

### 2.6 Deliverability

- **Use a transactional sending service** with a verified domain + DKIM/SPF/DMARC. Direct SMTP from your app server will land in spam.
- **From address**: a real mailbox like `orders@yourdomain.com`, not `noreply@`. Some shops will reply directly with questions.
- **Subject + preheader**: include the vendor's name and the asset unit number (`Work Order #77291 — Unit TR-1049 service request`).
- **Single CTA button** in the email body, no marketing decoration. Plain HTML + a fallback text body.

### 2.7 Migration checklist (when you switch from prototype → production)

1. Add `work_orders` and `work_order_responses` tables.
2. Replace `buildVendorPortalUrl` with a backend `sign-link` call.
3. Replace `readPayloadFromCurrentUrl` with `GET /vendor/work-order/:token`.
4. Replace `saveVendorResponse` (localStorage) with `POST /vendor/work-order/:token/submit`.
5. Replace the `mailto:` button with a `POST /work-orders/email` call.
6. Wire invoice file upload to S3 / Supabase Storage with a signed PUT URL.
7. Add the order-status chip to `AssetMaintenancePage`.
8. Optionally: webhooks from SES/Postmark to flag bounced or rejected sends back to the fleet user.

---

## 3. Testing the current prototype

1. `npm run dev`
2. Sign in, navigate to **Assets → Maintenance**.
3. Click **Create Order** (or select tasks first).
4. Pick the **Kenan Test Shop** (`v-test-01`) or **Kadvani Diesel** (`v-test-02`) vendor. Both have working email addresses on file.
5. Pick an asset, pick a maintenance type, set requirements / schedule / remarks.
6. Click **Create & Send to Vendor**.
7. The post-create panel shows the encoded URL — click **Open Email to Vendor** to launch your mail client with a pre-filled message, or **Preview as Vendor** to open the form in a new tab right now.
8. Fill the form, submit. The response is stored under `localStorage['tracksmart_vendor_responses']` keyed by `orderId`.

To inspect responses from the fleet side during testing:

```js
// in the browser console
JSON.parse(localStorage.getItem('tracksmart_vendor_responses'));
```
