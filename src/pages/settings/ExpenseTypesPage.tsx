import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, DollarSign, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_EXPENSE_TYPES, type ExpenseType, type ExpenseCategory, type ExpenseFrequency } from './expenses.data';

// --- Components ---

const Badge = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${className}`}>
        {children}
    </span>
);

export const ExpenseTypesPage = () => {
    // --- State ---
    const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(INITIAL_EXPENSE_TYPES);
    const [isModalOpen, setIsModalOpen] = useState(false);
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
        setIsModalOpen(false);
        setEditingType(null);
    };

    const openModal = (type?: ExpenseType) => {
        setEditingType(type || null);
        setIsModalOpen(true);
    };

    // --- Filtered Data ---
    const filteredTypes = expenseTypes.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <Button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
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
                                <th className="px-6 py-4">Category</th>
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
                                            {type.isSystem && <div className="p-1 bg-slate-100 rounded text-slate-500"><DollarSign size={14} /></div>}
                                            {type.name}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className={
                                            type.category === 'Operational' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                            type.category === 'Compliance' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                            type.category === 'Recurring' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                            'bg-slate-100 text-slate-700'
                                        }>{type.category}</Badge>
                                    </td>
                                    <td className="px-6 py-4 space-y-1">
                                        {type.isRecurringAllowed && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Check size={12} className="text-green-600" /> Recurring ({type.defaultFrequency || 'Custom'})
                                            </div>
                                        )}
                                        {type.requiresDocument && (
                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Check size={12} className="text-green-600" /> Document Required
                                            </div>
                                        )}
                                        {!type.isRecurringAllowed && !type.requiresDocument && <span className="text-slate-400 text-xs">-</span>}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{type.description || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => openModal(type)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                disabled={type.isSystem} // Prevent editing system types for now (or minimal edits)
                                                title={type.isSystem ? "System types cannot be fully edited" : "Edit"}
                                            >
                                                <Edit2 size={16} className={type.isSystem ? "opacity-50" : ""} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(type.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                disabled={type.isSystem}
                                            >
                                                <Trash2 size={16} className={type.isSystem ? "opacity-50" : ""} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <ExpenseTypeModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    initialData={editingType}
                />
            )}
        </div>
    );
};

// --- Modal Component ---

const ExpenseTypeModal = ({ isOpen, onClose, onSave, initialData }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (data: ExpenseType) => void; 
    initialData: ExpenseType | null 
}) => {
    const [formData, setFormData] = useState<Partial<ExpenseType>>(initialData || {
        name: "",
        category: "Operational",
        isRecurringAllowed: false,
        requiresDocument: false,
        isSystem: false,
        description: ""
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-900">{initialData ? 'Edit Expense Type' : 'New Expense Type'}</h3>
                    <button onClick={onClose}><AlertCircle size={20} className="text-slate-400 hover:text-slate-600 rotate-45" /></button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input 
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Tolls"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select 
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                            value={formData.category}
                            onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                        >
                            <option value="Operational">Operational</option>
                            <option value="Compliance">Compliance</option>
                            <option value="Recurring">Recurring</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-3 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={formData.isRecurringAllowed}
                                onChange={e => setFormData(prev => ({ ...prev, isRecurringAllowed: e.target.checked }))}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                            />
                            <span className="text-sm text-slate-700">Allow Recurring Schedule</span>
                        </label>
                        
                        {formData.isRecurringAllowed && (
                            <div className="ml-6">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Default Frequency</label>
                                <select 
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded-md text-sm"
                                    value={formData.defaultFrequency || ""}
                                    onChange={e => setFormData(prev => ({ ...prev, defaultFrequency: e.target.value as ExpenseFrequency }))}
                                >
                                    <option value="">No Default</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Annual">Annual</option>
                                </select>
                            </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={formData.requiresDocument}
                                onChange={e => setFormData(prev => ({ ...prev, requiresDocument: e.target.checked }))}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                            />
                            <span className="text-sm text-slate-700">Require Document Upload</span>
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none h-20 resize-none"
                            value={formData.description || ""}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Optional description..."
                        />
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(formData as ExpenseType)} disabled={!formData.name}>Save</Button>
                </div>
            </div>
        </div>
    );
};
