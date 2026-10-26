import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TicketStatus } from './tickets.data';

// ─────────────────────────────────────────────────────────────────────────────
// A ticket's status, read and changed in the same place.
//
// The list showed a pill and the page showed a pill, and changing the status meant opening
// the edit form. The pill is now the control — in the row, in the page header, in the Money
// & status card — and whoever renders it saves the change.
// ─────────────────────────────────────────────────────────────────────────────

export const TICKET_STATUSES: TicketStatus[] = ['Due', 'In Court', 'Paid', 'Closed'];

export const TICKET_STATUS_TONE: Record<TicketStatus, { chip: string; dot: string }> = {
    'Due':      { chip: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
    'In Court': { chip: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
    'Paid':     { chip: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
    'Closed':   { chip: 'border-slate-200 bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

export function TicketStatusSelect({ value, onChange, size = 'sm', className }: {
    value: TicketStatus; onChange: (next: TicketStatus) => void; size?: 'sm' | 'md'; className?: string;
}) {
    const tone = TICKET_STATUS_TONE[value] ?? TICKET_STATUS_TONE.Closed;
    return (
        <span className={cn('relative inline-flex items-center', className)} onClick={(e) => e.stopPropagation()}>
            <span className={cn('pointer-events-none absolute left-2.5 rounded-full', size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5', tone.dot)} />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value as TicketStatus)}
                aria-label="Ticket status"
                title="Change status"
                className={cn(
                    'cursor-pointer appearance-none rounded-full border font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-blue-500/30',
                    size === 'md' ? 'h-8 pl-6 pr-8 text-[11px]' : 'h-6 pl-5 pr-6 text-[10px]',
                    tone.chip,
                )}
            >
                {TICKET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={size === 'md' ? 13 : 11} className="pointer-events-none absolute right-2 opacity-60" />
        </span>
    );
}
