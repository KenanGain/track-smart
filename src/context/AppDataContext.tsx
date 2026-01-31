import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    MOCK_DOCUMENTS,
    MOCK_FOLDER_TREE,
    INITIAL_TAG_SECTIONS,
    type DocumentType,
    type FolderNode,
    type TagSection
} from '@/data/mock-app-data';
import { INITIAL_KEY_NUMBERS } from '@/data/key-numbers-mock-data';
import type { KeyNumberConfig, KeyNumberValue, UploadedDocument } from '@/types/key-numbers.types';

// --- TYPES ---
interface AppDataContextType {
    documents: DocumentType[];
    folderTree: FolderNode;
    tagSections: TagSection[];
    // Key Numbers
    keyNumbers: KeyNumberConfig[];
    keyNumberValues: Record<string, KeyNumberValue>;
    updateKeyNumberValue: (id: string, value: string, expiryDate?: string, documents?: UploadedDocument[]) => void;
    getDocumentTypeById: (id: string) => DocumentType | undefined;
    // Document Actions
    addDocument: (doc: DocumentType) => void;
    updateDocument: (id: string, updates: Partial<DocumentType>) => void;
    assignDocumentToFolder: (docId: string, folderId: string | undefined) => void;
    // Folder Actions
    addFolder: (parentId: string, name: string) => void;
    updateFolder: (id: string, name: string, parentId: string | null) => void;
    deleteFolder: (id: string) => void;
    // Tag Actions
    addTagSection: (section: Omit<TagSection, 'id' | 'tags'>) => void;
    deleteTagSection: (id: string) => void;
    addTagToSection: (sectionId: string, label: string) => void;
    removeTagFromSection: (sectionId: string, tagId: string) => void;
}

// --- CONTEXT ---
const AppContext = createContext<AppDataContextType | null>(null);

export const useAppData = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppData must be used within AppDataProvider");
    return context;
};

// --- HELPER: Recursion for Tree Updates ---
const cloneTree = (node: FolderNode): FolderNode => JSON.parse(JSON.stringify(node));

function findNode(node: FolderNode, id: string): FolderNode | null {
    if (node.id === id) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findNode(child, id);
            if (found) return found;
        }
    }
    return null;
}

function removeNode(root: FolderNode, id: string): boolean {
    if (!root.children) return false;
    const idx = root.children.findIndex(c => c.id === id);
    if (idx !== -1) {
        root.children.splice(idx, 1);
        return true;
    }
    for (const child of root.children) {
        if (removeNode(child, id)) return true;
    }
    return false;
}

function addChild(root: FolderNode, parentId: string, newChild: FolderNode): boolean {
    if (root.id === parentId) {
        root.children = root.children || [];
        root.children.push(newChild);
        return true;
    }
    if (root.children) {
        for (const child of root.children) {
            if (addChild(child, parentId, newChild)) return true;
        }
    }
    return false;
}

