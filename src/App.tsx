import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TopNavbar } from '@/components/layout/TopNavbar'
import { MessagesPage } from '@/pages/messages/MessagesPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { MyProfilePage } from '@/pages/profile/MyProfilePage'
import { AddUserPage } from '@/pages/admin/AddUserPage'
import { SuperAdminDashboardPage } from '@/pages/admin/SuperAdminDashboardPage'
import { findUserById, isDriverUser, roleOn, updateAppUser, type AppUser } from '@/data/users.data'
import { canOpenCarrier, profilesFor } from '@/pages/users-roles/scope'
import { recordNavigation, clearNavigationHistory } from '@/lib/nav-history'
import { CollectionFormPage } from '@/pages/inventory/CollectionFormPage'
import { COLLECTION_FORM_PATH } from '@/pages/inventory/collection-form-handoff'
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data'
import { EmptyCarrierProfile } from '@/pages/account/EmptyCarrierProfile'
import { ServiceProfilePage } from '@/pages/service/ServiceProfilePage'
import { EmptyServiceProfile } from '@/pages/service/EmptyServiceProfile'
import { SERVICE_PROFILES_DB, type ServiceProfile } from '@/pages/accounts/service-profiles.data'
import { GeneralSettingsPage } from '@/pages/settings/GeneralSettingsPage'
import { ServiceUsersRolesPage } from '@/pages/users-roles/ServiceUsersRolesPage'
import { ServiceMonitoringPage } from '@/pages/users-roles/ProfileNotifications'
import { AuditLogPage } from '@/pages/admin/AuditLogPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { logAudit } from '@/data/audit-log.data'
import { CarrierUsersRolesPage } from '@/pages/users-roles/CarrierUsersRolesPage'
import { AdminRolesPage } from '@/pages/users-roles/AdminRolesPage'
import { NoAccessPage, ViewOnlyBanner } from '@/pages/users-roles/AccessGate'
import { menuAccess, menuKeyForPath, menuLabelOf, useRoleAccess } from '@/pages/users-roles/roles.data'
import { SettingsDqFilesPage } from '@/pages/settings/SettingsDqFilesPage'
import { ComplianceAndDocumentsPage } from '@/pages/admin/ComplianceAndDocumentsPage'
import { CarrierComplianceSetupPage } from '@/pages/admin/CarrierComplianceSetupPage'
import { ServiceProfileLimitsPage } from '@/pages/admin/ServiceProfileLimitsPage'
import { CarrierProfileLimitsPage } from '@/pages/admin/CarrierProfileLimitsPage'
import { ProfileInsightsPage } from '@/pages/admin/ProfileInsightsPage'
import { ComplianceTemplatesPage } from '@/pages/admin/ComplianceTemplatesPage'
import { loadCarrierAssignment } from '@/pages/admin/carrier-compliance.data'
import DocumentFoldersPage from '@/pages/settings/DocumentFoldersPage'
import { MaintenancePage } from '@/pages/settings/MaintenancePage'
import { CarrierProfilePage } from '@/pages/profile/CarrierProfilePage'
import { LocationsPage } from '@/pages/account/LocationsPage'
import { AccountsTabsPage } from '@/pages/accounts/AccountsTabsPage'
import { AddServiceProfilePage } from '@/pages/accounts/AddServiceProfilePage'
import { AddAccountPage } from '@/pages/accounts/AddAccountPage'
import { InventoryListPage } from '@/pages/inventory/InventoryListPage'
import { InventoryItemDetailPage } from '@/pages/inventory/InventoryItemDetailPage'
import { InventoryHoldersPage } from '@/pages/inventory/InventoryHoldersPage'
import { HolderDetailPage } from '@/pages/inventory/HolderDetailPage'
import { AssignInventoryPage } from '@/pages/inventory/AssignInventoryPage'
import { VendorsListPage } from '@/pages/inventory/VendorsListPage'
import { AddVendorPage } from '@/pages/inventory/AddVendorPage'
import { AddInventoryItemPage } from '@/pages/inventory/AddInventoryItemPage'
import type { AccountRecord } from '@/pages/accounts/accounts.data'
import { AssetDirectoryPage } from '@/pages/assets/AssetDirectoryPage'
import { AssetMaintenancePage } from '@/pages/assets/AssetMaintenancePage'
import { ExpenseTypesPage } from '@/pages/settings/ExpenseTypesPage'
import { ViolationsPage } from '@/pages/settings/ViolationsPage'
import { AccidentsSettingsPage } from '@/pages/settings/AccidentsSettingsPage'
import { ComplianceDocumentsPage } from '@/pages/compliance/ComplianceDocumentsPage'
import { NewComplianceDocumentsPage } from '@/pages/compliance/NewComplianceDocumentsPage'
import { SafetyCatalogView } from '@/pages/compliance/SafetyCatalogView'
import { DefaultComplianceDataPage } from '@/pages/compliance/DefaultComplianceDataPage'
import { DefaultComplianceMonitoringPage } from '@/pages/compliance/DefaultComplianceMonitoringPage'
import { SettingsDefaultMonitoringPage } from '@/pages/compliance/SettingsDefaultMonitoringPage'
import { SafetyTagsPage } from '@/pages/compliance/SafetyTagsPage'
import { ComplianceMonitoringPage } from '@/pages/compliance/ComplianceMonitoringPage'
import TrainingsPage from '@/pages/settings/TrainingsPage'
import { InspectionsSettingsPage } from '@/pages/settings/InspectionsSettingsPage'
import { SafetySettingsPage } from '@/pages/settings/SafetySettingsPage'
import { SafetyEventsSettingsPage } from '@/pages/settings/SafetyEventsSettingsPage'
import { IntegrationsSettingsPage } from '@/pages/settings/IntegrationsSettingsPage'
import { DocuFormGeneratorPage } from '@/pages/settings/DocuFormGeneratorPage'
import { TemplatesPage } from '@/pages/settings/TemplatesPage'

