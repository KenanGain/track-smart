import { useState } from "react";
import { FileSignature, Send, Check, FileText, BadgeCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, ReviewSignOff, newSignOff, type SignOffData } from "./FormKit";
import { FormScaffold } from "./FormScaffold";
import { EmployerRequestDialog } from "./EmployerRequestDialog";
import { SendDocumentDialog } from "./SendDocumentDialog";
import { EmployerDocTile } from "./EmployerDocTile";
import { usePrefill, type PrefillEmployer } from "./application-prefill";
import { type DocStatus } from "./applicants.data";
import type { DocSection } from "./FormDocument";

/**
 * Employment Verification — the Workflows form mirrors the hiring-file employer review:
 * per previous employer, the full employer details, an actionable verification status +
 * activity log, the verification documents (driver-provided or asked from the employer),
 * an itemised review checklist, and the reviewer sign-off.
 */

const DOCS = [
    { key: "experience", label: "Employer Experience Letter" },
    { key: "insurance", label: "Insurance Experience Letter" },
] as const;
type DocKey = (typeof DOCS)[number]["key"];
const MAX_ATTEMPTS = 5;

type DocState = { source: "driver" | "employer"; requested: boolean; received: boolean; fileName: string };
type VStatus = "pending" | "sent" | "responded" | "verified";
type ActItem = { at: number; title: string; detail: string; dot: string };
type EmpV = { status: VStatus; attempts: number; contact: string; respondedAt?: number; verifiedAt?: number; activity: ActItem[]; docs: Record<DocKey, DocState> };

const wantsEmployer = (e: PrefillEmployer, key: DocKey) => (e.askDocs ?? []).some((d) => d.toLowerCase().includes(key));
const newEmpV = (e: PrefillEmployer): EmpV => ({
    status: "pending", attempts: 0, contact: "", activity: [],
    docs: Object.fromEntries(DOCS.map((d) => [d.key, { source: wantsEmployer(e, d.key) ? "employer" : "driver", requested: false, received: false, fileName: "" } as DocState])) as Record<DocKey, DocState>,
});

const PLACEHOLDER: PrefillEmployer = { employer: "Previous Employer", position: "", dates: "", from: "", to: "", reason: "", askDocs: [], telephone: "", address: "", terminated: "", current: "", operatedCMV: "" };
const fileNameOf = (label: string) => `${label.toLowerCase().replace(/\s+/g, "-")}.pdf`;
const now = () => Date.now();
const ago = (at: number) => { const s = Math.floor((now() - at) / 1000); if (s < 60) return "just now"; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };
const STATUS_LABEL: Record<VStatus, string> = { pending: "Not requested", sent: "Sent", responded: "Responded", verified: "Verified" };

type Chk = { label: string; ok: boolean; actionLabel?: string; onAction?: () => void };

function CheckRow({ ok, label, actionLabel, onAction }: Chk) {
    return (
        <li className="flex items-center justify-between gap-2">
            <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                {ok ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                <span className={ok ? "text-slate-600" : "text-amber-700"}>{label}</span>
            </span>
            {!ok && actionLabel && onAction && (
                <button type="button" onClick={onAction} className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">{actionLabel}</button>
            )}
        </li>
    );
}

function RoField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <div className="mt-1.5 min-h-[2.5rem] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{value || "—"}</div>
        </div>
    );
}

