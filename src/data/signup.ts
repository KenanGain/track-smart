import { addAppUser, findUserByEmail, findUserById, initialsOf, newUserId, setUserPassword, updateAppUser, type AppUser, type UserRole } from "@/data/users.data";
import { gradientFor, setCarrierRoles } from "@/pages/users-roles/scope";
import { ACCOUNTS_DB, addAccountRecord, getAccountById, type AccountCountry, type AccountRecord } from "@/pages/accounts/accounts.data";
import { ACCOUNT_LIMIT_UNLIMITED, addServiceProfile, getServiceProfileById, type BusinessType, type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { addIndependentDriver } from "@/data/independent-drivers.data";
import { TIER_CONFIG, recordSignupSubscription, type SubscriptionTier } from "@/pages/admin/billing.data";
import { logAudit } from "@/data/audit-log.data";
import type { Driver } from "@/data/mock-app-data";

// ─────────────────────────────────────────────────────────────────────────────
// Sign-up — the four ways somebody arrives, and what each one creates.
//
//   driver   → a driver account with no carrier. They sign in to the Driver app and apply to a
//              carrier from there; being hired puts them on that carrier's roster.
//   user     → an office account with no carrier. They get a user ID; a Fleet Admin adds them
//              to a carrier, or an Admin adds them to the service profile or one of its
//              carriers, with Add user ▸ "Already signed up".
//   carrier  → a carrier profile (a fleet account) with them as its Fleet Admin — after the
//              plan and the (demo) payment.
//   service  → a service profile with them as its Admin, on a subscription — after the plan
//              and the (demo) payment. They add carriers under it from Accounts.
//
// Only a Super Admin can make another Super Admin; nothing here can.
// ─────────────────────────────────────────────────────────────────────────────

export type SignupKind = "driver" | "user" | "carrier" | "service";

export interface PersonInput { firstName: string; lastName: string; email: string; phone?: string; password: string }
export interface DriverInput { driverType: string; licenseNumber: string; licenseState: string; licenseExpiry: string; city?: string; state?: string; country: "USA" | "Canada" }
export interface CarrierInput { legalName: string; dbaName?: string; dotNumber?: string; cvorNumber?: string; nscNumber?: string; country: AccountCountry; city: string; state: string }
export interface ServiceInput { legalName: string; dbaName?: string; businessType: BusinessType; stateOfInc: string; street: string; city: string; state: string; zip: string; country: string }

/** What a carrier pays for — the fleet plans (service profiles use the subscription tiers). */
export interface FleetPlan { id: string; name: string; monthlyPrice: number; units: number | null; blurb: string }
export const FLEET_PLANS: FleetPlan[] = [
    { id: "basic", name: "Basic", monthlyPrice: 49, units: 10, blurb: "Up to 10 units · compliance & documents · monitoring" },
    { id: "fleet", name: "Fleet", monthlyPrice: 149, units: 50, blurb: "Up to 50 units · everything in Basic · hiring & onboarding · safety analysis" },
    { id: "enterprise", name: "Enterprise", monthlyPrice: 399, units: null, blurb: "Unlimited units · everything in Fleet · priority support" },
];
export const SERVICE_TIERS: SubscriptionTier[] = ["Starter", "Pro", "Enterprise"];
export const tierLimit = (tier: SubscriptionTier): number => (TIER_CONFIG[tier].carrierLimit === Infinity ? ACCOUNT_LIMIT_UNLIMITED : TIER_CONFIG[tier].carrierLimit);

export interface Receipt { id: string; description: string; amount: number; last4: string; date: string; plan: string }

const fullName = (p: PersonInput) => `${p.firstName.trim()} ${p.lastName.trim()}`.trim();
const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const emailTaken = (email: string): boolean => !!findUserByEmail(email);
export const validEmail = (email: string): boolean => /^\S+@\S+\.\S+$/.test(email.trim());

function makeUser(p: PersonInput, id: string, role: UserRole, title: string, extra: Partial<AppUser> = {}): AppUser {
    const name = fullName(p);
    const u: AppUser = {
        id, name, email: p.email.trim(), role, status: "Active", phone: p.phone?.trim() || undefined, title,
        initials: initialsOf(name), avatarGradient: gradientFor(id), ...extra,
    };
    addAppUser(u);
    setUserPassword(id, p.password);
    return u;
}

/** A driver with no carrier yet: a driver record of their own, and the login that opens it. */
export function signUpDriver(p: PersonInput, d: DriverInput): AppUser {
    const driverId = `DRV-SU-${stamp().toUpperCase()}`;
    const name = fullName(p);
    const today = new Date().toISOString().slice(0, 10);
    const driver: Driver = {
        id: driverId, name, firstName: p.firstName.trim(), lastName: p.lastName.trim(), avatarInitials: initialsOf(name), status: "Active",
        phone: p.phone?.trim() || "", email: p.email.trim(),
        // No hire date — nobody has hired them yet; the DQ file starts when somebody does.
        hiredDate: "", dateAdded: today, terminal: "—", carrierCode: "", driverType: d.driverType,
        dob: "", gender: "", ssn: "", citizenship: d.country, authorizedToWork: true,
        address: "", city: d.city ?? "", state: d.state ?? "", zip: "", country: d.country,
        emergencyContacts: [], previousResidences: [],
        licenseNumber: d.licenseNumber, licenseState: d.licenseState, licenseExpiry: d.licenseExpiry,
        licenses: [{
            id: 1, type: d.country === "Canada" ? "Commercial Licence" : "CDL", licenseNumber: d.licenseNumber, province: d.licenseState, country: d.country,
            class: d.country === "Canada" ? "Class AZ" : "Class A", issueDate: "", expiryDate: d.licenseExpiry, status: "Valid", conditions: "", endorsements: [], restrictions: [], isPrimary: true, suspended: false, uploadType: "images",
        }],
        travelDocuments: [], employmentHistory: [],
    } as Driver;
    addIndependentDriver(driver);
    const user = makeUser(p, `u-drv-${driverId}`, "driver", d.driverType || "Driver");
    logAudit({ category: "auth", kind: "created", title: `${name} signed up as a driver`, detail: "No carrier yet — can apply from the Driver app", actor: user });
    return user;
}

/** An office account with no carrier: the ID they hand to whoever adds them. */
export function signUpUser(p: PersonInput, title?: string): AppUser {
    const user = makeUser(p, newUserId(), "user", title?.trim() || "User");
    logAudit({ category: "auth", kind: "created", title: `${user.name} signed up`, detail: `User ID ${user.id} — not on a carrier yet`, actor: user });
    return user;
}

/** A carrier profile with its first Fleet Admin, after the plan was paid for. */
export function signUpCarrier(p: PersonInput, c: CarrierInput, plan: FleetPlan, receipt: Receipt): { user: AppUser; account: AccountRecord } {
    const id = `acct-su-${stamp()}`;
    const userId = newUserId();
    const account: AccountRecord = {
        id, legalName: c.legalName.trim(), dbaName: c.dbaName?.trim() || "", dotNumber: c.dotNumber?.trim() || "",
        cvorNumber: c.cvorNumber?.trim() || "", nscNumber: c.nscNumber?.trim() || "", rinNumber: "",
        status: "Active", city: c.city.trim(), state: c.state.trim(), country: c.country, drivers: 0, assets: 0,
        safetyRating: "Not Rated", createdAt: new Date().toISOString().slice(0, 10), profilePath: "/account/profile", createdByUserId: userId,
    };
    addAccountRecord(account);
    const user = makeUser(p, userId, "fleet-admin", "Fleet Admin", {
        accountId: id, accountName: account.legalName, managedAccountIds: [id], carrierRoles: { [id]: "fleet-admin" },
    });
    logAudit({ category: "settings", kind: "created", title: `${user.name} created the carrier ${account.legalName}`, detail: `${plan.name} plan · ${receipt.id}`, actor: user, accountId: id, record: { type: "Carrier", label: account.legalName, id, path: "/account/profile" } });
    return { user, account };
}

/** A service profile with its first Admin, on a subscription, after the plan was paid for. */
export function signUpServiceProfile(p: PersonInput, s: ServiceInput, tier: SubscriptionTier, receipt: Receipt): { user: AppUser; profile: ServiceProfile } {
    const id = `sp-su-${stamp()}`;
    const profile: ServiceProfile = {
        id, legalName: s.legalName.trim(), dbaName: s.dbaName?.trim() || undefined, stateOfInc: s.stateOfInc, businessType: s.businessType,
        legalAddress: { country: s.country, street: s.street.trim(), city: s.city.trim(), state: s.state, zip: s.zip.trim() },
        mailingAddress: { streetOrPoBox: s.street.trim(), city: s.city.trim(), state: s.state, zip: s.zip.trim(), country: s.country },
        officeLocations: [], accountLimit: tierLimit(tier), accountsCreated: 0, status: "Active",
        contactEmail: p.email.trim(), contactPhone: p.phone?.trim() || undefined, createdAt: new Date().toISOString().slice(0, 10),
    } as ServiceProfile;
    addServiceProfile(profile);
    recordSignupSubscription(profile, tier);
    const user = makeUser(p, newUserId(), "admin", "Admin", { serviceProfileId: id, serviceProfileIds: [id], managedAccountIds: [] });
    logAudit({ category: "settings", kind: "created", title: `${user.name} created the service profile ${profile.legalName}`, detail: `${tier} plan · ${receipt.id}`, actor: user, serviceProfileId: id, record: { type: "Service profile", label: profile.legalName, id, path: "/service-profile" } });
    return { user, profile };
}

/** A demo payment: nothing is charged; the receipt is what the Done screen and the audit log show. */
export function demoPayment(description: string, amount: number, cardNumber: string, plan: string): Receipt {
    return { id: `PAY-${Date.now().toString(36).toUpperCase()}`, description, amount, last4: cardNumber.replace(/\D/g, "").slice(-4) || "4242", date: new Date().toISOString().slice(0, 10), plan };
}

// ── Adding someone who already signed up ─────────────────────────────────────

/** A person by the ID they were given at sign-up, or by email. */
export function findSignedUpUser(idOrEmail: string): AppUser | undefined {
    const q = idOrEmail.trim();
    if (!q) return undefined;
    return findUserById(q) ?? findUserByEmail(q);
}
/** Not on any carrier or service profile yet — the ones Add user ▸ "Already signed up" is for. */
export const isUnplaced = (u: AppUser): boolean => u.role !== "super-admin" && !u.accountId && !(u.managedAccountIds?.length) && !u.serviceProfileId;

/** Put an existing account on a carrier with a role, or on a service profile as its Admin. */
export function placeExistingUser(user: AppUser, target: { carrierId: string; role: UserRole } | { serviceProfileId: string }): void {
    if ("serviceProfileId" in target) {
        const sp = getServiceProfileById(target.serviceProfileId);
        const carriers = ACCOUNTS_DB.filter((a) => a.serviceProfileId === target.serviceProfileId).map((a) => a.id);
        updateAppUser(user.id, {
            role: "admin", title: user.title && user.title !== "User" ? user.title : "Admin", carrierRoles: undefined,
            serviceProfileId: target.serviceProfileId, serviceProfileIds: [...new Set([...(user.serviceProfileIds ?? []), target.serviceProfileId])],
            accountId: carriers[0], accountName: carriers[0] ? getAccountById(carriers[0])?.legalName : undefined, managedAccountIds: carriers,
        });
        logAudit({ category: "users", kind: "assigned", title: `Made ${user.name} Admin of ${sp?.legalName ?? "the service profile"}`, detail: `Signed-up account ${user.id}`, serviceProfileId: target.serviceProfileId });
        return;
    }
    const acct = getAccountById(target.carrierId);
    const entries: Record<string, UserRole> = { ...(user.carrierRoles ?? {}), [target.carrierId]: target.role };
    setCarrierRoles(user, ACCOUNTS_DB, entries);
    updateAppUser(user.id, { serviceProfileId: user.serviceProfileId ?? acct?.serviceProfileId, title: user.title && user.title !== "User" ? user.title : undefined });
    logAudit({ category: "users", kind: "assigned", title: `Added ${user.name} to ${acct?.legalName ?? "the carrier"} as ${target.role}`, detail: `Signed-up account ${user.id}`, accountId: target.carrierId });
}
