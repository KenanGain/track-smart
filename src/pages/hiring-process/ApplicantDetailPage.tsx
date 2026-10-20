import { forwardRef, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, Download, Share2, Upload, Printer, RotateCcw, MessageSquarePlus, FileText, FileSignature, ClipboardList, Mail, Phone, Building2, History, Activity, Send, Loader2, FileCheck2, ShieldCheck, ThumbsUp, Check, X, Paperclip, Image as ImageIcon, Pencil, Eye } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCompanyBranding } from "../ats/company-branding.data";
import { useApplicants, formRegion, formShort, relativeTime, statusPatch, ACTOR, type Applicant, type SubSection, type SubGroup, type UploadedFile } from "./applicants.data";
import { ActivityTimeline } from "@/components/ui/ActivityTimeline";
import { ProfileTabs, type ProfileTab } from "@/components/ui/ProfileTabs";
import { ViewSwitch } from "@/components/ui/ListChrome";
import { BackLink } from "@/components/ui/BackLink";
import { SectionNav } from "@/components/ui/SectionNav";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { setMessagesFocus } from "@/pages/messages/messages-store";
import { currentUserName } from "@/data/users.data";
import { HEADER_TRANSITION, useScrolledPast } from "@/components/ui/use-condensing-header";
import { ACTIVITY_BADGE_TONE } from "@/components/ui/activity-kinds";
import { consentDefsForType, THEME_HEX } from "./policy-forms.data";
import { PolicyDocument } from "./PolicyForm";
import { buildPrefill } from "./application-prefill";

/*
 * What each kind of entry looks like on the trail.
 *
 * Solid circles rather than tinted squares, because this log is now drawn by the same
 * component as the ones on accidents, tickets and hours of service — four trails that were
 * four different shapes until they were not. The tones are the statuses own, so an entry
 * and the chip it put on the list agree about colour.
 */
const EVENT_LOOK: Record<string, { Icon: LucideIcon; tone: string }> = {
    invited: { Icon: Send, tone: "bg-blue-500" },
    waiting: { Icon: Send, tone: "bg-blue-500" },
    "in-progress": { Icon: Loader2, tone: "bg-sky-500" },
    submitted: { Icon: FileCheck2, tone: "bg-indigo-500" },
    "under-review": { Icon: ShieldCheck, tone: "bg-violet-500" },
    approved: { Icon: ThumbsUp, tone: "bg-emerald-500" },
    rejected: { Icon: X, tone: "bg-rose-500" },
    status: { Icon: Activity, tone: "bg-slate-400" },
    remark: { Icon: MessageSquarePlus, tone: "bg-amber-500" },
    reissue: { Icon: RotateCcw, tone: "bg-amber-500" },
    viewed: { Icon: Eye, tone: "bg-slate-400" },
    edited: { Icon: Pencil, tone: "bg-slate-500" },
    downloaded: { Icon: Download, tone: "bg-slate-500" },
    printed: { Icon: Printer, tone: "bg-slate-500" },
    document: { Icon: Paperclip, tone: "bg-sky-500" },
    shared: { Icon: Share2, tone: "bg-indigo-500" },
    uploaded: { Icon: Upload, tone: "bg-emerald-500" },
};
const evLook = (t: string) => EVENT_LOOK[t] ?? { Icon: Activity, tone: "bg-slate-400" };
import { StatusSelect } from "./ApplicationsHiringPage";

const HP_PATH = "/hiring-process/applications";

// Slug for a submitted-data section — used as the scroll anchor + jump-nav target.
const sectionId = (title: string) => "sec-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

