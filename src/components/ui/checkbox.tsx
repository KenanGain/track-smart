import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
    disabled?: boolean
    className?: string
    id?: string
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
    ({ checked = false, onCheckedChange, disabled, className, id }, ref) => (
        <button
            ref={ref}
            id={id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange?.(!checked)}
            className={cn(
                "peer flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-slate-300 ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "border-blue-600 bg-blue-600 text-white" : "bg-white",
                className
            )}
        >
            {checked && <Check className="h-3.5 w-3.5" />}
        </button>
    )
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
