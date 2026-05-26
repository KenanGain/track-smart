/**
 * Unified count strip used in every tab's PageHeader so totals and breakdowns
 * read the same way across Branding, Consent Forms, Application Forms, and
 * Documents.
 */

interface Stat {
    label: string;
    value: number;
    tone?: 'default' | 'muted' | 'accent' | 'success';
}

const TONES: Record<NonNullable<Stat['tone']>, string> = {
    default: 'text-slate-700',
    muted:   'text-slate-500',
    accent:  'text-blue-600',
    success: 'text-emerald-600',
};

export function StatStrip({ stats }: { stats: Stat[] }) {
    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {stats.map((s, i) => (
                <span key={s.label} className="inline-flex items-center gap-1.5">
                    {i > 0 && <span className="text-slate-300">·</span>}
                    <span className={`font-semibold ${TONES[s.tone ?? 'default']}`}>{s.value}</span>
                    <span>{s.label}</span>
                </span>
            ))}
        </div>
    );
}
