import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
    ({ className, checked = false, onCheckedChange, ...props }, ref) => {
        const handleClick = () => {
            onCheckedChange?.(!checked)
        }

        return (
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={handleClick}
                className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-blue-600" : "bg-slate-200",
                    className
                )}
                ref={ref}
                {...props}
            >
                <span
                    className={cn(
                        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
                        checked ? "translate-x-6" : "translate-x-0.5"
                    )}
                />
            </button>
        )
    }
)
Toggle.displayName = "Toggle"

export { Toggle }
