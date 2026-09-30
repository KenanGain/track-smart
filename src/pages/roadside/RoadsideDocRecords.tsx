// ─────────────────────────────────────────────────────────────────────────────
// Documents, the way this app already does documents.
//
// Compliance & Documents has a shape everybody in the office has learnt: a list
// of the KINDS of record a thing can have — CVOR Certificate, MC Certificate,
// Safety Fitness — and you click one to get its own page, with the record's
// facts across the top and every version of it in a table underneath, with an
// Add record button.
//
// A roadside inspection has exactly three kinds: the inspector's report, the
// re-inspection after the fix, and the bill for the work. They were three
// dropzones stacked on one screen, which is a different idea wearing different
// furniture for no reason a user could name. So they are a list you click into,
// and each one opens the same record page the rest of the app opens.
//
// The three kinds are not interchangeable, and the add form is where that shows:
// a remediation report has to say who performed it, a repair bill has to say
// what it cost and which units it was spent on, and the inspector's copy is just
// the file. One form, three sets of questions, chosen by which kind you are in.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
    ChevronRight, CircleAlert, Eye, FileText, Plus, Receipt, Search, Sparkles,
    Share2, ShieldCheck, Trash2, Upload, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { PaginationBar } from "@/components/ui/DataListToolbar";
import { UploadZone } from "@/components/ui/UploadZone";
import {
    REMEDIATION_BY_LABEL, isMaintenanceRelated, newDoc,
    remediationRequired, todayIso, unitOptionsFor,
    type RoadsideDoc, type RoadsideInspection,
} from "./roadside.data";

/**
 * A demo document for the "Sample data" button.
 *
 * Points at a real PDF in `public/demo-docs`, the same way the compliance page's
 * sample data does — a sample row whose View button opens nothing teaches the
 * wrong thing about the screen it is demonstrating.
 */
const DEMO_PDF: Record<Shelf, { file: string; size: number }> = {
    reports: { file: "annual-inspection.pdf", size: 184_320 },
    remediation: { file: "compliance-document.pdf", size: 98_304 },
    repairBills: { file: "business-registration.pdf", size: 76_800 },
};

export function sampleDoc(inspection: RoadsideInspection, shelf: Shelf, by: string): RoadsideDoc {
    const { file, size } = DEMO_PDF[shelf];
    const units = unitOptionsFor(inspection);
    const base: RoadsideDoc = {
        id: `doc-sample-${shelf}-${Date.now().toString(36)}`,
        name: shelf === "reports" ? `inspection-report-${inspection.date}.pdf`
            : shelf === "remediation" ? `re-inspection-${inspection.date}.pdf`
                : `repair-invoice-${inspection.date}.pdf`,
        size,
        url: `/demo-docs/${file}`,
        uploadedAt: new Date().toISOString(),
        uploadedBy: by,
        source: "portal",
    };
    if (shelf === "remediation") return { ...base, performedBy: "mechanic", performedOn: inspection.date };
    if (shelf === "repairBills") return { ...base, assetIds: units.map((u) => u.id), amount: "412.60" };
    return base;
}

// Both live with the fields that produce them; re-exported so every importer of
// this module keeps working.
export { billTotal, type Shelf } from "./RoadsideDocFields";
import { DocFields, billTotal, docProblems, type DocDraft, type Shelf } from "./RoadsideDocFields";

export const SHELF_META: {
    key: Shelf; icon: React.ElementType; title: string; blurb: string; accepts: string; tone: string;
}[] = [
    {
        key: "reports", icon: FileText,
        title: "Inspection report",
        blurb: "The copy the inspector handed over at the roadside.",
        accepts: "Attach the inspector's copy — PDF, JPG or PNG up to 10MB",
        tone: "bg-slate-100 text-slate-500",
    },
    {
        key: "remediation", icon: ShieldCheck,
        title: "Remediation inspection report",
        blurb: "Performed after the defect was fixed. Says whether a mechanic or the driver did it.",
        accepts: "Attach the signed re-inspection — PDF, JPG or PNG up to 10MB",
        tone: "bg-emerald-50 text-emerald-600",
    },
    {
        key: "repairBills", icon: Receipt,
        title: "Vehicle repair bill",
        blurb: "What the work cost, filed against the units it was spent on.",
        accepts: "Attach the shop invoice — PDF, JPG or PNG up to 10MB",
        tone: "bg-amber-50 text-amber-600",
    },
];

