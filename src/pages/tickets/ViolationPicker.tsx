import { useMemo } from 'react';
import { Check, X, Plus } from 'lucide-react';
import { Combobox } from '@/components/ui/combobox';
import { VIOLATION_DATA } from '@/data/violations.data';
import { ALL_VIOLATIONS } from '@/pages/violations/violations-list.data';
import type { TicketViolation } from './tickets.data';
import { CHARGE_PRESETS, violationFromCharge, narrowTypeFor } from './violation-presets';

/**
 * The Add-Ticket "Violation Type" picker, as a self-contained component so the
 * exact same UI is used on the ticket form AND the hiring / Add-Driver Traffic
 * Violation form. Quick charge presets (mapped to real SMS codes) + a searchable
 * SMS/CVOR code list, both feeding one removable multi-violation list.
 */
export function ViolationPicker({
    value,
    onChange,
    isCanada = false,
    label = 'Violation Type',
    hint = '· select all that apply, a violation can have multiple charges',
}: {
    value: TicketViolation[];
    onChange: (violations: TicketViolation[]) => void;
    isCanada?: boolean;
    label?: string;
    hint?: string;
}) {
    const violations = value ?? [];

    const violationOptions = useMemo(() => {
        if (isCanada) {
            return Object.values(VIOLATION_DATA.categories)
                .flatMap(cat => cat.items)
                .filter(item => item.canadaEnforcement)
                .map(item => ({
                    value: item.canadaEnforcement!.code,
                    label: `[${item.canadaEnforcement!.code}] ${item.canadaEnforcement!.descriptions?.full || item.violationDescription}`,
                    description: `${item.canadaEnforcement!.category || item.violationGroup} · CVOR/NSC`,
                }));
        }
        return ALL_VIOLATIONS.map(v => ({
            value: v.id,
            label: `[${v.violationCode}] ${v.violationDescription}`,
            description: `${v.violationGroup} · SMS`,
        }));
    }, [isCanada]);

    const togglePreset = (charge: string) => {
        const exists = violations.some(v => v.source === 'preset' && v.label === charge);
        if (exists) onChange(violations.filter(v => !(v.source === 'preset' && v.label === charge)));
        else onChange([...violations, violationFromCharge(charge)]);
    };

    const addViolation = (v: TicketViolation) => {
        if (v.dataId && violations.some(x => x.dataId === v.dataId)) return;
        if (violations.some(x => x.label === v.label && x.code === v.code)) return;
        onChange([...violations, v]);
    };

    const removeViolation = (idx: number) => onChange(violations.filter((_, i) => i !== idx));

    return (
        <div className="space-y-3.5 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {label} <span className="font-normal normal-case tracking-normal text-slate-400">{hint}</span>
            </label>

            {/* 1) Quick charge presets — click to add/remove as a violation */}
            <div className="flex flex-wrap gap-2">
                {CHARGE_PRESETS.map(charge => {
                    const active = violations.some(v => v.source === 'preset' && v.label === charge);
                    return (
                        <button
                            key={charge}
                            type="button"
                            aria-pressed={active}
                            onClick={() => togglePreset(charge)}
                            className={
                                'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ' +
                                (active
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700')
                            }
                        >
                            {active && <Check size={13} className="text-blue-600" />}
                            {charge}
                        </button>
                    );
                })}
            </div>

            {/* 2) Or search a specific SMS/CVOR code — adds to the list */}
            <div>
                <div className="mb-2 flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">or add a specific code</span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>
                <Combobox
                    options={violationOptions}
                    value=""
                    onValueChange={(val: string) => {
                        if (!val) return;
                        if (isCanada) {
                            for (const [catKey, cat] of Object.entries(VIOLATION_DATA.categories)) {
                                const v = cat.items.find(item => item.canadaEnforcement?.code === val);
                                if (!v) continue;
                                const subtype = v.canadaEnforcement!.descriptions?.full || v.violationDescription;
                                const categoryLabel = (cat as any).label ?? catKey.replace(/_/g, ' ');
                                addViolation({
                                    label: subtype,
                                    type: narrowTypeFor(subtype, v.canadaEnforcement!.category || v.violationGroup),
                                    subtype,
                                    category: categoryLabel,
                                    group: v.violationGroup,
                                    code: v.canadaEnforcement!.code,
                                    isOos: !!v.isOos,
                                    source: 'sms',
                                    dataId: v.id,
                                });
                                break;
                            }
                        } else {
                            for (const [catKey, cat] of Object.entries(VIOLATION_DATA.categories)) {
                                const v = cat.items.find(item => item.id === val);
                                if (!v) continue;
                                const categoryLabel = (cat as any).label ?? catKey.replace(/_/g, ' ');
                                addViolation({
                                    label: v.violationDescription,
                                    type: narrowTypeFor(v.violationDescription, v.violationGroup),
                                    subtype: v.violationDescription,
                                    category: categoryLabel,
                                    group: v.violationGroup,
                                    code: v.violationCode,
                                    isOos: !!v.isOos,
                                    source: 'sms',
                                    dataId: v.id,
                                });
                                break;
                            }
                        }
                    }}
                    placeholder={isCanada ? 'Search Canadian violation code...' : 'Search SMS violation code...'}
                    searchPlaceholder={isCanada ? 'Search CVOR/NSC violations...' : 'Search SMS violations...'}
                    className="w-full bg-white"
                />
            </div>

            {/* 3) Selected violations — the multiple charges */}
            {violations.length > 0 ? (
                <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500">Selected violations · {violations.length}</p>
                    {violations.map((v, idx) => (
                        <div key={`${v.source}-${v.label}-${idx}`} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {idx === 0 && (
                                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white">Primary</span>
                                    )}
                                    <span className="text-[13px] font-semibold text-slate-800">{v.label}</span>
                                    {v.code && <span className="text-[10px] font-mono text-slate-400">code {v.code}</span>}
                                </div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                    {v.category && (
                                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">{v.category}</span>
                                    )}
                                    {v.group && (
                                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">{v.group}</span>
                                    )}
                                    {v.isOos && (
                                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">OOS-qualifying</span>
                                    )}
                                    <span className="text-[10px] text-slate-400">{v.source === 'preset' ? 'Charge' : 'SMS code'}</span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeViolation(idx)}
                                title="Remove"
                                className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/70 px-3 py-2.5 text-[12px] text-slate-400">
                    <Plus size={14} className="text-slate-300" /> No violations yet — pick a charge above or search a code.
                </div>
            )}
        </div>
    );
}
