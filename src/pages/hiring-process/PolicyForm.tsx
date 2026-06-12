import { forwardRef, useEffect, useRef, useState } from "react";
import { ChevronLeft, Eye, Printer, Download, Sparkles, Check } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompanyBranding } from "../ats/company-branding.data";
import type { CompanyBranding } from "../ats/company-branding.data";
import { STATES_PROVINCES } from "./ApplicationSettingsPage";
import { Field, Grid, SelectBox, YesNoField, SignaturePad } from "./FormKit";
import { THEME_HEX, type PolicyFormDef, type PolicyBlock, type PolicyField } from "./policy-forms.data";
import { usePrefill } from "./application-prefill";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

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

function Block({ block, values, preview }: { block: PolicyBlock; values: Record<string, string>; preview: boolean }) {
    if ("h" in block) return <p className="mt-4 text-[13px] font-bold uppercase tracking-wide text-slate-800 first:mt-0">{block.h}</p>;
    if ("p" in block) return <p className="text-[13px] leading-relaxed text-slate-600">{renderText(block.p, values, preview)}</p>;
    if ("note" in block) return <p className="text-[13px] font-semibold leading-relaxed text-slate-800">{block.note}</p>;
    if ("ol" in block) return <ol className="list-decimal space-y-2 pl-5 text-[13px] leading-relaxed text-slate-600">{block.ol.map((t, i) => <li key={i}>{t}</li>)}</ol>;
    if ("ul" in block) return <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-slate-600">{block.ul.map((t, i) => <li key={i}>{t}</li>)}</ul>;
    return null;
}

// Single underlined value + label, used for field rows and signature blocks in the document.
function SignLine({ field, values, sigs }: { field: PolicyField; values: Record<string, string>; sigs: Record<string, string> }) {
    const isSign = field.kind === "sign";
    const img = sigs[field.key];
    return (
        <div>
            <div className="flex h-12 items-end justify-center border-b border-slate-400 pb-0.5">
                {isSign
                    ? (img ? <img src={img} alt="" className="max-h-11" /> : null)
                    : <span className="pb-1 text-[13px] text-slate-800">{values[field.key] || ""}</span>}
            </div>
            <p className="mt-1 text-[12px] font-bold text-slate-700">{field.label}</p>
        </div>
    );
}

