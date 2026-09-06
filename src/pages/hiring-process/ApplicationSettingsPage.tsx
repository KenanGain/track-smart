import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Flag, Globe, Info, Leaf, MapPin, Pencil, Plus, Save, Sparkles, Trash2, Upload, Image as ImageIcon, FileText, FileSignature, FlaskConical, User, Phone, CreditCard, ShieldAlert, Briefcase, CalendarClock, GraduationCap, Car, Ban, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonitoringToggle } from "@/pages/compliance/MonitoringToggle";
import { ALL_COUNTRIES } from "@/pages/compliance/jurisdiction.data";
import { UploadZone } from "@/components/ui/UploadZone";
import { defaultVersionLabel, MAX_RECORD_NAME, type SafetyRecord } from "@/pages/compliance/safety-software-catalog.data";
import {
    travelDocFields, travelDocsFromApplication, legacyTravelShape,
    travelQuestionGroups, isQuestionRecord, QUESTION_RECORD_IDS,
    requiredTravelRecords, travelStatusOptions, countriesNeedingAuthorization,
    emptyTravelProfile, isoDate, fromIsoDate,
    type TravelDocs, type TravelDocCapture, type TravelProfile,
} from "@/pages/compliance/travel-docs-bridge";
import { WizardStepNav, type WizardStep } from "@/components/ui/WizardEditor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select as ShadSelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { SubTabs } from "@/components/ui/SubTabs";
import { ConsentPhase } from "./ApplicationConsents";
import { consentsForType, consentRegion, consentForms } from "./policy-forms.data";
import { ViolationPicker } from "@/pages/tickets/ViolationPicker";
import { violationFromCharge } from "@/pages/tickets/violation-presets";
import type { TicketViolation } from "@/pages/tickets/tickets.data";

/**
 * Settings -> Hiring Process -> Applications
 *
 * The Application Form an applicant completes when they apply. Renders the
 * entire form top-to-bottom: Personal Information, Address (with a 3-year
 * residence-history collector), Contact, Licenses (multiple), Military Service
 * (gated), and Employment / Education history and employment gaps - each gated by a
 * Yes/No and each supporting multiple entries via an overview list + modal.
 */

// ----------------------------- option data -----------------------------
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const pad = (n: number) => String(n).padStart(2, "0");

const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V"];
export const COUNTRIES = ["United States", "Canada"];
export const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
    "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
    "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
    "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
    "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming",
];
export const CA_PROVINCES = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon",
];
export const STATES_PROVINCES = [...US_STATES, ...CA_PROVINCES];
const POSITIONS = ["Company Driver", "Owner Operator", "Lease Operator", "Driver Trainee", "Other"];
const CONTACT_METHODS = ["Primary Phone", "Cell Phone", "Email Address"];
const CONTACT_TIMES = ["Any", "Morning", "Afternoon", "Evening"];
export const LICENSE_CLASSES = ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class A", "Class B", "Class C"];
const ENDORSEMENTS = ["None", "Other", "Tanker", "Doubles / Triples", "X Endorsement", "HazMat"];
const BRANCHES = ["Army", "Navy", "Air Force", "Marine Corps", "Coast Guard", "Space Force", "National Guard", "Reserves"];
const MONTHS = range(1, 12).map(pad);
const DAYS = range(1, 31).map(pad);
const DOB_YEARS = range(1940, 2010).reverse().map(String);
const EXP_YEARS = range(2024, 2040).map(String);
const HIST_YEARS = range(1980, 2027).reverse().map(String);

type DateVal = { m: string; d: string; y: string };
type DateMY = { m: string; y: string };
const emptyDate: DateVal = { m: "", d: "", y: "" };
const emptyMY: DateMY = { m: "", y: "" };

type ResidenceRow = {
    address: string; unit: string; country: string; city: string; state: string; zip: string;
    start: DateVal; end: DateVal;
};
const newResidenceRow = (): ResidenceRow => ({
    address: "", unit: "", country: "United States", city: "", state: "", zip: "",
    start: { ...emptyDate }, end: { ...emptyDate },
});

type License = {
    number: string; country: string; authority: string;
    exp: DateVal; medicalExp: DateVal;
    current: string; commercial: string; licenseClass: string;
    endorsements: string[];
    frontImage: string; backImage: string;
};
const newLicense = (): License => ({
    number: "", country: "United States", authority: "",
    exp: { ...emptyDate }, medicalExp: { ...emptyDate },
    current: "", commercial: "", licenseClass: "", endorsements: [],
    frontImage: "", backImage: "",
});

type Military = {
    // `dd214` is the "Can you obtain your DD214?" Yes/No answer; `dd214Doc` is the
    // uploaded DD214 file name (shown when the answer is Yes).
    country: string; branch: string; start: DateMY; end: DateMY; rank: string; dd214: string; dd214Doc: string;
};
const newMilitary = (): Military => ({
    country: "", branch: "", start: { ...emptyMY }, end: { ...emptyMY }, rank: "", dd214: "", dd214Doc: "",
});

// Per-employer verification documents. Each one is either off, uploaded by the
// driver now, or requested ("ask") from the employer during the hiring process.
const EMPLOYER_DOCS = [
    { key: "experience", label: "Employer Experience Letter" },
    { key: "insurance", label: "Insurance Experience Letter" },
] as const;
type DocMode = "off" | "upload" | "ask";
type EmployerDocs = Record<string, DocMode>;
const newEmployerDocs = (): EmployerDocs =>
    Object.fromEntries(EMPLOYER_DOCS.map((d) => [d.key, "upload" as DocMode]));

type Employer = {
    company: string; start: DateMY; end: DateMY;
    addr1: string; addr2: string; country: string; city: string; state: string; zip: string;
    telephone: string; position: string; reasonLeaving: string;
    terminated: string; current: string; mayContact: string; operatedCMV: string;
    subjectFMCSR: string; safetySensitive: string;
    docs: EmployerDocs;
};
const newEmployer = (): Employer => ({
    company: "", start: { ...emptyMY }, end: { ...emptyMY },
    addr1: "", addr2: "", country: "United States", city: "", state: "", zip: "",
    telephone: "", position: "", reasonLeaving: "",
    terminated: "", current: "", mayContact: "", operatedCMV: "",
    subjectFMCSR: "", safetySensitive: "",
    docs: newEmployerDocs(),
});

type Education = {
    school: string; start: DateMY; end: DateMY; city: string; state: string; country: string;
    telephone: string; study: string; graduation: DateMY;
};
const newEducation = (): Education => ({
    school: "", start: { ...emptyMY }, end: { ...emptyMY }, city: "", state: "", country: "United States",
    telephone: "", study: "", graduation: { ...emptyMY },
});

type Unemployment = { start: DateMY; end: DateMY; comments: string };
const newUnemployment = (): Unemployment => ({ start: { ...emptyMY }, end: { ...emptyMY }, comments: "" });

// Driving experience — option lists + a repeatable experience entry.
const EQUIPMENT_CLASSES = ["Straight", "Tractor and Semi-trailer", "Tractor-Two Trailer", "Tanker", "Double / Triples", "Bus", "Other"];
const FREIGHT_TYPES = ["Auto", "Bulk", "Flat", "Hazmat", "Reefer", "Tank", "Van", "Other"];
const DRIVING_REGIONS = ["Border", "Canada", "Canada-only", "USA", "USA-only", "Local"];
type DrivingExp = {
    equipmentClass: string; freightTypes: string[]; regions: string[];
    from: string; to: string; miles: string; ownerOperator: string;
};
const newDrivingExp = (): DrivingExp => ({
    equipmentClass: "", freightTypes: [], regions: [], from: "", to: "", miles: "", ownerOperator: "",
});

// Motor Vehicle Record - yes/no questions; "Yes" reveals Month/Year + explanation.
// `upload` → "Yes" also asks for an attestation document. `noDetails` → just Yes/No
// (no Month/Year + explain). `showWhen` → only shown when that question is "Yes".
export const MVR_QUESTIONS: { id: string; label: string; upload?: boolean; noDetails?: boolean; showWhen?: string }[] = [
    { id: "denied", label: "Has any license, permit or privilege ever been denied, suspended or revoked for any reason?" },
    { id: "convictedSuspension", label: "Have you ever been convicted of driving during license suspension or revocation, or driving without a valid license or an expired license, or are any charges pending?" },
    { id: "alcoholOffense", label: "Have you ever been convicted for any alcohol or controlled substance related offense while operating a motor vehicle, or are any charges pending?" },
    { id: "illegalSubstance", label: "Have you ever been convicted for possession, sale or transfer of an illegal substance (including but not limited to, marijuana, amphetamines, or derivatives thereof) while on duty, or are any charges pending?" },
    { id: "recklessDriving", label: "Have you ever been convicted of reckless driving, careless driving or careless operation of a motor vehicle, or are any charges pending?" },
    { id: "testedPositive", label: "Have you ever tested positive, or refused to test on a pre-employment drug or alcohol test by an employer to whom you applied, but did not obtain safety-sensitive transportation work covered by DOT agency drug and alcohol testing rules in past three years, or have you ever tested positive or refused to test on any DOT-mandated drug or alcohol test?", upload: true },
    { id: "returnToDuty", label: "If yes, have you successfully completed the return-to-duty process?", showWhen: "testedPositive", upload: true },
];
type MvrAnswer = { answer: string; my: DateMY; explain: string; doc: string };
const newMvrState = (): Record<string, MvrAnswer> =>
    Object.fromEntries(MVR_QUESTIONS.map((q) => [q.id, { answer: "", my: { ...emptyMY }, explain: "", doc: "" }]));

const FINE_AMOUNTS = ["$0 - $100", "$100 - $250", "$250 - $500", "$500 - $1,000", "$1,000+"];
const PENALTIES = ["Fine", "Suspension", "Revocation", "Community Service", "Other"];
const VIOLATION_CATEGORIES = ["Driver Documents", "Visible Vehicle Components", "Cargo Securement", "Hazmat / Dangerous Goods", "Hours of Service"];
export type Incident = {
    // `violations` mirrors the ticket form's multi-violation model (coded charges),
    // so the hiring / Add-Driver Traffic Violation form uses the same picker.
    date: DateMY; violations: TicketViolation[]; state: string; commercial: string; category: string; outOfService: string;
    penalties: string[]; penaltyPoints: string; fineAmount: string; comments: string;
};
export const newIncident = (): Incident => ({
    date: { ...emptyMY }, violations: [], state: "", commercial: "", category: "", outOfService: "", penalties: [], penaltyPoints: "", fineAmount: "", comments: "",
});

const ACCIDENT_TYPES = [
    "Collision with vehicle", "Collision with fixed object", "Rear-end collision",
    "Sideswipe", "Rollover", "Pedestrian", "Animal", "Cargo / Spill", "Other",
];
export type Accident = {
    date: DateMY; type: string; hazmat: string; towed: string; chemicalSpill: string;
    address: string; city: string; state: string;
    commercial: string; atFault: string; ticketed: string;
    fatalities: string; injuries: string; detail: string;
};
export const newAccident = (): Accident => ({
    date: { ...emptyMY }, type: "", hazmat: "", towed: "", chemicalSpill: "",
    address: "", city: "", state: "",
    commercial: "", atFault: "", ticketed: "",
    fatalities: "", injuries: "", detail: "",
});

const toggleArr = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

const AUTHORITY_ABBR: Record<string, string> = {
    Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO",
    Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
    Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA",
    Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN",
    Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR",
    Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
    Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA",
    "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
    Alberta: "AB", "British Columbia": "BC", Manitoba: "MB", "New Brunswick": "NB",
    "Newfoundland and Labrador": "NL", "Northwest Territories": "NT", "Nova Scotia": "NS",
    Nunavut: "NU", Ontario: "ON", "Prince Edward Island": "PE", Quebec: "QC",
    Saskatchewan: "SK", Yukon: "YT",
};
const abbr = (s: string) => AUTHORITY_ABBR[s] ?? s;
const fmtMY = (d: DateMY) => (d.m && d.y ? `${Number(d.m)}-${d.y}` : "-");

// ----------------------------- primitives (shadcn-backed) -----------------------------
function Field({ label, required, hint, children, className }: {
    label: string; required?: boolean; hint?: string; children: React.ReactNode; className?: string;
}) {
    return (
        <div className={className}>
            <Label className="text-slate-700">
                {label}
                {required && <span className="text-rose-500"> *</span>}
            </Label>
            {hint && <p className="mt-0.5 text-xs italic text-slate-500">{hint}</p>}
            <div className="mt-1.5">{children}</div>
        </div>
    );
}

function Grid({ children }: { children: React.ReactNode }) {
    return <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">{children}</div>;
}

// Labelled group used to organise long modal forms into scannable sections.
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <p className="mb-3 border-b border-slate-100 pb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">{title}</p>
            {children}
        </section>
    );
}


