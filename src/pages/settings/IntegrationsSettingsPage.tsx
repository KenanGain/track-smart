import { useState } from 'react';
import { Plug, Check, KeyRound, Link2, Unlink, ScrollText, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/pages/ats/ats-ui';
import { ELD_PROVIDERS, useEldIntegrations, type EldProvider } from '@/data/eld-providers.data';

const ACCENT: Record<string, { bar: string; icon: string; ring: string; btn: string }> = {
  blue: { bar: 'bg-blue-500', icon: 'bg-blue-50 text-blue-600', ring: 'ring-blue-500/30', btn: 'bg-blue-600 hover:bg-blue-700' },
  orange: { bar: 'bg-orange-500', icon: 'bg-orange-50 text-orange-600', ring: 'ring-orange-500/30', btn: 'bg-orange-600 hover:bg-orange-700' },
  emerald: { bar: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-500/30', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  violet: { bar: 'bg-violet-500', icon: 'bg-violet-50 text-violet-600', ring: 'ring-violet-500/30', btn: 'bg-violet-600 hover:bg-violet-700' },
  sky: { bar: 'bg-sky-500', icon: 'bg-sky-50 text-sky-600', ring: 'ring-sky-500/30', btn: 'bg-sky-600 hover:bg-sky-700' },
};

function maskKey(k: string): string {
  if (!k) return '';
  if (k.length <= 6) return '••••••';
  return `${k.slice(0, 3)}${'•'.repeat(Math.min(12, k.length - 6))}${k.slice(-3)}`;
}

function ProviderCard({ provider, connected, connectedAt, apiKey, onConnect, onDisconnect }: {
  provider: EldProvider;
  connected: boolean;
  connectedAt?: string;
  apiKey?: string;
  onConnect: (key: string) => void;
  onDisconnect: () => void;
}) {
  const a = ACCENT[provider.accent] ?? ACCENT.blue;
  const [editing, setEditing] = useState(false);
  const [draftKey, setDraftKey] = useState('');
  const [show, setShow] = useState(false);
  const showForm = editing || !connected;

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-white shadow-sm transition-all', connected ? cn('border-transparent ring-1', a.ring) : 'border-slate-200')}>
      <div className={cn('h-1 w-full', a.bar)} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold', a.icon)}>{provider.name[0]}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">{provider.name}</h3>
                {connected
                  ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><Check size={10} /> Connected</span>
                  : <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">Not connected</span>}
              </div>
              <p className="text-[12px] text-slate-500">{provider.tagline}</p>
            </div>
          </div>
        </div>

        {/* Data fields synced */}
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><ScrollText size={11} /> HOS logs</div>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">{provider.logsFields}</p>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><ShieldAlert size={11} /> HOS violations</div>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">{provider.violationFields || <span className="italic text-slate-400">Logs only — violations derived internally</span>}</p>
          </div>
        </div>

        {/* Connection controls */}
        <div className="mt-3 border-t border-slate-100 pt-3">
          {connected && !editing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-slate-500"><KeyRound size={13} className="text-slate-400" /> API key</span>
                <span className="font-mono text-[12px] font-semibold text-slate-700">{maskKey(apiKey ?? '')}</span>
              </div>
              {connectedAt && <p className="text-[11px] text-slate-400">Connected {connectedAt}</p>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => { setDraftKey(''); setEditing(true); }}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                  <KeyRound size={14} /> Update key
                </button>
                <button type="button" onClick={onDisconnect}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[13px] font-semibold text-rose-600 hover:bg-rose-50">
                  <Unlink size={14} /> Disconnect
                </button>
              </div>
            </div>
          )}

          {showForm && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">API key</label>
              <div className="relative">
                <KeyRound size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  value={draftKey}
                  onChange={e => setDraftKey(e.target.value)}
                  placeholder={`Enter your ${provider.name} API key…`}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button type="button" onClick={() => setShow(s => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" disabled={!draftKey.trim()} onClick={() => { onConnect(draftKey); setEditing(false); setDraftKey(''); }}
                  className={cn('inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40', a.btn)}>
                  <Link2 size={14} /> {connected ? 'Save key' : 'Connect'}
                </button>
                {editing && (
                  <button type="button" onClick={() => { setEditing(false); setDraftKey(''); }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IntegrationsSettingsPage({ accountId }: { accountId?: string } = {}) {
  const { connections, connect, disconnect } = useEldIntegrations(accountId);
  const connectedCount = Object.keys(connections).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        iconGradient="from-indigo-500 to-violet-600"
        Icon={Plug}
        title="Integrations"
        subtitle="Connect your ELD & telematics providers — HOS logs and violations sync from the company you connect"
      />
      <div className="space-y-5 p-4 sm:p-8">
        <div className="flex items-center gap-2 text-[13px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-600 shadow-sm">
            <Plug size={13} className="text-indigo-500" /> {connectedCount} of {ELD_PROVIDERS.length} connected
          </span>
          <span>Add an API key for a provider to pull that company's driver logs and violations.</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ELD_PROVIDERS.map(p => {
            const conn = connections[p.id];
            return (
              <ProviderCard
                key={p.id}
                provider={p}
                connected={!!conn}
                connectedAt={conn?.connectedAt}
                apiKey={conn?.apiKey}
                onConnect={key => connect(p.id, key)}
                onDisconnect={() => disconnect(p.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
