import { useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { HOS_TRAINING_TYPES } from '@/pages/hos/hos-violations.data';

/**
 * "Assign training" — the course picker a review opens when that resolution is chosen.
 *
 * Shared so a ticket and an accident assign training the same way an HOS violation and a
 * safety event already do: the same course list, the same wording, the same two buttons.
 */
export function TrainingAssignDialog({ count, courses = HOS_TRAINING_TYPES, onClose, onAssign }: {
    /** Drivers affected — the copy reads differently for one than for many. */
    count: number;
    courses?: readonly string[];
    onClose: () => void;
    onAssign: (name: string) => void;
}) {
    const [name, setName] = useState(courses[0] ?? '');
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600"><GraduationCap size={18} /></div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">Assign training</h3>
                        <p className="text-[13px] text-slate-500">
                            Assign a training course to {count === 1 ? 'this driver' : <span className="font-semibold text-slate-700">{count} drivers</span>}.
                        </p>
                    </div>
                </div>
                <div className="px-5 py-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Training course</label>
                    <select value={name} onChange={e => setName(e.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        {courses.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onAssign(name)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-violet-700"><GraduationCap size={15} /> Assign training</button>
                </div>
            </div>
        </div>
    );
}
