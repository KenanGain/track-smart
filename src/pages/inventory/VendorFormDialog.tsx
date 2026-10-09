// ─────────────────────────────────────────────────────────────────────────────
// VendorFormDialog — add or edit a vendor.
//
// One form. It was Settings’ alone, which meant the vendor lists on Inventory and
// Maintenance could show you a record and offer no way to correct it — you had to know
// it was editable somewhere else. It writes through `vendorsStore`, so every list that
// reads the store sees the change on the next render.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { type Vendor } from "@/pages/inventory/inventory.data";
import { vendorsStore } from "@/data/vendorsStore";
import { US_STATES, CA_PROVINCES } from "@/pages/settings/MaintenancePage";

const emptyVendor = (): Partial<Vendor> => ({
    name: "",
    companyName: "",
    // Not asked for — a vendor’s category is an inventory concept (what an item filed
    // against them is), so it is carried, not edited here.
    categoryId: "cat-repair-maintenance",
    address: { country: "United States", apt: "", street: "", city: "", state: "", zip: "" },
    email: "",
    phone: "",
    contactName: "",
    status: "Active",
});

export function VendorFormDialog({ open, vendor, accountId, onClose, onSaved }: {
    open: boolean;
    /** The record being edited, or null to add a new one. */
    vendor: Vendor | null;
    /** Tags a new vendor so it lands in the right carrier's list. */
    accountId?: string;
    onClose: () => void;
    onSaved?: (v: Vendor) => void;
}) {
    const [form, setForm] = useState<Partial<Vendor>>(emptyVendor);

    // Reload whenever the dialog opens on a different record — otherwise the second
    // vendor you edit opens showing the first one.
    useEffect(() => {
        if (!open) return;
        setForm(vendor
            ? {
                name: vendor.name,
                companyName: vendor.companyName ?? "",
                categoryId: vendor.categoryId,
                address: { ...vendor.address },
                email: vendor.email ?? "",
                phone: vendor.phone ?? "",
                contactName: vendor.contactName ?? "",
                contactInfo: vendor.contactInfo ?? "",
                status: vendor.status,
            }
            : emptyVendor());
    }, [open, vendor]);

    const save = () => {
        // A vendor's display name can come from either field; require at least one.
        const displayName = form.name || form.companyName;
        if (!displayName) return;

        if (vendor) {
            const next: Vendor = {
                ...vendor,
                name: form.name || vendor.name,
                companyName: form.companyName || undefined,
                categoryId: form.categoryId || vendor.categoryId,
                address: form.address,
                email: form.email || undefined,
                phone: form.phone || undefined,
                contactName: form.contactName || undefined,
                contactInfo: form.contactInfo || undefined,
                status: form.status || "Active",
            };
            vendorsStore.update(next);
            onSaved?.(next);
        } else {
            const next: Vendor = {
                id: `v_${crypto.randomUUID().slice(0, 8)}`,
                name: form.name || form.companyName!,
                companyName: form.companyName || undefined,
                categoryId: form.categoryId || "cat-repair-maintenance",
                accountId: accountId ?? "",
                address: form.address,
                email: form.email || undefined,
                phone: form.phone || undefined,
                contactName: form.contactName || undefined,
                contactInfo: form.contactInfo || undefined,
                status: form.status || "Active",
            };
            vendorsStore.add(next);
            onSaved?.(next);
        }
        onClose();
    };

    return (
            <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{vendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
                        <DialogDescription>
                            {vendor
                                ? "Update vendor information below."
                                : "Add a new maintenance vendor to your list."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        {/* Company Information */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">
                                Company Information
                            </h3>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="companyName"
                                        value={form.companyName}
                                        onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                                        placeholder="e.g. Fleet Maintenance Pro"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="contactName">Contact Name</Label>
                                    <Input
                                        id="contactName"
                                        value={form.contactName}
                                        onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                                        placeholder="e.g. John Doe"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={form.phone}
                                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                            placeholder="(555) 555-0000"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-200 pb-2">
                                Address
                            </h3>
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="country">Country</Label>
                                        <Select
                                            value={form.address?.country}
                                            onValueChange={(value) =>
                                                setForm({
                                                    ...form,
                                                    address: { ...form.address!, country: value as "United States" | "Canada", state: "" }
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select country" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USA">United States</SelectItem>
                                                <SelectItem value="Canada">Canada</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="unit">Unit / Suite</Label>
                                        <Input
                                            id="unit"
                                            value={form.address?.apt ?? ""}
                                            onChange={(e) => setForm({
                                                ...form,
                                                address: { ...form.address!, apt: e.target.value }
                                            })}
                                            placeholder="Suite 100"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="street">Street Address</Label>
                                    <Input
                                        id="street"
                                        value={form.address?.street}
                                        onChange={(e) => setForm({
                                            ...form,
                                            address: { ...form.address!, street: e.target.value }
                                        })}
                                        placeholder="123 Main Street"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={form.address?.city}
                                            onChange={(e) => setForm({
                                                ...form,
                                                address: { ...form.address!, city: e.target.value }
                                            })}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="state">
                                            {form.address?.country === "Canada" ? "Province" : "State"}
                                        </Label>
                                        <Select
                                            value={form.address?.state ?? ""}
                                            onValueChange={(value) =>
                                                setForm({
                                                    ...form,
                                                    address: { ...form.address!, state: value }
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(form.address?.country === "Canada" ? CA_PROVINCES : US_STATES).map((state) => (
                                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="zip">
                                            {form.address?.country === "Canada" ? "Postal Code" : "ZIP Code"}
                                        </Label>
                                        <Input
                                            id="zip"
                                            value={form.address?.zip ?? ""}
                                            onChange={(e) => setForm({
                                                ...form,
                                                address: { ...form.address!, zip: e.target.value }
                                            })}
                                            placeholder={form.address?.country === "Canada" ? "A1A 1A1" : "12345"}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onClose()}>
                            Cancel
                        </Button>
                        <Button onClick={save} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {vendor ? "Save Changes" : "Add Vendor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
    );
}
