// ─────────────────────────────────────────────────────────────────────────────
// sample-doc.ts — the stand-in document the seeded fleet's paperwork points at.
//
// Its own module, and a leaf one, for two reasons. The demo needs ONE of these: a
// screen where half the View buttons open something and half are dead teaches you
// nothing about whether the half that work are working. And the seeds that need it sit
// on both sides of an import that already runs one way — maintenance.data pulls the
// generated orders in, so the generator cannot reach back into maintenance.data for a
// value without the two deadlocking at start-up and leaving a blank page behind.
// ─────────────────────────────────────────────────────────────────────────────

/** A real, tiny PDF, so every View and Download in the demo opens something. */
export const SAMPLE_DOC_URL =
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
