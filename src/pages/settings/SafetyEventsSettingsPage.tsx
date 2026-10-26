import React, { Fragment, useMemo, useState } from 'react';
import { Activity, Video, Clock, Plus, RotateCcw, Check, Gauge, Flag, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ListScrollFrame } from '@/components/ui/ListScrollFrame';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from '@/components/ui/list-header-bridge';
import { usePageChrome } from '@/components/ui/PageChrome';
import {
  ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
  useTableSort, type PickerColumn,
} from '@/components/ui/ListChrome';
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from '@/components/ui/list-chrome';
import { RowActions } from '@/components/ui/RowActions';
import {
  useTelematicsEventTypes, EVENT_SEVERITIES, EVENT_SEVERITY_TONE, type EventSeverity,
} from '@/pages/safety-events/safety-event-types.data';
import {
  useHosViolationTypes, HOS_SEVERITIES, HOS_REGIONS, HOS_SEVERITY_TONE, HOS_REGION_META,
  type HosSeverity, type HosRegion,
} from '@/pages/hos/hos-violations.data';

// ─────────────────────────────────────────────────────────────────────────────
// Settings ▸ Safety Events — the event types behind Telematics & Video and the HOS rule
// breaches, each with its risk weight and severity. Two tabs in the page header, each a
// list in the standard frame. The cells are editable in place and save as you type; the ⋮
// holds what is not a field — delete.
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'telematics' | 'hos';

const inputCls = 'h-8 w-full min-w-[12rem] rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const numCls = 'h-8 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm tabular-nums text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const selCls = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:border-blue-400 focus:outline-none';

const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn('px-4 py-2 text-sm align-middle whitespace-nowrap', className)}>{children}</td>
);

