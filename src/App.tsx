import { useEffect, useState } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { TopNavbar } from '@/components/layout/TopNavbar'
import { LoginPage } from '@/pages/auth/LoginPage'
import { MyProfilePage } from '@/pages/profile/MyProfilePage'
import { UsersListPage } from '@/pages/admin/UsersListPage'
import { AddUserPage } from '@/pages/admin/AddUserPage'
import { findUserById, type AppUser } from '@/data/users.data'
import { KeyNumbersPage } from '@/pages/settings/KeyNumbersPage'
import { GeneralSettingsPage } from '@/pages/settings/GeneralSettingsPage'
import DocumentTypesPage from '@/pages/settings/DocumentTypesPage'
import DocumentFoldersPage from '@/pages/settings/DocumentFoldersPage'
import { MaintenancePage } from '@/pages/settings/MaintenancePage'
import { CarrierProfilePage } from '@/pages/profile/CarrierProfilePage'
import { LocationsPage } from '@/pages/account/LocationsPage'
import { AccountsListPage } from '@/pages/accounts/AccountsListPage'
import { AddAccountPage } from '@/pages/accounts/AddAccountPage'
import { InventoryListPage } from '@/pages/inventory/InventoryListPage'
import { VendorsListPage } from '@/pages/inventory/VendorsListPage'
import { AddVendorPage } from '@/pages/inventory/AddVendorPage'
import { AddInventoryItemPage } from '@/pages/inventory/AddInventoryItemPage'
import type { AccountRecord } from '@/pages/accounts/accounts.data'
import { AssetDirectoryPage } from '@/pages/assets/AssetDirectoryPage'
import { AssetMaintenancePage } from '@/pages/assets/AssetMaintenancePage'
import { ExpenseTypesPage } from '@/pages/settings/ExpenseTypesPage'
import { ViolationsPage } from '@/pages/settings/ViolationsPage'
import { ComplianceDocumentsPage } from '@/pages/compliance/ComplianceDocumentsPage'
import TrainingsPage from '@/pages/settings/TrainingsPage'
import { InspectionsSettingsPage } from '@/pages/settings/InspectionsSettingsPage'
import { SafetySettingsPage } from '@/pages/settings/SafetySettingsPage'

import { PaystubsPage } from '@/pages/finance/PaystubsPage'
import { TicketsPage } from '@/pages/tickets/TicketsPage'

import { AccidentsPage } from '@/pages/incidents/IncidentsPage'
import { ViolationsListPage } from '@/pages/violations/ViolationsListPage'
import { InspectionsPage } from '@/pages/inspections/InspectionsPage'
import { SafetyEventsPage } from '@/pages/safety-events/SafetyEventsPage'
import { FuelPage } from '@/pages/fuel/FuelPage'
import { HoursOfServicePage } from '@/pages/hos/HoursOfServicePage'
import { SafetyAnalysisPage } from '@/pages/safety-analysis/SafetyAnalysisPage'

