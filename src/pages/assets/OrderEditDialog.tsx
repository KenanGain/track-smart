// ─────────────────────────────────────────────────────────────────────────────
// OrderEditDialog — change what has not happened yet on a work order.
//
// "Edit" on a work order used to do nothing at all, which is worse than not offering it.
// What it edits is deliberately narrow: an order's work is its jobs, and adding or
// dropping those is a different order, not an edit of this one. What can honestly change
// is what it is called, who is doing it, when it is wanted and the note that goes with it.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import type { TaskOrder } from './maintenance.data';
import { cn } from '@/lib/utils';

export function OrderEditDialog({
    order, suggestedName, vendors, onClose, onSave,
}: {
    order: TaskOrder;
    /** What the order is called when nobody has named it — shown as the placeholder. */
    suggestedName: string;
    vendors: { id: string; name: string; companyName?: string }[];
    onClose: () => void;
    onSave: (patch: { name?: string; vendorId?: string; dueDate?: string; notes?: string }) => void;
}) {
    const [name, setName] = useState(order.name ?? '');
    const [vendorId, setVendorId] = useState(order.vendorId);
    const [dueDate, setDueDate] = useState(order.dueDate ? order.dueDate.slice(0, 10) : '');
    const [notes, setNotes] = useState(order.notes ?? '');

    const label = (v: { name: string; companyName?: string }) => v.companyName || v.name;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
            {/* Header and footer stay put; only the middle scrolls. */}
            <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Pencil size={15} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">Edit work order</h3>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                {suggestedName}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Order name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={suggestedName}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                            Left empty it is named after its own work and unit.
                        </p>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Vendor
                        </label>
                        <Combobox
                            value={vendorId}
                            onValueChange={setVendorId}
                            placeholder="Pick a vendor"
                            searchPlaceholder="Search vendors..."
                            options={vendors.map((v) => ({ value: v.id, label: label(v) }))}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Wanted by
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Note for the shop
                        </label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Anything the shop should know"
                            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                        />
                    </div>

                    <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
                        The work on this order is not edited here. Adding or dropping jobs is a different
                        order, so what the shop was told it is doing cannot change under it.
                    </p>
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave({
                            name: name.trim() || undefined,
                            vendorId,
                            dueDate: dueDate || undefined,
                            notes: notes.trim() || undefined,
                        })}
                        className={cn('h-9 rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors',
                            'bg-blue-600 hover:bg-blue-700')}
                    >
                        Save changes
                    </button>
                </div>
            </div>
        </div>
    );
}
