/**
 * Safety Analysis — new UI built on the risk-engine.
 *
 * Spec: docs/SAFETY.md §10–§11 (UI components + live charts).
 *
 * Layout:
 *   [Header]      breadcrumb · CarrierSwitcher (drives the whole page)
 *   [Scope tabs]  Overview · Drivers · Assets · Combined
 *   [Body]        scope-specific cards (gauge, components, sources,
 *                 contributors, recommendations, distribution)
 *
 * Picking a carrier in the dropdown is the only input — every panel below
 * recomputes against that carrier through `useRiskScore` /
 * `useRiskDistribution`, both of which subscribe to the engine cache and
 * re-render automatically when settings or compliance toggles change.
 */

import { useMemo, useState } from 'react';
import {
    Building2,
    Users,
    Truck,
    LayoutGrid,
    ChevronRight,
    Info,
    Shield,
    Filter,
    Search,
    AlertTriangle,
    AlertCircle,
    CheckCircle2,
    Activity,
    Calendar,
    ChevronLeft,
    TrendingUp,
} from 'lucide-react';

import { CarrierSwitcher } from '@/components/layout/CarrierSwitcher';
import { ACCOUNTS_DB, type AccountRecord } from '@/pages/accounts/accounts.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { getManagedAccountIds, ROLE_LABELS, type AppUser } from '@/data/users.data';
import { cn } from '@/lib/utils';

import { useRiskScore, useRiskDistribution } from './risk-store';
import { loadRiskConfig, ratingColor } from './risk-config';
import { forecastCarrierRisk } from './risk-forecast';
import { loadRiskEventsForCarrier } from './risk-load';
import { aggregateByJurisdiction } from './risk-geo';
import { NorthAmericaMap } from './NorthAmericaMap';
import {
    RiskTrendChart,
    DomainRadarChart,
    JurisdictionStackedBar,
    OosRateSparkline,
} from './SafetyCharts';
import { SafetyForecast } from './SafetyForecast';
import { HowComputed } from './HowComputed';
import { SourceCoverageCard } from './SourceCoverageCard';
import { forecastDriverIncidents } from './risk-incident-forecast';
import { forecastCarrierMaintenance } from './risk-maintenance-forecast';
import type {
    EntityRiskScore,
    Rating,
    RiskScope,
    SourceScore,
    ComponentScore,
    RiskContribution,
    RiskRecommendation,
    ScoreDistribution,
} from './risk-engine.types';

// ────────────────────────────────────────────────────────────────────────────
// Page entry
// ────────────────────────────────────────────────────────────────────────────

interface NewSafetyAnalysisPageProps {
    accountId?: string;
    currentUser?: AppUser;
    onSelectAccount?: (account: AccountRecord) => void;
}

type ScopeTab = 'overview' | 'drivers' | 'assets' | 'combined' | 'forecast';

export function NewSafetyAnalysisPage({
    accountId,
    currentUser,
    onSelectAccount,
}: NewSafetyAnalysisPageProps = {}) {
    const availableCarriers = useMemo<AccountRecord[]>(() => {
        if (!currentUser) return ACCOUNTS_DB;
        const managed = getManagedAccountIds(currentUser);
        if (managed === undefined) return ACCOUNTS_DB;
        return ACCOUNTS_DB.filter((a) => managed.includes(a.id));
    }, [currentUser]);

    const activeAccountId = accountId ?? availableCarriers[0]?.id ?? ACCOUNTS_DB[0]?.id ?? '';
    const activeAccount = ACCOUNTS_DB.find((a) => a.id === activeAccountId);
    const [scopeTab, setScopeTab] = useState<ScopeTab>('overview');
    const [drillDriverId, setDrillDriverId] = useState<string | null>(null);
    const [drillAssetId, setDrillAssetId] = useState<string | null>(null);

    // Reset drill-downs when carrier changes.
    const lastIdRef = useMemoRef(activeAccountId);
    if (lastIdRef.current !== activeAccountId) {
        lastIdRef.current = activeAccountId;
        if (drillDriverId || drillAssetId) {
            setDrillDriverId(null);
            setDrillAssetId(null);
        }
    }

    return (
        <div className="flex-1 overflow-x-hidden bg-slate-50 min-h-screen p-4 lg:p-6">
            {/* Header — breadcrumb + carrier switcher */}
            <div className="mb-5 flex items-center justify-between gap-4 flex-wrap min-h-[36px]">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Shield className="w-4 h-4" />
                    <span>Safety</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-semibold text-slate-900">Analysis</span>
                </div>

                {availableCarriers.length > 0 && (
                    <CarrierSwitcher
                        selectedAccountId={activeAccountId}
                        accounts={availableCarriers.map((a) => ({
                            id: a.id,
                            legalName: a.legalName,
                            dbaName: a.dbaName,
                            dotNumber: a.dotNumber,
                        }))}
                        onSelect={(id) => {
                            const acct = ACCOUNTS_DB.find((a) => a.id === id);
                            if (acct) onSelectAccount?.(acct);
                        }}
                        scopeLabel={
                            currentUser
                                ? currentUser.role === 'super-admin'
                                    ? `${ROLE_LABELS[currentUser.role]} · All carriers`
                                    : `${ROLE_LABELS[currentUser.role]} · ${availableCarriers.length} carrier${availableCarriers.length === 1 ? '' : 's'}`
                                : undefined
                        }
                    />
                )}
            </div>

            {/* Scope tab strip */}
            <ScopeTabBar
                active={scopeTab}
                onChange={(t) => {
                    setScopeTab(t);
                    setDrillDriverId(null);
                    setDrillAssetId(null);
                }}
                carrierName={activeAccount?.dbaName ?? activeAccount?.legalName ?? '—'}
            />

            {/* Body */}
            <div className="mt-5 space-y-5">
                {scopeTab === 'overview' && activeAccountId && (
                    <CarrierOverview carrierId={activeAccountId} />
                )}

                {scopeTab === 'drivers' && activeAccountId && !drillDriverId && (
                    <DriverList
                        carrierId={activeAccountId}
                        onSelect={(id) => setDrillDriverId(id)}
                    />
                )}
                {scopeTab === 'drivers' && activeAccountId && drillDriverId && (
                    <DriverDetail
                        carrierId={activeAccountId}
                        driverId={drillDriverId}
                        onBack={() => setDrillDriverId(null)}
                    />
                )}

                {scopeTab === 'assets' && activeAccountId && !drillAssetId && (
                    <AssetList
                        carrierId={activeAccountId}
                        onSelect={(id) => setDrillAssetId(id)}
                    />
                )}
                {scopeTab === 'assets' && activeAccountId && drillAssetId && (
                    <AssetDetail
                        carrierId={activeAccountId}
                        assetId={drillAssetId}
                        onBack={() => setDrillAssetId(null)}
                    />
                )}

                {scopeTab === 'combined' && activeAccountId && (
                    <CombinedView carrierId={activeAccountId} />
                )}

                {scopeTab === 'forecast' && activeAccountId && (
                    <SafetyForecast carrierId={activeAccountId} />
                )}
            </div>
        </div>
    );
}

