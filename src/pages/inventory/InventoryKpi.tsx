import { KpiStatCard } from "@/components/ui/KpiStatCard";

/**
 * The maintenance and inventory KPI tile — which is now the app's one KPI card.
 *
 * It used to be a second design: a left accent bar, the icon chip stacked ABOVE its label,
 * and the figure off on the right. Beside the rosters and the compliance lists that made
 * three different answers to "what does a KPI row look like", and this one was the one that
 * did not cope with a narrow column — "HOLDING INVENTORY" and "AWAITING REMEDIATION" broke
 * over two lines beside a stack that was already two deep, so the tiles stood taller than
 * everything else in the product exactly where there was least room for them.
 *
 * The wrapper is what does the work. {@link KpiStatCard} sizes itself from its container, and
 * the container has to be something whose width the card cannot change — so it is this
 * padding-free cell, not the card. Every caller's grid keeps deciding how many across; the
 * card decides how big.
 */
export type KpiAccent = "red" | "orange" | "amber" | "blue" | "violet" | "emerald" | "slate";

export function KpiTile({ label, value, Icon, accent, onClick, active }: {
    label: string;
    value: number | string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    accent: KpiAccent;
    /** Given one, the tile becomes the filter for what it counts. */
    onClick?: () => void;
    active?: boolean;
}) {
    return (
        <div className="@container flex">
            <KpiStatCard
                className="w-full"
                label={label}
                value={value}
                Icon={Icon}
                accent={accent}
                onClick={onClick}
                active={active}
            />
        </div>
    );
}
