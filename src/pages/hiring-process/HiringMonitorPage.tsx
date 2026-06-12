import { useMemo, useState } from "react";
import { Check, FileText, Search, MessageSquarePlus, ChevronDown, ClipboardList, FileSearch, BadgeCheck, Send, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplicants, ACTOR, type Applicant, type AppStatus } from "./applicants.data";
import { useHiringTemplates, type HiringTemplate } from "./hiring-templates.data";

const HP_FILE = "/hiring-process/hiring";

// Friendly phase label per status (the manager's view of where the driver is).
const PHASE: Record<AppStatus, { label: string; dot: string; text: string }> = {
    waiting: { label: "Application sent", dot: "bg-slate-400", text: "text-slate-500" },
    "in-progress": { label: "Application in progress", dot: "bg-blue-500", text: "text-blue-600" },
    submitted: { label: "Applications received", dot: "bg-blue-500", text: "text-blue-600" },
    "under-review": { label: "In progress", dot: "bg-amber-500", text: "text-amber-600" },
    approved: { label: "Hired", dot: "bg-emerald-500", text: "text-emerald-600" },
    rejected: { label: "Rejected", dot: "bg-rose-500", text: "text-rose-600" },
};

// Application form id → matching default driver template (for seeded records).
const TEMPLATE_FOR_FORM: Record<string, string> = { us: "tpl-us", canada: "tpl-canada", "cross-border": "tpl-cross" };

const parseMs = (s: string) => { const t = Date.parse(s); return Number.isNaN(t) ? Date.now() : t; };
const daysAgo = (ms: number) => Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));

