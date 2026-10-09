// ─────────────────────────────────────────────────────────────────────────────
// ServiceIntervalFields — how often a service comes round, asked the same way
// everywhere it is asked.
//
// Three clocks, because a fleet does not run on one: oil goes by distance, a reefer
// by the hours its engine actually turned, an annual inspection by the calendar.
// Any mix is valid and whichever comes first is what falls due.
//
// Two screens ask this — the service-type catalog (the DEFAULT for a service) and
// Create Service Intervals (what THIS schedule actually runs on) — so it is one
// component. The second one starts from the first's answer.
// ─────────────────────────────────────────────────────────────────────────────

import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { DistanceUnit, ServiceIntervals } from '@/types/service-types';

/**
 * The rows as a FORM holds them: a tick and a figure each, kept even while the tick is
 * off. Unticking a row and reticking it should not make you retype the number you were
 * just looking at, and a row that is off writes nothing when you save.
 */
export type IntervalDraft = {
    mileage: { on: boolean; every: number; unit: DistanceUnit };
    engineHours: { on: boolean; every: number };
    days: { on: boolean; every: number };
};

export const EMPTY_INTERVALS: IntervalDraft = {
    mileage: { on: false, every: 0, unit: 'miles' },
    engineHours: { on: false, every: 0 },
    days: { on: false, every: 0 },
};

export const toDraft = (i?: ServiceIntervals): IntervalDraft => ({
    mileage: { on: !!i?.mileage, every: i?.mileage?.every ?? 0, unit: i?.mileage?.unit ?? 'miles' },
    engineHours: { on: !!i?.engineHours, every: i?.engineHours?.every ?? 0 },
    days: { on: !!i?.days, every: i?.days?.every ?? 0 },
});

/**
 * A ticked row with nothing in it is not an interval, so it is dropped rather than
 * stored as "every 0" — which reads as due forever, on every asset, from the moment it
 * is saved.
 */
export const fromDraft = (d: IntervalDraft): ServiceIntervals | undefined => {
    const out: ServiceIntervals = {};
    if (d.mileage.on && d.mileage.every > 0) out.mileage = { every: d.mileage.every, unit: d.mileage.unit };
    if (d.engineHours.on && d.engineHours.every > 0) out.engineHours = { every: d.engineHours.every };
    if (d.days.on && d.days.every > 0) out.days = { every: d.days.every };
    return Object.keys(out).length ? out : undefined;
};

/** Whether anything at all has been set — for a caller that wants to require one. */
export const hasInterval = (d: IntervalDraft) => fromDraft(d) !== undefined;

const INPUT = 'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-right text-sm tabular-nums text-slate-900 ' +
    'outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ' +
    'disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ' +
    '[appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none';

export function ServiceIntervalFields({ value, onChange, className }: {
    value: IntervalDraft;
    onChange: (next: IntervalDraft) => void;
    className?: string;
}) {
    return (
        <div className={cn('overflow-hidden rounded-lg border border-slate-200 bg-white', className)}>
            <Row
                label="Interval by mileage"
                on={value.mileage.on}
                onToggle={(on) => onChange({ ...value, mileage: { ...value.mileage, on } })}
                every={value.mileage.every}
                onEvery={(every) => onChange({ ...value, mileage: { ...value.mileage, every } })}
                unit={
                    // The unit travels with the figure rather than coming from a global
                    // setting: a carrier running both sides of the border has trucks in
                    // miles and trailers in km, and reading 12,000 as the other one is a
                    // service half a year out, either way.
                    <select
                        value={value.mileage.unit}
                        disabled={!value.mileage.on}
                        onChange={(e) => onChange({ ...value, mileage: { ...value.mileage, unit: e.target.value as DistanceUnit } })}
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                        <option value="miles">miles</option>
                        <option value="km">km</option>
                    </select>
                }
            />
            <Row
                label="Interval by engine hours"
                on={value.engineHours.on}
                onToggle={(on) => onChange({ ...value, engineHours: { ...value.engineHours, on } })}
                every={value.engineHours.every}
                onEvery={(every) => onChange({ ...value, engineHours: { ...value.engineHours, every } })}
                unit={<UnitLabel on={value.engineHours.on}>hours</UnitLabel>}
            />
            <Row
                label="Interval by days"
                on={value.days.on}
                onToggle={(on) => onChange({ ...value, days: { ...value.days, on } })}
                every={value.days.every}
                onEvery={(every) => onChange({ ...value, days: { ...value.days, every } })}
                unit={<UnitLabel on={value.days.on}>days</UnitLabel>}
                last
            />
        </div>
    );
}

function UnitLabel({ on, children }: { on: boolean; children: React.ReactNode }) {
    return <span className={cn('text-sm', on ? 'text-slate-600' : 'text-slate-400')}>{children}</span>;
}

/**
 * One row. The figure and the unit sit in fixed columns so the three line up as a column
 * of numbers rather than three rows that each end somewhere different.
 */
function Row({ label, on, onToggle, every, onEvery, unit, last }: {
    label: string;
    on: boolean;
    onToggle: (on: boolean) => void;
    every: number;
    onEvery: (v: number) => void;
    unit: React.ReactNode;
    last?: boolean;
}) {
    return (
        <div className={cn(
            'flex items-center gap-3 px-3 py-2.5 transition-colors',
            !last && 'border-b border-slate-200',
            on && 'bg-blue-50/40',
        )}>
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <Checkbox checked={on} onCheckedChange={onToggle} />
                <span className={cn('truncate text-sm', on ? 'font-medium text-slate-900' : 'text-slate-500')}>{label}</span>
            </label>
            <div className="w-28 shrink-0">
                <input
                    type="number"
                    min={0}
                    value={every || ''}
                    disabled={!on}
                    onChange={(e) => onEvery(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    aria-label={label}
                    className={INPUT}
                />
            </div>
            <div className="w-[76px] shrink-0">{unit}</div>
        </div>
    );
}
