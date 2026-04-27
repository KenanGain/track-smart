import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ChevronDown,
    Search,
    Users,
    Truck,
    BadgeCheck,
} from 'lucide-react';
import { ACCOUNTS_DB, type AccountRecord } from '@/pages/accounts/accounts.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { AssetDirectoryPage } from '@/pages/assets/AssetDirectoryPage';
import type { Asset } from '@/pages/assets/assets.data';

const cn = (...x: (string | boolean | null | undefined)[]) =>
    x.filter(Boolean).join(' ');

// ── Account picker (shared with the Drivers inventory page) ─────────────────

export const AccountPicker = ({
    selectedId,
    onChange,
}: {
    selectedId: string | 'all';
    onChange: (id: string | 'all') => void;
}) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const selected = useMemo<AccountRecord | undefined>(
        () => ACCOUNTS_DB.find((a) => a.id === selectedId),
        [selectedId]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return ACCOUNTS_DB;
        return ACCOUNTS_DB.filter(
            (a) =>
                a.legalName.toLowerCase().includes(q) ||
                a.dbaName.toLowerCase().includes(q) ||
                a.dotNumber.toLowerCase().includes(q)
        );
    }, [search]);

    const acctInitials = (name: string) =>
        name
            .replace(/[^a-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]!.toUpperCase())
            .join('');

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    'h-11 px-3.5 min-w-[320px] flex items-center gap-3 bg-white border rounded-xl shadow-sm transition-all',
                    open
                        ? 'border-blue-500 ring-2 ring-blue-500/15'
                        : 'border-slate-200 hover:border-slate-300'
                )}
            >
                <span
                    className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0',
                        selectedId === 'all'
                            ? 'bg-slate-100 text-slate-600'
                            : 'bg-blue-100 text-blue-700'
                    )}
                >
                    {selectedId === 'all' ? <Users className="w-4 h-4" /> : acctInitials(selected?.legalName ?? '')}
                </span>
                <span className="flex-1 text-left min-w-0">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Filter By Carrier
                    </span>
                    <span className="block text-sm font-semibold text-slate-800 truncate">
                        {selectedId === 'all'
                            ? 'All Carriers'
                            : selected?.legalName ?? 'Select Carrier'}
                    </span>
                </span>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 text-slate-400 transition-transform',
                        open && 'rotate-180'
                    )}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-[440px] bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden">
                    <div className="p-3 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, DBA, or DOT…"
                                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto py-2">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('all');
                                setOpen(false);
                            }}
                            className={cn(
                                'w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors',
                                selectedId === 'all' && 'bg-blue-50'
                            )}
                        >
                            <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                <Users className="w-4 h-4" />
                            </span>
                            <span className="flex-1">
                                <span className="block text-sm font-semibold text-slate-800">
                                    All Carriers
                                </span>
                                <span className="block text-[11px] text-slate-500">
                                    Aggregate across {ACCOUNTS_DB.length.toLocaleString()} carriers
                                </span>
                            </span>
                            {selectedId === 'all' && <BadgeCheck className="w-4 h-4 text-blue-600" />}
                        </button>
                        <div className="my-1 border-t border-slate-100" />
                        {filtered.length === 0 ? (
                            <p className="px-3 py-4 text-xs text-slate-400 italic text-center">
                                No carriers match "{search}"
                            </p>
                        ) : (
                            filtered.map((a) => {
                                const isActive = selectedId === a.id;
                                return (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => {
                                            onChange(a.id);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            'w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-slate-50 transition-colors',
                                            isActive && 'bg-blue-50'
                                        )}
                                    >
                                        <span className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-[11px] font-bold">
                                            {acctInitials(a.legalName)}
                                        </span>
                                        <span className="flex-1 min-w-0">
                                            <span className="block text-sm font-semibold text-slate-800 truncate">
                                                {a.legalName}
                                            </span>
                                            <span className="block text-[11px] text-slate-500 truncate">
                                                {a.dbaName} · DOT {a.dotNumber || '—'} · {a.city}, {a.state}
                                            </span>
                                        </span>
                                        <span className="flex flex-col items-end gap-0.5 shrink-0">
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                {a.assets} assets
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                                {a.drivers} drivers
                                            </span>
                                        </span>
                                        {isActive && <BadgeCheck className="w-4 h-4 text-blue-600" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Inventory > Assets page ─────────────────────────────────────────────────

export function InventoryAssetsPage() {
    const [selectedId, setSelectedId] = useState<string | 'all'>('all');

    const assets: Asset[] = useMemo(() => {
        if (selectedId === 'all') {
            return Object.values(CARRIER_ASSETS).flat();
        }
        return CARRIER_ASSETS[selectedId] ?? [];
    }, [selectedId]);

    const selected = ACCOUNTS_DB.find((a) => a.id === selectedId);

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden">
            {/* UNIFIED PAGE HEADER */}
            <div className="px-6 pt-6 pb-5 bg-white border-b border-slate-200/60 shadow-sm shrink-0 z-30">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Inventory
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                    Assets
                                </span>
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                Asset Directory
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {selectedId === 'all' ? (
                                    <>
                                        Aggregating <span className="font-semibold text-slate-700">{assets.length.toLocaleString()}</span> assets across{' '}
                                        <span className="font-semibold text-slate-700">{ACCOUNTS_DB.length.toLocaleString()}</span> carriers
                                    </>
                                ) : (
                                    <>
                                        Showing <span className="font-semibold text-slate-700">{assets.length.toLocaleString()}</span> assets for{' '}
                                        <span className="font-semibold text-slate-700">{selected?.legalName ?? 'selected carrier'}</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <AccountPicker selectedId={selectedId} onChange={setSelectedId} />
                </div>
            </div>

            {/* Embedded Asset Directory — no inner page chrome (isEmbedded={true}) */}
            <div className="flex-1 overflow-auto">
                <div className="px-6 pt-6 pb-8">
                    <AssetDirectoryPage key={selectedId} isEmbedded={true} assets={assets} />
                </div>
            </div>
        </div>
    );
}

export default InventoryAssetsPage;
