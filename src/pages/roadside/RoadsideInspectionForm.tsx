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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { searchLocations, addressLine, type RoadsideLocation } from "./roadside-locations";
import {
    CalendarClock, ClipboardCheck, FileText, MapPin, Save, Search, ShieldAlert, Truck, User, Container, StickyNote,
    Ticket as TicketIcon, Link2, X as XIcon,
} from "lucide-react";
import { getTicketsForCarrierAccount } from "@/pages/tickets/tickets.store";
import type { TicketRecord } from "@/pages/tickets/tickets.data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WizardHeader, WizardStepNav, WizardSection, type WizardStep } from "@/components/ui/WizardEditor";
import { ViolationPicker } from "@/pages/tickets/ViolationPicker";
import { DocShelf } from "./RoadsideDocs";
import {
    DISTANCE_UNITS, INSPECTION_LEVELS, VIOLATION_BASICS,
    blankInspection, driverOptions, emptyParty, getInspectionById, partyFromUnit,
    saveInspection, trailerOptions, truckOptions,
    type DistanceUnit, type InspectionResult, type PartyKind, type RoadsideInspection, type RoadsideParty, type UnitOption,
} from "./roadside.data";

/**
 * The order the report is read in.
 *
 * Outcome sits after the three parties, not before them: pass or fail, out of
 * service, a citation — those are conclusions drawn from what was found, and a
 * form that asks for the conclusion first invites it to be typed before anybody
 * has looked. It sits immediately before Documents because failing is what makes
 * a remediation report due, and that is the next thing the form asks for.
 */
const STEPS: WizardStep[] = [
    { id: "inspection", label: "The inspection", icon: CalendarClock },
    { id: "truck", label: "Truck", icon: Truck },
    { id: "trailer", label: "Trailer", icon: Container },
    { id: "driver", label: "Driver", icon: User },
    { id: "outcome", label: "Outcome", icon: ShieldAlert },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "notes", label: "Notes", icon: StickyNote },
];

// ── Small form furniture, matched to the rest of the app's editors ──────────

const FIELD = "w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";

