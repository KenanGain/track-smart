import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Check, IdCard, Truck } from "lucide-react";
import {
    VENDORS,
    VENDOR_CATEGORIES,
    getCategoryLabel,
    CARRIER_NAME,
    type Recurrence,
    type Reminder,
    type InventoryStatus,
    type AssignmentKind,
    type Assignment,
} from "./inventory.data";
import { AssignmentTargetPicker } from "./AssignmentTargetPicker";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
};

export type InventoryFormPayload = {
    vendorId: string;
    serial: string;
    pin: string;
    issueDate: string;
    expiryDate: string;
    recurrence: Recurrence;
    reminder: Reminder;
    status: InventoryStatus;
    assignedTo?: Assignment;
};

const RECURRENCE_OPTIONS: Recurrence[] = ["None", "Monthly", "Quarterly", "Yearly"];
const REMINDER_OPTIONS: Reminder[] = ["None", "1 day", "1 week", "1 month"];
const STATUS_OPTIONS: InventoryStatus[] = ["Active", "Expiring Soon", "Expired"];

const KIND_OPTIONS: { value: AssignmentKind; label: string; helper: string }[] = [
    { value: "cmv",     label: "CMV",     helper: "Power units (trucks)" },
    { value: "non-cmv", label: "Non-CMV", helper: "Trailers / vans / other" },
    { value: "driver",  label: "Driver",  helper: "Assign directly to a driver" },
];

export function AddInventoryItemPage({ onNavigate }: Props) {
    // §1 Inventory Details
    const [vendorId, setVendorId] = useState(VENDORS[0]?.id ?? "");
    const [serial, setSerial] = useState("");
    const [pin, setPin] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [recurrence, setRecurrence] = useState<Recurrence>("Yearly");
    const [reminder, setReminder] = useState<Reminder>("1 month");
    const [status, setStatus] = useState<InventoryStatus>("Active");

    // §2 Assignment (one-to-one)
    const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>("cmv");
    const [targetId, setTargetId] = useState<string>("");

    const selectedVendor = useMemo(() => VENDORS.find((v) => v.id === vendorId), [vendorId]);

    const isValid =
        !!vendorId && serial.trim().length > 0 && !!issueDate && !!expiryDate;

    const handleSave = () => {
        if (!isValid) return;
        const payload: InventoryFormPayload = {
            vendorId, serial, pin,
            issueDate, expiryDate,
            recurrence, reminder, status,
            assignedTo: targetId ? { kind: assignmentKind, targetId } : undefined,
        };
        console.log("Inventory item saved:", payload);
        onNavigate("/inventory");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <button
                        onClick={() => onNavigate("/inventory")}
                        className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-1"
                    >
                        <ArrowLeft size={12} /> Back to Inventory
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 size={12} />
                        <span className="font-medium">{CARRIER_NAME}</span>
                        <span>/</span>
                        <span>Inventory</span>
                        <span>/</span>
                        <span>Add Inventory</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Add Inventory</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => onNavigate("/inventory")}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2 ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        <Check size={16} /> Save Inventory
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 max-w-5xl mx-auto w-full">

                {/* §1 Inventory Details */}
                <Section number={1} title="Inventory Details" subtitle="Identify the item and its lifecycle dates.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Vendor" required>
                            <SelectInput value={vendorId} onChange={setVendorId}>
                                {VENDORS.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} — {getCategoryLabel(v.categoryId, VENDOR_CATEGORIES)}
                                    </option>
                                ))}
                            </SelectInput>
                            {selectedVendor && (
                                <p className="text-xs text-slate-500 mt-1.5">
                                    Category: <span className="font-medium text-slate-700">{getCategoryLabel(selectedVendor.categoryId, VENDOR_CATEGORIES)}</span>
                                </p>
                            )}
                        </Field>
                        <Field label="Status" required>
                            <SelectInput value={status} onChange={(v) => setStatus(v as InventoryStatus)}>
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field label="Serial #" required>
                            <TextInput value={serial} onChange={setSerial} placeholder="e.g. FC-558271" />
                        </Field>
                        <Field label="PIN #">
                            <TextInput value={pin} onChange={setPin} placeholder="e.g. 4421" />
                        </Field>
                        <Field label="Issue Date" required>
                            <TextInput value={issueDate} onChange={setIssueDate} type="date" />
                        </Field>
                        <Field label="Expiry Date" required>
                            <TextInput value={expiryDate} onChange={setExpiryDate} type="date" />
                        </Field>
                        <Field label="Recurrence">
                            <SelectInput value={recurrence} onChange={(v) => setRecurrence(v as Recurrence)}>
                                {RECURRENCE_OPTIONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </SelectInput>
                        </Field>
                        <Field label="Reminder">
                            <SelectInput value={reminder} onChange={(v) => setReminder(v as Reminder)}>
                                {REMINDER_OPTIONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </SelectInput>
                        </Field>
                    </div>
                </Section>

                {/* §2 Assignment (one-to-one) */}
                <Section number={2} title="Assignment" subtitle="Assign this inventory item to a CMV, Non-CMV, or driver. One item, one target.">
                    <div className="space-y-5">
                        {/* Kind picker */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Assign To</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {KIND_OPTIONS.map((opt) => {
                                    const active = assignmentKind === opt.value;
                                    const Icon = opt.value === "driver" ? IdCard : Truck;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => { setAssignmentKind(opt.value); setTargetId(""); }}
                                            className={cn(
                                                "p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3",
                                                active
                                                    ? "border-blue-500 bg-blue-50 shadow-sm"
                                                    : "border-slate-200 bg-white hover:border-slate-300"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                                active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
                                            )}>
                                                <Icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={cn("text-sm font-bold", active ? "text-blue-700" : "text-slate-900")}>{opt.label}</div>
                                                <div className="text-xs text-slate-500 mt-0.5">{opt.helper}</div>
                                            </div>
                                            {active && (
                                                <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                                                    <Check size={12} strokeWidth={3} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Searchable, rich target picker */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                {assignmentKind === "cmv" && "Select CMV"}
                                {assignmentKind === "non-cmv" && "Select Non-CMV asset"}
                                {assignmentKind === "driver" && "Select Driver"}
                            </label>
                            <AssignmentTargetPicker
                                kind={assignmentKind}
                                selectedId={targetId}
                                onSelect={setTargetId}
                            />
                            <p className="text-xs text-slate-500 mt-1.5">
                                Each inventory item can be assigned to exactly one {assignmentKind === "driver" ? "driver" : "asset"}. Type to search.
                            </p>
                        </div>
                    </div>
                </Section>

            </div>
        </div>
    );
}

function Section({
    number, title, subtitle, children,
}: { number: number; title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {number}
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="pl-11">{children}</div>
        </section>
    );
}

function Field({
    label, required, className, children,
}: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {children}
        </div>
    );
}

function TextInput({
    value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        />
    );
}

function SelectInput({
    value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        >
            {children}
        </select>
    );
}