// --- PROVIDER ---
export const AppDataProvider = ({ children }: { children: React.ReactNode }) => {
    const [documents, setDocuments] = useState<DocumentType[]>(MOCK_DOCUMENTS);
    const [folderTree, setFolderTree] = useState<FolderNode>(MOCK_FOLDER_TREE);
    const [tagSections, setTagSections] = useState<TagSection[]>(INITIAL_TAG_SECTIONS);
    const [keyNumbers] = useState<KeyNumberConfig[]>(INITIAL_KEY_NUMBERS);
    const [keyNumberValues, setKeyNumberValues] = useState<Record<string, KeyNumberValue>>({});

    // --- ACTIONS ---

    const updateKeyNumberValue = useCallback((id: string, value: string, expiryDate?: string, documents?: UploadedDocument[]) => {
        setKeyNumberValues(prev => ({
            ...prev,
            [id]: { value, expiryDate, documents }
        }));
    }, []);

    const getDocumentTypeById = useCallback((id: string) => {
        return documents.find(doc => doc.id === id);
    }, [documents]);

    const addDocument = useCallback((doc: DocumentType) => {
        setDocuments(prev => [...prev, doc]);
    }, []);

    const updateDocument = useCallback((id: string, updates: Partial<DocumentType>) => {
        setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc));
    }, []);

    const assignDocumentToFolder = useCallback((docId: string, folderId: string | undefined) => {
        let folderName: string | undefined = undefined;
        if (folderId) {
            const node = findNode(folderTree, folderId);
            if (node) folderName = node.name;
        }

        setDocuments(prev => prev.map(doc => {
            if (doc.id !== docId) return doc;
            const newDest = { ...doc.destination };
            newDest.folderId = folderId;
            newDest.folderName = folderName;
            return { ...doc, destination: newDest };
        }));
    }, [folderTree]);

    const addFolder = useCallback((parentId: string, name: string) => {
        const newFolder: FolderNode = {
            id: `F_${Date.now()}`,
            name,
            type: 'folder',
            parentId,
            children: [],
            counts: { subfolders: 0, files: 0 }
        };
        setFolderTree(prev => {
            const next = cloneTree(prev);
            addChild(next, parentId, newFolder);
            return next;
        });
    }, []);

    const updateFolder = useCallback((id: string, name: string, parentId: string | null) => {
        setFolderTree(prev => {
            const next = cloneTree(prev);
            const node = findNode(next, id);
            if (node) node.name = name;

            if (node && parentId && node.parentId !== parentId) {
                const cleanNext = cloneTree(prev);
                const targetNode = findNode(cleanNext, id);
                if (!targetNode) return prev;

                targetNode.name = name;

                if (targetNode.parentId !== parentId) {
                    const nodeToMove = JSON.parse(JSON.stringify(targetNode));
                    nodeToMove.parentId = parentId;
                    const removed = removeNode(cleanNext, id);
                    if (removed) {
                        addChild(cleanNext, parentId, nodeToMove);
                        return cleanNext;
                    }
                } else {
                    return cleanNext;
                }
            }
            return next;
        });
    }, []);

    const deleteFolder = useCallback((id: string) => {
        setFolderTree(prev => {
            const next = cloneTree(prev);
            removeNode(next, id);
            return next;
        });
        setDocuments(prev => prev.map(doc => {
            if (doc.destination?.folderId === id) {
                return { ...doc, destination: { ...doc.destination, folderId: undefined } };
            }
            return doc;
        }));
    }, []);

    // --- TAG ACTIONS ---

    const addTagSection = useCallback((sectionData: Omit<TagSection, 'id' | 'tags'>) => {
        const newSection: TagSection = {
            id: `sec_${Math.random().toString(36).substr(2, 6)}`,
            tags: [],
            ...sectionData
        };
        setTagSections(prev => [...prev, newSection]);
    }, []);

    const deleteTagSection = useCallback((id: string) => {
        setTagSections(prev => prev.filter(s => s.id !== id));
    }, []);

    const addTagToSection = useCallback((sectionId: string, label: string) => {
        setTagSections(prev => prev.map(sec => {
            if (sec.id === sectionId) {
                return {
                    ...sec,
                    tags: [...sec.tags, { id: Math.random().toString(36).substr(2, 6), label }]
                };
            }
            return sec;
        }));
    }, []);

    const removeTagFromSection = useCallback((sectionId: string, tagId: string) => {
        setTagSections(prev => prev.map(sec => {
            if (sec.id === sectionId) {
                return {
                    ...sec,
                    tags: sec.tags.filter(t => t.id !== tagId)
                };
            }
            return sec;
        }));
    }, []);

    const value = {
        documents,
        folderTree,
        tagSections,
        keyNumbers,
        keyNumberValues,
        updateKeyNumberValue,
        getDocumentTypeById,
        addDocument,
        updateDocument,
        assignDocumentToFolder,
        addFolder,
        updateFolder,
        deleteFolder,
        addTagSection,
        deleteTagSection,
        addTagToSection,
        removeTagFromSection
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
