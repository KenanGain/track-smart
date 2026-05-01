# 03 — API Contract

Three endpoints, plus an optional async pattern for bulk. All requests use `multipart/form-data` for the upload itself; responses are `application/json`.

---

## Auth

`Authorization: Bearer <api_key>`

The `api_key` is provisioned per environment (sandbox + production). Treat it as a secret. We will rotate yearly.

---

## Endpoints

### `POST /v1/cvor/extract` — single PDF (synchronous)

Accept one CVOR PDF, return extraction.

**Request**

```http
POST /v1/cvor/extract HTTP/1.1
Host: api.<vendor>.com
Authorization: Bearer <api_key>
Content-Type: multipart/form-data; boundary=----...

------...
Content-Disposition: form-data; name="file"; filename="06042001_Ontario.pdf"
Content-Type: application/pdf

<binary>
------...--
```

**Success — 200 OK**

Body must validate against `cvor-extraction-response.schema.json`. See `examples/response-single.json`.

**Error responses** — see `examples/response-error.json`.

**Latency target:** ≤30 s.

---

### `POST /v1/cvor/extract/bulk` — multiple PDFs (async)

Submit up to 50 PDFs. Returns a job ID immediately (`202 Accepted`); poll for results or use a webhook.

**Request**

```http
POST /v1/cvor/extract/bulk HTTP/1.1
Authorization: Bearer <api_key>
Content-Type: multipart/form-data
X-Webhook-Url: https://app.tracksmart.com/api/webhooks/cvor-extract  (optional)

(multiple file parts named "files[]")
```

**Response — 202 Accepted**

```json
{
  "jobId": "job_01HZ...",
  "submitted": 12,
  "status": "processing",
  "createdAt": "2026-04-29T15:42:00Z",
  "pollUrl": "/v1/cvor/extract/jobs/job_01HZ..."
}
```

---

### `GET /v1/cvor/extract/jobs/{jobId}` — poll bulk status

**Response — 200 OK while processing**

```json
{
  "jobId": "job_01HZ...",
  "status": "processing",
  "submitted": 12,
  "completed": 7,
  "failed": 0
}
```

**Response — 200 OK when finished**

```json
{
  "jobId": "job_01HZ...",
  "status": "succeeded",   // "succeeded" | "partially_failed" | "failed"
  "submitted": 12,
  "completed": 11,
  "failed": 1,
  "results": [ ... ]       // see examples/response-bulk.json
}
```

The `results[]` array contains, for each input file (in submission order), **either** a successful extraction (same shape as the single-PDF response, plus a `fileName` field) **or** an error object with the same shape as `examples/response-error.json`.

---

### Webhook (optional)

If the caller passes `X-Webhook-Url`, you POST the same body as the polling success response, signed with `X-Signature: sha256=<hex>`, secret = the API key.

---

## Error format

All errors share this envelope:

```json
{
  "error": {
    "code":    "INVALID_PDF",
    "message": "Cannot parse the uploaded file as a PDF.",
    "field":   null,
    "page":    null,
    "traceId": "trace_01HZ..."
  }
}
```

| `code`               | HTTP | When |
|---|---|---|
| `INVALID_PDF`        | 400 | Not a PDF, or zero pages |
| `WRONG_FORM`         | 400 | Looks like a PDF but not the MTO CVOR Carrier Safety Profile (e.g. an inspection report) |
| `OCR_FAILED`         | 422 | OCR couldn't resolve enough text to extract the required fields |
| `MISSING_REQUIRED`   | 422 | A required field could not be found. `field` = JSON path. `page` = source page if known |
| `UNAUTHORIZED`       | 401 | Bad or missing API key |
| `RATE_LIMITED`       | 429 | Quota exceeded. `Retry-After` header set |
| `JOB_NOT_FOUND`      | 404 | Polling an unknown job ID |
| `INTERNAL`           | 500 | Anything else. `traceId` is mandatory so we can correlate with vendor logs |

We expect partial extractions to **succeed** (not error) when only optional fields are missing. Use `MISSING_REQUIRED` only when a required field is absent.

---

## Idempotency

The single endpoint is **not** idempotent — re-submitting the same PDF will rerun extraction and bill again. We dedupe on our side by `(carrier.cvorNumber, pull.reportDate)`. If you support an `Idempotency-Key` header, we'd take advantage of it.

---

## Versioning

URL-versioned (`/v1/...`). Breaking changes ship behind a new path (`/v2/...`) with at least 6 months of overlap.

---

## Pagination / size limits

- Single PDF: max 25 MB.
- Bulk: max 50 files, max 250 MB total.
- File names accept any Unicode + space; we'll always set `filename=` on the multipart part.
