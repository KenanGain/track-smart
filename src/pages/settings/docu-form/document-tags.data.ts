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

const STORAGE_KEY = 'ats:document-tag-sections-v2';

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
                { id: 'tag-auto-liability', label: 'Auto Liability' },
                { id: 'tag-general-liability', label: 'General Liability' },
                { id: 'tag-workers-comp', label: 'Workers Compensation' },
                { id: 'tag-umbrella', label: 'Umbrella / Excess' },
                { id: 'tag-non-trucking', label: 'Non-Trucking Liability' },
                { id: 'tag-bobtail', label: 'Bobtail Insurance' },
                { id: 'tag-trailer-interchange', label: 'Trailer Interchange' },
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
                { id: 'tag-hos-policy',       label: 'Hours of Service Policy' },
                { id: 'tag-eld-policy',       label: 'ELD Policy' },
                { id: 'tag-cargo-securement', label: 'Cargo Securement Policy' },
                { id: 'tag-accident-procedure', label: 'Accident Procedure' },
                { id: 'tag-anti-harassment',  label: 'Anti-Harassment Policy' },
                { id: 'tag-workplace-violence', label: 'Workplace Violence Policy' },
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
        {
            id: 'sec-compliance',
            title: 'Compliance & Safety',
            description: 'Tag documents by their compliance or safety program.',
            icon: 'Bookmark',
            colorTheme: 'indigo',
            multiSelect: true,
            allowCustomTags: true,
            tags: [
                { id: 'tag-dot',        label: 'DOT Compliance' },
                { id: 'tag-fmcsa',      label: 'FMCSA Filing' },
                { id: 'tag-csa',        label: 'CSA Score' },
                { id: 'tag-safety-audit', label: 'Safety Audit' },
                { id: 'tag-hos',        label: 'Hours of Service' },
                { id: 'tag-inspection', label: 'Vehicle Inspection' },
                { id: 'tag-drug-test',  label: 'Drug & Alcohol Testing' },
                { id: 'tag-clearinghouse', label: 'FMCSA Clearinghouse' },
            ],
        },
        {
            id: 'sec-driver-qual',
            title: 'Driver Qualification',
            description: 'Tag driver qualification file documents.',
            icon: 'Tag',
            colorTheme: 'cyan',
            multiSelect: true,
            allowCustomTags: true,
            tags: [
                { id: 'tag-medical',     label: 'Medical Certificate' },
                { id: 'tag-mvr',         label: 'Motor Vehicle Record (MVR)' },
                { id: 'tag-psp',         label: 'PSP Report' },
                { id: 'tag-background',  label: 'Background Check' },
                { id: 'tag-road-test',   label: 'Road Test' },
                { id: 'tag-employment',  label: 'Employment Verification' },
                { id: 'tag-training',    label: 'Training Certificate' },
                { id: 'tag-license',     label: "Driver's License / CDL" },
            ],
        },
        {
            id: 'sec-permits',
            title: 'Permits & Authority',
            description: 'Tag operating authority, permits and registrations.',
            icon: 'Layers',
            colorTheme: 'blue',
            multiSelect: true,
            allowCustomTags: true,
            tags: [
                { id: 'tag-usdot',     label: 'USDOT Number' },
                { id: 'tag-mc',        label: 'MC Authority' },
                { id: 'tag-ifta',      label: 'IFTA License' },
                { id: 'tag-irp',       label: 'IRP Registration' },
                { id: 'tag-ucr',       label: 'UCR Registration' },
                { id: 'tag-hazmat',    label: 'Hazmat Permit' },
                { id: 'tag-oversize',  label: 'Oversize / Overweight Permit' },
                { id: 'tag-fuel-permit', label: 'Fuel / Trip Permit' },
            ],
        },
        {
            id: 'sec-financial',
            title: 'Tax & Financial',
            description: 'Tag tax, billing and financial documents.',
            icon: 'Hash',
            colorTheme: 'emerald',
            multiSelect: true,
            allowCustomTags: true,
            tags: [
                { id: 'tag-invoice',     label: 'Invoice' },
                { id: 'tag-receipt',     label: 'Receipt' },
                { id: 'tag-tax-return',  label: 'Tax Return' },
                { id: 'tag-w9',          label: 'W-9 / W-2' },
                { id: 'tag-1099',        label: '1099' },
                { id: 'tag-ifta-filing', label: 'IFTA Filing' },
                { id: 'tag-settlement',  label: 'Settlement Statement' },
                { id: 'tag-fuel-tax',    label: 'Fuel Tax' },
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
