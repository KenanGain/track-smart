import React, { useMemo, useState, useEffect } from 'react';
import {
    Search,
    FileText,
    Edit2,
    Eye,
    Plus,
    Scale,
    CheckCircle,
    DollarSign,
    FileCheck,
    AlertTriangle,
    Calendar,
    LayoutGrid,
    Download,
    X,
    BellRing,
    ShieldCheck,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Trash2,
    AlertOctagon,
    Share2,
    Ticket,
} from 'lucide-react';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { ShareToChat } from '@/components/share/ShareToChat';
import { consumePendingRecord, setMessagesFocus, type RecordRef } from '@/pages/messages/messages-store';

import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { type TicketStatus, type ViolationType, type TicketRecord } from './tickets.data';
import { useCarrierTickets, addTicket, updateTicket, removeTicket, buildTicketFromViolation, type ViolationLike } from './tickets.store';
import { TicketEditForm, type TicketFormDraft } from './TicketEditForm';
import { TicketDetailPage } from './TicketDetailPage';
import { useCondensingHeader } from '@/components/ui/use-condensing-header';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { CA_PROVINCE_ABBREVS } from '@/data/geo-data';
import {
    getMissingTicketsForCarrier,
    summarizeMissingTickets,
    type MissingTicketRef,
} from './carrier-tickets.data';
import {
    generateLiveFeedBatch,
    type ExternalViolationRecord,
} from '@/pages/violations/external-violation-feeds.data';

// Tiny class-name composer — same shape as the Violations page's `cn`.
const cn = (...c: (string | boolean | undefined | null)[]) =>
    c.filter(x => typeof x === 'string' && x.length > 0).join(' ');