function App() {
    // Simple state for navigation simulation since we might not have a full router set up
    // or the user might want to test without it initially.
    // The user's request showed "sidebar accepts currentPath", so this mocks it.
    const [path, setPath] = useState("/dashboard")
    const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null)
    const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
        if (typeof window === 'undefined') return null
        const id = localStorage.getItem('app_current_user_id')
        return id ? findUserById(id) ?? null : null
    })

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem('app_current_user_id', currentUser.id)
        } else {
            localStorage.removeItem('app_current_user_id')
        }
    }, [currentUser])

    const handleSignIn = (user: AppUser) => {
        setCurrentUser(user)
        setPath("/dashboard")
    }

    const handleSignOut = () => {
        setCurrentUser(null)
        setPath("/dashboard")
        setSelectedAccount(null)
    }

    const handleNavigate = (newPath: string) => {
        setPath(newPath)
        console.log("Navigated to:", newPath)
    }

    const handleSelectAccount = (account: AccountRecord) => {
        setSelectedAccount(account)
        console.log("Selected account:", account.id, account.legalName)
    }

    // Render the appropriate page based on currentPath
    const renderPage = () => {
        if (path === "/profile/me" && currentUser) {
            return <MyProfilePage user={currentUser} />
        }
        if (path === "/admin/users" && currentUser) {
            return <UsersListPage currentUser={currentUser} onNavigate={handleNavigate} />
        }
        if (path === "/admin/users/new" && currentUser) {
            return <AddUserPage currentUser={currentUser} onNavigate={handleNavigate} />
        }
        if (path === "/dashboard") {
            // Dashboard placeholder - empty for now
            return (
                <div className="flex-1 p-8 bg-slate-50 min-h-screen">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
                    <p className="text-slate-500 mb-8">Overview and analytics coming soon...</p>
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Dashboard Coming Soon</h3>
                        <p className="text-sm text-slate-500">This area will display fleet analytics, compliance status, and key performance indicators.</p>
                    </div>
                </div>
            )
        }
        if (path === "/compliance") {
            return <ComplianceDocumentsPage />
        }
        if (path === "/account/profile") {
            return (
                <CarrierProfilePage
                    key={selectedAccount?.id ?? 'default'}
                    accountId={selectedAccount?.id}
                    currentUser={currentUser ?? undefined}
                    onSelectAccount={handleSelectAccount}
                />
            )
        }
        if (path === "/account/locations") {
            return <LocationsPage />
        }
        if (path === "/accounts") {
            return <AccountsListPage onNavigate={handleNavigate} onSelectAccount={handleSelectAccount} />
        }
        if (path === "/accounts/new") {
            return <AddAccountPage onNavigate={handleNavigate} />
        }
        if (path === "/inventory") {
            return <InventoryListPage onNavigate={handleNavigate} />
        }
        if (path === "/inventory/items/new") {
            return <AddInventoryItemPage onNavigate={handleNavigate} />
        }
        if (path === "/inventory/vendors") {
            return <VendorsListPage onNavigate={handleNavigate} />
        }
        if (path === "/inventory/vendors/new") {
            return <AddVendorPage onNavigate={handleNavigate} />
        }
        if (path === "/settings/general") {
            return <GeneralSettingsPage />
        }
        if (path === "/settings/key-numbers") {
            return <KeyNumbersPage />
        }
        if (path === "/settings/document-types") {
            return <DocumentTypesPage />
        }
        if (path === "/settings/document-folders") {
            return <DocumentFoldersPage />
        }
        if (path === "/settings/maintenance") {
            return <MaintenancePage />
        }
        if (path === "/settings/expenses") {
            return <ExpenseTypesPage />
        }
        if (path === "/accidents") {
            return <AccidentsPage />
        }
        if (path === "/inspections") {
            return <InspectionsPage />
        }
        if (path === "/violations") {
            return <ViolationsListPage />
        }
        if (path === "/settings/violations") {
            return <ViolationsPage />
        }
        if (path === "/settings/inspections") {
            return <InspectionsSettingsPage />
        }
        if (path === "/settings/fuel") {
            return <FuelPage />
        }

        if (path === "/settings/trainings") {
            return <TrainingsPage />
        }
        if (path === "/settings/safety") {
            return <SafetySettingsPage />
        }
        if (path === "/assets/directory") {
            return <AssetDirectoryPage />
        }
        if (path === "/maintenance") {
            return <AssetMaintenancePage />
        }
        if (path === "/paystubs") {
            return <PaystubsPage />
        }
        if (path === "/tickets") {
            return <TicketsPage />
        }
        if (path === "/safety-events") {
            return <SafetyEventsPage />
        }
        if (path === "/safety-analysis") {
            return <SafetyAnalysisPage />
        }
        if (path === "/hours-of-service") {
            return <HoursOfServicePage />
        }
        if (path === "/fuel") {
            return <FuelPage />
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

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <AppSidebar
                currentPath={path}
                onNavigate={handleNavigate}
                role={currentUser.role}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <TopNavbar currentPath={path} user={currentUser} onSignOut={handleSignOut} onNavigate={handleNavigate} />
                <main className="flex-1 overflow-auto">
                    {renderPage()}
                </main>
            </div>
        </div>
    )
}

export default App

