import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Plus,
    ChevronDown,
    Check,
    Edit3,
    X,
    Building2,
    Grid,
    DoorClosed,
    Camera,
    UserCircle,
    Lock,
    UploadCloud,
    FileText,
    Map
} from 'lucide-react';
import {
    LOCATIONS_UI,
    INITIAL_LOCATIONS_DATA,
    type Location,
    type LocationsTableData
} from './locations.data';

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

// --- ADD/EDIT LOCATION MODAL ---

interface AddLocationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData: Location | null;
}

const AddLocationDialog: React.FC<AddLocationDialogProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState(LOCATIONS_UI.addLocationModal.newLocationDefaults);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const calculateScore = () => {
        let score = 40; // Base
        if (formData.cctv) score += 25;
        if (formData.fenced && formData.gated) score += 17;
        else if (formData.fenced || formData.gated) score += 8;
        if (formData.restricted) score += 10;
        if (formData.guard) score += 8;
        return Math.min(100, score);
    };

    const score = calculateScore();
    let scoreTone = "gray";
    let scoreLabel = "LOW";
    if (score >= 90) { scoreTone = "blue"; scoreLabel = "EXCELLENT"; }
    else if (score >= 75) { scoreTone = "green"; scoreLabel = "GOOD"; }
    else if (score >= 60) { scoreTone = "yellow"; scoreLabel = "FAIR"; }

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name,
                    locationId: initialData.id,
                    type: initialData.type as "Yard" | "Office",
                    street: initialData.address.street,
                    city: initialData.address.city,
                    state: initialData.address.state,
                    zip: initialData.address.zip,
                    timezone: "EST (UTC-5)",
                    initialStatus: initialData.status as "Active" | "Maintenance",
                    fenced: initialData.security.fenced,
                    gated: initialData.security.gated,
                    cctv: initialData.security.cctv,
                    guard: initialData.security.guard,
                    restricted: initialData.security.restricted,
                    mapPin: { lat: null, lng: null },
                    certificates: []
                });
            } else {
                setFormData(LOCATIONS_UI.addLocationModal.newLocationDefaults);
            }
        }
    }, [isOpen, initialData]);

    const handleToggle = (key: string) => {
        setFormData((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
    };

    const handleInputChange = (key: string, val: string) => {
        setFormData((prev) => ({ ...prev, [key]: val }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData((prev) => ({
                ...prev,
                certificates: [...prev.certificates, { name: file.name, size: (file.size / 1024 / 1024).toFixed(2) + " MB" }]
            }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-900">{initialData ? "Edit Location" : LOCATIONS_UI.addLocationModal.title}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Column 1: Basic & Address */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">BASIC & ADDRESS</h4>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Location Name</label>
                                <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. West Coast Distribution" value={formData.name} onChange={e => handleInputChange('name', e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Location ID</label>
                                <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="LOC-####" value={formData.locationId} onChange={e => handleInputChange('locationId', e.target.value)} />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    {(["Yard", "Office"] as const).map(t => (
                                        <button key={t} onClick={() => handleInputChange('type', t)}
                                            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${formData.type === t ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Address</label>
                                <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Street Address" value={formData.street} onChange={e => handleInputChange('street', e.target.value)} />
                                <div className="grid grid-cols-3 gap-2">
                                    <input type="text" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="City" value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
                                    <input type="text" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="State" value={formData.state} onChange={e => handleInputChange('state', e.target.value)} />
                                    <input type="text" className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Zip" value={formData.zip} onChange={e => handleInputChange('zip', e.target.value)} />
                                </div>
                            </div>

                            <div className="border-2 border-dashed border-slate-300 rounded-xl h-32 flex flex-col items-center justify-center text-slate-400 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
                                <Map className="w-6 h-6 mb-2" />
                                <span className="text-sm font-semibold">Set Map Pin</span>
                            </div>
                        </div>

                        {/* Column 2: Schedule & Security */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SCHEDULE & SECURITY</h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Timezone</label>
                                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-white" value={formData.timezone} onChange={e => handleInputChange('timezone', e.target.value)}>
                                        <option>EST (UTC-5)</option><option>CST (UTC-6)</option><option>MST (UTC-7)</option><option>PST (UTC-8)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Initial Status</label>
                                    <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none bg-white" value={formData.initialStatus} onChange={e => handleInputChange('initialStatus', e.target.value)}>
                                        <option>Active</option><option>Maintenance</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { key: 'fenced', label: 'Fenced Perimeter', desc: 'Physical fencing around property', icon: Grid },
                                    { key: 'gated', label: 'Gated Entry', desc: 'Controlled entry/exit points', icon: DoorClosed },
                                    { key: 'cctv', label: 'CCTV Surveillance', desc: '24/7 Video monitoring', icon: Camera },
                                    { key: 'guard', label: 'Security Guard', desc: 'On-premise personnel', icon: UserCircle },
                                    { key: 'restricted', label: 'Restricted Areas', desc: 'Special access zones defined', icon: Lock },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-full ${formData[item.key as keyof typeof formData] ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{item.label}</div>
                                                <div className="text-xs text-slate-500">{item.desc}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToggle(item.key)}
                                            className={`w-10 h-6 rounded-full p-1 transition-colors ${formData[item.key as keyof typeof formData] ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${formData[item.key as keyof typeof formData] ? 'translate-x-4' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 3: Score & Advanced */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">SCORE & ADVANCED</h4>

                            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col items-center text-center">
                                <div className="text-4xl font-black text-slate-900 mb-1">{score} <span className="text-lg text-slate-400 font-medium">/ 100</span></div>
                                <Badge text={scoreLabel} tone={scoreTone} className="mb-6" />

                                <div className="w-full space-y-2 text-sm">
                                    <div className="flex justify-between text-slate-600"><span>Base Security</span><span className="font-bold text-slate-900">+40 pts</span></div>
                                    <div className="flex justify-between text-slate-600"><span>Monitoring</span><span className={`font-bold ${formData.cctv ? 'text-slate-900' : 'text-slate-300'}`}>+25 pts</span></div>
                                    <div className="flex justify-between text-slate-600"><span>Access Control</span><span className={`font-bold ${formData.fenced || formData.gated ? 'text-slate-900' : 'text-slate-300'}`}>+{formData.fenced && formData.gated ? 17 : (formData.fenced || formData.gated ? 8 : 0)} pts</span></div>
                                </div>
                            </div>

                            <div
                                className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors bg-white"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
                                <div className="bg-blue-50 p-3 rounded-full mb-3"><UploadCloud className="w-6 h-6 text-blue-600" /></div>
                                <p className="text-sm font-semibold text-slate-700">Click to upload</p>
                                <p className="text-xs text-slate-400">PDF, PNG, JPG up to 10MB</p>
                                {formData.certificates.length > 0 && (
                                    <div className="mt-4 w-full space-y-2">
                                        {formData.certificates.map((file, idx) => (
                                            <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded text-xs font-medium text-slate-700">
                                                <FileText className="w-3 h-3" /> <span className="truncate flex-1">{file.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg">Cancel</button>
                    <button onClick={() => { onSave({ ...formData, score }); onClose(); }} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Save Location</button>
                </div>
            </div>
        </div>
    );
};

// --- LOCATIONS TABLE COMPONENT ---

interface LocationsTableProps {
    locationsData: LocationsTableData;
    filters: { search: string; type: string; status: string; security: string };
    onEditLocation: (loc: Location) => void;
}

const LocationsTable: React.FC<LocationsTableProps> = ({ locationsData, filters, onEditLocation }) => {
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (key: string) => {
        setCollapsedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const filterItem = (item: Location) => {
        if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase()) && !item.id.toLowerCase().includes(filters.search.toLowerCase()) && !item.address.street.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.type !== "All" && item.type !== filters.type) return false;
        if (filters.status !== "All" && item.status !== filters.status) return false;
        if (filters.security !== "All") {
            if (filters.security === "High (90+)" && item.score < 90) return false;
            if (filters.security === "Medium (70-89)" && (item.score < 70 || item.score >= 90)) return false;
            if (filters.security === "Low (<70)" && item.score >= 70) return false;
        }
        return true;
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {LOCATIONS_UI.locationsPage.table.columns.map((col, idx) => (
                                <th key={idx} className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{col}</th>
                            ))}
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
                                        <tr key={loc.id} className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 text-sm">{loc.name}</div>
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
                                            <td className="px-6 py-4">
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
                                            <td className="px-6 py-4 text-slate-400 text-right">
                                                <button
                                                    onClick={() => onEditLocation(loc)}
                                                    className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
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

export function LocationsPage() {
    const [locationsData, setLocationsData] = useState<LocationsTableData>(INITIAL_LOCATIONS_DATA);
    const [filters, setFilters] = useState({ search: "", type: "All", status: "All", security: "All" });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
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
            type: newLoc.type,
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

        const targetGroupKey = newLoc.type === "Office" ? "office" : "yard_terminal";

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

    return (
        <div className="min-h-screen bg-slate-50 p-4 lg:p-8">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <Building2 className="w-4 h-4" />
                <span>Account</span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-slate-900">Locations</span>
            </div>

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
                    {(['type', 'status', 'security'] as const).map(key => (
                        <div key={key} className="relative min-w-[140px]">
                            <select
                                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none pr-8"
                                value={filters[key]}
                                onChange={(e) => setFilters(prev => ({ ...prev, [key]: e.target.value }))}
                            >
                                {LOCATIONS_UI.locationsPage.filters[key].options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Table */}
            <LocationsTable
                locationsData={locationsData}
                filters={filters}
                onEditLocation={handleOpenEditLocation}
            />

            {/* Modal */}
            <AddLocationDialog
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveLocation}
                initialData={editingLocation}
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
