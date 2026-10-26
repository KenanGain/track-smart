import {
    LayoutDashboard,
    ClipboardCheck,
    ScanSearch,
    Building2,
    Briefcase,
    CheckSquare,
    AlertTriangle,
    FileText,
    Settings,
    Wrench,
    DollarSign,
    Ban,
    Activity,
    GraduationCap,
    Ticket,
    Clock3,
    Fuel,
    ShieldCheck,
    Sliders,
    Users,
    ListChecks,
    Store,
    Boxes,
    UserCog,
    ShieldAlert,
    History,
    FlaskConical,
    FileSignature,
    Crown,
    Gauge,
    BellRing,
    Truck,
    Layers,
    Tags,
    Workflow,
    UserPlus,
    Smartphone,
    MessageSquare,
    Video,
} from "lucide-react";

import type { SidebarNode } from "@/types/sidebar";

export const SIDEBAR_NODES: SidebarNode[] = [
    {
        key: "dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        path: "/dashboard",
    },
    {
        key: "messages",
        label: "Messages",
        icon: MessageSquare,
        path: "/messages",
    },
    {
        key: "account",
        label: "Account",
        icon: Building2,
        path: "/account/profile",
    },
    {
        key: "inventory",
        label: "Inventory",
        icon: Boxes,
        path: "/inventory",
    },

    {
        key: "dq-files-menu",
        label: "DQ Files",
        icon: ListChecks,
        path: "/dq-files",
    },
    {
        key: "default-compliance-documents",
        label: "Compliances & Documents",
        icon: Layers,
        path: "/default-compliance-documents",
    },
    {
        key: "default-compliance-monitoring",
        label: "Compliance Monitoring",
        icon: BellRing,
        path: "/default-compliance-monitoring",
    },
    {
        key: "fleet-maintenance",
        label: "Maintenance",
        icon: Wrench,
        path: "/maintenance",
    },
    {
        // The shops and suppliers the carrier buys from — inventory and maintenance both
        // use them, so they have a menu of their own rather than living under either.
        key: "vendors",
        label: "Vendors",
        icon: Store,
        path: "/vendors",
    },
    {
        // The driver's own way in. Sits above the app itself because a driver with no
        // carrier has nothing to look at in there until they have applied to one.
        key: "apply-carrier",
        label: "Apply for Carrier",
        icon: Briefcase,
        path: "/apply-carrier",
        badge: "New",
    },
    {
        key: "hiring-process",
        label: "Application Tracking System",
        icon: Workflow,
        children: [
            { key: "hiring-process-applications", label: "Applications", icon: Briefcase, path: "/hiring-process/applications", badge: "New" },
            { key: "hiring-process-hiring", label: "Hiring", icon: Users, path: "/hiring-process/hiring", badge: "New" },
            { key: "hiring-process-onboarding", label: "Onboarding", icon: UserPlus, path: "/hiring-process/onboarding", badge: "New" },
        ],
    },
    {
        key: "hours-of-service",
        label: "Hours of Service",
        icon: Clock3,
        path: "/hours-of-service",
    },
    {
        key: "fuel",
        label: "Fuel",
        icon: Fuel,
        path: "/fuel",
    },

    {
        key: "inspections",
        label: "Safety and Compliance",
        icon: ClipboardCheck,
        path: "/inspections",
    },
    {
        key: "roadside-inspections",
        label: "Roadside Inspection",
        icon: ScanSearch,
        path: "/roadside-inspections",
        badge: "New",
    },
    {
        key: "top-violations",
        label: "Violations",
        icon: Ban,
        path: "/violations",
    },
    {
        key: "default-accidents",
        label: "Accidents",
        icon: ShieldAlert,
        path: "/default-accidents",
    },
    {
        key: "tickets",
        label: "Tickets",
        icon: Ticket,
        path: "/tickets",
    },
    {
        key: "safety-analysis-beta",
        label: "Beta Safety Analysis",
        icon: FlaskConical,
        path: "/safety-analysis/beta",
    },
    {
        key: "safety-events",
        label: "Safety Events",
        icon: Activity,
        path: "/safety-events",
    },
    {
        key: "safety-event",
        label: "Safety Event",
        icon: ShieldAlert,
        children: [
            { key: "safety-event-hos", label: "Hours of Service", icon: Clock3, path: "/safety-event/hours-of-service-violations" },
            { key: "safety-event-telematics", label: "Telematics & Video", icon: Video, path: "/safety-event/telematics-video" },
        ],
    },
    {
        key: "settings",
        label: "Settings",
        icon: Settings,
        children: [
            { key: "general-settings", label: "General Settings", icon: Sliders, path: "/settings/general" },
            { key: "settings-users-roles", label: "Users & Roles", icon: UserCog, path: "/settings/users-roles", badge: "New" },
            { key: "settings-default-compliance-monitoring", label: "Monitoring & Notifications", icon: BellRing, path: "/settings/default-compliance-monitoring", badge: "New" },
            { key: "settings-new-compliance-documents", label: "Compliance & Documents", icon: Layers, path: "/settings/new-compliance-documents", badge: "New" },
            { key: "settings-tags", label: "Tags", icon: Tags, path: "/settings/tags", badge: "New" },
            { key: "settings-chat-tags", label: "Chat Tags", icon: MessageSquare, path: "/settings/chat-tags", badge: "New" },
            { key: "maintenance", label: "Maintenance", icon: Wrench, path: "/settings/maintenance" },
            {
                key: "settings-hiring-process",
                label: "Application Tracking System Setup",
                icon: Workflow,
                badge: "New",
                children: [
                    { key: "settings-hiring-process-applications", label: "Application Form", icon: FileText, path: "/settings/hiring-process/applications", badge: "New" },
                    { key: "settings-hiring-process-hiring", label: "Workflows", icon: Workflow, path: "/settings/hiring-process/hiring", badge: "New" },
                    { key: "settings-hiring-process-onboarding", label: "Onboarding Setup", icon: UserPlus, path: "/settings/hiring-process/onboarding", badge: "New" },
                    { key: "settings-hiring-process-testing-forms", label: "Testing Forms", icon: FlaskConical, path: "/settings/hiring-process/testing-forms", badge: "New" },
                ],
            },
            { key: "settings-dq-files", label: "DQ Files", icon: ListChecks, path: "/settings/dq-files" },
            { key: "settings-tasks", label: "Tasks", icon: CheckSquare, path: "/settings/tasks" },
            { key: "expenses", label: "Expense Types", icon: DollarSign, path: "/settings/expenses" },
            { key: "violations", label: "Violations", icon: Ban, path: "/settings/violations" },
            { key: "accidents-settings", label: "Accidents", icon: AlertTriangle, path: "/settings/accidents" },
            { key: "trainings", label: "Trainings", icon: GraduationCap, path: "/settings/trainings" },
            { key: "inspections-settings", label: "Inspections", icon: ClipboardCheck, path: "/settings/inspections" },
            { key: "safety-settings", label: "Safety", icon: ShieldCheck, path: "/settings/safety" },
            { key: "settings-safety-events", label: "Safety Events", icon: Activity, path: "/settings/safety-events", badge: "New" },
            { key: "settings-integrations", label: "Integrations", icon: Workflow, path: "/settings/integrations", badge: "New" },
        ],
    },
    {
        key: "service-profile",
        label: "Service Profile",
        icon: Briefcase,
        children: [
            { key: "service-profile-profile", label: "Profile", icon: Briefcase, path: "/service-profile" },
            // The many-carrier level: every carrier profile under it, who works on them, who is told.
            { key: "accounts", label: "Accounts", icon: Users, path: "/accounts" },
            { key: "service-profile-users-roles", label: "Users & Roles", icon: UserCog, path: "/service-profile/users-roles", badge: "New" },
            { key: "service-profile-monitoring-notifications", label: "Monitoring & Notifications", icon: BellRing, path: "/service-profile/monitoring-notifications", badge: "New" },
            { key: "service-profile-compliance", label: "Compliance Setup", icon: ShieldCheck, path: "/service-profile/compliance-setup" },
            { key: "service-profile-audit-log", label: "Audit Log", icon: History, path: "/service-profile/audit-log", badge: "New" },
        ],
    },
    {
        key: "admin",
        label: "Admin",
        icon: UserCog,
        // One carrier — the one picked in the top bar. Its team, who gets its alerts, its
        // compliance configuration, its log. The same two pages sit under Settings.
        children: [
            { key: "admin-users", label: "Users & Roles", icon: UserCog, path: "/admin/users", badge: "New" },
            { key: "admin-monitoring-notifications", label: "Monitoring & Notifications", icon: BellRing, path: "/admin/monitoring-notifications", badge: "New" },
            { key: "admin-compliance-setup", label: "Carrier Profile Configuration", icon: ShieldCheck, path: "/admin/carrier-compliance-setup" },
            { key: "admin-audit-log", label: "Audit Log", icon: History, path: "/admin/audit-log", badge: "New" },
        ],
    },
    {
        key: "super-admin",
        label: "Super Admin",
        icon: Crown,
        children: [
            // ── Overview ──
            { key: "super-admin-dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
            // ── Form & pipeline authoring (built on top of the catalog) ──
            { key: "super-admin-docu-form", label: "Docu/Form Generator", icon: FileSignature, path: "/admin/docu-form" },
            // ── Hierarchy configuration (Super Admin defines, then cascades down) ──
            { key: "super-admin-service-profile-compliance", label: "Service Profile Configuration", icon: Building2, path: "/admin/service-profile-compliance" },
            { key: "super-admin-carrier-profile-config", label: "Carrier Profile Configuration", icon: Truck, path: "/admin/carrier-profile-configuration" },
            // ── The six roles themselves: which menus each gets, and a login per access shape ──
            { key: "admin-roles", label: "Roles & Access", icon: ShieldAlert, path: "/admin/roles" },
            { key: "super-admin-audit-log", label: "Audit Log", icon: History, path: "/admin/platform-audit-log", badge: "New" },
        ],
    },
    {
        key: "driver-mobile-app",
        label: "Driver Mobile App",
        icon: Smartphone,
        path: "/driver-mobile-app",
    },

    // ── Superseded / disabled items (grouped at the bottom) ──
    // Old "Hiring" dropdown — superseded by "Hiring Process".
    {
        key: "hiring",
        label: "Hiring",
        icon: Briefcase,
        disabled: true,
        children: [
            { key: "ats-main", label: "Applications", icon: Briefcase, path: "/ats-main" },
            { key: "ats", label: "Hiring (ATS)", icon: Users, path: "/ats" },
            { key: "dq-files", label: "Driver Qualification Files", icon: ListChecks, path: "/dq-files" },
        ],
    },
    // Superseded by Settings ▸ Compliance & Documents.
    {
        key: "compliance-setup",
        label: "Compliance and Documents (old)",
        icon: ShieldCheck,
        path: "/settings/compliance-setup",
        disabled: true,
    },
    {
        key: "settings-compliance-and-documents",
        label: "Compliance Setup (old)",
        icon: FileText,
        path: "/settings/compliance-and-documents",
        disabled: true,
    },
    // Superseded by "Default Compliances & Documents".
    {
        key: "new-compliance",
        label: "New Compliance & Documents",
        icon: FileText,
        path: "/new-compliance",
        disabled: true,
    },
    // Superseded by "Default Compliance Monitoring".
    {
        key: "compliance-monitoring",
        label: "Compliance Monitoring (old)",
        icon: Gauge,
        path: "/compliance-monitoring",
        disabled: true,
    },
    // Superseded by "Default Accidents".
    {
        key: "accidents",
        label: "Accidents (old)",
        icon: AlertTriangle,
        path: "/accidents",
        disabled: true,
    },
];