// Single labelled image/PDF upload box (prototype — stores the chosen file name).
function ImageUpload({ label, hint, value, onChange }: { label: string; hint?: string; value: string; onChange: (name: string) => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div>
            {label && <Label className="text-slate-700">{label}</Label>}
            <div className={label ? "mt-1.5" : ""}>
                {value ? (
                    <div className="group relative flex h-[148px] flex-col items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 px-3 text-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                            <ImageIcon className="h-5 w-5" />
                        </span>
                        <span className="max-w-full truncate px-2 text-sm font-semibold text-slate-700">{value}</span>
                        <div className="flex items-center gap-3 text-xs font-semibold">
                            <button type="button" onClick={() => inputRef.current?.click()} className="text-blue-600 hover:text-blue-700">Replace</button>
                            <span className="text-slate-300">·</span>
                            <button type="button" onClick={() => onChange("")} className="text-rose-500 hover:text-rose-600">Remove</button>
                        </div>
                    </div>
                ) : (
                    <button type="button" onClick={() => inputRef.current?.click()}
                        className="flex h-[148px] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 px-3 text-center text-slate-400 transition hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-500">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-100 transition group-hover:text-blue-500">
                            <Upload className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-semibold text-slate-600">Click to upload</span>
                        <span className="text-[11px] text-slate-400">{hint ?? "PNG, JPG or PDF · max 10MB"}</span>
                    </button>
                )}
                <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")} />
            </div>
        </div>
    );
}


function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <Input {...props} />;
}

function DateInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <Input type="date" {...props} />;
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
    return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3.5 shadow-sm sm:col-span-2">
            <span className="pr-4 text-sm font-semibold text-slate-700">{label}</span>
            <Switch checked={checked} onCheckedChange={onChange} />
        </div>
    );
}

// Thin wrapper over the shadcn Select so existing call sites keep using
// <Select value onChange placeholder><Options items=… /></Select>.
function Select({ value, onChange, children, className, placeholder }: {
    value: string; onChange: (v: string) => void; children?: React.ReactNode;
    className?: string; placeholder?: string;
}) {
    return (
        <ShadSelect value={value} onValueChange={onChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder ?? "Select..."} />
            </SelectTrigger>
            <SelectContent>{children}</SelectContent>
        </ShadSelect>
    );
}

