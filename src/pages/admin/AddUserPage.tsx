import { useMemo, useState } from "react";
import { ArrowLeft, Shield, Check, User as UserIcon, Building2, Lock } from "lucide-react";
import {
    ROLE_LABELS,
    canCreateUserForAccount,
    getManagedAccountIds,
    type AppUser,
    type UserRole,
} from "@/data/users.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { cn } from "@/lib/utils";

type Props = {
    currentUser: AppUser;
    onNavigate: (path: string) => void;
};

export type NewUserPayload = {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title: string;
    role: UserRole;
    accountId?: string;
    accountName?: string;
    sendInvite: boolean;
};

export function AddUserPage({ currentUser, onNavigate }: Props) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [title, setTitle] = useState("");
    const [role, setRole] = useState<UserRole>("user");
    const isSuperAdmin = currentUser.role === "super-admin";
    const managed = useMemo(() => getManagedAccountIds(currentUser), [currentUser]);

    const availableCarriers = useMemo(() => {
        if (!managed) return ACCOUNTS_DB; // super admin
        return ACCOUNTS_DB.filter((a) => managed.includes(a.id));
    }, [managed]);

    const [accountId, setAccountId] = useState<string>(availableCarriers[0]?.id ?? "");
    const [sendInvite, setSendInvite] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Roles current user can grant
    const grantableRoles: UserRole[] = isSuperAdmin
        ? ["super-admin", "admin", "user"]
        : ["admin", "user"];

    const isValid =
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        /^\S+@\S+\.\S+$/.test(email) &&
        title.trim().length > 0 &&
        (role === "super-admin" || !!accountId);

    const handleSave = () => {
        if (!isValid) {
            setError("Please complete all required fields with a valid email.");
            return;
        }
        if (role !== "super-admin" && !canCreateUserForAccount(currentUser, accountId)) {
            setError("You don't have permission to create a user for that carrier.");
            return;
        }
        const carrier = ACCOUNTS_DB.find((a) => a.id === accountId);
        const payload: NewUserPayload = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            title: title.trim(),
            role,
            accountId: role === "super-admin" ? undefined : accountId,
            accountName: role === "super-admin" ? undefined : carrier?.legalName,
            sendInvite,
        };
        console.log("New user payload:", payload);
        onNavigate("/admin/users");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Sticky Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <button
                        type="button"
                        onClick={() => onNavigate("/admin/users")}
                        className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-1"
                    >
                        <ArrowLeft size={12} /> Back to Users
                    </button>
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Shield size={12} />
                        <span>Admin</span>
                        <span>/</span>
                        <span>Users</span>
                        <span>/</span>
                        <span>Add User</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-900">Add User</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate("/admin/users")}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isValid}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2",
                            isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                        )}
                    >
                        <Check size={16} /> Save User
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-8 py-8 space-y-6 max-w-5xl mx-auto w-full">
                {/* 1. Identity */}
                <FormSection number={1} title="Identity" subtitle="Basic profile information." icon={<UserIcon size={14} className="text-blue-600" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="First Name" required>
                            <TextInput value={firstName} onChange={setFirstName} placeholder="Jane" />
                        </FormField>
                        <FormField label="Last Name" required>
                            <TextInput value={lastName} onChange={setLastName} placeholder="Smith" />
                        </FormField>
                        <FormField label="Email" required>
                            <TextInput value={email} onChange={setEmail} type="email" placeholder="jane.smith@company.com" />
                        </FormField>
                        <FormField label="Phone" optional>
                            <TextInput value={phone} onChange={setPhone} placeholder="(555) 555-0100" />
                        </FormField>
                        <FormField label="Job Title" required className="md:col-span-2">
                            <TextInput value={title} onChange={setTitle} placeholder="e.g. Dispatcher" />
                        </FormField>
                    </div>
                </FormSection>

                {/* 2. Role & Carrier */}
                <FormSection number={2} title="Role & Carrier Access" subtitle="What this user is allowed to do, and where." icon={<Building2 size={14} className="text-blue-600" />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="Role" required>
                            <SelectInput value={role} onChange={(v) => setRole(v as UserRole)}>
                                {grantableRoles.map((r) => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                ))}
                            </SelectInput>
                            <p className="text-xs text-slate-500 mt-1.5">
                                {role === "super-admin" && "Full access to all carriers and platform settings."}
                                {role === "admin" && "Full control over the carriers they manage."}
                                {role === "user" && "Operational access scoped to a single carrier."}
                            </p>
                        </FormField>

                        {role === "super-admin" ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
                                <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                                    <Lock size={15} />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">Platform-wide access</div>
                                    <div className="text-xs text-slate-600">Super admins are not scoped to any single carrier.</div>
                                </div>
                            </div>
                        ) : (
                            <FormField label="Carrier" required>
                                <SelectInput value={accountId} onChange={setAccountId}>
                                    <option value="">Select a carrier…</option>
                                    {availableCarriers.map((a) => (
                                        <option key={a.id} value={a.id}>{a.legalName}</option>
                                    ))}
                                </SelectInput>
                                <p className="text-xs text-slate-500 mt-1.5">
                                    {isSuperAdmin
                                        ? `${availableCarriers.length} carrier${availableCarriers.length === 1 ? "" : "s"} available platform-wide.`
                                        : availableCarriers.length > 1
                                            ? `You manage ${availableCarriers.length} carriers — pick one.`
                                            : "Limited to your managed carrier."}
                                </p>
                            </FormField>
                        )}
                    </div>
                </FormSection>

                {/* 3. Invite */}
                <FormSection number={3} title="Invitation" subtitle="How the new user will be onboarded.">
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-white cursor-pointer">
                        <input
                            type="checkbox"
                            checked={sendInvite}
                            onChange={(e) => setSendInvite(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                            <div className="text-sm font-semibold text-slate-900">Send invitation email</div>
                            <div className="text-xs text-slate-500">
                                The user will receive an email at <span className="font-medium">{email || "their address"}</span> with a link to set their password.
                            </div>
                        </div>
                    </label>
                </FormSection>

                {error && (
                    <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        {error}
                    </div>
                )}
            </main>
        </div>
    );
}

// ── Form primitives (consistent with AddVendorPage / AddInventoryItemPage) ──

function FormSection({
    number, title, subtitle, children, icon,
}: { number: number; title: string; subtitle?: string; children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {number}
                </div>
                <div className="flex items-center gap-2">
                    {icon && <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">{icon}</span>}
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                </div>
            </div>
            <div className="pl-11">{children}</div>
        </section>
    );
}

function FormField({
    label, required, optional, className, children,
}: { label: string; required?: boolean; optional?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {optional && <span className="text-slate-400 font-normal ml-1">(Optional)</span>}
            </label>
            {children}
        </div>
    );
}

function TextInput({
    value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        />
    );
}

function SelectInput({
    value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        >
            {children}
        </select>
    );
}
