// Modal that lets a user enable / disable the three compliance regimes
// for a single carrier and edit their registration numbers. Super-admins
// see a carrier picker at the top so they can configure any account.
//
// This component is presentation-only — it reads / writes through the
// helpers in `@/data/useCarrierCompliance.ts` so changes are persisted
// immediately and the underlying SafetyAnalysisPage re-renders.

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, ShieldCheck, AlertTriangle, Building2, Search } from "lucide-react";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { type AppUser, getManagedAccountIds } from "@/data/users.data";
import {
    NSC_JURISDICTIONS,
    NSC_JURISDICTION_LABEL,
} from "@/data/carrier-compliance.data";
import {
    useCarrierCompliance,
    setFmcsaEnabled,
    setCvorEnabled,
    setFmcsaNumber,
    setCvorNumber,
    addNscJurisdiction,
    removeNscJurisdiction,
    setNscEnabled,
    setNscNumber,
} from "@/data/useCarrierCompliance";

type Props = {
    open: boolean;
    onClose: () => void;
    /** The carrier whose enrollment opened the modal (the page's current carrier).
     *  Super-admins can switch to a different carrier inside the modal. */
    initialAccountId: string;
    currentUser: AppUser;
    /** Optional. When the user picks a different carrier inside the modal,
     *  this fires so the parent page can switch the *view* to match — the
     *  modal then becomes a "view as" / "configure as" picker for the page,
     *  not just an editing target. Wired by App.tsx for super-admins. */
    onAccountChange?: (accountId: string) => void;
};

// ── Toggle ───────────────────────────────────────────────────────────

