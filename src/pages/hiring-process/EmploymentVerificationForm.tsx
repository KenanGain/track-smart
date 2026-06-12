import { forwardRef, useRef, useState } from "react";
import { ChevronLeft, Eye, Printer, Download, Sparkles, FileSignature, Trash2, Send } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompanyBranding, type CompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, ToggleRow, CheckRows, FilesUpload } from "./FormKit";
import { usePrefill, type ApplicantPrefill } from "./application-prefill";

/**
 * Employment Verification — the reference form SENT TO each previous employer.
 * The applicant authorizes release (§391.23 / §40.25); the previous employer
 * confirms employment, signs, and returns the completed response. The hiring
 * manager verifies and signs on the hiring dashboard (not on this form).
 */

const DOC_TYPES = ["Employer Performance Verification", "Employer Experience Letter", "Insurance Experience Letter"];

type Values = {
    // Authorization (applicant)
    printName: string; ssn: string; dob: string;
    prevEmployer: string; prevEmail: string; prevPhone: string; prevAddress: string;
    toCompany: string; attention: string; toPhone: string; toAddress: string; prospectiveEmail: string;
    docs: string[];
    // §391.23 Employment Verification (employer)
    wasEmployed: boolean; empName: string; empTitle: string; empDateSigned: string;
    // Completed response returned by the employer
    responseIssueDate: string; responseFiles: string[];
};

const initial = (b: CompanyBranding, pf?: ApplicantPrefill | null): Values => ({
    printName: pf?.fullName ?? "", ssn: pf?.ssn ?? "", dob: pf?.dob ?? "",
    prevEmployer: pf?.employment[0]?.employer ?? "", prevEmail: "", prevPhone: "", prevAddress: pf?.address.full ?? "",
    toCompany: b.name, attention: "", toPhone: b.phone ?? "", toAddress: b.address ?? "", prospectiveEmail: b.email ?? "",
    docs: ["Employer Performance Verification"],
    wasEmployed: false, empName: "", empTitle: "", empDateSigned: "",
    responseIssueDate: "", responseFiles: [],
});

