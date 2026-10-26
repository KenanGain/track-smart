import { Fragment, useMemo, useState, type ReactNode, type Ref, type UIEventHandler } from "react";
import { BellRing, Mail, Pause, Play, ShieldCheck, UserCheck, Users as UsersIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { RowActions } from "@/components/ui/RowActions";
import { findUserById, initialsOf, ROLE_LABELS } from "@/data/users.data";
import { gradientFor } from "@/pages/users-roles/scope";
import { CoverPill, coverChips } from "@/pages/users-roles/AlertDialogs";
import {
    expandRecipients, roleOfRecipient, usersWithRoleOn, type NotificationRole, type RoutingRecipient,
} from "@/pages/compliance/monitoring-routing.data";

// ─────────────────────────────────────────────────────────────────────────────
// Notification roles — the pieces every screen that shows them is built from.
//
// A notification role says "tell these people about these records". It used to be drawn three
// ways (Settings ▸ Monitoring, Settings ▸ Users & Roles, the monitoring page's Notified column)
// and the three disagreed about what a recipient looks like. Now a recipient is one chip: a
// person by their avatar, a ROLE by its shield and a live head-count — "Safety Managers · 2" is
// whoever holds that role on the carrier today, read from Users & Roles — and the list itself is
// the app's standard list (`ListScrollFrame`), the same on both Settings pages.
// ─────────────────────────────────────────────────────────────────────────────

/** One recipient. A role shows how many people it reaches on `accountId` right now. */
export function RecipientChip({ r, accountId, onRemove, size = "sm" }: {
    r: RoutingRecipient; accountId?: string; onRemove?: () => void; size?: "sm" | "md";
}) {
    const dim = size === "md" ? "h-6 w-6 text-[10px]" : "h-5 w-5 text-[9px]";
    const icon = size === "md" ? 13 : 11;
    const role = roleOfRecipient(r);
    let badge: ReactNode;
    let label = r.name;
    let title: string | undefined;
    if (role) {
        badge = <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600", dim)}><ShieldCheck size={icon} /></span>;
        if (accountId) {
            const people = usersWithRoleOn(accountId, role);
            label = `${ROLE_LABELS[role]}s · ${people.length}`;
            title = people.length ? `${ROLE_LABELS[role]} on this carrier: ${people.map((u) => u.name).join(", ")}` : `Nobody holds the ${ROLE_LABELS[role]} role on this carrier yet`;
        }
    } else if (r.kind === "owner") {
        badge = <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600", dim)}><UserCheck size={icon} /></span>;
    } else if (r.kind === "role") {
        // A legacy preset ("Dispatcher") — nobody holds it; shown so an old setup still reads.
        badge = <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400", dim)}><ShieldCheck size={icon} /></span>;
        title = "A placeholder role — reaches nobody. Replace it with a real role or a person.";
    } else if (r.kind === "contact") {
        badge = <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600", dim)}><Mail size={icon} /></span>;
        title = r.email;
    } else {
        const u = findUserById(r.id.replace(/^(user|driver):/, "")) ?? findUserById(`u-drv-${r.id.replace(/^driver:/, "")}`);
        badge = <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white", dim, u?.avatarGradient ?? gradientFor(r.name))}>{u?.initials ?? initialsOf(r.name)}</span>;
        title = r.via ? `${r.name} — via the ${r.via} role` : r.email;
    }
    return (
        <span title={title} className={cn("inline-flex max-w-full items-center gap-1.5 rounded-full border bg-white py-0.5 pl-0.5 pr-2",
            role ? "border-indigo-200" : "border-slate-200", size === "md" ? "text-[12px]" : "text-[11px]")}>
            {badge}
            <span className={cn("truncate font-medium", role ? "text-indigo-700" : "text-slate-700", size === "md" ? "max-w-[180px]" : "max-w-[140px]")}>{label}</span>
            {onRemove && <button type="button" onClick={onRemove} className="text-slate-300 hover:text-rose-500" aria-label={`Remove ${r.name}`}><X size={13} /></button>}
        </span>
    );
}

/** The per-row on/off switch — the row control, so there is no checkbox beside it. */
export function RoleToggle({ on, onClick, disabled }: { on: boolean; onClick: () => void; disabled?: boolean }) {
    return (
        <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={onClick}
            className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-blue-600" : "bg-slate-300", disabled && "cursor-default opacity-70")}>
            <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", on ? "left-[18px]" : "left-0.5")} />
        </button>
    );
}

/** Everyone a role reaches on the carrier, people and role members alike, each once. */
export const peopleReached = (role: NotificationRole, accountId?: string): RoutingRecipient[] =>
    accountId ? expandRecipients(role.recipients, accountId).filter((r) => r.kind !== "owner") : role.recipients;

/** How a role addresses people — a filter and a grouping. */
type NotifiedBy = "By role" | "Specific people" | "Nobody";
const notifiedBy = (r: NotificationRole): NotifiedBy =>
    r.recipients.length === 0 ? "Nobody" : r.recipients.some((x) => roleOfRecipient(x)) ? "By role" : "Specific people";

type Col = "role" | "covers" | "notifies" | "people" | "status";
const COLUMNS: PickerColumn<Col>[] = [
    { id: "role", label: "Notification role", locked: true },
    { id: "covers", label: "Covers" },
    { id: "notifies", label: "Notifies" },
    { id: "people", label: "People" },
    { id: "status", label: "Status" },
];
type GroupBy = "none" | "status" | "notifiedBy";
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "status", label: "Group: Status" },
    { id: "notifiedBy", label: "Group: Notified by" },
];
const STATUS_OPTIONS = ["On", "Paused"];
const NOTIFIED_OPTIONS: NotifiedBy[] = ["By role", "Specific people", "Nobody"];

