import { useState } from "react";
import { Plus, Search, Edit, Trash2, Truck, Car, Layers } from "lucide-react";
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
import { type ServiceType, type ServiceCategory, CATEGORY_LABELS } from "@/types/service-types";

export function MaintenancePage() {
    const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(INITIAL_SERVICE_TYPES);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceType | null>(null);
    const [formData, setFormData] = useState<Partial<ServiceType>>({
        name: "",
        category: "both_cmv_and_non_cmv",
    });

    const filteredServices = serviceTypes.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenDialog = (service?: ServiceType) => {
        if (service) {
            setEditingService(service);
            setFormData({ name: service.name, category: service.category });
        } else {
            setEditingService(null);
            setFormData({ name: "", category: "both_cmv_and_non_cmv" });
        }
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!formData.name || !formData.category) return;

        if (editingService) {
            setServiceTypes(
                serviceTypes.map((s) =>
                    s.id === editingService.id
                        ? { ...s, name: formData.name!, category: formData.category as ServiceCategory }
                        : s
                )
            );
        } else {
            const newService: ServiceType = {
                id: crypto.randomUUID(),
                name: formData.name!,
                category: formData.category as ServiceCategory,
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
                            Manage maintenance configurations, service types, and schedules to ensure fleet compliance.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm gap-2 pl-4 pr-3">
                            <Plus className="h-4 w-4" />
                            Add Service Type
                        </Button>
                    </div>
                </div>

                <div className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="relative w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search service types..."
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Service Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Applicability
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {filteredServices.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                                No service types found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredServices.map((service) => (
                                            <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="text-sm font-medium text-slate-900">
                                                        {service.name}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-middle">
                                                    <div className="flex items-center gap-2">
                                                        {service.category === 'cmv_only' && <Truck className="h-4 w-4 text-slate-400" />}
                                                        {service.category === 'non_cmv_only' && <Car className="h-4 w-4 text-slate-400" />}
                                                        {service.category === 'both_cmv_and_non_cmv' && <Layers className="h-4 w-4 text-slate-400" />}
                                                        <span className="text-sm text-slate-600">{CATEGORY_LABELS[service.category]}</span>
                                                    </div>
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
                    </div>
                </div>
            </div>

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
                            <Label htmlFor="name">Service Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Oil Change"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Applicability</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(value) =>
                                    setFormData({ ...formData, category: value as ServiceCategory })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="both_cmv_and_non_cmv">All Vehicles</SelectItem>
                                    <SelectItem value="cmv_only">CMV Only</SelectItem>
                                    <SelectItem value="non_cmv_only">Non-CMV Only</SelectItem>
                                </SelectContent>
                            </Select>
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
        </div>
    );
}
