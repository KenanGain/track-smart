import React, { useMemo, useState } from "react";
import {
    Wrench, Truck, Calendar, FileText, Upload, ClipboardList, AlertTriangle, CheckCircle2,
} from "lucide-react";
import {
    readPayloadFromCurrentUrl,
    saveVendorResponse,
    type VendorOrderResponse,
} from "./vendorPortal.utils";

// --- Local UI primitives (mirror CreateOrderModal styling) ---

const Button = ({
    variant = "primary", size = "default", className = "", children, ...props
}: any) => {
    const base =
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:pointer-events-none disabled:opacity-50";
    const sizes: Record<string, string> = {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
    };
    const variants: Record<string, string> = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
    };
    return (
        <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Label = ({ children, className = "" }: any) => (
    <label className={`text-sm font-medium leading-none text-slate-700 ${className}`}>
        {children}
    </label>
);

const Input = React.forwardRef(({ className = "", ...props }: any, ref: any) => (
    <input
        ref={ref}
        className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
        {...props}
    />
));
Input.displayName = "Input";

function Section({
    number, title, subtitle, icon: Icon, children,
}: {
    number: number;
    title: string;
    subtitle?: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {number}
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-slate-400" />}
                        {title}
                    </h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="pl-10">{children}</div>
        </section>
    );
}

// --- Main page ---

export const VendorWorkOrderFormPage = () => {
    const payload = useMemo(() => readPayloadFromCurrentUrl(), []);
    const [submitted, setSubmitted] = useState(false);
    const [currency, setCurrency] = useState<"USD" | "CAD">("USD");

    // Mechanic-edit fields (1. Scheduling & Estimates)
    const [apptDateTime, setApptDateTime] = useState("");
    const [estLaborDuration, setEstLaborDuration] = useState("");
    const [expectedReadyDate, setExpectedReadyDate] = useState("");

    // Detailed completion report
    const [workSummary, setWorkSummary] = useState("");

    // Labor lines
    const [laborLines, setLaborLines] = useState([
        { description: "", techId: "", hours: 0, rate: 0 },
    ]);
    // Parts lines
    const [partsLines, setPartsLines] = useState([
        { partNumber: "", description: "", qty: 0, unitCost: 0 },
    ]);

    // Mandatory post-service data
    const [odometerOut, setOdometerOut] = useState("");
    const [engineHours, setEngineHours] = useState("");

    // Invoice upload
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    const totalLabor = useMemo(
        () => laborLines.reduce((sum, l) => sum + (Number(l.hours) || 0) * (Number(l.rate) || 0), 0),
        [laborLines]
    );
    const totalParts = useMemo(
        () => partsLines.reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.unitCost) || 0), 0),
        [partsLines]
    );
    const tax = 0;
    const grandTotal = totalLabor + totalParts + tax;

    // --- Bad/missing payload — show friendly error ---
    if (!payload) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-3">
                        <AlertTriangle size={24} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Invalid or expired link</h2>
                    <p className="text-sm text-slate-500">
                        This work order link could not be read. Please ask your fleet contact to resend the email with a fresh link.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-md text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 size={24} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">Work order submitted</h2>
                    <p className="text-sm text-slate-500">
                        Thank you. Work Order <span className="font-semibold text-slate-700">#{payload.workOrderNumber}</span> has been recorded. The fleet team has been notified.
                    </p>
                </div>
            </div>
        );
    }

    // --- Handlers ---

    const updateLabor = (i: number, field: keyof (typeof laborLines)[number], v: any) => {
        setLaborLines((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], [field]: field === "hours" || field === "rate" ? Number(v) : v };
            return next;
        });
    };
    const addLaborRow = () =>
        setLaborLines((prev) => [...prev, { description: "", techId: "", hours: 0, rate: 0 }]);
    const removeLaborRow = (i: number) =>
        setLaborLines((prev) => prev.filter((_, idx) => idx !== i));

    const updatePart = (i: number, field: keyof (typeof partsLines)[number], v: any) => {
        setPartsLines((prev) => {
            const next = [...prev];
            next[i] = { ...next[i], [field]: field === "qty" || field === "unitCost" ? Number(v) : v };
            return next;
        });
    };
    const addPartRow = () =>
        setPartsLines((prev) => [...prev, { partNumber: "", description: "", qty: 0, unitCost: 0 }]);
    const removePartRow = (i: number) =>
        setPartsLines((prev) => prev.filter((_, idx) => idx !== i));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apptDateTime) {
            alert("Please enter the appointment date & time.");
            return;
        }
        if (!estLaborDuration) {
            alert("Please enter the estimated labor duration.");
            return;
        }
        if (payload.requirements.odometerRequired && !odometerOut) {
            alert("Outbound odometer is required for this order.");
            return;
        }
        if (payload.requirements.engineHoursRequired && !engineHours) {
            alert("Engine hours reading is required for this order.");
            return;
        }

        const response: VendorOrderResponse = {
            orderId: payload.orderId,
            submittedAt: new Date().toISOString(),
            apptDateTime,
            estLaborDuration,
            expectedReadyDate,
            workSummary,
            labor: laborLines,
            parts: partsLines,
            odometerOut,
            engineHours,
            totals: { labor: totalLabor, parts: totalParts, tax, grand: grandTotal },
            currency,
            invoiceFileName: invoiceFile?.name,
        };
        saveVendorResponse(response);
        // Frontend-only: also log so the fleet developer can grab the response.
        console.log("[VendorPortal] Response captured:", response);
        setSubmitted(true);
    };

    // --- Layout ---

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-4xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">
                            TrackSmart Fleet · Vendor Portal
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-900">
                            Work Order #{payload.workOrderNumber}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Assigned to <span className="font-medium text-slate-700">{payload.vendor.name}</span>
                            {payload.vendor.email && <> · {payload.vendor.email}</>}
                        </p>
                    </div>

                    {/* Carrier badge — vendor sees who they're working for */}
                    {payload.carrier && (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2.5">
                            <div className="w-10 h-10 rounded-md bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                                {(payload.carrier.dbaName || payload.carrier.legalName).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="text-xs leading-tight">
                                <div className="text-[10px] uppercase tracking-wider text-blue-700 font-semibold">From Carrier</div>
                                <div className="font-bold text-slate-900 text-sm">
                                    {payload.carrier.dbaName || payload.carrier.legalName}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {payload.carrier.dotNumber && (
                                        <span className="text-[10px] bg-white border border-blue-200 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                                            DOT #{payload.carrier.dotNumber}
                                        </span>
                                    )}
                                    {(payload.carrier.city || payload.carrier.state) && (
                                        <span className="text-[10px] text-slate-500">
                                            {[payload.carrier.city, payload.carrier.state].filter(Boolean).join(', ')}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-slate-500">Billing Currency</Label>
                        <select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")}
                            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="CAD">CAD ($)</option>
                        </select>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Section 1 — Scheduling & Estimates */}
                    <Section
                        number={1}
                        title="Scheduling & Estimates"
                        subtitle="Confirm appointment time and how long you expect to need the asset."
                        icon={Calendar}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">
                                    Appt Date &amp; Time <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={apptDateTime}
                                    onChange={(e: any) => setApptDateTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">
                                    Est. Labor Duration <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    placeholder="e.g. 4.5 Hours"
                                    value={estLaborDuration}
                                    onChange={(e: any) => setEstLaborDuration(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">Expected Ready Date</Label>
                                <Input
                                    type="date"
                                    value={expectedReadyDate}
                                    onChange={(e: any) => setExpectedReadyDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </Section>

                    {/* Section 2 — Original Fleet Service Request (read-only) */}
                    <Section
                        number={2}
                        title="Original Fleet Service Request"
                        subtitle="Asset(s) and services requested by the fleet team."
                        icon={Truck}
                    >
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-xs text-slate-500 block">Create Date</span>
                                    <span className="font-medium text-slate-900">
                                        {new Date(payload.createDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Order Due Date</span>
                                    <span className="font-medium text-slate-900">
                                        {payload.dueDate ? new Date(payload.dueDate).toLocaleDateString() : "—"}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                {payload.tasks.map((t, idx) => (
                                    <div
                                        key={`${t.assetId}-${idx}`}
                                        className="flex items-start gap-3 bg-blue-50/40 border border-blue-100 rounded-md p-3"
                                    >
                                        <div className="h-9 w-9 bg-white border border-blue-100 rounded-md flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                                            {t.services.length}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-slate-900 text-sm">{t.unitNumber}</div>
                                            {(t.year || t.make || t.model) && (
                                                <div className="text-xs text-slate-500">
                                                    {t.year} {t.make} {t.model}
                                                    {t.vin && <> · VIN •••{t.vin.slice(-4)}</>}
                                                </div>
                                            )}
                                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                                {t.services.map((s) => (
                                                    <span
                                                        key={s.id}
                                                        className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-700"
                                                    >
                                                        {s.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {payload.notes && (
                                <div className="bg-white border border-slate-200 rounded-md p-3">
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">
                                        Fleet Remarks
                                    </div>
                                    <div className="text-sm text-slate-700 italic">"{payload.notes}"</div>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* Section 3 — Mechanic's Service Update */}
                    <Section
                        number={3}
                        title="Mechanic's Service Update"
                        subtitle="Findings, diagnostic results, and actions taken."
                        icon={Wrench}
                    >
                        <textarea
                            value={workSummary}
                            onChange={(e) => setWorkSummary(e.target.value)}
                            placeholder="Detailed Completion Report…"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 h-28 resize-none"
                        />
                    </Section>

                    {/* Section 4 — Labor Cost Monitoring */}
                    <Section
                        number={4}
                        title="Labor Cost Monitoring"
                        subtitle="One row per technician/task."
                        icon={ClipboardList}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-2 pb-2 w-[40%]">Labor Task Description</th>
                                        <th className="px-2 pb-2">Tech ID</th>
                                        <th className="px-2 pb-2">Hours</th>
                                        <th className="px-2 pb-2">Rate</th>
                                        <th className="px-2 pb-2 text-right">Total</th>
                                        <th className="pb-2 w-8" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {laborLines.map((l, i) => (
                                        <tr key={i}>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    placeholder="e.g. DPF Cleaning"
                                                    value={l.description}
                                                    onChange={(e: any) => updateLabor(i, "description", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    value={l.techId}
                                                    onChange={(e: any) => updateLabor(i, "techId", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={l.hours || ""}
                                                    onChange={(e: any) => updateLabor(i, "hours", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={l.rate || ""}
                                                    onChange={(e: any) => updateLabor(i, "rate", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                                                ${((Number(l.hours) || 0) * (Number(l.rate) || 0)).toFixed(2)}
                                            </td>
                                            <td className="py-1.5">
                                                {laborLines.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLaborRow(i)}
                                                        className="text-slate-300 hover:text-red-500 text-xs"
                                                        aria-label="Remove row"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2">
                            <Button type="button" variant="secondary" size="sm" onClick={addLaborRow}>
                                + Add labor row
                            </Button>
                        </div>
                    </Section>

                    {/* Section 5 — Parts & Materials */}
                    <Section
                        number={5}
                        title="Parts &amp; Materials Monitoring"
                        subtitle="Itemize parts used."
                        icon={ClipboardList}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-2 pb-2 w-[20%]">Part #</th>
                                        <th className="px-2 pb-2 w-[40%]">Description</th>
                                        <th className="px-2 pb-2">Qty</th>
                                        <th className="px-2 pb-2">Unit Cost</th>
                                        <th className="px-2 pb-2 text-right">Total</th>
                                        <th className="pb-2 w-8" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {partsLines.map((p, i) => (
                                        <tr key={i}>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    placeholder="AF27684"
                                                    value={p.partNumber}
                                                    onChange={(e: any) => updatePart(i, "partNumber", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    value={p.description}
                                                    onChange={(e: any) => updatePart(i, "description", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={p.qty || ""}
                                                    onChange={(e: any) => updatePart(i, "qty", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={p.unitCost || ""}
                                                    onChange={(e: any) => updatePart(i, "unitCost", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5 text-right tabular-nums text-slate-700">
                                                ${((Number(p.qty) || 0) * (Number(p.unitCost) || 0)).toFixed(2)}
                                            </td>
                                            <td className="py-1.5">
                                                {partsLines.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePartRow(i)}
                                                        className="text-slate-300 hover:text-red-500 text-xs"
                                                        aria-label="Remove row"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2">
                            <Button type="button" variant="secondary" size="sm" onClick={addPartRow}>
                                + Add part row
                            </Button>
                        </div>
                    </Section>

                    {/* Section 6 — Mandatory Post-Service Data */}
                    <Section
                        number={6}
                        title="Mandatory Post-Service Data"
                        subtitle="Final readings before the asset is released."
                        icon={Truck}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">
                                    Outbound Odometer ({payload.requirements.odometerUnit})
                                    {payload.requirements.odometerRequired && (
                                        <span className="text-red-500"> *</span>
                                    )}
                                </Label>
                                <Input
                                    placeholder="Enter Mileage"
                                    value={odometerOut}
                                    onChange={(e: any) => setOdometerOut(e.target.value)}
                                    required={payload.requirements.odometerRequired}
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">
                                    Engine Hours
                                    {payload.requirements.engineHoursRequired ? (
                                        <span className="text-red-500"> *</span>
                                    ) : (
                                        <span className="text-slate-400"> (optional)</span>
                                    )}
                                </Label>
                                <Input
                                    placeholder="Enter Hours"
                                    value={engineHours}
                                    onChange={(e: any) => setEngineHours(e.target.value)}
                                    required={payload.requirements.engineHoursRequired}
                                />
                            </div>
                        </div>
                    </Section>

                    {/* Section 7 — Invoice Documentation */}
                    <Section
                        number={7}
                        title="Invoice Documentation"
                        subtitle="Attach the mechanic's invoice (PDF, JPG, or PNG)."
                        icon={FileText}
                    >
                        <label
                            htmlFor="vendor-invoice-upload"
                            className="block border-2 border-dashed border-blue-300 rounded-md p-8 text-center cursor-pointer hover:bg-blue-50/40 transition-colors"
                        >
                            <input
                                id="vendor-invoice-upload"
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
                                className="hidden"
                            />
                            <div className="w-10 h-10 rounded-md bg-blue-600 text-white flex items-center justify-center mx-auto mb-2">
                                <Upload size={18} />
                            </div>
                            <div className="text-sm font-semibold text-slate-700">
                                Click to upload Mechanic's Invoice Copy
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {invoiceFile ? `Selected: ${invoiceFile.name}` : "Support for PDF, JPG, PNG"}
                            </div>
                        </label>
                    </Section>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 w-full md:w-80 space-y-2">
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Total Labor</span>
                                <span className="tabular-nums">${totalLabor.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Total Parts</span>
                                <span className="tabular-nums">${totalParts.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-600">
                                <span>Tax</span>
                                <span className="tabular-nums">${tax.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-semibold text-slate-900">
                                <span>Grand Total</span>
                                <span className="tabular-nums">${grandTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Submit */}
                    <div className="pt-2">
                        <Button type="submit" className="w-full md:w-auto md:px-12">
                            Submit Work Order Update
                        </Button>
                    </div>

                    <p className="text-[11px] text-slate-400 text-center pt-2">
                        TrackSmart Fleet · Vendor Portal · This page is sent to the assigned vendor only.
                    </p>
                </form>
            </div>
        </div>
    );
};
