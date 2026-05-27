# Carrier Compliance Setup — Plan

**Status:** Plan only. No code yet. Hand back to the user for review and tweaks
before implementation.

---

## 1. Mental model

The hierarchy is now:

```
SUPER ADMIN (root / system definitions — already built)
├── Key Numbers          (compliance numbers: USDOT, MC, EIN, NAICS, etc.)
├── Document Types       (CDL, MVR, Liability Insurance, etc.)
└── Document Tags        (Insurance, Policies, Quarter, CVOR Level, etc.)

NEW MODULE — "Carrier Compliance Setup"     ◀──── this plan
└── For each Carrier, toggle which Key Numbers + Document Types apply.
    Linked items cascade automatically (enabling one enables the other).
```

The Super Admin catalogs stay as the **single source of truth**. The new
module is purely about **which slice of that catalog applies to each carrier**
— it does not redefine numbers or document types, it only assigns them.

---

## 2. Where it lives in navigation

Under the existing **Super Admin** sidebar group, add a new entry:

```
Super Admin
├── Dashboard
├── Compliance and Documents   (existing — Key Numbers + Documents + Tags catalogs)
└── Carrier Compliance Setup   ◀── NEW
```

Route: `/admin/carrier-compliance-setup`.

Icon suggestion: `Building2` or `Network` from lucide-react.

---

## 3. Flow

1. Open **Carrier Compliance Setup** from the sidebar.
2. **Carrier picker** at the top of the page — dropdown listing every carrier
   the super admin has access to. Optional: a small carrier-list panel on
   the left if we want a persistent selector.
3. Below the picker, the same pill toggle pattern from Compliance and
   Documents:
   - **Compliance** — list of Key Numbers, each with an "Enabled for this
     carrier" switch.
   - **Documents** — list of Document Types, each with an "Enabled for this
     carrier" switch.
4. Sub-tabs match the catalogs:
   - Compliance pill → Regulatory / Tax / Codes / Bonds / Other.
   - Documents pill → All / Carrier / Asset / Driver / Accidents / Violation.
5. Toggle a row → assignment persists for that carrier.
6. **Auto-cascade**: toggling a row that has a link causes the other side to
   toggle too (see §5).

---

## 4. Data model

### Catalogs (already exist — unchanged)
- `SEED_KEY_NUMBERS` (from Super Admin Compliance and Documents) — id + name + group + linkedDocument.
- `DOCUMENTS` (Super Admin DocumentRow[]) — id + name + linkedTo + linkedType.

### New: per-carrier assignment
```ts
interface CarrierComplianceAssignment {
    carrierId: string;
    enabledKeyNumberIds: string[];      // ids that reference SEED_KEY_NUMBERS
    enabledDocumentTypeIds: string[];   // ids that reference DOCUMENTS
    updatedAt: string;                  // ISO date
}
```

Persisted as a map `Record<carrierId, CarrierComplianceAssignment>` in
localStorage under `ats:carrier-compliance-v1` (prototype). In production
this would be a backend table.

### Defaults
On first visit for a carrier, seed the assignment with everything that has
`status: 'Active'` enabled by default. Or, more conservatively, start with
all-disabled and let the super admin opt in. **Recommendation:** seed with
"Active" items enabled by default to reduce setup friction; super admin
can flip off what doesn't apply.

---

## 5. Linkage logic — the cascade

The catalog already wires linkages both ways:

- **Key Number → Document**: each `SEED_KEY_NUMBERS[i].linkedDocument`
  is the *name* of a document this number references.
  (e.g. MC Number → "Operating Authority")

- **Document → Key Number**: each `DOCUMENTS[i].linkedTo` + `linkedType: 'keynumber'`
  references a key number by name.
  (e.g. Operating Authority doc → "MC Number")

At module load we build two maps from these:

```ts
const KN_BY_DOC_NAME: Map<docName, knId>    // for the doc → kn cascade
const DOC_IDS_BY_KN_ID: Map<knId, docId[]>  // for the kn → doc cascade
```

### Cascade rules

When the user toggles an item:

| Action | Effect |
|---|---|
| Enable a Key Number | If it has `linkedDocument`, also enable that doc type. |
| Disable a Key Number | If it has `linkedDocument`, also disable that doc type. *(see §6)* |
| Enable a Document Type | If `linkedType === 'keynumber'`, also enable the matched key number. |
| Disable a Document Type | If `linkedType === 'keynumber'`, also disable the matched key number. *(see §6)* |

