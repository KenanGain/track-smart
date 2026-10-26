import { useVendorsForAccount } from "@/data/vendorsStore";
import { Plus, Store } from "lucide-react";
import { VendorsTable } from "./VendorsTable";
import { INVENTORY_TABS } from "./InventoryTabs";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { ListHeaderBridge, useListHeaderBridge } from "@/components/ui/list-header-bridge";
import { CARRIER_NAME } from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    /** Active carrier — vendor list is filtered to this carrier's vendors. */
    accountId?: string;
    /** Display name for the breadcrumb / title block. Falls back to the
     *  hard-coded ACME label so existing call-sites continue to work. */
    accountName?: string;
    /** Opened from its own menu (/vendors) — no Inventory section tabs, its own Add route. */
    standalone?: boolean;
};

export function VendorsListPage({ onNavigate, accountId, accountName, standalone }: Props) {
    // The live store, scoped to the active carrier — so a vendor added, edited or
    // deleted anywhere in the app shows here on the next render, and switching carrier
    // in the top navbar switches the list. Falls back to every vendor when no carrier is
    // picked, so super-admin first-mount still shows something useful.
    const vendors = useVendorsForAccount(accountId);

    // The header stays put and shrinks as the list scrolls; the body is its own scroller.
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader();
    // The list says when its KPI cards have scrolled away; the header then condenses and
    // carries their figures, and opens again when the cards come back.
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* The app's standard list header (see `ListPageHeader`) — the same one the
                Inventory list tab wears, so the two sections read as one page. */}
            <ListPageHeader
                Icon={Store}
                title="Vendors"
                description={<><span className="font-semibold text-slate-700">{accountName ?? CARRIER_NAME}</span> — {vendors.length} vendor{vendors.length === 1 ? "" : "s"} this carrier buys from</>}
                count={vendors.length}
                countTitle={`${vendors.length.toLocaleString()} vendors`}
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                {...(standalone ? {} : {
                    tabsLabel: "Inventory sections",
                    tabs: INVENTORY_TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon })),
                    activeTab: "vendors",
                    onTabChange: (id: string) => onNavigate(INVENTORY_TABS.find(t => t.id === id)?.path ?? "/inventory"),
                })}
                actions={<>
                    <button
                        onClick={() => onNavigate(standalone ? "/vendors/new" : "/inventory/vendors/new")}
                        className={cn("inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700", condensed ? "h-8" : "h-9")}
                    >
                        <Plus size={15} /> Add Vendor
                    </button>
                </>}
            />

            {/* Body — the KPI cards scroll up and away, then the rows scroll under their
                headings. The same table Maintenance shows on its own Vendors tab — one list,
                one set of columns, one search box. Rows open the one vendor profile, which
                is built in Maintenance: what the shop has cost and is working on are its records. */}
            <VendorsTable
                vendors={vendors}
                accountId={accountId}
                frame={{ scrollRef, onScroll }}
                // From the Vendors menu the profile stays under it (/vendors/:id), so the
                // sidebar keeps Vendors lit; from Inventory it is Maintenance's route.
                onOpen={(v) => onNavigate(standalone ? `/vendors/${v.id}` : `/maintenance/vendors/${v.id}`)}
            />
        </div>
        </ListHeaderBridge>
    );
}
