// Field-Type Registry for the Docu/Form Generator.
//
// Every field type used by the form builder is described here with a single
// definition: name, category, icon, what value it produces, default value, and
// whether it needs config (options, document type, subform reference, etc.).
//
// This is the single source of truth — the builder's type-picker, the
// settings modal, the live form's renderer, and the test-runner all consult
// the registry instead of hard-coding type lists. Add a new entry here and
// the new type lights up everywhere automatically.

import {
    Type, AlignLeft, Calendar, Hash, ChevronDown, ToggleRight, Circle, CheckSquare,
    Upload, Heading2, AlignJustify, List, AlertTriangle, PenLine,
    MapPin, IdCard, FileWarning, Ambulance, Gavel, Truck, Briefcase, GraduationCap,
    GitBranch, ShieldCheck,
    type LucideIcon,
} from "lucide-react";
import type { FormFieldType } from "./application-forms.data";

/** High-level grouping for the field-type picker. */
export type FieldCategory = 'input' | 'choice' | 'list' | 'display' | 'wiring';

/** The kind of value a field stores at runtime. */
export type FieldValueKind =
    | 'none'        // display-only — heading, paragraph, alert, bullet-list
    | 'string'      // text, textarea, date, number, select, radio, signature
    | 'boolean'     // toggle
    | 'string[]'    // checklist
    | 'document'    // document upload value
    | 'entries';    // any *-list type (array of structured entries)

export interface FieldTypeDef {
    /** Stable key used in FormField.type and persisted to localStorage. */
    type: FormFieldType;
    /** Human-readable label shown in the type picker. */
    label: string;
    /** One-line description shown in the picker / settings modal. */
    description: string;
    /** Visual grouping in the picker. */
    category: FieldCategory;
    /** Icon shown next to the label in the picker. */
    icon: LucideIcon;
    /** What value the field stores. */
    valueKind: FieldValueKind;
    /** Whether the field needs the admin to supply `options` (radio, select, checklist). */
    usesOptions: boolean;
    /** Whether the field needs the admin to pick a Document Type. */
    usesDocumentType: boolean;
    /** Whether the field needs the admin to pick a Subform. */
    usesSubform: boolean;
    /** Whether the field can carry a `showWhen` conditional reveal. */
    supportsShowWhen: boolean;
    /** Hidden from the field-type picker (legacy / managed elsewhere) — still resolves correctly
     *  for existing data so the renderer / row preview work as before. */
    hiddenFromPicker?: boolean;
}

/** Compact human label for the *category* tabs in the type picker. */
export const FIELD_CATEGORY_LABEL: Record<FieldCategory, string> = {
    input:   'Input',
    choice:  'Choice',
    list:    'Lists & records',
    display: 'Display & content',
    wiring:  'Wiring',
};

export const FIELD_CATEGORY_ORDER: FieldCategory[] = ['input', 'choice', 'list', 'wiring', 'display'];

