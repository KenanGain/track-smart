import { useMemo, useState } from "react";
import {
    Mail, Phone, MapPin, Building2, Calendar, Globe, Shield, Edit2,
    KeyRound, Smartphone, Monitor, LogOut, ShieldCheck, Bell, Activity,
    CreditCard, Download, Receipt, AlertCircle, Check, Info, User as UserIcon,
} from "lucide-react";
import { ROLE_BADGE, ROLE_LABELS, type AppUser } from "@/data/users.data";
import { getUserProfile, type NotificationPrefs, type UserProfile } from "@/data/user-profile.data";
import { EditProfileModal } from "./EditProfileModal";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { cn } from "@/lib/utils";

type Props = {
    user: AppUser;
};

type TabId = "overview" | "subscription" | "security" | "notifications" | "activity";

const TABS: SubTab<TabId>[] = [
    { id: "overview", label: "Overview", icon: UserIcon },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "activity", label: "Activity Log", icon: Activity },
];

function fmtDate(d: string) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function fmtDateTime(d: string) {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function timeAgo(iso: string) {
    const dt = new Date(iso);
    const diff = (Date.now() - dt.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function MyProfilePage({ user }: Props) {
    const initial = useMemo(() => getUserProfile(user.id), [user.id]);
    const [profile, setProfile] = useState<UserProfile | undefined>(initial);
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [editOpen, setEditOpen] = useState(false);
    const [pwOpen, setPwOpen] = useState(false);
    const [savedToast, setSavedToast] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setSavedToast(msg);
        setTimeout(() => setSavedToast(null), 2500);
    };

    const setNotifs = (p: NotificationPrefs) => {
        if (!profile) return;
        setProfile({ ...profile, notifications: p });
    };

    if (!profile) {
        return (
            <div className="p-8">
                <p className="text-sm text-slate-500">No profile data available for this user.</p>
            </div>
        );
    }

    const handleSaveProfile = (next: { contact: typeof profile.contact; employment: typeof profile.employment }) => {
        setProfile({ ...profile, contact: next.contact, employment: next.employment });
        showToast("Profile updated.");
    };

    const handleSavePassword = (signOutOthers: boolean) => {
        const today = new Date().toISOString().slice(0, 10);
        setProfile({
            ...profile,
            security: {
                ...profile.security,
                lastPasswordChange: today,
                activeSessions: signOutOthers
                    ? profile.security.activeSessions.filter((s) => s.current)
                    : profile.security.activeSessions,
            },
            activity: [
                {
                    id: `act-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    action: "Password changed",
                    detail: signOutOthers ? "Password updated · Other sessions signed out" : "Password updated",
                    ip: "73.119.42.18",
                    device: "Chrome on macOS",
                },
                ...profile.activity,
            ].slice(0, 10),
        });
        showToast(signOutOthers ? "Password updated. Other sessions signed out." : "Password updated.");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <ProfileHeader
                user={user}
                memberSince={profile.employment.joinedAt}
                lastLogin={profile.lastLoginAt}
                planName={profile.subscription.planName}
                twoFactorEnabled={profile.security.twoFactorEnabled}
                onEdit={() => setEditOpen(true)}
                onChangePassword={() => setPwOpen(true)}
            />

            {/* Tab Navigation */}
            <div className="bg-white px-8">
                <SubTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
            </div>

            {savedToast && (
                <div className="px-8 pt-4">
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 inline-flex items-center gap-2">
                        <Check size={14} /> {savedToast}
                    </div>
                </div>
            )}

            {/* Tab Content */}
            <div className="px-8 py-8 max-w-6xl">
                {activeTab === "overview" && <OverviewTab user={user} profile={profile} />}
                {activeTab === "subscription" && <SubscriptionTab profile={profile} />}
                {activeTab === "security" && <SecurityTab profile={profile} onChangePassword={() => setPwOpen(true)} />}
                {activeTab === "notifications" && <NotificationsTab prefs={profile.notifications} setPrefs={setNotifs} />}
                {activeTab === "activity" && <ActivityTab profile={profile} />}
            </div>

            {/* Modals */}
            <EditProfileModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                contact={profile.contact}
                employment={profile.employment}
                onSave={handleSaveProfile}
            />
            <ChangePasswordModal
                open={pwOpen}
                onClose={() => setPwOpen(false)}
                onSave={handleSavePassword}
            />
        </div>
    );
}

// ── Header ───────────────────────────────────────────────────────────────────

function ProfileHeader({
    user, memberSince, lastLogin, planName, twoFactorEnabled, onEdit, onChangePassword,
}: { user: AppUser; memberSince: string; lastLogin: string; planName: string; twoFactorEnabled: boolean; onEdit: () => void; onChangePassword: () => void }) {
    return (
        <div className="bg-white border-b border-slate-200 px-8 pt-8 pb-6">
            <div className="flex items-start gap-6 flex-wrap">
                <div className={cn(
                    "h-24 w-24 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-slate-200 shrink-0",
                    user.avatarGradient
                )}>
                    {user.initials}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                        <span className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            ROLE_BADGE[user.role]
                        )}>
                            {ROLE_LABELS[user.role]}
                        </span>
                    </div>
                    <p className="text-sm text-slate-600">{user.title}</p>

                    <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <Mail size={13} className="text-slate-400" /> {user.email}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Building2 size={13} className="text-slate-400" /> {user.accountName ?? "Platform-wide access"}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-400" /> Member since {fmtDate(memberSince)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onEdit}
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 shadow-sm"
                    >
                        <Edit2 size={14} /> Edit Profile
                    </button>
                    <button
                        onClick={onChangePassword}
                        className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <KeyRound size={14} /> Change Password
                    </button>
                </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard label="Plan" value={planName} icon={CreditCard} accent="violet" />
                <StatCard label="Last Login" value={timeAgo(lastLogin)} icon={Activity} accent="emerald" />
                <StatCard label="Time Zone" value="Central (CT)" icon={Globe} accent="blue" />
                <StatCard label="2FA" value={twoFactorEnabled ? "Enabled" : "Disabled"} icon={ShieldCheck} accent={twoFactorEnabled ? "emerald" : "amber"} />
            </div>
        </div>
    );
}

function StatCard({
    label, value, icon: Icon, accent,
}: { label: string; value: string; icon: React.ElementType; accent: "violet" | "emerald" | "blue" | "amber" }) {
    const accents: Record<string, string> = {
        violet: "bg-violet-50 text-violet-600",
        emerald: "bg-emerald-50 text-emerald-600",
        blue: "bg-blue-50 text-blue-600",
        amber: "bg-amber-50 text-amber-600",
    };
    return (
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", accents[accent])}>
                <Icon size={16} />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                <div className="text-sm font-semibold text-slate-900 truncate">{value}</div>
            </div>
        </div>
    );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ user, profile }: { user: AppUser; profile: ReturnType<typeof getUserProfile> & object }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card title="Personal Information" subtitle="Identity and contact details" className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="Full Name" value={user.name} />
                    <Field label="Title" value={user.title} />
                    <Field label="Email" value={user.email} icon={Mail} />
                    <Field label="Phone" value={profile.contact.phone} icon={Phone} />
                    <Field label="Alternate Phone" value={profile.contact.altPhone ?? "—"} />
                    <Field label="Time Zone" value={profile.employment.timezone} icon={Globe} />
                    <Field label="Language" value={profile.employment.language} />
                    <Field label="Member Since" value={fmtDate(profile.employment.joinedAt)} icon={Calendar} />
                </div>
            </Card>

            <Card title="Role & Access" subtitle="Permissions and scope">
                <div className="space-y-3">
                    <Field label="Authority" value={ROLE_LABELS[user.role]} />
                    <Field label="Carrier Scope" value={user.accountName ?? "Platform-wide (all carriers)"} />
                    <Field label="Employee ID" value={profile.employment.employeeId} />
                    <Field label="Department" value={profile.employment.department} />
                    {profile.employment.manager && <Field label="Reports To" value={profile.employment.manager} />}
                </div>
            </Card>

            <Card title="Address" subtitle="Primary mailing address" className="lg:col-span-2">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <MapPin size={16} />
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed">
                        <div>{profile.contact.address.street}{profile.contact.address.apt ? `, ${profile.contact.address.apt}` : ""}</div>
                        <div>{profile.contact.address.city}, {profile.contact.address.state} {profile.contact.address.zip}</div>
                        <div className="text-slate-500">{profile.contact.address.country}</div>
                    </div>
                </div>
            </Card>

            <Card title="Emergency Contact" subtitle="Notified in case of emergency">
                <div className="space-y-3">
                    <Field label="Name" value={profile.contact.emergencyContact.name} />
                    <Field label="Relationship" value={profile.contact.emergencyContact.relation} />
                    <Field label="Phone" value={profile.contact.emergencyContact.phone} icon={Phone} />
                </div>
            </Card>
        </div>
    );
}

// ── Subscription Tab ─────────────────────────────────────────────────────────

function SubscriptionTab({ profile }: { profile: ReturnType<typeof getUserProfile> & object }) {
    const sub = profile.subscription;
    const utilization = sub.seats.total > 0 ? Math.round((sub.seats.used / sub.seats.total) * 100) : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Plan card */}
            <Card title="Current Plan" subtitle="Your active subscription" className="lg:col-span-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-slate-900">{sub.planName}</span>
                            <span className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                sub.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                sub.status === "Trial" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                sub.status === "Past Due" ? "bg-red-50 text-red-700 border-red-200" :
                                "bg-violet-50 text-violet-700 border-violet-200"
                            )}>
                                {sub.status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            {sub.status === "Internal" ? "Internal platform account — no billing applies." : `Billed ${sub.billingCycle.toLowerCase()} · Next renewal ${fmtDate(sub.nextRenewal)}`}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-slate-900">${sub.pricePerMonth}</div>
                        <div className="text-xs text-slate-500">per month</div>
                    </div>
                </div>

                {sub.seats.total > 0 && (
                    <div className="mt-5">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                            <span className="font-semibold uppercase tracking-wider">Seats</span>
                            <span>{sub.seats.used} of {sub.seats.total} used ({utilization}%)</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    utilization < 70 ? "bg-emerald-500" : utilization < 90 ? "bg-amber-500" : "bg-red-500"
                                )}
                                style={{ width: `${utilization}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="mt-5 flex items-center gap-2">
                    <button className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm">
                        Change Plan
                    </button>
                    <button className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                        Manage Seats
                    </button>
                </div>
            </Card>

            <Card title="Payment Method" subtitle="Used for billing">
                {sub.paymentMethod ? (
                    <>
                        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-xs uppercase tracking-wider text-slate-300">{sub.paymentMethod.brand}</span>
                                <CreditCard size={18} className="text-slate-300" />
                            </div>
                            <div className="text-lg font-mono tracking-widest">•••• •••• •••• {sub.paymentMethod.last4}</div>
                            <div className="text-xs text-slate-400 mt-2">Expires {sub.paymentMethod.exp}</div>
                        </div>
                        <button className="h-9 w-full rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50">
                            Update Payment
                        </button>
                    </>
                ) : (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                        <Info size={20} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">No payment method on file.</p>
                    </div>
                )}
            </Card>

            {/* Invoices */}
            <Card title="Invoices" subtitle="Recent billing history" className="lg:col-span-3">
                {profile.invoices.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                        <Receipt size={20} className="mx-auto text-slate-400 mb-2" />
                        <p className="text-xs text-slate-500">No invoices yet.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden border border-slate-200 rounded-lg">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {profile.invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/60">
                                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{inv.id}</td>
                                        <td className="px-4 py-3 text-slate-600">{fmtDate(inv.date)}</td>
                                        <td className="px-4 py-3 text-slate-700">{inv.description}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-slate-900">${inv.amount.toFixed(2)}</td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                inv.status === "Paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                inv.status === "Open" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                inv.status === "Refunded" ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                "bg-slate-100 text-slate-500 border-slate-200"
                                            )}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="text-slate-400 hover:text-slate-700" aria-label="Download invoice">
                                                <Download size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-4 text-xs text-slate-500 inline-flex items-center gap-2">
                    <Mail size={12} className="text-slate-400" /> Billing emails sent to <span className="font-medium text-slate-700">{sub.billingEmail}</span>
                </div>
            </Card>
        </div>
    );
}

// ── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab({
    profile, onChangePassword,
}: { profile: ReturnType<typeof getUserProfile> & object; onChangePassword: () => void }) {
    const sec = profile.security;
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card title="Password" subtitle="Used to sign in to your account">
                <Field label="Last Changed" value={fmtDate(sec.lastPasswordChange)} icon={Calendar} />
                <button
                    onClick={onChangePassword}
                    className="mt-4 h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                >
                    <KeyRound size={14} /> Change Password
                </button>
            </Card>

            <Card title="Two-Factor Authentication" subtitle="Add an extra layer of security">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                sec.twoFactorEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                                {sec.twoFactorEnabled ? "Enabled" : "Disabled"}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {sec.twoFactorEnabled
                                ? "An authenticator app is required to sign in."
                                : "Set up an authenticator app for additional security."}
                        </p>
                    </div>
                    <button className={cn(
                        "h-9 px-3 rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm",
                        sec.twoFactorEnabled
                            ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                    )}>
                        {sec.twoFactorEnabled ? "Manage" : "Enable 2FA"}
                    </button>
                </div>
            </Card>

            <Card title="Recovery Email" subtitle="Used to recover your account if you lose access">
                <Field label="Recovery Email" value={sec.recoveryEmail} icon={Mail} />
                <button className="mt-4 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2">
                    Update
                </button>
            </Card>

            <Card title="Active Sessions" subtitle="Devices currently signed in" className="lg:col-span-2">
                <ul className="divide-y divide-slate-100">
                    {sec.activeSessions.map((s) => {
                        const Icon = s.device.toLowerCase().includes("iphone") || s.device.toLowerCase().includes("android")
                            ? Smartphone : Monitor;
                        return (
                            <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                        <Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900 truncate">{s.device} · {s.browser}</span>
                                            {s.current && (
                                                <span className="inline-flex items-center gap-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                                    <Check size={10} /> Current
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate">
                                            {s.location} · {s.ip} · Last active {timeAgo(s.lastActive)}
                                        </div>
                                    </div>
                                </div>
                                {!s.current && (
                                    <button className="h-8 px-2.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 inline-flex items-center gap-1.5">
                                        <LogOut size={12} /> Sign out
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </Card>
        </div>
    );
}

// ── Notifications Tab ────────────────────────────────────────────────────────

const CATEGORY_LABELS: { key: keyof NotificationPrefs["categories"]; label: string; description: string }[] = [
    { key: "compliance", label: "Compliance", description: "Document expiry, audit reminders, missing data" },
    { key: "maintenance", label: "Maintenance", description: "Scheduled service, work orders, overdue items" },
    { key: "inventory", label: "Inventory", description: "Item expirations, low stock, vendor renewals" },
    { key: "accidents", label: "Accidents & Incidents", description: "New accidents, follow-up tasks, claims" },
    { key: "billing", label: "Billing", description: "Invoices, payment failures, plan changes" },
    { key: "security", label: "Security", description: "New sign-ins, password changes, 2FA events" },
];

function NotificationsTab({
    prefs, setPrefs,
}: { prefs: NotificationPrefs; setPrefs: (p: NotificationPrefs) => void }) {

    const toggleChannel = (ch: keyof NotificationPrefs["channels"]) => {
        setPrefs({ ...prefs, channels: { ...prefs.channels, [ch]: !prefs.channels[ch] } });
    };

    const toggleCat = (cat: keyof NotificationPrefs["categories"], ch: keyof NotificationPrefs["channels"]) => {
        setPrefs({
            ...prefs,
            categories: {
                ...prefs.categories,
                [cat]: { ...prefs.categories[cat], [ch]: !prefs.categories[cat][ch] },
            },
        });
    };

    return (
        <div className="space-y-6">
            <Card title="Channels" subtitle="Master switches for how you receive notifications">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ChannelToggle label="Email" enabled={prefs.channels.email} onToggle={() => toggleChannel("email")} />
                    <ChannelToggle label="SMS" enabled={prefs.channels.sms} onToggle={() => toggleChannel("sms")} />
                    <ChannelToggle label="In-App" enabled={prefs.channels.inApp} onToggle={() => toggleChannel("inApp")} />
                </div>
            </Card>

            <Card title="Categories" subtitle="Choose which notifications you want for each topic">
                <div className="overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">Email</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">SMS</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">In-App</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {CATEGORY_LABELS.map((cat) => (
                                <tr key={cat.key} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-semibold text-slate-900">{cat.label}</div>
                                        <div className="text-xs text-slate-500">{cat.description}</div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Checkbox checked={prefs.categories[cat.key].email} onChange={() => toggleCat(cat.key, "email")} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Checkbox checked={prefs.categories[cat.key].sms} onChange={() => toggleCat(cat.key, "sms")} />
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <Checkbox checked={prefs.categories[cat.key].inApp} onChange={() => toggleCat(cat.key, "inApp")} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

function ChannelToggle({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-colors text-left",
                enabled ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
            )}
        >
            <div>
                <div className="text-sm font-semibold text-slate-900">{label}</div>
                <div className="text-xs text-slate-500">{enabled ? "Enabled" : "Disabled"}</div>
            </div>
            <span className={cn(
                "w-10 h-6 rounded-full relative transition-colors shrink-0",
                enabled ? "bg-blue-600" : "bg-slate-200"
            )}>
                <span className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    enabled ? "left-5" : "left-1"
                )} />
            </span>
        </button>
    );
}

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={cn(
                "h-5 w-5 rounded border flex items-center justify-center transition-colors",
                checked ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300 hover:border-slate-400"
            )}
            aria-pressed={checked}
        >
            {checked && <Check size={12} className="text-white" strokeWidth={3} />}
        </button>
    );
}

// ── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ profile }: { profile: ReturnType<typeof getUserProfile> & object }) {
    return (
        <Card title="Recent Activity" subtitle="Last 30 days of account activity">
            {profile.activity.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
                    <AlertCircle size={20} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs text-slate-500">No recorded activity yet.</p>
                </div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {profile.activity.map((a) => (
                        <li key={a.id} className="py-3 flex items-start gap-4">
                            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Activity size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="text-sm font-semibold text-slate-900">{a.action}</div>
                                    <div className="text-xs text-slate-500 whitespace-nowrap">{fmtDateTime(a.timestamp)}</div>
                                </div>
                                <div className="text-xs text-slate-600 mt-0.5">{a.detail}</div>
                                <div className="text-[11px] text-slate-400 mt-1 inline-flex items-center gap-3">
                                    <span>{a.device}</span>
                                    <span className="font-mono">{a.ip}</span>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}

// ── Reusable building blocks ────────────────────────────────────────────────

function Card({
    title, subtitle, children, className,
}: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", className)}>
            <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function Field({
    label, value, icon: Icon,
}: { label: string; value: string; icon?: React.ElementType }) {
    return (
        <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
            <div className="text-sm text-slate-900 inline-flex items-center gap-1.5">
                {Icon && <Icon size={13} className="text-slate-400" />}
                {value}
            </div>
        </div>
    );
}