type Tab = "data" | "document" | "uploads" | "consent" | "remarks" | "events";

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
    /** The top section gives most of its height back on the way down the file. */
    const { ref: foldMark, past: condensed } = useScrolledPast();

    const a = applicants.find((x) => x.id === applicantId);

    // Log who opened the application (realtime activity). Fires once per open;
    // deduped so re-opening within 5 minutes by the same person isn't repeated.
    const viewLogged = useRef(false);
    useEffect(() => {
        if (!a || viewLogged.current) return;
        viewLogged.current = true;
        updateOne(a.id, (prev) => {
            const latest = prev.events[0];
            const now = Date.now();
            if (latest && latest.type === "viewed" && latest.author === ACTOR && now - latest.at < 5 * 60_000) return {};
            return { events: [{ id: `v-${now}`, type: "viewed", text: `${ACTOR} opened the application`, at: now, author: ACTOR }, ...prev.events] };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [a?.id]);

    if (!a) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-slate-500">Applicant not found.</p>
                <Button variant="outline" onClick={() => onNavigate(HP_PATH)}>Back to Applications</Button>
            </div>
        );
    }

    /**
     * One line of activity, written the same way wherever the action was taken.
     *
     * Every handler below used to assemble its own event object, which is how three of them
     * ended up logging a bare verb with the thing itself left out.
     */
    const log = (type: string, text: string, detail?: string) => {
        const now = Date.now();
        updateOne(a.id, (prev) => ({
            events: [{ id: `e-${now}`, type, text, detail, at: now, author: ACTOR }, ...prev.events],
        }));
    };

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
            // The remark travels with the entry: a trail that says only "Remark added"
            // makes a reader open another tab to find out what was said.
            events: [{ id: `e-${now}`, type: "remark", text: "Remark added", detail: text, at: now, author: ACTOR }, ...prev.events],
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
            events: [{
                id: `e-${now}`, type: "reissue", text: "Application reissued — data requested again",
                detail: `Status returned to Waiting and progress reset from ${prev.stepsDone}/${prev.stepsTotal} to 0/${prev.stepsTotal}.`,
                at: now, author: ACTOR,
            }, ...prev.events],
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
            log("downloaded", "Application downloaded as PDF",
                `${a.firstName}-${a.lastName}-application.pdf · ${THEMES.find((t) => t.key === docTheme)?.name ?? docTheme} theme`);
        } finally {
            setDownloading(false);
        }
    };

    /*
     * The tabs, in the terms the strip every other record uses reads them.
     *
     * Counts come out of the labels and onto badges: "Uploaded Documents (2)" is a label
     * whose width changes with its data, which is part of why six of these wrapped onto a
     * second line rather than scrolling.
     */
    const TABS: ProfileTab<Tab>[] = [
        { id: "data", label: "Submitted Data", icon: ClipboardList },
        { id: "document", label: "Document View", icon: FileText },
        { id: "uploads", label: "Uploaded Documents", icon: Paperclip, count: a.uploads?.length ?? 0 },
        { id: "consent", label: "Consent Forms", icon: FileSignature, count: consentDefsForType(a.formId).length },
        { id: "events", label: "Activity Log", icon: History, count: a.events.length },
        { id: "remarks", label: "Remarks", icon: MessageSquarePlus, count: a.remarks.length },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/*
                The mark the fold is measured from, above everything that folds.

                Put it below the header instead and the measurement feeds on its own result:
                the strip condenses, the height it gives back lifts the mark by the same
                amount, and that alone is enough travel to hold it condensed — so scrolling
                back to the top leaves the page pinned small with nothing scrolled.
            */}
            <div ref={foldMark} aria-hidden className="h-0" />

            {/*
                Breadcrumb, identity and tabs travel together.

                A hiring file is read by scrolling: fourteen sections of submitted data, nine
                consent forms, a document view the length of a printed application. All of
                them put the back link, the status control and the tab bar off the top of the
                screen, so changing tab or recording a decision meant scrolling back up
                first. They stay now, and give back two thirds of their height on the way
                down — the same fold, on the same curve, as the list this was opened from.
            */}
            <div className="no-print sticky top-0 z-30 bg-white">
                {/* Where you are and the way back, on the bar the asset and driver records
                    already carry. The link asks the navigation trail rather than assuming
                    the list: opened from a chat link or a dashboard alert, "Back to
                    Applications" would be a guess. */}
                <header className="flex h-11 items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 sm:px-6 lg:px-8">
                    <BackLink fallback={HP_PATH} fallbackLabel="Applications" onNavigate={onNavigate} />
                    <span aria-hidden className="h-4 w-px bg-slate-200" />
                    <nav className="flex min-w-0 items-center text-xs font-medium text-slate-500">
                        <button type="button" onClick={() => onNavigate(HP_PATH)} className="shrink-0 text-slate-400 transition-colors hover:text-blue-600">Applications</button>
                        <ChevronRight className="mx-1.5 h-3 w-3 shrink-0 text-slate-300" />
                        <button type="button" onClick={() => onNavigate(HP_PATH)} className="shrink-0 text-slate-400 transition-colors hover:text-blue-600">{formShort(a.formId)}</button>
                        <ChevronRight className="mx-1.5 h-3 w-3 shrink-0 text-slate-300" />
                        <span className="truncate font-semibold text-slate-700">{a.firstName} {a.lastName}</span>
                    </nav>
                </header>

                {/* Who this is, and the two controls that act on them. Folded, the avatar and
                    the name stay: they are how you know you are still on the file you
                    opened. */}
                <div className={cn("border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8", HEADER_TRANSITION,
                    condensed ? "py-2" : "py-5")}>
                    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between", HEADER_TRANSITION,
                        condensed ? "gap-2" : "gap-4")}>
                        <div className={cn("flex min-w-0 items-center", HEADER_TRANSITION, condensed ? "gap-2.5" : "gap-4")}>
                            <div className={cn("flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 font-bold text-white",
                                HEADER_TRANSITION, condensed ? "h-9 w-9 text-xs" : "h-14 w-14 text-lg")}>{initials}</div>
                            <div className="min-w-0">
                                <h1 className={cn("truncate font-semibold text-slate-900", HEADER_TRANSITION,
                                    condensed ? "text-base" : "text-xl")}>{a.firstName} {a.lastName}</h1>
                                <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 overflow-hidden text-sm text-slate-500", HEADER_TRANSITION,
                                    condensed ? "max-h-0 opacity-0" : "mt-1 max-h-14 opacity-100")}>
                                    <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{a.email}</span>
                                    {a.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{a.phone}</span>}
                                    <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{a.carrier}</span>
                                </div>
                                {/* The driver type, not the form id. This chip read "local ·"
                                    — an internal id, and a separator with nothing after it
                                    because that form carries no region. */}
                                <div className={cn("flex flex-wrap items-center gap-2 overflow-hidden text-xs", HEADER_TRANSITION,
                                    condensed ? "max-h-0 opacity-0" : "mt-2 max-h-16 opacity-100")}>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{formShort(a.formId)} driver</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">{a.template}</span>
                                    <span className="text-slate-400">Invited {a.invitedAt} · {a.stepsDone}/{a.stepsTotal} steps</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <StatusSelect
                                value={a.status}
                                subject={`${a.firstName} ${a.lastName}`}
                                onChange={(s, reason) => updateOne(a.id, (prev) => statusPatch(prev, s, reason))}
                            />
                            <Button variant="outline" size="sm" className={cn(HEADER_TRANSITION, condensed && "h-8")} onClick={reissue}>
                                <RotateCcw className="h-4 w-4" /> Reissue
                            </Button>
                        </div>
                    </div>
                </div>

                {/* The product tab strip: one shape, and it scrolls rather than wraps when
                    six tabs do not fit the width. */}
                <ProfileTabs
                    ariaLabel="Application sections"
                    tabs={TABS}
                    activeId={tab}
                    onChange={setTab}
                    className="px-4 sm:px-6 lg:px-8"
                />
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
                {/* Submitted data */}
                {tab === "data" && (
                    hasData ? (
                        <SubmittedDataTab a={a} accent={accent} updateOne={updateOne} condensed={condensed} />
                    ) : (
                        <EmptyData onReissue={reissue} />
                    )
                )}

                {/* Document / PDF view with the applicant's ACTUAL data */}
                {tab === "document" && (
                    hasData ? (
                        <>
                            {/* The same bar every list in the product carries: a white card
                                with a hairline, controls left, actions right. It was a
                                floating pill row on the page background here, which is the
                                one place in the app a control group sits on nothing.
                                The theme picker is the shared segmented switch — four
                                renderings of one document is exactly what it is for. */}
                            <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:inline">Theme</span>
                                    {/* Scrolls rather than overflowing: four labels do not fit
                                        a phone, and a control half off the screen is a
                                        control nobody finds. */}
                                    <ViewSwitch
                                        className="max-w-full overflow-x-auto"
                                        value={docTheme}
                                        onChange={setDocTheme}
                                        options={THEMES.map((t) => ({ id: t.key, label: t.name }))}
                                    />
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button variant="outline" size="sm" onClick={() => { log("printed", "Application sent to print", `${THEMES.find((t) => t.key === docTheme)?.name ?? docTheme} theme`); window.print(); }}><Printer className="h-4 w-4" /> Print</Button>
                                    <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                                </div>
                            </div>
                            <ApplicationDocument ref={docRef} applicant={a} sections={a.submission!} accent={accent} branding={branding} theme={docTheme} />
                        </>
                    ) : (
                        <EmptyData onReissue={reissue} />
                    )
                )}

                {/* Uploaded documents */}
                {tab === "uploads" && <UploadsTab applicant={a} onLog={log} onNavigate={onNavigate} updateOne={updateOne} />}

                {/* Consent forms */}
                {tab === "consent" && <ConsentTab applicant={a} onLog={log} onNavigate={onNavigate} />}

                {/* Event log */}
                {tab === "events" && (
                    /* The product one activity trail, not this page own copy of the idea.
                       Entries carry the reason a status was changed for, which is the line
                       the old list had nowhere to put. */
                    <ActivityTimeline
                        className="mx-auto max-w-2xl"
                        heading="Activity Log"
                        emptyText="No activity yet."
                        entries={a.events.map((e) => {
                            const look = evLook(e.type);
                            const fromDriver = e.author === `${a.firstName} ${a.lastName}`;
                            return {
                                id: e.id,
                                icon: look.Icon,
                                iconTone: look.tone,
                                title: e.text,
                                badge: {
                                    label: fromDriver ? "Driver" : "Office",
                                    tone: ACTIVITY_BADGE_TONE[fromDriver ? "Driver" : "Office"],
                                },
                                by: e.author,
                                detail: e.detail,
                                at: `${relativeTime(e.at)} · ${new Date(e.at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
                            };
                        })}
                    />
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

// ── Submitted Data tab — card view, list view for multi-entry sections, per-section edit ──
type UpdateFn = (id: string, patch: (prev: Applicant) => Partial<Applicant>) => void;

/**
 * One submitted answer: what was asked, above what they put.
 *
 * The label is clamped to two lines and carries its full text as a tooltip — the
 * application asks things like "Will this driver operate in or cross into the United
 * States?", and a question that sets its own height drags its answer out of line with
 * every other answer on the row. The reserved two lines keep the values on one baseline
 * whether the label took one line or two.
 *
 * `anywhere` rather than `break-word` on the value: an email has no spaces to break at, so
 * the browser either overflows the column or splits the address mid-word. The grid below
 * is what actually fixes that — this is the backstop for a value longer than any column.
 */
function Field({ label, value, className }: { label: string; value?: string; className?: string }) {
    /*
     * A question the form asked and the file cannot answer is drawn as a gap, not as an
     * answer. The review lists those questions rather than dropping them — same rule as
     * the Uploaded Documents tab — and at the same weight as a real answer a page full of
     * them reads as a page full of data.
     */
    const missing = !value || !value.trim() || value === "Not provided";
    return (
        <div className={cn("min-w-0", className)}>
            <dt title={label} className="line-clamp-2 min-h-[26px] text-[11px] font-medium leading-tight text-slate-400">{label}</dt>
            <dd className={cn("mt-0.5 text-sm leading-snug [overflow-wrap:anywhere]",
                missing ? "font-medium italic text-slate-400" : "font-semibold text-slate-900")}>
                {value?.trim() || "Not provided"}
            </dd>
        </div>
    );
}

/*
 * Columns that fit their contents rather than a breakpoint.
 *
 * A fixed four-across left about 110px a column on this page, which is narrower than a
 * phone number. auto-fit takes as many 190px columns as the card can hold and shares the
 * remainder between them, so the same rule gives one column on a phone, two on a tablet and
 * three or four on a desk without naming any of those widths.
 */
const FIELD_GRID = "grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-x-6 gap-y-3";

function SubmittedDataTab({ a, accent, updateOne, condensed }: {
    a: Applicant; accent: string; updateOne: UpdateFn;
    /** Whether the page header has already folded — see the scroll margin below. */
    condensed: boolean;
}) {
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState<SubSection | null>(null);
    const [preview, setPreview] = useState<{ title: string; file: string } | null>(null);
    const sectionsRef = useRef<HTMLDivElement>(null);
    const licenseUpload = (idx: number, side: "front" | "back") => (a.uploads ?? []).find((u) => u.id === `lic-${idx}-${side}`);

    const startEdit = (sec: SubSection) => { setEditing(sec.title); setDraft(structuredClone(sec)); };
    const cancelEdit = () => { setEditing(null); setDraft(null); };
    const setField = (gi: number, fi: number, value: string) =>
        setDraft((d) => d ? { ...d, groups: d.groups.map((g, i) => i !== gi ? g : { ...g, fields: g.fields.map((f, j) => j !== fi ? f : { ...f, value }) }) } : d);
    const saveEdit = () => {
        if (!draft) return;
        const now = Date.now();
        updateOne(a.id, (prev) => {
            /*
             * Name the fields, not the section.
             *
             * "edited Employment Details" is true of a typo and of rewriting the dates on a
             * job, and a reviewer reading the trail six weeks later cannot tell which they
             * are looking at. The old and new values are both to hand here, so the entry
             * says what moved and what it moved to.
             */
            const was = (prev.submission ?? []).find((x) => x.title === draft.title);
            const changes: string[] = [];
            draft.groups.forEach((g, gi) => g.fields.forEach((f, fi) => {
                const before = was?.groups[gi]?.fields[fi];
                if (before && before.value !== f.value) {
                    changes.push(`${f.label}: ${before.value || "—"} → ${f.value || "—"}`);
                }
            }));
            return {
                submission: (prev.submission ?? []).map((x) => x.title === draft.title ? draft : x),
                events: [{
                    id: `e-${now}`, type: "edited", text: `${ACTOR} edited “${draft.title}”`,
                    detail: changes.length ? changes.join(" · ") : "Saved with no field values changed",
                    at: now, author: ACTOR,
                }, ...prev.events],
            };
        });
        cancelEdit();
    };

    return (
        <div className="flex gap-6">
            {/* The rail reads the cards out of the DOM, so this list cannot fall out of step
                with what is rendered. */}
            <div ref={sectionsRef} className="min-w-0 flex-1 space-y-4">
            {a.submission!.map((sec) => {
                const isMulti = sec.groups.length > 1;
                /** How many things were ADDED here — employers, schools, accidents. */
                const entryCount = sec.groups.filter((g) => g.label).length;
                const isEditing = editing === sec.title;
                const view = isEditing && draft ? draft : sec;
                return (
                    /*
                     * How far below the top a jumped-to section has to land.
                     *
                     * The sticky header is 142px once folded, so 160 leaves it clear. But
                     * jumping FROM the top folds the header on the way, and the 72px it
                     * gives back pulls everything above the target up with it — the browser
                     * had already computed where to stop, so the section arrived 72px high
                     * and sat behind the very header the margin was meant to clear
                     * (measured: 153px, with the header reaching 206). The margin knows
                     * which of the two is about to happen, because `condensed` is exactly
                     * the state that is about to change.
                     */
                    <div key={sec.title} id={sectionId(sec.title)} data-section={sec.title}
                        className={cn("rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
                            condensed ? "scroll-mt-40" : "scroll-mt-[232px]")}>
                        <header className="mb-4 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>{sec.title}</h2>
                                {/* The count is of ENTRIES, not of groups. Since the gate
                                    question ("Were there any gaps…") became a group of its
                                    own, counting groups counted it: two employers read as 3,
                                    one gap as 2, one school as 2. An entry is a group the
                                    builder named. */}
                                {entryCount > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{entryCount}</span>}
                            </div>
                            {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                    <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={saveEdit}><Check className="h-3.5 w-3.5" /> Save</Button>
                                    <Button variant="ghost" size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={cancelEdit}><X className="h-3.5 w-3.5" /> Cancel</Button>
                                </div>
                            ) : (
                                <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => startEdit(sec)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                            )}
                        </header>

                        {isEditing ? (
                            <div className="space-y-4">
                                {view.groups.map((g, gi) => (
                                    <div key={gi} className={gi > 0 ? "border-t border-slate-100 pt-4" : ""}>
                                        {g.label && <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.label}</p>}
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {g.fields.map((f, fi) => (
                                                <label key={fi} className="block">
                                                    <span className="mb-1 block text-[11px] font-medium text-slate-500">{f.label}</span>
                                                    <input value={f.value} onChange={(e) => setField(gi, fi, e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : sec.title === "License Details" ? (
                            <div className="space-y-4">
                                {sec.groups.map((g, gi) => (
                                    <LicenseReviewCard key={gi} group={g} index={gi} accent={accent}
                                        front={licenseUpload(gi, "front")} back={licenseUpload(gi, "back")}
                                        onView={(title, file) => setPreview({ title, file })} />
                                ))}
                            </div>
                        ) : isMulti ? (
                            /* The form asks a gate question before the repeatable part —
                               "Were there any gaps…", "Were you involved in any accidents…" —
                               and the builder emits it as a group of its own with no heading.
                               It is a question, so it is drawn as one; the things that were
                               ADDED underneath it are a list: one row each, one column per
                               question, so two employers can be read against each other
                               instead of down two separate cards. */
                            <div className="space-y-3">
                                {sec.groups.filter((g) => !g.label).map((g, gi) => (
                                    <dl key={`q${gi}`} className={FIELD_GRID}>
                                        {g.fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
                                    </dl>
                                ))}
                                {entryCount > 0 && <EntryTable groups={sec.groups.filter((g) => g.label)} />}
                            </div>
                        ) : (
                            <dl className={FIELD_GRID}>
                                {sec.groups[0].fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
                            </dl>
                        )}
                    </div>
                );
            })}
            </div>

            {/* The product's section rail: the same one the ticket and accident records
                carry, which also highlights the section you are reading and gives a phone a
                "Sections" pill — the hand-rolled list here was hidden below lg, so on a
                phone there was no way to reach section twelve but to scroll through eleven. */}
            <SectionNav containerRef={sectionsRef} className="no-print" />

            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreview(null)}>
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <p className="text-sm font-bold text-slate-900">{preview.title}</p>
                            <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <ImageIcon className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">{preview.file}</p>
                                <p className="text-xs text-slate-400">Image preview unavailable in this prototype.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// A license shown like the hiring License Review — read-only field grid + uploaded front/back document tiles.
function LicenseReviewCard({ group, index, accent, front, back, onView }: {
    group: SubGroup; index: number; accent: string;
    front?: { label: string; file: string }; back?: { label: string; file: string };
    onView: (title: string, file: string) => void;
}) {
    const numberField = group.fields.find((f) => /number/i.test(f.label));
    const classField = group.fields.find((f) => /class/i.test(f.label));
    // Show the real document tiles instead of the "License Images" text summary.
    const fields = group.fields.filter((f) => !/license images/i.test(f.label));
    const DocTile = ({ title, file }: { title: string; file?: string }) => (
        <div>
            <p className="mb-1.5 text-[11px] font-semibold text-slate-500">{title}</p>
            {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm"><FileText className="h-4.5 w-4.5" /></div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{file}</p>
                        <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Uploaded</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => onView(title, file)}><Eye className="h-3.5 w-3.5" /> View</Button>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                    <FileText className="h-4 w-4" /> Not uploaded
                </div>
            )}
        </div>
    );
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: accent }}>{index + 1}</span>
                    <p className="truncate text-sm font-bold text-slate-900">License {index + 1}{numberField?.value ? ` · ${numberField.value}` : ""}</p>
                </div>
                {classField?.value && <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{classField.value}</span>}
            </div>
            {/* The same field as every other section. These were grey bordered boxes,
                which on a read-only page reads as a form somebody has disabled rather than
                an answer somebody gave. */}
            <dl className={FIELD_GRID}>
                {fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
            </dl>
            <div className="mt-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Uploaded Documents</p>
                <div className="grid gap-3 sm:grid-cols-2">
                    <DocTile title="Front of License" file={front?.file} />
                    <DocTile title="Back of License" file={back?.file} />
                </div>
            </div>
        </div>
    );
}

/*
 * What was added to a repeatable section — the employers, the schools, the accidents — as
 * a list: one row per entry, one column per question.
 *
 * A card each was fine while a section held one thing. It stops being fine at two: three
 * employers answering the same seventeen questions became three stacked grids, and the
 * only way to compare what one said about FMCSRs with what the next said was to scroll
 * between them and remember. Side by side, the answer is read down a column.
 *
 * The columns are the questions, in the order the first entry asked them, and any question
 * a later entry does not carry (the three-year question belongs to a current address, not a
 * previous one) shows an em dash: not asked here, which is a different thing from asked and
 * unanswered.
 *
 * It scrolls sideways rather than squeezing. Seventeen columns do not fit a laptop and
 * pretending otherwise is how a table ends up with a 40px column of broken words.
 */
function EntryTable({ groups }: { groups: SubGroup[] }) {
    const cols: string[] = [];
    for (const g of groups) for (const f of g.fields) if (!cols.includes(f.label)) cols.push(f.label);

    /*
     * Few questions per entry (a school, an accident, a violation): a sideways-scrolling
     * table with truncated cells hid the very answer being reviewed. Each entry is its own
     * small card instead — full values, wrapped — and only the questions that entry carries.
     * The wide table below is kept for the long sections (employers) where reading down a
     * column is the point.
     */
    if (cols.length <= 8) {
        return (
            <div className="space-y-3">
                {groups.map((g, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">{g.label || "Entry"}</span>
                            {groups.length > 1 && <span className="text-[11px] font-semibold text-slate-400">{i + 1} of {groups.length}</span>}
                        </div>
                        <dl className={FIELD_GRID}>
                            {g.fields.map((f) => <Field key={f.label} label={f.label} value={f.value} />)}
                        </dl>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" style={{ minWidth: Math.min(2400, 150 + cols.length * 170) }}>
                <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="w-36 px-4 py-2.5">Entry</th>
                        {cols.map((c) => (
                            <th key={c} className="px-4 py-2.5 align-bottom" title={c}>
                                <span className="line-clamp-2 leading-tight">{c}</span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {groups.map((g, i) => (
                        <tr key={i} className="transition-colors hover:bg-slate-50/70">
                            <td className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.label || `Entry ${i + 1}`}</td>
                            {cols.map((c) => {
                                const f = g.fields.find((x) => x.label === c);
                                if (!f) {
                                    return <td key={c} className="px-4 py-2.5 text-slate-300" title="Not asked for this entry">&mdash;</td>;
                                }
                                const missing = !f.value || !f.value.trim() || f.value === "Not provided";
                                return (
                                    <td key={c} className={cn("px-4 py-2.5", missing ? "italic text-slate-400" : "font-medium text-slate-800")} title={f.value}>
                                        <span className="block max-w-[220px] truncate">{f.value?.trim() || "Not provided"}</span>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Files the applicant uploaded with their submission (license front/back, etc.).
function UploadsTab({ applicant, onLog, onNavigate, updateOne }: {
    applicant: Applicant;
    /** Opening somebody's licence scan is an action on their file, so it is recorded. */
    onLog: (type: string, text: string, detail?: string) => void;
    onNavigate: (path: string) => void;
    updateOne: UpdateFn;
}) {
    const [preview, setPreview] = useState<{ label: string; file: string } | null>(null);
    const [sharing, setSharing] = useState<UploadedFile | null>(null);
    /*
     * One file input for the whole table, pointed at whichever row asked for it.
     *
     * An input per row is an input per row the browser keeps alive, and the picker has to
     * be opened by a click the user made — so the row records itself here and the menu
     * item clicks the input.
     */
    const fileRef = useRef<HTMLInputElement>(null);
    const target = useRef<UploadedFile | null>(null);

    const pick = (u: UploadedFile) => { target.current = u; fileRef.current?.click(); };

    const attach = (file: File) => {
        const u = target.current;
        target.current = null;
        if (!u) return;
        const replacing = !u.missing;
        updateOne(applicant.id, (prev) => ({
            uploads: (prev.uploads ?? []).map((x) => x.id === u.id ? { ...x, file: file.name, missing: false } : x),
        }));
        onLog("uploaded",
            replacing ? `Replaced “${u.label}”` : `Uploaded “${u.label}”`,
            `${file.name} · ${u.category}`);
    };
    const ups = applicant.uploads ?? [];
    if (!ups.length) {
        return <div className="mx-auto max-w-2xl rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center text-sm text-slate-500">No documents were uploaded with this application.</div>;
    }
    const fileExt = (f: string) => (f.split(".").pop() || "").toUpperCase();
    return (
        <div className="mx-auto max-w-4xl">
            <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) attach(f);
                    // Cleared so picking the same file twice still fires a change.
                    e.target.value = "";
                }}
            />
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                    <Paperclip className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Uploaded Documents</h3>
                    {/* Supplied out of asked for — "4" alone cannot tell a reviewer whether
                        four is all of them or four of nine. */}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{ups.filter((u) => !u.missing).length} / {ups.length}</span>
                    {ups.some((u) => u.missing) && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            {ups.filter((u) => u.missing).length} not supplied
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto">
                    {/* Same rule as the consent table: a long file name would otherwise
                        widen its column until the row menu left the card. */}
                    <table className="w-full min-w-[720px] table-fixed text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="w-14 px-5 py-2.5">#</th>
                                <th className="px-5 py-2.5">Document</th>
                                <th className="w-[26%] px-5 py-2.5">File name</th>
                                <th className="w-20 px-5 py-2.5">Type</th>
                                <th className="w-28 px-5 py-2.5">Category</th>
                                <th className="w-32 px-5 py-2.5">Status</th>
                                <th className="w-20 px-5 py-2.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {ups.map((u, i) => (
                                <tr key={u.id} className="transition-colors hover:bg-slate-50/70">
                                    <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${u.missing ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"}`}><ImageIcon className="h-4 w-4" /></div>
                                            <span className={cn("truncate", u.missing ? "font-semibold text-slate-500" : "font-semibold text-slate-800")} title={u.label}>{u.label}</span>
                                        </div>
                                    </td>
                                    <td className="truncate px-5 py-3 font-mono text-xs text-slate-500" title={u.file}>{u.file}</td>
                                    <td className="px-5 py-3 text-slate-500">{fileExt(u.file)}</td>
                                    <td className="px-5 py-3">
                                        <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{u.category}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        {u.missing ? (
                                            <button type="button" onClick={() => pick(u)}
                                                title={`Upload ${u.label}`}
                                                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100">
                                                <Upload className="h-3 w-3" /> Not supplied
                                            </button>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"><Check className="h-3 w-3" /> Uploaded</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 text-right">
                                        {/* The product's row menu, not a lone button. Open is
                                            absent rather than greyed out on a document that
                                            never arrived — there is nothing to open — but the
                                            row still shares, because a missing licence scan is
                                            exactly the thing somebody needs to be told about. */}
                                        <div className="flex justify-end">
                                            <KebabMenu
                                                title={`Actions for ${u.label}`}
                                                items={[
                                                    ...(u.missing ? [] : [{
                                                        label: "View document", icon: Eye,
                                                        onClick: () => {
                                                            setPreview({ label: u.label, file: u.file });
                                                            onLog("document", `Opened “${u.label}”`, `${u.file} · ${u.category}`);
                                                        },
                                                    }]),
                                                    // A document that arrived after the application was
                                                    // submitted — emailed in, handed over at the office —
                                                    // is filed from the row that says it is missing.
                                                    { label: u.missing ? "Upload document" : "Replace document", icon: Upload, onClick: () => pick(u) },
                                                    { label: "Share to chat", icon: Share2, onClick: () => setSharing(u) },
                                                ]}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {preview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setPreview(null)}>
                    <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                            <p className="text-sm font-bold text-slate-900">{preview.label}</p>
                            <button type="button" onClick={() => setPreview(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="p-5">
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <ImageIcon className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">{preview.file}</p>
                                <p className="text-xs text-slate-400">Image preview unavailable in this prototype.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* One document, shared from its own row. A document that never arrived goes with
                nothing attached and says so — which is the message worth sending. */}
            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={sharing.missing ? `Request “${sharing.label}”` : `Share “${sharing.label}”`}
                    subtitle={sharing.missing
                        ? `${applicant.firstName} ${applicant.lastName} has not supplied this document`
                        : `From ${applicant.firstName} ${applicant.lastName}'s application`}
                    source={{ type: "manual", id: `${applicant.id}-${sharing.id}`, label: sharing.label }}
                    items={sharing.missing ? [] : [{ name: sharing.file, group: sharing.category }]}
                    record={{
                        type: "applicant",
                        id: applicant.id,
                        label: `${applicant.firstName} ${applicant.lastName}`,
                        sublabel: `${sharing.label} · ${sharing.category}`,
                        path: HP_PATH,
                    }}
                    defaultChannel="in-app"
                    defaultSubject={sharing.missing
                        ? `Missing document — ${sharing.label}`
                        : `${sharing.label} — ${applicant.firstName} ${applicant.lastName}`}
                    defaultMessage={sharing.missing
                        ? `${sharing.label} was asked for on the application and has not been supplied. Could you send it through?`
                        : ""}
                    currentUserName={currentUserName()}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                    onSent={() => {
                        onLog("shared", sharing.missing ? `Requested “${sharing.label}”` : `Shared “${sharing.label}”`,
                            sharing.missing ? "Not supplied — asked for in a chat" : `${sharing.file} · ${sharing.category}`);
                        setSharing(null);
                    }}
                />
            )}
        </div>
    );
}

/*
 * The applicant's consent forms.
 *
 * Nine stacked cards with a "View" dropdown on each, one tab away from the documents table
 * — two lists of paper on the same applicant, drawn as two different things. They are one
 * table in one card now, with the row menu every other list in the product carries, so a
 * reviewer moving between the tabs is reading the same shape twice.
 *
 * The form still opens where it sits: a consent is read in the context of the list it
 * belongs to, not in a dialog that hides the other eight.
 */
function ConsentTab({ applicant, onLog, onNavigate }: {
    applicant: Applicant;
    onLog: (type: string, text: string, detail?: string) => void;
    onNavigate: (path: string) => void;
}) {
    const [branding] = useCompanyBranding();
    const [openId, setOpenId] = useState<string | null>(null);
    const [sharing, setSharing] = useState<{ id: string; title: string } | null>(null);
    const defs = consentDefsForType(applicant.formId);
    const pf = buildPrefill(applicant);
    const signed = applicant.status === "submitted" || applicant.status === "under-review" || applicant.status === "approved";
    const values: Record<string, string> = {
        company: branding.name,
        applicant: pf.fullName, printName: pf.fullName, driverName: pf.fullName,
        ssn: pf.ssn, licenseNumber: pf.licenses[0]?.number ?? "", state: pf.licenses[0]?.authority ?? "",
        date: applicant.invitedAt,
    };
    const sigsFor = (def: (typeof defs)[number]) =>
        Object.fromEntries(def.signers.filter((s) => s.kind === "sign").map((s) => [s.key, ""]));

    const toggle = (def: (typeof defs)[number]) => {
        const opening = openId !== def.id;
        setOpenId(opening ? def.id : null);
        if (opening) onLog("document", `Opened “${def.title} ${def.accentTitle}”`.trim(), signed ? "Signed consent" : "Awaiting signature");
    };

    return (
        <div className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* The documents tab's header, to the letter: what this is, how many are
                    done out of how many, and the one thing that is outstanding. */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
                    <FileSignature className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-800">Consent &amp; Authorizations</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{signed ? defs.length : 0} / {defs.length}</span>
                    {!signed && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">Awaiting signature</span>
                    )}
                    {/* The driver type, not the form id — this line read "local · 9 forms". */}
                    <span className="ml-auto text-[12px] text-slate-500">{formShort(applicant.formId)} driver</span>
                </div>

                <div className="overflow-x-auto">
                    {/*
                        Fixed layout, because the widest cell was deciding the table.

                        These blurbs are a sentence of statute each — "FMCSA Pre-Employment
                        Screening Program (PSP) disclosure + authorization to obtain crash &
                        inspection history…" — and `truncate` cannot shorten a cell that the
                        browser is free to widen to fit it. Auto layout did exactly that: the
                        Form column grew to its longest blurb, pushed Status and Action off
                        the right-hand edge of the card, and left the reader a horizontal
                        scrollbar to find the one control on the row. Declared widths for the
                        three columns that have a known size and the remainder to Form, so
                        truncation has something to truncate against.
                    */}
                    <table className="w-full min-w-[520px] table-fixed text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                <th className="w-14 px-5 py-2.5">#</th>
                                <th className="px-5 py-2.5">Form</th>
                                <th className="w-32 px-5 py-2.5">Status</th>
                                <th className="w-20 px-5 py-2.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {defs.flatMap((def, i) => {
                                const isOpen = openId === def.id;
                                const hex = THEME_HEX[def.theme];
                                const full = `${def.title} ${def.accentTitle}`.trim();
                                const rows = [
                                    <tr key={def.id} className="transition-colors hover:bg-slate-50/70">
                                        <td className="px-5 py-3">
                                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold",
                                                signed ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500")}>
                                                {signed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            {/* One line each, with the whole thing on the title:
                                                the blurbs are two sentences of statute and were
                                                being cut mid-word either way. */}
                                            <p className="truncate font-semibold text-slate-800" title={full}>
                                                {def.title} <span style={{ color: hex }}>{def.accentTitle}</span>
                                            </p>
                                            <p className="truncate text-xs text-slate-400" title={def.blurb}>{def.blurb}</p>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold",
                                                signed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700")}>
                                                {signed && <Check className="h-3 w-3" />} {signed ? "Signed" : "Pending"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end">
                                                <KebabMenu
                                                    title={`Actions for ${full}`}
                                                    items={[
                                                        { label: isOpen ? "Hide form" : "View form", icon: Eye, onClick: () => toggle(def) },
                                                        { label: "Share to chat", icon: Share2, onClick: () => setSharing({ id: def.id, title: full }) },
                                                    ]}
                                                />
                                            </div>
                                        </td>
                                    </tr>,
                                ];
                                if (isOpen) {
                                    rows.push(
                                        <tr key={`${def.id}-doc`}>
                                            <td colSpan={4} className="bg-slate-50/60 p-0">
                                                <div className="px-5 py-5">
                                                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
                                                        <PolicyDocument def={def} values={values} sigs={sigsFor(def)} branding={branding} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>,
                                    );
                                }
                                return rows;
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share “${sharing.title}”`}
                    subtitle={`${applicant.firstName} ${applicant.lastName} · ${signed ? "signed" : "awaiting signature"}`}
                    source={{ type: "manual", id: `${applicant.id}-${sharing.id}`, label: sharing.title }}
                    items={[]}
                    record={{
                        type: "applicant",
                        id: applicant.id,
                        label: `${applicant.firstName} ${applicant.lastName}`,
                        sublabel: sharing.title,
                        path: HP_PATH,
                    }}
                    defaultChannel="in-app"
                    defaultSubject={`${sharing.title} — ${applicant.firstName} ${applicant.lastName}`}
                    currentUserName={currentUserName()}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                    onSent={() => {
                        onLog("shared", `Shared “${sharing.title}”`, signed ? "Signed consent" : "Awaiting signature");
                        setSharing(null);
                    }}
                />
            )}
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
    /*
     * The heading names the driver type, and the badge never comes out empty.
     *
     * It read "local Driver Application" — the raw form id, printed at 24px on a document
     * that gets emailed and filed — and the region badge beside it rendered as a bare
     * coloured dash, because that form carries no region at all. Both come from the same
     * three driver types the rest of the file now uses, with the form's own region
     * preferred when it has one ("United States" reads better on a printed page than "US").
     */
    const region = formRegion(applicant.formId) || formShort(applicant.formId);
    const title = `${formShort(applicant.formId)} Driver Application`;
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
                        {region && <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase">{region}</span>}
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
                    {region && <span className={cn("rounded px-2 py-0.5 text-[10px] font-semibold uppercase", bw ? "border border-black text-black" : "text-white")} style={bw ? undefined : { backgroundColor: accent }}>{region}</span>}
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
