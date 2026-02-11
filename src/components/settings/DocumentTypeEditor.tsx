import React, { useState, useEffect, useMemo } from 'react';
import {
    Truck,
    User,
    Building2,
    Bell,
    ArrowLeft,
    Save,
    Info,
    Search,
    Tag as TagIcon,
    Check,
    X,
    FolderPlus,
    AlertTriangle
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import {
    type DocumentType,
    type Status,
    type RelatedTo,
    type SelectedTag,
    MOCK_DRIVERS
} from '@/data/mock-app-data';
import { INITIAL_EXPENSE_TYPES } from '@/pages/settings/expenses.data';
import { TagSelectionModal } from '@/pages/settings/tags/TagComponents';
import { THEME_STYLES } from '@/pages/settings/tags/tag-utils';
import { FolderTreeSelect } from './FolderTreeSelect';

// Shared UI wrappers
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        {children}
    </div>
);

const Label = ({ children, className = '', required = false }: { children: React.ReactNode; className?: string; required?: boolean }) => (
    <label className={`block text-sm font-medium text-slate-700 mb-1.5 ${className}`}>
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
    </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
    />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        className={`flex min-h-[80px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
    />
);

export const Button = ({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        outline: "border border-slate-300 bg-white hover:bg-slate-100 text-slate-700",
        ghost: "hover:bg-slate-100 text-slate-700"
    };
    return (
        <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Switch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (c: boolean) => void }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-blue-600' : 'bg-slate-200'
            }`}
    >
        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

const Checkbox = ({ checked, onCheckedChange, label }: { checked: boolean; onCheckedChange: (c: boolean) => void; label: string }) => (
    <div className="flex items-center space-x-2">
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={`peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white'
                }`}
        >
            {checked && <Check className="h-3 w-3 mx-auto" />}
        </button>
        <label onClick={() => onCheckedChange(!checked)} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-slate-700">
            {label}
        </label>
    </div>
);

const RadioCard = ({
    selected,
    onClick,
    icon: Icon,
    label
}: {
    selected: boolean;
    onClick: () => void;
    icon: any;
    label: string
}) => (
    <div
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 w-full aspect-[4/3] sm:aspect-auto sm:h-32 ${selected
            ? 'border-blue-600 bg-blue-50/50'
            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
    >
        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border flex items-center justify-center ${selected ? 'border-blue-600' : 'border-slate-300'
            }`}>
            {selected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
        </div>
        <div className={`p-3 rounded-full mb-3 ${selected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
            <Icon className="w-6 h-6" />
        </div>
        <span className={`font-semibold text-sm ${selected ? 'text-blue-900' : 'text-slate-700'}`}>{label}</span>
    </div>
);

export interface DocumentTypeEditorProps {
    initialData?: DocumentType | null;
    onSave: (data: Partial<DocumentType>) => void;
    onCancel: () => void;
    defaultRelatedTo?: RelatedTo;
    showHeader?: boolean;
}

export const DocumentTypeEditor: React.FC<DocumentTypeEditorProps> = ({ initialData, onSave, onCancel, defaultRelatedTo, showHeader = true }) => {
    // Form State
    const [docName, setDocName] = useState(initialData?.name || '');
    const [relatedTo, setRelatedTo] = useState<RelatedTo>(initialData?.relatedTo || defaultRelatedTo || 'carrier');
    const [description, setDescription] = useState(initialData?.description || '');
    // Replace docRequired with requirementLevel
    const [requirementLevel, setRequirementLevel] = useState<'required' | 'optional' | 'not_required'>(initialData?.requirementLevel || 'required');

    // Destination
    const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialData?.destination?.folderId || null);
    const [selectedFolderName, setSelectedFolderName] = useState<string>(initialData?.destination?.folderName || '');
    const [driverMode, setDriverMode] = useState<'name' | 'folder'>('name');
    const [selectedDriver, setSelectedDriver] = useState<string>(initialData?.destination?.driverId || '');

    // Config Rules
    const [expiryRequired, setExpiryRequired] = useState(initialData?.expiryRequired ?? true);
    const [issueDateRequired, setIssueDateRequired] = useState(initialData?.issueDateRequired ?? false);
    const [issueStateRequired, setIssueStateRequired] = useState(initialData?.issueStateRequired ?? false);
    const [issueCountryRequired, setIssueCountryRequired] = useState(initialData?.issueCountryRequired ?? false);
    const [status, setStatus] = useState<string>(initialData?.status || 'Active');

    // Tags
    const [selectedTags, setSelectedTags] = useState<Record<string, SelectedTag[]>>(initialData?.selectedTags || {});
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);

    // Monitoring
    const [monitorEnabled, setMonitorEnabled] = useState(initialData?.monitoring?.enabled ?? true);
    const [monitorBasedOn, setMonitorBasedOn] = useState(initialData?.monitoring?.basedOn || 'Expiry Date');
    const [recurrence, setRecurrence] = useState(initialData?.monitoring?.recurrence || 'Annually');
    const [reminders, setReminders] = useState(initialData?.monitoring?.reminders || { d90: true, d60: true, d30: true, d7: false });
    const [channels, setChannels] = useState(initialData?.monitoring?.channels || { email: true, inapp: true, sms: false });

    // Add Folder Modal
    const [isAddFolderModalOpen, setIsAddFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // Update internal state if initialData changes
    useEffect(() => {
        if (initialData) {
            setDocName(initialData.name);
            setRelatedTo(initialData.relatedTo);
            setDescription(initialData.description || '');
            setRequirementLevel(initialData.requirementLevel || 'required');
            setSelectedFolderId(initialData.destination?.folderId || null);
            setSelectedFolderName(initialData.destination?.folderName || '');
            setSelectedDriver(initialData.destination?.driverId || '');
            setExpiryRequired(initialData.expiryRequired);
            setIssueDateRequired(initialData.issueDateRequired);
            setIssueStateRequired(initialData.issueStateRequired ?? false);
            setIssueCountryRequired(initialData.issueCountryRequired ?? false);
            setStatus(initialData.status);
            setSelectedTags(initialData.selectedTags || {});
            if (initialData.monitoring) {
                setMonitorEnabled(initialData.monitoring.enabled);
                setMonitorBasedOn(initialData.monitoring.basedOn);
                setRecurrence(initialData.monitoring.recurrence);
                setReminders(initialData.monitoring.reminders);
                setChannels(initialData.monitoring.channels);
            }
        } else if (defaultRelatedTo) {
            setRelatedTo(defaultRelatedTo);
        }
    }, [initialData, defaultRelatedTo]);

    const { folderTree, tagSections, addTagToSection, addFolder } = useAppData();

    // Expense Type Inheritance Logic
    const controllingExpenseType = useMemo(() => {
        if (!initialData?.id) return undefined;
        return INITIAL_EXPENSE_TYPES.find(et => et.documentTypeId === initialData.id);
    }, [initialData?.id]);

    const isLockedByExpenseType = !!controllingExpenseType;

    // Sync state with Expense Type if locked
    useEffect(() => {
        if (controllingExpenseType) {
            setRequirementLevel('required');
            setMonitorEnabled(false);
            setExpiryRequired(false);
            setIssueStateRequired(false);
            setIssueCountryRequired(false);
            if (controllingExpenseType.dateRequired) {
                setIssueDateRequired(true);
            }
        }
    }, [controllingExpenseType]);

    // Tag Handlers
    const handleTagToggle = (sectionId: string, tagId: string, multiSelect: boolean) => {
        setSelectedTags(prev => {
            const currentSectionTags = prev[sectionId] || [];
            const exists = currentSectionTags.find(t => t.id === tagId);

            if (exists) {
                // Remove it
                return { ...prev, [sectionId]: currentSectionTags.filter(t => t.id !== tagId) };
            } else {
                // Add it
                const newTag: SelectedTag = { id: tagId, required: true };
                return { ...prev, [sectionId]: multiSelect ? [...currentSectionTags, newTag] : [newTag] };
            }
        });
    };

    const handleSectionSelectAll = (sectionId: string, allTagIds: string[], select: boolean) => {
        setSelectedTags(prev => {
            if (!select) {
                return { ...prev, [sectionId]: [] };
            } else {
                const currentTags = prev[sectionId] || [];
                const currentTagIds = new Set(currentTags.map(t => t.id));
                const newTags = allTagIds.map(id => {
                    if (currentTagIds.has(id)) {
                        return currentTags.find(t => t.id === id)!;
                    }
                    return { id, required: true };
                });
                return { ...prev, [sectionId]: newTags };
            }
        });
    };

    const handleTagRequiredToggle = (sectionId: string, tagId: string) => {
        setSelectedTags(prev => {
            const currentSectionTags = prev[sectionId] || [];
            return {
                ...prev,
                [sectionId]: currentSectionTags.map(t =>
                    t.id === tagId ? { ...t, required: !t.required } : t
                )
            };
        });
    };

    const handleAddCustomTag = (sectionId: string, label: string) => {
        addTagToSection(sectionId, label);
    };

    const handleSave = () => {
        if (!docName) {
            alert("Document Name is required.");
            return;
        }

        const payload: Partial<DocumentType> = {
            name: docName,
            relatedTo,
            description,
            requirementLevel,
            expiryRequired,
            issueDateRequired,
            issueStateRequired,
            issueCountryRequired,
            status: status as Status,
            selectedTags,
            destination: {
                root: "Company Name",
                mode: relatedTo === 'driver' ? driverMode : 'folder',
                folderId: selectedFolderId || undefined,
                folderName: selectedFolderName || undefined,
                driverId: selectedDriver
            },
            monitoring: {
                enabled: monitorEnabled,
                basedOn: monitorBasedOn,
                recurrence,
                reminders,
                channels
            }
        };
        onSave(payload);
    };

    const getFilteredTree = () => {
        const root = JSON.parse(JSON.stringify(folderTree));
        if (relatedTo === 'carrier') {
            root.children = root.children?.filter((c: any) => c.id === 'carrier_root');
        } else if (relatedTo === 'asset') {
            root.children = root.children?.filter((c: any) => c.id === 'assets_root');
        } else if (relatedTo === 'driver') {
            root.children = root.children?.filter((c: any) => c.id === 'driver_root');
        }
        return [root];
    };

    const notificationLogicText = useMemo(() => {
        const activeReminders = [];
        if (reminders.d90) activeReminders.push("90 days");
        if (reminders.d60) activeReminders.push("60 days");
        if (reminders.d30) activeReminders.push("30 days");
        if (reminders.d7) activeReminders.push("7 days");
        return `Monitor ${monitorBasedOn}. Reminders at ${activeReminders.join(', ') || 'None'} before.`;
    }, [reminders, monitorBasedOn]);

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            {showHeader && (
                <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={onCancel} className="text-slate-500 hover:text-slate-900 w-10 p-0">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">{initialData ? 'Edit Document Type' : 'Create Document Type'}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={onCancel}>Cancel</Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Save className="w-4 h-4" /> Save Document Type
                        </Button>
                    </div>
                </div>
            )}

            {/* Locked Warning */}
            {isLockedByExpenseType && (
                <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-3 text-amber-800 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p>
                        This document is managed by the "{controllingExpenseType.name}" expense type. Some settings are locked.
                    </p>
                </div>
            )}

            {/* Scrollable Form Content */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6 pb-20">

                    {/* 1. Basic Info */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-6 bg-blue-600 rounded-full" />
                            <h2 className="text-lg font-semibold text-slate-800">Basic Information</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <Label required>Document Name</Label>
                                <Input value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g. Liability Insurance" />
                            </div>
                            <div>
                                <Label required>Related To</Label>
                                {defaultRelatedTo ? (
                                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                                        {relatedTo === 'carrier' && <Building2 className="w-6 h-6 text-slate-500" />}
                                        {relatedTo === 'asset' && <Truck className="w-6 h-6 text-slate-500" />}
                                        {relatedTo === 'driver' && <User className="w-6 h-6 text-slate-500" />}
                                        <span className="font-semibold text-sm text-slate-700 capitalize">{relatedTo}</span>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                        <RadioCard selected={relatedTo === 'carrier'} onClick={() => setRelatedTo('carrier')} icon={Building2} label="Carrier" />
                                        <RadioCard selected={relatedTo === 'asset'} onClick={() => setRelatedTo('asset')} icon={Truck} label="Asset" />
                                        <RadioCard selected={relatedTo === 'driver'} onClick={() => setRelatedTo('driver')} icon={User} label="Driver" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <Label>Short Description</Label>
                                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="resize-none" />
                            </div>
                        </div>
                    </Card>

                    {/* 2. TAGS & CLASSIFICATION */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <TagIcon className="w-5 h-5 text-slate-500" />
                                <h3 className="text-lg font-semibold text-slate-800">Classification & Tags</h3>
                            </div>
                            <Button variant="outline" onClick={() => setIsTagModalOpen(true)} className="text-blue-600 border-blue-200 hover:border-blue-300 hover:bg-blue-50">
                                Manage Tags
                            </Button>
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 min-h-[80px]">
                            {Object.keys(selectedTags).length === 0 ? (
                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                    <Info className="w-4 h-4" /> No tags selected. Click "Manage Tags" to categorize this document.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {tagSections.map(section => {
                                        const tags = section.tags.filter(t => selectedTags[section.id]?.some(st => st.id === t.id));
                                        if (tags.length === 0) return null;

                                        const theme = THEME_STYLES[section.colorTheme] || THEME_STYLES.blue;

                                        return (
                                            <div key={section.id} className="flex items-start gap-3">
                                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider w-24 pt-1">{section.title}:</span>
                                                <div className="flex flex-wrap gap-2 flex-1">
                                                    {tags.map(t => {
                                                        const selection = selectedTags[section.id]?.find(st => st.id === t.id);
                                                        const isRequired = selection?.required;
                                                        return (
                                                            <span
                                                                key={t.id}
                                                                className={`inline-flex items-center rounded-full text-xs font-medium ${theme.badgeBg} ${theme.badgeText} pl-2.5 pr-1 py-0.5 border border-transparent cursor-pointer select-none transition-all hover:ring-2 ring-offset-1 ${theme.ring}`}
                                                                onClick={() => handleTagRequiredToggle(section.id, t.id)}
                                                                title="Click to toggle requirement"
                                                            >
                                                                {t.label}
                                                                {isRequired ? (
                                                                    <span className="ml-2 bg-white/40 px-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Req</span>
                                                                ) : (
                                                                    <span className="ml-2 bg-black/10 text-current/70 px-1.5 rounded-full text-[10px] uppercase tracking-wide">Opt</span>
                                                                )}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* 3. Config (Requirement Level) */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <h2 className="text-lg font-semibold text-slate-800">Configuration Rules</h2>
                        </div>
                        <div className="space-y-6">
                            {/* Requirement Level Radio Group */}
                            <div>
                                <Label>Document Requirement</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                    <div
                                        onClick={() => !isLockedByExpenseType && setRequirementLevel('required')}
                                        className={`cursor-pointer rounded-lg border p-4 flex flex-col gap-2 transition-all ${requirementLevel === 'required' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'} ${isLockedByExpenseType && requirementLevel !== 'required' ? 'opacity-50 cursor-not-allowed' : ''} ${isLockedByExpenseType ? 'cursor-default' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-semibold text-sm ${requirementLevel === 'required' ? 'text-blue-900' : 'text-slate-900'}`}>Required</span>
                                            {requirementLevel === 'required' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                        </div>
                                        <p className="text-xs text-slate-500">Document must be uploaded and valid.</p>
                                    </div>
                                    <div
                                        onClick={() => !isLockedByExpenseType && setRequirementLevel('optional')}
                                        className={`cursor-pointer rounded-lg border p-4 flex flex-col gap-2 transition-all ${requirementLevel === 'optional' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'} ${isLockedByExpenseType ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-semibold text-sm ${requirementLevel === 'optional' ? 'text-blue-900' : 'text-slate-900'}`}>Optional</span>
                                            {requirementLevel === 'optional' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                        </div>
                                        <p className="text-xs text-slate-500">Document can be uploaded but is not mandatory.</p>
                                    </div>
                                    <div
                                        onClick={() => !isLockedByExpenseType && setRequirementLevel('not_required')}
                                        className={`cursor-pointer rounded-lg border p-4 flex flex-col gap-2 transition-all ${requirementLevel === 'not_required' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:bg-slate-50'} ${isLockedByExpenseType ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`font-semibold text-sm ${requirementLevel === 'not_required' ? 'text-blue-900' : 'text-slate-900'}`}>Not Required</span>
                                            {requirementLevel === 'not_required' && <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                                        </div>
                                        <p className="text-xs text-slate-500">No document upload is expected.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 ${isLockedByExpenseType ? 'opacity-60 grayscale' : ''}`}>
                                    <span className="text-sm font-medium text-slate-700">Expiry Date Input</span>
                                    <Switch checked={expiryRequired} onCheckedChange={!isLockedByExpenseType ? setExpiryRequired : () => {}} />
                                </div>
                                <div className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 ${isLockedByExpenseType && controllingExpenseType!.dateRequired ? 'opacity-80' : ''}`}>
                                    <div>
                                        <span className="text-sm font-medium text-slate-700">Issue Date Input</span>
                                        {isLockedByExpenseType && controllingExpenseType!.dateRequired && <p className="text-xs text-blue-600">Required by Expense Type</p>}
                                    </div>
                                    {isLockedByExpenseType && controllingExpenseType!.dateRequired ? (
                                        <span className="text-xs font-bold text-blue-700">Required</span>
                                    ) : (
                                        <Switch checked={issueDateRequired} onCheckedChange={setIssueDateRequired} />
                                    )}
                                </div>
                                <div className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-1 sm:col-span-2 ${isLockedByExpenseType ? 'opacity-60 grayscale' : ''}`}>
                                    <div>
                                        <span className="text-sm font-medium text-slate-700 block">Issue State Required?</span>
                                        <span className="text-xs text-slate-500">Requires selection of issuing state/province</span>
                                    </div>
                                    <Switch checked={issueStateRequired} onCheckedChange={!isLockedByExpenseType ? setIssueStateRequired : () => {}} />
                                </div>
                                <div className={`flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 col-span-1 sm:col-span-2 ${isLockedByExpenseType ? 'opacity-60 grayscale' : ''}`}>
                                    <div>
                                        <span className="text-sm font-medium text-slate-700 block">Issue Country Required?</span>
                                        <span className="text-xs text-slate-500">Requires selection of issuing country</span>
                                    </div>
                                    <Switch checked={issueCountryRequired} onCheckedChange={!isLockedByExpenseType ? setIssueCountryRequired : () => {}} />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 4. Monitoring */}
                    <Card className="p-6 relative overflow-hidden">
                        {isLockedByExpenseType && (
                             <div className="absolute top-0 left-0 right-0 bg-blue-50 border-b border-blue-100 px-6 py-2 flex items-center justify-between z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                        <Info className="w-3 h-3 text-blue-600" />
                                    </div>
                                    <p className="text-xs font-semibold text-blue-700">
                                        Configuration managed by Expense Type: <span className="underline">{controllingExpenseType!.name}</span>
                                    </p>
                                </div>
                                <span className="text-[10px] text-blue-500 font-medium bg-white/50 px-2 py-0.5 rounded-full">Read Only</span>
                            </div>
                        )}
                        
                        <div className={`flex items-center justify-between mb-6 ${isLockedByExpenseType ? 'mt-8' : ''}`}>
                            <div className="flex items-center gap-2">
                                <div className={`w-1 h-6 rounded-full ${isLockedByExpenseType ? 'bg-blue-600' : 'bg-blue-600'}`} />
                                <h2 className="text-lg font-semibold text-slate-800">Monitoring & Notifications</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">Enabled</span>
                                {isLockedByExpenseType ? (
                                     <span className={`text-sm font-bold ${monitorEnabled ? 'text-green-600' : 'text-slate-400'}`}>{monitorEnabled ? "Yes" : "No"}</span>
                                ) : (
                                     <Switch checked={monitorEnabled} onCheckedChange={setMonitorEnabled} />
                                )}
                            </div>
                        </div>
                        <div className={`space-y-8 transition-opacity duration-300 ${monitorEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'} ${isLockedByExpenseType ? 'pointer-events-none opacity-80' : ''}`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <Label>Monitor Based On</Label>
                                        <div className="flex gap-4 mt-2">
                                            {['Expiry Date', 'Issue Date'].map(opt => (
                                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="monitorBasedOn" className="w-4 h-4 text-blue-600 border-slate-300" checked={monitorBasedOn === opt} onChange={() => setMonitorBasedOn(opt)} disabled={isLockedByExpenseType} />
                                                    <span className="text-sm text-slate-700">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Renewal Recurrence</Label>
                                        <select disabled={isLockedByExpenseType} className="mt-1 w-full h-10 rounded-md border border-slate-300 px-3 text-sm bg-white disabled:bg-slate-100 disabled:text-slate-500" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                                            <option>Annually (Every 1 Year)</option>
                                            <option>Semi-Annually</option>
                                            <option>Quarterly</option>
                                            <option>Monthly</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div>
                                        <Label>Notification Reminders</Label>
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            <Checkbox label="90 Days Before" checked={reminders.d90} onCheckedChange={(c) => setReminders(p => ({ ...p, d90: c }))} />
                                            <Checkbox label="60 Days Before" checked={reminders.d60} onCheckedChange={(c) => setReminders(p => ({ ...p, d60: c }))} />
                                            <Checkbox label="30 Days Before" checked={reminders.d30} onCheckedChange={(c) => setReminders(p => ({ ...p, d30: c }))} />
                                            <Checkbox label="7 Days Before" checked={reminders.d7} onCheckedChange={(c) => setReminders(p => ({ ...p, d7: c }))} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Notification Channels</Label>
                                        <div className="flex gap-4 mt-2">
                                            <Checkbox label="Email" checked={channels.email} onCheckedChange={(c) => setChannels(p => ({ ...p, email: c }))} />
                                            <Checkbox label="In-App" checked={channels.inapp} onCheckedChange={(c) => setChannels(p => ({ ...p, inapp: c }))} />
                                            <Checkbox label="SMS" checked={channels.sms} onCheckedChange={(c) => setChannels(p => ({ ...p, sms: c }))} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`bg-blue-50/50 border border-blue-100 rounded-lg p-4 flex gap-4 ${isLockedByExpenseType ? 'grayscale opacity-75' : ''}`}>
                                <Bell className="w-5 h-5 text-blue-500 mt-1" />
                                <div className="flex-1">
                                    <h5 className="text-sm font-bold text-blue-900 mb-1">Projected Notification Schedule</h5>
                                    <p className="text-sm text-blue-800 leading-relaxed">{notificationLogicText}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* 5. Destination */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-1 h-6 bg-emerald-500 rounded-full" />
                            <h2 className="text-lg font-semibold text-slate-800">Document Destination</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label required>
                                    {relatedTo === 'carrier' && 'Carrier Folder Selector'}
                                    {relatedTo === 'asset' && 'Asset Category Folder'}
                                    {relatedTo === 'driver' && 'Driver Folder Selection'}
                                </Label>
                                {relatedTo === 'driver' && (
                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                        <button onClick={() => setDriverMode('name')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${driverMode === 'name' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>By Name</button>
                                        <button onClick={() => setDriverMode('folder')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${driverMode === 'folder' ? 'bg-white shadow-sm text-blue-700' : 'text-slate-500'}`}>Existing Folder</button>
                                    </div>
                                )}
                            </div>

                            {relatedTo === 'driver' && driverMode === 'name' ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                                        <select className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                                            <option value="">Select a driver...</option>
                                            {MOCK_DRIVERS.map(d => (
                                                <option key={d.id} value={d.id}>{d.name} ({d.license})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-blue-900">Auto-Creation Logic</h4>
                                            <p className="text-xs text-blue-700 mt-1">If a folder for the selected driver does not exist, the system will automatically create it.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <FolderTreeSelect
                                    data={getFilteredTree()}
                                    selectedFolderId={selectedFolderId}
                                    onSelect={(id: string, name: string) => {
                                        setSelectedFolderId(id);
                                        setSelectedFolderName(name);
                                    }}
                                    onAddFolder={() => setIsAddFolderModalOpen(true)}
                                />
                            )}
                        </div>
                    </Card>

                    {/* Status Sections (Moved to Bottom) */}
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2"><Info className="w-4 h-4 text-slate-500" /> Status</h3>
                        <div>
                            <Label>Current Status</Label>
                            <select className="w-full h-10 rounded-md border border-slate-300 px-3 py-2 text-sm bg-white" value={status} onChange={(e) => setStatus(e.target.value)}>
                                <option>Active</option>
                                <option>Inactive</option>
                                <option>Draft</option>
                            </select>
                        </div>
                    </Card>

                </div>
            </main>
                        
            {!showHeader && (
                <div className="flex justify-end pt-4 px-6 pb-6">
                    <Button variant="outline" onClick={onCancel} className="mr-3">Cancel</Button>
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" />
                        Save Document Type
                    </Button>
                </div>
            )}

            {/* TAG SELECTION MODAL */}
            <TagSelectionModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                sections={tagSections}
                selectedTags={selectedTags}
                onToggleTag={handleTagToggle}
                onAddCustomTag={handleAddCustomTag}
                onSelectAll={handleSectionSelectAll}
            />

            {/* ADD FOLDER MODAL */}
            {isAddFolderModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <FolderPlus className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Add New Folder</h3>
                                    <p className="text-sm text-slate-500">Create a folder in the selected location</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAddFolderModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Folder Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="Enter folder name..."
                                    className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>
                            {selectedFolderId && (
                                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <p className="text-xs text-slate-500">Will be created inside:</p>
                                    <p className="text-sm font-medium text-slate-700 mt-0.5">{selectedFolderName || 'Selected folder'}</p>
                                </div>
                            )}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsAddFolderModalOpen(false); setNewFolderName(''); }}
                                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (newFolderName.trim() && selectedFolderId && addFolder) {
                                        addFolder(selectedFolderId, newFolderName.trim());
                                        setNewFolderName('');
                                        setIsAddFolderModalOpen(false);
                                    } else if (!selectedFolderId) {
                                        alert('Please select a parent folder first');
                                    } else if (!newFolderName.trim()) {
                                        alert('Please enter a folder name');
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                            >
                                <FolderPlus className="w-4 h-4" />
                                Create Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
