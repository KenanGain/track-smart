import {
    LayoutDashboard,
    Building2,
    CheckSquare,
    AlertTriangle,
    FileText,
    Shield,
    Settings,
    KeyRound,
    Wrench,
    Layers,
    Folder,
    DollarSign,
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
        key: "account",
        label: "Account",
        icon: Building2,
        path: "/account/profile",
    },

    {
        key: "compliance",
        label: "Compliance & Documents",
        icon: FileText,
        path: "/compliance",
    },
    {
        key: "fleet-maintenance",
        label: "Maintenance",
        icon: Wrench,
        path: "/maintenance",
    },
    {
        key: "safety",
        label: "Safety",
        icon: Shield,
        path: "/safety",
    },

    {
        key: "accidents",
        label: "Accidents",
        icon: AlertTriangle,
        path: "/accidents",
    },
    {
        key: "settings",
        label: "Settings",
        icon: Settings,
        defaultOpen: true,
        children: [
            { key: "key-numbers", label: "Key Numbers", icon: KeyRound, path: "/settings/key-numbers" },
            { key: "maintenance", label: "Maintenance", icon: Wrench, path: "/settings/maintenance" },
            { key: "settings-tasks", label: "Tasks", icon: CheckSquare, path: "/settings/tasks" },
            { key: "services", label: "Services", icon: Layers, path: "/settings/services" },
            { key: "document-types", label: "Document Types", icon: FileText, path: "/settings/document-types" },
            { key: "document-folders", label: "Document Folders", icon: Folder, path: "/settings/document-folders" },
            { key: "expenses", label: "Expense Types", icon: DollarSign, path: "/settings/expenses" },
            { key: "settings-alerts", label: "Alerts", icon: AlertTriangle, path: "/settings/alerts" }
        ],
    },
];
