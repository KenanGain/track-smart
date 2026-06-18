import { forwardRef, useEffect, useRef, useState } from "react";
import { ChevronLeft, Eye, Printer, Download, Sparkles, Check, Share2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import type { CompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES } from "./ApplicationSettingsPage";
import { Field, Grid, SelectBox, YesNoField, SignaturePad } from "./FormKit";
import { THEME_HEX, type PolicyFormDef, type PolicyBlock, type PolicyField, type ListItem } from "./policy-forms.data";
import { THEMES, type ThemeKey } from "./FormDocument";
import { usePrefill } from "./application-prefill";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

// Render a typed name as a script-font signature image (for "Fill sample data").
function makeSignatureImage(name: string): string {
    if (typeof document === "undefined") return "";
    const c = document.createElement("canvas");
    c.width = 440; c.height = 140;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = "#1e293b";
    ctx.font = "48px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
    ctx.textBaseline = "middle";
    ctx.fillText(name || "Jane Doe", 16, c.height / 2);
    return c.toDataURL("image/png");
}

// Replace {key} placeholders in legal text with the captured value (or a blank line).
function renderText(text: string, values: Record<string, string>, preview: boolean) {
    const parts = text.split(/(\{\w+\})/g);
    return parts.map((part, i) => {
        const m = part.match(/^\{(\w+)\}$/);
        if (!m) return <span key={i}>{part}</span>;
        const val = values[m[1]];
        if (val) return <span key={i} className="font-semibold text-slate-900">{val}</span>;
        return <span key={i} className={preview ? "inline-block min-w-[160px] border-b border-slate-400 align-bottom" : "italic text-slate-400"}>{preview ? " " : `[${m[1]}]`}</span>;
    });
}

// Markers deepen with nesting: 1. 2. 3. → i. ii. iii. → A. B. C.
const LIST_MARKERS = ["decimal", "lower-roman", "upper-alpha"];
function NestedList({ items, depth = 0, mono }: { items: ListItem[]; depth?: number; mono?: boolean }) {
    return (
        <ol className={cn("space-y-1.5 text-[13px] leading-relaxed", mono ? "text-black" : "text-slate-600", depth === 0 ? "pl-5" : "mt-1.5 pl-6")}
            style={{ listStyleType: LIST_MARKERS[Math.min(depth, LIST_MARKERS.length - 1)] }}>
            {items.map((it, i) => (
                <li key={i}>
                    {it.text}
                    {it.sub && it.sub.length > 0 && <NestedList items={it.sub} depth={depth + 1} mono={mono} />}
                </li>
            ))}
        </ol>
    );
}

function Block({ block, values, preview, mono }: { block: PolicyBlock; values: Record<string, string>; preview: boolean; mono?: boolean }) {
    const body = mono ? "text-black" : "text-slate-600";
    const strong = mono ? "text-black" : "text-slate-800";
    if ("h" in block) return <p className={cn("mt-4 text-[13px] font-bold uppercase tracking-wide first:mt-0", strong)}>{block.h}</p>;
    if ("p" in block) return <p className={cn("text-[13px] leading-relaxed", body)}>{renderText(block.p, values, preview)}</p>;
    if ("note" in block) return <p className={cn("text-[13px] font-semibold leading-relaxed", strong)}>{block.note}</p>;
    if ("ol" in block) return <ol className={cn("list-decimal space-y-2 pl-5 text-[13px] leading-relaxed", body)}>{block.ol.map((t, i) => <li key={i}>{t}</li>)}</ol>;
    if ("ul" in block) return <ul className={cn("list-disc space-y-1 pl-5 text-[13px] leading-relaxed", body)}>{block.ul.map((t, i) => <li key={i}>{t}</li>)}</ul>;
    if ("list" in block) return <NestedList items={block.list} mono={mono} />;
    if ("callout" in block) {
        const notice = (block.tone ?? "notice") === "notice";
        return (
            <div className={cn("rounded-lg border p-3 text-[12px] leading-relaxed",
                mono ? "border-black bg-white text-black" : notice ? "border-slate-300 bg-slate-50 text-slate-600" : "border-blue-200 bg-blue-50 text-slate-700")}>
                {renderText(block.callout, values, preview)}
            </div>
        );
    }
    return null;
}

// Single underlined value + label, used for field rows and signature blocks in the document.
function SignLine({ field, values, sigs, mono }: { field: PolicyField; values: Record<string, string>; sigs: Record<string, string>; mono?: boolean }) {
    const isSign = field.kind === "sign";
    const img = sigs[field.key];
    const line = mono ? "border-black" : "border-slate-400";
    const label = mono ? "text-black" : "text-slate-700";
    const valueCls = mono ? "text-black" : "text-slate-800";
    if (field.kind === "choice") {
        return (
            <div className="col-span-full">
                <p className={cn("text-[12px] font-bold", label)}>{field.label}</p>
                <div className="mt-1.5 space-y-1.5">
                    {(field.options ?? []).map((opt) => {
                        const on = values[field.key] === opt;
                        return (
                            <p key={opt} className={cn("flex items-center gap-2 text-[13px]", valueCls)}>
                                <span className={cn("flex h-3.5 w-3.5 items-center justify-center border text-[11px] leading-none", mono ? "border-black" : "border-slate-500")}>{on ? "✕" : ""}</span>
                                {opt}
                            </p>
                        );
                    })}
                </div>
            </div>
        );
    }
    return (
        <div>
            <div className={cn("flex h-12 items-end justify-center border-b pb-0.5", line)}>
                {isSign
                    ? (img ? <img src={img} alt="" className="max-h-11" /> : null)
                    : <span className={cn("pb-1 text-[13px]", valueCls)}>{values[field.key] || ""}</span>}
            </div>
            <p className={cn("mt-1 text-[12px] font-bold", label)}>{field.label}</p>
        </div>
    );
}

// ── The printable policy document (5 themes: standard / compact / enhanced / traditional / bw) ──
export const PolicyDocument = forwardRef<HTMLDivElement, { def: PolicyFormDef; values: Record<string, string>; sigs: Record<string, string>; branding: CompanyBranding; theme?: ThemeKey }>(
    ({ def, values, sigs, branding, theme = "standard" }, ref) => {
        const trad = theme === "traditional";
        const bw = theme === "bw";
        const mono = trad || bw;                 // monochrome serif "paper" styling
        const compact = theme === "compact";
        const enhanced = theme === "enhanced";
        const hex = THEME_HEX[def.theme];
        const accent = mono ? "#111827" : hex;   // header / accent colour
        const border1 = mono ? "#cbd5e1" : `${hex}66`;
        const border2 = mono ? "#e2e8f0" : `${hex}33`;
        const total = DAYS.reduce((s, d) => s + (Number(values[`day${d}_hrs`]) || 0), 0);
        const contact = [branding.address, branding.phone].filter(Boolean).join(" · ");

        const docCls = cn(
            "mx-auto bg-white shadow-sm",
            trad ? "border-2 border-black p-8 font-serif text-black text-[12.5px]"
                : bw ? "p-10 font-serif text-black text-[12.5px]"
                    : compact ? "p-8 text-[11px]" : "p-10",
        );
        const tableCellBorder = mono ? "border-slate-400" : "border-slate-300";

        return (
            <div ref={ref} id="app-doc" className={docCls} style={{ width: 794 }}>
                {/* Letterhead + title */}
                {enhanced ? (
                    <div className="mb-6 rounded-lg px-6 py-5 text-white" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                        <div className="flex items-center gap-3">
                            {branding.logoDataUrl && <img src={branding.logoDataUrl} alt="" className="h-11 w-11 rounded object-contain" />}
                            <div>
                                <p className="text-base font-bold leading-tight">{branding.name}</p>
                                {contact && <p className="text-[11px] text-white/80">{contact}</p>}
                            </div>
                        </div>
                        <h1 className="mt-3 border-t border-white/25 pt-3 text-2xl font-bold leading-tight">{def.title} {def.accentTitle}</h1>
                    </div>
                ) : (
                    <>
                        <div className={cn("mb-6 flex items-center gap-3 border-b-2 pb-4", trad && "justify-center text-center")} style={{ borderColor: accent }}>
                            {branding.logoDataUrl && !trad && <img src={branding.logoDataUrl} alt="" className="h-12 w-12 rounded object-contain" />}
                            <div>
                                <p className={cn("font-bold", compact ? "text-base" : "text-lg", mono ? "text-black" : "text-slate-900")}>{branding.name}</p>
                                {contact && <p className={cn("text-[11px]", mono ? "text-gray-600" : "text-slate-500")}>{contact}</p>}
                            </div>
                        </div>
                        <h1 className={cn("font-extrabold leading-tight", compact ? "text-xl" : "text-[26px]", mono ? "text-black" : "text-slate-900", trad && "text-center")}>
                            {def.title}<br /><span style={mono ? undefined : { color: accent }}>{def.accentTitle}</span>
                        </h1>
                    </>
                )}

                <div className={cn("mt-5 p-6", enhanced ? "rounded-lg border border-slate-200 shadow-sm" : mono ? "border" : "rounded-lg border")} style={mono ? { borderColor: accent } : enhanced ? undefined : { borderColor: border1 }}>
                    {/* Questions */}
                    {def.questions && (
                        <div className="mb-5 overflow-hidden rounded border" style={{ borderColor: border1 }}>
                            <div className="flex items-center justify-between px-3 py-1.5 text-[12px] font-bold uppercase text-white" style={{ backgroundColor: accent }}>
                                <span>{def.questionsTitle}</span><span>Yes or No</span>
                            </div>
                            {def.questions.map((q) => (
                                <div key={q.key} className={cn("flex items-center justify-between gap-4 border-t px-3 py-2 text-[13px]", mono ? "text-black" : "text-slate-700")} style={{ borderColor: border2 }}>
                                    <span>{q.text}</span>
                                    <span className="flex shrink-0 gap-3 text-[12px] font-semibold">
                                        <span className={cn("flex items-center gap-1", values[q.key] === "Yes" ? (mono ? "text-black" : "text-slate-900") : "text-slate-300")}>{values[q.key] === "Yes" && <Check className="h-3 w-3" />}Yes</span>
                                        <span className={cn("flex items-center gap-1", values[q.key] === "No" ? (mono ? "text-black" : "text-slate-900") : "text-slate-300")}>{values[q.key] === "No" && <Check className="h-3 w-3" />}No</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {def.note && <p className="mb-4 text-[12px] font-semibold" style={{ color: accent }}>*****{def.note}</p>}

                    {/* Body */}
                    <div className="space-y-3">{def.body.map((b, i) => <Block key={i} block={b} values={values} preview mono={mono} />)}</div>

                    {/* On-duty grid */}
                    {def.onDuty && (
                        <div className="mt-5">
                            <div className="mb-4 grid grid-cols-3 gap-4">
                                <SignLine field={{ key: "driverName", label: "Driver Name" }} values={values} sigs={sigs} mono={mono} />
                                <SignLine field={{ key: "licenseNumber", label: "Driving License #" }} values={values} sigs={sigs} mono={mono} />
                                <SignLine field={{ key: "state", label: "State" }} values={values} sigs={sigs} mono={mono} />
                            </div>
                            <table className="w-full border-collapse text-center text-[12px]">
                                <tbody>
                                    <tr style={{ backgroundColor: mono ? "#f1f5f9" : `${hex}1a` }}>
                                        <td className={cn("border px-2 py-1.5 font-bold", tableCellBorder)}>Day</td>
                                        {DAYS.map((d) => <td key={d} className={cn("border px-2 py-1.5 font-bold", tableCellBorder)}>{d + 1}</td>)}
                                        <td className={cn("border px-2 py-1.5 font-bold", tableCellBorder)} rowSpan={1}>Total</td>
                                    </tr>
                                    <tr>
                                        <td className={cn("border px-2 py-1.5 text-left font-semibold", tableCellBorder)}>Date</td>
                                        {DAYS.map((d) => <td key={d} className={cn("border px-2 py-1.5", tableCellBorder)}>{values[`day${d}_date`] || ""}</td>)}
                                        <td className={cn("border px-2 py-1.5 font-semibold", tableCellBorder)}>Hrs.</td>
                                    </tr>
                                    <tr>
                                        <td className={cn("border px-2 py-1.5 text-left font-semibold", tableCellBorder)}>Hrs. Worked</td>
                                        {DAYS.map((d) => <td key={d} className={cn("border px-2 py-1.5", tableCellBorder)}>{values[`day${d}_hrs`] || ""}</td>)}
                                        <td className={cn("border px-2 py-1.5 font-bold", tableCellBorder)}>{total || 0}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className={cn("mt-4 text-[13px] leading-relaxed", mono ? "text-black" : "text-slate-600")}>I hereby certify that the information given above is correct to the best of my knowledge and belief and that I was last relieved from work at:</p>
                            <div className="mt-3 grid grid-cols-2 gap-4">
                                <SignLine field={{ key: "lastTime", label: "Time" }} values={values} sigs={sigs} mono={mono} />
                                <SignLine field={{ key: "lastOn", label: "On" }} values={values} sigs={sigs} mono={mono} />
                            </div>
                        </div>
                    )}

                    {/* Mid fields */}
                    {def.fields && (
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            {def.fields.map((f) => <SignLine key={f.key} field={f} values={values} sigs={sigs} mono={mono} />)}
                        </div>
                    )}

                    {/* Grouped field sections */}
                    {def.sections?.map((sec) => (
                        <div key={sec.title} className="mt-6">
                            <p className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: accent }}>{sec.title}</p>
                            {sec.note && <p className={cn("mb-3 text-[12px] leading-relaxed", mono ? "text-black" : "text-slate-600")}>{sec.note}</p>}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                {sec.fields.map((f) => <SignLine key={f.key} field={f} values={values} sigs={sigs} mono={mono} />)}
                            </div>
                        </div>
                    ))}

                    {/* Signature block */}
                    {def.signers.length > 0 && (
                        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
                            {def.signers.map((f) => <SignLine key={f.key} field={f} values={values} sigs={sigs} mono={mono} />)}
                        </div>
                    )}

                    {def.footer && <p className={cn("mt-6 text-[12px] italic", mono ? "text-black" : "text-slate-600")}>{def.footer}</p>}
                </div>

                <p className={cn("mt-4 text-[10px]", mono ? "text-gray-500" : "text-slate-400")}>{[branding.name, branding.address, branding.phone].filter(Boolean).join(" · ")}</p>
            </div>
        );
    },
);
PolicyDocument.displayName = "PolicyDocument";

// ── The form (edit + preview shell) ─────────────────────────────────────────
export function PolicyForm({ def, onBack, embedded, sharedSignature, sharedValues }: { def: PolicyFormDef; onBack: () => void; embedded?: boolean; sharedSignature?: string; sharedValues?: Record<string, string> }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const signKeys = def.signers.filter((s) => s.kind === "sign").map((s) => s.key);
    // Every signature field across the form (signers + grouped sections + mid/intro fields).
    const allSignKeys = [
        ...def.signers,
        ...(def.sections?.flatMap((s) => s.fields) ?? []),
        ...(def.fields ?? []),
        ...(def.intro ?? []),
    ].filter((f) => f.kind === "sign").map((f) => f.key);
    const [values, setValues] = useState<Record<string, string>>(() => ({
        ...(pf ? {
            applicant: pf.fullName, printName: pf.fullName, driverName: pf.fullName,
            ssn: pf.ssn, dob: pf.dob, company: branding.name, prospEmployer: branding.name,
            licenseNumber: pf.licenses[0]?.number ?? "", state: pf.licenses[0]?.authority ?? "",
        } : { company: branding.name, prospEmployer: branding.name }),
        ...sharedValues,
    }));
    const [sigs, setSigs] = useState<Record<string, string>>(() => sharedSignature ? Object.fromEntries(signKeys.map((k) => [k, sharedSignature])) : {});
    // When the parent shares a signature / values (e.g. "sign once → all forms"),
    // merge them in without wiping anything the driver edited per-form.
    useEffect(() => { if (sharedValues) setValues((v) => ({ ...v, ...sharedValues })); }, [sharedValues]);
    useEffect(() => { if (sharedSignature) setSigs((s) => ({ ...s, ...Object.fromEntries(signKeys.map((k) => [k, sharedSignature])) })); }, [sharedSignature]);
    const [preview, setPreview] = useState(false);
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const [shared, setShared] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
    const setSig = (k: string, v: string) => setSigs((p) => ({ ...p, [k]: v }));
    const hex = THEME_HEX[def.theme];

    const fillSample = () => {
        const vals = { ...(def.sample ?? {}), ...onDutySample(def) };
        setValues(vals);
        const name = vals.printName || vals.applicant || vals.driverName || pf?.fullName || "Jane Doe";
        const sig = makeSignatureImage(name);
        if (sig) setSigs(Object.fromEntries(allSignKeys.map((k) => [k, sig])));
    };

    const share = async () => {
        const payload = { title: `${def.title} ${def.accentTitle}`, text: `${def.title} ${def.accentTitle} — ${branding.name}`, url: typeof window !== "undefined" ? window.location.href : "" };
        try {
            if (typeof navigator !== "undefined" && (navigator as Navigator).share) { await (navigator as Navigator).share(payload); return; }
            if (typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(payload.url || payload.text); setShared(true); setTimeout(() => setShared(false), 1800); }
        } catch { /* user dismissed share sheet */ }
    };

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
            pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save(`${def.id}.pdf`);
        } finally { setDownloading(false); }
    };

    const renderField = (f: PolicyField) => {
        if (f.kind === "sign") return <SignaturePad key={f.key} label={f.label} onChange={(v) => setSig(f.key, v)} />;
        if (f.kind === "choice") return (
            <Field key={f.key} label={f.label} className="sm:col-span-2">
                <div className="space-y-2">
                    {(f.options ?? []).map((opt) => {
                        const on = values[f.key] === opt;
                        return (
                            <button key={opt} type="button" onClick={() => set(f.key, opt)}
                                className={cn("flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition",
                                    on ? "border-blue-500 bg-blue-50 text-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
                                <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300")}>
                                    {on && <Check className="h-3 w-3" />}
                                </span>
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </Field>
        );
        return (
            <Field key={f.key} label={f.label} className={f.kind === "date" ? "max-w-xs" : undefined}>
                {f.kind === "state"
                    ? <SelectBox value={values[f.key] || ""} placeholder="Please choose" items={STATES_PROVINCES} onChange={(v) => set(f.key, v)} />
                    : <Input type={f.kind === "date" ? "date" : "text"} value={values[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />}
            </Field>
        );
    };

    return (
        <div className={embedded ? "" : "min-h-screen bg-slate-50"}>
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            <div className={`${embedded ? "hidden" : "no-print"} flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3`}>
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Policy</button>
                {preview ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {THEMES.map((t) => (
                                <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={share}><Share2 className="h-4 w-4" /> {shared ? "Link copied" : "Share"}</Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                        <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fillSample}><Sparkles className="h-4 w-4" /> Fill sample data</Button>
                        <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                    </div>
                )}
            </div>

            {preview ? (
                <div className="px-6 py-8">
                    <PolicyDocument ref={docRef} def={def} values={values} sigs={sigs} branding={branding} theme={theme} />
                </div>
            ) : (
                <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6 px-6 py-6"}>
                    <div className={embedded ? "hidden" : undefined}>
                        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: hex }}>Policy · Statement &amp; Signature</p>
                        <h1 className="mt-1 text-2xl font-bold text-slate-900">{def.title} <span style={{ color: hex }}>{def.accentTitle}</span></h1>
                        <p className="mt-1 text-sm text-slate-500">{def.blurb}</p>
                    </div>

                    {/* Intro fields */}
                    {def.intro && (
                        <Section title="Details" hex={hex}><Grid>{def.intro.map(renderField)}</Grid></Section>
                    )}

                    {/* Questions */}
                    {def.questions && (
                        <Section title={def.questionsTitle ?? "Questions"} hex={hex}>
                            <div className="space-y-3">
                                {def.questions.map((q) => <YesNoField key={q.key} label={q.text} value={values[q.key] || ""} onChange={(v) => set(q.key, v)} />)}
                                {def.note && <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-800">{def.note}</p>}
                            </div>
                        </Section>
                    )}

                    {/* Statement text (read-only, so the signer sees what they agree to) */}
                    {def.body.length > 0 && (
                        <Section title="Statement" hex={hex}>
                            <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                {def.body.map((b, i) => <Block key={i} block={b} values={values} preview={false} />)}
                            </div>
                        </Section>
                    )}

                    {/* Grouped field sections (e.g. applicant / previous employer / prospective employer) */}
                    {def.sections?.map((sec) => (
                        <Section key={sec.title} title={sec.title} hex={hex}>
                            <div className="space-y-4">
                                {sec.note && <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-600 shadow-sm">{sec.note}</p>}
                                <Grid>{sec.fields.map(renderField)}</Grid>
                            </div>
                        </Section>
                    ))}

                    {/* On-duty grid */}
                    {def.onDuty && (
                        <Section title="On-Duty Hours — Preceding 7 Days" hex={hex}>
                            <div className="space-y-4">
                                <Grid>
                                    <Field label="Driver Name"><Input value={values.driverName || ""} onChange={(e) => set("driverName", e.target.value)} /></Field>
                                    <Field label="Driving License #"><Input value={values.licenseNumber || ""} onChange={(e) => set("licenseNumber", e.target.value)} /></Field>
                                    <Field label="State"><SelectBox value={values.state || ""} placeholder="Please choose" items={STATES_PROVINCES} onChange={(v) => set("state", v)} /></Field>
                                </Grid>
                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-center text-[12px]">
                                        <thead><tr className="bg-slate-50 text-slate-500">
                                            <th className="px-2 py-2 text-left font-semibold">Day</th>
                                            {DAYS.map((d) => <th key={d} className="px-2 py-2 font-semibold">{d + 1}</th>)}
                                        </tr></thead>
                                        <tbody>
                                            <tr className="border-t border-slate-100">
                                                <td className="px-2 py-1.5 text-left font-semibold text-slate-600">Date</td>
                                                {DAYS.map((d) => <td key={d} className="px-1 py-1"><input type="date" value={values[`day${d}_date`] || ""} onChange={(e) => set(`day${d}_date`, e.target.value)} className="w-full rounded border border-slate-200 px-1 py-1 text-[11px]" /></td>)}
                                            </tr>
                                            <tr className="border-t border-slate-100">
                                                <td className="px-2 py-1.5 text-left font-semibold text-slate-600">Hrs. Worked</td>
                                                {DAYS.map((d) => <td key={d} className="px-1 py-1"><input type="number" value={values[`day${d}_hrs`] || ""} onChange={(e) => set(`day${d}_hrs`, e.target.value)} className="w-14 rounded border border-slate-200 px-1 py-1 text-center text-[12px]" /></td>)}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-sm text-slate-500">Total hours worked: <span className="font-bold text-slate-800">{DAYS.reduce((s, d) => s + (Number(values[`day${d}_hrs`]) || 0), 0)}</span></p>
                                <Grid>
                                    <Field label="Last relieved — Time"><Input value={values.lastTime || ""} onChange={(e) => set("lastTime", e.target.value)} placeholder="e.g. 18:00" /></Field>
                                    <Field label="Last relieved — On (date)"><Input type="date" value={values.lastOn || ""} onChange={(e) => set("lastOn", e.target.value)} /></Field>
                                </Grid>
                            </div>
                        </Section>
                    )}

                    {/* Mid fields */}
                    {def.fields && (
                        <Section title={def.fieldsTitle ?? "Details"} hex={hex}><Grid>{def.fields.map(renderField)}</Grid></Section>
                    )}

                    {/* Signature block */}
                    {def.signers.length > 0 && (
                        <Section title="Signature" hex={hex}>
                            <div className="space-y-5">{def.signers.map(renderField)}</div>
                        </Section>
                    )}

                    {def.footer && <p className="text-[12px] italic text-slate-500">{def.footer}</p>}

                    <div className={`${embedded ? "hidden" : "flex"} justify-end gap-3 border-t border-slate-200 pt-5`}>
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Preview &amp; Sign</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Section({ title, hex, children }: { title: string; hex: string; children: React.ReactNode }) {
    return (
        <div>
            <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900"><span className="mr-2 inline-block h-3 w-1 rounded" style={{ backgroundColor: hex }} />{title}</h2>
            {children}
        </div>
    );
}

function onDutySample(def: PolicyFormDef): Record<string, string> {
    if (!def.onDuty) return {};
    const out: Record<string, string> = {};
    const base = ["2026-05-15", "2026-05-16", "2026-05-17", "2026-05-18", "2026-05-19", "2026-05-20", "2026-05-21"];
    const hrs = ["8", "10", "9", "0", "8", "11", "7"];
    DAYS.forEach((d) => { out[`day${d}_date`] = base[d]; out[`day${d}_hrs`] = hrs[d]; });
    return out;
}