import { PaystubsPage } from '@/pages/finance/PaystubsPage'
import { AtsPage } from '@/pages/ats/AtsPage'
import { AtsAssignmentsPage } from '@/pages/ats/AtsAssignmentsPage'
import { DqFilesPage } from '@/pages/ats/DqFilesPage'
import { DqFileTemplateGenerator } from '@/pages/ats/DqFileTemplateGenerator'
import { IssueHiringPage } from '@/pages/ats/IssueHiringPage'
import { HiringFormsPage } from '@/pages/ats/HiringFormsPage'
import { ApplicantPortalPage } from '@/pages/ats/ApplicantPortalPage'
import { ApplicationDetailPage } from '@/pages/ats/ApplicationDetailPage'
import { ApplicationSettingsPage, ApplicationFormPage } from '@/pages/hiring-process/ApplicationSettingsPage'
import { ApplicationFormPreviewPage } from '@/pages/hiring-process/ApplicationFormPreview'
import { HiringFormView } from '@/pages/hiring-process/formRegistry'
import { PolicyForm } from '@/pages/hiring-process/PolicyForm'
import { OnboardingSetupPage } from '@/pages/hiring-process/OnboardingSetupPage'
import { POLICY_FORMS } from '@/pages/hiring-process/policy-forms.data'
import { getOnboardingFormDef } from '@/pages/hiring-process/onboarding.data'
import { ApplicationsHiringPage } from '@/pages/hiring-process/ApplicationsHiringPage'
import { ApplicantDetailPage } from '@/pages/hiring-process/ApplicantDetailPage'
import { HiringBuilderPage } from '@/pages/hiring-process/HiringBuilderPage'
import { HiringMonitorPage } from '@/pages/hiring-process/HiringMonitorPage'
import { HiringFileDashboard } from '@/pages/hiring-process/HiringFileDashboard'
import { OnboardingPage } from '@/pages/hiring-process/OnboardingPage'
import { OnboardingFileDashboard } from '@/pages/hiring-process/OnboardingFileDashboard'
import { TestingFormsPage } from '@/pages/hiring-process/TestingFormsPage'
import { TicketsPage } from '@/pages/tickets/TicketsPage'
import { RoadsideInspectionsPage } from '@/pages/roadside/RoadsideInspectionsPage'
import { RoadsideInspectionForm } from '@/pages/roadside/RoadsideInspectionForm'
import { RoadsideInspectionDetail } from '@/pages/roadside/RoadsideInspectionDetail'
import { ChatTagsSettingsPage } from '@/pages/settings/ChatTagsSettingsPage'

import { AccidentsPage } from '@/pages/incidents/IncidentsPage'
import { DefaultAccidentsPage } from '@/pages/incidents/DefaultAccidentsPage'
import { CarrierOpportunitiesPage } from '@/pages/driver-app/CarrierOpportunitiesPage'
import { DriverMobileAppPage } from '@/pages/driver-app/DriverMobileAppPage'
import { ViolationsListPage } from '@/pages/violations/ViolationsListPage'
import { InspectionsPage } from '@/pages/inspections/InspectionsPage'
import { SafetyEventsPage } from '@/pages/safety-events/SafetyEventsPage'
import { FuelPage } from '@/pages/fuel/FuelPage'
import { HoursOfServicePage } from '@/pages/hos/HoursOfServicePage'
import { HosViolationsPage } from '@/pages/hos/HosViolationsPage'
import { SafetyAnalysisPage } from '@/pages/safety-analysis/SafetyAnalysisPage'
import { NewSafetyAnalysisPage } from '@/pages/safety-analysis/NewSafetyAnalysisPage'
import { BetaSafetyAnalysisPage } from '@/pages/safety-analysis/BetaSafetyAnalysisPage'
import { VendorWorkOrderFormPage } from '@/pages/vendor-portal/VendorWorkOrderFormPage'
import { isVendorPortalUrl } from '@/pages/vendor-portal/vendorPortal.utils'

