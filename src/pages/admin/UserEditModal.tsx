import { useEffect, useMemo, useState } from "react";
import { X, Save, AlertCircle, User as UserIcon, Building2, Lock } from "lucide-react";
import {
    ROLE_LABELS,
    canCreateUserForAccount,
    getManagedAccountIds,
    type AppUser,
    type UserRole,
} from "@/data/users.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { CarrierAccessPicker } from "./CarrierAccessPicker";
import { cn } from "@/lib/utils";

type Props = {
    user: AppUser | null;
    currentUser: AppUser;
    onClose: () => void;
    onSave: (next: AppUser) => void;
};

export function UserEditModal({ user, currentUser, onClose, onSave }: Props) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [title, setTitle] = useState("");
    const [role, setRole] = useState<UserRole>("user");
    const [managedIds, setManagedIds] = useState<string[]>([]);
    const [applyToAllCarriers, setApplyToAllCarriers] = useState(false);
    const [status, setStatus] = useState<"Active" | "Inactive">("Active");
    const [error, setError] = useState<string | null>(null);

    const isSuperAdmin = currentUser.role === "super-admin";
    const managed = useMemo(() => getManagedAccountIds(currentUser), [currentUser]);

    const availableCarriers = useMemo(() => {
        if (!managed) return ACCOUNTS_DB;
        return ACCOUNTS_DB.filter((a) => managed.includes(a.id));
    }, [managed]);

    const grantableRoles: UserRole[] = isSuperAdmin
        ? ["super-admin", "admin", "user"]
        : ["admin", "user"];

    // Reset state on open
    useEffect(() => {
        if (!user) return;
        setName(user.name);
        setEmail(user.email);
        setTitle(user.title);
        setRole(user.role);
        // Pre-fill multi-carrier picker (works for both admin and user roles)
        const initialManaged = user.managedAccountIds && user.managedAccountIds.length > 0
            ? user.managedAccountIds
            : (user.accountId ? [user.accountId] : []);
        setManagedIds(initialManaged);
        setApplyToAllCarriers(false);
        setStatus(user.status);
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [user, onClose]);

    if (!user) return null;

    const resolvedCarrierIds = applyToAllCarriers
        ? availableCarriers.map((a) => a.id)
        : managedIds;

    const isValid =
        name.trim().length > 0 &&
        /^\S+@\S+\.\S+$/.test(email) &&
        title.trim().length > 0 &&
        (role === "super-admin" || resolvedCarrierIds.length > 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            setError("Please complete all required fields with a valid email.");
            return;
        }
        if (role !== "super-admin") {
            const allowed = resolvedCarrierIds.every((id) => canCreateUserForAccount(currentUser, id));
            if (!allowed) {
                setError("You don't have permission to grant access to one of the selected carriers.");
                return;
            }
        }

        const initials = name.trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]!.toUpperCase())
            .join("");

        const primaryAccountId = role === "super-admin" ? undefined : resolvedCarrierIds[0];
        const primaryCarrier = primaryAccountId ? ACCOUNTS_DB.find((a) => a.id === primaryAccountId) : undefined;

        const next: AppUser = {
            ...user,
            name: name.trim(),
            email: email.trim(),
            title: title.trim(),
            role,
            accountId: primaryAccountId,
            accountName: primaryCarrier?.legalName,
            managedAccountIds: role === "super-admin" ? undefined : resolvedCarrierIds,
            status,
            initials: initials || user.initials,
        };
        onSave(next);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Edit User</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                        {/* Identity */}
                        <Section title="Identity" icon={<UserIcon size={14} className="text-blue-600" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Full Name" required>
                                    <TextInput value={name} onChange={setName} placeholder="Jane Smith" />
                                </Field>
                                <Field label="Email" required>
                                    <TextInput value={email} onChange={setEmail} type="email" placeholder="jane@company.com" />
                                </Field>
                                <Field label="Job Title" required className="md:col-span-2">
                                    <TextInput value={title} onChange={setTitle} placeholder="e.g. Dispatcher" />
                                </Field>
                            </div>
                        </Section>

                        {/* Role + Carrier */}
                        <Section title="Role & Carrier" icon={<Building2 size={14} className="text-blue-600" />}>
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Role" required>
                                        <SelectInput value={role} onChange={(v) => setRole(v as UserRole)}>
                                            {grantableRoles.map((r) => (
                                                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                            ))}
                                        </SelectInput>
                                    </Field>

                                    {role === "super-admin" && (
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
                                            <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                                                <Lock size={15} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">Platform-wide access</div>
                                                <div className="text-xs text-slate-600">Super admins are not scoped to a single carrier.</div>
                                            </div>
                                        </div>
                                    )}

                                    <Field label="Status">
                                        <SelectInput value={status} onChange={(v) => setStatus(v as "Active" | "Inactive")}>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </SelectInput>
                                    </Field>
                                </div>

                                {(role === "admin" || role === "user") && (
                                    <div className="border-t border-slate-100 pt-5">
                                        <div className="mb-3">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Carrier Access <span className="text-red-500">*</span>
                                            </label>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {role === "admin"
                                                    ? "Select one or more carriers this admin will manage."
                                                    : "Select one or more carriers this user can access."}
                                            </p>
                                        </div>
                                        <CarrierAccessPicker
                                            carriers={availableCarriers}
                                            selectedIds={managedIds}
                                            applyToAll={applyToAllCarriers}
                                            onChange={({ ids, applyToAll }) => {
                                                setManagedIds(ids);
                                                setApplyToAllCarriers(applyToAll);
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </Section>

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid}
                            className={cn(
                                "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2",
                                isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                            )}
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Section({
    title, icon, children,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                {icon && <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">{icon}</span>}
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            </div>
            {children}
        </section>
    );
}

function Field({
    label, required, className, children,
}: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
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
