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

/**
 * One BOC-3 designation on file — who may be served legal papers for this carrier, and where.
 *
 * A carrier has SEVERAL of these, not one. The usual arrangement is a single blanket agent
 * covering every state, but a carrier that has changed agents has the superseded designations
 * still on file behind the current one, and some file state by state instead. The register
 * returns the lot, which is why this is a list.
 */
export interface McProcessAgent {
    id: string;
    /** 'Blanket Coverage' where one agent covers every state, else the state named. */
    coverageType: string;
    companyName: string;
    /** 'Active' for the designation in force; superseded ones read 'Inactive'. */
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
    /** Every BOC-3 designation on file, the one in force first. */
    processAgents: McProcessAgent[];
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
    'Interstate Agent Services', 'Blanket Filing Group',
];
/** Where a carrier that files state by state actually files. */
const STATE_FILINGS = ['California', 'Illinois', 'Michigan', 'New York', 'Ohio', 'Texas'];
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

    /**
     * The BOC-3 designations. The one in force first, then whoever held it before — a carrier
     * that moved agent does not have the old designation deleted, it is superseded, and an
     * auditor reading the file wants to see that there was never a gap.
     *
     * Roughly a third of carriers file state by state rather than taking blanket coverage, so
     * the draw produces both shapes: otherwise the Coverage type column only ever says one
     * thing and the filter over it has nothing to do.
     */
    const agents: McProcessAgent[] = [];
    const perState = seed % 3 === 1;
    if (perState) {
        STATE_FILINGS.forEach((st, i) => agents.push({
            id: `pa-st-${i}`, coverageType: st, companyName: pick(PROCESS_AGENTS, i),
            companyStatus: 'Active', receivedDate: daysBefore(now, 900 + (seed % 300) + i * 3),
        }));
    } else {
        agents.push({
            id: 'pa-0', coverageType: 'Blanket Coverage', companyName: pick(PROCESS_AGENTS, 2),
            companyStatus: 'Active', receivedDate: daysBefore(now, 1500 + (seed % 400)),
        });
    }
    // Whoever held the designation before — superseded, still on file.
    for (let n = 1; n <= 1 + (seed % 2); n++) {
        agents.push({
            id: `pa-prev-${n}`, coverageType: 'Blanket Coverage', companyName: pick(PROCESS_AGENTS, 2 + n),
            companyStatus: 'Inactive', receivedDate: daysBefore(now, 1500 + (seed % 400) + n * 1100),
        });
    }

    return {
        authority: {
            mcNumber,
            status: 'Active',
            statusReason: reasonFor(seed),
            bipdRequired: 1000000,
            cargoRequired: cargo,
            processAgents: agents,
            syncedAt: new Date(now.getTime() - (seed % 20) * 3600000).toISOString(),
        },
        filings,
    };
}