// ── The printable policy document ───────────────────────────────────────────
export const PolicyDocument = forwardRef<HTMLDivElement, { def: PolicyFormDef; values: Record<string, string>; sigs: Record<string, string>; branding: CompanyBranding }>(
    ({ def, values, sigs, branding }, ref) => {
        const hex = THEME_HEX[def.theme];
        const total = DAYS.reduce((s, d) => s + (Number(values[`day${d}_hrs`]) || 0), 0);
        return (
            <div ref={ref} id="app-doc" className="mx-auto max-w-3xl bg-white p-10 shadow-sm" style={{ width: 794 }}>
                {/* Letterhead */}
                <div className="mb-6 flex items-center gap-3 border-b-2 pb-4" style={{ borderColor: hex }}>
                    {branding.logoDataUrl && <img src={branding.logoDataUrl} alt="" className="h-12 w-12 rounded object-contain" />}
                    <div>
                        <p className="text-lg font-bold text-slate-900">{branding.name}</p>
                        {(branding.address || branding.phone) && <p className="text-[11px] text-slate-500">{[branding.address, branding.phone].filter(Boolean).join(" · ")}</p>}
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-[26px] font-extrabold leading-tight text-slate-900">{def.title}<br /><span style={{ color: hex }}>{def.accentTitle}</span></h1>

                <div className="mt-5 rounded-lg border p-6" style={{ borderColor: `${hex}66` }}>
                    {/* Questions */}
                    {def.questions && (
                        <div className="mb-5 overflow-hidden rounded border" style={{ borderColor: `${hex}66` }}>
                            <div className="flex items-center justify-between px-3 py-1.5 text-[12px] font-bold uppercase text-white" style={{ backgroundColor: hex }}>
                                <span>{def.questionsTitle}</span><span>Yes or No</span>
                            </div>
                            {def.questions.map((q) => (
                                <div key={q.key} className="flex items-center justify-between gap-4 border-t px-3 py-2 text-[13px] text-slate-700" style={{ borderColor: `${hex}33` }}>
                                    <span>{q.text}</span>
                                    <span className="flex shrink-0 gap-3 text-[12px] font-semibold">
                                        <span className={cn("flex items-center gap-1", values[q.key] === "Yes" ? "text-slate-900" : "text-slate-300")}>{values[q.key] === "Yes" && <Check className="h-3 w-3" />}Yes</span>
                                        <span className={cn("flex items-center gap-1", values[q.key] === "No" ? "text-slate-900" : "text-slate-300")}>{values[q.key] === "No" && <Check className="h-3 w-3" />}No</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {def.note && <p className="mb-4 text-[12px] font-semibold" style={{ color: hex }}>*****{def.note}</p>}

                    {/* Body */}
                    <div className="space-y-3">{def.body.map((b, i) => <Block key={i} block={b} values={values} preview />)}</div>

                    {/* On-duty grid */}
                    {def.onDuty && (
                        <div className="mt-5">
                            <div className="mb-4 grid grid-cols-3 gap-4">
                                <SignLine field={{ key: "driverName", label: "Driver Name" }} values={values} sigs={sigs} />
                                <SignLine field={{ key: "licenseNumber", label: "Driving License #" }} values={values} sigs={sigs} />
                                <SignLine field={{ key: "state", label: "State" }} values={values} sigs={sigs} />
                            </div>
                            <table className="w-full border-collapse text-center text-[12px]">
                                <tbody>
                                    <tr style={{ backgroundColor: `${hex}1a` }}>
                                        <td className="border border-slate-300 px-2 py-1.5 font-bold">Day</td>
                                        {DAYS.map((d) => <td key={d} className="border border-slate-300 px-2 py-1.5 font-bold">{d + 1}</td>)}
                                        <td className="border border-slate-300 px-2 py-1.5 font-bold" rowSpan={1}>Total</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 px-2 py-1.5 text-left font-semibold">Date</td>
                                        {DAYS.map((d) => <td key={d} className="border border-slate-300 px-2 py-1.5">{values[`day${d}_date`] || ""}</td>)}
                                        <td className="border border-slate-300 px-2 py-1.5 font-semibold">Hrs.</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 px-2 py-1.5 text-left font-semibold">Hrs. Worked</td>
                                        {DAYS.map((d) => <td key={d} className="border border-slate-300 px-2 py-1.5">{values[`day${d}_hrs`] || ""}</td>)}
                                        <td className="border border-slate-300 px-2 py-1.5 font-bold">{total || 0}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="mt-4 text-[13px] leading-relaxed text-slate-600">I hereby certify that the information given above is correct to the best of my knowledge and belief and that I was last relieved from work at:</p>
                            <div className="mt-3 grid grid-cols-2 gap-4">
                                <SignLine field={{ key: "lastTime", label: "Time" }} values={values} sigs={sigs} />
                                <SignLine field={{ key: "lastOn", label: "On" }} values={values} sigs={sigs} />
                            </div>
                        </div>
                    )}

                    {/* Mid fields */}
                    {def.fields && (
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            {def.fields.map((f) => <SignLine key={f.key} field={f} values={values} sigs={sigs} />)}
                        </div>
                    )}

                    {/* Signature block */}
                    <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
                        {def.signers.map((f) => <SignLine key={f.key} field={f} values={values} sigs={sigs} />)}
                    </div>
                </div>

                <p className="mt-4 text-[10px] text-slate-400">{[branding.name, branding.address, branding.phone].filter(Boolean).join(" · ")}</p>
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
    const [values, setValues] = useState<Record<string, string>>(() => ({
        ...(pf ? {
            applicant: pf.fullName, printName: pf.fullName, driverName: pf.fullName,
            ssn: pf.ssn, dob: pf.dob, company: branding.name,
            licenseNumber: pf.licenses[0]?.number ?? "", state: pf.licenses[0]?.authority ?? "",
        } : { company: branding.name }),
        ...sharedValues,
    }));
    const [sigs, setSigs] = useState<Record<string, string>>(() => sharedSignature ? Object.fromEntries(signKeys.map((k) => [k, sharedSignature])) : {});
    // When the parent shares a signature / values (e.g. "sign once → all forms"),
    // merge them in without wiping anything the driver edited per-form.
    useEffect(() => { if (sharedValues) setValues((v) => ({ ...v, ...sharedValues })); }, [sharedValues]);
    useEffect(() => { if (sharedSignature) setSigs((s) => ({ ...s, ...Object.fromEntries(signKeys.map((k) => [k, sharedSignature])) })); }, [sharedSignature]);
    const [preview, setPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));
    const setSig = (k: string, v: string) => setSigs((p) => ({ ...p, [k]: v }));
    const hex = THEME_HEX[def.theme];

    const fillSample = () => {
        setValues({ ...(def.sample ?? {}), ...onDutySample(def) });
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
                        <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Edit</Button>
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
                <div className="px-6 py-8"><PolicyDocument ref={docRef} def={def} values={values} sigs={sigs} branding={branding} /></div>
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
                    <Section title="Statement" hex={hex}>
                        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                            {def.body.map((b, i) => <Block key={i} block={b} values={values} preview={false} />)}
                        </div>
                    </Section>

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
                    <Section title="Signature" hex={hex}>
                        <div className="space-y-5">{def.signers.map(renderField)}</div>
                    </Section>

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
