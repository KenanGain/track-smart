import type { LucideIcon } from 'lucide-react';

/**
 * Empty state used by the list-based tabs (Consent Forms, Application Forms,
 * Documents) when nothing has been added yet. One look, one location.
 */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                <Icon className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">{description}</p>
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
