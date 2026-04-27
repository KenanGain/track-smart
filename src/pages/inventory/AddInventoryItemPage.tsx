import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Check, Search, X, IdCard } from "lucide-react";
import {
    VENDORS,
    VENDOR_TYPE_LABELS,
    ACME_TRUCKS,
    ACME_ACTIVE_DRIVERS,
    ACME_DRIVERS,
    CARRIER_NAME,
    type Recurrence,
    type Reminder,
    type InventoryStatus,
} from "./inventory.data";

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
    contactName?: string;
    contactInfo?: string;
    notes?: string;
    applyToAllAssets: boolean;
    assignedAssetIds: string[];
    assignedDriverIds: string[];
};

const RECURRENCE_OPTIONS: Recurrence[] = ["None", "Monthly", "Quarterly", "Yearly"];
const REMINDER_OPTIONS: Reminder[] = ["None", "1 day", "1 week", "1 month"];
const STATUS_OPTIONS: InventoryStatus[] = ["Active", "Expiring Soon", "Expired"];

export function AddInventoryItemPage({ onNavigate }: Props) {
    // Section 1: Inventory Details
    const [vendorId, setVendorId] = useState(VENDORS[0]?.id ?? "");
    const [serial, setSerial] = useState("");
    const [pin, setPin] = useState("");
    const [issueDate, setIssueDate] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    const [recurrence, setRecurrence] = useState<Recurrence>("Yearly");
    const [reminder, setReminder] = useState<Reminder>("1 month");
    const [status, setStatus] = useState<InventoryStatus>("Active");

    // Section 2: Asset Assignment
    const [applyToAll, setApplyToAll] = useState(false);
    const [assignedAssetIds, setAssignedAssetIds] = useState<string[]>([]);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");

    // Section 3: Driver Assignment
    const [assignedDriverIds, setAssignedDriverIds] = useState<string[]>([]);
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [driverSearchQuery, setDriverSearchQuery] = useState("");

    // Section 4: Contact / Notes
    const [contactName, setContactName] = useState("");
    const [contactInfo, setContactInfo] = useState("");
    const [notes, setNotes] = useState("");

    const selectedVendor = useMemo(() => VENDORS.find((v) => v.id === vendorId), [vendorId]);

    const eligibleAssets = useMemo(() => ACME_TRUCKS, []);
    const filteredAssets = useMemo(() => {
        const q = assetSearchQuery.trim().toLowerCase();
        if (!q) return eligibleAssets;
        return eligibleAssets.filter(
            (a) =>
                a.unitNumber.toLowerCase().includes(q) ||
                a.vin.toLowerCase().includes(q) ||
                `${a.make} ${a.model}`.toLowerCase().includes(q)
        );
    }, [eligibleAssets, assetSearchQuery]);

    const eligibleDrivers = useMemo(() => ACME_ACTIVE_DRIVERS, []);
    const filteredDrivers = useMemo(() => {
        const q = driverSearchQuery.trim().toLowerCase();
        if (!q) return eligibleDrivers;
        return eligibleDrivers.filter(
            (d) => d.name.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q)
        );
    }, [eligibleDrivers, driverSearchQuery]);

    const isValid =
        !!vendorId && serial.trim().length > 0 && !!issueDate && !!expiryDate;

    const handleSave = () => {
        if (!isValid) return;
        const payload: InventoryFormPayload = {
            vendorId, serial, pin,
            issueDate, expiryDate,
            recurrence, reminder, status,
            contactName: contactName || undefined,
            contactInfo: contactInfo || undefined,
            notes: notes || undefined,
            applyToAllAssets: applyToAll,
            assignedAssetIds: applyToAll ? eligibleAssets.map((a) => a.id) : assignedAssetIds,
            assignedDriverIds,
        };
        console.log("Inventory item saved:", payload);
        onNavigate("/inventory");
    };

    const toggleAsset = (id: string) =>
        setAssignedAssetIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);
    const removeAsset = (id: string) =>
        setAssignedAssetIds((prev) => prev.filter((a) => a !== id));
    const toggleDriver = (id: string) =>
        setAssignedDriverIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
    const removeDriver = (id: string) =>
        setAssignedDriverIds((prev) => prev.filter((d) => d !== id));

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

                {/* Section 1: Inventory Details */}
                <Section number={1} title="Inventory Details" subtitle="Identify the item and its lifecycle dates.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Vendor" required>
                            <SelectInput value={vendorId} onChange={setVendorId}>
                                {VENDORS.map((v) => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} — {VENDOR_TYPE_LABELS[v.type]}
                                    </option>
                                ))}
                            </SelectInput>
                            {selectedVendor && (
                                <p className="text-xs text-slate-500 mt-1.5">
                                    Type: <span className="font-medium text-slate-700">{VENDOR_TYPE_LABELS[selectedVendor.type]}</span>
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

                {/* Section 2: Asset Assignment */}
                <Section number={2} title="Asset Assignment" subtitle="Assign this inventory item to one or more trucks.">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setApplyToAll(!applyToAll);
                                        if (!applyToAll) setAssignedAssetIds([]);
                                    }}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${applyToAll ? 'bg-blue-600' : 'bg-slate-200'}`}
                                    aria-pressed={applyToAll}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${applyToAll ? 'left-6' : 'left-1'}`} />
                                </button>
                                <label className="text-sm font-medium text-slate-700">Apply to all eligible assets</label>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAssetModalOpen(true)}
                                disabled={applyToAll}
                                className={`text-sm font-medium px-3 py-1.5 rounded-md border transition-colors ${applyToAll
                                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                            >
                                + Add Assets
                            </button>
                        </div>

                        {(() => {
                            const display = applyToAll
                                ? eligibleAssets
                                : assignedAssetIds.map((id) => eligibleAssets.find((a) => a.id === id)).filter(Boolean) as typeof eligibleAssets;

                            if (display.length === 0) {
                                return (
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                                        {applyToAll ? 'No eligible assets found.' : 'Select assets (or turn on Apply to All).'}
                                    </div>
                                );
                            }

                            return (
                                <div className="overflow-hidden border border-slate-200 rounded-lg">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">Vehicles — {display.length} Total</th>
                                                <th className="px-4 py-3">Make / Model</th>
                                                <th className="px-4 py-3">VIN</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                            {display.map((asset) => (
                                                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-semibold text-slate-900">{asset.unitNumber}</div>
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                                                                {asset.assetCategory}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">{asset.year} {asset.make} {asset.model}</td>
                                                    <td className="px-4 py-3 text-xs font-mono text-slate-500">•••••{asset.vin.slice(-4)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        {!applyToAll && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeAsset(asset.id)}
                                                                className="text-slate-300 hover:text-red-500 transition-colors"
                                                                aria-label="Remove asset"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}
                    </div>
                </Section>

                {/* Section 3: Driver Assignment */}
                <Section number={3} title="Driver Assignment" subtitle="Assign this inventory item to one or more drivers.">
                    <div className="space-y-5">
                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => setIsDriverModalOpen(true)}
                                className="text-sm font-medium px-3 py-1.5 rounded-md border text-blue-600 border-blue-200 hover:bg-blue-50 transition-colors"
                            >
                                + Add Drivers
                            </button>
                        </div>

                        {assignedDriverIds.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                                No drivers assigned.
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-200 rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Drivers — {assignedDriverIds.length} Total</th>
                                            <th className="px-4 py-3">License #</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {assignedDriverIds
                                            .map((id) => ACME_DRIVERS.find((d) => d.id === id))
                                            .filter(Boolean)
                                            .map((driver) => (
                                                <tr key={driver!.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold">
                                                                {driver!.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                                                            </div>
                                                            <div className="font-semibold text-slate-900">{driver!.name}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{driver!.licenseNumber}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
                                                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                            {driver!.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDriver(driver!.id)}
                                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                                            aria-label="Remove driver"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Section>

                {/* Section 4: Contact & Notes */}
                <Section number={4} title="Contact & Notes" subtitle="Optional contact and free-form notes.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Contact Name">
                            <TextInput value={contactName} onChange={setContactName} placeholder="e.g. Jane Smith" />
                        </Field>
                        <Field label="Contact Information">
                            <TextInput value={contactInfo} onChange={setContactInfo} placeholder="Phone or email" />
                        </Field>
                        <Field label="Notes" className="md:col-span-2">
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Anything helpful about this item..."
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none"
                            />
                        </Field>
                    </div>
                </Section>
            </div>

            {/* Asset Selection Modal */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-lg text-slate-900">Select Assets</h3>
                            <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search unit #, VIN, make/model..."
                                    value={assetSearchQuery}
                                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredAssets.length > 0 ? filteredAssets.map((asset) => {
                                const isSelected = assignedAssetIds.includes(asset.id);
                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => toggleAsset(asset.id)}
                                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-semibold text-slate-900">{asset.unitNumber}</div>
                                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200">
                                                    {asset.assetCategory}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">
                                                {asset.year} {asset.make} {asset.model} · VIN: •••••{asset.vin.slice(-4)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="py-8 text-center text-slate-400 text-sm">No matching assets found.</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                                {assignedAssetIds.length} asset{assignedAssetIds.length === 1 ? "" : "s"} selected
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAssetModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Driver Selection Modal */}
            {isDriverModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-lg text-slate-900">Select Drivers</h3>
                            <button onClick={() => setIsDriverModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search name or license #..."
                                    value={driverSearchQuery}
                                    onChange={(e) => setDriverSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {filteredDrivers.length > 0 ? filteredDrivers.map((driver) => {
                                const isSelected = assignedDriverIds.includes(driver.id);
                                return (
                                    <div
                                        key={driver.id}
                                        onClick={() => toggleDriver(driver.id)}
                                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div className="min-w-0 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold shrink-0">
                                                {driver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{driver.name}</div>
                                                <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                                                    <IdCard size={11} /> {driver.licenseNumber}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="py-8 text-center text-slate-400 text-sm">No matching drivers found.</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                                {assignedDriverIds.length} driver{assignedDriverIds.length === 1 ? "" : "s"} selected
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsDriverModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 shadow-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
    label, required, hint, className, children,
}: { label: string; required?: boolean; hint?: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {hint && <span className="text-slate-400 font-normal ml-1">({hint})</span>}
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
