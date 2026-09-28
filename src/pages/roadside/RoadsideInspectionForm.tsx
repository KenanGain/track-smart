// ─────────────────────────────────────────────────────────────────────────────
// Recording a roadside inspection.
//
// The full-screen editor the rest of the app uses for anything with more than a
// handful of fields — left rail, section cards, one save. Not a modal: this gets
// filled in from the paper report the driver photographed, which means switching
// between it and something else, and a modal that loses its contents on a stray
// click is the wrong container for that.
//
// The order follows the report rather than the database: when and where, then
// what the inspector concluded, then each of the three things they looked at,
// then the paperwork. Every question that only matters sometimes — the citation
// number, a party's violation list — appears only once the answer before it says
// it should, so the form is as short as the inspection was.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import {
    CalendarClock, ClipboardCheck, FileText, Save, ShieldAlert, Truck, User, Container, StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WizardHeader, WizardStepNav, WizardSection, type WizardStep } from "@/components/ui/WizardEditor";
import { ViolationPicker } from "@/pages/tickets/ViolationPicker";
import { DocShelf } from "./RoadsideDocs";
import {
    INSPECTION_LEVELS, ROADSIDE_PRESETS, blankInspection, driverOptions, emptyParty, getInspectionById,
    saveInspection, trailerOptions, truckOptions,
    type InspectionResult, type PartyKind, type RoadsideInspection, type RoadsideParty, type UnitOption,
} from "./roadside.data";

const STEPS: WizardStep[] = [
    { id: "inspection", label: "The inspection", icon: CalendarClock },
    { id: "outcome", label: "Outcome", icon: ShieldAlert },
    { id: "truck", label: "Truck", icon: Truck },
    { id: "trailer", label: "Trailer", icon: Container },
    { id: "driver", label: "Driver", icon: User },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "notes", label: "Notes", icon: StickyNote },
];

// ── Small form furniture, matched to the rest of the app's editors ──────────

const FIELD = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

