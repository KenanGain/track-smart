import { useState, useMemo } from "react"
import { Search, Edit, ChevronDown, Building2, Truck, User, Bell } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CATEGORIES, INITIAL_KEY_NUMBERS } from "@/data/key-numbers-mock-data"
import type { KeyNumberConfig, Category, AddNumberFormData } from "@/types/key-numbers.types"
import { useAppData } from "@/context/AppDataContext"
import { Combobox } from "@/components/ui/combobox"
import type { DocumentType } from "@/data/mock-app-data"
import { DocumentTypeEditor } from "@/components/settings/DocumentTypeEditor"

export function KeyNumbersPage() {
    // State management
    const [keyNumbers, setKeyNumbers] = useState<KeyNumberConfig[]>(INITIAL_KEY_NUMBERS)
    const [searchQuery, setSearchQuery] = useState("")
    const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0])

    // Add Number modal state
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<Category | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [addFormData, setAddFormData] = useState<AddNumberFormData & {
        monitoringEnabled: boolean;
        monitorBasedOn: 'expiry' | 'issue';
        reminderDays: { 90: boolean; 60: boolean; 30: boolean; 7: boolean };
        renewalRecurrence: 'annually' | 'biannually' | 'quarterly' | 'monthly' | 'none';
        notificationChannels: { email: boolean; inApp: boolean; sms: boolean };
    }>({
        numberTypeName: "",
        category: CATEGORIES[0],
        entityType: "Carrier",
        numberRequired: true,
        hasExpiry: false,
        documentRequired: false,
        requiredDocumentTypeId: "",
        status: "Active",
        monitoringEnabled: false,
        monitorBasedOn: 'expiry',
        reminderDays: { 90: true, 60: true, 30: true, 7: false },
        renewalRecurrence: 'annually',
        notificationChannels: { email: true, inApp: true, sms: false },
    })

    const { documents, addDocument } = useAppData()

    // Quick Create Doc Type State
    const [showQuickCreateDoc, setShowQuickCreateDoc] = useState(false)


    // Filter numbers by active category and search query
    const filteredNumbers = useMemo(() => {
        return keyNumbers.filter(number => {
            const matchesCategory = number.category === activeCategory
            const matchesSearch = searchQuery === "" ||
                number.numberTypeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                number.numberTypeDescription.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCategory && matchesSearch
        })
    }, [keyNumbers, activeCategory, searchQuery])

    // Available Document Types based on selected Entity Type
    const availableDocumentTypes = useMemo(() => {
        const type = addFormData.entityType.toLowerCase() // "Carrier" -> "carrier"
        return documents
            .filter(doc => doc.relatedTo === type)
            .map(doc => ({
                value: doc.id,
                label: doc.name,
                description: doc.status !== 'Active' ? `(${doc.status})` : undefined
            }))
    }, [documents, addFormData.entityType])

    // Handlers
    const handleToggleChange = (id: string, field: "numberRequired" | "hasExpiry" | "documentRequired") => {
        setKeyNumbers(prev =>
            prev.map(number =>
                number.id === id
                    ? { ...number, [field]: !number[field] }
                    : number
            )
        )
    }

    const handleOpenAddModal = (category: Category) => {
        setEditingId(null)
        setSelectedCategoryForAdd(category)
        setAddFormData({
            numberTypeName: "",
            category,
            entityType: "Carrier",
            numberRequired: true,
            hasExpiry: false,
            documentRequired: false,
            requiredDocumentTypeId: "",
            status: "Active",
            monitoringEnabled: false,
            monitorBasedOn: 'expiry',
            reminderDays: { 90: true, 60: true, 30: true, 7: false },
            renewalRecurrence: 'annually',
            notificationChannels: { email: true, inApp: true, sms: false },
        })
        setShowCategoryDropdown(false)
        setShowAddModal(true)
    }

    const handleEditNumber = (number: KeyNumberConfig) => {
        setEditingId(number.id)
        setSelectedCategoryForAdd(number.category)
        setAddFormData({
            numberTypeName: number.numberTypeName,
            category: number.category,
            entityType: number.entityType,
            numberRequired: number.numberRequired ?? true,
            hasExpiry: number.hasExpiry,
            documentRequired: number.documentRequired,
            requiredDocumentTypeId: number.requiredDocumentTypeId || "",
            status: number.status,
            monitoringEnabled: (number as any).monitoringEnabled ?? false,
            monitorBasedOn: (number as any).monitorBasedOn ?? 'expiry',
            reminderDays: (number as any).reminderDays ?? { 90: true, 60: true, 30: true, 7: false },
            renewalRecurrence: (number as any).renewalRecurrence ?? 'annually',
            notificationChannels: (number as any).notificationChannels ?? { email: true, inApp: true, sms: false },
        })
        setShowAddModal(true)
    }

    const handleSaveNumber = () => {
        if (!addFormData.numberTypeName.trim()) {
            alert("Please enter a number name")
            return
        }

        if (editingId) {
            // Update existing
            setKeyNumbers(prev =>
                prev.map(n =>
                    n.id === editingId
                        ? {
                            ...n,
                            numberTypeName: addFormData.numberTypeName,
                            // Keep description if it exists, or use default if we were to change type? 
                            // For simplicity, we keep original description unless we want to allow editing it. 
                            // The user didn't ask to edit description, just "edit button should be working".
                            // But since we are reusing the form which has fewer fields than the content, we just update the specific fields.
                            numberRequired: addFormData.numberRequired,
                            hasExpiry: addFormData.hasExpiry,
                            documentRequired: addFormData.documentRequired,
                            requiredDocumentTypeId: addFormData.documentRequired ? addFormData.requiredDocumentTypeId : undefined,
                            status: addFormData.status,
                            category: addFormData.category, // Allow category change? Usually nice.
                            entityType: addFormData.entityType
                        }
                        : n
                )
            )
        } else {
            // Create new
            const newNumber: KeyNumberConfig = {
                id: `kn-${Date.now()}`,
                numberTypeId: `custom-${Date.now()}`,
                numberTypeName: addFormData.numberTypeName,
                numberTypeDescription: "Custom number type",
                category: addFormData.category,
                entityType: addFormData.entityType,
                numberRequired: addFormData.numberRequired,
                hasExpiry: addFormData.hasExpiry,
                documentRequired: addFormData.documentRequired,
                requiredDocumentTypeId: addFormData.documentRequired ? addFormData.requiredDocumentTypeId : undefined,
                status: addFormData.status,
            }
            setKeyNumbers(prev => [...prev, newNumber])
            setActiveCategory(addFormData.category)
        }

        setShowAddModal(false)
        setEditingId(null)
    }

    const handleQuickCreateDocSave = (data: Partial<DocumentType>) => {
        // Create full document
        const newDoc: DocumentType = {
            id: `dt-${Date.now()}`,
            name: data.name || 'New Document',
            relatedTo: data.relatedTo || addFormData.entityType.toLowerCase() as any,
            expiryRequired: data.expiryRequired ?? true,
            issueDateRequired: data.issueDateRequired ?? false,
            status: data.status as any || 'Active',
            selectedTags: data.selectedTags || {},
            requirementLevel: data.requirementLevel || 'required',
            destination: data.destination,
            monitoring: data.monitoring,
            // Fallback or override if needed
            ...data
        } as DocumentType; // Type assertion since some optional fields might be partial in data

        addDocument(newDoc)

        // Auto-select
        setAddFormData(prev => ({ ...prev, requiredDocumentTypeId: newDoc.id }))

        // Reset and close
        setShowQuickCreateDoc(false)
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="px-8 py-6">
                <div className="flex text-sm text-slate-500 mb-2">
                    <span className="mr-2">Settings</span> / <span className="ml-2 font-medium text-slate-900">Key Numbers</span>
                </div>
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Key Numbers</h1>
                        <p className="text-slate-500">
                            Configure which numbers are tracked and their compliance rules.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Button
                                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                className="bg-blue-600 text-white hover:bg-blue-700 pl-4 pr-3"
                            >
                                + Add Number to Category
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                            {showCategoryDropdown && (
                                <>
                                    <div
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowCategoryDropdown(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-80 rounded-md border border-slate-200 bg-white shadow-lg z-50">
                                        <div className="p-2">
                                            {CATEGORIES.map((category) => (
                                                <button
                                                    key={category}
                                                    onClick={() => handleOpenAddModal(category)}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 rounded-md transition-colors"
                                                >
                                                    {category}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs & Content */}
                <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as Category)}>
                    <div className="border-b border-slate-200 mb-6">
                        <TabsList className="h-auto p-0 bg-transparent space-x-8">
                            {CATEGORIES.map((category) => (
                                <TabsTrigger
                                    key={category}
                                    value={category}
                                    className="rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none bg-transparent"
                                >
                                    {category}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    {CATEGORIES.map((category) => (
                        <TabsContent key={category} value={category} className="mt-0">
                            {/* Search and Filter */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Search numbers..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-white"
                                    />
                                </div>
                                <Button variant="outline" className="text-slate-600 border-slate-300">
                                    <span className="mr-2">Filter</span>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Table */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Number Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Related To
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Number Required
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Has Expiry
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Document Required
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {filteredNumbers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                                                    {searchQuery
                                                        ? "No numbers found matching your search."
                                                        : "No numbers configured in this category yet."}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredNumbers.map((number) => (
                                                <tr key={number.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 align-middle">
                                                        <div>
                                                            <div className="text-sm font-medium text-slate-900">
                                                                {number.numberTypeName}
                                                            </div>
                                                            <div className="text-sm text-slate-500">
                                                                {number.numberTypeDescription}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 align-middle">
                                                        <div className="flex items-center gap-2">
                                                            {number.entityType === "Carrier" && <Building2 className="h-4 w-4 text-slate-400" />}
                                                            {number.entityType === "Asset" && <Truck className="h-4 w-4 text-slate-400" />}
                                                            {number.entityType === "Driver" && <User className="h-4 w-4 text-slate-400" />}
                                                            <span className="text-sm text-slate-600">{number.entityType}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <div className="flex justify-center">
                                                            <Toggle
                                                                checked={number.numberRequired ?? true}
                                                                onCheckedChange={() =>
                                                                    handleToggleChange(number.id, "numberRequired")
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <div className="flex justify-center">
                                                            <Toggle
                                                                checked={number.hasExpiry}
                                                                onCheckedChange={() =>
                                                                    handleToggleChange(number.id, "hasExpiry")
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <div className="flex justify-center">
                                                            <Toggle
                                                                checked={number.documentRequired}
                                                                onCheckedChange={() =>
                                                                    handleToggleChange(number.id, "documentRequired")
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <div className="flex justify-center">
                                                            <Badge variant={number.status === "Active" ? "active" : "inactive"}>
                                                                {number.status}
                                                            </Badge>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <button
                                                            onClick={() => handleEditNumber(number)}
                                                            className="text-slate-600 hover:text-slate-900 transition-colors inline-block"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            {/* Add/Edit Number Modal */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? "Edit Number" : "Add Number to Category"}</DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? "Update configuration for this key number"
                                : `Configure number type and requirements for ${selectedCategoryForAdd}`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-8 py-4">
                        {/* Related To Selection */}
                        <div className="space-y-4">
                            <label className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                                Related To <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                <div
                                    onClick={() => setAddFormData(prev => ({ ...prev, entityType: "Carrier", requiredDocumentTypeId: "" }))}
                                    className={`
                                        cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all
                                        ${addFormData.entityType === "Carrier"
                                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-full ${addFormData.entityType === "Carrier" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <span className={`text-sm font-medium ${addFormData.entityType === "Carrier" ? "text-blue-700" : "text-slate-600"}`}>
                                        Carrier
                                    </span>
                                    {addFormData.entityType === "Carrier" && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600" />
                                    )}
                                </div>

                                <div
                                    onClick={() => setAddFormData(prev => ({ ...prev, entityType: "Asset", requiredDocumentTypeId: "" }))}
                                    className={`
                                        cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all
                                        ${addFormData.entityType === "Asset"
                                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-full ${addFormData.entityType === "Asset" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                        <Truck className="h-5 w-5" />
                                    </div>
                                    <span className={`text-sm font-medium ${addFormData.entityType === "Asset" ? "text-blue-700" : "text-slate-600"}`}>
                                        Asset
                                    </span>
                                </div>

                                <div
                                    onClick={() => setAddFormData(prev => ({ ...prev, entityType: "Driver", requiredDocumentTypeId: "" }))}
                                    className={`
                                        cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all
                                        ${addFormData.entityType === "Driver"
                                            ? "border-blue-600 bg-blue-50/50 ring-1 ring-blue-600"
                                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-full ${addFormData.entityType === "Driver" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                                        <User className="h-5 w-5" />
                                    </div>
                                    <span className={`text-sm font-medium ${addFormData.entityType === "Driver" ? "text-blue-700" : "text-slate-600"}`}>
                                        Driver
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Number Type Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Number Type Name</label>
                            <Input
                                value={addFormData.numberTypeName}
                                onChange={(e) =>
                                    setAddFormData(prev => ({ ...prev, numberTypeName: e.target.value }))
                                }
                                placeholder="Enter number name (e.g. DOT Number)"
                            />
                        </div>

                        {/* Number Required */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium">Number Required?</label>
                                <p className="text-xs text-slate-500">Makes this number mandatory for the entity</p>
                            </div>
                            <Toggle
                                checked={addFormData.numberRequired}
                                onCheckedChange={(checked) =>
                                    setAddFormData(prev => ({ ...prev, numberRequired: checked }))
                                }
                            />
                        </div>

                        {/* Has Expiry */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium">Has Expiry?</label>
                                <p className="text-xs text-slate-500">Enables expiry & renewal tracking</p>
                            </div>
                            <Toggle
                                checked={addFormData.hasExpiry}
                                onCheckedChange={(checked) =>
                                    setAddFormData(prev => ({ ...prev, hasExpiry: checked }))
                                }
                            />
                        </div>

                        {/* Document Required */}
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-medium">Document Required?</label>
                                <p className="text-xs text-slate-500">Users must upload supporting documents</p>
                            </div>
                            <Toggle
                                checked={addFormData.documentRequired}
                                onCheckedChange={(checked) =>
                                    setAddFormData(prev => ({ ...prev, documentRequired: checked }))
                                }
                            />
                        </div>

                        {/* Document Type Selection (Conditional) */}
                        {addFormData.documentRequired && (
                            <div className="space-y-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <label className="text-sm font-medium flex items-center justify-between">
                                    <span>Required Document Type <span className="text-red-500">*</span></span>
                                    <button
                                        onClick={() => setShowQuickCreateDoc(true)}
                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                    >
                                        + Create New
                                    </button>
                                </label>
                                <Combobox
                                    options={availableDocumentTypes}
                                    value={addFormData.requiredDocumentTypeId}
                                    onValueChange={(val) => setAddFormData(prev => ({ ...prev, requiredDocumentTypeId: val }))}
                                    placeholder="Select a document type..."
                                    searchPlaceholder="Search types..."
                                />
                                <p className="text-xs text-slate-500">
                                    Select the specific document type that satisfies this requirement.
                                </p>
                            </div>
                        )}

                        {/* Status */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Status</label>
                            <RadioGroup
                                value={addFormData.status}
                                onValueChange={(value) =>
                                    setAddFormData(prev => ({ ...prev, status: value as "Active" | "Inactive" }))
                                }
                                className="flex items-center gap-6"
                            >
                                <RadioGroupItem value="Active">Active</RadioGroupItem>
                                <RadioGroupItem value="Inactive">Inactive</RadioGroupItem>
                            </RadioGroup>
                        </div>

                        {/* Monitoring & Notifications Section */}
                        {addFormData.hasExpiry && (
                            <div className="border-l-4 border-blue-500 bg-slate-50 rounded-lg p-5 space-y-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-blue-600" />
                                        <span className="text-sm font-semibold text-slate-800">Monitoring & Notifications</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">Enabled</span>
                                        <Toggle
                                            checked={addFormData.monitoringEnabled}
                                            onCheckedChange={(checked) =>
                                                setAddFormData(prev => ({ ...prev, monitoringEnabled: checked }))
                                            }
                                        />
                                    </div>
                                </div>

                                {addFormData.monitoringEnabled && (
                                    <>
                                        <div className="grid grid-cols-2 gap-6">
                                            {/* Left Column */}
                                            <div className="space-y-4">
                                                {/* Monitor Based On */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-2 block">Monitor Based On</label>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="monitorBasedOn"
                                                                checked={addFormData.monitorBasedOn === 'expiry'}
                                                                onChange={() => setAddFormData(prev => ({ ...prev, monitorBasedOn: 'expiry' }))}
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">Expiry Date</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="monitorBasedOn"
                                                                checked={addFormData.monitorBasedOn === 'issue'}
                                                                onChange={() => setAddFormData(prev => ({ ...prev, monitorBasedOn: 'issue' }))}
                                                                className="w-4 h-4 text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">Issue Date</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Renewal Recurrence */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-2 block">Renewal Recurrence</label>
                                                    <select
                                                        value={addFormData.renewalRecurrence}
                                                        onChange={(e) => setAddFormData(prev => ({ ...prev, renewalRecurrence: e.target.value as any }))}
                                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                            <div className="space-y-4">
                                                {/* Notification Reminders */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-2 block">Notification Reminders</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.reminderDays[90]}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, reminderDays: { ...prev.reminderDays, 90: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">90 Days Before</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.reminderDays[60]}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, reminderDays: { ...prev.reminderDays, 60: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">60 Days Before</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.reminderDays[30]}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, reminderDays: { ...prev.reminderDays, 30: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">30 Days Before</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.reminderDays[7]}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, reminderDays: { ...prev.reminderDays, 7: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">7 Days Before</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Notification Channels */}
                                                <div>
                                                    <label className="text-xs font-medium text-slate-600 mb-2 block">Notification Channels</label>
                                                    <div className="flex items-center gap-4">
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.notificationChannels.email}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, notificationChannels: { ...prev.notificationChannels, email: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">Email</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.notificationChannels.inApp}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, notificationChannels: { ...prev.notificationChannels, inApp: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">In-App</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={addFormData.notificationChannels.sms}
                                                                onChange={(e) => setAddFormData(prev => ({ ...prev, notificationChannels: { ...prev.notificationChannels, sms: e.target.checked } }))}
                                                                className="w-4 h-4 rounded text-blue-600"
                                                            />
                                                            <span className="text-sm text-slate-700">SMS</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Projected Notification Schedule */}
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-3">
                                            <Bell className="w-5 h-5 text-blue-500 mt-0.5" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Projected Notification Schedule</p>
                                                <p className="text-xs text-slate-600">
                                                    Monitor {addFormData.monitorBasedOn === 'expiry' ? 'Expiry Date' : 'Issue Date'}.
                                                    Reminders at {[90, 60, 30, 7].filter(d => addFormData.reminderDays[d as keyof typeof addFormData.reminderDays]).map(d => `${d} days`).join(', ') || 'none'} before.
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddModal(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveNumber}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                        >
                            {editingId ? "Save Changes" : "Save & Add"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Quick Create Document Modal (Now using Full Editor) */}
            <Dialog open={showQuickCreateDoc} onOpenChange={setShowQuickCreateDoc}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden flex flex-col">
                    <DocumentTypeEditor
                        initialData={null}
                        onSave={handleQuickCreateDocSave}
                        onCancel={() => setShowQuickCreateDoc(false)}
                        defaultRelatedTo={addFormData.entityType.toLowerCase() as any}
                        showHeader={true}
                    />
                </DialogContent>
            </Dialog>
        </div >
    )
}
