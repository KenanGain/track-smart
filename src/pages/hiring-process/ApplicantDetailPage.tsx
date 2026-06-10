import { forwardRef, useRef, useState } from "react";
import { ChevronLeft, Download, Printer, RotateCcw, MessageSquarePlus, FileText, ClipboardList, Mail, Phone, Building2, History, Activity, Send, Loader2, FileCheck2, ShieldCheck, ThumbsUp, X } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyBranding } from "../ats/company-branding.data";
import { useApplicants, formName, formRegion, relativeTime, ACTOR, type Applicant, type SubSection } from "./applicants.data";

const EVENT_STYLE: Record<string, { Icon: React.ElementType; cls: string }> = {
    invited: { Icon: Send, cls: "bg-blue-100 text-blue-600" },
    "in-progress": { Icon: Loader2, cls: "bg-blue-100 text-blue-600" },
    submitted: { Icon: FileCheck2, cls: "bg-indigo-100 text-indigo-600" },
    "under-review": { Icon: ShieldCheck, cls: "bg-violet-100 text-violet-600" },
    approved: { Icon: ThumbsUp, cls: "bg-emerald-100 text-emerald-600" },
    rejected: { Icon: X, cls: "bg-rose-100 text-rose-600" },
    status: { Icon: Activity, cls: "bg-slate-100 text-slate-600" },
    remark: { Icon: MessageSquarePlus, cls: "bg-amber-100 text-amber-600" },
    reissue: { Icon: RotateCcw, cls: "bg-amber-100 text-amber-600" },
};
const evStyle = (t: string) => EVENT_STYLE[t] ?? { Icon: Activity, cls: "bg-slate-100 text-slate-600" };
import { StatusSelect } from "./ApplicationsHiringPage";

const HP_PATH = "/hiring-process/applications";

type Tab = "data" | "document" | "remarks" | "events";

type ThemeKey = "standard" | "compact" | "enhanced" | "bw";
const THEMES: { key: ThemeKey; name: string }[] = [
    { key: "standard", name: "Standard" },
    { key: "compact", name: "Compact" },
    { key: "enhanced", name: "Enhanced" },
    { key: "bw", name: "Black & White" },
];

