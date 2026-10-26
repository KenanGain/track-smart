import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Shared KPI stat card — the "New / Default Compliance & Documents" tile look:
 * label + big number on the left, a rounded icon square on the right, on a clean
 * white bordered card. Optionally clickable (used as a status filter) with an
 * active ring, so a page can keep its filter-on-click behaviour while matching
 * the catalog page's visual style.
 *
 * It sizes itself from ITS OWN WIDTH, not the window's.
 *
 * That is the whole point of the container query below. These rows sit beside a 340px
 * sidebar, so a 1280px window leaves the cards about 940px to share — and a viewport
 * breakpoint cannot know that. `lg:grid-cols-6` fired at 1024px of WINDOW and gave six
 * cards 156px each: "MAINTENANCE" wrapped under its own icon square, "OUT OF SERVICE"
 * broke into three lines, and the numbers collided with the icons. Measured, not guessed.
 *
 * So below 240px of its own width the card drops the icon and tightens everything: the label
 * still reads in full on one line, the figure is still the biggest thing on it, and six of
 * them fit a narrow column without touching.
 *
 * 240, not 170, because the threshold has to clear the LONGEST label any of these rows
 * carries. An icon square plus its gap and the padding costs about 80px, so a 176px card
 * showing one had ~96px left and "OUT OF SERVICE" took two lines of it — one card in the row
 * grew to 92px and the rest stayed at 78, which is the ragged thing this was meant to stop.
 * Measured at 1440: the asset row sat at 176px and the compliance row at 197px, both wrapping.
 * One threshold for every row, so two screens side by side never disagree about it.
 */

type AccentTone = { icon: string; ring: string };

const ACCENT: Record<string, AccentTone> = {
    slate:   { icon: "text-slate-500 bg-slate-100",   ring: "ring-slate-400/40" },
    blue:    { icon: "text-blue-600 bg-blue-50",      ring: "ring-blue-500/40" },
    emerald: { icon: "text-emerald-600 bg-emerald-50", ring: "ring-emerald-500/40" },
    rose:    { icon: "text-rose-600 bg-rose-50",      ring: "ring-rose-500/40" },
    amber:   { icon: "text-amber-600 bg-amber-50",    ring: "ring-amber-500/40" },
    sky:     { icon: "text-sky-600 bg-sky-50",        ring: "ring-sky-500/40" },
    red:     { icon: "text-red-600 bg-red-50",        ring: "ring-red-500/40" },
    orange:  { icon: "text-orange-600 bg-orange-50",  ring: "ring-orange-500/40" },
    violet:  { icon: "text-violet-600 bg-violet-50",  ring: "ring-violet-500/40" },
};

export function KpiStatCard({
    label,
    value,
    Icon,
    accent = "slate",
    active,
    onClick,
    className,
}: {
    label: string;
    value: string | number;
    Icon: React.ElementType;
    accent?: string;
    /** When set, the card highlights with an accent ring (e.g. selected filter). */
    active?: boolean;
    /** When provided the card renders as a button (used as a status filter). */
    onClick?: () => void;
    className?: string;
}) {
    const t = ACCENT[accent] ?? ACCENT.slate;
    /*
     * The query reads the CELL this card sits in, not the card.
     *
     * A container query measures its own content box, and the padding below is one of the
     * things the query decides — so declaring the container here asked the card how wide
     * it is after subtracting an amount that depends on the answer. A 182px card measured
     * 162px of content, stayed under the threshold, and kept the compact layout it would
     * have grown out of. `KpiStatRow` puts the container on the grid cell, whose width
     * nothing inside can change. `@container//kpi` names it so a card dropped somewhere
     * without one simply keeps the compact look rather than inheriting a stranger's.
     */
    const cls = cn(
        "bg-white border rounded-xl shadow-sm flex items-center justify-between gap-2 text-left transition-all",
        "px-2.5 py-2 @[240px]:px-4 @[240px]:py-3.5 @[240px]:gap-3",
        onClick && "hover:shadow hover:border-slate-300",
        active ? cn("ring-2 border-transparent", t.ring) : "border-slate-200",
        className,
    );
    const body = (
        <>
            <div className="min-w-0">
                {/* Wraps rather than truncates where it must: truncating turned every long
                    label into "MAIN…". At this size it does not have to — the whole word
                    fits the line once the icon is out of the way. */}
                <div className="truncate text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 @[240px]:text-[11px] @[240px]:tracking-wider">{label}</div>
                <div className="mt-0.5 text-lg font-bold leading-tight text-slate-900 tabular-nums @[240px]:mt-1 @[240px]:text-2xl">{value}</div>
            </div>
            <div className={cn("hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg @[240px]:flex", t.icon)}>
                <Icon size={18} />
            </div>
        </>
    );
    return onClick ? (
        <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
            {body}
        </button>
    ) : (
        <div className={cls}>{body}</div>
    );
}

