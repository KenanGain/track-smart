import {
    LayoutDashboard,
    Building2,
    User,
    MapPin,
    CheckSquare,
    AlertTriangle,
    FileText,
    Truck,
    Shield,
    Settings,
    KeyRound,
    Wrench,
    Layers,
    Folder,
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
        defaultOpen: true,
        children: [
            { key: "profile", label: "Profile", icon: User, path: "/account/profile" },
            { key: "locations", label: "Locations", icon: MapPin, path: "/account/locations" },
            { key: "tasks", label: "Tasks", icon: CheckSquare, path: "/account/tasks" },
            { key: "alerts", label: "Alerts", icon: AlertTriangle, path: "/account/alerts" },
            { key: "documents", label: "Documents", icon: FileText, path: "/account/documents" },
        ],
    },
    {
        key: "assets",
        label: "Assets",
        icon: Truck,
        children: [
            { key: "asset-directory", label: "Asset Directory", icon: Folder, path: "/assets/directory" },
            { key: "asset-dashboard", label: "Asset Dashboard", icon: LayoutDashboard, path: "/assets/dashboard" },
        ],
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
            { key: "settings-alerts", label: "Alerts", icon: AlertTriangle, path: "/settings/alerts" }
        ],
    },
];
