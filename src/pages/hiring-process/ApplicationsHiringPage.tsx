import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserPlus, Search, Mail, MessageSquare, X, Eye, Send, ChevronRight, ChevronLeft, ChevronDown, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { APPLICATION_FORMS } from "./ApplicationSettingsPage";
import { useHiringTemplates, totalForms, stepGroup, type HiringTemplate } from "./hiring-templates.data";
import { useApplicants, STATUS_META, STATUS_ORDER, STATUS_VERB, relativeTime, formName, formRegion, type AppStatus, type Applicant } from "./applicants.data";

/**
 * Hiring Process -> Applications
 *
 * The application monitoring board: issue a hiring file (invite an applicant
 * against an application form), track each applicant through the pipeline, and
 * change status inline. "View" opens the applicant's filled application.
 */

const HP_PATH = "/hiring-process/applications";

// The three application forms offered when inviting a driver.
const DRIVER_TYPE_IDS = ["us", "canada", "cross-border"];

const CARRIERS = ["Acme Logistics", "Northwind Transport", "Blue Ridge Freight"];

// Count consents (policy/signature forms) vs data forms inside a template.
const consentCount = (t: HiringTemplate) => t.steps.reduce((n, s) => n + s.formIds.filter((f) => stepGroup(f) === "Policy").length, 0);
const formCount = (t: HiringTemplate) => totalForms(t) - consentCount(t);

const initials = (a: Applicant) => `${a.firstName[0] ?? ""}${a.lastName[0] ?? ""}`.toUpperCase();