export interface KpiStat {
    /** What picking this card filters the list to. */
    id: string;
    label: string;
    value: string | number;
    Icon: React.ElementType;
    accent?: string;
}

/**
 * A row of them, laid out from the width of the ROW rather than of the window.
 *
 * Every list that carries these sits in a column whose width the window does not describe,
 * so the ladder is in container units: two across when there is nothing to work with, three
 * once there is, and all of them in one line only when that line is actually wide enough.
 * The card shrinks itself the rest of the way.
 *
 * `condensed` is the scrolled state: the figures give their height back and hand over to
 * whatever is pinned above the list, rather than sitting on top of it.
 */
export function KpiStatRow({
    stats, activeId, onPick, condensed, className,
}: {
    stats: KpiStat[];
    activeId?: string;
    onPick?: (id: string) => void;
    condensed?: boolean;
    className?: string;
}) {
    return (
        <div className={cn("@container", className)}>
            <div
                className={cn(
                    // Four never go three-across: 3 + 1 strands the last card alone on its own
                    // line. Two-by-two, then all four in one row once that row has the width.
                    // Three stay three-across at every width — 2 + 1 strands the last one the same way.
                    stats.length === 4 ? "grid grid-cols-2 gap-2.5 @xl:grid-cols-4"
                        : stats.length === 3 ? "grid grid-cols-3 gap-2.5"
                        : "grid grid-cols-2 gap-2.5 @xl:grid-cols-3",
                    // Six go across where five do. They were held back to @4xl (896px) while
                    // the five-card roster went single-row at @3xl (768px), so at the same
                    // 870px column the roster showed one compact line and the asset list
                    // showed two roomy ones — two screens, side by side, disagreeing about
                    // what a KPI row looks like. The card shrinks itself the rest of the way.
                    // Seven is the status board: every state a record can be in, plus the
                    // total. It needs a wider line than six before it stops being a row of
                    // slivers, so it goes four-across first and seven only at @5xl.
                    //
                    // Seven never divides evenly, so at 2- and 4-across the first card (the
                    // total) takes the odd cell: a full-width top row at two, a double-height
                    // first column at four — 1 + 6 = a filled 2×4 block. It was 3 + 3 + 1, with
                    // "Rejected" stranded alone on the last line.
                    stats.length === 7 ? "@xl:grid-cols-4 @5xl:grid-cols-7"
                        : stats.length > 7 ? "@3xl:grid-cols-4 @4xl:grid-cols-7"
                        : stats.length >= 6 ? "@3xl:grid-cols-6" : stats.length <= 4 ? "" : "@3xl:grid-cols-5",
                    // Animated with the same curve as every other fold in the product.
                    "overflow-hidden transition-[max-height,opacity,margin,gap] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]",
                    condensed ? "max-h-0 gap-0 opacity-0" : "max-h-96 opacity-100",
                )}
            >
                {stats.map((s, i) => (
                    // The cell is the container: its width is set by the grid and nothing
                    // the card does can change it.
                    <div key={s.id} className={cn("@container flex",
                        stats.length === 7 && i === 0 && "col-span-2 @xl:col-span-1 @xl:row-span-2 @5xl:row-span-1")}>
                        <KpiStatCard
                            className="w-full"
                            label={s.label}
                            value={s.value}
                            Icon={s.Icon}
                            accent={s.accent}
                            active={activeId === s.id}
                            onClick={onPick ? () => onPick(s.id) : undefined}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
