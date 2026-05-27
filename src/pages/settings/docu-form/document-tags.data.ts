// Document Tags — sections + per-section tags used to classify Document Types.
//
// Seeded with the categories shown in the design (Insurance / Policies / Year /
// Quarter / CVOR Level). Stored in localStorage so admins can add or rename
// sections and tags without rebuilding the app.

export type TagColorTheme = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'indigo' | 'cyan';
export type TagIconName = 'Shield' | 'FileText' | 'Calendar' | 'PieChart' | 'Award' | 'Tag' | 'Bookmark' | 'Layers' | 'Hash';

export interface DocTag {
    id: string;
    label: string;
}

export interface DocTagSection {
    id: string;
    title: string;
    description: string;
    icon: TagIconName;
    /** Visual theme — drives the bubble dot colour on each tag chip. */
    colorTheme: TagColorTheme;
    /** Whether multiple tags from this section can be picked for one document. */
    multiSelect: boolean;
    /** When false, admins can't add custom tags (e.g. Year / Quarter — fixed values). */
    allowCustomTags: boolean;
    tags: DocTag[];
}

const STORAGE_KEY = 'ats:document-tag-sections-v1';

const uid = () => Math.random().toString(36).slice(2, 9);

function seedSections(): DocTagSection[] {
    return [
        {
            id: 'sec-insurance',
            title: 'Insurance',
            description: 'Select applicable insurance document tags.',
            icon: 'Shield',
            colorTheme: 'blue',
            multiSelect: true,
            allowCustomTags: true,
            tags: [
                { id: 'tag-cargo',    label: 'Cargo Insurance' },
                { id: 'tag-liability', label: 'Liability Insurance' },
                { id: 'tag-physical', label: 'Physical Damage Insurance' },
            ],
        },
        {
            id: 'sec-policies',
            title: 'Policies and Procedures',
            description: 'Select policy document types used in your organization.',
            icon: 'FileText',
            colorTheme: 'emerald',
            multiSelect: true,
            allowCustomTags: true,
            tags: [
                { id: 'tag-contracts',        label: 'Contract Agreements' },
                { id: 'tag-driver-manuals',   label: 'Driver Manuals' },
                { id: 'tag-drug-alcohol',     label: 'Drug and Alcohol Policy' },
                { id: 'tag-preventive',       label: 'Preventive Maintenance Policy' },
                { id: 'tag-vehicle-policy',   label: 'Vehicle Maintenance Policy' },
                { id: 'tag-health-safety',    label: 'General Health and Safety Policy' },
                { id: 'tag-hazard',           label: 'Hazard Prevention Program / Policy' },
            ],
        },
        {
            id: 'sec-year',
            title: 'Document Year',
            description: 'Assign applicable document year attribute.',
            icon: 'Calendar',
            colorTheme: 'amber',
            multiSelect: false,
            allowCustomTags: false,
            tags: [
                { id: 'tag-year', label: 'Year' },
            ],
        },
        {
            id: 'sec-quarter',
            title: 'Quarter',
            description: 'Select applicable quarters.',
            icon: 'PieChart',
            colorTheme: 'violet',
            multiSelect: true,
            allowCustomTags: false,
            tags: [
                { id: 'tag-q1', label: 'Q1' },
                { id: 'tag-q2', label: 'Q2' },
                { id: 'tag-q3', label: 'Q3' },
                { id: 'tag-q4', label: 'Q4' },
            ],
        },
        {
            id: 'sec-cvor',
            title: 'CVOR Level',
            description: 'Select compliance level.',
            icon: 'Award',
            colorTheme: 'rose',
            multiSelect: false,
            allowCustomTags: false,
            tags: [
                { id: 'tag-cvor-1', label: 'CVOR Level 1' },
                { id: 'tag-cvor-2', label: 'CVOR Level 2' },
                { id: 'tag-cvor-3', label: 'CVOR Level 3' },
            ],
        },
    ];
}

export function newTagSection(): DocTagSection {
    return {
        id: `sec-${uid()}`,
        title: '',
        description: '',
        icon: 'Tag',
        colorTheme: 'blue',
        multiSelect: true,
        allowCustomTags: true,
        tags: [],
    };
}

export function newTag(label: string): DocTag {
    return { id: `tag-${uid()}`, label };
}

export function loadTagSections(): DocTagSection[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as DocTagSection[];
    } catch {
        /* localStorage unavailable / corrupt — fall through to seed */
    }
    return seedSections();
}

export function saveTagSections(sections: DocTagSection[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sections));
    } catch {
        /* ignore */
    }
}
