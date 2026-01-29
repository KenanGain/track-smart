import { useState } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { KeyNumbersPage } from '@/pages/settings/KeyNumbersPage'
import DocumentTypesPage from '@/pages/settings/DocumentTypesPage'
import DocumentFoldersPage from '@/pages/settings/DocumentFoldersPage'
import { MaintenancePage } from '@/pages/settings/MaintenancePage'
import { CarrierProfilePage } from '@/pages/profile/CarrierProfilePage'
import { LocationsPage } from '@/pages/account/LocationsPage'
import { AssetDirectoryPage } from '@/pages/assets/AssetDirectoryPage'

function App() {
    // Simple state for navigation simulation since we might not have a full router set up
    // or the user might want to test without it initially.
    // The user's request showed "sidebar accepts currentPath", so this mocks it.
    const [path, setPath] = useState("/dashboard")

    const handleNavigate = (newPath: string) => {
        setPath(newPath)
        console.log("Navigated to:", newPath)
    }

    // Render the appropriate page based on currentPath
    const renderPage = () => {
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
        if (path === "/account/profile") {
            return <CarrierProfilePage />
        }
        if (path === "/account/locations") {
            return <LocationsPage />
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
        if (path === "/assets/directory") {
            return <AssetDirectoryPage />
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

    return (
        <div className="flex h-screen w-full bg-slate-50">
            <AppSidebar
                currentPath={path}
                onNavigate={handleNavigate}
            />
            <main className="flex-1 overflow-auto">
                {renderPage()}
            </main>
        </div>
    )
}

export default App

