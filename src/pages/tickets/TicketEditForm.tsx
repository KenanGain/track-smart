/**
 * Ticket Add / Edit Form — dedicated form for the Tickets surface.
 *
 * Uses the shared "wizard editor" chrome (WizardHeader + white WizardStepNav
 * side panel + WizardSection cards) so it matches the Add Accident form's
 * section layout. The form CONTENT is unchanged from before — Driver & Asset,
 * Identifiers & Date, Location, Violation & Fine, and the per-doc-type Ticket
 * Documents — except the document uploads now use the shared multi-file drop
 * box (each ticket document carries a ticket number + date + one or more files).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Save, User as UserIcon, Truck, Clock, MapPin, Globe, FileText, Hash, Ticket, Check,
} from 'lucide-react';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS as MOCK_ASSETS } from '@/pages/assets/assets.data';
import { US_STATE_ABBREVS, CA_PROVINCE_ABBREVS } from '@/data/geo-data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { useAppData } from '@/context/AppDataContext';
import { WizardHeader, WizardStepNav, WizardSection, type WizardStep } from '@/components/ui/WizardEditor';
import { FileDropZone, type DropFile } from '@/components/compliance/FileDropZone';
import { useAccidentRecords } from '@/data/accident-records.data';
import type { TicketIdentifiers, TicketViolation } from './tickets.data';
import { PENALTY_OPTIONS } from './violation-presets';
import { ViolationPicker } from './ViolationPicker';

// ── Shape of the working draft ─────────────────────────────────────────────
// Tickets store the location as one string but we edit it as structured
// fields. The form's internal shape carries both, plus a free-form
// `identifiers` map + the per-doc-toggle attachments.
export interface TicketFormDraft {
    id?: string;
    offenseNumber?: string;
    date?: string;        // YYYY-MM-DD
    time?: string;        // HH:MM
    driverId?: string;
    driverName?: string;
    assetId?: string;
    assetUnitNumber?: string;
    // Structured location
    locationStreet?: string;
    locationCity?: string;
    locationState?: string;
    locationZip?: string;
    locationCountry?: 'USA' | 'Canada';
    // Money
    fineAmount?: number;
    expenseAmount?: number;
    currency?: 'USD' | 'CAD';
    // Classification — `violationType` stays the narrow bucket (Speeding,
    // Overweight, …) used for badges/filters. `violationSubtype` is the
    // full descriptive text from the master chart, e.g. "Speeding 6–10 mph
    // over the limit". Both are surfaced in the list view's Type column.
    violationType?: string;
    violationSubtype?: string;
    // BASIC category + sub-category (group) from VIOLATION_DATA. Captured
    // when the user picks a violation from the Combobox so the chip strip
    // below the picker can echo what's actually selected — mirrors the
    // Violation form's Category / Sub-category strip exactly.
    violationCategory?: string;
    violationGroup?: string;
    // All violations/charges on the ticket (a ticket can have several). The
    // first entry is mirrored onto the flat violationType/… fields above.
    violations?: TicketViolation[];
    isOos?: boolean;
    // Explicit "was this ticket placed Out of Service?" answer (Yes/No).
    outOfService?: boolean;
    // Explicit "were you in a commercial vehicle?" answer (Yes/No).
    commercialVehicle?: boolean;
    // Penalty / fine types applied — "select all that apply" chips.
    penalties?: string[];
    // Demerit / points assessed for the violation.
    demeritPoints?: number;
    // Used to round-trip the FMCSA item id back into the Combobox value
    // on edit. Free-form because the master chart isn't a closed enum.
    violationDataId?: string;
    status?: string;
    /** Cross-reference to a linked Default Accident (its accident #). */
    accidentNumber?: string;
    // Identifiers — flat in the form, nested when written to TicketRecord
    identifiers?: TicketIdentifiers;
    // Documents
    attachedDocuments?: AttachedDoc[];
    // Assignment — retained on the type for store/back-compat (the form no
    // longer edits these).
    assignedToThirdParty?: boolean;
    assigneeName?: string;
    assigneeEmail?: string;
    assignmentNote?: string;
}

