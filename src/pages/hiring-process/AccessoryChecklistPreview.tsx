import { useState } from "react";
import { ChevronLeft, Printer, ListChecks, KeyRound, Eye, Info, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Field, Grid, CheckLine, ReviewSignOff, newSignOff, todayISO, type SignOffData } from "./FormKit";
import { ACCESSORY_CATEGORIES, type AccessoryChecklist } from "./onboarding.data";

/**
 * AccessoryChecklistPreview — two views of an accessory hand-over checklist:
 *  • pdf view  — read-only paper layout (title, items with tick boxes, signature
 *    blocks). "Print / Save as PDF" uses the browser print dialog.
 *  • form view — an interactive fill-out of the same checklist (Test / Open form),
 *    built on the shared hiring-form shell (info banner → section cards → review
 *    checklist → reviewer sign-off), matching the MVR / Abstract forms. Tick items
 *    received, enter quantities, complete the recipient details and sign off.
 */
export function AccessoryChecklistPreview({ checklist, mode = "pdf", onBack }: { checklist: AccessoryChecklist; mode?: "pdf" | "form"; onBack: () => void }) {
    const order = [...ACCESSORY_CATEGORIES] as string[];
    const cats = Array.from(new Set(checklist.items.map((i) => i.category ?? "Accessories")))
        .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

    // The form's "PDF Preview" flips to the paper view; from there "Edit" returns.
    const [view, setView] = useState<"pdf" | "form">(mode);

    if (view === "form") return <AccessoryChecklistForm checklist={checklist} cats={cats} onBack={onBack} onPreview={() => setView("pdf")} />;

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Toolbar (hidden when printing) */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6 print:hidden">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Accessories</button>
                <div className="flex items-center gap-2">
                    {mode === "form" && <Button variant="outline" size="sm" onClick={() => setView("form")}>Edit form</Button>}
                    <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / Save as PDF</Button>
                </div>
            </div>

            {/* Paper */}
            <div className="mx-auto my-6 max-w-[800px] px-4 print:my-0 print:px-0">
                <div className="rounded-lg bg-white p-10 shadow-sm print:rounded-none print:p-0 print:shadow-none">
                    {/* Header */}
                    <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Accessory Hand-Over Checklist</p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900">{checklist.name}</h1>
                            {checklist.description && <p className="mt-1 max-w-md text-sm text-slate-500">{checklist.description}</p>}
                        </div>
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ListChecks className="h-6 w-6" /></span>
                    </div>

                    {/* Driver / date fields */}
                    <div className="mt-5 grid grid-cols-2 gap-x-10 gap-y-4 text-sm">
                        <PaperField label="Driver name" />
                        <PaperField label="Date" />
                        <PaperField label="Vehicle / Unit #" />
                        <PaperField label="Employee ID" />
                    </div>

                    {/* Items */}
                    <div className="mt-7">
                        <p className="mb-2 text-sm font-bold text-slate-800">Items handed over <span className="font-normal text-slate-400">({checklist.items.length})</span></p>
                        <div className="space-y-5">
                            {cats.map((cat) => (
                                <div key={cat}>
                                    <p className="mb-1.5 border-b border-slate-200 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{cat}</p>
                                    <div className="divide-y divide-slate-100">
                                        {checklist.items.filter((it) => (it.category ?? "Accessories") === cat).map((it) => (
                                            <div key={it.id} className="flex items-center gap-3 py-2">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-800">{it.name}</p>
                                                    {it.note && <p className="text-xs text-slate-400">{it.note}</p>}
                                                </div>
                                                <span className="shrink-0 text-[11px] text-slate-300">Qty ______</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="mt-10 grid grid-cols-2 gap-10">
                        <SignBlock title="Issued by" />
                        <SignBlock title="Received by (Driver)" />
                    </div>

                    <p className="mt-8 text-center text-[10px] text-slate-400">Generated by TrackSmart · Onboarding · Accessory Hand-Over</p>
                </div>
            </div>
        </div>
    );
}

// ── Interactive form (Test / Open form) ─────────────────────────────────────
// Mirrors the hiring-process MVR / Abstract form shell: top bar, header, info
// banner, section cards, review checklist and a reviewer sign-off. A switch
// toggles between two perspectives of the same checklist:
//   • Handover form — staff issue the items and sign as "Issued by".
//   • Driver form   — the driver confirms receipt and signs as "Received by".
// Item ticks / quantities / recipient details are shared; each form keeps its
// own sign-off. Local state only — nothing is persisted (test / preview).
type FormType = "handover" | "driver";

const FORM_COPY: Record<FormType, {
    label: string; itemsHeading: string; itemVerb: string; verbAdj: string;
    info: string; signKicker: string; signHeading: string; signSubtext: string;
    nameLabel: string; buttonLabel: string; signedLabel: string; signedByLabel: string; defaultRole: string;
}> = {
    handover: {
        label: "Handover form",
        itemsHeading: "Items handed over",
        itemVerb: "handed over",
        verbAdj: "handed over",
        info: "Fill in the recipient details, tick each item as it's handed over and enter the quantity, then complete the review checklist and sign off below.",
        signKicker: "Hand-Over Sign-Off",
        signHeading: "I confirm the items above were handed over.",
        signSubtext: "Confirm the accessories above were issued to the driver. Your name, title, date and signature are recorded on file.",
        nameLabel: "Issued by",
        buttonLabel: "Confirm hand-over & sign",
        signedLabel: "Handed over & signed",
        signedByLabel: "Issued by",
        defaultRole: "Issued by",
    },
    driver: {
        label: "Driver form",
        itemsHeading: "Items received",
        itemVerb: "received",
        verbAdj: "received",
        info: "Review each item you were issued, tick it off and enter the quantity you received, then confirm and sign below to acknowledge receipt.",
        signKicker: "Driver Acknowledgement",
        signHeading: "I confirm I received the items above.",
        signSubtext: "By signing you acknowledge you received the accessories listed above. Your name, date and signature are recorded on file.",
        nameLabel: "Driver name",
        buttonLabel: "Confirm receipt & sign",
        signedLabel: "Received & signed",
        signedByLabel: "Received by",
        defaultRole: "Driver",
    },
};

function AccessoryChecklistForm({ checklist, cats, onBack, onPreview }: { checklist: AccessoryChecklist; cats: string[]; onBack: () => void; onPreview: () => void }) {
    const [formType, setFormType] = useState<FormType>("handover");
    const [received, setReceived] = useState<Record<string, boolean>>({});
    const [qty, setQty] = useState<Record<string, string>>({});
    const [driver, setDriver] = useState({ name: "", date: todayISO(), vehicle: "", employeeId: "" });
    const setDrv = (patch: Partial<typeof driver>) => setDriver((d) => ({ ...d, ...patch }));
    // Each form keeps its own sign-off so switching between them preserves both.
    const [signoffs, setSignoffs] = useState<Record<FormType, SignOffData>>(() => ({
        handover: { ...newSignOff(), role: FORM_COPY.handover.defaultRole },
        driver: { ...newSignOff(), role: FORM_COPY.driver.defaultRole },
    }));

    const copy = FORM_COPY[formType];
    const receivedCount = checklist.items.filter((it) => received[it.id]).length;
    const allReceived = checklist.items.length > 0 && receivedCount === checklist.items.length;

    // Tick every item, default each quantity to 1, and fill the recipient details.
    const fillSample = () => {
        setReceived(Object.fromEntries(checklist.items.map((it) => [it.id, true])));
        setQty(Object.fromEntries(checklist.items.map((it) => [it.id, "1"])));
        setDriver({ name: "Jordan Miller", date: todayISO(), vehicle: "1042", employeeId: "EMP-2031" });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Accessories</button>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{receivedCount}/{checklist.items.length} {copy.verbAdj}</span>
                    <Button variant="outline" size="sm" onClick={fillSample}><Sparkles className="h-4 w-4" /> Fill sample data</Button>
                    <Button variant="outline" size="sm" onClick={onPreview}><Eye className="h-4 w-4" /> PDF Preview</Button>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-6 px-6 py-6">
                {/* Header */}
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Driver Hiring · Onboarding</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><KeyRound className="h-6 w-6 text-amber-500" /> {checklist.name}</h1>
                    {checklist.description && <p className="mt-1 text-sm text-slate-500">{checklist.description}</p>}
                </div>

                {/* Form-type switch — Handover form vs Driver form */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Form view</p>
                        <p className="text-xs text-slate-500">Switch between the staff hand-over form and the driver's receipt form.</p>
                    </div>
                    <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {(Object.keys(FORM_COPY) as FormType[]).map((ft) => {
                            const on = formType === ft;
                            return (
                                <button key={ft} type="button" onClick={() => setFormType(ft)}
                                    className={cn("rounded-md px-4 py-1.5 text-sm font-semibold transition", on ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                    {FORM_COPY[ft].label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Info banner */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
                    <p className="text-sm text-slate-600">{copy.info}</p>
                </div>

                {/* Recipient details */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <p className="text-base font-bold text-slate-900">Driver details</p>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{checklist.items.length} item{checklist.items.length === 1 ? "" : "s"}</span>
                    </div>
                    <Grid>
                        <Field label="Driver name" required><Input value={driver.name} onChange={(e) => setDrv({ name: e.target.value })} placeholder="Full name" /></Field>
                        <Field label="Date"><Input type="date" value={driver.date} onChange={(e) => setDrv({ date: e.target.value })} /></Field>
                        <Field label="Vehicle / Unit #"><Input value={driver.vehicle} onChange={(e) => setDrv({ vehicle: e.target.value })} placeholder="e.g. 1042" /></Field>
                        <Field label="Employee ID"><Input value={driver.employeeId} onChange={(e) => setDrv({ employeeId: e.target.value })} placeholder="e.g. EMP-2031" /></Field>
                    </Grid>
                </div>

                {/* Items */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-900">{copy.itemsHeading}</h2>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{receivedCount} / {checklist.items.length} {copy.verbAdj}</span>
                    </div>
                    <div className="space-y-5">
                        {cats.map((cat) => (
                            <div key={cat}>
                                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{cat}</p>
                                <div className="space-y-2">
                                    {checklist.items.filter((it) => (it.category ?? "Accessories") === cat).map((it) => {
                                        const on = !!received[it.id];
                                        return (
                                            <div key={it.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 transition", on ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white")}>
                                                <button type="button" onClick={() => setReceived((r) => ({ ...r, [it.id]: !r[it.id] }))}
                                                    className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition", on ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 hover:border-emerald-400")}>
                                                    {on && <Check className="h-3.5 w-3.5" />}
                                                </button>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-slate-800">{it.name}</p>
                                                    {it.note && <p className="text-xs text-slate-400">{it.note}</p>}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1.5">
                                                    <span className="text-[11px] font-medium text-slate-400">Qty</span>
                                                    <Input value={qty[it.id] ?? ""} onChange={(e) => setQty((q) => ({ ...q, [it.id]: e.target.value }))} className="h-9 w-16 text-center" placeholder="1" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Review checklist */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                        <CheckLine ok={!!driver.name.trim()} label="Driver name recorded" />
                        <CheckLine ok={!!driver.date} label="Date recorded" />
                        <CheckLine ok={allReceived} label={`All ${checklist.items.length} items ${copy.verbAdj}`} />
                        <CheckLine ok={receivedCount > 0} label={`At least one item ${copy.verbAdj}`} />
                    </ul>
                </div>

                {/* Sign-off — switches perspective with the form type */}
                <ReviewSignOff
                    key={formType}
                    heading={copy.signHeading}
                    value={signoffs[formType]}
                    onChange={(v) => setSignoffs((s) => ({ ...s, [formType]: v }))}
                    kicker={copy.signKicker}
                    subtext={copy.signSubtext}
                    nameLabel={copy.nameLabel}
                    buttonLabel={copy.buttonLabel}
                    signedLabel={copy.signedLabel}
                    signedByLabel={copy.signedByLabel}
                />

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button variant="outline" onClick={onPreview}><Eye className="h-4 w-4" /> PDF Preview</Button>
                </div>
            </div>
        </div>
    );
}

function PaperField({ label }: { label: string }) {
    return (
        <div>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
            <div className="mt-3 border-b border-slate-300" />
        </div>
    );
}

function SignBlock({ title }: { title: string }) {
    return (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{title}</p>
            <div className="mt-8 border-b border-slate-400" />
            <p className="mt-1 text-[11px] text-slate-400">Signature</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
                <div><div className="border-b border-slate-300" /><p className="mt-1 text-[11px] text-slate-400">Print name</p></div>
                <div><div className="border-b border-slate-300" /><p className="mt-1 text-[11px] text-slate-400">Date</p></div>
            </div>
        </div>
    );
}