/** The registry. Order here drives the order in the picker (within each category). */
export const FIELD_TYPE_REGISTRY: FieldTypeDef[] = [
    /* ── Input ───────────────────────────────────────────────────────── */
    {
        type: 'text', label: 'Text', description: 'Single-line text input.',
        category: 'input', icon: Type, valueKind: 'string',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'textarea', label: 'Long text', description: 'Multi-line textarea for paragraphs of free text.',
        category: 'input', icon: AlignLeft, valueKind: 'string',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'date', label: 'Date', description: 'Date picker with mm / dd / yyyy format.',
        category: 'input', icon: Calendar, valueKind: 'string',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'number', label: 'Number', description: 'Numeric input — used for counts, miles, currency, etc.',
        category: 'input', icon: Hash, valueKind: 'string',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'signature', label: 'Signature', description: 'Mouse / finger signature pad — captures a PNG dataURL.',
        category: 'input', icon: PenLine, valueKind: 'string',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'document', label: 'Document upload', description: 'File upload linked to a Document Type from the Documents tab — drives expiry / issue date / state / country inputs.',
        category: 'input', icon: Upload, valueKind: 'document',
        usesOptions: false, usesDocumentType: true, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'compliance', label: 'Compliance item', description: 'A Key Number + its linked Document from Settings — number entry, Front/Back upload and dates captured together as one.',
        category: 'input', icon: ShieldCheck, valueKind: 'document',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },

    /* ── Choice ──────────────────────────────────────────────────────── */
    {
        type: 'select', label: 'Dropdown', description: 'Single-pick dropdown — best for long option lists.',
        category: 'choice', icon: ChevronDown, valueKind: 'string',
        usesOptions: true, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'toggle', label: 'Yes / No toggle', description: 'Switch — captures a boolean (yes / no).',
        category: 'choice', icon: ToggleRight, valueKind: 'boolean',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'radio', label: 'Single-choice radio', description: 'Vertical radio list — best for short option lists.',
        category: 'choice', icon: Circle, valueKind: 'string',
        usesOptions: true, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'checklist', label: 'Multi-choice checklist', description: 'Multi-select checkboxes — captures an array of strings.',
        category: 'choice', icon: CheckSquare, valueKind: 'string[]',
        usesOptions: true, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },

    /* ── Lists & records ─────────────────────────────────────────────── */
    {
        type: 'address-list', label: 'Address list', description: 'Add multiple addresses via a popup — captures street, city, state, country, dates.',
        category: 'list', icon: MapPin, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'license-list', label: 'License list', description: 'Add prior licenses via a popup — captures number, class, country, state, expiry.',
        category: 'list', icon: IdCard, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'disqualification-list', label: 'Disqualification list', description: 'Add license disqualifications via a popup — offence types, date, duration.',
        category: 'list', icon: FileWarning, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'accident-list', label: 'Accident list', description: 'Add commercial-vehicle accidents — date, nature, location, fatalities, injuries.',
        category: 'list', icon: Ambulance, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'violation-list', label: 'Traffic-violation list', description: 'Add traffic violations — charge, agency, date, location, penalty.',
        category: 'list', icon: Gavel, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'driving-experience-list', label: 'Driving-experience list', description: 'Add driving-experience records — equipment class, freight types, regions.',
        category: 'list', icon: Truck, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'employment-list', label: 'Employment-history list', description: 'Add employment records — employer name, dates, contact, address, gaps.',
        category: 'list', icon: Briefcase, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },
    {
        type: 'education-list', label: 'Education list', description: 'Add education records — highest level, school, year completed.',
        category: 'list', icon: GraduationCap, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },

    /* ── Wiring ──────────────────────────────────────────────────────── */
    {
        type: 'subform-button', label: 'Subform button', description: 'Button that opens a configurable subform popup. Pick which subform it triggers.',
        category: 'wiring', icon: GitBranch, valueKind: 'entries',
        usesOptions: false, usesDocumentType: false, usesSubform: true, supportsShowWhen: true,
    },

    /* ── Display & content ───────────────────────────────────────────── */
    {
        type: 'heading', label: 'Section heading', description: 'Blue section header — used to group related fields. Carries no input.',
        category: 'display', icon: Heading2, valueKind: 'none',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'paragraph', label: 'Paragraph', description: 'Plain body text — used for legal copy, instructions, footnotes.',
        category: 'display', icon: AlignJustify, valueKind: 'none',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'bullet-list', label: 'Bullet list', description: 'Bulleted points with an optional bold intro line.',
        category: 'display', icon: List, valueKind: 'none',
        usesOptions: true, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
    {
        type: 'alert', label: 'Alert callout', description: 'Amber callout for important notes — e.g. "Note: A motor carrier may require…"',
        category: 'display', icon: AlertTriangle, valueKind: 'none',
        usesOptions: false, usesDocumentType: false, usesSubform: false, supportsShowWhen: true,
    },
];

/** Lookup map for fast access. */
export const FIELD_TYPE_BY_KEY: Record<FormFieldType, FieldTypeDef> = Object.fromEntries(
    FIELD_TYPE_REGISTRY.map(d => [d.type, d]),
) as Record<FormFieldType, FieldTypeDef>;

/** Get the definition for a field type, falling back to text. */
export function getFieldTypeDef(type: FormFieldType): FieldTypeDef {
    return FIELD_TYPE_BY_KEY[type] ?? FIELD_TYPE_BY_KEY.text;
}

/** Field types grouped by category, in display order. Hidden types are skipped. */
export function fieldTypesByCategory(): { category: FieldCategory; label: string; types: FieldTypeDef[] }[] {
    return FIELD_CATEGORY_ORDER.map(category => ({
        category,
        label: FIELD_CATEGORY_LABEL[category],
        types: FIELD_TYPE_REGISTRY.filter(d => d.category === category && !d.hiddenFromPicker),
    }));
}
