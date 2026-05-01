import { useMemo, useState } from "react";
import {
    Briefcase, Building2, MapPin, Mail, Phone, Hash, Calendar, Edit3,
    Infinity as InfinityIcon, Truck, Users as UsersIcon, UserCircle2,
    LayoutDashboard, ListChecks, Plus,
} from "lucide-react";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { ServiceProfileSwitcher } from "@/components/layout/ServiceProfileSwitcher";
import {
    SERVICE_PROFILES_DB,
    formatLimit,
    isUnlimitedLimit,
    type ServiceProfile,
    type ServiceProfileStatus,
} from "@/pages/accounts/service-profiles.data";
import { getAccountsByServiceProfileId, type AccountStatus, type AccountRecord } from "@/pages/accounts/accounts.data";
import { APP_USERS, ROLE_BADGE, ROLE_LABELS, findUserById, type AppUser } from "@/data/users.data";
import { ServiceProfileEditModal } from "@/pages/accounts/ServiceProfileEditModal";
import { AddOfficeModal } from "./AddOfficeModal";
import { type OfficeLocation } from "@/pages/accounts/service-profiles.data";
import { UserViewModal } from "@/pages/admin/UserViewModal";
import { Eye } from "lucide-react";
import { ServiceProfileSectionEditModal, type SectionMode } from "./ServiceProfileSectionEditModal";
import { cn } from "@/lib/utils";

type TabId = "overview" | "carriers" | "offices" | "users";

const TABS: SubTab<TabId>[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "carriers", label: "Carrier Accounts", icon: Truck },
    { id: "offices", label: "Office Locations", icon: Building2 },
    { id: "users", label: "Users", icon: UsersIcon },
];

const STATUS_BADGE: Record<ServiceProfileStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_DOT: Record<ServiceProfileStatus, string> = {
    Active: "bg-emerald-500",
    Inactive: "bg-slate-400",
    Pending: "bg-amber-500",
    Suspended: "bg-red-500",
};

const CARRIER_STATUS_BADGE: Record<AccountStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
};

type Props = {
    serviceProfileId?: string;
    currentUser?: AppUser | null;
    onSelectServiceProfile?: (id: string) => void;
    /** When the user clicks a carrier row, set it as the active carrier in App.tsx. */
    onSelectAccount?: (account: AccountRecord) => void;
    onNavigate?: (path: string) => void;
};

