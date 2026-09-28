// ─────────────────────────────────────────────────────────────────────────────
// The paper that goes with the kit.
//
// Handing a driver a fuel card, a tablet and a set of keys is not only an
// inventory fact — it is a receipt. "I have these, I will look after them, I
// will bring them back." The app already had that form (Uniform & Equipment
// Issue Receipt, one of the onboarding policy documents) and it already had the
// hand-out flow, and the two had never met: the office assigned the kit here and
// then went somewhere else to get a signature for it, typing the item list in by
// hand a second time.
//
// So the form is filled FROM the movement. The driver's name, the unit, today's
// date and — the whole point — the items, exactly the ones they ticked off as
// collected. A receipt that lists what the office hoped they took is not a
// receipt.
//
// And it happens more than once. An issue receipt is not a hiring document you
// sign on day one; it is signed every time kit changes hands, which is why a
// signed copy is filed as a VERSION on the driver's record rather than as a tick
// in a box that can only be ticked once.
//
// Nothing here imports React. The chat card, the driver app, the notification
// step and the record page all need the same answers, and two of those are not
// components.
// ─────────────────────────────────────────────────────────────────────────────

import { POLICY_FORMS, splitNameSerial, type PolicyFormDef, type PolicyTable } from "@/pages/hiring-process/policy-forms.data";
import { ONBOARDING_FORM_DEFS, getOnboardingFormDef } from "@/pages/hiring-process/onboarding.data";
import {
    newVersion, writeComplianceVersion, defaultMonitoring,
    type DocVersion, type FilledForm,
} from "@/pages/compliance/compliance-data-store";
import type { SafetyRecord } from "@/pages/compliance/safety-software-catalog.data";
import type { CollectionForm, CollectionLine } from "@/pages/messages/messages-store";
import { logInventoryEvent } from "./inventory-activity";

/** The receipt the office reaches for nine times out of ten. */
export const ISSUE_RECEIPT_ID = "equipment-issue";

/**
 * The tag that marks a copy as completed in the app rather than uploaded.
 *
 * On the version's own `tags`, so it travels with the record wherever it is read and needs
 * no new field. Anything without it came in as a file somebody scanned.
 */
export const FILLED_IN_SYSTEM = "Filled in system";

/**
 * Was this copy completed in the app, or is it a scan somebody uploaded?
 *
 * The ANSWERS are the evidence — an upload has a file, this has data. The tag is still read
 * for copies filed before the answers were kept, so the older rows do not suddenly start
 * claiming to be scans of something nobody ever scanned.
 */
export const isFilledInSystem = (v: { tags?: string[]; formData?: unknown } | null | undefined): boolean =>
    !!v && (!!v.formData || !!v.tags?.includes(FILLED_IN_SYSTEM));


/**
 * How a copy got onto the record.
 *
 * Three answers, not two, because "not filled in the app" is not the same as "uploaded".
 * A copy filed before the answers were kept has no data AND no file — calling it uploaded
 * puts a scan on the record that nobody ever scanned, which is the kind of small lie an
 * audit is made of. It is a row somebody recorded, and that is what it says.
 */
export type CopySource = "system" | "upload" | "recorded";

export function copySource(
    v: { tags?: string[]; formData?: FilledForm; files?: { size?: number; url?: string }[] } | null | undefined,
): CopySource {
    if (isFilledInSystem(v)) return "system";
    // A real upload has a real file behind it. Nobody uploads a zero-byte document.
    const real = (v?.files ?? []).some((f) => !!f.url || (f.size ?? 0) > 0);
    return real ? "upload" : "recorded";
}

/** One form as the picker lists it. */
export interface InventoryFormOption {
    id: string;
    /** How the compliance store keys it — the SAME id the driver's Forms tab uses. */
    recordId: string;
    title: string;
    blurb: string;
    /** "Onboarding paperwork" or "Consent form", for the picker's grouping. */
    group: "onboarding" | "consent";
}

/**
 * Where a signed copy is filed.
 *
 * The prefix scheme is the DQ file's, deliberately: a receipt signed from a chat card has
 * to land on the same record the driver's Forms tab opens, or the office ends up with two
 * histories of the same form and believes whichever one it happens to be looking at.
 */
