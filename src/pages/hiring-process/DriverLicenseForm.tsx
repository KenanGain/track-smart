import { forwardRef, useRef, useState } from "react";
import { ChevronLeft, Plus, Trash2, UploadCloud, CornerDownRight, CreditCard, Info, Eye, Printer, Download, Sparkles } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select as ShadSelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCompanyBranding } from "../ats/company-branding.data";
import { COUNTRIES, STATES_PROVINCES, US_STATES, CA_PROVINCES } from "./ApplicationSettingsPage";
import { usePrefill } from "./application-prefill";

// License class and licensing authority both depend on the country.
const US_CLASSES = ["Class A", "Class B", "Class C", "Class D (Non-CDL)"];
const CA_CLASSES = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7"];
const classesFor = (country: string) => (country === "Canada" ? CA_CLASSES : US_CLASSES);
const authoritiesFor = (country: string) => (country === "Canada" ? CA_PROVINCES : US_STATES);

type ThemeKey = "standard" | "compact" | "enhanced" | "bw";
const THEMES: { key: ThemeKey; name: string }[] = [
    { key: "standard", name: "Standard" },
    { key: "compact", name: "Compact" },
    { key: "enhanced", name: "Enhanced" },
    { key: "bw", name: "Black & White" },
];

/**
 * Driver License Submission — a hiring-process step (not a generic form).
 * Captures the current license (with front/back image upload, endorsements and
 * restrictions) and any prior licenses held in the last 3 years.
 */

const ENDORSEMENTS = [
    "H - Placarded Hazmat",
    "N - Tank Vehicles",
    "P - Passengers",
    "S - School Bus",
    "T - Double/Triple Trailers",
    "X - Placarded Hazmat & Tank Vehicles",
    "AZ - Tractor-trailer with air-brake",
];

const RESTRICTIONS = [
    "B - Corrective Lenses",
    "C - Mechanical aid",
    "D - Prosthetic aid",
    "E - The driver may only operate a commercial vehicle with an automatic transmission.",
    "F - An outside mirror is required on the commercial vehicle",
    "G - The driver of a commercial vehicle is only allowed to operate during daylight hours",
    "H - Hazardous-materials prohibition (U.S. only)",
    "K - Drivers are authorized to drive a commercial vehicle within the state of issue (intrastate) only",
    "L - Drivers are restricted from operating a commercial vehicle with air brakes",
    "M - CDL-A holders may operate CDL-B school buses only",
    "N - CDL-A and CDL-B holders may operate CDL-C school buses only",
    "O - Driver limited to pintle hook trailers only",
    "V - Medical variance required",
    "Z - No full air-brake equipped CMV",
];

const DISQ_TYPES = ["Suspension", "Revocation", "Disqualification", "Denial"];

type License = {
    number: string; country: string; authority: string; cls: string;
    issueDate: string; expDate: string; front: string; back: string;
    hasEndorsements: boolean; endorsements: string[];
    hasRestrictions: boolean; restrictions: string[];
};

type Suspension = { type: string; date: string; state: string; reason: string; reinstated: string };
const newSuspension = (): Suspension => ({ type: "", date: "", state: "", reason: "", reinstated: "" });

const newLicense = (): License => ({
    number: "", country: "United States", authority: "", cls: "",
    issueDate: "", expDate: "", front: "", back: "",
    hasEndorsements: false, endorsements: [],
    hasRestrictions: false, restrictions: [],
});

// ----------------------------- primitives -----------------------------
function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
    return (
        <div className={className}>
            <Label className="text-slate-700">{label}{required && <span className="text-rose-500"> *</span>}</Label>
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

function Grid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div>;
}

