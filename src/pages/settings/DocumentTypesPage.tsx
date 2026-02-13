import React, { useState } from 'react';
import {
    Plus,
    Filter,
    Search,
    FileCheck,
    Edit3
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import {
    type DocumentType,
    type Status,
} from '@/data/mock-app-data';
import { INITIAL_EXPENSE_TYPES } from '@/pages/settings/expenses.data';
import { DocumentTagsManager } from './tags/DocumentTagsManager';
import { CreateSectionModal } from './tags/TagComponents';

// StatusBadge kept as it might be used in list view
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, string> = {
        Active: 'bg-green-100 text-green-700 border-green-300',
        Draft: 'bg-gray-100 text-gray-600 border-gray-300',
        Inactive: 'bg-gray-100 text-gray-600 border-gray-300',
    };
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[status] || styles.Draft}`}>
            {status}
        </span>
    );
};

// --- FOLDER TREE & DOCUMENT EDITOR ---
// Imported from reusable components
import { DocumentTypeEditor } from '@/components/settings/DocumentTypeEditor';

// --- DOCUMENT TYPES LIST PAGE ---

const DocumentTypesPage: React.FC = () => {
    // Top Level Navigation State
    // Top Level Navigation State
    const [pageMode, setPageMode] = useState<'types' | 'tags'>('types');
    const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');

    const [activeTab, setActiveTab] = useState('All');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isCreateSectionModalOpen, setIsCreateSectionModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { documents, addDocument, updateDocument, addTagSection, keyNumbers } = useAppData();

    const tabs = ['All', 'Carrier', 'Asset', 'Driver'];

    const filteredDocuments = documents.filter(doc => {
        if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (activeTab === 'All') return true;
        if (activeTab === 'Asset') return doc.relatedTo === 'asset';
        if (activeTab === 'Driver') return doc.relatedTo === 'driver';
        return doc.relatedTo === 'carrier';
    });

    const handleAddNew = () => { setEditingId(null); setViewMode('editor'); };
    const handleEdit = (id: string) => { setEditingId(id); setViewMode('editor'); };

    const handleSave = (data: Partial<DocumentType>) => {
        if (editingId) {
            updateDocument(editingId, data);
        } else {
            const newDoc: DocumentType = {
                id: Math.random().toString(36).substr(2, 9),
                name: data.name || 'New Document',
                relatedTo: data.relatedTo || 'carrier',
                expiryRequired: data.expiryRequired ?? true,
                issueDateRequired: data.issueDateRequired ?? false,
                issueStateRequired: data.issueStateRequired ?? false,
                issueCountryRequired: data.issueCountryRequired ?? false,
                status: data.status as Status || 'Active',
                selectedTags: {},
                requirementLevel: data.requirementLevel || 'required',
                ...data
            };
            addDocument(newDoc);
        }
        setViewMode('list');
        setEditingId(null);
    };

    // --- RENDER CONTENT BASED ON MODE ---

    // 1. Tags Mode removed (handled via inline render logic below)

    // 2. Folders Mode removed

    // 3. Editor Mode (Sub-view of Types)
    if (viewMode === 'editor') {
        const initialData = editingId ? documents.find(d => d.id === editingId) : null;
        return (
            <DocumentTypeEditor
                initialData={initialData}
                onSave={handleSave}
                onCancel={() => { setViewMode('list'); setEditingId(null); }}
            />
        );
    }

    // 4. Default: Types List Mode (Layout Wrapper)
    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            {/* UNIFIED HEADER */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="px-6 py-4 flex items-center justify-between">
                    {/* Left: Breadcrumbs & Title */}
                    <div>
                        <nav className="flex text-sm text-slate-500 mb-1 font-medium items-center gap-2" aria-label="Breadcrumb">
                            <span>Settings</span>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-900">{pageMode === 'types' ? 'Document Types' : 'Document Tags'}</span>
                        </nav>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            {pageMode === 'types' ? 'Document Types' : 'Document Tags'}
                        </h1>
                    </div>

                    {/* Right: Tabs & Actions */}
                    <div className="flex flex-col items-end gap-4">
                        {/* Tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                            <button
                                onClick={() => setPageMode('types')}
                                className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${pageMode === 'types'
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                Document Types
                            </button>
                            <button
                                onClick={() => setPageMode('tags')}
                                className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${pageMode === 'tags'
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                            >
                                Document Tags
                            </button>
                        </div>

                        {/* Action Component */}
                        <button
                            onClick={() => {
                                if (pageMode === 'types') handleAddNew();
                                else setIsCreateSectionModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-all w-full md:w-auto"
                        >
                            <Plus className="w-4 h-4" />
                            {pageMode === 'types' ? 'Add Document Type' : 'Add Document Tag'}
                        </button>
                    </div>
                </div>

                {/* Sub-Tabs for Types only */}
                {pageMode === 'types' && (
                    <div className="px-6 border-t border-slate-100 bg-white">
                        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`${activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                                        } whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                )}
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-hidden flex flex-col relative">
                {pageMode === 'tags' ? (
                    <DocumentTagsManager />
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col p-6">
                        {/* Filter Bar */}
                        <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative rounded-md shadow-sm flex-1 sm:flex-initial">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
                                    </div>
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                                        placeholder="Search types..."
                                    />
                                </div>
                                <button className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                    Filter
                                </button>
                            </div>
                            <span className="text-sm text-gray-500">Showing {filteredDocuments.length} of {documents.length} types</span>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto bg-white rounded-lg shadow ring-1 ring-gray-200">

                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 sm:pl-6">Document Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Category</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Expiry Req.</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Issue Date Req.</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Issue State Req.</th>
                                        <th scope="col" className="px-3 py-3.5 text-center text-xs font-medium uppercase tracking-wide text-gray-500">Issue Country Req.</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Status</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredDocuments.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                                            <FileCheck className="w-5 h-5" />
                                                        </div>
                                                        {doc.name}
                                                    </div>
                                                    {(() => {
                                                        const linkedKn = keyNumbers.find(kn => kn.requiredDocumentTypeId === doc.id);
                                                        if (linkedKn) {
                                                            return (
                                                                <div className="ml-12 mt-1 text-xs text-blue-600 font-normal flex items-center gap-1">
                                                                    Linked to: {linkedKn.numberTypeName}
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        if (doc.id === 'DT-PAYSTUB') {
                                                            return (
                                                                <div className="ml-12 mt-1 text-xs text-indigo-700 font-normal flex items-center gap-1">
                                                                    Linked to Paystubs
                                                                </div>
                                                            );
                                                        }

                                                        const linkedExpense = INITIAL_EXPENSE_TYPES.find(exp => exp.documentTypeId === doc.id);
                                                        if (linkedExpense) {
                                                            return (
                                                                <div className="ml-12 mt-1 text-xs text-emerald-600 font-normal flex items-center gap-1">
                                                                    Linked to Expense: {linkedExpense.name}
                                                                </div>
                                                            );
                                                        }

                                                        if (['offense_ticket', 'payment_receipt', 'notice_of_trial'].includes(doc.id)) {
                                                            return (
                                                                <div className="ml-12 mt-1 text-xs text-orange-600 font-normal flex items-center gap-1">
                                                                    Linked to Tickets / Offenses
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return null;
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{doc.relatedTo}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.expiryRequired ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {doc.expiryRequired ? 'Required' : 'Optional'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.issueDateRequired ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {doc.issueDateRequired ? 'Required' : 'Optional'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.issueStateRequired ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {doc.issueStateRequired ? 'Required' : 'Optional'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.issueCountryRequired ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>
                                                    {doc.issueCountryRequired ? 'Required' : 'Optional'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <StatusBadge status={doc.status} />
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <button
                                                    onClick={() => handleEdit(doc.id)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                    <span className="sr-only">Edit, {doc.name}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* Create Tag Section Modal (Lifted State) */}
            <CreateSectionModal
                isOpen={isCreateSectionModalOpen}
                onClose={() => setIsCreateSectionModalOpen(false)}
                onSave={addTagSection}
            />
        </div>
    );
};

// --- NAV HEADER COMPONENT ---
// NavHeader removed

export default DocumentTypesPage;
