import * as React from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shared "wizard editor" chrome — the Add-New-Account page look: a white side
 * navigator ("Progress / Complete each section") + section cards with an icon
 * tile header. Used by AddAccountPage and the accident editor so both share the
 * exact same UI.
 */

export interface WizardStep {
    id: string;
    label: string;
    icon: React.ElementType;
}

/** White side panel with numbered step navigation. */
export function WizardStepNav({ steps, active, onGo, completionFor }: {
    steps: readonly WizardStep[];
    active: string;
    onGo: (id: string) => void;
    completionFor?: (id: string) => number;
}) {
    return (
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
            <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">Complete each section</p>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
                {steps.map((s, idx) => {
                    const Icon = s.icon;
                    const isActive = active === s.id;
                    const count = completionFor?.(s.id) ?? 0;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => onGo(s.id)}
                            className={cn(
                                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all',
                                isActive ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30' : 'text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            <span className={cn(
                                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                isActive ? 'bg-blue-600 text-white' : count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                            )}>
                                {count > 0 && !isActive ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                            </span>
                            <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                            <span className="flex-1 text-sm font-semibold">{s.label}</span>
                            {count > 0 && (
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{count}</span>
                            )}
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

/** Section header bar — icon tile + title + subtitle + optional right slot. */
export function WizardSectionHeader({ icon: Icon, title, subtitle, right }: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Icon className="h-5 w-5" /></div>
                <div>
                    <h4 className="text-base font-bold text-slate-900">{title}</h4>
                    {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
                </div>
            </div>
            {right}
        </div>
    );
}

/** A full section card (header + padded body). Sets `id="section-<id>"` + `data-step` for scroll-spy. */
export function WizardSection({ id, icon, title, subtitle, right, children }: {
    id: string;
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section data-step={id} id={`section-${id}`} className="scroll-mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <WizardSectionHeader icon={icon} title={title} subtitle={subtitle} right={right} />
            <div className="p-6">{children}</div>
        </section>
    );
}

/** Page header — back link + icon tile + title + subtitle + actions. */
export function WizardHeader({ backLabel, onBack, icon: Icon, title, subtitle, actions }: {
    backLabel: string;
    onBack: () => void;
    icon: React.ElementType;
    title: string;
    subtitle?: React.ReactNode;
    actions?: React.ReactNode;
}) {
    return (
        <div className="border-b border-slate-200/60 bg-white px-6 pb-5 pt-6 shadow-sm">
            <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-blue-600">
                <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
            </button>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Icon className="h-6 w-6" /></div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
                    </div>
                </div>
                {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
            </div>
        </div>
    );
}
