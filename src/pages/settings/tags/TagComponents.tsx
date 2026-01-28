import React, { useState } from 'react';
import {
    Plus,
    X,
    Check
} from 'lucide-react';
import { type TagSection, type SelectedTag, type ColorTheme } from '@/data/mock-app-data';
import { SECTION_ICONS, THEME_STYLES } from './tag-utils';

// --- Shared Simple Components (to avoid circular deps or complex imports, redefined here or could import from a UI lib) ---
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        {children}
    </div>
);

const Label = ({ children, className = '', required = false }: { children: React.ReactNode; className?: string; required?: boolean }) => (
    <label className={`block text-sm font-medium text-slate-700 mb-1.5 ${className}`}>
        {children}
        {required && <span className="text-red-500 ml-1">*</span>}
    </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 ${props.className || ''}`}
    />
);

const Button = ({ children, variant = 'primary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' | 'danger' }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        outline: "border border-slate-300 bg-white hover:bg-slate-100 text-slate-700",
        ghost: "hover:bg-slate-100 text-slate-700",
        danger: "bg-red-50 text-red-600 hover:bg-red-100"
    };
    return (
        <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Switch = ({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (c: boolean) => void }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${checked ? 'bg-blue-600' : 'bg-slate-200'
            }`}
    >
        <span className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
);