`linkedType === 'expense'` or `'module'` documents do **not** cascade —
they're not tied to a single key number.

`source: 'docu-form'` documents cascade the same way (they're regular docs,
just managed in the Docu/Form Generator).

---

## 6. Open question — cascade on disable

There are two options for disable cascade:

**Option A — hard cascade both ways (recommended).**
Disabling a Key Number also disables its linked Document Type (and vice
versa). Symmetric, predictable, easy to reason about.

**Option B — soft cascade with confirmation prompt.**
On disable, show "Also disable the linked X?" prompt. Less surprising but
more clicks.

**Recommendation:** Option A with a small toast ("Also disabled linked X
because they're paired"). The user can re-enable one without the other if
they really want to.

---

## 7. UI layout sketch

```
┌─────────────────────────────────────────────────────────────────┐
│ Super Admin / Carrier Compliance Setup                          │
│                                                                  │
│ Carrier Compliance Setup                                         │
│ Enable the key numbers and document types each carrier tracks.   │
│                                                                  │
│ Carrier: [Acme Logistics  ▼]      [Compliance | Documents]      │
├─────────────────────────────────────────────────────────────────┤
│ Regulatory and Safety Numbers │ Tax │ Codes │ Bonds │ Other     │
├─────────────────────────────────────────────────────────────────┤
│ ✏ Search numbers…                              Filter ▾         │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ NUMBER NAME      RELATED TO  STATUS         ENABLED       │   │
│ │ USDOT Number     Carrier     Active         [●─────]      │   │
│ │ MC Number        Carrier     Active         [●─────]      │   │
│ │   ↳ Linked to: Operating Authority (will cascade)         │   │
│ │ USDOT Legal Name Carrier     Active         [─────○]      │   │
│ └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

Per row:
- Read-only **name + scope + status** (from the catalog).
- One **Enabled** toggle on the right.
- For linked items: a small sublabel reminding the user that the linked
  item will cascade.

The Documents pill has the same skeleton but with the document table
columns from the existing Documents view (Document Name / Category /
Expiry Req. / etc.) — but those Required/Optional pills become **read-only**
in this view; the only mutable control is the Enabled toggle.

---

## 8. What we do NOT do here

- We do **not** edit names, descriptions, or compliance flags here — those
  live in the Super Admin catalog. Per-carrier overrides are out of scope.
- We do **not** assign individual *values* (the actual USDOT number for a
  carrier) — that's per-carrier data captured elsewhere. This module only
  decides whether the field is in scope.
- We do **not** touch Document Tags here. Tags are global classifiers.

---

## 9. Implementation steps (when greenlit)

1. **Sidebar entry** — add "Carrier Compliance Setup" under Super Admin.
2. **Route** — wire `/admin/carrier-compliance-setup` in `App.tsx`.
3. **Data file** — `carrier-compliance.data.ts` with the assignment type,
   `loadCarrierAssignments()`, `saveCarrierAssignments()`, and `seedFromActive()`.
4. **Cascade maps** — compute `KN_BY_DOC_NAME` and `DOC_IDS_BY_KN_ID` from
   the existing catalogs at module load.
5. **Page** — `CarrierComplianceSetupPage.tsx`:
   - Header (carrier picker, pill toggle, sub-tabs).
   - `KeyNumberAssignmentTable` (read-only key-number rows + Enabled toggle).
   - `DocumentAssignmentTable` (read-only doc rows + Enabled toggle).
   - Cascade handler triggered by either table's toggle.
6. **Toast** for cascade ("Also enabled/disabled linked X").

---

## 10. Decisions I need from you

1. **Where in the sidebar?** I assumed under Super Admin. OK?
2. **Default state for a fresh carrier?** Seed with all "Active" items enabled
   (faster setup), or start empty (explicit opt-in)? Recommended: all-Active
   pre-enabled.
3. **Cascade on disable** — hard cascade (recommended) or confirmation prompt?
4. **Multi-carrier bulk-apply?** Useful for big fleets ("copy assignment from
   carrier A to carriers B/C/D"). Worth building now, or v2?
5. **Audit log?** Should we log who enabled/disabled what for which carrier?
   Out of scope for prototype, but ask now if it matters.

Once you confirm those, I'll implement. Until then this file is the spec.