export const formRecordIdFor = (defId: string): string =>
    getOnboardingFormDef(defId) ? `onbform:${defId}` : `consent:${defId}`;

/** The definition behind an id, from either catalog. */
export const inventoryFormDef = (defId: string): PolicyFormDef | undefined =>
    getOnboardingFormDef(defId) ?? POLICY_FORMS.find((f) => f.id === defId);

const optionOf = (f: PolicyFormDef, group: InventoryFormOption["group"]): InventoryFormOption => ({
    id: f.id,
    recordId: formRecordIdFor(f.id),
    title: `${f.title} ${f.accentTitle}`.replace(/\s+/g, " ").trim(),
    blurb: f.blurb,
    group,
});

/**
 * Every form in the system, for the picker.
 *
 * The whole catalog rather than a hand-picked shortlist: a carrier that wants its own
 * property agreement signed on hand-out should not have to ask for it to be added here,
 * and the one that is nearly always right is offered first anyway.
 */
export const INVENTORY_FORM_CATALOG: InventoryFormOption[] = [
    ...ONBOARDING_FORM_DEFS.map((f) => optionOf(f, "onboarding")),
    ...POLICY_FORMS.map((f) => optionOf(f, "consent")),
];

export const inventoryFormOption = (defId: string): InventoryFormOption | undefined =>
    INVENTORY_FORM_CATALOG.find((o) => o.id === defId);

/** Titles for a set of ids, in catalog order — for the confirmation block and the chat lead. */
export const inventoryFormTitles = (ids: string[]): string[] =>
    ids.map((id) => inventoryFormOption(id)?.title ?? id);

/**
 * The forms as they ride on a collection card.
 *
 * `pending` because nobody has signed anything yet: the card is the ask, and the signature
 * is the answer that comes back.
 */
export const collectionFormsFor = (ids: string[]): CollectionForm[] =>
    ids
        .map((id) => inventoryFormOption(id))
        .filter((o): o is InventoryFormOption => !!o)
        .map((o) => ({ defId: o.id, title: o.title, recordId: o.recordId, status: "pending" as const }));

// ── Filling it in from the movement ─────────────────────────────────────────

/** "2026-09-25" — the date a receipt is dated, without pulling in a date library. */
const todayIso = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * A row on a receipt.
 *
 * Looser than `CollectionLine` on purpose: a copy recovered from an older record has the
 * name and the serial its notes listed, and no honest answer for the rest. Every real
 * `CollectionLine` is one of these, so nothing that had a full line has to change.
 */
export type ReceiptLine = {
    itemId?: string;
    name: string;
    serial?: string;
    route?: CollectionLine["route"];
};

/** One line, as it reads on a piece of paper somebody signs. */
export const formLineText = (l: CollectionLine): string => `${l.name}${l.serial ? ` (${l.serial})` : ""}`;

/**
 * The kit, as a TABLE on the form.
 *
 * A receipt whose only record of what changed hands is "Items issued: fuel card, tablet, 2
 * uniforms, cab keys" run together in one field is a receipt nobody can check a line of —
 * not the driver signing it, and not the office reading it back months later. A row each,
 * with the serial that identifies the actual object, is the difference between a receipt
 * and a note.
 */
export function inventoryTable(
    lines: ReceiptLine[], holderLabel?: string, checked?: (l: ReceiptLine, i: number) => boolean,
): PolicyTable {
    const count = checked ? lines.filter(checked).length : lines.length;
    return {
        title: !checked ? `Items issued (${lines.length})`
            : count === lines.length ? `Items received (${count})`
                : `Items received (${count} of ${lines.length})`,
        // "How it is held" was a column of dashes on anything read back, and a word nobody
        // had to agree to on anything signed. What the driver actually does at the counter
        // is tick off what is in their hands, so that is the column.
        headers: ["Item", "Number / serial"],
        rows: lines.map((l) => [l.name, l.serial ?? ""]),
        checks: checked ? lines.map((l, i) => checked(l, i)) : undefined,
        checkHeader: checked ? "Got" : undefined,
        note: holderLabel ? `Issued for ${holderLabel}.` : undefined,
    };
}

