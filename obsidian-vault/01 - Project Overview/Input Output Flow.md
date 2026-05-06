---
title: Input Output Flow
project: TrackSmart Dashboard
type: documentation
status: active
last_updated: 2026-05-06
tags:
  - project
  - flow
  - documentation
---

# Input Output Flow

> What feeds into the app, what state it changes, and what comes out. Useful when reasoning about a feature without running the dev server.

## Inputs

| Source | Where it enters | Notes |
| --- | --- | --- |
| User selection (sidebar / buttons / forms) | React event handlers in pages and modals | Drives `useState` in pages and global state in [[AppDataContext]]. |
| Login | `LoginPage` quick-login dropdown + `DEMO_PASSWORD` | Picks a user from `APP_USERS`. Identity persisted to `localStorage["app_current_user_id"]`. |
| Excel uploads | `xlsx ^0.18.5` `read()` in inspection upload flows | Browser-side parse only. |
| File uploads | `<input type="file">` + `FileReader` (e.g. document attachments) | Stored as JS objects in `AppDataContext.documents` — no real upload target. |
| Vendor work-order link | URL hash (`#/vendor/work-order?d=<base64url>`) | Decoded by `decodePayload()` in `vendorPortal.utils.ts`. |
| `RESEND_API_KEY` | `process.env` | Read by `api/send-vendor-email.ts`. |

## State changes

| Trigger | What changes |
| --- | --- |
| Sidebar click | `path` (in `App.tsx`) → triggers `renderPage()` |
| Quick login | `currentUser`, `selectedAccount`, `selectedServiceProfileId`, `path = "/dashboard"` |
| Sign out | `currentUser = null`, `selectedAccount = null`, `path = "/dashboard"`, removes `app_current_user_id` |
| Carrier switcher | `selectedAccount` (only for users with `>1` carrier in scope) |
| Service-profile switcher | `selectedServiceProfileId` |
| Compliance/document/folder/tag actions | Slices in [[AppDataContext]] |
| Threshold edits | `csaThresholds`, `cvorThresholds`, `*OosThresholds`, `*CategoryThresholds` in [[AppDataContext]] — affects every safety analysis chart |
| Vendor portal save | `localStorage["tracksmart_vendor_responses"]` (keyed by `orderId`) |

## Outputs

| Output | Where it goes | Triggered by |
| --- | --- | --- |
| Render | `<main>` content via `renderPage()` | Every state change |
| User identity | `localStorage["app_current_user_id"]` | Login / logout |
| Vendor responses | `localStorage["tracksmart_vendor_responses"]` | `saveVendorResponse()` from the public vendor portal |
| Vendor email | Resend → recipient inbox | `POST /api/send-vendor-email` from the work-order modal |
| Excel download | Browser file save via `xlsx-js-style` | `exportExcel.ts` in safety-analysis |
| PDF download | Browser file save via `jspdf` | `generateFmcsaPdf` / `generateCvorPdf` / `generateNscPdf` (in flight) |
| Console logs | DevTools console | `console.log()` calls in `App.tsx` (`Navigated to:`, `Selected account:`) |

## Vendor portal flow (end-to-end)

```
[Carrier user]
  └─ Maintenance page → Create Order modal
       └─ Build VendorOrderPayload
       └─ buildVendorPortalUrl(payload) → "<origin>/<path>#/vendor/work-order?d=<base64url>"
       └─ POST /api/send-vendor-email { ..., portalUrl }
            └─ Resend.sendEmail()
                 └─ Vendor inbox email with the portal link
                      └─ Vendor opens link
                           └─ App.tsx: isVendorPortalUrl() → true
                                └─ Renders <VendorWorkOrderFormPage> (no auth)
                                     └─ Vendor fills form
                                          └─ saveVendorResponse() → localStorage
```

> The carrier-side app does **not** see the response — there's no backend round-trip. This is a known prototype limitation tracked in [[Known Issues]].

## Login flow

```
1. App.tsx mounts
2. localStorage["app_current_user_id"] → currentUser via findUserById()
3. If null → render <LoginPage>
   - Dropdown: groups APP_USERS by service profile
   - Type/select email → password = DEMO_PASSWORD → onSignIn(user)
4. App.tsx: setCurrentUser, setSelectedAccount = getDefaultCarrierForUser(user), setPath("/dashboard")
5. Sidebar + TopNavbar render; renderPage() returns the dashboard placeholder
```

## Inspection PDF flow (in flight)

```
User clicks "Download <Jurisdiction> PDF" in Inspections page
  └─ generate*Pdf({ ... })
       1. Mount <CvorPdfReport /> | <FmcsaPdfReport /> | <NscPdfReport /> off-screen at left:-10000px
       2. Wait for two RAFs + 350ms + document.fonts.ready
       3. For each <div class="pdf-page">: html2canvas → image
       4. Compose into jsPDF (A4 portrait 794×1123 @ ~96 dpi)
       5. pdf.save(fileName)
       6. Unmount + remove host element
```

## Related

- [[Frontend]]
- [[Backend]]
- [[Database and Storage]]
- [[Vendor Portal]] (in [[Current Features]])
