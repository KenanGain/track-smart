import type { LucideIcon } from 'lucide-react';

/**
 * Shared page header for every Docu/Form Generator tab.
 *
 * Renders an optional accent icon, a title + description block on the left,
 * a right-aligned actions slot (search, add buttons, etc.), and an optional
 * stat strip below. Used by Branding, Consent Forms, Application Forms,
 * and Documents tabs so typography, spacing, and alignment stay consistent.
 */
export function PageHeader({ icon: Icon, title, description, stats, actions }: {
    icon?: LucideIcon;
    title: string;
    description?: string;
    /** Optional stat strip rendered below the title row. */
    stats?: React.ReactNode;
    /** Right-aligned actions slot (search field, Add button, etc.). */
    actions?: React.ReactNode;
}) {
    return (
        <div className="mb-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    {Icon && (
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <Icon className="h-4 w-4" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                        {description && (
                            <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{description}</p>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className="flex shrink-0 items-center gap-2">{actions}</div>
                )}
            </div>
            {stats && <div className="mt-4 pl-12">{stats}</div>}
        </div>
    );
}