function Field({ label, required, hint, className, children }: {
    label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode;
}) {
    return (
        <div className={className}>
            {/* The compliance form's label, pill and all — see `Field` there. */}
            <span className="mb-1 flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                {required && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
            </span>
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


/**
 * A list that drops under a field, drawn above everything else on the page.
 *
 * Positioned on the field's screen rectangle and rendered at the document root, the way
 * the row menus are. Inside the section card it was clipped at the card's edge — the
 * card paints over its own overflow once a later card sits below it — so a lookup with
 * eight hits showed one. It follows the field while the page scrolls and closes when the
 * field is gone.
 */
function DropLayer({ anchor, open, children }: { anchor: React.RefObject<HTMLElement | null>; open: boolean; children: React.ReactNode }) {
    const [rect, setRect] = useState<{ top?: number; bottom?: number; left: number; width: number; maxHeight: number } | null>(null);
    useLayoutEffect(() => {
        if (!open) { setRect(null); return; }
        const place = () => {
            const r = anchor.current?.getBoundingClientRect();
            if (!r) return;
            // Below the field when there is room, above it when the field sits near the
            // bottom of the screen — a list that runs off the bottom edge is a list of one.
            const below = window.innerHeight - r.bottom - 12;
            const above = r.top - 12;
            if (below >= 220 || below >= above) setRect({ top: r.bottom + 4, left: r.left, width: r.width, maxHeight: Math.min(320, Math.max(120, below)) });
            else setRect({ bottom: window.innerHeight - r.top + 4, left: r.left, width: r.width, maxHeight: Math.min(320, Math.max(120, above)) });
        };
        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => { window.removeEventListener("scroll", place, true); window.removeEventListener("resize", place); };
    }, [open, anchor]);
    if (!open || !rect) return null;
    return createPortal(
        <div className="fixed z-[80] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg" style={rect}>
            {children}
        </div>,
        document.body,
    );
}

/**
 * Where it happened, looked up rather than typed.
 *
 * Free text here produced "I80 mm214", "I-80 WB Mile 214" and "Elkhart scale"
 * for one scale house, which is three places to every count and filter in the
 * app. Picking from the lookup fills the structured address alongside the label,
 * so the record keeps city, state and country as data.
 *
 * Typing is still allowed — an inspection can happen somewhere the gazetteer has
 * never heard of, and a field that refuses the truth is worse than one that
 * takes it unstructured.
 */
function LocationField({ value, onPick, onType, sub }: {
    value: string;
    onPick: (l: RoadsideLocation) => void;
    onType: (v: string) => void;
    sub?: string;
}) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [hits, setHits] = useState<RoadsideLocation[]>([]);
    const seq = useRef(0);
    const box = useRef<HTMLDivElement | null>(null);

    // Every keystroke starts a search; only the newest one is allowed to answer.
    // Without the guard a slow early request lands after a fast later one, and the
    // list shows results for something the person has already finished typing.
    useEffect(() => {
        if (!open) return;
        const mine = ++seq.current;
        setBusy(true);
        searchLocations(value).then((r) => {
            if (seq.current !== mine) return;
            setHits(r);
            setBusy(false);
        });
    }, [value, open]);

    return (
        <div className="relative">
            <div ref={box} className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    className={cn(FIELD, "pl-8")}
                    value={value}
                    placeholder="Search a scale, a crossing, a mile marker…"
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { onType(e.target.value); setOpen(true); }}
                    onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                />
            </div>
            {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}

            <DropLayer anchor={box} open={open}>
                    {busy && hits.length === 0 && (
                        <p className="px-3 py-2.5 text-[12px] text-slate-400">Searching…</p>
                    )}
                    {!busy && hits.length === 0 && (
                        <p className="px-3 py-2.5 text-[12px] text-slate-500">
                            Nothing found. What you have typed is kept as it is.
                        </p>
                    )}
                    <ul className="max-h-64 overflow-y-auto">
                        {hits.map((l) => (
                            <li key={l.label}>
                                <button
                                    type="button"
                                    // onMouseDown, not onClick: the input's blur fires first and
                                    // would close the list before the click ever landed.
                                    onMouseDown={(e) => { e.preventDefault(); onPick(l); setOpen(false); }}
                                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-blue-50/60"
                                >
                                    <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold text-slate-800">{l.label}</span>
                                        <span className="block truncate text-[11px] text-slate-500">
                                            {l.kind} &middot; {addressLine(l)}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
            </DropLayer>
        </div>
    );
}

/**
 * What came with the unit.
 *
 * Plate, jurisdiction, make and VIN are what the inspector wrote on the report, and they
 * are on the fleet record already — so picking the unit fills them in, and the person
 * reads them back against the paper rather than typing them a second time.
 */
function UnitFacts({ party }: { party: RoadsideParty }) {
    const cell = (k: string, v?: string | number, mono?: boolean) => (
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{k}</p>
            <p className={cn("truncate text-[13px] text-slate-800", mono ? "font-mono" : "font-medium")} title={v != null ? String(v) : undefined}>
                {v != null && v !== "" ? v : <span className="text-slate-300">—</span>}
            </p>
        </div>
    );
    return (
        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2.5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {cell("Unit #", party.unitNumber ?? party.label)}
                {cell("Plate", party.plateNumber, true)}
                {cell("Jurisdiction", party.plateJurisdiction)}
                {cell("Make", [party.year, party.make].filter(Boolean).join(" "))}
                {cell("Model", party.model)}
                {cell("VIN", party.vin, true)}
            </div>
            <p className="mt-2 text-[10px] text-blue-600/80">Filled in from the fleet record — check it against the report.</p>
        </div>
    );
}

/**
 * The citation number, searched against the Tickets page.
 *
 * A citation written at the roadside is a ticket; most of the time the office has
 * already filed it there. Typing the number finds that ticket, and picking it links the
 * two so the inspection opens the ticket and the ticket's number is the inspection's.
 * A number the Tickets page has never seen is kept as typed — the link is optional, the
 * number is not.
 */
function CitationField({ accountId, value, ticketId, onChange }: {
    accountId?: string;
    value: string;
    ticketId?: string;
    onChange: (next: { citationNumber: string; citationTicketId?: string }) => void;
}) {
    const [open, setOpen] = useState(false);
    const box = useRef<HTMLDivElement | null>(null);
    const tickets = useMemo(() => (accountId ? getTicketsForCarrierAccount(accountId) : []), [accountId]);
    const linked = ticketId ? tickets.find((t) => t.id === ticketId) : undefined;
    const q = value.trim().toLowerCase();
    const hits = useMemo(() => {
        const pool = q
            ? tickets.filter((t) => [t.offenseNumber, t.identifiers?.ticketNumber, t.driverName, t.violationSubtype, t.violationType]
                .filter(Boolean).join(" ").toLowerCase().includes(q))
            : tickets;
        return pool.slice(0, 6);
    }, [tickets, q]);
    const pick = (t: TicketRecord) => { onChange({ citationNumber: t.offenseNumber, citationTicketId: t.id }); setOpen(false); };

    return (
        <div className="relative">
            <div ref={box} className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    className={cn(FIELD, "pl-8")}
                    value={value}
                    placeholder="Search a ticket, or type the number…"
                    onFocus={() => setOpen(true)}
                    // Typing over a linked ticket unlinks it: the number no longer matches.
                    onChange={(e) => { onChange({ citationNumber: e.target.value, citationTicketId: undefined }); setOpen(true); }}
                    onBlur={() => window.setTimeout(() => setOpen(false), 120)}
                />
            </div>
            {linked ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    <Link2 size={11} /> Linked to ticket {linked.offenseNumber}
                    <span className="font-normal text-blue-500">· {linked.violationSubtype || linked.violationType} · {linked.driverName}</span>
                    <button type="button" title="Unlink the ticket" onClick={() => onChange({ citationNumber: value, citationTicketId: undefined })}
                        className="ml-0.5 text-blue-400 hover:text-blue-700"><XIcon size={11} /></button>
                </p>
            ) : (
                <p className="mt-1 text-[11px] text-slate-400">Pick the ticket it was filed as, or just write the number printed on it.</p>
            )}

            <DropLayer anchor={box} open={open && hits.length > 0}>
                    <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tickets on file</p>
                    <ul className="max-h-60 overflow-y-auto">
                        {hits.map((t) => (
                            <li key={t.id}>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); pick(t); }}
                                    className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-blue-50/60">
                                    <TicketIcon size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                    <span className="min-w-0">
                                        <span className="block truncate text-[13px] font-semibold text-slate-800">{t.offenseNumber}</span>
                                        <span className="block truncate text-[11px] text-slate-500">
                                            {t.violationSubtype || t.violationType} &middot; {t.driverName} &middot; {t.date}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
            </DropLayer>
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
function PartyCard({ kind, party, options, isCanada, extra, onChange }: {
    kind: PartyKind;
    party: RoadsideParty;
    options: UnitOption[];
    isCanada: boolean;
    /** The one question this party has that the others do not — an odometer, a logbook. */
    extra?: React.ReactNode;
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
                <Field label={noun} hint={kind === "trailer" ? "Leave empty if the inspection had no trailer." : undefined}
                    className={kind !== "driver" && inspected ? "sm:col-span-2" : undefined}>
                    <UnitSelect
                        options={options}
                        value={party.id}
                        placeholder={options.length ? `Select ${noun.toLowerCase()}…` : "No units on this carrier"}
                        onChange={(o) => onChange(o
                            // What was found stays; the unit's own facts are replaced wholesale, so a
                            // plate from the previous pick never lingers under the new one.
                            ? { ...partyFromUnit(o), hasViolation: party.hasViolation, violations: party.violations, logbookInspected: party.logbookInspected }
                            // Clearing the unit clears what was found against it: a violation
                            // filed against nobody is worse than no violation at all.
                            : { ...emptyParty() })}
                    />
                    {kind === "driver"
                        ? picked?.detail && <p className="mt-1 text-[11px] text-slate-400">{picked.detail}</p>
                        : inspected && <UnitFacts party={party} />}
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
                {inspected && extra}
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
                    /* Only the four buckets the inspector writes under. A longer chip
                       list is a list to scan; the specific defect comes off the paper
                       report and is found by its code in the search below. */
                    presets={VIOLATION_BASICS}
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
            case "inspection": return [form.date, form.location.trim(), form.startTime, form.endTime, form.inspectorName?.trim(), form.reportNumber?.trim()].filter(Boolean).length;
            case "outcome": return [form.result, form.oos ? "oos" : "", form.citationNumber?.trim()].filter(Boolean).length;
            case "truck": return form.truck.id ? 1 + form.truck.violations.length + (form.truckOdometer?.trim() ? 1 : 0) : 0;
            case "trailer": return form.trailer.id ? 1 + form.trailer.violations.length : 0;
            case "driver": return form.driver.id ? 1 + form.driver.violations.length + (form.driver.logbookInspected === undefined ? 0 : 1) : 0;
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
                        {/* Blue, whether or not it can be pressed yet. A grey slab reads as
                            "this screen is broken"; a dimmed blue one reads as "not yet", which
                            is what it means — and what is missing is listed under the form. */}
                        <button type="button" onClick={save} disabled={problems.length > 0}
                            title={problems.length ? `Still needs ${problems[0]}` : undefined}
                            className={cn("inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-colors",
                                problems.length > 0 ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700")}>
                            <Save size={16} /> {isEdit ? "Save changes" : "Save inspection"}
                        </button>
                    </>
                }
            />

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={completionFor} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">

                        <WizardSection allowOverflow id="inspection" icon={CalendarClock} title="The inspection"
                            subtitle="When it happened, how long it took, at what level, and who inspected.">
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
                                <Field label="Inspector" hint="As printed on the report.">
                                    <input className={FIELD} placeholder="Ofc. D. Whitaker" value={form.inspectorName ?? ""} onChange={(e) => set("inspectorName", e.target.value)} />
                                </Field>
                                <Field label="Agency">
                                    <input className={FIELD} placeholder="Indiana State Police — CVED" value={form.agency ?? ""} onChange={(e) => set("agency", e.target.value)} />
                                </Field>
                                <Field label="Report #" hint="The inspector's report number — what a data-Q challenge quotes.">
                                    <input className={FIELD} placeholder="IN-2026-00418827" value={form.reportNumber ?? ""} onChange={(e) => set("reportNumber", e.target.value)} />
                                </Field>
                                <Field label="Location" required className="sm:col-span-2">
                                    <LocationField
                                        value={form.location}
                                        onType={(v) => setForm((f) => ({
                                            // Typing over a picked place drops the address with it:
                                            // a city that belongs to a different location is worse
                                            // than none.
                                            ...f, location: v,
                                            locationCity: undefined, locationState: undefined, locationCountry: undefined,
                                        }))}
                                        onPick={(l) => setForm((f) => ({
                                            ...f, location: l.label,
                                            locationCity: l.city, locationState: l.state, locationCountry: l.country,
                                        }))}
                                        sub={form.locationCity
                                            ? `${form.locationCity}, ${form.locationState} · ${form.locationCountry}`
                                            : "Where the report says. Pick one to fill the address with it."}
                                    />
                                </Field>
                            </div>
                        </WizardSection>

                        <WizardSection allowOverflow id="truck" icon={Truck} title="Truck" subtitle="The power unit inspected, and what was found against it.">
                            <PartyCard kind="truck" party={form.truck} options={trucks} isCanada={!!isCanada}
                                onChange={(truck) => setForm((f) => {
                                    // A newly picked unit brings its current reading along as the
                                    // roadside reading; the person corrects it to what the report says.
                                    const o = trucks.find((u) => u.id === truck.id);
                                    const fresh = !!truck.id && truck.id !== f.truck.id;
                                    return {
                                        ...f, truck,
                                        ...(fresh && o?.odometer != null
                                            ? { truckOdometer: String(o.odometer), truckOdometerUnit: o.odometerUnit ?? f.truckOdometerUnit }
                                            : {}),
                                    };
                                })}
                                extra={form.truck.id ? (
                                    <Field label="Odometer"
                                        hint="Filled from the fleet record — change it to the reading at the roadside; the repair bill is read against this.">
                                        <div className="flex gap-2">
                                            <input className={FIELD} inputMode="numeric" placeholder="412,860"
                                                value={form.truckOdometer ?? ""}
                                                onChange={(e) => set("truckOdometer", e.target.value)} />
                                            {/* Asked, never assumed: the same fleet runs both. */}
                                            <select className={cn(FIELD, "w-24 shrink-0")}
                                                value={form.truckOdometerUnit ?? "mi"}
                                                onChange={(e) => set("truckOdometerUnit", e.target.value as DistanceUnit)}>
                                                {DISTANCE_UNITS.map((u) => <option key={u} value={u}>{u === "mi" ? "Miles" : "Kilometres"}</option>)}
                                            </select>
                                        </div>
                                    </Field>
                                ) : undefined}
                            />
                        </WizardSection>

                        <WizardSection allowOverflow id="trailer" icon={Container} title="Trailer" subtitle="The trailer it was pulling, if it was pulling one.">
                            <PartyCard kind="trailer" party={form.trailer} options={trailers} isCanada={!!isCanada}
                                onChange={(trailer) => set("trailer", trailer)} />
                        </WizardSection>

                        <WizardSection allowOverflow id="driver" icon={User} title="Driver" subtitle="Who was driving, and what was found against them.">
                            <PartyCard kind="driver" party={form.driver} options={drivers} isCanada={!!isCanada}
                                onChange={(driver) => set("driver", driver)}
                                /* A Level III with no HOS violation means two different things
                                   depending on whether the book was opened. The report says
                                   which; so does this. */
                                extra={form.driver.id ? (
                                    <Field label="Logbook inspected"
                                        hint="Whether the inspector actually looked at the hours of service.">
                                        <YesNo
                                            value={form.driver.logbookInspected === true}
                                            onChange={(v) => set("driver", { ...form.driver, logbookInspected: v })}
                                        />
                                    </Field>
                                ) : undefined}
                            />
                        </WizardSection>

                        <WizardSection allowOverflow id="outcome" icon={ShieldAlert} title="Outcome"
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
                                    <Field label="Citation #" required className="sm:col-span-2">
                                        <CitationField
                                            accountId={accountId}
                                            value={form.citationNumber ?? ""}
                                            ticketId={form.citationTicketId}
                                            onChange={(next) => setForm((f) => ({ ...f, ...next }))}
                                        />
                                    </Field>
                                )}
                            </div>
                            {form.oos && (
                                <p className="mt-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-rose-800">
                                    <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                                    Out of service. This inspection stays open until the post-inspection DVIR is on file
                                    &mdash; and, where the fault was a maintenance one, the repair bill with it.
                                </p>
                            )}
                        </WizardSection>

                        <WizardSection id="documents" icon={FileText} title="Documents"
                            subtitle="The report from the roadside now; the post-inspection DVIR and the bill as they arrive.">
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
                            <button type="button" onClick={save} disabled={problems.length > 0}
                                className={cn("inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-sm transition-colors",
                                    problems.length > 0 ? "cursor-not-allowed bg-blue-300" : "bg-blue-600 hover:bg-blue-700")}>
                                <Save size={16} /> {isEdit ? "Save changes" : "Save inspection"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