function Toggle({
    checked, onChange, disabled,
}: { checked: boolean; onChange: (next: boolean) => void; disabled?: boolean }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                checked ? "bg-emerald-500" : "bg-slate-300"
            } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    checked ? "translate-x-5" : "translate-x-0.5"
                }`}
            />
        </button>
    );
}

// ── Modal ────────────────────────────────────────────────────────────

export function ComplianceConfigureModal({
    open, onClose, initialAccountId, currentUser, onAccountChange,
}: Props) {
    const isSuper = currentUser.role === "super-admin";
    const managed = getManagedAccountIds(currentUser);
    const eligible = useMemo(() => {
        if (isSuper) return ACCOUNTS_DB;
        const ids = new Set(managed ?? []);
        return ACCOUNTS_DB.filter((a) => ids.has(a.id));
    }, [isSuper, managed]);

    const [accountId, setAccountId] = useState(initialAccountId);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerSearch, setPickerSearch] = useState("");
    const [addNscOpen, setAddNscOpen] = useState(false);

    // Stay in sync if the parent page switches its current carrier
    // (super-admin "view as" flow loops back through this prop).
    useEffect(() => { setAccountId(initialAccountId); }, [initialAccountId]);

    /** Picking a different carrier in the modal also asks the parent to
     *  switch the page's view, so the tabs / data behind the modal match
     *  what the user is configuring. */
    const handlePickAccount = (id: string) => {
        setAccountId(id);
        setPickerOpen(false);
        setPickerSearch("");
        onAccountChange?.(id);
    };

    const compliance = useCarrierCompliance(accountId);
    const account = ACCOUNTS_DB.find((a) => a.id === accountId);
    const editor = currentUser.id;

    if (!open || !compliance || !account) return null;

    const filteredAccounts = pickerSearch.trim()
        ? eligible.filter((a) =>
              a.legalName.toLowerCase().includes(pickerSearch.trim().toLowerCase())
              || a.dbaName.toLowerCase().includes(pickerSearch.trim().toLowerCase())
          )
        : eligible;

    const availableNscJurisdictions = NSC_JURISDICTIONS.filter(
        (j) => !compliance.nsc.some((n) => n.jurisdiction === j)
    );

    const canPickCarrier = isSuper || (managed?.length ?? 0) > 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                            <ShieldCheck size={18} className="text-blue-600"/>
                        </div>
                        <div>
                            <div className="text-base font-bold text-slate-900">Configure Safety & Compliance</div>
                            <div className="text-[11px] text-slate-500">Enable or disable FMCSA, CVOR, and NSC enrollments per carrier.</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
                        <X size={16}/>
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-5 overflow-y-auto">
                    {/* Carrier picker (super-admin or admins managing >1 carrier) */}
                    {canPickCarrier && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Carrier</div>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setPickerOpen((o) => !o)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-left">
                                    <Building2 size={14} className="text-slate-400"/>
                                    <span className="text-sm font-semibold text-slate-800">{account.legalName}</span>
                                    <span className="text-[11px] text-slate-400 ml-auto">{account.id}</span>
                                </button>
                                {pickerOpen && (
                                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-72 overflow-hidden flex flex-col">
                                        <div className="px-3 py-2 border-b border-slate-100">
                                            <div className="relative">
                                                <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                                                <input
                                                    autoFocus
                                                    placeholder="Search carrier…"
                                                    value={pickerSearch}
                                                    onChange={(e) => setPickerSearch(e.target.value)}
                                                    className="w-full pl-7 pr-2 py-1 text-sm border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-200"
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto">
                                            {filteredAccounts.map((a) => (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    onClick={() => handlePickAccount(a.id)}
                                                    className={`w-full px-3 py-2 text-left hover:bg-slate-50 ${a.id === accountId ? "bg-blue-50" : ""}`}>
                                                    <div className="text-sm font-semibold text-slate-800">{a.legalName}</div>
                                                    <div className="text-[10px] text-slate-500">{a.city}, {a.state} · {a.country}</div>
                                                </button>
                                            ))}
                                            {filteredAccounts.length === 0 && (
                                                <div className="px-3 py-3 text-xs text-slate-400 italic">No matches.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isSuper && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-amber-700">
                                    <AlertTriangle size={11}/>
                                    Super-admin: picking a carrier here switches the page view to that carrier.
                                </div>
                            )}
                        </div>
                    )}

                    {/* FMCSA */}
                    <RegimeSection
                        title="FMCSA (US DOT)"
                        subtitle="US Federal Motor Carrier Safety Administration. Enrollment is normally for carriers operating in or across the United States."
                        enabled={compliance.fmcsa.enabled}
                        hasData={compliance.fmcsa.hasData}
                        onToggle={(v) => setFmcsaEnabled(accountId, v, editor)}
                        numberLabel="US DOT #"
                        numberValue={compliance.fmcsa.usdot}
                        onNumberChange={(v) => setFmcsaNumber(accountId, v, editor)}
                    />

                    {/* CVOR */}
                    <RegimeSection
                        title="CVOR (Ontario)"
                        subtitle="Commercial Vehicle Operator's Registration. Required for any carrier that operates a regulated vehicle in Ontario."
                        enabled={compliance.cvor.enabled}
                        hasData={compliance.cvor.hasData}
                        onToggle={(v) => setCvorEnabled(accountId, v, editor)}
                        numberLabel="CVOR #"
                        numberValue={compliance.cvor.number}
                        onNumberChange={(v) => setCvorNumber(accountId, v, editor)}
                    />

                    {/* NSC (multi-jurisdiction) */}
                    <div className="rounded-xl border border-slate-200">
                        <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-bold text-slate-900">NSC (Canadian National Safety Code)</div>
                                <div className="text-[11px] text-slate-500 leading-snug mt-0.5">
                                    Each Canadian jurisdiction the carrier operates under is enrolled
                                    separately. Most carriers have one (their home province); cross-province
                                    carriers can add more.
                                </div>
                            </div>
                            {availableNscJurisdictions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setAddNscOpen((o) => !o)}
                                    className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100">
                                    <Plus size={12}/>
                                    Add jurisdiction
                                </button>
                            )}
                        </div>
                        {addNscOpen && availableNscJurisdictions.length > 0 && (
                            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Pick a jurisdiction</div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {availableNscJurisdictions.map((j) => (
                                        <button
                                            key={j}
                                            type="button"
                                            onClick={() => {
                                                addNscJurisdiction(accountId, j, "", editor);
                                                setAddNscOpen(false);
                                            }}
                                            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40">
                                            <span className="font-mono font-bold text-slate-600">{j}</span>
                                            <span className="text-slate-500 truncate ml-2">{NSC_JURISDICTION_LABEL[j]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {compliance.nsc.length === 0 ? (
                            <div className="px-4 py-6 text-center">
                                <div className="text-xs text-slate-400 italic">No NSC enrollments. Add one above.</div>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {compliance.nsc.map((n) => (
                                    <div key={n.jurisdiction} className="px-4 py-3 flex items-center gap-3">
                                        <Toggle
                                            checked={n.enabled}
                                            onChange={(v) => setNscEnabled(accountId, n.jurisdiction, v, editor)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-800">
                                                NSC {n.jurisdiction}
                                                <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                                                    {NSC_JURISDICTION_LABEL[n.jurisdiction]}
                                                </span>
                                                {n.hasData && !n.enabled && (
                                                    <span className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                        Not Enrolled
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <input
                                                    placeholder="NSC #"
                                                    value={n.number}
                                                    onChange={(e) => setNscNumber(accountId, n.jurisdiction, e.target.value, editor)}
                                                    className="flex-1 px-2 py-1 text-[11px] border border-slate-200 rounded-md font-mono outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400"
                                                    disabled={!n.enabled}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeNscJurisdiction(accountId, n.jurisdiction, editor)}
                                            className="flex-shrink-0 p-1.5 rounded hover:bg-red-50 text-red-500"
                                            title="Remove jurisdiction">
                                            <Trash2 size={13}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Audit footer */}
                    {(compliance.lastEditedBy || compliance.lastEditedAt) && (
                        <div className="text-[10px] text-slate-400 text-right">
                            Last edited
                            {compliance.lastEditedBy && <> by <strong className="text-slate-500">{compliance.lastEditedBy}</strong></>}
                            {compliance.lastEditedAt && <> on <strong className="text-slate-500">{new Date(compliance.lastEditedAt).toLocaleString()}</strong></>}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-white rounded-md border border-slate-200">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Single regime section (FMCSA / CVOR) ─────────────────────────────

function RegimeSection({
    title, subtitle,
    enabled, hasData,
    onToggle,
    numberLabel, numberValue, onNumberChange,
}: {
    title: string;
    subtitle: string;
    enabled: boolean;
    hasData: boolean;
    onToggle: (v: boolean) => void;
    numberLabel: string;
    numberValue: string;
    onNumberChange: (v: string) => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200">
            <div className="px-4 py-3 flex items-start gap-3">
                <Toggle checked={enabled} onChange={onToggle}/>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-900">
                        {title}
                        {hasData && !enabled && (
                            <span className="ml-2 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                Not Enrolled
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{subtitle}</div>
                    <div className="mt-2 flex items-center gap-2">
                        <label className="text-[10px] font-semibold text-slate-500 w-20 flex-shrink-0">{numberLabel}</label>
                        <input
                            placeholder={numberLabel}
                            value={numberValue}
                            onChange={(e) => onNumberChange(e.target.value)}
                            className="flex-1 px-2 py-1 text-[11px] border border-slate-200 rounded-md font-mono outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-50 disabled:text-slate-400"
                            disabled={!enabled}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
