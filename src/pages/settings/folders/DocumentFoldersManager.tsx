import React, { useState } from 'react';
import {
    Folder,
    ChevronRight,
    ChevronDown,
    Plus,
    Edit2,
    Trash2,
    Settings
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { type FolderNode } from '@/data/mock-app-data';

// --- UI Components ---
const Button = ({ children, className = '', variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'danger' }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-8 px-3";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        outline: "border border-slate-300 bg-white hover:bg-slate-100 text-slate-700",
        ghost: "hover:bg-slate-100 text-slate-700",
        danger: "bg-red-50 text-red-600 hover:bg-red-100"
    };
    return <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`flex h-8 w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className || ''}`}
    />
);

// --- Tree Item Component ---
const FolderTreeItem = ({
    node,
    level,
    onAdd,
    onEdit,
    onDelete,
    expandedIds,
    toggleExpand
}: {
    node: FolderNode,
    level: number,
    onAdd: (parentId: string) => void,
    onEdit: (id: string, currentName: string) => void,
    onDelete: (id: string) => void,
    expandedIds: Set<string>,
    toggleExpand: (id: string) => void
}) => {
    const isExpanded = expandedIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    // Root nodes usually shouldn't be deleted in this app context, but let's allow generic behavior or restricted based on ID/type
    const isRoot = node.parentId === null || node.type === 'root';

    return (
        <div className="select-none">
            <div
                className="group flex items-center py-2 px-2 rounded-md hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                style={{ paddingLeft: `${level * 20 + 8}px` }}
            >
                <button
                    className={`mr-2 p-1 rounded-md hover:bg-slate-200/50 text-slate-400 transition-colors ${!hasChildren ? 'opacity-0' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                    disabled={!hasChildren}
                >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <Folder className={`w-5 h-5 mr-3 ${isRoot ? 'fill-blue-100 text-blue-600' : 'fill-amber-100 text-amber-500'}`} />

                <div className="flex-1 min-w-0">
                    <span className="font-medium text-slate-700 text-sm">{node.name}</span>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                        {node.counts?.subfolders || 0} subfolders • {node.counts?.files || 0} files
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <Button variant="ghost" onClick={() => onAdd(node.id)} title="Add Subfolder" className="px-2 w-8 h-8">
                        <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => onEdit(node.id, node.name)} title="Edit Folder" className="px-2 w-8 h-8">
                        <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    {!isRoot && (
                        <Button variant="ghost" onClick={() => onDelete(node.id)} title="Delete Folder" className="px-2 w-8 h-8 text-red-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="border-l border-slate-100 ml-5">
                    {node.children!.map((child) => (
                        <FolderTreeItem
                            key={child.id}
                            node={child}
                            level={level + 1}
                            onAdd={onAdd}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Manager Component ---
export const DocumentFoldersManager = () => {
    const { folderTree, addFolder, updateFolder, deleteFolder } = useAppData();
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root_company', 'carrier_root', 'assets_root', 'driver_root']));

    // Modal / Editing State
    const [editMode, setEditMode] = useState<'create' | 'edit' | null>(null);
    const [targetId, setTargetId] = useState<string | null>(null); // For create: parentId, For edit: nodeId
    const [nameInput, setNameInput] = useState('');

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedIds(next);
    };

    const handleOpenAdd = (parentId: string) => {
        setTargetId(parentId);
        setNameInput('');
        setEditMode('create');
        if (!expandedIds.has(parentId)) toggleExpand(parentId);
    };

    const handleOpenEdit = (id: string, currentName: string) => {
        setTargetId(id);
        setNameInput(currentName);
        setEditMode('edit');
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this folder? All contents effectively become unassigned.')) {
            deleteFolder(id);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nameInput.trim() || !targetId) return;

        if (editMode === 'create') {
            addFolder(targetId, nameInput);
        } else if (editMode === 'edit') {
            // Need parentId for updateFolder but context might handle null if not moving?
            // Actually context requires parentId to handle moves. 
            // Simplifying: we are passing null as parentId to signify "no move" (context implementation allows this reuse or we fix context usage)
            // Checking context: updateFolder(id, name, parentId). If parentId is null, it might error or just not move.
            // Let's assume for name edit we pass null as parentId implies "keep current parent" or we need to look it up.
            // The context implementation: "if (node && parentId && node.parentId !== parentId)" -> so if parentId is null, it skips move logic.
            updateFolder(targetId, nameInput, null);
        }

        setEditMode(null);
        setTargetId(null);
        setNameInput('');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            <header className="bg-white border-b border-slate-200 px-6 py-5">
                <div>
                    <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
                        <Settings className="w-4 h-4" />
                        <span>Configuration</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Document Folders</h1>
                    <p className="text-slate-500 mt-1">Manage the hierarchy for document storage.</p>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                            <span className="font-semibold text-slate-700">Folder Structure</span>
                            {/* Global Collapse/Expand could go here */}
                        </div>
                        <div className="p-4">
                            <FolderTreeItem
                                node={folderTree}
                                level={0}
                                onAdd={handleOpenAdd}
                                onEdit={handleOpenEdit}
                                onDelete={handleDelete}
                                expandedIds={expandedIds}
                                toggleExpand={toggleExpand}
                            />
                        </div>
                    </div>
                </div>
            </main>

            {/* Simple Modal for Add/Edit */}
            {editMode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6 animate-in zoom-in-95">
                        <h3 className="text-lg font-bold mb-4">{editMode === 'create' ? 'Create New Folder' : 'Rename Folder'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Folder Name</label>
                                <Input
                                    autoFocus
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    placeholder="e.g. Safety Records"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="ghost" onClick={() => setEditMode(null)}>Cancel</Button>
                                <Button type="submit">{editMode === 'create' ? 'Create' : 'Save Changes'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
