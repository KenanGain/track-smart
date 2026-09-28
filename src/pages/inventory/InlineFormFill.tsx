// ─────────────────────────────────────────────────────────────────────────────
// The form, in the message.
//
// The first version of this opened the real document full-screen: an 794px A4
// page with a letterhead, built to be printed. That is the right artefact and
// the wrong place to ask a driver standing at a parts counter to fill something
// in — it arrives in a chat, on a phone, and a page that has to be pinch-zoomed
// is a page that gets closed.
//
// So the card fills it in place. Same definition, same statement text (imported
// rather than retyped — the statement is the part that legally matters), same
// signature pad the rest of the app uses. What changes is the shape: the items
// are shown as the fact they are rather than as a text field to retype, and the
// fields are stacked at chat width.
//
// Dynamic, from the definition. Nothing here knows what a "Uniform & Equipment
// Issue Receipt" is — swap the attached form for a fuel-card agreement and this
// renders that instead, with its own questions and its own statement.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Check, ChevronDown, FileSignature, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Block, ItemsField } from "@/pages/hiring-process/PolicyForm";
import { SignaturePad } from "@/pages/hiring-process/FormKit";
import type { PolicyField, PolicyFormDef } from "@/pages/hiring-process/policy-forms.data";
import type { CollectionLine } from "@/pages/messages/messages-store";
import { formDefWithItems } from "./inventory-forms";

/** What a signed inline form hands back — the same shape the full page gives. */
export type InlineFormResult = { values: Record<string, string>; sigs: Record<string, string> };

/**
 * The field the item list fills.
 *
 * Shown as a list of what they ticked rather than as a text box holding the same thing in
 * commas. A driver asked to confirm "Spare Truck Keys (set) (KEY-983142), Spare Yard Gate
 * Fob (KEY-044421), …" in a single-line input cannot see what they are agreeing to, and it
 * is not theirs to edit anyway — it is the office's record of what left the shelf.
 */
const ITEMS_KEY = "itemsIssued";

