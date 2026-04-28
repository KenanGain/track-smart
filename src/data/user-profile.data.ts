// Per-user profile data — extends users.data.ts with everything the My
// Profile page needs (contact, address, plan, sessions, notifications, audit).
// Mock data only.

import { APP_USERS, type AppUser } from "./users.data";

export type ContactInfo = {
    phone: string;
    altPhone?: string;
    address: {
        street: string;
        apt?: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    emergencyContact: {
        name: string;
        relation: string;
        phone: string;
    };
};

export type EmploymentInfo = {
    employeeId: string;
    department: string;
    manager?: string;
    joinedAt: string;     // YYYY-MM-DD
    timezone: string;
    language: string;
};

export type SubscriptionInfo = {
    planName: "Starter" | "Growth" | "Fleet Pro" | "Enterprise" | "Internal";
    pricePerMonth: number;            // USD
    billingCycle: "Monthly" | "Annual";
    seats: { used: number; total: number };
    nextRenewal: string;              // YYYY-MM-DD
    status: "Active" | "Trial" | "Past Due" | "Internal";
    paymentMethod?: {
        brand: "Visa" | "Mastercard" | "Amex" | "Discover";
        last4: string;
        exp: string; // MM/YY
    };
    billingEmail: string;
};

export type Invoice = {
    id: string;
    date: string;       // YYYY-MM-DD
    amount: number;
    status: "Paid" | "Open" | "Void" | "Refunded";
    description: string;
};

export type SecurityInfo = {
    lastPasswordChange: string;
    twoFactorEnabled: boolean;
    recoveryEmail: string;
    activeSessions: Array<{
        id: string;
        device: string;
        browser: string;
        location: string;
        ip: string;
        lastActive: string; // ISO
        current: boolean;
    }>;
};

export type NotificationPrefs = {
    channels: { email: boolean; sms: boolean; inApp: boolean };
    categories: {
        compliance: { email: boolean; sms: boolean; inApp: boolean };
        maintenance: { email: boolean; sms: boolean; inApp: boolean };
        inventory: { email: boolean; sms: boolean; inApp: boolean };
        accidents: { email: boolean; sms: boolean; inApp: boolean };
        billing: { email: boolean; sms: boolean; inApp: boolean };
        security: { email: boolean; sms: boolean; inApp: boolean };
    };
};

export type ActivityEvent = {
    id: string;
    timestamp: string; // ISO
    action: string;
    detail: string;
    ip: string;
    device: string;
};

export type UserProfile = {
    userId: string;
    contact: ContactInfo;
    employment: EmploymentInfo;
    subscription: SubscriptionInfo;
    invoices: Invoice[];
    security: SecurityInfo;
    notifications: NotificationPrefs;
    activity: ActivityEvent[];
    lastLoginAt: string; // ISO
};

// ── Mock data per user ───────────────────────────────────────────────────────

const SUPER_ADMIN_PLAN: SubscriptionInfo = {
    planName: "Internal",
    pricePerMonth: 0,
    billingCycle: "Annual",
    seats: { used: 3, total: 0 },
    nextRenewal: "2099-12-31",
    status: "Internal",
    billingEmail: "billing@tracksmart.com",
};

const ADMIN_PLAN: SubscriptionInfo = {
    planName: "Fleet Pro",
    pricePerMonth: 199,
    billingCycle: "Monthly",
    seats: { used: 6, total: 25 },
    nextRenewal: "2026-05-15",
    status: "Active",
    paymentMethod: { brand: "Visa", last4: "4242", exp: "08/28" },
    billingEmail: "",
};

const USER_PLAN: SubscriptionInfo = {
    planName: "Fleet Pro",
    pricePerMonth: 0,
    billingCycle: "Monthly",
    seats: { used: 6, total: 25 },
    nextRenewal: "2026-05-15",
    status: "Active",
    billingEmail: "",
};

const defaultNotifications = (): NotificationPrefs => ({
    channels: { email: true, sms: false, inApp: true },
    categories: {
        compliance: { email: true, sms: false, inApp: true },
        maintenance: { email: true, sms: false, inApp: true },
        inventory: { email: true, sms: false, inApp: true },
        accidents: { email: true, sms: true, inApp: true },
        billing: { email: true, sms: false, inApp: false },
        security: { email: true, sms: true, inApp: true },
    },
});

const sampleActivity = (name: string): ActivityEvent[] => [
    {
        id: "act-1",
        timestamp: "2026-04-28T08:42:00Z",
        action: "Signed in",
        detail: "Successful login",
        ip: "73.119.42.18",
        device: "Chrome on macOS",
    },
    {
        id: "act-2",
        timestamp: "2026-04-27T17:14:00Z",
        action: "Updated profile",
        detail: `${name} changed phone number`,
        ip: "73.119.42.18",
        device: "Chrome on macOS",
    },
    {
        id: "act-3",
        timestamp: "2026-04-26T14:02:00Z",
        action: "Viewed inventory",
        detail: "Opened /inventory",
        ip: "73.119.42.18",
        device: "Chrome on macOS",
    },
    {
        id: "act-4",
        timestamp: "2026-04-25T09:11:00Z",
        action: "Signed in",
        detail: "Successful login",
        ip: "10.0.0.42",
        device: "Safari on iPhone",
    },
    {
        id: "act-5",
        timestamp: "2026-04-24T18:30:00Z",
        action: "Password changed",
        detail: "Password updated successfully",
        ip: "73.119.42.18",
        device: "Chrome on macOS",
    },
];

const sampleSessions = (): SecurityInfo["activeSessions"] => [
    {
        id: "sess-1",
        device: "MacBook Pro",
        browser: "Chrome 132",
        location: "Wilmington, DE",
        ip: "73.119.42.18",
        lastActive: "2026-04-28T08:42:00Z",
        current: true,
    },
    {
        id: "sess-2",
        device: "iPhone 15",
        browser: "Safari Mobile",
        location: "Wilmington, DE",
        ip: "10.0.0.42",
        lastActive: "2026-04-26T19:55:00Z",
        current: false,
    },
];

const buildProfile = (u: AppUser): UserProfile => {
    const isSuperAdmin = u.role === "super-admin";
    const sub = isSuperAdmin ? SUPER_ADMIN_PLAN : u.role === "admin" ? ADMIN_PLAN : USER_PLAN;

    return {
        userId: u.id,
        contact: {
            phone: "(555) 482-0190",
            altPhone: "(555) 482-0191",
            address: isSuperAdmin
                ? {
                    street: "1200 N Dupont Hwy",
                    city: "Wilmington",
                    state: "DE",
                    zip: "19801",
                    country: "United States",
                }
                : u.accountId === "acct-001"
                ? {
                    street: "550 Logistics Way",
                    apt: "Suite 200",
                    city: "Dallas",
                    state: "TX",
                    zip: "75201",
                    country: "United States",
                }
                : {
                    street: "401 Cascade Pkwy",
                    city: "Portland",
                    state: "OR",
                    zip: "97204",
                    country: "United States",
                },
            emergencyContact: {
                name: "Alex Morgan",
                relation: "Spouse",
                phone: "(555) 901-3344",
            },
        },
        employment: {
            employeeId: `EMP-${u.id.replace("u-", "")}`,
            department: isSuperAdmin
                ? "Platform Operations"
                : u.role === "admin"
                ? "Executive"
                : u.title.includes("Dispatcher")
                ? "Operations"
                : u.title.includes("Safety")
                ? "Safety & Compliance"
                : u.title.includes("Maintenance")
                ? "Maintenance"
                : "Operations",
            manager: isSuperAdmin ? undefined : u.role === "admin" ? "TrackSmart Account Manager" : "John Doe",
            joinedAt: "2024-03-15",
            timezone: "America/Chicago",
            language: "English (US)",
        },
        subscription: { ...sub, billingEmail: sub.billingEmail || u.email },
        invoices: isSuperAdmin
            ? []
            : [
                { id: "INV-2026-04", date: "2026-04-15", amount: 199, status: "Paid", description: "Fleet Pro — April 2026" },
                { id: "INV-2026-03", date: "2026-03-15", amount: 199, status: "Paid", description: "Fleet Pro — March 2026" },
                { id: "INV-2026-02", date: "2026-02-15", amount: 199, status: "Paid", description: "Fleet Pro — February 2026" },
                { id: "INV-2026-01", date: "2026-01-15", amount: 199, status: "Paid", description: "Fleet Pro — January 2026" },
                { id: "INV-2025-12", date: "2025-12-15", amount: 199, status: "Paid", description: "Fleet Pro — December 2025" },
            ],
        security: {
            lastPasswordChange: "2026-04-24",
            twoFactorEnabled: isSuperAdmin || u.role === "admin",
            recoveryEmail: u.email.replace("@", "+recovery@"),
            activeSessions: sampleSessions(),
        },
        notifications: defaultNotifications(),
        activity: sampleActivity(u.name),
        lastLoginAt: "2026-04-28T08:42:00Z",
    };
};

export const USER_PROFILES: Record<string, UserProfile> = APP_USERS.reduce(
    (acc, u) => {
        acc[u.id] = buildProfile(u);
        return acc;
    },
    {} as Record<string, UserProfile>
);

export function getUserProfile(userId: string): UserProfile | undefined {
    return USER_PROFILES[userId];
}
