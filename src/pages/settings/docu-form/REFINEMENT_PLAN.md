# Docu/Form Generator — UI Refinement Plan

**Scope:** UI / UX polish only. Functionality, data model, and persistence are
unchanged. The Hiring Templates page is **out of scope** for this pass — it will
be addressed next.

**Why now:** Popup forms (modals) currently feel cramped, sections compete for
attention without clear hierarchy, and admins lose context inside dense panels.

---

## A. Field Settings Modal (FormFieldsEditor.tsx → `FieldSettingsModal`)

The most-used surface in the whole generator. Today it is `max-w-2xl` and all
sections stack into one scroll column.

**Refinement**
- Widen to `max-w-5xl`, give a fixed comfortable height with internal scroll.
- Two-column body inside the modal:
  - **Left rail (≈ 35 %)** — Basics: Label, Field type chip + "Change type"
    button, Required toggle, Instruction.
  - **Right pane (≈ 65 %)** — type-specific settings: Options editor, Document
    Type picker, Subform picker, Follow-up wizard, Visibility rule.
- Each section in the right pane wrapped in a soft-bordered card with a tiny
  uppercase eyebrow label so admins can scan in seconds.
- Sticky DialogFooter (Cancel / Save) so the action buttons never scroll out.
- Bigger inputs (`h-10`), more generous padding (`p-4` on cards).

**Loophole guards**
- Type picker, when expanded, replaces the left chip in-place — no nested
  overlapping pickers.
- Save button stays disabled with the same rules as today.
- All field-type branches keep their current behaviour (options, doc-type,
  subform, follow-up wizard).

---

## B. Document Type Modal (DocumentsTab.tsx → `DocumentTypeModal`)

Today: `max-w-xl`, 2-col toggle grid, tight padding.

**Refinement**
- Widen to `max-w-3xl`.
- Header icon + descriptive subhead inside the modal body.
- Two clear sections: **Basics** (name / category / status) and **Upload
  settings** (6 toggles).
- Toggle grid → 2 columns at md, 3 at lg, taller toggle rows with more
  vertical room.
- Sticky footer.

**Loophole guards**
- No new fields; same 6 toggles in the same data slots.
- Validation rule (name required) preserved.

---

## C. Application Form Builder (ApplicationFormEditor.tsx → `ApplicationFormBuilder`)

Today: flat `space-y-5` column with one `SectionTitle` divider for fields.

**Refinement**
- Group inputs into 3 clear cards:
  1. **Details** — Form name, Display title, Description.
  2. **Applicant intro** — Intro/instructions textarea.
  3. **Subform configuration** (only when `isSubform`) — already a card; keep.
- The Fields section gets its own bordered card with a header row that holds
  the Preview Web Form / Preview PDF buttons (instead of the buttons sitting
  loose at the top).
- Standard-driver lock notice gets a cleaner illustrated state.

**Loophole guards**
- No props change; `onChange(form)` signature identical.
- Preview & Print overlays keep working unchanged.

---

## D. Follow-up Wizard (FormFieldsEditor.tsx → `FollowUpFieldsConfig`)

Today: emerald card inside a 2xl modal, picker grid 2-col, narrow doc-type
picker.

**Refinement**
- With the modal widened, the picker has room to breathe:
  - YES / NO trigger as two pill buttons side-by-side, not segmented strip.
  - Quick-add grid → 3 columns.
  - Doc-type stage → grid of cards, not a vertical list, with category badge.
- Existing-dependents list → cleaner one-line rows with type icon, label,
  trigger badge, linked doc-type badge.

**Loophole guards**
- Same state machine (`stage`, `whenOn`, `customQuestion`).
- Same `onAddFollowUp` callback contract.

---

## E. Options Editor (OptionsEditor.tsx)

Today: `space-y-1.5`, `h-7` input, tiny remove/reorder buttons.

**Refinement**
- `space-y-2`, `h-9` input, slightly taller row, larger touch targets.
- Empty state with bigger illustration area.

**Loophole guards**
- No prop changes.

---

## Out of scope (this pass)

- Hiring Templates page and Test Runner — separate refinement pass after this.
- Persistence keys, normalize(), seed data — untouched.
- Conditional visibility rules engine — untouched.

---

## Execution order

1. `OptionsEditor.tsx` — smallest, isolated.
2. `DocumentTypeConfig.tsx` — referenced by the field modal.
3. `FormFieldsEditor.tsx` — field settings modal + follow-up wizard.
4. `DocumentsTab.tsx` — document type modal.
5. `ApplicationFormEditor.tsx` — form builder layout.
6. Run `vite build`, fix any imports, eyeball the dev server.