export const shelfMeta = (k: Shelf) => SHELF_META.find((s) => s.key === k)!;

/** Is this kind expected on this inspection at all? */
export function shelfWanted(i: RoadsideInspection, k: Shelf): boolean {
    if (k === "reports") return true;
    // A FAILED inspection is what makes a re-inspection due — see `remediationRequired`.
    if (k === "remediation") return remediationRequired(i);
    return isMaintenanceRelated(i);
}

const fmtSize = (n?: number): string =>
    !n ? "" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const fmtWhen = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/** What this particular document says about itself, beyond its filename. */
export function docDetails(i: RoadsideInspection, shelf: Shelf, doc: RoadsideDoc): string {
    if (shelf === "remediation") {
        // The person first, the kind of person second: "Dale Foster (Mechanic)" is what
        // an auditor asked for, and "Mechanic" alone is what they said was not enough.
        const who = doc.performedByName?.trim()
            ? `${doc.performedByName.trim()}${doc.performedBy ? ` (${REMEDIATION_BY_LABEL[doc.performedBy]})` : ""}`
            : doc.performedBy ? `${REMEDIATION_BY_LABEL[doc.performedBy]} performed it` : "Performer not stated";
        return [who, doc.performedOn || null].filter(Boolean).join(" · ");
    }
    if (shelf === "repairBills") {
        const named = unitOptionsFor(i).filter((u) => doc.assetIds?.includes(u.id)).map((u) => u.label);
        return [
            billTotal(doc) ? `${doc.currency ?? "USD"} ${billTotal(doc)}` : null,
            doc.vendorCompany?.trim() || doc.vendorName?.trim() || null,
            named.length ? named.join(" + ") : "No unit assigned",
        ].filter(Boolean).join(" · ");
    }
    return fmtSize(doc.size) || "—";
}

const TH = "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap border-r border-slate-200/70 last:border-r-0";
const TD = "px-3 py-1.5 text-[13px] align-middle whitespace-nowrap border-r border-slate-100 last:border-r-0";

// ── The three kinds ─────────────────────────────────────────────────────────

/**
 * The kinds of document this inspection can hold, as a list you click into.
 *
 * Status is the column that earns its place: "Needed" is the whole reason this
 * tab exists, and on a list of three rows it is readable at a glance in a way
 * three stacked dropzones never were.
 */
export function DocTypesList({ inspection, onOpen, onSample }: {
    inspection: RoadsideInspection;
    onOpen: (shelf: Shelf) => void;
    /** File a demo document under every kind that wants one, so the screen can be read. */
    onSample?: () => void;
}) {
    return (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
                <p className="flex-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Documents</p>
                <p className="hidden text-[11px] text-slate-400 sm:block">Open a kind to see what is filed under it, or add one.</p>
                {onSample && (
                    <button type="button" onClick={onSample}
                        className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-bold text-violet-700 hover:bg-violet-100">
                        <Sparkles size={12} /> Sample data
                    </button>
                )}
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px]">
                    <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                            <th className={TH}>Document kind</th>
                            <th className={TH}>What it is</th>
                            <th className={TH}>On file</th>
                            <th className={TH}>Latest</th>
                            <th className={TH}>Document</th>
                            <th className={cn(TH, "pr-2 text-right")}>Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {SHELF_META.map(({ key, icon: Icon, title, blurb, tone }) => {
                            const docs = inspection[key];
                            const wanted = shelfWanted(inspection, key);
                            const latest = [...docs].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))[0];
                            return (
                                <tr key={key} onClick={() => onOpen(key)}
                                    className="h-10 cursor-pointer transition-colors hover:bg-blue-50/40">
                                    <td className={TD}>
                                        <span className="inline-flex items-center gap-2">
                                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", tone)}>
                                                <Icon size={13} />
                                            </span>
                                            <span className="font-semibold text-slate-800">{title}</span>
                                            <ChevronRight size={13} className="text-slate-300" />
                                        </span>
                                    </td>
                                    <td className={cn(TD, "max-w-[320px] truncate text-slate-500")} title={blurb}>{blurb}</td>
                                    <td className={cn(TD, "tabular-nums font-semibold text-slate-700")}>{docs.length}</td>
                                    <td className={cn(TD, "tabular-nums text-slate-500")}>
                                        {latest ? fmtWhen(latest.uploadedAt) : <span className="text-slate-300">&mdash;</span>}
                                    </td>
                                    {/* The most recent one, openable from the list — the common
                                        errand is "show me the latest", not "browse the versions". */}
                                    <td className={TD}>
                                        {latest
                                            ? <ViewChip doc={latest} />
                                            : <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                <CircleAlert size={11} /> No document
                                            </span>}
                                    </td>
                                    <td className={cn(TD, "pr-2 text-right")}>
                                        <StatusPill count={docs.length} wanted={wanted} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Phone */}
            <div className="divide-y divide-slate-100 md:hidden">
                {SHELF_META.map(({ key, icon: Icon, title, blurb, tone }) => {
                    const docs = inspection[key];
                    return (
                        <button key={key} type="button" onClick={() => onOpen(key)}
                            className="flex w-full items-center gap-3 p-4 text-left">
                            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
                                <Icon size={15} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold text-slate-800">{title}</span>
                                <span className="block text-[12px] text-slate-500">{blurb}</span>
                            </span>
                            <StatusPill count={docs.length} wanted={shelfWanted(inspection, key)} />
                            <ChevronRight size={15} className="shrink-0 text-slate-300" />
                        </button>
                    );
                })}
            </div>
        </section>
    );
}

