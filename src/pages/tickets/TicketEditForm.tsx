/**
 * Ticket Add / Edit Form — dedicated form for the Tickets surface.
 *
 * Visually mirrors the Violation form but is its own component so the two
 * can diverge:
 *   • Tickets focus on offense identifiers + fine + court detail.
 *   • Violations focus on FMCSA/CVOR category coding + corrective action.
 *
 * Documents are surfaced as per-doc-type on/off toggles. Flipping one ON
 * reveals only what we need on a ticket — Document #, Issue Date, file
 * upload — plus a Portal URL field for the Electronic Ticket variant.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft, Save, User as UserIcon, Truck, Clock, MapPin, Globe,
    FileText, Upload, Hash, UserPlus,
} from 'lucide-react';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS as MOCK_ASSETS } from '@/pages/assets/assets.data';
import { US_STATE_ABBREVS, CA_PROVINCE_ABBREVS } from '@/data/geo-data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { useAppData } from '@/context/AppDataContext';
import { Combobox } from '@/components/ui/combobox';
import { VIOLATION_DATA } from '@/data/violations.data';
import { ALL_VIOLATIONS } from '@/pages/violations/violations-list.data';
import type { TicketIdentifiers } from './tickets.data';

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
    isOos?: boolean;
    // Used to round-trip the FMCSA item id back into the Combobox value
    // on edit. Free-form because the master chart isn't a closed enum.
    violationDataId?: string;
    status?: string;
    // Identifiers — flat in the form, nested when written to TicketRecord
    identifiers?: TicketIdentifiers;
    // Documents
    attachedDocuments?: AttachedDoc[];
    // Assignment — whether the ticket is delegated to a third party
    // (carrier's compliance team, defence counsel, etc) and who to.
    assignedToThirdParty?: boolean;
    assigneeName?: string;
    assigneeEmail?: string;
    assignmentNote?: string;
}

export interface AttachedDoc {
    id: string;
    docTypeId: string;
    docNumber: string;
    issueDate: string;
    fileName: string;
    extras?: {
        // Electronic ticket only
        portalUrl?: string;
        qrReference?: string;
        eIssuingDevice?: string;
        // Paper ticket only
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

// Doc-type ids that get a quick-toggle row at the top of the Documents
// section. Each toggle on creates an entry; off removes it.
const TOGGLE_DOC_TYPES = [
    'viol_ticket',
    'viol_eticket',
    'viol_summons',
    'viol_officer_report',
    'viol_fine_receipt',
    'viol_court_disposition',
] as const;

const TICKET_STATUS_OPTIONS = ['Due', 'In Court', 'Paid', 'Closed'] as const;

/** Map a master-chart violation description to one of the narrow
 *  TicketRecord violationType buckets so the list view can keep
 *  showing a colour-coded badge. We use a simple keyword match —
 *  same heuristic the store applies in inferViolationType. */
