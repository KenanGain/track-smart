import { useState, useMemo } from "react"
import { Search, Edit, ChevronDown, Building2, Truck, User, Trash2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import { CATEGORIES } from "@/data/key-numbers-mock-data"
import type { KeyNumberConfig, Category, AddNumberFormData } from "@/types/key-numbers.types"
import { useAppData } from "@/context/AppDataContext"
import { KeyNumberEditor } from "./KeyNumberEditor"

export function KeyNumbersPage() {
    // State management
    const { keyNumbers, setKeyNumbers, updateDocument, documents } = useAppData()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeCategory, setActiveCategory] = useState<Category>(CATEGORIES[0])

    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
    const [selectedCategoryForAdd, setSelectedCategoryForAdd] = useState<Category | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    
    // View State
    const [showEditor, setShowEditor] = useState(false)

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

    // Handlers
    const handleToggleChange = (id: string, field: "numberRequired" | "hasExpiry" | "issueDateRequired" | "issueStateRequired" | "issueCountryRequired" | "documentRequired") => {
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
        setShowCategoryDropdown(false)
        setShowEditor(true)
    }

    const handleEditNumber = (number: KeyNumberConfig) => {
        setEditingId(number.id)
        setSelectedCategoryForAdd(number.category)
        setShowEditor(true)
    }

    const handleSaveNumber = (data: AddNumberFormData) => {
        if (editingId) {
            // Update existing
            setKeyNumbers(prev =>
                prev.map(n =>
                    n.id === editingId
                        ? {
                            ...n,
                            numberTypeName: data.numberTypeName,
                            numberRequired: data.numberRequired,
                            hasExpiry: data.hasExpiry,
                            issueDateRequired: data.issueDateRequired,
                            issueStateRequired: data.issueStateRequired,
                            issueCountryRequired: data.issueCountryRequired,
                            documentRequired: data.documentRequired,
                            requiredDocumentTypeId: data.requiredDocumentTypeId,
                            status: data.status,
                            category: data.category, 
                            entityType: data.entityType,
                            description: data.description || n.description,
                            // Monitoring
                            monitoringEnabled: data.monitoringEnabled,
                            monitorBasedOn: data.monitorBasedOn,
                            renewalRecurrence: data.renewalRecurrence,
                            reminderDays: data.reminderDays,
                            notificationChannels: data.notificationChannels,
                        }
                        : n
                )
            )
        } else {
            // Create new
            const newNumber: KeyNumberConfig = {
                id: `kn-${Date.now()}`,
                numberTypeId: `custom-${Date.now()}`,
                numberTypeName: data.numberTypeName,
                numberTypeDescription: "Custom number type",
                description: data.description || "",
                category: data.category,
                entityType: data.entityType,
                numberRequired: data.numberRequired,
                hasExpiry: data.hasExpiry,
                issueDateRequired: data.issueDateRequired,
                issueStateRequired: data.issueStateRequired,
                issueCountryRequired: data.issueCountryRequired,
                status: data.status,
                // Monitoring
                monitoringEnabled: data.monitoringEnabled,
                monitorBasedOn: data.monitorBasedOn,
                renewalRecurrence: data.renewalRecurrence,
                reminderDays: data.reminderDays,
                notificationChannels: data.notificationChannels,
            }
            setKeyNumbers(prev => [...prev, newNumber])
            setActiveCategory(data.category)

            // Sync settings for new number
            if (data.documentRequired && data.requiredDocumentTypeId) {
                const linkedDoc = documents.find(d => d.id === data.requiredDocumentTypeId);
                if (linkedDoc) {
                    updateDocument(linkedDoc.id, {
                        expiryRequired: data.hasExpiry,
                        issueDateRequired: data.issueDateRequired,
                        issueStateRequired: data.issueStateRequired,
                        issueCountryRequired: data.issueCountryRequired,
                        monitoring: {
                            enabled: data.monitoringEnabled,
                            basedOn: data.monitorBasedOn,
                            recurrence: data.renewalRecurrence,
                            reminders: {
                                d90: data.reminderDays[90] || false,
                                d60: data.reminderDays[60] || false,
                                d30: data.reminderDays[30] || false,
                                d7: data.reminderDays[7] || false,
                            },
                            channels: {
                                email: data.notificationChannels.email,
                                inapp: data.notificationChannels.inApp,
                                sms: data.notificationChannels.sms,
                            }
                        }
                    });
                }
            }
        }

        // Sync settings for existing number (outside the if/else to catch updates too)
        if (editingId && data.documentRequired && data.requiredDocumentTypeId) {
             const linkedDoc = documents.find(d => d.id === data.requiredDocumentTypeId);
             if (linkedDoc) {
                 updateDocument(linkedDoc.id, {
                     expiryRequired: data.hasExpiry,
                     issueDateRequired: data.issueDateRequired,
                     issueStateRequired: data.issueStateRequired,
                     issueCountryRequired: data.issueCountryRequired,
                     monitoring: {
                         enabled: data.monitoringEnabled,
                         basedOn: data.monitorBasedOn,
                         recurrence: data.renewalRecurrence,
                         reminders: {
                             d90: data.reminderDays[90] || false,
                             d60: data.reminderDays[60] || false,
                             d30: data.reminderDays[30] || false,
                             d7: data.reminderDays[7] || false,
                         },
                         channels: {
                             email: data.notificationChannels.email,
                             inapp: data.notificationChannels.inApp,
                             sms: data.notificationChannels.sms,
                         }
                     }
                 });
             }
        }



        setShowEditor(false)
        setEditingId(null)
    }

    const handleDeleteNumber = (id: string) => {
        if (confirm("Are you sure you want to delete this key number?")) {
            setKeyNumbers(prev => prev.filter(n => n.id !== id));
        }
    };

    if (showEditor) {
        return (
            <KeyNumberEditor
                initialData={editingId ? keyNumbers.find(n => n.id === editingId) : null}
                category={selectedCategoryForAdd || activeCategory}
                onSave={handleSaveNumber}
                onCancel={() => {
                    setShowEditor(false)
                    setEditingId(null)
                }}
            />
        )
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
                                                Doc. Req.
                                            </th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Has Expiry</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 w-32">Issue Date Req.</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 w-32">Issue State Req.</th>
                                            <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 w-32">Issue Country Req.</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-slate-200">
                                        {filteredNumbers.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-12 text-center text-sm text-slate-500">
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
                                                                checked={number.documentRequired ?? false}
                                                                onCheckedChange={() =>
                                                                    handleToggleChange(number.id, "documentRequired")
                                                                }
                                                                className={`data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 h-7 w-12 ${!number.documentRequired ? 'opacity-50 hover:opacity-100' : ''}`}
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
                                                                checked={number.issueDateRequired || false}
                                                                onCheckedChange={() =>
                                                                    handleToggleChange(number.id, "issueDateRequired")
                                                                }
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center align-middle">
                                                        <div className="flex items-center justify-center p-2 rounded-lg bg-slate-50">
                                                            <Toggle
                                                                checked={number.issueStateRequired ?? false}
                                                                onCheckedChange={() => handleToggleChange(number.id, "issueStateRequired")}
                                                                className={`data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 h-7 w-12 ${!number.issueStateRequired ? 'opacity-50 hover:opacity-100' : ''}`}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-3 w-32">
                                                        <div className="flex items-center justify-center p-2 rounded-lg bg-slate-50">
                                                            <Toggle
                                                                checked={number.issueCountryRequired}
                                                                onCheckedChange={() => handleToggleChange(number.id, "issueCountryRequired")}
                                                                className={`data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700 h-7 w-12 ${!number.issueCountryRequired ? 'opacity-50 hover:opacity-100' : ''}`}
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
                                                            className="text-slate-600 hover:text-slate-900 transition-colors inline-block mr-2"
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        {!number.isSystem && (
                                                            <button
                                                                onClick={() => handleDeleteNumber(number.id)}
                                                                className="text-rose-400 hover:text-rose-600 transition-colors inline-block"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
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
        </div >
    )
}