export function ApplicantDetailPage({ applicantId, onNavigate }: { applicantId: string; onNavigate: (path: string) => void }) {
    const { applicants, updateOne } = useApplicants();
    const [branding] = useCompanyBranding();
    const [tab, setTab] = useState<Tab>("data");
    const [docTheme, setDocTheme] = useState<ThemeKey>("standard");
    const [remarkText, setRemarkText] = useState("");
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const a = applicants.find((x) => x.id === applicantId);
    if (!a) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-slate-500">Applicant not found.</p>
                <Button variant="outline" onClick={() => onNavigate(HP_PATH)}>Back to Applications</Button>
            </div>
        );
    }

    const hasData = !!a.submission && a.submission.length > 0;
    const accent = branding.accentColor || "#2563eb";
    const initials = `${a.firstName[0] ?? ""}${a.lastName[0] ?? ""}`.toUpperCase();

    const addRemark = () => {
        const text = remarkText.trim();
        if (!text) return;
        const now = Date.now();
        const at = new Date(now).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
        updateOne(a.id, (prev) => ({
            remarks: [{ id: `r-${now}`, text, at, author: ACTOR }, ...prev.remarks],
            events: [{ id: `e-${now}`, type: "remark", text: "Remark added", at: now, author: ACTOR }, ...prev.events],
        }));
        setRemarkText("");
    };

    const reissue = () => {
        const now = Date.now();
        const at = new Date(now).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
        updateOne(a.id, (prev) => ({
            status: "waiting",
            stepsDone: 0,
            remarks: [{ id: `r-${now}`, text: "Application reissued — driver asked to provide their data again.", at, author: ACTOR }, ...prev.remarks],
            events: [{ id: `e-${now}`, type: "reissue", text: "Application reissued — data requested again", at: now, author: ACTOR }, ...prev.events],
        }));
        setTab("events");
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
            pdf.save(`${a.firstName}-${a.lastName}-application.pdf`);
        } finally {
            setDownloading(false);
        }
    };

    const TABS: { key: Tab; label: string; Icon: React.ElementType }[] = [
        { key: "data", label: "Submitted Data", Icon: ClipboardList },
        { key: "document", label: "Document (PDF)", Icon: FileText },
        { key: "events", label: `Event Log${a.events.length ? ` (${a.events.length})` : ""}`, Icon: History },
        { key: "remarks", label: `Remarks${a.remarks.length ? ` (${a.remarks.length})` : ""}`, Icon: MessageSquarePlus },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Header */}
            <div className="no-print border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 pb-0 pt-4">
                    <button type="button" onClick={() => onNavigate(HP_PATH)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" /> Applications
                    </button>

                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-lg font-bold text-white">{initials}</div>
                            <div>
                                <h1 className="text-xl font-semibold text-slate-900">{a.firstName} {a.lastName}</h1>
                                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                    <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{a.email}</span>
                                    {a.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{a.phone}</span>}
                                    <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{a.carrier}</span>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{formName(a.formId)} · {formRegion(a.formId)}</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{a.template}</span>
                                    <span className="text-slate-400">Invited {a.invitedAt} · {a.stepsDone}/{a.stepsTotal} steps</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <StatusSelect value={a.status} onChange={(s) => updateOne(a.id, { status: s })} />
                            <Button variant="outline" size="sm" onClick={reissue}><RotateCcw className="h-4 w-4" /> Reissue</Button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="mt-4 flex gap-1 border-b border-slate-200">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setTab(t.key)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition",
                                    tab === t.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700",
                                )}
                            >
                                <t.Icon className="h-4 w-4" /> {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-6">
                {/* Submitted data */}
                {tab === "data" && (
                    hasData ? (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {a.submission!.map((sec) => (
                                <div key={sec.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="mb-3 flex items-center gap-2">
                                        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>{sec.title}</h2>
                                        {sec.groups.length > 1 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{sec.groups.length}</span>}
                                    </div>
                                    <div className="space-y-4">
                                        {sec.groups.map((grp, gi) => (
                                            <div key={gi} className={gi > 0 ? "border-t border-slate-100 pt-3" : ""}>
                                                {grp.label && <p className="mb-1.5 text-xs font-semibold text-slate-600">{grp.label}</p>}
                                                <dl className="space-y-2">
                                                    {grp.fields.map((f) => (
                                                        <div key={f.label} className="flex justify-between gap-4 border-b border-dashed border-slate-100 pb-1.5 text-sm last:border-0">
                                                            <dt className="text-slate-500">{f.label}</dt>
                                                            <dd className="text-right font-medium text-slate-900">{f.value || "—"}</dd>
                                                        </div>
                                                    ))}
                                                </dl>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <EmptyData onReissue={reissue} />
                    )
                )}

                {/* Document / PDF view with the applicant's ACTUAL data */}
                {tab === "document" && (
                    hasData ? (
                        <>
                            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                                    {THEMES.map((t) => (
                                        <button
                                            key={t.key}
                                            type="button"
                                            onClick={() => setDocTheme(t.key)}
                                            className={cn(
                                                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                                                docTheme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50",
                                            )}
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                                    <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                                </div>
                            </div>
                            <ApplicationDocument ref={docRef} applicant={a} sections={a.submission!} accent={accent} branding={branding} theme={docTheme} />
                        </>
                    ) : (
                        <EmptyData onReissue={reissue} />
                    )
                )}

                {/* Event log */}
                {tab === "events" && (
                    <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                        {a.events.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">No activity yet.</p>
                        ) : (
                            <ol>
                                {a.events.map((e, i) => {
                                    const st = evStyle(e.type);
                                    const last = i === a.events.length - 1;
                                    return (
                                        <li key={e.id} className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", st.cls)}><st.Icon className="h-4 w-4" /></span>
                                                {!last && <span className="my-1 w-px flex-1 bg-slate-200" />}
                                            </div>
                                            <div className={cn("min-w-0", last ? "pb-0" : "pb-6")}>
                                                <p className="text-sm font-medium text-slate-800">{e.text}</p>
                                                <p className="mt-0.5 text-xs text-slate-400">
                                                    {e.author} · {relativeTime(e.at)} · {new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>
                )}

                {/* Remarks */}
                {tab === "remarks" && (
                    <div className="mx-auto max-w-2xl space-y-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-semibold text-slate-800">Add a remark</h2>
                            <Textarea className="mt-3" value={remarkText} onChange={(e) => setRemarkText(e.target.value)} placeholder="Note a decision, a follow-up, or why the status changed…" />
                            <div className="mt-3 flex justify-end">
                                <Button size="sm" disabled={!remarkText.trim()} onClick={addRemark}><MessageSquarePlus className="h-4 w-4" /> Add remark</Button>
                            </div>
                        </div>
                        {a.remarks.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">No remarks yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {a.remarks.map((r) => (
                                    <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <p className="text-sm text-slate-800">{r.text}</p>
                                        <p className="mt-2 text-xs text-slate-400">{r.author} · {r.at}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function EmptyData({ onReissue }: { onReissue: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><ClipboardList className="h-6 w-6" /></div>
            <h2 className="mt-4 text-base font-semibold text-slate-700">No data submitted yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-500">This applicant hasn&rsquo;t completed their application. You can resend or reissue the request.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={onReissue}><RotateCcw className="h-4 w-4" /> Reissue application</Button>
        </div>
    );
}

// Branded, paper-style document rendering the applicant's ACTUAL submitted data,
// with the same theme variants as the form preview (Standard/Compact/Enhanced/B&W).
type DocProps = { applicant: Applicant; sections: SubSection[]; accent: string; theme: ThemeKey; branding: ReturnType<typeof useCompanyBranding>[0] };
const ApplicationDocument = forwardRef<HTMLDivElement, DocProps>(function ApplicationDocument({ applicant, sections, accent: accentIn, theme, branding }, ref) {
    const bw = theme === "bw";
    const accent = bw ? "#111827" : accentIn;
    const initials = (branding.name || "AL").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const region = formRegion(applicant.formId);
    const title = `${formName(applicant.formId)} Driver Application`;
    const subtitle = `${applicant.firstName} ${applicant.lastName} · ${applicant.email}`;

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
        theme === "compact" ? "border-b border-slate-100 py-0.5"
            : bw ? "border-b border-dotted border-gray-400 py-1"
                : "border-b border-dashed border-slate-100 py-1.5",
    );

    const Letterhead = () => {
        if (theme === "enhanced") {
            return (
                <div className="mb-8 px-10 py-6 text-white" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}>
                    <div className="flex items-center gap-4">
                        {branding.logoDataUrl
                            ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 44 }} className="w-auto rounded object-contain" />
                            : <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">{initials}</div>}
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-bold leading-tight">{branding.name}</p>
                            {branding.tagline && <p className="text-xs text-white/80">{branding.tagline}</p>}
                        </div>
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase">{region}</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-white/20 pt-3">
                        <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-xs text-white/80">{subtitle}</p></div>
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
                        {branding.logoDataUrl
                            ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 44 }} className="w-auto rounded object-contain" />
                            : <div className="flex h-11 w-11 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>{initials}</div>}
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
                <div className="mt-4 flex items-end justify-between border-b-2 pb-3" style={{ borderColor: accent }}>
                    <div>
                        <h1 className={cn("font-bold", theme === "compact" ? "text-lg" : "text-2xl", bw ? "text-black" : "text-slate-900")}>{title}</h1>
                        <p className={cn("text-xs", bw ? "text-gray-600" : "text-slate-500")}>{subtitle}</p>
                    </div>
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase", bw ? "border border-black text-black" : "text-white")} style={bw ? undefined : { backgroundColor: accent }}>{region}</span>
                </div>
            </div>
        );
    };

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
                                {grp.label && (
                                    <p className={cn("mb-1 text-xs font-semibold", bw ? "text-gray-700" : "text-slate-500")} style={!bw ? { color: accent } : undefined}>{grp.label}</p>
                                )}
                                <div className={rowsWrapCls}>
                                    {grp.fields.map((f) => (
                                        <div key={f.label} className={rowCls}>
                                            <span className={bw ? "text-gray-700" : "text-slate-500"}>{f.label}</span>
                                            <span className={cn("text-right font-medium", bw ? "text-black" : "text-slate-900")}>{f.value || "—"}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
});