function Field({ label, required, hint, className, children }: {
    label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode;
}) {
    return (
        <div className={className}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {label}{required && <span className="text-rose-500"> *</span>}
            </label>
            <div className="mt-1.5">{children}</div>
            {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
        </div>
    );
}

/**
 * A yes/no that reads as the question it is.
 *
 * Two buttons rather than a switch: "Violation" with a toggle beside it makes
 * the reader work out which way is yes, and this form asks the same question
 * four times. The answer is on the button.
 */
function YesNo({ value, onChange, yes = "Yes", no = "No", danger }: {
    value: boolean; onChange: (v: boolean) => void; yes?: string; no?: string; danger?: boolean;
}) {
    const opts: [boolean, string][] = [[true, yes], [false, no]];
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {opts.map(([v, label]) => {
                const on = value === v;
                return (
                    <button
                        key={label}
                        type="button"
                        onClick={() => onChange(v)}
                        className={cn("rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                            on
                                ? v && danger ? "bg-rose-600 text-white shadow-sm"
                                    : v ? "bg-blue-600 text-white shadow-sm"
                                        : "bg-white text-slate-700 shadow-sm"
                                : "text-slate-500 hover:text-slate-700")}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}

/** The roster picker for one inspected unit or person. */
function UnitSelect({ options, value, onChange, placeholder }: {
    options: UnitOption[]; value?: string; onChange: (o?: UnitOption) => void; placeholder: string;
}) {
    return (
        <select
            className={FIELD}
            value={value ?? ""}
            onChange={(e) => onChange(options.find((o) => o.id === e.target.value))}
        >
            <option value="">{placeholder}</option>
            {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}{o.detail ? ` — ${o.detail}` : ""}</option>
            ))}
        </select>
    );
}

/**
 * One of the three parties: what was inspected, whether anything was found, and
 * — only then — which categories it was found under.
 *
 * The violation list is the ticket module's picker, unchanged. A violation code
 * means the same thing here as it does on a citation, and giving this page its
 * own list would give the fleet two violation histories to reconcile.
 */
function PartyCard({ kind, party, options, isCanada, onChange }: {
    kind: PartyKind;
    party: RoadsideParty;
    options: UnitOption[];
    isCanada: boolean;
    onChange: (next: RoadsideParty) => void;
}) {
    const noun = kind === "driver" ? "Driver" : kind === "truck" ? "Truck" : "Trailer";
    const picked = options.find((o) => o.id === party.id);
    // Nothing can be found against a unit that was not inspected. The question is
    // hidden rather than disabled: a greyed-out Yes/No still reads as a question
    // somebody forgot to answer.
    const inspected = !!party.id;

    return (
        <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
                <Field label={noun} hint={kind === "trailer" ? "Leave empty if the inspection had no trailer." : undefined}>
                    <UnitSelect
                        options={options}
                        value={party.id}
                        placeholder={options.length ? `Select ${noun.toLowerCase()}…` : "No units on this carrier"}
                        onChange={(o) => onChange(o
                            ? { ...party, id: o.id, label: o.label }
                            // Clearing the unit clears what was found against it: a violation
                            // filed against nobody is worse than no violation at all.
                            : { ...emptyParty() })}
                    />
                    {picked?.detail && <p className="mt-1 text-[11px] text-slate-400">{picked.detail}</p>}
                </Field>
                {inspected && (
                    <Field label="Violation found">
                        <YesNo
                            danger
                            value={party.hasViolation}
                            onChange={(v) => onChange({ ...party, hasViolation: v, violations: v ? party.violations : [] })}
                        />
                    </Field>
                )}
            </div>

            {!inspected && (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-[12px] text-slate-500">
                    {kind === "trailer"
                        ? "No trailer on this inspection."
                        : `Pick the ${noun.toLowerCase()} that was inspected to record what was found against it.`}
                </p>
            )}

            {inspected && party.hasViolation && (
                <ViolationPicker
                    value={party.violations}
                    onChange={(violations) => onChange({ ...party, violations })}
                    isCanada={isCanada}
                    presets={ROADSIDE_PRESETS[kind]}
                    label={`${noun} violation categories`}
                    hint="· tap what the inspector wrote, or search the code"
                />
            )}
        </div>
    );
}

// ── The page ────────────────────────────────────────────────────────────────

export function RoadsideInspectionForm({ inspectionId, accountId, accountName, currentUserName, isCanada, onNavigate }: {
    /** Editing an existing record; absent for a new one. */
    inspectionId?: string;
    accountId?: string;
    accountName?: string;
    currentUserName?: string;
    /** Drives the violation picker's chart — CVOR/NSC rather than SMS. */
    isCanada?: boolean;
    onNavigate: (path: string) => void;
}) {
    const who = currentUserName || "Safety Manager";
    const [form, setForm] = useState<RoadsideInspection>(() =>
        (inspectionId ? getInspectionById(inspectionId) : undefined)
        ?? blankInspection(accountId ?? "", who),
    );
    const isEdit = !!inspectionId;
    const set = <K extends keyof RoadsideInspection>(k: K, v: RoadsideInspection[K]) =>
        setForm((f) => ({ ...f, [k]: v }));

    const trucks = useMemo(() => truckOptions(accountId), [accountId]);
    const trailers = useMemo(() => trailerOptions(accountId), [accountId]);
    const drivers = useMemo(() => driverOptions(accountId), [accountId]);

    // ── Section rail, with scroll-spy. Same mechanism as the asset editor. ──
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);
    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveStep(visible[0].target.id.replace("section-", ""));
            },
            { root, rootMargin: "-12px 0px -55% 0px", threshold: 0 },
        );
        STEPS.forEach((s) => {
            const sec = document.getElementById(`section-${s.id}`);
            if (sec) obs.observe(sec);
        });
        return () => obs.disconnect();
    }, []);
    const go = (id: string) => {
        const sec = document.getElementById(`section-${id}`);
        const el = scrollRef.current;
        if (!sec || !el) return;
        el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12, behavior: "smooth" });
        setActiveStep(id);
    };

    /**
     * What the rail's badge counts.
     *
     * A COUNT, not a fraction — `WizardStepNav` prints this number beside the label,
     * so a two-thirds-complete section reached the screen as 0.6666666666666666.
     * Zero also means "nothing here yet", which is what turns the numbered circle
     * into a tick.
     */
    const completionFor = (id: string): number => {
        switch (id) {
            case "inspection": return [form.date, form.location.trim(), form.startTime, form.endTime].filter(Boolean).length;
            case "outcome": return [form.result, form.oos ? "oos" : "", form.citationNumber?.trim()].filter(Boolean).length;
            case "truck": return form.truck.id ? 1 + form.truck.violations.length : 0;
            case "trailer": return form.trailer.id ? 1 + form.trailer.violations.length : 0;
            case "driver": return form.driver.id ? 1 + form.driver.violations.length : 0;
            case "documents": return form.reports.length + form.remediation.length + form.repairBills.length;
            case "notes": return form.notes?.trim() ? 1 : 0;
            default: return 0;
        }
    };

    // What must be true before this is a record rather than a draft. Said out loud
    // under the save button rather than discovered by pressing it.
    const problems: string[] = [];
    if (!form.date) problems.push("an inspection date");
    if (!form.location.trim()) problems.push("where it happened");
    if (!form.truck.id && !form.driver.id) problems.push("the truck or the driver inspected");
    if (form.citationIssued && !form.citationNumber?.trim()) problems.push("the citation number");
    for (const [kind, p] of [["Truck", form.truck], ["Trailer", form.trailer], ["Driver", form.driver]] as const) {
        if (p.hasViolation && p.violations.length === 0) problems.push(`at least one ${kind.toLowerCase()} violation category`);
    }

    const home = "/roadside-inspections";
    const save = () => {
        if (problems.length) return;
        const saved = saveInspection({ ...form, accountId: form.accountId || (accountId ?? "") });
        onNavigate(`${home}/${saved.id}`);
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <WizardHeader
                backLabel="Back to roadside inspections"
                onBack={() => onNavigate(home)}
                icon={ClipboardCheck}
                title={isEdit ? `Edit inspection — ${form.id}` : "Record a roadside inspection"}
                subtitle={<>
                    {accountName ? <span className="font-semibold text-slate-700">{accountName}</span> : null}
                    {accountName ? " · " : ""}
                    What the inspector found, and what still has to be put right.
                </>}
                actions={
                    <>
                        <Button variant="ghost" onClick={() => onNavigate(home)} className="text-slate-600">Discard</Button>
                        <Button onClick={save} disabled={problems.length > 0} title={problems.length ? `Still needs ${problems[0]}` : undefined}
                            className="h-10 px-8 text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/10">
                            <Save size={16} className="mr-2" /> {isEdit ? "Save changes" : "Save inspection"}
                        </Button>
                    </>
                }
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={completionFor} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">

                        <WizardSection id="inspection" icon={CalendarClock} title="The inspection"
                            subtitle="When it happened, how long it took, and at what level.">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Inspection date" required>
                                    <input type="date" className={FIELD} value={form.date} onChange={(e) => set("date", e.target.value)} />
                                </Field>
                                <Field label="Inspection level" required>
                                    <select className={FIELD} value={form.level} onChange={(e) => set("level", e.target.value as RoadsideInspection["level"])}>
                                        {INSPECTION_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </Field>
                                <Field label="Start time">
                                    <input type="time" className={FIELD} value={form.startTime ?? ""} onChange={(e) => set("startTime", e.target.value)} />
                                </Field>
                                <Field label="End time" hint="How long a driver was held is worth keeping — it is the part that costs the day.">
                                    <input type="time" className={FIELD} value={form.endTime ?? ""} onChange={(e) => set("endTime", e.target.value)} />
                                </Field>
                                <Field label="Location" required className="sm:col-span-2"
                                    hint="Where the report says — the scale, the mile marker, the town.">
                                    <input className={FIELD} placeholder="I-80 WB, Mile 214 — Elkhart, IN"
                                        value={form.location} onChange={(e) => set("location", e.target.value)} />
                                </Field>
                            </div>
                        </WizardSection>

                        <WizardSection id="outcome" icon={ShieldAlert} title="Outcome"
                            subtitle="What the inspector concluded, and whether anything was written.">
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Inspection result" required>
                                    <YesNo yes="Pass" no="Fail"
                                        value={form.result === "Pass"}
                                        onChange={(v) => set("result", (v ? "Pass" : "Fail") as InspectionResult)} />
                                </Field>
                                <Field label="Out of service" hint="Anything ordered off the road — vehicle, trailer or driver.">
                                    <YesNo danger value={form.oos} onChange={(v) => set("oos", v)} />
                                </Field>
                                <Field label="Citation issued">
                                    <YesNo danger value={form.citationIssued}
                                        onChange={(v) => setForm((f) => ({ ...f, citationIssued: v, citationNumber: v ? f.citationNumber : undefined }))} />
                                </Field>
                                {/* Asked only when there is one to give. */}
                                {form.citationIssued && (
                                    <Field label="Citation #" required>
                                        <input className={FIELD} placeholder="IN-2026-884120"
                                            value={form.citationNumber ?? ""} onChange={(e) => set("citationNumber", e.target.value)} />
                                    </Field>
                                )}
                            </div>
                            {form.oos && (
                                <p className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-rose-800">
                                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                                    Out of service. This inspection stays open until a remediation inspection is on file
                                    &mdash; and, where the fault was a maintenance one, the repair bill with it.
                                </p>
                            )}
                        </WizardSection>

                        <WizardSection allowOverflow id="truck" icon={Truck} title="Truck" subtitle="The power unit inspected, and what was found against it.">
                            <PartyCard kind="truck" party={form.truck} options={trucks} isCanada={!!isCanada}
                                onChange={(truck) => set("truck", truck)} />
                        </WizardSection>

                        <WizardSection allowOverflow id="trailer" icon={Container} title="Trailer" subtitle="The trailer it was pulling, if it was pulling one.">
                            <PartyCard kind="trailer" party={form.trailer} options={trailers} isCanada={!!isCanada}
                                onChange={(trailer) => set("trailer", trailer)} />
                        </WizardSection>

                        <WizardSection allowOverflow id="driver" icon={User} title="Driver" subtitle="Who was driving, and what was found against them.">
                            <PartyCard kind="driver" party={form.driver} options={drivers} isCanada={!!isCanada}
                                onChange={(driver) => set("driver", driver)} />
                        </WizardSection>

                        <WizardSection id="documents" icon={FileText} title="Documents"
                            subtitle="The report from the roadside now; the remediation and the bill as they arrive.">
                            <DocShelf
                                inspection={form}
                                uploadedBy={who}
                                onChange={setForm}
                                /* On a new record the later shelves are shown but explained rather
                                   than hidden: somebody filling this in should be able to see what
                                   the record is going to want from them next. */
                            />
                        </WizardSection>

                        <WizardSection id="notes" icon={StickyNote} title="Notes" subtitle="Anything the fields above do not hold.">
                            <textarea
                                rows={5}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="Where the unit was towed, who the inspector was, what the driver said happened…"
                                value={form.notes ?? ""}
                                onChange={(e) => set("notes", e.target.value)}
                            />
                        </WizardSection>

                        {/* What is still missing, before the button is pressed rather than after. */}
                        {problems.length > 0 && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-[12px] font-bold text-amber-800">Before this can be saved</p>
                                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[12px] text-amber-800">
                                    {problems.map((p) => <li key={p}>It still needs {p}.</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                            <Button variant="outline" onClick={() => onNavigate(home)}>Cancel</Button>
                            <Button onClick={save} disabled={problems.length > 0}>
                                <Save size={16} className="mr-2" /> {isEdit ? "Save changes" : "Save inspection"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