export function EmploymentVerificationForm({ onBack, embedded }: { onBack: () => void; embedded?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const [v, setV] = useState<Values>(() => initial(branding, pf));
    const [applicantSig, setApplicantSig] = useState("");
    const [empSig, setEmpSig] = useState("");

    const [preview, setPreview] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);

    const set = (patch: Partial<Values>) => setV((p) => ({ ...p, ...patch }));
    const toggleDoc = (item: string) => set({ docs: v.docs.includes(item) ? v.docs.filter((x) => x !== item) : [...v.docs, item] });

    const fillSample = () => {
        setV({
            ...v,
            printName: "Jane Doe", ssn: "***-**-4471", dob: "1988-03-14",
            prevEmployer: "Roadrunner Freight", prevEmail: "hr@roadrunnerfreight.com", prevPhone: "(312) 555-0190", prevAddress: "500 Depot St, Springfield, IL 62701",
            toCompany: branding.name, attention: "Hiring Manager", toPhone: branding.phone ?? "", toAddress: branding.address ?? "", prospectiveEmail: branding.email ?? "",
            docs: ["Employer Performance Verification", "Employer Experience Letter"],
            wasEmployed: true, empName: "Robert King", empTitle: "HR Manager", empDateSigned: "2026-06-02",
            responseIssueDate: "2026-06-02", responseFiles: [],
        });
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
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save("employment-verification.pdf");
        } finally { setDownloading(false); }
    };

    const SectionHead = ({ title, sub }: { title: string; sub?: string }) => (
        <div className="rounded-t-xl border-x border-t border-slate-200 bg-slate-50/70 px-5 py-3">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><span className="h-4 w-1 rounded bg-blue-600" /> {title}</h2>
            {sub && <p className="ml-3 mt-0.5 text-xs text-slate-500">{sub}</p>}
        </div>
    );
    const Card = ({ children }: { children: React.ReactNode }) => <div className="space-y-5 rounded-b-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>;

    return (
        <div className={embedded ? "" : "min-h-screen bg-slate-50"}>
            <style>{`@media print {
                body * { visibility: hidden !important; }
                #app-doc, #app-doc * { visibility: visible !important; }
                #app-doc { position: absolute !important; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                .no-print { display: none !important; }
            }`}</style>

            {/* Top bar */}
            <div className={`${embedded ? "hidden" : "no-print"} flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3`}>
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Forms
                </button>
                {preview ? (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPreview(false)}>Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
                        <Button size="sm" onClick={downloadPdf} disabled={downloading}><Download className="h-4 w-4" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={fillSample}><Sparkles className="h-4 w-4" /> Fill sample data</Button>
                        <Button variant="outline" size="sm" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                    </div>
                )}
            </div>

            {preview ? (
                <div className="px-6 py-8">
                    <VerificationDocument ref={docRef} v={v} applicantSig={applicantSig} empSig={empSig} branding={branding} />
                </div>
            ) : (
                <div className={embedded ? "space-y-6" : "mx-auto max-w-3xl space-y-6 px-6 py-6"}>
                    <div className={embedded ? "hidden" : undefined}>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Form</p>
                        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><FileSignature className="h-6 w-6 text-blue-600" /> Employment Verification</h1>
                    </div>

                    {/* Sent-to-employer banner */}
                    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600"><Send className="h-4 w-4" /></div>
                        <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">This form is sent to the previous employer to complete and return.</span> The applicant authorizes the release below (§391.23 / §40.25); the previous employer confirms employment, signs, and returns the completed response. The hiring manager verifies and signs on the hiring dashboard.</p>
                    </div>

                    {/* 1. Request for Safety Performance History (applicant authorization) */}
                    <div>
                        <SectionHead title="Request for Safety Performance History" sub="Completed by the applicant authorizing release of safety-performance and DOT testing history." />
                        <Card>
                            <Field label="I, (Print Name)" required><Input value={v.printName} onChange={(e) => set({ printName: e.target.value })} /></Field>
                            <Grid>
                                <Field label="Social Security Number"><Input value={v.ssn} onChange={(e) => set({ ssn: e.target.value })} /></Field>
                                <Field label="Date of Birth"><Input type="date" value={v.dob} onChange={(e) => set({ dob: e.target.value })} /></Field>
                            </Grid>
                            <Field label="Previous Employer" required><Input value={v.prevEmployer} onChange={(e) => set({ prevEmployer: e.target.value })} /></Field>
                            <Grid>
                                <Field label="Email"><Input type="email" value={v.prevEmail} onChange={(e) => set({ prevEmail: e.target.value })} /></Field>
                                <Field label="Telephone"><Input value={v.prevPhone} onChange={(e) => set({ prevPhone: e.target.value })} /></Field>
                            </Grid>
                            <Field label="Address"><Input value={v.prevAddress} onChange={(e) => set({ prevAddress: e.target.value })} /></Field>
                            <Field label="Documents Requested"><CheckRows items={DOC_TYPES} selected={v.docs} onToggle={toggleDoc} /></Field>
                            <SignaturePad label="Applicant’s Signature" onChange={setApplicantSig} />
                        </Card>
                    </div>

                    {/* 2. §391.23 Employment Verification (employer completes & signs) */}
                    <div>
                        <SectionHead title="Employment Verification (§391.23)" sub={`To be completed and signed by the previous employer. Confirm whether the applicant was employed by you, then sign below.`} />
                        <Card>
                            <ToggleRow label="The applicant named above was employed by us." checked={v.wasEmployed} onChange={(b) => set({ wasEmployed: b })} />
                            <SignaturePad label="Employer Signature" onChange={setEmpSig} />
                            <Grid>
                                <Field label="Name"><Input value={v.empName} onChange={(e) => set({ empName: e.target.value })} /></Field>
                                <Field label="Title"><Input value={v.empTitle} onChange={(e) => set({ empTitle: e.target.value })} /></Field>
                            </Grid>
                            <Field label="Date Signed" className="max-w-xs"><Input type="date" value={v.empDateSigned} onChange={(e) => set({ empDateSigned: e.target.value })} /></Field>
                        </Card>
                    </div>

                    {/* 3. Completed response returned by the employer */}
                    <div>
                        <SectionHead title="Completed Response" sub="Attach the completed, signed reference returned by the employer (performance / experience / insurance letters)." />
                        <Card>
                            <Field className="max-w-xs" label="Issue Date" required><Input type="date" value={v.responseIssueDate} onChange={(e) => set({ responseIssueDate: e.target.value })} /></Field>
                            <FilesUpload value={v.responseFiles} onChange={(files) => set({ responseFiles: files })} />
                            <p className="text-xs text-slate-400">The hiring manager records, verifies and signs this response on the hiring dashboard.</p>
                        </Card>
                    </div>

                    {/* Footer */}
                    <div className={`${embedded ? "hidden" : "flex"} justify-end gap-3 border-t border-slate-200 pt-5`}>
                        <Button variant="outline" onClick={onBack}>Cancel</Button>
                        <Button variant="outline" onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> PDF Preview</Button>
                        <Button>Save form</Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------- signature pad -----------------------------
function SignaturePad({ label, onChange }: { label: string; onChange: (v: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = canvasRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const start = (e: React.PointerEvent<HTMLCanvasElement>) => { const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; drawing.current = true; const p = point(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = canvasRef.current?.getContext("2d"); if (!ctx) return; const p = point(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); };
    const end = () => { if (drawing.current) { drawing.current = false; const c = canvasRef.current; if (c) onChange(c.toDataURL()); } };
    const clear = () => { const c = canvasRef.current; const ctx = c?.getContext("2d"); if (c && ctx) { ctx.clearRect(0, 0, c.width, c.height); onChange(""); } };
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
                <Label className="text-slate-700">✎ {label}</Label>
                <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:text-rose-500"><Trash2 className="h-3 w-3" /> Clear</button>
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <canvas ref={canvasRef} width={680} height={150} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className="block w-full touch-none" style={{ height: 150 }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">Draw your signature above using your mouse or finger.</p>
        </div>
    );
}

// ----------------------------- document -----------------------------
const VerificationDocument = forwardRef<HTMLDivElement, { v: Values; applicantSig: string; empSig: string; branding: CompanyBranding }>(function VerificationDocument({ v, applicantSig, empSig, branding }, ref) {
    const accent = branding.accentColor || "#2563eb";
    const initials = (branding.name || "AL").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const Row = ({ label, value }: { label: string; value?: string }) => (
        <div className="flex justify-between gap-4 border-b border-dashed border-slate-100 py-1.5 text-[12.5px]"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-900">{value || "—"}</span></div>
    );
    const H = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2 mt-6 border-b border-slate-200 pb-1 text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>{children}</h2>;
    const list = (a: string[]) => (a.length ? a.join(", ") : "None");
    return (
        <div id="app-doc" ref={ref} className="mx-auto max-w-[800px] bg-white p-10 text-[12.5px] shadow-lg">
            <div className="mb-5 flex items-start justify-between border-b-2 pb-3" style={{ borderColor: accent }}>
                <div className="flex items-center gap-3">
                    {branding.logoDataUrl ? <img src={branding.logoDataUrl} alt={branding.name} style={{ height: 40 }} className="w-auto rounded object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>{initials}</div>}
                    <div><p className="font-bold text-slate-900">{branding.name}</p>{branding.tagline && <p className="text-[11px] text-slate-500">{branding.tagline}</p>}</div>
                </div>
                <div className="text-right text-[11px] text-slate-500">{branding.address && <div>{branding.address}</div>}<div>{[branding.phone, branding.email].filter(Boolean).join(" · ")}</div></div>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Employment Verification</h1>
            <p className="mt-1 text-[11px] text-slate-500">Request for Safety Performance History · §391.23 / §40.25 · sent to the previous employer</p>

            <H>Applicant Authorization</H>
            <Row label="I, (Print Name)" value={v.printName} />
            <Row label="SSN" value={v.ssn} /><Row label="Date of Birth" value={v.dob} />
            <Row label="Previous Employer" value={v.prevEmployer} /><Row label="Email" value={v.prevEmail} /><Row label="Telephone" value={v.prevPhone} /><Row label="Address" value={v.prevAddress} />
            <Row label="Documents Requested" value={list(v.docs)} />

            <H>Employment Verification (§391.23)</H>
            <Row label="Applicant was employed by us" value={v.wasEmployed ? "Yes" : "No"} />
            <Row label="Name" value={v.empName} /><Row label="Title" value={v.empTitle} /><Row label="Date Signed" value={v.empDateSigned} />

            <H>Completed Response</H>
            <Row label="Issue Date" value={v.responseIssueDate} />
            <Row label="Files" value={v.responseFiles.length ? `${v.responseFiles.length} attached` : "Not attached"} />

            {/* Signatures */}
            <div className="mt-8 grid grid-cols-2 gap-6">
                {[{ s: applicantSig, l: "Applicant" }, { s: empSig, l: "Employer (§391.23)" }].map((x) => (
                    <div key={x.l}>
                        {x.s ? <img src={x.s} alt={x.l} className="mb-1 h-12 object-contain" /> : <div className="h-12" />}
                        <div className="border-b border-slate-400">&nbsp;</div>
                        <p className="mt-1 text-[10px] text-slate-400">{x.l} Signature</p>
                    </div>
                ))}
            </div>
        </div>
    );
});
