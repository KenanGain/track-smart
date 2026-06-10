import { useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Eye, Flag, Globe, Info, Leaf, MapPin, Pencil, Plus, Snowflake, Sparkles, Truck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select as ShadSelect, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

/**
 * Settings -> Hiring Process -> Applications
 *
 * The Application Form an applicant completes when they apply. Renders the
 * entire form top-to-bottom: Personal Information, Address (with a 3-year
 * residence-history collector), Contact, Licenses (multiple), Military Service
 * (gated), and Employment / Education / Unemployment history - each gated by a
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
    address: string; country: string; city: string; state: string; zip: string;
    start: DateVal; end: DateVal;
};
const newResidenceRow = (): ResidenceRow => ({
    address: "", country: "United States", city: "", state: "", zip: "",
    start: { ...emptyDate }, end: { ...emptyDate },
});

type License = {
    number: string; country: string; authority: string;
    exp: DateVal; medicalExp: DateVal;
    current: string; commercial: string; licenseClass: string;
    endorsements: string[];
};
const newLicense = (): License => ({
    number: "", country: "United States", authority: "",
    exp: { ...emptyDate }, medicalExp: { ...emptyDate },
    current: "", commercial: "", licenseClass: "", endorsements: [],
});

type Military = {
    country: string; branch: string; start: DateMY; end: DateMY; rank: string; dd214: string;
};
const newMilitary = (): Military => ({
    country: "", branch: "", start: { ...emptyMY }, end: { ...emptyMY }, rank: "", dd214: "",
});

type Employer = {
    company: string; start: DateMY; end: DateMY;
    addr1: string; addr2: string; country: string; city: string; state: string; zip: string;
    telephone: string; position: string; reasonLeaving: string;
    terminated: string; current: string; mayContact: string; operatedCMV: string;
};
const newEmployer = (): Employer => ({
    company: "", start: { ...emptyMY }, end: { ...emptyMY },
    addr1: "", addr2: "", country: "United States", city: "", state: "", zip: "",
    telephone: "", position: "", reasonLeaving: "",
    terminated: "", current: "", mayContact: "", operatedCMV: "",
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

// Motor Vehicle Record - yes/no questions; "Yes" reveals Month/Year + explanation.
const MVR_QUESTIONS = [
    { id: "denied", label: "Has any license, permit or privilege ever been denied, suspended or revoked for any reason?" },
    { id: "convictedSuspension", label: "Have you ever been convicted of driving during license suspension or revocation, or driving without a valid license or an expired license, or are any charges pending?" },
    { id: "alcoholOffense", label: "Have you ever been convicted for any alcohol or controlled substance related offense while operating a motor vehicle, or are any charges pending?" },
    { id: "illegalSubstance", label: "Have you ever been convicted for possession, sale or transfer of an illegal substance (including but not limited to, marijuana, amphetamines, or derivatives thereof) while on duty, or are any charges pending?" },
    { id: "recklessDriving", label: "Have you ever been convicted of reckless driving, careless driving or careless operation of a motor vehicle, or are any charges pending?" },
    { id: "testedPositive", label: "Have you ever tested positive, or refused to test on a pre-employment drug or alcohol test by an employer to whom you applied, but did not obtain safety-sensitive transportation work covered by DOT agency drug and alcohol testing rules in past three years, or have you ever tested positive or refused to test on any DOT-mandated drug or alcohol test?" },
];
type MvrAnswer = { answer: string; my: DateMY; explain: string };
const newMvrState = (): Record<string, MvrAnswer> =>
    Object.fromEntries(MVR_QUESTIONS.map((q) => [q.id, { answer: "", my: { ...emptyMY }, explain: "" }]));

const CHARGE_DESCRIPTIONS = [
    "Speeding", "Improper Lane Change", "Failure to Yield", "Following Too Closely",
    "Running Red Light / Stop Sign", "Distracted Driving", "Improper Turn",
    "Failure to Obey Traffic Control", "Other",
];
const FINE_AMOUNTS = ["$0 - $100", "$100 - $250", "$250 - $500", "$500 - $1,000", "$1,000+"];
const PENALTIES = ["Fine", "Suspension", "Revocation", "Community Service", "Other"];
type Incident = {
    date: DateMY; charge: string; state: string; commercial: string;
    penalties: string[]; fineAmount: string; comments: string;
};
const newIncident = (): Incident => ({
    date: { ...emptyMY }, charge: "", state: "", commercial: "", penalties: [], fineAmount: "", comments: "",
});

const ACCIDENT_TYPES = [
    "Collision with vehicle", "Collision with fixed object", "Rear-end collision",
    "Sideswipe", "Rollover", "Pedestrian", "Animal", "Cargo / Spill", "Other",
];
type Accident = {
    date: DateMY; type: string; hazmat: string; towed: string; city: string; state: string;
    commercial: string; atFault: string; ticketed: string; detail: string;
};
const newAccident = (): Accident => ({
    date: { ...emptyMY }, type: "", hazmat: "", towed: "", city: "", state: "",
    commercial: "", atFault: "", ticketed: "", detail: "",
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
const fmtDate = (d: DateVal) => (d.m && d.d && d.y ? `${Number(d.m)}-${Number(d.d)}-${d.y}` : "-");
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
        <div className="inline-flex gap-2">
            {["Yes", "No"].map((opt) => (
                <Button
                    key={opt}
                    type="button"
                    size="sm"
                    variant={value === opt ? "default" : "outline"}
                    onClick={() => onChange(opt)}
                    className="px-6"
                >
                    {opt}
                </Button>
            ))}
        </div>
    );
}

function CheckList({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (v: string) => void }) {
    return (
        <div className="space-y-2">
            {items.map((it) => (
                <label key={it} className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox checked={selected.includes(it)} onCheckedChange={() => onToggle(it)} />
                    <span className="text-sm text-slate-700">{it}</span>
                </label>
            ))}
        </div>
    );
}

// Draw-to-sign pad backed by a <canvas>; supports mouse + touch via pointer events.
function SignaturePad() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
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
    const clear = () => {
        const c = canvasRef.current;
        const ctx = c?.getContext("2d");
        if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
    };
    return (
        <div>
            <div className="relative overflow-hidden rounded-md border-2 border-dashed border-slate-400 bg-white">
                <canvas
                    ref={canvasRef}
                    width={560}
                    height={180}
                    onPointerDown={start}
                    onPointerMove={move}
                    onPointerUp={end}
                    onPointerLeave={end}
                    className="block w-full touch-none"
                    style={{ height: 180 }}
                />
                <div className="pointer-events-none absolute inset-x-10 bottom-10 border-b border-slate-800" />
            </div>
            <div className="mt-3 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={clear}>Clear</Button>
                <Button type="button">Save</Button>
            </div>
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

function Modal({ title, children, onClose, onSave, saveLabel = "Save" }: {
    title: string; children: React.ReactNode; onClose: () => void; onSave: () => void; saveLabel?: string;
}) {
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">{children}</div>
                <DialogFooter className="mt-0 gap-3 border-t border-slate-200 px-6 py-4">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={onSave}>{saveLabel}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Reusable list of entries with overview cards + add/edit/delete + modal editor.
function MultiEntry<T,>({ items, setItems, factory, addLabel, modalTitle, cardTitle, renderCard, renderForm }: {
    items: T[];
    setItems: React.Dispatch<React.SetStateAction<T[]>>;
    factory: () => T;
    addLabel: string;
    modalTitle: string;
    cardTitle: (item: T) => React.ReactNode;
    renderCard: (item: T) => React.ReactNode;
    renderForm: (draft: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
    const [editing, setEditing] = useState<{ idx: number; draft: T } | null>(null);
    const set = (patch: Partial<T>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));
    const save = () => {
        if (!editing) return;
        setItems((prev) => (editing.idx === -1 ? [...prev, editing.draft] : prev.map((it, i) => (i === editing.idx ? editing.draft : it))));
        setEditing(null);
    };
    return (
        <div className="space-y-4">
            {items.length > 0 && (
                <div className="space-y-3">
                    {items.map((item, i) => (
                        <div key={i} className="relative rounded-lg bg-slate-100/80 p-4 pr-12">
                            <div className="mb-2 text-sm font-semibold text-blue-600">{cardTitle(item)}</div>
                            <div className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">{renderCard(item)}</div>
                            <div className="absolute right-3 top-4 flex flex-col gap-2.5">
                                <button type="button" onClick={() => setEditing({ idx: i, draft: item })} className="text-slate-400 hover:text-blue-600"><Pencil className="h-4 w-4" /></button>
                                <button type="button" onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Button type="button" onClick={() => setEditing({ idx: -1, draft: factory() })}>
                <Plus className="h-4 w-4" /> {addLabel}
            </Button>
            {editing && (
                <Modal title={modalTitle} onClose={() => setEditing(null)} onSave={save}>
                    {renderForm(editing.draft, set)}
                </Modal>
            )}
        </div>
    );
}

// ----------------------------- residence history modal -----------------------------
function ResidenceModal({ rows, onClose, onSave }: {
    rows: ResidenceRow[]; onClose: () => void; onSave: (rows: ResidenceRow[]) => void;
}) {
    const [draft, setDraft] = useState<ResidenceRow[]>(rows.length ? rows : [newResidenceRow()]);
    const update = (i: number, patch: Partial<ResidenceRow>) =>
        setDraft((d) => d.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[88vh] max-w-3xl flex-col p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="text-base font-semibold">Residence History</DialogTitle>
                    <p className="text-sm font-normal text-slate-600">
                        We need to collect the previous 3 year(s) of residence history.
                        Please fill out all the information below to the best of your ability.
                    </p>
                </DialogHeader>
                <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {draft.map((row, i) => (
                        <div key={i} className="rounded-lg border border-slate-200 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm font-semibold text-slate-700">{i + 1}</span>
                                {draft.length > 1 && (
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft((d) => d.filter((_, idx) => idx !== i))} className="h-7 text-rose-500 hover:text-rose-600">
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </Button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field label="Address" required><TextInput value={row.address} onChange={(e) => update(i, { address: e.target.value })} /></Field>
                                <Field label="Country" required><Select value={row.country} onChange={(v) => update(i, { country: v })}><Options items={COUNTRIES} /></Select></Field>
                                <Field label="City" required><TextInput value={row.city} onChange={(e) => update(i, { city: e.target.value })} /></Field>
                                <Field label="State/Province" required><Select value={row.state} placeholder="Please Choose" onChange={(v) => update(i, { state: v })}><Options items={STATES_PROVINCES} /></Select></Field>
                                <Field label="Zip"><TextInput value={row.zip} onChange={(e) => update(i, { zip: e.target.value })} /></Field>
                            </div>
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field label="Start Date" required><DateTriple value={row.start} years={DOB_YEARS} onChange={(v) => update(i, { start: v })} /></Field>
                                <Field label="End Date" required><DateTriple value={row.end} years={DOB_YEARS} onChange={(v) => update(i, { end: v })} /></Field>
                            </div>
                        </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => setDraft((d) => [...d, newResidenceRow()])} className="border-dashed">
                        <Plus className="h-4 w-4" /> Add residence
                    </Button>
                </div>
                <DialogFooter className="mt-0 gap-3 border-t border-slate-200 px-6 py-4">
                    <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={() => onSave(draft)}>Update Residence History</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

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
    { id: "local", name: "Local / Domestic", region: "Domestic", blurb: "For local and domestic drivers operating within a single region.", defaultCountry: "United States", idLabel: "SSN / SIN", Icon: MapPin, accent: "bg-emerald-50 text-emerald-600" },
    { id: "us", name: "US Driver", region: "United States", blurb: "FMCSA-compliant application for US-based commercial drivers.", defaultCountry: "United States", idLabel: "SSN", Icon: Flag, accent: "bg-blue-50 text-blue-600" },
    { id: "canada", name: "Canada Driver", region: "Canada", blurb: "Application for Canadian drivers - SIN and provincial licensing.", defaultCountry: "Canada", idLabel: "SIN", Icon: Leaf, accent: "bg-rose-50 text-rose-600" },
    { id: "cross-border", name: "Cross-border (US-Canada)", region: "US - Canada", blurb: "For drivers operating across the US-Canada border.", defaultCountry: "United States", idLabel: "SSN / SIN", Icon: Globe, accent: "bg-violet-50 text-violet-600" },
    { id: "us-owner-operator", name: "US Owner-Operator", region: "United States", blurb: "For US owner-operators running under their own or a leased authority.", defaultCountry: "United States", idLabel: "SSN", Icon: Truck, accent: "bg-amber-50 text-amber-600" },
    { id: "canada-owner-operator", name: "Canada Owner-Operator", region: "Canada", blurb: "For Canadian owner-operators - SIN, provincial licensing and authority.", defaultCountry: "Canada", idLabel: "SIN", Icon: Snowflake, accent: "bg-sky-50 text-sky-600" },
];

// ----------------------------- application form view -----------------------------
function ApplicationFormView({ config, onBack, onPreview }: { config: FormConfig; onBack: () => void; onPreview?: () => void }) {
    // Personal
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [suffix, setSuffix] = useState("");
    const [ssn, setSsn] = useState("");
    const [dob, setDob] = useState("");
    const [legalRight, setLegalRight] = useState(false);
    const [twic, setTwic] = useState("");

    // Address
    const [addr1, setAddr1] = useState("");
    const [addr2, setAddr2] = useState("");
    const [country, setCountry] = useState(config.defaultCountry);
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");
    const [resided3yr, setResided3yr] = useState("");
    const [residenceRows, setResidenceRows] = useState<ResidenceRow[]>([]);
    const [showResidence, setShowResidence] = useState(false);

    // Contact
    const [primaryPhone, setPrimaryPhone] = useState("");
    const [cellPhone, setCellPhone] = useState("");
    const [email, setEmail] = useState("");
    const [confirmEmail, setConfirmEmail] = useState("");
    const [preferredContact, setPreferredContact] = useState("Primary Phone");
    const [bestTime, setBestTime] = useState("Any");
    const [position, setPosition] = useState("");

    // Licenses (multiple)
    const [licenses, setLicenses] = useState<License[]>([]);

    // Military (single, gated)
    const [militaryEver, setMilitaryEver] = useState("");
    const [military, setMilitary] = useState<Military>(newMilitary());
    const setM = (patch: Partial<Military>) => setMilitary((m) => ({ ...m, ...patch }));

    // History (multiple, gated)
    const [employedRecently, setEmployedRecently] = useState("");
    const [employers, setEmployers] = useState<Employer[]>([]);
    const [attendedSchool, setAttendedSchool] = useState("");
    const [education, setEducation] = useState<Education[]>([]);
    const [wasUnemployed, setWasUnemployed] = useState("");
    const [unemployment, setUnemployment] = useState<Unemployment[]>([]);

    // Motor Vehicle Record
    const [mvr, setMvr] = useState<Record<string, MvrAnswer>>(newMvrState);
    const setMvrAnswer = (id: string, patch: Partial<MvrAnswer>) =>
        setMvr((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

    // Incidents (moving violations) + Accidents (multiple, gated)
    const [hadViolations, setHadViolations] = useState("");
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [hadAccidents, setHadAccidents] = useState("");
    const [accidents, setAccidents] = useState<Accident[]>([]);

    // Signature
    const [saveFormData, setSaveFormData] = useState(true);
    const [sendCopy, setSendCopy] = useState(false);
    const [copyEmail, setCopyEmail] = useState("");

    // Wizard step
    const [step, setStep] = useState(0);

    // Populate the whole form with realistic dummy data so the filled view can
    // be reviewed at a glance.
    const fillSample = () => {
        const st = config.defaultCountry === "Canada" ? "Ontario" : "Illinois";
        setFirstName("Kenan"); setMiddleName(""); setLastName("Gain"); setSuffix("");
        setEmail("kenan.gain@example.com"); setPrimaryPhone("(555) 218-4471");
        setDob("1990-03-14"); setSsn("***-**-4471"); setLegalRight(true);
        setPosition("Company Driver"); setTwic("8821940");
        setAddr1("18 Maple Ridge Rd"); setAddr2("Unit 4"); setCountry(config.defaultCountry);
        setCity("Springfield"); setState(st); setZip("62704"); setResided3yr("Yes");
        setCellPhone("(555) 218-4471"); setConfirmEmail("kenan.gain@example.com");
        setPreferredContact("Primary Phone"); setBestTime("Any");
        setLicenses([{ number: "D1234-5678-90", country: config.defaultCountry, authority: st, exp: { m: "03", d: "04", y: "2027" }, medicalExp: { m: "06", d: "30", y: "2026" }, current: "Yes", commercial: "Yes", licenseClass: "Class A", endorsements: ["HazMat", "Tanker"] }]);
        setMvr(Object.fromEntries(MVR_QUESTIONS.map((q) => [q.id, { answer: "No", my: { ...emptyMY }, explain: "" }])));
        setHadAccidents("Yes");
        setAccidents([{ date: { m: "06", y: "2023" }, type: "Rear-end collision", hazmat: "No", towed: "No", city: "Springfield", state: st, commercial: "Yes", atFault: "No", ticketed: "No", detail: "Minor rear-end at low speed; no injuries." }]);
        setHadViolations("Yes");
        setIncidents([{ date: { m: "02", y: "2024" }, charge: "Speeding", state: st, commercial: "No", penalties: ["Fine"], fineAmount: "$100 - $250", comments: "" }]);
        setEmployedRecently("Yes");
        setEmployers([{ company: "Roadrunner Freight", start: { m: "01", y: "2021" }, end: { m: "03", y: "2024" }, addr1: "500 Depot St", addr2: "", country: config.defaultCountry, city: "Springfield", state: st, zip: "62701", telephone: "(555) 900-1200", position: "OTR Driver", reasonLeaving: "Career advancement", terminated: "No", current: "No", mayContact: "Yes", operatedCMV: "Yes" }]);
        setAttendedSchool("Yes");
        setEducation([{ school: "Lincoln Technical Institute", start: { m: "09", y: "2019" }, end: { m: "06", y: "2020" }, city: "Springfield", state: st, country: config.defaultCountry, telephone: "", study: "Diesel Mechanics", graduation: { m: "06", y: "2020" } }]);
        setMilitaryEver("No");
        setWasUnemployed("Yes");
        setUnemployment([{ start: { m: "04", y: "2020" }, end: { m: "08", y: "2020" }, comments: "Between roles during COVID-19." }]);
        setCopyEmail("kenan.gain@example.com");
    };

    // Each step renders its own panel of fields. Order here = order in the sidebar.
    const steps: { key: string; title: string; fields: number; render: () => React.ReactNode }[] = [
        {
            key: "applicant", title: "Applicant Information", fields: 9, render: () => (
                <Grid>
                    <Field label="First Name" required><TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
                    <Field label="Last Name" required><TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
                    <Field className="sm:col-span-2" label="Email"><TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
                    <Field label="Phone Number" required><TextInput type="tel" value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)} /></Field>
                    <Field label="Date of Birth" required><DateInput value={dob} onChange={(e) => setDob(e.target.value)} /></Field>
                    <Field className="sm:col-span-2" label={`${config.idLabel}`} required><TextInput value={ssn} onChange={(e) => setSsn(e.target.value)} /></Field>
                    <ToggleField label={`Do you have legal right to work in ${config.defaultCountry === "Canada" ? "Canada" : "the United States"}?`} checked={legalRight} onChange={setLegalRight} />
                    <Field className="sm:col-span-2" label="Position Type"><Select value={position} placeholder="Select..." onChange={setPosition}><Options items={POSITIONS} /></Select></Field>
                    <Field className="sm:col-span-2" label="TWIC Card Number"><TextInput type="number" placeholder="Enter number" value={twic} onChange={(e) => setTwic(e.target.value)} /></Field>
                </Grid>
            ),
        },
        {
            key: "address", title: "Address Details", fields: 9, render: () => (
                <Grid>
                    <Field className="sm:col-span-2" label="Current Street Address (line 1)" required><TextInput value={addr1} onChange={(e) => setAddr1(e.target.value)} /></Field>
                    <Field className="sm:col-span-2" label="Current Street Address (line 2)"><TextInput value={addr2} onChange={(e) => setAddr2(e.target.value)} /></Field>
                    <Field label="Country" required><Select value={country} onChange={setCountry}><Options items={COUNTRIES} /></Select></Field>
                    <Field label="City" required><TextInput value={city} onChange={(e) => setCity(e.target.value)} /></Field>
                    <Field label="State/Province" required><Select value={state} placeholder="Please Choose" onChange={setState}><Options items={STATES_PROVINCES} /></Select></Field>
                    <Field label="Zip/Postal Code" required><TextInput value={zip} onChange={(e) => setZip(e.target.value)} /></Field>
                    <Field className="sm:col-span-2" label="Residence address for 3 or more years?" required><YesNo value={resided3yr} onChange={setResided3yr} /></Field>
                    <div className="sm:col-span-2">
                        <button type="button" onClick={() => setShowResidence(true)} className="rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Edit Residence History</button>
                        {residenceRows.length > 0 && <p className="mt-2 text-xs text-slate-500">{residenceRows.length} residence record(s) saved.</p>}
                    </div>
                </Grid>
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
                    <MultiEntry
                        items={licenses}
                        setItems={setLicenses}
                        factory={newLicense}
                        addLabel="Add Another License"
                        modalTitle="License Details"
                        cardTitle={(l) => l.number || "New License"}
                        renderCard={(l) => (
                            <>
                                <KV k="Licensing Authority" v={l.authority ? abbr(l.authority) : "-"} />
                                <KV k="Class" v={l.licenseClass || "-"} />
                                <KV k="Current" v={l.current || "-"} />
                                <KV k="CDL" v={l.commercial || "-"} />
                                <KV k="Expiration Date" v={fmtDate(l.exp)} />
                            </>
                        )}
                        renderForm={(d, set) => (
                            <>
                                <Field label="License Number" required><TextInput value={d.number} onChange={(e) => set({ number: e.target.value })} /></Field>
                                <Field label="Country" required><Select value={d.country} onChange={(v) => set({ country: v })}><Options items={COUNTRIES} /></Select></Field>
                                <Field label="Licensing Authority" required><Select value={d.authority} placeholder="Please Choose" onChange={(v) => set({ authority: v })}><Options items={STATES_PROVINCES} /></Select></Field>
                                <Field label="License Expiration Date" required><DateTriple value={d.exp} years={EXP_YEARS} onChange={(v) => set({ exp: v })} /></Field>
                                <Field label="DOT Medical Card Expiration Date"><DateTriple value={d.medicalExp} years={EXP_YEARS} onChange={(v) => set({ medicalExp: v })} /></Field>
                                <Field label="Is this your current driver license?" required><YesNo value={d.current} onChange={(v) => set({ current: v })} /></Field>
                                <Field label="Is this a commercial driver license?" required><YesNo value={d.commercial} onChange={(v) => set({ commercial: v })} /></Field>
                                {d.commercial === "Yes" && (
                                    <Field label="License Class" required><Select value={d.licenseClass} placeholder="Please Choose" onChange={(v) => set({ licenseClass: v })}><Options items={LICENSE_CLASSES} /></Select></Field>
                                )}
                                <Field label="Endorsements"><CheckList items={ENDORSEMENTS} selected={d.endorsements} onToggle={(v) => set({ endorsements: toggleArr(d.endorsements, v) })} /></Field>
                            </>
                        )}
                    />
                </div>
            ),
        },
        {
            key: "disqualification", title: "License Disqualification", fields: MVR_QUESTIONS.length, render: () => (
                <div className="space-y-6">
                    {MVR_QUESTIONS.map((q) => {
                        const a = mvr[q.id];
                        return (
                            <div key={q.id} className="space-y-3">
                                <Field label={q.label} required><YesNo value={a.answer} onChange={(v) => setMvrAnswer(q.id, { answer: v })} /></Field>
                                {a.answer === "Yes" && (
                                    <div className="space-y-3 border-l-2 border-blue-100 pl-4">
                                        <Field label="Month / Year"><DateDuo value={a.my} years={HIST_YEARS} onChange={(v) => setMvrAnswer(q.id, { my: v })} /></Field>
                                        <Field label="Please Explain"><Textarea value={a.explain} onChange={(e) => setMvrAnswer(q.id, { explain: e.target.value })} /></Field>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
                            <MultiEntry
                                items={accidents}
                                setItems={setAccidents}
                                factory={newAccident}
                                addLabel="Add Another Accident"
                                modalTitle="Accident Details"
                                cardTitle={(a) => a.type || "New Accident"}
                                renderCard={(a) => (
                                    <>
                                        <KV k="Date" v={fmtMY(a.date)} />
                                        <KV k="State / Prov" v={a.state ? abbr(a.state) : "-"} />
                                        <KV k="At Fault" v={a.atFault || "-"} />
                                        <KV k="Ticketed" v={a.ticketed || "-"} />
                                    </>
                                )}
                                renderForm={(d, set) => (
                                    <>
                                        <Field label="Date of Accident / Incident" required><DateDuo value={d.date} years={HIST_YEARS} onChange={(v) => set({ date: v })} /></Field>
                                        <Field label="Type of Accident / Incident" required><Select value={d.type} placeholder="Please Choose" onChange={(v) => set({ type: v })}><Options items={ACCIDENT_TYPES} /></Select></Field>
                                        <Field label="Hazmat Accident / Incident"><YesNo value={d.hazmat} onChange={(v) => set({ hazmat: v })} /></Field>
                                        <Field label="Was any vehicle towed away?"><YesNo value={d.towed} onChange={(v) => set({ towed: v })} /></Field>
                                        <Field label="City"><TextInput value={d.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                                        <Field label="State / Prov" required><Select value={d.state} placeholder="Please Choose" onChange={(v) => set({ state: v })}><Options items={STATES_PROVINCES} /></Select></Field>
                                        <Field label="Were you in a commercial vehicle?" required><YesNo value={d.commercial} onChange={(v) => set({ commercial: v })} /></Field>
                                        <Field label="Were you at fault?" required><YesNo value={d.atFault} onChange={(v) => set({ atFault: v })} /></Field>
                                        <Field label="Were you ticketed?" required><YesNo value={d.ticketed} onChange={(v) => set({ ticketed: v })} /></Field>
                                        <Field label="Please enter detailed information about this accident" required><Textarea value={d.detail} onChange={(e) => set({ detail: e.target.value })} /></Field>
                                    </>
                                )}
                            />
                        </>
                    )}
                </div>
            ),
        },
        {
            key: "violation", title: "Traffic Violation Details", fields: 3, render: () => (
                <div className="space-y-5">
                    <Field label="Have you had any moving violations or traffic convictions in the past 3 Years?" required><YesNo value={hadViolations} onChange={setHadViolations} /></Field>
                    {hadViolations === "Yes" && (
                        <MultiEntry
                            items={incidents}
                            setItems={setIncidents}
                            factory={newIncident}
                            addLabel="Add Another Incident"
                            modalTitle="Incident Details"
                            cardTitle={(i) => i.charge || "New Incident"}
                            renderCard={(i) => (
                                <>
                                    <KV k="Violation Date" v={fmtMY(i.date)} />
                                    <KV k="State / Prov" v={i.state ? abbr(i.state) : "-"} />
                                    <KV k="Commercial Vehicle" v={i.commercial || "-"} />
                                    <KV k="Penalty" v={i.penalties.length ? i.penalties.join(", ") : "-"} />
                                </>
                            )}
                            renderForm={(d, set) => (
                                <>
                                    <Field label="Violation Date" required><DateDuo value={d.date} years={HIST_YEARS} onChange={(v) => set({ date: v })} /></Field>
                                    <Field label="Charge / Description" required><Select value={d.charge} placeholder="Please Choose" onChange={(v) => set({ charge: v })}><Options items={CHARGE_DESCRIPTIONS} /></Select></Field>
                                    <Field label="State / Prov" required><Select value={d.state} placeholder="Please Choose" onChange={(v) => set({ state: v })}><Options items={STATES_PROVINCES} /></Select></Field>
                                    <Field label="Were you in a Commercial Vehicle?" required><YesNo value={d.commercial} onChange={(v) => set({ commercial: v })} /></Field>
                                    <Field label="Penalty / Fine (Check all that apply)" required><CheckList items={PENALTIES} selected={d.penalties} onToggle={(v) => set({ penalties: toggleArr(d.penalties, v) })} /></Field>
                                    <Field label="Fine Amount (if applicable)"><Select className="w-48" value={d.fineAmount} placeholder=" " onChange={(v) => set({ fineAmount: v })}><Options items={FINE_AMOUNTS} /></Select></Field>
                                    <Field label="Comments" hint='If you answered "Other" to any question, please provide additional detail:'><Textarea value={d.comments} onChange={(e) => set({ comments: e.target.value })} /></Field>
                                </>
                            )}
                        />
                    )}
                </div>
            ),
        },
        {
            key: "employment", title: "Employment Details", fields: 5, render: () => (
                <div className="space-y-5">
                    <Field label="Have you been employed, contracted, or attended a company orientation in the last 3 years?" required><YesNo value={employedRecently} onChange={setEmployedRecently} /></Field>
                    {employedRecently === "Yes" && (
                        <MultiEntry
                            items={employers}
                            setItems={setEmployers}
                            factory={newEmployer}
                            addLabel="Add Another Employer"
                            modalTitle="Employer/Contract Information"
                            cardTitle={(e) => e.company || "New Employer"}
                            renderCard={(e) => (
                                <>
                                    <KV k="Position" v={e.position || "-"} />
                                    <KV k="Dates" v={`${fmtMY(e.start)} - ${fmtMY(e.end)}`} />
                                    <KV k="Current" v={e.current || "-"} />
                                    <KV k="Operated CMV" v={e.operatedCMV || "-"} />
                                </>
                            )}
                            renderForm={(d, set) => (
                                <>
                                    <Field label="Company Name" required><TextInput value={d.company} onChange={(e) => set({ company: e.target.value })} /></Field>
                                    <Field label="Start Date" required><DateDuo value={d.start} years={HIST_YEARS} onChange={(v) => set({ start: v })} /></Field>
                                    <Field label="End Date" required hint={endDateHint("employed/contracted")}><DateDuo value={d.end} years={HIST_YEARS} onChange={(v) => set({ end: v })} /></Field>
                                    <Field label="Street Address"><TextInput value={d.addr1} onChange={(e) => set({ addr1: e.target.value })} /></Field>
                                    <Field label="Street Address (line 2)"><TextInput value={d.addr2} onChange={(e) => set({ addr2: e.target.value })} /></Field>
                                    <Field label="Country" required><Select value={d.country} onChange={(v) => set({ country: v })}><Options items={COUNTRIES} /></Select></Field>
                                    <Field label="City" required><TextInput value={d.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                                    <Field label="State/Province" required><Select value={d.state} placeholder="Please Choose" onChange={(v) => set({ state: v })}><Options items={STATES_PROVINCES} /></Select></Field>
                                    <Field label="Zip/Postal"><TextInput value={d.zip} onChange={(e) => set({ zip: e.target.value })} /></Field>
                                    <Field label="Telephone"><TextInput value={d.telephone} onChange={(e) => set({ telephone: e.target.value })} /></Field>
                                    <Field label="Position Held"><TextInput value={d.position} onChange={(e) => set({ position: e.target.value })} /></Field>
                                    <Field label="Reason for leaving?" required><TextInput value={d.reasonLeaving} onChange={(e) => set({ reasonLeaving: e.target.value })} /></Field>
                                    <Field label="Were you terminated/discharged/laid off?" required><YesNo value={d.terminated} onChange={(v) => set({ terminated: v })} /></Field>
                                    <Field label="Is this your current employer?" required><YesNo value={d.current} onChange={(v) => set({ current: v })} /></Field>
                                    <Field label="May we contact this employer at this time?" required><YesNo value={d.mayContact} onChange={(v) => set({ mayContact: v })} /></Field>
                                    <Field label="Did you operate a commercial motor vehicle?" required><YesNo value={d.operatedCMV} onChange={(v) => set({ operatedCMV: v })} /></Field>
                                </>
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
                        <MultiEntry
                            items={education}
                            setItems={setEducation}
                            factory={newEducation}
                            addLabel="Add Another School"
                            modalTitle="Education Information"
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
                                <>
                                    <Field label="School name" required><TextInput value={d.school} onChange={(e) => set({ school: e.target.value })} /></Field>
                                    <Field label="Start Date" required><DateDuo value={d.start} years={HIST_YEARS} onChange={(v) => set({ start: v })} /></Field>
                                    <Field label="End Date" required hint={endDateHint("in school")}><DateDuo value={d.end} years={HIST_YEARS} onChange={(v) => set({ end: v })} /></Field>
                                    <Field label="City" required><TextInput value={d.city} onChange={(e) => set({ city: e.target.value })} /></Field>
                                    <Field label="State / Province" required><Select value={d.state} placeholder="Please Choose" onChange={(v) => set({ state: v })}><Options items={STATES_PROVINCES} /></Select></Field>
                                    <Field label="Country" required><Select value={d.country} onChange={(v) => set({ country: v })}><Options items={COUNTRIES} /></Select></Field>
                                    <Field label="Telephone"><TextInput value={d.telephone} onChange={(e) => set({ telephone: e.target.value })} /></Field>
                                    <Field label="What did you study? (accounting, mechanic, etc.)" required><TextInput value={d.study} onChange={(e) => set({ study: e.target.value })} /></Field>
                                    <Field label="Graduation Date (leave blank if no graduation)"><DateDuo value={d.graduation} years={HIST_YEARS} onChange={(v) => set({ graduation: v })} /></Field>
                                </>
                            )}
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
                            <Field label="Country" required><Select value={military.country} placeholder=" " onChange={(v) => setM({ country: v })}><Options items={COUNTRIES} /></Select></Field>
                            <Field label="Branch of Service" required><Select value={military.branch} placeholder=" " onChange={(v) => setM({ branch: v })}><Options items={BRANCHES} /></Select></Field>
                            <Field label="Start Date" required><DateDuo value={military.start} years={HIST_YEARS} onChange={(v) => setM({ start: v })} /></Field>
                            <Field label="End Date" required hint={endDateHint("in the military")}><DateDuo value={military.end} years={HIST_YEARS} onChange={(v) => setM({ end: v })} /></Field>
                            <Field label="Rank at discharge" required><TextInput value={military.rank} onChange={(e) => setM({ rank: e.target.value })} /></Field>
                            <Field label="Can you obtain your DD214?"><YesNo value={military.dd214} onChange={(v) => setM({ dd214: v })} /></Field>
                        </Grid>
                    )}
                </div>
            ),
        },
        {
            key: "unemployment", title: "Unemployment", fields: 3, render: () => (
                <div className="space-y-5">
                    <Field label="Have you been unemployed at any time within the last 3 years?" required><YesNo value={wasUnemployed} onChange={setWasUnemployed} /></Field>
                    {wasUnemployed === "Yes" && (
                        <MultiEntry
                            items={unemployment}
                            setItems={setUnemployment}
                            factory={newUnemployment}
                            addLabel="Add Another Period"
                            modalTitle="Unemployment Information"
                            cardTitle={(u) => `${fmtMY(u.start)} - ${fmtMY(u.end)}`}
                            renderCard={(u) => <KV k="Comments" v={u.comments || "-"} />}
                            renderForm={(d, set) => (
                                <>
                                    <Field label="Start Date" required><DateDuo value={d.start} years={HIST_YEARS} onChange={(v) => set({ start: v })} /></Field>
                                    <Field label="End Date" required hint={endDateHint("unemployed")}><DateDuo value={d.end} years={HIST_YEARS} onChange={(v) => set({ end: v })} /></Field>
                                    <Field label="Comments"><Textarea value={d.comments} onChange={(e) => set({ comments: e.target.value })} /></Field>
                                </>
                            )}
                        />
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
                    <InfoAlert>By signing below, I agree to use an electronic signature and acknowledge that an electronic signature is as legally binding as an ink signature.</InfoAlert>
                    <p className="text-sm text-slate-600">Please use your finger or mouse to sign your name in the rectangle below. Click "Save" when finished.</p>
                    <SignaturePad />
                </div>
            ),
        },
    ];

    const current = steps[step];
    const isLast = step === steps.length - 1;

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
                                            <span className="block text-xs text-slate-400">{s.fields} fields &middot; <span className="text-rose-400">required</span></span>
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
                            <button type="button" className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700">
                                Submit Application <Check className="h-4 w-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                                Next <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </main>
            </div>

            {showResidence && (
                <ResidenceModal rows={residenceRows} onClose={() => setShowResidence(false)} onSave={(rows) => { setResidenceRows(rows); setShowResidence(false); }} />
            )}
        </div>
    );
}

const APPLICATIONS_PATH = "/settings/hiring-process/applications";

// ----------------------------- page: dedicated application form -----------------------------
// Rendered at /settings/hiring-process/applications/:formId
export function ApplicationFormPage({ formId, onNavigate }: { formId: string; onNavigate: (path: string) => void }) {
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
    return <ApplicationFormView config={config} onBack={back} onPreview={() => onNavigate(`${APPLICATIONS_PATH}/${config.id}/preview`)} />;
}

// ----------------------------- page: application form catalog -----------------------------
export function ApplicationSettingsPage({ onNavigate }: { onNavigate: (path: string) => void }) {
    const open = (f: FormConfig) => onNavigate(`${APPLICATIONS_PATH}/${f.id}`);
    const preview = (f: FormConfig) => onNavigate(`${APPLICATIONS_PATH}/${f.id}/preview`);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Hiring - Step 1</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Application Forms</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        The application is the first step of driver hiring. Choose the form that matches the
                        driver type - each one collects the fields appropriate for that region.
                    </p>
                </div>
            </div>

            {/* Form list */}
            <div className="mx-auto max-w-5xl px-6 py-8">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-700">{APPLICATION_FORMS.length} application forms</h2>
                    <span className="text-xs text-slate-400">Each form has 12 sections</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="hidden items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex">
                        <span className="flex-1">Application Form</span>
                        <span className="w-28 text-center">Sections</span>
                        <span className="w-[230px] text-right">Actions</span>
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
                                <div className="hidden w-28 justify-center sm:flex">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">12 sections</span>
                                </div>
                                <div className="flex w-full items-center justify-end gap-2 sm:w-[230px]">
                                    <Button variant="outline" size="sm" onClick={() => preview(f)}>
                                        <Eye className="h-4 w-4" /> Preview
                                    </Button>
                                    <Button size="sm" onClick={() => open(f)}>
                                        Open form <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