export function ServiceProfilePage({ serviceProfileId, currentUser, onSelectServiceProfile, onSelectAccount, onNavigate }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [editing, setEditing] = useState<ServiceProfile | null>(null);
    const [profiles, setProfiles] = useState<ServiceProfile[]>(SERVICE_PROFILES_DB);
    const [addOfficeOpen, setAddOfficeOpen] = useState(false);
    const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
    const [sectionEdit, setSectionEdit] = useState<SectionMode | null>(null);

    // Visible service profiles for the switcher dropdown
    const visibleProfiles = useMemo(() => {
        if (!currentUser || currentUser.role === "super-admin") return profiles;
        if (!currentUser.serviceProfileId) return [];
        return profiles.filter((p) => p.id === currentUser.serviceProfileId);
    }, [profiles, currentUser]);

    // Resolve the active service profile
    const activeId =
        serviceProfileId ??
        (currentUser?.serviceProfileId ?? visibleProfiles[0]?.id ?? profiles[0]?.id);
    const profile = profiles.find((p) => p.id === activeId);

    // Save handler for the edit modal
    const handleSave = (next: ServiceProfile) => {
        setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    };

    // Append a new office to the active profile
    const handleAddOffice = (office: OfficeLocation) => {
        if (!profile) return;
        setProfiles((prev) =>
            prev.map((p) =>
                p.id === profile.id
                    ? { ...p, officeLocations: [...p.officeLocations, office] }
                    : p
            )
        );
    };

    // Permissions
    const canEdit =
        !!currentUser &&
        (currentUser.role === "super-admin" ||
            (currentUser.role === "admin" && currentUser.serviceProfileId === profile?.id));

    if (!profile) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center max-w-md">
                    <Briefcase size={28} className="mx-auto text-slate-400 mb-3" />
                    <h2 className="text-lg font-bold text-slate-900 mb-1">No service profile</h2>
                    <p className="text-sm text-slate-500">
                        You're not linked to a service profile yet. Ask a Super Admin to assign you.
                    </p>
                </div>
            </div>
        );
    }

    const linkedCarriers = getAccountsByServiceProfileId(profile.id);
    const linkedUsers = APP_USERS.filter((u) => u.serviceProfileId === profile.id);
    const utilization = isUnlimitedLimit(profile.accountLimit)
        ? null
        : Math.round((profile.accountsCreated / Math.max(1, profile.accountLimit)) * 100);
    const initials = profile.legalName
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map((p) => p[0]!.toUpperCase()).join("");

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-0">
                {/* Breadcrumb + switcher row */}
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                    <nav className="flex items-center gap-2 text-xs text-slate-500" aria-label="Breadcrumb">
                        <Briefcase size={14} />
                        <span>Service</span>
                        <span>/</span>
                        <span className="font-medium text-slate-900">{profile.legalName}</span>
                    </nav>
                    {visibleProfiles.length > 1 && (
                        <ServiceProfileSwitcher
                            selectedProfileId={profile.id}
                            profiles={visibleProfiles}
                            onSelect={(id) => onSelectServiceProfile?.(id)}
                            scopeLabel={
                                currentUser?.role === "super-admin"
                                    ? `Super Admin · All ${visibleProfiles.length} profiles`
                                    : `${visibleProfiles.length} profile${visibleProfiles.length === 1 ? "" : "s"}`
                            }
                        />
                    )}
                </div>

                {/* Title + status + edit */}
                <div className="flex items-start gap-4 flex-wrap pb-5">
                    <div className="h-14 w-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-base font-bold shrink-0 shadow-sm">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-slate-900 truncate">{profile.legalName}</h1>
                            <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_BADGE[profile.status])}>
                                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[profile.status])} />
                                {profile.status}
                            </span>
                        </div>
                        {profile.dbaName && <p className="text-sm text-slate-500 mt-0.5">DBA {profile.dbaName}</p>}
                        <div className="text-xs text-slate-500 inline-flex items-center gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1"><Hash size={11} className="text-slate-400" /> {profile.stateOfInc}</span>
                            <span className="inline-flex items-center gap-1"><Briefcase size={11} className="text-slate-400" /> {profile.businessType}</span>
                            <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> Since {profile.createdAt}</span>
                        </div>
                    </div>
                    {canEdit && (
                        <button
                            onClick={() => setEditing(profile)}
                            className="h-9 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                        >
                            <Edit3 size={14} /> Edit Profile
                        </button>
                    )}
                </div>

                {/* Tabs */}
                <SubTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} bordered={false} />
            </div>

            {/* Tab content */}
            <div className="px-8 py-8 w-full">
                {activeTab === "overview" && (
                    <OverviewTab
                        profile={profile}
                        utilization={utilization}
                        linkedCarriers={linkedCarriers}
                        linkedUsers={linkedUsers}
                        canEdit={canEdit}
                        canEditSettings={currentUser?.role === "super-admin"}
                        onSectionEdit={(mode) => setSectionEdit(mode)}
                    />
                )}
                {activeTab === "carriers" && (
                    <CarriersTab
                        carriers={linkedCarriers}
                        canAdd={canEdit}
                        onAddCarrier={() => onNavigate?.("/accounts/new")}
                        onOpenCarrier={(c) => {
                            onSelectAccount?.(c);
                            onNavigate?.("/account/profile");
                        }}
                        onNavigate={onNavigate}
                    />
                )}
                {activeTab === "offices" && (
                    <OfficesTab
                        profile={profile}
                        canAdd={canEdit}
                        onAddOffice={() => setAddOfficeOpen(true)}
                    />
                )}
                {activeTab === "users" && (
                    <UsersTab
                        users={linkedUsers}
                        canAdd={canEdit}
                        onAddUser={() => onNavigate?.("/admin/users/new")}
                        onViewUser={(u) => setViewingUser(u)}
                    />
                )}
            </div>

            <UserViewModal
                user={viewingUser}
                onClose={() => setViewingUser(null)}
            />

            <ServiceProfileSectionEditModal
                open={sectionEdit !== null}
                mode={sectionEdit}
                profile={profile}
                currentUser={currentUser}
                onClose={() => setSectionEdit(null)}
                onSave={handleSave}
            />

            <ServiceProfileEditModal
                profile={editing}
                currentUser={currentUser}
                onClose={() => setEditing(null)}
                onSave={handleSave}
            />
            <AddOfficeModal
                open={addOfficeOpen}
                onClose={() => setAddOfficeOpen(false)}
                onSave={handleAddOffice}
            />
        </div>
    );
}

