import { readApplicants, type Applicant } from "./applicants.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { readComplianceEntry, writeComplianceVersion } from "@/pages/compliance/compliance-data-store";

// ─────────────────────────────────────────────────────────────────────────────
// hiring-links — the same person as an applicant and as a driver.
//
// A hiring file is keyed by applicant id and a driver's profile by driver id, and nothing
// in the data says the two are one person. The email does: an applicant was invited to
// one, a driver record carries one. Same id or same email, and the consents signed during
// hiring belong on the profile.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s?: string) => (s ?? "").trim().toLowerCase();

/** The applicants who are this driver — same id, or same email. Never the driver id itself. */
export function linkedApplicantIds(accountId: string | undefined, driverId: string): string[] {
    const d = accountId ? getDriversForAccount(accountId).find((x) => x.id === driverId) : undefined;
    const email = norm(d?.email);
    return readApplicants()
        .filter((a) => a.id === driverId || (!!email && norm(a.email) === email))
        .map((a) => a.id)
        .filter((id) => id !== driverId);
}

/** The driver record this applicant became, if hired — same id, or same email. */
export function linkedDriverId(accountId: string | undefined, a: Pick<Applicant, "id" | "email">): string | undefined {
    if (!accountId) return undefined;
    const email = norm(a.email);
    return getDriversForAccount(accountId).find((d) => d.id === a.id || (!!email && norm(d.email) === email))?.id;
}

/**
 * Copies filed under the applicant, carried onto the driver's own record once.
 *
 * The profile's record list reads the driver subject only, so a consent signed during
 * hiring would count as Missing there until it is here too. Same version ids, so a copy
 * is never adopted twice, and a verification recorded on one lands on both.
 */
export function adoptLinkedCopies(accountId: string | undefined, driverId: string, applicantIds: string[], recordIds: string[]): void {
    for (const rid of recordIds) {
        const mine = new Set(readComplianceEntry(accountId, driverId, rid).versions.map((v) => v.id));
        for (const aid of applicantIds) {
            // Oldest first, because the store prepends — so the newest ends up on top.
            for (const v of [...readComplianceEntry(accountId, aid, rid).versions].reverse()) {
                if (mine.has(v.id)) continue;
                writeComplianceVersion(accountId, driverId, rid, v);
                mine.add(v.id);
            }
        }
    }
}
