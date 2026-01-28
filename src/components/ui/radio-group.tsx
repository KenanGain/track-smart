import * as React from "react"
import { cn } from "@/lib/utils"

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    onValueChange?: (value: string) => void
}

const RadioGroupContext = React.createContext<{
    value: string
    onValueChange: (value: string) => void
}>({
    value: "",
    onValueChange: () => { },
})

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
    ({ className, value = "", onValueChange = () => { }, ...props }, ref) => {
        return (
            <RadioGroupContext.Provider value={{ value, onValueChange }}>
                <div
                    ref={ref}
                    role="radiogroup"
                    className={cn("grid gap-2", className)}
                    {...props}
                />
            </RadioGroupContext.Provider>
        )
    }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
    ({ className, value: itemValue, children, ...props }, ref) => {
        const { value, onValueChange } = React.useContext(RadioGroupContext)
        const isChecked = value === itemValue

        return (
            <label className="flex items-center gap-2 cursor-pointer">
                <button
                    type="button"
                    role="radio"
                    aria-checked={isChecked}
                    onClick={() => onValueChange(itemValue)}
                    className={cn(
                        "aspect-square h-4 w-4 rounded-full border border-slate-900 text-slate-900 ring-offset-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        className
                    )}
                >
                    {isChecked && (
                        <div className="flex items-center justify-center">
                            <div className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                        </div>
                    )}
                </button>
                <input
                    ref={ref}
                    type="radio"
                    value={itemValue}
                    checked={isChecked}
                    onChange={() => onValueChange(itemValue)}
                    className="sr-only"
                    {...props}
                />
                {children && <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{children}</span>}
            </label>
        )
    }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
