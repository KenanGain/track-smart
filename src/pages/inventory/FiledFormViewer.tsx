// ─────────────────────────────────────────────────────────────────────────────
// Reading a copy back.
//
// A filed receipt is only worth filing if somebody can open it in March and see
// what Elizabeth actually signed for. There were two things in the way: the copy
// held no answers (fixed — it keeps them now), and there was nowhere to open it.
//
// Two views, because they answer different questions:
//
//   Form view   what the app knows. The kit as a table, the answers as fields,
//               the signature as an image. Scannable, and the shape the rest of
//               this app is in.
//   PDF view    the document itself — letterhead, statement, signature block,
//               in the layout it prints in. This is the one that gets emailed to
//               an insurer or handed to an officer, so Print and Download sit
//               here rather than being a separate errand.
//
// An uploaded scan has no answers to render, so it gets neither: it has a FILE,
// and the honest thing to offer is that file.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, Download, Eye, FileText, Printer, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { THEMES, type ThemeKey } from "@/pages/hiring-process/FormDocument";
import { Block, ItemsField, PolicyDocument, Section } from "@/pages/hiring-process/PolicyForm";
import { Field, Grid } from "@/pages/hiring-process/FormKit";
import { THEME_HEX, type PolicyField } from "@/pages/hiring-process/policy-forms.data";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyBranding } from "@/pages/ats/company-branding.data";
import type { FilledForm } from "@/pages/compliance/compliance-data-store";
import { inventoryFormDef, formDefWithItems } from "./inventory-forms";

type Mode = "form" | "pdf";

