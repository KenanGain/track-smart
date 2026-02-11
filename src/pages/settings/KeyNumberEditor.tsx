import { useState, useEffect } from "react"
import { ArrowLeft, Building2, Truck, User, Bell, Save } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DocumentTypeEditor } from "@/components/settings/DocumentTypeEditor"
import { Plus } from "lucide-react"
import { CATEGORIES } from "@/data/key-numbers-mock-data"
import type { KeyNumberConfig, Category, AddNumberFormData } from "@/types/key-numbers.types"
import { useAppData } from "@/context/AppDataContext"

interface KeyNumberEditorProps {
    initialData?: KeyNumberConfig | null;
    category?: Category;
    onSave: (data: AddNumberFormData) => void;
    onCancel: () => void;
}

export function KeyNumberEditor({ initialData, category, onSave, onCancel }: KeyNumberEditorProps) {
    const { documents, addDocument } = useAppData()
    const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false)
    
    // Form State
    const [formData, setFormData] = useState<AddNumberFormData & {
        monitoringEnabled: boolean;
        monitorBasedOn: 'expiry' | 'issue_date';
        reminderDays: Record<number, boolean>;
        renewalRecurrence: 'annually' | 'biannually' | 'quarterly' | 'monthly' | 'none';
        notificationChannels: { email: boolean; inApp: boolean; sms: boolean };
    }>({
        numberTypeName: "",
        category: category || CATEGORIES[0],
        entityType: "Carrier",
        description: "New number requirement",
        numberRequired: true,
        hasExpiry: false,
        issueDateRequired: false,
        issueStateRequired: false,
        issueCountryRequired: false,
        documentRequired: false,
        requiredDocumentTypeId: "",
        status: "Active",
        monitoringEnabled: false,
        monitorBasedOn: 'expiry',
        reminderDays: { 90: true, 60: true, 30: true, 7: false },
        renewalRecurrence: 'annually',
        notificationChannels: { email: true, inApp: true, sms: false },
    })

    // Initialize with data if editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                numberTypeName: initialData.numberTypeName,
                category: initialData.category,
                entityType: initialData.entityType,
                description: initialData.description || "",
                numberRequired: initialData.numberRequired ?? true,
                hasExpiry: initialData.hasExpiry,
                issueDateRequired: initialData.issueDateRequired || false,
                issueStateRequired: initialData.issueStateRequired || false,
                issueCountryRequired: initialData.issueCountryRequired || false,
                documentRequired: initialData.documentRequired || false,
                requiredDocumentTypeId: initialData.requiredDocumentTypeId || "",
                status: initialData.status,
                // Monitoring
                monitoringEnabled: initialData.monitoringEnabled ?? false,
                monitorBasedOn: (initialData.monitorBasedOn === 'issue_date' ? 'issue_date' : 'expiry') as 'expiry' | 'issue_date',
                renewalRecurrence: (initialData.renewalRecurrence || 'annually') as any,
                reminderDays: initialData.reminderDays || { 90: true, 60: true, 30: true, 7: false },
                notificationChannels: initialData.notificationChannels || { email: true, inApp: true, sms: false },
            })
        }
    }, [initialData])

    const handleSave = () => {
        if (!formData.numberTypeName.trim()) {
            alert("Please enter a number name")
            return
        }
        onSave(formData)
    }

    const handleSaveNewDocument = (data: Partial<any>) => {
        const newDocId = Math.random().toString(36).substr(2, 9);
        const newDoc: any = {
            id: newDocId,
            name: data.name || 'New Document',
            relatedTo: formData.entityType.toLowerCase(), // Carrier/Asset/Driver
            expiryRequired: data.expiryRequired ?? true,
            issueDateRequired: data.issueDateRequired ?? false,
            issueStateRequired: data.issueStateRequired ?? false,
            issueCountryRequired: data.issueCountryRequired ?? false,
            status: data.status || 'Active',
            selectedTags: {},
            requirementLevel: data.requirementLevel || 'required',
            ...data
        };
        addDocument(newDoc);
        
        // Select the new document
        setFormData(prev => ({ ...prev, requiredDocumentTypeId: newDocId }));
        setIsAddDocModalOpen(false);
    }

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">
                            {initialData ? "Edit Key Number" : "Add Key Number"}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {initialData ? "Update configuration" : `Add new number to ${formData.category}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
                        
                        {/* Related To Selection */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                Related To <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {["Carrier", "Asset", "Driver"].map((type) => (
                                    <div
                                        key={type}
                                        onClick={() => setFormData(prev => ({ ...prev, entityType: type as any, requiredDocumentTypeId: "" }))}
                                        className={`
                                            cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all
                                            ${formData.entityType === type
                                                ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-full ${formData.entityType === type ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                            {type === "Carrier" && <Building2 className="h-5 w-5" />}
                                            {type === "Asset" && <Truck className="h-5 w-5" />}
                                            {type === "Driver" && <User className="h-5 w-5" />}
                                        </div>
                                        <span className={`text-sm font-medium ${formData.entityType === type ? "text-blue-700" : "text-slate-600"}`}>
                                            {type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Number Type Name */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Number Type Name <span className="text-rose-500">*</span></label>
                            <Input
                                value={formData.numberTypeName}
                                onChange={(e) => setFormData(prev => ({ ...prev, numberTypeName: e.target.value }))}
                                placeholder="Enter number name (e.g. DOT Number)"
                                className="max-w-md"
                            />
                        </div>
                        
                        {/* Status */}
                        <div className="space-y-2 pt-2">
                            <label className="text-sm font-medium text-slate-700">Status</label>
                            <RadioGroup
                                value={formData.status}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as "Active" | "Inactive" }))}
                                className="flex items-center gap-6"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Active" id="r-active" />
                                    <label htmlFor="r-active" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Active</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Inactive" id="r-inactive" />
                                    <label htmlFor="r-inactive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Inactive</label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Requirements Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                        <h2 className="text-lg font-semibold text-slate-900 mb-4">Requirements & Validation</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Number Required */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <label className="text-sm font-medium text-slate-900">Number Required?</label>
                                    <p className="text-xs text-slate-500">Makes this number mandatory</p>
                                </div>
                                <Toggle
                                    checked={formData.numberRequired}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, numberRequired: checked }))}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                            {/* Has Expiry */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <label className="text-sm font-medium text-slate-900">Has Expiry?</label>
                                    <p className="text-xs text-slate-500">Enables expiry & renewal tracking</p>
                                </div>
                                <Toggle
                                    checked={formData.hasExpiry}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasExpiry: checked }))}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                            {/* Issue Date Required */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <label className="text-sm font-medium text-slate-900">Issue Date Required?</label>
                                    <p className="text-xs text-slate-500">Makes issue date mandatory</p>
                                </div>
                                <Toggle
                                    checked={formData.issueDateRequired}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, issueDateRequired: checked }))}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                             {/* Issue State Required */}
                             <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <label className="text-sm font-medium text-slate-900">Issue State Required?</label>
                                    <p className="text-xs text-slate-500">Requires selection of issuing state/province</p>
                                </div>
                                <Toggle
                                    checked={formData.issueStateRequired}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, issueStateRequired: checked }))}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                            {/* Issue Country Required */}
                            <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <label className="text-sm font-medium text-slate-900">Issue Country Required?</label>
                                    <p className="text-xs text-slate-500">Requires selection of issuing country</p>
                                </div>
                                <Toggle
                                    checked={formData.issueCountryRequired}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, issueCountryRequired: checked }))}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                             {/* Document Required */}
                             <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 col-span-1 md:col-span-2">
                                <div>
                                    <label className="text-sm font-medium text-slate-900">Supporting Document Required?</label>
                                    <p className="text-xs text-slate-500">Requires an upload and validates against document type</p>
                                </div>
                                <Toggle
                                    checked={formData.documentRequired}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, documentRequired: checked }))}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                            {/* Linked Document Type */}
                            {formData.documentRequired && (
                                <div className="col-span-1 md:col-span-2 p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                        Link to Document Type <span className="text-rose-500">*</span>
                                        <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                            Auto-syncs settings
                                        </span>
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.requiredDocumentTypeId || ""}
                                            onChange={(e) => setFormData(prev => ({ ...prev, requiredDocumentTypeId: e.target.value }))}
                                            className="flex-1 h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">Select a document type...</option>
                                            {documents
                                                .filter(doc => doc.status === 'Active' && doc.relatedTo.toLowerCase() === formData.entityType.toLowerCase())
                                                .map(doc => (
                                                    <option key={doc.id} value={doc.id}>{doc.name}</option>
                                                ))
                                            }
                                        </select>
                                        <Button 
                                            variant="outline" 
                                            size="icon" 
                                            onClick={() => setIsAddDocModalOpen(true)}
                                            className="h-10 w-10 shrink-0 bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                                            title="Create new document type"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-blue-600 flex items-center gap-1">
                                        <Bell className="h-3 w-3" />
                                        Selecting a document type will sync expiry, issue date, and monitoring settings.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Monitoring & Notifications Card */}
                     {/* Monitoring & Notifications Card */}
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-1 bg-purple-600 rounded-full"></div>
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Monitoring & Notifications</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600">
                                    {formData.monitoringEnabled ? "Enabled" : "Disabled"}
                                </span>
                                <Toggle
                                    checked={formData.monitoringEnabled}
                                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, monitoringEnabled: checked }))}
                                    className="data-[state=on]:bg-purple-600"
                                />
                            </div>
                        </div>

                        {formData.monitoringEnabled && (
                            <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                                {/* Left Column */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700">Monitor Based On</label>
                                        <div className="flex gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition w-full">
                                                <input
                                                    type="radio"
                                                    name="monitorBasedOn"
                                                    checked={formData.monitorBasedOn === 'expiry'}
                                                    onChange={() => setFormData(prev => ({ ...prev, monitorBasedOn: 'expiry', hasExpiry: true }))}
                                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Expiry Date</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition w-full">
                                                <input
                                                    type="radio"
                                                    name="monitorBasedOn"
                                                    checked={formData.monitorBasedOn === 'issue_date'}
                                                    onChange={() => setFormData(prev => ({ ...prev, monitorBasedOn: 'issue_date' }))}
                                                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className="text-sm font-medium text-slate-700">Issue Date</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700">Renewal Recurrence</label>
                                        <select
                                            value={formData.renewalRecurrence}
                                            onChange={(e) => setFormData(prev => ({ ...prev, renewalRecurrence: e.target.value as any }))}
                                            className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="annually">Annually (Every 1 Year)</option>
                                            <option value="biannually">Biannually (Every 2 Years)</option>
                                            <option value="quarterly">Quarterly (Every 3 Months)</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="none">No Recurrence</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Right Column */}
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700">Notification Reminders</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[90, 60, 30, 7].map((days) => (
                                                <label key={days} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.reminderDays[days]}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            reminderDays: { ...prev.reminderDays, [days]: e.target.checked }
                                                        }))}
                                                        className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-slate-600">{days} Days Before</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-slate-700">Notification Channels</label>
                                        <div className="flex gap-4">
                                            {['email', 'inApp', 'sms'].map((channel) => (
                                                <label key={channel} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.notificationChannels[channel as keyof typeof formData.notificationChannels]}
                                                        onChange={(e) => setFormData(prev => ({
                                                            ...prev,
                                                            notificationChannels: { ...prev.notificationChannels, [channel]: e.target.checked }
                                                        }))}
                                                        className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-slate-600 capitalize">{channel === 'inApp' ? 'In-App' : channel}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="col-span-1 md:col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 mt-2">
                                    <Bell className="h-5 w-5 text-blue-600 shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-semibold text-blue-900">Projected Notification Schedule</h4>
                                        <p className="text-sm text-blue-700 mt-1">
                                            Monitor {formData.monitorBasedOn === 'expiry' ? 'Expiry Date' : 'Issue Date'}. 
                                            Reminders at {Object.entries(formData.reminderDays).filter(([_, v]) => v).map(([d]) => `${d} days`).join(', ')} before.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            </div>


            {/* Add Document Modal */}
            <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
                    <div className="h-full flex flex-col">
                        <DocumentTypeEditor
                            initialData={null}
                            onSave={handleSaveNewDocument}
                            onCancel={() => setIsAddDocModalOpen(false)}
                            defaultRelatedTo={formData.entityType.toLowerCase() as any}
                            showHeader={true} 
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
