import { useVendorsForAccount } from "@/data/vendorsStore";
import { Plus, Store } from "lucide-react";
import { VendorsTable } from "./VendorsTable";
import { INVENTORY_TABS } from "./InventoryTabs";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { CARRIER_NAME } from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    /** Active carrier — vendor list is filtered to this carrier's vendors. */
    accountId?: string;
    /** Display name for the breadcrumb / title block. Falls back to the
     *  hard-coded ACME label so existing call-sites continue to work. */
    accountName?: string;
};

export function VendorsListPage({ onNavigate, accountId, accountName }: Props) {
    // The live store, scoped to the active carrier — so a vendor added, edited or
    // deleted anywhere in the app shows here on the next render, and switching carrier
    // in the top navbar switches the list. Falls back to every vendor when no carrier is
    // picked, so super-admin first-mount still shows something useful.
    const vendors = useVendorsForAccount(accountId);

    // The header stays put and shrinks as the list scrolls; the body is its own scroller.
    const { scrollRef, condensed, onScroll } = useCondensingHeader();

    return (
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
                tabsLabel="Inventory sections"
                tabs={INVENTORY_TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
                activeTab="vendors"
                onTabChange={id => onNavigate(INVENTORY_TABS.find(t => t.id === id)?.path ?? "/inventory")}
                actions={<>
                    <button
                        onClick={() => onNavigate("/inventory/vendors/new")}
                        className={cn("inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700", condensed ? "h-8" : "h-9")}
                    >
                        <Plus size={15} /> Add Vendor
                    </button>
                </>}
            />

            {/* Body */}
            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn("py-4 sm:py-6", PAGE_PAD)}>
                {/* The same table Maintenance shows on its own Vendors tab — one list,
                    one set of columns, one search box. */}
                {/* The same page the maintenance vendor list opens, reached by route.
                    One vendor record, one profile: what the shop has cost, what it holds
                    and what it is working on are maintenance's records, so the page is
                    built there and this list goes to it rather than growing its own. */}
                <VendorsTable
                    vendors={vendors}
                    accountId={accountId}
                    onOpen={(v) => onNavigate(`/maintenance/vendors/${v.id}`)}
                />
            </div>
            </div>
        </div>
    );
}
