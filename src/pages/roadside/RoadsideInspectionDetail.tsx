// ─────────────────────────────────────────────────────────────────────────────
// One roadside inspection.
//
// Opened for two reasons, and it has to serve both without asking which:
//
//   1. "What happened?"  — months later, by somebody reading an audit request.
//   2. "What's missing?" — this week, by the person who has to chase it.
//
// Tabs, because those two readers want different halves of it and one long
// scroll makes each of them wade through the other's. What stays ABOVE the tabs
// is the band saying what to do next: that is the answer to (2), and a reader
// who has to find the right tab before they learn the truck is still out of
// service has been made to work for it.
//
// Documents are editable in place, on their own tab. Uploading the remediation
// report should not mean opening an edit form and saving a whole record: the
// person doing it is holding a photo of a signed sheet, and the record they are
// adding to is not otherwise theirs to change.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import {
    CalendarClock, ClipboardCheck, FileText, LayoutGrid, MapPin, Pencil, Receipt,
    Share2, ShieldAlert, ShieldCheck, StickyNote, Timer, Trash2, Truck, Upload, User, Wrench, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/ui/BackLink";
import { PAGE_PAD } from "@/components/ui/ListPageHeader";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ActivityTimeline, type ActivityEntry } from "@/components/ui/ActivityTimeline";
import { ShareToChat, type ShareItem } from "@/components/share/ShareToChat";
import { setMessagesFocus } from "@/pages/messages/messages-store";
import { currentUserName } from "@/data/users.data";
import { DocTypesList, DocTypeDetail, SHELF_META, sampleDoc, shelfWanted, type Shelf } from "./RoadsideDocRecords";
import { ViolationList, type ViolationRow } from "./RoadsideViolations";
import {
    PARTY_LABEL, REMEDIATION_BY_LABEL, STAGE_LABEL, STAGE_TONE, allViolations, durationLabel,
    deleteInspection, hasVehicleViolation, inspectionStage, isMaintenanceRelated, saveInspection,
    unitsLabel, useInspection,
    type RoadsideInspection,
} from "./roadside.data";

const HOME = "/roadside-inspections";

type TabId = "overview" | "violations" | "documents" | "activity";

/**
 * One labelled fact.
 *
 * A cell in a block rather than a card of its own. Ten bordered cards of two
 * lines each is ten boxes to scan for the one you want, and the whitespace
 * between them is doing no work — these facts belong to one inspection and
 * read as one thing.
 */
function Fact({ icon: Icon, label, value, tone, wide }: {
    icon: React.ElementType; label: string; value: React.ReactNode; tone?: string; wide?: boolean;
}) {
    return (
        <div className={cn("min-w-0 px-4 py-3", wide && "sm:col-span-2")}>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Icon size={11} /> {label}
            </p>
            <p className={cn("mt-0.5 truncate text-[14px] font-semibold text-slate-800", tone)} title={typeof value === "string" ? value : undefined}>
                {value}
            </p>
        </div>
    );
}

/**
 * What to do next, in a sentence.
 *
 * The derived stage as instruction rather than as a badge, and it sits above the
 * tabs because it is true on all four of them.
 */