function Options({ items }: { items: string[] }) {
    return <>{items.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</>;
}

// Searchable single-select (combobox) — used for long lists like country /
// state / province where typing to filter is faster than scrolling.
function SearchSelect({ value, onChange, items, placeholder, className }: {
    value: string; onChange: (v: string) => void; items: string[]; placeholder?: string; className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
    }, [open]);
    const filtered = items.filter((it) => it.toLowerCase().includes(q.trim().toLowerCase()));
    return (
        <div ref={ref} className={cn("relative", className)}>
            <button type="button" onClick={() => { setOpen((o) => !o); setQ(""); }}
                className={cn(
                    "flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-white px-3 text-left text-sm transition",
                    open ? "border-blue-500 ring-2 ring-blue-500/15" : "border-slate-200 hover:border-slate-300"
                )}>
                <span className={cn("truncate", value ? "text-slate-900" : "text-slate-400")}>{value || placeholder || "Select..."}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                    <div className="border-b border-slate-100 p-2">
                        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                            className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white" />
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                        {filtered.length === 0 ? (
                            <p className="px-3 py-4 text-center text-xs text-slate-400">No matches</p>
                        ) : filtered.map((it) => (
                            <button key={it} type="button" onClick={() => { onChange(it); setOpen(false); }}
                                className={cn(
                                    "flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                                    it === value ? "font-semibold text-blue-600" : "text-slate-700"
                                )}>
                                <span className="truncate">{it}</span>
                                {it === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function DateTriple({ value, onChange, years }: { value: DateVal; onChange: (v: DateVal) => void; years: string[] }) {
    return (
        <div className="flex gap-2">
            <Select className="w-[88px]" value={value.m} placeholder="MM" onChange={(m) => onChange({ ...value, m })}><Options items={MONTHS} /></Select>
            <Select className="w-[88px]" value={value.d} placeholder="DD" onChange={(d) => onChange({ ...value, d })}><Options items={DAYS} /></Select>
            <Select className="w-[110px]" value={value.y} placeholder="YYYY" onChange={(y) => onChange({ ...value, y })}><Options items={years} /></Select>
        </div>
    );
}

function DateDuo({ value, onChange, years }: { value: DateMY; onChange: (v: DateMY) => void; years: string[] }) {
    return (
        <div className="flex gap-2">
            <Select className="w-[88px]" value={value.m} placeholder="MM" onChange={(m) => onChange({ ...value, m })}><Options items={MONTHS} /></Select>
            <Select className="w-[110px]" value={value.y} placeholder="YYYY" onChange={(y) => onChange({ ...value, y })}><Options items={years} /></Select>
        </div>
    );
}

function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {["Yes", "No"].map((opt) => {
                const on = value === opt;
                return (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(opt)}
                        className={cn(
                            "min-w-[72px] rounded-md px-4 py-1.5 text-sm font-semibold transition",
                            on
                                ? opt === "Yes"
                                    ? "bg-blue-600 text-white shadow-sm"
                                    : "bg-slate-700 text-white shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        {opt}
                    </button>
                );
            })}
        </div>
    );
}

function CheckList({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
    return (
        <div className="flex flex-wrap gap-2">
            {items.map((it) => {
                const on = selected.includes(it);
                return (
                    <button key={it} type="button" onClick={() => onToggle(it)}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                            on ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        )}>
                        {on && <Check className="h-3.5 w-3.5" />}
                        {it}
                    </button>
                );
            })}
        </div>
    );
}

// Draw-or-type signature pad backed by a <canvas>; supports mouse + touch via pointer events.
function SignaturePad() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const [mode, setMode] = useState<"draw" | "type">("draw");
    const [typed, setTyped] = useState("");
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const r = canvasRef.current!.getBoundingClientRect();
        const sx = canvasRef.current!.width / r.width, sy = canvasRef.current!.height / r.height;
        return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    };
    const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (mode !== "draw") return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        drawing.current = true;
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
    };
    const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing.current) return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        const p = point(e);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.stroke();
    };
    const end = () => { drawing.current = false; };
    const clearCanvas = () => { const c = canvasRef.current; const ctx = c?.getContext("2d"); if (c && ctx) ctx.clearRect(0, 0, c.width, c.height); };
    // Render a typed name onto the canvas in a script font → signature image.
    const renderTyped = (name: string) => {
        const c = canvasRef.current; const ctx = c?.getContext("2d");
        if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        if (name.trim()) {
            ctx.fillStyle = "#1e293b";
            ctx.font = "52px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
            ctx.textBaseline = "middle";
            ctx.fillText(name, 24, c.height / 2);
        }
    };
    const clear = () => { clearCanvas(); setTyped(""); };
    const switchMode = (m: "draw" | "type") => { setMode(m); clearCanvas(); setTyped(""); };
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label className="text-slate-700">✎ Signature</Label>
                <div className="flex items-center gap-1.5">
                    <div className="flex rounded-md border border-slate-200 bg-white p-0.5">
                        {(["draw", "type"] as const).map((m) => (
                            <button key={m} type="button" onClick={() => switchMode(m)} className={cn("rounded px-2.5 py-1 text-xs font-semibold capitalize transition", mode === m ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-700")}>{m}</button>
                        ))}
                    </div>
                    <button type="button" onClick={clear} className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:text-rose-500"><Trash2 className="h-3 w-3" /> Clear</button>
                </div>
            </div>
            {mode === "type" && (
                <Input value={typed} onChange={(e) => { setTyped(e.target.value); renderTyped(e.target.value); }} placeholder="Type your full name" className="mb-2 bg-white" />
            )}
            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <canvas ref={canvasRef} width={680} height={160} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className={cn("block w-full", mode === "draw" ? "touch-none" : "pointer-events-none")} style={{ height: 160 }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{mode === "draw" ? "Draw your signature above using your mouse or finger." : "Your typed name is rendered as your signature above."}</p>
        </div>
    );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
    return (
        <div className="flex gap-2 text-sm">
            <span className="text-slate-500">{k}:</span>
            <span className="font-medium text-slate-800">{v}</span>
        </div>
    );
}

// Inline record list: each record edits in place with a Save button, then
// collapses to a summary card (Edit / Delete). New records open in edit mode.
export function InlineCollector<T,>({ items, setItems, factory, addLabel, cardTitle, renderCard, renderForm }: {
    items: T[];
    setItems: React.Dispatch<React.SetStateAction<T[]>>;
    factory: () => T;
    addLabel: string;
    cardTitle: (item: T) => React.ReactNode;
    renderCard: (item: T) => React.ReactNode;
    renderForm: (draft: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
    const [editIdx, setEditIdx] = useState<number | null>(items.length ? null : null);
    const setItem = (i: number, patch: Partial<T>) => setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
    const add = () => { const at = items.length; setItems((prev) => [...prev, factory()]); setEditIdx(at); };
    const removeAt = (i: number) => { setItems((prev) => prev.filter((_, idx) => idx !== i)); setEditIdx((cur) => (cur === i ? null : cur !== null && cur > i ? cur - 1 : cur)); };
    return (
        <div className="space-y-3">
            {items.map((item, i) => (i === editIdx ? (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                            {cardTitle(item) || `Record ${i + 1}`}
                        </span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeAt(i)} className="h-7 text-rose-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
                    </div>
                    {renderForm(item, (patch) => setItem(i, patch))}
                    <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                        <Button type="button" onClick={() => setEditIdx(null)}><Check className="h-4 w-4" /> Save</Button>
                    </div>
                </div>
            ) : (
                <div key={i} className="relative rounded-lg bg-slate-100/80 p-4 pr-12">
                    <div className="mb-2 text-sm font-semibold text-blue-600">{cardTitle(item)}</div>
                    <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">{renderCard(item)}</div>
                    <div className="absolute right-3 top-4 flex flex-col gap-2.5">
                        <button type="button" onClick={() => setEditIdx(i)} className="text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                        <button type="button" onClick={() => removeAt(i)} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                </div>
            )))}
            <Button type="button" variant="outline" onClick={add} className="w-full border-dashed"><Plus className="h-4 w-4" /> {addLabel}</Button>
        </div>
    );
}

// ── Reusable Violation & Accident forms (shared with the MVR / Driver Abstract form) ──
export function ViolationFields({ d, set }: { d: Incident; set: (patch: Partial<Incident>) => void }) {
    return (
        <div className="space-y-6">
            <FormSection title="Violation">
                <Grid>
                    <Field label="Violation Date" required><DateDuo value={d.date} years={HIST_YEARS} onChange={(v) => set({ date: v })} /></Field>
                    <Field label="State / Province" required><SearchSelect value={d.state} placeholder="Please Choose" items={STATES_PROVINCES} onChange={(v) => set({ state: v })} /></Field>
                    <Field label="Violation Category" required><Select value={d.category} placeholder="Please Choose" onChange={(v) => set({ category: v })}><Options items={VIOLATION_CATEGORIES} /></Select></Field>
                    <Field label="Out of Service?" required><YesNo value={d.outOfService} onChange={(v) => set({ outOfService: v })} /></Field>
                </Grid>
                <div className="mt-4">
                    <ViolationPicker
                        value={d.violations}
                        onChange={(v) => set({ violations: v })}
                        label="Charge / Description"
                        hint="· select all that apply, a violation can have multiple charges"
                    />
                </div>
            </FormSection>
            <FormSection title="Penalty">
                <Grid>
                    <Field label="Were you in a commercial vehicle?" required><YesNo value={d.commercial} onChange={(v) => set({ commercial: v })} /></Field>
                    <Field label="Demerit points"><TextInput type="number" min={0} placeholder="e.g. 2" value={d.penaltyPoints} onChange={(e) => set({ penaltyPoints: e.target.value })} /></Field>
                    <Field className="sm:col-span-2" label="Penalty / Fine (select all that apply)" required><CheckList items={PENALTIES} selected={d.penalties} onToggle={(v) => set({ penalties: toggleArr(d.penalties, v) })} /></Field>
                    <Field label="Fine amount (if applicable)"><Select value={d.fineAmount} placeholder="Please Choose" onChange={(v) => set({ fineAmount: v })}><Options items={FINE_AMOUNTS} /></Select></Field>
                </Grid>
            </FormSection>
            <Field label="Comments" hint='If you answered "Other" to any question, please provide additional detail.'><Textarea rows={2} value={d.comments} onChange={(e) => set({ comments: e.target.value })} /></Field>
        </div>
    );
}
export const violationTitle = (d: Incident) => (d.violations[0]?.label ? `${d.violations[0].label}${d.violations.length > 1 ? ` +${d.violations.length - 1}` : ""}` : "New Violation");
export const violationCard = (d: Incident) => (<><KV k="Date" v={fmtMY(d.date)} /><KV k="State / Prov" v={d.state ? abbr(d.state) : "-"} /><KV k="Demerit pts" v={d.penaltyPoints || "-"} /><KV k="Penalty" v={d.penalties.join(", ") || "-"} /></>);

export function AccidentFields({ d, set }: { d: Accident; set: (patch: Partial<Accident>) => void }) {
    return (
        <div className="space-y-6">
            <FormSection title="Accident / Incident">
                <Grid>
                    <Field label="Date of Accident / Incident" required><DateDuo value={d.date} years={HIST_YEARS} onChange={(v) => set({ date: v })} /></Field>
                    <Field label="Type of Accident / Incident" required><Select value={d.type} placeholder="Please Choose" onChange={(v) => set({ type: v })}><Options items={ACCIDENT_TYPES} /></Select></Field>
                </Grid>
            </FormSection>
            <FormSection title="Location">
                <Grid>
                    <Field className="sm:col-span-2" label="Location for the accident (complete address)" required><Textarea rows={2} value={d.address} placeholder="Street, City, State / Prov, ZIP / Postal" onChange={(e) => set({ address: e.target.value })} /></Field>
                    <Field label="City"><TextInput value={d.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                    <Field label="State / Prov" required><SearchSelect value={d.state} placeholder="Please Choose" items={STATES_PROVINCES} onChange={(v) => set({ state: v })} /></Field>
                </Grid>
            </FormSection>
            <FormSection title="Circumstances">
                <Grid>
                    <Field label="Were you in a commercial vehicle?" required><YesNo value={d.commercial} onChange={(v) => set({ commercial: v })} /></Field>
                    <Field label="Were you at fault?" required><YesNo value={d.atFault} onChange={(v) => set({ atFault: v })} /></Field>
                    <Field label="Were you ticketed?" required><YesNo value={d.ticketed} onChange={(v) => set({ ticketed: v })} /></Field>
                    <Field label="Was any vehicle towed away?"><YesNo value={d.towed} onChange={(v) => set({ towed: v })} /></Field>
                    <Field label="Hazmat accident / incident"><YesNo value={d.hazmat} onChange={(v) => set({ hazmat: v })} /></Field>
                    <Field label="Chemical spill?"><YesNo value={d.chemicalSpill} onChange={(v) => set({ chemicalSpill: v })} /></Field>
                </Grid>
            </FormSection>
            <FormSection title="Casualties">
                <Grid>
                    <Field label="Total number of fatalities"><TextInput type="number" min={0} value={d.fatalities} placeholder="0" onChange={(e) => set({ fatalities: e.target.value })} /></Field>
                    <Field label="Total number of injuries"><TextInput type="number" min={0} value={d.injuries} placeholder="0" onChange={(e) => set({ injuries: e.target.value })} /></Field>
                </Grid>
            </FormSection>
            <Field label="Please enter detailed information about this accident" required><Textarea rows={3} value={d.detail} onChange={(e) => set({ detail: e.target.value })} /></Field>
        </div>
    );
}
export const accidentCard = (d: Accident) => (<><KV k="Date" v={fmtMY(d.date)} /><KV k="State / Prov" v={d.state ? abbr(d.state) : "-"} /><KV k="At Fault" v={d.atFault || "-"} /><KV k="Ticketed" v={d.ticketed || "-"} /></>);

// Shared "End Date" hint used across history sections.
const endDateHint = (what: string) => `(If you are currently ${what}, please enter the current month and year as the End Date)`;

function InfoAlert({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Info className="h-4 w-4" /></div>
            <p className="text-sm text-slate-600">{children}</p>
        </div>
    );
}

// ----------------------------- application form catalog -----------------------------
export type FormConfig = {
    id: string; name: string; region: string; blurb: string;
    defaultCountry: string; idLabel: string; Icon: React.ElementType; accent: string;
};

export const APPLICATION_FORMS: FormConfig[] = [
    { id: "us", name: "US Only Driver", region: "United States", blurb: "FMCSA-compliant application for drivers operating only within the United States.", defaultCountry: "United States", idLabel: "SSN", Icon: Flag, accent: "bg-blue-50 text-blue-600" },
    { id: "canada", name: "Canada Only Driver", region: "Canada", blurb: "Application for drivers operating only within Canada - SIN and provincial licensing.", defaultCountry: "Canada", idLabel: "SIN", Icon: Leaf, accent: "bg-rose-50 text-rose-600" },
    { id: "cross-border", name: "Canada (Cross Border)", region: "Canada / US", blurb: "For Canada-based drivers operating across the Canada-US border.", defaultCountry: "Canada", idLabel: "SIN / SSN", Icon: Globe, accent: "bg-violet-50 text-violet-600" },
];

// ----------------------------- hiring / report form catalog -----------------------------
// The individual forms used across the hiring process, browsable & previewable on their own.
export type HiringFormItem = { id: string; name: string; blurb: string; group: string };
export const HIRING_FORMS: HiringFormItem[] = [
    { id: "driver-license", name: "Driver License", blurb: "License details, class, endorsements and front/back upload.", group: "License & Driving" },
    { id: "psp", name: "PSP — Pre-Employment Screening Program", blurb: "FMCSA crash and inspection history report.", group: "Reports & Screening" },
    { id: "mvr", name: "MVR — Motor Vehicle Record", blurb: "US motor vehicle record review.", group: "Reports & Screening" },
    { id: "driver-abstract", name: "Driver Abstract", blurb: "Canadian driving record / abstract review.", group: "Reports & Screening" },
    { id: "cvdr", name: "CVDR — Commercial Vehicle Driver Record", blurb: "Commercial vehicle driver record.", group: "Reports & Screening" },
    { id: "cda", name: "CDA — Commercial Driver Abstract", blurb: "Commercial driver abstract.", group: "Reports & Screening" },
    { id: "accident-history", name: "Accident History (§391.23)", blurb: "Safety Performance History — accident portion.", group: "Safety Performance (§391.23)" },
    { id: "drug-alcohol-history", name: "Drug & Alcohol History (§391.23)", blurb: "DOT-regulated drug & alcohol testing history.", group: "Safety Performance (§391.23)" },
    { id: "dot-verification", name: "DOT Employment Verification", blurb: "Prior DOT-regulated employment verification.", group: "Safety Performance (§391.23)" },
    { id: "criminal-background", name: "Criminal Background Check", blurb: "Criminal record screening result.", group: "Medical & Compliance" },
    { id: "substance-testing", name: "Substance Testing", blurb: "Pre-employment drug & alcohol test result.", group: "Medical & Compliance" },
    { id: "medical-card", name: "Medical Card", blurb: "DOT medical examiner's certificate.", group: "Medical & Compliance" },
    { id: "annual-review", name: "Annual Review of Driving Record", blurb: "§391.25 annual driving-record review.", group: "Medical & Compliance" },
    { id: "clearinghouse-query", name: "Clearinghouse Query", blurb: "FMCSA Drug & Alcohol Clearinghouse query.", group: "Medical & Compliance" },
];

// The full application data object — the SAME shape captured whether the driver
// applies through the hiring process OR is added directly via "Add Driver".
export type ApplicationData = {
    type: string; typeName: string;
    firstName: string; middleName: string; lastName: string; suffix: string;
    email: string; phone: string; cellPhone: string;
    dob: string; ssn: string; legalRightUS: boolean; legalRightCA: boolean;
    position: string; operatesInUS: string;
    address: { addr1: string; unit: string; addr2: string; country: string; city: string; state: string; zip: string };
    resided3yr: string; residenceRows: ResidenceRow[];
    preferredContact: string; bestTime: string;
    licenses: License[]; drivingExp: DrivingExp[];
    mvr: Record<string, MvrAnswer>;
    hadAccidents: string; accidents: Accident[];
    hadViolations: string; incidents: Incident[];
    employedRecently: string; employers: Employer[];
    wasUnemployed: string; unemployment: Unemployment[];
    attendedSchool: string; education: Education[];
    militaryEver: string; military: Military;
    /**
     * Every travel document the compliance catalog asks about, keyed by record id. This is
     * the source of truth; `passport` / `visa` / `workPermit` below are derived from it and
     * kept because the driver record and its mappers still read them.
     */
    /** Which country, whose citizen, what status — the answers that decide the rest. */
    travelProfile?: TravelProfile;
    travelDocs?: TravelDocs;
    passport: { number: string; country: string; expiry: DateVal; doc: string };
    // `monitor` + `reminderDays` are the app-side expiry-monitoring config for the
    // document (seeded when the office adds the driver; hidden on the driver-facing form).
    visa: { has: string; number: string; type: string; expiry: DateVal; doc: string; monitor: boolean; reminderDays: number[] };
    workPermit: { has: string; number: string; type: string; expiry: DateVal; doc: string; monitor: boolean; reminderDays: number[] };
    signedDoc: string;
};

// Section → rail icon (page/Add-Driver mode). Falls back to FileText.
const STEP_ICONS: Record<string, React.ElementType> = {
    applicant: User, address: MapPin, contact: Phone, license: CreditCard,
    disqualification: ShieldAlert, employment: Briefcase, unemployment: CalendarClock,
    education: GraduationCap, accident: Car, violation: Ban, military: Award, signature: FileSignature,
};

// ----------------------------- application form view -----------------------------
export function ApplicationFormView({ config, onBack, onPreview, initialPhase, mode = "wizard", onSaveDriver, onConfigChange, saveLabel = "Save Driver", headerTitle, initialData }: {
    config: FormConfig; onBack: () => void; onPreview?: () => void; initialPhase?: "application" | "consent";
    // "wizard" = the hiring-process step-by-step application (default).
    // "page"   = one big scrolling page (Add Driver): all sections stacked, no
    //            consent phase; emits an ApplicationData object via onSaveDriver.
    mode?: "wizard" | "page";
    onSaveDriver?: (data: ApplicationData) => void;
    onConfigChange?: (id: string) => void;   // page mode: switch the driver/region type
    saveLabel?: string;
    headerTitle?: string;
    // Pre-fill every field from an existing ApplicationData object (edit / re-open).
    initialData?: ApplicationData;
}) {
    const d0 = initialData;
    // Personal
    const [firstName, setFirstName] = useState(d0?.firstName ?? "");
    const [middleName, setMiddleName] = useState(d0?.middleName ?? "");
    const [lastName, setLastName] = useState(d0?.lastName ?? "");
    const [suffix, setSuffix] = useState(d0?.suffix ?? "");
    const [ssn, setSsn] = useState(d0?.ssn ?? "");
    const [dob, setDob] = useState(d0?.dob ?? "");
    const [legalRight, setLegalRight] = useState(d0?.legalRightUS ?? false);       // US work eligibility
    const [legalRightCA, setLegalRightCA] = useState(d0?.legalRightCA ?? false);   // Canada work eligibility (cross-border / Canada forms)

    // Address
    const [addr1, setAddr1] = useState(d0?.address?.addr1 ?? "");
    const [unit, setUnit] = useState(d0?.address?.unit ?? "");
    const [addr2, setAddr2] = useState(d0?.address?.addr2 ?? "");
    const [country, setCountry] = useState(d0?.address?.country ?? config.defaultCountry);
    const [city, setCity] = useState(d0?.address?.city ?? "");
    const [state, setState] = useState(d0?.address?.state ?? "");
    const [zip, setZip] = useState(d0?.address?.zip ?? "");
    const [resided3yr, setResided3yr] = useState(d0?.resided3yr ?? "");
    const [residenceRows, setResidenceRows] = useState<ResidenceRow[]>(d0?.residenceRows ?? []);

    // Contact
    const [primaryPhone, setPrimaryPhone] = useState(d0?.phone ?? "");
    const [cellPhone, setCellPhone] = useState(d0?.cellPhone ?? "");
    const [email, setEmail] = useState(d0?.email ?? "");
    const [confirmEmail, setConfirmEmail] = useState(d0?.email ?? "");
    const [preferredContact, setPreferredContact] = useState(d0?.preferredContact || "Primary Phone");
    const [bestTime, setBestTime] = useState(d0?.bestTime || "Any");
    const [position, setPosition] = useState(d0?.position ?? "");

    // Licenses (multiple) — one blank license is present by default; "Add Another License" adds more.
    const [licenses, setLicenses] = useState<License[]>(() => (d0?.licenses && d0.licenses.length ? d0.licenses : [newLicense()]));

    // Driving experience (multiple) — one default entry shown inline.
    const [drivingExp, setDrivingExp] = useState<DrivingExp[]>(() => (d0?.drivingExp && d0.drivingExp.length ? d0.drivingExp : [newDrivingExp()]));

    // Military (single, gated)
    const [militaryEver, setMilitaryEver] = useState(d0?.militaryEver ?? "");
    const [military, setMilitary] = useState<Military>(d0?.military ?? newMilitary());
    const setM = (patch: Partial<Military>) => setMilitary((m) => ({ ...m, ...patch }));

    // History (multiple, gated)
    const [employedRecently, setEmployedRecently] = useState(d0?.employedRecently ?? "");
    const [employers, setEmployers] = useState<Employer[]>(d0?.employers ?? []);
    const [attendedSchool, setAttendedSchool] = useState(d0?.attendedSchool ?? "");
    const [education, setEducation] = useState<Education[]>(d0?.education ?? []);
    const [wasUnemployed, setWasUnemployed] = useState(d0?.wasUnemployed ?? "");
    const [unemployment, setUnemployment] = useState<Unemployment[]>(d0?.unemployment ?? []);

    // Motor Vehicle Record — merge onto a full question set so every question id is present.
    const [mvr, setMvr] = useState<Record<string, MvrAnswer>>(() => ({ ...newMvrState(), ...(d0?.mvr ?? {}) }));
    const setMvrAnswer = (id: string, patch: Partial<MvrAnswer>) =>
        setMvr((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    // Incidents (moving violations) + Accidents (multiple, gated)
    const [hadViolations, setHadViolations] = useState(d0?.hadViolations ?? "");
    const [incidents, setIncidents] = useState<Incident[]>(d0?.incidents ?? []);
    const [hadAccidents, setHadAccidents] = useState(d0?.hadAccidents ?? "");
    const [accidents, setAccidents] = useState<Accident[]>(d0?.accidents ?? []);

    // Travel Documents — driven by the COMPLIANCE CATALOG, not by fields hardcoded here:
    // each travel record asks its own question, for its own fields, and what is answered is
    // filed as that record for the driver (see `travel-docs-bridge`). A record added to the
    // catalog appears here on its own.
    const [travelProfile, setTravelProfile] = useState<TravelProfile>(() =>
        d0?.travelProfile ?? emptyTravelProfile());
    // Every country this driver is not a citizen of, so one authorization question each.
    const needsAuth = useMemo(() => countriesNeedingAuthorization(travelProfile), [travelProfile]);
    const [travelDocs, setTravelDocs] = useState<TravelDocs>(() =>
        travelDocsFromApplication(d0, config.defaultCountry));
    const setTravelDoc = (id: string, patch: Partial<TravelDocCapture>) =>
        setTravelDocs(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    const setTravelField = (id: string, key: string, value: string) =>
        setTravelDocs(prev => ({ ...prev, [id]: { ...prev[id], fields: { ...prev[id].fields, [key]: value } } }));
    // The documents actually called for: the passport always, the right-to-work document the
    // status names, and the visa if that question was answered Yes.
    const travelRecords = useMemo(() => requiredTravelRecords(travelProfile, travelDocs), [travelProfile, travelDocs]);
    // One travel document's fields, rendered from what its catalog record declares. Named so
    // the passport can be placed before the visa question and the rest after it.
    const renderTravelDoc = (record: SafetyRecord) => {
                        const doc = travelDocs[record.id];
                        if (!doc) return null;
                        const f = travelDocFields(record);
                        const label = doc.label ?? "";
                        return (
                            <FormSection key={record.id} title={record.recordName}>
                                <Grid>
                                    {/* What the filed record is called — the same field, and the same
                                        40-character limit, as the office-side record form, prefilled
                                        with the catalog's default name. On its own row so the pairs
                                        below it (number/country, issue/expiry) stay together. */}
                                    <div className="grid grid-cols-1 gap-x-6 sm:col-span-2 sm:grid-cols-2">
                                        <Field label="Record name" required>
                                            <div className="relative">
                                                <TextInput value={label} maxLength={MAX_RECORD_NAME} className="pr-14"
                                                    placeholder={`e.g. ${defaultVersionLabel(record)}`}
                                                    onChange={(e) => setTravelDoc(record.id, { label: e.target.value })} />
                                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold tabular-nums text-slate-400">{label.length}/{MAX_RECORD_NAME}</span>
                                            </div>
                                        </Field>
                                    </div>
                                    {f.extras.map((x) => (
                                        <Field key={x.key} label={x.label}>
                                            {x.kind === "select" ? (
                                                <Select value={doc.fields[x.key] ?? ""} placeholder="Please Choose"
                                                    onChange={(v) => setTravelField(record.id, x.key, v)}>
                                                    <Options items={x.options} />
                                                </Select>
                                            ) : (
                                                <TextInput value={doc.fields[x.key] ?? ""}
                                                    onChange={(e) => setTravelField(record.id, x.key, e.target.value)} />
                                            )}
                                        </Field>
                                    ))}
                                    {f.number && (
                                        <Field label={f.numberLabel}>
                                            <TextInput value={doc.number} onChange={(e) => setTravelDoc(record.id, { number: e.target.value })} />
                                        </Field>
                                    )}
                                    {f.country && (
                                        <Field label="Issuing Country">
                                            <SearchSelect value={doc.country} items={ALL_COUNTRIES} onChange={(v) => setTravelDoc(record.id, { country: v })} />
                                        </Field>
                                    )}
                                    {f.issue && (
                                        <Field label="Issue Date">
                                            <DateInput value={isoDate(doc.issue)}
                                                onChange={(e) => setTravelDoc(record.id, { issue: fromIsoDate(e.target.value) })} />
                                        </Field>
                                    )}
                                    {f.expiry && (
                                        <Field label={f.expiryLabel}>
                                            <DateInput value={isoDate(doc.expiry)}
                                                onChange={(e) => setTravelDoc(record.id, { expiry: fromIsoDate(e.target.value) })} />
                                        </Field>
                                    )}
                                    {f.upload && (
                                        <div className="sm:col-span-2">
                                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{f.uploadLabel}</p>
                                            {doc.doc ? (
                                                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm"><FileText className="h-4 w-4" /></div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate text-[13px] font-semibold text-slate-800">{doc.doc}</div>
                                                        <div className="text-[11px] text-emerald-600">✓ Attached — filed with the record</div>
                                                    </div>
                                                    <button type="button" title="Remove" onClick={() => setTravelDoc(record.id, { doc: "" })}
                                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-white hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                                                </div>
                                            ) : (
                                                <UploadZone label="Drag a file here — or click — to upload the document"
                                                    hint="Captures the document for this record; PDF, image or file"
                                                    onFiles={(files) => { const n = files?.[0]?.name; if (n) setTravelDoc(record.id, { doc: n }); }} />
                                            )}
                                        </div>
                                    )}
                                    {/* Shown in BOTH modes: Add Driver and the hiring application file
                                        the same record, so they must capture the same alert — a
                                        document captured one way cannot arrive monitored differently
                                        from the same document captured the other. */}
                                    {f.monitoring && (
                                        <div className="sm:col-span-2">
                                            <MonitoringToggle record={record} monitoring={doc.monitoring}
                                                issueDate={isoDate(doc.issue)} expiryDate={isoDate(doc.expiry)} status=""
                                                onChange={(m) => setTravelDoc(record.id, { monitoring: m })} />
                                        </div>
                                    )}
                                </Grid>
                            </FormSection>
                        );
    };

    // The question groups — "Do they have a …?", and the record's own form once answered Yes.
    // Driven by the bridge so the form never has to know which records are asked this way.
    const questionGroups = useMemo(() => travelQuestionGroups(), []);
    const renderTravelQuestions = (group: { id: string; title: string; note?: string; records: SafetyRecord[] }) => (
        <div key={group.id} className="space-y-6">
            <FormSection title={group.title}>
                {group.note && <p className="-mt-2 mb-3 text-[12px] italic text-slate-500">{group.note}</p>}
                <Grid>
                    {group.records.map((record) => {
                        const doc = travelDocs[record.id];
                        if (!doc) return null;
                        return (
                            <Field key={record.id} label={`Do they have a ${record.recordName}?`}>
                                <YesNo value={doc.has} onChange={(v) => setTravelDoc(record.id, { has: v })} />
                            </Field>
                        );
                    })}
                </Grid>
            </FormSection>
            {/* Yes opens that record's own form — the same fields, upload and monitoring the
                office sees on the record itself. */}
            {group.records.filter((r) => travelDocs[r.id]?.has === "Yes").map(renderTravelDoc)}
        </div>
    );

    // Signed application document — page mode (Add Driver) uploads the signed
    // application/declaration instead of collecting a live e-signature.
    const [signedDoc, setSignedDoc] = useState(d0?.signedDoc ?? "");

    // Signature
    const [saveFormData, setSaveFormData] = useState(true);
    const [sendCopy, setSendCopy] = useState(false);
    const [copyEmail, setCopyEmail] = useState("");

    // Wizard step + phase (application data → consent forms)
    const [step, setStep] = useState(0);
    const [phase, setPhase] = useState<"application" | "consent">(initialPhase ?? "application");

    // Form-variant flags drive country-specific copy (work eligibility, etc.).
    const isCanada = config.defaultCountry === "Canada";
    const isCross = config.id === "cross-border";

    // Whether this driver operates in / crosses into the US. Gates the US-federal
    // report consents (FCRA · MVR · PSP · FMCSA Clearinghouse) in the consent step.
    // Canada-only applications default to No; everyone else defaults to Yes.
    const [operatesInUS, setOperatesInUS] = useState(d0?.operatesInUS ?? (isCanada && !isCross ? "No" : "Yes"));

    // Populate the whole form with realistic dummy data so the filled view can
    // be reviewed at a glance.
    const fillSample = () => {
        const st = config.defaultCountry === "Canada" ? "Ontario" : "Illinois";
        setFirstName("Kenan"); setMiddleName(""); setLastName("Gain"); setSuffix("");
        setEmail("kenan.gain@example.com"); setPrimaryPhone("(555) 218-4471");
        setDob("1990-03-14"); setSsn("***-**-4471"); setLegalRight(true); setLegalRightCA(true);
        setPosition("Company Driver");
        setOperatesInUS(isCanada && !isCross ? "No" : "Yes");
        setAddr1("18 Maple Ridge Rd"); setUnit("4"); setAddr2(""); setCountry(config.defaultCountry);
        setCity("Springfield"); setState(st); setZip("62704"); setResided3yr("Yes");
        setCellPhone("(555) 218-4471"); setConfirmEmail("kenan.gain@example.com");
        setPreferredContact("Primary Phone"); setBestTime("Any");
        setLicenses([{ number: "D1234-5678-90", country: config.defaultCountry, authority: st, exp: { m: "03", d: "04", y: "2027" }, medicalExp: { m: "06", d: "30", y: "2026" }, current: "Yes", commercial: "Yes", licenseClass: "Class A", endorsements: ["HazMat", "Tanker"], frontImage: "license-front.jpg", backImage: "license-back.jpg" }]);
        setDrivingExp([{ equipmentClass: "Tractor-trailer", freightTypes: ["Van", "Reefer"], regions: ["USA", "Border"], from: "2021-01-01", to: "2024-03-01", miles: "250000", ownerOperator: "No" }]);
        setMvr(Object.fromEntries(MVR_QUESTIONS.map((q) => [q.id, { answer: "No", my: { ...emptyMY }, explain: "", doc: "" }])));
        setHadAccidents("Yes");
        setAccidents([{ date: { m: "06", y: "2023" }, type: "Rear-end collision", hazmat: "No", towed: "No", chemicalSpill: "No", address: "1420 W Industrial Pkwy, Springfield, IL 62704", city: "Springfield", state: st, commercial: "Yes", atFault: "No", ticketed: "No", fatalities: "0", injuries: "0", detail: "Minor rear-end at low speed; no injuries." }]);
        setHadViolations("Yes");
        setIncidents([{ date: { m: "02", y: "2024" }, violations: [violationFromCharge("Speeding")], state: st, commercial: "No", category: "Hours of Service", outOfService: "No", penalties: ["Fine"], penaltyPoints: "2", fineAmount: "$100 - $250", comments: "" }]);
        setEmployedRecently("Yes");
        setEmployers([{ company: "Roadrunner Freight", start: { m: "01", y: "2021" }, end: { m: "03", y: "2024" }, addr1: "500 Depot St", addr2: "", country: config.defaultCountry, city: "Springfield", state: st, zip: "62701", telephone: "(555) 900-1200", position: "OTR Driver", reasonLeaving: "Career advancement", terminated: "No", current: "No", mayContact: "Yes", operatedCMV: "Yes", subjectFMCSR: "Yes", safetySensitive: "Yes", docs: { performance: "upload", experience: "upload", insurance: "ask" } }]);
        setAttendedSchool("Yes");
        setEducation([{ school: "Lincoln Technical Institute", start: { m: "09", y: "2019" }, end: { m: "06", y: "2020" }, city: "Springfield", state: st, country: config.defaultCountry, telephone: "", study: "Diesel Mechanics", graduation: { m: "06", y: "2020" } }]);
        setMilitaryEver("No");
        setWasUnemployed("Yes");
        setUnemployment([{ start: { m: "04", y: "2020" }, end: { m: "08", y: "2020" }, comments: "Between roles during COVID-19." }]);
        setCopyEmail("kenan.gain@example.com");
        // Travel documents — everyone has a passport; the cross-border permissions only
        // apply to cross-border drivers, and answering "No" is as real an answer as "Yes".
        const sample: Record<string, Partial<TravelDocCapture>> = {
            passport: { has: "Yes", number: "X1234567", country: config.defaultCountry, doc: "passport.pdf",
                issue: { m: "08", d: "15", y: "2020" }, expiry: { m: "08", d: "15", y: "2030" } },
            visa: isCross
                ? { has: "Yes", number: "V-99120", fields: { visaType: "TN" }, doc: "visa.pdf",
                    issue: { m: "08", d: "15", y: "2024" }, expiry: { m: "08", d: "15", y: "2029" } }
                : { has: "No" },
            "work-permit": isCross
                ? { has: "Yes", number: "WP-40877", fields: { permitType: "Employer-Specific (LMIA)" }, doc: "work-permit.pdf",
                    issue: { m: "07", d: "01", y: "2024" }, expiry: { m: "06", d: "30", y: "2028" } }
                : { has: "No" },
            "green-card": { has: "No" },
            "pr-documents": { has: "No" },
            // Border cards: asked of everyone, so both are answered. The FAST card is a
            // cross-border credential, so only a cross-border driver carries one.
            twic: { has: "No" },
            "fast-card": isCross
                ? { has: "Yes", number: "FC-3391842", country: config.defaultCountry, doc: "fast-card.pdf",
                    expiry: { m: "11", d: "30", y: "2029" } }
                : { has: "No" },
        };
        setTravelDocs(prev => {
            const next: TravelDocs = { ...prev };
            for (const [id, patch] of Object.entries(sample)) if (next[id]) next[id] = { ...next[id], ...patch };
            return next;
        });
        setSignedDoc("signed-application.pdf");
    };

    // One license's fields, rendered inline (used directly on the License step so
    // the default license shows its form without opening a modal).
    const licenseForm = (d: License, set: (patch: Partial<License>) => void) => (
        <div className="space-y-6">
            <FormSection title="License Images">
                <Grid>
                    <ImageUpload label="Front of license" value={d.frontImage} onChange={(v) => set({ frontImage: v })} />
                    <ImageUpload label="Back of license" value={d.backImage} onChange={(v) => set({ backImage: v })} />
                </Grid>
            </FormSection>

            <FormSection title="License Details">
                <Grid>
                    <Field label="License Number" required><TextInput value={d.number} onChange={(e) => set({ number: e.target.value })} /></Field>
                    <Field label="Country" required><SearchSelect value={d.country} items={COUNTRIES} onChange={(v) => set({ country: v, authority: "" })} /></Field>
                    <Field label={d.country === "Canada" ? "Issuing Province" : "Issuing State"} required><SearchSelect value={d.authority} placeholder="Please Choose" items={d.country === "Canada" ? CA_PROVINCES : US_STATES} onChange={(v) => set({ authority: v })} /></Field>
                    <Field label="License Expiration Date" required><DateTriple value={d.exp} years={EXP_YEARS} onChange={(v) => set({ exp: v })} /></Field>
                </Grid>
            </FormSection>

            <FormSection title="Classification">
                <Grid>
                    <Field label="Is this your current driver license?" required><YesNo value={d.current} onChange={(v) => set({ current: v })} /></Field>
                    <Field label="Is this a commercial driver license?" required><YesNo value={d.commercial} onChange={(v) => set({ commercial: v })} /></Field>
                    {d.commercial === "Yes" && (
                        <Field label="License Class" required><Select value={d.licenseClass} placeholder="Please Choose" onChange={(v) => set({ licenseClass: v })}><Options items={LICENSE_CLASSES} /></Select></Field>
                    )}
                    <Field label="DOT Medical Card Expiration Date"><DateTriple value={d.medicalExp} years={EXP_YEARS} onChange={(v) => set({ medicalExp: v })} /></Field>
                    <Field className="sm:col-span-2" label="Endorsements"><CheckList items={ENDORSEMENTS} selected={d.endorsements} onToggle={(v) => set({ endorsements: toggleArr(d.endorsements, v) })} /></Field>
                </Grid>
            </FormSection>
        </div>
    );

    // One employer's fields, rendered inline on the Employment step.
    const employerForm = (d: Employer, set: (patch: Partial<Employer>) => void) => {
        const setDoc = (key: string, mode: DocMode) => set({ docs: { ...d.docs, [key]: mode } });
        return (
            <div className="space-y-6">
                <FormSection title="Employer">
                    <Grid>
                        <Field className="sm:col-span-2" label="Company Name" required><TextInput value={d.company} onChange={(e) => set({ company: e.target.value })} /></Field>
                        <Field label="Start Date" required><DateDuo value={d.start} years={HIST_YEARS} onChange={(v) => set({ start: v })} /></Field>
                        <Field label="End Date" required hint={endDateHint("employed/contracted")}><DateDuo value={d.end} years={HIST_YEARS} onChange={(v) => set({ end: v })} /></Field>
                        <Field label="Position Held"><TextInput value={d.position} onChange={(e) => set({ position: e.target.value })} /></Field>
                        <Field label="Telephone"><TextInput type="tel" value={d.telephone} onChange={(e) => set({ telephone: e.target.value })} /></Field>
                    </Grid>
                </FormSection>

                <FormSection title="Employer Address">
                    <Grid>
                        <Field className="sm:col-span-2" label="Street Address"><TextInput value={d.addr1} onChange={(e) => set({ addr1: e.target.value })} /></Field>
                        <Field label="Street Address (line 2)"><TextInput value={d.addr2} onChange={(e) => set({ addr2: e.target.value })} /></Field>
                        <Field label="Country" required><SearchSelect value={d.country} items={COUNTRIES} onChange={(v) => set({ country: v, state: "" })} /></Field>
                        <Field label="City" required><TextInput value={d.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                        <Field label={d.country === "Canada" ? "Province" : "State"} required><SearchSelect value={d.state} placeholder="Please Choose" items={d.country === "Canada" ? CA_PROVINCES : US_STATES} onChange={(v) => set({ state: v })} /></Field>
                        <Field label={d.country === "Canada" ? "Postal Code" : "Zip Code"}><TextInput value={d.zip} onChange={(e) => set({ zip: e.target.value })} /></Field>
                    </Grid>
                </FormSection>

                <FormSection title="Employment">
                    <Grid>
                        <Field className="sm:col-span-2" label="Reason for leaving?" required><TextInput value={d.reasonLeaving} onChange={(e) => set({ reasonLeaving: e.target.value })} /></Field>
                        <Field label="Were you terminated / discharged / laid off?" required><YesNo value={d.terminated} onChange={(v) => set({ terminated: v })} /></Field>
                        <Field label="Is this your current employer?" required><YesNo value={d.current} onChange={(v) => set({ current: v })} /></Field>
                        <Field label="Did you operate a commercial motor vehicle?" required><YesNo value={d.operatedCMV} onChange={(v) => set({ operatedCMV: v })} /></Field>
                        <Field label="Were you subject to FMCSRs while employed?" required><YesNo value={d.subjectFMCSR} onChange={(v) => set({ subjectFMCSR: v })} /></Field>
                        <Field className="sm:col-span-2" label="Was your job designated as a Safety-Sensitive function in any DOT-regulated mode subject to the drug and alcohol testing requirements of 49 CFR Part 40?" hint="If Yes, you'll be asked to sign a Drug & Alcohol Testing Records Release for this previous employer in the consent step." required><YesNo value={d.safetySensitive} onChange={(v) => set({ safetySensitive: v })} /></Field>
                    </Grid>
                </FormSection>

                <FormSection title="Verification Documents">
                    <p className="mb-2.5 text-xs text-slate-500">Upload each document now. If the applicant doesn't have it, tick <span className="font-semibold text-slate-600">Ask employer</span> and we'll request it during the hiring process.</p>
                    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {EMPLOYER_DOCS.map((doc) => {
                            const mode = (d.docs[doc.key] ?? "upload") as DocMode;
                            const ask = mode === "ask";
                            return (
                                <div key={doc.key} className="px-4 py-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                                        <span className="flex-1 text-sm font-medium text-slate-700">{doc.label}</span>
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
                                            <Checkbox checked={ask} onCheckedChange={(c) => setDoc(doc.key, c ? "ask" : "upload")} />
                                            Ask employer
                                        </label>
                                    </div>
                                    {ask ? (
                                        <p className="mt-1.5 text-xs text-slate-400">We'll request this from the employer at hiring — the applicant doesn't need to provide it now.</p>
                                    ) : (
                                        <button type="button" className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/40 px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-slate-50">
                                            <Upload className="h-4 w-4" /> Upload {doc.label} <span className="text-xs font-normal text-slate-400">(PNG, JPG or PDF)</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </FormSection>
            </div>
        );
    };

    // One driving-experience entry, rendered inline on the Driving Experience step.
    const drivingExpForm = (d: DrivingExp, set: (patch: Partial<DrivingExp>) => void) => (
        <div className="space-y-6">
            <FormSection title="Equipment & Freight">
                <Grid>
                    <Field className="sm:col-span-2" label="Equipment Class" required><Select value={d.equipmentClass} placeholder="Please Choose" onChange={(v) => set({ equipmentClass: v })}><Options items={EQUIPMENT_CLASSES} /></Select></Field>
                    <Field className="sm:col-span-2" label="Freight Types"><CheckList items={FREIGHT_TYPES} selected={d.freightTypes} onToggle={(v) => set({ freightTypes: toggleArr(d.freightTypes, v) })} /></Field>
                    <Field className="sm:col-span-2" label="Driving Regions"><CheckList items={DRIVING_REGIONS} selected={d.regions} onToggle={(v) => set({ regions: toggleArr(d.regions, v) })} /></Field>
                </Grid>
            </FormSection>

            <FormSection title="Duration & Mileage">
                <Grid>
                    <Field label="From date" required><DateInput value={d.from} onChange={(e) => set({ from: e.target.value })} /></Field>
                    <Field label="To date" required><DateInput value={d.to} onChange={(e) => set({ to: e.target.value })} /></Field>
                    <Field label="Approximate miles"><TextInput type="number" min={0} placeholder="e.g. 250000" value={d.miles} onChange={(e) => set({ miles: e.target.value })} /></Field>
                    <Field label="Owner-operator on this experience?" required><YesNo value={d.ownerOperator} onChange={(v) => set({ ownerOperator: v })} /></Field>
                </Grid>
            </FormSection>
        </div>
    );

    // Each step renders its own panel of fields. Order here = order in the sidebar.
    const dataSteps: { key: string; title: string; fields: number; consent?: boolean; render: () => React.ReactNode }[] = [
        {
            key: "applicant", title: "Applicant Information", fields: isCross ? 9 : 8, render: () => (
                <Grid>
                    <Field label="First Name" required><TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
                    <Field label="Last Name" required><TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
                    <Field className="sm:col-span-2" label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                    <Field label="Phone Number" required><TextInput type="tel" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} /></Field>
                    <Field label="Date of Birth" required><DateInput value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
                    <Field className="sm:col-span-2" label={`${config.idLabel}`} required><TextInput value={ssn} onChange={(e) => setSsn(e.target.value)} /></Field>
                    {/* Work eligibility — country-specific. Cross-border drivers must confirm both. */}
                    {isCross ? (
                        <>
                            <ToggleField label="Do you have legal right to work in the United States?" checked={legalRight} onChange={setLegalRight} />
                            <ToggleField label="Do you have legal right to work in Canada?" checked={legalRightCA} onChange={setLegalRightCA} />
                        </>
                    ) : (
                        <ToggleField label={`Do you have legal right to work in ${isCanada ? "Canada" : "the United States"}?`} checked={isCanada ? legalRightCA : legalRight} onChange={isCanada ? setLegalRightCA : setLegalRight} />
                    )}
                    <Field className="sm:col-span-2" label="Position Type"><Select value={position} placeholder="Select..." onChange={setPosition}><Options items={POSITIONS} /></Select></Field>
                    {/* Asked in BOTH forms: it is part of the driver's record either way, and
                        defaulting it on Add Driver left the same field holding an answer nobody
                        gave. Only the consent-step consequence is wizard-specific. */}
                    <Field className="sm:col-span-2" label="Will this driver operate in or cross into the United States?"
                        hint={mode === "page" ? "Drives which US-federal authorizations (FCRA, MVR, PSP, FMCSA Clearinghouse) apply to this driver." : "If No, US-federal consents (Personal Information / FCRA, MVR, PSP, and FMCSA Drug & Alcohol Clearinghouse) won't be requested in the consent step."}
                        required><YesNo value={operatesInUS} onChange={setOperatesInUS} /></Field>
                </Grid>
            ),
        },
        {
            key: "address", title: "Address Details", fields: 8, render: () => (
                <div className="space-y-6">
                    <FormSection title="Current Address">
                        <Grid>
                            <Field className="sm:col-span-2" label="Street Address (line 1)" required><TextInput value={addr1} placeholder="Street number and name" onChange={(e) => setAddr1(e.target.value)} /></Field>
                            <Field label="Unit / Suite / Apt #"><TextInput value={unit} placeholder="e.g. 4B" onChange={(e) => setUnit(e.target.value)} /></Field>
                            <Field label="Street Address (line 2)"><TextInput value={addr2} placeholder="Building, floor (optional)" onChange={(e) => setAddr2(e.target.value)} /></Field>
                            <Field label="Country" required><SearchSelect value={country} items={COUNTRIES} onChange={(v) => { setCountry(v); setState(""); }} /></Field>
                            <Field label="City" required><TextInput value={city} onChange={(e) => setCity(e.target.value)} /></Field>
                            <Field label={country === "Canada" ? "Province" : "State"} required><SearchSelect value={state} placeholder="Please Choose" items={country === "Canada" ? CA_PROVINCES : US_STATES} onChange={setState} /></Field>
                            <Field label={country === "Canada" ? "Postal Code" : "Zip Code"} required><TextInput value={zip} onChange={(e) => setZip(e.target.value)} /></Field>
                        </Grid>
                    </FormSection>

                    <FormSection title="Residence History">
                        <div className="space-y-4">
                            <Field label="Have you lived at this address for 3 or more years?" required>
                                <YesNo value={resided3yr} onChange={(v) => { setResided3yr(v); if (v === "No" && residenceRows.length === 0) setResidenceRows([newResidenceRow()]); }} />
                            </Field>
                            {resided3yr === "No" && (
                                <>
                                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3.5">
                                        <p className="text-sm text-amber-800">Because you've lived here for less than 3 years, please add your previous addresses to cover the last 3 years.</p>
                                    </div>
                                    {residenceRows.map((row, i) => {
                                        const update = (patch: Partial<ResidenceRow>) => setResidenceRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
                                        return (
                                            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                                                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                                                        {row.address || `Residence ${i + 1}`}{i === 0 && <span className="ml-1 text-xs font-normal text-slate-400">(most recent)</span>}
                                                    </span>
                                                    {residenceRows.length > 1 && (
                                                        <Button type="button" variant="ghost" size="sm" onClick={() => setResidenceRows((rows) => rows.filter((_, idx) => idx !== i))} className="h-7 text-rose-500 hover:text-rose-600">
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                                        </Button>
                                                    )}
                                                </div>
                                                <Grid>
                                                    <Field className="sm:col-span-2" label="Street Address" required><TextInput value={row.address} placeholder="Street number and name" onChange={(e) => update({ address: e.target.value })} /></Field>
                                                    <Field label="Unit / Suite / Apt #"><TextInput value={row.unit} placeholder="e.g. 4B" onChange={(e) => update({ unit: e.target.value })} /></Field>
                                                    <Field label="Country" required><SearchSelect value={row.country} items={COUNTRIES} onChange={(v) => update({ country: v, state: "" })} /></Field>
                                                    <Field label="City" required><TextInput value={row.city} onChange={(e) => update({ city: e.target.value })} /></Field>
                                                    <Field label={row.country === "Canada" ? "Province" : "State"} required><SearchSelect value={row.state} placeholder="Please Choose" items={row.country === "Canada" ? CA_PROVINCES : US_STATES} onChange={(v) => update({ state: v })} /></Field>
                                                    <Field label={row.country === "Canada" ? "Postal Code" : "Zip Code"}><TextInput value={row.zip} onChange={(e) => update({ zip: e.target.value })} /></Field>
                                                    <Field label="Lived here from" required><DateTriple value={row.start} years={DOB_YEARS} onChange={(v) => update({ start: v })} /></Field>
                                                    <Field label="Lived here to" required><DateTriple value={row.end} years={DOB_YEARS} onChange={(v) => update({ end: v })} /></Field>
                                                </Grid>
                                            </div>
                                        );
                                    })}
                                    <Button type="button" variant="outline" onClick={() => setResidenceRows((rows) => [...rows, newResidenceRow()])} className="w-full border-dashed">
                                        <Plus className="h-4 w-4" /> Add previous residence
                                    </Button>
                                </>
                            )}
                        </div>
                    </FormSection>
                </div>
            ),
        },
        {
            key: "contact", title: "Contact Details", fields: 5, render: () => (
                <Grid>
                    <p className="text-sm italic text-slate-500 sm:col-span-2">If your cell phone is also your primary phone, enter it in both fields below.</p>
                    <Field label="Cell Phone"><TextInput type="tel" value={cellPhone} onChange={(e) => setCellPhone(e.target.value)} /></Field>
                    <Field label="Confirm Email Address" required><TextInput type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} /></Field>
                    <Field label="Preferred method of contact"><Select value={preferredContact} onChange={setPreferredContact}><Options items={CONTACT_METHODS} /></Select></Field>
                    <Field label="Best time to contact you"><Select value={bestTime} onChange={setBestTime}><Options items={CONTACT_TIMES} /></Select></Field>
                </Grid>
            ),
        },
        {
            key: "license", title: "License Details", fields: 7, render: () => (
                <div className="space-y-5">
                    <InfoAlert>Please provide all licenses you have held within the last 3 years.</InfoAlert>
                    {licenses.map((lic, i) => {
                        const set = (patch: Partial<License>) => setLicenses((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
                        return (
                            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                                        {lic.number || `License ${i + 1}`}{i === 0 && <span className="ml-1 text-xs font-normal text-slate-400">(primary)</span>}
                                    </span>
                                    {licenses.length > 1 && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setLicenses((ls) => ls.filter((_, idx) => idx !== i))} className="h-7 text-rose-500 hover:text-rose-600">
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </Button>
                                    )}
                                </div>
                                {licenseForm(lic, set)}
                            </div>
                        );
                    })}
                    <Button type="button" variant="outline" onClick={() => setLicenses((ls) => [...ls, newLicense()])} className="w-full border-dashed">
                        <Plus className="h-4 w-4" /> Add Another License
                    </Button>
                </div>
            ),
        },
        {
            key: "travel-documents", title: "Travel Documents",
            fields: 1 + needsAuth.length + QUESTION_RECORD_IDS.length + travelRecords.length * 4, render: () => {
                return (
                <div className="space-y-6">
                    <InfoAlert>
                        The <strong>passport</strong> is asked of everyone. The{" "}
                        <strong>right to work</strong> is asked per country: citizenship covers one
                        at most, so a Canadian is asked about the US, an American about Canada, and
                        anyone else about both. The <strong>visa</strong> and the{" "}
                        <strong>border cards</strong> follow from nothing but the driver&rsquo;s own
                        answer, so each is asked outright. Every document is filed as that
                        driver&rsquo;s compliance record.
                    </InfoAlert>

                    <FormSection title="Right to work">
                        <Grid>
                            {/* Every country, not the two the carrier runs in: a driver can be a
                                citizen of anywhere, and typing one that was missing came back
                                "No matches". */}
                            <Field className="sm:col-span-2" label="Which country are they a citizen of?" required>
                                <SearchSelect value={travelProfile.citizenship} items={ALL_COUNTRIES}
                                    onChange={(v) => setTravelProfile((p) => ({ ...p, citizenship: v }))} />
                            </Field>
                            {/* One question per country they are NOT a citizen of. */}
                            {needsAuth.map((country) => (
                                <Field key={country} label={`Work authorization in ${country}`} required>
                                    <Select value={travelProfile.authorization?.[country] ?? ""} placeholder="Please Choose"
                                        onChange={(v) => setTravelProfile((p) => ({ ...p, authorization: { ...p.authorization, [country]: v } }))}>
                                        <Options items={travelStatusOptions(country).map((o) => o.label)} />
                                    </Select>
                                </Field>
                            ))}
                        </Grid>
                    </FormSection>

                    {!!travelProfile.citizenship && needsAuth.length === 0 && (
                        <InfoAlert>
                            A citizen of {travelProfile.citizenship} needs no work authorization on
                            either side of the border — only the passport below.
                        </InfoAlert>
                    )}

                    {/* Order: the passport (asked of everyone), then the visa question — it is
                        asked AFTER the passport because it lives in one — then whatever the
                        right-to-work status called for, and last the border cards, which follow
                        from nothing but the driver's own answer. */}
                    {travelRecords.filter((r) => r.id === "passport").map(renderTravelDoc)}

                    {questionGroups.filter((g) => g.placement === "after-passport").map(renderTravelQuestions)}

                    {travelRecords.filter((r) => r.id !== "passport" && !isQuestionRecord(r.id)).map(renderTravelDoc)}

                    {questionGroups.filter((g) => g.placement === "after-status").map(renderTravelQuestions)}
                </div>
                );
            },
        },
        {
            key: "disqualification", title: "License Disqualification", fields: MVR_QUESTIONS.filter((q) => !q.showWhen).length, render: () => (
                <div className="space-y-6">
                    {MVR_QUESTIONS.map((q) => {
                        const a = mvr[q.id];
                        // Conditional follow-up questions only show when their parent is "Yes".
                        if (q.showWhen && mvr[q.showWhen]?.answer !== "Yes") return null;
                        return (
                            <div key={q.id} className="space-y-3">
                                <Field label={q.label} required><YesNo value={a.answer} onChange={(v) => setMvrAnswer(q.id, { answer: v })} /></Field>
                                {a.answer === "Yes" && (
                                    <div className="space-y-3 border-l-2 border-blue-100 pl-4">
                                        {!q.noDetails && <>
                                            <Field label="Month / Year"><DateDuo value={a.my} years={HIST_YEARS} onChange={(v) => setMvrAnswer(q.id, { my: v })} /></Field>
                                            <Field label="Please Explain"><Textarea value={a.explain} onChange={(e) => setMvrAnswer(q.id, { explain: e.target.value })} /></Field>
                                        </>}
                                        {q.upload && (
                                            <Field label="Attestation document">
                                                {a.doc ? (
                                                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><FileText className="h-4 w-4" /></span>
                                                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{a.doc}</p>
                                                        <button type="button" onClick={() => setMvrAnswer(q.id, { doc: "" })} className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-700">Replace</button>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => setMvrAnswer(q.id, { doc: `${q.id}-attestation.pdf` })} className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-4 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
                                                        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400"><Upload className="h-5 w-5" /></span>
                                                        <span className="text-sm font-bold text-blue-600">Click to upload</span>
                                                        <span className="text-xs text-slate-400">PNG, JPG or PDF · max 10MB</span>
                                                    </button>
                                                )}
                                            </Field>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ),
        },
        {
            key: "driving-experience", title: "Driving Experience", fields: 6, render: () => (
                <div className="space-y-5">
                    <InfoAlert>Please provide details of your driving experience, including equipment class, freight types, regions driven, dates, mileage, and owner-operator status.</InfoAlert>
                    {drivingExp.map((exp, i) => {
                        const set = (patch: Partial<DrivingExp>) => setDrivingExp((xs) => xs.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
                        return (
                            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                                        {exp.equipmentClass || `Experience ${i + 1}`}
                                    </span>
                                    {drivingExp.length > 1 && (
                                        <Button type="button" variant="ghost" size="sm" onClick={() => setDrivingExp((xs) => xs.filter((_, idx) => idx !== i))} className="h-7 text-rose-500 hover:text-rose-600">
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </Button>
                                    )}
                                </div>
                                {drivingExpForm(exp, set)}
                            </div>
                        );
                    })}
                    <Button type="button" variant="outline" onClick={() => setDrivingExp((xs) => [...xs, newDrivingExp()])} className="w-full border-dashed">
                        <Plus className="h-4 w-4" /> Add Another Experience
                    </Button>
                </div>
            ),
        },
        {
            key: "employment", title: "Employment Details", fields: 5, render: () => (
                <div className="space-y-5">
                    <Field label="Have you been employed, contracted, or attended a company orientation in the last 3 years?" required>
                        <YesNo value={employedRecently} onChange={(v) => { setEmployedRecently(v); if (v === "Yes" && employers.length === 0) setEmployers([newEmployer()]); }} />
                    </Field>
                    {employedRecently === "Yes" && (
                        <>
                            {employers.map((emp, i) => {
                                const set = (patch: Partial<Employer>) => setEmployers((es) => es.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
                                return (
                                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                                            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                                                {emp.company || `Employer ${i + 1}`}{i === 0 && <span className="ml-1 text-xs font-normal text-slate-400">(most recent)</span>}
                                            </span>
                                            {employers.length > 1 && (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => setEmployers((es) => es.filter((_, idx) => idx !== i))} className="h-7 text-rose-500 hover:text-rose-600">
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                </Button>
                                            )}
                                        </div>
                                        {employerForm(emp, set)}
                                    </div>
                                );
                            })}
                            <Button type="button" variant="outline" onClick={() => setEmployers((es) => [...es, newEmployer()])} className="w-full border-dashed">
                                <Plus className="h-4 w-4" /> Add Another Employer
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
        {
            key: "unemployment", title: "Employment Gaps", fields: 3, render: () => (
                <div className="space-y-5">
                    <Field label="Were there any gaps in your employment during the last 3 years?" required><YesNo value={wasUnemployed} onChange={setWasUnemployed} /></Field>
                    {wasUnemployed === "Yes" && (
                        <InlineCollector
                            items={unemployment}
                            setItems={setUnemployment}
                            factory={newUnemployment}
                            addLabel="Add Another Gap"
                            cardTitle={(u) => (u.start.m && u.start.y ? `${fmtMY(u.start)} - ${fmtMY(u.end)}` : "New Gap")}
                            renderCard={(u) => <KV k="Comments" v={u.comments || "-"} />}
                            renderForm={(d, set) => (
                                <Grid>
                                    <Field label="Start Date" required><DateDuo value={d.start} years={HIST_YEARS} onChange={(v) => set({ start: v })} /></Field>
                                    <Field label="End Date" required hint={endDateHint("between jobs")}><DateDuo value={d.end} years={HIST_YEARS} onChange={(v) => set({ end: v })} /></Field>
                                    <Field className="sm:col-span-2" label="Comments"><Textarea rows={2} value={d.comments} onChange={(e) => set({ comments: e.target.value })} /></Field>
                                </Grid>
                            )}
                        />
                    )}
                </div>
            ),
        },
        {
            key: "education", title: "Education Details", fields: 2, render: () => (
                <div className="space-y-5">
                    <Field label="Have you attended a school (not related to truck driving) in the last 3 years?" required><YesNo value={attendedSchool} onChange={setAttendedSchool} /></Field>
                    {attendedSchool === "Yes" && (
                        <InlineCollector
                            items={education}
                            setItems={setEducation}
                            factory={newEducation}
                            addLabel="Add Another School"
                            cardTitle={(s) => s.school || "New School"}
                            renderCard={(s) => (
                                <>
                                    <KV k="Studied" v={s.study || "-"} />
                                    <KV k="Location" v={s.city ? `${s.city}, ${abbr(s.state)}` : "-"} />
                                    <KV k="Dates" v={`${fmtMY(s.start)} - ${fmtMY(s.end)}`} />
                                    <KV k="Graduation" v={fmtMY(s.graduation)} />
                                </>
                            )}
                            renderForm={(d, set) => (
                                <div className="space-y-6">
                                    <FormSection title="School">
                                        <Grid>
                                            <Field className="sm:col-span-2" label="School name" required><TextInput value={d.school} onChange={(e) => set({ school: e.target.value })} /></Field>
                                            <Field label="Start Date" required><DateDuo value={d.start} years={HIST_YEARS} onChange={(v) => set({ start: v })} /></Field>
                                            <Field label="End Date" required hint={endDateHint("in school")}><DateDuo value={d.end} years={HIST_YEARS} onChange={(v) => set({ end: v })} /></Field>
                                        </Grid>
                                    </FormSection>
                                    <FormSection title="Location">
                                        <Grid>
                                            <Field label="City" required><TextInput value={d.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                                            <Field label="State / Province" required><SearchSelect value={d.state} placeholder="Please Choose" items={STATES_PROVINCES} onChange={(v) => set({ state: v })} /></Field>
                                            <Field label="Country" required><SearchSelect value={d.country} items={COUNTRIES} onChange={(v) => set({ country: v })} /></Field>
                                            <Field label="Telephone"><TextInput value={d.telephone} onChange={(e) => set({ telephone: e.target.value })} /></Field>
                                        </Grid>
                                    </FormSection>
                                    <FormSection title="Study">
                                        <Grid>
                                            <Field label="What did you study? (accounting, mechanic, etc.)" required><TextInput value={d.study} onChange={(e) => set({ study: e.target.value })} /></Field>
                                            <Field label="Graduation Date (leave blank if no graduation)"><DateDuo value={d.graduation} years={HIST_YEARS} onChange={(v) => set({ graduation: v })} /></Field>
                                        </Grid>
                                    </FormSection>
                                </div>
                            )}
                        />
                    )}
                </div>
            ),
        },
        {
            key: "accident", title: "Accident Details", fields: 3, render: () => (
                <div className="space-y-5">
                    <Field label="Were you involved in any accidents/incidents with any vehicle in the last 5 years (even if not at fault)?" required><YesNo value={hadAccidents} onChange={setHadAccidents} /></Field>
                    {hadAccidents === "Yes" && (
                        <>
                            <p className="text-sm italic text-slate-500">Please enter detailed information about each accident, whether chargeable, recordable, reportable, or your fault.</p>
                            <InlineCollector
                                items={accidents}
                                setItems={setAccidents}
                                factory={newAccident}
                                addLabel="Add Another Accident"
                                cardTitle={(a) => a.type || "New Accident"}
                                renderCard={accidentCard}
                                renderForm={(d, set) => <AccidentFields d={d} set={set} />}
                            />
                        </>
                    )}
                </div>
            ),
        },
        {
            key: "violation", title: "Traffic Violation Details", fields: 3, render: () => (
                <div className="space-y-5">
                    <Field label="Have you had any moving violations or traffic convictions in the past 3 Years?" required>
                        <YesNo value={hadViolations} onChange={(v) => { setHadViolations(v); if (v === "Yes" && incidents.length === 0) setIncidents([newIncident()]); }} />
                    </Field>
                    {hadViolations === "Yes" && (
                        <InlineCollector
                            items={incidents}
                            setItems={setIncidents}
                            factory={newIncident}
                            addLabel="Add Another Violation"
                            cardTitle={violationTitle}
                            renderCard={violationCard}
                            renderForm={(d, set) => <ViolationFields d={d} set={set} />}
                        />
                    )}
                </div>
            ),
        },
        {
            key: "military", title: "Military Service", fields: 6, render: () => (
                <div className="space-y-5">
                    <Field label="Were you ever in the military?"><YesNo value={militaryEver} onChange={setMilitaryEver} /></Field>
                    {militaryEver === "Yes" && (
                        <Grid>
                            <Field label="Country" required><SearchSelect value={military.country} placeholder="Please Choose" items={COUNTRIES} onChange={(v) => setM({ country: v })} /></Field>
                            <Field label="Branch of Service" required><Select value={military.branch} placeholder=" " onChange={(v) => setM({ branch: v })}><Options items={BRANCHES} /></Select></Field>
                            <Field label="Start Date" required><DateDuo value={military.start} years={HIST_YEARS} onChange={(v) => setM({ start: v })} /></Field>
                            <Field label="End Date" required hint={endDateHint("in the military")}><DateDuo value={military.end} years={HIST_YEARS} onChange={(v) => setM({ end: v })} /></Field>
                            <Field label="Rank at discharge" required><TextInput value={military.rank} onChange={(e) => setM({ rank: e.target.value })} /></Field>
                            <Field label="Can you obtain your DD214?"><YesNo value={military.dd214} onChange={(v) => setM({ dd214: v })} /></Field>
                            {military.dd214 === "Yes" && (
                                <div className="sm:col-span-2"><ImageUpload label="DD214 document" hint="PNG, JPG or PDF · max 10MB" value={military.dd214Doc} onChange={(name) => setM({ dd214Doc: name })} /></div>
                            )}
                        </Grid>
                    )}
                </div>
            ),
        },
        {
            key: "signature", title: "Signature & Declarations", fields: 4, render: () => (
                <div className="space-y-5">
                    <h3 className="text-sm font-semibold text-slate-800">Personal Info Confirmation</h3>
                    <Grid>
                        <Field label="First Name" required><TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
                        <Field label="Last Name" required><TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
                        <Field label="Middle Name"><TextInput value={middleName} onChange={(e) => setMiddleName(e.target.value)} /></Field>
                        <Field label="Suffix"><Select value={suffix} placeholder=" " onChange={setSuffix}><Options items={SUFFIXES} /></Select></Field>
                        <Field label={config.idLabel} required><TextInput value={ssn} onChange={(e) => setSsn(e.target.value)} /></Field>
                        <Field label="Date of Birth" required><DateInput value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
                    </Grid>
                    {/* Applicant-portal prompts — not shown when an admin adds the driver directly. */}
                    {mode !== "page" && (
                        <>
                            <div className="rounded-lg border border-slate-200 p-4">
                                <p className="text-sm text-slate-600">Would you like to save this form data? (optional)</p>
                                <p className="mt-1 text-xs text-slate-500">If you save, the next time you apply we can pre-fill the data for you. Saving also enables you to edit your data in the future.</p>
                                <label className="mt-3 flex cursor-pointer items-center gap-2">
                                    <Checkbox checked={saveFormData} onCheckedChange={setSaveFormData} />
                                    <span className="text-sm text-slate-700">Yes</span>
                                </label>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-4">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <Checkbox checked={sendCopy} onCheckedChange={setSendCopy} />
                                    <span className="text-sm text-slate-600">Send me a copy (optional)</span>
                                </label>
                                <Field className="mt-3" label="Email Address"><TextInput type="email" value={copyEmail} onChange={(e) => setCopyEmail(e.target.value)} /></Field>
                            </div>
                        </>
                    )}
                    {mode === "page" ? (
                        // Add Driver: upload the signed Declaration document (no live e-signature).
                        <div className="space-y-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Declaration form</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    Instead of signing here, upload the driver&rsquo;s <span className="font-semibold text-slate-700">signed Declaration form</span> — the page on
                                    which the driver certifies the application is true and complete, authorizes the investigation of their employment
                                    and safety-performance history (49 CFR 391.23), and acknowledges their rights to review and correct that information.
                                </p>
                                <p className="mt-2 text-xs italic text-slate-500">Note: attach the signed &amp; dated declaration the driver completed (scan or photo). Accepted: PNG, JPG or PDF.</p>
                            </div>
                            <ImageUpload label="Signed Declaration form" hint="PNG, JPG or PDF · max 10MB" value={signedDoc} onChange={setSignedDoc} />
                        </div>
                    ) : (
                        <>
                            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Declaration</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">By signing, I authorize the investigation of my employment and safety-performance history and certify that the information in this application is true and complete.</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">In the event of employment, I understand that false or misleading information given in my application or interview(s) may result in discharge. I also understand that I am required to abide by all rules and regulations of the Company.</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">I understand that the information I provide regarding my current and/or prior employers may be used, and those employer(s) will be contacted for the purpose of investigating my safety performance history as required by 49 CFR 391.23. I understand that I have the right to:</p>
                                <ul className="mt-1.5 space-y-1.5 text-sm leading-relaxed text-slate-600">
                                    <li className="flex gap-2"><span className="text-slate-400">•</span><span>Review information provided by current/previous employers;</span></li>
                                    <li className="flex gap-2"><span className="text-slate-400">•</span><span>Have errors in the information corrected by previous employers, and for those previous employers to resend the corrected information to the prospective employer; and</span></li>
                                    <li className="flex gap-2"><span className="text-slate-400">•</span><span>Have a rebuttal statement attached to the alleged erroneous information, if the previous employer(s) and I cannot agree on the accuracy of the information.</span></li>
                                </ul>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">This certifies that I completed this application, and that all entries on it and information in it are true and complete to the best of my knowledge.</p>
                                <p className="mt-3 text-sm font-medium text-slate-700">Note: A motor carrier may require an applicant to provide more information than that required by the Federal Motor Carrier Safety Regulations.</p>
                            </div>
                            <InfoAlert>By signing below, I agree to use an electronic signature and acknowledge that an electronic signature is as legally binding as an ink signature.</InfoAlert>
                            <p className="text-sm text-slate-600">Draw your signature with your finger or mouse, or switch to <span className="font-medium text-slate-700">Type</span> to enter your name.</p>
                            <SignaturePad />
                        </>
                    )}
                </div>
            ),
        },
    ];

    const steps = dataSteps;
    const current = steps[step];
    const isLast = step === steps.length - 1;

    // Gather every section's state into one ApplicationData object — this is the
    // shared JSON shape the Add Driver form emits (same fields as the wizard).
    const collectData = (): ApplicationData => ({
        type: config.id, typeName: config.name,
        firstName, middleName, lastName, suffix, email, phone: primaryPhone, cellPhone,
        dob, ssn, legalRightUS: legalRight, legalRightCA, position, operatesInUS,
        address: { addr1, unit, addr2, country, city, state, zip },
        resided3yr, residenceRows, preferredContact, bestTime,
        licenses, drivingExp, mvr,
        hadAccidents, accidents, hadViolations, incidents,
        employedRecently, employers, wasUnemployed, unemployment, attendedSchool, education,
        militaryEver, military,
        // The catalog-driven captures are the source of truth; these three keep their old
        // shape because the driver record and its mappers still read them.
        ...legacyTravelShape(travelDocs),
        travelProfile,
        travelDocs,
        signedDoc,
    });

    // ── Page mode (Add Driver): left progress rail + scroll-spy, like Add Asset ──
    const wizardSteps: WizardStep[] = steps.map((s) => ({ id: s.key, label: s.title, icon: STEP_ICONS[s.key] ?? FileText }));
    const pageScrollRef = useRef<HTMLDivElement | null>(null);
    const [activeSection, setActiveSection] = useState<string>(steps[0]?.key ?? "");
    useEffect(() => {
        if (mode !== "page") return;
        const root = pageScrollRef.current;
        if (!root) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (vis[0]) setActiveSection(vis[0].target.id.replace("section-", ""));
            },
            { root, rootMargin: "-12px 0px -55% 0px", threshold: 0 },
        );
        steps.forEach((s) => { const el = document.getElementById(`section-${s.key}`); if (el) obs.observe(el); });
        return () => obs.disconnect();
    }, [mode, config.id, steps.length]);
    const goToSection = (key: string) => {
        const sec = document.getElementById(`section-${key}`);
        const el = pageScrollRef.current;
        if (!sec || !el) return;
        el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12, behavior: "smooth" });
        setActiveSection(key);
    };
    const sectionFilled = (...vals: unknown[]) => vals.filter((v) => v !== "" && v != null && v !== false && !(Array.isArray(v) && v.length === 0)).length;
    const sectionCompletion = (key: string): number => {
        const dd = collectData();
        switch (key) {
            case "applicant": return sectionFilled(dd.firstName, dd.lastName, dd.email, dd.phone, dd.dob, dd.ssn, dd.position);
            case "address": return sectionFilled(dd.address.addr1, dd.address.city, dd.address.state, dd.address.zip, dd.address.country);
            case "contact": return sectionFilled(dd.cellPhone, dd.preferredContact, dd.bestTime);
            case "license": return dd.licenses.filter((l) => l.number || l.authority).length;
            case "disqualification": return sectionFilled(...Object.values(dd.mvr ?? {}));
            case "employment": return (dd.employers ?? []).filter((e) => e.company).length;
            case "unemployment": return sectionFilled(dd.wasUnemployed) + (dd.unemployment?.length ?? 0);
            case "education": return sectionFilled(dd.attendedSchool) + (dd.education?.length ?? 0);
            case "accident": return sectionFilled(dd.hadAccidents) + (dd.accidents?.length ?? 0);
            case "violation": return sectionFilled(dd.hadViolations) + (dd.incidents?.length ?? 0);
            case "military": return sectionFilled(dd.militaryEver) + sectionFilled(...Object.values((dd.military ?? {}) as Record<string, unknown>));
            // Complete once the questions are answered and every document they called for
            // has something in it — for a citizen, the questions alone are the whole section.
            case "travel-documents": return sectionFilled(
                dd.travelProfile?.citizenship ?? "",
                ...needsAuth.map(c => dd.travelProfile?.authorization?.[c] ?? ""),
                ...travelRecords.map(r => dd.travelDocs?.[r.id]?.doc ?? dd.travelDocs?.[r.id]?.number ?? ""));
            case "signature": return sectionFilled(dd.signedDoc);
            default: return 0;
        }
    };

    // Page mode — one big scrolling page (Add Driver) with a left progress rail.
    if (mode === "page") {
        return (
            <div className="flex h-full flex-col bg-[#F8FAFC]">
                {/* Header bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                            <ChevronLeft className="h-4 w-4" /> Cancel
                        </button>
                        <span className="hidden text-sm font-semibold text-slate-800 sm:inline">{headerTitle ?? "Add New Driver"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={fillSample}><Sparkles className="h-4 w-4" /> Fill sample data</Button>
                        <Button type="button" size="sm" onClick={() => onSaveDriver?.(collectData())}><Save className="h-4 w-4" /> {saveLabel}</Button>
                    </div>
                </div>

                {/* Body: progress rail + scrolling form */}
                <div className="flex flex-1 overflow-hidden">
                    <WizardStepNav steps={wizardSteps} active={activeSection} onGo={goToSection} completionFor={sectionCompletion} />

                    <div ref={pageScrollRef} className="min-w-0 flex-1 overflow-y-auto">
                        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
                            {/* Driver type (region) — picks which application fields apply. */}
                            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Driver Type</p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    {APPLICATION_FORMS.map((f) => {
                                        const active = f.id === config.id;
                                        return (
                                            <button key={f.id} type="button" onClick={() => onConfigChange?.(f.id)} disabled={!onConfigChange}
                                                className={cn(
                                                    "flex items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-default",
                                                    active ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                                                )}>
                                                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", f.accent)}><f.Icon className="h-5 w-5" /></span>
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-slate-800">{f.name}</span>
                                                    <span className="block text-xs text-slate-500">{f.region}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {/* The section card carries no `overflow-hidden`: it clipped every open
                                    dropdown at the card's edge, and the card has no fill of its own to
                                    spill past the rounded corners, so there is nothing to clip. */}
                                {steps.map((s, i) => (
                                    <section key={s.key} id={`section-${s.key}`} data-step={s.key} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-600">{i + 1}</span>
                                            <h2 className="text-base font-bold text-slate-900">{s.title}</h2>
                                        </div>
                                        <div className="p-6">{s.render()}</div>
                                    </section>
                                ))}
                            </div>

                            <div className="mt-8 flex justify-end">
                                <Button type="button" onClick={() => onSaveDriver?.(collectData())}><Save className="h-4 w-4" /> {saveLabel}</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // After the application data, the driver moves into the consent phase.
    if (phase === "consent") {
        return (
            <ConsentPhase
                typeId={config.id}
                typeName={config.name}
                operatesInUS={operatesInUS === "Yes"}
                safetySensitiveEmployers={employers
                    .filter((e) => e.safetySensitive === "Yes")
                    .map((e) => ({ company: e.company, cityStateZip: [e.city, e.state, e.zip].filter(Boolean).join(", "), telephone: e.telephone }))}
                onBack={() => setPhase("application")}
                onSubmit={onBack}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                        <ChevronLeft className="h-4 w-4" /> Application Forms
                    </button>
                    <span className="hidden text-sm font-semibold text-slate-800 sm:inline">{config.name} Application</span>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500">{config.region}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={fillSample}>
                        <Sparkles className="h-4 w-4" /> Fill sample data
                    </Button>
                    {onPreview && (
                        <Button type="button" variant="outline" size="sm" onClick={onPreview}>
                            <Eye className="h-4 w-4" /> PDF Preview
                        </Button>
                    )}
                </div>
            </div>

            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6 lg:flex-row">
                {/* Steps sidebar */}
                <aside className="lg:w-80 lg:shrink-0">
                    <div className="lg:sticky lg:top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between px-1 pb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Steps</span>
                            <span className="text-xs font-semibold text-slate-500">{step + 1}/{steps.length}</span>
                        </div>
                        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                        </div>
                        <nav className="max-h-[64vh] space-y-1 overflow-y-auto pr-1">
                            {steps.map((s, i) => {
                                const active = i === step;
                                const done = i < step;
                                return (
                                    <button
                                        key={s.key}
                                        type="button"
                                        onClick={() => setStep(i)}
                                        className={cn(
                                            "flex w-full items-start gap-3 rounded-xl p-3 text-left transition",
                                            active ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50",
                                        )}
                                    >
                                        <span className={cn(
                                            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                            active ? "bg-blue-600 text-white" : done ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500",
                                        )}>
                                            {done ? <Check className="h-4 w-4" /> : i + 1}
                                        </span>
                                        <span className="min-w-0">
                                            <span className={cn("block text-sm font-semibold", active ? "text-blue-700" : "text-slate-700")}>{s.title}</span>
                                            <span className="block text-xs text-slate-400">{s.consent ? <>Consent &middot; <span className="text-rose-400">signature</span></> : <>{s.fields} fields &middot; <span className="text-rose-400">required</span></>}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main panel */}
                <main className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Step {step + 1} of {steps.length} &middot; Form</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{current.title}</h1>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        {current.render()}
                    </div>

                    {/* Nav buttons */}
                    <div className="mt-5 flex items-center justify-between">
                        <button
                            type="button"
                            disabled={step === 0}
                            onClick={() => setStep((s) => Math.max(0, s - 1))}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition",
                                step === 0 ? "cursor-not-allowed border-slate-200 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50",
                            )}
                        >
                            <ChevronLeft className="h-4 w-4" /> Back
                        </button>
                        {isLast ? (
                            <button type="button" onClick={() => setPhase("consent")} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                Save &amp; Continue to consents <ChevronRight className="h-4 w-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                Save &amp; Continue <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

const APPLICATIONS_PATH = "/settings/hiring-process/applications";

// ----------------------------- page: dedicated application form -----------------------------
// Rendered at /settings/hiring-process/applications/:formId
export function ApplicationFormPage({ formId, onNavigate, initialPhase }: { formId: string; onNavigate: (path: string) => void; initialPhase?: "application" | "consent" }) {
    const config = APPLICATION_FORMS.find((f) => f.id === formId);
    const back = () => onNavigate(APPLICATIONS_PATH);
    if (!config) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-sm text-slate-500">That application form doesn&rsquo;t exist.</p>
                <Button variant="outline" onClick={back}>Back to Application Forms</Button>
            </div>
        );
    }
    return <ApplicationFormView config={config} onBack={back} initialPhase={initialPhase} onPreview={() => onNavigate(`${APPLICATIONS_PATH}/${config.id}/preview`)} />;
}

// ----------------------------- page: application form catalog -----------------------------
const TABS = [
    { key: "application", label: "Application Forms", Icon: FileText },
    { key: "consent", label: "Consent Forms", Icon: FileSignature },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const TAB_COPY: Record<TabKey, { kicker: string; title: string; blurb: string }> = {
    application: { kicker: "Driver Hiring - Step 1", title: "Application Forms", blurb: "The application is the first step of driver hiring. Choose the form that matches the driver type - each one collects the fields appropriate for that region." },
    consent: { kicker: "Driver Hiring - Consents", title: "Consent Forms", blurb: "The consent and policy forms a driver signs as part of the application. Open any one to view it on its own." },
};

export function ApplicationSettingsPage({ onNavigate, initialTab }: { onNavigate: (path: string) => void; initialTab?: string }) {
    const [tab, setTab] = useState<TabKey>(
        TABS.some((t) => t.key === initialTab) ? (initialTab as TabKey) : "application",
    );
    const open = (f: FormConfig) => onNavigate(`${APPLICATIONS_PATH}/${f.id}`);
    const preview = (f: FormConfig) => onNavigate(`${APPLICATIONS_PATH}/${f.id}/preview`);
    const consents = (f: FormConfig) => onNavigate(`${APPLICATIONS_PATH}/${f.id}?phase=consent`);
    const openConsent = (id: string) => onNavigate(`/settings/hiring-process/consent/${id}`);
    const previewConsent = (id: string) => onNavigate(`/settings/hiring-process/consent/${id}?pdf=1`);
    const copy = TAB_COPY[tab];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-6xl px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{copy.kicker}</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">{copy.title}</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">{copy.blurb}</p>
                </div>
                {/* Tabs — shared SubTabs (same as the Workflows builder) */}
                <div className="mx-auto max-w-6xl px-6">
                    <SubTabs
                        tabs={TABS.map((t) => ({ id: t.key, label: t.label, icon: t.Icon }))}
                        activeId={tab}
                        onChange={(id) => setTab(id)}
                        bordered={false}
                    />
                </div>
            </div>

            <div className="mx-auto max-w-6xl px-6 py-8">
                {tab === "application" && (
                    <>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-700">{APPLICATION_FORMS.length} application forms</h2>
                            <span className="text-xs text-slate-400">13 sections + driver-type consent forms</span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="hidden items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                                <span className="flex-1">Application Form</span>
                                <span className="w-36 text-center">Includes</span>
                                <span className="text-right">Actions</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {APPLICATION_FORMS.map((f) => (
                                    <div key={f.id} className="group flex flex-col gap-4 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", f.accent)}>
                                                <f.Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-semibold text-slate-900">{f.name}</span>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500">{f.region}</Badge>
                                                </div>
                                                <p className="mt-0.5 truncate text-sm text-slate-500">{f.blurb}</p>
                                            </div>
                                        </div>
                                        <div className="hidden w-36 flex-col items-center gap-1 sm:flex">
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">13 sections</span>
                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">{consentsForType(f.id).length} consent forms</span>
                                        </div>
                                        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => open(f)}>
                                                <FlaskConical className="h-4 w-4" /> Test
                                            </Button>
                                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => preview(f)}>
                                                <FileText className="h-4 w-4" /> Application form
                                            </Button>
                                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => consents(f)}>
                                                <FileSignature className="h-4 w-4" /> Consent forms
                                            </Button>
                                            <Button variant="outline" size="sm" className="shrink-0" onClick={() => preview(f)}>
                                                <Eye className="h-4 w-4" /> PDF view
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {tab === "consent" && (
                    <>
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-700">{consentForms().length} consent forms</h2>
                            <span className="text-xs text-slate-400">Signed by the driver as part of the application</span>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="divide-y divide-slate-100">
                                {consentForms().map((c) => {
                                    const region = consentRegion(c.id);
                                    const regionStyle = region === "US" ? "bg-blue-50 text-blue-600" : region === "Canada" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500";
                                    const regionLabel = region === "All" ? "Universal" : region;
                                    return (
                                        <div key={c.id} className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/70">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate font-semibold text-slate-900">{c.title} {c.accentTitle}</p>
                                                <p className="truncate text-sm text-slate-500">{c.blurb}</p>
                                            </div>
                                            <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block", regionStyle)}>{regionLabel}</span>
                                            <div className="flex shrink-0 items-center gap-2">
                                                <Button variant="outline" size="sm" className="shrink-0" onClick={() => openConsent(c.id)}>
                                                    <FlaskConical className="h-4 w-4" /> Test
                                                </Button>
                                                <Button variant="outline" size="sm" className="shrink-0" onClick={() => previewConsent(c.id)}>
                                                    <Eye className="h-4 w-4" /> PDF view
                                                </Button>
                                                <Button variant="outline" size="sm" className="shrink-0" onClick={() => openConsent(c.id)}>
                                                    Open form <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