/**
 * The form definition, with the kit written into it.
 *
 * The table goes at the top of the statement, because the sentence underneath it begins "I
 * acknowledge receipt of the company property listed above" — which, until now, was listed
 * nowhere. The free-text `itemsIssued` field drops out: it is the same list, in a worse
 * shape, and two copies of it on one page is how they end up disagreeing.
 */
export function formDefWithItems(
    def: PolicyFormDef, lines: ReceiptLine[], holderLabel?: string,
    /** When the form is being filled in: which rows are ticked right now. */
    checked?: (l: ReceiptLine, i: number) => boolean,
): PolicyFormDef {
    if (!lines.length) return def;
    return {
        ...def,
        fields: def.fields?.filter((f) => f.key !== "itemsIssued"),
        body: [{ table: inventoryTable(lines, holderLabel, checked) }, ...def.body],
    };
}

export interface IssueFormInput {
    driverName: string;
    /** What they actually took. Not what was offered. */
    lines: CollectionLine[];
    /** The unit the kit belongs to, when it belongs to one. */
    holderLabel?: string;
    issuedBy?: string;
    /** Overrides today — the office back-dating a receipt for kit collected on Friday. */
    date?: string;
}

/**
 * The form's fields, filled from what is moving.
 *
 * Keyed by the field names the form definitions actually use, so a form that asks for
 * `itemsIssued` gets the list and one that does not is simply left alone. Anything the
 * signer types over the top wins — these are a starting point, not a lock.
 */
export function issueFormValues(input: IssueFormInput): Record<string, string> {
    const date = input.date || todayIso();
    // One item per line, in the shape the form's `items` field stores: the receipt lists
    // things, and a comma-joined sentence is a list only to whoever typed it.
    const items = input.lines.map(formLineText).join("\n");

    const values: Record<string, string> = {
        applicant: input.driverName,
        driverName: input.driverName,
        printName: input.driverName,
        date,
        issueDate: date,
        // Not every form has a slot for it, and the ones that do not simply ignore it.
        // The unit is named under the table, not smuggled onto the end of the last item.
        itemsIssued: items,
    };

    // The fuel card agreement asks for the last four of the card. It is on the line we are
    // already handing over, so asking the driver to read it off the card is asking them to
    // do the office's typing.
    const card = input.lines.find((l) => /fuel/i.test(l.name) && !!l.serial);
    if (card?.serial) values.cardNumber = card.serial.replace(/\D/g, "").slice(-4) || card.serial;

    if (input.issuedBy) values.issuedBy = input.issuedBy;
    return values;
}

// ── Filing the signed copy ──────────────────────────────────────────────────

/**
 * A form's record, as the compliance store needs to see it.
 *
 * The same synthetic shape the DQ Files tab builds, for the same reason: a policy form is
 * not in the safety catalog, but the record page it opens in does not care where a record
 * came from as long as it is shaped like one.
 */
export function inventoryFormRecord(defId: string): SafetyRecord | null {
    const def = inventoryFormDef(defId);
    if (!def) return null;
    return {
        id: formRecordIdFor(defId),
        recordName: `${def.title} ${def.accentTitle}`.replace(/\s+/g, " ").trim(),
        description: def.blurb,
        numberName: "",
        documentName: "Signed form",
        category: "Other" as SafetyRecord["category"],
        entity: "Driver",
        type: "D",
        docRequirement: "optional",
        recurring: "Per hire",
        monitorType: "On file",
        // A form is not monitored on a status — nothing ever writes one, so the column was a
        // permanent dash taking up the widest slot on the record header.
        hideStatus: true,
        // What a signed copy IS dated by: the day it was signed. Worth a column; the
        // record otherwise showed the file name and nothing about when it was given.
        tracksIssueDate: true,
        issueLabel: "Signed on",
        jurisdiction: "",
        monitor: "Keep a signed copy of the completed form on file.",
        uploadMode: "single",
    };
}

// ── Reading one back ────────────────────────────────────────────────────────

/** The form behind a filed record id — `formRecordIdFor`, run backwards. */
export const formDefIdOfRecord = (recordId: string): string | undefined => {
    const m = /^(?:onbform|consent):(.+)$/.exec(recordId);
    const id = m?.[1];
    return id && inventoryFormDef(id) ? id : undefined;
};