export interface AttachedDoc {
    id: string;
    docTypeId: string;
    docNumber: string;   // ticket number for this document
    issueDate: string;   // date for this document
    fileName: string;    // mirrors the first uploaded file (store compat)
    files?: DropFile[];  // one or more uploaded files
    extras?: {
        portalUrl?: string;
        qrReference?: string;
        eIssuingDevice?: string;
        officerName?: string;
        officerBadge?: string;
        courtLocation?: string;
        courtDate?: string;
    };
}

interface TicketEditFormProps {
    record: TicketFormDraft | null;
    accountId?: string;
    onClose: () => void;
    onSave: (draft: TicketFormDraft) => void;
}

// Doc-type ids that get a quick-toggle row in the Ticket Documents section.
// Each toggle on creates an entry; off removes it. (Electronic Ticket removed.)
const TOGGLE_DOC_TYPES = [
    'viol_ticket',
    'viol_summons',
    'viol_officer_report',
    'viol_fine_receipt',
    'viol_court_disposition',
] as const;

const TICKET_STATUS_OPTIONS = ['Due', 'In Court', 'Paid', 'Closed'] as const;

const STEPS: WizardStep[] = [
    { id: 'who', label: 'Driver & Asset', icon: UserIcon },
    { id: 'when', label: 'Identifiers & Date', icon: Clock },
    { id: 'where', label: 'Location', icon: MapPin },
    { id: 'what', label: 'Violation & Fine', icon: FileText },
    { id: 'docs', label: 'Ticket Documents', icon: Ticket },
];

