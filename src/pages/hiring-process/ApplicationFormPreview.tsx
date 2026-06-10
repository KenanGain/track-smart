import { useRef, useState } from "react";
import { ChevronLeft, Printer, FileText, Download } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCompanyBranding } from "../ats/company-branding.data";
import { APPLICATION_FORMS, type FormConfig } from "./ApplicationSettingsPage";

/**
 * Settings -> Hiring Process -> Applications -> Preview
 *
 * A PDF-style document preview of an application form. Lets you switch between
 * render themes (Standard / Compact / Enhanced / Black & White), toggle sample
 * (dummy) data, jump to the live form, and print / save as PDF.
 */

const APPLICATIONS_PATH = "/settings/hiring-process/applications";

type PField = { label: string; sample: string; full?: boolean };
type PSection = { title: string; note?: string; repeat?: boolean; fields: PField[] };

const ABBR: Record<string, string> = { Illinois: "IL", Ontario: "ON" };

function buildSchema(config: FormConfig): PSection[] {
    const st = config.defaultCountry === "Canada" ? "Ontario" : "Illinois";
    const stAbbr = ABBR[st];
    const country = config.defaultCountry;
    return [
        {
            title: "Applicant Information",
            fields: [
                { label: "First Name", sample: "Kenan" },
                { label: "Last Name", sample: "Gain" },
                { label: "Email", sample: "kenan.gain@example.com", full: true },
                { label: "Phone Number", sample: "(555) 218-4471" },
                { label: "Date of Birth", sample: "03/14/1990" },
                { label: config.idLabel, sample: "***-**-4471", full: true },
                { label: `Legal right to work in ${country === "Canada" ? "Canada" : "the U.S."}`, sample: "Yes" },
                { label: "Position Type", sample: "Company Driver" },
                { label: "TWIC Card Number", sample: "8821940", full: true },
            ],
        },
        {
            title: "Address Details",
            fields: [
                { label: "Street Address (line 1)", sample: "18 Maple Ridge Rd", full: true },
                { label: "Street Address (line 2)", sample: "Unit 4", full: true },
                { label: "Country", sample: country },
                { label: "City", sample: "Springfield" },
                { label: "State / Province", sample: st },
                { label: "Zip / Postal Code", sample: "62704" },
                { label: "Residence 3+ years?", sample: "Yes" },
            ],
        },
        {
            title: "Contact Details",
            fields: [
                { label: "Cell Phone", sample: "(555) 218-4471" },
                { label: "Confirm Email", sample: "kenan.gain@example.com" },
                { label: "Preferred method of contact", sample: "Primary Phone" },
                { label: "Best time to contact", sample: "Any" },
            ],
        },
        {
            title: "License Details", repeat: true,
            fields: [
                { label: "License Number", sample: "D1234-5678-90" },
                { label: "Country", sample: country },
                { label: "Licensing Authority", sample: st },
                { label: "License Class", sample: "Class A" },
                { label: "Current driver license?", sample: "Yes" },
                { label: "Commercial (CDL)?", sample: "Yes" },
                { label: "Expiration Date", sample: "03-04-2027" },
                { label: "Endorsements", sample: "HazMat, Tanker", full: true },
            ],
        },
        {
            title: "License Disqualification",
            fields: [
                { label: "License ever denied / suspended / revoked?", sample: "No", full: true },
                { label: "Convicted of driving during suspension?", sample: "No", full: true },
                { label: "Alcohol / controlled-substance offense?", sample: "No", full: true },
                { label: "Illegal substance possession / sale?", sample: "No", full: true },
                { label: "Reckless / careless driving conviction?", sample: "No", full: true },
                { label: "Failed / refused a DOT drug or alcohol test?", sample: "No", full: true },
            ],
        },
        {
            title: "Accident Details", repeat: true,
            fields: [
                { label: "Date of Accident", sample: "06-2023" },
                { label: "Type", sample: "Rear-end collision" },
                { label: "State / Prov", sample: st },
                { label: "Commercial vehicle?", sample: "Yes" },
                { label: "At fault?", sample: "No" },
                { label: "Ticketed?", sample: "No" },
                { label: "Details", sample: "Minor rear-end at low speed; no injuries.", full: true },
            ],
        },
        {
            title: "Traffic Violation Details", repeat: true,
            fields: [
                { label: "Violation Date", sample: "02-2024" },
                { label: "Charge / Description", sample: "Speeding" },
                { label: "State / Prov", sample: st },
                { label: "Commercial Vehicle?", sample: "No" },
                { label: "Penalty", sample: "Fine" },
                { label: "Fine Amount", sample: "$100 - $250" },
            ],
        },
        {
            title: "Employment Details", repeat: true,
            fields: [
                { label: "Company Name", sample: "Roadrunner Freight" },
                { label: "Dates", sample: "01-2021 - 03-2024" },
                { label: "Position Held", sample: "OTR Driver" },
                { label: "Location", sample: `Springfield, ${stAbbr}` },
                { label: "Reason for leaving", sample: "Career advancement", full: true },
                { label: "Current employer?", sample: "No" },
                { label: "Operated CMV?", sample: "Yes" },
            ],
        },
        {
            title: "Education Details", repeat: true,
            fields: [
                { label: "School name", sample: "Lincoln Technical Institute" },
                { label: "Dates", sample: "09-2019 - 06-2020" },
                { label: "Location", sample: `Springfield, ${stAbbr}` },
                { label: "Studied", sample: "Diesel Mechanics" },
                { label: "Graduation", sample: "06-2020" },
            ],
        },
        {
            title: "Military Service",
            fields: [
                { label: "Were you ever in the military?", sample: "No", full: true },
            ],
        },
        {
            title: "Unemployment", repeat: true,
            fields: [
                { label: "Dates", sample: "04-2020 - 08-2020" },
                { label: "Comments", sample: "Between roles during COVID-19.", full: true },
            ],
        },
        {
            title: "Signature & Declarations",
            fields: [
                { label: "Applicant Name", sample: "Kenan Gain" },
                { label: "Date Signed", sample: "06/09/2026" },
                { label: "Signature", sample: "Electronically signed — Kenan Gain", full: true },
                { label: "Certification", sample: "I certify the information above is true and complete.", full: true },
            ],
        },
    ];
}

