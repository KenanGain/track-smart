import * as React from "react";
import { Bell, BellRing, Building2, ExternalLink, Mail, MessageSquare, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDriverUser, type AppUser } from "@/data/users.data";
import { getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { markInboxSeen, seenKeysOf, useInbox, type InboxAlert, type InboxMessage } from "@/pages/compliance/monitoring-inbox";
import { PRIORITY_META, PRIORITY_ORDER, dueShort, type PriorityLevel } from "@/pages/compliance/monitoring-alerts";
import { requestMonitoringFocus } from "@/pages/compliance/monitoring-routing.data";
import { setMessagesFocus } from "@/pages/messages/messages-store";

// ─────────────────────────────────────────────────────────────────────────────
// The bell — what the signed-in person has been notified about.
//
// It used to be a bell with a red dot drawn on, for everybody. Now it opens the person's own
// inbox (monitoring-inbox): the monitoring alerts whose notification role or rule names them,
// grouped by carrier when they work on more than one, and the requests sent to them in
// Messages. Opening it marks everything in it as seen; the badge counts what they have not
// had in front of them yet. An alert opens on the Compliance Monitoring page with its
// Take-action panel up; a message opens its thread.
// ─────────────────────────────────────────────────────────────────────────────

/** How many alerts the panel lists — the most urgent; the count in the header says how many there are. */
const MAX_SHOWN = 40;

export function NotificationBell({ user, onNavigate, onSelectAccount, canOpenSettings }: {
    user: AppUser;
    onNavigate?: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
    /** Settings is in this person's menu — the footer offers Settings ▸ Users & Roles only then. */
    canOpenSettings?: boolean;
}) {
    const inbox = useInbox(user);
    const [open, setOpen] = React.useState(false);
    // What was new when the panel opened — kept so the "New" markers stay while it is open,
    // even though opening it is what marks them seen.
    const [newAtOpen, setNewAtOpen] = React.useState<Set<string>>(() => new Set());
    // Which slice is on show — every alert, one priority, or just the messages.
    const [filter, setFilter] = React.useState<"all" | PriorityLevel | "messages">("all");
    const ref = React.useRef<HTMLDivElement>(null);
    const driver = isDriverUser(user);

    React.useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
    }, [open]);

    const toggle = () => {
        if (open) { setOpen(false); return; }
        const seen = seenKeysOf(user.id);
        setNewAtOpen(new Set(inbox.keys.filter((k) => !seen.has(k))));
        markInboxSeen(user.id, inbox.keys);
        setOpen(true);
    };

    const openAlert = (a: InboxAlert) => {
        setOpen(false);
        if (driver) { onNavigate?.("/driver-mobile-app"); return; }
        const acct = getAccountById(a.accountId);
        if (acct) onSelectAccount?.(acct);
        requestMonitoringFocus(a.alert.id);
        onNavigate?.("/default-compliance-monitoring");
    };
    const openMessage = (m: InboxMessage) => {
        setOpen(false);
        setMessagesFocus(m.convId);
        onNavigate?.("/messages");
    };

    // The most urgent first, and only so many: an Admin on an "everything" notification role
    // has hundreds, and a panel is for what needs looking at now — Monitoring has the rest.
    // Grouped by carrier only when there is more than one to tell apart.
    const alerts = React.useMemo(
        () => filter === "all" ? inbox.alerts : filter === "messages" ? [] : inbox.alerts.filter((a) => a.alert.priority === filter),
        [inbox.alerts, filter],
    );
    const byPriority = React.useMemo(() => {
        const m = new Map<PriorityLevel, number>();
        for (const a of inbox.alerts) m.set(a.alert.priority, (m.get(a.alert.priority) ?? 0) + 1);
        return m;
    }, [inbox.alerts]);
    const showMessages = filter === "all" || filter === "messages";
    const { shown, groups } = React.useMemo(() => {
        const top = alerts.slice(0, MAX_SHOWN);
        const by = new Map<string, { carrier: string; items: InboxAlert[] }>();
        for (const a of top) {
            const g = by.get(a.accountId) ?? { carrier: a.carrier, items: [] };
            g.items.push(a);
            by.set(a.accountId, g);
        }
        return { shown: top, groups: [...by.values()] };
    }, [alerts]);

    const empty = inbox.alerts.length === 0 && inbox.messages.length === 0;
    const badge = inbox.unseen > 99 ? "99+" : String(inbox.unseen);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={toggle}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={inbox.unseen ? `Notifications · ${inbox.unseen} new` : "Notifications"}
                title={inbox.unseen ? `${inbox.unseen} new` : "Notifications"}
                className={cn("relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
                    open && "bg-slate-100 text-slate-900")}
            >
                <Bell size={17} />
                {inbox.unseen > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">Notifications</p>
                            <p className="truncate text-[11px] text-slate-500">
                                {inbox.alerts.length} alert{inbox.alerts.length === 1 ? "" : "s"}
                                {inbox.carriers > 1 ? ` on ${inbox.carriers} carriers` : ""} · {inbox.messages.length} message{inbox.messages.length === 1 ? "" : "s"}
                            </p>
                        </div>
                        {!driver && onNavigate && (
                            <button type="button" onClick={() => { setOpen(false); onNavigate("/default-compliance-monitoring"); }}
                                className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline">
                                Monitoring <ExternalLink className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    {!empty && (
                        <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 px-3 py-1.5">
                            {([["all", "All", inbox.alerts.length + inbox.messages.length] as const,
                                ...PRIORITY_ORDER.filter((p) => byPriority.has(p)).map((p) => [p, PRIORITY_META[p].label, byPriority.get(p) ?? 0] as const),
                                ...(inbox.messages.length ? [["messages", "Messages", inbox.messages.length] as const] : [])]).map(([id, label, n]) => (
                                <button key={id} type="button" onClick={() => setFilter(id)}
                                    className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                                        filter === id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                                    {id !== "all" && id !== "messages" && <span className={cn("h-1.5 w-1.5 rounded-full", filter === id ? "bg-white" : PRIORITY_META[id].dot)} />}
                                    {label}
                                    <span className={cn("tabular-nums", filter === id ? "text-slate-300" : "text-slate-400")}>{n}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="max-h-[60vh] overflow-y-auto">
                        {empty ? (
                            <div className="px-6 py-10 text-center">
                                <BellRing className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">Nothing for you right now</p>
                                <p className="mt-1 text-[12px] text-slate-500">
                                    {driver
                                        ? "Alerts about your documents and anything the office sends you in chat land here."
                                        : "Alerts land here once a notification role or rule names you and a reminder has fired."}
                                </p>
                            </div>
                        ) : (
                            <>
                                {groups.map((g) => (
                                    <section key={g.carrier}>
                                        {(inbox.carriers > 1 || inbox.messages.length > 0) && (
                                            <p className="flex items-center gap-1.5 bg-slate-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                <Building2 className="h-3 w-3 text-slate-400" /> {g.carrier}
                                                <span className="font-semibold tabular-nums text-slate-400">· {g.items.length}</span>
                                            </p>
                                        )}
                                        <ul className="divide-y divide-slate-100">
                                            {g.items.map((a) => <AlertRow key={a.key} a={a} isNew={newAtOpen.has(a.key)} onOpen={() => openAlert(a)} />)}
                                        </ul>
                                    </section>
                                ))}
                                {alerts.length > shown.length && (
                                    <p className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-500">
                                        The {shown.length} most urgent of {alerts.length}
                                        {!driver && onNavigate && <> · <button type="button" onClick={() => { setOpen(false); onNavigate("/default-compliance-monitoring"); }} className="font-semibold text-blue-600 hover:underline">see all in Monitoring</button></>}
                                    </p>
                                )}
                                {showMessages && inbox.messages.length > 0 && (
                                    <section>
                                        <p className="flex items-center gap-1.5 bg-slate-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            <MessageSquare className="h-3 w-3 text-slate-400" /> Sent to you in Messages
                                            <span className="font-semibold tabular-nums text-slate-400">· {inbox.messages.length}</span>
                                        </p>
                                        <ul className="divide-y divide-slate-100">
                                            {inbox.messages.map((m) => <MessageRow key={m.key} m={m} isNew={newAtOpen.has(m.key)} onOpen={() => openMessage(m)} />)}
                                        </ul>
                                    </section>
                                )}
                            </>
                        )}
                    </div>

                    {!driver && (
                        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500">
                            <span className="min-w-0 flex-1 truncate">
                                {canOpenSettings ? "Who gets which alert is set per carrier in Settings ▸ Users & Roles." : "Who gets which alert is set by your carrier's Fleet Admin."}
                            </span>
                            {onNavigate && canOpenSettings && (
                                <button type="button" onClick={() => { setOpen(false); onNavigate("/settings/users-roles"); }} className="shrink-0 font-semibold text-blue-600 hover:underline">
                                    Open
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/** One alert: priority dot · record and subject · due · how it reached this person. */
function AlertRow({ a, isNew, onOpen }: { a: InboxAlert; isNew: boolean; onOpen: () => void }) {
    const pm = PRIORITY_META[a.alert.priority];
    const when = a.alert.isStatus ? a.alert.status : dueShort(a.alert.daysUntil);
    const via = a.via[0];
    return (
        <li>
            <button type="button" onClick={onOpen} title={[`${a.alert.title} — ${a.alert.subjectLabel}`, `${pm.label}${when ? ` · ${when}` : ""}`, a.via.length ? `Via: ${a.via.join(", ")}` : "", a.channels.email && a.channels.inApp ? "Email + in-app" : a.channels.email ? "Email" : a.channels.inApp ? "In-app" : ""].filter(Boolean).join("\n")}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", pm.dot)} aria-label={pm.label} />
                <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-slate-900">{a.alert.title}</span>
                        {isNew && <span className="shrink-0 rounded-full bg-rose-50 px-1.5 text-[9px] font-bold uppercase tracking-wide text-rose-600">New</span>}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                        {a.alert.subjectLabel}{when ? <> · <span className={cn("font-semibold", a.alert.priority === "overdue" ? "text-rose-600" : a.alert.priority === "critical" ? "text-orange-600" : "text-slate-600")}>{when}</span></> : null}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                    {via && (
                        <span className="max-w-[108px] truncate rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800" title={a.via.join(", ")}>
                            {via}{a.via.length > 1 ? ` +${a.via.length - 1}` : ""}
                        </span>
                    )}
                    <span className="flex items-center gap-0.5 text-slate-300">
                        {a.channels.inApp && <Smartphone className="h-3 w-3" aria-label="In-app" />}
                        {a.channels.email && <Mail className="h-3 w-3" aria-label="Email" />}
                    </span>
                </span>
            </button>
        </li>
    );
}

/** One thread sent to this person: what it was about, the last line, when. */
function MessageRow({ m, isNew, onOpen }: { m: InboxMessage; isNew: boolean; onOpen: () => void }) {
    return (
        <li>
            <button type="button" onClick={onOpen} title={m.preview} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><MessageSquare className="h-3.5 w-3.5" /></span>
                <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-slate-900">{m.about}</span>
                        {isNew && <span className="shrink-0 rounded-full bg-rose-50 px-1.5 text-[9px] font-bold uppercase tracking-wide text-rose-600">New</span>}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">{m.preview}</span>
                </span>
                <span className="shrink-0 text-[10px] tabular-nums text-slate-400">{m.at}</span>
            </button>
        </li>
    );
}