function SelectBox({ value, onChange, items, placeholder }: { value: string; onChange: (v: string) => void; items: string[]; placeholder?: string }) {
    return (
        <ShadSelect value={value} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={placeholder ?? "Select..."} /></SelectTrigger>
            <SelectContent>{items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
        </ShadSelect>
    );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

function RevealPanel({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-600"><CornerDownRight className="h-3.5 w-3.5" /> Please provide the details</p>
            {title && <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>}
            <div className="mt-3 space-y-2">{children}</div>
        </div>
    );
}

function CheckRows({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
    return (
        <>
            {items.map((it) => (
                <label key={it} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 transition hover:border-slate-300">
                    <Checkbox checked={selected.includes(it)} onCheckedChange={() => onToggle(it)} />
                    <span>{it}</span>
                </label>
            ))}
        </>
    );
}

function UploadBox({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const ref = useRef<HTMLInputElement>(null);
    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => onChange(String(reader.result));
        reader.readAsDataURL(f);
    };
    return (
        <div>
            <Label className="text-slate-700">{label}</Label>
            <div className="mt-1.5">
                {value ? (
                    <div className="relative overflow-hidden rounded-lg border border-slate-200">
                        <img src={value} alt={label} className="h-40 w-full object-cover" />
                        <button type="button" onClick={() => onChange("")} className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-slate-500 shadow hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ) : (
                    <button type="button" onClick={() => ref.current?.click()} className="flex h-40 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 transition hover:border-blue-300 hover:text-blue-500">
                        <UploadCloud className="h-6 w-6" />
                        <span className="text-sm font-medium">Upload {label.toLowerCase()}</span>
                        <span className="text-xs">PNG or JPG</span>
                    </button>
                )}
                <input ref={ref} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
        </div>
    );
}

function LicenseCard({ value, onChange }: { value: License; onChange: (patch: Partial<License>) => void }) {
    const set = (patch: Partial<License>) => onChange(patch);
    const toggle = (key: "endorsements" | "restrictions", item: string) =>
        set({ [key]: value[key].includes(item) ? value[key].filter((x) => x !== item) : [...value[key], item] } as Partial<License>);

    return (
        <div className="space-y-5">
            <Grid>
                <Field label="License Number" required><Input value={value.number} onChange={(e) => set({ number: e.target.value })} /></Field>
                <Field label="Country" required><SelectBox value={value.country} items={COUNTRIES} onChange={(v) => set({ country: v, cls: "", authority: "" })} /></Field>
                <Field label={value.country === "Canada" ? "Licensing Authority (Province)" : "Licensing Authority (State)"} required><SelectBox value={value.authority} placeholder="Please choose" items={authoritiesFor(value.country)} onChange={(v) => set({ authority: v })} /></Field>
                <Field label="License Class" required><SelectBox value={value.cls} placeholder="Select class" items={classesFor(value.country)} onChange={(v) => set({ cls: v })} /></Field>
                <Field label="Issue Date"><Input type="date" value={value.issueDate} onChange={(e) => set({ issueDate: e.target.value })} /></Field>
                <Field label="Expiration Date" required><Input type="date" value={value.expDate} onChange={(e) => set({ expDate: e.target.value })} /></Field>
            </Grid>

            <Grid>
                <UploadBox label="Front of License" value={value.front} onChange={(v) => set({ front: v })} />
                <UploadBox label="Back of License" value={value.back} onChange={(v) => set({ back: v })} />
            </Grid>

            <ToggleRow label="Have Endorsements?" checked={value.hasEndorsements} onChange={(v) => set({ hasEndorsements: v })} />
            {value.hasEndorsements && (
                <RevealPanel title="Endorsements"><CheckRows items={ENDORSEMENTS} selected={value.endorsements} onToggle={(it) => toggle("endorsements", it)} /></RevealPanel>
            )}

            <ToggleRow label="Have Restriction?" checked={value.hasRestrictions} onChange={(v) => set({ hasRestrictions: v })} />
            {value.hasRestrictions && (
                <RevealPanel title="Restrictions"><CheckRows items={RESTRICTIONS} selected={value.restrictions} onToggle={(it) => toggle("restrictions", it)} /></RevealPanel>
            )}
        </div>
    );
}

// ----------------------------- PDF document -----------------------------
const v = (x: string) => x || "—";
const endText = (l: License) => (l.hasEndorsements ? (l.endorsements.length ? l.endorsements.join(", ") : "Yes — none selected") : "None");
const resText = (l: License) => (l.hasRestrictions ? (l.restrictions.length ? l.restrictions.join(", ") : "Yes — none selected") : "None");
const licRows = (l: License) => [
    { label: "License Number", value: v(l.number) },
    { label: "Class", value: v(l.cls) },
    { label: "Country", value: v(l.country) },
    { label: "Licensing Authority", value: v(l.authority) },
    { label: "Issue Date", value: v(l.issueDate) },
    { label: "Expiration Date", value: v(l.expDate) },
    { label: "Endorsements", value: endText(l) },
    { label: "Restrictions", value: resText(l) },
];

type DocProps = {
    licenses: License[];
    hasDisq: boolean; disqDetails: string; suspensions: Suspension[];
    theme: ThemeKey; branding: ReturnType<typeof useCompanyBranding>[0];
};

const LicenseDocument = forwardRef<HTMLDivElement, DocProps>(function LicenseDocument(
    { licenses, hasDisq, disqDetails, suspensions, theme, branding }, ref,
) {
    const bw = theme === "bw";
    const accent = bw ? "#111827" : branding.accentColor || "#2563eb";
    const initials = (branding.name || "AL").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

    const docCls = cn(
        "mx-auto max-w-[820px] bg-white shadow-lg",
        theme === "enhanced" ? "overflow-hidden rounded-md" : "",
        theme === "compact" ? "p-8 text-[11px] leading-tight" : bw ? "p-10 font-serif text-[12.5px] text-black" : "p-10 text-[13px]",
    );
    const sectionWrapCls = theme === "enhanced" ? "mb-5 rounded-lg border border-slate-200 p-4 shadow-sm" : theme === "compact" ? "mb-4" : "mb-6";
    const sectionTitleCls = cn(
        "font-bold uppercase tracking-wide",
        theme === "compact" ? "mb-2 bg-slate-100 px-2 py-1 text-[11px] text-slate-700"
            : theme === "enhanced" ? "mb-3 flex items-center gap-2 text-sm"
                : bw ? "mb-2 border-b border-black pb-1 text-sm text-black"
                    : "mb-3 border-b border-slate-200 pb-1 text-sm",
    );
    const rowsWrapCls = theme === "compact" ? "grid grid-cols-2 gap-x-6 gap-y-0.5" : "space-y-0.5";
    const rowCls = cn(
        "flex justify-between gap-4",
        theme === "compact" ? "border-b border-slate-100 py-0.5" : bw ? "border-b border-dotted border-gray-400 py-1" : "border-b border-dashed border-slate-100 py-1.5",
    );

    const Row = ({ label, value }: { label: string; value: string }) => (
        <div className={rowCls}>
            <span className={bw ? "text-gray-700" : "text-slate-500"}>{label}</span>
            <span className={cn("text-right font-medium", bw ? "text-black" : "text-slate-900")}>{value}</span>
        </div>
    );
    const Title = ({ children }: { children: React.ReactNode }) => (
        <h2 className={sectionTitleCls} style={!bw && theme !== "compact" ? { color: accent } : undefined}>
            {theme === "enhanced" && <span className="inline-block h-4 w-1 rounded" style={{ backgroundColor: accent }} />}
            {children}
        </h2>
    );
    const Images = ({ l }: { l: License }) => (
        (l.front || l.back)
            ? <div className="mt-3 flex flex-wrap gap-3">
                {l.front && <figure><img src={l.front} alt="Front" className="h-28 w-44 rounded border border-slate-200 object-cover" /><figcaption className="mt-1 text-[10px] text-slate-400">Front</figcaption></figure>}
                {l.back && <figure><img src={l.back} alt="Back" className="h-28 w-44 rounded border border-slate-200 object-cover" /><figcaption className="mt-1 text-[10px] text-slate-400">Back</figcaption></figure>}
            </div>
            : null
    );

    const Letterhead = () => {
        if (theme === "enhanced") {
            return (
                <div className="mb-8 px-10 py-6 text-white" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                    <div className="flex items-center gap-4">
                        {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 44 }} className="w-auto rounded object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">{initials}</div>}
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-bold leading-tight">{branding.name}</p>
                            {branding.tagline && <p className="text-xs text-white/80">{branding.tagline}</p>}
                        </div>
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
                        <h1 className="text-2xl font-bold">Driver License Submission</h1>
                        <div className="text-[11px] leading-snug text-white/80">
                            {branding.address && <div>{branding.address}</div>}
                            <div>{[branding.phone, branding.email].filter(Boolean).join("  ·  ")}</div>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 44 }} className="w-auto rounded object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>{initials}</div>}
                        <div>
                            <p className={cn("font-bold leading-tight", bw ? "text-black" : "text-slate-900")}>{branding.name}</p>
                            {branding.tagline && <p className={cn("text-[11px]", bw ? "text-gray-600" : "text-slate-500")}>{branding.tagline}</p>}
                        </div>
                    </div>
                    <div className={cn("text-[11px] leading-snug", bw ? "text-gray-600" : "text-slate-500")}>
                        {branding.address && <div>{branding.address}</div>}
                        <div>{[branding.phone, branding.email].filter(Boolean).join("  ·  ")}</div>
                    </div>
                </div>
                <div className="mt-4 border-b-2 pb-3" style={{ borderColor: accent }}>
                    <h1 className={cn("font-bold", theme === "compact" ? "text-lg" : "text-2xl", bw ? "text-black" : "text-slate-900")}>Driver License Submission</h1>
                </div>
            </div>
        );
    };

    return (
        <div id="app-doc" ref={ref} className={docCls}>
            <Letterhead />
            <div className={theme === "enhanced" ? "px-10 pb-10" : ""}>
                <div className={sectionWrapCls}>
                    <Title>Driver Licenses</Title>
                    {licenses.map((l, i) => (
                        <div key={i} className={i > 0 ? "mt-3" : ""}>
                            {licenses.length > 1 && <p className={cn("mb-1 text-xs font-semibold", bw ? "text-gray-700" : "text-slate-500")} style={!bw ? { color: accent } : undefined}>License {i + 1}</p>}
                            <div className={rowsWrapCls}>{licRows(l).map((r) => <Row key={r.label} {...r} />)}</div>
                            <Images l={l} />
                        </div>
                    ))}
                </div>

                <div className={sectionWrapCls}>
                    <Title>License Disqualification</Title>
                    <Row label="Ever denied / suspended / revoked / disqualified?" value={hasDisq ? "Yes" : "No"} />
                    {hasDisq && (
                        <>
                            {disqDetails && <Row label="Details" value={disqDetails} />}
                            {suspensions.map((s, i) => (
                                <div key={i} className="mt-2">
                                    <p className={cn("mb-1 text-xs font-semibold", bw ? "text-gray-700" : "text-slate-500")} style={!bw ? { color: accent } : undefined}>{s.type || `Entry ${i + 1}`}</p>
                                    <div className={rowsWrapCls}>
                                        {[{ label: "Type", value: v(s.type) }, { label: "Date", value: v(s.date) }, { label: "State / Province", value: v(s.state) }, { label: "Reinstatement Date", value: v(s.reinstated) }, { label: "Reason", value: v(s.reason) }].map((r) => <Row key={r.label} {...r} />)}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

// ----------------------------- form -----------------------------
export function DriverLicenseForm({ onBack, embedded }: { onBack: () => void; embedded?: boolean }) {
    const pf = usePrefill();
    const [licenses, setLicenses] = useState<License[]>(() =>
        pf?.licenses.length
            ? pf.licenses.map((l) => ({ ...newLicense(), number: l.number, cls: l.cls, authority: l.authority, expDate: l.exp, country: pf.country || "United States" }))
            : [newLicense()]);
    const [hasDisq, setHasDisq] = useState(false);
    const [disqDetails, setDisqDetails] = useState("");
    const [suspensions, setSuspensions] = useState<Suspension[]>([]);

    const setLic = (i: number, patch: Partial<License>) =>
        setLicenses((list) => list.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    const setSusp = (i: number, patch: Partial<Suspension>) =>
        setSuspensions((list) => list.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

    // Preview / PDF
    const [branding] = useCompanyBranding();
    const [preview, setPreview] = useState(false);
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

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
            let heightLeft = imgH;
            let position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) {
                position -= pageH;
                pdf.addPage();
                pdf.addImage(img, "PNG", 0, position, pageW, imgH);
                heightLeft -= pageH;
            }
            pdf.save("driver-license-submission.pdf");
        } finally {
            setDownloading(false);
        }
    };

    const fillSample = () => {
        setLicenses([
            {
                number: "D1234-5678-90", country: "United States", authority: "Illinois", cls: "Class A",
                issueDate: "2022-03-04", expDate: "2027-03-04", front: "", back: "",
                hasEndorsements: true, endorsements: ["H - Placarded Hazmat", "N - Tank Vehicles"],
                hasRestrictions: true, restrictions: ["B - Corrective Lenses"],
            },
            {
                number: "D9988-1122-33", country: "United States", authority: "Indiana", cls: "Class B",
                issueDate: "2018-06-01", expDate: "2022-05-30", front: "", back: "",
                hasEndorsements: false, endorsements: [], hasRestrictions: false, restrictions: [],
            },
        ]);
        setHasDisq(true);
        setDisqDetails("License suspended for 30 days in 2020 due to accumulated points; reinstated after completing a defensive-driving course.");
        setSuspensions([{ type: "Suspension", date: "2020-04-15", state: "Illinois", reason: "Accumulated demerit points", reinstated: "2020-05-15" }]);
    };

    return (
        <div className={embedded ? "" : "min-h-screen bg-slate-50"}>
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Top bar */}
            <div className={cn(embedded ? "hidden" : "no-print", "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3")}>
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Forms
                </button>
                {preview ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {THEMES.map((t) => (
                                <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                            ))}
                        </div>
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
                <div className="px-6 py-8">
                    <LicenseDocument ref={docRef} licenses={licenses} hasDisq={hasDisq} disqDetails={disqDetails} suspensions={suspensions} theme={theme} branding={branding} />
                </div>
            ) : (
            <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6 px-6 py-6"}>
                <div className={embedded ? "hidden" : undefined}>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                    <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><CreditCard className="h-6 w-6 text-blue-600" /> Driver License Submission</h1>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><Info className="h-4 w-4" /></div>
                    <p className="text-sm text-amber-800">These licenses were carried over from the applicant’s submitted application. Review each one, upload clear photos of the front and back, and add any others.</p>
                </div>

                {/* Licenses (one or more) */}
                <div>
                    <h2 className="border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">Driver Licenses</h2>
                    <p className="mb-3 mt-2 text-sm text-slate-500">Provide your current license and any others you have held within the last 3 years. Use <span className="font-medium text-slate-700">Add Another License</span> for each one.</p>
                    <div className="space-y-5">
                        {licenses.map((l, i) => (
                            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-slate-700">License {i + 1}</span>
                                    {licenses.length > 1 && (
                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setLicenses((list) => list.filter((_, idx) => idx !== i))}>
                                            <Trash2 className="h-3.5 w-3.5" /> Remove
                                        </Button>
                                    )}
                                </div>
                                <LicenseCard value={l} onChange={(patch) => setLic(i, patch)} />
                            </div>
                        ))}
                        <button type="button" onClick={() => setLicenses((list) => [...list, newLicense()])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50">
                            <Plus className="h-4 w-4" /> Add Another License
                        </button>
                    </div>
                </div>

                {/* License disqualification */}
                <div>
                    <h2 className="mb-3 border-b border-slate-200 pb-2 text-base font-semibold text-slate-900">License Disqualification Details</h2>
                    <ToggleRow
                        label="Have you ever been denied, suspended, revoked, or disqualified from a license, permit, or privilege to operate a motor vehicle?"
                        checked={hasDisq}
                        onChange={setHasDisq}
                    />
                    {hasDisq && (
                        <div className="mt-5">
                            <RevealPanel>
                                <div className="space-y-5">
                                    <div>
                                        <Label className="text-slate-700">Details</Label>
                                        <Input className="mt-1.5" value={disqDetails} onChange={(e) => setDisqDetails(e.target.value)} />
                                        <p className="mt-1 text-xs text-slate-400">Briefly describe what happened.</p>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">Suspensions / Revocations</p>
                                        <div className="mt-3 space-y-4">
                                            {suspensions.map((s, i) => (
                                                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                                    <div className="mb-4 flex items-center justify-between">
                                                        <span className="text-sm font-semibold text-slate-700">{s.type || `Entry ${i + 1}`}</span>
                                                        <Button variant="ghost" size="sm" className="h-7 text-rose-500 hover:text-rose-600" onClick={() => setSuspensions((list) => list.filter((_, idx) => idx !== i))}>
                                                            <Trash2 className="h-3.5 w-3.5" /> Remove
                                                        </Button>
                                                    </div>
                                                    <Grid>
                                                        <Field label="Type" required><SelectBox value={s.type} placeholder="Select" items={DISQ_TYPES} onChange={(v) => setSusp(i, { type: v })} /></Field>
                                                        <Field label="Date" required><Input type="date" value={s.date} onChange={(e) => setSusp(i, { date: e.target.value })} /></Field>
                                                        <Field label="State / Province"><SelectBox value={s.state} placeholder="Please choose" items={STATES_PROVINCES} onChange={(v) => setSusp(i, { state: v })} /></Field>
                                                        <Field label="Reinstatement Date"><Input type="date" value={s.reinstated} onChange={(e) => setSusp(i, { reinstated: e.target.value })} /></Field>
                                                    </Grid>
                                                    <Field className="mt-5" label="Reason"><Input value={s.reason} onChange={(e) => setSusp(i, { reason: e.target.value })} /></Field>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => setSuspensions((list) => [...list, newSuspension()])} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-violet-300 bg-white px-4 py-3 text-sm font-semibold text-violet-600 transition hover:bg-violet-50">
                                                <Plus className="h-4 w-4" /> Suspensions / Revocations
                                            </button>
                                            <p className="mt-2 text-xs text-slate-500">Add each suspension, revocation, or disqualification using the &ldquo;+&rdquo; button.</p>
                                        </div>
                                    </div>
                                </div>
                            </RevealPanel>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={cn(embedded ? "hidden" : "flex", "justify-end gap-3 border-t border-slate-200 pt-5")}>
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Preview</Button>
                    <Button>Save license</Button>
                </div>
            </div>
            )}
        </div>
    );
}
