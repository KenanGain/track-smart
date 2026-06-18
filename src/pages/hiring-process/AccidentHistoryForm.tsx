import { useRef, useState } from "react";
import { CarFront, Plus, Trash2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCompanyBranding } from "../ats/company-branding.data";
import { Field, Grid, MonthYear, formatAddress, ToggleRow, CheckLine, CompletedByCertification, newCompletedBy, type CompletedBy } from "./FormKit";
import { FormScaffold, SectionTitle } from "./FormScaffold";
import { usePrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

/**
 * Accident History — the accident portion of the §391.23 Safety Performance History
 * request. Each accident is added as a card, edited, then Saved to a compact summary.
 * Vehicle type and reason for leaving are multi-select (the form's checkbox lists).
 */

const VEHICLE_TYPES = ["Straight Truck", "Tractor-Semitrailer", "Bus", "Cargo Tank", "Doubles/Triples", "Other"];
const REASONS = ["Discharged", "Resignation", "Lay Off", "Military Duty"];
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const YEARS = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() - i));

type Accident = { id: number; dateM: string; dateY: string; location: string; injuries: string; fatalities: string; hazmat: string };
const toggleArr = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

// Inline Yes/No segmented toggle, matching the application forms.
function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {["Yes", "No"].map((opt) => {
                const on = value === opt;
                return (
                    <button key={opt} type="button" onClick={() => onChange(opt)}
                        className={cn("min-w-[72px] rounded-md px-4 py-1.5 text-sm font-semibold transition",
                            on ? (opt === "Yes" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-700 text-white shadow-sm") : "text-slate-500 hover:text-slate-700")}>
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}
// Multi-select chips ("select all that apply").
function Chips({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((it) => {
                const on = selected.includes(it);
                return (
                    <button key={it} type="button" onClick={() => onToggle(it)}
                        className={cn("inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                            on ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
                        {on && <Check className="h-3.5 w-3.5" />}{it}
                    </button>
                );
            })}
        </div>
    );
}
function Dropdown({ value, onChange, items, placeholder }: { value: string; onChange: (v: string) => void; items: string[]; placeholder: string }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
            <SelectContent>{items.map((it) => <SelectItem key={it} value={it}>{it}</SelectItem>)}</SelectContent>
        </Select>
    );
}

export function AccidentHistoryForm({ onBack, embedded, startPreview }: { onBack: () => void; embedded?: boolean; startPreview?: boolean }) {
    const [branding] = useCompanyBranding();
    const pf = usePrefill();
    const idRef = useRef(1);

    const [employedByUs, setEmployedByUs] = useState("");
    const [employedAs, setEmployedAs] = useState("");
    const [fromMY, setFromMY] = useState("");
    const [toMY, setToMY] = useState("");
    const [droveCMV, setDroveCMV] = useState("");
    const [vehicleTypes, setVehicleTypes] = useState<string[]>([]);
    const [otherVehicle, setOtherVehicle] = useState("");
    const [reasons, setReasons] = useState<string[]>([]);
    const [noHistory, setNoHistory] = useState(false);
    const [noAccidents, setNoAccidents] = useState(false);
    const [accidents, setAccidents] = useState<Accident[]>([]);
    const [editingIds, setEditingIds] = useState<number[]>([]);
    const [otherAccidents, setOtherAccidents] = useState("");
    const [remarks, setRemarks] = useState("");
    const [completed, setCompleted] = useState<CompletedBy>(newCompletedBy());

    const setAcc = (id: number, patch: Partial<Accident>) => setAccidents((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const addAcc = () => { const a: Accident = { id: idRef.current++, dateM: "", dateY: "", location: "", injuries: "", fatalities: "", hazmat: "" }; setAccidents((p) => [...p, a]); setEditingIds((p) => [...p, a.id]); };
    const removeAcc = (id: number) => { setAccidents((p) => p.filter((a) => a.id !== id)); setEditingIds((p) => p.filter((x) => x !== id)); };
    const saveAcc = (id: number) => setEditingIds((p) => p.filter((x) => x !== id));
    const editAcc = (id: number) => setEditingIds((p) => [...p, id]);
    const isEditing = (id: number) => editingIds.includes(id);

    const vehicleLabel = vehicleTypes.map((v) => (v === "Other" && otherVehicle ? `Other — ${otherVehicle}` : v)).join(", ");

    const fillSample = () => {
        setEmployedByUs("Yes"); setEmployedAs("OTR Driver");
        setFromMY("2021-01"); setToMY("2024-03");
        setDroveCMV("Yes"); setVehicleTypes(["Tractor-Semitrailer", "Cargo Tank"]); setReasons(["Resignation"]);
        setNoHistory(false); setNoAccidents(false);
        setAccidents([
            { id: idRef.current++, dateM: "06", dateY: "2023", location: "I-80 near mile 210, Des Moines, IA", injuries: "0", fatalities: "0", hazmat: "No" },
            { id: idRef.current++, dateM: "11", dateY: "2022", location: "US-30, Cedar Rapids, IA", injuries: "1", fatalities: "0", hazmat: "No" },
        ]);
        setEditingIds([]);
        setOtherAccidents("No other reportable accidents on file.");
        setRemarks("Driver maintained a good safety record during employment.");
        setCompleted((c) => ({ ...c, company: branding.name, telephone: "(555) 900-1200", address: { street: "500 Depot St", city: "Springfield", state: "IL", zip: "62701", country: "United States" } }));
    };

    const addrOk = !!completed.address.street && !!completed.address.city && !!completed.address.state;
    const checks = [
        { label: "Employment confirmed (employed by us)", ok: !!employedByUs },
        { label: "Employed-as & dates recorded", ok: !!employedAs && !!fromMY && !!toMY },
        { label: "Drove CMV answered", ok: !!droveCMV },
        { label: "Reason for leaving recorded", ok: reasons.length > 0 },
        { label: "Accident history recorded or marked none", ok: noAccidents || noHistory || accidents.length > 0 },
        { label: "All accident cards saved", ok: editingIds.length === 0 },
        { label: "Company & address recorded", ok: !!completed.company && addrOk },
        { label: embedded ? "Certified & signed" : "Reviewer sign-off completed", ok: completed.done },
    ];

    const sections: DocSection[] = [
        { title: "Employment", groups: [{ rows: [
            { label: "Employed by us", value: employedByUs },
            { label: "Employed as", value: employedAs },
            { label: "From (m/y)", value: fromMY }, { label: "To (m/y)", value: toMY },
            { label: "Drove a motor vehicle", value: droveCMV },
            { label: "Vehicle type(s)", value: vehicleLabel },
            { label: "Reason for leaving", value: reasons.join(", ") },
            { label: "No safety performance history to report", value: noHistory ? "Yes — checked" : "No" },
        ] }] },
        { title: "Accidents (§390.15(b))", groups: noAccidents
            ? [{ rows: [{ label: "Accident register", value: "No accident register data for this driver" }] }]
            : (accidents.length ? [{ table: {
                headers: ["#", "Date", "Location", "# Injuries", "# Fatalities", "Hazmat Spill"],
                rows: accidents.map((a, i) => [String(i + 1), [a.dateM, a.dateY].filter(Boolean).join("/"), a.location, a.injuries || "0", a.fatalities || "0", a.hazmat]),
            } }] : [{ rows: [{ label: "Accidents", value: "None reported" }] }]) },
        ...(otherAccidents ? [{ title: "Other Accidents", groups: [{ rows: [{ label: "Details", value: otherAccidents }] }] }] : []),
        ...(remarks ? [{ title: "Remarks", groups: [{ rows: [{ label: "Remarks", value: remarks }] }] }] : []),
        { title: "Completed By", groups: [{ rows: [
            { label: "Company", value: completed.company }, { label: "Address", value: formatAddress(completed.address) }, { label: "Telephone", value: completed.telephone },
        ] }] },
        { title: "Review Checklist", groups: [{ rows: checks.map((c) => ({ label: c.label, value: c.ok ? "✓ Complete" : "Pending" })) }] },
        { title: embedded ? "Certification" : "Reviewer Sign-Off", groups: [completed.done
            ? { rows: [{ label: embedded ? "Completed by" : "Reviewed by", value: completed.name }, { label: "Title", value: completed.role }, { label: "Date", value: completed.date }, { label: "Status", value: embedded ? "Completed & signed" : "Reviewed & signed" }], images: completed.sig ? [completed.sig] : undefined }
            : { rows: [{ label: "Status", value: "Pending — not yet signed" }] }] },
    ];

    const reviewChecklist = (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review Checklist</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{checks.map((c, i) => <CheckLine key={i} ok={c.ok} label={c.label} />)}</ul>
        </div>
    );

    const Summary = ({ label, value }: { label: string; value: string }) => (
        <span className="text-xs text-slate-600"><span className="text-slate-400">{label}: </span><span className="font-medium text-slate-700">{value || "—"}</span></span>
    );

    return (
        <FormScaffold
            title="Accident History" Icon={CarFront} onBack={onBack} onFillSample={fillSample} embedded={embedded} startPreview={startPreview} sheet
            docTitle="Safety Performance History — Accident History" docSubtitle={pf?.fullName || undefined} sections={sections} branding={branding} fileName="accident-history.pdf"
            intro={<>Safety Performance History (§391.23) — accident portion, completed by the previous employer. Confirm the employment, then add any accidents on the accident register (§390.15(b)) from the three years prior to the application.</>}
        >
            <div>
                <SectionTitle>Employment</SectionTitle>
                <div className="space-y-5">
                    <Field label="The applicant named above was employed by us." required><YesNo value={employedByUs} onChange={setEmployedByUs} /></Field>
                    <Grid>
                        <Field label="Employed as"><Input value={employedAs} onChange={(e) => setEmployedAs(e.target.value)} placeholder="Position held" /></Field>
                        <div />
                        <Field label="From (m/y)"><MonthYear value={fromMY} onChange={setFromMY} /></Field>
                        <Field label="To (m/y)"><MonthYear value={toMY} onChange={setToMY} /></Field>
                    </Grid>
                    <Field label="1. Did he/she drive a motor vehicle for you?" required><YesNo value={droveCMV} onChange={setDroveCMV} /></Field>
                    {droveCMV === "Yes" && <Field label="If yes, what type? (select all that apply)"><Chips items={VEHICLE_TYPES} selected={vehicleTypes} onToggle={(v) => setVehicleTypes((a) => toggleArr(a, v))} /></Field>}
                    {droveCMV === "Yes" && vehicleTypes.includes("Other") && <Field label="Other — specify"><Input value={otherVehicle} onChange={(e) => setOtherVehicle(e.target.value)} placeholder="Specify vehicle type" /></Field>}
                    <Field label="2. Reason for leaving your employ (select all that apply)" required><Chips items={REASONS} selected={reasons} onToggle={(v) => setReasons((a) => toggleArr(a, v))} /></Field>
                    <ToggleRow label="If there is no safety performance history to report." checked={noHistory} onChange={setNoHistory} />
                </div>
            </div>

            <div>
                <SectionTitle>Accidents — §390.15(b)</SectionTitle>
                <p className="mb-3 text-xs text-slate-500">Add any accidents on the accident register involving the applicant in the 3 years prior to the application, or check below if there is no accident register data for this driver.</p>
                <ToggleRow label="No accident register data for this driver." checked={noAccidents} onChange={setNoAccidents} />

                {!noAccidents && (
                    <div className="mt-4 space-y-4">
                        {accidents.map((a, i) => isEditing(a.id) ? (
                            // ── Editing card ──
                            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">{i + 1}</span>
                                        <h3 className="text-sm font-bold text-slate-800">Accident {i + 1}</h3>
                                    </div>
                                    <button type="button" onClick={() => removeAcc(a.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                                </div>
                                <div className="mt-4 space-y-5">
                                    <Grid>
                                        <Field label="Date" required>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Dropdown value={a.dateM} onChange={(v) => setAcc(a.id, { dateM: v })} items={MONTHS} placeholder="MM" />
                                                <Dropdown value={a.dateY} onChange={(v) => setAcc(a.id, { dateY: v })} items={YEARS} placeholder="YYYY" />
                                            </div>
                                        </Field>
                                        <Field label="Location" required><Input value={a.location} onChange={(e) => setAcc(a.id, { location: e.target.value })} placeholder="City / Highway / State" /></Field>
                                    </Grid>
                                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
                                        <Field label="# Injuries"><Input type="number" min={0} value={a.injuries} onChange={(e) => setAcc(a.id, { injuries: e.target.value })} placeholder="0" /></Field>
                                        <Field label="# Fatalities"><Input type="number" min={0} value={a.fatalities} onChange={(e) => setAcc(a.id, { fatalities: e.target.value })} placeholder="0" /></Field>
                                        <Field label="Hazmat Spill"><YesNo value={a.hazmat} onChange={(v) => setAcc(a.id, { hazmat: v })} /></Field>
                                    </div>
                                </div>
                                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                                    <Button size="sm" className="gap-1.5" onClick={() => saveAcc(a.id)}><Check className="h-4 w-4" /> Save</Button>
                                </div>
                            </div>
                        ) : (
                            // ── Saved summary card ──
                            <div key={a.id} className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-blue-700">Accident {i + 1}</p>
                                        <div className="mt-1.5 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                                            <Summary label="Date" value={[a.dateM, a.dateY].filter(Boolean).join("/")} />
                                            <Summary label="Location" value={a.location} />
                                            <Summary label="# Injuries" value={a.injuries || "0"} />
                                            <Summary label="# Fatalities" value={a.fatalities || "0"} />
                                            <Summary label="Hazmat Spill" value={a.hazmat} />
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        <button type="button" onClick={() => editAcc(a.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-blue-600" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></button>
                                        <button type="button" onClick={() => removeAcc(a.id)} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-rose-600" aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full gap-1.5 border-dashed" onClick={addAcc}><Plus className="h-4 w-4" /> Add accident</Button>
                    </div>
                )}
            </div>

            <div>
                <SectionTitle>Other Accidents</SectionTitle>
                <Textarea rows={3} value={otherAccidents} onChange={(e) => setOtherAccidents(e.target.value)} placeholder="Any other accidents reported to government agencies or insurers, or retained under internal company policies…" className="resize-none" />
            </div>

            <div>
                <SectionTitle>Any Other Remarks</SectionTitle>
                <Textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any other remarks…" className="resize-none" />
            </div>

            {embedded ? (
                <CompletedByCertification value={completed} onChange={setCompleted} />
            ) : (
                <CompletedByCertification
                    value={completed} onChange={setCompleted} checklist={reviewChecklist}
                    kicker="Completed By"
                    certKicker="Reviewer Sign-Off"
                    certHeading="I have reviewed and completed the accident history above."
                    certSubtext="Confirm you have reviewed the form above. Your name, title, date and signature are recorded on file."
                    nameLabel="Reviewer name" buttonLabel="Confirm review & sign" signedLabel="Reviewed & signed" signedByLabel="Reviewed by"
                />
            )}
        </FormScaffold>
    );
}
