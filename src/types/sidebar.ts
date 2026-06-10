import type { LucideIcon } from "lucide-react";

export type SidebarItem = {
    key: string;
    label: string;
    icon?: LucideIcon;
    path?: string; // leaf nodes use path
    disabled?: boolean; // shown greyed-out and non-clickable
    badge?: string; // small red "New"-style tag shown after the label
};

export type SidebarGroup = {
    key: string;
    label: string;
    icon?: LucideIcon;
    defaultOpen?: boolean;
    disabled?: boolean; // shown greyed-out and non-expandable
    badge?: string; // small red "New"-style tag shown after the label
    children: SidebarNode[]; // may contain leaves OR nested groups (one extra level of dropdown)
};

export type SidebarNode = SidebarItem | SidebarGroup;

export const isGroup = (n: SidebarNode): n is SidebarGroup =>
    (n as SidebarGroup).children !== undefined;
