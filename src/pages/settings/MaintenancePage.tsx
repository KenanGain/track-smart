import { useRef, useState } from "react";
import { Plus, Store, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { ListHeaderBridge } from "@/components/ui/list-header-bridge";
import { usePageChrome } from "@/components/ui/PageChrome";
// The catalog itself is a component — this page and the Maintenance page's Service Types
// tab show the same one over the same live store.
import { ServiceTypesPanel, type ServiceTypesPanelHandle } from "./ServiceTypesPanel";
import { useServiceTypes } from "@/data/serviceTypesStore";
// The one vendor list and the one vendor form, shared with Vendors, Inventory and Maintenance.
import { VendorsTable } from "@/pages/inventory/VendorsTable";
import { VendorFormDialog } from "@/pages/inventory/VendorFormDialog";
import { useVendorsForAccount } from "@/data/vendorsStore";
import type { AccountRecord } from "@/pages/accounts/accounts.data";

// US States for dropdown
export const US_STATES = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
    "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
    "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
];

// Canadian Provinces
export const CA_PROVINCES = [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador",
    "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island",
    "Quebec", "Saskatchewan", "Yukon"
];

type Section = "services" | "vendors";

/**
 * Settings ▸ Maintenance — the service-type catalog and the carrier's vendors, as two tabs in
 * the page header. Both lists are the shared ones, in the full-page frame: KPI cards scroll
 * away, rows scroll under pinned headings, the header carries the figures.
 */
export function MaintenancePage({ account, onNavigate }: { account?: AccountRecord; onNavigate?: (path: string) => void }) {
    const [section, setSection] = useState<Section>("services");
    const { scrollRef, onScroll, condensed, bridge } = usePageChrome(section);

    // The Add button lives in this page's header; the list is the panel's.
    const servicePanel = useRef<ServiceTypesPanelHandle>(null);
    const serviceTypes = useServiceTypes();

    // Vendors — live store, scoped to the active carrier, so an add here flows into every
    // vendor picker (work orders, inventory) at once.
    const vendors = useVendorsForAccount(account?.id);
    const [addingVendor, setAddingVendor] = useState(false);

    return (
        <ListHeaderBridge value={bridge.value}>
            <div className="flex h-full min-h-0 flex-col bg-slate-50">
                <ListPageHeader
                    Icon={Wrench}
                    title="Maintenance Settings"
                    description="Service types, vendors and the configuration behind fleet maintenance and work orders."
                    condensed={condensed}
                    chips={bridge.chips ?? undefined}
                    tabs={[
                        { id: "services", label: "Service types", icon: Wrench, count: serviceTypes.length },
                        { id: "vendors", label: "Vendors", icon: Store, count: vendors.length },
                    ]}
                    activeTab={section}
                    onTabChange={(id) => setSection(id as Section)}
                    tabsLabel="Maintenance settings sections"
                    actions={section === "services" ? (
                        <Button onClick={() => servicePanel.current?.openAdd()} className={cn("gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700", condensed ? "h-8" : "h-9")}>
                            <Plus className="h-4 w-4" /> Add service type
                        </Button>
                    ) : (
                        <Button onClick={() => setAddingVendor(true)} className={cn("gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700", condensed ? "h-8" : "h-9")}>
                            <Plus className="h-4 w-4" /> Add vendor
                        </Button>
                    )}
                />

                {section === "services" && <ServiceTypesPanel ref={servicePanel} frame={{ scrollRef, onScroll }} />}
                {section === "vendors" && (
                    <VendorsTable
                        vendors={vendors}
                        accountId={account?.id}
                        frame={{ scrollRef, onScroll }}
                        // The one vendor profile is built in Maintenance — what the shop has
                        // cost and is working on are its records.
                        onOpen={onNavigate ? (v) => onNavigate(`/maintenance/vendors/${v.id}`) : undefined}
                    />
                )}

                {/* Add vendor — the same form the vendor lists use for edit. */}
                <VendorFormDialog
                    open={addingVendor}
                    vendor={null}
                    accountId={account?.id}
                    onClose={() => setAddingVendor(false)}
                />
            </div>
        </ListHeaderBridge>
    );
}
