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
    CalendarClock, ClipboardCheck, Container, FileText, LayoutGrid, MapPin, Pencil, Receipt,
    Rows3, Share2, ShieldAlert, ShieldCheck, StickyNote, Timer, Trash2, Truck, Upload, User, Wrench, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/ui/BackLink";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ActivityTimeline, type ActivityEntry } from "@/components/ui/ActivityTimeline";
import { ShareToChat, type ShareItem } from "@/components/share/ShareToChat";
import { setMessagesFocus } from "@/pages/messages/messages-store";
import { currentUserName } from "@/data/users.data";
import { DocShelf, DocList } from "./RoadsideDocs";
import {
    PARTY_LABEL, REMEDIATION_BY_LABEL, STAGE_LABEL, STAGE_TONE, allViolations, durationLabel,
    deleteInspection, hasVehicleViolation, inspectionStage, isMaintenanceRelated, saveInspection,
    unitsLabel, useInspection,
    type PartyKind, type RoadsideInspection, type RoadsideParty,
} from "./roadside.data";

const HOME = "/roadside-inspections";

type TabId = "overview" | "violations" | "documents" | "activity";

/** One labelled fact in the summary grid. */
function Fact({ icon: Icon, label, value, tone }: {
    icon: React.ElementType; label: string; value: React.ReactNode; tone?: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <Icon size={11} /> {label}
            </p>
            <p className={cn("mt-1 text-[14px] font-semibold text-slate-800", tone)}>{value}</p>
        </div>
    );
}

/** One inspected party, and what was found against it. */
function PartyPanel({ kind, party }: { kind: PartyKind; party: RoadsideParty }) {
    const Icon = kind === "driver" ? User : kind === "trailer" ? Container : Truck;
    const clean = !party.hasViolation || party.violations.length === 0;
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-slate-500">
                    <Icon size={13} /> {PARTY_LABEL[kind]}
                    {party.label && <span className="font-semibold normal-case tracking-normal text-slate-800">{party.label}</span>}
                </p>
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold",
                    clean ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700")}>
                    {!party.label ? "Not inspected" : clean ? "No violation" : `${party.violations.length} violation${party.violations.length === 1 ? "" : "s"}`}
                </span>
            </div>
            {!clean && (
                <ul className="divide-y divide-slate-50">
                    {party.violations.map((v, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                            {v.code && (
                                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">{v.code}</span>
                            )}
                            <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{v.subtype || v.label}</span>
                            {v.category && <span className="text-[11px] text-slate-500">{v.category}</span>}
                            {v.isOos && (
                                <span className="rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">OOS</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
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
    const [sharing, setSharing] = useState(false);
    // The list is for reading, the wells are for adding. A record with documents on
    // it opens on the list; an empty one opens where the work is.
    const [docView, setDocView] = useState<"list" | "upload">("list");
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
                            <button onClick={() => setSharing(true)}
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
                <div className="mx-auto max-w-5xl space-y-5 px-4 py-5 sm:px-6 sm:py-6">

                    {/* True on every tab, so it sits above them all. */}
                    <NextStep i={i} onGoDocuments={() => { setTab("documents"); setDocView("upload"); }} />

                    {tab === "overview" && (
                        <>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <Fact icon={CalendarClock} label="Inspection date" value={i.date} />
                                <Fact icon={Timer} label="Time" value={durationLabel(i)} />
                                <Fact icon={ClipboardCheck} label="Result" value={i.result}
                                    tone={i.result === "Pass" ? "text-emerald-700" : "text-rose-700"} />
                                <Fact icon={ShieldAlert} label="Citation"
                                    value={i.citationIssued ? (i.citationNumber || "Issued") : "None issued"}
                                    tone={i.citationIssued ? "text-rose-700" : undefined} />
                                <Fact icon={MapPin} label="Location" value={i.location || "—"} />
                                <Fact icon={ClipboardCheck} label="Level" value={i.level} />
                                <Fact icon={Truck} label="Units" value={unitsLabel(i)} />
                                <Fact icon={User} label="Driver" value={i.driver.label ?? "—"} />
                            </div>

                            {/* A summary, not the list — the list has its own tab. */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                <button type="button" onClick={() => setTab("violations")}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-slate-300">
                                    <span>
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                            <ShieldAlert size={11} /> Violations found
                                        </span>
                                        <span className={cn("mt-1 block text-[14px] font-semibold", vios.length ? "text-rose-700" : "text-slate-800")}>
                                            {vios.length === 0
                                                ? "None"
                                                : `${vios.length} across ${partiesWithFindings} part${partiesWithFindings === 1 ? "y" : "ies"}`}
                                        </span>
                                    </span>
                                    <span className="text-[12px] font-semibold text-blue-600">View</span>
                                </button>
                                <Fact icon={Wrench} label="Maintenance related"
                                    value={isMaintenanceRelated(i) ? "Yes — repair bill expected" : "No"} />
                            </div>

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
                        <div className="space-y-3">
                            <PartyPanel kind="truck" party={i.truck} />
                            <PartyPanel kind="trailer" party={i.trailer} />
                            <PartyPanel kind="driver" party={i.driver} />
                            {vios.length === 0 && (
                                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-[13px] text-slate-500">
                                    Nothing was found against the truck, the trailer or the driver.
                                </p>
                            )}
                        </div>
                    )}

                    {tab === "documents" && (
                        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                                <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Documents</p>
                                <span className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="inline-flex items-center gap-1" title="Inspection reports"><FileText size={11} /> {i.reports.length}</span>
                                    <span className="inline-flex items-center gap-1" title="Remediation reports"><ShieldCheck size={11} /> {i.remediation.length}</span>
                                    <span className="inline-flex items-center gap-1" title="Repair bills"><Receipt size={11} /> {i.repairBills.length}</span>
                                </span>
                                {/* Reading and adding are different jobs; one switch, not two screens. */}
                                <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                                    {([["list", "List", Rows3], ["upload", "Upload", Upload]] as const).map(([id, label, Icon]) => (
                                        <button key={id} type="button" onClick={() => setDocView(id)}
                                            className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-bold transition-colors",
                                                docView === id ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                            <Icon size={12} /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {docView === "list" ? (
                                <DocList
                                    inspection={i}
                                    onChange={(next) => saveInspection(next)}
                                    onAdd={() => setDocView("upload")}
                                />
                            ) : (
                                <div className="p-4">
                                    <DocShelf
                                        inspection={i}
                                        uploadedBy={who || "Safety Manager"}
                                        onChange={(next) => saveInspection(next)}
                                    />
                                </div>
                            )}
                        </section>
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
                    onClose={() => setSharing(false)}
                    title={`Share roadside inspection — ${i.date}`}
                    subtitle="Send the inspection and its documents in a chat, or to an outsider by email"
                    source={{ type: "manual", id: i.id, label: `Roadside inspection ${i.date}` }}
                    items={shareItems}
                    record={{
                        type: "roadside-inspection",
                        id: i.id,
                        label: `Roadside inspection · ${i.date}`,
                        sublabel: [unitsLabel(i), i.driver.label, STAGE_LABEL[stage]].filter(Boolean).join(" · "),
                        path: HOME,
                    }}
                    defaultChannel="in-app"
                    defaultSubject={`Roadside inspection ${i.date} — ${unitsLabel(i)}`}
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