export function HiringMonitorPage({ onNavigate, carrierId }: { onNavigate: (path: string) => void; carrierId?: string }) {
    const { applicants, updateOne } = useApplicants();
    const { templates } = useHiringTemplates(carrierId);
    const [query, setQuery] = useState("");

    // Each applicant follows their OWN template's custom steps.
    const resolveTemplate = (a: Applicant): HiringTemplate | undefined =>
        templates.find((t) => t.name === a.template)
        ?? templates.find((t) => t.id === TEMPLATE_FOR_FORM[a.formId])
        ?? templates[0];

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applicants
            .filter((a) => !carrierId || a.carrierId === carrierId)
            .filter((a) => !q || `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(q));
    }, [applicants, carrierId, query]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="border-b border-slate-200 bg-white">
                <div className="px-4 py-5 sm:px-6 lg:px-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Hiring Process</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Hiring</h1>
                    <p className="mt-1 text-sm text-slate-500">Monitor each driver through the hiring workflow. Click a row to open the full hiring file.</p>
                </div>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-700">Applicants <span className="ml-1 font-normal text-slate-400">{rows.length}</span></p>
                        <div className="relative w-full sm:w-64">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search applicants…" className="h-9 pl-9" />
                        </div>
                    </div>

                    {rows.length === 0 ? (
                        <div className="px-5 py-16 text-center text-sm text-slate-400">No applicants match your search.</div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {rows.map((a) => {
                                const tpl = resolveTemplate(a);
                                const steps = tpl?.steps ?? [];
                                return (
                                    <ApplicantRow key={a.id} a={a} steps={steps} templateName={tpl?.name ?? "—"}
                                        current={currentIndexOf(a, steps.length)}
                                        onOpen={() => onNavigate(`${HP_FILE}/${a.id}`)}
                                        onAction={(kind, label) => updateOne(a.id, (prev) => ({
                                            remarks: [{ id: `rm-${Date.now()}`, text: label, at: new Date().toLocaleString(), author: ACTOR }, ...prev.remarks],
                                            events: [{ id: `ev-${Date.now()}`, type: kind, text: label, at: Date.now(), author: ACTOR }, ...prev.events],
                                        }))}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function currentIndexOf(a: Applicant, numSteps: number): number {
    if (numSteps === 0) return 0;
    switch (a.status) {
        case "waiting": return 0;
        case "in-progress": return 0;
        case "submitted": return Math.min(1, numSteps - 1);
        case "under-review": return Math.min(2, numSteps - 1);
        case "approved": return numSteps;            // all done
        case "rejected": return Math.min(2, numSteps - 1);
        default: return 0;
    }
}

function ApplicantRow({ a, steps, templateName, current, onOpen, onAction }: {
    a: Applicant;
    steps: HiringTemplate["steps"];
    templateName: string;
    current: number;
    onOpen: () => void;
    onAction: (kind: string, label: string) => void;
}) {
    const phase = PHASE[a.status];
    const invitedMs = parseMs(a.invitedAt);
    const isApproved = a.status === "approved";
    const isRejected = a.status === "rejected";
    const stepLabel = steps[Math.min(current, steps.length - 1)]?.title ?? "";

    return (
        <div className="px-5 py-4 hover:bg-slate-50/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Applicant */}
                <div className="w-full min-w-0 lg:w-56 lg:shrink-0">
                    <button type="button" onClick={onOpen} className="truncate text-left text-[15px] font-semibold text-blue-700 hover:underline">{a.firstName} {a.lastName}</button>
                    <p className="truncate text-xs text-slate-400">{a.position ?? "Driver"} · {templateName}</p>
                    <span className={cn("mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide", phase.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", phase.dot)} /> {phase.label}
                    </span>
                </div>

                {/* Custom stepper from this applicant's template */}
                <div className="min-w-0 flex-1 overflow-x-auto pb-1">
                    <div className="flex min-w-max items-start">
                        {steps.map((s, i) => {
                            const done = isApproved || i < current;
                            const isCurrent = !isApproved && i === current;
                            const rejectedHere = isRejected && i === current;
                            return (
                                <div key={s.id} className="relative flex min-w-[116px] flex-1 flex-col items-center px-1">
                                    {i > 0 && <span className="absolute left-0 top-[14px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: i <= current || isApproved ? "#10b981" : "#e2e8f0" }} />}
                                    {i < steps.length - 1 && <span className="absolute right-0 top-[14px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: i < current || isApproved ? "#10b981" : "#e2e8f0" }} />}
                                    <Bubble done={done} current={isCurrent} rejected={rejectedHere} attention={isCurrent && (a.status === "waiting" || a.status === "in-progress" || a.status === "submitted")} />
                                    <span className="mt-2 line-clamp-2 max-w-[108px] text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{s.title}</span>
                                </div>
                            );
                        })}
                        {steps.length === 0 && <span className="text-xs text-slate-400">No steps in this workflow.</span>}
                    </div>
                </div>
            </div>

            {/* Footer: meta + actions */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> Applied {a.invitedAt}</span>
                    <span>·</span>
                    <span>{daysAgo(invitedMs)}d in pipeline</span>
                    {!isApproved && !isRejected && stepLabel && <><span>·</span><span className="text-slate-500">On: <span className="font-semibold text-slate-600">{stepLabel}</span></span></>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onOpen}><FileText className="h-4 w-4" /> Open file</Button>
                    {!isApproved && !isRejected && <AskOrderMenu stepLabel={stepLabel} count={a.remarks.length} onAction={onAction} />}
                </div>
            </div>
        </div>
    );
}

function Bubble({ done, current, rejected, attention }: { done: boolean; current: boolean; rejected: boolean; attention: boolean }) {
    if (rejected) return <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm ring-4 ring-rose-100"><AlertCircle className="h-4 w-4" /></span>;
    if (done) return <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"><Check className="h-4 w-4" /></span>;
    if (current) return <span className={cn("z-10 flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm ring-4", attention ? "bg-amber-500 ring-amber-100" : "bg-blue-500 ring-blue-100")}><span className="h-2 w-2 rounded-full bg-white" /></span>;
    return <span className="z-10 h-7 w-7 rounded-full border-2 border-slate-200 bg-white" />;
}

// Ask / Order dropdown — context actions depend on the current step.
function AskOrderMenu({ stepLabel, count, onAction }: { stepLabel: string; count: number; onAction: (kind: string, label: string) => void }) {
    const [open, setOpen] = useState(false);
    const lower = stepLabel.toLowerCase();
    const actions: { kind: string; label: string; Icon: React.ElementType }[] = [
        { kind: "ask", label: "Ask driver for more data", Icon: Send },
    ];
    if (/record|psp|mvr|abstract|background|testing|screen|driving/.test(lower)) actions.push({ kind: "order", label: `Order ${stepLabel} report`, Icon: FileSearch });
    if (/employ|verif/.test(lower)) actions.push({ kind: "verify", label: "Verify employment", Icon: BadgeCheck });
    actions.push({ kind: "remark", label: "Add a remark", Icon: MessageSquarePlus });

    return (
        <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
                <MessageSquarePlus className="h-4 w-4" /> Ask / Order
                {count > 0 && <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{count}</span>}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Actions · {stepLabel || "Step"}</p>
                        {actions.map((act) => (
                            <button key={act.kind} type="button" onClick={() => { onAction(act.kind, act.label); setOpen(false); }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                                <act.Icon className="h-4 w-4 text-slate-400" /> {act.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
