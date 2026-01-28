import React, { useState } from 'react';
import {
    Plus,
    Trash2,
    X,
    Info,
    Tag as TagIcon
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import { SECTION_ICONS, THEME_STYLES } from './tag-utils';
// CreateSectionModal import removed from here, moved to DocumentTypesPage
// import { CreateSectionModal } from './TagComponents';

// Shared UI wrappers (could be imported if centralized)
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
        {children}
    </div>
);
const Button = ({ children, className = '', variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }) => {
    const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 px-4 py-2";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        outline: "border border-slate-300 bg-white hover:bg-slate-100 text-slate-700"
    };
    return <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className || ''}`} />
);

export const DocumentTagsManager = () => {
    const { tagSections, addTagToSection, removeTagFromSection, deleteTagSection } = useAppData();
    const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});

    const handleInputChange = (secId: string, val: string) => {
        setNewTagInputs(prev => ({ ...prev, [secId]: val }));
    };

    const handleAdd = (secId: string) => {
        if (!newTagInputs[secId]?.trim()) return;
        addTagToSection(secId, newTagInputs[secId]);
        setNewTagInputs(prev => ({ ...prev, [secId]: '' }));
    };

    return (
        <div className="h-full bg-slate-50 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto space-y-6">
                {tagSections.map(section => {
                    const Icon = SECTION_ICONS[section.icon] || TagIcon;
                    const theme = THEME_STYLES[section.colorTheme] || THEME_STYLES.blue;

                    return (
                        <Card key={section.id} className="p-6 relative group">
                            <button
                                onClick={() => deleteTagSection(section.id)}
                                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete Section"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-lg ${theme.bg} ${theme.text}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">{section.title}</h3>
                                    <p className="text-xs text-slate-500">{section.description}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-4">
                                <div className="flex flex-wrap gap-2">
                                    {section.tags.map(tag => (
                                        <div key={tag.id} className="inline-flex items-center bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 text-sm text-slate-700 shadow-sm">
                                            <span className={`w-2 h-2 rounded-full mr-2 ${theme.selectedBg}`}></span>
                                            {tag.label}
                                            <button
                                                onClick={() => removeTagFromSection(section.id, tag.id)}
                                                className="ml-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {section.tags.length === 0 && <span className="text-sm text-slate-400 italic">No tags defined yet.</span>}
                                </div>
                            </div>

                            {section.allowCustomTags ? (
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={`Add new tag...`}
                                        value={newTagInputs[section.id] || ''}
                                        onChange={(e) => handleInputChange(section.id, e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd(section.id)}
                                        className="max-w-md"
                                    />
                                    <Button variant="outline" onClick={() => handleAdd(section.id)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Tag
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-400 italic flex items-center gap-1">
                                    <Info className="w-3 h-3" /> Custom tags are disabled for this section.
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
