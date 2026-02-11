import { useState } from "react";
import { GraduationCap, Search, Plus, Eye, Edit, Check, X, Clock, FileText, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TRAINING_TYPES, TRAINING_CATEGORIES } from "@/data/training.data";
import type { TrainingType } from "@/types/training.types";
import { TrainingEditModal } from "./TrainingEditModal";
import { cn } from "@/lib/utils";

// Helper Components
const StatusBadge = ({ status }: { status: 'active' | 'inactive' }) => {
    if (status === 'active') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Active
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-semibold uppercase tracking-wider">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Inactive
        </span>
    );
};

const MandatoryBadge = ({ mandatory }: { mandatory: boolean }) => {
    if (mandatory) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider">
                Required
            </span>
        );
    }
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-medium uppercase tracking-wider">
            Optional
        </span>
    );
};

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

const TrainingsPage = () => {
    const [trainings, setTrainings] = useState<TrainingType[]>(TRAINING_TYPES);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTraining, setSelectedTraining] = useState<TrainingType | null>(null);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editForm, setEditForm] = useState<TrainingType | null>(null);

    // Filter trainings
    const getVisibleTrainings = () => {
        let filtered = trainings;

        // Filter by category
        if (activeTab !== "all") {
            filtered = filtered.filter(t => t.category === activeTab);
        }

        // Filter by search
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return filtered;
    };

    const visibleTrainings = getVisibleTrainings();

    const handleView = (training: TrainingType) => {
        setSelectedTraining(training);
        setIsViewDialogOpen(true);
    };

    const handleEdit = (training: TrainingType) => {
        setEditForm(structuredClone(training));
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editForm) {
            return;
        }

        const normalizedReminders = [...editForm.monitoringNotifications.notificationRemindersDaysBefore]
            .sort((a, b) => b - a);

        const updatedTraining: TrainingType = {
            ...editForm,
            tags: editForm.tags.filter(tag => tag.trim().length > 0),
            defaultDocuments: {
                ...editForm.defaultDocuments,
                documentTypeIds: editForm.defaultDocuments.documentTypeIds.filter(id => id.trim().length > 0)
            },
            monitoringNotifications: {
                ...editForm.monitoringNotifications,
                notificationRemindersDaysBefore: normalizedReminders,
                projectedNotificationScheduleText: buildProjectedNotificationText(
                    editForm.monitoringNotifications.monitorBasedOn,
                    normalizedReminders
                )
            }
        };

        setTrainings(prev => prev.map(training => training.id === updatedTraining.id ? updatedTraining : training));
        setSelectedTraining(prev => prev?.id === updatedTraining.id ? updatedTraining : prev);
        setEditForm(null);
        setIsEditDialogOpen(false);
    };

    const formatDeliveryModes = (modes: string[]) => {
        const labels: Record<string, string> = {
            in_person: "In-Person",
            online: "Online",
            video: "Video",
            document_ack: "Doc Ack",
            ride_along: "Ride Along",
            simulation: "Simulation"
        };
        return modes.map(m => labels[m] || m).join(", ");
    };

    const formatRecurrence = (recurrence: string) => {
        const labels: Record<string, string> = {
            one_time: "One-Time",
            weekly: "Weekly",
            monthly: "Monthly",
            quarterly: "Quarterly",
            semi_annual: "Semi-Annual",
            annual: "Annual",
            biennial: "Biennial"
        };
        return labels[recurrence] || recurrence;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="px-8 py-6 max-w-[1600px] mx-auto w-full">

                {/* Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <nav className="flex text-sm text-slate-500 mb-1 font-medium items-center gap-2">
                            <span>Settings</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900">Training Types</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
                            Training Management
                        </h1>
                        <p className="text-slate-600 max-w-3xl text-sm">
                            Configure training requirements, delivery methods, assessments, and monitoring for driver development programs.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 px-4 text-xs font-semibold uppercase tracking-wide">
                            <Plus className="h-3.5 w-3.5 mr-2" />
                            Add Training Type
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Training Types</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{trainings.length}</p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <GraduationCap className="w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Mandatory</p>
                                <p className="text-2xl font-bold text-rose-600 mt-1">{trainings.filter(t => t.defaultMandatory).length}</p>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-lg">
                                <Check className="w-5 h-5 text-rose-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">With Assessment</p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">{trainings.filter(t => t.defaultAssessment.enabled).length}</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <FileText className="w-5 h-5 text-amber-600" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Monitored</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">{trainings.filter(t => t.monitoringNotifications.enabled).length}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <Bell className="w-5 h-5 text-emerald-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Search Bar */}
                <div className="flex flex-col space-y-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200">
                        {/* Tabs */}
                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar -mb-px">
                            <button
                                onClick={() => setActiveTab("all")}
                                className={cn(
                                    "pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-1",
                                    activeTab === "all"
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                )}
                            >
                                All Training Types
                            </button>
                            {TRAINING_CATEGORIES.map(category => (
                                <button
                                    key={category}
                                    onClick={() => setActiveTab(category)}
                                    className={cn(
                                        "pb-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap px-1",
                                        activeTab === category
                                            ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                                placeholder="Search trainings..."
                                className="pl-8 h-8 bg-white border-slate-200 text-xs"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="text-xs text-slate-400 font-medium">
                            {visibleTrainings.length} Training Types Found
                        </div>
                    </div>
                </div>

                {/* Trainings List Table */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-4 py-2 w-[30%]">Training Name</th>
                                    {activeTab === "all" && (
                                        <th className="px-4 py-2 w-[18%]">Category</th>
                                    )}
                                    <th className="px-4 py-2 text-center w-[8%]">Status</th>
                                    <th className="px-4 py-2 text-center w-[8%]">Required</th>
                                    <th className="px-4 py-2 text-center w-[8%]">Due Days</th>
                                    <th className="px-4 py-2 w-[15%]">Configuration</th>
                                    <th className="px-4 py-2 text-right w-[100px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleTrainings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            <p className="font-medium text-sm">No training types found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    visibleTrainings.map((training) => (
                                        <tr key={training.id} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 text-sm" title={training.name}>
                                                        {training.name}
                                                    </span>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        {training.tags.slice(0, 2).map(tag => (
                                                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                        {training.tags.length > 2 && (
                                                            <span className="text-[10px] text-slate-400">+{training.tags.length - 2}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            {activeTab === "all" && (
                                                <td className="px-4 py-3 align-middle">
                                                    <span className="text-xs text-slate-600 block max-w-[150px]" title={training.category}>
                                                        {training.category}
                                                    </span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 align-middle text-center">
                                                <div className="flex justify-center">
                                                    <StatusBadge status={training.status} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center">
                                                <div className="flex justify-center">
                                                    <MandatoryBadge mandatory={training.defaultMandatory} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-center">
                                                <div className="flex items-center justify-center gap-1 text-slate-700">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className="font-semibold text-sm">{training.defaultDueDays}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle">
                                                <div className="space-y-1">
                                                    {training.defaultAssessment.enabled && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                            <Check size={12} className="text-emerald-600" />
                                                            <span>Assessment: {training.defaultAssessment.passingScore}%</span>
                                                        </div>
                                                    )}
                                                    {training.monitoringNotifications.enabled && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                            <Bell size={12} className="text-blue-600" />
                                                            <span>Monitored ({formatRecurrence(training.monitoringNotifications.renewalRecurrence)})</span>
                                                        </div>
                                                    )}
                                                    {training.defaultDocuments.required && (
                                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                            <FileText size={12} className="text-amber-600" />
                                                            <span>Docs Required</span>
                                                        </div>
                                                    )}
                                                    {!training.defaultAssessment.enabled && !training.monitoringNotifications.enabled && !training.defaultDocuments.required && (
                                                        <span className="text-slate-400 text-xs">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleView(training)}
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEdit(training)}
                                                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
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

            {/* View Dialog */}
            {isViewDialogOpen && selectedTraining && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIsViewDialogOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="p-8 pb-6 bg-white border-b border-slate-100">
                            <div className="flex items-center gap-2 mb-4 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                                <GraduationCap className="w-4 h-4 text-blue-600" />
                                Training Details
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 leading-tight">
                                {selectedTraining.name}
                            </h2>
                            <p className="text-slate-500 mt-2 text-base">
                                {selectedTraining.category}
                            </p>
                            <div className="flex items-center gap-2 mt-4">
                                <StatusBadge status={selectedTraining.status} />
                                <MandatoryBadge mandatory={selectedTraining.defaultMandatory} />
                            </div>
                        </div>

                        {/* Metrics Cards */}
                        <div className="grid grid-cols-3 gap-4 px-8 my-6">
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Due Days</span>
                                <span className="text-2xl font-bold text-slate-900">{selectedTraining.defaultDueDays}</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Delivery Modes</span>
                                <span className="text-xs font-medium text-slate-700 text-center">{selectedTraining.defaultDeliveryModes.length} Options</span>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-[10px] uppercase text-slate-400 font-bold mb-2 tracking-widest">Assessment</span>
                                {selectedTraining.defaultAssessment.enabled ? (
                                    <span className="text-2xl font-bold text-emerald-600">{selectedTraining.defaultAssessment.passingScore}%</span>
                                ) : (
                                    <X className="w-6 h-6 text-slate-300" />
                                )}
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="px-8 pb-8 space-y-6">
                            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Delivery Methods</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTraining.defaultDeliveryModes.map(mode => (
                                        <span key={mode} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-200">
                                            {formatDeliveryModes([mode])}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {selectedTraining.monitoringNotifications.enabled && (
                                <div className="bg-blue-50/80 rounded-2xl p-6 border border-blue-100">
                                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Bell className="w-3.5 h-3.5" />
                                        Monitoring & Notifications
                                    </h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Recurrence:</span>
                                            <span className="font-semibold text-slate-900">{formatRecurrence(selectedTraining.monitoringNotifications.renewalRecurrence)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Based On:</span>
                                            <span className="font-semibold text-slate-900 capitalize">{selectedTraining.monitoringNotifications.monitorBasedOn.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Reminders:</span>
                                            <span className="font-semibold text-slate-900">{selectedTraining.monitoringNotifications.notificationRemindersDaysBefore.join(', ')} days before</span>
                                        </div>
                                        <div className="pt-2 border-t border-blue-100">
                                            <p className="text-xs text-blue-700 italic">{selectedTraining.monitoringNotifications.projectedNotificationScheduleText}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedTraining.defaultAssessment.enabled && (
                                <div className="bg-emerald-50/80 rounded-2xl p-6 border border-emerald-100">
                                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">Assessment Configuration</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Passing Score:</span>
                                            <span className="font-bold text-emerald-700">{selectedTraining.defaultAssessment.passingScore}%</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Max Attempts:</span>
                                            <span className="font-semibold text-slate-900">{selectedTraining.defaultAssessment.maxAttempts || 'Unlimited'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tags</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTraining.tags.map(tag => (
                                        <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-6 flex justify-end border-t border-slate-100 pt-4">
                            <Button onClick={() => setIsViewDialogOpen(false)} variant="outline" className="min-w-[100px] border-slate-200 text-slate-600">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <TrainingEditModal
                isOpen={isEditDialogOpen}
                training={editForm}
                categories={TRAINING_CATEGORIES}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setEditForm(null);
                }}
                onChange={(training) => setEditForm(training)}
                onSave={handleSaveEdit}
            />
        </div>
    );
};

export default TrainingsPage;
