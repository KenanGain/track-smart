import { Construction } from "lucide-react";

type Props = {
    title: string;
};

/**
 * Empty placeholder for the new "Hiring Process" pages.
 * These are intentionally blank — the real screens are still being built.
 */
export function HiringProcessPlaceholder({ title }: Props) {
    return (
        <div className="flex h-full min-h-[70vh] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Construction className="h-8 w-8" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-2 max-w-md text-sm text-slate-500">
                This page is under construction. We&rsquo;re actively working on it — check back soon.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                Work in progress
            </span>
        </div>
    );
}
