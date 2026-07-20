import { useMemo, useState } from "react";
import { Plus, Upload, Download, X, FileSpreadsheet, Boxes, Check, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignmentTargetPicker } from "./AssignmentTargetPicker";
import {
    VENDORS, VENDOR_CATEGORIES, getCategoryLabel,
    type InventoryItem, type Recurrence, type Reminder, type InventoryStatus, type AssignmentKind,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Mode = "add" | "import" | "export";

const MODES: { id: Mode; label: string; Icon: React.ElementType }[] = [
    { id: "add", label: "Add item", Icon: Plus },
    { id: "import", label: "Bulk import", Icon: Upload },
    { id: "export", label: "Bulk export", Icon: Download },
];

const RECURRENCE_OPTIONS: Recurrence[] = ["None", "Monthly", "Quarterly", "Yearly"];
const REMINDER_OPTIONS: Reminder[] = ["None", "1 day", "1 week", "1 month"];
const STATUS_OPTIONS: InventoryStatus[] = ["Active", "Expiring Soon", "Expired"];
const KIND_OPTIONS: { value: AssignmentKind; label: string }[] = [
    { value: "cmv", label: "CMV" },
    { value: "non-cmv", label: "Non-CMV" },
];

// One unified module for getting inventory in and out — a single "Add Inventory"
// entry point folding the add / bulk import / bulk export actions into three
// modes of one dialog. "Add item" is an inline pop-up form: it saves straight to
// the list (via onAdd) without leaving the page.
export function AddInventoryModule({ items, accountId, onAdd, onClose }: {
    items: InventoryItem[];
    accountId?: string;
    onAdd: (item: InventoryItem) => void;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<Mode>("add");
    const [file, setFile] = useState<File | null>(null);

    const exportCsv = () => {
        const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const header = ["Vendor", "Serial", "PIN", "Issued", "Expires", "Recurrence", "Reminder", "Status", "Assigned Kind", "Assigned Target"];
        const body = items.map((it) => {
            const vendor = VENDORS.find((v) => v.id === it.vendorId);
            return [
                vendor?.name ?? "", it.serial, it.pin, it.issueDate, it.expiryDate,
                it.recurrence, it.reminder, it.status, it.assignedTo?.kind ?? "", it.assignedTo?.targetId ?? "",
            ].map(esc).join(",");
        });
        const csv = [header.map(esc).join(","), ...body].join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "inventory-export.csv";
        a.click();
        URL.revokeObjectURL(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Boxes className="h-5 w-5" /></span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">Add Inventory</h3>
                            <p className="text-xs text-slate-500">Add a single item, bulk import, or export the current list.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>

                {/* Mode tabs */}
                <div className="flex items-center gap-1 border-b border-slate-100 px-3">
                    {MODES.map((m) => {
                        const active = mode === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setMode(m.id)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold border-b-2 transition-colors",
                                    active ? "text-blue-600 border-blue-600" : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300",
                                )}
                            >
                                <m.Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} /> {m.label}
                            </button>
                        );
                    })}
                </div>

                {/* Body */}
                {mode === "add" && (
                    <QuickAddItemForm accountId={accountId} onAdd={onAdd} onClose={onClose} />
                )}

                {mode === "import" && (
                    <>
                        <div className="px-5 py-5 space-y-4">
                            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
                                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-slate-200"><FileSpreadsheet className="h-5 w-5" /></span>
                                {file ? (
                                    <span className="text-sm font-semibold text-slate-800">{file.name}</span>
                                ) : (
                                    <>
                                        <span className="text-sm font-semibold text-slate-700">Click to choose a CSV file</span>
                                        <span className="text-xs text-slate-500">or drag &amp; drop it here</span>
                                    </>
                                )}
                                <input type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                            </label>
                            <p className="text-xs text-slate-500">
                                Need the format? <button type="button" onClick={exportCsv} className="font-semibold text-blue-600 hover:underline">Download a CSV template</button> — one row per item with vendor, serial, PIN, issued &amp; expiry dates.
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                            <Button size="sm" disabled={!file} onClick={onClose}><Upload className="h-4 w-4" /> Import items</Button>
                        </div>
                    </>
                )}

                {mode === "export" && (
                    <>
                        <div className="px-5 py-6 space-y-4">
                            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"><Download className="h-5 w-5" /></span>
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Export inventory to CSV</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Download all <span className="font-semibold text-slate-700">{items.length}</span> item{items.length === 1 ? "" : "s"} in this carrier's inventory — vendor, serial, PIN, dates, schedule, status and assignment.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                            <Button size="sm" disabled={items.length === 0} onClick={exportCsv}><Download className="h-4 w-4" /> Download CSV</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Inline quick-add form ───────────────────────────────────────────────────

function QuickAddItemForm({ accountId, onAdd, onClose }: {
    accountId?: string;
    onAdd: (item: InventoryItem) => void;
    onClose: () => void;
}) {
    const vendors = useMemo(() => {
        if (!accountId) return VENDORS;
        const scoped = VENDORS.filter((v) => v.accountId === accountId);
        return scoped.length > 0 ? scoped : VENDORS;
    }, [accountId]);

    const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
    const [serial, setSerial] = useState("");
    const [pin, setPin] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [recurrence, setRecurrence] = useState<Recurrence>("Yearly");
    const [reminder, setReminder] = useState<Reminder>("1 month");
    const [status, setStatus] = useState<InventoryStatus>("Active");
    const [assignmentKind, setAssignmentKind] = useState<AssignmentKind>("cmv");
    const [targetId, setTargetId] = useState("");

    const selectedVendor = vendors.find((v) => v.id === vendorId);
    const isValid = !!vendorId && serial.trim().length > 0 && !!issueDate;

    const save = () => {
        if (!isValid) return;
        const item: InventoryItem = {
            id: `inv-add-${Date.now()}`,
            vendorId,
            serial: serial.trim(),
            pin: pin.trim(),
            issueDate,
            expiryDate,
            recurrence,
            reminder,
            status,
            assignedTo: targetId ? { kind: assignmentKind, targetId } : undefined,
        };
        onAdd(item);
        onClose();
    };

    return (
        <>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Vendor" required>
                        <Select value={vendorId} onChange={setVendorId}>
                            {vendors.map((v) => (
                                <option key={v.id} value={v.id}>{v.name} — {getCategoryLabel(v.categoryId, VENDOR_CATEGORIES)}</option>
                            ))}
                        </Select>
                        {selectedVendor && (
                            <p className="text-[11px] text-slate-500 mt-1">Category: <span className="font-medium text-slate-700">{getCategoryLabel(selectedVendor.categoryId, VENDOR_CATEGORIES)}</span></p>
                        )}
                    </Field>
                    <Field label="Status" required>
                        <Select value={status} onChange={(v) => setStatus(v as InventoryStatus)}>
                            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </Select>
                    </Field>
                    <Field label="Serial #" required>
                        <Text value={serial} onChange={setSerial} placeholder="e.g. FC-558271" />
                    </Field>
                    <Field label="PIN #">
                        <Text value={pin} onChange={setPin} placeholder="e.g. 4421" />
                    </Field>
                    <Field label="Issue Date" required>
                        <Text value={issueDate} onChange={setIssueDate} type="date" />
                    </Field>
                    <Field label="Expiry Date">
                        <Text value={expiryDate} onChange={setExpiryDate} type="date" />
                    </Field>
                    <Field label="Recurrence">
                        <Select value={recurrence} onChange={(v) => setRecurrence(v as Recurrence)}>
                            {RECURRENCE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </Select>
                    </Field>
                    <Field label="Reminder">
                        <Select value={reminder} onChange={(v) => setReminder(v as Reminder)}>
                            {REMINDER_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </Select>
                    </Field>
                </div>

                {/* Assignment (optional) */}
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Assign to (optional)</label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {KIND_OPTIONS.map((opt) => {
                            const active = assignmentKind === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { setAssignmentKind(opt.value); setTargetId(""); }}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors",
                                        active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                                    )}
                                >
                                    <Truck size={15} className={active ? "text-blue-600" : "text-slate-400"} /> {opt.label}
                                </button>
                            );
                        })}
                    </div>
                    <AssignmentTargetPicker kind={assignmentKind} selectedId={targetId} onSelect={setTargetId} />
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" disabled={!isValid} onClick={save}><Check className="h-4 w-4" /> Add to inventory</Button>
            </div>
        </>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {label}{required && <span className="text-red-500"> *</span>}
            </span>
            {children}
        </label>
    );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
            {children}
        </select>
    );
}

function Text({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
    );
}
