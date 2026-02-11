import { useState, useRef, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText } from 'lucide-react';
import { INITIAL_EXPENSE_TYPES, type AssetExpense, type ExpenseEntityType } from '@/pages/settings/expenses.data';

interface AddExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (expense: AssetExpense) => void;
    assetId: string;
    preSelectedDate?: string;
    entityType?: ExpenseEntityType;
}

export function AddExpenseModal({ isOpen, onClose, onSave, assetId, preSelectedDate, entityType = 'Asset' }: AddExpenseModalProps) {
    const [expenseTypeId, setExpenseTypeId] = useState<string>("");
    
    // Filter types based on entity context
    const availableTypes = INITIAL_EXPENSE_TYPES.filter(t => t.entityType === entityType);

    // Form State
    const [amount, setAmount] = useState<string>("");
    const [currency, setCurrency] = useState<"USD" | "CAD">("USD");
    const [date, setDate] = useState<string>(preSelectedDate || new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState<string>("");

    // Recurring State
    const [isRecurring, setIsRecurring] = useState<boolean>(false);
    const [frequency, setFrequency] = useState<string>("monthly");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");

    // Document State
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [document, setDocument] = useState<File | null>(null);

    // Derived Logic
    const selectedType = availableTypes.find(t => t.id === expenseTypeId);
    
    useEffect(() => {
        if (selectedType) {
            setIsRecurring(selectedType.isRecurring && selectedType.subCategory === 'recurring');
            if (selectedType.frequency) setFrequency(selectedType.frequency);
        }
    }, [expenseTypeId, selectedType]);

    // Set default recurrence start to expense date when enabled
    useEffect(() => {
        if (isRecurring && !startDate) {
            setStartDate(date);
        }
    }, [isRecurring, date]);

    const handleSave = () => {
        if (!assetId || !expenseTypeId) return;
        
        // Validation: Check if document is required
        if (selectedType?.documentRequired && !document) {
            alert("A receipt/document is required for this expense type."); // Simple alert or toast replacement
            return;
        }

        const newExpense: AssetExpense = {
            id: `exp_${Math.random().toString(36).substr(2, 9)}`,
            assetId,
            expenseTypeId: expenseTypeId,
            amount: parseFloat(amount),
            currency,
            date,
            isRecurring,
            frequency: isRecurring ? (frequency as any) : undefined,
            recurrenceStartDate: isRecurring ? startDate : undefined,
            recurrenceEndDate: isRecurring ? endDate : undefined,
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
        setStartDate("");
        setEndDate("");
        setExpenseTypeId("");
        setDocument(null);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">Add New Expense</h3>
                        <p className="text-xs text-slate-500">Record a new cost for this {entityType.toLowerCase()}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                    
                    {/* Expense Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Expense Type</label>
                        <select 
                            value={expenseTypeId} 
                            onChange={(e) => setExpenseTypeId(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select type...</option>
                            {availableTypes.map(type => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Amount */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400">
                                    <DollarSign className="w-4 h-4" />
                                </span>
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0.00"
                                />
                                <select 
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as "USD" | "CAD")}
                                    className="absolute right-1 top-1 bottom-1 bg-slate-100 text-xs font-bold px-2 rounded border-l border-slate-200 outline-none"
                                >
                                    <option value="USD">USD</option>
                                    <option value="CAD">CAD</option>
                                </select>
                            </div>
                        </div>

                         {/* Date */}
                         <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Date {selectedType?.dateRequired && <span className="text-red-500 ml-0.5">*</span>}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400">
                                    <Calendar className="w-4 h-4" />
                                </span>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Recurring Options */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input 
                                type="checkbox" 
                                checked={isRecurring}
                                onChange={(e) => setIsRecurring(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-semibold text-slate-800">Recurring Expense?</span>
                        </label>
                        
                        {isRecurring && (
                            <div className="grid grid-cols-2 gap-3 pl-6 animate-in fade-in slide-in-from-top-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Frequency</label>
                                    <select 
                                        value={frequency}
                                        onChange={(e) => setFrequency(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                                    >
                                        <option value="weekly">Weekly</option>
                                        <option value="bi-weekly">Bi-Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="quarterly">Quarterly</option>
                                        <option value="annually">Annually</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                                    <input 
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">End Date (Opt)</label>
                                    <input 
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Notes</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
                            placeholder="Add details..."
                        />
                    </div>

                    {/* Document Upload */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">
                            Attach Receipt/Document
                            {selectedType?.documentRequired && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${selectedType?.documentRequired && !document ? 'border-amber-300 bg-amber-50 hover:border-amber-400' : 'border-slate-300 hover:bg-slate-50 hover:border-blue-400'}`}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                onChange={(e) => setDocument(e.target.files?.[0] || null)}
                            />
                            {document ? (
                                <div className="flex items-center gap-2 text-blue-600 font-medium">
                                    <FileText className="w-5 h-5" />
                                    <span>{document.name}</span>
                                </div>
                            ) : (
                                <>
                                    <span className="text-slate-400 mb-1">Click to upload</span>
                                    <span className="text-xs text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
                                </>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={!amount || !expenseTypeId}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Save Expense
                    </button>
                </div>
            </div>
        </div>
    );
}
