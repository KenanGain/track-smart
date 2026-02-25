import { useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { ShieldAlert, AlertTriangle, Save, ClipboardCheck, Gauge } from 'lucide-react';

export function InspectionsSettingsPage() {
    const { csaThresholds, setCsaThresholds, cvorThresholds, setCvorThresholds } = useAppData();

    const [localCsa, setLocalCsa] = useState(csaThresholds);
    const [localCvor, setLocalCvor] = useState(cvorThresholds);
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setCsaThresholds(localCsa);
        setCvorThresholds(localCvor);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="p-8 max-w-4xl mx-auto min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <ClipboardCheck className="w-8 h-8 text-blue-600" />
                    Inspections Settings
                </h1>
                <p className="text-slate-600 mt-2">
                    Configure thresholds for CSA and CVOR analysis. These thresholds determine when indicators will show as warnings or critical alerts on the Inspections dashboard.
                </p>
            </div>

            <div className="space-y-8">
                {/* CVOR Thresholds */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            CVOR Thresholds
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Set the percentage thresholds for Commercial Vehicle Operator's Registration (CVOR) actions.</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block">Warning Letter Issued (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={localCvor.warning}
                                    onChange={(e) => setLocalCvor({...localCvor, warning: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block">Intervention / Audit (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={localCvor.intervention}
                                    onChange={(e) => setLocalCvor({...localCvor, intervention: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block">Show Cause Hearing (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={localCvor.showCause}
                                    onChange={(e) => setLocalCvor({...localCvor, showCause: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block">Seizure & Cancellation (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={localCvor.seizure}
                                    onChange={(e) => setLocalCvor({...localCvor, seizure: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CVOR Rating Criteria */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Gauge className="w-5 h-5 text-slate-600" />
                            CVOR Rating Criteria
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Ontario MTO CVOR rating system. Carriers are assigned a rating based on audit results, violation rates, and operational history.</p>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Excellent', color: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-800', dotColor: 'bg-emerald-500',
                                  criteria: ['Min 24 months operation', 'Audit score ≥ 80% overall', 'Profile scores ≥ 70%', 'Violation rate ≤ 15%', 'Collision rate ≤ 10%'] },
                                { label: 'Satisfactory', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-800', dotColor: 'bg-blue-500',
                                  criteria: ['Min 6 months operation', 'Audit score ≥ 55% overall', 'Profile scores ≥ 50%', 'Violation rate < 70%', 'Downgrade at 20% / 15%'] },
                                { label: 'Satisfactory Unaudited', color: 'bg-sky-50 border-sky-200', textColor: 'text-sky-800', dotColor: 'bg-sky-500',
                                  criteria: ['No audit activity', 'Violation rate < 70%', 'Default rating for new carriers'] },
                                { label: 'Conditional', color: 'bg-amber-50 border-amber-200', textColor: 'text-amber-800', dotColor: 'bg-amber-500',
                                  criteria: ['Failed audit (< 55%)', 'Profile scores < 50%', 'OR violation rate ≥ 70%', 'Upgrade after 6 mo at ≤ 60%'] },
                                { label: 'Unsatisfactory', color: 'bg-red-50 border-red-200', textColor: 'text-red-800', dotColor: 'bg-red-500',
                                  criteria: ['100% violation rate', 'Plate seizure', 'Sanction / cancellation', 'Immediate action required'] },
                            ].map((tier, idx) => (
                                <div key={idx} className={`rounded-lg border p-3 ${tier.color}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${tier.dotColor}`}></div>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${tier.textColor}`}>{tier.label}</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {tier.criteria.map((c, ci) => (
                                            <li key={ci} className="text-[11px] text-slate-600 leading-relaxed flex items-start gap-1.5">
                                                <span className="text-slate-400 mt-0.5 flex-shrink-0">•</span>
                                                {c}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CSA Thresholds */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-emerald-500" />
                            CSA BASIC Thresholds
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Set the percentile thresholds for Compliance, Safety, Accountability (CSA) categories.</p>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block">Warning Percentile (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={localCsa.warning}
                                    onChange={(e) => setLocalCsa({...localCsa, warning: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                            </div>
                            <p className="text-xs text-slate-400">Scores at or above this percent will show as an early warning (yellow/amber).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 block">Critical Percentile (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    className="w-full border border-slate-300 rounded-lg pl-4 pr-8 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={localCsa.critical}
                                    onChange={(e) => setLocalCsa({...localCsa, critical: Number(e.target.value)})}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">%</span>
                            </div>
                            <p className="text-xs text-slate-400">Scores at or above this percent will show as an alert/critical (red).</p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-4 mt-6">
                    {saved && <span className="text-emerald-600 font-medium text-sm animate-in fade-in">Settings saved successfully!</span>}
                    <button 
                        onClick={handleSave}
                        className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        Save Thresholds
                    </button>
                </div>
            </div>
        </div>
    );
}

export default InspectionsSettingsPage;
