import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
    key: string;
    label: string;
    icon?: LucideIcon;
    path?: string; // leaf nodes use path
};

export type SidebarGroup = {
    key: string;
    label: string;
    icon?: LucideIcon;
    defaultOpen?: boolean;
    children: SidebarItem[];
};

export type SidebarNode = SidebarItem | SidebarGroup;

export const isGroup = (n: SidebarNode): n is SidebarGroup =>
    (n as SidebarGroup).children !== undefined;