export function InlineFormFill({ def: baseDef, initialValues, lines, checked, onToggleItem, holderLabel, signerName, onCancel, onSign, busyLabel }: {
    def: PolicyFormDef;
    /** Prefilled from the movement — see `issueFormValues`. */
    initialValues: Record<string, string>;
    /**
     * Everything the office sent, not only what is ticked.
     *
     * The form is where the driver is standing over the kit, so it is the right place to
     * say "actually, the vest wasn't in the bag" — which means it has to show the rows
     * they would be un-ticking.
     */
    lines: CollectionLine[];
    /** Which of those are ticked. The same set the collect card holds. */
    checked: Set<string>;
    /** Ticking here ticks there: one answer, reachable from both screens. */
    onToggleItem: (itemId: string) => void;
    signerName: string;
    /** The unit the kit belongs to, named under the table. */
    holderLabel?: string;
    onCancel: () => void;
    onSign: (result: InlineFormResult) => void;
    busyLabel?: string;
}) {
    // The statement begins "the company property listed above", so the list has to BE above
    // it. Built from the rows rather than from a comma-joined field — see `formDefWithItems`.
    const def = useMemo(
        () => formDefWithItems(baseDef, lines, holderLabel, (l) => !!l.itemId && checked.has(l.itemId)),
        [baseDef, lines, holderLabel, checked],
    );

    const [values, setValues] = useState<Record<string, string>>(initialValues);
    const [sigs, setSigs] = useState<Record<string, string>>({});
    const [openStatement, setOpenStatement] = useState(lines.length > 0);

    const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

    // Every field the form actually asks for, minus the one the items fill. `intro` is
    // usually just the signer's name, which we already know.
    const asked = useMemo<PolicyField[]>(
        () => [...(def.intro ?? []), ...(def.fields ?? [])].filter((f) => f.key !== ITEMS_KEY),
        [def],
    );
    const signFields = def.signers.filter((f) => f.kind !== "sign");
    const signPads = def.signers.filter((f) => f.kind === "sign");
    const signed = signPads.length > 0 && signPads.every((f) => !!sigs[f.key]);
    // A receipt for nothing is not a receipt. Signing needs at least one item ticked.
    const anyTicked = lines.length === 0 || lines.some((l) => checked.has(l.itemId));
    const ready = signed && anyTicked;

    const field = (f: PolicyField) => {
        // A form opened with no hand-out behind it still asks for its list. Rows, not a
        // comma-joined line typed into a box the width of a phone.
        if (f.kind === "items") {
            return (
                <ItemsField key={f.key} label={f.label} value={values[f.key] || ""}
                    onChange={(v) => set(f.key, v)} />
            );
        }
        if (f.kind === "choice") {
            return (
                <div key={f.key}>
                    <label className="mb-1 block text-[11px] font-bold text-slate-600">{f.label}</label>
                    <div className="flex flex-wrap gap-1.5">
                        {(f.options ?? []).map((opt) => {
                            const on = values[f.key] === opt;
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => set(f.key, opt)}
                                    className={cn(
                                        "rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                                        on ? "border-violet-500 bg-violet-50 text-violet-700"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                    )}
                                >
                                    {opt}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return (
            <div key={f.key}>
                <label className="mb-1 block text-[11px] font-bold text-slate-600">{f.label}</label>
                <input
                    type={f.kind === "date" ? "date" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
            </div>
        );
    };

    return (
        <div className="mt-2 overflow-hidden rounded-xl border border-violet-300 bg-white">
            <div className="flex items-start gap-2.5 border-b border-violet-100 bg-violet-50/70 px-3.5 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white">
                    <FileSignature size={15} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-900">{def.title} {def.accentTitle}</p>
                    <p className="text-[11px] text-slate-500">{def.blurb}</p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Close the form"
                    className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-white hover:text-slate-600"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="space-y-3.5 px-3.5 py-3">
                {/* The statement, with the kit table at the top of it. Open by default when
                    there is a table: the list is the part that is specific to this hand-over,
                    and collapsing it would hide the only thing worth checking. */}
                {def.body.length > 0 && (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setOpenStatement((v) => !v)}
                            className="flex w-full items-center gap-2 bg-slate-50 px-2.5 py-2 text-left"
                        >
                            <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {lines.length > 0
                                    ? <>Tick what you received, and what you are agreeing to</>
                                    : "What you are agreeing to"}
                            </span>
                            <ChevronDown size={14} className={cn("shrink-0 text-slate-400 transition-transform", openStatement && "rotate-180")} />
                        </button>
                        <div className={cn(
                            "space-y-2.5 px-2.5 text-[12px] leading-relaxed text-slate-600",
                            openStatement ? "max-h-[28rem] overflow-y-auto py-2.5" : "max-h-16 overflow-hidden py-2.5",
                        )}>
                            {def.body.map((b, i) => (
                                <Block key={i} block={b} values={values} preview={false}
                                    onToggleRow={(ri) => { const id = lines[ri]?.itemId; if (id) onToggleItem(id); }} />
                            ))}
                        </div>
                        {!openStatement && (
                            <button
                                type="button"
                                onClick={() => setOpenStatement(true)}
                                className="w-full border-t border-slate-100 bg-white py-1.5 text-[11px] font-bold text-violet-600 hover:bg-violet-50"
                            >
                                Read it in full
                            </button>
                        )}
                    </div>
                )}

                {/* Whatever else this particular form asks. Nothing here knows which form it
                    is: swap the attachment and these change with it. */}
                {asked.length > 0 && (
                    <div className="grid gap-2.5 sm:grid-cols-2">{asked.map(field)}</div>
                )}

                <div className="space-y-2.5">
                    {signPads.map((f) => (
                        <SignaturePad
                            key={f.key}
                            label={f.label}
                            onChange={(v) => setSigs((p) => ({ ...p, [f.key]: v }))}
                        />
                    ))}
                    {signFields.length > 0 && (
                        <div className="grid gap-2.5 sm:grid-cols-2">{signFields.map(field)}</div>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                <p className="text-[11px] text-slate-500">
                    {!anyTicked
                        ? "Tick what you received."
                        : signed
                            ? <>Signing files a copy on {signerName}&rsquo;s record.</>
                            : "Sign above to finish."}
                </p>
                <button
                    type="button"
                    onClick={() => onSign({ values, sigs })}
                    disabled={!ready}
                    className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white transition-colors",
                        ready ? "bg-violet-600 hover:bg-violet-700" : "cursor-not-allowed bg-slate-300",
                    )}
                >
                    <Check size={13} /> {busyLabel ?? "Sign & confirm"}
                </button>
            </div>
        </div>
    );
}
