import * as React from "react";
import { createPortal } from "react-dom";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_NODES } from "@/data/sidebar.data";
import { isGroup, type SidebarNode } from "@/types/sidebar";

// shadcn/ui
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type AppSidebarProps = {
    currentPath: string;
    onNavigate: (path: string) => void;
    className?: string;
};

export function AppSidebar({ currentPath, onNavigate, className }: AppSidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('sidebar_collapsed');
            return saved === 'true';
        }
        return false;
    });

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
            className={cn(
                "h-screen border-r border-slate-200 bg-white flex flex-col transition-all duration-300 ease-in-out relative z-50",
                isCollapsed ? "w-[70px]" : "w-[260px]",
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
                        {SIDEBAR_NODES.map((node) => (
                            <SidebarNodeView
                                key={node.key}
                                node={node}
                                currentPath={currentPath}
                                open={isGroup(node) ? !!openGroups[node.key] : undefined}
                                onToggle={isGroup(node) ? () => toggleGroup(node.key) : undefined}
                                onNavigate={onNavigate}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </nav>
                </div>
            </ScrollArea>
        </aside>
    );
}

// --- NODE VIEW COMPONENT ---
function SidebarNodeView(props: {
    node: SidebarNode;
    currentPath: string;
    onNavigate: (path: string) => void;
    open?: boolean;
    onToggle?: () => void;
    isCollapsed: boolean;
}) {
    const { node, currentPath, onNavigate, open, onToggle, isCollapsed } = props;
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
        }, 500); // 500ms grace period - very stable
    }, []);

    // Determine active state
    let isActiveNode = false;
    let isChildActive = false;

    if (isGroup(node)) {
         isChildActive = node.children.some((c) => c.path && isActive(currentPath, c.path));
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
                />
            ) : (
                <div className={cn("space-y-1 transition-all", open && isChildActive && !isCollapsed && "bg-slate-50/80 rounded-xl pb-1")}>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            if (isCollapsed) return; // Do nothing in collapsed mode (tooltip handles it)
                            if (onToggle) onToggle();
                        }}
                        className={cn(
                            "w-full justify-between rounded-lg px-3 py-2 h-auto hover:bg-slate-100 group/btn cursor-pointer outline-none focus:ring-2 focus:ring-blue-100",
                            isChildActive && !open ? "text-blue-700 bg-blue-50 font-semibold" : "text-slate-700 font-medium",
                            isChildActive && open && "text-blue-900 font-semibold",
                            isCollapsed && "justify-center px-2"
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
                                     <LeafItem
                                        label={child.label}
                                        active={child.path ? isActive(currentPath, child.path) : false}
                                        onClick={() => child.path && onNavigate(child.path)}
                                        isSubItem
                                    />
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
                                {node.children.map(child => (
                                    <button
                                        key={child.key}
                                        onClick={() => child.path && onNavigate(child.path)}
                                        className={cn(
                                            "w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-sm flex items-center gap-2 rounded-md transition-colors",
                                            isActive(currentPath, child.path || '') 
                                                ? "text-blue-700 font-semibold bg-blue-50" 
                                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium"
                                        )}
                                    >
                                        {child.icon && <child.icon size={14} className={cn("opacity-70", isActive(currentPath, child.path || '') && "text-blue-600 opacity-100")} />}
                                        {child.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </SidebarTooltip>
                )}
            </div>
        </>
    );
}

function LeafItem({ label, Icon, active, onClick, isSubItem, isCollapsed }: { label: string; Icon?: React.ElementType; active: boolean; onClick: () => void; isSubItem?: boolean; isCollapsed?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative flex items-center rounded-lg py-2 text-left transition-all duration-200 ease-in-out group/leaf cursor-pointer outline-none focus:ring-2 focus:ring-blue-100",
                "w-full", 
                isCollapsed ? "justify-center px-2 gap-0" : "px-3 gap-3",
                active 
                    ? (isSubItem ? "text-blue-600 font-medium bg-blue-50/50" : "bg-blue-50 text-blue-700 font-semibold shadow-sm") 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium",
            )}
        >
            {/* Active Indicator (Left Bar) - Only for top-level items */}
            {active && !isSubItem && (
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 bg-blue-600 rounded-r-full shadow-sm" />
            )}

            {Icon && (
                <Icon className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors", 
                    active ? "text-blue-600" : "text-slate-400 group-hover/leaf:text-slate-600"
                )} />
            )}
            <span className={cn(
                "text-sm whitespace-nowrap overflow-hidden transition-all ease-in-out",
                isCollapsed ? "w-0 opacity-0 duration-300 hidden" : "w-auto opacity-100 duration-500 delay-75"
            )}>
                {label}
            </span>
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
        <div 
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={cn(
                "fixed z-[9999] animate-in fade-in zoom-in-95 duration-100",
                isGroup && "bg-white border border-slate-200 rounded-lg shadow-xl"
            )}
            style={{ 
                // For Group: Align Top. For Leaf: Center Vertically.
                top: isGroup ? coords.top : coords.top + (coords.height / 2), 
                left: coords.left,
                transform: isGroup ? 'translateY(-10px)' : 'translateY(-50%)' 
            }}
        >
             {!isGroup && title && (
                 <div className="px-3 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md shadow-lg whitespace-nowrap">
                     {title}
                 </div>
             )}
             {isGroup && children}
        </div>,
        document.body
    );
}

// check active path helpers
function isActive(current: string, path: string) {
    if (path === '/') return current === '/';
    return current.startsWith(path);
}
