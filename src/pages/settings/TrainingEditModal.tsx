import { Bell, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import type { DeliveryMode, RenewalRecurrence, TrainingType } from "@/types/training.types";

interface TrainingEditModalProps {
    isOpen: boolean;
    training: TrainingType | null;
    categories: string[];
    onClose: () => void;
    onSave: () => void;
    onChange: (training: TrainingType) => void;
}

const DELIVERY_MODE_OPTIONS: Array<{ value: DeliveryMode; label: string }> = [
    { value: "in_person", label: "In-Person" },
    { value: "online", label: "Online" },
    { value: "video", label: "Video" },
    { value: "document_ack", label: "Doc Ack" },
    { value: "ride_along", label: "Ride Along" },
    { value: "simulation", label: "Simulation" }
];

const RECURRENCE_OPTIONS: Array<{ value: RenewalRecurrence; label: string }> = [
    { value: "one_time", label: "One-Time" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "semi_annual", label: "Semi-Annual" },
    { value: "annual", label: "Annually (Every 1 Year)" },
    { value: "biennial", label: "Biennial (Every 2 Years)" }
];

const DUE_DAYS_OPTIONS = [7, 14, 30, 45, 60, 90, 180, 365];
const REMINDER_OPTIONS = [90, 60, 30, 7, 3, 1];

const buildProjectedNotificationText = (
    monitorBasedOn: "expiry_date" | "issue_date",
    reminderDays: number[]
) => {
    const basedOnLabel = monitorBasedOn === "expiry_date" ? "Expiry Date" : "Issue Date";
    if (reminderDays.length === 0) {
        return `Monitor ${basedOnLabel}. No reminders configured.`;
    }

    const sortedDays = [...reminderDays].sort((a, b) => b - a);
    return `Monitor ${basedOnLabel}. Reminders at ${sortedDays.map(day => `${day} day${day > 1 ? "s" : ""}`).join(", ")} before.`;
};

export const TrainingEditModal = ({
    isOpen,
    training,
    categories,
    onClose,
    onSave,
    onChange
}: TrainingEditModalProps) => {
    if (!isOpen || !training) {
        return null;
    }

    const toggleDeliveryMode = (mode: DeliveryMode, checked: boolean) => {
        const nextModes = checked
            ? [...new Set([...training.defaultDeliveryModes, mode])]
            : training.defaultDeliveryModes.filter(item => item !== mode);

        onChange({
            ...training,
            defaultDeliveryModes: nextModes
        });
    };

    const toggleReminderDay = (day: number, checked: boolean) => {
        const reminders = checked
            ? [...new Set([...training.monitoringNotifications.notificationRemindersDaysBefore, day])]
            : training.monitoringNotifications.notificationRemindersDaysBefore.filter(item => item !== day);

        onChange({
            ...training,
            monitoringNotifications: {
                ...training.monitoringNotifications,
                notificationRemindersDaysBefore: reminders
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Training Editor</p>
                        <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">Edit Training Type</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700" title="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Basic Configuration */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Training Name</label>
                                <Input
                                    value={training.name}
                                    onChange={(e) => onChange({ ...training, name: e.target.value })}
                                    className="h-10 border-slate-200 focus:ring-blue-500"
                                    placeholder="Enter training name..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category</label>
                                <select
                                    value={training.category}
                                    onChange={(e) => onChange({ ...training, category: e.target.value })}
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                                >
                                    {categories.map(category => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Status, Due Days, and Toggles */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</label>
                                <select
                                    value={training.status}
                                    onChange={(e) => onChange({ ...training, status: e.target.value as TrainingType["status"] })}
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Due Days</label>
                                <select
                                    value={training.defaultDueDays}
                                    onChange={(e) => onChange({ ...training, defaultDueDays: Number(e.target.value) })}
                                    className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    {DUE_DAYS_OPTIONS.map(days => (
                                        <option key={days} value={days}>{days} Days</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-900">Default Mandatory</p>
                                    <p className="text-[9px] text-slate-500">Auto-assign as required</p>
                                </div>
                                <Toggle
                                    checked={training.defaultMandatory}
                                    onCheckedChange={(checked) => onChange({ ...training, defaultMandatory: checked })}
                                    className="data-[state=on]:bg-blue-600 h-5 w-10"
                                />
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-900">Documents Required</p>
                                    <p className="text-[9px] text-slate-500">Requires upload proof</p>
                                </div>
                                <Toggle
                                    checked={training.defaultDocuments.required}
                                    onCheckedChange={(checked) => onChange({
                                        ...training,
                                        defaultDocuments: { ...training.defaultDocuments, required: checked }
                                    })}
                                    className="data-[state=on]:bg-blue-600 h-5 w-10"
                                />
                            </div>
                        </div>

                        {/* Tags and Doc IDs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tags (comma separated)</label>
                                <Input
                                    value={training.tags.join(", ")}
                                    onChange={(e) => onChange({
                                        ...training,
                                        tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean)
                                    })}
                                    className="h-10 border-slate-200"
                                    placeholder="safety, defensive, orientation..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Managed Document Type IDs</label>
                                <Input
                                    value={training.defaultDocuments.documentTypeIds.join(", ")}
                                    onChange={(e) => onChange({
                                        ...training,
                                        defaultDocuments: {
                                            ...training.defaultDocuments,
                                            documentTypeIds: e.target.value.split(",").map(id => id.trim()).filter(Boolean)
                                        }
                                    })}
                                    className="h-10 border-slate-200"
                                    placeholder="training_cert, medical_card..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Delivery Modes */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-amber-500 rounded-full" />
                                <h4 className="text-sm font-bold text-slate-900">Delivery Modes</h4>
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                                {training.defaultDeliveryModes.length} SELECTED
                            </p>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {DELIVERY_MODE_OPTIONS.map(option => (
                                <label key={option.value} className="flex items-center gap-2.5 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={training.defaultDeliveryModes.includes(option.value)}
                                        onChange={(e) => toggleDeliveryMode(option.value, e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                                    />
                                    <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Assessment Configuration */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-1 bg-emerald-500 rounded-full" />
                                <h4 className="text-sm font-bold text-slate-900">Assessment & Testing</h4>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-slate-500">Enabled</span>
                                <Toggle
                                    checked={training.defaultAssessment.enabled}
                                    onCheckedChange={(checked) => onChange({
                                        ...training,
                                        defaultAssessment: {
                                            ...training.defaultAssessment,
                                            enabled: checked
                                        }
                                    })}
                                    className="data-[state=on]:bg-emerald-600 h-5 w-10"
                                />
                            </div>
                        </div>
                        
                        <div className={cn("grid grid-cols-1 md:grid-cols-3 gap-8", !training.defaultAssessment.enabled && "opacity-40 pointer-events-none")}>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Passing Score %</label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={training.defaultAssessment.passingScore ?? ""}
                                        onChange={(e) => onChange({
                                            ...training,
                                            defaultAssessment: {
                                                ...training.defaultAssessment,
                                                passingScore: e.target.value === "" ? null : Number(e.target.value)
                                            }
                                        })}
                                        className="h-10 pr-8"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Max Attempts</label>
                                <Input
                                    type="number"
                                    min={1}
                                    placeholder="Unlimited"
                                    value={training.defaultAssessment.maxAttempts ?? ""}
                                    onChange={(e) => onChange({
                                        ...training,
                                        defaultAssessment: {
                                            ...training.defaultAssessment,
                                            maxAttempts: e.target.value === "" ? null : Number(e.target.value)
                                        }
                                    })}
                                    className="h-10"
                                />
                            </div>
                            <div className="flex items-center mt-6">
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">
                                    * Learners will need to re-attempt the entire module if they fail to reach the passing score.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Monitoring & Notifications Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-purple-600 rounded-full"></div>
                                <h2 className="text-sm font-bold text-slate-900">Monitoring & Notifications</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium text-slate-600">
                                    {training.monitoringNotifications.enabled ? "Enabled" : "Disabled"}
                                </span>
                                <Toggle
                                    checked={training.monitoringNotifications.enabled}
                                    onCheckedChange={(checked) => onChange({
                                        ...training,
                                        monitoringNotifications: {
                                            ...training.monitoringNotifications,
                                            enabled: checked
                                        }
                                    })}
                                    className="data-[state=on]:bg-purple-600 h-5 w-10"
                                />
                            </div>
                        </div>

                        {training.monitoringNotifications.enabled && (
                            <div className="pt-6 border-t border-slate-100 space-y-5 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Left Column */}
                                    <div className="space-y-5">
                                        <div className="space-y-2.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Monitor Based On</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="monitorBasedOn"
                                                        checked={training.monitoringNotifications.monitorBasedOn === "expiry_date"}
                                                        onChange={() => onChange({
                                                            ...training,
                                                            monitoringNotifications: {
                                                                ...training.monitoringNotifications,
                                                                monitorBasedOn: "expiry_date"
                                                            }
                                                        })}
                                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 accent-purple-600"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">Expiry Date</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="monitorBasedOn"
                                                        checked={training.monitoringNotifications.monitorBasedOn === "issue_date"}
                                                        onChange={() => onChange({
                                                            ...training,
                                                            monitoringNotifications: {
                                                                ...training.monitoringNotifications,
                                                                monitorBasedOn: "issue_date"
                                                            }
                                                        })}
                                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 accent-purple-600"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">Issue Date</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-2.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Renewal Recurrence</label>
                                            <select
                                                value={training.monitoringNotifications.renewalRecurrence}
                                                onChange={(e) => onChange({
                                                    ...training,
                                                    monitoringNotifications: {
                                                        ...training.monitoringNotifications,
                                                        renewalRecurrence: e.target.value as RenewalRecurrence
                                                    }
                                                })}
                                                className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                            >
                                                {RECURRENCE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-5">
                                        <div className="space-y-2.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notification Reminders</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {REMINDER_OPTIONS.map((days) => (
                                                    <label key={days} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={training.monitoringNotifications.notificationRemindersDaysBefore.includes(days)}
                                                            onChange={(e) => toggleReminderDay(days, e.target.checked)}
                                                            className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">{days} Days Before</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2.5">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Notification Channels</label>
                                            <div className="flex gap-6">
                                                {['email', 'inApp', 'sms'].map((channel) => (
                                                    <label key={channel} className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={training.monitoringNotifications.notificationChannels[channel as keyof typeof training.monitoringNotifications.notificationChannels]}
                                                            onChange={(e) => onChange({
                                                                ...training,
                                                                monitoringNotifications: {
                                                                    ...training.monitoringNotifications,
                                                                    notificationChannels: {
                                                                        ...training.monitoringNotifications.notificationChannels,
                                                                        [channel]: e.target.checked
                                                                    }
                                                                }
                                                            })}
                                                            className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600"
                                                        />
                                                        <span className="text-sm font-medium text-slate-700 capitalize">{channel === 'inApp' ? 'In-App' : channel}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 flex gap-3">
                                    <div className="p-2 bg-blue-500 rounded-lg h-fit">
                                        <Bell className="h-4 w-4 text-white shrink-0" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Projected Notification Schedule</h4>
                                        <p className="text-sm font-medium text-blue-700 mt-1 leading-relaxed">
                                            {buildProjectedNotificationText(
                                                training.monitoringNotifications.monitorBasedOn,
                                                training.monitoringNotifications.notificationRemindersDaysBefore
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose} className="border-slate-300 text-slate-600 font-bold px-6">
                        Cancel
                    </Button>
                    <Button onClick={onSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-md">
                        <Save className="w-4 h-4 mr-2" />
                        Save Training
                    </Button>
                </div>
            </div>
        </div>
    );
};
