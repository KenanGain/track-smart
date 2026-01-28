import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, Search } from "lucide-react"

interface ComboboxProps {
    options: Array<{ value: string; label: string; description?: string }>
    value?: string
    onValueChange?: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    className?: string
}

const Combobox = React.forwardRef<HTMLDivElement, ComboboxProps>(
    ({ options, value, onValueChange, placeholder = "Select...", searchPlaceholder = "Search...", className }, ref) => {
        const [open, setOpen] = React.useState(false)
        const [search, setSearch] = React.useState("")

        const filteredOptions = options.filter(option =>
            option.label.toLowerCase().includes(search.toLowerCase()) ||
            option.description?.toLowerCase().includes(search.toLowerCase())
        )

        const selectedOption = options.find(opt => opt.value === value)

        return (
            <div ref={ref} className={cn("relative", className)}>
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className={cn(
                        "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                >
                    <span className={selectedOption ? "" : "text-slate-500"}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </button>

                {open && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpen(false)}
                        />
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
                            <div className="p-2 border-b border-slate-200">
                                <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md">
                                    <Search className="h-4 w-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder={searchPlaceholder}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="flex-1 text-sm outline-none placeholder:text-slate-500"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-1">
                                {filteredOptions.length === 0 ? (
                                    <div className="py-6 text-center text-sm text-slate-500">
                                        No results found.
                                    </div>
                                ) : (
                                    filteredOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onValueChange?.(option.value)
                                                setOpen(false)
                                                setSearch("")
                                            }}
                                            className={cn(
                                                "w-full flex items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-100",
                                                value === option.value && "bg-slate-100"
                                            )}
                                        >
                                            <Check
                                                className={cn(
                                                    "mt-0.5 h-4 w-4 shrink-0",
                                                    value === option.value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{option.label}</div>
                                                {option.description && (
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {option.description}
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )
    }
)
Combobox.displayName = "Combobox"

export { Combobox }
