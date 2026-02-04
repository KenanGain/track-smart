import React, { useState } from 'react';
import { Search, Plus, Building2, Edit3, ChevronDown, Check, X, Grid, DoorClosed, Camera, UserCircle, Lock, Trash2 } from 'lucide-react';
import {
    LOCATIONS_UI,
    INITIAL_LOCATIONS_DATA,
    type Location,
    type LocationsTableData
} from './locations.data';
import { LocationEditorModal } from '../../components/locations/LocationEditorModal';
import { LocationViewModal } from '../../components/locations/LocationViewModal';

// --- HELPER COMPONENTS ---

const Badge = ({ text, tone, className = "" }: { text: string; tone: string; className?: string }) => {
    const styles = tone === 'success'
        ? "bg-green-100 text-green-700 border-green-200"
        : tone === 'purple'
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : tone === 'info' || tone === 'blue'
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : tone === 'yellow'
                    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                    : tone === 'green'
                        ? "bg-green-100 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-700 border-gray-200";

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}>
            {text}
        </span>
    );
};

const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
    if (!visible) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[100]">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// --- LOCATIONS TABLE COMPONENT ---

interface LocationsTableProps {
    locationsData: LocationsTableData;
    filters: { search: string; status: string; security: string };
    onEditLocation: (loc: Location) => void;
    onViewLocation: (loc: Location) => void;
    onDeleteLocation: (loc: Location) => void;
}

