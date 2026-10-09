import { useRef, useState } from "react";
import { Plus, Search, Edit, Trash2, Building2, Phone, Mail, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// The catalog itself is a component now — this page and the Maintenance page's
// Service Types tab show the same one over the same live store.
import { ServiceTypesPanel, type ServiceTypesPanelHandle } from "./ServiceTypesPanel";
// The one vendor form, shared with the vendor lists on Inventory and Maintenance.
import { VendorFormDialog } from "@/pages/inventory/VendorFormDialog";

import { type Vendor } from "@/pages/inventory/inventory.data";
import { useVendorsForAccount, vendorsStore } from "@/data/vendorsStore";
import type { AccountRecord } from "@/pages/accounts/accounts.data";

// US States for dropdown
export const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

// Canadian Provinces
export const CA_PROVINCES = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon"
];

export function MaintenancePage({ account }: { account?: AccountRecord }) {
    // Active section tab
    const [activeSection, setActiveSection] = useState<"services" | "vendors">("services");

    // The Add button lives in this page's header; the list is the panel's.
    const servicePanel = useRef<ServiceTypesPanelHandle>(null);

    // Vendor State — live store, scoped to the active carrier so the
    // super-admin sees only this carrier's vendors and any add/edit done
    // here flows back into CreateOrderModal's vendor dropdown.
    const vendors = useVendorsForAccount(account?.id);
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    // Vendor Filtering — vendor.name is required, companyName/email optional.
    const filteredVendors = vendors.filter((vendor) => {
        const q = vendorSearchQuery.toLowerCase();
        return (
            vendor.name.toLowerCase().includes(q) ||
            (vendor.companyName ?? "").toLowerCase().includes(q) ||
            (vendor.email ?? "").toLowerCase().includes(q)
        );
    });

    // Vendor Handlers — dispatch through vendorsStore so adds/edits flow
    // back into CreateOrderModal and any other consumer in real time.
    const handleOpenVendorDialog = (vendor?: Vendor) => {
        setEditingVendor(vendor ?? null);
        setIsVendorDialogOpen(true);
    };

    const handleDeleteVendor = (id: string) => {
        if (confirm("Are you sure you want to delete this vendor?")) {
            vendorsStore.remove(id);
        }
    };

    // Contact handlers removed (simplified to single contact name)

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-8 py-6">
                <div className="flex text-sm text-slate-500 mb-2">
                    <span className="mr-2">Settings</span> / <span className="ml-2 font-medium text-slate-900">Maintenance</span>
                </div>

                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Maintenance Settings
                        </h1>
                        <p className="text-slate-500 max-w-2xl">
                            Manage maintenance configurations, service types, vendors, and schedules to ensure fleet compliance.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Section Switcher (like Document Settings) */}
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setActiveSection("services")}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSection === "services"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                Service Types
                            </button>
                            <button
                                onClick={() => setActiveSection("vendors")}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeSection === "vendors"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-600 hover:text-slate-900"
                                    }`}
                            >
                                Vendor List
                            </button>
                        </div>

                        {activeSection === "services" ? (
                            <Button onClick={() => servicePanel.current?.openAdd()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 pl-4 pr-3">
                                <Plus className="h-4 w-4" />
                                Add Service Type
                            </Button>
                        ) : (
                            <Button onClick={() => handleOpenVendorDialog()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 pl-4 pr-3">
                                <Plus className="h-4 w-4" />
                                Add Vendor
                            </Button>
                        )}
                    </div>
                </div>

                {/* Service Types Section */}
                {activeSection === "services" && (
                    <ServiceTypesPanel ref={servicePanel} />
                )}


                {/* Vendor List Section */}
                {activeSection === "vendors" && (
                     <div className="flex flex-col space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="relative w-80">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search vendors..."
                                    className="pl-9 bg-white"
                                    value={vendorSearchQuery}
                                    onChange={(e) => setVendorSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Company Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Email / Phone
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredVendors.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No vendors found. Click "Add Vendor" to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredVendors.map((vendor) => (
                                            <tr key={vendor.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                                            <Building2 className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {vendor.companyName}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        <span>{vendor.address?.city}, {vendor.address?.state}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="text-sm text-slate-600">
                                                        {vendor.contactName ? (
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-4 w-4 text-slate-400" />
                                                                <span>{vendor.contactName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">No contact</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>{vendor.email || '—'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                                                            <span>{vendor.phone || '—'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center align-middle">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleOpenVendorDialog(vendor)}
                                                            className="text-slate-600 hover:text-slate-900 transition-colors inline-block"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVendor(vendor.id)}
                                                            className="text-slate-600 hover:text-red-600 transition-colors inline-block ml-2"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Vendor Dialog */}
            <VendorFormDialog
                open={isVendorDialogOpen}
                vendor={editingVendor}
                accountId={account?.id}
                onClose={() => { setIsVendorDialogOpen(false); setEditingVendor(null); }}
            />
        </div>
    );
}