/** The trailing " — ACM-T0103" on a filed copy's label, which is the unit it was for. */
const suffixOfLabel = (label: string): string | undefined => {
    const at = label.lastIndexOf(" — ");
    const tail = at < 0 ? "" : label.slice(at + 3).trim();
    return tail || undefined;
};

/**
 * The kit, read back off the notes.
 *
 * `signedFormVersion` writes one bullet per item ("• Winter Kit (EQP-047052)") into the
 * version's notes precisely so the list survives outside the PDF — so a copy filed before
 * the answers were kept still has its items, in the app's own format rather than a guess.
 */
export function linesFromNotes(notes?: string): ReceiptLine[] {
    return (notes ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("•"))
        // Split by the same parser the form itself uses, so a list typed into the blank
        // form and one written by a hand-out come apart the same way.
        .map(splitNameSerial)
        .filter((l) => !!l.name);
}

/** A copy that can be opened, and whether it is the real thing or what was left of it. */
export interface ViewableForm {
    filled: FilledForm;
    /**
     * True when the answers were NOT kept and this was rebuilt from the record. The viewer
     * says so, rather than presenting a reconstruction as the signed document.
     */
    recovered: boolean;
}

/**
 * Can this version be opened as a form, and as what?
 *
 * Gating the view button on `formData` alone was correct and useless: every copy filed
 * before the answers were kept is a receipt with a name, a date and an item list sitting on
 * a record with no way to look at it. So a version on a record that IS a form is always
 * openable — with its real answers when it has them, and otherwise with what the record
 * itself knows: the kit from the notes, the signer, the date. Marked `recovered`, because a
 * rebuilt copy presented as the signed one is the lie this whole module exists to avoid.
 *
 * Returns null for the 36 record types that are not forms. Those rows keep no button.
 */
export function viewableForm(
    recordId: string,
    v: {
        label?: string; notes?: string; issueDate?: string;
        uploadedBy?: string; formData?: FilledForm;
    } | null | undefined,
): ViewableForm | null {
    if (!v) return null;

    // Its own answers, whatever record it is filed on.
    if (v.formData) {
        const filled = v.formData;
        // An early copy kept its answers before it kept its rows. The notes still have them.
        const lines = filled.lines?.length ? filled.lines : linesFromNotes(v.notes);
        return {
            filled: { ...filled, lines, holderLabel: filled.holderLabel ?? suffixOfLabel(v.label ?? "") },
            recovered: false,
        };
    }

    const defId = formDefIdOfRecord(recordId);
    if (!defId) return null;

    const signedBy = v.uploadedBy?.trim() || "";
    const date = v.issueDate || "";
    return {
        filled: {
            defId,
            // Only what the record actually holds. An empty field reads as "not kept",
            // which is true; a plausible-looking one does not.
            values: {
                applicant: signedBy, driverName: signedBy, printName: signedBy,
                date, issueDate: date,
            },
            sigs: {},
            lines: linesFromNotes(v.notes),
            holderLabel: suffixOfLabel(v.label ?? ""),
        },
        recovered: true,
    };
}

export interface SignedFormInput extends IssueFormInput {
    defId: string;
    /** Who put their name to it. The driver, on their own receipt. */
    signedBy: string;
    /** What the office called the batch, for the version label. */
    context?: string;
    /** What they actually typed and signed. Kept, so the copy can be read back. */
    filled?: { values: Record<string, string>; sigs: Record<string, string> };
}

/**
 * The signed copy, as a version on the driver's record.
 *
 * Its label says WHICH hand-out it belongs to, because the whole point of filing these as
 * versions is that a driver signs the same form in March and again in August, and "Uniform
 * & Equipment Issue Receipt" twice over tells nobody which keys were in which one.
 */
export function signedFormVersion(input: SignedFormInput): DocVersion | null {
    const where = input.holderLabel?.trim();
    return filedFormVersion({
        defId: input.defId,
        signedBy: input.signedBy,
        date: input.date,
        suffix: where,
        filled: input.filled,
        lines: input.lines,
        // The list, in the record itself. A signed PDF is an image of a list; this is the
        // list, which is what anybody searching for "who has KEY-035985" actually needs.
        notes: [input.context, ...input.lines.map((l) => `• ${formLineText(l)}`)]
            .filter((x): x is string => !!x),
    });
}

