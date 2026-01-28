import { useState } from 'react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { KeyNumbersPage } from '@/pages/settings/KeyNumbersPage'
import DocumentTypesPage from '@/pages/settings/DocumentTypesPage'
import DocumentFoldersPage from '@/pages/settings/DocumentFoldersPage'
import { MaintenancePage } from '@/pages/settings/MaintenancePage'
import { CarrierDashboardPage } from '@/pages/dashboard/CarrierDashboardPage'

function App() {
    // Simple state for navigation simulation since we might not have a full router set up
    // or the user might want to test without it initially.
    // The user's request showed "sidebar accepts currentPath", so this mocks it.
    const [path, setPath] = useState("/account/profile")

    const handleNavigate = (newPath: string) => {
        setPath(newPath)
        console.log("Navigated to:", newPath)
    }

    // Render the appropriate page based on currentPath
    const renderPage = () => {
        if (path === "/account/profile") {
            return <CarrierDashboardPage />
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
        if (path === "/settings/maintenance" || path === "/maintenance") {
            return <MaintenancePage />
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

