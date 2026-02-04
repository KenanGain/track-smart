import React, { useState, useEffect } from 'react';
import { INITIAL_ASSETS } from '../../pages/assets/assets.data';
import { X, Map, Grid, DoorClosed, Camera, UserCircle, Lock, UploadCloud, Truck, Plus } from 'lucide-react';

// Reuse Badge component for consistency
const Badge = ({ text, tone, className = "" }: { text: string; tone: string; className?: string }) => {
    const styles = tone === 'success' || tone === 'green'
        ? "bg-green-100 text-green-700 border-green-200"
        : tone === 'purple'
            ? "bg-purple-100 text-purple-700 border-purple-200"
            : tone === 'info' || tone === 'blue'
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : tone === 'yellow'
                    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                    : "bg-gray-100 text-gray-700 border-gray-200";

    return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}>
            {text}
        </span>
    );
};

interface LocationEditorModalProps {
    type: 'yard' | 'office';
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export const LocationEditorModal: React.FC<LocationEditorModalProps> = ({ type, isOpen, onClose, onSave, initialData }) => {
    const defaultYardData = {
        name: '', locationId: '', street: '', city: '', state: '', zip: '',
        timezone: "EST (UTC-5)", initialStatus: "Active",
        fenced: false, gated: false, cctv: false, guard: false, restricted: false,
        certificates: [] as any[],
        mapPin: { lat: null, lng: null },
        assignedAssets: [] as string[]
    };

    const defaultOfficeData = {
        label: '', address: '', contact: '', phone: '',
        operatingHours: [
            { day: "Mon - Fri", hours: "08:00 - 18:00" },
            { day: "Sat", hours: "Closed" },
            { day: "Sun", hours: "Closed" }
        ]
    };

    const [formData, setFormData] = useState<any>(type === 'yard' ? defaultYardData : defaultOfficeData);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                if (type === 'yard') {
                    // Map existing Yard data structure to form structure
                    setFormData({
                        name: initialData.name || '',
                        locationId: initialData.id || '',
                        street: initialData.address?.street || '',
                        city: initialData.address?.city || '',
                        state: initialData.address?.state || '',
                        zip: initialData.address?.zip || '',
                        timezone: "EST (UTC-5)", // Default or from data if available
                        initialStatus: initialData.status || "Active",
                        fenced: initialData.security?.fenced || false,
                        gated: initialData.security?.gated || false,
                        cctv: initialData.security?.cctv || false,
                        guard: initialData.security?.guard || false,
                        restricted: initialData.security?.restricted || false,
                        certificates: [], // Mock
                        mapPin: { lat: null, lng: null },
                        assignedAssets: initialData.assignedAssets || []
                    });
                } else {
                    // Map existing Office data structure
                    setFormData({
                        label: initialData.label || '',
                        address: initialData.address || '',
                        contact: initialData.contact || '',
                        phone: initialData.phone || '',
                        operatingHours: initialData.operatingHours || defaultOfficeData.operatingHours
                    });
                }
            } else {
                setFormData(type === 'yard' ? defaultYardData : defaultOfficeData);
            }
        }
    }, [isOpen, initialData, type]);

    const handleInputChange = (key: string, val: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: val }));
    };

    const handleToggle = (key: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleAsset = (assetId: string) => {
        setFormData((prev: any) => {
            const current = prev.assignedAssets || [];
            if (current.includes(assetId)) {
                return { ...prev, assignedAssets: current.filter((id: string) => id !== assetId) };
            } else {
                return { ...prev, assignedAssets: [...current, assetId] };
            }
        });
    };

    const calculateScore = () => {
        let score = 40; // Base
        if (formData.cctv) score += 25;
        if (formData.fenced && formData.gated) score += 17;
        else if (formData.fenced || formData.gated) score += 8;
        if (formData.restricted) score += 10;
        if (formData.guard) score += 8;
        return Math.min(100, score);
    };

    if (!isOpen) return null;

    // --- RENDER OFFICE FORM ---
    if (type === 'office') {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-xl font-bold text-slate-900">{initialData ? "Edit Office Location" : "Add Office Location"}</h3>
                        <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Location Label</label>
                            <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Phoenix Branch" value={formData.label} onChange={e => handleInputChange('label', e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Full Address</label>
                            <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="123 Main St, Phoenix, AZ 85001" value={formData.address} onChange={e => handleInputChange('address', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Contact Person</label>
                                <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Manager Name" value={formData.contact} onChange={e => handleInputChange('contact', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                                <input type="tel" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="+1 (555) 000-0000" value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                            </div>
                        </div>

                        {/* Operating Hours */}
                        <div className="space-y-3 pt-2 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Operating Hours</h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mon - Fri</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="08:00 - 18:00"
                                        value={formData.operatingHours?.find((h: any) => h.day === "Mon - Fri")?.hours || ""}
                                        onChange={e => {
                                            const newHours = [...(formData.operatingHours || [])];
                                            const idx = newHours.findIndex((h: any) => h.day === "Mon - Fri");
                                            if (idx >= 0) newHours[idx].hours = e.target.value;
                                            setFormData({ ...formData, operatingHours: newHours });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Saturday</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="10:00 - 14:00"
                                        value={formData.operatingHours?.find((h: any) => h.day === "Sat")?.hours || ""}
                                        onChange={e => {
                                            const newHours = [...(formData.operatingHours || [])];
                                            const idx = newHours.findIndex((h: any) => h.day === "Sat");
                                            if (idx >= 0) newHours[idx].hours = e.target.value;
                                            setFormData({ ...formData, operatingHours: newHours });
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Sunday</label>
                                    <input type="text" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Closed"
                                        value={formData.operatingHours?.find((h: any) => h.day === "Sun")?.hours || ""}
                                        onChange={e => {
                                            const newHours = [...(formData.operatingHours || [])];
                                            const idx = newHours.findIndex((h: any) => h.day === "Sun");
                                            if (idx >= 0) newHours[idx].hours = e.target.value;
                                            setFormData({ ...formData, operatingHours: newHours });
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                        <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg">Cancel</button>
                        <button onClick={() => { onSave(formData); onClose(); }} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">Save Office</button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER YARD FORM ---
    const score = calculateScore();
    let scoreTone = "gray";
    let scoreLabel = "LOW";
    if (score >= 90) { scoreTone = "blue"; scoreLabel = "EXCELLENT"; }
    else if (score >= 75) { scoreTone = "green"; scoreLabel = "GOOD"; }
    else if (score >= 60) { scoreTone = "yellow"; scoreLabel = "FAIR"; }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-6xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-bold text-slate-900">{initialData ? "Edit Yard / Terminal" : "Add Yard / Terminal"}</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/30">
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
                                            <div className={`p-2 rounded-full ${formData[item.key] ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <item.icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{item.label}</div>
                                                <div className="text-xs text-slate-500">{item.desc}</div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleToggle(item.key)}
                                            className={`w-10 h-6 rounded-full p-1 transition-colors ${formData[item.key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${formData[item.key] ? 'translate-x-4' : 'translate-x-0'}`} />
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
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors bg-white">
                                <div className="bg-blue-50 p-3 rounded-full mb-3"><UploadCloud className="w-6 h-6 text-blue-600" /></div>
                                <p className="text-sm font-semibold text-slate-700">Click to upload</p>
                                <p className="text-xs text-slate-400">PDF, PNG, JPG up to 10MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Assets Section */}
                    {/* Assigned Assets Section */}
                    <div className="mt-8 pt-8 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Assigned Assets (CMV)
                        </h4>
                        <div className="bg-white rounded-xl border border-slate-200 p-6">

                            {/* Add Asset Dropdown */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Add Asset to Yard</label>
                                <div className="relative">
                                    <select
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-10 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-pointer hover:bg-slate-100"
                                        value=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                toggleAsset(e.target.value);
                                                e.target.value = ""; // Reset select
                                            }
                                        }}
                                    >
                                        <option value="" disabled>Select a truck to assign...</option>
                                        {INITIAL_ASSETS
                                            .filter(a => a.assetCategory === 'CMV' && !(formData.assignedAssets || []).includes(a.id))
                                            .map(asset => (
                                                <option key={asset.id} value={asset.id}>
                                                    {asset.unitNumber} - {asset.make} {asset.model} ({asset.year})
                                                </option>
                                            ))
                                        }
                                        {INITIAL_ASSETS.filter(a => a.assetCategory === 'CMV' && !(formData.assignedAssets || []).includes(a.id)).length === 0 && (
                                            <option value="" disabled>All available assets assigned</option>
                                        )}
                                    </select>
                                    <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Selected Assets List */}
                            {(formData.assignedAssets || []).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {(formData.assignedAssets || []).map((assetId: string) => {
                                        const asset = INITIAL_ASSETS.find(a => a.id === assetId);
                                        if (!asset) return null;
                                        return (
                                            <div
                                                key={assetId}
                                                className="group flex items-center gap-2 pl-3 pr-2 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-xs font-bold shadow-sm"
                                            >
                                                <span>{asset.unitNumber}</span>
                                                <button
                                                    onClick={() => toggleAsset(assetId)}
                                                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
                                    <p className="text-xs text-slate-400 font-medium">No assets assigned yet.</p>
                                </div>
                            )}

                            <p className="text-[10px] text-slate-400 mt-4 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                                Selected assets will be registered to this location.
                            </p>
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
