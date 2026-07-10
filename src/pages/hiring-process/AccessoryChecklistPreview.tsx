import { useRef, useState } from "react";
import { ChevronLeft, Printer, Download, KeyRound, Eye, Info, Check, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, CheckLine, ReviewSignOff, newSignOff, todayISO, type SignOffData } from "./FormKit";
import { FormDocument, THEMES, type ThemeKey, type DocSection } from "./FormDocument";
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
    const [branding] = useCompanyBranding();
    const order = [...ACCESSORY_CATEGORIES] as string[];
    const cats = Array.from(new Set(checklist.items.map((i) => i.category ?? "Accessories")))
        .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));

    // The form's "PDF Preview" flips to the paper view; from there "Edit" returns.
    const [view, setView] = useState<"pdf" | "form">(mode);
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    if (view === "form") return <AccessoryChecklistForm checklist={checklist} cats={cats} onBack={onBack} onPreview={() => setView("pdf")} />;

    // Build the branded document — same shape (title/subtitle/badge/sections) the
    // MVR / Abstract forms feed into the shared FormDocument.
    const sections: DocSection[] = [
        { title: "Recipient", groups: [{ rows: [
            { label: "Driver name", value: "" },
            { label: "Employee ID", value: "" },
            { label: "Vehicle / Unit #", value: "" },
            { label: "Date", value: "" },
        ] }] },
        { title: "Items Handed Over", groups: cats.map((cat) => ({
            label: cat,
            table: {
                headers: ["Item", "Qty", "Received"],
                rows: checklist.items.filter((it) => (it.category ?? "Accessories") === cat)
                    .map((it) => [it.note ? `${it.name} — ${it.note}` : it.name, "", "☐"]),
            },
        })) },
        { title: "Sign-Off", groups: [
            { label: "Issued by (staff)", rows: [{ label: "Name", value: "" }, { label: "Title / role", value: "" }, { label: "Date", value: "" }, { label: "Signature", value: "" }] },
            { label: "Received by (driver)", rows: [{ label: "Name", value: "" }, { label: "Date", value: "" }, { label: "Signature", value: "" }] },
        ] },
    ];

    const downloadPdf = async () => {
        const el = docRef.current;
        if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save("accessory-hand-over.pdf");
        } finally { setDownloading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Top bar — matches the hiring-process form preview toolbar */}
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Accessories</button>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {THEMES.map((t) => (
                            <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                        ))}
                    </div>
                    {mode === "form" && <Button variant="outline" size="sm" onClick={() => setView("form")}>Edit form</Button>}
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                    <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                </div>
            </div>

            <div className="px-6 py-8">
                <FormDocument ref={docRef} title={checklist.name} subtitle={checklist.description || "Accessory Hand-Over Checklist"} badge="Hand-Over" sections={sections} theme={theme} branding={branding} />
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
    const pct = checklist.items.length ? Math.round((receivedCount / checklist.items.length) * 100) : 0;
    const toggleAll = () => setReceived(allReceived ? {} : Object.fromEntries(checklist.items.map((it) => [it.id, true])));

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

                {/* Items — a proper checklist with select-all and progress */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-bold text-slate-900">{copy.itemsHeading}</h2>
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{receivedCount} / {checklist.items.length} {copy.verbAdj}</span>
                            <button type="button" onClick={toggleAll} className="text-xs font-semibold text-blue-600 hover:text-blue-700">{allReceived ? "Clear all" : "Select all"}</button>
                        </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">{pct}%</span>
                    </div>
                    <div className="mt-5 space-y-5">
                        {cats.map((cat) => {
                            const list = checklist.items.filter((it) => (it.category ?? "Accessories") === cat);
                            const catDone = list.filter((it) => received[it.id]).length;
                            return (
                                <div key={cat}>
                                    <div className="mb-2 flex items-center gap-2">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{cat}</p>
                                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">{catDone}/{list.length}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {list.map((it) => {
                                            const on = !!received[it.id];
                                            return (
                                                <div key={it.id} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2.5 transition", on ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:border-slate-300")}>
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
                            );
                        })}
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

