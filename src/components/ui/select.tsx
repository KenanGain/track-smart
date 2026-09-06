import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

// Context to share state between Select components
type SelectContextType = {
    open: boolean
    setOpen: (open: boolean) => void
    value: string
    onValueChange: (value: string) => void
    labelMap: Record<string, string>
    registerLabel: (value: string, label: string) => void
    /** The trigger, so the list can be positioned against it from outside the tree. */
    triggerRef: React.MutableRefObject<HTMLButtonElement | null>
}

const SelectContext = React.createContext<SelectContextType>({
    open: false,
    setOpen: () => { },
    value: "",
    onValueChange: () => { },
    labelMap: {},
    registerLabel: () => { },
    triggerRef: { current: null }
})

interface SelectProps {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
}

const Select: React.FC<SelectProps> = ({ children, value = "", onValueChange }) => {
    const [open, setOpen] = React.useState(false)
    const [labelMap, setLabelMap] = React.useState<Record<string, string>>({})
    const triggerRef = React.useRef<HTMLButtonElement | null>(null)

    const registerLabel = React.useCallback((val: string, label: string) => {
        setLabelMap(prev => ({ ...prev, [val]: label }))
    }, [])

    return (
        <SelectContext.Provider value={{
            open,
            setOpen,
            value,
            onValueChange: onValueChange || (() => { }),
            labelMap,
            registerLabel,
            triggerRef
        }}>
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const { open, setOpen, triggerRef } = React.useContext(SelectContext)

    // Held in context as well as forwarded, so SelectContent can measure it.
    const setRefs = React.useCallback((node: HTMLButtonElement | null) => {
        triggerRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
    }, [ref, triggerRef])

    return (
        <button
            ref={setRefs}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => {
    const { value, labelMap } = React.useContext(SelectContext)
    // Fall back to the raw value so the current selection shows even before the
    // options have mounted (SelectContent only registers labels when opened).
    const display = labelMap[value] || value || placeholder || "Select..."

    return (
        <span className={cn("block truncate", !value && "text-slate-500")}>
            {display}
        </span>
    )
}

/** Roughly how tall the list gets (max-h-60), used to decide whether to drop up. */
const LIST_MAX_H = 240

/**
 * The option list, rendered into `document.body` and positioned against the trigger.
 *
 * It used to be `absolute` inside the trigger's wrapper, which meant any ancestor with
 * `overflow: hidden` cut it off — a card, a modal body, a scrolling pane. Being in a
 * portal, nothing in the tree above it can clip or stack over it; the cost is that its
 * position has to be maintained by hand, hence the re-measure on scroll and resize.
 */
const SelectContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { open, setOpen, triggerRef } = React.useContext(SelectContext)
    const [pos, setPos] = React.useState<{ left: number; top: number; width: number; up: boolean } | null>(null)

    React.useLayoutEffect(() => {
        if (!open) { setPos(null); return }
        const place = () => {
            const el = triggerRef.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const below = window.innerHeight - r.bottom
            // Drop upward only when there is genuinely more room above.
            const up = below < LIST_MAX_H && r.top > below
            setPos({ left: r.left, top: up ? r.top - 4 : r.bottom + 4, width: r.width, up })
        }
        place()
        // Positioned against the viewport, so anything that moves the trigger must move the
        // list too. Capture phase: the scroll may be in any pane between here and the root.
        window.addEventListener("scroll", place, true)
        window.addEventListener("resize", place)
        return () => {
            window.removeEventListener("scroll", place, true)
            window.removeEventListener("resize", place)
        }
    }, [open, triggerRef])

    React.useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
        document.addEventListener("keydown", onKey)
        return () => document.removeEventListener("keydown", onKey)
    }, [open, setOpen])

    if (!open || !pos || typeof document === "undefined") return null

    return createPortal(
        <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
                ref={ref}
                role="listbox"
                style={{ left: pos.left, top: pos.top, minWidth: pos.width }}
                className={cn(
                    "fixed z-[61] max-h-60 overflow-auto rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-lg",
                    pos.up && "-translate-y-full",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        </>,
        document.body
    )
})
SelectContent.displayName = "SelectContent"

const SelectItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, value: itemValue, ...props }, ref) => {
    const { value, onValueChange, setOpen, registerLabel } = React.useContext(SelectContext)

    // Register label on mount
    React.useEffect(() => {
        if (typeof children === 'string') {
            registerLabel(itemValue, children)
        }
    }, [registerLabel, itemValue, children])

    return (
        <div
            ref={ref}
            role="option"
            aria-selected={value === itemValue}
            onClick={() => {
                onValueChange(itemValue)
                setOpen(false)
            }}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-slate-100 focus:text-slate-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-slate-100 cursor-pointer",
                value === itemValue && "bg-slate-100",
                className
            )}
            {...props}
        >
            <span className={cn("absolute left-2 flex h-3.5 w-3.5 items-center justify-center")}>
                {value === itemValue && <Check className="h-4 w-4" />}
            </span>
            <span className="truncate">{children}</span>
        </div>
    )
})
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
