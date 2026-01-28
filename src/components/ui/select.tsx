import * as React from "react"
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
}

const SelectContext = React.createContext<SelectContextType>({
    open: false,
    setOpen: () => { },
    value: "",
    onValueChange: () => { },
    labelMap: {},
    registerLabel: () => { }
})

interface SelectProps {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
}

const Select: React.FC<SelectProps> = ({ children, value = "", onValueChange }) => {
    const [open, setOpen] = React.useState(false)
    const [labelMap, setLabelMap] = React.useState<Record<string, string>>({})

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
            registerLabel
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
    const { open, setOpen } = React.useContext(SelectContext)

    return (
        <button
            ref={ref}
            type="button"
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
    const display = labelMap[value] || placeholder || "Select..."

    return (
        <span className={cn("block truncate", !value && "text-slate-500")}>
            {display}
        </span>
    )
}

const SelectContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)

    if (!open) return null

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
                ref={ref}
                className={cn(
                    "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 text-slate-950 shadow-md",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        </>
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