/** Reset asks twice, in place — a reset that fires on one click of a header button is a reset somebody makes by accident. */
function ResetButton({ onReset, condensed }: { onReset: () => void; condensed: boolean }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Button variant="outline" onClick={() => { if (confirm) { onReset(); setConfirm(false); } else { setConfirm(true); setTimeout(() => setConfirm(false), 3000); } }}
      className={cn('gap-1.5', condensed ? 'h-8' : 'h-9', confirm && 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100')}>
      {confirm ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />} {confirm ? 'Confirm reset' : 'Reset defaults'}
    </Button>
  );
}

export function SafetyEventsSettingsPage() {
  const [tab, setTab] = useState<TabId>('telematics');
  const { scrollRef, onScroll, condensed, bridge } = usePageChrome(tab);
  const tele = useTelematicsEventTypes();
  const hos = useHosViolationTypes();

  return (
    <ListHeaderBridge value={bridge.value}>
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <ListPageHeader
        Icon={Activity}
        title="Safety Events"
        description="The event types, risk weights and severities used by Telematics & Video and Hours of Service. Changes save as you type."
        condensed={condensed}
        chips={bridge.chips ?? undefined}
        tabs={[
          { id: 'telematics', label: 'Telematics & Video', icon: Video, count: tele.types.length },
          { id: 'hos', label: 'Hours of Service', icon: Clock, count: hos.types.length },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as TabId)}
        tabsLabel="Safety event systems"
        actions={tab === 'telematics' ? (
          <>
            <ResetButton key="tele" onReset={tele.reset} condensed={condensed} />
            <Button onClick={() => tele.add()} className={cn('gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}><Plus className="h-4 w-4" /> Add event type</Button>
          </>
        ) : (
          <>
            <ResetButton key="hos" onReset={hos.reset} condensed={condensed} />
            <Button onClick={() => hos.add()} className={cn('gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700', condensed ? 'h-8' : 'h-9')}><Plus className="h-4 w-4" /> Add HOS rule</Button>
          </>
        )}
      />
      {tab === 'telematics' && <TelematicsList scrollRef={scrollRef} onScroll={onScroll} />}
      {tab === 'hos' && <HosList scrollRef={scrollRef} onScroll={onScroll} />}
    </div>
    </ListHeaderBridge>
  );
}

type Frame = { scrollRef?: React.Ref<HTMLDivElement>; onScroll?: React.UIEventHandler<HTMLDivElement> };

// ── Telematics & Video ───────────────────────────────────────────────────────
type TCol = 'label' | 'key' | 'weight' | 'severity';
const T_COLS: PickerColumn<TCol>[] = [
  { id: 'label', label: 'Event type', locked: true },
  { id: 'key', label: 'Key' },
  { id: 'weight', label: 'Risk weight' },
  { id: 'severity', label: 'Severity' },
];
type TGroup = 'none' | 'severity' | 'source';
const T_GROUPS: { id: TGroup; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'severity', label: 'Group: Severity' },
  { id: 'source', label: 'Group: Default / Custom' },
];

function TelematicsList({ scrollRef, onScroll }: Frame) {
  const { types, update, remove } = useTelematicsEventTypes();
  type Row = (typeof types)[number];
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [source, setSource] = useState('');
  const [groupBy, setGroupBy] = useState<TGroup>('none');
  const [visible, setVisible] = useState<Set<TCol>>(() => new Set(T_COLS.map(c => c.id)));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const stats: KpiStat[] = [
    { id: 'all', label: 'Event types', value: types.length, Icon: Video, accent: 'blue' },
    ...EVENT_SEVERITIES.map((s) => ({ id: s, label: `${s} severity`, value: types.filter(t => t.severity === s).length, Icon: Flag, accent: s === 'High' ? 'rose' : s === 'Medium' ? 'amber' : 'emerald' })),
  ];
  const pickKpi = (id: string) => { setPage(1); setSeverity(id === 'all' || severity === id ? '' : id); };
  useHeaderChips(chipsFromStats(stats, severity || 'all', pickKpi));

  const q = search.trim().toLowerCase();
  const rows = types.filter(t => {
    if (severity && t.severity !== severity) return false;
    if (source && (t.custom ? 'Custom' : 'Default') !== source) return false;
    return !q || [t.label, t.id].some(x => x.toLowerCase().includes(q));
  });
  const readers = useMemo(() => ({
    label: (t: Row) => t.label,
    key: (t: Row) => t.id,
    weight: (t: Row) => t.riskWeight,
    severity: (t: Row) => EVENT_SEVERITIES.indexOf(t.severity),
  }), []);
  const { sort, onSort, sorted } = useTableSort<TCol, Row>(rows, readers, null);
  const groupOf = (t: Row): { rank: number; label: string } | null =>
    groupBy === 'severity' ? { rank: EVENT_SEVERITIES.indexOf(t.severity), label: t.severity }
      : groupBy === 'source' ? { rank: t.custom ? 1 : 0, label: t.custom ? 'Custom' : 'Default' } : null;
  const grouped = groupBy === 'none' ? sorted : sorted.map((t, i) => ({ t, i, g: groupOf(t)! })).sort((x, y) => x.g.rank - y.g.rank || x.i - y.i).map(x => x.t);
  const groupCounts = new Map<string, number>();
  if (groupBy !== 'none') grouped.forEach(t => { const l = groupOf(t)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });
  const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
  const show = (c: TCol) => visible.has(c);
  const colCount = T_COLS.filter(c => c.locked || visible.has(c.id)).length + 1;
  const filterCount = [!!severity, !!source, groupBy !== 'none'].filter(Boolean).length;
  const touched = filterCount > 0 || !!q;
  const reset = () => { setSearch(''); setSeverity(''); setSource(''); setGroupBy('none'); setPage(1); };
  const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <ListScrollFrame
      above={<KpiStatRow stats={stats} activeId={severity || 'all'} onPick={pickKpi} />}
      title="Telematics & Video event types"
      count={grouped.length}
      total={types.length}
      description="Set the risk weight (0–10) and severity for each detected event type — edit in place, it saves as you go."
      actions={<ColumnPicker columns={T_COLS} visible={visible} onToggle={(id) => setVisible(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
      scrollRef={scrollRef} onScroll={onScroll} contentKey={`${filtersOpen}|${slice.length}`}
      toolbar={
        <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search event type or key…"
          filters={<div className={mobileFold(filtersOpen)}>
            <FilterSelect value={severity} onChange={toPage1(setSeverity)} title="Severity" allLabel="All severities" options={[...EVENT_SEVERITIES]} />
            <FilterSelect value={source} onChange={toPage1(setSource)} title="Default or custom" allLabel="Default and custom" options={['Default', 'Custom']} />
          </div>}
          filtersExtra={<>
            <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
            <div className={mobileFold(filtersOpen)}>
              <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={T_GROUPS} />
              <ResetFilters on={touched} onReset={reset} />
            </div>
          </>} />
      }
      footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
    >
      <table className="w-full">
        <thead>
          <tr>
            <SortTh col="label" label="Event type" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            {show('key') && <SortTh col="key" label="Key" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('weight') && <SortTh col="weight" label="Risk weight" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('severity') && <SortTh col="severity" label="Severity" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slice.length === 0 && (
            <tr><td colSpan={colCount} className="px-6 py-14 text-center">
              <Video className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">{types.length ? 'No event type matches' : 'No event types'}</p>
              <p className="mt-1 text-xs text-slate-500">{types.length ? 'Try another severity or search.' : 'Add one, or reset to defaults.'}</p>
              {touched && <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>}
            </td></tr>
          )}
          {slice.map((t, i) => {
            const g = groupOf(t);
            const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
            return (
              <Fragment key={t.id}>
                {g && (!prev || prev.label !== g.label) && <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />}
                <tr className="group transition-colors hover:bg-slate-50">
                  <TD><input value={t.label} onChange={e => update(t.id, { label: e.target.value })} className={inputCls} aria-label="Event type" /></TD>
                  {show('key') && (
                    <TD>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">{t.id}</span>
                        {t.custom && <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700">Custom</span>}
                      </span>
                    </TD>
                  )}
                  {show('weight') && (
                    <TD><input type="number" min={0} max={10} value={t.riskWeight} aria-label="Risk weight"
                      onChange={e => update(t.id, { riskWeight: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} className={numCls} /></TD>
                  )}
                  {show('severity') && (
                    <TD>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', EVENT_SEVERITY_TONE[t.severity])}>{t.severity}</span>
                        <select value={t.severity} onChange={e => update(t.id, { severity: e.target.value as EventSeverity })} className={selCls} aria-label="Severity">
                          {EVENT_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </span>
                    </TD>
                  )}
                  <td className={cn('px-4 py-2', PIN_TD_ACTIONS)}>
                    <RowActions noun="event type" name={t.label || t.id} onDelete={() => remove(t.id)} />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </ListScrollFrame>
  );
}

// ── Hours of Service ─────────────────────────────────────────────────────────
type HCol = 'label' | 'region' | 'points' | 'severity' | 'description';
const H_COLS: PickerColumn<HCol>[] = [
  { id: 'label', label: 'Rule', locked: true },
  { id: 'region', label: 'Region' },
  { id: 'points', label: 'Risk points' },
  { id: 'severity', label: 'Severity' },
  { id: 'description', label: 'Description' },
];
type HGroup = 'none' | 'region' | 'severity';
const H_GROUPS: { id: HGroup; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'region', label: 'Group: Region' },
  { id: 'severity', label: 'Group: Severity' },
];

function HosList({ scrollRef, onScroll }: Frame) {
  const { types, update, remove } = useHosViolationTypes();
  type Row = (typeof types)[number];
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [severity, setSeverity] = useState('');
  const [groupBy, setGroupBy] = useState<HGroup>('none');
  const [visible, setVisible] = useState<Set<HCol>>(() => new Set(H_COLS.map(c => c.id)));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const regionLabel = (r: HosRegion) => HOS_REGION_META[r].label;
  const stats: KpiStat[] = [
    { id: 'all', label: 'HOS rules', value: types.length, Icon: Clock, accent: 'blue' },
    ...HOS_REGIONS.map((r) => ({ id: `r:${r}`, label: regionLabel(r), value: types.filter(t => t.region === r).length, Icon: Globe, accent: 'sky' })),
    { id: 'points', label: 'Avg risk points', value: types.length ? (types.reduce((n, t) => n + t.points, 0) / types.length).toFixed(1) : '0', Icon: Gauge, accent: 'amber' },
  ];
  const pickKpi = (id: string) => {
    setPage(1);
    if (id === 'all') { setRegion(''); return; }
    if (id.startsWith('r:')) { const r = regionLabel(id.slice(2) as HosRegion); setRegion(region === r ? '' : r); }
  };
  const kpiActive = region ? `r:${HOS_REGIONS.find(r => regionLabel(r) === region) ?? ''}` : 'all';
  useHeaderChips(chipsFromStats(stats, kpiActive, pickKpi));

  const q = search.trim().toLowerCase();
  const rows = types.filter(t => {
    if (region && regionLabel(t.region) !== region) return false;
    if (severity && t.defaultSeverity !== severity) return false;
    return !q || [t.label, t.description, regionLabel(t.region)].some(x => x.toLowerCase().includes(q));
  });
  const readers = useMemo(() => ({
    label: (t: Row) => t.label,
    region: (t: Row) => HOS_REGIONS.indexOf(t.region),
    points: (t: Row) => t.points,
    severity: (t: Row) => HOS_SEVERITIES.indexOf(t.defaultSeverity),
    description: (t: Row) => t.description,
  }), []);
  const { sort, onSort, sorted } = useTableSort<HCol, Row>(rows, readers, null);
  const groupOf = (t: Row): { rank: number; label: string } | null =>
    groupBy === 'region' ? { rank: HOS_REGIONS.indexOf(t.region), label: regionLabel(t.region) }
      : groupBy === 'severity' ? { rank: HOS_SEVERITIES.indexOf(t.defaultSeverity), label: t.defaultSeverity } : null;
  const grouped = groupBy === 'none' ? sorted : sorted.map((t, i) => ({ t, i, g: groupOf(t)! })).sort((x, y) => x.g.rank - y.g.rank || x.i - y.i).map(x => x.t);
  const groupCounts = new Map<string, number>();
  if (groupBy !== 'none') grouped.forEach(t => { const l = groupOf(t)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });
  const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
  const show = (c: HCol) => visible.has(c);
  const colCount = H_COLS.filter(c => c.locked || visible.has(c.id)).length + 1;
  const filterCount = [!!region, !!severity, groupBy !== 'none'].filter(Boolean).length;
  const touched = filterCount > 0 || !!q;
  const reset = () => { setSearch(''); setRegion(''); setSeverity(''); setGroupBy('none'); setPage(1); };
  const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <ListScrollFrame
      above={<KpiStatRow stats={stats} activeId={kpiActive} onPick={pickKpi} />}
      title="Hours of Service violation types"
      count={grouped.length}
      total={types.length}
      description="Each HOS rule breach — region, risk points, severity and description. Edit in place; it saves as you go."
      actions={<ColumnPicker columns={H_COLS} visible={visible} onToggle={(id) => setVisible(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
      scrollRef={scrollRef} onScroll={onScroll} contentKey={`${filtersOpen}|${slice.length}`}
      toolbar={
        <ListToolbar search={search} onSearch={toPage1(setSearch)} placeholder="Search rule, region, description…"
          filters={<div className={mobileFold(filtersOpen)}>
            <FilterSelect value={region} onChange={toPage1(setRegion)} title="Region" allLabel="All regions" options={HOS_REGIONS.map(regionLabel)} />
            <FilterSelect value={severity} onChange={toPage1(setSeverity)} title="Severity" allLabel="All severities" options={[...HOS_SEVERITIES]} />
          </div>}
          filtersExtra={<>
            <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
            <div className={mobileFold(filtersOpen)}>
              <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={H_GROUPS} />
              <ResetFilters on={touched} onReset={reset} />
            </div>
          </>} />
      }
      footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
    >
      <table className="w-full">
        <thead>
          <tr>
            <SortTh col="label" label="Rule" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            {show('region') && <SortTh col="region" label="Region" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('points') && <SortTh col="points" label="Risk points" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('severity') && <SortTh col="severity" label="Severity" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('description') && <SortTh col="description" label="Description" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slice.length === 0 && (
            <tr><td colSpan={colCount} className="px-6 py-14 text-center">
              <Clock className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">{types.length ? 'No HOS rule matches' : 'No HOS rules'}</p>
              <p className="mt-1 text-xs text-slate-500">{types.length ? 'Try another region, severity or search.' : 'Add one, or reset to defaults.'}</p>
              {touched && <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>}
            </td></tr>
          )}
          {slice.map((t, i) => {
            const g = groupOf(t);
            const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
            return (
              <Fragment key={t.id}>
                {g && (!prev || prev.label !== g.label) && <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />}
                <tr className="group transition-colors hover:bg-slate-50">
                  <TD><input value={t.label} onChange={e => update(t.id, { label: e.target.value })} className={inputCls} aria-label="Rule" /></TD>
                  {show('region') && (
                    <TD>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_REGION_META[t.region].tone)}>{regionLabel(t.region)}</span>
                        <select value={t.region} onChange={e => update(t.id, { region: e.target.value as HosRegion })} className={selCls} aria-label="Region">
                          {HOS_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </span>
                    </TD>
                  )}
                  {show('points') && (
                    <TD><input type="number" min={1} max={20} value={t.points} aria-label="Risk points"
                      onChange={e => update(t.id, { points: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })} className={numCls} /></TD>
                  )}
                  {show('severity') && (
                    <TD>
                      <span className="inline-flex items-center gap-2">
                        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_SEVERITY_TONE[t.defaultSeverity])}>{t.defaultSeverity}</span>
                        <select value={t.defaultSeverity} onChange={e => update(t.id, { defaultSeverity: e.target.value as HosSeverity })} className={selCls} aria-label="Severity">
                          {HOS_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </span>
                    </TD>
                  )}
                  {show('description') && (
                    <TD><input value={t.description} onChange={e => update(t.id, { description: e.target.value })} className={cn(inputCls, 'min-w-[20rem]')} aria-label="Description" /></TD>
                  )}
                  <td className={cn('px-4 py-2', PIN_TD_ACTIONS)}>
                    <RowActions noun="HOS rule" name={t.label || t.id} onDelete={() => remove(t.id)} />
                  </td>
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </ListScrollFrame>
  );
}