type ThemeKey = "standard" | "compact" | "enhanced" | "bw";
const THEMES: { key: ThemeKey; name: string }[] = [
    { key: "standard", name: "Standard" },
    { key: "compact", name: "Compact" },
    { key: "enhanced", name: "Enhanced" },
    { key: "bw", name: "Black & White" },
];

function Value({ value, show, bw }: { value: string; show: boolean; bw?: boolean }) {
    if (show) return <span className={cn("font-medium", bw ? "text-black" : "text-slate-900")}>{value}</span>;
    return <span className={cn("inline-block min-w-[140px] border-b", bw ? "border-gray-500" : "border-slate-300")}>&nbsp;</span>;
}

export function ApplicationFormPreviewPage({ formId, onNavigate }: { formId: string; onNavigate: (path: string) => void }) {
    const config = APPLICATION_FORMS.find((f) => f.id === formId);
    const [branding] = useCompanyBranding();
    const [theme, setTheme] = useState<ThemeKey>("standard");
    const [sample, setSample] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    // Real PDF: rasterise the document and slice it across A4 pages.
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
            pdf.save(`${config?.name ?? "application"}-application.pdf`);
        } finally {
            setDownloading(false);
        }
    };

    if (!config) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-slate-500">That application form doesn&rsquo;t exist.</p>
                <Button variant="outline" onClick={() => onNavigate(APPLICATIONS_PATH)}>Back to Application Forms</Button>
            </div>
        );
    }

    const schema = buildSchema(config);
    const bw = theme === "bw";

    // Per-theme class sets for the document.
    const docCls = cn(
        "mx-auto bg-white shadow-lg",
        theme === "enhanced" ? "max-w-[820px] overflow-hidden rounded-md" : "max-w-[820px]",
        theme === "compact" ? "p-8 text-[11px] leading-tight" : theme === "bw" ? "p-10 font-serif text-[12.5px] text-black" : "p-10 text-[13px]",
    );

    const accent = bw ? "#111827" : branding.accentColor || "#2563eb";
    const initials = (branding.name || "AL").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

    const LogoMark = ({ light, size = 44 }: { light?: boolean; size?: number }) => (
        branding.logoDataUrl ? (
            <img src={branding.logoDataUrl} alt={branding.name} style={{ height: size }} className="w-auto rounded object-contain" />
        ) : (
            <div
                className={cn("flex items-center justify-center rounded-lg text-sm font-bold", light ? "bg-white/20 text-white" : "text-white")}
                style={{ height: size, width: size, backgroundColor: light ? undefined : accent }}
            >
                {initials}
            </div>
        )
    );

    const ContactLine = ({ light }: { light?: boolean }) => (
        <div className={cn("text-[11px] leading-snug", light ? "text-white/80" : bw ? "text-gray-600" : "text-slate-500")}>
            {branding.address && <div>{branding.address}</div>}
            <div>{[branding.phone, branding.email].filter(Boolean).join("  ·  ")}</div>
        </div>
    );

    const renderHeader = () => {
        if (theme === "enhanced") {
            return (
                <div className="mb-8 px-10 py-6 text-white" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                    <div className="flex items-center gap-4">
                        <LogoMark light size={48} />
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-bold leading-tight">{branding.name}</p>
                            {branding.tagline && <p className="text-xs text-white/80">{branding.tagline}</p>}
                        </div>
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase">{config.region}</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
                        <h1 className="text-2xl font-bold">{config.name} Driver Application</h1>
                        <ContactLine light />
                    </div>
                </div>
            );
        }
        return (
            <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <LogoMark />
                        <div>
                            <p className={cn("font-bold leading-tight", bw ? "text-black" : "text-slate-900")}>{branding.name}</p>
                            {branding.tagline && <p className={cn("text-[11px]", bw ? "text-gray-600" : "text-slate-500")}>{branding.tagline}</p>}
                        </div>
                    </div>
                    <ContactLine />
                </div>
                <div className="mt-4 flex items-end justify-between border-b-2 pb-3" style={{ borderColor: accent }}>
                    <h1 className={cn("font-bold", theme === "compact" ? "text-lg" : "text-2xl", bw ? "text-black" : "text-slate-900")}>{config.name} Driver Application</h1>
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase", bw ? "border border-black text-black" : "text-white")} style={bw ? undefined : { backgroundColor: accent }}>{config.region}</span>
                </div>
            </div>
        );
    };

    const sectionTitleCls = cn(
        "font-bold uppercase tracking-wide",
        theme === "compact" ? "mb-2 bg-slate-100 px-2 py-1 text-[11px] text-slate-700"
            : theme === "enhanced" ? "mb-3 flex items-center gap-2 text-sm text-blue-700"
                : bw ? "mb-2 border-b border-black pb-1 text-sm text-black"
                    : "mb-3 border-b border-slate-200 pb-1 text-sm text-blue-700",
    );

    const rowsWrapCls = theme === "compact" ? "grid grid-cols-2 gap-x-6 gap-y-0.5" : "space-y-0.5";
    const rowCls = cn(
        "flex justify-between gap-4",
        theme === "compact" ? "border-b border-slate-100 py-0.5"
            : bw ? "border-b border-dotted border-gray-400 py-1"
                : "border-b border-dashed border-slate-100 py-1.5",
    );

    const sectionWrapCls = theme === "enhanced" ? "mb-5 rounded-lg border border-slate-200 p-4 shadow-sm" : theme === "compact" ? "mb-4" : "mb-6";

    return (
        <div className="min-h-screen bg-slate-100">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Toolbar */}
            <div className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-3">
                    <button type="button" onClick={() => onNavigate(APPLICATIONS_PATH)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" /> Application Forms
                    </button>
                    <span className="text-sm font-semibold text-slate-800">{config.name} — PDF Preview</span>

                    <div className="ml-auto flex flex-wrap items-center gap-3">
                        {/* Theme switcher */}
                        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
                            {THEMES.map((t) => (
                                <button
                                    key={t.key}
                                    type="button"
                                    onClick={() => setTheme(t.key)}
                                    className={cn(
                                        "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                                        theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white",
                                    )}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>

                        {/* Sample data toggle */}
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <Switch checked={sample} onCheckedChange={setSample} />
                            Sample data
                        </label>

                        <Button variant="outline" size="sm" onClick={() => onNavigate(`${APPLICATIONS_PATH}/${config.id}`)}>
                            <FileText className="h-4 w-4" /> Open form
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer className="h-4 w-4" /> Print
                        </Button>
                        <Button size="sm" onClick={downloadPdf} disabled={downloading}>
                            <Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Document */}
            <div className="px-6 py-8">
                <div id="app-doc" ref={docRef} className={docCls}>
                    {renderHeader()}
                    <div className={theme === "enhanced" ? "px-10 pb-10" : ""}>
                        {schema.map((sec) => (
                            <div key={sec.title} className={sectionWrapCls}>
                                <h2 className={sectionTitleCls} style={!bw && theme !== "compact" ? { color: accent } : undefined}>
                                    {theme === "enhanced" && <span className="inline-block h-4 w-1 rounded" style={{ backgroundColor: accent }} />}
                                    {sec.title}
                                    {sec.repeat && <span className={cn("ml-2 text-[10px] font-normal normal-case", bw ? "text-gray-500" : "text-slate-400")}>(multiple entries allowed — showing 1)</span>}
                                </h2>
                                <div className={rowsWrapCls}>
                                    {sec.fields.map((fld) => (
                                        <div key={fld.label} className={cn(rowCls, fld.full && theme === "compact" && "col-span-2")}>
                                            <span className={cn(bw ? "text-gray-700" : "text-slate-500")}>{fld.label}</span>
                                            <span className="text-right"><Value value={fld.sample} show={sample} bw={bw} /></span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Signature line */}
                        <div className={cn("mt-8 flex items-end justify-between", theme === "compact" && "mt-5")}>
                            <div className="w-1/2">
                                <div className={cn("border-b", bw ? "border-black" : "border-slate-400")}>
                                    {sample && <span className="italic">Kenan Gain</span>}&nbsp;
                                </div>
                                <p className={cn("mt-1 text-xs", bw ? "text-gray-600" : "text-slate-400")}>Applicant Signature</p>
                            </div>
                            <div className="w-32">
                                <div className={cn("border-b", bw ? "border-black" : "border-slate-400")}>
                                    {sample && <span>06/09/2026</span>}&nbsp;
                                </div>
                                <p className={cn("mt-1 text-xs", bw ? "text-gray-600" : "text-slate-400")}>Date</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