const TD = ({ children, className, onClick }: { children?: ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

/**
 * The list of a carrier's notification roles, in the app's standard list frame.
 *
 * `roles` is what to show (a page may have narrowed it to a tab); `total` is how many there
 * are in all, for the "n of total" count. Everything the reader can do to a row is in its ⋮,
 * in the same order as every other list: edit, change who gets it, pause, delete last.
 */
export function NotificationRolesList({
    accountId, roles, total, carrierName, canEdit, onEdit, onRecipients, onToggle, onDelete, onCreate,
    above, scrollRef, onScroll, pad, title = "Notification roles", description, actions,
}: {
    accountId?: string;
    roles: NotificationRole[];
    total: number;
    carrierName: string;
    canEdit: boolean;
    onEdit: (r: NotificationRole) => void;
    /** The short way to change who is on a role — a dialog, where the host has one. */
    onRecipients?: (r: NotificationRole) => void;
    onToggle: (r: NotificationRole) => void;
    onDelete: (r: NotificationRole) => void;
    onCreate?: () => void;
    above?: ReactNode;
    scrollRef?: Ref<HTMLDivElement>;
    onScroll?: UIEventHandler<HTMLDivElement>;
    pad?: string;
    title?: string;
    description?: ReactNode;
    /** Whole-list controls beside the column picker — Full setup, New role. */
    actions?: ReactNode;
}) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [by, setBy] = useState("");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const q = search.trim().toLowerCase();
    const rows = roles.filter((r) => {
        if (status && (r.enabled ? "On" : "Paused") !== status) return false;
        if (by && notifiedBy(r) !== by) return false;
        if (!q) return true;
        return [r.name, r.description, ...coverChips(r).map((c) => c.label), ...peopleReached(r, accountId).map((x) => x.name), ...r.recipients.map((x) => x.name)]
            .some((s) => s?.toLowerCase().includes(q));
    });

    const readers = useMemo(() => ({
        role: (r: NotificationRole) => r.name,
        covers: (r: NotificationRole) => coverChips(r).length,
        notifies: (r: NotificationRole) => r.recipients.length,
        people: (r: NotificationRole) => peopleReached(r, accountId).length,
        status: (r: NotificationRole) => (r.enabled ? 0 : 1),
    }), [accountId]);
    const { sort, onSort, sorted } = useTableSort<Col, NotificationRole>(rows, readers, { col: "role", dir: "asc" });

    const groupOf = (r: NotificationRole): { rank: number; label: string } | null =>
        groupBy === "status" ? { rank: r.enabled ? 0 : 1, label: r.enabled ? "On" : "Paused" }
            : groupBy === "notifiedBy" ? { rank: NOTIFIED_OPTIONS.indexOf(notifiedBy(r)), label: notifiedBy(r) }
                : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((r, i) => ({ r, i, g: groupOf(r)! }))
        .sort((x, y) => x.g.rank - y.g.rank || x.i - y.i)
        .map((x) => x.r);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((r) => { const l = groupOf(r)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const show = (c: Col) => visible.has(c);
    const colCount = COLUMNS.filter((c) => c.locked || visible.has(c.id)).length + 1;
    const filterCount = [!!status, !!by, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setSearch(""); setStatus(""); setBy(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    const menu = (r: NotificationRole) => [
        ...(onRecipients ? [{ label: "Change who gets it", icon: UsersIcon, onClick: () => onRecipients(r) }] : []),
        { label: r.enabled ? "Pause" : "Resume", icon: r.enabled ? Pause : Play, onClick: () => onToggle(r) },
    ];

    return (
        <ListScrollFrame
            above={above}
            pad={pad}
            title={title}
            count={grouped.length}
            total={total}
            description={description ?? <>Who is told about {carrierName}'s compliance records. A role addressed <span className="font-semibold text-indigo-700">by role</span> follows Users &amp; Roles on its own.</>}
            actions={<>
                {actions}
                <ColumnPicker columns={COLUMNS} visible={visible}
                    onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />
            </>}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search roles, records, people…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="On and paused" options={STATUS_OPTIONS} />
                        <FilterSelect value={by} onChange={toPage1(setBy)} title="Notified by" allLabel="Notified any way" options={NOTIFIED_OPTIONS} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={GROUPS} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="role" label="Notification role" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("covers") && <SortTh col="covers" label="Covers" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("notifies") && <SortTh col="notifies" label="Notifies" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("people") && <SortTh col="people" label="People" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <BellRing className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{total === 0 ? "No notification roles yet" : "No role matches"}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                    {total === 0
                                        ? "A role is a simple checklist — pick the records (carrier, drivers, assets) and who should be told: a role from Users & Roles, or specific people."
                                        : "Try another filter, tab or search."}
                                </p>
                                {touched && (
                                    <button type="button" onClick={reset}
                                        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                        Clear filters
                                    </button>
                                )}
                                {total === 0 && canEdit && onCreate && (
                                    <button type="button" onClick={onCreate}
                                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                                        <BellRing className="h-4 w-4" /> Create the first role
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((r, i) => {
                        const g = groupOf(r);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const chips = coverChips(r);
                        const people = peopleReached(r, accountId);
                        const shownRecipients = r.recipients.slice(0, 3);
                        return (
                            <Fragment key={r.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className={cn("group transition-colors hover:bg-slate-50", canEdit && "cursor-pointer", !r.enabled && "bg-slate-50/40")}
                                    onClick={() => canEdit && onEdit(r)}>
                                    <TD>
                                        <div className="flex items-center gap-2.5" title={r.description}>
                                            <span onClick={(e) => e.stopPropagation()}><RoleToggle on={r.enabled} disabled={!canEdit} onClick={() => onToggle(r)} /></span>
                                            <span className={cn("font-semibold", r.enabled ? "text-slate-900" : "text-slate-500")}>{r.name}</span>
                                            {r.description && <span className="hidden max-w-[16rem] truncate text-xs text-slate-500 2xl:inline">· {r.description}</span>}
                                        </div>
                                    </TD>
                                    {show("covers") && (
                                        <TD>
                                            <span className="flex items-center gap-1">
                                                {chips.length ? chips.map((c) => <CoverPill key={c.label} {...c} />) : <CoverPill Icon={X} label="Nothing yet" muted />}
                                            </span>
                                        </TD>
                                    )}
                                    {show("notifies") && (
                                        <TD>
                                            {r.recipients.length === 0 ? (
                                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Nobody yet{canEdit ? " · add" : ""}</span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    {shownRecipients.map((x) => <RecipientChip key={x.id} r={x} accountId={accountId} />)}
                                                    {r.recipients.length > 3 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{r.recipients.length - 3}</span>}
                                                </span>
                                            )}
                                        </TD>
                                    )}
                                    {show("people") && (
                                        <TD className="tabular-nums" >
                                            <span className={cn("font-semibold", people.length ? "text-slate-900" : "text-rose-600")} title={people.map((p) => p.name).join("\n")}>
                                                {people.length}
                                            </span>
                                            <span className="ml-1 text-xs text-slate-500">{people.length === 1 ? "person" : "people"}</span>
                                        </TD>
                                    )}
                                    {show("status") && (
                                        <TD>
                                            <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", r.enabled ? "text-emerald-600" : "text-slate-500")}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", r.enabled ? "bg-emerald-500" : "bg-slate-300")} />{r.enabled ? "On" : "Paused"}
                                            </span>
                                        </TD>
                                    )}
                                    <TD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                        {canEdit && (
                                            <RowActions noun="notification role" name={r.name}
                                                onEdit={() => onEdit(r)} extra={menu(r)} onDelete={() => onDelete(r)} />
                                        )}
                                    </TD>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}