function NextStep({ i, onGoDocuments }: { i: RoadsideInspection; onGoDocuments: () => void }) {
    const stage = inspectionStage(i);
    if (stage === "clean") {
        return (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-[13px] leading-relaxed text-emerald-900">
                    <span className="font-bold">Clean inspection.</span> Nothing was found, and nothing is outstanding.
                </p>
            </div>
        );
    }
    if (stage === "closed") {
        return (
            <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-500" />
                <p className="text-[13px] leading-relaxed text-slate-700">
                    <span className="font-bold">Closed.</span>{" "}
                    {hasVehicleViolation(i)
                        ? "The defect was re-inspected and the paperwork is on file."
                        : "Nothing was found against the equipment, so there was nothing to re-inspect."}
                </p>
            </div>
        );
    }
    const awaitingReport = stage === "awaiting-report";
    return (
        <div className={cn("flex flex-wrap items-start gap-2.5 rounded-xl border px-4 py-3",
            awaitingReport ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50")}>
            {awaitingReport
                ? <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />
                : <Wrench size={16} className="mt-0.5 shrink-0 text-amber-600" />}
            <p className={cn("min-w-[220px] flex-1 text-[13px] leading-relaxed", awaitingReport ? "text-rose-900" : "text-amber-900")}>
                {awaitingReport ? (
                    <>
                        <span className="font-bold">Waiting on a remediation inspection.</span>{" "}
                        {i.oos ? "The unit was placed out of service. " : ""}
                        Once the defect is fixed, upload the re-inspection report and say whether a
                        mechanic or the driver performed it. The driver can upload it from the mobile app.
                    </>
                ) : (
                    <>
                        <span className="font-bold">Waiting on the repair bill.</span>{" "}
                        The re-inspection is on file, but this was a maintenance violation &mdash; attach the
                        invoice and mark which unit, or units, it was spent on.
                    </>
                )}
            </p>
            {/* The instruction carries the way to act on it. */}
            <button type="button" onClick={onGoDocuments}
                className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12px] font-bold text-white transition-colors",
                    awaitingReport ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-600 hover:bg-amber-700")}>
                <Upload size={13} /> {awaitingReport ? "Upload the report" : "Attach the bill"}
            </button>
        </div>
    );
}

/**
 * What has happened to this record, in order.
 *
 * Built from the record itself rather than from an event log: every entry here
 * is something that left a trace — it was recorded, a document arrived. A
 * separate log would be a second thing to keep true.
 *
 * Drawn by `ActivityTimeline`, the same component the accident, ticket and
 * safety-event pages use. A hand-rolled rail here would be a fourth timeline
 * with its own spacing, its own icon size and its own idea of where the date
 * goes, and a reader moving between those pages would feel every difference.
 */
function activityOf(i: RoadsideInspection): ActivityEntry[] {
    const when = (iso: string): string => {
        const d = new Date(iso);
        return Number.isNaN(d.getTime())
            ? ""
            : d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };

    const out: (ActivityEntry & { sort: string })[] = [{
        id: "recorded", sort: i.createdAt, icon: ClipboardCheck, iconTone: "bg-blue-500",
        title: "Inspection recorded",
        badge: { label: "Office", tone: "bg-blue-50 text-blue-700" },
        detail: `${i.level} at ${i.location || "an unrecorded location"}`,
        by: i.createdBy, at: when(i.createdAt),
    }];

    if (i.oos) {
        out.push({
            id: "oos", sort: i.createdAt, icon: ShieldAlert, iconTone: "bg-rose-500",
            title: "Placed out of service",
            badge: { label: "Enforcement", tone: "bg-rose-50 text-rose-700" },
            detail: unitsLabel(i), at: when(i.createdAt),
        } as ActivityEntry & { sort: string });
    }

    if (i.citationIssued) {
        out.push({
            id: "citation", sort: i.createdAt, icon: ShieldAlert, iconTone: "bg-rose-400",
            title: "Citation issued",
            detail: i.citationNumber || "Number not recorded", at: when(i.createdAt),
        } as ActivityEntry & { sort: string });
    }

    for (const d of i.reports) {
        out.push({
            id: `rep-${d.id}`, sort: d.uploadedAt, icon: FileText, iconTone: "bg-slate-500",
            title: "Inspection report filed", detail: d.name, by: d.uploadedBy, at: when(d.uploadedAt),
        } as ActivityEntry & { sort: string });
    }

    for (const d of i.remediation) {
        out.push({
            id: `rem-${d.id}`, sort: d.uploadedAt, icon: ShieldCheck, iconTone: "bg-emerald-500",
            title: "Remediation inspection filed",
            // Which of the two it was, said every time: it is the question an
            // auditor asks of this document and nothing else on the record answers it.
            badge: d.source === "driver-app"
                ? { label: "Driver app", tone: "bg-blue-50 text-blue-700" }
                : { label: "Office", tone: "bg-slate-100 text-slate-600" },
            detail: [
                d.performedBy ? `${REMEDIATION_BY_LABEL[d.performedBy]} performed it` : "Performer not stated",
                d.performedOn ? `on ${d.performedOn}` : null,
                d.name,
            ].filter(Boolean).join(" · "),
            by: d.uploadedBy, at: when(d.uploadedAt),
        } as ActivityEntry & { sort: string });
    }

    for (const d of i.repairBills) {
        out.push({
            id: `bill-${d.id}`, sort: d.uploadedAt, icon: Receipt, iconTone: "bg-amber-500",
            title: "Repair bill filed",
            detail: [
                d.amount ? `$${d.amount}` : null,
                d.assetIds?.length ? `${d.assetIds.length} unit${d.assetIds.length === 1 ? "" : "s"}` : "no unit assigned",
                d.name,
            ].filter(Boolean).join(" · "),
            by: d.uploadedBy, at: when(d.uploadedAt),
        } as ActivityEntry & { sort: string });
    }

    if (inspectionStage(i) === "closed" && hasVehicleViolation(i)) {
        const last = [...i.remediation, ...i.repairBills].map((d) => d.uploadedAt).sort().pop() ?? i.createdAt;
        out.push({
            id: "closed", sort: last, icon: ShieldCheck, iconTone: "bg-slate-400",
            title: "Closed",
            detail: "The defect was re-inspected and the paperwork is on file.",
            at: when(last),
        } as ActivityEntry & { sort: string });
    }

    // Newest last, so the trail reads downwards the way it happened.
    return out.sort((a, b) => (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0))
        .map(({ sort: _sort, ...e }) => e);
}

export function RoadsideInspectionDetail({ inspectionId, currentUserName: who, onNavigate }: {
    inspectionId: string;
    currentUserName?: string;
    onNavigate: (path: string) => void;
}) {
    // Live: a driver-app upload lands on this page without a reload.
    const i = useInspection(inspectionId);
    const [tab, setTab] = useState<TabId>("overview");
    /**
     * What is being shared.
     *
     * One dialog, three callers: the whole inspection, one document, one
     * violation. They differ only in what goes in the subject and the attachment
     * list, so a second dialog would be the same dialog with a different bug.
     */
    const [sharing, setSharing] = useState<null | { subject: string; items: ShareItem[]; sublabel: string }>(null);
    /**
     * Which kind of document is open, if any.
     *
     * The tab is the three kinds; clicking one opens its own records page, the
     * same two steps Compliance & Documents has. Null is the list.
     */
    const [openShelf, setOpenShelf] = useState<Shelf | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);

    if (!i) {
        return (
            <div className="flex h-full flex-col bg-slate-50">
                <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                    <BackLink fallback={HOME} onNavigate={onNavigate} />
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <ClipboardCheck size={30} className="text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">That inspection is no longer here</p>
                    <p className="max-w-xs text-xs text-slate-400">It may have been removed. The list has the rest.</p>
                    <button onClick={() => onNavigate(HOME)}
                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">
                        Back to the list
                    </button>
                </div>
            </div>
        );
    }

    const stage = inspectionStage(i);
    const vios = allViolations(i);
    const docCount = i.reports.length + i.remediation.length + i.repairBills.length;
    // How many shelves are expected and still empty — the denominator that makes
    // "1 document" mean something.
    const missingDocs = [
        i.reports.length === 0,
        (hasVehicleViolation(i) || i.oos) && i.remediation.length === 0,
        isMaintenanceRelated(i) && i.repairBills.length === 0,
    ].filter(Boolean).length;
    const partiesWithFindings = [i.truck, i.trailer, i.driver].filter((p) => p.hasViolation && p.violations.length).length;

    const tabs: SubTab<TabId>[] = [
        { id: "overview", label: "Overview", icon: LayoutGrid },
        { id: "violations", label: "Violations", icon: ShieldAlert, count: vios.length },
        { id: "documents", label: "Documents", icon: FileText, count: docCount },
        { id: "activity", label: "Activity", icon: History },
    ];

    const shareItems: ShareItem[] = [
        ...i.reports.map((d) => ({ name: d.name, group: "Inspection report" })),
        ...i.remediation.map((d) => ({ name: d.name, group: "Remediation report" })),
        ...i.repairBills.map((d) => ({ name: d.name, group: "Repair bill" })),
    ];

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* Header — identity and actions, then the tabs. Both stay put. */}
            <div className="shrink-0 border-b border-slate-200 bg-white">
                <div className="px-4 pt-3 sm:px-6">
                    <BackLink fallback={HOME} onNavigate={onNavigate} />
                    <div className="mt-2 flex flex-wrap items-start justify-between gap-3 pb-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ClipboardCheck size={20} />
                            </span>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">Roadside inspection</h1>
                                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", STAGE_TONE[stage])}>
                                        {STAGE_LABEL[stage]}
                                    </span>
                                    {i.oos && (
                                        <span className="rounded-full border border-rose-300 bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                                            Out of service
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 truncate text-[13px] text-slate-500">
                                    {i.date} &middot; {i.level} &middot; <span className="font-mono text-[12px]">{i.id}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button onClick={() => setSharing({
                                subject: `Roadside inspection ${i.date} — ${unitsLabel(i)}`,
                                items: shareItems,
                                sublabel: [unitsLabel(i), i.driver.label, STAGE_LABEL[stage]].filter(Boolean).join(" · "),
                            })}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                                <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
                            </button>
                            <button onClick={() => onNavigate(`${HOME}/${i.id}/edit`)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                                <Pencil size={14} /> <span className="hidden sm:inline">Edit</span>
                            </button>
                            <KebabMenu
                                title="Inspection actions"
                                items={[
                                    { label: "Upload a document", icon: Upload, onClick: () => setTab("documents") },
                                    { label: "Remove inspection", icon: Trash2, danger: true, onClick: () => setConfirmDelete(true) },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                <div className="px-4 sm:px-6">
                    <SubTabs tabs={tabs} activeId={tab} onChange={setTab} showZeroCounts ariaLabel="Inspection sections" />
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn("space-y-5 py-5 sm:py-6", PAGE_PAD,
                    // Only the overview wants a measure; a table wants the screen.
                    tab === "overview" && "mx-auto w-full max-w-5xl")}>

                    {/* True on every tab, so it sits above them all. */}
                    <NextStep i={i} onGoDocuments={() => {
                            setTab("documents");
                            // Straight into the kind that is actually owed.
                            setOpenShelf(inspectionStage(i) === "awaiting-repair" ? "repairBills" : "remediation");
                        }} />

                    {tab === "overview" && (
                        <>
{/* One block. Every fact on this inspection, in the order somebody
                                reads them off the report. */}
                            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                <p className="border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    The inspection
                                </p>
                                <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4
                                    [&>div]:border-b [&>div]:border-slate-100 sm:[&>div]:border-r sm:[&>div:nth-child(2n)]:border-r-0
                                    lg:[&>div:nth-child(2n)]:border-r lg:[&>div:nth-child(4n)]:border-r-0">
                                    <Fact icon={CalendarClock} label="Inspection date" value={i.date} />
                                    <Fact icon={Timer} label="Time" value={durationLabel(i)} />
                                    <Fact icon={ClipboardCheck} label="Result" value={i.result}
                                        tone={i.result === "Pass" ? "text-emerald-700" : "text-rose-700"} />
                                    <Fact icon={ShieldAlert} label="Citation"
                                        value={i.citationIssued ? (i.citationNumber || "Issued") : "None issued"}
                                        tone={i.citationIssued ? "text-rose-700" : undefined} />
                                    <Fact icon={ClipboardCheck} label="Level" value={i.level} />
                                    <Fact icon={MapPin} label="Location" value={i.location || "—"} />
                                    <Fact icon={Truck} label="Units" value={unitsLabel(i)} />
                                    <Fact icon={User} label="Driver" value={i.driver.label ?? "—"} />
                                    <Fact icon={ShieldAlert} label="Violations found"
                                        tone={vios.length ? "text-rose-700" : undefined}
                                        value={vios.length === 0
                                            ? "None"
                                            : `${vios.length} across ${partiesWithFindings} part${partiesWithFindings === 1 ? "y" : "ies"}`} />
                                    <Fact icon={Wrench} label="Maintenance related"
                                        value={isMaintenanceRelated(i) ? "Yes — repair bill expected" : "No"} />
                                    <Fact icon={FileText} label="Documents on file"
                                        value={`${docCount} of ${docCount + missingDocs}`} />
                                    <Fact icon={ShieldCheck} label="Recorded by" value={i.createdBy} />
                                </div>
                            </section>

                            {i.notes?.trim() && (
                                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                    <p className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        <StickyNote size={12} /> Notes
                                    </p>
                                    <p className="whitespace-pre-line px-4 py-3 text-[13px] leading-relaxed text-slate-700">{i.notes}</p>
                                </section>
                            )}
                        </>
                    )}

                    {tab === "violations" && (
                        <ViolationList
                            inspection={i}
                            onAdd={() => onNavigate(`${HOME}/${i.id}/edit`)}
                            onShare={(row: ViolationRow) => setSharing({
                                subject: `${row.v.code ? `[${row.v.code}] ` : ""}${row.v.subtype || row.v.label}`,
                                items: shareItems,
                                sublabel: `${PARTY_LABEL[row.kind]} ${row.unit} · roadside inspection ${i.date}`,
                            })}
                            onRemove={(row: ViolationRow) => {
                                const party = i[row.kind];
                                const violations = party.violations.filter((_, k) => k !== row.index);
                                saveInspection({ ...i, [row.kind]: { ...party, violations, hasViolation: violations.length > 0 } });
                            }}
                        />
                    )}

                    {tab === "documents" && (
                        openShelf
                            ? (
                                <DocTypeDetail
                                    inspection={i}
                                    shelf={openShelf}
                                    uploadedBy={who || "Safety Manager"}
                                    onBack={() => setOpenShelf(null)}
                                    onChange={(next) => saveInspection(next)}
                                    onShare={(doc, kind) => setSharing({
                                        subject: `${kind} — ${doc.name}`,
                                        items: [{ name: doc.name, group: kind }],
                                        sublabel: `Roadside inspection ${i.date} · ${unitsLabel(i)}`,
                                    })}
                                />
                            )
                            : (
                                <DocTypesList
                                    inspection={i}
                                    onOpen={setOpenShelf}
                                    onSample={() => {
                                        // One demo document under every kind this inspection
                                        // actually wants, so the screen can be read before
                                        // anybody has filed anything real.
                                        let next = i;
                                        for (const { key } of SHELF_META) {
                                            if (!shelfWanted(i, key) || next[key].length > 0) continue;
                                            next = { ...next, [key]: [...next[key], sampleDoc(next, key, who || "Safety Manager")] };
                                        }
                                        saveInspection(next);
                                    }}
                                />
                            )
                    )}

                    {tab === "activity" && (
                        <ActivityTimeline heading="Activity" entries={activityOf(i)} />
                    )}

                    <p className="px-1 pb-2 text-[11px] text-slate-400">
                        Recorded by {i.createdBy}
                        {i.updatedAt ? ` · last updated ${new Date(i.updatedAt).toLocaleDateString()}` : ""}
                    </p>
                </div>
            </div>

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share — ${sharing.subject}`}
                    subtitle="Send it in a chat, or to an outsider by email"
                    source={{ type: "manual", id: i.id, label: `Roadside inspection ${i.date}` }}
                    items={sharing.items}
                    record={{
                        type: "roadside-inspection",
                        id: i.id,
                        label: `Roadside inspection · ${i.date}`,
                        sublabel: sharing.sublabel,
                        path: HOME,
                    }}
                    defaultChannel="in-app"
                    defaultSubject={sharing.subject}
                    currentUserName={who || currentUserName()}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}

            {confirmDelete && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
                    <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
                        <p className="text-sm font-bold text-slate-900">Remove this inspection?</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {i.date} &middot; {unitsLabel(i)}. Its documents go with it, and this cannot be undone.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setConfirmDelete(false)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button onClick={() => { deleteInspection(i.id); onNavigate(HOME); }}
                                className="rounded-lg bg-rose-600 px-3 py-2 text-[13px] font-bold text-white hover:bg-rose-700">Remove</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