/**
 * Any completed form, as a version on a record.
 *
 * The shared half, because a receipt signed off a chat card and one filled in on the
 * driver's own Forms tab are the same document filed in the same place — and a second
 * writer would sooner or later label them differently and split the history in two.
 */
export function filedFormVersion(input: {
    defId: string;
    signedBy: string;
    date?: string;
    /** What distinguishes THIS filing from the last one — usually the unit it was for. */
    suffix?: string;
    notes?: string[];
    /** What was actually typed and signed, so the copy can be read back. */
    filled?: { values: Record<string, string>; sigs: Record<string, string> };
    /** The kit it was signed for, kept so the copy can redraw its table. */
    lines?: CollectionLine[];
}): DocVersion | null {
    const def = inventoryFormDef(input.defId);
    if (!def) return null;
    const date = input.date || todayIso();
    const title = `${def.title} ${def.accentTitle}`.replace(/\s+/g, " ").trim();

    const v = newVersion(input.suffix ? `${title} — ${input.suffix}` : title);
    // How this copy got here. The record holds both kinds — one completed and signed in the
    // app, one scanned and uploaded — and they are not interchangeable: only the first has
    // the answers as DATA, and only the second has a piece of paper behind it. A list that
    // shows four identical rows makes the office open all four to find out which is which.
    v.tags = [FILLED_IN_SYSTEM];
    // The copy itself. Without this the record holds a filename with nothing behind it.
    if (input.filled) {
        const filled: FilledForm = {
            defId: input.defId,
            values: input.filled.values,
            sigs: input.filled.sigs,
            // The rows, not just the joined sentence: a copy read back a year later has to
            // rebuild the same table, and splitting a string on commas is not that.
            lines: input.lines,
            holderLabel: input.suffix,
        };
        v.formData = filled;
    }
    v.issueDate = date;
    v.uploadedAt = new Date().toISOString();
    v.uploadedBy = input.signedBy;
    v.monitoring = defaultMonitoring();
    v.notes = [`Signed by ${input.signedBy} on ${date}.`, ...(input.notes ?? [])].join("\n");
    v.files = [{
        name: `${input.defId}-${date}.pdf`,
        size: 0,
        uploadedAt: v.uploadedAt,
    }];
    return v;
}

export interface CommitFormInput extends SignedFormInput {
    accountId: string;
    /** The driver the record belongs to — the compliance store's subject. */
    driverId: string;
}

/**
 * File it, and say so on every item it covers.
 *
 * Two writes, not one. The record is where a signed receipt is looked up months later; the
 * item trails are where somebody standing in front of a missing fuel card looks first, and
 * a receipt that only exists on the driver's record is invisible from there.
 */
export function commitInventoryForm(input: CommitFormInput): DocVersion | null {
    const version = signedFormVersion(input);
    if (!version) return null;
    writeComplianceVersion(input.accountId, input.driverId, formRecordIdFor(input.defId), version);

    const title = inventoryFormOption(input.defId)?.title ?? input.defId;
    for (const l of input.lines) {
        logInventoryEvent({
            itemId: l.itemId,
            accountId: input.accountId,
            kind: "signed",
            title: "Receipt signed",
            detail: `${input.signedBy} signed the ${title}`,
            by: input.signedBy,
            role: "Driver",
        });
    }
    return version;
}

/** Said on the items when the ask goes out, so the trail shows the request as well as the answer. */
export function logFormsRequested(input: {
    accountId: string;
    lines: CollectionLine[];
    forms: CollectionForm[];
    driverName: string;
    issuedBy: string;
}): void {
    if (!input.forms.length) return;
    const names = input.forms.map((f) => f.title).join(", ");
    for (const l of input.lines) {
        logInventoryEvent({
            itemId: l.itemId,
            accountId: input.accountId,
            kind: "requested",
            title: "Receipt to sign",
            detail: `${input.driverName} was asked to sign ${names}`,
            by: input.issuedBy,
            role: "Office",
        });
    }
}