function narrowTypeFor(description: string, group?: string): string {
    const text = `${description} ${group ?? ''}`.toLowerCase();
    if (/speed|mph|over\s*limit|kph|excess/.test(text))                return 'Speeding';
    if (/overweight|axle|gvw|gross\s*weight/.test(text))               return 'Overweight';
    if (/logbook|log\s*book|hos|hours\s*of\s*service|eld/.test(text))  return 'Logbook violation';
    if (/insurance|liability|coverage/.test(text))                     return 'Insurance lapse';
    if (/red\s*light|signal|stop\s*sign/.test(text))                   return 'Red Light';
    if (/parking|stopping|stopped/.test(text))                         return 'Parking';
    return 'Equipment defect';
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
        () => allDocTypes.filter(d => d.relatedTo === 'violation' && d.status === 'Active'),
        [allDocTypes]
    );

    const [draft, setDraft] = useState<TicketFormDraft>({});
    const [docs, setDocs] = useState<AttachedDoc[]>([]);

    useEffect(() => {
        const base: TicketFormDraft = record ?? {};
        setDraft({
            currency: 'USD',
            locationCountry: 'USA',
            status: 'Due',
            ...base,
            // Driver Licence / Plate / VIN are entity-derived — clear them on
            // mount so a stale value can't leak in past the picker.
            identifiers: { ...(base.identifiers ?? {}) },
        });
        setDocs(record?.attachedDocuments ?? []);
    }, [record]);

    const set = <K extends keyof TicketFormDraft>(key: K, value: TicketFormDraft[K]) => {
        setDraft(prev => ({ ...prev, [key]: value }));
    };

    const totalAmount = (draft.fineAmount ?? 0) + (draft.expenseAmount ?? 0);
    const stateOptions = draft.locationCountry === 'Canada' ? CA_PROVINCE_ABBREVS : US_STATE_ABBREVS;

    // Violation Type comes from the Violation settings (VIOLATION_DATA).
    // Same options the Violation form offers: FMCSA SMS codes in the US,
    // CVOR/NSC enforcement codes in Canada. Picking a row stamps the code
    // onto identifiers.violationCode and the description onto
    // draft.violationType so the store's inferViolationType can map it to
    // the narrow TicketRecord type.
    const isCanada = draft.locationCountry === 'Canada';
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
    const selectedViolationValue = isCanada
        ? (draft.identifiers?.violationCode ?? '')
        : (draft.violationDataId ?? '');

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

    // ── Shared input styling — keeps the file visually aligned with the
    // Violation form without sharing markup.
    const inputClass = 'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300';
    const labelClass = 'block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5';

    return (
        <div className="bg-slate-50/30 rounded-3xl border border-slate-200/80 shadow-2xl shadow-blue-500/5 max-w-5xl mx-auto my-6 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 bg-white/60 backdrop-blur-sm flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 text-xs flex items-center gap-1"
                >
                    <ArrowLeft size={14} /> Back
                </button>
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-800">
                        {record?.id ? 'Edit Ticket' : 'Add Driver Ticket'}
                    </h2>
                    {record?.id && <p className="text-xs text-slate-500 mt-0.5">ID: <span className="font-mono">{record.id}</span></p>}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* ===== WHO ===== */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <UserIcon size={14} className="text-blue-500" /> Driver &amp; Asset
                    </h3>

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

                {/* ===== WHEN ===== */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Clock size={14} className="text-blue-500" /> Identifiers &amp; Date
                    </h3>
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
                            <input
                                type="date"
                                className={inputClass}
                                value={draft.date || ''}
                                onChange={e => set('date', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Time</label>
                            <input
                                type="time"
                                className={inputClass}
                                value={draft.time || ''}
                                onChange={e => set('time', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ===== WHERE ===== */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <MapPin size={14} className="text-blue-500" /> Location
                    </h3>
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
                            <input
                                type="text"
                                className={inputClass}
                                placeholder="City Name"
                                value={draft.locationCity || ''}
                                onChange={e => set('locationCity', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Zip / Postal Code</label>
                            <input
                                type="text"
                                className={inputClass}
                                placeholder="Zip Code"
                                value={draft.locationZip || ''}
                                onChange={e => set('locationZip', e.target.value)}
                            />
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
                            <select
                                className={inputClass}
                                value={draft.locationState || ''}
                                onChange={e => set('locationState', e.target.value)}
                            >
                                <option value="">Select...</option>
                                {Object.entries(stateOptions).map(([code, name]) => (
                                    <option key={code} value={code}>{name as string}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* ===== WHAT ===== */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" /> Violation &amp; Fine
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className={labelClass}>Violation Type</label>
                            <Combobox
                                options={violationOptions}
                                value={selectedViolationValue}
                                onValueChange={(val: string) => {
                                    // Look up the picked item in the master chart and
                                    // capture: subtype text + BASIC category label +
                                    // violation group + isOos. This is what powers the
                                    // Category / Sub-category chip strip below.
                                    if (isCanada) {
                                        for (const [catKey, cat] of Object.entries(VIOLATION_DATA.categories)) {
                                            const v = cat.items.find(item => item.canadaEnforcement?.code === val);
                                            if (!v) continue;
                                            const subtype = v.canadaEnforcement!.descriptions?.full || v.violationDescription;
                                            const categoryLabel = (cat as any).label ?? catKey.replace(/_/g, ' ');
                                            setDraft(prev => ({
                                                ...prev,
                                                violationType: narrowTypeFor(subtype, v.canadaEnforcement!.category || v.violationGroup),
                                                violationSubtype: subtype,
                                                violationCategory: categoryLabel,
                                                violationGroup: v.violationGroup,
                                                isOos: !!v.isOos,
                                                identifiers: {
                                                    ...(prev.identifiers ?? {}),
                                                    violationCode: v.canadaEnforcement!.code,
                                                    statuteSection: v.canadaEnforcement!.category,
                                                },
                                            }));
                                            break;
                                        }
                                    } else {
                                        for (const [catKey, cat] of Object.entries(VIOLATION_DATA.categories)) {
                                            const v = cat.items.find(item => item.id === val);
                                            if (!v) continue;
                                            const categoryLabel = (cat as any).label ?? catKey.replace(/_/g, ' ');
                                            setDraft(prev => ({
                                                ...prev,
                                                violationType: narrowTypeFor(v.violationDescription, v.violationGroup),
                                                violationSubtype: v.violationDescription,
                                                violationCategory: categoryLabel,
                                                violationGroup: v.violationGroup,
                                                isOos: !!v.isOos,
                                                violationDataId: v.id,
                                                identifiers: {
                                                    ...(prev.identifiers ?? {}),
                                                    violationCode: v.violationCode,
                                                },
                                            }));
                                            break;
                                        }
                                    }
                                }}
                                placeholder={isCanada ? 'Search Canadian violation code...' : 'Search SMS violation code...'}
                                searchPlaceholder={isCanada ? 'Search CVOR/NSC violations...' : 'Search SMS violations...'}
                                className="w-full bg-white"
                            />
                            {/* Resolved Category / Sub-category strip — gives the
                                clerk an immediate visual confirmation of which
                                BASIC / group the selected code belongs to.
                                Read-only; derived from VIOLATION_DATA. */}
                            {draft.violationCategory && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                        {draft.violationCategory}
                                    </span>
                                    {draft.violationGroup && (
                                        <>
                                            <span className="text-[10px] text-slate-300">/</span>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sub-category</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                {draft.violationGroup}
                                            </span>
                                        </>
                                    )}
                                    {draft.isOos && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                            OOS-qualifying
                                        </span>
                                    )}
                                    {draft.identifiers?.violationCode && (
                                        <span className="ml-1 text-[10px] font-mono text-slate-400">code {draft.identifiers.violationCode}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                className={inputClass}
                                value={draft.status || 'Due'}
                                onChange={e => set('status', e.target.value)}
                            >
                                {TICKET_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Fine Amount</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={inputClass}
                                placeholder="0.00"
                                value={draft.fineAmount ?? ''}
                                onChange={e => set('fineAmount', e.target.value === '' ? undefined : Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Expense Amount</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={inputClass}
                                placeholder="0.00"
                                value={draft.expenseAmount ?? ''}
                                onChange={e => set('expenseAmount', e.target.value === '' ? undefined : Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Currency</label>
                            <select
                                className={inputClass}
                                value={draft.currency || 'USD'}
                                onChange={e => set('currency', e.target.value as 'USD' | 'CAD')}
                            >
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
                </div>

                {/* ===== DOCUMENTS — toggle UX ===== */}
                <div className="bg-blue-50/30 rounded-xl border border-blue-100 p-4 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} className="text-blue-500" /> Ticket Documents
                    </h3>

                    {TOGGLE_DOC_TYPES.map(typeId => {
                        const dt = violationDocTypes.find(d => d.id === typeId);
                        if (!dt) return null;
                        const idx = docs.findIndex(d => d.docTypeId === typeId);
                        const on = idx >= 0;
                        const doc = on ? docs[idx] : null;
                        const isEticket = typeId === 'viol_eticket';

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
                                    extras: {},
                                }]);
                            }
                        };
                        const patch = (p: Partial<AttachedDoc>) => {
                            setDocs(prev => prev.map((d, i) => i === idx ? { ...d, ...p } : d));
                        };
                        const patchExtras = (p: Partial<NonNullable<AttachedDoc['extras']>>) => {
                            setDocs(prev => prev.map((d, i) => i === idx
                                ? { ...d, extras: { ...(d.extras ?? {}), ...p } }
                                : d
                            ));
                        };

                        return (
                            <div key={typeId} className={`rounded-xl border transition-colors ${on ? 'bg-white border-blue-200 shadow-sm' : 'bg-white/40 border-slate-200'}`}>
                                {/* Toggle header */}
                                <button
                                    type="button"
                                    onClick={toggle}
                                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                                >
                                    <span className="text-sm font-semibold text-slate-800">{dt.name}</span>
                                    <span className={`inline-flex h-5 w-9 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                        <span
                                            className="h-4 w-4 rounded-full bg-white mt-0.5 transition-transform"
                                            style={{ transform: on ? 'translateX(18px)' : 'translateX(2px)' }}
                                        />
                                    </span>
                                </button>

                                {on && doc && (
                                    <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={labelClass}>Document #</label>
                                                <input
                                                    type="text"
                                                    className={inputClass}
                                                    placeholder="e.g. CIT-2025-00123"
                                                    value={doc.docNumber}
                                                    onChange={e => patch({ docNumber: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Issue Date</label>
                                                <input
                                                    type="date"
                                                    className={inputClass}
                                                    value={doc.issueDate}
                                                    onChange={e => patch({ issueDate: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {isEticket && (
                                            <div>
                                                <label className={labelClass}>Portal URL</label>
                                                <input
                                                    type="url"
                                                    className={inputClass}
                                                    placeholder="https://eticket.gov/abc"
                                                    value={doc.extras?.portalUrl || ''}
                                                    onChange={e => patchExtras({ portalUrl: e.target.value })}
                                                />
                                            </div>
                                        )}

                                        <div className="bg-slate-50/80 rounded-lg border border-dashed border-slate-300 p-3 flex items-center gap-3">
                                            <Upload size={18} className="text-blue-400 shrink-0" />
                                            <label className="cursor-pointer flex-1 flex items-center gap-2">
                                                <span className="text-xs text-blue-600 font-medium underline decoration-dotted">Choose file</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) patch({ fileName: file.name });
                                                    }}
                                                />
                                                <span className={doc.fileName ? 'text-[11px] text-emerald-600 font-medium' : 'text-[11px] text-slate-400 italic'}>
                                                    {doc.fileName || 'No file chosen'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ===== ASSIGN TO =====
                    Delegate the ticket to a third party (compliance contact,
                    legal counsel, fleet manager). Toggling on reveals name +
                    email + optional note. Persists onto the saved record as
                    assignedToThirdParty / assigneeName / assigneeEmail. */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            <UserPlus size={14} className="text-blue-500" /> Assignment
                        </h3>
                        <button
                            type="button"
                            onClick={() => set('assignedToThirdParty', !draft.assignedToThirdParty)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${draft.assignedToThirdParty ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                        >
                            <UserPlus size={12} />
                            {draft.assignedToThirdParty ? 'Assigned' : 'Assign to…'}
                            <span className={`inline-flex h-4 w-7 rounded-full transition-colors ${draft.assignedToThirdParty ? 'bg-blue-600' : 'bg-slate-300'}`}>
                                <span
                                    className="h-3 w-3 rounded-full bg-white mt-0.5 transition-transform"
                                    style={{ transform: draft.assignedToThirdParty ? 'translateX(14px)' : 'translateX(2px)' }}
                                />
                            </span>
                        </button>
                    </div>
                    {draft.assignedToThirdParty && (
                        <div className="space-y-3 pt-1 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelClass}>Assignee Name</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. J. Patel — Compliance"
                                        value={draft.assigneeName || ''}
                                        onChange={e => set('assigneeName', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Assignee Email</label>
                                    <input
                                        type="email"
                                        className={inputClass}
                                        placeholder="jpatel@example.com"
                                        value={draft.assigneeEmail || ''}
                                        onChange={e => set('assigneeEmail', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Note (optional)</label>
                                <input
                                    type="text"
                                    className={inputClass}
                                    placeholder="Context for the assignee — what to do next, deadlines, etc."
                                    value={draft.assignmentNote || ''}
                                    onChange={e => set('assignmentNote', e.target.value)}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== ACTIONS ===== */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/20 text-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Ticket
                    </button>
                </div>
            </form>
        </div>
    );
};
