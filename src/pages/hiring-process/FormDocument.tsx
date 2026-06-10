import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { CompanyBranding } from "../ats/company-branding.data";

/** Themed, branded PDF-style document shared by hiring-process forms. */

export type ThemeKey = "standard" | "compact" | "enhanced" | "bw";
export const THEMES: { key: ThemeKey; name: string }[] = [
    { key: "standard", name: "Standard" },
    { key: "compact", name: "Compact" },
    { key: "enhanced", name: "Enhanced" },
    { key: "bw", name: "Black & White" },
];

export type DocRow = { label: string; value: string };
export type DocGroup = { label?: string; rows: DocRow[]; images?: string[] };
export type DocSection = { title: string; groups: DocGroup[] };

type Props = {
    title: string;
    subtitle?: string;
    badge?: string;
    sections: DocSection[];
    theme: ThemeKey;
    branding: CompanyBranding;
};

export const FormDocument = forwardRef<HTMLDivElement, Props>(function FormDocument({ title, subtitle, badge, sections, theme, branding }, ref) {
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

    const Letterhead = () => {
        const contact = [branding.phone, branding.email].filter(Boolean).join("  ·  ");
        if (theme === "enhanced") {
            return (
                <div className="mb-8 px-10 py-6 text-white" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                    <div className="flex items-center gap-4">
                        {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 44 }} className="w-auto rounded object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">{initials}</div>}
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-bold leading-tight">{branding.name}</p>
                            {branding.tagline && <p className="text-xs text-white/80">{branding.tagline}</p>}
                        </div>
                        {badge && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase">{badge}</span>}
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
                        <div><h1 className="text-2xl font-bold">{title}</h1>{subtitle && <p className="text-xs text-white/80">{subtitle}</p>}</div>
                        {branding.address && <div className="text-[11px] leading-snug text-white/80"><div>{branding.address}</div><div>{contact}</div></div>}
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
                        <div>{contact}</div>
                    </div>
                </div>
                <div className="mt-4 flex items-end justify-between border-b-2 pb-3" style={{ borderColor: accent }}>
                    <div>
                        <h1 className={cn("font-bold", theme === "compact" ? "text-lg" : "text-2xl", bw ? "text-black" : "text-slate-900")}>{title}</h1>
                        {subtitle && <p className={cn("text-xs", bw ? "text-gray-600" : "text-slate-500")}>{subtitle}</p>}
                    </div>
                    {badge && <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase", bw ? "border border-black text-black" : "text-white")} style={bw ? undefined : { backgroundColor: accent }}>{badge}</span>}
                </div>
            </div>
        );
    };

    const Row = ({ label, value }: DocRow) => (
        <div className={rowCls}>
            <span className={bw ? "text-gray-700" : "text-slate-500"}>{label}</span>
            <span className={cn("text-right font-medium", bw ? "text-black" : "text-slate-900")}>{value || "—"}</span>
        </div>
    );

    return (
        <div id="app-doc" ref={ref} className={docCls}>
            <Letterhead />
            <div className={theme === "enhanced" ? "px-10 pb-10" : ""}>
                {sections.map((sec) => (
                    <div key={sec.title} className={sectionWrapCls}>
                        <h2 className={sectionTitleCls} style={!bw && theme !== "compact" ? { color: accent } : undefined}>
                            {theme === "enhanced" && <span className="inline-block h-4 w-1 rounded" style={{ backgroundColor: accent }} />}
                            {sec.title}
                        </h2>
                        {sec.groups.map((grp, gi) => (
                            <div key={gi} className={gi > 0 ? "mt-2.5" : ""}>
                                {grp.label && <p className={cn("mb-1 text-xs font-semibold", bw ? "text-gray-700" : "text-slate-500")} style={!bw ? { color: accent } : undefined}>{grp.label}</p>}
                                <div className={rowsWrapCls}>{grp.rows.map((r) => <Row key={r.label} {...r} />)}</div>
                                {grp.images && grp.images.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-3">
                                        {grp.images.filter((s) => s.startsWith("data:image")).map((src, i) => (
                                            <img key={i} src={src} alt={`Attachment ${i + 1}`} className="h-28 w-44 rounded border border-slate-200 object-cover" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
});