// ── Tab: Overview ──────────────────────────────────────────────────────────

function OverviewTab({
    profile, utilization, linkedCarriers, linkedUsers, canEdit, canEditSettings, onSectionEdit,
}: {
    profile: ServiceProfile;
    utilization: number | null;
    linkedCarriers: ReturnType<typeof getAccountsByServiceProfileId>;
    linkedUsers: AppUser[];
    canEdit: boolean;
    canEditSettings: boolean;
    onSectionEdit: (mode: SectionMode) => void;
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Account creation usage */}
            <Card
                title="Account Creation"
                className="lg:col-span-3"
                onEdit={canEditSettings ? () => onSectionEdit("settings") : undefined}
            >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {isUnlimitedLimit(profile.accountLimit) ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-sm font-bold">
                            <InfinityIcon size={14} /> Unlimited account creation
                        </span>
                    ) : (
                        <div className="flex-1 min-w-[260px]">
                            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                <span className="font-semibold uppercase tracking-wider">Usage</span>
                                <span>{profile.accountsCreated} of {formatLimit(profile.accountLimit)}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn(
                                        "h-full rounded-full transition-all",
                                        (utilization ?? 0) < 70 ? "bg-emerald-500" :
                                        (utilization ?? 0) < 90 ? "bg-amber-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${utilization ?? 0}%` }}
                                />
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <Stat label="Carriers" value={linkedCarriers.length} accent="indigo" />
                        <Stat label="Users" value={linkedUsers.length} accent="emerald" />
                        <Stat label="Offices" value={profile.officeLocations.length} accent="blue" />
                    </div>
                </div>
            </Card>

            {/* Identity */}
            <Card title="Identity" onEdit={canEdit ? () => onSectionEdit("identity") : undefined}>
                <DetailRow label="Legal Name" value={profile.legalName} />
                {profile.dbaName && <DetailRow label="DBA" value={profile.dbaName} />}
                <DetailRow label="State of Incorporation" value={profile.stateOfInc} />
                <DetailRow label="Business Type" value={profile.businessType} />
                <DetailRow label="Status" value={profile.status} />
                <DetailRow label="Created" value={profile.createdAt} />
            </Card>

            {/* Legal/Main address */}
            <Card
                title="Legal / Main Address"
                icon={MapPin}
                onEdit={canEdit ? () => onSectionEdit("legal-address") : undefined}
            >
                <div className="text-sm text-slate-700 leading-relaxed">
                    <div>{profile.legalAddress.street}{profile.legalAddress.apt ? `, ${profile.legalAddress.apt}` : ""}</div>
                    <div>{profile.legalAddress.city}, {profile.legalAddress.state} {profile.legalAddress.zip}</div>
                    <div className="text-slate-500">{profile.legalAddress.country}</div>
                </div>
            </Card>

            {/* Mailing address */}
            <Card
                title="Mailing Address"
                icon={Mail}
                onEdit={canEdit ? () => onSectionEdit("mailing-address") : undefined}
            >
                <div className="text-sm text-slate-700 leading-relaxed">
                    <div>{profile.mailingAddress.streetOrPoBox}</div>
                    <div>{profile.mailingAddress.city}, {profile.mailingAddress.state} {profile.mailingAddress.zip}</div>
                    <div className="text-slate-500">{profile.mailingAddress.country}</div>
                </div>
            </Card>

            {/* Contact */}
            <Card
                title="Contact"
                className="lg:col-span-3"
                onEdit={canEdit ? () => onSectionEdit("contact") : undefined}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="inline-flex items-center gap-2 text-slate-700">
                        <Mail size={13} className="text-slate-400" /> {profile.contactEmail ?? "—"}
                    </div>
                    <div className="inline-flex items-center gap-2 text-slate-700">
                        <Phone size={13} className="text-slate-400" /> {profile.contactPhone ?? "—"}
                    </div>
                </div>
            </Card>
        </div>
    );
}

// ── Tab: Carrier Accounts ──────────────────────────────────────────────────

function CarriersTab({
    carriers, canAdd, onAddCarrier, onOpenCarrier, onNavigate,
}: {
    carriers: ReturnType<typeof getAccountsByServiceProfileId>;
    canAdd: boolean;
    onAddCarrier: () => void;
    onOpenCarrier: (c: AccountRecord) => void;
    onNavigate?: (path: string) => void;
}) {
    if (carriers.length === 0) {
        return (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
                <Truck size={28} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No carrier accounts yet</h3>
                <p className="text-xs text-slate-500 mt-1">When admins create carriers under this service profile, they'll appear here.</p>
                {canAdd && (
                    <button
                        onClick={onAddCarrier}
                        className="mt-5 h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={14} /> Add Carrier Profile
                    </button>
                )}
            </div>
        );
    }
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/40">
                <div className="text-sm font-semibold text-slate-900">{carriers.length} carrier account{carriers.length === 1 ? "" : "s"}</div>
                <div className="flex items-center gap-3">
                    {onNavigate && (
                        <button
                            onClick={() => onNavigate("/accounts")}
                            className="text-xs font-medium text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                            View in Accounts <ListChecks size={12} />
                        </button>
                    )}
                    {canAdd && (
                        <button
                            onClick={onAddCarrier}
                            className="h-8 px-3 rounded-md bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                        >
                            <Plus size={12} /> Add Carrier Profile
                        </button>
                    )}
                </div>
            </div>
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <Th>Carrier</Th>
                        <Th>Location</Th>
                        <Th>Created By</Th>
                        <Th className="text-right">Drivers / Assets</Th>
                        <Th>Status</Th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {carriers.map((c) => {
                        const creator = c.createdByUserId ? findUserById(c.createdByUserId) : undefined;
                        const ci = c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
                        return (
                            <tr
                                key={c.id}
                                onClick={() => onOpenCarrier(c)}
                                className="hover:bg-slate-50/60 cursor-pointer transition-colors"
                            >
                                <Td>
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold shrink-0">{ci}</div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-slate-900 truncate">{c.legalName}</div>
                                            <div className="text-xs text-slate-500 truncate">DBA {c.dbaName || "—"}</div>
                                        </div>
                                    </div>
                                </Td>
                                <Td className="text-slate-600">{c.city}, {c.state}</Td>
                                <Td>
                                    {creator ? (
                                        <div className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                            <UserCircle2 size={12} className="text-slate-400" /> {creator.name}
                                        </div>
                                    ) : <span className="text-xs text-slate-400">—</span>}
                                </Td>
                                <Td className="text-right text-xs font-semibold text-slate-700 tabular-nums">
                                    {c.drivers} / {c.assets}
                                </Td>
                                <Td>
                                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", CARRIER_STATUS_BADGE[c.status])}>
                                        {c.status}
                                    </span>
                                </Td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Tab: Office Locations ──────────────────────────────────────────────────

function OfficesTab({
    profile, canAdd, onAddOffice,
}: { profile: ServiceProfile; canAdd: boolean; onAddOffice: () => void }) {
    if (profile.officeLocations.length === 0) {
        return (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
                <Building2 size={28} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No office locations yet</h3>
                <p className="text-xs text-slate-500 mt-1">Add an office to track corporate locations operated under this service profile.</p>
                {canAdd && (
                    <button
                        onClick={onAddOffice}
                        className="mt-5 h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={14} /> Add Office Location
                    </button>
                )}
            </div>
        );
    }
    return (
        <div className="space-y-4">
            {/* Toolbar with Add button */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{profile.officeLocations.length}</span> office{profile.officeLocations.length === 1 ? "" : "s"}
                </div>
                {canAdd && (
                    <button
                        onClick={onAddOffice}
                        className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={14} /> Add Office Location
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.officeLocations.map((o) => (
                <div key={o.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Building2 size={16} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{o.label}</h4>
                            <div className="text-xs text-slate-600 mt-1 leading-snug">
                                {o.address}<br />
                                {[o.city, o.state].filter(Boolean).join(", ")}
                            </div>
                            {(o.contactName || o.phone) && (
                                <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                                    {o.contactName && <div className="inline-flex items-center gap-1.5"><UserCircle2 size={11} className="text-slate-400" /> {o.contactName}</div>}
                                    {o.phone && <div className="inline-flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {o.phone}</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
            </div>
        </div>
    );
}

// ── Tab: Users ─────────────────────────────────────────────────────────────

function UsersTab({
    users, canAdd, onAddUser, onViewUser,
}: {
    users: AppUser[];
    canAdd: boolean;
    onAddUser: () => void;
    onViewUser: (u: AppUser) => void;
}) {
    if (users.length === 0) {
        return (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
                <UsersIcon size={28} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-semibold text-slate-700">No users yet</h3>
                <p className="text-xs text-slate-500 mt-1">Add users to give people access to this service profile.</p>
                {canAdd && (
                    <button
                        onClick={onAddUser}
                        className="mt-5 h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={14} /> Add User
                    </button>
                )}
            </div>
        );
    }
    const admins = users.filter((u) => u.role === "admin");
    const regular = users.filter((u) => u.role === "user");

    return (
        <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">{users.length}</span> user{users.length === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-slate-900">{admins.length}</span> admin{admins.length === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-slate-900">{regular.length}</span> operational
                </div>
                {canAdd && (
                    <button
                        onClick={onAddUser}
                        className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={14} /> Add User
                    </button>
                )}
            </div>

            {admins.length > 0 && <UserGroup label="Admins" users={admins} onViewUser={onViewUser} />}
            {regular.length > 0 && <UserGroup label="Operational Users" users={regular} onViewUser={onViewUser} />}
        </div>
    );
}

function UserGroup({ label, users, onViewUser }: { label: string; users: AppUser[]; onViewUser: (u: AppUser) => void }) {
    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">{label}</h4>
                <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                    {users.length}
                </span>
            </div>
            <ul className="divide-y divide-slate-100">
                {users.map((u) => (
                    <li
                        key={u.id}
                        onClick={() => onViewUser(u)}
                        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                                "h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold shrink-0",
                                u.avatarGradient
                            )}>
                                {u.initials}
                            </div>
                            <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div>
                                <div className="text-xs text-slate-500 truncate">{u.title} · {u.email}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", ROLE_BADGE[u.role])}>
                                {ROLE_LABELS[u.role]}
                            </span>
                            <span className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                u.status === "Active"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-slate-100 text-slate-500 border-slate-200"
                            )}>
                                {u.status}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onViewUser(u); }}
                                title="View user"
                                aria-label="View user"
                                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                                <Eye size={14} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// ── Building blocks ────────────────────────────────────────────────────────

function Card({
    title, icon: Icon, children, className, onEdit,
}: {
    title: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    onEdit?: () => void;
}) {
    return (
        <section className={cn("bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden", className)}>
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 min-w-0">
                    {Icon && <Icon size={14} className="text-slate-400" />}
                    <h3 className="text-sm font-semibold text-slate-900 truncate">{title}</h3>
                </div>
                {onEdit && (
                    <button
                        type="button"
                        onClick={onEdit}
                        title="Edit"
                        aria-label="Edit"
                        className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                        <Edit3 size={14} />
                    </button>
                )}
            </div>
            <div className="p-5 space-y-3">{children}</div>
        </section>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
            <span className="text-slate-900 font-medium text-right truncate max-w-[60%]">{value}</span>
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: "indigo" | "emerald" | "blue" }) {
    const map: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
        emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
        blue: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return (
        <div className={cn("rounded-lg border px-4 py-2", map[accent])}>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
        </div>
    );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <th className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider", className)}>{children}</th>;
}
function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
    return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