export function ApplicationsHiringPage({ onNavigate, carrierId, carrierName }: { onNavigate: (path: string) => void; carrierId?: string; carrierName?: string }) {
    const { applicants, addMany, updateOne } = useApplicants();
    const [filter, setFilter] = useState<AppStatus | "all">("all");
    const [query, setQuery] = useState("");
    const [inviteOpen, setInviteOpen] = useState(false);

    // Everything on this page is scoped to the carrier selected in the top bar.
    const scoped = useMemo(
        () => (carrierId ? applicants.filter((a) => a.carrierId === carrierId) : applicants),
        [applicants, carrierId],
    );

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: scoped.length };
        for (const s of STATUS_ORDER) c[s] = scoped.filter((a) => a.status === s).length;
        return c;
    }, [scoped]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return scoped.filter((a) => {
            if (filter !== "all" && a.status !== filter) return false;
            if (!q) return true;
            return `${a.firstName} ${a.lastName} ${a.email} ${formName(a.formId)} ${a.carrier}`.toLowerCase().includes(q);
        });
    }, [scoped, filter, query]);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    useEffect(() => { setPage(1); }, [filter, query, pageSize]);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const pageNow = Math.min(page, totalPages);
    const start = (pageNow - 1) * pageSize;
    const pageRows = filtered.slice(start, start + pageSize);

    const kpis: { key: AppStatus | "all"; label: string }[] = [
        { key: "all", label: "Total" },
        { key: "waiting", label: "Waiting" },
        { key: "in-progress", label: "In Progress" },
        { key: "submitted", label: "Submitted" },
        { key: "under-review", label: "Under Review" },
        { key: "approved", label: "Approved" },
        { key: "rejected", label: "Rejected" },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white">
                <div className="flex flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-6 lg:px-8">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Hiring Process</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Applications</h1>
                        <p className="mt-1 text-sm text-slate-500">Issue hiring files and monitor every applicant through the pipeline.</p>
                    </div>
                    <Button onClick={() => setInviteOpen(true)}>
                        <UserPlus className="h-4 w-4" /> Invite new applicant
                    </Button>
                </div>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
                {/* KPI cards — also act as status filters */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
                    {kpis.map((k) => {
                        const active = filter === k.key;
                        return (
                            <button
                                key={k.key}
                                type="button"
                                onClick={() => setFilter(k.key)}
                                className={cn(
                                    "rounded-xl border bg-white px-4 py-3 text-left transition hover:border-blue-300 hover:shadow-sm",
                                    active ? "border-blue-400 ring-1 ring-blue-200" : "border-slate-200",
                                )}
                            >
                                <p className="text-xl font-bold leading-none text-slate-900">{counts[k.key] ?? 0}</p>
                                <p className="mt-1.5 text-[11px] font-medium text-slate-500">{k.label}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Table card */}
                <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-700">
                            {filter === "all" ? "All applicants" : STATUS_META[filter].label}
                            <span className="ml-2 font-normal text-slate-400">{total}</span>
                            {filter !== "all" && (
                                <button type="button" onClick={() => setFilter("all")} className="ml-2 text-xs font-medium text-blue-600 hover:underline">Clear</button>
                            )}
                        </p>
                        <div className="relative sm:w-72">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants…" className="h-9 pl-9" />
                        </div>
                    </div>

                    {/* Column header */}
                    <div className="hidden items-center gap-4 bg-slate-50/60 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:flex">
                        <span className="flex-1">Applicant</span>
                        <span className="w-40">Application Form</span>
                        <span className="w-32">Carrier</span>
                        <span className="w-28">Progress</span>
                        <span className="w-32">Status</span>
                        <span className="w-28">Updated</span>
                        <span className="w-16 text-right">Action</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {pageRows.map((a) => {
                            const pct = Math.round((a.stepsDone / a.stepsTotal) * 100);
                            return (
                                <div key={a.id} className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/70 lg:flex-row lg:items-center lg:gap-4">
                                    <button type="button" onClick={() => onNavigate(`${HP_PATH}/${a.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white">{initials(a)}</div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600">{a.firstName} {a.lastName}</p>
                                            <p className="truncate text-xs text-slate-500">{a.email}</p>
                                        </div>
                                    </button>
                                    <div className="lg:w-40">
                                        <p className="truncate text-sm font-medium text-slate-700">{formName(a.formId)}</p>
                                        <p className="text-xs text-slate-400">{formRegion(a.formId)}</p>
                                    </div>
                                    <div className="text-sm text-slate-600 lg:w-32">{a.carrier}</div>
                                    <div className="lg:w-28">
                                        <div className="flex items-center gap-2">
                                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                                <div className={cn("h-full rounded-full", a.status === "rejected" ? "bg-rose-400" : "bg-blue-600")} style={{ width: `${pct}%` }} />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500">{a.stepsDone}/{a.stepsTotal}</span>
                                        </div>
                                    </div>
                                    <div className="lg:w-32">
                                        <StatusSelect value={a.status} onChange={(s) => updateOne(a.id, { status: s })} />
                                    </div>
                                    <div className="lg:w-28">
                                        <p className="text-xs font-semibold text-slate-700">{STATUS_VERB[a.status]}</p>
                                        <p className="text-xs text-slate-400">{relativeTime(a.updatedAt)}</p>
                                    </div>
                                    <div className="flex justify-end lg:w-16">
                                        <Button variant="ghost" size="sm" className="px-2" onClick={() => onNavigate(`${HP_PATH}/${a.id}`)}>
                                            <Eye className="h-4 w-4" /> View
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                        {total === 0 && (
                            <div className="px-5 py-16 text-center text-sm text-slate-500">No applicants match this view.</div>
                        )}
                    </div>

                    {/* Pagination footer */}
                    {total > 0 && (
                        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <span>Rows per page</span>
                                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                                    <SelectTrigger className="h-8 w-[72px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>{[10, 25, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-4">
                                <span>{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={pageNow === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={pageNow === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {inviteOpen && (
                <InviteModal
                    carrierId={carrierId}
                    carrierName={carrierName}
                    onClose={() => setInviteOpen(false)}
                    onCreate={(created) => { addMany(created); setInviteOpen(false); setFilter("all"); }}
                />
            )}
        </div>
    );
}

// Inline editable status — a simple coloured chip with a portal dropdown.
export function StatusSelect({ value, onChange }: { value: AppStatus; onChange: (s: AppStatus) => void }) {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const meta = STATUS_META[value];

    const toggle = () => {
        if (!open && btnRef.current) {
            const r = btnRef.current.getBoundingClientRect();
            setCoords({ top: r.bottom + 4, left: r.left });
        }
        setOpen((o) => !o);
    };

    return (
        <>
            <button
                ref={btnRef}
                type="button"
                onClick={toggle}
                className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition hover:opacity-90", meta.badge)}
            >
                {meta.label}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {open && createPortal(
                <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
                    <div className="fixed z-[61] w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg" style={{ top: coords.top, left: coords.left }}>
                        {STATUS_ORDER.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => { onChange(s); setOpen(false); }}
                                className={cn("flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-slate-50", s === value && "bg-slate-50")}
                            >
                                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_META[s].badge)}>{STATUS_META[s].label}</span>
                                {s === value && <Check className="h-3.5 w-3.5 text-blue-600" />}
                            </button>
                        ))}
                    </div>
                </>,
                document.body,
            )}
        </>
    );
}

// ----------------------------- invite modal -----------------------------
function StepRow({ n, title, desc, children }: { n: number; title: string; desc: string; children: React.ReactNode }) {
    return (
        <div className="flex gap-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{n}</div>
            <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                <p className="text-xs text-slate-500">{desc}</p>
                <div className="mt-3">{children}</div>
            </div>
        </div>
    );
}

function InviteModal({ carrierId, carrierName, onClose, onCreate }: { carrierId?: string; carrierName?: string; onClose: () => void; onCreate: (created: Applicant[]) => void }) {
    const { templates } = useHiringTemplates(carrierId);
    const [formId, setFormId] = useState("us");
    const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
    // The carrier is inherited from the top-bar selection — you issue files for
    // the carrier you're currently working in.
    const carrier = carrierName ?? CARRIERS[0];
    const [emails, setEmails] = useState<string[]>([]);
    const [emailInput, setEmailInput] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [position, setPosition] = useState("");
    const [sendVia, setSendVia] = useState<"email" | "sms">("email");
    const [dueDate, setDueDate] = useState("");
    const [message, setMessage] = useState("Hi — please complete your driver hiring application using the link below.");

    const template = templates.find((t) => t.id === templateId) ?? templates[0];
    const templateName = template?.name ?? "";

    const addEmail = (raw: string) => {
        const e = raw.trim().replace(/,$/, "");
        if (e && !emails.includes(e)) setEmails((p) => [...p, e]);
        setEmailInput("");
    };
    const onEmailKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEmail(emailInput); }
        else if (e.key === "Backspace" && !emailInput && emails.length) setEmails((p) => p.slice(0, -1));
    };

    const allEmails = emailInput.trim() ? [...emails, emailInput.trim()] : emails;
    const canSend = allEmails.length > 0;

    const send = () => {
        const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const single = allEmails.length === 1;
        const created: Applicant[] = allEmails.map((email, i) => ({
            id: `new-${Date.now()}-${i}`,
            firstName: single && firstName ? firstName : email.split("@")[0].split(/[._]/)[0].replace(/^\w/, (c) => c.toUpperCase()),
            lastName: single && lastName ? lastName : "",
            email,
            formId, carrier, carrierId, template: templateName,
            status: "waiting", stepsDone: 0, stepsTotal: template ? template.steps.length : 0, invitedAt: today, updatedAt: Date.now(),
            phone: single ? phone : undefined,
            position: single ? position : undefined,
            remarks: [],
            events: [{ id: `e-${Date.now()}-${i}`, type: "invited", text: "Application issued to the driver", at: Date.now(), author: "Kenan Gain" }],
        }));
        onCreate(created);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[92vh] max-w-2xl flex-col p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><UserPlus className="h-4 w-4" /></span>
                        Invite new applicant
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Set up the hiring file, then email the driver their application link.</p>
                </DialogHeader>

                <div className="flex-1 space-y-7 overflow-y-auto px-6 py-6">
                    <StepRow n={1} title="Driver type" desc="Determines the application form and which documents are required.">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {APPLICATION_FORMS.filter((f) => DRIVER_TYPE_IDS.includes(f.id)).map((f) => {
                                const active = formId === f.id;
                                return (
                                    <button key={f.id} type="button" onClick={() => setFormId(f.id)}
                                        className={cn("flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition", active ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300")}>
                                        <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-blue-600 text-white" : f.accent)}><f.Icon className="h-5 w-5" /></span>
                                        <span className={cn("text-sm font-semibold", active ? "text-blue-700" : "text-slate-800")}>{f.name}</span>
                                        <span className="text-[11px] text-slate-400">{f.region}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </StepRow>

                    <StepRow n={2} title="Hiring workflow" desc="The driver hiring workflow the applicant will complete.">
                        <Select value={templateId} onValueChange={setTemplateId}>
                            <SelectTrigger><SelectValue placeholder="Select a workflow" /></SelectTrigger>
                            <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        {template && (
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                                <span>{template.steps.length} steps</span><span className="text-slate-300">·</span>
                                <span>{formCount(template)} forms</span><span className="text-slate-300">·</span>
                                <span>{consentCount(template)} consents</span>
                            </div>
                        )}
                    </StepRow>

                    <StepRow n={3} title="Carrier" desc="Inherited from the carrier you're working in (top bar).">
                        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700">
                            <Building2 className="h-4 w-4 text-slate-400" /> {carrier}
                        </div>
                    </StepRow>

                    <StepRow n={4} title="Driver emails" desc="Invite one or many — each email gets its own application link.">
                        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                            {emails.map((e) => (
                                <span key={e} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                    {e}<button type="button" onClick={() => setEmails((p) => p.filter((x) => x !== e))} className="text-blue-400 hover:text-blue-600"><X className="h-3 w-3" /></button>
                                </span>
                            ))}
                            <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={onEmailKey} onBlur={() => emailInput && addEmail(emailInput)} placeholder="jane@example.com" className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400" />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">Press Enter or comma to add</p>
                    </StepRow>

                    <StepRow n={5} title="Applicant details" desc="Optional — for a single invite. Leave blank when inviting several.">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div><Label className="text-slate-600">First name</Label><Input className="mt-1.5" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" /></div>
                            <div><Label className="text-slate-600">Last name</Label><Input className="mt-1.5" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" /></div>
                            <div><Label className="text-slate-600">Phone</Label><Input className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" /></div>
                            <div><Label className="text-slate-600">Position</Label><Input className="mt-1.5" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Driver" /></div>
                        </div>
                    </StepRow>

                    <StepRow n={6} title="Invite options" desc="How and when to reach the driver.">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <Label className="text-slate-600">Send via</Label>
                                <div className="mt-1.5 grid grid-cols-2 gap-2">
                                    <Button type="button" variant={sendVia === "email" ? "default" : "outline"} onClick={() => setSendVia("email")}><Mail className="h-4 w-4" /> Email</Button>
                                    <Button type="button" variant={sendVia === "sms" ? "default" : "outline"} onClick={() => setSendVia("sms")}><MessageSquare className="h-4 w-4" /> SMS</Button>
                                </div>
                            </div>
                            <div><Label className="text-slate-600">Due date</Label><Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                        </div>
                        <div className="mt-3">
                            <Label className="text-slate-600">Message / note <span className="font-normal text-slate-400">— included in the invite</span></Label>
                            <Textarea className="mt-1.5" value={message} onChange={(e) => setMessage(e.target.value)} />
                        </div>
                    </StepRow>
                </div>

                <DialogFooter className="mt-0 items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 sm:justify-between">
                    <p className="hidden items-center gap-1.5 text-xs text-slate-500 sm:flex">
                        <ChevronRight className="h-3.5 w-3.5" /> An application link will be {sendVia === "email" ? "emailed" : "texted"} on send.
                    </p>
                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="button" disabled={!canSend} onClick={send}><Send className="h-4 w-4" /> Send invite</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