const LocationsTable: React.FC<LocationsTableProps> = ({ locationsData, filters, onEditLocation, onViewLocation, onDeleteLocation }) => {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const filterItem = (loc: Location) => {
        const matchesSearch = loc.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            loc.id.toLowerCase().includes(filters.search.toLowerCase());
        const matchesStatus = filters.status === "All" || loc.status === filters.status;

        let matchesSecurity = true;
        if (filters.security !== "All") {
            // Simple mapping logic based on UI dropdown usually
            if (filters.security === "Fenced") matchesSecurity = loc.security.fenced;
            if (filters.security === "Gated") matchesSecurity = loc.security.gated;
            if (filters.security === "CCTV") matchesSecurity = loc.security.cctv;
            if (filters.security === "Guarded") matchesSecurity = loc.security.guard;
        }

        return matchesSearch && matchesStatus && matchesSecurity;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Location Name / ID</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider">Address</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center" title="Fenced"><Grid className="w-4 h-4 mx-auto" /></th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center" title="Gated"><DoorClosed className="w-4 h-4 mx-auto" /></th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center" title="CCTV"><Camera className="w-4 h-4 mx-auto" /></th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center" title="Guard"><UserCircle className="w-4 h-4 mx-auto" /></th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center" title="Restricted"><Lock className="w-4 h-4 mx-auto" /></th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">Score</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">Status</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {locationsData.groups.map((group) => {
                            const visibleItems = group.items.filter(filterItem);
                            if (visibleItems.length === 0) return null;

                            return (
                                <React.Fragment key={group.key}>
                                    <tr className="bg-slate-50/50 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleGroup(group.key)}>
                                        <td colSpan={10} className="px-6 py-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-sm text-slate-800">{group.label}</span>
                                                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold uppercase">{visibleItems.length} Locations</span>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${collapsedGroups[group.key] ? '-rotate-90' : ''}`} />
                                            </div>
                                        </td>
                                    </tr>
                                    {!collapsedGroups[group.key] && visibleItems.map((loc) => (
                                        <tr
                                            key={loc.id}
                                            className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                            onClick={() => onViewLocation(loc)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{loc.name}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{loc.id}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-700">{loc.address.street}</div>
                                                <div className="text-xs text-slate-500">{loc.address.city}, {loc.address.state} {loc.address.zip}</div>
                                            </td>
                                            {(['fenced', 'gated', 'cctv', 'guard', 'restricted'] as const).map(k => (
                                                <td key={k} className="px-6 py-4 text-center">
                                                    {loc.security[k] ? <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto"><Check className="w-3.5 h-3.5" /></div> : <span className="text-slate-300 font-bold text-lg">—</span>}
                                                </td>
                                            ))}
                                            <td className="px-6 py-4 text-center">
                                                <Badge
                                                    text={loc.score.toString()}
                                                    tone={loc.score >= 90 ? 'blue' : loc.score >= 70 ? 'yellow' : 'gray'}
                                                    className="px-3"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center">
                                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${loc.status === 'Active' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                                                        {loc.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEditLocation(loc); }}
                                                        className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded text-slate-400 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onDeleteLocation(loc); }}
                                                        className="p-1 hover:text-red-600 hover:bg-red-50 rounded text-slate-400 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- MAIN PAGE COMPONENT ---

export function LocationsPage({ hideBreadcrumb = false }: { hideBreadcrumb?: boolean }) {
    const [locationsData, setLocationsData] = useState<LocationsTableData>(INITIAL_LOCATIONS_DATA);
    const [filters, setFilters] = useState({ search: "", status: "All", security: "All" });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
    const [toast, setToast] = useState({ visible: false, message: "" });

    const showToast = (msg: string) => {
        setToast({ visible: true, message: msg });
        setTimeout(() => setToast({ visible: false, message: "" }), 3000);
    };

    const handleOpenAddLocation = () => {
        setEditingLocation(null);
        setIsModalOpen(true);
    };

    const handleOpenEditLocation = (loc: Location) => {
        setEditingLocation(loc);
        setIsModalOpen(true);
    };

    const handleSaveLocation = (newLoc: any) => {
        const locationEntry: Location = {
            id: newLoc.locationId,
            name: newLoc.name,
            address: { street: newLoc.street, city: newLoc.city, state: newLoc.state, zip: newLoc.zip },
            security: {
                fenced: newLoc.fenced,
                gated: newLoc.gated,
                cctv: newLoc.cctv,
                guard: newLoc.guard,
                restricted: newLoc.restricted
            },
            score: newLoc.score,
            status: newLoc.initialStatus
        };

        const targetGroupKey = "yard_terminal";

        setLocationsData(prev => {
            let groups = prev.groups;

            // If editing, remove old entry first (in case type changed it handles moving group too)
            if (editingLocation) {
                groups = groups.map(g => ({
                    ...g,
                    items: g.items.filter(i => i.id !== editingLocation.id)
                }));
            }

            // Add to target group
            return {
                ...prev,
                groups: groups.map(g =>
                    g.key === targetGroupKey
                        ? { ...g, items: [...g.items, locationEntry] }
                        : g
                )
            };
        });

        showToast(editingLocation ? "Location updated successfully" : "New location added successfully");
        setEditingLocation(null);
    };

    const handleDeleteLocation = (loc: Location) => {
        if (confirm(`Are you sure you want to remove ${loc.name}?`)) {
            setLocationsData(prev => ({
                ...prev,
                groups: prev.groups.map(g => ({
                    ...g,
                    items: g.items.filter(i => i.id !== loc.id)
                }))
            }));
            showToast("Location removed successfully");
        }
    };

    return (
        <div className={hideBreadcrumb ? "bg-slate-50" : "min-h-screen bg-slate-50 p-4 lg:p-8"}>
            {/* Breadcrumb */}
            {!hideBreadcrumb && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                    <Building2 className="w-4 h-4" />
                    <span>Account</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-semibold text-slate-900">Locations</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{LOCATIONS_UI.locationsPage.title}</h1>
                    <p className="text-sm text-slate-500 mt-1">{LOCATIONS_UI.locationsPage.subtitle}</p>
                </div>
                <button onClick={handleOpenAddLocation} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors">
                    <Plus className="w-4 h-4" /> {LOCATIONS_UI.locationsPage.primaryAction.label}
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-lg">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={LOCATIONS_UI.locationsPage.filters.searchPlaceholder}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                    <div className="relative min-w-[140px]">
                        <select className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        >
                            {LOCATIONS_UI.locationsPage.filters.status.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative min-w-[140px]">
                        <select className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                            value={filters.security}
                            onChange={(e) => setFilters(prev => ({ ...prev, security: e.target.value }))}
                        >
                            {LOCATIONS_UI.locationsPage.filters.security.options.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <LocationsTable
                locationsData={locationsData}
                filters={filters}
                onEditLocation={handleOpenEditLocation}
                onViewLocation={(loc) => { setViewingLocation(loc); setIsViewModalOpen(true); }}
                onDeleteLocation={handleDeleteLocation}
            />

            {/* Modals */}
            <LocationEditorModal
                type="yard"
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveLocation}
                initialData={editingLocation}
            />

            <LocationViewModal
                type="yard"
                data={viewingLocation}
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                onEdit={() => {
                    setIsViewModalOpen(false);
                    if (viewingLocation) handleOpenEditLocation(viewingLocation);
                }}
            />

            {/* Toast */}
            <Toast
                message={toast.message}
                visible={toast.visible}
                onClose={() => setToast({ ...toast, visible: false })}
            />
        </div>
    );
}

export default LocationsPage;