/** Convert a native FileList into the drop-box's DropFile shape (name/size only). */
function toDropFiles(list: FileList | null): DropFile[] {
    if (!list) return [];
    return Array.from(list).map((f, i) => ({
        id: `tf-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        fileName: f.name,
        fileSize: f.size,
    }));
}

export const TicketEditForm = ({ record, accountId, onClose, onSave }: TicketEditFormProps) => {
    // Carrier-scoped roster — falls back to global mocks when no carrier is
    // active. For the demo Acme carrier (acct-001) the curated MOCK_DRIVERS
    // list is merged with the synthesized carrier fleet so historical ids
    // still resolve in the dropdown.
    const driversForCarrier = useMemo(() => {
        if (!accountId) return MOCK_DRIVERS;
        const carrierList = CARRIER_DRIVERS[accountId] ?? [];
        if (accountId === 'acct-001') {
            const seen = new Set<string>();
            return [...MOCK_DRIVERS, ...carrierList].filter(d => {
                if (seen.has(d.id)) return false;
                seen.add(d.id);
                return true;
            });
        }
        return carrierList.length > 0 ? carrierList : MOCK_DRIVERS;
    }, [accountId]);
    const assetsForCarrier = useMemo(() => {
        if (!accountId) return MOCK_ASSETS;
        const carrierList = CARRIER_ASSETS[accountId] ?? [];
        if (accountId === 'acct-001') {
            const seen = new Set<string>();
            return [...MOCK_ASSETS, ...carrierList].filter(a => {
                if (seen.has(a.id)) return false;
                seen.add(a.id);
                return true;
            });
        }
        return carrierList.length > 0 ? carrierList : MOCK_ASSETS;
    }, [accountId]);
    const carrierAccount = useMemo(
        () => (accountId ? getAccountById(accountId) : undefined),
        [accountId]
    );

    const { documents: allDocTypes } = useAppData();
    const violationDocTypes = useMemo(
        () => allDocTypes.filter(d => d.isViolationDoc && d.status === 'Active'),
        [allDocTypes]
    );

    // Existing accidents for this carrier — feed the "Accident #" autocomplete.
    const { records: accidentRecords } = useAccidentRecords(accountId);
    const accidentNumberOptions = useMemo(
        () => Array.from(new Set(accidentRecords.map(r => r.accidentNumber).filter(Boolean) as string[])),
        [accidentRecords]
    );

    const [draft, setDraft] = useState<TicketFormDraft>({});
    const [docs, setDocs] = useState<AttachedDoc[]>([]);

    useEffect(() => {
        const base: TicketFormDraft = record ?? {};
        // Back-compat: older tickets carry only the flat violationType/subtype
        // (no `violations[]`). Seed a single violation from those fields so the
        // multi-violation UI shows it and the primary-sync effect below keeps it
        // instead of wiping it. Gated so a brand-new ticket's placeholder default
        // type doesn't auto-add a phantom violation.
        let violations = base.violations;
        const hasRealViolation = !!(base.violationSubtype || base.violationCategory || (base.violationType && base.id));
        if ((!violations || violations.length === 0) && hasRealViolation) {
            violations = [{
                label: base.violationSubtype || base.violationType || 'Violation',
                type: base.violationType,
                subtype: base.violationSubtype,
                category: base.violationCategory,
                group: base.violationGroup,
                code: base.identifiers?.violationCode,
                isOos: base.isOos,
                source: base.violationDataId ? 'sms' : 'preset',
                dataId: base.violationDataId,
            }];
        }
        setDraft({
            currency: 'USD',
            locationCountry: 'USA',
            status: 'Due',
            ...base,
            violations,
            identifiers: { ...(base.identifiers ?? {}) },
        });
        setDocs(record?.attachedDocuments ?? []);
    }, [record]);

    const set = <K extends keyof TicketFormDraft>(key: K, value: TicketFormDraft[K]) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    // Toggle a "select all that apply" penalty / fine type.
    const togglePenalty = (penalty: string) => {
        setDraft(prev => {
            const current = prev.penalties ?? [];
            const next = current.includes(penalty)
                ? current.filter(p => p !== penalty)
                : [...current, penalty];
            return { ...prev, penalties: next };
        });
    };

    // Keep the flat primary fields mirrored to the first violation so the list
    // badge, filters and safety score (all single-value) stay correct.
    useEffect(() => {
        const first = draft.violations?.[0];
        setDraft(prev => ({
            ...prev,
            violationType: first?.type || first?.label || undefined,
            violationSubtype: first?.subtype || first?.label || undefined,
            violationCategory: first?.category || undefined,
            violationGroup: first?.group || undefined,
            isOos: first?.isOos,
            violationDataId: first?.source === 'sms' ? first?.dataId : undefined,
            identifiers: { ...(prev.identifiers ?? {}), violationCode: first?.code },
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft.violations]);

    const totalAmount = (draft.fineAmount ?? 0) + (draft.expenseAmount ?? 0);
    const stateOptions = draft.locationCountry === 'Canada' ? CA_PROVINCE_ABBREVS : US_STATE_ABBREVS;

    // The Violation Type picker (ViolationPicker) needs to know whether to offer
    // Canadian CVOR/NSC codes or US SMS codes.
    const isCanada = draft.locationCountry === 'Canada';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Stamp carrier identifiers at save (USDOT / CVOR / NSC / carrier id).
        const carrierIds: TicketIdentifiers = carrierAccount
            ? {
                usdotNumber:   carrierAccount.dotNumber || undefined,
                cvorNumber:    carrierAccount.cvorNumber || undefined,
                nscNumber:     carrierAccount.nscNumber || undefined,
                carrierNumber: carrierAccount.id || undefined,
            }
            : {};
        const merged: TicketFormDraft = {
            ...draft,
            identifiers: { ...(draft.identifiers ?? {}), ...carrierIds },
            attachedDocuments: docs,
        };
        onSave(merged);
    };

    // ── Section navigator: click-to-scroll + scroll-spy (inside the scroll pane) ──
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) { setActiveStep(STEPS[STEPS.length - 1].id); return; }
            const elTop = el.getBoundingClientRect().top;
            let cur = STEPS[0].id;
            for (const s of STEPS) {
                const sec = el.querySelector<HTMLElement>(`#section-${s.id}`);
                if (sec && sec.getBoundingClientRect().top - elTop <= 130) cur = s.id;
            }
            setActiveStep(cur);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);
    const go = (id: string) => {
        const el = scrollRef.current;
        const sec = el?.querySelector<HTMLElement>(`#section-${id}`);
        if (el && sec) el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 20, behavior: 'smooth' });
        setActiveStep(id);
    };

    const filled = (...vals: unknown[]) => vals.filter(v => v !== '' && v !== undefined && v !== null && v !== false).length;
    const completionFor = (id: string) => {
        switch (id) {
            case 'who': return filled(draft.driverId, draft.assetId);
            case 'when': return filled(draft.offenseNumber, draft.identifiers?.ticketNumber, draft.date, draft.time);
            case 'where': return filled(draft.locationStreet, draft.locationCity, draft.locationState, draft.locationZip);
            case 'what': return filled(draft.violationSubtype, draft.status, draft.fineAmount, draft.expenseAmount);
            case 'docs': return docs.length;
            default: return 0;
        }
    };

    // ── Shared input styling ──
    const inputClass = 'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300';
    const labelClass = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';

    return (
        <form onSubmit={handleSubmit} className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel="Back to tickets"
                onBack={onClose}
                icon={Ticket}
                title={record?.id ? 'Edit Ticket' : 'Add Driver Ticket'}
                subtitle={record?.id
                    ? <>ID: <span className="font-mono">{record.id}</span></>
                    : 'Log a driver ticket — record the offense, violation, fine and supporting documents.'}
                actions={
                    <>
                        <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800">Cancel</button>
                        <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-700">
                            <Save className="h-4 w-4" /> Save Ticket
                        </button>
                    </>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={completionFor} />

                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">

                        {/* ===== WHO ===== */}
                        <WizardSection id="who" icon={UserIcon} title="Driver & Asset" subtitle="The driver — and optional vehicle — the ticket was issued to.">
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Driver</label>
                                    <div className="relative">
                                        <select
                                            className={inputClass}
                                            value={draft.driverId || ''}
                                            onChange={e => {
                                                const d = driversForCarrier.find(d => d.id === e.target.value);
                                                if (d) {
                                                    setDraft(prev => ({
                                                        ...prev,
                                                        driverId: d.id,
                                                        driverName: `${(d as any).firstName ?? ''} ${(d as any).lastName ?? (d as any).name ?? ''}`.trim(),
                                                        identifiers: {
                                                            ...(prev.identifiers ?? {}),
                                                            driverLicenceNumber: (d as any).licenseNumber || undefined,
                                                        },
                                                    }));
                                                }
                                            }}
                                        >
                                            <option value="">Select Driver...</option>
                                            {driversForCarrier.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {(d as any).firstName ?? ''} {(d as any).lastName ?? (d as any).name ?? ''}
                                                </option>
                                            ))}
                                        </select>
                                        <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>Vehicle / Asset (Optional)</label>
                                    <div className="relative">
                                        <select
                                            className={inputClass}
                                            value={draft.assetId || ''}
                                            onChange={e => {
                                                const a = assetsForCarrier.find(a => a.id === e.target.value);
                                                setDraft(prev => ({
                                                    ...prev,
                                                    assetId: a?.id ?? undefined,
                                                    assetUnitNumber: a?.unitNumber ?? undefined,
                                                    identifiers: {
                                                        ...(prev.identifiers ?? {}),
                                                        plateNumber: a?.plateNumber || undefined,
                                                        vinNumber: (a as any)?.vin || undefined,
                                                    },
                                                }));
                                            }}
                                        >
                                            <option value="">None / Not Applicable</option>
                                            {assetsForCarrier.map(a => (
                                                <option key={a.id} value={a.id}>
                                                    {a.unitNumber} — {a.make} {a.model}{a.plateNumber ? ` (${a.plateNumber})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <Truck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            </div>
                        </WizardSection>

                        {/* ===== WHEN ===== */}
                        <WizardSection id="when" icon={Clock} title="Identifiers & Date" subtitle="Offense / ticket numbers and when the ticket was issued.">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Offense #</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={inputClass + ' pl-9'}
                                            placeholder="OFF-84741"
                                            value={draft.offenseNumber || ''}
                                            onChange={e => set('offenseNumber', e.target.value)}
                                        />
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Ticket #</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={inputClass + ' pl-9'}
                                            placeholder="CT-IL-12345"
                                            value={draft.identifiers?.ticketNumber || ''}
                                            onChange={e => setDraft(prev => ({
                                                ...prev,
                                                identifiers: { ...(prev.identifiers ?? {}), ticketNumber: e.target.value },
                                            }))}
                                        />
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Date</label>
                                    <input type="date" className={inputClass} value={draft.date || ''} onChange={e => set('date', e.target.value)} />
                                </div>
                                <div>
                                    <label className={labelClass}>Time</label>
                                    <input type="time" className={inputClass} value={draft.time || ''} onChange={e => set('time', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Linked accident #</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className={inputClass + ' pl-9'}
                                            placeholder="Link an accident (e.g. ACC-2026-0001)"
                                            value={draft.accidentNumber || ''}
                                            onChange={e => set('accidentNumber', e.target.value)}
                                            list="ticket-accident-numbers"
                                        />
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                        <datalist id="ticket-accident-numbers">
                                            {accidentNumberOptions.map(n => <option key={n} value={n} />)}
                                        </datalist>
                                    </div>
                                    <p className="mt-1 text-[11px] text-slate-400">Reference the accident this ticket was issued for, so the two records link.</p>
                                </div>
                            </div>
                        </WizardSection>

                        {/* ===== WHERE ===== */}
                        <WizardSection id="where" icon={MapPin} title="Location" subtitle="Where the ticket was issued.">
                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>Street Address</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="123 Highway Rd, Mile Marker 55"
                                        value={draft.locationStreet || ''}
                                        onChange={e => set('locationStreet', e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>City</label>
                                        <input type="text" className={inputClass} placeholder="City Name" value={draft.locationCity || ''} onChange={e => set('locationCity', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Zip / Postal Code</label>
                                        <input type="text" className={inputClass} placeholder="Zip Code" value={draft.locationZip || ''} onChange={e => set('locationZip', e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>Country</label>
                                        <div className="relative">
                                            <select
                                                className={inputClass}
                                                value={draft.locationCountry || 'USA'}
                                                onChange={e => setDraft(prev => ({
                                                    ...prev,
                                                    locationCountry: e.target.value as 'USA' | 'Canada',
                                                    locationState: '',
                                                }))}
                                            >
                                                <option value="USA">United States</option>
                                                <option value="Canada">Canada</option>
                                            </select>
                                            <Globe className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>State / Province</label>
                                        <select className={inputClass} value={draft.locationState || ''} onChange={e => set('locationState', e.target.value)}>
                                            <option value="">Select...</option>
                                            {Object.entries(stateOptions).map(([code, name]) => (
                                                <option key={code} value={code}>{name as string}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </WizardSection>

                        {/* ===== WHAT ===== */}
                        <WizardSection id="what" icon={FileText} title="Violation & Fine" subtitle="The violation code plus the fine, expense and status.">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <ViolationPicker
                                        value={draft.violations ?? []}
                                        onChange={vs => setDraft(prev => ({ ...prev, violations: vs }))}
                                        isCanada={isCanada}
                                        label="Violation Type"
                                        hint="· select all that apply, a ticket can have multiple"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Were you in a commercial vehicle?</label>
                                    <div className="flex h-10 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                                        {([['Yes', true], ['No', false]] as const).map(([opt, val]) => {
                                            const on = draft.commercialVehicle === val;
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() => set('commercialVehicle', on ? undefined : val)}
                                                    className={
                                                        'flex flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors ' +
                                                        (on
                                                            ? 'bg-blue-600 text-white shadow-sm'
                                                            : 'text-slate-500 hover:bg-white hover:text-slate-700')
                                                    }
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Out of Service?</label>
                                    <div className="flex h-10 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
                                        {([['Yes', true], ['No', false]] as const).map(([opt, val]) => {
                                            const on = draft.outOfService === val;
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    aria-pressed={on}
                                                    onClick={() => set('outOfService', on ? undefined : val)}
                                                    className={
                                                        'flex flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors ' +
                                                        (on
                                                            ? (val ? 'bg-red-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm')
                                                            : 'text-slate-500 hover:bg-white hover:text-slate-700')
                                                    }
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>
                                        Penalty / Fine <span className="font-normal normal-case tracking-normal text-slate-400">· select all that apply</span>
                                    </label>
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        {PENALTY_OPTIONS.map(pen => {
                                            const active = (draft.penalties ?? []).includes(pen);
                                            return (
                                                <button
                                                    key={pen}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => togglePenalty(pen)}
                                                    className={
                                                        'inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ' +
                                                        (active
                                                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700')
                                                    }
                                                >
                                                    {active && <Check size={13} className="text-blue-600" />}
                                                    {pen}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Ticket Status</label>
                                    <select className={inputClass} value={draft.status || 'Due'} onChange={e => set('status', e.target.value)}>
                                        {TICKET_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Fine Amount</label>
                                    <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={draft.fineAmount ?? ''} onChange={e => set('fineAmount', e.target.value === '' ? undefined : Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>Demerit Points</label>
                                    <input type="number" min="0" step="1" className={inputClass} placeholder="e.g. 2" value={draft.demeritPoints ?? ''} onChange={e => set('demeritPoints', e.target.value === '' ? undefined : Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>Expense Amount</label>
                                    <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00" value={draft.expenseAmount ?? ''} onChange={e => set('expenseAmount', e.target.value === '' ? undefined : Number(e.target.value))} />
                                </div>
                                <div>
                                    <label className={labelClass}>Currency</label>
                                    <select className={inputClass} value={draft.currency || 'USD'} onChange={e => set('currency', e.target.value as 'USD' | 'CAD')}>
                                        <option value="USD">USD</option>
                                        <option value="CAD">CAD</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <div className="w-full px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
                                        <span className="text-sm font-bold text-slate-800">
                                            ${totalAmount.toFixed(2)} <span className="text-[10px] text-slate-400 font-medium">{draft.currency || 'USD'}</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </WizardSection>

                        {/* ===== DOCUMENTS — toggle + multi-file drop box ===== */}
                        <WizardSection id="docs" icon={Ticket} title="Ticket Documents" subtitle="Turn on a document type, then add its ticket number, date and one or more files.">
                            <div className="space-y-3">
                                {TOGGLE_DOC_TYPES.map(typeId => {
                                    const dt = violationDocTypes.find(d => d.id === typeId);
                                    if (!dt) return null;
                                    const idx = docs.findIndex(d => d.docTypeId === typeId);
                                    const on = idx >= 0;
                                    const doc = on ? docs[idx] : null;

                                    const toggle = () => {
                                        if (on) {
                                            setDocs(prev => prev.filter((_, i) => i !== idx));
                                        } else {
                                            setDocs(prev => [...prev, {
                                                id: `doc-${Math.random().toString(36).slice(2, 11)}`,
                                                docTypeId: typeId,
                                                docNumber: '',
                                                issueDate: '',
                                                fileName: '',
                                                files: [],
                                                extras: {},
                                            }]);
                                        }
                                    };
                                    const patch = (p: Partial<AttachedDoc>) => {
                                        setDocs(prev => prev.map((d, i) => i === idx ? { ...d, ...p } : d));
                                    };

                                    return (
                                        <div key={typeId} className={`rounded-xl border transition-colors ${on ? 'bg-white border-blue-200 shadow-sm' : 'bg-white/40 border-slate-200'}`}>
                                            {/* Toggle header */}
                                            <button type="button" onClick={toggle} className="w-full flex items-center justify-between px-4 py-3 text-left">
                                                <span className="text-sm font-semibold text-slate-800">{dt.name}</span>
                                                <span className={`inline-flex h-5 w-9 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                                    <span className="h-4 w-4 rounded-full bg-white mt-0.5 transition-transform" style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }} />
                                                </span>
                                            </button>

                                            {on && doc && (
                                                <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className={labelClass}>Ticket number</label>
                                                            <input
                                                                type="text"
                                                                className={inputClass}
                                                                placeholder="e.g. CIT-2025-00123"
                                                                value={doc.docNumber}
                                                                onChange={e => patch({ docNumber: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className={labelClass}>Date</label>
                                                            <input
                                                                type="date"
                                                                className={inputClass}
                                                                value={doc.issueDate}
                                                                onChange={e => patch({ issueDate: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className={labelClass}>Upload files</label>
                                                        <FileDropZone
                                                            files={doc.files ?? []}
                                                            onAdd={list => {
                                                                const next = [...(doc.files ?? []), ...toDropFiles(list)];
                                                                patch({ files: next, fileName: next[0]?.fileName ?? '' });
                                                            }}
                                                            onRemove={id => {
                                                                const next = (doc.files ?? []).filter(x => x.id !== id);
                                                                patch({ files: next, fileName: next[0]?.fileName ?? '' });
                                                            }}
                                                            multiple
                                                            compact
                                                            accept=".pdf,.jpg,.jpeg,.png"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </WizardSection>

                    </div>
                </div>
            </div>
        </form>
    );
};
