import { useState } from "react";
import { Plus, Search, Edit, Trash2, Truck, Car, Layers, Building2, Phone, Mail, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

import { Label } from "@/components/ui/label";
import { INITIAL_SERVICE_TYPES } from "@/data/service-types.data";
import { type ServiceType, type ServiceCategory, type ServiceComplexity, CATEGORY_LABELS } from "@/types/service-types";

import { type Vendor, INITIAL_VENDORS } from "@/data/vendors.data";

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

const MAINTENANCE_CLASSES = ["Safety Inspection", "Intermediate Service", "Comprehensive Service", "Major Overhaul", "Other"];
const COMPLEXITY_LEVELS: ServiceComplexity[] = ["Basic", "Moderate", "Extensive", "Intensive"];

export function MaintenancePage() {
    // Active section tab
    const [activeSection, setActiveSection] = useState<"services" | "vendors">("services");

    // Service Types State
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(INITIAL_SERVICE_TYPES);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceType | null>(null);
    const [formData, setFormData] = useState<Partial<ServiceType>>({
        name: "",
        category: "both_cmv_and_non_cmv",
        group: "Safety Inspection",
        complexity: "Basic",
        description: ""
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Filters State
    const [filterClass, setFilterClass] = useState<string>("all");
    const [filterApplicability, setFilterApplicability] = useState<ServiceCategory | "all">("all");
    const [filterComplexity, setFilterComplexity] = useState<ServiceComplexity | "all">("all");

    // Vendor State
    const [vendors, setVendors] = useState<Vendor[]>(INITIAL_VENDORS);
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [vendorFormData, setVendorFormData] = useState<Partial<Vendor>>({
        companyName: "",
        address: {
            country: "USA",
            unit: "",
            street: "",
            city: "",
            stateProvince: "",
            postalCode: ""
        },
        email: "",
        phone: "",
        contacts: []
    });

    // Helper to reset pagination when filters change
    const handleFilterChange = (setter: (value: any) => void, value: any) => {
        setter(value);
        setCurrentPage(1);
    };

    // Service Types Filtering & Pagination Logic
    const filteredServices = serviceTypes.filter((service) => {
        const matchesSearch = 
            service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesClass = filterClass === "all" || service.group === filterClass;
        const matchesApplicability = filterApplicability === "all" || service.category === filterApplicability;
        const matchesComplexity = filterComplexity === "all" || service.complexity === filterComplexity;

        return matchesSearch && matchesClass && matchesApplicability && matchesComplexity;
    });

    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
    const paginatedServices = filteredServices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Vendor Filtering
    const filteredVendors = vendors.filter((vendor) =>
        vendor.companyName.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
        vendor.email.toLowerCase().includes(vendorSearchQuery.toLowerCase())
    );

    // Service Type Handlers
    const handleOpenDialog = (service?: ServiceType) => {
        if (service) {
            setEditingService(service);
            setFormData({ 
                name: service.name, 
                category: service.category, 
                group: service.group,
                complexity: service.complexity,
                description: service.description
            });
        } else {
            setEditingService(null);
            setFormData({ 
                name: "", 
                category: "both_cmv_and_non_cmv", 
                group: "Safety Inspection",
                complexity: "Basic",
                description: ""
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.category || !formData.group || !formData.complexity) return;

        if (editingService) {
            setServiceTypes(
                serviceTypes.map((s) =>
                    s.id === editingService.id
                        ? { 
                            ...s, 
                            name: formData.name!, 
                            category: formData.category as ServiceCategory, 
                            group: formData.group!,
                            complexity: formData.complexity as ServiceComplexity,
                            description: formData.description || ""
                          }
                        : s
                )
            );
        } else {
            const newService: ServiceType = {
                id: crypto.randomUUID(),
                name: formData.name!,
                category: formData.category as ServiceCategory,
                group: formData.group!,
                complexity: formData.complexity as ServiceComplexity,
                description: formData.description || ""
            };
            setServiceTypes([...serviceTypes, newService]);
        }
        setIsDialogOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this service type?")) {
            setServiceTypes(serviceTypes.filter((s) => s.id !== id));
        }
    };

    // Vendor Handlers (unchanged)
    const handleOpenVendorDialog = (vendor?: Vendor) => {
        if (vendor) {
            setEditingVendor(vendor);
            setVendorFormData({
                companyName: vendor.companyName,
                address: { ...vendor.address },
                email: vendor.email,
                phone: vendor.phone,
                contacts: [...vendor.contacts]
            });
        } else {
            setEditingVendor(null);
            setVendorFormData({
                companyName: "",
                address: {
                    country: "USA",
                    unit: "",
                    street: "",
                    city: "",
                    stateProvince: "",
                    postalCode: ""
                },
                email: "",
                phone: "",
                contacts: []
            });
        }
        setIsVendorDialogOpen(true);
    };

    const handleSaveVendor = () => {
        if (!vendorFormData.companyName) return;

        if (editingVendor) {
            setVendors(
                vendors.map((v) =>
                    v.id === editingVendor.id
                        ? {
                            ...v,
                            companyName: vendorFormData.companyName!,
                            address: vendorFormData.address!,
                            email: vendorFormData.email!,
                            phone: vendorFormData.phone!,
                            contacts: vendorFormData.contacts!
                        }
                        : v
                )
            );
        } else {
            const newVendor: Vendor = {
                id: crypto.randomUUID(),
                companyName: vendorFormData.companyName!,
                address: vendorFormData.address!,
                email: vendorFormData.email || "",
                phone: vendorFormData.phone || "",
                contacts: vendorFormData.contacts || []
            };
            setVendors([...vendors, newVendor]);
        }
        setIsVendorDialogOpen(false);
    };

    const handleDeleteVendor = (id: string) => {
        if (confirm("Are you sure you want to delete this vendor?")) {
            setVendors(vendors.filter((v) => v.id !== id));
        }
    };

    const handleAddContact = () => {
        setVendorFormData(prev => ({
            ...prev,
            contacts: [
                ...(prev.contacts || []),
                { id: crypto.randomUUID(), firstName: "", lastName: "" }
            ]
        }));
    };

    const handleRemoveContact = (contactId: string) => {
        setVendorFormData(prev => ({
            ...prev,
            contacts: (prev.contacts || []).filter(c => c.id !== contactId)
        }));
    };

    const handleContactChange = (contactId: string, field: 'firstName' | 'lastName', value: string) => {
        setVendorFormData(prev => ({
            ...prev,
            contacts: (prev.contacts || []).map(c =>
                c.id === contactId ? { ...c, [field]: value } : c
            )
        }));
    };

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
                            <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 pl-4 pr-3">
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
                    <div className="flex flex-col space-y-4">
                        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:space-y-0 lg:gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search service types..."
                                    className="pl-9 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            {/* Filters */}
                            <div className="flex flex-wrap gap-2">
                                <Select value={filterClass} onValueChange={(v) => handleFilterChange(setFilterClass, v)}>
                                    <SelectTrigger className="w-[180px] bg-white">
                                        <SelectValue placeholder="All Classes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {MAINTENANCE_CLASSES.map(cls => (
                                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterApplicability} onValueChange={(v) => handleFilterChange(setFilterApplicability, v)}>
                                    <SelectTrigger className="w-[160px] bg-white">
                                        <SelectValue placeholder="All Vehicles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Vehicles</SelectItem>
                                        {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                            <SelectItem key={val} value={val}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={filterComplexity} onValueChange={(v) => handleFilterChange(setFilterComplexity, v)}>
                                    <SelectTrigger className="w-[150px] bg-white">
                                        <SelectValue placeholder="All Complexity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Complexity</SelectItem>
                                        {COMPLEXITY_LEVELS.map(level => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200">
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Maintenance Class
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Maintenance Type
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Applicability
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Complexity
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {paginatedServices.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                    No service types found matching your filters.
                                                </td>
                                            </tr>
                                        ) : (
                                            paginatedServices.map((service) => (
                                                <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="text-sm font-semibold text-blue-900">
                                                            {service.group}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="text-sm font-medium text-slate-900">
                                                            {service.name}
                                                        </div>
                                                        {service.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{service.description}</p>}
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="flex items-center gap-2">
                                                            {service.category === 'cmv_only' && <Truck className="h-4 w-4 text-slate-400" />}
                                                            {service.category === 'non_cmv_only' && <Car className="h-4 w-4 text-slate-400" />}
                                                            {service.category === 'both_cmv_and_non_cmv' && <Layers className="h-4 w-4 text-slate-400" />}
                                                            <span className="text-sm text-slate-600">{CATEGORY_LABELS[service.category]}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                                                            ${service.complexity === 'Basic' ? 'bg-green-100 text-green-800' : 
                                                              service.complexity === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                                                              service.complexity === 'Extensive' ? 'bg-orange-100 text-orange-800' :
                                                              'bg-red-100 text-red-800'
                                                            }`}>
                                                            {service.complexity}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleOpenDialog(service)}
                                                                className="text-slate-600 hover:text-slate-900 transition-colors inline-block"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(service.id)}
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
                            
                            {/* Pagination Footer */}
                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span>Rows per page:</span>
                                    <Select
                                        value={itemsPerPage.toString()}
                                        onValueChange={(value) => {
                                            setItemsPerPage(Number(value));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <SelectTrigger className="h-8 w-[70px]">
                                            <SelectValue placeholder={itemsPerPage.toString()} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 25, 50].map((pageSize) => (
                                                <SelectItem key={pageSize} value={pageSize.toString()}>
                                                    {pageSize}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="ml-2">
                                        Showing <span className="font-medium">{filteredServices.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredServices.length)}</span> of <span className="font-medium">{filteredServices.length}</span> results
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || totalPages === 0}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
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
                                                        <span>{vendor.address.city}, {vendor.address.stateProvince}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="text-sm text-slate-600">
                                                        {vendor.contacts.length > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-4 w-4 text-slate-400" />
                                                                <span>{vendor.contacts[0].firstName} {vendor.contacts[0].lastName}</span>
                                                                {vendor.contacts.length > 1 && (
                                                                    <span className="text-xs text-slate-400">+{vendor.contacts.length - 1} more</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-400">No contacts</span>
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

            {/* Service Type Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingService ? "Edit Service Type" : "Add Service Type"}</DialogTitle>
                        <DialogDescription>
                            {editingService
                                ? "Update the service type details below."
                                : "Create a new service type for maintenance records."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="group">Maintenance Class</Label>
                            <Select
                                value={formData.group}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, group: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MAINTENANCE_CLASSES.map((cls) => (
                                        <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Maintenance Type (Name)</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Brakes Inspection"
                            />
                        </div>
                         
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="category">Applicability</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, category: value as ServiceCategory })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select applicability" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="complexity">Complexity</Label>
                                <Select
                                    value={formData.complexity}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, complexity: value as ServiceComplexity })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select complexity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COMPLEXITY_LEVELS.map((level) => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe the service..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {editingService ? "Save Changes" : "Create Service Type"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Vendor Dialog */}
            <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingVendor ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
                        <DialogDescription>
                            {editingVendor
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
                                        value={vendorFormData.companyName}
                                        onChange={(e) => setVendorFormData({ ...vendorFormData, companyName: e.target.value })}
                                        placeholder="e.g. Fleet Maintenance Pro"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={vendorFormData.email}
                                            onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
                                            placeholder="contact@company.com"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Phone</Label>
                                        <Input
                                            id="phone"
                                            value={vendorFormData.phone}
                                            onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
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
                                            value={vendorFormData.address?.country}
                                            onValueChange={(value) =>
                                                setVendorFormData({
                                                    ...vendorFormData,
                                                    address: { ...vendorFormData.address!, country: value, stateProvince: "" }
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
                                            value={vendorFormData.address?.unit}
                                            onChange={(e) => setVendorFormData({
                                                ...vendorFormData,
                                                address: { ...vendorFormData.address!, unit: e.target.value }
                                            })}
                                            placeholder="Suite 100"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="street">Street Address</Label>
                                    <Input
                                        id="street"
                                        value={vendorFormData.address?.street}
                                        onChange={(e) => setVendorFormData({
                                            ...vendorFormData,
                                            address: { ...vendorFormData.address!, street: e.target.value }
                                        })}
                                        placeholder="123 Main Street"
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="city">City</Label>
                                        <Input
                                            id="city"
                                            value={vendorFormData.address?.city}
                                            onChange={(e) => setVendorFormData({
                                                ...vendorFormData,
                                                address: { ...vendorFormData.address!, city: e.target.value }
                                            })}
                                            placeholder="City"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="stateProvince">
                                            {vendorFormData.address?.country === "Canada" ? "Province" : "State"}
                                        </Label>
                                        <Select
                                            value={vendorFormData.address?.stateProvince}
                                            onValueChange={(value) =>
                                                setVendorFormData({
                                                    ...vendorFormData,
                                                    address: { ...vendorFormData.address!, stateProvince: value }
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(vendorFormData.address?.country === "Canada" ? CA_PROVINCES : US_STATES).map((state) => (
                                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="postalCode">
                                            {vendorFormData.address?.country === "Canada" ? "Postal Code" : "ZIP Code"}
                                        </Label>
                                        <Input
                                            id="postalCode"
                                            value={vendorFormData.address?.postalCode}
                                            onChange={(e) => setVendorFormData({
                                                ...vendorFormData,
                                                address: { ...vendorFormData.address!, postalCode: e.target.value }
                                            })}
                                            placeholder={vendorFormData.address?.country === "Canada" ? "A1A 1A1" : "12345"}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contacts */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Contacts
                                </h3>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddContact}
                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                                >
                                    <Plus className="h-4 w-4" /> Add Contact
                                </Button>
                            </div>

                            {(vendorFormData.contacts || []).length === 0 ? (
                                <p className="text-sm text-slate-500 text-center py-4">
                                    No contacts added. Click "Add Contact" to add one.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {(vendorFormData.contacts || []).map((contact) => (
                                        <div key={contact.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <Input
                                                    value={contact.firstName}
                                                    onChange={(e) => handleContactChange(contact.id, 'firstName', e.target.value)}
                                                    placeholder="First Name"
                                                />
                                                <Input
                                                    value={contact.lastName}
                                                    onChange={(e) => handleContactChange(contact.id, 'lastName', e.target.value)}
                                                    placeholder="Last Name"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveContact(contact.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveVendor} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {editingVendor ? "Save Changes" : "Add Vendor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