function StatusPill({ count, wanted }: { count: number; wanted: boolean }) {
    if (count > 0) {
        return (
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                {count} on file
            </span>
        );
    }
    return wanted ? (
        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            Needed
        </span>
    ) : (
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-500">
            Not required
        </span>
    );
}

// ── One kind ────────────────────────────────────────────────────────────────

/**
 * One kind of document, with its facts across the top and its records beneath.
 *
 * The same two halves the compliance record page has, for the same reason: the
 * header answers "where does this stand", the table answers "what exactly is on
 * it", and an Add record button sits over the table because that is what it adds
 * a row to.
 */
export function DocTypeDetail({ inspection, shelf, uploadedBy, onBack, onChange, onShare }: {
    inspection: RoadsideInspection;
    shelf: Shelf;
    uploadedBy: string;
    onBack: () => void;
    onChange: (next: RoadsideInspection) => void;
    onShare?: (doc: RoadsideDoc, kind: string) => void;
}) {
    const meta = shelfMeta(shelf);
    const Icon = meta.icon;
    const docs = inspection[shelf];
    const wanted = shelfWanted(inspection, shelf);

    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const sorted = [...docs].sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
        return q
            ? sorted.filter((d) => `${d.name} ${d.uploadedBy} ${docDetails(inspection, shelf, d)}`.toLowerCase().includes(q))
            : sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docs, search, shelf]);
    const paged = rows.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const latest = rows[0];

    const remove = (id: string) =>
        onChange({ ...inspection, [shelf]: docs.filter((d) => d.id !== id) });

    const actions = (doc: RoadsideDoc) => [
        ...(doc.url ? [{ label: "Open the file", icon: Eye, onClick: () => window.open(doc.url, "_blank") }] : []),
        ...(onShare ? [{ label: "Share to chat", icon: Share2, onClick: () => onShare(doc, meta.title) }] : []),
        { label: "Remove", icon: Trash2, danger: true, onClick: () => remove(doc.id) },
    ];

    return (
        <div className="space-y-4">
            {/* Header block — what this kind is, and where it stands. */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                    <button type="button" onClick={onBack}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                        <ChevronRight size={13} className="rotate-180" /> Back to documents
                    </button>
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                        <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-slate-900">{meta.title}</p>
                        <p className="truncate text-[12px] text-slate-500">{meta.blurb}</p>
                    </div>
                    <StatusPill count={docs.length} wanted={wanted} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4">
                    <HeadFact label="On file" value={`${docs.length} document${docs.length === 1 ? "" : "s"}`} />
                    <HeadFact label="Latest" value={latest ? fmtWhen(latest.uploadedAt) : "—"} />
                    <HeadFact label="Filed by" value={latest?.uploadedBy ?? "—"} />
                    <HeadFact
                        label={shelf === "remediation" ? "Performed by" : shelf === "repairBills" ? "Amount" : "Size"}
                        value={latest
                            ? shelf === "remediation"
                                ? (latest.performedBy ? REMEDIATION_BY_LABEL[latest.performedBy] : "Not stated")
                                : shelf === "repairBills"
                                    ? (latest.amount ? `$${latest.amount}` : "—")
                                    : (fmtSize(latest.size) || "—")
                            : "—"}
                    />
                </div>
            </section>

            {/* Records */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {docs.length === 0 && wanted && (
                    <div className="flex flex-wrap items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5">
                        <CircleAlert size={14} className="shrink-0 text-amber-600" />
                        <p className="min-w-0 flex-1 text-[12px] text-amber-900">
                            <span className="font-bold">Nothing on file yet.</span> {meta.blurb}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Records
                        <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500">
                            {docs.length}
                        </span>
                    </p>
                    <div className="relative ml-auto min-w-[160px] flex-1 sm:max-w-xs">
                        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search this kind…"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white pr-2.5 text-[13px] text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            style={{ paddingLeft: 28 }}
                        />
                    </div>
                    <button type="button"
                        onClick={() => onChange({ ...inspection, [shelf]: [...docs, sampleDoc(inspection, shelf, uploadedBy)] })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 text-[12px] font-bold text-violet-700 hover:bg-violet-100">
                        <Sparkles size={12} /> Sample data
                    </button>
                    <button type="button" onClick={() => setAdding(true)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                        <Plus size={13} /> Add record
                    </button>
                </div>

                {/* Desk */}
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[720px]">
                        <thead className="border-b border-slate-200 bg-slate-50">
                            <tr>
                                <th className={TH}>Document</th>
                                <th className={TH}>Details</th>
                                <th className={TH}>Uploaded by</th>
                                <th className={TH}>Filed</th>
                                <th className={cn(TH, "pr-2 text-right")}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.map((doc) => (
                                <tr key={doc.id} className="h-9 align-middle">
                                    <td className={TD}>
                                        <div className="flex items-center gap-2">
                                            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                                                <Icon size={13} />
                                            </span>
                                            <span className="max-w-[260px] truncate font-semibold text-slate-800" title={doc.name}>{doc.name}</span>
                                            <ViewChip doc={doc} />
                                            {doc.source === "driver-app" && (
                                                <span className="shrink-0 rounded bg-blue-100 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                                    Driver app
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={cn(TD, "max-w-[280px] truncate text-slate-600")} title={docDetails(inspection, shelf, doc)}>
                                        {docDetails(inspection, shelf, doc)}
                                    </td>
                                    <td className={TD}>
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-bold text-slate-500">
                                                {doc.uploadedBy.trim().charAt(0).toUpperCase()}
                                            </span>
                                            <span className="text-slate-700">{doc.uploadedBy}</span>
                                        </span>
                                    </td>
                                    <td className={cn(TD, "tabular-nums text-slate-500")}>{fmtWhen(doc.uploadedAt)}</td>
                                    <td className={cn(TD, "pr-2")}>
                                        <div className="flex justify-end"><KebabMenu title="Document actions" items={actions(doc)} /></div>
                                    </td>
                                </tr>
                            ))}
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-[13px] text-slate-400">
                                        {docs.length === 0 ? "No records under this kind yet." : "Nothing matches that search."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Phone */}
                <div className="divide-y divide-slate-100 md:hidden">
                    {paged.map((doc) => (
                        <div key={doc.id} className="flex items-start gap-3 p-4">
                            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                                <Icon size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-semibold text-slate-800" title={doc.name}>{doc.name}</p>
                                <p className="mt-0.5 text-[12px] text-slate-600">{docDetails(inspection, shelf, doc)}</p>
                                <p className="mt-0.5 text-[11px] text-slate-400">{doc.uploadedBy} &middot; {fmtWhen(doc.uploadedAt)}</p>
                                <div className="mt-1.5"><ViewChip doc={doc} /></div>
                            </div>
                            <KebabMenu title="Document actions" items={actions(doc)} />
                        </div>
                    ))}
                    {paged.length === 0 && (
                        <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                            {docs.length === 0 ? "No records under this kind yet." : "Nothing matches that search."}
                        </p>
                    )}
                </div>

                {rows.length > 0 && (
                    <PaginationBar
                        totalItems={rows.length}
                        currentPage={page}
                        rowsPerPage={rowsPerPage}
                        onPageChange={setPage}
                        onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
                    />
                )}
            </section>

            {adding && (
                <AddDocRecord
                    inspection={inspection}
                    shelf={shelf}
                    uploadedBy={uploadedBy}
                    onClose={() => setAdding(false)}
                    onSave={(doc) => {
                        onChange({ ...inspection, [shelf]: [...docs, doc] });
                        setAdding(false);
                    }}
                />
            )}
        </div>
    );
}

function HeadFact({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="min-w-0 px-4 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">{value}</p>
        </div>
    );
}

/** The one thing every reader wants from a document row. */
function ViewChip({ doc }: { doc: RoadsideDoc }) {
    if (!doc.url) {
        return (
            <span title="No file behind this record" className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[11px] font-semibold text-slate-400">
                <Eye size={11} /> No file
            </span>
        );
    }
    return (
        <a href={doc.url} target="_blank" rel="noreferrer" title={`View ${doc.name}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
            <Eye size={11} /> View
        </a>
    );
}

// ── Adding one ──────────────────────────────────────────────────────────────

/**
 * The add form, which is a different form for each kind.
 *
 * Its questions are the ones that document has to answer to be evidence: a
 * re-inspection nobody can attribute and a bill filed against no unit are both
 * files on a record rather than answers, which is the thing this module exists
 * to stop. So Save stays shut until they are answered.
 */
function AddDocRecord({ inspection, shelf, uploadedBy, onClose, onSave }: {
    inspection: RoadsideInspection;
    shelf: Shelf;
    uploadedBy: string;
    onClose: () => void;
    onSave: (doc: RoadsideDoc) => void;
}) {
    const meta = shelfMeta(shelf);
    const units = unitOptionsFor(inspection);

    const [file, setFile] = useState<File | null>(null);
    // Started with what the inspection already knows: the date, the units, the
    // distance unit. A form that makes you retype what the record above it says is
    // a form that gets a different answer.
    const [draft, setDraft] = useState<DocDraft>(() => ({
        documentDate: inspection.date,
        performedOn: todayIso(),
        currency: "USD",
        odometerUnit: inspection.truckOdometerUnit ?? "mi",
        assetIds: shelf === "repairBills" ? units.map((u) => u.id) : undefined,
    }));
    const patch = (p: DocDraft) => setDraft((d) => ({ ...d, ...p }));

    const problems = docProblems(shelf, draft, !!file, units.length);

    const save = () => {
        if (!file || problems.length) return;
        const base = newDoc(file, uploadedBy);
        const trimmed: DocDraft = shelf === "repairBills"
            ? { ...draft, amount: billTotal(draft) || undefined }
            : draft;
        onSave({ ...base, ...trimmed });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.tone)}>
                        <meta.icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-bold text-slate-900">Add {meta.title.toLowerCase()}</p>
                        <p className="text-[12px] text-slate-500">{meta.blurb}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <DocFields inspection={inspection} shelf={shelf} doc={draft} onPatch={patch} />

                    <div>
                        <span className="mb-1 flex items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Document</span>
                            <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>
                        </span>
                        <div className="mt-1.5">
                            {file ? (
                                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm">
                                        <FileText size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-semibold text-slate-800">{file.name}</p>
                                        <p className="text-[11px] text-emerald-600">Ready to file</p>
                                    </div>
                                    <button type="button" onClick={() => setFile(null)} title="Choose a different file"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-600">
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            ) : (
                                <UploadZone
                                    variant="card"
                                    accept="image/*,application/pdf"
                                    label="Click to upload or drag &amp; drop"
                                    hint={meta.accepts}
                                    onFiles={(files) => { if (files?.[0]) setFile(files[0]); }}
                                />
                            )}
                        </div>
                    </div>

                    {problems.length > 0 && (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
                            Still needs {problems.join(", and ")}.
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button type="button" onClick={save} disabled={problems.length > 0}
                        className={cn("inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-bold text-white transition-colors",
                            problems.length > 0 ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700")}>
                        <Upload size={14} /> File the record
                    </button>
                </div>
            </div>
        </div>
    );
}