export function EmploymentVerificationForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const employers = pf?.employment?.length ? pf.employment : [PLACEHOLDER];
    const gaps = pf?.unemployment ?? [];

    const [data, setData] = useState<EmpV[]>(() => employers.map(newEmpV));
    const [gapData, setGapData] = useState<boolean[]>(() => gaps.map(() => false));
    const [comments, setComments] = useState("");
    const [signoff, setSignoff] = useState<SignOffData>(newSignOff());
    const [reqOpen, setReqOpen] = useState<{ empIdx: number; only?: DocKey } | null>(null);
    const [sendDoc, setSendDoc] = useState<{ empIdx: number; label: string } | null>(null);
    const [viewDoc, setViewDoc] = useState<{ label: string; file: string } | null>(null);

    const setDoc = (i: number, key: DocKey, patch: Partial<DocState>) =>
        setData((d) => d.map((e, idx) => (idx === i ? { ...e, docs: { ...e.docs, [key]: { ...e.docs[key], ...patch } } } : e)));
    const patchEmp = (i: number, patch: Partial<EmpV>) => setData((d) => d.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
    const empName = (i: number) => employers[i].employer || `Employer ${i + 1}`;

    const uploadDoc = (i: number, key: DocKey, label: string) => setDoc(i, key, { received: true, fileName: fileNameOf(label) });
    const markReceived = (i: number, key: DocKey, label: string) => setDoc(i, key, { received: true, fileName: fileNameOf(label) });
    const openRequest = (empIdx: number, only?: DocKey) => setReqOpen({ empIdx, only });

    const recordSent = (i: number, to: string) => setData((d) => d.map((e, idx) => idx === i ? {
        ...e, status: e.status === "pending" ? "sent" : e.status, attempts: e.attempts + 1, contact: to || e.contact,
        activity: [{ at: now(), title: `Verification request sent (attempt ${e.attempts + 1})`, detail: `via Email${to ? ` · to ${to}` : ""}`, dot: "bg-amber-500" }, ...e.activity],
    } : e));
    const recordResponse = (i: number) => patchEmp(i, { status: "responded", respondedAt: now(), activity: [{ at: now(), title: "Employer responded", detail: "Response recorded on file", dot: "bg-blue-500" }, ...data[i].activity] });
    const verifyEmp = (i: number) => patchEmp(i, { status: "verified", verifiedAt: now(), activity: [{ at: now(), title: "Verified & signed", detail: "Employment confirmed", dot: "bg-emerald-500" }, ...data[i].activity] });

    const fillSample = () => {
        setData(employers.map((e) => {
            const v = newEmpV(e);
            v.status = "verified"; v.attempts = 1; v.respondedAt = now(); v.verifiedAt = now();
            v.activity = [{ at: now(), title: "Verified & signed", detail: "Employment confirmed", dot: "bg-emerald-500" }, { at: now(), title: "Employer responded", detail: "Response recorded on file", dot: "bg-blue-500" }, { at: now(), title: "Verification request sent (attempt 1)", detail: "via Email", dot: "bg-amber-500" }];
            DOCS.forEach((d) => { v.docs[d.key] = { source: v.docs[d.key].source, requested: v.docs[d.key].source === "employer", received: true, fileName: fileNameOf(d.label) }; });
            return v;
        }));
        setGapData(gaps.map(() => true));
        setComments("Employment history confirmed against the application. Driver-provided letters verified; remaining documents requested from and received by the previous employer. Gap explanations reviewed.");
    };

    const docOk = (v: DocState) => v.received;
    const docSummary = (v: DocState) => `${v.source === "driver" ? "Driver provided" : "From employer"} — ${v.received ? "received" : v.requested ? "requested" : "missing"}`;

    // Per-employer checklist (itemised, like the hiring-file review).
    const empChecks = (i: number): Chk[] => {
        const e = employers[i];
        return [
            { label: "Employer name provided", ok: !!e.employer },
            { label: "Position provided", ok: !!e.position },
            { label: "Employment dates (from / to) provided", ok: !!(e.from || e.to) },
            { label: "Telephone provided", ok: !!e.telephone },
            { label: "Employer address provided", ok: !!e.address },
            { label: "Reason for leaving provided", ok: !!e.reason },
            { label: "Terminated / discharged / laid off answered", ok: !!e.terminated },
            { label: "Current-employer question answered", ok: !!e.current },
            { label: "Operated commercial motor vehicle answered", ok: !!e.operatedCMV },
            ...DOCS.map((d) => ({ label: `${d.label} received`, ok: docOk(data[i].docs[d.key]), actionLabel: data[i].docs[d.key].received ? undefined : (data[i].docs[d.key].source === "employer" ? "Ask employer" : "Mark received"), onAction: () => (data[i].docs[d.key].source === "employer" ? openRequest(i, d.key) : markReceived(i, d.key, d.label)) })),
            { label: "Employment dates & position verified", ok: data[i].status === "verified", actionLabel: data[i].status === "verified" ? undefined : "Verify", onAction: () => verifyEmp(i) },
        ];
    };

    // PDF sections.
    const sections: DocSection[] = [
        ...employers.map((e, i) => ({
            title: `Employment — ${empName(i)}`,
            groups: [{ rows: [
                { label: "Employer", value: e.employer }, { label: "Position", value: e.position },
                { label: "From", value: e.from }, { label: "To", value: e.to },
                { label: "Telephone", value: e.telephone }, { label: "Employer Address", value: e.address },
                { label: "Reason for leaving", value: e.reason }, { label: "Terminated / Discharged / Laid Off", value: e.terminated },
                { label: "Current Employer", value: e.current }, { label: "Operated Commercial Motor Vehicle", value: e.operatedCMV },
                { label: "Verification status", value: STATUS_LABEL[data[i].status] },
                ...DOCS.map((d) => ({ label: d.label, value: docSummary(data[i].docs[d.key]) })),
            ] }],
        })),
        ...gaps.map((g, i) => ({
            title: `Employment Gap — ${[g.from, g.to].filter(Boolean).join(" – ") || `Period ${i + 1}`}`,
            groups: [{ rows: [{ label: "Period", value: g.dates || [g.from, g.to].filter(Boolean).join(" – ") }, { label: "Explanation", value: g.comments }, { label: "Gap explained & verified", value: gapData[i] ? "Yes" : "No" }] }],
        })),
        ...(comments ? [{ title: "Comments", groups: [{ rows: [{ label: "Comments", value: comments }] }] }] : []),
        { title: "Reviewer Sign-Off", groups: [signoff.done
            ? { rows: [{ label: "Reviewed by", value: signoff.name }, { label: "Title", value: signoff.role }, { label: "Date", value: signoff.date }, { label: "Status", value: "Reviewed & signed" }], images: signoff.sig ? [signoff.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending review — not yet signed" }] }] },
    ];

    // One document tile — shared with the hiring-file review (icon + status + inline actions, no toggle).
    const DocTile = ({ i, doc }: { i: number; doc: (typeof DOCS)[number] }) => {
        const v = data[i].docs[doc.key];
        const status: DocStatus = v.received ? "received" : v.requested ? "requested" : "pending";
        return (
            <EmployerDocTile
                label={doc.label} status={status} source={v.source}
                onUpload={() => uploadDoc(i, doc.key, doc.label)}
                onAsk={() => openRequest(i, doc.key)}
                onView={() => setViewDoc({ label: doc.label, file: v.fileName })}
                onReplace={() => uploadDoc(i, doc.key, doc.label)}
                onSend={() => setSendDoc({ empIdx: i, label: doc.label })}
            />
        );
    };

    return (
        <FormScaffold
            title="Employment Verification" Icon={FileSignature} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview}
            docTitle="Employment Verification" docSubtitle={`${employers.length} employment${employers.length === 1 ? "" : "s"}`} sections={sections} branding={branding} fileName="employment-verification.pdf"
            intro={<>Each previous employer from the application is reviewed independently — confirm the employer details, request &amp; verify the documents (driver-provided or asked from the employer), then sign off below.</>}
        >
            {employers.map((e, i) => {
                const v = data[i];
                const askable = DOCS.filter((d) => v.docs[d.key].source === "employer");
                const detailRows = [
                    { label: "Employer", value: e.employer }, { label: "Position", value: e.position },
                    { label: "From", value: e.from }, { label: "To", value: e.to },
                    { label: "Telephone", value: e.telephone }, { label: "Employer Address", value: e.address },
                    { label: "Reason for Leaving", value: e.reason }, { label: "Terminated / Discharged / Laid Off", value: e.terminated },
                    { label: "Current Employer", value: e.current }, { label: "Operated Commercial Motor Vehicle", value: e.operatedCMV },
                ];
                const verifyRows = [
                    { label: "Verification Status", value: v.attempts ? `${STATUS_LABEL[v.status]} · ${v.attempts}/${MAX_ATTEMPTS}` : STATUS_LABEL[v.status] },
                    { label: "Contact", value: v.contact || "—" },
                    { label: "Attempts", value: `${v.attempts} / ${MAX_ATTEMPTS}` },
                    { label: "Responded", value: v.respondedAt ? ago(v.respondedAt) : "—" },
                    { label: "Verified", value: v.verifiedAt ? ago(v.verifiedAt) : "—" },
                ];
                return (
                    <div key={i} className="space-y-5">
                        {/* Employer details */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{i + 1}</span>
                                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Employer Details — as the driver provided</h2>
                                </div>
                                {(e.from || e.to) && <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"><span className="font-normal text-slate-400">From</span> {e.from || "—"} <span className="font-normal text-slate-400">to</span> {e.to || "Present"}</span>}
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2">{detailRows.map((r) => <RoField key={r.label} label={r.label} value={r.value} />)}</div>
                        </div>

                        {/* Verification status — actionable */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Verification</h2>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {v.status !== "verified" && <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" disabled={v.attempts >= MAX_ATTEMPTS} onClick={() => openRequest(i)}><Send className="h-3.5 w-3.5" /> {v.attempts ? "Resend request" : "Send request"}</Button>}
                                    {v.status === "sent" && <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => recordResponse(i)}><Check className="h-3.5 w-3.5" /> Record response</Button>}
                                    {v.status === "responded" && <Button size="sm" className="h-7 gap-1 px-2.5 text-xs" onClick={() => verifyEmp(i)}><BadgeCheck className="h-3.5 w-3.5" /> Verify</Button>}
                                    {v.status === "verified" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Check className="h-3 w-3" /> Verified</span>}
                                </div>
                            </div>
                            <div className="grid gap-4 p-5 sm:grid-cols-2">{verifyRows.map((r) => <RoField key={r.label} label={r.label} value={r.value} />)}</div>
                        </div>

                        {/* Verification activity */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Verification Activity</h2>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{v.attempts} / {MAX_ATTEMPTS} attempts</span>
                            </div>
                            {v.activity.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-slate-400">No activity yet — send a verification request to this employer to begin.</p>
                            ) : (
                                <ol className="p-5">
                                    {v.activity.map((ev, ai) => (
                                        <li key={ai} className="relative flex gap-3 pb-4 last:pb-0">
                                            <div className="relative flex w-3 shrink-0 flex-col items-center">
                                                <span className={cn("z-10 mt-1 h-3 w-3 rounded-full ring-4 ring-white", ev.dot)} />
                                                {ai < v.activity.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-800">{ev.title}</p><span className="text-xs text-slate-400">{ago(ev.at)}</span></div>
                                                <p className="text-xs text-slate-500">{ev.detail}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>

                        {/* Verification documents */}
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Verification Documents</h2>
                                {askable.length > 0 && <Button variant="outline" size="sm" className="h-7 gap-1.5 px-3 text-xs" onClick={() => openRequest(i)}><Send className="h-3.5 w-3.5" /> Ask employer</Button>}
                            </div>
                            <div className="grid gap-3 p-5 sm:grid-cols-2">{DOCS.map((doc) => <DocTile key={doc.key} i={i} doc={doc} />)}</div>
                        </div>

                        {/* Review checklist for this employer */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review Checklist — {empName(i)}</p>
                            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{empChecks(i).map((c, ci) => <CheckRow key={ci} {...c} />)}</ul>
                        </div>
                    </div>
                );
            })}

            {gaps.map((g, i) => (
                <div key={`gap-${i}`} className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 pb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">!</span>
                            <h2 className="text-sm font-bold text-slate-900">Employment Gap</h2>
                        </div>
                        {(g.from || g.to) && <span className="rounded-lg border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600"><span className="font-normal text-slate-400">From</span> {g.from || "—"} <span className="font-normal text-slate-400">to</span> {g.to || "Present"}</span>}
                    </div>
                    <Field label="Explanation (as the applicant provided)"><Input readOnly value={g.comments} className="bg-white" /></Field>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={gapData[i]} onChange={(ev) => setGapData((d) => d.map((x, idx) => (idx === i ? ev.target.checked : x)))} /> Gap explanation reviewed &amp; verified.</label>
                </div>
            ))}

            <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Comments</p>
                <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add a comment…" className="resize-none" />
            </div>

            <ReviewSignOff heading="I have reviewed the employment verification above." value={signoff} onChange={setSignoff} />

            {/* Shared ask-employer module */}
            {reqOpen && (() => {
                const e = employers[reqOpen.empIdx];
                const v = data[reqOpen.empIdx];
                const period = e.dates || [e.from, e.to].filter(Boolean).join(" – ");
                return (
                    <EmployerRequestDialog
                        employerName={e.employer}
                        applicantName={pf?.fullName ?? "the applicant"}
                        period={period}
                        brandName={branding.name}
                        attemptLabel={`attempt ${v.attempts + 1} of ${MAX_ATTEMPTS}`}
                        prefill={{ email: v.contact, phone: e.telephone, address: e.address }}
                        docs={DOCS.map((d) => ({ key: d.key, label: d.label, preselected: reqOpen.only ? d.key === reqOpen.only : v.docs[d.key].source === "employer", received: v.docs[d.key].received }))}
                        forms={[
                            { key: "accident-history", label: "Accident History (§391.23)", preselected: false },
                            { key: "drug-alcohol-history", label: "Drug & Alcohol History (§391.23)", preselected: false },
                        ]}
                        dataRows={[
                            { label: "Employer", value: e.employer }, { label: "Position", value: e.position },
                            { label: "Employment dates", value: period }, { label: "Reason for leaving", value: e.reason },
                        ]}
                        onClose={() => setReqOpen(null)}
                        onSend={({ docKeys, to }) => { docKeys.forEach((k) => setDoc(reqOpen.empIdx, k as DocKey, { source: "employer", requested: true })); recordSent(reqOpen.empIdx, to); setReqOpen(null); }}
                    />
                );
            })()}

            {/* Send an uploaded document to a third party to verify it */}
            {sendDoc && (
                <SendDocumentDialog
                    docLabel={sendDoc.label}
                    applicantName={pf?.fullName ?? "the applicant"}
                    employerName={empName(sendDoc.empIdx)}
                    brandName={branding.name}
                    onClose={() => setSendDoc(null)}
                    onSend={() => setSendDoc(null)}
                />
            )}

            {/* Received-document preview */}
            {viewDoc && (
                <Dialog open onOpenChange={(o) => { if (!o) setViewDoc(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{viewDoc.label}</DialogTitle></DialogHeader>
                        <div className="px-6 pb-6">
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <FileText className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">{viewDoc.file}</p>
                                <p className="text-xs text-slate-400">Document preview unavailable in this prototype.</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </FormScaffold>
    );
}