/** Tiny ref helper without using `useRef` directly to keep the file
 *  free of additional imports. */
function useMemoRef<T>(initial: T): { current: T } {
    return useMemo(() => ({ current: initial }), []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ────────────────────────────────────────────────────────────────────────────
// Scope tab bar
// ────────────────────────────────────────────────────────────────────────────

function ScopeTabBar({
    active, onChange, carrierName,
}: {
    active: ScopeTab;
    onChange: (t: ScopeTab) => void;
    carrierName: string;
}) {
    const tabs: { id: ScopeTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'drivers',  label: 'Drivers',  icon: Users },
        { id: 'assets',   label: 'Assets',   icon: Truck },
        { id: 'combined', label: 'Combined', icon: Activity },
        { id: 'forecast', label: 'Forecast', icon: TrendingUp },
    ];
    return (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="bg-white rounded-xl border border-slate-200 p-1 inline-flex">
                {tabs.map((t) => {
                    const Icon = t.icon;
                    const on = active === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
                            className={cn(
                                'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                                on
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50',
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span className="font-medium text-slate-700">{carrierName}</span>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Overview (carrier scope)
// ────────────────────────────────────────────────────────────────────────────

function CarrierOverview({ carrierId }: { carrierId: string }) {
    const score = useRiskScore({ kind: 'carrier', carrierId }, carrierId);
    const driverDist = useRiskDistribution('driver', carrierId, carrierId);
    const assetDist = useRiskDistribution('asset', carrierId, carrierId);

    const events = useMemo(() => loadRiskEventsForCarrier(carrierId), [carrierId]);
    const jurStats = useMemo(() => aggregateByJurisdiction(events), [events]);

    // 30-day delta — reconstructed by the forecast engine. Negative means
    // the score has fallen from a month ago; positive means it has improved.
    const delta30 = useMemo(() => {
        const cfg = loadRiskConfig(carrierId);
        const summary = forecastCarrierRisk(carrierId, 1, cfg);
        const hist = summary.history;
        if (hist.length < 2) return undefined;
        // Use the score from ~1 month ago vs current.
        const monthAgo = hist[hist.length - 2]?.predictedSafety;
        if (monthAgo == null) return undefined;
        return +(score.safetyScore - monthAgo).toFixed(1);
    }, [carrierId, score.safetyScore]);

    return (
        <div className="space-y-5">
            {/* On-page methodology — collapsible blue card so users see HOW
                the carrier score is computed without leaving the page. */}
            <HowComputed
                title="How the carrier score is computed"
                steps={[
                    <>The engine loads every event from <b>FMCSA · CVOR · NSC AB/BC/PE/NS · Internal</b> sources for this carrier and tags them by domain (crash, HOS, vehicle maintenance, etc.).</>,
                    <>Each event is normalised to a 0–10 severity, decayed by age (half-life 12 months) and capped at 36 months — older events stop counting.</>,
                    <>Five components are scored 0–100: <b>Regulatory · Incidents · Inspections/OOS · Driver aggregate · Asset aggregate</b>. Their weighted sum is the carrier safety score.</>,
                    <>Critical overrides (fatal crash within 24 mo, 2+ OOS in 6 mo, FMCSA Crash Indicator alert, NSC BC Unsatisfactory) force the rating to <b>Critical</b> regardless of the weighted score.</>,
                    <>Confidence reflects data density — sparse history means the score is shown but flagged "low confidence".</>,
                ]}
                formula={'Safety = 0.45·Regulatory + 0.20·Incidents + 0.15·InspectionsOOS + 0.10·DriverAgg + 0.10·AssetAgg'}
                collapsedByDefault={false}
            />

            {/* Top row — score card + recommendations + OOS sparkline + sources */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <div className="xl:col-span-4">
                    <ScoreCard score={score} title="Carrier risk" subtitle="Combined safety score" delta30={delta30} />
                </div>
                <div className="xl:col-span-4">
                    <OosRateSparkline carrierId={carrierId} months={12} />
                    <div className="mt-5">
                        <DistributionCard
                            title="Driver distribution"
                            subtitle={`${driverDist.total} drivers · median ${driverDist.median.toFixed(1)}`}
                            distribution={driverDist}
                        />
                    </div>
                </div>
                <div className="xl:col-span-4">
                    <RecommendationsCard recos={score.recommendations} />
                </div>
            </div>

            {/* Map row — full width */}
            <NorthAmericaMap
                stats={jurStats}
                bubbles
                title="Geographic distribution"
                subtitle="State / province event hotspots — choropleth + bubble overlay."
            />

            {/* Components / radar */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-2">
                    <ComponentsCard components={score.componentScores} />
                </div>
                <div className="xl:col-span-1">
                    <DomainRadarChart events={events} />
                </div>
            </div>

            {/* Sources + jurisdiction stacked bar */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-1">
                    <SourcesCard sources={score.sourceScores} />
                </div>
                <div className="xl:col-span-2">
                    <JurisdictionStackedBar carrierId={carrierId} />
                </div>
            </div>

            {/* Source coverage detail — shows every enrolled vs missing source */}
            <SourceCoverageCard carrierId={carrierId} />

            {/* Trend + asset distribution */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <RiskTrendChart carrierId={carrierId} months={12} />
                <DistributionCard
                    title="Asset score distribution"
                    subtitle={`${assetDist.total} assets · median ${assetDist.median.toFixed(1)}`}
                    distribution={assetDist}
                />
            </div>

            {/* Top 3 Riskiest Assignments — compact replacement for the
                full driver×asset matrix (which lives on the Combined tab). */}
            <TopRiskyAssignments carrierId={carrierId} />

            {/* Top contributors */}
            <ContributorsCard contributors={score.topContributors} />
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Top 3 Riskiest Assignments — Overview-only summary
// ────────────────────────────────────────────────────────────────────────────

function TopRiskyAssignments({ carrierId }: { carrierId: string }) {
    const drivers = (CARRIER_DRIVERS[carrierId] ?? []).slice(0, 12);
    const assets = (CARRIER_ASSETS[carrierId] ?? []).slice(0, 12);

    const top = useMemo(() => {
        const pairs: Array<{
            driverId: string; driverName: string;
            assetId: string; unitNumber: string; plate?: string;
            score: number; rating: Rating; sharedEvents: number;
        }> = [];
        for (const d of drivers) {
            for (const a of assets) {
                const s = getRiskScore({
                    kind: 'driverAsset', carrierId, driverId: d.id, assetId: a.id,
                }, carrierId);
                pairs.push({
                    driverId: d.id,
                    driverName: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || d.id,
                    assetId: a.id,
                    unitNumber: a.unitNumber ?? a.id.slice(-4),
                    plate: a.plateNumber,
                    score: s.safetyScore,
                    rating: s.rating,
                    sharedEvents: s.eventCount,
                });
            }
        }
        return pairs.sort((x, y) => x.score - y.score).slice(0, 3);
    }, [drivers, assets, carrierId]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Top 3 riskiest assignments</h3>
                <span className="text-[11px] text-slate-500">
                    Full matrix on the Combined tab
                </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Lowest-scoring driver × asset pairs across this carrier. Click any to drill into the pair.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {top.length === 0 && (
                    <div className="md:col-span-3 text-sm text-slate-500 text-center py-4">
                        No driver / asset pairs to compare.
                    </div>
                )}
                {top.map((p, i) => {
                    const c = ratingColor(p.rating);
                    return (
                        <div
                            key={`${p.driverId}-${p.assetId}`}
                            className={cn(
                                'rounded-lg ring-1 p-3 flex items-start gap-3',
                                c.bg, c.ring,
                            )}
                        >
                            <div
                                className={cn(
                                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                                    'bg-white ring-1', c.text, c.ring,
                                )}
                            >
                                #{i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">
                                    {p.driverName}
                                </div>
                                <div className="text-xs text-slate-700 truncate">
                                    Unit {p.unitNumber}{p.plate ? ` · ${p.plate}` : ''}
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                    <span className={cn('text-lg font-bold tabular-nums', c.text)}>
                                        {p.score.toFixed(0)}
                                    </span>
                                    <RatingPill rating={p.rating} />
                                </div>
                                <div className="text-[10px] text-slate-500 mt-1">
                                    {p.sharedEvents} shared event{p.sharedEvents === 1 ? '' : 's'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Driver list + detail
// ────────────────────────────────────────────────────────────────────────────

function DriverList({
    carrierId, onSelect,
}: { carrierId: string; onSelect: (id: string) => void }) {
    const drivers = CARRIER_DRIVERS[carrierId] ?? [];
    const [filter, setFilter] = useState<Rating | 'All'>('All');
    const [query, setQuery] = useState('');

    // Pull predicted-incident data once so each row can show trend + last event.
    const incidentForecasts = useMemo(
        () => forecastDriverIncidents(carrierId, 12),
        [carrierId],
    );
    const incidentByDriverId = useMemo(() => {
        const m = new Map<string, (typeof incidentForecasts)[number]>();
        for (const i of incidentForecasts) m.set(i.driverId, i);
        return m;
    }, [incidentForecasts]);

    const rows = useMemo(() => {
        return drivers
            .map((d) => ({
                d,
                score: scoreFor({ kind: 'driver', carrierId, driverId: d.id }, carrierId),
                incident: incidentByDriverId.get(d.id),
            }))
            .filter(({ d, score }) => {
                if (filter !== 'All' && score.rating !== filter) return false;
                if (query) {
                    const q = query.toLowerCase();
                    const name = `${d.firstName ?? ''} ${d.lastName ?? ''}`.toLowerCase();
                    if (!name.includes(q) && !(d.licenseNumber ?? '').toLowerCase().includes(q)) return false;
                }
                return true;
            })
            .sort((a, b) => a.score.safetyScore - b.score.safetyScore); // worst first
    }, [drivers, filter, query, carrierId, incidentByDriverId]);

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search drivers by name or licence…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                </div>
                <BandFilter value={filter} onChange={setFilter} />
            </div>
            <div className="divide-y divide-slate-100">
                {rows.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500">
                        No drivers match the current filters.
                    </div>
                )}
                {rows.map(({ d, score, incident }) => (
                    <button
                        key={d.id}
                        type="button"
                        onClick={() => onSelect(d.id)}
                        className="w-full text-left p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                        <ScoreOrb safetyScore={score.safetyScore} rating={score.rating} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">
                                {`${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || d.id}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                                Licence {d.licenseNumber ?? '—'} · {score.eventCount} events · {score.confidence} confidence
                            </div>
                        </div>
                        {incident && (
                            <>
                                <div
                                    className="hidden lg:block text-right pr-3 min-w-[100px]"
                                    title={`Forecast: ${incident.predictedViolations.toFixed(1)} violations & ${incident.predictedAccidents.toFixed(1)} accidents over the next 12 months`}
                                >
                                    <div className="text-xs font-bold text-slate-800 tabular-nums">
                                        {incident.predictedViolations.toFixed(1)}
                                        <span className="text-slate-400 font-normal text-[10px] ml-0.5">v</span>
                                        <span className="mx-1 text-slate-300">·</span>
                                        <span className={cn(incident.predictedAccidents >= 0.5 ? 'text-rose-700' : 'text-slate-800')}>
                                            {incident.predictedAccidents.toFixed(1)}
                                            <span className="text-slate-400 font-normal text-[10px] ml-0.5">a</span>
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">predicted · 12mo</div>
                                </div>
                                <div className="hidden md:block text-right pr-2 min-w-[110px]">
                                    <TrendArrow slope={incident.trendSlope} />
                                    <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                                        {Number.isFinite(incident.daysSinceLastEvent)
                                            ? `last ${incident.daysSinceLastEvent}d ago`
                                            : 'no events'}
                                    </div>
                                </div>
                            </>
                        )}
                        <RatingPill rating={score.rating} />
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                ))}
            </div>
        </div>
    );
}

function DriverDetail({
    carrierId, driverId, onBack,
}: { carrierId: string; driverId: string; onBack: () => void }) {
    const score = useRiskScore({ kind: 'driver', carrierId, driverId }, carrierId);
    const driver = (CARRIER_DRIVERS[carrierId] ?? []).find((d) => d.id === driverId);
    const name = driver
        ? `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() || driverId
        : driverId;

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Back to drivers
            </button>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-1 space-y-5">
                    <ScoreCard score={score} title={name} subtitle="Driver risk" />
                    <RecommendationsCard recos={score.recommendations} />
                </div>
                <div className="xl:col-span-2 space-y-5">
                    <ComponentsCard components={score.componentScores} />
                    <ContributorsCard contributors={score.topContributors} />
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Asset list + detail
// ────────────────────────────────────────────────────────────────────────────

function AssetList({
    carrierId, onSelect,
}: { carrierId: string; onSelect: (id: string) => void }) {
    const assets = CARRIER_ASSETS[carrierId] ?? [];
    const [filter, setFilter] = useState<Rating | 'All'>('All');
    const [query, setQuery] = useState('');

    // Pull a 12-month maintenance forecast once, then count overdue items per asset.
    const overdueByAssetId = useMemo(() => {
        const m = new Map<string, number>();
        for (const it of forecastCarrierMaintenance(carrierId, 12)) {
            if (it.status === 'overdue') m.set(it.assetId, (m.get(it.assetId) ?? 0) + 1);
        }
        return m;
    }, [carrierId]);

    const rows = useMemo(() => {
        return assets
            .map((a) => ({
                a,
                score: scoreFor({ kind: 'asset', carrierId, assetId: a.id }, carrierId),
                overdueCount: overdueByAssetId.get(a.id) ?? 0,
            }))
            .filter(({ a, score }) => {
                if (filter !== 'All' && score.rating !== filter) return false;
                if (query) {
                    const q = query.toLowerCase();
                    if (!(a.unitNumber ?? '').toLowerCase().includes(q)
                        && !(a.plateNumber ?? '').toLowerCase().includes(q)
                        && !(a.vin ?? '').toLowerCase().includes(q)) return false;
                }
                return true;
            })
            // Worst score first, then by overdue count to surface dispatch risks.
            .sort((a, b) => {
                if (a.overdueCount !== b.overdueCount) return b.overdueCount - a.overdueCount;
                return a.score.safetyScore - b.score.safetyScore;
            });
    }, [assets, filter, query, carrierId, overdueByAssetId]);

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search assets by unit, plate, or VIN…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                </div>
                <BandFilter value={filter} onChange={setFilter} />
            </div>
            <div className="divide-y divide-slate-100">
                {rows.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-500">No assets match.</div>
                )}
                {rows.map(({ a, score, overdueCount }) => (
                    <button
                        key={a.id}
                        type="button"
                        onClick={() => onSelect(a.id)}
                        className="w-full text-left p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                    >
                        <ScoreOrb safetyScore={score.safetyScore} rating={score.rating} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate flex items-center gap-2">
                                Unit {a.unitNumber ?? '—'} · {a.make ?? ''} {(a as { model?: string }).model ?? ''}
                                <OverdueBadge count={overdueCount} />
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                                Plate {a.plateNumber ?? '—'} · {score.eventCount} events · {score.confidence} confidence
                            </div>
                        </div>
                        <RatingPill rating={score.rating} />
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                ))}
            </div>
        </div>
    );
}

function AssetDetail({
    carrierId, assetId, onBack,
}: { carrierId: string; assetId: string; onBack: () => void }) {
    const score = useRiskScore({ kind: 'asset', carrierId, assetId }, carrierId);
    const asset = (CARRIER_ASSETS[carrierId] ?? []).find((a) => a.id === assetId);
    const label = asset ? `Unit ${asset.unitNumber ?? '—'}` : assetId;

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
                <ChevronLeft className="w-4 h-4" /> Back to assets
            </button>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <div className="xl:col-span-1 space-y-5">
                    <ScoreCard score={score} title={label} subtitle="Asset risk" />
                    <RecommendationsCard recos={score.recommendations} />
                </div>
                <div className="xl:col-span-2 space-y-5">
                    <ComponentsCard components={score.componentScores} />
                    <ContributorsCard contributors={score.topContributors} />
                </div>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Combined view (driver × asset matrix preview)
// ────────────────────────────────────────────────────────────────────────────

function CombinedView({ carrierId }: { carrierId: string }) {
    const drivers = (CARRIER_DRIVERS[carrierId] ?? []).slice(0, 8);
    const assets = (CARRIER_ASSETS[carrierId] ?? []).slice(0, 8);
    const dist = useRiskDistribution('driverAsset', carrierId, carrierId);

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-semibold text-slate-900">Driver × Asset matrix</h3>
                    <Tip text="Combined score per driver–asset pair. Cell colour reflects pair safety." />
                </div>
                <p className="text-xs text-slate-500 mb-4">Top {drivers.length} drivers × top {assets.length} assets.</p>

                {drivers.length === 0 || assets.length === 0 ? (
                    <div className="text-sm text-slate-500 py-6 text-center">No drivers/assets to pair.</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="text-xs">
                            <thead>
                                <tr>
                                    <th className="text-left p-1.5 sticky left-0 bg-white">Driver \ Asset</th>
                                    {assets.map((a) => (
                                        <th key={a.id} className="p-1.5 font-medium text-slate-500">
                                            {a.unitNumber ?? a.id.slice(-4)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {drivers.map((d) => (
                                    <tr key={d.id}>
                                        <td className="text-left p-1.5 sticky left-0 bg-white text-slate-700 font-medium whitespace-nowrap">
                                            {`${d.firstName ?? ''} ${d.lastName ?? ''}`.trim().slice(0, 14) || d.id.slice(-4)}
                                        </td>
                                        {assets.map((a) => (
                                            <CellPair key={a.id} carrierId={carrierId} driverId={d.id} assetId={a.id} />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <DistributionCard
                title="Driver–asset pair distribution"
                subtitle={`${dist.total} sampled pairs · median ${dist.median.toFixed(1)}`}
                distribution={dist}
            />
        </div>
    );
}

function CellPair({
    carrierId, driverId, assetId,
}: { carrierId: string; driverId: string; assetId: string }) {
    const score = useRiskScore({ kind: 'driverAsset', carrierId, driverId, assetId }, carrierId);
    const c = ratingColor(score.rating);
    return (
        <td
            title={`${score.rating} · ${score.safetyScore.toFixed(1)}`}
            className={cn('p-1.5 text-center font-mono', c.bg, c.text)}
        >
            {score.safetyScore.toFixed(0)}
        </td>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// UI primitives
// ────────────────────────────────────────────────────────────────────────────

function ScoreCard({
    score, title, subtitle, delta30,
}: { score: EntityRiskScore; title: string; subtitle: string; delta30?: number }) {
    const c = ratingColor(score.rating);
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-1">
                <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{subtitle}</div>
                    <div className="text-lg font-bold text-slate-900 truncate" title={title}>{title}</div>
                </div>
                <Tip text="Higher safety score = lower risk. Bands set in Safety Settings." />
            </div>

            <div className="flex items-center gap-5 mt-4">
                <Gauge value={score.safetyScore} rating={score.rating} />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1', c.bg, c.text, c.ring)}>
                            {score.rating}
                        </div>
                        {delta30 != null && Number.isFinite(delta30) && Math.abs(delta30) >= 0.05 && (
                            <ScoreDeltaBadge delta={delta30} />
                        )}
                    </div>
                    <div className="text-xs text-slate-500">
                        Confidence:{' '}
                        <span className={cn(
                            'font-semibold',
                            score.confidence === 'high' ? 'text-emerald-700'
                                : score.confidence === 'medium' ? 'text-amber-700'
                                : 'text-rose-700',
                        )}>{score.confidence}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                        {score.eventCount} contributing event{score.eventCount === 1 ? '' : 's'}
                    </div>
                    {score.criticalOverride && (
                        <div className="flex items-start gap-1.5 text-xs text-rose-700 bg-rose-50 p-2 rounded-md ring-1 ring-rose-200">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span><b>Critical override:</b> {score.criticalOverride.rule}</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>config {score.configHash}</span>
                <span>generated {new Date(score.generatedAt).toLocaleTimeString()}</span>
            </div>
        </div>
    );
}

function Gauge({ value, rating }: { value: number; rating: Rating }) {
    // 0..100 → arc 0..270deg
    const v = Math.max(0, Math.min(100, value));
    const c = ratingColor(rating);
    const stroke =
        rating === 'Excellent' ? '#10b981' :
        rating === 'Good'      ? '#84cc16' :
        rating === 'Fair'      ? '#f59e0b' :
        rating === 'Poor'      ? '#f97316' :
                                 '#e11d48';
    const radius = 42;
    const circ = 2 * Math.PI * radius;
    const dash = (v / 100) * circ * 0.75; // 0.75 = 270deg arc
    return (
        <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-[135deg]">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round" />
                <circle cx="50" cy="50" r={radius} fill="none" stroke={stroke} strokeWidth="8"
                    strokeDasharray={`${dash} ${circ}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 300ms ease-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn('text-3xl font-bold tabular-nums', c.text)}>{Math.round(v)}</div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Safety</div>
            </div>
        </div>
    );
}

function ScoreOrb({ safetyScore, rating }: { safetyScore: number; rating: Rating }) {
    const c = ratingColor(rating);
    return (
        <div className={cn('w-12 h-12 rounded-full ring-2 flex items-center justify-center font-bold text-sm shrink-0', c.bg, c.text, c.ring)}>
            {Math.round(safetyScore)}
        </div>
    );
}

function RatingPill({ rating }: { rating: Rating }) {
    const c = ratingColor(rating);
    return (
        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1', c.bg, c.text, c.ring)}>
            {rating}
        </span>
    );
}

function ScoreDeltaBadge({ delta }: { delta: number }) {
    // Score delta — POSITIVE = score went up = good (emerald),
    // NEGATIVE = score dropped = bad (rose). Inverted from event-trend arrows.
    const tone = delta > 0 ? 'text-emerald-700 bg-emerald-50 ring-emerald-200'
        : delta < 0 ? 'text-rose-700 bg-rose-50 ring-rose-200'
        : 'text-slate-600 bg-slate-50 ring-slate-200';
    const sign = delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : '→ ';
    return (
        <span
            className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 tabular-nums', tone)}
            title="Δ vs ~30 days ago"
        >
            {sign}{Math.abs(delta).toFixed(1)} pts · 30d
        </span>
    );
}

function TrendArrow({ slope }: { slope: number }) {
    const dir = slope > 0.05 ? 'up' : slope < -0.05 ? 'down' : 'flat';
    const arrow = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
    // For incidents/violations: more events trending up = WORSE (rose).
    const tone = dir === 'up' ? 'text-rose-600'
        : dir === 'down' ? 'text-emerald-600'
        : 'text-slate-500';
    return (
        <span
            className={cn('inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums', tone)}
            title={`${slope >= 0 ? '+' : ''}${slope.toFixed(2)} events / month`}
        >
            <span className="text-base leading-none">{arrow}</span>
            <span>{slope >= 0 ? '+' : ''}{slope.toFixed(2)}</span>
        </span>
    );
}

function OverdueBadge({ count }: { count: number }) {
    if (count === 0) return null;
    return (
        <span
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-700 ring-1 ring-rose-200"
            title={`${count} overdue maintenance item${count === 1 ? '' : 's'}`}
        >
            <AlertCircle className="w-3 h-3" /> {count} overdue
        </span>
    );
}

function BandFilter({
    value, onChange,
}: { value: Rating | 'All'; onChange: (v: Rating | 'All') => void }) {
    const opts: (Rating | 'All')[] = ['All', 'Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
    return (
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            <Filter className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
            {opts.map((o) => (
                <button
                    key={o}
                    type="button"
                    onClick={() => onChange(o)}
                    className={cn(
                        'px-2 py-1 text-xs rounded-md font-medium transition-colors',
                        value === o ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-slate-50',
                    )}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

function Tip({ text }: { text: string }) {
    return (
        <span className="group relative inline-flex">
            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
            <span className="absolute right-0 top-5 z-10 hidden group-hover:block w-60 p-2 text-xs leading-relaxed bg-slate-900 text-white rounded-md shadow-lg">
                {text}
            </span>
        </span>
    );
}

// ── Component breakdown ─────────────────────────────────────────────────────

function ComponentsCard({ components }: { components: ComponentScore[] }) {
    const total = components.reduce((a, c) => a + c.weight, 0) || 1;
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Component breakdown</h3>
                <Tip text="Each component is scored 0–100 and combined by weight to produce the final score." />
            </div>
            <p className="text-xs text-slate-500 mb-4">Hover a row to see weight and event count.</p>

            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden ring-1 ring-slate-200 mb-4">
                {components.map((c) => {
                    const pct = (c.weight / total) * 100;
                    const stroke =
                        c.safetyScore >= 85 ? 'bg-emerald-500' :
                        c.safetyScore >= 70 ? 'bg-lime-500' :
                        c.safetyScore >= 55 ? 'bg-amber-500' :
                        c.safetyScore >= 35 ? 'bg-orange-500' :
                                              'bg-rose-500';
                    return (
                        <div
                            key={c.key}
                            className={cn('h-full transition-all', stroke)}
                            style={{ width: `${pct}%` }}
                            title={`${c.label}: ${c.safetyScore.toFixed(1)} (${(c.weight * 100).toFixed(0)}% weight)`}
                        />
                    );
                })}
            </div>

            <div className="space-y-1">
                {components.map((c) => (
                    <div key={c.key} className="flex items-center gap-3 text-sm py-1.5">
                        <div className="w-32 text-slate-500 text-xs truncate" title={c.label}>{c.label}</div>
                        <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full',
                                    c.safetyScore >= 85 ? 'bg-emerald-500' :
                                    c.safetyScore >= 70 ? 'bg-lime-500' :
                                    c.safetyScore >= 55 ? 'bg-amber-500' :
                                    c.safetyScore >= 35 ? 'bg-orange-500' :
                                                          'bg-rose-500',
                                )}
                                style={{ width: `${Math.max(0, Math.min(100, c.safetyScore))}%` }}
                            />
                        </div>
                        <div className="w-12 text-right tabular-nums font-medium text-slate-900">{c.safetyScore.toFixed(1)}</div>
                        <div className="w-12 text-right text-xs text-slate-400 tabular-nums">×{c.weight.toFixed(2)}</div>
                        <div className="w-14 text-right text-xs text-slate-400 tabular-nums">{c.eventCount} ev</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Sources ──────────────────────────────────────────────────────────────────

function SourcesCard({ sources }: { sources: SourceScore[] }) {
    if (sources.length === 0) return null;
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Regulatory sources</h3>
                <Tip text="Per-source scores. Native scale is preserved alongside the normalized 0–100." />
            </div>
            <p className="text-xs text-slate-500 mb-4">Only enrolled sources contribute to the carrier score.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sources.map((s) => (
                    <SourceCell key={s.source} src={s} />
                ))}
            </div>
        </div>
    );
}

function SourceCell({ src }: { src: SourceScore }) {
    const palette: Record<string, { bg: string; text: string; ring: string }> = {
        fmcsa:    { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200' },
        cvor:     { bg: 'bg-rose-50',   text: 'text-rose-700',   ring: 'ring-rose-200' },
        'nsc:AB': { bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200' },
        'nsc:BC': { bg: 'bg-sky-50',    text: 'text-sky-700',    ring: 'ring-sky-200' },
        'nsc:PE': { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200' },
        'nsc:NS': { bg: 'bg-teal-50',   text: 'text-teal-700',   ring: 'ring-teal-200' },
    };
    const p = palette[src.source] ?? { bg: 'bg-slate-50', text: 'text-slate-700', ring: 'ring-slate-200' };
    const label = src.source === 'fmcsa' ? 'FMCSA'
        : src.source === 'cvor' ? 'CVOR'
        : src.source.replace('nsc:', 'NSC ');

    return (
        <div className={cn('rounded-lg p-3 ring-1', p.bg, p.ring)}>
            <div className="flex items-center justify-between">
                <span className={cn('text-xs font-bold uppercase tracking-wider', p.text)}>{label}</span>
                <span className="text-[10px] text-slate-500">{src.eventCount} ev</span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
                <span className={cn('text-2xl font-bold tabular-nums', p.text)}>{src.safetyScore.toFixed(0)}</span>
                <span className="text-xs text-slate-500">/ 100</span>
            </div>
            {src.nativeScore != null && (
                <div className="text-[11px] text-slate-500 mt-0.5">
                    Native: <span className="font-semibold text-slate-700">{src.nativeScore.toFixed(2)}</span>
                    {src.nativeLabel ? ` (${src.nativeLabel})` : ''}
                </div>
            )}
            <div className="text-[11px] text-slate-500 mt-1 line-clamp-2" title={src.explanation}>
                {src.explanation}
            </div>
        </div>
    );
}

// ── Distribution histogram ──────────────────────────────────────────────────

function DistributionCard({
    title, subtitle, distribution,
}: { title: string; subtitle: string; distribution: ScoreDistribution }) {
    const max = Math.max(1, ...distribution.buckets.map((b) => b.count));
    const colors: Record<Rating, string> = {
        Excellent: 'bg-emerald-500',
        Good: 'bg-lime-500',
        Fair: 'bg-amber-500',
        Poor: 'bg-orange-500',
        Critical: 'bg-rose-500',
    };
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <Tip text="Distribution across the band thresholds set in Safety Settings." />
            </div>
            <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
            <div className="grid grid-cols-5 gap-3">
                {distribution.buckets.map((b) => (
                    <div key={b.band} className="space-y-1.5">
                        <div className="h-24 bg-slate-50 rounded-lg flex items-end overflow-hidden ring-1 ring-slate-100">
                            <div
                                className={cn('w-full rounded-t-lg transition-all duration-300', colors[b.band])}
                                style={{ height: `${(b.count / max) * 100}%` }}
                                title={`${b.count} entities (${b.pct.toFixed(1)}%)`}
                            />
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-semibold text-slate-700">{b.band}</div>
                            <div className="text-[10px] text-slate-500 tabular-nums">{b.count} · {b.pct.toFixed(1)}%</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>p10 <span className="font-semibold text-slate-700 tabular-nums">{distribution.p10.toFixed(1)}</span></span>
                <span>median <span className="font-semibold text-slate-700 tabular-nums">{distribution.median.toFixed(1)}</span></span>
                <span>p90 <span className="font-semibold text-slate-700 tabular-nums">{distribution.p90.toFixed(1)}</span></span>
            </div>
        </div>
    );
}

// ── Top contributors ────────────────────────────────────────────────────────

function ContributorsCard({ contributors }: { contributors: RiskContribution[] }) {
    if (contributors.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-1">Top contributors</h3>
                <p className="text-xs text-slate-500">No risk-contributing events in window.</p>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Top contributors</h3>
                <Tip text="Up to 10 events sorted by decay-weighted contribution to risk." />
            </div>
            <p className="text-xs text-slate-500 mb-4">{contributors.length} events shown.</p>
            <ul className="space-y-1.5">
                {contributors.map((c, i) => (
                    <li key={c.eventId} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                        <div className="w-6 text-center text-xs text-slate-400 font-mono">{i + 1}</div>
                        <SeverityChip severity={c.severity} />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-800 truncate">{c.title}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                <span>{c.date}</span>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono">{c.source}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-semibold text-slate-700 tabular-nums">−{c.weighted.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">{c.pctOfScore.toFixed(0)}% of risk</div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SeverityChip({ severity }: { severity: number }) {
    const tone = severity >= 8 ? 'bg-rose-100 text-rose-700 ring-rose-200'
        : severity >= 5 ? 'bg-amber-100 text-amber-700 ring-amber-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
    return (
        <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-semibold ring-1 tabular-nums', tone)}>
            σ{severity.toFixed(1)}
        </span>
    );
}

// ── Recommendations ─────────────────────────────────────────────────────────

function RecommendationsCard({ recos }: { recos: RiskRecommendation[] }) {
    if (recos.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-semibold text-slate-900">No actions required</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">No risk-contributing events that warrant follow-up.</p>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-slate-900">Recommendations</h3>
                <Tip text="Auto-generated from top contributors. Click an action to navigate." />
            </div>
            <ul className="space-y-2.5">
                {recos.map((r, i) => (
                    <li key={i} className={cn(
                        'p-3 rounded-lg ring-1 flex items-start gap-3',
                        r.severity === 'urgent' ? 'bg-rose-50 ring-rose-200'
                            : r.severity === 'warn' ? 'bg-amber-50 ring-amber-200'
                            : 'bg-slate-50 ring-slate-200',
                    )}>
                        {r.severity === 'urgent' ? <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                            : r.severity === 'warn' ? <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            : <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-900">{r.title}</div>
                            <div className="text-xs text-slate-600 mt-0.5">{r.description}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Sync helper for list views
// ────────────────────────────────────────────────────────────────────────────

import { getRiskScore } from './risk-store';

/** Synchronous score read — used in list rows where calling a hook per row
 *  would explode the React tree. The store memoizes by config-hash so
 *  repeated reads are O(1) once warmed. */
function scoreFor(scope: RiskScope, accountId: string): EntityRiskScore {
    return getRiskScore(scope, accountId);
}