export function FiledFormViewer({ filled, signedOn, signedBy, recovered, backLabel, onClose }: {
    filled: FilledForm;
    signedOn?: string;
    signedBy?: string;
    /**
     * This copy was rebuilt from the record because its answers were never kept.
     * Said out loud: an office reading a reconstruction has to know it is one.
     */
    recovered?: boolean;
    /** What the back link says it returns to. */
    backLabel?: string;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<Mode>("form");
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [branding] = useCompanyBranding();
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const base = inventoryFormDef(filled.defId);
    const lines = useMemo(() => (filled.lines ?? []).map((l) => ({ ...l })), [filled.lines]);
    const def = useMemo(
        // Every row ticked, because a filed copy holds what was signed FOR — the items that
        // were not received never made it onto it. Shown as ticks rather than as a bare
        // list so it reads as the receipt it is: these were handed over, and confirmed.
        () => (base ? formDefWithItems(base, lines, filled.holderLabel, () => true) : undefined),
        [base, lines, filled.holderLabel],
    );

    const download = async () => {
        const el = docRef.current;
        if (!el) return;
        setDownloading(true);
        try {
            // Loaded here rather than at module scope: these two are the heaviest things in
            // the bundle, and a record page that never opens a copy should not pay for them.
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import("html2canvas"), import("jspdf"),
            ]);
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let left = imgH, y = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, y, pageW, imgH); left -= pageH;
            while (left > 0) { y -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, y, pageW, imgH); left -= pageH; }
            pdf.save(`${filled.defId}-${signedOn || "copy"}.pdf`);
        } finally { setDownloading(false); }
    };

    if (!def) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
                <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-center shadow-xl">
                    <p className="text-sm font-semibold text-slate-700">That form is no longer in the catalog</p>
                    <p className="mt-1 text-xs text-slate-500">
                        The copy is still on the record, but there is no definition left to render it with.
                    </p>
                    <button onClick={onClose} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">Close</button>
                </div>
            </div>
        );
    }

    const hex = THEME_HEX[def.theme];

    /**
     * One answer, in the box it was typed into.
     *
     * Read-only rather than absent: a receipt read back should sit in the same frame it
     * was signed in, and a blank box is itself the answer when a field went unanswered.
     */
    const readField = (f: PolicyField) => {
        // A list stays a list when it is read back. The same component the form fills in.
        if (f.kind === "items") {
            return <ItemsField key={f.key} label={f.label} value={filled.values[f.key] || ""} readOnly onChange={() => {}} />;
        }
        return (
            <Field key={f.key} label={f.label} className={f.kind === "date" ? "max-w-xs" : undefined}>
                <Input value={filled.values[f.key] || ""} readOnly tabIndex={-1}
                    className="cursor-default bg-slate-50 text-slate-800" />
            </Field>
        );
    };

    /** The section the statement may refer to, so it can be placed on either side of it. */
    const fieldsBlock = def.fields && def.fields.length > 0
        ? <Section title={def.fieldsTitle ?? "Details"} hex={hex}><Grid>{def.fields.map(readField)}</Grid></Section>
        : null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #filed-doc, #filed-doc * { visibility: visible !important; }
                #filed-doc { position: absolute !important; left: 0; top: 0; width: 100%; }
                .no-print { display: none !important; }
            }`}</style>

            {/* The same toolbar the policy documents themselves carry: back on the left,
                what you can do with the page on the right. Two views and five themes are
                choices about the same copy, so they are pills; Print and Download are
                actions, so they are buttons. Matching it is not decoration — a driver's
                signed receipt IS a policy document, and it should not open into a screen
                that looks like somewhere else. */}
            <div className="no-print flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <div className="min-w-0">
                    <button type="button" onClick={onClose}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" /> {backLabel ?? "Records"}
                    </button>
                    <p className="mt-0.5 truncate text-[12px] text-slate-500">
                        {def.title} {def.accentTitle}
                        {signedBy ? ` · Signed by ${signedBy}` : ""}
                        {signedOn ? ` · ${signedOn}` : ""}
                        {filled.holderLabel ? ` · ${filled.holderLabel}` : ""}
                        {lines.length ? ` · ${lines.length} item${lines.length === 1 ? "" : "s"}` : ""}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Two views of one copy, not two documents. */}
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                        {([["form", "Form view", Table2], ["pdf", "PDF view", FileText]] as const).map(([id, label, Icon]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setMode(id)}
                                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                                    mode === id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}
                            >
                                <Icon size={13} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Themes, and Print / Download, belong to the document view: they are that
                        view, on paper. In form view there is no page for them to act on. */}
                    {mode === "pdf" && (
                        <>
                            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                {THEMES.map((t) => (
                                    <button key={t.key} type="button" onClick={() => setTheme(t.key)}
                                        className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition",
                                            theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                            <Button variant="outline" size="sm" onClick={() => window.print()}>
                                <Printer className="h-4 w-4" /> Print
                            </Button>
                            <Button size="sm" onClick={download} disabled={downloading}>
                                <Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {recovered && (
                <div className="no-print flex shrink-0 items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-6">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-[12px] leading-relaxed text-amber-800">
                        <span className="font-bold">Rebuilt from the record.</span> This copy was filed before the
                        app kept form answers, so what you see is what the record itself holds &mdash; the item
                        list, the signer and the date. The signature image was not kept.
                    </p>
                </div>
            )}

            <div className="min-h-0 flex-1 overflow-auto bg-slate-50">
                {mode === "pdf" ? (
                    <div className="flex justify-center px-4 py-6">
                        <div id="filed-doc">
                            <PolicyDocument ref={docRef} def={def} values={filled.values} sigs={filled.sigs} branding={branding} theme={theme} />
                        </div>
                    </div>
                ) : (
                    /* The form, in the shape it is filled in.
                       Not a summary of it. The office reading a receipt back is looking at
                       the same document the driver looked at when they signed it, so it is
                       the same layout: the accent-barred sections, the statement in its
                       card, the signature in its block. What differs is that nothing here
                       can be typed into — this one already happened. */
                    <div className="mx-auto w-full max-w-3xl space-y-6 px-6 py-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: hex }}>
                                {def.kind === "policy" ? "Policy" : "Consent"} &middot; Statement &amp; Signature
                            </p>
                            <h1 className="mt-1 text-2xl font-bold text-slate-900">
                                {def.title} <span style={{ color: hex }}>{def.accentTitle}</span>
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">{def.blurb}</p>
                        </div>

                        {def.intro && (
                            <Section title="Details" hex={hex}><Grid>{def.intro.map(readField)}</Grid></Section>
                        )}

                        {def.questions && (
                            <Section title={def.questionsTitle ?? "Questions"} hex={hex}>
                                <div className="space-y-3">
                                    {def.questions.map((q) => (
                                        <div key={q.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                                            <p className="min-w-0 flex-1 text-sm text-slate-700">{q.text}</p>
                                            <span className="shrink-0 rounded-md bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-700">
                                                {filled.values[q.key] || "—"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        )}

                        {def.fieldsFirst && fieldsBlock}

                        {/* The statement, with the kit table at the top of it — the same
                            `Block` the printed document draws, so the wording cannot drift. */}
                        {def.body.length > 0 && (
                            <Section title="Statement" hex={hex}>
                                <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    {def.body.map((b, i) => <Block key={i} block={b} values={filled.values} preview={false} />)}
                                </div>
                            </Section>
                        )}

                        {def.sections?.map((sec) => (
                            <Section key={sec.title} title={sec.title} hex={hex}>
                                <div className="space-y-4">
                                    {sec.note && <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-600 shadow-sm">{sec.note}</p>}
                                    <Grid>{sec.fields.map(readField)}</Grid>
                                </div>
                            </Section>
                        ))}

                        {!def.fieldsFirst && fieldsBlock}

                        {def.signers.length > 0 && (
                            <Section title="Signature" hex={hex}>
                                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
                                    {def.signers.map((f) => {
                                        if (f.kind !== "sign") return <div key={f.key}>{readField(f)}</div>;
                                        const sig = filled.sigs[f.key];
                                        return (
                                            <div key={f.key} className="sm:col-span-2">
                                                <div className={cn("rounded-lg border p-3",
                                                    sig ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-slate-50")}>
                                                    <Label className="text-slate-700">&#9998; {f.label}</Label>
                                                    <div className="mt-2 flex h-20 items-center justify-center rounded-md border border-slate-200 bg-white p-2">
                                                        {sig
                                                            ? <img src={sig} alt={f.label} className="h-14 object-contain" />
                                                            : <span className="text-[12px] italic text-slate-400">
                                                                {/* Two different facts. Only one of them is the driver's doing. */}
                                                                {recovered ? "Signature image not kept with this copy." : "Not signed."}
                                                            </span>}
                                                    </div>
                                                    {sig && <p className="mt-1 text-xs font-medium text-emerald-600">Signed</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Section>
                        )}

                        {def.footer && <p className="text-[12px] italic text-slate-500">{def.footer}</p>}

                        <p className="flex items-center gap-1.5 border-t border-slate-200 pt-4 text-[11px] text-slate-400">
                            <Eye size={12} /> This is the filed copy, exactly as it was signed. Switch to PDF view to print or download it.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
