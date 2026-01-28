import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Check, FolderPlus } from 'lucide-react';

// --- TREE COMPONENT ---
interface TreeItemProps {
    node: any;
    level: number;
    selectedId: string | null;
    onSelect: (id: string, name: string) => void;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({ node, level, selectedId, onSelect, expandedIds, toggleExpand }) => {
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedId === node.id;
    const hasChildren = node.children && node.children.length > 0;
    return (
        <div className="select-none">
            <div
                className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors ${isSelected ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                style={{ paddingLeft: `${level * 16 + 8}px` }}
                onClick={() => onSelect(node.id, node.name)}
            >
                <div
                    className="mr-1 p-0.5 rounded-sm hover:bg-slate-200/50 text-slate-400"
                    onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                >
                    {hasChildren ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <div className="w-4 h-4" />}
                </div>
                <Folder className={`w-4 h-4 mr-2 ${isSelected ? 'fill-blue-200 text-blue-600' : 'fill-slate-100 text-slate-400'}`} />
                <span className="truncate flex-1">{node.name}</span>
                {isSelected && <Check className="w-4 h-4 text-blue-600 ml-2" />}
            </div>
            {isExpanded && hasChildren && (
                <div>
                    {node.children.map((child: any) => (
                        <TreeItem key={child.id} node={child} level={level + 1} selectedId={selectedId} onSelect={onSelect} expandedIds={expandedIds} toggleExpand={toggleExpand} />
                    ))}
                </div>
            )}
        </div>
    );
};

interface FolderTreeSelectProps {
    data: any[];
    selectedFolderId: string | null;
    onSelect: (id: string, name: string) => void;
    onAddFolder?: () => void;
}

export const FolderTreeSelect: React.FC<FolderTreeSelectProps> = ({ data, selectedFolderId, onSelect, onAddFolder }) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['root_company', 'carrier_root', 'assets_root', 'driver_root']));
    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setExpandedIds(next);
    };
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Directory Structure</span>
                {onAddFolder && (
                    <button
                        onClick={onAddFolder}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                    >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Add Folder
                    </button>
                )}
            </div>
            <div className="p-2 max-h-[300px] overflow-y-auto">
                {data.map((node: any) => (
                    <TreeItem key={node.id} node={node} level={0} selectedId={selectedFolderId} onSelect={onSelect} expandedIds={expandedIds} toggleExpand={toggleExpand} />
                ))}
            </div>
        </div>
    );
};