// --- Component 1: TagSelectionCard ---
export const TagSelectionCard = ({
    section,
    selectedTagIds,
    onToggleTag,
    onAddCustomTag,
    onSelectAll
}: {
    section: TagSection,
    selectedTagIds: string[],
    onToggleTag: (tagId: string) => void,
    onAddCustomTag?: (val: string) => void,
    onSelectAll?: (tagIds: string[], select: boolean) => void
}) => {
    const Icon = SECTION_ICONS[section.icon] || SECTION_ICONS.Tag;
    const theme = THEME_STYLES[section.colorTheme] || THEME_STYLES.blue;
    const [customTagInput, setCustomTagInput] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = () => {
        if (customTagInput.trim() && onAddCustomTag) {
            onAddCustomTag(customTagInput);
            setCustomTagInput('');
            setIsAdding(false);
        }
    };

    const allTagsSelected = section.tags.length > 0 && section.tags.every(t => selectedTagIds.includes(t.id));

    return (
        <Card className="p-6 transition-all hover:shadow-md mb-4 last:mb-0">
            <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${theme.bg} ${theme.text}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                            <p className="text-sm text-slate-500">{section.description}</p>
                        </div>
                        {section.multiSelect && onSelectAll && section.tags.length > 0 && (
                            <button
                                onClick={() => onSelectAll(section.tags.map(t => t.id), !allTagsSelected)}
                                className={`text-xs font-medium ${theme.text} hover:underline flex items-center gap-1`}
                            >
                                {allTagsSelected ? (
                                    <>Deselect All</>
                                ) : (
                                    <>Select All</>
                                )}
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                        {section.tags.map(tag => {
                            const isSelected = selectedTagIds.includes(tag.id);

                            return (
                                <div
                                    key={tag.id}
                                    className={`
                                        inline-flex items-center rounded-full text-sm font-medium transition-all duration-200 border cursor-pointer select-none px-4 py-2
                                        ${isSelected
                                            ? `${theme.selectedBg} text-white ${theme.selectedBorder} shadow-sm`
                                            : `bg-white text-slate-600 border-slate-200 ${theme.hoverBorder} hover:bg-slate-50`
                                        }
                                    `}
                                    onClick={() => onToggleTag(tag.id)}
                                >
                                    <span className="mr-2">{tag.label}</span>
                                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 text-white/90" />}
                                </div>
                            );
                        })}
                        {section.tags.length === 0 && (
                            <span className="text-sm text-slate-400 italic">No tags available.</span>
                        )}
                    </div>

                    {onAddCustomTag && section.allowCustomTags && (
                        <div className="mt-2">
                            {isAdding ? (
                                <div className="flex gap-2 max-w-sm items-center animate-in fade-in slide-in-from-left-2 duration-200">
                                    <Input
                                        autoFocus
                                        placeholder="New tag name..."
                                        value={customTagInput}
                                        onChange={(e) => setCustomTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                        className="h-8 text-sm"
                                    />
                                    <Button variant="primary" onClick={handleAdd} className="h-8 px-3">Add</Button>
                                    <Button variant="ghost" onClick={() => setIsAdding(false)} className="h-8 px-2 text-slate-500"><X className="w-4 h-4" /></Button>
                                </div>
                            ) : (
                                <button onClick={() => setIsAdding(true)} className={`text-xs font-medium ${theme.text} hover:underline flex items-center gap-1`}>
                                    <Plus className="w-3 h-3" /> Add Custom Tag
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

// --- Component 2: TagSelectionModal ---
export const TagSelectionModal = ({
    isOpen,
    onClose,
    sections,
    selectedTags,
    onToggleTag,
    onAddCustomTag,
    onSelectAll
}: {
    isOpen: boolean;
    onClose: () => void;
    sections: TagSection[];
    selectedTags: Record<string, SelectedTag[]>;
    onToggleTag: (sectionId: string, tagId: string, multiSelect: boolean) => void;
    onAddCustomTag: (sectionId: string, label: string) => void;
    onSelectAll: (sectionId: string, tagIds: string[], select: boolean) => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
            <div className="relative bg-slate-50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Manage Document Tags</h2>
                        <p className="text-sm text-slate-500">Select categories and attributes for this document.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-2">
                    {sections.map(section => (
                        <TagSelectionCard
                            key={section.id}
                            section={section}
                            // Extract just IDs for simple checking in the modal
                            selectedTagIds={selectedTags[section.id]?.map(t => t.id) || []}
                            onToggleTag={(tagId) => onToggleTag(section.id, tagId, section.multiSelect)}
                            onAddCustomTag={(label) => onAddCustomTag(section.id, label)}
                            onSelectAll={(tagIds, select) => onSelectAll(section.id, tagIds, select)}
                        />
                    ))}
                </div>

                <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                    <Button variant="primary" onClick={onClose} className="min-w-[100px]">Done</Button>
                </div>
            </div>
        </div>
    );
};

// --- Component 3: CreateSectionModal ---
export const CreateSectionModal = ({ isOpen, onClose, onSave }: { isOpen: boolean, onClose: () => void, onSave: (data: Omit<TagSection, 'id' | 'tags'>) => void }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [icon, setIcon] = useState<keyof typeof SECTION_ICONS>('Tag');
    const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');
    const [multiSelect, setMultiSelect] = useState(true);
    const [allowCustomTags, setAllowCustomTags] = useState(true);

    const handleSave = () => {
        if (!title) return;
        onSave({ title, description, icon, colorTheme, multiSelect, allowCustomTags });
        onClose();
        setTitle(''); setDescription(''); setIcon('Tag'); setColorTheme('blue');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <h2 className="text-xl font-bold mb-4">Create New Section</h2>
                <div className="space-y-4">
                    <div>
                        <Label required>Section Title</Label>
                        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Department" />
                    </div>
                    <div>
                        <Label>Description</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description..." />
                    </div>

                    <div>
                        <Label>Icon</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(Object.keys(SECTION_ICONS) as Array<keyof typeof SECTION_ICONS>).map(ic => {
                                const Ico = SECTION_ICONS[ic];
                                return (
                                    <button
                                        key={ic}
                                        onClick={() => setIcon(ic)}
                                        className={`p-2 rounded-lg border transition-all ${icon === ic ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <Ico className="w-5 h-5" />
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div>
                        <Label>Bubble Color Theme</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(Object.keys(THEME_STYLES) as ColorTheme[]).map(theme => {
                                const style = THEME_STYLES[theme];
                                return (
                                    <button
                                        key={theme}
                                        onClick={() => setColorTheme(theme)}
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${colorTheme === theme ? `${style.selectedBorder} ring-2 ring-offset-2 ${style.ring}` : 'border-transparent'}`}
                                        style={{ backgroundColor: colorTheme === theme ? 'white' : undefined }}
                                    >
                                        <div className={`w-6 h-6 rounded-full ${style.selectedBg}`}></div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={multiSelect} onCheckedChange={setMultiSelect} />
                            <span className="text-sm font-medium">Multi-select</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <Switch checked={allowCustomTags} onCheckedChange={setAllowCustomTags} />
                            <span className="text-sm font-medium">Allow Custom Tags</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                        <Button variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>Create Section</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
