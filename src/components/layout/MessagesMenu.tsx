import * as React from "react";
import { Bot, CheckCheck, ExternalLink, Mail, MessageSquare, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/data/users.data";
import { markRead, setMessagesFocus, useConversations, type ChatMessage, type Conversation } from "@/pages/messages/messages-store";
import { currentChatViewer, isOutgoing, visibleConversations } from "@/pages/messages/chat-viewer";

// ─────────────────────────────────────────────────────────────────────────────
// The chat icon — the threads waiting on the signed-in person.
//
// It used to be a plain link to Messages with a blue dot. Now it answers the question the
// dot only hinted at: which threads have something unread, who they are with, and what the
// last line said — the same seat logic as the Messages page (a driver sees their own thread,
// the office sees the carrier's). A row opens that thread; "Mark all read" clears the badge
// without opening anything.
// ─────────────────────────────────────────────────────────────────────────────

type Filter = "all" | "unread" | "internal" | "external";
const MAX_SHOWN = 12;

const initialsOf = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
const lastIso = (c: Conversation) => c.messages[c.messages.length - 1]?.iso ?? c.createdIso ?? "";

/** The last line of a thread, said the way the list on the Messages page says it. */
function previewOf(m: ChatMessage | undefined, mine: boolean): { text: string; attachment: boolean } {
    if (!m) return { text: "No messages yet", attachment: false };
    const body = m.text?.trim()
        || (m.attachments?.length ? `${m.attachments.length} attachment${m.attachments.length === 1 ? "" : "s"}` : "")
        || (m.widget ? "Task card" : m.compliance ? "Compliance request" : m.record ? "Shared a record" : m.resource ? "Resource link" : m.panel ? "Data card" : m.action ? "Action" : "");
    return { text: m.system ? body : mine ? `You: ${body}` : body, attachment: !!m.attachments?.length && !m.text?.trim() };
}

export function MessagesMenu({ user, onNavigate }: { user: AppUser; onNavigate?: (path: string) => void }) {
    const conversations = useConversations();
    const [open, setOpen] = React.useState(false);
    const [filter, setFilter] = React.useState<Filter>("all");
    const ref = React.useRef<HTMLDivElement>(null);
    // Recomputed per person as well as per store change — the seat is read for whoever is signed in.
    const { viewer, visible } = React.useMemo(() => {
        const v = currentChatViewer();
        return { viewer: v, visible: visibleConversations(conversations, v) };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversations, user.id]);
    const unread = React.useMemo(() => visible.filter((c) => c.unread > 0), [visible]);
    const unreadMessages = unread.reduce((n, c) => n + c.unread, 0);

    React.useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
    }, [open]);

    // Unread first, then the most recent — a thread with something waiting outranks a newer quiet one.
    const list = React.useMemo(() => {
        const f = visible.filter((c) => filter === "all" ? true : filter === "unread" ? c.unread > 0 : c.kind === filter);
        return [...f].sort((a, b) => ((b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0)) || lastIso(b).localeCompare(lastIso(a))).slice(0, MAX_SHOWN);
    }, [visible, filter]);

    const openThread = (c: Conversation) => {
        setOpen(false);
        setMessagesFocus(c.id);
        onNavigate?.("/messages");
    };
    const markAll = () => unread.forEach((c) => markRead(c.id));

    const counts = {
        all: visible.length,
        unread: unread.length,
        internal: visible.filter((c) => c.kind === "internal").length,
        external: visible.filter((c) => c.kind === "external").length,
    };
    // A driver has one seat and one kind of thread — the kind chips would be noise.
    const chips: { id: Filter; label: string }[] = viewer.asDriver
        ? [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }]
        : [{ id: "all", label: "All" }, { id: "unread", label: "Unread" }, { id: "internal", label: "Team" }, { id: "external", label: "Outside" }];
    const badge = unread.length > 99 ? "99+" : String(unread.length);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={unread.length ? `Messages · ${unread.length} unread` : "Messages"}
                title={unread.length ? `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"} in ${unread.length} chat${unread.length === 1 ? "" : "s"}` : "Messages"}
                className={cn("relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900",
                    open && "bg-slate-100 text-slate-900")}
            >
                <MessageSquare size={17} />
                {unread.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-white">
                        {badge}
                    </span>
                )}
            </button>

            {open && (
                <div role="dialog" aria-label="Messages" className="absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">Messages</p>
                            <p className="truncate text-[11px] text-slate-500">
                                {unread.length ? `${unreadMessages} unread in ${unread.length} chat${unread.length === 1 ? "" : "s"}` : "You're all caught up"} · {visible.length} thread{visible.length === 1 ? "" : "s"}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {unread.length > 0 && (
                                <button type="button" onClick={markAll} title="Mark every thread as read"
                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                                </button>
                            )}
                            {onNavigate && (
                                <button type="button" onClick={() => { setOpen(false); onNavigate("/messages"); }}
                                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline">
                                    Open <ExternalLink className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-100 px-3 py-1.5">
                        {chips.map((c) => (
                            <button key={c.id} type="button" onClick={() => setFilter(c.id)}
                                className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                                    filter === c.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                                {c.label}
                                <span className={cn("tabular-nums", filter === c.id ? "text-slate-300" : "text-slate-400")}>{counts[c.id]}</span>
                            </button>
                        ))}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto">
                        {list.length === 0 ? (
                            <div className="px-6 py-10 text-center">
                                <MessageSquare className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{filter === "unread" ? "Nothing unread" : "No threads here"}</p>
                                <p className="mt-1 text-[12px] text-slate-500">
                                    {viewer.asDriver ? "What the office sends you lands here." : "Chats with drivers, the team and outside contacts land here as they start."}
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {list.map((c) => {
                                    const last = c.messages[c.messages.length - 1];
                                    const p = previewOf(last, last ? isOutgoing(last, viewer) : false);
                                    const hex = c.color?.startsWith("#");
                                    return (
                                        <li key={c.id}>
                                            <button type="button" onClick={() => openThread(c)} title={`${c.name} · ${c.role}`}
                                                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50", c.status === "disabled" && "opacity-60")}>
                                                <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white", !hex && (c.color || "bg-slate-500"))}
                                                    style={hex ? { backgroundColor: c.color } : undefined}>
                                                    {c.ai ? <Bot className="h-4 w-4" /> : initialsOf(c.name)}
                                                    {c.online && <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="flex min-w-0 items-center gap-1.5">
                                                        <span className={cn("truncate text-[13px] text-slate-900", c.unread > 0 ? "font-bold" : "font-semibold")}>{c.name}</span>
                                                        <span className="shrink-0 rounded border border-slate-200 bg-slate-50 px-1 text-[9px] font-bold uppercase tracking-wide text-slate-500">{c.roleTag}</span>
                                                        {c.kind === "external" && <Mail className="h-3 w-3 shrink-0 text-slate-400" aria-label="Outside contact" />}
                                                    </span>
                                                    <span className={cn("flex min-w-0 items-center gap-1 text-[11px]", c.unread > 0 ? "text-slate-700" : "text-slate-500")}>
                                                        {p.attachment && <Paperclip className="h-3 w-3 shrink-0" />}
                                                        <span className="truncate">{p.text}</span>
                                                    </span>
                                                </span>
                                                <span className="flex shrink-0 flex-col items-end gap-1">
                                                    <span className="text-[10px] tabular-nums text-slate-400">{c.lastAt}</span>
                                                    {c.unread > 0 && (
                                                        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold leading-none text-white">{c.unread}</span>
                                                    )}
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    {visible.length > list.length && (
                        <p className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-500">
                            {list.length} of {visible.length}
                            {onNavigate && <> · <button type="button" onClick={() => { setOpen(false); onNavigate("/messages"); }} className="font-semibold text-blue-600 hover:underline">see all in Messages</button></>}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
