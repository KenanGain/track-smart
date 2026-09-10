// ─────────────────────────────────────────────────────────────────────────────
// The carrier's OPERATING AUTHORITY, as FMCSA holds it.
//
// Everything else on the MC Certificate record is captured by the office: the certificate
// they were sent, the number on it, the day it was issued. This is the other half — what the
// federal register says about that authority today, and which insurers have filed against it.
// The office does not type any of it and cannot correct it: it is looked up.
//
// That distinction is the whole reason this is a separate module. Authority status, the
// minimum insurance the carrier must carry, the BOC-3 process agent on file and the insurance
// filings are read-only, they change without anyone here touching them, and they must never be
// mistaken for something a user entered. In the prototype the lookup is seeded from the MC
// number itself so the same carrier always reads the same way; the shape is what the real
// FMCSA Licensing & Insurance lookup returns.
// ─────────────────────────────────────────────────────────────────────────────

/** The BOC-3 process agent on file — who may be served legal papers for this carrier. */
export interface McProcessAgent {
    /** 'Blanket Coverage' where one agent covers every state, else the state named. */
    coverageType: string;
    companyName: string;
    companyStatus: string;
    /** ISO date FMCSA received the BOC-3 filing. */
    receivedDate: string;
}

/** The authority itself. */
export interface McAuthority {
    mcNumber: string;
    /** Whether the carrier may operate today. */
    status: 'Active' | 'Not active';
    /**
     * Why the status reads as it does — 'Discontinued Revocation' is a revocation that was
     * begun and then dropped, which leaves an active authority with a history worth seeing.
     */
    statusReason: string;
    /** Minimum bodily-injury & property-damage insurance required, in dollars. */
    bipdRequired: number;
    /** Minimum cargo insurance required, where the authority carries one. */
    cargoRequired: number;
    processAgent: McProcessAgent;
    /** When this was last pulled. */
    syncedAt: string;
}

/** One insurer's filing against the authority. */
export interface McInsuranceFiling {
    id: string;
    companyName: string;
    policyNumber: string;
    /** The FMCSA form filed — BMC-91X (BIPD), BMC-34 (cargo), BMC-35 (bond). */
    form: string;
    /** What the insurer filed for, in dollars. */
    amountFiled: number;
    status: 'Active' | 'Cancelled' | 'Pending';
    receivedDate: string;
    effectiveDate: string;
    /** ISO date the filing was cancelled; '' while it stands. */
    cancellationDate: string;
}

export interface McAuthorityRecord {
    authority: McAuthority;
    filings: McInsuranceFiling[];
}

/** Dollars as the register prints them — "$1,000,000.00". */
export const usd = (n: number): string =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Stable pseudo-random draw from the MC number, so one carrier always reads the same way. */
function seedOf(mcNumber: string): number {
    let h = 0;
    for (const c of mcNumber) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
}

const PROCESS_AGENTS = [
    'Registered Agents Inc.', 'Transportation Compliance Services', 'National Process Agents LLC',
];
const INSURERS = [
    'Great West Casualty Company', 'Northland Insurance Company', 'Canal Insurance Company',
    'Progressive Casualty Insurance Co.', 'Sentry Select Insurance Company',
];
/**
 * Why the authority reads as it does. This is the latest ACTION on it, not a restatement of
 * the status: an authority a revocation was started against and then dropped is active, and
 * "Discontinued Revocation" is the thing worth seeing on the page. An authority that has never
 * been in trouble is the quieter case, so the draw is weighted rather than even.
 */
const reasonFor = (seed: number): string =>
    seed % 4 === 3 ? 'Active — no pending action' : 'Discontinued Revocation';

/** `YYYY-MM-DD`, `n` days before the given day. */
const daysBefore = (from: Date, n: number): string =>
    new Date(from.getTime() - n * 86400000).toISOString().slice(0, 10);

/**
 * Look up one carrier's authority. Async on purpose: this is a call out to FMCSA, the screen
 * has to be able to say it is waiting, and nothing here may be treated as instantly available.
 */
export function fetchMcAuthority(mcNumber: string): Promise<McAuthorityRecord | null> {
    const number = mcNumber.trim();
    return new Promise(resolve => {
        setTimeout(() => resolve(number ? buildAuthority(number) : null), 420);
    });
}

/** The seeded record for one MC number. Exported for the probes — the UI goes through the fetch. */
export function buildAuthority(mcNumber: string): McAuthorityRecord {
    const seed = seedOf(mcNumber);
    const now = new Date();
    const pick = <T,>(list: T[], salt: number): T => list[(seed + salt) % list.length];
    // Broker-only authorities carry no cargo minimum; a motor carrier of property does.
    const cargo = seed % 3 === 0 ? 0 : 100000;
    const digits = mcNumber.replace(/\D/g, '').slice(-6) || '000000';

    /**
     * The filing history, as a carrier that has changed insurer a few times really reads.
     *
     * Each insurer's cover runs until the next one's takes over, so every cancelled filing's
     * cancellation date IS the following filing's effective date — an unbroken chain, which is
     * the thing an auditor is actually looking for. A gap between two of them would mean the
     * authority was uninsured, so the data must not invent one by accident.
     */
    const filings: McInsuranceFiling[] = [];
    const TERMS = 5;                                  // five insurer terms, newest first
    let coveredTo = '';                                // the date this term's cover ends ('' = still standing)
    for (let term = 0; term < TERMS; term++) {
        const insurer = pick(INSURERS, term * 2);
        const from = daysBefore(now, 190 + (seed % 120) + term * 730);
        const active = term === 0;
        const amount = active ? 1000000 : term === 1 ? 1000000 : 750000;
        filings.push({
            id: `f-bipd-${term}`, companyName: insurer,
            policyNumber: `MCP-${digits}-${String(TERMS - term).padStart(2, '0')}`, form: 'BMC-91X',
            amountFiled: amount, status: active ? 'Active' : 'Cancelled',
            receivedDate: from, effectiveDate: from, cancellationDate: coveredTo,
        });
        // Cargo cover is filed alongside the liability, and lapses with it.
        if (cargo && term < 3) {
            filings.push({
                id: `f-cargo-${term}`, companyName: insurer,
                policyNumber: `MCC-${digits}-${String(TERMS - term).padStart(2, '0')}`, form: 'BMC-34',
                amountFiled: cargo, status: active ? 'Active' : 'Cancelled',
                receivedDate: from, effectiveDate: from, cancellationDate: coveredTo,
            });
        }
        coveredTo = from;
    }
    // The trust-fund / surety bond some authorities file instead of a cargo policy, cancelled
    // when the carrier moved to a policy — a third form, so the Form filter has work to do.
    filings.push({
        id: 'f-bond', companyName: 'Avalon Risk Management', policyNumber: `BND-${digits}-01`,
        form: 'BMC-84', amountFiled: 75000, status: 'Cancelled',
        receivedDate: daysBefore(now, 190 + (seed % 120) + TERMS * 730 + 400),
        effectiveDate: daysBefore(now, 190 + (seed % 120) + TERMS * 730 + 400),
        cancellationDate: coveredTo,
    });

    return {
        authority: {
            mcNumber,
            status: 'Active',
            statusReason: reasonFor(seed),
            bipdRequired: 1000000,
            cargoRequired: cargo,
            processAgent: {
                coverageType: 'Blanket Coverage',
                companyName: pick(PROCESS_AGENTS, 2),
                companyStatus: 'Active',
                receivedDate: daysBefore(now, 1500 + (seed % 400)),
            },
            syncedAt: new Date(now.getTime() - (seed % 20) * 3600000).toISOString(),
        },
        filings,
    };
}
