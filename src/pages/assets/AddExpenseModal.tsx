import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_EXPENSE_TYPES, type AssetExpense, type ExpenseType, type ExpenseFrequency } from '@/pages/settings/expenses.data';

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: AssetExpense) => void;
    assetId: string | undefined;
}

export function AddExpenseModal({ isOpen, onClose, onSave, assetId }: AddExpenseModalProps) {
    const [expenseTypes] = useState<ExpenseType[]>(INITIAL_EXPENSE_TYPES);
    const [selectedTypeId, setSelectedTypeId] = useState<string>("");
    
    // Form State
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<ExpenseFrequency | "">("");
    const [recurrenceStart, setRecurrenceStart] = useState("");
    const [recurrenceEnd, setRecurrenceEnd] = useState("");
    const [notes, setNotes] = useState("");
    const [document, setDocument] = useState<File | null>(null);

    // Derived Logic
    const selectedType = expenseTypes.find(t => t.id === selectedTypeId);
    const isMaintenance = selectedType?.isSystem; // Should not happen in manual add, but good safety

    useEffect(() => {
        if (selectedType) {
            setIsRecurring(selectedType.isRecurringAllowed && selectedType.category === 'Recurring');
            if (selectedType.defaultFrequency) setFrequency(selectedType.defaultFrequency);
        }
    }, [selectedTypeId, selectedType]);

    // Set default recurrence start to expense date when enabled
    useEffect(() => {
        if (isRecurring && !recurrenceStart) {
            setRecurrenceStart(date);
        }
    }, [isRecurring, date]);

    const handleSave = () => {
        if (!assetId || !selectedTypeId) return;

        const newExpense: AssetExpense = {
            id: `exp_${Math.random().toString(36).substr(2, 9)}`,
            assetId,
            expenseTypeId: selectedTypeId,
            amount: parseFloat(amount),
            currency,
            date,
            isRecurring,
            frequency: isRecurring ? (frequency as ExpenseFrequency) : undefined,
            recurrenceStartDate: isRecurring ? recurrenceStart : undefined,
            recurrenceEndDate: isRecurring ? recurrenceEnd : undefined,
            source: 'manual',
            notes,
            documentUrl: document ? 'mock_url_document.pdf' : undefined
        };

        onSave(newExpense);
        resetForm();
    };

    const resetForm = () => {
        setAmount("");
        setCurrency("USD");
        setDate(new Date().toISOString().split('T')[0]);
        setNotes("");
        setIsRecurring(false);
        setFrequency("");
        setRecurrenceStart("");
        setRecurrenceEnd("");
        setSelectedTypeId("");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Add New Expense</h3>
                        <p className="text-xs text-slate-500">Record a new cost for this asset</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {/* Expense Type */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expense Type</label>
                        <select 
                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            value={selectedTypeId}
                            onChange={(e) => setSelectedTypeId(e.target.value)}
                        >
                            <option value="">Select an expense type...</option>
                            {expenseTypes.filter(t => !t.isSystem).map(type => (
                                <option key={type.id} value={type.id}>
                                    {type.name} ({type.category})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                        {/* Amount & Currency */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <DollarSign size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input 
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="w-24 px-2 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")}
                                >
                                    <option value="USD">USD</option>
                                    <option value="CAD">CAD</option>
                                </select>
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                            <div className="relative">
                                <Calendar size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input 
                                    type="date"
                                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Sections based on Type */}
                    {selectedType && (
                        <div className="space-y-4 pt-2 border-t border-slate-100 animate-in slide-in-from-top-2">
                             {/* Recurring Toggle */}
                            {selectedType.isRecurringAllowed && (
                                <div className="bg-purple-50 p-4 rounded-lg flex flex-col gap-3 border border-purple-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-purple-100 text-purple-600 rounded">
                                                <Calendar size={14} />
                                            </div>
                                            <label className="text-sm font-semibold text-purple-900 cursor-pointer select-none" htmlFor="recurring-toggle">
                                                Recurring Expense
                                            </label>
                                        </div>
                                        <input 
                                            id="recurring-toggle"
                                            type="checkbox"
                                            checked={isRecurring}
                                            onChange={(e) => setIsRecurring(e.target.checked)}
                                            className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-600"
                                        />
                                    </div>
                                    
                                    {isRecurring && (
                                        <div className="ml-9 animate-in fade-in">
                                            <label className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">Frequency</label>
                                            <select 
                                                className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                value={frequency}
                                                onChange={(e) => setFrequency(e.target.value as ExpenseFrequency)}
                                            >
                                                <option value="Monthly">Monthly</option>
                                                <option value="Annual">Annual</option>
                                            </select>
                                        </div>
                                    )}

                                    {isRecurring && (
                                        <div className="grid grid-cols-2 gap-4 ml-9 animate-in fade-in">
                                            <div>
                                                <label className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">Start Date</label>
                                                <input 
                                                    type="date"
                                                    className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                    value={recurrenceStart}
                                                    onChange={(e) => setRecurrenceStart(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-purple-700 uppercase tracking-wider mb-1">End Date (Optional)</label>
                                                <input 
                                                    type="date"
                                                    className="w-full px-2 py-1.5 bg-white border border-purple-200 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                                    value={recurrenceEnd}
                                                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Document Upload */}
                            {selectedType.requiresDocument && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                     <div className="flex items-center gap-2 mb-3">
                                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                                            <FileText size={14} />
                                        </div>
                                        <span className="text-sm font-semibold text-blue-900">Required Document</span>
                                    </div>
                                    <div className="border-2 border-dashed border-blue-200 rounded-lg p-6 bg-white flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 transition-colors group">
                                         <div className="p-2 bg-blue-50 rounded-full mb-2 group-hover:scale-110 transition-transform">
                                            <FileText size={20} className="text-blue-400" />
                                         </div>
                                         <span className="text-xs font-semibold text-blue-600">Click to upload receipt/invoice</span>
                                         <span className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG up to 5MB</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Notes</label>
                        <textarea 
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none h-20 resize-none"
                            placeholder="Add any additional details..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600">Cancel</Button>
                    <Button 
                        onClick={handleSave} 
                        disabled={!selectedTypeId || !amount || (selectedType?.requiresDocument && !document && false) /* disable doc check for mock */}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200"
                    >
                        Save Expense
                    </Button>
                </div>
            </div>
        </div>
    );
}