function App() {
    // Public vendor-portal route — renders the work-order form for an external
    // mechanic and skips the authenticated app shell entirely.
    if (typeof window !== 'undefined' && isVendorPortalUrl()) {
        return <VendorWorkOrderFormPage />
    }

    // Simple state for navigation simulation since we might not have a full router set up
    // or the user might want to test without it initially.
    // The user's request showed "sidebar accepts currentPath", so this mocks it.
    const [path, setPath] = useState(() => {
        // Restoring a driver's session lands them where signing in would have.
        if (typeof window === 'undefined') return "/dashboard"
        const id = localStorage.getItem('app_current_user_id')
        return id && isDriverUser(findUserById(id)) ? "/driver-mobile-app" : "/dashboard"
    })
    const [previousPath, setPreviousPath] = useState<string | null>(null)
    const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null)
    const [selectedServiceProfileId, setSelectedServiceProfileId] = useState<string | undefined>(undefined)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
        if (typeof window === 'undefined') return null
        const id = localStorage.getItem('app_current_user_id')
        return id ? findUserById(id) ?? null : null
    })
    // Which sidebar menus each role gets (Users & Roles ▸ Roles) — read here too, so a page a
    // role does not have is gated on the way in, not only left out of the menu.
    const roleAccess = useRoleAccess()

    // On first mount, if a user is restored from localStorage but no carrier
    // is selected yet, pick one for them (so /account/profile shows their
    // own carrier rather than defaulting to Acme).
    useEffect(() => {
        if (currentUser && !selectedAccount) {
            const next = getDefaultCarrierForUser(currentUser)
            if (next) setSelectedAccount(next)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // A selected carrier this person may not see — their access was taken away, or a page
    // handed the app a carrier they were never given — goes back to their own carrier. A
    // carrier role is per carrier, so standing on the wrong carrier would read as the wrong
    // role everywhere.
    useEffect(() => {
        if (!currentUser || !selectedAccount || canOpenCarrier(currentUser, selectedAccount)) return
        const next = getDefaultCarrierForUser(currentUser)
        setSelectedAccount(next && canOpenCarrier(currentUser, next) ? next : null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, selectedAccount])

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('app_current_user_id', currentUser.id)
        } else {
            localStorage.removeItem('app_current_user_id')
        }
    }, [currentUser])

    /**
     * Pick the most appropriate carrier for the given user:
     *   1. Their primary accountId
     *   2. First entry in their managedAccountIds
     *   3. Any carrier under their service profile
     *   4. Super admins → default to Acme Trucking (acct-001) so they always
     *      land on a real carrier; they can switch via the carrier dropdown.
     *   5. Otherwise → null (admin/user with no scope → empty-state page)
     */
    const getDefaultCarrierForUser = (user: AppUser): AccountRecord | null => {
        if (user.accountId) {
            const a = ACCOUNTS_DB.find((x) => x.id === user.accountId)
            if (a) return a
        }
        if (user.managedAccountIds && user.managedAccountIds.length > 0) {
            const a = ACCOUNTS_DB.find((x) => x.id === user.managedAccountIds![0])
            if (a) return a
        }
        if (user.serviceProfileId) {
            const a = ACCOUNTS_DB.find((x) => x.serviceProfileId === user.serviceProfileId)
            if (a) return a
        }
        if (user.role === "super-admin") {
            return ACCOUNTS_DB.find((x) => x.id === "acct-001")
                ?? ACCOUNTS_DB[0]
                ?? null
        }
        return null
    }

    /**
     * Mirror of getDefaultCarrierForUser for service profiles.
     *   1. user.serviceProfileId → its profile
     *   2. user.serviceProfileIds[0] → its profile
     *   3. user.accountId → look up that carrier's parent service profile
     *   4. super-admin → svc-001 (TrackSmart) so they always land somewhere real
     *   5. otherwise → null (admin/user with no scope → empty-state page)
     */
    const getDefaultServiceProfileForUser = (user: AppUser): ServiceProfile | null => {
        if (user.serviceProfileId) {
            const sp = SERVICE_PROFILES_DB.find((x) => x.id === user.serviceProfileId)
            if (sp) return sp
        }
        if (user.serviceProfileIds && user.serviceProfileIds.length > 0) {
            const sp = SERVICE_PROFILES_DB.find((x) => x.id === user.serviceProfileIds![0])
            if (sp) return sp
        }
        if (user.accountId) {
            const acct = ACCOUNTS_DB.find((x) => x.id === user.accountId)
            if (acct?.serviceProfileId) {
                const sp = SERVICE_PROFILES_DB.find((x) => x.id === acct.serviceProfileId)
                if (sp) return sp
            }
        }
        if (user.role === "super-admin") {
            return SERVICE_PROFILES_DB.find((x) => x.id === "svc-001")
                ?? SERVICE_PROFILES_DB[0]
                ?? null
        }
        return null
    }

    /**
     * Sign somebody in — from the login page, or an Admin's "Sign in as" on a test account.
     * One funnel, so both do the same things: accepting an invitation is signing in for the
     * first time, and nothing of the previous person's (trail, selections) is inherited.
     */
    const handleSignIn = (user: AppUser) => {
        // Written now, not in the effect: the first render after signing in already reads the
        // session from storage (the Driver app, Messages' seat), and must not read the previous one.
        try { localStorage.setItem('app_current_user_id', user.id) } catch { /* private window */ }
        if (user.status === "Invited") updateAppUser(user.id, { status: "Active" })
        logAudit({ category: "auth", kind: "received", title: `${user.name} signed in`, detail: isDriverUser(user) ? "Driver app" : undefined, actor: user, accountId: getDefaultCarrierForUser(user)?.id })
        clearNavigationHistory()
        setSelectedServiceProfileId(undefined)
        setCurrentUser(user)
        setSelectedAccount(getDefaultCarrierForUser(user))
        // A driver signing in is not an office user with fewer menus — they are a different
        // person doing a different job, and the fleet dashboard is not it.
        setPath(isDriverUser(user) ? "/driver-mobile-app" : "/dashboard")
    }

    const handleSignOut = () => {
        // Somebody else's trail is not this person's history.
        clearNavigationHistory()
        setCurrentUser(null)
        setPath("/dashboard")
        setSelectedAccount(null)
        setSelectedServiceProfileId(undefined)
    }

    /**
     * The service profile a page shows: the one picked in the top bar when this person may
     * see it, else their own. A pick is never inherited across a sign-in, and an Admin's
     * page never shows another organisation's profile however it was asked to.
     */
    const resolveServiceProfile = (user: AppUser): ServiceProfile | null => {
        const explicit = selectedServiceProfileId ? SERVICE_PROFILES_DB.find((x) => x.id === selectedServiceProfileId) : undefined
        if (explicit && profilesFor(user).some((p) => p.id === explicit.id)) return explicit
        return getDefaultServiceProfileForUser(user)
    }

    const handleNavigate = (newPath: string) => {
        // Remember where the user came from so detail pages can render an
        // accurate "Back to <list>" affordance. `previousPath` is the old one-slot
        // version, kept for the carrier profile that still reads it; the trail is the
        // real answer — a single slot sends A → B → A → B round in circles.
        if (newPath !== path) setPreviousPath(path)
        recordNavigation(path, newPath)
        setPath(newPath)
        // And give the BROWSER a step to go back to. Routing here is state rather than
        // location, so without this the Back button left the app altogether from every
        // screen — the one button everybody reaches for first.
        //
        // The URL is deliberately left alone: changing it would promise a deep link that a
        // reload cannot honour, since nothing here reads the path back out of the address bar.
        if (typeof window !== "undefined" && newPath !== path) {
            window.history.pushState({ appPath: newPath }, "")
        }
        console.log("Navigated to:", newPath)
    }

    /**
     * Back, and forward, as the browser means them.
     *
     * Each navigation leaves an entry carrying the path it went to; pressing Back hands
     * that entry’s predecessor straight back to us. The trail is told as well, so the
     * in-app "Back to —" labels unwind alongside rather than disagreeing with the button
     * next to them.
     */
    useEffect(() => {
        if (typeof window === "undefined") return
        // The first screen needs an entry of its own, or the first Back press has nothing
        // to land on and leaves the app.
        if (!(window.history.state as { appPath?: string } | null)?.appPath) {
            window.history.replaceState({ appPath: path }, "")
        }
        const onPop = (e: PopStateEvent) => {
            const next = (e.state as { appPath?: string } | null)?.appPath
            // An entry belonging to an in-page view (see `useBackAwareView`) is that view’s
            // to handle; this one only answers for whole pages.
            if (typeof next !== "string") return
            setPath((current) => {
                if (current === next) return current
                recordNavigation(current, next)
                setPreviousPath(current)
                return next
            })
        }
        window.addEventListener("popstate", onPop)
        return () => window.removeEventListener("popstate", onPop)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleSelectAccount = (account: AccountRecord) => {
        // Only a carrier this person has access to. A page can list every carrier of a
        // service profile; the app does not re-scope to one they were not given.
        if (currentUser && !canOpenCarrier(currentUser, account)) {
            console.log("Carrier not in scope for this user:", account.id)
            return
        }
        setSelectedAccount(account)
        console.log("Selected account:", account.id, account.legalName)
    }

    /**
     * Where a driver is allowed to go.
     *
     * The sidebar already only offers these two, but a sidebar is a menu, not a lock: an
     * old link, a back button or a deep-link from a record would drop a driver onto the
     * fleet's hiring pipeline. The same short list, enforced once on the way in.
     */
    const DRIVER_PATHS = ["/driver-mobile-app", "/messages", "/profile/me", "/apply-carrier", COLLECTION_FORM_PATH]
    const driverAllowed = (p: string) => DRIVER_PATHS.some((d) => p === d || p.startsWith(`${d}/`))

    // Render the appropriate page based on currentPath
    const renderPage = () => {
        if (currentUser && isDriverUser(currentUser) && !driverAllowed(path)) {
            return <DriverMobileAppPage key={selectedAccount?.id ?? 'default'} accountId={selectedAccount?.id} />
        }
        if (path === "/apply-carrier") {
            return <CarrierOpportunitiesPage driverName={currentUser?.name} />
        }
        if (path === "/profile/me" && currentUser) {
            return <MyProfilePage user={currentUser} />
        }
        if (path === "/admin/dashboard" && currentUser) {
            return (
                <SuperAdminDashboardPage
                    currentUser={currentUser}
                    onNavigate={handleNavigate}
                    onSelectAccount={handleSelectAccount}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                />
            )
        }
        if (path === "/admin/compliance-and-documents") {
            return <ComplianceAndDocumentsPage onNavigate={handleNavigate} />
        }
        if (path === "/settings/compliance-and-documents") {
            // Settings view — scoped to the items root enabled for this carrier.
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const asg = account ? loadCarrierAssignment(account.id) : null
            return <ComplianceAndDocumentsPage
                onNavigate={handleNavigate}
                enabledKeyNumberIds={asg?.enabledKeyNumberIds}
                enabledDocumentTypeIds={asg?.enabledDocumentTypeIds}
            />
        }
        if (path === "/admin/carrier-compliance-setup") {
            // Admin ▸ Carrier Profile Configuration — per-carrier compliance overrides.
            // `key` forces a fresh mount so scope/state don't carry over from the
            // service-profile route (same component type).
            return <CarrierComplianceSetupPage key="carrier-config" />
        }
        if (path === "/admin/carrier-profile-configuration") {
            // Super Admin — how many users each carrier profile can add.
            return (
                <CarrierProfileLimitsPage
                    onOpenCarrier={handleSelectAccount}
                    onOpenDetail={(id) => handleNavigate(`/admin/carrier-profile-configuration/${id}`)}
                />
            )
        }
        if (path.startsWith("/admin/carrier-profile-configuration/")) {
            const id = path.slice("/admin/carrier-profile-configuration/".length)
            return (
                <ProfileInsightsPage key={`carrier-${id}`} kind="carrier" id={id}
                    onNavigate={handleNavigate}
                    onOpenCarrier={handleSelectAccount}
                    onOpenServiceProfile={(spId) => { setSelectedServiceProfileId(spId); handleNavigate("/service-profile") }}
                />
            )
        }
        if (path.startsWith("/admin/service-profile-compliance/")) {
            const id = path.slice("/admin/service-profile-compliance/".length)
            return (
                <ProfileInsightsPage key={`service-${id}`} kind="service" id={id}
                    onNavigate={handleNavigate}
                    onOpenCarrier={handleSelectAccount}
                    onOpenServiceProfile={(spId) => { setSelectedServiceProfileId(spId); handleNavigate("/service-profile") }}
                />
            )
        }
        if (path === "/admin/service-profile-compliance") {
            // Super Admin — how many carrier profiles and users each service profile can have.
            return (
                <ServiceProfileLimitsPage
                    onOpenProfile={(id) => { setSelectedServiceProfileId(id); handleNavigate("/service-profile") }}
                    onOpenDetail={(id) => handleNavigate(`/admin/service-profile-compliance/${id}`)}
                />
            )
        }
        if (path === "/service-profile/compliance-setup") {
            // Service Profile admin view — Carrier Profile only, drilling into this profile's carriers.
            return <CarrierComplianceSetupPage key="service-profile-admin" mode="serviceProfile" carrierLevelOnly />
        }
        if (path === "/admin/compliance-templates") {
            return <ComplianceTemplatesPage />
        }
        if (path === "/admin/users" && currentUser) {
            // Admin is the carrier's: the same team page Settings ▸ Users & Roles opens.
            const account = selectedAccount ?? getDefaultCarrierForUser(currentUser)
            return <CarrierUsersRolesPage key={account?.id ?? 'none'} currentUser={currentUser} accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/admin/roles" && currentUser) {
            // The roles at platform level: the menu table for all six, and the test accounts.
            return (
                <AdminRolesPage
                    currentUser={currentUser}
                    onNavigate={handleNavigate}
                    onSwitchUser={handleSignIn}
                    onSelectAccount={handleSelectAccount}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                />
            )
        }
        if (path === "/admin/users/new" && currentUser) {
            return <AddUserPage currentUser={currentUser} onNavigate={handleNavigate} />
        }
        if (path === "/dashboard" && currentUser) {
            // The carrier in the top bar, and — for an Admin — their service profile, for the two views.
            const account = selectedAccount ?? getDefaultCarrierForUser(currentUser)
            const profile = resolveServiceProfile(currentUser)
            return (
                <DashboardPage
                    currentUser={currentUser}
                    accountId={account?.id}
                    serviceProfileId={profile?.id}
                    onNavigate={handleNavigate}
                    onSelectAccount={handleSelectAccount}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                />
            )
        }
        if (path === "/messages") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <MessagesPage
                    currentUserName={currentUser?.name}
                    accountId={account?.id}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/compliance") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <ComplianceDocumentsPage accountId={account?.id} />
        }
        if (path === "/new-compliance") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <NewComplianceDocumentsPage accountId={account?.id} />
        }
        if (path === "/admin/audit-log" && currentUser) {
            // One carrier's log — the one picked in the top bar.
            const account = selectedAccount ?? getDefaultCarrierForUser(currentUser)
            return <AuditLogPage key={account?.id ?? 'none'} scope="carrier" currentUser={currentUser} accountId={account?.id} onNavigate={handleNavigate} onSelectAccount={handleSelectAccount} />
        }
        if (path === "/service-profile/audit-log" && currentUser) {
            const profile = resolveServiceProfile(currentUser)
            return <AuditLogPage key={profile?.id ?? 'default'} scope="profile" currentUser={currentUser} serviceProfileId={profile?.id}
                onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)} onNavigate={handleNavigate} onSelectAccount={handleSelectAccount} />
        }
        if (path === "/admin/platform-audit-log" && currentUser) {
            return <AuditLogPage scope="platform" currentUser={currentUser} onNavigate={handleNavigate} onSelectAccount={handleSelectAccount} />
        }
        if (path === "/admin/monitoring-notifications") {
            // Admin is the carrier's: the same notification roles Settings ▸ Monitoring & Notifications opens.
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <SettingsDefaultMonitoringPage accountId={account?.id} currentUser={currentUser} onNavigate={handleNavigate} />
        }
        if (path === "/service-profile/monitoring-notifications" && currentUser) {
            // The service profile's overview — who is told on each of its carriers, and which
            // escalate to its Admins. Same scope as Service Profile ▸ Users & Roles.
            const profile = resolveServiceProfile(currentUser)
            return (
                <ServiceMonitoringPage
                    key={profile?.id ?? 'default'}
                    currentUser={currentUser}
                    serviceProfileId={profile?.id}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                    onNavigate={handleNavigate}
                    onSelectAccount={handleSelectAccount}
                />
            )
        }
        if (path === "/compliance-monitoring") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <ComplianceMonitoringPage accountId={account?.id} />
        }
        if (path === "/account/profile") {
            // Fall back to the user's default carrier if none has been picked yet
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            // No carrier in this user's scope → empty state instead of falling
            // through to Acme as the global default.
            if (currentUser && !account) {
                return <EmptyCarrierProfile user={currentUser} onNavigate={handleNavigate} />
            }
            return (
                <CarrierProfilePage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                    currentUser={currentUser ?? undefined}
                    onSelectAccount={handleSelectAccount}
                    previousPath={previousPath ?? undefined}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/account/locations") {
            return <LocationsPage />
        }
        if (path === "/service-profile") {
            // Resolve in the same order as /account/profile: explicit selection → user's
            // default → empty state. Super-admins always get svc-001 so they don't see
            // the empty state.
            const profile = currentUser ? resolveServiceProfile(currentUser) : null
            if (currentUser && !profile) {
                return <EmptyServiceProfile user={currentUser} onNavigate={handleNavigate} />
            }
            return (
                <ServiceProfilePage
                    key={profile?.id ?? 'default'}
                    serviceProfileId={profile?.id}
                    currentUser={currentUser}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                    onSelectAccount={handleSelectAccount}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/service-profile/users-roles") {
            // The service profile's: every role, its Admins, its carrier profiles. Resolved the
            // same way as the profile page above.
            const profile = currentUser ? resolveServiceProfile(currentUser) : null
            return (
                <ServiceUsersRolesPage
                    key={profile?.id ?? 'default'}
                    currentUser={currentUser}
                    serviceProfileId={profile?.id}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                    onNavigate={handleNavigate}
                    onSelectAccount={handleSelectAccount}
                />
            )
        }
        if (path === "/accounts/services/new") {
            return <AddServiceProfilePage onNavigate={handleNavigate} />
        }
        if (path === "/accounts") {
            return (
                <AccountsTabsPage
                    onNavigate={handleNavigate}
                    onSelectAccount={handleSelectAccount}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                    currentUser={currentUser}
                />
            )
        }
        if (path === "/accounts/new") {
            return <AddAccountPage onNavigate={handleNavigate} />
        }
        if (path === "/inventory") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <InventoryListPage
                    onNavigate={handleNavigate}
                    accountId={account?.id}
                    accountName={account?.dbaName ?? account?.legalName}
                />
            )
        }
        // The Hand Over, Driver Inventory and Take Back pages are gone: who holds an item
        // is an assignment now, made on the driver's own page or the unit's, and a signed
        // checklist was a third answer to a question that may only have one. Old links land
        // on the List rather than on nothing.
        if (path === "/inventory/handover" || path === "/inventory/driver-inventory"
            || path.startsWith("/inventory/handover/") || path.startsWith("/inventory/driver-inventory/")
            || path.startsWith("/inventory/take-back/")) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <InventoryListPage
                    onNavigate={handleNavigate}
                    accountId={account?.id}
                    accountName={account?.dbaName ?? account?.legalName}
                />
            )
        }
        // "/inventory/drivers/<id>/assign" — tested before the bare tab paths so the tab
        // route does not swallow it.
        if (/^\/inventory\/(drivers|assets)\/[^/]+\/assign$/.test(path)) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const [, , seg, id] = path.split("/")
            return (
                <AssignInventoryPage
                    onNavigate={handleNavigate}
                    kind={seg === "drivers" ? "driver" : "asset"}
                    holderId={id}
                    accountId={account?.id}
                />
            )
        }
        // ".../<id>/add" opens the Add Inventory form already pointed at that holder.
        if (/^\/inventory\/(drivers|assets)\/[^/]+\/add$/.test(path)) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const [, , seg, id] = path.split("/")
            return (
                <AddInventoryItemPage
                    onNavigate={handleNavigate}
                    accountId={account?.id}
                    preset={{ kind: seg === "drivers" ? "driver" : "asset", targetId: id }}
                />
            )
        }
        // ".../<id>" is that holder's own page — four tabs, rather than a row that expands
        // inside the list of every other holder.
        if (/^\/inventory\/(drivers|assets)\/[^/]+$/.test(path)) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const [, , seg, id] = path.split("/")
            return (
                <HolderDetailPage
                    onNavigate={handleNavigate}
                    kind={seg === "drivers" ? "driver" : "asset"}
                    holderId={id}
                    accountId={account?.id}
                />
            )
        }
        if (path === "/inventory/drivers" || path === "/inventory/assets") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <InventoryHoldersPage
                    onNavigate={handleNavigate}
                    kind={path === "/inventory/drivers" ? "driver" : "asset"}
                    accountId={account?.id}
                    accountName={account?.dbaName ?? account?.legalName}
                />
            )
        }
        if (path === "/inventory/items/new") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <AddInventoryItemPage onNavigate={handleNavigate} accountId={account?.id} />
        }
        // An item id on its own opens the item; "/edit" opens the form that changes it.
        // Clicking a row used to drop you straight into the editor, which is the wrong
        // default: most of the time you want to read the thing, not change it.
        if (path.startsWith("/inventory/items/") && path.endsWith("/edit")) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const editId = path.slice("/inventory/items/".length, -"/edit".length)
            return <AddInventoryItemPage onNavigate={handleNavigate} accountId={account?.id} editId={editId} />
        }
        if (path.startsWith("/inventory/items/")) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const itemId = path.slice("/inventory/items/".length)
            return <InventoryItemDetailPage onNavigate={handleNavigate} accountId={account?.id} itemId={itemId} />
        }
        if (path === "/inventory/vendors") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <VendorsListPage
                    onNavigate={handleNavigate}
                    accountId={account?.id}
                    accountName={account?.dbaName ?? account?.legalName}
                />
            )
        }
        if (path === "/inventory/vendors/new") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <AddVendorPage onNavigate={handleNavigate} accountId={account?.id} />
        }
        // Vendors' own menu — the same list, without the Inventory section tabs.
        if (path === "/vendors") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <VendorsListPage
                    standalone
                    onNavigate={handleNavigate}
                    accountId={account?.id}
                    accountName={account?.dbaName ?? account?.legalName}
                />
            )
        }
        // One vendor's profile from the Vendors menu — the same page Maintenance renders.
        if (path.startsWith("/vendors/") && path !== "/vendors/new") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <AssetMaintenancePage
                    account={account ?? undefined}
                    openVendor={path.slice("/vendors/".length)}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/vendors/new") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <AddVendorPage onNavigate={handleNavigate} accountId={account?.id} backPath="/vendors" />
        }
        if (path === "/settings/general") {
            return <GeneralSettingsPage />
        }
        if (path === "/settings/users-roles") {
            // Settings is the carrier's: its team, its four roles, who gets its alerts.
            const account = selectedAccount ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <CarrierUsersRolesPage key={account?.id ?? 'none'} currentUser={currentUser} accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/settings/dq-files") {
            const account = selectedAccount ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <SettingsDqFilesPage accountId={account?.id} />
        }
        if (path === "/settings/compliance-setup") {
            // Settings view — same catalog UI (heads + filters) as Super Admin,
            // scoped to the carrier's enabled set, read-only (no Add buttons).
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            const asg = account ? loadCarrierAssignment(account.id) : null
            return <ComplianceAndDocumentsPage
                key="settings-compliance-setup"
                onNavigate={handleNavigate}
                enabledKeyNumberIds={asg?.enabledKeyNumberIds}
                enabledDocumentTypeIds={asg?.enabledDocumentTypeIds}
            />
        }
        if (path === "/settings/new-compliance-documents") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <SafetyCatalogView accountId={account?.id} />
        }
        if (path === "/settings/default-compliance-monitoring") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <SettingsDefaultMonitoringPage accountId={account?.id} currentUser={currentUser} onNavigate={handleNavigate} />
        }
        if (path === "/default-compliance-documents") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <DefaultComplianceDataPage accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/default-compliance-monitoring") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <DefaultComplianceMonitoringPage accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/settings/tags") {
            return <SafetyTagsPage />
        }
        if (path === "/settings/chat-tags") {
            return <ChatTagsSettingsPage />
        }
        if (path === "/settings/document-folders") {
            return <DocumentFoldersPage />
        }
        if (path === "/settings/maintenance") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <MaintenancePage account={account ?? undefined} onNavigate={handleNavigate} />
        }
        if (path === "/settings/expenses") {
            return <ExpenseTypesPage />
        }
        if (path === "/accidents") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <AccidentsPage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                />
            )
        }
        if (path === "/default-accidents") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <DefaultAccidentsPage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                    currentUserName={currentUser?.name}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === COLLECTION_FORM_PATH) {
            return <CollectionFormPage onNavigate={handleNavigate} />
        }
        if (path === "/driver-mobile-app") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <DriverMobileAppPage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                />
            )
        }
        if (path === "/inspections") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <InspectionsPage
                    currentUser={currentUser ?? undefined}
                    accountId={account?.id}
                    onSelectAccount={(id) => {
                        const next = ACCOUNTS_DB.find((a) => a.id === id)
                        if (next) setSelectedAccount(next)
                    }}
                />
            )
        }
        if (path === "/violations") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <ViolationsListPage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                />
            )
        }
        if (path === "/settings/violations") {
            return <ViolationsPage />
        }
        if (path === "/settings/accidents") {
            return <AccidentsSettingsPage />
        }
        if (path === "/settings/inspections") {
            return <InspectionsSettingsPage />
        }

        if (path === "/settings/trainings") {
            return <TrainingsPage />
        }
        if (path === "/settings/safety") {
            return <SafetySettingsPage />
        }
        if (path === "/settings/safety-events") {
            return <SafetyEventsSettingsPage />
        }
        if (path === "/settings/integrations") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <IntegrationsSettingsPage accountId={account?.id} />
        }
        if (path === "/assets/directory") {
            return <AssetDirectoryPage onNavigate={handleNavigate} />
        }
        if (path === "/maintenance") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <AssetMaintenancePage account={account ?? undefined} onNavigate={handleNavigate} />
        }
        // One vendor's profile. It is built from maintenance's own records — the orders
        // raised with the shop and the services filed against it — so it is rendered by
        // that page, and the Inventory vendor list routes here instead of growing a
        // second copy of the same screen.
        if (path.startsWith("/maintenance/vendors/")) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <AssetMaintenancePage
                    account={account ?? undefined}
                    openVendor={path.slice("/maintenance/vendors/".length)}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/paystubs") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <PaystubsPage accountId={account?.id} />
        }
        if (path === "/ats") {
            return <AtsPage onNavigate={handleNavigate} />
        }
        if (path === "/ats-main") {
            return <AtsAssignmentsPage onNavigate={handleNavigate} accountId={selectedAccount?.id} />
        }
        if (path === "/hiring-forms") {
            return <HiringFormsPage />
        }
        if (path === "/hiring-process/applications") {
            return <ApplicationsHiringPage onNavigate={handleNavigate} carrierId={selectedAccount?.id} carrierName={selectedAccount?.dbaName ?? selectedAccount?.legalName} />
        }
        if (path.startsWith("/hiring-process/applications/")) {
            return <ApplicantDetailPage applicantId={path.slice("/hiring-process/applications/".length)} onNavigate={handleNavigate} />
        }
        if (path === "/hiring-process/hiring") {
            return <HiringMonitorPage onNavigate={handleNavigate} carrierId={selectedAccount?.id} />
        }
        if (path.startsWith("/hiring-process/hiring/")) {
            return <HiringFileDashboard applicantId={path.slice("/hiring-process/hiring/".length)} onBack={() => handleNavigate("/hiring-process/hiring")} />
        }
        if (path === "/hiring-process/onboarding") {
            return <OnboardingPage onNavigate={handleNavigate} carrierId={selectedAccount?.id} />
        }
        if (path.startsWith("/hiring-process/onboarding/")) {
            return <OnboardingFileDashboard applicantId={path.slice("/hiring-process/onboarding/".length)} onBack={() => handleNavigate("/hiring-process/onboarding")} />
        }
        if (path === "/settings/hiring-process/applications" || path.startsWith("/settings/hiring-process/applications?")) {
            const tab = new URLSearchParams(path.split("?")[1] || "").get("tab") || undefined
            return <ApplicationSettingsPage onNavigate={handleNavigate} initialTab={tab} />
        }
        if (path.startsWith("/settings/hiring-process/applications/")) {
            const rest = path.slice("/settings/hiring-process/applications/".length)
            const [restPath, queryStr] = rest.split("?")
            const [formId, sub] = restPath.split("/")
            if (sub === "preview") {
                return <ApplicationFormPreviewPage formId={formId} onNavigate={handleNavigate} />
            }
            const phase = new URLSearchParams(queryStr || "").get("phase")
            return <ApplicationFormPage formId={formId} onNavigate={handleNavigate} initialPhase={phase === "consent" ? "consent" : undefined} />
        }
        if (path === "/settings/hiring-process/hiring") {
            return <HiringBuilderPage carrierId={selectedAccount?.id} />
        }
        if (path === "/settings/hiring-process/onboarding") {
            return <OnboardingSetupPage onNavigate={handleNavigate} carrierId={selectedAccount?.id} />
        }
        if (path.startsWith("/settings/hiring-process/policy/")) {
            const [policyId, query] = path.slice("/settings/hiring-process/policy/".length).split("?")
            const pdf = new URLSearchParams(query ?? "").get("pdf") === "1"
            const def = POLICY_FORMS.find((f) => f.id === policyId) ?? getOnboardingFormDef(policyId)
            if (def) return <PolicyForm def={def} mode="template" backLabel="Onboarding setup" startPreview={pdf} onBack={() => handleNavigate("/settings/hiring-process/onboarding")} />
        }
        if (path === "/settings/hiring-process/testing-forms") {
            return <TestingFormsPage />
        }
        if (path.startsWith("/settings/hiring-process/forms/")) {
            const formId = path.slice("/settings/hiring-process/forms/".length)
            return <HiringFormView formId={formId} onBack={() => handleNavigate("/settings/hiring-process/applications?tab=forms")} />
        }
        if (path.startsWith("/settings/hiring-process/consent/")) {
            const [consentId, query] = path.slice("/settings/hiring-process/consent/".length).split("?")
            const def = POLICY_FORMS.find((f) => f.id === consentId)
            const pdf = new URLSearchParams(query || "").get("pdf") === "1"
            if (def) return <PolicyForm def={def} mode="template" backLabel="Consent forms" startPreview={pdf} onBack={() => handleNavigate("/settings/hiring-process/applications?tab=consent")} />
        }
        if (path === "/dq-files") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <DqFilesPage onNavigate={handleNavigate} accountId={account?.id} />
        }
        if (path === "/dq-files/generator") {
            return <DqFileTemplateGenerator onNavigate={handleNavigate} />
        }
        if (path === "/ats/issue-hiring") {
            return <IssueHiringPage onNavigate={handleNavigate} />
        }
        if (path.startsWith("/apply/")) {
            return <ApplicantPortalPage applicantId={path.slice("/apply/".length)} onNavigate={handleNavigate} />
        }
        if (path.startsWith("/ats/application/")) {
            return <ApplicationDetailPage applicantId={path.slice("/ats/application/".length)} onNavigate={handleNavigate} />
        }
        if (path === "/admin/docu-form" || path === "/settings/docu-form") {
            return <DocuFormGeneratorPage />
        }
        if (path === "/admin/templates" || path === "/settings/templates") {
            return <TemplatesPage />
        }
        if (path === "/admin/hiring-form-templates") {
            return <TemplatesPage lockedFormType="hiring-ats" />
        }
        // ── Roadside inspections ──
        // List, the full-screen recorder, one record, and that record's editor. The
        // detail route is matched last of the four because "/new" would otherwise be
        // read as an id.
        if (path === "/roadside-inspections") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <RoadsideInspectionsPage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                    accountName={account?.dbaName || account?.legalName}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/roadside-inspections/new") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <RoadsideInspectionForm
                    accountId={account?.id}
                    accountName={account?.dbaName || account?.legalName}
                    currentUserName={currentUser?.name}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path.startsWith("/roadside-inspections/") && path.endsWith("/edit")) {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <RoadsideInspectionForm
                    inspectionId={path.slice("/roadside-inspections/".length, -"/edit".length)}
                    accountId={account?.id}
                    accountName={account?.dbaName || account?.legalName}
                    currentUserName={currentUser?.name}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path.startsWith("/roadside-inspections/")) {
            return (
                <RoadsideInspectionDetail
                    inspectionId={path.slice("/roadside-inspections/".length)}
                    currentUserName={currentUser?.name}
                    onNavigate={handleNavigate}
                />
            )
        }
        if (path === "/tickets") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <TicketsPage accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/safety-events" || path === "/safety-event/telematics-video") {
            // The carrier scope is passed so a warning letter issued from a review is filed
            // against the right account’s driver.
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <SafetyEventsPage currentUserName={currentUser?.name} onNavigate={handleNavigate} accountId={account?.id} />
        }
        if (path === "/safety-event/hours-of-service-violations") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <HosViolationsPage accountId={account?.id} currentUserName={currentUser?.name} />
        }
        if (path === "/safety-analysis") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return (
                <NewSafetyAnalysisPage
                    key={account?.id ?? 'default'}
                    accountId={account?.id}
                    currentUser={currentUser ?? undefined}
                    onSelectAccount={handleSelectAccount}
                />
            )
        }
        if (path === "/safety-analysis/legacy") {
            return <SafetyAnalysisPage />
        }
        if (path === "/safety-analysis/beta") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <BetaSafetyAnalysisPage accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/hours-of-service") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <HoursOfServicePage accountId={account?.id} />
        }
        if (path === "/fuel") {
            const account = selectedAccount
                ?? (currentUser ? getDefaultCarrierForUser(currentUser) : null)
            return <FuelPage accountId={account?.id} onNavigate={handleNavigate} />
        }
        if (path === "/compliance") {
            return (
                <div className="p-8">
                    <h1 className="text-3xl font-bold mb-4 text-slate-900">Compliance & Documents</h1>
                    <p className="text-slate-600">Manage fleet compliance, permits, and document repositories here.</p>
                </div>
            )
        }

        // Default page for other routes
        return (
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-4 text-slate-900">Current Page: {path}</h1>
                <p className="text-slate-600">
                    This is a clean React setup demonstrating the data-driven sidebar.
                    Click items in the sidebar to change the active path shown above.
                </p>
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        💡 <strong>Tip:</strong> Click on <strong>Settings → Key Numbers</strong> in the sidebar to see the Key Numbers management page.
                    </p>
                </div>
            </div>
        )
    }

    if (!currentUser) {
        return <LoginPage onSignIn={handleSignIn} />
    }

    // The role this person holds on the carrier being looked at — what the sidebar, the top
    // bar and the gate below all go by. The Sidebar menus by role table is enforced here on
    // the way in (see AccessGate): a Hidden menu's page is replaced, a Light one gets a
    // view-only line above it. A driver has their own allowlist in renderPage.
    const effectiveRole = roleOn(currentUser, selectedAccount?.id)
    const pageMenu = menuKeyForPath(path)
    const pageAccess = pageMenu ? menuAccess(roleAccess, pageMenu, effectiveRole) : 'full'
    const gated = !!pageMenu && !isDriverUser(currentUser)

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <AppSidebar
                currentPath={path}
                onNavigate={handleNavigate}
                role={effectiveRole}
                driver={isDriverUser(currentUser)}
                mobileOpen={mobileNavOpen}
                onMobileClose={() => setMobileNavOpen(false)}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <TopNavbar
                    currentPath={path}
                    user={currentUser}
                    onSignOut={handleSignOut}
                    onNavigate={handleNavigate}
                    onOpenMobileNav={() => setMobileNavOpen(true)}
                    selectedAccountId={selectedAccount?.id}
                    onSelectAccount={handleSelectAccount}
                    selectedServiceProfileId={resolveServiceProfile(currentUser)?.id}
                    onSelectServiceProfile={(id) => setSelectedServiceProfileId(id)}
                />
                <main className="flex-1 overflow-auto">
                    {gated && pageAccess === 'hidden' ? (
                        <NoAccessPage
                            role={effectiveRole}
                            menuLabel={menuLabelOf(pageMenu!)}
                            carrier={selectedAccount ? (selectedAccount.dbaName || selectedAccount.legalName) : undefined}
                            onNavigate={handleNavigate}
                        />
                    ) : (
                        <>
                            {gated && pageAccess === 'light' && <ViewOnlyBanner role={effectiveRole} menuLabel={menuLabelOf(pageMenu!)} />}
                            {renderPage()}
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}

export default App