// ── KPI card — vertical color bar + icon, matches ViolationsListPage ──────
const KPICard = ({
    label, value, subtitle, icon: Icon, barColor, textColor,
}: {
    label: string; value: string | number; subtitle?: string;
    icon: React.ElementType; barColor: string; textColor: string;
}) => (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex overflow-hidden">
        <div className={cn('w-1.5 shrink-0', barColor)} />
        <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-xs text-slate-500 truncate">{label}</p>
                    <p className={cn('text-2xl font-bold mt-0.5', textColor)}>{value}</p>
                    {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                </div>
                <div className={cn('rounded-lg p-1.5 shrink-0', barColor.replace('bg-', 'bg-').replace('-500', '-100'))}>
                    <Icon className={cn('w-4 h-4', textColor)} />
                </div>
            </div>
        </div>
    </div>
);

// ── Filter constants — kept in sync with the form's options ───────────────
const VIOLATION_TYPE_OPTIONS: ViolationType[] = [
    'Speeding', 'Overweight', 'Logbook violation', 'Equipment defect',
    'Insurance lapse', 'Red Light', 'Parking',
];
// Per-jurisdiction source key derived from the ticket's state. US states
// hit FMCSA SMS; Ontario goes to CVOR; other Canadian provinces fall under
// NSC. Same routing the regulator feeds use.
const ONTARIO_STATE = 'ON';
const CANADIAN_STATES = new Set(['ON', 'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'PE', 'QC', 'SK', 'YT', 'NT', 'NU']);
function sourceForTicket(t: TicketRecord): 'SMS' | 'CVOR' | 'NSC' {
    const state = (t.location.split(',')[1] ?? '').trim().toUpperCase();
    if (state === ONTARIO_STATE) return 'CVOR';
    if (CANADIAN_STATES.has(state)) return 'NSC';
    return 'SMS';
}

const DOC_TYPE_OPTIONS: Array<{ id: string; label: string }> = [
    { id: 'viol_ticket',            label: 'Violation Ticket' },
    { id: 'viol_eticket',           label: 'Electronic Ticket' },
    { id: 'viol_summons',           label: 'Summons / Court Notice' },
    { id: 'viol_officer_report',    label: 'Officer Report' },
    { id: 'viol_fine_receipt',      label: 'Fine Receipt' },
    { id: 'viol_court_disposition', label: 'Court Disposition' },
];

// ── BASIC category tabs — mirrors the violations / accidents pattern ──────
// Each tab declares a regex that decides whether a ticket's
// violationCategory or narrow violationType falls into that BASIC. There is no
// per-tab colour: the selected tab is blue, as on every other tab bar in the
// app — seven active colours read as seven controls, not one with a value.
const BASIC_TABS: Array<{
    key: 'all' | 'unsafe_driving' | 'vehicle_maintenance' | 'hos' | 'driver_fitness' | 'controlled_substances' | 'other';
    label: string;
    match: (ticket: TicketRecord) => boolean;
}> = [
    { key: 'all',                   label: 'All Tickets',           match: () => true },
    { key: 'unsafe_driving',        label: 'Unsafe Driving',
      match: t => /unsafe\s*driving|speeding|red\s*light|parking|reckless/i.test(`${t.violationCategory ?? ''} ${t.violationType ?? ''}`) },
    { key: 'vehicle_maintenance',   label: 'Vehicle Maintenance',
      match: t => /vehicle\s*maintenance|equipment\s*defect|overweight/i.test(`${t.violationCategory ?? ''} ${t.violationType ?? ''}`) },
    { key: 'hos',                   label: 'Hours-of-Service',
      match: t => /hours[-\s]?of[-\s]?service|hos|logbook/i.test(`${t.violationCategory ?? ''} ${t.violationType ?? ''}`) },
    { key: 'driver_fitness',        label: 'Driver Fitness',
      match: t => /driver\s*fitness|insurance/i.test(`${t.violationCategory ?? ''} ${t.violationType ?? ''}`) },
    { key: 'controlled_substances', label: 'Controlled Substances',
      match: t => /controlled\s*substance|alcohol|drug/i.test(`${t.violationCategory ?? ''} ${t.violationType ?? ''}`) },
    { key: 'other',                 label: 'Other',
      match: t => {
          const hay = `${t.violationCategory ?? ''} ${t.violationType ?? ''}`;
          return !/unsafe\s*driving|vehicle\s*maintenance|hours[-\s]?of[-\s]?service|hos|driver\s*fitness|insurance|controlled\s*substance|alcohol|speeding|red\s*light|parking|reckless|equipment\s*defect|overweight|logbook|drug/i.test(hay);
      } },
];

export const TicketsPage = ({ accountId, onNavigate }: { accountId?: string; onNavigate?: (path: string) => void } = {}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All Statuses');
    const [violationFilter, setViolationFilter] = useState('All Types');
    const [docTypeFilter, setDocTypeFilter] = useState('All Documents');
    // Source filter — derived from the ticket's jurisdiction:
    //   US state  → SMS (FMCSA Safety Measurement System)
    //   ON        → CVOR (Ontario Commercial Vehicle Operator's Registration)
    //   other CA  → NSC (Canadian National Safety Code)
    const [sourceFilter, setSourceFilter] = useState<'All Sources' | 'SMS' | 'CVOR' | 'NSC'>('All Sources');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [basicTab, setBasicTab] = useState<(typeof BASIC_TABS)[number]['key']>('all');
    // The header shrinks as the list scrolls and comes back at the top; switching
    // category returns the body to its top without disturbing the header.
    const { scrollRef, condensed, onScroll } = useCondensingHeader(basicTab);
    const [subCatFilter, setSubCatFilter] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    // Ticket awaiting a Remove confirmation. Null when the dialog is closed.
    const [removeCandidate, setRemoveCandidate] = useState<TicketRecord | null>(null);
    // A ticket being shared to chat (record link), and deep-link open from a shared link.
    const [shareRecord, setShareRecord] = useState<RecordRef | null>(null);
    useEffect(() => { const id = consumePendingRecord('/tickets'); if (id) setExpandedId(id); }, []);
    const ticketRef = (t: TicketRecord): RecordRef => ({
        type: 'ticket', id: t.id, label: `Ticket ${t.offenseNumber || t.id}`,
        sublabel: [t.violationType, t.driverName].filter(Boolean).join(' · ') || undefined, path: '/tickets',
    });
    // Prefill stash for the Add form — populated when the user clicks
    // "Log Ticket" on a missing-record row in the reconciliation banner.
    // Takes precedence over the auto-generated Add defaults when set.
    const [prefillDraft, setPrefillDraft] = useState<TicketFormDraft | null>(null);
    const [missingOpen, setMissingOpen] = useState(false);
    const [dismissedMissingIds, setDismissedMissingIds] = useState<Set<string>>(new Set());
    // Live-feed batches synced by the user via the Sync button. Folded into
    // the reconciler so the missing list updates as soon as a batch arrives.
    const [liveFeeds, setLiveFeeds] = useState<ExternalViolationRecord[]>([]);
    const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
    // Bulk selection for the missing-tickets table (mirrors Violations UX).
    const [selectedMissingIds, setSelectedMissingIds] = useState<Set<string>>(new Set());
    const [missingPage, setMissingPage] = useState(1);
    const [missingPerPage, setMissingPerPage] = useState(10);

    // Carrier metadata for the header subtitle (legal name + record count).
    const carrier = useMemo(
        () => (accountId ? ACCOUNTS_DB.find(a => a.id === accountId) ?? null : null),
        [accountId]
    );

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTicket, setEditingTicket] = useState<TicketRecord | null>(null);

    // Tickets are pulled per-carrier from the navbar's selected account.
    // When no carrier is selected (super-admin landing view) we show all.
    const tickets = useCarrierTickets(accountId);

    // Missing-tickets reconciliation — derived from carrier-violations +
    // external regulator feeds (static seed + live-synced batch) vs. the
    // carrier's tickets store. Lives *after* `tickets` so the
    // `tickets.length` dep is in scope.
    const missingTickets = useMemo<MissingTicketRef[]>(
        () => (accountId ? getMissingTicketsForCarrier(accountId, liveFeeds) : []),
        [accountId, tickets.length, liveFeeds],
    );
    const visibleMissing = useMemo(
        () => missingTickets.filter(m => !dismissedMissingIds.has(m.id)),
        [missingTickets, dismissedMissingIds],
    );
    // Summary stats for the banner header (per-source verified + missing).
    const missingSummary = useMemo(
        () => (accountId
            ? summarizeMissingTickets(accountId, liveFeeds)
            : { missingCount: 0, onFileCount: 0, totalRefs: 0, matchPct: 100, perSource: [] }),
        [accountId, tickets.length, liveFeeds],
    );
    // Sync handler — pulls a fresh batch of regulator-feed entries.
    const handleSyncFeeds = () => {
        if (!accountId) return;
        const batch = generateLiveFeedBatch(accountId);
        if (batch.length === 0) return;
        setLiveFeeds(prev => [...batch, ...prev]);
        setLastSyncedAt(Date.now());
        setMissingOpen(true);
    };

    const handleEdit = (ticket: TicketRecord) => {
        setPrefillDraft(null);
        setEditingTicket(ticket);
        setIsDialogOpen(true);
    };

    const handleAdd = () => {
        setPrefillDraft(null);
        setEditingTicket(null);
        setIsDialogOpen(true);
    };

    // Stats derived from the live list — show counts for every status band
    // and a couple of totals so the row of KPIs is informative at a glance.
    const stats = useMemo(() => {
        const outstandingFines = tickets
            .filter(t => t.status === 'Due' || t.status === 'In Court')
            .reduce((s, t) => s + (t.fineAmount || 0), 0);
        const openOffenses = tickets.filter(t => t.status === 'Due').length;
        const inCourt = tickets.filter(t => t.status === 'In Court').length;
        const thisMonth = new Date().toISOString().slice(0, 7);
        const paidThisMonth = tickets.filter(t => t.status === 'Paid' && t.date.startsWith(thisMonth)).length;
        const electronic = tickets.filter(t => t.ticketKind === 'Electronic').length;
        return { total: tickets.length, outstandingFines, openOffenses, inCourt, paidThisMonth, electronic };
    }, [tickets]);

    const getStatusBadge = (status: TicketStatus) => {
        const styles = {
            'Due': 'bg-yellow-100 text-yellow-800',
            'In Court': 'bg-blue-100 text-blue-800',
            'Paid': 'bg-green-100 text-green-800',
            'Closed': 'bg-slate-100 text-slate-800'
        };
        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
                {status}
            </span>
        );
    };

    const getViolationBadge = (type: ViolationType) => {
        const styles: Record<string, string> = {
            'Speeding': 'bg-red-50 text-red-700 border-red-100',
            'Overweight': 'bg-orange-50 text-orange-700 border-orange-100',
            'Logbook violation': 'bg-purple-50 text-purple-700 border-purple-100',
            'Equipment defect': 'bg-slate-100 text-slate-700 border-slate-200',
            'Insurance lapse': 'bg-pink-50 text-pink-700 border-pink-100',
            'Red Light': 'bg-red-50 text-red-700 border-red-100',
            'Parking': 'bg-slate-100 text-slate-700 border-slate-200'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {type}
            </span>
        );
    };

    // Per-BASIC counts power the badges in the tab strip.
    const basicCounts = useMemo(() => {
        const out: Record<string, number> = {};
        for (const t of BASIC_TABS) out[t.key] = tickets.filter(t.match).length;
        return out;
    }, [tickets]);

    const activeBasic = BASIC_TABS.find(t => t.key === basicTab) ?? BASIC_TABS[0];

    // Sub-category breakdown within the active BASIC tab. Each entry is a
    // [violationGroup, count] pair sorted by frequency. Capped at 12 so the
    // card grid stays scannable. Mirrors the Violations page exactly.
    const subCategoryBreakdown = useMemo(() => {
        const scoped = tickets.filter(activeBasic.match);
        const counts = new Map<string, number>();
        for (const t of scoped) {
            const key = (t.violationGroup?.trim() || t.violationCategory?.trim() || t.violationType || '').trim();
            if (!key) continue;
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickets, basicTab]);

    // The same figures the KPI cards show, for the compact form the header keeps once
    // the cards themselves have scrolled away. One array so the two cannot disagree.
    // No Total: the count sits beside the title at every height, so a chip repeating it was
    // the third place on screen saying the same number.
    const kpiChips = useMemo(() => [
        { id: 'outstanding', label: 'Outstanding', value: `$${stats.outstandingFines.toLocaleString()}`, tone: 'text-rose-700' },
        { id: 'open',        label: 'Open',        value: stats.openOffenses, tone: 'text-amber-700' },
        { id: 'court',       label: 'In court',    value: stats.inCourt, tone: 'text-indigo-700' },
        { id: 'paid',        label: 'Paid',        value: stats.paidThisMonth, tone: 'text-emerald-700' },
        { id: 'electronic',  label: 'eTickets',    value: stats.electronic, tone: 'text-violet-700' },
    ], [stats]);

    const filteredTickets = tickets.filter(ticket => {
        if (!activeBasic.match(ticket)) return false;
        if (subCatFilter) {
            const groupKey = (ticket.violationGroup?.trim() || ticket.violationCategory?.trim() || ticket.violationType || '').trim();
            if (groupKey !== subCatFilter) return false;
        }
        const q = searchTerm.toLowerCase();
        const idMatch = ticket.identifiers?.ticketNumber?.toLowerCase().includes(q) ||
            ticket.identifiers?.citationNumber?.toLowerCase().includes(q);
        const matchesSearch = q === ''
            || ticket.offenseNumber.toLowerCase().includes(q)
            || ticket.driverName.toLowerCase().includes(q)
            || ticket.assetId.toLowerCase().includes(q)
            || ticket.location.toLowerCase().includes(q)
            || idMatch;
        const matchesStatus    = statusFilter    === 'All Statuses'  || ticket.status        === statusFilter;
        const matchesViolation = violationFilter === 'All Types'     || ticket.violationType === violationFilter;
        const primaryDocId = (ticket as any).primaryDocTypeId
            ?? (ticket.ticketKind === 'Electronic' ? 'viol_eticket' : 'viol_ticket');
        const matchesDocType   = docTypeFilter   === 'All Documents' || primaryDocId === docTypeFilter;
        const matchesSource    = sourceFilter    === 'All Sources'   || sourceForTicket(ticket) === sourceFilter;
        const matchesFrom = !dateFrom || ticket.date >= dateFrom;
        const matchesTo   = !dateTo   || ticket.date <= dateTo;

        return matchesSearch && matchesStatus && matchesViolation && matchesDocType && matchesSource && matchesFrom && matchesTo;
    });

    // Doc-type chip styling per primary doc type id — matches the colour
    // language used elsewhere (paper = blue, electronic = violet, etc).
    const getDocTypeBadge = (ticket: TicketRecord) => {
        const id = (ticket as any).primaryDocTypeId
            ?? (ticket.ticketKind === 'Electronic' ? 'viol_eticket' : 'viol_ticket');
        const label = (ticket as any).primaryDocTypeLabel
            ?? DOC_TYPE_OPTIONS.find(d => d.id === id)?.label
            ?? '—';
        const palette: Record<string, string> = {
            viol_ticket:            'bg-blue-50 text-blue-700 border-blue-200',
            viol_eticket:           'bg-violet-50 text-violet-700 border-violet-200',
            viol_summons:           'bg-amber-50 text-amber-700 border-amber-200',
            viol_officer_report:    'bg-slate-100 text-slate-700 border-slate-200',
            viol_fine_receipt:      'bg-emerald-50 text-emerald-700 border-emerald-200',
            viol_court_disposition: 'bg-rose-50 text-rose-700 border-rose-200',
        };
        const cls = palette[id] ?? 'bg-slate-50 text-slate-600 border-slate-200';
        return (
            <span className={`px-2 py-1 rounded text-[11px] font-medium border ${cls}`}>{label}</span>
        );
    };

    const resetFilters = () => {
        setSearchTerm('');
        setStatusFilter('All Statuses');
        setViolationFilter('All Types');
        setDocTypeFilter('All Documents');
        setSourceFilter('All Sources');
        setDateFrom('');
        setDateTo('');
        setSubCatFilter(null);
    };

    // When the Add / Edit form is open, render the dedicated TicketEditForm
    // full-page in place of the list. We hydrate its draft from the
    // selected ticket (Edit) or seed sensible defaults (Add) and convert
    // the saved draft back into a TicketRecord via the shared store helper.
    if (isDialogOpen) {
        // Prefill path wins when the user clicked "Log Ticket" on a
        // missing-record row — its draft already carries the correct
        // identifiers + structured location.
        const recordForForm: TicketFormDraft = prefillDraft
            ? prefillDraft
            : editingTicket
            ? (() => {
                const [city = '', tail = ''] = (editingTicket.location || '').split(',');
                const tokens = tail.trim().split(/\s+/);
                const state = tokens[0] ?? '';
                const zip = tokens.slice(1).join(' ');
                return {
                    id: editingTicket.id,
                    offenseNumber: editingTicket.offenseNumber,
                    date: editingTicket.date,
                    time: editingTicket.time,
                    driverId: editingTicket.driverId,
                    driverName: editingTicket.driverName,
                    assetId: editingTicket.assetId,
                    locationStreet: editingTicket.description,
                    locationCity: city.trim(),
                    locationState: state,
                    locationZip: zip,
                    locationCountry: Object.keys(CA_PROVINCE_ABBREVS).includes(state) ? 'Canada' : 'USA',
                    fineAmount: editingTicket.fineAmount,
                    currency: editingTicket.currency,
                    status: editingTicket.status,
                    violationType: editingTicket.violationType,
                    violationSubtype: editingTicket.violationSubtype,
                    violationCategory: editingTicket.violationCategory,
                    violationGroup: editingTicket.violationGroup,
                    violations: editingTicket.violations,
                    isOos: editingTicket.isOos,
                    outOfService: editingTicket.outOfService,
                    commercialVehicle: editingTicket.commercialVehicle,
                    penalties: editingTicket.penalties,
                    demeritPoints: editingTicket.demeritPoints,
                    identifiers: editingTicket.identifiers ?? {},
                    accidentNumber: editingTicket.accidentNumber,
                    assignedToThirdParty: editingTicket.assignedToThirdParty,
                    assigneeName: (editingTicket as any).assigneeName,
                    assigneeEmail: (editingTicket as any).assigneeEmail,
                    assignmentNote: (editingTicket as any).assignmentNote,
                };
            })()
            : (() => {
                const now = new Date();
                const pad = (n: number) => String(n).padStart(2, '0');
                const maxOffense = tickets.reduce((m, t) => {
                    const n = Number((t.offenseNumber || '').replace(/[^0-9]/g, ''));
                    return Number.isFinite(n) && n > m ? n : m;
                }, 84740);
                return {
                    offenseNumber: `OFF-${maxOffense + 1}`,
                    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
                    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
                    currency: 'USD',
                    status: 'Due',
                    locationCountry: 'USA',
                    violationType: 'Speeding',
                };
            })();

        return (
            <TicketEditForm
                record={recordForForm}
                accountId={accountId}
                onClose={() => {
                    setIsDialogOpen(false);
                    setEditingTicket(null);
                    setPrefillDraft(null);
                }}
                onSave={(draft) => {
                    // Project the saved draft through buildTicketFromViolation
                    // — the helper handles location composition, currency
                    // inference, doc → identifier merging, and ticketKind
                    // detection consistently with the violation flow.
                    const projected: ViolationLike = {
                        id: editingTicket?.id ?? draft.id ?? `T-USER-${Date.now()}`,
                        date: draft.date,
                        time: draft.time,
                        driverId: draft.driverId,
                        driverName: draft.driverName,
                        assetId: draft.assetId,
                        locationStreet: draft.locationStreet,
                        locationCity: draft.locationCity,
                        locationState: draft.locationState,
                        locationZip: draft.locationZip,
                        locationCountry: draft.locationCountry,
                        fineAmount: draft.fineAmount,
                        expenseAmount: draft.expenseAmount,
                        currency: draft.currency,
                        status: draft.status,
                        category: draft.violationType,
                        // Use the descriptive subtype as the violation
                        // "description" so the store's inferViolationType
                        // matches on the long text too (e.g. "Speeding 6–10
                        // mph over") and the saved record keeps the rich
                        // wording on `violationSubtype`.
                        description: draft.violationSubtype,
                        ticketNumber: draft.offenseNumber,
                        // Flatten the form's nested identifiers so the store's
                        // pickIdentifiers() can collect them.
                        ...(draft.identifiers ?? {}),
                        attachedDocuments: draft.attachedDocuments,
                        // Assignment metadata — store reads these off the
                        // projected payload at build time.
                        ...({
                            assignedToThirdParty: draft.assignedToThirdParty,
                            assigneeName: draft.assigneeName,
                            assigneeEmail: draft.assigneeEmail,
                            assignmentNote: draft.assignmentNote,
                            violationSubtype: draft.violationSubtype,
                            violationCategory: draft.violationCategory,
                            violationGroup: draft.violationGroup,
                            isOos: draft.isOos,
                        } as any),
                    };
                    const built = buildTicketFromViolation(projected);
                    if (!built) {
                        setIsDialogOpen(false);
                        setEditingTicket(null);
                        return;
                    }
                    // Carry the cross-reference to a linked accident (not part
                    // of the violation projection).
                    built.accidentNumber = draft.accidentNumber || undefined;
                    // Carry the full multi-violation list (the projection only
                    // derives the single primary violation from violations[0]).
                    built.violations = draft.violations?.length ? draft.violations : undefined;
                    // Carry the explicit Out-of-Service + commercial-vehicle answers.
                    built.outOfService = draft.outOfService;
                    built.commercialVehicle = draft.commercialVehicle;
                    built.penalties = draft.penalties?.length ? draft.penalties : undefined;
                    built.demeritPoints = draft.demeritPoints;
                    if (editingTicket) {
                        updateTicket(editingTicket.id, { ...built, id: editingTicket.id });
                    } else {
                        addTicket(built);
                    }
                    setIsDialogOpen(false);
                    setEditingTicket(null);
                    setPrefillDraft(null);
                }}
            />
        );
    }

    // ── Dedicated full-page ticket detail (replaces the old popup) ──
    if (expandedId) {
        const ticket = tickets.find(t => t.id === expandedId);
        if (ticket) {
            return (
                <TicketDetailPage
                    ticket={ticket}
                    onBack={() => setExpandedId(null)}
                    onEdit={() => { setExpandedId(null); handleEdit(ticket); }}
                    onDelete={() => { setExpandedId(null); setRemoveCandidate(ticket); }}
                    onNavigate={onNavigate}
                    accountId={accountId}
                />
            );
        }
    }

    // ── Pagination derived state ──────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filteredTickets.length / perPage));
    const safePage = Math.min(page, totalPages);
    const pageRows = filteredTickets.slice((safePage - 1) * perPage, safePage * perPage);
    const anyFilter =
        searchTerm || statusFilter !== 'All Statuses' || violationFilter !== 'All Types' ||
        docTypeFilter !== 'All Documents' || dateFrom || dateTo;

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* The app's standard list header (see `ListPageHeader`): identity, the figures
                as the cards scroll away, the actions, and the category strip — which stays
                whatever the height, because navigation that disappears on scroll is not
                navigation. */}
            <ListPageHeader
                Icon={Ticket}
                title="Tickets & Offenses"
                description={<>{carrier ? <><span className="font-semibold text-slate-700">{carrier.legalName}</span> &middot; </> : null}Paper &amp; electronic citations</>}
                count={tickets.length}
                chips={kpiChips}
                condensed={condensed}
                tabsLabel="Ticket categories"
                showZeroCounts
                tabs={BASIC_TABS.map(t => ({ id: t.key, label: t.label, count: basicCounts[t.key] ?? 0 }))}
                activeTab={basicTab}
                onTabChange={id => { setBasicTab(id as (typeof BASIC_TABS)[number]['key']); setSubCatFilter(null); setPage(1); setExpandedId(null); }}
                actions={<>
                    <button
                        className={cn('inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50', condensed ? 'h-8' : 'h-9')}
                        onClick={() => { /* CSV export hook lands later */ }}
                    >
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={handleAdd}
                        className={cn('inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-500', condensed ? 'h-8' : 'h-9')}
                    >
                        <Plus className="w-4 h-4" /> Add Ticket
                    </button>
                </>}
            />

            {/* Scrollable content — its own scroller, so the header band above shrinks
                instead of scrolling away, and the tab strip inside can stick to its top. */}
            <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto min-h-0">
                <div className="p-4 space-y-4">

                {/* KPI Cards — vertical color bar, matches ViolationsListPage */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                    <KPICard
                        label="Total Tickets"
                        value={stats.total.toLocaleString()}
                        icon={LayoutGrid}
                        barColor="bg-blue-500"
                        textColor="text-blue-700"
                    />
                    <KPICard
                        label="Outstanding"
                        value={`$${stats.outstandingFines.toLocaleString()}`}
                        subtitle="Due + In Court"
                        icon={DollarSign}
                        barColor="bg-rose-500"
                        textColor="text-rose-700"
                    />
                    <KPICard
                        label="Open Offenses"
                        value={stats.openOffenses}
                        subtitle="Status: Due"
                        icon={AlertTriangle}
                        barColor="bg-amber-500"
                        textColor="text-amber-700"
                    />
                    <KPICard
                        label="In Court"
                        value={stats.inCourt}
                        subtitle="Awaiting hearing"
                        icon={Scale}
                        barColor="bg-indigo-500"
                        textColor="text-indigo-700"
                    />
                    <KPICard
                        label="Paid This Month"
                        value={stats.paidThisMonth}
                        subtitle="Recent closures"
                        icon={CheckCircle}
                        barColor="bg-emerald-500"
                        textColor="text-emerald-700"
                    />
                    <KPICard
                        label="Electronic"
                        value={stats.electronic}
                        subtitle={`${stats.total ? Math.round((stats.electronic / stats.total) * 100) : 0}% eTickets`}
                        icon={FileText}
                        barColor="bg-violet-500"
                        textColor="text-violet-700"
                    />
                </div>

                {/* ── Missing-tickets reconciliation notification ───────────────
                    Surfaces ticket references from sources that don't have
                    a matching ticket on file:
                      • Violations marked "Citation Issued" carrying ticket #
                      • FMCSA SMS feed entries with a citation #
                      • Ontario CVOR conviction reports
                      • NSC Alberta / PEI / Nova Scotia conviction records
                      • Federal Contraventions Act tickets
                    Click a row (or the Add to log button) to open the Add
                    form prefilled. The Sync feeds button pulls a fresh
                    batch from the simulated regulator feeds. */}
                {accountId && (() => {
                    const { missingCount, onFileCount, perSource } = missingSummary;
                    const isOk = missingCount === 0;
                    const lastSyncText = lastSyncedAt
                        ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}`
                        : 'Pulls a fresh batch from the regulator feeds';

                    // Build a prefill draft that ONLY carries fields the source
                    // actually populated. Anything the regulator feed didn't
                    // include is left unset so the form doesn't fabricate
                    // values. Whatever IS present pre-fills the right field.
                    const buildPrefillFromMissing = (m: MissingTicketRef): TicketFormDraft => {
                        const v = m.violation;
                        const e = m.external;
                        const [maybeCity, maybeState] = m.location.split(',').map(s => s?.trim() ?? '');
                        const country =
                            m.country === 'CA' ? 'Canada' :
                            m.country === 'USA' ? 'USA' :
                            m.currency === 'CAD' ? 'Canada' : 'USA';

                        // Resolve driver + asset from the carrier roster so the
                        // form's dropdowns auto-select (not just driverName as
                        // free text). External-feed entries usually only carry
                        // a name + plate, so we match against the system.
                        const carrierDrivers = accountId ? (CARRIER_DRIVERS[accountId] ?? []) : [];
                        const carrierAssets  = accountId ? (CARRIER_ASSETS[accountId] ?? [])  : [];
                        const normalize = (s: string | undefined) => (s ?? '').trim().toLowerCase();
                        const driverByLink = v?.driverId ? carrierDrivers.find(d => d.id === v.driverId) : undefined;
                        const driverByName = driverByLink ?? carrierDrivers.find(d => {
                            const full = `${(d as any).firstName ?? ''} ${(d as any).lastName ?? (d as any).name ?? ''}`.trim();
                            return normalize(full) === normalize(m.driverName);
                        });
                        const assetByLink = v?.assetId ? carrierAssets.find(a => a.id === v.assetId) : undefined;
                        const assetByPlate = assetByLink ?? (e?.vehiclePlate
                            ? carrierAssets.find(a => normalize(a.plateNumber) === normalize(e.vehiclePlate))
                            : undefined);

                        const draft: TicketFormDraft = {
                            date: m.date,
                            currency: m.currency,
                            // Default status to 'Due' for new tickets — every
                            // source ultimately produces a Due record locally.
                            status: 'Due',
                            // Drop only the identifiers the source carried.
                            identifiers: {
                                ...(m.ticketNumber   ? { ticketNumber:   m.ticketNumber   } : {}),
                                ...(m.citationNumber ? { citationNumber: m.citationNumber } : {}),
                                ...(m.violationCode  ? { violationCode:  m.violationCode  } : {}),
                            },
                        };

                        if (m.time)           draft.time = m.time;
                        if (m.driverName)     draft.driverName = m.driverName;
                        if (driverByName) {
                            draft.driverId = driverByName.id;
                            // Use the canonical roster name so the form's
                            // dropdown auto-selects exactly.
                            const full = `${(driverByName as any).firstName ?? ''} ${(driverByName as any).lastName ?? (driverByName as any).name ?? ''}`.trim();
                            if (full) draft.driverName = full;
                        }
                        if (assetByPlate) {
                            draft.assetId = assetByPlate.id;
                            draft.assetUnitNumber = assetByPlate.unitNumber;
                        }
                        if (v?.locationStreet || e?.vehicleUnit) {
                            // Internal violation: rich street address.
                            // External feed: usually only city/state.
                            draft.locationStreet = v?.locationStreet;
                        }
                        if (m.city ?? maybeCity)   draft.locationCity = m.city ?? maybeCity;
                        if (m.state ?? maybeState) draft.locationState = m.state ?? maybeState;
                        if (v?.locationZip)        draft.locationZip = v.locationZip;
                        draft.locationCountry = country;
                        if (m.violationDescription) draft.violationSubtype = m.violationDescription;
                        if (v?.violationDataId)     draft.violationDataId = v.violationDataId;
                        return draft;
                    };

                    return (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex overflow-hidden">
                            {/* Thin vertical accent strip — amber when there's
                                work to do, emerald when reconciled. Same pattern
                                as the KPI cards above so the page reads as one
                                visual system. */}
                            <div className={cn('w-1.5 shrink-0', isOk ? 'bg-emerald-500' : 'bg-amber-500')} />
                            <div className="flex-1 min-w-0">
                                <div className="px-4 py-3 flex items-start justify-between gap-4 flex-wrap">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className={cn(
                                            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                                            isOk ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                                        )}>
                                            {isOk ? <ShieldCheck className="w-4 h-4" /> : <BellRing className="w-4 h-4" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                                {isOk
                                                    ? 'All ticket references reconciled'
                                                    : `${missingCount} ticket reference${missingCount === 1 ? '' : 's'} missing`}
                                            </h3>
                                            <p className="text-[12px] text-slate-500 mt-0.5">
                                                <span className="font-semibold text-slate-700 tabular-nums">{onFileCount}</span> on file
                                                {perSource.length > 0 && (
                                                    <>
                                                        <span className="mx-1.5 text-slate-300">·</span>
                                                        Cross-checked against{' '}
                                                        {perSource.map((b, i) => (
                                                            <React.Fragment key={b.source}>
                                                                {i > 0 && <span className="text-slate-300">, </span>}
                                                                <span
                                                                    className="text-slate-700"
                                                                    title={`${b.agency} — ${b.verified} verified, ${b.missing} missing`}
                                                                >
                                                                    {b.short}
                                                                </span>
                                                                <span className="text-slate-400 tabular-nums"> ({b.total})</span>
                                                            </React.Fragment>
                                                        ))}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSyncFeeds}
                                            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                                            title={lastSyncText}
                                        >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Sync feeds
                                        </button>
                                        {missingCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setMissingOpen(o => !o)}
                                                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
                                            >
                                                {missingOpen ? 'Hide' : 'Show'} missing
                                                {missingOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                            {/* Missing list — selectable rows + pagination. Mirrors
                                the Violations page exactly. Bulk action bar appears
                                when ≥ 1 row is selected. */}
                            {missingCount > 0 && missingOpen && (() => {
                                const totalMissing = visibleMissing.length;
                                const totalPagesM = Math.max(1, Math.ceil(totalMissing / missingPerPage));
                                const safePageM = Math.min(missingPage, totalPagesM);
                                const startIdx = (safePageM - 1) * missingPerPage;
                                const pageSlice = visibleMissing.slice(startIdx, startIdx + missingPerPage);
                                const pageIds = pageSlice.map(m => m.id);
                                const allSelectedOnPage = pageIds.length > 0 && pageIds.every(id => selectedMissingIds.has(id));
                                const someSelectedOnPage = pageIds.some(id => selectedMissingIds.has(id));
                                const selectedCount = selectedMissingIds.size;

                                const toggleOne = (id: string) => setSelectedMissingIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(id)) next.delete(id);
                                    else next.add(id);
                                    return next;
                                });
                                const toggleAllOnPage = () => setSelectedMissingIds(prev => {
                                    const next = new Set(prev);
                                    if (allSelectedOnPage) pageIds.forEach(id => next.delete(id));
                                    else pageIds.forEach(id => next.add(id));
                                    return next;
                                });
                                const addSelectedToTickets = () => {
                                    const selected = visibleMissing.filter(m => selectedMissingIds.has(m.id));
                                    if (selected.length === 0) return;
                                    for (const m of selected) {
                                        const draft = buildPrefillFromMissing(m);
                                        const projected: ViolationLike = {
                                            id: `T-USER-${Date.now()}-${m.id}`,
                                            date: draft.date,
                                            time: draft.time,
                                            driverId: draft.driverId,
                                            driverName: draft.driverName,
                                            assetId: draft.assetId,
                                            locationStreet: draft.locationStreet,
                                            locationCity: draft.locationCity,
                                            locationState: draft.locationState,
                                            locationCountry: draft.locationCountry,
                                            fineAmount: draft.fineAmount,
                                            currency: draft.currency,
                                            status: draft.status,
                                            category: draft.violationType,
                                            description: draft.violationSubtype,
                                            ticketNumber: draft.offenseNumber ?? draft.identifiers?.ticketNumber,
                                            ...(draft.identifiers ?? {}),
                                        };
                                        const built = buildTicketFromViolation(projected);
                                        if (built) addTicket(built);
                                    }
                                    setSelectedMissingIds(new Set());
                                    // The reconciler re-runs from the updated ticket
                                    // store so just-added refs drop off the list.
                                };

                                return (
                                    <div className="border-t border-amber-200 bg-white/60">
                                        {/* Bulk action bar */}
                                        {selectedCount > 0 && (
                                            <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between gap-3">
                                                <span className="text-xs font-semibold text-blue-800">
                                                    {selectedCount} reference{selectedCount === 1 ? '' : 's'} selected
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedMissingIds(new Set())}
                                                        className="text-xs font-medium text-blue-700 hover:text-blue-900"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={addSelectedToTickets}
                                                        className="inline-flex items-center gap-1 px-3 h-7 text-xs font-bold rounded-md bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Add {selectedCount} to tickets
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Compact 5-column table. Each cell stacks the
                                            data the source ACTUALLY carries — fields
                                            that aren't on the source render nothing
                                            (no '—' placeholder noise). */}
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-amber-50/95">
                                                    <tr className="text-left text-amber-800">
                                                        <th className="w-8 px-2 py-2">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-amber-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                                checked={allSelectedOnPage}
                                                                ref={el => { if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage; }}
                                                                onChange={toggleAllOnPage}
                                                                aria-label="Select all on page"
                                                            />
                                                        </th>
                                                        <th className="px-3 py-2 font-semibold w-[140px]">Source / Date</th>
                                                        <th className="px-3 py-2 font-semibold">Driver</th>
                                                        <th className="px-3 py-2 font-semibold">Violation</th>
                                                        <th className="px-3 py-2 font-semibold">Reference</th>
                                                        <th className="px-3 py-2 font-semibold text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {pageSlice.map(m => {
                                                        const checked = selectedMissingIds.has(m.id);
                                                        // Pick the strongest reference the source actually carries.
                                                        const primaryRef = m.ticketNumber
                                                            ? { label: 'Ticket #', value: m.ticketNumber }
                                                            : m.citationNumber
                                                                ? { label: 'Citation #', value: m.citationNumber }
                                                                : m.convictionNumber
                                                                    ? { label: 'Conviction #', value: m.convictionNumber }
                                                                    : null;
                                                        return (
                                                            <tr
                                                                key={m.id}
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => {
                                                                    setPrefillDraft(buildPrefillFromMissing(m));
                                                                    setEditingTicket(null);
                                                                    setIsDialogOpen(true);
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        setPrefillDraft(buildPrefillFromMissing(m));
                                                                        setEditingTicket(null);
                                                                        setIsDialogOpen(true);
                                                                    }
                                                                }}
                                                                title="Click to log this ticket with pre-filled details"
                                                                className={cn(
                                                                    'border-t border-amber-100 align-top cursor-pointer transition-colors',
                                                                    checked ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-amber-50/60',
                                                                )}
                                                            >
                                                                {/* Checkbox */}
                                                                <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                                                                    <input
                                                                        type="checkbox"
                                                                        className="rounded border-amber-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                                        checked={checked}
                                                                        onChange={() => toggleOne(m.id)}
                                                                        aria-label={`Select ${m.id}`}
                                                                    />
                                                                </td>
                                                                {/* Source / Date — source chip on top, date below */}
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    <span
                                                                        className={cn(
                                                                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
                                                                            m.sourceTone,
                                                                        )}
                                                                        title={m.sourceAgency}
                                                                    >
                                                                        {m.sourceLabel}
                                                                    </span>
                                                                    <p className="text-[11px] text-slate-600 mt-1">{m.date}</p>
                                                                    {m.time && <p className="text-[10px] text-slate-400">{m.time}</p>}
                                                                </td>
                                                                {/* Driver — name + licence (when carried) */}
                                                                <td className="px-3 py-2.5 max-w-[160px]">
                                                                    <p className="text-slate-700 truncate" title={m.driverName}>{m.driverName}</p>
                                                                    {m.driverLicense && (
                                                                        <p className="text-slate-400 font-mono text-[10px] truncate" title={m.driverLicense}>DL {m.driverLicense}</p>
                                                                    )}
                                                                </td>
                                                                {/* Violation — code + description + severity badge */}
                                                                <td className="px-3 py-2.5 max-w-[280px]">
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-mono font-bold whitespace-nowrap">
                                                                            {m.violationCode}
                                                                        </code>
                                                                        <span className={cn(
                                                                            'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border',
                                                                            m.severity === 'OOS' ? 'bg-red-100 text-red-700 border-red-200'
                                                                                : m.severity === 'Critical' ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                                                : m.severity === 'Serious' ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                                : 'bg-slate-100 text-slate-600 border-slate-200',
                                                                        )}>
                                                                            {m.severity}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-slate-700 mt-1 truncate" title={m.violationDescription}>
                                                                        {m.violationDescription}
                                                                    </p>
                                                                </td>
                                                                {/* Reference — the lookup #, plus secondary fields the
                                                                    source actually carries (location / fine / conviction
                                                                    date). Empty rows just don't render. */}
                                                                <td className="px-3 py-2.5 whitespace-nowrap">
                                                                    {primaryRef ? (
                                                                        <>
                                                                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{primaryRef.label}</p>
                                                                            <p className="font-mono text-[11px] text-slate-800">{primaryRef.value}</p>
                                                                        </>
                                                                    ) : (
                                                                        <span className="text-slate-300 text-[11px]">No reference #</span>
                                                                    )}
                                                                    {(m.city || m.state) && (
                                                                        <p className="text-[10px] text-slate-500 mt-1">
                                                                            {[m.city, m.state].filter(Boolean).join(', ')}
                                                                        </p>
                                                                    )}
                                                                    {m.convictionDate && m.convictionNumber && primaryRef?.label !== 'Conviction #' && (
                                                                        <p className="text-[10px] text-slate-400">Convicted {m.convictionDate}</p>
                                                                    )}
                                                                </td>
                                                                {/* Action */}
                                                                <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                                                                    <div className="inline-flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setPrefillDraft(buildPrefillFromMissing(m));
                                                                                setEditingTicket(null);
                                                                                setIsDialogOpen(true);
                                                                            }}
                                                                            className="text-xs font-semibold text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
                                                                        >
                                                                            <Plus className="w-3 h-3" /> Add
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setDismissedMissingIds(prev => {
                                                                                const next = new Set(prev);
                                                                                next.add(m.id);
                                                                                return next;
                                                                            })}
                                                                            className="inline-flex items-center justify-center w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                                                            title="Dismiss"
                                                                        >
                                                                            <X className="w-3 h-3" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination footer */}
                                        <div className="border-t border-amber-200 px-3 py-2 flex items-center justify-between gap-3 flex-wrap bg-amber-50/40">
                                            <div className="flex items-center gap-2 text-[11px] text-slate-600">
                                                <span>Rows per page:</span>
                                                <select
                                                    className="h-6 px-1.5 border border-slate-200 rounded bg-white text-[11px] focus:outline-none"
                                                    value={missingPerPage}
                                                    onChange={e => { setMissingPerPage(Number(e.target.value)); setMissingPage(1); }}
                                                >
                                                    {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                                                </select>
                                                <span className="ml-2 text-slate-400">
                                                    {startIdx + 1}-{Math.min(startIdx + missingPerPage, totalMissing)} of {totalMissing}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    disabled={safePageM <= 1}
                                                    onClick={() => setMissingPage(p => Math.max(1, p - 1))}
                                                    className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronLeft className="w-3 h-3" />
                                                </button>
                                                <span className="text-[11px] text-slate-600 tabular-nums">
                                                    {safePageM} / {totalPagesM}
                                                </span>
                                                <button
                                                    disabled={safePageM >= totalPagesM}
                                                    onClick={() => setMissingPage(p => Math.min(totalPagesM, p + 1))}
                                                    className="h-6 w-6 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                            </div>
                        </div>
                    );
                })()}

                {/* Filters + Table — one rounded container so they read as a
                    single component, mirroring ViolationsListPage. */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Sub-category breakdown — coloured KPI cards. Click a
                        card to narrow the table to that violation group. */}
                    {(() => {
                        if (subCategoryBreakdown.length === 0) {
                            return (
                                <div className="px-4 py-6 text-center text-[12px] text-slate-400 italic bg-slate-50/40">
                                    No tickets in this category for the current dataset.
                                </div>
                            );
                        }
                        // Coordinated palette so cards read as distinct sub-
                        // categories without competing with the page chrome.
                        const palette = [
                            { bar: 'bg-sky-500',     bg: 'bg-sky-50/60',     count: 'text-sky-700',     chip: 'bg-sky-50 text-sky-700 ring-sky-200',         barBg: 'bg-sky-100',     barFill: 'bg-sky-500' },
                            { bar: 'bg-violet-500',  bg: 'bg-violet-50/60',  count: 'text-violet-700',  chip: 'bg-violet-50 text-violet-700 ring-violet-200', barBg: 'bg-violet-100',  barFill: 'bg-violet-500' },
                            { bar: 'bg-emerald-500', bg: 'bg-emerald-50/60', count: 'text-emerald-700', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', barBg: 'bg-emerald-100', barFill: 'bg-emerald-500' },
                            { bar: 'bg-amber-500',   bg: 'bg-amber-50/60',   count: 'text-amber-700',   chip: 'bg-amber-50 text-amber-700 ring-amber-200',   barBg: 'bg-amber-100',   barFill: 'bg-amber-500' },
                            { bar: 'bg-rose-500',    bg: 'bg-rose-50/60',    count: 'text-rose-700',    chip: 'bg-rose-50 text-rose-700 ring-rose-200',      barBg: 'bg-rose-100',    barFill: 'bg-rose-500' },
                            { bar: 'bg-indigo-500',  bg: 'bg-indigo-50/60',  count: 'text-indigo-700',  chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200', barBg: 'bg-indigo-100',  barFill: 'bg-indigo-500' },
                            { bar: 'bg-teal-500',    bg: 'bg-teal-50/60',    count: 'text-teal-700',    chip: 'bg-teal-50 text-teal-700 ring-teal-200',      barBg: 'bg-teal-100',    barFill: 'bg-teal-500' },
                            { bar: 'bg-fuchsia-500', bg: 'bg-fuchsia-50/60', count: 'text-fuchsia-700', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200', barBg: 'bg-fuchsia-100', barFill: 'bg-fuchsia-500' },
                        ];
                        const tabCount = basicCounts[basicTab] ?? 1;
                        return (
                            <div className="p-3 border-b border-slate-200">
                                <div className="flex items-center justify-between mb-2 gap-3">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Sub-categories — violation groups in this view
                                        </div>
                                        <div className="text-[11px] text-slate-400">
                                            Click a card to narrow the table to that violation group
                                        </div>
                                    </div>
                                    {subCatFilter && (
                                        <button
                                            type="button"
                                            onClick={() => { setSubCatFilter(null); setPage(1); }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                                        >
                                            Clear sub-filter <X size={11} />
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {subCategoryBreakdown.map(([group, count], i) => {
                                        const selected = subCatFilter === group;
                                        const sharePct = tabCount > 0 ? (count / tabCount) * 100 : 0;
                                        const c = palette[i % palette.length];
                                        return (
                                            <button
                                                type="button"
                                                key={group}
                                                onClick={() => {
                                                    setSubCatFilter(selected ? null : group);
                                                    setPage(1);
                                                }}
                                                title={`${group} — ${count} ticket${count === 1 ? '' : 's'}`}
                                                className={cn(
                                                    'group text-left rounded-lg border overflow-hidden shadow-sm transition-all flex flex-col h-full',
                                                    selected
                                                        ? 'border-slate-900 ring-2 ring-slate-900/20 bg-white'
                                                        : `border-slate-200 hover:border-slate-300 hover:shadow-md ${c.bg}`,
                                                )}
                                            >
                                                <div className={cn('h-1 w-full', selected ? 'bg-slate-900' : c.bar)} />
                                                <div className="px-3 py-2.5 flex-1 flex flex-col">
                                                    <div
                                                        className="text-[11px] font-semibold text-slate-700 leading-snug line-clamp-2 min-h-[2.6em]"
                                                        title={group}
                                                    >
                                                        {group}
                                                    </div>
                                                    <div className="flex items-end justify-between gap-2 mt-2">
                                                        <span className={cn(
                                                            'text-[22px] font-bold tabular-nums leading-none',
                                                            selected ? 'text-slate-900' : c.count,
                                                        )}>
                                                            {count}
                                                        </span>
                                                        <span className={cn(
                                                            'text-[10px] tabular-nums font-semibold px-1.5 py-0.5 rounded-md ring-1',
                                                            selected
                                                                ? 'text-slate-900 bg-white ring-slate-300'
                                                                : c.chip,
                                                        )}>
                                                            {sharePct.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        'mt-2 h-1 rounded-full overflow-hidden',
                                                        selected ? 'bg-slate-200' : c.barBg,
                                                    )}>
                                                        <div
                                                            className={cn('h-full rounded-full transition-all', selected ? 'bg-slate-900' : c.barFill)}
                                                            style={{ width: `${Math.min(100, sharePct)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    <div className="p-3 space-y-2.5">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    className="w-full h-8 pl-8 pr-3 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                    placeholder="Search offense #, ticket #, driver, asset, location…"
                                    value={searchTerm}
                                    onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>
                            {anyFilter && (
                                <button
                                    type="button"
                                    onClick={() => { resetFilters(); setPage(1); }}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold border bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                                >
                                    <X className="w-3 h-3" /> Reset filters
                                </button>
                            )}
                        </div>

                        {/* Filter row 2 — date range + dropdowns */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={dateFrom}
                                        max={dateTo || undefined}
                                        onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                                        aria-label="From date"
                                        className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                                <span className="text-slate-400">-</span>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={dateTo}
                                        min={dateFrom || undefined}
                                        onChange={e => { setDateTo(e.target.value); setPage(1); }}
                                        aria-label="To date"
                                        className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                    />
                                </div>
                            </div>

                            <select
                                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={statusFilter}
                                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                            >
                                <option>All Statuses</option>
                                <option>Due</option>
                                <option>In Court</option>
                                <option>Paid</option>
                                <option>Closed</option>
                            </select>
                            <select
                                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={violationFilter}
                                onChange={e => { setViolationFilter(e.target.value); setPage(1); }}
                            >
                                <option>All Types</option>
                                {VIOLATION_TYPE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <select
                                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={docTypeFilter}
                                onChange={e => { setDocTypeFilter(e.target.value); setPage(1); }}
                            >
                                <option value="All Documents">All Documents</option>
                                {DOC_TYPE_OPTIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                            </select>
                            <select
                                className="h-9 px-2 text-sm border border-slate-200 rounded-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={sourceFilter}
                                onChange={e => { setSourceFilter(e.target.value as typeof sourceFilter); setPage(1); }}
                                title="Filter by regulator source"
                            >
                                <option value="All Sources">All Sources</option>
                                <option value="SMS">SMS (FMCSA)</option>
                                <option value="CVOR">CVOR (Ontario)</option>
                                <option value="NSC">NSC (Canada)</option>
                            </select>
                        </div>
                    </div>

                    {/* Divider between filters and the table — same pattern as Violations */}
                    <div className="border-t border-slate-200" />

                    {/* Data Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Offense #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ticket #</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Location</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Asset</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Driver</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Violation</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Document Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fine</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Docs</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pageRows.map((ticket) => {
                                    const isViewing = expandedId === ticket.id;
                                    return (
                                    <tr
                                        key={ticket.id}
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                        onClick={() => setExpandedId(ticket.id)}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-semibold text-blue-600 hover:underline cursor-pointer">{ticket.offenseNumber}</span>
                                                {/* Ticket-kind chip — Paper (blue) vs Electronic (violet).
                                                    Defaults to Paper for legacy records (undefined). */}
                                                <span
                                                    className={`inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${
                                                        ticket.ticketKind === 'Electronic'
                                                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}
                                                >
                                                    {ticket.ticketKind === 'Electronic' ? 'eTicket' : 'Ticket'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-mono font-medium text-slate-800">
                                                    {ticket.identifiers?.ticketNumber || <span className="text-slate-300 font-sans italic font-normal">—</span>}
                                                </span>
                                                {ticket.identifiers?.violationCode && (
                                                    <span className="text-[10px] text-slate-400 font-mono">code {ticket.identifiers.violationCode}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-900">{ticket.date}</span>
                                                <span className="text-xs text-slate-500">{ticket.time}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="whitespace-nowrap text-sm font-medium text-slate-900">{ticket.location.split(',')[0]}</span>
                                                <span className="text-xs text-slate-500 truncate max-w-[150px]" title={ticket.description}>
                                                    {ticket.location.split(',')[1] || ''}
                                                    {ticket.description}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{ticket.assetId}</td>
                                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{ticket.driverName}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 min-w-[220px]">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {getViolationBadge(ticket.violationType)}
                                                    {ticket.violations && ticket.violations.length > 1 && (
                                                        <span
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"
                                                            title={ticket.violations.map(v => v.label).join(' · ')}
                                                        >
                                                            +{ticket.violations.length - 1} more
                                                        </span>
                                                    )}
                                                    {ticket.isOos && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                            OOS
                                                        </span>
                                                    )}
                                                </div>
                                                {ticket.violationSubtype && (
                                                    <span
                                                        className="text-[11px] text-slate-700 leading-tight truncate max-w-[260px]"
                                                        title={ticket.violationSubtype}
                                                    >
                                                        {ticket.violationSubtype}
                                                    </span>
                                                )}
                                                {(ticket.violationCategory || ticket.violationGroup) && (
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {ticket.violationCategory && (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                                {ticket.violationCategory}
                                                            </span>
                                                        )}
                                                        {ticket.violationGroup && (
                                                            <>
                                                                <span className="text-[10px] text-slate-300">/</span>
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                                    {ticket.violationGroup}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getDocTypeBadge(ticket)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-slate-900 whitespace-nowrap">
                                            {ticket.currency === 'CAD' ? 'CA$' : '$'}{ticket.fineAmount.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                            {getStatusBadge(ticket.status)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3">
                                                 <span title="Offense Ticket">
                                                     <FileText className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform ${ticket.hasTicketFile ? 'text-green-600' : 'text-slate-200'}`} />
                                                 </span>
                                                 <span title="Payment Receipt">
                                                     <FileCheck className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform ${ticket.hasReceiptFile ? 'text-green-600' : 'text-slate-200'}`} />
                                                 </span>
                                                 <span title="Notice of Trial">
                                                     <Scale className={`w-4 h-4 cursor-pointer hover:scale-110 transition-transform ${ticket.hasNoticeFile ? 'text-gray-600' : 'text-slate-200'}`} />
                                                 </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setExpandedId(ticket.id); }}
                                                    className={cn(
                                                        'p-1.5 rounded-md transition-colors',
                                                        isViewing
                                                            ? 'text-blue-700 bg-blue-50'
                                                            : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'
                                                    )}
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(ticket); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                    title="Edit ticket"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setRemoveCandidate(ticket); }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                                    title="Remove ticket"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <KebabMenu items={[{ label: 'Share to chat', icon: Share2, onClick: () => setShareRecord(ticketRef(ticket)) }]} />
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {pageRows.length === 0 && (
                                    <tr>
                                        <td colSpan={12} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="w-8 h-8 text-slate-300" />
                                                <p>No tickets found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination footer — same shape as ViolationsListPage. */}
                    {filteredTickets.length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                            <div className="flex items-center gap-3">
                                <span>
                                    Showing <span className="font-semibold text-slate-800">{(safePage - 1) * perPage + 1}</span>
                                    {' – '}
                                    <span className="font-semibold text-slate-800">{Math.min(safePage * perPage, filteredTickets.length)}</span>
                                    {' of '}
                                    <span className="font-semibold text-slate-800">{filteredTickets.length}</span>
                                </span>
                                <select
                                    value={perPage}
                                    onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="h-7 px-2 text-xs border border-slate-200 rounded-md bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    aria-label="Rows per page"
                                >
                                    {[10, 20, 50, 100].map(n => (
                                        <option key={n} value={n}>{n} / page</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    className="h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Prev
                                </button>
                                <span className="tabular-nums px-2">
                                    Page <span className="font-semibold text-slate-800">{safePage}</span> / {totalPages}
                                </span>
                                <button
                                    type="button"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    className="h-7 px-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                </div>
            </div>

            {/* ── Remove confirmation — opens when the trash icon is pressed.
                Asks the user to confirm before destructively removing the
                ticket from the carrier's ledger. */}
            {removeCandidate && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6"
                    onClick={() => setRemoveCandidate(null)}
                >
                    <div
                        className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 flex items-start gap-3">
                            <div className="h-10 w-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <AlertOctagon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold text-slate-900">Remove this ticket?</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    Offense <span className="font-mono font-semibold">{removeCandidate.offenseNumber}</span>
                                    {removeCandidate.identifiers?.ticketNumber && (
                                        <> (ticket <span className="font-mono">{removeCandidate.identifiers.ticketNumber}</span>)</>
                                    )} will be removed from your ledger. This cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setRemoveCandidate(null)}
                                className="h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    removeTicket(removeCandidate.id);
                                    setRemoveCandidate(null);
                                    if (expandedId === removeCandidate.id) setExpandedId(null);
                                }}
                                className="h-9 px-4 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-500 shadow-sm inline-flex items-center gap-1.5"
                            >
                                <Trash2 className="w-4 h-4" /> Remove ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {shareRecord && (
                <ShareToChat
                    open
                    onClose={() => setShareRecord(null)}
                    title={`Share ${shareRecord.label}`}
                    subtitle="Send the record + documents in a chat, or to an outsider by email"
                    source={{ type: 'ticket', id: shareRecord.id, label: shareRecord.label }}
                    items={[]}
                    record={shareRecord}
                    defaultChannel="in-app"
                    defaultSubject={shareRecord.label}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate?.('/messages'); }}
                />
            )}
        </div>
    );
};
