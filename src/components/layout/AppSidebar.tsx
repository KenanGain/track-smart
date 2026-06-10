import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_NODES } from "@/data/sidebar.data";
import { isGroup, type SidebarNode, type SidebarGroup, type SidebarItem } from "@/types/sidebar";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type UserRole = "user" | "admin" | "super-admin";

const ADMIN_ONLY_KEYS = new Set(["admin"]);

type AppSidebarProps = {
    currentPath: string;
    onNavigate: (path: string) => void;
    role: UserRole;
    className?: string;
};

export function AppSidebar({ currentPath, onNavigate, role, className }: AppSidebarProps) {
    const visibleNodes = React.useMemo(() => {
        const isAdmin = role === "admin" || role === "super-admin";
        return SIDEBAR_NODES.filter((n) => (ADMIN_ONLY_KEYS.has(n.key) ? isAdmin : true));
    }, [role]);

    const [isCollapsed, setIsCollapsed] = React.useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar_collapsed');
            return saved === 'true';
        }
        return false;
    });

    // Drag-to-resize width (expanded only), persisted across sessions.
    const MIN_W = 220;
    const MAX_W = 480;
    const [width, setWidth] = React.useState(() => {
        if (typeof window !== 'undefined') {
            const saved = Number(localStorage.getItem('sidebar_width'));
            if (saved >= MIN_W && saved <= MAX_W) return saved;
        }
        return 260;
    });
    const [isResizing, setIsResizing] = React.useState(false);

    React.useEffect(() => { localStorage.setItem('sidebar_width', String(width)); }, [width]);

    React.useEffect(() => {
        if (!isResizing) return;
        const onMove = (e: MouseEvent) => setWidth(Math.min(MAX_W, Math.max(MIN_W, e.clientX)));
        const onUp = () => setIsResizing(false);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isResizing]);

    const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        for (const n of SIDEBAR_NODES) {
            if (isGroup(n)) initial[n.key] = !!n.defaultOpen;
        }
        return initial;
    });

    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar_collapsed', String(newState));
    };

    const toggleGroup = (key: string) => {
        if (isCollapsed) return; // Don't toggle groups in collapsed mode
        setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <aside
            style={{ width: isCollapsed ? 70 : width }}
            className={cn(
                "h-screen border-r border-slate-200 bg-white flex flex-col ease-in-out relative z-50",
                // Animate width only when collapsing/expanding — not while dragging.
                isResizing ? "" : "transition-all duration-300",
                className
            )}
        >
            <div className={cn(
                "h-16 flex items-center border-b border-slate-200 transition-all px-4",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                <h2 className={cn(
                    "font-semibold text-slate-900 tracking-tight whitespace-nowrap overflow-hidden transition-all ease-in-out",
                    isCollapsed ? "w-0 opacity-0 duration-300" : "w-auto opacity-100 duration-500 delay-100 text-lg"
                )}>
                    TrackSmart
                </h2>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleCollapse}
                    className="h-8 w-8 text-slate-500 hover:text-slate-900 shrink-0"
                >
                    {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className={cn("py-4", isCollapsed ? "px-2" : "px-3")}>
                    <nav className="space-y-1">
                        {visibleNodes.map((node) => (
                            <SidebarNodeView
                                key={node.key}
                                node={node}
                                currentPath={currentPath}
                                openGroups={openGroups}
                                onToggleGroup={toggleGroup}
                                onNavigate={onNavigate}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </nav>
                </div>
            </ScrollArea>

            {/* Drag handle to resize the sidebar (double-click to reset) */}
            {!isCollapsed && (
                <div
                    role="separator"
                    aria-orientation="vertical"
                    title="Drag to resize · double-click to reset"
                    onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
                    onDoubleClick={() => setWidth(260)}
                    className={cn(
                        "absolute right-0 top-0 h-full w-1.5 -mr-0.5 cursor-col-resize group/resize",
                        "hover:bg-blue-200/60 transition-colors",
                        isResizing && "bg-blue-300/70",
                    )}
                >
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-full bg-slate-200 group-hover/resize:bg-blue-400 transition-colors" />
                </div>
            )}
        </aside>
    );
}

// --- NODE VIEW COMPONENT ---
function SidebarNodeView(props: {
    node: SidebarNode;
    currentPath: string;
    onNavigate: (path: string) => void;
    openGroups: Record<string, boolean>;
    onToggleGroup: (key: string) => void;
    isCollapsed: boolean;
}) {
    const { node, currentPath, onNavigate, openGroups, onToggleGroup, isCollapsed } = props;
    const open = isGroup(node) ? !!openGroups[node.key] : undefined;
    const onToggle = isGroup(node) ? () => onToggleGroup(node.key) : undefined;
    const [isHovered, setIsHovered] = React.useState(false);
    const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
    const triggerRef = React.useRef<HTMLDivElement>(null);

    // Handlers for interaction delay
    const handleMouseEnter = React.useCallback(() => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
    }, []);

    const handleMouseLeave = React.useCallback(() => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 140); // short grace — the transparent bridge keeps travel stable
    }, []);

    // Determine active state
    let isActiveNode = false;
    let isChildActive = false;

    if (isGroup(node)) {
         isChildActive = node.children.some((c) =>
            isGroup(c)
                ? c.children.some((gc) => !isGroup(gc) && gc.path && isActive(currentPath, gc.path))
                : c.path && isActive(currentPath, c.path)
         );
    } else {
         isActiveNode = node.path ? isActive(currentPath, node.path) : false;
    }

    // --- UNIFIED VIEW ---
    // We always render the full structure to allow CSS transitions, hiding text when collapsed.
    
    const content = (
        <>
            {!isGroup(node) ? (
                <LeafItem
                    label={node.label}
                    Icon={node.icon}
                    active={isActiveNode}
                    onClick={() => node.path && onNavigate(node.path)}
                    isCollapsed={isCollapsed}
                    disabled={node.disabled}
                />
            ) : (
                <div className={cn("space-y-1 transition-all", open && isChildActive && !isCollapsed && "bg-slate-50/80 rounded-xl pb-1")}>
                    <Button
                        type="button"
                        variant="ghost"
                        disabled={node.disabled}
                        onClick={() => {
                            if (node.disabled) return; // Disabled group — not selectable
                            if (isCollapsed) return; // Do nothing in collapsed mode (tooltip handles it)
                            if (onToggle) onToggle();
                        }}
                        className={cn(
                            "w-full justify-between rounded-lg px-3 py-2 h-auto hover:bg-slate-100 group/btn cursor-pointer outline-none focus:ring-2 focus:ring-blue-100",
                            isChildActive && !open ? "text-blue-700 bg-blue-50 font-semibold" : "text-slate-700 font-medium",
                            isChildActive && open && "text-blue-900 font-semibold",
                            isCollapsed && "justify-center px-2",
                            node.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                        )}
                    >
                         {/* Active Indicator for Group Parent (Collapsed or Closed) */}
                         {((isCollapsed && isChildActive) || (isChildActive && !open)) && (
                             <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-600 rounded-r-full shadow-sm" />
                         )}

                         <div className={cn(
                            "flex items-center overflow-hidden transition-all duration-300 ease-in-out",
                             isCollapsed ? "gap-0" : "gap-3"
                         )}>
                            {node.icon ? (
                                <node.icon className={cn(
                                    "h-[18px] w-[18px] shrink-0 transition-colors",
                                    (open && isChildActive) || isChildActive ? "text-blue-600" : "text-slate-400 group-hover/btn:text-slate-600"
                                )} />
                            ) : null}
                             <span className={cn(
                                "text-sm whitespace-nowrap overflow-hidden transition-all ease-in-out",
                                isCollapsed ? "w-0 opacity-0 duration-300" : "w-auto opacity-100 duration-500 delay-75"
                             )}>
                                {node.label}
                            </span>
                        </div>
                        
                         <ChevronDown
                            className={cn(
                                "h-4 w-4 transition-transform shrink-0 ml-2",
                                open ? "rotate-180 text-slate-500" : "rotate-0 text-slate-400",
                                isCollapsed ? "hidden" : "block"
                            )}
                        />
                    </Button>

                    {!isCollapsed && open && (
                        <div className="pl-0 space-y-0.5 relative">
                            {/* Indentation Line */}
                            <div className="absolute left-[21px] top-0 bottom-2 w-px bg-slate-200" />
                            
                            {node.children.map((child) => (
                                <div key={child.key} className="pl-9 pr-2">
                                    {isGroup(child) ? (
                                        <NestedGroup
                                            node={child}
                                            currentPath={currentPath}
                                            open={!!openGroups[child.key]}
                                            onToggle={() => onToggleGroup(child.key)}
                                            onNavigate={onNavigate}
                                        />
                                    ) : (
                                        <LeafItem
                                            label={child.label}
                                            active={child.path ? isActive(currentPath, child.path) : false}
                                            onClick={() => child.path && onNavigate(child.path)}
                                            isSubItem
                                            disabled={child.disabled}
                                            badge={child.badge}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </>
    );

    return (
        <>
            <div 
                ref={triggerRef}
                onMouseEnter={isCollapsed ? handleMouseEnter : undefined}
                onMouseLeave={isCollapsed ? handleMouseLeave : undefined}
                className={cn("relative", isCollapsed && "cursor-pointer")}
            >
                {content}
                
                {/* Portal Tooltip / Menu (Only in Collapsed Mode) */}
                {isCollapsed && isHovered && triggerRef.current && (
                     <SidebarTooltip
                        targetRef={triggerRef}
                        title={node.label}
                        isGroup={isGroup(node)}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        {isGroup(node) && (
                            <div className="py-1 min-w-[180px]">
                                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                                    {node.label}
                                </div>
                                {node.children.flatMap(child =>
                                    isGroup(child)
                                        ? [
                                            <div key={child.key} className="px-3 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                {child.label}
                                                {child.badge && (
                                                    <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
                                                        {child.badge}
                                                    </span>
                                                )}
                                            </div>,
                                            ...child.children.filter((g): g is SidebarItem => !isGroup(g)).map(sub => (
                                                <FlyoutItem key={sub.key} child={sub} currentPath={currentPath} onNavigate={onNavigate} />
                                            )),
                                          ]
                                        : [<FlyoutItem key={child.key} child={child} currentPath={currentPath} onNavigate={onNavigate} />]
                                )}
                            </div>
                        )}
                    </SidebarTooltip>
                )}
            </div>
        </>
    );
}

// --- NESTED GROUP (a dropdown nested inside a top-level group, expanded mode only) ---
function NestedGroup({ node, currentPath, open, onToggle, onNavigate }: {
    node: SidebarGroup;
    currentPath: string;
    open: boolean;
    onToggle: () => void;
    onNavigate: (path: string) => void;
}) {
    const childActive = node.children.some((c) => !isGroup(c) && c.path && isActive(currentPath, c.path));
    return (
        <div className="space-y-0.5">
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer",
                    childActive ? "text-blue-700 font-semibold bg-blue-50/50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                )}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {node.icon && (
                        <node.icon className={cn("h-[18px] w-[18px] shrink-0", childActive ? "text-blue-600" : "text-slate-400")} />
                    )}
                    <span className="truncate">{node.label}</span>
                    {node.badge && (
                        <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
                            {node.badge}
                        </span>
                    )}
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open ? "rotate-180 text-slate-500" : "text-slate-400")} />
            </button>
            {open && (
                <div className="relative space-y-0.5 pl-4">
                    <div className="absolute left-[7px] top-0 bottom-2 w-px bg-slate-200" />
                    {node.children.filter((c): c is SidebarItem => !isGroup(c)).map((c) => (
                        <div key={c.key} className="pl-3">
                            <LeafItem
                                label={c.label}
                                active={c.path ? isActive(currentPath, c.path) : false}
                                onClick={() => c.path && onNavigate(c.path)}
                                isSubItem
                                disabled={c.disabled}
                                badge={c.badge}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- COLLAPSED-MODE FLYOUT LEAF ---
function FlyoutItem({ child, currentPath, onNavigate }: { child: SidebarItem; currentPath: string; onNavigate: (path: string) => void }) {
    return (
        <button
            onClick={child.disabled ? undefined : () => child.path && onNavigate(child.path)}
            disabled={child.disabled}
            title={child.disabled ? "Coming soon" : undefined}
            className={cn(
                "w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm flex items-center gap-2 rounded-md transition-colors",
                child.disabled
                    ? "text-slate-300 cursor-not-allowed"
                    : isActive(currentPath, child.path || '')
                        ? "text-blue-700 font-semibold bg-blue-50"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
            )}
        >
            {child.icon && <child.icon size={14} className={cn("opacity-70", !child.disabled && isActive(currentPath, child.path || '') && "text-blue-600 opacity-100")} />}
            {child.label}
            {child.badge && (
                <span className="ml-auto shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
                    {child.badge}
                </span>
            )}
        </button>
    );
}

function LeafItem({ label, Icon, active, onClick, isSubItem, isCollapsed, disabled, badge }: { label: string; Icon?: React.ElementType; active: boolean; onClick: () => void; isSubItem?: boolean; isCollapsed?: boolean; disabled?: boolean; badge?: string }) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            aria-disabled={disabled}
            title={disabled ? "Coming soon" : undefined}
            className={cn(
                "relative flex items-center rounded-lg py-2 text-left transition-all duration-200 ease-in-out group/leaf outline-none focus:ring-2 focus:ring-blue-100",
                "w-full",
                isCollapsed ? "justify-center px-2 gap-0" : "px-3 gap-3",
                disabled
                    ? "text-slate-300 cursor-not-allowed"
                    : active
                        ? (isSubItem ? "text-blue-600 font-medium bg-blue-50/50 cursor-pointer" : "bg-blue-50 text-blue-700 font-semibold shadow-sm cursor-pointer")
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium cursor-pointer",
            )}
        >
            {/* Active Indicator (Left Bar) - Only for top-level items */}
            {active && !isSubItem && !disabled && (
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-600 rounded-r-full shadow-sm" />
            )}

            {Icon && (
                <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    disabled ? "text-slate-300" : active ? "text-blue-600" : "text-slate-400 group-hover/leaf:text-slate-600"
                )} />
            )}
            <span className={cn(
                "text-sm whitespace-nowrap overflow-hidden transition-all ease-in-out",
                isCollapsed ? "w-0 opacity-0 duration-300 hidden" : "opacity-100 duration-500 delay-75",
                // With a badge, let the label shrink/truncate so the tag stays visible.
                !isCollapsed && (badge ? "min-w-0 flex-1 text-ellipsis" : "w-auto")
            )}>
                {label}
            </span>
            {badge && !isCollapsed && (
                <span className="ml-1 shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white shadow-sm">
                    {badge}
                </span>
            )}
        </button>
    );
}

// --- PORTAL TOOLTIP COMPONENT ---
function SidebarTooltip({ 
    children, 
    title, 
    targetRef, 
    isGroup,
    onMouseEnter,
    onMouseLeave
}: { 
    children?: React.ReactNode; 
    title?: string; 
    targetRef: React.RefObject<HTMLElement | null>; 
    isGroup?: boolean;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}) {
    const [coords, setCoords] = React.useState({ top: 0, left: 0, height: 0 });

    React.useEffect(() => {
        if (targetRef.current) {
            const rect = targetRef.current.getBoundingClientRect();
            setCoords({
                 top: rect.top,
                 left: rect.right, // Flush with sidebar for maximum stability (no gap)
                 height: rect.height
            });
        }
    }, [targetRef]);

    if (typeof document === 'undefined') return null;

    return createPortal(
        // Outer wrapper keeps the hover alive and adds a small transparent bridge
        // (pl-2) so the cursor can travel from the collapsed rail into the popover
        // without it flickering closed.
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className="fixed z-[9999] pl-2"
            style={{
                // For Group: Align Top. For Leaf: Center Vertically.
                top: isGroup ? coords.top : coords.top + (coords.height / 2),
                left: coords.left,
                transform: isGroup ? 'translateY(-10px)' : 'translateY(-50%)',
            }}
        >
            <div className={cn(
                "animate-in fade-in slide-in-from-left-1 duration-100",
                isGroup && "bg-white border border-slate-200 rounded-lg shadow-xl",
            )}>
                {!isGroup && title && (
                    <div className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md shadow-lg whitespace-nowrap">
                        {title}
                    </div>
                )}
                {isGroup && children}
            </div>
        </div>,
        document.body
    );
}

// check active path helpers
function isActive(current: string, path: string) {
    if (path === '/') return current === '/';

    // The application detail (`/ats/application/:id`) and issue-hiring flow live
    // under `/ats/...` but belong to the "Applications" nav item (`/ats-main`),
    // not "Hiring (ATS)" (`/ats`). Route them explicitly so the right item lights up.
    const applicationsOwned = current.startsWith('/ats/application') || current === '/ats/issue-hiring';
    if (path === '/ats-main') return current === '/ats-main' || applicationsOwned;
    if (path === '/ats') {
        if (applicationsOwned) return false;
        return current === '/ats' || current.startsWith('/ats/');
    }

    return current.startsWith(path);
}
