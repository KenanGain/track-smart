import React from 'react';
import { X, MapPin, Phone, Building2, Calendar, Camera, Grid, DoorClosed, Lock, UserCircle, Check, Edit3, Clock, Layers, ArrowRight, Printer, Share2 } from 'lucide-react';

const Badge = ({ text, tone }: { text: string; tone: string }) => {
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
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
            {text}
        </span>
    );
};

interface LocationViewModalProps {
    type: 'yard' | 'office';
    data: any;
    isOpen: boolean;
    onClose: () => void;
    onEdit?: () => void;
}

export const LocationViewModal: React.FC<LocationViewModalProps> = ({ type, data, isOpen, onClose, onEdit }) => {
    if (!isOpen || !data) return null;

    if (type === 'office') {
        const operatingHours = data.operatingHours || [
            { day: "Mon - Fri", hours: "08:00 - 18:00" },
            { day: "Sat", hours: "10:00 - 14:00" },
            { day: "Sun", hours: "Closed" }
        ];

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-white">
                        <div>
                            <h3 className="text-2xl font-bold text-slate-900">{data.label}</h3>
                            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                {data.id}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            {/* Left Column */}
                            <div className="space-y-8">
                                {/* Address */}
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ADDRESS</h4>
                                        <p className="text-sm font-medium text-slate-900 leading-relaxed max-w-[200px]">
                                            {data.address}
                                        </p>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">PHONE</h4>
                                        <p className="text-sm font-medium text-slate-900 font-mono">
                                            {data.phone}
                                        </p>
                                    </div>
                                </div>

                                {/* Primary Contact */}
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <UserCircle className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">PRIMARY CONTACT</h4>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                                                {/* Placeholder Avatar */}
                                                <img src={`https://ui-avatars.com/api/?name=${data.contact.replace(' ', '+')}&background=0D8ABC&color=fff`} alt="Contact" className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{data.contact}</div>
                                                <div className="text-xs text-slate-500">Office Manager</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-8">
                                {/* Map Card */}
                                <div className="bg-slate-100 rounded-xl overflow-hidden h-[180px] relative border border-slate-200 group">
                                    <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/light-v10/static/-74.006,40.7128,13,0/600x300@2x?access_token=YOUR_TOKEN')] bg-cover bg-center opacity-80 grayscale group-hover:grayscale-0 transition-all duration-500"></div>
                                    {/* Fallback pattern if no image */}
                                    <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-100"></div>

                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg ring-4 ring-white/50">
                                            <MapPin className="w-5 h-5 fill-current" />
                                        </div>
                                    </div>
                                </div>

                                {/* Operating Hours */}
                                <div className="flex gap-4">
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">OPERATING HOURS</h4>
                                        <div className="space-y-1.5">
                                            {operatingHours.map((schedule: { day: string; hours: string }, i: number) => (
                                                <div key={i} className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-medium w-20">{schedule.day}</span>
                                                    <span className={`font-medium ${schedule.hours === 'Closed' ? 'text-slate-400' : 'text-slate-900'}`}>
                                                        {schedule.hours}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            Close
                        </button>
                        {onEdit && (
                            <button
                                onClick={() => { onClose(); onEdit(); }}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                            >
                                <Edit3 className="w-4 h-4" /> Edit Location
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Yard View
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{data.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge text={data.status} tone={data.status === 'Active' ? 'success' : 'gray'} />
                                <span className="text-xs text-slate-400">ID: {data.id}</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Details */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Location & Schedule</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-3">
                                        <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Address</div>
                                            <div className="text-sm text-slate-600">{data.address.street}</div>
                                            <div className="text-sm text-slate-600">{data.address.city}, {data.address.state} {data.address.zip}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Calendar className="w-5 h-5 text-slate-400 shrink-0" />
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900">Timezone</div>
                                            <div className="text-sm text-slate-600">EST (UTC-5)</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Security */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-fit">
                            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Profile</h4>
                                <Badge
                                    text={`${data.score} / 100`}
                                    tone={data.score >= 90 ? 'blue' : data.score >= 70 ? 'yellow' : 'gray'}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { key: 'fenced', label: 'Fenced Perimeter', icon: Grid },
                                    { key: 'gated', label: 'Gated Entry', icon: DoorClosed },
                                    { key: 'cctv', label: 'CCTV Surveillance', icon: Camera },
                                    { key: 'guard', label: 'Security Guard', icon: UserCircle },
                                    { key: 'restricted', label: 'Restricted Areas', icon: Lock },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <item.icon className={`w-4 h-4 ${data.security[item.key] ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <span className={`text-sm font-medium ${data.security[item.key] ? 'text-slate-900' : 'text-slate-500'}`}>{item.label}</span>
                                        </div>
                                        {data.security[item.key] && <Check className="w-4 h-4 text-green-500" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white">Close</button>
                </div>
            </div>
        </div>
    );

    if (type === 'yard') {
        const securityFeatures = [
            { key: 'fenced', label: 'Fenced Perimeter', icon: Grid },
            { key: 'cctv', label: 'CCTV 24/7 Monitoring', icon: Camera },
            { key: 'guard', label: 'On-site Security Staff', icon: UserCircle },
        ];

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-white">
                        <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" alt="Warehouse" className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-2xl font-bold text-slate-900">{data.name}</h3>
                                    <Badge text={data.status.toUpperCase()} tone={data.status === 'Active' ? 'success' : 'warning'} />
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 font-medium">
                                    <span className="font-bold text-slate-400">ID:</span> {data.id}
                                    <span className="text-slate-300">|</span>
                                    <span className="font-bold text-slate-400">Type:</span> Regional Hub
                                </div>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body Content - 2 Columns */}
                    <div className="flex flex-col lg:flex-row h-full max-h-[70vh] overflow-y-auto">
                        {/* Left Column: Facility Logistics */}
                        <div className="flex-1 p-8 border-r border-slate-100">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Facility Logistics</h4>

                            <div className="flex flex-col sm:flex-row gap-6 mb-8">
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Address</div>
                                        <div className="font-bold text-slate-900">{data.address.street}</div>
                                        <div className="text-slate-600">{data.address.city}, {data.address.state} {data.address.zip}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 flex-1">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Timezone</div>
                                        <div className="font-bold text-slate-900">Eastern Standard Time</div>
                                        <div className="text-slate-500 text-xs">EST (UTC-5)</div>
                                    </div>
                                </div>
                            </div>

                            {/* Map Preview Card */}
                            <div className="rounded-xl overflow-hidden border border-slate-200 relative h-64 shadow-inner bg-slate-100 group">
                                <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                    <Layers className="w-3.5 h-3.5" /> Satellite View
                                </div>
                                <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
                                    <button className="w-8 h-8 bg-white rounded-md shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 font-bold">+</button>
                                    <button className="w-8 h-8 bg-white rounded-md shadow-sm border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 font-bold">-</button>
                                </div>
                                {/* Simulated Map Background */}
                                <div className="w-full h-full bg-gradient-to-br from-amber-700/20 to-slate-800/20 mix-blend-multiply relative">
                                    <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/-84.3880,33.7490,15,0/600x400?access_token=pk.eyJ1IjoidHJhY2tzbWFydCIsImEiOiJjbGo1aG44aG4wM24wM2ZwaDNzOXBwaG4wIn0.placeholder')] bg-cover bg-center opacity-50 grayscale contrast-125" />
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500/10 rounded-full animate-pulse flex items-center justify-center">
                                        <div className="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg relative z-20"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Security Profile */}
                        <div className="w-full lg:w-96 flex flex-col bg-slate-50/50 p-8 border-l border-slate-100">
                            <div className="flex items-center justify-between mb-8">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Profile</h4>
                                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">L3 Security</span>
                            </div>

                            {/* Score Circle */}
                            <div className="flex flex-col items-center justify-center mb-8">
                                <div className="relative w-40 h-40 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                        <path className="text-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                        <path className={`${data.score >= 90 ? 'text-blue-600' : data.score >= 70 ? 'text-yellow-500' : 'text-red-500'}`} strokeDasharray={`${data.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    <div className="absolute flex flex-col items-center">
                                        <span className="text-4xl font-black text-slate-900">{data.score}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Score</span>
                                    </div>
                                </div>
                                <div className="mt-4 font-bold text-slate-700 text-sm">Excellent Security Compliance</div>
                            </div>

                            {/* Security Checklist */}
                            <div className="space-y-3 flex-1">
                                {securityFeatures.map((feat) => {
                                    const isActive = data.security[feat.key];
                                    return (
                                        <div key={feat.key} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg ${isActive ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                                                    <feat.icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-semibold text-slate-700">{feat.label}</span>
                                            </div>
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isActive ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                                                {isActive ? <Check className="w-3 h-3" strokeWidth={3} /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <div className="flex items-center justify-between text-xs">
                                    <div>
                                        <div className="font-bold text-slate-400 uppercase text-[10px]">Last Audit</div>
                                        <div className="font-bold text-slate-700 mt-0.5">Oct 12, 2023</div>
                                    </div>
                                    <button className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                                        FULL AUDIT LOG <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <div className="flex gap-3">
                            {onEdit && (
                                <button onClick={() => { onClose(); onEdit?.(); }} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Edit
                                </button>
                            )}
                            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-2">
                                <Printer className="w-4 h-4" /> Print Details
                            </button>
                            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-2">
                                <Share2 className="w-4 h-4" /> Share Location
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={onClose} className="px-5 py-2 text-slate-600 font-bold text-sm hover:text-slate-900 transition-colors">Dismiss</button>
                            <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-lg hover:bg-slate-800 transition-transform active:scale-95">Done</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};
