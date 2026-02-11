import { useState, useMemo } from 'react';
import { Search, Plus, Edit2, Trash2, Check, Building2, Truck, User, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { INITIAL_EXPENSE_TYPES, type ExpenseType, type ExpenseCategory, type ExpenseSubCategory, type ExpenseEntityType, type ExpenseFrequency } from './expenses.data';
import { useAppData } from '@/context/AppDataContext';
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { DocumentTypeEditor } from "@/components/settings/DocumentTypeEditor"
import { Bell } from "lucide-react"

// --- Components ---

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className}`}>
        {children}
    </span>
);

export const ExpenseTypesPage = () => {
    // --- State ---
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(INITIAL_EXPENSE_TYPES);
    const [isEditing, setIsEditing] = useState(false);
    const [editingType, setEditingType] = useState<ExpenseType | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // --- Actions ---
    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this expense type?")) {
            setExpenseTypes(prev => prev.filter(t => t.id !== id));
        }
    };

    const handleSave = (type: ExpenseType) => {
        if (editingType) {
            setExpenseTypes(prev => prev.map(t => t.id === type.id ? type : t));
        } else {
            setExpenseTypes(prev => [...prev, { ...type, id: `exp_${Math.random().toString(36).substr(2, 9)}` }]);
        }
        setIsEditing(false);
        setEditingType(null);
    };

    const startEditing = (type?: ExpenseType) => {
        setEditingType(type || null);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
        setEditingType(null);
    };

    // --- Filtered Data ---
    const filteredTypes = expenseTypes.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subCategory.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isEditing) {
        return (
            <ExpenseTypeEditor 
                initialData={editingType} 
                onSave={handleSave} 
                onCancel={cancelEditing} 
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-8 py-5 flex items-center justify-between">
                <div>
                     <nav className="flex text-sm text-slate-500 mb-1 font-medium items-center gap-2" aria-label="Breadcrumb">
                        <span>Settings</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-900">Expenses</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-900">Expense Types</h1>
                </div>
                <Button onClick={() => startEditing()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Plus size={16} /> Add Expense Type
                </Button>
            </header>

            {/* Content */}
            <main className="flex-1 p-8 overflow-auto">
                <div className="mb-6 flex items-center justify-between">
                     <div className="relative w-72">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search expense types..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500 uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-4">Expense Name</th>
                                <th className="px-6 py-4">Entity</th>
                                <th className="px-6 py-4">Classification</th>
                                <th className="px-6 py-4">Configuration</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTypes.map(type => (
                                <tr key={type.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                                            {type.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            {type.entityType === 'Carrier' && <Building2 size={14} />}
                                            {type.entityType === 'Asset' && <Truck size={14} />}
                                            {type.entityType === 'Driver' && <User size={14} />}
                                            <span>{type.entityType}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1 items-start">
                                            <Badge className={
                                                type.category === 'variable' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                'bg-purple-50 text-purple-700 border border-purple-100'
                                            }>
                                                {type.category.charAt(0).toUpperCase() + type.category.slice(1)}
                                            </Badge>
                                            <span className="text-xs text-slate-500 capitalize">{type.subCategory}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 space-y-1">
                                        {type.isRecurring && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Check size={12} className="text-green-600" /> Recurring ({type.frequency || 'Custom'})
                                            </div>
                                        )}
                                        {type.documentRequired && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Check size={12} className="text-green-600" /> Document Required
                                            </div>
                                        )}
                                        {!type.isRecurring && !type.documentRequired && <span className="text-slate-400 text-xs">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{type.description || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => startEditing(type)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(type.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

// --- Editor Component (Dedicated Form) ---

const ExpenseTypeEditor = ({ initialData, onSave, onCancel }: { 
    initialData: ExpenseType | null;
    onSave: (data: ExpenseType) => void;
    onCancel: () => void;
}) => {
    const [formData, setFormData] = useState<Partial<ExpenseType>>(initialData || {
        name: "",
        entityType: "Asset",
        category: "variable",
        subCategory: "operational",
        isRecurring: false,
        frequency: null,
        dateRequired: true,
        documentRequired: false,
        documentTypeId: null,
        description: ""
    });

    const { documents, addDocument } = useAppData();
    const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);

    // Filter documents based on entity type
    const availableDocuments = useMemo(() => {
        const type = (formData.entityType || 'asset').toLowerCase();
        return documents.filter(doc => doc.relatedTo.toLowerCase() === type);
    }, [formData.entityType, documents]);

    const handleSaveNewDocument = (data: Partial<any>) => {
        const newDocId = Math.random().toString(36).substr(2, 9);
        const newDoc: any = {
            id: newDocId,
            name: data.name || 'New Document',
            relatedTo: (formData.entityType || 'Asset').toLowerCase(),
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
        setFormData(prev => ({ 
            ...prev, 
            documentTypeId: newDocId,
            documentRequired: true
        }));
        setIsAddDocModalOpen(false);
    }

    // Logic: If Sub-Category changes to 'recurring', auto-enable isRecurring and force Date Required
    const handleSubCategoryChange = (val: ExpenseSubCategory) => {
        const isRecurring = val === 'recurring';
        setFormData(prev => ({ 
            ...prev, 
            subCategory: val,
            isRecurring: isRecurring ? true : prev.isRecurring,
            dateRequired: isRecurring ? true : prev.dateRequired
        }));
    };

    // Logic: When Recurring is toggled, if ON -> Date Required MUST be ON
    const handleRecurringToggle = (checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            isRecurring: checked,
            dateRequired: checked ? true : prev.dateRequired // Force date required if recurring
        }));
    };
    
    // Logic: When Document Type is selected, Document Required MUST be ON
    const handleDocumentTypeChange = (docId: string) => {
        setFormData(prev => ({
            ...prev,
            documentTypeId: docId || null,
            documentRequired: docId ? true : prev.documentRequired
        }));
    };

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
                            {initialData ? 'Edit Expense Type' : 'Add Expense Type'}
                        </h1>
                        <p className="text-sm text-slate-500">
                            {initialData ? 'Update configuration' : 'Configure new expense category and requirements'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={() => onSave(formData as ExpenseType)} 
                        disabled={!formData.name}
                        className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    
                    {/* Basic Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="h-6 w-1 rounded-full bg-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Basic Information</h2>
                        </div>
                        
                        {/* Name - Full Width */}
                        <div className="space-y-2">
                             <label className="text-sm font-medium text-slate-700">Expense Type Name <span className="text-rose-500">*</span></label>
                            <input 
                                className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:border-slate-400"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g. Fuel, Insurance"
                            />
                        </div>

                        {/* Related To (Entity Type) - Radio Cards */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                                Related To <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-4">
                                {['Carrier', 'Asset', 'Driver'].map((type) => {
                                    const isSelected = formData.entityType === type;
                                    const icons = {
                                        Carrier: <Building2 className="h-5 w-5" />,
                                        Asset: <Truck className="h-5 w-5" />,
                                        Driver: <User className="h-5 w-5" />
                                    };
                                    return (
                                        <div 
                                            key={type}
                                            onClick={() => setFormData(prev => ({ ...prev, entityType: type as ExpenseEntityType, documentTypeId: null }))}
                                            className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center justify-center gap-3 transition-all relative ${isSelected ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                        >
                                            <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'}`}>
                                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                            </div>
                                            
                                            <div className={`p-3 rounded-full ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                {icons[type as keyof typeof icons]}
                                            </div>
                                            <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{type}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Category</label>
                                <select 
                                    className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all hover:border-slate-400"
                                    value={formData.category}
                                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                                >
                                    <option value="variable">Variable</option>
                                    <option value="fixed">Fixed</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Sub-Category</label>
                                 <select 
                                    className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all hover:border-slate-400"
                                    value={formData.subCategory}
                                    onChange={e => handleSubCategoryChange(e.target.value as ExpenseSubCategory)}
                                >
                                    <option value="operational">Operational</option>
                                    <option value="compliance">Compliance</option>
                                    <option value="recurring">Recurring</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                         <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Description</label>
                            <textarea 
                                className="w-full border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none transition-all hover:border-slate-400"
                                value={formData.description || ""}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Optional description..."
                            />
                        </div>
                    </div>

                    {/* Requirements Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-8">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="h-6 w-1 rounded-full bg-blue-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Requirements</h2>
                        </div>
                        
                        {/* Recurring Logic Block */}
                         <div className={`rounded-xl border p-5 space-y-4 transition-colors ${formData.subCategory === 'recurring' ? 'bg-slate-50/50 border-slate-200' : 'bg-slate-100/50 border-slate-200 opacity-60'}`}>
                             <div className="flex items-center justify-between">
                                <div>
                                    <span className={`block text-sm font-medium ${formData.subCategory === 'recurring' ? 'text-slate-900' : 'text-slate-500'}`}>Allow Recurring Schedule</span>
                                    <span className="block text-xs text-slate-500">Enable if this expense repeats (e.g. subscriptions)</span>
                                </div>
                                <Toggle 
                                    checked={formData.isRecurring} 
                                    onCheckedChange={handleRecurringToggle} 
                                    disabled={formData.subCategory !== 'recurring'}
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                             {formData.isRecurring && (
                                <div className="animate-in slide-in-from-top-1 fade-in pt-3 border-t border-slate-200 mt-3">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Default Frequency</label>
                                    <select 
                                        className="w-full max-w-xs border-slate-300 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all hover:border-slate-400"
                                        value={formData.frequency || ""}
                                        onChange={e => setFormData(prev => ({ ...prev, frequency: e.target.value as ExpenseFrequency }))}
                                    >
                                        <option value="">Select Frequency...</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annually">Annually</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Date Required Toggle */}
                             <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300">
                                <div>
                                    <span className="text-sm font-medium text-slate-900">Is Date Required?</span>
                                    <p className="text-xs text-slate-500">Must enter a date for expense</p>
                                </div>
                                <Toggle 
                                    checked={formData.dateRequired} 
                                    onCheckedChange={checked => setFormData(prev => ({ ...prev, dateRequired: checked }))} 
                                    disabled={formData.isRecurring} // Lock if Recurring is ON
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>

                            {/* Document Required Toggle */}
                             <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                                <div>
                                    <span className="text-sm font-medium text-slate-900">Supporting Document Required?</span>
                                    <p className="text-xs text-slate-500">Requires an upload and validates against document type</p>
                                </div>
                                <Toggle 
                                    checked={formData.documentRequired} 
                                    onCheckedChange={checked => setFormData(prev => ({ ...prev, documentRequired: checked }))} 
                                    className="data-[state=on]:bg-blue-600"
                                />
                            </div>
                        </div>

                        {/* Linked Document Type Selection */}
                        {formData.documentRequired && (
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1">
                                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                    Link to Document Type <span className="text-rose-500">*</span>
                                    <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        Auto-syncs settings
                                    </span>
                                </label>
                                <div className="flex gap-2">
                                    <select
                                        value={formData.documentTypeId || ""}
                                        onChange={(e) => handleDocumentTypeChange(e.target.value)}
                                        className="flex-1 h-10 px-3 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="">Select a document type...</option>
                                        {availableDocuments
                                            .filter(doc => doc.status === 'Active')
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
            </div>

            {/* Add Document Modal */}
            <Dialog open={isAddDocModalOpen} onOpenChange={setIsAddDocModalOpen}>
                <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
                    <div className="h-full flex flex-col">
                        <DocumentTypeEditor
                            initialData={null}
                            onSave={handleSaveNewDocument}
                            onCancel={() => setIsAddDocModalOpen(false)}
                            defaultRelatedTo={(formData.entityType || 'Asset').toLowerCase() as any}
                            showHeader={true} 
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
