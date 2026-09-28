// ─────────────────────────────────────────────────────────────────────────────
// The receipt, on a page of its own.
//
// It started inside the chat bubble, which was right about one thing — the form
// belongs with the message — and wrong about the rest: a 380px column is not
// somewhere to read a statement about money being deducted from your final pay,
// let alone somewhere to draw a signature.
//
// So the card asks and this answers, on a full page, with room. Same renderer as
// the phone screen (`InlineFormFill`), so the driver and the office are agreeing
// to the same document in the same words; only the container changes.
//
// The back button knows where you came from — the trail, not a guess. You reach
// this from a chat thread, and "Back to Inventory" would be a lie.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from "react";
import { FileSignature, CircleSlash, Truck, CalendarClock, Building2, UserRound } from "lucide-react";
import { BackLink } from "@/components/ui/BackLink";
import { useConversations } from "@/pages/messages/messages-store";
import { formatDue } from "./inventory-collection";
import { InlineFormFill, type InlineFormResult } from "./InlineFormFill";
import { signAndSettle, pendingForms } from "./collection-signing";
import { inventoryFormDef, issueFormValues } from "./inventory-forms";
import { consumeCollectionForm, type CollectionFormRequest } from "./collection-form-handoff";

export function CollectionFormPage({ onNavigate }: { onNavigate: (path: string) => void }) {
    // Read ONCE. Consuming is destructive, so a second read during a re-render would find
    // it gone and turn a form somebody is halfway through into an error page.
    const req = useRef<CollectionFormRequest | null | undefined>(undefined);
    if (req.current === undefined) req.current = consumeCollectionForm();
    const ask = req.current;

    const convs = useConversations();
    const collection = useMemo(() => {
        if (!ask) return null;
        for (const c of convs) {
            for (const m of c.messages) {
                if (m.collection?.id === ask.collectionId) return m.collection;
            }
        }
        return null;
    }, [convs, ask?.collectionId]);

    const [done, setDone] = useState(false);
    const home = ask?.returnTo || "/messages";

    const form = collection?.forms?.find((f) => f.defId === ask?.defId);
    const def = form ? inventoryFormDef(form.defId) : undefined;

    // Everything the office sent. The receipt used to show only what was ticked on the
    // card, which made the ticks unchangeable here: a driver who found one item missing had
    // to go back, un-tick it and reopen the form.
    const lines = useMemo(() => collection?.lines ?? [], [collection]);
    // Seeded from the card, owned here, and handed back on signing. One answer, two screens.
    const [checked, setChecked] = useState<Set<string>>(() => new Set(ask?.pickedItemIds ?? []));
    const toggle = (itemId: string) =>
        setChecked((prev) => {
            const next = new Set(prev);
            if (!next.delete(itemId)) next.add(itemId);
            return next;
        });

    const values = useMemo(() => (collection ? issueFormValues({
        driverName: collection.driverName,
        lines: lines.filter((l) => checked.has(l.itemId)),
        holderLabel: collection.holderLabel,
        issuedBy: collection.issuedBy,
    }) : {}), [collection, lines, checked]);

    // A reload, a stale link, or a form somebody else already signed. Say which, rather
    // than showing an empty page that looks broken.
    if (!ask || !collection || !form || !def || done || form.status === "signed") {
        const why = !ask
            ? "This page opens from a collection message, and it was not opened from one — a reload loses which receipt you were signing."
            : !collection ? "That collection is no longer in the thread."
            : form?.status === "signed" || done ? "This one has been signed and filed."
            : "That form is no longer attached to the collection.";
        return (
            <div className="flex h-full flex-col bg-slate-50">
                <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                    <BackLink fallback={home} onNavigate={onNavigate} />
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <CircleSlash size={32} className="text-slate-300" />
                    <div>
                        <p className="text-sm font-semibold text-slate-700">Nothing to sign here</p>
                        <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">{why}</p>
                    </div>
                    <button
                        onClick={() => onNavigate(home)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                        Back to the message
                    </button>
                </div>
            </div>
        );
    }

    const place = collection.counterparty?.kind === "person" && collection.counterparty.name
        ? collection.counterparty.name
        : "the office";
    const due = collection.dueAt ? formatDue(collection.dueAt) : null;
    const left = pendingForms(collection).filter((f) => f.defId !== form.defId).length;

    const sign = (filled: InlineFormResult) => {
        // The answers go with it. A copy filed as a bare filename cannot be read back, which
        // is the only reason to file one.
        // What is ticked NOW, not what was ticked on the card: this screen is the later of
        // the two, and it is the one the driver signed under.
        signAndSettle({ collection, defId: form.defId, pickedItemIds: [...checked], filled });
        setDone(true);
        onNavigate(home);
    };

    return (
        <div className="flex h-full flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <BackLink fallback={home} onNavigate={onNavigate} />
                <div className="mt-3 flex flex-wrap items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                        <FileSignature size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl font-black text-slate-900">{def.title} {def.accentTitle}</h1>
                        <p className="mt-0.5 text-[13px] text-slate-500">
                            {collection.driverName} · {lines.length} item{lines.length === 1 ? "" : "s"}
                            {left > 0 ? ` · ${left} more form${left === 1 ? "" : "s"} after this` : ""}
                        </p>
                        {/* The trip this receipt is for. On the card it was right there above
                            the form; on a page of its own it has to come with it. */}
                        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {collection.holderLabel && (
                                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                                    <Truck size={10} /> {collection.holderLabel}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                                {collection.counterparty?.kind === "person" ? <UserRound size={10} /> : <Building2 size={10} />}
                                from {place}
                            </span>
                            {due && (
                                <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                                    <CalendarClock size={10} /> by {due}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
                    <InlineFormFill
                        def={def}
                        initialValues={values}
                        lines={lines}
                        checked={checked}
                        onToggleItem={toggle}
                        holderLabel={collection.holderLabel}
                        signerName={collection.driverName}
                        onCancel={() => onNavigate(home)}
                        onSign={sign}
                        busyLabel={left > 0 ? "Sign & next form" : "Sign & confirm"}
                    />
                </div>
            </div>
        </div>
    );
}
